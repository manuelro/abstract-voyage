'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import type { SpacefieldConfig } from './SpacefieldBackground/config/registered';
import {
  angleRangeForOriginCorner,
  generateSpacefieldStars,
  originFractionForCorner,
  packSpacefieldStars,
  SPACEFIELD_STAR_STRIDE,
  type SpacefieldOriginCorner,
} from './SpacefieldBackground/helpers/starField';
import { hexColorWithAlpha } from './SpacefieldBackground/helpers/starColor';
import {
  SPACEFIELD_FRAGMENT_SOURCE,
  SPACEFIELD_VERTEX_SOURCE,
} from './SpacefieldBackground/helpers/shader';
import { useSpacefieldParallax } from './SpacefieldBackground/hooks/useSpacefieldParallax';
import styles from './SpacefieldBackground.module.css';

type SpacefieldProgram = {
  program: WebGLProgram;
  buffer: WebGLBuffer;
  aAngle: number;
  aPhase: number;
  aDepth: number;
  aSize: number;
  aColor: number;
  aTwinkleSpeed: number;
  aTwinklePhase: number;
  uTime: WebGLUniformLocation | null;
  uResolution: WebGLUniformLocation | null;
  uOrigin: WebGLUniformLocation | null;
  uFieldRadius: WebGLUniformLocation | null;
  uDriftSpeed: WebGLUniformLocation | null;
  uDepthStrength: WebGLUniformLocation | null;
  uPerspectiveStrength: WebGLUniformLocation | null;
  uApproachSizeMin: WebGLUniformLocation | null;
  uApproachSizeMax: WebGLUniformLocation | null;
  uParallax: WebGLUniformLocation | null;
  uTwinkleAmount: WebGLUniformLocation | null;
  uDpr: WebGLUniformLocation | null;
  uOpacity: WebGLUniformLocation | null;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createSpacefieldProgram(gl: WebGLRenderingContext): SpacefieldProgram | null {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, SPACEFIELD_VERTEX_SOURCE);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, SPACEFIELD_FRAGMENT_SOURCE);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  if (!program || !buffer) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    return null;
  }

  return {
    program,
    buffer,
    aAngle: gl.getAttribLocation(program, 'aAngle'),
    aPhase: gl.getAttribLocation(program, 'aPhase'),
    aDepth: gl.getAttribLocation(program, 'aDepth'),
    aSize: gl.getAttribLocation(program, 'aSize'),
    aColor: gl.getAttribLocation(program, 'aColor'),
    aTwinkleSpeed: gl.getAttribLocation(program, 'aTwinkleSpeed'),
    aTwinklePhase: gl.getAttribLocation(program, 'aTwinklePhase'),
    uTime: gl.getUniformLocation(program, 'uTime'),
    uResolution: gl.getUniformLocation(program, 'uResolution'),
    uOrigin: gl.getUniformLocation(program, 'uOrigin'),
    uFieldRadius: gl.getUniformLocation(program, 'uFieldRadius'),
    uDriftSpeed: gl.getUniformLocation(program, 'uDriftSpeed'),
    uDepthStrength: gl.getUniformLocation(program, 'uDepthStrength'),
    uPerspectiveStrength: gl.getUniformLocation(program, 'uPerspectiveStrength'),
    uApproachSizeMin: gl.getUniformLocation(program, 'uApproachSizeMin'),
    uApproachSizeMax: gl.getUniformLocation(program, 'uApproachSizeMax'),
    uParallax: gl.getUniformLocation(program, 'uParallax'),
    uTwinkleAmount: gl.getUniformLocation(program, 'uTwinkleAmount'),
    uDpr: gl.getUniformLocation(program, 'uDpr'),
    uOpacity: gl.getUniformLocation(program, 'uOpacity'),
  };
}

function resolveCanvasSize(canvas: HTMLCanvasElement, maxDevicePixelRatio: number) {
  const bounds = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, Math.round(bounds.width || window.innerWidth || 1));
  const cssHeight = Math.max(1, Math.round(bounds.height || window.innerHeight || 1));
  const dpr = Math.min(window.devicePixelRatio || 1, maxDevicePixelRatio);
  return {
    width: Math.max(1, Math.round(cssWidth * dpr)),
    height: Math.max(1, Math.round(cssHeight * dpr)),
    dpr,
  };
}

function bindStarAttributes(gl: WebGLRenderingContext, renderer: SpacefieldProgram) {
  const strideBytes = SPACEFIELD_STAR_STRIDE * 4;
  gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffer);
  gl.enableVertexAttribArray(renderer.aAngle);
  gl.vertexAttribPointer(renderer.aAngle, 1, gl.FLOAT, false, strideBytes, 0);
  gl.enableVertexAttribArray(renderer.aPhase);
  gl.vertexAttribPointer(renderer.aPhase, 1, gl.FLOAT, false, strideBytes, 4);
  gl.enableVertexAttribArray(renderer.aDepth);
  gl.vertexAttribPointer(renderer.aDepth, 1, gl.FLOAT, false, strideBytes, 8);
  gl.enableVertexAttribArray(renderer.aSize);
  gl.vertexAttribPointer(renderer.aSize, 1, gl.FLOAT, false, strideBytes, 12);
  gl.enableVertexAttribArray(renderer.aColor);
  gl.vertexAttribPointer(renderer.aColor, 3, gl.FLOAT, false, strideBytes, 16);
  gl.enableVertexAttribArray(renderer.aTwinkleSpeed);
  gl.vertexAttribPointer(renderer.aTwinkleSpeed, 1, gl.FLOAT, false, strideBytes, 28);
  gl.enableVertexAttribArray(renderer.aTwinklePhase);
  gl.vertexAttribPointer(renderer.aTwinklePhase, 1, gl.FLOAT, false, strideBytes, 32);
}

/**
 * A self-contained starfield that fills exactly the box it's mounted
 * inside — used as *the background itself* for one region at a time (e.g.
 * about.tsx mounts one instance inside its header, a second, independent
 * instance inside its hero panel), not a single field shared/clipped across
 * multiple unrelated DOM regions. Each instance only needs to know two
 * things about its own layout: `originCorner` (which corner of its own box
 * stars radiate from — the opposite corner is reached automatically,
 * self-computed from this element's own current canvas size every frame,
 * no external DOM measurement) and the shared `config` (population/color/
 * twinkle/performance tuning, identical across every instance on a page).
 *
 * Mirrors experiences/borealis/BorealisBackground.tsx's own architecture:
 * a raw WebGL context (no Three.js), a single draw call per frame, DPR
 * capped (not raw), and the render loop itself gated on prefers-reduced-
 * motion, IntersectionObserver visibility, document.visibilitychange, and
 * an opacity-pause floor — never just CSS-suppressed while still burning
 * cycles underneath.
 */
export function SpacefieldBackground({
  config,
  originCorner,
  narrow,
  className = '',
}: {
  config: SpacefieldConfig;
  /** Which corner of this component's own box stars originate from and
   * radiate away from — the box only ever extends into the 90° quadrant
   * that corner points into (see helpers/starField.ts's
   * angleRangeForOriginCorner), so this alone fully determines both the
   * origin position and the allowed travel directions. */
  originCorner: SpacefieldOriginCorner;
  /** Selects config.narrowBehavior's effect — 'hidden' is expected to be
   * handled by the caller not mounting this component at all, but is also
   * guarded here defensively since mounting a WebGL context for a layer
   * that should never render one is an easy mistake to reintroduce later. */
  narrow: boolean;
  className?: string;
}) {
  // Checked again below, at the JSX return, rather than as an early return
  // here — hooks below must run unconditionally on every render (Rules of
  // Hooks); the mount effect's own `if (!canvas) return undefined` guard
  // already makes an unmounted canvas (hidden === true) a safe no-op.
  const hidden = narrow && config.narrowBehavior === 'hidden';
  const staticFrame = narrow && config.narrowBehavior === 'static';
  const effectiveStarCount = narrow && config.narrowBehavior === 'reduced'
    ? Math.max(1, Math.round(config.starCount * config.narrowStarCountScale))
    : config.starCount;

  const configRef = useRef(config);
  configRef.current = config;
  const originFraction = useMemo(() => originFractionForCorner(originCorner), [originCorner]);
  const originFractionRef = useRef(originFraction);
  originFractionRef.current = originFraction;
  const staticFrameRef = useRef(staticFrame);
  staticFrameRef.current = staticFrame;

  const parallaxRef = useSpacefieldParallax({
    responseMs: config.parallaxResponseMs,
    respectReducedMotion: config.respectReducedMotion,
    enabled: !staticFrame,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const rendererRef = useRef<SpacefieldProgram | null>(null);
  const starCountRef = useRef(0);
  const scheduleRenderRef = useRef<(() => void) | null>(null);

  // Regenerated only when a generation-relevant field (or the effective
  // count, which narrow-mode reduction can change, or the origin corner,
  // which determines the allowed angle range) actually changes — not on
  // every config edit, so tuning e.g. drift speed never reshuffles or
  // re-uploads the whole field.
  const starBuffer = useMemo(() => {
    const { start, span } = angleRangeForOriginCorner(originCorner);
    return packSpacefieldStars(generateSpacefieldStars(config, effectiveStarCount, start, span));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config.seed,
    effectiveStarCount,
    originCorner,
    config.sizeMinPx,
    config.sizeMaxPx,
    config.temperatureMinK,
    config.temperatureMaxK,
    config.colorSaturation,
    config.twinkleSpeedMinHz,
    config.twinkleSpeedMaxHz,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      stencil: false,
    });
    if (!gl) return undefined;

    const renderer = createSpacefieldProgram(gl);
    if (!renderer) return undefined;
    glRef.current = gl;
    rendererRef.current = renderer;

    gl.enable(gl.BLEND);
    // Additive — overlapping stars brighten rather than occlude, reading
    // as glowing points of light rather than flat opaque dots.
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = reducedMotionQuery.matches;
    let documentVisible = !document.hidden;
    let elementVisible = true;
    let animationFrame = 0;
    let lastFrame = performance.now();
    let shaderTime = 0;

    const scheduleRender = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(render);
    };

    const render = (now: number) => {
      animationFrame = 0;
      const currentConfig = configRef.current;
      const shouldPause = currentConfig.opacity <= clamp(currentConfig.pauseBelowOpacity, 0, 0.2);
      if (!documentVisible || !elementVisible || shouldPause) {
        lastFrame = now;
        return;
      }

      const deltaSeconds = Math.min(Math.max((now - lastFrame) / 1000, 0), 0.1);
      lastFrame = now;
      const motionDisabled = currentConfig.respectReducedMotion && reducedMotion;
      const isStatic = staticFrameRef.current;
      if (!motionDisabled && !isStatic) shaderTime += deltaSeconds;

      const size = resolveCanvasSize(canvas, clamp(currentConfig.maxDevicePixelRatio, 1, 3));
      if (canvas.width !== size.width) canvas.width = size.width;
      if (canvas.height !== size.height) canvas.height = size.height;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (starCountRef.current > 0) {
        gl.useProgram(renderer.program);
        bindStarAttributes(gl, renderer);

        // Both self-computed from this canvas's own current backing-buffer
        // size, every frame — no external DOM measurement, so nothing here
        // can ever drift out of sync with a resize or a cross-region layout
        // change the way a separately-measured/passed value could.
        const fraction = originFractionRef.current;
        const originXPx = fraction.x * canvas.width;
        const originYPx = fraction.y * canvas.height;
        const fieldRadiusPx = Math.hypot(canvas.width, canvas.height)
          * clamp(currentConfig.fieldRadiusScale, 0.5, 3);
        const parallax = parallaxRef.current;
        gl.uniform1f(renderer.uTime, shaderTime);
        gl.uniform2f(renderer.uResolution, canvas.width, canvas.height);
        gl.uniform2f(renderer.uOrigin, originXPx, originYPx);
        gl.uniform1f(renderer.uFieldRadius, fieldRadiusPx);
        gl.uniform1f(renderer.uDriftSpeed, clamp(currentConfig.driftSpeedPxPerSec, 0, 80) * size.dpr);
        gl.uniform1f(renderer.uDepthStrength, clamp(currentConfig.depthStrength, 0, 1));
        gl.uniform1f(renderer.uPerspectiveStrength, clamp(currentConfig.perspectiveStrength, 0, 0.95));
        gl.uniform1f(renderer.uApproachSizeMin, clamp(currentConfig.approachSizeMin, 0.05, 2));
        gl.uniform1f(renderer.uApproachSizeMax, clamp(currentConfig.approachSizeMax, 0.5, 5));
        gl.uniform2f(
          renderer.uParallax,
          parallax.x * currentConfig.parallaxStrengthPx * size.dpr,
          parallax.y * currentConfig.parallaxStrengthPx * size.dpr,
        );
        gl.uniform1f(renderer.uTwinkleAmount, clamp(currentConfig.twinkleAmount, 0, 1));
        gl.uniform1f(renderer.uDpr, size.dpr);
        gl.uniform1f(renderer.uOpacity, clamp(currentConfig.opacity, 0, 1));
        gl.drawArrays(gl.POINTS, 0, starCountRef.current);
      }

      // Static mode never self-schedules a next frame (no continuous raf
      // loop) — it still redraws on demand (resize, a live config edit)
      // via the observers/effects below calling scheduleRender directly.
      if (!motionDisabled && !isStatic) scheduleRender();
    };

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleRender);
    const intersectionObserver = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(entries => {
        elementVisible = entries[0]?.isIntersecting ?? true;
        if (elementVisible) scheduleRender();
      }, { threshold: 0.01 });
    const handleVisibilityChange = () => {
      documentVisible = !document.hidden;
      if (documentVisible) scheduleRender();
    };
    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      scheduleRender();
    };

    scheduleRenderRef.current = scheduleRender;
    resizeObserver?.observe(canvas);
    intersectionObserver?.observe(canvas);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    reducedMotionQuery.addEventListener?.('change', handleReducedMotionChange);
    window.addEventListener('resize', scheduleRender, { passive: true });
    scheduleRender();

    return () => {
      scheduleRenderRef.current = null;
      glRef.current = null;
      rendererRef.current = null;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      reducedMotionQuery.removeEventListener?.('change', handleReducedMotionChange);
      window.removeEventListener('resize', scheduleRender);
      gl.deleteBuffer(renderer.buffer);
      gl.deleteProgram(renderer.program);
    };
    // parallaxRef/originFractionRef (read inside render() via closure) are
    // refs — stable identity across renders like any ref, so intentionally
    // omitted here; this effect must still only run once, on mount
    // (recreating the WebGL context on every config/prop change would be
    // its own regression).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Uploads the (re)generated star buffer whenever it changes — declared
  // after the context-creation effect above so, on initial mount, glRef/
  // rendererRef are already populated by the time this runs (React fires
  // effects in declaration order within the same commit).
  useEffect(() => {
    const gl = glRef.current;
    const renderer = rendererRef.current;
    if (!gl || !renderer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, starBuffer, gl.DYNAMIC_DRAW);
    starCountRef.current = starBuffer.length / SPACEFIELD_STAR_STRIDE;
    scheduleRenderRef.current?.();
  }, [starBuffer]);

  useEffect(() => {
    scheduleRenderRef.current?.();
  }, [config, originFraction]);

  if (hidden) return null;

  // A static CSS radial-gradient, not a WebGL pass — originFraction is
  // already a fixed (corner-derived) fraction, so there's nothing here
  // that needs to run every frame or read live canvas size. Anchors the
  // vanishing point visually: without it the origin is an inferred,
  // invisible spot the eye has to reconstruct from where stars happen to
  // start; with it, that point visibly glows.
  const focalGlowImage = config.focalGlowEnabled
    ? `radial-gradient(circle at ${originFraction.x * 100}% ${originFraction.y * 100}%, `
      + `${hexColorWithAlpha(config.focalGlowColor, config.focalGlowIntensity)} 0%, `
      + `${hexColorWithAlpha(config.focalGlowColor, 0)} ${config.focalGlowRadiusPercent}%)`
    : undefined;

  return (
    // Fills its entire mounted box (no clip-path — each instance is a
    // single self-contained region, not a shape cut out of a larger shared
    // layer). Opacity is applied once, per-star, inside the shader
    // (uOpacity) — not duplicated as a CSS opacity here, which would
    // compound with it (opacity² instead of the configured value) on top of
    // the additive blend mode already doing brightness math per fragment.
    // backgroundColor is the "night sky" the stars read against, with the
    // focal glow layered on top of it as a second background-image — both
    // painted here as plain CSS (the canvas itself only ever clears to
    // transparent), not in the shader, since neither is animated.
    <div
      aria-hidden="true"
      className={`${styles.layer} pointer-events-none absolute inset-0 z-[-1] overflow-hidden ${className}`}
      data-spacefield-layer="true"
      style={{ backgroundColor: config.backgroundColor, backgroundImage: focalGlowImage }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
