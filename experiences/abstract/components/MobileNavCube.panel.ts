import { defineConfigScope } from '../../../components/Panel/config';
import {
  DEFAULT_MOBILE_NAV_CUBE_CONFIG,
  type MobileNavCubeConfig,
} from './MobileNavCube.config';
import { CUBE_LAB_PANEL } from '../../../pages/cube-lab.panel';

export const MOBILE_NAV_CUBE_SCOPE_ID = 'MobileNavCube/layout' as const;

const EASING_OPTIONS = [
  { label: 'LINEAR', value: 'linear' },
  { label: 'STANDARD', value: 'standard' },
  { label: 'EXPRESSIVE', value: 'expressive' },
  { label: 'VISCOUS', value: 'viscous' },
  { label: 'GENTLE', value: 'gentle' },
  { label: 'GAUSSIAN', value: 'gaussian' },
] as const;

const SHARED_CUBE_PANEL_GROUPS = CUBE_LAB_PANEL.fields.filter(entry => (
  entry.kind === 'group'
  && (entry.label.startsWith('Perspective') || entry.label.startsWith('Motion'))
));

export const MOBILE_NAV_CUBE_PANEL = defineConfigScope<MobileNavCubeConfig>({
  id: MOBILE_NAV_CUBE_SCOPE_ID,
  component: 'CuboidNavigation',
  scope: 'layout',
  title: 'Cuboid Navigation',
  createdAt: '2026-09-10',
  summary: 'Global burger/X trigger, cuboid motion, and Face E navigation',
  defaultOpen: false,
  defaultValue: DEFAULT_MOBILE_NAV_CUBE_CONFIG,
  // Navigation owns the A/E target. These lab-only manual controls remain
  // in the shared config shape but are intentionally not operator-facing here.
  hiddenKeys: [
    'rotateXDeg', 'rotateYDeg', 'faceTheCameraSelection', 'fillViewportEnabled',
  ],
  fields: [
    {
      kind: 'group',
      label: 'Trigger',
      fields: [
        { kind: 'boolean', key: 'enabled', label: 'Enabled' },
      ],
    },
    {
      kind: 'group',
      label: 'Position',
      fields: [
        {
          kind: 'boolean',
          key: 'triggerAlignToWordmarkE',
          label: 'Extend the wordmark\'s E',
          description: 'Computes horizontal position and every bar\'s own vertical position/thickness from the live wordmark SVG, so the bars read as a continuation of the "E" letterform\'s three strokes. A one-directional read — the wordmark is never affected. When off, falls back to Align/Top offset/Side offset/Bar thickness/Bar gap below.',
        },
        {
          kind: 'number',
          key: 'triggerWordmarkGapPx',
          label: 'Gap from wordmark',
          description: 'Space between the wordmark\'s "E" and the trigger\'s bars — keeps them reading as related but distinct, not fused. Only applies while "Extend the wordmark\'s E" is on.',
          min: 0,
          max: 64,
          step: 1,
          unit: 'px',
          visibleWhen: config => config.triggerAlignToWordmarkE,
        },
        {
          kind: 'enum',
          key: 'triggerAlign',
          label: 'Align (fallback)',
          description: 'Only applies while "Extend the wordmark\'s E" is off.',
          options: [
            { label: 'LEFT', value: 'left' },
            { label: 'RIGHT', value: 'right' },
          ],
          visibleWhen: config => !config.triggerAlignToWordmarkE,
        },
        {
          kind: 'number',
          key: 'triggerTopPx',
          label: 'Top offset (fallback)',
          min: 0,
          max: 200,
          step: 1,
          unit: 'px',
          visibleWhen: config => !config.triggerAlignToWordmarkE,
        },
        {
          kind: 'number',
          key: 'triggerOffsetXPx',
          label: 'Side offset (fallback)',
          description: 'Distance from whichever edge Align selects.',
          min: 0,
          max: 200,
          step: 1,
          unit: 'px',
          visibleWhen: config => !config.triggerAlignToWordmarkE,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Button box',
      fields: [
        {
          kind: 'number',
          key: 'triggerWidthPx',
          label: 'Width',
          description: 'Independent of Button size below — lets the tap target be wider or narrower than it is tall.',
          min: 32,
          max: 200,
          step: 1,
          unit: 'px',
        },
        {
          kind: 'number', key: 'triggerSizePx', label: 'Button size (height + icon scale)', min: 32, max: 72, step: 1, unit: 'px',
        },
        {
          kind: 'number',
          key: 'triggerPaddingPx',
          label: 'Padding',
          description: 'Inset between the button\'s own edges and its icon bars.',
          min: 0,
          max: 32,
          step: 1,
          unit: 'px',
        },
        {
          kind: 'number',
          key: 'triggerBorderRadiusPx',
          label: 'Corner radius',
          min: 0,
          max: 44,
          step: 1,
          unit: 'px',
        },
      ],
    },
    {
      kind: 'group',
      label: 'Appearance',
      fields: [
        { kind: 'color', key: 'triggerIconColor', label: 'Icon color' },
        { kind: 'color', key: 'triggerBackgroundColor', label: 'Button background' },
        {
          kind: 'number',
          key: 'triggerBackgroundOpacity',
          label: 'Background opacity',
          description: '0 = fully transparent button face.',
          min: 0,
          max: 1,
          step: 0.01,
        },
        {
          kind: 'number',
          key: 'triggerOpacity',
          label: 'Overall opacity',
          description: 'Fades the whole button (icon included), not just the background fill.',
          min: 0,
          max: 1,
          step: 0.01,
        },
        {
          kind: 'number',
          key: 'triggerBarThicknessPx',
          label: 'Bar thickness (fallback)',
          description: 'Only applies while "Extend the wordmark\'s E" is off — otherwise each bar\'s own thickness matches the corresponding E stroke.',
          min: 1,
          max: 6,
          step: 1,
          unit: 'px',
          visibleWhen: config => !config.triggerAlignToWordmarkE,
        },
        {
          kind: 'number',
          key: 'triggerBarGapPx',
          label: 'Bar gap (fallback)',
          description: 'Only applies while "Extend the wordmark\'s E" is off.',
          min: 2,
          max: 14,
          step: 1,
          unit: 'px',
          visibleWhen: config => !config.triggerAlignToWordmarkE,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Interaction motion',
      fields: [
        {
          kind: 'number',
          key: 'triggerInteractionTransitionMs',
          label: 'Hover/tap transition',
          description: 'Duration of the button\'s own opacity feedback on hover or tap.',
          min: 0,
          max: 1000,
          step: 10,
          unit: 'ms',
        },
        {
          kind: 'number',
          key: 'iconMorphDurationMs',
          label: 'Burger → X duration',
          min: 100,
          max: 1000,
          step: 10,
          unit: 'ms',
        },
        { kind: 'enum', key: 'iconMorphEasing', label: 'Burger → X easing', options: EASING_OPTIONS },
      ],
    },
    ...SHARED_CUBE_PANEL_GROUPS,
    {
      kind: 'group',
      label: 'Layer',
      fields: [
        {
          kind: 'number', key: 'faceHeightVh', label: 'Face height', min: 50, max: 100, step: 1, unit: 'dvh',
        },
        {
          kind: 'number', key: 'zIndex', label: 'Stack order', min: 1, max: 9999, step: 1,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Nav face',
      fields: [
        { kind: 'color', key: 'facePanelBackgroundColor', label: 'Panel background' },
        { kind: 'color', key: 'facePanelTextColor', label: 'Navigation ink' },
      ],
    },
  ],
  copy: {
    targetFile: 'experiences/abstract/components/MobileNavCube.config.ts',
    targetSymbol: 'DEFAULT_MOBILE_NAV_CUBE_CONFIG',
    targetType: 'MobileNavCubeConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
