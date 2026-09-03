import { useRef } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import Link from 'next/link';
import type { AboutTimelineAlignment } from './AboutTimeline.config';
import styles from './AboutTimeline.module.css';
import {
  LiquidGradientAdapter,
  type DeckPaletteState,
} from '../../abstract/components/AbstractPostDock/components/GradientRenderer';
import type { SliderContentSlide } from '../../../helpers/postContent';
import type { LiquidSliderConfig } from '../../abstract/components/AbstractPostDock/config/legacy';
import type { useLiquidSliderMotion } from '../../abstract/components/AbstractPostDock/hooks/motion';
import { useDockGradientAvailability } from '../../abstract/components/AbstractPostDock/hooks/browserState';
import { resolveAbstractPostDockGradientActivity } from '../../abstract/components/AbstractPostDock/helpers/gradientActivity';

// Same single-render-per-change policy AboutMobileAccordionItem.tsx's own
// STATIC_GRADIENT_PERFORMANCE_CONFIG already uses one file over — the
// marker's own gradient must never run a continuous idle-drift/noise loop
// either; 'static' resolves to 'frozen' in resolveAbstractPostDockGradient-
// Activity before that helper even looks at which row is "active" — a
// single render per relevant prop change (row selection, palette edit),
// never a per-frame recalculation.
const STATIC_MARKER_GRADIENT_PERFORMANCE_CONFIG = {
  activityPolicy: 'static' as const,
  pauseWhenOffscreen: true,
};

export interface AboutTimelineRowProps {
  id: string;
  panelId: string;
  caption: string;
  line?: string;
  appendix?: string;
  appendixSeparator: string;
  appendixClassName: string;
  /** Pointer reveal becomes true only after the timeline's hover activation
   * delay. Keyboard focus remains an independent accessible reveal path. */
  appendixVisible: boolean;
  /** Opacity the appendix renders at once revealed — `config.rowAppendixOpacity`,
   * independent of `descriptionOpacity` below (that prop only ever
   * describes the row's own supporting line). */
  appendixOpacity: number;
  /** Real selection state (`row.slideIndex === activeIndex`) — drives the
   * marker's own fill class and, when selection is enabled, tab semantics.
   * Hover may provide text emphasis for an otherwise inactive row. */
  active: boolean;
  /** When false, rows behave as a normal list item: every row is keyboard
   * reachable and no row is exposed as selected. */
  selectionEnabled: boolean;
  tabIndex: number;
  /** Only meaningful while `selectionEnabled` is false (`config.maxActiveRows
   * === 0`) — when present, this row renders as a real link (`next/link`) to
   * this URL instead of a selection button, so a zero-active-rows timeline
   * can act as a plain list of navigable links rather than a dead list.
   * Ignored while `selectionEnabled` is true: an active timeline's rows stay
   * selection buttons even if a caller also supplies `href`, since tab
   * semantics and link navigation don't compose. Absent (the pre-existing
   * behavior) keeps every row a selection-less but non-navigating button. */
  href?: string;
  /** Resolved marker fill/outline color — either the active slide's own
   * accent, a fixed custom color, or the row title's own active color, see
   * `AboutTimeline.tsx`'s own `resolvedMarkerColor`. */
  markerColor: string;
  /** Opacity of the marker — already resolved by `AboutTimeline.tsx`:
   * `config.hoverMarkerOpacity` while this row is the hovered one, else
   * `markerActiveOpacity`/`-IdleOpacity` per `active` — hovering a row never
   * changes any other row's own opacity. */
  markerOpacity: number;
  /** Resolved, contrast-aware color for this row's own title (caption) —
   * already picked for this row's current active/inactive state by
   * `AboutTimeline.tsx` (`config.rowTitleMinContrastActive`/`-Inactive`). */
  titleColor: string;
  /** Opacity of the title text — reused verbatim from
   * `dockLayoutConfig.minimalModeTextDimOpacity`/`-TextEmphasisOpacity`
   * (INT-03), already picked for this row's current state. */
  titleOpacity: number;
  /** Joined padding/margin Tailwind classes for the title (caption) span —
   * `config.rowTitlePadding*`/`-Margin*`. */
  titleClassName: string;
  /** Resolved, contrast-aware color for this row's own supporting line —
   * independent of `titleColor` (`config.rowDescriptionMinContrastActive`/
   * `-Inactive`). */
  descriptionColor: string;
  /** Opacity of the supporting line — independent of `titleOpacity`
   * (`config.rowDescriptionOpacityActive`/`-Inactive`), no longer a single
   * hardcoded CSS value applied unconditionally. */
  descriptionOpacity: number;
  /** Joined padding/margin Tailwind classes for the supporting line span —
   * `config.rowDescriptionPadding*`/`-Margin*`. */
  descriptionClassName: string;
  /** Whether this row's circular marker is rendered. The rule remains an
   * independent control so it can still be used as a quiet chronology rail. */
  markerVisible: boolean;
  /** Whether the optional supporting line is rendered. */
  descriptionVisible: boolean;
  ruleVisible: boolean;
  alignment: AboutTimelineAlignment;
  transitionDurationMs: number;
  transitionEasingCss: string;
  appendixRevealDelayMs: number;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  /** Pointer-hover start — `AboutTimeline.tsx`'s own delay timer decides
   * whether/when this actually flips `visuallyActive` for this row. */
  onPointerEnter: () => void;
  /** Pointer-hover end — always immediate, no delay on the way out. */
  onPointerLeave: () => void;
  rowRef: (element: HTMLButtonElement | HTMLAnchorElement | null) => void;
  /** `config.markerGradientEnabled` — see that field's own doc comment
   * (`AboutTimeline.config.ts`). Only ever actually mounts the WebGL
   * gradient while this AND `active` are both true — the marker's flat
   * fill (`.markerActive`, `background-color: currentColor`) already only
   * ever applies to the one active row, so there is never more than one
   * gradient instance mounted across all rows at once; every inactive row
   * stays exactly as hollow as it does today, gradient mode or not. */
  gradientEnabled: boolean;
  /** This row's own slide — `undefined` whenever the page hasn't wired
   * gradient data through (e.g. `gradientEnabled` off), matching every
   * other optional prop here. */
  gradientSlide?: SliderContentSlide;
  gradientPalette?: DeckPaletteState | null;
  gradientMotion?: ReturnType<typeof useLiquidSliderMotion>;
  gradientConfig?: LiquidSliderConfig;
}

/**
 * ART-01/ART-02 (about-IA-timeline-copy-rework) — standard sentence case, no
 * small caps/letterspacing/uppercase. ART-05: one hairline-rule marker per row, hollow while inactive,
 * filled with the resolved marker color while active — the fill itself
 * switching on is the state signal, opacity is only ever a secondary
 * pairing (A11Y-04), never the sole carrier.
 *
 * Operator fix: font weight never changes between active/inactive — color
 * and marker fill are the only signals a row is active. A prior version
 * also bumped font-weight on the active row; removed entirely, not just
 * toned down, per explicit instruction.
 *
 * Title and description (caption/line) each carry their own independently
 * resolved color and opacity now, applied directly to their own `<span>`
 * rather than to their shared wrapper — necessary so the description's own
 * opacity (`descriptionOpacity`) never compounds multiplicatively with the
 * title's own (`titleOpacity`), which a single shared wrapper opacity would
 * otherwise produce.
 */
export function AboutTimelineRow({
  id,
  panelId,
  caption,
  line,
  appendix,
  appendixSeparator,
  appendixClassName,
  appendixVisible,
  appendixOpacity,
  active,
  selectionEnabled,
  tabIndex,
  href,
  markerColor,
  markerOpacity,
  titleColor,
  titleOpacity,
  titleClassName,
  descriptionColor,
  descriptionOpacity,
  descriptionClassName,
  markerVisible,
  descriptionVisible,
  ruleVisible,
  alignment,
  transitionDurationMs,
  transitionEasingCss,
  appendixRevealDelayMs,
  onSelect,
  onKeyDown,
  onPointerEnter,
  onPointerLeave,
  rowRef,
  gradientEnabled,
  gradientSlide,
  gradientPalette,
  gradientMotion,
  gradientConfig,
}: AboutTimelineRowProps) {
  const markerRef = useRef<HTMLSpanElement | null>(null);
  // Always called (rules of hooks), same as AboutMobileAccordionItem.tsx's
  // own identical call — cheap (a visibilitychange listener + an
  // IntersectionObserver) and inert whenever gradientEnabled is off, since
  // `showMarkerGradient` below gates the actual WebGL mount, not this hook.
  const { isDockVisible, isDocumentVisible } = useDockGradientAvailability(markerRef, true);
  // Only the active row's marker is ever filled at all (.markerActive below,
  // unchanged) — mounting the gradient for any other row would render a
  // canvas nobody can see (fill is 0 while inactive), so this is never more
  // than one concurrent WebGL instance across all five rows, not one per
  // row.
  const showMarkerGradient = markerVisible && gradientEnabled && active && Boolean(gradientSlide) && Boolean(gradientMotion) && Boolean(gradientConfig);
  const normalizedLine = typeof line === 'string' ? line.trim() : '';
  const normalizedAppendix = typeof appendix === 'string' ? appendix.trim() : '';
  const markerGradientActivity = resolveAbstractPostDockGradientActivity({
    config: STATIC_MARKER_GRADIENT_PERFORMANCE_CONFIG,
    isActive: false,
    isDockVisible,
    isDocumentVisible,
  });
  const rowContent = (
    <>
      {ruleVisible ? <span aria-hidden="true" className={styles.rule} /> : null}
      {markerVisible ? (
        <span
          ref={markerRef}
          aria-hidden="true"
          className={`${styles.marker} ${active ? styles.markerActive : ''} ${showMarkerGradient ? styles.markerGradientBleed : ''}`}
          style={{
            color: markerColor,
            opacity: markerOpacity,
          }}
        >
          {showMarkerGradient && gradientSlide && gradientMotion && gradientConfig ? (
            <LiquidGradientAdapter
              slide={gradientSlide}
              motion={gradientMotion}
              config={gradientConfig}
              palette={gradientPalette ?? null}
              activity={markerGradientActivity}
            />
          ) : null}
        </span>
      ) : null}
      <span className={styles.content}>
        <span
          className={`${styles.caption} ${titleClassName}`}
        >
          <span
            className={styles.captionText}
            style={{ color: titleColor, opacity: titleOpacity }}
          >
            {caption}
          </span>
          {normalizedAppendix ? (
            <span
              className={`${styles.appendix} ${appendixClassName}`}
              style={{
                color: descriptionColor,
                '--about-timeline-appendix-opacity': appendixOpacity,
              } as CSSProperties}
            >
              <span className={styles.appendixSeparator}>{appendixSeparator}</span>
              {normalizedAppendix}
            </span>
          ) : null}
        </span>
        {descriptionVisible && normalizedLine ? (
          <span
            className={`${styles.line} ${descriptionClassName}`}
            style={{ color: descriptionColor, opacity: descriptionOpacity }}
          >
            {normalizedLine}
          </span>
        ) : null}
      </span>
    </>
  );

  // A row is only ever a link (real navigation, no tab semantics) while the
  // timeline has no selection concept at all (`!selectionEnabled`, i.e.
  // `config.maxActiveRows === 0`) AND the caller actually supplied a
  // destination — otherwise it stays the existing selection button, so
  // AboutTimeline keeps working as either a tablist (about.tsx/abstract.tsx)
  // or a plain non-navigating list (any `href`-less zero-selection caller),
  // unchanged.
  const sharedProps = {
    id,
    tabIndex,
    onKeyDown,
    onPointerEnter,
    onPointerLeave,
    'data-alignment': alignment,
    'data-marker-visible': markerVisible,
    'data-rule-visible': ruleVisible,
    'data-appendix-visible': appendixVisible,
    className: styles.row,
    style: {
      '--about-timeline-transition-ms': `${transitionDurationMs}ms`,
      '--about-timeline-transition-easing': transitionEasingCss,
      '--about-timeline-appendix-reveal-delay-ms': `${appendixRevealDelayMs}ms`,
    } as CSSProperties,
  };

  return (
    <li className={styles.item}>
      {!selectionEnabled && href ? (
        <Link
          ref={rowRef}
          href={href}
          onClick={onSelect}
          {...sharedProps}
        >
          {rowContent}
        </Link>
      ) : (
        <button
          ref={rowRef}
          type="button"
          role={selectionEnabled ? 'tab' : undefined}
          aria-selected={selectionEnabled ? active : undefined}
          aria-controls={selectionEnabled ? panelId : undefined}
          onClick={onSelect}
          {...sharedProps}
        >
          {rowContent}
        </button>
      )}
    </li>
  );
}
