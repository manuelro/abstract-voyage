import { useEffect, useMemo, useRef } from 'react';
import { colord, extend } from 'colord';
import a11yPlugin from 'colord/plugins/a11y';
import { generateHarmonicGradient } from '../../../helpers/harmonicGradient';
import type {
  PolymorphicLayoutScrollGradientHueScheme,
  PolymorphicLayoutScrollGradientMode,
} from './PolymorphicLayout.config';

extend([a11yPlugin]);

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
  /** Opt-in (default 0 — inert). When above 0, the darken schedule below
   * stops being purely scroll-driven: each frame, it also computes the
   * minimum darken needed so that even PURE WHITE text could reach this
   * contrast ratio against the current background, and uses whichever is
   * darker — the scroll schedule's own value or this floor. Exists because
   * AbstractEditorialHero's own text-side contrast correction has a hard
   * ceiling (it can only ever mix toward white, never past it) — in a
   * background segment light enough, white text alone cannot reach a given
   * ratio no matter how much is mixed in. This floor guarantees the
   * background always gets dark enough FIRST that the text-side correction
   * always has a real solution available, closing that residual gap rather
   * than leaving it as a known limitation. Deliberately assumes "white" as
   * the protected ink, not any specific page's actual stop color — keeps
   * this component free of any dependency on AbstractEditorialHero's own
   * wordmark-gradient internals; the text side's own correction only ever
   * needs to search for a mix AT MOST 100%, so guaranteeing white's own
   * feasibility is sufficient to guarantee the text side always finds
   * something ≤100% that works too. See
   * PLAN-HERO-SCROLL-CONTRAST-GUARANTEE.md. */
  legibilityTargetRatio?: number;
  /** Opt-in (default false — inert). When true, the darken schedule above
   * ignores real scroll position entirely and eases toward `maxDarken`
   * (via the SAME tau-smoothed transition, not an instant jump) — for a
   * caller whose own modal-like, scroll-locked overlay wants the backdrop
   * to read as settled/at-rest while it's open, rather than tracking
   * whatever `window.scrollY` happens to report during that time (which
   * can shift for reasons unrelated to real scrolling — e.g.
   * MobilePinnedArticleSection's own scroll-lock/restore cycle around
   * selection). Takes priority over the plain scroll-driven value AND the
   * `legibilityTargetRatio` floor above (max darken already satisfies any
   * legibility floor that's ≤ maxDarken, which every sane config value
   * is). See PLAN-MOBILE-ARTICLE-LIST-EXPAND-DARKEN.md. */
  forceMaxDarken?: boolean;
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
  legibilityTargetRatio = 0,
  forceMaxDarken = false,
}: PolymorphicScrollGradientBackgroundProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Ported from the legacy buildSynthBackgroundGradient (synthGradient.ts) —
  // same `circle at 0% 0%` composition, same `at * 1000` (not `* 100`)
  // stop-position math. That factor of 1000 rather than 100 is the exact
  // legacy value, kept verbatim rather than "corrected" — changing it would
  // change the extracted visual, not just its source location.
  const gradientStops = useMemo(() => generateHarmonicGradient({
    baseHue,
    hueScheme,
    lightnessRange: { min: lightnessMin },
    chromaRange: { min: chromaMin },
    mode,
    stops,
    variance,
    centerStretch,
    seed,
  }), [baseHue, hueScheme, lightnessMin, chromaMin, mode, stops, variance, centerStretch, seed]);

  const backgroundGradient = useMemo(() => `radial-gradient(circle at 0% 0%, ${gradientStops
    .map(stop => `${stop.color} ${Math.round(stop.at * 1000)}%`)
    .join(', ')})`, [gradientStops]);

  // Origin (circle-center) stop's own color — the same proxy
  // usePolymorphicLayoutColors()'s own scrollGradientOriginColor uses for
  // "the background color behind hero copy." Read from a ref inside the
  // rAF effect below rather than added to that effect's own dependency
  // array, so a stops-only change doesn't tear down/rebuild the scroll
  // listener.
  const originColorRef = useRef(gradientStops[0]?.color ?? '#000000');
  originColorRef.current = gradientStops[0]?.color ?? '#000000';

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

    // Minimum darken (0-1, fraction of true black) needed so that PURE
    // WHITE text would reach legibilityTargetRatio against this origin
    // color once darkened — see legibilityTargetRatio's own doc comment
    // above. White's own luminance is fixed at 1, so this is a plain
    // monotonic search on darken alone (darkening a color always lowers its
    // luminance), unlike the text side's own V-shaped mix search.
    const requiredDarkenForLegibility = (ratio: number) => {
      if (ratio <= 0) return 0;
      const maxAllowedBgLuminance = Math.max(0, 1.05 / ratio - 0.05);
      const luminanceAtDarken = (darken: number) => {
        const { r, g, b } = colord(originColorRef.current).toRgb();
        const scale = 1 - darken;
        return colord({ r: r * scale, g: g * scale, b: b * scale }).luminance();
      };
      if (luminanceAtDarken(0) <= maxAllowedBgLuminance) return 0;
      if (luminanceAtDarken(1) > maxAllowedBgLuminance) return 1;
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 20; i += 1) {
        const mid = (lo + hi) / 2;
        if (luminanceAtDarken(mid) <= maxAllowedBgLuminance) hi = mid; else lo = mid;
      }
      return hi;
    };

    const computeTarget = () => {
      if (forceMaxDarken) {
        targetRef.current = maxDarken;
        return;
      }
      const viewport = window.innerHeight || 1;
      const rawProgress = window.scrollY / (viewport * viewportRangeVh);
      const progress = clamp(rawProgress, 0, 1);
      const scrollDarken = progress * maxDarken;
      const legibilityDarken = Math.min(maxDarken, requiredDarkenForLegibility(legibilityTargetRatio));
      targetRef.current = Math.max(scrollDarken, legibilityDarken);
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
      // Same fix as AbstractEditorialHero.tsx's own identical pattern
      // (PLAN-HERO-SCROLL-CONTRAST-GUARANTEE.md): lastTsRef isn't reset
      // when the loop converges and stops, so resuming after any pause in
      // scrolling would otherwise compute an artificially huge dt on the
      // next tick (stale lastTs vs the real current ts) — alpha≈1, a
      // one-frame snap to the new target instead of an eased transition.
      lastTsRef.current = 0;
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
  }, [viewportRangeVh, maxDarken, tauMs, legibilityTargetRatio, forceMaxDarken]);

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
