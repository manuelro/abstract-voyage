import { useCallback, useEffect, useRef, useState } from 'react';

export type StackStepMotion = {
  activeItemIndex: number;
  /** True from the moment an arrow step is triggered until the active
   * slot's own tilt-then-translate sequence has fully settled — used to
   * gate pointer-driven hover-tilt on the active card (control only
   * returns to the end user once this goes false again). Neighbor slots
   * never read this; they're always non-interactive regardless. */
  isTransitioning: boolean;
  /** Active index before the current motion began. CardStack uses this to
   * select a completion sentinel that existed on both sides of the render,
   * so a newly mounted buffer slot can never be mistaken for an animating
   * element that will emit transitionend. */
  transitionFromIndex: number | null;
  canAdvance: boolean;
  canRetreat: boolean;
  advance: () => void;
  retreat: () => void;
  /** Jump directly to an arbitrary index, not just the adjacent ±1 an arrow
   * click steps by — the cursor-intent hover/click promotion in CardStack.tsx
   * needs this since more than one neighbor can be visible per side
   * (useCardStackLayout's aboveCount/belowCount), so "promote the neighbor
   * the end user is acting on" isn't always one step away. Runs through the
   * exact same transition/timing machinery as advance/retreat (only the
   * target index differs), so an arbitrary-distance jump animates with the
   * same per-slot stagger CardStack.tsx already computes from
   * `itemIndex - activeItemIndex` at render time. */
  jumpTo: (index: number) => void;
  /** Adopts an index already landed by another motion owner without starting
   * this hook's CSS transition. Used by the mobile Embla carousel so a
   * breakpoint change retains semantic position without a second animation. */
  syncTo: (index: number) => void;
  /** Ends the current motion from the real CSS transition lifecycle. */
  finishTransition: () => void;
};

/**
 * Owns which item is active within the current list and how long the
 * chained arrow-triggered step takes to settle. The actual per-slot
 * tilt/scale/opacity/translate values are computed declaratively in
 * CardStack from `offset = itemIndex - activeItemIndex` — this hook only
 * tracks the index and the single "is anything still settling" flag,
 * relying on CSS transitions (with a per-slot stagger delay) to animate
 * between old and new offsets rather than driving the motion imperatively.
 */
export function useStackStepMotion({
  itemCount,
  resetKey,
  transitionFallbackMs,
  prefersReducedMotion,
}: {
  itemCount: number;
  /** Changing this (e.g. the active list's key) snaps back to index 0 —
   * switching from Articles to Labs always starts at the top of the list,
   * rather than preserving an unrelated position. */
  resetKey: string;
  /** Defensive ceiling used only if transitionend is lost because a slot
   * unmounts, its transition is cancelled, or the browser omits the event. */
  transitionFallbackMs: number;
  prefersReducedMotion: boolean;
}): StackStepMotion {
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionFromIndex, setTransitionFromIndex] = useState<number | null>(null);
  const timerRef = useRef(0);

  useEffect(() => {
    setActiveItemIndex(0);
  }, [resetKey]);

  useEffect(() => {
    setActiveItemIndex(index => Math.min(index, Math.max(0, itemCount - 1)));
  }, [itemCount]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const finishTransition = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = 0;
    }
    setIsTransitioning(false);
    setTransitionFromIndex(null);
  }, []);

  // Shared side effect for any change of active index, regardless of whether
  // it came from a relative ±1 step or an absolute jump. The timer no longer
  // declares visual completion: CardStack's persisted transition sentinel
  // does that from transitionend. This is only the lost-event safety net.
  const beginTransition = useCallback((fromIndex: number) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setTransitionFromIndex(fromIndex);
    if (prefersReducedMotion || transitionFallbackMs <= 0) {
      timerRef.current = 0;
      setIsTransitioning(false);
      setTransitionFromIndex(null);
    } else {
      setIsTransitioning(true);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = 0;
        setIsTransitioning(false);
        setTransitionFromIndex(null);
      }, transitionFallbackMs);
    }
  }, [prefersReducedMotion, transitionFallbackMs]);

  const step = useCallback((delta: number) => {
    setActiveItemIndex(index => {
      const next = Math.min(Math.max(0, index + delta), Math.max(0, itemCount - 1));
      if (next === index) return index;
      beginTransition(index);
      return next;
    });
  }, [beginTransition, itemCount]);

  const jumpTo = useCallback((targetIndex: number) => {
    setActiveItemIndex(index => {
      const next = Math.min(Math.max(0, targetIndex), Math.max(0, itemCount - 1));
      if (next === index) return index;
      beginTransition(index);
      return next;
    });
  }, [beginTransition, itemCount]);

  const syncTo = useCallback((targetIndex: number) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = 0;
    }
    setIsTransitioning(false);
    setTransitionFromIndex(null);
    setActiveItemIndex(Math.min(Math.max(0, targetIndex), Math.max(0, itemCount - 1)));
  }, [itemCount]);

  const advance = useCallback(() => step(1), [step]);
  const retreat = useCallback(() => step(-1), [step]);

  return {
    activeItemIndex,
    isTransitioning,
    transitionFromIndex,
    canAdvance: activeItemIndex < itemCount - 1,
    canRetreat: activeItemIndex > 0,
    advance,
    retreat,
    jumpTo,
    syncTo,
    finishTransition,
  };
}
