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

// Matches .panel's own `transition: height 320ms ...` (styles.module.css) —
// the delay before the post-collapse settle motion (see closePanel) starts,
// so it visibly begins only once the collapse itself has finished, not
// concurrently with it.
const PANEL_COLLAPSE_TRANSITION_MS = 320;
// Same cubic-bezier the panel's own CSS transition already uses, applied
// here to the settle motion's own transform/opacity so both read as one
// consistent motion language rather than two different easing curves.
const LIST_SETTLE_EASING: [number, number, number, number] = [0.22, 1, 0.36, 1];
const LIST_SETTLE_DURATION_S = 0.42;

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
  // row in the expanded list — and closePanel()'s own reveal of the
  // (until-now covered) CoverFlow depends on the caller's activeIndex
  // already reflecting that tap by the time expanded flips false. A
  // deferred update here can lose that race; see the call sites below.
  onActiveIndexCommit: (index: number) => void;
  renderCarousel: (controls: MobilePinnedCarouselControls) => ReactNode;
  renderList: (controls: MobilePinnedListControls) => ReactNode;
  carouselColor: string;
  panelColor: string;
  config: MobilePinnedArticleSectionConfig;
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
}: MobilePinnedArticleSectionProps) {
  const config = useMemo(
    () => normalizeMobilePinnedArticleSectionConfig(rawConfig),
    [rawConfig],
  );
  const outerRef = useRef<HTMLElement | null>(null);
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
  const restoredIndexRef = useRef<number | null>(null);
  /* React state updates from the page are intentionally transitioned. Keep
   * the expanded-list choice here until that transition lands, otherwise the
   * first scroll event after unlocking can briefly see the old last index and
   * write it back over the restored page position. */
  const expandedSelectionRef = useRef<number | null>(null);
  // True for the brief window between "panel finished collapsing" and "the
  // settle-to-top motion below has run" — see closePanel. While true, the
  // window-tracking effect further down leaves `windowStart` alone, so the
  // short list keeps showing exactly the ordering it had before the panel
  // opened (not yet reflecting the new selection) until the settle motion
  // explicitly takes over.
  const settlingAfterSelectionRef = useRef(false);
  const settleTimerRef = useRef<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

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
      // Skip the general auto-recompute while the post-expanded-selection
      // settle sequence (closePanel -> the timer below) owns windowStart —
      // it deliberately keeps the pre-expansion window on screen for a beat
      // before animating to the new one itself; this generic effect jumping
      // in first (activeIndex has already changed by this point) would pre-
      // empt that with an instant, unanimated recompute.
      if ((shapeChanged || outOfBounds) && !settlingAfterSelectionRef.current) {
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
  const shortListRows = useMemo(() => {
    const windowed = rows.slice(windowStart, windowStart + windowLength);
    if (!showExpandRow) return windowed;
    // A real row in the SAME list AboutTimeline renders — not a separate
    // element beside it — so it gets the exact same marker/spacing/hover/
    // keyboard-nav treatment as every other row, for free, via the same
    // component. `itemCount` (one past the last real index) can never
    // collide with a genuine slideIndex; handleListSelect below checks for
    // it before doing anything else with a clicked/selected index, since
    // clampIndex would otherwise pull it straight back into range.
    return [...windowed, { caption: 'Expand list', slideIndex: itemCount }];
  }, [itemCount, rows, showExpandRow, windowStart, windowLength]);
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

  useEffect(() => {
    // Deep-linking to an #article-<slug> hash still seeds the correct
    // activeIndex (useArticleHashSync, pages/abstract.tsx — page-level,
    // unaffected by this flag). This effect only physically scrolls the
    // page down to reveal it, which is meaningless once scroll no longer
    // drives what the carousel shows — it's already visible immediately.
    if (!config.scrollDrivenNavigationEnabled) return undefined;
    if (scrollStepPx <= 0 || safeActiveIndex <= 0) return undefined;
    if (!window.location.hash.startsWith('#article-')) return undefined;
    if (restoredIndexRef.current === safeActiveIndex) return undefined;
    const timer = window.setTimeout(() => {
      if (window.scrollY + 1 >= sectionTop()) return;
      restoredIndexRef.current = safeActiveIndex;
      scrollToIndex(safeActiveIndex, 'auto');
    }, 120);
    return () => window.clearTimeout(timer);
  }, [config.scrollDrivenNavigationEnabled, safeActiveIndex, scrollStepPx, scrollToIndex, sectionTop]);

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

  const openPanel = useCallback(() => {
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
  }, [config.scrollDrivenNavigationEnabled, lockOuterScroll, sectionTop]);

  const closePanel = useCallback(() => {
    const selectedIndex = expandedSelectionRef.current;
    if (selectedIndex !== null) {
      /* Reassert the expanded choice at the handoff boundary, urgently (not
       * onActiveIndexChange): setExpanded(false) below is itself urgent and
       * reveals the covered CoverFlow immediately on commit. CoverFlow's
       * transform-driven position already tracks this component's own
       * `position` state correctly, but its isActive/distanceFromActive
       * styling reads the caller's activeIndex prop directly — if that were
       * still catching up via a deferred transition when the reveal render
       * lands, the just-revealed carousel would flash the previous row's
       * active styling instead of the one just selected. */
      onActiveIndexCommit(selectedIndex);
      expandedSelectionRef.current = null;
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
      // Land back on the exact short-list ordering the user saw before they
      // opened the panel (the window-tracking effect above is told to stand
      // down via the ref while this is true), then — once the collapse
      // transition below has actually finished, not concurrently with it —
      // smoothly settle the list onto the new selection at the top slot.
      settlingAfterSelectionRef.current = true;
      if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
      const settleDelayMs = prefersReducedMotion ? 0 : PANEL_COLLAPSE_TRANSITION_MS;
      settleTimerRef.current = window.setTimeout(() => {
        settleTimerRef.current = null;
        settlingAfterSelectionRef.current = false;
        // Deliberately not clamped to itemCount - windowLength: the ask is
        // "always at the top," full stop, not "at the top unless that would
        // leave fewer than N rows after it" (that latter, softer rule is
        // computeWindowStart's Rule A/B/C, used for ordinary navigation
        // elsewhere in this component, not here). Near the true end of the
        // list this does mean the settled short list shows fewer than N
        // rows — selectedIndex still lands at position 0 either way, since
        // shortListRows.slice() below simply truncates rather than erroring.
        setWindowStart(Math.max(selectedIndex, 0));
      }, settleDelayMs);
    }
    expandedRef.current = false;
    setExpanded(false);
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
    config.scrollDrivenNavigationEnabled, itemCount, onActiveIndexCommit, prefersReducedMotion,
    scrollStepPx, sectionTop, unlockOuterScroll, windowLength,
  ]);

  useEffect(() => () => {
    if (expandedRef.current) unlockOuterScroll();
    restoreRootSnapAfterDrag();
    document.documentElement.removeAttribute('data-mobile-pinned-snap-active');
    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
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
  // MotionValue CoverFlow's transforms track) directly to it.
  const commitIndexDirect = useCallback((index: number) => {
    const clamped = clampIndex(index, itemCount);
    setPosition(clamped);
    onActiveIndexCommit(clamped);
  }, [itemCount, onActiveIndexCommit]);

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
      expandedSelectionRef.current = clamped;
      setPosition(clamped);
      closePanel();
      return;
    }
    if (config.scrollDrivenNavigationEnabled) {
      scrollToIndex(clamped);
      return;
    }
    commitIndexDirect(clamped);
  }, [closePanel, commitIndexDirect, config.scrollDrivenNavigationEnabled, itemCount, openPanel, scrollToIndex]);

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
    // The extra travel height only exists to give page-scroll something to
    // consume in scroll-driven mode. Off by default: the section is just
    // 100svh, and there's nothing to scroll through to reach any article —
    // they're all reachable via the list or a swipe.
    height: config.scrollDrivenNavigationEnabled
      ? `calc(100svh + ${Math.max(1, travelPx)}px)`
      : '100svh',
  } as CSSProperties;

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
        <div className={styles.panel} data-expanded={expanded} onKeyDown={handlePanelKeyDown}>
          <div ref={rowsViewportRef} className={styles.rowsViewport} tabIndex={-1}>
            <div className={styles.timeline}>
              {expanded ? (
                renderList({
                  activeIndex: safeActiveIndex,
                  rows,
                  onSelect: handleListSelect,
                })
              ) : (
                // Keyed by windowStart, not by anything reflecting the
                // in-progress selection: settlingAfterSelectionRef (closePanel)
                // holds this key at its pre-expansion value across the
                // collapse itself, so nothing animates here until the
                // deliberate settle step changes it afterward — that's what
                // makes the motion happen strictly after the collapse, not
                // during it.
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={windowStart}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: -14 }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { duration: LIST_SETTLE_DURATION_S, ease: LIST_SETTLE_EASING }
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
