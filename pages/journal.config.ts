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

// Wide-column desktop (Wide/Lg tier) fields below mirror /about's own
// narrow column (ABOUT_POLYMORPHIC_LAYOUT_CONFIG, experiences/abstract/
// components/PolymorphicLayout.pageConfigs.ts) field-for-field
// (narrowColumn* -> wideColumn*) — /about's timeline lives in its narrow
// column, journal's lives in its wide column, so this is the parity mapping
// that puts the same desktop styling behind both. splitBandRight* mirrors
// about's splitBandLeft* instead of splitBandRight*: both pages share
// wideColumnSide: 'right', so about's narrow (timeline) column sits under
// the header's LEFT band while journal's wide (timeline) column sits under
// the header's RIGHT band — mapping by physical position, not by field name.
// Only fields that actually diverge from DEFAULT_POLYMORPHIC_LAYOUT_CONFIG's
// own wide-column desktop values are listed; base/mobile tier is untouched.
export const JOURNAL_POLYMORPHIC_LAYOUT_CONFIG: PolymorphicLayoutConfig = {
  ...DEFAULT_POLYMORPHIC_LAYOUT_CONFIG,
  wideColumnSide: 'right',
  wideColumnCustomColor: '#2c2c3f',
  narrowColumnCustomColor: '#242438',
  wideColumnCustomColorWide: '#cbcbe1',
  narrowColumnCustomColorWide: '#242438',
  wideColumnCustomColorLg: '#2c2c3f',
  narrowColumnCustomColorLg: '#282839',
  splitBandLeftModeLg: 'custom',
  splitBandLeftCustomColorLg: '#2c2c3f',
  wideColumnContentContainer: 'full-bleed',
  narrowColumnContentContainer: 'full-bleed',
  wideColumnContentAlignWide: 'items-end',
  wideColumnContentAlignLg: 'items-end',
  wideColumnContentWidthWide: 'md:max-w-[100%]',
  wideColumnContentWidthLg: 'lg:max-w-[100%]',
  wideColumnContentMaxWidthLg: 'lg:max-w-md',
  wideColumnTextAlignWide: 'md:text-right',
  wideColumnContentPaddingLeftWide: 'md:pl-0',
  wideColumnContentPaddingLeftLg: 'lg:pl-2',
  wideColumnContentPaddingRightWide: 'md:pr-7',
  wideColumnContentPaddingRightLg: 'lg:pr-0',
  wideColumnContentPaddingTopWide: 'md:pt-9',
  wideColumnContentPaddingTopLg: 'lg:pt-0',
  wideColumnContentPaddingBottomWide: 'md:pb-0',
  wideColumnContentPaddingBottomLg: 'lg:pb-0',
  splitBandRightModeWide: 'custom',
  splitBandRightModeLg: 'custom',
  splitBandRightCustomColorWide: '#d1d1e6',
  splitBandRightCustomColorLg: '#282839',
}

// Full parity with /about's own timeline (DEFAULT_ABOUT_PAGE_TIMELINE_CONFIG,
// pages/about.config.ts) for every field the shared "Timeline" panel exposes
// — same base + the same 17 overrides that page applies. `description` is
// the one deliberate exception: it's page content (about's own bio lead-in
// sentence), not styling, so journal keeps its own empty value rather than
// showing about's copy on the journal index.
export const DEFAULT_JOURNAL_TIMELINE_CONFIG: AboutTimelineConfig = normalizeAboutTimelineConfig({
  ...DEFAULT_ABOUT_TIMELINE_CONFIG,
  rowGap: 'gap-7',
  markerVisible: true,
  markerSizeClassName: 'w-2.5 h-2.5',
  markerColorMode: 'text',
  markerCustomColor: '#6c6b94',
  hoverMarkerOpacity: 0.4,
  markerIdleOpacity: 0.31,
  markerActiveOpacity: 0.55,
  markerGradientEnabled: false,
  rowTitleMinContrastActive: 7.6,
  rowDescriptionMinContrastActive: 5.7,
  rowDescriptionMinContrastInactive: 3,
  descriptionOpacity: 0.49,
  rowAppendixEnabled: true,
  rowAppendixOpacity: 0.65,
  rowAppendixRevealDelayMs: 340,
  rowAppendixSeparator: '⋅',
  paddingTopLgClassName: 'lg:pt-7',
  marginTopLgClassName: 'lg:mt-0',
  description: '',
  maxWidthClassName: 'max-w-2xl',
  maxActiveRows: 0,
  rowAppendixFontSizeClassName: 'text-xs',
})

export const DEFAULT_JOURNAL_CARD_APPEARANCE_CONFIG: CardAppearanceConfig = normalizeCardAppearanceConfig({
  ...DEFAULT_CARD_APPEARANCE_CONFIG,
  activeTextOpacity: 0.85,
})
