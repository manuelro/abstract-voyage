'use client'

import React from 'react'
import Link from 'next/link'
import { SlideMeta } from './slidesFromPosts'
import { formatAbsolute, toISODateString } from '../../helpers/date'
import styles from './SlideContent.module.css'

type Props = {
  slide: Pick<SlideMeta, 'title' | 'description' | 'date' | 'tags' | 'slug'> & { link?: string } & { url?: string }
  style?: React.CSSProperties
  className?: string
}

/** φ²-calibrated hover intent timing (~262ms) + ~80ms intent buffer ≈ 340ms */
const GOLDEN = (1 + Math.sqrt(5)) / 2
const HOVER_DELAY_MS = 340 // Math.round(100 * GOLDEN * GOLDEN) + 80
const EXIT_DELAY_MS = 150  // small debounce to avoid flicker

export default function SlideContent({ slide, className }: Props) {
  const iso = slide.date ?? null
  const label = iso ? formatAbsolute(iso) : null
  const dateTime = iso ? toISODateString(iso) ?? undefined : undefined

  const href = slide.url ? slide.url : (slide.slug ? `/posts/${slide.slug}` : (slide.link || '/'))

  const [viewMode, setViewMode] = React.useState(false)

  // ---- timers / hover state ----
  const enterTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const exitTimer  = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isPointerHover, setIsPointerHover] = React.useState(false)
  const [elapsedMs, setElapsedMs] = React.useState(0)
  const rafRef = React.useRef<number | null>(null)
  const startTsRef = React.useRef<number>(0)

  const clearTimers = React.useCallback(() => {
    if (enterTimer.current) { clearTimeout(enterTimer.current); enterTimer.current = null }
    if (exitTimer.current)  { clearTimeout(exitTimer.current);  exitTimer.current  = null }
  }, [])

  const stopRAF = React.useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const startCounter = React.useCallback(() => {
    startTsRef.current = performance.now()
    setElapsedMs(0)
    stopRAF()
    const step = () => {
      const now = performance.now()
      const ms = now - startTsRef.current
      setElapsedMs(ms)
      if (ms < HOVER_DELAY_MS && !viewMode) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }, [stopRAF, viewMode])

  const handlePointerEnter = React.useCallback(() => {
    setIsPointerHover(true)
    // entering cancels any pending hide
    if (exitTimer.current) { clearTimeout(exitTimer.current); exitTimer.current = null }
    if (enterTimer.current) clearTimeout(enterTimer.current)
    // start countdown + schedule reveal
    startCounter()
    enterTimer.current = setTimeout(() => { setViewMode(true) }, HOVER_DELAY_MS)
  }, [startCounter])

  const handlePointerLeave = React.useCallback(() => {
    setIsPointerHover(false)
    stopRAF()
    setElapsedMs(0)
    // leaving cancels any pending reveal and schedules a gentle hide
    if (enterTimer.current) { clearTimeout(enterTimer.current); enterTimer.current = null }
    if (exitTimer.current)  clearTimeout(exitTimer.current)
    exitTimer.current = setTimeout(() => { setViewMode(false) }, EXIT_DELAY_MS)
  }, [stopRAF])

  // Keyboard focus should reveal immediately; blur hides with small debounce
  const handleFocus = React.useCallback(() => {
    clearTimers()
    stopRAF()
    setElapsedMs(0)
    setViewMode(true)
  }, [clearTimers, stopRAF])

  const handleBlur = React.useCallback(() => {
    if (exitTimer.current) clearTimeout(exitTimer.current)
    exitTimer.current = setTimeout(() => { setViewMode(false) }, EXIT_DELAY_MS)
  }, [])

  // Touch: show on touchstart; hide shortly after touchend/cancel
  const handleTouchStart = React.useCallback(() => {
    clearTimers()
    stopRAF()
    setElapsedMs(0)
    setViewMode(true)
  }, [clearTimers, stopRAF])

  const handleTouchEnd = React.useCallback(() => {
    if (exitTimer.current) clearTimeout(exitTimer.current)
    exitTimer.current = setTimeout(() => { setViewMode(false) }, EXIT_DELAY_MS)
  }, [])

  // Cleanup
  React.useEffect(() => () => { clearTimers(); stopRAF() }, [clearTimers, stopRAF])

  const progress = Math.min(1, elapsedMs / HOVER_DELAY_MS)
  return (
    <div
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`${styles.root} ${className || ''} ${viewMode ? styles.viewMode : ''} ${isPointerHover ? styles.pointerHover : ''}`}
      data-state={viewMode ? 'view' : 'default'}
      aria-expanded={viewMode}
    >
      <Link href={href} className={styles.link}>
        <blockquote className={`${styles.root} ${className || ''}`}>
          <div style={{ margin: 0 }}>{slide.title || 'Untitled'}</div>
          <div style={{ margin: 0 }} className={styles.footer}>
            {label ? (
              <time dateTime={dateTime}>{label}</time>
            ) : (
              <span>—</span>
            )}
            {slide.tags?.length ? (
              <span className={styles.tags}>
                {' '}•{' '}
                {slide.tags.map((t, i) => (
                  <span key={`${t}-${i}`}>{t}{i < slide.tags.length - 1 ? ' ' : ''}</span>
                ))[0]}
              </span>
            ) : null}
          </div>
        </blockquote>
      </Link>
    </div>
  )
}
