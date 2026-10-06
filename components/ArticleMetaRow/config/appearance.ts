import { normalizeTailwindToken, type TailwindTokenValue } from '../../Panel/config/tailwindFields'

export type ArticleMetaRowAppearanceConfig = {
  fontFamily: TailwindTokenValue<'fontFamily'>
  fontSize: TailwindTokenValue<'fontSize'>
  fontSizeWide: TailwindTokenValue<'fontSize', 'md'>
  fontSizeLg: TailwindTokenValue<'fontSize', 'lg'>
  paddingTop: TailwindTokenValue<'paddingTop'>
  paddingTopWide: TailwindTokenValue<'paddingTop', 'md'>
  paddingTopLg: TailwindTokenValue<'paddingTop', 'lg'>
  paddingRight: TailwindTokenValue<'paddingRight'>
  paddingRightWide: TailwindTokenValue<'paddingRight', 'md'>
  paddingRightLg: TailwindTokenValue<'paddingRight', 'lg'>
  paddingBottom: TailwindTokenValue<'paddingBottom'>
  paddingBottomWide: TailwindTokenValue<'paddingBottom', 'md'>
  paddingBottomLg: TailwindTokenValue<'paddingBottom', 'lg'>
  paddingLeft: TailwindTokenValue<'paddingLeft'>
  paddingLeftWide: TailwindTokenValue<'paddingLeft', 'md'>
  paddingLeftLg: TailwindTokenValue<'paddingLeft', 'lg'>
  colorOpacity: number
  categoryFontWeight: TailwindTokenValue<'fontWeight'>
  categoryFontWeightWide: TailwindTokenValue<'fontWeight', 'md'>
  categoryFontWeightLg: TailwindTokenValue<'fontWeight', 'lg'>
}

export const DEFAULT_ARTICLE_META_ROW_APPEARANCE_CONFIG: ArticleMetaRowAppearanceConfig = {
  fontFamily: 'font-sans',
  fontSize: 'text-sm',
  fontSizeWide: 'md:text-sm',
  fontSizeLg: 'lg:text-sm',
  paddingTop: 'pt-2',
  paddingTopWide: 'md:pt-2',
  paddingTopLg: 'lg:pt-2',
  paddingRight: 'pr-0',
  paddingRightWide: 'md:pr-0',
  paddingRightLg: 'lg:pr-0',
  paddingBottom: 'pb-2',
  paddingBottomWide: 'md:pb-2',
  paddingBottomLg: 'lg:pb-2',
  paddingLeft: 'pl-0',
  paddingLeftWide: 'md:pl-0',
  paddingLeftLg: 'lg:pl-0',
  colorOpacity: 0.7,
  categoryFontWeight: 'font-normal',
  categoryFontWeightWide: 'md:font-normal',
  categoryFontWeightLg: 'lg:font-normal',
}

export function normalizeArticleMetaRowAppearanceConfig(
  config: Partial<ArticleMetaRowAppearanceConfig> | undefined,
): ArticleMetaRowAppearanceConfig {
  const D = DEFAULT_ARTICLE_META_ROW_APPEARANCE_CONFIG
  return {
    fontFamily: normalizeTailwindToken({
      utility: 'fontFamily', breakpoint: 'base', value: config?.fontFamily, fallback: D.fontFamily,
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
    paddingTop: normalizeTailwindToken({
      utility: 'paddingTop', breakpoint: 'base', value: config?.paddingTop, fallback: D.paddingTop,
    }),
    paddingTopWide: normalizeTailwindToken({
      utility: 'paddingTop', breakpoint: 'md', value: config?.paddingTopWide, fallback: D.paddingTopWide,
    }),
    paddingTopLg: normalizeTailwindToken({
      utility: 'paddingTop', breakpoint: 'lg', value: config?.paddingTopLg, fallback: D.paddingTopLg,
    }),
    paddingRight: normalizeTailwindToken({
      utility: 'paddingRight', breakpoint: 'base', value: config?.paddingRight, fallback: D.paddingRight,
    }),
    paddingRightWide: normalizeTailwindToken({
      utility: 'paddingRight', breakpoint: 'md', value: config?.paddingRightWide, fallback: D.paddingRightWide,
    }),
    paddingRightLg: normalizeTailwindToken({
      utility: 'paddingRight', breakpoint: 'lg', value: config?.paddingRightLg, fallback: D.paddingRightLg,
    }),
    paddingBottom: normalizeTailwindToken({
      utility: 'paddingBottom', breakpoint: 'base', value: config?.paddingBottom, fallback: D.paddingBottom,
    }),
    paddingBottomWide: normalizeTailwindToken({
      utility: 'paddingBottom', breakpoint: 'md', value: config?.paddingBottomWide, fallback: D.paddingBottomWide,
    }),
    paddingBottomLg: normalizeTailwindToken({
      utility: 'paddingBottom', breakpoint: 'lg', value: config?.paddingBottomLg, fallback: D.paddingBottomLg,
    }),
    paddingLeft: normalizeTailwindToken({
      utility: 'paddingLeft', breakpoint: 'base', value: config?.paddingLeft, fallback: D.paddingLeft,
    }),
    paddingLeftWide: normalizeTailwindToken({
      utility: 'paddingLeft', breakpoint: 'md', value: config?.paddingLeftWide, fallback: D.paddingLeftWide,
    }),
    paddingLeftLg: normalizeTailwindToken({
      utility: 'paddingLeft', breakpoint: 'lg', value: config?.paddingLeftLg, fallback: D.paddingLeftLg,
    }),
    colorOpacity: typeof config?.colorOpacity === 'number' && Number.isFinite(config.colorOpacity)
      ? Math.min(1, Math.max(0, config.colorOpacity))
      : D.colorOpacity,
    categoryFontWeight: normalizeTailwindToken({
      utility: 'fontWeight', breakpoint: 'base', value: config?.categoryFontWeight, fallback: D.categoryFontWeight,
    }),
    categoryFontWeightWide: normalizeTailwindToken({
      utility: 'fontWeight', breakpoint: 'md', value: config?.categoryFontWeightWide, fallback: D.categoryFontWeightWide,
    }),
    categoryFontWeightLg: normalizeTailwindToken({
      utility: 'fontWeight', breakpoint: 'lg', value: config?.categoryFontWeightLg, fallback: D.categoryFontWeightLg,
    }),
  }
}
