import { DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG } from './bottomBannerConfig';
import { FEATURED_EDITORIAL_QUOTE_CONFIG, normalizeEditorialQuoteConfig, type EditorialQuoteConfig } from './editorialConfig';

export type FeaturedWallQuoteConfig = EditorialQuoteConfig;

/** Share the banner's tuned color without inheriting its section spacing. */
export const DEFAULT_FEATURED_WALL_QUOTE_CONFIG: FeaturedWallQuoteConfig = {
  ...FEATURED_EDITORIAL_QUOTE_CONFIG,
  gradientInkMeshSaturationPercent: DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG.gradientInkMeshSaturationPercent,
  cardAspectRatioEnabled: false,
  geometryShape: 'auto',
  headingAlign: 'start',
  textAlign: 'start',
  sourceHeadingFontSize: 'text-xs',
  sourceHeadingFontSizeMd: 'md:text-xs',
  sourceHeadingFontSizeLg: 'lg:text-xs',
  sourceHeadingTextTransform: 'uppercase',
  sourceHeadingTracking: 'tracking-widest',
  paddingTop: 'pt-10',
  paddingRight: 'pr-8',
  paddingBottom: 'pb-10',
  paddingLeft: 'pl-8',
  paddingTopMd: 'md:pt-10',
  paddingRightMd: 'md:pr-8',
  paddingBottomMd: 'md:pb-10',
  paddingLeftMd: 'md:pl-8',
  paddingTopLg: 'lg:pt-10',
  paddingRightLg: 'lg:pr-8',
  paddingBottomLg: 'lg:pb-10',
  paddingLeftLg: 'lg:pl-8',
};

export function normalizeFeaturedWallQuoteConfig(value?: Partial<FeaturedWallQuoteConfig>): FeaturedWallQuoteConfig {
  return normalizeEditorialQuoteConfig({ ...DEFAULT_FEATURED_WALL_QUOTE_CONFIG, ...value }, 'featured');
}
