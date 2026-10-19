import { defineConfigScope } from '../../../../components/Panel/config';
import { BOTTOM_BANNER_QUOTE_PANEL } from './BottomBannerQuote.panel';
import { DEFAULT_FEATURED_WALL_QUOTE_CONFIG, type FeaturedWallQuoteConfig } from './featuredWallQuoteConfig';

/** Full quote controls for the wall lead; the authored heading stays in Markdown. */
export const FEATURED_WALL_QUOTE_PANEL = defineConfigScope<FeaturedWallQuoteConfig>({
  id: 'Quote/wall-featured',
  component: 'EditorialQuote',
  scope: 'appearance',
  title: 'Featured wall quote',
  createdAt: '2026-10-18',
  defaultOpen: false,
  summary: 'Featured quote typography, colors, alignment, padding and surface',
  defaultValue: DEFAULT_FEATURED_WALL_QUOTE_CONFIG,
  hiddenKeys: [...(BOTTOM_BANNER_QUOTE_PANEL.hiddenKeys ?? []), 'cardAspectRatioEnabled', 'geometryShape'],
  fields: BOTTOM_BANNER_QUOTE_PANEL.fields.map(field => field.kind === 'group' && field.label === 'Geometry'
    ? { ...field, fields: field.fields.filter(inner => !('key' in inner && (inner.key === 'cardAspectRatioEnabled' || inner.key === 'geometryShape'))) }
    : field),
  copy: {
    targetFile: 'experiences/abstract/components/Quote/featuredWallQuoteConfig.ts',
    targetSymbol: 'DEFAULT_FEATURED_WALL_QUOTE_CONFIG',
    targetType: 'FeaturedWallQuoteConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
