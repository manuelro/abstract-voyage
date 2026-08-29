import { defineConfigScope } from '../../../components/Panel/config';
import {
  ABSTRACT_METAL_LAB_CARD_CONFIG_RANGES,
  DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG,
  type AbstractMetalLabCardConfig,
} from './AbstractMetalLabList.config';

export const ABSTRACT_METAL_LAB_CARD_SCOPE_ID =
  'AbstractMetalLabList/material' as const;

const ranges = ABSTRACT_METAL_LAB_CARD_CONFIG_RANGES;
const whenHoverEnabled = (config: Readonly<AbstractMetalLabCardConfig>) =>
  config.hoverEnabled;

export const ABSTRACT_METAL_LAB_CARD_PANEL =
  defineConfigScope<AbstractMetalLabCardConfig>({
    id: ABSTRACT_METAL_LAB_CARD_SCOPE_ID,
    component: 'AbstractMetalLabList',
    scope: 'material',
    title: 'Lab card material',
    createdAt: '2026-07-27',
    summary: 'Metal colors · darkness/contrast · hover reflection',
    defaultOpen: false,
    defaultValue: DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG,
    fields: [
      {
        kind: 'group',
        label: 'Base material',
        fields: [
          {
            kind: 'color',
            key: 'shadowColor',
            label: 'Shadow',
            description: 'Darkest color in the shared metal ramp.',
          },
          {
            kind: 'color',
            key: 'bodyColor',
            label: 'Body',
            description: 'Core graphite/metal color between shadow and reflection.',
          },
          {
            kind: 'color',
            key: 'highlightColor',
            label: 'Highlight',
            description: 'Brightest reflected-light color in the material.',
          },
          {
            kind: 'number',
            key: 'baseDarkness',
            label: 'Base darkness',
            description: 'Overall material register: 0 is lighter, 0.5 is a neutral transfer, and 1 is darker. Reflection geometry does not move.',
            ...ranges.baseDarkness,
          },
          {
            kind: 'number',
            key: 'baseContrast',
            label: 'Base contrast',
            description: 'Resting separation between dark metal and reflected light. Independent from overall darkness.',
            ...ranges.baseContrast,
          },
        ],
      },
      {
        kind: 'group',
        label: 'Advanced tone curve',
        fields: [
          {
            kind: 'number',
            key: 'inputBlackPoint',
            label: 'Shadow cutoff',
            description: 'Source luminance below this point settles into the material shadow.',
            ...ranges.inputBlackPoint,
          },
          {
            kind: 'number',
            key: 'inputWhitePoint',
            label: 'Reflection ceiling',
            description: 'Source luminance that reaches the top of the metal ramp.',
            ...ranges.inputWhitePoint,
          },
          {
            kind: 'number',
            key: 'gamma',
            label: 'Midtone distribution',
            description: 'Moves detail between the dark body and brighter reflection zones.',
            ...ranges.gamma,
          },
          {
            kind: 'number',
            key: 'bodyPoint',
            label: 'Body split',
            description: 'Position where the ramp transitions from body metal into highlights.',
            ...ranges.bodyPoint,
          },
          {
            kind: 'number',
            key: 'highlightKnee',
            label: 'Highlight knee',
            description: 'Point where the restrained upper reflection shoulder begins.',
            ...ranges.highlightKnee,
          },
          {
            kind: 'number',
            key: 'highlightGain',
            label: 'Highlight gain',
            description: 'Strength of the upper reflected-light shoulder.',
            ...ranges.highlightGain,
          },
        ],
      },
      {
        kind: 'group',
        label: 'Hover reflection',
        fields: [
          {
            kind: 'boolean',
            key: 'hoverEnabled',
            label: 'Hover response',
            description: 'Lets pointer proximity move and reshape the lab card reflection.',
          },
          {
            kind: 'number',
            key: 'hoverOffsetGain',
            label: 'Hover displacement',
            description: 'Strength of the reflected field pan under pointer tilt.',
            visibleWhen: whenHoverEnabled,
            ...ranges.hoverOffsetGain,
          },
          {
            kind: 'number',
            key: 'hoverContrastBoost',
            label: 'Hover contrast',
            description: 'Contrast added to the metal luminance only while the hover response is active.',
            visibleWhen: whenHoverEnabled,
            ...ranges.hoverContrastBoost,
          },
          {
            kind: 'number',
            key: 'hoverBrightnessBoost',
            label: 'Hover brightness',
            description: 'Source-field brightness added as the card catches the pointer light.',
            visibleWhen: whenHoverEnabled,
            ...ranges.hoverBrightnessBoost,
          },
          {
            kind: 'number',
            key: 'hoverHueShiftAmount',
            label: 'Source hue response',
            description: 'Rotates the hidden source field before colorless metal conversion.',
            visibleWhen: whenHoverEnabled,
            ...ranges.hoverHueShiftAmount,
          },
          {
            kind: 'number',
            key: 'hoverSaturationBoost',
            label: 'Source saturation response',
            description: 'Changes hidden source intensity before colorless metal conversion.',
            visibleWhen: whenHoverEnabled,
            ...ranges.hoverSaturationBoost,
          },
          {
            kind: 'enum',
            key: 'hoverResponseEasing',
            label: 'Hover response curve',
            description: 'Shapes proximity before it drives the reflection.',
            visibleWhen: whenHoverEnabled,
            options: [
              { label: 'LINEAR', value: 'linear' },
              { label: 'SMOOTH', value: 'smoothstep' },
              { label: 'SMOOTHER', value: 'smootherstep' },
              { label: 'EXPO', value: 'ease-out-cubic' },
            ],
          },
          {
            kind: 'boolean',
            key: 'hoverDampingEnabled',
            label: 'Damped hover',
            description: 'Smooths the reflection response during pointer approach and departure.',
            visibleWhen: whenHoverEnabled,
          },
        ],
      },
    ],
    copy: {
      targetFile:
        'experiences/abstract/components/AbstractMetalLabList.config.ts',
      targetSymbol: 'DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG',
      targetType: 'AbstractMetalLabCardConfig',
      updateStrategy: 'replace_scope',
      completeScope: true,
    },
  });
