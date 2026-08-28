import type { SplitColumnCardStackConfig } from '../config/stack';

export type StackSlotPose = {
  rotateXDeg: number;
  rotateYDeg: number;
  scale: number;
  opacity: number;
};

const REST_POSE: StackSlotPose = { rotateXDeg: 0, rotateYDeg: 0, scale: 1, opacity: 1 };

/**
 * Single source of truth for a stack slot's rest 3D transform — used both
 * for at-rest rendering and as the motion hook's tilt-sub-phase target.
 * Only the *sign* of `offsetFromActive` matters (prev tilts negative, next
 * tilts positive) — every non-active slot shares the same magnitude
 * regardless of distance from center (PLAN-VERTICAL-CARD-STACK.md
 * requirement 6): only vertical position varies by distance, not tilt/
 * scale/opacity.
 */
export function resolveStackSlotPose(
  offsetFromActive: number,
  config: Pick<SplitColumnCardStackConfig, 'neighborRotationDeg' | 'neighborScaleDownPercent' | 'neighborOpacity'>,
): StackSlotPose {
  if (offsetFromActive === 0) return REST_POSE;
  const sign = offsetFromActive > 0 ? 1 : -1;
  return {
    rotateXDeg: sign * config.neighborRotationDeg,
    rotateYDeg: sign * config.neighborRotationDeg,
    scale: 1 - config.neighborScaleDownPercent,
    opacity: config.neighborOpacity,
  };
}

/**
 * Deliberately does NOT include `perspective(...)` in this transform list.
 * `perspective` is instead declared once, as a plain CSS property, on a
 * stable ancestor (`.translateLayer` — see CardStack.tsx) rather than
 * embedded in the same animated `transform` as the rotation itself.
 * `AbstractJournalLabHueFadeCard`'s own root already declares its own,
 * separate `perspective` (`.slot`'s `perspective: var(--card-tilt-
 * perspective)`, for its independent hover-tilt) — stacking a *second*,
 * *local* `transform: perspective()` directly on its immediate parent
 * nests two independent 3D projection contexts, which is what produced
 * round 8's inconsistent-looking rounded corners on rotated neighbor
 * cards (not `.viewport`'s `overflow: hidden`, which measurement confirmed
 * wasn't actually clipping anything). A single shared perspective on a
 * stable ancestor avoids the nesting.
 *
 * Deliberately rotate-only (no `scale(...)` term) — unlike rotation, scale
 * needs to be reactively blendable with live proximity via a CSS `calc()`
 * expression referencing `--pointer-proximity` (PLAN: decouple cursor-
 * intent navigation from proximity visuals), which only the caller
 * (CardStackSlot.tsx, this function's sole consumer) has the context to
 * compose — appending its own `scale(...)` term (literal `pose.scale` or a
 * `calc()` blend, depending on whether proximity-driven scale is enabled)
 * onto this string's output. `pose.scale` itself is untouched here; only
 * this string builder's own output changed.
 */
export function stackRotateCss(pose: StackSlotPose): string {
  return [
    `rotateX(${pose.rotateXDeg.toFixed(3)}deg)`,
    `rotateY(${pose.rotateYDeg.toFixed(3)}deg)`,
  ].join(' ');
}
