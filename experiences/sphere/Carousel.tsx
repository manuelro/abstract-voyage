'use client'

import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import styles from './Carousel.module.css'
import { CAROUSEL_VIS } from './carouselVisibility'

type DragEvent = { phase: 'start' | 'move' | 'end'; dx: number; dy: number }
type Unsubscribe = () => void
export type RegisterDragListener = (listener: (e: DragEvent) => void) => Unsubscribe

type SlideProgressEvent = { phase: 'start' | 'move' | 'end'; deltaSlides: number }

type Props = {
  diameterPx: number
  viewportWidth: number
  items: React.ReactNode[]
  registerDragListener: RegisterDragListener
  publishDrag?: (e: DragEvent) => void
  onSlideProgress?: (e: SlideProgressEvent) => void
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))

const SCALE_MIN = 1
const SCALE_MAX = 1
const OPACITY_MIN = 0
const OPACITY_MAX = 1

const PHI = (1 + Math.sqrt(5)) / 2
const FRAC_A = 1 - 1 / PHI
const FRAC_B = 1 / PHI

export default function Carousel({
  diameterPx,
  viewportWidth,
  items,
  registerDragListener,
  publishDrag,
  onSlideProgress,
}: Props) {
  const [emblaRef, embla] = useEmblaCarousel({
    loop: true,
    align: 'center',
    containScroll: 'trimSnaps',
    dragFree: false,
  })

  const data = useMemo(() => items, [items])
  const COUNT = data.length

  // Layout (square card == sphere diameter)
  const mainW = Math.max(0, Math.floor(diameterPx))
  const trackH = mainW
  const desiredViewportW = mainW * 3
  const viewportW = Math.max(0, Math.floor(Math.min(viewportWidth || desiredViewportW, desiredViewportW)))
  const padPx = Math.max(12, Math.floor(mainW * 0.06))

  // State
  const [activeIdx, setActiveIdx] = useState(0)
  const [prevActiveIdx, setPrevActiveIdx] = useState(0)
  const lastSelectedRef = useRef(0)

  const [scales, setScales] = useState<number[]>(() => Array(COUNT).fill(1))
  const [opacities, setOpacities] = useState<number[]>(() => Array(COUNT).fill(1))

  const [fadeSuppressed, setFadeSuppressed] = useState(false)
  const interactionCountRef = useRef(0)
  const scrollActiveRef = useRef(false)
  const settleTimerRef = useRef<number | null>(null)
  const scrollIdleTimerRef = useRef<number | null>(null)

  const SCROLL_IDLE_MS = 180

  const setSuppressed = (value: boolean) => {
    setFadeSuppressed((prev) => (prev === value ? prev : value))
  }
  const recomputeSuppressed = () => {
    setSuppressed(interactionCountRef.current > 0 || scrollActiveRef.current)
  }

  // Measure real content height per slide to unify the "top line"
  const contentRefs = useRef<(HTMLDivElement | null)[]>([])
  const [contentBoxHeight, setContentBoxHeight] = useState<number>(0)
  const contentBoxHeightRef = useRef<number>(0)
  const contentHeightLockedRef = useRef<boolean>(false)

  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const viewportElRef = useRef<HTMLDivElement | null>(null)

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  // ----- Embla bindings -----
  const gestureStartProgressRef = useRef<number | null>(null)
  const lastDeltaSlidesRef = useRef<number>(0)
  const [blockedActiveIdx, setBlockedActiveIdx] = useState<number | null>(null)
  const gestureActiveRef = useRef<boolean>(false)
  const endEmittedRef = useRef<boolean>(false)
  const hasMountedRef = useRef<boolean>(false)

  useEffect(() => {
    if (!embla) return

    const slidesPerTrack = () => Math.max(1, embla.scrollSnapList().length - 1)

    const onSelect = () => {
      const newIdx = embla.selectedScrollSnap()
      setPrevActiveIdx(lastSelectedRef.current)
      setActiveIdx(newIdx)

      if (!hasMountedRef.current) {
        setBlockedActiveIdx(null)
        hasMountedRef.current = true
      } else {
        const isSuppressedNow = interactionCountRef.current > 0 || scrollActiveRef.current
        setBlockedActiveIdx(isSuppressedNow ? newIdx : null)
      }

      lastSelectedRef.current = newIdx

      onSlideProgress?.({ phase: 'end', deltaSlides: lastDeltaSlidesRef.current })
      endEmittedRef.current = true
      gestureActiveRef.current = false
      gestureStartProgressRef.current = embla.scrollProgress()
      lastDeltaSlidesRef.current = 0
      scheduleRecompute()
    }

    const onPointerDown = () => {
      gestureStartProgressRef.current = embla.scrollProgress()
      lastDeltaSlidesRef.current = 0
      onSlideProgress?.({ phase: 'start', deltaSlides: 0 })
      gestureActiveRef.current = true
      endEmittedRef.current = false

      interactionCountRef.current++
      if (settleTimerRef.current != null) {
        window.clearTimeout(settleTimerRef.current)
        settleTimerRef.current = null
      }
      setSuppressed(true)
    }

    const onScroll = () => {
      scheduleRecompute()

      if (interactionCountRef.current > 0) {
        scrollActiveRef.current = true
        if (scrollIdleTimerRef.current != null) {
          window.clearTimeout(scrollIdleTimerRef.current)
        }
        scrollIdleTimerRef.current = window.setTimeout(() => {
          scrollActiveRef.current = false
          recomputeSuppressed()
          scrollIdleTimerRef.current = null
        }, SCROLL_IDLE_MS)
        setSuppressed(true)
      }

      const start = gestureStartProgressRef.current
      if (start == null) return
      const cur = embla.scrollProgress()
      let diff = cur - start
      if (diff > 0.5) diff -= 1
      else if (diff < -0.5) diff += 1
      const deltaSlides = diff * slidesPerTrack()
      lastDeltaSlidesRef.current = deltaSlides
      onSlideProgress?.({ phase: 'move', deltaSlides })
    }

    embla.on('select', onSelect)
    embla.on('reInit', onSelect)
    embla.on('pointerDown', onPointerDown)
    embla.on('scroll', onScroll)

    // init
    lastSelectedRef.current = embla.selectedScrollSnap()
    onSelect()
    scheduleRecompute()

    return () => {
      embla.off('select', onSelect)
      embla.off('reInit', onSelect)
      embla.off('pointerDown', onPointerDown)
      embla.off('scroll', onScroll)
    }
  }, [embla, onSlideProgress])

  useEffect(() => {
    if (!fadeSuppressed && blockedActiveIdx != null) {
      setBlockedActiveIdx(null)
    }
  }, [fadeSuppressed, blockedActiveIdx])

  useEffect(() => {
    const unsub = registerDragListener?.(() => {})
    return () => {
      try { unsub && unsub() } catch {}
    }
  }, [registerDragListener])

  const setViewportEl = (el: HTMLDivElement | null) => {
    emblaRef(el)
    viewportElRef.current = el
  }

  // ----- Scale/opacity + unified top-line height -----
  const recomputeMetrics = () => {
    const vp = viewportElRef.current
    if (!vp) return

    const vpRect = vp.getBoundingClientRect()
    const circleCenterX = vpRect.left + vpRect.width / 2
    const R = mainW / 2
    const circleLeft = circleCenterX - R
    const circleRight = circleCenterX + R

    const newScales: number[] = []
    const newOpacities: number[] = []

    let maxUnscaledContentH = 0

    data.forEach((_, i) => {
      const slideEl = slideRefs.current[i]
      if (!slideEl) {
        newScales[i] = SCALE_MIN
        newOpacities[i] = OPACITY_MIN
        return
      }

      const r = slideEl.getBoundingClientRect()
      const overlap = Math.max(0, Math.min(r.right, circleRight) - Math.max(r.left, circleLeft))
      const fracInside = clamp(overlap / Math.max(1, r.width), 0, 1)

      // --- CENTRALIZED VISIBILITY MAPPING ---
      const { cutoffFrac, power, minOpacity } = CAROUSEL_VIS
      const t = Math.max(0, (fracInside - cutoffFrac) / Math.max(1e-6, 1 - cutoffFrac)) // 0..1 after cutoff
      const curved = Math.pow(t, Math.max(1, power))
      const o = (fracInside <= cutoffFrac)
        ? 0
        : minOpacity + (1 - minOpacity) * curved
      // --------------------------------------

      const s = SCALE_MIN + (SCALE_MAX - SCALE_MIN) * fracInside
      newScales[i] = clamp(s, SCALE_MIN, SCALE_MAX)
      newOpacities[i] = clamp(o, OPACITY_MIN, OPACITY_MAX)

      if (!contentHeightLockedRef.current) {
        const contentEl = contentRefs.current[i]
        if (contentEl) {
          const rect = contentEl.getBoundingClientRect()
          const unscaled = rect.height / (newScales[i] || 1)
          if (unscaled > maxUnscaledContentH) maxUnscaledContentH = unscaled
        }
      }
    })

    setScales(newScales)
    setOpacities(newOpacities)

    if (!contentHeightLockedRef.current) {
      const desired = Math.ceil(maxUnscaledContentH + padPx * 2)
      if (desired && Math.abs(desired - contentBoxHeightRef.current) > 0.5) {
        contentBoxHeightRef.current = desired
        setContentBoxHeight(desired)
      }
    }
  }

  const rafId = useRef<number | null>(null)
  const scheduleRecompute = () => {
    if (rafId.current != null) return
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null
      recomputeMetrics()
    })
  }

  useLayoutEffect(() => {
    contentHeightLockedRef.current = false

    // First measure
    let maxH = 0
    for (let i = 0; i < contentRefs.current.length; i++) {
      const el = contentRefs.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (rect.height > maxH) maxH = rect.height
    }
    const desired = Math.ceil(maxH + padPx * 2)
    if (desired) {
      contentBoxHeightRef.current = desired
      setContentBoxHeight(desired)
    }

    contentHeightLockedRef.current = true
    recomputeMetrics()
  }, [COUNT, mainW, trackH, padPx])

  // Optional raw pointer delta publish + interaction gate
  const last = useRef<{ x: number; y: number } | null>(null)
  const onViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (settleTimerRef.current != null) {
      window.clearTimeout(settleTimerRef.current)
      settleTimerRef.current = null
    }
    interactionCountRef.current++
    setSuppressed(true)

    last.current = { x: e.clientX, y: e.clientY }
    publishDrag?.({ phase: 'start', dx: 0, dy: 0 })
  }
  const onViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!last.current) return
    const dx = (e.clientX - last.current.x) || 0
    const dy = (e.clientY - last.current.y) || 0
    last.current = { x: e.clientX, y: e.clientY }
    publishDrag?.({ phase: 'move', dx, dy })
  }
  const endGesture = () => {
    last.current = null
    publishDrag?.({ phase: 'end', dx: 0, dy: 0 })

    if (gestureActiveRef.current && !endEmittedRef.current) {
      onSlideProgress?.({ phase: 'end', deltaSlides: lastDeltaSlidesRef.current })
    }

    interactionCountRef.current = Math.max(0, interactionCountRef.current - 1)
    scrollActiveRef.current = false
    if (scrollIdleTimerRef.current != null) {
      window.clearTimeout(scrollIdleTimerRef.current)
      scrollIdleTimerRef.current = null
    }
    if (settleTimerRef.current != null) {
      window.clearTimeout(settleTimerRef.current)
      settleTimerRef.current = null
    }
    setSuppressed(false)
    setBlockedActiveIdx(null)

    gestureActiveRef.current = false
    endEmittedRef.current = false
    lastDeltaSlidesRef.current = 0
    gestureStartProgressRef.current = null
  }
  const onViewportPointerUp = () => { endGesture() }
  const onViewportPointerCancel = () => { endGesture() }

  if (viewportW <= 0 || trackH <= 0) return null

  const attachResetClass = (node: React.ReactNode) => {
    if (React.isValidElement(node)) {
      const prev = (node.props as any)?.className || ''
      return React.cloneElement(node as React.ReactElement<any>, {
        className: [prev, styles.root].filter(Boolean).join(' '),
      })
    }
    return node
  }

  const handleSlideActivate = (i: number) => {
    if (!embla) return
    if (i === activeIdx) return
    if ('clickAllowed' in embla && typeof (embla as any).clickAllowed === 'function') {
      if (!(embla as any).clickAllowed()) return
    }
    embla.scrollTo(i)
  }
  const handleSlideKeyDown = (i: number) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSlideActivate(i)
    }
  }

  // Slides
  const slides = useMemo(
    () =>
      data.map((node, i) => {
        const widthPx = mainW
        const scale = scales[i] ?? SCALE_MIN
        const opacity = opacities[i] ?? OPACITY_MIN
        const content = attachResetClass(node)

        const isActive = i === activeIdx
        const isPrevActive = i === prevActiveIdx
        const interactive = !isActive

        const L2_TARGET_ENTER = '0.62'
        const L3_TARGET_ENTER = '0.62'
        const L2_TARGET_EXIT = '0'
        const L3_TARGET_EXIT = '0'
        const L_TARGET_IDLE = '0'

        const dA = `calc(var(--fade-duration, 1600ms) * ${FRAC_A.toFixed(3)})`
        const dB = `calc(var(--fade-duration, 1600ms) * ${FRAC_B.toFixed(3)})`

        const allowEnter =
          isActive &&
          (prefersReduced || !fadeSuppressed || blockedActiveIdx !== i)

        const l2Target = allowEnter ? L2_TARGET_ENTER : isPrevActive ? L2_TARGET_EXIT : L_TARGET_IDLE
        const l3Target = allowEnter ? L3_TARGET_ENTER : isPrevActive ? L3_TARGET_EXIT : L_TARGET_IDLE

        const l2Delay = allowEnter ? '0ms' : isPrevActive ? dA : '0ms'
        const l3Delay = allowEnter ? dB : isPrevActive ? '0ms' : '0ms'

        const slideVars: React.CSSProperties = {
          ['--l2-target' as any]: l2Target,
          ['--l3-target' as any]: l3Target,
          ['--l2-delay' as any]: l2Delay,
          ['--l3-delay' as any]: l3Delay,
          ['--links-visible' as any]: isActive ? 'visible' : 'hidden',
          ['--links-pe' as any]: isActive ? 'auto' : 'none',
        }

        // === Compute band above the first line of content (inside the 1:1 card) ===
        const cardH = trackH
        const contentH = contentBoxHeight ? contentBoxHeight : cardH
        const contentTopPx = cardH / 2 - (contentH * scale) / 2 + padPx * scale

        return (
          <div
            key={`slide-${i}`}
            ref={(el) => (slideRefs.current[i] = el)}
            style={{
              position: 'relative',
              flex: `0 0 ${widthPx}px`,
              width: widthPx,
              height: trackH,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              transition: 'none',
              ...slideVars,
            }}
          >
            {/* Square card */}
            <div
              onClick={interactive ? () => handleSlideActivate(i) : undefined}
              onKeyDown={interactive ? handleSlideKeyDown(i) : undefined}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : -1}
              aria-label={interactive ? 'Go to this slide' : undefined}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1 / 1',
                margin: '0 auto',
                borderRadius: 16,
                overflow: 'hidden',
                boxSizing: 'border-box',
                border: '1px solid rgba(255,255,255,0.0)',
                background: 'none',
                backdropFilter: 'none',
                transition: 'border-color 200ms ease',
                cursor: interactive ? 'pointer' : 'default',
                outline: 'none',
              }}
            >
              {/* Bounds */}
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {/* OUTER: center/center container (unscaled), height == shared content-box height */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '100%',
                    height: contentBoxHeight ? contentBoxHeight : '100%',
                    pointerEvents: 'none',
                  }}
                >
                  {/* INNER: scaler with top-center pivot; content top-aligned inside fixed-height box */}
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      padding: padPx,
                      transform: `scale(${scale})`,
                      transformOrigin: 'top center',
                      opacity,
                      transition: prefersReduced ? 'none' : 'transform 100ms linear, opacity 100ms linear',
                      willChange: 'transform, opacity',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      textAlign: 'center',
                      background: 'none',
                      border: 'none',
                    }}
                  >
                    {/* Measured content */}
                    <div
                      ref={(el) => (contentRefs.current[i] = el)}
                      style={{
                        width: '100%',
                        fontSize: '1rem',
                        lineHeight: 1.5,
                        color: 'rgba(255,255,255,0.92)',
                        fontWeight: 500,
                        letterSpacing: 0.2,
                        marginTop: 0,
                        background: 'none',
                        border: 'none',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none',
                        WebkitTouchCallout: 'none',
                        pointerEvents: 'var(--links-pe, none)',
                      }}
                    >
                      {content}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }),
    [
      data,
      scales,
      opacities,
      mainW,
      trackH,
      contentBoxHeight,
      padPx,
      prefersReduced,
      activeIdx,
      prevActiveIdx,
      fadeSuppressed,
      blockedActiveIdx,
      embla,
    ]
  )

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured carousel"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: viewportW,
        height: trackH,
        transform: 'translate(-50%, -50%)',
        zIndex: 5,
        pointerEvents: 'auto',
        ['--fade-duration' as any]: fadeSuppressed ? '0ms' : undefined,
      }}
    >
      <div
        ref={setViewportEl}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={onViewportPointerUp}
        onPointerCancel={onViewportPointerCancel}
        style={{
          overflow: 'hidden',
          width: '100%',
          height: '100%',
          clipPath: 'inset(0)',
        }}
      >
        <div style={{ display: 'flex', height: '100%' }}>{slides}</div>
      </div>
    </div>
  )
}
