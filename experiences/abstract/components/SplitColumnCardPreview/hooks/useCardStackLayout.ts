import {
  useFixedViewportColumnLayout,
} from '../../SplitColumnPageShell/hooks/useFixedViewportColumnLayout';
import { MD_BREAKPOINT_PX } from '../../../../../components/breakpoints';

// PLAN-EDITORIAL-HERO-UNIFICATION-AND-CARDSTACK-RESIZE-FIX.md Part 1 — was
// a *second*, independently-triggered `matchMedia('(max-width: 767px)')`
// listener (ABSTRACT-01 fix, 2026-08-20-139d957) living alongside
// useFixedViewportColumnLayout's own resize/ResizeObserver/layout-effect
// measurement below. Two separate native event sources reacting to the
// same physical resize have no ordering guarantee relative to each other —
// a resize crossing (or landing near) the 768px boundary could render one
// frame where `stacked` had already flipped but the measured geometry
// hadn't caught up yet, or vice versa, briefly computing `.viewport`/
// `.column` position from a genuinely mismatched stacked+geometry
// combination (confirmed-possible via code inspection; not reliably
// reproducible via automated resize during this investigation — Playwright's
// discrete `setViewportSize` doesn't replicate a real, continuous OS
// drag-resize's paint timing). Removed the second source entirely: `stacked`
// is now derived from the exact same `pageWidthPx` measurement every other
// value in this hook already reads, on the exact same render, so there is
// no window for the two to disagree. `> 0` guards the pre-measurement
// initial value (0, until the first layout effect runs) from reading as
// "stacked" — matches useIsStackedColumnLayout's own `false` initial
// default this replaces.
// Not a hook (no internal state/effects left) — matches this file's own
// resolveStackRowsPerSide/resolveCardStackHorizontalGeometry naming for a
// pure derivation, renamed from useIsStackedColumnLayout accordingly.
function resolveIsStackedColumnLayout(pageWidthPx: number): boolean {
  return pageWidthPx > 0 && pageWidthPx < MD_BREAKPOINT_PX;
}

export type CardStackLayout = {
  /** Attach to a normal-flow anchor element sitting where the card region
   * lives in the page — its own Tailwind-class-constrained width IS the
   * card's width (see this hook's own doc comment for why that must never
   * be derived down from available height), and its live horizontal
   * viewport position (left, not top — the fixed card layer starts at the
   * true top of the browser window, see `fixedTopPx` below) is what the
   * fixed card layer anchors its geometry to. The anchor itself never
   * needs a height. */
  anchorRef: (element: HTMLDivElement | null) => void;
  cardWidthPx: number;
  cardHeightPx: number;
  rowPitchPx: number;
  /** How many neighbor rows are rendered above/below the active row — sized
   * generously (enough to cover the real available height plus one partial
   * row past each edge) so the stack visually fills the space, but this is
   * a rendering count, not a promise about card size: it never shrinks the
   * card to force a minimum count. At the actual start/end of the list
   * there may be nothing to show above/below regardless of how generous
   * this is — a real absence of data, not a layout failure. */
  aboveCount: number;
  belowCount: number;
  /** Viewport-relative geometry the fixed card layer should use — left/
   * width taken from the anchor's live getBoundingClientRect (not a CSS
   * percentage, since the card layer itself is `position: fixed` and
   * therefore outside any percentage-of-parent chain). `fixedTopPx` is 0
   * and `fixedHeightPx` is the real, current `window.innerHeight` whenever
   * the caller's `headerOffsetPx` argument is 0 (this hook's own default,
   * and the only behavior that existed before that argument did) — the
   * stack is edge-to-edge with the actual browser viewport, passing
   * *underneath* the site header via z-index (see CardStack.tsx) rather
   * than stopping short of it. An earlier round anchored this below the
   * tabs row instead, to avoid the active card overlapping them — that
   * turned out to be unnecessary once the tabs themselves also became part
   * of this fixed overlay (see CardStack.tsx) instead of competing
   * normal-flow content above it. A nonzero `headerOffsetPx` (the card
   * column opting into SplitColumnLayoutConfig's `wideColumnHeaderBehavior:
   * 'pushDown'`) shifts both down/shorter by that same amount instead, so
   * the stack starts below the header rather than underneath it — the
   * fixed layer has no other way to find out its column chose to reserve
   * that space, since it's positioned outside document flow and therefore
   * never inherits it from its own (zero-height) anchor's own box. */
  fixedLeftPx: number;
  fixedTopPx: number;
  fixedWidthPx: number;
  fixedHeightPx: number;
  /** Full current `window.innerWidth` — see this hook's own doc comment
   * ("clip region vs. hit-test region") for why `.viewport` itself (the
   * *clipping* box) needs this instead of `fixedWidthPx` (the *card
   * column's* own width, still used for the hit-testable `.column` inside
   * it and for the arrow group's position). */
  pageWidthPx: number;
  /** The anchor's real viewport-relative left edge and the browser's full
   * inline width. Mobile Embla uses these independently from fixedLeftPx/
   * pageWidthPx so its clipping viewport can span the screen while each
   * card retains the configured anchor width. */
  anchorViewportLeftPx: number;
  browserWidthPx: number;
  /** The site `<header>`'s own live `getBoundingClientRect().bottom` — see
   * this hook's own doc comment ("tabs/arrows vs. the header's hit-box")
   * for why the tab row and arrow group need this instead of a hardcoded
   * top offset. */
  headerBottomPx: number;
  /** True below the 768px stacked breakpoint (SplitColumnLayout's own
   * unconditional grid-cols-1 base — a plain-JS matchMedia mirror of that
   * CSS class, since this hook's own fixed*Px geometry is consumed as
   * inline style/layout math, not CSS, and therefore can't react to a
   * Tailwind `md:` class directly). ABSTRACT-01 fix (2026-08-20-139d957):
   * CardStack.tsx uses this to switch its card layer from position:fixed
   * (viewport-anchored, correct at >=768px where the two columns sit
   * side by side and the layer needs to span the *entire* real viewport
   * to pass under the header across both) to position:absolute anchored
   * to its own normal-flow anchor element instead — below 768px the two
   * columns stack top to bottom, so a full-viewport-fixed layer
   * necessarily overlaps whatever normal-flow narrow-column content the
   * page has already scrolled past. See CardStack.tsx's own render call
   * site for the full mechanism. */
  stacked: boolean;
};

export type CardStackHorizontalGeometry = {
  leftPx: number;
  widthPx: number;
};

// cardstack-neighbor-row-cap (feature-development batch
// 2026-08-22-cardstack-mobile-swipe, F3): stacked/mobile's own row count
// used to be sized from `fixedHeightPx` unconditionally, the same
// "generously fill the pinned window" math desktop's `position: fixed`
// interaction needs — but once stacked (`position: absolute`, ordinary
// scrolling content, ABSTRACT-01), each extra row is that much *real,
// scrollable* dead space, not a hidden-until-scrolled-to decorative reveal.
// 0 (PLAN-CARDSTACK-MOBILE-NEIGHBOR-ROWS.md's own recommendation): only the
// active card renders below 768px — the interaction those extra rows exist
// for doesn't apply there, so there is nothing to size them against.
export const STACKED_NEIGHBOR_ROWS_PER_SIDE = 0;

/**
 * Row count per side, extracted as its own pure function (same reasoning
 * `resolveCardStackHorizontalGeometry` above already established for this
 * file's geometry math) so the `stacked` gate is unit-testable without
 * rendering the hook itself.
 */
export function resolveStackRowsPerSide({
  stacked,
  fixedHeightPx,
  rowPitchPx,
}: {
  stacked: boolean;
  fixedHeightPx: number;
  rowPitchPx: number;
}): number {
  if (stacked) return STACKED_NEIGHBOR_ROWS_PER_SIDE;
  // Generous on purpose: +1 past however many rows the real height holds,
  // on each side, so a partially-visible neighbor always peeks in at the
  // edge (including sliding behind the header) rather than the stack
  // ending abruptly. This never feeds back into cardWidthPx/cardHeightPx.
  return Math.ceil(fixedHeightPx / 2 / rowPitchPx) + 1;
}

/**
 * Hard containment boundary for measured fixed card geometry. Configuration
 * may request a fixed width, but it cannot place the active card outside the
 * usable viewport. Decorative neighbor overshoot remains the responsibility
 * of the wider, pointer-transparent clip layer.
 */
export function resolveCardStackHorizontalGeometry({
  fixedLeftPx,
  fixedWidthPx,
  pageWidthPx,
}: {
  fixedLeftPx: number;
  fixedWidthPx: number;
  pageWidthPx: number;
}): CardStackHorizontalGeometry {
  const safePageWidthPx = Math.max(0, pageWidthPx);
  const leftPx = Math.min(safePageWidthPx, Math.max(0, fixedLeftPx));
  const availableWidthPx = Math.max(0, safePageWidthPx - leftPx);
  return {
    leftPx,
    widthPx: Math.min(Math.max(0, fixedWidthPx), availableWidthPx),
  };
}

/**
 * Layout math for the vertical card stack. Composes the generic
 * `useFixedViewportColumnLayout` (components/SplitColumnPageShell/
 * useFixedViewportColumnLayout.ts) for the anchor/viewport measurement half
 * — extracted from this hook so any column's content, not just the card
 * stack, can get the same "escape document flow, pin to the true viewport"
 * behavior without re-deriving it. Everything below is this hook's own,
 * card-specific half: card size is **never derived** — it's exactly the
 * anchor element's own measured width (the same "fill 100% of the column,
 * then measure what that resolved to" mechanism `SplitColumnCardPreview.tsx`'s
 * flat/single-card branch already uses for its own `cardSize` — see that
 * file's `containerRef`/`ResizeObserver`), with height from the fixed 3:4
 * ratio.
 *
 * Row count is solved from that fixed card size against the real, full
 * viewport height: render generously many rows (enough to cover
 * `window.innerHeight` plus a partial row past each edge) so the stack
 * reads as filling the space, with `.viewport`'s own `overflow: hidden`
 * naturally cropping whatever doesn't fully fit — a card can be partially
 * visible at the top/bottom edge (including sliding behind the header),
 * which is fine; it just never becomes a smaller card.
 *
 * Clip region vs. hit-test region (round 9 fix — see
 * PLAN-VERTICAL-CARD-STACK.md's revision log): `.viewport` is the element
 * that actually clips, via `overflow: hidden`, and for that clipping to
 * only ever crop *vertically* (extra rows past the visible range) rather
 * than *horizontally* (a rotated neighbor card's own overshoot past its
 * unrotated bounding box), it needs real horizontal room beyond the exact
 * card-column width — `fixedWidthPx` alone was sized with zero horizontal
 * margin, so any 3D `rotateY` at all pushed a neighbor's projected edge
 * straight into the clip boundary. `pageWidthPx` (full `window.innerWidth`)
 * gives `.viewport` that room. It does not, by itself, risk `.viewport`
 * intercepting clicks across the whole page width it now spans — see
 * `CardStack.module.css`'s `.viewport`/`.column` split (`pointer-events:
 * none` / `auto`) for the other half of this fix.
 *
 * Tabs/arrows vs. the header's hit-box (a second, related fix found while
 * verifying the round-9 clipping fix — see PLAN-VERTICAL-CARD-STACK.md's
 * revision log): the site header needs an explicit stacking level above
 * `.viewport` for cards to visibly pass *underneath* it (see CardStack.tsx
 * — its wrapper gets `z-[100]` specifically in stack mode). But the header
 * element itself is `pointer-events: auto` across its *entire* bounding
 * box at desktop widths, not just its visible logo/nav content — so once
 * it's stacked above `.viewport`, anything positioned at a hardcoded guess
 * near the top of that layer (the tab row, the arrow group — both
 * previously `top: 1.5rem`/`fixedTopPx + 24`) silently becomes unclickable
 * wherever it overlaps the header's real box, exactly the "fix one
 * requirement, silently break another" pattern this feature's audit
 * already names. `headerBottomPx` — the header's own live
 * `getBoundingClientRect().bottom` — lets CardStack.tsx position both
 * below the header's real, current geometry instead of a guessed offset
 * that happened to look right only because it wasn't actually blocked yet.
 */
export function useCardStackLayout(gapPx: number, headerOffsetPx = 0): CardStackLayout {
  const {
    anchorRef,
    fixedLeftPx: measuredLeftPx,
    fixedTopPx: measuredTopPx,
    fixedWidthPx: measuredWidthPx,
    fixedHeightPx: measuredHeightPx,
    pageWidthPx: measuredPageWidthPx,
    headerBottomPx,
  } = useFixedViewportColumnLayout(headerOffsetPx);
  const stacked = resolveIsStackedColumnLayout(measuredPageWidthPx);
  const { leftPx: resolvedLeftPx, widthPx: fixedWidthPx } = resolveCardStackHorizontalGeometry({
    fixedLeftPx: measuredLeftPx,
    fixedWidthPx: measuredWidthPx,
    pageWidthPx: measuredPageWidthPx,
  });

  // ABSTRACT-01 fix (2026-08-20-139d957): below the 768px stacked
  // breakpoint, CardStack.tsx renders `.viewport` as position:absolute
  // against its own (position:relative) anchor element rather than
  // position:fixed against the true browser viewport (see this hook's own
  // `stacked` doc comment above for why). fixedTopPx/fixedLeftPx become 0
  // (this layer's own containing block is now the anchor itself, not the
  // viewport, so "start flush with the anchor's own top-left" is the
  // correct origin, not a viewport-relative measurement); fixedWidthPx/
  // pageWidthPx both collapse to the anchor's own measured width (there is
  // no separate "wider than the column for tilted-neighbor overshoot room"
  // concern once this layer's own clip boundary is the anchor's box, not
  // the full page).
  const fixedTopPx = stacked ? 0 : measuredTopPx;
  const fixedLeftPx = stacked ? 0 : resolvedLeftPx;
  const pageWidthPx = stacked ? fixedWidthPx : measuredPageWidthPx;

  if (measuredHeightPx <= 0 || fixedWidthPx <= 0) {
    return {
      anchorRef,
      cardWidthPx: 0,
      cardHeightPx: 0,
      rowPitchPx: 0,
      aboveCount: 1,
      belowCount: 1,
      fixedLeftPx,
      fixedTopPx,
      fixedWidthPx,
      fixedHeightPx: measuredHeightPx,
      pageWidthPx,
      anchorViewportLeftPx: measuredLeftPx,
      browserWidthPx: measuredPageWidthPx,
      headerBottomPx,
      stacked,
    };
  }

  const cardWidthPx = fixedWidthPx;
  const cardHeightPx = cardWidthPx * (4 / 3);
  const rowPitchPx = cardHeightPx + gapPx;

  const rowsPerSide = resolveStackRowsPerSide({ stacked, fixedHeightPx: measuredHeightPx, rowPitchPx });
  const aboveCount = rowsPerSide;
  const belowCount = rowsPerSide;

  // cardstack-neighbor-row-cap (feature-development batch
  // 2026-08-22-cardstack-mobile-swipe, F3 — corrects an incomplete first
  // attempt at this same fix): row count alone controls how many decorative
  // neighbor rows *render*, but `.viewport`'s own CSS `height` (this value,
  // spread directly into that inline style in CardStack.tsx) independently
  // controls the box's own size regardless of how many rows are inside it —
  // capping rowsPerSide to 0 without also capping this left `.viewport`
  // sized to the full measured viewport height, reproducing the exact same
  // scrollable dead space PLAN-CARDSTACK-MOBILE-NEIGHBOR-ROWS.md diagnosed
  // (confirmed live: unchanged before/after the row-count-only fix). Once
  // stacked, with 0 neighbor rows, there is nothing left to reserve height
  // for beyond the active card itself.
  const fixedHeightPx = stacked ? cardHeightPx : measuredHeightPx;

  return {
    anchorRef,
    cardWidthPx,
    cardHeightPx,
    rowPitchPx,
    aboveCount,
    belowCount,
    fixedLeftPx,
    fixedTopPx,
    fixedWidthPx,
    fixedHeightPx,
    pageWidthPx,
    anchorViewportLeftPx: measuredLeftPx,
    browserWidthPx: measuredPageWidthPx,
    headerBottomPx,
    stacked,
  };
}
