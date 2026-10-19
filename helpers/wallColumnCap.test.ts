import { describe, expect, it } from 'vitest';
import { applyWallColumnCapToYaml } from './wallColumnCap';

describe('wall column cap YAML update', () => {
  const source = '---\n# Keep wall copy intact\nlayout:\n  maxColumnWidthPx: 320\n\nentries:\n  - kind: article\n    title: Example\n---\n';

  it('changes only the authored cap', () => {
    expect(applyWallColumnCapToYaml(source, 365)).toBe(source.replace('maxColumnWidthPx: 320', 'maxColumnWidthPx: 365'));
  });

  it('rejects invalid values and missing layout keys', () => {
    expect(() => applyWallColumnCapToYaml(source, 801)).toThrow();
    expect(() => applyWallColumnCapToYaml('---\nentries: []\n---\n', 365)).toThrow();
  });
});
