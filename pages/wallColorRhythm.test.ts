import { describe, expect, it } from 'vitest';
import { countWallColorPairs, orderWallEntriesForColorRhythm, scoreWallColorRhythm, type WallRhythmEntry } from './wallColorRhythm';

const entry = (id: string, colorful: boolean, dated = false, height = 300): WallRhythmEntry =>
  ({ id, colorful, dated, height });

describe('wall color rhythm', () => {
  it('separates a colorful feature from an article on one column', () => {
    const entries = [entry('article-1', true, true), entry('feature', true), entry('quote', false)];
    const ids = orderWallEntriesForColorRhythm(entries, 1, 40);
    expect(ids).toEqual(['article-1', 'quote', 'feature']);
    expect(countWallColorPairs(ids.map(id => entries.find(item => item.id === id)!), 1, 40)).toBe(0);
  });

  it('reduces side-by-side color while preserving zero vertical pairs', () => {
    const entries = [entry('article', true, true), entry('feature', true),
      entry('quote-1', false), entry('quote-2', false)];
    const byId = new Map(entries.map(item => [item.id, item]));
    const ordered = orderWallEntriesForColorRhythm(entries, 2, 40).map(id => byId.get(id)!);
    expect(scoreWallColorRhythm(entries, 2, 40).horizontalPairs).toBe(1);
    expect(scoreWallColorRhythm(ordered, 2, 40)).toMatchObject({ verticalPairs: 0, horizontalPairs: 0 });
    expect(ordered.filter(item => !item.colorful).map(item => item.id)).toEqual(['quote-1', 'quote-2']);
  });

  it('keeps dated and neutral reading sequences stable while improving a multi-column wall', () => {
    const entries = [
      entry('article-1', true, true, 464), entry('feature', true, false, 503),
      entry('quote-1', false, false, 348), entry('article-2', true, true, 464),
      entry('quote-2', false, false, 326), entry('quote-3', false, false, 438),
      entry('article-3', true, true, 464), entry('quote-4', false, false, 356),
      entry('article-4', true, true, 464), entry('quote-5', false, false, 470),
      entry('article-5', true, true, 464), entry('quote-6', false, false, 393),
    ];
    const ids = orderWallEntriesForColorRhythm(entries, 4, 64);
    const byId = new Map(entries.map(item => [item.id, item]));
    expect(ids[0]).toBe('article-1');
    expect(ids.filter(id => byId.get(id)?.dated)).toEqual(entries.filter(item => item.dated).map(item => item.id));
    expect(ids.filter(id => !byId.get(id)?.dated && !byId.get(id)?.colorful))
      .toEqual(entries.filter(item => !item.dated && !item.colorful).map(item => item.id));
    expect(countWallColorPairs(ids.map(id => byId.get(id)!), 4, 64))
      .toBeLessThan(countWallColorPairs(entries, 4, 64));
  });

  it('keeps the curated order when there is no useful neutral entry', () => {
    const entries = [entry('article-1', true, true), entry('article-2', true, true)];
    expect(orderWallEntriesForColorRhythm(entries, 1, 40)).toEqual(['article-1', 'article-2']);
  });
});
