import {
  computeDeckChord,
  deckChordCss,
  deckWindowHueOffset,
  rotateRgbHue,
} from '../../helpers/deckPalette';
import type { AbstractPostDockPaletteConfig } from '../AbstractPostDock/config/registered';

/**
 * Relocated from pages/about.tsx (formerly `resolveAboutAccent`) —
 * `SplitColumnLayout`'s `colorSource: 'palette'` consumer (currently only
 * `/about`) reads AbstractPostDockPaletteConfig directly through the same
 * pure functions the dock's own WebGL pipeline is built on
 * (experiences/abstract/helpers/deckPalette.ts) to produce one flat color —
 * the dock's own slides get the real dynamic gradient
 * (LiquidGradientAdapter, minimalModeGradientEnabled) and don't call this.
 */
export function resolveSplitColumnAccent(
  index: number,
  count: number,
  config: AbstractPostDockPaletteConfig,
): string {
  if (!config.enabled) {
    // Legacy fallback — byte-identical to the formula this page used before
    // the palette was wired in, so disabling the palette never breaks it.
    return `hsl(${150 + index * 23} 88% 72%)`;
  }
  if (config.mode === 'chord') {
    const chord = computeDeckChord(index, count, config);
    return deckChordCss(chord).dominant;
  }
  // 'window' mode has no direct flat-color formula of its own (it drives the
  // shader's rainbow field, not a single resolvable color) — approximate it
  // with the same hue-rotation parameter (hueSpread) plus the palette's own
  // saturation/brightness master bus, rather than leaving window mode inert.
  const hueDeg = 150 + deckWindowHueOffset(index, count, config.hueSpread) * 360;
  const saturationPct = Math.round(Math.min(1, Math.max(0, config.masterSaturation)) * 100);
  const lightnessPct = Math.round(Math.min(1, Math.max(0.5, config.masterBrightness)) * 72);
  return `hsl(${hueDeg} ${saturationPct}% ${lightnessPct}%)`;
}

// resolveSplitColumnAccent's own output is either `rgb(r, g, b)` (chord mode)
// or `hsl(h s% l%)` (window/legacy mode) — parses either into an RGB triplet
// so complementCssColor below can hand it to the same OKLab rotation
// deckPalette.ts's own chord math already uses, regardless of which mode
// produced the color.
export function parseCssColorToRgb(css: string): [number, number, number] {
  const rgbMatch = css.match(/^rgb\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  }
  const hslMatch = css.match(/^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/i);
  if (hslMatch) {
    return hslToRgb(Number(hslMatch[1]), Number(hslMatch[2]) / 100, Number(hslMatch[3]) / 100);
  }
  return [0, 0, 0];
}

// Standard HSL → RGB (h in degrees, s/l as 0..1 fractions).
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] = hue < 60 ? [c, x, 0]
    : hue < 120 ? [x, c, 0]
    : hue < 180 ? [0, c, x]
    : hue < 240 ? [0, x, c]
    : hue < 300 ? [x, 0, c]
    : [c, 0, x];
  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

/**
 * The nav split-background's own two colors are complements: nav-left
 * complements the panel color, nav-right complements nav-left. Reuses the
 * same OKLab hue-rotation primitive (rotateRgbHue, from deckPalette.ts)
 * computeDeckChord's own "counterpoint" voice is built on — one color-math
 * implementation, not two.
 */
export function complementCssColor(css: string, degrees = 180): string {
  const [r, g, b] = rotateRgbHue(parseCssColorToRgb(css), degrees);
  return `rgb(${r}, ${g}, ${b})`;
}
