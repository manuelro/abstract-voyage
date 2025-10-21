'use client'
import React, { useEffect, useMemo, useState } from 'react'
import styles from './DragArrowsHint.module.css'
import { ARROWS_TIMING, GOLDEN } from './Sphere.config'

type Props = {
  visible: boolean
  /** Distance from center to each arrow; if 0/undefined we compute from viewport + φ */
  offsetPx?: number
  size?: number
  zIndex?: number
}

const DragArrowsHint: React.FC<Props> = ({ visible, offsetPx, size = 28, zIndex = 20 }) => {
  // Fallback offset: derive from vmin/φ so arrows sit just inside the sphere edge.
  const [fallbackOffset, setFallbackOffset] = useState<number>(0)
  useEffect(() => {
    const measure = () => {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 0
      const vh = typeof window !== 'undefined' ? window.innerHeight : 0
      const d = Math.min(vw, vh) / GOLDEN // sphere diameter heuristic
      const pad = Math.max(18, Math.min(42, d * 0.08))
      const off = Math.max(14, Math.round(d / 2 - pad))
      setFallbackOffset(off)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  const dur = prefersReduced ? ARROWS_TIMING.durationsMsReduced : ARROWS_TIMING.durationsMs
  const off = Math.max(0, Math.floor((offsetPx ?? 0) || fallbackOffset))
  const dim = Math.max(16, Math.floor(size || 28))

  const styleVars = useMemo(
    () =>
      ({
        ['--arrow-offset' as any]: `${off}px`,
        ['--arrow-size' as any]: `${dim}px`,
        ['--z' as any]: zIndex,

        // Timings as CSS time vars
        ['--arw-start' as any]: `${ARROWS_TIMING.startDelayMs}ms`,
        ['--arw-enter' as any]: `${dur.enter}ms`,
        ['--arw-hold' as any]: `${dur.hold}ms`,
        ['--arw-fade' as any]: `${dur.fade}ms`,
        ['--arw-gap' as any]: `${dur.gap}ms`,

        // Easings
        ['--ease-out-exp' as any]: ARROWS_TIMING.easing.enterOut,
        ['--ease-in-exp' as any]: ARROWS_TIMING.easing.exitIn,

        // Visual alpha
        ['--arrow-alpha' as any]: 0.88,
      }) as React.CSSProperties,
    [off, dim, zIndex, dur.enter, dur.hold, dur.fade, dur.gap]
  )

  return (
    <div
      aria-hidden
      className={[styles.wrap, visible ? styles.visible : styles.hidden].join(' ')}
      style={styleVars}
    >
      <div className={[styles.arrow, styles.left].join(' ')} />
      <div className={[styles.arrow, styles.right].join(' ')} />
    </div>
  )
}

export default DragArrowsHint
