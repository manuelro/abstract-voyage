'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import {
  applyPointerProximityEasing,
  stepDampedValue,
  type PointerProximityEasing,
} from '../../../helpers/pointerProximity';
import {
  usePointerProximity,
  type PointerProximityState,
} from '../../../components/proximity/usePointerProximity';
import { deckGaussianOffsetX } from './deckPalette';

/**
 * One band's own proximity subscription for useGaussianProximityMorph —
 * thin wrapper around usePointerProximity so a caller with a fixed,
 * page-architectural band count (e.g. about.tsx's header + 4 narrative
 * rows) can call this once per band, unrolled, in a stable order, rather
 * than each caller hand-rolling the same proximityRef/onChange plumbing.
 * `disabled` should be the caller's own gaussianProximityMorphEnabled
 * negation — see usePointerProximity's own `disabled` doc comment for why
 * that alone zeroes the proximity value but not the underlying
 * subscription; the caller must also only attach the returned `domRef` to
 * an element when the feature is actually enabled for a true zero-listener
 * off state.
 */
export function useGaussianProximityBand(disabled: boolean) {
  const proximityRef = useRef<PointerProximityState>({ proximity: 0, x: 0, y: 0 });
  const domRef = usePointerProximity<HTMLDivElement>({
    disabled,
    onChange: (_element, state) => {
      proximityRef.current = state;
    },
  });
  return { proximityRef, domRef };
}

export type GaussianProximityBand = {
  /** Same real (possibly synthetic/negative) index deckGaussianOffsetX uses
   * elsewhere for this band — e.g. -1 for about.tsx's header slot. */
  index: number;
  /** The band's own live pointer-proximity signal — same ref shape
   * usePointerProximity's own `onChange` option writes into elsewhere in
   * this codebase (AbstractJournalLabCollection.tsx's hologram wiring). */
  proximityRef: MutableRefObject<PointerProximityState>;
};

/**
 * Window mode, Gaussian pan curve, proximity morph: continuously blends
 * each band's own offsetX between the static Gaussian curve
 * (deckGaussianOffsetX at the configured peakIndex) and a version of that
 * same curve whose peak has shifted toward whichever band the pointer
 * currently sits nearest — proportional to that band's own live proximity,
 * not a discrete hover on/off. Every band gets its own damped, staggered
 * follow of one shared "effective peak" target, so bands near the pointer
 * catch up first and farther bands trail, producing a ripple rather than a
 * uniform snap.
 *
 * Callers own the DOM wiring: each band's own usePointerProximity ref is
 * only ever attached to that band's element when the caller's own
 * `gaussianProximityMorphEnabled` config is true — this hook's `enabled`
 * flag additionally gates the rAF loop itself, so when off there is no
 * per-frame work and every band's offsetX stays pinned to the static curve.
 * `prefers-reduced-motion` is inherited for free: usePointerProximity's own
 * proximity values stay at 0 under reduced motion, so the effective peak
 * target never leaves the static peakIndex.
 */
export function useGaussianProximityMorph({
  bands,
  enabled,
  peakIndex,
  sigma,
  amplitude,
  floor,
  responseMs,
  staggerMsPerBand,
  easing,
}: {
  bands: ReadonlyArray<GaussianProximityBand>;
  enabled: boolean;
  peakIndex: number;
  sigma: number;
  amplitude: number;
  floor: number;
  responseMs: number;
  staggerMsPerBand: number;
  easing: PointerProximityEasing;
}): ReadonlyArray<MutableRefObject<number>> {
  const outputRefsRef = useRef<MutableRefObject<number>[]>([]);
  const localPeaksRef = useRef<number[]>([]);

  if (outputRefsRef.current.length !== bands.length) {
    outputRefsRef.current = bands.map(band => ({
      current: deckGaussianOffsetX(band.index, peakIndex, sigma, amplitude, floor),
    }));
    localPeaksRef.current = bands.map(() => peakIndex);
  }

  const configRef = useRef({
    bands, peakIndex, sigma, amplitude, floor, responseMs, staggerMsPerBand, easing,
  });
  configRef.current = {
    bands, peakIndex, sigma, amplitude, floor, responseMs, staggerMsPerBand, easing,
  };

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    let frame = 0;
    let lastTime = 0;

    const tick = (time: number) => {
      const deltaMs = lastTime ? Math.min(64, time - lastTime) : 16.67;
      lastTime = time;
      const cfg = configRef.current;

      let nearestIndex: number | null = null;
      let nearestProximity = 0;
      cfg.bands.forEach(band => {
        const proximity = band.proximityRef.current.proximity;
        if (proximity > nearestProximity) {
          nearestProximity = proximity;
          nearestIndex = band.index;
        }
      });
      const easedProximity = nearestProximity > 0
        ? applyPointerProximityEasing(nearestProximity, cfg.easing)
        : 0;
      const driverIndex = nearestIndex ?? cfg.peakIndex;
      const globalTargetPeak = nearestIndex !== null
        ? cfg.peakIndex + (nearestIndex - cfg.peakIndex) * easedProximity
        : cfg.peakIndex;

      cfg.bands.forEach((band, i) => {
        const distance = Math.abs(band.index - driverIndex);
        const bandResponseMs = cfg.responseMs + distance * cfg.staggerMsPerBand;
        const nextLocalPeak = stepDampedValue({
          current: localPeaksRef.current[i],
          deltaMs,
          responseMs: bandResponseMs,
          target: globalTargetPeak,
        });
        localPeaksRef.current[i] = nextLocalPeak;
        outputRefsRef.current[i].current = deckGaussianOffsetX(
          band.index, nextLocalPeak, cfg.sigma, cfg.amplitude, cfg.floor,
        );
      });

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [enabled]);

  return outputRefsRef.current;
}
