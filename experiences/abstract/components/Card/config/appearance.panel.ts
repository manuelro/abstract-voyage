import { defineConfigScope } from '../../../../../components/Panel/config/defineConfigScope';
import type { SelectConfigField } from '../../../../../components/Panel/config/types';
import { createTailwindFieldFactory } from '../../../../../components/Panel/config/tailwindFields';
import { DEFAULT_CARD_APPEARANCE_CONFIG, type CardAppearanceConfig, type UnifiedGradientSourceCard } from './appearance';

const motionEasings = [
  { label: 'LINEAR', value: 'linear' },
  { label: 'STANDARD', value: 'standard' },
  { label: 'EXPRESSIVE', value: 'expressive' },
  { label: 'VISCOUS', value: 'viscous' },
  { label: 'GENTLE', value: 'gentle' },
  { label: 'GAUSSIAN', value: 'gaussian' },
] as const;
const frameModes = [
  { label: 'BORDER', value: 'border' },
  { label: 'FLAT FILL', value: 'flat-fill' },
  { label: 'GRADIENT MESH', value: 'gradient-mesh' },
] as const;
const backgroundModes = [
  { label: 'SURFACE', value: 'surface' },
  { label: 'TRANSPARENT', value: 'transparent' },
  { label: 'CUSTOM', value: 'custom' },
  { label: 'COLUMN', value: 'column' },
] as const;
const textModes = [
  { label: 'CUSTOM', value: 'custom' },
  { label: 'COLUMN', value: 'column' },
] as const;
const tailwindCardAppearanceField = createTailwindFieldFactory<CardAppearanceConfig>();
const unifiedGradientSourceOptions = (['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const)
  .map(value => ({ label: `Card ${value}`, value }));
const unifiedGradientSourceField: SelectConfigField<
  CardAppearanceConfig, 'invertedGradientInkUnifiedBackgroundSourceCard', UnifiedGradientSourceCard
> = {
  kind: 'select', key: 'invertedGradientInkUnifiedBackgroundSourceCard', label: 'Background gradient source card',
  description: 'Card 1 means every card uses the same background gradient as card #1.',
  options: unifiedGradientSourceOptions,
  visibleWhen: config => config.invertedGradientInkEnabled && config.invertedGradientInkUnifiedBackgroundEnabled,
};

export const CARD_APPEARANCE_SCOPE_ID = 'Card/appearance' as const;

export const CARD_APPEARANCE_PANEL = defineConfigScope<CardAppearanceConfig>({
  id: CARD_APPEARANCE_SCOPE_ID,
  component: 'Card',
  scope: 'appearance',
  title: 'Card Appearance',
  createdAt: '2026-09-02',
  summary: 'Active and inactive card surface, ink, and visual transitions',
  defaultOpen: false,
  defaultValue: DEFAULT_CARD_APPEARANCE_CONFIG,
  fields: [
    {
      kind: 'group',
      label: 'Active card',
      fields: [
        { kind: 'number', key: 'activeHeaderOpacity', label: 'Header opacity', min: 0, max: 1, step: 0.01 },
        { kind: 'number', key: 'activeTextOpacity', label: 'Text opacity', min: 0, max: 1, step: 0.01 },
        { kind: 'number', key: 'activeScrimOpacity', label: 'Dark overlay (scrim) opacity', min: 0, max: 1, step: 0.01 },
        { kind: 'boolean', key: 'invertedGradientInkEnabled', label: 'Use gradient as unified ink', description: 'Opt-in: keeps the live holographic gradient running beneath a solid content surface. The shared text-and-border color blends with that exact live gradient as moving ink.' },
        { kind: 'boolean', key: 'invertedGradientInkUnifiedBackgroundEnabled', label: 'Use one card gradient for every background', description: 'Opt-in: every card uses the selected configured card’s background gradient while unified ink is active.', visibleWhen: config => config.invertedGradientInkEnabled },
        unifiedGradientSourceField,
        { kind: 'color', key: 'invertedGradientInkBackgroundColor', label: 'Content container background', visibleWhen: config => config.invertedGradientInkEnabled },
        { kind: 'number', key: 'invertedGradientInkBackgroundOpacity', label: 'Content background opacity', description: '1 keeps the configured surface fully solid. Lower values reveal more of the live holographic gradient around the blended ink.', min: 0, max: 1, step: 0.05, visibleWhen: config => config.invertedGradientInkEnabled },
        { kind: 'color', key: 'invertedGradientInkForegroundColor', label: 'Text and border color', description: 'One shared color for all card copy and decorative borders in this treatment.', visibleWhen: config => config.invertedGradientInkEnabled },
        { kind: 'enum', key: 'invertedGradientInkBlendMode', label: 'Content blend mode', options: [{ label: 'SCREEN', value: 'screen' }, { label: 'MULTIPLY', value: 'multiply' }], visibleWhen: config => config.invertedGradientInkEnabled },
        { kind: 'boolean', key: 'invertedGradientInkActiveBorderEnabled', label: 'Active content border', description: 'Opt-in: a pure-black perimeter around the active card’s content surface. Screen blending reveals the live gradient through the border.', visibleWhen: config => config.invertedGradientInkEnabled },
        tailwindCardAppearanceField('borderWidth', { key: 'invertedGradientInkActiveBorderWidth', label: 'Active content border width', description: 'Shared Tailwind border-width token. Applies only while Active content border is enabled.', visibleWhen: config => config.invertedGradientInkEnabled && config.invertedGradientInkActiveBorderEnabled }),
      ],
    },
    {
      kind: 'group',
      label: 'Inactive card surface',
      fields: [
        { kind: 'number', key: 'neighborScrimOpacity', label: 'Dark overlay (scrim) opacity', min: 0, max: 1, step: 0.01 },
        { kind: 'enum', key: 'neighborFrameMode', label: 'Surface treatment', options: frameModes },
        { kind: 'enum', key: 'neighborBackgroundMode', label: 'Surface source', options: backgroundModes },
        { kind: 'color', key: 'neighborBackgroundCustomColor', label: 'Custom surface color', visibleWhen: config => config.neighborBackgroundMode === 'custom' },
        { kind: 'number', key: 'neighborBackgroundOffset', label: 'Surface tone offset', min: -1, max: 1, step: 0.01, visibleWhen: config => config.neighborBackgroundMode === 'column' },
        { kind: 'enum', key: 'neighborTextColorMode', label: 'Inactive ink source', options: textModes },
        { kind: 'color', key: 'neighborTextColor', label: 'Inactive ink color', visibleWhen: config => config.neighborTextColorMode === 'custom' },
        { kind: 'color', key: 'neighborTopicBorderColor', label: 'Topic border color', visibleWhen: config => config.neighborTextColorMode === 'custom' },
        { kind: 'number', key: 'neighborTextOffset', label: 'Inactive ink tone offset', min: -1, max: 1, step: 0.01, visibleWhen: config => config.neighborTextColorMode === 'column' },
        { kind: 'number', key: 'neighborTextMinContrast', label: 'Inactive ink contrast', min: 1, max: 21, step: 0.1, visibleWhen: config => config.neighborTextColorMode === 'column' },
        { kind: 'number', key: 'neighborBorderColorOffset', label: 'Outer border opacity', min: 0, max: 1, step: 0.01 },
        { kind: 'number', key: 'neighborFlatFillOpacity', label: 'Flat fill opacity', min: 0, max: 1, step: 0.01, visibleWhen: config => config.neighborFrameMode === 'flat-fill' },
        { kind: 'number', key: 'neighborFlatFillToneOffset', label: 'Flat fill tone offset', min: -1, max: 1, step: 0.01, visibleWhen: config => config.neighborFrameMode === 'flat-fill' },
      ],
    },
    {
      kind: 'group',
      label: 'Appearance motion',
      fields: [
        { kind: 'number', key: 'neighborGradientRevealDurationMs', label: 'Gradient reveal duration', min: 0, max: 3000, step: 10, unit: 'ms', integer: true },
        { kind: 'enum', key: 'neighborGradientRevealEasing', label: 'Gradient reveal easing', options: motionEasings },
        { kind: 'number', key: 'neighborGradientRevealBlurPx', label: 'Gradient reveal blur', min: 0, max: 80, step: 1, unit: 'px', integer: true },
        { kind: 'number', key: 'neighborShadowFadeDurationMs', label: 'Shadow fade duration', min: 0, max: 3000, step: 10, unit: 'ms', integer: true },
        { kind: 'enum', key: 'neighborShadowFadeEasing', label: 'Shadow fade easing', options: motionEasings },
        { kind: 'number', key: 'stepTiltDurationMs', label: 'Card tilt duration', min: 0, max: 3000, step: 10, unit: 'ms', integer: true },
        { kind: 'enum', key: 'stepTiltEasing', label: 'Card tilt easing', options: motionEasings },
        { kind: 'number', key: 'ctaHoverDurationMs', label: 'CTA hover duration', min: 0, max: 2000, step: 10, unit: 'ms', integer: true },
        { kind: 'enum', key: 'ctaHoverEasing', label: 'CTA hover easing', options: motionEasings },
        { kind: 'number', key: 'ctaHoverDelayMs', label: 'CTA hover delay', min: 0, max: 2000, step: 10, unit: 'ms', integer: true },
      ],
    },
  ],
  copy: {
    targetFile: 'experiences/abstract/components/Card/config/appearance.ts',
    targetSymbol: 'DEFAULT_CARD_APPEARANCE_CONFIG',
    targetType: 'CardAppearanceConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
