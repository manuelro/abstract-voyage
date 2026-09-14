import { defineConfigScope } from '../../../../components/Panel/config';
import { PADDING_X_OPTIONS, PADDING_Y_OPTIONS } from '../../../../components/tailwindSpacingScale';
import {
  DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG,
  MOBILE_PINNED_ARTICLE_SECTION_SCOPE_ID,
  type MobilePinnedArticleSectionConfig,
} from './MobilePinnedArticleSection.config';

export { MOBILE_PINNED_ARTICLE_SECTION_SCOPE_ID };

// Local catalog, same "each panel.ts keeps its own copy" convention as
// CtaButton.panel.ts/AboutTimeline.panel.ts/SplitColumnCardPreview's
// stack.panel.ts — all draw from the same 6-key CtaButtonMotionEasing union
// (CTA_BUTTON_MOTION_EASINGS, components/CtaButton/config/registered.ts)
// without importing a shared options array. `kind: 'select'`, not 'enum' —
// this field appears 4 times in this one panel, so 4 SegmentedControl rows
// of 6 buttons each read as an unreadable wall of inline labels; a native
// `<select>` dropdown collapses each down to one line until opened.
const MOTION_EASING_OPTIONS = [
  { label: 'LINEAR', value: 'linear' },
  { label: 'STANDARD', value: 'standard' },
  { label: 'EXPRESSIVE (default)', value: 'expressive' },
  { label: 'VISCOUS', value: 'viscous' },
  { label: 'GENTLE', value: 'gentle' },
  { label: 'GAUSSIAN', value: 'gaussian' },
] as const;

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
        kind: 'enum',
        key: 'fullListPresentation',
        label: 'Full-list presentation',
        description: 'Glass panel keeps the existing bottom-sheet view. Card flip rotates the active card 190° to reveal the complete article list and an in-card Close control on its reverse face.',
        options: [
          { label: 'Glass panel', value: 'glassPanel' },
          { label: 'Card flip', value: 'cardFlip' },
        ],
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
        key: 'panelExpandDurationMs',
        label: 'Expand: panel open',
        description: 'How long the panel takes to grow open when its full list is expanded.',
        min: 0,
        max: 1000,
        step: 10,
        unit: 'ms',
        integer: true,
      },
      {
        kind: 'select',
        key: 'panelExpandEasing',
        label: 'Expand: panel open easing',
        options: MOTION_EASING_OPTIONS,
      },
      {
        kind: 'number',
        key: 'rowFadeInDelayMs',
        label: 'Expand: pause before rows appear',
        description: 'Pause after the panel finishes opening, before the first row starts fading in. 0 = rows start the instant the panel finishes opening.',
        min: 0,
        max: 1000,
        step: 10,
        unit: 'ms',
        integer: true,
      },
      {
        kind: 'number',
        key: 'rowFadeInDurationMs',
        label: 'Expand: row fade-in',
        description: 'How long each row takes to fade its opacity in (no scale/transform). Rows chain: row 2 starts exactly when row 1 finishes, and so on — this one duration determines both a single row\'s fade and the whole cascade\'s total length.',
        min: 0,
        max: 1000,
        step: 10,
        unit: 'ms',
        integer: true,
      },
      {
        kind: 'select',
        key: 'rowFadeInEasing',
        label: 'Expand: row fade-in easing',
        options: MOTION_EASING_OPTIONS,
      },
      {
        kind: 'number',
        key: 'rowFadeOutDurationMs',
        label: 'Select: row fade-out',
        description: 'On tapping a row in the expanded list, how long each row takes to fade its opacity out (no scale/transform), chained the same way as the fade-in. The panel doesn\'t start closing until the last row finishes.',
        min: 0,
        max: 1000,
        step: 10,
        unit: 'ms',
        integer: true,
      },
      {
        kind: 'select',
        key: 'rowFadeOutEasing',
        label: 'Select: row fade-out easing',
        options: MOTION_EASING_OPTIONS,
      },
      {
        kind: 'number',
        key: 'panelCollapseDelayMs',
        label: 'Select: pause before panel closes',
        description: 'Pause after the last row has finished fading out, before the panel starts closing. 0 = the panel starts closing the instant the last row disappears.',
        min: 0,
        max: 1000,
        step: 10,
        unit: 'ms',
        integer: true,
      },
      {
        kind: 'number',
        key: 'panelCollapseDurationMs',
        label: 'Select: panel close',
        description: 'How long the persistent glass panel takes to return to its compact height, or the flipped card takes to return to its front face. The carousel card behind glass returns to full opacity over this same duration.',
        min: 0,
        max: 1000,
        step: 10,
        unit: 'ms',
        integer: true,
      },
      {
        kind: 'select',
        key: 'panelCollapseEasing',
        label: 'Select: panel close easing',
        options: MOTION_EASING_OPTIONS,
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
