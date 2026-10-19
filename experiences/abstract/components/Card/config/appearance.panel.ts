import { defineConfigScope } from '../../../../../components/Panel/config/defineConfigScope';
import type { SelectConfigField } from '../../../../../components/Panel/config/types';
import { createTailwindFieldFactory } from '../../../../../components/Panel/config/tailwindFields';
import {
  COVER_FLOW_GRADIENT_SOURCE_CARDS,
  DEFAULT_CARD_APPEARANCE_CONFIG,
  hasUnifiedGradientInkAtAnyBreakpoint,
  type CardAppearanceConfig,
  type UnifiedGradientSourceCard,
} from './appearance';

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
const unifiedGradientSourceOptions = COVER_FLOW_GRADIENT_SOURCE_CARDS
  .map(value => ({ label: `Card ${value}`, value }));
const unifiedGradientSourceField: SelectConfigField<
  CardAppearanceConfig, 'invertedGradientInkUnifiedBackgroundSourceCard', UnifiedGradientSourceCard
> = {
  kind: 'select', key: 'invertedGradientInkUnifiedBackgroundSourceCard', label: 'Background gradient source card',
  description: 'Card 1 means every card uses the same background gradient as card #1.',
  options: unifiedGradientSourceOptions,
  visibleWhen: config => hasUnifiedGradientInkAtAnyBreakpoint(config)
    && config.invertedGradientInkUnifiedBackgroundEnabled,
};
const inactiveUnifiedGradientSourceField: SelectConfigField<
  CardAppearanceConfig, 'inactiveUnifiedGradientSourceCard', UnifiedGradientSourceCard
> = {
  kind: 'select', key: 'inactiveUnifiedGradientSourceCard', label: 'Inactive gradient source card',
  description: 'Every inactive CoverFlow card uses this card’s gradient, regardless of its distance from the active card.',
  options: unifiedGradientSourceOptions,
  visibleWhen: config => config.inactiveUnifiedGradientEnabled,
};

export const CARD_APPEARANCE_SCOPE_ID = 'Card/appearance' as const;

export const CARD_APPEARANCE_PANEL = defineConfigScope<CardAppearanceConfig>({
  id: CARD_APPEARANCE_SCOPE_ID,
  component: 'Card',
  scope: 'appearance',
  title: 'Card Appearance',
  createdAt: '2026-09-02',
  summary: 'Card content padding, metadata typography, surfaces, ink, and visual transitions',
  defaultOpen: false,
  defaultValue: DEFAULT_CARD_APPEARANCE_CONFIG,
  fields: [
    {
      kind: 'group',
      label: 'Card typography',
      fields: [
        { kind: 'boolean', key: 'hideTopicBelowWidthEnabled', label: 'Hide category on narrow cards', description: 'Remove the category text when the card is narrower than the width below.' },
        { kind: 'number', key: 'hideTopicBelowWidthPx', label: 'Category hide width', description: 'Card width below which the category is hidden.', min: 0, max: 800, step: 1, unit: 'px', integer: true, visibleWhen: config => config.hideTopicBelowWidthEnabled },
        { kind: 'boolean', key: 'hideReadingTimeBelowWidthEnabled', label: 'Hide reading time on narrow cards', description: 'Remove minutes read when the card is narrower than the width below.' },
        { kind: 'number', key: 'hideReadingTimeBelowWidthPx', label: 'Reading time hide width', description: 'Card width below which minutes read is hidden.', min: 0, max: 800, step: 1, unit: 'px', integer: true, visibleWhen: config => config.hideReadingTimeBelowWidthEnabled },
        tailwindCardAppearanceField('fontSize', { key: 'metadataFontSize', label: 'Metadata font size · mobile', description: 'Sets the topic, date, and reading-time size together below 768px.' }),
        tailwindCardAppearanceField('fontSize', { breakpoint: 'md', key: 'metadataFontSizeMd', label: 'Metadata font size · tablet' }),
        tailwindCardAppearanceField('fontSize', { breakpoint: 'lg', key: 'metadataFontSizeLg', label: 'Metadata font size · desktop' }),
      ],
    },
    {
      kind: 'group',
      label: 'Card content padding',
      fields: [
        { kind: 'boolean', key: 'useTailwindContentPadding', label: 'Use Tailwind padding', description: 'Use independent top, right, bottom, and left spacing tokens. Off keeps the current card-width-scaled inset.' },
      ],
    },
    {
      kind: 'tabs',
      visibleWhen: config => config.useTailwindContentPadding,
      tabs: [
        {
          id: 'mobile', label: 'MOBILE (< 768px)',
          fields: [
            tailwindCardAppearanceField('paddingTop', { key: 'contentPaddingTop', label: 'Padding top' }),
            tailwindCardAppearanceField('paddingRight', { key: 'contentPaddingRight', label: 'Padding right' }),
            tailwindCardAppearanceField('paddingBottom', { key: 'contentPaddingBottom', label: 'Padding bottom' }),
            tailwindCardAppearanceField('paddingLeft', { key: 'contentPaddingLeft', label: 'Padding left' }),
          ],
        },
        {
          id: 'tablet', label: 'TABLET (≥ 768px)',
          fields: [
            tailwindCardAppearanceField('paddingTop', { breakpoint: 'md', key: 'contentPaddingTopMd', label: 'Padding top' }),
            tailwindCardAppearanceField('paddingRight', { breakpoint: 'md', key: 'contentPaddingRightMd', label: 'Padding right' }),
            tailwindCardAppearanceField('paddingBottom', { breakpoint: 'md', key: 'contentPaddingBottomMd', label: 'Padding bottom' }),
            tailwindCardAppearanceField('paddingLeft', { breakpoint: 'md', key: 'contentPaddingLeftMd', label: 'Padding left' }),
          ],
        },
        {
          id: 'desktop', label: 'DESKTOP (≥ 1024px)',
          fields: [
            tailwindCardAppearanceField('paddingTop', { breakpoint: 'lg', key: 'contentPaddingTopLg', label: 'Padding top' }),
            tailwindCardAppearanceField('paddingRight', { breakpoint: 'lg', key: 'contentPaddingRightLg', label: 'Padding right' }),
            tailwindCardAppearanceField('paddingBottom', { breakpoint: 'lg', key: 'contentPaddingBottomLg', label: 'Padding bottom' }),
            tailwindCardAppearanceField('paddingLeft', { breakpoint: 'lg', key: 'contentPaddingLeftLg', label: 'Padding left' }),
          ],
        },
      ],
    },
    {
      kind: 'group',
      label: 'Active card',
      fields: [
        { kind: 'number', key: 'activeHeaderOpacity', label: 'Header opacity', description: 'Direct opacity for the active card header: 0 is transparent, 1 is fully opaque.', min: 0, max: 1, step: 0.01 },
        { kind: 'number', key: 'activeTextOpacity', label: 'Text opacity', min: 0, max: 1, step: 0.01 },
        { kind: 'number', key: 'activeScrimOpacity', label: 'Dark overlay (scrim) opacity', min: 0, max: 1, step: 0.01 },
        {
          kind: 'subgroup', label: 'Unified gradient ink', defaultCollapsed: false,
          fields: [
            { kind: 'boolean', key: 'invertedGradientInkEnabled', label: 'Use gradient as unified ink (mobile)', description: 'Enable below the tablet breakpoint.' },
            { kind: 'boolean', key: 'invertedGradientInkEnabledMd', label: 'Use gradient as unified ink (tablet)', description: 'Enable from the tablet breakpoint up to desktop.' },
            { kind: 'boolean', key: 'invertedGradientInkEnabledLg', label: 'Use gradient as unified ink (desktop)', description: 'Enable at desktop widths and above.' },
            { kind: 'boolean', key: 'invertedGradientInkUnifiedBackgroundEnabled', label: 'Use one card gradient for every background', description: 'Every card uses the selected card’s background gradient wherever unified ink is enabled.', visibleWhen: hasUnifiedGradientInkAtAnyBreakpoint },
            unifiedGradientSourceField,
            { kind: 'color', key: 'invertedGradientInkBackgroundColor', label: 'Content container background', visibleWhen: hasUnifiedGradientInkAtAnyBreakpoint },
            { kind: 'number', key: 'invertedGradientInkBackgroundOpacity', label: 'Content background opacity', description: '1 keeps the configured surface fully solid. Lower values reveal more of the live mesh; 0 restores the readable light-on-gradient card.', min: 0, max: 1, step: 0.05, visibleWhen: hasUnifiedGradientInkAtAnyBreakpoint },
            { kind: 'color', key: 'invertedGradientInkForegroundColor', label: 'Text and border color', description: 'Shared by all enabled breakpoints.', visibleWhen: hasUnifiedGradientInkAtAnyBreakpoint },
            { kind: 'enum', key: 'invertedGradientInkBlendMode', label: 'Content blend mode', options: [{ label: 'SCREEN', value: 'screen' }, { label: 'MULTIPLY', value: 'multiply' }], visibleWhen: hasUnifiedGradientInkAtAnyBreakpoint },
            { kind: 'boolean', key: 'invertedGradientInkActiveBorderEnabled', label: 'Active content border', description: 'A pure-black perimeter around the active card’s content surface wherever unified ink is enabled.', visibleWhen: hasUnifiedGradientInkAtAnyBreakpoint },
            tailwindCardAppearanceField('borderWidth', { key: 'invertedGradientInkActiveBorderWidth', label: 'Active content border width', description: 'Shared Tailwind border-width token. Applies only while Active content border is enabled.', visibleWhen: config => hasUnifiedGradientInkAtAnyBreakpoint(config) && config.invertedGradientInkActiveBorderEnabled }),
          ],
        },
      ],
    },
    {
      kind: 'group',
      label: 'Inactive card surface',
      fields: [
        { kind: 'boolean', key: 'inactiveUnifiedGradientEnabled', label: 'Use one gradient for all inactive cards', description: 'Give every inactive CoverFlow card the same selected card gradient.' },
        inactiveUnifiedGradientSourceField,
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
