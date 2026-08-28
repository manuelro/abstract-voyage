'use client';

import type { CSSProperties, MutableRefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperClass } from 'swiper';
import type { MagnificationDockDimmingEasing } from '../../../../../components/MagnificationDock';
import { clamp } from '../../../../../helpers/clamp';
import ArticleCard from '../../../../../components/ArticleCard';
import { DEFAULT_CTA_BUTTON_CONFIG } from '../../../../../components/CtaButton/config/registered';
import type { PointerProximityState } from '../../../../../components/proximity/usePointerProximity';
import {
  computeMagnificationDockDeckRevealOrder,
  computeMagnificationDockRevealSchedule,
} from '../../../../../helpers/magnificationDockRevealMath';
import { createCssEasingFunction } from '../../../../../helpers/cubicBezierEasing';
import type {
  AbstractPostDockGradientPerformanceConfig,
  AbstractPostDockHologramConfig,
  AbstractPostDockLayoutConfig,
} from '../config/registered';
import { resolveAbstractPostDockGradientActivity } from '../helpers/gradientActivity';
import { stripEmphasisMarkup } from '../../../../../helpers/textEmphasis';
import { useIsomorphicLayoutEffect } from '../hooks/browserState';
import type { useLiquidSliderMotion } from '../hooks/motion';
import {
  LiquidGradientAdapter,
  type DeckPaletteState,
} from './GradientRenderer';
import { easeDeckDimmingDistance } from './DeckSwiper';
import type { LiquidSliderConfig, SliderSlide } from '../config/legacy';
import styles from '../styles.module.css';

// Same tilt-physics constants AbstractDeckSwiper/ScatterCard's own hover tilt
// already use — touch and pointer read as the same physical scale rather
// than a separately-tuned "mobile tilt strength".
const CTA = DEFAULT_CTA_BUTTON_CONFIG;

// Small dead-zone around f=0/f=1 ("true rest") before the drag-coupled tilt
// signal engages — see its use in applyPagerPose. dragBaselineRef's own
// translate-based delta keeps f exactly 0 at genuine rest (no measurement
// residual to absorb here, unlike AbstractDeckSwiper's own REST_F_EPSILON,
// which is still compensating for swiper.progress's absolute-value drift in
// that file's own, unchanged design) — this one is now purely a deliberate,
// small buffer at the very start/end of a real gesture rather than a
// correctness requirement, so the same value carries over unchanged rather
// than being retuned or removed.
const REST_F_EPSILON = 0.08;

// At most one card's worth of peek is ever visible on either side of the
// active card in this spatial model (unlike AbstractDeckSwiper's multi-card
// golden-ratio fan) — gates both the WebGL gradient mount radius and the
// mount-time reveal's own tail count from the same single source.
const PAGER_VISIBLE_RADIUS = 2;

/*
 * AbstractDeckPager — the narrow/touch card pager, driven by Swiper.
 *
 * Direct manipulation first, same contract as AbstractDeckSwiper: the card
 * under the finger moves 1:1 with the drag, Swiper's own snap transition
 * animates commit/cancel with the project's easing and duration, and edge
 * overshoot (resistance-damped by Swiper upstream) rubber-bands the whole
 * pager — "no more items".
 *
 * Spatial model (fixed, centered anchor): unlike AbstractDeckSwiper's
 * travelling anchor (flush-left at the first card, flush-right at the last,
 * a golden-ratio tail fan only in the pending direction), every card here
 * rests at the SAME anchor position when active — exactly `peekPx` from the
 * container's left edge — so exactly one card-width's peek of the previous
 * card shows on the left and one peek of the next card shows on the right,
 * at every index including the first and last. One linear formula (`restX`)
 * replaces the deck's whole cumulative/decay tail-fan apparatus. Only the
 * active card ±PAGER_VISIBLE_RADIUS gets a mounted WebGL gradient —
 * anything further is off-canvas and doesn't need one.
 *
 * Drag-coupled tilt + hologram: identical mechanism to AbstractDeckSwiper —
 * the same signal (the two cards currently interpolating between rest
 * positions) feeds a `rotateY` tilt and the card's own hover-hologram
 * gradient response (`hologramConfig`), so a swipe reads as a physical,
 * light-catching card rather than a flat rectangle sliding sideways. See
 * AbstractDeckSwiper's own comment for why this is a separate, touch-native
 * signal distinct from desktop's mouse-proximity system.
 */
export function AbstractDeckPager({
  slides,
  config,
  motion,
  activeIndex,
  setActiveIndex,
  cardWidthPx,
  containerWidthPx,
  dimmingMaxOpacity,
  transitionEasingCss,
  revealEasingCss,
  prefersReducedMotion,
  isDockSettled,
  detailsVisibleIndex,
  onSwipeStateChange,
  gradientPerformanceConfig,
  isDockVisible,
  isDocumentVisible,
  dockActiveItemBoxShadow,
  paletteStates = null,
  layoutConfig,
  hologramConfig,
}: {
  slides: SliderSlide[];
  config: LiquidSliderConfig;
  motion: ReturnType<typeof useLiquidSliderMotion>;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  cardWidthPx: number;
  containerWidthPx: number;
  dimmingMaxOpacity: number;
  transitionEasingCss: string;
  revealEasingCss: string;
  prefersReducedMotion: boolean;
  isDockSettled: boolean;
  detailsVisibleIndex: number | null;
  onSwipeStateChange: (swiping: boolean) => void;
  gradientPerformanceConfig: AbstractPostDockGradientPerformanceConfig;
  isDockVisible: boolean;
  isDocumentVisible: boolean;
  dockActiveItemBoxShadow?: string;
  paletteStates?: Array<DeckPaletteState> | null;
  /** Card corner radius (layoutConfig.cardRadius) — reused verbatim from
   * scattered mode's own knob, see ArticleCard's className below. */
  layoutConfig: AbstractPostDockLayoutConfig;
  /** Drives the drag-coupled tilt/gradient response — see the file's own
   * top-of-file comment and applyPagerPose's hologram signal derivation. */
  hologramConfig: AbstractPostDockHologramConfig;
}) {
  const swiperRef = useRef<SwiperClass | null>(null);
  const initialSlideRef = useRef(activeIndex);
  // Last-written z/dim per slide so the pose only touches the DOM on change.
  const poseCacheRef = useRef<{ z: string[]; dim: string[] }>({ z: [], dim: [] });
  const introLayerRefs = useRef<Array<HTMLDivElement | null>>([]);
  // Nested one level inside introLayerRefs, carries the drag-coupled
  // perspective()/rotateY() tilt exclusively — kept off introLayerRefs
  // itself so no single element ever combines overflow:hidden+border-radius
  // with an active 3D transform (see applyPagerPose's tilt-writing comment
  // for why that combination loses its rounded-corner clip mid-gesture).
  const tiltLayerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const introOffsetsRef = useRef<number[]>([]);
  // One per slide, lazily created/reused (never recreated on re-render) —
  // handed straight to LiquidGradientAdapter's own hologramInteraction prop,
  // read on its rAF loop; see applyPagerPose for what writes into these.
  const hologramInteractionRefs = useRef<Array<MutableRefObject<PointerProximityState>>>([]);
  const getHologramInteractionRef = (index: number): MutableRefObject<PointerProximityState> => {
    const existing = hologramInteractionRefs.current[index];
    if (existing) return existing;
    const created: MutableRefObject<PointerProximityState> = { current: { proximity: 0, x: 0, y: 0 } };
    hologramInteractionRefs.current[index] = created;
    return created;
  };
  // Captured fresh at the start of each real drag gesture; null whenever no
  // gesture is active. While active, position is derived from the raw pixel
  // CHANGE in swiper.translate since the gesture's own start, divided by
  // this component's own cardW — never from swiper.progress, which
  // normalizes by Swiper's own internally-measured translatesDiff
  // (maxTranslate() - minTranslate()). Progress-based deltas were verified
  // live to still leave a smaller (~6.6px, down from ~23px) residual
  // asymmetry after a real committed drag to a non-adjacent index: a
  // subtraction cancels a constant additive bias in progress exactly, but
  // not a SCALE mismatch between Swiper's own translatesDiff/lastIndex step
  // and this component's own (separately rounded) cardWidthPx — and a scale
  // mismatch produces error proportional to distance traveled, matching
  // what was observed. Working entirely in raw translate px (Swiper's own
  // touchmove handling computes this from real, unrounded finger deltas —
  // see onTouchMove's `currentTranslate = diff + startTranslate`) divided
  // by this file's own cardW removes that dependency entirely: every other
  // position calculation in this file (restX, peekPx, rubberShiftPx) is
  // already in terms of cardW, so this keeps the drag delta in the exact
  // same coordinate space rather than converting through Swiper's own,
  // possibly slightly different, internal step size. Falls back to
  // swiper.activeIndex (always a clean integer) when no gesture is active —
  // mount, idle, or between drags. See applyPagerPose for where this is
  // consumed, handleSliderFirstMove for where it's captured, and the settle-
  // timeout (settleTimeoutRef) plus the two effects below for the clear
  // sites — a single clear point isn't enough under this component's
  // virtualTranslate mode (Swiper's own 'transitionend' is unreliable here;
  // see settleTimeoutRef's own comment).
  const dragBaselineRef = useRef<{ index: number; translatePx: number } | null>(null);
  // 0 = none pending, same sentinel convention as introFrameRef. Forces one
  // final, correct pose write after every touch ends — closes a gap where
  // Swiper's own slideTo() can silently skip emitting 'setTranslate' (its
  // early-return branch when the resolved target translate already equals
  // the current one) while still firing 'transitionEnd', leaving the pose
  // stuck at whatever partial value was last written. See handleSliderFirstMove
  // and the two effects below for why every other place dragBaselineRef is
  // nulled must also cancel this.
  const settleTimeoutRef = useRef(0);
  const clearSettleTimeout = useCallback(() => {
    if (settleTimeoutRef.current) {
      window.clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = 0;
    }
  }, []);
  const introFrameRef = useRef(0);
  const introActiveRef = useRef(false);
  const lastIntroConfigSignatureRef = useRef<string | null>(null);
  const introLayoutSizeRef = useRef({ cardWidthPx, containerWidthPx });
  const [swiperReady, setSwiperReady] = useState(false);
  const [mobileIntroComplete, setMobileIntroComplete] = useState(
    prefersReducedMotion || !config.dockRevealEnabled,
  );

  const speedMs = prefersReducedMotion
    ? 0
    : Math.round(clamp(config.dockSwipeSettleMs, 120, 1200));

  // Live layout/config snapshot so Swiper's per-frame listeners read fresh
  // values without re-subscribing.
  const deckLayoutRef = useRef({
    count: 0,
    cardW: 1,
    containerW: 1,
    gapPx: 0,
    dimEnabled: true,
    dimMax: 0.5,
    dimPower: 1,
    dimEasing: 'soft' as MagnificationDockDimmingEasing,
    easingCss: 'ease',
    speedMs: 560,
    prefersReducedMotion: false,
  });
  deckLayoutRef.current = {
    count: slides.length,
    cardW: Math.max(1, cardWidthPx),
    containerW: Math.max(1, containerWidthPx),
    gapPx: Math.max(0, layoutConfig.peekGapPx),
    dimEnabled: layoutConfig.peekDimmingEnabled,
    dimMax: Math.max(0, Math.min(1, dimmingMaxOpacity)),
    dimPower: clamp(config.dockDistanceDimmingPower, 0.1, 4),
    dimEasing: config.dockDistanceDimmingEasing,
    easingCss: transitionEasingCss,
    speedMs,
    prefersReducedMotion,
  };

  // The pager pose as a pure function of Swiper's CONTINUOUS progress.
  //
  // Direct-manipulation contract: the card the user touches moves 1:1 with the
  // finger — a card's rest-to-rest displacement across one index step is
  // exactly one card width. The pose is a linear blend between the two
  // adjacent integer rest poses at the drag fraction — exact finger mapping,
  // and Swiper's release transition animates the same blend for commit/cancel.
  // floor(a) keys the z-order, which automatically keeps the moving card on
  // top in BOTH directions. Edge overshoot (already resistance-damped by
  // Swiper) shifts the whole pager — the "no more items" spring.
  const applyPagerPose = useCallback((swiper: SwiperClass) => {
    const layout = deckLayoutRef.current;
    if (!layout.count || !swiper.slides?.length) return;
    const lastIndex = layout.count - 1;
    let a: number;
    let rubberShiftPx = 0;
    const baseline = dragBaselineRef.current;
    if (baseline) {
      // Mid-gesture: derive position from the raw pixel CHANGE in
      // swiper.translate since the gesture's own start, divided by this
      // file's own cardW (see dragBaselineRef's own comment for why this
      // avoids the residual a progress/lastIndex-based delta left behind).
      // Swiper's translate decreases as the index increases (LTR), so the
      // sign is inverted relative to a plain (now - baseline) difference.
      const rawTranslatePx = Number.isFinite(swiper.translate) ? swiper.translate : baseline.translatePx;
      const aRaw = baseline.index - (rawTranslatePx - baseline.translatePx) / layout.cardW;
      a = clamp(aRaw, 0, lastIndex);
      // Overshoot in card-width px (resistance-damped upstream): whole-pager rubber.
      rubberShiftPx = -(aRaw - a) * layout.cardW;
    } else {
      // No gesture active (mount, idle, between drags): swiper.activeIndex
      // is always a clean integer, nothing to blend or track continuously.
      a = clamp(swiper.activeIndex, 0, lastIndex);
    }
    const i0 = Math.min(Math.max(Math.floor(a), 0), Math.max(0, lastIndex - 1));
    const i1 = Math.min(i0 + 1, lastIndex);
    const f = lastIndex > 0 ? clamp(a - i0, 0, 1) : 0;

    // Fixed, centered anchor: every card, when active, rests exactly peekPx
    // from the container's left edge — symmetric peeks on both sides at
    // every index (not just some), replacing AbstractDeckSwiper's travelling
    // anchor + golden-ratio tail fan with one linear formula. peekPx is
    // derived from the two already-rounded px props this component
    // receives (mirroring how AbstractDeckSwiper derives its own freeW),
    // never recomputed from config.dockMobilePeekRem independently — an
    // independent rem-based recompute would drift off the real rounded
    // pixel layout Swiper is using, reintroducing the exact asymmetry this
    // spatial model exists to eliminate.
    const peekPx = Math.max(0, (layout.containerW - layout.cardW) / 2);
    // Rest x of card i when card k is active — pure function of depth (i-k).
    // gapPx (layoutConfig.peekGapPx) widens the step between adjacent rest
    // positions, opening visible separation between cards — it eats into
    // the peek margin above (less of each neighbor ends up visible within
    // the same reserved peekPx), not into the active card's own width.
    const restX = (k: number, i: number) => peekPx + (i - k) * (layout.cardW + layout.gapPx);
    const dimFor = (k: number, i: number) => {
      if (!layout.dimEnabled) return 0;
      const depth = Math.min(Math.abs(i - k), 1);
      return Math.pow(easeDeckDimmingDistance(depth, layout.dimEasing), layout.dimPower) * layout.dimMax;
    };
    const grid = swiper.slidesGrid;

    const cache = poseCacheRef.current;
    swiper.slides.forEach((slideEl, index) => {
      const el = slideEl as HTMLElement;
      const targetX =
        restX(i0, index)
        + (restX(i1, index) - restX(i0, index)) * f
        + rubberShiftPx
        + (introOffsetsRef.current[index] ?? 0);
      const naturalX = grid?.[index] ?? index * layout.cardW;
      el.style.transform = `translate3d(${(targetX - naturalX).toFixed(2)}px, 0, 0)`;
      // z keyed on i0 during an active drag: forward drags keep the outgoing
      // card on top while it slides off; backward drags put the returning
      // card on top. At idle rest, i0 is wrong exactly once in the whole
      // range — the very last index, where i0 is clamped to lastIndex-1
      // while f sits at 1 (every other index rests at f=0 with i0 already
      // equal to activeIndex) — so idle prefers the true settled index
      // (Math.round(a), trivially activeIndex whenever a is a clean integer)
      // instead; otherwise the second-to-last card would outrank the actual
      // active last card and paint over its rounded corner. Written only on
      // change — per-frame z churn forces WebKit to re-resolve stacking
      // contexts mid-gesture (compositing instability).
      const zAnchor = dragBaselineRef.current ? i0 : Math.round(a);
      const z = String(Math.max(1, layout.count + 2 - Math.abs(index - zAnchor)));
      if (cache.z[index] !== z) {
        cache.z[index] = z;
        el.style.zIndex = z;
      }
      const dim = (
        dimFor(i0, index) + (dimFor(i1, index) - dimFor(i0, index)) * f
      ).toFixed(4);
      if (cache.dim[index] !== dim) {
        cache.dim[index] = dim;
        el.style.setProperty('--abstract-dock-dimming-opacity', dim);
      }

      // Drag-coupled tilt/hologram signal — same shape as AbstractDeckSwiper's
      // own (spatial-model-independent: f/i0/i1 come from the position
      // derivation above, never from restX). Only the two cards actually
      // interpolating right now (i0 leaving, i1 arriving) get a nonzero
      // value — f sits at exactly 0 or 1 at true rest (including resting on
      // the very last item, where f lands on 1, not 0; see dragBaselineRef's
      // own comment for why rest is now exact, with no residual left for
      // REST_F_EPSILON to absorb — it's now a deliberate small buffer, not a
      // correctness requirement).
      const isMidGesture = f > REST_F_EPSILON && f < 1 - REST_F_EPSILON;
      const signedProgress = !isMidGesture
        ? 0
        : index === i0 ? -f
        : index === i1 ? f
        : 0;
      const hologramInteraction = getHologramInteractionRef(index);
      if (layout.prefersReducedMotion) {
        hologramInteraction.current.proximity = 0;
        hologramInteraction.current.x = 0;
        hologramInteraction.current.y = 0;
      } else {
        hologramInteraction.current.x = signedProgress;
        hologramInteraction.current.y = 0;
        hologramInteraction.current.proximity = Math.min(1, Math.abs(signedProgress));
      }
      // Written to the tilt layer, never slideEl or the intro-layer wrapper —
      // slideEl's own transform is already owned by the translate3d write
      // above, and keeping this off the intro-layer wrapper (which owns
      // overflow:hidden + border-radius) is deliberate: a single element
      // that's both clipped-to-rounded-rect AND under an active 3D
      // transform loses its rounded-corner clip mask mid-gesture in every
      // major browser engine, snapping back only once the transform returns
      // to identity (rotateY(0deg)) — which is why the card looked square
      // specifically while dragging and correct again on release. Nesting
      // the tilt on its own untransformed-parent-clipped layer sidesteps
      // that entirely.
      const tiltLayer = tiltLayerRefs.current[index];
      if (tiltLayer) {
        tiltLayer.style.transform = CTA.tiltEnabled && !layout.prefersReducedMotion
          ? `perspective(${CTA.tiltPerspectivePx}px) rotateY(${(signedProgress * CTA.tiltMaxDegrees).toFixed(3)}deg)`
          : '';
      }
    });
  }, []);

  // Mirror Swiper's transition timing per slide: 0ms while the finger is down
  // (pose tracks the drag 1:1), the snap speed + project easing on release.
  const applyPagerTransition = useCallback((swiper: SwiperClass, durationMs: number) => {
    const layout = deckLayoutRef.current;
    const ms = Math.max(0, durationMs);
    for (const slideEl of swiper.slides) {
      const el = slideEl as HTMLElement;
      el.style.transitionProperty = 'transform';
      el.style.transitionDuration = `${ms}ms`;
      el.style.transitionTimingFunction = layout.easingCss;
    }
    // The tilt layer's own rotateY (see applyPagerPose) mirrors the same
    // clock — 0ms while dragging, the snap speed/easing on release — so it
    // eases back to flat in lockstep with the translate3d snap above.
    for (const layer of tiltLayerRefs.current) {
      if (!layer) continue;
      layer.style.transitionProperty = 'transform';
      layer.style.transitionDuration = `${ms}ms`;
      layer.style.transitionTimingFunction = layout.easingCss;
    }
    // Dimming overlays ease with the same clock (0 while dragging).
    swiper.el?.style.setProperty('--abstract-dock-motion-ms', `${ms}ms`);
  }, []);

  const handleSwiper = useCallback((swiper: SwiperClass) => {
    swiperRef.current = swiper;
    applyPagerTransition(swiper, 0);
    applyPagerPose(swiper);
    setSwiperReady(true);
  }, [applyPagerPose, applyPagerTransition]);

  const finishMobileIntro = useCallback(() => {
    if (introFrameRef.current) {
      window.cancelAnimationFrame(introFrameRef.current);
      introFrameRef.current = 0;
    }
    introActiveRef.current = false;
    introOffsetsRef.current = Array.from({ length: slides.length }, () => 0);
    introLayerRefs.current.forEach(layer => {
      layer?.style.setProperty('--abstract-mobile-intro-opacity', '1');
    });
    const swiper = swiperRef.current;
    if (swiper && !swiper.destroyed) {
      applyPagerTransition(swiper, 0);
      applyPagerPose(swiper);
    }
    setMobileIntroComplete(true);
  }, [applyPagerPose, applyPagerTransition, slides.length]);

  // Real drag movement detected (past Swiper's own threshold) — captures a
  // fresh baseline. Verified against Swiper's own source: sliderFirstMove
  // fires before this move's own delta is applied to translate/progress
  // (that delta is explicitly discarded on the threshold-clearing call), so
  // swiper.progress here is bit-for-bit the same value it held at rest, a
  // true t=0 snapshot regardless of how large the first reported move is.
  const handleSliderFirstMove = useCallback((swiper: SwiperClass) => {
    // Load-bearing: a new gesture beginning must always win over a stale
    // pending correction from whatever the previous gesture scheduled.
    clearSettleTimeout();
    dragBaselineRef.current = { index: swiper.activeIndex, translatePx: swiper.translate };
    onSwipeStateChange(true);
  }, [clearSettleTimeout, onSwipeStateChange]);

  const introConfigSignature = [
    config.dockRevealMode,
    config.dockRevealOverlapMs,
    config.dockRevealFirstDelayMs,
    config.dockRevealDurationMs,
    config.dockRevealStaggerMs,
    config.dockRevealEasing,
    config.dockRevealDistribution,
    config.dockRevealCadenceAmount,
    config.dockRevealOffsetXVw,
  ].join('|');

  // An in-flight intro is tied to the measured pager geometry. If that geometry
  // changes (rotation, browser chrome resize, panel resize), resolve the cards
  // to their final pose before paint rather than restarting from a stale offset.
  useIsomorphicLayoutEffect(() => {
    const previous = introLayoutSizeRef.current;
    introLayoutSizeRef.current = { cardWidthPx, containerWidthPx };
    if (
      introActiveRef.current
      && (previous.cardWidthPx !== cardWidthPx
        || previous.containerWidthPx !== containerWidthPx)
    ) {
      finishMobileIntro();
    }
  }, [cardWidthPx, containerWidthPx, finishMobileIntro]);

  useIsomorphicLayoutEffect(() => {
    if (!swiperReady) return;
    const swiper = swiperRef.current;
    if (!swiper || swiper.destroyed || slides.length === 0) return;

    const previousSignature = lastIntroConfigSignatureRef.current;
    const configChanged =
      previousSignature !== null && previousSignature !== introConfigSignature;
    lastIntroConfigSignatureRef.current = introConfigSignature;
    const shouldAnimate =
      !prefersReducedMotion && (config.dockRevealEnabled || configChanged);

    if (!shouldAnimate) {
      finishMobileIntro();
      return;
    }

    if (introFrameRef.current) {
      window.cancelAnimationFrame(introFrameRef.current);
      introFrameRef.current = 0;
    }

    // Reuses the same generic reveal-order/schedule helpers AbstractDeckSwiper
    // uses — they were never actually tied to that component's golden-ratio
    // tail fan, just parameterized by a tail count. Here that count is a
    // small fixed constant (PAGER_VISIBLE_RADIUS) instead of a config knob,
    // since at most one neighbor on each side is ever meaningfully visible.
    const introOrder = computeMagnificationDockDeckRevealOrder({
      itemCount: slides.length,
      activeIndex: swiper.activeIndex,
      tailCount: PAGER_VISIBLE_RADIUS,
    });
    const schedule = computeMagnificationDockRevealSchedule({
      itemCount: introOrder.length,
      staggerMs: config.dockRevealStaggerMs,
      durationMs: config.dockRevealDurationMs,
      overlapMs: config.dockRevealOverlapMs,
      mode: config.dockRevealMode,
      distribution: config.dockRevealDistribution,
      cadenceAmount: config.dockRevealCadenceAmount,
    });
    const rankByIndex = new Map(introOrder.map((index, rank) => [index, rank]));
    const entryOffsetPx =
      Math.max(1, introLayoutSizeRef.current.containerWidthPx)
      * config.dockRevealOffsetXVw / 100;
    const easing = createCssEasingFunction(revealEasingCss);
    const startDelayMs = Math.max(0, config.dockRevealFirstDelayMs);

    introActiveRef.current = true;
    setMobileIntroComplete(false);
    introOffsetsRef.current = Array.from({ length: slides.length }, (_, index) => (
      rankByIndex.has(index) ? entryOffsetPx : 0
    ));
    introLayerRefs.current.forEach((layer, index) => {
      layer?.style.setProperty(
        '--abstract-mobile-intro-opacity',
        rankByIndex.has(index) ? '0' : '1',
      );
    });
    applyPagerTransition(swiper, 0);
    applyPagerPose(swiper);

    let timelineStartMs = 0;
    const stepIntro = (now: number) => {
      introFrameRef.current = 0;
      if (!introActiveRef.current || swiper.destroyed) return;
      if (!timelineStartMs) timelineStartMs = now + startDelayMs;
      let complete = true;

      introOrder.forEach((slideIndex, rank) => {
        const timing = schedule[rank];
        if (!timing) return;
        const elapsedMs = now - timelineStartMs - timing.startMs;
        const progress = timing.durationMs <= 0
          ? (elapsedMs >= 0 ? 1 : 0)
          : clamp(elapsedMs / timing.durationMs, 0, 1);
        const easedProgress = easing(progress);
        introOffsetsRef.current[slideIndex] = entryOffsetPx * (1 - easedProgress);
        introLayerRefs.current[slideIndex]?.style.setProperty(
          '--abstract-mobile-intro-opacity',
          easedProgress.toFixed(4),
        );
        if (progress < 1) complete = false;
      });

      applyPagerPose(swiper);
      if (complete) {
        finishMobileIntro();
      } else {
        introFrameRef.current = window.requestAnimationFrame(stepIntro);
      }
    };

    introFrameRef.current = window.requestAnimationFrame(stepIntro);
    return () => {
      introActiveRef.current = false;
      if (introFrameRef.current) {
        window.cancelAnimationFrame(introFrameRef.current);
        introFrameRef.current = 0;
      }
    };
  }, [
    applyPagerPose,
    applyPagerTransition,
    config.dockRevealCadenceAmount,
    config.dockRevealDistribution,
    config.dockRevealDurationMs,
    config.dockRevealEnabled,
    config.dockRevealFirstDelayMs,
    config.dockRevealMode,
    config.dockRevealOffsetXVw,
    config.dockRevealOverlapMs,
    config.dockRevealStaggerMs,
    finishMobileIntro,
    introConfigSignature,
    prefersReducedMotion,
    revealEasingCss,
    slides.length,
    swiperReady,
  ]);

  // Keep Swiper in sync with externally clamped/changed indices. Not a real
  // drag gesture — clear any (possibly stale, from whatever index the pager
  // was last resting at) baseline so the pose falls back to the clean
  // activeIndex-only branch; this slideTo already targets the exact right
  // index, no delta math needed. See dragBaselineRef's own comment.
  useEffect(() => {
    const swiper = swiperRef.current;
    if (swiper && !swiper.destroyed && swiper.activeIndex !== activeIndex) {
      clearSettleTimeout();
      dragBaselineRef.current = null;
      swiper.slideTo(activeIndex, speedMs);
    }
  }, [activeIndex, clearSettleTimeout, speedMs]);

  // Re-apply the pose when layout/knobs change while idle. Same reasoning
  // as the sync effect above: not a drag gesture, so clear any stale
  // baseline before re-posing.
  useIsomorphicLayoutEffect(() => {
    const swiper = swiperRef.current;
    if (swiper && !swiper.destroyed) {
      clearSettleTimeout();
      dragBaselineRef.current = null;
      applyPagerPose(swiper);
    }
  }, [
    applyPagerPose,
    cardWidthPx,
    containerWidthPx,
    clearSettleTimeout,
    dimmingMaxOpacity,
    layoutConfig.peekDimmingEnabled,
    layoutConfig.peekGapPx,
    slides.length,
  ]);

  // Unmount cleanup for the settle-timeout timer.
  useEffect(() => clearSettleTimeout, [clearSettleTimeout]);

  return (
    <Swiper
      onSwiper={handleSwiper}
      className={`${styles.dock} ${isDockSettled ? styles.dockSettled : ''}`}
      aria-label="Post deck"
      slidesPerView="auto"
      spaceBetween={0}
      virtualTranslate
      watchSlidesProgress
      speed={speedMs}
      threshold={6}
      longSwipesRatio={clamp(config.dockSwipeCommitPct, 0.1, 0.9)}
      longSwipesMs={280}
      shortSwipes
      resistanceRatio={0.45}
      followFinger
      simulateTouch
      grabCursor
      touchStartPreventDefault={false}
      initialSlide={initialSlideRef.current}
      onTouchStart={finishMobileIntro}
      onSetTranslate={applyPagerPose}
      onProgress={applyPagerPose}
      onSetTransition={(swiper, duration) =>
        applyPagerTransition(swiper, typeof duration === 'number' ? duration : speedMs)
      }
      onSliderFirstMove={handleSliderFirstMove}
      onTouchEnd={() => {
        onSwipeStateChange(false);
        clearSettleTimeout();
        settleTimeoutRef.current = window.setTimeout(() => {
          settleTimeoutRef.current = 0;
          const swiper = swiperRef.current;
          if (!swiper || swiper.destroyed) return;
          dragBaselineRef.current = null;
          // Explicit, not incidental: guarantees the correction eases in over
          // the project's own duration/easing in the case it's actually
          // needed, rather than depending on whatever transitionDuration
          // happened to already be set from the commit that just occurred.
          applyPagerTransition(swiper, speedMs);
          applyPagerPose(swiper);
        }, speedMs + 60);
      }}
      onSlideChange={swiper => setActiveIndex(swiper.activeIndex)}
      style={{
        width: '100%',
        height: '100%',
        overflowX: 'hidden',
        overflowY: 'visible',
        '--abstract-dock-shadow': dockActiveItemBoxShadow ?? 'none',
        '--abstract-dock-motion-ms': '0ms',
      } as CSSProperties}
    >
      {slides.map((slide, index) => {
        const isActive = index === activeIndex;
        const gradientActivity = resolveAbstractPostDockGradientActivity({
          config: gradientPerformanceConfig,
          isActive,
          isDockVisible,
          isDocumentVisible,
        });
        return (
          <SwiperSlide
            key={slide.slug}
            // Gives the ::before shadow overlay (styles.module.css, keyed
            // off this element's own [data-magnification-dock-index]) a
            // real border-radius to inherit — its shadow would otherwise
            // project from this element's own square box regardless of how
            // rounded the card content inside it is, visible as a dark
            // square wedge poking past the rounded corner into the peek gap.
            className={layoutConfig.cardRadius}
            data-magnification-dock-index={index}
            data-active={isActive ? 'true' : 'false'}
            data-revealed={mobileIntroComplete ? 'true' : 'false'}
            aria-roledescription="slide"
            aria-label={`${stripEmphasisMarkup(slide.title)} slide ${index + 1} of ${slides.length}`}
            style={{
              width: `${Math.round(cardWidthPx)}px`,
              height: '100%',
              willChange: 'transform',
            } as CSSProperties}
          >
            {/* Reveal fades on an inner wrapper so the slide's imperative
                transform transitions never race the opacity stagger, and
                carries the card corner radius — rounding this wrapper (not
                just ArticleCard) keeps the sibling dimming scrim below
                clipped to the same rounded shape instead of bleeding square
                corners past it. Deliberately never carries a transform
                itself: the drag-coupled rotateY tilt lives one level deeper
                (tiltLayerRefs) so no single element combines
                overflow:hidden+border-radius with an active 3D transform —
                that combination loses its rounded-corner clip mask
                mid-gesture in every major browser engine, which is what
                made the card look square specifically while dragging and
                correct again on release (see applyPagerPose's tilt-writing
                comment). */}
            <div
              ref={node => {
                introLayerRefs.current[index] = node;
              }}
              className={layoutConfig.cardRadius}
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                '--abstract-mobile-intro-opacity': mobileIntroComplete ? 1 : 0,
                opacity: 'var(--abstract-mobile-intro-opacity)',
              } as CSSProperties}
            >
              <div
                ref={node => {
                  tiltLayerRefs.current[index] = node;
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  willChange: 'transform',
                } as CSSProperties}
              >
                <ArticleCard
                  title={stripEmphasisMarkup(slide.title)}
                  excerpt={slide.excerpt}
                  topic={slide.topic}
                  date={slide.date}
                  readingTime={slide.readingTime}
                  href={slide.href}
                  externalUrl={slide.externalUrl}
                  forceExternalNavigation={slide.forceExternalNavigation}
                  seed={slide.seed}
                  excerptLines={1}
                  aspectRatio="fill"
                  typographyScale="dock"
                  contentInsetRem={config.dockContentInsetRem}
                  contentInsetWideRem={config.dockContentInsetWideRem}
                  detailsVisible={isActive && mobileIntroComplete && detailsVisibleIndex === index}
                  className={layoutConfig.cardRadius}
                  background={Math.abs(index - activeIndex) <= PAGER_VISIBLE_RADIUS ? (
                    <LiquidGradientAdapter
                      slide={slide}
                      motion={motion}
                      config={config}
                      activity={gradientActivity}
                      palette={paletteStates?.[index] ?? null}
                      hologramConfig={hologramConfig}
                      hologramInteraction={getHologramInteractionRef(index)}
                    />
                  ) : null}
                />
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 bg-black ${styles.dimmingOverlay}`}
                />
              </div>
            </div>
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}
