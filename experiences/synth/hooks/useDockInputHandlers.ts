import { useCallback, useEffect, useMemo, useRef, type PointerEvent, type WheelEvent } from 'react'

const supportsHover = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: hover)').matches
}

type DockInputHandlersOptions = {
  itemsLength: number
  markUserInteracted: () => void
  hoverIndexRef: React.MutableRefObject<number | null>
  lockedIndexRef: React.MutableRefObject<number | null>
  lastActiveIndexRef: React.MutableRefObject<number | null>
  setHoverIndex: (index: number | null) => void
  setLockedIndex: (index: number | null) => void
  invertTouchSwipe?: boolean
  cancelPendingRef?: React.MutableRefObject<() => void>
}

export const useDockInputHandlers = ({
  itemsLength,
  markUserInteracted,
  hoverIndexRef,
  lockedIndexRef,
  lastActiveIndexRef,
  setHoverIndex,
  setLockedIndex,
  invertTouchSwipe = false,
  cancelPendingRef,
}: DockInputHandlersOptions) => {
  const rafRef = useRef<number | null>(null)
  const pendingIndexRef = useRef<number | null>(null)
  const wheelAccumRef = useRef(0)
  const touchAccumRef = useRef(0)
  const touchLastYRef = useRef<number | null>(null)
  const touchActiveRef = useRef(false)

  const cancelPendingHover = useCallback(() => {
    pendingIndexRef.current = null
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    touchActiveRef.current = false
    touchLastYRef.current = null
    touchAccumRef.current = 0
  }, [])

  useEffect(() => {
    if (cancelPendingRef) {
      cancelPendingRef.current = cancelPendingHover
    }
  }, [cancelPendingRef, cancelPendingHover])

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])

  const clampIndex = useCallback(
    (index: number) => Math.max(0, Math.min(itemsLength - 1, index)),
    [itemsLength],
  )

  const getActiveIndex = useCallback(
    () =>
      lockedIndexRef.current ??
      hoverIndexRef.current ??
      lastActiveIndexRef.current ??
      0,
    [hoverIndexRef, lastActiveIndexRef, lockedIndexRef],
  )

  const setActiveIndex = useCallback(
    (index: number) => {
      if (lockedIndexRef.current != null) {
        setLockedIndex(index)
        return
      }
      setHoverIndex(index)
    },
    [lockedIndexRef, setHoverIndex, setLockedIndex],
  )

  const stepActiveIndex = useCallback(
    (delta: number) => {
      if (!Number.isFinite(delta) || delta === 0) return
      const next = clampIndex(getActiveIndex() + delta)
      setActiveIndex(next)
    },
    [clampIndex, getActiveIndex, setActiveIndex],
  )

  const flushPointerUpdate = useCallback(() => {
    if (pendingIndexRef.current == null) return
    setHoverIndex(pendingIndexRef.current)
    pendingIndexRef.current = null
    rafRef.current = null
  }, [setHoverIndex])

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (touchActiveRef.current && event.pointerType === 'touch') {
        event.preventDefault()
        if (touchLastYRef.current == null) return
        const delta = event.clientY - touchLastYRef.current
        touchLastYRef.current = event.clientY
        touchAccumRef.current += delta
        const STEP_PX = 40
        while (Math.abs(touchAccumRef.current) >= STEP_PX) {
          const step = touchAccumRef.current > 0 ? 1 : -1
          touchAccumRef.current -= step * STEP_PX
          stepActiveIndex(invertTouchSwipe ? -step : step)
        }
        return
      }

      if (event.pointerType === 'touch') {
        return
      }

      if ((event.pointerType === 'mouse' || event.pointerType === 'pen') && !supportsHover()) {
        return
      }

      markUserInteracted()
      if (lockedIndexRef.current != null) return
      const target = document.elementFromPoint(event.clientX, event.clientY)
      const card = target?.closest('[data-postcard-index]') as HTMLElement | null
      if (!card) return
      const indexAttr = card.getAttribute('data-postcard-index')
      if (indexAttr == null) return
      const index = Number(indexAttr)
      if (!Number.isFinite(index)) return
      if (index === hoverIndexRef.current) return
      pendingIndexRef.current = index
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flushPointerUpdate)
      }
    },
    [flushPointerUpdate, hoverIndexRef, lockedIndexRef, markUserInteracted, stepActiveIndex],
  )

  const onPointerLeave = useCallback(() => {
    cancelPendingHover()
  }, [cancelPendingHover])

  const onPointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'touch') {
        touchActiveRef.current = false
        touchLastYRef.current = null
        touchAccumRef.current = 0
      }
      cancelPendingHover()
    },
    [cancelPendingHover],
  )

  const onWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      markUserInteracted()
      const delta = invertTouchSwipe ? -event.deltaY : event.deltaY
      if (!Number.isFinite(delta) || delta === 0) return
      event.preventDefault()
      const STEP_PX = 60
      wheelAccumRef.current += delta
      while (Math.abs(wheelAccumRef.current) >= STEP_PX) {
        const step = wheelAccumRef.current > 0 ? 1 : -1
        wheelAccumRef.current -= step * STEP_PX
        stepActiveIndex(step)
      }
    },
    [invertTouchSwipe, markUserInteracted, stepActiveIndex],
  )

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== 'touch') return
      touchActiveRef.current = true
      touchLastYRef.current = event.clientY
      touchAccumRef.current = 0
      markUserInteracted()
    },
    [markUserInteracted],
  )

  const onPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return
    touchActiveRef.current = false
    touchLastYRef.current = null
    touchAccumRef.current = 0
  }, [])

  return useMemo(
    () => ({
      onPointerMove,
      onPointerLeave,
      onPointerCancel,
      onPointerDown,
      onPointerUp,
      onWheel,
      cancelPendingHover,
    }),
    [
      cancelPendingHover,
      onPointerCancel,
      onPointerDown,
      onPointerLeave,
      onPointerMove,
      onPointerUp,
      onWheel,
    ],
  )
}
