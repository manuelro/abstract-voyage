import type { AboutPageContent } from '../helpers/content/pageContent.schema';

export type WallQuoteRole = 'statement' | 'excerpt' | 'feature';

export type FeaturedWallQuoteContent = {
  introTitle: string;
  introText: string;
  cta: { label: string; target: string };
};

export type WallQuoteItem = {
  key: string;
  entryId: string;
  sourceKind: 'line' | 'body' | 'editorial';
  role: WallQuoteRole;
  fullText: string;
  displayText: string;
  title: string;
  period: string;
  destination: string;
  /** The wall manifest can make a source action explicit per passage. */
  linkEnabled?: boolean;
  linkLabel?: string;
  ariaLabel?: string;
  featuredContent?: FeaturedWallQuoteContent;
};

const FEATURE_ENTRY_ID = 'question';
const TWO_SENTENCE_EXCERPTS = new Set(['question', 'independent']);

export function aboutCopyAsPlainText(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
    .replace(/\*\*/gu, '')
    .replace(/\s+Start a note\s*$/u, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function openingSentences(value: string, count: number): string {
  const sentences = value.match(/[^.!?]+[.!?]+(?:\s|$)/gu);
  return sentences?.slice(0, count).map(sentence => sentence.trim()).join(' ') || value;
}

export function buildWallQuoteItems(timeline: AboutPageContent['timeline']): WallQuoteItem[] {
  return timeline.flatMap(entry => {
    const line = aboutCopyAsPlainText(entry.line);
    const body = aboutCopyAsPlainText(entry.body);
    const shared = {
      entryId: entry.id,
      title: entry.title,
      period: entry.period,
      destination: `/about#about-${entry.id}`,
    };
    return [
      {
        ...shared,
        key: `${entry.id}-line`,
        sourceKind: 'line',
        role: entry.id === FEATURE_ENTRY_ID ? 'feature' : 'statement',
        fullText: line,
        displayText: line,
      },
      {
        ...shared,
        key: `${entry.id}-body`,
        sourceKind: 'body',
        role: 'excerpt',
        fullText: body,
        displayText: openingSentences(body, TWO_SENTENCE_EXCERPTS.has(entry.id) ? 2 : 1),
      },
    ];
  });
}
