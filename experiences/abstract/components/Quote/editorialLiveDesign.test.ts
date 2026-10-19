import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_EDITORIAL_QUOTE_CONFIGS } from './editorialConfig';

describe('live editorial quote designs', () => {
  beforeEach(() => { vi.resetModules(); });

  it('updates one variant without changing the other two', async () => {
    const { setEditorialQuoteDesign, getEditorialQuoteDesigns } = await import('./editorialLiveDesign');
    setEditorialQuoteDesign('solid', { ...DEFAULT_EDITORIAL_QUOTE_CONFIGS.solid, solidBackgroundColor: '#123456', headingEnabled: false });
    const designs = getEditorialQuoteDesigns();
    expect(designs.solid).toMatchObject({ solidBackgroundColor: '#123456', headingEnabled: false });
    expect(designs.plain).toEqual(DEFAULT_EDITORIAL_QUOTE_CONFIGS.plain);
    expect(designs.featured).toEqual(DEFAULT_EDITORIAL_QUOTE_CONFIGS.featured);
  });

  it('starts fresh from defaults on every module reload (no persistence across reloads)', async () => {
    const first = await import('./editorialLiveDesign');
    const alternateBlend = DEFAULT_EDITORIAL_QUOTE_CONFIGS.featured.gradientInkBlendMode === 'multiply' ? 'screen' : 'multiply';
    first.setEditorialQuoteDesign('featured', { ...DEFAULT_EDITORIAL_QUOTE_CONFIGS.featured,
      gradientInkOverlayOpacityPercent: 20, gradientInkBlendMode: alternateBlend });
    vi.resetModules();
    const reloaded = await import('./editorialLiveDesign');
    expect(reloaded.getEditorialQuoteDesigns().featured).toEqual(DEFAULT_EDITORIAL_QUOTE_CONFIGS.featured);
  });
});
