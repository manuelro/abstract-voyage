import { generateHarmonicGradient } from '../../../helpers/harmonicGradient'
import type { GradientConfig } from '../../../helpers/harmonicGradient'

export const BASE_SYNTH_GRADIENT_CONFIG: GradientConfig = {
  baseHue: 218,
  hueScheme: 'dual-complementary',
  lightnessRange: { max: 22 },
  chromaRange: { min: 100 },
  mode: 'side-bright',
  stops: 22,
  variance: 100,
  centerStretch: 0,
  seed: 50,
}

export const buildSynthBackgroundGradient = (
  overrides: Partial<GradientConfig> = {}
) => {
  const stops = generateHarmonicGradient({
    ...BASE_SYNTH_GRADIENT_CONFIG,
    ...overrides,
  })

  return `radial-gradient(circle at 0% 0%, ${stops
    .map((stop) => `${stop.color} ${Math.round(stop.at * 1000)}%`)
    .join(', ')})`
}
