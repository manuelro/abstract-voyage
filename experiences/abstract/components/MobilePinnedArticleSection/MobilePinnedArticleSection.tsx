import {
  useCallback,
  useEffect,
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
  CTA_BUTTON_MOTION_EASINGS,
  type CtaButtonMotionEasing,
} from '../../../../components/CtaButton/config/registered';
import {
  normalizeMobilePinnedArticleSectionConfig,
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
};

type ScrollLockSnapshot = {
  bodyCssText: string;
  rootCssText: string;
};

export type MobilePinnedListControls = {
  activeIndex: number;
  /** Already sliced by the caller's own windowing (short list) or the full
   * array (expanded) — see computeWindowStart below. Callers should render
   * this directly rather than re-deriving their own rows array, so the
   * short list's row count always matches what MobilePinnedArticleSection
   * itself decided to show. */
  rows: ReadonlyArray<AboutTimelineRowData>;
  onSelect: (index: number) => void;
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
  config: MobilePinnedArticleSectionConfig;
  /** Fires exactly when the expanded panel opens/closes (openPanel/closePanel
   * below) — lets a caller drive page-level behavior tied to this modal-like
   * reading state, e.g. config.expandedForcesMaxBackgroundDarken
   * (pages/abstract.tsx forces the shared scroll-gradient background to its
   * own max darken while true). Optional; every existing caller not
   * supplying it behaves exactly as before. */
  onExpandedChange?: (expanded: boolean) => void;
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
// Motion's `ease` prop doesn't accept arbitrary CSS strings (no
// `cubic-bezier(...)` passthrough) — only a named keyword or a raw
// [x1,y1,x2,y2] bezier tuple. Same 6 curves as CTA_BUTTON_MOTION_EASINGS
// (components/CtaButton/config/registered.ts), pre-extracted into the tuple
// shape Motion needs; there's no shared bezier-tuple catalog yet, so this
// stays local like every other easing catalog in the codebase.
const MOTION_EASING_BEZIERS: Record<CtaButtonMotionEasing, 'linear' | readonly [number, number, number, number]> = {
  linear: 'linear',
  standard: [0.2, 0, 0, 1],
  expressive: [0.22, 1, 0.36, 1],
  viscous: [0.16, 1, 0.3, 1],
  gentle: [0.33, 1, 0.68, 1],
  gaussian: [0.37, 0, 0.63, 1],
};

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
  config: rawConfig,
  onExpandedChange,
}: MobilePinnedArticleSectionProps) {
  const config = useMemo(
    () => normalizeMobilePinnedArticleSectionConfig(rawConfig),
    [rawConfig],
  );
  const outerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const flipCardRef = useRef<HTMLDivElement | null>(null);
  // The FULL list's own viewport (inside the collapsible panel) — scroll-
  // into-view/focus on open, touch-gesture handling while expanded, and the
  // STAGE-06 fade-out's own transitionend listener all read this one.
  const rowsViewportRef = useRef<HTMLDivElement | null>(null);
  // The SHORT list's own viewport — an entirely separate, always-mounted
  // element living right below the carousel (operator ask: decouple the
  // two lists; the short list must not be part of the collapsible panel).
  // Only used to restore focus there once the panel closes.
  const shortListViewportRef = useRef<HTMLDivElement | null>(null);
  const expandedRef = useRef(false);
  const lockedScrollYRef = useRef(0);
  const sectionDocumentTopRef = useRef(0);
  const [expanded, setExpanded] = useState(false);
  // Regression fix (operator-reported, Chrome/macOS only): this used to be
  // an OPACITY fade (panelFadeOpacity, 1 -> 0 -> 1), then a translate that
  // still animated the panel's own `height` on open (0 -> expanded).
  // Animating `height` on a box that also has `backdrop-filter` forces a
  // relayout every frame while the browser re-samples the blur — a known
  // Chrome/macOS compositor flicker source not present on WebKit or mobile
  // Chrome, matching exactly what was reported (not reproducible in the iOS
  // simulator or on real devices). The panel is now ALWAYS at its full
  // expanded height (styles.module.css) and this is the ONLY thing that
  // moves it: 0 = fully in place/visible, 100 = translated down by its own
  // full height, past `.stickyViewport`'s own `overflow: hidden` bottom
  // edge (hidden). Starts at 100 (hidden) — open slides it to 0, close
  // slides it back to 100 — so unlike the old height/opacity mechanisms,
  // there's no separate "reset after" step: 100 already IS the resting
  // closed state a close transition ends at.
  const [panelSlideOffsetPercent, setPanelSlideOffsetPercent] = useState(100);
  const [panelClosing, setPanelClosing] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [position, setPosition] = useState(activeIndex);
  const [stepPx, setStepPx] = useState(0);
  const [peekActive, setPeekActive] = useState(true);
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
  // A real row in the SAME list AboutTimeline renders — not a separate
  // element beside it — so it gets the exact same marker/spacing/hover/
  // keyboard-nav treatment as every other row, for free, via the same
  // component. `itemCount` (one past the last real index) can never
  // collide with a genuine slideIndex; handleListSelect below checks for
  // it before doing anything else with a clicked/selected index, since
  // clampIndex would otherwise pull it straight back into range.
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

  const openPanel = useCallback(() => {
    flushPendingDeferredCommit();
    cancelInFlightCloseSequence();
    if (snapTimerRef.current !== null) {
      window.clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    }
    // Caches the true document top before lockOuterScroll below freezes the
    // page via position:fixed (after which getBoundingClientRect would read
    // the frozen, no-longer-meaningful layout instead). Only meaningful for
    // the scroll-driven restoration math in closePanel().
    if (config.scrollDrivenNavigationEnabled) sectionTop();
    // Clear any stale panel-expand listener/timer or pending row-entrance
    // delay from a previous open that never got to finish (e.g. a rapid
    // open/close/reopen) — nothing from that earlier attempt should fire
    // late against this fresh one.
    panelExpandListenerCleanupRef.current?.();
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
    expandedRef.current = true;
    setExpanded(true);
    setPanelClosing(false);
    // Give the browser a whole paint with the initial surface before changing
    // its transform on the following frame. A single rAF can collapse the
    // start and end values into one visual frame.
    openMountFrameRef.current = window.requestAnimationFrame(() => {
      openMountFrameRef.current = window.requestAnimationFrame(() => {
        openMountFrameRef.current = null;
        if (usesCardFlip) {
          setCardFlipped(true);
        } else {
          setPanelSlideOffsetPercent(0);
        }
      });
    });
    if (prefersReducedMotion) {
      setExpandedDisplayRows(null);
    } else {
      // STAGE-04: mount every row hidden (opacity 0 only, no
      // scale/transform), no transition yet — a freshly-mounted element has
      // no prior frame to interpolate from. Rows stay hidden until the
      // panel itself is confirmed open (below) — they never fade in
      // against a still-resizing box.
      setExpandedDisplayRows(rows.map(row => ({ ...row, itemStyle: { opacity: 0 } })));
      const beginRowEntrance = () => {
        // STAGE-05: flip to visible — a strict chain reaction, not an
        // arbitrary stagger multiplier: row N starts exactly when row N-1
        // finishes (delay = N * rowFadeInDurationMs), so this one duration
        // fully determines both an individual row's fade and the whole
        // cascade's total length.
        const easingCss = CTA_BUTTON_MOTION_EASINGS[config.rowFadeInEasing];
        setExpandedDisplayRows(rows.map((row, index) => ({
          ...row,
          itemStyle: {
            opacity: 1,
            transition: `opacity ${config.rowFadeInDurationMs}ms ${easingCss} `
              + `${index * config.rowFadeInDurationMs}ms`,
          },
        })));
      };
      const startEntranceAfterDelay = () => {
        if (config.rowFadeInDelayMs <= 0) {
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
        }, config.rowFadeInDelayMs);
      };
      // STAGE-04/05 boundary: wait for the panel's OWN slide-into-view
      // transition to genuinely finish — its real `transitionend`, not a
      // duration guess (the same "listen for the real event" approach the
      // close side already uses) — THEN wait rowFadeInDelayMs, THEN start
      // the row entrance chain.
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
        startEntranceAfterDelay();
      };
      if (config.panelExpandDurationMs <= 0 || !motionSurface) {
        finishPanelExpand();
      } else {
        const onPanelTransitionEnd = (event: TransitionEvent) => {
          if (event.propertyName !== 'transform' || event.target !== motionSurface) return;
          finishPanelExpand();
        };
        motionSurface.addEventListener('transitionend', onPanelTransitionEnd);
        panelExpandListenerCleanupRef.current = () => {
          motionSurface.removeEventListener('transitionend', onPanelTransitionEnd);
        };
        panelExpandFallbackTimerRef.current = window.setTimeout(
          finishPanelExpand, config.panelExpandDurationMs + 200,
        );
      }
    }
    onExpandedChange?.(true);
    lockOuterScroll();
    window.requestAnimationFrame(() => {
      const viewport = rowsViewportRef.current;
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
    cancelInFlightCloseSequence, config.panelExpandDurationMs, config.rowFadeInDelayMs,
    config.rowFadeInDurationMs, config.rowFadeInEasing,
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
      // false flip below — not deferred behind a timer the way v1 did. By
      // the time this runs, the select sequence's own persistent row list
      // (expandedDisplayRows, handleListSelect) has already animated to
      // this exact same order, so there is nothing left to "settle into":
      // shortListRows (windowStart-derived) simply agrees with what's
      // already on screen the moment expandedDisplayRows resets to null and
      // the flat collapsed render takes back over. Deliberately not clamped
      // to itemCount - windowLength: the ask is "always at the top," full
      // stop — see computeSelectSurvivors.
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
      shortListViewportRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: restoredScrollY, behavior: 'auto' });
    });
  }, [
    config.scrollDrivenNavigationEnabled, itemCount, onActiveIndexCommit,
    onExpandedChange, prefersReducedMotion, scrollStepPx, sectionTop, unlockOuterScroll,
  ]);

  // Regression fix (operator-reported): EVERY full-panel collapse — whether
  // triggered by picking a row (handleListSelect) or by a plain close
  // (Escape/backdrop, previously wired straight to closePanel() with no
  // animation at all) — must run the exact same three-beat sequence: (1)
  // every row fades its opacity out top-to-bottom, a strict chain reaction
  // (row N starts exactly when row N-1 finishes), (2) only once the LAST
  // row's own `transitionend` confirms it's fully invisible does the panel
  // itself begin fading out BY OPACITY ONLY (still at full height), (3)
  // only once THAT opacity fade's own `transitionend` confirms it's done
  // does `commit` run and the physical height collapse begin. `commit` is
  // the one piece that differs per caller — setting expandedSelectionRef
  // and (in scroll-driven/reduced-motion mode) `position` for a row pick,
  // or nothing beyond closePanel() itself for a plain close — everything
  // else about the sequence is identical either way.
  const beginCloseSequence = useCallback((commit: () => void, afterClosed?: () => void) => {
    // A rapid re-tap/re-close mid-sequence (a PREVIOUS close's own fade is
    // still in flight) must not leave anything from that stale sequence
    // around to fire later against this new one — same shared reset
    // openPanel uses for the mirror-image case (opening while a previous
    // close is still in flight).
    cancelInFlightCloseSequence();

    // Reduced motion (and the plain-close path never had any of these fades
    // to begin with under it, same as before): skip straight to the commit,
    // no afterClosed dance either — closePanel() itself already commits the
    // new index synchronously under reduced motion/scroll-driven mode, so
    // there's nothing left for a deferred hand-off to do. Still needs to
    // snap the slide offset back to 100 (instantly — prefers-reduced-motion
    // CSS turns the transition off) since that's now the ONLY thing
    // controlling this panel's visibility (see panelSlideOffsetPercent's
    // own doc comment) — data-expanded alone no longer hides it.
    if (prefersReducedMotion) {
      if (usesCardFlip) {
        setCardFlipped(false);
      } else {
        setPanelSlideOffsetPercent(100);
      }
      setPanelClosing(false);
      setExpandedDisplayRows(null);
      commit();
      return;
    }

    // BEAT 1: every row stays at its own original position and fades its
    // OPACITY ONLY (no scale/transform) — a strict chain reaction, not an
    // arbitrary stagger multiplier: row N starts fading out exactly when
    // row N-1 finishes (delay = N * rowFadeOutDurationMs), TOP row (index 0)
    // first, the LAST (bottom) row last, so the last row's own fade is what
    // proceedAfterFadeOut (below) waits on before anything else happens.
    // The panel stays fully open, at full height and opacity, the whole
    // time this runs.
    const leaveEasingCss = CTA_BUTTON_MOTION_EASINGS[config.rowFadeOutEasing];
    const currentRows = expandedDisplayRowsRef.current ?? rows;
    const rowCount = currentRows.length;
    setExpandedDisplayRows(currentRows.map((row, index) => ({
      ...row,
      itemStyle: {
        opacity: 0,
        transition: `opacity ${config.rowFadeOutDurationMs}ms ${leaveEasingCss} `
          + `${index * config.rowFadeOutDurationMs}ms`,
        pointerEvents: 'none',
      },
    })));

    const proceedAfterFadeOut = () => {
      const beginPanelSlide = () => {
        selectHoldTimerRef.current = null;
        // BEAT 2: reverse the selected full-list presentation. Both paths
        // are transform-only: the glass surface travels below the viewport;
        // the opt-in card surface rotates back to its front face.
        setPanelClosing(true);
        if (usesCardFlip) {
          setCardFlipped(false);
        } else {
          setPanelSlideOffsetPercent(100);
        }
        const motionSurface = usesCardFlip ? flipCardRef.current : panelRef.current;
        let settled = false;
        const finishClose = () => {
          if (settled) return;
          settled = true;
          panelCollapseListenerCleanupRef.current?.();
          panelCollapseListenerCleanupRef.current = null;
          if (panelCollapseFallbackTimerRef.current !== null) {
            window.clearTimeout(panelCollapseFallbackTimerRef.current);
            panelCollapseFallbackTimerRef.current = null;
          }
          // Panel is now fully off-screen — `commit` runs the actual
          // close (closePanel flips data-expanded off, swaps the short
          // list's content) entirely behind the clipped viewport, so
          // that swap is never seen either. No slide-offset reset needed:
          // 100 already IS the resting closed value this transition just
          // finished landing on.
          commit();
          setPanelClosing(false);
          setExpandedDisplayRows(null);
          afterClosed?.();
        };
        if (config.panelCollapseDurationMs <= 0 || !motionSurface) {
          finishClose();
          return;
        }
        const onSlideTransitionEnd = (event: TransitionEvent) => {
          if (event.propertyName !== 'transform' || event.target !== motionSurface) return;
          finishClose();
        };
        motionSurface.addEventListener('transitionend', onSlideTransitionEnd);
        panelCollapseListenerCleanupRef.current = () => {
          motionSurface.removeEventListener('transitionend', onSlideTransitionEnd);
        };
        panelCollapseFallbackTimerRef.current = window.setTimeout(
          finishClose, config.panelCollapseDurationMs + 200,
        );
      };
      // A zero hold is a semantic "immediately after the last row" — do not
      // turn it into an extra task/paint with setTimeout(0). That blank frame
      // leaves an empty glass surface on screen before its transform starts,
      // which reads as a flash rather than one continuous collapse.
      if (config.panelCollapseDelayMs <= 0) {
        beginPanelSlide();
        return;
      }
      selectHoldTimerRef.current = window.setTimeout(
        beginPanelSlide, config.panelCollapseDelayMs,
      );
    };

    // BEAT 1 must genuinely finish — all the way through the LAST chained
    // row's own fade — before BEAT 2/3 may begin. A computed-duration
    // `setTimeout` guess (this component's earlier approach) can fire a few
    // ms early: setTimeout isn't guaranteed to run in lockstep with the CSS
    // engine's own transition clock (browser timer clamping/drift), which
    // is exactly how the panel could start fading/collapsing before the
    // last row had genuinely finished — a real, reported gap arithmetic
    // alone couldn't close. Waiting for the row's own `transitionend` event
    // removes the guesswork. The timer below is a safety net only (e.g. a
    // browser quirk swallowing the event), not the primary signal.
    const fadeOutTotalMs = rowCount * config.rowFadeOutDurationMs;
    if (rowCount === 0 || fadeOutTotalMs <= 0) {
      proceedAfterFadeOut();
      return;
    }
    const viewport = rowsViewportRef.current;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      fadeOutListenerCleanupRef.current?.();
      fadeOutListenerCleanupRef.current = null;
      if (fadeOutFallbackTimerRef.current !== null) {
        window.clearTimeout(fadeOutFallbackTimerRef.current);
        fadeOutFallbackTimerRef.current = null;
      }
      proceedAfterFadeOut();
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
      finish();
    };
    viewport?.addEventListener('transitionend', onTransitionEnd);
    fadeOutListenerCleanupRef.current = () => {
      viewport?.removeEventListener('transitionend', onTransitionEnd);
    };
    fadeOutFallbackTimerRef.current = window.setTimeout(finish, fadeOutTotalMs + 200);
  }, [
    cancelInFlightCloseSequence, config.panelCollapseDelayMs, config.panelCollapseDurationMs,
    config.rowFadeOutDurationMs, config.rowFadeOutEasing, prefersReducedMotion, rows, usesCardFlip,
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
    const viewport = rowsViewportRef.current;
    if (!viewport) return undefined;
    let touchY = 0;
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY ?? touchY;
      const pullingPastTop = viewport.scrollTop <= 0 && currentY > touchY;
      const pushingPastBottom =
        viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1
        && currentY < touchY;
      if (pullingPastTop || pushingPastBottom) event.preventDefault();
      touchY = currentY;
    };
    viewport.addEventListener('touchstart', onTouchStart, { passive: true });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      viewport.removeEventListener('touchstart', onTouchStart);
      viewport.removeEventListener('touchmove', onTouchMove);
    };
  }, [expanded]);

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
    // The "Expand list" row's own sentinel slideIndex (see shortListRows
    // above) — must be checked before clampIndex below, which would
    // otherwise pull it straight back into the real [0, itemCount) range.
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
    if (config.scrollDrivenNavigationEnabled) {
      const currentPosition = scrollStepPx > 0
        ? (window.scrollY - sectionTop()) / scrollStepPx
        : position;
      const projected = currentPosition - velocityX * 0.002;
      scrollToIndex(Math.round(projected));
      return;
    }
    // Direct-drag mode already kept `position` continuously up to date
    // (see onDragScroll below) — project from that, not from window.scrollY,
    // which no longer has anything to do with the carousel here.
    const projected = position - velocityX * 0.002;
    commitIndexDirect(Math.round(projected));
  }, [
    commitIndexDirect, config.scrollDrivenNavigationEnabled, position,
    restoreRootSnapAfterDrag, scrollStepPx, scrollToIndex, sectionTop,
  ]);

  const style = {
    '--mobile-pinned-carousel-color': carouselColor,
    '--mobile-pinned-panel-color': panelColor,
    '--mobile-pinned-panel-opacity': config.panelOpacity,
    '--mobile-pinned-carousel-percent': config.carouselHeightPercent,
    '--mobile-pinned-list-percent': config.listHeightPercent,
    '--mobile-pinned-expanded-percent': config.expandedPanelHeightPercent,
    '--mobile-pinned-peek-height': config.peekHeightSvh,
    '--mobile-pinned-expanded-bg-color': config.expandedListBackgroundColor || panelColor,
    '--mobile-pinned-expanded-bg-opacity': config.expandedListBackgroundOpacity,
    '--mobile-pinned-expanded-backdrop-blur-px': `${config.expandedListBackdropBlurPx}px`,
    '--mobile-pinned-expanded-carousel-opacity': config.expandedCarouselBehindOpacity,
    // Two independent duration/easing pairs for the panel's own height
    // transition — open (panelExpandDurationMs/Easing) vs. close
    // (panelCollapseDurationMs/Easing) — since the two are visually and
    // semantically distinct motions. styles.module.css's own
    // `.panel[data-collapsing='true']` selector (driven by
    // panelSlideOffsetPercent below) picks whichever pair actually applies
    // at a given moment. panelCollapseDurationMs/Easing are ALSO reused for
    // .carousel's own opacity-restore transition, so the carousel un-dims
    // in step with the panel sliding away (operator ask).
    '--mobile-pinned-panel-expand-ms': `${config.panelExpandDurationMs}ms`,
    '--mobile-pinned-panel-expand-easing': CTA_BUTTON_MOTION_EASINGS[config.panelExpandEasing],
    '--mobile-pinned-panel-collapse-ms': `${config.panelCollapseDurationMs}ms`,
    '--mobile-pinned-panel-collapse-easing': CTA_BUTTON_MOTION_EASINGS[config.panelCollapseEasing],
    '--mobile-pinned-panel-slide-percent': panelSlideOffsetPercent,
    // The extra travel height only exists to give page-scroll something to
    // consume in scroll-driven mode. Off by default: the section is just
    // 100svh, and there's nothing to scroll through to reach any article —
    // they're all reachable via the list or a swipe.
    height: config.scrollDrivenNavigationEnabled
      ? `calc(100svh + ${Math.max(1, travelPx)}px)`
      : '100svh',
  } as CSSProperties;

  const carouselControls: MobilePinnedCarouselControls = {
    activeIndex: safeActiveIndex,
    position,
    animatePosition: expanded || (!config.scrollDrivenNavigationEnabled && !dragActive),
    onIndexRequest: config.scrollDrivenNavigationEnabled ? scrollToIndex : commitIndexDirect,
    onDragScrollStart: () => {
      disableRootSnapForDrag();
      if (!config.scrollDrivenNavigationEnabled) setDragActive(true);
    },
    onDragScroll: deltaX => {
      if (config.scrollDrivenNavigationEnabled) {
        window.scrollBy({ top: -deltaX * config.scrollEffortMultiplier, behavior: 'auto' });
        return;
      }
      const step = stepPx > 0 ? stepPx : 1;
      setPosition(current => Math.min(
        Math.max(current - deltaX / step, 0),
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

  const renderExpandedList = () => (
    <div
      ref={rowsViewportRef}
      className={
        `${styles.rowsViewport} ${styles.fullListRowsViewport} `
        + `${config.expandedListPaddingX} ${config.expandedListPaddingY}`
      }
      tabIndex={-1}
    >
      <div className={styles.timeline}>
        {expandedDisplayRows !== null
          ? renderList({
            activeIndex: safeActiveIndex,
            rows: expandedDisplayRows,
            onSelect: handleListSelect,
          })
          : renderList({
            activeIndex: safeActiveIndex,
            rows,
            onSelect: handleListSelect,
          })}
      </div>
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
      <div className={styles.stickyViewport} data-expanded={expanded}>
        <div className={styles.carousel} data-presentation={usesCardFlip ? 'cardFlip' : 'glassPanel'}>
          {usesCardFlip ? (
            <div
              ref={flipCardRef}
              className={styles.flipCard}
              data-flipped={cardFlipped}
              data-collapsing={panelClosing}
            >
              <div className={`${styles.flipFace} ${styles.flipFront}`}>
                {renderCarousel(carouselControls)}
              </div>
              <div
                className={`${styles.flipFace} ${styles.flipBack}`}
                onKeyDown={handlePanelKeyDown}
              >
                {expanded || expandedDisplayRows !== null ? renderExpandedList() : null}
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
                    disabled={panelClosing}
                  >
                    Close
                  </button>
                ) : null}
              </div>
            </div>
          ) : renderCarousel(carouselControls)}
        </div>
        {expanded ? (
          <div
            className={styles.collapseSurface}
            onClick={requestClose}
            aria-hidden="true"
          />
        ) : null}
        {/* DECOUPLED (operator ask): the short list is its own independent
         * element, always mounted right below the carousel — it is never
         * nested inside, or otherwise part of, the collapsible full-list
         * panel below. Its own cross-fade settle animation is unaffected
         * by anything the full-list panel is doing. */}
        <div className={styles.shortListPanel}>
          <div
            ref={shortListViewportRef}
            className={`${styles.rowsViewport} ${styles.shortListRowsViewport}`}
            tabIndex={-1}
          >
            <div className={styles.timeline}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={windowStart}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -14 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      // Reuses panelCollapseEasing (see that field's own doc
                      // comment) — this settle is triggered by the same
                      // closePanel() call that starts the panel's own close
                      // transition, so the two read as one motion.
                      : { duration: config.listSettleDurationMs / 1000, ease: MOTION_EASING_BEZIERS[config.panelCollapseEasing] }
                  }
                >
                  {renderList({
                    activeIndex: safeActiveIndex,
                    // shortListRows already includes the "Expand list"
                    // sentinel row appended to the end when showExpandRow
                    // is true — it's rendered by AboutTimeline itself as a
                    // real row, not by this component as a separate
                    // element beside the list.
                    rows: shortListRows,
                    onSelect: handleListSelect,
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
        {!usesCardFlip ? (
          <div
            ref={panelRef}
            className={styles.panel}
            data-expanded={expanded}
            data-collapsing={panelClosing}
            onKeyDown={handlePanelKeyDown}
          >
            {expanded || expandedDisplayRows !== null ? renderExpandedList() : null}
          </div>
        ) : null}
        <button
          type="button"
          className={styles.peekTarget}
          data-active={peekActive && !expanded}
          aria-label="Show articles"
          tabIndex={peekActive && !expanded ? 0 : -1}
          onClick={() => window.scrollTo({ top: sectionTop(), behavior: 'smooth' })}
        />
        <div className={styles.announcement} role="status" aria-live="polite" aria-atomic="true">
          {rows[safeActiveIndex]
            ? `Article ${safeActiveIndex + 1} of ${itemCount}: ${rows[safeActiveIndex].caption}`
            : ''}
        </div>
      </div>
    </section>
  );
}
