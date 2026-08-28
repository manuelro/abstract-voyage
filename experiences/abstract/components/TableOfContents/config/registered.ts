import {
  GAP_OPTIONS,
  MARGIN_LEFT_OPTIONS,
  MARGIN_TOP_OPTIONS,
  PADDING_LEFT_OPTIONS,
  PADDING_X_OPTIONS,
  PADDING_Y_OPTIONS,
  MIN_HEIGHT_OPTIONS,
  tailwindSpacingTokenToPx,
  type GapClass,
  type MarginLeftClass,
  type MarginTopClass,
  type MinHeightClass,
  type PaddingLeftClass,
  type PaddingXClass,
  type PaddingYClass,
} from '../../../../../components/tailwindSpacingScale'
import {
  FONT_WEIGHT_OPTIONS,
  FONT_SIZE_OPTIONS,
  LEADING_OPTIONS,
  MAX_WIDTH_OPTIONS,
  TRACKING_OPTIONS,
  type FontWeightClass,
  type FontSizeClass,
  type LeadingClass,
  type MaxWidthClass,
  type TrackingClass,
} from '../../../../../components/tailwindTypographyScale'
import type { CtaButtonMotionEasing } from '../../../../../components/CtaButton/config/registered'
import type { MarkdownContentFontFamily, MarkdownContentTextColorMode } from '../../MarkdownContent/config/registered'

/** `resting` preserves the base link recipe while letting hover/current
 * states change only their contrast target or background treatment. */
export type TableOfContentsStateTextColorMode = 'resting' | MarkdownContentTextColorMode
export type TableOfContentsStateBackgroundMode = 'transparent' | 'derived' | 'custom'

export type TableOfContentsConfig = {
  stickyBreathingGap: MarginTopClass
  maxWidth: MaxWidthClass
  labelFontFamily: MarkdownContentFontFamily
  labelFontSize: FontSizeClass
  labelTracking: TrackingClass
  labelUppercase: boolean
  labelIndent: PaddingLeftClass
  labelTextColorMode: MarkdownContentTextColorMode
  labelTextColor: string
  labelTextMinContrast: number
  labelTextOriginalHueRetention: number
  labelTextHueShiftDegrees: number
  labelTextPigmentIntensity: number
  itemFontFamily: MarkdownContentFontFamily
  itemFontSize: FontSizeClass
  itemLeading: LeadingClass
  itemPaddingX: PaddingXClass
  itemPaddingY: PaddingYClass
  itemIndent: MarginLeftClass
  itemGap: GapClass
  coarsePointerMinHeight: MinHeightClass
  groupMarginTop: MarginTopClass
  textColorMode: MarkdownContentTextColorMode
  textColor: string
  textMinContrast: number
  originalHueRetention: number
  hueShiftDegrees: number
  pigmentIntensity: number
  hoverStateEnabled: boolean
  hoverTextColorMode: TableOfContentsStateTextColorMode
  hoverTextColor: string
  hoverTextMinContrast: number
  hoverTextOriginalHueRetention: number
  hoverTextHueShiftDegrees: number
  hoverTextPigmentIntensity: number
  hoverBackgroundMode: TableOfContentsStateBackgroundMode
  hoverBackgroundColor: string
  hoverBackgroundDarkSurfaceLightenAmount: number
  hoverBackgroundLightSurfaceDarkenAmount: number
  hoverBackgroundOriginalHueRetention: number
  hoverBackgroundHueShiftDegrees: number
  hoverBackgroundPigmentIntensity: number
  hoverBackgroundOpacity: number
  motionEnabled: boolean
  hoverEnterDurationMs: number
  hoverEnterEasing: CtaButtonMotionEasing
  hoverExitHoldMs: number
  hoverExitDelayMs: number
  hoverExitDurationMs: number
  hoverExitEasing: CtaButtonMotionEasing
  hoverExitDamping: number
  hoverStateOverlapMs: number
  hoverExitInitialOpacity: number
  activeSectionTrackingEnabled: boolean
  activeSectionTrackingOffset: MarginTopClass
  activeSectionTrackingSettleMs: number
  activeEnterDurationMs: number
  activeEnterEasing: CtaButtonMotionEasing
  activeTransitionOverlapMs: number
  activeExitDelayMs: number
  activeExitDurationMs: number
  activeExitEasing: CtaButtonMotionEasing
  activeExitOpacity: number
  colorTransitionRatio: number
  activeTextColorMode: TableOfContentsStateTextColorMode
  activeTextColor: string
  activeTextMinContrast: number
  activeTextOriginalHueRetention: number
  activeTextHueShiftDegrees: number
  activeTextPigmentIntensity: number
  activeBackgroundMode: TableOfContentsStateBackgroundMode
  activeBackgroundColor: string
  activeBackgroundDarkSurfaceLightenAmount: number
  activeBackgroundLightSurfaceDarkenAmount: number
  activeBackgroundOriginalHueRetention: number
  activeBackgroundHueShiftDegrees: number
  activeBackgroundPigmentIntensity: number
  activeBackgroundOpacity: number
  activeFontWeightEnabled: boolean
  activeFontWeight: FontWeightClass
  activeIndicatorEnabled: boolean
  activeIndicatorWidth: 'border-l' | 'border-l-2' | 'border-l-4' | 'border-l-8'
  /** Below the layout's own split breakpoint (see PostLabPageLayoutConfig's
   * narrowColumnWidthTierMd/Lg), the ToC renders as a native <details>
   * disclosure — this starts it collapsed. At and above that breakpoint the
   * disclosure toggle is hidden and the ToC is always expanded, regardless
   * of this field. */
  collapsedByDefaultWhenStacked: boolean
  /** Starts the disclosure open, instead of collapsed, when the page loads
   * with a URL hash pointing at one of the ToC's own headings/figures. */
  autoExpandOnActiveSection: boolean
}

export const DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG = {
  stickyBreathingGap: 'mt-0',
  maxWidth: 'max-w-xs',
  labelFontFamily: 'font-serif',
  labelFontSize: 'text-xs',
  labelTracking: 'tracking-widest',
  labelUppercase: true,
  labelIndent: 'pl-0',
  labelTextColorMode: 'column',
  labelTextColor: '#f5f5f5',
  labelTextMinContrast: 7.5,
  labelTextOriginalHueRetention: 0.3,
  labelTextHueShiftDegrees: 0,
  labelTextPigmentIntensity: 0.72,
  itemFontFamily: 'font-sans',
  itemFontSize: 'text-xs',
  itemLeading: 'leading-relaxed',
  itemPaddingX: 'px-3',
  itemPaddingY: 'py-2.5',
  itemIndent: 'ml-3',
  itemGap: 'gap-0',
  coarsePointerMinHeight: 'min-h-11',
  groupMarginTop: 'mt-5',
  textColorMode: 'column',
  textColor: '#f5f5f5',
  textMinContrast: 3.2,
  originalHueRetention: 0.23,
  hueShiftDegrees: 0,
  pigmentIntensity: 0.72,
  hoverStateEnabled: true,
  hoverTextColorMode: 'column',
  hoverTextColor: '#f5f5f5',
  hoverTextMinContrast: 5.5,
  hoverTextOriginalHueRetention: 0.15,
  hoverTextHueShiftDegrees: 0,
  hoverTextPigmentIntensity: 1.59,
  hoverBackgroundMode: 'derived',
  hoverBackgroundColor: '#f5f5f5',
  hoverBackgroundDarkSurfaceLightenAmount: 0.55,
  hoverBackgroundLightSurfaceDarkenAmount: 0.04,
  hoverBackgroundOriginalHueRetention: 0.22,
  hoverBackgroundHueShiftDegrees: 0,
  hoverBackgroundPigmentIntensity: 1.65,
  hoverBackgroundOpacity: 0.35,
  motionEnabled: true,
  hoverEnterDurationMs: 540,
  hoverEnterEasing: 'viscous',
  hoverExitHoldMs: 50,
  hoverExitDelayMs: 40,
  hoverExitDurationMs: 280,
  hoverExitEasing: 'viscous',
  hoverExitDamping: 0.9,
  hoverStateOverlapMs: 20,
  hoverExitInitialOpacity: 0.05,
  activeSectionTrackingEnabled: true,
  activeSectionTrackingOffset: 'mt-4',
  activeSectionTrackingSettleMs: 140,
  activeEnterDurationMs: 500,
  activeEnterEasing: 'viscous',
  activeTransitionOverlapMs: 100,
  activeExitDelayMs: 110,
  activeExitDurationMs: 680,
  activeExitEasing: 'viscous',
  activeExitOpacity: 0.35,
  colorTransitionRatio: 0.55,
  activeTextColorMode: 'resting',
  activeTextColor: '#f5f5f5',
  activeTextMinContrast: 13.7,
  activeTextOriginalHueRetention: 0.25,
  activeTextHueShiftDegrees: 0,
  activeTextPigmentIntensity: 1.33,
  activeBackgroundMode: 'derived',
  activeBackgroundColor: '#f5f5f5',
  activeBackgroundDarkSurfaceLightenAmount: 0.74,
  activeBackgroundLightSurfaceDarkenAmount: 0.55,
  activeBackgroundOriginalHueRetention: 0.42,
  activeBackgroundHueShiftDegrees: 0,
  activeBackgroundPigmentIntensity: 1.86,
  activeBackgroundOpacity: 0.62,
  activeFontWeightEnabled: false,
  activeFontWeight: 'font-semibold',
  activeIndicatorEnabled: false,
  activeIndicatorWidth: 'border-l',
  collapsedByDefaultWhenStacked: true,
  autoExpandOnActiveSection: true,
} satisfies TableOfContentsConfig

const token = <T extends string>(value: string, allowed: readonly T[], fallback: T): T => (
  allowed.includes(value as T) ? value as T : fallback
)
const values = <T extends readonly { readonly value: string }[]>(options: T): readonly T[number]['value'][] => (
  options.map(option => option.value) as readonly T[number]['value'][]
)
const clamp = (value: number, min: number, max: number, fallback: number) => (
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback))
)
const family = (value: string, fallback: MarkdownContentFontFamily): MarkdownContentFontFamily => (
  value === 'font-serif' || value === 'serif' ? 'font-serif'
    : value === 'font-sans' || value === 'sans' ? 'font-sans'
      : value === 'inherit' ? 'inherit' : fallback
)
const colorMode = (value: string): MarkdownContentTextColorMode => value === 'surface' || value === 'custom' ? value : 'column'
const stateTextColorMode = (value: string): TableOfContentsStateTextColorMode => (
  value === 'resting' ? 'resting' : colorMode(value)
)
const stateBackgroundMode = (value: string): TableOfContentsStateBackgroundMode => (
  value === 'derived' || value === 'custom' ? value : 'transparent'
)
const MOTION_EASINGS: readonly CtaButtonMotionEasing[] = [
  'linear', 'standard', 'expressive', 'viscous', 'gentle', 'gaussian',
]
const borderWidthValues = ['border-l', 'border-l-2', 'border-l-4', 'border-l-8'] as const

export function normalizePostLabArticleTocConfig(config: Partial<TableOfContentsConfig> | undefined): TableOfContentsConfig {
  const base = { ...DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG, ...(config ?? {}) }
  return {
    stickyBreathingGap: token(base.stickyBreathingGap, values(MARGIN_TOP_OPTIONS), DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.stickyBreathingGap),
    maxWidth: token(base.maxWidth, values(MAX_WIDTH_OPTIONS), DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.maxWidth),
    labelFontFamily: family(base.labelFontFamily, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.labelFontFamily),
    labelFontSize: token(base.labelFontSize, values(FONT_SIZE_OPTIONS), DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.labelFontSize),
    labelTracking: token(base.labelTracking, values(TRACKING_OPTIONS), DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.labelTracking),
    labelUppercase: base.labelUppercase !== false,
    labelIndent: token(base.labelIndent, values(PADDING_LEFT_OPTIONS), DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.labelIndent),
    labelTextColorMode: colorMode(base.labelTextColorMode),
    labelTextColor: typeof base.labelTextColor === 'string' && base.labelTextColor.trim() ? base.labelTextColor.trim() : DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.labelTextColor,
    labelTextMinContrast: clamp(base.labelTextMinContrast, 3, 21, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.labelTextMinContrast),
    labelTextOriginalHueRetention: clamp(base.labelTextOriginalHueRetention, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.labelTextOriginalHueRetention),
    labelTextHueShiftDegrees: clamp(base.labelTextHueShiftDegrees, -180, 180, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.labelTextHueShiftDegrees),
    labelTextPigmentIntensity: clamp(base.labelTextPigmentIntensity, 0, 2, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.labelTextPigmentIntensity),
    itemFontFamily: family(base.itemFontFamily, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.itemFontFamily),
    itemFontSize: token(base.itemFontSize, values(FONT_SIZE_OPTIONS), DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.itemFontSize),
    itemLeading: token(base.itemLeading, values(LEADING_OPTIONS), DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.itemLeading),
    itemPaddingX: token(base.itemPaddingX, values(PADDING_X_OPTIONS), DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.itemPaddingX),
    itemPaddingY: token(base.itemPaddingY, values(PADDING_Y_OPTIONS), DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.itemPaddingY),
    itemIndent: token(base.itemIndent, values(MARGIN_LEFT_OPTIONS), DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.itemIndent),
    itemGap: token(base.itemGap, values(GAP_OPTIONS), DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.itemGap),
    coarsePointerMinHeight: token(base.coarsePointerMinHeight, values(MIN_HEIGHT_OPTIONS), DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.coarsePointerMinHeight),
    groupMarginTop: token(base.groupMarginTop, values(MARGIN_TOP_OPTIONS), DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.groupMarginTop),
    textColorMode: colorMode(base.textColorMode),
    textColor: typeof base.textColor === 'string' && base.textColor.trim() ? base.textColor.trim() : DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.textColor,
    textMinContrast: clamp(base.textMinContrast, 3, 21, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.textMinContrast),
    originalHueRetention: clamp(base.originalHueRetention, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.originalHueRetention),
    hueShiftDegrees: clamp(base.hueShiftDegrees, -180, 180, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hueShiftDegrees),
    pigmentIntensity: clamp(base.pigmentIntensity, 0, 2, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.pigmentIntensity),
    hoverStateEnabled: base.hoverStateEnabled !== false,
    hoverTextColorMode: stateTextColorMode(base.hoverTextColorMode),
    hoverTextColor: typeof base.hoverTextColor === 'string' && base.hoverTextColor.trim() ? base.hoverTextColor.trim() : DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverTextColor,
    hoverTextMinContrast: clamp(base.hoverTextMinContrast, 3, 21, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverTextMinContrast),
    hoverTextOriginalHueRetention: clamp(base.hoverTextOriginalHueRetention, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverTextOriginalHueRetention),
    hoverTextHueShiftDegrees: clamp(base.hoverTextHueShiftDegrees, -180, 180, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverTextHueShiftDegrees),
    hoverTextPigmentIntensity: clamp(base.hoverTextPigmentIntensity, 0, 2, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverTextPigmentIntensity),
    hoverBackgroundMode: stateBackgroundMode(base.hoverBackgroundMode),
    hoverBackgroundColor: typeof base.hoverBackgroundColor === 'string' && base.hoverBackgroundColor.trim() ? base.hoverBackgroundColor.trim() : DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverBackgroundColor,
    hoverBackgroundDarkSurfaceLightenAmount: clamp(base.hoverBackgroundDarkSurfaceLightenAmount, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverBackgroundDarkSurfaceLightenAmount),
    hoverBackgroundLightSurfaceDarkenAmount: clamp(base.hoverBackgroundLightSurfaceDarkenAmount, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverBackgroundLightSurfaceDarkenAmount),
    hoverBackgroundOriginalHueRetention: clamp(base.hoverBackgroundOriginalHueRetention, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverBackgroundOriginalHueRetention),
    hoverBackgroundHueShiftDegrees: clamp(base.hoverBackgroundHueShiftDegrees, -180, 180, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverBackgroundHueShiftDegrees),
    hoverBackgroundPigmentIntensity: clamp(base.hoverBackgroundPigmentIntensity, 0, 2, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverBackgroundPigmentIntensity),
    hoverBackgroundOpacity: clamp(base.hoverBackgroundOpacity, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverBackgroundOpacity),
    motionEnabled: base.motionEnabled !== false,
    hoverEnterDurationMs: clamp(base.hoverEnterDurationMs, 0, 2000, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverEnterDurationMs),
    hoverEnterEasing: token(base.hoverEnterEasing, MOTION_EASINGS, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverEnterEasing),
    hoverExitHoldMs: clamp(base.hoverExitHoldMs, 0, 2000, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverExitHoldMs),
    hoverExitDelayMs: clamp(base.hoverExitDelayMs, 0, 2000, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverExitDelayMs),
    hoverExitDurationMs: clamp(base.hoverExitDurationMs, 0, 3000, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverExitDurationMs),
    hoverExitEasing: token(base.hoverExitEasing, MOTION_EASINGS, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverExitEasing),
    hoverExitDamping: clamp(base.hoverExitDamping, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverExitDamping),
    hoverStateOverlapMs: clamp(base.hoverStateOverlapMs, 0, 1000, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverStateOverlapMs),
    hoverExitInitialOpacity: clamp(base.hoverExitInitialOpacity, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverExitInitialOpacity),
    activeSectionTrackingEnabled: base.activeSectionTrackingEnabled !== false,
    activeSectionTrackingOffset: token(base.activeSectionTrackingOffset, values(MARGIN_TOP_OPTIONS), DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeSectionTrackingOffset),
    activeSectionTrackingSettleMs: clamp(base.activeSectionTrackingSettleMs, 0, 1000, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeSectionTrackingSettleMs),
    activeEnterDurationMs: clamp(base.activeEnterDurationMs, 0, 3000, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeEnterDurationMs),
    activeEnterEasing: token(base.activeEnterEasing, MOTION_EASINGS, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeEnterEasing),
    activeTransitionOverlapMs: clamp(base.activeTransitionOverlapMs, 0, 1000, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeTransitionOverlapMs),
    activeExitDelayMs: clamp(base.activeExitDelayMs, 0, 2000, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeExitDelayMs),
    activeExitDurationMs: clamp(base.activeExitDurationMs, 0, 3000, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeExitDurationMs),
    activeExitEasing: token(base.activeExitEasing, MOTION_EASINGS, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeExitEasing),
    activeExitOpacity: clamp(base.activeExitOpacity, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeExitOpacity),
    colorTransitionRatio: clamp(base.colorTransitionRatio, 0, 2, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.colorTransitionRatio),
    activeTextColorMode: stateTextColorMode(base.activeTextColorMode),
    activeTextColor: typeof base.activeTextColor === 'string' && base.activeTextColor.trim() ? base.activeTextColor.trim() : DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeTextColor,
    activeTextMinContrast: clamp(base.activeTextMinContrast, 3, 21, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeTextMinContrast),
    activeTextOriginalHueRetention: clamp(base.activeTextOriginalHueRetention, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeTextOriginalHueRetention),
    activeTextHueShiftDegrees: clamp(base.activeTextHueShiftDegrees, -180, 180, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeTextHueShiftDegrees),
    activeTextPigmentIntensity: clamp(base.activeTextPigmentIntensity, 0, 2, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeTextPigmentIntensity),
    activeBackgroundMode: stateBackgroundMode(base.activeBackgroundMode),
    activeBackgroundColor: typeof base.activeBackgroundColor === 'string' && base.activeBackgroundColor.trim() ? base.activeBackgroundColor.trim() : DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeBackgroundColor,
    activeBackgroundDarkSurfaceLightenAmount: clamp(base.activeBackgroundDarkSurfaceLightenAmount, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeBackgroundDarkSurfaceLightenAmount),
    activeBackgroundLightSurfaceDarkenAmount: clamp(base.activeBackgroundLightSurfaceDarkenAmount, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeBackgroundLightSurfaceDarkenAmount),
    activeBackgroundOriginalHueRetention: clamp(base.activeBackgroundOriginalHueRetention, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeBackgroundOriginalHueRetention),
    activeBackgroundHueShiftDegrees: clamp(base.activeBackgroundHueShiftDegrees, -180, 180, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeBackgroundHueShiftDegrees),
    activeBackgroundPigmentIntensity: clamp(base.activeBackgroundPigmentIntensity, 0, 2, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeBackgroundPigmentIntensity),
    activeBackgroundOpacity: clamp(base.activeBackgroundOpacity, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeBackgroundOpacity),
    activeFontWeightEnabled: base.activeFontWeightEnabled !== false,
    activeFontWeight: token(base.activeFontWeight, values(FONT_WEIGHT_OPTIONS), DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeFontWeight),
    activeIndicatorEnabled: base.activeIndicatorEnabled === true,
    activeIndicatorWidth: token(base.activeIndicatorWidth, borderWidthValues, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.activeIndicatorWidth),
    collapsedByDefaultWhenStacked: base.collapsedByDefaultWhenStacked !== false,
    autoExpandOnActiveSection: base.autoExpandOnActiveSection !== false,
  }
}

/** The sticky header is measured in pixels at runtime; the operator-facing
 * additive gap remains a literal Tailwind token and is resolved here only for
 * that arithmetic. */
export function resolvePostLabTocStickyGapPx(config: TableOfContentsConfig) {
  return tailwindSpacingTokenToPx(config.stickyBreathingGap, 0)
}

/** The current-section line begins below the measured fixed header and uses
 * this literal Tailwind spacing token as its additional reading offset. */
export function resolvePostLabTocActiveTrackingOffsetPx(config: TableOfContentsConfig) {
  return tailwindSpacingTokenToPx(config.activeSectionTrackingOffset, 0)
}
