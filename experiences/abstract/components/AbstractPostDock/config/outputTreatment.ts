export type GradientSrgbColor = readonly [number, number, number];

export type GradientColorOutputTreatment = {
  mode: 'color';
};

export type GradientMetalLuminanceOutputTreatment = {
  mode: 'metal-luminance';
  inputBlackPoint: number;
  inputWhitePoint: number;
  gamma: number;
  baseDarkness: number;
  baseContrast: number;
  interactionContrastBoost: number;
  bodyPoint: number;
  highlightKnee: number;
  highlightGain: number;
  shadowColor: GradientSrgbColor;
  bodyColor: GradientSrgbColor;
  highlightColor: GradientSrgbColor;
};

export type GradientOutputTreatment =
  | GradientColorOutputTreatment
  | GradientMetalLuminanceOutputTreatment;

export const DEFAULT_GRADIENT_OUTPUT_TREATMENT = {
  mode: 'color',
} satisfies GradientColorOutputTreatment;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

const clamp01 = (value: number) => clamp(value, 0, 1);

export function srgbChannelToLinear(channel: number) {
  const value = clamp01(channel);
  return value <= 0.04045
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

export function linearChannelToSrgb(channel: number) {
  const value = clamp01(channel);
  return value <= 0.0031308
    ? value * 12.92
    : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
}

export function getPerceptualSrgbLuminance(color: GradientSrgbColor) {
  const relativeLuminance =
    srgbChannelToLinear(color[0]) * 0.2126 +
    srgbChannelToLinear(color[1]) * 0.7152 +
    srgbChannelToLinear(color[2]) * 0.0722;

  return linearChannelToSrgb(relativeLuminance);
}

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / Math.max(1e-6, edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export function getMetalLuminancePosition(
  sourceLuminance: number,
  treatment: GradientMetalLuminanceOutputTreatment,
  interactionStrength = 0,
) {
  const blackPoint = clamp01(treatment.inputBlackPoint);
  const whitePoint = Math.max(blackPoint + 1e-4, clamp01(treatment.inputWhitePoint));
  const normalized = clamp01(
    (sourceLuminance - blackPoint) / (whitePoint - blackPoint),
  );
  const effectiveContrast = clamp(
    treatment.baseContrast +
      clamp01(interactionStrength) * treatment.interactionContrastBoost,
    0.05,
    4,
  );
  const contrasted = clamp01(
    (normalized - 0.5) * effectiveContrast + 0.5,
  );
  const shaped = Math.pow(contrasted, Math.max(0.05, treatment.gamma));
  const shoulder =
    smoothstep(clamp01(treatment.highlightKnee), 1, shaped) *
    clamp(treatment.highlightGain, 0, 1);

  return clamp01(shaped + shoulder * (1 - shaped));
}

const mix = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;

/**
 * CPU companion to the fragment shader's final-stage material transform.
 * Used for SSR fallbacks and fidelity tests so both paths share the same
 * luminance/tone-map semantics.
 */
export function mapSrgbToMetal(
  sourceColor: GradientSrgbColor,
  treatment: GradientMetalLuminanceOutputTreatment,
  interactionStrength = 0,
): [number, number, number] {
  const materialPosition = getMetalLuminancePosition(
    getPerceptualSrgbLuminance(sourceColor),
    treatment,
    interactionStrength,
  );
  const bodyPoint = clamp(treatment.bodyPoint, 0.05, 0.95);
  const shadowLinear = treatment.shadowColor.map(srgbChannelToLinear);
  const bodyLinear = treatment.bodyColor.map(srgbChannelToLinear);
  const highlightLinear = treatment.highlightColor.map(srgbChannelToLinear);
  const lowerAmount = smoothstep(0, bodyPoint, materialPosition);
  const upperAmount = smoothstep(bodyPoint, 1, materialPosition);
  const materialLinear = shadowLinear.map((shadow, index) => {
    const body = mix(shadow, bodyLinear[index], lowerAmount);
    return mix(body, highlightLinear[index], upperAmount);
  });
  const darknessStops = (0.5 - clamp01(treatment.baseDarkness)) * 3;
  const darknessFactor = Math.pow(2, darknessStops);

  return materialLinear.map(
    channel => linearChannelToSrgb(channel * darknessFactor),
  ) as [number, number, number];
}
