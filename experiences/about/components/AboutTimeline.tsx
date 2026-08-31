import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { CTA_BUTTON_MOTION_EASINGS } from '../../../components/CtaButton/config/registered';
import { tailwindSpacingTokenToPx } from '../../../components/tailwindSpacingScale';
import { resolveContrastAwareTextColor } from '../../../helpers/surfaceColorDerivation';
import { AboutTimelineRow } from './AboutTimelineRow';
import type { AboutTimelineConfig } from './AboutTimeline.config';
import styles from './AboutTimeline.module.css';

export type AboutTimelineRowData = {
  caption: string;
  line: string;
  slideIndex: number;
};

// Rule weight's own catalog (AboutTimeline.config.ts's RULE_WEIGHT_OPTIONS)
// includes Tailwind's `w-px` keyword class (1px) alongside its numeric-scale
// siblings — `tailwindSpacingTokenToPx` only resolves the numeric scale (its
// own TAILWIND_SPACING_PX map has no 'px' entry), so this one small,
// three-value lookup stays local here rather than teaching that shared
// helper about a keyword class none of its other callers use.
const RULE_WEIGHT_PX: Record<string, number> = { 'w-px': 1, 'w-0.5': 2, 'w-1': 4 };

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
}: AboutTimelineProps) {
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);
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
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, index: number) => {
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
    config.rowTitleFontWeightClassName, config.rowTitleFontSizeClassName,
    config.rowTitlePaddingTopClassName, config.rowTitlePaddingRightClassName,
    config.rowTitlePaddingBottomClassName, config.rowTitlePaddingLeftClassName,
    config.rowTitleMarginTopClassName, config.rowTitleMarginRightClassName,
    config.rowTitleMarginBottomClassName, config.rowTitleMarginLeftClassName,
  ].join(' ');
  const rowDescriptionClassName = [
    config.rowDescriptionFontSizeClassName,
    config.rowDescriptionPaddingTopClassName, config.rowDescriptionPaddingRightClassName,
    config.rowDescriptionPaddingBottomClassName, config.rowDescriptionPaddingLeftClassName,
    config.rowDescriptionMarginTopClassName, config.rowDescriptionMarginRightClassName,
    config.rowDescriptionMarginBottomClassName, config.rowDescriptionMarginLeftClassName,
  ].join(' ');

  const rowElements = useMemo(() => rows.map((row, index) => {
    const selected = row.slideIndex === activeIndex;
    // Hover only ever touches the hovered row's own marker/title opacity —
    // every other row (and every other property of the hovered row itself:
    // color, description, marker fill) stays exactly whatever its real
    // selection state already made it, completely untouched by hover.
    const isHoveredRow = row.slideIndex === hoveredIndex;
    return (
      <AboutTimelineRow
        key={row.slideIndex}
        id={`${TAB_ID_PREFIX}-${row.slideIndex}`}
        panelId={panelId}
        caption={row.caption}
        line={row.line}
        active={selected}
        tabIndex={selected ? 0 : -1}
        markerColor={resolvedMarkerColor}
        titleColor={selected ? resolvedRowTitleColorActive : resolvedRowTitleColorInactive}
        descriptionColor={selected ? resolvedRowDescriptionColorActive : resolvedRowDescriptionColorInactive}
        descriptionOpacity={selected ? config.rowDescriptionOpacityActive : config.rowDescriptionOpacityInactive}
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
        onSelect={() => onSelect(row.slideIndex)}
        onKeyDown={keyboardEvent => handleKeyDown(keyboardEvent, index)}
        onPointerEnter={() => handleRowPointerEnter(row.slideIndex)}
        onPointerLeave={() => handleRowPointerLeave(row.slideIndex)}
        rowRef={element => { rowRefs.current[index] = element; }}
      />
    );
  }), [
    rows, activeIndex, resolvedMarkerColor, hoveredIndex,
    resolvedRowTitleColorActive, resolvedRowTitleColorInactive,
    resolvedRowDescriptionColorActive, resolvedRowDescriptionColorInactive,
    config.rowDescriptionOpacityActive, config.rowDescriptionOpacityInactive,
    config.ruleVisible, config.alignment,
    config.rowTitleOpacityActive, config.rowTitleOpacityInactive,
    config.hoverTitleOpacity, config.hoverMarkerOpacity,
    titleClassName, rowDescriptionClassName,
    config.markerIdleOpacity, config.markerActiveOpacity,
    transitionDurationMs, transitionEasingCss, onSelect, handleKeyDown,
    handleRowPointerEnter, handleRowPointerLeave, panelId,
  ]);

  const markerSizePx = tailwindSpacingTokenToPx(config.markerSizeClassName.split(' ')[0], 24);
  const ruleWeightPx = RULE_WEIGHT_PX[config.ruleWeightClassName] ?? 1;

  // The indent side (left while alignment is 'left', right while 'right')
  // combines the structural marker-offset with the operator's own
  // configured padding on that same side — a plain Tailwind class on that
  // side would silently collide with AboutTimeline.module.css's own
  // structural padding rule, so the combined value is computed here and
  // applied inline instead. The opposite side has no structural offset, so
  // it's applied as a plain Tailwind class alongside the other three
  // padding/margin sides (see the <p>'s own className below).
  const descriptionIndentPaddingPx = tailwindSpacingTokenToPx(
    config.alignment === 'right' ? config.descriptionPaddingRightClassName : config.descriptionPaddingLeftClassName,
    0,
  );
  const descriptionIndentStyle: CSSProperties = config.alignment === 'right'
    ? { paddingRight: `calc(var(--about-timeline-marker-size, 9px) + 0.9rem + ${descriptionIndentPaddingPx}px)` }
    : { paddingLeft: `calc(var(--about-timeline-marker-size, 9px) + 0.9rem + ${descriptionIndentPaddingPx}px)` };

  return (
    <div
      className={[
        config.paddingTopClassName, config.paddingRightClassName,
        config.paddingBottomClassName, config.paddingLeftClassName,
        config.marginTopClassName, config.marginRightClassName,
        config.marginBottomClassName, config.marginLeftClassName,
      ].join(' ')}
      style={{
        '--about-timeline-marker-size': `${markerSizePx}px`,
        '--about-timeline-rule-weight': `${ruleWeightPx}px`,
      } as CSSProperties}
    >
      {description ? (
        <p
          className={[
            styles.description,
            config.descriptionPaddingTopClassName, config.descriptionPaddingBottomClassName,
            // The indent side (left or right, whichever matches config.alignment)
            // is applied inline instead — see descriptionIndentStyle above.
            config.alignment === 'right' ? config.descriptionPaddingLeftClassName : config.descriptionPaddingRightClassName,
            config.descriptionMarginTopClassName, config.descriptionMarginRightClassName,
            config.descriptionMarginBottomClassName, config.descriptionMarginLeftClassName,
            config.descriptionFontSizeClassName,
          ].join(' ')}
          data-alignment={config.alignment}
          style={{
            color: resolvedDescriptionColor,
            opacity: config.descriptionOpacity,
            ...descriptionIndentStyle,
          }}
        >
          {description}
        </p>
      ) : null}
      <ol
        role="tablist"
        aria-orientation="vertical"
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
