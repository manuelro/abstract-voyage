import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import {
  usePointerProximity,
  type PointerProximityState,
} from './usePointerProximity';
import {
  useElevationShadow,
  type ElevationShadowDebugSnapshot,
} from './useElevationShadow';
import { createCssEasingFunction, type EasingFunction } from '../../helpers/cubicBezierEasing';
import { CTA_BUTTON_MOTION_EASINGS, type CtaButtonConfig } from '../CtaButton/config/registered';

const SPRING_SETTLE_DISPLACEMENT_PX = 0.05;
const SPRING_SETTLE_VELOCITY_PX_PER_S = 0.05;
const SPRING_MAX_STEP_SECONDS = 1 / 30;
const SPRING_MAX_DURATION_MS = 2400;

/** Pond-bounce press target (elevationReactionEnabled: false) — shared by
 * handlePress's own tween and resolveTargetElevation's steady-state read, so
 * a proximity-engine frame that lands mid-hold (after the press tween has
 * already finished) resolves to the same compressed value instead of
 * snapping back to resting while the user is still holding. */
const resolvePressCompressedElevation = (
  restingElevationPx: number,
  pressCompressPx: number,
) => restingElevationPx - pressCompressPx;

const prefersReducedMotion = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

export const isFocusVisible = (element: Element) => {
  try {
    return element.matches(':focus-visible');
  } catch {
    // :focus-visible support is universal in evergreen browsers; fall back to
    // treating any focus as visible rather than silently losing the effect.
    return true;
  }
};

export type UseCardLiftPhysicsOptions = {
  /** Reuses CtaButton's own config shape — same light position, elevation
   * curve, and shadow response as the button, not a parallel config. */
  config: CtaButtonConfig;
  /** Keeps pointerup/pointercancel routed to the transformed element while
   * it moves under the pointer. Composite shells whose descendants are the
   * actual interactive targets (for example a full-card anchor inside a 3D
   * flipper) must opt out so pointer capture does not retarget the resulting
   * click away from that descendant. */
  capturePointer?: boolean;
  /** Disables proximity tracking (e.g. the element is off-screen, or the
   * consumer's own disabled/aria-disabled state) — eases lift/tilt/scale
   * back toward their resting values, a real, visible release. */
  disabled?: boolean;
  /** The elevation target resolved while `disabled` is true, instead of
   * `config.shadowElevationRestingPx` (this option's own default,
   * unchanged behavior for every consumer that doesn't pass it). Exists
   * because "resting" and "disabled" are different concepts that happen to
   * share a value by default: shadowElevationRestingPx is deliberately a
   * small nonzero ambient shadow for an ordinary *interactive-but-idle*
   * element (proximity 0, no hover) — appropriate there — but a genuinely
   * disabled instance (e.g. a settled, non-active card in a stack, which
   * should read as completely flat) may need to resolve to real zero
   * instead. `resolveTargetElevation` only ever reads this on the disabled
   * path; a real press/focus/forceElevated/dev-override still wins over it
   * (though in practice `disabled` already suppresses press entirely — see
   * `handlePress`). */
  disabledElevationPx?: number;
  /** true (default): unchanged behavior — the shadow renders at its normal,
   * fully-resolved alpha. false: the shadow eases to fully invisible
   * instead (a tweened alpha fade to 0, see shadowEnabledTransitionMs/
   * shadowEnabledEasingCss below — not an instant removal). Exists because
   * `disabledElevationPx: 0` alone does *not* guarantee zero shadow: the
   * contact/ambient-occlusion layer (helpers/elevationShadowEngine.ts) is
   * inversely coupled to elevation by design — it's strongest at
   * elevation 0 (an object flush against the surface has a tight, dark
   * contact shadow around its base), so a naive "elevation 0 = no shadow"
   * assumption is wrong for that layer specifically. Use this instead of
   * (or alongside) `disabledElevationPx: 0` whenever an instance must cast
   * truly zero shadow, not just settle to its smallest one. Independent of
   * `config.shadowEngineEnabled` (a global, per-config toggle, not
   * per-instance) — that one still fully removes the CSS property outright
   * with no transition, for a genuinely disabled engine; this one always
   * animates. */
  shadowEnabled?: boolean;
  /** Duration/easing for the shadowEnabled fade above. Defaults to
   * `config.stateExitTransitionMs`/`config.stateExitEasing` — the same
   * "discrete state exit" family every other release-style transition in
   * this hook already uses by default — but a caller with its own
   * dedicated timing (e.g. a card stack's own neighbor-shadow-fade config)
   * should pass real values here instead of relying on the CTA-wide
   * default, since changing that default would also retime every button's
   * own unrelated hover-exit. */
  shadowEnabledTransitionMs?: number;
  shadowEnabledEasingCss?: string;
  /** Distinct from `disabled` — see `freeze`'s own doc comment on
   * `PointerProximityOptions` (this option passes straight through to that
   * same underlying hook). Holds the current lift/tilt/scale exactly where
   * they are, with no further movement in either direction, instead of
   * easing toward resting. Built for an element whose own bounding box is
   * being animated elsewhere (so proximity computed against that box mid-
   * animation wouldn't reflect real pointer intent) but that isn't meant to
   * visibly release yet either. */
  freeze?: boolean;
  /** A static, additional rotateZ term composed alongside the dynamic
   * tilt/lift/scale stack — 0 for CtaButton itself, a per-card resting angle
   * for scattered cards. */
  rotationDeg?: number;
  /** Resolves elevation as if hovered (shadowElevationHoverPx), without any
   * real pointer proximity, press, or focus — e.g. CtaButton's own
   * forceHover prop, which passes this straight through to nudge attention
   * toward a recommended action. Deliberately distinct from
   * shadowDevElevationOverride*: that pair is a dev-only shadow-tuning
   * debug flag, not an end-user-facing effect, and conflating the two would
   * blur a real product UX affordance with a panel debugging tool. A real
   * press still always wins over this (see resolveTargetElevation) — this
   * only ever substitutes for proximity/focus, never for actual
   * interaction. */
  forceElevated?: boolean;
  /** Seeds the elevation ref's starting value in place of
   * config.shadowElevationRestingPx -- for a freshly-mounted instance that
   * should visually continue from a *different* element's prior displayed
   * elevation rather than snapping straight to its own resting target on
   * mount (e.g. a composer pill that replaces a CTA button in place and
   * wants to tween up from the CTA's own resting elevation, not appear
   * already at its final value). Purely a starting point -- steady-state
   * resolution (resolveTargetElevation) is untouched; pair with the
   * returned tweenRestingElevation to actually animate up to the real
   * target after mount. */
  initialElevationPx?: number;
  /** By default pointer proximity is measured from the transformed element.
   * `separate` exposes `interactionRef`, allowing a stable ancestor to own
   * hit-area measurement and visibility observation while this hook still
   * applies lift/tilt/scale to the transform element. */
  interactionTarget?: 'transform' | 'separate';
  /** `local` preserves the historical behavior and prepends a
   * `perspective(...)` transform to this element. `inherited` omits that
   * projection so a composite 3D scene can supply one shared camera on an
   * ancestor without nesting a second perspective. */
  projection?: 'local' | 'inherited';
  /** By default the transformed element also receives the elevation shadow.
   * `separate` exposes `shadowRef`, allowing a rotating descendant to own the
   * shadow while this element continues to own lift/tilt/scale. */
  shadowTarget?: 'transform' | 'separate';
  /** Which axis `proximityLiftPx` translates along as elevation rises.
   * `'y'` (default): today's only behavior — the element slides upward on
   * screen (`translate3d(0, -lift, 0)`), reading as a physical object lifted
   * off a surface toward an overhead light (this hook's own shadow model).
   * `'z'`: the element instead pushes toward the viewer along the depth axis
   * (`translate3d(0, 0, lift)`, positive Z moves *out* of the screen under
   * `perspective`) — combined with the already-centered `scale()` term
   * (transform-origin defaults to center/center; nothing here overrides it),
   * this reads as the card coming forward from its own center rather than
   * sliding off its resting position. Requires a real `perspective` to be in
   * effect (`projection: 'local'`, or an ancestor supplying one under
   * `'inherited'`) to have any visible depth effect at all — without one,
   * `translateZ` is optically a no-op. Only the lift's own axis changes;
   * tilt (`rotateX`/`rotateY`) and `proximityScale` are unaffected either
   * way, and the shadow (driven by the elevation *value*, not by how it's
   * rendered here) doesn't need to know which axis was chosen. */
  liftAxis?: 'y' | 'z';
  /** false (default): today's only behavior — the shared elevation-shadow
   * engine's own directional "lit from above" model (see
   * ElevationShadowInput.directional's own doc comment,
   * helpers/elevationShadowEngine.ts), the same physical shadow CtaButton
   * uses. true: every shadow layer's offset is forced to (0, 0) — a
   * symmetric, center-anchored shadow directly under the element, still
   * fully elevation-reactive (blur/spread/alpha unchanged), just without
   * the directional lean. For a context where `liftAxis: 'z'` (translateZ,
   * "comes forward from its own center") is already centered/symmetric in
   * its *motion* — a one-sided shadow reads as inconsistent with that,
   * unlike liftAxis: 'y', where the element genuinely displaces upward and
   * a downward-leaning shadow is the physically correct read. */
  centeredShadow?: boolean;
};

/**
 * Shared proximity → lift/tilt/scale + layered-shadow composition, extracted
 * from `CtaButton.tsx` so any interactive card can get the exact same
 * physical feel without hand-duplicating the math. Built on the two already-
 * generic primitives (`usePointerProximity`, `useElevationShadow`) — those
 * aren't touched, only the glue that composes them was duplicated before.
 *
 * Owns: proximity subscription, elevation state (resting/hover/focus/pressed
 * targets), the rAF tween for discrete state changes, and imperative
 * transform + box-shadow writes on the configured target element(s). Does not touch
 * `className`/color/gradient state — purely the physical response.
 */
export function useCardLiftPhysics<TElement extends HTMLElement>({
  config,
  capturePointer = true,
  disabled = false,
  disabledElevationPx = config.shadowElevationRestingPx,
  shadowEnabled = true,
  shadowEnabledTransitionMs = config.stateExitTransitionMs,
  shadowEnabledEasingCss = CTA_BUTTON_MOTION_EASINGS[config.stateExitEasing],
  freeze = false,
  rotationDeg = 0,
  forceElevated = false,
  initialElevationPx,
  interactionTarget = 'transform',
  projection = 'local',
  shadowTarget = 'transform',
  liftAxis = 'y',
  centeredShadow = false,
}: UseCardLiftPhysicsOptions) {
  const elementRef = useRef<TElement | null>(null);
  const pressedRef = useRef(false);
  const capturedPointerIdRef = useRef<number | null>(null);
  const focusVisibleRef = useRef(false);
  const elevationRef = useRef(initialElevationPx ?? config.shadowElevationRestingPx);
  const elevationTweenRef = useRef(0);
  // Tweened shadow alpha multiplier (0..1) — see shadowEnabled's own doc
  // comment for why this is a separate, always-animated fade rather than
  // driven by elevationPx. Seeded from the initial shadowEnabled value so
  // the very first render doesn't flash a shadow before the "off" case has
  // ever run its own effect.
  const shadowVisibilityRef = useRef(shadowEnabled ? 1 : 0);
  const shadowVisibilityTweenRef = useRef(0);
  const latestInteractionRef = useRef({ proximity: 0, x: 0, y: 0 });
  const easingCacheRef = useRef<{ css: string; fn: EasingFunction } | null>(null);
  const shadowEasingCacheRef = useRef<{ css: string; fn: EasingFunction } | null>(null);
  const rotationDegRef = useRef(rotationDeg);
  rotationDegRef.current = rotationDeg;

  const elevationShadowOptions = useMemo(() => ({
    enabled: config.shadowEngineEnabled,
    elevationMinPx: config.shadowElevationMinPx,
    elevationMaxPx: config.shadowElevationMaxPx,
    light: {
      xPercent: config.shadowLightXPercent,
      yPx: config.shadowLightYPx,
      heightPx: config.shadowLightHeightPx,
      radiusPx: config.shadowLightRadiusPx,
      directIntensity: config.shadowLightDirectIntensity,
      ambientIntensity: config.shadowLightAmbientIntensity,
    },
    response: {
      projectedStrength: config.shadowProjectedStrength,
      projectedFalloff: config.shadowProjectedFalloff,
      contactStrength: config.shadowContactStrength,
      contactFalloff: config.shadowContactFalloff,
      contactDecayElevationPx: config.shadowContactDecayElevationPx,
      nearFieldStrength: config.shadowNearFieldStrength,
      maxBlurPx: config.shadowMaxBlurPx,
      maxDisplacementPx: config.shadowMaxDisplacementPx,
      maxProjectedScale: config.shadowMaxProjectedScale,
      color: config.shadowColor,
    },
    directional: !centeredShadow,
  }), [
    config.shadowEngineEnabled,
    config.shadowElevationMinPx,
    config.shadowElevationMaxPx,
    config.shadowLightXPercent,
    config.shadowLightYPx,
    config.shadowLightHeightPx,
    config.shadowLightRadiusPx,
    config.shadowLightDirectIntensity,
    config.shadowLightAmbientIntensity,
    config.shadowProjectedStrength,
    config.shadowProjectedFalloff,
    config.shadowContactStrength,
    config.shadowContactFalloff,
    config.shadowContactDecayElevationPx,
    config.shadowNearFieldStrength,
    config.shadowMaxBlurPx,
    config.shadowMaxDisplacementPx,
    config.shadowMaxProjectedScale,
    config.shadowColor,
    centeredShadow,
  ]);
  const {
    applyElevation: applyElevationShadow,
    getDebugSnapshot,
    ref: elevationShadowRef,
  } = useElevationShadow<TElement>(elevationShadowOptions);

  // translateY/scale gain: proximityLiftPx/proximityScale are "value reached
  // at hover elevation," driven by elevation rather than raw proximity.
  const composeAndApply = useCallback((elevationPx: number) => {
    elevationRef.current = elevationPx;
    const element = elementRef.current;
    if (!element) return;
    const { proximity, x, y } = latestInteractionRef.current;
    const hoverElevation = Math.max(config.shadowElevationHoverPx, 0.001);
    const liftGain = config.proximityLiftPx / hoverElevation;
    const scaleGain = (config.proximityScale - 1) / hoverElevation;
    const lift = elevationPx * liftGain;
    const scale = 1 + elevationPx * scaleGain;
    const tiltX = config.tiltEnabled && config.tiltYEnabled
      ? -y * proximity * config.tiltMaxDegrees
      : 0;
    const tiltY = config.tiltEnabled ? x * proximity * config.tiltMaxDegrees : 0;
    element.style.transform = [
      projection === 'local'
        ? `perspective(${config.tiltPerspectivePx}px)`
        : '',
      liftAxis === 'z'
        ? `translate3d(0, 0, ${lift.toFixed(3)}px)`
        : `translate3d(0, ${(-lift).toFixed(3)}px, 0)`,
      `rotateZ(${rotationDegRef.current.toFixed(3)}deg)`,
      `rotateX(${tiltX.toFixed(3)}deg)`,
      `rotateY(${tiltY.toFixed(3)}deg)`,
      `scale(${scale.toFixed(5)})`,
    ].filter(Boolean).join(' ');
    applyElevationShadow(elevationPx, shadowVisibilityRef.current);
  }, [
    applyElevationShadow,
    config.proximityLiftPx,
    config.proximityScale,
    config.shadowElevationHoverPx,
    config.tiltEnabled,
    config.tiltYEnabled,
    config.tiltMaxDegrees,
    config.tiltPerspectivePx,
    projection,
    liftAxis,
  ]);

  const resolveTargetElevation = useCallback((proximity: number) => {
    if (config.shadowDevElevationOverrideEnabled) {
      return config.shadowDevElevationOverridePx;
    }
    // "Reaction off" still short-circuits hover/focus entirely — but a
    // still-held press must keep resolving to the same compressed target
    // handlePress already tweened to, not resting. Without this, the
    // proximity engine's own per-frame read (independent of, and outliving,
    // handlePress's short pressTransitionMs tween) snaps the button back to
    // resting the instant that tween finishes, well before the real
    // pointerup — cutting the hold short and leaving handleRelease's spring
    // nothing to bounce back from.
    if (!config.elevationReactionEnabled) {
      return pressedRef.current
        ? resolvePressCompressedElevation(
            config.shadowElevationRestingPx,
            config.pressCompressPx,
          )
        : config.shadowElevationRestingPx;
    }
    // A real press always wins over a simulated state — checked first, above.
    if (pressedRef.current) return config.shadowElevationPressedPx;
    // Substitutes for proximity/focus only, resolving as if genuinely
    // hovered — see forceElevated's own doc comment on
    // UseCardLiftPhysicsOptions for why this is a distinct concept from the
    // dev elevation override checked above.
    if (forceElevated) return config.shadowElevationHoverPx;
    // A disabled instance blends toward disabledElevationPx as its own
    // floor, in place of config.shadowElevationRestingPx — NOT a hard
    // early return to a constant. usePointerProximity itself already
    // forces its own target to 0 the moment `disabled` turns true, so
    // `proximity` (this function's own argument) is already smoothly
    // decaying over `releaseMs` on every frame `applyProximity` calls this
    // — an early return here would recompute the exact same constant every
    // one of those frames, discarding that live decay and making elevation
    // (and, via composeAndApply, the lift/scale transform derived from it)
    // snap straight to disabledElevationPx on the very first frame
    // `disabled` becomes true instead of gradually settling there
    // (operator-reported: "the active card that now becomes... a
    // neighbour... [has] a scaling or a translate or an elevation that's
    // not being properly transitioned"). Substituting the floor instead
    // lets the same, already-smooth decay this hook always relied on for
    // its "existing release/decay envelope" (see this option's own
    // UseCardLiftPhysicsOptions doc comment) converge on the disabled
    // target gradually, exactly like it already did for
    // shadowElevationRestingPx before disabledElevationPx existed — just
    // landing at the caller's real target now, not always
    // shadowElevationRestingPx regardless of what that target should be.
    const restingFloor = disabled ? disabledElevationPx : config.shadowElevationRestingPx;
    const hoverTarget = restingFloor
      + (config.shadowElevationHoverPx - restingFloor)
        * Math.min(1, Math.max(0, proximity));
    return focusVisibleRef.current
      ? Math.max(hoverTarget, config.shadowElevationFocusPx)
      : hoverTarget;
  }, [
    config.shadowDevElevationOverrideEnabled,
    config.shadowDevElevationOverridePx,
    config.elevationReactionEnabled,
    config.pressCompressPx,
    config.shadowElevationPressedPx,
    config.shadowElevationRestingPx,
    config.shadowElevationHoverPx,
    config.shadowElevationFocusPx,
    forceElevated,
    disabled,
    disabledElevationPx,
  ]);

  /** Short, self-terminating rAF tween for discrete state changes (press,
   * focus, release) — evaluated in JS via helpers/cubicBezierEasing.ts so
   * hover/press/focus feel identical in character to any CSS-driven motion. */
  const runElevationTween = useCallback((
    target: number,
    durationMs: number,
    easingCss: string,
  ) => {
    if (typeof window === 'undefined') return;
    if (elevationTweenRef.current) {
      window.cancelAnimationFrame(elevationTweenRef.current);
      elevationTweenRef.current = 0;
    }
    const from = elevationRef.current;
    if (prefersReducedMotion() || durationMs <= 0 || Math.abs(target - from) < 0.01) {
      composeAndApply(target);
      return;
    }
    if (easingCacheRef.current?.css !== easingCss) {
      easingCacheRef.current = { css: easingCss, fn: createCssEasingFunction(easingCss) };
    }
    const easingFn = easingCacheRef.current.fn;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / Math.max(durationMs, 1));
      composeAndApply(from + (target - from) * easingFn(progress));
      if (progress < 1) {
        elevationTweenRef.current = window.requestAnimationFrame(step);
      } else {
        elevationTweenRef.current = 0;
      }
    };
    elevationTweenRef.current = window.requestAnimationFrame(step);
  }, [composeAndApply]);

  /** Damped-spring settle for the pond-bounce release (see handleRelease) —
   * unlike runElevationTween's fixed-duration curve, this integrates a
   * mass-1 harmonic oscillator (semi-implicit Euler, variable frame dt) so
   * it can overshoot past `target` and decay through a few real bounces
   * before stopping, rather than a single directional ease. Shares
   * elevationTweenRef with runElevationTween — the two are mutually
   * exclusive (only one ever owns the live elevation value), so the same
   * cancel-on-start guard and applyProximity/effect "is anything animating"
   * check both already work unmodified for this path too. */
  const runElevationSpring = useCallback((
    target: number,
    stiffness: number,
    damping: number,
  ) => {
    if (typeof window === 'undefined') return;
    if (elevationTweenRef.current) {
      window.cancelAnimationFrame(elevationTweenRef.current);
      elevationTweenRef.current = 0;
    }
    if (prefersReducedMotion()) {
      composeAndApply(target);
      return;
    }
    let displacement = elevationRef.current - target;
    let velocity = 0;
    let lastTime = performance.now();
    const startTime = lastTime;
    const step = (now: number) => {
      // Clamped so a dropped/throttled frame (backgrounded tab, slow
      // device) can't inject a huge dt and destabilize the integration.
      const dt = Math.min((now - lastTime) / 1000, SPRING_MAX_STEP_SECONDS);
      lastTime = now;
      const acceleration = -stiffness * displacement - damping * velocity;
      velocity += acceleration * dt;
      displacement += velocity * dt;
      const settled = Math.abs(displacement) < SPRING_SETTLE_DISPLACEMENT_PX
        && Math.abs(velocity) < SPRING_SETTLE_VELOCITY_PX_PER_S;
      // Safety cutoff, not a normal exit path — a positive damping value
      // always converges well within this window; guards only against a
      // misconfigured (near-zero damping) panel value ringing indefinitely.
      const timedOut = now - startTime > SPRING_MAX_DURATION_MS;
      if (settled || timedOut) {
        composeAndApply(target);
        elevationTweenRef.current = 0;
        return;
      }
      composeAndApply(target + displacement);
      elevationTweenRef.current = window.requestAnimationFrame(step);
    };
    elevationTweenRef.current = window.requestAnimationFrame(step);
  }, [composeAndApply]);

  // Detected here, during render, rather than inside an effect: this needs
  // to be visible to every effect that fires in the commit forceElevated
  // changes in, including usePointerProximity's own internal effect (below),
  // which — being a nested hook called before this hook's own effects
  // further down — runs before them and would otherwise call applyProximity
  // (via its onChange) first. Since resolveTargetElevation's forceElevated
  // branch resolves to the forced/released value regardless of the
  // proximity passed in, that un-tweened composeAndApply would snap straight
  // to the new state ahead of the discrete tween below, leaving that tween
  // with nothing left to animate — a render-phase ref comparison (a
  // documented React pattern for exactly this "detect a prop change ASAP"
  // case) is the only way to make the flag available that early.
  const forceElevatedTransitionPendingRef = useRef(false);
  const previousForceElevatedRef = useRef(forceElevated);
  if (previousForceElevatedRef.current !== forceElevated) {
    previousForceElevatedRef.current = forceElevated;
    forceElevatedTransitionPendingRef.current = true;
  }

  const applyProximity = useCallback((
    _element: HTMLElement,
    { proximity, x, y }: PointerProximityState,
  ) => {
    latestInteractionRef.current = { proximity, x, y };
    // A discrete tween (press/focus/release/forceElevated) currently owns
    // the elevation value — let it finish rather than fighting it every
    // frame. It reads latestInteractionRef itself, so tilt/scale stay live
    // regardless. See forceElevatedTransitionPendingRef's own comment above
    // for why a forceElevated check alone isn't enough to prevent this from
    // racing ahead of the discrete tween below on the *release* side.
    if (elevationTweenRef.current || forceElevated || forceElevatedTransitionPendingRef.current) return;
    composeAndApply(resolveTargetElevation(proximity));
  }, [composeAndApply, resolveTargetElevation, forceElevated]);

  const proximityRef = usePointerProximity<TElement>({
    attackMs: config.proximityAttackMs,
    disabled,
    easing: config.proximityEasing,
    freeze,
    onChange: applyProximity,
    positionResponseMs: config.tiltResponseMs,
    radiusPx: config.proximityRadiusPx,
    releaseMs: config.proximityReleaseMs,
  });

  const ref = useCallback((element: TElement | null) => {
    elementRef.current = element;
    if (interactionTarget === 'transform') proximityRef(element);
    if (shadowTarget === 'transform') elevationShadowRef(element);
    // Apply the resting shadow immediately on mount so there's no one-frame
    // flash of the shadow hook's own (elevation-agnostic) initial state.
    if (element) composeAndApply(elevationRef.current);
  }, [
    composeAndApply,
    elevationShadowRef,
    interactionTarget,
    proximityRef,
    shadowTarget,
  ]);

  const interactionRef = useCallback((element: TElement | null) => {
    if (interactionTarget === 'separate') proximityRef(element);
  }, [interactionTarget, proximityRef]);

  const shadowRef = useCallback((element: TElement | null) => {
    if (shadowTarget === 'separate') elevationShadowRef(element);
  }, [elevationShadowRef, shadowTarget]);

  // forceElevated is a discrete, one-shot state transition — exactly like
  // press/focus/blur/release below, never a continuously-updating value
  // like proximity — so it needs the same explicit runElevationTween as
  // those, not a passive composeAndApply. The reactive config effect right
  // below this one calls composeAndApply directly with no tween at all,
  // which is correct for proximity/dev-override (continuously re-resolved
  // every frame or on live panel edits) but would make forceElevated's own
  // transition snap instantly instead of easing — the exact bug this effect
  // exists to avoid. Declared before that effect so its runElevationTween
  // call sets elevationTweenRef first; the reactive effect's own
  // `if (elevationTweenRef.current) return` guard then correctly skips
  // fighting the tween this one just started, in the same commit.
  useEffect(() => {
    if (!forceElevatedTransitionPendingRef.current) return;
    forceElevatedTransitionPendingRef.current = false;
    if (pressedRef.current) return; // a real press always wins — nothing to tween here
    if (forceElevated) {
      runElevationTween(
        config.shadowElevationHoverPx,
        config.stateTransitionMs,
        CTA_BUTTON_MOTION_EASINGS[config.stateEasing],
      );
    } else {
      runElevationTween(
        resolveTargetElevation(latestInteractionRef.current.proximity),
        config.stateExitTransitionMs,
        CTA_BUTTON_MOTION_EASINGS[config.stateExitEasing],
      );
    }
  }, [
    forceElevated,
    config.shadowElevationHoverPx,
    config.stateTransitionMs,
    config.stateEasing,
    config.stateExitTransitionMs,
    config.stateExitEasing,
    resolveTargetElevation,
    runElevationTween,
  ]);

  // Live panel edits (elevation targets, dev override, engine enable/
  // disable) should be reflected immediately, not just on the next pointer
  // frame — re-resolve whenever the physically-relevant config changes.
  // Skipped while frozen, same as everything else `freeze` holds in place.
  useEffect(() => {
    if (elevationTweenRef.current || freeze) return;
    composeAndApply(resolveTargetElevation(latestInteractionRef.current.proximity));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    composeAndApply,
    resolveTargetElevation,
    config.shadowEngineEnabled,
    config.shadowDevElevationOverrideEnabled,
    config.shadowDevElevationOverridePx,
    freeze,
  ]);

  // Tweens shadowVisibilityRef (0..1) toward shadowEnabled's own target
  // whenever it changes — a real, configurable ease, not the instant
  // removeProperty a structural `enabled: false` on useElevationShadow
  // would produce. Runs independently of the elevation tween above (a
  // settled neighbor's elevation is often already at rest by the time
  // shadowEnabled flips), and reuses composeAndApply purely to re-trigger
  // the shadow write — elevationRef.current itself isn't changing here.
  useEffect(() => {
    const target = shadowEnabled ? 1 : 0;
    if (shadowVisibilityTweenRef.current) {
      window.cancelAnimationFrame(shadowVisibilityTweenRef.current);
      shadowVisibilityTweenRef.current = 0;
    }
    const from = shadowVisibilityRef.current;
    if (
      typeof window === 'undefined'
      || prefersReducedMotion()
      || shadowEnabledTransitionMs <= 0
      || Math.abs(target - from) < 0.001
    ) {
      shadowVisibilityRef.current = target;
      composeAndApply(elevationRef.current);
      return undefined;
    }
    if (shadowEasingCacheRef.current?.css !== shadowEnabledEasingCss) {
      shadowEasingCacheRef.current = {
        css: shadowEnabledEasingCss,
        fn: createCssEasingFunction(shadowEnabledEasingCss),
      };
    }
    const easingFn = shadowEasingCacheRef.current.fn;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / Math.max(shadowEnabledTransitionMs, 1));
      shadowVisibilityRef.current = from + (target - from) * easingFn(progress);
      composeAndApply(elevationRef.current);
      if (progress < 1) {
        shadowVisibilityTweenRef.current = window.requestAnimationFrame(step);
      } else {
        shadowVisibilityTweenRef.current = 0;
      }
    };
    shadowVisibilityTweenRef.current = window.requestAnimationFrame(step);
    return () => {
      if (shadowVisibilityTweenRef.current) {
        window.cancelAnimationFrame(shadowVisibilityTweenRef.current);
        shadowVisibilityTweenRef.current = 0;
      }
    };
  }, [shadowEnabled, shadowEnabledTransitionMs, shadowEnabledEasingCss, composeAndApply]);

  useEffect(() => () => {
    if (elevationTweenRef.current) window.cancelAnimationFrame(elevationTweenRef.current);
    if (shadowVisibilityTweenRef.current) window.cancelAnimationFrame(shadowVisibilityTweenRef.current);
  }, []);

  const handlePress = useCallback(() => {
    if (disabled || config.shadowDevElevationOverrideEnabled) return;
    pressedRef.current = true;
    if (!config.elevationReactionEnabled) {
      // Pond-bounce path: with hover reaction off, resolveTargetElevation
      // would otherwise collapse every interaction state (this one
      // included) straight to shadowElevationRestingPx, leaving a click
      // with literally no visible feedback. Dip below resting instead —
      // still a plain curve tween for the down-stroke (a click should
      // register instantly); handleRelease is where the elastic spring
      // settle happens.
      runElevationTween(
        resolvePressCompressedElevation(
          config.shadowElevationRestingPx,
          config.pressCompressPx,
        ),
        config.pressTransitionMs,
        CTA_BUTTON_MOTION_EASINGS[config.pressEasing],
      );
      return;
    }
    runElevationTween(
      config.shadowElevationPressedPx,
      config.pressTransitionMs,
      CTA_BUTTON_MOTION_EASINGS[config.pressEasing],
    );
  }, [
    disabled,
    config.elevationReactionEnabled,
    config.pressCompressPx,
    config.pressEasing,
    config.pressTransitionMs,
    config.shadowDevElevationOverrideEnabled,
    config.shadowElevationPressedPx,
    config.shadowElevationRestingPx,
    runElevationTween,
  ]);

  const handleRelease = useCallback(() => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    const capturedPointerId = capturedPointerIdRef.current;
    if (capturedPointerId !== null) {
      capturedPointerIdRef.current = null;
      const element = elementRef.current;
      if (element?.hasPointerCapture?.(capturedPointerId)) {
        element.releasePointerCapture?.(capturedPointerId);
      }
    }
    if (!config.elevationReactionEnabled) {
      // resolveTargetElevation always resolves to shadowElevationRestingPx
      // here regardless of live proximity (same short-circuit that made the
      // press dip necessary above), so the spring's target is simply
      // resting — no need to resolve proximity for this path.
      runElevationSpring(
        config.shadowElevationRestingPx,
        config.pressBounceStiffness,
        config.pressBounceDamping,
      );
      return;
    }
    runElevationTween(
      resolveTargetElevation(latestInteractionRef.current.proximity),
      config.stateExitTransitionMs,
      CTA_BUTTON_MOTION_EASINGS[config.stateExitEasing],
    );
  }, [
    config.elevationReactionEnabled,
    config.pressBounceDamping,
    config.pressBounceStiffness,
    config.shadowElevationRestingPx,
    config.stateExitEasing,
    config.stateExitTransitionMs,
    resolveTargetElevation,
    runElevationSpring,
    runElevationTween,
  ]);

  const handleFocus = useCallback((event: { currentTarget: Element }) => {
    if (!isFocusVisible(event.currentTarget)) return;
    focusVisibleRef.current = true;
    runElevationTween(
      resolveTargetElevation(latestInteractionRef.current.proximity),
      config.stateTransitionMs,
      CTA_BUTTON_MOTION_EASINGS[config.stateEasing],
    );
  }, [
    config.stateEasing,
    config.stateTransitionMs,
    resolveTargetElevation,
    runElevationTween,
  ]);

  const handleBlur = useCallback(() => {
    if (!focusVisibleRef.current) return;
    focusVisibleRef.current = false;
    runElevationTween(
      resolveTargetElevation(latestInteractionRef.current.proximity),
      config.stateExitTransitionMs,
      CTA_BUTTON_MOTION_EASINGS[config.stateExitEasing],
    );
  }, [
    config.stateExitEasing,
    config.stateExitTransitionMs,
    resolveTargetElevation,
    runElevationTween,
  ]);

  const handlePointerDown = useCallback((event: {
    button: number;
    pointerType: string;
    pointerId: number;
    currentTarget: TElement;
  }) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    // Capture the pointer to this element for the rest of the gesture. The
    // press/pond-bounce dip moves this exact element under the cursor via
    // its own transform (see composeAndApply's translate3d), so without
    // capture the pointer ends up outside the element's freshly-transformed
    // bounds mid-hold, firing a spurious pointerleave — CtaButton.tsx treats
    // that as an early release, ending the press (and starting the bounce
    // back) well before the real pointerup. Capture keeps pointerup/
    // pointercancel routed here regardless of where the transform puts the
    // element on screen.
    if (capturePointer) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      capturedPointerIdRef.current = event.pointerId;
    }
    handlePress();
  }, [capturePointer, handlePress]);

  return {
    ref,
    interactionRef,
    shadowRef,
    handleFocus,
    handleBlur,
    handlePress,
    handleRelease,
    handlePointerDown,
    getDebugSnapshot,
    pressedRef: pressedRef as MutableRefObject<boolean>,
    /** Imperatively tweens the resting elevation to an arbitrary target —
     * for one-shot transitions outside the normal hover/press/focus state
     * machine (e.g. AbstractHeroCtaComposer's CTA-to-composer elevation
     * rise). Pair with `initialElevationPx` above when the instance should
     * start from a value other than its own config.shadowElevationRestingPx. */
    tweenRestingElevation: runElevationTween,
  };
}

export type { ElevationShadowDebugSnapshot };
