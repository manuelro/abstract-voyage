// helpers/easing.ts

/**
 * Clamp a number into the [0, 1] range.
 */
export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * CSS-like cubic-bezier evaluator: returns y for input x in [0..1].
 *
 * This mirrors how browser timing functions behave:
 * - (x1, y1, x2, y2) control points
 * - x is the normalized input progress
 * - returns normalized output progress
 */
export function cubicBezierEval(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number
): number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  let t = clamp01(x);

  // Newton-Raphson iteration for better convergence
  for (let i = 0; i < 5; i++) {
    const xEst = sampleX(t) - x;
    const dEst = sampleDX(t);
    if (Math.abs(xEst) < 1e-5 || Math.abs(dEst) < 1e-5) break;
    t = clamp01(t - xEst / dEst);
  }

  // Fallback binary subdivision if NR didn't converge enough
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 5 && Math.abs(sampleX(t) - x) > 1e-5; i++) {
    if (sampleX(t) > x) t1 = t;
    else t0 = t;
    t = (t0 + t1) / 2;
  }

  return sampleY(t);
}

/**
 * Ease-out curve: slower near 0, faster toward 1.
 * Matches the original cubic-bezier(0.33, 1, 0.68, 1).
 */
export const easeOut = (x: number): number =>
  cubicBezierEval(0.33, 1, 0.68, 1, clamp01(x));

/**
 * Linear easing: direct mapping of input to output.
 */
export const easeLinear = (x: number): number => clamp01(x);
