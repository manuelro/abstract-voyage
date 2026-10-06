// helpers/gradientMath.ts

import { colord, extend } from 'colord';
import mixPlugin from 'colord/plugins/mix';
import { clamp01 } from './easing';

extend([mixPlugin]);

export type SvgStop = {
  color: string;
  at: number;
  opacity?: number;
};

export type Pivot = 'left-center' | 'right-center' | 'center';

/**
 * Normalize a color string into a hex-like form that colord understands reliably.
 * If it doesn't start with '#', we prefix it.
 */
export const normalizeColor = (c: string): string =>
  c.trim().startsWith('#') ? c.trim() : `#${c.trim()}`;

/**
 * Mix two arrays of gradient stops by index at factor t in [0..1].
 * - Colors are mixed using colord's .mix().
 * - Opacity is linearly interpolated.
 * - 'at' comes from the first array; callers should generally align 'at' values.
 * - Extra stops from either side are appended untouched.
 */
export function mixStopsByIndex(a: SvgStop[], b: SvgStop[], t: number): SvgStop[] {
  const len = Math.min(a.length, b.length);
  const out: SvgStop[] = [];
  const tt = clamp01(t);

  for (let i = 0; i < len; i++) {
    const sa = a[i];
    const sb = b[i];

    const mixed = colord(normalizeColor(sa.color)).mix(normalizeColor(sb.color), tt);
    const opA = sa.opacity ?? 1;
    const opB = sb.opacity ?? 1;

    out.push({
      at: sa.at,
      color: mixed.toHex(),
      opacity: opA + (opB - opA) * tt,
    });
  }

  if (a.length > len) out.push(...a.slice(len));
  if (b.length > len) out.push(...b.slice(len));

  return out;
}

/**
 * Compute linear gradient endpoints for an SVG viewBox, matching the original
 * GradientLogo behavior:
 *
 * - Non-interactive:
 *   - Gradient runs from (0, 0) to (width * cos(rad), height * sin(rad)).
 *
 * - Interactive:
 *   - Uses the viewBox diagonal as the base length.
 *   - Applies a scale factor to that length.
 *   - Positions the gradient line according to the chosen pivot:
 *     - 'left-center': start pinned at left edge, grows rightward.
 *     - 'right-center': end pinned at right edge, grows leftward.
 *     - 'center': centered, grows symmetrically.
 */
export function computeGradientEndpoints(params: {
  angleDeg: number;
  scale: number;
  pivot: Pivot;
  width: number;
  height: number;
  interactive: boolean;
}): { x1: number; y1: number; x2: number; y2: number } {
  const { angleDeg, scale, pivot, width, height, interactive } = params;

  const rad = (angleDeg * Math.PI) / 180;

  // Default endpoints for non-interactive mode (legacy behavior).
  let x1 = 0;
  let y1 = 0;
  let x2 = width * Math.cos(rad);
  let y2 = height * Math.sin(rad);

  if (!interactive) {
    return { x1, y1, x2, y2 };
  }

  const baseL = Math.hypot(width, height);
  const lengthScale = Math.max(0, scale); // defensive clamp
  const L = lengthScale * baseL;

  const cx = width / 2;
  const cy = height / 2;

  switch (pivot) {
    case 'center': {
      const pivotX = cx;
      const pivotY = cy;
      x1 = pivotX - (L / 2) * Math.cos(rad);
      y1 = pivotY - (L / 2) * Math.sin(rad);
      x2 = pivotX + (L / 2) * Math.cos(rad);
      y2 = pivotY + (L / 2) * Math.sin(rad);
      break;
    }
    case 'right-center': {
      const pivotX = width;
      const pivotY = cy;
      x2 = pivotX;
      y2 = pivotY;
      x1 = pivotX - L * Math.cos(rad);
      y1 = pivotY - L * Math.sin(rad);
      break;
    }
    case 'left-center':
    default: {
      const pivotX = 0;
      const pivotY = cy;
      x1 = pivotX;
      y1 = pivotY;
      x2 = pivotX + L * Math.cos(rad);
      y2 = pivotY + L * Math.sin(rad);
      break;
    }
  }

  return { x1, y1, x2, y2 };
}
