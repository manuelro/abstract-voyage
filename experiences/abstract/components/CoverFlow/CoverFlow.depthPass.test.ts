import { describe, expect, it } from 'vitest';
import { resolveDepthPassExitX, resolveDepthPassPose, resolveGoldenOvalArchPath, resolveGoldenOvalVisibility, type DepthPassGeometry } from './CoverFlow.depthPass';

const geometry: DepthPassGeometry = {
  pathMode: 'depth-pass',
  containerWidth: 1440,
  containerHeight: 810,
  cardWidth: 405,
  landingX: 470,
  centerGap: 220,
  stackSpacing: 180,
  stackSpacingGrowthPercent: 8,
  includesFirstNeighbor: true,
  depthPx: 100,
  depthIncrementPercent: 72,
  perspectivePx: 1200,
  perspectiveOriginXPercent: 50,
  perspectiveOriginYPercent: 50,
  waitingSign: -1,
  spacingPercent: 42,
  waitingShiftPx: 0,
  ovalConvergencePercent: 0,
  ovalHorizontalRadiusCards: 3,
  ovalDepthRadiusCards: 1,
  ovalViewAngleDeg: 30,
  ovalFocusAngleDeg: 40,
  ovalBackAngleDeg: 130,
  ovalExitAngleDeg: 10,
  ovalReachCards: 5,
  ovalDistributionMode: 'quarter',
  ovalBackDepthCards: 1.94,
  ovalArchDepthCards: 6.3,
  ovalArchSkew: 1.5,
  ovalFirstNeighborGapPercent: 42,
  ovalArcSpacingBend: 0.045,
  ovalHorizontalStretch: 1,
  ovalFarEdgePercent: 0,
  ovalDepthEase: 0,
  ovalSpacingPower: 1,
  yawDeg: 12,
  yawMaxDeg: 24,
  yawSpreadDepth: 5,
  maxProjectedWidthRatio: 1.05,
  arcBendPercent: 150,
  arcReachCards: 5,
  arcDropPx: 55,
  verticalOffsetPx: 33,
  exitScale: 1.8,
  exitClearancePercent: 8,
};

describe('CoverFlow depth pass geometry', () => {
  it('joins the waiting, focus, and exit paths without a velocity jump', () => {
    const h = 0.000001;
    for (const q of [0, 1]) {
      const before = resolveDepthPassPose(q - h, geometry);
      const at = resolveDepthPassPose(q, geometry);
      const after = resolveDepthPassPose(q + h, geometry);
      for (const key of ['x', 'y', 'z', 'rotateY'] as const) {
        expect(Math.abs((at[key] - before[key]) / h - (after[key] - at[key]) / h)).toBeLessThan(0.05);
      }
    }
    expect(resolveDepthPassPose(0, geometry)).toEqual({ x: geometry.landingX, y: geometry.verticalOffsetPx, z: 0, rotateY: 0 });
    expect(resolveDepthPassPose(1, geometry).z).toBeLessThan(0);
    expect(resolveDepthPassPose(-0.5, geometry).z).toBeGreaterThan(0);
  });

  it('clears the clip at the configured projected scale and clearance', () => {
    for (const waitingSign of [-1, 1] as const) {
      for (const exitScale of [1.1, 1.8, 2.5]) for (const exitClearancePercent of [0, 8, 30]) {
        const g = { ...geometry, waitingSign, exitScale, exitClearancePercent };
        const pose = resolveDepthPassPose(-1, g);
        expect(pose.x).toBe(resolveDepthPassExitX(g));
        const scale = g.perspectivePx / (g.perspectivePx - pose.z);
        expect(scale).toBeCloseTo(exitScale, 8);
        const origin = (g.perspectiveOriginXPercent / 100 - 0.5) * g.containerWidth;
        const projectedCenter = origin + (pose.x - origin) * scale;
        const projectedHalfWidth = g.cardWidth * scale / 2;
        const beyondEdge = -waitingSign * projectedCenter - projectedHalfWidth - g.containerWidth / 2;
        expect(beyondEdge).toBeGreaterThanOrEqual(
          g.cardWidth * scale * g.exitClearancePercent / 100 - 0.001,
        );
      }
    }
  });

  it('keeps the departing card moving toward its exit edge and parks it there', () => {
    const samples = Array.from({ length: 21 }, (_, i) => resolveDepthPassPose(-i / 20, geometry));
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i].x).toBeGreaterThanOrEqual(samples[i - 1].x);
      expect(samples[i].z).toBeGreaterThanOrEqual(samples[i - 1].z);
    }
    expect(resolveDepthPassPose(-2, geometry)).toEqual(resolveDepthPassPose(-1, geometry));
  });
});

describe('golden oval fit', () => {
  const golden = {
    ...geometry,
    pathMode: 'oval-pass' as const,
    ovalDistributionMode: 'full-arch' as const,
    ovalReachCards: 5,
    ovalBackDepthCards: 1.94,
    ovalArchDepthCards: 4,
    ovalArchSkew: 1.8,
    ovalDepthMinimumPositionPercent: 100,
    ovalGoldenRhythmEnabled: true,
    ovalGoldenSizeStep: 0.55,
    ovalGoldenSpacingStep: 0.35,
    ovalMinActiveGapPx: 12,
    ovalMinWaitingGapPx: 8,
    ovalFirstNeighborGapPercent: 22,
  };
  const projected = (q: number, g: DepthPassGeometry) => {
    const pose = resolveDepthPassPose(q, g);
    const scale = g.perspectivePx / (g.perspectivePx - pose.z);
    const origin = (g.perspectiveOriginXPercent / 100 - 0.5) * g.containerWidth;
    const center = g.containerWidth / 2 + origin + scale * (pose.x - origin);
    return { center, width: g.cardWidth * scale };
  };

  it('keeps the default left tail smallest and preserves ordered edge gaps at fractional positions', () => {
    for (const containerWidth of [1024, 1440, 1920, 2874]) {
      const base = { ...golden, containerWidth, landingX: containerWidth * 0.3 };
      const path = resolveGoldenOvalArchPath(base)!;
      const g = { ...base, ovalGoldenPath: path };
      for (let q = 0; q + 1 <= path.visibleReach; q += 0.05) {
        const near = projected(q, g);
        const far = projected(q + 1, g);
        const gap = near.center - far.center - (near.width + far.width) / 2;
        expect(gap).toBeGreaterThanOrEqual((q < 0.001 ? 12 : 8) - 0.5);
      }
      if (path.visibleReach > 0) {
        const far = projected(path.visibleReach, g);
        expect(far.center - far.width / 2).toBeGreaterThanOrEqual(11.9);
      }
      expect(resolveGoldenOvalVisibility(path.visibleReach + 1, g)).toBe(0);
    }
    const wide = { ...golden, containerWidth: 2874, landingX: 900 };
    const fitted = { ...wide, ovalGoldenPath: resolveGoldenOvalArchPath(wide)! };
    const sizes = Array.from({ length: 6 }, (_, q) => projected(q, fitted).width);
    expect(fitted.ovalGoldenPath.visibleReach).toBe(5);
    expect(sizes[0]).toBeGreaterThan(sizes[1]);
    expect(sizes[1]).toBeGreaterThan(sizes[2]);
    expect(sizes[2]).toBeGreaterThan(sizes[3]);
    expect(sizes[3]).toBeGreaterThan(sizes[4]);
    expect(sizes[4]).toBeGreaterThan(sizes[5]);
    expect(sizes[5] / sizes[0]).toBeGreaterThan(0.47);
    expect(sizes[5] / sizes[0]).toBeLessThan(0.54);
    expect(sizes[0] - sizes[1]).toBeGreaterThan(2 * (sizes[3] - sizes[4]));
    for (let q = 0.05; q <= 5; q += 0.05) {
      expect(projected(q, fitted).width).toBeLessThan(projected(q - 0.05, fitted).width);
    }
  });

  it('moves the smallest card to the configured point while retaining the depth arch', () => {
    const base = { ...golden, containerWidth: 2874, landingX: 900 };
    const middle = { ...base, ovalDepthMinimumPositionPercent: 60 };
    const g = { ...middle, ovalGoldenPath: resolveGoldenOvalArchPath(middle)! };
    const sizes = Array.from({ length: 6 }, (_, q) => projected(q, g).width);
    expect(sizes[3]).toBeLessThan(sizes[2]);
    expect(sizes[3]).toBeLessThan(sizes[4]);
    expect(sizes[4]).toBeLessThan(sizes[5]);
    expect(sizes[5]).toBeGreaterThan(sizes[3]);
    const early = { ...base, ovalDepthMinimumPositionPercent: 40 };
    const earlyPath = { ...early, ovalGoldenPath: resolveGoldenOvalArchPath(early)! };
    expect(projected(2, earlyPath).width).toBeLessThan(projected(1, earlyPath).width);
    expect(projected(2, earlyPath).width).toBeLessThan(projected(3, earlyPath).width);
  });

  it('retains the original full-arch depth when golden rhythm is disabled', () => {
    const legacy = { ...golden, ovalGoldenRhythmEnabled: false };
    const changedControl = { ...legacy, ovalDepthMinimumPositionPercent: 40 };
    expect(resolveDepthPassPose(3, legacy).z).toBeCloseTo(resolveDepthPassPose(3, changedControl).z, 8);
    expect(projected(3, legacy).width).toBeLessThan(projected(5, legacy).width);
  });

  it('fades the newly feasible far card in at the fit threshold', () => {
    const at = (width: number) => {
      const base = { ...golden, containerWidth: width, landingX: width * 0.3 };
      return { ...base, ovalGoldenPath: resolveGoldenOvalArchPath(base)! };
    };
    let low = 700;
    let high = 1800;
    for (let i = 0; i < 30; i += 1) {
      const middle = (low + high) / 2;
      if (at(middle).ovalGoldenPath.visibleReach >= 2) high = middle;
      else low = middle;
    }
    const before = at(low);
    const after = at(high);
    expect(before.ovalGoldenPath.visibleReach).toBe(1);
    expect(after.ovalGoldenPath.visibleReach).toBe(2);
    expect(resolveGoldenOvalVisibility(2, after)).toBeLessThan(0.001);
    for (const q of [0, 0.5, 1, 1.5]) {
      expect(Math.abs(projected(q, before).center - projected(q, after).center)).toBeLessThan(0.05);
    }
  });

  it('keeps configured clearances when the size, spacing, and waiting side change', () => {
    for (const waitingSign of [-1, 1] as const) {
      for (const [sizeStep, spacingStep, waitingGap, activeGap] of [
        [0, 0, 0, 0], [0.55, 0.35, 8, 12], [0.8, 1, 80, 80],
      ]) {
        const base = {
          ...golden, containerWidth: 1920,
          landingX: waitingSign === -1 ? 575 : -575,
          waitingSign,
          ovalGoldenSizeStep: sizeStep,
          ovalGoldenSpacingStep: spacingStep,
          ovalMinWaitingGapPx: waitingGap,
          ovalMinActiveGapPx: activeGap,
        };
        const g = { ...base, ovalGoldenPath: resolveGoldenOvalArchPath(base)! };
        for (let q = 0; q + 1 <= g.ovalGoldenPath.visibleReach; q += 0.05) {
          const near = projected(q, g);
          const far = projected(q + 1, g);
          const gap = Math.abs(near.center - far.center) - (near.width + far.width) / 2;
          expect(gap).toBeGreaterThanOrEqual((q < 0.001 ? activeGap : waitingGap) - 0.5);
        }
      }
    }
  });
});
