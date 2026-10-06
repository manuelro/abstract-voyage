import { defineConfigScope, createTailwindFieldFactory } from '../../Panel/config'
import { DEFAULT_CHIP_APPEARANCE_CONFIG, type ChipAppearanceConfig } from './appearance'

const tailwindChipAppearanceField = createTailwindFieldFactory<ChipAppearanceConfig>()

const COLOR_MODE_OPTIONS = [
  { label: 'MANUAL', value: 'manual' },
  { label: 'DERIVE FROM BACKGROUND', value: 'deriveFromBackground' },
  { label: 'CUSTOM STATES', value: 'custom' },
] as const

export const CHIP_APPEARANCE_FIELDS = [
  {
    kind: 'enum',
    key: 'colorMode',
    label: 'Color source',
    description: 'Manual uses two base colors and automatic interaction colors. Derive from background follows the page surface. Custom states gives selected and unselected chips separate text, background, and border colors for each interaction state.',
    options: COLOR_MODE_OPTIONS,
  } as const,
  {
    kind: 'group',
    label: 'Manual colors',
    visibleWhen: (config: ChipAppearanceConfig) => config.colorMode === 'manual',
    fields: [
      { kind: 'color', key: 'inkColor', label: 'Ink color', description: 'Unselected/border look. Drives the border and text color — deliberately the same color for both.' },
      { kind: 'color', key: 'backgroundColor', label: 'Fill background color', description: 'Selected/filled look. Its own text color is never authored — always auto-picked light or dark against this exact value (see "Fill text contrast" below).' },
    ],
  } as const,
  {
    kind: 'group',
    label: 'Derived ink',
    visibleWhen: (config: ChipAppearanceConfig) => config.colorMode === 'deriveFromBackground',
    fields: [
      { kind: 'number', key: 'darkInkSaturation', label: 'Dark ink saturation', min: 0, max: 2, step: 0.01, description: '0 neutral, 1 sampled from the background, 2 amplified.' },
      { kind: 'number', key: 'darkInkOpacityMultiplier', label: 'Dark ink opacity', min: 0.2, max: 1, step: 0.01 },
      { kind: 'number', key: 'activeSurfaceOffset', label: 'Selected surface offset', min: -1, max: 1, step: 0.01, description: 'Lightens (positive) or darkens (negative) the background reference for the selected/filled look before its own ink is re-derived.' },
    ],
  } as const,
  {
    kind: 'tabs',
    visibleWhen: (config: ChipAppearanceConfig) => config.colorMode === 'custom',
    tabs: [
      {
        id: 'chip-default',
        label: 'DEFAULT',
        fields: [
          {
            kind: 'group', label: 'Unselected', fields: [
              { kind: 'color', key: 'idleUnselectedTextColor', label: 'Text color' },
              { kind: 'color', key: 'idleUnselectedBackgroundColor', label: 'Background color' },
              { kind: 'color', key: 'idleUnselectedBorderColor', label: 'Border color' },
            ],
          },
          {
            kind: 'group', label: 'Selected', fields: [
              { kind: 'color', key: 'idleSelectedTextColor', label: 'Text color' },
              { kind: 'color', key: 'idleSelectedBackgroundColor', label: 'Background color' },
              { kind: 'color', key: 'idleSelectedBorderColor', label: 'Border color' },
            ],
          },
        ],
      },
      {
        id: 'chip-hover',
        label: 'HOVER',
        fields: [
          {
            kind: 'group', label: 'Unselected', fields: [
              { kind: 'color', key: 'hoverUnselectedTextColor', label: 'Text color' },
              { kind: 'color', key: 'hoverUnselectedBackgroundColor', label: 'Background color' },
              { kind: 'color', key: 'hoverUnselectedBorderColor', label: 'Border color' },
            ],
          },
          {
            kind: 'group', label: 'Selected', fields: [
              { kind: 'color', key: 'hoverSelectedTextColor', label: 'Text color' },
              { kind: 'color', key: 'hoverSelectedBackgroundColor', label: 'Background color' },
              { kind: 'color', key: 'hoverSelectedBorderColor', label: 'Border color' },
            ],
          },
        ],
      },
      {
        id: 'chip-pressed',
        label: 'PRESSED',
        fields: [
          {
            kind: 'group', label: 'Unselected', fields: [
              { kind: 'color', key: 'pressUnselectedTextColor', label: 'Text color' },
              { kind: 'color', key: 'pressUnselectedBackgroundColor', label: 'Background color' },
              { kind: 'color', key: 'pressUnselectedBorderColor', label: 'Border color' },
            ],
          },
          {
            kind: 'group', label: 'Selected', fields: [
              { kind: 'color', key: 'pressSelectedTextColor', label: 'Text color' },
              { kind: 'color', key: 'pressSelectedBackgroundColor', label: 'Background color' },
              { kind: 'color', key: 'pressSelectedBorderColor', label: 'Border color' },
            ],
          },
        ],
      },
    ],
  } as const,
  {
    kind: 'group',
    label: 'Fill text contrast',
    visibleWhen: (config: ChipAppearanceConfig) => config.colorMode !== 'custom',
    fields: [
      { kind: 'number', key: 'minContrastRatio', label: 'Target contrast ratio', min: 1, max: 21, step: 0.1, description: 'The filled text contrast target in manual and derived modes. Custom-state text colors are authored directly.' },
      { kind: 'number', key: 'lightInkTolerance', label: 'Light ink tolerance', min: 0, max: 20, step: 0.1, unit: 'ratio', description: 'Bounded contrast shortfall accepted when a lighter candidate is preferred over the strict target ratio above. Also feeds the unselected ink\'s own light-candidate search in "Derive from background" mode.' },
    ],
  } as const,
  {
    kind: 'group',
    label: 'Interactive states',
    fields: [
      { kind: 'number', key: 'hoverSurfaceOffset', label: 'Hover surface offset', min: -1, max: 1, step: 0.01, description: 'Lightens or darkens the base colors on hover.', visibleWhen: (config: ChipAppearanceConfig) => config.colorMode !== 'custom' },
      { kind: 'number', key: 'pressSurfaceOffset', label: 'Press surface offset', min: -1, max: 1, step: 0.01, description: 'Lightens or darkens the base colors while pressed.', visibleWhen: (config: ChipAppearanceConfig) => config.colorMode !== 'custom' },
      { kind: 'number', key: 'inactiveOpacity', label: 'Unselected opacity', min: 0, max: 1, step: 0.01, description: 'The unselected/border look\'s own opacity. The selected/filled look always renders at full opacity.' },
    ],
  } as const,
  {
    kind: 'group',
    label: 'Sizing',
    fields: [
      tailwindChipAppearanceField('paddingX', { key: 'paddingX', label: 'Padding · horizontal' }),
      tailwindChipAppearanceField('paddingY', { key: 'paddingY', label: 'Padding · vertical' }),
      tailwindChipAppearanceField('letterSpacing', { key: 'textTracking', label: 'Text tracking' }),
      tailwindChipAppearanceField('borderWidth', { key: 'borderWidth', label: 'Border width' }),
      { kind: 'number', key: 'borderOpacity', label: 'Border opacity', min: 0, max: 1, step: 0.01, description: 'Controls the border in selected and unselected states without fading the text or fill. Set Border width above 0px to see the effect.' },
    ],
  } as const,
]

export const CHIP_APPEARANCE_SCOPE_ID = 'Chip/appearance' as const

export const CHIP_APPEARANCE_PANEL = defineConfigScope<ChipAppearanceConfig>({
  id: CHIP_APPEARANCE_SCOPE_ID,
  component: 'Chip',
  scope: 'appearance',
  title: 'Chip Appearance',
  createdAt: '2026-10-03',
  defaultOpen: false,
  summary: 'Selected and unselected text, background, and border colors by state, plus sizing',
  defaultValue: DEFAULT_CHIP_APPEARANCE_CONFIG,
  fields: CHIP_APPEARANCE_FIELDS,
  copy: {
    targetFile: 'components/Chip/config/appearance.ts',
    targetSymbol: 'DEFAULT_CHIP_APPEARANCE_CONFIG',
    targetType: 'ChipAppearanceConfig',
    updateStrategy: 'merge',
    completeScope: false,
  },
})
