import type { CtaButtonMotionEasing } from '../components/CtaButton/config/registered';

export type CubeLabFaceId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type CubeLabFaceSelection = 'none' | CubeLabFaceId;

export type CubeLabConfig = {
  rotateXDeg: number;
  rotateYDeg: number;
  /** The perspective used ONLY while .cuboid is actively rotating (see
   * landedPerspectivePx below for the other state) — the "normal," more
   * dramatic 3D depth an operator dials in for the spin itself. */
  perspectivePx: number;
  /** The perspective used once a face has landed (not rotating) — deliberately
   * a MUCH larger length than perspectivePx, not a smaller/zero one:
   * `scale = perspective / (perspective - z)`, so as perspective grows far
   * past any face's own translateZ depth (faceTheCameraSelection: 'A' +
   * fillViewportEnabled pushes that as high as translateZ(50vw), which can
   * easily exceed a "normal" ~1200px perspective and magnify the landed
   * face 2-5x — confirmed live, the exact bug this field exists to fix),
   * that ratio asymptotically approaches 1 — i.e. no perceptible
   * distortion — without ever crossing zero (which would flip/invert the
   * projection mid-transition) or landing on the literal `none` keyword
   * (not interpolable by a CSS transition, so it couldn't animate in
   * smoothly). Transitions via the landing settle duration/easing below
   * (CubeNavigator.module.css's own `.stage` transition rule) — perspective
   * is an animatable CSS <length>, so easing between these two values reads
   * as the camera gradually flattening/re-adding depth, not a hard cut. */
  landedPerspectivePx: number;
  /** How far (px) the whole cuboid is pushed away from the camera (world-space
   * translateZ, negative — the actual sign is computed in cube-lab.tsx, this
   * is a positive magnitude) for the duration of an active rotation only,
   * back to 0 once landed. Combined with perspectivePx reverting to its own
   * smaller "normal" value during that same window (see perspectivePx's own
   * doc comment), this keeps the full rotating structure in frame and
   * legible instead of some part of it looming uncomfortably close to the
   * camera mid-turn, especially at fillViewportEnabled's much larger
   * translateZ depths. */
  rotationPushBackPx: number;
  /** A one-shot face preset command. Selecting a face copies the rotation
   * required to face it toward the camera into rotateXDeg/rotateYDeg. Moving
   * either manual rotation control clears this value to 'none'; it never
   * continuously overrides the manual values. */
  faceTheCameraSelection: CubeLabFaceSelection;
  /** Off (default): the fixed 20vw x 40vw cuboid from the original PoC.
   * On: every face fills the full viewport (100vw x 100dvh) instead —
   * the size the real MobileNavCube use case actually needs, so this
   * mode is what validates the mechanic at that real scale before it's
   * ever reintroduced there. */
  fillViewportEnabled: boolean;
  /** Drives the cuboid's own `transition: transform ...` (CubeNavigator.module.css)
   * — every rotation change (manual sliders or a "Face the camera"
   * selection) animates through this duration/easing instead of snapping.
   * Reuses the same CtaButtonMotionEasing tokens/curves every other motion
   * control in this codebase already exposes, rather than inventing a
   * second easing vocabulary. */
  rotationDurationMs: number;
  rotationEasing: CtaButtonMotionEasing;
  /** Drives the winddown only: the post-rotation camera reframe that returns
   * perspective and Z push-back to their settled values. Kept independent
   * from rotation timing so it can feel considered without slowing the turn. */
  settleDurationMs: number;
  settleEasing: CtaButtonMotionEasing;
  /** How many ms of the winddown (the settle reframe above) are allowed to
   * run concurrently with the tail end of turning (the rotation itself),
   * instead of waiting for the rotation to fully finish first. 0 (default)
   * keeps the original strictly sequential windup -> turning -> winddown
   * order. The rotation's own transform transition is never shortened —
   * only how early CubeNavigator is allowed to flip into the winddown
   * phase and start easing perspective/push-back back in moves earlier,
   * by up to this many ms before turning's natural end. Clamped at
   * normalize time to never exceed rotationDurationMs or settleDurationMs
   * themselves, since overlap can't outlast either motion it overlaps. */
  settleOverlapMs: number;
};

export const DEFAULT_CUBE_LAB_CONFIG = {
  rotateXDeg: -18,
  rotateYDeg: 28,
  perspectivePx: 1970,
  landedPerspectivePx: 124000,
  rotationPushBackPx: 1530,
  faceTheCameraSelection: 'E',
  fillViewportEnabled: true,
  rotationDurationMs: 590,
  rotationEasing: 'gentle',
  // The winddown is the camera's final approach after the destination face
  // has already landed. A longer, symmetric curve makes it a deliberate
  // reframe rather than a sudden zoom.
  settleDurationMs: 1500,
  settleEasing: 'linear',
  settleOverlapMs: 0,
} satisfies CubeLabConfig;

const FACE_SELECTIONS: ReadonlyArray<CubeLabFaceSelection> = ['none', 'A', 'B', 'C', 'D', 'E', 'F'];
const MOTION_EASINGS: ReadonlyArray<CtaButtonMotionEasing> = [
  'linear', 'standard', 'expressive', 'viscous', 'gentle', 'gaussian',
];

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function token<T extends string>(value: unknown, allowed: ReadonlyArray<T>, fallback: T): T {
  return typeof value === 'string' && (allowed as ReadonlyArray<string>).includes(value)
    ? (value as T)
    : fallback;
}

export function normalizeCubeLabConfig(config: Partial<CubeLabConfig> | undefined): CubeLabConfig {
  const base = { ...DEFAULT_CUBE_LAB_CONFIG, ...(config ?? {}) };
  const rotationDurationMs = clampNumber(
    base.rotationDurationMs, 0, 3000, DEFAULT_CUBE_LAB_CONFIG.rotationDurationMs,
  );
  const settleDurationMs = clampNumber(
    base.settleDurationMs, 0, 5000, DEFAULT_CUBE_LAB_CONFIG.settleDurationMs,
  );
  return {
    rotateXDeg: clampNumber(base.rotateXDeg, -180, 180, DEFAULT_CUBE_LAB_CONFIG.rotateXDeg),
    rotateYDeg: clampNumber(base.rotateYDeg, -180, 180, DEFAULT_CUBE_LAB_CONFIG.rotateYDeg),
    perspectivePx: clampNumber(base.perspectivePx, 200, 4000, DEFAULT_CUBE_LAB_CONFIG.perspectivePx),
    landedPerspectivePx: clampNumber(
      base.landedPerspectivePx, 2000, 1000000, DEFAULT_CUBE_LAB_CONFIG.landedPerspectivePx,
    ),
    rotationPushBackPx: clampNumber(
      base.rotationPushBackPx, 0, 4000, DEFAULT_CUBE_LAB_CONFIG.rotationPushBackPx,
    ),
    faceTheCameraSelection: token(
      base.faceTheCameraSelection, FACE_SELECTIONS, DEFAULT_CUBE_LAB_CONFIG.faceTheCameraSelection,
    ),
    fillViewportEnabled: base.fillViewportEnabled === true,
    rotationDurationMs,
    rotationEasing: token(base.rotationEasing, MOTION_EASINGS, DEFAULT_CUBE_LAB_CONFIG.rotationEasing),
    settleDurationMs,
    settleEasing: token(base.settleEasing, MOTION_EASINGS, DEFAULT_CUBE_LAB_CONFIG.settleEasing),
    // Can never exceed either motion it overlaps — a larger raw value would
    // either flip to winddown before turning even starts (> rotationDurationMs)
    // or claim more overlap than the settle motion itself lasts
    // (> settleDurationMs).
    settleOverlapMs: clampNumber(
      base.settleOverlapMs, 0, Math.min(rotationDurationMs, settleDurationMs),
      DEFAULT_CUBE_LAB_CONFIG.settleOverlapMs,
    ),
  };
}
