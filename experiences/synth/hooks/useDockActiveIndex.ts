import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'

type UseDockActiveIndexOptions = {
  autoActivateMs?: number
  cancelPendingRef?: MutableRefObject<() => void>
}

export const useDockActiveIndex = ({
  autoActivateMs = 300,
  cancelPendingRef,
}: UseDockActiveIndexOptions = {}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [lockedIndex, setLockedIndex] = useState<number | null>(null)

  const autoActivateTimerRef = useRef<number | null>(null)
  const hasUserInteractedRef = useRef(false)
  const lastActiveIndexRef = useRef<number | null>(null)
  const hoverIndexRef = useRef<number | null>(null)
  const lockedIndexRef = useRef<number | null>(null)

  useEffect(() => {
    hoverIndexRef.current = hoverIndex
    lockedIndexRef.current = lockedIndex
  }, [hoverIndex, lockedIndex])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleExit = () => {
      cancelPendingRef?.current?.()
    }

    const handleBlur = () => handleExit()
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        handleExit()
      }
    }

    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [cancelPendingRef])

  useEffect(() => {
    return () => {
      cancelPendingRef?.current?.()
      if (autoActivateTimerRef.current != null) {
        window.clearTimeout(autoActivateTimerRef.current)
        autoActivateTimerRef.current = null
      }
    }
  }, [])

  const activeIndex = lockedIndex ?? hoverIndex ?? lastActiveIndexRef.current
  if (activeIndex != null) {
    lastActiveIndexRef.current = activeIndex
  }

  useEffect(() => {
    autoActivateTimerRef.current = window.setTimeout(() => {
      if (
        hasUserInteractedRef.current ||
        lockedIndexRef.current != null ||
        hoverIndexRef.current != null
      ) {
        return
      }
      setHoverIndex(0)
    }, autoActivateMs)

    return () => {
      if (autoActivateTimerRef.current != null) {
        window.clearTimeout(autoActivateTimerRef.current)
        autoActivateTimerRef.current = null
      }
    }
  }, [autoActivateMs])

  const markUserInteracted = useCallback(() => {
    if (hasUserInteractedRef.current) return
    hasUserInteractedRef.current = true
    if (autoActivateTimerRef.current != null) {
      window.clearTimeout(autoActivateTimerRef.current)
      autoActivateTimerRef.current = null
    }
  }, [])

  return {
    hoverIndex,
    lockedIndex,
    activeIndex,
    setHoverIndex,
    setLockedIndex,
    markUserInteracted,
    hoverIndexRef,
    lockedIndexRef,
    lastActiveIndexRef,
  }
}
