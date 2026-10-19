import { describe, expect, it } from 'vitest';
import { DEFAULT_QUOTE_CONFIG, FEATURE_QUOTE_CONFIG, FEATURE_QUOTE_OVERRIDES, normalizeQuoteConfig } from './config';
import { quoteGradientDiagnostic, resolveQuoteRenderState, resolveQuoteSourceIndex } from './renderState';

describe('Quote render contract', () => {
  const input = { deckSize: 3, meshVisible: true, cssGradient: null };

  it('gives the featured role the base unified treatment', () => {
    expect(Object.keys(FEATURE_QUOTE_OVERRIDES).filter(key => key.startsWith('gradientInk'))).toEqual([]);
    expect(FEATURE_QUOTE_CONFIG.gradientInkOverlayOpacityPercent).toBe(DEFAULT_QUOTE_CONFIG.gradientInkOverlayOpacityPercent);
    expect(FEATURE_QUOTE_CONFIG.gradientInkTextColor).toBe(DEFAULT_QUOTE_CONFIG.gradientInkTextColor);
    const base = resolveQuoteRenderState(normalizeQuoteConfig(DEFAULT_QUOTE_CONFIG), input);
    const featured = resolveQuoteRenderState(normalizeQuoteConfig(FEATURE_QUOTE_CONFIG), input);
    expect(base.kind).toBe('unifiedInk');
    expect(featured.kind).toBe('unifiedInk');
    if (base.kind === 'unifiedInk' && featured.kind === 'unifiedInk') expect(featured.ink).toEqual(base.ink);
  });

  it('keeps the actual blend active at both surface opacity extremes', () => {
    for (const opacity of [0, 100]) {
      for (const mode of ['screen', 'multiply'] as const) {
        const state = resolveQuoteRenderState(normalizeQuoteConfig({
          gradientInkEnabled: true, gradientInkRenderMode: 'unified',
          gradientInkOverlayOpacityPercent: opacity, gradientInkBlendMode: mode,
        }), input);
        expect(state.kind).toBe('unifiedInk');
        if (state.kind === 'unifiedInk') expect(state.ink).toMatchObject({
          backgroundOpacity: opacity / 100, blendMode: mode, blendWhenTransparent: true,
        });
      }
    }
  });

  it('distinguishes a pending mesh from a ready mesh and an unavailable deck', () => {
    const config = normalizeQuoteConfig({ gradientInkEnabled: true, gradientInkRenderMode: 'unified' });
    const pending = resolveQuoteRenderState(config, { ...input, meshVisible: false });
    const missing = resolveQuoteRenderState(config, { ...input, deckSize: 0 });
    expect(quoteGradientDiagnostic(pending)).toBe('pending-mesh');
    expect(quoteGradientDiagnostic(missing)).toBe('unavailable');
    expect(quoteGradientDiagnostic(resolveQuoteRenderState(config, input))).toBe('active');
    expect(resolveQuoteSourceIndex('10', 3)).toBe(2);
    expect(resolveQuoteSourceIndex('1', 0)).toBe(-1);
  });

  it('uses CSS ink when supplied and a palette fallback when the source is unavailable', () => {
    const config = normalizeQuoteConfig({ gradientInkEnabled: true, gradientInkRenderMode: 'css', paletteBackgroundEnabled: true });
    expect(resolveQuoteRenderState(config, { deckSize: 0, meshVisible: false, cssGradient: 'linear-gradient(red, blue)' }))
      .toMatchObject({ kind: 'cssInk', gradient: 'linear-gradient(red, blue)' });
    expect(resolveQuoteRenderState(config, { deckSize: 0, meshVisible: false, cssGradient: null }))
      .toEqual({ kind: 'palette', gradientUnavailable: true });
  });
});
