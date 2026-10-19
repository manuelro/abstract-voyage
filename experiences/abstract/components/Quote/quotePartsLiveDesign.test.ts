import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('shared quote parts live design', () => {
  beforeEach(() => { vi.resetModules(); });

  it('updates heading without touching the link', async () => {
    const { setQuoteHeadingAppearance, getQuotePartsDesign } = await import('./quotePartsLiveDesign');
    const { DEFAULT_QUOTE_HEADING_APPEARANCE, DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE } = await import('./quotePartsConfig');
    setQuoteHeadingAppearance({ ...DEFAULT_QUOTE_HEADING_APPEARANCE, color: '#abcabc', colorMode: 'custom', opacityPercent: 35 });
    const design = getQuotePartsDesign();
    expect(design.heading).toMatchObject({ color: '#abcabc', opacityPercent: 35 });
    // link retains its default, unaffected by the heading edit
    expect(design.link).toEqual(DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE);
  });

  it('updates both heading font controls as one shared appearance', async () => {
    const { setQuoteHeadingAppearance, getQuotePartsDesign } = await import('./quotePartsLiveDesign');
    const { DEFAULT_QUOTE_HEADING_APPEARANCE } = await import('./quotePartsConfig');
    setQuoteHeadingAppearance({ ...DEFAULT_QUOTE_HEADING_APPEARANCE,
      fontFamily: 'font-serif', fontWeight: 'font-black' });
    expect(getQuotePartsDesign().heading).toMatchObject({ fontFamily: 'font-serif', fontWeight: 'font-black' });
  });

  it('starts fresh from defaults on every module reload (no persistence across reloads)', async () => {
    const first = await import('./quotePartsLiveDesign');
    const { DEFAULT_QUOTE_HEADING_APPEARANCE } = await import('./quotePartsConfig');
    first.setQuoteHeadingAppearance({ ...DEFAULT_QUOTE_HEADING_APPEARANCE, color: '#aa11bb' });
    vi.resetModules();
    const reloaded = await import('./quotePartsLiveDesign');
    expect(reloaded.getQuotePartsDesign().heading.color).toBe(DEFAULT_QUOTE_HEADING_APPEARANCE.color);
  });
});
