export type SliderVisualParameters = {
  seed: number
  hueOffset: number
  variationBias: number
  offsetX: number
  offsetY: number
  accent: string
}

/**
 * One visual-identity recipe for every card rendered by the Abstract liquid
 * gradient. This module deliberately has no server-only dependencies so both
 * post normalization and client-rendered collections can share it.
 */
export function getSliderVisualParameters(index: number): SliderVisualParameters {
  return {
    seed: (index * 0.113 + 0.07) % 1,
    hueOffset: (index - 4) * 0.012,
    variationBias: Math.sin(index * 0.8) * 0.018,
    offsetX: Math.sin(index * 0.62) * 0.08,
    offsetY: Math.cos(index * 0.74) * 0.07,
    accent: `hsl(${150 + index * 23} 88% 72%)`,
  }
}
