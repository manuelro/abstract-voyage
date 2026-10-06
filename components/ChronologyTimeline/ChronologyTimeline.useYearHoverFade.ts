import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Drives which year section stays at full opacity while every other year
 * dims. Fine-pointer devices get the obvious thing: `hoveredYearKey` from
 * mouseenter/mouseleave on the year's own container. Coarse-pointer/no-hover
 * devices (touch) have no equivalent gesture, so — only when
 * `touchFallbackEnabled` opts in — once the visitor starts scrolling we fall
 * back to whichever year section has crossed a line near the top of the
 * viewport, the same "current section" signal a scrollspy nav uses. That
 * fallback only starts computing after a real scroll event (never on initial
 * mount), so nothing is dimmed before the visitor acts.
 *
 * touchFallbackEnabled defaults to an operator opt-in (off), not on: the
 * scroll-driven approximation of "hover" read as unreliable in practice
 * (operator-reported) — hover/mouseenter-mouseleave on desktop is unaffected
 * either way, since that path never touches this scroll listener.
 */
export function useChronologyYearHoverFade(enabled: boolean, touchFallbackEnabled: boolean) {
  const [hoveredYearKey, setHoveredYearKey] = useState<string | null>(null)
  const [scrollActiveYearKey, setScrollActiveYearKey] = useState<string | null>(null)
  const yearRefs = useRef(new Map<string, HTMLElement>())

  const registerYearRef = useCallback((key: string) => (element: HTMLElement | null) => {
    if (element) yearRefs.current.set(key, element)
    else yearRefs.current.delete(key)
  }, [])

  useEffect(() => {
    if (!enabled || !touchFallbackEnabled) { setScrollActiveYearKey(null); return }
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    // No sustained hover available on touch — track scroll position instead.
    if (!window.matchMedia('(hover: none), (pointer: coarse)').matches) return
    let frame = 0
    const update = () => {
      frame = 0
      const thresholdY = window.innerHeight * 0.3
      let activeKey: string | null = null
      yearRefs.current.forEach((element, key) => {
        if (element.getBoundingClientRect().top <= thresholdY) activeKey = key
      })
      setScrollActiveYearKey(activeKey)
    }
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [enabled, touchFallbackEnabled])

  return {
    activeYearKey: hoveredYearKey ?? scrollActiveYearKey,
    setHoveredYearKey,
    registerYearRef,
  }
}
