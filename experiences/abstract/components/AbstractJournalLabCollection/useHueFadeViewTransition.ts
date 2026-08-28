'use client';

import { useCallback, useRef, useState } from 'react';
import type { AbstractJournalLabCollectionConfig, AbstractJournalLabCollectionView } from './config/presentation';

export type HueFadePhase = 'idle' | 'out' | 'color' | 'in';

export type AbstractJournalLabHueFadeViewTransition = {
  activeView: AbstractJournalLabCollectionView;
  renderedView: AbstractJournalLabCollectionView;
  colorView: AbstractJournalLabCollectionView;
  fadePhase: HueFadePhase;
  transitioning: boolean;
  selectView: (requested: AbstractJournalLabCollectionView, focusTab?: boolean) => void;
};

/**
 * The hue-fade-through view-transition state machine — extracted verbatim
 * (formulas unchanged) from `AbstractJournalLabCollection`'s own internal
 * `selectView`/`activeView`/`renderedView`/`colorView`/`fadePhase`/
 * `transitioning` state, minus the scattered-grid field-height/scene-origin
 * side effects that logic also drives (irrelevant outside that layout).
 * `AbstractJournalLabCollection.tsx` itself is not touched — this hook only
 * exists so a second, single-card consumer (`SplitColumnCardPreview`, see
 * PLAN-HOMEPAGE-IA-LAYOUT.md 8.4) can reuse the *exact* sequential
 * fade-out → color-retarget → fade-in choreography instead of hand-rolling
 * an approximation of it, and instead of an instant, un-transitioned swap.
 * Always runs the hue-fade-through path (never the 'flip' presentation
 * mode's own timing) — the only card renderer this hook's consumer ever
 * mounts is `AbstractJournalLabHueFadeCard`.
 */
export function useAbstractJournalLabHueFadeViewTransition({
  hasArticles,
  hasLabs,
  config,
  prefersReducedMotion,
  initialView,
  onFocusTab,
}: {
  hasArticles: boolean;
  hasLabs: boolean;
  config: AbstractJournalLabCollectionConfig;
  prefersReducedMotion: boolean;
  initialView: AbstractJournalLabCollectionView;
  onFocusTab?: (view: AbstractJournalLabCollectionView) => void;
}): AbstractJournalLabHueFadeViewTransition {
  const resolveAvailableView = useCallback((
    requested: AbstractJournalLabCollectionView,
  ) => {
    if (requested === 'labs' && hasLabs) return 'labs';
    if (requested === 'articles' && hasArticles) return 'articles';
    return hasLabs ? 'labs' : 'articles';
  }, [hasArticles, hasLabs]);

  const [activeView, setActiveView] = useState<AbstractJournalLabCollectionView>(
    () => resolveAvailableView(initialView),
  );
  const [renderedView, setRenderedView] = useState<AbstractJournalLabCollectionView>(
    () => resolveAvailableView(initialView),
  );
  const [colorView, setColorView] = useState<AbstractJournalLabCollectionView>(
    () => resolveAvailableView(initialView),
  );
  const [fadePhase, setFadePhase] = useState<HueFadePhase>('idle');
  const [transitioning, setTransitioning] = useState(false);

  const transitionTimerRef = useRef(0);
  const contentSwapTimerRef = useRef(0);
  const colorSettleTimerRef = useRef(0);

  const clearTransitionTimers = useCallback(() => {
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = 0;
    }
    if (contentSwapTimerRef.current) {
      window.clearTimeout(contentSwapTimerRef.current);
      contentSwapTimerRef.current = 0;
    }
    if (colorSettleTimerRef.current) {
      window.clearTimeout(colorSettleTimerRef.current);
      colorSettleTimerRef.current = 0;
    }
  }, []);

  const selectView = useCallback((
    requested: AbstractJournalLabCollectionView,
    focusTab = false,
  ) => {
    const nextView = resolveAvailableView(requested);
    if (nextView === activeView) return;
    clearTransitionTimers();
    if (focusTab) onFocusTab?.(nextView);
    // Content is already invisible if we're past the fade-out leg of a prior
    // (still in-flight) transition — reversing from there never needs to
    // fade it out a second time, so the color-then-fade-in tail is enough.
    const contentAlreadyHidden = !prefersReducedMotion &&
      (fadePhase === 'color' || fadePhase === 'in');
    const totalMs = prefersReducedMotion
      ? 0
      : contentAlreadyHidden
        ? config.fadeDurationMs + config.contentFadeDurationMs
        : 2 * config.contentFadeDurationMs + config.fadeDurationMs;
    setActiveView(nextView);
    setTransitioning(totalMs > 0);
    if (totalMs === 0) {
      setRenderedView(nextView);
      setColorView(nextView);
      setFadePhase('idle');
    } else if (contentAlreadyHidden) {
      // Content is already faded out from a prior in-flight transition —
      // retarget the color straight away (the gradient renderer continues
      // smoothly from whatever hue it's currently mid-transition to, never
      // snapping) and only fade information back in once it settles.
      setColorView(nextView);
      setFadePhase('color');
      colorSettleTimerRef.current = window.setTimeout(() => {
        colorSettleTimerRef.current = 0;
        setRenderedView(nextView);
        setFadePhase('in');
      }, config.fadeDurationMs);
    } else {
      // Fresh, sequential three-phase transition: fade information out in
      // full, only then retarget the color, only then fade the new view's
      // information back in. Each leg's own timer schedules the next.
      setFadePhase('out');
      contentSwapTimerRef.current = window.setTimeout(() => {
        contentSwapTimerRef.current = 0;
        setColorView(nextView);
        setFadePhase('color');
        colorSettleTimerRef.current = window.setTimeout(() => {
          colorSettleTimerRef.current = 0;
          setRenderedView(nextView);
          setFadePhase('in');
        }, config.fadeDurationMs);
      }, config.contentFadeDurationMs);
    }
    if (totalMs > 0) {
      transitionTimerRef.current = window.setTimeout(() => {
        transitionTimerRef.current = 0;
        setRenderedView(nextView);
        setColorView(nextView);
        setFadePhase('idle');
        setTransitioning(false);
      }, totalMs);
    }
  }, [
    activeView,
    clearTransitionTimers,
    config.contentFadeDurationMs,
    config.fadeDurationMs,
    fadePhase,
    onFocusTab,
    prefersReducedMotion,
    resolveAvailableView,
  ]);

  return { activeView, renderedView, colorView, fadePhase, transitioning, selectView };
}
