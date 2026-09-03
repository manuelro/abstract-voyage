import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { CTA_BUTTON_MOTION_EASINGS } from '../../../components/CtaButton/config/registered';
import { tailwindSpacingTokenToPx } from '../../../components/tailwindSpacingScale';
import { resolveContrastAwareTextColor } from '../../../helpers/surfaceColorDerivation';
import { AboutTimelineRow } from './AboutTimelineRow';
import type { AboutTimelineConfig } from './AboutTimeline.config';
import styles from './AboutTimeline.module.css';
import type { DeckPaletteState } from '../../abstract/components/AbstractPostDock/components/GradientRenderer';
import type { SliderContentSlide } from '../../../helpers/postContent';
import type { LiquidSliderConfig } from '../../abstract/components/AbstractPostDock/config/legacy';
import type { useLiquidSliderMotion } from '../../abstract/components/AbstractPostDock/hooks/motion';

export type AboutTimelineRowData = {
  caption: string;
  line?: string;
  /** Optional metadata appended inline to the title. Its meaning is owned by
   * the caller: category, date, duration, status, or another compact label. */
  appendix?: string;
  /** @deprecated Use `appendix`; retained for existing timeline data. */
  category?: string;
  slideIndex: number;
  /** Only read while `config.maxActiveRows === 0` — see `AboutTimelineRow`'s
   * own `href` doc comment. Absent (every existing caller) keeps a
   * zero-selection row a non-navigating list item, unchanged. */
  href?: string;
};

// Rule weight's own catalog (AboutTimeline.config.ts's RULE_WEIGHT_OPTIONS)
// includes Tailwind's `w-px` keyword class (1px) alongside its numeric-scale
// siblings — `tailwindSpacingTokenToPx` only resolves the numeric scale (its
// own TAILWIND_SPACING_PX map has no 'px' entry), so this one small,
// three-value lookup stays local here rather than teaching that shared
// helper about a keyword class none of its other callers use.
const RULE_WEIGHT_PX: Record<string, number> = { 'w-px': 1, 'w-0.5': 2, 'w-1': 4 };

// The title class is a closed catalog (tailwindTypographyScale.ts), so the
// marker can share the caption's actual first-line box instead of relying on
// a stale, hard-coded 0.95rem assumption. The caption's own CSS line-height
// is unitless 1.3 (AboutTimeline.module.css), applied to these font sizes.
const TITLE_FONT_SIZE_REM: Record<string, number> = {
  'text-xs': 0.75,
  'text-sm': 0.875,
  'text-base': 1,
  'text-lg': 1.125,
  'text-xl': 1.25,
  'text-2xl': 1.5,
  'text-3xl': 1.875,
  'text-4xl': 2.25,
  'text-5xl': 3,
  'text-6xl': 3.75,
};

export interface AboutTimelineProps {
  rows: ReadonlyArray<AboutTimelineRowData>;
  /** The currently active dock slide index — `AboutSlidesContext.activeIndex`
   * is the only source of truth (INT-02); this component holds no index
   * state of its own. */
  activeIndex: number;
  onSelect: (index: number) => void;
  /** The active slide's own resolved palette color
   * (`aboutSlides[activeIndex].accent`, pages/about.tsx) — INT-04: no new
   * palette math happens here, this is the exact value the dock itself
   * already computed. Only actually used for the marker while
   * `config.markerColorMode` is 'accent'; see `resolvedMarkerColor` below. */
  accentColor: string;
  /** The column's own resolved background color — the contrast target every
   * text color this component resolves (the row title/description pairs,
   * and the lead-in `description` below) is computed against. */
  columnBackgroundColor: string;
  /** Plain lead-in text rendered above the rows, no heading semantics —
   * describes the timeline itself. Indented to start at the same x-position
   * a row's own caption text starts at (the marker/rule column's own
   * horizontal space is simply left empty above it, not filled with
   * anything) — see `AboutTimeline.module.css`'s own `.description` rule.
   * Omitted entirely when not supplied (no empty spacer left behind). */
  description?: string;
  config: AboutTimelineConfig;
  prefersReducedMotion: boolean;
  /** A11Y-01 — the id of the single dock region these tabs control (see
   * pages/about.tsx's own `role="tabpanel"` wrapper around the desktop
   * dock). */
  panelId: string;
  /** Only read while `config.markerGradientEnabled` is on — see that
   * field's own doc comment. Index-aligned with `rows[n].slideIndex`
   * (`aboutSlides`, pages/about.tsx — the same array `accentColor` above is
   * already sourced from), so `gradientSlides[row.slideIndex]` is that
   * row's own slide. Every field below is optional and simply renders the
   * existing flat marker fill when absent, matching every other prop this
   * component already treats this way. */
  gradientSlides?: ReadonlyArray<SliderContentSlide>;
  /** Same index alignment as `gradientSlides` above. `null` (not just
   * absent) is a normal, expected value here — `pages/about.tsx`'s own
   * `buildDeckPaletteStates` call returns `null` whenever the page's
   * directed-palette feature is off, in which case every row's marker
   * gradient falls back to the dock's own base `shaderColorScale` (INT-04:
   * no new palette math here, the same fallback `applySliderGradientUniforms`
   * already gives every other caller with no palette). */
  gradientPaletteStates?: ReadonlyArray<DeckPaletteState> | null;
  /** A single shared motion instance across every row's own marker gradient
   * — not one per row, matching this component's own single-instance-at-
   * once reality (only the active row's marker is ever filled, see
   * `AboutTimelineRow.tsx`'s own `showMarkerGradient`). */
  gradientMotion?: ReturnType<typeof useLiquidSliderMotion>;
  gradientConfig?: LiquidSliderConfig;
}

const TAB_ID_PREFIX = 'about-timeline-tab';

/**
 * CMP-01 (about-IA-timeline-copy-rework) — the desktop-only left-column
 * career timeline (see CMP-06 for its mount point, INT-06 for why mobile
 * has no equivalent: the accordion is multi-expand and doesn't map onto a
 * single activeIndex). A real ARIA tablist (A11Y-01/02/03): rows sit in an
 * `<ol>` (chronological order must survive CSS being stripped), keyboard
 * arrow/Home/End navigation with a roving tabindex (A11Y-02), one tab stop
 * for the whole set.
 */
export function AboutTimeline({
  rows,
  activeIndex,
  onSelect,
  accentColor,
  columnBackgroundColor,
  description,
  config,
  prefersReducedMotion,
  panelId,
  gradientSlides,
  gradientPaletteStates,
  gradientMotion,
  gradientConfig,
}: AboutTimelineProps) {
  const rowRefs = useRef<Array<HTMLButtonElement | HTMLAnchorElement | null>>([]);
  const transitionEasingCss = CTA_BUTTON_MOTION_EASINGS[config.transitionEasing];
  const transitionDurationMs = prefersReducedMotion ? 0 : config.transitionDurationMs;

  // Pointer-hover state, independent of `activeIndex` (real selection):
  // while a row is hovered (post-delay), it reads as the sole "visually
  // active" row — see `isHoveredRow`/`visuallyActive` below — regardless of
  // which row is actually selected. Only entering has a delay; leaving
  // (or the pointer moving to another row) clears it immediately.
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current !== null) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handleRowPointerEnter = useCallback((slideIndex: number) => {
    clearHoverTimeout();
    if (config.hoverDelayMs <= 0) {
      setHoveredIndex(slideIndex);
      return;
    }
    hoverTimeoutRef.current = setTimeout(() => {
      hoverTimeoutRef.current = null;
      setHoveredIndex(slideIndex);
    }, config.hoverDelayMs);
  }, [clearHoverTimeout, config.hoverDelayMs]);

  const handleRowPointerLeave = useCallback((slideIndex: number) => {
    clearHoverTimeout();
    setHoveredIndex(current => (current === slideIndex ? null : current));
  }, [clearHoverTimeout]);

  useEffect(() => clearHoverTimeout, [clearHoverTimeout]);

  // Every row's own title/description color pair, resolved once here (not
  // per-row, not per-render-of-a-single-row) since they're identical for
  // every row — only which pair (active vs. inactive) a given row reads
  // depends on that row's own `active` flag. offset 0 on every call: no
  // lightness bias requested, just a contrast floor, matching
  // resolvedDescriptionColor's own reasoning below.
  const resolvedRowTitleColorActive = useMemo(
    () => resolveContrastAwareTextColor(columnBackgroundColor, config.rowTitleMinContrastActive, 0),
    [columnBackgroundColor, config.rowTitleMinContrastActive],
  );
  const resolvedRowTitleColorInactive = useMemo(
    () => resolveContrastAwareTextColor(columnBackgroundColor, config.rowTitleMinContrastInactive, 0),
    [columnBackgroundColor, config.rowTitleMinContrastInactive],
  );
  const resolvedRowDescriptionColorActive = useMemo(
    () => resolveContrastAwareTextColor(columnBackgroundColor, config.rowDescriptionMinContrastActive, 0),
    [columnBackgroundColor, config.rowDescriptionMinContrastActive],
  );
  const resolvedRowDescriptionColorInactive = useMemo(
    () => resolveContrastAwareTextColor(columnBackgroundColor, config.rowDescriptionMinContrastInactive, 0),
    [columnBackgroundColor, config.rowDescriptionMinContrastInactive],
  );
  // 'text' mode matches the row title's own ACTIVE color specifically — the
  // marker's own fill state already means "this row is active," so it reads
  // as one ink with the row's own most-prominent text in that same state.
  const resolvedMarkerColor = config.markerColorMode === 'custom'
    ? config.markerCustomColor
    : config.markerColorMode === 'text'
      ? resolvedRowTitleColorActive
      : accentColor;
  const resolvedDescriptionColor = useMemo(
    () => resolveContrastAwareTextColor(columnBackgroundColor, config.descriptionMinContrast, 0),
    [columnBackgroundColor, config.descriptionMinContrast],
  );

  const focusRow = useCallback((index: number) => {
    rowRefs.current[index]?.focus();
  }, []);

  // A11Y-02 — automatic activation (moving focus also moves the active
  // slide, matching the WAI-ARIA APG's tabs pattern default): arrow keys
  // move between rows, Home/End jump to first/last, wrapping never occurs
  // (clamped, matching AboutSlidesContext.goToPrevious/-Next's own
  // Math.max/Math.min bounds).
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement | HTMLAnchorElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      nextIndex = Math.min(rows.length - 1, index + 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      nextIndex = Math.max(0, index - 1);
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = rows.length - 1;
    }
    if (nextIndex === null || nextIndex === index) return;
    event.preventDefault();
    onSelect(rows[nextIndex].slideIndex);
    focusRow(nextIndex);
  }, [rows, onSelect, focusRow]);

  const titleClassName = [
    config.rowTitleFontFamily,
    config.rowTitleFontWeightClassName, config.rowTitleFontSizeClassName,
    config.rowTitlePaddingTopClassName, config.rowTitlePaddingRightClassName,
    config.rowTitlePaddingBottomClassName, config.rowTitlePaddingLeftClassName,
    config.rowTitlePaddingTopWideClassName, config.rowTitlePaddingRightWideClassName,
    config.rowTitlePaddingBottomWideClassName, config.rowTitlePaddingLeftWideClassName,
    config.rowTitlePaddingTopLgClassName, config.rowTitlePaddingRightLgClassName,
    config.rowTitlePaddingBottomLgClassName, config.rowTitlePaddingLeftLgClassName,
    config.rowTitleMarginTopClassName, config.rowTitleMarginRightClassName,
    config.rowTitleMarginBottomClassName, config.rowTitleMarginLeftClassName,
    config.rowTitleMarginTopWideClassName, config.rowTitleMarginRightWideClassName,
    config.rowTitleMarginBottomWideClassName, config.rowTitleMarginLeftWideClassName,
    config.rowTitleMarginTopLgClassName, config.rowTitleMarginRightLgClassName,
    config.rowTitleMarginBottomLgClassName, config.rowTitleMarginLeftLgClassName,
  ].join(' ');
  const rowDescriptionClassName = [
    config.rowDescriptionFontFamily,
    config.rowDescriptionFontSizeClassName,
    config.rowDescriptionPaddingTopClassName, config.rowDescriptionPaddingRightClassName,
    config.rowDescriptionPaddingBottomClassName, config.rowDescriptionPaddingLeftClassName,
    config.rowDescriptionPaddingTopWideClassName, config.rowDescriptionPaddingRightWideClassName,
    config.rowDescriptionPaddingBottomWideClassName, config.rowDescriptionPaddingLeftWideClassName,
    config.rowDescriptionPaddingTopLgClassName, config.rowDescriptionPaddingRightLgClassName,
    config.rowDescriptionPaddingBottomLgClassName, config.rowDescriptionPaddingLeftLgClassName,
    config.rowDescriptionMarginTopClassName, config.rowDescriptionMarginRightClassName,
    config.rowDescriptionMarginBottomClassName, config.rowDescriptionMarginLeftClassName,
    config.rowDescriptionMarginTopWideClassName, config.rowDescriptionMarginRightWideClassName,
    config.rowDescriptionMarginBottomWideClassName, config.rowDescriptionMarginLeftWideClassName,
    config.rowDescriptionMarginTopLgClassName, config.rowDescriptionMarginRightLgClassName,
    config.rowDescriptionMarginBottomLgClassName, config.rowDescriptionMarginLeftLgClassName,
  ].join(' ');

  const rowElements = useMemo(() => rows.map((row, index) => {
    const selectionEnabled = config.maxActiveRows > 0;
    const selected = selectionEnabled && row.slideIndex === activeIndex;
    const isHoveredRow = row.slideIndex === hoveredIndex;
    return (
      <AboutTimelineRow
        key={row.slideIndex}
        id={`${TAB_ID_PREFIX}-${row.slideIndex}`}
        panelId={panelId}
        caption={row.caption}
        line={row.line}
        appendix={config.rowAppendixEnabled ? (row.appendix ?? row.category) : undefined}
        appendixSeparator={config.rowAppendixSeparator}
        appendixClassName={`${config.rowAppendixFontFamily} ${config.rowAppendixFontSizeClassName}`}
        appendixVisible={isHoveredRow}
        appendixOpacity={config.rowAppendixOpacity}
        active={selected}
        selectionEnabled={selectionEnabled}
        tabIndex={selectionEnabled ? (selected ? 0 : -1) : 0}
        href={row.href}
        markerColor={resolvedMarkerColor}
        titleColor={isHoveredRow || selected ? resolvedRowTitleColorActive : resolvedRowTitleColorInactive}
        descriptionColor={isHoveredRow || selected ? resolvedRowDescriptionColorActive : resolvedRowDescriptionColorInactive}
        descriptionOpacity={isHoveredRow
          ? config.hoverDescriptionOpacity
          : (selected ? config.rowDescriptionOpacityActive : config.rowDescriptionOpacityInactive)}
        markerVisible={config.markerVisible}
        descriptionVisible={config.rowDescriptionVisible}
        ruleVisible={config.ruleVisible}
        alignment={config.alignment}
        titleOpacity={isHoveredRow
          ? config.hoverTitleOpacity
          : (selected ? config.rowTitleOpacityActive : config.rowTitleOpacityInactive)}
        markerOpacity={isHoveredRow
          ? config.hoverMarkerOpacity
          : (selected ? config.markerActiveOpacity : config.markerIdleOpacity)}
        titleClassName={titleClassName}
        descriptionClassName={rowDescriptionClassName}
        transitionDurationMs={transitionDurationMs}
        transitionEasingCss={transitionEasingCss}
        appendixRevealDelayMs={prefersReducedMotion ? 0 : config.rowAppendixRevealDelayMs}
        onSelect={() => onSelect(row.slideIndex)}
        onKeyDown={keyboardEvent => handleKeyDown(keyboardEvent, index)}
        onPointerEnter={() => handleRowPointerEnter(row.slideIndex)}
        onPointerLeave={() => handleRowPointerLeave(row.slideIndex)}
        rowRef={element => { rowRefs.current[index] = element; }}
        gradientEnabled={config.markerGradientEnabled}
        gradientSlide={gradientSlides?.[row.slideIndex]}
        gradientPalette={gradientPaletteStates?.[row.slideIndex]}
        gradientMotion={gradientMotion}
        gradientConfig={gradientConfig}
      />
    );
  }), [
    rows, activeIndex, resolvedMarkerColor, hoveredIndex, config.maxActiveRows,
    resolvedRowTitleColorActive, resolvedRowTitleColorInactive,
    resolvedRowDescriptionColorActive, resolvedRowDescriptionColorInactive,
    config.rowDescriptionOpacityActive, config.rowDescriptionOpacityInactive,
    config.markerVisible, config.rowDescriptionVisible,
    config.ruleVisible, config.alignment,
    config.rowTitleOpacityActive, config.rowTitleOpacityInactive,
    config.hoverTitleOpacity, config.hoverMarkerOpacity, config.hoverDescriptionOpacity,
    config.rowAppendixEnabled, config.rowAppendixSeparator,
    config.rowAppendixFontFamily, config.rowAppendixFontSizeClassName,
    config.rowAppendixRevealDelayMs, config.rowAppendixOpacity,
    titleClassName, rowDescriptionClassName,
    config.markerIdleOpacity, config.markerActiveOpacity,
    config.markerGradientEnabled, gradientSlides, gradientPaletteStates,
    gradientMotion, gradientConfig,
    transitionDurationMs, transitionEasingCss, onSelect, handleKeyDown,
    handleRowPointerEnter, handleRowPointerLeave, panelId,
  ]);

  const markerSizePx = tailwindSpacingTokenToPx(config.markerSizeClassName.split(' ')[0], 24);
  const ruleWeightPx = RULE_WEIGHT_PX[config.ruleWeightClassName] ?? 1;
  const titleFontSizeRem = TITLE_FONT_SIZE_REM[config.rowTitleFontSizeClassName] ?? 0.875;

  // The indent side (left while alignment is 'left', right while 'right')
  // combines the structural marker-offset with the operator's own
  // configured padding on that same side, at every breakpoint tier — a
  // plain Tailwind class on that side would silently collide with
  // AboutTimeline.module.css's own structural padding rule on the same
  // property, so only the "extra" operator-configured amount is computed
  // here (per tier) and handed to the CSS module as custom properties;
  // AboutTimeline.module.css's own `.description[data-alignment]` media-
  // query rules own the actual combined calc() formula at each tier. The
  // opposite side has no structural offset at any tier, so it's applied as
  // a plain Tailwind class per tier alongside the other padding/margin
  // sides instead (see the <p>'s own className below).
  const descriptionIndentExtraPx = tailwindSpacingTokenToPx(
    config.alignment === 'right' ? config.descriptionPaddingRightClassName : config.descriptionPaddingLeftClassName,
    0,
  );
  const descriptionIndentExtraWidePx = tailwindSpacingTokenToPx(
    config.alignment === 'right' ? config.descriptionPaddingRightWideClassName : config.descriptionPaddingLeftWideClassName,
    0,
  );
  const descriptionIndentExtraLgPx = tailwindSpacingTokenToPx(
    config.alignment === 'right' ? config.descriptionPaddingRightLgClassName : config.descriptionPaddingLeftLgClassName,
    0,
  );

  return (
    <div
      className={[
        config.maxWidthClassName,
        config.paddingTopClassName, config.paddingRightClassName,
        config.paddingBottomClassName, config.paddingLeftClassName,
        config.paddingTopWideClassName, config.paddingRightWideClassName,
        config.paddingBottomWideClassName, config.paddingLeftWideClassName,
        config.paddingTopLgClassName, config.paddingRightLgClassName,
        config.paddingBottomLgClassName, config.paddingLeftLgClassName,
        config.marginTopClassName, config.marginRightClassName,
        config.marginBottomClassName, config.marginLeftClassName,
        config.marginTopWideClassName, config.marginRightWideClassName,
        config.marginBottomWideClassName, config.marginLeftWideClassName,
        config.marginTopLgClassName, config.marginRightLgClassName,
        config.marginBottomLgClassName, config.marginLeftLgClassName,
      ].join(' ')}
      style={{
        '--about-timeline-marker-size': `${markerSizePx}px`,
        '--about-timeline-rule-weight': `${ruleWeightPx}px`,
        '--about-timeline-title-line-height': `${titleFontSizeRem * 1.3}rem`,
      } as CSSProperties}
    >
      {description ? (
        <p
          className={[
            styles.description,
            config.descriptionPaddingTopClassName, config.descriptionPaddingBottomClassName,
            config.descriptionPaddingTopWideClassName, config.descriptionPaddingBottomWideClassName,
            config.descriptionPaddingTopLgClassName, config.descriptionPaddingBottomLgClassName,
            // The indent side (left or right, whichever matches
            // config.alignment) is applied via CSS custom properties +
            // AboutTimeline.module.css's own media-query rules instead, at
            // every tier — see the style prop below.
            config.alignment === 'right' ? config.descriptionPaddingLeftClassName : config.descriptionPaddingRightClassName,
            config.alignment === 'right'
              ? config.descriptionPaddingLeftWideClassName
              : config.descriptionPaddingRightWideClassName,
            config.alignment === 'right'
              ? config.descriptionPaddingLeftLgClassName
              : config.descriptionPaddingRightLgClassName,
            config.descriptionMarginTopClassName, config.descriptionMarginRightClassName,
            config.descriptionMarginBottomClassName, config.descriptionMarginLeftClassName,
            config.descriptionMarginTopWideClassName, config.descriptionMarginRightWideClassName,
            config.descriptionMarginBottomWideClassName, config.descriptionMarginLeftWideClassName,
            config.descriptionMarginTopLgClassName, config.descriptionMarginRightLgClassName,
            config.descriptionMarginBottomLgClassName, config.descriptionMarginLeftLgClassName,
            config.descriptionFontSizeClassName,
          ].join(' ')}
          data-alignment={config.alignment}
          style={{
            color: resolvedDescriptionColor,
            opacity: config.descriptionOpacity,
            '--about-timeline-description-indent-extra': `${descriptionIndentExtraPx}px`,
            '--about-timeline-description-indent-extra-wide': `${descriptionIndentExtraWidePx}px`,
            '--about-timeline-description-indent-extra-lg': `${descriptionIndentExtraLgPx}px`,
          } as CSSProperties}
        >
          {description}
        </p>
      ) : null}
      <ol
        role={config.maxActiveRows > 0 ? 'tablist' : 'list'}
        aria-orientation={config.maxActiveRows > 0 ? 'vertical' : undefined}
        aria-label="Career timeline"
        className={`${styles.list} ${config.rowGap}`}
        style={{
          '--about-timeline-row-gap-px': `${tailwindSpacingTokenToPx(config.rowGap, 40)}px`,
        } as CSSProperties}
      >
        {rowElements}
      </ol>
    </div>
  );
}
