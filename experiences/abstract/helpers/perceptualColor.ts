export type Rgb8Color = [number, number, number];
export type SrgbColor = [number, number, number];
export type OklabColor = [number, number, number];

export const OKLAB_CHROMA_EPSILON = 1e-5;
export const HUE_INFLUENCE_ANTIPODE_FEATHER_RADIANS = 18 * Math.PI / 180;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
const clamp01 = (value: number) => clamp(value, 0, 1);

export function srgbChannelToLinear(channel: number) {
  const value = clamp01(channel);
  return value <= 0.04045
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

export function linearChannelToSrgbUnclamped(channel: number) {
  return channel <= 0.0031308
    ? channel * 12.92
    : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
}

export function srgbToOklab([red, green, blue]: SrgbColor): OklabColor {
  const r = srgbChannelToLinear(red);
  const g = srgbChannelToLinear(green);
  const b = srgbChannelToLinear(blue);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToLinearRgb([lightness, a, b]: OklabColor): SrgbColor {
  const l = Math.pow(lightness + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(lightness - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(lightness - 0.0894841775 * a - 1.291485548 * b, 3);

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function oklabToSrgbUnclamped(color: OklabColor): SrgbColor {
  return oklabToLinearRgb(color).map(linearChannelToSrgbUnclamped) as SrgbColor;
}

export function rgb8ToOklab([red, green, blue]: Rgb8Color): OklabColor {
  return srgbToOklab([red / 255, green / 255, blue / 255]);
}

export function oklabToRgb8(color: OklabColor): Rgb8Color {
  return oklabToSrgbUnclamped(color).map(
    channel => Math.round(clamp01(channel) * 255),
  ) as Rgb8Color;
}

export function mixOklab(
  from: OklabColor,
  to: OklabColor,
  amount: number,
): OklabColor {
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  ];
}

export function rotateOklabHue(
  [lightness, a, b]: OklabColor,
  degrees: number,
): OklabColor {
  const radians = degrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [
    lightness,
    a * cosine - b * sine,
    a * sine + b * cosine,
  ];
}

export function scaleOklabChroma(
  [lightness, a, b]: OklabColor,
  scale: number,
): OklabColor {
  return [lightness, a * scale, b * scale];
}

export function parseHexColor(color: string): Rgb8Color | null {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return null;
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ];
}

export function getOklabHueRadians(color: OklabColor): number | null {
  const chroma = Math.hypot(color[1], color[2]);
  return chroma < OKLAB_CHROMA_EPSILON
    ? null
    : Math.atan2(color[2], color[1]);
}

export function resolveHexHueRadians(color: string, fallbackColor: string) {
  const selected = resolveHexInfluenceOklab(color, fallbackColor);
  return getOklabHueRadians(selected) ?? 0;
}

/**
 * Resolve the perceptual target used by hue influence. Achromatic selections
 * fall back as one complete color (rather than borrowing fallback hue while
 * retaining zero chroma), keeping neutral recovery and hue convergence in the
 * same family.
 */
export function resolveHexInfluenceOklab(
  color: string,
  fallbackColor: string,
): OklabColor {
  const fallback = rgb8ToOklab(
    parseHexColor(fallbackColor) ?? [18, 63, 122],
  );
  const parsed = parseHexColor(color);
  if (!parsed) return fallback;
  const selected = rgb8ToOklab(parsed);
  return getOklabHueRadians(selected) === null ? fallback : selected;
}

export function shortestSignedAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / Math.max(1e-8, edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const smoothMaximum = (left: number, right: number, softness: number) => {
  if (right <= 0) return left;
  const width = Math.max(1e-6, softness);
  const amount = clamp01(0.5 + 0.5 * (left - right) / width);
  return right + (left - right) * amount +
    width * amount * (1 - amount);
};

function isLinearRgbInGamut(color: SrgbColor) {
  return color.every(channel => (
    Number.isFinite(channel) && channel >= 0 && channel <= 1
  ));
}

function mapOklchToSrgbAtConstantLightness(
  lightness: number,
  chroma: number,
  hueRadians: number,
): SrgbColor {
  const directionA = Math.cos(hueRadians);
  const directionB = Math.sin(hueRadians);
  const candidate: OklabColor = [
    lightness,
    directionA * chroma,
    directionB * chroma,
  ];
  const candidateLinear = oklabToLinearRgb(candidate);

  if (isLinearRgbInGamut(candidateLinear)) {
    return candidateLinear.map(linearChannelToSrgbUnclamped) as SrgbColor;
  }

  let minimumChroma = 0;
  let maximumChroma = chroma;
  for (let iteration = 0; iteration < 16; iteration += 1) {
    const testChroma = (minimumChroma + maximumChroma) * 0.5;
    const testLinear = oklabToLinearRgb([
      lightness,
      directionA * testChroma,
      directionB * testChroma,
    ]);
    if (isLinearRgbInGamut(testLinear)) minimumChroma = testChroma;
    else maximumChroma = testChroma;
  }

  return oklabToSrgbUnclamped([
    lightness,
    directionA * minimumChroma,
    directionB * minimumChroma,
  ]).map(clamp01) as SrgbColor;
}

export type HueInfluenceOptions = {
  enabled: boolean;
  targetHueRadians: number;
  strength: number;
  chromaScale: number;
  gradeMix?: number;
  shadowChromaScale?: number;
  highlightChromaScale?: number;
  chromaPivot?: number;
  tonalRegister?: number;
  lightnessContrast?: number;
  inkUnity?: number;
  antipodeFeatherRadians?: number;
  counterpointFalloff?: number;
  counterpointChromaScale?: number;
  counterpointChromaFloor?: number;
  targetChroma?: number;
  neutralRecovery?: number;
  neutralThreshold?: number;
};

/** CPU reference for the journal fragment grade. */
export function applyHueInfluenceToSrgb(
  source: SrgbColor,
  options: HueInfluenceOptions,
): SrgbColor {
  const gradeMix = clamp01(options.gradeMix ?? 1);
  const strength = clamp01(options.strength);
  if (!options.enabled || gradeMix <= 0) return [...source] as SrgbColor;

  const sourceLab = srgbToOklab(source);
  const sourceChroma = Math.hypot(sourceLab[1], sourceLab[2]);
  const neutralRecovery = clamp01(options.neutralRecovery ?? 0);
  if (
    sourceChroma < OKLAB_CHROMA_EPSILON &&
    neutralRecovery <= 0
  ) return [...source] as SrgbColor;

  const neutralThreshold = clamp(options.neutralThreshold ?? 0.08, 0.01, 0.2);
  const neutralMask = 1 - smoothstep(0, neutralThreshold, sourceChroma);
  const sourceHue = sourceChroma < OKLAB_CHROMA_EPSILON
    ? options.targetHueRadians
    : Math.atan2(sourceLab[2], sourceLab[1]);
  const delta = shortestSignedAngle(sourceHue - options.targetHueRadians);
  const featherWidth = clamp(
    options.antipodeFeatherRadians ??
      HUE_INFLUENCE_ANTIPODE_FEATHER_RADIANS,
    1e-4,
    Math.PI,
  );
  const counterpointFeather = smoothstep(
    Math.PI - featherWidth,
    Math.PI,
    Math.abs(delta),
  );
  const sourceCounterpointRetention = Math.pow(
    counterpointFeather,
    clamp(options.counterpointFalloff ?? 4, 0.5, 10),
  );
  const neutralRecoveryMix = neutralMask * neutralRecovery * gradeMix;
  const counterpointRetention =
    sourceCounterpointRetention * (1 - neutralRecoveryMix);
  const effectiveStrength =
    strength * gradeMix * (1 - counterpointRetention);
  const influencedHue =
    options.targetHueRadians + delta * (1 - effectiveStrength);
  const outputHue = options.targetHueRadians + shortestSignedAngle(
    influencedHue - options.targetHueRadians,
  ) * (1 - neutralRecoveryMix);
  const chromaPivot = clamp(options.chromaPivot ?? 0.52, 0.15, 0.85);
  const tonalWeight = smoothstep(
    chromaPivot - 0.16,
    chromaPivot + 0.16,
    sourceLab[0],
  );
  const tonalChromaScale =
    (options.shadowChromaScale ?? 1) +
    ((options.highlightChromaScale ?? 1) -
      (options.shadowChromaScale ?? 1)) * tonalWeight;
  const counterpointChromaScale = 1 +
    (clamp(options.counterpointChromaScale ?? 1, 0, 1.5) - 1) *
    counterpointRetention;
  let targetChroma =
    sourceChroma *
    clamp(options.chromaScale, 0, 1.75) *
    clamp(tonalChromaScale, 0, 2) *
    counterpointChromaScale;
  const inkUnity = clamp01(options.inkUnity ?? 0);
  const inkLab = rgb8ToOklab([14, 18, 48]);
  const inkChroma = Math.hypot(inkLab[1], inkLab[2]);
  targetChroma += (inkChroma - targetChroma) * inkUnity;
  let requestedChroma =
    sourceChroma + (targetChroma - sourceChroma) * gradeMix;
  const registeredLightness =
    sourceLab[0] + clamp(options.tonalRegister ?? 0, -1, 1) * 0.18;
  const contrastedLightness =
    0.5 +
    (registeredLightness - 0.5) *
      clamp(options.lightnessContrast ?? 1, 0.5, 1.5);
  const targetLightness =
    contrastedLightness +
    (inkLab[0] - contrastedLightness) * inkUnity;
  const outputLightness = clamp(
    sourceLab[0] + (targetLightness - sourceLab[0]) * gradeMix,
    0,
    1,
  );
  const shadowRecovery = smoothstep(0.08, 0.3, outputLightness);
  const highlightRecovery = 1 - smoothstep(0.78, 0.96, outputLightness);
  const minimumChroma =
    clamp(options.targetChroma ?? 0, 0, 0.4) *
    neutralRecovery *
    gradeMix *
    shadowRecovery *
    highlightRecovery;
  // Guarantee a target-derived post-grade floor without a hard max() contour.
  // Recovery zero is an exact no-op, preserving the previous identity path.
  requestedChroma = smoothMaximum(
    requestedChroma,
    minimumChroma,
    0.008,
  );
  const counterpointChromaFloor =
    clamp(options.targetChroma ?? 0, 0, 0.4) *
    clamp(options.counterpointChromaFloor ?? 0, 0, 1.25) *
    counterpointRetention *
    gradeMix *
    shadowRecovery *
    highlightRecovery;
  requestedChroma = smoothMaximum(
    requestedChroma,
    counterpointChromaFloor,
    0.008,
  );

  return mapOklchToSrgbAtConstantLightness(
    outputLightness,
    requestedChroma,
    outputHue,
  );
}
