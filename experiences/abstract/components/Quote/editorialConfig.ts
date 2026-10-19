import { normalizeTailwindToken, type TailwindTokenValue } from '../../../../components/Panel/config/tailwindFields';
import {
  DEFAULT_QUOTE_CONFIG, FEATURE_QUOTE_CONFIG, PASSAGE_QUOTE_CONFIG, STATEMENT_QUOTE_CONFIG,
  deriveQuoteTextColor, generateQuotePalette, normalizeQuoteConfig, QUOTE_PALETTE_SIZE, type QuoteConfig,
} from './config';

export type EditorialVariant = 'featured' | 'plain' | 'solid' | 'practice';
export const EDITORIAL_VARIANTS: EditorialVariant[] = ['featured', 'plain', 'solid', 'practice'];

/**
 * An editorial quote type is a specialization of the base Quote: it
 * inherits every QuoteConfig capability in full (typography, padding, palette,
 * BOTH gradient render modes, elevation, cast shadow, hologram, ...) and adds the
 * editorial surface + source-furniture fields below. It does NOT re-declare or
 * strip any base capability.
 *
 * The heading/link LOOK AND FEEL is NOT here -- it lives once in quotePartsConfig
 * (shared across all types). Only the per-type concerns remain: whether the
 * heading/link is shown, where it sits, its alignment, and its label/content.
 */
export type EditorialQuoteConfig = QuoteConfig & {
  headingEnabled: boolean;
  headingShowTitle: boolean;
  headingShowPeriod: boolean;
  headingPlacement: 'before' | 'after' | 'inside-top' | 'inside-bottom';
  linkEnabled: boolean;
  linkLabel: string;
  linkPlacement: 'before' | 'after' | 'inside-top' | 'inside-bottom';
  linkAlign: 'start' | 'center' | 'end';
  topRuleEnabled: boolean;
  topRuleWidth: TailwindTokenValue<'borderWidth'>;
  topRuleColor: string;
  topRuleOpacityPercent: number;
  backgroundMode: 'none' | 'solid' | 'palette' | 'gradient';
  solidBackgroundColor: string;
  solidTextColor: string;
  adaptiveTypeEnabled: boolean;
  adaptiveMinSize: TailwindTokenValue<'fontSize'>;
  adaptiveMaxLines: number;
};

const editorialDefaults: Omit<EditorialQuoteConfig, keyof QuoteConfig> = {
  headingEnabled: true, headingShowTitle: true, headingShowPeriod: true,
  headingPlacement: 'before',
  linkEnabled: true, linkLabel: 'Explore this chapter', linkPlacement: 'after', linkAlign: 'start',
  topRuleEnabled: true, topRuleWidth: 'border', topRuleColor: '#45627d', topRuleOpacityPercent: 24,
  backgroundMode: 'none', solidBackgroundColor: '#e5edf2', solidTextColor: '#31516f',
  adaptiveTypeEnabled: false, adaptiveMinSize: 'text-lg', adaptiveMaxLines: 8,
};
const editorialHeadingDefaults = {
  sourceHeadingFontSize: 'text-3xs',
  sourceHeadingTracking: 'tracking-widest',
  sourceHeadingTextTransform: 'uppercase',
  sourceHeadingOpacityPercent: 90,
  sourceHeadingContentGap: 'mb-0',
} as const;

export const FEATURED_EDITORIAL_QUOTE_CONFIG: EditorialQuoteConfig = {
    ...FEATURE_QUOTE_CONFIG, ...editorialDefaults, ...editorialHeadingDefaults, backgroundMode: 'gradient',
    headingEnabled: true, topRuleEnabled: false, textFontWeight: 'font-thin',
    gradientInkRenderMode: 'unified', gradientInkBorderEnabled: false,

    linkEnabled: false,
    markFontFamily: 'font-serif',
    gradientInkHologramEnabled: false,
    gradientInkHologramStrengthPercent: 107,
    gradientInkMeshDarkeningPercent: 0,
    gradientInkMeshSaturationPercent: 70,
    gradientInkMeshScale: 0.5,
    gradientInkSurfaceColor: '#444d7e',
    gradientInkTextColor: '#ffffff',
    gradientInkOverlayOpacityPercent: 100,

    showQuotationMarks: false,

    headingPlacement: 'inside-top',
    headingAlign: 'center',

    linkPlacement: 'inside-bottom',
    linkAlign: 'center',

    gradientInkCssAngleDegrees: 96,
    paddingTopLg: 'lg:pt-10',

    textFontFamily: 'font-sans',
    textWrap: 'balance',

    gradientInkBorderWidth: 'border',

    gradientInkBlendMode: 'multiply',

    textTransform: 'uppercase',

    leading: 'leading-tight',

    cardAspectRatioEnabled: true,
    geometryShape: 'landscape',

    sourceHeadingTopAligned: true,

    paddingTop: 'pt-9',

    gradientInkMeshLighteningPercent: 100,
    gradientInkMeshScaleX: 1.02,
    gradientInkMeshScaleY: 1.65,
    gradientInkTextOpacityPercent: 95,
    cardBlendEnabled: false,

    gradientInkSourceCard: '19',

    // cardBlendEnabled wraps this quote in a decorative parent whose own
    // backdrop blends behind the whole child (Quote.tsx's wrapsQuote path).
    // Without these, the parent falls back to DEFAULT_QUOTE_CONFIG's own
    // parent default -- a plain white solid fill -- which is a no-op under
    // the default 'multiply' cardBlendMode (white * anything = unchanged),
    // so the blend was wired on but invisible everywhere this variant is
    // used (wall's featured-role cards, quote-lab's own preview). A
    // distinct source card (not '19', the child's own) keeps the two
    // layers visibly different rather than doubling the same mesh.
    parentQuoteGradientInkEnabled: true,
    parentQuoteGradientInkSourceCard: '8',
    parentQuoteGradientInkMeshScaleX: 0.35,
    parentQuoteGradientInkMeshScaleY: 0.35,
    parentQuoteGradientInkOverlayOpacityPercent: 40,

    parentQuoteText: 'Abstract Voyage is where I follow the questions behind that work.',

    parentQuotePaddingTopLg: 'lg:pt-0',
    parentQuotePaddingRightLg: 'lg:pr-0',
    parentQuotePaddingBottomLg: 'lg:pb-0',
    parentQuotePaddingLeftLg: 'lg:pl-0',

    sourceHeadingFontSizeLg: 'lg:text-4xs',

    textSizeLg: 'lg:text-3xl',

    textSizeMd: 'md:text-2xl',

    textSize: 'text-xl',
};
export const PLAIN_EDITORIAL_QUOTE_CONFIG: EditorialQuoteConfig = {
    ...STATEMENT_QUOTE_CONFIG, ...editorialDefaults, ...editorialHeadingDefaults, headingEnabled: true,
    backgroundMode: 'none', paletteBackgroundEnabled: false, gradientInkEnabled: false, showQuotationMarks: false,

    gradientInkRenderMode: 'unified',

    headingPlacement: 'inside-top',

    headingAlign: 'center',

    linkPlacement: 'inside-bottom',
    linkAlign: 'center',

    topRuleOpacityPercent: 100,

    textFontFamily: 'font-serif',

    linkEnabled: false,

    topRuleColor: '#aed1d5',

    topRuleEnabled: true,

    textTransform: 'normal-case',

    sourceHeadingTopAligned: true,

    paddingTopLg: 'lg:pt-9',

    parentQuoteText: 'Abstract Voyage is where I follow the questions behind that work.',
};
export const SOLID_EDITORIAL_QUOTE_CONFIG: EditorialQuoteConfig = {
    ...PASSAGE_QUOTE_CONFIG, ...editorialDefaults, ...editorialHeadingDefaults, backgroundMode: 'none',
    gradientInkEnabled: false, paletteBackgroundEnabled: false, showAuthor: false,
    linkLabel: 'Read the full passage',

    gradientInkRenderMode: 'unified',

    headingPlacement: 'inside-top',

    headingAlign: 'center',

    linkPlacement: 'inside-bottom',
    linkAlign: 'center',

    topRuleEnabled: true,
    topRuleOpacityPercent: 100,

    solidBackgroundColor: '#edf4f6',

    textFontFamily: 'font-sans',

    linkEnabled: false,

    showQuotationMarks: false,

    topRuleColor: '#aed1d5',

    sourceHeadingTopAligned: true,

    paddingTopLg: 'lg:pt-9',

    parentQuoteText: 'Abstract Voyage is where I follow the questions behind that work.',
};
export const PRACTICE_EDITORIAL_QUOTE_CONFIG: EditorialQuoteConfig = {
  ...PLAIN_EDITORIAL_QUOTE_CONFIG,
  headingEnabled: true,
  headingPlacement: 'inside-top',
  headingAlign: 'start',
  sourceHeadingFontSize: 'text-sm',
  sourceHeadingTracking: 'tracking-wider',
  sourceHeadingTextTransform: 'uppercase',
  sourceHeadingOpacityPercent: 100,
  sourceHeadingContentGap: 'mb-4',
  linkEnabled: false,
  topRuleEnabled: false,
  showQuotationMarks: false,
  showAuthor: false,
  cardAspectRatioEnabled: false,
  geometryShape: 'auto',
  textFontFamily: 'font-sans',
  textFontWeight: 'font-medium',
  textOpacityPercent: 70,
  textSize: 'text-base',
  textSizeMd: 'md:text-base',
  textSizeLg: 'lg:text-base',
  leading: 'leading-relaxed',
  textTransform: 'normal-case',
  textWrap: 'balance',
  paddingTop: 'pt-0',
  paddingTopMd: 'md:pt-0',
  paddingTopLg: 'lg:pt-0',
  paddingRight: 'pr-0',
  paddingRightMd: 'md:pr-0',
  paddingRightLg: 'lg:pr-0',
  paddingBottom: 'pb-0',
  paddingBottomMd: 'md:pb-0',
  paddingBottomLg: 'lg:pb-0',
  paddingLeft: 'pl-0',
  paddingLeftMd: 'md:pl-0',
  paddingLeftLg: 'lg:pl-0',
  solidTextColor: '#ffffff',

  textAlign: 'start',

  backgroundMode: 'none',
  solidBackgroundColor: '#000000',
  parentQuoteSolidFillColor: '#183036',
  cardBlendMode: 'screen',

  gradientInkMeshDarkeningPercent: 0,
  gradientInkTextColor: '#ffffff',

  gradientInkSurfaceColor: '#ffffff',
  gradientInkBlendMode: 'multiply',
  gradientInkOverlayOpacityPercent: 100,

  parentQuoteText: 'Abstract Voyage is where I follow the questions behind that work.',
};
export const DEFAULT_EDITORIAL_QUOTE_CONFIGS: Record<EditorialVariant, EditorialQuoteConfig> = {
  featured: FEATURED_EDITORIAL_QUOTE_CONFIG,
  plain: PLAIN_EDITORIAL_QUOTE_CONFIG,
  solid: SOLID_EDITORIAL_QUOTE_CONFIG,
  practice: PRACTICE_EDITORIAL_QUOTE_CONFIG,
};

const colors = /^#[0-9a-f]{6}$/i;
function color(value: unknown, fallback: string): string { return typeof value === 'string' && colors.test(value) ? value : fallback; }
function token<T extends 'fontSize' | 'borderWidth'>(utility: T, value: unknown, fallback: TailwindTokenValue<T>): TailwindTokenValue<T> {
  return normalizeTailwindToken({ utility, breakpoint: 'base', value, fallback });
}

/**
 * The quote's own computed foreground ink for the active backgroundMode -- the
 * single definition the shared heading/link use when their colorMode is
 * 'inherit'. Reuses the exact derivation functions Quote.tsx itself uses
 * (deriveQuoteTextColor / generateQuotePalette) rather than a second recipe.
 * Caveat: over a gradient the visible glyph color is a per-pixel mesh blend with
 * no single hex, so 'inherit' resolves to the deterministic text-layer ink the
 * glyphs are tinted toward (gradientInkTextColor).
 */
export function resolveEditorialInk(value: EditorialQuoteConfig): string {
  if (value.backgroundMode === 'gradient') return value.gradientInkTextColor;
  if (value.backgroundMode === 'palette') {
    const swatches = generateQuotePalette(value.paletteSaturationPercent, value.paletteLightnessPercent);
    const bg = swatches[Math.min(QUOTE_PALETTE_SIZE, Math.max(1, value.paletteColorIndex)) - 1];
    return bg ? deriveQuoteTextColor(bg, value.textColorSaturationPercent, value.textColorLightnessPercent).color : value.solidTextColor;
  }
  return value.solidTextColor; // solid + none
}

export function normalizeEditorialQuoteConfig(value: Partial<EditorialQuoteConfig> | undefined, variant: EditorialVariant): EditorialQuoteConfig {
  const fallback = DEFAULT_EDITORIAL_QUOTE_CONFIGS[variant];
  const merged = { ...fallback, ...value };
  const backgroundMode = value?.backgroundMode === 'none' || value?.backgroundMode === 'solid' || value?.backgroundMode === 'palette' || value?.backgroundMode === 'gradient' ? value.backgroundMode : fallback.backgroundMode;
  return {
    ...normalizeQuoteConfig(merged),
    // backgroundMode is the single author-facing surface switch; it DERIVES the
    // base Quote's own gradient/palette enable flags, but it no longer forces a
    // render mode -- gradientInkRenderMode (unified mesh vs CSS fallback) is a
    // real inherited capability that composes with a gradient background, so its
    // normalized value (from normalizeQuoteConfig above) stands and both render
    // modes remain available to every quote type.
    gradientInkEnabled: backgroundMode === 'gradient',
    paletteBackgroundEnabled: backgroundMode === 'palette',
    headingEnabled: typeof value?.headingEnabled === 'boolean' ? value.headingEnabled : fallback.headingEnabled,
    headingShowTitle: typeof value?.headingShowTitle === 'boolean' ? value.headingShowTitle : fallback.headingShowTitle,
    headingShowPeriod: typeof value?.headingShowPeriod === 'boolean' ? value.headingShowPeriod : fallback.headingShowPeriod,
    headingPlacement: value?.headingPlacement === 'after' || value?.headingPlacement === 'inside-top' || value?.headingPlacement === 'inside-bottom' ? value.headingPlacement : fallback.headingPlacement,
    linkEnabled: typeof value?.linkEnabled === 'boolean' ? value.linkEnabled : fallback.linkEnabled,
    linkLabel: typeof value?.linkLabel === 'string' && value.linkLabel.trim() ? value.linkLabel.trim() : fallback.linkLabel,
    linkPlacement: value?.linkPlacement === 'before' || value?.linkPlacement === 'inside-top' || value?.linkPlacement === 'inside-bottom' ? value.linkPlacement : fallback.linkPlacement,
    linkAlign: value?.linkAlign === 'center' || value?.linkAlign === 'end' ? value.linkAlign : 'start',
    topRuleEnabled: typeof value?.topRuleEnabled === 'boolean' ? value.topRuleEnabled : fallback.topRuleEnabled,
    topRuleWidth: token('borderWidth', value?.topRuleWidth, fallback.topRuleWidth),
    topRuleColor: color(value?.topRuleColor, fallback.topRuleColor),
    topRuleOpacityPercent: typeof value?.topRuleOpacityPercent === 'number' && Number.isFinite(value.topRuleOpacityPercent) ? Math.max(0, Math.min(100, value.topRuleOpacityPercent)) : fallback.topRuleOpacityPercent,
    backgroundMode,
    solidBackgroundColor: color(value?.solidBackgroundColor, fallback.solidBackgroundColor),
    solidTextColor: color(value?.solidTextColor, fallback.solidTextColor),
    adaptiveTypeEnabled: typeof value?.adaptiveTypeEnabled === 'boolean' ? value.adaptiveTypeEnabled : fallback.adaptiveTypeEnabled,
    adaptiveMinSize: token('fontSize', value?.adaptiveMinSize, fallback.adaptiveMinSize),
    adaptiveMaxLines: typeof value?.adaptiveMaxLines === 'number' && Number.isFinite(value.adaptiveMaxLines) ? Math.max(3, Math.min(16, Math.round(value.adaptiveMaxLines))) : fallback.adaptiveMaxLines,
  };
}
