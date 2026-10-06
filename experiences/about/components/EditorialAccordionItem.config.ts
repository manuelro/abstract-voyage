import { DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG, type AboutMobileAccordionConfig } from './AboutMobileAccordion.config';

/** Shared presentation preset; each page spreads this into its own writable default. */
export const DEFAULT_EDITORIAL_ACCORDION_ITEM_CONFIG: AboutMobileAccordionConfig = {
  ...DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG,
  contentFontSizeClassName: 'text-lg',
  contentFontSizeClassNameWide: 'md:text-base',
  contentFontSizeClassNameLg: 'lg:text-base',
  headerTextWrapEnabled: true,
  affordancePaddingX: 'px-0',
  affordancePaddingXWide: 'md:px-0',
  affordancePaddingXLg: 'lg:px-0',
  affordancePaddingY: 'py-0',
  affordancePaddingYWide: 'md:py-0',
  affordancePaddingYLg: 'lg:py-0',
  itemContentPaddingRight: 'pr-0',
  itemContentPaddingRightWide: 'md:pr-0',
  itemContentPaddingLeft: 'pl-0',
  itemContentPaddingLeftWide: 'md:pl-0',
};
