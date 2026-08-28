export type ProceduralColorSnapshotSourceRectParams = {
  faceIndex: number;
  atlasColumns: number;
  atlasCellCount: number;
  shaderResolution: number;
};

export type ProceduralColorSnapshotSourceRect = {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
};

export type ProceduralColorStackRowSelection = {
  rowCount: number;
  rowNumber: number;
  rowIndex: number;
  rowHeightRatio: number;
  sourceYMin: number;
  sourceYMax: number;
};

export type ProceduralColorStackRowPixelBand = {
  sourceY: number;
  sourceHeight: number;
};

export type ProceduralColorStackLayerRowPixelBandParams = {
  sourceRow: number;
  overlayFaceCount: number;
  layerIndex: number;
  pixelHeight: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const positiveModulo = (value: number, modulo: number) => ((value % modulo) + modulo) % modulo;

export function getProceduralColorSnapshotLayerHeightRatio(layerIndex: number) {
  return layerIndex === 0 ? 1 : clamp(layerIndex * 0.1, 0.1, 1);
}

export function getProceduralColorStackLayerHeightRatio(layerIndex: number, overlayFaceCount: number) {
  if (layerIndex === 0) return 1;

  const safeFaceCount = Math.max(1, Math.round(overlayFaceCount));
  return clamp(layerIndex / safeFaceCount, 0, 1);
}

/**
 * Resolves a user-facing, top-to-bottom row number into the shader compositor's
 * bottom-to-top normalized coordinate space.
 */
export function resolveProceduralColorStackRow(
  sourceRow: number,
  overlayFaceCount: number,
): ProceduralColorStackRowSelection {
  const requestedRowCount = Number.isFinite(overlayFaceCount)
    ? Math.round(overlayFaceCount)
    : 1;
  const rowCount = Math.max(1, requestedRowCount);
  const requestedRow = Number.isFinite(sourceRow) ? Math.round(sourceRow) : 1;
  const rowNumber = clamp(requestedRow, 1, rowCount);
  const rowIndex = rowNumber - 1;
  const rowHeightRatio = 1 / rowCount;
  const sourceYMax = 1 - rowIndex * rowHeightRatio;

  return {
    rowCount,
    rowNumber,
    rowIndex,
    rowHeightRatio,
    sourceYMin: sourceYMax - rowHeightRatio,
    sourceYMax,
  };
}

/** Resolves the selected semantic row to a bottom-origin WebGL pixel band. */
export function getProceduralColorStackRowPixelBand(
  sourceRow: number,
  overlayFaceCount: number,
  pixelHeight: number,
): ProceduralColorStackRowPixelBand {
  const selection = resolveProceduralColorStackRow(sourceRow, overlayFaceCount);
  const safePixelHeight = Math.max(1, Math.round(pixelHeight));
  const sourceY = Math.floor(selection.sourceYMin * safePixelHeight);
  const sourceYMax = Math.ceil(selection.sourceYMax * safePixelHeight);

  return {
    sourceY,
    sourceHeight: Math.max(1, sourceYMax - sourceY),
  };
}

/**
 * Maps a final-composite row into one retained layer's source texture.
 * Layers that end below the selected row return null and must not be redrawn.
 */
export function getProceduralColorStackLayerRowPixelBand({
  sourceRow,
  overlayFaceCount,
  layerIndex,
  pixelHeight,
}: ProceduralColorStackLayerRowPixelBandParams): ProceduralColorStackRowPixelBand | null {
  const selection = resolveProceduralColorStackRow(sourceRow, overlayFaceCount);
  const layerHeightRatio = getProceduralColorStackLayerHeightRatio(
    layerIndex,
    overlayFaceCount,
  );
  const intersectionYMin = Math.max(selection.sourceYMin, 0);
  const intersectionYMax = Math.min(selection.sourceYMax, layerHeightRatio);

  if (intersectionYMax <= intersectionYMin) return null;

  const safePixelHeight = Math.max(1, Math.round(pixelHeight));
  const layerSourceYMin = intersectionYMin / layerHeightRatio;
  const layerSourceYMax = intersectionYMax / layerHeightRatio;
  const sourceY = Math.floor(layerSourceYMin * safePixelHeight);
  const sourceYMax = Math.ceil(layerSourceYMax * safePixelHeight);

  return {
    sourceY,
    sourceHeight: Math.max(1, sourceYMax - sourceY),
  };
}

/** Maps a point in destination row one onto the corresponding selected source row. */
export function remapProceduralColorTopRowY(
  destinationY: number,
  sourceRow: number,
  overlayFaceCount: number,
) {
  const selection = resolveProceduralColorStackRow(sourceRow, overlayFaceCount);
  const destinationRowMinY = 1 - selection.rowHeightRatio;
  const localY = clamp(
    (clamp(destinationY, 0, 1) - destinationRowMinY) / selection.rowHeightRatio,
    0,
    1,
  );

  return selection.sourceYMin + localY * selection.rowHeightRatio;
}

export function getProceduralColorSnapshotLayerSize(pixelSize: number, layerIndex: number) {
  const safePixelSize = Math.max(1, Math.round(pixelSize));
  const height = Math.max(
    1,
    Math.round(safePixelSize * getProceduralColorSnapshotLayerHeightRatio(layerIndex)),
  );

  return { width: safePixelSize, height };
}

export function getProceduralColorSnapshotSourceRect({
  faceIndex,
  atlasColumns,
  atlasCellCount,
  shaderResolution,
}: ProceduralColorSnapshotSourceRectParams): ProceduralColorSnapshotSourceRect {
  const safeCellCount = Math.max(1, Math.round(atlasCellCount));
  const safeColumns = Math.max(1, Math.round(atlasColumns));
  const safeResolution = Math.max(1, Math.round(shaderResolution));
  const safeFaceIndex = positiveModulo(faceIndex, safeCellCount);
  const column = safeFaceIndex % safeColumns;
  const row = Math.floor(safeFaceIndex / safeColumns);

  return {
    sourceX: column * safeResolution,
    sourceY: row * safeResolution,
    sourceWidth: safeResolution,
    sourceHeight: safeResolution,
  };
}
