import { describe, expect, it } from 'vitest';
import {
  buildEnhancedScrollGradient,
  buildLegacyScrollGradient,
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
});
