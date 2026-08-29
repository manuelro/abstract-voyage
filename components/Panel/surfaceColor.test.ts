import { colord } from 'colord';
import { describe, expect, it } from 'vitest';
import { resolvePanelSurface } from './surfaceColor';

const baseOptions = {
  sourceColor: '#ff0000',
  underlayColor: '#ff0000',
  originalHueRetention: 0,
  hueShiftDegrees: 0,
  pigmentIntensity: 1,
  darkBackgroundDarkenRatio: 0,
  lightBackgroundDarkenRatio: 0,
  opacity: 1,
};

describe('PanelShell surface color resolution', () => {
  it('rotates hue in either signed direction and wraps around the spectrum', () => {
    const positive = resolvePanelSurface({ ...baseOptions, hueShiftDegrees: 120 });
    const negative = resolvePanelSurface({ ...baseOptions, hueShiftDegrees: -120 });

    expect(colord(positive?.transformedColor ?? '').toHsl().h).toBe(120);
    expect(colord(negative?.transformedColor ?? '').toHsl().h).toBe(240);
  });

  it('interpolates circular hue movement through original-hue retention', () => {
    const partiallyRetained = resolvePanelSurface({
      ...baseOptions,
      originalHueRetention: 0.5,
      hueShiftDegrees: 120,
    });
    const fullyRetained = resolvePanelSurface({
      ...baseOptions,
      originalHueRetention: 1,
      hueShiftDegrees: 120,
    });

    expect(colord(partiallyRetained?.transformedColor ?? '').toHsl().h).toBe(60);
    expect(fullyRetained?.transformedColor).toBe('#ff0000');
  });

  it('does not invent chroma when shifting an achromatic source', () => {
    const neutral = resolvePanelSurface({
      ...baseOptions,
      sourceColor: '#808080',
      underlayColor: '#808080',
      hueShiftDegrees: 150,
    });

    expect(neutral?.transformedColor).toBe('#808080');
  });

  it('scales pigment without changing an already resolved hue', () => {
    const neutralized = resolvePanelSurface({
      ...baseOptions,
      pigmentIntensity: 0,
    });
    const intensified = resolvePanelSurface({
      ...baseOptions,
      sourceColor: '#804040',
      underlayColor: '#804040',
      pigmentIntensity: 2,
    });

    expect(colord(neutralized?.transformedColor ?? '').toHsl().s).toBe(0);
    expect(colord(intensified?.transformedColor ?? '').toHsl().s).toBeGreaterThan(33);
  });

  it('keeps translucent paint separate from its effective contrast surface', () => {
    const translucent = resolvePanelSurface({
      ...baseOptions,
      underlayColor: '#0000ff',
      opacity: 0.5,
    });

    expect(translucent?.paintColor).toBe('rgba(255, 0, 0, 0.5)');
    expect(translucent?.effectiveColor).toBe('#800080');
  });

  it('uses independent relative darkening for dark and light sources', () => {
    const dark = resolvePanelSurface({
      ...baseOptions,
      sourceColor: '#121321',
      underlayColor: '#121321',
      darkBackgroundDarkenRatio: 0.06,
    });
    const light = resolvePanelSurface({
      ...baseOptions,
      sourceColor: '#eeeeee',
      underlayColor: '#eeeeee',
      lightBackgroundDarkenRatio: 0.1,
    });

    expect(dark?.transformedColor).toBe('#11121f');
    expect(light?.transformedColor).toBe('#d6d6d6');
  });
});
