// helpers/harmonicGradient.ts

import { colord, extend } from "colord";
import a11yPlugin from "colord/plugins/a11y";

extend([a11yPlugin]);

export type GradientMode = "center-bright" | "side-bright";

export type HueScheme = "mono" | "dual-complementary";

/**
 * A single gradient stop, compatible with existing structures like:
 * [{ color: "#FFFFFF", at: 0 }]
 *
 * - `color` is a hex string usable directly in CSS.
 * - `at` is the relative position of the stop from 0 (start) to 1 (end).
 */
export interface GradientStop {
  color: string; // "#rrggbb"
  at: number; // 0–1
  /**
   * Optional HSL breakdown for debugging or further dynamic styling.
   */
  hsl?: {
    h: number; // 0–360
    s: number; // 0–100
    l: number; // 0–100
  };
}

/**
 * Normalized range used internally (always has both min and max).
 */
export interface LightnessRange {
  min: number; // 0–100
  max: number; // 0–100
}

export interface ChromaRange {
  min: number; // 0–100
  max: number; // 0–100
}

/**
 * External config shape for lightnessRange / chromaRange.
 *
 * - number → treated as the *center* of a band.
 * - { min?: number; max?: number } → missing side derived from defaults.
 */
type RangeConfig = number | { min?: number; max?: number };

export interface GradientContrastConfig {
  /**
   * Foreground color to contrast against (e.g. text or logo color).
   * Should be a valid CSS color, typically a hex string.
   */
  against: string;
  /**
   * Minimum contrast ratio (e.g. 4.5 for WCAG AA small text).
   */
  minRatio: number;
}

export interface GradientConfig {
  /**
   * Main hue (0–360) that defines the color family (e.g. 220 for deep blue).
   */
  baseHue: number;
  /**
   * Allowed total spread around the base hue in degrees.
   * In the "mono" hue scheme, this controls the hue band around baseHue.
   * In "dual-complementary", it primarily scales micro hue jitter; use
   * `zoom` and `centerStretch` to control the perceived palette.
   */
  hueSpread?: number;
  /**
   * Overall lightness band for the gradient stops.
   *
   * Accepts:
   * - number → treated as band centered on that value (using default span).
   * - { min?: number; max?: number } → if only one side is provided, the
   *   other is derived using the default span.
   * - undefined → uses DEFAULT_LIGHTNESS_RANGE.
   */
  lightnessRange?: RangeConfig;
  /**
   * Chroma / saturation band for the gradient stops.
   *
   * Same semantics as lightnessRange.
   */
  chromaRange?: RangeConfig;
  /**
   * Lightness distribution pattern:
   * - "center-bright": center brightest, edges darker (spotlight effect).
   * - "side-bright": edges brightest, center darker (inverted spotlight).
   */
  mode?: GradientMode;
  /**
   * Number of gradient stops to generate. Minimum is 2.
   */
  stops?: number;
  /**
   * Seed for deterministic randomness. Same config + seed → identical output.
   */
  seed?: number;
  /**
   * Optional contrast requirements versus a foreground color.
   */
  contrast?: GradientContrastConfig;
  /**
   * How much randomness to allow in hue/lightness/chroma shaping.
   * 0 → almost fixed pattern, 1 → maximum (still bounded) variation.
   * Default ~0.7 (expressive but controlled).
   */
  variance?: number;
  /**
   * Optional per-stop base lightness overrides (0–100) applied before
   * contrast adjustment. Indexed by stop index (0-based). Entries that
   * are undefined/null or non-finite are ignored and the auto-generated
   * lightness is used instead.
   */
  perStopLightness?: Array<number | null | undefined>;
  /**
   * Optional per-stop chroma / saturation overrides (0–100). Indexed by
   * stop index (0-based). Entries that are undefined/null or non-finite
   * are ignored and the auto-generated chroma is used instead.
   */
  perStopChroma?: Array<number | null | undefined>;
  /**
   * Controls how hues are distributed across stops:
   * - "mono" (default): single hue band around baseHue (existing behavior).
   * - "dual-complementary": left and right edges lean toward two opposing
   *   hues with a brighter, softer center that bridges them.
   */
  hueScheme?: HueScheme;
  /**
   * Optional explicit secondary hue (0–360) for the far end when using
   * the "dual-complementary" scheme. If omitted, the generator will use
   * the complementary hue of baseHue (baseHue + 180, normalized).
   */
  secondaryHue?: number;
  /**
   * Optional zoom factor (0–1) that scales how far stops deviate from the
   * center palette. 1 = full variation, 0 = all stops converge to center.
   *
   * When centerStretch is 0 (default), zoom also behaves like a simple
   * "compress around center" factor for positions in the color domain.
   * When centerStretch > 0, centerStretch controls the *shape* of the
   * color domain and zoom only scales the amplitude of center-vs-edge
   * differences.
   */
  zoom?: number;
  /**
   * Smoothly stretches the center region of the gradient in *color space*,
   * compressing the edges:
   *
   * - Center colors change more slowly and occupy more visual room.
   * - Edge colors still reach their full chroma/lightness contrast.
   *
   * 0   → no center stretch (current behavior).
   * 0.5 → moderate emphasis on central colors.
   * 1   → strong emphasis; the middle "band" visually dominates.
   *
   * This warps the internal color position used for hue and for the
   * center-vs-edge distance. Stop positions (`at`) remain evenly spaced.
   */
  centerStretch?: number;
}

// ---------- Internal utilities ----------

type RandomFn = () => number;

const DEFAULT_HUE_SPREAD = 30; // degrees
const DEFAULT_LIGHTNESS_RANGE: LightnessRange = { min: 18, max: 58 };
const DEFAULT_CHROMA_RANGE: ChromaRange = { min: 40, max: 80 };
const DEFAULT_STOPS = 5 as const;

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeHue(h: number): number {
  if (!Number.isFinite(h)) return 0;
  const mod = h % 360;
  return mod < 0 ? mod + 360 : mod;
}

/**
 * Normalize a range config (number or partial {min,max}) into a full [min,max].
 *
 * - undefined → fallback
 * - number   → centered band using fallback span
 * - {min?}   → derive max using fallback span
 * - {max?}   → derive min using fallback span
 * - {min,max}→ clamp/swap/auto-widen if degenerate
 */
function normalizeRange(
  input: RangeConfig | undefined,
  fallback: LightnessRange | ChromaRange,
  absoluteMin: number,
  absoluteMax: number
): { min: number; max: number } {
  const spanFallback = fallback.max - fallback.min;
  const defaultSpan = clamp(
    Number.isFinite(spanFallback) && spanFallback > 0 ? spanFallback : 10,
    1,
    absoluteMax - absoluteMin
  );

  // 1) No value at all → use fallback
  if (input === undefined || input === null) {
    return { ...fallback };
  }

  // 2) Single number → treat as center of a band
  if (typeof input === "number") {
    const center = clamp(input, absoluteMin, absoluteMax);
    const halfSpan = defaultSpan / 2;

    let min = center - halfSpan;
    let max = center + halfSpan;

    min = clamp(min, absoluteMin, absoluteMax);
    max = clamp(max, absoluteMin, absoluteMax);

    if (max < min) {
      [min, max] = [max, min];
    }

    if (max === min) {
      const delta = Math.min(2, absoluteMax - absoluteMin);
      const mid = clamp(min, absoluteMin, absoluteMax);
      min = clamp(mid - delta, absoluteMin, absoluteMax);
      max = clamp(mid + delta, absoluteMin, absoluteMax);
    }

    return { min, max };
  }

  // 3) Object with optional min/max → derive missing side
  let { min, max } = input;

  const hasMin = typeof min === "number" && Number.isFinite(min);
  const hasMax = typeof max === "number" && Number.isFinite(max);

  if (!hasMin && !hasMax) {
    return { ...fallback };
  }

  let minNum: number;
  let maxNum: number;

  if (hasMin && !hasMax) {
    minNum = clamp(min as number, absoluteMin, absoluteMax);
    maxNum = clamp(minNum + defaultSpan, absoluteMin, absoluteMax);
  } else if (!hasMin && hasMax) {
    maxNum = clamp(max as number, absoluteMin, absoluteMax);
    minNum = clamp(maxNum - defaultSpan, absoluteMin, absoluteMax);
  } else {
    minNum = clamp(min as number, absoluteMin, absoluteMax);
    maxNum = clamp(max as number, absoluteMin, absoluteMax);
  }

  if (maxNum < minNum) {
    [minNum, maxNum] = [maxNum, minNum];
  }

  if (maxNum === minNum) {
    const delta = Math.min(2, absoluteMax - absoluteMin);
    const mid = clamp(minNum, absoluteMin, absoluteMax);
    minNum = clamp(mid - delta, absoluteMin, absoluteMax);
    maxNum = clamp(mid + delta, absoluteMin, absoluteMax);
  }

  return { min: minNum, max: maxNum };
}

function hueCircularDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n <= 1) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  const limit = Math.floor(Math.sqrt(n));
  for (let i = 3; i <= limit; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

/**
 * Mulberry32-style seeded PRNG, deterministic and sufficient for visual jitter.
 */
function createSeededRng(seed: number): RandomFn {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRandom(seed: number | undefined): RandomFn {
  if (typeof seed === "number" && Number.isFinite(seed)) {
    return createSeededRng(seed);
  }
  return Math.random;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Adjusts lightness to meet or approximate a desired contrast ratio while
 * preserving hue and saturation as much as possible.
 */
function adjustLightnessForContrast(
  h: number,
  s: number,
  initialL: number,
  range: LightnessRange,
  contrast?: GradientContrastConfig
): number {
  if (!contrast) return initialL;

  const { against, minRatio } = contrast;
  const from = clamp(range.min, 0, 100);
  const to = clamp(range.max, 0, 100);

  if (from >= to) return clamp(initialL, from, to);

  const contrastAt = (l: number): number => {
    const color = colord({ h, s, l });
    if (!color.isValid()) return 0;
    return color.contrast(against);
  };

  const clampedInitial = clamp(initialL, from, to);
  let bestL = clampedInitial;
  let bestRatio = contrastAt(clampedInitial);

  if (bestRatio >= minRatio) {
    return clampedInitial;
  }

  const steps = 16;
  let bestPassingL: number | null = null;
  let smallestPassingDistance = Infinity;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const candidateL = from + t * (to - from);
    const ratio = contrastAt(candidateL);
    const distance = Math.abs(candidateL - clampedInitial);

    if (ratio >= minRatio && distance < smallestPassingDistance) {
      smallestPassingDistance = distance;
      bestPassingL = candidateL;
    }

    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestL = candidateL;
    }
  }

  if (bestPassingL != null) {
    return bestPassingL;
  }

  // Fall-back: choose the lightness in range with the best ratio,
  // even if it doesn't fully reach minRatio.
  return bestL;
}

/**
 * Interpolates between two hues on the shortest path around the circle.
 * a, b ∈ [0, 360). t ∈ [0, 1].
 */
function interpolateHue(a: number, b: number, t: number): number {
  const diff = ((b - a + 540) % 360) - 180; // [-180, 180]
  return normalizeHue(a + diff * t);
}

/**
 * Smoothly warps a [0,1] position around the center (0.5), compressing
 * distances near the center in *color space* and leaving edges fixed.
 *
 * - stretch = 0 → identity
 * - stretch > 0 → many positions map close to 0.5; center colors change
 *   slowly, edges change faster.
 */
function warpAroundCenter(u: number, stretch: number): number {
  const clampedU = clamp(u, 0, 1);
  const s = clamp(stretch, 0, 1);
  if (s === 0) return clampedU;

  const center = 0.5;
  const x = clampedU - center; // [-0.5, 0.5]

  if (x === 0) return center;

  const sign = x < 0 ? -1 : 1;
  const distance = Math.min(1, Math.abs(x) * 2); // 0..1
  const exponent = 1 + s * 3; // 1..4: higher = stronger center plateau
  const warpedDistance = Math.pow(distance, exponent); // 0..1

  const result = center + sign * (warpedDistance / 2);
  return clamp(result, 0, 1);
}

// ---------- Main generator ----------

/**
 * Generates a premium-feeling gradient around a base hue.
 *
 * Example:
 *   const stops = generateHarmonicGradient({
 *     baseHue: 220,
 *     mode: "center-bright",
 *     stops: 5,
 *     seed: 42,
 *     variance: 0.8,
 *     contrast: {
 *       against: "#ffffff",
 *       minRatio: 4.5,
 *     },
 *   });
 *
 *   const cssGradient = `linear-gradient(90deg, ${stops
 *     .map(stop => `${stop.color} ${stop.at * 100}%`)
 *     .join(", ")})`;
 */
export function generateHarmonicGradient(
  config: GradientConfig
): GradientStop[] {
  const {
    baseHue: rawBaseHue,
    hueSpread: rawHueSpread,
    lightnessRange: rawLightnessRange,
    chromaRange: rawChromaRange,
    mode = "center-bright",
    stops: rawStops,
    seed,
    contrast,
    variance: rawVariance,
    perStopLightness,
    perStopChroma,
    hueScheme: rawHueScheme,
    secondaryHue: rawSecondaryHue,
    zoom: rawZoom,
    centerStretch: rawCenterStretch,
  } = config;

  const baseHue = normalizeHue(rawBaseHue);
  const hueSpread = clamp(
    rawHueSpread ?? DEFAULT_HUE_SPREAD,
    0,
    90 // hard clamp to avoid rainbow chaos
  );

  const lightnessRange = normalizeRange(
    rawLightnessRange,
    DEFAULT_LIGHTNESS_RANGE,
    0,
    100
  );
  const chromaRange = normalizeRange(
    rawChromaRange,
    DEFAULT_CHROMA_RANGE,
    0,
    100
  );

  const stopsCount = Math.max(2, Math.floor(rawStops ?? DEFAULT_STOPS));
  const rng = createRandom(seed);

  // Variance controls how "expressive" the palette is.
  const variance = clamp(
    typeof rawVariance === "number" && Number.isFinite(rawVariance)
      ? rawVariance
      : 0.7,
    0,
    1
  );

  // Zoom scales how far stops deviate from the center palette.
  const zoom = clamp(
    typeof rawZoom === "number" && Number.isFinite(rawZoom) ? rawZoom : 1,
    0,
    1
  );

  // Center stretch warps the color domain around 0.5.
  const centerStretch = clamp(
    typeof rawCenterStretch === "number" &&
      Number.isFinite(rawCenterStretch)
      ? rawCenterStretch
      : 0,
    0,
    1
  );
  const useCenterStretch = centerStretch > 0;

  // Resolve hue scheme; default to "mono" (existing behavior).
  const hueScheme: HueScheme =
    rawHueScheme === "dual-complementary" ? "dual-complementary" : "mono";

  // Randomize warm anchor a bit around golden/amber (~50°)
  const warmAnchorBase = 50;
  const warmAnchorJitter = (rng() - 0.5) * 40 * variance; // ±20°
  const warmAnchor = normalizeHue(warmAnchorBase + warmAnchorJitter);

  // Determine cool vs warm ends of the hue band based on this warm anchor.
  const rawMinHue = normalizeHue(baseHue - hueSpread / 2);
  const rawMaxHue = normalizeHue(baseHue + hueSpread / 2);

  const distMinToWarm = hueCircularDistance(rawMinHue, warmAnchor);
  const distMaxToWarm = hueCircularDistance(rawMaxHue, warmAnchor);

  const warmHue = distMinToWarm < distMaxToWarm ? rawMinHue : rawMaxHue;
  const coolHue = distMinToWarm < distMaxToWarm ? rawMaxHue : rawMinHue;

  // For dual-complementary: define a secondary hue and a bridge hue between base and secondary.
  const secondaryHue = normalizeHue(
    typeof rawSecondaryHue === "number" && Number.isFinite(rawSecondaryHue)
      ? rawSecondaryHue
      : baseHue + 180
  );
  const hueDiff = ((secondaryHue - baseHue + 540) % 360) - 180; // shortest path [-180, 180]
  const bridgeHue = normalizeHue(baseHue + hueDiff * 0.5);

  const isPrimeStops = stopsCount >= 3 && isPrime(stopsCount);
  const centerIndex = (stopsCount - 1) / 2;
  const centerIndexInt = Math.floor(centerIndex);

  // Mirroring keeps existing symmetric behavior for mono scheme only.
  const enableMirroring = isPrimeStops && hueScheme === "mono";
  const uniqueCount = enableMirroring ? centerIndexInt + 1 : stopsCount;

  const hues: number[] = new Array(stopsCount);
  const sats: number[] = new Array(stopsCount);
  const lights: number[] = new Array(stopsCount);

  // Micro jitter scales with variance and hueSpread.
  const hueJitterMaxBase = hueSpread * 0.18; // up to ~18% of spread
  const hueJitterMax = hueJitterMaxBase * variance;
  const lightnessJitterFactorBase = 0.08; // up to 8% of L range
  const lightnessJitterFactor = lightnessJitterFactorBase * variance;
  const chromaJitterFactorBase = 0.12; // up to 12% of C range
  const chromaJitterFactor = chromaJitterFactorBase * variance;

  const totalLightnessSpan = lightnessRange.max - lightnessRange.min;
  const totalChromaSpan = chromaRange.max - chromaRange.min;

  // Randomize how strong the contrast is between edge and center chroma.
  const edgeChromaOffset =
    (rng() - 0.5) * totalChromaSpan * 0.1 * variance; // ±10% of span
  const centerChromaOffset =
    (rng() - 0.5) * totalChromaSpan * 0.15 * variance; // ±15% of span

  let edgeChroma =
    chromaRange.max - totalChromaSpan * 0.05 + edgeChromaOffset;
  edgeChroma = clamp(edgeChroma, chromaRange.min, chromaRange.max);

  let centerChroma =
    chromaRange.min + totalChromaSpan * 0.5 + centerChromaOffset;
  centerChroma = clamp(centerChroma, chromaRange.min, chromaRange.max);

  // Randomize curvature of the lightness and chroma patterns.
  const centerBrightGamma = lerp(1.2, 1.8, variance * rng());
  const sideBrightGamma = lerp(1.0, 1.6, variance * rng());
  const chromaGamma = lerp(0.6, 1.1, variance * rng());

  const computeStopAtIndex = (index: number): void => {
    // Base linear position from left to right, 0 at first stop, 1 at last stop.
    const tFromLeftRaw =
      stopsCount === 1 ? 0 : index / (stopsCount - 1);

    // Position used in color space (hue + center distance).
    let positionForColor: number;

    if (useCenterStretch) {
      // CenterStretch fully owns the color-domain warp.
      positionForColor = warpAroundCenter(tFromLeftRaw, centerStretch);
    } else {
      // Original domain behavior (zoom compresses around center).
      const tZoomed =
        0.5 + (tFromLeftRaw - 0.5) * zoom;
      positionForColor = clamp(tZoomed, 0, 1);
    }

    // Distance from visual center (0 at center, 1 at edges) in color space.
    const dRaw = Math.min(1, Math.abs(positionForColor - 0.5) * 2);

    // Zoom always scales amplitude of center-edge difference.
    const d = dRaw * zoom;

    let h: number;

    if (hueScheme === "dual-complementary") {
      // Left half: baseHue → bridgeHue
      // Right half: bridgeHue → secondaryHue
      if (positionForColor <= 0.5) {
        const segmentT = positionForColor / 0.5; // 0..1 from left to center
        h = interpolateHue(baseHue, bridgeHue, segmentT);
      } else {
        const segmentT = (positionForColor - 0.5) / 0.5; // 0..1 from center to right
        h = interpolateHue(bridgeHue, secondaryHue, segmentT);
      }

      // Apply micro hue jitter.
      h = normalizeHue(h + (rng() - 0.5) * hueJitterMax);
    } else {
      // Mono-hue warm/cool behavior driven by center distance d.
      const warmFactor = 1 - Math.pow(d, 1.2);
      h =
        coolHue +
        (warmHue - coolHue) * warmFactor +
        (rng() - 0.5) * hueJitterMax;
      h = normalizeHue(h);
    }

    // Lightness pattern
    let brightnessFactor: number;
    if (mode === "side-bright") {
      brightnessFactor = Math.pow(d, sideBrightGamma); // bright edges, dark center
    } else {
      brightnessFactor = 1 - Math.pow(d, centerBrightGamma); // bright center, dark edges
    }

    const lightnessJitter =
      totalLightnessSpan * lightnessJitterFactor * (rng() - 0.5);
    let l =
      lightnessRange.min +
      brightnessFactor * totalLightnessSpan +
      lightnessJitter;
    l = clamp(l, lightnessRange.min, lightnessRange.max);

    // Chroma pattern (S in HSL): edges richer, center softened
    const chromaFactor = Math.pow(d, chromaGamma);
    const chromaJitter =
      totalChromaSpan * chromaJitterFactor * (rng() - 0.5);
    let s =
      centerChroma +
      chromaFactor * (edgeChroma - centerChroma) +
      chromaJitter;
    s = clamp(s, chromaRange.min, chromaRange.max);

    hues[index] = h;
    sats[index] = s;
    lights[index] = l;
  };

  // Compute unique indices
  for (let i = 0; i < uniqueCount; i += 1) {
    computeStopAtIndex(i);
  }

  if (enableMirroring) {
    // Apply mirroring for prime stops in mono scheme: 0 ↔ N-1, 1 ↔ N-2, ..., center stays unique.
    for (let i = centerIndexInt + 1; i < stopsCount; i += 1) {
      const mirrorIndex = stopsCount - 1 - i;
      hues[i] = hues[mirrorIndex];
      sats[i] = sats[mirrorIndex];
      lights[i] = lights[mirrorIndex];
    }
  } else {
    // For dual-complementary or non-prime, ensure full pattern is filled.
    for (let i = uniqueCount; i < stopsCount; i += 1) {
      computeStopAtIndex(i);
    }
  }

  // Contrast adjustment & final stops
  const result: GradientStop[] = new Array(stopsCount);

  for (let i = 0; i < stopsCount; i += 1) {
    const h = hues[i];

    // Start from auto-generated chroma/lightness.
    let s = sats[i];
    let baseL = lights[i];

    // Apply per-stop chroma override, if provided.
    if (
      perStopChroma &&
      i < perStopChroma.length &&
      typeof perStopChroma[i] === "number" &&
      Number.isFinite(perStopChroma[i] as number)
    ) {
      const overrideChroma = perStopChroma[i] as number;
      s = clamp(overrideChroma, chromaRange.min, chromaRange.max);
    }

    // Apply per-stop lightness override, if provided (before contrast adjust).
    if (
      perStopLightness &&
      i < perStopLightness.length &&
      typeof perStopLightness[i] === "number" &&
      Number.isFinite(perStopLightness[i] as number)
    ) {
      const overrideLightness = perStopLightness[i] as number;
      baseL = clamp(overrideLightness, lightnessRange.min, lightnessRange.max);
    }

    const adjustedL = adjustLightnessForContrast(
      h,
      s,
      baseL,
      lightnessRange,
      contrast
    );

    // Positions remain evenly spaced; centerStretch acts in color space only.
    const at =
      stopsCount === 1 ? 0 : i / (stopsCount - 1);

    result[i] = {
      color: colord({
        h,
        s,
        l: adjustedL,
      }).toHex(),
      at,
      hsl: {
        h,
        s,
        l: adjustedL,
      },
    };
  }

  return result;
}
