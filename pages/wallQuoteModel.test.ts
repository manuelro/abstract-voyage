import { describe, expect, it } from 'vitest';
import { loadAboutPageContent } from '../helpers/content/pageContent.build';
import { buildWallQuoteItems } from './wallQuoteModel';

describe('wall quote editorial model', () => {
  const items = buildWallQuoteItems(loadAboutPageContent().timeline);

  it('keeps every stage, gives exactly one quote the feature role, and links to its own stage', () => {
    expect(items).toHaveLength(10);
    expect(items.filter(item => item.role === 'feature').map(item => item.key)).toEqual(['question-line']);
    expect(items.every(item => item.destination === `/about#about-${item.entryId}`)).toBe(true);
  });

  it('shows complete statements and sentence-boundary excerpts while retaining full copy', () => {
    expect(items.filter(item => item.role !== 'excerpt').every(item => item.displayText === item.fullText)).toBe(true);
    const excerpts = items.filter(item => item.role === 'excerpt');
    expect(excerpts.every(item => item.fullText.startsWith(item.displayText))).toBe(true);
    expect(excerpts.every(item => /[.!?]$/u.test(item.displayText))).toBe(true);
    expect(excerpts.some(item => item.displayText.length < item.fullText.length)).toBe(true);
  });
});
