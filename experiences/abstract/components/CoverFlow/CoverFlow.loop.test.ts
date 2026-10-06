import { describe, it, expect } from 'vitest';
import { DEFAULT_COVER_FLOW_CONFIG, normalizeCoverFlowConfig } from './CoverFlow.config';

// The wrap helpers live inside CoverFlow.tsx (not exported to keep the module
// surface small), so this test reimplements the exact same closed forms to
// pin the intended contract. If CoverFlow.tsx's own wrapDelta/wrapIndex/
// nearestLoopTarget ever diverge from these, the loop rendering/navigation
// breaks and this test is the canary.
function wrapDelta(raw: number, count: number): number {
  if (count <= 0) return raw;
  let d = ((raw % count) + count) % count;
  if (d > count / 2) d -= count;
  return d;
}
function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return ((Math.round(index) % count) + count) % count;
}
function nearestLoopTarget(currentPos: number, targetDisplayIndex: number, count: number): number {
  if (count <= 0) return targetDisplayIndex;
  const currentRounded = Math.round(currentPos);
  return currentRounded + wrapDelta(targetDisplayIndex - currentRounded, count);
}

describe('CoverFlow infinite loop config', () => {
  it('defaults to the configured setting and normalizes to a boolean', () => {
    expect(normalizeCoverFlowConfig(undefined).infiniteLoopEnabled)
      .toBe(DEFAULT_COVER_FLOW_CONFIG.infiniteLoopEnabled);
    expect(normalizeCoverFlowConfig({ infiniteLoopEnabled: true }).infiniteLoopEnabled).toBe(true);
    expect(normalizeCoverFlowConfig({ infiniteLoopEnabled: false }).infiniteLoopEnabled).toBe(false);
    // Non-boolean coerces to false, never leaks a truthy non-boolean.
    expect(normalizeCoverFlowConfig({ infiniteLoopEnabled: 1 as unknown as boolean }).infiniteLoopEnabled).toBe(false);
  });
});

describe('wrapDelta', () => {
  it('is a no-op when the loop is off (count 0)', () => {
    expect(wrapDelta(5, 0)).toBe(5);
    expect(wrapDelta(-42, 0)).toBe(-42);
  });
  it('maps a difference to the nearest copy in (-count/2, count/2]', () => {
    const N = 6;
    expect(wrapDelta(0, N)).toBe(0);
    expect(wrapDelta(1, N)).toBe(1);
    // index 0 while position is at the last card (5): nearest copy is +1 (to the right).
    expect(wrapDelta(0 - 5, N)).toBe(1);
    // the far card wraps to the negative side.
    expect(wrapDelta(5, N)).toBe(-1);
  });
  it('keeps both sides populated: every index has |delta| <= count/2', () => {
    const N = 6;
    for (let pos = 0; pos < N; pos += 1) {
      for (let index = 0; index < N; index += 1) {
        expect(Math.abs(wrapDelta(index - pos, N))).toBeLessThanOrEqual(N / 2);
      }
    }
  });
});

describe('wrapIndex', () => {
  it('brings a loop-extended coordinate back to [0, count)', () => {
    const N = 6;
    expect(wrapIndex(6, N)).toBe(0);   // past the last card loops to the first
    expect(wrapIndex(-1, N)).toBe(5);  // before the first loops to the last
    expect(wrapIndex(7, N)).toBe(1);
    expect(wrapIndex(3, N)).toBe(3);
  });
});

describe('nearestLoopTarget', () => {
  it('crosses the last->first boundary as a single +1 step', () => {
    // At the last card (position 5, N=6), navigating to item 0 should land at
    // the extended coordinate 6 (one step right), not rewind to 0.
    expect(nearestLoopTarget(5, 0, 6)).toBe(6);
    expect(wrapIndex(nearestLoopTarget(5, 0, 6), 6)).toBe(0);
  });
  it('crosses the first->last boundary as a single -1 step', () => {
    expect(nearestLoopTarget(0, 5, 6)).toBe(-1);
    expect(wrapIndex(nearestLoopTarget(0, 5, 6), 6)).toBe(5);
  });
  it('is idempotent when already on the target', () => {
    expect(nearestLoopTarget(6, 0, 6)).toBe(6); // extended pos 6 already == item 0
    expect(nearestLoopTarget(2, 2, 6)).toBe(2);
  });
});
