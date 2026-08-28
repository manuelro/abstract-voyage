import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
import {
  computeMagnificationDockRevealSchedule,
  type MagnificationDockRevealDistribution,
  type MagnificationDockRevealMode,
} from '../helpers/magnificationDockRevealMath'
import {
  createCssEasingFunction,
  type EasingFunction,
} from '../helpers/cubicBezierEasing'

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Vertical/slot flex items: how much each item (but the first) overlaps the
// previous one to paint over hairline sub-pixel seams — see the itemStyle
// branch below for the full rationale.
const SEAM_OVERLAP_PX = 1

export type {
  MagnificationDockRevealDistribution,
  MagnificationDockRevealMode,
} from '../helpers/magnificationDockRevealMath'

export type MagnificationDockOrientation = 'vertical' | 'horizontal'
export type MagnificationDockContentSizeStrategy =
  | 'slot'
  | 'container'
  | 'active'
  | 'fixed'
export type MagnificationDockDimmingEasing = 'linear' | 'soft' | 'expo'

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
  distanceDimmingOpacity: number
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
  /** Off (default): normal magnification sizing (computeMagnificationDockSizes,
   * active item at activePct, inactive items sharing the remainder by
   * distance-decayed weight). On: every item gets an equal, undifferentiated
   * share of the available space — sizing behaves as if there were no active
   * item at all, while activeIndex itself keeps driving every other
   * behavior (content reveal, hover/lock, gradient continuity) unchanged. A
   * generic dock capability, not tied to any one caller's own feature. */
  equalizeSizes?: boolean
  initialActiveIndex?: number | null
  restoreActiveIndex?: number | null
  /** External control: when supplied, every change forces the dock's active
   * slide to match (e.g. a prev/next control rendered outside the dock) —
   * omit for the dock's own internal hover/lock-driven behavior (every
   * existing consumer). Unlike initialActiveIndex/restoreActiveIndex (seed
   * values used only at mount or on bfcache restore), this is watched on
   * every change. */
  controlledActiveIndex?: number | null
  excludeLeadItemWhenActive?: boolean
  leadItemCollapseSizePx?: number
  transitionMs?: number
  transitionDelayMs?: number
  transitionEasing?: string
  revealFirstDelayMs?: number
  revealEnabled?: boolean
  revealMode?: MagnificationDockRevealMode
  revealOverlapMs?: number
  revealStaggerMs?: number
  revealDurationMs?: number
  revealEasing?: string
  revealDistribution?: MagnificationDockRevealDistribution
  revealCadenceAmount?: number
  revealOffsetX?: string
  pointerStepPx?: number
  wheelStepPx?: number
  invertTouchSwipe?: boolean
  preserveContentLayout?: boolean
  contentSizeStrategy?: MagnificationDockContentSizeStrategy
  fixedContentSizePx?: number
  activeFillSizePx?: number
  activeFillPeekPx?: number
  // 'center' keeps the active card centred with symmetric peeks (default).
  // 'progress' anchors the active card by scroll position: it travels from the
  // start edge (first item) to the end edge (last item), with the rest of the
  // deck stacked/peeking beneath on the far side.
  // 'fixed' is the touch card-deck: the active card sits at a constant position
  // (backHint from the start edge), pending cards fan as a geometric tail on the
  // far side, the previous card peeks backHint at the near side, and the rest of
  // the past tucks fully beneath it.
  activeFillAnchor?: 'center' | 'progress' | 'fixed'
  // Fixed-anchor deck: width of the previous card's visible back-hint sliver.
  activeFillBackHintPx?: number
  // Fixed-anchor deck: per-depth scale applied to tail cards (depth d ⇒ scale^d).
  activeFillTailScale?: number
  activeFillDeckDirection?: 'ltr' | 'rtl'
  activeFillDeckStackPx?: number
  // Per-item peek decay for the pending stack (0.68 ⇒ each sliver 32% smaller than
  // the previous). The cumulative offset converges, so any number of items fans into
  // a bounded space as progressively thinner slivers.
  activeFillDeckDecay?: number
  // Target number of distinct slivers to keep visible: the base sliver is sized so
  // this many fit inside the available peek region (beyond it, items clip and the
  // caller can surface an overflow count).
  activeFillDeckMaxVisible?: number
  distanceDimmingEnabled?: boolean
  distanceDimmingMaxOpacity?: number
  // Floor of the dimming range — the item closest to active still bottoms
  // out here instead of the eased curve's own value at that distance,
  // which (especially at low distanceDimmingPower) can already be quite
  // dark right next to active. 0 (default) reproduces today's exact
  // behaviour: the range is [0, distanceDimmingMaxOpacity].
  distanceDimmingBaselineOpacity?: number
  distanceDimmingPower?: number
  distanceDimmingEasing?: MagnificationDockDimmingEasing
  hoverActivationEnabled?: boolean
  hoverCommitDelayMs?: number
  hoverHysteresisPx?: number
  panningEnabled?: boolean
  panCursorEnabled?: boolean
  naturalPanDirection?: boolean
  // 'step' (default): pointer panning advances one index per pointerStepPx of
  // travel. 'swipe' (fixed-anchor deck): the card follows the finger 1:1 and a
  // release commits (past commitPct of the card width, or a fast flick) or
  // springs back. One swipe = one card.
  pointerInteraction?: 'step' | 'swipe'
  swipeCommitPct?: number
  swipeVelocityThreshold?: number
  swipeSettleMs?: number
  onSwipeStateChange?: (swiping: boolean) => void
  activeItemBoxShadow?: string
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

const easeDimmingDistance = (
  value: number,
  easing: MagnificationDockDimmingEasing,
) => {
  const x = clamp01(value)
  if (easing === 'linear') return x
  if (easing === 'expo') return 1 - Math.pow(1 - x, 3)
  return x * x * (3 - 2 * x)
}

// Extracted so the [baseline, max] remap is independently testable — the
// distance-dimming black overlay's own opacity, per accordion item. 0
// whenever dimming is off or the item itself is active; otherwise the
// eased/powered distance curve is remapped from [0, max] onto
// [baseline, max] instead of starting from a hard 0, so an item right next
// to active doesn't necessarily jump straight into the curve's own steep
// early rise. baselineOpacity: 0 reproduces the original [0, max] range
// exactly.
export const resolveDistanceDimmingOpacity = ({
  enabled,
  isActive,
  distance,
  activeDistanceMax,
  easing,
  power,
  maxOpacity,
  baselineOpacity,
}: {
  enabled: boolean
  isActive: boolean
  distance: number
  activeDistanceMax: number
  easing: MagnificationDockDimmingEasing
  power: number
  maxOpacity: number
  baselineOpacity: number
}): number => {
  if (!enabled || isActive) return 0
  const eased = easeDimmingDistance(distance / Math.max(1, activeDistanceMax), easing)
  return baselineOpacity + (maxOpacity - baselineOpacity) * Math.pow(eased, power)
}

export default function MagnificationDock<T>({
  items,
  renderItem,
  getItemKey,
  orientation = 'vertical',
  activePct = 38.19530284,
  equalizeSizes = false,
  initialActiveIndex = null,
  restoreActiveIndex = initialActiveIndex,
  controlledActiveIndex = null,
  excludeLeadItemWhenActive = false,
  leadItemCollapseSizePx = 0,
  transitionMs = 700,
  transitionDelayMs = 0,
  transitionEasing = 'cubic-bezier(0.22, 1, 0.36, 1)',
  revealFirstDelayMs = 80,
  revealEnabled = true,
  revealMode = 'stagger',
  revealOverlapMs = 0,
  revealStaggerMs = 90,
  revealDurationMs = 480,
  revealEasing = 'cubic-bezier(0.22, 1, 0.36, 1)',
  revealDistribution = 'linear',
  revealCadenceAmount = 1,
  revealOffsetX = '0px',
  pointerStepPx = 40,
  wheelStepPx = 60,
  invertTouchSwipe = false,
  preserveContentLayout = false,
  contentSizeStrategy = 'slot',
  fixedContentSizePx = 960,
  activeFillSizePx,
  activeFillPeekPx,
  activeFillAnchor = 'center',
  activeFillBackHintPx = 12,
  activeFillTailScale = 0.985,
  activeFillDeckDirection = 'ltr',
  activeFillDeckStackPx = 14,
  activeFillDeckDecay = 0.68,
  activeFillDeckMaxVisible = 4,
  distanceDimmingEnabled = false,
  distanceDimmingMaxOpacity = 0.5,
  distanceDimmingBaselineOpacity = 0,
  distanceDimmingPower = 1,
  distanceDimmingEasing = 'soft',
  hoverActivationEnabled = true,
  hoverCommitDelayMs = 80,
  hoverHysteresisPx = 10,
  panningEnabled = false,
  panCursorEnabled = false,
  naturalPanDirection = false,
  pointerInteraction = 'step',
  swipeCommitPct = 0.32,
  swipeVelocityThreshold = 0.5,
  swipeSettleMs = 420,
  onSwipeStateChange,
  activeItemBoxShadow,
  className,
  style,
  prefersReducedMotion = false,
  onActiveIndexChange,
}: MagnificationDockProps<T>) {
  const [hoverIndex, setHoverIndexState] = useState<number | null>(initialActiveIndex)
  const [lockedIndex, setLockedIndexState] = useState<number | null>(null)
  const [activeRevealIndex, setActiveRevealIndex] = useState(-1)
  const [dockVisible, setDockVisible] = useState(false)
  const [revealTransitionsEnabled, setRevealTransitionsEnabled] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [isPanning, setIsPanning] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const pendingIndexRef = useRef<number | null>(null)
  const pendingPointerRef = useRef({ x: 0, y: 0 })
  const hoverCandidateRef = useRef<number | null>(null)
  const hoverCommitTimerRef = useRef<number | null>(null)
  const wheelAccumRef = useRef(0)
  const pointerAccumRef = useRef(0)
  const pointerLastAxisRef = useRef<number | null>(null)
  const pointerActiveRef = useRef(false)
  const autoActivateTimerRef = useRef<number | null>(null)
  const lastRevealConfigSignatureRef = useRef<string | null>(null)
  const hasUserInteractedRef = useRef(false)
  const hoverIndexRef = useRef<number | null>(initialActiveIndex)
  const lockedIndexRef = useRef<number | null>(null)
  const lastActiveIndexRef = useRef<number | null>(initialActiveIndex)
  const lastNotifiedActiveIndexRef = useRef<number | null>(null)
  // Transform-mode tween: card positions are animated by a single rAF loop that
  // snaps every value to the device-pixel grid before writing the transform.
  // Fractional compositor-interpolated edges alpha-blend with the hidden content
  // of the card beneath (a 1px foreign-color hairline at seams); integer edges
  // every frame make that blend impossible. One atomic write per frame for all
  // cards also keeps seams on a single clock (no gaps under main-thread load).
  const itemNodesRef = useRef<Array<HTMLDivElement | null>>([])
  const transformTweenRef = useRef<{
    positions: number[] | null
    scales: number[] | null
    raf: number
    applied: boolean
  }>({ positions: null, scales: null, raf: 0, applied: false })
  // One-shot duration override for the next imperative tween (set by the swipe
  // gesture so a committed flick settles proportionally to its velocity).
  const tweenDurationOverrideRef = useRef<number | null>(null)
  // Swipe gesture (fixed-anchor deck) state + per-render layout snapshot the
  // stable pointer handlers read from.
  const swipeStateRef = useRef({
    pointerId: -1,
    tracking: false,
    locked: null as 'x' | 'y' | null,
    startX: 0,
    startY: 0,
    dx: 0,
    samples: [] as Array<{ t: number; x: number }>,
    boostedIndex: -1,
    boostedZ: '',
    zClearTimer: 0,
  })
  const swipeLayoutRef = useRef({
    enabled: false,
    backHint: 0,
    cardW: 1,
    tailOffsets: [0] as number[],
    tailScale: 1,
    tailN: 1,
    count: 0,
    restXs: [] as number[],
    restScales: [] as number[],
    commitPct: 0.32,
    velocity: 0.5,
    settleMs: 420,
  })
  const transformMotionRef = useRef<{
    durationMs: number
    delayMs: number
    easing: EasingFunction
    reducedMotion: boolean
  }>({ durationMs: 0, delayMs: 0, easing: (t) => t, reducedMotion: false })
  const easingCacheRef = useRef<{ css: string; fn: EasingFunction }>({
    css: '',
    fn: (t) => t,
  })

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
    if (lastNotifiedActiveIndexRef.current === activeIndex) return
    lastNotifiedActiveIndexRef.current = activeIndex
    onActiveIndexChange?.(activeIndex)
  }, [activeIndex, hoverIndex, lockedIndex, onActiveIndexChange])

  const axisClientKey = orientation === 'horizontal' ? 'clientX' : 'clientY'

  const clearHoverCommit = useCallback(() => {
    pendingIndexRef.current = null
    hoverCandidateRef.current = null
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (hoverCommitTimerRef.current != null) {
      window.clearTimeout(hoverCommitTimerRef.current)
      hoverCommitTimerRef.current = null
    }
  }, [])

  const cancelPendingHover = useCallback(() => {
    clearHoverCommit()
    pointerActiveRef.current = false
    pointerLastAxisRef.current = null
    pointerAccumRef.current = 0
    setIsPanning(false)
  }, [clearHoverCommit])

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
      clearHoverCommit()
      if (lockedIndexRef.current != null) {
        setLockedIndex(index)
        return
      }
      setHoverIndex(index)
    },
    [clearHoverCommit, setHoverIndex, setLockedIndex],
  )

  const stepActiveIndex = useCallback(
    (delta: number) => {
      if (!Number.isFinite(delta) || delta === 0 || items.length === 0) return
      const next = clampIndex(getActiveIndex() + delta)
      setActiveIndex(next)
    },
    [clampIndex, getActiveIndex, items.length, setActiveIndex],
  )

  useEffect(() => {
    if (controlledActiveIndex == null) return
    if (controlledActiveIndex === getActiveIndex()) return
    setActiveIndex(clampIndex(controlledActiveIndex))
  }, [controlledActiveIndex, clampIndex, getActiveIndex, setActiveIndex])

  const flushPointerUpdate = useCallback(() => {
    const candidateIndex = pendingIndexRef.current
    pendingIndexRef.current = null
    rafRef.current = null
    if (candidateIndex == null) return

    if (candidateIndex === hoverIndexRef.current) {
      clearHoverCommit()
      return
    }
    if (
      hoverCandidateRef.current === candidateIndex &&
      hoverCommitTimerRef.current != null
    ) {
      return
    }

    clearHoverCommit()
    hoverCandidateRef.current = candidateIndex
    hoverCommitTimerRef.current = window.setTimeout(() => {
      hoverCommitTimerRef.current = null
      if (hoverCandidateRef.current !== candidateIndex) return

      const candidate = containerRef.current?.querySelector<HTMLElement>(
        `[data-magnification-dock-index="${candidateIndex}"]`,
      )
      if (!candidate) {
        hoverCandidateRef.current = null
        return
      }

      const rect = candidate.getBoundingClientRect()
      const { x, y } = pendingPointerRef.current
      // In transform mode items are content-width boxes clipped to their slot, so
      // the visual right edge is left + slot width, not the box's right edge.
      const slotWidthAttr = candidate.getAttribute('data-magnification-dock-slot-width')
      const slotWidth = slotWidthAttr == null ? NaN : Number(slotWidthAttr)
      const visualWidth = Number.isFinite(slotWidth) ? slotWidth : rect.width
      const visualRight = rect.left + visualWidth
      const insetX = Math.min(Math.max(0, hoverHysteresisPx), visualWidth * 0.2)
      const insetY = Math.min(Math.max(0, hoverHysteresisPx), rect.height * 0.2)
      const isInsideCandidate =
        x >= rect.left + insetX &&
        x <= visualRight - insetX &&
        y >= rect.top + insetY &&
        y <= rect.bottom - insetY

      if (isInsideCandidate) {
        setHoverIndex(candidateIndex)
      }
      hoverCandidateRef.current = null
    }, Math.max(0, hoverCommitDelayMs))
  }, [clearHoverCommit, hoverCommitDelayMs, hoverHysteresisPx, setHoverIndex])

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

  const revealConfigSignature = [
    revealMode,
    revealOverlapMs,
    revealFirstDelayMs,
    revealDurationMs,
    revealStaggerMs,
    revealEasing,
    revealDistribution,
    revealCadenceAmount,
    revealOffsetX,
  ].join('|')

  useIsomorphicLayoutEffect(() => {
    const previousSignature = lastRevealConfigSignatureRef.current
    const configChanged =
      previousSignature !== null && previousSignature !== revealConfigSignature
    lastRevealConfigSignatureRef.current = revealConfigSignature

    if (items.length === 0) {
      setRevealTransitionsEnabled(false)
      setActiveRevealIndex(-1)
      setDockVisible(false)
      return
    }

    // Opt-in controls the automatic mount animation. Configuration edits still
    // play one preview cycle so the newly selected motion can be evaluated.
    if ((!revealEnabled && !configChanged) || prefersReducedMotion) {
      setRevealTransitionsEnabled(false)
      setActiveRevealIndex(items.length - 1)
      setDockVisible(true)
      return
    }

    let isMounted = true
    const timers: number[] = []
    let resetFrame = 0

    setRevealTransitionsEnabled(false)
    setActiveRevealIndex(-1)
    setDockVisible(false)
    resetFrame = window.requestAnimationFrame(() => {
      resetFrame = 0
      if (!isMounted) return
      setRevealTransitionsEnabled(true)
      const startDelay = Math.max(0, revealFirstDelayMs)
      const revealSchedule = computeMagnificationDockRevealSchedule({
        itemCount: items.length,
        staggerMs: revealStaggerMs,
        durationMs: revealDurationMs,
        overlapMs: revealOverlapMs,
        mode: revealMode,
        distribution: revealDistribution,
        cadenceAmount: revealCadenceAmount,
      })

      revealSchedule.forEach((timing, index) => {
        timers.push(window.setTimeout(() => {
          if (!isMounted) return
          if (index === 0) setDockVisible(true)
          setActiveRevealIndex((previous) => Math.max(previous, index))
        }, startDelay + timing.startMs))
      })
    })

    return () => {
      isMounted = false
      if (resetFrame) window.cancelAnimationFrame(resetFrame)
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [
    items.length,
    prefersReducedMotion,
    revealEnabled,
    revealDistribution,
    revealCadenceAmount,
    revealDurationMs,
    revealEasing,
    revealFirstDelayMs,
    revealOffsetX,
    revealMode,
    revealOverlapMs,
    revealStaggerMs,
    revealConfigSignature,
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
      if (pointerActiveRef.current) {
        event.preventDefault()
        if (pointerLastAxisRef.current == null) return
        const currentAxis = event[axisClientKey]
        const delta = currentAxis - pointerLastAxisRef.current
        pointerLastAxisRef.current = currentAxis
        pointerAccumRef.current += delta

        const safePointerStepPx = Math.max(1, pointerStepPx)
        while (Math.abs(pointerAccumRef.current) >= safePointerStepPx) {
          const step = pointerAccumRef.current > 0 ? 1 : -1
          pointerAccumRef.current -= step * safePointerStepPx
          const panStep = naturalPanDirection ? -step : step
          stepActiveIndex(invertTouchSwipe ? -panStep : panStep)
        }
        return
      }

      if (!hoverActivationEnabled) return
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
      pendingPointerRef.current = { x: event.clientX, y: event.clientY }
      if (index === hoverIndexRef.current) {
        clearHoverCommit()
        return
      }

      pendingIndexRef.current = index
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flushPointerUpdate)
      }
    },
    [
      axisClientKey,
      clearHoverCommit,
      flushPointerUpdate,
      hoverActivationEnabled,
      invertTouchSwipe,
      markUserInteracted,
      naturalPanDirection,
      pointerStepPx,
      stepActiveIndex,
    ],
  )

  const onPointerLeave = useCallback(() => {
    if (pointerActiveRef.current) return
    cancelPendingHover()
  }, [cancelPendingHover])

  const onPointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      pointerActiveRef.current = false
      pointerLastAxisRef.current = null
      pointerAccumRef.current = 0
      setIsPanning(false)
      cancelPendingHover()
    },
    [cancelPendingHover],
  )

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const canPanPointer =
        event.pointerType === 'touch' ||
        (panningEnabled && (event.pointerType === 'mouse' || event.pointerType === 'pen'))
      if (!canPanPointer) return
      if (event.pointerType === 'mouse' && event.button !== 0) return

      pointerActiveRef.current = true
      pointerLastAxisRef.current = event[axisClientKey]
      pointerAccumRef.current = 0
      setIsPanning(true)
      markUserInteracted()
      event.currentTarget.setPointerCapture?.(event.pointerId)
    },
    [axisClientKey, markUserInteracted, panningEnabled],
  )

  const onPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!pointerActiveRef.current) return
    pointerActiveRef.current = false
    pointerLastAxisRef.current = null
    pointerAccumRef.current = 0
    setIsPanning(false)
    event.currentTarget.releasePointerCapture?.(event.pointerId)
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

      const safeWheelStepPx = Math.max(1, wheelStepPx)
      while (Math.abs(wheelAccumRef.current) >= safeWheelStepPx) {
        const step = wheelAccumRef.current > 0 ? 1 : -1
        wheelAccumRef.current -= step * safeWheelStepPx
        stepActiveIndex(step)
      }
    },
    [
      invertTouchSwipe,
      markUserInteracted,
      orientation,
      stepActiveIndex,
      wheelStepPx,
    ],
  )

  const excludeLeadItem = excludeLeadItemWhenActive && activeIndex !== 0
  const sizes = computeMagnificationDockSizes(items.length, equalizeSizes ? null : activeIndex, {
    activePct,
    excludeLeadItem,
  })
  const center = activeIndex ?? lastActiveIndexRef.current ?? (items.length - 1) / 2
  const last = Math.max(1, items.length - 1)
  const remainingSize = `calc(100% - ${Math.max(0, leadItemCollapseSizePx)}px)`
  const isHorizontal = orientation === 'horizontal'
  const allRevealed = prefersReducedMotion || activeRevealIndex >= items.length - 1
  const revealSchedule = computeMagnificationDockRevealSchedule({
    itemCount: items.length,
    staggerMs: revealStaggerMs,
    durationMs: revealDurationMs,
    overlapMs: revealOverlapMs,
    mode: revealMode,
    distribution: revealDistribution,
    cadenceAmount: revealCadenceAmount,
  })
  const axisSizePx = isHorizontal ? containerSize.width : containerSize.height
  const activeFillEnabled =
    isHorizontal &&
    activeFillSizePx != null &&
    Number.isFinite(activeFillSizePx) &&
    activeFillSizePx > 0
  const activeFillSize = Math.max(1, activeFillSizePx ?? 0)
  const activeFillPeek = Math.max(
    1,
    activeFillPeekPx ??
      Math.max(1, activeFillEnabled ? (axisSizePx - activeFillSize) / 2 : 1),
  )
  const activeFillStackStep = Math.max(2, Math.min(10, activeFillPeek * 0.5))
  // Progress-anchored "travelling deck": the active card's left edge moves from the
  // start edge (progress 0) to the end edge (progress 1) across the whole scroll,
  // and the remaining cards stack beneath on the far side. RTL mirrors it.
  const activeFillProgressMode = activeFillEnabled && activeFillAnchor === 'progress'
  const activeFillDeckRtl = activeFillDeckDirection === 'rtl'
  const activeFillTravelRange = Math.max(0, axisSizePx - activeFillSize)
  const activeFillProgress =
    items.length > 1 && activeIndex != null ? clamp01(activeIndex / (items.length - 1)) : 0
  const activeFillBaseX =
    (activeFillDeckRtl ? 1 - activeFillProgress : activeFillProgress) * activeFillTravelRange
  const activeFillDeckStep = Math.max(0, activeFillDeckStackPx)
  // Cumulative peek offset per depth: sliver(d) = max(floor, base·decay^(d-1)); the
  // active card's offset is 0, each further card peeks a bit less than the last. The
  // number of visible slivers therefore equals the real count of items on that side.
  const activeFillDeckDecayRatio = Math.min(0.98, Math.max(0.2, activeFillDeckDecay))
  const activeFillDeckMinStep = 2
  // Derive the base sliver so that `maxVisible` slivers exactly span the available
  // peek region (cumulative geometric sum = region). Cap by the configured base so
  // slivers never balloon when few are requested. This is what makes the requested
  // N actually show instead of the geometric tail clipping at the edge.
  const activeFillDeckVisibleN = Math.max(1, Math.round(activeFillDeckMaxVisible))
  const activeFillDeckFitBase =
    activeFillTravelRange > 0
      ? (activeFillTravelRange * (1 - activeFillDeckDecayRatio)) /
        (1 - Math.pow(activeFillDeckDecayRatio, activeFillDeckVisibleN))
      : activeFillDeckStep
  const activeFillDeckBase = Math.max(
    activeFillDeckMinStep,
    Math.min(activeFillDeckStep, activeFillDeckFitBase),
  )
  const activeFillDeckOffsets = (() => {
    const offsets = [0]
    let acc = 0
    for (let depth = 1; depth < Math.max(2, items.length); depth += 1) {
      acc += Math.max(
        activeFillDeckMinStep,
        activeFillDeckBase * Math.pow(activeFillDeckDecayRatio, depth - 1),
      )
      offsets[depth] = acc
    }
    return offsets
  })()
  // Fixed-anchor card deck (the touch metaphor): the active card sits at a
  // constant x (= back hint), pending cards fan to the right as a geometric tail
  // sized so exactly maxVisible slivers span the tail region, the previous card
  // peeks backHint at the left edge, and deeper past cards tuck fully beneath it.
  // LTR only — reading direction "future = right".
  const activeFillFixedMode = activeFillEnabled && activeFillAnchor === 'fixed'
  const fixedBackHintPx = Math.max(0, Math.round(activeFillBackHintPx))
  const fixedTailRegionPx = Math.max(
    0,
    axisSizePx - fixedBackHintPx - activeFillSize,
  )
  const fixedTailN = Math.max(1, Math.round(activeFillDeckMaxVisible))
  const fixedTailBase =
    fixedTailRegionPx > 0
      ? (fixedTailRegionPx * (1 - activeFillDeckDecayRatio)) /
        (1 - Math.pow(activeFillDeckDecayRatio, fixedTailN))
      : 0
  const fixedTailOffsets = (() => {
    if (!activeFillFixedMode) return [0]
    const offsets = [0]
    let acc = 0
    for (let depth = 1; depth < Math.max(2, items.length); depth += 1) {
      acc += Math.max(1, fixedTailBase * Math.pow(activeFillDeckDecayRatio, depth - 1))
      offsets[depth] = acc
    }
    return offsets
  })()
  const fixedTailScale = Math.min(1, Math.max(0.9, activeFillTailScale))
  // Rest pose of the whole deck for the current active index: x, scale and
  // z-order per item. The imperative tween animates between rest poses; the
  // swipe gesture interpolates from a rest pose toward its neighbour.
  const fixedRestPose = (() => {
    if (!activeFillFixedMode) return null
    const active = activeIndex ?? 0
    const xs: number[] = []
    const scales: number[] = []
    const zs: number[] = []
    for (let index = 0; index < items.length; index += 1) {
      const depth = index - active
      if (depth === 0) {
        xs.push(fixedBackHintPx)
        scales.push(1)
        zs.push(items.length + 2)
      } else if (depth > 0) {
        const clamped = Math.min(depth, fixedTailOffsets.length - 1)
        xs.push(fixedBackHintPx + (fixedTailOffsets[clamped] ?? fixedTailRegionPx))
        scales.push(Math.pow(fixedTailScale, Math.min(depth, fixedTailN)))
        zs.push(Math.max(1, items.length + 1 - depth))
      } else {
        xs.push(fixedBackHintPx - activeFillSize)
        scales.push(1)
        zs.push(Math.max(1, items.length + 1 + depth))
      }
    }
    return { xs, scales, zs }
  })()
  const layoutTransitionTimingFunction = prefersReducedMotion
    ? 'linear'
    : `${transitionEasing}, ${transitionEasing}, ${transitionEasing}, ${revealEasing}`
  const layoutTransitionDelay = prefersReducedMotion
    ? '0ms'
    : `${transitionDelayMs}ms, ${transitionDelayMs}ms, ${transitionDelayMs}ms, 0ms`
  const activeFillTransitionTimingFunction = prefersReducedMotion
    ? 'linear'
    : `${transitionEasing}, ${revealEasing}`
  const activeFillTransitionDelay = prefersReducedMotion
    ? '0ms'
    : `${transitionDelayMs}ms, 0ms`
  const contentLayoutPreserved =
    preserveContentLayout && contentSizeStrategy !== 'slot'
  // Transform mode replaces the horizontal flex-basis/width layout animation with
  // compositor transforms only: content boxes are fixed-size, opaque, and OVERLAP —
  // each card extends under the next sibling (painter's order), so a card's visible
  // window is defined solely by the next card's transform. One animated property,
  // one compositor clock: seams can't open even when the main thread stalls (an
  // animated clip-path window ticks on the main thread and lags the composited
  // transforms under load, which opened background gaps between cards). Requires a
  // measured container and layout-preserved content; vertical & slot-strategy docks
  // keep the flex model.
  const transformModeEnabled =
    isHorizontal &&
    contentLayoutPreserved &&
    !activeFillEnabled &&
    axisSizePx > 0
  // Rounded to an integer so card boxes land on whole CSS pixels — fractional
  // widths would leave card right edges permanently on sub-pixel boundaries.
  const resolvedContentSizePx = Math.round((() => {
    if (activeFillEnabled) return activeFillSize
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
  })())
  // Integer slot boundaries (cumulative, last pinned to the container edge). Every
  // slot is clamped to the card box width so each slot stays fully covered by its
  // own card — integer rounding could otherwise leave a 1px seam at the active card.
  const transformSlotBoundaries = (() => {
    if (!transformModeEnabled) return [] as number[]
    const leadPx = excludeLeadItem ? Math.max(0, leadItemCollapseSizePx) : 0
    const base = excludeLeadItem ? Math.max(0, axisSizePx - leadPx) : axisSizePx
    const maxSlotPx = Math.max(1, Math.floor(resolvedContentSizePx))
    const boundaries = [0]
    let acc = 0
    for (let index = 0; index < items.length; index += 1) {
      const widthPx =
        excludeLeadItem && index === 0
          ? leadPx
          : base * ((sizes[index] ?? 0) / 100)
      acc += widthPx
      const previous = boundaries[index]
      const next = index === items.length - 1 ? axisSizePx : Math.round(acc)
      boundaries.push(Math.min(next, previous + maxSlotPx))
    }
    // If the last boundary was pinned wider than a card box, walk boundaries back
    // so the final slot is coverable too (redistributes the ±1px rounding drift).
    for (let index = items.length - 1; index >= 1; index -= 1) {
      const minStart = boundaries[index + 1] - maxSlotPx
      if (boundaries[index] < minStart) boundaries[index] = minStart
    }
    return boundaries
  })()
  const containerClassName = [
    activeFillEnabled || transformModeEnabled
      ? 'relative h-full w-full overflow-hidden'
      : 'flex h-full w-full overflow-hidden',
    !activeFillEnabled && !transformModeEnabled
      ? (isHorizontal ? 'flex-row' : 'flex-col')
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const activeDistanceMax = (() => {
    if (activeIndex == null) return 1
    if (activeFillProgressMode || activeFillFixedMode) {
      return Math.max(1, activeFillDeckVisibleN)
    }
    if (activeFillEnabled) {
      return Math.max(1, Math.floor(items.length / 2))
    }
    return Math.max(1, activeIndex, items.length - 1 - activeIndex)
  })()
  const dimmingMaxOpacity = Math.max(0, Math.min(1, distanceDimmingMaxOpacity))
  const dimmingBaselineOpacity = Math.max(0, Math.min(dimmingMaxOpacity, distanceDimmingBaselineOpacity))
  const dimmingPower = Math.max(0.1, Math.min(4, distanceDimmingPower))

  // Keep the tween's motion parameters fresh without restarting it on knob
  // changes; the easing function is cached per CSS string.
  if (easingCacheRef.current.css !== transitionEasing) {
    easingCacheRef.current = {
      css: transitionEasing,
      fn: createCssEasingFunction(transitionEasing),
    }
  }
  transformMotionRef.current = {
    durationMs: Math.max(0, transitionMs),
    delayMs: Math.max(0, transitionDelayMs),
    easing: easingCacheRef.current.fn,
    reducedMotion: prefersReducedMotion,
  }

  // Imperative transform ownership: in transform mode (desktop) and fixed-deck
  // mode (touch) React never renders a `transform` on the items — the writers
  // below own it, so unrelated re-renders can't overwrite a tween or a gesture
  // mid-flight. Every write snaps to the device-pixel grid (fractional edges
  // alpha-blend with hidden content beneath — the 1px seam hairline).
  const imperativeTransformMode = transformModeEnabled || activeFillFixedMode
  const imperativeTargetXs = transformModeEnabled
    ? transformSlotBoundaries.slice(0, items.length)
    : fixedRestPose
      ? fixedRestPose.xs
      : []
  const imperativeTargetScales = activeFillFixedMode && fixedRestPose
    ? fixedRestPose.scales
    : null

  const writeImperativeTransforms = useCallback(
    (positions: number[], scales: number[] | null) => {
      const dpr =
        typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
      for (let index = 0; index < positions.length; index += 1) {
        const node = itemNodesRef.current[index]
        if (!node) continue
        const snapped = Math.round(positions[index] * dpr) / dpr
        const scale = scales ? scales[index] : 1
        node.style.transform =
          scale !== 1
            ? `translate3d(${snapped}px, 0, 0) scale(${scale})`
            : `translate3d(${snapped}px, 0, 0)`
      }
      transformTweenRef.current.applied = true
    },
    [],
  )

  // Tween the deck from its current (possibly mid-gesture) pose to a target
  // pose. Used by the targets effect (index/size changes) and by the swipe
  // gesture (cancel spring). Retargets from live values, like CSS transitions.
  const runImperativeTween = useCallback(
    (targetXs: number[], targetScales: number[] | null, durationMs: number) => {
      if (typeof window === 'undefined') return
      const state = transformTweenRef.current
      const params = transformMotionRef.current
      if (state.raf) {
        window.cancelAnimationFrame(state.raf)
        state.raf = 0
      }

      if (
        !state.positions ||
        state.positions.length !== targetXs.length ||
        params.reducedMotion ||
        durationMs <= 0
      ) {
        state.positions = targetXs.slice()
        state.scales = targetScales ? targetScales.slice() : null
        writeImperativeTransforms(state.positions, state.scales)
        return
      }

      const fromXs = state.positions.slice()
      const fromScales = state.scales ? state.scales.slice() : null
      const start = performance.now() + params.delayMs

      const stepFrame = (now: number) => {
        const progress = clamp01((now - start) / durationMs)
        const eased = params.easing(progress)
        const positions = state.positions!
        for (let index = 0; index < targetXs.length; index += 1) {
          positions[index] =
            fromXs[index] + (targetXs[index] - fromXs[index]) * eased
        }
        if (targetScales) {
          if (!state.scales) state.scales = targetScales.slice()
          for (let index = 0; index < targetScales.length; index += 1) {
            const fromScale = fromScales ? fromScales[index] : 1
            state.scales[index] =
              fromScale + (targetScales[index] - fromScale) * eased
          }
        }
        writeImperativeTransforms(positions, state.scales)
        if (progress < 1) {
          state.raf = window.requestAnimationFrame(stepFrame)
        } else {
          state.raf = 0
        }
      }
      state.raf = window.requestAnimationFrame(stepFrame)
    },
    [writeImperativeTransforms],
  )

  const transformTargetsKey = imperativeTransformMode
    ? `${transformModeEnabled ? 'slots' : 'deck'}:${items.length}:${imperativeTargetXs.join('|')}:${imperativeTargetScales ? imperativeTargetScales.join('|') : ''}`
    : 'off'
  useIsomorphicLayoutEffect(() => {
    const state = transformTweenRef.current
    if (!imperativeTransformMode || typeof window === 'undefined') {
      if (state.raf) {
        window.cancelAnimationFrame(state.raf)
        state.raf = 0
      }
      if (state.applied) {
        itemNodesRef.current.forEach((node) => {
          if (node) node.style.transform = ''
        })
        state.applied = false
      }
      state.positions = null
      state.scales = null
      return
    }

    // Already there (e.g. re-measure with identical targets): just re-write.
    if (
      state.positions &&
      state.positions.length === imperativeTargetXs.length &&
      imperativeTargetXs.every((x, index) => x === state.positions![index]) &&
      (!imperativeTargetScales ||
        (state.scales !== null &&
          imperativeTargetScales.every((s, index) => s === state.scales![index])))
    ) {
      writeImperativeTransforms(state.positions, state.scales)
      return
    }

    const override = tweenDurationOverrideRef.current
    tweenDurationOverrideRef.current = null
    runImperativeTween(
      imperativeTargetXs,
      imperativeTargetScales,
      override ?? transformMotionRef.current.durationMs,
    )

    return () => {
      if (state.raf) {
        window.cancelAnimationFrame(state.raf)
        state.raf = 0
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transformTargetsKey])

  // ── Swipe gesture (fixed-anchor deck) ───────────────────────────────────────
  const swipeInteractionEnabled =
    activeFillFixedMode && pointerInteraction === 'swipe' && items.length > 0
  swipeLayoutRef.current = {
    enabled: swipeInteractionEnabled,
    backHint: fixedBackHintPx,
    cardW: activeFillSize,
    tailOffsets: fixedTailOffsets,
    tailScale: fixedTailScale,
    tailN: fixedTailN,
    count: items.length,
    restXs: fixedRestPose ? fixedRestPose.xs : [],
    restScales: fixedRestPose ? fixedRestPose.scales : [],
    commitPct: Math.min(0.9, Math.max(0.1, swipeCommitPct)),
    velocity: Math.max(0.05, swipeVelocityThreshold),
    settleMs: Math.max(120, swipeSettleMs),
  }

  // Deck pose while dragging: forward (dx<0) the active card follows the finger
  // and the tail advances proportionally toward its next-shallower slots;
  // backward (dx>0) the previous card returns over the deck (z-boosted). At
  // either end the drag rubber-bands with diminishing resistance.
  const applySwipePose = useCallback(
    (dx: number) => {
      const layout = swipeLayoutRef.current
      const state = transformTweenRef.current
      if (!layout.enabled || !state.positions) return
      const active = Math.min(layout.count - 1, Math.max(0, getActiveIndex()))
      const hasPending = active < layout.count - 1
      const hasPast = active > 0
      const xs = layout.restXs.slice()
      const scales = layout.restScales.slice()
      const rubber = (value: number) => {
        const max = layout.cardW * 0.18
        return Math.sign(value) * max * (1 - 1 / (1 + Math.abs(value) / max))
      }
      const tailOffset = (depth: number) =>
        depth <= 0
          ? 0
          : layout.tailOffsets[Math.min(depth, layout.tailOffsets.length - 1)] ?? 0

      if (dx < 0) {
        if (!hasPending) {
          xs[active] = layout.restXs[active] + rubber(dx)
        } else {
          const progress = clamp01(-dx / layout.cardW)
          xs[active] = layout.restXs[active] + dx
          for (let index = active + 1; index < layout.count; index += 1) {
            const depth = index - active
            xs[index] =
              layout.backHint +
              tailOffset(depth) +
              (tailOffset(depth - 1) - tailOffset(depth)) * progress
            const scaleFrom = Math.pow(layout.tailScale, Math.min(depth, layout.tailN))
            const scaleTo = Math.pow(
              layout.tailScale,
              Math.min(Math.max(0, depth - 1), layout.tailN),
            )
            scales[index] = scaleFrom + (scaleTo - scaleFrom) * progress
          }
        }
      } else if (dx > 0) {
        if (!hasPast) {
          xs[active] = layout.restXs[active] + rubber(dx)
        } else {
          const returning = active - 1
          const target = layout.backHint
          const raw = layout.backHint - layout.cardW + dx
          xs[returning] = raw > target ? target + rubber(raw - target) : raw
          const node = itemNodesRef.current[returning]
          const swipe = swipeStateRef.current
          if (node && swipe.boostedIndex !== returning) {
            swipe.boostedIndex = returning
            swipe.boostedZ = String(layout.count + 3)
            node.style.zIndex = swipe.boostedZ
          }
        }
      }

      state.positions = xs
      state.scales = scales
      writeImperativeTransforms(xs, scales)
    },
    [getActiveIndex, writeImperativeTransforms],
  )

  const endSwipeGesture = useCallback(
    (direction: 0 | 1 | -1, velocityPxMs: number) => {
      const layout = swipeLayoutRef.current
      const swipe = swipeStateRef.current
      onSwipeStateChange?.(false)

      if (direction !== 0) {
        // Velocity-informed settle: faster flicks land sooner.
        const speedCut = Math.min(240, Math.abs(velocityPxMs) * 140)
        tweenDurationOverrideRef.current = Math.max(180, layout.settleMs - speedCut)
        stepActiveIndex(direction)
      } else {
        runImperativeTween(
          layout.restXs.slice(),
          layout.restScales.slice(),
          Math.min(320, layout.settleMs),
        )
      }

      if (swipe.boostedIndex >= 0) {
        const boosted = swipe.boostedIndex
        const boostedZ = swipe.boostedZ
        swipe.boostedIndex = -1
        swipe.boostedZ = ''
        if (swipe.zClearTimer) window.clearTimeout(swipe.zClearTimer)
        swipe.zClearTimer = window.setTimeout(() => {
          swipe.zClearTimer = 0
          const node = itemNodesRef.current[boosted]
          // Only clear if React hasn't already re-written it (commit re-render).
          if (node && node.style.zIndex === boostedZ) node.style.zIndex = ''
        }, layout.settleMs + 80)
      }
    },
    [onSwipeStateChange, runImperativeTween, stepActiveIndex],
  )

  const handleSwipePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>): boolean => {
      const layout = swipeLayoutRef.current
      if (!layout.enabled) return false
      const isTouch = event.pointerType === 'touch'
      const isPointerPan =
        panningEnabled &&
        (event.pointerType === 'mouse' || event.pointerType === 'pen')
      if (!isTouch && !isPointerPan) return false
      if (event.pointerType === 'mouse' && event.button !== 0) return false

      const swipe = swipeStateRef.current
      swipe.pointerId = event.pointerId
      swipe.tracking = true
      swipe.locked = null
      swipe.startX = event.clientX
      swipe.startY = event.clientY
      swipe.dx = 0
      swipe.samples = [{ t: event.timeStamp, x: event.clientX }]
      markUserInteracted()
      return true
    },
    [markUserInteracted, panningEnabled],
  )

  const handleSwipePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>): boolean => {
      const swipe = swipeStateRef.current
      const layout = swipeLayoutRef.current
      if (!layout.enabled || !swipe.tracking || event.pointerId !== swipe.pointerId) {
        return false
      }
      const dxTotal = event.clientX - swipe.startX
      const dyTotal = event.clientY - swipe.startY

      // Direction lock: the first ~10px decide horizontal swipe vs vertical
      // page scroll (touch-action: pan-y lets the browser own the vertical).
      if (!swipe.locked) {
        if (Math.max(Math.abs(dxTotal), Math.abs(dyTotal)) < 10) return true
        swipe.locked = Math.abs(dxTotal) >= Math.abs(dyTotal) ? 'x' : 'y'
        if (swipe.locked === 'x') {
          event.currentTarget.setPointerCapture?.(swipe.pointerId)
          setIsPanning(true)
          onSwipeStateChange?.(true)
        }
      }
      if (swipe.locked === 'y') return true

      event.preventDefault()
      swipe.dx = dxTotal
      swipe.samples.push({ t: event.timeStamp, x: event.clientX })
      if (swipe.samples.length > 8) swipe.samples.shift()
      applySwipePose(dxTotal)
      return true
    },
    [applySwipePose, onSwipeStateChange],
  )

  const handleSwipePointerEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>, cancelled: boolean): boolean => {
      const swipe = swipeStateRef.current
      const layout = swipeLayoutRef.current
      if (!layout.enabled || !swipe.tracking || event.pointerId !== swipe.pointerId) {
        return false
      }
      const wasHorizontal = swipe.locked === 'x'
      swipe.tracking = false
      swipe.locked = null
      swipe.pointerId = -1
      setIsPanning(false)
      try {
        event.currentTarget.releasePointerCapture?.(event.pointerId)
      } catch {
        /* capture may already be gone (pointercancel) */
      }
      if (!wasHorizontal) return true
      if (cancelled) {
        endSwipeGesture(0, 0)
        return true
      }

      // Flick velocity from the recent (~90ms) samples.
      const nowT = event.timeStamp
      const recent = swipe.samples.filter((sample) => nowT - sample.t <= 90)
      const anchor = recent[0] ?? swipe.samples[0]
      const velocity =
        anchor && nowT > anchor.t ? (event.clientX - anchor.x) / (nowT - anchor.t) : 0

      const active = Math.min(layout.count - 1, Math.max(0, getActiveIndex()))
      const hasPending = active < layout.count - 1
      const hasPast = active > 0
      const overDistance = Math.abs(swipe.dx) > layout.commitPct * layout.cardW
      const overVelocity = Math.abs(velocity) > layout.velocity

      let direction: 0 | 1 | -1 = 0
      if (swipe.dx < 0 && hasPending && (overDistance || (overVelocity && velocity < 0))) {
        direction = 1
      } else if (
        swipe.dx > 0 &&
        hasPast &&
        (overDistance || (overVelocity && velocity > 0))
      ) {
        direction = -1
      }
      endSwipeGesture(direction, velocity)
      return true
    },
    [endSwipeGesture, getActiveIndex],
  )

  const handleDockPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (handleSwipePointerDown(event)) return
      onPointerDown(event)
    },
    [handleSwipePointerDown, onPointerDown],
  )
  const handleDockPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (handleSwipePointerMove(event)) return
      onPointerMove(event)
    },
    [handleSwipePointerMove, onPointerMove],
  )
  const handleDockPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (handleSwipePointerEnd(event, false)) return
      onPointerUp(event)
    },
    [handleSwipePointerEnd, onPointerUp],
  )
  const handleDockPointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (handleSwipePointerEnd(event, true)) return
      onPointerCancel(event)
    },
    [handleSwipePointerEnd, onPointerCancel],
  )

  return (
    <div
      ref={containerRef}
      className={containerClassName}
      style={{
        touchAction:
          (panningEnabled || swipeInteractionEnabled) && isHorizontal
            ? 'pan-y'
            : 'none',
        opacity: dockVisible ? 1 : 0,
        transitionProperty: 'opacity',
        transitionTimingFunction: revealEasing,
        transitionDuration: '0ms',
        ...(style ?? {}),
        cursor: panningEnabled && panCursorEnabled
          ? isPanning
            ? 'grabbing'
            : 'grab'
          : style?.cursor,
      }}
      onPointerMove={handleDockPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerCancel={handleDockPointerCancel}
      onPointerDown={handleDockPointerDown}
      onPointerUp={handleDockPointerUp}
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
        const scheduledRevealDurationMs = revealSchedule[index]?.durationMs ?? revealDurationMs
        const itemRevealDurationMs =
          prefersReducedMotion || !revealTransitionsEnabled ? 0 : scheduledRevealDurationMs
        const layoutTransitionDuration = prefersReducedMotion
          ? '0ms'
          : `${transitionMs}ms, ${transitionMs}ms, ${transitionMs}ms, ${itemRevealDurationMs}ms`
        const activeFillTransitionDuration = prefersReducedMotion
          ? '0ms'
          : `${transitionMs}ms, ${itemRevealDurationMs}ms`
        const distance = activeIndex == null ? 0 : Math.abs(index - activeIndex)
        const proximity = activeIndex == null ? 0 : clamp01(1 / (distance + 1))
        let signedDistance = activeIndex == null ? 0 : index - activeIndex
        if (activeFillEnabled && activeIndex != null && items.length > 1) {
          const halfCount = items.length / 2
          if (signedDistance > halfCount) signedDistance -= items.length
          if (signedDistance < -halfCount) signedDistance += items.length
        }
        const activeFillDirection =
          signedDistance === 0 ? 0 : signedDistance > 0 ? 1 : -1
        const activeFillDistance = Math.abs(signedDistance)
        const activeFillOffsetPx =
          activeFillDirection *
          (activeFillDistance === 0
            ? 0
            : activeFillPeek + Math.max(0, activeFillDistance - 1) * activeFillStackStep)
        // Progress mode uses the un-wrapped signed distance so the deck reads as a
        // linear start→end stack (no circular wrap), offset from the travelling anchor.
        const deckSigned = activeIndex == null ? 0 : index - activeIndex
        const deckDepth = Math.min(Math.abs(deckSigned), activeFillDeckOffsets.length - 1)
        const deckMagnitude = activeFillDeckOffsets[deckDepth] ?? 0
        const deckXpx =
          activeFillBaseX + Math.sign(deckSigned) * deckMagnitude * (activeFillDeckRtl ? -1 : 1)
        const distanceForDimming = activeFillProgressMode || activeFillFixedMode
          ? Math.abs(deckSigned)
          : activeFillEnabled
            ? activeFillDistance
            : distance
        const distanceDimmingOpacity = resolveDistanceDimmingOpacity({
          enabled: distanceDimmingEnabled,
          isActive,
          distance: distanceForDimming,
          activeDistanceMax,
          easing: distanceDimmingEasing,
          power: dimmingPower,
          maxOpacity: dimmingMaxOpacity,
          baselineOpacity: dimmingBaselineOpacity,
        })
        const transformSlotWidth = transformModeEnabled
          ? Math.max(
              0,
              (transformSlotBoundaries[index + 1] ?? 0) -
                (transformSlotBoundaries[index] ?? 0),
            )
          : 0
        const itemStyle: CSSProperties = activeFillProgressMode
          ? {
              position: 'absolute',
              left: 0,
              top: 0,
              width: `${activeFillSize}px`,
              minWidth: `${activeFillSize}px`,
              height: '100%',
              minHeight: 0,
              zIndex: isActive
                ? items.length + 2
                : Math.max(1, items.length + 1 - Math.abs(deckSigned)),
              opacity: isRevealed ? 1 : 0,
              overflow: activeItemBoxShadow ? 'visible' : 'hidden',
              transform: `translate3d(${deckXpx}px, 0, 0)`,
              transitionProperty: 'transform, opacity',
              transitionTimingFunction: activeFillTransitionTimingFunction,
              transitionDuration: activeFillTransitionDuration,
              transitionDelay: activeFillTransitionDelay,
              willChange: 'transform',
            }
          : activeFillFixedMode
          ? {
              position: 'absolute',
              left: 0,
              top: 0,
              width: `${activeFillSize}px`,
              minWidth: `${activeFillSize}px`,
              height: '100%',
              minHeight: 0,
              zIndex: fixedRestPose ? fixedRestPose.zs[index] : undefined,
              opacity: isRevealed ? 1 : 0,
              overflow: activeItemBoxShadow ? 'visible' : 'hidden',
              // No `transform` here: the imperative tween / swipe gesture owns
              // it (device-pixel snapped). CSS only fades opacity.
              transformOrigin: '0% 50%',
              transitionProperty: 'opacity',
              transitionTimingFunction: revealEasing,
              transitionDuration: prefersReducedMotion
                ? '0ms'
                : `${itemRevealDurationMs}ms`,
              willChange: 'transform',
            }
          : activeFillEnabled
          ? {
              position: 'absolute',
              left: '50%',
              top: 0,
              width: `${activeFillSize}px`,
              minWidth: `${activeFillSize}px`,
              height: '100%',
              minHeight: 0,
              zIndex: isActive
                ? items.length + 2
                : Math.max(1, items.length + 1 - activeFillDistance),
              opacity: isRevealed ? 1 : 0,
              overflow: activeItemBoxShadow ? 'visible' : 'hidden',
              transform: `translate3d(calc(-50% + ${activeFillOffsetPx}px), 0, 0)`,
              transitionProperty: 'transform, opacity',
              transitionTimingFunction: activeFillTransitionTimingFunction,
              transitionDuration: activeFillTransitionDuration,
              transitionDelay: activeFillTransitionDelay,
              willChange: 'transform',
            }
          : transformModeEnabled
          ? {
              position: 'absolute',
              left: 0,
              top: 0,
              width: `${resolvedContentSizePx}px`,
              minWidth: `${resolvedContentSizePx}px`,
              height: '100%',
              minHeight: 0,
              zIndex: isLeadCollapsed ? 2 : undefined,
              opacity: isRevealed ? 1 : 0,
              // No `transform` here: the device-pixel-snapped rAF tween owns it
              // (see the transformTargetsKey effect) — CSS only fades opacity.
              transitionProperty: 'opacity',
              transitionTimingFunction: revealEasing,
              transitionDuration: prefersReducedMotion
                ? '0ms'
                : `${itemRevealDurationMs}ms`,
              willChange: 'transform',
            }
          : {
              flexBasis: itemBasis,
              flex: `0 0 ${itemBasis}`,
              zIndex: isLeadCollapsed ? 2 : undefined,
              opacity: isRevealed ? 1 : 0,
              overflow: activeItemBoxShadow ? 'visible' : 'hidden',
              position: 'relative',
              transitionProperty: isHorizontal
                ? 'flex-basis, min-width, width, opacity'
                : 'flex-basis, min-height, height, opacity',
              transitionTimingFunction: layoutTransitionTimingFunction,
              transitionDuration: layoutTransitionDuration,
              transitionDelay: layoutTransitionDelay,
              ...(isHorizontal
                ? {
                    width: itemBasis,
                    minWidth: itemBasis,
                    height: '100%',
                    minHeight: 0,
                  }
                : index === 0
                  ? {
                      height: itemBasis,
                      minHeight: itemBasis,
                      width: '100%',
                      minWidth: 0,
                    }
                  : {
                      // Every item but the first overlaps the previous one by
                      // SEAM_OVERLAP_PX (grown by that amount, pulled up by
                      // the same amount via marginTop, so total stacked
                      // height is unchanged) — painting over, rather than
                      // exposing, whatever hairline gap independent
                      // device-pixel rounding of two adjacent fractional-
                      // height flex items leaves between them. Plain block
                      // flow paints later siblings on top, so the overlap is
                      // invisible except at the seam it's covering.
                      height: `calc(${itemBasis} + ${SEAM_OVERLAP_PX}px)`,
                      minHeight: `calc(${itemBasis} + ${SEAM_OVERLAP_PX}px)`,
                      marginTop: `-${SEAM_OVERLAP_PX}px`,
                      width: '100%',
                      minWidth: 0,
                    }),
            }
        const contentStyle: CSSProperties = activeFillEnabled
          ? {
              width: `${activeFillSize}px`,
              minWidth: `${activeFillSize}px`,
              height: '100%',
              minHeight: 0,
              maxWidth: 'none',
              maxHeight: 'none',
            }
          : contentLayoutPreserved
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
            ref={(node) => {
              itemNodesRef.current[index] = node
            }}
            data-magnification-dock-index={index}
            data-magnification-dock-slot-width={
              transformModeEnabled ? transformSlotWidth : undefined
            }
            data-active={isActive ? 'true' : 'false'}
            data-revealed={isRevealed ? 'true' : 'false'}
            className="shrink-0 min-h-0 min-w-0 relative"
            style={itemStyle}
          >
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  ...contentStyle,
                  // 'none' (not 'translate3d(0, 0, 0)') once revealed: CSS
                  // transitions interpolate to/from 'none' as the identity
                  // transform, so the reveal animation is unaffected, but the
                  // settled, steady-state box no longer carries a transform
                  // at all — nothing left to keep it on its own compositing
                  // layer (see the willChange comment below for why that
                  // matters for adjacent fractional-height items).
                  transform: isRevealed
                    ? 'none'
                    : `translate3d(${revealOffsetX}, 0, 0)`,
                  transitionProperty: 'transform',
                  transitionTimingFunction: revealEasing,
                  transitionDuration: prefersReducedMotion
                    ? '0ms'
                    : `${itemRevealDurationMs}ms`,
                  // Transient, not permanent: once revealed this transform never
                  // changes again, so there is nothing left to promote a GPU
                  // layer for. Keeping every item's reveal wrapper promoted for
                  // its whole lifetime lets adjacent fractional-height items
                  // (e.g. a vertical/slot dock in a non-integer-height column)
                  // round their shared boundary to different device pixels,
                  // showing a hairline seam of whatever is behind the dock.
                  willChange: isRevealed ? 'auto' : 'transform',
                }}
              >
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
                  distanceDimmingOpacity,
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
          </div>
        )
      })}
    </div>
  )
}
