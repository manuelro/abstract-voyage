import * as THREE from 'three'
import { Config, Params } from './Sphere.types'

export const GOLDEN = (1 + Math.sqrt(5)) / 2

/** PHI-derived timing constants (source of truth) */
const BASE = Math.round(100 * GOLDEN) // ~162ms

// Arrows (per-side) — normal motion
const ARROWS_ENTER = Math.round(BASE * GOLDEN)              // ~262ms
const ARROWS_HOLD  = Math.round(BASE * Math.sqrt(GOLDEN) * 10)     // ~206ms
const ARROWS_FADE  = Math.round(BASE * Math.pow(GOLDEN, 0.8)) * 5 // ~238ms
const ARROWS_GAP   = Math.round(BASE / GOLDEN)                // ~100ms
const ARROWS_START_DELAY = Math.round(BASE * Math.pow(GOLDEN, 3)) // ~686ms

// Arrow sequence total window
const ARROWS_WINDOW = (ARROWS_ENTER + ARROWS_HOLD + ARROWS_FADE) * 2 + ARROWS_GAP // ~1512ms

// Reduced motion (shorter)
const ARROWS_ENTER_R = Math.round(ARROWS_ENTER / GOLDEN) // ~162ms
const ARROWS_HOLD_R  = Math.round(ARROWS_HOLD  / GOLDEN) // ~127ms
const ARROWS_FADE_R  = Math.round(ARROWS_FADE  / GOLDEN) // ~147ms
const ARROWS_GAP_R   = Math.round(ARROWS_GAP   / GOLDEN) // ~62ms

// Post-arrows reveals
const DELAY_AFTER_ARROWS_TO_TEXT     = Math.round(BASE / GOLDEN)             // ~100ms
const DELAY_AFTER_TEXT_TO_HEADER     = Math.round(BASE / Math.pow(GOLDEN,1.25)) // ~89ms
const DELAY_AFTER_HEADER_TO_FOOTER   = Math.round(BASE / Math.pow(GOLDEN,1.5))  // ~79ms

// Content fade durations
const TEXT_FADE_MS   = Math.round(BASE * (0.75 + 1 / GOLDEN)) // ~222ms
const HEADER_FADE_MS = Math.round(BASE * (0.50 + 1 / GOLDEN)) // ~181ms
const FOOTER_FADE_MS = Math.round(BASE * (0.48 + 1 / GOLDEN)) // ~178ms

// Easings (expo-ish)
const EASE_OUT_EXP = 'cubic-bezier(0.16, 1, 0.3, 1)'
const EASE_IN_EXP  = 'cubic-bezier(0.7, 0, 0.84, 0)'
const EASE_CONTENT = 'cubic-bezier(0.22, 1, 0.36, 1)'

/** Defaults (verbatim with PHI-driven overlap computed below) */
const PARAMS: Params = {
  exposure: 1.15,
  theme: {
    backgroundBottom: '#191b1f',
    backgroundTop: '#0b0c0e',
    vignetteCenterPct: 58,
    vignetteEdgeAlpha: 0.22,
  },
  composition: { sphereScaleDivisor: GOLDEN },
  camera: { fov: 50, near: 0.1, far: 100, distanceZ: 6 },
  lights: {
    ambient: { color: '#c7ced8', intensity: 0.06 },
    hemisphere: { sky: '#1a1f26', ground: '#0a0c0f', intensity: 0.5 },
    key: {
      color: '#e5eaf2',
      intensity: 1.9,
      size: { width: 12, height: 6 },
      position: [-2.2, 2.6, 4.2],
      lockElevation: true,
      dragSensitivity: 0.9,
    },
    fill: { color: '#b9c3d0', intensity: 0.55, size: { width: 14, height: 10 }, position: [0, 0.2, 5.6] },
    rim: { color: '#a9bbd2', intensity: 0.06, position: [2.2, -1.0, -3.0] },
  },
  material: { color: '#111316', roughness: 0.96, metalness: 0.7, envMapIntensity: 0.015 },
  look: {
    warmth: 0.0,
    warmTint: '#f0caa7',
    coolTint: '#a9bbd2',
    influence: { key: 0.35, fill: 0.45, rim: 0.25, hemisphere: 0.35, ambient: 0.2 },
    shadowLift: 0.08,
    shadowTint: '#121418',
    materialLighten: 0.10,
    gradientQuality: {
      materialDithering: true,
      overlay: { enabled: true, opacity: 0.035, sizePx: 160, blendMode: 'soft-light' },
      extraStopsEnabled: true,
    },
  },
  motion: {
    intro: { enabled: true, holdMs: 420, durationMs: 2600, easing: 'cubicOut', endAlignmentDot: 0, endAzimuthDeg: 30 },
    lightAutoAlign: {
      enabled: true,
      targetDot: 0,
      deadZone: 0.02,
      response: 0.12,
      postIntroDelayMs: 0,
      resumeAfterGestureMs: null,
    },
    inertia: { enabled: true, durationMs: 900, scale: 1.0, easing: 'quintOut', minVelocity: 1e-4 },
    rotationCap: { enabled: true, fractionOfHalfTurn: 0.38, dragLerp: 0.35, snapDurationMs: 420, snapEasing: 'quintOut', epsilonRad: 1e-3 },
    rotationLock: { enabled: false, axis: [1, 0, 0], polarDeg: null, azimuthSnapDeg: null, fixedAzimuthDeg: null, whileDragging: true, smooth: 1 },
    slideTilt: { enabled: true, axis: 'x', stepDeg: 360 / 22, directionAware: true, mode: 'fixed' },
    drag: { scale: 0.35 },
    carouselFade: {
      enabled: true,
      shareOfIntro: 1 / GOLDEN,
      overlapMs: 0, // will be computed a few lines below from PHI timings
      durationMs: 1600,
      cssTiming: EASE_CONTENT,
    },
  },
}

/** Compute carousel overlap so text reveals AFTER the arrow sequence */
{
  const share = PARAMS.motion.carouselFade.shareOfIntro
  const baseWait = PARAMS.motion.intro.holdMs + Math.round(PARAMS.motion.intro.durationMs * share)
  const targetRevealMs = ARROWS_START_DELAY + ARROWS_WINDOW + DELAY_AFTER_ARROWS_TO_TEXT
  PARAMS.motion.carouselFade.overlapMs = Math.max(0, targetRevealMs - baseWait) // ~271ms with current intro
}

/** Factory (verbatim) */
function toConfig(p: Params): Config {
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
  const clamp11 = (x: number) => Math.max(-1, Math.min(1, x))

  const W = clamp11(p.look.warmth || 0)
  const warm = new THREE.Color(p.look.warmTint as any)
  const cool = new THREE.Color(p.look.coolTint as any)
  const lift = clamp01(p.look.shadowLift || 0)
  const shadow = new THREE.Color(p.look.shadowTint as any)
  const matLift = clamp01(p.look.materialLighten || 0)

  const mixToward = (base: string | number, toward: THREE.Color, t: number) => {
    const a = new THREE.Color(base as any)
    const out = a.clone().lerp(toward, Math.max(0, Math.min(1, t)))
    return out.getHex()
  }
  const applyWarmth = (base: string | number, influence: number) => {
    if (!W || influence <= 0) return base
    const toward = W > 0 ? warm : cool
    const t = Math.abs(W) * Math.max(0, Math.min(1, influence))
    return mixToward(base, toward, t)
  }
  const applyLift = (base: string | number, influence: number) => {
    if (!lift || influence <= 0) return base
    const t = lift * Math.max(0, Math.min(1, influence))
    return mixToward(base, shadow, t)
  }
  const lightenColor = (base: string | number, amount: number) => {
    const c = new THREE.Color(base as any)
    const hsl = { h: 0, s: 0, l: 0 }
    c.getHSL(hsl as any)
    c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amount)))
    return c.getHex()
  }

  const ambColorWarm = applyWarmth(p.lights.ambient.color, p.look.influence.ambient)
  const hemiSkyWarm = applyWarmth(p.lights.hemisphere.sky, p.look.influence.hemisphere)
  const hemiGroundWarm = applyWarmth(p.lights.hemisphere.ground, p.look.influence.hemisphere)
  const keyColorWarm = applyWarmth(p.lights.key.color, p.look.influence.key)
  const fillColorWarm = applyWarmth(p.lights.fill.color, p.look.influence.fill)
  const rimColorWarm = applyWarmth(p.lights.rim.color, p.look.influence.rim)

  const materialColorFinal = lightenColor(p.material.color, matLift)

  return {
    renderer: { antialias: true, alpha: true, exposure: p.exposure },
    camera: { fov: p.camera.fov, near: p.camera.near, far: p.camera.far, position: [0, 0, p.camera.distanceZ] },
    lights: {
      ambient: { color: applyLift(ambColorWarm, p.look.influence.ambient), intensity: p.lights.ambient.intensity },
      hemisphere: {
        sky: hemiSkyWarm,
        ground: applyLift(hemiGroundWarm, p.look.influence.hemisphere),
        intensity: p.lights.hemisphere.intensity,
      },
      rectKey: { color: keyColorWarm, intensity: p.lights.key.intensity, size: { ...p.lights.key.size }, position: p.lights.key.position, lookAt: [0, 0, 0] },
      rectFill: { color: fillColorWarm, intensity: p.lights.fill.intensity, size: { ...p.lights.fill.size }, position: p.lights.fill.position, lookAt: [0, 0, 0] },
      rim: { color: rimColorWarm, intensity: p.lights.rim.intensity, position: p.lights.rim.position },
    },
    material: { color: materialColorFinal, roughness: p.material.roughness, metalness: p.material.metalness, envMapIntensity: p.material.envMapIntensity },
    theme: {
      backgroundBottom: p.theme.backgroundBottom,
      backgroundTop: p.theme.backgroundTop,
      vignette: { centerStopPct: p.theme.vignetteCenterPct, edgeAlpha: p.theme.vignetteEdgeAlpha },
    },
    layout: { goldenRatio: p.composition.sphereScaleDivisor },
    look: { ...p.look, warmth: W, shadowLift: lift, materialLighten: matLift },
    behavior: {
      capLightFront: false,
      maxFrontAlignmentDot: 1 / p.composition.sphereScaleDivisor,
      lightFrontSoftKnee: 0.05,
      lightFrontResponse: 0.18,
      intro: p.motion.intro,
      lightAutoAlign: p.motion.lightAutoAlign,
      inertia: p.motion.inertia,
      rotationCap: p.motion.rotationCap,
      rotationLock: p.motion.rotationLock,
      slideTilt: p.motion.slideTilt,
      drag: p.motion.drag,
      carouselFade: p.motion.carouselFade,
      // Non-breaking: attach PHI-driven UI orchestration under behavior
      arrowsHint: {
        zIndex: 60,
        startDelayMs: ARROWS_START_DELAY,
        durationsMs: { enter: ARROWS_ENTER, hold: ARROWS_HOLD, fade: ARROWS_FADE, gap: ARROWS_GAP },
        durationsMsReduced: { enter: ARROWS_ENTER_R, hold: ARROWS_HOLD_R, fade: ARROWS_FADE_R, gap: ARROWS_GAP_R },
        easing: { enterOut: EASE_OUT_EXP, exitIn: EASE_IN_EXP },
      } as any,
      orchestration: {
        revealDelaysMs: {
          afterArrows_toText: DELAY_AFTER_ARROWS_TO_TEXT,
          afterTextStart_toHeader: DELAY_AFTER_TEXT_TO_HEADER,
          afterHeaderStart_toFooter: DELAY_AFTER_HEADER_TO_FOOTER,
        },
        revealDurationsMs: { text: TEXT_FADE_MS, header: HEADER_FADE_MS, footer: FOOTER_FADE_MS },
        contentEase: EASE_CONTENT,
      } as any,
    },
  }
}

export const CONFIG: Config = toConfig(PARAMS)

/** Exported for consumers outside Config's strict typing (non-breaking) */
export const ARROWS_TIMING = {
  startDelayMs: ARROWS_START_DELAY,
  durationsMs: { enter: ARROWS_ENTER, hold: ARROWS_HOLD, fade: ARROWS_FADE, gap: ARROWS_GAP },
  durationsMsReduced: { enter: ARROWS_ENTER_R, hold: ARROWS_HOLD_R, fade: ARROWS_FADE_R, gap: ARROWS_GAP_R },
  easing: { enterOut: EASE_OUT_EXP, exitIn: EASE_IN_EXP },
}

export const ORCHESTRATION = {
  delays: {
    afterArrows_toText: DELAY_AFTER_ARROWS_TO_TEXT,
    afterTextStart_toHeader: DELAY_AFTER_TEXT_TO_HEADER,
    afterHeaderStart_toFooter: DELAY_AFTER_HEADER_TO_FOOTER,
  },
  durations: { text: TEXT_FADE_MS, header: HEADER_FADE_MS, footer: FOOTER_FADE_MS },
  ease: EASE_CONTENT,
}

/** Needed to preserve original lock-elevation behavior in Sphere.tsx */
export const KEY_LOCK_ELEVATION = PARAMS.lights.key.lockElevation
