import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CTA_BUTTON_MOTION_EASINGS } from '../../../../../components/CtaButton/config/registered';
import type { SplitColumnCardStackConfig } from '../config/stack';

export type StackListKey = 'articles' | 'labs';
type SwipePhase = 'idle' | 'out' | 'entering' | 'in';

export type StackSwipeTransition = {
  activeList: StackListKey;
  /** Which list's cards are actually mounted — lags `activeList` until the
   * outgoing push/fade finishes, matching the "content swaps only once
   * it's off-screen" choreography the flat branch's hue-fade hook already
   * uses for the same reason. */
  renderedList: StackListKey;
  /** Inline style for the stack's push/fade wrapper — translateX + opacity
   * + transition, ready to spread directly. */
  style: CSSProperties;
  transitioning: boolean;
  selectList: (requested: StackListKey, direction: 1 | -1) => void;
};

/**
 * The stack-mode horizontal Articles/Labs switch: unlike the single-card
 * flat branch (whose `useAbstractJournalLabHueFadeViewTransition` cross-
 * fades one card's own gradient in place), switching lists in stack mode
 * swaps which array feeds a whole column of already-fully-formed cards —
 * there's no per-card color to retarget, so this is a push-out/push-in
 * motion on the stack container as a unit, not a wrapper around that hook.
 */
export function useStackSwipeTransition({
  hasArticles,
  hasLabs,
  config,
  prefersReducedMotion,
  initialList,
}: {
  hasArticles: boolean;
  hasLabs: boolean;
  config: Pick<SplitColumnCardStackConfig, 'swipeDurationMs' | 'swipeEasing' | 'swipePushDistancePercent'>;
  prefersReducedMotion: boolean;
  initialList: StackListKey;
}): StackSwipeTransition {
  const resolveAvailableList = useCallback((requested: StackListKey): StackListKey => {
    if (requested === 'labs' && hasLabs) return 'labs';
    if (requested === 'articles' && hasArticles) return 'articles';
    return hasLabs ? 'labs' : 'articles';
  }, [hasArticles, hasLabs]);

  const [activeList, setActiveList] = useState<StackListKey>(() => resolveAvailableList(initialList));
  const [renderedList, setRenderedList] = useState<StackListKey>(() => resolveAvailableList(initialList));
  const [phase, setPhase] = useState<SwipePhase>('idle');
  const [pushDirection, setPushDirection] = useState<1 | -1>(1);
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

  const selectList = useCallback((requested: StackListKey, direction: 1 | -1) => {
    const nextList = resolveAvailableList(requested);
    if (nextList === activeList) return;
    clearPending();
    setActiveList(nextList);
    if (prefersReducedMotion || config.swipeDurationMs <= 0) {
      setRenderedList(nextList);
      setPhase('idle');
      return;
    }
    setPushDirection(direction);
    setPhase('out');
    const outTimer = window.setTimeout(() => {
      setRenderedList(nextList);
      setPhase('entering');
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = 0;
        setPhase('in');
        const inTimer = window.setTimeout(() => {
          setPhase('idle');
        }, config.swipeDurationMs);
        timersRef.current.push(inTimer);
      });
    }, config.swipeDurationMs);
    timersRef.current.push(outTimer);
  }, [activeList, clearPending, config.swipeDurationMs, prefersReducedMotion, resolveAvailableList]);

  const pushPercent = config.swipePushDistancePercent * 100;
  const transitionCss = `transform ${config.swipeDurationMs}ms `
    + `${CTA_BUTTON_MOTION_EASINGS[config.swipeEasing]}, `
    + `opacity ${config.swipeDurationMs}ms ${CTA_BUTTON_MOTION_EASINGS[config.swipeEasing]}`;

  let style: CSSProperties = { transform: 'translateX(0%)', opacity: 1, transition: 'none' };
  if (phase === 'out') {
    style = {
      transform: `translateX(${(pushDirection * pushPercent).toFixed(2)}%)`,
      opacity: 0,
      transition: transitionCss,
    };
  } else if (phase === 'entering') {
    style = {
      transform: `translateX(${(-pushDirection * pushPercent).toFixed(2)}%)`,
      opacity: 0,
      transition: 'none',
    };
  } else if (phase === 'in') {
    style = { transform: 'translateX(0%)', opacity: 1, transition: transitionCss };
  }

  return {
    activeList,
    renderedList,
    style,
    transitioning: phase !== 'idle',
    selectList,
  };
}
