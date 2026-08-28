/**
 * Perceptually regularized twilight palette generation.
 *
 * The model is deliberately compact rather than a full multi-scattering sky
 * renderer. Its controls track the mechanisms that matter at twilight:
 * molecular (Rayleigh) blue bias, aerosol turbidity, the longer optical path
 * of a low sun, ozone's blue-violet contribution, and the residual night
 * floor. Radiometric shaping happens before the curve is regularized in
 * OKLab, gamut-mapped to sRGB, and resampled at approximately equal perceived
 * colour distance.
 */

import { ABSTRACT_INK_RGB } from './abstractPalette';

export type TwilightSkyModel = {
  sunElevationDeg: number;
  stopCount: number;
  turbidity: number;
  exposure: number;
  saturation: number;
  chromaDuck: number;
  inkUnity: number;
  nightDepth: number;
  afterglow: number;
  ozone: number;
  falloff: number;
};

export type TwilightSkyStop = {
  offset: number;
  color: string;
  rgb: [number, number, number];
  lightness: number;
  chroma: number;
};

export type TwilightSkyGradient = {
  stops: TwilightSkyStop[];
  cssStops: string;
  lut: Uint8Array;
  terminalColor: string;
};

type Oklab = [number, number, number];
export type TwilightSkyPoint = readonly [x: number, y: number];

const DENSE_SAMPLE_COUNT = 128;
export const TWILIGHT_SKY_LUT_SIZE = 256;

const clamp = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
);

const smoothstep = (value: number) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

const lerp = (from: number, to: number, amount: number) => (
  from + (to - from) * amount
);

const interpolateHue = (from: number, to: number, amount: number) => {
  const delta = ((to - from + 540) % 360) - 180;
  return from + delta * amount;
};

const oklchToOklab = (lightness: number, chroma: number, hueDeg: number): Oklab => {
  const hue = hueDeg * Math.PI / 180;
  return [lightness, chroma * Math.cos(hue), chroma * Math.sin(hue)];
};

const oklabToLinearSrgb = ([L, a, b]: Oklab): [number, number, number] => {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};

const srgbToLinear = (channel: number) => {
  const value = clamp(channel, 0, 1);
  return value <= 0.04045
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
};

const rgb8ToOklab = ([red, green, blue]: [number, number, number]): Oklab => {
  const r = srgbToLinear(red / 255);
  const g = srgbToLinear(green / 255);
  const b = srgbToLinear(blue / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

const ABSTRACT_INK_LAB = rgb8ToOklab(ABSTRACT_INK_RGB);

const linearToSrgb = (value: number) => {
  const channel = value <= 0.0031308
    ? value * 12.92
    : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return clamp(channel, 0, 1);
};

const inSrgbGamut = (rgb: [number, number, number]) => (
  rgb.every(channel => channel >= 0 && channel <= 1)
);

function gamutMapOklch(lightness: number, chroma: number, hue: number) {
  let mappedChroma = Math.max(0, chroma);
  let lab = oklchToOklab(lightness, mappedChroma, hue);
  let linearRgb = oklabToLinearSrgb(lab);

  for (let attempt = 0; attempt < 24 && !inSrgbGamut(linearRgb); attempt += 1) {
    mappedChroma *= 0.92;
    lab = oklchToOklab(lightness, mappedChroma, hue);
    linearRgb = oklabToLinearSrgb(lab);
  }

  return {
    lab,
    chroma: mappedChroma,
    rgb: linearRgb.map(linearToSrgb) as [number, number, number],
  };
}

const rgbToHex = (rgb: [number, number, number]) => (
  `#${rgb.map(channel => Math.round(clamp(channel, 0, 1) * 255)
    .toString(16)
    .padStart(2, '0')).join('').toUpperCase()}`
);

const labDistance = (from: Oklab, to: Oklab) => Math.hypot(
  to[0] - from[0],
  to[1] - from[1],
  to[2] - from[2],
);

function sampleTwilightModel(model: TwilightSkyModel, offset: number) {
  const sunElevation = clamp(model.sunElevationDeg, -90, 90);
  const degreesBelowHorizon = Math.max(0, -sunElevation);
  const daylight = smoothstep(clamp(sunElevation / 90, 0, 1));
  // Preserve fine control through civil/nautical twilight while allowing the
  // complete physical elevation range. Direct sunlight scattered into the
  // atmosphere collapses rapidly from nautical to astronomical twilight,
  // then continues toward the full-night floor as the sun approaches nadir.
  const phase = Math.pow(clamp(degreesBelowHorizon / 18, 0, 1), 0.55);
  const astronomicalDarkness = smoothstep((degreesBelowHorizon - 8) / 10);
  const deepNight = smoothstep((degreesBelowHorizon - 18) / 72);
  const nightCollapse = 1 - (1 - astronomicalDarkness * 0.72) * (1 - deepNight);
  const haze = clamp((model.turbidity - 1) / 9, 0, 1);
  const ozone = clamp(model.ozone, 0, 1);
  const saturation = clamp(model.saturation, 0.45, 1.6);
  const chromaDuck = clamp(model.chromaDuck, 0, 1);
  const inkUnity = clamp(model.inkUnity, 0, 1);
  const afterglow = clamp(model.afterglow, 0, 1);
  const nightDepth = clamp(model.nightDepth, 0, 1);
  const falloff = clamp(model.falloff, 0.45, 2.4);

  // Rayleigh beta ratios for representative red/green/blue wavelengths,
  // normalized to blue. The scalar keeps the art-directed model anchored to
  // the real molecular bias without pretending to be a spectral renderer.
  const rayleigh = [
    Math.pow(440 / 680, 4),
    Math.pow(440 / 550, 4),
    1,
  ];
  const rayleighBlueBias = rayleigh[2] - (rayleigh[0] + rayleigh[1]) * 0.5;

  // Aerosol scattering spreads the remaining source light over a wider
  // angular field, so increased turbidity delays the fall into the night
  // floor without changing the independently controlled ellipse geometry.
  const spatial = Math.pow(smoothstep(offset), falloff * (1 + haze * 0.25));
  const twilightSourceL = clamp(
    (0.79 - phase * 0.19 + daylight * 0.08 + haze * 0.035 + afterglow * 0.025)
      * clamp(model.exposure, 0.45, 1.35),
    0.16,
    0.92,
  );
  const twilightNightL = clamp(
    0.235 - nightDepth * 0.14 - phase * 0.025 + daylight * 0.08,
    0.045,
    0.31,
  );
  const fullNightSourceL = lerp(0.14, 0.055, nightDepth);
  const fullNightEdgeL = lerp(0.04, 0.015, nightDepth);
  const sourceL = lerp(twilightSourceL, fullNightSourceL, nightCollapse);
  const nightL = lerp(twilightNightL, fullNightEdgeL, nightCollapse);
  const lightness = lerp(sourceL, nightL, spatial);

  const sourceHue = 226 + phase * 12 + deepNight * 8 + ozone * 7 + rayleighBlueBias * 5;
  const nightHue = 266 + ozone * 8 + phase * 5 + deepNight * 4;
  const afterglowEnvelope = Math.exp(-Math.pow((offset - 0.22) / 0.24, 2));
  const hue = interpolateHue(
    sourceHue,
    nightHue,
    smoothstep(offset),
  ) + afterglow * (1 - nightCollapse) * afterglowEnvelope * 8;

  const nightChromaRetention = 1 - nightCollapse * 0.72;
  const sourceChroma = (0.055 + phase * 0.025) * saturation * (1 - haze * 0.58) * nightChromaRetention;
  const middleChroma = (0.105 + phase * 0.035 + ozone * 0.018) * saturation * nightChromaRetention;
  const nightChroma = (0.055 + phase * 0.03) * saturation * nightChromaRetention;
  const chromaRise = smoothstep(Math.min(1, offset * 2.1));
  const chromaFall = smoothstep(Math.max(0, (offset - 0.48) / 0.52));
  const chroma = lerp(
    lerp(sourceChroma, middleChroma, chromaRise),
    nightChroma,
    chromaFall,
  );

  const physicalLab = oklchToOklab(lightness, chroma, hue);
  const restrainedLab: Oklab = [
    physicalLab[0],
    physicalLab[1] * (1 - chromaDuck),
    physicalLab[2] * (1 - chromaDuck),
  ];
  const lab: Oklab = [
    lerp(restrainedLab[0], ABSTRACT_INK_LAB[0], inkUnity),
    lerp(restrainedLab[1], ABSTRACT_INK_LAB[1], inkUnity),
    lerp(restrainedLab[2], ABSTRACT_INK_LAB[2], inkUnity),
  ];

  return {
    lightness: lab[0],
    chroma: Math.hypot(lab[1], lab[2]),
    hue: Math.atan2(lab[2], lab[1]) * 180 / Math.PI,
    lab,
  };
}

function interpolateLab(from: Oklab, to: Oklab, amount: number): Oklab {
  return [
    lerp(from[0], to[0], amount),
    lerp(from[1], to[1], amount),
    lerp(from[2], to[2], amount),
  ];
}

function labToStop(lab: Oklab, offset: number): TwilightSkyStop {
  const hue = Math.atan2(lab[2], lab[1]) * 180 / Math.PI;
  const chroma = Math.hypot(lab[1], lab[2]);
  const mapped = gamutMapOklch(lab[0], chroma, hue);
  return {
    offset,
    color: rgbToHex(mapped.rgb),
    rgb: mapped.rgb,
    lightness: mapped.lab[0],
    chroma: mapped.chroma,
  };
}

function buildPaletteLut(stops: TwilightSkyStop[]) {
  const bytes = new Uint8Array(TWILIGHT_SKY_LUT_SIZE * 4);
  let segment = 0;

  for (let index = 0; index < TWILIGHT_SKY_LUT_SIZE; index += 1) {
    const offset = index / (TWILIGHT_SKY_LUT_SIZE - 1);
    while (segment < stops.length - 2 && offset > stops[segment + 1].offset) segment += 1;
    const from = stops[segment];
    const to = stops[Math.min(stops.length - 1, segment + 1)];
    const span = Math.max(1e-6, to.offset - from.offset);
    const local = clamp((offset - from.offset) / span, 0, 1);

    for (let channel = 0; channel < 3; channel += 1) {
      bytes[index * 4 + channel] = Math.round(lerp(from.rgb[channel], to.rgb[channel], local) * 255);
    }
    bytes[index * 4 + 3] = 255;
  }

  return bytes;
}

const relativeLuminance = ([red, green, blue]: [number, number, number]) => {
  const linearize = (channel: number) => (
    channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
};

const contrastRatio = (
  foreground: [number, number, number],
  background: [number, number, number],
) => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

export function sampleTwilightSkyGradient(
  gradient: TwilightSkyGradient,
  position: number,
): [number, number, number] {
  const offset = clamp(position, 0, 1);
  let segment = 0;
  while (
    segment < gradient.stops.length - 2
    && offset > gradient.stops[segment + 1].offset
  ) segment += 1;

  const from = gradient.stops[segment];
  const to = gradient.stops[Math.min(gradient.stops.length - 1, segment + 1)];
  const span = Math.max(1e-6, to.offset - from.offset);
  const local = clamp((offset - from.offset) / span, 0, 1);
  return [
    lerp(from.rgb[0], to.rgb[0], local),
    lerp(from.rgb[1], to.rgb[1], local),
    lerp(from.rgb[2], to.rgb[2], local),
  ];
}

export function recommendTwilightSkyInk({
  gradient,
  originX,
  originY,
  radiusX,
  radiusY,
  samplePoints,
}: {
  gradient: TwilightSkyGradient;
  originX: number;
  originY: number;
  radiusX: number;
  radiusY: number;
  samplePoints: ReadonlyArray<TwilightSkyPoint>;
}): 'light' | 'dark' {
  const safeRadiusX = Math.max(0.04, radiusX);
  const safeRadiusY = Math.max(0.04, radiusY);
  const backgrounds = samplePoints.map(([x, y]) => {
    const distance = Math.hypot(
      (x - originX) / safeRadiusX,
      (y - originY) / safeRadiusY,
    );
    return sampleTwilightSkyGradient(gradient, distance);
  });
  const lightInk: [number, number, number] = [1, 1, 1];
  const darkInk: [number, number, number] = [20 / 255, 35 / 255, 41 / 255];
  const minimumContrast = (ink: [number, number, number]) => backgrounds.reduce(
    (minimum, background) => Math.min(minimum, contrastRatio(ink, background)),
    Number.POSITIVE_INFINITY,
  );

  return minimumContrast(lightInk) >= minimumContrast(darkInk) ? 'light' : 'dark';
}

export function generateTwilightSkyGradient(input: TwilightSkyModel): TwilightSkyGradient {
  const stopCount = Math.round(clamp(input.stopCount, 4, 16));
  const dense = Array.from({ length: DENSE_SAMPLE_COUNT }, (_, index) => {
    const offset = index / (DENSE_SAMPLE_COUNT - 1);
    return { offset, ...sampleTwilightModel(input, offset) };
  });
  const cumulative = [0];
  for (let index = 1; index < dense.length; index += 1) {
    cumulative[index] = cumulative[index - 1] + labDistance(dense[index - 1].lab, dense[index].lab);
  }
  const totalDistance = Math.max(1e-6, cumulative[cumulative.length - 1]);

  const stops = Array.from({ length: stopCount }, (_, stopIndex) => {
    if (stopIndex === 0) return labToStop(dense[0].lab, 0);
    if (stopIndex === stopCount - 1) return labToStop(dense[dense.length - 1].lab, 1);

    const targetDistance = totalDistance * stopIndex / (stopCount - 1);
    let denseIndex = 1;
    while (denseIndex < cumulative.length - 1 && cumulative[denseIndex] < targetDistance) denseIndex += 1;
    const previousDistance = cumulative[denseIndex - 1];
    const span = Math.max(1e-6, cumulative[denseIndex] - previousDistance);
    const local = clamp((targetDistance - previousDistance) / span, 0, 1);
    const offset = lerp(dense[denseIndex - 1].offset, dense[denseIndex].offset, local);
    const lab = interpolateLab(dense[denseIndex - 1].lab, dense[denseIndex].lab, local);
    return labToStop(lab, offset);
  });

  const cssStops = stops.map(stop => (
    `${stop.color} ${Number((stop.offset * 100).toFixed(2))}%`
  )).join(', ');
  return {
    stops,
    cssStops,
    lut: buildPaletteLut(stops),
    terminalColor: stops[stops.length - 1].color,
  };
}
