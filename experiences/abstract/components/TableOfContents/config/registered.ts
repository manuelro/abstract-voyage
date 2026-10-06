import {
  MARGIN_LEFT_OPTIONS,
  MARGIN_TOP_OPTIONS,
  PADDING_LEFT_OPTIONS,
  PADDING_X_OPTIONS,
  PADDING_Y_OPTIONS,
  MIN_HEIGHT_OPTIONS,
  tailwindSpacingTokenToPx,
  type MarginLeftClass,
  type MarginTopClass,
  type MinHeightClass,
  type PaddingLeftClass,
  type PaddingXClass,
  type PaddingYClass,
} from '../../../../../components/tailwindSpacingScale'
import {
  normalizeTailwindToken,
  tailwindTokenCssValue,
  type TailwindTokenValue,
} from '../../../../../components/Panel/config/tailwindFields'
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
 * states change only their contrast target or background treatment. This is
 * the preferred state source: one configured ToC ink remains the visual
 * identity of every item, while each state is re-resolved for contrast
 * against its own derived or custom surface. */
export type TableOfContentsStateTextColorMode = 'resting' | MarkdownContentTextColorMode
export type TableOfContentsStateBackgroundMode = 'transparent' | 'derived' | 'custom'

export type TableOfContentsConfig = {
  /** Responsive visibility. Each tier controls only its own viewport range. */
  visibleBase: boolean
  visibleSm: boolean
  visibleMd: boolean
  visibleLg: boolean
  visibleXl: boolean
  visibleXxl: boolean
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
  /** Visual separation between rows. It is painted inside contiguous row hit
   * targets, so moving the pointer through the gap immediately enters the
   * adjacent item instead of passing through an uninteractive dead zone. */
  itemGap: TailwindTokenValue<'gap'>
  coarsePointerMinHeight: MinHeightClass
  groupMarginTop: MarginTopClass
  /**
   * The single ink source for ToC items. Hover and current-section states
   * default to `resting`, so this is passed through their contrast recipes
   * instead of silently switching to a second, column-derived color.
   */
  textColorMode: MarkdownContentTextColorMode
  textColor: string
  textMinContrast: number
  originalHueRetention: number
  hueShiftDegrees: number
  pigmentIntensity: number
  /** Resting (inactive) item fill. Hover and current-section fills remain
   * independent below, so each interaction state has its own recipe. */
  defaultBackgroundMode: TableOfContentsStateBackgroundMode
  defaultBackgroundColor: string
  defaultBackgroundDarkSurfaceLightenAmount: number
  defaultBackgroundLightSurfaceDarkenAmount: number
  defaultBackgroundOriginalHueRetention: number
  defaultBackgroundHueShiftDegrees: number
  defaultBackgroundPigmentIntensity: number
  defaultBackgroundOpacity: number
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
  hoverEnterDelayMs: number
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
  visibleBase: false,
  visibleSm: false,
  visibleMd: false,
  visibleLg: true,
  visibleXl: true,
  visibleXxl: true,
  stickyBreathingGap: 'mt-0',
  maxWidth: 'max-w-xs',
  labelFontFamily: 'font-serif',
  labelFontSize: 'text-xs',
  labelTracking: 'tracking-widest',
  labelUppercase: true,
  labelIndent: 'pl-0',
  labelTextColorMode: 'column',
  labelTextColor: '#f5f5f5',
  labelTextMinContrast: 14.5,
  labelTextOriginalHueRetention: 0.26,
  labelTextHueShiftDegrees: 0,
  labelTextPigmentIntensity: 1.72,
  itemFontFamily: 'font-sans',
  itemFontSize: 'text-xs',
  itemLeading: 'leading-relaxed',
  itemPaddingX: 'px-3',
  itemPaddingY: 'py-2.5',
  itemIndent: 'ml-3',
  itemGap: 'gap-1',
  coarsePointerMinHeight: 'min-h-11',
  groupMarginTop: 'mt-5',
  textColorMode: 'column',
  textColor: '#f5f5f5',
  textMinContrast: 13.9,
  originalHueRetention: 0.67,
  hueShiftDegrees: 0,
  pigmentIntensity: 1.22,
  // The inactive default starts transparent, but retains a complete,
  // independently configurable fill recipe rather than borrowing hover.
  defaultBackgroundMode: 'transparent',
  defaultBackgroundColor: '#402626',
  defaultBackgroundDarkSurfaceLightenAmount: 0,
  defaultBackgroundLightSurfaceDarkenAmount: 0,
  defaultBackgroundOriginalHueRetention: 1,
  defaultBackgroundHueShiftDegrees: 0,
  defaultBackgroundPigmentIntensity: 1,
  defaultBackgroundOpacity: 0,
  hoverStateEnabled: true,
  // Keep hover coupled to the same base ink as resting/current items. The
  // hover recipe below still resolves it against the lifted hover surface,
  // preserving contrast without introducing a second visual color.
  hoverTextColorMode: 'resting',
  hoverTextColor: '#f5f5f5',
  hoverTextMinContrast: 7.8,
  hoverTextOriginalHueRetention: 0.3,
  hoverTextHueShiftDegrees: 20,
  hoverTextPigmentIntensity: 1.15,
  hoverBackgroundMode: 'derived',
  hoverBackgroundColor: '#ffffff',
  hoverBackgroundDarkSurfaceLightenAmount: 0.37,
  hoverBackgroundLightSurfaceDarkenAmount: 0.23,
  hoverBackgroundOriginalHueRetention: 0.41,
  hoverBackgroundHueShiftDegrees: 0,
  hoverBackgroundPigmentIntensity: 1.21,
  hoverBackgroundOpacity: 0.23,
  motionEnabled: true,
  hoverEnterDelayMs: 50,
  hoverEnterDurationMs: 70,
  hoverEnterEasing: 'gentle',
  hoverExitHoldMs: 40,
  hoverExitDelayMs: 40,
  hoverExitDurationMs: 90,
  hoverExitEasing: 'gentle',
  hoverExitDamping: 0.9,
  hoverStateOverlapMs: 0,
  hoverExitInitialOpacity: 0.11,
  activeSectionTrackingEnabled: true,
  activeSectionTrackingOffset: 'mt-4',
  activeSectionTrackingSettleMs: 140,
  activeEnterDurationMs: 500,
  activeEnterEasing: 'gentle',
  activeTransitionOverlapMs: 100,
  activeExitDelayMs: 110,
  activeExitDurationMs: 680,
  activeExitEasing: 'gentle',
  activeExitOpacity: 0.35,
  colorTransitionRatio: 0.55,
  activeTextColorMode: 'resting',
  activeTextColor: '#f5f5f5',
  activeTextMinContrast: 3,
  activeTextOriginalHueRetention: 0.26,
  activeTextHueShiftDegrees: 0,
  activeTextPigmentIntensity: 1.49,
  activeBackgroundMode: 'derived',
  activeBackgroundColor: '#f5f5f5',
  activeBackgroundDarkSurfaceLightenAmount: 0.74,
  activeBackgroundLightSurfaceDarkenAmount: 0.31,
  activeBackgroundOriginalHueRetention: 0.54,
  activeBackgroundHueShiftDegrees: 0,
  activeBackgroundPigmentIntensity: 1.09,
  activeBackgroundOpacity: 0.37,
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
    visibleBase: base.visibleBase !== false,
    visibleSm: base.visibleSm !== false,
    visibleMd: base.visibleMd !== false,
    visibleLg: base.visibleLg !== false,
    visibleXl: base.visibleXl !== false,
    visibleXxl: base.visibleXxl !== false,
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
    itemGap: normalizeTailwindToken({ utility: 'gap', breakpoint: 'base', value: base.itemGap, fallback: DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.itemGap }),
    coarsePointerMinHeight: token(base.coarsePointerMinHeight, values(MIN_HEIGHT_OPTIONS), DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.coarsePointerMinHeight),
    groupMarginTop: token(base.groupMarginTop, values(MARGIN_TOP_OPTIONS), DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.groupMarginTop),
    textColorMode: colorMode(base.textColorMode),
    textColor: typeof base.textColor === 'string' && base.textColor.trim() ? base.textColor.trim() : DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.textColor,
    textMinContrast: clamp(base.textMinContrast, 3, 21, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.textMinContrast),
    originalHueRetention: clamp(base.originalHueRetention, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.originalHueRetention),
    hueShiftDegrees: clamp(base.hueShiftDegrees, -180, 180, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hueShiftDegrees),
    pigmentIntensity: clamp(base.pigmentIntensity, 0, 2, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.pigmentIntensity),
    defaultBackgroundMode: stateBackgroundMode(base.defaultBackgroundMode),
    defaultBackgroundColor: typeof base.defaultBackgroundColor === 'string' && base.defaultBackgroundColor.trim() ? base.defaultBackgroundColor.trim() : DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.defaultBackgroundColor,
    defaultBackgroundDarkSurfaceLightenAmount: clamp(base.defaultBackgroundDarkSurfaceLightenAmount, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.defaultBackgroundDarkSurfaceLightenAmount),
    defaultBackgroundLightSurfaceDarkenAmount: clamp(base.defaultBackgroundLightSurfaceDarkenAmount, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.defaultBackgroundLightSurfaceDarkenAmount),
    defaultBackgroundOriginalHueRetention: clamp(base.defaultBackgroundOriginalHueRetention, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.defaultBackgroundOriginalHueRetention),
    defaultBackgroundHueShiftDegrees: clamp(base.defaultBackgroundHueShiftDegrees, -180, 180, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.defaultBackgroundHueShiftDegrees),
    defaultBackgroundPigmentIntensity: clamp(base.defaultBackgroundPigmentIntensity, 0, 2, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.defaultBackgroundPigmentIntensity),
    defaultBackgroundOpacity: clamp(base.defaultBackgroundOpacity, 0, 1, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.defaultBackgroundOpacity),
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
    hoverEnterDelayMs: clamp(base.hoverEnterDelayMs, 0, 2000, DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG.hoverEnterDelayMs),
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

/** Literal utility choices keep every responsive display class visible to Tailwind's scanner. */
export function resolvePostLabTocDisplayClasses(config: TableOfContentsConfig): string {
  return [
    config.visibleBase ? 'block' : 'hidden',
    config.visibleSm ? 'sm:block' : 'sm:hidden',
    config.visibleMd ? 'md:block' : 'md:hidden',
    config.visibleLg ? 'lg:block' : 'lg:hidden',
    config.visibleXl ? 'xl:block' : 'xl:hidden',
    config.visibleXxl ? '2xl:block' : '2xl:hidden',
  ].join(' ')
}

/** When a split-layout ToC is hidden, let the reading column use both tracks. */
export function resolvePostLabTocReadingSpanClasses(config: TableOfContentsConfig): string {
  return [
    config.visibleMd ? 'md:col-span-1' : 'md:col-span-full',
    config.visibleLg ? 'lg:col-span-1' : 'lg:col-span-full',
    config.visibleXl ? 'xl:col-span-1' : 'xl:col-span-full',
    config.visibleXxl ? '2xl:col-span-1' : '2xl:col-span-full',
  ].join(' ')
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

/** The list's rows remain physically adjacent; this value only insets each
 * row's fill. This preserves a continuous pointer path between item targets. */
export function resolvePostLabTocItemVisualGapCss(config: TableOfContentsConfig) {
  return tailwindTokenCssValue('gap', 'base', config.itemGap)
}
