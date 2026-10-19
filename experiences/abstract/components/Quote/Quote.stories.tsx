import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { siteSans, siteSerif } from '../../../../components/siteFonts';
import type { SliderContentSlide } from '../../../../helpers/postContent';
import { DEFAULT_LIQUID_SLIDER_CONFIG } from '../AbstractPostDock/config/legacy';
import {
  DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG,
  DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG,
} from '../AbstractPostDock/config/registered';
import { useLiquidSliderMotion } from '../AbstractPostDock/hooks/motion';
import { buildDeckPaletteStates } from '../../helpers/deckPalette';
import { buildCoverFlowQuoteGradients } from './coverFlowPalette';
import { Quote, type QuoteProps } from './Quote';
import {
  DEFAULT_QUOTE_CONFIG,
  STATEMENT_QUOTE_CONFIG,
  PASSAGE_QUOTE_CONFIG,
  FEATURE_QUOTE_CONFIG,
  type QuoteConfig,
} from './config';

const gradients = buildCoverFlowQuoteGradients(10, DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG);
const LONG_QUOTE_TEXT = 'The most useful ideas rarely arrive fully formed. They begin as questions we are willing to carry through uncertainty, conversations that change our assumptions, and small experiments that make a possibility tangible. When we slow down enough to notice what people are actually trying to do, a different shape for the work often appears. We can give that shape room to grow, test it with care, and keep the parts that make life clearer or more generous. Good design is less about making every answer feel immediate and more about creating the conditions in which people can understand where they are, choose where to go next, and feel confident that the path still belongs to them.';
const coverFlowSlides: SliderContentSlide[] = Array.from({ length: 10 }, (_, index) => ({
  id: index, slug: `quote-preview-${index}`, label: `Card ${index + 1}`,
  title: `Card ${index + 1}`, excerpt: '', topic: '', date: '', readingTime: '', href: '#',
  externalUrl: null, forceExternalNavigation: false,
  seed: index + 1, hueOffset: 0, variationBias: 0, offsetX: 0, offsetY: 0, accent: '#ffffff',
}));
const coverFlowPalettes = buildDeckPaletteStates({
  slides: coverFlowSlides,
  paletteConfig: DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG,
  hueInfluenceConfig: {
    ...DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG,
    enabled: false,
    transitionEnabled: false,
  },
  activeIndex: null,
});

const meta = {
  title: 'Abstract/Editorial Quote',
  component: Quote,
  parameters: { layout: 'centered' },
  args: { config: DEFAULT_QUOTE_CONFIG, gradients },
  argTypes: {
    config: { control: 'object', description: 'Quote content and the same values used by its config panel.' },
    textAppearance: { control: 'object', description: 'Optional MinimalModeText typography, tint, and emphasis overrides shared by every quote variant.' },
    gradients: { control: false },
  },
  decorators: [Story => (
    <div
      className={`${siteSans.variable} ${siteSerif.variable} font-sans`}
      style={{ width: 'min(86vw, 760px)', color: '#241b69', background: '#f8f7f4' }}
    >
      <Story />
    </div>
  )],
} satisfies Meta<typeof Quote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OriginalThought: Story = {};

export const EmphasizedText: Story = {
  args: {
    config: {
      ...DEFAULT_QUOTE_CONFIG,
      text: 'A useful quote can keep the **core idea** clear and offer a [next step](/about).',
    },
    textAppearance: {
      dimOpacity: 0.55,
      emphasisOpacity: 1,
      highlightedWordFontWeight: 700,
    },
  },
};

export const SansText: Story = {
  args: {
    config: {
      ...DEFAULT_QUOTE_CONFIG,
      textFontFamily: 'font-sans',
      showAuthor: true,
      author: 'Manuel Cerdas',
      authorFontFamily: 'font-serif',
    },
  },
};

function FontSwitchDemo({ config, gradients }: QuoteProps) {
  const [font, setFont] = useState<'font-serif' | 'font-sans'>('font-serif');
  return (
    <div>
      <div role="group" aria-label="Quote text font" style={{ display: 'flex', gap: 12, padding: 12 }}>
        <button type="button" aria-pressed={font === 'font-serif'} onClick={() => setFont('font-serif')}>Serif</button>
        <button type="button" aria-pressed={font === 'font-sans'} onClick={() => setFont('font-sans')}>Sans</button>
      </div>
      <Quote config={{ ...config, textFontFamily: font }} gradients={gradients} />
    </div>
  );
}

export const SwitchFonts: Story = {
  render: args => <FontSwitchDemo {...args} />,
};

function BlendDemo({ config, gradients: quoteGradients }: QuoteProps) {
  const motion = useLiquidSliderMotion(DEFAULT_LIQUID_SLIDER_CONFIG);
  const [value, setValue] = useState<QuoteConfig>({ ...DEFAULT_QUOTE_CONFIG, ...config });
  const choose = (patch: Partial<QuoteConfig>) => setValue(previous => ({ ...previous, ...patch }));
  return (
    <div>
      <div role="group" aria-label="Quote ink treatment" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: 12 }}>
        <button type="button" onClick={() => choose({ gradientInkEnabled: false })}>Plain</button>
        <button type="button" onClick={() => choose({ gradientInkEnabled: true, gradientInkRenderMode: 'unified', gradientInkBlendMode: 'screen', gradientInkSurfaceColor: DEFAULT_QUOTE_CONFIG.gradientInkSurfaceColor, gradientInkTextColor: DEFAULT_QUOTE_CONFIG.gradientInkTextColor })}>Screen ink</button>
        <button type="button" onClick={() => choose({ gradientInkEnabled: true, gradientInkRenderMode: 'unified', gradientInkBlendMode: 'multiply', gradientInkSurfaceColor: DEFAULT_QUOTE_CONFIG.gradientInkSurfaceColor, gradientInkTextColor: DEFAULT_QUOTE_CONFIG.gradientInkTextColor })}>Multiply ink</button>
        <button type="button" onClick={() => choose({ gradientInkEnabled: true, gradientInkRenderMode: 'css' })}>CSS ink</button>
        <button type="button" onClick={() => choose({ gradientInkEnabled: true, gradientInkRenderMode: 'unified', gradientInkBlendMode: 'screen', gradientInkSurfaceColor: '#f1e5cf', gradientInkTextColor: '#191626' })}>Custom colors</button>
        <button type="button" aria-pressed={value.showAuthor} onClick={() => choose({ showAuthor: !value.showAuthor })}>{value.showAuthor ? 'Hide author' : 'Show author'}</button>
        <label>Gradient source <select aria-label="Gradient source card" value={value.gradientInkSourceCard} onChange={event => choose({ gradientInkSourceCard: event.target.value as QuoteConfig['gradientInkSourceCard'] })}>
          {coverFlowSlides.map((slide, index) => <option key={slide.id} value={String(index + 1)}>{slide.title}</option>)}
        </select></label>
      </div>
      <Quote
        config={value}
        gradients={quoteGradients}
        coverFlowGradient={{
          slides: coverFlowSlides,
          palettes: coverFlowPalettes,
          motion,
          config: DEFAULT_LIQUID_SLIDER_CONFIG,
          paletteConfig: DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG,
        }}
      />
    </div>
  );
}

export const UnifiedGradientInk: Story = {
  args: { config: { ...DEFAULT_QUOTE_CONFIG, gradientInkEnabled: true, gradientInkSourceCard: '3' } },
  render: args => <BlendDemo {...args} />,
};

export const UnifiedGradientInkWithAuthor: Story = {
  args: {
    config: {
      ...DEFAULT_QUOTE_CONFIG,
      gradientInkEnabled: true,
      gradientInkSourceCard: '3',
      showAuthor: true,
      author: '',
    },
  },
  render: args => <BlendDemo {...args} />,
};

export const LongForm: Story = {
  args: { config: { ...DEFAULT_QUOTE_CONFIG, text: LONG_QUOTE_TEXT, showAuthor: true } },
};

export const LongFormSans: Story = {
  args: { config: { ...DEFAULT_QUOTE_CONFIG, text: LONG_QUOTE_TEXT, showAuthor: true, textFontFamily: 'font-sans' } },
};

export const LongFormWithoutQuotationMarks: Story = {
  args: { config: { ...DEFAULT_QUOTE_CONFIG, text: LONG_QUOTE_TEXT, showAuthor: true, showQuotationMarks: false } },
};

export const LongFormUnifiedGradientInk: Story = {
  args: { config: { ...DEFAULT_QUOTE_CONFIG, text: LONG_QUOTE_TEXT, showAuthor: true, gradientInkEnabled: true, gradientInkSourceCard: '3' } },
  render: args => <BlendDemo {...args} />,
};

export const LongFormUnifiedGradientInkMultiply: Story = {
  args: { config: { ...DEFAULT_QUOTE_CONFIG, text: LONG_QUOTE_TEXT, showAuthor: true, gradientInkEnabled: true, gradientInkBlendMode: 'multiply', gradientInkSourceCard: '3' } },
  render: args => <BlendDemo {...args} />,
};

export const WithoutQuotationMarks: Story = {
  args: { config: { ...DEFAULT_QUOTE_CONFIG, showQuotationMarks: false } },
};

export const AttributedGradient: Story = {
  args: {
    config: {
      ...DEFAULT_QUOTE_CONFIG,
      text: 'I build software, lead teams, and work on how people make sense of what we build.',
      showAuthor: true,
      author: 'Manuel Cerdas',
      textColorSource: '3',
    },
  },
};

export const CompactAndLarge: Story = {
  render: args => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', color: '#241b69' }}>
      <div style={{ width: 280, background: '#f8f7f4' }}><Quote {...args} /></div>
      <div style={{ width: 640, maxWidth: '86vw', background: '#f8f7f4' }}><Quote {...args} /></div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Masonry-wall ROLE presets (pages/wall.tsx).
//
// These three stories document the STATEMENT / PASSAGE / FEATURE presets as
// the wall actually renders them: on the wall's single warm paper + ink, in a
// rounded card, at a representative masonry-column width, with the exact
// /about timeline fragments each role carries (even index -> Statement line,
// odd index -> Passage body, the chosen index -> Feature). They are recorded
// here as the concrete appearance under review -- the operator disliked this
// treatment on the wall, so these are the reference artifacts for that, not an
// endorsed default. The visual knobs live in each *_QUOTE_CONFIG in config.ts.

// Mirror of the wall's own surface/ink constants (pages/wall.tsx:
// WALL_QUOTE_PAPER / WALL_QUOTE_INK) so the stories match the real cards.
const WALL_QUOTE_PAPER = '#faf9f6';
const WALL_QUOTE_INK = '#26222e';
// Representative column width (desktop wall is a multi-column masonry, so a
// Statement's display size wraps very differently here than at the meta
// decorator's ~760px): documents the roles at the width they really occupy.
const WALL_COLUMN_WIDTH = 360;

/** Renders a single wall quote exactly as pages/wall.tsx composes it: the role
 * preset, the shared paper/ink via `style`, the rounded-card `className`, and
 * -- only when the preset enables gradient ink (Feature) -- the live
 * CoverFlow palette wired through `coverFlowGradient` (which needs the motion
 * hook, hence a component). `caption` becomes the Passage byline, matching the
 * wall's use of the timeline stage `period` there. */
function WallRolePreset({ config, caption }: { config: QuoteConfig; caption?: string }) {
  const motion = useLiquidSliderMotion(DEFAULT_LIQUID_SLIDER_CONFIG);
  return (
    <div style={{ width: WALL_COLUMN_WIDTH, maxWidth: '86vw' }}>
      <Quote
        className="overflow-hidden rounded-[1.25rem]"
        style={{
          backgroundColor: WALL_QUOTE_PAPER,
          color: WALL_QUOTE_INK,
          border: config.gradientInkEnabled ? `2px solid ${WALL_QUOTE_PAPER}` : undefined,
        }}
        config={{
          ...config,
          ...(caption ? { author: caption } : {}),
          gradientInkSourceCard: '3',
          gradientInkBaseColor: WALL_QUOTE_PAPER,
        }}
        coverFlowGradient={config.gradientInkEnabled ? {
          slides: coverFlowSlides,
          palettes: coverFlowPalettes,
          motion,
          config: DEFAULT_LIQUID_SLIDER_CONFIG,
        } : undefined}
      />
    </div>
  );
}

/** STATEMENT -- the short `line`s (even wall indices): serif display accent,
 * single opening mark, no author. Text is the consulting-stage line. */
export const WallRoleStatement: Story = {
  parameters: { layout: 'centered' },
  render: () => (
    <WallRolePreset config={{ ...STATEMENT_QUOTE_CONFIG, text: 'Contractor, then multiple squads, then whole engagements' }} />
  ),
};

/** PASSAGE -- the long `body`s (odd wall indices): serif reading size, ~60ch
 * measure, 1.5 leading, muted sans byline (the stage `period`). Text is the
 * contractor-stage body. */
export const WallRolePassage: Story = {
  parameters: { layout: 'centered' },
  render: () => (
    <WallRolePreset
      config={{ ...PASSAGE_QUOTE_CONFIG, text: 'I began more than a decade ago as a contractor, building software on long projects for large corporations. The brief usually arrived finished, and the job was to build it well. Years of doing that made me curious about what the brief did not ask: how people would understand and use what we built.' }}
      caption="circa 2010"
    />
  ),
};

/** FEATURE -- the single chromatic quote: palette-derived gradient ink, serif,
 * single opening mark. Text is the McKinsey-stage line (the wall's default
 * feature). */
export const WallRoleFeature: Story = {
  parameters: { layout: 'centered' },
  render: () => (
    <WallRolePreset config={{ ...FEATURE_QUOTE_CONFIG, text: 'Several teams at once, on firm-wide initiatives' }} />
  ),
};

/** All three roles stacked on the shared paper -- the combined reference for
 * the wall treatment under review. */
export const WallRolesTogether: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', padding: 24, background: '#eef1f4' }}>
      <WallRolePreset config={{ ...STATEMENT_QUOTE_CONFIG, text: 'Contractor, then multiple squads, then whole engagements' }} />
      <WallRolePreset
        config={{ ...PASSAGE_QUOTE_CONFIG, text: 'I began more than a decade ago as a contractor, building software on long projects for large corporations. The brief usually arrived finished, and the job was to build it well. Years of doing that made me curious about what the brief did not ask: how people would understand and use what we built.' }}
        caption="circa 2010"
      />
      <WallRolePreset config={{ ...FEATURE_QUOTE_CONFIG, text: 'Several teams at once, on firm-wide initiatives' }} />
    </div>
  ),
};
