'use client';

import type { CSSProperties, MutableRefObject } from 'react';
import {
  LiquidGradientAdapter,
  type AbstractPostDockHologramConfig,
  type DeckPaletteState,
  type LiquidSliderConfig,
  type LiquidSliderMotion,
} from './AbstractPostDock';
import type { AbstractPostDockGradientActivity } from './AbstractPostDock/helpers/gradientActivity';
import type { PointerProximityState } from '../../../components/proximity/usePointerProximity';
import type { GradientMeshModulation } from './AbstractPostDock/components/GradientRenderer';
import type { SliderContentSlide } from '../../../helpers/postContent';

/**
 * THE single, shared live-WebGL gradient-mesh background layer.
 *
 * Both the wall's article cards (AbstractJournalLabCollection's own FlipCard
 * article face) AND the editorial Quote render THIS component -- not two
 * parallel `LiquidGradientAdapter` call sites that can silently drift. The
 * mesh a reader sees on a card and the mesh they see on a quote are therefore
 * produced by the very same component, driven by the very same shader
 * (`LiquidGradientAdapter`) with the same prop contract. Given identical
 * inputs (slide/palette/motion/config/hologramConfig) the two render the
 * identical mesh; the only intended difference is the crop, since a card is a
 * tall portrait box and a quote a wide short one, so each shows a different
 * window onto the same mesh.
 *
 * This deliberately carries NO CSS-gradient fallback of its own: the wall
 * article card's own background layer (AbstractJournalLabCollection's
 * `articleBackground`) is likewise a bare `overflow-hidden` wrapper around the
 * live canvas with no CSS paint behind it, so matching that exactly is what
 * keeps the quote from ever showing a flat CSS approximation where the card
 * shows the real mesh. When `slide` is absent the layer is simply empty
 * (transparent), exactly as the card's own is before its slide resolves.
 */
export type CardGradientMeshProps = {
  /** The article/slide whose seed/offsets drive this mesh. Absent/null → empty
   * layer (no canvas), matching the card's own pre-resolution state. */
  slide?: SliderContentSlide | null;
  motion: LiquidSliderMotion;
  config: LiquidSliderConfig;
  palette?: DeckPaletteState | null;
  /** Hover-hologram tuning + the live proximity signal that drives it -- pass
   * both to get the same holographic shimmer the cards have; omit the ref for
   * a still (but still live/animating) mesh. */
  hologramConfig?: AbstractPostDockHologramConfig;
  hologramInteraction?: MutableRefObject<PointerProximityState> | null;
  meshModulation?: GradientMeshModulation;
  /** 'continuous' (default) = the live, always-animating liquid mesh the cards
   * render. 'frozen' = a single static frame (used for deterministic
   * comparison/testing, or a deliberately still surface). */
  activity?: AbstractPostDockGradientActivity;
  /** Extra inline styles merged onto the wrapper (e.g. borderRadius). */
  style?: CSSProperties;
  /** Opt-in pixel readback (Quote CSS-fallback color extraction) — forwarded
   * to LiquidGradientAdapter. Normalized sample points (u, v in 0-1, top-left
   * origin) + a callback receiving the mesh's own sampled sRGB colors. */
  colorSampleUvs?: ReadonlyArray<readonly [number, number]>;
  onColorSample?: (colors: ReadonlyArray<readonly [number, number, number]>) => void;
};

export function CardGradientMesh({
  slide,
  motion,
  config,
  palette = null,
  hologramConfig,
  hologramInteraction = null,
  meshModulation,
  activity = 'continuous',
  style,
  colorSampleUvs,
  onColorSample,
}: CardGradientMeshProps) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      data-card-gradient-mesh="true"
      aria-hidden="true"
      style={style}
    >
      {slide ? (
        <LiquidGradientAdapter
          slide={slide}
          motion={motion}
          config={config}
          palette={palette}
          activity={activity}
          {...(hologramConfig ? { hologramConfig } : {})}
          hologramInteraction={hologramInteraction}
          meshModulation={meshModulation}
          colorSampleUvs={colorSampleUvs}
          onColorSample={onColorSample}
        />
      ) : null}
    </div>
  );
}
