import { describe, expect, it } from 'vitest';
import { normalizePolymorphicLayoutConfig } from '../experiences/abstract/components/PolymorphicLayout.config';
import { ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG } from './abstract.config';
import { ABSTRACT_POLYMORPHIC_LAYOUT_PANEL } from './abstract.panel';
import {
  DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG,
  normalizeAbstractNarrowColumnStackConfig,
} from './abstract.config';
import { resolveWideColumnOrderClassName } from '../experiences/abstract/components/SplitColumnLayout';

describe('Abstract tablet composition', () => {
  const config = normalizePolymorphicLayoutConfig(ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG);

  it('edits the real Polymorphic Layout scope and mirrors the tablet composition onto desktop', () => {
    expect(ABSTRACT_POLYMORPHIC_LAYOUT_PANEL.defaultValue).toBe(ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG);
    expect(config.narrowColumnWidthTierMd).toBe('stacked');
    expect(config.splitBandWidthTierWide).toBe('stacked');
    expect(config.headerScrollBehaviorWide).toBe('static');
    expect(config.narrowColumnClearsFloatingHeaderWide).toBe(false);
    expect(config.wideColumnTransparentWide).toBe(true);
    expect(config.stackedColumnOrderWide).toBe('wideFirst');
    expect(config.stackedViewportPartitionEnabledWide).toBe(true);
    expect(config.stackedWideColumnViewportPercentWide).toBe(62);
    // Desktop (Lg) now reuses the exact same stacked composition as tablet
    // (Wide) — narrowColumnWidthTierLg is no longer left at the shared
    // config's classic 38/62 split, and every structural/alignment field
    // mirrors its Wide counterpart so the two tiers render identically,
    // just at a wider canvas.
    expect(config.narrowColumnWidthTierLg).toBe('stacked');
    expect(config.splitBandWidthTierLg).toBe('stacked');
    expect(config.headerScrollBehaviorLg).toBe('static');
    expect(config.narrowColumnClearsFloatingHeaderLg).toBe(false);
    expect(config.stackedViewportPartitionEnabledLg).toBe(true);
    expect(config.stackedWideColumnViewportPercentLg).toBe(62);
  });

  it('keeps tablet ordering independent from the mobile order and restores grid order at desktop', () => {
    expect(resolveWideColumnOrderClassName('wideFirst', 'narrowFirst', 'stacked', '38/62'))
      .toBe('order-first md:order-none lg:order-none');
    expect(resolveWideColumnOrderClassName('narrowFirst', 'wideFirst', 'stacked', '38/62'))
      .toBe('md:order-first lg:order-none');
  });

  it('normalizes the page-owned tablet pair independently of mobile and desktop regions', () => {
    expect(normalizeAbstractNarrowColumnStackConfig({
      tabletFlow: 'horizontal',
      tabletRegionOrder: 'timelineFirst',
      tabletHeroWeight: 2,
      tabletTimelineWeight: 1,
      tabletHeroVerticalAlign: 'end',
      tabletTimelineVerticalAlign: 'end',
    })).toMatchObject({
      tabletFlow: 'horizontal',
      tabletRegionOrder: 'timelineFirst',
      tabletHeroWeight: 2,
      tabletTimelineWeight: 1,
    });
    expect(DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG).toMatchObject({
      tabletFlow: 'horizontal', tabletRegionOrder: 'heroFirst',
      tabletHeroVerticalAlign: 'start', tabletTimelineVerticalAlign: 'start',
      tabletPairVerticalAlign: 'stretch',
    });
  });

  it('bounds the one authoritative tablet viewport share and derives its complement at render time', () => {
    expect(normalizePolymorphicLayoutConfig({
      ...ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG,
      stackedViewportPartitionEnabledWide: true,
      stackedWideColumnViewportPercentWide: 1,
    }).stackedWideColumnViewportPercentWide).toBe(10);
    expect(normalizePolymorphicLayoutConfig({
      ...ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG,
      stackedViewportPartitionEnabledWide: true,
      stackedWideColumnViewportPercentWide: 99,
    }).stackedWideColumnViewportPercentWide).toBe(90);
  });

  it('leaves the bounded narrow content free of a configured height floor', () => {
    // The viewport content mode is disabled by PolymorphicLayout while
    // columns stack; tablet alignment can still be tuned independently.
    expect(config.narrowColumnContentContainer).toBe('bounded');
    expect(config.narrowColumnContentHeight).toBe('viewport');
    expect(config.narrowColumnContentMinHeight).toBe('min-h-0');
  });

  it('keeps mobile and tablet scroll-gradient fields type-compatible', () => {
    const values = config as unknown as Record<string, unknown>;
    const pairs = Object.keys(values)
      .filter(key => key.startsWith('scrollGradient') && !key.endsWith('Wide') && !key.endsWith('Lg'))
      .filter(key => Object.hasOwn(values, `${key}Wide`));
    expect(pairs.length).toBeGreaterThan(30);
    for (const key of pairs) {
      expect(typeof values[`${key}Wide`], `${key}Wide`).toBe(typeof values[key]);
    }
  });
});
