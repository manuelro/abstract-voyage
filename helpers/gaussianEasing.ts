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
 * Builds a Gaussian-CDF–shaped easing function: position follows the
 * cumulative distribution of a Gaussian, which means VELOCITY (its
 * derivative) traces the Gaussian bell curve itself — slow start, a single
 * smooth peak roughly at the midpoint, slow finish, arriving with
 * (effectively) zero velocity. This is the mathematically correct shape for
 * "accelerates smoothly to a peak, then decelerates smoothly to a soft
 * landing" — a plain Gaussian-shaped ACCELERATION curve cannot do this: an
 * acceleration curve that stays positive the whole time only ever
 * increases velocity, so it can never land at rest (see
 * COVER_FLOW_PANEL/settleMotionCurve's own doc comment in CoverFlow.config.ts
 * for the full reasoning this promotes).
 *
 * `steepness` controls how peaked the velocity bell is: higher values spend
 * more of the transition near-stationary at both ends with a sharper burst
 * of speed in the middle; lower values read closer to a gentle, almost
 * linear ramp. The erf input is scaled by `steepness` and the whole curve is
 * re-normalized so f(0) is exactly 0 and f(1) is exactly 1 regardless of
 * steepness (erf itself only approaches, never reaches, ±1).
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
