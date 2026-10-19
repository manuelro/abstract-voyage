import { colord } from 'colord';
import type { GradientInkTreatment } from '../../../../components/GradientInkSurface';
import type { QuoteConfig } from './config';

type FallbackState = { kind: 'plain' | 'palette'; gradientUnavailable: boolean };
type UnifiedData = {
  sourceIndex: number;
  ink: GradientInkTreatment;
};
type UnifiedState = ({ kind: 'unifiedInk' } | { kind: 'pendingMesh' }) & UnifiedData;
export type QuoteRenderState = FallbackState
  | { kind: 'cssInk'; gradient: string }
  | UnifiedState;

export function resolveQuoteSourceIndex(sourceCard: QuoteConfig['gradientInkSourceCard'], deckSize: number): number {
  return deckSize > 0 ? Math.min(deckSize - 1, Math.max(0, Number(sourceCard) - 1)) : -1;
}

/** The Quote-owned contract between authoring values and the final ink layer. */
export function resolveQuoteRenderState(
  config: QuoteConfig,
  input: { deckSize: number; meshVisible: boolean; cssGradient: string | null },
): QuoteRenderState {
  const fallback = (gradientUnavailable: boolean): FallbackState => ({
    kind: config.paletteBackgroundEnabled ? 'palette' : 'plain',
    gradientUnavailable,
  });
  if (!config.gradientInkEnabled) return fallback(false);
  if (config.gradientInkRenderMode === 'css') {
    return input.cssGradient ? { kind: 'cssInk', gradient: input.cssGradient } : fallback(true);
  }
  if (input.deckSize < 1) return fallback(true);
  const sourceIndex = resolveQuoteSourceIndex(config.gradientInkSourceCard, input.deckSize);
  const ink: GradientInkTreatment = {
    backgroundColor: config.gradientInkSurfaceColor,
    backgroundOpacity: config.gradientInkOverlayOpacityPercent / 100,
    foregroundColor: colord(config.gradientInkTextColor).alpha(config.gradientInkTextOpacityPercent / 100).toRgbString(),
    blendMode: config.gradientInkBlendMode,
    // The glyphs still have paint when the surface is transparent. Unified ink
    // always blends that paint; zero surface opacity does not change modes.
    blendWhenTransparent: true,
  };
  return { kind: input.meshVisible ? 'unifiedInk' : 'pendingMesh', sourceIndex, ink };
}

export function quoteGradientDiagnostic(state: QuoteRenderState): 'off' | 'unavailable' | 'css' | 'pending-mesh' | 'active' {
  if (state.kind === 'cssInk') return 'css';
  if (state.kind === 'pendingMesh') return 'pending-mesh';
  if (state.kind === 'unifiedInk') return 'active';
  return state.gradientUnavailable ? 'unavailable' : 'off';
}
