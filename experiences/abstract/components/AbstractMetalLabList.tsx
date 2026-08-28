'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LabCard from '../../../components/LabCard';
import LabList, {
  type LabListCardRenderProps,
  type LabListProps,
} from '../../../components/LabList';
import { DEFAULT_CTA_BUTTON_CONFIG } from '../../../components/CtaButton/config/registered';
import {
  usePointerProximity,
  type PointerProximityState,
} from '../../../components/proximity/usePointerProximity';
import {
  LiquidGradientAdapter,
  type AbstractPostDockHologramConfig,
  type AbstractPostDockPaletteConfig,
  type AbstractPostDockHueInfluenceConfig,
  type DeckPaletteState,
  type GradientMetalLuminanceOutputTreatment,
  type LiquidSliderConfig,
  type LiquidSliderMotion,
} from './AbstractPostDock';
import {
  normalizeAbstractPostDockPaletteConfig,
  normalizeAbstractPostDockHueInfluenceConfig,
} from './AbstractPostDock/config/registered';
import { useLiquidSliderMotion } from './AbstractPostDock/hooks/motion';
import type { SliderContentSlide } from '../../../helpers/postContent';
import { buildDeckPaletteStates } from '../helpers/deckPalette';
import {
  normalizeAbstractMetalLabCardConfig,
  getAbstractMetalLabFallbackBackground,
  resolveAbstractMetalLabHologramConfig,
  resolveAbstractMetalLabOutputTreatment,
  toAbstractMetalLabSlide,
  type AbstractMetalLabCardConfig,
} from './AbstractMetalLabList.config';

type AbstractMetalLabCardProps = {
  card: LabListCardRenderProps;
  slide: SliderContentSlide;
  motion: LiquidSliderMotion;
  gradientConfig: LiquidSliderConfig;
  palette: DeckPaletteState | null;
  hologramConfig: AbstractPostDockHologramConfig;
  outputTreatment: GradientMetalLuminanceOutputTreatment;
  fallbackCss: string;
};

const CTA = DEFAULT_CTA_BUTTON_CONFIG;

/**
 * Abstract-only surface shell. The wrapper is exactly the card's 3:4 box and
 * introduces no padding, margin, or width rules; LabList remains the sole grid
 * owner. Its two responsibilities are visibility-gated WebGL allocation and
 * the journal renderer's proximity signal.
 */
function AbstractMetalLabCard({
  card,
  slide,
  motion,
  gradientConfig,
  palette,
  hologramConfig,
  outputTreatment,
  fallbackCss,
}: AbstractMetalLabCardProps) {
  const visibilityRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const hologramInteractionRef = useRef<PointerProximityState>({
    proximity: 0,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const element = visibilityRef.current;
    if (!element || typeof IntersectionObserver !== 'function') {
      setIsVisible(true);
      return undefined;
    }

    // Match the journal scatter cards' deliberately tight allocation window:
    // the lab catalog is long enough to exceed browser WebGL-context caps if
    // every card mounts a canvas at once.
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '48px 0px' },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) {
      hologramInteractionRef.current = { proximity: 0, x: 0, y: 0 };
    }
  }, [isVisible]);

  const hologramProximityRef = usePointerProximity<HTMLDivElement>({
    attackMs: CTA.proximityAttackMs,
    disabled: !hologramConfig.enabled || !isVisible,
    easing: CTA.proximityEasing,
    onChange: (_element, state) => {
      hologramInteractionRef.current = state;
    },
    positionResponseMs: CTA.tiltResponseMs,
    radiusPx: CTA.proximityRadiusPx,
    releaseMs: CTA.proximityReleaseMs,
  });

  const setWrapperRef = useCallback((element: HTMLDivElement | null) => {
    visibilityRef.current = element;
    hologramProximityRef(element);
  }, [hologramProximityRef]);

  const background = (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: fallbackCss,
      }}
    >
      {isVisible ? (
        <LiquidGradientAdapter
          slide={slide}
          motion={motion}
          config={gradientConfig}
          palette={palette}
          hologramConfig={hologramConfig}
          hologramInteraction={hologramInteractionRef}
          outputTreatment={outputTreatment}
        />
      ) : null}
    </div>
  );

  return (
    <div
      ref={setWrapperRef}
      data-abstract-metal-lab-card=""
      className="relative min-w-0 w-full"
      style={{ aspectRatio: '3 / 4' }}
    >
      <LabCard
        slug={card.lab.slug}
        title={card.lab.title}
        excerpt={card.lab.excerpt}
        tech={card.lab.tech}
        date={card.lab.date}
        formattedDate={card.lab.formattedDate}
        containerBg={card.containerBg}
        className={card.className}
        background={background}
      />
    </div>
  );
}

export type AbstractMetalLabListProps = Omit<LabListProps, 'renderCard'> & {
  /** The exact config passed to the journal renderer. The complete colorful
   * field is preserved until the fragment's final metal treatment. */
  gradientConfig: LiquidSliderConfig;
  /** The same source-palette configuration consumed by the journal. Labs use
   * it with no active index, then apply metal only at final fragment output. */
  paletteConfig: AbstractPostDockPaletteConfig;
  hueInfluenceConfig: AbstractPostDockHueInfluenceConfig;
  /** Lab-owned visible material and pointer-response authoring state. */
  cardConfig: AbstractMetalLabCardConfig;
};

export function AbstractMetalLabList({
  labs,
  gradientConfig,
  paletteConfig,
  hueInfluenceConfig,
  cardConfig,
  ...labListProps
}: AbstractMetalLabListProps) {
  const motion = useLiquidSliderMotion(gradientConfig);
  const slides = useMemo(
    () => labs.map((lab, index) => toAbstractMetalLabSlide(lab, index)),
    [labs],
  );
  const normalizedPaletteConfig = useMemo(
    () => normalizeAbstractPostDockPaletteConfig(paletteConfig),
    [paletteConfig],
  );
  const normalizedHueInfluenceConfig = useMemo(
    () => normalizeAbstractPostDockHueInfluenceConfig(hueInfluenceConfig),
    [hueInfluenceConfig],
  );
  const normalizedCardConfig = useMemo(
    () => normalizeAbstractMetalLabCardConfig(cardConfig),
    [cardConfig],
  );
  const outputTreatment = useMemo(
    () => resolveAbstractMetalLabOutputTreatment(normalizedCardConfig),
    [normalizedCardConfig],
  );
  const hologramConfig = useMemo(
    () => resolveAbstractMetalLabHologramConfig(normalizedCardConfig),
    [normalizedCardConfig],
  );
  const palettes = useMemo(() => buildDeckPaletteStates({
    slides,
    paletteConfig: normalizedPaletteConfig,
    hueInfluenceConfig: normalizedHueInfluenceConfig,
    activeIndex: null,
  }), [normalizedHueInfluenceConfig, normalizedPaletteConfig, slides]);
  const fallbacks = useMemo(
    () => slides.map(slide => getAbstractMetalLabFallbackBackground(
      slide.seed,
      outputTreatment,
    )),
    [outputTreatment, slides],
  );

  const renderCard = useCallback((card: LabListCardRenderProps) => (
    <AbstractMetalLabCard
      card={card}
      slide={slides[card.index]}
      motion={motion}
      gradientConfig={gradientConfig}
      palette={palettes?.[card.index] ?? null}
      hologramConfig={hologramConfig}
      outputTreatment={outputTreatment}
      fallbackCss={fallbacks[card.index]}
    />
  ), [
    fallbacks,
    gradientConfig,
    hologramConfig,
    motion,
    outputTreatment,
    palettes,
    slides,
  ]);

  return (
    <LabList
      {...labListProps}
      labs={labs}
      renderCard={renderCard}
    />
  );
}

export default AbstractMetalLabList;
