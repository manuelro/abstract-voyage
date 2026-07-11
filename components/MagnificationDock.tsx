import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from 'react'
import {
  computeMagnificationDockSizes,
  clamp01,
} from '../helpers/magnificationDockMath'

export type MagnificationDockOrientation = 'vertical' | 'horizontal'
export type MagnificationDockContentSizeStrategy =
  | 'slot'
  | 'container'
  | 'active'
  | 'fixed'

export type MagnificationDockRenderState<T> = {
  item: T
  index: number
  isActive: boolean
  isLocked: boolean
  isRevealed: boolean
  allRevealed: boolean
  activeIndex: number | null
  hoverIndex: number | null
  lockedIndex: number | null
  lastActiveIndex: number | null
  center: number
  last: number
  sizePct: number
  proximity: number
  orientation: MagnificationDockOrientation
  itemStyle: CSSProperties
  contentStyle: CSSProperties
  itemProps: {
    'data-magnification-dock-index': number
  }
  contentProps: {
    style: CSSProperties
  }
  setLockedIndex: (index: number | null) => void
  setHoverIndex: (index: number | null) => void
  markUserInteracted: () => void
}

export type MagnificationDockProps<T> = {
  items: T[]
  renderItem: (state: MagnificationDockRenderState<T>) => ReactNode
  getItemKey?: (item: T, index: number) => string | number
  orientation?: MagnificationDockOrientation
  activePct?: number
  initialActiveIndex?: number | null
  restoreActiveIndex?: number | null
  excludeLeadItemWhenActive?: boolean
  leadItemCollapseSizePx?: number
  transitionMs?: number
  transitionDelayMs?: number
  transitionEasing?: string
  revealFirstDelayMs?: number
  revealStaggerMs?: number
  revealDurationMs?: number
  revealEasing?: string
  pointerStepPx?: number
  wheelStepPx?: number
  invertTouchSwipe?: boolean
  preserveContentLayout?: boolean
  contentSizeStrategy?: MagnificationDockContentSizeStrategy
  fixedContentSizePx?: number
  className?: string
  style?: CSSProperties
  prefersReducedMotion?: boolean
  onActiveIndexChange?: (index: number | null) => void
}

const supportsHover = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: hover)').matches
}

const resolveActiveIndex = (
  lockedIndex: number | null,
  hoverIndex: number | null,
  lastActiveIndex: number | null,
) => lockedIndex ?? hoverIndex ?? lastActiveIndex

export default function MagnificationDock<T>({
  items,
  renderItem,
  getItemKey,
  orientation = 'vertical',
  activePct = 38.19530284,
  initialActiveIndex = null,
  restoreActiveIndex = initialActiveIndex,
  excludeLeadItemWhenActive = false,
  leadItemCollapseSizePx = 0,
  transitionMs = 700,
  transitionDelayMs = 0,
  transitionEasing = 'cubic-bezier(0.22, 1, 0.36, 1)',
  revealFirstDelayMs = 80,
  revealStaggerMs = 90,
  revealDurationMs = 480,
  revealEasing = 'cubic-bezier(0.22, 1, 0.36, 1)',
  pointerStepPx = 40,
  wheelStepPx = 60,
  invertTouchSwipe = false,
  preserveContentLayout = false,
  contentSizeStrategy = 'slot',
  fixedContentSizePx = 960,
  className,
  style,
  prefersReducedMotion = false,
  onActiveIndexChange,
}: MagnificationDockProps<T>) {
  const [hoverIndex, setHoverIndexState] = useState<number | null>(initialActiveIndex)
  const [lockedIndex, setLockedIndexState] = useState<number | null>(null)
  const [activeRevealIndex, setActiveRevealIndex] = useState(-1)
  const [dockVisible, setDockVisible] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  const containerRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const pendingIndexRef = useRef<number | null>(null)
  const wheelAccumRef = useRef(0)
  const pointerAccumRef = useRef(0)
  const pointerLastAxisRef = useRef<number | null>(null)
  const pointerActiveRef = useRef(false)
  const autoActivateTimerRef = useRef<number | null>(null)
  const hasUserInteractedRef = useRef(false)
  const hoverIndexRef = useRef<number | null>(initialActiveIndex)
  const lockedIndexRef = useRef<number | null>(null)
  const lastActiveIndexRef = useRef<number | null>(initialActiveIndex)

  const activeIndex = resolveActiveIndex(
    lockedIndex,
    hoverIndex,
    lastActiveIndexRef.current,
  )

  if (activeIndex != null) {
    lastActiveIndexRef.current = activeIndex
  }

  useEffect(() => {
    hoverIndexRef.current = hoverIndex
    lockedIndexRef.current = lockedIndex
    onActiveIndexChange?.(activeIndex)
  }, [activeIndex, hoverIndex, lockedIndex, onActiveIndexChange])

  const axisClientKey = orientation === 'horizontal' ? 'clientX' : 'clientY'

  const cancelPendingHover = useCallback(() => {
    pendingIndexRef.current = null
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    pointerActiveRef.current = false
    pointerLastAxisRef.current = null
    pointerAccumRef.current = 0
  }, [])

  const clearAutoActivateTimer = useCallback(() => {
    if (autoActivateTimerRef.current == null) return
    window.clearTimeout(autoActivateTimerRef.current)
    autoActivateTimerRef.current = null
  }, [])

  const markUserInteracted = useCallback(() => {
    if (hasUserInteractedRef.current) return
    hasUserInteractedRef.current = true
    clearAutoActivateTimer()
  }, [clearAutoActivateTimer])

  const clampIndex = useCallback(
    (index: number) => Math.max(0, Math.min(items.length - 1, index)),
    [items.length],
  )

  const setHoverIndex = useCallback((index: number | null) => {
    hoverIndexRef.current = index
    setHoverIndexState(index)
  }, [])

  const setLockedIndex = useCallback((index: number | null) => {
    lockedIndexRef.current = index
    setLockedIndexState(index)
  }, [])

  const resetActiveIndex = useCallback((nextIndex: number | null = initialActiveIndex) => {
    cancelPendingHover()
    hasUserInteractedRef.current = false
    lastActiveIndexRef.current = nextIndex
    hoverIndexRef.current = nextIndex
    lockedIndexRef.current = null
    setLockedIndexState(null)
    setHoverIndexState(nextIndex)
  }, [cancelPendingHover, initialActiveIndex])

  const getActiveIndex = useCallback(
    () =>
      lockedIndexRef.current ??
      hoverIndexRef.current ??
      lastActiveIndexRef.current ??
      0,
    [],
  )

  const setActiveIndex = useCallback(
    (index: number) => {
      if (lockedIndexRef.current != null) {
        setLockedIndex(index)
        return
      }
      setHoverIndex(index)
    },
    [setHoverIndex, setLockedIndex],
  )

  const stepActiveIndex = useCallback(
    (delta: number) => {
      if (!Number.isFinite(delta) || delta === 0 || items.length === 0) return
      const next = clampIndex(getActiveIndex() + delta)
      setActiveIndex(next)
    },
    [clampIndex, getActiveIndex, items.length, setActiveIndex],
  )

  const flushPointerUpdate = useCallback(() => {
    if (pendingIndexRef.current == null) return
    setHoverIndex(pendingIndexRef.current)
    pendingIndexRef.current = null
    rafRef.current = null
  }, [setHoverIndex])

  useEffect(() => {
    return () => {
      cancelPendingHover()
      clearAutoActivateTimer()
    }
  }, [cancelPendingHover, clearAutoActivateTimer])

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof window === 'undefined') return

    const readSize = () => {
      const rect = container.getBoundingClientRect()
      setContainerSize((current) => {
        const nextWidth = Math.round(rect.width)
        const nextHeight = Math.round(rect.height)
        if (current.width === nextWidth && current.height === nextHeight) {
          return current
        }
        return { width: nextWidth, height: nextHeight }
      })
    }

    readSize()

    if (typeof window.ResizeObserver === 'function') {
      const resizeObserver = new window.ResizeObserver(readSize)
      resizeObserver.observe(container)
      return () => resizeObserver.disconnect()
    }

    window.addEventListener('resize', readSize)
    return () => window.removeEventListener('resize', readSize)
  }, [])

  useEffect(() => {
    if (items.length === 0) return

    autoActivateTimerRef.current = window.setTimeout(() => {
      if (
        hasUserInteractedRef.current ||
        lockedIndexRef.current != null ||
        hoverIndexRef.current != null
      ) {
        return
      }
      setHoverIndex(0)
    }, 300)

    return clearAutoActivateTimer
  }, [clearAutoActivateTimer, items.length, setHoverIndex])

  useEffect(() => {
    if (prefersReducedMotion) {
      setActiveRevealIndex(items.length - 1)
      setDockVisible(true)
      return
    }

    let isMounted = true
    const timers: number[] = []

    setActiveRevealIndex(-1)
    const startDelay = Math.max(0, revealFirstDelayMs)
    timers.push(
      window.setTimeout(() => {
        if (!isMounted) return
        setDockVisible(true)
        setActiveRevealIndex(0)
        Array.from({ length: items.length }).forEach((_, index) => {
          if (index === 0) return
          const delay = startDelay + index * revealStaggerMs
          timers.push(
            window.setTimeout(() => {
              if (!isMounted) return
              setActiveRevealIndex((prev) => Math.max(prev, index))
            }, delay),
          )
        })
      }, startDelay),
    )

    return () => {
      isMounted = false
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [
    items.length,
    prefersReducedMotion,
    revealFirstDelayMs,
    revealStaggerMs,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleExit = () => {
      cancelPendingHover()
    }
    const handleBlur = () => handleExit()
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        handleExit()
      }
    }
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return

      resetActiveIndex(restoreActiveIndex)
      setActiveRevealIndex(items.length - 1)
      setDockVisible(true)
    }

    window.addEventListener('blur', handleBlur)
    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [cancelPendingHover, items.length, resetActiveIndex, restoreActiveIndex])

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (pointerActiveRef.current && event.pointerType === 'touch') {
        event.preventDefault()
        if (pointerLastAxisRef.current == null) return
        const currentAxis = event[axisClientKey]
        const delta = currentAxis - pointerLastAxisRef.current
        pointerLastAxisRef.current = currentAxis
        pointerAccumRef.current += delta

        while (Math.abs(pointerAccumRef.current) >= pointerStepPx) {
          const step = pointerAccumRef.current > 0 ? 1 : -1
          pointerAccumRef.current -= step * pointerStepPx
          stepActiveIndex(invertTouchSwipe ? -step : step)
        }
        return
      }

      if (event.pointerType === 'touch') return

      if ((event.pointerType === 'mouse' || event.pointerType === 'pen') && !supportsHover()) {
        return
      }

      markUserInteracted()
      if (lockedIndexRef.current != null) return

      const target = document.elementFromPoint(event.clientX, event.clientY)
      const item = target?.closest('[data-magnification-dock-index]') as HTMLElement | null
      if (!item) return

      const indexAttr = item.getAttribute('data-magnification-dock-index')
      if (indexAttr == null) return

      const index = Number(indexAttr)
      if (!Number.isFinite(index)) return
      if (index === hoverIndexRef.current) return

      pendingIndexRef.current = index
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flushPointerUpdate)
      }
    },
    [
      axisClientKey,
      flushPointerUpdate,
      invertTouchSwipe,
      markUserInteracted,
      pointerStepPx,
      stepActiveIndex,
    ],
  )

  const onPointerLeave = useCallback(() => {
    cancelPendingHover()
  }, [cancelPendingHover])

  const onPointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'touch') {
        pointerActiveRef.current = false
        pointerLastAxisRef.current = null
        pointerAccumRef.current = 0
      }
      cancelPendingHover()
    },
    [cancelPendingHover],
  )

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== 'touch') return
      pointerActiveRef.current = true
      pointerLastAxisRef.current = event[axisClientKey]
      pointerAccumRef.current = 0
      markUserInteracted()
    },
    [axisClientKey, markUserInteracted],
  )

  const onPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return
    pointerActiveRef.current = false
    pointerLastAxisRef.current = null
    pointerAccumRef.current = 0
  }, [])

  const onWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      markUserInteracted()

      const primaryDelta =
        orientation === 'horizontal'
          ? Math.abs(event.deltaX) >= Math.abs(event.deltaY)
            ? event.deltaX
            : event.deltaY
          : event.deltaY
      const delta = invertTouchSwipe ? -primaryDelta : primaryDelta
      if (!Number.isFinite(delta) || delta === 0) return

      event.preventDefault()
      wheelAccumRef.current += delta

      while (Math.abs(wheelAccumRef.current) >= wheelStepPx) {
        const step = wheelAccumRef.current > 0 ? 1 : -1
        wheelAccumRef.current -= step * wheelStepPx
        stepActiveIndex(step)
      }
    },
    [invertTouchSwipe, markUserInteracted, orientation, stepActiveIndex, wheelStepPx],
  )

  const excludeLeadItem = excludeLeadItemWhenActive && activeIndex !== 0
  const sizes = computeMagnificationDockSizes(items.length, activeIndex, {
    activePct,
    excludeLeadItem,
  })
  const center = activeIndex ?? lastActiveIndexRef.current ?? (items.length - 1) / 2
  const last = Math.max(1, items.length - 1)
  const remainingSize = `calc(100% - ${Math.max(0, leadItemCollapseSizePx)}px)`
  const isHorizontal = orientation === 'horizontal'
  const transitionDuration = prefersReducedMotion
    ? '0ms'
    : `${transitionMs}ms, ${transitionMs}ms, ${transitionMs}ms, ${revealDurationMs}ms`
  const transitionTimingFunction = prefersReducedMotion
    ? 'linear'
    : `${transitionEasing}, ${transitionEasing}, ${transitionEasing}, ${revealEasing}`
  const transitionDelay = prefersReducedMotion
    ? '0ms'
    : `${transitionDelayMs}ms, ${transitionDelayMs}ms, ${transitionDelayMs}ms, 0ms`
  const containerClassName = [
    'flex h-full w-full overflow-hidden',
    isHorizontal ? 'flex-row' : 'flex-col',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const allRevealed = prefersReducedMotion || activeRevealIndex >= items.length - 1
  const axisSizePx = isHorizontal ? containerSize.width : containerSize.height
  const contentLayoutPreserved =
    preserveContentLayout && contentSizeStrategy !== 'slot'
  const resolvedContentSizePx = (() => {
    if (!contentLayoutPreserved) return 0
    if (contentSizeStrategy === 'fixed') {
      return Math.max(1, fixedContentSizePx)
    }
    if (contentSizeStrategy === 'container') {
      return Math.max(1, axisSizePx || fixedContentSizePx)
    }
    if (contentSizeStrategy === 'active') {
      const availableAxis = Math.max(
        1,
        (axisSizePx || fixedContentSizePx) -
          (excludeLeadItem ? Math.max(0, leadItemCollapseSizePx) : 0),
      )
      return Math.max(1, availableAxis * (activePct / 100))
    }
    return 0
  })()

  return (
    <div
      ref={containerRef}
      className={containerClassName}
      style={{
        touchAction: 'none',
        opacity: dockVisible ? 1 : 0,
        transitionProperty: 'opacity',
        transitionTimingFunction: revealEasing,
        transitionDuration: prefersReducedMotion ? '0ms' : `${revealDurationMs}ms`,
        ...(style ?? {}),
      }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
    >
      {items.map((item, index) => {
        const isActive = activeIndex === index
        const isLeadCollapsed = excludeLeadItem && index === 0 && !isActive
        const itemBasis = isLeadCollapsed
          ? `${Math.max(0, leadItemCollapseSizePx)}px`
          : excludeLeadItem
            ? `calc(${remainingSize} * ${(sizes[index] ?? 0) / 100})`
            : `${sizes[index] ?? 0}%`
        const isRevealed = prefersReducedMotion || index <= activeRevealIndex
        const distance = activeIndex == null ? 0 : Math.abs(index - activeIndex)
        const proximity = activeIndex == null ? 0 : clamp01(1 / (distance + 1))
        const itemStyle: CSSProperties = {
          flexBasis: itemBasis,
          flex: `0 0 ${itemBasis}`,
          zIndex: isLeadCollapsed ? 2 : undefined,
          opacity: isRevealed ? 1 : 0,
          overflow: 'hidden',
          position: 'relative',
          transitionProperty: isHorizontal
            ? 'flex-basis, min-width, width, opacity'
            : 'flex-basis, min-height, height, opacity',
          transitionTimingFunction,
          transitionDuration,
          transitionDelay,
          ...(isHorizontal
            ? {
                width: itemBasis,
                minWidth: itemBasis,
                height: '100%',
                minHeight: 0,
              }
            : {
                height: itemBasis,
                minHeight: itemBasis,
                width: '100%',
                minWidth: 0,
              }),
        }
        const contentStyle: CSSProperties = contentLayoutPreserved
          ? {
              flex: '0 0 auto',
              maxWidth: 'none',
              maxHeight: 'none',
              ...(isHorizontal
                ? {
                    width: `${resolvedContentSizePx}px`,
                    minWidth: `${resolvedContentSizePx}px`,
                    height: '100%',
                    minHeight: 0,
                  }
                : {
                    height: `${resolvedContentSizePx}px`,
                    minHeight: `${resolvedContentSizePx}px`,
                    width: '100%',
                    minWidth: 0,
                  }),
            }
          : {
              width: '100%',
              height: '100%',
            }

        return (
          <div
            key={getItemKey ? getItemKey(item, index) : index}
            data-magnification-dock-index={index}
            className="shrink-0 min-h-0 min-w-0 overflow-hidden relative"
            style={itemStyle}
          >
            <div style={contentStyle}>
              {renderItem({
                item,
                index,
                isActive,
                isLocked: lockedIndex === index,
                isRevealed,
                allRevealed,
                activeIndex,
                hoverIndex,
                lockedIndex,
                lastActiveIndex: lastActiveIndexRef.current,
                center,
                last,
                sizePct: sizes[index] ?? 0,
                proximity,
                orientation,
                itemStyle,
                contentStyle,
                itemProps: {
                  'data-magnification-dock-index': index,
                },
                contentProps: {
                  style: contentStyle,
                },
                setLockedIndex,
                setHoverIndex,
                markUserInteracted,
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
