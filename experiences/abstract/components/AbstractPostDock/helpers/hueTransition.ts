import type { EasingFunction } from '../../../../../helpers/cubicBezierEasing';
import type { DeckPaletteState } from '../../../helpers/deckPalette';

export type HueUniformState = {
  mix: number;
  targetHueRadians: number;
  targetChroma: number;
  strength: number;
  chromaScale: number;
  shadowChromaScale: number;
  highlightChromaScale: number;
  chromaPivot: number;
  neutralRecovery: number;
  neutralThreshold: number;
  tonalRegister: number;
  lightnessContrast: number;
  inkUnity: number;
  counterpointWidthRadians: number;
  counterpointFalloff: number;
  counterpointChromaScale: number;
  counterpointChromaFloor: number;
  ditherStrength: number;
};

export type HueTransitionState = {
  from: HueUniformState;
  to: HueUniformState;
  rendered: HueUniformState;
  startedAtMs: number;
  durationMs: number;
  easing: EasingFunction;
  active: boolean;
};

export const NEUTRAL_HUE_UNIFORM_STATE: HueUniformState = {
  mix: 0,
  targetHueRadians: 0,
  targetChroma: 0,
  strength: 0,
  chromaScale: 1,
  shadowChromaScale: 1,
  highlightChromaScale: 1,
  chromaPivot: 0.52,
  neutralRecovery: 0,
  neutralThreshold: 0.08,
  tonalRegister: 0,
  lightnessContrast: 1,
  inkUnity: 0,
  counterpointWidthRadians: Math.PI / 10,
  counterpointFalloff: 4,
  counterpointChromaScale: 1,
  counterpointChromaFloor: 0,
  ditherStrength: 0,
};

export function hueUniformStateFromPalette(
  palette: DeckPaletteState | null,
  fallback: HueUniformState = NEUTRAL_HUE_UNIFORM_STATE,
): HueUniformState {
  if (!palette) return { ...fallback, mix: 0 };
  return {
    mix: palette.hueInfluenceEnabled ? palette.hueInfluenceMix : 0,
    targetHueRadians: palette.hueInfluenceTargetRadians,
    targetChroma: palette.hueInfluenceTargetChroma,
    strength: palette.hueInfluenceStrength,
    chromaScale: palette.hueInfluenceChromaScale,
    shadowChromaScale: palette.hueInfluenceShadowChromaScale,
    highlightChromaScale: palette.hueInfluenceHighlightChromaScale,
    chromaPivot: palette.hueInfluenceChromaPivot,
    neutralRecovery: palette.hueInfluenceNeutralRecovery,
    neutralThreshold: palette.hueInfluenceNeutralThreshold,
    tonalRegister: palette.hueInfluenceTonalRegister,
    lightnessContrast: palette.hueInfluenceLightnessContrast,
    inkUnity: palette.hueInfluenceInkUnity,
    counterpointWidthRadians:
      palette.hueInfluenceCounterpointWidthRadians,
    counterpointFalloff: palette.hueInfluenceCounterpointFalloff,
    counterpointChromaScale:
      palette.hueInfluenceCounterpointChromaScale,
    counterpointChromaFloor:
      palette.hueInfluenceCounterpointChromaFloor,
    ditherStrength: palette.hueInfluenceDitherStrength,
  };
}

export function shortestSignedHueAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

const mix = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

export function interpolateHueUniformState(
  from: HueUniformState,
  to: HueUniformState,
  progress: number,
): HueUniformState {
  const amount = Math.min(1, Math.max(0, progress));
  const targetHueRadians = from.mix <= 1e-5
    ? to.targetHueRadians
    : from.targetHueRadians +
      shortestSignedHueAngle(to.targetHueRadians - from.targetHueRadians) *
        amount;

  return {
    mix: mix(from.mix, to.mix, amount),
    targetHueRadians,
    targetChroma: mix(from.targetChroma, to.targetChroma, amount),
    strength: mix(from.strength, to.strength, amount),
    chromaScale: mix(from.chromaScale, to.chromaScale, amount),
    shadowChromaScale: mix(
      from.shadowChromaScale,
      to.shadowChromaScale,
      amount,
    ),
    highlightChromaScale: mix(
      from.highlightChromaScale,
      to.highlightChromaScale,
      amount,
    ),
    chromaPivot: mix(from.chromaPivot, to.chromaPivot, amount),
    neutralRecovery: mix(
      from.neutralRecovery,
      to.neutralRecovery,
      amount,
    ),
    neutralThreshold: mix(
      from.neutralThreshold,
      to.neutralThreshold,
      amount,
    ),
    tonalRegister: mix(from.tonalRegister, to.tonalRegister, amount),
    lightnessContrast: mix(
      from.lightnessContrast,
      to.lightnessContrast,
      amount,
    ),
    inkUnity: mix(from.inkUnity, to.inkUnity, amount),
    counterpointWidthRadians: mix(
      from.counterpointWidthRadians,
      to.counterpointWidthRadians,
      amount,
    ),
    counterpointFalloff: mix(
      from.counterpointFalloff,
      to.counterpointFalloff,
      amount,
    ),
    counterpointChromaScale: mix(
      from.counterpointChromaScale,
      to.counterpointChromaScale,
      amount,
    ),
    counterpointChromaFloor: mix(
      from.counterpointChromaFloor,
      to.counterpointChromaFloor,
      amount,
    ),
    ditherStrength: mix(from.ditherStrength, to.ditherStrength, amount),
  };
}

export function hueUniformStatesEqual(
  left: HueUniformState,
  right: HueUniformState,
  epsilon = 1e-6,
) {
  return (Object.keys(left) as Array<keyof HueUniformState>).every(key => (
    Math.abs(left[key] - right[key]) <= epsilon
  ));
}

export function evaluateHueTransition(
  transition: HueTransitionState,
  nowMs: number,
): HueUniformState {
  if (!transition.active || transition.durationMs <= 0) {
    transition.rendered = transition.to;
    transition.active = false;
    return transition.rendered;
  }
  const progress = Math.min(
    1,
    Math.max(0, (nowMs - transition.startedAtMs) / transition.durationMs),
  );
  transition.rendered = interpolateHueUniformState(
    transition.from,
    transition.to,
    transition.easing(progress),
  );
  if (progress >= 1) {
    transition.rendered = transition.to;
    transition.active = false;
  }
  return transition.rendered;
}
