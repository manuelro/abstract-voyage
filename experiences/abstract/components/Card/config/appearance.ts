import {
  DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG,
  normalizeSplitColumnCardStackConfig,
  type SplitColumnCardStackConfig,
} from '../../SplitColumnCardPreview/config/stack';
import {
  normalizeTailwindToken,
  type TailwindTokenValue,
} from '../../../../../components/Panel/config/tailwindFields';
import type { BreakpointTier } from '../../../../../components/useBreakpointTier';
import type { GradientInkTreatment } from '../../../../../components/GradientInkSurface';

export type UnifiedGradientSourceCard =
  '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '20' | '21' | '22';

/** One-based card choices shared with other editorial surfaces that borrow
 * the CoverFlow palette. The page still resolves each choice against its live
 * card count, so shorter collections use their final available card. The
 * Quote's own unified-ink picker (gradientInkSourceCard) instead reads
 * against quoteGradientDeck's fixed 22-entry deck, so its full range is
 * always available regardless of the host's live card count. */
export const COVER_FLOW_GRADIENT_SOURCE_CARDS: ReadonlyArray<UnifiedGradientSourceCard> = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22',
];

/** Appearance-only subset of the former Card Stack config. Layout, gesture,
 * and navigation fields remain owned by the stack when that legacy layout is
 * used; this config owns the card surface and its visual state transitions. */
export type CardAppearanceConfig = Pick<SplitColumnCardStackConfig,
  | 'activeHeaderOpacity'
  | 'activeTextOpacity'
  | 'activeScrimOpacity'
  | 'neighborScrimOpacity'
  | 'neighborGradientRevealDurationMs'
  | 'neighborGradientRevealEasing'
  | 'neighborGradientRevealBlurPx'
  | 'neighborShadowFadeDurationMs'
  | 'neighborShadowFadeEasing'
  | 'stepTiltDurationMs'
  | 'stepTiltEasing'
  | 'ctaHoverDurationMs'
  | 'ctaHoverEasing'
  | 'ctaHoverDelayMs'
  | 'neighborBackgroundMode'
  | 'neighborBackgroundCustomColor'
  | 'neighborBackgroundOffset'
  | 'neighborTextColor'
  | 'neighborTopicBorderColor'
  | 'neighborTextColorMode'
  | 'neighborTextOffset'
  | 'neighborTextMinContrast'
  | 'neighborBorderColorOffset'
  | 'neighborFrameMode'
  | 'neighborFlatFillOpacity'
  | 'neighborFlatFillToneOffset'
> & {
  /** Omit the category when this card is narrower than the threshold. */
  hideTopicBelowWidthEnabled: boolean;
  hideTopicBelowWidthPx: number;
  /** Independently omit reading time when the card is narrower than this width. */
  hideReadingTimeBelowWidthEnabled: boolean;
  hideReadingTimeBelowWidthPx: number;
  metadataFontSize: TailwindTokenValue<'fontSize'>;
  metadataFontSizeMd: TailwindTokenValue<'fontSize', 'md'>;
  metadataFontSizeLg: TailwindTokenValue<'fontSize', 'lg'>;
  useTailwindContentPadding: boolean;
  contentPaddingTop: TailwindTokenValue<'paddingTop'>;
  contentPaddingRight: TailwindTokenValue<'paddingRight'>;
  contentPaddingBottom: TailwindTokenValue<'paddingBottom'>;
  contentPaddingLeft: TailwindTokenValue<'paddingLeft'>;
  contentPaddingTopMd: TailwindTokenValue<'paddingTop', 'md'>;
  contentPaddingRightMd: TailwindTokenValue<'paddingRight', 'md'>;
  contentPaddingBottomMd: TailwindTokenValue<'paddingBottom', 'md'>;
  contentPaddingLeftMd: TailwindTokenValue<'paddingLeft', 'md'>;
  contentPaddingTopLg: TailwindTokenValue<'paddingTop', 'lg'>;
  contentPaddingRightLg: TailwindTokenValue<'paddingRight', 'lg'>;
  contentPaddingBottomLg: TailwindTokenValue<'paddingBottom', 'lg'>;
  contentPaddingLeftLg: TailwindTokenValue<'paddingLeft', 'lg'>;
  /** Mobile opt-in: swaps the per-card gradient from the surface to a unified
   * ink treatment across the card's text and decorative borders. */
  invertedGradientInkEnabled: boolean;
  /** Tablet and desktop override the mobile setting independently. */
  invertedGradientInkEnabledMd: boolean;
  invertedGradientInkEnabledLg: boolean;
  /** Solid card surface used wherever unified gradient ink is enabled. */
  invertedGradientInkBackgroundColor: string;
  /** At zero, the card returns to its readable light-on-gradient treatment. */
  invertedGradientInkBackgroundOpacity: number;
  /** One shared ink for every text and border element in this mode. */
  invertedGradientInkForegroundColor: string;
  /** The compositing mode applied by the content container. */
  invertedGradientInkBlendMode: 'screen' | 'multiply';
  /** Opt-in active-card perimeter in inverted gradient-ink mode. */
  invertedGradientInkActiveBorderEnabled: boolean;
  invertedGradientInkActiveBorderWidth: TailwindTokenValue<'borderWidth'>;
  /** Opt-in: every card uses the selected configured card gradient as its
   * background while unified ink is active. One-based to match the UI. */
  invertedGradientInkUnifiedBackgroundEnabled: boolean;
  invertedGradientInkUnifiedBackgroundSourceCard: UnifiedGradientSourceCard;
  /** Use one selected card's gradient on every inactive CoverFlow card. */
  inactiveUnifiedGradientEnabled: boolean;
  inactiveUnifiedGradientSourceCard: UnifiedGradientSourceCard;
};

const appearanceKeys: ReadonlyArray<keyof CardAppearanceConfig> = [
  'activeHeaderOpacity', 'activeTextOpacity',
  'activeScrimOpacity', 'neighborScrimOpacity',
  'neighborGradientRevealDurationMs', 'neighborGradientRevealEasing',
  'neighborGradientRevealBlurPx', 'neighborShadowFadeDurationMs',
  'neighborShadowFadeEasing', 'stepTiltDurationMs', 'stepTiltEasing',
  'ctaHoverDurationMs', 'ctaHoverEasing', 'ctaHoverDelayMs',
  'neighborBackgroundMode', 'neighborBackgroundCustomColor',
  'neighborBackgroundOffset', 'neighborTextColor', 'neighborTopicBorderColor',
  'neighborTextColorMode', 'neighborTextOffset', 'neighborTextMinContrast',
  'neighborBorderColorOffset', 'neighborFrameMode', 'neighborFlatFillOpacity',
  'neighborFlatFillToneOffset',
];

const pickAppearance = (config: SplitColumnCardStackConfig): CardAppearanceConfig => (
  Object.fromEntries(appearanceKeys
    .filter(key => key in config)
    .map(key => [key, config[key as keyof SplitColumnCardStackConfig]])) as CardAppearanceConfig
);

export const DEFAULT_CARD_APPEARANCE_CONFIG: CardAppearanceConfig = {
  ...pickAppearance(DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG),
  hideTopicBelowWidthEnabled: true,
  hideTopicBelowWidthPx: 430,
  hideReadingTimeBelowWidthEnabled: true,
  hideReadingTimeBelowWidthPx: 430,
  metadataFontSize: 'text-4xs',
  metadataFontSizeMd: 'md:text-4xs',
  metadataFontSizeLg: 'lg:text-4xs',
  useTailwindContentPadding: true,
  contentPaddingTop: 'pt-9',
  contentPaddingRight: 'pr-10',
  contentPaddingBottom: 'pb-10',
  contentPaddingLeft: 'pl-10',
  contentPaddingTopMd: 'md:pt-10',
  contentPaddingRightMd: 'md:pr-10',
  contentPaddingBottomMd: 'md:pb-10',
  contentPaddingLeftMd: 'md:pl-10',
  contentPaddingTopLg: 'lg:pt-8',
  contentPaddingRightLg: 'lg:pr-10',
  contentPaddingBottomLg: 'lg:pb-10',
  contentPaddingLeftLg: 'lg:pl-10',
  // The stack's animated cover blur is useful for its own transition, but
  // CoverFlow uses a steady shared gradient instead of that reveal effect.
  neighborGradientRevealBlurPx: 0,
  activeTextOpacity: 1,
  activeScrimOpacity: 0.22,
  neighborScrimOpacity: 0.4,
  neighborBackgroundMode: 'transparent',
  neighborBackgroundOffset: 0.71,
  neighborTextColor: '#241b69',
  neighborTopicBorderColor: '#9d9db9',
  neighborTextOffset: -0.3,
  neighborTextMinContrast: 4.6,
  neighborBorderColorOffset: 0.35,
  neighborFrameMode: 'gradient-mesh',
  neighborFlatFillOpacity: 0.07,
  neighborFlatFillToneOffset: 0,
  invertedGradientInkEnabled: false,
  invertedGradientInkEnabledMd: false,
  invertedGradientInkEnabledLg: false,
  invertedGradientInkBackgroundColor: '#ffffff',
  invertedGradientInkBackgroundOpacity: 1,
  invertedGradientInkForegroundColor: '#000000',
  invertedGradientInkBlendMode: 'screen',
  invertedGradientInkActiveBorderEnabled: false,
  invertedGradientInkActiveBorderWidth: 'border-2',
  invertedGradientInkUnifiedBackgroundEnabled: true,
  invertedGradientInkUnifiedBackgroundSourceCard: '1',
  inactiveUnifiedGradientEnabled: true,
  inactiveUnifiedGradientSourceCard: '3',

  activeHeaderOpacity: 0.85,
};

export function normalizeCardAppearanceConfig(
  config: Partial<CardAppearanceConfig> | undefined,
): CardAppearanceConfig {
  const normalizedStack = pickAppearance(normalizeSplitColumnCardStackConfig({
    ...DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG,
    ...(config ?? {}),
    neighborGradientRevealBlurPx: config?.neighborGradientRevealBlurPx
      ?? DEFAULT_CARD_APPEARANCE_CONFIG.neighborGradientRevealBlurPx,
  }));
  return {
    ...normalizedStack,
    hideTopicBelowWidthEnabled: config?.hideTopicBelowWidthEnabled === true,
    hideTopicBelowWidthPx: typeof config?.hideTopicBelowWidthPx === 'number'
      && Number.isFinite(config.hideTopicBelowWidthPx)
      ? Math.min(800, Math.max(0, Math.round(config.hideTopicBelowWidthPx)))
      : DEFAULT_CARD_APPEARANCE_CONFIG.hideTopicBelowWidthPx,
    hideReadingTimeBelowWidthEnabled: config?.hideReadingTimeBelowWidthEnabled === true,
    hideReadingTimeBelowWidthPx: typeof config?.hideReadingTimeBelowWidthPx === 'number'
      && Number.isFinite(config.hideReadingTimeBelowWidthPx)
      ? Math.min(800, Math.max(0, Math.round(config.hideReadingTimeBelowWidthPx)))
      : DEFAULT_CARD_APPEARANCE_CONFIG.hideReadingTimeBelowWidthPx,
    metadataFontSize: normalizeTailwindToken({
      utility: 'fontSize', breakpoint: 'base', value: config?.metadataFontSize,
      fallback: DEFAULT_CARD_APPEARANCE_CONFIG.metadataFontSize,
    }),
    metadataFontSizeMd: normalizeTailwindToken({
      utility: 'fontSize', breakpoint: 'md', value: config?.metadataFontSizeMd,
      fallback: DEFAULT_CARD_APPEARANCE_CONFIG.metadataFontSizeMd,
    }),
    metadataFontSizeLg: normalizeTailwindToken({
      utility: 'fontSize', breakpoint: 'lg', value: config?.metadataFontSizeLg,
      fallback: DEFAULT_CARD_APPEARANCE_CONFIG.metadataFontSizeLg,
    }),
    useTailwindContentPadding: config?.useTailwindContentPadding === true,
    contentPaddingTop: normalizeTailwindToken({ utility: 'paddingTop', breakpoint: 'base', value: config?.contentPaddingTop, fallback: DEFAULT_CARD_APPEARANCE_CONFIG.contentPaddingTop }),
    contentPaddingRight: normalizeTailwindToken({ utility: 'paddingRight', breakpoint: 'base', value: config?.contentPaddingRight, fallback: DEFAULT_CARD_APPEARANCE_CONFIG.contentPaddingRight }),
    contentPaddingBottom: normalizeTailwindToken({ utility: 'paddingBottom', breakpoint: 'base', value: config?.contentPaddingBottom, fallback: DEFAULT_CARD_APPEARANCE_CONFIG.contentPaddingBottom }),
    contentPaddingLeft: normalizeTailwindToken({ utility: 'paddingLeft', breakpoint: 'base', value: config?.contentPaddingLeft, fallback: DEFAULT_CARD_APPEARANCE_CONFIG.contentPaddingLeft }),
    contentPaddingTopMd: normalizeTailwindToken({ utility: 'paddingTop', breakpoint: 'md', value: config?.contentPaddingTopMd, fallback: DEFAULT_CARD_APPEARANCE_CONFIG.contentPaddingTopMd }),
    contentPaddingRightMd: normalizeTailwindToken({ utility: 'paddingRight', breakpoint: 'md', value: config?.contentPaddingRightMd, fallback: DEFAULT_CARD_APPEARANCE_CONFIG.contentPaddingRightMd }),
    contentPaddingBottomMd: normalizeTailwindToken({ utility: 'paddingBottom', breakpoint: 'md', value: config?.contentPaddingBottomMd, fallback: DEFAULT_CARD_APPEARANCE_CONFIG.contentPaddingBottomMd }),
    contentPaddingLeftMd: normalizeTailwindToken({ utility: 'paddingLeft', breakpoint: 'md', value: config?.contentPaddingLeftMd, fallback: DEFAULT_CARD_APPEARANCE_CONFIG.contentPaddingLeftMd }),
    contentPaddingTopLg: normalizeTailwindToken({ utility: 'paddingTop', breakpoint: 'lg', value: config?.contentPaddingTopLg, fallback: DEFAULT_CARD_APPEARANCE_CONFIG.contentPaddingTopLg }),
    contentPaddingRightLg: normalizeTailwindToken({ utility: 'paddingRight', breakpoint: 'lg', value: config?.contentPaddingRightLg, fallback: DEFAULT_CARD_APPEARANCE_CONFIG.contentPaddingRightLg }),
    contentPaddingBottomLg: normalizeTailwindToken({ utility: 'paddingBottom', breakpoint: 'lg', value: config?.contentPaddingBottomLg, fallback: DEFAULT_CARD_APPEARANCE_CONFIG.contentPaddingBottomLg }),
    contentPaddingLeftLg: normalizeTailwindToken({ utility: 'paddingLeft', breakpoint: 'lg', value: config?.contentPaddingLeftLg, fallback: DEFAULT_CARD_APPEARANCE_CONFIG.contentPaddingLeftLg }),
    invertedGradientInkEnabled: config?.invertedGradientInkEnabled === true,
    // A legacy config with one global flag keeps its previous appearance at
    // every width. Once the new keys are present, the tiers are independent.
    invertedGradientInkEnabledMd: typeof config?.invertedGradientInkEnabledMd === 'boolean'
      ? config.invertedGradientInkEnabledMd : config?.invertedGradientInkEnabled === true,
    invertedGradientInkEnabledLg: typeof config?.invertedGradientInkEnabledLg === 'boolean'
      ? config.invertedGradientInkEnabledLg : config?.invertedGradientInkEnabled === true,
    invertedGradientInkBackgroundColor: typeof config?.invertedGradientInkBackgroundColor === 'string'
      && config.invertedGradientInkBackgroundColor.trim()
      ? config.invertedGradientInkBackgroundColor
      : DEFAULT_CARD_APPEARANCE_CONFIG.invertedGradientInkBackgroundColor,
    invertedGradientInkBackgroundOpacity: typeof config?.invertedGradientInkBackgroundOpacity === 'number'
      ? Math.min(1, Math.max(0, config.invertedGradientInkBackgroundOpacity))
      : DEFAULT_CARD_APPEARANCE_CONFIG.invertedGradientInkBackgroundOpacity,
    invertedGradientInkForegroundColor: typeof config?.invertedGradientInkForegroundColor === 'string'
      && config.invertedGradientInkForegroundColor.trim()
      ? config.invertedGradientInkForegroundColor
      : DEFAULT_CARD_APPEARANCE_CONFIG.invertedGradientInkForegroundColor,
    invertedGradientInkBlendMode: config?.invertedGradientInkBlendMode === 'multiply'
      ? 'multiply'
      : 'screen',
    invertedGradientInkActiveBorderEnabled: config?.invertedGradientInkActiveBorderEnabled === true,
    invertedGradientInkActiveBorderWidth: normalizeTailwindToken({
      utility: 'borderWidth', breakpoint: 'base', value: config?.invertedGradientInkActiveBorderWidth,
      fallback: DEFAULT_CARD_APPEARANCE_CONFIG.invertedGradientInkActiveBorderWidth,
    }),
    invertedGradientInkUnifiedBackgroundEnabled: config?.invertedGradientInkUnifiedBackgroundEnabled === true,
    invertedGradientInkUnifiedBackgroundSourceCard: (
      COVER_FLOW_GRADIENT_SOURCE_CARDS
    ).includes(config?.invertedGradientInkUnifiedBackgroundSourceCard as UnifiedGradientSourceCard)
      ? config!.invertedGradientInkUnifiedBackgroundSourceCard as UnifiedGradientSourceCard
      : DEFAULT_CARD_APPEARANCE_CONFIG.invertedGradientInkUnifiedBackgroundSourceCard,
    inactiveUnifiedGradientEnabled: config?.inactiveUnifiedGradientEnabled === true,
    inactiveUnifiedGradientSourceCard: (
      COVER_FLOW_GRADIENT_SOURCE_CARDS
    ).includes(config?.inactiveUnifiedGradientSourceCard as UnifiedGradientSourceCard)
      ? config!.inactiveUnifiedGradientSourceCard as UnifiedGradientSourceCard
      : DEFAULT_CARD_APPEARANCE_CONFIG.inactiveUnifiedGradientSourceCard,
  };
}

export function resolveUnifiedGradientInkEnabled(
  config: Pick<CardAppearanceConfig,
    'invertedGradientInkEnabled' | 'invertedGradientInkEnabledMd' | 'invertedGradientInkEnabledLg'>,
  tier: BreakpointTier | undefined,
): boolean {
  if (tier === 'lg') return config.invertedGradientInkEnabledLg;
  if (tier === 'md') return config.invertedGradientInkEnabledMd;
  return config.invertedGradientInkEnabled;
}

/** Map the card's persisted appearance fields to the reusable layer contract. */
export function resolveCardGradientInkTreatment(
  config: CardAppearanceConfig,
  tier: BreakpointTier | undefined,
): GradientInkTreatment | undefined {
  // A fully transparent screen layer erases black glyphs into the mesh.
  // At zero, use the card's established light-on-gradient presentation.
  if (!resolveUnifiedGradientInkEnabled(config, tier)
    || config.invertedGradientInkBackgroundOpacity <= 0) return undefined;
  return {
    backgroundColor: config.invertedGradientInkBackgroundColor,
    backgroundOpacity: config.invertedGradientInkBackgroundOpacity,
    foregroundColor: config.invertedGradientInkForegroundColor,
    blendMode: config.invertedGradientInkBlendMode,
  };
}

export function hasUnifiedGradientInkAtAnyBreakpoint(
  config: Pick<CardAppearanceConfig,
    'invertedGradientInkEnabled' | 'invertedGradientInkEnabledMd' | 'invertedGradientInkEnabledLg'>,
): boolean {
  return config.invertedGradientInkEnabled
    || config.invertedGradientInkEnabledMd
    || config.invertedGradientInkEnabledLg;
}
