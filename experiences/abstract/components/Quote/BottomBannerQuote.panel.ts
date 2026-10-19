import { defineConfigScope } from '../../../../components/Panel/config';
import type { ConfigScopeEntry } from '../../../../components/Panel/config/types';
import { createEditorialQuotePanel } from './EditorialQuote.panel';
import { DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG, type BottomBannerQuoteConfig } from './bottomBannerConfig';

const editorialPanel = createEditorialQuotePanel('featured');
// sourceHeadingText is content now (content/practices.md's quote.sourceHeading,
// overridden at the pages/wall.tsx call site), so it's pulled out of the
// "Quote header" group here and added to hiddenKeys below -- same technique
// EditorialQuote.panel.ts's own quoteFields filter already uses for `text`.
const featuredFields: ReadonlyArray<ConfigScopeEntry<BottomBannerQuoteConfig>> = editorialPanel.fields.map(field => {
  if (field.kind !== 'group' || field.label !== 'Quote header') return field;
  return { ...field, fields: field.fields.filter(inner => !('key' in inner && inner.key === 'sourceHeadingText')) };
});

export const BOTTOM_BANNER_QUOTE_PANEL = defineConfigScope<BottomBannerQuoteConfig>({
  id: 'Quote/bottom-banner',
  component: 'EditorialQuote',
  scope: 'appearance',
  title: 'Bottom banner quote',
  createdAt: '2026-10-15',
  defaultOpen: false,
  summary: 'Independent quote typography, ink and geometry; width follows the wall',
  defaultValue: DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG,
  // The banner's quote text, source heading, title, destination and
  // aria-label all live in content/practices.md now (pages/wall.tsx
  // overrides config.text/sourceHeadingText with that content, the same
  // "source always wins" pattern every other editorial variant already
  // uses for `text`) -- so both are hidden here like everywhere else,
  // this scope's own fields are appearance only.
  hiddenKeys: [...(editorialPanel.hiddenKeys ?? []), 'sourceHeadingText'],
  copy: {
    targetFile: 'experiences/abstract/components/Quote/bottomBannerConfig.ts',
    targetSymbol: 'DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG',
    targetType: 'BottomBannerQuoteConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
  fields: featuredFields,
});
