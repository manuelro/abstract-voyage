import { createTailwindFieldFactory, defineConfigScope, definePageConfigScope } from '../components/Panel/config'
import { ABOUT_TIMELINE_PANEL_FIELDS } from '../experiences/about/components/AboutTimeline.panel'
import { CHRONOLOGY_TIMELINE_FIELDS } from '../components/ChronologyTimeline/ChronologyTimeline.panel'
import type { ChronologyTimelineConfig } from '../components/ChronologyTimeline/ChronologyTimeline.config'
import type { AboutMobileAccordionConfig } from '../experiences/about/components/AboutMobileAccordion.config'
import { EDITORIAL_ACCORDION_ITEM_FIELDS, EDITORIAL_ACCORDION_ITEM_HIDDEN_KEYS } from '../experiences/about/components/EditorialAccordionItem.panel'
import { CARD_APPEARANCE_PANEL } from '../experiences/abstract/components/Card/config/appearance.panel'
import type { CardAppearanceConfig } from '../experiences/abstract/components/Card/config/appearance'
import { POLYMORPHIC_LAYOUT_FIELDS } from '../experiences/abstract/components/PolymorphicLayout.panel'
import type { PolymorphicLayoutConfig } from '../experiences/abstract/components/PolymorphicLayout.config'
import { ARTICLE_FILTER_FIELDS } from '../experiences/journal/components/ArticleFilter/ArticleFilter.panel'
import type { ArticleFilterConfig } from '../experiences/journal/components/ArticleFilter/ArticleFilter.config'
import {
  DEFAULT_JOURNAL_ACCORDION_ITEM_CONFIG,
  DEFAULT_JOURNAL_CARD_APPEARANCE_CONFIG,
  DEFAULT_JOURNAL_INTRO_ACCORDION_ITEM_CONFIG,
  DEFAULT_JOURNAL_NARROW_COLUMN_CONTENT_CONFIG,
  DEFAULT_JOURNAL_TIMELINE_CONFIG,
  DEFAULT_JOURNAL_CHRONOLOGY_CONFIG,
  DEFAULT_JOURNAL_ARTICLE_FILTER_CONFIG,
  DEFAULT_JOURNAL_CHIP_APPEARANCE_CONFIG,
  JOURNAL_POLYMORPHIC_LAYOUT_CONFIG,
  type JournalArticleAccordionItemConfig,
  type JournalChipAppearanceConfig,
  type JournalNarrowColumnContentConfig,
  type JournalTimelineConfig,
} from './journal.config'

// CSS `text-wrap`'s full keyword set — see JournalAccordionTextWrap's own
// doc comment (pages/journal.config.ts) for why this is a plain enum, not
// a generated Tailwind utility-family field.
const ACCORDION_TEXT_WRAP_OPTIONS = [
  { label: 'WRAP', value: 'wrap' },
  { label: 'NOWRAP', value: 'nowrap' },
  { label: 'BALANCE', value: 'balance' },
  { label: 'PRETTY', value: 'pretty' },
  { label: 'STABLE', value: 'stable' },
] as const

const journalArticleAccordionItemTailwindField = createTailwindFieldFactory<JournalArticleAccordionItemConfig>()

export const JOURNAL_INTRO_ACCORDION_ITEM_SCOPE_ID = 'Journal/EditorialAccordionItem/appearance' as const
export const JOURNAL_INTRO_ACCORDION_ITEM_PANEL = defineConfigScope<AboutMobileAccordionConfig>({
  id: JOURNAL_INTRO_ACCORDION_ITEM_SCOPE_ID,
  component: 'EditorialAccordionItem',
  scope: 'appearance',
  title: 'Introduction accordion item',
  createdAt: '2026-10-01',
  defaultOpen: false,
  summary: 'Breakpoint-specific typography and spacing for the narrow-column introduction',
  defaultValue: DEFAULT_JOURNAL_INTRO_ACCORDION_ITEM_CONFIG,
  fields: EDITORIAL_ACCORDION_ITEM_FIELDS,
  hiddenKeys: EDITORIAL_ACCORDION_ITEM_HIDDEN_KEYS,
  copy: {
    targetFile: 'pages/journal.config.ts',
    targetSymbol: 'DEFAULT_JOURNAL_INTRO_ACCORDION_ITEM_CONFIG',
    targetType: 'AboutMobileAccordionConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
})

// Operator ask (2026-10-01): article items (the wide-column link list) must
// be live-editable "via config, segregated by breakpoint" — previously
// DEFAULT_JOURNAL_ACCORDION_ITEM_CONFIG was a hardcoded constant with no
// panel binding at all (pages/journal.tsx passed it straight through,
// un-editable). Reuses the exact same shared EDITORIAL_ACCORDION_ITEM_FIELDS/
// MOBILE-TABLET-DESKTOP tabs as the Introduction panel above and Abstract's
// own hero accordion item — same "one generated field tree, independent
// writable scope per consumer" precedent EDITORIAL_ACCORDION_ITEM_FIELDS's
// own doc comment already documents (see pages/journal.editorialAccordion.test.ts's
// first assertion for the Introduction panel's own version of this check).
export const JOURNAL_ARTICLE_ACCORDION_ITEM_SCOPE_ID = 'Journal/EditorialAccordionItem/articleAppearance' as const
export const JOURNAL_ARTICLE_ACCORDION_ITEM_PANEL = defineConfigScope<JournalArticleAccordionItemConfig>({
  id: JOURNAL_ARTICLE_ACCORDION_ITEM_SCOPE_ID,
  component: 'EditorialAccordionItem',
  scope: 'articleAppearance',
  title: 'Article item',
  createdAt: '2026-10-01',
  defaultOpen: false,
  summary: 'Breakpoint-specific typography and spacing for the wide-column article link list — same accordion item at every breakpoint',
  defaultValue: DEFAULT_JOURNAL_ACCORDION_ITEM_CONFIG,
  // EDITORIAL_ACCORDION_ITEM_FIELDS (shared with the Introduction panel and
  // Abstract's hero item) plus this panel's own journal-only text-wrap
  // group — moved here from the Timeline panel's "Article links" group
  // (operator ask, 2026-10-02): this is the one live panel actually bound
  // to the article rows, so journal-only additions belong on its own
  // config type (JournalArticleAccordionItemConfig), not duplicated next
  // to it on a second, competing panel.
  fields: [
    ...EDITORIAL_ACCORDION_ITEM_FIELDS,
    // Operator-reported (2026-10-04): the description appeared to carry a
    // hardcoded 1.25rem bottom gap. Root cause — itemContentPaddingBottom/
    // -Wide (AboutMobileAccordionConfig's own fields, defaulting to 'pb-5'/
    // 'md:pb-5') ARE config, not a JSX literal, but EDITORIAL_ACCORDION_ITEM_HIDDEN_KEYS
    // hides them on every panel that reuses EDITORIAL_ACCORDION_ITEM_FIELDS
    // (About's own interactive accordion owns that spacing instead — see
    // that shared file's own doc comment). Exposed here, on this panel only
    // (its own local `fields`/`hiddenKeys` below, not the shared file), since
    // this is the one panel actually bound to the wide-column article rows.
    {
      kind: 'group',
      label: 'Content spacing',
      fields: [
        journalArticleAccordionItemTailwindField('paddingBottom', {
          key: 'itemContentPaddingBottom',
          label: 'Description bottom padding · Mobile',
          description: 'Space below the description, inside the row. Also applies at desktop — this field has no separate desktop tier.',
        }),
        journalArticleAccordionItemTailwindField('paddingBottom', {
          breakpoint: 'md',
          key: 'itemContentPaddingBottomWide',
          label: 'Description bottom padding · Tablet',
        }),
      ],
    },
    {
      kind: 'group',
      label: 'Text wrap',
      fields: [
        {
          kind: 'enum', key: 'titleTextWrap', label: 'Title text wrap · Mobile',
          description: 'How the title breaks across lines. WRAP (default): plain greedy fill. BALANCE: evens out line lengths (can push a word to the next line even if it fits). PRETTY: avoids a short orphan on the last line. STABLE: like BALANCE but stable through an expanding/collapsing container. NOWRAP: never breaks.',
          options: ACCORDION_TEXT_WRAP_OPTIONS,
        },
        {
          kind: 'enum', key: 'titleTextWrapWide', label: 'Title text wrap · Tablet',
          options: ACCORDION_TEXT_WRAP_OPTIONS,
        },
        {
          kind: 'enum', key: 'titleTextWrapLg', label: 'Title text wrap · Desktop',
          options: ACCORDION_TEXT_WRAP_OPTIONS,
        },
        {
          kind: 'enum', key: 'descriptionTextWrap', label: 'Description text wrap · Mobile',
          description: 'Same text-wrap keywords as the title, applied to the description paragraph instead.',
          options: ACCORDION_TEXT_WRAP_OPTIONS,
        },
        {
          kind: 'enum', key: 'descriptionTextWrapWide', label: 'Description text wrap · Tablet',
          options: ACCORDION_TEXT_WRAP_OPTIONS,
        },
        {
          kind: 'enum', key: 'descriptionTextWrapLg', label: 'Description text wrap · Desktop',
          options: ACCORDION_TEXT_WRAP_OPTIONS,
        },
      ],
    },
  ],
  // Own copy, not the shared EDITORIAL_ACCORDION_ITEM_HIDDEN_KEYS reference
  // (editing that array would also unhide these two fields on the
  // Introduction panel and Abstract's hero item) — itemContentPaddingBottom/
  // -Wide removed since the "Content spacing" group above now covers them.
  hiddenKeys: EDITORIAL_ACCORDION_ITEM_HIDDEN_KEYS.filter(
    key => key !== 'itemContentPaddingBottom' && key !== 'itemContentPaddingBottomWide',
  ),
  copy: {
    targetFile: 'pages/journal.config.ts',
    targetSymbol: 'DEFAULT_JOURNAL_ACCORDION_ITEM_CONFIG',
    targetType: 'JournalArticleAccordionItemConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
})

const journalNarrowColumnContentTailwindField = createTailwindFieldFactory<JournalNarrowColumnContentConfig>()

export const JOURNAL_NARROW_COLUMN_CONTENT_SCOPE_ID = 'Journal/NarrowColumnContent/appearance' as const
export const JOURNAL_NARROW_COLUMN_CONTENT_PANEL = defineConfigScope<JournalNarrowColumnContentConfig>({
  id: JOURNAL_NARROW_COLUMN_CONTENT_SCOPE_ID,
  component: 'EditorialAccordionItem',
  scope: 'narrowColumnContent',
  title: 'Narrow column content',
  createdAt: '2026-10-01',
  defaultOpen: false,
  summary: 'Opt-in visibility and breakpoint-tabbed title/description typography for the narrow column introduction',
  defaultValue: DEFAULT_JOURNAL_NARROW_COLUMN_CONTENT_CONFIG,
  fields: [
    {
      kind: 'boolean',
      key: 'titleEnabled',
      label: 'Show title',
      description: 'Shows or hides just the introduction\'s own title, independent of its description. Applies at every breakpoint the content itself is shown.',
      visibleWhen: config => config.enabled || config.enabledWide || config.enabledLg,
    },
    {
      kind: 'enum',
      key: 'typographySource',
      label: 'Typography source',
      description: 'Introduction (default): follow the "Introduction accordion item" panel\'s own font size/weight/spacing at every breakpoint. Custom: tune title and description independently below instead.',
      options: [{ label: 'INTRODUCTION', value: 'introduction' }, { label: 'CUSTOM', value: 'custom' }],
      visibleWhen: config => config.enabled || config.enabledWide || config.enabledLg,
    },
    {
      kind: 'tabs',
      tabs: [
        {
          id: 'mobile',
          label: 'MOBILE (< 768px)',
          fields: [
            { kind: 'boolean', key: 'enabled', label: 'Show narrow column content', description: 'Shows or hides the entire narrow-column introduction on mobile.' },
            {
              kind: 'group',
              label: 'Title',
              visibleWhen: config => config.enabled && config.titleEnabled && config.typographySource === 'custom',
              fields: [
                journalNarrowColumnContentTailwindField('fontSize', { key: 'titleFontSize', label: 'Title font size' }),
                journalNarrowColumnContentTailwindField('fontWeight', { key: 'titleFontWeight', label: 'Title weight' }),
                { kind: 'number', key: 'titleOpacity', label: 'Title opacity', min: 0, max: 1, step: 0.01 },
                { kind: 'number', key: 'titleLineHeight', label: 'Title line height', min: 1, max: 2.5, step: 0.025 },
              ],
            },
            {
              kind: 'group',
              label: 'Description',
              visibleWhen: config => config.enabled && config.typographySource === 'custom',
              fields: [
                journalNarrowColumnContentTailwindField('fontSize', { key: 'descriptionFontSize', label: 'Description font size' }),
                journalNarrowColumnContentTailwindField('paddingTop', { key: 'descriptionPaddingTop', label: 'Description top spacing' }),
                { kind: 'number', key: 'descriptionOpacity', label: 'Description opacity', min: 0, max: 1, step: 0.01 },
                { kind: 'number', key: 'descriptionLineHeight', label: 'Description line height', min: 1, max: 2.5, step: 0.025 },
              ],
            },
          ],
        },
        {
          id: 'tablet',
          label: 'TABLET (≥ 768px)',
          fields: [
            { kind: 'boolean', key: 'enabledWide', label: 'Show narrow column content', description: 'Shows or hides the entire narrow-column introduction on tablet.' },
            {
              kind: 'group',
              label: 'Title',
              visibleWhen: config => config.enabledWide && config.titleEnabled && config.typographySource === 'custom',
              fields: [
                journalNarrowColumnContentTailwindField('fontSize', { breakpoint: 'md', key: 'titleFontSizeWide', label: 'Title font size' }),
                journalNarrowColumnContentTailwindField('fontWeight', { breakpoint: 'md', key: 'titleFontWeightWide', label: 'Title weight' }),
              ],
            },
            {
              kind: 'group',
              label: 'Description',
              visibleWhen: config => config.enabledWide && config.typographySource === 'custom',
              fields: [
                journalNarrowColumnContentTailwindField('fontSize', { breakpoint: 'md', key: 'descriptionFontSizeWide', label: 'Description font size' }),
                journalNarrowColumnContentTailwindField('paddingTop', { breakpoint: 'md', key: 'descriptionPaddingTopWide', label: 'Description top spacing' }),
              ],
            },
          ],
        },
        {
          id: 'desktop',
          label: 'DESKTOP (≥ 1024px)',
          fields: [
            { kind: 'boolean', key: 'enabledLg', label: 'Show narrow column content', description: 'Shows or hides the entire narrow-column introduction on desktop.' },
            {
              kind: 'group',
              label: 'Title',
              visibleWhen: config => config.enabledLg && config.titleEnabled && config.typographySource === 'custom',
              fields: [
                journalNarrowColumnContentTailwindField('fontSize', { breakpoint: 'lg', key: 'titleFontSizeLg', label: 'Title font size' }),
                journalNarrowColumnContentTailwindField('fontWeight', { breakpoint: 'lg', key: 'titleFontWeightLg', label: 'Title weight' }),
              ],
            },
            {
              kind: 'group',
              label: 'Description',
              visibleWhen: config => config.enabledLg && config.typographySource === 'custom',
              fields: [
                journalNarrowColumnContentTailwindField('fontSize', { breakpoint: 'lg', key: 'descriptionFontSizeLg', label: 'Description font size' }),
                journalNarrowColumnContentTailwindField('paddingTop', { breakpoint: 'lg', key: 'descriptionPaddingTopLg', label: 'Description top spacing' }),
              ],
            },
          ],
        },
      ],
    },
  ],
  copy: {
    targetFile: 'pages/journal.config.ts',
    targetSymbol: 'DEFAULT_JOURNAL_NARROW_COLUMN_CONTENT_CONFIG',
    targetType: 'JournalNarrowColumnContentConfig',
    updateStrategy: 'merge',
    completeScope: false,
  },
})

export const JOURNAL_TIMELINE_SCOPE_ID = 'Journal/AboutTimeline/appearance' as const
const journalTimelineTailwindField = createTailwindFieldFactory<JournalTimelineConfig>()

export const JOURNAL_CHRONOLOGY_PANEL = defineConfigScope<ChronologyTimelineConfig>({
  id: 'Journal/ChronologyTimeline/appearance',
  component: 'ChronologyTimeline',
  scope: 'appearance',
  title: 'Chronology',
  createdAt: '2026-10-02',
  defaultOpen: false,
  summary: 'Opt-in year and month rail for dated articles',
  defaultValue: DEFAULT_JOURNAL_CHRONOLOGY_CONFIG,
  fields: [...CHRONOLOGY_TIMELINE_FIELDS],
  copy: { targetFile: 'pages/journal.config.ts', targetSymbol: 'DEFAULT_JOURNAL_CHRONOLOGY_CONFIG', targetType: 'ChronologyTimelineConfig', updateStrategy: 'merge', completeScope: false },
})

export const JOURNAL_TIMELINE_PANEL = defineConfigScope<JournalTimelineConfig>({
  id: JOURNAL_TIMELINE_SCOPE_ID,
  component: 'AboutTimeline',
  scope: 'appearance',
  title: 'Timeline',
  createdAt: '2026-09-02',
  defaultOpen: false,
  summary: 'Article timeline appearance and optional one-column accordion item links',
  defaultValue: DEFAULT_JOURNAL_TIMELINE_CONFIG,
  fields: [
    ...ABOUT_TIMELINE_PANEL_FIELDS,
    {
      kind: 'group',
      label: 'Article links',
      fields: [
        { kind: 'boolean', key: 'accordionLinksEnabled', label: 'Use accordion item links', description: 'Show each article title and description in an always-open, non-expandable link item.' },
        journalTimelineTailwindField('gap', {
          key: 'accordionItemGap',
          label: 'Item gap',
          description: 'Space between article links in the one-column grid.',
          visibleWhen: config => config.accordionLinksEnabled,
        }),
        {
          kind: 'enum', key: 'accordionTextStyleSource', label: 'Text style source',
          description: 'Follow the narrow-column introduction live, or use the "Article item" panel\'s own font size/spacing below.',
          options: [{ label: 'INTRODUCTION', value: 'intro' }, { label: 'CUSTOM', value: 'custom' }],
          visibleWhen: config => config.accordionLinksEnabled,
        },
        journalTimelineTailwindField('fontWeight', {
          key: 'accordionTitleFontWeight',
          label: 'Title weight · Mobile',
          visibleWhen: config => config.accordionLinksEnabled,
        }),
        journalTimelineTailwindField('fontWeight', {
          breakpoint: 'md',
          key: 'accordionTitleFontWeightWide',
          label: 'Title weight · Tablet',
          visibleWhen: config => config.accordionLinksEnabled,
        }),
        journalTimelineTailwindField('fontWeight', {
          breakpoint: 'lg',
          key: 'accordionTitleFontWeightLg',
          label: 'Title weight · Desktop',
          visibleWhen: config => config.accordionLinksEnabled,
        }),
        { kind: 'number', key: 'accordionTitleOpacity', label: 'Title opacity', min: 0, max: 1, step: 0.01, visibleWhen: config => config.accordionLinksEnabled && config.accordionTextStyleSource === 'custom' },
        { kind: 'number', key: 'accordionDescriptionOpacity', label: 'Description opacity', min: 0, max: 1, step: 0.01, visibleWhen: config => config.accordionLinksEnabled && config.accordionTextStyleSource === 'custom' },
        { kind: 'number', key: 'accordionTitleLineHeight', label: 'Title line height', min: 1, max: 2.5, step: 0.025, visibleWhen: config => config.accordionLinksEnabled && config.accordionTextStyleSource === 'custom' },
        { kind: 'number', key: 'accordionDescriptionLineHeight', label: 'Description line height', min: 1, max: 2.5, step: 0.025, visibleWhen: config => config.accordionLinksEnabled && config.accordionTextStyleSource === 'custom' },
        {
          kind: 'enum', key: 'accordionEmphasisColorMode', label: 'Bold word color',
          description: 'Inherit (default): **bold** words render at the row\'s own ink, just brighter (emphasisOpacity). Custom: an explicit color for bold words only.',
          options: [{ label: 'INHERIT', value: 'inherit' }, { label: 'CUSTOM', value: 'custom' }],
          visibleWhen: config => config.accordionLinksEnabled,
        },
        {
          kind: 'color', key: 'accordionEmphasisCustomColor', label: 'Bold word custom color',
          visibleWhen: config => config.accordionLinksEnabled && config.accordionEmphasisColorMode === 'custom',
        },
      ],
    },
  ],
  copy: { targetFile: 'pages/journal.config.ts', targetSymbol: 'DEFAULT_JOURNAL_TIMELINE_CONFIG', targetType: 'JournalTimelineConfig', updateStrategy: 'merge', completeScope: false },
})

export const JOURNAL_CARD_APPEARANCE_SCOPE_ID = 'Journal/Card/appearance' as const
export const JOURNAL_CARD_APPEARANCE_PANEL = defineConfigScope<CardAppearanceConfig>({
  id: JOURNAL_CARD_APPEARANCE_SCOPE_ID,
  component: 'Card',
  scope: 'appearance',
  title: 'Card Appearance',
  createdAt: '2026-09-02',
  defaultOpen: false,
  summary: 'Shared card surface, ink, and visual transitions',
  defaultValue: DEFAULT_JOURNAL_CARD_APPEARANCE_CONFIG,
  fields: CARD_APPEARANCE_PANEL.fields,
  copy: { targetFile: 'pages/journal.config.ts', targetSymbol: 'DEFAULT_JOURNAL_CARD_APPEARANCE_CONFIG', targetType: 'CardAppearanceConfig', updateStrategy: 'merge', completeScope: false },
})

// Operator ask (2026-10-03): a category filter for the narrow-column
// content, placed below it and sharing its own enabled/enabledWide/enabledLg
// breakpoint visibility (JOURNAL_NARROW_COLUMN_CONTENT_PANEL above) — the
// filter is nested inside that same wrapping div in pages/journal.tsx
// rather than owning a second, parallel visibility knob.
export const JOURNAL_ARTICLE_FILTER_SCOPE_ID = 'Journal/ArticleFilter/appearance' as const
export const JOURNAL_ARTICLE_FILTER_PANEL = defineConfigScope<ArticleFilterConfig>({
  id: JOURNAL_ARTICLE_FILTER_SCOPE_ID,
  component: 'ArticleFilter',
  scope: 'appearance',
  title: 'Article filter',
  createdAt: '2026-10-03',
  defaultOpen: false,
  summary: 'Category chip filter for the article list — chip count, spacing, opacity, and per-breakpoint font size',
  defaultValue: DEFAULT_JOURNAL_ARTICLE_FILTER_CONFIG,
  fields: [...ARTICLE_FILTER_FIELDS],
  copy: {
    targetFile: 'pages/journal.config.ts',
    targetSymbol: 'DEFAULT_JOURNAL_ARTICLE_FILTER_CONFIG',
    targetType: 'JournalArticleFilterConfig',
    updateStrategy: 'merge',
    completeScope: false,
  },
})

const journalChipTailwindField = createTailwindFieldFactory<JournalChipAppearanceConfig>()

// One tint per state drives the fill and border of every article filter chip.
// Text is chosen automatically against each state's fill and page surface.
export const JOURNAL_CHIP_APPEARANCE_SCOPE_ID = 'Journal/Chip/appearance' as const
export const JOURNAL_CHIP_APPEARANCE_PANEL = defineConfigScope<JournalChipAppearanceConfig>({
  id: JOURNAL_CHIP_APPEARANCE_SCOPE_ID,
  component: 'Chip',
  scope: 'appearance',
  title: 'Chip Appearance',
  createdAt: '2026-10-03',
  defaultOpen: false,
  summary: 'Filter chips and article category tags: tint, contrast, opacity, and sizing',
  defaultValue: DEFAULT_JOURNAL_CHIP_APPEARANCE_CONFIG,
  fields: [
    {
      kind: 'tabs', tabs: [
        {
          id: 'journal-chip-default', label: 'DEFAULT', fields: [
            { kind: 'color', key: 'tintColor', label: 'Tint', description: 'Shared background and border color. Default text keeps this tint’s hue.' },
            { kind: 'number', key: 'backgroundOpacity', label: 'Background opacity', min: 0, max: 1, step: 0.01 },
            { kind: 'number', key: 'textOpacity', label: 'Text opacity', min: 0, max: 1, step: 0.01, description: 'Fades only the contrast-aware chip label.' },
            { kind: 'number', key: 'contrastSensitivity', label: 'Contrast sensitivity', min: 0, max: 1, step: 0.01, description: '0 keeps the tint unchanged; 1 shifts its lightness fully toward black or white, whichever contrasts with the chip background.' },
            { kind: 'number', key: 'borderOpacity', label: 'Border opacity', min: 0, max: 1, step: 0.01 },
          ],
        },
        {
          id: 'journal-chip-hover', label: 'HOVER', fields: [
            { kind: 'color', key: 'hoverTintColor', label: 'Tint', description: 'Shared background and border color for hovered or selected chips.' },
            { kind: 'number', key: 'hoverBackgroundOpacity', label: 'Background opacity', min: 0, max: 1, step: 0.01 },
            { kind: 'number', key: 'hoverTextOpacity', label: 'Text opacity', min: 0, max: 1, step: 0.01, description: 'Fades the contrast-aware label on hovered or selected chips.' },
            { kind: 'number', key: 'hoverContrastSensitivity', label: 'Contrast sensitivity', min: 0, max: 1, step: 0.01, description: 'For hovered or selected chips: 0 keeps the tint unchanged; 1 shifts its lightness fully toward black or white for contrast.' },
            { kind: 'number', key: 'hoverBorderOpacity', label: 'Border opacity', min: 0, max: 1, step: 0.01 },
          ],
        },
        {
          id: 'journal-chip-article-tag', label: 'ARTICLE TAG', fields: [
            { kind: 'color', key: 'articleTagTintColor', label: 'Tint', description: 'Background and border tint for the category tag below each article.' },
            { kind: 'number', key: 'articleTagBackgroundOpacity', label: 'Background opacity', min: 0, max: 1, step: 0.01 },
            { kind: 'number', key: 'articleTagTextOpacity', label: 'Text opacity', min: 0, max: 1, step: 0.01 },
            { kind: 'number', key: 'articleTagContrastSensitivity', label: 'Contrast sensitivity', min: 0, max: 1, step: 0.01, description: '0 keeps the tint unchanged; 1 shifts text lightness fully toward the higher-contrast side.' },
            { kind: 'number', key: 'articleTagBorderOpacity', label: 'Border opacity', min: 0, max: 1, step: 0.01 },
            journalChipTailwindField('borderWidth', { key: 'articleTagBorderWidth', label: 'Border width' }),
            journalChipTailwindField('paddingX', { key: 'articleTagPaddingX', label: 'Padding · horizontal' }),
            journalChipTailwindField('paddingY', { key: 'articleTagPaddingY', label: 'Padding · vertical' }),
            journalChipTailwindField('letterSpacing', { key: 'articleTagTextTracking', label: 'Text tracking' }),
            journalChipTailwindField('fontSize', { key: 'articleTagFontSize', label: 'Font size' }),
          ],
        },
      ],
    },
    {
      kind: 'group', label: 'Sizing', fields: [
        journalChipTailwindField('paddingX', { key: 'paddingX', label: 'Padding · horizontal' }),
        journalChipTailwindField('paddingY', { key: 'paddingY', label: 'Padding · vertical' }),
        journalChipTailwindField('letterSpacing', { key: 'textTracking', label: 'Text tracking' }),
        journalChipTailwindField('borderWidth', { key: 'borderWidth', label: 'Border width' }),
      ],
    },
  ],
  copy: {
    targetFile: 'pages/journal.config.ts',
    targetSymbol: 'DEFAULT_JOURNAL_CHIP_APPEARANCE_CONFIG',
    targetType: 'JournalChipAppearanceConfig',
    updateStrategy: 'merge',
    completeScope: false,
  },
})

export const JOURNAL_POLYMORPHIC_LAYOUT_PANEL = definePageConfigScope<PolymorphicLayoutConfig>({
  component: 'SplitColumnLayout',
  scope: 'layout',
  pageName: 'Journal',
  title: 'Polymorphic Layout',
  createdAt: '2026-09-02',
  defaultOpen: false,
  summary: 'Journal column split, content containers, and centered mode',
  fields: POLYMORPHIC_LAYOUT_FIELDS,
  defaultValue: JOURNAL_POLYMORPHIC_LAYOUT_CONFIG,
  targetFile: 'pages/journal.config.ts',
  targetSymbol: 'JOURNAL_POLYMORPHIC_LAYOUT_CONFIG',
  targetType: 'PolymorphicLayoutConfig',
})
