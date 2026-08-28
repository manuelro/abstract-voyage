export type AbstractPaletteCadenceDistribution = 'gaussian' | 'inverted-gaussian';
export type AbstractPaletteCadenceEasing = 'minimum-jerk' | 'sine' | 'soft-expo' | 'linear';
export type AbstractPaletteCadenceState = 'initial-delay' | 'dwell' | 'transition';

export type AbstractPaletteCadenceSettings = {
  enabled: boolean;
  distribution: AbstractPaletteCadenceDistribution;
  easing: AbstractPaletteCadenceEasing;
  initialDelayMs: number;
  dwellMinMs: number;
  dwellMaxMs: number;
  transitionDurationMs: number;
  paletteTravel: number;
  distributionWidth: number;
  invertedCenterVelocity: number;
  seed: number;
};

const CURVE_SAMPLE_COUNT = 129;
const EPSILON = 0.000001;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const positiveModulo = (value: number, modulo: number) => ((value % modulo) + modulo) % modulo;

function minimumJerk(progress: number) {
  const t = clamp(progress, 0, 1);
  return t * t * t * (10 + t * (-15 + t * 6));
}

export function applyPaletteCadenceEasing(
  progress: number,
  easing: AbstractPaletteCadenceEasing,
) {
  const t = clamp(progress, 0, 1);
  if (easing === 'minimum-jerk') return minimumJerk(t);
  if (easing === 'sine') return 0.5 - Math.cos(Math.PI * t) * 0.5;
  if (easing === 'soft-expo') {
    if (t === 0 || t === 1) return t;
    return t < 0.5
      ? 2 ** (20 * t - 10) / 2
      : (2 - 2 ** (-20 * t + 10)) / 2;
  }
  return t;
}

function getVelocityWeight(
  progress: number,
  distribution: AbstractPaletteCadenceDistribution,
  width: number,
  invertedCenterVelocity: number,
) {
  const t = clamp(progress, 0, 1);
  const safeWidth = clamp(width, 0.06, 0.4);
  const distance = (t - 0.5) / safeWidth;
  const gaussian = Math.exp(-0.5 * distance * distance);
  const boundaryWindow = Math.sin(Math.PI * t) ** 0.7;

  if (distribution === 'inverted-gaussian') {
    const centerFloor = clamp(invertedCenterVelocity, 0.02, 0.9);
    return boundaryWindow * (centerFloor + (1 - gaussian) * (1 - centerFloor));
  }

  return boundaryWindow * (0.015 + gaussian * 0.985);
}

export function buildPaletteCadenceCurve(
  output: Float32Array,
  distribution: AbstractPaletteCadenceDistribution,
  width: number,
  invertedCenterVelocity: number,
) {
  const lastIndex = output.length - 1;
  if (lastIndex < 1) return output;

  output[0] = 0;
  let total = 0;
  for (let index = 1; index <= lastIndex; index += 1) {
    const midpoint = (index - 0.5) / lastIndex;
    total += getVelocityWeight(midpoint, distribution, width, invertedCenterVelocity);
    output[index] = total;
  }

  const normalization = Math.max(total, EPSILON);
  for (let index = 1; index <= lastIndex; index += 1) {
    output[index] /= normalization;
  }
  output[lastIndex] = 1;
  return output;
}

export function samplePaletteCadenceCurve(
  curve: Float32Array,
  progress: number,
  easing: AbstractPaletteCadenceEasing,
) {
  const easedProgress = applyPaletteCadenceEasing(progress, easing);
  const scaledIndex = easedProgress * (curve.length - 1);
  const lowerIndex = Math.floor(scaledIndex);
  const upperIndex = Math.min(curve.length - 1, lowerIndex + 1);
  const mixAmount = scaledIndex - lowerIndex;
  return curve[lowerIndex] + (curve[upperIndex] - curve[lowerIndex]) * mixAmount;
}

function seededUnit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function getDwellDuration(settings: AbstractPaletteCadenceSettings, cycle: number) {
  const minimum = clamp(Math.min(settings.dwellMinMs, settings.dwellMaxMs), 1000, 120000);
  const maximum = clamp(Math.max(settings.dwellMinMs, settings.dwellMaxMs), minimum, 120000);
  return minimum + (maximum - minimum) * seededUnit(settings.seed * 1000 + cycle * 0.754877666);
}

export class AbstractPaletteCadenceController {
  private readonly curve = new Float32Array(CURVE_SAMPLE_COUNT);
  private curveSignature = '';
  private wasEnabled = false;
  private state: AbstractPaletteCadenceState = 'initial-delay';
  private elapsedMs = 0;
  private dwellDurationMs = 0;
  private transitionStartPhase = 0;
  private palettePhase = 0;
  private cycle = 0;

  private syncCurve(settings: AbstractPaletteCadenceSettings) {
    const signature = [
      settings.distribution,
      settings.distributionWidth,
      settings.invertedCenterVelocity,
    ].join(':');
    if (signature === this.curveSignature) return;
    this.curveSignature = signature;
    buildPaletteCadenceCurve(
      this.curve,
      settings.distribution,
      settings.distributionWidth,
      settings.invertedCenterVelocity,
    );
  }

  private beginDwell(settings: AbstractPaletteCadenceSettings) {
    this.state = 'dwell';
    this.elapsedMs = 0;
    this.dwellDurationMs = getDwellDuration(settings, this.cycle);
  }

  private beginTransition() {
    this.state = 'transition';
    this.elapsedMs = 0;
    this.transitionStartPhase = this.palettePhase;
  }

  advance(
    deltaMs: number,
    settings: AbstractPaletteCadenceSettings,
    canStartTransition: boolean,
  ) {
    this.syncCurve(settings);
    if (!settings.enabled) {
      this.wasEnabled = false;
      return this.palettePhase;
    }

    if (!this.wasEnabled) {
      this.wasEnabled = true;
      this.state = 'initial-delay';
      this.elapsedMs = 0;
      this.dwellDurationMs = 0;
    }

    const safeDeltaMs = clamp(deltaMs, 0, 100);
    if (this.state === 'initial-delay') {
      this.elapsedMs += safeDeltaMs;
      if (this.elapsedMs >= clamp(settings.initialDelayMs, 0, 60000)) {
        this.beginDwell(settings);
      }
      return this.palettePhase;
    }

    if (this.state === 'dwell') {
      this.elapsedMs += safeDeltaMs;
      if (this.elapsedMs >= this.dwellDurationMs && canStartTransition) {
        this.beginTransition();
      }
      return this.palettePhase;
    }

    this.elapsedMs += safeDeltaMs;
    const durationMs = clamp(settings.transitionDurationMs, 400, 6000);
    const progress = clamp(this.elapsedMs / durationMs, 0, 1);
    this.palettePhase = this.transitionStartPhase +
      clamp(settings.paletteTravel, 0.04, 1) * samplePaletteCadenceCurve(
        this.curve,
        progress,
        settings.easing,
      );

    if (progress >= 1) {
      this.palettePhase = positiveModulo(this.palettePhase, 1);
      this.cycle += 1;
      this.beginDwell(settings);
    }
    return this.palettePhase;
  }

  project(
    offsetMs: number,
    settings: AbstractPaletteCadenceSettings,
    canStartTransition: boolean,
  ) {
    if (!settings.enabled) return this.palettePhase;
    const safeOffsetMs = Math.max(0, offsetMs);
    const durationMs = clamp(settings.transitionDurationMs, 400, 6000);

    if (this.state === 'transition') {
      const progress = clamp((this.elapsedMs + safeOffsetMs) / durationMs, 0, 1);
      return this.transitionStartPhase + clamp(settings.paletteTravel, 0.04, 1) *
        samplePaletteCadenceCurve(this.curve, progress, settings.easing);
    }

    if (!canStartTransition) return this.palettePhase;
    const waitMs = this.state === 'initial-delay'
      ? Math.max(0, clamp(settings.initialDelayMs, 0, 60000) - this.elapsedMs) +
        getDwellDuration(settings, this.cycle)
      : Math.max(0, this.dwellDurationMs - this.elapsedMs);
    if (safeOffsetMs <= waitMs) return this.palettePhase;

    const progress = clamp((safeOffsetMs - waitMs) / durationMs, 0, 1);
    return this.palettePhase + clamp(settings.paletteTravel, 0.04, 1) *
      samplePaletteCadenceCurve(this.curve, progress, settings.easing);
  }

  getState() {
    return this.state;
  }
}
