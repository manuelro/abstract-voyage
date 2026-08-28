import { useCallback, useEffect, useRef } from 'react';
import {
  computeElevationShadow,
  serializeElevationShadowLayers,
  serializeElevationShadowLayersAsDropShadowFilter,
  type ElevationShadowResult,
} from '../../helpers/elevationShadowEngine';

export type ElevationShadowLightOptions = {
  /** 0..100 — horizontal light position as a percentage of viewport width. */
  xPercent: number;
  /** Document-relative vertical position; negative sits above the top of
   * the document/composition. */
  yPx: number;
  heightPx: number;
  radiusPx: number;
  directIntensity: number;
  ambientIntensity: number;
};

export type ElevationShadowResponseOptions = {
  projectedStrength: number;
  projectedFalloff: number;
  contactStrength: number;
  contactFalloff: number;
  contactDecayElevationPx: number;
  nearFieldStrength: number;
  maxBlurPx: number;
  maxDisplacementPx: number;
  maxProjectedScale: number;
  color: string;
};

export type UseElevationShadowOptions = {
  enabled: boolean;
  elevationMinPx: number;
  elevationMaxPx: number;
  light: ElevationShadowLightOptions;
  response: ElevationShadowResponseOptions;
  /** See ElevationShadowInput.directional's own doc comment
   * (helpers/elevationShadowEngine.ts) — forwarded straight through.
   * Defaults to true (today's only behavior) when omitted. */
  directional?: boolean;
  /** 'boxShadow' (default) follows the target element's own border-box/
   * border-radius — right for solid shapes (buttons, cards). 'dropShadow'
   * instead writes a `filter: drop-shadow(...)` chain, which hugs the
   * actual rendered alpha shape (glyph outlines for text) rather than the
   * element's rectangular box — use this for text or any non-rectangular
   * content where a box-shaped shadow would look wrong. */
  outputMode?: 'boxShadow' | 'dropShadow';
};

export type ElevationShadowDebugSnapshot = ElevationShadowResult & {
  lightX: number;
  lightY: number;
  objectCenterX: number;
  objectCenterY: number;
  elevationPx: number;
  elevationMinPx: number;
  elevationMaxPx: number;
  coordinateSystem: 'document';
};

type Scene = {
  objectCenterX: number;
  objectCenterY: number;
  viewportWidthPx: number;
};

/**
 * Reusable elevation → layered-shadow engine binding. Measures the target
 * element once in DOCUMENT coordinates (mount + resize/layout — see
 * helpers/elevationShadowEngine.ts for why scroll doesn't require
 * re-measurement) and, on demand via `applyElevation`, computes and writes
 * a physically-derived multi-layer box-shadow directly onto the element.
 *
 * This hook owns only the shadow (`element.style.boxShadow`). It does not
 * touch `transform` — composing lift/tilt/scale is the consumer's concern,
 * so this stays adoptable by any element that just wants a believable,
 * elevation-driven shadow.
 */
export function useElevationShadow<TElement extends HTMLElement>(
  options: UseElevationShadowOptions,
) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const elementRef = useRef<TElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const lastElevationRef = useRef(options.elevationMinPx);
  const debugSnapshotRef = useRef<ElevationShadowDebugSnapshot | null>(null);
  const appliedRef = useRef(false);
  const appliedPropertyRef = useRef<'box-shadow' | 'filter' | null>(null);

  const measure = useCallback(() => {
    const element = elementRef.current;
    if (!element || typeof window === 'undefined') return;
    const rect = element.getBoundingClientRect();
    sceneRef.current = {
      objectCenterX: rect.left + window.scrollX + rect.width / 2,
      objectCenterY: rect.top + window.scrollY + rect.height / 2,
      viewportWidthPx: window.innerWidth || rect.width,
    };
  }, []);

  const lastAlphaMultiplierRef = useRef(1);

  /** `alphaMultiplier` (0..1, default 1) scales every resolved layer's own
   * alpha before serializing — a live, per-call fade knob distinct from
   * `enabled` (a structural on/off, which removes the CSS property
   * outright and never animates). Built for a consumer that needs a
   * smooth, tweened transition between "this element casts a shadow" and
   * "it doesn't" (see useCardLiftPhysics.ts's own shadowEnabled/
   * shadowVisibilityRef) — driving `elevationPx` alone can't produce that:
   * the contact/ambient-occlusion layer (helpers/elevationShadowEngine.ts)
   * is strongest at elevation 0 by design, so there is no single elevation
   * value whose shadow is genuinely invisible. */
  const applyElevation = useCallback((
    elevationPx: number,
    alphaMultiplier = 1,
  ): ElevationShadowResult | null => {
    const element = elementRef.current;
    lastElevationRef.current = elevationPx;
    lastAlphaMultiplierRef.current = alphaMultiplier;
    if (!element || typeof window === 'undefined') return null;

    const {
      enabled, elevationMinPx, elevationMaxPx, light, response, outputMode = 'boxShadow',
      directional = true,
    } = optionsRef.current;
    if (!enabled) {
      if (appliedRef.current && appliedPropertyRef.current) {
        element.style.removeProperty(appliedPropertyRef.current);
        appliedRef.current = false;
        appliedPropertyRef.current = null;
      }
      return null;
    }

    if (!sceneRef.current) measure();
    const scene = sceneRef.current;
    if (!scene) return null;

    const lightX = (light.xPercent / 100) * scene.viewportWidthPx;
    const result = computeElevationShadow({
      lightX,
      lightY: light.yPx,
      lightHeightPx: light.heightPx,
      lightRadiusPx: light.radiusPx,
      lightDirectIntensity: light.directIntensity,
      lightAmbientIntensity: light.ambientIntensity,
      objectCenterX: scene.objectCenterX,
      objectCenterY: scene.objectCenterY,
      viewportWidthPx: scene.viewportWidthPx,
      elevationPx,
      elevationMinPx,
      elevationMaxPx,
      projectedStrength: response.projectedStrength,
      projectedFalloff: response.projectedFalloff,
      contactStrength: response.contactStrength,
      contactFalloff: response.contactFalloff,
      contactDecayElevationPx: response.contactDecayElevationPx,
      nearFieldStrength: response.nearFieldStrength,
      maxBlurPx: response.maxBlurPx,
      maxDisplacementPx: response.maxDisplacementPx,
      maxProjectedScale: response.maxProjectedScale,
      directional,
    });

    const clampedAlphaMultiplier = Math.min(1, Math.max(0, alphaMultiplier));
    const fadedLayers = clampedAlphaMultiplier === 1
      ? result.layers
      : result.layers.map(layer => ({ ...layer, alpha: layer.alpha * clampedAlphaMultiplier }));

    if (outputMode === 'dropShadow') {
      if (appliedPropertyRef.current === 'box-shadow') {
        element.style.removeProperty('box-shadow');
      }
      element.style.filter = serializeElevationShadowLayersAsDropShadowFilter(
        fadedLayers, response.color,
      );
      appliedPropertyRef.current = 'filter';
    } else {
      if (appliedPropertyRef.current === 'filter') {
        element.style.removeProperty('filter');
      }
      element.style.boxShadow = serializeElevationShadowLayers(fadedLayers, response.color);
      appliedPropertyRef.current = 'box-shadow';
    }
    appliedRef.current = true;
    debugSnapshotRef.current = {
      ...result,
      lightX,
      lightY: light.yPx,
      objectCenterX: scene.objectCenterX,
      objectCenterY: scene.objectCenterY,
      elevationPx,
      elevationMinPx,
      elevationMaxPx,
      coordinateSystem: 'document',
    };
    return result;
  }, [measure]);

  const ref = useCallback((element: TElement | null) => {
    const previousElement = elementRef.current;
    if (
      previousElement &&
      previousElement !== element &&
      appliedPropertyRef.current
    ) {
      previousElement.style.removeProperty(appliedPropertyRef.current);
      appliedRef.current = false;
      appliedPropertyRef.current = null;
    }
    elementRef.current = element;
    sceneRef.current = null;
    if (element) {
      measure();
      applyElevation(lastElevationRef.current, lastAlphaMultiplierRef.current);
    }
  }, [applyElevation, measure]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const remeasureAndReapply = () => {
      measure();
      applyElevation(lastElevationRef.current, lastAlphaMultiplierRef.current);
    };
    // A couple of deferred re-measures catch late layout shifts (web font
    // swap, hero content reflow) that a single mount-time measurement can
    // miss — cheap, self-terminating, not a continuous loop.
    const settleFrame = window.requestAnimationFrame(remeasureAndReapply);
    window.addEventListener('resize', remeasureAndReapply, { passive: true });
    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(remeasureAndReapply)
      : null;
    if (elementRef.current) resizeObserver?.observe(elementRef.current);

    return () => {
      window.cancelAnimationFrame(settleFrame);
      window.removeEventListener('resize', remeasureAndReapply);
      resizeObserver?.disconnect();
    };
  }, [applyElevation, measure]);

  const getDebugSnapshot = useCallback(() => debugSnapshotRef.current, []);

  return { applyElevation, getDebugSnapshot, ref };
}
