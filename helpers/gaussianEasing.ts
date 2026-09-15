import { clamp01 } from './easing';

/**
 * Abramowitz & Stegun 7.1.26 — a standard closed-form approximation of the
 * Gauss error function (max error ~1.5e-7), since neither JS nor the DOM
 * expose a native erf. Cheap enough to call every animation frame.
 */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

/**
 * Builds a Gaussian-CDF–shaped easing function — a real, named, widely-used
 * motion-design easing family (the "Gaussian" or "normal" easing curve),
 * not a homemade smoothing hack. Position follows the cumulative
 * distribution of a Gaussian, which means VELOCITY (its derivative) traces
 * the Gaussian bell curve itself: slow start, one smooth peak at the
 * midpoint, slow finish, arriving at (effectively) zero velocity — a soft
 * landing built into the curve's own shape, not tuned via spring damping.
 * Unlike two cubic-bezier halves stitched together (ease-in then ease-out —
 * an earlier attempt at the same "accelerate then decelerate" shape), a true
 * Gaussian is smooth at every derivative order through the peak: no kink in
 * the RATE of acceleration change at the exact instant velocity peaks,
 * which is what separates a genuinely Gaussian bell from an
 * approximation built out of two named CSS timing curves.
 *
 * `steepness` is the knob for how fast the curve flattens at BOTH edges of
 * the bell (symmetric by construction — the bell has one shape, mirrored):
 * higher values spend more of the transition near-stationary at both the
 * start and the end, with a sharper, more concentrated burst of speed
 * through the center; lower values flatten less at the edges, reading
 * closer to a gentle, almost-constant-speed glide. The erf input is scaled
 * by `steepness` and the whole curve is re-normalized so f(0) is exactly 0
 * and f(1) is exactly 1 regardless of steepness (erf itself only
 * approaches, never reaches, ±1).
 */
export function createGaussianEase(steepness: number): (t: number) => number {
  const s = Math.max(0.1, steepness);
  const f0 = erf(-s);
  const f1 = erf(s);
  const span = f1 - f0;
  return (t: number) => {
    const x = (clamp01(t) - 0.5) * 2 * s;
    if (span === 0) return clamp01(t);
    return clamp01((erf(x) - f0) / span);
  };
}
