import { useEffect, useMemo, useRef } from 'react';
import { generateHarmonicGradient } from '../../../helpers/harmonicGradient';
import type {
  PolymorphicLayoutScrollGradientHueScheme,
  PolymorphicLayoutScrollGradientMode,
} from './PolymorphicLayout.config';

export type PolymorphicScrollGradientBackgroundProps = {
  baseHue: number;
  hueScheme: PolymorphicLayoutScrollGradientHueScheme;
  lightnessMin: number;
  chromaMin: number;
  mode: PolymorphicLayoutScrollGradientMode;
  stops: number;
  variance: number;
  centerStretch: number;
  seed: number;
  viewportRangeVh: number;
  maxDarken: number;
  tauMs: number;
};

/**
 * Fixed, full-viewport background — the extraction of the legacy /posts/<slug>
 * scroll-gradient (experiences/synth/components/SynthLayout.tsx, removed in
 * 2f29e02). Mounted as a sibling of <SplitColumnPageShell> in
 * PolymorphicLayout.tsx, never a descendant, so `fixed` here is always
 * relative to the true viewport regardless of any ancestor's own
 * overflow/stacking context. See PLAN-POLYMORPHIC-SCROLL-GRADIENT-BACKGROUND.md.
 */
export function PolymorphicScrollGradientBackground({
  baseHue,
  hueScheme,
  lightnessMin,
  chromaMin,
  mode,
  stops,
  variance,
  centerStretch,
  seed,
  viewportRangeVh,
  maxDarken,
  tauMs,
}: PolymorphicScrollGradientBackgroundProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Ported from the legacy buildSynthBackgroundGradient (synthGradient.ts) —
  // same `circle at 0% 0%` composition, same `at * 1000` (not `* 100`)
  // stop-position math. That factor of 1000 rather than 100 is the exact
  // legacy value, kept verbatim rather than "corrected" — changing it would
  // change the extracted visual, not just its source location.
  const backgroundGradient = useMemo(() => {
    const gradientStops = generateHarmonicGradient({
      baseHue,
      hueScheme,
      lightnessRange: { min: lightnessMin },
      chromaRange: { min: chromaMin },
      mode,
      stops,
      variance,
      centerStretch,
      seed,
    });
    return `radial-gradient(circle at 0% 0%, ${gradientStops
      .map(stop => `${stop.color} ${Math.round(stop.at * 1000)}%`)
      .join(', ')})`;
  }, [baseHue, hueScheme, lightnessMin, chromaMin, mode, stops, variance, centerStretch, seed]);

  // Ported verbatim from SynthLayout.tsx's own SCROLL_BG_CONFIG-driven
  // effect: rAF-smoothed scroll darken, written to a CSS var (renamed from
  // --synth-bg-darken) rather than React state, so the panel-driven
  // viewportRangeVh/maxDarken/tauMs above can change live without this loop
  // needing to be React-state-aware on every frame.
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return undefined;

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const alphaFromTau = (dtMs: number, tau: number) => 1 - Math.exp(-dtMs / Math.max(1, tau));

    const targetRef = { current: 0 };
    const smoothRef = { current: 0 };
    const rafRef = { current: null as number | null };
    const lastTsRef = { current: 0 };

    const writeDarken = (value: number) => {
      const clamped = clamp(value, 0, 1);
      overlay.style.setProperty('--polymorphic-scroll-gradient-darken', clamped.toFixed(3));
    };

    const computeTarget = () => {
      const viewport = window.innerHeight || 1;
      const rawProgress = window.scrollY / (viewport * viewportRangeVh);
      const progress = clamp(rawProgress, 0, 1);
      targetRef.current = progress * maxDarken;
    };

    const tick = (ts: number) => {
      const lastTs = lastTsRef.current || ts;
      lastTsRef.current = ts;
      rafRef.current = null;

      const dt = Math.max(0, ts - lastTs);
      const alpha = alphaFromTau(dt, tauMs);
      const target = targetRef.current;
      const current = smoothRef.current + (target - smoothRef.current) * alpha;
      smoothRef.current = current;

      writeDarken(current);

      if (Math.abs(target - current) >= 0.001) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    const schedule = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(tick);
    };

    const onScroll = () => {
      computeTarget();
      schedule();
    };
    const onResize = () => {
      computeTarget();
      schedule();
    };

    writeDarken(0);
    computeTarget();
    schedule();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [viewportRangeVh, maxDarken, tauMs]);

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ backgroundImage: backgroundGradient, backgroundColor: '#020617' }}
      />
      <div
        ref={overlayRef}
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ backgroundColor: '#000000', opacity: 'var(--polymorphic-scroll-gradient-darken, 0)' }}
      />
    </>
  );
}
