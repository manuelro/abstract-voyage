'use client'

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import EmblaCoverCarousel, { type RegisterDragListener } from './Carousel'
import styles from './Sphere.module.css'
import DragArrowsHint from './DragArrowsHint'

import { CONFIG, KEY_LOCK_ELEVATION } from './Sphere.config'
import { ease, slerpUnit } from './sphereMath'
import { NOISE_DATA_URI } from './noise'
import { makeVerticalHQGradient } from './gradients'
import SlideItem from './SlideItem'
import { quotes, descriptions, categories } from './slidesData'

// data-driven slide node (3 lines: title, description, date+tags)
import SlideContent from './SlideContent'
import type { SlideMeta } from './slidesFromPosts'

// Accept only the fields we actually render
type MarkdownSlide = Pick<SlideMeta, 'title' | 'description' | 'date' | 'tags'>

type Props = {
  /** Optional data-driven slides (from Markdown). If omitted, falls back to demo slides. */
  slidesData?: MarkdownSlide[]
}

export default function GoldenMatteSphereSoftLighting({ slidesData }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [sphereDiameterPx, setSphereDiameterPx] = useState(0)
  const [stageWidth, setStageWidth] = useState(0)
  const [showCarousel, setShowCarousel] = useState(false)

  console.log({slidesData})

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

  /* ---------------- φ-based lag + inertia ------------------------ */
  const PHI = CONFIG.layout.goldenRatio
  const START_DELAY_MS = Math.round(100 * PHI * PHI)
  const MIN_TAIL_YAW = THREE.MathUtils.degToRad(2)
  const MIN_TAIL_PITCH = THREE.MathUtils.degToRad(1.2)
  const MAX_TAIL_YAW = THREE.MathUtils.degToRad(12)
  const MAX_TAIL_PITCH = THREE.MathUtils.degToRad(7.2)

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

  const startSphereInertia = () => {
    if (prefersReducedMotion) return
    const cfg = CONFIG.behavior.inertia
    if (!cfg.enabled) return

    const r = sphereLagRef.current
    cancelSphereInertia()

    const minTail = Math.round(100 * Math.pow(PHI, 3))
    const duration = Math.max(cfg.durationMs, minTail)
    const easing = cfg.easing

    const yawRaw = r.vAz * (duration / 1000) * (cfg.scale / PHI)
    const pitchRaw = r.vPol * (duration / 1000) * (cfg.scale / (PHI * 1.4))

    const withMin = (val: number, minAbs: number) =>
      Math.sign(val || 1) * Math.max(minAbs, Math.abs(val))

    let azAmp = withMin(yawRaw, MIN_TAIL_YAW)
    let polAmp = withMin(pitchRaw, MIN_TAIL_PITCH)
    azAmp = THREE.MathUtils.clamp(azAmp, -MAX_TAIL_YAW, MAX_TAIL_YAW)
    polAmp = THREE.MathUtils.clamp(polAmp, -MAX_TAIL_PITCH, MAX_TAIL_PITCH)

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

  // Unified drag from carousel → sphere/light
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

      const ALPHA = 0.35
      const instVAz = dAz / dt
      const instVPol = dPol / dt
      lag.vAz = lag.vAz * (1 - ALPHA) + instVAz * ALPHA
      lag.vPol = lag.vPol * (1 - ALPHA) + instVPol * ALPHA

      lag.lastDAz = dAz
      lag.lastDPol = dPol

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
      if (lag.startTimer != null) {
        window.clearTimeout(lag.startTimer)
        lag.startTimer = null
        lag.lagActive = false
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
      return
    }
  }, [prefersReducedMotion])

  // Embla slide progress → inertia
  type SlideProgressEvent = { phase: 'start' | 'move' | 'end'; deltaSlides: number }
  const handleSlideProgress = useCallback((e: SlideProgressEvent) => {
    if (e.phase === 'start') {
      cancelSphereInertia()
      return
    }
    if (e.phase === 'end') {
      startSphereInertia()
    }
  }, [])

  // Subscribe sphere to the shared drag bus (so it reacts to carousel drags)
  useEffect(() => {
    const unsubscribe = registerDragListener(handleCarouselDrag)
    return unsubscribe
    // registerDragListener is stable enough for mount-time subscription
  }, [handleCarouselDrag])

  // --------------------- Three.js setup & loop --------------------
  useEffect(() => {
    let running = true
    const container = mountRef.current!
    lightUserLatchRef.current = true

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

    // Bridge canvas pointer → shared drag bus
    const el = renderer.domElement
    let px = 0, py = 0, dragging = false

    const onDown = (ev: PointerEvent) => {
      dragging = true
      px = ev.clientX; py = ev.clientY
      el.setPointerCapture?.(ev.pointerId)
      notifyDrag({ phase: 'start', dx: 0, dy: 0 })
    }
    const onMove = (ev: PointerEvent) => {
      if (!dragging) return
      const dx = ev.clientX - px
      const dy = ev.clientY - py
      px = ev.clientX; py = ev.clientY
      notifyDrag({ phase: 'move', dx, dy })
    }
    const onUp = (ev: PointerEvent) => {
      if (!dragging) return
      dragging = false
      el.releasePointerCapture?.(ev.pointerId)
      notifyDrag({ phase: 'end', dx: 0, dy: 0 })
    }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)

    // Scene / Camera
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      CONFIG.camera.fov,
      container.clientWidth / container.clientHeight,
      CONFIG.camera.near,
      CONFIG.camera.far
    )
    camera.position.set(...CONFIG.camera.position)
    camera.lookAt(0, 0, 0)

    // Lights
    scene.add(new THREE.AmbientLight(CONFIG.lights.ambient.color as any, CONFIG.lights.ambient.intensity))
    const hemi = new THREE.HemisphereLight(
      CONFIG.lights.hemisphere.sky as any,
      CONFIG.lights.hemisphere.ground as any,
      CONFIG.lights.hemisphere.intensity
    )
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

      // Intro & carousel fade-in alignment
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

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
          setShowCarousel(true)
        } else {
          setLightFromAz(azOf(introStartDir))
          introActive = true
          // IMPORTANT: restore original start timing — intro begins right now
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

    // FILL
    const softFill = new THREE.RectAreaLight(
      CONFIG.lights.rectFill.color as any,
      CONFIG.lights.rectFill.intensity,
      CONFIG.lights.rectFill.size.width,
      CONFIG.lights.rectFill.size.height
    )
    softFill.position.set(...CONFIG.lights.rectFill.position)
    softFill.lookAt(0, 0, 0)
    scene.add(softFill)

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
      setSphereDiameterPx(targetDiameterPx)
    }

    fitSphereToGoldenRatio()
    const onResize = () => fitSphereToGoldenRatio()
    window.addEventListener('resize', onResize)

    // Intro + controls + auto-align + render
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

      lightAnglesRef.current = { az: targetAz, pol }
      lightRadiusRef.current = introLightRadius

      if (t >= 1) introActive = false
    }

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

    const loop = () => {
      if (!running) return
      applyIntro()
      ;(controlsRef.current as any)?.update?.()
      applyLightAutoAlign()
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

      // remove pointer bridge
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
  const top = CONFIG.theme.backgroundTop
  const bottom = CONFIG.theme.backgroundBottom
  const bg = makeVerticalHQGradient(top, bottom, CONFIG.look.gradientQuality.extraStopsEnabled)

  const prefersReducedRender =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  // Items from optional data OR fallback demo slides
  const items = useMemo(() => {
    if (slidesData && slidesData.length > 0) {
      return slidesData.map((s, i) => (
        <SlideContent key={`md-${i}`} slide={s} />
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

  return (
    <div className={styles.stage} data-sphere-page>
      <div ref={mountRef} className={styles.mount} style={{ background: bg }} />

      {/* Optional small helper/hint */}
      <DragArrowsHint visible={true} offsetPx={0} />

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

      {CONFIG.look.gradientQuality.overlay.enabled && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: NOISE_DATA_URI,
            backgroundRepeat: 'repeat',
            backgroundSize: `${CONFIG.look.gradientQuality.overlay.sizePx}px ${CONFIG.look.gradientQuality.overlay.sizePx}px`,
            mixBlendMode: CONFIG.look.gradientQuality.overlay.blendMode,
            opacity: CONFIG.look.gradientQuality.overlay.opacity,
            zIndex: 6,
            willChange: 'opacity',
          }}
        />
      )}
    </div>
  )
}

// keep external API compatibility if other modules import CONFIG from './Sphere'
export { CONFIG } from './Sphere.config'
