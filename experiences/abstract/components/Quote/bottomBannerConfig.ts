import { FEATURED_EDITORIAL_QUOTE_CONFIG, normalizeEditorialQuoteConfig, type EditorialQuoteConfig } from './editorialConfig';

export type BottomBannerQuoteConfig = EditorialQuoteConfig;

// Keep the featured quote's visual treatment while retaining the banner's
// own spacing. The wall host lets its long Practices content set the height.
// Text and source heading continue to come from content/practices.md.
export const DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG: BottomBannerQuoteConfig = {
  ...FEATURED_EDITORIAL_QUOTE_CONFIG,
  // The featured card imposes a fixed landscape aspect ratio, which reads fine
  // in a narrow masonry column but, at the banner's full width, forces an
  // enormous figure height. With sourceHeadingTopAligned on, that excess height
  // is distributed by the centered body -- heading pinned to the top, quote
  // floated to the vertical middle, dead space after the CTA. The banner must
  // size to its content (the Practices column sets the height), so drop the
  // ratio and let the figure grow to fit.
  cardAspectRatioEnabled: false,
  geometryShape: 'auto',
  marginTopLg: 'lg:mt-20',
  paddingTop: 'pt-10',
  paddingRight: 'pr-10',
  paddingBottom: 'pb-10',
  paddingLeft: 'pl-10',
  paddingTopLg: 'lg:pt-10',
  paddingRightLg: 'lg:pr-20',
  paddingBottomLg: 'lg:pb-0',
  paddingLeftLg: 'lg:pl-20',
  parentQuotePaddingTop: 'pt-0',
  parentQuotePaddingRight: 'pr-0',
  parentQuotePaddingBottom: 'pb-0',
  parentQuotePaddingLeft: 'pl-0',
  parentQuotePaddingTopMd: 'md:pt-0',
  parentQuotePaddingRightMd: 'md:pr-0',
  parentQuotePaddingBottomMd: 'md:pb-0',
  parentQuotePaddingLeftMd: 'md:pl-0',
  parentQuotePaddingTopLg: 'lg:pt-0',
  parentQuotePaddingRightLg: 'lg:pr-0',
  parentQuotePaddingBottomLg: 'lg:pb-0',
  parentQuotePaddingLeftLg: 'lg:pl-0',

  gradientInkMeshSaturationPercent: 35,

  sourceHeadingFontSizeLg: 'lg:text-xs',

  paddingTopMd: 'md:pt-10',
  paddingRightMd: 'md:pr-10',
  paddingBottomMd: 'md:pb-10',
  paddingLeftMd: 'md:pl-10',
};

export function normalizeBottomBannerQuoteConfig(value?: Partial<BottomBannerQuoteConfig>): BottomBannerQuoteConfig {
  return normalizeEditorialQuoteConfig({ ...DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG, ...value }, 'featured');
}
