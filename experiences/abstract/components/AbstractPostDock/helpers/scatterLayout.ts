import { clamp } from '../../../../../helpers/clamp';
import {
  computeAbstractPostDockTopPeekPx,
  type AbstractPostDockLayoutConfig,
} from '../config/registered';

const COLUMN_JITTER_SALT = 91573;
const ROW_JITTER_SALT = 42017;
const ROTATION_HASH_SALT = 628375;

export type AbstractPostDockScatterPosition = {
  leftPx: number;
  topPx: number;
  rotationDeg: number;
};

export type AbstractPostDockScatterLayout = {
  cardWidthPx: number;
  cardHeightPx: number;
  cardsPerRow: number;
  rowCount: number;
  cellStrideX: number;
  cellStrideY: number;
  containerHeightPx: number;
  topPeekPx: number;
  positions: AbstractPostDockScatterPosition[];
};

function hash01(a: number, b: number): number {
  let hash = Math.imul(a, 374761393) ^ Math.imul(b, 668265263);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
}

export function resolveAbstractPostDockScatterLayout({
  itemCount,
  layoutConfig,
  containerWidthPx,
  indexOffset = 0,
  enforceCardWidthBounds = true,
}: {
  itemCount: number;
  layoutConfig: AbstractPostDockLayoutConfig;
  containerWidthPx: number;
  indexOffset?: number;
  enforceCardWidthBounds?: boolean;
}): AbstractPostDockScatterLayout {
  const safeItemCount = Math.max(0, Math.floor(itemCount));
  const cardWidthPx = enforceCardWidthBounds
    ? clamp(layoutConfig.cardWidthPx, 160, 480)
    : Math.max(1, layoutConfig.cardWidthPx);
  const cardHeightPx = cardWidthPx * (4 / 3);
  const columnGapPx = Math.max(0, layoutConfig.columnGapPx);
  const rowGapPx = Math.max(0, layoutConfig.rowGapPx);
  const cellStrideX = cardWidthPx + columnGapPx;
  const cellStrideY = cardHeightPx + rowGapPx;
  const cardsPerRow = Math.max(
    1,
    Math.floor(
      (Math.max(containerWidthPx, cardWidthPx) + columnGapPx) / cellStrideX,
    ),
  );
  const maxRotationDeg = Math.max(0, layoutConfig.maxRotationDeg);
  const isGrid = layoutConfig.distribution === 'grid';
  const columnJitterFraction = isGrid
    ? 0
    : clamp(layoutConfig.columnJitterPercent, 0, 100) / 100;
  const rowJitterFraction = isGrid
    ? 0
    : clamp(layoutConfig.rowJitterPercent, 0, 100) / 100;
  const topPeekPx = computeAbstractPostDockTopPeekPx(layoutConfig);
  const rotationRad = (maxRotationDeg * Math.PI) / 180;
  const cosRotation = Math.abs(Math.cos(rotationRad));
  const sinRotation = Math.abs(Math.sin(rotationRad));
  const footprintGrowXPx = Math.max(
    0,
    cardWidthPx * cosRotation + cardHeightPx * sinRotation - cardWidthPx,
  );
  const footprintGrowYPx = Math.max(
    0,
    cardWidthPx * sinRotation + cardHeightPx * cosRotation - cardHeightPx,
  );
  const maxColumnJitterPx =
    Math.max(0, (columnGapPx - footprintGrowXPx) / 2) *
    columnJitterFraction;
  const maxRowJitterPx =
    Math.max(0, (rowGapPx - footprintGrowYPx) / 2) *
    rowJitterFraction;
  const rowCount = Math.max(1, Math.ceil(safeItemCount / cardsPerRow));
  const positions: AbstractPostDockScatterPosition[] = [];
  let itemIndex = 0;

  for (let row = 0; row < rowCount; row += 1) {
    const rowItemCount = Math.min(
      cardsPerRow,
      safeItemCount - itemIndex,
    );
    const rowWidthPx = rowItemCount * cellStrideX - columnGapPx;
    const rowMarginXPx = Math.max(0, (containerWidthPx - rowWidthPx) / 2);

    for (let slot = 0; slot < rowItemCount; slot += 1) {
      const resolvedIndex = indexOffset + itemIndex;
      const baseX = rowMarginXPx + slot * cellStrideX;
      const jitterX =
        (hash01(resolvedIndex, COLUMN_JITTER_SALT) - 0.5) *
        2 *
        maxColumnJitterPx;
      const jitterY =
        (hash01(resolvedIndex, ROW_JITTER_SALT) - 0.5) *
        2 *
        maxRowJitterPx;

      positions.push({
        leftPx: baseX + jitterX,
        topPx: row * cellStrideY + jitterY,
        rotationDeg:
          (hash01(resolvedIndex, ROTATION_HASH_SALT) - 0.5) *
          2 *
          maxRotationDeg,
      });
      itemIndex += 1;
    }
  }

  return {
    cardWidthPx,
    cardHeightPx,
    cardsPerRow,
    rowCount,
    cellStrideX,
    cellStrideY,
    containerHeightPx: rowCount * cellStrideY - rowGapPx,
    topPeekPx,
    positions,
  };
}
