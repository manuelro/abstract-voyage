import { defineConfigScope, getConfigScopeFieldKeys } from '../../../../components/Panel/config';
import type { ConfigScopeEntry } from '../../../../components/Panel/config/types';
import { createTailwindFieldFactory } from '../../../../components/Panel/config/tailwindFields';
import { COVER_FLOW_GRADIENT_SOURCE_CARDS } from '../Card/config/appearance';
import { CARD_BLEND_MODES, DEFAULT_QUOTE_CONFIG, DEFAULT_QUOTE_SURFACE_CONFIG, parentQuoteKey, QUOTE_PALETTE_SIZE, type QuoteConfig, type QuoteSurfaceConfig } from './config';
import { createWrappingQuoteSection } from './parentQuotePanel';

const tailwindField = createTailwindFieldFactory<QuoteSurfaceConfig>();

export const QUOTE_HEADING_TEXT_FIELD = {
  kind: 'text' as const,
  key: 'sourceHeadingText' as const,
  label: 'Header text',
  description: 'Overrides the full quote header. Leave blank to use the source title and period.',
};

// Named theme save/apply/edit-and-resave lives entirely in pages/quote-lab.tsx
// now (its own custom panel block, not a declarative field here) -- a
// `kind: 'action'` field's onClick only ever receives the live QuoteConfig,
// with no way to also collect an operator-typed theme NAME, which the save/
// edit workflow genuinely needs (so "save" and "update the same saved theme"
// are distinguishable). experiences/abstract/components/Quote/themes.ts's
// saveQuoteTheme/useQuoteThemes/deleteQuoteTheme remain the shared,
// centralized persistence -- only the UI entry point moved.

export const QUOTE_SCOPE_ID = 'Quote/appearance' as const;
const surfaceFields: ConfigScopeEntry<QuoteSurfaceConfig>[] = [
    { kind: 'boolean', key: 'enabled', label: 'Show quote' },
    { kind: 'text', key: 'text', label: 'Quote text' },
    {
      kind: 'group', label: 'Source heading', fields: [
        QUOTE_HEADING_TEXT_FIELD,
        tailwindField('letterSpacing', { key: 'sourceHeadingTracking', label: 'Header tracking' }),
        tailwindField('textTransform', { key: 'sourceHeadingTextTransform', label: 'Header text transform' }),
        { kind: 'number', key: 'sourceHeadingOpacityPercent', label: 'Header opacity', min: 0, max: 100, step: 1, integer: true, unit: '%' },
        tailwindField('marginBottom', { key: 'sourceHeadingContentGap', label: 'Header to content spacing', description: 'Adds space after an upper header or before a lower header, beyond any shared header padding.' }),
        { kind: 'enum', key: 'headingAlign', label: 'Header alignment', options: [
          { label: 'LEFT', value: 'start' }, { label: 'CENTER', value: 'center' }, { label: 'RIGHT', value: 'end' },
        ] },
        {
          kind: 'boolean', key: 'sourceHeadingTopAligned', label: 'Align heading to top',
          description: 'For a heading inside the quote: off centers it with the quote content; on places it at the padded top edge and centers the remaining content below. Headings outside the quote are unaffected.',
        },
      ],
    },
    { kind: 'boolean', key: 'showQuotationMarks', label: 'Show quotation marks' },
    { kind: 'boolean', key: 'showClosingQuotationMark', label: 'Show closing mark', description: 'When off, only the opening mark is shown.', visibleWhen: config => config.showQuotationMarks },
    {
      kind: 'group', label: 'Quotation mark style', visibleWhen: config => config.showQuotationMarks, fields: [
        {
          kind: 'subgroup', label: 'Opening mark ( " )', defaultCollapsed: false, fields: [
            { kind: 'number', key: 'openingMarkSizeEm', label: 'Size', description: 'Relative to the quote\'s own font size.', min: 0.1, max: 60, step: 0.1, unit: 'em' },
            { kind: 'number', key: 'openingMarkOpacityPercent', label: 'Opacity', min: 0, max: 100, step: 1, integer: true, unit: '%' },
            { kind: 'number', key: 'openingMarkOffsetXPercent', label: 'Offset X', description: 'Percent of the figure\'s own box width. 0 = flush with the figure\'s left edge.', min: -300, max: 400, step: 1, integer: true, unit: '%' },
            { kind: 'number', key: 'openingMarkOffsetYPercent', label: 'Offset Y', description: 'Percent of the figure\'s own box height. 0 = flush with the figure\'s top edge.', min: -300, max: 400, step: 1, integer: true, unit: '%' },
          ],
        },
        {
          kind: 'subgroup', label: 'Closing mark ( " )', defaultCollapsed: false, visibleWhen: config => config.showClosingQuotationMark, fields: [
            { kind: 'number', key: 'closingMarkSizeEm', label: 'Size', description: 'Relative to the quote\'s own font size.', min: 0.1, max: 60, step: 0.1, unit: 'em' },
            { kind: 'number', key: 'closingMarkOpacityPercent', label: 'Opacity', min: 0, max: 100, step: 1, integer: true, unit: '%' },
            { kind: 'number', key: 'closingMarkOffsetXPercent', label: 'Offset X', description: 'Percent of the figure\'s own box width. 0 = flush with the figure\'s left edge.', min: -300, max: 400, step: 1, integer: true, unit: '%' },
            { kind: 'number', key: 'closingMarkOffsetYPercent', label: 'Offset Y', description: 'Percent of the figure\'s own box height. 0 = flush with the figure\'s top edge.', min: -300, max: 400, step: 1, integer: true, unit: '%' },
          ],
        },
        tailwindField('fontFamily', { key: 'markFontFamily', label: 'Quotation mark font' }),
      ],
    },
    { kind: 'boolean', key: 'showAuthor', label: 'Show attribution' },
    { kind: 'text', key: 'author', label: 'Author name', visibleWhen: config => config.showAuthor },
    // Retained in the config schema for saved payloads. The old gradient
    // text source is inactive now that the plain quote uses one solid tint.
    {
      kind: 'select', key: 'textColorSource', label: 'Legacy quote ink',
      visibleWhen: () => false,
      options: [
        { label: 'Parent text color', value: 'inherit' },
        ...COVER_FLOW_GRADIENT_SOURCE_CARDS.map(value => ({ label: `Source ${value} gradient`, value })),
      ],
    },
    {
      kind: 'group', label: 'Gradient ink', fields: [
        { kind: 'boolean', key: 'gradientInkEnabled', label: 'Use gradient' },
        {
          kind: 'enum', key: 'gradientInkRenderMode', label: 'Render mode',
          description: 'UNIFIED INK paints the live mesh behind the quote. CSS FALLBACK fills quote text with a CSS gradient; on a textless parent quote it paints the background instead.',
          options: [
            { label: 'UNIFIED INK (mesh)', value: 'unified' },
            { label: 'CSS FALLBACK', value: 'css' },
          ],
          visibleWhen: config => config.gradientInkEnabled,
        },
        {
          kind: 'boolean', key: 'gradientInkHologramEnabled', label: 'Enable holographic response',
          description: 'Responds to pointer proximity on the live CoverFlow mesh. Uses the card hologram tuning when the host provides it. Unified-ink mode only.',
          visibleWhen: config => config.gradientInkEnabled && config.gradientInkRenderMode === 'unified',
        },
        {
          kind: 'number', key: 'gradientInkHologramStrengthPercent', label: 'Hologram strength',
          description: 'Scales the card-like gradient pan, hue shift, saturation flash, and brightness flash together. 100% matches the card response.',
          min: 0, max: 200, step: 1, integer: true, unit: '%',
          visibleWhen: config => config.gradientInkEnabled && config.gradientInkRenderMode === 'unified' && config.gradientInkHologramEnabled,
        },
        {
          kind: 'select', key: 'gradientInkSourceCard', label: 'CoverFlow gradient',
          description: 'Which card\'s deck gradient to draw from. In CSS mode this is the card whose three representative colors build the fallback gradient.',
          options: COVER_FLOW_GRADIENT_SOURCE_CARDS.map(value => ({ label: `Source ${value}`, value })),
          visibleWhen: config => config.gradientInkEnabled,
        },
        {
          kind: 'number', key: 'gradientInkMeshDarkeningPercent', label: 'Mesh darkening',
          description: 'Darkens the gradient. 0% leaves brightness unchanged; 100% makes it black unless lightening offsets it. Applies to both render modes.',
          min: 0, max: 100, step: 1, integer: true, unit: '%',
          visibleWhen: config => config.gradientInkEnabled,
        },
        {
          kind: 'number', key: 'gradientInkMeshLighteningPercent', label: 'Mesh lightening',
          description: 'Brightens the gradient. Equal lightening and darkening values restore the original brightness. Applies to both render modes.',
          min: 0, max: 100, step: 1, integer: true, unit: '%',
          visibleWhen: config => config.gradientInkEnabled,
        },
        {
          kind: 'number', key: 'gradientInkMeshSaturationPercent', label: 'Mesh saturation',
          description: 'Gradient saturation. 100% preserves the deck color; 0% is monochrome. Applies to both the unified mesh and the CSS fallback colors.',
          min: 0, max: 200, step: 1, integer: true, unit: '%',
          visibleWhen: config => config.gradientInkEnabled,
        },
        { kind: 'number', key: 'gradientInkMeshScaleX', label: 'Gradient X scale', description: 'Horizontal scale relative to the current gradient. 1 keeps its shape; lower values compress it, higher values stretch it.', min: 0.2, max: 5, step: 0.01, visibleWhen: config => config.gradientInkEnabled },
        { kind: 'number', key: 'gradientInkMeshScaleY', label: 'Gradient Y scale', description: 'Vertical scale relative to the current gradient. 1 keeps its shape; lower values compress it, higher values stretch it.', min: 0.2, max: 5, step: 0.01, visibleWhen: config => config.gradientInkEnabled },
        {
          kind: 'number', key: 'gradientInkCssAngleDegrees', label: 'CSS gradient angle',
          description: 'Angle of the CSS fallback\'s linear-gradient. 0° points up, 90° points right (CSS convention). CSS-fallback mode only.',
          min: 0, max: 360, step: 1, integer: true, unit: '°',
          visibleWhen: config => config.gradientInkEnabled && config.gradientInkRenderMode === 'css',
        },
        { kind: 'color', key: 'gradientInkBaseColor', label: 'Base background color', visibleWhen: config => config.gradientInkEnabled && config.gradientInkRenderMode === 'unified' },
        { kind: 'color', key: 'gradientInkSurfaceColor', label: 'Text layer background', visibleWhen: config => config.gradientInkEnabled && config.gradientInkRenderMode === 'unified' },
        { kind: 'color', key: 'gradientInkTextColor', label: 'Text layer ink', visibleWhen: config => config.gradientInkEnabled && config.gradientInkRenderMode === 'unified' },
        {
          kind: 'enum', key: 'gradientInkBlendMode', label: 'Blend mode',
          options: [{ label: 'SCREEN', value: 'screen' }, { label: 'MULTIPLY', value: 'multiply' }],
          visibleWhen: config => config.gradientInkEnabled && config.gradientInkRenderMode === 'unified',
        },
        {
          kind: 'number', key: 'gradientInkOverlayOpacityPercent', label: 'Overlay opacity',
          description: 'Opacity of the text-layer background over the gradient backdrop. Lower values reveal more of the gradient through the surface itself, not just through the blended text.',
          min: 0, max: 100, step: 1, integer: true, unit: '%',
          visibleWhen: config => config.gradientInkEnabled && config.gradientInkRenderMode === 'unified',
        },
        {
          kind: 'number', key: 'gradientInkTextOpacityPercent', label: 'Text opacity',
          description: 'Opacity of the quote/author text ink color, independent of the overlay opacity above.',
          min: 0, max: 100, step: 1, integer: true, unit: '%',
          visibleWhen: config => config.gradientInkEnabled && config.gradientInkRenderMode === 'unified',
        },
        {
          kind: 'boolean', key: 'gradientInkBorderEnabled', label: 'Overlay border',
          description: 'Opt-in border framing the unified-ink overlay (the text-layer surface over the mesh). Unified-ink mode only.',
          visibleWhen: config => config.gradientInkEnabled && config.gradientInkRenderMode === 'unified',
        },
        tailwindField('borderWidth', {
          key: 'gradientInkBorderWidth', label: 'Border thickness',
          visibleWhen: config => config.gradientInkEnabled && config.gradientInkRenderMode === 'unified' && config.gradientInkBorderEnabled,
        }),
        {
          kind: 'enum', key: 'gradientInkBorderStyle', label: 'Border style',
          description: 'CSS border-style. Inset/outset/groove/ridge are 3D styles derived from the border color (most visible at 2px+).',
          options: [
            { label: 'SOLID', value: 'solid' },
            { label: 'DASHED', value: 'dashed' },
            { label: 'DOTTED', value: 'dotted' },
            { label: 'DOUBLE', value: 'double' },
            { label: 'GROOVE', value: 'groove' },
            { label: 'RIDGE', value: 'ridge' },
            { label: 'INSET', value: 'inset' },
            { label: 'OUTSET', value: 'outset' },
          ],
          visibleWhen: config => config.gradientInkEnabled && config.gradientInkRenderMode === 'unified' && config.gradientInkBorderEnabled,
        },
        {
          kind: 'color', key: 'gradientInkBorderColor', label: 'Border color',
          visibleWhen: config => config.gradientInkEnabled && config.gradientInkRenderMode === 'unified' && config.gradientInkBorderEnabled,
        },
      ],
    },
    {
      kind: 'group', label: 'Geometry', fields: [
        {
          kind: 'boolean', key: 'cardAspectRatioEnabled', label: 'Match quote ratio',
          description: 'Keeps this quote at the card\'s portrait ratio (3:4 by default). Longer content scrolls inside the box instead of changing its shape. Takes priority over Box shape.',
        },
        {
          kind: 'enum', key: 'geometryShape', label: 'Box shape',
          description: 'Auto keeps the figure\'s height content-driven. The other shapes set a preferred ratio, but long content can make the box grow. Content stays centered when it fits.',
          visibleWhen: config => !config.cardAspectRatioEnabled,
          options: [
            { label: 'AUTO', value: 'auto' },
            { label: 'SQUARE', value: 'square' },
            { label: 'PORTRAIT', value: 'portrait' },
            { label: 'LANDSCAPE', value: 'landscape' },
          ],
        },
        { kind: 'boolean', key: 'borderRadiusEnabled', label: 'Round corners' },
        tailwindField('borderRadius', { key: 'borderRadius', label: 'Corner radius · Mobile', visibleWhen: config => config.borderRadiusEnabled }),
        tailwindField('borderRadius', { key: 'borderRadiusMd', label: 'Corner radius · Tablet', breakpoint: 'md', visibleWhen: config => config.borderRadiusEnabled }),
        tailwindField('borderRadius', { key: 'borderRadiusLg', label: 'Corner radius · Desktop', breakpoint: 'lg', visibleWhen: config => config.borderRadiusEnabled }),
        { kind: 'boolean', key: 'clipOverflowEnabled', label: 'Clip overflow', description: 'When on, anything extending past the figure\'s own box (e.g. a large or offset quotation mark) is clipped instead of bleeding past the edges.' },
      ],
    },
    {
      kind: 'group', label: 'Elevation & shadow', fields: [
        { kind: 'boolean', key: 'elevationEnabled', label: 'Enable elevation', description: 'Proximity-driven lift, tilt and scale toward the pointer (the shared card-lift physics). Independent of the cast shadow below -- turn either on alone, or both. Only takes effect when this surface is rendered with lift physics (e.g. quote-lab, the wall).' },
        { kind: 'boolean', key: 'shadowEnabled', label: 'Cast shadow', description: 'Renders the elevation drop shadow. Independent of elevation above, so the quote can cast a shadow without lifting, lift without a shadow, both, or neither. Only takes effect when this surface is rendered with lift physics.' },
      ],
    },
    {
      kind: 'group', label: 'Solid fill', fields: [
        { kind: 'boolean', key: 'solidFillEnabled', label: 'Solid fill background', description: 'Opt-in. Paints the quote with a plain solid color, independent of the palette/gradient backgrounds. A solid-fill quote makes a clean backdrop for another, blended quote nested inside it. Inherited by every quote type.' },
        { kind: 'color', key: 'solidFillColor', label: 'Fill color', visibleWhen: config => config.solidFillEnabled },
      ],
    },
    {
      kind: 'group', label: 'Quote blend', fields: [
        { kind: 'boolean', key: 'cardBlendEnabled', label: 'Blend whole quote', description: 'Wraps this quote in a parent quote and blends the complete child as one unit. Configure the parent below.' },
        { kind: 'select', key: 'cardBlendMode', label: 'Wrapped quote blend mode', description: 'Blends the complete child quote as one unit. Its own gradient ink blend mode remains independent.', options: CARD_BLEND_MODES.map(mode => ({ label: mode.replace(/-/g, ' ').toUpperCase(), value: mode })), visibleWhen: config => config.cardBlendEnabled },
      ],
    },
    {
      kind: 'group', label: 'Palette', visibleWhen: config => !config.gradientInkEnabled, fields: [
        { kind: 'boolean', key: 'paletteBackgroundEnabled', label: 'Use palette background', description: 'Paints the figure with a swatch from the generated palette below and derives a readable ink from it -- overrides any background a host passes to this Quote. The swatches themselves render as clickable color chips directly on the quote (Quote.tsx\'s onPaletteColorIndexChange), not just as this number field.' },
        {
          kind: 'subgroup', label: 'Background', defaultCollapsed: false, visibleWhen: config => config.paletteBackgroundEnabled,
          fields: [
            {
              kind: 'number', key: 'paletteColorIndex', label: 'Swatch',
              description: `Which of the ${QUOTE_PALETTE_SIZE} generated swatches to use as the background. Also directly clickable as a color chip on the quote itself.`,
              min: 1, max: QUOTE_PALETTE_SIZE, step: 1, integer: true,
            },
            {
              kind: 'number', key: 'paletteSaturationPercent', label: 'Saturation',
              description: 'Applied to all swatches uniformly. Lower is more pastel/muted; higher is more vivid.',
              min: 0, max: 100, step: 1, integer: true, unit: '%',
            },
            {
              kind: 'number', key: 'paletteLightnessPercent', label: 'Lightness',
              description: 'Applied to all swatches uniformly -- how light or dark the whole palette reads.',
              min: 0, max: 100, step: 1, integer: true, unit: '%',
            },
          ],
        },
        {
          kind: 'subgroup', label: 'Text ink', defaultCollapsed: false, visibleWhen: config => config.paletteBackgroundEnabled,
          fields: [
            {
              kind: 'number', key: 'textColorSaturationPercent', label: 'Saturation (chroma)',
              description: 'The quote text\'s own saturation -- independent from the background swatch\'s saturation above. Hue is still taken from the background; only saturation/lightness are set separately.',
              min: 0, max: 100, step: 1, integer: true, unit: '%',
            },
            {
              kind: 'number', key: 'textColorLightnessPercent', label: 'Lightness (darkness)',
              description: 'How dark or light the quote text reads, independent from the background\'s own lightness. Honored exactly whenever legible against the chosen background; nudged the minimum amount otherwise so text never becomes unreadable.',
              min: 0, max: 100, step: 1, integer: true, unit: '%',
            },
          ],
        },
      ],
    },
    // Breakpoint-segregated sizing (quote text size, author size, outer
    // margins, and the four padding sides) organized under the same MOBILE/TABLET/DESKTOP device
    // tabs the other responsive panels use (AbstractEditorialHero, journal,
    // CoverFlow) -- tab ids 'all-sizes'/'mobile'/'tablet'/'desktop' drive the
    // resolver's current-device highlight (DEVICE_TIER_TAB_ID in
    // components/Panel/config/controlResolver.tsx). The non-responsive
    // typographic knobs (font family, measure, leading, tracking, wrap,
    // hyphenation) live under ALL SIZES since they apply at every tier; the
    // per-tier labels drop their "(mobile/tablet/desktop)" suffixes because
    // the active tab already states the viewport.
    {
      kind: 'tabs',
      tabs: [
        {
          id: 'all-sizes',
          label: 'ALL SIZES',
          fields: [
            {
              kind: 'group', label: 'Quote text', fields: [
                tailwindField('fontFamily', { key: 'textFontFamily', label: 'Quote font' }),
                tailwindField('fontWeight', { key: 'textFontWeight', label: 'Quote weight' }),
                tailwindField('textTransform', { key: 'textTransform', label: 'Text transform' }),
                { kind: 'number', key: 'measureCh', label: 'Measure (ch)', description: 'Character line-length of the quote body. Used when the Width override below is AUTO.', min: 16, max: 90, step: 1, integer: true },
                tailwindField('maxWidth', { key: 'measureMaxWidth', label: 'Width · Mobile', description: 'AUTO = use the character measure. Pick a width to override, including max-w-full (100%), max-w-percent-*, or a rem cap.' }),
                tailwindField('maxWidth', { key: 'measureMaxWidthMd', label: 'Width · Tablet', breakpoint: 'md' }),
                tailwindField('maxWidth', { key: 'measureMaxWidthLg', label: 'Width · Desktop', breakpoint: 'lg' }),
                tailwindField('lineHeight', { key: 'leading', label: 'Line height' }),
                tailwindField('letterSpacing', { key: 'tracking', label: 'Tracking' }),
                { kind: 'number', key: 'textOpacityPercent', label: 'Content opacity', min: 0, max: 100, step: 1, integer: true, unit: '%' },
                { kind: 'enum', key: 'textAlign', label: 'Content alignment', options: [
                  { label: 'LEFT', value: 'start' }, { label: 'CENTER', value: 'center' }, { label: 'RIGHT', value: 'end' },
                ] },
                {
                  kind: 'enum', key: 'textWrap', label: 'Line-wrap strategy',
                  description: 'Pretty avoids ugly rags/orphans. Balance evens out line lengths (best for short 2-4 line quotes). Wrap is the plain greedy algorithm.',
                  options: [
                    { label: 'PRETTY', value: 'pretty' },
                    { label: 'BALANCE', value: 'balance' },
                    { label: 'WRAP', value: 'wrap' },
                  ],
                },
                {
                  kind: 'boolean', key: 'hyphens', label: 'Hyphenate long words',
                  description: 'Lets the browser hyphenate at narrow measures/padding instead of leaving a large ragged-right gap.',
                },
              ],
            },
            {
              kind: 'group', label: 'Attribution', fields: [
                tailwindField('fontFamily', { key: 'authorFontFamily', label: 'Author font' }),
              ],
            },
          ],
        },
        {
          id: 'mobile',
          label: 'MOBILE (< 768px)',
          fields: [
            {
              kind: 'group', label: 'Quote text', fields: [
                tailwindField('fontSize', { key: 'textSize', label: 'Text size' }),
              ],
            },
            {
              kind: 'group', label: 'Attribution', fields: [
                tailwindField('fontSize', { key: 'authorSize', label: 'Author size' }),
              ],
            },
            {
              kind: 'group', label: 'Source heading', fields: [
                tailwindField('fontSize', { key: 'sourceHeadingFontSize', label: 'Header size' }),
              ],
            },
            {
              kind: 'group', label: 'Outer spacing', fields: [
                tailwindField('marginTop', { key: 'marginTop', label: 'Top margin' }),
                tailwindField('marginBottom', { key: 'marginBottom', label: 'Bottom margin' }),
              ],
            },
            {
              kind: 'group', label: 'Padding', fields: [
                tailwindField('paddingTop', { key: 'paddingTop', label: 'Top padding' }),
                tailwindField('paddingRight', { key: 'paddingRight', label: 'Right padding' }),
                tailwindField('paddingBottom', { key: 'paddingBottom', label: 'Bottom padding' }),
                tailwindField('paddingLeft', { key: 'paddingLeft', label: 'Left padding' }),
              ],
            },
          ],
        },
        {
          id: 'tablet',
          label: 'TABLET (≥ 768px)',
          fields: [
            {
              kind: 'group', label: 'Quote text', fields: [
                tailwindField('fontSize', { key: 'textSizeMd', label: 'Text size', breakpoint: 'md' }),
              ],
            },
            {
              kind: 'group', label: 'Attribution', fields: [
                tailwindField('fontSize', { key: 'authorSizeMd', label: 'Author size', breakpoint: 'md' }),
              ],
            },
            {
              kind: 'group', label: 'Source heading', fields: [
                tailwindField('fontSize', { key: 'sourceHeadingFontSizeMd', label: 'Header size', breakpoint: 'md' }),
              ],
            },
            {
              kind: 'group', label: 'Outer spacing', fields: [
                tailwindField('marginTop', { key: 'marginTopMd', label: 'Top margin', breakpoint: 'md' }),
                tailwindField('marginBottom', { key: 'marginBottomMd', label: 'Bottom margin', breakpoint: 'md' }),
              ],
            },
            {
              kind: 'group', label: 'Padding', fields: [
                tailwindField('paddingTop', { key: 'paddingTopMd', label: 'Top padding', breakpoint: 'md' }),
                tailwindField('paddingRight', { key: 'paddingRightMd', label: 'Right padding', breakpoint: 'md' }),
                tailwindField('paddingBottom', { key: 'paddingBottomMd', label: 'Bottom padding', breakpoint: 'md' }),
                tailwindField('paddingLeft', { key: 'paddingLeftMd', label: 'Left padding', breakpoint: 'md' }),
              ],
            },
          ],
        },
        {
          id: 'desktop',
          label: 'DESKTOP (≥ 1024px)',
          fields: [
            {
              kind: 'group', label: 'Quote text', fields: [
                tailwindField('fontSize', { key: 'textSizeLg', label: 'Text size', breakpoint: 'lg' }),
              ],
            },
            {
              kind: 'group', label: 'Attribution', fields: [
                tailwindField('fontSize', { key: 'authorSizeLg', label: 'Author size', breakpoint: 'lg' }),
              ],
            },
            {
              kind: 'group', label: 'Source heading', fields: [
                tailwindField('fontSize', { key: 'sourceHeadingFontSizeLg', label: 'Header size', breakpoint: 'lg' }),
              ],
            },
            {
              kind: 'group', label: 'Outer spacing', fields: [
                tailwindField('marginTop', { key: 'marginTopLg', label: 'Top margin', breakpoint: 'lg' }),
                tailwindField('marginBottom', { key: 'marginBottomLg', label: 'Bottom margin', breakpoint: 'lg' }),
              ],
            },
            {
              kind: 'group', label: 'Padding', fields: [
                tailwindField('paddingTop', { key: 'paddingTopLg', label: 'Top padding', breakpoint: 'lg' }),
                tailwindField('paddingRight', { key: 'paddingRightLg', label: 'Right padding', breakpoint: 'lg' }),
                tailwindField('paddingBottom', { key: 'paddingBottomLg', label: 'Bottom padding', breakpoint: 'lg' }),
                tailwindField('paddingLeft', { key: 'paddingLeftLg', label: 'Left padding', breakpoint: 'lg' }),
              ],
            },
          ],
        },
      ],
    },
];

const wrappingQuoteSection = createWrappingQuoteSection(surfaceFields);
const wrappingQuoteFieldKeys = new Set(getConfigScopeFieldKeys([wrappingQuoteSection as never]));
const hiddenWrappingQuoteKeys = (Object.keys(DEFAULT_QUOTE_SURFACE_CONFIG) as Array<keyof QuoteSurfaceConfig>)
  .map(parentQuoteKey).filter(key => !wrappingQuoteFieldKeys.has(key));

export const QUOTE_PANEL = defineConfigScope<QuoteConfig>({
  id: QUOTE_SCOPE_ID,
  component: 'Quote', scope: 'appearance',
  title: 'Base quote', createdAt: '2026-10-10', defaultOpen: false,
  summary: 'Proportional typography and CoverFlow palette ink',
  defaultValue: DEFAULT_QUOTE_CONFIG,
  hiddenKeys: ['gradientInkMeshScale', ...hiddenWrappingQuoteKeys],
  fields: surfaceFields.flatMap(field => field.kind === 'group' && field.label === 'Quote blend'
    ? [field as ConfigScopeEntry<QuoteConfig>, wrappingQuoteSection]
    : [field as ConfigScopeEntry<QuoteConfig>]),
  copy: {
    targetFile: 'experiences/abstract/components/Quote/config.ts',
    targetSymbol: 'DEFAULT_QUOTE_CONFIG',
    targetType: 'QuoteConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
