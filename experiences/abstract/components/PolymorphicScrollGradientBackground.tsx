import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { colord, extend } from 'colord';
import a11yPlugin from 'colord/plugins/a11y';
import { generateHarmonicGradient, type GradientStop } from '../../../helpers/harmonicGradient';
import type {
  PolymorphicLayoutScrollGradientCompositor,
  PolymorphicLayoutScrollGradientFocalHorizontal,
  PolymorphicLayoutScrollGradientHueScheme,
  PolymorphicLayoutScrollGradientInterpolation,
  PolymorphicLayoutScrollGradientMode,
} from './PolymorphicLayout.config';

type Rgb = { r: number; g: number; b: number };
type Oklab = { l: number; a: number; b: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const srgbToLinear = (value: number) => {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
};
const linearToSrgb = (value: number) => {
  const channel = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  return Math.round(clamp(channel, 0, 1) * 255);
};
const rgbToOklab = ({ r, g, b }: Rgb): Oklab => {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
};
const oklabToRgb = ({ l, a, b }: Oklab): Rgb => {
  const ll = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const ss = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: linearToSrgb(4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss),
    g: linearToSrgb(-1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss),
    b: linearToSrgb(-0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss),
  };
};
const rgbCss = ({ r, g, b }: Rgb) => `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;
const mixRgb = (from: Rgb, to: Rgb, amount: number): Rgb => ({
  r: from.r + (to.r - from.r) * amount,
  g: from.g + (to.g - from.g) * amount,
  b: from.b + (to.b - from.b) * amount,
});
const mixOklab = (from: Rgb, to: Rgb, amount: number): Rgb => {
  const a = rgbToOklab(from);
  const b = rgbToOklab(to);
  return oklabToRgb({
    l: a.l + (b.l - a.l) * amount,
    a: a.a + (b.a - a.a) * amount,
    b: a.b + (b.b - a.b) * amount,
  });
};

/** Derives the desktop narrow-column palette from the exact source stops.
 * Neutral values deliberately return the original array reference so merely
 * enabling the feature cannot introduce color parsing or rounding drift. */
export function transformScrollGradientStops(
  stops: GradientStop[],
  saturation: number,
  darkness: number,
): GradientStop[] {
  const resolvedSaturation = clamp(saturation, 0, 2);
  const resolvedDarkness = clamp(darkness, 0, 1);
  if (resolvedSaturation === 1 && resolvedDarkness === 0) return stops;

  return stops.map((stop) => {
    const source = rgbToOklab(colord(stop.color).toRgb());
    return {
      ...stop,
      color: rgbCss(oklabToRgb({
        l: source.l * (1 - resolvedDarkness),
        a: source.a * resolvedSaturation,
        b: source.b * resolvedSaturation,
      })),
    };
  });
}

export function buildLegacyScrollGradient(stops: Array<{ color: string; at: number }>): string {
  return `radial-gradient(circle at 0% 0%, ${stops
    .map(stop => `${stop.color} ${Math.round(stop.at * 1000)}%`)
    .join(', ')})`;
}

export function buildEnhancedScrollGradient(
  stops: Array<{ color: string; at: number }>,
  samples: number,
  interpolation: PolymorphicLayoutScrollGradientInterpolation,
  focalHorizontal: PolymorphicLayoutScrollGradientFocalHorizontal,
  radiusPercent: number,
  aspectRatio: number,
  falloff: number,
  extentPercent: number,
): string {
  const anchorColors = stops.map(stop => colord(stop.color).toRgb());
  const sampleCount = Math.max(16, Math.round(samples));
  const focalX = focalHorizontal === 'left' ? 0 : focalHorizontal === 'center' ? 50 : 100;
  const segmentWeights = anchorColors.slice(0, -1).map((color, index) => {
    if (interpolation === 'srgb') return 1;
    const from = rgbToOklab(color);
    const to = rgbToOklab(anchorColors[index + 1]);
    return Math.max(0.001, Math.hypot(to.l - from.l, to.a - from.a, to.b - from.b));
  });
  const cumulativeWeights = segmentWeights.reduce<number[]>((weights, weight) => (
    [...weights, weights[weights.length - 1] + weight]
  ), [0]);
  const totalWeight = cumulativeWeights[cumulativeWeights.length - 1] || 1;
  const renderedStops = Array.from({ length: sampleCount }, (_, index) => {
    const progress = index / (sampleCount - 1);
    const targetWeight = progress * totalWeight;
    const lower = Math.min(
      anchorColors.length - 2,
      Math.max(0, cumulativeWeights.findIndex((weight, weightIndex) => (
        weightIndex > 0 && weight >= targetWeight
      )) - 1),
    );
    const upper = Math.min(anchorColors.length - 1, lower + 1);
    const segmentStart = cumulativeWeights[lower];
    const segmentWeight = segmentWeights[lower] || 1;
    const local = clamp((targetWeight - segmentStart) / segmentWeight, 0, 1);
    const color = interpolation === 'oklab'
      ? mixOklab(anchorColors[lower], anchorColors[upper], local)
      : mixRgb(anchorColors[lower], anchorColors[upper], local);
    const shapedPosition = progress ** Math.max(0.25, falloff);
    return `${rgbCss(color)} ${(shapedPosition * extentPercent).toFixed(3)}%`;
  });
  const horizontalRadius = radiusPercent * aspectRatio;
  return `radial-gradient(ellipse ${horizontalRadius}% ${radiusPercent}% at ${focalX}% 50%, ${renderedStops.join(', ')})`;
}

function buildDitherTexture(seed: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="3" seed="${Math.round(seed)}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)" opacity="0.9"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

extend([a11yPlugin]);

export type PolymorphicScrollGradientBackgroundProps = {
  compositor: PolymorphicLayoutScrollGradientCompositor;
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
  focalHorizontal: PolymorphicLayoutScrollGradientFocalHorizontal;
  lightHiddenPercent: number;
  lightRadiusPercent: number;
  lightAspectRatio: number;
  lightFalloff: number;
  mixSamples: number;
  interpolation: PolymorphicLayoutScrollGradientInterpolation;
  extentPercent: number;
  smoothness: number;
  ditherEnabled: boolean;
  ditherAmount: number;
  ditherScale: number;
  ditherSeed: number;
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
  /** Opt-in footer/endcap behavior. Once an element marked with
   * data-scroll-gradient-return-anchor enters from below, the dark overlay
   * eases back toward finalDarken over rangeVh viewport heights. */
  returnToLightEnabled?: boolean;
  returnToLightRangeVh?: number;
  returnToLightFinalDarken?: number;
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
  style?: CSSProperties;
  /** Optional real-gradient variant for the desktop narrow column. Its
   * palette is derived from this component's exact source stops while its
   * fixed viewport geometry remains identical. `style` supplies the
   * narrow-column clip calculated by PolymorphicLayout. */
  narrowColumnVariant?: {
    saturation: number;
    darkness: number;
    style: CSSProperties;
  };
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
  compositor,
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
  focalHorizontal,
  lightHiddenPercent,
  lightRadiusPercent,
  lightAspectRatio,
  lightFalloff,
  mixSamples,
  interpolation,
  extentPercent,
  smoothness,
  ditherEnabled,
  ditherAmount,
  ditherScale,
  ditherSeed,
  legibilityTargetRatio = 0,
  returnToLightEnabled = false,
  returnToLightRangeVh = 1,
  returnToLightFinalDarken = 0,
  forceMaxDarken = false,
  style,
  narrowColumnVariant,
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

  const backgroundGradient = useMemo(() => compositor === 'legacy'
    ? buildLegacyScrollGradient(gradientStops)
    : buildEnhancedScrollGradient(
      gradientStops,
      clamp(Math.round(mixSamples * Math.max(0.25, smoothness)), 16, 128),
      interpolation,
      focalHorizontal,
      lightRadiusPercent,
      lightAspectRatio,
      lightFalloff,
      extentPercent,
    ), [
    compositor, gradientStops, mixSamples, smoothness, interpolation, focalHorizontal,
    lightRadiusPercent, lightAspectRatio, lightFalloff, extentPercent,
  ]);
  const narrowColumnVariantSaturation = narrowColumnVariant?.saturation;
  const narrowColumnVariantDarkness = narrowColumnVariant?.darkness;
  const narrowColumnVariantGradient = useMemo(() => {
    if (narrowColumnVariantSaturation === undefined || narrowColumnVariantDarkness === undefined) {
      return undefined;
    }
    const variantStops = transformScrollGradientStops(
      gradientStops,
      narrowColumnVariantSaturation,
      narrowColumnVariantDarkness,
    );
    // Neutral values are a strict identity fast path: the shared base layer
    // already paints the exact desired pixels, so no duplicate layer mounts.
    if (variantStops === gradientStops) return undefined;
    return compositor === 'legacy'
      ? buildLegacyScrollGradient(variantStops)
      : buildEnhancedScrollGradient(
        variantStops,
        clamp(Math.round(mixSamples * Math.max(0.25, smoothness)), 16, 128),
        interpolation,
        focalHorizontal,
        lightRadiusPercent,
        lightAspectRatio,
        lightFalloff,
        extentPercent,
      );
  }, [
    compositor, gradientStops, narrowColumnVariantSaturation,
    narrowColumnVariantDarkness, mixSamples, smoothness, interpolation,
    focalHorizontal, lightRadiusPercent, lightAspectRatio, lightFalloff,
    extentPercent,
  ]);
  const enhancedLayerStyle = useMemo<CSSProperties>(() => {
    if (compositor === 'legacy') return {};
    const hidden = clamp(lightHiddenPercent, 0, 95) / 100;
    const visible = 1 - hidden;
    return {
      height: `${100 / visible}%`,
      top: `${-(hidden / visible) * 100}%`,
      bottom: 'auto',
    };
  }, [compositor, lightHiddenPercent]);
  const ditherTexture = useMemo(() => buildDitherTexture(ditherSeed), [ditherSeed]);

  // Origin (circle-center) stop's own color — the same proxy
  // usePolymorphicLayoutColors()'s own scrollGradientOriginColor uses for
  // "the background color behind hero copy." Read from a ref inside the
  // rAF effect below rather than added to that effect's own dependency
  // array, so a stops-only change doesn't tear down/rebuild the scroll
  // listener.
  const originColorRef = useRef(gradientStops[0]?.color ?? '#000000');
  originColorRef.current = gradientStops[0]?.color ?? '#000000';

  // Live-value refs, same pattern as originColorRef above — updated
  // directly in the render body (not inside an effect, no side effect of
  // its own) so the PERSISTENT rAF loop below always reads today's latest
  // value without ever needing to tear itself down and rebuild. Regression
  // fix (operator-reported: expanding/collapsing the mobile article list —
  // which flips forceMaxDarken — visibly flashed the background from dark
  // to light and back on EVERY expand and EVERY collapse). Root cause: this
  // effect used to list these five values in its own dependency array,
  // so toggling any one of them (forceMaxDarken, in particular) tore down
  // and recreated the whole effect closure — including targetRef/smoothRef
  // below, freshly initialized back to 0 each time, plus an explicit
  // writeDarken(0) at setup — a hard reset to "fully light" every single
  // toggle, immediately before the new target-seeking began. The loop
  // itself was always correctly eased; the bug was resetting its own
  // persistent state on every input change instead of smoothly continuing
  // from wherever it already was. See PLAN-DARKEN-FLASH-FIX.md.
  const viewportRangeVhRef = useRef(viewportRangeVh);
  viewportRangeVhRef.current = viewportRangeVh;
  const maxDarkenRef = useRef(maxDarken);
  maxDarkenRef.current = maxDarken;
  const tauMsRef = useRef(tauMs);
  tauMsRef.current = tauMs;
  const legibilityTargetRatioRef = useRef(legibilityTargetRatio);
  legibilityTargetRatioRef.current = legibilityTargetRatio;
  const returnToLightEnabledRef = useRef(returnToLightEnabled);
  returnToLightEnabledRef.current = returnToLightEnabled;
  const returnToLightRangeVhRef = useRef(returnToLightRangeVh);
  returnToLightRangeVhRef.current = returnToLightRangeVh;
  const returnToLightFinalDarkenRef = useRef(returnToLightFinalDarken);
  returnToLightFinalDarkenRef.current = returnToLightFinalDarken;
  const forceMaxDarkenRef = useRef(forceMaxDarken);
  forceMaxDarkenRef.current = forceMaxDarken;
  // Set once, inside the persistent effect below, to that effect's own
  // computeTarget+schedule pair — lets the second, small effect further
  // down trigger an immediate recompute when an input changes WITHOUT
  // tearing down or recreating any of this effect's own persistent state
  // (targetRef/smoothRef/rafRef/lastTsRef all live inside the one
  // mount-once closure below now, never reconstructed after that).
  const recomputeNowRef = useRef<(() => void) | null>(null);

  // Ported verbatim from SynthLayout.tsx's own SCROLL_BG_CONFIG-driven
  // effect: rAF-smoothed scroll darken, written to a CSS var (renamed from
  // --synth-bg-darken). Mount-once (empty dependency array) — every input
  // is read live via the refs above instead of closed over, specifically
  // so this smoothing state persists for the component's full lifetime
  // and is never reset by an input change (see the regression this fixes,
  // documented on the refs above).
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
      const maxDarkenNow = maxDarkenRef.current;
      if (forceMaxDarkenRef.current) {
        targetRef.current = maxDarkenNow;
        return;
      }
      const viewport = window.innerHeight || 1;
      const rawProgress = window.scrollY / (viewport * viewportRangeVhRef.current);
      const progress = clamp(rawProgress, 0, 1);
      const scrollDarken = progress * maxDarkenNow;
      const legibilityDarken = Math.min(maxDarkenNow, requiredDarkenForLegibility(legibilityTargetRatioRef.current));
      let nextTarget = Math.max(scrollDarken, legibilityDarken);

      if (returnToLightEnabledRef.current) {
        const anchor = document.querySelector<HTMLElement>('[data-scroll-gradient-return-anchor="true"]');
        if (anchor) {
          const rect = anchor.getBoundingClientRect();
          const returnRangePx = Math.max(1, viewport * returnToLightRangeVhRef.current);
          const returnProgress = clamp((viewport - rect.top) / returnRangePx, 0, 1);
          const finalDarken = clamp(returnToLightFinalDarkenRef.current, 0, maxDarkenNow);
          nextTarget += (finalDarken - nextTarget) * returnProgress;
        }
      }

      targetRef.current = nextTarget;
    };

    const tick = (ts: number) => {
      const lastTs = lastTsRef.current || ts;
      lastTsRef.current = ts;
      rafRef.current = null;

      const dt = Math.max(0, ts - lastTs);
      const alpha = alphaFromTau(dt, tauMsRef.current);
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

    // writeDarken(0) here only ever runs ONCE now, on true component mount
    // — never again on a later input change (that's exactly the reset this
    // refactor eliminates; see the regression documented on the refs above).
    writeDarken(0);
    computeTarget();
    schedule();
    recomputeNowRef.current = () => {
      computeTarget();
      schedule();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      recomputeNowRef.current = null;
    };
  }, []);

  // Triggers an immediate recompute (never a teardown/reset — see the
  // persistent effect above) whenever an input that should take effect
  // right away changes, most importantly forceMaxDarken: expanding/
  // collapsing the mobile article list needs to retarget the SAME
  // continuously-eased darken value immediately, not wait for the next
  // real scroll/resize event to happen to fire.
  useEffect(() => {
    recomputeNowRef.current?.();
  }, [
    viewportRangeVh,
    maxDarken,
    tauMs,
    legibilityTargetRatio,
    returnToLightEnabled,
    returnToLightRangeVh,
    returnToLightFinalDarken,
    forceMaxDarken,
  ]);

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ ...style, ...enhancedLayerStyle, backgroundImage: backgroundGradient, backgroundColor: '#020617' }}
      />
      {narrowColumnVariantGradient && narrowColumnVariant ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            ...narrowColumnVariant.style,
            ...enhancedLayerStyle,
            backgroundImage: narrowColumnVariantGradient,
          }}
        />
      ) : null}
      <div
        ref={overlayRef}
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ ...style, backgroundColor: '#000000', opacity: 'var(--polymorphic-scroll-gradient-darken, 0)' }}
      />
      {compositor === 'enhanced' && ditherEnabled && ditherAmount > 0 ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            ...style,
            backgroundImage: ditherTexture,
            backgroundSize: `${96 * ditherScale}px ${96 * ditherScale}px`,
            mixBlendMode: 'soft-light',
            opacity: ditherAmount,
          }}
        />
      ) : null}
    </>
  );
}
