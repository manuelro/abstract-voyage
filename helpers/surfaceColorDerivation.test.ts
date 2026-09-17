import { describe, expect, it } from 'vitest';
import { colord } from 'colord';
import { resolveContrastAwareTextColor } from './surfaceColorDerivation';

describe('resolveContrastAwareTextColor light-ink tolerance', () => {
  it('keeps the strict dark decision by default on a light surface', () => {
    const color = resolveContrastAwareTextColor('#b8dff0', 4.5, 0, { stable: true });

    expect(colord(color).luminance()).toBeLessThan(colord('#b8dff0').luminance());
  });

  it('opts into a light candidate only when the configured tolerance permits it', () => {
    const color = resolveContrastAwareTextColor('#8fbed0', 4.5, 0, {
      stable: true,
      toleranceRatio: 3.5,
      preferredSide: 'light',
    });

    expect(colord(color).luminance()).toBeGreaterThan(colord('#8fbed0').luminance());
    expect(colord(color).contrast('#8fbed0')).toBeGreaterThanOrEqual(1.5);
  });
});
