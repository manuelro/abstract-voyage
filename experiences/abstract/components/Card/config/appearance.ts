import {
  DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG,
  normalizeSplitColumnCardStackConfig,
  type SplitColumnCardStackConfig,
} from '../../SplitColumnCardPreview/config/stack';

/** Appearance-only subset of the former Card Stack config. Layout, gesture,
 * and navigation fields remain owned by the stack when that legacy layout is
 * used; this config owns the card surface and its visual state transitions. */
export type CardAppearanceConfig = Pick<SplitColumnCardStackConfig,
  | 'activeHeaderOpacity'
  | 'activeTextOpacity'
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
>;

const appearanceKeys: ReadonlyArray<keyof CardAppearanceConfig> = [
  'activeHeaderOpacity', 'activeTextOpacity',
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
  Object.fromEntries(appearanceKeys.map(key => [key, config[key]])) as CardAppearanceConfig
);

export const DEFAULT_CARD_APPEARANCE_CONFIG: CardAppearanceConfig = {
  ...pickAppearance(DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG),
  neighborTextMinContrast: 8.1,
};

export function normalizeCardAppearanceConfig(
  config: Partial<CardAppearanceConfig> | undefined,
): CardAppearanceConfig {
  return pickAppearance(normalizeSplitColumnCardStackConfig({
    ...DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG,
    ...(config ?? {}),
  }));
}
