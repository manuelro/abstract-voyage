export type ThoughtCardConfig = {
  compactRootSizePx: number
  amplifiedRootSizePx: number
  paddingRatioCqw: number
  titleRatioCqw: number
  descriptionRatioCqw: number
}

export const DEFAULT_THOUGHT_CARD_CONFIG: ThoughtCardConfig = {
  compactRootSizePx: 360,
  amplifiedRootSizePx: 640,
  paddingRatioCqw: 10.6667,
  titleRatioCqw: 5.6,
  descriptionRatioCqw: 3.9,
}

export function normalizeThoughtCardConfig(config: Partial<ThoughtCardConfig> = {}): ThoughtCardConfig {
  const positive = (value: number | undefined, fallback: number) => (
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
  )
  return {
    compactRootSizePx: positive(config.compactRootSizePx, DEFAULT_THOUGHT_CARD_CONFIG.compactRootSizePx),
    amplifiedRootSizePx: positive(config.amplifiedRootSizePx, DEFAULT_THOUGHT_CARD_CONFIG.amplifiedRootSizePx),
    paddingRatioCqw: positive(config.paddingRatioCqw, DEFAULT_THOUGHT_CARD_CONFIG.paddingRatioCqw),
    titleRatioCqw: positive(config.titleRatioCqw, DEFAULT_THOUGHT_CARD_CONFIG.titleRatioCqw),
    descriptionRatioCqw: positive(config.descriptionRatioCqw, DEFAULT_THOUGHT_CARD_CONFIG.descriptionRatioCqw),
  }
}
