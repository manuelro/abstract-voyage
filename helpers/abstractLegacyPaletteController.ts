export type AbstractLegacyPaletteField = {
  variation: number;
  saturation: number;
  brightness: number;
  scale: number;
  seed: number;
  randomness: number;
  offsetX: number;
  offsetY: number;
  hueOffset: number;
  palettePhase: number;
  morph: number;
  shimmer: number;
  pulse: number;
  overlayFaceCount: number;
};

export type AbstractLegacyPaletteLimits = {
  maximumYellowCoverage: number;
  minimumCounterpointCoverage: number;
  minimumHueDiversity: number;
  minimumChroma: number;
  maximumIntervention: number;
};

export type AbstractLegacyPaletteMetrics = {
  yellowCoverage: number;
  counterpointCoverage: number;
  hueDiversity: number;
  averageChroma: number;
  risk: number;
};

export type AbstractLegacyPaletteResolution = {
  amount: number;
  current: AbstractLegacyPaletteMetrics;
  lookAhead: AbstractLegacyPaletteMetrics;
  corrected: AbstractLegacyPaletteMetrics;
};

export type AbstractLegacyPaletteSamplePoint = {
  x: number;
  y: number;
};

const TAU = Math.PI * 2;
const SAMPLE_X = [0.08, 0.27, 0.5, 0.73, 0.92] as const;
const SAMPLE_Y = [0.08, 0.31, 0.58, 0.84] as const;
const CANDIDATE_COUNT = 10;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function overlayChannel(base: number, blend: number) {
  return base <= 0.5
    ? 2 * base * blend
    : 1 - 2 * (1 - base) * (1 - blend);
}

function srgbToLinear(channel: number) {
  const value = clamp(channel, 0, 1);
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function getOklabMetricsInto(
  red: number,
  green: number,
  blue: number,
  output: Float64Array,
) {
  const r = srgbToLinear(red);
  const g = srgbToLinear(green);
  const b = srgbToLinear(blue);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const labB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const chroma = Math.hypot(a, labB);
  const hue = (Math.atan2(labB, a) * 180 / Math.PI + 360) % 360;

  output[0] = lightness;
  output[1] = chroma;
  output[2] = hue;
}

function getLayerVariation(
  layerIndex: number,
  layerCount: number,
  fieldVariation: number,
  shaderTime: number,
) {
  const normalized = layerCount > 1 ? layerIndex / (layerCount - 1) : 0.5;
  const cohesiveVariation = Math.sin((normalized + shaderTime * 0.08) * TAU) * 0.012;
  return (normalized - 0.5) * fieldVariation + cohesiveVariation;
}

function rainbowChannel(phase: number, offset: number) {
  return 0.5 + 0.5 * Math.cos(TAU * (phase + offset));
}

function applySaturationChannel(
  channel: number,
  luminance: number,
  saturation: number,
) {
  const safeSaturation = clamp(saturation, 0, 2.5);
  const chromaAmount = safeSaturation <= 1
    ? safeSaturation
    : 1 + (safeSaturation - 1) * 2.2;
  return clamp(luminance + (channel - luminance) * chromaAmount, 0, 1);
}

/**
 * A control-rate model of the legacy shader and its visible overlay stack.
 * It deliberately owns its scratch buffer so evaluating a frame does not
 * allocate per sample or per layer.
 */
export class AbstractLegacyPaletteEvaluator {
  private readonly sample = new Float64Array(3);
  private readonly perceptual = new Float64Array(3);

  private sampleShader(
    x: number,
    y: number,
    shaderTime: number,
    variation: number,
    field: AbstractLegacyPaletteField,
    intervention: number,
    normalizedLayer: number,
  ) {
    let stX = (x - 0.5) / Math.max(field.scale, 0.001) + 0.5 + field.offsetX;
    let stY = (y - 0.5) / Math.max(field.scale, 0.001) + 0.5 + field.offsetY;
    const morph = clamp(field.morph, 0, 1.5);
    const shimmer = clamp(field.shimmer, 0, 1.5);
    const pulse = clamp(field.pulse, 0, 1.5);
    let cX = stX - 0.5;
    let cY = stY - 0.5;
    const audioWarp = morph * 0.055 + pulse * 0.018;
    const angle = field.randomness * (
      shaderTime * 0.021 + 0.35 * Math.sin(shaderTime * 0.0413 + field.seed)
    ) + morph * 0.18 * Math.sin(shaderTime * 0.113 + field.seed * 0.7);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const rotatedX = cosine * cX - sine * cY;
    const rotatedY = sine * cX + cosine * cY;
    cX = rotatedX + (field.randomness * 0.06 + audioWarp) * Math.sin(
      shaderTime * 0.037 + field.seed * 1.7 + rotatedY * TAU,
    );
    cY = rotatedY + (field.randomness * 0.06 + audioWarp * 0.78) * Math.sin(
      shaderTime * 0.029 + field.seed * 2.3 + cX * TAU,
    );
    stX = cX + 0.5;
    stY = cY + 0.5;

    const hueDrift = field.hueOffset + field.palettePhase + field.randomness * (
      0.13 * Math.sin(shaderTime * 0.371 + field.seed) +
      0.09 * Math.sin(shaderTime * 0.234 + field.seed * 1.7) +
      0.05 * Math.sin(shaderTime * 0.157 + field.seed * 2.9)
    ) + shimmer * 0.018 * Math.sin(shaderTime * 0.83 + stX * TAU + stY * Math.PI);

    const amount = clamp(intervention, 0, 1);
    const phaseSpread = amount * 0.24;
    const layerPhase = normalizedLayer * amount * 0.18;
    const horizontalPhase = stX + variation * 0.1 + hueDrift + morph * 0.035 * (stY - 0.5)
      - phaseSpread - layerPhase;
    const verticalPhase = stY + 0.3333 + variation * 0.075 + hueDrift
      - morph * 0.028 * (stX - 0.5) + phaseSpread - layerPhase;
    const temporalPhase = shaderTime * 0.25 + 0.5 + variation * 0.12 + hueDrift
      + pulse * 0.025 + amount * 0.5 + layerPhase * 0.5;
    const temporalWeight = 1 - amount * 0.58;
    const denominator = 2 + temporalWeight;
    const horizontalRed = rainbowChannel(horizontalPhase, 0);
    const horizontalGreen = rainbowChannel(horizontalPhase, 0.3333);
    const horizontalBlue = rainbowChannel(horizontalPhase, 0.6666);
    const verticalRed = rainbowChannel(verticalPhase, 0);
    const verticalGreen = rainbowChannel(verticalPhase, 0.3333);
    const verticalBlue = rainbowChannel(verticalPhase, 0.6666);
    const temporalRed = rainbowChannel(temporalPhase, 0);
    const temporalGreen = rainbowChannel(temporalPhase, 0.3333);
    const temporalBlue = rainbowChannel(temporalPhase, 0.6666);
    let red = (horizontalRed + verticalRed + temporalRed * temporalWeight) / denominator;
    let green = (horizontalGreen + verticalGreen + temporalGreen * temporalWeight) / denominator;
    let blue = (horizontalBlue + verticalBlue + temporalBlue * temporalWeight) / denominator;
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
    red = applySaturationChannel(red, luminance, field.saturation) * field.brightness;
    green = applySaturationChannel(green, luminance, field.saturation) * field.brightness;
    blue = applySaturationChannel(blue, luminance, field.saturation) * field.brightness;
    this.sample[0] = clamp(red, 0, 1);
    this.sample[1] = clamp(green, 0, 1);
    this.sample[2] = clamp(blue, 0, 1);
  }

  private sampleComposite(
    field: AbstractLegacyPaletteField,
    shaderTime: number,
    intervention: number,
    x: number,
    y: number,
  ) {
    const overlayFaceCount = Math.max(1, Math.round(field.overlayFaceCount));
    const layerCount = overlayFaceCount + 1;
    const baseVariation = getLayerVariation(0, layerCount, field.variation, shaderTime);
    this.sampleShader(x, y, shaderTime, baseVariation, field, intervention, -0.5);
    let red = this.sample[0];
    let green = this.sample[1];
    let blue = this.sample[2];

    for (let layerIndex = 1; layerIndex < layerCount; layerIndex += 1) {
      const heightRatio = layerIndex / overlayFaceCount;
      if (y > heightRatio) continue;
      const variation = getLayerVariation(layerIndex, layerCount, field.variation, shaderTime);
      const normalizedLayer = layerCount > 1
        ? layerIndex / (layerCount - 1) - 0.5
        : 0;
      this.sampleShader(
        x,
        y / heightRatio,
        shaderTime,
        variation,
        field,
        intervention,
        normalizedLayer,
      );
      red = overlayChannel(red, this.sample[0]);
      green = overlayChannel(green, this.sample[1]);
      blue = overlayChannel(blue, this.sample[2]);
    }

    this.sample[0] = red;
    this.sample[1] = green;
    this.sample[2] = blue;
  }

  /**
   * Returns average WCAG relative luminance for a small semantic region.
   * This reuses the control-rate shader model and performs no GPU readback.
   */
  evaluateLightness(
    field: AbstractLegacyPaletteField,
    shaderTime: number,
    intervention: number,
    points: ReadonlyArray<AbstractLegacyPaletteSamplePoint>,
  ) {
    if (points.length === 0) return 0;
    let total = 0;

    for (const point of points) {
      this.sampleComposite(
        field,
        shaderTime,
        intervention,
        clamp(point.x, 0, 1),
        clamp(point.y, 0, 1),
      );
      total += 0.2126 * srgbToLinear(this.sample[0]) +
        0.7152 * srgbToLinear(this.sample[1]) +
        0.0722 * srgbToLinear(this.sample[2]);
    }

    return total / points.length;
  }

  evaluate(
    field: AbstractLegacyPaletteField,
    shaderTime: number,
    intervention: number,
    limits: AbstractLegacyPaletteLimits,
  ): AbstractLegacyPaletteMetrics {
    let yellowCount = 0;
    let counterpointCount = 0;
    let chromaticCount = 0;
    let hueCosine = 0;
    let hueSine = 0;
    let chromaTotal = 0;
    let sampleCount = 0;

    for (let yIndex = 0; yIndex < SAMPLE_Y.length; yIndex += 1) {
      const y = SAMPLE_Y[yIndex];
      for (let xIndex = 0; xIndex < SAMPLE_X.length; xIndex += 1) {
        const x = SAMPLE_X[xIndex];
        this.sampleComposite(field, shaderTime, intervention, x, y);
        const red = this.sample[0];
        const green = this.sample[1];
        const blue = this.sample[2];

        getOklabMetricsInto(red, green, blue, this.perceptual);
        const lightness = this.perceptual[0];
        const chroma = this.perceptual[1];
        const hue = this.perceptual[2];
        const chromatic = chroma >= 0.035;
        const yellow = chromatic && lightness >= 0.42 && hue >= 70 && hue <= 125;
        const counterpoint = chromatic && lightness >= 0.25 && hue >= 175 && hue <= 335;
        if (yellow) yellowCount += 1;
        if (counterpoint) counterpointCount += 1;
        if (chromatic) {
          chromaticCount += 1;
          const hueRadians = hue * Math.PI / 180;
          hueCosine += Math.cos(hueRadians);
          hueSine += Math.sin(hueRadians);
        }
        chromaTotal += chroma;
        sampleCount += 1;
      }
    }

    const yellowCoverage = yellowCount / sampleCount;
    const counterpointCoverage = counterpointCount / sampleCount;
    const hueDiversity = chromaticCount > 1
      ? 1 - Math.hypot(hueCosine, hueSine) / chromaticCount
      : 0;
    const averageChroma = chromaTotal / sampleCount;
    const yellowPressure = Math.max(
      0,
      (yellowCoverage - limits.maximumYellowCoverage) /
        Math.max(0.05, 1 - limits.maximumYellowCoverage),
    );
    const yellowApproachingLimit = yellowCoverage >= limits.maximumYellowCoverage * 0.72;
    const counterpointDeficit = yellowApproachingLimit
      ? Math.max(
        0,
        (limits.minimumCounterpointCoverage - counterpointCoverage) /
          Math.max(0.02, limits.minimumCounterpointCoverage),
      )
      : 0;
    const diversityDeficit = yellowApproachingLimit
      ? Math.max(
        0,
        (limits.minimumHueDiversity - hueDiversity) /
          Math.max(0.02, limits.minimumHueDiversity),
      )
      : 0;
    const chromaDeficit = averageChroma < limits.minimumChroma
      ? (limits.minimumChroma - averageChroma) / Math.max(0.02, limits.minimumChroma)
      : 0;
    const risk = yellowPressure * 6 + counterpointDeficit * 1.5 +
      diversityDeficit + chromaDeficit * 0.65;

    return {
      yellowCoverage,
      counterpointCoverage,
      hueDiversity,
      averageChroma,
      risk,
    };
  }

  resolve(
    field: AbstractLegacyPaletteField,
    shaderTime: number,
    lookAheadShaderTime: number,
    limits: AbstractLegacyPaletteLimits,
    lookAheadField: AbstractLegacyPaletteField = field,
  ): AbstractLegacyPaletteResolution {
    const current = this.evaluate(field, shaderTime, 0, limits);
    const lookAhead = this.evaluate(lookAheadField, lookAheadShaderTime, 0, limits);
    const baselineRisk = Math.max(current.risk, lookAhead.risk);

    if (baselineRisk <= 0) {
      return { amount: 0, current, lookAhead, corrected: current };
    }

    const maximumIntervention = clamp(limits.maximumIntervention, 0, 1);
    let bestAmount = maximumIntervention;
    let bestMetrics = current;
    let bestRisk = Number.POSITIVE_INFINITY;

    for (let candidateIndex = 1; candidateIndex <= CANDIDATE_COUNT; candidateIndex += 1) {
      const amount = maximumIntervention * candidateIndex / CANDIDATE_COUNT;
      const candidateCurrent = this.evaluate(field, shaderTime, amount, limits);
      const candidateLookAhead = this.evaluate(
        lookAheadField,
        lookAheadShaderTime,
        amount,
        limits,
      );
      const candidateRisk = Math.max(candidateCurrent.risk, candidateLookAhead.risk);
      const candidateMetrics = candidateCurrent.risk >= candidateLookAhead.risk
        ? candidateCurrent
        : candidateLookAhead;

      if (candidateRisk < bestRisk) {
        bestRisk = candidateRisk;
        bestAmount = amount;
        bestMetrics = candidateMetrics;
      }
      if (candidateRisk <= 0) break;
    }

    return {
      amount: bestAmount,
      current,
      lookAhead,
      corrected: bestMetrics,
    };
  }
}

export function smoothPaletteIntervention(
  current: number,
  target: number,
  deltaSeconds: number,
  attackMs: number,
  releaseMs: number,
) {
  const durationMs = target > current ? attackMs : releaseMs;
  const durationSeconds = Math.max(0.016, durationMs / 1000);
  const alpha = 1 - Math.exp(-Math.max(0, deltaSeconds) / durationSeconds);
  const next = current + (target - current) * alpha;
  return Math.abs(next - target) < 0.0001 ? target : next;
}
