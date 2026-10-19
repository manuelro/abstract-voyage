export type WallMasonryItemPosition = {
  order: number;
  quoteIndex?: number;
  columnX: number;
  topY: number;
  role: 'article' | 'thought' | 'feature' | 'statement' | 'excerpt';
  /** This item's own measured quote-density breathing room (WallQuoteItem's
   * own ResizeObserver-driven calculation, read back from its
   * data-wall-quote-extra-gap DOM attribute). Undefined/0 for items with no
   * extra spacing, and for non-quote items (article/thought). */
  extraGapPx?: number;
};

export type WallTopRuleLayout = {
  /** Quote indices that should render a visible top rule -- unchanged logic
   * from this module's original quoteIndicesWithTopRules. */
  ruleQuoteIndices: number[];
  /** Keyed by the quote directly ABOVE a rule-owning neighbour (the
   * "sender" of extra breathing room). Half of the sender's own measured
   * extraGapPx -- the portion it should still apply to itself as space
   * after its own text. The other half goes to the rule-owning neighbour
   * below (receiverTopGapPxByQuoteIndex), so the divider between the two
   * sits at an equal distance from both, instead of all the extra space
   * landing only above the rule. Present only for senders whose immediate
   * column-neighbour below actually owns a visible rule -- every other
   * quote keeps applying its full measured extraGapPx, since there is no
   * divider to balance around.
   */
  senderHalvedGapPxByQuoteIndex: Record<number, number>;
  /** Keyed by the rule-owning quote itself -- the other half of its
   * column-above neighbour's measured extraGapPx, applied as additional
   * space between the rule and this quote's own content. */
  receiverTopGapPxByQuoteIndex: Record<number, number>;
  /** Quote indices with no item at all directly above them in their
   * rendered column -- the first row of the masonry, regardless of
   * breakpoint or column count. These have no "space between two items" to
   * balance or center in the first place, so the wall-level breathing-room
   * centering (WallQuoteItem.tsx) must leave them exactly as before: full
   * measured extraGapPx applied as paddingBlockEnd only. */
  firstInColumnQuoteIndices: number[];
};

function computeWallTopRuleLayout(items: readonly WallMasonryItemPosition[]): WallTopRuleLayout {
  const columns = new Map<number, WallMasonryItemPosition[]>();
  for (const item of items) {
    const column = columns.get(item.columnX) ?? [];
    column.push(item);
    columns.set(item.columnX, column);
  }

  const ruleQuoteIndices: number[] = [];
  const senderHalvedGapPxByQuoteIndex: Record<number, number> = {};
  const receiverTopGapPxByQuoteIndex: Record<number, number> = {};
  const firstInColumnQuoteIndices: number[] = [];
  for (const column of Array.from(columns.values())) {
    column.sort((a, b) => a.topY - b.topY || a.order - b.order);
    if (column.length > 0 && column[0].quoteIndex !== undefined) {
      firstInColumnQuoteIndices.push(column[0].quoteIndex);
    }
    for (let index = 1; index < column.length; index += 1) {
      const item = column[index];
      const above = column[index - 1];
      if (item.quoteIndex !== undefined
        && (item.role === 'statement' || item.role === 'excerpt')
        && (above.role === 'statement' || above.role === 'excerpt')) {
        ruleQuoteIndices.push(item.quoteIndex);
        const half = Math.round((above.extraGapPx ?? 0) / 2);
        receiverTopGapPxByQuoteIndex[item.quoteIndex] = half;
        if (above.quoteIndex !== undefined) {
          senderHalvedGapPxByQuoteIndex[above.quoteIndex] = half;
        }
      }
    }
  }
  return {
    ruleQuoteIndices: ruleQuoteIndices.sort((a, b) => a - b),
    senderHalvedGapPxByQuoteIndex,
    receiverTopGapPxByQuoteIndex,
    firstInColumnQuoteIndices: firstInColumnQuoteIndices.sort((a, b) => a - b),
  };
}

/** The preceding item in the same rendered CSS column is the direct top neighbour. */
export function quoteIndicesWithTopRules(items: readonly WallMasonryItemPosition[]): number[] {
  return computeWallTopRuleLayout(items).ruleQuoteIndices;
}

/** See WallTopRuleLayout's own field docs. Computed from the same
 * column-adjacency pass as quoteIndicesWithTopRules -- call this instead of
 * that function when the sender/receiver gap split is also needed, rather
 * than walking the columns twice. */
export function wallTopRuleLayout(items: readonly WallMasonryItemPosition[]): WallTopRuleLayout {
  return computeWallTopRuleLayout(items);
}
