import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { getConfigScopeFieldKeys } from '../../../../components/Panel/config';
import { EditorialQuote } from './EditorialQuote';
import { DEFAULT_EDITORIAL_QUOTE_CONFIGS, EDITORIAL_VARIANTS, normalizeEditorialQuoteConfig, resolveEditorialInk } from './editorialConfig';
import { DEFAULT_QUOTE_HEADING_APPEARANCE, normalizeQuoteHeadingAppearance, normalizeQuoteSourceLinkAppearance } from './quotePartsConfig';
import { createEditorialQuotePanel } from './EditorialQuote.panel';
import { QUOTE_HEADING_PANEL } from './QuoteParts.panel';
import { QUOTE_PANEL } from './Quote.panel';
import { createConfigScopeBinding } from '../../../../components/Panel/config';
import { ConfigControlResolver } from '../../../../components/Panel/config/controlResolver';
import { DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG } from '../AbstractPostDock/config/registered';
import { DEFAULT_LIQUID_SLIDER_CONFIG } from '../AbstractPostDock/config/legacy';
import { Quote, type QuoteCoverFlowGradient } from './Quote';
import { formatQuoteSourceHeading } from './sourceHeading';
import { DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG, normalizeBottomBannerQuoteConfig } from './bottomBannerConfig';
import { BOTTOM_BANNER_QUOTE_PANEL } from './BottomBannerQuote.panel';

vi.mock('../AbstractPostDock/components/GradientRenderer', () => ({
  LiquidGradientAdapter: () => <canvas data-test-gradient-mesh="" />,
}));

const source = { key: 'question-line', title: 'From builder to lead', period: '2018 to 2023', destination: '/about#about-question', text: 'A short statement.' };

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('EditorialQuote variants', () => {
  it('uses the shared emphasis paragraph and accepts its appearance props in every variant', () => {
    const emphasizedSource = { ...source, text: 'The **core** idea and [next step](/about).' };
    for (const variant of EDITORIAL_VARIANTS) {
      const html = renderToStaticMarkup(<EditorialQuote
        source={emphasizedSource}
        variant={variant}
        config={DEFAULT_EDITORIAL_QUOTE_CONFIGS[variant]}
        textAppearance={{
          fontSize: '32px', tracking: '0.02em', lineHeight: 1.4,
          tint: '#123456', dimOpacity: 0.45, emphasisOpacity: 0.9,
          highlightedWordFontWeight: 700, fontFamily: 'Georgia',
        }}
      />);
      expect(html).toMatch(/<blockquote[^>]*>\s*<p[^>]*font-size:32px[^>]*letter-spacing:0.02em[^>]*line-height:1.4[^>]*color:#123456/);
      expect(html).toMatch(/<blockquote[^>]*>\s*<p[^>]*data-gradient-ink-color=""/);
      expect(html).toContain('--minimal-mode-highlight-weight:700');
      expect(html).toContain('font-family:Georgia');
      expect(html).toContain('opacity:0.45">The ');
      expect(html).toContain('opacity:0.9">core</span>');
      expect(html).toContain('>next step</a>');
    }
  });

  it('edits heading copy through the shared base field in every quote type', () => {
    expect(getConfigScopeFieldKeys(QUOTE_PANEL.fields)).toContain('sourceHeadingText');
    for (const variant of EDITORIAL_VARIANTS) {
      const panel = createEditorialQuotePanel(variant);
      expect(getConfigScopeFieldKeys(panel.fields)).toContain('sourceHeadingText');
      const html = renderToStaticMarkup(<EditorialQuote source={source} variant={variant}
        config={{ ...DEFAULT_EDITORIAL_QUOTE_CONFIGS[variant], sourceHeadingText: 'A new heading' }} />);
      expect(html).toContain('>A new heading</h3>');
      expect(html).not.toContain('>From builder to lead (2018 to 2023)</h3>');
    }
    // The bottom banner's source heading is content-driven (content/practices.md,
    // quote.sourceHeading, applied at the wall call site), so it is hidden in that
    // panel rather than edited as a field here.
    expect(getConfigScopeFieldKeys(BOTTOM_BANNER_QUOTE_PANEL.fields)).not.toContain('sourceHeadingText');
    expect(BOTTOM_BANNER_QUOTE_PANEL.hiddenKeys).toContain('sourceHeadingText');
    const panelContainer = document.createElement('div');
    document.body.appendChild(panelContainer);
    const panelRoot = createRoot(panelContainer);
    act(() => panelRoot.render(<ConfigControlResolver binding={createConfigScopeBinding({
      definition: BOTTOM_BANNER_QUOTE_PANEL, value: DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG, onChange: () => {},
    })} />));
    expect(panelContainer.textContent).toContain('Quote header');
    expect(panelContainer.querySelector('[data-config-field-key="sourceHeadingText"]')).toBeNull();
    act(() => panelRoot.unmount());
    panelContainer.remove();
    let edited = DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG;
    createConfigScopeBinding({
      definition: BOTTOM_BANNER_QUOTE_PANEL, value: edited,
      onChange: next => { edited = next; },
    }).updateFields({ sourceHeadingText: 'A closer look' });
    expect(renderToStaticMarkup(<EditorialQuote source={source} variant="featured" config={edited} />))
      .toContain('>A closer look</h3>');
    expect(renderToStaticMarkup(<Quote config={{ sourceHeadingText: 'Standalone heading' }} />))
      .toContain('>Standalone heading</h3>');
    expect(renderToStaticMarkup(<Quote config={{ sourceHeadingText: 'Standalone heading' }} sourceHeading={null} />))
      .not.toContain('Standalone heading');
  });

  it('copies featured styling while retaining the bottom banner spacing', () => {
    const bannerSpacing = {
      marginTopLg: 'lg:mt-20',
      paddingTop: 'pt-10', paddingRight: 'pr-10', paddingBottom: 'pb-20', paddingLeft: 'pl-10',
      paddingTopLg: 'lg:pt-11', paddingRightLg: 'lg:pr-20', paddingBottomLg: 'lg:pb-0', paddingLeftLg: 'lg:pl-20',
      parentQuotePaddingTop: 'pt-0', parentQuotePaddingRight: 'pr-0', parentQuotePaddingBottom: 'pb-0', parentQuotePaddingLeft: 'pl-0',
      parentQuotePaddingTopMd: 'md:pt-0', parentQuotePaddingRightMd: 'md:pr-0', parentQuotePaddingBottomMd: 'md:pb-0', parentQuotePaddingLeftMd: 'md:pl-0',
      parentQuotePaddingTopLg: 'lg:pt-0', parentQuotePaddingRightLg: 'lg:pr-0', parentQuotePaddingBottomLg: 'lg:pb-0', parentQuotePaddingLeftLg: 'lg:pl-0',
    } as const;
    expect(DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG).toMatchObject(bannerSpacing);
    expect(DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG).toMatchObject({ cardAspectRatioEnabled: false, geometryShape: 'auto' });
    const banner = renderToStaticMarkup(<EditorialQuote source={source} variant="featured" config={DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG} />);
    expect(banner).toContain('pt-10');
    expect(banner).not.toContain('aspect-ratio:');

    const contentSized = renderToStaticMarkup(<EditorialQuote source={source} variant="featured"
      config={DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG} minHeight="auto" />);
    expect(contentSized).toContain('min-height:auto');
    expect(contentSized).toContain('overflow:visible');
  });

  it('places featured children below the passage inside the quote surface', () => {
    const featured = renderToStaticMarkup(<EditorialQuote source={source} variant="featured"
      config={DEFAULT_EDITORIAL_QUOTE_CONFIGS.featured} minHeight="100dvh">
      <div data-banner-child="">Intro content</div>
    </EditorialQuote>);
    const plain = renderToStaticMarkup(<EditorialQuote source={source} variant="plain"
      config={DEFAULT_EDITORIAL_QUOTE_CONFIGS.plain}>
      <div data-banner-child="">Intro content</div>
    </EditorialQuote>);
    expect(featured.indexOf('A short statement.')).toBeLessThan(featured.indexOf('data-banner-child'));
    expect(featured).toContain('min-height:100dvh');
    expect(featured).toContain('data-banner-child');
    expect(plain).not.toContain('data-banner-child');
  });
  it('formats every source heading from title and period without a label', () => {
    expect(formatQuoteSourceHeading(' From builder to lead ', ' 2018 to 2023 ')).toBe('From builder to lead (2018 to 2023)');
    expect(formatQuoteSourceHeading('The questions', 'circa 2017')).toBe('The questions (circa 2017)');
    expect(formatQuoteSourceHeading('From builder to lead', '2018 to 2023', true, false)).toBe('From builder to lead');
    expect(formatQuoteSourceHeading('From builder to lead', '2018 to 2023', false, true)).toBe('2018 to 2023');
    expect(formatQuoteSourceHeading('From builder to lead', '2018 to 2023', false, false)).toBe('');
  });

  it('renders three distinct defaults and keeps the source route', () => {
    const featured = renderToStaticMarkup(<EditorialQuote source={source} variant="featured" config={DEFAULT_EDITORIAL_QUOTE_CONFIGS.featured} />);
    const plain = renderToStaticMarkup(<EditorialQuote source={source} variant="plain" config={DEFAULT_EDITORIAL_QUOTE_CONFIGS.plain} />);
    const solid = renderToStaticMarkup(<EditorialQuote source={source} variant="solid" config={DEFAULT_EDITORIAL_QUOTE_CONFIGS.solid} />);
    expect(featured).toContain('From builder to lead (2018 to 2023)');
    expect(featured).not.toMatch(/<h3[^>]*>ABOUT/);
    expect(featured).toContain('data-editorial-background="gradient"');
    expect(plain).toContain('From builder to lead (2018 to 2023)');
    expect(plain).toContain('border-top:');
    expect(solid).toContain(`data-editorial-background="${DEFAULT_EDITORIAL_QUOTE_CONFIGS.solid.backgroundMode}"`);
    expect(solid).toContain('From builder to lead (2018 to 2023)');
  });

  it('renders a title-only quote heading and accessible label without empty date punctuation', () => {
    const html = renderToStaticMarkup(<EditorialQuote
      source={{ ...source, title: 'Through delivery', period: '' }}
      variant="plain" config={DEFAULT_EDITORIAL_QUOTE_CONFIGS.plain}
    />);
    expect(html).toContain('>Through delivery</h3>');
    expect(html).toContain('aria-label="About: Through delivery"');
    expect(html).not.toContain('Through delivery ()');
  });

  it('inherits source heading top alignment in all three editorial variants', () => {
    for (const variant of EDITORIAL_VARIANTS) {
      const html = renderToStaticMarkup(<EditorialQuote source={source} variant={variant}
        config={{ ...DEFAULT_EDITORIAL_QUOTE_CONFIGS[variant], sourceHeadingTopAligned: true, headingPlacement: 'inside-top' }} />);
      expect(html, variant).toContain('data-quote-source-position="top"');
      expect(html, variant).toContain('From builder to lead (2018 to 2023)');
    }
  });

  it('lets a thought reuse the solid quote without About-specific link text', () => {
    const html = renderToStaticMarkup(<EditorialQuote
      source={{ ...source, destination: '/thoughts/nobody-made-this-alone',
        ariaLabel: 'Thought: Nobody made this alone. (Sep 2026)',
        linkAriaLabel: 'Read thought — Nobody made this alone.' }}
      variant="solid"
      config={{ ...DEFAULT_EDITORIAL_QUOTE_CONFIGS.solid, linkEnabled: true, linkLabel: 'Read thought' }}
    />);
    expect(html).toContain('data-editorial-variant="solid"');
    expect(html).toContain('href="/thoughts/nobody-made-this-alone"');
    expect(html).toContain('aria-label="Read thought — Nobody made this alone."');
    expect(html).not.toContain('on About');
  });

  it('applies per-type furniture + shared part appearance at the final markup', () => {
    const config = normalizeEditorialQuoteConfig({
      ...DEFAULT_EDITORIAL_QUOTE_CONFIGS.solid,
      headingPlacement: 'inside-bottom', linkEnabled: true, linkPlacement: 'inside-top', linkLabel: 'Go to About',
      topRuleEnabled: true, topRuleWidth: 'border-4', topRuleColor: '#ff0000', topRuleOpacityPercent: 50,
      backgroundMode: 'solid', solidBackgroundColor: '#abcdef', solidTextColor: '#111111', textFontWeight: 'font-bold',
    }, 'solid');
    const headingAppearance = normalizeQuoteHeadingAppearance({ size: 'text-lg', colorMode: 'custom', color: '#123456', paddingTop: 'pt-8' });
    const linkAppearance = normalizeQuoteSourceLinkAppearance({ icon: 'none', size: 'text-xl', colorMode: 'custom', color: '#654321' });
    const html = renderToStaticMarkup(
      <EditorialQuote source={source} variant="solid" config={config} headingAppearance={headingAppearance} linkAppearance={linkAppearance} />,
    );
    expect(html).toContain('border-top:4px solid rgba(255, 0, 0, 0.5)');
    expect(html).toContain('background-color:#abcdef');
    expect(html).toContain('font-weight:700');
    expect(html).toContain('color:#123456');
    expect(html).toContain('color:#654321');
    expect(html).toContain('Go to About');
    expect(html).not.toContain('↗');
    expect(html.indexOf('Go to About')).toBeLessThan(html.indexOf('A short statement.'));
    expect(html.indexOf('From builder to lead (2018 to 2023)')).toBeGreaterThan(html.indexOf('A short statement.'));
  });

  it('applies ONE shared heading/link appearance to all three types', () => {
    const headingAppearance = normalizeQuoteHeadingAppearance({ colorMode: 'custom', color: '#abc123', size: 'text-2xl' });
    const linkAppearance = normalizeQuoteSourceLinkAppearance({ colorMode: 'custom', color: '#321cba' });
    for (const variant of EDITORIAL_VARIANTS) {
      const config = { ...DEFAULT_EDITORIAL_QUOTE_CONFIGS[variant], headingEnabled: true, linkEnabled: true };
      const html = renderToStaticMarkup(
        <EditorialQuote source={source} variant={variant} config={config} headingAppearance={headingAppearance} linkAppearance={linkAppearance} />,
      );
      expect(html, `heading color on ${variant}`).toContain('color:#abc123');
      expect(html, `link color on ${variant}`).toContain('color:#321cba');
      expect(html, `heading size on ${variant}`).toMatch(/<h3[^>]*class="[^"]*\btext-2xl\b/);
    }
  });

  it('applies both shared heading font controls to the source heading in every quote type', () => {
    let appearance = normalizeQuoteHeadingAppearance({ fontFamily: 'font-serif' });
    const binding = createConfigScopeBinding({ definition: QUOTE_HEADING_PANEL,
      value: appearance, onChange: next => { appearance = next; } });
    binding.updateFields({ fontFamily: 'font-sans', fontWeight: 'font-black' });
    for (const variant of EDITORIAL_VARIANTS) {
      const html = renderToStaticMarkup(<EditorialQuote source={source} variant={variant}
        config={DEFAULT_EDITORIAL_QUOTE_CONFIGS[variant]} headingAppearance={appearance} />);
      expect(html, `${variant} source heading`).toMatch(/<h3[^>]*font-family:var\(--site-font-sans,[^\"]*Arial, sans-serif\)/);
      expect(html, `${variant} source heading weight`).toMatch(/<h3[^>]*font-weight:900/);
    }
    binding.updateFields({ fontFamily: 'font-serif', fontWeight: 'font-normal' });
    const serif = renderToStaticMarkup(<EditorialQuote source={source} variant="featured"
      config={DEFAULT_EDITORIAL_QUOTE_CONFIGS.featured} headingAppearance={appearance} />);
    expect(serif).toMatch(/<h3[^>]*font-family:var\(--site-font-serif,[^\"]*Georgia, serif\)/);
    expect(serif).toMatch(/<h3[^>]*font-weight:400/);
  });

  it('applies shared heading text transform to every quote type while leaving the source link alone', () => {
    for (const variant of EDITORIAL_VARIANTS) {
      const html = renderToStaticMarkup(<EditorialQuote source={source} variant={variant}
        config={{ ...DEFAULT_EDITORIAL_QUOTE_CONFIGS[variant], headingEnabled: true, linkEnabled: true }}
        headingAppearance={normalizeQuoteHeadingAppearance({ textTransform: 'capitalize' })} />);
      expect(html, `${variant} source heading`).toMatch(/<h3[^>]*text-transform:capitalize/);
      expect(html, `${variant} source link`).not.toMatch(/<a[^>]*text-transform:capitalize/);
    }
  });

  it('inherits the base quote text transform in every editorial specialization', () => {
    for (const variant of EDITORIAL_VARIANTS) {
      const panel = createEditorialQuotePanel(variant);
      const html = renderToStaticMarkup(<EditorialQuote source={source} variant={variant}
        config={{ ...DEFAULT_EDITORIAL_QUOTE_CONFIGS[variant], textTransform: 'capitalize' }} />);
      expect(getConfigScopeFieldKeys(panel.fields), `${variant} panel`).toContain('textTransform');
      expect(html, `${variant} quote text`).toMatch(/<blockquote[^>]*>\s*<p[^>]*text-transform:capitalize/);
    }
  });

  it('inherits base header and content typography controls in every editorial type', () => {
    for (const variant of EDITORIAL_VARIANTS) {
      const keys = getConfigScopeFieldKeys(createEditorialQuotePanel(variant).fields);
      for (const key of ['sourceHeadingFontSize', 'sourceHeadingTracking', 'sourceHeadingOpacityPercent',
        'sourceHeadingTextTransform', 'sourceHeadingContentGap', 'headingAlign', 'textSize', 'tracking', 'textOpacityPercent', 'leading', 'textAlign']) {
        expect(keys, `${variant}: ${key}`).toContain(key);
      }
      const html = renderToStaticMarkup(<EditorialQuote source={source} variant={variant}
        config={{ ...DEFAULT_EDITORIAL_QUOTE_CONFIGS[variant], sourceHeadingFontSize: 'text-2xl',
          sourceHeadingTracking: 'tracking-wide', sourceHeadingOpacityPercent: 17, headingAlign: 'end',
          sourceHeadingTextTransform: 'capitalize', sourceHeadingContentGap: 'mb-8',
          textOpacityPercent: 42, textAlign: 'start', leading: 'leading-loose', tracking: 'tracking-wide' }} />);
      expect(html, `${variant} header size`).toMatch(/<h3[^>]*class="[^"]*\btext-2xl\b/);
      expect(html, `${variant} header`).toMatch(/<h3[^>]*text-transform:capitalize[^>]*opacity:0.17[^>]*text-align:end[^>]*margin-bottom:2rem/);
      expect(html, `${variant} content`).toMatch(/<blockquote[^>]*text-align:start[^>]*>\s*<p[^>]*opacity:0.42/);
    }
  });

  it('applies the per-type responsive header size (md/lg) in every editorial type, including the bottom banner', () => {
    for (const variant of EDITORIAL_VARIANTS) {
      const html = renderToStaticMarkup(<EditorialQuote source={source} variant={variant}
        config={{ ...DEFAULT_EDITORIAL_QUOTE_CONFIGS[variant],
          sourceHeadingFontSize: 'text-xs', sourceHeadingFontSizeMd: 'md:text-xl', sourceHeadingFontSizeLg: 'lg:text-3xl' }} />);
      expect(html, `${variant} header classes`).toMatch(/<h3[^>]*class="[^"]*\btext-xs\b[^"]*\bmd:text-xl\b[^"]*\blg:text-3xl\b/);
    }
    // bottomBannerConfig.ts's own config IS an EditorialQuoteConfig (rendered
    // through this same component, variant 'featured') -- the base quote's
    // md:/lg: header-size capability must reach it automatically, with no
    // bottom-banner-specific wiring.
    const bannerConfig = normalizeBottomBannerQuoteConfig({ ...DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG,
      sourceHeadingFontSize: 'text-xs', sourceHeadingFontSizeMd: 'md:text-xl', sourceHeadingFontSizeLg: 'lg:text-3xl' });
    const bannerHtml = renderToStaticMarkup(<EditorialQuote source={source} variant="featured" config={bannerConfig} />);
    expect(bannerHtml).toMatch(/<h3[^>]*class="[^"]*\btext-xs\b[^"]*\bmd:text-xl\b[^"]*\blg:text-3xl\b/);
    expect(getConfigScopeFieldKeys(BOTTOM_BANNER_QUOTE_PANEL.fields)).toEqual(
      expect.arrayContaining(['sourceHeadingFontSize', 'sourceHeadingFontSizeMd', 'sourceHeadingFontSizeLg']),
    );
  });

  it('applies heading opacity at both bounds in every quote type without dimming the source link', () => {
    expect(normalizeQuoteHeadingAppearance({ opacityPercent: -5 }).opacityPercent).toBe(0);
    expect(normalizeQuoteHeadingAppearance({ opacityPercent: 105 }).opacityPercent).toBe(100);
    expect(normalizeQuoteHeadingAppearance({ opacityPercent: Number.NaN }).opacityPercent).toBe(DEFAULT_QUOTE_HEADING_APPEARANCE.opacityPercent);
    for (const variant of EDITORIAL_VARIANTS) {
      for (const opacityPercent of [0, 100]) {
        const html = renderToStaticMarkup(<EditorialQuote source={source} variant={variant}
          config={{ ...DEFAULT_EDITORIAL_QUOTE_CONFIGS[variant], headingEnabled: true, linkEnabled: true }}
          headingAppearance={normalizeQuoteHeadingAppearance({ opacityPercent })} />);
        expect(html, `${variant} heading at ${opacityPercent}%`).toMatch(new RegExp(`<h3[^>]*opacity:${opacityPercent / 100}`));
        expect(html, `${variant} link at ${opacityPercent}%`).not.toMatch(/<a[^>]*opacity:/);
      }
    }
  });

  it('updates the visible source heading from the real shared panel controls', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    function Harness() {
      const [appearance, setAppearance] = React.useState(normalizeQuoteHeadingAppearance({ fontFamily: 'font-serif', fontWeight: 'font-normal' }));
      return <>
        <ConfigControlResolver binding={createConfigScopeBinding({ definition: QUOTE_HEADING_PANEL, value: appearance, onChange: setAppearance })} />
        <EditorialQuote source={source} variant="featured" config={DEFAULT_EDITORIAL_QUOTE_CONFIGS.featured} headingAppearance={appearance} />
      </>;
    }
    act(() => root.render(<Harness />));
    const heading = container.querySelector<HTMLElement>('[data-quote-source-heading]');
    expect(heading?.style.fontFamily).toContain('--site-font-serif');
    expect(heading?.style.fontWeight).toBe('400');
    expect(heading?.style.textTransform).toBe('uppercase');
    expect(heading?.style.opacity).toBe(String(DEFAULT_QUOTE_HEADING_APPEARANCE.opacityPercent / 100));

    const sans = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-config-field-key="fontFamily"] button'))
      .find(button => button.textContent === 'SANS');
    expect(sans).toBeTruthy();
    act(() => sans?.click());
    expect(heading?.style.fontFamily).toContain('--site-font-sans');

    const weight = container.querySelector<HTMLSelectElement>('[data-config-field-key="fontWeight"] select');
    expect(weight).toBeTruthy();
    act(() => {
      if (weight) {
        weight.value = 'font-black';
        weight.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    expect(heading?.style.fontWeight).toBe('900');

    const transform = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-config-field-key="textTransform"] button'))
      .find(button => button.textContent === 'UPPERCASE');
    expect(transform).toBeTruthy();
    act(() => transform?.click());
    expect(heading?.style.textTransform).toBe('uppercase');

    const opacity = container.querySelector<HTMLInputElement>('[data-config-field-key="opacityPercent"] input[type="range"]');
    expect(opacity).toBeTruthy();
    expect(opacity?.min).toBe('0');
    expect(opacity?.max).toBe('100');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    act(() => {
      if (opacity) {
        nativeSetter.call(opacity, '0');
        opacity.dispatchEvent(new Event('input', { bubbles: true }));
        opacity.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    expect(heading?.style.opacity).toBe('0');
    act(() => {
      if (opacity) {
        nativeSetter.call(opacity, '100');
        opacity.dispatchEvent(new Event('input', { bubbles: true }));
        opacity.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    expect(heading?.style.opacity).toBe('1');
    act(() => root.unmount());
  });

  it('uses the gradient base color as the surface backdrop (legible CSS mode, no light box)', () => {
    // Regression: CSS render mode on a gradient type used to inherit the light
    // solidBackgroundColor, leaving light gradient ink on a light box. The
    // backdrop must be the (dark) gradient base so both render modes read.
    const config = normalizeEditorialQuoteConfig(
      { ...DEFAULT_EDITORIAL_QUOTE_CONFIGS.featured, cardBlendEnabled: true, gradientInkBaseColor: '#101014', solidBackgroundColor: '#ffffff' },
      'featured',
    );
    const html = renderToStaticMarkup(<EditorialQuote source={source} variant="featured" config={config} />);
    expect(html).toContain('background-color:#101014');
    expect(html).toContain('data-quote-solid-fill="on"'); // independently configured parent quote
  });

  it('edits the decorative parent quote independently through the same panel', () => {
    const panel = createEditorialQuotePanel('featured');
    expect(getConfigScopeFieldKeys(panel.fields)).toContain('parentQuoteSolidFillColor');
    expect(getConfigScopeFieldKeys(panel.fields)).toContain('parentQuoteGradientInkEnabled');
    expect(getConfigScopeFieldKeys(panel.fields)).toContain('parentQuoteText');
    expect(getConfigScopeFieldKeys(panel.fields)).toContain('parentQuoteGradientInkRenderMode');
    let config = DEFAULT_EDITORIAL_QUOTE_CONFIGS.featured;
    createConfigScopeBinding({ definition: panel, value: config, onChange: next => { config = next; } })
      .updateFields({ cardBlendEnabled: true, parentQuoteSolidFillColor: '#123456', cardBlendMode: 'screen' });
    const html = renderToStaticMarkup(<EditorialQuote source={source} variant="featured" config={config} />);
    expect(html).toContain('background-color:#123456');
    expect(html).toContain('data-quote-card-blend="screen"');
    expect(html.match(/<blockquote/g)).toHaveLength(1);
    expect(html).not.toContain('Underlay syncs the quote gradient');
  });

  it('keeps BOTH gradient render modes available to a type (no forced unified)', () => {
    const css = normalizeEditorialQuoteConfig({ ...DEFAULT_EDITORIAL_QUOTE_CONFIGS.featured, gradientInkRenderMode: 'css' }, 'featured');
    expect(css.gradientInkRenderMode).toBe('css');
    const unified = normalizeEditorialQuoteConfig({ ...DEFAULT_EDITORIAL_QUOTE_CONFIGS.featured, gradientInkRenderMode: 'unified' }, 'featured');
    expect(unified.gradientInkRenderMode).toBe('unified');
  });

  it('routes every wall type through the shared Quote CSS and unified render paths', () => {
    const deck: QuoteCoverFlowGradient = {
      slides: [{
        id: 0, slug: 'card-1', label: 'Card 1', title: 'Card 1', excerpt: '', topic: '',
        date: '', readingTime: '', href: '#', externalUrl: null,
        forceExternalNavigation: false, seed: 10, hueOffset: 0, variationBias: 0,
        offsetX: 0, offsetY: 0, accent: '#ffffff',
      }],
      palettes: null,
      motion: {} as QuoteCoverFlowGradient['motion'],
      config: DEFAULT_LIQUID_SLIDER_CONFIG,
      paletteConfig: DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG,
    };
    for (const variant of EDITORIAL_VARIANTS) {
      const base = { ...DEFAULT_EDITORIAL_QUOTE_CONFIGS[variant], backgroundMode: 'gradient' as const, gradientInkSourceCard: '1' as const };
      const css = renderToStaticMarkup(<EditorialQuote source={source} variant={variant} config={{ ...base, gradientInkRenderMode: 'css' }} coverFlowGradient={deck} />);
      const unified = renderToStaticMarkup(<EditorialQuote source={source} variant={variant} config={{ ...base, gradientInkRenderMode: 'unified' }} coverFlowGradient={deck} />);
      expect(css, `${variant} CSS path`).toContain('data-quote-gradient-state="css"');
      expect(css, `${variant} CSS ink`).toContain('--quote-css-ink-gradient:linear-gradient(');
      expect(unified, `${variant} unified path`).toContain('data-quote-gradient-state="active"');
      expect(unified, `${variant} final blend layer`).toContain(`data-gradient-ink-layer="${base.gradientInkBlendMode}"`);
      expect(unified, `${variant} configured surface opacity`).toContain(`--gradient-ink-opacity:${base.gradientInkOverlayOpacityPercent / 100}`);
      expect(css, `${variant} base color`).toContain(`background-color:${base.gradientInkBaseColor}`);
      const nested = renderToStaticMarkup(<EditorialQuote source={source} variant={variant} config={{
        ...base, gradientInkRenderMode: 'unified', cardBlendEnabled: true, cardBlendMode: 'multiply',
        parentQuoteGradientInkEnabled: true, parentQuoteGradientInkRenderMode: 'unified',
      }} coverFlowGradient={deck} />);
      expect(nested.match(/data-quote-gradient-state="active"/g), `${variant} nested meshes`).toHaveLength(2);
      expect(nested, `${variant} parent scrim`).toContain('data-quote-parent-gradient-scrim');
      expect(nested, `${variant} whole quote blend`).toContain('data-quote-whole-blend="multiply"');
      expect(nested, `${variant} separate ink layers`).toMatch(/data-gradient-ink-layer="off"[\s\S]*data-gradient-ink-layer="(?:screen|multiply)"/);
    }
  });

  it('keeps the final unified layer blended at zero overlay opacity and with multiply ink', () => {
    const deck: QuoteCoverFlowGradient = {
      slides: [{ id: 0, slug: 'ink', label: 'Ink', title: 'Ink', excerpt: '', topic: '', date: '',
        readingTime: '', href: '#', externalUrl: null, forceExternalNavigation: false,
        seed: 1, hueOffset: 0, variationBias: 0, offsetX: 0, offsetY: 0, accent: '#ffffff' }],
      palettes: null, motion: {} as QuoteCoverFlowGradient['motion'], config: DEFAULT_LIQUID_SLIDER_CONFIG,
    };
    for (const variant of EDITORIAL_VARIANTS) {
      const config = { ...DEFAULT_EDITORIAL_QUOTE_CONFIGS[variant], backgroundMode: 'gradient' as const,
        gradientInkSourceCard: '1' as const, gradientInkRenderMode: 'unified' as const,
        gradientInkOverlayOpacityPercent: 0, gradientInkBlendMode: 'multiply' as const };
      const html = renderToStaticMarkup(<EditorialQuote source={source} variant={variant} config={config} coverFlowGradient={deck} />);
      expect(html, `${variant} actual layer`).toContain('data-gradient-ink-layer="multiply"');
      expect(html, `${variant} transparent surface`).toContain('--gradient-ink-opacity:0');
      expect(html, `${variant} root diagnostic`).toContain('data-quote-blend="multiply"');
    }
  });

  it('exposes every base capability on every type panel (no stripping/hiding)', () => {
    // The capabilities the previous design stripped, plus a sample of base knobs
    // that must reach each specialization.
    const baseKeys = new Set(getConfigScopeFieldKeys(QUOTE_PANEL.fields));
    const derivedKeys = new Set(['text', 'gradientInkEnabled', 'paletteBackgroundEnabled']);
    for (const variant of EDITORIAL_VARIANTS) {
      const panel = createEditorialQuotePanel(variant);
      expect(panel.hiddenKeys).not.toContain('gradientInkRenderMode');
      const keys = new Set(getConfigScopeFieldKeys(panel.fields));
      for (const key of Array.from(baseKeys)) {
        if (derivedKeys.has(key)) continue;
        expect(keys.has(key), `${variant} panel exposes ${key}`).toBe(true);
      }
    }
  });

  it('resolves heading/link ink to the quote ink when colorMode is inherit', () => {
    expect(resolveEditorialInk(normalizeEditorialQuoteConfig({ ...DEFAULT_EDITORIAL_QUOTE_CONFIGS.solid, solidTextColor: '#0a0b0c' }, 'solid'))).toBe('#0a0b0c');
    // Gradient type: inherited ink is the deterministic text-layer ink, distinct
    // here from the quote surface color so we can see it on the heading.
    const config = normalizeEditorialQuoteConfig({ ...DEFAULT_EDITORIAL_QUOTE_CONFIGS.featured, gradientInkTextColor: '#aa0000', solidTextColor: '#00bb00' }, 'featured');
    const html = renderToStaticMarkup(
      <EditorialQuote source={source} variant="featured" config={config}
        headingAppearance={normalizeQuoteHeadingAppearance({ colorMode: 'inherit' })}
        linkAppearance={normalizeQuoteSourceLinkAppearance({ colorMode: 'inherit' })} />,
    );
    expect(html).toContain('color:#aa0000');
  });

  it('disables optional furniture and defines a separate panel for each variant', () => {
    const config = normalizeEditorialQuoteConfig({ ...DEFAULT_EDITORIAL_QUOTE_CONFIGS.plain, headingEnabled: false, linkEnabled: false, topRuleEnabled: false }, 'plain');
    const html = renderToStaticMarkup(<EditorialQuote source={source} variant="plain" config={config} />);
    expect(html).not.toContain('href=');
    expect(html).toContain('border-top:none');
    expect(EDITORIAL_VARIANTS.map(variant => createEditorialQuotePanel(variant).id)).toEqual([
      'Quote/editorial-featured', 'Quote/editorial-plain', 'Quote/editorial-solid', 'Quote/editorial-practice',
    ]);
  });

  it('updates the practice quote through its own panel binding', () => {
    let edited = DEFAULT_EDITORIAL_QUOTE_CONFIGS.practice;
    const binding = createConfigScopeBinding({
      definition: createEditorialQuotePanel('practice'),
      value: edited,
      onChange: next => { edited = next; },
    });
    binding.updateFields({ solidTextColor: '#123456', headingEnabled: false });
    const html = renderToStaticMarkup(<EditorialQuote source={source} variant="practice" config={edited} />);
    expect(html).toContain('data-editorial-variant="practice"');
    expect(html).toContain('color:#123456');
    expect(html).not.toContain('data-quote-source-heading');
  });

  it('applies a panel field update to the rendered quote', () => {
    let edited = DEFAULT_EDITORIAL_QUOTE_CONFIGS.solid;
    const binding = createConfigScopeBinding({
      definition: createEditorialQuotePanel('solid'), value: edited,
      onChange: next => { edited = next; },
    });
    binding.updateFields({ topRuleEnabled: true, topRuleColor: '#45627d', topRuleOpacityPercent: 0, headingEnabled: false });
    const html = renderToStaticMarkup(<EditorialQuote source={source} variant="solid" config={edited} />);
    expect(html).not.toContain('data-quote-source-heading');
    expect(html).toContain('border-top:1px solid rgba(69, 98, 125, 0)');
  });
});
