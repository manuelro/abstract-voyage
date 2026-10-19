import type { SliderContentSlide } from './postContent';
import type { ThoughtSummary } from './thoughtContent';
import type { FeaturedWallQuoteContent, WallQuoteItem, WallQuoteRole } from '../pages/wallQuoteModel';
import { stripEmphasisMarkup } from './textEmphasis';

type EntryBase = {
  ref: string;
  title: string;
  text: string;
  href: string;
};

/** Author-facing wall copy. The source ref provides provenance and technical
 * card data; every field visible on the wall comes from this entry. */
export type WallFeedEntry =
  | (EntryBase & { kind: 'article'; date: string; keywords: string[] })
  | (EntryBase & { kind: 'quotation'; period?: string; presentation: 'featured' | 'plain' | 'solid'; link: boolean; linkLabel?: string })
  | (EntryBase & { kind: 'statement'; presentation: 'featured' | 'plain' | 'solid'; link: boolean; linkLabel?: string; featuredContent?: FeaturedWallQuoteContent })
  | (EntryBase & { kind: 'thought'; date: string });

type WallFeedShared = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  href: string;
  publishedAt: string | null;
};

export type WallFeedItem =
  | (WallFeedShared & { kind: 'article'; article: SliderContentSlide })
  | (WallFeedShared & { kind: 'quotation'; quotation: WallQuoteItem })
  | (WallFeedShared & { kind: 'statement'; quotation: WallQuoteItem })
  | (WallFeedShared & { kind: 'thought'; thought: ThoughtSummary });

const quoteRole: Record<Extract<WallFeedEntry, { kind: 'quotation' | 'statement' }>['presentation'], WallQuoteRole> = {
  featured: 'feature',
  plain: 'statement',
  solid: 'excerpt',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function wallMonthLabel(date: string): string {
  return `${MONTHS[Number(date.slice(5, 7)) - 1]}, ${date.slice(0, 4)}`;
}

/** Resolve curator-authored wall copy against canonical source identities.
 * Missing sources, duplicate entries, and inverted dates fail at build time. */
export function buildWallFeed(
  entries: WallFeedEntry[],
  articles: SliderContentSlide[],
  quotations: WallQuoteItem[],
  thoughts: ThoughtSummary[],
): WallFeedItem[] {
  const articleBySlug = new Map(articles.map(article => [article.slug, article]));
  const quoteByKey = new Map(quotations.map(quotation => [quotation.key, quotation]));
  const thoughtBySlug = new Map(thoughts.map(thought => [thought.slug, thought]));
  const seen = new Set<string>();
  let previousDate = '9999-12-31';

  return entries.map(entry => {
    const { kind, ref } = entry;
    const id = `${kind}:${ref}`;
    if (seen.has(id)) throw new Error(`Duplicate wall entry: ${id}`);
    seen.add(id);
    let item: WallFeedItem;
    if (entry.kind === 'article') {
      const source = articleBySlug.get(ref);
      if (!source) throw new Error(`Missing wall article: ${ref}`);
      const external = /^https?:\/\//u.test(entry.href);
      const article: SliderContentSlide = {
        ...source,
        title: entry.title,
        excerpt: entry.text,
        topic: entry.keywords[0] ?? '',
        publishedDate: entry.date,
        date: wallMonthLabel(entry.date),
        href: entry.href,
        externalUrl: external ? entry.href : null,
        forceExternalNavigation: external,
      };
      item = {
        kind: 'article', id, article, title: entry.title, description: entry.text,
        keywords: entry.keywords, href: entry.href, publishedAt: entry.date,
      };
    } else if (entry.kind === 'quotation') {
      const source = quoteByKey.get(ref);
      if (!source) throw new Error(`Missing wall quotation: ${ref}`);
      const quotation: WallQuoteItem = {
        ...source,
        title: entry.title,
        period: entry.period ?? '',
        role: quoteRole[entry.presentation],
        fullText: entry.text,
        displayText: entry.text,
        destination: entry.href,
        linkEnabled: entry.link,
        ...(entry.linkLabel ? { linkLabel: entry.linkLabel } : {}),
      };
      item = {
        kind: 'quotation', id, quotation, title: entry.title, description: entry.text,
        keywords: [], href: entry.href, publishedAt: null,
      };
    } else if (entry.kind === 'statement') {
      const plainText = stripEmphasisMarkup(entry.text);
      const quotation: WallQuoteItem = {
        key: id,
        entryId: ref,
        sourceKind: 'editorial',
        role: quoteRole[entry.presentation],
        fullText: plainText,
        displayText: entry.text,
        title: entry.title,
        period: '',
        destination: entry.href,
        linkEnabled: entry.link,
        ariaLabel: `Statement: ${entry.title}`,
        ...(entry.featuredContent ? { featuredContent: entry.featuredContent } : {}),
        ...(entry.linkLabel ? { linkLabel: entry.linkLabel } : {}),
      };
      item = {
        kind: 'statement', id, quotation, title: entry.title, description: plainText,
        keywords: [], href: entry.href, publishedAt: null,
      };
    } else {
      const source = thoughtBySlug.get(ref);
      if (!source) throw new Error(`Missing wall thought: ${ref}`);
      const thought: ThoughtSummary = { ...source, title: entry.title, date: entry.date };
      item = {
        kind: 'thought', id, thought, title: entry.title, description: entry.text,
        keywords: [], href: entry.href, publishedAt: entry.date,
      };
    }
    if (item.publishedAt) {
      const date = item.publishedAt;
      if (!/^\d{4}-\d{2}-\d{2}$/u.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
        throw new Error(`Invalid wall date: ${id}`);
      }
      if (date > previousDate) throw new Error(`Wall entries must be newest first: ${id}`);
      previousDate = date;
    }
    return item;
  });
}
