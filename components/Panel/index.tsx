'use client';
import React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { colord } from 'colord';
import {
  DEFAULT_PANEL_SHELL_CONFIG,
  normalizePanelShellConfig,
  type PanelShellConfig,
} from './config/shell';
import { useOptionalSharedDesignConfig } from '../SharedDesignConfigProvider';
import { useElevationShadow } from '../proximity/useElevationShadow';
import { resolveContrastAwareTextColor } from '../../helpers/surfaceColorDerivation';
import { computeElevationShadow } from '../../helpers/elevationShadowEngine';
import { resolvePanelSurface } from './surfaceColor';
import {
  serializeConfigScopeBindings,
  serializeConfigScopeBindingsDiff,
} from './config/serialization';
import type { ConfigScopeBinding } from './config/types';
import styles from './Panel.module.css';
import { clamp, getStepPrecision, formatKnobValue } from '../mathUtils';
import { CTA_BUTTON_MOTION_EASINGS } from '../CtaButton/config/registered';
import { usePanelDrag } from './usePanelDrag';
import { usePanelVerticalAnchor } from './usePanelVerticalAnchor';

export {
  DEFAULT_PANEL_SHELL_CONFIG,
  normalizePanelShellConfig,
} from './config/shell';
export type { PanelShellConfig } from './config/shell';

// ── Utilities ─────────────────────────────────────────────────────────────────
// Moved to ../mathUtils (real, always-shipped — not panel-UI) — re-exported
// here so nothing that already imports these from this module needs to
// change. See ../mathUtils.ts's own doc comment for why they moved.
export { clamp, getStepPrecision, formatKnobValue } from '../mathUtils';

// ── Component ownership + config copy ────────────────────────────────────────

async function writePanelConfigToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.cssText = 'position:fixed;opacity:0;top:0;left:0;pointer-events:none;';
  document.body.appendChild(textArea);
  try {
    textArea.focus();
    textArea.select();
    if (!document.execCommand('copy')) throw new Error('Clipboard copy failed');
  } finally {
    document.body.removeChild(textArea);
  }
}

export function ConfigCopyButton({
  text,
  label = 'COPY CONFIG',
  ariaLabel,
  disabled = false,
}: {
  text: string;
  label?: string;
  ariaLabel?: string;
  /** Opt-in, default false (unchanged for every existing caller) — e.g.
   * "COPY DIFF" passes true when there's nothing to copy (text is empty),
   * rather than showing a misleading "COPIED" for a no-op clipboard write. */
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
  }, []);

  const handleCopy = async () => {
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    try {
      await writePanelConfigToClipboard(text);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
    resetTimerRef.current = window.setTimeout(() => {
      setStatus('idle');
      resetTimerRef.current = null;
    }, 1800);
  };

  const visibleLabel = status === 'copied'
    ? 'COPIED'
    : status === 'error'
      ? 'ERR'
      : label;

  return (
    <button
      type="button"
      className={`${styles.panelButton} ${styles.copyButton}`}
      onClick={handleCopy}
      disabled={disabled}
      aria-label={status === 'idle' ? (ariaLabel ?? label) : visibleLabel}
      aria-live="polite"
      data-status={status}
    >
      {visibleLabel}
    </button>
  );
}

export function PanelButton({
  children,
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className={styles.panelButton}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

/**
 * The standard COPY ALL / COPY DIFF / RESET trio every page's own top-level
 * PanelShell (`<PageName> SETTINGS`) header action row uses — one shared
 * component, not independently re-composed JSX per page. Before this
 * existed, `pages/abstract.tsx` and `pages/about.tsx` each hand-assembled
 * their own `headerActions` fragment from the same primitives
 * (`ConfigCopyButton`/`PanelButton`/`serializeConfigScopeBindings`/
 * `serializeConfigScopeBindingsDiff`) independently — abstract.tsx's own
 * copy happened to include a COPY DIFF button, about.tsx's own copy never
 * did, and the two visibly drifted apart even though both pages were
 * always working from the exact same underlying `componentConfigBindings`
 * shape (operator-reported, live screenshot comparison, 2026-08-24).
 * `serializeConfigScopeBindings`/-`Diff` were already correctly centralized
 * (components/Panel/config/serialization.ts) — the actual gap was that no
 * single component OWNED composing the three buttons around them, so nothing
 * stopped one page's own call site from silently omitting one. Both text
 * strings are computed inside this component, not passed in as props, for
 * the same reason: a caller can't independently forget to memoize/derive
 * one of them differently from the other page's own call site again. */
export function PanelStandardHeaderActions({
  bindings,
  onReset,
}: {
  bindings: ReadonlyArray<ConfigScopeBinding>;
  onReset: () => void;
}) {
  const allConfigText = useMemo(
    () => serializeConfigScopeBindings(bindings),
    [bindings],
  );
  const allConfigDiffText = useMemo(
    () => serializeConfigScopeBindingsDiff(bindings),
    [bindings],
  );
  return (
    <>
      <ConfigCopyButton text={allConfigText} label="COPY ALL" />
      <ConfigCopyButton
        text={allConfigDiffText}
        label="COPY DIFF"
        disabled={allConfigDiffText.length === 0}
      />
      <PanelButton onClick={onReset}>RESET</PanelButton>
    </>
  );
}

export function PanelActionGroup({
  children,
  ariaLabel = 'Panel actions',
}: {
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div className={styles.actionGroup} role="group" aria-label={ariaLabel}>
      {children}
    </div>
  );
}

export function PanelControlGroup({ children }: { children: ReactNode }) {
  return <div className={styles.control}>{children}</div>;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: ReadonlyArray<{ label: string; value: T }>;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className={styles.segmented}
      role="group"
      aria-label={ariaLabel}
      style={{ '--panel-option-count': options.length } as CSSProperties}
    >
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          className={styles.segmentButton}
          data-selected={option.value === value ? 'true' : 'false'}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Navigational tab strip for `kind: 'tabs'` scope entries
 * (components/Panel/config/controlResolver.tsx) — deliberately distinct in
 * style from SegmentedControl above (underline-on-selected, not a
 * pill/box), since SegmentedControl is already used pervasively *within*
 * this same panel as a field's own value picker; giving tabs an identical
 * look would blur "this switches what you're looking at" against "this
 * sets a value." Accessibility pattern follows
 * experiences/abstract/components/AbstractJournalLabCollection.tsx's own
 * tablist (role="tablist"/"tab", aria-selected, roving tabIndex, arrow-key
 * navigation) rather than inventing a fourth bespoke implementation.
 */
export function TabStrip({
  tabs,
  activeId,
  onSelect,
  ariaLabel,
  currentDeviceTabId,
}: {
  tabs: ReadonlyArray<{ id: string; label: string }>;
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
  /** Which tab's own device-size window the browser's real, live viewport
   * width currently falls into — independent of activeId (which tab the
   * user is *editing*, a click/keyboard choice that never changes on its
   * own). Rendered as its own, deliberately inverted (light background,
   * dark text) treatment — see Panel.module.css's own
   * [data-current-device='true'] rules — so "this is where you physically
   * are right now" never reads as "this is what you're looking at."
   * ConfigFieldTabsControl computes this from useBreakpointTier and updates
   * it live as the window resizes; the tab it names can equal, differ from,
   * or (if it doesn't match any tab id in this strip, e.g. "ALL SIZES" has
   * no device-size window of its own) highlight nothing at all. Omitted
   * (default): no such indicator, byte-identical to before this prop
   * existed. */
  currentDeviceTabId?: string;
}) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusAndSelect = (id: string) => {
    onSelect(id);
    tabRefs.current[id]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    focusAndSelect(tabs[nextIndex].id);
  };

  return (
    <div className={styles.tabStrip} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={el => { tabRefs.current[tab.id] = el; }}
          type="button"
          role="tab"
          id={`panel-tab-${tab.id}`}
          aria-selected={tab.id === activeId}
          aria-controls={`panel-tabpanel-${tab.id}`}
          tabIndex={tab.id === activeId ? 0 : -1}
          data-current-device={tab.id === currentDeviceTabId ? 'true' : undefined}
          className={styles.tabButton}
          onClick={() => onSelect(tab.id)}
          onKeyDown={event => handleKeyDown(event, index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Macro-area switch for `kind: 'areas'` scope entries
 * (components/Panel/config/controlResolver.tsx, PLAN-POSTS-LAB-PANEL-
 * TABS.md §12) — reuses the panel's own boxed-pill-button visual language
 * (`.actionGroup`/`.panelButton`, the same one behind the COPY/COPY DIFF/
 * RESET row) rather than TabStrip's underline style or SegmentedControl's
 * field-value pill row: an area switch picks which *part of the layout*
 * you're looking at (a macro, structural choice), which the plan's own
 * §12.1 calls out as needing to read as visually distinct from both a
 * device-size tab and a field's own value picker.
 */
export function AreaSwitch({
  areas,
  activeId,
  onSelect,
  ariaLabel,
}: {
  areas: ReadonlyArray<{ id: string; label: string }>;
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className={styles.actionGroup} role="group" aria-label={ariaLabel}>
      {areas.map(area => (
        <button
          key={area.id}
          type="button"
          className={styles.panelButton}
          data-selected={area.id === activeId ? 'true' : 'false'}
          aria-pressed={area.id === activeId}
          onClick={() => onSelect(area.id)}
        >
          {area.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A native `<select>` — for scales with too many discrete options for
 * SegmentedControl's fixed even-split button row to stay legible (e.g.
 * Tailwind's own ~34-step spacing scale, well past SegmentedControl's
 * practical ceiling of ~6-8 options before the button grid becomes
 * illegibly narrow). The browser's own dropdown gets scrolling and
 * type-to-search for free, which a button row never will.
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: ReadonlyArray<{ label: string; value: T }>;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className={styles.selectWrap}>
      <select
        className={styles.select}
        value={value}
        aria-label={ariaLabel}
        onChange={event => onChange(event.target.value as T)}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <span className={styles.selectChevron} aria-hidden="true" />
    </div>
  );
}

/**
 * Progressive depth shading for nested accordions (PLAN-POSTS-LAB-PANEL-
 * TABS.md §13) — carries the panel's own root fill color down to whichever
 * disclosure level actually applies a shade. Only the second real nesting
 * level (a `subgroup`/`Sect` inside a scope) shades today — the scope level
 * itself (`ComponentConfigSection`) deliberately does not participate, so
 * it renders exactly as it always has. `step` is threaded through
 * unchanged from the root (PanelShell). `null` (the default, no provider)
 * means "no shading" — every consumer must treat a missing/`null` context
 * as a no-op so panels rendered outside a `PanelShell` (unit tests,
 * Storybook fixtures) render exactly as before this feature existed.
 */
type PanelNestingState = { color: string; step: number } | null;
export const PanelNestingContext = createContext<PanelNestingState>(null);

/**
 * Whether PanelShell's drag-time frosted-glass treatment
 * (PanelShellConfig.dragBackdropBlurEnabled, `[data-drag-frost]` in
 * Panel.module.css) is currently active — `false` by default so any
 * consumer rendered outside a `PanelShell` (unit tests, Storybook
 * fixtures) behaves exactly as before this feature existed. Only
 * `ConfigScopeList`'s own sticky `.scopeListToolbar` consumes this today:
 * that toolbar must stay fully opaque the rest of the time (it occludes
 * whatever scrolls underneath it while pinned), but should switch to the
 * exact same frosted fill as `.backdrop`/`.panelLauncher` while dragging,
 * so the whole shell reads as one material instead of a toolbar-shaped
 * solid rectangle sitting on top of a blurred body.
 */
export const PanelDragFrostContext = createContext(false);

export function ComponentConfigSection({
  component,
  title,
  summary,
  configText,
  open,
  onToggle,
  isGlobal = false,
  onHoverIntentStart,
  onHoverIntentCancel,
  children,
}: {
  component: string;
  title: string;
  summary?: string;
  configText: string;
  open: boolean;
  onToggle: () => void;
  /** Renders a static light-blue dot next to the title — this scope's live
   * value is shared across every page (SharedDesignConfigProvider), so
   * editing it here has effects beyond the current page. Unlike the yellow
   * component-owner tag, this never expands into a label on hover/open —
   * see createConfigScopeBinding's own `global` param for how it's set. */
  isGlobal?: boolean;
  /** PanelShellConfig.hoverIntentExpandEnabled — starts/cancels the caller's
   * own dwell timer (ConfigScopeRenderer owns it, not this component, so a
   * single timer implementation isn't duplicated per section instance).
   * Optional: a caller that never passes these (unit tests, other Sect/
   * ComponentConfigSection consumers) gets no hover behavior, unchanged
   * from before this feature existed. */
  onHoverIntentStart?: () => void;
  onHoverIntentCancel?: () => void;
  children: ReactNode;
}) {
  const contentId = useId();

  return (
    <section
      className={styles.componentSection}
      data-open={open ? 'true' : 'false'}
      onPointerEnter={onHoverIntentStart}
      onPointerLeave={onHoverIntentCancel}
    >
      <button
        type="button"
        className={styles.componentSectionToggle}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={contentId}
        aria-label={`${title}, ${component} configuration${isGlobal ? ', shared globally across every page' : ''}`}
      >
        <span className={styles.componentSectionTitleWrap}>
          <span className={styles.componentSectionTitle}>{title}</span>
          {isGlobal ? (
            <span
              className={styles.componentGlobalIndicator}
              aria-hidden="true"
              title="Global — shared across every page; editing it here affects all of them"
            />
          ) : null}
          <span className={styles.componentOwnerIndicator} aria-hidden="true">
            <span className={styles.componentOwnerName}>{component}</span>
          </span>
        </span>
        <span className={styles.sectionChevron} aria-hidden="true" />
      </button>
      <div
        id={contentId}
        className={styles.sectionDisclosure}
        aria-hidden={!open}
      >
        <div className={styles.sectionDisclosureInner}>
          <div className={styles.componentSectionBody}>
            <div className={styles.componentSectionUtility}>
              {summary ? <div className={styles.componentSectionSummary}>{summary}</div> : null}
              <div className={styles.componentSectionActions}>
                <ConfigCopyButton
                  text={configText}
                  label="COPY"
                  ariaLabel={`Copy ${component} ${title} configuration`}
                />
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── PanelShell ────────────────────────────────────────────────────────────────

function SettingsTuneIcon() {
  return (
    <svg
      className={styles.launcherIcon}
      viewBox="0 0 18 18"
      aria-hidden="true"
    >
      <path d="M2.25 4.25h13.5M2.25 9h13.5M2.25 13.75h13.5" />
      <circle cx="6" cy="4.25" r="1.4" />
      <circle cx="11.75" cy="9" r="1.4" />
      <circle cx="7.75" cy="13.75" r="1.4" />
    </svg>
  );
}

export function PanelShell({
  title,
  isOpen,
  onToggle,
  headerActions,
  appearance,
  backgroundColor,
  foregroundColor,
  config: configOverride,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  headerActions?: ReactNode;
  appearance?: 'dark' | 'light';
  /** The resolved surface behind the shell. When supplied, it also selects
   * the matching light/dark control palette unless appearance is explicit. */
  backgroundColor?: string;
  /** Optional explicit ink. By default the shell derives a contrast-safe
   * tint of its inherited background's own hue. */
  foregroundColor?: string;
  /** Optional per-instance override. App-mounted shells otherwise consume
   * the shared PanelShell configuration from SharedDesignConfigProvider. */
  config?: PanelShellConfig;
  children?: ReactNode;
}) {
  const contentId = useId();
  const sharedDesignConfig = useOptionalSharedDesignConfig();
  const panelConfig = useMemo(
    () => normalizePanelShellConfig(
      configOverride ?? sharedDesignConfig?.panelShellConfig ?? DEFAULT_PANEL_SHELL_CONFIG,
    ),
    [configOverride, sharedDesignConfig?.panelShellConfig],
  );
  const environmentalBackground = backgroundColor ?? panelConfig.backgroundColor;
  const backgroundSource = panelConfig.backgroundColorMode === 'custom'
    ? panelConfig.backgroundColor
    : environmentalBackground;
  const resolvedSurface = resolvePanelSurface({
    sourceColor: backgroundSource,
    underlayColor: environmentalBackground,
    originalHueRetention: panelConfig.backgroundOriginalHueRetention,
    hueShiftDegrees: panelConfig.backgroundHueShiftDegrees,
    pigmentIntensity: panelConfig.backgroundPigmentIntensity,
    darkBackgroundDarkenRatio: panelConfig.darkBackgroundDarkenRatio,
    lightBackgroundDarkenRatio: panelConfig.lightBackgroundDarkenRatio,
    opacity: panelConfig.backgroundOpacity,
  });
  const resolvedBackgroundColor = resolvedSurface?.effectiveColor;
  const resolvedAppearance = appearance ?? (
    resolvedBackgroundColor && !colord(resolvedBackgroundColor).isDark() ? 'light' : 'dark'
  );
  const resolvedForegroundColor = foregroundColor ?? (
    panelConfig.textColorMode === 'custom'
      ? panelConfig.textColor
      : (
        // Small control labels benefit from an AAA-strength source color;
        // semantic alpha tiers below can then soften hierarchy without
        // making primary text scrape past the minimum contrast.
        resolvedBackgroundColor
          ? resolveContrastAwareTextColor(resolvedBackgroundColor, panelConfig.textMinContrast)
          : undefined
      )
  );
  const activeElevationPx = Math.min(
    Math.max(0, isOpen ? panelConfig.expandedElevationPx : panelConfig.restingElevationPx),
    Math.max(0, panelConfig.shadowElevationMaxPx),
  );
  const shadowActive = panelConfig.shadowEnabled && activeElevationPx > 0;
  const panelShadowColor = panelConfig.shadowColorMode === 'custom'
    ? panelConfig.shadowColor
    : resolvedBackgroundColor
      ? colord(resolvedBackgroundColor)
        .darken(panelConfig.shadowSurfaceDarkenAmount)
        .toHex()
      : panelConfig.shadowColor;
  const elevationShadowOptions = useMemo(() => ({
    enabled: true,
    elevationMinPx: 0,
    elevationMaxPx: panelConfig.shadowElevationMaxPx,
    light: {
      // A panel fixed to the bottom-right needs its projected shadow to land
      // inward on the receiving plane. A centered light casts it farther
      // right, where the viewport clips it and makes a valid engine result
      // look like no shadow at all. Keep the shared physical response, but
      // anchor this shell's area light at its own right-side scene edge.
      xPercent: panelConfig.shadowLightXPercent,
      yPx: panelConfig.shadowLightYPx,
      heightPx: panelConfig.shadowLightHeightPx,
      radiusPx: panelConfig.shadowLightRadiusPx,
      directIntensity: panelConfig.shadowLightDirectIntensity,
      ambientIntensity: panelConfig.shadowLightAmbientIntensity,
    },
    response: {
      projectedStrength: panelConfig.shadowProjectedStrength,
      projectedFalloff: panelConfig.shadowProjectedFalloff,
      contactStrength: panelConfig.shadowContactStrength,
      contactFalloff: panelConfig.shadowContactFalloff,
      contactDecayElevationPx: panelConfig.shadowContactDecayElevationPx,
      nearFieldStrength: panelConfig.shadowNearFieldStrength,
      maxBlurPx: panelConfig.shadowMaxBlurPx,
      maxDisplacementPx: panelConfig.shadowMaxDisplacementPx,
      maxProjectedScale: panelConfig.shadowMaxProjectedScale,
      color: panelShadowColor,
    },
  }), [panelConfig, panelShadowColor]);
  const activeShadowGeometry = useMemo(() => computeElevationShadow({
    // Representative scene used only to reserve enough viewport clearance
    // for the engine's real projected layers. Vertical reach is independent
    // of the representative X coordinates; the mounted hook below still
    // measures and shades the actual element.
    lightX: 1000,
    lightY: elevationShadowOptions.light.yPx,
    lightHeightPx: elevationShadowOptions.light.heightPx,
    lightRadiusPx: elevationShadowOptions.light.radiusPx,
    lightDirectIntensity: elevationShadowOptions.light.directIntensity,
    lightAmbientIntensity: elevationShadowOptions.light.ambientIntensity,
    objectCenterX: 750,
    objectCenterY: 600,
    viewportWidthPx: 1000,
    elevationPx: activeElevationPx,
    elevationMinPx: elevationShadowOptions.elevationMinPx,
    elevationMaxPx: elevationShadowOptions.elevationMaxPx,
    projectedStrength: elevationShadowOptions.response.projectedStrength,
    projectedFalloff: elevationShadowOptions.response.projectedFalloff,
    contactStrength: elevationShadowOptions.response.contactStrength,
    contactFalloff: elevationShadowOptions.response.contactFalloff,
    contactDecayElevationPx: elevationShadowOptions.response.contactDecayElevationPx,
    nearFieldStrength: elevationShadowOptions.response.nearFieldStrength,
    maxBlurPx: elevationShadowOptions.response.maxBlurPx,
    maxDisplacementPx: elevationShadowOptions.response.maxDisplacementPx,
    maxProjectedScale: elevationShadowOptions.response.maxProjectedScale,
  }), [activeElevationPx, elevationShadowOptions]);
  const activeShadowReachPx = activeShadowGeometry.layers.reduce(
    (reach, layer) => Math.max(
      reach,
      layer.offsetYPx + layer.blurPx + Math.max(0, layer.spreadPx),
    ),
    0,
  );
  const activeShadowClearancePx = shadowActive ? Math.ceil(Math.max(
    0,
    activeShadowReachPx - 12 - activeElevationPx,
  )) : 0;
  const { applyElevation, ref: elevationShadowRef } =
    useElevationShadow<HTMLElement>({
      ...elevationShadowOptions,
      enabled: shadowActive,
    });

  useEffect(() => {
    applyElevation(activeElevationPx);
  }, [activeElevationPx, applyElevation, elevationShadowOptions, shadowActive]);

  const {
    frameRef: dragFrameRef,
    frameStyle: dragFrameStyle,
    isDragging,
    handleProps: dragHandleProps,
    backgroundHandleProps: dragBackgroundHandleProps,
    offsetX: dragOffsetX,
    offsetY: dragOffsetY,
  } = usePanelDrag({
      enabled: panelConfig.dragEnabled,
      isOpen,
      settleStiffness: panelConfig.dragSettleStiffness,
      settleDamping: panelConfig.dragSettleDamping,
      settleMaxDurationMs: panelConfig.dragSettleMaxDurationMs,
      opacityWhileDragging: panelConfig.dragOpacityWhileDragging,
      opacityTransitionMs: panelConfig.dragOpacityTransitionMs,
      opacityTransitionEasing: panelConfig.dragOpacityTransitionEasing,
      backdropBlurEnabled: panelConfig.dragBackdropBlurEnabled,
    });
  // Drives Panel.module.css's `[data-drag-frost]` rules — see
  // usePanelDrag's own frameStyle doc comment for why this frosted-glass
  // translucency (surface background-color alpha + backdrop-filter, both
  // applied directly to `.backdrop`/`.panelLauncher`) is a different
  // mechanism from, and mutually exclusive with, that hook's whole-panel
  // opacity fade: only one can actually reveal a *blurred* view of what's
  // behind, and it isn't the ancestor-opacity one.
  const dragFrostActive = isDragging && panelConfig.dragBackdropBlurEnabled;
  const verticalAnchor = usePanelVerticalAnchor({
    frameRef: dragFrameRef,
    isOpen,
    offsetX: dragOffsetX,
    offsetY: dragOffsetY,
  });
  const dragHandleCursor = !panelConfig.dragEnabled || panelConfig.dragCursor === 'none'
    ? undefined
    : isDragging
      ? 'grabbing'
      : panelConfig.dragCursor === 'move' ? 'move' : 'grab';

  const resolvedInk = resolvedForegroundColor ? colord(resolvedForegroundColor) : null;
  const inkWithAlpha = (alpha: number) => resolvedInk?.alpha(alpha).toRgbString();
  const separatorInk = panelConfig.separatorColorMode === 'custom'
    ? colord(panelConfig.separatorColor)
    : resolvedInk;
  const borderInk = panelConfig.borderColorMode === 'custom'
    ? colord(panelConfig.borderColor)
    : resolvedInk;
  const shellStyle = {
    ...(resolvedSurface ? {
      '--panel-bg': resolvedSurface.paintColor,
      '--panel-bg-effective': resolvedSurface.effectiveColor,
    } : {}),
    '--panel-radius': `${panelConfig.radiusPx}px`,
    '--panel-backdrop-blur-px': `${panelConfig.backdropBlurPx}px`,
    '--panel-blur-safe-area-px': `${panelConfig.backdropBlurSafeAreaPx}px`,
    '--panel-background-blur-px': `${panelConfig.backgroundBlurPx}px`,
    '--panel-shell-border-width': `${panelConfig.borderWidthPx}px`,
    ...(borderInk?.isValid() ? {
      '--panel-shell-border-color': borderInk
        .alpha(panelConfig.borderOpacity)
        .toRgbString(),
    } : {}),
    '--panel-elevation-px': `${activeElevationPx}px`,
    '--panel-shadow-clearance-px': `${activeShadowClearancePx}px`,
    '--panel-motion-disclosure': `${panelConfig.disclosureOpenDurationMs}ms`,
    '--panel-motion-disclosure-close': `${panelConfig.disclosureCloseDurationMs}ms`,
    '--panel-easing': CTA_BUTTON_MOTION_EASINGS[panelConfig.disclosureEasing],
    '--panel-shell-open-duration': `${panelConfig.shellOpenDurationMs}ms`,
    '--panel-shell-close-duration': `${panelConfig.shellCloseDurationMs}ms`,
    '--panel-shell-motion-easing': CTA_BUTTON_MOTION_EASINGS[panelConfig.shellEasing],
    // usePanelVerticalAnchor's own live-measured budget, for BOTH 'up' and
    // 'down' mode — a static viewport formula (this property's own
    // pre-existing fallback below) only budgets correctly when the frame
    // still sits at its default, undragged bottom-right corner. Confirmed
    // live: dragging the collapsed launcher to the vertical *middle* of the
    // viewport still correctly picked 'up' mode (more room above than
    // below there), but a static formula assuming "almost a full viewport
    // of room above" let the expanded content grow tall enough to clip
    // above y=0 anyway — the live-measured `maxHeightPx` is capped to
    // whatever room the frame's own actual current position really has.
    '--panel-max-height': verticalAnchor.maxHeightPx !== null
      ? `${verticalAnchor.maxHeightPx}px`
      : `calc(100dvh - max(24px, env(safe-area-inset-bottom)) - 12px - var(--panel-elevation-px, 0px) - var(--panel-shadow-clearance-px, 0px))`,
    '--panel-inactive-dim-opacity': panelConfig.inactiveSectionDimEnabled
      ? panelConfig.inactiveSectionOpacity
      : 1,
    '--panel-inactive-dim-duration': `${panelConfig.inactiveSectionDimDurationMs}ms`,
    '--panel-inactive-dim-easing': CTA_BUTTON_MOTION_EASINGS[panelConfig.inactiveSectionDimEasing],
    // [data-drag-frost] rules only (Panel.module.css) — every surface that
    // paints its own opaque fill (.backdrop, .scopeListToolbar's sticky
    // header, .panelLauncher) switches to this ONE precomputed translucent
    // color plus a shared blur while dragging, so the whole shell reads as
    // a single frosted material instead of a patchwork of differently-
    // opaque rectangles. A plain rgba() string computed here via colord —
    // not a CSS color-mix()/calc() expression — sidesteps any doubt about
    // browser support for calc() inside a color-mix() percentage argument,
    // and reuses dragOpacityWhileDragging as the frost's own alpha (rather
    // than a separate knob) so "how see-through while dragging" still has
    // exactly one answer regardless of which translucency strategy (this
    // one, or the plain whole-panel opacity fade) is actually active.
    ...(resolvedBackgroundColor ? {
      '--panel-drag-frost-bg': colord(resolvedBackgroundColor)
        .alpha(panelConfig.dragOpacityWhileDragging)
        .toRgbString(),
    } : {}),
    '--panel-drag-blur-px': `${panelConfig.dragBackdropBlurPx}px`,
    '--panel-drag-frost-transition': `background-color ${panelConfig.dragOpacityTransitionMs}ms ${CTA_BUTTON_MOTION_EASINGS[panelConfig.dragOpacityTransitionEasing]}, backdrop-filter ${panelConfig.dragOpacityTransitionMs}ms ${CTA_BUTTON_MOTION_EASINGS[panelConfig.dragOpacityTransitionEasing]}`,
    ...(separatorInk?.isValid() ? {
      '--panel-divider': separatorInk.alpha(panelConfig.separatorOpacity).toRgbString(),
      '--panel-divider-internal': separatorInk
        .alpha(panelConfig.internalSeparatorOpacity)
        .toRgbString(),
    } : {}),
    ...(resolvedInk ? {
      '--panel-text': inkWithAlpha(0.9),
      '--panel-text-secondary': inkWithAlpha(0.68),
      '--panel-text-muted': inkWithAlpha(0.5),
      '--panel-text-subtle': inkWithAlpha(0.36),
      '--panel-selected-text': inkWithAlpha(0.94),
      '--panel-border': inkWithAlpha(0.11),
      '--panel-border-strong': inkWithAlpha(0.22),
      '--panel-track': inkWithAlpha(0.12),
      '--panel-track-progress': inkWithAlpha(0.58),
      '--panel-focus': inkWithAlpha(0.76),
      '--panel-surface': inkWithAlpha(0.045),
      '--panel-surface-hover': inkWithAlpha(0.08),
      '--panel-surface-selected': inkWithAlpha(0.16),
    } : {}),
  } as CSSProperties;
  const frameStyle = {
    ...shellStyle,
    ...dragFrameStyle,
    // usePanelVerticalAnchor's 'down' mode — only ever applied while open;
    // the collapsed launcher always keeps the default bottom/right anchor
    // regardless of which way the panel last expanded.
    ...(isOpen && verticalAnchor.mode === 'down'
      ? { top: `${verticalAnchor.topPx}px`, bottom: 'auto' }
      : {}),
  } as CSSProperties;

  if (!isOpen) {
    return (
      <div
        ref={dragFrameRef}
        className={styles.panelFrame}
        data-open="false"
        data-appearance={resolvedAppearance}
        data-icon={panelConfig.launcherIconVisible ? 'visible' : 'hidden'}
        style={frameStyle}
      >
        {panelConfig.backdropBlurEnabled && panelConfig.backdropBlurPx > 0 ? (
          <div className={styles.blurSafeArea} aria-hidden="true" />
        ) : null}
        <button
          type="button"
          data-panel-launcher="true"
          ref={elevationShadowRef as React.Ref<HTMLButtonElement>}
          className={styles.panelLauncher}
          data-appearance={resolvedAppearance}
          data-elevation="rest"
          data-icon={panelConfig.launcherIconVisible ? 'visible' : 'hidden'}
          data-drag-frost={dragFrostActive ? 'true' : undefined}
          style={dragHandleCursor ? { ...shellStyle, cursor: dragHandleCursor } : shellStyle}
          onClick={onToggle}
          aria-label={`Open ${title} settings`}
          aria-expanded={false}
          aria-controls={contentId}
          {...dragHandleProps}
        >
          <span className={styles.launcherLabel}>SETTINGS</span>
          {panelConfig.launcherIconVisible ? <SettingsTuneIcon /> : null}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={dragFrameRef}
      className={styles.panelFrame}
      data-open="true"
      data-appearance={resolvedAppearance}
      style={frameStyle}
    >
      {panelConfig.backdropBlurEnabled && panelConfig.backdropBlurPx > 0 ? (
        <div className={styles.blurSafeArea} aria-hidden="true" />
      ) : null}
      <section
        ref={elevationShadowRef as React.Ref<HTMLElement>}
        className={styles.panel}
        data-open="true"
        data-appearance={resolvedAppearance}
        data-elevation="expanded"
        data-anchor={verticalAnchor.mode}
        style={dragHandleCursor ? { ...shellStyle, cursor: dragHandleCursor } : shellStyle}
        aria-label={`${title} settings`}
        {...dragBackgroundHandleProps}
      >
        {/* The surface blurs its own underlay; the optional halo remains a frame sibling. */}
        <div
          className={styles.backdrop}
          data-blur={panelConfig.backgroundBlurEnabled && panelConfig.backgroundBlurPx > 0 ? 'true' : 'false'}
          data-drag-frost={dragFrostActive ? 'true' : undefined}
          aria-hidden="true"
        />
        <div
          className={styles.panelHeader}
          style={dragHandleCursor ? { cursor: dragHandleCursor } : undefined}
          {...dragHandleProps}
        >
          <button
            type="button"
            className={styles.panelTitle}
            onClick={onToggle}
            aria-label={`Close ${title} settings`}
            aria-expanded={true}
            aria-controls={contentId}
          >
            {title}
          </button>
          {headerActions && (
            <div className={styles.headerActions}>{headerActions}</div>
          )}
        </div>
        <div
          id={contentId}
          className={styles.scrollArea}
          style={dragHandleCursor ? { cursor: dragHandleCursor } : undefined}
          {...dragBackgroundHandleProps}
        >
          <PanelNestingContext.Provider
            value={resolvedBackgroundColor ? {
              color: resolvedBackgroundColor,
              step: panelConfig.nestedSurfaceLightnessStep,
            } : null}
          >
            <PanelDragFrostContext.Provider value={dragFrostActive}>
              {children}
            </PanelDragFrostContext.Provider>
          </PanelNestingContext.Provider>
        </div>
      </section>
    </div>
  );
}

// ── Sect ──────────────────────────────────────────────────────────────────────

export function Sect({
  title,
  open,
  onToggle,
  /** Opt-in only — set by ConfigFieldSubgroupControl (components/Panel/
   * config/controlResolver.tsx) via PanelNestingContext for progressive
   * depth shading (PLAN-POSTS-LAB-PANEL-TABS.md §13). Every other caller
   * (FontConfigPanel, GridConfigPanel, etc.) never passes this, so Sect
   * renders exactly as before this feature existed unless a caller opts
   * in explicitly. */
  backgroundColor,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  backgroundColor?: string;
  children: ReactNode;
}) {
  const contentId = useId();

  return (
    <div
      className={styles.section}
      data-open={open ? 'true' : 'false'}
      data-shaded={backgroundColor ? 'true' : 'false'}
      // A CSS custom property, not a direct backgroundColor style — the
      // actual fill (background-color + the horizontal box-shadow bleed
      // that reaches the true panel edge, .section[data-shaded='true'] in
      // Panel.module.css) is fully defined in CSS from this one value, so
      // there's exactly one place that ever has to agree on how "shaded"
      // is painted.
      style={backgroundColor ? { '--panel-section-shade': backgroundColor } as CSSProperties : undefined}
    >
      <button
        type="button"
        className={styles.sectionToggle}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={contentId}
      >
        <span>{title}</span>
        <span className={styles.sectionChevron} aria-hidden="true" />
      </button>
      <div
        id={contentId}
        className={styles.sectionDisclosure}
        aria-hidden={!open}
      >
        <div className={styles.sectionDisclosureInner}>
          <div className={styles.sectionContent}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// ── SubLabel ──────────────────────────────────────────────────────────────────

export function SubLabel({ children }: { children: ReactNode }) {
  return <div className={styles.subLabel}>{children}</div>;
}

export function PanelDescription({ children }: { children: ReactNode }) {
  return <div className={styles.description}>{children}</div>;
}

// ── Knob ──────────────────────────────────────────────────────────────────────

export function Knob({
  label,
  value,
  min,
  max,
  step,
  steps,
  onChange,
  unit = '',
  accent = '',
  description = '',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /**
   * Optional explicit ascending list of the only allowed values — for
   * scales that aren't uniformly spaced across their whole range (e.g.
   * Tailwind's own spacing scale, which steps 2px from 0-16px, 4px from
   * 16-48px, 8px from 48-64px, then 16px beyond that — no single fixed
   * `step` can represent it without either skipping real values or landing
   * on invalid ones). When provided, this drives the native range input by
   * index into `steps` (snapping to the nearest entry) instead of by
   * min/max/step directly; `min`/`max`/`step` are only used for the plain
   * uniform case when `steps` is omitted, so every existing caller is
   * unaffected.
   */
  steps?: ReadonlyArray<number>;
  onChange: (value: number) => void;
  unit?: string;
  accent?: string;
  description?: string;
}) {
  const hasSteps = Boolean(steps && steps.length > 0);

  const nearestStepIndex = (target: number) => {
    if (!steps || steps.length === 0) return 0;
    let bestIndex = 0;
    let bestDiff = Infinity;
    steps.forEach((candidate, index) => {
      const diff = Math.abs(candidate - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = index;
      }
    });
    return bestIndex;
  };

  const effectiveMin = hasSteps ? steps![0] : min;
  const effectiveMax = hasSteps ? steps![steps!.length - 1] : max;
  const safe = hasSteps
    ? steps![nearestStepIndex(Number.isFinite(value) ? value : steps![0])]
    : (Number.isFinite(value) ? clamp(value, min, max) : min);
  const safeIndex = hasSteps ? nearestStepIndex(safe) : 0;
  const pct = hasSteps
    ? (steps!.length > 1 ? safeIndex / (steps!.length - 1) : 0)
    : (max > min ? clamp((safe - min) / (max - min), 0, 1) : 0);
  const formatted = formatKnobValue(safe, hasSteps ? 1 : step);
  const [draft, setDraft] = useState(formatted);
  const valueRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (document.activeElement === valueRef.current) return;
    setDraft(formatted);
  }, [formatted]);

  const sanitizeDraft = (next: string) => {
    const allowsNegative = effectiveMin < 0;
    let cleaned = next.replace(allowsNegative ? /[^0-9.-]/g : /[^0-9.]/g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot !== -1) {
      cleaned = `${cleaned.slice(0, firstDot + 1)}${cleaned.slice(firstDot + 1).replace(/\./g, '')}`;
    }
    if (allowsNegative) cleaned = cleaned.replace(/(?!^)-/g, '');
    return cleaned;
  };

  const commitDraft = (next: string) => {
    const parsed = Number(next);
    if (!Number.isFinite(parsed)) {
      setDraft(formatted);
      return;
    }
    const committed = hasSteps
      ? steps![nearestStepIndex(parsed)]
      : clamp(Number(parsed.toFixed(6)), min, max);
    const committedText = formatKnobValue(committed, hasSteps ? 1 : step);
    setDraft(committedText);
    onChange(committed);
  };

  const controlStyle = {
    '--panel-range-progress': `${pct * 100}%`,
    ...(accent ? { '--panel-control-accent': accent } : {}),
  } as CSSProperties;

  return (
    <div className={styles.control} style={controlStyle}>
      <div className={styles.controlHeader}>
        <div className={styles.controlLabelWrap}>
          {accent && <span className={styles.controlAccent} />}
          <span className={styles.controlLabel}>{label}</span>
        </div>
        <div className={styles.controlValue}>
          <input
            ref={valueRef}
            type="text"
            className={styles.valueInput}
            value={draft}
            inputMode="decimal"
            role="spinbutton"
            aria-label={`${label} value`}
            aria-valuemin={effectiveMin}
            aria-valuemax={effectiveMax}
            aria-valuenow={safe}
            title="Numbers only. Press Enter or click away to apply."
            onChange={event => setDraft(sanitizeDraft(event.target.value))}
            onBlur={event => commitDraft(event.currentTarget.value)}
            onFocus={event => event.currentTarget.select()}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitDraft(event.currentTarget.value);
                event.currentTarget.blur();
                return;
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                setDraft(formatted);
                event.currentTarget.blur();
              }
            }}
          />
          {unit && <span>{unit}</span>}
        </div>
      </div>
      <div className={styles.rangeHitArea}>
        <div className={styles.rangeTrack} />
        <div className={styles.rangeProgress} />
        <div className={styles.rangeThumb} />
        <input
          type="range"
          className={styles.rangeInput}
          value={hasSteps ? safeIndex : safe}
          min={hasSteps ? 0 : min}
          max={hasSteps ? steps!.length - 1 : max}
          step={hasSteps ? 1 : step}
          onChange={event => {
            if (hasSteps) {
              const index = clamp(Math.round(Number(event.target.value)), 0, steps!.length - 1);
              onChange(steps![index]);
              return;
            }
            onChange(Number(event.target.value));
          }}
          aria-label={label}
        />
      </div>
      {description && <div className={styles.description}>{description}</div>}
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────

export function Toggle({ label, checked, onChange, description = '' }: { label: string; checked: boolean; onChange: (value: boolean) => void; description?: string }) {
  return (
    <div className={styles.toggle}>
      <label className={styles.toggleLabel}>
        <span className={styles.controlLabel}>{label}</span>
        <span className={styles.toggleTrack} data-checked={checked ? 'true' : 'false'}>
          <span className={styles.toggleThumb} />
        </span>
        <input className={styles.toggleInput} type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
      </label>
      {description && <div className={styles.description}>{description}</div>}
    </div>
  );
}

// ── ColorInput ────────────────────────────────────────────────────────────────

export function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const pickerValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#ffffff';

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commitDraft = (nextValue: string) => {
    setDraft(nextValue);
    if (/^#[0-9a-fA-F]{6}$/.test(nextValue)) onChange(nextValue);
  };

  return (
    <label className={styles.colorControl}>
      <span className={styles.controlLabel}>{label}</span>
      <div className={styles.colorInputs}>
        <input
          className={styles.colorPicker}
          type="color"
          value={pickerValue}
          onChange={event => commitDraft(event.target.value)}
          aria-label={`${label} picker`}
        />
        <input
          className={styles.textInput}
          type="text"
          value={draft}
          onChange={event => commitDraft(event.target.value)}
          onBlur={() => {
            if (!/^#[0-9a-fA-F]{6}$/.test(draft)) setDraft(value);
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (/^#[0-9a-fA-F]{6}$/.test(event.currentTarget.value)) {
                onChange(event.currentTarget.value);
              } else {
                setDraft(value);
              }
              event.currentTarget.blur();
              return;
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setDraft(value);
              event.currentTarget.blur();
            }
          }}
          aria-label={`${label} hex value`}
        />
      </div>
    </label>
  );
}

export function TextInput({
  label,
  value,
  description,
  onChange,
}: {
  label: string;
  value: string;
  description?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.colorControl}>
      <span className={styles.controlLabel}>{label}</span>
      <input
        className={styles.textInput}
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        aria-label={label}
      />
      {description && <div className={styles.description}>{description}</div>}
    </label>
  );
}

// ── SummaryRow ────────────────────────────────────────────────────────────────

export function PanelSummary({ children }: { children: ReactNode }) {
  return <div className={styles.summary}>{children}</div>;
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryRow}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>{value}</span>
    </div>
  );
}
