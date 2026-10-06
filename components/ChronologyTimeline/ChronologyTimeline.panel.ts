import { createTailwindFieldFactory } from '../Panel/config'
import type { ChronologyTimelineConfig } from './ChronologyTimeline.config'

const tailwindField = createTailwindFieldFactory<ChronologyTimelineConfig>()
const MONTH_NAME_OPTIONS = [{ label: 'FULL', value: 'full' }, { label: 'SHORT', value: 'short' }] as const
const PLACEMENT_OPTIONS = [{ label: 'OUTWARD', value: 'outward' }, { label: 'INWARD', value: 'inward' }] as const
const YEAR_HOVER_FADE_EASING_OPTIONS = [
  { label: 'LINEAR', value: 'linear' },
  { label: 'EASE', value: 'ease' },
  { label: 'EASE IN', value: 'ease-in' },
  { label: 'EASE OUT', value: 'ease-out' },
  { label: 'EASE IN OUT', value: 'ease-in-out' },
] as const
const COLOR_MODE_OPTIONS = [
  { label: 'DERIVE FROM BACKGROUND', value: 'deriveFromBackground' },
  { label: 'MANUAL', value: 'manual' },
] as const

export const CHRONOLOGY_TIMELINE_FIELDS = [
  { kind: 'boolean', key: 'enabled', label: 'Show chronology', description: 'Group articles on a dated vertical timeline.' },
  { kind: 'boolean', key: 'showMonths', label: 'Show months', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled },
  {
    kind: 'enum', key: 'yearColorMode', label: 'Year · Color source',
    description: 'Derive from background (default): resolve the track/dot color from the real background, same mechanism and modulation knobs as the chip\'s own "Derive from background" mode. Manual: a literal, authored color instead.',
    options: COLOR_MODE_OPTIONS,
    visibleWhen: (config: ChronologyTimelineConfig) => config.enabled,
  } as const,
  { kind: 'color', key: 'yearManualColor', label: 'Year · Manual color', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.yearColorMode === 'manual' } as const,
  { kind: 'number', key: 'yearDarkInkSaturation', label: 'Year · Dark ink saturation', min: 0, max: 2, step: 0.01, description: 'Same background-derived ink saturation as Polymorphic layout: 0 neutral, 1 sampled, 2 amplified.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.yearColorMode === 'deriveFromBackground' },
  { kind: 'number', key: 'yearDarkInkOpacityMultiplier', label: 'Year · Dark ink opacity', min: 0.2, max: 1, step: 0.01, description: 'Softens the shared background-derived ink while retaining readable date contrast.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.yearColorMode === 'deriveFromBackground' },
  { kind: 'number', key: 'yearLightInkTolerance', label: 'Year · Light ink tolerance', min: 0, max: 20, step: 0.1, unit: 'ratio', description: 'Shared bounded contrast tolerance when light ink is preferred.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.yearColorMode === 'deriveFromBackground' },
  { kind: 'number', key: 'yearMinContrastRatio', label: 'Year · Target contrast ratio', min: 1, max: 21, step: 0.1, description: 'The WCAG ratio the derived track/dot color is resolved for.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.yearColorMode === 'deriveFromBackground' },
  {
    kind: 'enum', key: 'monthColorMode', label: 'Month · Color source',
    description: 'Same as Year · Color source, independent for month.',
    options: COLOR_MODE_OPTIONS,
    visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.showMonths,
  } as const,
  { kind: 'color', key: 'monthManualColor', label: 'Month · Manual color', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.showMonths && config.monthColorMode === 'manual' } as const,
  { kind: 'number', key: 'monthDarkInkSaturation', label: 'Month · Dark ink saturation', min: 0, max: 2, step: 0.01, description: 'Same background-derived ink saturation as Polymorphic layout: 0 neutral, 1 sampled, 2 amplified.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.showMonths && config.monthColorMode === 'deriveFromBackground' },
  { kind: 'number', key: 'monthDarkInkOpacityMultiplier', label: 'Month · Dark ink opacity', min: 0.2, max: 1, step: 0.01, description: 'Softens the shared background-derived ink while retaining readable date contrast.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.showMonths && config.monthColorMode === 'deriveFromBackground' },
  { kind: 'number', key: 'monthLightInkTolerance', label: 'Month · Light ink tolerance', min: 0, max: 20, step: 0.1, unit: 'ratio', description: 'Shared bounded contrast tolerance when light ink is preferred.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.showMonths && config.monthColorMode === 'deriveFromBackground' },
  { kind: 'number', key: 'monthMinContrastRatio', label: 'Month · Target contrast ratio', min: 1, max: 21, step: 0.1, description: 'The WCAG ratio the derived track/dot color is resolved for.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.showMonths && config.monthColorMode === 'deriveFromBackground' },
  tailwindField('fontFamily', { key: 'yearFontFamily', label: 'Year font family', visibleWhen: config => config.enabled }),
  tailwindField('fontWeight', { key: 'yearFontWeight', label: 'Year weight', visibleWhen: config => config.enabled }),
  { kind: 'number', key: 'yearDotSize', label: 'Year dot size', min: 4, max: 24, step: 1, visibleWhen: (config: ChronologyTimelineConfig) => config.enabled },
  tailwindField('fontFamily', { key: 'monthFontFamily', label: 'Month font family', visibleWhen: config => config.enabled && config.showMonths }),
  tailwindField('fontWeight', { key: 'monthFontWeight', label: 'Month weight', visibleWhen: config => config.enabled && config.showMonths }),
  { kind: 'number', key: 'monthDotSize', label: 'Month dot size', min: 3, max: 18, step: 1, visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.showMonths },
  { kind: 'boolean', key: 'yearHoverFadeEnabled', label: 'Fade other years on hover', description: 'Hovering a year container dims every other year.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled },
  { kind: 'boolean', key: 'yearHoverFadeTouchEnabled', label: 'Fade on touch (scroll-driven)', description: 'Opt-in: on touch devices (no hover), approximate it by dimming based on which year is nearest the top of the viewport once the visitor starts scrolling. Off by default — this approximation did not read well in testing.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.yearHoverFadeEnabled },
  { kind: 'number', key: 'yearHoverFadeOpacity', label: 'Faded opacity · text', min: 0.1, max: 1, step: 0.01, description: 'Opacity applied to the label and articles of every year except the hovered/active one.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.yearHoverFadeEnabled },
  { kind: 'number', key: 'yearHoverFadeDotOpacity', label: 'Faded opacity · dot', min: 0.1, max: 1, step: 0.01, description: 'Dots stay fully opaque (so the rail line behind them never shows through) and instead blend toward a solid, lighter color at this strength.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.yearHoverFadeEnabled },
  { kind: 'number', key: 'yearHoverFadeDurationMs', label: 'Fade duration', min: 0, max: 2000, step: 10, unit: 'ms', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.yearHoverFadeEnabled },
  { kind: 'number', key: 'yearHoverFadeDelayMs', label: 'Fade delay', min: 0, max: 1000, step: 10, unit: 'ms', description: 'Pause before the other years start fading out, so a brief hover does not flicker.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.yearHoverFadeEnabled },
  { kind: 'enum', key: 'yearHoverFadeEasing', label: 'Fade easing', options: YEAR_HOVER_FADE_EASING_OPTIONS, visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.yearHoverFadeEnabled },
  { kind: 'boolean', key: 'yearStickyEnabled', label: 'Pin year while scrolling its months', description: 'Tablet and desktop only. The year label stays fixed near the top of the viewport while its own months scroll past, releasing the instant its last month passes so the next year takes its place.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.showMonths },
  { kind: 'tabs', tabs: [
    { id: 'mobile', label: 'MOBILE (< 768px)', fields: [
      { kind: 'number', key: 'contentGap', label: 'Content gap', min: 2, max: 20, step: 0.25, unit: 'rem', description: 'Space between the dated rail and the article content.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled },
      { kind: 'number', key: 'trackWidth', label: 'Track width', min: 0.25, max: 8, step: 0.25, unit: 'px', description: 'Thickness of the dated rail line.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled },
      { kind: 'number', key: 'trackOpacity', label: 'Track opacity', min: 0, max: 1, step: 0.01, description: 'Opacity of the dated rail line itself, independent of the hover-fade opacity.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled },
      { kind: 'group', label: 'Year', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled, fields: [
        { kind: 'enum', key: 'yearPlacement', label: 'Placement', options: PLACEMENT_OPTIONS },
        tailwindField('fontSize', { key: 'yearFontSize', label: 'Font size' }),
        tailwindField('paddingX', { key: 'yearPaddingX', label: 'Text padding · rail edge', description: 'Padding between the label and the rail: applied as padding-right when Placement is outward, padding-left when Placement is inward.' }),
        tailwindField('paddingY', { key: 'yearPaddingY', label: 'Text padding · vertical' }),
      ] },
      { kind: 'group', label: 'Month', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.showMonths, fields: [
        { kind: 'enum', key: 'monthPlacement', label: 'Placement', options: PLACEMENT_OPTIONS },
        { kind: 'enum', key: 'monthNameFormat', label: 'Month name', options: MONTH_NAME_OPTIONS },
        tailwindField('fontSize', { key: 'monthFontSize', label: 'Font size' }),
        tailwindField('paddingX', { key: 'monthPaddingX', label: 'Text padding · rail edge', description: 'Padding between the label and the rail: applied as padding-right when Placement is outward, padding-left when Placement is inward.' }),
        tailwindField('paddingY', { key: 'monthPaddingY', label: 'Text padding · vertical' }),
      ] },
      { kind: 'group', label: 'Month · Article group padding', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.showMonths, fields: [
        tailwindField('paddingTop', { key: 'monthPaddingTop', label: 'Padding top', description: 'Padding around the group of articles under this month — not the month label itself.' }),
        tailwindField('paddingRight', { key: 'monthPaddingRight', label: 'Padding right' }),
        tailwindField('paddingBottom', { key: 'monthPaddingBottom', label: 'Padding bottom' }),
        tailwindField('paddingLeft', { key: 'monthPaddingLeft', label: 'Padding left' }),
      ] },
    ] },
    { id: 'tablet', label: 'TABLET (≥ 768px)', fields: [
      { kind: 'number', key: 'contentGapMd', label: 'Content gap', min: 2, max: 24, step: 0.25, unit: 'rem', description: 'Space between the dated rail and the article content.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled },
      { kind: 'number', key: 'trackWidthMd', label: 'Track width', min: 0.25, max: 8, step: 0.25, unit: 'px', description: 'Thickness of the dated rail line.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled },
      { kind: 'number', key: 'trackOpacityMd', label: 'Track opacity', min: 0, max: 1, step: 0.01, description: 'Opacity of the dated rail line itself, independent of the hover-fade opacity.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled },
      { kind: 'group', label: 'Year', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled, fields: [
        { kind: 'enum', key: 'yearPlacementMd', label: 'Placement', options: PLACEMENT_OPTIONS },
        tailwindField('fontSize', { breakpoint: 'md', key: 'yearFontSizeMd', label: 'Font size' }),
        tailwindField('paddingX', { breakpoint: 'md', key: 'yearPaddingXMd', label: 'Text padding · rail edge', description: 'Padding between the label and the rail: applied as padding-right when Placement is outward, padding-left when Placement is inward.' }),
        tailwindField('paddingY', { breakpoint: 'md', key: 'yearPaddingYMd', label: 'Text padding · vertical' }),
      ] },
      { kind: 'group', label: 'Month', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.showMonths, fields: [
        { kind: 'enum', key: 'monthPlacementMd', label: 'Placement', options: PLACEMENT_OPTIONS },
        { kind: 'enum', key: 'monthNameFormatMd', label: 'Month name', options: MONTH_NAME_OPTIONS },
        tailwindField('fontSize', { breakpoint: 'md', key: 'monthFontSizeMd', label: 'Font size' }),
        tailwindField('paddingX', { breakpoint: 'md', key: 'monthPaddingXMd', label: 'Text padding · rail edge', description: 'Padding between the label and the rail: applied as padding-right when Placement is outward, padding-left when Placement is inward.' }),
        tailwindField('paddingY', { breakpoint: 'md', key: 'monthPaddingYMd', label: 'Text padding · vertical' }),
      ] },
      { kind: 'group', label: 'Month · Article group padding', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.showMonths, fields: [
        tailwindField('paddingTop', { breakpoint: 'md', key: 'monthPaddingTopMd', label: 'Padding top', description: 'Padding around the group of articles under this month — not the month label itself.' }),
        tailwindField('paddingRight', { breakpoint: 'md', key: 'monthPaddingRightMd', label: 'Padding right' }),
        tailwindField('paddingBottom', { breakpoint: 'md', key: 'monthPaddingBottomMd', label: 'Padding bottom' }),
        tailwindField('paddingLeft', { breakpoint: 'md', key: 'monthPaddingLeftMd', label: 'Padding left' }),
      ] },
    ] },
    { id: 'desktop', label: 'DESKTOP (≥ 1024px)', fields: [
      { kind: 'number', key: 'contentGapLg', label: 'Content gap', min: 2, max: 24, step: 0.25, unit: 'rem', description: 'Space between the dated rail and the article content.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled },
      { kind: 'number', key: 'trackWidthLg', label: 'Track width', min: 0.25, max: 8, step: 0.25, unit: 'px', description: 'Thickness of the dated rail line.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled },
      { kind: 'number', key: 'trackOpacityLg', label: 'Track opacity', min: 0, max: 1, step: 0.01, description: 'Opacity of the dated rail line itself, independent of the hover-fade opacity.', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled },
      { kind: 'group', label: 'Year', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled, fields: [
        { kind: 'enum', key: 'yearPlacementLg', label: 'Placement', options: PLACEMENT_OPTIONS },
        tailwindField('fontSize', { breakpoint: 'lg', key: 'yearFontSizeLg', label: 'Font size' }),
        tailwindField('paddingX', { breakpoint: 'lg', key: 'yearPaddingXLg', label: 'Text padding · rail edge', description: 'Padding between the label and the rail: applied as padding-right when Placement is outward, padding-left when Placement is inward.' }),
        tailwindField('paddingY', { breakpoint: 'lg', key: 'yearPaddingYLg', label: 'Text padding · vertical' }),
      ] },
      { kind: 'group', label: 'Month', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.showMonths, fields: [
        { kind: 'enum', key: 'monthPlacementLg', label: 'Placement', options: PLACEMENT_OPTIONS },
        { kind: 'enum', key: 'monthNameFormatLg', label: 'Month name', options: MONTH_NAME_OPTIONS },
        tailwindField('fontSize', { breakpoint: 'lg', key: 'monthFontSizeLg', label: 'Font size' }),
        tailwindField('paddingX', { breakpoint: 'lg', key: 'monthPaddingXLg', label: 'Text padding · rail edge', description: 'Padding between the label and the rail: applied as padding-right when Placement is outward, padding-left when Placement is inward.' }),
        tailwindField('paddingY', { breakpoint: 'lg', key: 'monthPaddingYLg', label: 'Text padding · vertical' }),
      ] },
      { kind: 'group', label: 'Month · Article group padding', visibleWhen: (config: ChronologyTimelineConfig) => config.enabled && config.showMonths, fields: [
        tailwindField('paddingTop', { breakpoint: 'lg', key: 'monthPaddingTopLg', label: 'Padding top', description: 'Padding around the group of articles under this month — not the month label itself.' }),
        tailwindField('paddingRight', { breakpoint: 'lg', key: 'monthPaddingRightLg', label: 'Padding right' }),
        tailwindField('paddingBottom', { breakpoint: 'lg', key: 'monthPaddingBottomLg', label: 'Padding bottom' }),
        tailwindField('paddingLeft', { breakpoint: 'lg', key: 'monthPaddingLeftLg', label: 'Padding left' }),
      ] },
    ] },
  ] },
] as const
