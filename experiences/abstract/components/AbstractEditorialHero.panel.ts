import {
  defineConfigScope,
  type ConfigScopeEntry,
} from '../../../components/Panel/config';
import {
  MARGIN_TOP_LG_OPTIONS,
  MARGIN_TOP_OPTIONS,
  MARGIN_TOP_WIDE_OPTIONS,
} from '../../../components/tailwindSpacingScale';
import { MAX_WIDTH_OPTIONS } from '../../../components/tailwindTypographyScale';
import {
  DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG,
  FONT_SIZE_TOKENS,
  FONT_SIZE_TOKEN_LABELS,
  type AbstractEditorialHeroConfig,
  type AbstractEditorialHeroHeadlineFontSizeNarrow,
  type AbstractEditorialHeroHeadlineFontSizeMid,
  type AbstractEditorialHeroHeadlineFontSizeWide,
} from './AbstractEditorialHero.config';

export const ABSTRACT_EDITORIAL_HERO_LAYOUT_SCOPE_ID =
  'AbstractEditorialHero/layout' as const;

/** One canonical option list per breakpoint prefix — the full Tailwind
 * font-size scale, shared by both the Heading size and Body size fields at
 * that breakpoint (their value types are structurally identical) instead of
 * each being a separately hand-typed, easily-drifting subset. */
const NARROW_FONT_SIZE_OPTIONS: ReadonlyArray<
  { label: string; value: AbstractEditorialHeroHeadlineFontSizeNarrow }
> = FONT_SIZE_TOKENS.map(sizeToken => ({
  label: FONT_SIZE_TOKEN_LABELS[sizeToken],
  value: `text-${sizeToken}`,
}));
const MID_FONT_SIZE_OPTIONS: ReadonlyArray<
  { label: string; value: AbstractEditorialHeroHeadlineFontSizeMid }
> = FONT_SIZE_TOKENS.map(sizeToken => ({
  label: FONT_SIZE_TOKEN_LABELS[sizeToken],
  value: `md:text-${sizeToken}`,
}));
const WIDE_FONT_SIZE_OPTIONS: ReadonlyArray<
  { label: string; value: AbstractEditorialHeroHeadlineFontSizeWide }
> = FONT_SIZE_TOKENS.map(sizeToken => ({
  label: FONT_SIZE_TOKEN_LABELS[sizeToken],
  value: `lg:text-${sizeToken}`,
}));

const ALL_SIZES_FIELDS = [
  {
    kind: 'group',
    label: 'Headline gradient',
    fields: [
      {
        kind: 'enum',
        key: 'headlineGradientRelationship',
        label: 'Gradient relationship',
        description: 'Linked reuses exact legacy pixels. Custom uses the same renderer with heading-specific controls.',
        options: [
          { label: 'LINKED', value: 'linked' },
          { label: 'CUSTOM', value: 'custom' },
        ],
      },
      {
        kind: 'enum',
        key: 'headlineGradientSourceMode',
        label: 'Gradient source',
        options: [
          { label: 'FULL FIELD', value: 'full' },
          { label: 'BAND', value: 'band' },
        ],
      },
      {
        kind: 'number',
        key: 'headlineGradientSourceRow',
        label: 'Source band',
        min: 1,
        max: 16,
        step: 1,
        integer: true,
        visibleWhen: config => config.headlineGradientSourceMode === 'band',
      },
      {
        kind: 'boolean',
        key: 'headlineGradientDebugEnabled',
        label: 'Show heading gradient debug',
        description: 'Displays the exact unmasked headline texture in a lower-right preview.',
      },
      {
        kind: 'number',
        key: 'headlineGradientDebugSizePx',
        label: 'Debug preview size',
        description: 'Controls the square preview frame without changing gradient sampling.',
        min: 240,
        max: 480,
        step: 8,
        unit: 'px',
        integer: true,
        visibleWhen: config => config.headlineGradientDebugEnabled,
      },
      {
        kind: 'number',
        key: 'headlineGradientScale',
        label: 'Gradient scale',
        description: 'Magnifies the selected legacy band without changing its proportions.',
        min: 1,
        max: 3,
        step: 0.05,
        unit: 'x',
      },
      {
        kind: 'number',
        key: 'headlineGradientPanXPercent',
        label: 'Gradient horizontal position',
        description: 'Chooses the horizontal crop within the selected legacy band.',
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
      },
      {
        kind: 'number',
        key: 'headlineGradientPanYPercent',
        label: 'Gradient vertical position',
        description: 'Chooses the vertical crop after gradient magnification.',
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
      },
    ],
  },
  {
    kind: 'group',
    label: 'Headline color',
    fields: [
      {
        kind: 'enum',
        key: 'headlineFillMode',
        label: 'Headline fill',
        description: 'SURFACE (default) renders the headline in the hero\'s own surface color, visible only through its shadow — an embossed/color-matched look. SOLID overrides this with a conventional flat color instead, and always wins over any gradient headline underneath.',
        options: [
          { label: 'SURFACE', value: 'surface' },
          { label: 'SOLID', value: 'solid' },
        ],
      },
      {
        kind: 'enum',
        key: 'copyColorMode',
        label: 'Solid color source',
        description: 'Surface derives from the surfaceColor prop; Column derives from this hero\'s own split column color (both offset by Solid color offset below, Column also contrast-checked); Custom uses the color below.',
        options: [
          { label: 'CUSTOM', value: 'custom' },
          { label: 'SURFACE', value: 'surface' },
          { label: 'COLUMN', value: 'column' },
        ],
        visibleWhen: config => config.headlineFillMode === 'solid',
      },
      {
        kind: 'color',
        key: 'copyColor',
        label: 'Solid color',
        description: 'The headline\'s flat color while Headline fill is SOLID and Solid color source is CUSTOM.',
        visibleWhen: config => config.headlineFillMode === 'solid' && config.copyColorMode === 'custom',
      },
      {
        kind: 'number',
        key: 'copySurfaceOffset',
        label: 'Solid color offset',
        description: 'How much lighter (positive) or darker (negative) than the base color the headline is, while Solid color source is SURFACE or COLUMN.',
        min: -1,
        max: 1,
        step: 0.01,
        visibleWhen: config => config.headlineFillMode === 'solid' &&
          (config.copyColorMode === 'surface' || config.copyColorMode === 'column'),
      },
      {
        kind: 'number',
        key: 'copyMinContrast',
        label: 'Solid color minimum contrast',
        description: 'WCAG contrast ratio the headline must clear against its own split column color, while Solid color source is COLUMN.',
        min: 1,
        max: 21,
        step: 0.1,
        visibleWhen: config => config.headlineFillMode === 'solid' && config.copyColorMode === 'column',
      },
      {
        kind: 'boolean',
        key: 'headlineShadowEnabled',
        label: 'Cast CTA-style shadow',
        description: 'Applies the same elevation-shadow engine and tuning as the CTA button (reuses its shadow* settings) to the headline. Only applies while Headline fill is SURFACE.',
        visibleWhen: config => config.headlineFillMode === 'surface',
      },
      {
        kind: 'boolean',
        key: 'headlineShadowElevatedEnabled',
        label: 'Force elevated state',
        description: 'Pins the shadow to the CTA\'s hover/lifted elevation instead of its resting elevation — the headline always reads as raised.',
        visibleWhen: config => config.headlineFillMode === 'surface' && config.headlineShadowEnabled,
      },
      {
        kind: 'number',
        key: 'headlineShadowScale',
        label: 'Shadow scale',
        description: 'Scales the shadow\'s blur and displacement relative to the CTA\'s own values. 1 (default) = identical scale to the CTA. Lower keeps individual letterforms more readable through the shadow at small headline sizes, at the cost of matching the CTA less closely.',
        min: 0.1,
        max: 1.5,
        step: 0.05,
        visibleWhen: config => config.headlineFillMode === 'surface' && config.headlineShadowEnabled,
      },
    ],
  },
  {
    kind: 'group',
    label: 'Typography',
    fields: [
      {
        kind: 'boolean',
        key: 'headlineMatchesBodySize',
        label: 'Match body size',
        description: 'Renders the headline at the same font size as the paragraph copy below (every breakpoint), instead of its own larger heading-size trio. Heading weight below (not this toggle) is what keeps it reading as a heading. Also relaxes the headline\'s tight display line-height/letter-spacing to the paragraph\'s own rhythm, since those are tuned for a much bigger size and read as broken once the headline wraps at body size.',
      },
      {
        kind: 'boolean',
        key: 'headlineInlineWithParagraph',
        label: 'Inline with first paragraph',
        description: 'Merges the headline into the first paragraph\'s own text run instead of its own block above the supporting copy — that paragraph\'s own text continues right after it, on the same line. Independent of Match body size above: that toggle only decides whether the merged headline keeps its own larger heading size/weight or drops to body size, not whether it merges at all. Off (default) keeps today\'s stacked headline-then-paragraphs layout.',
      },
      {
        kind: 'enum',
        key: 'headlineFontFamily',
        label: 'Heading font',
        description: 'Inherit (default) follows the site-wide Global typography setting. Sans/Serif pin the headline regardless of that setting.',
        options: [
          { label: 'INHERIT', value: 'inherit' },
          { label: 'SANS', value: 'sans' },
          { label: 'SERIF', value: 'serif' },
        ],
      },
      {
        kind: 'enum',
        key: 'headlineFontWeight',
        label: 'Heading weight',
        description: 'Font-weight of the headline itself — previously hardcoded (bold only while Match body size above is on; the browser\'s own default h1 bold otherwise), with no operator control. Independent of Emphasis weight below, which only affects **word**-marked accents in the paragraph copy.',
        options: [
          { label: 'NORMAL', value: 'font-normal' },
          { label: 'MEDIUM', value: 'font-medium' },
          { label: 'SEMIBOLD', value: 'font-semibold' },
          { label: 'BOLD', value: 'font-bold' },
        ],
      },
      {
        kind: 'enum',
        key: 'paragraphFontFamily',
        label: 'Body font',
        description: 'Inherit (default) keeps this component\'s own unconditional default (sans) — unlike the heading font above, there is no site-wide body-font setting to follow. Sans/Serif pin the paragraph, eyebrow, and supporting copy regardless.',
        options: [
          { label: 'INHERIT', value: 'inherit' },
          { label: 'SANS', value: 'sans' },
          { label: 'SERIF', value: 'serif' },
        ],
      },
      {
        kind: 'select',
        key: 'contentMaxWidth',
        label: 'Content max width',
        description: 'Caps the headline and paragraph together as one column. This is the same shared max-width scale used by the Timeline panel.',
        options: MAX_WIDTH_OPTIONS,
      },
      {
        kind: 'select',
        key: 'headlineMaxWidth',
        label: 'Heading max width',
        description: 'Caps the headline independently from the paragraph copy.',
        options: MAX_WIDTH_OPTIONS,
      },
      {
        kind: 'select',
        key: 'paragraphMaxWidth',
        label: 'Paragraph max width',
        description: 'Caps the supporting paragraph copy independently from the headline.',
        options: MAX_WIDTH_OPTIONS,
      },
      {
        kind: 'number',
        key: 'copyLineHeight',
        label: 'Line height',
        min: 1.25,
        max: 1.7,
        step: 0.01,
        unit: 'x',
      },
      {
        kind: 'number',
        key: 'copyLetterSpacingEm',
        label: 'Letter spacing',
        min: -0.03,
        max: 0.02,
        step: 0.001,
        unit: 'em',
      },
    ],
  },
  {
    kind: 'group',
    label: 'Content',
    fields: [
      {
        kind: 'boolean',
        key: 'composerVisible',
        label: 'Composer visible',
        description: 'Off skips the CTA composer pill entirely — its wrapping element is omitted from the tree, not merely hidden, so no gap is left behind.',
      },
      {
        kind: 'boolean',
        key: 'accordionItemPresentationEnabled',
        label: 'Accordion-item presentation',
        description: 'Off (default): the plain headline/paragraph layout above. On: headline + paragraphs instead render through the same header-row/expandable-paragraph/open-indicator-bullet component /about\'s own mobile accordion uses per row, as a single always-open, non-interactive item (no chevron interaction, no divider/border chrome). Font size, spacing, and the open indicator itself are tuned from the "Hero accordion item" panel section, not here.',
      },
      {
        kind: 'boolean',
        key: 'accordionItemOpenIndicatorEnabled',
        label: 'Accordion-item open indicator',
        description: 'Only meaningful while accordion-item presentation above is on. Off hides the filled open-indicator bullet for THIS hero specifically, without touching the shared accordion config\'s own open-indicator setting (which may still be on for /about\'s real mobile accordion).',
        visibleWhen: config => config.accordionItemPresentationEnabled,
      },
    ],
  },
  {
    kind: 'group',
    label: 'Monochrome palette',
    fields: [
      {
        kind: 'enum',
        key: 'paragraphTextColorMode',
        label: 'Paragraph text source',
        description: 'Surface derives from the surfaceColor prop; Column derives from this hero\'s own split column color (both offset by Paragraph text offset below, Column also contrast-checked); Custom uses the color below.',
        options: [
          { label: 'CUSTOM', value: 'custom' },
          { label: 'SURFACE', value: 'surface' },
          { label: 'COLUMN', value: 'column' },
        ],
      },
      {
        kind: 'color',
        key: 'paragraphTextColor',
        label: 'Paragraph text',
        visibleWhen: config => config.paragraphTextColorMode === 'custom',
      },
      {
        kind: 'number',
        key: 'paragraphSurfaceOffset',
        label: 'Paragraph text offset',
        description: 'How much lighter (positive) or darker (negative) than the base color the paragraph copy is, while Paragraph text source is SURFACE or COLUMN.',
        min: -1,
        max: 1,
        step: 0.01,
        visibleWhen: config => config.paragraphTextColorMode === 'surface' ||
          config.paragraphTextColorMode === 'column',
      },
      {
        kind: 'number',
        key: 'paragraphMinContrast',
        label: 'Paragraph text minimum contrast',
        description: 'WCAG contrast ratio the paragraph copy must clear against its own split column color, while Paragraph text source is COLUMN.',
        min: 1,
        max: 21,
        step: 0.1,
        visibleWhen: config => config.paragraphTextColorMode === 'column',
      },
      {
        kind: 'boolean',
        key: 'paragraphUsesWordmarkGradient',
        label: 'Paragraph uses wordmark gradient',
        description: 'Opt-in, off by default. Requires the page to also opt into PolymorphicLayoutConfig\'s own "Wordmark uses scroll gradient" (BACKGROUND tab) and have Scroll gradient background active at the current tier. When on: the ENTIRE paragraph — base copy, **word**/link emphasis runs, and the inline headline when merged into the paragraph — renders through that exact same gradient as one continuous fill, overriding Paragraph text source/color entirely. Emphasis weight (bold pivot words) still applies on top of the shared gradient, but Base word opacity/Emphasis word opacity/the title opacity override all become INERT (forced to fully opaque) while this is on — a real iOS device (not the Simulator) promotes any opacity-below-1 text into its own compositing layer that loses the gradient fill entirely, blanking the WHOLE paragraph rather than just the dim portions; confirmed live. Independent of Headline gradient above, which drives only the standalone (non-inline) heading\'s own separate canvas-based gradient. Mutually exclusive with "Paragraph uses wordmark gradient (blend)" below — this one wins if both are on.',
      },
      {
        kind: 'boolean',
        key: 'paragraphUsesWordmarkGradientBlend',
        label: 'Paragraph uses wordmark gradient (blend)',
        description: 'Opt-in, off by default. Same gating as "Paragraph uses wordmark gradient" above (PolymorphicLayoutConfig\'s "Wordmark uses scroll gradient" + Scroll gradient background active) — but a fundamentally different, more broadly-compatible technique: instead of clipping the gradient inside the glyph shapes (which needed the real-device-only WebKit workarounds described above), the paragraph text stays completely normal — its own real color, opacity, and font-weight, the merged headline unchanged — and simply visually blends (CSS mix-blend-mode) against whatever is already rendered behind the hero on the page (the real scroll-gradient background, not a separate painted layer — this hero has no opaque background of its own, so introducing one just to blend against would show as a visible rectangle behind the text, which was tried and reverted). A genuinely different look, not a pixel-identical alternative: text tinted by whatever is behind it, not gradient rendered inside the letterforms. Mutually exclusive with "Paragraph uses wordmark gradient" above — that one wins if both are on.',
      },
      {
        // 15 options — well past SegmentedControl's practical ~6-8 ceiling
        // (SelectConfigField's own doc comment, components/Panel/config/
        // types.ts) — 'select' (native <select> dropdown), not 'enum'
        // (unreadable button row at this count, confirmed live).
        kind: 'select',
        key: 'paragraphGradientBlendMode',
        label: 'Blend mode',
        description: '"Luminosity" (default) reliably shows a visible tint even for white/gray text — it takes hue/saturation FROM the backdrop. "Color" takes hue/saturation FROM the text instead, so with typically-white/gray text it renders NO visible tint at all regardless of backdrop (confirmed live) — avoid it unless Blend text color below is set to something with real chroma of its own. "Screen"/"Lighten"/"Hard light" also render no visible change for solid white text (they clamp to white regardless of backdrop).',
        options: [
          { label: 'MULTIPLY', value: 'multiply' },
          { label: 'SCREEN', value: 'screen' },
          { label: 'OVERLAY', value: 'overlay' },
          { label: 'DARKEN', value: 'darken' },
          { label: 'LIGHTEN', value: 'lighten' },
          { label: 'COLOR DODGE', value: 'color-dodge' },
          { label: 'COLOR BURN', value: 'color-burn' },
          { label: 'HARD LIGHT', value: 'hard-light' },
          { label: 'SOFT LIGHT', value: 'soft-light' },
          { label: 'DIFFERENCE', value: 'difference' },
          { label: 'EXCLUSION', value: 'exclusion' },
          { label: 'HUE', value: 'hue' },
          { label: 'SATURATION', value: 'saturation' },
          { label: 'COLOR', value: 'color' },
          { label: 'LUMINOSITY', value: 'luminosity' },
        ],
        visibleWhen: config => config.paragraphUsesWordmarkGradientBlend,
      },
      {
        kind: 'color',
        key: 'paragraphGradientBlendColor',
        label: 'Blend text color',
        description: 'The paragraph\'s entire base text color while blend mode is active — overrides Paragraph text source/color and any page-supplied color override entirely (existing opacity/weight distinctions between base and emphasis text still apply on top of this one shared color). Default white matches this hero\'s usual look, but a color with real hue/saturation of its own makes EVERY blend mode above visibly interact with the backdrop, not just "Luminosity."',
        visibleWhen: config => config.paragraphUsesWordmarkGradientBlend,
      },
      {
        kind: 'boolean',
        key: 'paragraphGradientScrollLightenEnabled',
        label: 'Paragraph gradient clears on scroll',
        description: 'Opt-in, off by default. Only meaningful while "Paragraph uses wordmark gradient" above is also on, and the page supplies the scroll-gradient background\'s own darken-curve timing (viewport range + easing) to this component. As the page\'s scroll-gradient background progressively darkens toward the bottom of its range, this gradient\'s own fixed stops are blended toward white by the same amount (see the amount below) — "clearing" the text rather than letting it read as an increasingly muddy, low-contrast smear against a much darker backdrop than the one it was originally tuned against. Tracks the background\'s own timing/easing exactly (same viewport-range/tau values), not an independent scroll animation.',
        visibleWhen: config => config.paragraphUsesWordmarkGradient,
      },
      {
        kind: 'number',
        key: 'paragraphGradientScrollLightenMaxAmount',
        label: 'Max clear amount',
        description: 'How far each gradient stop blends toward white once the scroll curve reaches its own full progress (the same point the background reaches its own maximum darken). 0 = no visible effect; 1 = pure white at full scroll.',
        min: 0,
        max: 1,
        step: 0.05,
        visibleWhen: config => config.paragraphUsesWordmarkGradient && config.paragraphGradientScrollLightenEnabled,
      },
      {
        kind: 'enum',
        key: 'eyebrowColorMode',
        label: 'Eyebrow source',
        description: 'Surface derives from the surfaceColor prop; Column derives from this hero\'s own split column color (both offset by Eyebrow offset below, Column also contrast-checked); Custom uses the color below.',
        options: [
          { label: 'CUSTOM', value: 'custom' },
          { label: 'SURFACE', value: 'surface' },
          { label: 'COLUMN', value: 'column' },
        ],
      },
      {
        kind: 'color',
        key: 'eyebrowColor',
        label: 'Eyebrow gray',
        visibleWhen: config => config.eyebrowColorMode === 'custom',
      },
      {
        kind: 'number',
        key: 'eyebrowSurfaceOffset',
        label: 'Eyebrow offset',
        description: 'How much lighter (positive) or darker (negative) than the base color the eyebrow label is, while Eyebrow source is SURFACE or COLUMN.',
        min: -1,
        max: 1,
        step: 0.01,
        visibleWhen: config => config.eyebrowColorMode === 'surface' ||
          config.eyebrowColorMode === 'column',
      },
      {
        kind: 'number',
        key: 'eyebrowMinContrast',
        label: 'Eyebrow minimum contrast',
        description: 'WCAG contrast ratio the eyebrow label must clear against its own split column color, while Eyebrow source is COLUMN.',
        min: 1,
        max: 21,
        step: 0.1,
        visibleWhen: config => config.eyebrowColorMode === 'column',
      },
    ],
  },
  {
    kind: 'group',
    label: 'Emphasis',
    fields: [
      {
        kind: 'boolean',
        key: 'emphasisHighlightEnabled',
        label: 'Highlight pivot words',
        description: 'On (default): the two **word**-marked pivot words per paragraph (and [text](href) links) render with the weight/opacity/color settings below. Off: every word in the paragraph — pivot or not — renders identically, as plain body text; links keep their dotted underline (a functional "this is clickable" cue, not a decorative highlight) but otherwise blend in. Never affects the headline — it doesn\'t use this highlighting mechanism at all, on or off.',
      },
      {
        kind: 'enum',
        key: 'emphasisFontWeight',
        label: 'Emphasis weight',
        description: 'Font-weight applied to the two pivot words per paragraph, on top of Emphasis word opacity below — this is what actually makes the highlight visible. The opacity pair alone can\'t: this hero\'s locked 4.5:1 body-contrast floor caps Base word opacity at 0.88, leaving at most a ~12%-opacity gap to Emphasis word opacity\'s ceiling of 1 — too subtle to read as a highlight by itself. A heavier weight carries no such contrast penalty, so it\'s the primary cue; the opacity pair is a secondary fine-tune on top of it.',
        options: [
          { label: 'NORMAL', value: 'font-normal' },
          { label: 'MEDIUM', value: 'font-medium' },
          { label: 'SEMIBOLD', value: 'font-semibold' },
          { label: 'BOLD', value: 'font-bold' },
        ],
        visibleWhen: config => config.emphasisHighlightEnabled,
      },
      {
        kind: 'number',
        key: 'emphasisDimOpacity',
        label: 'Base word opacity',
        description: 'Reuses the About page\'s own opacity-graded emphasis mechanism (renderEmphasisText, helpers/textEmphasis.tsx) — the two pivot words per paragraph render at Emphasis word opacity below, every other word at this dimmer opacity. Below 0.88, base text drops under the locked 4.5:1 contrast minimum against this hero\'s own paragraph color/surface pairing — values down to the 0.5 floor trade that contrast for a stronger fade deliberately. Inert (forced to fully opaque) while Paragraph uses wordmark gradient is on — see that field\'s own description.',
        min: 0.5,
        max: 1,
        step: 0.01,
      },
      {
        kind: 'number',
        key: 'emphasisWordOpacity',
        label: 'Emphasis word opacity',
        description: 'Opacity of the two pivot words per paragraph (marked in source with **word** — the same markup convention the About page uses). Secondary to Emphasis weight above, which carries the actual visible highlight. Inert (forced to fully opaque) while Paragraph uses wordmark gradient is on — see that field\'s own description.',
        min: 0.88,
        max: 1,
        step: 0.01,
        visibleWhen: config => config.emphasisHighlightEnabled,
      },
    ],
  },
] satisfies ReadonlyArray<ConfigScopeEntry<AbstractEditorialHeroConfig>>;

export const ABSTRACT_EDITORIAL_HERO_LAYOUT_PANEL =
  defineConfigScope<AbstractEditorialHeroConfig>({
    id: ABSTRACT_EDITORIAL_HERO_LAYOUT_SCOPE_ID,
    component: 'AbstractEditorialHero',
    scope: 'layout',
    title: 'Editorial hero layout',
    createdAt: '2026-07-14',
    summary: 'Responsive type · reading measure · monochrome surface',
    defaultOpen: false,
    defaultValue: DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG,
    fields: [
      {
        kind: 'tabs',
        tabs: [
          {
            id: 'all-sizes',
            label: 'ALL SIZES',
            fields: ALL_SIZES_FIELDS,
          },
          {
            id: 'mobile',
            label: 'MOBILE (< 768px)',
            fields: [
              {
                kind: 'group',
                label: 'Typography',
                fields: [
                  {
                    kind: 'select',
                    key: 'headlineFontSizeNarrow',
                    label: 'Heading size',
                    visibleWhen: config => !config.headlineMatchesBodySize,
                    options: NARROW_FONT_SIZE_OPTIONS,
                  },
                  {
                    kind: 'select',
                    key: 'bodyFontSizeNarrow',
                    label: 'Body size',
                    options: NARROW_FONT_SIZE_OPTIONS,
                  },
                ],
              },
              {
                kind: 'select',
                key: 'leadGap',
                label: 'Lead gap',
                description: 'Space between the headline and supporting copy below tablet width. Uses Tailwind\'s complete margin-top scale.',
                options: MARGIN_TOP_OPTIONS,
              },
            ],
          },
          {
            id: 'tablet',
            label: 'TABLET (≥ 768px)',
            fields: [
              {
                kind: 'group',
                label: 'Typography',
                fields: [
                  {
                    kind: 'select',
                    key: 'headlineFontSizeMid',
                    label: 'Heading size',
                    visibleWhen: config => !config.headlineMatchesBodySize,
                    options: MID_FONT_SIZE_OPTIONS,
                  },
                  {
                    kind: 'select',
                    key: 'bodyFontSizeMid',
                    label: 'Body size',
                    options: MID_FONT_SIZE_OPTIONS,
                  },
                ],
              },
              {
                kind: 'select',
                key: 'leadGapWide',
                label: 'Lead gap',
                description: 'Space between the headline and supporting copy from 768px. Uses the responsive md: margin-top scale.',
                options: MARGIN_TOP_WIDE_OPTIONS,
              },
            ],
          },
          {
            id: 'desktop',
            label: 'DESKTOP (≥ 1024px)',
            fields: [
              {
                kind: 'group',
                label: 'Typography',
                fields: [
                  {
                    kind: 'select',
                    key: 'headlineFontSizeWide',
                    label: 'Heading size',
                    visibleWhen: config => !config.headlineMatchesBodySize,
                    options: WIDE_FONT_SIZE_OPTIONS,
                  },
                  {
                    kind: 'select',
                    key: 'bodyFontSizeWide',
                    label: 'Body size',
                    options: WIDE_FONT_SIZE_OPTIONS,
                  },
                ],
              },
              {
                kind: 'select',
                key: 'leadGapLg',
                label: 'Lead gap',
                description: 'Space between the headline and supporting copy from 1024px. Uses the responsive lg: margin-top scale.',
                options: MARGIN_TOP_LG_OPTIONS,
              },
            ],
          },
        ],
      },
    ],
    copy: {
      targetFile: 'experiences/abstract/components/AbstractEditorialHero.config.ts',
      targetSymbol: 'DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG',
      targetType: 'AbstractEditorialHeroConfig',
      updateStrategy: 'replace_scope',
      completeScope: true,
    },
  });
