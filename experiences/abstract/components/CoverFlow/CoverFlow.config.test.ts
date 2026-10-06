import { describe, expect, it } from 'vitest';
import {
  capCoverFlowCardSize,
  DEFAULT_COVER_FLOW_CONFIG,
  normalizeCoverFlowConfig,
} from './CoverFlow.config';
import { COVER_FLOW_PANEL } from './CoverFlow.panel';

describe('CoverFlow breakpoint card height cap', () => {
  it('exposes independent mobile, tablet, and desktop fields in the geometry panel', () => {
    const tabsField = COVER_FLOW_PANEL.fields.find(field => field.kind === 'tabs');
    expect(tabsField?.kind).toBe('tabs');
    if (tabsField?.kind !== 'tabs') return;
    expect(tabsField.tabs.map(tab => tab.fields.map(field => 'key' in field ? field.key : undefined))).toEqual([
      ['cardDistanceRatio', 'cardWidthRatio', 'maxCardHeightPx', 'activeCardLandingMode', 'activeCardLandingXPercent', 'rotationMaxDeg', 'rotationDistanceGrowthPercent', 'stackSpacingToCenterGapRatio', 'stackSpacingGrowthPercent'],
      ['cardDistanceRatioMd', 'cardWidthRatioMd', 'maxCardHeightPxMd', 'activeCardLandingModeMd', 'activeCardLandingXPercentMd', 'alignActiveCardRightToMainNavMd', 'alignToVisibleViewportCenterMd', 'rotationMaxDegMd', 'rotationDistanceGrowthPercentMd', 'stackSpacingToCenterGapRatioMd', 'stackSpacingGrowthPercentMd'],
      ['cardDistanceRatioLg', 'cardWidthRatioLg', 'maxCardHeightPxLg', 'activeCardLandingModeLg', 'activeCardLandingXPercentLg', 'alignActiveCardRightToMainNavLg', 'alignToVisibleViewportCenterLg', 'rotationMaxDegLg', 'rotationDistanceGrowthPercentLg', 'stackSpacingToCenterGapRatioLg', 'stackSpacingGrowthPercentLg'],
    ]);
  });

  it('caps tablet by default without changing mobile and desktop defaults', () => {
    const config = normalizeCoverFlowConfig(DEFAULT_COVER_FLOW_CONFIG);
    expect(config.maxCardHeightPx).toBe(DEFAULT_COVER_FLOW_CONFIG.maxCardHeightPx);
    expect(config.maxCardHeightPxMd).toBe(DEFAULT_COVER_FLOW_CONFIG.maxCardHeightPxMd);
    expect(config.maxCardHeightPxLg).toBe(DEFAULT_COVER_FLOW_CONFIG.maxCardHeightPxLg);
    expect(normalizeCoverFlowConfig({ maxCardHeightPxMd: 9999 }).maxCardHeightPxMd).toBe(2400);
    expect(normalizeCoverFlowConfig({ maxCardHeightPxMd: -1 }).maxCardHeightPxMd).toBe(0);
  });

  it('reduces width proportionally and leaves uncapped cards alone', () => {
    expect(capCoverFlowCardSize(800, 4 / 3, 760)).toEqual({ width: 570, height: 760 });
    expect(capCoverFlowCardSize(400, 4 / 3, 760)).toEqual({ width: 400, height: 400 * (4 / 3) });
    expect(capCoverFlowCardSize(800, 4 / 3, 0)).toEqual({ width: 800, height: 800 * (4 / 3) });
  });
});

// PLAN-COVERFLOW-ACTIVE-CARD-LANDING-POSITION.md
describe('CoverFlow active card landing position', () => {
  it('keeps main-nav right alignment opt-in and tiered', () => {
    const defaultConfig = normalizeCoverFlowConfig(DEFAULT_COVER_FLOW_CONFIG);
    expect(defaultConfig.alignActiveCardRightToMainNavMd)
      .toBe(DEFAULT_COVER_FLOW_CONFIG.alignActiveCardRightToMainNavMd);
    expect(defaultConfig.alignActiveCardRightToMainNavLg)
      .toBe(DEFAULT_COVER_FLOW_CONFIG.alignActiveCardRightToMainNavLg);

    const enabled = normalizeCoverFlowConfig({ alignActiveCardRightToMainNavMd: true });
    expect(enabled.alignActiveCardRightToMainNavMd).toBe(true);
    expect(enabled.alignActiveCardRightToMainNavLg)
      .toBe(DEFAULT_COVER_FLOW_CONFIG.alignActiveCardRightToMainNavLg);
  });

  it('keeps visible-viewport centering opt-in', () => {
    const defaultConfig = normalizeCoverFlowConfig({});
    expect(defaultConfig.alignToVisibleViewportCenterMd)
      .toBe(DEFAULT_COVER_FLOW_CONFIG.alignToVisibleViewportCenterMd);
    expect(defaultConfig.alignToVisibleViewportCenterLg)
      .toBe(DEFAULT_COVER_FLOW_CONFIG.alignToVisibleViewportCenterLg);
    const enabled = normalizeCoverFlowConfig({
      alignToVisibleViewportCenterMd: true,
      alignToVisibleViewportCenterLg: false,
    });
    expect(enabled.alignToVisibleViewportCenterMd).toBe(true);
    expect(enabled.alignToVisibleViewportCenterLg).toBe(false);
  });

  it('normalizing the checked-in defaults is a no-op (idempotent)', () => {
    const config = normalizeCoverFlowConfig(DEFAULT_COVER_FLOW_CONFIG);
    expect(config.activeCardLandingMode).toBe(DEFAULT_COVER_FLOW_CONFIG.activeCardLandingMode);
    expect(config.activeCardLandingModeMd).toBe(DEFAULT_COVER_FLOW_CONFIG.activeCardLandingModeMd);
    expect(config.activeCardLandingModeLg).toBe(DEFAULT_COVER_FLOW_CONFIG.activeCardLandingModeLg);
    expect(config.activeCardLandingXPercent).toBe(DEFAULT_COVER_FLOW_CONFIG.activeCardLandingXPercent);
    expect(config.activeCardLandingXPercentMd).toBe(DEFAULT_COVER_FLOW_CONFIG.activeCardLandingXPercentMd);
    expect(config.activeCardLandingXPercentLg).toBe(DEFAULT_COVER_FLOW_CONFIG.activeCardLandingXPercentLg);
  });

  it('normalizes each tier independently, falling back to that tier\'s own default', () => {
    const config = normalizeCoverFlowConfig({
      activeCardLandingMode: 'anchorShift',
      activeCardLandingModeMd: 'not-a-real-mode' as never,
      activeCardLandingXPercent: 150,
      activeCardLandingXPercentMd: -10,
    });
    expect(config.activeCardLandingMode).toBe('anchorShift');
    // An invalid Md value falls back to THIS tier's own checked-in default
    // (whatever that currently is), never to the base tier's 'anchorShift'
    // above or a hardcoded literal — that independence is what's under test.
    expect(config.activeCardLandingModeMd).toBe(DEFAULT_COVER_FLOW_CONFIG.activeCardLandingModeMd);
    expect(config.activeCardLandingModeLg).toBe(DEFAULT_COVER_FLOW_CONFIG.activeCardLandingModeLg);
    expect(config.activeCardLandingXPercent).toBe(100);
    expect(config.activeCardLandingXPercentMd).toBe(0);
  });

  it('accepts activeOnly independently of anchorShift at another tier', () => {
    const config = normalizeCoverFlowConfig({
      activeCardLandingModeLg: 'activeOnly',
      activeCardLandingXPercentLg: 65,
    });
    expect(config.activeCardLandingMode).toBe('center');
    expect(config.activeCardLandingModeLg).toBe('activeOnly');
    expect(config.activeCardLandingXPercentLg).toBe(65);
  });
});

/** Standalone reimplementation of CoverFlowItemInner's own `x` formula
 * (CoverFlow.tsx), so the three-way landing-mode branch can be verified
 * without mounting framer-motion. Must be kept in sync with that function. */
function resolveCardX(
  pos: number,
  centerGap: number,
  stackSpacing: number,
  landingMode: 'center' | 'anchorShift' | 'activeOnly',
  offsetPx: number,
): number {
  const absPos = Math.abs(pos);
  const base = absPos < 1
    ? pos * centerGap
    : pos < 0
      ? -centerGap - (absPos - 1) * stackSpacing
      : centerGap + (absPos - 1) * stackSpacing;

  if (landingMode === 'anchorShift') return base + offsetPx;
  if (landingMode === 'activeOnly' && absPos < 1) {
    return base + offsetPx * (1 - absPos);
  }
  return base;
}

describe('CoverFlow active card landing geometry', () => {
  const centerGap = 400;
  const stackSpacing = 800;

  it('is byte-identical to the base formula when mode is center, regardless of offset', () => {
    for (const pos of [0, 0.5, 1, 2, -1, -2.5]) {
      const base = resolveCardX(pos, centerGap, stackSpacing, 'anchorShift', 0);
      expect(resolveCardX(pos, centerGap, stackSpacing, 'center', 999)).toBe(base);
    }
  });

  it('anchorShift moves every card by the same constant', () => {
    const offsetPx = 120;
    for (const pos of [0, 0.5, 1, 2, -1, -2.5]) {
      const base = resolveCardX(pos, centerGap, stackSpacing, 'center', 0);
      expect(resolveCardX(pos, centerGap, stackSpacing, 'anchorShift', offsetPx)).toBe(base + offsetPx);
    }
  });

  it('activeOnly lands the active card exactly at the offset and tapers to zero by the first neighbour', () => {
    const offsetPx = 120;
    expect(resolveCardX(0, centerGap, stackSpacing, 'activeOnly', offsetPx)).toBe(offsetPx);
    expect(resolveCardX(1, centerGap, stackSpacing, 'activeOnly', offsetPx)).toBe(centerGap);
    expect(resolveCardX(-1, centerGap, stackSpacing, 'activeOnly', offsetPx)).toBe(-centerGap);
  });

  it('activeOnly leaves every card at |pos| >= 1 byte-identical to the base formula, for any offset', () => {
    for (const offsetPx of [-300, -50, 50, 300]) {
      for (const pos of [1, 1.5, 2, -1, -1.5, -2]) {
        const base = resolveCardX(pos, centerGap, stackSpacing, 'center', 0);
        expect(resolveCardX(pos, centerGap, stackSpacing, 'activeOnly', offsetPx)).toBe(base);
      }
    }
  });
});
