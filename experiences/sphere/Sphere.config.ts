// @ts-nocheck
import * as THREE from 'three'
import { Config, Params } from './Sphere.types'

export interface ArrowsHint {
  zIndex: number
  startDelayMs: number
  durationsMs: { enter: number; hold: number; fade: number; gap: number }
  durationsMsReduced: { enter: number; hold: number; fade: number; gap: number }
  easing: { enterOut: string; exitIn: string }
  overlap: { fractionOfFade: number; ms: number }
}

export interface Orchestration {
  revealDelaysMs: {
    afterArrows_toText: number
    afterTextEnd_toChromeGroup: number
  }
  revealDurationsMs: {
    text: number
    header: number
    footer: number
  }
  contentEase: string
}

// Extend/modify your Behavior type to include them:
export interface Behavior {
  capLightFront: boolean
  maxFrontAlignmentDot: number
  lightFrontSoftKnee: number
  lightFrontResponse: number
  intro: any
  lightAutoAlign: any
  inertia: any
  rotationCap: any
  rotationLock: any
  slideTilt: any
  drag: any
  carouselFade: any
  lightSpin?: any
  // new:
  arrowsHint?: ArrowsHint
  orchestration?: Orchestration
}

export const GOLDEN = (1 + Math.sqrt(5)) / 2

/** PHI-derived timing constants (source of truth) */
const BASE = Math.round(100 * GOLDEN) // ~162ms
const SLOW_FACTOR = 3

/* ---- Arrows (per-side) with continuous cross-fade ---- */
const RAW_ENTER = Math.round(BASE * GOLDEN)
const RAW_HOLD  = Math.round(BASE * Math.sqrt(GOLDEN))
const RAW_FADE  = Math.round(BASE * Math.pow(GOLDEN, 0.8))

const ARROWS_ENTER = RAW_ENTER * SLOW_FACTOR
const ARROWS_HOLD  = RAW_HOLD  * SLOW_FACTOR
const ARROWS_FADE  = RAW_FADE  * SLOW_FACTOR

const ARROWS_OVERLAP_FRAC = 1 / GOLDEN
const ARROWS_OVERLAP_MS   = Math.round(ARROWS_FADE * ARROWS_OVERLAP_FRAC)
const ARROWS_GAP          = -ARROWS_OVERLAP_MS

const ARROWS_START_DELAY = Math.round(BASE * Math.pow(GOLDEN, 3)) * SLOW_FACTOR

/* ---- Post-arrows reveals ---- */
const DELAY_AFTER_ARROWS_TO_TEXT       = Math.round((BASE / GOLDEN)) * SLOW_FACTOR
const DELAY_AFTER_TEXT_END_TO_CHROME   = Math.round((BASE / Math.pow(GOLDEN, 1.5))) * SLOW_FACTOR

/* ---- Content fade durations ---- */
const TEXT_FADE_MS   = Math.round(BASE * (0.75 + 1 / GOLDEN)) * SLOW_FACTOR
const HEADER_FADE_MS = Math.round(BASE * (0.50 + 1 / GOLDEN)) * SLOW_FACTOR
const FOOTER_FADE_MS = Math.round(BASE * (0.48 + 1 / GOLDEN)) * SLOW_FACTOR

/* ---- Easings (expo-ish) ---- */
const EASE_OUT_EXP = 'cubic-bezier(0.16, 1, 0.3, 1)'
const EASE_IN_EXP  = 'cubic-bezier(0.7, 0, 0.84, 0)'
const EASE_CONTENT = 'cubic-bezier(0.22, 1, 0.36, 1)'

/** Pleasant preset + bounded auto spin */
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
      intensity: 2.15,
      size: { width: 12, height: 6 },
      position: [-2.2, 2.6, 4.2],
      lockElevation: true,
      dragSensitivity: 0.9,
    },
    fill: { color: '#b9c3d0', intensity: 0.45, size: { width: 14, height: 10 }, position: [0, 0.2, 5.6] },
    rim:  { color: '#a9bbd2', intensity: 0.08, position: [2.2, -1.0, -3.0] },
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
    lightAutoAlign: { enabled: true, targetDot: 0, deadZone: 0.02, response: 0.12, postIntroDelayMs: 0, resumeAfterGestureMs: null },
    inertia: { enabled: true, durationMs: 900, scale: 1.0, easing: 'quintOut', minVelocity: 1e-4 },
    rotationCap: { enabled: true, fractionOfHalfTurn: 0.38, dragLerp: 0.35, snapDurationMs: 420, snapEasing: 'quintOut', epsilonRad: 1e-3 },
    rotationLock: { enabled: false, axis: [1, 0, 0], polarDeg: null, azimuthSnapDeg: null, fixedAzimuthDeg: null, whileDragging: true, smooth: 1 },
    slideTilt: { enabled: true, axis: 'x', stepDeg: 360 / 22, directionAware: true, mode: 'fixed' },
    drag: { scale: 0.42 },
    carouselFade: {
      enabled: true,
      shareOfIntro: 1 / GOLDEN,
      overlapMs: 0,
      durationMs: 1600,
      cssTiming: EASE_CONTENT,
    },
    lightSpin: {
      enabled: true,
      // steady-state baseline after auto segment finishes
      yawRps: 0.05,        // ~20s/lap (gentle drift)
      pitchRps: 0,         // ignored if lockElevation = true
      dampingPerSecond: 1.0,
      maxRadPerSec: 1,
      impulseScale: 1.25,

      // bounded post-intro spin with soft landing
      auto: {
        enabled: true,
        maxAzimuthDeg: 360,  // ≤ one full rotation total
        startYawRps: 0.42,   // left decel finishes, right accel begins
        endYawRps: 0.9,     // land on baseline
        easing: 'cubicOut',
      },

      // intro → post-intro handoff with explicit direction flip
      handoff: {
        enabled: true,
        durationMs: 360,     // (fallback blend window)
        bumpAmp: 0.14,
        easing: 'cubicOut',
        elastic: {
          enabled: false,    // use flip below instead
          amp: 0.10,
          decay: 2.5,
          cycles: 1,
        },
        flip: {
          enabled: true,
          decelMs: 360,           // elastic slow-down while still turning left
          accelMs: 1100,          // ⟵ much longer, ultra-gentle restart to the right
          decelElasticAmp: 0.10,  // how elastic the left decel feels
          decelDecay: 2.6,        // damping for the elastic decel
          // OUT name mirrored to IN at runtime; expoOut → expo-in ramp
          accelEasing: 'expoOut',
          // NEW: parabolic/exponential shaping for an ultra-soft start
          accelPower: 2.4
        },
      },
    },
  },
}

/** Factory (unchanged other than passing through motion.lightSpin) */
function toConfig(p: Params): any {
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
    const out = a.clone().lerp(toward, clamp01(t))
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

  // Build behavior separately and type it as `any` to avoid object-literal excess property checking
  const behavior: any = {
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
    lightSpin: p.motion.lightSpin,
    arrowsHint: {
      zIndex: 60,
      startDelayMs: ARROWS_START_DELAY,
      durationsMs: { enter: ARROWS_ENTER, hold: ARROWS_HOLD, fade: ARROWS_FADE, gap: ARROWS_GAP },
      durationsMsReduced: {
        enter: Math.round(ARROWS_ENTER / GOLDEN),
        hold: Math.round(ARROWS_HOLD / GOLDEN),
        fade: Math.round(ARROWS_FADE / GOLDEN),
        gap: -Math.round((ARROWS_FADE / GOLDEN) * ARROWS_OVERLAP_FRAC),
      },
      easing: { enterOut: EASE_OUT_EXP, exitIn: EASE_IN_EXP },
      overlap: { fractionOfFade: ARROWS_OVERLAP_FRAC, ms: ARROWS_OVERLAP_MS },
    } as ArrowsHint,
    orchestration: {
      revealDelaysMs: { afterArrows_toText: DELAY_AFTER_ARROWS_TO_TEXT, afterTextEnd_toChromeGroup: DELAY_AFTER_TEXT_END_TO_CHROME },
      revealDurationsMs: { text: TEXT_FADE_MS, header: HEADER_FADE_MS, footer: FOOTER_FADE_MS },
      contentEase: EASE_CONTENT,
    } as Orchestration,
  }

  return {
    renderer: { antialias: true, alpha: true, exposure: p.exposure },
    camera: { fov: p.camera.fov, near: p.camera.near, far: p.camera.far, position: [0, 0, p.camera.distanceZ] },
    lights: {
      ambient: { color: applyLift(ambColorWarm, p.look.influence.ambient), intensity: p.lights.ambient.intensity },
      hemisphere: { sky: hemiSkyWarm, ground: applyLift(hemiGroundWarm, p.look.influence.hemisphere), intensity: p.lights.hemisphere.intensity },
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
    behavior: behavior,
  }
}

export const CONFIG = toConfig(PARAMS) as any

/** Public timing exports used by intro/builders */
export const ARROWS_TIMING = {
  startDelayMs: ARROWS_START_DELAY,
  durationsMs: { enter: ARROWS_ENTER, hold: ARROWS_HOLD, fade: ARROWS_FADE, gap: ARROWS_GAP },
  durationsMsReduced: {
    enter: Math.round(ARROWS_ENTER / GOLDEN),
    hold: Math.round(ARROWS_HOLD / GOLDEN),
    fade: Math.round(ARROWS_FADE / GOLDEN),
    gap: -Math.round((ARROWS_FADE / GOLDEN) * ARROWS_OVERLAP_FRAC),
  },
  easing: { enterOut: EASE_OUT_EXP, exitIn: EASE_IN_EXP },
  overlap: { fractionOfFade: ARROWS_OVERLAP_FRAC, ms: ARROWS_OVERLAP_MS },
}

export const ORCHESTRATION = {
  delays: {
    afterArrows_toText: DELAY_AFTER_ARROWS_TO_TEXT,
    afterTextEnd_toChromeGroup: DELAY_AFTER_TEXT_END_TO_CHROME,
  },
  durations: { text: TEXT_FADE_MS, header: HEADER_FADE_MS, footer: FOOTER_FADE_MS },
  ease: EASE_CONTENT,
}

export const KEY_LOCK_ELEVATION = PARAMS.lights.key.lockElevation
