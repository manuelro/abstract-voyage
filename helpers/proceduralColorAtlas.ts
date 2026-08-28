export type ProceduralColorAtlasLayout = {
  cellCount: number;
  cellSize: number;
  columns: number;
  rows: number;
  width: number;
  height: number;
};

export type ProceduralColorAtlasCellRect = {
  index: number;
  column: number;
  row: number;
  sourceX: number;
  sourceY: number;
  viewportX: number;
  viewportY: number;
  size: number;
};

export type ProceduralColorLayerVariationParams = {
  faceCount: number;
  shaderColorVariation: number;
  audioVariation: number;
  shaderParameterPhase: number;
  compositionInfluence: number;
};

const positiveModulo = (value: number, modulo: number) => ((value % modulo) + modulo) % modulo;

export function getProceduralColorAtlasLayout(cellCount: number, cellSize: number): ProceduralColorAtlasLayout {
  const safeCellCount = Math.max(1, Math.round(cellCount));
  const safeCellSize = Math.max(1, Math.round(cellSize));
  const columns = Math.ceil(Math.sqrt(safeCellCount));
  const rows = Math.ceil(safeCellCount / columns);

  return {
    cellCount: safeCellCount,
    cellSize: safeCellSize,
    columns,
    rows,
    width: columns * safeCellSize,
    height: rows * safeCellSize,
  };
}

export function getProceduralColorAtlasCellRect(
  layout: ProceduralColorAtlasLayout,
  index: number,
): ProceduralColorAtlasCellRect {
  const safeIndex = positiveModulo(index, layout.cellCount);
  const column = safeIndex % layout.columns;
  const row = Math.floor(safeIndex / layout.columns);
  const sourceX = column * layout.cellSize;
  const sourceY = row * layout.cellSize;

  return {
    index: safeIndex,
    column,
    row,
    sourceX,
    sourceY,
    viewportX: sourceX,
    viewportY: layout.height - (row + 1) * layout.cellSize,
    size: layout.cellSize,
  };
}

export function getProceduralColorLayerVariations({
  faceCount,
  shaderColorVariation,
  audioVariation,
  shaderParameterPhase,
  compositionInfluence,
}: ProceduralColorLayerVariationParams) {
  const safeFaceCount = Math.max(1, Math.round(faceCount));

  return Array.from({ length: safeFaceCount }, (_, faceIndex) => {
    const normalized = safeFaceCount > 1 ? faceIndex / (safeFaceCount - 1) : 0.5;
    const cohesiveVariation = Math.sin((normalized + shaderParameterPhase * 0.08) * Math.PI * 2)
      * 0.012
      * compositionInfluence;
    return (normalized - 0.5) * shaderColorVariation + cohesiveVariation + audioVariation;
  });
}
