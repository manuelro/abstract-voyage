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
  normalizePolymorphicLayoutConfig,
  type PolymorphicLayoutConfig,
} from '../experiences/abstract/components/PolymorphicLayout.config'
import { POST_LAB_POLYMORPHIC_LAYOUT_CONFIG } from '../experiences/abstract/components/PolymorphicLayout.pageConfigs'

// Full field-for-field parity with /posts-lab's own instance
// (POST_LAB_POLYMORPHIC_LAYOUT_CONFIG, experiences/abstract/components/
// PolymorphicLayout.pageConfigs.ts) — both pages share wideColumnSide:
// 'right' already, so unlike /about (whose narrow/wide columns are
// mirrored relative to journal's), no field-name translation is needed
// here; every field below is a direct copy of posts-lab's own resolved
// value, not a re-derivation. This is a one-time value copy (spread at
// module load), not a live link — a future change to posts-lab's own
// instance won't retroactively change journal's; re-sync explicitly if
// parity should be kept going forward.
export const JOURNAL_POLYMORPHIC_LAYOUT_CONFIG: PolymorphicLayoutConfig = {
  ...POST_LAB_POLYMORPHIC_LAYOUT_CONFIG,
  wideColumnContentPaddingLeftLg: 'lg:pl-2',
  wideColumnContentPaddingTopLg: 'lg:pt-0',
  wideColumnContentPaddingBottomLg: 'lg:pb-0',
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
