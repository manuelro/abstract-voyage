import {
  DEFAULT_ABOUT_TIMELINE_CONFIG,
  normalizeAboutTimelineConfig,
  type AboutTimelineConfig,
} from '../experiences/about/components/AboutTimeline.config'
import {
  DEFAULT_CARD_APPEARANCE_CONFIG,
  normalizeCardAppearanceConfig,
  type CardAppearanceConfig,
} from '../experiences/abstract/components/Card/config/appearance'
import {
  DEFAULT_POLYMORPHIC_LAYOUT_CONFIG,
  normalizePolymorphicLayoutConfig,
  type PolymorphicLayoutConfig,
} from '../experiences/abstract/components/PolymorphicLayout.config'

export const JOURNAL_POLYMORPHIC_LAYOUT_CONFIG: PolymorphicLayoutConfig = {
  ...DEFAULT_POLYMORPHIC_LAYOUT_CONFIG,
  wideColumnSide: 'right',
  wideColumnCustomColor: '#2c2c3f',
  narrowColumnCustomColor: '#242438',
  wideColumnCustomColorWide: '#2c2c3f',
  narrowColumnCustomColorWide: '#242438',
  wideColumnCustomColorLg: '#2c2c3f',
  narrowColumnCustomColorLg: '#242438',
  splitBandLeftCustomColorLg: '#2c2c3f',
  wideColumnContentContainer: 'full-bleed',
  narrowColumnContentContainer: 'full-bleed',
}

export const DEFAULT_JOURNAL_TIMELINE_CONFIG: AboutTimelineConfig = normalizeAboutTimelineConfig({
  ...DEFAULT_ABOUT_TIMELINE_CONFIG,
  maxWidthClassName: 'max-w-2xl',
  rowGap: 'gap-7',
  markerVisible: false,
  maxActiveRows: 0,
  rowTitleMinContrastActive: 12.6,
  rowTitleMinContrastInactive: 5,
  rowDescriptionMinContrastActive: 8.8,
  rowDescriptionMinContrastInactive: 7.2,
  rowTitleOpacityInactive: 0.85,
  rowDescriptionOpacityActive: 0.21,
  rowDescriptionOpacityInactive: 0.32,
  hoverTitleOpacity: 0.85,
  hoverDescriptionOpacity: 0.6,
  rowAppendixEnabled: true,
  rowAppendixFontFamily: 'font-serif',
  rowAppendixSeparator: '⋅',
  rowAppendixRevealDelayMs: 350,
  rowTitleFontFamily: 'font-serif',
  rowTitleFontWeightClassName: 'font-normal',
  rowTitleFontSizeClassName: 'text-base',
  marginTopLgClassName: 'lg:mt-0',
  descriptionPaddingTopLgClassName: 'lg:pt-0',
  descriptionPaddingBottomLgClassName: 'lg:pb-0',
  description: '',
})

export const DEFAULT_JOURNAL_CARD_APPEARANCE_CONFIG: CardAppearanceConfig = normalizeCardAppearanceConfig({
  ...DEFAULT_CARD_APPEARANCE_CONFIG,
  activeTextOpacity: 0.85,
})
