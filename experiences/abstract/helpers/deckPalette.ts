/*
 * Directed Chord palette engine for the abstract post dock.
 *
 * Pure functions: given a card's index, the collection size and the palette
 * config, derive a three-voice chord (dominant / support / counterpoint) and
 * bake it into a cyclic 256×1 RGBA LUT the gradient shader samples in place of
 * its full-wheel rainbow. The chord grammar:
 *
 *  - Dominant: sampled from the poster spectral ramp by card index — the deck
 *    traverses one continuous spectrum (hue-space panorama).
 *  - Support: the NEXT card's dominant (the Relay rule) — every card visibly
 *    carries the seed of the following one, chaining the collection.
 *  - Counterpoint: roughly opposite the dominant, chroma-capped — the muted
 *    tension note that gives depth without clash.
 *
 * Interpolation happens in OKLab so ramps stay perceptually smooth (no dead
 * greens or muddy grays between stops).
 */

import {
  DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG,
  type AbstractPostDockHueInfluenceConfig,
  type AbstractPostDockPaletteConfig,
} from '../components/AbstractPostDock/config/registered';
import { ABSTRACT_INK_RGB } from './abstractPalette';
import type { BreakpointTier } from '../../../components/useBreakpointTier';
import type { SliderContentSlide } from '../../../helpers/postContent';
import {
  getArticleCardFallbackPalette,
  hslToSrgb,
} from '../../../helpers/articleCardFallback';
import {
  mixOklab,
  oklabToRgb8,
  rgb8ToOklab,
  applyHueInfluenceToSrgb,
  getOklabHueRadians,
  resolveHexInfluenceOklab,
  resolveHexHueRadians,
  rotateOklabHue,
  scaleOklabChroma,
  shortestSignedAngle,
  type OklabColor,
} from './perceptualColor';

/** Per-card palette-direction state threaded into the gradient adapter.
 * Window mode keeps the original wheel (`lut: null`) and varies field
 * windows. Chord mode supplies a directed lookup texture. */
export type DeckPaletteState = {
  lut: Uint8Array | null;
  hueOffset: number | null;
  offsetX: number | null;
  chromaDuckTarget: number;
  valueRig: number;
  kinshipSeed: number;
  fallbackCss: string | null;
  masterSaturation: number;
  masterBrightness: number;
  masterContrast: number;
  masterSoftness: number;
  /** Tier-resolved gradientScale/gradientNoise (see AbstractPostDockPaletteConfig's
   * own doc comments) — resolved by the caller against the live breakpoint
   * before reaching this state, since this function has no viewport
   * awareness of its own. Overrides (not multiplies) the base
   * shaderColorScale/shaderColorRandomness uniforms, same "?? " pattern as
   * offsetX/hueOffset above. `null` when the palette is disabled, matching
   * every other palette-derived field's own disabled fallback. */
  paletteScale: number | null;
  paletteNoise: number | null;
  hueInfluenceEnabled: boolean;
  hueInfluenceMix: number;
  hueInfluenceTargetRadians: number;
  hueInfluenceTargetChroma: number;
  hueInfluenceStrength: number;
  hueInfluenceChromaScale: number;
  hueInfluenceShadowChromaScale: number;
  hueInfluenceHighlightChromaScale: number;
  hueInfluenceChromaPivot: number;
  hueInfluenceNeutralRecovery: number;
  hueInfluenceNeutralThreshold: number;
  hueInfluenceTonalRegister: number;
  hueInfluenceLightnessContrast: number;
  hueInfluenceInkUnity: number;
  hueInfluenceCounterpointWidthRadians: number;
  hueInfluenceCounterpointFalloff: number;
  hueInfluenceCounterpointChromaScale: number;
  hueInfluenceCounterpointChromaFloor: number;
  hueInfluenceDitherStrength: number;
  hueInfluenceTransitionEnabled: boolean;
  hueInfluenceTransitionDurationMs: number;
  hueInfluenceTuningResponseMs: number;
  hueInfluenceTransitionEasing: AbstractPostDockHueInfluenceConfig['transitionEasing'];
};

export type DeckChord = {
  dominant: [number, number, number];
  support: [number, number, number];
  counterpoint: [number, number, number];
};

export const DECK_PALETTE_LUT_SIZE = 256;

// The site's signature spectrum (the blob poster ramp), dark→warm.
const POSTER_RAMP: Array<[number, number, number]> = [
  [0x0e, 0x12, 0x30], // navy
  [0x2b, 0x39, 0xc4], // indigo/blue
  [0x5b, 0x34, 0xc0], // violet
  [0x8a, 0x2f, 0xb8], // purple
  [0xd0, 0x36, 0x9a], // magenta
  [0xec, 0x4b, 0x3a], // red
  [0xf4, 0x7a, 0x24], // orange
  [0xf6, 0xc2, 0x3a], // amber
];

// ── OKLab conversion (sRGB ↔ OKLab) ──────────────────────────────────────────

type Lab = OklabColor;
const rgbToOklab = rgb8ToOklab;
const oklabToRgb = oklabToRgb8;
const lerpLab = mixOklab;

// Smooth (cosine) blend keeps LUT transitions liquid rather than linear-banded.
const smoothT = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

// ── Ramp sampling & chord derivation ─────────────────────────────────────────

/** Sample the poster ramp at position t ∈ [0,1], wrapping only past the ends
 * (position exactly 1 is the ramp's end, not a wrap back to the start). */
const sampleRampLab = (position: number): Lab => {
  const wrapped =
    position > 1 || position < 0 ? ((position % 1) + 1) % 1 : position;
  const scaled = wrapped * (POSTER_RAMP.length - 1);
  const index = Math.min(POSTER_RAMP.length - 2, Math.floor(scaled));
  const t = scaled - index;
  return lerpLab(rgbToOklab(POSTER_RAMP[index]), rgbToOklab(POSTER_RAMP[index + 1]), t);
};

const rotateHue = rotateOklabHue;
const scaleChroma = scaleOklabChroma;

/**
 * Hue-rotate a plain sRGB triplet by an arbitrary degree count, in OKLab (the
 * same perceptual space computeDeckChord's own "counterpoint" voice already
 * rotates by 165° — see the module doc comment above). A thin, reusable
 * entry point for callers that just have an RGB color and want it rotated,
 * without needing their own OKLab conversion pass.
 */
export function rotateRgbHue(
  rgb: [number, number, number],
  degrees: number,
): [number, number, number] {
  return oklabToRgb(rotateHue(rgbToOklab(rgb), degrees));
}

/**
 * Scale a plain sRGB triplet's perceptual lightness (OKLab L) by `factor`
 * — below 1 darkens, above 1 lightens — without disturbing its hue/chroma.
 * Perceptually uniform darkening (unlike naively scaling r/g/b directly,
 * which shifts hue/saturation as a side effect).
 */
export function scaleRgbLightness(
  rgb: [number, number, number],
  factor: number,
): [number, number, number] {
  const [L, a, b] = rgbToOklab(rgb);
  return oklabToRgb([Math.min(1, Math.max(0, L * factor)), a, b]);
}

/** Linear-interpolate between two plain sRGB triplets (t: 0 = a, 1 = b). */
export function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const clamped = Math.min(1, Math.max(0, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * clamped),
    Math.round(a[1] + (b[1] - a[1]) * clamped),
    Math.round(a[2] + (b[2] - a[2]) * clamped),
  ];
}

const rampPosition = (
  index: number,
  count: number,
  config: AbstractPostDockPaletteConfig,
) => {
  const t = count > 1 ? index / (count - 1) : 0;
  const raw = config.rampRotation + config.rampSpan * t;
  if (config.rampPath === 'mirror') {
    // Ping-pong off the ramp ends: adjacent indices are ALWAYS ramp
    // neighbours — rotation can never create a cross-ramp seam pair.
    const cycle = ((raw % 2) + 2) % 2;
    return cycle <= 1 ? cycle : 2 - cycle;
  }
  return raw; // sampleRampLab wraps positions past the ends
};

/** Derive a card's three-voice chord (colors as sRGB triplets). */
export function computeDeckChord(
  index: number,
  count: number,
  config: AbstractPostDockPaletteConfig,
): DeckChord {
  const dominantLab = sampleRampLab(rampPosition(index, count, config));
  // Relay rule: the support voice IS the next card's dominant, so adjacent
  // cards share a voice and traversal reads as color being handed over.
  // The last card relays onward past the ramp edge (wrap) for a designed exit.
  const supportLab = config.relayEnabled
    ? sampleRampLab(rampPosition(Math.min(index + 1, count), count, config))
    : rotateHue(dominantLab, 32);
  const counterpointLab = scaleChroma(
    rotateHue(dominantLab, 165),
    config.counterpointChroma,
  );

  return {
    dominant: oklabToRgb(dominantLab),
    support: oklabToRgb(supportLab),
    counterpoint: oklabToRgb(counterpointLab),
  };
}

// ── LUT baking ────────────────────────────────────────────────────────────────

// Cycle stops (position in the LUT cycle → voice). Dominant owns ~55% of the
// cycle, support ~25%, counterpoint ~20%, and the cycle wraps seamlessly so it
// drops in wherever the shader's rainbow used to wrap.
const CHORD_CYCLE: Array<{ at: number; voice: keyof DeckChord }> = [
  { at: 0.0, voice: 'dominant' },
  { at: 0.32, voice: 'support' },
  { at: 0.58, voice: 'dominant' },
  { at: 0.82, voice: 'counterpoint' },
  { at: 1.0, voice: 'dominant' },
];

// Per-stop hue drift multipliers (× voiceSpread × ~14°). The first and last
// stops share one value so the cycle still wraps seamlessly.
const CHORD_CYCLE_SPREAD = [-0.85, 0.7, 1, -0.55, -0.85];

// Shared ink anchor for the unity glaze (the poster ramp's navy).
const INK_LAB = rgbToOklab(ABSTRACT_INK_RGB);

/**
 * Bake a chord into a cyclic RGBA LUT (DECK_PALETTE_LUT_SIZE × 1).
 *
 * Bake-time pipeline (all perceptual, in OKLab):
 *  1. voice spread — per-stop hue drift so each voice reads as a living hue
 *     region instead of a flat colour;
 *  2. chroma gain — pre-compensates the shader's multi-sample averaging;
 *  3. tonal register — every card's mean L is pulled to the shared
 *     paletteLightness anchor (the cross-card unifier), and per-texel L
 *     deviation is expanded by lightnessContrast for value interplay;
 *  4. ink unity — a glaze toward one shared ink anchor, so every card in the
 *     collection carries the same DNA.
 */
export function buildDeckPaletteLut(
  chord: DeckChord,
  config: AbstractPostDockPaletteConfig,
): Uint8Array {
  const spreadDegrees = 14 * Math.min(1, Math.max(0, config.voiceSpread));
  const baseLabs: Record<keyof DeckChord, Lab> = {
    dominant: rgbToOklab(chord.dominant),
    support: rgbToOklab(chord.support),
    counterpoint: rgbToOklab(chord.counterpoint),
  };
  const stopLabs = CHORD_CYCLE.map((stop, index) =>
    rotateHue(baseLabs[stop.voice], spreadDegrees * CHORD_CYCLE_SPREAD[index]),
  );

  const chromaGain = Math.min(2, Math.max(0, config.chordChroma));
  // OKLab L anchor: 0 → deep ink register, 1 → airy register.
  const targetL = 0.28 + 0.5 * Math.min(1, Math.max(0, config.paletteLightness));
  const chordMeanL =
    stopLabs.reduce((sum, lab) => sum + lab[0], 0) / stopLabs.length;
  const registerShift = targetL - chordMeanL;
  const contrastGain = 0.6 + 1.2 * Math.min(1, Math.max(0, config.lightnessContrast));
  const unity = Math.min(1, Math.max(0, config.inkUnity));

  const bytes = new Uint8Array(DECK_PALETTE_LUT_SIZE * 4);

  for (let i = 0; i < DECK_PALETTE_LUT_SIZE; i += 1) {
    const t = i / DECK_PALETTE_LUT_SIZE;
    let segment = CHORD_CYCLE.length - 2;
    for (let s = 0; s < CHORD_CYCLE.length - 1; s += 1) {
      if (t >= CHORD_CYCLE[s].at && t < CHORD_CYCLE[s + 1].at) {
        segment = s;
        break;
      }
    }
    const from = CHORD_CYCLE[segment];
    const to = CHORD_CYCLE[segment + 1];
    const local = (t - from.at) / Math.max(1e-6, to.at - from.at);
    const lab = lerpLab(stopLabs[segment], stopLabs[segment + 1], smoothT(local));

    // 2. chroma gain
    let L = lab[0];
    let a = lab[1] * chromaGain;
    let b = lab[2] * chromaGain;
    // 3. shared register + value contrast
    L = targetL + (L + registerShift - targetL) * contrastGain;
    // 4. ink unity glaze
    L = L + (INK_LAB[0] - L) * unity;
    a = a + (INK_LAB[1] - a) * unity;
    b = b + (INK_LAB[2] - b) * unity;

    const [red, green, blue] = oklabToRgb([L, a, b]);
    bytes[i * 4] = red;
    bytes[i * 4 + 1] = green;
    bytes[i * 4 + 2] = blue;
    bytes[i * 4 + 3] = 255;
  }

  return bytes;
}

// ── Runtime companions ────────────────────────────────────────────────────────

/** CSS color strings for the chord (fallback backgrounds, previews). */
export function deckChordCss(chord: DeckChord): {
  dominant: string;
  support: string;
  counterpoint: string;
} {
  const css = ([r, g, b]: [number, number, number]) => `rgb(${r}, ${g}, ${b})`;
  return {
    dominant: css(chord.dominant),
    support: css(chord.support),
    counterpoint: css(chord.counterpoint),
  };
}

/**
 * SSR/first-paint fallback background derived from the chord — mirrors the
 * legacy fallback's 4-stop structure so the canvas boot doesn't hue-jump.
 */
export function deckChordFallbackBackground(chord: DeckChord): string {
  const rgba = ([r, g, b]: [number, number, number], alpha: number) =>
    `rgba(${r}, ${g}, ${b}, ${alpha})`;
  const deep = chord.dominant.map((channel) => Math.round(channel * 0.42)) as [
    number,
    number,
    number,
  ];
  return [
    `radial-gradient(circle at 18% 22%, ${rgba(chord.counterpoint, 0.76)}, transparent 46%)`,
    `radial-gradient(circle at 82% 76%, ${rgba(chord.support, 0.68)}, transparent 54%)`,
    `radial-gradient(circle at 22% 82%, ${rgba(chord.dominant, 0.58)}, transparent 50%)`,
    `linear-gradient(135deg, ${rgba(deep, 1)}, ${rgba(chord.dominant, 1)} 52%, ${rgba(chord.support, 1)})`,
  ].join(', ');
}

type HueInfluencedFallbackOptions = {
  targetHueRadians: number;
  targetChroma: number;
  strength: number;
  chromaScale: number;
  gradeMix: number;
  shadowChromaScale: number;
  highlightChromaScale: number;
  chromaPivot: number;
  neutralRecovery: number;
  neutralThreshold: number;
  tonalRegister: number;
  lightnessContrast: number;
  inkUnity: number;
  antipodeFeatherRadians: number;
  counterpointFalloff: number;
  counterpointChromaScale: number;
  counterpointChromaFloor: number;
};

const hueInfluencedFallbackRgb = (
  color: [number, number, number],
  options: HueInfluencedFallbackOptions,
) => applyHueInfluenceToSrgb(
  color.map(channel => channel / 255) as [number, number, number],
  {
    enabled: true,
    ...options,
  },
).map(channel => Math.round(channel * 255)) as [number, number, number];

const hueInfluencedFallbackSrgb = (
  color: [number, number, number],
  options: HueInfluencedFallbackOptions,
) => applyHueInfluenceToSrgb(color, {
  enabled: true,
  ...options,
}).map(channel => Math.round(channel * 255)) as [number, number, number];

const fallbackRgb = (
  [red, green, blue]: [number, number, number],
  alpha?: number,
) => alpha === undefined
  ? `rgb(${red}, ${green}, ${blue})`
  : `rgba(${red}, ${green}, ${blue}, ${alpha})`;

function hueInfluencedArticleFallbackBackground(
  seed: number,
  options: HueInfluencedFallbackOptions,
) {
  const source = getArticleCardFallbackPalette(seed);
  const grade = (color: Parameters<typeof hslToSrgb>[0]) =>
    hueInfluencedFallbackSrgb(hslToSrgb(color), options);

  return [
    `radial-gradient(circle at 18% 22%, ${fallbackRgb(grade(source.upper), 0.76)}, transparent 46%)`,
    `radial-gradient(circle at 82% 76%, ${fallbackRgb(grade(source.lowerRight), 0.68)}, transparent 54%)`,
    `radial-gradient(circle at 22% 82%, ${fallbackRgb(grade(source.lowerLeft), 0.58)}, transparent 50%)`,
    `linear-gradient(135deg, ${fallbackRgb(grade(source.baseStart))}, ${fallbackRgb(grade(source.baseMiddleA))} 34%, ${fallbackRgb(grade(source.baseMiddleB))} 68%, ${fallbackRgb(grade(source.baseEnd))})`,
  ].join(', ');
}

function hueInfluencedChordFallbackBackground(
  chord: DeckChord,
  options: HueInfluencedFallbackOptions,
) {
  const deep = chord.dominant.map(channel => Math.round(channel * 0.42)) as [
    number,
    number,
    number,
  ];
  const dominant = hueInfluencedFallbackRgb(chord.dominant, options);
  const support = hueInfluencedFallbackRgb(chord.support, options);
  const counterpoint = hueInfluencedFallbackRgb(chord.counterpoint, options);

  return [
    `radial-gradient(circle at 18% 22%, ${fallbackRgb(counterpoint, 0.76)}, transparent 46%)`,
    `radial-gradient(circle at 82% 76%, ${fallbackRgb(support, 0.68)}, transparent 54%)`,
    `radial-gradient(circle at 22% 82%, ${fallbackRgb(dominant, 0.58)}, transparent 50%)`,
    `linear-gradient(135deg, ${fallbackRgb(hueInfluencedFallbackRgb(deep, options))}, ${fallbackRgb(dominant)} 52%, ${fallbackRgb(support)})`,
  ].join(', ');
}

/**
 * Window mode: index-driven rotation of the ORIGINAL colour wheel — a
 * hue-space panorama with untouched per-card colour quality. Centred so the
 * middle of the collection sits at the neutral wheel phase; clamped to the
 * shader's ±0.36 wheel range.
 */
export function deckWindowHueOffset(
  index: number,
  count: number,
  hueSpread: number,
): number {
  if (count <= 1) return 0;
  const centered = index / (count - 1) - 0.5;
  const offset = centered * Math.min(0.72, Math.max(0, hueSpread));
  return Math.min(0.36, Math.max(-0.36, offset));
}

/**
 * Hue influence treats the directed palette as an accent around the selected
 * family, not as another full wheel rotation. A full-strength coupling may
 * move at most 24 degrees from the authored target; lower values scale that
 * bounded accent proportionally. This keeps "deep blue" recognizably blue
 * even when Window mode spans most of the color wheel.
 */
export function resolveCoupledHueTargetRadians(
  baseTargetHueRadians: number,
  paletteAnchorRadians: number,
  paletteHueCoupling: number,
) {
  const normalizedAnchor = Math.min(
    1,
    Math.max(-1, shortestSignedAngle(paletteAnchorRadians) / Math.PI),
  );
  const maximumAccentRadians = 24 * Math.PI / 180;
  return baseTargetHueRadians +
    normalizedAnchor *
    maximumAccentRadians *
    Math.min(1, Math.max(0, paletteHueCoupling));
}

/**
 * Window mode: index-proportional window offset into the shared field — every
 * card is a different window onto the same sky. Centred around the field
 * origin so the deck straddles it symmetrically.
 */
export function deckWindowOffsetX(
  index: number,
  count: number,
  windowStep: number,
): number {
  if (count <= 1) return 0;
  const centered = index - (count - 1) / 2;
  return centered * Math.max(0, windowStep);
}

/**
 * Window mode, Gaussian pan curve: the raw 0..1 bell value at `index` for a
 * curve peaking at `peakIndex` (a REAL index value, e.g. -1 for a synthetic
 * header slot — not a 0..1 normalized fraction) with width `sigma` — 1 at
 * the peak, falling off smoothly and symmetrically on both sides. Single
 * source of truth reused by every gaussian-mode signal that needs to know
 * "how loud is this card" — currently deckGaussianOffsetX (pan magnitude)
 * and buildDeckPaletteStates's chromaDuckTarget (visible saturation bell) —
 * so tuning peak/width once reshapes every signal derived from it in lockstep.
 */
export function deckGaussianEnvelope(
  index: number,
  peakIndex: number,
  sigma: number,
): number {
  const safeSigma = Math.max(0.01, sigma);
  return Math.exp(-Math.pow((index - peakIndex) / safeSigma, 2));
}

/**
 * Window mode, Gaussian pan curve: a bell-shaped pan offset across the
 * sequence, peaking at `peakIndex` with magnitude `amplitude` and width
 * `sigma`, floored at `floor` so distant cards never fully flatten to zero
 * pan. Unsigned and monotonic on each side of the peak — the card AT
 * peakIndex gets the full `amplitude` (the loudest/widest window), and
 * every other card recedes smoothly toward `floor` the farther it sits from
 * the peak, matching a plotted Gaussian density (always non-negative,
 * maximal at μ) rather than deckWindowOffsetX's own bipolar
 * sign-flips-at-centre convention — this curve reshapes both magnitude AND
 * direction relative to the linear curve, by design: it composes one
 * continuous "loudest here, quieter elsewhere" silhouette across
 * independently-rendered cards instead of a symmetric left/right fan.
 */
export function deckGaussianOffsetX(
  index: number,
  peakIndex: number,
  sigma: number,
  amplitude: number,
  floor: number,
): number {
  return floor + (amplitude - floor) * deckGaussianEnvelope(index, peakIndex, sigma);
}

/**
 * Field-kinship seed: blend each card's individual seed toward a tight
 * per-index phase family, so neighboring fields read as the same weather
 * system at different moments (0 = fully individual, 1 = tight family).
 */
export function deckKinshipSeed(
  slideSeed: number,
  index: number,
  kinship: number,
): number {
  const family = 0.35 + index * 0.021;
  const k = Math.min(1, Math.max(0, kinship));
  return slideSeed + (family - slideSeed) * k;
}

/**
 * Build the complete per-card palette/source state used by the Abstract
 * gradient renderer. Journal and labs share this function so the metallic
 * treatment starts from the same genuinely varied color fields rather than
 * reconstructing a second approximation.
 *
 * `activeIndex: null` means the collection has no active-card semantics and
 * therefore applies no inactive chroma duck (the lab grid case).
 */
/** base/Wide/Lg tier pick — the same shape as PolymorphicLayout.tsx's own
 * private resolveColorTier, duplicated locally rather than exported from
 * that shared component file for a single narrow use here. */
function resolvePaletteTier<T>(tier: BreakpointTier, base: T, wide: T, lg: T): T {
  return tier === 'lg' ? lg : tier === 'md' ? wide : base;
}

export function buildDeckPaletteStates({
  slides,
  paletteConfig,
  hueInfluenceConfig,
  activeIndex = null,
  tier = 'mobile',
}: {
  slides: readonly SliderContentSlide[];
  paletteConfig: AbstractPostDockPaletteConfig | null | undefined;
  hueInfluenceConfig?: AbstractPostDockHueInfluenceConfig | null;
  activeIndex?: number | null;
  /** Live breakpoint tier (components/useBreakpointTier.ts) — resolves
   * gradientScale/gradientNoise's own base/Wide/Lg triplet. Defaults to
   * 'mobile' (this file's own SSR-safe default, matching useBreakpointTier's
   * pre-measurement value) for the many existing call sites that don't pass
   * a live tier; those callers keep today's base-tier-only behavior. */
  tier?: BreakpointTier;
}): DeckPaletteState[] | null {
  const directedPaletteEnabled = Boolean(paletteConfig?.enabled);
  const hueInfluenceEnabled = Boolean(
    hueInfluenceConfig?.enabled && hueInfluenceConfig.gradeMix > 0,
  );
  if ((!directedPaletteEnabled && !hueInfluenceEnabled) || slides.length === 0) {
    return null;
  }

  const baseStates = directedPaletteEnabled && paletteConfig?.mode === 'window'
    ? slides.map((slide, index) => ({
        lut: null,
        hueOffset: deckWindowHueOffset(
          index,
          slides.length,
          paletteConfig.hueSpread,
        ),
        offsetX: paletteConfig.windowPanCurve === 'gaussian'
          ? deckGaussianOffsetX(
              index,
              paletteConfig.gaussianPeakIndex,
              paletteConfig.gaussianSigma,
              paletteConfig.gaussianAmplitude,
              paletteConfig.gaussianFloor,
            )
          : deckWindowOffsetX(
              index,
              slides.length,
              paletteConfig.windowStep,
            ),
        // Preserve the journal's production behavior: every seed is partially
        // pulled toward one family seed while retaining its individual part.
        kinshipSeed: deckKinshipSeed(
          slide.seed,
          0,
          paletteConfig.fieldKinship,
        ),
        fallbackCss: null,
      }))
    : directedPaletteEnabled && paletteConfig
      ? slides.map((slide, index) => {
        const chord = computeDeckChord(index, slides.length, paletteConfig);

        return {
          lut: buildDeckPaletteLut(chord, paletteConfig),
          hueOffset: null,
          offsetX: null,
          kinshipSeed: deckKinshipSeed(
            slide.seed,
            index,
            paletteConfig.fieldKinship,
          ),
          fallbackCss: deckChordFallbackBackground(chord),
        };
      })
      : slides.map(slide => ({
        lut: null,
        hueOffset: null,
        offsetX: null,
        kinshipSeed: slide.seed,
        fallbackCss: null,
      }));

  const baseTargetHueRadians = resolveHexHueRadians(
    hueInfluenceConfig?.targetColor ??
      DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG.targetColor,
    DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG.targetColor,
  ) + (
    hueInfluenceConfig?.hueTrimDegrees ??
      DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG.hueTrimDegrees
  ) * Math.PI / 180;
  const targetLab = resolveHexInfluenceOklab(
    hueInfluenceConfig?.targetColor ??
      DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG.targetColor,
    DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG.targetColor,
  );
  const targetChroma = Math.hypot(targetLab[1], targetLab[2]);
  const paletteHueAnchors = (() => {
    if (!directedPaletteEnabled || !paletteConfig) {
      return slides.map(() => 0);
    }
    if (paletteConfig.mode === 'window') {
      return slides.map((_, index) => (
        deckWindowHueOffset(
          index,
          slides.length,
          paletteConfig.hueSpread,
        ) * Math.PI * 2
      ));
    }

    const hues = slides.map((_, index) => (
      getOklabHueRadians(rgbToOklab(
        computeDeckChord(index, slides.length, paletteConfig).dominant,
      )) ?? 0
    ));
    const meanHue = Math.atan2(
      hues.reduce((sum, hue) => sum + Math.sin(hue), 0),
      hues.reduce((sum, hue) => sum + Math.cos(hue), 0),
    );
    return hues.map(hue => shortestSignedAngle(hue - meanHue));
  })();
  const resolvedHueConfig = {
    gradeMix: hueInfluenceConfig?.gradeMix ?? 0,
    strength: hueInfluenceConfig?.strength ?? 0,
    chromaScale: hueInfluenceConfig?.chromaScale ?? 1,
    shadowChromaScale: hueInfluenceConfig?.shadowChromaScale ?? 1,
    highlightChromaScale: hueInfluenceConfig?.highlightChromaScale ?? 1,
    chromaPivot: hueInfluenceConfig?.chromaPivot ?? 0.52,
    neutralRecovery: hueInfluenceConfig?.neutralRecovery ?? 0,
    neutralThreshold: hueInfluenceConfig?.neutralThreshold ?? 0.08,
    tonalRegister: hueInfluenceConfig?.tonalRegister ?? 0,
    lightnessContrast: hueInfluenceConfig?.lightnessContrast ?? 1,
    inkUnity: hueInfluenceConfig?.inkUnity ?? 0,
    antipodeFeatherRadians:
      (hueInfluenceConfig?.counterpointWidthDegrees ?? 18) * Math.PI / 180,
    counterpointFalloff: hueInfluenceConfig?.counterpointFalloff ?? 4,
    counterpointChromaScale:
      hueInfluenceConfig?.counterpointChromaScale ?? 1,
    counterpointChromaFloor:
      hueInfluenceConfig?.counterpointChromaFloor ?? 0,
  };

  return baseStates.map((base, index) => {
    const targetHueRadians = resolveCoupledHueTargetRadians(
      baseTargetHueRadians,
      paletteHueAnchors[index],
      hueInfluenceConfig?.paletteHueCoupling ?? 0,
    );
    const fallbackOptions = {
      targetHueRadians,
      targetChroma,
      ...resolvedHueConfig,
    };

    return {
      ...base,
      fallbackCss: hueInfluenceEnabled
        ? directedPaletteEnabled &&
          paletteConfig?.mode === 'chord'
          ? hueInfluencedChordFallbackBackground(
            computeDeckChord(index, slides.length, paletteConfig),
            fallbackOptions,
          )
          : hueInfluencedArticleFallbackBackground(
            slides[index].seed,
            fallbackOptions,
          )
        : base.fallbackCss,
      // Gaussian pan curve: chromaDuckTarget is this curve's own visible
      // amplitude channel (see deckGaussianEnvelope's own doc comment) —
      // the card at the peak stays fully saturated, cards farther away
      // desaturate toward ink, continuously, using the SAME inactiveChromaDuck
      // knob the binary linear/chord duck already uses (reused, not a new
      // field) and the SAME peak/width the pan curve itself reads. This
      // replaces the linear/chord "duck whichever row isn't focused" gate
      // entirely while gaussian mode is active — the bell is the one signal,
      // not composed with focus state. Not test-mode-gated: in gaussian
      // mode this duck IS the thing gaussianVisualTestModeEnabled exists to
      // make legible, not a confound to strip (valueRig below stays gated —
      // it's a within-card luminance shape with no per-card bell reading).
      chromaDuckTarget:
        !directedPaletteEnabled || !paletteConfig
          ? 0
          : paletteConfig.mode === 'window' && paletteConfig.windowPanCurve === 'gaussian'
            ? paletteConfig.inactiveChromaDuck * (1 - deckGaussianEnvelope(
                index, paletteConfig.gaussianPeakIndex, paletteConfig.gaussianSigma,
              ))
            : !paletteConfig.gaussianVisualTestModeEnabled &&
              activeIndex !== null &&
              index !== activeIndex
              ? paletteConfig.inactiveChromaDuck
              : 0,
      valueRig: directedPaletteEnabled && paletteConfig && !paletteConfig.gaussianVisualTestModeEnabled
        ? paletteConfig.valueRigAmount
        : 0,
      masterSaturation: directedPaletteEnabled && paletteConfig
        ? paletteConfig.masterSaturation
        : 1,
      masterBrightness: directedPaletteEnabled && paletteConfig
        ? paletteConfig.masterBrightness
        : 1,
      masterContrast: directedPaletteEnabled && paletteConfig
        ? paletteConfig.masterContrast
        : 1,
      masterSoftness: directedPaletteEnabled && paletteConfig
        ? paletteConfig.masterSoftness
        : 0,
      paletteScale: directedPaletteEnabled && paletteConfig
        ? resolvePaletteTier(tier, paletteConfig.gradientScale, paletteConfig.gradientScaleWide, paletteConfig.gradientScaleLg)
        : null,
      paletteNoise: directedPaletteEnabled && paletteConfig
        ? resolvePaletteTier(tier, paletteConfig.gradientNoise, paletteConfig.gradientNoiseWide, paletteConfig.gradientNoiseLg)
        : null,
      hueInfluenceEnabled,
      hueInfluenceMix: hueInfluenceEnabled
        ? hueInfluenceConfig?.gradeMix ?? 0
        : 0,
      hueInfluenceTargetRadians: targetHueRadians,
      hueInfluenceTargetChroma: targetChroma,
      hueInfluenceStrength: hueInfluenceConfig?.strength ?? 0,
      hueInfluenceChromaScale: hueInfluenceConfig?.chromaScale ?? 1,
      hueInfluenceShadowChromaScale:
        hueInfluenceConfig?.shadowChromaScale ?? 1,
      hueInfluenceHighlightChromaScale:
        hueInfluenceConfig?.highlightChromaScale ?? 1,
      hueInfluenceChromaPivot: hueInfluenceConfig?.chromaPivot ?? 0.52,
      hueInfluenceNeutralRecovery:
        hueInfluenceConfig?.neutralRecovery ?? 0,
      hueInfluenceNeutralThreshold:
        hueInfluenceConfig?.neutralThreshold ?? 0.08,
      hueInfluenceTonalRegister: hueInfluenceConfig?.tonalRegister ?? 0,
      hueInfluenceLightnessContrast:
        hueInfluenceConfig?.lightnessContrast ?? 1,
      hueInfluenceInkUnity: hueInfluenceConfig?.inkUnity ?? 0,
      hueInfluenceCounterpointWidthRadians:
        (hueInfluenceConfig?.counterpointWidthDegrees ?? 18) * Math.PI / 180,
      hueInfluenceCounterpointFalloff:
        hueInfluenceConfig?.counterpointFalloff ?? 4,
      hueInfluenceCounterpointChromaScale:
        hueInfluenceConfig?.counterpointChromaScale ?? 1,
      hueInfluenceCounterpointChromaFloor:
        hueInfluenceConfig?.counterpointChromaFloor ?? 0,
      hueInfluenceDitherStrength: hueInfluenceConfig?.ditherStrength ?? 0,
      hueInfluenceTransitionEnabled:
        hueInfluenceConfig?.transitionEnabled ?? false,
      hueInfluenceTransitionDurationMs:
        hueInfluenceConfig?.transitionDurationMs ?? 0,
      hueInfluenceTuningResponseMs:
        hueInfluenceConfig?.tuningResponseMs ?? 0,
      hueInfluenceTransitionEasing:
        hueInfluenceConfig?.transitionEasing ?? 'soft-expo',
    };
  });
}
