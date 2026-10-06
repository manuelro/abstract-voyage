import {
  DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG,
  normalizeSplitColumnCardStackConfig,
  type SplitColumnCardStackConfig,
} from '../../SplitColumnCardPreview/config/stack';
import {
  normalizeTailwindToken,
  type TailwindTokenValue,
} from '../../../../../components/Panel/config/tailwindFields';

export type UnifiedGradientSourceCard = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10';

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
  /** Opt-in: swaps the per-card gradient from the surface to a unified ink
   * treatment across the card's text and decorative borders. */
  invertedGradientInkEnabled: boolean;
  /** Solid card surface used while invertedGradientInkEnabled is on. */
  invertedGradientInkBackgroundColor: string;
  /** Opacity of the solid content surface in inverted gradient-ink mode. */
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
  invertedGradientInkEnabled: true,
  invertedGradientInkBackgroundColor: '#ffffff',
  invertedGradientInkBackgroundOpacity: 1,
  invertedGradientInkForegroundColor: '#000000',
  invertedGradientInkBlendMode: 'screen',
  invertedGradientInkActiveBorderEnabled: false,
  invertedGradientInkActiveBorderWidth: 'border-2',
  invertedGradientInkUnifiedBackgroundEnabled: true,
  invertedGradientInkUnifiedBackgroundSourceCard: '1',
};

export function normalizeCardAppearanceConfig(
  config: Partial<CardAppearanceConfig> | undefined,
): CardAppearanceConfig {
  const normalizedStack = pickAppearance(normalizeSplitColumnCardStackConfig({
    ...DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG,
    ...(config ?? {}),
  }));
  return {
    ...normalizedStack,
    invertedGradientInkEnabled: config?.invertedGradientInkEnabled === true,
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
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const
    ).includes(config?.invertedGradientInkUnifiedBackgroundSourceCard as UnifiedGradientSourceCard)
      ? config!.invertedGradientInkUnifiedBackgroundSourceCard as UnifiedGradientSourceCard
      : DEFAULT_CARD_APPEARANCE_CONFIG.invertedGradientInkUnifiedBackgroundSourceCard,
  };
}
