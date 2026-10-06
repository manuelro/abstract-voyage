import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { CTA_BUTTON_MOTION_EASINGS, type CtaButtonMotionEasing } from '../../../components/CtaButton/config/registered';
import { tailwindSpacingTokenToPx } from '../../../components/tailwindSpacingScale';
import { resolveContrastAwareTextColor } from '../../../helpers/surfaceColorDerivation';
import { createCssEasingFunction } from '../../../helpers/cubicBezierEasing';
import { AboutTimelineRow } from './AboutTimelineRow';
import { LINE_HEIGHT_OPTIONS, type AboutTimelineConfig } from './AboutTimeline.config';
import styles from './AboutTimeline.module.css';
import type { DeckPaletteState } from '../../abstract/components/AbstractPostDock/components/GradientRenderer';
import type { SliderContentSlide } from '../../../helpers/postContent';
import type { LiquidSliderConfig } from '../../abstract/components/AbstractPostDock/config/legacy';
import type { useLiquidSliderMotion } from '../../abstract/components/AbstractPostDock/hooks/motion';
import { usePageCapabilityRuntime } from '../../shared/PageCapabilityRuntime';

export type AboutTimelineRowData = {
  caption: string;
  line?: string;
  /** Optional metadata appended inline to the title. Its meaning is owned by
   * the caller: category, date, duration, status, or another compact label. */
  appendix?: string;
  /** @deprecated Use `appendix`; retained for existing timeline data. */
  category?: string;
  slideIndex: number;
  /** Used by zero-selection timelines and explicit `navigationMode`
   * instances. Absent keeps the row a non-navigating control. */
  href?: string;
  /** Optional inline style forwarded verbatim onto this row's own `<li>`
   * wrapper (AboutTimelineRow) — e.g. a caller-driven enter/leave transform
   * transition. Absent (every existing caller) renders exactly as before;
   * this exists so a caller can animate an individual row's presence
   * without needing its own separate copy of this component's markup. */
  itemStyle?: CSSProperties;
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

// LINE_HEIGHT_OPTIONS's own `label` is literally the numeric multiplier as a
// string (AboutTimeline.config.ts) — reused here rather than a second,
// independently-maintained copy, so the marker's own vertical-centering math
// below always tracks whatever line-height an operator actually configures,
// not a value that was only ever correct while line-height was hardcoded.
const LINE_HEIGHT_MULTIPLIER: Record<string, number> = Object.fromEntries(
  // Production replaces panel-facing config exports with safe stand-ins.
  // This lookup is only a rendering fallback, so accept the catalog when it
  // is present and otherwise use the existing 1.3 fallback below.
  (Array.isArray(LINE_HEIGHT_OPTIONS) ? LINE_HEIGHT_OPTIONS : [])
    .map(option => [option.value, Number.parseFloat(option.label)]),
);

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
  /** PLAN-ABSTRACT-TYPOGRAPHY-COLOR-UNIFICATION.md Part C — when supplied,
   * used verbatim for every idle-state text color this component resolves
   * (row title/description while inactive, and the lead-in `description`
   * below), bypassing rowTitleMinContrastInactive/rowDescriptionMinContrast
   * Inactive/descriptionMinContrast entirely. Additive and page-scoped:
   * omitted, this component's existing independent contrast resolution is
   * byte-identical to before these props existed — /about's own usage is
   * untouched either way. */
  bodyColorOverride?: string;
  /** Same contract as bodyColorOverride above, for every active/hovered-state
   * text color (row title/description while active or hovered) — bypasses
   * rowTitleMinContrastActive/rowDescriptionMinContrastActive. Named
   * "highlight" (not "active") to match the shared role vocabulary this
   * color is drawn from — the same token AbstractEditorialHero's own
   * **word** emphasis and inline links use. */
  highlightColorOverride?: string;
  /** One resolved ink for every timeline pigment, including the marker.
   * AboutTimeline retains ownership of active/idle/hover opacity. */
  inkColorOverride?: string;
  /** Multiplies the timeline's own state opacities without replacing its
   * active/idle/hover/marker logic. 1 preserves the timeline config. */
  inkOpacityMultiplier?: number;
  /** Bypasses rowTitleMinContrastInactive/etc.'s own opacity siblings
   * (rowTitleOpacityInactive/rowDescriptionOpacityInactive) for idle rows —
   * paired with bodyColorOverride above (GlobalTypographyConfig's own
   * bodyOpacity), since AboutTimelineRow already applies color and opacity
   * as two separate style properties, not one alpha-blended color. */
  bodyOpacityOverride?: number;
  /** Same contract as bodyOpacityOverride above, for active/hovered rows —
   * bypasses rowTitleOpacityActive/hoverTitleOpacity/rowDescriptionOpacity
   * Active/hoverDescriptionOpacity (hover and active share one role/override,
   * same as the color pair above). */
  highlightOpacityOverride?: number;
  /** Opt-in row "chip" background for the idle/default state — omitted
   * (every existing caller): no background is ever painted, this component
   * renders exactly as it always has. Hover and active/selected share ONE
   * state (rowBackgroundColorActiveOverride below), the same convention
   * this component's own title/description colors already use
   * (`isHoveredRow || selected`). Passed straight through to
   * `AboutTimelineRow`'s own `backgroundColor` prop, per-row, resolved here
   * rather than in that shared component so this stays additive and
   * page-scoped like every other *Override prop above. */
  rowBackgroundColorOverride?: string;
  /** Same contract as rowBackgroundColorOverride above, for the hover/
   * active state. */
  rowBackgroundColorActiveOverride?: string;
  /** Plain lead-in text rendered above the rows, no heading semantics —
   * describes the timeline itself. Indented to start at the same x-position
   * a row's own caption text starts at (the marker/rule column's own
   * horizontal space is simply left empty above it, not filled with
   * anything) — see `AboutTimeline.module.css`'s own `.description` rule.
   * Omitted entirely when not supplied (no empty spacer left behind). */
  description?: string;
  descriptionWide?: string;
  descriptionLg?: string;
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
  /** Renders href-backed rows as ordinary navigation links while retaining
   * the timeline's visual active state. Every link remains a tab stop and
   * arrow keys move focus without activating a destination. */
  navigationMode?: boolean;
  ariaLabel?: string;
  /** Opt-in "windowed" row list — omitted/0 (every existing caller): the
   * list renders every row at its own natural height, unclipped, exactly as
   * today. A positive count instead caps the row list's own scrollable
   * height to exactly the combined height of that many rows (measured live
   * from the real, rendered `<li>` boxes — row heights vary with wrapped
   * captions, so this isn't a fixed estimate), with the remainder reachable
   * by scrolling. Snaps one row at a time (`scroll-snap-type`/`-align`,
   * AboutTimeline.module.css) so the list always rests showing exactly this
   * many whole rows, never a partial one. */
  scrollWindowVisibleCount?: number;
  /** Only meaningful alongside scrollWindowVisibleCount above — when the
   * active row changes (drag/swipe navigation on the paired CoverFlow just
   * as much as a click on the row itself) and that row now sits outside the
   * list's own visible window, the list smoothly scrolls it back into view
   * instead of leaving it clipped, hidden below/above the scrollable
   * viewport until the operator notices and scrolls manually. A real,
   * configurable-duration/easing tween (this codebase's own
   * createCssEasingFunction, the same primitive AboutTimelineRow.tsx's own
   * reveal animation uses) — not the browser's native `scrollIntoView`
   * smoothing, which has no duration/easing controls of its own. Already
   * fully visible: no scroll happens at all (checked against both the top
   * and bottom edge of the current scroll window), so clicking a row
   * that's already on screen never moves anything. 0 duration (or reduced
   * motion): jumps instantly instead of tweening. */
  scrollWindowActiveScrollDurationMs?: number;
  scrollWindowActiveScrollEasing?: CtaButtonMotionEasing;
  /** Holds the bring-into-view scroll above until this many ms after
   * activeIndex changes — the CoverFlow card's own settle glide (drag/swipe
   * navigation) keeps animating for a while after activeIndex itself
   * updates (that prop commits at release, not once the visual glide
   * finishes), so scrolling the list immediately reads as two independent
   * things moving on screen at once. 0 (default): scrolls immediately,
   * exactly as before this prop existed. */
  scrollWindowActiveScrollDelayMs?: number;
  /** Stretches this component's own root to fill its parent's height and
   * pushes the scrollWindowVisibleCount counter/arrows row (via
   * margin-top: auto) down to the bottom of that space, instead of the row
   * sitting directly under the row list wherever that list happens to end.
   * Opt-in (default false, today's plain in-flow layout, unaffected) — only
   * meaningful for a caller whose parent gives this component a real,
   * bounded height to fill (AbstractCoverFlowTimelineSlot.tsx's own
   * fixed-aspect-ratio figure); a caller with no such parent (About/Journal's
   * plain in-page placement) would just see this collapse back to the
   * in-flow position anyway, since `height: 100%` has no effect without a
   * sized ancestor — but only the coverflow-track figure opts in today. */
  fillContainerHeight?: boolean;
  /** Optional action rendered between the count and navigation arrows in
   * the Timeline toolbar. */
  toolbarLeadingAction?: ReactNode;
}

const TAB_ID_PREFIX = 'about-timeline-tab';

/**
 * CMP-01 (about-IA-timeline-copy-rework) — the career timeline used by the
 * desktop left column and the mobile pinned article section. A real ARIA
 * tablist (A11Y-01/02/03): rows sit in an
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
  bodyColorOverride,
  highlightColorOverride,
  inkColorOverride,
  inkOpacityMultiplier = 1,
  bodyOpacityOverride,
  highlightOpacityOverride,
  rowBackgroundColorOverride,
  rowBackgroundColorActiveOverride,
  description,
  descriptionWide,
  descriptionLg,
  config,
  prefersReducedMotion,
  panelId,
  gradientSlides,
  gradientPaletteStates,
  gradientMotion,
  gradientConfig,
  navigationMode = false,
  ariaLabel = 'Career timeline',
  scrollWindowVisibleCount = 0,
  scrollWindowActiveScrollDurationMs = 420,
  scrollWindowActiveScrollEasing = 'standard',
  scrollWindowActiveScrollDelayMs = 0,
  fillContainerHeight = false,
  toolbarLeadingAction,
}: AboutTimelineProps) {
  const { introStartAt } = usePageCapabilityRuntime();
  const rowRefs = useRef<Array<HTMLButtonElement | HTMLAnchorElement | null>>([]);
  const listRef = useRef<HTMLOListElement | null>(null);
  // scrollWindowVisibleCount own state: which row currently sits at the
  // list's own top edge (1-based, for the "N of N" counter) and whether
  // there's more to reach in either direction (for the up/down arrows' own
  // disabled state). Recomputed on scroll (rAF-throttled) and whenever the
  // window itself is re-measured (resize, row count/content change).
  const [scrollWindowTopRowNumber, setScrollWindowTopRowNumber] = useState(1);
  const [scrollWindowCanScrollUp, setScrollWindowCanScrollUp] = useState(false);
  const [scrollWindowCanScrollDown, setScrollWindowCanScrollDown] = useState(false);
  const scrollWindowFrameRef = useRef(0);
  const pendingTimelineNavigationRef = useRef<number | null>(null);

  const updateScrollWindowPosition = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const items = Array.from(list.children) as HTMLElement[];
    if (items.length === 0) return;
    const scrollTop = list.scrollTop;
    let topIndex = 0;
    for (let index = 0; index < items.length; index += 1) {
      if (items[index].offsetTop <= scrollTop + 1) topIndex = index;
      else break;
    }
    setScrollWindowTopRowNumber(topIndex + 1);
    setScrollWindowCanScrollUp(scrollTop > 1);
    setScrollWindowCanScrollDown(scrollTop < list.scrollHeight - list.clientHeight - 1);
  }, []);

  // Shared smooth-scroll primitive — the active-row bring-into-view effect
  // and the up/down arrow buttons below both animate the exact same way
  // (this codebase's own createCssEasingFunction tween, snap suspended for
  // its duration — see that effect's own doc comment for why), so there is
  // only ever one scroll feel for this list, never two independently-tuned
  // ones.
  const scrollListTo = useCallback((target: number) => {
    const list = listRef.current;
    if (!list) return;
    const from = list.scrollTop;
    const distance = target - from;
    if (Math.abs(distance) < 1) return;

    const durationMs = prefersReducedMotion ? 0 : scrollWindowActiveScrollDurationMs;
    if (durationMs <= 0) {
      list.scrollTop = target;
      updateScrollWindowPosition();
      return;
    }

    const previousScrollSnapType = list.style.scrollSnapType;
    list.style.scrollSnapType = 'none';
    const ease = createCssEasingFunction(CTA_BUTTON_MOTION_EASINGS[scrollWindowActiveScrollEasing]);
    let startTimestamp = 0;
    const step = (now: number) => {
      if (!startTimestamp) startTimestamp = now;
      const progress = Math.min(1, (now - startTimestamp) / durationMs);
      list.scrollTop = from + distance * ease(progress);
      updateScrollWindowPosition();
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        list.style.scrollSnapType = previousScrollSnapType;
      }
    };
    window.requestAnimationFrame(step);
  }, [
    prefersReducedMotion, scrollWindowActiveScrollDurationMs, scrollWindowActiveScrollEasing,
    updateScrollWindowPosition,
  ]);

  // Up/down arrow controls — step exactly one row at a time (the row
  // currently crossing the relevant edge), respecting each row's own real
  // height rather than assuming a fixed one, same principle the windowing
  // measurement above already follows.
  const scrollListByOneRow = useCallback((direction: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    const items = Array.from(list.children) as HTMLElement[];
    const scrollTop = list.scrollTop;
    let target: number | undefined;
    if (direction > 0) {
      target = items.find(item => item.offsetTop > scrollTop + 1)?.offsetTop;
    } else {
      for (let index = items.length - 1; index >= 0; index -= 1) {
        if (items[index].offsetTop < scrollTop - 1) {
          target = items[index].offsetTop;
          break;
        }
      }
    }
    if (target === undefined) return;
    scrollListTo(target);
  }, [scrollListTo]);

  const navigateTimelineByOneRow = useCallback((direction: 1 | -1) => {
    const currentRowIndex = rows.findIndex(row => row.slideIndex === activeIndex);
    if (currentRowIndex === -1) return;
    const nextRow = rows[currentRowIndex + direction];
    if (!nextRow) return;

    const list = listRef.current;
    const target = list?.children[currentRowIndex + direction] as HTMLElement | undefined;
    if (!list || !target || scrollWindowVisibleCount <= 0) {
      onSelect(nextRow.slideIndex);
      return;
    }
    const viewTop = list.scrollTop;
    const viewBottom = viewTop + list.clientHeight;
    const targetTop = target.offsetTop;
    const targetBottom = targetTop + target.offsetHeight;
    const scrollTarget = targetTop < viewTop
      ? targetTop
      : targetBottom > viewBottom
        ? targetBottom - list.clientHeight
        : null;
    if (scrollTarget === null) {
      onSelect(nextRow.slideIndex);
      return;
    }

    // Do not let CoverFlow leave the currently visible list item until the
    // next item has physically arrived in this list's window. The same
    // scroll primitive/curve is used for active-row restoration, so the
    // hand-off remains one coherent motion rather than two competing jumps.
    scrollListTo(scrollTarget);
    if (pendingTimelineNavigationRef.current !== null) {
      window.clearTimeout(pendingTimelineNavigationRef.current);
    }
    const waitMs = prefersReducedMotion ? 0 : scrollWindowActiveScrollDurationMs;
    pendingTimelineNavigationRef.current = window.setTimeout(() => {
      pendingTimelineNavigationRef.current = null;
      onSelect(nextRow.slideIndex);
    }, waitMs);
  }, [
    activeIndex, onSelect, prefersReducedMotion, rows, scrollListTo,
    scrollWindowActiveScrollDurationMs, scrollWindowVisibleCount,
  ]);

  useEffect(() => () => {
    if (pendingTimelineNavigationRef.current !== null) {
      window.clearTimeout(pendingTimelineNavigationRef.current);
    }
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list || scrollWindowVisibleCount <= 0) return undefined;
    const onScroll = () => {
      if (scrollWindowFrameRef.current) return;
      scrollWindowFrameRef.current = window.requestAnimationFrame(() => {
        scrollWindowFrameRef.current = 0;
        updateScrollWindowPosition();
      });
    };
    list.addEventListener('scroll', onScroll, { passive: true });
    return () => list.removeEventListener('scroll', onScroll);
  }, [scrollWindowVisibleCount, updateScrollWindowPosition]);

  const transitionEasingCss = CTA_BUTTON_MOTION_EASINGS[config.transitionEasing];
  const transitionDurationMs = prefersReducedMotion ? 0 : config.transitionDurationMs;
  const timelineIntroActive = config.introEnabled
    && introStartAt !== undefined
    && !prefersReducedMotion;
  const [timelineIntroVisible, setTimelineIntroVisible] = useState(!timelineIntroActive);
  useEffect(() => {
    if (!timelineIntroActive || introStartAt === null) {
      setTimelineIntroVisible(!timelineIntroActive);
      return;
    }
    // Changing an introduction setting deliberately replays the timeline in
    // place, matching the nav/hero authoring experience. No rows remount and
    // no geometry changes, so keyboard order and the active selection stay
    // stable while an author tunes the cadence.
    setTimelineIntroVisible(false);
    const timeout = window.setTimeout(() => setTimelineIntroVisible(true), config.introDelayMs);
    return () => window.clearTimeout(timeout);
  }, [
    timelineIntroActive,
    introStartAt,
    config.introDelayMs,
    config.introDurationMs,
    config.introEasing,
    config.introItemStaggerMs,
    config.introItemOverlapMs,
    rows.length,
  ]);
  const scaleInkOpacity = (opacity: number) => (
    Math.min(1, Math.max(0, opacity * inkOpacityMultiplier))
  );

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
    () => inkColorOverride
      ?? highlightColorOverride
      ?? resolveContrastAwareTextColor(columnBackgroundColor, config.rowTitleMinContrastActive, 0),
    [columnBackgroundColor, config.rowTitleMinContrastActive, highlightColorOverride, inkColorOverride],
  );
  const resolvedRowTitleColorInactive = useMemo(
    () => inkColorOverride
      ?? bodyColorOverride
      ?? resolveContrastAwareTextColor(columnBackgroundColor, config.rowTitleMinContrastInactive, 0),
    [columnBackgroundColor, config.rowTitleMinContrastInactive, bodyColorOverride, inkColorOverride],
  );
  const resolvedRowDescriptionColorActive = useMemo(
    () => inkColorOverride
      ?? highlightColorOverride
      ?? resolveContrastAwareTextColor(columnBackgroundColor, config.rowDescriptionMinContrastActive, 0),
    [columnBackgroundColor, config.rowDescriptionMinContrastActive, highlightColorOverride, inkColorOverride],
  );
  const resolvedRowDescriptionColorInactive = useMemo(
    () => inkColorOverride
      ?? bodyColorOverride
      ?? resolveContrastAwareTextColor(columnBackgroundColor, config.rowDescriptionMinContrastInactive, 0),
    [columnBackgroundColor, config.rowDescriptionMinContrastInactive, bodyColorOverride, inkColorOverride],
  );
  // 'text' mode matches the row title's own ACTIVE color specifically — the
  // marker's own fill state already means "this row is active," so it reads
  // as one ink with the row's own most-prominent text in that same state.
  // inkColorOverride only ever wins for 'accent' mode (the config's own
  // zero-opinion default) — 'custom'/'text' are an operator's explicit,
  // deliberate choice made right here in the panel (see markerColorMode's
  // own MARKER COLOR SOURCE control) and must render exactly that choice,
  // not be silently discarded. Before this, inkColorOverride short-circuited
  // ALL THREE modes unconditionally, so any page wiring that prop (e.g.
  // journal.tsx's own scroll-gradient-adaptive ink) made Custom/Text
  // indistinguishable from Accent — confirmed live, operator-reported,
  // 2026-09-23: picking Custom + a bright red swatch left the marker
  // unchanged. 'text' still naturally lands on the same ink inkColorOverride
  // would have supplied (resolvedRowTitleColorActive is itself already
  // inkColorOverride-driven above), so a page wanting that original
  // single-ink-everywhere behavior gets it by explicitly setting
  // markerColorMode: 'text' rather than having it forced unconditionally.
  const resolvedMarkerColor = config.markerColorMode === 'custom'
    ? config.markerCustomColor
    : config.markerColorMode === 'text'
      ? resolvedRowTitleColorActive
      : (inkColorOverride ?? accentColor);
  const resolvedDescriptionColor = useMemo(
    () => inkColorOverride
      ?? bodyColorOverride
      ?? resolveContrastAwareTextColor(columnBackgroundColor, config.descriptionMinContrast, 0),
    [columnBackgroundColor, config.descriptionMinContrast, bodyColorOverride, inkColorOverride],
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
    if (!navigationMode) onSelect(rows[nextIndex].slideIndex);
    focusRow(nextIndex);
  }, [rows, onSelect, focusRow, navigationMode]);

  // Computed here (rather than alongside ruleWeightPx/titleFontSizeRem
  // further down) so it's available as an AboutTimelineRow prop inside the
  // rowElements useMemo below — AboutBulletMarker (AboutTimelineRow.tsx's
  // own marker, since PLAN-ABOUT-MOBILE-ACCORDION-OPEN-INDICATOR.md's
  // extraction) takes a resolved px number rather than reading an inherited
  // CSS custom property.
  const markerSizePx = tailwindSpacingTokenToPx(config.markerSizeClassName.split(' ')[0], 24);

  // Split out of the shared box below so each row can swap in its own
  // active/idle weight (rowTitleFontWeightClassName/-Active) — the same
  // per-row branch resolvedRowTitleColorActive/-Inactive already uses,
  // rather than the box's own once-computed, identical-for-every-row string.
  const titleBoxClassName = [
    config.rowTitleFontFamily, config.rowTitleFontFamilyWide, config.rowTitleFontFamilyLg,
    config.rowTitleFontSizeClassName, config.rowTitleFontSizeWideClassName, config.rowTitleFontSizeLgClassName,
    config.rowTitleLineHeightClassName, config.rowTitleLineHeightWideClassName, config.rowTitleLineHeightLgClassName,
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
  const titleClassNameInactive = [
    config.rowTitleFontWeightClassName, config.rowTitleFontWeightWideClassName, config.rowTitleFontWeightLgClassName,
    titleBoxClassName,
  ].join(' ');
  const titleClassNameActive = [
    config.rowTitleFontWeightClassNameActive, config.rowTitleFontWeightActiveWideClassName,
    config.rowTitleFontWeightActiveLgClassName, titleBoxClassName,
  ].join(' ');
  const rowDescriptionClassName = [
    config.rowDescriptionFontFamily, config.rowDescriptionFontFamilyWide, config.rowDescriptionFontFamilyLg,
    config.rowDescriptionFontSizeClassName, config.rowDescriptionFontSizeWideClassName,
    config.rowDescriptionFontSizeLgClassName,
    config.rowDescriptionLineHeightClassName, config.rowDescriptionLineHeightWideClassName,
    config.rowDescriptionLineHeightLgClassName,
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
    const selectionEnabled = !navigationMode && config.maxActiveRows > 0;
    const selected = (navigationMode || selectionEnabled) && row.slideIndex === activeIndex;
    const isHoveredRow = row.slideIndex === hoveredIndex;
    // The row gap is measured after the preceding fade; overlap pulls the
    // next start back into that fade. Clamp so an over-large overlap can
    // start rows together but never creates a negative CSS delay.
    const introStepMs = Math.max(
      0,
      config.introDurationMs + config.introItemStaggerMs - config.introItemOverlapMs,
    );
    const introStyle: CSSProperties | undefined = timelineIntroActive ? {
      opacity: timelineIntroVisible ? 1 : 0,
      transition: timelineIntroVisible
        ? `opacity ${config.introDurationMs}ms ${CTA_BUTTON_MOTION_EASINGS[config.introEasing]} ${index * introStepMs}ms`
        : 'none',
    } : undefined;
    return (
      <AboutTimelineRow
        key={row.slideIndex}
        id={`${TAB_ID_PREFIX}-${row.slideIndex}`}
        panelId={panelId}
        caption={row.caption}
        line={row.line}
        appendix={config.rowAppendixEnabled ? (row.appendix ?? row.category) : undefined}
        appendixSeparator={config.rowAppendixSeparator}
        appendixClassName={[
          config.rowAppendixFontFamily, config.rowAppendixFontWeightClassName,
          config.rowAppendixFontSizeClassName, config.rowAppendixFontSizeWideClassName,
          config.rowAppendixFontSizeLgClassName,
          config.rowAppendixPaddingTopClassName, config.rowAppendixPaddingRightClassName,
          config.rowAppendixPaddingBottomClassName, config.rowAppendixPaddingLeftClassName,
        ].join(' ')}
        appendixVisible={isHoveredRow}
        appendixForceVisible={config.rowAppendixForceVisible}
        appendixForceVisibleWide={config.rowAppendixForceVisibleWide}
        appendixForceVisibleLg={config.rowAppendixForceVisibleLg}
        appendixForceLineBreak={config.rowAppendixForceLineBreak}
        appendixForceLineBreakWide={config.rowAppendixForceLineBreakWide}
        appendixForceLineBreakLg={config.rowAppendixForceLineBreakLg}
        appendixOpacity={config.rowAppendixOpacity}
        active={selected}
        selectionEnabled={selectionEnabled}
        tabIndex={selectionEnabled ? (selected ? 0 : -1) : 0}
        href={row.href}
        markerColor={resolvedMarkerColor}
        markerSizePx={markerSizePx}
        markerShape={config.markerShape}
        backgroundColor={isHoveredRow || selected
          ? rowBackgroundColorActiveOverride
          : rowBackgroundColorOverride}
        titleColor={isHoveredRow || selected ? resolvedRowTitleColorActive : resolvedRowTitleColorInactive}
        descriptionColor={isHoveredRow || selected ? resolvedRowDescriptionColorActive : resolvedRowDescriptionColorInactive}
        descriptionOpacity={isHoveredRow
          ? scaleInkOpacity(highlightOpacityOverride ?? config.hoverDescriptionOpacity)
          : (selected
            ? scaleInkOpacity(highlightOpacityOverride ?? config.rowDescriptionOpacityActive)
            : scaleInkOpacity(bodyOpacityOverride ?? config.rowDescriptionOpacityInactive))}
        markerVisible={config.markerVisible}
        descriptionVisible={config.rowDescriptionVisible}
        ruleVisible={config.ruleVisible}
        alignment={config.alignment}
        alignmentWide={config.alignmentWide}
        alignmentLg={config.alignmentLg}
        titleOpacity={isHoveredRow
          ? scaleInkOpacity(highlightOpacityOverride ?? config.hoverTitleOpacity)
          : (selected
            ? scaleInkOpacity(highlightOpacityOverride ?? config.rowTitleOpacityActive)
            : scaleInkOpacity(bodyOpacityOverride ?? config.rowTitleOpacityInactive))}
        markerOpacity={isHoveredRow
          ? scaleInkOpacity(config.hoverMarkerOpacity)
          : scaleInkOpacity(selected ? config.markerActiveOpacity : config.markerIdleOpacity)}
        titleClassName={isHoveredRow || selected ? titleClassNameActive : titleClassNameInactive}
        descriptionClassName={rowDescriptionClassName}
        transitionDurationMs={transitionDurationMs}
        transitionEasingCss={transitionEasingCss}
        appendixRevealDelayMs={prefersReducedMotion ? 0 : config.rowAppendixRevealDelayMs}
        onSelect={() => onSelect(row.slideIndex)}
        onKeyDown={keyboardEvent => handleKeyDown(keyboardEvent, index)}
        onPointerEnter={() => handleRowPointerEnter(row.slideIndex)}
        onPointerLeave={() => handleRowPointerLeave(row.slideIndex)}
        rowRef={element => { rowRefs.current[index] = element; }}
        // The page intro is a fallback. Callers such as the mobile expanded
        // list explicitly animate row entry/exit through itemStyle; those
        // opacity and transition values must win after the intro has begun.
        itemStyle={introStyle ? { ...introStyle, ...row.itemStyle } : row.itemStyle}
        gradientEnabled={config.markerGradientEnabled}
        gradientSlide={gradientSlides?.[row.slideIndex]}
        gradientPalette={gradientPaletteStates?.[row.slideIndex]}
        gradientMotion={gradientMotion}
        gradientConfig={gradientConfig}
      />
    );
  }), [
    rows, activeIndex, resolvedMarkerColor, markerSizePx, hoveredIndex, config.maxActiveRows,
    resolvedRowTitleColorActive, resolvedRowTitleColorInactive,
    resolvedRowDescriptionColorActive, resolvedRowDescriptionColorInactive,
    config.rowDescriptionOpacityActive, config.rowDescriptionOpacityInactive,
    config.markerVisible, config.markerShape, config.rowDescriptionVisible,
    config.ruleVisible, config.alignment, config.alignmentWide, config.alignmentLg,
    config.rowTitleOpacityActive, config.rowTitleOpacityInactive,
    config.hoverTitleOpacity, config.hoverMarkerOpacity, config.hoverDescriptionOpacity,
    bodyOpacityOverride, highlightOpacityOverride,
    rowBackgroundColorOverride, rowBackgroundColorActiveOverride,
    inkColorOverride,
    inkOpacityMultiplier,
    config.rowAppendixEnabled, config.rowAppendixSeparator,
    config.rowAppendixForceVisible, config.rowAppendixForceVisibleWide, config.rowAppendixForceVisibleLg,
    config.rowAppendixForceLineBreak, config.rowAppendixForceLineBreakWide, config.rowAppendixForceLineBreakLg,
    config.rowAppendixFontFamily, config.rowAppendixFontWeightClassName,
    config.rowAppendixFontSizeClassName, config.rowAppendixFontSizeWideClassName,
    config.rowAppendixFontSizeLgClassName,
    config.rowAppendixPaddingTopClassName, config.rowAppendixPaddingRightClassName,
    config.rowAppendixPaddingBottomClassName, config.rowAppendixPaddingLeftClassName,
    config.rowAppendixRevealDelayMs, config.rowAppendixOpacity,
    titleClassNameActive, titleClassNameInactive, rowDescriptionClassName,
    config.markerIdleOpacity, config.markerActiveOpacity,
    config.markerGradientEnabled, gradientSlides, gradientPaletteStates,
    gradientMotion, gradientConfig,
    transitionDurationMs, transitionEasingCss, onSelect, handleKeyDown,
    handleRowPointerEnter, handleRowPointerLeave, panelId, navigationMode,
    timelineIntroActive, timelineIntroVisible, config.introDurationMs,
    config.introEasing, config.introItemStaggerMs, config.introItemOverlapMs,
  ]);

  const ruleWeightPx = RULE_WEIGHT_PX[config.ruleWeightClassName] ?? 1;
  const titleFontSizeRem = TITLE_FONT_SIZE_REM[config.rowTitleFontSizeClassName] ?? 0.875;
  const titleLineHeightMultiplier = LINE_HEIGHT_MULTIPLIER[config.rowTitleLineHeightClassName] ?? 1.3;

  // The indent side (left while each tier's alignment is 'left', right
  // while it is 'right') combines the structural marker-offset with the
  // operator's own configured padding on that same side per tier — a
  // plain Tailwind class on that side would silently collide with
  // AboutTimeline.module.css's own structural padding rule on the same
  // property, so only the "extra" operator-configured amount is computed
  // here (per tier) and handed to the CSS module as custom properties;
  // AboutTimeline.module.css's own `.description[data-alignment]` media-
  // query rules own the actual combined calc() formula at each tier. The
  // opposite side has no structural offset at any tier, so it's applied as
  // a plain Tailwind class per tier alongside the other padding/margin
  // sides instead (see the <p>'s own className below).
  // config.descriptionIndentMatchesMarkerLane === false cancels the marker-
  // size term the CSS module's own `.description[data-alignment='left']`
  // rule always adds (this component's own doc comment on that config field
  // explains why a consumer would want that) by subtracting it back out of
  // the "extra" custom property the calc() formula also adds it to — the
  // formula itself stays the same at every tier, only ever fed a negative
  // offset instead of a new conditional rule. Only meaningful while that
  // tier's own alignment is 'left': the marker-size term never applies to
  // 'right' in the first place (see the doc comment above), so there is
  // nothing to cancel there.
  const markerLaneCancelPx = config.descriptionIndentMatchesMarkerLane ? 0 : markerSizePx;
  const descriptionIndentExtraPx = tailwindSpacingTokenToPx(
    config.alignment === 'right' ? config.descriptionPaddingRightClassName : config.descriptionPaddingLeftClassName,
    0,
  ) - (config.alignment === 'left' ? markerLaneCancelPx : 0);
  const descriptionIndentExtraWidePx = tailwindSpacingTokenToPx(
    config.alignmentWide === 'right' ? config.descriptionPaddingRightWideClassName : config.descriptionPaddingLeftWideClassName,
    0,
  ) - (config.alignmentWide === 'left' ? markerLaneCancelPx : 0);
  const descriptionIndentExtraLgPx = tailwindSpacingTokenToPx(
    config.alignmentLg === 'right' ? config.descriptionPaddingRightLgClassName : config.descriptionPaddingLeftLgClassName,
    0,
  ) - (config.alignmentLg === 'left' ? markerLaneCancelPx : 0);

  const descriptionByBreakpoint = {
    mobile: description ?? config.description,
    tablet: descriptionWide ?? config.descriptionWide,
    desktop: descriptionLg ?? config.descriptionLg,
  };
  const sharedDescription = descriptionByBreakpoint.mobile === descriptionByBreakpoint.tablet
    && descriptionByBreakpoint.mobile === descriptionByBreakpoint.desktop
    ? descriptionByBreakpoint.mobile
    : null;

  // scrollWindowVisibleCount (own doc comment above) — measures the real,
  // rendered first N `<li>` boxes (including the row-gap between them) and
  // caps the list to exactly that height, rather than assuming a fixed
  // per-row height: captions wrap to a different number of lines depending
  // on their own text and the column's current width, so any fixed estimate
  // would either clip a short row's own descender or leave visible slack
  // under a row shorter than the estimate. Re-measures on resize (a column
  // width change can reflow captions onto a different number of lines,
  // changing every row's own height) and whenever the row count/order
  // changes. 0 (default): no listener attached, no inline height/overflow
  // ever set — byte-identical to every caller before this prop existed.
  useEffect(() => {
    const list = listRef.current;
    if (!list || scrollWindowVisibleCount <= 0) return undefined;

    const applyWindow = () => {
      const items = Array.from(list.children).slice(0, scrollWindowVisibleCount) as HTMLElement[];
      if (items.length === 0) return;
      // fillContainerHeight (AbstractCoverFlowTimelineSlot's own fixed-height
      // figure) — the list fills all remaining vertical space between the
      // description and the toolbar via flex:1 (set inline on the <ol> below),
      // so the N-row height cap must NOT also apply here: capping to N rows'
      // height would leave the list short of the toolbar, reintroducing the
      // very gap this mode exists to close. The list still scrolls (overflowY)
      // and snaps exactly as the capped mode does; only where its own height
      // comes from differs (the flex parent vs. a measured N-row max-height).
      if (!fillContainerHeight) {
        const last = items[items.length - 1];
        const windowHeight = last.offsetTop + last.offsetHeight - items[0].offsetTop;
        list.style.maxHeight = `${windowHeight}px`;
      } else {
        list.style.maxHeight = '';
      }
      list.style.overflowY = 'auto';
      list.style.scrollSnapType = 'y mandatory';
      updateScrollWindowPosition();
    };

    applyWindow();
    const observer = new ResizeObserver(applyWindow);
    observer.observe(list);
    Array.from(list.children).forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, [scrollWindowVisibleCount, rows.length, config.rowGap, fillContainerHeight, updateScrollWindowPosition]);

  // scrollWindowActiveScrollDurationMs/-Easing/-DelayMs (own doc comments
  // above) — brings the newly-active row back into the visible window
  // whenever it falls outside it, on ANY activeIndex change (drag/swipe
  // navigation on a paired CoverFlow just as much as a click on the row
  // itself). Checks both edges independently (nearest-edge scroll, not
  // "always pin to the top") so a row that's already visible — e.g. the
  // second row landing active while it's already the second VISIBLE row —
  // is left completely alone: no scroll happens at all. The delay (and the
  // re-measurement inside it, not before it) means this only ever fires
  // once the CoverFlow's own settle glide has actually finished, not
  // whatever was true the instant activeIndex itself changed.
  useEffect(() => {
    if (scrollWindowVisibleCount <= 0) return undefined;
    const delayMs = prefersReducedMotion ? 0 : scrollWindowActiveScrollDelayMs;

    const bringActiveIntoView = () => {
      const list = listRef.current;
      if (!list) return;
      const activeRowIndex = rows.findIndex(row => row.slideIndex === activeIndex);
      if (activeRowIndex === -1) return;
      const activeElement = list.children[activeRowIndex] as HTMLElement | undefined;
      if (!activeElement) return;

      const viewTop = list.scrollTop;
      const viewBottom = viewTop + list.clientHeight;
      const rowTop = activeElement.offsetTop;
      const rowBottom = rowTop + activeElement.offsetHeight;

      const target = rowTop < viewTop
        ? rowTop
        : rowBottom > viewBottom
          ? rowBottom - list.clientHeight
          : null;
      if (target === null) return;
      scrollListTo(target);
    };

    if (delayMs <= 0) {
      bringActiveIntoView();
      return undefined;
    }
    const timer = window.setTimeout(bringActiveIntoView, delayMs);
    return () => window.clearTimeout(timer);
  }, [
    activeIndex, scrollWindowVisibleCount, scrollWindowActiveScrollDelayMs,
    rows, prefersReducedMotion, scrollListTo,
  ]);

  // Windowed-list affordances are independently opt-in per responsive tier.
  // Render one bounded-range control row per tier so a tablet choice never
  // cascades into desktop (or vice versa); CSS owns which one is exposed.
  const renderScrollWindowControls = (
    tier: 'mobile' | 'tablet' | 'desktop',
    position: 'top' | 'bottom',
  ) => {
    const tierConfig = tier === 'mobile'
      ? {
        counterEnabled: config.scrollWindowCounterEnabled,
        arrowsEnabled: config.scrollWindowArrowsEnabled,
        arrowsNavigateTimeline: config.scrollWindowArrowsNavigateTimeline,
        arrowsNavigateEntireList: config.scrollWindowArrowsNavigateEntireList,
        position: config.scrollWindowControlsPosition,
        className: styles.scrollWindowControlsMobile,
      }
      : tier === 'tablet'
        ? {
          counterEnabled: config.scrollWindowCounterEnabledWide,
          arrowsEnabled: config.scrollWindowArrowsEnabledWide,
          arrowsNavigateTimeline: config.scrollWindowArrowsNavigateTimelineWide,
          arrowsNavigateEntireList: config.scrollWindowArrowsNavigateEntireListWide,
          position: config.scrollWindowControlsPositionWide,
          className: styles.scrollWindowControlsTablet,
        }
        : {
          counterEnabled: config.scrollWindowCounterEnabledLg,
          arrowsEnabled: config.scrollWindowArrowsEnabledLg,
          arrowsNavigateTimeline: config.scrollWindowArrowsNavigateTimelineLg,
          arrowsNavigateEntireList: config.scrollWindowArrowsNavigateEntireListLg,
          position: config.scrollWindowControlsPositionLg,
          className: styles.scrollWindowControlsDesktop,
        };
    if (
      scrollWindowVisibleCount <= 0
      || tierConfig.position !== position
      || (!tierConfig.counterEnabled && !tierConfig.arrowsEnabled)
    ) return null;
    const activeRowIndex = rows.findIndex(row => row.slideIndex === activeIndex);
    const canNavigatePrevious = activeRowIndex > 0;
    const canNavigateNext = activeRowIndex >= 0 && activeRowIndex < rows.length - 1;
    const previousDisabled = tierConfig.arrowsNavigateTimeline
      ? !canNavigatePrevious
      : !scrollWindowCanScrollUp;
    const nextDisabled = tierConfig.arrowsNavigateTimeline
      ? !canNavigateNext
      : !scrollWindowCanScrollDown;
    const activeItemNumber = activeRowIndex >= 0 ? activeRowIndex + 1 : 1;
    return (
      <div
        key={`${tier}-${position}`}
        className={`${styles.scrollWindowControls} ${tierConfig.className} ${config.toolbarPaddingTopClassName} ${config.toolbarPaddingRightClassName} ${config.toolbarPaddingBottomClassName} ${config.toolbarPaddingLeftClassName} ${config.toolbarPaddingTopWideClassName} ${config.toolbarPaddingRightWideClassName} ${config.toolbarPaddingBottomWideClassName} ${config.toolbarPaddingLeftWideClassName} ${config.toolbarPaddingTopLgClassName} ${config.toolbarPaddingRightLgClassName} ${config.toolbarPaddingBottomLgClassName} ${config.toolbarPaddingLeftLgClassName}`}
        data-position={position}
        style={{
          // Same resolved ink the timeline's own lead-in description text
          // uses, so the counter text and the arrow buttons' `currentColor`
          // border (AboutTimeline.module.css's own .scrollWindowArrowButton)
          // both read as the same tint as the timeline's own text rather
          // than an unrelated inherited/default color.
          color: resolvedDescriptionColor,
          ...(position === 'bottom' && fillContainerHeight ? { marginTop: 'auto' } : null),
        }}
      >
        {tierConfig.counterEnabled ? (
          <span className={styles.scrollWindowCounter}>
            {tierConfig.arrowsNavigateEntireList ? activeItemNumber : scrollWindowTopRowNumber} of {rows.length}
          </span>
        ) : null}
        {toolbarLeadingAction ? (
          <div className={`${styles.scrollWindowLeadingAction} ${config.toolbarActionFontSizeClassName} ${config.toolbarActionFontSizeWideClassName} ${config.toolbarActionFontSizeLgClassName}`}>{toolbarLeadingAction}</div>
        ) : null}
        {tierConfig.arrowsEnabled ? (
          <div className={styles.scrollWindowArrows}>
            <button
              type="button"
              className={styles.scrollWindowArrowButton}
              onClick={() => (tierConfig.arrowsNavigateTimeline ? navigateTimelineByOneRow(-1) : scrollListByOneRow(-1))}
              disabled={previousDisabled}
              aria-label={tierConfig.arrowsNavigateTimeline ? 'Show previous article' : 'Scroll timeline list up'}
            >
              <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
                <path d="M2 10.5 L8 4.5 L14 10.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.scrollWindowArrowButton}
              onClick={() => (tierConfig.arrowsNavigateTimeline ? navigateTimelineByOneRow(1) : scrollListByOneRow(1))}
              disabled={nextDisabled}
              aria-label={tierConfig.arrowsNavigateTimeline ? 'Show next article' : 'Scroll timeline list down'}
            >
              <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
                <path d="M2 5.5 L8 11.5 L14 5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div
      className={[
        config.maxWidthClassName, config.maxWidthWideClassName, config.maxWidthLgClassName,
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
        '--about-timeline-title-line-height': `${titleFontSizeRem * titleLineHeightMultiplier}rem`,
        ...(fillContainerHeight ? { height: '100%', display: 'flex', flexDirection: 'column' } : null),
      } as CSSProperties}
    >
      {/* Top controls deliberately lead the component: they sit inside this
          padded root, before the optional description and row list. */}
      {renderScrollWindowControls('mobile', 'top')}
      {renderScrollWindowControls('tablet', 'top')}
      {renderScrollWindowControls('desktop', 'top')}
      {config.descriptionVisible
        && (descriptionByBreakpoint.mobile || descriptionByBreakpoint.tablet || descriptionByBreakpoint.desktop) ? (
        <p
          className={[
            styles.description,
            config.descriptionPaddingTopClassName, config.descriptionPaddingBottomClassName,
            config.descriptionPaddingTopWideClassName, config.descriptionPaddingBottomWideClassName,
            config.descriptionPaddingTopLgClassName, config.descriptionPaddingBottomLgClassName,
            // The indent side (left or right, whichever matches
            // that tier's alignment) is applied via CSS custom properties +
            // AboutTimeline.module.css's own media-query rules instead, at
            // every tier — see the style prop below.
            config.alignment === 'right' ? config.descriptionPaddingLeftClassName : config.descriptionPaddingRightClassName,
            config.alignmentWide === 'right'
              ? config.descriptionPaddingLeftWideClassName
              : config.descriptionPaddingRightWideClassName,
            config.alignmentLg === 'right'
              ? config.descriptionPaddingLeftLgClassName
              : config.descriptionPaddingRightLgClassName,
            config.descriptionMarginTopClassName, config.descriptionMarginRightClassName,
            config.descriptionMarginBottomClassName, config.descriptionMarginLeftClassName,
            config.descriptionMarginTopWideClassName, config.descriptionMarginRightWideClassName,
            config.descriptionMarginBottomWideClassName, config.descriptionMarginLeftWideClassName,
            config.descriptionMarginTopLgClassName, config.descriptionMarginRightLgClassName,
            config.descriptionMarginBottomLgClassName, config.descriptionMarginLeftLgClassName,
            config.descriptionFontSizeClassName,
            config.descriptionFontSizeWideClassName,
            config.descriptionFontSizeLgClassName,
            config.descriptionFontWeightClassName,
            config.descriptionFontWeightWideClassName,
            config.descriptionFontWeightLgClassName,
            config.descriptionFontFamily,
            config.descriptionFontFamilyWide,
            config.descriptionFontFamilyLg,
          ].join(' ')}
          data-alignment={config.alignment}
          data-alignment-wide={config.alignmentWide}
          data-alignment-lg={config.alignmentLg}
          style={{
            color: resolvedDescriptionColor,
            opacity: scaleInkOpacity(config.descriptionOpacity),
            '--about-timeline-description-indent-extra': `${descriptionIndentExtraPx}px`,
            '--about-timeline-description-indent-extra-wide': `${descriptionIndentExtraWidePx}px`,
            '--about-timeline-description-indent-extra-lg': `${descriptionIndentExtraLgPx}px`,
          } as CSSProperties}
        >
          {sharedDescription !== null ? (
            sharedDescription
          ) : (
            <>
              <span className={styles.descriptionMobile}>{descriptionByBreakpoint.mobile}</span>
              <span className={styles.descriptionTablet}>{descriptionByBreakpoint.tablet}</span>
              <span className={styles.descriptionDesktop}>{descriptionByBreakpoint.desktop}</span>
            </>
          )}
        </p>
      ) : null}
      <ol
        ref={listRef}
        role={!navigationMode && config.maxActiveRows > 0 ? 'tablist' : 'list'}
        aria-orientation={!navigationMode && config.maxActiveRows > 0 ? 'vertical' : undefined}
        aria-label={ariaLabel}
        // See AboutTimeline.module.css's own `.list[data-short-viewport-hide]`
        // rule and rowDescriptionShortViewportHideEnabled's own doc comment
        // (AboutTimeline.config.ts) — only ever attached (not just toggled
        // false) so the media query's own selector never matches at all for
        // a consumer that opted out, rather than relying on an attribute
        // value check.
        data-short-viewport-hide={config.rowDescriptionShortViewportHideEnabled ? 'true' : undefined}
        data-scroll-windowed={scrollWindowVisibleCount > 0 ? 'true' : undefined}
        className={`${styles.list} ${config.rowGap}`}
        style={{
          '--about-timeline-row-gap-px': `${tailwindSpacingTokenToPx(config.rowGap, 40)}px`,
          // fillContainerHeight — the root is a flex column (see the root's
          // own style below); flex:1 makes this list consume all the space
          // between the description and the bottom toolbar (or the full
          // remaining space when the toolbar sits at the top), rather than
          // resting at its natural/N-row-capped height and leaving a gap.
          // min-height:0 lets it actually shrink-to-scroll inside that flex
          // parent instead of overflowing it.
          ...(fillContainerHeight ? { flex: '1 1 auto', minHeight: 0 } : null),
        } as CSSProperties}
      >
        {rowElements}
      </ol>
      {renderScrollWindowControls('mobile', 'bottom')}
      {renderScrollWindowControls('tablet', 'bottom')}
      {renderScrollWindowControls('desktop', 'bottom')}
    </div>
  );
}
