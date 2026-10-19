import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_EDITORIAL_QUOTE_CONFIGS } from './editorialConfig';

describe('editorial quote theme persistence', () => {
  beforeEach(() => { window.localStorage.clear(); vi.resetModules(); });

  it('saves every per-type editorial control with its variant', async () => {
    const { saveQuoteTheme } = await import('./themes');
    saveQuoteTheme({ ...DEFAULT_EDITORIAL_QUOTE_CONFIGS.solid, headingEnabled: false, topRuleOpacityPercent: 71, solidBackgroundColor: '#123456', backgroundMode: 'solid' }, 'Wall solid', 'solid');
    const saved = JSON.parse(window.localStorage.getItem('quote-themes') || '{}');
    expect(saved['Wall solid']).toMatchObject({ schemaVersion: 2, variant: 'solid', config: {
      headingEnabled: false, topRuleOpacityPercent: 71,
      solidBackgroundColor: '#123456', backgroundMode: 'solid',
    } });
  });

  it('keeps an older base-only theme readable', async () => {
    window.localStorage.setItem('quote-themes', JSON.stringify({ Old: { name: 'Old', savedAt: 1, config: { text: 'Old quote' } } }));
    const { saveQuoteTheme } = await import('./themes');
    saveQuoteTheme(DEFAULT_EDITORIAL_QUOTE_CONFIGS.plain, 'New', 'plain');
    const saved = JSON.parse(window.localStorage.getItem('quote-themes') || '{}');
    expect(saved.Old).toMatchObject({ name: 'Old', variant: 'base', config: { text: 'Old quote' } });
    expect(saved.New.variant).toBe('plain');
  });
});
