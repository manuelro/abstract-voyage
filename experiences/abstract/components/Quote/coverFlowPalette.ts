import type { AbstractPostDockPaletteConfig } from '../AbstractPostDock/config/registered';
import { computeDeckChord } from '../../helpers/deckPalette';
import type { QuoteGradient } from './Quote';
import { colord, extend } from 'colord';
import a11yPlugin from 'colord/plugins/a11y';

extend([a11yPlugin]);

const toHex = (rgb: [number, number, number]) => `#${rgb.map(channel => (
  Math.round(channel).toString(16).padStart(2, '0')
)).join('')}`;

/** Keep the card's hue while moving any light ink into a readable register. */
function readableInk(color: string, surfaceColor: string): string {
  const ink = colord(color);
  if (ink.contrast(surfaceColor) >= 4.5) return color;
  // Leave room for the final HSL -> 8-bit hex rounding step.
  const targetContrast = 4.7;
  const { h, s, l } = ink.toHsl();
  const darkInk = colord(surfaceColor).luminance() > 0.18;
  let low = darkInk ? 0 : l;
  let high = darkInk ? l : 100;
  for (let step = 0; step < 18; step += 1) {
    const middle = (low + high) / 2;
    const candidate = colord({ h, s, l: middle });
    if ((candidate.contrast(surfaceColor) >= targetContrast) === darkInk) low = middle;
    else high = middle;
  }
  return colord({ h, s, l: darkInk ? low : high }).toHex();
}

/** Draws from the same directed chord and live palette config as CoverFlow. */
export function buildCoverFlowQuoteGradients(
  count: number,
  paletteConfig: AbstractPostDockPaletteConfig,
  surfaceColor = '#ffffff',
): QuoteGradient[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const chord = computeDeckChord(index, count, paletteConfig);
    return {
      dominant: readableInk(toHex(chord.dominant), surfaceColor),
      support: readableInk(toHex(chord.support), surfaceColor),
      counterpoint: readableInk(toHex(chord.counterpoint), surfaceColor),
    };
  });
}
