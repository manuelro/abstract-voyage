import { describe, expect, it } from 'vitest';
import { quoteIndicesWithTopRules, type WallMasonryItemPosition } from './wallQuoteTopRules';

const item = (
  order: number,
  role: WallMasonryItemPosition['role'],
  columnX: number,
  topY: number,
  quoteIndex?: number,
): WallMasonryItemPosition => ({ order, role, columnX, topY, quoteIndex });

describe('wall quote top rules', () => {
  it('uses the direct neighbour in each rendered column', () => {
    expect(quoteIndicesWithTopRules([
      item(0, 'article', 0, 0),
      item(1, 'statement', 0, 100, 0), // article above
      item(2, 'excerpt', 0, 200, 1), // plain quote above
      item(3, 'feature', 0, 300, 2), // featured never has a rule
      item(4, 'statement', 0, 400, 3), // featured above
      item(5, 'excerpt', 0, 500, 4), // plain quote above
      item(6, 'statement', 200, 0, 5), // top of another column
      item(7, 'article', 200, 100),
      item(8, 'excerpt', 200, 200, 6), // article above
      item(9, 'statement', 200, 300, 7), // solid quote above
    ])).toEqual([1, 4, 7]);
  });

  it('recomputes from positions when a narrow layout moves items into one column', () => {
    const responsive = [
      item(0, 'article', 0, 0),
      item(1, 'statement', 0, 100, 0),
      item(2, 'excerpt', 200, 0, 1),
    ];
    expect(quoteIndicesWithTopRules(responsive)).toEqual([]);
    expect(quoteIndicesWithTopRules(responsive.map((entry, order) => ({
      ...entry, columnX: 0, topY: order * 100,
    })))).toEqual([1]);
  });
});
