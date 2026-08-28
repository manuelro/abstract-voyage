export type MagnificationDockRevealDistribution =
  | 'linear'
  | 'gaussian'
  | 'gaussian-inverse'

export type MagnificationDockRevealMode = 'stagger' | 'sequence'

export type MagnificationDockRevealScheduleOptions = {
  itemCount: number
  staggerMs: number
  durationMs?: number
  overlapMs?: number
  mode?: MagnificationDockRevealMode
  distribution?: MagnificationDockRevealDistribution
  cadenceAmount?: number
  /** @deprecated Use cadenceAmount. */
  strength?: number
}

export type MagnificationDockRevealItemTiming = {
  startMs: number
  durationMs: number
  cadenceMultiplier: number
}

export function computeMagnificationDockDeckRevealOrder({
  itemCount,
  activeIndex,
  tailCount,
}: {
  itemCount: number
  activeIndex: number
  tailCount: number
}): number[] {
  const safeItemCount = Math.max(0, Math.floor(itemCount))
  if (safeItemCount === 0) return []
  const safeActiveIndex = Math.max(0, Math.min(safeItemCount - 1, Math.floor(activeIndex)))
  const safeTailCount = Math.max(0, Math.floor(tailCount))
  const order = [safeActiveIndex]

  for (
    let index = safeActiveIndex + 1;
    index < safeItemCount && index <= safeActiveIndex + safeTailCount;
    index += 1
  ) {
    order.push(index)
  }

  if (safeActiveIndex > 0) order.push(safeActiveIndex - 1)
  return order
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const GAUSSIAN_SIGMA = 0.42

export function computeMagnificationDockRevealSchedule({
  itemCount,
  staggerMs,
  durationMs = 0,
  overlapMs = 0,
  mode = 'stagger',
  distribution = 'linear',
  cadenceAmount,
  strength = 1,
}: MagnificationDockRevealScheduleOptions): MagnificationDockRevealItemTiming[] {
  const safeItemCount = Math.max(0, Math.floor(itemCount))
  if (safeItemCount === 0) return []
  const safeDurationMs = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0
  const safeStaggerMs = Number.isFinite(staggerMs) ? Math.max(0, staggerMs) : 0
  const requestedCadenceAmount = cadenceAmount ?? strength
  const safeCadenceAmount = Number.isFinite(requestedCadenceAmount)
    ? clamp01(requestedCadenceAmount)
    : 0
  const requestedOverlapMs = Number.isFinite(overlapMs) ? Math.max(0, overlapMs) : 0
  const edgeGaussian = Math.exp(-0.5 * Math.pow(1 / GAUSSIAN_SIGMA, 2))
  const cadenceMultipliers = Array.from({ length: safeItemCount }, (_, index) => {
    if (distribution === 'linear' || safeCadenceAmount === 0 || safeItemCount === 1) {
      return 1
    }

    const x = safeItemCount === 1
      ? 0
      : -1 + (index / (safeItemCount - 1)) * 2
    const gaussian = Math.exp(-0.5 * Math.pow(x / GAUSSIAN_SIGMA, 2))
    const normalizedGaussian = clamp01(
      (gaussian - edgeGaussian) / Math.max(1e-6, 1 - edgeGaussian),
    )
    const curve = distribution === 'gaussian'
      ? 1 - normalizedGaussian
      : normalizedGaussian

    return 1 + safeCadenceAmount * curve
  })
  const durations = cadenceMultipliers.map(multiplier => safeDurationMs * multiplier)
  const schedule: MagnificationDockRevealItemTiming[] = []
  let sequenceStartMs = 0

  durations.forEach((itemDurationMs, index) => {
    const startMs = mode === 'sequence'
      ? sequenceStartMs
      : index * safeStaggerMs
    schedule.push({
      startMs,
      durationMs: itemDurationMs,
      cadenceMultiplier: cadenceMultipliers[index],
    })

    if (mode === 'sequence') {
      const safeOverlapMs = Math.min(itemDurationMs, requestedOverlapMs)
      sequenceStartMs += Math.max(0, itemDurationMs - safeOverlapMs)
    }
  })

  return schedule
}

export function computeMagnificationDockRevealOffsets(
  options: MagnificationDockRevealScheduleOptions,
): number[] {
  return computeMagnificationDockRevealSchedule(options).map(item => item.startMs)
}
