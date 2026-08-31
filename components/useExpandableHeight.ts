import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';

export type UseExpandableHeightResult = {
  /** Attach to the element whose own natural (unclipped) content height
   * should drive the animation. This is the measurement target — the
   * ancestor `wrapperStyle` below is applied to is the one that actually
   * grows/shrinks/clips. */
  contentRef: RefObject<HTMLDivElement>;
  /** Spread onto the ancestor box that should animate open/closed — sets
   * `height`/`overflow`/`transition` only, nothing else (color, padding,
   * etc. stay the caller's own). */
  wrapperStyle: CSSProperties;
};

/**
 * Animates a container open/closed between `height: 0` and its content's
 * own natural size, using a real measured pixel value rather than a
 * CSS-only auto-height trick (`max-height` guesses, `grid-template-rows:
 * 0fr/1fr`). Those CSS-only tricks are layout-affecting animations
 * recomputed by the browser every frame from CSS alone — in a plain
 * document-flow list (siblings stacked normally, not absolutely
 * positioned), that can desync from a sibling's own paint: an expanding
 * item's text can appear clipped by the FOLLOWING sibling's own opaque
 * background sweeping up from underneath, rather than by the expanding
 * item's own edge, since both boxes' geometry are being recomputed from
 * the same live-animating value with no guaranteed same-frame paint order
 * (confirmed on AboutMobileAccordionItem.tsx, which originally used the
 * grid-template-rows trick). Measuring the real pixel height once per
 * toggle and transitioning a concrete `height` value removes that race —
 * every frame has one unambiguous, already-computed number to interpolate
 * toward, the same principle the desktop dock (components/
 * MagnificationDock.tsx) uses when it sizes every item off one stable,
 * pre-measured container rect rather than off live content reflow.
 *
 * The measured value stays a concrete pixel number for as long as the
 * panel is open — it never releases to `height: 'auto'` once the
 * transition finishes. An earlier version did release to `'auto'` on a
 * `setTimeout`, both to detect "the transition is done" and so the box
 * would keep adapting to later content changes (a viewport resize
 * reflowing the text, a font swap) without needing to re-measure for each
 * one individually — but that swap itself caused a visible end-of-
 * transition jump, for two compounding reasons: `setTimeout` can drift
 * from when the CSS transition genuinely finishes, and the value being
 * measured (`scrollHeight`, always integer-rounded per spec) rarely
 * matches the exact fractional height `auto` resolves to for the same
 * box, so the swap itself was a real, if sub-pixel, size change. This
 * version instead keeps a live `ResizeObserver` on the content while
 * expanded, updating the same concrete pixel target whenever the
 * content's own natural size actually changes — so the value never goes
 * stale in the first place, and there's no "swap to auto" moment left to
 * jump at. `getBoundingClientRect().height` (fractional, matches real
 * layout) is used for every measurement instead of `scrollHeight`
 * (integer-rounded) for the same reason.
 *
 * `maxHeightPx` (optional) is a fixed BUDGET, not merely a ceiling — for a
 * caller embedded in a fixed-height ancestor that must never grow/scroll
 * itself (e.g. AboutMobileAccordionItem inside AboutMobileAccordion's own
 * fixed-height, page-non-scrolling column), the wrapper expands to fill
 * this ENTIRE amount whenever `expanded` is true, regardless of whether
 * the content's own natural size is smaller OR larger than it. An earlier
 * version instead clamped to `Math.min(natural, maxHeightPx)` — a pure
 * ceiling — which caused a real, reproducible bug: whenever a given item's
 * own natural text was shorter than its share of the accordion's fixed
 * height (confirmed happening on every item, not a particular one — first
 * observed while expanding a shorter, later item, but present even on the
 * very first, default-open item on a fresh load), the wrapper stopped
 * growing at that shorter natural height, leaving the remainder of the
 * accordion's own fixed column showing the PAGE's own background through
 * a visible gap below the last header, instead of that one open item's own
 * background/gradient extending down to fill it — "the full height
 * computation ... not being properly calculated" (operator report,
 * screenshot: a visible dark void beneath the last row). Filling the whole
 * budget unconditionally means the caller's own background always covers
 * its entire allotted share; `overflow-y: auto` below still exists for the
 * opposite case (natural content genuinely EXCEEDS the budget), so that
 * one item scrolls internally rather than pushing the ancestor taller.
 * Collapsing no longer re-measures the content node either (the previous
 * version's "lock in the current value before animating to 0" step) —
 * once a budget can exceed the content's own natural size, re-measuring
 * the CONTENT node on collapse would grab that smaller natural number
 * instead of the wrapper's actual (larger, budget-filling) current height,
 * snapping the wrapper down to the wrong size for one frame before
 * animating to 0. The `height` state itself already holds the correct
 * current value at all times (set directly, never left as `'auto'`), so
 * collapsing simply animates from whatever that already-correct value is.
 */
export function useExpandableHeight(
  expanded: boolean,
  durationMs: number,
  easingCss: string,
  maxHeightPx?: number,
): UseExpandableHeightResult {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return undefined;

    if (expanded) {
      const target = typeof maxHeightPx === 'number' ? maxHeightPx : node.getBoundingClientRect().height;
      setHeight(target);
      // Keeps the target in sync with the content's own real size for as
      // long as the panel stays open — only meaningful in the UNCAPPED
      // case now (a provided budget is a fixed target regardless of the
      // content's own size, so there's nothing for this content-node
      // observer to correct there) — still safe to attach unconditionally,
      // it just never changes `height` while capped.
      const observer = new ResizeObserver(() => {
        setHeight(typeof maxHeightPx === 'number' ? maxHeightPx : node.getBoundingClientRect().height);
      });
      observer.observe(node);
      return () => observer.disconnect();
    }

    // `height` state is already the correct current value (set directly on
    // every prior render, never `'auto'`) — no re-measurement needed before
    // collapsing. The double `requestAnimationFrame` still matters: it
    // guarantees the browser has genuinely painted that current value at
    // least once before the second frame flips it to 0, so the transition
    // has a real "before" state to interpolate from instead of the browser
    // coalescing both into a single paint and skipping the animation.
    let secondFrameId = 0;
    const firstFrameId = requestAnimationFrame(() => {
      secondFrameId = requestAnimationFrame(() => setHeight(0));
    });
    return () => {
      cancelAnimationFrame(firstFrameId);
      if (secondFrameId) cancelAnimationFrame(secondFrameId);
    };
  }, [expanded, durationMs, maxHeightPx]);

  // `overflow-y: auto` turns on whenever a budget was ever provided, not
  // only once a live numeric comparison against the current `height`
  // confirms content is actively overflowing it right now — a
  // `naturalHeight >= maxHeightPx` check looked more precise but isn't
  // reliable across renders/observers settling; unconditionally turning on
  // `auto` for any caller that passes a budget has no visual downside
  // either way: browsers don't render a scrollbar/reserve gutter space for
  // `overflow: auto` unless there's actually something to scroll, so
  // shorter-than-budget content still looks identical to `overflow: hidden`.
  const overflowY = typeof maxHeightPx === 'number' ? 'auto' : 'hidden';

  return {
    contentRef,
    wrapperStyle: {
      height: `${height}px`,
      overflowY,
      overflowX: 'hidden',
      transition: `height ${durationMs}ms ${easingCss}`,
    },
  };
}
