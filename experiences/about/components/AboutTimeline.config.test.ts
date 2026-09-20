import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ABOUT_TIMELINE_CONFIG,
  normalizeAboutTimelineConfig,
} from './AboutTimeline.config';

describe('AboutTimeline introduction config', () => {
  it('makes the shared timeline intro available by default', () => {
    expect(DEFAULT_ABOUT_TIMELINE_CONFIG.introEnabled).toBe(true);
  });

  it('normalizes configurable stagger timing to its authored safety bounds', () => {
    const normalized = normalizeAboutTimelineConfig({
      introEnabled: true,
      introDelayMs: -1,
      introDurationMs: 9_999,
      introEasing: 'not-an-easing' as never,
      introItemStaggerMs: 9_999,
      introItemOverlapMs: 9_999,
    });

    expect(normalized).toMatchObject({
      introEnabled: true,
      introDelayMs: 0,
      introDurationMs: 2_000,
      introEasing: DEFAULT_ABOUT_TIMELINE_CONFIG.introEasing,
      introItemStaggerMs: 500,
      introItemOverlapMs: 2_000,
    });
  });
});
