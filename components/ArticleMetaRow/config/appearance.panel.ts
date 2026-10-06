import { defineConfigScope, createTailwindFieldFactory } from '../../Panel/config'
import { DEFAULT_ARTICLE_META_ROW_APPEARANCE_CONFIG, type ArticleMetaRowAppearanceConfig } from './appearance'

const tailwindArticleMetaRowField = createTailwindFieldFactory<ArticleMetaRowAppearanceConfig>()

// Breakpoint-specific knobs (font size, all four padding sides, category
// weight) are tabbed MOBILE/TABLET/DESKTOP — same device-switcher
// convention EDITORIAL_ACCORDION_ITEM_FIELDS, AboutTimeline.panel.ts, and
// JOURNAL_NARROW_COLUMN_CONTENT_PANEL (pages/journal.panel.ts) already use,
// rather than a flat list of breakpoint-suffixed fields. colorOpacity/
// fontFamily apply at every breakpoint at once, so they stay outside the
// tabs, above them.
export const ARTICLE_META_ROW_APPEARANCE_FIELDS = [
  { kind: 'number', key: 'colorOpacity', label: 'Color opacity', min: 0, max: 1, step: 0.01, description: 'Opacity of the metadata sentence, independent of the title and description.' } as const,
  tailwindArticleMetaRowField('fontFamily', { key: 'fontFamily', label: 'Font family' }),
  {
    kind: 'tabs',
    tabs: [
      {
        id: 'mobile',
        label: 'MOBILE (< 768px)',
        fields: [
          tailwindArticleMetaRowField('fontSize', { key: 'fontSize', label: 'Font size' }),
          tailwindArticleMetaRowField('fontWeight', {
            key: 'categoryFontWeight',
            label: 'Category weight',
            description: 'Font weight of just the category word, independent of the rest of the sentence.',
          }),
          tailwindArticleMetaRowField('paddingTop', { key: 'paddingTop', label: 'Padding top' }),
          tailwindArticleMetaRowField('paddingRight', { key: 'paddingRight', label: 'Padding right' }),
          tailwindArticleMetaRowField('paddingBottom', { key: 'paddingBottom', label: 'Padding bottom' }),
          tailwindArticleMetaRowField('paddingLeft', { key: 'paddingLeft', label: 'Padding left' }),
        ],
      },
      {
        id: 'tablet',
        label: 'TABLET (≥ 768px)',
        fields: [
          tailwindArticleMetaRowField('fontSize', { breakpoint: 'md', key: 'fontSizeWide', label: 'Font size' }),
          tailwindArticleMetaRowField('fontWeight', { breakpoint: 'md', key: 'categoryFontWeightWide', label: 'Category weight' }),
          tailwindArticleMetaRowField('paddingTop', { breakpoint: 'md', key: 'paddingTopWide', label: 'Padding top' }),
          tailwindArticleMetaRowField('paddingRight', { breakpoint: 'md', key: 'paddingRightWide', label: 'Padding right' }),
          tailwindArticleMetaRowField('paddingBottom', { breakpoint: 'md', key: 'paddingBottomWide', label: 'Padding bottom' }),
          tailwindArticleMetaRowField('paddingLeft', { breakpoint: 'md', key: 'paddingLeftWide', label: 'Padding left' }),
        ],
      },
      {
        id: 'desktop',
        label: 'DESKTOP (≥ 1024px)',
        fields: [
          tailwindArticleMetaRowField('fontSize', { breakpoint: 'lg', key: 'fontSizeLg', label: 'Font size' }),
          tailwindArticleMetaRowField('fontWeight', { breakpoint: 'lg', key: 'categoryFontWeightLg', label: 'Category weight' }),
          tailwindArticleMetaRowField('paddingTop', { breakpoint: 'lg', key: 'paddingTopLg', label: 'Padding top' }),
          tailwindArticleMetaRowField('paddingRight', { breakpoint: 'lg', key: 'paddingRightLg', label: 'Padding right' }),
          tailwindArticleMetaRowField('paddingBottom', { breakpoint: 'lg', key: 'paddingBottomLg', label: 'Padding bottom' }),
          tailwindArticleMetaRowField('paddingLeft', { breakpoint: 'lg', key: 'paddingLeftLg', label: 'Padding left' }),
        ],
      },
    ],
  },
] as const

export const ARTICLE_META_ROW_APPEARANCE_SCOPE_ID = 'ArticleMetaRow/appearance' as const

export const ARTICLE_META_ROW_APPEARANCE_PANEL = defineConfigScope<ArticleMetaRowAppearanceConfig>({
  id: ARTICLE_META_ROW_APPEARANCE_SCOPE_ID,
  component: 'ArticleMetaRow',
  scope: 'appearance',
  title: 'Article Meta Row Appearance',
  createdAt: '2026-10-03',
  defaultOpen: false,
  summary: 'Metadata sentence · opacity, font, padding',
  defaultValue: DEFAULT_ARTICLE_META_ROW_APPEARANCE_CONFIG,
  fields: ARTICLE_META_ROW_APPEARANCE_FIELDS,
  copy: {
    targetFile: 'components/ArticleMetaRow/config/appearance.ts',
    targetSymbol: 'DEFAULT_ARTICLE_META_ROW_APPEARANCE_CONFIG',
    targetType: 'ArticleMetaRowAppearanceConfig',
    updateStrategy: 'merge',
    completeScope: false,
  },
})
