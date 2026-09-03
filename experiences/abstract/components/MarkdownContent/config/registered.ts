import {
  MARGIN_BOTTOM_OPTIONS,
  MARGIN_TOP_OPTIONS,
  MARGIN_Y_OPTIONS,
  PADDING_LEFT_OPTIONS,
  PADDING_OPTIONS,
  PADDING_Y_OPTIONS,
  type MarginBottomClass,
  type MarginTopClass,
  type MarginYClass,
  type PaddingLeftClass,
  type PaddingClass,
  type PaddingYClass,
} from '../../../../../components/tailwindSpacingScale'
import {
  BORDER_LEFT_WIDTH_OPTIONS,
  type FontFamilyClass,
  FONT_SIZE_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  LEADING_OPTIONS,
  MAX_WIDTH_OPTIONS,
  MD_FONT_SIZE_OPTIONS,
  RADIUS_OPTIONS,
  TRACKING_OPTIONS,
  type BorderLeftWidthClass,
  type FontSizeClass,
  type FontWeightClass,
  type LeadingClass,
  type MaxWidthClass,
  type MdFontSizeClass,
  type RadiusClass,
  type TrackingClass,
} from '../../../../../components/tailwindTypographyScale'

export type MarkdownContentFontFamily = FontFamilyClass
export type MarkdownContentTextColorMode = 'column' | 'surface' | 'custom'
export type MarkdownContentCodeSurfaceMode = 'derived-dark' | 'derived-light' | 'custom'
export type MarkdownContentStrongColorMode = 'inherit' | 'custom'

/** Every structural or typographic dimension uses a literal Tailwind token.
 * Numeric controls remain only where the browser or color engine needs a
 * continuous value rather than a discrete design-system choice. */
export type MarkdownContentConfig = {
  contentMaxWidth: MaxWidthClass
  mastheadToProseMarginTop: MarginTopClass
  metadataFontSize: FontSizeClass
  metadataLetterSpacingEm: number
  metadataUppercase: boolean
  metadataTitleMarginTop: MarginTopClass
  /** Opacity of the topic/date/read-time kicker line, independent of
   * mutedTextMinContrast's own contrast-locked derivation (mutedInk, also
   * used by the excerpt) — same withAlpha(baseColor, opacity) mechanism as
   * figureBorderOpacity/tableDividerOpacity below, reused here rather than
   * a new one. 1 (default, no change) reproduces today's existing
   * mutedInk-at-full-opacity look exactly. */
  metadataOpacity: number
  titleFontFamily: MarkdownContentFontFamily
  titleAllCaps: boolean
  titleFontSize: FontSizeClass
  titleFontSizeDesktop: MdFontSizeClass
  titleFontWeight: FontWeightClass
  titleLeading: LeadingClass
  titleMaxWidth: MaxWidthClass
  excerptVisible: boolean
  excerptFontFamily: MarkdownContentFontFamily
  excerptFontSize: FontSizeClass
  excerptFontSizeDesktop: MdFontSizeClass
  excerptLeading: LeadingClass
  excerptMarginTop: MarginTopClass
  bodyFontFamily: MarkdownContentFontFamily
  bodyFontSize: FontSizeClass
  bodyFontSizeDesktop: MdFontSizeClass
  bodyLeading: LeadingClass
  bodyTracking: TrackingClass
  paragraphMarginBottom: MarginBottomClass
  /** Governs `<strong>`/`**bold**` phrases within the article body. Distinct
   * from bodyText*'s own contrast-derived pigment controls — 'inherit' scales
   * the already-derived bodyInk by strongOpacity (matches today's plain-bold
   * look at opacity 1), 'custom' swaps in strongCustomColor as the base
   * before applying that same opacity. */
  strongColorMode: MarkdownContentStrongColorMode
  strongCustomColor: string
  strongOpacity: number
  strongFontWeight: FontWeightClass
  headingFontFamily: MarkdownContentFontFamily
  headingFontWeight: FontWeightClass
  headingLeading: LeadingClass
  h2FontSize: FontSizeClass
  h2FontSizeDesktop: MdFontSizeClass
  h3FontSize: FontSizeClass
  h3FontSizeDesktop: MdFontSizeClass
  h2MarginTop: MarginTopClass
  h2MarginBottom: MarginBottomClass
  h3MarginTop: MarginTopClass
  h3MarginBottom: MarginBottomClass
  bodyTextColorMode: MarkdownContentTextColorMode
  bodyTextColor: string
  bodyTextMinContrast: number
  bodyTextOriginalHueRetention: number
  bodyTextHueShiftDegrees: number
  bodyTextPigmentIntensity: number
  mutedTextMinContrast: number
  linkTextMinContrast: number
  linkPigmentIntensity: number
  richBlockMarginY: MarginYClass
  blockquotePaddingLeft: PaddingLeftClass
  blockquoteRuleWidth: BorderLeftWidthClass
  figureRadius: RadiusClass
  figureBorderOpacity: number
  captionFontFamily: MarkdownContentFontFamily
  captionFontSize: FontSizeClass
  tableFontFamily: MarkdownContentFontFamily
  tableFontSize: FontSizeClass
  tableLeading: LeadingClass
  tableRowPaddingY: PaddingYClass
  tableDividerOpacity: number
  codeSurfaceMode: MarkdownContentCodeSurfaceMode
  codeSurfaceColor: string
  codeTextMinContrast: number
  codeRadius: RadiusClass
  codePadding: PaddingClass
  codeFontSize: FontSizeClass
  codeLeading: LeadingClass
}

export const DEFAULT_POST_LAB_ARTICLE_CONFIG = {
  contentMaxWidth: 'max-w-xl',
  mastheadToProseMarginTop: 'mt-16',
  metadataFontSize: 'text-xs',
  metadataLetterSpacingEm: 0.11,
  metadataUppercase: true,
  metadataTitleMarginTop: 'mt-2.5',
  metadataOpacity: 0.6,
  titleFontFamily: 'font-serif',
  titleAllCaps: false,
  titleFontSize: 'text-4xl',
  titleFontSizeDesktop: 'md:text-5xl',
  titleFontWeight: 'font-medium',
  titleLeading: 'leading-none',
  titleMaxWidth: 'max-w-2xl',
  excerptVisible: false,
  excerptFontFamily: 'font-sans',
  excerptFontSize: 'text-lg',
  excerptFontSizeDesktop: 'md:text-xl',
  excerptLeading: 'leading-relaxed',
  excerptMarginTop: 'mt-4',
  bodyFontFamily: 'font-sans',
  bodyFontSize: 'text-sm',
  bodyFontSizeDesktop: 'md:text-base',
  bodyLeading: 'leading-relaxed',
  bodyTracking: 'tracking-normal',
  paragraphMarginBottom: 'mb-5',
  strongColorMode: 'inherit',
  strongCustomColor: '#1f2937',
  strongOpacity: 0.97,
  strongFontWeight: 'font-medium',
  headingFontFamily: 'font-serif',
  headingFontWeight: 'font-medium',
  headingLeading: 'leading-tight',
  h2FontSize: 'text-3xl',
  h2FontSizeDesktop: 'md:text-4xl',
  h3FontSize: 'text-xl',
  h3FontSizeDesktop: 'md:text-2xl',
  h2MarginTop: 'mt-14',
  h2MarginBottom: 'mb-3',
  h3MarginTop: 'mt-14',
  h3MarginBottom: 'mb-4',
  bodyTextColorMode: 'column',
  bodyTextColor: '#1f2937',
  bodyTextMinContrast: 3,
  bodyTextOriginalHueRetention: 0.42,
  bodyTextHueShiftDegrees: 0,
  bodyTextPigmentIntensity: 0.44,
  mutedTextMinContrast: 5.2,
  linkTextMinContrast: 8.9,
  linkPigmentIntensity: 0.44,
  richBlockMarginY: 'my-10',
  blockquotePaddingLeft: 'pl-5',
  blockquoteRuleWidth: 'border-l-8',
  figureRadius: 'rounded-lg',
  figureBorderOpacity: 0.15,
  captionFontFamily: 'font-sans',
  captionFontSize: 'text-xs',
  tableFontFamily: 'font-sans',
  tableFontSize: 'text-sm',
  tableLeading: 'leading-relaxed',
  tableRowPaddingY: 'py-3',
  tableDividerOpacity: 0.14,
  codeSurfaceMode: 'derived-dark',
  codeSurfaceColor: '#d8d9ea',
  codeTextMinContrast: 3,
  codeRadius: 'rounded-lg',
  codePadding: 'p-3.5',
  codeFontSize: 'text-xs',
  codeLeading: 'leading-relaxed',
} satisfies MarkdownContentConfig

const token = <T extends string>(value: string, values: readonly T[], fallback: T): T => (
  values.includes(value as T) ? value as T : fallback
)
const values = <T extends readonly { readonly value: string }[]>(options: T): readonly T[number]['value'][] => (
  options.map(option => option.value) as readonly T[number]['value'][]
)
const clamp = (value: number, min: number, max: number, fallback: number) => (
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback))
)
const color = (value: string, fallback: string) => typeof value === 'string' && value.trim() ? value.trim() : fallback
const family = (value: string, fallback: MarkdownContentFontFamily): MarkdownContentFontFamily => (
  value === 'font-serif' || value === 'serif' ? 'font-serif'
    : value === 'font-sans' || value === 'sans' ? 'font-sans'
      : value === 'inherit' ? 'inherit' : fallback
)
const textColorMode = (value: string): MarkdownContentTextColorMode => value === 'surface' || value === 'custom' ? value : 'column'
const strongColorMode = (value: string): MarkdownContentStrongColorMode => value === 'custom' ? value : 'inherit'
const codeSurfaceMode = (value: string): MarkdownContentCodeSurfaceMode => value === 'derived-light' || value === 'custom' ? value : 'derived-dark'

export function normalizePostLabArticleConfig(config: Partial<MarkdownContentConfig> | undefined): MarkdownContentConfig {
  const base = { ...DEFAULT_POST_LAB_ARTICLE_CONFIG, ...(config ?? {}) }
  return {
    contentMaxWidth: token(base.contentMaxWidth, values(MAX_WIDTH_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.contentMaxWidth),
    mastheadToProseMarginTop: token(base.mastheadToProseMarginTop, values(MARGIN_TOP_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.mastheadToProseMarginTop),
    metadataFontSize: token(base.metadataFontSize, values(FONT_SIZE_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.metadataFontSize),
    metadataLetterSpacingEm: clamp(base.metadataLetterSpacingEm, 0, 0.24, DEFAULT_POST_LAB_ARTICLE_CONFIG.metadataLetterSpacingEm),
    metadataUppercase: base.metadataUppercase !== false,
    metadataTitleMarginTop: token(base.metadataTitleMarginTop, values(MARGIN_TOP_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.metadataTitleMarginTop),
    metadataOpacity: clamp(base.metadataOpacity, 0, 1, DEFAULT_POST_LAB_ARTICLE_CONFIG.metadataOpacity),
    titleFontFamily: family(base.titleFontFamily, DEFAULT_POST_LAB_ARTICLE_CONFIG.titleFontFamily),
    titleAllCaps: base.titleAllCaps === true,
    titleFontSize: token(base.titleFontSize, values(FONT_SIZE_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.titleFontSize),
    titleFontSizeDesktop: token(base.titleFontSizeDesktop, values(MD_FONT_SIZE_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.titleFontSizeDesktop),
    titleFontWeight: token(base.titleFontWeight, values(FONT_WEIGHT_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.titleFontWeight),
    titleLeading: token(base.titleLeading, values(LEADING_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.titleLeading),
    titleMaxWidth: token(base.titleMaxWidth, values(MAX_WIDTH_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.titleMaxWidth),
    excerptVisible: base.excerptVisible !== false,
    excerptFontFamily: family(base.excerptFontFamily, DEFAULT_POST_LAB_ARTICLE_CONFIG.excerptFontFamily),
    excerptFontSize: token(base.excerptFontSize, values(FONT_SIZE_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.excerptFontSize),
    excerptFontSizeDesktop: token(base.excerptFontSizeDesktop, values(MD_FONT_SIZE_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.excerptFontSizeDesktop),
    excerptLeading: token(base.excerptLeading, values(LEADING_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.excerptLeading),
    excerptMarginTop: token(base.excerptMarginTop, values(MARGIN_TOP_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.excerptMarginTop),
    bodyFontFamily: family(base.bodyFontFamily, DEFAULT_POST_LAB_ARTICLE_CONFIG.bodyFontFamily),
    bodyFontSize: token(base.bodyFontSize, values(FONT_SIZE_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.bodyFontSize),
    bodyFontSizeDesktop: token(base.bodyFontSizeDesktop, values(MD_FONT_SIZE_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.bodyFontSizeDesktop),
    bodyLeading: token(base.bodyLeading, values(LEADING_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.bodyLeading),
    bodyTracking: token(base.bodyTracking, values(TRACKING_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.bodyTracking),
    paragraphMarginBottom: token(base.paragraphMarginBottom, values(MARGIN_BOTTOM_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.paragraphMarginBottom),
    strongColorMode: strongColorMode(base.strongColorMode),
    strongCustomColor: color(base.strongCustomColor, DEFAULT_POST_LAB_ARTICLE_CONFIG.strongCustomColor),
    strongOpacity: clamp(base.strongOpacity, 0, 1, DEFAULT_POST_LAB_ARTICLE_CONFIG.strongOpacity),
    strongFontWeight: token(base.strongFontWeight, values(FONT_WEIGHT_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.strongFontWeight),
    headingFontFamily: family(base.headingFontFamily, DEFAULT_POST_LAB_ARTICLE_CONFIG.headingFontFamily),
    headingFontWeight: token(base.headingFontWeight, values(FONT_WEIGHT_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.headingFontWeight),
    headingLeading: token(base.headingLeading, values(LEADING_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.headingLeading),
    h2FontSize: token(base.h2FontSize, values(FONT_SIZE_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.h2FontSize),
    h2FontSizeDesktop: token(base.h2FontSizeDesktop, values(MD_FONT_SIZE_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.h2FontSizeDesktop),
    h3FontSize: token(base.h3FontSize, values(FONT_SIZE_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.h3FontSize),
    h3FontSizeDesktop: token(base.h3FontSizeDesktop, values(MD_FONT_SIZE_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.h3FontSizeDesktop),
    h2MarginTop: token(base.h2MarginTop, values(MARGIN_TOP_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.h2MarginTop),
    h2MarginBottom: token(base.h2MarginBottom, values(MARGIN_BOTTOM_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.h2MarginBottom),
    h3MarginTop: token(base.h3MarginTop, values(MARGIN_TOP_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.h3MarginTop),
    h3MarginBottom: token(base.h3MarginBottom, values(MARGIN_BOTTOM_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.h3MarginBottom),
    bodyTextColorMode: textColorMode(base.bodyTextColorMode), bodyTextColor: color(base.bodyTextColor, DEFAULT_POST_LAB_ARTICLE_CONFIG.bodyTextColor),
    bodyTextMinContrast: clamp(base.bodyTextMinContrast, 3, 21, DEFAULT_POST_LAB_ARTICLE_CONFIG.bodyTextMinContrast),
    bodyTextOriginalHueRetention: clamp(base.bodyTextOriginalHueRetention, 0, 1, DEFAULT_POST_LAB_ARTICLE_CONFIG.bodyTextOriginalHueRetention),
    bodyTextHueShiftDegrees: clamp(base.bodyTextHueShiftDegrees, -180, 180, DEFAULT_POST_LAB_ARTICLE_CONFIG.bodyTextHueShiftDegrees),
    bodyTextPigmentIntensity: clamp(base.bodyTextPigmentIntensity, 0, 2, DEFAULT_POST_LAB_ARTICLE_CONFIG.bodyTextPigmentIntensity),
    mutedTextMinContrast: clamp(base.mutedTextMinContrast, 3, 21, DEFAULT_POST_LAB_ARTICLE_CONFIG.mutedTextMinContrast),
    linkTextMinContrast: clamp(base.linkTextMinContrast, 3, 21, DEFAULT_POST_LAB_ARTICLE_CONFIG.linkTextMinContrast),
    linkPigmentIntensity: clamp(base.linkPigmentIntensity, 0, 2, DEFAULT_POST_LAB_ARTICLE_CONFIG.linkPigmentIntensity),
    richBlockMarginY: token(base.richBlockMarginY, values(MARGIN_Y_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.richBlockMarginY),
    blockquotePaddingLeft: token(base.blockquotePaddingLeft, values(PADDING_LEFT_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.blockquotePaddingLeft),
    blockquoteRuleWidth: token(base.blockquoteRuleWidth, values(BORDER_LEFT_WIDTH_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.blockquoteRuleWidth),
    figureRadius: token(base.figureRadius, values(RADIUS_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.figureRadius),
    figureBorderOpacity: clamp(base.figureBorderOpacity, 0, 1, DEFAULT_POST_LAB_ARTICLE_CONFIG.figureBorderOpacity),
    captionFontFamily: family(base.captionFontFamily, DEFAULT_POST_LAB_ARTICLE_CONFIG.captionFontFamily),
    captionFontSize: token(base.captionFontSize, values(FONT_SIZE_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.captionFontSize),
    tableFontFamily: family(base.tableFontFamily, DEFAULT_POST_LAB_ARTICLE_CONFIG.tableFontFamily),
    tableFontSize: token(base.tableFontSize, values(FONT_SIZE_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.tableFontSize),
    tableLeading: token(base.tableLeading, values(LEADING_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.tableLeading),
    tableRowPaddingY: token(base.tableRowPaddingY, values(PADDING_Y_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.tableRowPaddingY),
    tableDividerOpacity: clamp(base.tableDividerOpacity, 0, 1, DEFAULT_POST_LAB_ARTICLE_CONFIG.tableDividerOpacity),
    codeSurfaceMode: codeSurfaceMode(base.codeSurfaceMode), codeSurfaceColor: color(base.codeSurfaceColor, DEFAULT_POST_LAB_ARTICLE_CONFIG.codeSurfaceColor),
    codeTextMinContrast: clamp(base.codeTextMinContrast, 3, 21, DEFAULT_POST_LAB_ARTICLE_CONFIG.codeTextMinContrast),
    codeRadius: token(base.codeRadius, values(RADIUS_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.codeRadius),
    codePadding: token(base.codePadding, values(PADDING_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.codePadding),
    codeFontSize: token(base.codeFontSize, values(FONT_SIZE_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.codeFontSize),
    codeLeading: token(base.codeLeading, values(LEADING_OPTIONS), DEFAULT_POST_LAB_ARTICLE_CONFIG.codeLeading),
  }
}
