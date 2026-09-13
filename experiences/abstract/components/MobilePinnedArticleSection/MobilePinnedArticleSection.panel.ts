import { defineConfigScope } from '../../../../components/Panel/config';
import { PADDING_X_OPTIONS, PADDING_Y_OPTIONS } from '../../../../components/tailwindSpacingScale';
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
    // selectMotionEasing/expandedEnterEasing/expandedSelectEasing are each a
    // 4-number cubic-bezier tuple — no field `kind` supports a tuple
    // control, so they're hidden rather than rendered; the duration/stagger
    // fields below are the tunable surface.
    hiddenKeys: ['listHeightPercent', 'selectMotionEasing', 'expandedEnterEasing', 'expandedSelectEasing'],
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
        // unreadable wall of overlapping/truncated labels. The shared
        // PADDING_X_OPTIONS/PADDING_Y_OPTIONS catalogs below have 34
        // entries each (tailwindSpacingScale.ts).
        kind: 'select',
        key: 'expandedListPaddingX',
        label: 'Expanded list horizontal padding',
        options: PADDING_X_OPTIONS,
      },
      {
        kind: 'select',
        key: 'expandedListPaddingY',
        label: 'Expanded list vertical padding',
        options: PADDING_Y_OPTIONS,
      },
      {
        kind: 'color',
        key: 'expandedListBackgroundColor',
        label: 'Expanded list background',
        description: 'Leave empty to inherit the panel’s own background color.',
      },
      { kind: 'number', key: 'expandedListBackgroundOpacity', label: 'Expanded list background opacity', min: 0, max: 1, step: 0.01 },
      {
        kind: 'number',
        key: 'expandedListBackdropBlurPx',
        label: 'Expanded list backdrop blur',
        min: 0,
        max: 40,
        step: 1,
        unit: 'px',
      },
      {
        kind: 'number',
        key: 'expandedCarouselBehindOpacity',
        label: 'Card opacity behind expanded list',
        description: 'Opacity of the collapsed carousel card still visible above the list while it\'s expanded.',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        kind: 'boolean',
        key: 'expandedForcesMaxBackgroundDarken',
        label: 'Expanding forces max background darken',
        description: 'While the list is expanded, force the page\'s own scroll-gradient background to its maximum darken level, independent of the real scroll position — so the backdrop reads as settled while reading instead of chasing scroll position during a scroll-locked, modal-like view.',
      },
      {
        kind: 'number',
        key: 'expandedEnterDurationMs',
        label: 'Expand: row fade-in',
        description: 'When the panel opens, how long each row takes to fade its opacity in (no scale/transform).',
        min: 0,
        max: 1000,
        step: 10,
        unit: 'ms',
        integer: true,
      },
      {
        kind: 'number',
        key: 'expandedEnterStaggerMs',
        label: 'Expand: row fade-in stagger',
        description: 'Delay added per row (item 1 first, item N last) so the expand entrance cascades top to bottom instead of every row fading in at once. 0 = no stagger.',
        min: 0,
        max: 300,
        step: 5,
        unit: 'ms',
        integer: true,
      },
      {
        kind: 'number',
        key: 'expandedSelectFadeOutDurationMs',
        label: 'Select: row fade-out',
        description: 'On tapping a row in the expanded list, how long every row takes to fade its opacity out (no scale/transform). The list is reordered to its final selection only once every row is fully invisible.',
        min: 0,
        max: 1000,
        step: 10,
        unit: 'ms',
        integer: true,
      },
      {
        kind: 'number',
        key: 'expandedSelectStaggerMs',
        label: 'Select: row fade-out stagger',
        description: 'Delay added per row in the SAME direction as the entrance — item 1 fades first, the last row fades last — so the exit cascades top to bottom. The panel doesn\'t collapse until the last row finishes. 0 = no stagger.',
        min: 0,
        max: 300,
        step: 5,
        unit: 'ms',
        integer: true,
      },
      {
        kind: 'number',
        key: 'expandedSelectHoldMs',
        label: 'Select: hold before collapse',
        description: 'Pause after every row has finished fading out and the list has been reordered, before the panel starts collapsing. 0 = no pause.',
        min: 0,
        max: 1000,
        step: 10,
        unit: 'ms',
        integer: true,
      },
      {
        kind: 'number',
        key: 'panelCollapseDurationMs',
        label: 'Select: panel collapse',
        description: 'Should match styles.module.css\'s .panel transition duration — kept here so the JS-side settle timer stays in sync with the CSS collapse.',
        min: 0,
        max: 1000,
        step: 10,
        unit: 'ms',
        integer: true,
      },
      {
        kind: 'number',
        key: 'listSettleDurationMs',
        label: 'Select: short-list settle-in',
        description: 'How long the collapsed short list takes to fade/slide into its new order once the panel finishes collapsing.',
        min: 0,
        max: 1000,
        step: 10,
        unit: 'ms',
        integer: true,
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
