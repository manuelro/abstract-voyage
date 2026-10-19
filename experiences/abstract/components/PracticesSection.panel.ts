import { defineConfigScope } from '../../../components/Panel/config';
import { createTailwindFieldFactory } from '../../../components/Panel/config/tailwindFields';
import {
  DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG,
  type PracticesSectionLayoutConfig,
} from './PracticesSection.config';

const field = createTailwindFieldFactory<PracticesSectionLayoutConfig>();

export const PRACTICES_SECTION_LAYOUT_PANEL = defineConfigScope<PracticesSectionLayoutConfig>({
  id: 'Practices/layout',
  component: 'PracticesSection',
  scope: 'layout',
  title: 'PRACTICES SECTION',
  createdAt: '2026-10-16',
  defaultOpen: false,
  summary: 'Practices typography, spacing, grid and dividers',
  defaultValue: DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG,
  copy: {
    targetFile: 'experiences/abstract/components/PracticesSection.config.ts',
    targetSymbol: 'DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG',
    targetType: 'PracticesSectionLayoutConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
  fields: [
    {
      kind: 'tabs',
      tabs: [
        {
          id: 'all-sizes', label: 'ALL SIZES', fields: [
            {
              kind: 'group', label: 'Header width', fields: [
                field('maxWidth', { key: 'headerMaxWidth', label: 'Header max width', description: 'Width cap for the eyebrow + heading block.' }),
              ],
            },
            {
              kind: 'group', label: 'Opacity', fields: [
                { kind: 'number', key: 'titleOpacityPercent', label: 'Titles & subtitles', description: 'Opacity for the section, practice, delivery and proof titles and labels.', min: 0, max: 100, step: 1, integer: true, unit: '%' },
                { kind: 'number', key: 'contentOpacityPercent', label: 'Content', description: 'Base opacity for body copy. At 0, all copy including emphasis is hidden.', min: 0, max: 100, step: 1, integer: true, unit: '%' },
              ],
            },
            {
              kind: 'group', label: 'Titles', fields: [
                field('fontFamily', { key: 'sectionTitleFontFamily', label: 'Section & delivery family', description: 'Typeface for "The Practice" and the delivery heading.' }),
                field('fontWeight', { key: 'sectionTitleFontWeight', label: 'Section & delivery weight' }),
                field('fontFamily', { key: 'subsectionTitleFontFamily', label: 'Practice & proof family', description: 'Typeface for each practice card title and the proof title.' }),
                field('fontWeight', { key: 'subsectionTitleFontWeight', label: 'Practice & proof weight' }),
              ],
            },
            {
              kind: 'group', label: 'Emphasis', fields: [
                field('fontWeight', { key: 'emphasisFontWeight', label: 'Font weight', description: 'Weight of highlighted phrases in practice cards and delivery copy.' }),
                { kind: 'number', key: 'emphasisOpacityPercent', label: 'Opacity', description: 'Highlighted phrase opacity at the default Content value. Content at 0 still hides all copy.', min: 0, max: 100, step: 1, integer: true, unit: '%' },
              ],
            },
            {
              kind: 'group', label: 'Columns', fields: [
                { kind: 'number', key: 'columnTargetWidthPx', label: 'Target column width', description: 'The preferred column width. The grid fits as many whole columns of about this width as the container allows, like the wall feed.', min: 160, max: 900, step: 5, integer: true, unit: 'px' },
                { kind: 'number', key: 'minColumnWidthPx', label: 'Min column width', description: 'A resolved column narrower than this drops a column.', min: 120, max: 900, step: 5, integer: true, unit: 'px' },
                { kind: 'number', key: 'maxColumnWidthPx', label: 'Max column width', description: 'A resolved column wider than this adds a column, up to the max count.', min: 160, max: 1200, step: 5, integer: true, unit: 'px' },
                { kind: 'number', key: 'maxColumnCount', label: 'Max columns', description: 'Hard ceiling on the column count (1 = always stacked, 4 = row of four).', min: 1, max: 4, step: 1, integer: true },
              ],
            },
            {
              kind: 'group', label: 'Dividers', fields: [
                { kind: 'boolean', key: 'sectionDividerEnabled', label: 'Before independent expertise', description: 'Draw a horizontal rule between the practice cards and the delivery/industry section.' },
                { kind: 'boolean', key: 'practiceDividersEnabled', label: 'Between practice cards', description: 'Draw the selected row and column separators in the practice grid.' },
                {
                  kind: 'enum', key: 'separatorStyle', label: 'Style',
                  description: 'BETWEEN ITEMS draws a rule between rows. VERTICAL + ROW adds rules between columns. NONE hides grid dividers even when enabled.',
                  visibleWhen: v => v.practiceDividersEnabled,
                  options: [
                    { label: 'NONE', value: 'none' },
                    { label: 'BETWEEN ITEMS', value: 'between-items' },
                    { label: 'VERTICAL + ROW', value: 'vertical-and-row' },
                  ],
                },
                field('borderWidth', { key: 'separatorWidth', label: 'Thickness', visibleWhen: v => v.practiceDividersEnabled && v.separatorStyle !== 'none' }),
                {
                  kind: 'enum', key: 'separatorColorMode', label: 'Color',
                  description: 'INHERIT uses the section ink color; CUSTOM uses the color below.',
                  options: [{ label: 'INHERIT INK', value: 'inherit' }, { label: 'CUSTOM', value: 'custom' }],
                  visibleWhen: v => v.practiceDividersEnabled && v.separatorStyle !== 'none',
                },
                { kind: 'color', key: 'separatorColor', label: 'Custom color', visibleWhen: v => v.practiceDividersEnabled && v.separatorStyle !== 'none' && v.separatorColorMode === 'custom' },
                { kind: 'number', key: 'separatorOpacityPercent', label: 'Opacity', min: 0, max: 100, step: 1, integer: true, unit: '%', visibleWhen: v => v.practiceDividersEnabled && v.separatorStyle !== 'none' },
              ],
            },
            {
              kind: 'group', label: 'Subtext', fields: [
                field('fontFamily', { key: 'subtextFontFamily', label: 'Family' }),
                field('fontWeight', { key: 'subtextFontWeight', label: 'Weight' }),
                field('lineHeight', { key: 'subtextLineHeight', label: 'Line height' }),
                field('letterSpacing', { key: 'subtextLetterSpacing', label: 'Tracking' }),
                field('textTransform', { key: 'subtextTextTransform', label: 'Transform' }),
                field('paddingTop', { key: 'subtextPaddingTop', label: 'Padding top' }),
                field('paddingRight', { key: 'subtextPaddingRight', label: 'Padding right' }),
                field('paddingBottom', { key: 'subtextPaddingBottom', label: 'Padding bottom' }),
                field('paddingLeft', { key: 'subtextPaddingLeft', label: 'Padding left' }),
              ],
            },
          ],
        },
        {
          id: 'mobile', label: 'MOBILE', fields: [
            { kind: 'group', label: 'Text sizes', fields: [
              field('fontSize', { key: 'labelFontSize', label: 'Eyebrow & proof label' }),
              field('fontSize', { key: 'sectionTitleFontSize', label: 'Section & delivery titles' }),
              field('fontSize', { key: 'subsectionTitleFontSize', label: 'Practice & proof titles' }),
              field('fontSize', { key: 'leadFontSize', label: 'Introduction & delivery text' }),
              field('fontSize', { key: 'bodyFontSize', label: 'Practice & proof text' }),
              field('fontSize', { key: 'subtextFontSize', label: 'Optional subtext' }),
              field('fontSize', { key: 'ctaFontSize', label: 'CTA text' }),
            ] },
            { kind: 'group', label: 'Section spacing', fields: [
              field('paddingTop', { key: 'sectionPaddingTop', label: 'Top', description: 'Space between the hero quote and "The Practice".' }),
              field('paddingBottom', { key: 'sectionPaddingBottom', label: 'Bottom', description: 'Space between the final section item and the banner edge.' }),
            ] },
            { kind: 'group', label: 'Title group to subgroups', fields: [
              field('marginTop', { key: 'titleGroupGap', label: 'Gap', description: 'Space after the title, introduction and optional subtext, before the practice cards.' }),
            ] },
            { kind: 'group', label: 'Between subgroups', fields: [
              field('marginTop', { key: 'gridToDividerGap', label: 'After practice cards', description: 'Space before the divider when shown, or before the next content group when hidden.' }),
              field('marginTop', { key: 'dividerToDetailsGap', label: 'Divider → details', visibleWhen: v => v.sectionDividerEnabled }),
              field('marginTop', { key: 'industryGap', label: 'Before industry proof' }),
              field('marginTop', { key: 'ctaGap', label: 'Before CTA' }),
            ] },
            { kind: 'group', label: 'Paragraph width (measure)', fields: [
              field('maxWidth', { key: 'paragraphMaxWidth', label: 'Max width', description: 'Shared max-width for the four body paragraphs (intro, subtext, delivery, industry). Prefer a rem token (max-w-xl/2xl), not max-w-prose, which renders ~85 chars in this font.' }),
            ] },
            { kind: 'group', label: 'Practice card measure (ch)', fields: [
              { kind: 'number', key: 'practiceCardMeasureCh', label: 'Measure', description: 'Line length of the practice card body, in characters. High values fill the column; lower values tighten the measure.', min: 16, max: 90, step: 1, integer: true, unit: 'ch' },
            ] },
            { kind: 'group', label: 'Grid gaps', fields: [
              field('gap', { key: 'columnGap', label: 'Column gap' }),
              field('gap', { key: 'rowGap', label: 'Row gap' }),
            ] },
          ],
        },
        {
          id: 'tablet', label: 'TABLET', fields: [
            { kind: 'group', label: 'Text sizes', fields: [
              field('fontSize', { key: 'labelFontSizeMd', label: 'Eyebrow & proof label', breakpoint: 'md' }),
              field('fontSize', { key: 'sectionTitleFontSizeMd', label: 'Section & delivery titles', breakpoint: 'md' }),
              field('fontSize', { key: 'subsectionTitleFontSizeMd', label: 'Practice & proof titles', breakpoint: 'md' }),
              field('fontSize', { key: 'leadFontSizeMd', label: 'Introduction & delivery text', breakpoint: 'md' }),
              field('fontSize', { key: 'bodyFontSizeMd', label: 'Practice & proof text', breakpoint: 'md' }),
              field('fontSize', { key: 'subtextFontSizeMd', label: 'Optional subtext', breakpoint: 'md' }),
              field('fontSize', { key: 'ctaFontSizeMd', label: 'CTA text', breakpoint: 'md' }),
            ] },
            { kind: 'group', label: 'Section spacing', fields: [
              field('paddingTop', { key: 'sectionPaddingTopMd', label: 'Top', breakpoint: 'md', description: 'Space between the hero quote and "The Practice".' }),
              field('paddingBottom', { key: 'sectionPaddingBottomMd', label: 'Bottom', breakpoint: 'md', description: 'Space between the final section item and the banner edge.' }),
            ] },
            { kind: 'group', label: 'Title group to subgroups', fields: [
              field('marginTop', { key: 'titleGroupGapMd', label: 'Gap', breakpoint: 'md', description: 'Space after the title, introduction and optional subtext, before the practice cards.' }),
            ] },
            { kind: 'group', label: 'Between subgroups', fields: [
              field('marginTop', { key: 'gridToDividerGapMd', label: 'After practice cards', breakpoint: 'md' }),
              field('marginTop', { key: 'dividerToDetailsGapMd', label: 'Divider → details', breakpoint: 'md', visibleWhen: v => v.sectionDividerEnabled }),
              field('marginTop', { key: 'industryGapMd', label: 'Before industry proof', breakpoint: 'md' }),
              field('marginTop', { key: 'ctaGapMd', label: 'Before CTA', breakpoint: 'md' }),
            ] },
            { kind: 'group', label: 'Paragraph width (measure)', fields: [
              field('maxWidth', { key: 'paragraphMaxWidthMd', label: 'Max width', breakpoint: 'md' }),
            ] },
            { kind: 'group', label: 'Practice card measure (ch)', fields: [
              { kind: 'number', key: 'practiceCardMeasureChMd', label: 'Measure', min: 16, max: 90, step: 1, integer: true, unit: 'ch' },
            ] },
            { kind: 'group', label: 'Grid gaps', fields: [
              field('gap', { key: 'columnGapMd', label: 'Column gap', breakpoint: 'md' }),
              field('gap', { key: 'rowGapMd', label: 'Row gap', breakpoint: 'md' }),
            ] },
          ],
        },
        {
          id: 'desktop', label: 'DESKTOP', fields: [
            { kind: 'group', label: 'Text sizes', fields: [
              field('fontSize', { key: 'labelFontSizeLg', label: 'Eyebrow & proof label', breakpoint: 'lg' }),
              field('fontSize', { key: 'sectionTitleFontSizeLg', label: 'Section & delivery titles', breakpoint: 'lg' }),
              field('fontSize', { key: 'subsectionTitleFontSizeLg', label: 'Practice & proof titles', breakpoint: 'lg' }),
              field('fontSize', { key: 'leadFontSizeLg', label: 'Introduction & delivery text', breakpoint: 'lg' }),
              field('fontSize', { key: 'bodyFontSizeLg', label: 'Practice & proof text', breakpoint: 'lg' }),
              field('fontSize', { key: 'subtextFontSizeLg', label: 'Optional subtext', breakpoint: 'lg' }),
              field('fontSize', { key: 'ctaFontSizeLg', label: 'CTA text', breakpoint: 'lg' }),
            ] },
            { kind: 'group', label: 'Section spacing', fields: [
              field('paddingTop', { key: 'sectionPaddingTopLg', label: 'Top', breakpoint: 'lg', description: 'Space between the hero quote and "The Practice".' }),
              field('paddingBottom', { key: 'sectionPaddingBottomLg', label: 'Bottom', breakpoint: 'lg', description: 'Space between the final section item and the banner edge.' }),
            ] },
            { kind: 'group', label: 'Title group to subgroups', fields: [
              field('marginTop', { key: 'titleGroupGapLg', label: 'Gap', breakpoint: 'lg', description: 'Space after the title, introduction and optional subtext, before the practice cards.' }),
            ] },
            { kind: 'group', label: 'Between subgroups', fields: [
              field('marginTop', { key: 'gridToDividerGapLg', label: 'After practice cards', breakpoint: 'lg' }),
              field('marginTop', { key: 'dividerToDetailsGapLg', label: 'Divider → details', breakpoint: 'lg', visibleWhen: v => v.sectionDividerEnabled }),
              field('marginTop', { key: 'industryGapLg', label: 'Before industry proof', breakpoint: 'lg' }),
              field('marginTop', { key: 'ctaGapLg', label: 'Before CTA', breakpoint: 'lg' }),
            ] },
            { kind: 'group', label: 'Paragraph width (measure)', fields: [
              field('maxWidth', { key: 'paragraphMaxWidthLg', label: 'Max width', breakpoint: 'lg' }),
            ] },
            { kind: 'group', label: 'Practice card measure (ch)', fields: [
              { kind: 'number', key: 'practiceCardMeasureChLg', label: 'Measure', min: 16, max: 90, step: 1, integer: true, unit: 'ch' },
            ] },
            { kind: 'group', label: 'Grid gaps', fields: [
              field('gap', { key: 'columnGapLg', label: 'Column gap', breakpoint: 'lg' }),
              field('gap', { key: 'rowGapLg', label: 'Row gap', breakpoint: 'lg' }),
            ] },
          ],
        },
      ],
    },
  ],
});
