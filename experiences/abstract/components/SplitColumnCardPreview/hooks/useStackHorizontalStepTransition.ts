import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

type SlidePhase = 'idle' | 'out' | 'entering' | 'in';

export type StackHorizontalStepTransition = {
  /** Which item's content to actually render — lags `activeItemIndex` until
   * the outgoing push finishes, matching the "content swaps only once it's
   * off-screen" choreography `useStackSwipeTransition`'s own `renderedList`
   * already uses for the same reason (see that hook's own doc comment). */
  renderedItemIndex: number;
  /** Inline style for the single visible slot's own wrapper — translateX +
   * opacity + transition, ready to spread directly. */
  style: CSSProperties;
  transitioning: boolean;
};

/**
 * cardstack-mobile-horizontal-swipe (feature-development batch
 * 2026-08-22-cardstack-mobile-swipe): the stacked/mobile card-to-card
 * horizontal slide. Mirrors `useStackSwipeTransition`'s own push-out/
 * push-in state machine almost exactly (same four-phase shape, same
 * render-lag mechanism) — the one real difference is *why* direction is
 * known. `useStackSwipeTransition` switches between exactly two named
 * lists, so its caller must supply which way to push; stepping through an
 * ordered list of cards has a direction *inherent* in whether the index
 * grew or shrank, so this hook derives it itself from the previous vs.
 * current `activeItemIndex` rather than taking it as a parameter — not
 * generalizing that hook to a shared implementation, since the two are
 * genuinely different shapes (list-key selection vs. index stepping), the
 * same reasoning this component family already applies elsewhere (e.g.
 * `DiscoveryReviewReport.tsx` vs. `FeatureStoryReviewReport.tsx`).
 *
 * ABSTRACT-09 fix (2026-08-22, caught via a live CDP touch-swipe
 * reproduction, not code review — jsdom unit tests can prove this state
 * machine internally consistent but can't render anything, so they never
 * exercised the actual handoff from a live drag into this hook's own
 * animation): the 'out' phase used to begin from a `useEffect` reacting to
 * `activeItemIndex` changing, one render *after* the index itself updates.
 * CardStack.tsx's own gesture-driven live-drag style override
 * (`gesture.activeAxis === 'horizontal'`) stops applying the instant
 * `finishPointer` commits and resets `activeAxis` to `null` — both happen
 * synchronously in the same event as the index change that drives this
 * hook. That left exactly one React render where `activeItemIndex` had
 * already advanced but this hook's own `phase` hadn't yet reacted: its
 * style function's `phase === 'idle'` branch (`translateX(0%)`, opacity 1,
 * `transition: 'none'`) got flushed to the DOM for that one render,
 * instantly erasing the live drag's actual position (e.g. -90px, wherever
 * the finger released) back to dead-center at full opacity — a visible
 * snap/flicker — immediately before the 'out' phase's own CSS transition
 * started, from that now-reset 0% baseline, animating the *entire* card
 * width regardless of how far the drag itself had already traveled. That
 * combination is exactly what reads as "the card disappears for a moment"
 * (the snap-to-center flicker) and "translates a distance too large for
 * the actual gap between cards" (the completion animation always covers
 * 100% width, never just the remainder past wherever the drag left off).
 *
 * Fixed by deriving the phase transition *during render* (React's
 * documented "adjusting state when a prop changes" escape hatch — calling
 * `setState` conditionally while rendering re-renders immediately, before
 * the browser ever paints the intermediate state) instead of in a
 * `useEffect`, so there is no render where `activeItemIndex` has moved but
 * `phase` hasn't: the very first *committed* frame after an index change
 * already reflects the 'out' phase's own transform/opacity/transition,
 * letting the CSS transition interpolate smoothly from whatever the
 * previous committed frame actually was (the live drag's own offset, on a
 * gesture-driven commit; the settled rest position, on a keyboard/arrow
 * step) rather than from a value this hook forced back to zero.
 */
export function useStackHorizontalStepTransition({
  activeItemIndex,
  durationMs,
  easingCss,
  prefersReducedMotion,
  skipTransition = false,
}: {
  activeItemIndex: number;
  durationMs: number;
  easingCss: string;
  prefersReducedMotion: boolean;
  /** A live mobile drag has already rendered both cards at their real
   * release positions. CardStack supplies this for that one commit so the
   * legacy sequential out/enter state machine cannot start a second visual
   * entry after the drag-owned handoff has begun. */
  skipTransition?: boolean;
}): StackHorizontalStepTransition {
  const [renderedItemIndex, setRenderedItemIndex] = useState(activeItemIndex);
  const [phase, setPhase] = useState<SlidePhase>('idle');
  // -1: outgoing card exits toward the left (an advance — matches the
  // "swipe left for next" gesture convention cardstack-mobile-horizontal-
  // swipe's own gesture wiring uses); 1: exits right (a retreat).
  const [pushDirection, setPushDirection] = useState<1 | -1>(-1);
  // `useState`, not `useRef` — this is React's own documented "adjusting
  // state when a prop changes" pattern (a ref mutated during render doesn't
  // get the same discard-and-redo treatment React gives a setState call
  // made during render, which matters once React double-invokes this
  // function — StrictMode in dev, and per React's own docs a future
  // concurrent-render replay in any mode — so a ref-based version of this
  // exact pattern silently never re-entered the 'out' branch: the first
  // (thrown-away) invocation already mutated the ref, so the second,
  // *actually rendered* invocation saw no change at all).
  const [previousActiveIndex, setPreviousActiveIndex] = useState(activeItemIndex);
  const activeItemIndexRef = useRef(activeItemIndex);
  activeItemIndexRef.current = activeItemIndex;
  const timersRef = useRef<number[]>([]);
  const frameRef = useRef(0);

  const clearPending = useCallback(() => {
    timersRef.current.forEach(id => window.clearTimeout(id));
    timersRef.current = [];
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
  }, []);

  useEffect(() => () => clearPending(), [clearPending]);

  // Render-time derivation, not a `useEffect` — see this hook's own module
  // doc comment (ABSTRACT-09) for exactly why the one-render gap a `useEffect`
  // here introduces is a real, user-visible bug, not a micro-optimization.
  if (activeItemIndex !== previousActiveIndex) {
    const direction: 1 | -1 = activeItemIndex > previousActiveIndex ? -1 : 1;
    setPreviousActiveIndex(activeItemIndex);
    if (skipTransition || prefersReducedMotion || durationMs <= 0) {
      setRenderedItemIndex(activeItemIndex);
      setPhase('idle');
    } else {
      setPushDirection(direction);
      setPhase('out');
    }
  }

  // The timer-driven phase advances (out -> entering -> in -> idle) still
  // belong in an effect — they're real side effects (timers, rAF), not
  // rendering — keyed on `phase` itself rather than `activeItemIndex`, so
  // this doesn't re-arm every render, only when a new 'out' phase actually
  // begins.
  useEffect(() => {
    if (phase !== 'out') return undefined;
    clearPending();
    const outTimer = window.setTimeout(() => {
      setRenderedItemIndex(activeItemIndexRef.current);
      setPhase('entering');
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = 0;
        setPhase('in');
        const inTimer = window.setTimeout(() => setPhase('idle'), durationMs);
        timersRef.current.push(inTimer);
      });
    }, durationMs);
    timersRef.current.push(outTimer);
    return undefined;
  }, [phase, clearPending, durationMs]);

  const transitionCss = `transform ${durationMs}ms ${easingCss}, opacity ${durationMs}ms ${easingCss}`;
  let style: CSSProperties = { transform: 'translateX(0%)', opacity: 1, transition: 'none' };
  if (phase === 'out') {
    style = {
      transform: `translateX(${(pushDirection * 100).toFixed(2)}%)`,
      opacity: 0,
      transition: transitionCss,
    };
  } else if (phase === 'entering') {
    style = {
      transform: `translateX(${(-pushDirection * 100).toFixed(2)}%)`,
      opacity: 0,
      transition: 'none',
    };
  } else if (phase === 'in') {
    style = { transform: 'translateX(0%)', opacity: 1, transition: transitionCss };
  }

  return { renderedItemIndex, style, transitioning: phase !== 'idle' };
}
