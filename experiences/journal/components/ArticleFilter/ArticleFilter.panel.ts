import { createTailwindFieldFactory } from '../../../../components/Panel/config'
import type { ArticleFilterConfig } from './ArticleFilter.config'

const articleFilterTailwindField = createTailwindFieldFactory<ArticleFilterConfig>()

// Same hand-written CSS-keyword enum precedent as JournalAccordionTextWrap's
// own ACCORDION_TEXT_WRAP_OPTIONS (pages/journal.panel.ts) — a layout axis
// choice, not a generated Tailwind utility family.
const LAYOUT_DIRECTION_OPTIONS = [
  { label: 'HORIZONTAL', value: 'horizontal' },
  { label: 'VERTICAL', value: 'vertical' },
] as const

export const ARTICLE_FILTER_FIELDS = [
  { kind: 'boolean', key: 'enabled', label: 'Show category filter', description: 'Shows or hides the category chip row entirely.' } as const,
  {
    kind: 'number',
    key: 'maxCategories',
    label: 'Max categories',
    description: 'Caps how many category chips render. All still shows every article.',
    min: 0,
    max: 20,
    step: 1,
    visibleWhen: (config: ArticleFilterConfig) => config.enabled,
  } as const,
  {
    kind: 'enum',
    key: 'layoutDirection',
    label: 'Layout · Mobile',
    description: 'Horizontal (default): one wrapping row. Vertical: one chip per line, left-aligned.',
    options: LAYOUT_DIRECTION_OPTIONS,
    visibleWhen: (config: ArticleFilterConfig) => config.enabled,
  } as const,
  {
    kind: 'enum',
    key: 'layoutDirectionWide',
    label: 'Layout · Tablet',
    options: LAYOUT_DIRECTION_OPTIONS,
    visibleWhen: (config: ArticleFilterConfig) => config.enabled,
  } as const,
  {
    kind: 'enum',
    key: 'layoutDirectionLg',
    label: 'Layout · Desktop',
    options: LAYOUT_DIRECTION_OPTIONS,
    visibleWhen: (config: ArticleFilterConfig) => config.enabled,
  } as const,
  {
    kind: 'number',
    key: 'dockMinScale',
    label: 'Dock · Minimum scale',
    description: 'Resting size of the farthest filters. 1 keeps every button at its normal size.',
    min: 0.8,
    max: 1,
    step: 0.01,
    visibleWhen: (config: ArticleFilterConfig) => config.enabled &&
      [config.layoutDirection, config.layoutDirectionWide, config.layoutDirectionLg].includes('vertical'),
  } as const,
  {
    kind: 'number',
    key: 'dockMaxScale',
    label: 'Dock · Maximum scale',
    description: 'Peak size of the focused filter and its closest neighbors. 1 turns off enlargement.',
    min: 1,
    max: 1.6,
    step: 0.01,
    visibleWhen: (config: ArticleFilterConfig) => config.enabled &&
      [config.layoutDirection, config.layoutDirectionWide, config.layoutDirectionLg].includes('vertical'),
  } as const,
  articleFilterTailwindField('gap', {
    key: 'gapClassName',
    label: 'Chip gap',
    visibleWhen: config => config.enabled,
  }),
  articleFilterTailwindField('marginTop', {
    key: 'spaceBeforeClassName',
    label: 'Space before',
    description: 'Vertical space between the narrow-column content above and the filter row.',
    visibleWhen: config => config.enabled,
  }),
  articleFilterTailwindField('fontSize', {
    key: 'fontSize',
    label: 'Font size · Mobile',
    visibleWhen: config => config.enabled,
  }),
  articleFilterTailwindField('fontSize', {
    breakpoint: 'md',
    key: 'fontSizeWide',
    label: 'Font size · Tablet',
    visibleWhen: config => config.enabled,
  }),
  articleFilterTailwindField('fontSize', {
    breakpoint: 'lg',
    key: 'fontSizeLg',
    label: 'Font size · Desktop',
    visibleWhen: config => config.enabled,
  }),
]
