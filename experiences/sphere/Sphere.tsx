'use client'

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import EmblaCoverCarousel, { type RegisterDragListener } from './Carousel'
import styles from './Sphere.module.css'
// import DragArrowsHint from './DragArrowsHint'

import { CONFIG, KEY_LOCK_ELEVATION } from './Sphere.config'
import { ease, slerpUnit } from './sphereMath'
import { NOISE_DATA_URI } from './noise'
// import { makeVerticalHQGradient } from './gradients'
import { makeVerticalHQGradient, buildPalette, paletteVars } from './gradients' // hvle
import SlideItem from './SlideItem'
import { quotes, descriptions, categories } from './slidesData'

// data-driven slide node (3 lines: title, description, date+tags)
import SlideContent from './SlideContent'
import type { SlideMeta } from './slidesFromPosts'

type MarkdownSlide = Pick<SlideMeta, 'title' | 'description' | 'date' | 'tags'>

// NEW: accept dissolve + isImmersive as external controls
type Props = {
  slidesData?: MarkdownSlide[]
  dissolveProgress?: number   // 0 = fully 3D & opaque, 1 = flat & invisible
  isImmersive?: boolean
  /** Optional 3-stop background colors (top/mid/bottom). If omitted, falls back to CONFIG. */ // hvle
  gradientStops?: { top: string; mid: string; bottom: string }
}

export default function GoldenMatteSphereSoftLighting({ slidesData, dissolveProgress = 0, gradientStops }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [sphereDiameterPx, setSphereDiameterPx] = useState(0)
  const [stageWidth, setStageWidth] = useState(0)
  const [showCarousel, setShowCarousel] = useState(false)

  // ---------------- Drag bus (Embla compatibility) ----------------
  type DragEvent = { phase: 'start' | 'move' | 'end'; dx: number; dy: number }
  type DragListener = (e: DragEvent) => void
  const dragSubs = useRef<Set<DragListener>>(new Set())
  const registerDragListener: RegisterDragListener = (listener) => {
    dragSubs.current.add(listener)
    return () => dragSubs.current.delete(listener)
  }
  const notifyDrag = (e: DragEvent) => { dragSubs.current.forEach((fn) => fn(e)) }

  // ---------------- Scene refs ------------------------------------
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
  const sphereBaseRadiusRef = useRef<number>(1) // NEW: track base XY radius for flattening

  // Persistent key-light tilt
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

  /* ---------------- φ-based lag (legacy mesh inertia kept) ---------------- */
  const PHI = CONFIG.layout.goldenRatio
  const START_DELAY_MS = Math.round(100 * PHI * PHI)
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  const sphereLagRef = useRef({
    startTimer: null as number | null,
    lagActive: false,
    inertiaRAF: null as number | null,
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

  /* ---------------- Light spin controller ---------------------- */
  const lightSpinRef = useRef<{ wazUser: number; wpolUser: number; lastT: number; dragging: boolean }>({
    wazUser: 0, wpolUser: 0, lastT: 0, dragging: false,
  })
  const clampRadPerSec = (v: number) => {
    const max = Math.max(0, CONFIG.behavior.lightSpin?.maxRadPerSec ?? Infinity)
    return THREE.MathUtils.clamp(v, -max, max)
  }

  // Post-intro auto segment (bounded displacement + velocity ramp)
  const autoSpinActiveRef = useRef<boolean>(false)
  const autoConsumedAzRef = useRef<number>(0)   // radians consumed
  const autoMaxAzRef = useRef<number>(0)        // radians allowed

  // NEW: intro velocity tracking + handoff controller
  const introLastRef = useRef<{ az: number; t: number; w: number }>({ az: 0, t: 0, w: 0 })
  const handoffRef = useRef<{
    active: boolean
    mode: 'blend' | 'flip'
    t0: number
    dur: number
    wStart: number
    wTarget0: number
    decelMs?: number
    accelMs?: number
  }>({
    active: false, mode: 'blend', t0: 0, dur: 0, wStart: 0, wTarget0: 0,
  })

  // ---------------- Unified drag → light -------------------------
  const handleCarouselDrag = useCallback((e: { phase:'start'|'move'|'end'; dx:number; dy:number }) => {
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
      if (!prefersReducedMotion) {
        if (lag.startTimer != null) window.clearTimeout(lag.startTimer)
        lag.lagActive = true
        lag.startTimer = window.setTimeout(() => {
          lag.lagActive = false
          lag.startTimer = null
        }, START_DELAY_MS)
      } else {
        lag.lagActive = false
      }

      cancelSphereInertia()
      lightSpinRef.current.dragging = true

      // Cancel any ongoing handoff when user takes control
      if (handoffRef.current.active) handoffRef.current.active = false

      if (autoAlignArmingTimeoutRef.current != null) {
        window.clearTimeout(autoAlignArmingTimeoutRef.current)
        autoAlignArmingTimeoutRef.current = null
      }
      lag.lastDAz = 0; lag.lastDPol = 0; lag.vAz = 0; lag.vPol = 0
      lag.lastTs = performance.now()
      return
    }

    if (e.phase === 'move') {
      const now = performance.now()
      const dt = Math.max(1e-3, (now - (lag.lastTs || now)) / 1000)
      lag.lastTs = now

      const ALPHA = 0.35
      const instVAz = dAz / dt
      const instVPol = dPol / dt
      lag.vAz = lag.vAz * (1 - ALPHA) + instVAz * ALPHA
      lag.vPol = lag.vPol * (1 - ALPHA) + instVPol * ALPHA

      // Immediate light motion
      const light = softKeyRef.current
      if (light && !lag.lagActive) {
        lightAnglesRef.current.az += dAz
        const pol = (fixedPolRef.current ?? lightAnglesRef.current.pol) + (KEY_LOCK_ELEVATION ? 0 : dPol)
        const az = lightAnglesRef.current.az
        const cp = Math.cos(pol), sp = Math.sin(pol)
        const dir = new THREE.Vector3(cp * Math.sin(az), sp, cp * Math.cos(az)).normalize()
        const radius = lightRadiusRef.current
        light.position.set(dir.x * radius, dir.y * radius, dir.z * radius)
        applyTiltAfterLookAt(light, new THREE.Vector3(0, 0, 0))
        lightAnglesRef.current = { az, pol }
      }

      // Feed user angular velocity
      if (CONFIG.behavior.lightSpin?.enabled) {
        const gain = CONFIG.behavior.lightSpin.impulseScale ?? 1
        const mix = 0.15
        const nextAz = clampRadPerSec(lightSpinRef.current.wazUser + instVAz * gain)
        const nextPol = clampRadPerSec(lightSpinRef.current.wpolUser + instVPol * gain)
        lightSpinRef.current.wazUser = lightSpinRef.current.wazUser * (1 - mix) + nextAz * mix
        lightSpinRef.current.wpolUser = lightSpinRef.current.wpolUser * (1 - mix) + nextPol * mix
      }
      return
    }

    if (e.phase === 'end') {
      lightDragOverrideRef.current = false
      lightSpinRef.current.dragging = false

      if (sphereLagRef.current.startTimer != null) {
        window.clearTimeout(sphereLagRef.current.startTimer)
        sphereLagRef.current.startTimer = null
        sphereLagRef.current.lagActive = false
      }
      const resume = CONFIG.behavior.lightAutoAlign.resumeAfterGestureMs
      if (resume === 0) {
        lightUserLatchRef.current = false
      } else if (typeof resume === 'number' && resume > 0) {
        autoAlignArmingTimeoutRef.current = window.setTimeout(() => {
          lightUserLatchRef.current = false
          autoAlignArmingTimeoutRef.current = null
        }, resume)
      }

      if (CONFIG.behavior.lightSpin?.enabled && !prefersReducedMotion) {
        lightSpinRef.current.wazUser = clampRadPerSec(sphereLagRef.current.vAz)
        lightSpinRef.current.wpolUser = clampRadPerSec(sphereLagRef.current.vPol)
      } else {
        lightSpinRef.current.wazUser = 0
        lightSpinRef.current.wpolUser = 0
      }
      return
    }
  }, [prefersReducedMotion])

  // Embla event hook kept for API parity (no mesh inertia while light spin is active)
  const handleSlideProgress = useCallback((_e: { phase: 'start' | 'move' | 'end'; deltaSlides: number }) => {}, [])
  useEffect(() => registerDragListener(handleCarouselDrag), [handleCarouselDrag])

  // --------------------- Three.js setup & loop --------------------
  useEffect(() => {
    let running = true
    const container = mountRef.current!
    lightUserLatchRef.current = true

    // local helpers
    const angleDelta = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))
    const smoothstep = (t: number) => { t = Math.min(Math.max(t, 0), 1); return t * t * (3 - 2 * t) }
    const easeInFromOut = (t: number, name: Parameters<typeof ease>[1]) => 1 - ease(1 - Math.min(Math.max(t, 0), 1), name)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: CONFIG.renderer.antialias, alpha: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = CONFIG.renderer.exposure
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.style.backgroundColor = 'transparent' // double-ensure no fallback fill — hvle
    container.appendChild(renderer.domElement)
    canvasRef.current = renderer.domElement as unknown as HTMLCanvasElement

    // Pointer bridge
    const el = renderer.domElement
    let px = 0, py = 0, dragging = false
    const onDown = (ev: PointerEvent) => { dragging = true; px = ev.clientX; py = ev.clientY; el.setPointerCapture?.(ev.pointerId); notifyDrag({ phase: 'start', dx: 0, dy: 0 }) }
    const onMove = (ev: PointerEvent) => { if (!dragging) return; const dx = ev.clientX - px; const dy = ev.clientY - py; px = ev.clientX; py = ev.clientY; notifyDrag({ phase: 'move', dx, dy }) }
    const onUp = (ev: PointerEvent) => { if (!dragging) return; dragging = false; el.releasePointerCapture?.(ev.pointerId); notifyDrag({ phase: 'end', dx: 0, dy: 0 }) }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)

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
      fixedPolRef.current = KEY_LOCK_ELEVATION ? pol : null

      // Intro & carousel fade alignment
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

      if (introCfg.enabled && softKey) {
        const s = new THREE.Vector3(0, 0, 0)
        const FRONT_DIR = camera.position.clone().sub(s).normalize()
        const { u, v } = stableBasis(FRONT_DIR)
        introLightRadius = softKey.position.clone().sub(s).length()

        // initial leftward azimuth sweep (opposes steady-state rightward)
        introStartDir = FRONT_DIR.clone().multiplyScalar(-1).normalize()
        const alpha = Math.acos(THREE.MathUtils.clamp(introCfg.endAlignmentDot, -1, 1))
        const azOff = THREE.MathUtils.degToRad(introCfg.endAzimuthDeg)
        const ring = u.clone().multiplyScalar(Math.cos(azOff)).add(v.clone().multiplyScalar(Math.sin(azOff)))
        introEndDir = FRONT_DIR.clone().multiplyScalar(Math.cos(alpha)).add(ring.multiplyScalar(Math.sin(alpha))).normalize()

        const setLightFromAz = (azimuth: number) => {
          const polLocked = fixedPolRef.current ?? lightAnglesRef.current.pol
          const cp = Math.cos(polLocked), sp = Math.sin(polLocked)
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
          setShowCarousel(true)
        } else {
          setLightFromAz(azOf(introStartDir))
          introActive = true
          introStartTime = performance.now()

          const share = Math.max(0, Math.min(1, cf.shareOfIntro ?? (1 / PHI)))
          const baseWait = introCfg.holdMs + Math.round(introCfg.durationMs * share)
          const fadeDelay = Math.max(0, baseWait + (cf.overlapMs ?? 0))
          if (carouselFadeTimeoutRef.current != null) window.clearTimeout(carouselFadeTimeoutRef.current)
          carouselFadeTimeoutRef.current = window.setTimeout(() => {
            setShowCarousel(true)
            carouselFadeTimeoutRef.current = null
          }, fadeDelay)
        }
      } else {
        setShowCarousel(true)
      }
    })()

    // FILL & Rim
    const softFill = new THREE.RectAreaLight(
      CONFIG.lights.rectFill.color as any,
      CONFIG.lights.rectFill.intensity,
      CONFIG.lights.rectFill.size.width,
      CONFIG.lights.rectFill.size.height
    )
    softFill.position.set(...CONFIG.lights.rectFill.position)
    softFill.lookAt(0, 0, 0)
    scene.add(softFill)

    const rim = new THREE.DirectionalLight(CONFIG.lights.rim.color as any, CONFIG.lights.rim.intensity)
    rim.position.set(...CONFIG.lights.rim.position)
    scene.add(rim)

    // Sphere
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(CONFIG.material.color as any),
      roughness: CONFIG.material.roughness,
      metalness: CONFIG.material.metalness,
      envMapIntensity: CONFIG.material.envMapIntensity,
      dithering: CONFIG.look.gradientQuality.materialDithering,
      transparent: true, // allow opacity control
      opacity: 1,
    })
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 128, 128),
      material
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
    })()

    // Sizing
    function fitSphereToGoldenRatio() {
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()

      setStageWidth(w)

      const targetDiameterPx = Math.min(w, h) / CONFIG.layout.goldenRatio
      const fractionOfViewHeight = targetDiameterPx / h
      const visibleHeightAtDepth = 2 * FIXED_RADIUS * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      const worldDiameter = visibleHeightAtDepth * fractionOfViewHeight
      const radius = worldDiameter / 2
      sphere.scale.set(radius, radius, radius)
      sphereBaseRadiusRef.current = radius // track XY base radius
      setSphereDiameterPx(targetDiameterPx)
    }
    fitSphereToGoldenRatio()
    const onResize = () => fitSphereToGoldenRatio()
    window.addEventListener('resize', onResize)

    function applyIntro() {
      if (!introActive) return
      if (!softKeyRef.current || !introStartDir || !introEndDir) return

      const now = performance.now()
      const hold = Math.max(0, CONFIG.behavior.intro.holdMs)
      const tRaw = (now - introStartTime - hold) / Math.max(1, CONFIG.behavior.intro.durationMs)
      if (tRaw < 0) return
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

      // Track instantaneous intro yaw speed for handoff
      const tPrev = introLastRef.current.t || now
      const dt = Math.max(1e-3, (now - tPrev) / 1000)
      const dAz = angleDelta(targetAz, introLastRef.current.az || targetAz)
      const wIntro = dAz / dt
      introLastRef.current = { az: targetAz, t: now, w: wIntro }

      lightAnglesRef.current = { az: targetAz, pol }
      lightRadiusRef.current = introLightRadius

      if (t >= 1) {
        introActive = false

        // Arm bounded auto spin (post-intro)
        const auto = CONFIG.behavior.lightSpin?.auto
        if (!prefersReducedMotion && auto?.enabled) {
          autoSpinActiveRef.current = true
          autoConsumedAzRef.current = 0
          autoMaxAzRef.current = THREE.MathUtils.degToRad(Math.max(0, auto.maxAzimuthDeg || 0))
          lightSpinRef.current.lastT = performance.now()
        }

        // Start explicit two-phase handoff (left decel → right accel) if enabled
        const hand = CONFIG.behavior.lightSpin?.handoff
        const flip = hand?.flip
        if (!prefersReducedMotion && hand?.enabled && flip?.enabled) {
          const wStart = clampRadPerSec(introLastRef.current.w || 0) // expected negative (left)
          const cfg = CONFIG.behavior.lightSpin
          const autoCfg = cfg?.auto
          // accelerate up to the *max established* rightward velocity
          const wTargetPos =
            ((autoCfg?.endYawRps ?? cfg?.yawRps ?? 0)) * (2 * Math.PI)

          handoffRef.current = {
            active: true,
            mode: 'flip',
            t0: performance.now(),
            dur: Math.max(0, flip.decelMs + flip.accelMs),
            wStart,
            wTarget0: clampRadPerSec(wTargetPos),
            decelMs: Math.max(0, flip.decelMs),
            accelMs: Math.max(0, flip.accelMs),
          }
        } else if (!prefersReducedMotion && hand?.enabled) {
          // Fallback to legacy single-piece handoff (blend)
          const wStart = clampRadPerSec(introLastRef.current.w || 0)
          const autoCfg = CONFIG.behavior.lightSpin?.auto
          const wTarget0 =
            (autoCfg?.enabled
              ? (autoCfg.startYawRps ?? CONFIG.behavior.lightSpin?.yawRps ?? 0)
              : (CONFIG.behavior.lightSpin?.yawRps ?? 0)) * (2 * Math.PI)
          handoffRef.current = {
            active: true, mode: 'blend',
            t0: performance.now(), dur: Math.max(0, hand.durationMs || 0),
            wStart, wTarget0,
          }
        }
      }
    }

    function applyLightAutoAlign() {
      // Skip auto-align while spinning light to avoid fighting
      if (CONFIG.behavior.lightSpin?.enabled) return

      const cfg = CONFIG.behavior.lightAutoAlign
      const light = softKeyRef.current
      if (!cfg.enabled || !light) return
      if (prefersReducedMotion) return
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
      const angleDeltaLocal = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))
      const d1 = Math.abs(angleDeltaLocal(cand1, curAz))
      const d2 = Math.abs(angleDeltaLocal(cand2, curAz))
      const targetAz = (d1 <= d2 ? cand1 : cand2)
      const newAz = curAz + angleDeltaLocal(targetAz, curAz) * cfg.response

      const newDir = new THREE.Vector3(cp * Math.sin(newAz), sp, cp * Math.cos(newAz)).normalize()
      const newPos = s.clone().add(newDir.multiplyScalar(radius))
      light.position.copy(newPos)
      applyTiltAfterLookAt(light, s)
      lightAnglesRef.current = { az: newAz, pol }
      lightRadiusRef.current = radius
    }

    function applyLightSpin() {
      const cfg = CONFIG.behavior.lightSpin
      if (!cfg?.enabled) return
      const light = softKeyRef.current
      if (!light) return

      const hand = cfg.handoff
      const now = performance.now()

      // ---- Handoff window ----
      if (
        handoffRef.current.active &&
        hand?.enabled &&
        !prefersReducedMotion &&
        !lightSpinRef.current.dragging
      ) {
        // dt bookkeeping shared by both paths
        const dt = (() => {
          if (!lightSpinRef.current.lastT) { lightSpinRef.current.lastT = now; return 1e-3 }
          const d = Math.max(1e-3, (now - lightSpinRef.current.lastT) / 1000)
          lightSpinRef.current.lastT = now
          return d
        })()

        if (handoffRef.current.mode === 'flip' && hand.flip?.enabled) {
          const decelMs = handoffRef.current.decelMs || 0
          const accelMs = handoffRef.current.accelMs || 0
          const tSince = now - handoffRef.current.t0

          let step = 0

          if (tSince < decelMs) {
            // Phase 1: elastic deceleration while still rotating left
            const p = Math.min(1, Math.max(0, tSince / Math.max(1, decelMs)))
            const s = ease(p, hand.easing || 'cubicOut') // slow into the stop
            const A = Math.max(0, hand.flip.decelElasticAmp ?? 0.10)
            const decay = Math.max(0, hand.flip.decelDecay ?? 2.5)
            const factor = 1 + A * Math.sin(Math.PI * p) * Math.exp(-decay * p) // one soft hump
            const mag = Math.max(0, (1 - s) * factor)
            // ensure we truly get ~zero near the end of decel
            const magClamped = mag < 0.02 ? 0 : mag
            const wEff = clampRadPerSec(Math.sign(handoffRef.current.wStart || -1) * Math.abs(handoffRef.current.wStart) * magClamped)
            step = wEff * dt

          } else {
            // Phase 2: restart to the right, starting from ~0 and growing very gently
            const u = Math.min(1, Math.max(0, (tSince - decelMs) / Math.max(1, accelMs)))
            // base: mirror OUT→IN (expo-in if accelEasing='expoOut')
            let eIn = easeInFromOut(u, hand.flip.accelEasing || 'expoOut')
            // extra parabolic/exponential softness
            const pow = Math.max(1, hand.flip.accelPower ?? 1)
            if (pow !== 1) eIn = Math.pow(eIn, pow) // t^2.4 by default ⇒ very slow start
            const wEff = clampRadPerSec(Math.abs(handoffRef.current.wTarget0) * eIn)
            step = wEff * dt

            // Respect remaining auto allowance in the positive direction
            if (autoSpinActiveRef.current && cfg.auto?.enabled && autoMaxAzRef.current > 0) {
              const remain = autoMaxAzRef.current - autoConsumedAzRef.current
              const allowed = Math.sign(step) * Math.min(Math.abs(step), Math.max(0, remain))
              step = allowed
              autoConsumedAzRef.current += Math.abs(allowed)
              if (autoConsumedAzRef.current >= autoMaxAzRef.current - 1e-6) {
                autoSpinActiveRef.current = false
              }
            }
          }

          // Apply to light
          const az = lightAnglesRef.current.az + step
          const pol = (fixedPolRef.current ?? lightAnglesRef.current.pol)
          const cp = Math.cos(pol), sp = Math.sin(pol)
          const dir = new THREE.Vector3(cp * Math.sin(az), sp, cp * Math.cos(az)).normalize()
          const radius = lightRadiusRef.current
          light.position.set(dir.x * radius, dir.y * radius, dir.z * radius)
          applyTiltAfterLookAt(light, new THREE.Vector3(0, 0, 0))
          lightAnglesRef.current = { az, pol }

          if (tSince >= (decelMs + accelMs)) {
            handoffRef.current.active = false
          }
          return
        }

        // Legacy single-piece handoff (blend) — kept for compatibility
        const t01 = Math.min(1, Math.max(0, (now - handoffRef.current.t0) / Math.max(1, handoffRef.current.dur)))
        const s = smoothstep(t01)
        const wBlend = handoffRef.current.wStart + (handoffRef.current.wTarget0 - handoffRef.current.wStart) * s
        let factor = 1 + Math.max(0, hand.bumpAmp ?? 0) * Math.sin(Math.PI * t01)
        const wEff = clampRadPerSec(wBlend * factor)

        let step = wEff * dt
        if (autoSpinActiveRef.current && cfg.auto?.enabled && autoMaxAzRef.current > 0) {
          const remain = autoMaxAzRef.current - autoConsumedAzRef.current
          const allowed = Math.sign(step) * Math.min(Math.abs(step), Math.max(0, remain))
          step = allowed
          autoConsumedAzRef.current += Math.abs(allowed)
          if (autoConsumedAzRef.current >= autoMaxAzRef.current - 1e-6) autoSpinActiveRef.current = false
        }

        const az = lightAnglesRef.current.az + step
        const pol = (fixedPolRef.current ?? lightAnglesRef.current.pol)
        const cp = Math.cos(pol), sp = Math.sin(pol)
        const dir = new THREE.Vector3(cp * Math.sin(az), sp, cp * Math.cos(az)).normalize()
        const radius = lightRadiusRef.current
        light.position.set(dir.x * radius, dir.y * radius, dir.z * radius)
        applyTiltAfterLookAt(light, new THREE.Vector3(0, 0, 0))
        lightAnglesRef.current = { az, pol }

        if (t01 >= 1) handoffRef.current.active = false
        return
      }

      // ---- Normal spin controller (auto segment + baseline + user momentum) ----
      if (!lightSpinRef.current.lastT) { lightSpinRef.current.lastT = now; return }
      const dt = Math.max(1e-3, (now - lightSpinRef.current.lastT) / 1000)
      lightSpinRef.current.lastT = now

      if (!lightSpinRef.current.dragging) {
        // Integrate user momentum
        const userAzDelta = lightSpinRef.current.wazUser * dt
        const userPolDelta = lightSpinRef.current.wpolUser * dt

        // Damping
        const damping = Math.max(0, cfg.dampingPerSecond ?? 0)
        const k = Math.exp(-damping * dt)
        lightSpinRef.current.wazUser *= k
        lightSpinRef.current.wpolUser *= k
        const EPS = 1e-4
        if (Math.abs(lightSpinRef.current.wazUser) < EPS) lightSpinRef.current.wazUser = 0
        if (Math.abs(lightSpinRef.current.wpolUser) < EPS) lightSpinRef.current.wpolUser = 0

        // Auto segment (bounded displacement with speed ramp)
        let baseAzDelta = 0
        const auto = cfg.auto
        if (!prefersReducedMotion && autoSpinActiveRef.current && auto && auto.enabled && autoMaxAzRef.current > 0) {
          const maxRad = autoMaxAzRef.current
          const consumed = autoConsumedAzRef.current
          const progress = Math.min(1, Math.max(0, consumed / maxRad))
          const wStart = (auto.startYawRps ?? 0) * 2 * Math.PI
          const wEnd = (auto.endYawRps ?? cfg.yawRps ?? 0) * 2 * Math.PI
          const wBase = wStart + (wEnd - wStart) * ease(progress, auto.easing || 'quintOut')
          const step = wBase * dt
          const remain = maxRad - consumed
          const allowed = Math.sign(step) * Math.min(Math.abs(step), remain)
          baseAzDelta = allowed
          autoConsumedAzRef.current = consumed + Math.abs(allowed)
          if (autoConsumedAzRef.current >= maxRad - 1e-6) autoSpinActiveRef.current = false
        } else {
          // Steady-state baseline yaw after landing
          const wMin = (cfg.yawRps ?? 0) * 2 * Math.PI
          baseAzDelta = prefersReducedMotion ? 0 : (wMin * dt)
        }

        // Compose & apply
        let az = lightAnglesRef.current.az + userAzDelta + baseAzDelta
        let pol = (fixedPolRef.current ?? lightAnglesRef.current.pol)
        if (!KEY_LOCK_ELEVATION) pol += userPolDelta

        const cp = Math.cos(pol), sp = Math.sin(pol)
        const dir = new THREE.Vector3(cp * Math.sin(az), sp, cp * Math.cos(az)).normalize()
        const radius = lightRadiusRef.current
        light.position.set(dir.x * radius, dir.y * radius, dir.z * radius)
        applyTiltAfterLookAt(light, new THREE.Vector3(0, 0, 0))
        lightAnglesRef.current = { az, pol }
      }
    }

    const loop = () => {
      if (!running) return
      applyIntro()
      ;(controlsRef.current as any)?.update?.()
      applyLightAutoAlign()
      applyLightSpin()
      renderer.render(scene, camera)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)

    // Cleanup
    return () => {
      running = false
      if (autoAlignArmingTimeoutRef.current != null) window.clearTimeout(autoAlignArmingTimeoutRef.current)
      if (carouselFadeTimeoutRef.current != null) window.clearTimeout(carouselFadeTimeoutRef.current)
      const lag = sphereLagRef.current
      if (lag.startTimer != null) window.clearTimeout(lag.startTimer)
      cancelSphereInertia()
      window.removeEventListener('resize', onResize)
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      renderer.dispose()
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  // --- Background gradient (vertical multi-stop) ---
  // const top = CONFIG.theme.backgroundTop
  // const bottom = CONFIG.theme.backgroundBottom
  // const bg = makeVerticalHQGradient(top, bottom, CONFIG.look.gradientQuality.extraStopsEnabled)

    // Build an indexable palette (SSR-safe) reusing tools/light ladders — hvle
  // --- Background gradient (palette-driven) ---
  // Build an indexable palette from the Light tool ladders.
  // Tip: extreme values like sat/light=1000 will clamp; start near 1.00–1.15 for sat and 0.95–1.05 for light. — hvle
    // Three palettes: A=top, B=mid, C=bottom. Reuse Light tool ladders. — hvle
  const stops = gradientStops ?? { top: CONFIG.theme.backgroundTop, mid: CONFIG.theme.backgroundTop, bottom: CONFIG.theme.backgroundBottom }

  const palA = useMemo(
    () => buildPalette(stops.top,    { theme: 'dark', steps: 3, delta: 1.2720196495, sat: 1.00, light: 1.00 }),
    [stops.top]
  )
  const palB = useMemo(
    () => buildPalette(stops.mid,    { theme: 'dark', steps: 3, delta: 1.2720196495, sat: 1.00, light: 1.00 }),
    [stops.mid]
  )
  const palC = useMemo(
    () => buildPalette(stops.bottom, { theme: 'dark', steps: 3, delta: 1.2720196495, sat: 1.00, light: 1.00 }),
    [stops.bottom]
  )

  // Publish as CSS vars:
  //   --palA-0.., --palB-0.., --palC-0.., plus --palA-size / --palB-size / --palC-size
  const paletteStyle = useMemo(() => ({
    ...paletteVars(palA, '--palA-'),
    ...paletteVars(palB, '--palB-'),
    ...paletteVars(palC, '--palC-'),
  }), [palA, palB, palC])

  // Use palette extremes for the page gradient (super soft, perceptual)
  const top = paletteStyle['--palA-2'] as string
  const bottom = paletteStyle['--palA-0'] as string
  const bg = makeVerticalHQGradient(top, bottom, CONFIG.look.gradientQuality.extraStopsEnabled)

  const prefersReducedRender =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  // Items from optional data OR fallback demo slides
  const items = useMemo(() => {
    if (slidesData && slidesData.length > 0) {
      return slidesData.map((s, i) => (
        <SlideContent key={`md-${i}`} slide={s} style={{ width: '100%', height: '100%', backgroundColor: 'blue', overflow: 'visible' }} />
      ))
    }
    return quotes.map((q, i) => (
      <SlideItem
        key={`q-${i}`}
        q={q}
        desc={descriptions[i]}
        category={categories[i % categories.length]}
        preferReducedMotion={!!prefersReducedRender}
      />
    ))
  }, [slidesData, prefersReducedRender])

  // NEW: apply dissolve (opacity + flatten Z) whenever prop changes
  useEffect(() => {
    const mesh = sphereRef.current
    if (!mesh) return
    const mat = mesh.material as THREE.MeshStandardMaterial
    const t = THREE.MathUtils.clamp(dissolveProgress ?? 0, 0, 1)

    // opacity: 1 → 0
    mat.transparent = true
    mat.opacity = 1 - t
    // minor depth-write mitigation near transparency
    mat.depthWrite = mat.opacity > 0.4
    mat.needsUpdate = true

    // flatten along Z only (XY keeps base radius)
    const r = sphereBaseRadiusRef.current || mesh.scale.x || 1
    const z = r * (1 - t)
    mesh.scale.set(r, r, z)
  }, [dissolveProgress])

  return (
    <div className={styles.stage} data-sphere-page style={paletteStyle as any}> {/* publish --pal-* vars — hvle */}

      <div ref={mountRef} className={styles.mount} style={{ background: 'transparent' }} /> {/* hvle: stage must be transparent */}


      {/* Optional small helper/hint */}
      {/* <DragArrowsHint visible={true} offsetPx={0} /> */}

      {sphereDiameterPx > 0 && (
        <div
          aria-hidden={!showCarousel}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
            opacity: showCarousel ? 1 : 0,
            pointerEvents: showCarousel ? 'auto' : 'none',
            transition: prefersReducedRender
              ? 'none'
              : `opacity ${CONFIG.behavior.carouselFade.durationMs}ms ${CONFIG.behavior.carouselFade.cssTiming}`,
            ['--fade-duration' as any]: `${CONFIG.behavior.carouselFade.durationMs}ms`,
            ['--fade-ease' as any]: CONFIG.behavior.carouselFade.cssTiming,
          }}
        >
          <EmblaCoverCarousel
            diameterPx={sphereDiameterPx}
            viewportWidth={stageWidth}
            items={items}
            /** Embla → sphere drag */
            publishDrag={(e) => { notifyDrag(e) }}
            /** Sphere (or other) → Embla drag */
            registerDragListener={registerDragListener}
            onSlideProgress={handleSlideProgress}
          />
        </div>
      )}

      {false && CONFIG.look.gradientQuality.overlay.enabled && ( // hvle: disable overlay to keep body bg unmodified
  <div
    aria-hidden
    style={{ display: 'none' }}
  />
)}
    </div>
  )
}

// keep external API compatibility if other modules import CONFIG from './Sphere'
export { CONFIG } from './Sphere.config'
