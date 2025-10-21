'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import * as THREE from 'three'
import { type RegisterDragListener } from '../../experiences/sphere/Carousel'

/* ------------------------------- V2 CONFIG ---------------------------------- */
type Vec3 = [number, number, number]
type RectAreaLightCfg = {
  color: string | number
  intensity: number
  size: { width: number; height: number }
  position: Vec3
  lookAt?: Vec3
}
type EasingName =
  | 'linear'
  | 'quadOut'
  | 'cubicOut'
  | 'quartOut'
  | 'quintOut'
  | 'expoOut'
  | 'circOut'
  
type ThemeCfg = {
  backgroundBottom: string
  backgroundTop: string
  vignette: { centerStopPct: number; edgeAlpha: number }
}

/** NEW: gradient quality controls */
type GradientQualityCfg = {
  materialDithering: boolean
  overlay: {
    enabled: boolean
    opacity: number          // 0..~0.08
    sizePx: number           // tile size
    blendMode: 'soft-light' | 'overlay' | 'normal'
  }
  extraStopsEnabled: boolean // add a mid stop to the CSS gradient
}

/** Look/warmth + shadow floor + albedo lighten + gradient-quality */
type LookCfg = {
  warmth: number
  warmTint: string | number
  coolTint: string | number
  influence: {
    key: number
    fill: number
    rim: number
    hemisphere: number
    ambient: number
  }
  shadowLift: number
  shadowTint: string | number
  materialLighten: number
  gradientQuality: GradientQualityCfg
}

type Config = {
  renderer: { antialias: boolean; alpha: boolean; exposure: number }
  camera: { fov: number; near: number; far: number; position: Vec3 }
  lights: {
    ambient: { color: string | number; intensity: number }
    hemisphere: { sky: string | number; ground: string | number; intensity: number }
    rectKey: RectAreaLightCfg
    rectFill: RectAreaLightCfg
    rim: { color: string | number; intensity: number; position: Vec3 }
  }
  material: { color: string | number; roughness: number; metalness: number; envMapIntensity: number }
  layout: { goldenRatio: number }
  theme: ThemeCfg
  look: LookCfg
  behavior: {
    capLightFront: boolean
    maxFrontAlignmentDot: number
    lightFrontSoftKnee: number
    lightFrontResponse: number

    intro: {
      enabled: boolean
      holdMs: number
      durationMs: number
      easing: EasingName
      endAlignmentDot: number
      endAzimuthDeg: number
    }

    lightAutoAlign: {
      enabled: boolean
      targetDot: number
      deadZone: number
      response: number
      postIntroDelayMs: number
      resumeAfterGestureMs: number | null
    }

    inertia: {
      enabled: boolean
      durationMs: number
      scale: number
      easing: EasingName
      minVelocity: number
    }

    rotationCap: {
      enabled: boolean
      fractionOfHalfTurn: number
      dragLerp: number
      snapDurationMs: number
      snapEasing: EasingName
      epsilonRad: number
    }

    rotationLock: {
      enabled: boolean
      axis: Vec3
      polarDeg: number | null
      azimuthSnapDeg: number | null
      fixedAzimuthDeg: number | null
      whileDragging: boolean
      smooth: number
    }

    slideTilt: {
      enabled: boolean
      axis: 'x' | 'y' | 'z'
      stepDeg: number
      directionAware: boolean
      mode: 'fixed' | 'fullTurnBySlides'
    }

    drag: { scale: number }

    /** NEW: controls for the carousel fade timing & duration */
    carouselFade: {
      enabled: boolean
      shareOfIntro: number        // 0..1
      overlapMs: number           // signed
      durationMs: number
      cssTiming: string
    }
  }
}

/* ---------------------------- PARAMETER OBJECT ------------------------------- */
type Params = {
  exposure: number
  theme: {
    backgroundTop: string
    backgroundBottom: string
    vignetteCenterPct: number
    vignetteEdgeAlpha: number
  }
  composition: { sphereScaleDivisor: number }
  camera: { fov: number; near: number; far: number; distanceZ: number }
  lights: {
    ambient: { intensity: number; color: string | number }
    hemisphere: { intensity: number; sky: string | number; ground: string | number }
    key: {
      intensity: number
      size: { width: number; height: number }
      position: Vec3
      color: string | number
      lockElevation: boolean
      dragSensitivity: number
    }
    fill: { intensity: number; size: { width: number; height: number }; position: Vec3; color: string | number }
    rim: { intensity: number; position: Vec3; color: string | number }
  }
  material: { color: string | number; roughness: number; metalness: number; envMapIntensity: number }
  look: LookCfg
  motion: {
    intro: {
      enabled: boolean
      holdMs: number
      durationMs: number
      easing: EasingName
      endAlignmentDot: number
      endAzimuthDeg: number
    }
    inertia: { enabled: boolean; durationMs: number; scale: number; easing: EasingName; minVelocity: number }
    lightAutoAlign: {
      enabled: boolean
      targetDot: number
      deadZone: number
      response: number
      postIntroDelayMs: number
      resumeAfterGestureMs: number | null
    }
    rotationCap: { enabled: boolean; fractionOfHalfTurn: number; dragLerp: number; snapDurationMs: number; snapEasing: EasingName; epsilonRad: number }
    rotationLock: { enabled: boolean; axis: Vec3; polarDeg: number | null; azimuthSnapDeg: number | null; fixedAzimuthDeg: number | null; whileDragging: boolean; smooth: number }
    slideTilt: { enabled: boolean; axis: 'x' | 'y' | 'z'; stepDeg: number; directionAware: boolean; mode: 'fixed' }
    drag: { scale: number }
    carouselFade: Config['behavior']['carouselFade']
  }
}

const GOLDEN = (1 + Math.sqrt(5)) / 2

/** Defaults */
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
  material: { color: '#111316', roughness: 0.96, metalness: 0.0, envMapIntensity: 0.015 },
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
      resumeAfterGestureMs: null, // do NOT auto-resume after gesture
    },
    inertia: { enabled: true, durationMs: 900, scale: 1.0, easing: 'quintOut', minVelocity: 1e-4 },
    rotationCap: { enabled: true, fractionOfHalfTurn: 0.38, dragLerp: 0.35, snapDurationMs: 420, snapEasing: 'quintOut', epsilonRad: 1e-3 },
    rotationLock: { enabled: false, axis: [1, 0, 0], polarDeg: null, azimuthSnapDeg: null, fixedAzimuthDeg: null, whileDragging: true, smooth: 1 },
    slideTilt: { enabled: true, axis: 'x', stepDeg: 360 / 22, directionAware: true, mode: 'fixed' },
    drag: { scale: 0.35 },
    carouselFade: {
      enabled: true,
      shareOfIntro: 1 / GOLDEN,
      overlapMs: 0,
      durationMs: 1600,
      cssTiming: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  },
}

/** Factory */
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
    },
  }
}

export const CONFIG: Config = toConfig(PARAMS)

/* -------------------------------- EASINGS ----------------------------------- */
function ease(t: number, name: EasingName) {
  t = Math.min(Math.max(t, 0), 1)
  switch (name) {
    case 'linear': return t
    case 'quadOut': return 1 - (1 - t) * (1 - t)
    case 'cubicOut': return 1 - Math.pow(1 - t, 3)
    case 'quartOut': return 1 - Math.pow(1 - t, 4)
    case 'quintOut': return 1 - Math.pow(1 - t, 5)
    case 'expoOut': return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
    case 'circOut': return Math.sqrt(1 - Math.pow(t - 1, 2))
    default: return t
  }
}

/* --------------------------- helpers --------------------------- */
function slerpUnit(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1)
  const omega = Math.acos(dot)
  if (omega < 1e-6) return b.clone()
  const sinOm = Math.sin(omega)
  const s0 = Math.sin((1 - t) * omega) / sinOm
  const s1 = Math.sin(t * omega) / sinOm
  return a.clone().multiplyScalar(s0).add(b.clone().multiplyScalar(s1)).normalize()
}
const mixHex = (a: string | number, b: string | number, t: number) => {
  const ca = new THREE.Color(a as any)
  const cb = new THREE.Color(b as any)
  const out = ca.clone().lerp(cb, Math.max(0, Math.min(1, t)))
  return `#${out.getHexString()}`
}

const NOISE_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/></filter>
    <rect width="100%" height="100%" filter="url(#n)"/>
  </svg>`
)
const NOISE_DATA_URI = `url("data:image/svg+xml;utf8,${NOISE_SVG}")`

/* --------------------------- V2 PAGE (configurable) -------------------------- */
function GoldenMatteSphereSoftLightingPage() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [showVignette, setShowVignette] = useState(false)
  const [sphereDiameterPx, setSphereDiameterPx] = useState(0)
  const [stageWidth, setStageWidth] = useState(0)
  const [showCarousel, setShowCarousel] = useState(false)

  // Drag bus (API compatibility)
  type DragEvent = { phase: 'start' | 'move' | 'end'; dx: number; dy: number }
  type DragListener = (e: DragEvent) => void
  const dragSubs = useRef<Set<DragListener>>(new Set())
  const registerDragListener: RegisterDragListener = (listener) => { dragSubs.current.add(listener); return () => dragSubs.current.delete(listener) }
  const notifyDrag = (e: DragEvent) => { dragSubs.current.forEach((fn) => fn(e)) }

  // Refs
  const controlsRef = useRef<any>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const softKeyRef = useRef<THREE.RectAreaLight | null>(null)
  const lightRadiusRef = useRef<number>(6)
  const lightAnglesRef = useRef<{ az: number; pol: number }>({ az: 0, pol: 0 })
  const lightDragOverrideRef = useRef<boolean>(false)
  const lightUserLatchRef = useRef<boolean>(true)
  const autoAlignArmingTimeoutRef = useRef<number | null>(null)
  const carouselFadeTimeoutRef = useRef<number | null>(null)
  const fixedPolRef = useRef<number | null>(null)
  const sphereRef = useRef<THREE.Mesh | null>(null)

  // Persistent key-light tilt (kept)
  const keyTiltRadRef = useRef<number>(0)
  const applyTiltAfterLookAt = (light: THREE.RectAreaLight, target: THREE.Vector3) => {
    light.lookAt(target)
    const axis = CONFIG.behavior.slideTilt.axis
    const tilt = keyTiltRadRef.current
    if (!tilt) return
    if (axis === 'x') light.rotateX(tilt)
    else if (axis === 'y') light.rotateY(tilt)
    else light.rotateZ(tilt)
  }

  /* ---------------- Perceptible φ lag + true inertia after activation ---------------- */
  const PHI = CONFIG.layout.goldenRatio
  const START_DELAY_MS = Math.round(100 * PHI * PHI)          // ≈262ms perceptible lag
  const MIN_TAIL_YAW = THREE.MathUtils.degToRad(2)            // ensure visibility
  const MIN_TAIL_PITCH = THREE.MathUtils.degToRad(1.2)
  const MAX_TAIL_YAW = THREE.MathUtils.degToRad(12)
  const MAX_TAIL_PITCH = THREE.MathUtils.degToRad(7.2)

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  const sphereLagRef = useRef<{
    startTimer: number | null
    lagActive: boolean
    inertiaRAF: number | null
    prevRemaining: number
    lastDAz: number
    lastDPol: number
    lastTs: number
    vAz: number
    vPol: number
  }>({
    startTimer: null,
    lagActive: false,
    inertiaRAF: null,
    prevRemaining: 1,
    lastDAz: 0,
    lastDPol: 0,
    lastTs: 0,
    vAz: 0,
    vPol: 0,
  })

  const cancelSphereInertia = () => {
    const r = sphereLagRef.current
    if (r.inertiaRAF != null) {
      cancelAnimationFrame(r.inertiaRAF)
      r.inertiaRAF = null
    }
    r.prevRemaining = 1
  }

  const startSphereInertia = () => {
    if (prefersReducedMotion) return
    const cfg = CONFIG.behavior.inertia
    if (!cfg.enabled) return

    const r = sphereLagRef.current
    cancelSphereInertia()

    // Use configured inertia duration, but ensure it ends last (>= φ³*100ms)
    const minTail = Math.round(100 * Math.pow(PHI, 3)) // ~424ms
    const duration = Math.max(cfg.durationMs, minTail)
    const easing = cfg.easing

    // Derive amplitudes from velocity × time × scale, then clamp to perceptible range
    const yawRaw = r.vAz * (duration / 1000) * (cfg.scale / PHI)
    const pitchRaw = r.vPol * (duration / 1000) * (cfg.scale / (PHI * 1.4))

    const withMin = (val: number, minAbs: number) =>
      Math.sign(val || 1) * Math.max(minAbs, Math.abs(val))

    let azAmp = withMin(yawRaw, MIN_TAIL_YAW)
    let polAmp = withMin(pitchRaw, MIN_TAIL_PITCH)
    azAmp = THREE.MathUtils.clamp(azAmp, -MAX_TAIL_YAW, MAX_TAIL_YAW)
    polAmp = THREE.MathUtils.clamp(polAmp, -MAX_TAIL_PITCH, MAX_TAIL_PITCH)

    // If velocity is essentially zero and clamps collapsed to mins, still proceed—perceptible end.
    const start = performance.now()
    sphereLagRef.current.prevRemaining = 1

    const step = () => {
      const now = performance.now()
      const t = Math.min(1, (now - start) / Math.max(1, duration))
      const e = ease(t, easing)
      const remaining = 1 - e
      const deltaRemaining = remaining - sphereLagRef.current.prevRemaining
      sphereLagRef.current.prevRemaining = remaining

      const s = sphereRef.current
      if (s) {
        s.rotation.y += azAmp * deltaRemaining
        s.rotation.x += polAmp * deltaRemaining
      }
      if (t < 1) {
        sphereLagRef.current.inertiaRAF = requestAnimationFrame(step)
      } else {
        sphereLagRef.current.inertiaRAF = null
        sphereLagRef.current.prevRemaining = 1
      }
    }
    sphereLagRef.current.inertiaRAF = requestAnimationFrame(step)
  }

  // Unified drag with φ-based start delay and velocity tracking
  const handleCarouselDrag = useCallback((e: DragEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const h = Math.max(1, canvas.clientHeight)
    const baseAz = (2 * Math.PI * e.dx) / h
    const basePol = (2 * Math.PI * e.dy) / h
    const SCALE = CONFIG.behavior.drag.scale
    const dAz = baseAz * SCALE
    const dPol = basePol * SCALE

    const lag = sphereLagRef.current

    if (e.phase === 'start') {
      lightDragOverrideRef.current = true

      // Start golden-ratio lag before sphere rotates
      if (!prefersReducedMotion) {
        lag.lagActive = true
        if (lag.startTimer != null) window.clearTimeout(lag.startTimer)
        lag.startTimer = window.setTimeout(() => {
          lag.lagActive = false
          lag.startTimer = null
        }, START_DELAY_MS)
      } else {
        lag.lagActive = false
      }

      cancelSphereInertia()
      if (autoAlignArmingTimeoutRef.current != null) {
        window.clearTimeout(autoAlignArmingTimeoutRef.current)
        autoAlignArmingTimeoutRef.current = null
      }
      lag.lastDAz = 0
      lag.lastDPol = 0
      lag.vAz = 0
      lag.vPol = 0
      lag.lastTs = performance.now()
      return
    }

    if (e.phase === 'move') {
      const now = performance.now()
      const dt = Math.max(1e-3, (now - (lag.lastTs || now)) / 1000)
      lag.lastTs = now

      // Track instantaneous velocity and low-pass filter it
      const ALPHA = 0.35
      const instVAz = dAz / dt
      const instVPol = dPol / dt
      lag.vAz = lag.vAz * (1 - ALPHA) + instVAz * ALPHA
      lag.vPol = lag.vPol * (1 - ALPHA) + instVPol * ALPHA

      // Remember last deltas (directional hint)
      lag.lastDAz = dAz
      lag.lastDPol = dPol

      // Rotate sphere only after the delay; lights update immediately
      const s = sphereRef.current
      if (s && !lag.lagActive) {
        s.rotation.y += dAz
        s.rotation.x += dPol
      }

      const light = softKeyRef.current
      if (light) {
        lightAnglesRef.current.az += dAz
        const pol = (fixedPolRef.current ?? lightAnglesRef.current.pol)
        const az = lightAnglesRef.current.az
        const cp = Math.cos(pol)
        const sp = Math.sin(pol)
        const dir = new THREE.Vector3(cp * Math.sin(az), sp, cp * Math.cos(az)).normalize()
        const radius = lightRadiusRef.current
        light.position.set(dir.x * radius, dir.y * radius, dir.z * radius)
        applyTiltAfterLookAt(light, new THREE.Vector3(0, 0, 0))
        lightAnglesRef.current = { az, pol }
      }
      return
    }

    if (e.phase === 'end') {
      lightDragOverrideRef.current = false
      // Clear pending start delay
      if (lag.startTimer != null) {
        window.clearTimeout(lag.startTimer)
        lag.startTimer = null
        lag.lagActive = false
      }
      // Auto-align arming unchanged
      const resume = CONFIG.behavior.lightAutoAlign.resumeAfterGestureMs
      if (resume === 0) {
        lightUserLatchRef.current = false
      } else if (typeof resume === 'number' && resume > 0) {
        autoAlignArmingTimeoutRef.current = window.setTimeout(() => {
          lightUserLatchRef.current = false
          autoAlignArmingTimeoutRef.current = null
        }, resume)
      }
      return
    }
  }, [])

  // Embla slide progress → start inertia when the slide becomes active
  type SlideProgressEvent = { phase: 'start' | 'move' | 'end'; deltaSlides: number }
  const handleSlideProgress = useCallback((e: SlideProgressEvent) => {
    if (e.phase === 'start') {
      cancelSphereInertia()
      return
    }
    if (e.phase === 'end') {
      startSphereInertia() // sphere continues rotating after activation
    }
  }, [])

  useEffect(() => {
    let running = true
    const container = mountRef.current!
    const { goldenRatio: PHI } = CONFIG.layout

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    // Start with auto-align BLOCKED; it arms only if allowed by config.
    lightUserLatchRef.current = true

    const scheduleAutoAlignArming = () => {
      const delay = Math.max(0, CONFIG.behavior.lightAutoAlign.postIntroDelayMs || 0)
      if (delay <= 0) return
      if (autoAlignArmingTimeoutRef.current != null) {
        window.clearTimeout(autoAlignArmingTimeoutRef.current)
      }
      autoAlignArmingTimeoutRef.current = window.setTimeout(() => {
        lightUserLatchRef.current = false
        autoAlignArmingTimeoutRef.current = null
      }, delay)
    }

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: CONFIG.renderer.antialias, alpha: CONFIG.renderer.alpha })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = CONFIG.renderer.exposure
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)
    canvasRef.current = renderer.domElement as unknown as HTMLCanvasElement

    // Scene / Camera
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, container.clientWidth / container.clientHeight, CONFIG.camera.near, CONFIG.camera.far)
    camera.position.set(...CONFIG.camera.position)
    camera.lookAt(0, 0, 0)

    // Lights
    scene.add(new THREE.AmbientLight(CONFIG.lights.ambient.color as any, CONFIG.lights.ambient.intensity))
    const hemi = new THREE.HemisphereLight(CONFIG.lights.hemisphere.sky as any, CONFIG.lights.hemisphere.ground as any, CONFIG.lights.hemisphere.intensity)
    scene.add(hemi)

    let softKey: THREE.RectAreaLight | null = null
    let softFill: THREE.RectAreaLight | null = null

    // Intro state
    const introCfg = CONFIG.behavior.intro
    let introActive = false
    let introStartTime = 0
    let introStartDir: THREE.Vector3 | null = null
    let introEndDir: THREE.Vector3 | null = null
    let introLightRadius = 0

    function stableBasis(axis: THREE.Vector3) {
      let u = new THREE.Vector3(0, 1, 0).cross(axis)
      if (u.lengthSq() < 1e-10) u = new THREE.Vector3(1, 0, 0).cross(axis)
      u.normalize()
      const v = axis.clone().cross(u).normalize()
      return { u, v }
    }

    ;(async () => {
      const { RectAreaLightUniformsLib } = await import('three/examples/jsm/lights/RectAreaLightUniformsLib.js')
      RectAreaLightUniformsLib.init()

      // KEY
      softKey = new THREE.RectAreaLight(
        CONFIG.lights.rectKey.color as any,
        CONFIG.lights.rectKey.intensity,
        CONFIG.lights.rectKey.size.width,
        CONFIG.lights.rectKey.size.height
      )
      softKey.position.set(...CONFIG.lights.rectKey.position)
      applyTiltAfterLookAt(softKey, new THREE.Vector3(0, 0, 0))
      scene.add(softKey)
      softKeyRef.current = softKey

      // Spherical refs
      const vec = softKey.position.clone()
      const radius = vec.length()
      lightRadiusRef.current = radius
      const az = Math.atan2(vec.x, vec.z)
      const pol = Math.asin(THREE.MathUtils.clamp(vec.y / Math.max(1e-6, radius), -1, 1))
      lightAnglesRef.current = { az, pol }
      fixedPolRef.current = PARAMS.lights.key.lockElevation ? pol : null

      // FILL
      softFill = new THREE.RectAreaLight(
        CONFIG.lights.rectFill.color as any,
        CONFIG.lights.rectFill.intensity,
        CONFIG.lights.rectFill.size.width,
        CONFIG.lights.rectFill.size.height
      )
      softFill.position.set(...CONFIG.lights.rectFill.position)
      softFill.lookAt(0, 0, 0)
      scene.add(softFill)

      // Intro (respects PRM)
      if (introCfg.enabled && softKey) {
        const s = new THREE.Vector3(0, 0, 0)
        const FRONT_DIR = camera.position.clone().sub(s).normalize()
        const { u, v } = stableBasis(FRONT_DIR)

        introLightRadius = softKey.position.clone().sub(s).length()

        introStartDir = FRONT_DIR.clone().multiplyScalar(-1).normalize()
        const alpha = Math.acos(THREE.MathUtils.clamp(introCfg.endAlignmentDot, -1, 1))
        const azOff = THREE.MathUtils.degToRad(introCfg.endAzimuthDeg)
        const ring = u.clone().multiplyScalar(Math.cos(azOff)).add(v.clone().multiplyScalar(Math.sin(azOff)))
        introEndDir = FRONT_DIR.clone().multiplyScalar(Math.cos(alpha)).add(ring.multiplyScalar(Math.sin(alpha))).normalize()

        const setLightFromAz = (azimuth: number) => {
          const polLocked = fixedPolRef.current ?? lightAnglesRef.current.pol
          const cp = Math.cos(polLocked)
          const sp = Math.sin(polLocked)
          const dir = new THREE.Vector3(cp * Math.sin(azimuth), sp, cp * Math.cos(azimuth)).normalize()
          softKey!.position.set(dir.x * introLightRadius, dir.y * introLightRadius, dir.z * introLightRadius)
          applyTiltAfterLookAt(softKey!, s)
          lightAnglesRef.current = { az: azimuth, pol: polLocked }
          lightRadiusRef.current = introLightRadius
        }
        const azOf = (dir: THREE.Vector3) => Math.atan2(dir.x, dir.z)

        const cf = CONFIG.behavior.carouselFade

        if (prefersReduced) {
          setLightFromAz(azOf(introEndDir))
          introActive = false
          // PRM: show carousel immediately, no fade
          setShowCarousel(true)
        } else {
          setLightFromAz(azOf(introStartDir))
          introActive = true
          introStartTime = performance.now()

          // fade start time = intro hold + shareOfIntro * duration + overlap
          const share = Math.max(0, Math.min(1, cf.shareOfIntro ?? (1 / PHI)))
          const baseWait = introCfg.holdMs + Math.round(introCfg.durationMs * share)
          const fadeDelay = Math.max(0, baseWait + (cf.overlapMs ?? 0))
          if (carouselFadeTimeoutRef.current != null) {
            window.clearTimeout(carouselFadeTimeoutRef.current)
          }
          carouselFadeTimeoutRef.current = window.setTimeout(() => {
            setShowCarousel(true)
            carouselFadeTimeoutRef.current = null
          }, fadeDelay)
        }
      } else {
        // No intro—show carousel immediately
        setShowCarousel(true)
      }
    })()

    // Rim
    const rim = new THREE.DirectionalLight(CONFIG.lights.rim.color as any, CONFIG.lights.rim.intensity)
    rim.position.set(...CONFIG.lights.rim.position)
    scene.add(rim)

    // Sphere
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 128, 128),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(CONFIG.material.color as any),
        roughness: CONFIG.material.roughness,
        metalness: CONFIG.material.metalness,
        envMapIntensity: CONFIG.material.envMapIntensity,
        dithering: CONFIG.look.gradientQuality.materialDithering,
      })
    )
    scene.add(sphere)
    sphereRef.current = sphere

    // Controls
    let controls: any = null
    const FIXED_RADIUS = camera.position.distanceTo(sphere.position)
    const BASE_DAMPING = 0.06
    ;(async () => {
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
      controls = new OrbitControls(camera, renderer.domElement)
      controlsRef.current = controls
      controls.enableDamping = true
      controls.dampingFactor = BASE_DAMPING
      controls.enableZoom = false
      controls.enablePan = false
      controls.rotateSpeed = 0.0
      controls.target.copy(sphere.position)
      controls.minDistance = FIXED_RADIUS
      controls.maxDistance = FIXED_RADIUS
      controls.addEventListener('start', () => {})
    })()

    // Sizing
    function fitSphereToGoldenRatio() {
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()

      setStageWidth(w)

      const targetDiameterPx = Math.min(w, h) / (CONFIG.layout.goldenRatio)
      const fractionOfViewHeight = targetDiameterPx / h
      const visibleHeightAtDepth = 2 * FIXED_RADIUS * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      const worldDiameter = visibleHeightAtDepth * fractionOfViewHeight
      const radius = worldDiameter / 2
      sphere.scale.set(radius, radius, radius)
      setSphereDiameterPx(targetDiameterPx)
    }

    fitSphereToGoldenRatio()
    const onResize = () => fitSphereToGoldenRatio()
    window.addEventListener('resize', onResize)

    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'v') setShowVignette((v) => !v)
    })

    // Intro stepper
    function applyIntro() {
      if (!introActive) return
      if (!softKeyRef.current || !introStartDir || !introEndDir) return

      const now = performance.now()
      const elapsed = now - introStartTime
      const hold = Math.max(0, CONFIG.behavior.intro.holdMs)
      if (elapsed < hold) return

      const tRaw = (elapsed - hold) / Math.max(1, CONFIG.behavior.intro.durationMs)
      const t = Math.min(Math.max(tRaw, 0), 1)
      const e = ease(t, CONFIG.behavior.intro.easing)

      const dirInterp = slerpUnit(introStartDir, introEndDir, e)
      const targetAz = Math.atan2(dirInterp.x, dirInterp.z)

      const pol = (fixedPolRef.current ?? lightAnglesRef.current.pol)
      const cp = Math.cos(pol)
      const sp = Math.sin(pol)
      const newDir = new THREE.Vector3(cp * Math.sin(targetAz), sp, cp * Math.cos(targetAz)).normalize()
      const s = new THREE.Vector3(0, 0, 0)
      const newPos = s.clone().add(newDir.multiplyScalar(introLightRadius))

      const light = softKeyRef.current!
      light.position.copy(newPos)
      applyTiltAfterLookAt(light, s)

      lightAnglesRef.current = { az: targetAz, pol }
      lightRadiusRef.current = introLightRadius

      if (t >= 1) {
        introActive = false
        scheduleAutoAlignArming()
      }
    }

    // Auto-align
    function applyLightAutoAlign() {
      const cfg = CONFIG.behavior.lightAutoAlign
      const light = softKeyRef.current
      if (!cfg.enabled || !light) return
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      if (prefersReduced) return
      if (lightDragOverrideRef.current || introActive || lightUserLatchRef.current) return

      const s = new THREE.Vector3(0, 0, 0)
      const vCam = camera.position.clone().sub(s).normalize()
      const curAz = lightAnglesRef.current.az
      const pol = (fixedPolRef.current ?? lightAnglesRef.current.pol)
      const cp = Math.cos(pol)
      const sp = Math.sin(pol)
      const radius = light.position.clone().sub(s).length()

      const r = Math.hypot(vCam.x, vCam.z)
      if (r < 1e-6) return
      const theta = Math.atan2(vCam.x, vCam.z)
      const k = -vCam.y * Math.tan(pol)
      const sinVal = THREE.MathUtils.clamp(k / r, -1, 1)

      const phi = Math.asin(sinVal)
      const cand1 = phi - theta
      const cand2 = (Math.PI - phi) - theta
      const angleDelta = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))
      const d1 = Math.abs(angleDelta(cand1, curAz))
      const d2 = Math.abs(angleDelta(cand2, curAz))
      const targetAz = (d1 <= d2 ? cand1 : cand2)
      const newAz = curAz + angleDelta(targetAz, curAz) * cfg.response

      const newDir = new THREE.Vector3(cp * Math.sin(newAz), sp, cp * Math.cos(newAz)).normalize()
      const newPos = s.clone().add(newDir.multiplyScalar(radius))
      light.position.copy(newPos)
      applyTiltAfterLookAt(light, s)
      lightAnglesRef.current = { az: newAz, pol }
      lightRadiusRef.current = radius
    }

    // Animate loop
    const loop = () => {
      if (!running) return
      applyIntro()
      ;(controlsRef.current as any)?.update?.()
      applyLightAutoAlign()
      renderer.render(scene, camera)
      requestAnimationFrame(loop)
    }
    loop()

    // Cleanup
    return () => {
      running = false
      if (autoAlignArmingTimeoutRef.current != null) {
        window.clearTimeout(autoAlignArmingTimeoutRef.current)
        autoAlignArmingTimeoutRef.current = null
      }
      if (carouselFadeTimeoutRef.current != null) {
        window.clearTimeout(carouselFadeTimeoutRef.current)
        carouselFadeTimeoutRef.current = null
      }
      const lag = sphereLagRef.current
      if (lag.startTimer != null) window.clearTimeout(lag.startTimer)
      cancelSphereInertia()

      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  // --- Background gradient (vertical multi-stop) ---
  const top = CONFIG.theme.backgroundTop
  const bottom = CONFIG.theme.backgroundBottom

  const makeVerticalHQGradient = (a: string | number, b: string | number, enableExtra: boolean) => {
    if (!enableExtra) return `linear-gradient(to bottom, ${a} 0%, ${b} 100%)`
    const stops = [0, 0.12, 0.28, 0.56, 0.72, 0.88, 1]
    const parts = stops.map((p) => `${mixHex(a, b, p)} ${Math.round(p * 100)}%`)
    return `linear-gradient(to bottom, ${parts.join(', ')})`
  }
  const bg = makeVerticalHQGradient(top, bottom, CONFIG.look.gradientQuality.extraStopsEnabled)
  const vignetteBg = `radial-gradient(circle at 50% 50%, rgba(0,0,0,0) ${CONFIG.theme.vignette.centerStopPct}%, rgba(0,0,0,${CONFIG.theme.vignette.edgeAlpha}) 100%)`

  // Slides
  const quotes: string[] = [
    "The people who are crazy enough to think they can change the world are the ones who do.",
    "Stay hungry, stay foolish.",
    "Design is not just what it looks like and feels like. Design is how it works.",
    "Innovation distinguishes between a leader and a follower.",
    "Your time is limited, so don’t waste it living someone else’s life.",
    "Have the courage to follow your heart and intuition.",
    "Quality is more important than quantity. One home run is much better than two doubles.",
    "Details matter, it’s worth waiting to get it right.",
    "Simplicity is the ultimate sophistication.",
    "Be a yardstick of quality. Some people aren’t used to an environment where excellence is expected.",
    "I’m as proud of what we don’t do as I am of what we do.",
    "Creativity is just connecting things.",
    "It’s not a faith in technology. It’s faith in people.",
    "The only way to do great work is to love what you do.",
    "My favorite things in life don’t cost any money. The most precious resource we all have is time.",
    "A lot of times, people don’t know what they want until you show it to them.",
    "Real artists ship.",
    "We don’t get a chance to do that many things, and every one should be really excellent.",
    "Great things in business are never done by one person; they’re done by a team of people.",
    "Deciding what not to do is as important as deciding what to do.",
    "Let’s go invent tomorrow rather than worrying about what happened yesterday.",
    "We’re here to put a dent in the universe. Otherwise why else even be here?"
  ]
  const slides = quotes.map((q, i) => (
    <blockquote key={`q-${i}`} style={{ margin: 0 }}>
      <p style={{ margin: 0, fontSize: '1.25rem', lineHeight: 1.5 }}>{q}</p>
      <footer style={{ marginTop: 8, opacity: 0.7, fontSize: '1rem' }}>— Steve Jobs</footer>
    </blockquote>
  ))

  type SlideProgressEvent = { phase: 'start' | 'move' | 'end'; deltaSlides: number }

  const gq = CONFIG.look.gradientQuality
  const cf = CONFIG.behavior.carouselFade

  const prefersReducedRender =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  return (
    <div style={styles.stage}>
      <div ref={mountRef} style={{ ...styles.mount, background: bg }} />

      {sphereDiameterPx > 0 && (
        <div
          aria-hidden={!showCarousel}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
            opacity: showCarousel ? 1 : 0,
            pointerEvents: showCarousel ? 'auto' : 'none',
            transition: prefersReducedRender ? 'none' : `opacity ${cf.durationMs}ms ${cf.cssTiming}`,
          }}
        >
          {/* <EmblaCoverCarousel
            diameterPx={sphereDiameterPx}
            viewportWidth={stageWidth}
            items={slides}
            registerDragListener={() => () => {}}
            publishDrag={handleCarouselDrag}
            onSlideProgress={handleSlideProgress}
          /> */}
        </div>
      )}

      {showVignette && <div style={{ ...styles.vignette, background: vignetteBg }} />}

      {gq.overlay.enabled && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: NOISE_DATA_URI,
            backgroundRepeat: 'repeat',
            backgroundSize: `${gq.overlay.sizePx}px ${gq.overlay.sizePx}px`,
            mixBlendMode: gq.overlay.blendMode,
            opacity: gq.overlay.opacity,
            zIndex: 6,
            willChange: 'opacity',
          }}
        />
      )}

      <div style={styles.hint}>
        Drag to rotate the sphere and light. Release keeps the exact orientation.
      </div>
    </div>
  )
}

// Client-only wrapper
const ClientOnly = dynamic(async () => GoldenMatteSphereSoftLightingPage, { ssr: false })
export default function Page() { return <ClientOnly /> }

/* ----------------------------------- Styles ----------------------------------- */
const styles: Record<string, React.CSSProperties> = {
  stage: { position: 'fixed', inset: 0, overflow: 'hidden', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif', background: 'transparent' },
  mount: { position: 'absolute', inset: 0 },
  vignette: { position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'normal' },
  hint: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    padding: '6px 10px',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    background: 'linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.55))',
    border: '1px solid rgba(255,255,255,0.0)',
    borderRadius: 8,
    userSelect: 'none',
  },
}
