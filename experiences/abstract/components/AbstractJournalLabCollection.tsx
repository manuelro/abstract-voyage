'use client';

import Link from 'next/link';
import React, {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ArticleCard from '../../../components/ArticleCard';
import type { SectionHeadingConfig } from '../../../components/SectionHeading.config';
import {
  DEFAULT_CTA_BUTTON_CONFIG,
  type CtaButtonConfig,
} from '../../../components/CtaButton/config/registered';
import { useCardLiftPhysics } from '../../../components/proximity/useCardLiftPhysics';
import {
  usePointerProximity,
  type PointerProximityState,
} from '../../../components/proximity/usePointerProximity';
import {
  resolvePointerPosition,
  stepDampedValue,
  stepPointerProximityEnvelope,
} from '../../../helpers/pointerProximity';
import { runHologramExciteSweep } from '../../../helpers/hologramExciteSweep';
import type { LabSummary } from '../../../helpers/labContent';
import type { SliderContentSlide } from '../../../helpers/postContent';
import { getArticleCardFallbackBackground } from '../../../helpers/articleCardFallback';
import { usePrefersReducedMotion } from '../../../helpers/usePrefersReducedMotion';
import { createCssEasingFunction } from '../../../helpers/cubicBezierEasing';
import { computeMagnificationDockRevealSchedule } from '../../../helpers/magnificationDockRevealMath';
import {
  LiquidGradientAdapter,
  type AbstractPostDockHologramConfig,
  type AbstractPostDockHueInfluenceConfig,
  type AbstractPostDockLayoutConfig,
  type AbstractPostDockPaletteConfig,
  type DeckPaletteState,
  type GradientMetalLuminanceOutputTreatment,
  type LiquidSliderConfig,
  type LiquidSliderMotion,
} from './AbstractPostDock';
import {
  normalizeAbstractPostDockPaletteConfig,
  normalizeAbstractPostDockHueInfluenceConfig,
  resolveAbstractPostDockEasing,
  type AbstractPostDockIntroductionConfig,
} from './AbstractPostDock/config/registered';
import { useLiquidSliderMotion } from './AbstractPostDock/hooks/motion';
import {
  buildDeckPaletteStates,
} from '../helpers/deckPalette';
import {
  getAbstractMetalLabFallbackBackground,
  normalizeAbstractMetalLabCardConfig,
  resolveAbstractMetalLabHologramConfig,
  resolveAbstractMetalLabOutputTreatment,
  toAbstractMetalLabSlide,
  type AbstractMetalLabCardConfig,
} from './AbstractMetalLabList.config';
import {
  normalizeAbstractJournalLabCollectionConfig,
  resolveAbstractJournalLabFlipEasing,
  type AbstractJournalLabCollectionConfig,
  type AbstractJournalLabCollectionView,
} from './AbstractJournalLabCollection/config/presentation';
import {
  buildAbstractJournalLabFlipLayout,
  buildAbstractJournalLabFlipSchedule,
  resolveAbstractJournalLabPerspectiveOriginY,
  resolveAbstractJournalLabPerspectivePx,
  resolveLatestIntersectionVisibility,
  type AbstractJournalLabFlipSlot,
  type AbstractJournalLabFlipTiming,
} from './AbstractJournalLabCollection/collectionLayout';
import {
  normalizeAbstractJournalLabCollectionSliderConfig,
  type AbstractJournalLabCollectionSliderConfig,
} from './AbstractJournalLabCollection/config/slider';
import {
  AbstractJournalLabCollectionCardSlider,
  useIsNarrowViewport,
} from './AbstractJournalLabCollection/CardSlider';
import { AbstractJournalLabCollectionNarrowDeckSlider } from './AbstractJournalLabCollection/NarrowDeckSlider';
import styles from './AbstractJournalLabCollection/styles.module.css';

// Layout effect on the client, plain effect on the server (avoids the SSR
// warning) — same shim ScatterCard.tsx uses for its own intro effects.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const CTA = DEFAULT_CTA_BUTTON_CONFIG;

/** One card's slot in the staggered entrance — computed once for the whole
 * field by AbstractJournalLabCollection from AbstractPostDockIntroductionConfig.
 * Exported so CardSlider.tsx (slider layoutMode) can build an equivalent
 * schedule for its own capped slot count instead of a parallel type. */
export type CardReveal = {
  enabled: boolean;
  startMs: number;
  durationMs: number;
  easingCss: string;
  offsetYPercent: number;
};

/** Shared by the grid field's own `cardRevealSchedule` and the slider
 * layoutMode's capped equivalent — one computation, not two parallel ones. */
function buildCardRevealSchedule(
  slotCount: number,
  introductionConfig: AbstractPostDockIntroductionConfig | undefined,
): CardReveal[] {
  if (!introductionConfig?.enabled || slotCount === 0) {
    return Array.from({ length: slotCount }, () => ({
      enabled: false,
      startMs: 0,
      durationMs: 0,
      easingCss: '',
      offsetYPercent: 0,
    } satisfies CardReveal));
  }
  const schedule = computeMagnificationDockRevealSchedule({
    itemCount: slotCount,
    staggerMs: introductionConfig.staggerMs,
    durationMs: introductionConfig.durationMs,
    overlapMs: introductionConfig.overlapMs,
    mode: introductionConfig.mode,
    distribution: introductionConfig.distribution,
    cadenceAmount: introductionConfig.cadenceAmount,
  });
  const easingCss = resolveAbstractPostDockEasing(introductionConfig.easing);
  const firstDelayMs = Math.max(0, introductionConfig.firstDelayMs);
  return schedule.map(timing => ({
    enabled: true,
    startMs: firstDelayMs + timing.startMs,
    durationMs: timing.durationMs,
    easingCss,
    offsetYPercent: introductionConfig.offsetYPercent,
  } satisfies CardReveal));
}

export type FlipCardProps = {
  slot: AbstractJournalLabFlipSlot;
  timing: AbstractJournalLabFlipTiming;
  activeView: AbstractJournalLabCollectionView;
  transitioning: boolean;
  prefersReducedMotion: boolean;
  config: AbstractJournalLabCollectionConfig;
  motion: LiquidSliderMotion;
  gradientConfig: LiquidSliderConfig;
  articlePalette: DeckPaletteState | null;
  labSlide: SliderContentSlide | null;
  labPalette: DeckPaletteState | null;
  journalHologramConfig: AbstractPostDockHologramConfig;
  labHologramConfig: AbstractPostDockHologramConfig;
  labOutputTreatment: GradientMetalLuminanceOutputTreatment;
  labFallback: string | null;
  cardWidthPx: number;
  cardHeightPx: number;
  cardRadius: string;
  layoutConfig: AbstractPostDockLayoutConfig;
  reveal: CardReveal;
};

/**
 * Strictly sequential, not concurrent: card information fades fully out
 * ('out'), only then does the underlying gradient's hue retarget and settle
 * ('color', content stays hidden throughout), and only once that completes
 * does the new view's information fade back in ('in'). 'idle' is the
 * resting state between transitions.
 */
export type HueFadePhase = 'idle' | 'out' | 'color' | 'in';

export function AbstractJournalLabFlipCard({
  slot,
  timing,
  activeView,
  transitioning,
  prefersReducedMotion,
  config,
  motion,
  gradientConfig,
  articlePalette,
  labSlide,
  labPalette,
  journalHologramConfig,
  labHologramConfig,
  labOutputTreatment,
  labFallback,
  cardWidthPx,
  cardHeightPx,
  cardRadius,
  layoutConfig,
  reveal,
}: FlipCardProps) {
  const visibilityRef = useRef<HTMLAnchorElement | null>(null);
  const articleFaceRef = useRef<HTMLDivElement | null>(null);
  const labFaceRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [rendererView, setRendererView] =
    useState<AbstractJournalLabCollectionView>(activeView);
  const activeHologramConfig = activeView === 'labs'
    ? labHologramConfig
    : journalHologramConfig;
  const interactionRef = useRef<PointerProximityState>({
    proximity: 0,
    x: 0,
    y: 0,
  });
  const {
    ref: liftRef,
    handleFocus,
    handleBlur,
    handlePointerDown,
    handleRelease,
    interactionRef: liftInteractionRef,
    pressedRef,
    shadowRef,
  } = useCardLiftPhysics<HTMLElement>({
    config: CTA,
    capturePointer: false,
    disabled: !isVisible || transitioning,
    interactionTarget: 'separate',
    projection: 'inherited',
    rotationDeg: slot.position.rotationDeg,
    shadowTarget: 'separate',
  });
  const proximityRef = usePointerProximity<HTMLElement>({
    attackMs: CTA.proximityAttackMs,
    disabled:
      !isVisible ||
      transitioning ||
      !activeHologramConfig.enabled,
    easing: CTA.proximityEasing,
    onChange: (_element, state) => {
      interactionRef.current = state;
    },
    positionResponseMs: CTA.tiltResponseMs,
    radiusPx: CTA.proximityRadiusPx,
    releaseMs: CTA.proximityReleaseMs,
  });

  useEffect(() => {
    const element = visibilityRef.current;
    if (!element || typeof IntersectionObserver !== 'function') {
      setIsVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(entries => {
      // A responsive first paint can move a card from the temporary
      // one-column layout into the measured multi-column layout before the
      // observer callback is delivered. Chromium then batches both records
      // (`false` at the old position, `true` at the new one). The final
      // record is the current geometry; reading only entries[0] leaves every
      // card after the first permanently disabled until another scroll.
      const latestVisibility = resolveLatestIntersectionVisibility(entries);
      if (latestVisibility !== null) setIsVisible(latestVisibility);
    }, { rootMargin: '48px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const articleFace = articleFaceRef.current;
    const labFace = labFaceRef.current;
    articleFace?.toggleAttribute('inert', activeView !== 'articles');
    labFace?.toggleAttribute('inert', activeView !== 'labs');
  }, [activeView]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setRendererView(activeView);
      return undefined;
    }
    const timer = window.setTimeout(
      () => setRendererView(activeView),
      timing.midpointMs,
    );
    return () => window.clearTimeout(timer);
  }, [
    activeView,
    prefersReducedMotion,
    timing.midpointMs,
  ]);

  useEffect(() => {
    if (!isVisible || transitioning) {
      interactionRef.current = { proximity: 0, x: 0, y: 0 };
    }
  }, [isVisible, transitioning]);

  // Staggered entrance: rises from below into its resting position with an
  // opacity fade. Applied on the outer slot wrapper (translateY/opacity),
  // never on the physics or flipper elements, so it never fights the card's
  // independent physics or the collection flip. Once the animation finishes,
  // the slot's transform/opacity are cleared back to nothing so the card ends
  // up exactly as it would have been without any of this.
  const revealActive = reveal.enabled && !prefersReducedMotion;
  const revealSignature = [
    reveal.enabled,
    reveal.startMs,
    reveal.durationMs,
    reveal.easingCss,
    reveal.offsetYPercent,
  ].join('|');
  useIsomorphicLayoutEffect(() => {
    const element = visibilityRef.current;
    if (!element) return undefined;

    if (!revealActive) {
      element.style.opacity = '';
      element.style.transform = '';
      return undefined;
    }

    let frame = 0;
    let startTimestamp = 0;
    const easing = createCssEasingFunction(reveal.easingCss);
    const risePx = cardHeightPx * clamp(reveal.offsetYPercent, 0, 100) / 100;

    element.style.opacity = '0';

    const step = (now: number) => {
      frame = 0;
      if (!startTimestamp) startTimestamp = now + Math.max(0, reveal.startMs);
      const elapsedMs = now - startTimestamp;
      const progress = elapsedMs < 0
        ? 0
        : reveal.durationMs <= 0
          ? 1
          : clamp(elapsedMs / reveal.durationMs, 0, 1);
      const easedProgress = easing(progress);

      element.style.opacity = easedProgress.toFixed(4);
      element.style.transform = risePx > 0
        ? `translate3d(0, ${(risePx * (1 - easedProgress)).toFixed(2)}px, 0)`
        : '';

      if (elapsedMs < 0 || progress < 1) {
        frame = window.requestAnimationFrame(step);
      } else {
        element.style.opacity = '';
        element.style.transform = '';
      }
    };

    frame = window.requestAnimationFrame(step);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealActive, revealSignature, cardHeightPx]);

  const setInteractionRef = useCallback((element: HTMLAnchorElement | null) => {
    visibilityRef.current = element;
    liftInteractionRef(element);
    proximityRef(element);
  }, [liftInteractionRef, proximityRef]);
  const articleRendererActive =
    isVisible && rendererView === 'articles' && Boolean(slot.article);
  const labRendererActive =
    isVisible && rendererView === 'labs' && Boolean(slot.lab && labSlide);
  const articleCanvas = articleRendererActive && slot.article ? (
    <LiquidGradientAdapter
      slide={slot.article}
      motion={motion}
      config={gradientConfig}
      palette={articlePalette}
      hologramConfig={journalHologramConfig}
      hologramInteraction={interactionRef}
    />
  ) : undefined;
  // Keep the renderer under one stable host across hue enable/disable changes.
  // Conditionally adding this wrapper used to remount LiquidGradientAdapter,
  // which initialized directly at the new hue state and made the configured
  // transition appear to snap. The adapter owns its settled CSS fallback.
  const articleBackground = (
    <div className="absolute inset-0 overflow-hidden">
      {articleCanvas}
    </div>
  );
  const labBackground = slot.lab && labFallback ? (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: labFallback }}
    >
      {labRendererActive && labSlide ? (
        <LiquidGradientAdapter
          slide={labSlide}
          motion={motion}
          config={gradientConfig}
          palette={labPalette}
          hologramConfig={labHologramConfig}
          hologramInteraction={interactionRef}
          outputTreatment={labOutputTreatment}
        />
      ) : null}
    </div>
  ) : undefined;
  const activeHasFace = activeView === 'articles'
    ? Boolean(slot.article)
    : Boolean(slot.lab);
  const activeHref = activeView === 'articles'
    ? slot.article?.href
    : slot.lab?.canonicalPath;
  const activeTitle = activeView === 'articles'
    ? slot.article?.title
    : slot.lab?.title;
  const activeIsExternal = activeView === 'articles'
    && Boolean(
      slot.article?.forceExternalNavigation &&
      slot.article.externalUrl,
    );
  const slotStyle = {
    left: `${slot.position.leftPx}px`,
    top: `${slot.position.topPx}px`,
    width: `${cardWidthPx}px`,
    height: `${cardHeightPx}px`,
    '--flip-angle': activeView === 'labs' ? '180deg' : '0deg',
    '--flip-delay': prefersReducedMotion ? '0ms' : `${timing.startMs}ms`,
    '--flip-duration': prefersReducedMotion
      ? '0ms'
      : `${config.flipDurationMs}ms`,
    '--flip-easing': resolveAbstractJournalLabFlipEasing(config.flipEasing),
  } as CSSProperties;

  return (
    <Link
      ref={setInteractionRef}
      href={activeHref ?? '#'}
      aria-hidden={!activeHasFace}
      aria-label={activeTitle}
      className={`${styles.slot} group`}
      data-active-has-face={activeHasFace ? 'true' : 'false'}
      data-flip-index={slot.index}
      rel={activeIsExternal ? 'noreferrer' : undefined}
      style={slotStyle}
      tabIndex={activeHasFace ? undefined : -1}
      target={activeIsExternal ? '_blank' : undefined}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPointerDown={handlePointerDown}
      onPointerUp={handleRelease}
      onPointerCancel={handleRelease}
      onPointerLeave={() => {
        if (pressedRef.current) handleRelease();
      }}
    >
      <div
        ref={liftRef}
        className={styles.physics}
      >
        <div
          ref={shadowRef}
          className={`${styles.flipper} ${cardRadius}`}
        >
          <div
            ref={articleFaceRef}
            aria-hidden={activeView !== 'articles'}
            className={[
              styles.face,
              activeView !== 'articles' ? styles.inactiveFace : '',
            ].filter(Boolean).join(' ')}
          >
            {slot.article ? (
              <ArticleCard
                title={slot.article.title}
                excerpt={slot.article.excerpt}
                topic={slot.article.topic}
                date={slot.article.date}
                readingTime={slot.article.readingTime}
                href={slot.article.href}
                externalUrl={slot.article.externalUrl}
                forceExternalNavigation={slot.article.forceExternalNavigation}
                seed={slot.article.seed}
                interactive="parent-link"
                physics="none"
                aspectRatio="fill"
                typographyScale="dock"
                contentInsetRem={gradientConfig.dockContentInsetRem}
                contentInsetWideRem={gradientConfig.dockContentInsetWideRem}
                contentBlockHeight="clamp(5rem, 26cqh, 8rem)"
                excerptVisible={layoutConfig.descriptionVisible}
                excerptHoverOnly={layoutConfig.descriptionHoverReveal}
                ctaHoverOnly
                className={cardRadius}
                background={articleBackground}
              />
            ) : null}
          </div>
          <div
            ref={labFaceRef}
            aria-hidden={activeView !== 'labs'}
            className={[
              styles.face,
              styles.back,
              activeView !== 'labs' ? styles.inactiveFace : '',
            ].filter(Boolean).join(' ')}
          >
            {slot.lab ? (
              <ArticleCard
                title={slot.lab.title}
                excerpt={slot.lab.excerpt}
                topic={slot.lab.tech[0]}
                readingTime={slot.lab.tech.slice(1, 3).join(' · ') || undefined}
                date={slot.lab.formattedDate ?? slot.lab.date}
                href={`/labs/${slot.lab.slug}`}
                interactive="parent-link"
                physics="none"
                aspectRatio="fill"
                typographyScale="dock"
                contentInsetRem={gradientConfig.dockContentInsetRem}
                contentInsetWideRem={gradientConfig.dockContentInsetWideRem}
                contentBlockHeight="clamp(5rem, 26cqh, 8rem)"
                excerptVisible={layoutConfig.descriptionVisible}
                excerptHoverOnly={layoutConfig.descriptionHoverReveal}
                ctaHoverOnly
                ctaLabel="View lab"
                className={cardRadius}
                background={labBackground}
              />
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

export type HueFadeCardProps = {
  slot: AbstractJournalLabFlipSlot;
  targetView: AbstractJournalLabCollectionView;
  renderedView: AbstractJournalLabCollectionView;
  /** Which view's palette the gradient renderer is targeting — only
   * advances to the requested view once content has fully faded out
   * (phase 'color'), never at click time. Drives `activePalette` below;
   * kept distinct from `targetView` (the ultimately-desired view, used for
   * face/visibility bookkeeping) so the color change never leads the
   * content fade-out. */
  colorView: AbstractJournalLabCollectionView;
  phase: HueFadePhase;
  transitioning: boolean;
  prefersReducedMotion: boolean;
  config: AbstractJournalLabCollectionConfig;
  motion: LiquidSliderMotion;
  gradientConfig: LiquidSliderConfig;
  basePalette: DeckPaletteState | null;
  influencedPalette: DeckPaletteState | null;
  visualSlide: SliderContentSlide;
  journalHologramConfig: AbstractPostDockHologramConfig;
  cardWidthPx: number;
  cardHeightPx: number;
  cardRadius: string;
  layoutConfig: AbstractPostDockLayoutConfig;
  reveal: CardReveal;
  /** Tilt/lift/shadow physics tuning for this card — same shape CtaButton
   * itself uses (useCardLiftPhysics is the shared engine both are built
   * on). Optional and defaults to the module's own CTA constant
   * (DEFAULT_CTA_BUTTON_CONFIG) — every existing caller that doesn't pass
   * this sees zero behavior change. A caller that already has its own
   * live, panel-configurable CtaButtonConfig state (e.g. a page's "CTA
   * Button" appearance section) can pass it here to make the card's own
   * tilt/shadow feel reachable from that same panel, instead of being
   * permanently pinned to the hardcoded default. */
  ctaConfig?: CtaButtonConfig;
  /** Opt-in, stack-only: this card is the vertical card stack's own active
   * slide (CardStack.tsx passes `offset === 0`) — never set by the flat/
   * single-card branch, which leaves both of the two fields below at their
   * original, unmodified behavior.
   *   - Forces the excerpt permanently visible (excerptHoverOnly={false}
   *     on the underlying ArticleCard, overriding
   *     layoutConfig.descriptionHoverReveal for this card only) instead of
   *     requiring an actual hover to reveal it — the CTA/"Read article"
   *     button is untouched, still its own separate ctaHoverOnly-gated
   *     `.hoverReveal` (ArticleCard.tsx's own existing fade mechanism,
   *     reused as-is, not a new one).
   *   - Suppresses the lift-physics/hologram proximity engines' `disabled`
   *     override below (see stackNeighborSettled) — the active slide's own
   *     tilt must never be touched by stack bookkeeping regardless of this
   *     flag, but is included here for a single, co-located doc comment
   *     covering both stack-only behaviors this card opts into.
   */
  stackActiveSlide?: boolean;
  /** Opt-in, stack-only: this card is CardStack.tsx's own non-active
   * neighbor slot (`offset !== 0`) that has *settled* — no step is in
   * flight (`!step.isTransitioning`). Only in that settled state do the
   * lift-physics/hologram proximity engines get *disabled* (see the two
   * `useCardLiftPhysics`/`usePointerProximity` calls below) — smoothly
   * easing their tilt back to 0 via the engines' own existing release/decay
   * envelope, not an instant cut. Never set by the flat/single-card
   * branch. */
  stackNeighborSettled?: boolean;
  /** Opt-in, stack-only: a step is currently in flight for this slot
   * (`step.isTransitioning`) — *regardless* of which direction it's headed
   * (arriving at the active slot, `offset === 0`, or leaving it,
   * `offset !== 0`; every currently-visible slot's own offset changes on
   * every step, so every one of them is animating for its duration, not
   * just the ones nearest the active slot). Passed as `freeze` (distinct
   * from `disabled` — see that option's own doc comment on
   * `UseCardLiftPhysicsOptions`) to both proximity engines: holds whatever
   * tilt/lift the card had the instant this became true, completely
   * unchanged, rather than continuing to compute proximity against this
   * card's own bounding box while that box is itself being translated/
   * scaled by the scripted stack motion. Round 13 (see PLAN-VERTICAL-CARD-
   * STACK.md) only froze the *leaving* case — the *arriving* case was left
   * fully live, which computed real proximity against that same kind of
   * moving box and produced the identical artifact (an erratic, non-
   * monotonic tilt swing as the box moved into position, not a smooth
   * arrival) — round 14 is what actually covers both directions. Never set
   * by the flat/single-card branch. */
  stackSlotAnimating?: boolean;
  /** True only while this exact card's own active/inactive status is
   * changing in the current step — narrower than stackSlotAnimating (true
   * for every visible slot during any step). Gates the gradient-mesh
   * cover's own boundary-crossing-only blur below, in the stackNeutralSurface
   * render — see CardStackContentRenderProps.stackPresentationTransitioning's
   * own doc comment (CardStackSlot.tsx) for the full reasoning. */
  stackPresentationTransitioning?: boolean;
  /** Stack-only visual hierarchy. Inactive cards keep their existing mesh
   * mounted, but a neutral surface covers its interior so the mesh reads as
   * a 3px perimeter. Transition values come from the stack motion config so
   * appearance and spatial movement settle as one gesture. Omitted by every
   * non-stack consumer, preserving the original full-gradient treatment. */
  /** Opt-in, stack-only: `(hover: hover) and (pointer: fine)` device
   * capability (CardStack.tsx already computes this once via
   * `useHasHoverPointer` for its own arrow-hiding logic — threaded straight
   * through rather than a second subscription here). Gates the touch-drag
   * hologram signal and the ambient sweep below (both are for touch/coarse-
   * pointer devices only, leaving hover-capable devices' existing live
   * cursor-proximity hologram completely unchanged), and — since ABSTRACT-08
   * — the tilt+lift hover physics (`useCardLiftPhysics` below) too: that
   * hook's own `disabled` had no device-capability check at all, so a touch
   * interaction (a tap, a drag) could still drive a live `pointermove`-fed
   * tilt/lift on a card, an effect this codebase already treats as
   * hover-only everywhere else it appears (see the ambient-sweep/touch-drag
   * split just above). Never set by the flat/single-card branch, which gets
   * neither — that branch has no equivalent `useHasHoverPointer` call to
   * source it from, so it keeps today's always-on behavior unchanged. */
  hasHoverPointer?: boolean;
  /** Stack-only editorial lead treatment, supplied by CardStack for the
   * first Article card only. */
  titleAndSummaryOnly?: boolean;
  stackPresentation?: {
    state: 'active' | 'inactive';
    surfaceColor: string;
    /** Neighbor (inactive)-only — label/meta/title/excerpt/separator/CTA
     * color, applied as an inline override of ArticleCard.module.css's own
     * `[data-appearance='neutral']` block (see stackAppearanceStyle below).
     * Never applied while `state` is 'active'; that card keeps its own
     * unmodified 'gradient' appearance regardless of this value. */
    textColor: string;
    /** Neighbor (inactive)-only — border color of the topic/category tag,
     * same inline-override mechanism as textColor above, independent of it
     * since ArticleCard.module.css already treats this as its own distinct
     * custom property. */
    topicBorderColor: string;
    /** The card's own outer border — see
     * CardStackSlotPresentation.cardBorderColor's own doc comment
     * (CardStackSlot.tsx). Distinct from topicBorderColor above (the small
     * topic-pill's own border). */
    cardBorderColor: string;
    transitionDurationMs: number;
    transitionEasingCss: string;
    transitionDelayMs: number;
    /** See CardStackSlotPresentation.gradientRevealDurationMs/-EasingCss/
     * -BlurPx's own doc comments (CardStackSlot.tsx) — the gradient-mesh
     * cover's own timing/blur, deliberately separate from
     * transitionDurationMs/transitionEasingCss above (which stay tied to
     * the tilt sub-phase for this card's other cross-fades). */
    gradientRevealDurationMs: number;
    gradientRevealEasingCss: string;
    gradientRevealBlurPx: number;
    /** See CardStackSlotPresentation.shadowFadeDurationMs/-EasingCss's own
     * doc comments (CardStackSlot.tsx) — drives this card's own
     * useCardLiftPhysics shadowEnabledTransitionMs/shadowEnabledEasingCss
     * below. */
    shadowFadeDurationMs: number;
    shadowFadeEasingCss: string;
    /** See CardStackSlotPresentation.ctaHoverDurationMs/-EasingCss's own
     * doc comments (CardStackSlot.tsx) — drives this card's own
     * ArticleCard ctaHoverDurationMs/ctaHoverEasingCss below. */
    ctaHoverDurationMs: number;
    ctaHoverEasingCss: string;
    /** See CardStackSlotPresentation.ctaHoverDelayMs's own doc comment
     * (CardStackSlot.tsx) — drives this card's own ArticleCard
     * ctaHoverDelayMs below. */
    ctaHoverDelayMs: number;
  };
};

/**
 * The hue fade-through deliberately owns one physical surface and one
 * gradient renderer. Article/lab changes only retarget that renderer's hue
 * uniforms and replace the information layer after it reaches opacity zero.
 * This is separate from the flip card so the established two-face path
 * remains byte-for-byte available as the default presentation.
 */
export function AbstractJournalLabHueFadeCard({
  slot,
  targetView,
  renderedView,
  colorView,
  phase,
  transitioning,
  prefersReducedMotion,
  config,
  motion,
  gradientConfig,
  basePalette,
  influencedPalette,
  visualSlide,
  journalHologramConfig,
  cardWidthPx,
  cardHeightPx,
  cardRadius,
  layoutConfig,
  reveal,
  ctaConfig = CTA,
  stackActiveSlide = false,
  stackNeighborSettled = false,
  stackSlotAnimating = false,
  stackPresentationTransitioning = false,
  stackPresentation,
  hasHoverPointer = true,
  titleAndSummaryOnly = false,
}: HueFadeCardProps) {
  const visibilityRef = useRef<HTMLAnchorElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const interactionRef = useRef<PointerProximityState>({
    proximity: 0,
    x: 0,
    y: 0,
  });
  // Plays the ambient hologram sweep (below) at most once per mounted
  // instance for a given *sweep configuration* — either because it already
  // ran under that same configuration, or because a real touch drag has
  // already happened and superseded the need for an introduction. Keyed on
  // the config signature (below), not a plain boolean: a live panel edit
  // while testing changes the signature, which intentionally lets the
  // sweep replay so the new values are visible immediately, without
  // needing a full reload — see lastPlayedAmbientSweepSignatureRef.
  const hasPlayedAmbientSweepRef = useRef(false);
  const lastPlayedAmbientSweepSignatureRef = useRef<string | null>(null);
  const targetHasFace = targetView === 'articles'
    ? Boolean(slot.article)
    : Boolean(slot.lab);
  const renderedHasFace = renderedView === 'articles'
    ? Boolean(slot.article)
    : Boolean(slot.lab);
  const shellVisible = targetHasFace && renderedHasFace;
  const {
    ref: liftRef,
    handleFocus,
    handleBlur,
    handlePointerDown,
    handleRelease,
    interactionRef: liftInteractionRef,
    pressedRef,
    shadowRef,
  } = useCardLiftPhysics<HTMLElement>({
    config: ctaConfig,
    capturePointer: false,
    // Neither flag is ever true for the flat branch — see their own doc
    // comments on HueFadeCardProps. Three real states, not two, keyed off
    // step.isTransitioning first, offset second:
    //   - step.isTransitioning (stackSlotAnimating): frozen, not disabled,
    //     not live — this card's own bounding box is being translated/
    //     scaled by the scripted stack motion right now, in *either*
    //     direction (arriving at offset 0 or leaving it), so computing real
    //     proximity against it produces the exact same artifact either way:
    //     a swing driven by the box moving under a stationary cursor, not
    //     by any real pointer movement. Round 13 only froze the leaving
    //     direction; round 14 covers both (PLAN-VERTICAL-CARD-STACK.md).
    //   - settled, non-active (stackNeighborSettled): disabled — smoothly
    //     eases the frozen tilt to 0 via this engine's own existing
    //     release/decay envelope.
    //   - settled, active (neither flag true): fully live — the only state
    //     that was ever correct to leave untouched.
    // ABSTRACT-08: !hasHoverPointer added on top of the three states above —
    // none of them were ever gated by device capability, so a touch
    // interaction (tap, drag) driving a live pointermove could still tilt/
    // lift a card exactly like a hovering cursor would. hasHoverPointer
    // defaults to `true` (see its own prop doc comment) for the flat/
    // single-card branch, which never sources a real value here, so that
    // branch's always-on behavior is unchanged.
    disabled: !isVisible || !shellVisible || stackNeighborSettled || !hasHoverPointer,
    // A settled stack neighbor must show literally zero elevation shadow —
    // shadowElevationRestingPx (this hook's own default target for a
    // disabled instance, ~1px) is a deliberate small ambient shadow for an
    // ordinary interactive-but-idle element, appropriate for the flat/
    // single-card branch (which never sets stackNeighborSettled and so
    // never reaches this override), but wrong here: only the active,
    // centered card should ever read as elevated. Every other disabled
    // reason on this same instance (off-screen, no real content, no hover
    // pointer) keeps the hook's own default resting-elevation behavior —
    // this targets stackNeighborSettled specifically, not `disabled` as a
    // whole.
    disabledElevationPx: stackNeighborSettled ? 0 : undefined,
    // disabledElevationPx: 0 alone doesn't guarantee zero shadow — the
    // elevation shadow engine's own contact/ambient-occlusion layer is
    // strongest at elevation 0 by design (helpers/elevationShadowEngine.ts),
    // so a settled neighbor still cast a real, visible shadow with only the
    // fix above (confirmed live, operator screenshot). Bypasses the engine
    // outright for this instance instead, same gate.
    // Keyed off stackActiveSlide (this exact slot's own offset === 0), not
    // stackNeighborSettled — stackNeighborSettled only flips true once
    // step.isTransitioning finishes, so gating on it meant the shadow sat
    // frozen at its prior value for the whole slide and only started
    // fading after the card had already visually landed (operator-
    // reported: "shadow is not being reduced gradually as the transition
    // happens"). stackActiveSlide flips the instant a step begins — the
    // outgoing card's own offset changes away from 0 in the same render
    // that starts the translate animation, and the incoming card's offset
    // becomes 0 at that same moment — so the shadow-visibility tween below
    // now runs the whole time the card is sliding, landing at exactly 0 (or
    // exactly its resting elevation) right as the card settles, not after.
    // The tween effect that reads this (useCardLiftPhysics.ts) is
    // deliberately never gated by `freeze` below — freeze only holds lift/
    // tilt/scale still while this card's own box is being externally
    // translated by the step; the shadow's own fade needs to keep running
    // through that exact window, not pause for it.
    shadowEnabled: stackActiveSlide,
    // The shadow's own fade in/out as a card crosses the neighbor/active
    // boundary — operator-configurable via the Card stack panel's own
    // "Shadow fade duration"/"Shadow fade easing" (stackPresentation's own
    // shadowFadeDurationMs/-EasingCss, see CardStackSlot.tsx). Undefined on
    // the flat/non-stack branch (stackPresentation itself is undefined
    // there), which falls back to the hook's own default
    // (config.stateExitTransitionMs/-Easing) — unchanged from before this
    // option existed.
    shadowEnabledTransitionMs: stackPresentation?.shadowFadeDurationMs,
    shadowEnabledEasingCss: stackPresentation?.shadowFadeEasingCss,
    freeze: stackSlotAnimating,
    interactionTarget: 'separate',
    projection: 'inherited',
    rotationDeg: slot.position.rotationDeg,
    shadowTarget: 'separate',
    // Front lift (translateZ, toward the viewer) specifically for the
    // stack's own active/centered card — stackActiveSlide is only ever true
    // for that one slot (CardStackSlot.tsx's offset === 0), false for every
    // neighbor and for the flat/non-stack single-card branch, both of which
    // keep the vertical (Y) lift this hook has always used everywhere else
    // (CtaButton, ComposerPill, scattered cards, etc.).
    liftAxis: stackActiveSlide ? 'z' : 'y',
    // Same gate as liftAxis, same reason: the active card already lifts
    // symmetrically (translateZ, "comes forward from its own center"), so
    // its shadow reads as wrong with the engine's default one-sided "lit
    // from above" lean (PLAN/operator finding — a tilted card visibly
    // casting the shadow only downward). Center/center instead — every
    // shadow layer's offset forced to (0, 0), blur/spread/alpha unchanged.
    // Flat/non-stack cards and neighbors (stackActiveSlide false) keep the
    // engine's own default directional shadow, unaffected.
    centeredShadow: stackActiveSlide,
  });
  const proximityRef = usePointerProximity<HTMLElement>({
    attackMs: ctaConfig.proximityAttackMs,
    disabled:
      !isVisible ||
      !shellVisible ||
      stackNeighborSettled ||
      !journalHologramConfig.enabled,
    freeze: stackSlotAnimating,
    easing: ctaConfig.proximityEasing,
    onChange: (_element, state) => {
      interactionRef.current = state;
    },
    positionResponseMs: ctaConfig.tiltResponseMs,
    radiusPx: ctaConfig.proximityRadiusPx,
    releaseMs: ctaConfig.proximityReleaseMs,
  });

  // Touch-drag hologram (PLAN: touch hologram reveal) — a finger's own
  // direct equivalent of the cursor-proximity tilt above, computed
  // independently of usePointerProximity: that engine explicitly excludes
  // touch pointers (see its own supportsDirectionalPointer), and
  // AbstractDeckSwiper already established this codebase's precedent for
  // touch — derive a bespoke signal from the gesture itself rather than
  // reaching into that shared, mouse-only engine. Reuses the same damped
  // attack/release envelope math (stepPointerProximityEnvelope/
  // stepDampedValue) for an identical feel, just fed a different target:
  // touch is direct contact, not distance-based hover, so proximity's own
  // target is simply 1 while a finger is on the card and 0 once it lifts —
  // x/y alone track where within the card the contact point currently is
  // (resolvePointerPosition, the same helper the mouse path uses).
  const touchDragStateRef = useRef({ active: false, clientX: 0, clientY: 0 });
  const touchDragEnvelopeRef = useRef({ current: 0, currentX: 0, currentY: 0 });
  const touchDragFrameRef = useRef(0);
  const touchDragPreviousFrameTimeRef = useRef(0);
  const touchDragEligible = journalHologramConfig.enabled && journalHologramConfig.touchDragEnabled
    && isVisible && shellVisible;

  const stepTouchDrag = useCallback((now: number) => {
    touchDragFrameRef.current = 0;
    const element = visibilityRef.current;
    if (!element) return;
    const deltaMs = touchDragPreviousFrameTimeRef.current
      ? Math.min(64, now - touchDragPreviousFrameTimeRef.current)
      : 16.67;
    touchDragPreviousFrameTimeRef.current = now;
    const active = touchDragStateRef.current.active;
    const rect = element.getBoundingClientRect();
    const targetPosition = active
      ? resolvePointerPosition(touchDragStateRef.current.clientX, touchDragStateRef.current.clientY, rect)
      : { x: 0, y: 0 };
    const target = active ? 1 : 0;
    const envelope = touchDragEnvelopeRef.current;
    const next = stepPointerProximityEnvelope({
      attackMs: ctaConfig.proximityAttackMs,
      current: envelope.current,
      deltaMs,
      releaseMs: ctaConfig.proximityReleaseMs,
      target,
    });
    const nextX = stepDampedValue({
      current: envelope.currentX, deltaMs, responseMs: ctaConfig.tiltResponseMs, target: targetPosition.x,
    });
    const nextY = stepDampedValue({
      current: envelope.currentY, deltaMs, responseMs: ctaConfig.tiltResponseMs, target: targetPosition.y,
    });
    touchDragEnvelopeRef.current = { current: next, currentX: nextX, currentY: nextY };
    interactionRef.current = { proximity: next, x: nextX, y: nextY };
    const settled = next === target && nextX === targetPosition.x && nextY === targetPosition.y;
    if (active || !settled) {
      touchDragFrameRef.current = window.requestAnimationFrame(stepTouchDrag);
    } else {
      touchDragPreviousFrameTimeRef.current = 0;
    }
  }, [ctaConfig.proximityAttackMs, ctaConfig.proximityReleaseMs, ctaConfig.tiltResponseMs]);

  const handleHologramTouchStart = useCallback((event: ReactPointerEvent) => {
    if (event.pointerType !== 'touch' || !touchDragEligible) return;
    touchDragStateRef.current = { active: true, clientX: event.clientX, clientY: event.clientY };
    // A real touch has now happened on this card — the ambient sweep below
    // exists only to introduce the effect before any real contact, so once
    // contact has genuinely occurred it should never play (or interrupt)
    // again for this card instance.
    hasPlayedAmbientSweepRef.current = true;
    if (!touchDragFrameRef.current) touchDragFrameRef.current = window.requestAnimationFrame(stepTouchDrag);
  }, [touchDragEligible, stepTouchDrag]);

  const handleHologramTouchMove = useCallback((event: ReactPointerEvent) => {
    if (event.pointerType !== 'touch' || !touchDragStateRef.current.active) return;
    touchDragStateRef.current.clientX = event.clientX;
    touchDragStateRef.current.clientY = event.clientY;
  }, []);

  const handleHologramTouchEnd = useCallback((event: ReactPointerEvent) => {
    if (event.pointerType !== 'touch') return;
    touchDragStateRef.current.active = false;
  }, []);

  useEffect(() => () => {
    if (touchDragFrameRef.current) window.cancelAnimationFrame(touchDragFrameRef.current);
  }, []);

  useEffect(() => {
    const element = visibilityRef.current;
    if (!element || typeof IntersectionObserver !== 'function') {
      setIsVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(entries => {
      const latestVisibility = resolveLatestIntersectionVisibility(entries);
      if (latestVisibility !== null) setIsVisible(latestVisibility);
    }, { rootMargin: '48px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !shellVisible) {
      interactionRef.current = { proximity: 0, x: 0, y: 0 };
    }
  }, [isVisible, shellVisible]);

  const revealActive = reveal.enabled && !prefersReducedMotion;
  const revealSignature = [
    reveal.enabled,
    reveal.startMs,
    reveal.durationMs,
    reveal.easingCss,
    reveal.offsetYPercent,
  ].join('|');
  useIsomorphicLayoutEffect(() => {
    const element = visibilityRef.current;
    if (!element) return undefined;

    if (!revealActive) {
      element.style.removeProperty('--reveal-opacity');
      element.style.removeProperty('--reveal-offset-y');
      return undefined;
    }

    let frame = 0;
    let startTimestamp = 0;
    const easing = createCssEasingFunction(reveal.easingCss);
    const risePx = cardHeightPx * clamp(reveal.offsetYPercent, 0, 100) / 100;
    element.style.setProperty('--reveal-opacity', '0');

    const step = (now: number) => {
      frame = 0;
      if (!startTimestamp) startTimestamp = now + Math.max(0, reveal.startMs);
      const elapsedMs = now - startTimestamp;
      const progress = elapsedMs < 0
        ? 0
        : reveal.durationMs <= 0
          ? 1
          : clamp(elapsedMs / reveal.durationMs, 0, 1);
      const easedProgress = easing(progress);
      element.style.setProperty(
        '--reveal-opacity',
        easedProgress.toFixed(4),
      );
      element.style.setProperty(
        '--reveal-offset-y',
        risePx > 0
          ? `${(risePx * (1 - easedProgress)).toFixed(2)}px`
          : '0px',
      );

      if (elapsedMs < 0 || progress < 1) {
        frame = window.requestAnimationFrame(step);
      } else {
        element.style.removeProperty('--reveal-opacity');
        element.style.removeProperty('--reveal-offset-y');
      }
    };

    frame = window.requestAnimationFrame(step);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealActive, revealSignature, cardHeightPx]);

  // Ambient hologram sweep (PLAN: touch hologram reveal) — the passive
  // introduction for hover-incapable/coarse-pointer devices, which never
  // get the live cursor-proximity hologram above and would otherwise never
  // see the effect until (if ever) they happen to drag a finger across a
  // card (see touchDragEligible above). Reuses runHologramExciteSweep, the
  // same sine-envelope driver AbstractPostDockScatterCard's own mount-
  // entrance excite already uses, but triggered by this card's own
  // isVisible (not mount) and capped to once per (mounted instance, sweep
  // config) pair via hasPlayedAmbientSweepRef/lastPlayedAmbientSweepSignatureRef
  // — a scrolling stack shouldn't replay a flourish every time the same
  // card re-enters view, and a real touch drag already supersedes the
  // need for it entirely (see handleHologramTouchStart above, which also
  // sets hasPlayedAmbientSweepRef).
  //
  // Stack-only: also requires stackActiveSlide. Diagnosed live (round 1):
  // every visible slot's own isVisible flips true within the same frame or
  // two on initial mount, so every one of them — active card *and* every
  // neighbor — independently played its own sweep in near-perfect sync,
  // reading as "why is the neighbor also tilting" even though each card's
  // signal was genuinely its own (leanSign-derived, not a shared/leaked
  // value — confirmed via computed-style inspection: two adjacent cards
  // showed different tilt values at the same instant, not identical ones).
  // The intro is only meaningful for the card a touch would actually land
  // on, so restricting it to the active slide is the fix, not a workaround
  // — neighbors simply never needed it. Never true for the flat/single-card
  // branch (see that prop's own doc comment), which is already excluded via
  // hasHoverPointer's own default there regardless.
  const ambientSweepSignature = [
    journalHologramConfig.ambientSweepStartMs,
    journalHologramConfig.ambientSweepDurationMs,
    journalHologramConfig.ambientSweepEasing,
    journalHologramConfig.ambientSweepGeometry,
    journalHologramConfig.ambientSweepRadius,
    journalHologramConfig.ambientSweepLoopCount,
    journalHologramConfig.ambientSweepEnvelopeShape,
    journalHologramConfig.ambientTiltEnabled,
    journalHologramConfig.ambientTiltMaxDegrees,
  ].join('|');
  useEffect(() => {
    const configChangedSinceLastPlay = hasPlayedAmbientSweepRef.current
      && lastPlayedAmbientSweepSignatureRef.current !== null
      && lastPlayedAmbientSweepSignatureRef.current !== ambientSweepSignature;
    if (
      (hasPlayedAmbientSweepRef.current && !configChangedSinceLastPlay)
      || !stackActiveSlide
      || hasHoverPointer
      || prefersReducedMotion
      || !isVisible
      || !shellVisible
      || !journalHologramConfig.enabled
      || !journalHologramConfig.ambientSweepEnabled
    ) return undefined;
    hasPlayedAmbientSweepRef.current = true;
    lastPlayedAmbientSweepSignatureRef.current = ambientSweepSignature;
    const leanSign: 1 | -1 = slot.index % 2 === 0 ? 1 : -1;
    const tiltElement = journalHologramConfig.ambientTiltEnabled ? visibilityRef.current : null;
    if (!tiltElement) {
      // A config edit landing while ambientTiltEnabled just turned off
      // must still clear any tilt a *previous* play left behind — a plain
      // early-return here (skipping straight to runHologramExciteSweep)
      // would leave that stale tilt on screen forever, the exact kind of
      // seam this rework is meant to prevent.
      visibilityRef.current?.style.removeProperty('--reveal-tilt-x');
      visibilityRef.current?.style.removeProperty('--reveal-tilt-y');
    }
    return runHologramExciteSweep(interactionRef, {
      startMs: journalHologramConfig.ambientSweepStartMs,
      durationMs: journalHologramConfig.ambientSweepDurationMs,
      easingCss: resolveAbstractPostDockEasing(journalHologramConfig.ambientSweepEasing),
      leanSign,
      geometry: journalHologramConfig.ambientSweepGeometry,
      radius: journalHologramConfig.ambientSweepRadius,
      loopCount: journalHologramConfig.ambientSweepLoopCount,
      envelopeShape: journalHologramConfig.ambientSweepEnvelopeShape,
      onFrame: tiltElement ? ({ progress, proximity, x, y }) => {
        // Same tiltX/tiltY sign convention useCardLiftPhysics's own
        // composeAndApply uses for live pointer tilt, so an ambient-swept
        // card and a live-hovered one lean the same way for the same x/y.
        const maxDeg = journalHologramConfig.ambientTiltMaxDegrees;
        if (progress >= 1) {
          tiltElement.style.removeProperty('--reveal-tilt-x');
          tiltElement.style.removeProperty('--reveal-tilt-y');
          return;
        }
        tiltElement.style.setProperty('--reveal-tilt-x', `${(-y * proximity * maxDeg).toFixed(3)}deg`);
        tiltElement.style.setProperty('--reveal-tilt-y', `${(x * proximity * maxDeg).toFixed(3)}deg`);
      } : undefined,
    });
    // ambientSweepSignature already covers every journalHologramConfig
    // field this effect reads (see its own definition above) — listing
    // each one individually here too would be redundant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stackActiveSlide,
    hasHoverPointer,
    prefersReducedMotion,
    isVisible,
    shellVisible,
    journalHologramConfig.enabled,
    journalHologramConfig.ambientSweepEnabled,
    ambientSweepSignature,
    slot.index,
  ]);

  const setInteractionRef = useCallback((element: HTMLAnchorElement | null) => {
    visibilityRef.current = element;
    liftInteractionRef(element);
    proximityRef(element);
  }, [liftInteractionRef, proximityRef]);

  const article = renderedView === 'articles' ? slot.article : null;
  const lab = renderedView === 'labs' ? slot.lab : null;
  // Keep an otherwise-empty side's surface mounted as an inert, transparent
  // placeholder. Lab-only cards can then fade in from an already-rendered
  // influenced field, and article-only cards can fade away without their
  // canvas disappearing at the content swap point.
  const payloadArticle = article ?? (!lab ? slot.article : null);
  const payloadLab = lab ?? (!article ? slot.lab : null);
  const href = article?.href ?? lab?.canonicalPath ?? '#';
  const title = article?.title ?? lab?.title ?? '';
  const activeIsExternal = Boolean(
    article?.forceExternalNavigation && article.externalUrl,
  );
  // Content fade-out (phase 'out') and fade-in (phase 'in') share one
  // duration — neither direction is specified differently. Content stays
  // hidden (opacity 0, no transition needed) through phase 'color': the
  // color change only starts once information has fully left, per the
  // sequential (not concurrent) choreography this card implements.
  const contentDurationMs = config.contentFadeDurationMs;
  const easingCss = resolveAbstractPostDockEasing(config.fadeEasing);
  const contentHidden = phase === 'out' || phase === 'color';
  const activePalette = colorView === 'labs'
    ? influencedPalette
    : basePalette;
  const inactiveStackPresentation = stackPresentation?.state === 'inactive';
  const stackAppearanceStyle = stackPresentation ? {
    '--article-card-appearance-duration': `${stackPresentation.transitionDurationMs}ms`,
    '--article-card-appearance-easing': stackPresentation.transitionEasingCss,
    '--article-card-appearance-delay': `${stackPresentation.transitionDelayMs}ms`,
    // The gradient-mesh cover's own timing — deliberately separate from
    // the three vars above (which stay tied to the tilt sub-phase for this
    // card's text/scrim cross-fades). Set unconditionally, in both
    // directions, since stackNeutralSurface below transitions both ways
    // (fading away as this card becomes active, fading back in as it
    // becomes a neighbor).
    '--article-card-gradient-reveal-duration': `${stackPresentation.gradientRevealDurationMs}ms`,
    '--article-card-gradient-reveal-easing': stackPresentation.gradientRevealEasingCss,
    '--article-card-gradient-reveal-delay': `${stackPresentation.transitionDelayMs}ms`,
    '--article-card-gradient-reveal-blur': `${stackPresentation.gradientRevealBlurPx}px`,
    // Overrides ArticleCard.module.css's own [data-appearance='neutral']
    // block's fixed label/meta/title/excerpt/separator/CTA color and topic-
    // tag border-color, making both operator-tunable instead of the two
    // hardcoded hex values that block previously always resolved to. Only
    // while inactive — appearance is already 'gradient' for the active
    // card (see the ArticleCard call below), so these two custom
    // properties are simply unread there regardless, but omitting them
    // outright keeps this object's own intent legible without relying on
    // that.
    ...(inactiveStackPresentation ? {
      '--article-card-label-color': stackPresentation.textColor,
      '--article-card-meta-color': stackPresentation.textColor,
      '--article-card-topic-color': stackPresentation.textColor,
      '--article-card-title-color': stackPresentation.textColor,
      '--article-card-excerpt-color': stackPresentation.textColor,
      '--article-card-separator-color': stackPresentation.textColor,
      '--article-card-cta-color': stackPresentation.textColor,
      '--article-card-graphic-border-color': stackPresentation.topicBorderColor,
    } : null),
  } as CSSProperties : undefined;
  const background = (
    <div
      className={`absolute inset-0 overflow-hidden ${cardRadius}`}
      style={{
        background: getArticleCardFallbackBackground(visualSlide.seed),
      }}
    >
      {isVisible && (targetHasFace || renderedHasFace) ? (
        <LiquidGradientAdapter
          slide={visualSlide}
          motion={motion}
          config={gradientConfig}
          palette={activePalette}
          hologramConfig={journalHologramConfig}
          hologramInteraction={interactionRef}
          hologramDampingAttackMs={ctaConfig.proximityAttackMs}
          hologramDampingReleaseMs={ctaConfig.proximityReleaseMs}
        />
      ) : null}
      {stackPresentation ? (
        <div
          aria-hidden="true"
          className={styles.stackNeutralSurface}
          data-visible={inactiveStackPresentation ? 'true' : 'false'}
          // Only while this card is actually crossing the neighbor/active
          // boundary (never at rest, either fully covered or fully
          // uncovered) — see styles.module.css's own [data-transitioning]
          // rule for the blur-to-focus effect this gates.
          data-transitioning={stackPresentationTransitioning ? 'true' : undefined}
          // borderColor reuses stackPresentation.cardBorderColor — the
          // exact same resolvedNeighborTextColor this card's own
          // label/meta/title/excerpt/CTA text already uses, at reduced
          // opacity (CardStack.tsx's own resolvedNeighborCardBorderColor,
          // deriveTransparentTint(resolvedNeighborTextColor,
          // neighborBorderColorOffset)), so the perimeter this element's
          // own 3px border reads as the identical ink as the text, just
          // faded, not a lighter/darker relative or an independent color
          // choice. background-clip:border-box (styles.module.css) is what
          // makes that reading hold — backgroundColor extends under the
          // border ring itself so the translucent border blends against a
          // stable flat surface, not the LiquidGradientAdapter mesh
          // rendered underneath this element. Only visible on a neighbor
          // card (opacity 0 on the active one, see data-visible above) —
          // harmless to set unconditionally on every slot.
          style={{
            backgroundColor: stackPresentation.surfaceColor,
            borderColor: stackPresentation.cardBorderColor,
          }}
        />
      ) : null}
    </div>
  );
  const slotStyle = {
    left: `${slot.position.leftPx}px`,
    top: `${slot.position.topPx}px`,
    width: `${cardWidthPx}px`,
    height: `${cardHeightPx}px`,
    '--fade-opacity': shellVisible ? 1 : 0,
    '--fade-duration': prefersReducedMotion
      ? '0ms'
      : `${contentDurationMs}ms`,
    '--fade-easing': easingCss,
    '--reveal-opacity': 1,
    '--reveal-offset-y': '0px',
    '--reveal-tilt-x': '0deg',
    '--reveal-tilt-y': '0deg',
    '--reveal-tilt-perspective': `${ctaConfig.tiltPerspectivePx}px`,
  } as CSSProperties;
  const contentStyle = {
    opacity: !renderedHasFace || contentHidden ? 0 : 1,
    transition: prefersReducedMotion
      ? 'none'
      : `opacity ${contentDurationMs}ms ${easingCss}`,
  } as CSSProperties;

  const cardContent = (
    <>
      <div ref={liftRef} className={styles.physics}>
        <div
          ref={shadowRef}
          className={`${styles.fadeSurface} ${cardRadius}`}
        >
          {payloadArticle || payloadLab ? (
            <ArticleCard
              title={payloadArticle?.title ?? payloadLab?.title ?? ''}
              excerpt={payloadArticle?.excerpt ?? payloadLab?.excerpt}
              topic={payloadArticle?.topic ?? payloadLab?.tech[0]}
              date={
                payloadArticle?.date ??
                payloadLab?.formattedDate ??
                payloadLab?.date
              }
              readingTime={
                payloadArticle?.readingTime ??
                payloadLab?.tech.slice(1, 3).join(' · ') ??
                undefined
              }
              href={href}
              externalUrl={payloadArticle?.externalUrl}
              forceExternalNavigation={
                payloadArticle?.forceExternalNavigation
              }
              seed={visualSlide.seed}
              interactive="parent-link"
              physics="none"
              aspectRatio="fill"
              typographyScale="dock"
              contentInsetRem={gradientConfig.dockContentInsetRem}
              contentInsetWideRem={gradientConfig.dockContentInsetWideRem}
              contentBlockHeight="clamp(5rem, 26cqh, 8rem)"
              contentStyle={contentStyle}
              appearance={inactiveStackPresentation ? 'neutral' : 'gradient'}
              excerptVisible={layoutConfig.descriptionVisible}
              excerptHoverOnly={stackActiveSlide ? false : layoutConfig.descriptionHoverReveal}
              ctaHoverOnly={!titleAndSummaryOnly}
              ctaHoverDurationMs={stackPresentation?.ctaHoverDurationMs}
              ctaHoverEasingCss={stackPresentation?.ctaHoverEasingCss}
              ctaHoverDelayMs={stackPresentation?.ctaHoverDelayMs}
              ctaLabel={payloadLab ? 'View lab' : 'Read article'}
              contentMode={titleAndSummaryOnly ? 'title-and-summary' : 'full'}
              className={cardRadius}
              style={stackAppearanceStyle}
              background={background}
            />
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <Link
      ref={setInteractionRef}
      href={href}
      aria-disabled={transitioning || !renderedHasFace}
      aria-hidden={!renderedHasFace || inactiveStackPresentation}
      aria-label={title || undefined}
      className={`${styles.slot} ${styles.fadeSlot} group`}
      data-active-has-face={shellVisible ? 'true' : 'false'}
      data-transitioning={transitioning ? 'true' : 'false'}
      data-introductory={titleAndSummaryOnly ? 'true' : undefined}
      rel={activeIsExternal ? 'noreferrer' : undefined}
      style={slotStyle}
      tabIndex={titleAndSummaryOnly || !renderedHasFace || transitioning ? -1 : undefined}
      target={activeIsExternal ? '_blank' : undefined}
      onClick={event => {
        if (titleAndSummaryOnly || transitioning || !renderedHasFace) event.preventDefault();
      }}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPointerDown={event => {
        handlePointerDown(event);
        handleHologramTouchStart(event);
      }}
      onPointerMove={handleHologramTouchMove}
      onPointerUp={event => {
        handleRelease();
        handleHologramTouchEnd(event);
      }}
      onPointerCancel={event => {
        handleRelease();
        handleHologramTouchEnd(event);
      }}
      onPointerLeave={event => {
        if (pressedRef.current) handleRelease();
        handleHologramTouchEnd(event);
      }}
    >
      {cardContent}
    </Link>
  );
}

export type AbstractJournalLabCollectionProps = {
  articles: SliderContentSlide[];
  labs: LabSummary[];
  config: AbstractJournalLabCollectionConfig;
  /** Opt-in physics slider mode — see AbstractJournalLabCollectionSliderConfig.
   * Omitted/absent defaults to 'grid', the original, untouched behavior. */
  sliderConfig?: AbstractJournalLabCollectionSliderConfig;
  introductionConfig?: AbstractPostDockIntroductionConfig;
  gradientConfig: LiquidSliderConfig;
  paletteConfig: AbstractPostDockPaletteConfig;
  hueInfluenceConfig: AbstractPostDockHueInfluenceConfig;
  layoutConfig: AbstractPostDockLayoutConfig;
  journalHologramConfig: AbstractPostDockHologramConfig;
  labCardConfig: AbstractMetalLabCardConfig;
  headingConfig: SectionHeadingConfig;
  containerBg: string;
  containerWidthPx: number;
  enforceCardWidthBounds: boolean;
};

export function AbstractJournalLabCollection({
  articles,
  labs,
  config: suppliedConfig,
  sliderConfig: suppliedSliderConfig,
  introductionConfig,
  gradientConfig,
  paletteConfig,
  hueInfluenceConfig,
  layoutConfig,
  journalHologramConfig,
  labCardConfig,
  containerBg,
  containerWidthPx,
  enforceCardWidthBounds,
}: AbstractJournalLabCollectionProps) {
  const config = useMemo(
    () => normalizeAbstractJournalLabCollectionConfig(suppliedConfig),
    [suppliedConfig],
  );
  const sliderConfig = useMemo(
    () => normalizeAbstractJournalLabCollectionSliderConfig(suppliedSliderConfig),
    [suppliedSliderConfig],
  );
  const prefersReducedMotion = usePrefersReducedMotion();
  const motion = useLiquidSliderMotion(gradientConfig);
  const normalizedPalette = useMemo(
    () => normalizeAbstractPostDockPaletteConfig(paletteConfig),
    [paletteConfig],
  );
  const normalizedHueInfluence = useMemo(
    () => normalizeAbstractPostDockHueInfluenceConfig(hueInfluenceConfig),
    [hueInfluenceConfig],
  );
  const normalizedLabCardConfig = useMemo(
    () => normalizeAbstractMetalLabCardConfig(labCardConfig),
    [labCardConfig],
  );
  const labOutputTreatment = useMemo(
    () => resolveAbstractMetalLabOutputTreatment(normalizedLabCardConfig),
    [normalizedLabCardConfig],
  );
  const labHologramConfig = useMemo(
    () => resolveAbstractMetalLabHologramConfig(normalizedLabCardConfig),
    [normalizedLabCardConfig],
  );
  const labSlides = useMemo(
    () => labs.map((lab, index) => toAbstractMetalLabSlide(lab, index)),
    [labs],
  );
  const articlePalettes = useMemo(() => buildDeckPaletteStates({
    slides: articles,
    paletteConfig: normalizedPalette,
    hueInfluenceConfig: normalizedHueInfluence,
    activeIndex: Math.min(7, Math.max(0, articles.length - 1)),
  }), [articles, normalizedHueInfluence, normalizedPalette]);
  const labPalettes = useMemo(() => buildDeckPaletteStates({
    slides: labSlides,
    paletteConfig: normalizedPalette,
    hueInfluenceConfig: normalizedHueInfluence,
    activeIndex: null,
  }), [labSlides, normalizedHueInfluence, normalizedPalette]);
  const hueFadeInfluenceConfigs = useMemo(() => {
    const transition = {
      ...normalizedHueInfluence,
      transitionEnabled: true,
      transitionDurationMs: config.fadeDurationMs,
      transitionEasing: config.fadeEasing,
    };
    return {
      base: { ...transition, enabled: false },
      influenced: { ...transition, enabled: true },
    };
  }, [
    config.fadeDurationMs,
    config.fadeEasing,
    normalizedHueInfluence,
  ]);
  const hueFadeArticleBasePalettes = useMemo(() => buildDeckPaletteStates({
    slides: articles,
    paletteConfig: normalizedPalette,
    hueInfluenceConfig: hueFadeInfluenceConfigs.base,
    activeIndex: Math.min(7, Math.max(0, articles.length - 1)),
  }), [
    articles,
    hueFadeInfluenceConfigs.base,
    normalizedPalette,
  ]);
  const hueFadeArticleInfluencedPalettes = useMemo(
    () => buildDeckPaletteStates({
      slides: articles,
      paletteConfig: normalizedPalette,
      hueInfluenceConfig: hueFadeInfluenceConfigs.influenced,
      activeIndex: Math.min(7, Math.max(0, articles.length - 1)),
    }),
    [
      articles,
      hueFadeInfluenceConfigs.influenced,
      normalizedPalette,
    ],
  );
  const hueFadeLabBasePalettes = useMemo(() => buildDeckPaletteStates({
    slides: labSlides,
    paletteConfig: normalizedPalette,
    hueInfluenceConfig: hueFadeInfluenceConfigs.base,
    activeIndex: null,
  }), [
    hueFadeInfluenceConfigs.base,
    labSlides,
    normalizedPalette,
  ]);
  const hueFadeLabInfluencedPalettes = useMemo(
    () => buildDeckPaletteStates({
      slides: labSlides,
      paletteConfig: normalizedPalette,
      hueInfluenceConfig: hueFadeInfluenceConfigs.influenced,
      activeIndex: null,
    }),
    [
      hueFadeInfluenceConfigs.influenced,
      labSlides,
      normalizedPalette,
    ],
  );
  const labFallbacks = useMemo(
    () => labSlides.map(slide => getAbstractMetalLabFallbackBackground(
      slide.seed,
      labOutputTreatment,
    )),
    [labOutputTreatment, labSlides],
  );
  const collectionLayout = useMemo(
    () => buildAbstractJournalLabFlipLayout({
      articles,
      labs,
      layoutConfig,
      containerWidthPx,
      flipConfig: config,
      enforceCardWidthBounds,
    }),
    [
      articles,
      containerWidthPx,
      enforceCardWidthBounds,
      labs,
      layoutConfig,
      config,
    ],
  );
  const cardRevealSchedule = useMemo(
    () => buildCardRevealSchedule(collectionLayout.slots.length, introductionConfig),
    [collectionLayout.slots.length, introductionConfig],
  );

  const resolveAvailableView = useCallback((
    requested: AbstractJournalLabCollectionView,
  ) => {
    if (requested === 'labs' && labs.length > 0) return 'labs';
    if (requested === 'articles' && articles.length > 0) return 'articles';
    return labs.length > 0 ? 'labs' : 'articles';
  }, [articles.length, labs.length]);
  const [activeView, setActiveView] =
    useState<AbstractJournalLabCollectionView>(
      () => resolveAvailableView(config.initialView),
    );
  const [renderedView, setRenderedView] =
    useState<AbstractJournalLabCollectionView>(
      () => resolveAvailableView(config.initialView),
    );
  const [colorView, setColorView] =
    useState<AbstractJournalLabCollectionView>(
      () => resolveAvailableView(config.initialView),
    );
  const [fadePhase, setFadePhase] = useState<HueFadePhase>('idle');
  const [transitioning, setTransitioning] = useState(false);
  const initialHeight = activeView === 'labs'
    ? collectionLayout.labHeightPx
    : collectionLayout.articleHeightPx;
  const [fieldHeightPx, setFieldHeightPx] = useState(initialHeight);
  const [viewportHeightPx, setViewportHeightPx] = useState(0);
  const [perspectiveOriginYPx, setPerspectiveOriginYPx] = useState(0);
  const transitionTimerRef = useRef(0);
  const contentSwapTimerRef = useRef(0);
  const colorSettleTimerRef = useRef(0);
  const heightTimerRef = useRef(0);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const authoredInitialViewRef = useRef(config.initialView);
  const authoredPresentationModeRef = useRef(config.presentationMode);
  const articleTabRef = useRef<HTMLButtonElement | null>(null);
  const labTabRef = useRef<HTMLButtonElement | null>(null);

  const clearTransitionTimers = useCallback(() => {
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = 0;
    }
    if (contentSwapTimerRef.current) {
      window.clearTimeout(contentSwapTimerRef.current);
      contentSwapTimerRef.current = 0;
    }
    if (colorSettleTimerRef.current) {
      window.clearTimeout(colorSettleTimerRef.current);
      colorSettleTimerRef.current = 0;
    }
    if (heightTimerRef.current) {
      window.clearTimeout(heightTimerRef.current);
      heightTimerRef.current = 0;
    }
  }, []);

  const updateSceneOrigin = useCallback((targetFieldHeightPx: number) => {
    if (typeof window === 'undefined') return;
    const nextViewportHeightPx = Math.max(1, window.innerHeight);
    setViewportHeightPx(nextViewportHeightPx);
    const field = fieldRef.current;
    if (!field) return;
    setPerspectiveOriginYPx(resolveAbstractJournalLabPerspectiveOriginY({
      fieldTopPx: field.getBoundingClientRect().top,
      fieldHeightPx: targetFieldHeightPx,
      viewportHeightPx: nextViewportHeightPx,
    }));
  }, []);

  const selectView = useCallback((
    requested: AbstractJournalLabCollectionView,
    focusTab = false,
  ) => {
    const nextView = resolveAvailableView(requested);
    if (nextView === activeView) return;
    clearTransitionTimers();
    if (focusTab) {
      (nextView === 'articles'
        ? articleTabRef.current
        : labTabRef.current)?.focus();
    }
    const hueFadeActive =
      config.presentationMode === 'hue-fade-through';
    // Content is already invisible if we're past the fade-out leg of a prior
    // (still in-flight) transition — reversing from there never needs to
    // fade it out a second time, so the color-then-fade-in tail is enough.
    const contentAlreadyHidden = hueFadeActive &&
      !prefersReducedMotion &&
      (fadePhase === 'color' || fadePhase === 'in');
    const totalMs = prefersReducedMotion
      ? 0
      : hueFadeActive
        ? contentAlreadyHidden
          ? config.fadeDurationMs + config.contentFadeDurationMs
          : 2 * config.contentFadeDurationMs + config.fadeDurationMs
        : collectionLayout.schedule.totalMs;
    const nextHeight = nextView === 'labs'
      ? collectionLayout.labHeightPx
      : collectionLayout.articleHeightPx;
    // Expansion adopts the target height immediately; collapse deliberately
    // retains the outgoing height until the final card settles. Center the
    // shared camera within that same transition-time field, not the shorter
    // eventual field, so a visible outgoing lab-only row cannot be projected
    // against an origin that has already jumped far above it.
    updateSceneOrigin(Math.max(fieldHeightPx, nextHeight));

    if (nextHeight >= fieldHeightPx || totalMs === 0) {
      setFieldHeightPx(nextHeight);
    } else {
      heightTimerRef.current = window.setTimeout(() => {
        heightTimerRef.current = 0;
        setFieldHeightPx(nextHeight);
      }, totalMs);
    }
    setActiveView(nextView);
    setTransitioning(totalMs > 0);
    if (!hueFadeActive || totalMs === 0) {
      setRenderedView(nextView);
      setColorView(nextView);
      setFadePhase('idle');
    } else if (contentAlreadyHidden) {
      // Content is already faded out from a prior in-flight transition —
      // retarget the color straight away (GradientRenderer continues
      // smoothly from whatever hue it's currently mid-transition to, never
      // snapping) and only fade information back in once it settles.
      setColorView(nextView);
      setFadePhase('color');
      colorSettleTimerRef.current = window.setTimeout(() => {
        colorSettleTimerRef.current = 0;
        setRenderedView(nextView);
        setFadePhase('in');
      }, config.fadeDurationMs);
    } else {
      // Fresh, sequential three-phase transition: fade information out in
      // full, only then retarget the color, only then fade the new view's
      // information back in. Each leg's own timer schedules the next.
      setFadePhase('out');
      contentSwapTimerRef.current = window.setTimeout(() => {
        contentSwapTimerRef.current = 0;
        setColorView(nextView);
        setFadePhase('color');
        colorSettleTimerRef.current = window.setTimeout(() => {
          colorSettleTimerRef.current = 0;
          setRenderedView(nextView);
          setFadePhase('in');
        }, config.fadeDurationMs);
      }, config.contentFadeDurationMs);
    }
    if (totalMs > 0) {
      transitionTimerRef.current = window.setTimeout(() => {
        transitionTimerRef.current = 0;
        setRenderedView(nextView);
        setColorView(nextView);
        setFadePhase('idle');
        setTransitioning(false);
      }, totalMs);
    }
  }, [
    activeView,
    clearTransitionTimers,
    collectionLayout.articleHeightPx,
    collectionLayout.labHeightPx,
    collectionLayout.schedule.totalMs,
    config.contentFadeDurationMs,
    config.fadeDurationMs,
    config.presentationMode,
    fadePhase,
    fieldHeightPx,
    prefersReducedMotion,
    resolveAvailableView,
    updateSceneOrigin,
  ]);

  useEffect(() => {
    if (authoredInitialViewRef.current === config.initialView) return;
    authoredInitialViewRef.current = config.initialView;
    selectView(config.initialView);
  }, [config.initialView, selectView]);

  useEffect(() => {
    if (
      authoredPresentationModeRef.current === config.presentationMode
    ) return;
    authoredPresentationModeRef.current = config.presentationMode;
    clearTransitionTimers();
    setRenderedView(activeView);
    setColorView(activeView);
    setFadePhase('idle');
    setTransitioning(false);
  }, [
    activeView,
    clearTransitionTimers,
    config.presentationMode,
  ]);

  useEffect(() => {
    if (activeView === 'labs' && labs.length === 0 && articles.length > 0) {
      selectView('articles');
    } else if (
      activeView === 'articles' &&
      articles.length === 0 &&
      labs.length > 0
    ) {
      selectView('labs');
    }
  }, [
    activeView,
    articles.length,
    labs.length,
    selectView,
  ]);

  useEffect(() => {
    if (transitioning) return;
    setFieldHeightPx(
      activeView === 'labs'
        ? collectionLayout.labHeightPx
        : collectionLayout.articleHeightPx,
    );
  }, [
    activeView,
    collectionLayout.articleHeightPx,
    collectionLayout.labHeightPx,
    transitioning,
  ]);

  useEffect(() => clearTransitionTimers, [clearTransitionTimers]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => {
      setViewportHeightPx(Math.max(1, window.innerHeight));
      if (!transitioning) updateSceneOrigin(fieldHeightPx);
    };
    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [fieldHeightPx, transitioning, updateSceneOrigin]);

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === 'ArrowRight' || event.key === 'End') {
      event.preventDefault();
      selectView(labs.length > 0 ? 'labs' : 'articles', true);
    } else if (event.key === 'ArrowLeft' || event.key === 'Home') {
      event.preventDefault();
      selectView(articles.length > 0 ? 'articles' : 'labs', true);
    }
  };

  // Slider layoutMode renders a capped subset of the SAME paired slots grid
  // mode uses, driven by the SAME selectView/activeView/renderedView/
  // colorView/fadePhase/transitioning state — never a parallel transition
  // mechanism. Only how a slot is positioned differs (Swiper's own drag
  // physics instead of the scatter field's absolute leftPx/topPx); which
  // face is showing, and how it transitions between views, is identical.
  const sliderCappedCount = Math.max(
    sliderConfig.wideGroupSize,
    sliderConfig.narrowGroupSize,
  ) * sliderConfig.groupCount;
  const sliderSlots = useMemo(
    () => collectionLayout.slots.slice(0, sliderCappedCount).map(slot => ({
      ...slot,
      // Rendered position is always (0, 0): each slot fills its own Swiper
      // slide exactly, which is what positions it on screen. The grid's own
      // scatter position only matters for the wave-timing schedule below.
      position: { leftPx: 0, topPx: 0, rotationDeg: 0 },
    })),
    [collectionLayout.slots, sliderCappedCount],
  );
  const sliderSchedule = useMemo(() => buildAbstractJournalLabFlipSchedule({
    // Synthetic single-row positions purely for the existing 45°
    // spatial-wave timing math (buildAbstractJournalLabFlipSchedule) — a
    // left-to-right row is the natural equivalent of the scatter field's
    // multi-row layout for a single draggable row.
    positions: sliderSlots.map((_, index) => ({
      leftPx: index * collectionLayout.cellStrideX,
      topPx: 0,
      rotationDeg: 0,
    })),
    cardWidthPx: collectionLayout.cardWidthPx,
    cardHeightPx: collectionLayout.cardHeightPx,
    cellStrideX: collectionLayout.cellStrideX,
    config,
  }), [
    sliderSlots,
    collectionLayout.cardWidthPx,
    collectionLayout.cardHeightPx,
    collectionLayout.cellStrideX,
    config,
  ]);
  const sliderRevealSchedule = useMemo(
    () => buildCardRevealSchedule(sliderSlots.length, introductionConfig),
    [sliderSlots.length, introductionConfig],
  );

  // Shared by both layoutModes: the exact same per-slot rendering grid mode
  // already used inline in its own .map() below, extracted so slider mode
  // reuses it verbatim instead of a second, parallel card-rendering path.
  const renderCollectionCard = useCallback((
    slot: AbstractJournalLabFlipSlot,
    timing: AbstractJournalLabFlipTiming,
    reveal: CardReveal,
  ) => {
    const key = `${slot.article?.slug ?? 'empty'}:${slot.lab?.slug ?? 'empty'}`;

    if (config.presentationMode === 'hue-fade-through') {
      const visualSlide = slot.article ?? labSlides[slot.index];
      if (!visualSlide) return null;
      const basePalette = slot.article
        ? hueFadeArticleBasePalettes?.[slot.index] ?? null
        : hueFadeLabBasePalettes?.[slot.index] ?? null;
      const influencedPalette = slot.article
        ? hueFadeArticleInfluencedPalettes?.[slot.index] ?? null
        : hueFadeLabInfluencedPalettes?.[slot.index] ?? null;

      return (
        <AbstractJournalLabHueFadeCard
          key={key}
          slot={slot}
          targetView={activeView}
          renderedView={renderedView}
          colorView={colorView}
          phase={fadePhase}
          transitioning={transitioning}
          prefersReducedMotion={prefersReducedMotion}
          config={config}
          motion={motion}
          gradientConfig={gradientConfig}
          basePalette={basePalette}
          influencedPalette={influencedPalette}
          visualSlide={visualSlide}
          journalHologramConfig={journalHologramConfig}
          cardWidthPx={collectionLayout.cardWidthPx}
          cardHeightPx={collectionLayout.cardHeightPx}
          cardRadius={layoutConfig.cardRadius}
          layoutConfig={layoutConfig}
          reveal={reveal}
        />
      );
    }

    return (
      <AbstractJournalLabFlipCard
        key={key}
        slot={slot}
        timing={timing}
        activeView={activeView}
        transitioning={transitioning}
        prefersReducedMotion={prefersReducedMotion}
        config={config}
        motion={motion}
        gradientConfig={gradientConfig}
        articlePalette={articlePalettes?.[slot.index] ?? null}
        labSlide={labSlides[slot.index] ?? null}
        labPalette={labPalettes?.[slot.index] ?? null}
        journalHologramConfig={journalHologramConfig}
        labHologramConfig={labHologramConfig}
        labOutputTreatment={labOutputTreatment}
        labFallback={labFallbacks[slot.index] ?? null}
        cardWidthPx={collectionLayout.cardWidthPx}
        cardHeightPx={collectionLayout.cardHeightPx}
        cardRadius={layoutConfig.cardRadius}
        layoutConfig={layoutConfig}
        reveal={reveal}
      />
    );
  }, [
    activeView,
    articlePalettes,
    collectionLayout.cardHeightPx,
    collectionLayout.cardWidthPx,
    colorView,
    config,
    fadePhase,
    gradientConfig,
    hueFadeArticleBasePalettes,
    hueFadeArticleInfluencedPalettes,
    hueFadeLabBasePalettes,
    hueFadeLabInfluencedPalettes,
    journalHologramConfig,
    labFallbacks,
    labHologramConfig,
    labOutputTreatment,
    labPalettes,
    labSlides,
    layoutConfig,
    motion,
    prefersReducedMotion,
    renderedView,
    transitioning,
  ]);

  // Narrow/touch devices reuse pages/about.tsx's own dock (AbstractPostDock,
  // narrowDetectionSource="viewport") instead of CardSlider's bespoke Swiper
  // drag surface — see AbstractJournalLabCollectionNarrowDeckSlider's own
  // doc comment for why.
  const isNarrowSlider = useIsNarrowViewport(sliderConfig.narrowBreakpointPx);

  const effectivePerspectivePx = resolveAbstractJournalLabPerspectivePx({
    perspectivePx: config.perspectivePx,
    cardWidthPx: collectionLayout.cardWidthPx,
    viewportHeightPx,
  });
  // Shared 3D camera custom properties only — slider mode's own single-row
  // height comes from its Swiper's card height, never this grid field's
  // animated multi-row `fieldHeightPx`/`topPeekPx`, which only make sense
  // for the scattered, uncapped layout.
  const sharedPerspectiveStyle = {
    '--flip-perspective': `${effectivePerspectivePx}px`,
    '--flip-perspective-origin-y': `${perspectiveOriginYPx}px`,
    '--card-tilt-perspective': `${CTA.tiltPerspectivePx}px`,
  } as CSSProperties;
  const fieldStyle = {
    ...sharedPerspectiveStyle,
    height: `${fieldHeightPx}px`,
    marginTop: collectionLayout.topPeekPx > 0
      ? `-${collectionLayout.topPeekPx}px`
      : undefined,
  } as CSSProperties;

  return (
    <div className="w-full">
      <div
        className={styles.collectionHeader}
      >
        <div
          aria-label="Journal collection"
          className={styles.tabs}
          role="tablist"
        >
          <button
            ref={articleTabRef}
            id="abstract-articles-tab"
            type="button"
            role="tab"
            aria-controls="abstract-journal-lab-panel"
            aria-selected={activeView === 'articles'}
            className={styles.tab}
            disabled={articles.length === 0}
            tabIndex={activeView === 'articles' ? 0 : -1}
            onClick={() => selectView('articles')}
            onKeyDown={handleTabKeyDown}
          >
            Articles
          </button>
          <span aria-hidden="true" className={styles.separator}>|</span>
          <button
            ref={labTabRef}
            id="abstract-labs-tab"
            type="button"
            role="tab"
            aria-controls="abstract-journal-lab-panel"
            aria-selected={activeView === 'labs'}
            className={styles.tab}
            disabled={labs.length === 0}
            tabIndex={activeView === 'labs' ? 0 : -1}
            onClick={() => selectView('labs')}
            onKeyDown={handleTabKeyDown}
          >
            Labs
          </button>
        </div>
        {sliderConfig.layoutMode !== 'slider' && activeView === 'labs' ? (
          <Link
            href="/labs"
            className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-300"
          >
            View all →
          </Link>
        ) : null}
      </div>
      {sliderConfig.layoutMode === 'slider' ? (
        isNarrowSlider ? (
          <AbstractJournalLabCollectionNarrowDeckSlider
            activeView={activeView}
            slides={activeView === 'articles' ? articles : labSlides}
            sliderConfig={sliderConfig}
            layoutConfig={layoutConfig}
            paletteConfig={normalizedPalette}
            hueInfluenceConfig={
              activeView === 'labs'
                ? hueFadeInfluenceConfigs.influenced
                : hueFadeInfluenceConfigs.base
            }
            gradientConfig={gradientConfig}
            contentFadeDurationMs={config.contentFadeDurationMs}
            contentFadeEasingCss={resolveAbstractPostDockEasing(config.fadeEasing)}
            prefersReducedMotion={prefersReducedMotion}
          />
        ) : (
          <AbstractJournalLabCollectionCardSlider
            activeView={activeView}
            slots={sliderSlots}
            timings={sliderSchedule.timings}
            reveals={sliderRevealSchedule}
            renderCard={renderCollectionCard}
            sliderConfig={sliderConfig}
            cardWidthPx={collectionLayout.cardWidthPx}
            cardHeightPx={collectionLayout.cardHeightPx}
            cellStrideX={collectionLayout.cellStrideX}
            fieldStyle={sharedPerspectiveStyle}
            dataProjectionPhase={
              transitioning && config.presentationMode === 'flip'
                ? 'flipping'
                : transitioning
                  ? 'fading'
                  : 'resting'
            }
            transitioning={transitioning}
            prefersReducedMotion={prefersReducedMotion}
          />
        )
      ) : (
        <>
          <div aria-hidden="true" style={{ paddingBottom: `${collectionLayout.topPeekPx}px` }} />
          <div
            ref={fieldRef}
            id="abstract-journal-lab-panel"
            role="tabpanel"
            aria-busy={transitioning}
            aria-labelledby={
              activeView === 'labs'
                ? 'abstract-labs-tab'
                : 'abstract-articles-tab'
            }
            className={styles.field}
            data-active-view={activeView}
            data-transitioning={transitioning ? 'true' : 'false'}
            data-projection-phase={
              transitioning && config.presentationMode === 'flip'
                ? 'flipping'
                : transitioning
                  ? 'fading'
                  : 'resting'
            }
            style={fieldStyle}
          >
            {collectionLayout.slots.map(slot => renderCollectionCard(
              slot,
              collectionLayout.schedule.timings[slot.index],
              cardRevealSchedule[slot.index] ?? {
                enabled: false,
                startMs: 0,
                durationMs: 0,
                easingCss: '',
                offsetYPercent: 0,
              },
            ))}
          </div>
        </>
      )}
      <p
        aria-live="polite"
        aria-atomic="true"
        className={styles.liveRegion}
      >
        {transitioning
          ? ''
          : `Showing ${activeView === 'labs' ? 'Labs' : 'Articles'}, ${
              activeView === 'labs' ? labs.length : articles.length
            } items`}
      </p>
    </div>
  );
}

export default AbstractJournalLabCollection;
