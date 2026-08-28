'use client';

import type {
  CSSProperties,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '../../../../../helpers/clamp';
import {
  DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG,
  resolveAbstractPostDockEasing,
  type AbstractPostDockHologramConfig,
} from '../config/registered';
import { createCssEasingFunction } from '../../../../../helpers/cubicBezierEasing';
import type { AbstractPostDockGradientActivity } from '../helpers/gradientActivity';
import { applyPointerProximityEasing, stepPointerProximityEnvelope } from '../../../../../helpers/pointerProximity';
import type { PointerProximityState } from '../../../../../components/proximity/usePointerProximity';
import { DEFAULT_CTA_BUTTON_CONFIG } from '../../../../../components/CtaButton/config/registered';
import {
  DECK_PALETTE_LUT_SIZE,
  type DeckPaletteState,
} from '../../../helpers/deckPalette';
import { useIsomorphicLayoutEffect } from '../hooks/browserState';
import {
  createGradientProgram,
  resolveGradientCanvasBufferSize,
  applySliderGradientUniforms,
} from '../helpers/webgl';
import type { useLiquidSliderMotion } from '../hooks/motion';
import {
  NEUTRAL_MOTION_VALUES,
  GRADIENT_LAYER_SIZE,
  HOLOGRAM_MAX_OFFSET_PX,
  type LiquidSliderMotionValues,
  type SliderGradientConfig,
  type SliderSlide,
} from '../config/legacy';
import {
  DEFAULT_GRADIENT_OUTPUT_TREATMENT,
  type GradientOutputTreatment,
} from '../config/outputTreatment';
import {
  evaluateHueTransition,
  hueUniformStatesEqual,
  hueUniformStateFromPalette,
  type HueTransitionState,
} from '../helpers/hueTransition';

export type { DeckPaletteState } from '../../../helpers/deckPalette';

export type LiquidGradientRenderController = {
  setActivity: (activity: AbstractPostDockGradientActivity) => void;
  invalidate: () => void;
};

const MESH_GEOMETRY_RESPONSE_RATE_PER_SECOND = 18;
const MESH_GEOMETRY_SETTLE_EPSILON = 0.001;

export function LiquidGradientAdapter({
  slide,
  motion,
  config,
  activity = 'continuous',
  palette = null,
  hologramConfig = DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG,
  hologramInteraction = null,
  hologramDampingAttackMs = DEFAULT_CTA_BUTTON_CONFIG.proximityAttackMs,
  hologramDampingReleaseMs = DEFAULT_CTA_BUTTON_CONFIG.proximityReleaseMs,
  gaussianProximityOffsetXRef = null,
  outputTreatment = DEFAULT_GRADIENT_OUTPUT_TREATMENT,
}: {
  slide: SliderSlide;
  motion: ReturnType<typeof useLiquidSliderMotion>;
  config: SliderGradientConfig;
  activity?: AbstractPostDockGradientActivity;
  palette?: DeckPaletteState | null;
  /** Hover-hologram tuning — see AbstractPostDockHologramConfig. Defaults to
   * the standard config (enabled) rather than off, so a caller that doesn't
   * pass `hologramInteraction` simply never triggers it (no ref, no signal)
   * instead of needing to also remember to disable it. */
  hologramConfig?: AbstractPostDockHologramConfig;
  /** The card's own live tilt signal — same proximity/x/y usePointerProximity
   * already produces for the physical tilt transform elsewhere. Read
   * per-frame in the render loop, imperatively, like `motion` below; no ref
   * means no hologram response, regardless of `hologramConfig.enabled`. */
  hologramInteraction?: MutableRefObject<PointerProximityState> | null;
  /** Attack/release timing for `hologramConfig.dampingEnabled`'s own
   * response-strength envelope (see the per-frame hologram block below) —
   * defaults to `DEFAULT_CTA_BUTTON_CONFIG`'s own constants, today's exact
   * behavior for every caller that doesn't pass these. A caller whose own
   * `hologramInteraction` signal is itself damped by a *live*, panel-
   * configurable `CtaButtonConfig` (e.g. the card stack's active card) should
   * pass that same config's `proximityAttackMs`/`proximityReleaseMs` here
   * too, so the hologram's own release matches the card's physical
   * tilt/lift/elevation release instead of silently using a fixed constant
   * regardless of what the operator tuned. */
  hologramDampingAttackMs?: number;
  hologramDampingReleaseMs?: number;
  /** Gaussian pan curve, proximity morph only (see useGaussianProximityMorph)
   * — a live, per-frame offsetX value that overrides `palette.offsetX` when
   * present, read imperatively in the render loop exactly like
   * `hologramInteraction` above. No ref means the static `palette.offsetX`
   * (or the legacy `slide.offsetX`) is used unchanged, regardless of any
   * gaussian config — this is the only new code path this prop adds, and it
   * is a no-op whenever the caller doesn't pass a ref. */
  gaussianProximityOffsetXRef?: MutableRefObject<number> | null;
  /** Optional final-fragment material treatment. The default color mode is a
   * no-op and preserves the journal renderer; labs opt into metal luminance. */
  outputTreatment?: GradientOutputTreatment;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const motionValuesRef = useRef<LiquidSliderMotionValues>(NEUTRAL_MOTION_VALUES);
  const configRef = useRef(config);
  const activityRef = useRef(activity);
  const paletteRef = useRef<DeckPaletteState | null>(palette);
  const initialHueUniformState = hueUniformStateFromPalette(palette);
  const hueTransitionRef = useRef<HueTransitionState>({
    from: initialHueUniformState,
    to: initialHueUniformState,
    rendered: initialHueUniformState,
    startedAtMs: 0,
    durationMs: 0,
    easing: progress => progress,
    active: false,
  });
  const hologramConfigRef = useRef(hologramConfig);
  const hologramInteractionRef = useRef(hologramInteraction);
  const hologramDampingAttackMsRef = useRef(hologramDampingAttackMs);
  const hologramDampingReleaseMsRef = useRef(hologramDampingReleaseMs);
  const gaussianProximityOffsetXRefRef = useRef(gaussianProximityOffsetXRef);
  const outputTreatmentRef = useRef(outputTreatment);
  const initialMeshGeometryEnabled =
    config.shaderMeshGeometryEnabled && outputTreatment.mode === 'color';
  const meshGeometryTransitionRef = useRef({
    domainCurveBoost: initialMeshGeometryEnabled
      ? clamp(config.shaderDomainCurveBoost, 0, 1)
      : 0,
    bandCurveBoost: initialMeshGeometryEnabled
      ? clamp(config.shaderBandCurveBoost, 0, 1)
      : 0,
    lastFrameMs: 0,
  });
  const [settledFallbackCss, setSettledFallbackCss] = useState(
    palette?.fallbackCss ?? null,
  );
  // Chromium (and some other engines) can repaint a lost-WebGL-context
  // canvas as opaque white rather than leaving it transparent — not just on
  // a genuine GPU/driver reset, but also when the browser evicts an
  // existing context under "too many active WebGL contexts" pressure
  // (common on this page: many card gradients plus the hero's own several
  // canvases). `contextLost` below used to be a plain effect-local
  // variable, invisible to render, so the canvas kept painting nothing
  // useful indefinitely if `webglcontextrestored` never fires (it isn't
  // guaranteed to, for resource-limit evictions). Promoted to state so the
  // canvas itself can be hidden while lost, exposing the parent's own CSS
  // fallback gradient underneath instead of a stuck white/broken canvas.
  const [contextLost, setContextLost] = useState(false);
  const fallbackSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  // Duck eases in the render loop (survives GL effect re-runs).
  const paletteDuckRef = useRef(0);
  // Hologram response-strength envelope (attack/release, see the per-frame
  // hologram block below) — persists across frames the same way paletteDuckRef
  // does, independent of hologramConfig.dampingEnabled being toggled live.
  const hologramStrengthRef = useRef(0);
  const lastHologramNowMsRef = useRef(0);
  const renderControllerRef = useRef<LiquidGradientRenderController | null>(null);
  const driftRef = useRef({
    influence: 0,
    lastFrame: 0,
    hasDragged: false,
  });
  activityRef.current = activity;
  hologramConfigRef.current = hologramConfig;
  hologramInteractionRef.current = hologramInteraction;
  hologramDampingAttackMsRef.current = hologramDampingAttackMs;
  hologramDampingReleaseMsRef.current = hologramDampingReleaseMs;
  gaussianProximityOffsetXRefRef.current = gaussianProximityOffsetXRef;
  outputTreatmentRef.current = outputTreatment;

  // Canvas blur driver: legacy softness plus the master-bus smoothing, with
  // extra blur headroom when the master knob is engaged (blur px = var · 2.4).
  const resolveCssSoftness = (
    baseSoftness: number,
    paletteState: DeckPaletteState | null,
  ) => {
    const master = paletteState ? clamp(paletteState.masterSoftness, 0, 1) : 0;
    const effective = clamp(baseSoftness + master, 0, 1);
    return effective * (1 + master * 2.33);
  };

  useEffect(() => {
    configRef.current = config;
    meshGeometryTransitionRef.current.lastFrameMs = performance.now();
    canvasRef.current?.style.setProperty(
      '--liquid-softness',
      resolveCssSoftness(config.shaderColorSoftness, paletteRef.current).toFixed(4),
    );
    renderControllerRef.current?.invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  useEffect(() => {
    const previousPalette = paletteRef.current;
    const nowMs = performance.now();
    const transition = hueTransitionRef.current;
    const rendered = evaluateHueTransition(transition, nowMs);
    const target = hueUniformStateFromPalette(palette, rendered);
    const motionPalette = palette ?? previousPalette;
    const crossesIdentity =
      (transition.to.mix <= 1e-5) !== (target.mix <= 1e-5);
    const reducedMotion = typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const transitionEnabled = Boolean(
      motionPalette?.hueInfluenceTransitionEnabled,
    );
    const durationMs = hueUniformStatesEqual(rendered, target) ||
      !transitionEnabled ||
      reducedMotion
      ? 0
      : crossesIdentity
        ? motionPalette?.hueInfluenceTransitionDurationMs ?? 0
        : motionPalette?.hueInfluenceTuningResponseMs ?? 0;
    const easing = createCssEasingFunction(resolveAbstractPostDockEasing(
      motionPalette?.hueInfluenceTransitionEasing ?? 'soft-expo',
    ));
    hueTransitionRef.current = {
      from: rendered,
      to: target,
      rendered,
      startedAtMs: nowMs,
      durationMs,
      easing,
      active: durationMs > 0,
    };
    if (durationMs <= 0) {
      hueTransitionRef.current.rendered = target;
    }
    if (fallbackSettleTimerRef.current !== null) {
      clearTimeout(fallbackSettleTimerRef.current);
      fallbackSettleTimerRef.current = null;
    }
    const targetFallbackCss = palette?.fallbackCss ?? null;
    if (durationMs <= 0) {
      setSettledFallbackCss(targetFallbackCss);
    } else {
      fallbackSettleTimerRef.current = setTimeout(() => {
        setSettledFallbackCss(targetFallbackCss);
        fallbackSettleTimerRef.current = null;
      }, durationMs);
    }
    paletteRef.current = palette;
    canvasRef.current?.style.setProperty(
      '--liquid-softness',
      resolveCssSoftness(configRef.current.shaderColorSoftness, palette).toFixed(4),
    );
    renderControllerRef.current?.invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette]);

  useEffect(() => () => {
    if (fallbackSettleTimerRef.current !== null) {
      clearTimeout(fallbackSettleTimerRef.current);
    }
  }, []);

  useEffect(() => {
    outputTreatmentRef.current = outputTreatment;
    meshGeometryTransitionRef.current.lastFrameMs = performance.now();
    renderControllerRef.current?.invalidate();
  }, [outputTreatment]);

  useIsomorphicLayoutEffect(() => {
    if (activity !== 'continuous') return undefined;

    return motion.subscribe(values => {
      const canvas = canvasRef.current;
      motionValuesRef.current = values;
      if (!canvas) return;

      canvas.style.setProperty('--liquid-x', values.gradientX.toFixed(4));
      canvas.style.setProperty('--liquid-y', values.gradientY.toFixed(4));
      canvas.style.setProperty('--liquid-angle', values.gradientAngle.toFixed(4));
      canvas.style.setProperty('--liquid-stretch', values.gradientStretch.toFixed(4));
    });
  }, [activity, motion]);

  useIsomorphicLayoutEffect(() => {
    renderControllerRef.current?.setActivity(activity);
  }, [activity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      stencil: false,
    });

    if (!gl) return undefined;

    let gradientProgram = createGradientProgram(gl);
    if (!gradientProgram || gradientProgram.vertexPositionAttribute < 0) return undefined;

    let animationFrame = 0;
    let hasRendered = false;
    let needsRender = true;
    let contextLost = false;
    // Pause-aware clock: drift phase is computed on (now − pausedTotal) so a card
    // whose rendering paused (inactive) resumes exactly where it left off instead
    // of jumping ahead by the paused wall-clock time (a visible gradient snap).
    let pausedAtMs = activityRef.current === 'continuous' ? 0 : performance.now();
    let pausedTotalMs = 0;
    // Directed Chord palette LUT texture (unit 0) — re-uploaded when the baked
    // LUT bytes change. Duck easing runs on its own real-time clock so frozen
    // cards still glide (they keep scheduling frames until the duck settles;
    // their field clock stays paused, so only chroma moves).
    let paletteTexture: WebGLTexture | null = null;
    let uploadedLut: Uint8Array | null = null;
    let lastDuckNowMs = 0;
    const shaderTime = slide.id * 0.71;
    const driftOffset = slide.id * 2.73 + slide.seed * 19.1;
    const reducedMotion = typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const cancelScheduledRender = () => {
      if (!animationFrame) return;
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };

    const pauseClock = (now = performance.now()) => {
      if (!pausedAtMs) pausedAtMs = now;
    };

    const resumeClock = (now: number) => {
      if (!pausedAtMs) return;
      pausedTotalMs += now - pausedAtMs;
      pausedAtMs = 0;
      driftRef.current.lastFrame = now;
    };

    const scheduleRender = () => {
      if (animationFrame || contextLost || activityRef.current === 'suspended') return;
      animationFrame = window.requestAnimationFrame(render);
    };

    const render = (now: number) => {
      animationFrame = 0;
      if (contextLost || activityRef.current === 'suspended' || !gradientProgram) return;

      const isContinuous = activityRef.current === 'continuous';
      if (isContinuous) resumeClock(now);
      else pauseClock(now);

      const motionValues = motionValuesRef.current;
      const currentConfig = configRef.current;
      const drift = driftRef.current;
      const effectiveNow = isContinuous ? now : pausedAtMs || now;
      const lastFrame = drift.lastFrame || effectiveNow;
      const dt = isContinuous
        ? clamp((effectiveNow - lastFrame) / 1000, 0.001, 0.05)
        : 0;
      const bufferSize = resolveGradientCanvasBufferSize(canvas, currentConfig);
      const motionEnergy = Math.max(
        Math.abs(motionValues.gradientX) / 8,
        Math.abs(motionValues.gradientY) / 8,
        Math.abs(motionValues.gradientAngle) / 5,
        motionValues.gradientIntensity * 2,
        motionValues.settlingIntensity * 2,
        Math.abs(motionValues.gradientStretch - 1) * 8,
        Math.abs(motionValues.progress) * 4,
        Math.abs(motionValues.velocity) * 2,
      );
      const driftTarget =
        currentConfig.shaderSettledDriftEnabled &&
        drift.hasDragged &&
        !motionValues.isDragging &&
        motionEnergy < 0.025
          ? 1
          : 0;
      const driftFollow = isContinuous
        ? 1 - Math.exp(-(driftTarget > drift.influence ? 0.7 : 5.2) * dt)
        : 0;

      if (isContinuous && motionValues.isDragging) drift.hasDragged = true;
      drift.lastFrame = effectiveNow;
      const settledDriftTime = (effectiveNow - pausedTotalMs) * 0.001 * clamp(currentConfig.shaderSettledDriftSpeed, 0, 2) + driftOffset;
      drift.influence += (driftTarget - drift.influence) * driftFollow;

      if (canvas.width !== bufferSize.width) canvas.width = bufferSize.width;
      if (canvas.height !== bufferSize.height) canvas.height = bufferSize.height;

      // Palette direction: chord-mode LUT upload (on change) + duck easing.
      // Window mode has lut = null — the original wheel renders untouched.
      const paletteState = paletteRef.current;
      // Gaussian pan curve, proximity morph only: a live per-frame offsetX
      // that overrides the static palette value when present, read the same
      // imperative-ref-per-frame way hologramInteraction is above. undefined
      // (the ref's own absence, or an absent .current) falls straight
      // through to today's static paletteState.offsetX — zero behavior
      // change for every caller that doesn't pass this ref.
      const liveGaussianProximityOffsetX = gaussianProximityOffsetXRefRef.current?.current;
      if (paletteState?.lut) {
        if (!paletteTexture) paletteTexture = gl.createTexture();
        if (paletteTexture && uploadedLut !== paletteState.lut) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
          gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            DECK_PALETTE_LUT_SIZE,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            paletteState.lut,
          );
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          uploadedLut = paletteState.lut;
        }
        if (paletteTexture) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
        }
      }
      const duckTarget = paletteState ? paletteState.chromaDuckTarget : 0;
      const duckDt = lastDuckNowMs
        ? clamp((now - lastDuckNowMs) / 1000, 0.001, 0.05)
        : 0.016;
      lastDuckNowMs = now;
      paletteDuckRef.current +=
        (duckTarget - paletteDuckRef.current) * (1 - Math.exp(-6 * duckDt));
      if (Math.abs(duckTarget - paletteDuckRef.current) < 0.002) {
        paletteDuckRef.current = duckTarget;
      }

      // Hover-hologram: reads the card's own live tilt signal (the same
      // proximity/x/y usePointerProximity already computes for the physical
      // rotateX/rotateY elsewhere) and turns it into gradient deltas — a
      // hover reads as light catching a holographic surface, not a flat
      // rectangle. Gated by `enabled` and a live interaction ref; zero cost
      // (all deltas stay 0) when either is absent.
      const hologramConfig = hologramConfigRef.current;
      const interaction = hologramInteractionRef.current?.current;
      let hologramOffsetX = 0;
      let hologramOffsetY = 0;
      let hologramHueShift = 0;
      let hologramSaturationBoost = 0;
      let hologramBrightnessBoost = 0;
      let hologramResponseStrength = 0;
      if (hologramConfig.enabled && interaction) {
        // hologramX/.y are already -1..1 normalized pointer offset from the
        // card's own center (see resolvePointerPosition), read live every
        // frame — position already carries its own damping upstream via
        // usePointerProximity's positionResponseMs.
        const hologramX = interaction.x;
        const hologramY = interaction.y;
        const targetStrength = interaction.proximity > 0
          ? applyPointerProximityEasing(interaction.proximity, hologramConfig.responseEasing)
          : 0;
        if (hologramConfig.dampingEnabled) {
          // Attack/release envelope on the response strength itself, symmetric
          // for approach and departure — leaving is just the release side of
          // the same envelope as entering, always chasing the live proximity-
          // derived target rather than a separate pointer-leave-triggered
          // fade. Reuses CtaButton's own proximity attack/release constants
          // (the same ones already damping this exact signal's x/y) rather
          // than a bespoke pair of knobs.
          const deltaMs = lastHologramNowMsRef.current
            ? clamp(now - lastHologramNowMsRef.current, 0, 200)
            : 16;
          lastHologramNowMsRef.current = now;
          hologramStrengthRef.current = stepPointerProximityEnvelope({
            attackMs: hologramDampingAttackMsRef.current,
            current: hologramStrengthRef.current,
            deltaMs,
            releaseMs: hologramDampingReleaseMsRef.current,
            target: targetStrength,
          });
          hologramResponseStrength = hologramStrengthRef.current;
        } else {
          hologramResponseStrength = targetStrength;
        }
        // Offset pans opposite the tilt, like a layer sitting behind glass;
        // hue ties to the horizontal axis only — the classic "colour shifts
        // as you turn it side to side" iridescent cue. Sign/axis choices
        // here are an aesthetic starting point, not a physically "correct"
        // answer — tune freely if the direction reads wrong once live.
        hologramOffsetX = -hologramX * hologramResponseStrength
          * HOLOGRAM_MAX_OFFSET_PX * hologramConfig.offsetGain;
        hologramOffsetY = -hologramY * hologramResponseStrength
          * HOLOGRAM_MAX_OFFSET_PX * hologramConfig.offsetGain;
        hologramHueShift = hologramX * hologramResponseStrength * hologramConfig.hueShiftAmount;
        hologramSaturationBoost = hologramResponseStrength * hologramConfig.saturationBoost;
        hologramBrightnessBoost = hologramResponseStrength * hologramConfig.brightnessBoost;
      }
      const hueUniforms = evaluateHueTransition(hueTransitionRef.current, now);
      const meshGeometryState = meshGeometryTransitionRef.current;
      const meshGeometryEnabled =
        currentConfig.shaderMeshGeometryEnabled &&
        outputTreatmentRef.current.mode === 'color';
      const targetDomainCurveBoost = meshGeometryEnabled
        ? clamp(currentConfig.shaderDomainCurveBoost, 0, 1)
        : 0;
      const targetBandCurveBoost = meshGeometryEnabled
        ? clamp(currentConfig.shaderBandCurveBoost, 0, 1)
        : 0;
      const meshGeometryDeltaSeconds = meshGeometryState.lastFrameMs > 0
        ? clamp((now - meshGeometryState.lastFrameMs) / 1000, 0, 0.05)
        : 0;
      meshGeometryState.lastFrameMs = now;
      const meshGeometryFollow = reducedMotion
        ? 1
        : 1 - Math.exp(
            -MESH_GEOMETRY_RESPONSE_RATE_PER_SECOND *
              meshGeometryDeltaSeconds,
          );
      meshGeometryState.domainCurveBoost +=
        (targetDomainCurveBoost - meshGeometryState.domainCurveBoost) *
        meshGeometryFollow;
      meshGeometryState.bandCurveBoost +=
        (targetBandCurveBoost - meshGeometryState.bandCurveBoost) *
        meshGeometryFollow;
      if (
        Math.abs(
          targetDomainCurveBoost - meshGeometryState.domainCurveBoost,
        ) < MESH_GEOMETRY_SETTLE_EPSILON
      ) {
        meshGeometryState.domainCurveBoost = targetDomainCurveBoost;
      }
      if (
        Math.abs(
          targetBandCurveBoost - meshGeometryState.bandCurveBoost,
        ) < MESH_GEOMETRY_SETTLE_EPSILON
      ) {
        meshGeometryState.bandCurveBoost = targetBandCurveBoost;
      }
      const meshGeometryTransitionActive =
        meshGeometryState.domainCurveBoost !== targetDomainCurveBoost ||
        meshGeometryState.bandCurveBoost !== targetBandCurveBoost;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(gradientProgram.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, gradientProgram.vertexBuffer);
      gl.enableVertexAttribArray(gradientProgram.vertexPositionAttribute);
      gl.vertexAttribPointer(gradientProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
      applySliderGradientUniforms({
        gl,
        gradientProgram,
        slide,
        motionValues,
        config: currentConfig,
        shaderTime,
        settledDriftTime,
        settledDriftInfluence: drift.influence,
        width: canvas.width,
        height: canvas.height,
        paletteEnabled: Boolean(paletteState?.lut),
        paletteChromaDuck: paletteDuckRef.current,
        paletteValueRig: paletteState ? paletteState.valueRig : 0,
        paletteSeed: paletteState ? paletteState.kinshipSeed : undefined,
        paletteHueOffset: paletteState ? paletteState.hueOffset : null,
        paletteOffsetX: liveGaussianProximityOffsetX ?? (paletteState ? paletteState.offsetX : null),
        paletteSaturation: paletteState ? paletteState.masterSaturation : 1,
        paletteBrightness: paletteState ? paletteState.masterBrightness : 1,
        paletteContrast: paletteState ? paletteState.masterContrast : 1,
        paletteSoftness: paletteState ? paletteState.masterSoftness : 0,
        hueInfluenceEnabled: hueUniforms.mix > 1e-5,
        hueInfluenceMix: hueUniforms.mix,
        hueInfluenceTargetRadians: hueUniforms.targetHueRadians,
        hueInfluenceTargetChroma: hueUniforms.targetChroma,
        hueInfluenceStrength: hueUniforms.strength,
        hueInfluenceChromaScale: hueUniforms.chromaScale,
        hueInfluenceShadowChromaScale: hueUniforms.shadowChromaScale,
        hueInfluenceHighlightChromaScale:
          hueUniforms.highlightChromaScale,
        hueInfluenceChromaPivot: hueUniforms.chromaPivot,
        hueInfluenceNeutralRecovery: hueUniforms.neutralRecovery,
        hueInfluenceNeutralThreshold: hueUniforms.neutralThreshold,
        hueInfluenceTonalRegister: hueUniforms.tonalRegister,
        hueInfluenceLightnessContrast: hueUniforms.lightnessContrast,
        hueInfluenceInkUnity: hueUniforms.inkUnity,
        hueInfluenceCounterpointWidthRadians:
          hueUniforms.counterpointWidthRadians,
        hueInfluenceCounterpointFalloff:
          hueUniforms.counterpointFalloff,
        hueInfluenceCounterpointChromaScale:
          hueUniforms.counterpointChromaScale,
        hueInfluenceCounterpointChromaFloor:
          hueUniforms.counterpointChromaFloor,
        hueInfluenceDitherStrength: hueUniforms.ditherStrength,
        meshGeometryEnabled:
          meshGeometryEnabled ||
          meshGeometryState.domainCurveBoost > MESH_GEOMETRY_SETTLE_EPSILON ||
          meshGeometryState.bandCurveBoost > MESH_GEOMETRY_SETTLE_EPSILON,
        domainCurveBoost: meshGeometryState.domainCurveBoost,
        bandCurveBoost: meshGeometryState.bandCurveBoost,
        hologramOffsetX,
        hologramOffsetY,
        hologramHueShift,
        hologramSaturationBoost,
        hologramBrightnessBoost,
        outputTreatment: outputTreatmentRef.current,
        outputTreatmentInteractionStrength: hologramResponseStrength,
      });
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.flush();
      hasRendered = true;
      needsRender = false;

      if (activityRef.current === 'continuous') {
        scheduleRender();
      } else if (
        (paletteState && paletteDuckRef.current !== duckTarget) ||
        hueTransitionRef.current.active ||
        meshGeometryTransitionActive
      ) {
        // Frozen card mid-duck: keep gliding chroma while the field stays still.
        needsRender = true;
        scheduleRender();
      }
    };

    const controller: LiquidGradientRenderController = {
      setActivity(nextActivity) {
        if (nextActivity === 'continuous') {
          needsRender = true;
          scheduleRender();
          return;
        }

        pauseClock();
        cancelScheduledRender();
        if (nextActivity === 'frozen' && (!hasRendered || needsRender)) scheduleRender();
      },
      invalidate() {
        needsRender = true;
        scheduleRender();
      },
    };
    renderControllerRef.current = controller;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      setContextLost(true);
      needsRender = true;
      cancelScheduledRender();
    };
    const handleContextRestored = () => {
      contextLost = false;
      setContextLost(false);
      gradientProgram = createGradientProgram(gl);
      hasRendered = false;
      needsRender = true;
      scheduleRender();
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    const invalidateSize = () => controller.invalidate();
    const resizeObserver = typeof window.ResizeObserver === 'function'
      ? new window.ResizeObserver(invalidateSize)
      : null;
    resizeObserver?.observe(canvas);
    if (!resizeObserver) window.addEventListener('resize', invalidateSize);

    controller.setActivity(activityRef.current);

    return () => {
      cancelScheduledRender();
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener('resize', invalidateSize);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      if (renderControllerRef.current === controller) renderControllerRef.current = null;
      if (paletteTexture) gl.deleteTexture(paletteTexture);
      if (gradientProgram) {
        gl.deleteBuffer(gradientProgram.vertexBuffer);
        gl.deleteProgram(gradientProgram.program);
      }
    };
  }, [slide]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-gradient-activity={activity}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        '--liquid-x': 0,
        '--liquid-y': 0,
        '--liquid-angle': 0,
        '--liquid-stretch': 1,
        '--liquid-softness': resolveCssSoftness(config.shaderColorSoftness, palette),
        background: outputTreatment.mode === 'color'
          ? settledFallbackCss ?? undefined
          : undefined,
        width: GRADIENT_LAYER_SIZE,
        height: GRADIENT_LAYER_SIZE,
        // Lost context (GPU reset, or the browser evicting this context
        // under too-many-active-contexts pressure) can otherwise repaint
        // as opaque white — hiding the canvas itself exposes the parent's
        // own CSS fallback gradient underneath instead.
        visibility: contextLost ? 'hidden' : 'visible',
        display: 'block',
        pointerEvents: 'none',
        transform:
          'translate3d(calc(-50% + var(--liquid-x) * 0.35px), calc(-50% + var(--liquid-y) * 0.22px), 0) rotate(calc(var(--liquid-angle) * 0.11deg)) scaleX(calc(1 + (var(--liquid-stretch) - 1) * 0.85))',
        transformOrigin: '50% 50%',
        filter: 'blur(calc(var(--liquid-softness) * 2.4px))',
        willChange: 'transform',
      } as CSSProperties}
    />
  );
}

export function useLiquidGradientPointerMotion(
  motion: ReturnType<typeof useLiquidSliderMotion>,
  getViewportSizePx: () => { width: number; height: number },
) {
  const dragActiveRef = useRef(false);

  const handleGradientPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || dragActiveRef.current) return;

    const start = getViewportSizePx();
    dragActiveRef.current = true;
    motion.startDrag(event.clientX, event.clientY, start.width, start.height);

    const onMove = (moveEvent: PointerEvent) => {
      if (!dragActiveRef.current) return;
      const size = getViewportSizePx();
      motion.updateDrag(moveEvent.clientX, moveEvent.clientY, size.width, size.height);
    };
    const onUp = () => {
      dragActiveRef.current = false;
      motion.endDrag();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
  }, [getViewportSizePx, motion]);

  useEffect(() => () => {
    if (dragActiveRef.current) {
      dragActiveRef.current = false;
      motion.endDrag();
    }
  }, [motion]);

  return handleGradientPointerDown;
}
