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

/**
 * SEL-01 (PLAN-MOBILE-ARTICLE-SELECT-MOTION.md v2): the exact final row set
 * the select sequence converges on — computed once, up front, and used as
 * the single source of truth for every later step (no second, independently
 * -computed "settle" pass). Mirrors closePanel's pre-existing post-collapse
 * target (`Math.max(selectedIndex, 0)` as the short list's windowStart)
 * rather than computeWindowStart's Rule A/B/C, so the still-expanded reorder
 * and the eventual collapsed short list converge on the same window.
 */
function computeSelectSurvivors(
  rows: ReadonlyArray<AboutTimelineRowData>,
  selectedIndex: number,
  windowLength: number,
): AboutTimelineRowData[] {
  const start = Math.max(selectedIndex, 0);
  return rows.slice(start, start + windowLength);
}

function cubicBezierCss(easing: readonly [number, number, number, number]): string {
  return `cubic-bezier(${easing.join(', ')})`;
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
  const rowsViewportRef = useRef<HTMLDivElement | null>(null);
  const expandedRef = useRef(false);
  const lockedScrollYRef = useRef(0);
  const sectionDocumentTopRef = useRef(0);
  const [expanded, setExpanded] = useState(false);
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
  const selectMountFrameRef = useRef<number | null>(null);
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
  // ms-timer for STAGE-09's own list-reveal fade-in — gates STAGE-10 (the
  // sentinel mount-in dance), which must not start until the reveal itself
  // has had time to finish.
  const listRevealTimerRef = useRef<number | null>(null);
  // Holds the deferred "commit the new activeIndex to the parent" closure
  // (operator ask: only after the panel has fully collapsed and the short
  // list is back on screen) between when it's scheduled and when it either
  // fires on its own timer or gets flushed early by a newer interaction —
  // see flushPendingDeferredCommit below.
  const pendingDeferredCommitRef = useRef<(() => void) | null>(null);
  expandedDisplayRowsRef.current = expandedDisplayRows;

  const [dragActive, setDragActive] = useState(false);
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

  const openPanel = useCallback(() => {
    flushPendingDeferredCommit();
    if (snapTimerRef.current !== null) {
      window.clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    }
    // Caches the true document top before lockOuterScroll below freezes the
    // page via position:fixed (after which getBoundingClientRect would read
    // the frozen, no-longer-meaningful layout instead). Only meaningful for
    // the scroll-driven restoration math in closePanel().
    if (config.scrollDrivenNavigationEnabled) sectionTop();
    expandedRef.current = true;
    setExpanded(true);
    if (openMountFrameRef.current !== null) {
      window.cancelAnimationFrame(openMountFrameRef.current);
      openMountFrameRef.current = null;
    }
    if (prefersReducedMotion) {
      setExpandedDisplayRows(null);
    } else {
      // STAGE-04: mount every row hidden (opacity 0 only, no
      // scale/transform), no transition yet — a freshly-mounted element has
      // no prior frame to interpolate from.
      setExpandedDisplayRows(rows.map(row => ({ ...row, itemStyle: { opacity: 0 } })));
      openMountFrameRef.current = window.requestAnimationFrame(() => {
        openMountFrameRef.current = null;
        // STAGE-05: flip to visible, staggered item 1 through item N.
        const easingCss = cubicBezierCss(config.expandedEnterEasing);
        setExpandedDisplayRows(rows.map((row, index) => ({
          ...row,
          itemStyle: {
            opacity: 1,
            transition: `opacity ${config.expandedEnterDurationMs}ms ${easingCss} `
              + `${index * config.expandedEnterStaggerMs}ms`,
          },
        })));
      });
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
    config.expandedEnterDurationMs, config.expandedEnterStaggerMs, config.expandedEnterEasing,
    config.scrollDrivenNavigationEnabled, flushPendingDeferredCommit, lockOuterScroll,
    onExpandedChange, prefersReducedMotion, rows, sectionTop,
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
       * restoredScrollY, not win by running last. Focus the rows viewport
       * itself (tabIndex={-1} below) now that there's no longer a dedicated
       * control button to return focus to — it's the container that's
       * actually still on screen and visible right where the user was. */
      rowsViewportRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: restoredScrollY, behavior: 'auto' });
    });
  }, [
    config.scrollDrivenNavigationEnabled, itemCount, onActiveIndexCommit,
    onExpandedChange, prefersReducedMotion, scrollStepPx, sectionTop, unlockOuterScroll,
  ]);

  useEffect(() => () => {
    if (expandedRef.current) unlockOuterScroll();
    restoreRootSnapAfterDrag();
    document.documentElement.removeAttribute('data-mobile-pinned-snap-active');
    if (openMountFrameRef.current !== null) window.cancelAnimationFrame(openMountFrameRef.current);
    if (selectHoldTimerRef.current !== null) window.clearTimeout(selectHoldTimerRef.current);
    if (selectSequenceFallbackTimerRef.current !== null) window.clearTimeout(selectSequenceFallbackTimerRef.current);
    if (selectMountFrameRef.current !== null) window.cancelAnimationFrame(selectMountFrameRef.current);
    if (fadeOutFallbackTimerRef.current !== null) window.clearTimeout(fadeOutFallbackTimerRef.current);
    fadeOutListenerCleanupRef.current?.();
    if (panelCollapseFallbackTimerRef.current !== null) window.clearTimeout(panelCollapseFallbackTimerRef.current);
    panelCollapseListenerCleanupRef.current?.();
    if (listRevealTimerRef.current !== null) window.clearTimeout(listRevealTimerRef.current);
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
      closePanel();
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
  }, [closePanel, expanded]);

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
      // owns for every other close path (control button, Escape, backdrop).
      // closePanel deliberately leaves this ref set until the parent prop
      // confirms the choice; clearing it at this boundary lets the first
      // unlock scroll event resurrect the pre-expansion index.
      //
      // STAGE-06..STAGE-08 (condensed, PLAN-MOBILE-ARTICLE-SELECT-MOTION.md
      // stage table): the ONE persistent expandedDisplayRows list, rendered
      // via a SINGLE renderList/AboutTimeline call (see render below). By
      // the time closePanel runs, the on-screen row content already matches
      // the final collapsed short list, so its own flip to `expanded=false`
      // is purely a physical panel-size transition, not a content change.
      //
      // A rapid re-tap mid-fade-out (a PREVIOUS selection's own STAGE-06 is
      // still in flight) must not leave anything from that stale sequence
      // around to fire later against the new one's own survivors/clamped.
      if (selectHoldTimerRef.current !== null) {
        window.clearTimeout(selectHoldTimerRef.current);
        selectHoldTimerRef.current = null;
      }
      if (selectSequenceFallbackTimerRef.current !== null) {
        window.clearTimeout(selectSequenceFallbackTimerRef.current);
        selectSequenceFallbackTimerRef.current = null;
      }
      if (selectMountFrameRef.current !== null) {
        window.cancelAnimationFrame(selectMountFrameRef.current);
        selectMountFrameRef.current = null;
      }
      if (fadeOutFallbackTimerRef.current !== null) {
        window.clearTimeout(fadeOutFallbackTimerRef.current);
        fadeOutFallbackTimerRef.current = null;
      }
      fadeOutListenerCleanupRef.current?.();
      if (panelCollapseFallbackTimerRef.current !== null) {
        window.clearTimeout(panelCollapseFallbackTimerRef.current);
        panelCollapseFallbackTimerRef.current = null;
      }
      panelCollapseListenerCleanupRef.current?.();
      if (listRevealTimerRef.current !== null) {
        window.clearTimeout(listRevealTimerRef.current);
        listRevealTimerRef.current = null;
      }
      pendingDeferredCommitRef.current = null;
      // Begins the physical panel collapse. Does NOT, on its own, commit the
      // new activeIndex/position to the covered CoverFlow in the default
      // (animated, non-scroll-driven) path — see onActiveIndexCommit's own
      // doc comment and the deferred commit scheduled inside
      // proceedAfterFadeOut below.
      const beginCollapse = () => {
        expandedSelectionRef.current = clamped;
        if (config.scrollDrivenNavigationEnabled || prefersReducedMotion) {
          setPosition(clamped);
        }
        closePanel();
      };
      if (prefersReducedMotion) {
        setExpandedDisplayRows(null);
        beginCollapse();
        return;
      }
      // STAGE-06: the exact final target, computed once up front — the
      // tapped row is already first in this slice (computeSelectSurvivors),
      // so no reordering is ever needed, only a swap once invisible (below).
      const survivors = computeSelectSurvivors(rows, clamped, windowLength);
      const easingCss = cubicBezierCss(config.selectMotionEasing);
      const leaveEasingCss = cubicBezierCss(config.expandedSelectEasing);
      const currentRows = expandedDisplayRowsRef.current ?? rows;
      const rowCount = currentRows.length;
      // STAGE-06: every row stays in the expanded list at its own original
      // position and fades its OPACITY ONLY (no scale/transform) — staggered
      // in the SAME direction as the entrance: item 1 (index 0) starts first
      // (delay 0), the LAST row starts last, so the last row's own fade is
      // what proceedAfterFadeOut (below) waits on before anything else
      // happens. The panel stays open the whole time.
      setExpandedDisplayRows(currentRows.map((row, index) => ({
        ...row,
        itemStyle: {
          opacity: 0,
          transition: `opacity ${config.expandedSelectFadeOutDurationMs}ms ${leaveEasingCss} `
            + `${index * config.expandedSelectStaggerMs}ms`,
          pointerEvents: 'none',
        },
      })));
      const proceedAfterFadeOut = () => {
        // STAGE-07: every row is now fully invisible — swap the array to
        // the final survivor order but KEEP them invisible (a plain,
        // transition-less opacity:0 snap — nothing to see yet, so nothing
        // animates here). Operator ask: "there should be no list visible
        // during the collapse" — the final content must be correct
        // underneath, but stays fully hidden until the panel itself has
        // physically finished moving (STAGE-09 below), not revealed early
        // the way this used to work.
        setExpandedDisplayRows(survivors.map(row => ({ ...row, itemStyle: { opacity: 0 } })));
        selectHoldTimerRef.current = window.setTimeout(() => {
          selectHoldTimerRef.current = null;
          // STAGE-08: begin the panel's own physical collapse. The list
          // stays fully invisible, untouched, for the entire collapse.
          beginCollapse();
          const revealSurvivors = () => {
            // STAGE-09: the panel has genuinely finished collapsing
            // (confirmed below, not guessed) — only now does the final
            // short list fade into view, inside its own already-collapsed
            // container, exactly as it will look from here on.
            setExpandedDisplayRows(survivors.map(row => ({
              ...row,
              itemStyle: {
                opacity: 1,
                transition: `opacity ${config.listSettleDurationMs}ms ${easingCss}`,
              },
            })));
            listRevealTimerRef.current = window.setTimeout(() => {
              listRevealTimerRef.current = null;
              // SEL-06a (STAGE-10): mount the sentinel HIDDEN with no
              // transition yet — a freshly-mounted element has no prior
              // frame to interpolate from, so it needs one committed paint
              // at the hidden state before the next step can flip it to
              // visible with a transition and have that actually animate.
              // The survivor rows themselves drop their itemStyle here too
              // (their own reveal transition has already finished) so
              // they're rendered identically to how the plain flat
              // short-list render will show them a moment later.
              setExpandedDisplayRows([
                ...survivors.map(row => ({ ...row, itemStyle: undefined })),
                { ...expandListSentinelRow, itemStyle: { transform: 'scale(0)', opacity: 0, transformOrigin: 'top left' } },
              ]);
              selectMountFrameRef.current = window.requestAnimationFrame(() => {
                selectMountFrameRef.current = null;
                // SEL-06b: flip to visible — now that a hidden first frame
                // exists, adding `transition` here animates it in.
                setExpandedDisplayRows([
                  ...survivors.map(row => ({ ...row, itemStyle: undefined })),
                  {
                    ...expandListSentinelRow,
                    itemStyle: {
                      transform: 'scale(1)',
                      opacity: 1,
                      transformOrigin: 'top left',
                      transition: `transform ${config.listSettleDurationMs}ms ${easingCss}, `
                        + `opacity ${config.listSettleDurationMs}ms ${easingCss}`,
                    },
                  },
                ]);
                // SEL-07: hand off. Content already matches the final
                // collapsed short list — the actual activeIndex/position
                // commit (and the visible CoverFlow translate it triggers)
                // is scheduled separately below, deferred until the
                // sentinel's own mount-in has had time to finish.
                pendingDeferredCommitRef.current = () => {
                  setExpandedDisplayRows(null);
                  if (!config.scrollDrivenNavigationEnabled) {
                    // Deferred CoverFlow translate (operator ask): only
                    // now, after the panel has fully collapsed and the
                    // short list is back and visible, does the covered
                    // CoverFlow's own spring animate the card into view.
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
              });
            }, config.listSettleDurationMs);
          };
          // STAGE-08/09 boundary: wait for the panel's OWN collapse
          // transition to genuinely finish — the same "listen for the real
          // event, don't guess" approach STAGE-06's fade-out wait already
          // uses. A computed-duration timer alone drove this before, and
          // was doubly wrong: panelCollapseDurationMs never actually
          // controlled the real CSS transition (styles.module.css hard-
          // coded 320ms regardless of this config value — see that rule's
          // own comment, now fixed to read `--mobile-pinned-panel-collapse
          // -ms`), and the survivor list used to be revealed to full
          // opacity immediately, well before this wait even started —
          // together, exactly the "list visible during the collapse" bug
          // this whole restructure fixes.
          const panel = panelRef.current;
          let panelSettled = false;
          const finishPanelCollapse = () => {
            if (panelSettled) return;
            panelSettled = true;
            panelCollapseListenerCleanupRef.current?.();
            panelCollapseListenerCleanupRef.current = null;
            if (panelCollapseFallbackTimerRef.current !== null) {
              window.clearTimeout(panelCollapseFallbackTimerRef.current);
              panelCollapseFallbackTimerRef.current = null;
            }
            revealSurvivors();
          };
          if (config.panelCollapseDurationMs <= 0 || !panel) {
            finishPanelCollapse();
            return;
          }
          const onPanelTransitionEnd = (event: TransitionEvent) => {
            if (event.propertyName !== 'height' || event.target !== panel) return;
            finishPanelCollapse();
          };
          panel.addEventListener('transitionend', onPanelTransitionEnd);
          panelCollapseListenerCleanupRef.current = () => {
            panel.removeEventListener('transitionend', onPanelTransitionEnd);
          };
          panelCollapseFallbackTimerRef.current = window.setTimeout(
            finishPanelCollapse, config.panelCollapseDurationMs + 200,
          );
        }, config.expandedSelectHoldMs);
      };
      // STAGE-06 must genuinely finish — all the way through the LAST
      // staggered row's own fade — before STAGE-07/08 (list swap + panel
      // collapse) may begin. A computed-duration `setTimeout` guess (this
      // component's earlier approach) can fire a few ms early: setTimeout
      // isn't guaranteed to run in lockstep with the CSS engine's own
      // transition clock (browser timer clamping/drift), which is exactly
      // how the panel could start collapsing before the last row had
      // genuinely finished fading — a real, reported gap arithmetic alone
      // couldn't close. Waiting for the row's own `transitionend` event
      // removes the guesswork: the panel does not collapse until the
      // browser itself confirms the fade is done. The timer below is a
      // safety net only (e.g. a browser quirk swallowing the event), not
      // the primary signal.
      const fadeOutTotalMs = config.expandedSelectFadeOutDurationMs
        + Math.max(0, rowCount - 1) * config.expandedSelectStaggerMs;
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
      return;
    }
    if (config.scrollDrivenNavigationEnabled) {
      scrollToIndex(clamped);
      return;
    }
    commitIndexDirect(clamped);
  }, [
    closePanel, commitIndexDirect, config.expandedSelectFadeOutDurationMs, config.expandedSelectStaggerMs,
    config.expandedSelectEasing, config.expandedSelectHoldMs, config.selectMotionEasing,
    config.listSettleDurationMs, config.panelCollapseDurationMs, config.scrollDrivenNavigationEnabled,
    expandListSentinelRow, itemCount, onActiveIndexCommit, openPanel, prefersReducedMotion, rows,
    scrollToIndex, windowLength,
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
    // Drives styles.module.css's own `.panel` height transition duration —
    // see that rule's own comment for why this used to be a no-op knob.
    '--mobile-pinned-panel-collapse-ms': `${config.panelCollapseDurationMs}ms`,
    // The extra travel height only exists to give page-scroll something to
    // consume in scroll-driven mode. Off by default: the section is just
    // 100svh, and there's nothing to scroll through to reach any article —
    // they're all reachable via the list or a swipe.
    height: config.scrollDrivenNavigationEnabled
      ? `calc(100svh + ${Math.max(1, travelPx)}px)`
      : '100svh',
  } as CSSProperties;

  // True while the row list should still read (padding, scroll behavior)
  // as "expanded-style" content — this outlives `expanded` itself:
  // `expanded` flips false the instant the panel's physical collapse
  // starts (STAGE-08), but expandedDisplayRows keeps rendering select-
  // sequence content through that whole collapse and the reveal that
  // follows it, before the flat short-list render finally takes back
  // over. See styles.module.css's own `[data-expanded-content]` rules.
  const showExpandedContentStyling = expanded || expandedDisplayRows !== null;

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
        <div className={styles.carousel}>
          {renderCarousel({
            activeIndex: safeActiveIndex,
            position,
            animatePosition: expanded
              || (!config.scrollDrivenNavigationEnabled && !dragActive),
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
              // No page scroll to convert the gesture into — track the drag
              // directly in `position` (the same MotionValue CoverFlow's
              // transforms already read), 1 card width of drag per index step.
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
          })}
        </div>
        {expanded ? (
          <div
            className={styles.collapseSurface}
            onClick={closePanel}
            aria-hidden="true"
          />
        ) : null}
        <div ref={panelRef} className={styles.panel} data-expanded={expanded} onKeyDown={handlePanelKeyDown}>
          <div
            ref={rowsViewportRef}
            className={
              showExpandedContentStyling
                ? `${styles.rowsViewport} ${config.expandedListPaddingX} ${config.expandedListPaddingY}`
                : styles.rowsViewport
            }
            // BUG FIX (operator-reported, screenshot evidence): the padding
            // CSS rules below key off THIS attribute, not the panel's own
            // `data-expanded` — that one flips to false the instant the
            // physical collapse starts, while this row content needs to
            // keep reading as expanded-style padding through the entire
            // collapse and the reveal that follows it. See
            // styles.module.css's own `[data-expanded-content]` rules for
            // why a second, independent attribute is needed here (a plain
            // CSS-cascade-layers issue, not just a className mismatch).
            data-expanded-content={showExpandedContentStyling}
            tabIndex={-1}
          >
            <div className={styles.timeline}>
              {expandedDisplayRows !== null ? (
                // SEL-01..SEL-07 (PLAN-MOBILE-ARTICLE-SELECT-MOTION.md v4):
                // ONE single renderList/AboutTimeline call for the whole
                // sequence — never split into one AboutTimeline instance per
                // row (that broke this component's own sibling-relative
                // vertical-spacing CSS, `.item:not(:last-child) .row`, since
                // a single-row array is always its own last child, and broke
                // the width cascade the same way). Each row's own
                // `itemStyle` (plain inline style, no Motion, no
                // layout/FLIP, no grid-rows/overflow clipping) drives a
                // genuine CSS transition — `transform: scale()` from a
                // top-left pivot plus opacity, nothing else. Survivors carry
                // no itemStyle and never move; a leaving row's removal from
                // this array (once its shrink finishes) is a plain,
                // unanimated reflow the browser performs on its own.
                renderList({
                  activeIndex: safeActiveIndex,
                  rows: expandedDisplayRows,
                  onSelect: handleListSelect,
                })
              ) : expanded ? (
                renderList({
                  activeIndex: safeActiveIndex,
                  rows,
                  onSelect: handleListSelect,
                })
              ) : (
                // Ordinary (non-select-driven) collapsed navigation — keyed by
                // windowStart, cross-fades as a whole block. Untouched by the
                // v2 select sequence above; still used for plain Escape/
                // backdrop/control-button closes and swipe/keyboard nav.
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={windowStart}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: -14 }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { duration: config.listSettleDurationMs / 1000, ease: config.selectMotionEasing }
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
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          className={styles.peekTarget}
          data-active={peekActive}
          aria-label="Show articles"
          tabIndex={peekActive ? 0 : -1}
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
