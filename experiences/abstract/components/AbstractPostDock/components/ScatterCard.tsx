'use client';

import type { CSSProperties } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  LiquidGradientAdapter,
  type DeckPaletteState,
} from './GradientRenderer';
import type { LiquidSliderConfig } from '../config/legacy';
import type { LiquidSliderMotion } from '../hooks/motion';
import type { AbstractPostDockHologramConfig } from '../config/registered';
import ArticleCard from '../../../../../components/ArticleCard';
import { clamp } from '../../../../../helpers/clamp';
import {
  DEFAULT_CTA_BUTTON_CONFIG,
  type CtaButtonRadius,
} from '../../../../../components/CtaButton/config/registered';
import {
  usePointerProximity,
  type PointerProximityState,
} from '../../../../../components/proximity/usePointerProximity';
import { runHologramExciteSweep } from '../../../../../helpers/hologramExciteSweep';
import type { SliderContentSlide } from '../../../../../helpers/postContent';

// Layout effect on the client, plain effect on the server (avoids the SSR
// warning) — same shim AbstractPostDock.tsx uses for its own intro effects.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** One card's slot in the scattered/grid entrance — computed once for the
 * whole field by AbstractPostDockScatter (see useScatterReveal there) from
 * the same config.dockReveal* fields the slider/deck reveal already uses. */
export type AbstractPostDockScatterCardReveal = {
  enabled: boolean;
  prefersReducedMotion: boolean;
  /** Delay (ms) from mount before this card's own entrance starts. */
  startMs: number;
  durationMs: number;
  /** Resolved CSS cubic-bezier, not a preset name — already looked up once
   * for the whole field rather than per card. */
  easingCss: string;
  /** How far below rest this card starts, as a % of its own height. */
  offsetYPercent: number;
};

export type AbstractPostDockScatterCardProps = {
  slide: SliderContentSlide;
  motion: LiquidSliderMotion;
  config: LiquidSliderConfig;
  excerptLines: number;
  palette: DeckPaletteState | null;
  widthPx: number;
  heightPx: number;
  leftPx: number;
  topPx: number;
  /** Static resting rotation — the card's own fixed "as-tossed" angle. */
  rotationDeg: number;
  /** Opt-in: render an empty card instead of the article content. Position,
   * rotation, and the lift/shadow physics are unaffected. */
  minimalModeEnabled: boolean;
  /** Shows the excerpt below the title. The excerpt still reserves its own
   * layout space when this is false, so the title's position never shifts. */
  descriptionVisible: boolean;
  /** Only meaningful when `descriptionVisible` is true: hides the excerpt
   * until the card is hovered/focused, fading it in/out identically to the
   * CTA's own hover reveal (see ArticleCard's `excerptHoverOnly`). */
  descriptionHoverReveal: boolean;
  /** Hover-hologram tuning — ties this card's own gradient offset/hue/
   * saturation/brightness to its own pointer tilt. See
   * AbstractPostDockHologramConfig. */
  hologramConfig: AbstractPostDockHologramConfig;
  /** Minimal mode's background — linked live to the Editorial Hero's own
   * surface color, not an independent value. Falls back to white if omitted. */
  editorialSurfaceColor?: string;
  /** Card corner radius — a Tailwind radius token, reusing CtaButton's set. */
  cardRadius: CtaButtonRadius;
  /** This card's own slot in the field's staggered entrance. */
  reveal: AbstractPostDockScatterCardReveal;
};

const CTA = DEFAULT_CTA_BUTTON_CONFIG;

/**
 * A scattered post card — thin absolute-positioning shell around ArticleCard,
 * which owns its own content/typography, "whole card is the link" mode,
 * lift/tilt/shadow physics (identical to CtaButton's — see
 * useCardLiftPhysics), and detail markup. The only things this component
 * still owns are what's genuinely specific to the scattered arrangement:
 * absolute position/size/rotation, visibility-gated WebGL rendering (avoids
 * exceeding the browser's concurrent WebGL context limit as the catalog
 * grows), and the "minimal" blank-card mode.
 */
export function AbstractPostDockScatterCard({
  slide, motion, config, excerptLines, palette,
  widthPx, heightPx, leftPx, topPx, rotationDeg, minimalModeEnabled, editorialSurfaceColor,
  cardRadius, descriptionVisible, descriptionHoverReveal, hologramConfig, reveal,
}: AbstractPostDockScatterCardProps) {
  const visibilityRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Scattered cards individually scroll in/out of a page that grows to fit
  // every item — unlike the single dock section the existing
  // pauseWhenOffscreen system watches, each card needs its own visibility
  // signal to gate its WebGL gradient canvas and pointer tracking.
  useEffect(() => {
    const element = visibilityRef.current;
    if (!element || typeof IntersectionObserver !== 'function') {
      setIsVisible(true);
      return undefined;
    }
    // A tight margin, not a generous prefetch-ahead one: browsers cap
    // simultaneous WebGL contexts (observed ~11+ concurrent gradient canvases
    // triggering "too many active WebGL contexts" under software rendering),
    // and scattered mode has no single "active" card to prioritize — keeping
    // this close to the true viewport bounds keeps the concurrent count down
    // as the catalog grows.
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '48px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Hover-hologram: an independent proximity subscription (same config
  // constants ArticleCard's own internal useCardLiftPhysics already uses for
  // the physical tilt), tracked against this wrapper div rather than reaching
  // into ArticleCard's own internals — the wrapper is the exact same box
  // ArticleCard fills (aspectRatio="fill", no padding/border between them),
  // so both subscriptions read the same underlying pointer position and
  // converge on numerically identical proximity/x/y. Kept as a plain ref
  // (not React state) so a hover gesture never triggers a re-render — the
  // WebGL render loop inside LiquidGradientAdapter reads it directly, and
  // (opt-in via hologramConfig.dampingEnabled) applies its own attack/
  // release envelope on top for a symmetric, gradual entry and exit.
  const hologramInteractionRef = useRef<PointerProximityState>({ proximity: 0, x: 0, y: 0 });
  const hologramProximityRef = usePointerProximity<HTMLDivElement>({
    attackMs: CTA.proximityAttackMs,
    disabled: !hologramConfig.enabled || minimalModeEnabled,
    easing: CTA.proximityEasing,
    onChange: (_element, state) => {
      hologramInteractionRef.current = state;
    },
    positionResponseMs: CTA.tiltResponseMs,
    radiusPx: CTA.proximityRadiusPx,
    releaseMs: CTA.proximityReleaseMs,
  });

  const setWrapperRef = (element: HTMLDivElement | null) => {
    visibilityRef.current = element;
    hologramProximityRef(element);
  };

  const revealActive = reveal.enabled && !reveal.prefersReducedMotion;
  const revealSignature = [
    reveal.enabled,
    reveal.prefersReducedMotion,
    reveal.startMs,
    reveal.durationMs,
    reveal.easingCss,
    reveal.offsetYPercent,
  ].join('|');

  // Scattered-mode entrance: rises from below into its resting position with
  // a brief tilt + hologram "excite" (peaking mid-rise, gone by arrival) —
  // applied on this wrapper (translateY/rotateX/rotateY + opacity), never on
  // ArticleCard's own element, so it never fights that element's independent,
  // pointer-driven tilt physics. Once the animation finishes, the wrapper's
  // transform/opacity and the hologram ref are cleared back to nothing, so
  // the card ends up exactly as it would have been without any of this —
  // stable and ready for real interaction, not paused mid-effect.
  useIsomorphicLayoutEffect(() => {
    const element = visibilityRef.current;
    if (!element) return undefined;

    if (!revealActive) {
      element.style.opacity = '';
      element.style.transform = '';
      hologramInteractionRef.current = { proximity: 0, x: 0, y: 0 };
      return undefined;
    }

    const risePx = heightPx * clamp(reveal.offsetYPercent, 0, 100) / 100;
    // A per-card constant so the excite's lean doesn't read as identical
    // across every card — reuses this card's own resting rotation sign
    // (already a per-card hashed value) rather than hashing a fresh one.
    const leanSign: 1 | -1 = rotationDeg < 0 ? -1 : 1;

    element.style.opacity = '0';

    const cancel = runHologramExciteSweep(hologramInteractionRef, {
      startMs: reveal.startMs,
      durationMs: reveal.durationMs,
      easingCss: reveal.easingCss,
      leanSign,
      onFrame: ({ easedProgress, proximity, progress }) => {
        element.style.opacity = easedProgress.toFixed(4);
        element.style.transform = [
          `perspective(${CTA.tiltPerspectivePx}px)`,
          `translate3d(0, ${(risePx * (1 - easedProgress)).toFixed(2)}px, 0)`,
          `rotateX(${(-proximity * CTA.tiltMaxDegrees * 0.6).toFixed(3)}deg)`,
          `rotateY(${(proximity * CTA.tiltMaxDegrees * 0.6 * leanSign).toFixed(3)}deg)`,
        ].join(' ');
        if (progress >= 1) {
          element.style.opacity = '';
          element.style.transform = '';
        }
      },
    });
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealActive, revealSignature, heightPx, rotationDeg]);

  const wrapperStyle: CSSProperties = {
    position: 'absolute',
    left: `${leftPx}px`,
    top: `${topPx}px`,
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    // Static placeholder for the pre-hydration/SSR paint only — the layout
    // effect above immediately takes over with the same starting value and
    // drives every frame after it imperatively. Stays a stable expression
    // across re-renders (doesn't track live animation progress) so React
    // never fights the imperative writes above.
    opacity: revealActive ? 0 : undefined,
  };

  if (minimalModeEnabled) {
    return (
      <div
        ref={setWrapperRef}
        className={`overflow-hidden ${cardRadius}`}
        style={wrapperStyle}
      >
        <div
          className={`h-full w-full ${cardRadius}`}
          style={{ backgroundColor: editorialSurfaceColor ?? '#ffffff' }}
        />
      </div>
    );
  }

  return (
    <div
      ref={setWrapperRef}
      style={wrapperStyle}
    >
      <ArticleCard
        title={slide.title}
        excerpt={slide.excerpt}
        topic={slide.topic}
        date={slide.date}
        readingTime={slide.readingTime}
        excerptLines={excerptLines}
        excerptVisible={descriptionVisible}
        excerptHoverOnly={descriptionHoverReveal}
        href={slide.href}
        externalUrl={slide.externalUrl}
        forceExternalNavigation={slide.forceExternalNavigation}
        seed={slide.seed}
        interactive="whole-card"
        physics="lift"
        physicsConfig={CTA}
        rotationDeg={rotationDeg}
        aspectRatio="fill"
        typographyScale="dock"
        contentInsetRem={config.dockContentInsetRem}
        contentInsetWideRem={config.dockContentInsetWideRem}
        // Caps the title+excerpt block to a fixed height (top-aligned within
        // it, see ArticleCard's own contentBlockHeight doc) so the title
        // starts at the same height on every card regardless of its own
        // line count -- cqh so it scales with the card's own configured
        // size rather than the viewport.
        contentBlockHeight="clamp(5rem, 26cqh, 8rem)"
        ctaHoverOnly
        className={cardRadius}
        background={isVisible ? (
          <LiquidGradientAdapter
            slide={slide}
            motion={motion}
            config={config}
            palette={palette}
            hologramConfig={hologramConfig}
            hologramInteraction={hologramInteractionRef}
          />
        ) : null}
      />
    </div>
  );
}

export default AbstractPostDockScatterCard;
