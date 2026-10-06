import { normalizeTailwindToken, type TailwindTokenValue } from '../../../../components/Panel/config/tailwindFields'

// Layout axis, not a resolved Tailwind theme scale — same hand-written-enum
// precedent JournalAccordionTextWrap (pages/journal.config.ts) already
// establishes for a CSS-level choice with no generated utility family
// behind it. 'horizontal' (default, every tier): today's single-row,
// wrapping chip layout, unchanged. 'vertical': opt-in per breakpoint, one
// chip per line.
export type ArticleFilterLayoutDirection = 'horizontal' | 'vertical'

export type ArticleFilterConfig = {
  enabled: boolean
  /** Caps how many category chips render. "All" still includes every post. */
  maxCategories: number
  layoutDirection: ArticleFilterLayoutDirection
  layoutDirectionWide: ArticleFilterLayoutDirection
  layoutDirectionLg: ArticleFilterLayoutDirection
  /** Resting size for filters farthest from the dock focus. */
  dockMinScale: number
  /** Peak size at the dock focus and its closest neighbors. */
  dockMaxScale: number
  gapClassName: TailwindTokenValue<'gap'>
  spaceBeforeClassName: TailwindTokenValue<'marginTop'>
  fontSize: TailwindTokenValue<'fontSize'>
  fontSizeWide: TailwindTokenValue<'fontSize', 'md'>
  fontSizeLg: TailwindTokenValue<'fontSize', 'lg'>
}

export const DEFAULT_ARTICLE_FILTER_CONFIG: ArticleFilterConfig = {
  enabled: true,
  maxCategories: 6,
  layoutDirection: 'horizontal',
  layoutDirectionWide: 'horizontal',
  layoutDirectionLg: 'horizontal',
  dockMinScale: 1,
  dockMaxScale: 1.2,
  gapClassName: 'gap-2',
  spaceBeforeClassName: 'mt-6',
  fontSize: 'text-2xs',
  fontSizeWide: 'md:text-2xs',
  fontSizeLg: 'lg:text-2xs',
}

const ARTICLE_FILTER_LAYOUT_DIRECTION_VALUES: ReadonlyArray<ArticleFilterLayoutDirection> = ['horizontal', 'vertical']

export function normalizeArticleFilterConfig(
  config: Partial<ArticleFilterConfig> | undefined,
): ArticleFilterConfig {
  const D = DEFAULT_ARTICLE_FILTER_CONFIG
  const layoutDirection = (value: unknown, fallback: ArticleFilterLayoutDirection): ArticleFilterLayoutDirection => (
    ARTICLE_FILTER_LAYOUT_DIRECTION_VALUES.includes(value as ArticleFilterLayoutDirection)
      ? value as ArticleFilterLayoutDirection : fallback
  )
  return {
    enabled: config?.enabled !== false,
    maxCategories: typeof config?.maxCategories === 'number' && Number.isFinite(config.maxCategories)
      ? Math.max(0, Math.min(20, Math.round(config.maxCategories)))
      : D.maxCategories,
    layoutDirection: layoutDirection(config?.layoutDirection, D.layoutDirection),
    layoutDirectionWide: layoutDirection(config?.layoutDirectionWide, D.layoutDirectionWide),
    layoutDirectionLg: layoutDirection(config?.layoutDirectionLg, D.layoutDirectionLg),
    dockMinScale: typeof config?.dockMinScale === 'number' && Number.isFinite(config.dockMinScale)
      ? Math.max(0.8, Math.min(1, config.dockMinScale)) : D.dockMinScale,
    dockMaxScale: typeof config?.dockMaxScale === 'number' && Number.isFinite(config.dockMaxScale)
      ? Math.max(1, Math.min(1.6, config.dockMaxScale)) : D.dockMaxScale,
    gapClassName: normalizeTailwindToken({
      utility: 'gap', breakpoint: 'base', value: config?.gapClassName, fallback: D.gapClassName,
    }),
    spaceBeforeClassName: normalizeTailwindToken({
      utility: 'marginTop', breakpoint: 'base', value: config?.spaceBeforeClassName, fallback: D.spaceBeforeClassName,
    }),
    fontSize: normalizeTailwindToken({
      utility: 'fontSize', breakpoint: 'base', value: config?.fontSize, fallback: D.fontSize,
    }),
    fontSizeWide: normalizeTailwindToken({
      utility: 'fontSize', breakpoint: 'md', value: config?.fontSizeWide, fallback: D.fontSizeWide,
    }),
    fontSizeLg: normalizeTailwindToken({
      utility: 'fontSize', breakpoint: 'lg', value: config?.fontSizeLg, fallback: D.fontSizeLg,
    }),
  }
}
