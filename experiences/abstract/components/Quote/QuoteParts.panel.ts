import { defineConfigScope } from '../../../../components/Panel/config';
import { createTailwindFieldFactory } from '../../../../components/Panel/config/tailwindFields';
import {
  DEFAULT_QUOTE_HEADING_APPEARANCE,
  DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE,
  type QuoteHeadingAppearanceConfig,
  type QuoteSourceLinkAppearanceConfig,
} from './quotePartsConfig';

// Two SHARED scopes: one heading appearance and one link appearance for the whole
// app. Editing either here reflects on every quote type. Only look-and-feel lives
// here; presence/placement/label stay on the per-type editorial panel.

const headingField = createTailwindFieldFactory<QuoteHeadingAppearanceConfig>();

export const QUOTE_HEADING_PANEL = defineConfigScope<QuoteHeadingAppearanceConfig>({
  id: 'Quote/heading-appearance',
  component: 'QuoteHeading', scope: 'appearance',
  title: 'QUOTE SOURCE HEADING (shared)',
  createdAt: '2026-10-13', defaultOpen: false,
  summary: 'Styles the chapter title and period inside each wall quote',
  defaultValue: DEFAULT_QUOTE_HEADING_APPEARANCE,
  copy: {
    targetFile: 'experiences/abstract/components/Quote/quotePartsConfig.ts',
    targetSymbol: 'DEFAULT_QUOTE_HEADING_APPEARANCE',
    targetType: 'QuoteHeadingAppearanceConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
  fields: [
    headingField('fontSize', { key: 'size', label: 'Font size', description: 'Shared default. A quote type with a custom header size takes precedence.' }),
    headingField('fontFamily', { key: 'fontFamily', label: 'Source heading font family', description: 'Applies to the chapter title and period inside each wall quote.' }),
    headingField('fontWeight', { key: 'fontWeight', label: 'Source heading font weight', description: 'Instrument Sans supports the full range. Instrument Serif has one regular face; heavier weights are synthesized, while lighter weights may appear alike.' }),
    headingField('letterSpacing', { key: 'tracking', label: 'Letter spacing', description: 'Shared default. A quote type with custom header letter spacing takes precedence.' }),
    headingField('textTransform', { key: 'textTransform', label: 'Text transform' }),
    { kind: 'number', key: 'opacityPercent', label: 'Opacity', description: 'Shared default. A quote type with custom header opacity takes precedence.', min: 0, max: 100, step: 1, integer: true, unit: '%' },
    {
      kind: 'enum', key: 'colorMode', label: 'Text color',
      description: 'INHERIT uses the quote\'s own computed ink color; CUSTOM uses the color below.',
      options: [{ label: 'INHERIT INK', value: 'inherit' }, { label: 'CUSTOM', value: 'custom' }],
    },
    { kind: 'color', key: 'color', label: 'Custom color', visibleWhen: v => v.colorMode === 'custom' },
    headingField('paddingTop', { key: 'paddingTop', label: 'Top padding' }),
    headingField('paddingRight', { key: 'paddingRight', label: 'Right padding' }),
    headingField('paddingBottom', { key: 'paddingBottom', label: 'Bottom padding' }),
    headingField('paddingLeft', { key: 'paddingLeft', label: 'Left padding' }),
  ],
});

const linkField = createTailwindFieldFactory<QuoteSourceLinkAppearanceConfig>();

export const QUOTE_SOURCE_LINK_PANEL = defineConfigScope<QuoteSourceLinkAppearanceConfig>({
  id: 'Quote/source-link-appearance',
  component: 'QuoteSourceLink', scope: 'appearance',
  title: 'WALL QUOTE SOURCE LINK (shared)',
  createdAt: '2026-10-13', defaultOpen: false,
  summary: 'Source link look & feel, shared by every quote',
  defaultValue: DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE,
  copy: {
    targetFile: 'experiences/abstract/components/Quote/quotePartsConfig.ts',
    targetSymbol: 'DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE',
    targetType: 'QuoteSourceLinkAppearanceConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
  fields: [
    linkField('fontSize', { key: 'size', label: 'Font size' }),
    linkField('fontFamily', { key: 'fontFamily', label: 'Font family' }),
    linkField('fontWeight', { key: 'fontWeight', label: 'Font weight' }),
    linkField('letterSpacing', { key: 'tracking', label: 'Letter spacing' }),
    {
      kind: 'enum', key: 'colorMode', label: 'Text color',
      description: 'INHERIT uses the quote\'s own computed ink color; CUSTOM uses the color below.',
      options: [{ label: 'INHERIT INK', value: 'inherit' }, { label: 'CUSTOM', value: 'custom' }],
    },
    { kind: 'color', key: 'color', label: 'Custom color', visibleWhen: v => v.colorMode === 'custom' },
    linkField('paddingTop', { key: 'paddingTop', label: 'Top padding' }),
    linkField('paddingRight', { key: 'paddingRight', label: 'Right padding' }),
    linkField('paddingBottom', { key: 'paddingBottom', label: 'Bottom padding' }),
    linkField('paddingLeft', { key: 'paddingLeft', label: 'Left padding' }),
    {
      kind: 'enum', key: 'icon', label: 'Icon',
      options: [{ label: 'NONE', value: 'none' }, { label: 'UP RIGHT', value: 'arrow-up-right' }, { label: 'RIGHT', value: 'arrow-right' }],
    },
    { kind: 'enum', key: 'iconPlacement', label: 'Icon position', options: [{ label: 'BEFORE', value: 'before' }, { label: 'AFTER', value: 'after' }], visibleWhen: v => v.icon !== 'none' },
    linkField('fontSize', { key: 'iconSize', label: 'Icon size', visibleWhen: v => v.icon !== 'none' }),
    linkField('gap', { key: 'iconGap', label: 'Icon gap', visibleWhen: v => v.icon !== 'none' }),
  ],
});
