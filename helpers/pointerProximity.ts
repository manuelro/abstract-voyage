export type PointerProximityEasing =
  | 'linear'
  | 'smoothstep'
  | 'smootherstep'
  | 'ease-out-cubic';

export type PointerProximityRect = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export type PointerPosition = {
  x: number;
  y: number;
};

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function distanceToRect(
  pointerX: number,
  pointerY: number,
  rect: PointerProximityRect,
) {
  const deltaX = Math.max(rect.left - pointerX, 0, pointerX - rect.right);
  const deltaY = Math.max(rect.top - pointerY, 0, pointerY - rect.bottom);
  return Math.hypot(deltaX, deltaY);
}

/** Normalizes pointer position around the element center to a stable -1…1 range. */
export function resolvePointerPosition(
  pointerX: number,
  pointerY: number,
  rect: PointerProximityRect,
): PointerPosition {
  const centerX = (rect.left + rect.right) / 2;
  const centerY = (rect.top + rect.bottom) / 2;
  const halfWidth = Math.max(1, (rect.right - rect.left) / 2);
  const halfHeight = Math.max(1, (rect.bottom - rect.top) / 2);
  return {
    x: Math.min(1, Math.max(-1, (pointerX - centerX) / halfWidth)),
    y: Math.min(1, Math.max(-1, (pointerY - centerY) / halfHeight)),
  };
}

export function applyPointerProximityEasing(
  value: number,
  easing: PointerProximityEasing,
) {
  const progress = clamp01(value);
  switch (easing) {
    case 'linear':
      return progress;
    case 'smoothstep':
      return progress * progress * (3 - 2 * progress);
    case 'ease-out-cubic':
      return 1 - ((1 - progress) ** 3);
    case 'smootherstep':
    default:
      return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
  }
}

export function resolvePointerProximity({
  distance,
  easing,
  radius,
}: {
  distance: number;
  easing: PointerProximityEasing;
  radius: number;
}) {
  const safeRadius = Math.max(1, radius);
  return applyPointerProximityEasing(1 - Math.max(0, distance) / safeRadius, easing);
}

/** Time-correct attack/release envelope, stable across different frame rates. */
export function stepPointerProximityEnvelope({
  attackMs,
  current,
  deltaMs,
  releaseMs,
  target,
}: {
  attackMs: number;
  current: number;
  deltaMs: number;
  releaseMs: number;
  target: number;
}) {
  const rising = target > current;
  const timeConstant = Math.max(1, rising ? attackMs : releaseMs);
  const coefficient = 1 - Math.exp(-Math.max(0, deltaMs) / timeConstant);
  const next = current + (target - current) * coefficient;
  return Math.abs(target - next) < 0.0005 ? target : clamp01(next);
}

/** Unbounded time-correct damping for directional values such as pointer tilt. */
export function stepDampedValue({
  current,
  deltaMs,
  responseMs,
  target,
}: {
  current: number;
  deltaMs: number;
  responseMs: number;
  target: number;
}) {
  const coefficient = 1 - Math.exp(
    -Math.max(0, deltaMs) / Math.max(1, responseMs),
  );
  const next = current + (target - current) * coefficient;
  return Math.abs(target - next) < 0.0005 ? target : next;
}
