import { describe, expect, it } from 'vitest';
import { loadAboutPageContent } from './content/pageContent.build';
import { loadAbstractPostDockItems } from '../experiences/abstract/helpers/loadAbstractPostDockItems.server';
import { getThoughts } from './thoughtContent';
import { buildWallQuoteItems } from '../pages/wallQuoteModel';
import { buildWallFeed, type WallFeedEntry } from './wallFeedModel';
import { loadWallContent, loadWallFeed } from './wallFeed.server';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PracticesSection } from '../experiences/abstract/components/PracticesSection';
import { DEFAULT_EDITORIAL_QUOTE_CONFIGS } from '../experiences/abstract/components/Quote/editorialConfig';
import { DEFAULT_QUOTE_HEADING_APPEARANCE } from '../experiences/abstract/components/Quote/quotePartsConfig';

describe('wall feed', () => {
  const articles = loadAbstractPostDockItems();
  const about = loadAboutPageContent();
  const quotations = buildWallQuoteItems(about.timeline);
  const thoughts = getThoughts();
  const articleEntry: WallFeedEntry = {
    kind: 'article', ref: '2023-01-27_medium-biomimetics',
    title: 'A wall-specific title', text: 'A wall-specific description.',
    date: '2023-01-27', keywords: ['New topic', 'Second topic'],
    href: '/posts/2023-01-27_medium-biomimetics',
  };

  it('loads the current published selection and its visible wall copy', () => {
    expect(loadWallContent(articles, about)).toMatchObject({
      maxColumnWidthPx: 370,
      practices: { quote: { sourceHeading: 'Product, experience, engineering & applied AI' }, heading: 'The Practice', practices: [
        { title: 'Product Strategy & Direction' },
        { title: 'Experience & Interface Design' },
        { title: 'Software Engineering & Architecture' },
        { title: 'Applied AI & Intelligent Automation' },
      ] },
    });
    const feed = loadWallFeed(articles, about);
    expect(feed).toHaveLength(16);
    expect(feed.filter(item => item.kind === 'article')).toHaveLength(6);
    expect(feed.filter(item => item.kind === 'quotation')).toHaveLength(8);
    expect(feed.filter(item => item.kind === 'statement')).toHaveLength(2);
    expect(feed.filter(item => item.kind === 'thought')).toHaveLength(0);
    expect(feed[0]).toMatchObject({ kind: 'statement', quotation: { role: 'feature', title: 'The Next Change', period: '' } });
    expect(feed[1]).toMatchObject({ kind: 'article', title: 'A biomimetic framework for interfaces that feel human' });
    expect(feed[0]).toMatchObject({
      description: 'Carry product decisions into working software. Let real use shape the next change.',
      quotation: {
        fullText: 'Carry product decisions into working software. Let real use shape the next change.',
        displayText: 'Carry product decisions into **working software**. Let real use shape the **next change**.',
        featuredContent: {
          introTitle: "Hello, I'm Manuel Cerdas.",
          introText: expect.stringContaining('product strategy, experience design, and engineering'),
          cta: { label: 'Explore the practice', target: '#practices-heading' },
        },
      },
    });
    expect(feed.find(item => item.id === 'quotation:independent-body')).toMatchObject({ kind: 'quotation', quotation: {
      role: 'statement', title: 'Through delivery', period: '',
      displayText: 'I work alongside the team from the first conversation to a product people can use.',
    } });
    expect(feed.find(item => item.id === 'quotation:consulting-line')).toMatchObject({
      kind: 'quotation', quotation: { role: 'excerpt', title: 'A voice in the decision' },
    });
    expect(feed.find(item => item.id === 'statement:decision-to-delivery')).toMatchObject({ kind: 'statement', quotation: { role: 'excerpt', title: 'From decision to delivery' } });
    expect(feed.filter(item => (item.kind === 'quotation' || item.kind === 'statement') && item.quotation.role === 'feature'))
      .toHaveLength(1);
  });

  it('renders authored practices as the practice quote type without numbered labels', () => {
    const content = loadWallContent(articles, about).practices;
    const html = renderToStaticMarkup(createElement(PracticesSection, {
      content,
      quoteConfig: DEFAULT_EDITORIAL_QUOTE_CONFIGS.practice,
      headingAppearance: DEFAULT_QUOTE_HEADING_APPEARANCE,
      inkColor: '#6a4384',
    }));
    expect(html).toContain('color:#6a4384');
    // The disciplines line is deduplicated into the hero quote.sourceHeading,
    // so the section heading is blank; the introduction carries the header copy.
    expect(html).toContain('approached as serious engineering work');
    // The four practice titles render directly as subtitles (h3), not via
    // EditorialQuote, and carry no numbered labels.
    for (const title of ['Product Strategy', 'Interface Design', 'Software Engineering', 'Applied AI']) {
      expect(html).toContain(title);
    }
    expect(html.match(/data-practice-card-placement="grid"/g)).toHaveLength(4);
    expect(html.match(/<h3/g)?.length).toBeGreaterThanOrEqual(4);
    expect(html).not.toMatch(/Practice (?:01|02|03|04)/);
  });

  it('uses manifest edits for the final article and quotation presentation', () => {
    const entries: WallFeedEntry[] = [articleEntry, {
      kind: 'quotation', ref: 'question-line', title: 'A new heading', period: 'now',
      presentation: 'solid', text: 'A selected wall passage.', href: '/about#about-question',
      link: true, linkLabel: 'Read context',
    }];
    const [article, quotation] = buildWallFeed(entries, articles, quotations, thoughts);
    expect(article.kind === 'article' && article.article).toMatchObject({
      title: articleEntry.title, excerpt: articleEntry.text, topic: 'New topic', href: articleEntry.href,
      date: 'Jan, 2023',
    });
    expect(quotation.kind === 'quotation' && quotation.quotation).toMatchObject({
      title: 'A new heading', period: 'now', role: 'excerpt',
      displayText: 'A selected wall passage.', destination: '/about#about-question',
      linkEnabled: true, linkLabel: 'Read context',
    });
  });

  it('renders a source-backed editorial statement without inventing a historical period', () => {
    const [item] = buildWallFeed([{
      kind: 'statement', ref: 'decision-to-delivery', title: 'From decision to delivery',
      text: 'An original wall statement.', presentation: 'featured', link: false,
      href: '/about',
    }], articles, quotations, thoughts);
    expect(item).toMatchObject({
      kind: 'statement', id: 'statement:decision-to-delivery', publishedAt: null,
      quotation: { sourceKind: 'editorial', role: 'feature', period: '', linkEnabled: false,
        ariaLabel: 'Statement: From decision to delivery' },
    });
  });

  it('allows a sourced quotation to omit a period without inheriting the source timeline date', () => {
    const [item] = buildWallFeed([{
      kind: 'quotation', ref: 'independent-body', title: 'Through delivery',
      text: 'I work alongside the team.', presentation: 'plain', link: false,
      href: '/about#about-independent',
    }], articles, quotations, thoughts);
    expect(item.kind === 'quotation' && item.quotation).toMatchObject({
      title: 'Through delivery', period: '', role: 'statement',
    });
  });

  it('uses the authored ISO month on first-of-month dates', () => {
    const [item] = buildWallFeed([{
      ...articleEntry, ref: '2020-12-01_medium-tech-leading', date: '2020-12-01',
    }], articles, quotations, thoughts);
    expect(item.kind === 'article' && item.article.date).toBe('Dec, 2020');
  });

  it('resolves a future thought from author-visible passage and date', () => {
    const [thought] = buildWallFeed([{
      kind: 'thought', ref: 'nobody-made-this-alone', title: 'Nobody made this alone.',
      text: 'A complete wall passage.', date: '2026-09-02', href: '/thoughts/nobody-made-this-alone',
    }], articles, quotations, thoughts);
    expect(thought).toMatchObject({ kind: 'thought', description: 'A complete wall passage.', publishedAt: '2026-09-02' });
  });

  it('rejects missing sources, duplicates, and inverted publication order', () => {
    expect(() => buildWallFeed([{ ...articleEntry, ref: 'missing' }], articles, quotations, thoughts))
      .toThrow('Missing wall article');
    expect(() => buildWallFeed([articleEntry, articleEntry], articles, quotations, thoughts))
      .toThrow('Duplicate wall entry');
    expect(() => buildWallFeed([
      { ...articleEntry, ref: '2017-11-03_medium-tech-debt', date: '2017-11-03' },
      articleEntry,
    ], articles, quotations, thoughts)).toThrow('newest first');
  });
});
