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
 * Collapsing pins the current height to a concrete pixel value across two
 * animation frames before flipping to 0 — a plain single-frame update
 * risks the browser coalescing both writes into one paint and skipping
 * the transition entirely, a common gotcha with this exact "measure, then
 * animate" pattern.
 */
export function useExpandableHeight(
  expanded: boolean,
  durationMs: number,
  easingCss: string,
): UseExpandableHeightResult {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return undefined;

    const measure = () => node.getBoundingClientRect().height;

    if (expanded) {
      setHeight(measure());
      // Keeps the target in sync with the content's own real size for as
      // long as the panel stays open — the fix for the end-of-transition
      // jump this hook's own doc comment above explains.
      const observer = new ResizeObserver(() => setHeight(measure()));
      observer.observe(node);
      return () => observer.disconnect();
    }

    setHeight(measure());
    let secondFrameId = 0;
    const firstFrameId = requestAnimationFrame(() => {
      secondFrameId = requestAnimationFrame(() => setHeight(0));
    });
    return () => {
      cancelAnimationFrame(firstFrameId);
      if (secondFrameId) cancelAnimationFrame(secondFrameId);
    };
  }, [expanded, durationMs]);

  return {
    contentRef,
    wrapperStyle: {
      height: `${height}px`,
      overflow: 'hidden',
      transition: `height ${durationMs}ms ${easingCss}`,
    },
  };
}
