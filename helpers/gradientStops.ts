// helpers/gradientStops.ts

import { colord } from 'colord';

import { clamp01 } from './easing';
import { SvgStop, mixStopsByIndex, normalizeColor } from './gradientMath';

export type InteractiveStopsOptions = {
  /** Base gradient stops (defaults or caller-provided). */
  baseStops: SvgStop[];
  /** Enable proximity-based morphing between from/to stops. */
  interactive?: boolean;
  /**
   * Optional "from" stops for interactive morph.
   * Should generally match textStopsTo in length/positions.
   */
  textStopsFrom?: SvgStop[];
  /**
   * Optional "to" stops for interactive morph.
   * Should generally match textStopsFrom in length/positions.
   */
  textStopsTo?: SvgStop[];
  /** Progress factor in [0..1], typically progressForText. */
  progress: number;
};

/**
 * Compute the effective gradient stops for the current frame.
 *
 * - If interactive + from/to stops are provided: mixes them by index using progress.
 * - Otherwise: returns the base stops.
 * - Always returns stops sorted by `at` ascending.
 */
export function computeInteractiveStops({
  baseStops,
  interactive,
  textStopsFrom,
  textStopsTo,
  progress,
}: InteractiveStopsOptions): SvgStop[] {
  let effectiveStops = baseStops;

  if (
    interactive &&
    textStopsFrom &&
    textStopsTo &&
    textStopsFrom.length &&
    textStopsTo.length
  ) {
    const fromSorted = textStopsFrom.slice().sort((a, b) => a.at - b.at);
    const toSorted = textStopsTo.slice().sort((a, b) => a.at - b.at);
    const t = clamp01(progress);

    effectiveStops = mixStopsByIndex(fromSorted, toSorted, t);
  }

  return effectiveStops.slice().sort((a, b) => a.at - b.at);
}

export type BrightnessOptions = {
  /**
   * Lighten factor applied at rest (progress = 0).
   * 0 = original colors, 1 = fully white.
   */
  brightnessBase?: number;
  /**
   * Additional lighten factor applied at full progress (progress = 1),
   * scaled linearly by `progress`.
   */
  brightnessBoost?: number;
  /** Progress in [0..1], typically progressForText. */
  progress: number;
};

/**
 * Compute the effective lighten factor in [0..1] given base/boost and progress.
 *
 * lighten = clamp01( clamp01(base) + clamp01(boost) * clamp01(progress) )
 */
export function computeBrightnessFactor({
  brightnessBase,
  brightnessBoost,
  progress,
}: BrightnessOptions): number {
  const baseLighten = clamp01(brightnessBase ?? 0);
  const boostLighten = clamp01(brightnessBoost ?? 0);
  const brightnessProgress = clamp01(progress);

  return clamp01(baseLighten + boostLighten * brightnessProgress);
}

/**
 * Apply a brightness/lighten factor to a set of stops by mixing toward white.
 *
 * - If `lightenFactor` <= 0: returns the original stops (no allocation).
 * - Otherwise: returns a new array with colors mixed toward #ffffff.
 */
export function brightenStops(
  stops: SvgStop[],
  lightenFactor: number
): SvgStop[] {
  if (!stops.length) return stops;

  const factor = clamp01(lightenFactor);
  if (factor <= 0) return stops;

  return stops.map((stop) => {
    const base = colord(normalizeColor(stop.color));
    const lightened = base.mix('#ffffff', factor);

    return {
      ...stop,
      color: lightened.toHex(),
    };
  });
}
