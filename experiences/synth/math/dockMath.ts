type DockMathConfig = {
  activePct: number
  closestTitleOpacity: number
  farTitleOpacity: number
  sigmaTitleOpacity: number
  titleOpacityGamma: number
  influenceRadius: number | null
  closestTitleScale: number
  farTitleScale: number
  sigmaTitleScale: number
  titleScaleGamma: number
  titleScaleInfluenceRadius: number | null
  titleScaleTransitionMs: number
  titleScaleTransitionDelayMs: number
  titleScaleEasing: string
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export const computeWeight = (
  distance: number,
  sigma: number,
  influenceRadius: number | null,
) => {
  if (influenceRadius != null && distance > influenceRadius) {
    return 0
  }
  const s = Math.max(1e-6, sigma)
  return Math.exp(-(distance * distance) / (2 * s * s))
}

export const computeScaleWeight = (
  distance: number,
  sigma: number,
  influenceRadius: number | null,
) => {
  if (influenceRadius != null && distance > influenceRadius) {
    return 0
  }
  const s = Math.max(1e-6, sigma)
  return Math.exp(-(distance * distance) / (2 * s * s))
}

export const computeTitleOpacity = (
  index: number,
  activeIndex: number | null,
  config: DockMathConfig,
) => {
  if (activeIndex == null) return 1
  if (index === activeIndex) return 1
  const distance = Math.abs(index - activeIndex)
  const weight = computeWeight(
    distance,
    config.sigmaTitleOpacity,
    config.influenceRadius,
  )
  const w1 = computeWeight(1, config.sigmaTitleOpacity, config.influenceRadius)
  const normalized = w1 > 0 ? clamp01(weight / w1) : 0
  const shaped = Math.pow(normalized, config.titleOpacityGamma)
  return (
    config.farTitleOpacity +
    (config.closestTitleOpacity - config.farTitleOpacity) * shaped
  )
}

export const computeTitleScale = (
  index: number,
  activeIndex: number | null,
  config: DockMathConfig,
) => {
  if (activeIndex == null) return 1
  if (index === activeIndex) return 1
  const distance = Math.abs(index - activeIndex)
  const weight = computeScaleWeight(
    distance,
    config.sigmaTitleScale,
    config.titleScaleInfluenceRadius,
  )
  const w1 = computeScaleWeight(1, config.sigmaTitleScale, config.titleScaleInfluenceRadius)
  const normalized = w1 > 0 ? clamp01(weight / w1) : 0
  const shaped = Math.pow(normalized, config.titleScaleGamma)
  return (
    config.farTitleScale +
    (config.closestTitleScale - config.farTitleScale) * shaped
  )
}

export type { DockMathConfig }
