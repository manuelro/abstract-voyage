import { defineConfigScope } from '../../../components/Panel/config';
import { MARGIN_TOP_OPTIONS, PADDING_Y_OPTIONS } from '../../../components/tailwindSpacingScale';
import {
  DEFAULT_SPLIT_COLUMN_CARD_PREVIEW_CONFIG,
  type SplitColumnCardPreviewConfig,
} from './SplitColumnCardPreview.config';

export const SPLIT_COLUMN_CARD_PREVIEW_SCOPE_ID = 'SplitColumnCardPreview/layout' as const;

export const SPLIT_COLUMN_CARD_PREVIEW_PANEL = defineConfigScope<SplitColumnCardPreviewConfig>({
  id: SPLIT_COLUMN_CARD_PREVIEW_SCOPE_ID,
  component: 'SplitColumnCardPreview',
  scope: 'layout',
  title: 'Card preview spacing',
  createdAt: '2026-08-07',
  summary: 'Tabs-to-card separation',
  defaultOpen: false,
  defaultValue: DEFAULT_SPLIT_COLUMN_CARD_PREVIEW_CONFIG,
  fields: [
    {
      kind: 'select',
      key: 'tabsPaddingY',
      label: 'Tabs padding (Y)',
      description: 'Padding around the Articles/Labs tab row — pushes the card down via the tabs\' own bottom edge.',
      options: PADDING_Y_OPTIONS,
    },
    {
      kind: 'select',
      key: 'cardsMarginTop',
      label: 'Card margin (top)',
      description: 'Additional space above the card container, on top of the tabs padding. No effect in stack mode (Card stack → Enabled) — that presentation’s fixed/absolute card layer is independent of this wrapper’s own box; this only moves the flat (non-stack) card view.',
      options: MARGIN_TOP_OPTIONS,
    },
  ],
  copy: {
    targetFile: 'experiences/abstract/components/SplitColumnCardPreview.config.ts',
    targetSymbol: 'DEFAULT_SPLIT_COLUMN_CARD_PREVIEW_CONFIG',
    targetType: 'SplitColumnCardPreviewConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
