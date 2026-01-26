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

const GOLDEN_RATIO_WEIGHT = 0.6180469716

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

export const computeHeights = (
  count: number,
  activeIndex: number | null,
  navMode: boolean,
  activePct: number,
) => {
  if (count === 0) return []
  if (navMode) {
    const remainingCount = count - 1
    if (remainingCount <= 0) return [100]
    if (activeIndex == null) {
      return Array.from({ length: count }, (_, index) =>
        index === 0 ? 0 : 100 / remainingCount,
      )
    }

    const adjustedActive = Math.max(0, activeIndex - 1)
    const inactiveCount = remainingCount - 1
    if (inactiveCount <= 0) {
      return Array.from({ length: count }, (_, index) => (index === 0 ? 0 : 100))
    }

    const remaining = 100 - activePct
    let sumWeights = 0
    const weights = Array.from({ length: remainingCount }, (_, idx) => {
      if (idx === adjustedActive) return 0
      const distance = Math.abs(idx - adjustedActive)
      const weight = Math.pow(GOLDEN_RATIO_WEIGHT, Math.max(0, distance - 1))
      sumWeights += weight
      return weight
    })

    return Array.from({ length: count }, (_, index) => {
      if (index === 0) return 0
      const localIndex = index - 1
      if (localIndex === adjustedActive) return activePct
      if (sumWeights === 0) return 0
      return (remaining * weights[localIndex]) / sumWeights
    })
  }

  if (activeIndex == null) {
    return Array.from({ length: count }, () => 100 / count)
  }

  const inactiveCount = count - 1
  if (inactiveCount <= 0) return [100]

  const remaining = 100 - activePct
  let sumWeights = 0
  const weights = Array.from({ length: count }, (_, index) => {
    if (index === activeIndex) return 0
    const distance = Math.abs(index - activeIndex)
    const weight = Math.pow(GOLDEN_RATIO_WEIGHT, Math.max(0, distance - 1))
    sumWeights += weight
    return weight
  })

  if (sumWeights === 0) {
    return Array.from({ length: count }, (_, index) =>
      index === activeIndex ? activePct : 0,
    )
  }

  return Array.from({ length: count }, (_, index) => {
    if (index === activeIndex) return activePct
    return (remaining * weights[index]) / sumWeights
  })
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
