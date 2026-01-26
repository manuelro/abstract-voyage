import { generateHarmonicGradient } from '../../../helpers/harmonicGradient'
import type { GradientConfig } from '../../../helpers/harmonicGradient'
import type { SvgStop } from '../../../helpers/gradientMath'

export const BASE_SYNTH_GRADIENT_CONFIG: GradientConfig = {
  baseHue: 575,
  hueScheme: 'dual-complementary',
  lightnessRange: { max: 22 },
  chromaRange: { min: 80 },
  mode: 'side-bright',
  stops: 22,
  variance: 100,
  centerStretch: 0.3,
  seed: 50,
}

export const SYNTH_LOGO_GRADIENT_OVERRIDES: Partial<GradientConfig> = {
  lightnessRange: { min: 80 },
}

export const SYNTH_LOGO_SIZE = {
  width: 300,
  className: 'h-4 w-auto',
} as const

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

export const buildSynthLogoStops = (
  overrides: Partial<GradientConfig> = {},
): SvgStop[] => {
  const stops = generateHarmonicGradient({
    ...BASE_SYNTH_GRADIENT_CONFIG,
    ...SYNTH_LOGO_GRADIENT_OVERRIDES,
    ...overrides,
  })

  return stops.map((stop) => ({
    color: stop.color,
    at: stop.at * 100,
  }))
}
