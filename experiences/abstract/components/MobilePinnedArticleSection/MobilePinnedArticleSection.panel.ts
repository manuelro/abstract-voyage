import { defineConfigScope } from '../../../../components/Panel/config';
import {
  DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG,
  EXPANDED_LIST_PADDING_X_TOKENS,
  EXPANDED_LIST_PADDING_Y_TOKENS,
  MOBILE_PINNED_ARTICLE_SECTION_SCOPE_ID,
  type MobilePinnedArticleSectionConfig,
} from './MobilePinnedArticleSection.config';

export { MOBILE_PINNED_ARTICLE_SECTION_SCOPE_ID };

export const MOBILE_PINNED_ARTICLE_SECTION_PANEL =
  defineConfigScope<MobilePinnedArticleSectionConfig>({
    id: MOBILE_PINNED_ARTICLE_SECTION_SCOPE_ID,
    component: 'MobilePinnedArticleSection',
    scope: 'layout',
    title: 'Mobile pinned articles',
    createdAt: '2026-09-03',
    summary: 'Mobile carousel and article-list viewport proportions',
    defaultOpen: false,
    defaultValue: DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG,
    hiddenKeys: ['listHeightPercent'],
    fields: [
      { kind: 'number', key: 'visibleRowsLargePhone', label: 'Rows on large phones', min: 1, max: 6, step: 1, integer: true },
      { kind: 'number', key: 'visibleRowsSmallPhone', label: 'Rows on small phones', min: 1, max: 6, step: 1, integer: true },
      { kind: 'number', key: 'smallPhoneMaxHeightPx', label: 'Small phone height', min: 480, max: 900, step: 10, unit: 'px', integer: true },
      { kind: 'number', key: 'expandedPanelHeightPercent', label: 'Expanded panel height', min: 50, max: 95, step: 1, unit: '%' },
      { kind: 'number', key: 'carouselHeightPercent', label: 'Carousel height', min: 40, max: 80, step: 1, unit: '%' },
      { kind: 'number', key: 'panelOpacity', label: 'Panel opacity', min: 0, max: 1, step: 0.01 },
      { kind: 'number', key: 'peekHeightSvh', label: 'Initial peek height', min: 4, max: 24, step: 1, unit: 'svh' },
      { kind: 'number', key: 'scrollEffortMultiplier', label: 'Scroll effort multiplier', min: 0.5, max: 2, step: 0.05 },
      {
        kind: 'boolean',
        key: 'scrollDrivenNavigationEnabled',
        label: 'Scroll-driven carousel nav',
        description: 'Off (default): only the list and carousel swipe change the active article. On: page scroll also drives it (legacy behavior).',
      },
      {
        // 'select', not 'enum' — AGENTS.md's own hard ceiling: past ~6-8
        // options, a SegmentedControl row (kind: 'enum') renders as an
        // unreadable wall of overlapping/truncated labels. Both token
        // catalogs below have 9 entries.
        kind: 'select',
        key: 'expandedListPaddingX',
        label: 'Expanded list horizontal padding',
        options: EXPANDED_LIST_PADDING_X_TOKENS.map(value => ({ label: value.toUpperCase(), value })),
      },
      {
        kind: 'select',
        key: 'expandedListPaddingY',
        label: 'Expanded list vertical padding',
        options: EXPANDED_LIST_PADDING_Y_TOKENS.map(value => ({ label: value.toUpperCase(), value })),
      },
      {
        kind: 'color',
        key: 'expandedListBackgroundColor',
        label: 'Expanded list background',
        description: 'Leave empty to inherit the panel’s own background color.',
      },
      { kind: 'number', key: 'expandedListBackgroundOpacity', label: 'Expanded list background opacity', min: 0, max: 1, step: 0.01 },
    ],
    copy: {
      targetFile: 'experiences/abstract/components/MobilePinnedArticleSection/MobilePinnedArticleSection.config.ts',
      targetSymbol: 'DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG',
      targetType: 'MobilePinnedArticleSectionConfig',
      updateStrategy: 'replace_scope',
      completeScope: true,
    },
  });
