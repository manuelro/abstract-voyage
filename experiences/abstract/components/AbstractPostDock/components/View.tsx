'use client';

import type { CSSProperties, MutableRefObject, WheelEvent as ReactWheelEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MagnificationDock, {
  type MagnificationDockProps,
} from '../../../../../components/MagnificationDock';
import { clamp } from '../../../../../helpers/clamp';
import ArticleCard from '../../../../../components/ArticleCard';
import {
  DEFAULT_ABSTRACT_POST_DOCK_GRADIENT_PERFORMANCE_CONFIG,
  resolveAbstractPostDockEasing,
  type AbstractPostDockGradientPerformanceConfig,
  type AbstractPostDockHueInfluenceConfig,
  type AbstractPostDockPaletteConfig,
  type AbstractPostDockLayoutConfig,
  type AbstractPostDockHologramConfig,
} from '../config/registered';
import { AbstractPostDockScatter } from './Scatter';
import {
  buildDeckPaletteStates,
} from '../../../helpers/deckPalette';
import { resolveAbstractPostDockGradientActivity } from '../helpers/gradientActivity';
import { abstractPostDockActiveOpacityStyle } from '../helpers/activeOpacityReveal';
import { colorToRgba } from '../helpers/misc';
import { renderEmphasisText, stripEmphasisMarkup } from '../../../../../helpers/textEmphasis';
import { usePrefersReducedMotion, useDockGradientAvailability, useIsomorphicLayoutEffect } from '../hooks/browserState';
import { useBreakpointTier } from '../../../../../components/useBreakpointTier';
import { useSliderVisualMetrics } from '../hooks/viewport';
import { useDetailsRevealGate } from '../hooks/detailsRevealGate';
import type { useLiquidSliderMotion } from '../hooks/motion';
import {
  LiquidGradientAdapter,
  useLiquidGradientPointerMotion,
} from './GradientRenderer';
import { AbstractDeckSwiper } from './DeckSwiper';
import { AbstractDeckPager } from './DeckPager';
import type { LiquidSliderConfig, SliderSlide } from '../config/legacy';
import styles from '../styles.module.css';

export function AbstractPostDockView({
  slides,
  config,
  gradientPerformanceConfig,
  paletteConfig,
  hueInfluenceConfig,
  layoutConfig,
  hologramConfig,
  editorialSurfaceColor,
  motion,
  activeIndex,
  setActiveIndex,
  embedded = false,
  narrowDetectionSource = 'container',
  narrowBreakpointPx = 1180,
  externallyControlledActiveIndex = null,
  dragTiltEnabled = true,
  gaussianProximityOffsetXRefs = null,
  gaussianProximityDomRefs = null,
}: {
  slides: SliderSlide[];
  config: LiquidSliderConfig;
  gradientPerformanceConfig?: AbstractPostDockGradientPerformanceConfig;
  paletteConfig?: AbstractPostDockPaletteConfig;
  hueInfluenceConfig: AbstractPostDockHueInfluenceConfig;
  layoutConfig: AbstractPostDockLayoutConfig;
  hologramConfig: AbstractPostDockHologramConfig;
  editorialSurfaceColor?: string;
  motion: ReturnType<typeof useLiquidSliderMotion>;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  embedded?: boolean;
  narrowDetectionSource?: 'container' | 'viewport';
  /** Below this viewport/container width, the dock switches into its
   * narrow/touch presentation (deck/pager mobile behavior, mobile peek
   * sizing, narrow shadow/dimming/pointer tuning). Defaults to 1180 — the
   * dock's own original hardcoded threshold, unchanged for every existing
   * consumer. A host whose OWN separate mobile breakpoint sits lower than
   * 1180 (about.tsx swaps to AboutMobileCardStack at the shared md
   * breakpoint, 768px) should pass that same value here — otherwise the
   * dock quietly re-enters its narrow presentation up to ~400px before the
   * host's own "wide device" layout actually ends, so the accordion's
   * config visibly changes mid-way through what the host still considers
   * its wide-device range. */
  narrowBreakpointPx?: number;
  /** Forwarded to MagnificationDock's own controlledActiveIndex — only
   * non-null when the page hosting this dock supplied AbstractPostDock its
   * own activeIndex/onActiveIndexChange (see AbstractPostDock's own doc
   * comment), so every existing (uncontrolled) consumer is unaffected. */
  externallyControlledActiveIndex?: number | null;
  /** Forwarded to AbstractDeckSwiper's own `dragTiltEnabled` — see its doc
   * comment. Defaults to `true`, unchanged for every existing consumer. */
  dragTiltEnabled?: boolean;
  /** Gaussian pan curve, proximity morph only (useGaussianProximityMorph) —
   * one live per-frame offsetX ref per slide index, forwarded straight
   * through to that slide's own LiquidGradientAdapter. null/absent for
   * every existing consumer, matching that hook's own default-off shape. */
  gaussianProximityOffsetXRefs?: ReadonlyArray<MutableRefObject<number> | null> | null;
  /** Same shape, the matching per-slide usePointerProximity DOM ref
   * (attached to that slide's own wrapper) driving the offsets above. */
  gaussianProximityDomRefs?: ReadonlyArray<((element: HTMLDivElement | null) => void) | null> | null;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const [measuredViewportWidth, setMeasuredViewportWidth] = useState(0);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const [measuredDockWidth, setMeasuredDockWidth] = useState(0);
  const wheelMotionRef = useRef({
    active: false,
    x: 0,
    y: 0,
    releaseTimer: 0,
  });
  // Settled = the slide movement for the current activeIndex has finished.
  // Navigation un-settles immediately (fade-outs run, fade-ins hold); a timer
  // re-settles after the motion window so the stagger plays on a stationary card.
  const [isDockSettled, setIsDockSettled] = useState(true);
  const dockSettleTimerRef = useRef(0);
  const {
    viewport,
    layout,
    excerptLines: configuredExcerptLines,
  } = useSliderVisualMetrics(config);

  // Live breakpoint — resolves paletteConfig.gradientScale/gradientNoise's
  // own base/Wide/Lg triplet (see buildDeckPaletteStates's own `tier` doc
  // comment). Previously omitted here, which silently defaulted to
  // 'mobile' regardless of the page's actual viewport — every consumer of
  // this view (both /abstract's journal/lab grid and /about's narrative
  // dock) always got the mobile-tier gradient zoom/noise on desktop too,
  // and — since this component's own resulting paletteScale/paletteNoise
  // unconditionally wins over any caller-side shaderColorScale/
  // shaderColorRandomness override (webgl.ts's `paletteScale ?? config....`
  // fallback) — that wrong-tier value silently overrode whatever a caller
  // (e.g. about.tsx's own now-removed resolvedGradientScale/
  // resolvedGradientNoise mechanism) thought it was applying instead.
  const { tier } = useBreakpointTier();
  // Journal and labs now share one source-state builder. Passing activeIndex
  // here preserves the journal's inactive chroma duck exactly; the lab grid
  // passes null because it has no active-card concept.
  const deckPaletteStates = useMemo(() => buildDeckPaletteStates({
    slides,
    paletteConfig,
    hueInfluenceConfig,
    activeIndex,
    tier,
  }), [activeIndex, hueInfluenceConfig, paletteConfig, slides, tier]);
  // Gaussian visual test mode (AbstractPostDockPaletteConfig.
  // gaussianVisualTestModeEnabled) — an art-direction aid, not a page-owned
  // feature this component needs its own prop for: it's entirely derived
  // from the palette config already flowing through here, so equal card
  // sizing and disabled distance dimming both fall out of one boolean read
  // here rather than new plumbing threaded in from outside.
  const gaussianVisualTestModeEnabled = Boolean(paletteConfig?.gaussianVisualTestModeEnabled);

  const transitionMs = Math.round(clamp(config.dockTransitionMs, 100, 1600));
  // Settle window: content fades (meta/CTA/shadow) hold until the slide movement
  // finishes, so nothing fades in mid-motion. 0 = auto (match the transition).
  const settleMs = config.dockContentSettleMs > 0
    ? Math.round(clamp(config.dockContentSettleMs, 40, 2000))
    : transitionMs;

  // Activation and interaction are deliberately separate concerns. A newly
  // active card keeps its editorial details hidden until its movement window
  // has fully elapsed; merely touching the already-active card does not reset
  // this state, so its date/reading time/CTA remain stable under the finger.
  // useDetailsRevealGate (hooks/detailsRevealGate.ts) — shared with
  // AboutMobileAccordionItem's own mobile accordion, PLAN-ABOUT-MOBILE-
  // ACCORDION-COLLAPSE-REVEAL-FIX.md.
  const detailsVisibleIndex = useDetailsRevealGate<number | null>({
    activeKey: activeIndex,
    hiddenValue: null,
    settleMs,
    prefersReducedMotion,
  });

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsDockSettled(true);
      return;
    }
    setIsDockSettled(false);
    if (dockSettleTimerRef.current) window.clearTimeout(dockSettleTimerRef.current);
    dockSettleTimerRef.current = window.setTimeout(() => {
      dockSettleTimerRef.current = 0;
      setIsDockSettled(true);
    }, settleMs);
    return () => {
      if (dockSettleTimerRef.current) {
        window.clearTimeout(dockSettleTimerRef.current);
        dockSettleTimerRef.current = 0;
      }
    };
  }, [activeIndex, prefersReducedMotion, settleMs]);

  // Swipe gestures un-settle the dock while the finger is down (content fades
  // hold); a cancelled swipe re-settles after a short window. A committed swipe
  // changes activeIndex, which re-runs the settle effect above.
  const handleSwipeStateChange = useCallback((swiping: boolean) => {
    if (swiping) {
      if (dockSettleTimerRef.current) {
        window.clearTimeout(dockSettleTimerRef.current);
        dockSettleTimerRef.current = 0;
      }
      setIsDockSettled(false);
      return;
    }
    if (dockSettleTimerRef.current) window.clearTimeout(dockSettleTimerRef.current);
    dockSettleTimerRef.current = window.setTimeout(() => {
      dockSettleTimerRef.current = 0;
      setIsDockSettled(true);
    }, settleMs);
  }, [settleMs]);

  const revealDurationMs = Math.round(clamp(config.dockRevealDurationMs, 0, 1200));
  const revealStaggerMs = Math.round(clamp(config.dockRevealStaggerMs, 0, 300));
  const transitionEasing = resolveAbstractPostDockEasing(config.dockTransitionEasing);
  const revealEasing = resolveAbstractPostDockEasing(config.dockRevealEasing);
  const pointerStepPx = Math.round(clamp(config.dockPointerStepPx, 8, 120));
  const wheelStepPx = Math.round(clamp(config.dockWheelStepPx, 8, 160));
  // The section occupies the full width supplied by the page. Its measured width is
  // the authoritative responsive source, avoiding stale SSR viewport assumptions.
  // That equivalence only holds when the dock's own container spans (near
  // enough) the full viewport by design — both the showcase variant and
  // abstract.tsx's own PageContainer-wrapped "embedded" JOURNAL usage satisfy
  // that. narrowDetectionSource='viewport' is a separate, explicit opt-in
  // (see AbstractPostDockProps) for hosts whose own column is deliberately
  // narrower than the viewport even on desktop (about.tsx's 62%-width split)
  // — there, the container width would misclassify an ordinary desktop
  // browsing context as a narrow/touch device.
  const reliableViewportWidth = narrowDetectionSource === 'viewport'
    ? viewport.width
    : (measuredViewportWidth || viewport.width);
  const isNarrowDock = reliableViewportWidth < narrowBreakpointPx;
  // Opt-in alternate presentation, wide viewports only — narrow viewports
  // always keep the existing dock/deck behavior regardless of this setting.
  const isScatterMode = !isNarrowDock && layoutConfig.mode === 'scattered';
  // Only meaningful in slider mode — scattered/deck are never affected.
  const sliderOrientation = layoutConfig.mode === 'slider' ? layoutConfig.orientation : 'horizontal';
  const dockMobilePeekPx = clamp(config.dockMobilePeekRem, 0.5, 3) * viewport.rem;
  // Measure the real full-width container so active sizing and neighbour peeks use
  // one source without viewport-unit or scrollbar drift.
  const dockAvailableWidth = Math.max(
    1,
    measuredDockWidth || reliableViewportWidth,
  );
  const dockMobileBehavior = config.dockMobileBehavior;
  const isDeckMode = isNarrowDock && dockMobileBehavior === 'deck';
  const isPagerMode = isNarrowDock && dockMobileBehavior === 'pager';
  // Narrow: the active card fills the container minus exactly one peek per side,
  // computed directly in px (no percentage round-trip / clamp), so it lands at
  // container − 2·peek. The travelling deck fans its stacks inside that free
  // space. Desktop keeps the percentage model.
  const dockActiveWidth = isNarrowDock
    ? Math.max(1, dockAvailableWidth - dockMobilePeekPx * 2)
    : dockAvailableWidth * clamp(config.dockActivePercent, 20, 70) / 100;
  const dockActivePct = clamp((dockActiveWidth / dockAvailableWidth) * 100, 1, 100);
  // Horizontal derives its height from the measured container width via the
  // card aspect ratio — vertical has no such width-driven analogue (the axis
  // being sized is height itself), so it instead trusts its parent to supply
  // a real bounded height (see the dockRef wrapper's style below) and this
  // value goes unused in that branch.
  const dockHeight = dockActiveWidth * layout.aspectHeight / layout.aspectWidth;
  // Pending-queue transparency: resolve the number of visible slivers without
  // overloading the item position indicator.
  const deckMaxSlivers = Math.round(clamp(config.dockDeckMaxSlivers, 1, 12));
  const pendingCount = Math.max(0, slides.length - 1 - activeIndex);
  const effectivePendingSlivers = pendingCount > 5
    ? Math.min(pendingCount, Math.max(5, deckMaxSlivers))
    : pendingCount;
  const showItemIndicator = config.dockCounterEnabled && slides.length > 0;
  const legacyActiveOnlyGradient = isNarrowDock
    ? config.dockMobileActiveOnlyIdleDrift
    : config.dockDesktopActiveOnlyIdleDrift;
  const resolvedGradientPerformanceConfig = useMemo<AbstractPostDockGradientPerformanceConfig>(
    () => {
      const base = gradientPerformanceConfig ?? {
        ...DEFAULT_ABSTRACT_POST_DOCK_GRADIENT_PERFORMANCE_CONFIG,
        activityPolicy: legacyActiveOnlyGradient ? 'active-only' : 'all',
      };
      // Narrow-only override: a no-op for any caller that never sets
      // activityPolicyNarrow (about.tsx, slider.tsx today), so this only
      // affects a caller that opts in (abstract.tsx).
      return isNarrowDock && base.activityPolicyNarrow
        ? { ...base, activityPolicy: base.activityPolicyNarrow }
        : base;
    },
    [gradientPerformanceConfig, legacyActiveOnlyGradient, isNarrowDock],
  );
  const { isDockVisible, isDocumentVisible } = useDockGradientAvailability(
    sectionRef,
    resolvedGradientPerformanceConfig.pauseWhenOffscreen,
  );
  const dockShadowEnabled =
    config.dockShadowEnabled &&
    !(isNarrowDock && config.dockShadowDisableOnNarrow);
  const dockDistanceDimmingMaxOpacity = isNarrowDock
    ? config.dockNarrowDistanceDimmingMaxOpacity
    : config.dockDistanceDimmingMaxOpacity;
  const dockHoverActivationEnabled =
    !isNarrowDock && config.dockDesktopPointerMode !== 'pan';
  const dockPointerPanningEnabled =
    config.dockPanningEnabled &&
    (isNarrowDock || config.dockDesktopPointerMode !== 'hover');
  // Narrow presentations get a shorter-reaching shadow than desktop — same
  // color/opacity (same darkness), but scaled-down offset/blur/spread. The
  // desktop values are tuned for the scattered grid's generous inter-card
  // gaps; unscaled, the same blur/offset spans straight across the deck/
  // pager's much narrower peek gap and never fades out before the next
  // card, regardless of how correctly it's rounded to match the card shape.
  const dockShadowReachScale = isNarrowDock
    ? clamp(config.dockShadowNarrowScale, 0, 1)
    : 1;
  const dockActiveItemBoxShadow = dockShadowEnabled
    ? `${Math.round(config.dockShadowOffsetXPx * dockShadowReachScale)}px ${Math.round(config.dockShadowOffsetYPx * dockShadowReachScale)}px ${Math.round(config.dockShadowBlurPx * dockShadowReachScale)}px ${Math.round(config.dockShadowSpreadPx * dockShadowReachScale)}px ${colorToRgba(config.dockShadowColor, config.dockShadowOpacity)}`
    : undefined;

  useIsomorphicLayoutEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof window === 'undefined') return;

    let frame = 0;
    const readWidth = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const nextWidth = Math.max(1, node.getBoundingClientRect().width);
        setMeasuredViewportWidth(current => (
          Math.abs(current - nextWidth) < 0.5 ? current : nextWidth
        ));
      });
    };

    readWidth();

    if (typeof window.ResizeObserver === 'function') {
      const resizeObserver = new window.ResizeObserver(readWidth);
      resizeObserver.observe(node);
      return () => {
        if (frame) window.cancelAnimationFrame(frame);
        resizeObserver.disconnect();
      };
    }

    window.addEventListener('resize', readWidth);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', readWidth);
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    const node = dockRef.current;
    if (!node || typeof window === 'undefined') return;

    let frame = 0;
    const readWidth = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const nextWidth = Math.max(1, node.getBoundingClientRect().width);
        setMeasuredDockWidth(current => (
          Math.abs(current - nextWidth) < 0.5 ? current : nextWidth
        ));
      });
    };

    readWidth();

    if (typeof window.ResizeObserver === 'function') {
      const resizeObserver = new window.ResizeObserver(readWidth);
      resizeObserver.observe(node);
      return () => {
        if (frame) window.cancelAnimationFrame(frame);
        resizeObserver.disconnect();
      };
    }

    window.addEventListener('resize', readWidth);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', readWidth);
    };
  }, [isNarrowDock]);

  const getViewportSizePx = useCallback(() => {
    const rect = dockRef.current?.getBoundingClientRect();
    return {
      width: Math.max(1, rect?.width ?? window.innerWidth),
      height: Math.max(1, rect?.height ?? window.innerHeight),
    };
  }, []);
  const handleGradientPointerDown = useLiquidGradientPointerMotion(motion, getViewportSizePx);

  const handleWheelLiquidMotion = useCallback((event: ReactWheelEvent<HTMLElement>) => {
    if (!config.navigationWheelEnabled) return;

    const rect = dockRef.current?.getBoundingClientRect();
    if (!rect) return;

    const primaryDelta = Math.abs(event.deltaX) >= Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY;
    if (!Number.isFinite(primaryDelta) || primaryDelta === 0) return;

    const state = wheelMotionRef.current;
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const centerX = rect.left + width * 0.5;
    const centerY = rect.top + height * 0.5;
    const sensitivity = clamp(config.navigationWheelSensitivity, 0.2, 2);
    const liquidGain = clamp(config.dockWheelLiquidGain, 0.4, 3);
    const nextX = clamp(
      (state.active ? state.x : centerX) - primaryDelta * sensitivity * liquidGain,
      centerX - width * 0.42,
      centerX + width * 0.42,
    );

    if (!state.active) {
      state.active = true;
      state.x = centerX;
      state.y = centerY;
      motion.startDrag(centerX, centerY, width, height);
    }

    state.x = nextX;
    motion.updateDrag(nextX, centerY, width, height);

    if (state.releaseTimer) window.clearTimeout(state.releaseTimer);
    state.releaseTimer = window.setTimeout(() => {
      state.active = false;
      state.releaseTimer = 0;
      motion.endDrag();
    }, 260);
  }, [
    config.dockWheelLiquidGain,
    config.navigationWheelEnabled,
    config.navigationWheelSensitivity,
    motion,
  ]);

  useEffect(() => () => {
    const state = wheelMotionRef.current;
    if (state.releaseTimer) window.clearTimeout(state.releaseTimer);
    if (state.active) motion.endDrag();
  }, [motion]);

  const handleDockActiveIndexChange = useCallback((index: number | null) => {
    if (index == null) return;
    setActiveIndex(index);
  }, [setActiveIndex]);

  // Shared between the horizontal and vertical <MagnificationDock> branches
  // below — only the dock's own orientation-specific props differ; what each
  // slide renders is identical either way.
  const renderDockItem: MagnificationDockProps<SliderSlide>['renderItem'] = (
    { item, index, isActive, isRevealed, distanceDimmingOpacity },
  ) => {
    const gradientActivity = resolveAbstractPostDockGradientActivity({
      config: resolvedGradientPerformanceConfig,
      isActive: index === activeIndex,
      isDockVisible,
      isDocumentVisible,
    });

    if (layoutConfig.minimalModeEnabled) {
      // Slider's own minimal mode: unlike scattered mode's bare rectangle
      // (many small cards, a color swatch reads fine), a slider only ever
      // shows one active slide plus a couple of peeks — a fully empty slide
      // would read as broken rather than restrained, so this shows the
      // item's own title over its own background instead of nothing.
      return (
        <div
          ref={gaussianProximityDomRefs?.[index] ?? undefined}
          className={[
            'relative flex h-full w-full flex-col justify-start overflow-hidden',
            layoutConfig.minimalModeContentPadding,
          ].join(' ')}
          style={{ backgroundColor: item.accent }}
        >
          {layoutConfig.minimalModeGradientEnabled ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
              <LiquidGradientAdapter
                slide={item}
                motion={motion}
                config={config}
                activity={gradientActivity}
                palette={deckPaletteStates?.[index] ?? null}
                gaussianProximityOffsetXRef={gaussianProximityOffsetXRefs?.[index] ?? null}
              />
            </div>
          ) : null}
          <p
            className={[
              'relative z-10 m-0 text-white [text-wrap:balance] transition-opacity',
              layoutConfig.minimalModeFontSize,
              layoutConfig.minimalModeTextMaxWidth,
            ].join(' ')}
            style={abstractPostDockActiveOpacityStyle({
              isActive,
              transitionMs,
              easingCss: transitionEasing,
            })}
          >
            {renderEmphasisText(
              item.title,
              layoutConfig.minimalModeTextDimOpacity,
              layoutConfig.minimalModeTextEmphasisOpacity,
            )}
          </p>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 z-[1] bg-black ${styles.dimmingOverlay}`}
            style={{
              '--abstract-dock-dimming-opacity': distanceDimmingOpacity,
              // .dimmingOverlay keeps a persistent will-change:opacity layer
              // by design (avoids promotion churn while dimming updates on
              // every navigation frame) — correct for the gradient-card
              // branch below, but a permanently promoted layer over a flat
              // fractional-height slide is exactly what produces the hairline
              // seam between adjacent slides in a vertical/slot dock (see
              // the reveal-wrapper willChange fix in MagnificationDock.tsx
              // for the same class of bug). Minimal mode's overlay is inert
              // most of the time, so the transient promotion cost here is
              // negligible — override back to the default per-instance.
              willChange: 'auto',
            } as CSSProperties}
          />
        </div>
      );
    }

    return (
      <div className="relative h-full w-full overflow-hidden">
        <ArticleCard
          title={stripEmphasisMarkup(item.title)}
          excerpt={item.excerpt}
          topic={item.topic}
          date={item.date}
          readingTime={item.readingTime}
          href={item.href}
          externalUrl={item.externalUrl}
          forceExternalNavigation={item.forceExternalNavigation}
          seed={item.seed}
          excerptLines={1}
          aspectRatio="fill"
          typographyScale="dock"
          contentBlockHeight={isNarrowDock ? undefined : 'clamp(11rem, 24dvh, 14rem)'}
          contentInsetRem={config.dockContentInsetRem}
          contentInsetWideRem={config.dockContentInsetWideRem}
          detailsVisible={isActive && isRevealed && detailsVisibleIndex === index}
          background={(
            <LiquidGradientAdapter
              slide={item}
              motion={motion}
              config={config}
              activity={gradientActivity}
              palette={deckPaletteStates?.[index] ?? null}
            />
          )}
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-black ${styles.dimmingOverlay}`}
          style={{
            '--abstract-dock-dimming-opacity': distanceDimmingOpacity,
          } as CSSProperties}
        />
      </div>
    );
  };

  // AbstractDeckSwiper/AbstractDeckPager are both Swiper-virtualTranslate-
  // driven and own their own drag/gesture handling end to end — the legacy
  // gradient-pan-drag system below (built for MagnificationDock's own
  // hover/drag interaction) has no role during either of their swipes and
  // would only fire redundantly alongside Swiper's own handling.
  const usesOwnDragHandling = isScatterMode || isDeckMode || isPagerMode;

  return (
    <section
      ref={sectionRef}
      aria-label="Abstract post dock"
      onPointerDown={usesOwnDragHandling ? undefined : handleGradientPointerDown}
      onWheel={usesOwnDragHandling ? undefined : handleWheelLiquidMotion}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 'none',
        boxSizing: 'border-box',
        minHeight: embedded ? undefined : '78dvh',
        display: 'grid',
        alignItems: embedded ? 'start' : 'center',
        justifyItems: 'stretch',
        // The trailing breathing room only makes sense for a horizontal dock
        // living in normal page flow (abstract.tsx's JOURNAL usage) — a
        // vertical dock is pinned to a CSS-bounded, overflow:hidden column
        // (about.tsx), where this padding just eats into the visible dock
        // instead of adding page-flow space below it.
        padding: embedded && sliderOrientation !== 'vertical'
          ? '0 0 clamp(4rem, 8dvh, 7rem)'
          : 0,
        userSelect: 'none',
      }}
    >
      <div
        ref={dockRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 'none',
          // Scattered mode is a plain, auto-height block — no fixed height /
          // overflow:hidden — so the page's own scroll grows to fit every
          // card, unlike the slider/deck's fixed-height viewport-like box.
          // Vertical slider mode also skips the computed px height: unlike
          // horizontal (width-driven aspect ratio), vertical has no such
          // source to derive a height from, so it fills whatever bounded
          // height its own parent already provides instead.
          ...(isScatterMode
            ? {}
            : sliderOrientation === 'vertical'
              ? { height: '100%', overflow: 'hidden' }
              : { height: `${dockHeight}px`, overflowX: 'hidden', overflowY: 'visible' }),
        }}
      >
        {isScatterMode ? (
        <AbstractPostDockScatter
          items={slides}
          motion={motion}
          config={config}
          excerptLines={configuredExcerptLines}
          paletteStates={deckPaletteStates}
          layoutConfig={layoutConfig}
          hologramConfig={hologramConfig}
          containerWidthPx={Math.round(dockAvailableWidth)}
          editorialSurfaceColor={editorialSurfaceColor}
          prefersReducedMotion={prefersReducedMotion}
        />
        ) : isDeckMode ? (
        <AbstractDeckSwiper
          slides={slides}
          config={config}
          motion={motion}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          cardWidthPx={Math.round(dockActiveWidth)}
          containerWidthPx={Math.round(dockAvailableWidth)}
          dimmingMaxOpacity={config.dockDistanceDimmingEnabled ? dockDistanceDimmingMaxOpacity : 0}
          transitionEasingCss={transitionEasing}
          revealEasingCss={revealEasing}
          prefersReducedMotion={prefersReducedMotion}
          isDockSettled={isDockSettled}
          detailsVisibleIndex={detailsVisibleIndex}
          onSwipeStateChange={handleSwipeStateChange}
          gradientPerformanceConfig={resolvedGradientPerformanceConfig}
          isDockVisible={isDockVisible}
          isDocumentVisible={isDocumentVisible}
          dockActiveItemBoxShadow={dockActiveItemBoxShadow}
          paletteStates={deckPaletteStates}
          layoutConfig={layoutConfig}
          hologramConfig={hologramConfig}
          dragTiltEnabled={dragTiltEnabled}
        />
        ) : isPagerMode ? (
        <AbstractDeckPager
          slides={slides}
          config={config}
          motion={motion}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          cardWidthPx={Math.round(dockActiveWidth)}
          containerWidthPx={Math.round(dockAvailableWidth)}
          dimmingMaxOpacity={config.dockDistanceDimmingEnabled ? dockDistanceDimmingMaxOpacity : 0}
          transitionEasingCss={transitionEasing}
          revealEasingCss={revealEasing}
          prefersReducedMotion={prefersReducedMotion}
          isDockSettled={isDockSettled}
          detailsVisibleIndex={detailsVisibleIndex}
          onSwipeStateChange={handleSwipeStateChange}
          gradientPerformanceConfig={resolvedGradientPerformanceConfig}
          isDockVisible={isDockVisible}
          isDocumentVisible={isDocumentVisible}
          dockActiveItemBoxShadow={dockActiveItemBoxShadow}
          paletteStates={deckPaletteStates}
          layoutConfig={layoutConfig}
          hologramConfig={hologramConfig}
        />
        ) : sliderOrientation === 'vertical' ? (
        <MagnificationDock
          items={slides}
          getItemKey={slide => slide.slug}
          orientation="vertical"
          activePct={dockActivePct}
          initialActiveIndex={activeIndex}
          restoreActiveIndex={activeIndex}
          transitionMs={transitionMs}
          transitionEasing={transitionEasing}
          revealEnabled={config.dockRevealEnabled}
          revealMode={config.dockRevealMode}
          revealOverlapMs={config.dockRevealOverlapMs}
          revealFirstDelayMs={config.dockRevealFirstDelayMs}
          revealStaggerMs={revealStaggerMs}
          revealDurationMs={revealDurationMs}
          revealEasing={revealEasing}
          revealDistribution={config.dockRevealDistribution}
          revealCadenceAmount={config.dockRevealCadenceAmount}
          revealOffsetX={`${config.dockRevealOffsetXVw}vw`}
          pointerStepPx={pointerStepPx}
          wheelStepPx={wheelStepPx}
          // Vertical uses the plain flex-basis slot model, not the
          // preserveContentLayout+contentSizeStrategy="active"+activeFill*
          // combo the horizontal branch uses below — that combo drives a
          // compositor-transform path MagnificationDock hardcodes
          // horizontal-only internally (its own source comment: "vertical &
          // slot-strategy docks keep the flex model"), so passing it here
          // would be silently inert. This is the same combination
          // MagnificationDock's own Storybook reference (VerticalArticleDock)
          // already uses successfully.
          preserveContentLayout={false}
          contentSizeStrategy="slot"
          fixedContentSizePx={Math.round(dockActiveWidth)}
          equalizeSizes={gaussianVisualTestModeEnabled}
          distanceDimmingEnabled={gaussianVisualTestModeEnabled ? false : config.dockDistanceDimmingEnabled}
          distanceDimmingMaxOpacity={dockDistanceDimmingMaxOpacity}
          distanceDimmingBaselineOpacity={config.dockDistanceDimmingBaselineOpacity}
          distanceDimmingPower={config.dockDistanceDimmingPower}
          distanceDimmingEasing={config.dockDistanceDimmingEasing}
          hoverActivationEnabled={dockHoverActivationEnabled}
          panningEnabled={dockPointerPanningEnabled}
          panCursorEnabled={config.dockPanCursorEnabled}
          naturalPanDirection={config.dockNaturalPanDirection}
          activeItemBoxShadow={dockActiveItemBoxShadow}
          className={`${styles.dock} ${isDockSettled ? styles.dockSettled : ''} h-full w-full`}
          style={{
            '--abstract-dock-shadow': dockActiveItemBoxShadow ?? 'none',
            '--abstract-dock-motion-ms': `${transitionMs}ms`,
          } as CSSProperties}
          prefersReducedMotion={prefersReducedMotion}
          onActiveIndexChange={handleDockActiveIndexChange}
          controlledActiveIndex={externallyControlledActiveIndex}
          renderItem={renderDockItem}
        />
        ) : (
        <MagnificationDock
          items={slides}
          getItemKey={slide => slide.slug}
          orientation="horizontal"
          activePct={dockActivePct}
          initialActiveIndex={activeIndex}
          restoreActiveIndex={activeIndex}
          transitionMs={transitionMs}
          transitionEasing={transitionEasing}
          revealEnabled={config.dockRevealEnabled}
          revealMode={config.dockRevealMode}
          revealOverlapMs={config.dockRevealOverlapMs}
          revealFirstDelayMs={config.dockRevealFirstDelayMs}
          revealStaggerMs={revealStaggerMs}
          revealDurationMs={revealDurationMs}
          revealEasing={revealEasing}
          revealDistribution={config.dockRevealDistribution}
          revealCadenceAmount={config.dockRevealCadenceAmount}
          revealOffsetX={`${config.dockRevealOffsetXVw}vw`}
          pointerStepPx={pointerStepPx}
          wheelStepPx={wheelStepPx}
          preserveContentLayout
          contentSizeStrategy="active"
          fixedContentSizePx={Math.round(dockActiveWidth)}
          activeFillSizePx={isNarrowDock ? Math.round(dockActiveWidth) : undefined}
          activeFillPeekPx={isNarrowDock ? Math.round(dockMobilePeekPx) : undefined}
          activeFillAnchor={
            isNarrowDock && dockMobileBehavior === 'travel' ? 'progress' : 'center'
          }
          activeFillDeckDirection={config.dockDeckDirection}
          activeFillDeckStackPx={config.dockDeckStackPx}
          activeFillDeckDecay={config.dockDeckDecay}
          activeFillDeckMaxVisible={effectivePendingSlivers}
          equalizeSizes={gaussianVisualTestModeEnabled}
          distanceDimmingEnabled={gaussianVisualTestModeEnabled ? false : config.dockDistanceDimmingEnabled}
          distanceDimmingMaxOpacity={dockDistanceDimmingMaxOpacity}
          distanceDimmingBaselineOpacity={config.dockDistanceDimmingBaselineOpacity}
          distanceDimmingPower={config.dockDistanceDimmingPower}
          distanceDimmingEasing={config.dockDistanceDimmingEasing}
          hoverActivationEnabled={dockHoverActivationEnabled}
          panningEnabled={dockPointerPanningEnabled}
          panCursorEnabled={config.dockPanCursorEnabled}
          naturalPanDirection={config.dockNaturalPanDirection}
          activeItemBoxShadow={dockActiveItemBoxShadow}
          className={`${styles.dock} ${isDockSettled ? styles.dockSettled : ''}`}
          style={{
            '--abstract-dock-shadow': dockActiveItemBoxShadow ?? 'none',
            '--abstract-dock-motion-ms': `${transitionMs}ms`,
          } as CSSProperties}
          prefersReducedMotion={prefersReducedMotion}
          onActiveIndexChange={handleDockActiveIndexChange}
          controlledActiveIndex={externallyControlledActiveIndex}
          renderItem={renderDockItem}
        />
        )}
        {showItemIndicator && !isScatterMode ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-black/50 px-[0.8rem] py-[0.3rem] font-mono text-xs leading-none tracking-[0.08em] text-white/90 opacity-75 shadow-[0_4px_14px_rgba(0,0,0,0.35)] backdrop-blur-md"
            style={{ zIndex: slides.length + 5 }}
          >
            {`${activeIndex + 1} of ${slides.length}`}
          </div>
        ) : null}
      </div>
    </section>
  );
}
