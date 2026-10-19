import { defineConfigScope } from '../../../../components/Panel/config';
import { createTailwindFieldFactory } from '../../../../components/Panel/config/tailwindFields';
import { QUOTE_HEADING_TEXT_FIELD, QUOTE_PANEL } from './Quote.panel';
import { DEFAULT_EDITORIAL_QUOTE_CONFIGS, type EditorialQuoteConfig, type EditorialVariant } from './editorialConfig';

const token = createTailwindFieldFactory<EditorialQuoteConfig>();
const quoteFields = QUOTE_PANEL.fields
  .filter(field => !(field.kind === 'text' && field.key === 'text'))
  // backgroundMode (in the Wall surface group below) is the single surface
  // switch and DERIVES gradientInkEnabled/paletteBackgroundEnabled, so those two
  // toggles are hidden here (they would be a second, conflicting way to say the
  // same thing). gradientInkRenderMode is NOT hidden: it is a genuine inherited
  // capability -- unified mesh vs CSS fallback -- that composes with a gradient
  // background, and every quote type must be able to choose it.
  .map(field => {
    if (field.kind !== 'group') return field;
    if (field.label === 'Source heading') {
      return { ...field, fields: field.fields.filter(inner => !('key' in inner && (inner.key === 'sourceHeadingText' || inner.key === 'headingAlign'))).map(inner =>
        'key' in inner && inner.key === 'sourceHeadingTopAligned'
          ? { ...inner, visibleWhen: (value: EditorialQuoteConfig) => value.headingEnabled && value.headingPlacement === 'inside-top' }
          : inner) };
    }
    if (field.label === 'Gradient ink' || field.label === 'Palette') {
      return { ...field, fields: field.fields.filter(inner => !('key' in inner && (inner.key === 'gradientInkEnabled' || inner.key === 'paletteBackgroundEnabled'))) };
    }
    return field;
  });

export function createEditorialQuotePanel(variant: EditorialVariant) {
  return defineConfigScope<EditorialQuoteConfig>({
    id: `Quote/editorial-${variant}`,
    component: 'EditorialQuote', scope: 'appearance',
    title: variant === 'practice' ? 'PRACTICE QUOTE' : `${variant.toUpperCase()} WALL QUOTE`,
    createdAt: '2026-10-13', defaultOpen: false,
    summary: 'Quote, source cue, link, rule and surface',
    defaultValue: DEFAULT_EDITORIAL_QUOTE_CONFIGS[variant],
    hiddenKeys: ['text', 'gradientInkEnabled', 'paletteBackgroundEnabled', ...(QUOTE_PANEL.hiddenKeys ?? [])],
    copy: {
      targetFile: 'experiences/abstract/components/Quote/editorialConfig.ts',
      targetSymbol: `${variant.toUpperCase()}_EDITORIAL_QUOTE_CONFIG`,
      targetType: 'EditorialQuoteConfig',
      updateStrategy: 'replace_scope',
      completeScope: true,
    },
    fields: [
      // Only the per-type concerns of the heading/link live here: presence,
      // placement, alignment, and label/content. Their look & feel (font size/
      // family/weight, color, padding, icon) is a SHARED scope -- see
      // QUOTE_HEADING_PANEL / QUOTE_SOURCE_LINK_PANEL in QuoteParts.panel.ts --
      // edited once and reflected on every quote type.
      { kind: 'group', label: 'Quote header', fields: [
        { kind: 'boolean', key: 'headingEnabled', label: 'Show source heading' },
        { ...QUOTE_HEADING_TEXT_FIELD, visibleWhen: (value: EditorialQuoteConfig) => value.headingEnabled },
        { kind: 'boolean', key: 'headingShowTitle', label: 'Show chapter title', visibleWhen: v => v.headingEnabled && !v.sourceHeadingText },
        { kind: 'boolean', key: 'headingShowPeriod', label: 'Show period', visibleWhen: v => v.headingEnabled && !v.sourceHeadingText },
        { kind: 'enum', key: 'headingPlacement', label: 'Placement', options: [{ label: 'ABOVE', value: 'before' }, { label: 'BELOW', value: 'after' }, { label: 'INSIDE TOP', value: 'inside-top' }, { label: 'INSIDE BOTTOM', value: 'inside-bottom' }], visibleWhen: v => v.headingEnabled },
        { kind: 'enum', key: 'headingAlign', label: 'Alignment', options: [{ label: 'LEFT', value: 'start' }, { label: 'CENTER', value: 'center' }, { label: 'RIGHT', value: 'end' }], visibleWhen: v => v.headingEnabled },
      ] },
      { kind: 'group', label: 'Source link', fields: [
        { kind: 'boolean', key: 'linkEnabled', label: 'Show link' },
        { kind: 'text', key: 'linkLabel', label: 'Link text', visibleWhen: v => v.linkEnabled },
        { kind: 'enum', key: 'linkPlacement', label: 'Placement', options: [{ label: 'ABOVE', value: 'before' }, { label: 'BELOW', value: 'after' }, { label: 'INSIDE TOP', value: 'inside-top' }, { label: 'INSIDE BOTTOM', value: 'inside-bottom' }], visibleWhen: v => v.linkEnabled },
        { kind: 'enum', key: 'linkAlign', label: 'Alignment', options: [{ label: 'START', value: 'start' }, { label: 'CENTER', value: 'center' }, { label: 'END', value: 'end' }], visibleWhen: v => v.linkEnabled },
      ] },
      { kind: 'group', label: 'Top rule', fields: [
        { kind: 'boolean', key: 'topRuleEnabled', label: 'Show top rule' },
        token('borderWidth', { key: 'topRuleWidth', label: 'Thickness', visibleWhen: v => v.topRuleEnabled }),
        { kind: 'color', key: 'topRuleColor', label: 'Color', visibleWhen: v => v.topRuleEnabled },
        { kind: 'number', key: 'topRuleOpacityPercent', label: 'Opacity', min: 0, max: 100, step: 1, unit: '%', visibleWhen: v => v.topRuleEnabled },
      ] },
      { kind: 'group', label: 'Wall surface', fields: [
        { kind: 'enum', key: 'backgroundMode', label: 'Background', options: [{ label: 'NONE', value: 'none' }, { label: 'SOLID', value: 'solid' }, { label: 'PALETTE', value: 'palette' }, { label: 'MESH', value: 'gradient' }] },
        { kind: 'color', key: 'solidBackgroundColor', label: 'Solid background', visibleWhen: v => v.backgroundMode === 'solid' },
        { kind: 'color', key: 'solidTextColor', label: 'Plain / fallback text color', visibleWhen: v => v.backgroundMode === 'none' || v.backgroundMode === 'solid' || v.backgroundMode === 'gradient' },
      ] },
      { kind: 'group', label: 'Adaptive quote size', fields: [
        { kind: 'boolean', key: 'adaptiveTypeEnabled', label: 'Fit long text', description: 'Opt in to reducing the chosen quote size to fit long passages. The configured quote size remains the maximum.' },
        token('fontSize', { key: 'adaptiveMinSize', label: 'Minimum size', visibleWhen: v => v.adaptiveTypeEnabled }),
        { kind: 'number', key: 'adaptiveMaxLines', label: 'Target maximum lines', min: 3, max: 16, step: 1, integer: true, visibleWhen: v => v.adaptiveTypeEnabled },
      ] },
      ...quoteFields,
    ],
  });
}
