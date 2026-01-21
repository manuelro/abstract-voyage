// helpers/cssGradient.ts
import { colord } from 'colord';
import type { SvgStop } from './gradientMath';

export type CssGradientKind = 'linear' | 'radial' | 'conic';

export type CssGradientOptions = {
  type: CssGradientKind;
  stops: SvgStop[];

  /** For linear + conic gradients. */
  angleDeg?: number;

  /**
   * Shared anchor for radial + conic.
   * Used as `at X% Y%` in CSS.
   */
  anchorXPercent?: number;
  anchorYPercent?: number;

  /** Optional radial fine-tuning. */
  radialShape?: 'circle' | 'ellipse';
  radialExtent?: 'closest-side' | 'farthest-side' | 'closest-corner' | 'farthest-corner';
};

/**
 * Turn SvgStop[] into a CSS gradient string:
 *
 * - linear: linear-gradient(45deg, #fff 0%, #000 100%)
 * - radial: radial-gradient(circle at 50% 50%, #fff 0%, #000 100%)
 * - conic:  conic-gradient(from 90deg at 50% 50%, #fff 0%, #000 100%)
 *
 * Accepts stops with `at` in [0..1] *or* [0..100].
 */
export function stopsToCssGradient({
  type,
  stops,
  angleDeg,
  anchorXPercent,
  anchorYPercent,
  radialShape = 'circle',
  radialExtent,
}: CssGradientOptions): string {
  if (!stops || stops.length === 0) return '';

  // Detect whether `at` is already in percent space (0–100) or in [0..1].
  const isPercentScale = stops.some((s) => s.at > 1.0001);

  const normalizedStops = [...stops]
    .sort((a, b) => a.at - b.at)
    .map((stop) => {
      const position = isPercentScale ? stop.at : stop.at * 100;

      // Respect per-stop opacity if present by converting to rgba().
      let color = stop.color;
      if (
        typeof stop.opacity === 'number' &&
        stop.opacity >= 0 &&
        stop.opacity < 1
      ) {
        color = colord(stop.color).alpha(stop.opacity).toRgbString();
      }

      const clampedPos = Math.max(0, Math.min(100, position));
      const posStr = Number.isFinite(clampedPos)
        ? `${clampedPos.toFixed(2).replace(/\.?0+$/, '')}%`
        : '';

      return posStr ? `${color} ${posStr}` : color;
    });

  const stopsStr = normalizedStops.join(', ');

  // Shared "at X% Y%" part for radial/conic.
  const atPart =
    anchorXPercent != null && anchorYPercent != null
      ? `at ${anchorXPercent}% ${anchorYPercent}%`
      : '';

  if (type === 'linear') {
    const angleStr = typeof angleDeg === 'number' ? `${angleDeg}deg` : 'to right';
    return `linear-gradient(${angleStr}, ${stopsStr})`;
  }

  if (type === 'radial') {
    const shapeExtent = [radialShape, radialExtent].filter(Boolean).join(' ');
    const prefix = [shapeExtent, atPart].filter(Boolean).join(' ');
    // If no prefix bits, just `radial-gradient(color-stops...)`
    return prefix
      ? `radial-gradient(${prefix}, ${stopsStr})`
      : `radial-gradient(${stopsStr})`;
  }

  // type === 'conic'
  const fromStr = typeof angleDeg === 'number' ? `from ${angleDeg}deg` : '';
  const prefix = [fromStr, atPart].filter(Boolean).join(' ');
  return prefix
    ? `conic-gradient(${prefix}, ${stopsStr})`
    : `conic-gradient(${stopsStr})`;
}
