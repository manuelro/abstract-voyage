import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_CTA_BUTTON_CONFIG } from '../../../../components/CtaButton/config/registered';
import { DEFAULT_LIQUID_SLIDER_CONFIG } from '../AbstractPostDock';
import { DEFAULT_EDITORIAL_QUOTE_CONFIGS } from './editorialConfig';
import { DEFAULT_QUOTE_HEADING_APPEARANCE, DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE } from './quotePartsConfig';
import type { QuoteCoverFlowGradient } from './Quote';
import { loadAboutPageContent } from '../../../../helpers/content/pageContent.build';
import { loadWallFeed } from '../../../../helpers/wallFeed.server';
import { loadAbstractPostDockItems } from '../../helpers/loadAbstractPostDockItems.server';
import { WallQuoteItem } from './WallQuoteItem';
import { buildWallQuoteItems } from '../../../../pages/wallQuoteModel';

const noDeck: QuoteCoverFlowGradient = {
  slides: [], palettes: [], motion: {} as QuoteCoverFlowGradient['motion'],
  config: DEFAULT_LIQUID_SLIDER_CONFIG,
};

describe('wall quote rendering', () => {
  const items = buildWallQuoteItems(loadAboutPageContent().timeline);

  it('exposes the source and full-text route without hiding the canonical copy in the wall', () => {
    const item = items.find(candidate => candidate.key === 'consulting-body')!;
    const designs = { ...DEFAULT_EDITORIAL_QUOTE_CONFIGS, solid: { ...DEFAULT_EDITORIAL_QUOTE_CONFIGS.solid, linkEnabled: true } };
    const html = renderToStaticMarkup(<WallQuoteItem item={item} index={4} designs={designs} partsDesign={{ heading: DEFAULT_QUOTE_HEADING_APPEARANCE, link: DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE }} coverFlowGradient={noDeck} liftPhysics={DEFAULT_CTA_BUTTON_CONFIG} />);
    expect(html).toContain('data-wall-quote-role="excerpt"');
    expect(html).toContain(`${item.title} (${item.period})`);
    expect(html).toContain('href="/about#about-consulting"');
    expect(html).toContain('Read the full passage');
    expect(html).toContain(item.displayText);
    expect(html).not.toContain(item.fullText);
    expect(html).toContain('data-quote-gradient-state="off"');
  });

  it('keeps a featured statement readable before its mesh deck is available', () => {
    const item = items.find(candidate => candidate.role === 'feature')!;
    const html = renderToStaticMarkup(<WallQuoteItem item={item} index={2} designs={DEFAULT_EDITORIAL_QUOTE_CONFIGS} partsDesign={{ heading: DEFAULT_QUOTE_HEADING_APPEARANCE, link: DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE }} coverFlowGradient={noDeck} liftPhysics={DEFAULT_CTA_BUTTON_CONFIG} />);
    expect(html).toContain('data-wall-quote-role="feature"');
    expect(html).toContain('data-quote-gradient-state="unavailable"');
    expect(html).toContain(item.displayText);
  });

  it('emphasizes the featured wall statement without exposing markup or changing its ink layer', () => {
    const featured = loadWallFeed(loadAbstractPostDockItems(), loadAboutPageContent())
      .find(entry => entry.kind === 'statement' && entry.quotation.entryId === 'the-next-change');
    if (!featured || featured.kind !== 'statement') throw new Error('Featured wall statement is missing');
    const html = renderToStaticMarkup(<WallQuoteItem item={featured.quotation} index={1} designs={DEFAULT_EDITORIAL_QUOTE_CONFIGS} partsDesign={{ heading: DEFAULT_QUOTE_HEADING_APPEARANCE, link: DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE }} coverFlowGradient={noDeck} liftPhysics={DEFAULT_CTA_BUTTON_CONFIG} />);
    expect(html).toContain('working software</span>');
    expect(html).toContain('next change</span>');
    expect(html).toContain('opacity:0.72');
    expect(html).toContain('opacity:1');
    expect(html).not.toContain('**');
  });

  it('renders the authored identity and wayfinding inside the content-sized featured quote', () => {
    const props = {
      index: 2,
      designs: DEFAULT_EDITORIAL_QUOTE_CONFIGS,
      partsDesign: { heading: DEFAULT_QUOTE_HEADING_APPEARANCE, link: DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE },
      coverFlowGradient: noDeck,
      liftPhysics: DEFAULT_CTA_BUTTON_CONFIG,
    };
    const featured = loadWallFeed(loadAbstractPostDockItems(), loadAboutPageContent())
      .find(entry => entry.kind === 'statement' && entry.quotation.entryId === 'the-next-change');
    if (!featured || featured.kind !== 'statement') throw new Error('Featured wall statement is missing');
    const html = renderToStaticMarkup(<WallQuoteItem {...props} item={featured.quotation} />);
    expect(html).toContain('data-featured-card');
    expect(html).toContain('Explore the practice');
    expect(html).toContain('href="#practices-heading"');
    expect(html).toMatch(/<p[^>]*data-quote-source-heading[^>]*>The Next Change/);
    expect(html).toContain('data-practice-card-placement="featured-intro"');
    expect(html).toContain('Hello, I&#x27;m Manuel Cerdas.');
    expect(html).toContain('with applied AI where it helps.');
    expect(html).not.toContain('Product, experience, engineering &amp; applied AI');
    expect(html).not.toContain('max-width:310px');
    expect(html).not.toContain('aspect-ratio:');
  });

  it('reports the featured mesh as pending before wall visibility is established', () => {
    const item = items.find(candidate => candidate.role === 'feature')!;
    const deck: QuoteCoverFlowGradient = { ...noDeck, slides: [{
      id: 0, slug: 'card-1', label: 'Card 1', title: 'Card 1', excerpt: '', topic: '', date: '',
      readingTime: '', href: '#', externalUrl: null, forceExternalNavigation: false,
      seed: 1, hueOffset: 0, variationBias: 0, offsetX: 0, offsetY: 0, accent: '#ffffff',
    }] };
    const html = renderToStaticMarkup(<WallQuoteItem item={item} index={2} designs={DEFAULT_EDITORIAL_QUOTE_CONFIGS} partsDesign={{ heading: DEFAULT_QUOTE_HEADING_APPEARANCE, link: DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE }} coverFlowGradient={deck} liftPhysics={DEFAULT_CTA_BUTTON_CONFIG} />);
    expect(html).toContain('data-quote-gradient-state="pending-mesh"');
    expect(html).toContain('data-gradient-ink-layer="multiply"');
    expect(html).not.toContain('<canvas');
  });

  it('shows the rule only when the wall layout selects it, retaining its width when hidden', () => {
    const item = items.find(candidate => candidate.role === 'statement')!;
    const props = { item, index: 1, designs: DEFAULT_EDITORIAL_QUOTE_CONFIGS,
      partsDesign: { heading: DEFAULT_QUOTE_HEADING_APPEARANCE, link: DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE },
      coverFlowGradient: noDeck, liftPhysics: DEFAULT_CTA_BUTTON_CONFIG };
    const hidden = renderToStaticMarkup(<WallQuoteItem {...props} showTopRule={false} />);
    const shown = renderToStaticMarkup(<WallQuoteItem {...props} showTopRule />);
    expect(hidden).toContain('data-wall-top-rule="hidden"');
    expect(shown).toContain('data-wall-top-rule="shown"');
    expect(hidden).toMatch(/<article[^>]*border-top:[^\"]*rgba\([^\"]*, 0\)/);
    expect(shown).toMatch(/<article[^>]*border-top:[^\"]*rgb\(/);
    const featured = items.find(candidate => candidate.role === 'feature')!;
    const featureHtml = renderToStaticMarkup(<WallQuoteItem {...props} item={featured} showTopRule />);
    expect(featureHtml).toMatch(/<article[^>]*border-top:none/);
  });
});
