import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { AboutTimelineRowData } from '../../../about/components/AboutTimeline';
import type { CoverFlowExternalGeometry } from '../CoverFlow/CoverFlow';
import { usePrefersReducedMotion } from '../../../../helpers/usePrefersReducedMotion';
import {
  MOBILE_PINNED_ARTICLE_SECTION_EASINGS,
  normalizeMobilePinnedArticleSectionConfig,
  type MobilePinnedArticleSectionEasing,
  type MobilePinnedArticleSectionConfig,
} from './MobilePinnedArticleSection.config';
import styles from './styles.module.css';


export type MobilePinnedCarouselControls = {
  activeIndex: number;
  position: number;
  animatePosition: boolean;
  onIndexRequest: (index: number) => void;
  onDragScrollStart: () => void;
  onDragScroll: (deltaX: number) => void;
  onDragScrollEnd: (velocityX: number) => void;
  onGeometryChange: (geometry: CoverFlowExternalGeometry) => void;
  /** 0 while this section is merely peeking at the top of the viewport, 1
   * once it has scrolled into its pinned, primary-focus position — see
   * config.peekOutlineModeEnabled/-peekFocusRangeSvh. Always 1 while that
   * toggle is off, so a caller that ignores this field renders exactly as
   * before. */
  focusProgress: number;
};

type ScrollLockSnapshot = {
  bodyCssText: string;
  rootCssText: string;
};

type FullListPresentationPhase = 'closed' | 'preparing' | 'opening' | 'open' | 'closing';

export type MobilePinnedListControls = {
  activeIndex: number;
  /** Whether this render is the compact carousel companion list or the full
   * reading list. Callers can keep presentation-specific styling isolated. */
  presentation: 'short' | 'expanded';
  /** Already sliced by the caller's own windowing (short list) or the full
   * array (expanded) — see computeWindowStart below. Callers should render
   * this directly rather than re-deriving their own rows array, so the
   * short list's row count always matches what MobilePinnedArticleSection
   * itself decided to show. */
  rows: ReadonlyArray<AboutTimelineRowData>;
  onSelect: (index: number) => void;
  /** Opens the full reading list from the Timeline toolbar, when the compact
   * mobile list is the active presentation. */
  onExpand?: () => void;
};

type MobilePinnedArticleSectionProps = {
  itemCount: number;
  rows: ReadonlyArray<AboutTimelineRowData>;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  // Distinct from onActiveIndexChange: that one carries continuous,
  // scroll-driven updates the caller is free to defer (e.g. via
  // startTransition) since another one follows within a frame or two. This
  // one fires for exactly one discrete, user-initiated moment — tapping a
  // row in the expanded list. In the default (non-scroll-driven, animated)
  // path this call is itself DEFERRED by this component until well after
  // `expanded` has already flipped back to false and the short list is
  // back on screen — see handleListSelect's own deferred-commit block —
  // so the covered CoverFlow's own translate motion plays cleanly AFTER
  // that reveal, not underneath the still-open panel (operator ask). In
  // the two paths where deferring wouldn't make sense —
  // config.scrollDrivenNavigationEnabled (activeIndex IS the scroll-
  // restoration target, no separate reveal-then-translate beat to
  // preserve) and prefers-reduced-motion (no translate animation to
  // protect in the first place) — it still fires synchronously, in the
  // same tick `expanded` flips false, exactly as it always has.
  onActiveIndexCommit: (index: number) => void;
  renderCarousel: (controls: MobilePinnedCarouselControls) => ReactNode;
  renderList: (controls: MobilePinnedListControls) => ReactNode;
  carouselColor: string;
  panelColor: string;
  /** Opaque page-surface color underneath a potentially transparent panel
   * paint. The persistent glass layer uses it when no explicit expanded
   * background is configured, so a transient backdrop-filter compositor
   * dropout cannot make the whole panel disappear. */
  expandedPanelFallbackColor?: string;
  config: MobilePinnedArticleSectionConfig;
  /** Supplied by Abstract's mobile Timeline controls. */
  dragDownToCloseEnabled?: boolean;
  dragDownToCloseThresholdPx?: number;
  /** Retains the carousel driver while omitting the mobile list UI. */
  listPresentation?: 'visible' | 'none';
  /** Optional parent-supplied viewport slot. Used by the tablet stacked
   * composition to keep CoverFlow inside its complementary row budget. */
  viewportHeight?: CSSProperties['height'];
  /** An opt-in viewport-owned carousel plane. Unlike `viewportHeight`, this
   * moves the carousel's clipping viewport into the visible browser viewport
   * itself, which is required when a stacked desktop composition reserves
   * only part of the page section for the carousel. Only meaningful for the
   * carousel-only (`listPresentation: 'none'`) presentation. */
  carouselViewportPlane?: {
    top: CSSProperties['top'];
    height: CSSProperties['height'];
  };
  /** Fires exactly when the expanded panel opens/closes (openPanel/closePanel
   * below) — lets a caller drive page-level behavior tied to this modal-like
   * reading state, e.g. config.expandedForcesMaxBackgroundDarken
   * (pages/abstract.tsx forces the shared scroll-gradient background to its
   * own max darken while true). Optional; every existing caller not
   * supplying it behaves exactly as before. */
  onExpandedChange?: (expanded: boolean) => void;
  /** Opt-in (default false, byte-identical to today): flips the sign this
   * section applies when converting a drag/swipe's raw pixel delta (or
   * release velocity) into a `position`/index change. This section's own
   * index space (activeIndex, position, itemCount, rows) always stays in
   * the caller's original, un-reversed order — same contract CoverFlow
   * itself keeps at its own boundary (see CoverFlow.config.ts's own
   * `reverseItemOrder` doc comment) — so the short/expanded list here is
   * unaffected either way. Only the DRAG direction needs correcting: when
   * the paired CoverFlow instance is rendering that same index space in
   * reverse (CoverFlow.config.ts's own `reverseItemOrder`), dragging right
   * moves toward a LOWER on-screen position but a HIGHER index (the
   * opposite of the un-reversed relationship this section's math assumes),
   * so a caller pairing this section with a reversed CoverFlow must set
   * this to true or every drag/swipe here fights that CoverFlow instance's
   * own reversed layout — confirmed live: without this, dragging past the
   * one end already visible on screen produced no movement at all, since
   * `position` was already pinned at the un-reversed array's own boundary
   * in the direction the drag was (incorrectly) trying to push it. */
  reverseNavigationDirection?: boolean;
};

const clampIndex = (index: number, count: number) => (
  Math.min(Math.max(index, 0), Math.max(count - 1, 0))
);

/**
 * Short-list placement rule (PLAN-MOBILE-COVERFLOW-LIST-REDESIGN.md):
 * Rule A — selected at the TOP of the window whenever at least N-1 items
 * follow it. Rule B — selected at the BOTTOM whenever Rule A fails but at
 * least N-1 items precede it. Rule C — neither side has a full N-1
 * available (only possible when totalItems < 2N-2, a genuinely short full
 * list): best-effort fill via the same `selectedIndex - (N-1)` expression,
 * pulled back into range by the final clamp. See the plan doc for the proof
 * that Rules A/B never actually need that clamp, and a worked-example
 * table for the boundary cases.
 */
// Motion accepts named keywords or raw bezier tuples, but not arbitrary CSS
// easing strings. Keep this in step with the familiar config names.
const MOTION_EASING_BEZIERS: Record<MobilePinnedArticleSectionEasing, 'linear' | readonly [number, number, number, number]> = {
  linear: 'linear',
  ease: [0.25, 0.1, 0.25, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
};

function rowStartDelayMs(index: number, durationMs: number, overlapPercent: number): number {
  return Math.round(index * durationMs * (1 - overlapPercent / 100));
}

function rowCascadeDurationMs(
  rowCount: number,
  durationMs: number,
  overlapPercent: number,
): number {
  if (rowCount <= 0 || durationMs <= 0) return 0;
  return durationMs + rowStartDelayMs(rowCount - 1, durationMs, overlapPercent);
}

function computeWindowStart(selectedIndex: number, totalItems: number, windowSize: number): number {
  if (totalItems <= windowSize) return 0;
  const maxStart = totalItems - windowSize;
  const afterAvailable = totalItems - 1 - selectedIndex;
  // Rule B (beforeAvailable >= windowSize - 1) and the Rule C fallback both
  // resolve to this same expression — only the final clamp differs in how
  // far it needs to pull the result back into [0, maxStart].
  const start = afterAvailable >= windowSize - 1
    ? selectedIndex
    : selectedIndex - (windowSize - 1);
  return Math.min(Math.max(start, 0), maxStart);
}

export function MobilePinnedArticleSection({
  itemCount,
  rows,
  activeIndex,
  onActiveIndexChange,
  onActiveIndexCommit,
  renderCarousel,
  renderList,
  carouselColor,
  panelColor,
  expandedPanelFallbackColor,
  config: rawConfig,
  dragDownToCloseEnabled = false,
  dragDownToCloseThresholdPx = 96,
  listPresentation = 'visible',
  viewportHeight,
  carouselViewportPlane,
  onExpandedChange,
  reverseNavigationDirection = false,
}: MobilePinnedArticleSectionProps) {
  const config = useMemo(
    () => normalizeMobilePinnedArticleSectionConfig(rawConfig),
    [rawConfig],
  );
  const outerRef = useRef<HTMLElement | null>(null);
  // Measured/bridged across the position:sticky <-> position:fixed(overlay)
  // flip that fires on open and close — see positionFlipRectRef's own doc
  // comment below for why this exists.
  const stickyViewportRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const flipCardRef = useRef<HTMLDivElement | null>(null);
  const glassRowsViewportRef = useRef<HTMLDivElement | null>(null);
  // The FULL list's own viewport (inside the collapsible panel) — scroll-
  // into-view/focus on open, touch-gesture handling while expanded, and the
  // STAGE-06 fade-out's own transitionend listener all read this one.
  const rowsViewportRef = useRef<HTMLDivElement | null>(null);
  // The SHORT list's viewport. In glass mode it lives inside the same
  // persistent surface as the full list; card-flip mode keeps its compact
  // surface below the carousel. Used to restore focus once closing finishes.
  const shortListViewportRef = useRef<HTMLDivElement | null>(null);
  const expandedRef = useRef(false);
  const lockedScrollYRef = useRef(0);
  // Operator-reported: opening the panel (confirmed direction — not closing)
  // snapped the card/list to a new screen position in a single frame,
  // whenever the section hadn't fully reached its `position: sticky`
  // "stuck" offset yet (e.g. tapping to open while the section is still
  // scrolling into view). Root cause: `.stickyViewport` flips CSS
  // `position: sticky` (in-flow, scroll-relative — can sit below top:0 while
  // not yet stuck) to `position: fixed` (viewport-pinned overlay, always
  // top:0) the instant openPanel()/closePanel() runs. position:fixed and
  // position:sticky are different positioning algorithms with no CSS
  // transition path between them, so this was a hard, un-animatable jump in
  // whichever direction the section wasn't already stuck. Bridged instead
  // with a FLIP (First-Last-Invert-Play): openPanel()/closePanel() snapshot
  // the viewport's on-screen rect into this ref the instant before flipping
  // everything; the useLayoutEffect below reads it back once the flip has
  // committed, applies the resulting delta as a translateY (so nothing
  // visibly moves yet), then animates that offset down to 0 over the same
  // panelExpandDurationMs/Easing (opening) or panelCollapseDurationMs/Easing
  // (closing) driving the rest of that direction's motion.
  const positionFlipRectRef = useRef<DOMRect | null>(null);
  const sectionDocumentTopRef = useRef(0);
  const [expanded, setExpanded] = useState(false);
  // One lifecycle drives both full-list presentations. Glass maps it to the
  // height of one persistent bottom surface; cardFlip maps it to rotation.
  // Keeping geometry out of React state prevents visibility mechanisms from
  // contradicting one another at transition boundaries.
  const [presentationPhase, setPresentationPhase] =
    useState<FullListPresentationPhase>('closed');
  const [position, setPosition] = useState(activeIndex);
  const [stepPx, setStepPx] = useState(0);
  const [peekActive, setPeekActive] = useState(true);
  // Defaults to 1 (fully focused) so this stays inert — every consumer of
  // MobilePinnedCarouselControls.focusProgress renders exactly as before —
  // whenever config.peekOutlineModeEnabled is off.
  const [focusProgress, setFocusProgress] = useState(1);
  const [smallPhone, setSmallPhone] = useState(false);
  const snapTimerRef = useRef<number | null>(null);
  const rootInlineSnapTypeRef = useRef('');
  const dragSnapDisabledRef = useRef(false);
  const scrollLockSnapshotRef = useRef<ScrollLockSnapshot | null>(null);
  /* React state updates from the page are intentionally transitioned. Keep
   * the expanded-list choice here until that transition lands, otherwise the
   * first scroll event after unlocking can briefly see the old last index and
   * write it back over the restored page position. */
  const expandedSelectionRef = useRef<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  // Non-null while the panel is expanded and either its entrance stagger
  // (STAGE-04/05) or its select sequence (STAGE-06..STAGE-08, condensed —
  // PLAN-MOBILE-ARTICLE-SELECT-MOTION.md stage table) is in play. Rendered
  // through a SINGLE renderList/AboutTimeline call the whole time (never
  // split into one instance per row — that broke AboutTimeline's own
  // sibling-relative vertical-spacing CSS and its width cascade). Each row's
  // own `itemStyle` (a plain inline style, no Motion) drives its opacity via
  // ordinary CSS transitions — no scale/transform, no layout/FLIP. Reset to
  // null once idle, falling back to the cheap flat renders.
  const [expandedDisplayRows, setExpandedDisplayRows] = useState<AboutTimelineRowData[] | null>(null);
  // Mirrors expandedDisplayRows for handleListSelect to read without being
  // recreated on every animation tick (the state itself changes on every
  // staggered frame) — same ref-mirrors-state pattern as expandedRef/expanded.
  const expandedDisplayRowsRef = useRef<AboutTimelineRowData[] | null>(null);
  // Glass mode gets one painted preparation frame before height motion. This
  // lets Chromium establish the fixed-size filtered backing layer and the
  // full-list display list before it starts clipping that layer differently.
  const panelPrepareFrameRef = useRef<number | null>(null);
  const panelMotionStartFrameRef = useRef<number | null>(null);
  const openMountFrameRef = useRef<number | null>(null);
  const selectHoldTimerRef = useRef<number | null>(null);
  const selectSequenceFallbackTimerRef = useRef<number | null>(null);
  // Same event-driven pattern as the fade-out/collapse pairs below, for the
  // FIRST transitionend wait in the sequence: the panel's own physical
  // height-open transition (STAGE-04), gating STAGE-04/05's rowFadeInDelayMs
  // pause and the row entrance stagger that follows it.
  const panelExpandListenerCleanupRef = useRef<(() => void) | null>(null);
  const panelExpandFallbackTimerRef = useRef<number | null>(null);
  // Holds the rowFadeInDelayMs pause between "panel confirmed open" and
  // "rows start their entrance chain."
  const rowFadeInDelayTimerRef = useRef<number | null>(null);
  // Removes the transitionend listener STAGE-06's fade-out attaches below —
  // set whenever one is live, called (and nulled) the moment it fires, is
  // superseded by a new selection, or the component unmounts. Without this,
  // a rapid re-tap mid-fade would leave a stale listener referencing the
  // PREVIOUS selection's own `survivors`/`clamped` closure attached
  // alongside the new one, double-firing STAGE-07 with stale data.
  const fadeOutListenerCleanupRef = useRef<(() => void) | null>(null);
  // Safety net only for the transitionend-driven wait below — see its own
  // comment. Cleared the moment the real transitionend fires.
  const fadeOutFallbackTimerRef = useRef<number | null>(null);
  // Same pair, for the SECOND transitionend wait in this sequence: the
  // panel's own physical height-collapse (STAGE-08), gating STAGE-09's
  // list reveal — see proceedAfterFadeOut's own comment for why this is
  // event-driven too, not just a computed-duration timer.
  const panelCollapseListenerCleanupRef = useRef<(() => void) | null>(null);
  const panelCollapseFallbackTimerRef = useRef<number | null>(null);
  // Holds the deferred "commit the new activeIndex to the parent" closure
  // (operator ask: only after the panel has fully collapsed and the short
  // list is back on screen) between when it's scheduled and when it either
  // fires on its own timer or gets flushed early by a newer interaction —
  // see flushPendingDeferredCommit below.
  const pendingDeferredCommitRef = useRef<(() => void) | null>(null);
  expandedDisplayRowsRef.current = expandedDisplayRows;

  const [dragActive, setDragActive] = useState(false);
  const usesCardFlip = config.fullListPresentation === 'cardFlip';
  const presentationClosing = presentationPhase === 'closing';
  const cardFlipped = presentationPhase === 'opening' || presentationPhase === 'open';
  const showsFullList = presentationPhase !== 'closed';
  const visibleRows = smallPhone
    ? config.visibleRowsSmallPhone
    : config.visibleRowsLargePhone;
  const safeActiveIndex = clampIndex(activeIndex, itemCount);
  const windowLength = Math.min(visibleRows, itemCount);
  const [windowStart, setWindowStart] = useState(
    () => computeWindowStart(safeActiveIndex, itemCount, windowLength),
  );
  /* The window is otherwise STABLE across activeIndex changes — it does not
   * re-center to keep the active row pinned to the window's top slot on
   * every step. It only jumps (via computeWindowStart's Rule A/B/C) when the
   * active row would otherwise fall outside the window currently on screen
   * — advancing past its last slot, retreating past its first, or the
   * window's own shape changing (itemCount/tier). This is React's documented
   * "adjust state during render" pattern (comparing against the last-seen
   * triple via a ref), not a useEffect, so there's no extra frame showing a
   * stale window
   * before it corrects. */
  const windowTrackingRef = useRef({ activeIndex: safeActiveIndex, itemCount, windowLength });
  {
    const tracked = windowTrackingRef.current;
    const tripleChanged = tracked.activeIndex !== safeActiveIndex
      || tracked.itemCount !== itemCount
      || tracked.windowLength !== windowLength;
    if (tripleChanged) {
      const shapeChanged = tracked.itemCount !== itemCount || tracked.windowLength !== windowLength;
      const outOfBounds = safeActiveIndex < windowStart || safeActiveIndex >= windowStart + windowLength;
      // closePanel sets windowStart synchronously (in the same commit as the
      // parent's activeIndex prop update) whenever a select-from-expanded
      // sequence finishes, so by the time this effect sees the new
      // safeActiveIndex, windowStart already agrees with it — no separate
      // "settling" guard needed here anymore (PLAN-MOBILE-ARTICLE-SELECT-MOTION.md v2).
      if (shapeChanged || outOfBounds) {
        const nextWindowStart = computeWindowStart(safeActiveIndex, itemCount, windowLength);
        if (nextWindowStart !== windowStart) setWindowStart(nextWindowStart);
      }
      windowTrackingRef.current = { activeIndex: safeActiveIndex, itemCount, windowLength };
    }
  }
  // Always available while collapsed, regardless of window position or
  // remaining content — previously gated on `windowStart + windowLength <
  // itemCount`, which went false (hiding the row) whenever the window
  // landed at the very end of the list, e.g. right after settling on the
  // last item post-selection. Suppressed only once expanded (redundant —
  // the full list is already visible).
  const showExpandRow = !expanded;
  const expandListSentinelRow = useMemo(
    () => ({ caption: 'Expand list', slideIndex: itemCount }),
    [itemCount],
  );
  const shortListRows = useMemo(() => {
    const windowed = rows.slice(windowStart, windowStart + windowLength);
    if (!showExpandRow) return windowed;
    return [...windowed, expandListSentinelRow];
  }, [expandListSentinelRow, rows, showExpandRow, windowStart, windowLength]);
  /* Keep CoverFlow's horizontal geometry separate from the page's vertical
   * effort. This is the only tuning point: every scroll-to-index, index
   * derivation, snap anchor, and swipe projection consumes this same step.
   * Only meaningful while config.scrollDrivenNavigationEnabled is on. */
  const scrollStepPx = stepPx * config.scrollEffortMultiplier;
  const travelPx = scrollStepPx * Math.max(0, itemCount - 1);

  const sectionTop = useCallback(() => {
    if (expandedRef.current) return sectionDocumentTopRef.current;
    const outer = outerRef.current;
    const top = outer ? window.scrollY + outer.getBoundingClientRect().top : 0;
    sectionDocumentTopRef.current = top;
    return top;
  }, []);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    if (scrollStepPx <= 0) return;
    const clamped = clampIndex(index, itemCount);
    window.scrollTo({ top: sectionTop() + clamped * scrollStepPx, behavior });
  }, [itemCount, sectionTop, scrollStepPx]);

  const syncFromScroll = useCallback(() => {
    if (expandedRef.current || scrollStepPx <= 0) return;
    const top = sectionTop();
    const offset = Math.min(Math.max(window.scrollY - top, 0), travelPx);
    const nextPosition = offset / scrollStepPx;
    const nextIndex = clampIndex(Math.round(nextPosition), itemCount);
    setPosition(nextPosition);
    setPeekActive(window.scrollY + 1 < top);
    document.documentElement.toggleAttribute(
      'data-mobile-pinned-snap-active',
      window.scrollY >= top - 1 && window.scrollY <= top + travelPx + 1,
    );
    const pendingSelection = expandedSelectionRef.current;
    if (pendingSelection !== null) {
      if (safeActiveIndex === pendingSelection) {
        expandedSelectionRef.current = null;
      } else {
        /* Keep emitting the selected destination until the page state catches
         * up. This also covers the case where the browser emits the unlock
         * scroll event before React commits the new active index. Uses the
         * urgent commit, not onActiveIndexChange, for the same reason
         * closePanel() does below. */
        onActiveIndexCommit(pendingSelection);
      }
    } else if (nextIndex !== safeActiveIndex) {
      onActiveIndexChange(nextIndex);
    }
  }, [itemCount, onActiveIndexChange, onActiveIndexCommit, safeActiveIndex, sectionTop, scrollStepPx, travelPx]);

  // Keep the handoff guard only until the parent has committed the selected
  // article.  Clearing it in closePanel is too early: unlocking the document
  // can emit a scroll event before the parent's state update is visible, and
  // that event would otherwise derive the old index and write it back.  Once
  // the selected value is reflected in the prop, the guard is safe to retire
  // so later user scrolling remains authoritative.
  useEffect(() => {
    if (expandedSelectionRef.current === safeActiveIndex) {
      expandedSelectionRef.current = null;
    }
  }, [safeActiveIndex]);

  // `position` (the value threaded into CoverFlow's own externalDriver, see
  // renderCarousel's own controls.position below) previously only ever
  // changed from an interaction this component owns end-to-end — scroll
  // (syncFromScroll), a drag release, or a tap in its own short/expanded
  // list — every one of those already calls setPosition itself in the same
  // handler that also reports the new index upward. That covered every
  // caller until PLAN-ABSTRACT-TABLET-HERO-TIMELINE-COVERFLOW-ORDER.md
  // started rendering AboutTimeline as a sibling at tablet
  // (listPresentation: 'none') instead of inside this component's own list:
  // selecting a timeline row now changes the shared activeIndex entirely
  // from OUTSIDE, with no internal handler of this component's own in that
  // call path to move `position` alongside it. The result (screenshot-
  // reported): activeIndex updates the active-card CSS/content immediately,
  // but the carousel's own transform position never moves, since nothing
  // told it to. This effect is the missing sync — it only fires for a
  // genuinely external index change; every internal path above already
  // leaves `position` equal to the new index by the time this runs, making
  // it a no-op there. Skipped while scroll drives the carousel (position
  // must keep tracking real scroll, not jump), mid-drag (the gesture itself
  // is the authority), or expanded (SEL-07's own deferred-commit handoff
  // above already owns that transition's timing).
  useEffect(() => {
    if (config.scrollDrivenNavigationEnabled || dragActive || expandedRef.current) return;
    setPosition(current => (current === safeActiveIndex ? current : safeActiveIndex));
  }, [safeActiveIndex, config.scrollDrivenNavigationEnabled, dragActive]);

  useEffect(() => {
    const query = window.matchMedia(`(max-height: ${config.smallPhoneMaxHeightPx}px)`);
    const update = () => setSmallPhone(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [config.smallPhoneMaxHeightPx]);

  useEffect(() => {
    // Scroll never drives the carousel in the default (opt-in-off) mode —
    // see MobilePinnedArticleSectionConfig.scrollDrivenNavigationEnabled.
    // Skip attaching any of this entirely rather than letting each handler
    // early-return on every event; there's nothing for them to do.
    if (!config.scrollDrivenNavigationEnabled) return undefined;
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        syncFromScroll();
      });
    };
    const settle = () => {
      schedule();
      if (expandedRef.current || scrollStepPx <= 0) return;
      if (snapTimerRef.current !== null) window.clearTimeout(snapTimerRef.current);
      snapTimerRef.current = window.setTimeout(() => {
        const top = sectionTop();
        const offset = window.scrollY - top;
        if (offset < 0 || offset > travelPx) return;
        scrollToIndex(Math.round(offset / scrollStepPx));
      }, 120);
    };
    const supportsScrollEnd = 'onscrollend' in window;
    const onScroll = () => {
      schedule();
      if (!supportsScrollEnd) settle();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (supportsScrollEnd) window.addEventListener('scrollend', settle);
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule);
    schedule();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      if (snapTimerRef.current !== null) window.clearTimeout(snapTimerRef.current);
      window.removeEventListener('scroll', onScroll);
      if (supportsScrollEnd) window.removeEventListener('scrollend', settle);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
    };
  }, [config.scrollDrivenNavigationEnabled, scrollStepPx, scrollToIndex, sectionTop, syncFromScroll, travelPx]);

  // Deliberately independent of the config.scrollDrivenNavigationEnabled-
  // gated effect above (that one only exists to let page scroll drive the
  // CAROUSEL's own active index — an opt-in, off-by-default legacy mode).
  // peekOutlineModeEnabled has nothing to do with that: it needs to track
  // real page scroll against this section's own pinned position in the
  // ordinary, default scroll experience too, so it gets its own listener,
  // gated only on its own toggle.
  useEffect(() => {
    if (!config.peekOutlineModeEnabled) {
      setFocusProgress(1);
      return undefined;
    }
    // Threshold, not a scroll-linked ramp (operator ask — see
    // pages/abstract.tsx's own peekOutlineActive doc comment for the
    // consuming side of this same decision): focusProgress here only ever
    // resolves to exactly 0 or exactly 1, flipping the instant the section's
    // top comes within `peekFocusRangeSvh` of its pinned position, rather
    // than fractionally approaching 1 as `top - scrollY` shrinks toward 0.
    // A prior version divided by focusRangePx to produce that fraction,
    // which meant the flip to 1 only ever happened at the exact instant
    // `top - scrollY` reached zero (this section's own document top exactly
    // level with the viewport's top edge) — mathematically correct, but
    // operator-reported to visibly NOT have fired even once the section
    // plainly looked fully settled (its short list already visible below
    // the card). `top` itself is measured live off the real DOM
    // (outerRef.getBoundingClientRect()), so it's never stale, but "exactly
    // level" is a much stricter bar than "visually settled" tolerates —
    // sub-pixel rounding, a scroll-snap stop landing a hair short, or a
    // dynamic mobile browser toolbar changing `window.innerHeight` between
    // the moment `top` was captured and the moment the user perceives
    // "done" can all leave a few pixels of gap that never closes. Treating
    // `peekFocusRangeSvh` as a MARGIN (how close counts as "arrived") rather
    // than a ramp denominator makes the flip robust to exactly that kind of
    // slop, and gives operators a single, directly-tunable "how early/how
    // exact" knob instead of one that (as built) couldn't actually move the
    // flip's timing at all.
    const update = () => {
      if (expandedRef.current) return;
      const top = sectionTop();
      const focusMarginPx = Math.max(1, (window.innerHeight || 1) * (config.peekFocusRangeSvh / 100));
      setFocusProgress(top - window.scrollY <= focusMarginPx ? 1 : 0);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [config.peekOutlineModeEnabled, config.peekFocusRangeSvh, sectionTop]);

  const lockOuterScroll = useCallback(() => {
    if (scrollLockSnapshotRef.current) return;
    const scrollY = window.scrollY;
    lockedScrollYRef.current = scrollY;
    const body = document.body;
    const root = document.documentElement;
    scrollLockSnapshotRef.current = {
      bodyCssText: body.style.cssText,
      rootCssText: root.style.cssText,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    root.style.overflow = 'hidden';
    root.style.overscrollBehavior = 'none';
  }, []);

  const unlockOuterScroll = useCallback(() => {
    const snapshot = scrollLockSnapshotRef.current;
    if (!snapshot) return;
    const body = document.body;
    body.style.cssText = snapshot.bodyCssText;
    document.documentElement.style.cssText = snapshot.rootCssText;
    scrollLockSnapshotRef.current = null;
    window.scrollTo({ top: lockedScrollYRef.current, behavior: 'auto' });
  }, []);

  const disableRootSnapForDrag = useCallback(() => {
    if (dragSnapDisabledRef.current) return;
    rootInlineSnapTypeRef.current = document.documentElement.style.scrollSnapType;
    document.documentElement.style.scrollSnapType = 'none';
    dragSnapDisabledRef.current = true;
  }, []);

  const restoreRootSnapAfterDrag = useCallback(() => {
    if (!dragSnapDisabledRef.current) return;
    document.documentElement.style.scrollSnapType = rootInlineSnapTypeRef.current;
    dragSnapDisabledRef.current = false;
  }, []);

  // Runs (immediately, synchronously) whatever deferred "commit the new
  // activeIndex" closure is still pending — see pendingDeferredCommitRef's
  // own doc comment. Called from every OTHER path that's about to change
  // the active article (reopening the panel, tapping a short-list row,
  // finishing a carousel drag): any of those supersede an in-flight
  // deferred commit from a previous selection, and running the stale one
  // first is safe — both writes land in the same synchronous tick, so only
  // the newer one is ever actually painted. A no-op when nothing's pending.
  const flushPendingDeferredCommit = useCallback(() => {
    if (selectSequenceFallbackTimerRef.current !== null) {
      window.clearTimeout(selectSequenceFallbackTimerRef.current);
      selectSequenceFallbackTimerRef.current = null;
    }
    const run = pendingDeferredCommitRef.current;
    pendingDeferredCommitRef.current = null;
    run?.();
  }, []);

  // Bug/regression fix (operator-reported): a fresh open no longer cancels
  // a still-in-flight CLOSE sequence's own row-fade-out/panel-fade/height-
  // collapse timers and `transitionend` listeners — only its OWN
  // open-related refs got reset. Reopening quickly enough (well within
  // reach on a list with several rows, since the close sequence's row
  // fade-out alone can run for seconds) left the stale close sequence's
  // height-collapse `transitionend` listener attached; it then caught the
  // NEW open's own height-GROW transition finishing, mistook it for its own
  // collapse finishing, and called `setExpandedDisplayRows(null)` mid-grow
  // — wiping the STAGE-04 hidden-row array and falling back to the plain,
  // fully-opaque `rows` render before the real STAGE-05 chain ever got a
  // chance to run. That read as exactly what was reported: the panel
  // visibly empty while still growing, then all of a sudden showing every
  // row at once (no stagger, no fade) partway through — not "sliding up and
  // showing the articles" per the normal, deliberately-tuned motion path.
  // Shared with beginCloseSequence's own top-of-function reset below so a
  // fresh close and a fresh open both start from a genuinely clean slate.
  const cancelInFlightCloseSequence = useCallback(() => {
    if (selectHoldTimerRef.current !== null) {
      window.clearTimeout(selectHoldTimerRef.current);
      selectHoldTimerRef.current = null;
    }
    if (selectSequenceFallbackTimerRef.current !== null) {
      window.clearTimeout(selectSequenceFallbackTimerRef.current);
      selectSequenceFallbackTimerRef.current = null;
    }
    if (fadeOutFallbackTimerRef.current !== null) {
      window.clearTimeout(fadeOutFallbackTimerRef.current);
      fadeOutFallbackTimerRef.current = null;
    }
    fadeOutListenerCleanupRef.current?.();
    fadeOutListenerCleanupRef.current = null;
    if (panelCollapseFallbackTimerRef.current !== null) {
      window.clearTimeout(panelCollapseFallbackTimerRef.current);
      panelCollapseFallbackTimerRef.current = null;
    }
    panelCollapseListenerCleanupRef.current?.();
    panelCollapseListenerCleanupRef.current = null;
    pendingDeferredCommitRef.current = null;
  }, []);

  const cancelInFlightOpenSequence = useCallback(() => {
    if (panelPrepareFrameRef.current !== null) {
      window.cancelAnimationFrame(panelPrepareFrameRef.current);
      panelPrepareFrameRef.current = null;
    }
    if (panelMotionStartFrameRef.current !== null) {
      window.cancelAnimationFrame(panelMotionStartFrameRef.current);
      panelMotionStartFrameRef.current = null;
    }
    panelExpandListenerCleanupRef.current?.();
    panelExpandListenerCleanupRef.current = null;
    if (panelExpandFallbackTimerRef.current !== null) {
      window.clearTimeout(panelExpandFallbackTimerRef.current);
      panelExpandFallbackTimerRef.current = null;
    }
    if (rowFadeInDelayTimerRef.current !== null) {
      window.clearTimeout(rowFadeInDelayTimerRef.current);
      rowFadeInDelayTimerRef.current = null;
    }
    if (openMountFrameRef.current !== null) {
      window.cancelAnimationFrame(openMountFrameRef.current);
      openMountFrameRef.current = null;
    }
  }, []);

  const openPanel = useCallback(() => {
    flushPendingDeferredCommit();
    cancelInFlightCloseSequence();
    cancelInFlightOpenSequence();
    if (snapTimerRef.current !== null) {
      window.clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    }
    // Caches the true document top before lockOuterScroll below freezes the
    // page via position:fixed (after which getBoundingClientRect would read
    // the frozen, no-longer-meaningful layout instead). Only meaningful for
    // the scroll-driven restoration math in closePanel().
    if (config.scrollDrivenNavigationEnabled) sectionTop();
    // Snapshot BEFORE the sticky -> fixed flip below — see
    // positionFlipRectRef's own doc comment for why.
    positionFlipRectRef.current = stickyViewportRef.current?.getBoundingClientRect() ?? null;
    expandedRef.current = true;
    setExpanded(true);
    setPresentationPhase('preparing');
    if (prefersReducedMotion) {
      setPresentationPhase('open');
      setExpandedDisplayRows(null);
    } else {
      // STAGE-04: mount every row hidden (opacity 0 only, no
      // scale/transform), no transition yet — a freshly-mounted element has
      // no prior frame to interpolate from.
      setExpandedDisplayRows(rows.map(row => ({ ...row, itemStyle: { opacity: 0 } })));
      const beginRowEntrance = () => {
        const easingCss = MOBILE_PINNED_ARTICLE_SECTION_EASINGS[config.rowFadeInEasing];
        setExpandedDisplayRows(rows.map((row, index) => ({
          ...row,
          itemStyle: {
            opacity: 1,
            transition: `opacity ${config.rowFadeInDurationMs}ms ${easingCss} `
              + `${rowStartDelayMs(
                index, config.rowFadeInDurationMs, config.rowFadeInOverlapPercent,
              )}ms`,
          },
        })));
      };
      const startEntranceAfterDelay = (delayMs: number) => {
        if (delayMs <= 0) {
          const frame = window.requestAnimationFrame(() => {
            openMountFrameRef.current = null;
            beginRowEntrance();
          });
          openMountFrameRef.current = frame;
          return;
        }
        rowFadeInDelayTimerRef.current = window.setTimeout(() => {
          rowFadeInDelayTimerRef.current = null;
          const frame = window.requestAnimationFrame(() => {
            openMountFrameRef.current = null;
            beginRowEntrance();
          });
          openMountFrameRef.current = frame;
        }, delayMs);
      };
      const startsRowsDuringPanelOpen = config.panelExpandFirstRowOverlapPercent > 0;
      const motionSurface = usesCardFlip ? flipCardRef.current : panelRef.current;
      let expandSettled = false;
      const finishPanelExpand = () => {
        if (expandSettled) return;
        expandSettled = true;
        panelExpandListenerCleanupRef.current?.();
        panelExpandListenerCleanupRef.current = null;
        if (panelExpandFallbackTimerRef.current !== null) {
          window.clearTimeout(panelExpandFallbackTimerRef.current);
          panelExpandFallbackTimerRef.current = null;
        }
        setPresentationPhase('open');
        if (!startsRowsDuringPanelOpen) {
          startEntranceAfterDelay(config.rowFadeInDelayMs);
        }
      };
      if (config.panelExpandDurationMs <= 0 || !motionSurface) {
        finishPanelExpand();
      } else {
        const onPanelTransitionEnd = (event: TransitionEvent) => {
          const expectedProperty = usesCardFlip ? 'transform' : 'height';
          if (event.propertyName !== expectedProperty || event.target !== motionSurface) return;
          finishPanelExpand();
        };
        motionSurface.addEventListener('transitionend', onPanelTransitionEnd);
        panelExpandListenerCleanupRef.current = () => {
          motionSurface.removeEventListener('transitionend', onPanelTransitionEnd);
        };
        panelExpandFallbackTimerRef.current = window.setTimeout(
          finishPanelExpand, config.panelExpandDurationMs + 200,
        );
        const startPanelMotion = () => {
          panelMotionStartFrameRef.current = null;
          setPresentationPhase('opening');
          if (startsRowsDuringPanelOpen) {
            const firstRowStartMs = Math.max(
              0,
              Math.round(
                config.panelExpandDurationMs
                * (1 - config.panelExpandFirstRowOverlapPercent / 100),
              ) + config.rowFadeInDelayMs,
            );
            startEntranceAfterDelay(firstRowStartMs);
          }
        };
        if (usesCardFlip) {
          panelMotionStartFrameRef.current = window.requestAnimationFrame(startPanelMotion);
        } else {
          // A state update scheduled in the first rAF can still be folded into
          // the click's first paint. Wait through that paint, then start the
          // height transition in the following frame. The preparation state
          // has the full list mounted but hidden and the fixed-size glass
          // backing already painted, so Chromium does not rebuild both while
          // the panel boundary is moving.
          panelPrepareFrameRef.current = window.requestAnimationFrame(() => {
            panelPrepareFrameRef.current = null;
            panelMotionStartFrameRef.current = window.requestAnimationFrame(() => {
              startPanelMotion();
            });
          });
        }
      }
    }
    onExpandedChange?.(true);
    lockOuterScroll();
    window.requestAnimationFrame(() => {
      const viewport = rowsViewportRef.current ?? glassRowsViewportRef.current;
      const activeRow = viewport?.querySelector<HTMLElement>(
        '[role="tab"][aria-selected="true"]',
      );
      if (!activeRow || !viewport) return;
      /* Do not call scrollIntoView here. On iOS, scrollIntoView can move the
       * locked document behind a fixed body and leave the expanded panel
       * looking empty. Move only the inner list, then focus without asking
       * the browser to scroll any ancestor. */
      const rowCenter = activeRow.offsetTop + activeRow.offsetHeight / 2;
      viewport.scrollTop = Math.max(0, rowCenter - viewport.clientHeight / 2);
      activeRow.focus({ preventScroll: true });
    });
  }, [
    cancelInFlightCloseSequence, cancelInFlightOpenSequence, config.panelExpandDurationMs,
    config.panelExpandFirstRowOverlapPercent, config.rowFadeInDelayMs,
    config.rowFadeInDurationMs, config.rowFadeInEasing, config.rowFadeInOverlapPercent,
    config.scrollDrivenNavigationEnabled, flushPendingDeferredCommit, lockOuterScroll,
    onExpandedChange, prefersReducedMotion, rows, sectionTop, usesCardFlip,
  ]);

  const closePanel = useCallback(() => {
    const selectedIndex = expandedSelectionRef.current;
    if (selectedIndex !== null) {
      // Commit the new activeIndex HERE, immediately, only in the two paths
      // where deferring it wouldn't make sense — see onActiveIndexCommit's
      // own doc comment above. The default (animated, non-scroll-driven)
      // path deliberately does NOT commit here: handleListSelect schedules
      // that commit itself, deferred until well after this panel has fully
      // collapsed and the short list is back on screen, so the covered
      // CoverFlow's own translate motion plays cleanly AFTER that reveal.
      if (config.scrollDrivenNavigationEnabled || prefersReducedMotion) {
        onActiveIndexCommit(selectedIndex);
      }
      // Only meaningful in scroll-driven mode: overrides lockOuterScroll's
      // own open-time capture (wherever the page happened to be scrolled)
      // with the document offset this index corresponds to. With scroll
      // disconnected from the carousel, selecting a different article no
      // longer implies a different page-scroll position — leave
      // lockedScrollYRef at its open-time value so closing just returns to
      // wherever the page already was, regardless of which article got picked.
      if (config.scrollDrivenNavigationEnabled) {
        lockedScrollYRef.current = sectionTop() + selectedIndex * scrollStepPx;
      }
      // SEL-07 (PLAN-MOBILE-ARTICLE-SELECT-MOTION.md v2): set windowStart to
      // the final target SYNCHRONOUSLY, in the same commit as the expanded=
      // false flip below — not deferred behind a timer the way v1 did.
      // Deliberately NOT clamped to itemCount - windowLength (reverted an
      // earlier attempt that did): the spec is the selection is ALWAYS the
      // window's top row, even near the end of the list, where that means
      // showing fewer than windowLength rows (only however many real items
      // remain after it) rather than backfilling with earlier items to keep
      // the row count up — backfilling was tried and rejected (operator
      // ask): it silently un-pinned the selection from the top for exactly
      // this range of indices. The visual jump on a later "Expand list" tap
      // near the end of the list is a SEPARATE bug from this windowing
      // policy — see openPanel's own short-list-geometry handling.
      setWindowStart(Math.max(selectedIndex, 0));
    } else {
      // STAGE-12 (plain close — Escape/backdrop, no selection made): no
      // select sequence is running to reset this on its own, so it must
      // happen here, or the next render would incorrectly keep rendering
      // the stale expanded/entrance array inside the now-collapsed panel.
      if (openMountFrameRef.current !== null) {
        window.cancelAnimationFrame(openMountFrameRef.current);
        openMountFrameRef.current = null;
      }
      setExpandedDisplayRows(null);
    }
    // Snapshot BEFORE the fixed -> sticky flip below — see
    // positionFlipRectRef's own doc comment for why.
    positionFlipRectRef.current = stickyViewportRef.current?.getBoundingClientRect() ?? null;
    expandedRef.current = false;
    setExpanded(false);
    onExpandedChange?.(false);
    const restoredScrollY = lockedScrollYRef.current;
    unlockOuterScroll();
    window.requestAnimationFrame(() => {
      /* Focus BEFORE the corrective scroll, not after: `preventScroll` has a
       * long history of being unreliable on iOS Safari, and this sits inside
       * a `position: sticky` ancestor — exactly the case where a browser's
       * own "scroll the focused element into view" fallback is most likely
       * to kick in despite the option. If it does, it must lose to our own
       * restoredScrollY, not win by running last. Focus the SHORT list's own
       * viewport (tabIndex={-1} below), not the full list's — the panel is
       * closing/closed at this point, so its own viewport is about to be (or
       * already is) invisible; the short list is the container that's
       * actually still on screen and visible right where the user was. */
      (shortListViewportRef.current ?? glassRowsViewportRef.current)
        ?.focus({ preventScroll: true });
      window.scrollTo({ top: restoredScrollY, behavior: 'auto' });
    });
  }, [
    config.scrollDrivenNavigationEnabled, itemCount, onActiveIndexCommit,
    onExpandedChange, prefersReducedMotion, scrollStepPx, sectionTop, unlockOuterScroll,
  ]);

  // Plays the FLIP bridge openPanel()/closePanel() set up above. Runs
  // post-commit, pre-paint (useLayoutEffect, not useEffect) so the inverted
  // starting transform is what the browser paints first — the user never
  // sees the raw jump, only the slide that follows it. Uses the matching
  // expand or collapse duration/easing depending on which direction `expanded`
  // just flipped. Reduced motion intentionally skips the slide and just
  // discards the snapshot; the position change itself is instant, which is
  // the expected reduced-motion behavior.
  useLayoutEffect(() => {
    const rectBefore = positionFlipRectRef.current;
    positionFlipRectRef.current = null;
    if (!rectBefore || prefersReducedMotion) return;
    const node = stickyViewportRef.current;
    if (!node) return;
    const rectAfter = node.getBoundingClientRect();
    const deltaY = rectBefore.top - rectAfter.top;
    if (Math.abs(deltaY) < 1) return;
    const durationMs = expanded ? config.panelExpandDurationMs : config.panelCollapseDurationMs;
    const easingCss = MOBILE_PINNED_ARTICLE_SECTION_EASINGS[
      expanded ? config.panelExpandEasing : config.panelCollapseEasing
    ];
    node.style.transition = 'none';
    node.style.transform = `translateY(${deltaY}px)`;
    // Force a synchronous layout flush so the browser actually paints the
    // inverted position before the rAF below starts the real transition —
    // without this, both style writes could land in the same paint and the
    // transition would have no visible starting frame to animate from.
    void node.offsetHeight;
    const frame = window.requestAnimationFrame(() => {
      node.style.transition = `transform ${durationMs}ms ${easingCss}`;
      node.style.transform = '';
    });
    const clearInlineStyles = () => {
      node.style.transition = '';
      node.removeEventListener('transitionend', clearInlineStyles);
    };
    node.addEventListener('transitionend', clearInlineStyles);
    return () => {
      window.cancelAnimationFrame(frame);
      node.removeEventListener('transitionend', clearInlineStyles);
      node.style.transition = '';
      node.style.transform = '';
    };
  }, [
    expanded, config.panelExpandDurationMs, config.panelExpandEasing,
    config.panelCollapseDurationMs, config.panelCollapseEasing, prefersReducedMotion,
  ]);

  // Every full-panel collapse shares one timeline, whether it came from a
  // row selection or a plain close. Rows and the panel may now overlap, but
  // the close commits only after BOTH the final row and the panel have
  // genuinely finished their respective transitions.
  const beginCloseSequence = useCallback((commit: () => void, afterClosed?: () => void) => {
    // A rapid re-tap/re-close mid-sequence (a PREVIOUS close's own fade is
    // still in flight) must not leave anything from that stale sequence
    // around to fire later against this new one — same shared reset
    // openPanel uses for the mirror-image case (opening while a previous
    // close is still in flight).
    cancelInFlightOpenSequence();
    cancelInFlightCloseSequence();

    // Reduced motion skips directly to the closed presentation and commit.
    // closePanel() already commits the selected index synchronously in this
    // mode, so there is no deferred hand-off to preserve.
    if (prefersReducedMotion) {
      setPresentationPhase('closed');
      setExpandedDisplayRows(null);
      commit();
      return;
    }

    const leaveEasingCss = MOBILE_PINNED_ARTICLE_SECTION_EASINGS[config.rowFadeOutEasing];
    const currentRows = expandedDisplayRowsRef.current ?? rows;
    const rowCount = currentRows.length;
    const fadeOutTotalMs = rowCascadeDurationMs(
      rowCount, config.rowFadeOutDurationMs, config.rowFadeOutOverlapPercent,
    );
    setExpandedDisplayRows(currentRows.map((row, index) => ({
      ...row,
      itemStyle: {
        opacity: 0,
        transition: `opacity ${config.rowFadeOutDurationMs}ms ${leaveEasingCss} `
          + `${rowStartDelayMs(
            index, config.rowFadeOutDurationMs, config.rowFadeOutOverlapPercent,
          )}ms`,
        pointerEvents: 'none',
      },
    })));

    let rowsSettled = rowCount === 0 || fadeOutTotalMs <= 0;
    let panelSettled = false;
    let panelStarted = false;
    let closeSettled = false;
    const finishClose = () => {
      if (!rowsSettled || !panelSettled || closeSettled) return;
      closeSettled = true;
      commit();
      setPresentationPhase('closed');
      setExpandedDisplayRows(null);
      afterClosed?.();
    };
    const beginPanelCollapse = () => {
      if (panelStarted) return;
      panelStarted = true;
      selectHoldTimerRef.current = null;
      setPresentationPhase('closing');
      const motionSurface = usesCardFlip ? flipCardRef.current : panelRef.current;
      let settled = false;
      const finishPanelCollapse = () => {
        if (settled) return;
        settled = true;
        panelCollapseListenerCleanupRef.current?.();
        panelCollapseListenerCleanupRef.current = null;
        if (panelCollapseFallbackTimerRef.current !== null) {
          window.clearTimeout(panelCollapseFallbackTimerRef.current);
          panelCollapseFallbackTimerRef.current = null;
        }
        panelSettled = true;
        finishClose();
      };
      if (config.panelCollapseDurationMs <= 0 || !motionSurface) {
        finishPanelCollapse();
        return;
      }
      const onCollapseTransitionEnd = (event: TransitionEvent) => {
        const expectedProperty = usesCardFlip ? 'transform' : 'height';
        if (event.propertyName !== expectedProperty || event.target !== motionSurface) return;
        finishPanelCollapse();
      };
      motionSurface.addEventListener('transitionend', onCollapseTransitionEnd);
      panelCollapseListenerCleanupRef.current = () => {
        motionSurface.removeEventListener('transitionend', onCollapseTransitionEnd);
      };
      panelCollapseFallbackTimerRef.current = window.setTimeout(
        finishPanelCollapse, config.panelCollapseDurationMs + 200,
      );
    };
    const schedulePanelCollapse = (delayMs: number) => {
      if (delayMs <= 0) {
        beginPanelCollapse();
        return;
      }
      selectHoldTimerRef.current = window.setTimeout(beginPanelCollapse, delayMs);
    };

    // At 0% retain the exact event-driven serial sequence. Higher values use
    // the configured cascade geometry to pull panel close into the exit
    // timeline; completion still waits for the real final-row event.
    const panelOverlap = config.panelCollapseFirstRowOverlapPercent / 100;
    const panelStartDelayMs = Math.round(fadeOutTotalMs * (1 - panelOverlap))
      + config.panelCollapseDelayMs;
    if (rowsSettled) {
      schedulePanelCollapse(config.panelCollapseDelayMs);
      return;
    }
    const viewport = rowsViewportRef.current ?? glassRowsViewportRef.current;
    let settled = false;
    const finishRows = () => {
      if (settled) return;
      settled = true;
      fadeOutListenerCleanupRef.current?.();
      fadeOutListenerCleanupRef.current = null;
      if (fadeOutFallbackTimerRef.current !== null) {
        window.clearTimeout(fadeOutFallbackTimerRef.current);
        fadeOutFallbackTimerRef.current = null;
      }
      rowsSettled = true;
      if (panelOverlap <= 0) {
        schedulePanelCollapse(config.panelCollapseDelayMs);
      }
      finishClose();
    };
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName !== 'opacity') return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      // The LAST row (highest stagger delay) is the one that finishes
      // latest — every row stays in its ORIGINAL DOM position during this
      // fade (nothing reorders until every row is invisible), so "last
      // child of its own parent" reliably identifies it regardless of how
      // many rows are in play.
      if (target.parentElement?.lastElementChild !== target) return;
      finishRows();
    };
    viewport?.addEventListener('transitionend', onTransitionEnd);
    fadeOutListenerCleanupRef.current = () => {
      viewport?.removeEventListener('transitionend', onTransitionEnd);
    };
    fadeOutFallbackTimerRef.current = window.setTimeout(finishRows, fadeOutTotalMs + 200);
    if (panelOverlap > 0) {
      schedulePanelCollapse(panelStartDelayMs);
    }
  }, [
    cancelInFlightCloseSequence, cancelInFlightOpenSequence, config.panelCollapseDelayMs,
    config.panelCollapseDurationMs, config.panelCollapseFirstRowOverlapPercent,
    config.rowFadeOutDurationMs, config.rowFadeOutEasing, config.rowFadeOutOverlapPercent,
    prefersReducedMotion, rows, usesCardFlip,
  ]);

  // Plain close (Escape/backdrop) — no row was picked, so `commit` is just
  // closePanel() itself; expandedSelectionRef.current stays null, which
  // closePanel already treats as "no selection, plain close" (STAGE-12).
  // Runs the exact same fade-rows-then-fade-panel sequence as picking a row
  // (beginCloseSequence above) instead of collapsing instantly.
  const requestClose = useCallback(() => {
    if (!expandedRef.current) return;
    beginCloseSequence(closePanel);
  }, [beginCloseSequence, closePanel]);

  useEffect(() => () => {
    if (expandedRef.current) unlockOuterScroll();
    restoreRootSnapAfterDrag();
    document.documentElement.removeAttribute('data-mobile-pinned-snap-active');
    if (panelPrepareFrameRef.current !== null) window.cancelAnimationFrame(panelPrepareFrameRef.current);
    if (panelMotionStartFrameRef.current !== null) window.cancelAnimationFrame(panelMotionStartFrameRef.current);
    if (openMountFrameRef.current !== null) window.cancelAnimationFrame(openMountFrameRef.current);
    if (panelExpandFallbackTimerRef.current !== null) window.clearTimeout(panelExpandFallbackTimerRef.current);
    panelExpandListenerCleanupRef.current?.();
    if (rowFadeInDelayTimerRef.current !== null) window.clearTimeout(rowFadeInDelayTimerRef.current);
    if (selectHoldTimerRef.current !== null) window.clearTimeout(selectHoldTimerRef.current);
    if (selectSequenceFallbackTimerRef.current !== null) window.clearTimeout(selectSequenceFallbackTimerRef.current);
    if (fadeOutFallbackTimerRef.current !== null) window.clearTimeout(fadeOutFallbackTimerRef.current);
    fadeOutListenerCleanupRef.current?.();
    if (panelCollapseFallbackTimerRef.current !== null) window.clearTimeout(panelCollapseFallbackTimerRef.current);
    panelCollapseListenerCleanupRef.current?.();
    pendingDeferredCommitRef.current = null;
  }, [restoreRootSnapAfterDrag, unlockOuterScroll]);

  useEffect(() => {
    if (!expanded) return undefined;
    const viewport = rowsViewportRef.current ?? glassRowsViewportRef.current;
    if (!viewport) return undefined;
    let touchY = 0;
    let dragStart: { x: number; y: number } | null = null;
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      touchY = touch?.clientY ?? 0;
      // A gesture that starts in the middle of a scrollable list must keep
      // scrolling normally, even if it reaches the top before release.
      dragStart = dragDownToCloseEnabled && presentationPhase === 'open'
        && event.touches.length === 1 && viewport.scrollTop <= 1 && touch
        ? { x: touch.clientX, y: touch.clientY }
        : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) dragStart = null;
      const currentY = event.touches[0]?.clientY ?? touchY;
      const pullingPastTop = viewport.scrollTop <= 0 && currentY > touchY;
      const pushingPastBottom =
        viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1
        && currentY < touchY;
      if (pullingPastTop || pushingPastBottom) event.preventDefault();
      touchY = currentY;
    };
    const onTouchEnd = (event: TouchEvent) => {
      const start = dragStart;
      dragStart = null;
      const touch = event.changedTouches[0];
      if (!start || !touch || viewport.scrollTop > 1 || presentationPhase !== 'open') return;
      const down = touch.clientY - start.y;
      const sideways = Math.abs(touch.clientX - start.x);
      if (down < dragDownToCloseThresholdPx || down <= sideways * 1.2) return;
      event.preventDefault();
      requestClose();
    };
    const onTouchCancel = () => { dragStart = null; };
    viewport.addEventListener('touchstart', onTouchStart, { passive: true });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    viewport.addEventListener('touchend', onTouchEnd, { passive: false });
    viewport.addEventListener('touchcancel', onTouchCancel);
    return () => {
      viewport.removeEventListener('touchstart', onTouchStart);
      viewport.removeEventListener('touchmove', onTouchMove);
      viewport.removeEventListener('touchend', onTouchEnd);
      viewport.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [
    dragDownToCloseEnabled, dragDownToCloseThresholdPx, expanded,
    presentationPhase, requestClose,
  ]);

  const handlePanelKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!expanded) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      requestClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]):not([tabindex="-1"]), [href], [tabindex]:not([tabindex="-1"])'),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, [expanded, requestClose]);

  // Non-scroll-driven mode's equivalent of scrollToIndex: no page-scroll
  // target to compute, just commit the index and snap `position` (the
  // MotionValue CoverFlow's transforms track) directly to it. Flushes any
  // still-pending deferred commit from an earlier expanded-list selection
  // first — this interaction (a swipe, or a plain short-list tap) always
  // supersedes it; see flushPendingDeferredCommit's own doc comment.
  const commitIndexDirect = useCallback((index: number) => {
    flushPendingDeferredCommit();
    const clamped = clampIndex(index, itemCount);
    setPosition(clamped);
    onActiveIndexCommit(clamped);
  }, [flushPendingDeferredCommit, itemCount, onActiveIndexCommit]);

  const handleListSelect = useCallback((index: number) => {
    if (index === itemCount) {
      openPanel();
      return;
    }
    const clamped = clampIndex(index, itemCount);
    if (expandedRef.current) {
      // Selecting a row in the expanded/full list collapses it back to the
      // short list, right after committing the pick — closePanel() itself
      // reads expandedSelectionRef.current, so setting it here is all this
      // branch needs to do before handing off to the exact same commit +
      // (in scroll-driven mode) scroll-restoration logic closePanel already
      // owns for every other close path (Escape, backdrop). closePanel
      // deliberately leaves this ref set until the parent prop confirms the
      // choice; clearing it at this boundary lets the first unlock scroll
      // event resurrect the pre-expansion index.
      //
      // Runs the exact same fade-rows-then-fade-panel-then-collapse sequence
      // as a plain close (beginCloseSequence, above requestClose) — the only
      // difference is `commit` also records the picked index, and
      // `afterClosed` schedules the deferred CoverFlow-translate hand-off a
      // row pick needs that a plain close doesn't.
      const commit = () => {
        expandedSelectionRef.current = clamped;
        if (config.scrollDrivenNavigationEnabled || prefersReducedMotion) {
          setPosition(clamped);
        }
        closePanel();
      };
      const afterClosed = () => {
        // SEL-07: hand off. Deferred CoverFlow translate (operator ask):
        // only now, after the panel has fully closed — during which the
        // independent short list underneath has already had this whole
        // fade-out+close window to settle into its own final form — does
        // the covered CoverFlow's own spring animate the card into view.
        // One more short wait (listSettleDurationMs) gives that short-list
        // settle a beat to actually finish before the translate fires,
        // preserving the "list settles, then coverflow catches up" two-beat
        // reveal this was always meant to be. Not scheduled at all under
        // reduced motion (beginCloseSequence skips straight to `commit`,
        // never calling this) or scroll-driven mode (closePanel already
        // commits synchronously there).
        pendingDeferredCommitRef.current = () => {
          if (!config.scrollDrivenNavigationEnabled) {
            setPosition(clamped);
            onActiveIndexCommit(clamped);
          }
        };
        selectSequenceFallbackTimerRef.current = window.setTimeout(() => {
          selectSequenceFallbackTimerRef.current = null;
          const run = pendingDeferredCommitRef.current;
          pendingDeferredCommitRef.current = null;
          run?.();
        }, config.listSettleDurationMs);
      };
      beginCloseSequence(commit, afterClosed);
      return;
    }
    if (config.scrollDrivenNavigationEnabled) {
      scrollToIndex(clamped);
      return;
    }
    commitIndexDirect(clamped);
  }, [
    beginCloseSequence, closePanel, commitIndexDirect, config.listSettleDurationMs,
    config.scrollDrivenNavigationEnabled, itemCount, onActiveIndexCommit, openPanel,
    prefersReducedMotion, scrollToIndex,
  ]);

  const handleCarouselDragEnd = useCallback((velocityX: number) => {
    restoreRootSnapAfterDrag();
    setDragActive(false);
    // See reverseNavigationDirection's own doc comment — same sign flip
    // onDragScroll below applies to a live drag, applied here to its
    // release velocity so a flung swipe keeps resolving to the same
    // on-screen direction the drag itself just moved in.
    const signedVelocityX = reverseNavigationDirection ? -velocityX : velocityX;
    if (config.scrollDrivenNavigationEnabled) {
      const currentPosition = scrollStepPx > 0
        ? (window.scrollY - sectionTop()) / scrollStepPx
        : position;
      const projected = currentPosition - signedVelocityX * 0.002;
      scrollToIndex(Math.round(projected));
      return;
    }
    // Direct-drag mode already kept `position` continuously up to date
    // (see onDragScroll below) — project from that, not from window.scrollY,
    // which no longer has anything to do with the carousel here.
    const projected = position - signedVelocityX * 0.002;
    commitIndexDirect(Math.round(projected));
  }, [
    commitIndexDirect, config.scrollDrivenNavigationEnabled, position,
    restoreRootSnapAfterDrag, reverseNavigationDirection, scrollStepPx, scrollToIndex, sectionTop,
  ]);

  const style = {
    '--mobile-pinned-viewport-height': viewportHeight ?? '100svh',
    '--mobile-pinned-carousel-viewport-top': carouselViewportPlane?.top ?? '0px',
    '--mobile-pinned-carousel-viewport-height': carouselViewportPlane?.height ?? '100svh',
    '--mobile-pinned-carousel-color': carouselColor,
    '--mobile-pinned-panel-color': panelColor,
    '--mobile-pinned-panel-opacity': config.panelOpacity,
    // carouselHeightPercent normally reserves room below the carousel for
    // the short list panel (.shortListPanel/.panel) it shares the sticky
    // viewport with. When listPresentation is 'none' that panel is never
    // rendered at all (tablet's carousel-only mode), so that reservation
    // would otherwise just be dead space under the carousel with nothing
    // occupying it.
    '--mobile-pinned-carousel-percent': listPresentation === 'none' ? 100 : config.carouselHeightPercent,
    '--mobile-pinned-list-percent': config.listHeightPercent,
    '--mobile-pinned-expanded-percent': config.expandedPanelHeightPercent,
    '--mobile-pinned-peek-height': config.peekHeightSvh,
    '--mobile-pinned-expanded-bg-color': config.expandedListBackgroundColor
      || expandedPanelFallbackColor
      || panelColor,
    '--mobile-pinned-expanded-bg-opacity': config.expandedListBackgroundOpacity,
    '--mobile-pinned-expanded-backdrop-blur-px': `${config.expandedListBackdropBlurPx}px`,
    '--mobile-pinned-expanded-carousel-opacity': config.expandedCarouselBehindOpacity,
    // Independent open/close pairs drive the persistent glass surface's
    // height, the card's rotation, and (operator ask) the carousel card's
    // own opacity dimming behind it — all three read as one motion now
    // rather than the card settling on its own separately-paced schedule.
    '--mobile-pinned-panel-expand-ms': `${config.panelExpandDurationMs}ms`,
    '--mobile-pinned-panel-expand-easing': MOBILE_PINNED_ARTICLE_SECTION_EASINGS[config.panelExpandEasing],
    '--mobile-pinned-panel-collapse-ms': `${config.panelCollapseDurationMs}ms`,
    '--mobile-pinned-panel-collapse-easing': MOBILE_PINNED_ARTICLE_SECTION_EASINGS[config.panelCollapseEasing],
    // The extra travel height only exists to give page-scroll something to
    // consume in scroll-driven mode. Off by default: the section is just
    // 100svh, and there's nothing to scroll through to reach any article —
    // they're all reachable via the list or a swipe.
    height: config.scrollDrivenNavigationEnabled
      ? `calc(${viewportHeight ?? '100svh'} + ${Math.max(1, travelPx)}px)`
      : viewportHeight ?? '100svh',
  } as CSSProperties;

  const carouselControls: MobilePinnedCarouselControls = {
    activeIndex: safeActiveIndex,
    position,
    focusProgress,
    animatePosition: expanded || (!config.scrollDrivenNavigationEnabled && !dragActive),
    onIndexRequest: config.scrollDrivenNavigationEnabled ? scrollToIndex : commitIndexDirect,
    onDragScrollStart: () => {
      disableRootSnapForDrag();
      if (!config.scrollDrivenNavigationEnabled) setDragActive(true);
    },
    onDragScroll: deltaX => {
      // See reverseNavigationDirection's own doc comment — a raw pixel
      // delta straight from CoverFlow's own drag (never itself aware of
      // reverseItemOrder, see CoverFlow.tsx's own onDrag) needs this sign
      // flip so it still moves `position` toward whichever on-screen
      // direction the finger/pointer actually dragged.
      const signedDeltaX = reverseNavigationDirection ? -deltaX : deltaX;
      if (config.scrollDrivenNavigationEnabled) {
        window.scrollBy({ top: -signedDeltaX * config.scrollEffortMultiplier, behavior: 'auto' });
        return;
      }
      const step = stepPx > 0 ? stepPx : 1;
      setPosition(current => Math.min(
        Math.max(current - signedDeltaX / step, 0),
        Math.max(itemCount - 1, 0),
      ));
    },
    onDragScrollEnd: handleCarouselDragEnd,
    onGeometryChange: geometry => {
      if (geometry.activeCardWidthPx > 0 && geometry.horizontalStepPx > 0) {
        setStepPx(geometry.horizontalStepPx);
      }
    },
  };

  const renderExpandedListContent = () => (
    expandedDisplayRows !== null
      ? renderList({
        activeIndex: safeActiveIndex,
        presentation: 'expanded',
        rows: expandedDisplayRows,
        onSelect: handleListSelect,
      })
      : renderList({
        activeIndex: safeActiveIndex,
        presentation: 'expanded',
        rows,
        onSelect: handleListSelect,
      })
  );

  const renderShortListContent = () => (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={windowStart}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -14 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : {
              duration: config.listSettleDurationMs / 1000,
              ease: MOTION_EASING_BEZIERS[config.panelCollapseEasing],
            }
        }
      >
        {renderList({
          activeIndex: safeActiveIndex,
          presentation: 'short',
          rows: shortListRows,
          onSelect: handleListSelect,
          onExpand: showExpandRow ? openPanel : undefined,
        })}
      </motion.div>
    </AnimatePresence>
  );

  const renderExpandedList = () => (
    <div
      ref={rowsViewportRef}
      className={
        `${styles.rowsViewport} ${styles.fullListRowsViewport} `
        + `${config.expandedListPaddingTop} ${config.expandedListPaddingRight} `
        + `${config.expandedListPaddingBottom} ${config.expandedListPaddingLeft}`
      }
      tabIndex={-1}
    >
      <div className={styles.timeline}>
        {renderExpandedListContent()}
      </div>
    </div>
  );

  const renderShortList = () => (
    <div
      ref={shortListViewportRef}
      className={`${styles.rowsViewport} ${styles.shortListRowsViewport} ${styles.shortListPadding}`}
      tabIndex={-1}
    >
      <div className={styles.timeline}>
        {renderShortListContent()}
      </div>
    </div>
  );

  const renderSharedGlassList = () => (
    <div
      ref={glassRowsViewportRef}
      className={
        `${styles.rowsViewport} ${styles.sharedGlassListViewport} `
        + (showsFullList ? styles.fullListRowsViewport : styles.shortListRowsViewport)
      }
      data-mobile-pinned-glass-viewport="true"
      data-expanded-content={showsFullList}
      tabIndex={-1}
    >
      {/* Each list owns its own padding on its own dedicated wrapper below —
       * see .shortListPadding's doc comment (styles.module.css) for the
       * regression this fixes: padding used to live on THIS shared outer
       * element, whose class swaps the instant showsFullList flips, so a
       * still-fading-out short list would inherit the full list's padding
       * mid-fade and visibly shrink before the panel had even started
       * growing. Neither wrapper below is reachable from the other's class
       * anymore, regardless of how their mount/unmount timing overlaps. */}
      {showsFullList ? (
        <div
          className={
            `${config.expandedListPaddingTop} ${config.expandedListPaddingRight} `
            + `${config.expandedListPaddingBottom} ${config.expandedListPaddingLeft}`
          }
        >
          <div className={styles.timeline}>
            {renderExpandedListContent()}
          </div>
        </div>
      ) : null}
      {/* Operator ask: the short list fades out/in using the SAME
       * duration/easing as the glass panel's own open/close (not the
       * always-on windowStart settle-fade inside renderShortListContent,
       * which is a separate, unrelated concern — see listSettleDurationMs's
       * own doc comment). Kept mounted through its exit via AnimatePresence
       * instead of the hard swap the ternary above still does for the full
       * list, since a CSS opacity transition can't play across a mount. */}
      <AnimatePresence initial={false}>
        {!showsFullList && (
          <motion.div
            key="mobile-pinned-short-list-fade"
            className={`${styles.shortListFadeLayer} ${styles.shortListPadding}`}
            data-mobile-pinned-short-list-fade="true"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{
              opacity: 1,
              transition: prefersReducedMotion
                ? { duration: 0 }
                : {
                  duration: config.panelCollapseDurationMs / 1000,
                  ease: MOTION_EASING_BEZIERS[config.panelCollapseEasing],
                },
            }}
            // pointerEvents flips to 'none' the instant the exit begins (a
            // plain, non-animated value in the exit target still applies
            // immediately) — the panel is already expanding underneath by
            // then, so this layer is purely a visual fade-out, not tappable.
            exit={prefersReducedMotion ? undefined : {
              opacity: 0,
              pointerEvents: 'none',
              transition: {
                duration: config.panelExpandDurationMs / 1000,
                ease: MOTION_EASING_BEZIERS[config.panelExpandEasing],
              },
            }}
          >
            <div className={styles.timeline}>
              {renderShortListContent()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <section ref={outerRef} className={styles.outer} style={style} data-mobile-pinned-articles="true">
      {config.scrollDrivenNavigationEnabled
        ? Array.from({ length: itemCount }, (_, index) => (
          <span
            key={index}
            className={styles.snapPoint}
            style={{ top: `${index * scrollStepPx}px` }}
            aria-hidden="true"
          />
        ))
        : null}
      <div
        ref={stickyViewportRef}
        className={styles.stickyViewport}
        data-expanded={expanded}
        data-phase={presentationPhase}
        data-viewport-carousel-plane={carouselViewportPlane !== undefined && listPresentation === 'none'}
      >
        <div className={styles.carousel} data-presentation={usesCardFlip ? 'cardFlip' : 'glassPanel'}>
          {listPresentation === 'none' ? renderCarousel(carouselControls) : usesCardFlip ? (
            <div
              ref={flipCardRef}
              className={styles.flipCard}
              data-flipped={cardFlipped}
              data-collapsing={presentationClosing}
            >
              <div className={`${styles.flipFace} ${styles.flipFront}`}>
                {renderCarousel(carouselControls)}
              </div>
              <div
                className={`${styles.flipFace} ${styles.flipBack}`}
                onKeyDown={handlePanelKeyDown}
              >
                {showsFullList ? renderExpandedList() : null}
                {/* Keep the reverse-face control out of the tab order until
                 * the card has actually opened. `backface-visibility: hidden`
                 * only affects paint; it does not make a descendant button
                 * unfocusable, which otherwise lets keyboard users tab into
                 * an invisible Close action on the collapsed card. */}
                {expanded ? (
                  <button
                    type="button"
                    className={styles.flipCloseButton}
                    onClick={requestClose}
                    disabled={presentationClosing}
                  >
                    Close
                  </button>
                ) : null}
              </div>
            </div>
          ) : renderCarousel(carouselControls)}
        </div>
        {listPresentation === 'visible' && expanded ? (
          <div
            className={styles.collapseSurface}
            onClick={requestClose}
            aria-hidden="true"
          />
        ) : null}
        {listPresentation === 'none' ? null : usesCardFlip ? (
          <div className={styles.shortListPanel}>
            {renderShortList()}
          </div>
        ) : (
          <div
            ref={panelRef}
            className={styles.panel}
            data-phase={presentationPhase}
            data-mobile-pinned-glass-panel="true"
            onKeyDown={handlePanelKeyDown}
          >
            <div className={styles.panelGlass} aria-hidden="true" />
            <div className={styles.panelContent}>
              {renderSharedGlassList()}
            </div>
          </div>
        )}
        {listPresentation === 'visible' ? <button
          type="button"
          className={styles.peekTarget}
          data-active={peekActive && !expanded}
          aria-label="Show articles"
          tabIndex={peekActive && !expanded ? 0 : -1}
          onClick={() => window.scrollTo({ top: sectionTop(), behavior: 'smooth' })}
        /> : null}
        {listPresentation === 'visible' ? <div className={styles.announcement} role="status" aria-live="polite" aria-atomic="true">
          {rows[safeActiveIndex]
            ? `Article ${safeActiveIndex + 1} of ${itemCount}: ${rows[safeActiveIndex].caption}`
            : ''}
        </div> : null}
      </div>
    </section>
  );
}
