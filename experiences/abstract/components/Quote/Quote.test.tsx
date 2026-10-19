import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { colord } from 'colord';
import { DEFAULT_CTA_BUTTON_CONFIG } from '../../../../components/CtaButton/config/registered';
import { DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG, DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG } from '../AbstractPostDock/config/registered';
import { DEFAULT_LIQUID_SLIDER_CONFIG } from '../AbstractPostDock/config/legacy';
import { Quote, type QuoteCoverFlowGradient } from './Quote';
// Used only as fixture-data generators below (building a `gradients` prop
// array to pass in) -- Quote.tsx's own gradient-ink backdrop no longer uses
// this generator internally, see the "shared no-canvas fallback" tests.
import { buildCoverFlowQuoteGradients } from './coverFlowPalette';
import { DEFAULT_QUOTE_CONFIG, buildQuoteCssInkGradientFromMeshSamples, deriveQuoteTextColor, generateQuotePalette, modulateQuoteMeshColor, normalizeQuoteConfig, type QuoteConfig } from './config';
import { QUOTE_PANEL } from './Quote.panel';
import { createEditorialQuotePanel } from './EditorialQuote.panel';
import { BOTTOM_BANNER_QUOTE_PANEL } from './BottomBannerQuote.panel';
import { VOICE_QUOTE_PANEL } from './VoiceQuote.panel';
import { createConfigScopeBinding, getConfigScopeFieldKeys } from '../../../../components/Panel/config';
import { tailwindTokenCssValue } from '../../../../components/Panel/config/tailwindFields';
import { ConfigControlResolver } from '../../../../components/Panel/config/controlResolver';
import type { RuntimeConfigFieldAreas } from '../../../../components/Panel/config/types';

vi.mock('../AbstractPostDock/components/GradientRenderer', () => ({
  LiquidGradientAdapter: ({ activity, slide, hologramConfig, hologramInteraction, meshModulation }: {
    activity: string;
    slide?: { seed?: number };
    hologramConfig?: { enabled: boolean; offsetGain: number };
    hologramInteraction?: object | null;
    meshModulation?: { brightnessMultiplier: number; saturationMultiplier: number; scale: number; scaleX?: number; scaleY?: number };
  }) => (
    <canvas data-gradient-activity={activity} data-slide-seed={slide?.seed}
      data-hologram-enabled={hologramConfig?.enabled ?? 'default'}
      data-hologram-interaction={hologramInteraction ? 'connected' : 'off'}
      data-hologram-offset-gain={hologramConfig?.offsetGain}
      data-mesh-brightness={meshModulation?.brightnessMultiplier}
      data-mesh-saturation={meshModulation?.saturationMultiplier}
      data-mesh-scale={meshModulation?.scale}
      data-mesh-scale-x={meshModulation?.scaleX}
      data-mesh-scale-y={meshModulation?.scaleY} />
  ),
}));

describe('Quote', () => {
  it('applies base header and content typography controls at the final elements', () => {
    const keys = getConfigScopeFieldKeys(QUOTE_PANEL.fields);
    for (const key of ['sourceHeadingFontSize', 'sourceHeadingTracking', 'sourceHeadingOpacityPercent',
      'sourceHeadingTextTransform', 'sourceHeadingContentGap', 'headingAlign', 'textSize', 'tracking', 'textOpacityPercent', 'leading', 'textAlign']) {
      expect(keys).toContain(key);
    }
    let edited = { ...DEFAULT_QUOTE_CONFIG, gradientInkEnabled: false, paletteBackgroundEnabled: false, sourceHeadingText: 'Header' };
    createConfigScopeBinding({ definition: QUOTE_PANEL, value: edited, onChange: next => { edited = next; } })
      .updateFields({
        sourceHeadingFontSize: 'text-xl', sourceHeadingTracking: 'tracking-wider',
        sourceHeadingOpacityPercent: 35, headingAlign: 'end',
        sourceHeadingTextTransform: 'uppercase', sourceHeadingContentGap: 'mb-8',
        textSize: 'text-lg', tracking: 'tracking-wide', leading: 'leading-loose',
        textOpacityPercent: 45, textAlign: 'start',
      });
    const html = renderToStaticMarkup(<Quote config={edited} />);
    // Font size is a literal Tailwind utility class on the heading (same
    // base/md/lg-class approach the quote body's own textSize uses), not an
    // inline style -- so it is asserted via the class attribute, separately
    // from the rest of the heading's inline style properties below.
    expect(html).toMatch(/<h3[^>]*class="[^"]*\btext-xl\b/);
    expect(html).toMatch(/<h3[^>]*text-transform:uppercase[^>]*opacity:0.35[^>]*text-align:end[^>]*margin-bottom:2rem/);
    expect(html).toMatch(/<blockquote[^>]*text-align:start[^>]*>\s*<p[^>]*opacity:0.45/);
    expect(html).toContain(`--quote-leading:${tailwindTokenCssValue('lineHeight', 'base', 'leading-loose')}`);
    expect(html).toContain(`--quote-tracking:${tailwindTokenCssValue('letterSpacing', 'base', 'tracking-wide')}`);
  });
  it('places the wrapping quote controls immediately after the blend toggle in every panel', () => {
    const panels = [QUOTE_PANEL, ...(['featured', 'plain', 'solid', 'practice'] as const).map(createEditorialQuotePanel), BOTTOM_BANNER_QUOTE_PANEL, VOICE_QUOTE_PANEL];
    for (const panel of panels) {
      const blendIndex = panel.fields.findIndex(field => field.kind === 'group' && field.label === 'Quote blend');
      const section = panel.fields[blendIndex + 1] as RuntimeConfigFieldAreas | undefined;
      expect(section?.kind, panel.id).toBe('areas');
      if (section?.kind !== 'areas') continue;
      expect(section.areas[0].label).toBe('PARENT QUOTE');
      expect(section.visibleWhen?.({ cardBlendEnabled: false })).toBe(false);
      expect(section.visibleWhen?.({ cardBlendEnabled: true })).toBe(true);
      const keys = getConfigScopeFieldKeys([section]);
      const baseKeys = getConfigScopeFieldKeys(QUOTE_PANEL.fields)
        .filter(key => !key.startsWith('parentQuote'));
      for (const key of baseKeys) {
        const parentKey = `parentQuote${key[0].toUpperCase()}${key.slice(1)}`;
        expect(keys, `${panel.id}: ${parentKey}`).toContain(parentKey);
      }
      expect(keys).toContain('parentQuoteGradientInkRenderMode');
    }
  });

  it('wraps a base quote and lets its parent settings change the backdrop', () => {
    let config = DEFAULT_QUOTE_CONFIG;
    createConfigScopeBinding({ definition: QUOTE_PANEL, value: config, onChange: next => { config = next; } })
      .updateFields({ cardBlendEnabled: true, cardBlendMode: 'screen', parentQuoteSolidFillColor: '#123456' });
    expect(normalizeQuoteConfig({ cardBlendEnabled: true }).parentQuoteSolidFillEnabled).toBe(true);
    const html = renderToStaticMarkup(<Quote config={config} />);
    expect(html).toContain('background-color:#123456');
    expect(html).toContain('data-quote-card-blend="screen"');
    expect(html.match(/<blockquote/g)).toHaveLength(1);
  });


  it('offers independent gradient X and Y scales in every quote panel', () => {
    const panels = [QUOTE_PANEL, ...(['featured', 'plain', 'solid', 'practice'] as const).map(createEditorialQuotePanel), BOTTOM_BANNER_QUOTE_PANEL];
    for (const panel of panels) {
      const gradientGroup = panel.fields.find(field => field.kind === 'group' && field.label === 'Gradient ink');
      expect(gradientGroup?.kind).toBe('group');
      if (gradientGroup?.kind !== 'group') continue;
      for (const key of ['gradientInkMeshScaleX', 'gradientInkMeshScaleY']) {
        expect(gradientGroup.fields.find(field => 'key' in field && field.key === key), `${panel.id}: ${key}`)
          .toMatchObject({ kind: 'number', min: 0.2, max: 5 });
      }
      expect(gradientGroup.fields.some(field => 'key' in field && field.key === 'gradientInkMeshScale')).toBe(false);
    }
    let edited = DEFAULT_QUOTE_CONFIG;
    createConfigScopeBinding({
      definition: QUOTE_PANEL, value: edited,
      onChange: next => { edited = next; },
    }).updateFields({ gradientInkMeshScaleX: 1.6, gradientInkMeshScaleY: 0.7 });
    const html = renderToStaticMarkup(<Quote config={edited} coverFlowGradient={source} />);
    expect(html).toContain('data-mesh-scale-x="1.6"');
    expect(html).toContain('data-mesh-scale-y="0.7"');
  });

  it('shares responsive outer spacing controls with every quote panel', () => {
    const panels = [QUOTE_PANEL, ...(['featured', 'plain', 'solid', 'practice'] as const).map(createEditorialQuotePanel), BOTTOM_BANNER_QUOTE_PANEL];
    const keys = ['marginTop', 'marginBottom', 'marginTopMd', 'marginBottomMd', 'marginTopLg', 'marginBottomLg'];
    for (const panel of panels) {
      const fields = panel.fields.flatMap(field => field.kind === 'tabs'
        ? field.tabs.flatMap(tab => tab.fields.flatMap(group => group.kind === 'group' ? group.fields : []))
        : []);
      for (const key of keys) {
        expect(fields.find(field => 'key' in field && field.key === key), `${panel.id}: ${key}`).toMatchObject({ kind: 'select' });
      }
    }
    const html = renderToStaticMarkup(<Quote config={{ marginTop: 'mt-96', marginBottom: 'mb-96', marginTopMd: 'md:mt-8', marginBottomLg: 'lg:mb-8' }} />);
    expect(html).toMatch(/class="[^"]*mt-96[^"]*md:mt-8[^"]*mb-96[^"]*lg:mb-8/);
    expect(normalizeQuoteConfig({ marginTop: 'bad' as never }).marginTop).toBe('mt-0');
  });

  it('offers mesh lightening in the base, wall variants, and bottom banner panels', () => {
    const panels = [QUOTE_PANEL, ...(['featured', 'plain', 'solid', 'practice'] as const).map(createEditorialQuotePanel), BOTTOM_BANNER_QUOTE_PANEL];
    for (const panel of panels) {
      const gradientGroup = panel.fields.find(field => field.kind === 'group' && field.label === 'Gradient ink');
      expect(gradientGroup?.kind).toBe('group');
      if (gradientGroup?.kind !== 'group') continue;
      expect(gradientGroup.fields.find(field => 'key' in field && field.key === 'gradientInkMeshLighteningPercent'))
        .toMatchObject({ kind: 'number', min: 0, max: 100 });
    }
  });

  const source = {
    slides: [{
      id: 0, slug: 'quote-test', label: 'Card 1', title: 'Card 1', excerpt: '', topic: '',
      date: '', readingTime: '', href: '#', externalUrl: null, forceExternalNavigation: false,
      seed: 1, hueOffset: 0, variationBias: 0, offsetX: 0, offsetY: 0, accent: '#ffffff',
    }],
    palettes: null,
    motion: {} as QuoteCoverFlowGradient['motion'],
    config: DEFAULT_LIQUID_SLIDER_CONFIG,
  } satisfies QuoteCoverFlowGradient;

  // A multi-slide deck with distinct seeds, so a test can prove the quote
  // selects (and hands the shared mesh) the correct per-card slide.
  const multiDeck = {
    slides: Array.from({ length: 6 }, (_, index) => ({
      id: index, slug: `card-${index}`, label: `Card ${index + 1}`, title: `Card ${index + 1}`,
      excerpt: '', topic: '', date: '', readingTime: '', href: '#', externalUrl: null,
      forceExternalNavigation: false, seed: (index + 1) * 10, hueOffset: 0, variationBias: 0,
      offsetX: 0, offsetY: 0, accent: '#ffffff',
    })),
    palettes: null,
    motion: {} as QuoteCoverFlowGradient['motion'],
    config: DEFAULT_LIQUID_SLIDER_CONFIG,
  } satisfies QuoteCoverFlowGradient;

  it('keeps an original thought unattributed, and adds a named attribution only when opted in', () => {
    const original = renderToStaticMarkup(<Quote />);
    expect(original).toContain('Abstract Voyage is where I follow the questions behind that work.');
    expect(original).not.toContain('<figcaption');

    const attributed = renderToStaticMarkup(<Quote config={{ showAuthor: true, author: 'Ada Lovelace' }} />);
    expect(attributed).toContain('<figcaption');
    expect(attributed).toContain('Ada Lovelace');
    const emptyName = renderToStaticMarkup(<Quote config={{ showAuthor: true, author: '' }} />);
    expect(emptyName).toContain('<figcaption');
    expect(emptyName).toContain(DEFAULT_QUOTE_CONFIG.author);
  });

  it('can hide both decorative quotation marks without hiding text or attribution', () => {
    const markup = renderToStaticMarkup(<Quote config={{
      showQuotationMarks: false,
      showAuthor: true,
      author: 'Manuel Cerdas',
    }} />);
    expect(markup).not.toContain('“');
    expect(markup).not.toContain('”');
    expect(markup).toContain('<blockquote');
    expect(markup).toContain('Manuel Cerdas');
    expect(QUOTE_PANEL.fields.find(field => 'key' in field && field.key === 'showQuotationMarks'))
      .toMatchObject({ kind: 'boolean' });
  });

  it('resolves the selected sans and serif font tokens independently', () => {
    const markup = renderToStaticMarkup(<Quote config={{
      textFontFamily: 'font-sans',
      showAuthor: true,
      author: 'Manuel Cerdas',
      authorFontFamily: 'font-serif',
    }} />);
    expect(markup).toContain('--quote-text-font:var(--site-font-sans)');
    expect(markup).toContain('--quote-author-font:var(--site-font-serif)');
  });

  it('changes only the base quote text transform through its panel control', () => {
    expect(normalizeQuoteConfig({ textTransform: 'invalid' as never }).textTransform).toBe('normal-case');
    const container = document.createElement('div');
    const root = createRoot(container);
    function Harness() {
      const [config, setConfig] = React.useState(DEFAULT_QUOTE_CONFIG);
      return <>
        <ConfigControlResolver binding={createConfigScopeBinding({ definition: QUOTE_PANEL, value: config, onChange: setConfig })} />
        <Quote config={config} />
      </>;
    }
    act(() => root.render(<Harness />));
    const paragraph = container.querySelector<HTMLElement>('blockquote p');
    expect(paragraph?.style.textTransform).toBe('none');
    const uppercase = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-config-field-key="textTransform"] button'))
      .find(button => button.textContent === 'UPPERCASE');
    expect(uppercase).toBeTruthy();
    act(() => uppercase?.click());
    expect(paragraph?.style.textTransform).toBe('uppercase');
    expect(paragraph?.textContent).toBe(DEFAULT_QUOTE_CONFIG.text);
    const lowercase = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-config-field-key="textTransform"] button'))
      .find(button => button.textContent === 'LOWERCASE');
    act(() => lowercase?.click());
    expect(paragraph?.style.textTransform).toBe('lowercase');
    act(() => root.unmount());
  });

  it('lets the base panel enforce the card ratio while preserving the previous box shape', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    function Harness() {
      const [config, setConfig] = React.useState<QuoteConfig>({ ...DEFAULT_QUOTE_CONFIG, geometryShape: 'landscape', gradientInkEnabled: false });
      return <>
        <ConfigControlResolver binding={createConfigScopeBinding({ definition: QUOTE_PANEL, value: config, onChange: setConfig })} />
        <Quote config={config} cardHeightToWidthRatio={4 / 3} />
      </>;
    }
    act(() => root.render(<Harness />));
    const quote = container.querySelector<HTMLElement>('[data-quote-card-ratio]');
    const figure = quote?.querySelector<HTMLElement>('figure');
    const control = container.querySelector<HTMLInputElement>('[data-config-field-key="cardAspectRatioEnabled"] input');
    expect(control).toBeTruthy();
    expect(quote?.dataset.quoteCardRatio).toBe('off');
    expect(figure?.style.aspectRatio).toBe('4 / 3');
    act(() => control?.click());
    expect(quote?.dataset.quoteCardRatio).toBe('on');
    expect(figure?.style.aspectRatio).toBe('1 / 1.3333333333333333');
    expect(figure?.style.overflow).toBe('auto');
    act(() => control?.click());
    expect(figure?.style.aspectRatio).toBe('4 / 3');
    act(() => root.unmount());
  });

  it('places an opted-in source heading at the top while keeping the quote content separate', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    function Harness() {
      const [config, setConfig] = React.useState<QuoteConfig>({ ...DEFAULT_QUOTE_CONFIG, cardAspectRatioEnabled: true, gradientInkEnabled: false });
      return <>
        <ConfigControlResolver binding={createConfigScopeBinding({ definition: QUOTE_PANEL, value: config, onChange: setConfig })} />
        <Quote config={config} sourceHeading={<h3>Chapter title</h3>} beforeContent={<span>Other furniture</span>} />
      </>;
    }
    act(() => root.render(<Harness />));
    const figure = container.querySelector('figure');
    const control = container.querySelector<HTMLInputElement>('[data-config-field-key="sourceHeadingTopAligned"] input');
    expect(figure?.dataset.quoteSourcePosition).toBe('content');
    expect(figure?.querySelector('h3')?.parentElement).toBe(figure);
    expect(figure?.querySelector('blockquote')?.parentElement).toBe(figure);
    act(() => control?.click());
    expect(figure?.dataset.quoteSourcePosition).toBe('top');
    expect(figure?.querySelector('h3')?.parentElement).toBe(figure);
    expect(figure?.querySelector('blockquote')?.parentElement).not.toBe(figure);
    expect(figure?.querySelector('blockquote')?.parentElement?.textContent).toContain('Other furniture');
    act(() => root.unmount());
  });

  it('uses the same transformed quote paragraph in both gradient ink render modes', () => {
    for (const gradientInkRenderMode of ['css', 'unified'] as const) {
      const html = renderToStaticMarkup(<Quote config={{
        gradientInkEnabled: true, gradientInkRenderMode, textTransform: 'lowercase',
      }} coverFlowGradient={source} />);
      expect(html, gradientInkRenderMode).toMatch(/<blockquote[^>]*>\s*<p[^>]*text-transform:lowercase/);
    }
  });

  it('mounts the CoverFlow renderer and full-size blend layer only when enabled', () => {
    const plain = renderToStaticMarkup(<Quote config={{ gradientInkEnabled: false }} coverFlowGradient={source} />);
    expect(plain).toContain('data-quote-blend="off"');
    expect(plain).not.toContain('<canvas');
    expect(plain).not.toContain('mix-blend-mode');

    const blended = renderToStaticMarkup(<Quote
      config={{ gradientInkEnabled: true, gradientInkSourceCard: '10' }}
      coverFlowGradient={source}
    />);
    expect(blended).toContain('data-quote-blend="screen"');
    expect(blended).toContain('<canvas');
    // The quote's mesh is the SAME live shared component the cards render, and
    // like a card it animates (continuous), not a frozen snapshot.
    expect(blended).toContain('data-gradient-activity="continuous"');
    // The shared mesh layer is marked for provable sharing/inspection.
    expect(blended).toContain('data-card-gradient-mesh="true"');
    expect(blended).toContain(`--gradient-ink-surface:${DEFAULT_QUOTE_CONFIG.gradientInkSurfaceColor}`);
    expect(blended).toContain(`--gradient-ink-opacity:${DEFAULT_QUOTE_CONFIG.gradientInkOverlayOpacityPercent / 100}`);
    expect(blended).toContain(`--gradient-ink-foreground:${colord(DEFAULT_QUOTE_CONFIG.gradientInkTextColor).alpha(DEFAULT_QUOTE_CONFIG.gradientInkTextOpacityPercent / 100).toRgbString()}`);
    expect(blended).toContain('data-gradient-ink-layer="screen"');
    expect(QUOTE_PANEL.fields.some(field => field.kind === 'group'
      && field.fields.some(child => 'key' in child && child.key === 'gradientInkEnabled'))).toBe(true);
  });

  it('falls back to the solid palette without a live deck instead of painting a black box or a CSS gradient', () => {
    const noDeck = renderToStaticMarkup(<Quote
      config={{ gradientInkEnabled: true, gradientInkSourceCard: '1', paletteBackgroundEnabled: true }}
    />);
    expect(noDeck).toContain('data-quote-blend="off"');
    expect(noDeck).toContain('data-quote-gradient-state="unavailable"');
    expect(noDeck).toContain('data-quote-palette="5"');
    expect(noDeck).not.toContain('<canvas');
    expect(noDeck).not.toContain('radial-gradient');
    expect(noDeck).not.toContain('linear-gradient(110deg');
    expect(noDeck).not.toContain('data-gradient-ink-layer');
  });

  it('hands the shared mesh the correct per-card slide from the live deck (each option selects a distinct slide, not the same backdrop)', () => {
    // gradientInkSourceCard "Card N" must select slides[N-1] from the live deck
    // and feed THAT slide to the shared CardGradientMesh -- so each option is a
    // genuinely distinct, real card-derived mesh (the multiDeck seeds are
    // 10,20,30,...; Card 1 -> seed 10, Card 5 -> seed 50).
    const card1 = renderToStaticMarkup(<Quote config={{ gradientInkEnabled: true, gradientInkSourceCard: '1' }} coverFlowGradient={multiDeck} />);
    const card5 = renderToStaticMarkup(<Quote config={{ gradientInkEnabled: true, gradientInkSourceCard: '5' }} coverFlowGradient={multiDeck} />);
    expect(card1).toContain('data-slide-seed="10"');
    expect(card5).toContain('data-slide-seed="50"');
    expect(card1).not.toBe(card5);
  });

  it('lets a preview freeze the real mesh while reader-facing quotes stay continuous', () => {
    const frozen = renderToStaticMarkup(<Quote config={{ gradientInkEnabled: true }} coverFlowGradient={{ ...source, activity: 'frozen' }} />);
    expect(frozen).toContain('data-gradient-activity="frozen"');
    const continuous = renderToStaticMarkup(<Quote config={{ gradientInkEnabled: true }} coverFlowGradient={source} />);
    expect(continuous).toContain('data-gradient-activity="continuous"');
  });

  it('keeps hologram opt-in and enables the card response even when the host setting is off', () => {
    const hostDisabled = {
      ...source,
      hologramConfig: { ...DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG, enabled: false },
    };
    const hostEnabled = {
      ...source,
      hologramConfig: DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG,
    };
    const off = renderToStaticMarkup(<Quote config={{ gradientInkEnabled: true }} coverFlowGradient={hostEnabled} />);
    expect(off).toContain('data-quote-hologram="off"');
    expect(off).toContain('data-hologram-interaction="off"');

    const on = renderToStaticMarkup(<Quote
      config={{ gradientInkEnabled: true, gradientInkHologramEnabled: true }}
      coverFlowGradient={hostDisabled}
    />);
    expect(on).toContain('data-quote-hologram="on"');
    expect(on).toContain('data-hologram-enabled="true"');
    expect(on).toContain('data-hologram-interaction="connected"');

    const defaultTuning = renderToStaticMarkup(<Quote
      config={{ gradientInkEnabled: true, gradientInkHologramEnabled: true }}
      coverFlowGradient={source}
    />);
    expect(defaultTuning).toContain('data-hologram-enabled="true"');
    expect(QUOTE_PANEL.fields.some(field => field.kind === 'group'
      && field.fields.some(child => 'key' in child && child.key === 'gradientInkHologramEnabled'))).toBe(true);
  });

  it('passes quote-only modulation to the shared WebGL mesh and card hologram', () => {
    const config = normalizeQuoteConfig({
      ...DEFAULT_QUOTE_CONFIG,
      gradientInkEnabled: true,
      gradientInkHologramEnabled: true,
      gradientInkHologramStrengthPercent: 150,
      gradientInkMeshDarkeningPercent: 40,
      gradientInkMeshLighteningPercent: 20,
      gradientInkMeshSaturationPercent: 175,
      gradientInkMeshScale: 3,
      gradientInkMeshScaleX: 1.5,
      gradientInkMeshScaleY: 0.75,
    });
    const markup = renderToStaticMarkup(<Quote config={config} coverFlowGradient={source} />);
    expect(markup).toContain('data-mesh-brightness="0.8"');
    expect(markup).toContain('data-mesh-saturation="1.75"');
    expect(markup).toContain('data-mesh-scale="3"');
    expect(markup).toContain('data-mesh-scale-x="1.5"');
    expect(markup).toContain('data-mesh-scale-y="0.75"');
    expect(markup).toContain(`data-hologram-offset-gain="${DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG.offsetGain * 1.5}"`);
    const minimum = normalizeQuoteConfig({
      ...config,
      gradientInkHologramStrengthPercent: -20,
      gradientInkMeshDarkeningPercent: -20,
      gradientInkMeshLighteningPercent: -20,
      gradientInkMeshSaturationPercent: -20,
      gradientInkMeshScale: -20,
      gradientInkMeshScaleX: -20,
      gradientInkMeshScaleY: -20,
    });
    expect([minimum.gradientInkHologramStrengthPercent, minimum.gradientInkMeshDarkeningPercent,
      minimum.gradientInkMeshLighteningPercent, minimum.gradientInkMeshSaturationPercent, minimum.gradientInkMeshScale]).toEqual([0, 0, 0, 0, 0.5]);
    expect([minimum.gradientInkMeshScaleX, minimum.gradientInkMeshScaleY]).toEqual([0.2, 0.2]);
    const maximum = normalizeQuoteConfig({
      ...config,
      gradientInkHologramStrengthPercent: 500,
      gradientInkMeshDarkeningPercent: 500,
      gradientInkMeshLighteningPercent: 500,
      gradientInkMeshSaturationPercent: 500,
      gradientInkMeshScale: 500,
      gradientInkMeshScaleX: 500,
      gradientInkMeshScaleY: 500,
    });
    expect([maximum.gradientInkHologramStrengthPercent, maximum.gradientInkMeshDarkeningPercent,
      maximum.gradientInkMeshLighteningPercent, maximum.gradientInkMeshSaturationPercent, maximum.gradientInkMeshScale]).toEqual([200, 100, 100, 200, 4]);
    expect([maximum.gradientInkMeshScaleX, maximum.gradientInkMeshScaleY]).toEqual([5, 5]);
    expect(modulateQuoteMeshColor('#808080', 100, 50, 50)).toBe('#808080');
    expect(modulateQuoteMeshColor('#808080', 100, 0, 50)).toBe('#c0c0c0');
  });

  it('prefers the live CoverFlow canvas (the real holographic mesh, same component the cards render) whenever a real deck is supplied', () => {
    const live = renderToStaticMarkup(<Quote
      config={{ gradientInkEnabled: true, gradientInkSourceCard: '1' }}
      coverFlowGradient={source}
    />);
    expect(live).toContain('<canvas');
    expect(live).toContain('data-card-gradient-mesh="true"');
    expect(live).toContain('data-gradient-activity="continuous"');
  });

  it('lets the operator dial the gradient-ink overlay and text opacity independently', () => {
    const faded = renderToStaticMarkup(<Quote
      config={{
        gradientInkEnabled: true,
        gradientInkOverlayOpacityPercent: 40,
        gradientInkTextOpacityPercent: 60,
      }}
      coverFlowGradient={source}
    />);
    expect(faded).toContain('--gradient-ink-opacity:0.4');
    expect(faded).toContain(`--gradient-ink-foreground:${colord(DEFAULT_QUOTE_CONFIG.gradientInkTextColor).alpha(0.6).toRgbString()}`);
  });

  it('passes an operator ink color to the entire blended text layer', () => {
    const blended = renderToStaticMarkup(<Quote
      config={{ gradientInkEnabled: true, gradientInkTextColor: '#123456' }}
      coverFlowGradient={source}
    />);
    expect(blended).toContain(`--gradient-ink-foreground:${colord('#123456').alpha(DEFAULT_QUOTE_CONFIG.gradientInkTextOpacityPercent / 100).toRgbString()}`);
  });

  it('keeps both text-layer blend modes authoritative after sharing the paragraph renderer', () => {
    for (const blendMode of ['screen', 'multiply'] as const) {
      const html = renderToStaticMarkup(<Quote
        config={{ text: 'Blended quote.', gradientInkEnabled: true, gradientInkBlendMode: blendMode, gradientInkTextColor: '#123456' }}
        textAppearance={{ tint: '#ff00ff' }}
        coverFlowGradient={source}
      />);
      const paragraph = html.match(/<blockquote[^>]*>\s*(<p[^>]*>Blended quote\.<\/p>)/)?.[1] ?? '';
      expect(html).toContain(`data-gradient-ink-layer="${blendMode}"`);
      expect(html).toContain(`data-quote-blend="${blendMode}"`);
      expect(html).toContain(`--gradient-ink-foreground:${colord('#123456').alpha(DEFAULT_QUOTE_CONFIG.gradientInkTextOpacityPercent / 100).toRgbString()}`);
      expect(paragraph).not.toBe('');
      expect(paragraph).toContain('data-gradient-ink-color=""');
      expect(paragraph).not.toContain('color:#ff00ff');
    }
    const css = renderToStaticMarkup(<Quote
      config={{ text: 'CSS quote.', gradientInkEnabled: true, gradientInkRenderMode: 'css' }}
      textAppearance={{ tint: '#ff00ff' }}
      coverFlowGradient={{ ...source, paletteConfig: DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG }}
    />);
    const cssParagraph = css.match(/<blockquote[^>]*>\s*(<p[^>]*>CSS quote\.<\/p>)/)?.[1] ?? '';
    expect(css).toContain('data-quote-gradient-state="css"');
    expect(cssParagraph).toContain('cssInkText');
    expect(cssParagraph).toContain('data-gradient-ink-color=""');
    expect(cssParagraph).not.toContain('color:#ff00ff');
    const plain = renderToStaticMarkup(<Quote
      config={{ text: 'Plain quote.', gradientInkEnabled: false }}
      textAppearance={{ tint: '#ff00ff' }}
    />);
    expect(plain).toMatch(/<blockquote[^>]*>\s*<p[^>]*color:#ff00ff[^>]*>Plain quote\.<\/p>/);
  });

  it('uses one solid palette tint and its derived text color only in plain mode', () => {
    const config = {
      ...DEFAULT_QUOTE_CONFIG,
      gradientInkEnabled: false,
      paletteBackgroundEnabled: true,
      paletteColorIndex: 2,
    };
    const tint = generateQuotePalette(config.paletteSaturationPercent, config.paletteLightnessPercent)[1];
    const ink = deriveQuoteTextColor(tint, config.textColorSaturationPercent, config.textColorLightnessPercent).color;
    const plain = renderToStaticMarkup(<Quote config={config} coverFlowGradient={source} />);
    expect(plain).toContain(`background-color:${tint}`);
    expect(plain).toContain(`color:${ink}`);
    expect(plain).toContain('data-quote-palette="2"');
    expect(plain).toContain('data-quote-blend="off"');
    expect(plain).not.toContain('data-gradient-ink-layer="screen"');

    const unified = renderToStaticMarkup(<Quote config={{
      ...config,
      gradientInkEnabled: true,
      gradientInkBaseColor: '#123456',
      gradientInkTextColor: '#fedcba',
      gradientInkBlendMode: 'multiply',
    }} coverFlowGradient={source} />);
    expect(unified).toContain('--quote-base-color:#123456');
    expect(unified).toContain(`--gradient-ink-foreground:${colord('#fedcba').alpha(DEFAULT_QUOTE_CONFIG.gradientInkTextOpacityPercent / 100).toRgbString()}`);
    expect(unified).toContain('data-gradient-ink-layer="multiply"');
    expect(unified).toContain('data-quote-palette="off"');
    expect(unified).not.toContain(`background-color:${tint}`);
  });

  it('keeps source metadata and typography without painting a second text gradient', () => {
    const gradients = buildCoverFlowQuoteGradients(3, DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG);
    const markup = renderToStaticMarkup(<Quote config={{ textColorSource: '3', textSize: 'text-5xl' }} gradients={gradients} />);
    expect(markup).toContain('data-quote-color-source="3"');
    expect(markup).not.toContain(gradients[2].dominant);
    expect(markup).toContain('text-5xl');
    expect(QUOTE_PANEL.fields.find(field => 'key' in field && field.key === 'textColorSource'))
      .toMatchObject({ kind: 'select', visibleWhen: expect.any(Function) });
    for (const gradient of gradients) {
      expect(colord(gradient.dominant).contrast('#ffffff')).toBeGreaterThanOrEqual(4.49);
      expect(colord(gradient.support).contrast('#ffffff')).toBeGreaterThanOrEqual(4.49);
      expect(colord(gradient.counterpoint).contrast('#ffffff')).toBeGreaterThanOrEqual(4.49);
    }
  });

  it('applies text size, author size and padding as literal per-breakpoint Tailwind classes, with no fixed box height', () => {
    const markup = renderToStaticMarkup(<Quote config={{
      showAuthor: true,
      author: 'Manuel Cerdas',
      textSize: 'text-xl', textSizeMd: 'md:text-2xl', textSizeLg: 'lg:text-3xl',
      authorSize: 'text-xs', authorSizeMd: 'md:text-sm', authorSizeLg: 'lg:text-base',
      paddingTop: 'pt-5', paddingTopMd: 'md:pt-7', paddingTopLg: 'lg:pt-9',
      paddingRight: 'pr-4', paddingRightMd: 'md:pr-8', paddingRightLg: 'lg:pr-10',
      paddingBottom: 'pb-5', paddingBottomMd: 'md:pb-7', paddingBottomLg: 'lg:pb-9',
      paddingLeft: 'pl-4', paddingLeftMd: 'md:pl-8', paddingLeftLg: 'lg:pl-10',
    }} />);
    expect(markup).toContain('text-xl');
    expect(markup).toContain('md:text-2xl');
    expect(markup).toContain('lg:text-3xl');
    expect(markup).toContain('text-xs');
    expect(markup).toContain('md:text-sm');
    expect(markup).toContain('lg:text-base');
    expect(markup).toContain('pt-5');
    expect(markup).toContain('md:pt-7');
    expect(markup).toContain('lg:pt-9');
    expect(markup).toContain('pr-4');
    expect(markup).toContain('md:pr-8');
    expect(markup).toContain('lg:pr-10');
    expect(markup).toContain('pb-5');
    expect(markup).toContain('md:pb-7');
    expect(markup).toContain('lg:pb-9');
    expect(markup).toContain('pl-4');
    expect(markup).toContain('md:pl-8');
    expect(markup).toContain('lg:pl-10');
    expect(markup).not.toContain('min-height');
    // The breakpoint-segregated sizing knobs now live under the device tabs
    // (ALL SIZES / MOBILE / TABLET / DESKTOP), so this recurses through
    // tabs -> groups -> fields rather than assuming a single flat level.
    const panelKeys = new Set<string>();
    const collectKeys = (entry: unknown): void => {
      if (!entry || typeof entry !== 'object') return;
      if ('key' in entry && typeof (entry as { key: unknown }).key === 'string') {
        panelKeys.add((entry as { key: string }).key);
      }
      if ('fields' in entry && Array.isArray((entry as { fields: unknown[] }).fields)) {
        (entry as { fields: unknown[] }).fields.forEach(collectKeys);
      }
      if ('tabs' in entry && Array.isArray((entry as { tabs: unknown[] }).tabs)) {
        (entry as { tabs: unknown[] }).tabs.forEach(collectKeys);
      }
    };
    QUOTE_PANEL.fields.forEach(collectKeys);
    for (const key of ['textSizeMd', 'textSizeLg', 'authorSizeMd', 'authorSizeLg', 'paddingTop', 'paddingTopMd', 'paddingTopLg', 'paddingRight', 'paddingRightMd', 'paddingRightLg', 'paddingBottom', 'paddingBottomMd', 'paddingBottomLg', 'paddingLeft', 'paddingLeftMd', 'paddingLeftLg']) {
      expect(panelKeys.has(key)).toBe(true);
    }
  });

  it('falls back to the parent ink for missing palettes and rejects unknown tokens', () => {
    const config = normalizeQuoteConfig({
      ...DEFAULT_QUOTE_CONFIG,
      textColorSource: '99' as typeof DEFAULT_QUOTE_CONFIG.textColorSource,
      textFontFamily: 'font-mono' as typeof DEFAULT_QUOTE_CONFIG.textFontFamily,
    });
    expect(config.textColorSource).toBe(DEFAULT_QUOTE_CONFIG.textColorSource);
    expect(config.textFontFamily).toBe(DEFAULT_QUOTE_CONFIG.textFontFamily);
    const markup = renderToStaticMarkup(<Quote config={{ textColorSource: '2' }} />);
    expect(markup).not.toContain('--quote-ink-gradient');
  });
});

describe('Quote elevation / shadow independent opt-in', () => {
  // These two effects (the proximity lift/tilt/scale transform, and the cast
  // drop shadow) are written imperatively to the root AFTER mount by
  // useCardLiftPhysics, so they need a real client render + act, not SSR.
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  const mountAndRead = (elevationEnabled: boolean, shadowEnabled: boolean) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(
      <Quote
        config={{ ...DEFAULT_QUOTE_CONFIG, gradientInkEnabled: false, paletteBackgroundEnabled: false, elevationEnabled, shadowEnabled }}
        // shadowElevationRestingPx: 1 (not DEFAULT_CTA_BUTTON_CONFIG's own
        // resting 0) models a baseline resting lift independent of hover --
        // DEFAULT_CTA_BUTTON_CONFIG rests flat by design (buttons only lift
        // on hover), which would make the "lifts when enabled" cases below
        // indistinguishable from "no lift" without ever simulating a real
        // pointer event.
        liftPhysics={{ ...DEFAULT_CTA_BUTTON_CONFIG, shadowElevationRestingPx: 1 }}
      />,
    ));
    const el = container.querySelector('[data-quote-blend]') as HTMLElement;
    const result = { transform: el?.style.transform ?? '', boxShadow: el?.style.boxShadow ?? '' };
    act(() => root.unmount());
    document.body.removeChild(container);
    return result;
  };

  // A box-shadow "casts" a visible shadow only if some layer's alpha is > 0;
  // useElevationShadow serializes fully-faded layers as `, 0.0000)`.
  const liftedY = (transform: string) => {
    const m = transform.match(/translate3d\(0,\s*(-?\d+\.?\d*)px,\s*0\)/);
    return m ? Math.abs(parseFloat(m[1])) : null;
  };
  const scaleOf = (transform: string) => {
    const m = transform.match(/scale\((\d+\.?\d*)\)/);
    return m ? parseFloat(m[1]) : null;
  };
  const hasVisibleShadow = (boxShadow: string) => {
    if (boxShadow.trim() === '' || boxShadow === 'none') return false;
    return Array.from(boxShadow.matchAll(/rgba?\([^)]*,\s*([\d.]+)\s*\)/g), m => parseFloat(m[1]))
      .some(a => a > 0);
  };

  it('lifts and casts a shadow when both are enabled', () => {
    const { transform, boxShadow } = mountAndRead(true, true);
    expect(liftedY(transform)).toBeGreaterThan(0);
    expect(scaleOf(transform)!).toBeGreaterThan(1);
    expect(hasVisibleShadow(boxShadow)).toBe(true);
  });

  it('lifts WITHOUT a shadow when only elevation is enabled', () => {
    const { transform, boxShadow } = mountAndRead(true, false);
    expect(liftedY(transform)).toBeGreaterThan(0);
    expect(scaleOf(transform)!).toBeGreaterThan(1);
    expect(hasVisibleShadow(boxShadow)).toBe(false);
  });

  it('casts a shadow WITHOUT lifting when only shadow is enabled', () => {
    const { transform, boxShadow } = mountAndRead(false, true);
    // No proximity lift and no scale growth, even though the engine runs.
    expect(liftedY(transform)).toBe(0);
    expect(scaleOf(transform)).toBe(1);
    expect(hasVisibleShadow(boxShadow)).toBe(true);
  });

  it('writes neither transform nor shadow when both are disabled', () => {
    const { transform, boxShadow } = mountAndRead(false, false);
    expect(transform).toBe('');
    expect(hasVisibleShadow(boxShadow)).toBe(false);
  });

  it('stays inert when the host provides no lift physics, regardless of config', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(
      <Quote config={{ ...DEFAULT_QUOTE_CONFIG, elevationEnabled: true, shadowEnabled: true }} />,
    ));
    const el = container.querySelector('[data-quote-blend]') as HTMLElement;
    expect(el.style.transform).toBe('');
    expect(hasVisibleShadow(el.style.boxShadow)).toBe(false);
    act(() => root.unmount());
    document.body.removeChild(container);
  });
});

describe('Quote CSS-fallback gradient ink', () => {
  const slides = Array.from({ length: 6 }, (_, index) => ({
    id: index, slug: `card-${index}`, label: `Card ${index + 1}`, title: `Card ${index + 1}`,
    excerpt: '', topic: '', date: '', readingTime: '', href: '#', externalUrl: null,
    forceExternalNavigation: false, seed: (index + 1) * 10, hueOffset: 0, variationBias: 0,
    offsetX: 0, offsetY: 0, accent: '#ffffff',
  }));
  const cssSource = {
    slides, palettes: null, motion: {} as QuoteCoverFlowGradient['motion'],
    config: DEFAULT_LIQUID_SLIDER_CONFIG, paletteConfig: DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG,
  } satisfies QuoteCoverFlowGradient;

  it('keeps the parent render mode and paints its textless CSS gradient on the surface', () => {
    const config = normalizeQuoteConfig({
      cardBlendEnabled: true, parentQuoteGradientInkEnabled: true,
      parentQuoteGradientInkRenderMode: 'css',
    });
    const html = renderToStaticMarkup(<Quote config={config} coverFlowGradient={cssSource} />);
    expect(html).toMatch(/data-quote-css-ink="on"/);
    expect(html).toMatch(/background-image:linear-gradient\(/);
    expect(html.match(/<blockquote/g)).toHaveLength(1);
  });

  it('keeps the parent unified overlay separate from the child mesh and ink layer', () => {
    const config = normalizeQuoteConfig({
      cardBlendEnabled: true,
      parentQuoteGradientInkEnabled: true,
      parentQuoteGradientInkRenderMode: 'unified',
      gradientInkEnabled: true,
      gradientInkRenderMode: 'unified',
    });
    const html = renderToStaticMarkup(<Quote config={config} coverFlowGradient={cssSource} />);
    expect(html).toContain('data-quote-parent-gradient-scrim');
    expect(html).toMatch(/data-gradient-ink-layer="off"[\s\S]*data-gradient-ink-layer="screen"/);
    expect(html.match(/data-quote-gradient-state="active"/g)).toHaveLength(2);
  });

  it('blends the complete child quote outside its independent unified ink layer', () => {
    const config = normalizeQuoteConfig({
      cardBlendEnabled: true, cardBlendMode: 'multiply',
      gradientInkEnabled: true, gradientInkRenderMode: 'unified',
      gradientInkBlendMode: 'screen',
    });
    const html = renderToStaticMarkup(<Quote config={config} coverFlowGradient={cssSource} />);
    expect(html.match(/<figure[^>]*style="([^"]*)"/)?.[1]).toContain('mix-blend-mode:multiply');
    expect(html).toContain('data-gradient-ink-layer="screen"');
    const wrapper = html.match(/data-quote-whole-blend="multiply" style="([^"]*)"/)?.[1];
    expect(wrapper).toBeDefined();
    expect(wrapper).not.toContain('mix-blend-mode');
    const childRootStyle = html.match(/data-quote-whole-blend="multiply"[^>]*><div[^>]*style="([^"]*)"/)?.[1];
    expect(childRootStyle).toBeDefined();
    expect(childRootStyle).not.toContain('mix-blend-mode');

    const unifiedParent = renderToStaticMarkup(<Quote config={{
      ...config,
      parentQuoteGradientInkEnabled: true,
      parentQuoteGradientInkRenderMode: 'unified',
      parentQuoteGradientInkSourceCard: '1',
      parentQuoteSolidFillEnabled: false,
    }} coverFlowGradient={cssSource} />);
    expect(unifiedParent.match(/data-gradient-ink-layer="off" style="([^"]*)"/)?.[1]).toContain('mix-blend-mode:multiply');
    expect(unifiedParent.match(/<figure[^>]*style="([^"]*)"/)?.[1]).not.toContain('mix-blend-mode');
    expect(unifiedParent).toContain('data-gradient-ink-layer="screen"');
  });

  const gradientOf = (html: string) => {
    const m = html.match(/--quote-css-ink-gradient:\s*(linear-gradient\([^;"]*\))/);
    return m ? m[1] : null;
  };
  const sizeOf = (html: string) => {
    const m = html.match(/--quote-css-ink-size:\s*([^;"]*)/);
    return m ? m[1].trim() : null;
  };
  const attr = (html: string, name: string) => {
    const m = html.match(new RegExp(`${name}="([^"]*)"`));
    return m ? m[1] : null;
  };
  const renderCss = (config: Partial<Parameters<typeof Quote>[0]['config']>, source: QuoteCoverFlowGradient = cssSource) =>
    renderToStaticMarkup(<Quote config={{ gradientInkEnabled: true, gradientInkRenderMode: 'css', gradientInkSourceCard: '2', ...config }} coverFlowGradient={source} />);

  it('fills the text with a 3-stop linear-gradient at the configured angle, with no mesh/overlay (blend off)', () => {
    const html = renderCss({ gradientInkCssAngleDegrees: 135 });
    expect(gradientOf(html)).toMatch(/^linear-gradient\(135deg, #[0-9a-f]{3,8}, #[0-9a-f]{3,8}, #[0-9a-f]{3,8}\)$/);
    expect(attr(html, 'data-quote-gradient-state')).toBe('css');
    expect(attr(html, 'data-quote-css-ink')).toBe('on');
    expect(attr(html, 'data-quote-blend')).toBe('off');
    // The clip class is applied to the body text (so the gradient paints the glyphs).
    const pTag = html.match(/<p[^>]*>/)?.[0] ?? '';
    expect(pTag).toContain('cssInkText');
  });

  it('is mutually exclusive with unified ink (one enum value, never both)', () => {
    const unified = renderToStaticMarkup(<Quote config={{ gradientInkEnabled: true, gradientInkRenderMode: 'unified', gradientInkSourceCard: '2' }} coverFlowGradient={cssSource} />);
    expect(attr(unified, 'data-quote-gradient-state')).toBe('active');
    expect(attr(unified, 'data-quote-css-ink')).toBe('off');
    const css = renderCss({});
    expect(attr(css, 'data-quote-gradient-state')).toBe('css');
    expect(attr(css, 'data-quote-css-ink')).toBe('on');
  });

  it('renders only the text in CSS mode -- no in-component gradient preview (that lives in the config panel)', () => {
    const html = renderCss({ gradientInkSourceCard: '2' });
    expect(html).not.toContain('cssInkPreview');
    expect(html).not.toContain('CSS gradient · Card');
  });

  it('keeps mesh saturation, darkening, lightening, and scale modulating the fallback, plus the angle', () => {
    const base = renderCss({ gradientInkMeshSaturationPercent: 200, gradientInkMeshDarkeningPercent: 22, gradientInkMeshScale: 0.86, gradientInkCssAngleDegrees: 135 });
    const desaturated = renderCss({ gradientInkMeshSaturationPercent: 0 });
    const darkened = renderCss({ gradientInkMeshDarkeningPercent: 90 });
    const lightened = renderCss({ gradientInkMeshLighteningPercent: 80 });
    const scaled = renderCss({ gradientInkMeshScale: 2 });
    const angled = renderCss({ gradientInkCssAngleDegrees: 45 });
    expect(gradientOf(desaturated)).not.toBe(gradientOf(base)); // saturation changes colors
    expect(gradientOf(darkened)).not.toBe(gradientOf(base));    // darkening changes colors
    expect(gradientOf(lightened)).not.toBe(gradientOf(base));  // lightening changes colors
    expect(sizeOf(base)).toBe('86% 86%');
    expect(sizeOf(scaled)).toBe('200% 200%');                  // scale -> background-size
    expect(sizeOf(renderCss({ gradientInkMeshScale: 2, gradientInkMeshScaleX: 1.5, gradientInkMeshScaleY: 0.5 })))
      .toBe('300% 100%');
    expect(gradientOf(angled)).toContain('45deg');              // new CSS angle knob
  });

  it('derives different colors per source card', () => {
    expect(gradientOf(renderCss({ gradientInkSourceCard: '1' })))
      .not.toBe(gradientOf(renderCss({ gradientInkSourceCard: '5' })));
  });

  it('degrades to the plain quote when the host supplies no palette config', () => {
    const noConfig = { slides, palettes: null, motion: {} as QuoteCoverFlowGradient['motion'], config: DEFAULT_LIQUID_SLIDER_CONFIG } satisfies QuoteCoverFlowGradient;
    const html = renderCss({}, noConfig);
    expect(attr(html, 'data-quote-css-ink')).toBe('off');
    expect(gradientOf(html)).toBeNull();
    expect(attr(html, 'data-quote-gradient-state')).toBe('unavailable');
  });

  it('suppresses any solid palette background in CSS mode so only the text is painted', () => {
    const html = renderCss({ paletteBackgroundEnabled: true, paletteColorIndex: 3 });
    expect(attr(html, 'data-quote-palette')).toBe('off');
  });
});

describe('Quote unified-ink overlay border', () => {
  const source = {
    slides: [{
      id: 0, slug: 'q', label: 'C1', title: 'C1', excerpt: '', topic: '', date: '', readingTime: '',
      href: '#', externalUrl: null, forceExternalNavigation: false, seed: 1, hueOffset: 0,
      variationBias: 0, offsetX: 0, offsetY: 0, accent: '#fff',
    }],
    palettes: null, motion: {} as QuoteCoverFlowGradient['motion'],
    config: DEFAULT_LIQUID_SLIDER_CONFIG, paletteConfig: DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG,
  } satisfies QuoteCoverFlowGradient;

  // The overlay is GradientInkSurface's content layer (data-gradient-ink-layer).
  const overlayStyle = (html: string) => {
    const m = html.match(/<div[^>]*data-gradient-ink-layer="[^"]*"[^>]*style="([^"]*)"/);
    return m ? m[1] : null;
  };
  const render = (cfg: object) =>
    renderToStaticMarkup(<Quote config={{ gradientInkEnabled: true, gradientInkRenderMode: 'unified', ...cfg }} coverFlowGradient={source} />);

  it('applies the border on the overlay only when enabled, with the Tailwind width token resolved to a CSS length', () => {
    const on = render({ gradientInkBorderEnabled: true, gradientInkBorderWidth: 'border-2', gradientInkBorderStyle: 'inset', gradientInkBorderColor: '#ff00aa' });
    expect(overlayStyle(on)).toContain('border-style:inset');     // CSS value Tailwind can't express
    expect(overlayStyle(on)).toContain('border-width:2px');       // border-2 token -> 2px
    expect(overlayStyle(on)).toMatch(/border-color:#ff00aa/i);
    const w4 = render({ gradientInkBorderEnabled: true, gradientInkBorderWidth: 'border-4' });
    expect(overlayStyle(w4)).toContain('border-width:4px');       // border-4 token -> 4px
    const off = render({ gradientInkBorderEnabled: false });
    expect(overlayStyle(off)).not.toContain('border-style');
    expect(overlayStyle(off)).not.toContain('border-width');
  });

  it('supports every requested CSS border-style including the 3D ones', () => {
    for (const style of ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset'] as const) {
      const html = render({ gradientInkBorderEnabled: true, gradientInkBorderStyle: style });
      expect(overlayStyle(html)).toContain(`border-style:${style}`);
    }
  });

  it('cannot leak the border onto modes that render no overlay (css fallback, plain)', () => {
    const cssMode = renderToStaticMarkup(<Quote config={{ gradientInkEnabled: true, gradientInkRenderMode: 'css', gradientInkBorderEnabled: true }} coverFlowGradient={source} />);
    const plain = renderToStaticMarkup(<Quote config={{ gradientInkEnabled: false, gradientInkBorderEnabled: true }} coverFlowGradient={source} />);
    expect(overlayStyle(cssMode)).toBeNull();
    expect(overlayStyle(plain)).toBeNull();
  });

  it('normalizes an unknown border style back to the default and clamps the width token', () => {
    const bad = normalizeQuoteConfig({ gradientInkBorderStyle: 'wiggly' as never, gradientInkBorderWidth: 'border-99' as never });
    expect(bad.gradientInkBorderStyle).toBe(DEFAULT_QUOTE_CONFIG.gradientInkBorderStyle);
    expect(bad.gradientInkBorderWidth).toBe(DEFAULT_QUOTE_CONFIG.gradientInkBorderWidth);
  });
});

describe('buildQuoteCssInkGradientFromMeshSamples (sampled CSS fallback assembler)', () => {
  it('matches the unified screen blend for opaque ink, and retains the chosen axis', () => {
    expect(buildQuoteCssInkGradientFromMeshSamples([[128, 0, 255], [0, 128, 0]], '67deg', {
      gradientInkSurfaceColor: '#ffffff',
      gradientInkOverlayOpacityPercent: 100,
      gradientInkTextColor: '#0000ff',
      gradientInkTextOpacityPercent: 100,
      gradientInkBlendMode: 'screen',
    })).toBe('linear-gradient(67deg, #8000ff, #0080ff)');
  });
  it('keeps blending the glyphs when the unified surface is transparent', () => {
    expect(buildQuoteCssInkGradientFromMeshSamples([[255, 0, 0], [0, 255, 0]], '90deg', {
      gradientInkSurfaceColor: '#ffffff',
      gradientInkOverlayOpacityPercent: 0,
      gradientInkTextColor: '#0000ff',
      gradientInkTextOpacityPercent: 100,
      gradientInkBlendMode: 'screen',
    })).toBe('linear-gradient(90deg, #ff00ff, #00ffff)');
  });
  it('builds a directional gradient from sampled sRGB stops, without re-modulating them', () => {
    const grad = buildQuoteCssInkGradientFromMeshSamples(
      [[28, 122, 216], [74, 76, 189], [130, 101, 152]], 'to bottom',
    );
    expect(grad).toBe('linear-gradient(to bottom, #1c7ad8, #4a4cbd, #826598)');
  });
  it('clamps channels, honors direction, and returns null for empty input', () => {
    expect(buildQuoteCssInkGradientFromMeshSamples([[300, -5, 128.6]], '45deg'))
      .toBe('linear-gradient(45deg, #ff0081, #ff0081)'); // single stop duplicated, clamped+rounded
    expect(buildQuoteCssInkGradientFromMeshSamples([])).toBeNull();
  });
});
