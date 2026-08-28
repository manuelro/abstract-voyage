import type { MutableRefObject } from 'react';
import { createCssEasingFunction } from './cubicBezierEasing';
import { clamp } from './clamp';
import type { PointerProximityState } from '../components/proximity/usePointerProximity';

export type HologramSweepGeometry = 'linear' | 'circular';
export type HologramSweepEnvelopeShape = 'gaussian' | 'inverse-gaussian';

export type HologramExciteSweepFrame = {
  easedProgress: number;
  progress: number;
  proximity: number;
  x: number;
  y: number;
};

export type HologramExciteSweepOptions = {
  /** Delay (ms) from the call to when the sweep's own timeline starts. */
  startMs?: number;
  durationMs: number;
  easingCss: string;
  /** Sign of the excite's rotateX/rotateY lean (linear geometry) or orbit
   * direction (circular geometry) — pass a per-card constant (e.g. that
   * card's own resting rotation sign) so a field of these doesn't all lean
   * or spin identically. */
  leanSign: 1 | -1;
  /** 'linear' (default, and the only shape this helper ever had before this
   * option existed — omitting it reproduces prior behavior exactly): `x`
   * peaks toward `leanSign` and back to 0, `y` falls monotonically from 1
   * to 0. 'circular': `x`/`y` instead trace a circle of `radius`,
   * `loopCount` times over the sweep's duration, direction set by
   * `leanSign` — crosses through the *full* -1..1 range on both axes
   * (`GradientRenderer.tsx`'s hue/saturation/brightness response reads
   * only `x`, never `y` — a linear sweep's `y`-only tail therefore never
   * drives them at all, which is why a linear sweep under-delivers on
   * "noticeable"), reading as an orbiting highlight rather than a single
   * directional nudge. */
  geometry?: HologramSweepGeometry;
  /** Circular geometry only — 0..1 fraction of the full -1..1 axis range
   * the orbit's radius reaches. Ignored for 'linear'. */
  radius?: number;
  /** Circular geometry only — number of full revolutions over the sweep's
   * duration. Ignored for 'linear'. */
  loopCount?: number;
  /** 'gaussian' (default): a true bell curve normalized to exactly 0 at
   * both ends and 1 at the midpoint — visually equivalent to the
   * `sin(π·progress)` shape this helper always used before this option
   * existed, so omitting it reproduces prior behavior exactly. Peak
   * mid-sweep, taper to both ends.
   * 'inverse-gaussian': the bell's complement in *spirit* — strong near
   * both the start and the end, weak in the middle — but not a literal
   * `1 - gaussian`: that construction is 1 (full strength) at the exact
   * instant the sweep's own timeline starts, an abrupt pop with no ramp-in
   * at all (the same class of artifact the card stack's neighbor-opacity
   * settle-grace work earlier in this project deliberately eliminated).
   * Implemented instead as `|sin(2π·progress)|` — exactly 0 at progress
   * 0, 0.5, and 1, peaking at 0.25 and 0.75 — a genuine two-pulse "valley"
   * shape with a smooth ramp at every zero-crossing, not a jump. */
  envelopeShape?: HologramSweepEnvelopeShape;
  /** Called every frame with this sweep's own proximity/x/y (identical to
   * what was just written to `ref.current`) plus progress/easedProgress —
   * lets a caller layer additional per-frame side effects (e.g.
   * ScatterCard's own wrapper opacity/transform, or the card stack's own
   * ambient physical tilt) on the exact same clock without re-deriving it. */
  onFrame?: (frame: HologramExciteSweepFrame) => void;
};

// exp(-((x-0.5)^2) / (2*sigma^2)), normalized so g(0) = g(1) = 0 and
// g(0.5) = 1 exactly (rather than merely "close to zero" at the edges,
// which a raw unnormalized Gaussian only approaches asymptotically). This
// specific sigma was picked to closely track sin(π·progress) — the shape
// this helper always used before `envelopeShape` existed — within ~1%
// across the whole curve, so the 'gaussian' default reproduces prior
// behavior visually, not just at the two endpoints and the center.
const GAUSSIAN_SIGMA = 0.5;
const gaussianBell = (progress: number) => {
  const raw = (t: number) => Math.exp(-((t - 0.5) ** 2) / (2 * GAUSSIAN_SIGMA ** 2));
  const edge = raw(0);
  const center = raw(0.5);
  return (raw(progress) - edge) / (center - edge);
};

const resolveEnvelope = (progress: number, shape: HologramSweepEnvelopeShape) => (
  shape === 'inverse-gaussian'
    ? Math.abs(Math.sin(2 * Math.PI * progress))
    : gaussianBell(progress)
);

/**
 * A scripted, time-driven "excite" sweep for a hologram's `{proximity, x, y}`
 * ref, factored out so `AbstractJournalLabHueFadeCard`'s card-stack ambient
 * sweep (PLAN: touch hologram reveal) and `AbstractPostDockScatterCard`'s
 * mount-entrance excite can share one RAF/easing/envelope implementation
 * instead of each hand-duplicating it. Purely a `{proximity, x, y}` writer —
 * never touches opacity, transform, or any other DOM state itself; `onFrame`
 * is the only hook for a caller that wants to layer something else on the
 * same clock.
 */
export function runHologramExciteSweep(
  ref: MutableRefObject<PointerProximityState>,
  {
    startMs = 0,
    durationMs,
    easingCss,
    leanSign,
    geometry = 'linear',
    radius = 1,
    loopCount = 1,
    envelopeShape = 'gaussian',
    onFrame,
  }: HologramExciteSweepOptions,
): () => void {
  let frame = 0;
  let startTimestamp = 0;
  const easing = createCssEasingFunction(easingCss);

  const step = (now: number) => {
    frame = 0;
    if (!startTimestamp) startTimestamp = now + Math.max(0, startMs);
    const elapsedMs = now - startTimestamp;
    const progress = elapsedMs < 0
      ? 0
      : durationMs <= 0
        ? 1
        : clamp(elapsedMs / durationMs, 0, 1);
    const easedProgress = easing(progress);
    const proximity = elapsedMs < 0 ? 0 : resolveEnvelope(progress, envelopeShape);

    let x: number;
    let y: number;
    if (geometry === 'circular') {
      // A phase offset (not a negated angle) for leanSign < 0 — cos is an
      // even function, so negating the angle alone leaves `x` identical
      // regardless of leanSign (only `y`, an odd function's argument,
      // would differ), and `x` is the one axis GradientRenderer.tsx's own
      // hue shift actually reads. A half-turn phase offset instead flips
      // the sign of *both* cos and sin, so leanSign genuinely varies the
      // hue-driving axis between cards, not just the hue-irrelevant one.
      const angle = 2 * Math.PI * loopCount * progress + (leanSign < 0 ? Math.PI : 0);
      x = radius * Math.cos(angle);
      y = radius * Math.sin(angle);
    } else {
      x = proximity * leanSign;
      y = 1 - progress;
    }

    ref.current = { proximity, x, y };
    onFrame?.({ easedProgress, progress, proximity, x, y });

    if (elapsedMs < 0 || progress < 1) {
      frame = window.requestAnimationFrame(step);
    } else {
      ref.current = { proximity: 0, x: 0, y: 0 };
    }
  };

  frame = window.requestAnimationFrame(step);
  return () => {
    if (frame) window.cancelAnimationFrame(frame);
  };
}
