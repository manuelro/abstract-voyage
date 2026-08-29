import { defineConfigScope } from '../../../../../components/Panel/config'
import {
  GAP_OPTIONS,
  MARGIN_LEFT_OPTIONS,
  MARGIN_TOP_OPTIONS,
  MIN_HEIGHT_OPTIONS,
  PADDING_LEFT_OPTIONS,
  PADDING_X_OPTIONS,
  PADDING_Y_OPTIONS,
} from '../../../../../components/tailwindSpacingScale'
import {
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  LEADING_OPTIONS,
  MAX_WIDTH_OPTIONS,
  TRACKING_OPTIONS,
} from '../../../../../components/tailwindTypographyScale'
import { DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG, type TableOfContentsConfig } from './registered'

const colorModes = [
  { label: 'COLUMN', value: 'column' },
  { label: 'SURFACE', value: 'surface' },
  { label: 'CUSTOM', value: 'custom' },
] as const
const stateTextColorModes = [
  { label: 'RESTING', value: 'resting' },
  ...colorModes,
] as const
const stateBackgroundModes = [
  { label: 'TRANSPARENT', value: 'transparent' },
  { label: 'DERIVED', value: 'derived' },
  { label: 'CUSTOM', value: 'custom' },
] as const
const markerWidths = [
  { label: 'border-l', value: 'border-l' },
  { label: 'border-l-2', value: 'border-l-2' },
  { label: 'border-l-4', value: 'border-l-4' },
  { label: 'border-l-8', value: 'border-l-8' },
] as const
const motionEasingOptions = [
  { label: 'STANDARD', value: 'standard' },
  { label: 'EXPRESSIVE', value: 'expressive' },
  { label: 'VISCOUS', value: 'viscous' },
  { label: 'GENTLE', value: 'gentle' },
  { label: 'GAUSSIAN', value: 'gaussian' },
] as const

export const POST_LAB_ARTICLE_TOC_SCOPE_ID = 'PostLabArticle/toc' as const

export const POST_LAB_ARTICLE_TOC_PANEL = defineConfigScope<TableOfContentsConfig>({
  id: POST_LAB_ARTICLE_TOC_SCOPE_ID,
  component: 'PostLabArticle',
  scope: 'toc',
  title: 'Article table of contents',
  createdAt: '2026-08-11',
  defaultOpen: false,
  summary: 'Sticky navigation · column-aware color states · layered hover settling and current-section motion',
  defaultValue: DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG,
  fields: [
    {
      kind: 'group',
      label: 'Small-viewport disclosure',
      fields: [
        { kind: 'boolean', key: 'collapsedByDefaultWhenStacked', label: 'Collapse by default when stacked', description: 'Below the layout\'s own split breakpoint (Posts lab page layout → narrow column width), the ToC becomes a collapsible native disclosure. Always expanded above that breakpoint regardless of this field.' },
        { kind: 'boolean', key: 'autoExpandOnActiveSection', label: 'Auto-expand for deep links', description: 'Starts expanded (instead of collapsed) when the page loads with a URL hash pointing at one of the ToC\'s own headings or figures.', visibleWhen: config => config.collapsedByDefaultWhenStacked },
      ],
    },
    {
      kind: 'group',
      label: 'Sticky containment',
      fields: [
        { kind: 'select', key: 'stickyBreathingGap', label: 'Header breathing gap', description: 'Tailwind spacing token added to the live measured header height.', options: MARGIN_TOP_OPTIONS },
        { kind: 'select', key: 'maxWidth', label: 'TOC measure', options: MAX_WIDTH_OPTIONS },
        { kind: 'select', key: 'groupMarginTop', label: 'Heading to figures gap', options: MARGIN_TOP_OPTIONS },
      ],
    },
    {
      kind: 'group',
      label: 'Typography and targets',
      fields: [
        { kind: 'enum', key: 'labelFontFamily', label: 'Label family', options: FONT_FAMILY_OPTIONS },
        { kind: 'enum', key: 'labelFontSize', label: 'Label size', options: FONT_SIZE_OPTIONS.slice(0, 4) },
        { kind: 'enum', key: 'labelTracking', label: 'Label tracking', options: TRACKING_OPTIONS },
        { kind: 'boolean', key: 'labelUppercase', label: 'Label uppercase' },
        { kind: 'select', key: 'labelIndent', label: 'Label left indent', options: PADDING_LEFT_OPTIONS },
        { kind: 'enum', key: 'itemFontFamily', label: 'Item family', options: FONT_FAMILY_OPTIONS },
        { kind: 'enum', key: 'itemFontSize', label: 'Item size', options: FONT_SIZE_OPTIONS.slice(0, 5) },
        { kind: 'enum', key: 'itemLeading', label: 'Item line height', options: LEADING_OPTIONS },
        { kind: 'select', key: 'itemPaddingX', label: 'Item inline padding', options: PADDING_X_OPTIONS },
        { kind: 'select', key: 'itemPaddingY', label: 'Item block padding', options: PADDING_Y_OPTIONS },
        { kind: 'select', key: 'itemIndent', label: 'Item left indent', options: MARGIN_LEFT_OPTIONS },
        { kind: 'select', key: 'itemGap', label: 'Item gap', options: GAP_OPTIONS },
        { kind: 'enum', key: 'coarsePointerMinHeight', label: 'Touch target minimum', options: MIN_HEIGHT_OPTIONS },
      ],
    },
    {
      kind: 'group',
      label: 'Section label ink',
      fields: [
        { kind: 'enum', key: 'labelTextColorMode', label: 'Label text source', options: colorModes },
        { kind: 'color', key: 'labelTextColor', label: 'Custom label text color', visibleWhen: config => config.labelTextColorMode === 'custom' },
        { kind: 'number', key: 'labelTextMinContrast', label: 'Label contrast', description: 'Minimum contrast against the actual ToC column background, independent of current-section styling.', min: 3, max: 21, step: 0.1 },
        { kind: 'number', key: 'labelTextOriginalHueRetention', label: 'Label hue retention', min: 0, max: 1, step: 0.01 },
        { kind: 'number', key: 'labelTextHueShiftDegrees', label: 'Label hue shift', min: -180, max: 180, step: 1, unit: '°', integer: true },
        { kind: 'number', key: 'labelTextPigmentIntensity', label: 'Label pigment intensity', min: 0, max: 2, step: 0.01 },
      ],
    },
    {
      kind: 'group',
      label: 'Resting link ink',
      fields: [
        { kind: 'enum', key: 'textColorMode', label: 'Text source', options: colorModes },
        { kind: 'color', key: 'textColor', label: 'Custom text color', visibleWhen: config => config.textColorMode === 'custom' },
        { kind: 'number', key: 'textMinContrast', label: 'Link contrast', description: 'Minimum contrast against the actual ToC column background.', min: 3, max: 21, step: 0.1 },
        { kind: 'number', key: 'originalHueRetention', label: 'Original hue retention', min: 0, max: 1, step: 0.01 },
        { kind: 'number', key: 'hueShiftDegrees', label: 'Hue shift', min: -180, max: 180, step: 1, unit: '°', integer: true },
        { kind: 'number', key: 'pigmentIntensity', label: 'Text pigment intensity', min: 0, max: 2, step: 0.01 },
      ],
    },
    {
      kind: 'group',
      label: 'Hover and keyboard focus',
      fields: [
        { kind: 'boolean', key: 'hoverStateEnabled', label: 'Enable hover/focus state' },
        { kind: 'enum', key: 'hoverTextColorMode', label: 'Text source', options: stateTextColorModes, visibleWhen: config => config.hoverStateEnabled },
        { kind: 'color', key: 'hoverTextColor', label: 'Custom text color', visibleWhen: config => config.hoverStateEnabled && config.hoverTextColorMode === 'custom' },
        { kind: 'number', key: 'hoverTextMinContrast', label: 'Text contrast', min: 3, max: 21, step: 0.1, visibleWhen: config => config.hoverStateEnabled },
        { kind: 'number', key: 'hoverTextOriginalHueRetention', label: 'Text hue retention', min: 0, max: 1, step: 0.01, visibleWhen: config => config.hoverStateEnabled },
        { kind: 'number', key: 'hoverTextHueShiftDegrees', label: 'Text hue shift', min: -180, max: 180, step: 1, unit: '°', integer: true, visibleWhen: config => config.hoverStateEnabled },
        { kind: 'number', key: 'hoverTextPigmentIntensity', label: 'Text pigment intensity', min: 0, max: 2, step: 0.01, visibleWhen: config => config.hoverStateEnabled },
        { kind: 'enum', key: 'hoverBackgroundMode', label: 'Background source', options: stateBackgroundModes, visibleWhen: config => config.hoverStateEnabled },
        { kind: 'color', key: 'hoverBackgroundColor', label: 'Custom background color', visibleWhen: config => config.hoverStateEnabled && config.hoverBackgroundMode === 'custom' },
        { kind: 'number', key: 'hoverBackgroundDarkSurfaceLightenAmount', label: 'Dark column lighten', description: 'Derived hover background lift when the ToC column is dark.', min: 0, max: 1, step: 0.01, visibleWhen: config => config.hoverStateEnabled && config.hoverBackgroundMode === 'derived' },
        { kind: 'number', key: 'hoverBackgroundLightSurfaceDarkenAmount', label: 'Light column darken', description: 'Derived hover background shade when the ToC column is light.', min: 0, max: 1, step: 0.01, visibleWhen: config => config.hoverStateEnabled && config.hoverBackgroundMode === 'derived' },
        { kind: 'number', key: 'hoverBackgroundOriginalHueRetention', label: 'Background hue retention', min: 0, max: 1, step: 0.01, visibleWhen: config => config.hoverStateEnabled && config.hoverBackgroundMode === 'derived' },
        { kind: 'number', key: 'hoverBackgroundHueShiftDegrees', label: 'Background hue shift', min: -180, max: 180, step: 1, unit: '°', integer: true, visibleWhen: config => config.hoverStateEnabled && config.hoverBackgroundMode === 'derived' },
        { kind: 'number', key: 'hoverBackgroundPigmentIntensity', label: 'Background pigment intensity', min: 0, max: 2, step: 0.01, visibleWhen: config => config.hoverStateEnabled && config.hoverBackgroundMode === 'derived' },
        { kind: 'number', key: 'hoverBackgroundOpacity', label: 'Background opacity', min: 0, max: 1, step: 0.01, visibleWhen: config => config.hoverStateEnabled && config.hoverBackgroundMode !== 'transparent' },
      ],
    },
    {
      kind: 'group',
      label: 'Interaction motion',
      fields: [
        { kind: 'boolean', key: 'motionEnabled', label: 'Enable state motion' },
        { kind: 'number', key: 'hoverEnterDurationMs', label: 'Hover arrival duration', min: 0, max: 2000, step: 10, unit: 'ms', integer: true, visibleWhen: config => config.motionEnabled },
        { kind: 'enum', key: 'hoverEnterEasing', label: 'Hover arrival easing', options: motionEasingOptions, visibleWhen: config => config.motionEnabled },
        { kind: 'number', key: 'hoverExitHoldMs', label: 'Hover exit hold', description: 'Keeps the outgoing hover state briefly visible before it begins to settle.', min: 0, max: 2000, step: 10, unit: 'ms', integer: true, visibleWhen: config => config.motionEnabled },
        { kind: 'number', key: 'hoverExitDelayMs', label: 'Hover exit delay', description: 'Additional delay before the outgoing hover fades into its residual state.', min: 0, max: 2000, step: 10, unit: 'ms', integer: true, visibleWhen: config => config.motionEnabled },
        { kind: 'number', key: 'hoverStateOverlapMs', label: 'Hover handoff overlap', description: 'Crossfade period where an incoming hover and one outgoing hover coexist.', min: 0, max: 1000, step: 10, unit: 'ms', integer: true, visibleWhen: config => config.motionEnabled },
        { kind: 'number', key: 'hoverExitInitialOpacity', label: 'Hover residual opacity', min: 0, max: 1, step: 0.01, visibleWhen: config => config.motionEnabled },
        { kind: 'number', key: 'hoverExitDamping', label: 'Hover exit damping', description: 'Scales the outgoing hover fill before its final, gentle release.', min: 0, max: 1, step: 0.01, visibleWhen: config => config.motionEnabled },
        { kind: 'number', key: 'hoverExitDurationMs', label: 'Hover settling duration', min: 0, max: 3000, step: 10, unit: 'ms', integer: true, visibleWhen: config => config.motionEnabled },
        { kind: 'enum', key: 'hoverExitEasing', label: 'Hover settling easing', options: motionEasingOptions, visibleWhen: config => config.motionEnabled },
        { kind: 'number', key: 'activeEnterDurationMs', label: 'Current-section arrival duration', min: 0, max: 3000, step: 10, unit: 'ms', integer: true, visibleWhen: config => config.motionEnabled },
        { kind: 'enum', key: 'activeEnterEasing', label: 'Current-section arrival easing', options: motionEasingOptions, visibleWhen: config => config.motionEnabled },
        { kind: 'number', key: 'activeTransitionOverlapMs', label: 'Current-section overlap', description: 'Brief visual handoff from the previous current section to the next one.', min: 0, max: 1000, step: 10, unit: 'ms', integer: true, visibleWhen: config => config.motionEnabled },
        { kind: 'number', key: 'activeExitDelayMs', label: 'Current-section exit delay', min: 0, max: 2000, step: 10, unit: 'ms', integer: true, visibleWhen: config => config.motionEnabled },
        { kind: 'number', key: 'activeExitOpacity', label: 'Current-section residual opacity', min: 0, max: 1, step: 0.01, visibleWhen: config => config.motionEnabled },
        { kind: 'number', key: 'activeExitDurationMs', label: 'Current-section settling duration', min: 0, max: 3000, step: 10, unit: 'ms', integer: true, visibleWhen: config => config.motionEnabled },
        { kind: 'enum', key: 'activeExitEasing', label: 'Current-section settling easing', options: motionEasingOptions, visibleWhen: config => config.motionEnabled },
        { kind: 'number', key: 'colorTransitionRatio', label: 'Color-to-fill timing ratio', description: 'Scales text and marker timing relative to background-fill timing.', min: 0, max: 2, step: 0.01, visibleWhen: config => config.motionEnabled },
      ],
    },
    {
      kind: 'group',
      label: 'Current section',
      fields: [
        { kind: 'boolean', key: 'activeSectionTrackingEnabled', label: 'Track current section' },
        { kind: 'select', key: 'activeSectionTrackingOffset', label: 'Current-section line offset', description: 'Tailwind spacing token added below the measured fixed header for both navigation and current-section selection.', options: MARGIN_TOP_OPTIONS, visibleWhen: config => config.activeSectionTrackingEnabled },
        { kind: 'number', key: 'activeSectionTrackingSettleMs', label: 'Scroll settle delay', description: 'Waits for scrolling to become idle before ordinary scroll tracking selects the current section. Explicit ToC navigation commits its requested destination after layout settles.', min: 0, max: 1000, step: 10, unit: 'ms', integer: true, visibleWhen: config => config.activeSectionTrackingEnabled },
        { kind: 'enum', key: 'activeTextColorMode', label: 'Text source', options: stateTextColorModes, visibleWhen: config => config.activeSectionTrackingEnabled },
        { kind: 'color', key: 'activeTextColor', label: 'Custom text color', visibleWhen: config => config.activeSectionTrackingEnabled && config.activeTextColorMode === 'custom' },
        { kind: 'number', key: 'activeTextMinContrast', label: 'Text contrast', min: 3, max: 21, step: 0.1, visibleWhen: config => config.activeSectionTrackingEnabled },
        { kind: 'number', key: 'activeTextOriginalHueRetention', label: 'Text hue retention', min: 0, max: 1, step: 0.01, visibleWhen: config => config.activeSectionTrackingEnabled },
        { kind: 'number', key: 'activeTextHueShiftDegrees', label: 'Text hue shift', min: -180, max: 180, step: 1, unit: '°', integer: true, visibleWhen: config => config.activeSectionTrackingEnabled },
        { kind: 'number', key: 'activeTextPigmentIntensity', label: 'Text pigment intensity', min: 0, max: 2, step: 0.01, visibleWhen: config => config.activeSectionTrackingEnabled },
        { kind: 'enum', key: 'activeBackgroundMode', label: 'Background source', options: stateBackgroundModes, visibleWhen: config => config.activeSectionTrackingEnabled },
        { kind: 'color', key: 'activeBackgroundColor', label: 'Custom background color', visibleWhen: config => config.activeSectionTrackingEnabled && config.activeBackgroundMode === 'custom' },
        { kind: 'number', key: 'activeBackgroundDarkSurfaceLightenAmount', label: 'Dark column lighten', min: 0, max: 1, step: 0.01, visibleWhen: config => config.activeSectionTrackingEnabled && config.activeBackgroundMode === 'derived' },
        { kind: 'number', key: 'activeBackgroundLightSurfaceDarkenAmount', label: 'Light column darken', min: 0, max: 1, step: 0.01, visibleWhen: config => config.activeSectionTrackingEnabled && config.activeBackgroundMode === 'derived' },
        { kind: 'number', key: 'activeBackgroundOriginalHueRetention', label: 'Background hue retention', min: 0, max: 1, step: 0.01, visibleWhen: config => config.activeSectionTrackingEnabled && config.activeBackgroundMode === 'derived' },
        { kind: 'number', key: 'activeBackgroundHueShiftDegrees', label: 'Background hue shift', min: -180, max: 180, step: 1, unit: '°', integer: true, visibleWhen: config => config.activeSectionTrackingEnabled && config.activeBackgroundMode === 'derived' },
        { kind: 'number', key: 'activeBackgroundPigmentIntensity', label: 'Background pigment intensity', min: 0, max: 2, step: 0.01, visibleWhen: config => config.activeSectionTrackingEnabled && config.activeBackgroundMode === 'derived' },
        { kind: 'number', key: 'activeBackgroundOpacity', label: 'Background opacity', min: 0, max: 1, step: 0.01, visibleWhen: config => config.activeSectionTrackingEnabled && config.activeBackgroundMode !== 'transparent' },
        { kind: 'boolean', key: 'activeFontWeightEnabled', label: 'Emphasize current-section weight', visibleWhen: config => config.activeSectionTrackingEnabled },
        { kind: 'enum', key: 'activeFontWeight', label: 'Text weight', options: FONT_WEIGHT_OPTIONS, visibleWhen: config => config.activeSectionTrackingEnabled && config.activeFontWeightEnabled },
        { kind: 'boolean', key: 'activeIndicatorEnabled', label: 'Show active marker', visibleWhen: config => config.activeSectionTrackingEnabled },
        { kind: 'enum', key: 'activeIndicatorWidth', label: 'Active marker width', options: markerWidths, visibleWhen: config => config.activeSectionTrackingEnabled && config.activeIndicatorEnabled },
      ],
    },
  ],
  copy: {
    targetFile: 'experiences/abstract/components/TableOfContents/config/registered.ts',
    targetSymbol: 'DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG',
    targetType: 'TableOfContentsConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
})
