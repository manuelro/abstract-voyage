import type { LabSummary } from '../../../../helpers/labContent';
import type { SliderContentSlide } from '../../../../helpers/postContent';
import type {
  AbstractPostDockLayoutConfig,
} from '../AbstractPostDock/config/registered';
import {
  resolveAbstractPostDockScatterLayout,
  type AbstractPostDockScatterPosition,
} from '../AbstractPostDock/helpers/scatterLayout';
import type {
  AbstractJournalLabCollectionConfig,
} from './config/presentation';

export type AbstractJournalLabFlipSlot = {
  index: number;
  article: SliderContentSlide | null;
  lab: LabSummary | null;
  position: AbstractPostDockScatterPosition;
};

export type AbstractJournalLabFlipTiming = {
  horizontalStepMs: number;
  startMs: number;
  midpointMs: number;
  totalMs: number;
};

export type AbstractJournalLabFlipSchedule = {
  timings: AbstractJournalLabFlipTiming[];
  horizontalStepMs: number;
  maxStartMs: number;
  totalMs: number;
};

const SQRT_TWO = Math.sqrt(2);

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const getVisibleHeight = (
  positions: AbstractPostDockScatterPosition[],
  cardHeightPx: number,
) => positions.length === 0
  ? 0
  : Math.max(...positions.map(position => position.topPx + cardHeightPx));

const alignFinalPartialRowToStart = (
  positions: AbstractPostDockScatterPosition[],
  cardsPerRow: number,
) => {
  const finalRowCount = positions.length % cardsPerRow;
  if (finalRowCount === 0) return positions;

  const finalRowStart = positions.length - finalRowCount;
  const finalRowOffsetPx = positions[finalRowStart]?.leftPx ?? 0;
  return positions.map((position, index) => (
    index < finalRowStart
      ? position
      : { ...position, leftPx: position.leftPx - finalRowOffsetPx }
  ));
};

export function resolveLatestIntersectionVisibility(
  entries: readonly Pick<IntersectionObserverEntry, 'isIntersecting'>[],
) {
  return entries.length > 0
    ? entries[entries.length - 1].isIntersecting
    : null;
}

export function resolveAbstractJournalLabPerspectivePx({
  perspectivePx,
  cardWidthPx,
  viewportHeightPx,
}: {
  perspectivePx: number;
  cardWidthPx: number;
  viewportHeightPx: number;
}) {
  return Math.max(
    1,
    perspectivePx,
    Math.max(1, cardWidthPx) * 8,
    Math.max(1, viewportHeightPx) * 4,
  );
}

export function resolveAbstractJournalLabPerspectiveOriginY({
  fieldTopPx,
  fieldHeightPx,
  viewportHeightPx,
}: {
  fieldTopPx: number;
  fieldHeightPx: number;
  viewportHeightPx: number;
}) {
  return clamp(
    viewportHeightPx / 2 - fieldTopPx,
    0,
    Math.max(0, fieldHeightPx),
  );
}

export function buildAbstractJournalLabFlipSchedule({
  positions,
  cardWidthPx,
  cardHeightPx,
  cellStrideX,
  config,
}: {
  positions: AbstractPostDockScatterPosition[];
  cardWidthPx: number;
  cardHeightPx: number;
  cellStrideX: number;
  config: Pick<
    AbstractJournalLabCollectionConfig,
    'flipDurationMs' | 'flipOverlapMs'
  >;
}): AbstractJournalLabFlipSchedule {
  const durationMs = Math.max(0, config.flipDurationMs);
  const overlapMs = clamp(config.flipOverlapMs, 0, durationMs);
  const horizontalStepMs = Math.max(0, durationMs - overlapMs);

  if (positions.length === 0) {
    return {
      timings: [],
      horizontalStepMs,
      maxStartMs: 0,
      totalMs: 0,
    };
  }

  const projections = positions.map(position => {
    const centerX = position.leftPx + cardWidthPx / 2;
    const centerY = position.topPx + cardHeightPx / 2;
    return (centerX + centerY) / SQRT_TWO;
  });
  const minimumProjection = Math.min(...projections);
  const horizontalProjectionPx = Math.max(1, cellStrideX / SQRT_TWO);
  const startTimes = projections.map(projection => {
    if (horizontalStepMs === 0) return 0;
    const startMs = Math.max(
      0,
      (projection - minimumProjection)
        / horizontalProjectionPx
        * horizontalStepMs,
    );
    return Math.round(startMs * 1000) / 1000;
  });
  const maxStartMs = Math.max(...startTimes);
  const totalMs = maxStartMs + durationMs;

  return {
    timings: startTimes.map(startMs => ({
      horizontalStepMs,
      startMs,
      midpointMs: startMs + durationMs / 2,
      totalMs,
    })),
    horizontalStepMs,
    maxStartMs,
    totalMs,
  };
}

export function buildAbstractJournalLabFlipLayout({
  articles,
  labs,
  layoutConfig,
  containerWidthPx,
  flipConfig,
  enforceCardWidthBounds = true,
}: {
  articles: SliderContentSlide[];
  labs: LabSummary[];
  layoutConfig: AbstractPostDockLayoutConfig;
  containerWidthPx: number;
  flipConfig: Pick<
    AbstractJournalLabCollectionConfig,
    'flipDurationMs' | 'flipOverlapMs'
  >;
  enforceCardWidthBounds?: boolean;
}) {
  const articleLayout = resolveAbstractPostDockScatterLayout({
    itemCount: articles.length,
    layoutConfig,
    containerWidthPx,
    enforceCardWidthBounds,
  });
  const articlePositions = alignFinalPartialRowToStart(
    articleLayout.positions,
    articleLayout.cardsPerRow,
  );
  const extraLabCount = Math.max(0, labs.length - articles.length);
  const usesArticleField = articles.length > 0;
  const extraTopPx = usesArticleField
    ? articleLayout.rowCount * articleLayout.cellStrideY
    : 0;
  const extraLayout = resolveAbstractPostDockScatterLayout({
    itemCount: usesArticleField ? extraLabCount : labs.length,
    layoutConfig,
    containerWidthPx,
    indexOffset: usesArticleField ? articles.length : 0,
    enforceCardWidthBounds,
  });
  const extraPositions = alignFinalPartialRowToStart(
    extraLayout.positions,
    extraLayout.cardsPerRow,
  );
  const positions = usesArticleField
    ? [
        ...articlePositions,
        ...extraPositions.map(position => ({
          ...position,
          topPx: position.topPx + extraTopPx,
        })),
      ]
    : extraPositions;
  const slotCount = Math.max(articles.length, labs.length);
  const slots = Array.from({ length: slotCount }, (_, index) => ({
    index,
    article: articles[index] ?? null,
    lab: labs[index] ?? null,
    position: positions[index],
  }));
  const articleHeightPx = getVisibleHeight(
    articlePositions,
    articleLayout.cardHeightPx,
  );
  const labHeightPx = getVisibleHeight(
    slots
      .filter(slot => slot.lab)
      .map(slot => slot.position),
    articleLayout.cardHeightPx,
  );
  const schedule = buildAbstractJournalLabFlipSchedule({
    positions,
    cardWidthPx: articleLayout.cardWidthPx,
    cardHeightPx: articleLayout.cardHeightPx,
    cellStrideX: articleLayout.cellStrideX,
    config: flipConfig,
  });

  return {
    slots,
    schedule,
    cardWidthPx: articleLayout.cardWidthPx,
    cardHeightPx: articleLayout.cardHeightPx,
    cellStrideX: articleLayout.cellStrideX,
    topPeekPx: articleLayout.topPeekPx,
    articleHeightPx,
    labHeightPx,
  };
}
