'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  /** Carousel width/height in px (must be finite positive numbers) */
  widthPx: number
  heightPx: number

  /** Arrow size (square, px) */
  sizePx?: number

  /** Distance between arrow centers (px); default ≈ 3× size, min ≈ 2.4× size */
  spacingPx?: number

  /** Y placement: percentage up from the bottom of the carousel (0..1). 0.38 = 38% */
  arrowBottomPct?: number

  /** Proximity circle growth (0.38 = +38%) */
  outerGrowPct?: number

  /** Minimum visual opacity (0..1); 0.38 = 38% */
  minOpacityPct?: number

  /** Click handlers */
  onPrev?: () => void
  onNext?: () => void

  /** Stacking context */
  zIndex?: number

  /** Optional DOM mouse enter/leave on the container band */
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>

  /**
   * Pointer-events behavior of the container band.
   * 'none' (default) won't block interactions underneath and won't fire DOM mouseenter.
   * 'auto' will fire onMouseEnter/onMouseLeave but will intercept pointer events in the band.
   */
  containerPointerEvents?: 'none' | 'auto'
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export default function ProximityArrows({
  widthPx,
  heightPx,
  sizePx = 28,
  spacingPx,
  arrowBottomPct = 0.38, // 38% from bottom
  outerGrowPct = 0.38,   // +38% active/proximity circle
  minOpacityPct = 0.38,  // 38% minimum opacity
  onPrev,
  onNext,
  zIndex = 8,
  containerPointerEvents = 'none',
  onMouseEnter,
  onMouseLeave,
}: Props) {
  // Guard against undefined/NaN/strings/zero to avoid NaN in styles
  if (!isFiniteNum(widthPx) || !isFiniteNum(heightPx) || widthPx <= 0 || heightPx <= 0) {
    return null
  }

  const containerRef = useRef<HTMLDivElement | null>(null)
  const leftRef = useRef<HTMLDivElement | null>(null)
  const rightRef = useRef<HTMLDivElement | null>(null)

  const MIN_OP = clamp01(minOpacityPct)

  const [opL, setOpL] = useState(MIN_OP)
  const [opR, setOpR] = useState(MIN_OP)

  // --- placement (carousel-local) ---
  const SPACING = useMemo(
    () => Math.max(sizePx * 2.4, isFiniteNum(spacingPx) ? spacingPx! : sizePx * 3),
    [sizePx, spacingPx]
  )
  const cxL = Math.round(widthPx / 2 - SPACING / 2)
  const cxR = Math.round(widthPx / 2 + SPACING / 2)
  const cy = Math.round(heightPx * (1 - clamp01(arrowBottomPct))) // e.g., 62% from top when 0.38 from bottom

  // --- proximity model ---
  const baseR = sizePx / 2
  const outerR = Math.max(baseR + 1, baseR * (1 + outerGrowPct))

  // cache last pointer; rAF throttle updates
  const lastPointer = useRef<{ x: number; y: number } | null>(null)
  const rafId = useRef<number | null>(null)

  const scheduleUpdate = (clientX: number, clientY: number) => {
    lastPointer.current = { x: clientX, y: clientY }
    if (rafId.current != null) return
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null
      const LRect = leftRef.current?.getBoundingClientRect()
      const RRect = rightRef.current?.getBoundingClientRect()
      const CRect = containerRef.current?.getBoundingClientRect()
      if (!CRect || !lastPointer.current) return

      // Prefer measuring actual button centers; fallback to math with container rect.
      const Lx = LRect ? LRect.left + LRect.width / 2 : CRect.left + cxL
      const Ly = LRect ? LRect.top + LRect.height / 2 : CRect.top + cy
      const Rx = RRect ? RRect.left + RRect.width / 2 : CRect.left + cxR
      const Ry = RRect ? RRect.top + RRect.height / 2 : CRect.top + cy

      const { x, y } = lastPointer.current
      const dL = Math.hypot(x - Lx, y - Ly)
      const dR = Math.hypot(x - Rx, y - Ry)

      // Linear ramp: 0 at outer boundary → 1 at arrow edge → 1 inside arrow.
      const ramp = (d: number) => {
        if (d <= baseR) return 1
        if (d >= outerR) return 0
        return (outerR - d) / (outerR - baseR)
      }

      // Apply 38% floor
      const oL = MIN_OP + (1 - MIN_OP) * ramp(dL)
      const oR = MIN_OP + (1 - MIN_OP) * ramp(dR)

      // small hysteresis
      setOpL((p) => (Math.abs(p - oL) > 0.01 ? oL : p))
      setOpR((p) => (Math.abs(p - oR) > 0.01 ? oR : p))
    })
  }

  // Global tracking — proximity reacts as you approach
  useEffect(() => {
    const onMove = (e: MouseEvent | PointerEvent) =>
      scheduleUpdate((e as MouseEvent).clientX, (e as MouseEvent).clientY)

    const onLeaveWin = () => {
      lastPointer.current = null
      setOpL(MIN_OP)
      setOpR(MIN_OP)
    }

    const onVisibility = () => {
      if (document.hidden) onLeaveWin()
    }

    const onScroll = () => {
      if (lastPointer.current) scheduleUpdate(lastPointer.current.x, lastPointer.current.y)
    }

    window.addEventListener('mousemove', onMove as any, { passive: true })
    window.addEventListener('pointermove', onMove as any, { passive: true })
    window.addEventListener('mouseleave', onLeaveWin as any, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('mousemove', onMove as any)
      window.removeEventListener('pointermove', onMove as any)
      window.removeEventListener('mouseleave', onLeaveWin as any)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('scroll', onScroll)
      if (rafId.current != null) cancelAnimationFrame(rafId.current)
    }
  }, [MIN_OP])

  // Re-evaluate on layout changes
  useEffect(() => {
    if (lastPointer.current) scheduleUpdate(lastPointer.current.x, lastPointer.current.y)
    else {
      setOpL(MIN_OP)
      setOpR(MIN_OP)
    }
    // Intentionally not depending on scheduleUpdate ref values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widthPx, heightPx, sizePx, SPACING, cxL, cxR, cy, baseR, outerR, MIN_OP])

  if (widthPx <= 0 || heightPx <= 0) return null

  const Arrow = ({
    dir,
    opacity,
    onPress,
    refCb,
  }: {
    dir: 'left' | 'right'
    opacity: number
    onPress?: () => void
    refCb: (el: HTMLDivElement | null) => void
  }) => (
    <div
      ref={refCb}
      role="button"
      tabIndex={0}
      aria-label={dir === 'left' ? 'Previous slide' : 'Next slide'}
      onClick={onPress}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onPress?.()
        }
      }}
      style={{
        position: 'absolute',
        left: dir === 'left' ? cxL : cxR,
        top: cy,
        transform: 'translate(-50%, -50%)',
        width: sizePx,
        height: sizePx,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Math.ceil(sizePx / 2),
        color: 'rgb(255,255,255)', // full color; visual opacity controlled by 'opacity'
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.0)',
        userSelect: 'none',
        pointerEvents: 'auto',
        cursor: 'pointer',
        outline: 'none',
        opacity, // 0.38 .. 1.0
        transition: 'opacity 80ms linear',
        willChange: 'opacity',
      }}
    >
      {dir === 'left' ? (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden focusable="false">
          <path
            d="M15.5 4.5L8.5 11.5L15.5 18.5"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden focusable="false">
          <path
            d="M8.5 4.5L15.5 11.5L8.5 18.5"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  )

  return (
    <div
      ref={containerRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: widthPx,
        height: heightPx,
        pointerEvents: containerPointerEvents, // 'none' keeps the band non-blocking
        zIndex,
      }}
    >
      <Arrow dir="left" opacity={opL} onPress={onPrev} refCb={(el) => (leftRef.current = el)} />
      <Arrow dir="right" opacity={opR} onPress={onNext} refCb={(el) => (rightRef.current = el)} />
    </div>
  )
}
