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
 * the content's own natural size is smaller OR larger than it — see
 * `overflow-y: auto` below for the case where natural content genuinely
 * EXCEEDS the budget instead (that one item scrolls internally).
 *
 * BOTH the open and close paths call `setHeight` synchronously, in the
 * same effect pass, with no `requestAnimationFrame` delay on either side —
 * this symmetry is load-bearing, not incidental. AboutMobileAccordion.tsx
 * swaps two items at once (a closing one and an opening one) whose target
 * heights are computed to be exactly complementary (sum to the shared
 * fixed budget) specifically so their CSS `height` transitions — same
 * duration, same easing — sum to that budget at every instant, purely
 * from the browser's own timing-function math (closing(t) + opening(t) =
 * budget for any shared elapsed time t, as long as both curves started at
 * the same wall-clock frame). Two earlier versions got this wrong in
 * opposite directions: one called `setHeight` synchronously on the open
 * path but delayed the close path by two `requestAnimationFrame`s (a
 * leftover guard against a narrower "flip open then closed before the
 * open value ever painted" edge case that doesn't apply to a normal
 * steady-state toggle) — that asymmetry meant the opening item started
 * interpolating 2 frames before the closing item did, so for those 2
 * frames the closing item was still rendering its FULL old height while
 * the opening item had already started growing from zero: their combined
 * height briefly exceeded the budget (a transient push-down/"spring" on
 * every row below), then a complementary under-budget gap appeared later
 * in the same swap once the two curves settled back out of phase
 * (confirmed live via frame-by-frame `getBoundingClientRect` sampling: 8
 * non-monotonic frames and a gap up to 240px). The next attempt delayed
 * BOTH paths by the same two frames for symmetry — that removed the
 * spring (0 violations) but broke the open path in a new way: `maxHeightPx`
 * can genuinely fluctuate by sub-pixel amounts as AboutMobileAccordion's
 * own container/header `ResizeObserver` settles after mount, and every
 * such fluctuation re-ran this effect (it's in the dependency array),
 * cancelling the in-flight two-`requestAnimationFrame` countdown and
 * restarting it — if fluctuations kept arriving faster than every two
 * frames, `setHeight(target)` never got to fire at all (confirmed live:
 * the default-open first item stayed stuck at 0 content height
 * indefinitely). Removing the delay from BOTH paths — plain synchronous
 * `setHeight` either way — fixes both bugs at once: nothing is ever
 * mid-flight to cancel, and both a toggle's closing and opening item still
 * commit their new `height` value in the same React render/paint cycle,
 * which is what actually keeps their CSS transitions phase-aligned.
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

    setHeight(0);
    return undefined;
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
