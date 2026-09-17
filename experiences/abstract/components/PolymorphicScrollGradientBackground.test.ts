import { describe, expect, it } from 'vitest';
import {
  buildEnhancedScrollGradient,
  buildLegacyScrollGradient,
  sampleScrollGradientColor,
  transformScrollGradientStops,
} from './PolymorphicScrollGradientBackground';

const stops = [
  { color: '#ffffff', at: 0 },
  { color: '#808080', at: 0.5 },
  { color: '#000000', at: 1 },
];

describe('PolymorphicScrollGradientBackground builders', () => {
  it('preserves the legacy gradient string exactly', () => {
    expect(buildLegacyScrollGradient(stops)).toBe(
      'radial-gradient(circle at 0% 0%, #ffffff 0%, #808080 500%, #000000 1000%)',
    );
  });

  it('builds a dense enhanced gradient at the configured focal point', () => {
    const gradient = buildEnhancedScrollGradient(
      stops, 16, 'oklab', 'right', 120, 1.5, 1, 100,
    );
    expect(gradient).toContain('ellipse 180% 120% at 100% 50%');
    expect(gradient.match(/rgb\(/g)).toHaveLength(16);
    expect(gradient).not.toContain('500%');
  });

  it('preserves the original stops and gradient exactly at neutral variant values', () => {
    const transformed = transformScrollGradientStops(stops, 1, 0);
    expect(transformed).toBe(stops);
    expect(buildLegacyScrollGradient(transformed)).toBe(buildLegacyScrollGradient(stops));
    expect(buildEnhancedScrollGradient(
      transformed, 16, 'oklab', 'left', 100, 1, 1, 100,
    )).toBe(buildEnhancedScrollGradient(
      stops, 16, 'oklab', 'left', 100, 1, 1, 100,
    ));
  });

  it('changes real stop colors without changing stop positions', () => {
    const colorfulStops = [
      { color: '#ff0000', at: 0 },
      { color: '#0000ff', at: 1 },
    ];
    const desaturated = transformScrollGradientStops(colorfulStops, 0, 0);
    const darkened = transformScrollGradientStops(colorfulStops, 1, 0.5);

    expect(desaturated.map(stop => stop.at)).toEqual([0, 1]);
    expect(darkened.map(stop => stop.at)).toEqual([0, 1]);
    expect(desaturated[0].color).toMatch(/^rgb\((\d+) \1 \1\)$/);
    expect(desaturated[1].color).toMatch(/^rgb\((\d+) \1 \1\)$/);
    expect(darkened.map(stop => stop.color)).not.toEqual(colorfulStops.map(stop => stop.color));
  });

  it('samples the same neutral gradient color at its focal point and applies the narrow variant', () => {
    const options = {
      focalHorizontal: 'left' as const,
      lightRadiusPercent: 128,
      lightAspectRatio: 1.05,
      lightFalloff: 0.95,
      extentPercent: 180,
      interpolation: 'oklab' as const,
    };
    expect(sampleScrollGradientColor(stops, options)).toBe(stops[0].color);
    expect(sampleScrollGradientColor(stops, { ...options, saturation: 1, darkness: 0 }))
      .toBe(stops[0].color);
    expect(sampleScrollGradientColor(stops, { ...options, saturation: 0, darkness: 0.5 }))
      .not.toBe(stops[0].color);
  });
});
