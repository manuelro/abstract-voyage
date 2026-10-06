import { createTailwindFieldFactory, defineConfigScope } from '../../../../../components/Panel/config'
import { MARGIN_BOTTOM_OPTIONS, MARGIN_TOP_OPTIONS, MARGIN_Y_OPTIONS, PADDING_LEFT_OPTIONS, PADDING_OPTIONS, PADDING_Y_OPTIONS } from '../../../../../components/tailwindSpacingScale'
import { BORDER_LEFT_WIDTH_OPTIONS, FONT_FAMILY_OPTIONS, FONT_SIZE_OPTIONS, FONT_WEIGHT_OPTIONS, LEADING_OPTIONS, MAX_WIDTH_OPTIONS, MD_FONT_SIZE_OPTIONS, RADIUS_OPTIONS, TRACKING_OPTIONS } from '../../../../../components/tailwindTypographyScale'
import { DEFAULT_POST_LAB_ARTICLE_CONFIG, type MarkdownContentConfig } from './registered'

const colorModeOptions = [{ label: 'COLUMN', value: 'column' }, { label: 'SURFACE', value: 'surface' }, { label: 'CUSTOM', value: 'custom' }] as const
export const POST_LAB_ARTICLE_READING_SCOPE_ID = 'PostLabArticle/reading' as const
const tailwindReadingField = createTailwindFieldFactory<MarkdownContentConfig>()

export const POST_LAB_ARTICLE_READING_PANEL = defineConfigScope<MarkdownContentConfig>({
  id: POST_LAB_ARTICLE_READING_SCOPE_ID, component: 'PostLabArticle', scope: 'reading',
  title: 'Article reading', createdAt: '2026-08-11', defaultOpen: false,
  summary: 'Tailwind reading rhythm · editorial typography · derived ink · structured content',
  defaultValue: DEFAULT_POST_LAB_ARTICLE_CONFIG,
  // The post page uses live scroll-adaptive ink for its body and muted text.
  // The body target still feeds the static code-ink derivation; the muted
  // target is replaced entirely on this page. Neither sets paragraph contrast.
  hiddenKeys: ['bodyTextMinContrast', 'mutedTextMinContrast'],
  fields: [
    { kind: 'group', label: 'Reading frame', fields: [
      { kind: 'select', key: 'contentMaxWidth', label: 'Body reading measure', description: 'Literal Tailwind max-width token. The prose default protects sustained reading line length.', options: MAX_WIDTH_OPTIONS },
      { kind: 'select', key: 'mastheadToProseMarginTop', label: 'Masthead to prose gap', description: 'Tailwind spacing token.', options: MARGIN_TOP_OPTIONS },
    ] },
    { kind: 'group', label: 'Editorial masthead', fields: [
      { kind: 'enum', key: 'metadataFontSize', label: 'Metadata size', options: FONT_SIZE_OPTIONS.slice(0, 4) },
      { kind: 'number', key: 'metadataLetterSpacingEm', label: 'Metadata tracking adjustment', min: 0, max: 0.24, step: 0.01, unit: 'em' },
      { kind: 'boolean', key: 'metadataUppercase', label: 'Metadata uppercase' },
      { kind: 'select', key: 'metadataTitleMarginTop', label: 'Metadata to title gap', options: MARGIN_TOP_OPTIONS },
      { kind: 'number', key: 'metadataOpacity', label: 'Metadata opacity', description: 'Dims the topic/date/read-time line independently of the excerpt below — 1 (default) is today\'s existing look.', min: 0, max: 1, step: 0.01 },
      { kind: 'enum', key: 'titleFontFamily', label: 'Title family', options: FONT_FAMILY_OPTIONS },
      { kind: 'boolean', key: 'titleAllCaps', label: 'Title all caps' },
      { kind: 'enum', key: 'titleFontSize', label: 'Title size', options: FONT_SIZE_OPTIONS.slice(2) },
      { kind: 'enum', key: 'titleFontSizeDesktop', label: 'Title size (desktop)', options: MD_FONT_SIZE_OPTIONS.slice(3) },
      { kind: 'enum', key: 'titleFontWeight', label: 'Title weight', options: FONT_WEIGHT_OPTIONS },
      { kind: 'enum', key: 'titleLeading', label: 'Title line height', options: LEADING_OPTIONS },
      { kind: 'select', key: 'titleMaxWidth', label: 'Title measure', options: MAX_WIDTH_OPTIONS },
      { kind: 'boolean', key: 'excerptVisible', label: 'Show excerpt' },
      { kind: 'enum', key: 'excerptFontFamily', label: 'Excerpt family', options: FONT_FAMILY_OPTIONS, visibleWhen: config => config.excerptVisible },
      { kind: 'enum', key: 'excerptFontSize', label: 'Excerpt size', options: FONT_SIZE_OPTIONS.slice(1, 6), visibleWhen: config => config.excerptVisible },
      { kind: 'enum', key: 'excerptFontSizeDesktop', label: 'Excerpt size (desktop)', options: MD_FONT_SIZE_OPTIONS.slice(2, 7), visibleWhen: config => config.excerptVisible },
      { kind: 'enum', key: 'excerptLeading', label: 'Excerpt line height', options: LEADING_OPTIONS, visibleWhen: config => config.excerptVisible },
      { kind: 'select', key: 'excerptMarginTop', label: 'Title to excerpt gap', options: MARGIN_TOP_OPTIONS, visibleWhen: config => config.excerptVisible },
    ] },
    { kind: 'group', label: 'Narrative typography', fields: [
      { kind: 'enum', key: 'bodyFontFamily', label: 'Body family', options: FONT_FAMILY_OPTIONS },
      { kind: 'enum', key: 'bodyFontSize', label: 'Body size', options: FONT_SIZE_OPTIONS.slice(0, 5) },
      { kind: 'enum', key: 'bodyFontSizeDesktop', label: 'Body size (desktop)', options: MD_FONT_SIZE_OPTIONS.slice(1, 6) },
      tailwindReadingField('lineHeight', { key: 'bodyLeading', label: 'Body line height (mobile)', description: 'Base line height, used below the medium breakpoint.' }),
      tailwindReadingField('lineHeight', { breakpoint: 'md', key: 'bodyLeadingMd', label: 'Body line height (tablet)', description: 'Applies from the medium breakpoint until the large breakpoint.' }),
      tailwindReadingField('lineHeight', { breakpoint: 'lg', key: 'bodyLeadingLg', label: 'Body line height (desktop)', description: 'Applies from the large breakpoint upward.' }),
      { kind: 'enum', key: 'bodyTracking', label: 'Body tracking', options: TRACKING_OPTIONS },
      { kind: 'select', key: 'paragraphMarginBottom', label: 'Paragraph gap', options: MARGIN_BOTTOM_OPTIONS },
      { kind: 'enum', key: 'strongColorMode', label: 'Bold text source', options: [{ label: 'INHERIT (BODY INK)', value: 'inherit' }, { label: 'CUSTOM', value: 'custom' }] },
      { kind: 'color', key: 'strongCustomColor', label: 'Custom bold color', visibleWhen: config => config.strongColorMode === 'custom' },
      { kind: 'number', key: 'strongOpacity', label: 'Bold opacity', min: 0, max: 1, step: 0.01 },
      { kind: 'enum', key: 'strongFontWeight', label: 'Bold weight', options: FONT_WEIGHT_OPTIONS },
      { kind: 'enum', key: 'headingFontFamily', label: 'Heading family', options: FONT_FAMILY_OPTIONS },
      { kind: 'enum', key: 'headingFontWeight', label: 'Heading weight', options: FONT_WEIGHT_OPTIONS },
      { kind: 'enum', key: 'headingLeading', label: 'Heading line height', options: LEADING_OPTIONS },
      { kind: 'enum', key: 'h2FontSize', label: 'H2 size', options: FONT_SIZE_OPTIONS.slice(2) },
      { kind: 'enum', key: 'h2FontSizeDesktop', label: 'H2 size (desktop)', options: MD_FONT_SIZE_OPTIONS.slice(3) },
      { kind: 'enum', key: 'h3FontSize', label: 'H3 size', options: FONT_SIZE_OPTIONS.slice(1, 6) },
      { kind: 'enum', key: 'h3FontSizeDesktop', label: 'H3 size (desktop)', options: MD_FONT_SIZE_OPTIONS.slice(2, 7) },
      { kind: 'select', key: 'h2MarginTop', label: 'H2 top space', options: MARGIN_TOP_OPTIONS },
      { kind: 'select', key: 'h2MarginBottom', label: 'H2 bottom space', options: MARGIN_BOTTOM_OPTIONS },
      { kind: 'select', key: 'h3MarginTop', label: 'H3 top space', options: MARGIN_TOP_OPTIONS },
      { kind: 'select', key: 'h3MarginBottom', label: 'H3 bottom space', options: MARGIN_BOTTOM_OPTIONS },
    ] },
    { kind: 'group', label: 'Reading contrast', fields: [
      { kind: 'number', key: 'bodyInkOpacity', label: 'Body text opacity', description: 'Controls paragraphs, lists, bold text, excerpts, and blockquotes. Higher values strengthen the rendered ink; contrast still varies with the scroll background.', min: 0.65, max: 1, step: 0.01 },
    ] },
    { kind: 'group', label: 'Derived link and code ink', fields: [
      { kind: 'enum', key: 'bodyTextColorMode', label: 'Ink source', description: 'Source for generated link and code ink. Paragraphs use the live column ink above.', options: colorModeOptions },
      { kind: 'color', key: 'bodyTextColor', label: 'Custom ink source', visibleWhen: config => config.bodyTextColorMode === 'custom' },
      { kind: 'number', key: 'bodyTextOriginalHueRetention', label: 'Original hue retention', min: 0, max: 1, step: 0.01 },
      { kind: 'number', key: 'bodyTextHueShiftDegrees', label: 'Hue shift', min: -180, max: 180, step: 1, unit: '°', integer: true },
      { kind: 'number', key: 'bodyTextPigmentIntensity', label: 'Text pigment intensity', min: 0, max: 2, step: 0.01 },
      { kind: 'number', key: 'linkTextMinContrast', label: 'Link contrast', min: 3, max: 21, step: 0.1 },
      { kind: 'number', key: 'linkPigmentIntensity', label: 'Link pigment intensity', min: 0, max: 2, step: 0.01 },
    ] },
    { kind: 'group', label: 'Structured content', fields: [
      { kind: 'select', key: 'richBlockMarginY', label: 'Rich-content rhythm', options: MARGIN_Y_OPTIONS },
      { kind: 'select', key: 'blockquotePaddingLeft', label: 'Blockquote inset', options: PADDING_LEFT_OPTIONS },
      { kind: 'enum', key: 'blockquoteRuleWidth', label: 'Blockquote rule width', options: BORDER_LEFT_WIDTH_OPTIONS },
      { kind: 'enum', key: 'figureRadius', label: 'Figure radius', options: RADIUS_OPTIONS },
      { kind: 'number', key: 'figureBorderOpacity', label: 'Figure border opacity', min: 0, max: 1, step: 0.01 },
      { kind: 'enum', key: 'captionFontFamily', label: 'Caption family', options: FONT_FAMILY_OPTIONS },
      { kind: 'enum', key: 'captionFontSize', label: 'Caption size', options: FONT_SIZE_OPTIONS.slice(0, 4) },
      { kind: 'enum', key: 'tableFontFamily', label: 'Table family', options: FONT_FAMILY_OPTIONS },
      { kind: 'enum', key: 'tableFontSize', label: 'Table size', options: FONT_SIZE_OPTIONS.slice(0, 5) },
      { kind: 'enum', key: 'tableLeading', label: 'Table line height', options: LEADING_OPTIONS },
      { kind: 'select', key: 'tableRowPaddingY', label: 'Table row padding', options: PADDING_Y_OPTIONS },
      { kind: 'number', key: 'tableDividerOpacity', label: 'Table divider opacity', min: 0, max: 1, step: 0.01 },
    ] },
    { kind: 'group', label: 'Code blocks', fields: [
      { kind: 'enum', key: 'codeSurfaceMode', label: 'Code surface', options: [{ label: 'DERIVED DARK', value: 'derived-dark' }, { label: 'DERIVED LIGHT', value: 'derived-light' }, { label: 'CUSTOM', value: 'custom' }] },
      { kind: 'color', key: 'codeSurfaceColor', label: 'Custom code surface', visibleWhen: config => config.codeSurfaceMode === 'custom' },
      { kind: 'number', key: 'codeTextMinContrast', label: 'Code text contrast', min: 3, max: 21, step: 0.1 },
      { kind: 'enum', key: 'codeRadius', label: 'Code radius', options: RADIUS_OPTIONS },
      { kind: 'select', key: 'codePadding', label: 'Code padding', options: PADDING_OPTIONS },
      { kind: 'enum', key: 'codeFontSize', label: 'Code size', options: FONT_SIZE_OPTIONS.slice(0, 5) },
      { kind: 'enum', key: 'codeLeading', label: 'Code line height', options: LEADING_OPTIONS },
    ] },
  ],
  copy: { targetFile: 'experiences/abstract/components/MarkdownContent/config/registered.ts', targetSymbol: 'DEFAULT_POST_LAB_ARTICLE_CONFIG', targetType: 'MarkdownContentConfig', updateStrategy: 'replace_scope', completeScope: true },
})
