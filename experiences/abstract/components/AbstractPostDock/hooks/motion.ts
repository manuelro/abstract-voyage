import { useCallback, useEffect, useMemo, useRef } from 'react';
import { clamp } from '../../../../../helpers/clamp';
import { usePrefersReducedMotion } from './browserState';
import {
  cloneMotionValues,
  getMotionScale,
  signDirection,
  type MotionRuntimeState,
} from '../helpers/misc';
import {
  NEUTRAL_MOTION_VALUES,
  ZERO_MOTION_VELOCITY,
  type LiquidSliderConfig,
  type LiquidSliderMotionValues,
} from '../config/legacy';

/**
 * README - Liquid slider motion model
 *
 * Velocity capture:
 * Pointer movement is sampled from the slider drag stream. Each move compares
 * the current pointer X with the previous sample and normalizes px/s against
 * `maxVelocity`, producing a clamped -1..1 value that can be consumed by any
 * gradient renderer.
 *
 * Release momentum:
 * On pointer release, the last normalized velocity is converted into a short
 * lived target displacement. That target decays exponentially with
 * `releaseDecay`, so fast swipes keep pushing the gradient after the slide has
 * already started snapping.
 *
 * Spring settling:
 * The visible gradient values are never assigned directly. They are integrated
 * through a damped spring. Dragging uses a tighter spring; release uses a softer
 * spring, letting the gradient lag, overshoot slightly, and settle to neutral.
 *
 * Production adapter:
 * `LiquidGradientAdapter` maps the normalized output into the same procedural
 * shader uniforms used by the abstract gradient page. The same object can be
 * passed into another renderer as offset, angle bias, distortion, stretch,
 * field displacement, and settling intensity.
 */

/**
 * Controller hook for the interaction-to-gradient mapping.
 * It owns pointer-derived motion telemetry and an imperative subscription
 * channel, keeping high-frequency visual updates out of React render cycles.
 */
export type LiquidSliderMotion = ReturnType<typeof useLiquidSliderMotion>;

export function useLiquidSliderMotion(config: LiquidSliderConfig) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const configRef = useRef(config);
  const prefersReducedMotionRef = useRef(prefersReducedMotion);
  const valuesRef = useRef<LiquidSliderMotionValues>(cloneMotionValues(NEUTRAL_MOTION_VALUES));
  const runtimeRef = useRef<MotionRuntimeState>({
    target: cloneMotionValues(NEUTRAL_MOTION_VALUES),
    velocity: { ...ZERO_MOTION_VELOCITY },
    drag: {
      active: false,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      lastTime: 0,
      width: 1,
      height: 1,
    },
    decayActive: false,
  });
  const subscribersRef = useRef(new Set<(values: LiquidSliderMotionValues) => void>());
  const frameRef = useRef(0);
  const lastFrameRef = useRef(0);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    prefersReducedMotionRef.current = prefersReducedMotion;
  }, [prefersReducedMotion]);

  const notify = useCallback(() => {
    const snapshot = valuesRef.current;
    subscribersRef.current.forEach(callback => callback(snapshot));
  }, []);

  const getSnapshot = useCallback(() => cloneMotionValues(valuesRef.current), []);

  const integrateValue = (
    key: keyof MotionRuntimeState['velocity'],
    target: number,
    stiffness: number,
    damping: number,
    dt: number,
  ) => {
    const values = valuesRef.current;
    const runtime = runtimeRef.current;
    const current = values[key];
    const velocity = runtime.velocity[key];
    const acceleration = (target - current) * stiffness - velocity * damping;
    const nextVelocity = velocity + acceleration * dt;

    runtime.velocity[key] = nextVelocity;
    values[key] = current + nextVelocity * dt;
  };

  const scheduleFrame = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = window.requestAnimationFrame(now => {
      frameRef.current = 0;
      step(now);
    });
  }, []);

  const step = useCallback((now: number) => {
    const runtime = runtimeRef.current;
    const currentConfig = configRef.current;
    const lastFrame = lastFrameRef.current || now;
    const dt = clamp((now - lastFrame) / 1000, 0.001, 0.04);
    const motionScale = getMotionScale(currentConfig, prefersReducedMotionRef.current);
    const target = runtime.target;

    lastFrameRef.current = now;

    if (!runtime.drag.active && runtime.decayActive) {
      const decay = Math.exp(-currentConfig.releaseDecay * dt);

      // Release transients fade while the positional values are governed by
      // the spring. This keeps the field moving through neutral instead of
      // snapping to a new target.
      target.gradientX *= decay;
      target.gradientY *= decay;
      target.gradientAngle *= decay;
      target.gradientIntensity *= decay;
      target.gradientDistortion *= decay;
      target.settlingIntensity *= decay;
      target.progress *= decay;
      target.velocity *= decay;
      target.gradientStretch = 1 + (target.gradientStretch - 1) * decay;

      if (Math.abs(target.gradientX) < 0.02 && Math.abs(target.gradientAngle) < 0.02 && Math.abs(target.gradientIntensity) < 0.002) {
        runtime.decayActive = false;
        runtime.target = cloneMotionValues(NEUTRAL_MOTION_VALUES);
      }
    }

    if (motionScale === 0) {
      runtime.target = cloneMotionValues(NEUTRAL_MOTION_VALUES);
    }

    const stiffness = runtime.drag.active
      ? currentConfig.dragStiffness
      : currentConfig.settleStiffness;
    const damping = runtime.drag.active
      ? currentConfig.dragDamping
      : currentConfig.settleDamping;

    integrateValue('gradientX', runtime.target.gradientX, stiffness, damping, dt);
    integrateValue('gradientY', runtime.target.gradientY, stiffness, damping, dt);
    integrateValue('gradientAngle', runtime.target.gradientAngle, stiffness, damping, dt);
    integrateValue('gradientIntensity', runtime.target.gradientIntensity, stiffness, damping, dt);
    integrateValue('gradientStretch', runtime.target.gradientStretch, stiffness, damping, dt);
    integrateValue('gradientDistortion', runtime.target.gradientDistortion, stiffness, damping, dt);
    integrateValue('settlingIntensity', runtime.target.settlingIntensity, stiffness, damping, dt);
    integrateValue('progress', runtime.target.progress, stiffness, damping, dt);
    integrateValue('velocity', runtime.target.velocity, stiffness, damping, dt);

    valuesRef.current.direction = runtime.target.direction;
    valuesRef.current.isDragging = runtime.drag.active;

    if (!runtime.drag.active && !runtime.decayActive) {
      const values = valuesRef.current;
      const almostSettled =
        Math.abs(values.gradientX) < 0.01 &&
        Math.abs(values.gradientY) < 0.01 &&
        Math.abs(values.gradientAngle) < 0.01 &&
        Math.abs(values.gradientIntensity) < 0.001 &&
        Math.abs(values.gradientStretch - 1) < 0.0005 &&
        Math.abs(values.progress) < 0.001 &&
        Math.abs(values.velocity) < 0.001;

      if (almostSettled) {
        valuesRef.current = cloneMotionValues(NEUTRAL_MOTION_VALUES);
        runtime.velocity = { ...ZERO_MOTION_VELOCITY };
        notify();
        return;
      }
    }

    notify();
    scheduleFrame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notify]);

  const startDrag = useCallback((x: number, y: number, width: number, height: number) => {
    const now = performance.now();
    const runtime = runtimeRef.current;

    runtime.drag = {
      active: true,
      startX: x,
      startY: y,
      lastX: x,
      lastY: y,
      lastTime: now,
      width: Math.max(1, width),
      height: Math.max(1, height),
    };
    runtime.decayActive = false;
    runtime.target.isDragging = true;
    lastFrameRef.current = now;
    scheduleFrame();
  }, [scheduleFrame]);

  const updateDrag = useCallback((x: number, y: number, width: number, height: number) => {
    const runtime = runtimeRef.current;
    if (!runtime.drag.active) return;

    const currentConfig = configRef.current;
    const motionScale = getMotionScale(currentConfig, prefersReducedMotionRef.current);
    const now = performance.now();
    const dt = Math.max((now - runtime.drag.lastTime) / 1000, 1 / 120);
    const rawDx = x - runtime.drag.startX;
    const rawDy = y - runtime.drag.startY;
    const sampleVelocity = (x - runtime.drag.lastX) / dt;
    const normalizedVelocity = clamp(sampleVelocity / Math.max(1, currentConfig.maxVelocity), -1, 1);
    const safeWidth = Math.max(1, width || runtime.drag.width);
    const safeHeight = Math.max(1, height || runtime.drag.height);
    const progress = clamp(rawDx / safeWidth, -1, 1);
    const distanceIntensity = clamp(Math.abs(rawDx) / (safeWidth * 0.34), 0, 1);
    const velocityIntensity = Math.abs(normalizedVelocity);
    const intensity = clamp(
      (distanceIntensity * 0.48 + velocityIntensity * 0.52) * currentConfig.intensityGain,
      0,
      1,
    ) * motionScale;
    const direction = signDirection(progress || normalizedVelocity);
    const xFromDrag = progress * currentConfig.maxDisplacement;
    const xFromVelocity = normalizedVelocity * currentConfig.maxDisplacement * 0.38;
    const targetX = clamp(
      (xFromDrag + xFromVelocity) * motionScale,
      -currentConfig.maxDisplacement,
      currentConfig.maxDisplacement,
    );
    const targetY = clamp(
      ((rawDy / safeHeight) * currentConfig.maxDisplacement * currentConfig.verticalDrift +
        intensity * direction * currentConfig.maxDisplacement * 0.05) * motionScale,
      -currentConfig.maxDisplacement * 0.45,
      currentConfig.maxDisplacement * 0.45,
    );

    runtime.target = {
      gradientX: targetX,
      gradientY: targetY,
      gradientAngle: clamp(
        (direction * intensity * currentConfig.angleGain + normalizedVelocity * currentConfig.angleGain * 0.36) * motionScale,
        -currentConfig.angleGain * 1.35,
        currentConfig.angleGain * 1.35,
      ),
      gradientIntensity: intensity,
      gradientStretch: 1 + intensity * currentConfig.stretchGain,
      gradientDistortion: intensity * currentConfig.distortionGain,
      settlingIntensity: intensity * 0.72,
      progress,
      direction,
      velocity: normalizedVelocity,
      isDragging: true,
    };

    runtime.drag.lastX = x;
    runtime.drag.lastY = y;
    runtime.drag.lastTime = now;
    runtime.drag.width = safeWidth;
    runtime.drag.height = safeHeight;
    scheduleFrame();
  }, [scheduleFrame]);

  const endDrag = useCallback(() => {
    const runtime = runtimeRef.current;
    const currentConfig = configRef.current;
    const motionScale = getMotionScale(currentConfig, prefersReducedMotionRef.current);
    const releaseVelocity = runtime.target.velocity;
    const releaseDirection = signDirection(releaseVelocity || runtime.target.progress);
    const speed = clamp(Math.abs(releaseVelocity), 0, 1);
    const displacementMomentum = releaseVelocity * currentConfig.maxDisplacement * currentConfig.releaseMomentum;
    const angleMomentum = releaseVelocity * currentConfig.angleGain * currentConfig.releaseMomentum;

    runtime.drag.active = false;
    runtime.decayActive = speed > 0.015 && motionScale > 0;
    runtime.target = {
      gradientX: clamp(displacementMomentum * 0.16 * motionScale, -currentConfig.maxDisplacement * 0.32, currentConfig.maxDisplacement * 0.32),
      gradientY: releaseDirection * speed * currentConfig.maxDisplacement * currentConfig.verticalDrift * 0.18 * motionScale,
      gradientAngle: angleMomentum * 0.24 * motionScale,
      gradientIntensity: speed * currentConfig.intensityGain * 0.36 * motionScale,
      gradientStretch: 1 + speed * currentConfig.stretchGain * 0.32 * motionScale,
      gradientDistortion: speed * currentConfig.distortionGain * 0.34 * motionScale,
      settlingIntensity: speed * 0.54 * motionScale,
      progress: releaseDirection * speed * 0.12 * motionScale,
      direction: releaseDirection,
      velocity: releaseVelocity * motionScale,
      isDragging: false,
    };
    runtime.velocity.gradientX += displacementMomentum * 7.5 * motionScale;
    runtime.velocity.gradientY += releaseDirection * speed * currentConfig.maxDisplacement * currentConfig.verticalDrift * 2.8 * motionScale;
    runtime.velocity.gradientAngle += angleMomentum * 8.2 * motionScale;
    runtime.velocity.progress += releaseVelocity * 1.8 * motionScale;
    runtime.velocity.velocity += releaseVelocity * 2.4 * motionScale;
    runtime.velocity.gradientStretch += speed * currentConfig.stretchGain * 2.6 * motionScale;
    runtime.velocity.gradientDistortion += speed * currentConfig.distortionGain * 2.2 * motionScale;
    runtime.velocity.settlingIntensity += speed * 2.5 * motionScale;

    scheduleFrame();
  }, [scheduleFrame]);

  const subscribe = useCallback((callback: (values: LiquidSliderMotionValues) => void) => {
    subscribersRef.current.add(callback);
    callback(valuesRef.current);

    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  useEffect(() => () => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
  }, []);

  return useMemo(() => ({
    startDrag,
    updateDrag,
    endDrag,
    subscribe,
    getSnapshot,
  }), [endDrag, getSnapshot, startDrag, subscribe, updateDrag]);
}
