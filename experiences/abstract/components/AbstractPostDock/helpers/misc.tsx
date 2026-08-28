import { clamp } from '../../../../../helpers/clamp';
import type { LiquidSliderConfig, LiquidSliderMotionValues } from '../config/legacy';

export type MotionRuntimeState = {
  target: LiquidSliderMotionValues;
  velocity: Omit<LiquidSliderMotionValues, 'direction' | 'isDragging'>;
  drag: {
    active: boolean;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    width: number;
    height: number;
  };
  decayActive: boolean;
};

export function cloneMotionValues(values: LiquidSliderMotionValues): LiquidSliderMotionValues {
  return { ...values };
}

export function signDirection(value: number): -1 | 0 | 1 {
  if (value > 0.0001) return 1;
  if (value < -0.0001) return -1;
  return 0;
}

// Gentle S-curve — eases the proximity→scale ramp at the extremes while staying
// continuously tied to gesture progress, so the active slide grows into its final
// size progressively instead of snapping through a fixed-duration transition.
export function smootherstep(value: number): number {
  const x = clamp(value, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function colorToRgba(color: string, alpha: number) {
  const normalizedAlpha = clamp(alpha, 0, 1);
  const hex = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
  }
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    const r = parseInt(hex[1] + hex[1], 16);
    const g = parseInt(hex[2] + hex[2], 16);
    const b = parseInt(hex[3] + hex[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
  }
  return `rgba(0, 0, 0, ${normalizedAlpha})`;
}

export function getMotionScale(config: LiquidSliderConfig, prefersReducedMotion: boolean) {
  if (!config.enabled) return 0;
  return prefersReducedMotion ? clamp(config.reducedMotionScale, 0, 0.35) : 1;
}
