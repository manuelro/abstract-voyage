import { colord } from 'colord';
import { computeDeckChord } from '../../helpers/deckPalette';
import type { AbstractPostDockPaletteConfig } from '../AbstractPostDock/config/registered';
import { buildQuoteCssInkGradient, type QuoteConfig } from './config';
import { resolveQuoteSourceIndex } from './renderState';

/** The same provisional CSS ink used by the quote and its authoring preview. */
export function resolveQuoteCssInkFallback(
  config: Pick<QuoteConfig,
    'gradientInkSourceCard' | 'gradientInkCssAngleDegrees' | 'gradientInkMeshSaturationPercent'
    | 'gradientInkMeshDarkeningPercent' | 'gradientInkMeshLighteningPercent'
    | 'gradientInkMeshScale' | 'gradientInkMeshScaleX' | 'gradientInkMeshScaleY'>,
  cardCount: number,
  paletteConfig?: AbstractPostDockPaletteConfig,
): { gradient: string; backgroundSize: string } | null {
  if (!paletteConfig || cardCount < 1) return null;
  const index = resolveQuoteSourceIndex(config.gradientInkSourceCard, cardCount);
  const chord = computeDeckChord(index, cardCount, paletteConfig);
  const gradient = buildQuoteCssInkGradient(
    [chord.dominant, chord.support, chord.counterpoint]
      .map(([r, g, b]) => colord({ r, g, b }).toHex()),
    config.gradientInkCssAngleDegrees,
    config.gradientInkMeshSaturationPercent,
    config.gradientInkMeshDarkeningPercent,
    config.gradientInkMeshLighteningPercent,
  );
  return gradient ? {
    gradient,
    backgroundSize: `${Math.round(config.gradientInkMeshScale * config.gradientInkMeshScaleX * 100)}% ${Math.round(config.gradientInkMeshScale * config.gradientInkMeshScaleY * 100)}%`,
  } : null;
}
