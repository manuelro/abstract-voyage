import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export type FixedViewportColumnLayout = {
  /** Attach to a normal-flow anchor element sitting where the fixed content
   * region lives in the page — its own Tailwind-class-constrained width IS
   * the fixed layer's own width (see this hook's own doc comment for why
   * that must be measured, not derived), and its live horizontal viewport
   * position (left, not top — the fixed layer's own top is fixedTopPx, not
   * the anchor's own top) is what the fixed layer anchors its geometry to.
   * The anchor itself never needs a height. */
  anchorRef: (element: HTMLDivElement | null) => void;
  /** Viewport-relative geometry a fixed-position content layer should use —
   * left/width taken from the anchor's live getBoundingClientRect (not a CSS
   * percentage, since a position: fixed element is outside any
   * percentage-of-parent chain). fixedTopPx is headerOffsetPx (0 by
   * default) and fixedHeightPx is the real, current window.innerHeight
   * minus that offset — the content spans the true, full viewport by
   * default, passing underneath a non-space-reserving header via z-index
   * rather than being pushed down by it; a nonzero headerOffsetPx (the
   * column's own header behavior reserving real space) shifts both
   * down/shorter by that same amount instead. */
  fixedLeftPx: number;
  fixedTopPx: number;
  fixedWidthPx: number;
  fixedHeightPx: number;
  /** Full current window.innerWidth — wider than fixedWidthPx (the anchor's
   * own column width), for a caller that needs extra horizontal clip room
   * beyond the exact anchor width (e.g. a neighbor element rotated in 3D
   * whose projected edge overshoots the anchor's own unrotated bounding
   * box) without widening the anchor-aligned box itself. */
  pageWidthPx: number;
  /** The site <header>'s own live getBoundingClientRect().bottom — for
   * positioning content relative to the header's real, current geometry
   * instead of a guessed offset that only looks right until the header's
   * own height changes. */
  headerBottomPx: number;
};

/**
 * Generic geometry for column content that needs to escape normal document
 * flow and pin itself to the true browser viewport instead — extracted from
 * experiences/abstract/components/SplitColumnCardPreview/hooks/
 * useCardStackLayout.ts (that hook's own measurement half; see its own doc
 * comment for the card-specific math — aspect ratio, row pitch, above/below
 * counts — layered on top there, which stays page-specific and is not part
 * of this generic extraction). Two cooperating pieces make this work, both
 * driven from this hook's own anchorRef:
 *
 * 1. A zero-height anchor marker sits in the column's normal flow — its own
 *    Tailwind-class-constrained width becomes the fixed layer's width,
 *    live-measured via getBoundingClientRect (never derived from available
 *    height or a CSS percentage, since position: fixed has no
 *    percentage-of-parent chain to inherit a width from).
 * 2. The real content renders as position: fixed, sized from that
 *    measurement plus the true viewport height — outside document flow
 *    entirely, so it can never make the page taller, and (with
 *    headerOffsetPx left at its 0 default) spans the full viewport top to
 *    bottom, passing underneath the header via z-index rather than being
 *    blocked by it.
 *
 * Re-measures on window resize, on the anchor's own ResizeObserver, and
 * (via a layout effect with no dependency array, so it runs after every
 * render) on any other layout shift neither of those two fire for — e.g. a
 * parent margin class flipping between mr-auto/ml-auto/mx-auto moves the
 * anchor without resizing the window or the element itself.
 */

// Sub-pixel tolerance for the rect-changed check in `measure` below — a
// fluid, calc()-derived anchor width (e.g. a `w-full` Tailwind class
// resolving against a `calc(100% * 38/62)`-capped ancestor, as used by
// SplitColumnCardPreview's own stack-mode card) can legitimately measure a
// hairline-different float between successive layout passes — the same
// real geometry, rounded slightly differently by the browser's layout
// engine, not an actual position/size change. Half a pixel is well below
// anything visually meaningful for a `position: fixed` layer's own
// geometry. A fixed-pixel Tailwind width token (e.g. `w-96` = 384px) never
// exhibits this — same exact float every render regardless of any
// ancestor's own layout.
const RECT_TOLERANCE_PX = 0.5;

export function useFixedViewportColumnLayout(headerOffsetPx = 0): FixedViewportColumnLayout {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = useState({ left: 0, width: 0 });
  const [viewportHeightPx, setViewportHeightPx] = useState(0);
  const [pageWidthPx, setPageWidthPx] = useState(0);
  const [headerBottomPx, setHeaderBottomPx] = useState(0);

  // Last-measured values, tracked in a ref rather than only inferred from
  // state — the layout effect below runs on *every* render (see its own
  // doc comment) and calls measure() each time; confirmed root cause of a
  // real "Maximum update depth exceeded" crash: even a setState call whose
  // functional updater bails out to the *same* reference still costs one
  // extra render before React can confirm nothing changed (documented React
  // behavior — "your component will still re-render once" — see
  // https://react.dev/reference/react/useState#bailing-out-of-a-state-update).
  // That one extra render re-runs this same no-deps layout effect, which
  // calls measure() again, which calls setState again — a genuine infinite
  // loop for *any* value if every measure() pass unconditionally calls
  // every setter, since each pass, even a no-op one, buys itself "one more
  // render" forever. Comparing against this ref *before* ever calling a
  // setter (instead of always calling it and letting a functional updater
  // decide whether to bail out) means a stable measurement costs zero
  // setState calls, not one that bails out — breaking the chain at its
  // root rather than only softening its landing.
  const lastMeasuredRef = useRef({
    left: 0, width: 0, viewportHeightPx: 0, pageWidthPx: 0, headerBottomPx: 0,
  });

  const measure = useCallback(() => {
    if (typeof window === 'undefined') return;
    const last = lastMeasuredRef.current;
    const element = elementRef.current;
    if (element) {
      const box = element.getBoundingClientRect();
      if (
        Math.abs(last.left - box.left) >= RECT_TOLERANCE_PX
        || Math.abs(last.width - box.width) >= RECT_TOLERANCE_PX
      ) {
        last.left = box.left;
        last.width = box.width;
        setRect({ left: box.left, width: box.width });
      }
    }
    const visualViewport = window.visualViewport;
    const innerHeight = visualViewport?.height ?? window.innerHeight;
    const innerWidth = visualViewport?.width ?? window.innerWidth;
    const headerEl = document.querySelector('header');
    const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : 0;
    if (last.viewportHeightPx !== innerHeight) {
      last.viewportHeightPx = innerHeight;
      setViewportHeightPx(innerHeight);
    }
    if (last.pageWidthPx !== innerWidth) {
      last.pageWidthPx = innerWidth;
      setPageWidthPx(innerWidth);
    }
    if (last.headerBottomPx !== headerBottom) {
      last.headerBottomPx = headerBottom;
      setHeaderBottomPx(headerBottom);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('scroll', measure);
    const observer = typeof ResizeObserver === 'function'
      ? new ResizeObserver(measure)
      : null;
    if (observer && elementRef.current) observer.observe(elementRef.current);

    return () => {
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [measure]);

  // The anchor's own *position* (not just its size) can shift for reasons
  // neither `resize` nor `ResizeObserver` ever fire for — e.g. a parent
  // margin class flipping between mr-auto/ml-auto/mx-auto moves this
  // element without resizing the window or the element itself. Re-measuring
  // after every render (via a *layout* effect, so it reads the real
  // post-paint DOM position before the browser has a chance to visibly
  // flash the stale one) catches this and every other non-resize layout
  // shift generically, without needing every possible cause threaded down
  // as an explicit dependency.
  useIsomorphicLayoutEffect(() => {
    measure();
  });

  const anchorRef = useCallback((element: HTMLDivElement | null) => {
    elementRef.current = element;
  }, []);

  const fixedHeightPx = Math.max(0, viewportHeightPx - headerOffsetPx);

  // Memoized for the same reason useSplitColumnNavAlignment's own return
  // value is: a caller that feeds this object into a dependency array or
  // React state must get a stable reference when nothing actually changed,
  // or every render produces a new object, which (fed into setState)
  // re-triggers a render, which recomputes this hook, which produces
  // another new object — forever.
  return useMemo(() => ({
    anchorRef,
    fixedLeftPx: rect.left,
    fixedTopPx: headerOffsetPx,
    fixedWidthPx: rect.width,
    fixedHeightPx,
    pageWidthPx,
    headerBottomPx,
  }), [anchorRef, rect.left, rect.width, headerOffsetPx, fixedHeightPx, pageWidthPx, headerBottomPx]);
}
