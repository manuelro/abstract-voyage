import { defineConfigScope, definePageConfigScope } from '../components/Panel/config';
import { POLYMORPHIC_LAYOUT_FIELDS } from '../experiences/abstract/components/PolymorphicLayout.panel';
import type { PolymorphicLayoutConfig } from '../experiences/abstract/components/PolymorphicLayout.config';
import { ABOUT_MOBILE_ACCORDION_TYPOGRAPHY_FIELDS } from '../experiences/about/components/AboutMobileAccordion.panel';
import type { AboutMobileAccordionConfig } from '../experiences/about/components/AboutMobileAccordion.config';
import {
  ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG,
  DEFAULT_ABSTRACT_FOOTER_CONFIG,
  DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG,
  DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG,
  DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG,
  DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG,
  DEFAULT_ABSTRACT_MOBILE_ARTICLE_LIST_INK_CONFIG,
  type AbstractNarrowColumnStackConfig,
  type AbstractTimelineContentConfig,
  type AbstractPageLayoutConfig,
  type AbstractMobileArticleListInkConfig,
  type AbstractFooterConfig,
} from './abstract.config';
import {
  BORDER_TOP_WIDTH_OPTIONS,
  GAP_OPTIONS,
  MARGIN_TOP_OPTIONS,
  PADDING_BOTTOM_OPTIONS,
  PADDING_TOP_OPTIONS,
  PADDING_X_OPTIONS,
  PADDING_Y_OPTIONS,
} from '../components/tailwindSpacingScale';
import {
  FONT_SIZE_OPTIONS,
  FONT_WEIGHT_OPTIONS,
} from '../components/tailwindTypographyScale';

export const ABSTRACT_PAGE_LAYOUT_SCOPE_ID = 'AbstractPage/layout' as const;
export const ABSTRACT_NARROW_COLUMN_STACK_SCOPE_ID = 'AbstractPage/narrowColumnStack' as const;
export const ABSTRACT_FOOTER_SCOPE_ID = 'AbstractPage/footer' as const;

// /abstract's own instance of the shared PolymorphicLayoutConfig field
// structure (components/PolymorphicLayout.panel.ts's own
// POLYMORPHIC_LAYOUT_FIELDS — the identical array reference pages/about.panel.ts
// and pages/posts-lab/postLab.panel.ts already use for their own scopes, not
// a filtered/rebuilt copy). definePageConfigScope (not the plain
// defineConfigScope ABSTRACT_PAGE_LAYOUT_PANEL below uses) because
// PolymorphicLayoutConfig is now shared by three pages — see that helper's
// own doc comment. Replaces components/SplitColumnLayout.panel.ts's own
// ABSTRACT_SPLIT_COLUMN_LAYOUT_PANEL, which is now dead — abstract.tsx edits
// these fields from this scope instead. Titled exactly "Polymorphic
// Layout" — the same generic name every PolymorphicLayoutConfig-integrated
// page uses, so it reads at a glance as "this page runs on the shared
// system."
export const ABSTRACT_POLYMORPHIC_LAYOUT_PANEL = definePageConfigScope<PolymorphicLayoutConfig>({
  component: 'SplitColumnLayout',
  scope: 'layout',
  pageName: 'Abstract',
  title: 'Polymorphic Layout',
  createdAt: '2026-08-17',
  summary: 'Content container, column split, color source, header split band',
  defaultOpen: false,
  fields: POLYMORPHIC_LAYOUT_FIELDS,
  defaultValue: ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG,
  // Same fix as ABOUT_POLYMORPHIC_LAYOUT_PANEL (pages/about.panel.ts) —
  // pages/abstract.config.ts only re-exports this object (PLAN-POLYMORPHIC-
  // LAYOUT-PAGE-CONFIG-PARITY.md moved the real definition here); a
  // component-config-update payload targeting the old file has nothing to
  // patch and silently fails to persist.
  targetFile: 'experiences/abstract/components/PolymorphicLayout.pageConfigs.ts',
  targetSymbol: 'ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG',
  targetType: 'PolymorphicLayoutConfig',
});

export const ABSTRACT_PAGE_LAYOUT_PANEL = defineConfigScope<AbstractPageLayoutConfig>({
  id: ABSTRACT_PAGE_LAYOUT_SCOPE_ID,
  component: 'AbstractPage',
  scope: 'layout',
  title: 'Abstract page presentation',
  createdAt: '2026-08-07',
  summary: 'Split-column (new) vs. classic',
  defaultOpen: false,
  defaultValue: DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG,
  fields: [
    {
      kind: 'enum',
      key: 'presentationMode',
      label: 'Presentation',
      description: 'Split column (default): the new stacked-hero + single-card-preview layout. Classic: today\'s splitRow hero + full Journal/Labs tabbed collection, kept fully working as a fallback.',
      options: [
        { label: 'SPLIT COLUMN', value: 'splitColumn' },
        { label: 'CLASSIC', value: 'classic' },
      ],
    },
  ],
  copy: {
    targetFile: 'pages/abstract.config.ts',
    targetSymbol: 'DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG',
    targetType: 'AbstractPageLayoutConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});

const HORIZONTAL_ALIGN_OPTIONS = [
  { label: 'START', value: 'start' },
  { label: 'CENTER', value: 'center' },
  { label: 'END', value: 'end' },
  { label: 'STRETCH', value: 'stretch' },
] as const;
const VERTICAL_ALIGN_OPTIONS = [
  { label: 'START', value: 'start' },
  { label: 'CENTER', value: 'center' },
  { label: 'END', value: 'end' },
] as const;

export const ABSTRACT_NARROW_COLUMN_STACK_PANEL = defineConfigScope<AbstractNarrowColumnStackConfig>({
  id: ABSTRACT_NARROW_COLUMN_STACK_SCOPE_ID,
  component: 'AbstractNarrowColumnStack',
  scope: 'layout',
  title: 'Narrow column stack',
  createdAt: '2026-09-01',
  summary: 'Top and bottom region proportions and content alignment',
  defaultOpen: false,
  defaultValue: DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG,
  fields: [
    {
      kind: 'group',
      label: 'Region proportions',
      fields: [
        {
          kind: 'number',
          key: 'topRegionPercent',
          label: 'Top region weight',
          description: 'Top region share of the available height. The top and bottom values are normalized as relative weights so the stack always fills its parent.',
          min: 1,
          max: 99,
          step: 1,
        },
        {
          kind: 'number',
          key: 'bottomRegionPercent',
          label: 'Bottom region weight',
          description: 'Bottom region share of the available height. Defaults to 62 against the top region\'s 38.',
          min: 1,
          max: 99,
          step: 1,
        },
      ],
    },
    {
      kind: 'boolean',
      key: 'invertOrder',
      label: 'Invert visual order',
      description: 'Swap the top and bottom content positions while keeping each region’s own size and alignment settings. DOM and keyboard reading order remain top then bottom.',
    },
    {
      kind: 'group',
      label: 'Top content',
      fields: [
        {
          kind: 'enum',
          key: 'topHorizontalAlign',
          label: 'Horizontal alignment',
          options: HORIZONTAL_ALIGN_OPTIONS,
        },
        {
          kind: 'enum',
          key: 'topVerticalAlign',
          label: 'Vertical alignment',
          options: VERTICAL_ALIGN_OPTIONS,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Bottom content',
      fields: [
        {
          kind: 'enum',
          key: 'bottomHorizontalAlign',
          label: 'Horizontal alignment',
          options: HORIZONTAL_ALIGN_OPTIONS,
        },
        {
          kind: 'enum',
          key: 'bottomVerticalAlign',
          label: 'Vertical alignment',
          options: VERTICAL_ALIGN_OPTIONS,
        },
      ],
    },
  ],
  copy: {
    targetFile: 'pages/abstract.config.ts',
    targetSymbol: 'DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG',
    targetType: 'AbstractNarrowColumnStackConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});

export const ABSTRACT_FOOTER_PANEL = defineConfigScope<AbstractFooterConfig>({
  id: ABSTRACT_FOOTER_SCOPE_ID,
  component: 'SiteFooter',
  scope: 'content',
  title: 'Footer',
  createdAt: '2026-09-14',
  summary: 'Page links, contact line, spacing, color, and scroll-gradient return',
  defaultOpen: false,
  defaultValue: DEFAULT_ABSTRACT_FOOTER_CONFIG,
  fields: [
    {
      kind: 'boolean',
      key: 'enabled',
      label: 'Show footer',
    },
    {
      kind: 'group',
      label: 'Surface and ink',
      fields: [
        {
          kind: 'enum',
          key: 'backgroundMode',
          label: 'Background',
          options: [
            { label: 'TRANSPARENT', value: 'transparent' },
            { label: 'SURFACE', value: 'surface' },
            { label: 'CUSTOM', value: 'custom' },
            { label: 'GRADIENT DARKEST', value: 'gradientDarkest' },
          ],
        },
        {
          kind: 'color',
          key: 'backgroundColor',
          label: 'Background color',
          visibleWhen: config => config.backgroundMode === 'custom',
        },
        {
          kind: 'number',
          key: 'backgroundOpacity',
          label: 'Background opacity',
          description: 'Alpha applied on top of the resolved background color. No effect while Background is TRANSPARENT.',
          min: 0,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.backgroundMode !== 'transparent',
        },
        {
          kind: 'enum',
          key: 'textColorMode',
          label: 'Text color',
          options: [
            { label: 'DERIVED', value: 'derived' },
            { label: 'CUSTOM', value: 'custom' },
          ],
        },
        {
          kind: 'color',
          key: 'textColor',
          label: 'Title/contact color',
          visibleWhen: config => config.textColorMode === 'custom',
        },
        {
          kind: 'color',
          key: 'descriptionColor',
          label: 'Description color',
          visibleWhen: config => config.textColorMode === 'custom',
        },
        {
          kind: 'number',
          key: 'textSurfaceOffset',
          label: 'Title/contact offset',
          min: -1,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.textColorMode === 'derived',
        },
        {
          kind: 'number',
          key: 'descriptionSurfaceOffset',
          label: 'Description offset',
          min: -1,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.textColorMode === 'derived',
        },
        {
          kind: 'boolean',
          key: 'adaptiveInkEnabled',
          label: 'Adaptive scroll ink',
          description: 'Use the same scroll-driven white-mix and contrast correction as the hero text.',
        },
        {
          kind: 'number',
          key: 'adaptiveInkMaxAmount',
          label: 'Adaptive max mix',
          min: 0,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.adaptiveInkEnabled,
        },
        {
          kind: 'number',
          key: 'adaptiveInkTargetContrastRatio',
          label: 'Adaptive contrast target',
          min: 0,
          max: 21,
          step: 0.1,
          visibleWhen: config => config.adaptiveInkEnabled,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Layout',
      fields: [
        {
          kind: 'select',
          key: 'sectionPaddingYClassName',
          label: 'Section vertical padding',
          description: 'Tailwind vertical padding scale.',
          options: PADDING_Y_OPTIONS,
        },
        {
          kind: 'select',
          key: 'pageItemGapClassName',
          label: 'Page item gap',
          description: 'Tailwind gap scale.',
          options: GAP_OPTIONS,
        },
        {
          kind: 'select',
          key: 'pageItemPaddingYClassName',
          label: 'Item vertical padding',
          description: 'Tailwind vertical padding scale.',
          options: PADDING_Y_OPTIONS,
        },
        {
          kind: 'select',
          key: 'pageItemPaddingXClassName',
          label: 'Item horizontal padding',
          description: 'Tailwind horizontal padding scale.',
          options: PADDING_X_OPTIONS,
        },
        {
          kind: 'select',
          key: 'pageTitlePaddingBottomClassName',
          label: 'Title bottom padding',
          description: 'Tailwind padding-bottom scale.',
          options: PADDING_BOTTOM_OPTIONS,
        },
        {
          kind: 'select',
          key: 'pageTitleFontSizeClassName',
          label: 'Title font size',
          options: FONT_SIZE_OPTIONS,
        },
        {
          kind: 'select',
          key: 'pageTitleFontWeightClassName',
          label: 'Title font weight',
          options: FONT_WEIGHT_OPTIONS,
        },
        {
          kind: 'select',
          key: 'pageDescriptionPaddingTopClassName',
          label: 'Description top padding',
          description: 'Tailwind padding-top scale.',
          options: PADDING_TOP_OPTIONS,
        },
        {
          kind: 'select',
          key: 'pageDescriptionMarginTopClassName',
          label: 'Title-description gap',
          description: 'Tailwind margin-top scale for the space between each footer link title and description.',
          options: MARGIN_TOP_OPTIONS,
        },
        {
          kind: 'select',
          key: 'pageDescriptionFontSizeClassName',
          label: 'Description font size',
          options: FONT_SIZE_OPTIONS,
        },
        {
          kind: 'select',
          key: 'pageDescriptionFontWeightClassName',
          label: 'Description font weight',
          options: FONT_WEIGHT_OPTIONS,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Page links',
      fields: [
        {
          kind: 'boolean',
          key: 'pageLinkBulletEnabled',
          label: 'Show link bullet',
          description: 'Opt-in active-item marker inherited from the shared accordion item.',
        },
        {
          kind: 'boolean',
          key: 'pageLinkBorderEnabled',
          label: 'Show link dividers',
          description: 'Opt-in separator line on each footer page item.',
        },
        {
          kind: 'select',
          key: 'pageLinkBorderWidthClassName',
          label: 'Divider thickness',
          description: 'Tailwind border-top width scale.',
          options: BORDER_TOP_WIDTH_OPTIONS,
          visibleWhen: config => config.pageLinkBorderEnabled,
        },
        {
          kind: 'enum',
          key: 'pageLinkBorderColorMode',
          label: 'Divider color',
          options: [
            { label: 'DERIVED', value: 'derived' },
            { label: 'CUSTOM', value: 'custom' },
          ],
          visibleWhen: config => config.pageLinkBorderEnabled,
        },
        {
          kind: 'number',
          key: 'pageLinkBorderSurfaceOffset',
          label: 'Divider color offset',
          min: -1,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.pageLinkBorderEnabled && config.pageLinkBorderColorMode === 'derived',
        },
        {
          kind: 'color',
          key: 'pageLinkBorderColor',
          label: 'Divider custom color',
          visibleWhen: config => config.pageLinkBorderEnabled && config.pageLinkBorderColorMode === 'custom',
        },
        {
          kind: 'number',
          key: 'pageLinkBorderOpacity',
          label: 'Divider opacity',
          min: 0,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.pageLinkBorderEnabled,
        },
        { kind: 'boolean', key: 'abstractEnabled', label: 'Show Abstract' },
        { kind: 'text', key: 'abstractTitle', label: 'Abstract title' },
        { kind: 'text', key: 'abstractDescription', label: 'Abstract description' },
        { kind: 'boolean', key: 'aboutEnabled', label: 'Show About' },
        { kind: 'text', key: 'aboutTitle', label: 'About title' },
        { kind: 'text', key: 'aboutDescription', label: 'About description' },
        { kind: 'boolean', key: 'journalEnabled', label: 'Show Journal' },
        { kind: 'text', key: 'journalTitle', label: 'Journal title' },
        { kind: 'text', key: 'journalDescription', label: 'Journal description' },
        { kind: 'boolean', key: 'contactEnabled', label: 'Show Contact' },
        { kind: 'text', key: 'contactTitle', label: 'Contact title' },
        { kind: 'text', key: 'contactDescription', label: 'Contact description' },
      ],
    },
    {
      kind: 'group',
      label: 'Top border',
      fields: [
        {
          kind: 'boolean',
          key: 'topBorderEnabled',
          label: 'Show top border',
          description: 'A single rule along the whole footer’s top edge, separate from the per-item link dividers above.',
        },
        {
          kind: 'select',
          key: 'topBorderWidthClassName',
          label: 'Top border thickness',
          description: 'Tailwind border-top width scale.',
          options: BORDER_TOP_WIDTH_OPTIONS,
          visibleWhen: config => config.topBorderEnabled,
        },
        {
          kind: 'enum',
          key: 'topBorderColorMode',
          label: 'Top border color',
          options: [
            { label: 'DERIVED', value: 'derived' },
            { label: 'CUSTOM', value: 'custom' },
            { label: 'GRADIENT DARKEST', value: 'gradientDarkest' },
          ],
          visibleWhen: config => config.topBorderEnabled,
        },
        {
          kind: 'number',
          key: 'topBorderSurfaceOffset',
          label: 'Top border color offset',
          min: -1,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.topBorderEnabled && config.topBorderColorMode === 'derived',
        },
        {
          kind: 'color',
          key: 'topBorderColor',
          label: 'Top border custom color',
          visibleWhen: config => config.topBorderEnabled && config.topBorderColorMode === 'custom',
        },
        {
          kind: 'number',
          key: 'topBorderOpacity',
          label: 'Top border opacity',
          min: 0,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.topBorderEnabled,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Contact and wordmark',
      fields: [
        { kind: 'text', key: 'navigationLabel', label: 'Navigation label' },
        {
          kind: 'select',
          key: 'contactFontSizeClassName',
          label: 'Contact font size',
          options: FONT_SIZE_OPTIONS,
        },
        {
          kind: 'select',
          key: 'contactFontWeightClassName',
          label: 'Contact font weight',
          options: FONT_WEIGHT_OPTIONS,
        },
        {
          kind: 'boolean',
          key: 'contactEmailEnabled',
          label: 'Show email line',
        },
        {
          kind: 'select',
          key: 'contactSpaceBeforeClassName',
          label: 'Space before contact',
          description: 'Tailwind margin-top scale.',
          options: MARGIN_TOP_OPTIONS,
        },
        {
          kind: 'text',
          key: 'contactText',
          label: 'Contact email',
          description: 'Rendered as a mailto link.',
          visibleWhen: config => config.contactEmailEnabled,
        },
        {
          kind: 'select',
          key: 'wordmarkSpaceBeforeClassName',
          label: 'Space before wordmark',
          description: 'Tailwind margin-top scale.',
          options: MARGIN_TOP_OPTIONS,
        },
        {
          kind: 'number',
          key: 'wordmarkOpacity',
          label: 'Wordmark opacity',
          min: 0,
          max: 1,
          step: 0.01,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Scroll-gradient return',
      fields: [
        {
          kind: 'boolean',
          key: 'backgroundReturnToLightEnabled',
          label: 'Return gradient to light',
          description: 'Opt-in phase that eases the scroll-gradient dark overlay back down once the footer starts.',
        },
        {
          kind: 'number',
          key: 'backgroundReturnToLightRangeVh',
          label: 'Return range',
          min: 0.1,
          max: 4,
          step: 0.1,
          unit: 'vh',
          visibleWhen: config => config.backgroundReturnToLightEnabled,
        },
        {
          kind: 'number',
          key: 'backgroundReturnToLightFinalDarken',
          label: 'Final darken',
          min: 0,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.backgroundReturnToLightEnabled,
        },
      ],
    },
  ],
  copy: {
    targetFile: 'pages/abstract.config.ts',
    targetSymbol: 'DEFAULT_ABSTRACT_FOOTER_CONFIG',
    targetType: 'AbstractFooterConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});

export const ABSTRACT_TIMELINE_CONTENT_SCOPE_ID = 'AbstractPage/timelineContent' as const;

export const ABSTRACT_TIMELINE_CONTENT_PANEL = defineConfigScope<AbstractTimelineContentConfig>({
  id: ABSTRACT_TIMELINE_CONTENT_SCOPE_ID,
  component: 'AboutTimeline',
  scope: 'content',
  title: 'Timeline content',
  createdAt: '2026-09-02',
  summary: 'Visible article count and ordering shared with CoverFlow',
  defaultOpen: false,
  defaultValue: DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG,
  fields: [
    {
      kind: 'number',
      key: 'visibleItemCount',
      label: 'Visible article count',
      description: 'How many articles appear in both the timeline and CoverFlow. The selected ordering determines which top N articles are retained.',
      min: 1,
      max: 100,
      step: 1,
      integer: true,
    },
    {
      kind: 'enum',
      key: 'order',
      label: 'Article order',
      description: 'Controls the shared sequence used by the timeline and CoverFlow. Newest first is the current publication order.',
      options: [
        { label: 'NEWEST FIRST', value: 'newest' },
        { label: 'OLDEST FIRST', value: 'oldest' },
        { label: 'TITLE A–Z', value: 'titleAsc' },
        { label: 'TITLE Z–A', value: 'titleDesc' },
      ],
    },
  ],
  copy: {
    targetFile: 'pages/abstract.config.ts',
    targetSymbol: 'DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG',
    targetType: 'AbstractTimelineContentConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});

export const ABSTRACT_MOBILE_ARTICLE_LIST_INK_SCOPE_ID = 'AbstractPage/mobileArticleListInk' as const;

/**
 * Single shared ink color for the mobile article list's own row text —
 * see AbstractMobileArticleListInkConfig's own doc comment
 * (pages/abstract.config.ts) for why this replaced two independently-
 * tinted active/inactive colors. Operator ask, PLAN-MOBILE-ARTICLE-LIST-
 * SHARED-INK.md.
 */
export const ABSTRACT_MOBILE_ARTICLE_LIST_INK_PANEL = defineConfigScope<AbstractMobileArticleListInkConfig>({
  id: ABSTRACT_MOBILE_ARTICLE_LIST_INK_SCOPE_ID,
  component: 'AboutTimeline',
  scope: 'appearance',
  title: 'Mobile article list ink',
  createdAt: '2026-09-13',
  summary: 'Shared tint, saturation, and lightness bounds for the mobile article list\'s row text',
  defaultOpen: false,
  defaultValue: DEFAULT_ABSTRACT_MOBILE_ARTICLE_LIST_INK_CONFIG,
  fields: [
    {
      kind: 'number',
      key: 'hue',
      label: 'Tint (hue)',
      description: 'The row text\'s own fixed hue, independent of whatever the scroll-gradient background currently is. Active vs. inactive rows share this exact color — only opacity (AboutTimeline\'s own existing knobs) tells them apart.',
      min: 0,
      max: 360,
      step: 1,
      unit: '°',
    },
    {
      kind: 'number',
      key: 'saturation',
      label: 'Saturation',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
    },
    {
      kind: 'number',
      key: 'minLightness',
      label: 'Min light',
      description: 'Floor when the ink resolves to a light color — never dimmer than this, even if the target contrast ratio would technically allow it.',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
    },
    {
      kind: 'number',
      key: 'minDarkness',
      label: 'Min dark',
      description: 'The equivalent floor on the dark side — how much darkness is guaranteed when the ink resolves to a dark color, never lighter than (100 - this value).',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
    },
    {
      kind: 'number',
      key: 'minContrastRatio',
      label: 'Guaranteed contrast ratio',
      min: 1,
      max: 21,
      step: 0.5,
    },
  ],
  copy: {
    targetFile: 'pages/abstract.config.ts',
    targetSymbol: 'DEFAULT_ABSTRACT_MOBILE_ARTICLE_LIST_INK_CONFIG',
    targetType: 'AbstractMobileArticleListInkConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});

export const ABSTRACT_HERO_ACCORDION_ITEM_SCOPE_ID = 'AbstractPage/heroAccordionItem' as const;

/**
 * AbstractEditorialHero's own accordionItemPresentationEnabled (AbstractEditorialHero
 * .config.ts) reuses AboutMobileAccordionItem verbatim — this scope exposes
 * that reused item's own font-size/spacing/open-indicator controls,
 * extracted from AboutMobileAccordion.panel.ts's own MOBILE_ONLY_FIELDS
 * (ABOUT_MOBILE_ACCORDION_TYPOGRAPHY_FIELDS) rather than a second,
 * hand-retyped copy of the same five field definitions. Bound to this
 * page's OWN instance (DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG,
 * abstract.config.ts) — not /about's own ABOUT_MOBILE_ACCORDION_PANEL scope
 * — so a panel edit here never retunes /about's real mobile accordion, and
 * vice versa (same class of bug ABOUT_DEFAULT_DOCK_PALETTE_CONFIG's own doc
 * comment, about.config.ts, already documents and fixes for a different
 * scope).
 */
export const ABSTRACT_HERO_ACCORDION_ITEM_PANEL = defineConfigScope<AboutMobileAccordionConfig>({
  id: ABSTRACT_HERO_ACCORDION_ITEM_SCOPE_ID,
  component: 'AbstractEditorialHero',
  scope: 'appearance',
  title: 'Hero accordion item',
  createdAt: '2026-09-12',
  summary: 'Font size, spacing, and header wrap for the reused accordion-item hero presentation',
  defaultOpen: false,
  defaultValue: DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG,
  fields: ABOUT_MOBILE_ACCORDION_TYPOGRAPHY_FIELDS,
  // This scope deliberately exposes only the four typography/spacing fields
  // above — every other AboutMobileAccordionConfig key (chevron rotation/
  // timing, borders, open-indicator size/overlap, etc.) is intentionally
  // left at this page's own default rather than duplicated into a second
  // full accordion panel; an operator wanting those retunes them via
  // /about's own "Accordion" panel instead, since this presentation reuses
  // that same component's visual language. defineConfigScope requires every
  // defaultValue key to be explicitly accounted for (rendered OR hidden) —
  // this is the "hidden" half of that split.
  hiddenKeys: [
    'enabled', 'previewMinHeight', 'maxExpandedItems', 'collapseLeadFraction',
    'transitionMs', 'transitionEasing', 'contentSettleMs',
    'affordanceRotationDurationMs', 'affordanceRotationEasing',
    'affordanceBorderThicknessClassName', 'affordanceCornerRadiusClassName',
    'affordanceDimensionClassName', 'affordanceRotateCollapsedDeg', 'affordanceRotateExpandedDeg',
    'affordanceColorMode', 'affordanceCustomColor',
    'affordanceHoverOpacity', 'affordanceHoverTransitionMs', 'affordanceHoverEasing',
    'affordanceMouseOutTransitionMs', 'affordanceMouseOutEasing',
    'outerBorderColorMode', 'outerBorderSurfaceOffset', 'outerBorderCustomColor', 'outerBorderWidthClassName',
    'innerBorderColorMode', 'innerBorderSurfaceOffset', 'innerBorderCustomColor',
    'innerBorderOpacity', 'innerBorderWidthClassName',
    'textColorMode', 'textSurfaceOffset', 'textCustomColor',
    'openIndicatorEnabled', 'openIndicatorSizeClassName', 'openIndicatorOverlapFraction',
  ],
  copy: {
    targetFile: 'pages/abstract.config.ts',
    targetSymbol: 'DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG',
    targetType: 'AboutMobileAccordionConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
