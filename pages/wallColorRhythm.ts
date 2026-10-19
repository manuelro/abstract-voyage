export type WallRhythmEntry = {
  id: string;
  /** Height used by the masonry placer, including quote breathing room. */
  height: number;
  /** Visible surface height; excludes quote breathing room below the card. */
  visualHeight?: number;
  colorful: boolean;
  dated: boolean;
};

const MAX_DISPLACEMENT = 3;
const MAX_MOVES = 7;
const BEAM_WIDTH = 128;
const HORIZONTAL_CONTACT_MIN_RATIO = 0.25;

export type WallColorRhythmScore = {
  verticalPairs: number;
  horizontalPairs: number;
  horizontalOverlap: number;
};

/** Score visible color surfaces using MasonryWall's shortest-column placement. */
export function scoreWallColorRhythm(entries: readonly WallRhythmEntry[], columns: number, rowGap: number): WallColorRhythmScore {
  const count = Math.max(1, Math.floor(columns));
  const bottoms = Array<number>(count).fill(0);
  const previousColorful = Array<boolean>(count).fill(false);
  const colorfulSurfaces: Array<{ column: number; top: number; bottom: number; height: number }> = [];
  let verticalPairs = 0;
  let horizontalPairs = 0;
  let horizontalOverlap = 0;
  for (const entry of entries) {
    const column = bottoms.indexOf(Math.min(...bottoms));
    const top = bottoms[column];
    const height = Math.max(0, entry.height);
    if (entry.colorful) {
      if (previousColorful[column]) verticalPairs += 1;
      const visualHeight = Math.max(0, Math.min(height, entry.visualHeight ?? height));
      for (const surface of colorfulSurfaces) {
        if (Math.abs(surface.column - column) !== 1) continue;
        const overlap = Math.max(0, Math.min(top + visualHeight, surface.bottom) - Math.max(top, surface.top));
        if (overlap <= 0) continue;
        const ratio = overlap / Math.min(visualHeight, surface.height);
        if (ratio >= HORIZONTAL_CONTACT_MIN_RATIO) {
          horizontalPairs += 1;
          horizontalOverlap += ratio;
        }
      }
      colorfulSurfaces.push({ column, top, bottom: top + visualHeight, height: visualHeight });
    }
    bottoms[column] = top + height + rowGap;
    previousColorful[column] = entry.colorful;
  }
  return { verticalPairs, horizontalPairs, horizontalOverlap };
}

export function countWallColorPairs(entries: readonly WallRhythmEntry[], columns: number, rowGap: number): number {
  return scoreWallColorRhythm(entries, columns, rowGap).verticalPairs;
}

function compareScores(a: WallColorRhythmScore, b: WallColorRhythmScore): number {
  return a.verticalPairs - b.verticalPairs || a.horizontalPairs - b.horizontalPairs
    || a.horizontalOverlap - b.horizontalOverlap;
}

/** Search local moves while retaining the relative order of dated and neutral entries. */
export function orderWallEntriesForColorRhythm(
  entries: readonly WallRhythmEntry[], columns: number, rowGap: number,
): string[] {
  type State = { order: WallRhythmEntry[]; score: WallColorRhythmScore; displacement: number; key: string };
  const initial: State = {
    order: [...entries], score: scoreWallColorRhythm(entries, columns, rowGap),
    displacement: 0, key: entries.map(entry => entry.id).join('|'),
  };
  if (initial.score.verticalPairs === 0 && initial.score.horizontalPairs === 0) return entries.map(entry => entry.id);
  const originalPositions = new Map(entries.map((entry, index) => [entry.id, index]));
  const neutralOrder = entries.filter(entry => !entry.colorful && !entry.dated).map(entry => entry.id).join('|');
  const seen = new Set([initial.key]);
  let best = initial;
  let beam = [initial];

  for (let move = 0; move < (columns <= 1 ? 3 : MAX_MOVES); move += 1) {
    const next: State[] = [];
    for (const state of beam) {
      for (let from = 0; from < state.order.length; from += 1) {
        const entry = state.order[from];
        if (entry.colorful || entry.dated) continue;
        for (let to = Math.max(0, from - MAX_DISPLACEMENT);
          to <= Math.min(state.order.length - 1, from + MAX_DISPLACEMENT); to += 1) {
          if (to === from) continue;
          const order = [...state.order];
          order.splice(from, 1);
          order.splice(to, 0, entry);
          const key = order.map(item => item.id).join('|');
          // Keep the opening entry anchored even when a later swap could score better.
          if (seen.has(key) || order[0].id !== entries[0]?.id) continue;
          seen.add(key);
          if (order.filter(item => !item.colorful && !item.dated).map(item => item.id).join('|') !== neutralOrder
            || order.some((item, index) => Math.abs((originalPositions.get(item.id) ?? index) - index) > MAX_DISPLACEMENT)) continue;
          const candidate: State = {
            order, key, score: scoreWallColorRhythm(order, columns, rowGap),
            displacement: order.reduce((sum, item, index) =>
              sum + Math.abs((originalPositions.get(item.id) ?? index) - index), 0),
          };
          const comparison = compareScores(candidate.score, best.score);
          if (comparison < 0 || comparison === 0 && candidate.displacement < best.displacement) best = candidate;
          next.push(candidate);
        }
      }
    }
    next.sort((a, b) => compareScores(a.score, b.score) || a.displacement - b.displacement
      || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    beam = next.slice(0, BEAM_WIDTH);
    if (beam.length === 0) break;
  }
  return best.order.map(entry => entry.id);
}
