import { defineConfigScope } from '../../../../components/Panel/config';
import {
  DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG,
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
    ],
    copy: {
      targetFile: 'experiences/abstract/components/MobilePinnedArticleSection/MobilePinnedArticleSection.config.ts',
      targetSymbol: 'DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG',
      targetType: 'MobilePinnedArticleSectionConfig',
      updateStrategy: 'replace_scope',
      completeScope: true,
    },
  });
