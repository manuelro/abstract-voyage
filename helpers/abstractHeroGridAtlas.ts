import {
  getProceduralColorAtlasCellRect,
  getProceduralColorAtlasLayout,
  type ProceduralColorAtlasLayout,
} from './proceduralColorAtlas';

export type GradientGridFrame = {
  layerFaceIndices: number[];
  atlasCellCount: number;
  cellResolutionPx: number;
  capturedAt: number;
};

const GRADIENT_GRID_MIN_CELL_RESOLUTION_PX = 64;
const GRADIENT_GRID_FALLBACK_MAX_TEXTURE_SIZE = 4096;

/**
 * Packs `cellCount` faces into a square-ish atlas (reusing the layout already
 * proven by pages/particle.tsx) and shrinks the per-cell resolution if the
 * resulting texture would exceed the driver's MAX_TEXTURE_SIZE — neither the
 * legacy vertical-strip atlas nor particle.tsx guards against this today, but
 * a dense grid is the first path where the atlas can plausibly grow past a
 * mobile GPU's texture ceiling.
 */
export function resolveGradientGridAtlasPlan({
  gl,
  cellCount,
  cellResolutionPx,
}: {
  gl: WebGLRenderingContext;
  cellCount: number;
  cellResolutionPx: number;
}): ProceduralColorAtlasLayout {
  const maxTextureSize = Math.max(
    GRADIENT_GRID_MIN_CELL_RESOLUTION_PX,
    Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || GRADIENT_GRID_FALLBACK_MAX_TEXTURE_SIZE,
  );
  const initialLayout = getProceduralColorAtlasLayout(cellCount, cellResolutionPx);
  const overshoot = Math.max(initialLayout.width, initialLayout.height) / maxTextureSize;

  if (overshoot <= 1) return initialLayout;

  const safeCellSize = Math.max(
    GRADIENT_GRID_MIN_CELL_RESOLUTION_PX,
    Math.floor(cellResolutionPx / overshoot),
  );

  return getProceduralColorAtlasLayout(cellCount, safeCellSize);
}

export function clearGradientGridCellCanvases(cellCanvases: Array<HTMLCanvasElement | null>) {
  cellCanvases.forEach(cellCanvas => {
    const cellContext = cellCanvas?.getContext('2d');
    if (!cellCanvas || !cellContext) return;
    cellContext.clearRect(0, 0, cellCanvas.width, cellCanvas.height);
  });
}

/**
 * Disjoint-cell analog of paintGradientSnapshotFrame: each grid cell shows
 * one opaque crop, no height-ratio math and no blend-mode cascade (unlike
 * the legacy bottom-anchored band stack, grid cells don't overlap).
 */
export function paintGradientGridFrame({
  cellCanvases,
  frame,
  atlasCanvas,
  atlasLayout,
  frozenCellSources = null,
}: {
  cellCanvases: Array<HTMLCanvasElement | null>;
  frame: GradientGridFrame | null;
  atlasCanvas: HTMLCanvasElement | null;
  atlasLayout: ProceduralColorAtlasLayout | null;
  frozenCellSources?: HTMLCanvasElement[] | null;
}) {
  if (!frame || !atlasLayout || (!atlasCanvas && !frozenCellSources)) {
    clearGradientGridCellCanvases(cellCanvases);
    return;
  }

  frame.layerFaceIndices.forEach((faceIndex, cellIndex) => {
    const cellCanvas = cellCanvases[cellIndex];
    const cellContext = cellCanvas?.getContext('2d');
    if (!cellCanvas || !cellContext) return;

    if (cellCanvas.width !== atlasLayout.cellSize) cellCanvas.width = atlasLayout.cellSize;
    if (cellCanvas.height !== atlasLayout.cellSize) cellCanvas.height = atlasLayout.cellSize;

    cellContext.clearRect(0, 0, cellCanvas.width, cellCanvas.height);
    cellContext.imageSmoothingEnabled = true;
    cellContext.imageSmoothingQuality = 'high';

    const frozenSource = frozenCellSources?.[cellIndex] ?? null;

    if (frozenSource) {
      cellContext.drawImage(frozenSource, 0, 0);
      return;
    }

    if (!atlasCanvas) return;

    const cellRect = getProceduralColorAtlasCellRect(atlasLayout, faceIndex);
    cellContext.drawImage(
      atlasCanvas,
      cellRect.sourceX,
      cellRect.sourceY,
      cellRect.size,
      cellRect.size,
      0,
      0,
      atlasLayout.cellSize,
      atlasLayout.cellSize,
    );
  });
}
