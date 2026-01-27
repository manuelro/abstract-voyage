import { useEffect, useMemo, useRef, useState } from 'react'
import {
  stopsToCssGradient,
  type CssGradientKind,
  type CssGradientOptions,
} from '../../../helpers/cssGradient'
import {
  generateHarmonicGradient,
  type GradientConfig,
  type GradientStop,
} from '../../../helpers/harmonicGradient'
import { BASE_SYNTH_GRADIENT_CONFIG } from '../gradients/synthGradient'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import PostMetaRow from './PostMetaRow'

type GradientStopInput = GradientStop

type GradientControls = {
  baseHue?: number
  hueScheme?: GradientConfig['hueScheme']
  lightnessRange?: GradientConfig['lightnessRange']
  chromaRange?: GradientConfig['chromaRange']
  mode?: GradientConfig['mode']
  stops?: number
  variance?: number
  centerStretch?: number
  seed?: number
}

type GradientLayoutControls = {
  gradientType?: CssGradientKind
  angleDeg?: number
  anchorXPercent?: number
  anchorYPercent?: number
  radialShape?: CssGradientOptions['radialShape']
  radialExtent?: CssGradientOptions['radialExtent']
  _toggle?: number
  scale?: number
  scaleX?: number
  scaleY?: number
}

type PostCardProps = GradientControls &
  GradientLayoutControls & {
    title: string
    subtitle?: string
    excerpt?: string
    topic?: string
    date?: string
    readingTime?: string
    href?: string
    children?: React.ReactNode
    expanded?: boolean
    expandOnHover?: boolean
    onExpandedChange?: (expanded: boolean) => void
    onCollapseComplete?: () => void
    deemphasized?: boolean
    className?: string
    noPadding?: boolean
    minHeight?: string
    style?: React.CSSProperties
    titleStyle?: React.CSSProperties
    excerptStyle?: React.CSSProperties
    titleScale?: number
    contentStyle?: React.CSSProperties
    /**
     * Duration (ms) used for background crossfade + content fade.
     * Avoid Tailwind dynamic duration classes; this stays build-safe.
     */
    backgroundTransitionMs?: number
    backgroundTransitionDelayMs?: number
    backgroundTransitionEasing?: string
    onMouseEnter?: React.MouseEventHandler<HTMLElement>
    onMouseLeave?: React.MouseEventHandler<HTMLElement>
    hideCta?: boolean
    onReadClick?: () => void
    onActiveCardClick?: () => void
  }

const DEFAULT_HEIGHT = 'calc(100dvh / 10)'
const DEFAULT_PIVOT = { xPercent: 50, yPercent: 50 }
const ACTIVE_TEXT_SCALE_CLASS =
  'scale-[1.04] sm:scale-[1.06] md:scale-[1.08] lg:scale-[1.10]'
const ACTIVE_TITLE_PADDING_CLASS = ''
const ACTIVE_EXCERPT_PADDING_CLASS = ''
const POSTCARD_MOTION = {
  text: {
    durationMs: 700,
    delayMs: 0,
    easing: 'cubic-bezier(0.22,1,0.36,1)',
  },
  readingTime: {
    durationMs: 250,
    delayMs: 250,
    easing: 'linear',
  },
  cta: {
    durationMs: 250,
    delayMs: 250,
  },
} as const

const TITLE_TRANSITION_CLASS =
  'transform-gpu transition-[padding,opacity,transform,font-size] motion-reduce:transition-none'
const TITLE_INNER_TRANSITION_CLASS =
  'inline-block transform-gpu origin-top-left transition-[opacity,transform,font-size] motion-reduce:transition-none'
const EXCERPT_TRANSITION_CLASS =
  'transform-gpu transition-[padding,opacity,transform,font-size] motion-reduce:transition-none'

const buildStops = (controls: GradientControls): GradientStopInput[] => {
  return generateHarmonicGradient({
    ...BASE_SYNTH_GRADIENT_CONFIG,
    ...controls,
    stops: controls.stops ?? BASE_SYNTH_GRADIENT_CONFIG.stops,
  })
}

const clampPercent = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback
  return Math.max(0, Math.min(100, value))
}

const resolveScale = (value: number | undefined) => {
  if (!Number.isFinite(value) || value == null || value <= 0) return 1
  return value
}

const computeBackgroundPosition = (
  pivotPercent: number,
  placementPercent: number,
  scale: number,
) => {
  const pivot = clampPercent(pivotPercent, DEFAULT_PIVOT.xPercent) / 100
  const placement = clampPercent(placementPercent, DEFAULT_PIVOT.xPercent) / 100
  const denom = 1 - scale

  if (!Number.isFinite(scale) || Math.abs(denom) < 1e-6) {
    return `calc(${placement * 100}% - ${pivot * 100}%)`
  }

  return `${((placement - pivot * scale) / denom) * 100}%`
}

type BackgroundLayer = {
  id: string
  key: string
  style: React.CSSProperties
  opacity: number
  /**
   * Timestamp (performance.now) after which the layer can be removed.
   */
  removeAt?: number
}

type BaseBackground = {
  key: string
  style: React.CSSProperties
}

export default function PostCard({
  title,
  subtitle,
  excerpt,
  topic,
  date,
  readingTime,
  href,
  children,
  expanded,
  expandOnHover = false,
  onExpandedChange,
  onCollapseComplete,
  deemphasized = false,
  className,
  noPadding = false,
  minHeight = DEFAULT_HEIGHT,
  style,
  titleStyle,
  excerptStyle,
  titleScale,
  contentStyle,
  backgroundTransitionMs = 5000,
  backgroundTransitionDelayMs = 1000,
  backgroundTransitionEasing = 'ease-in-out',
  onMouseEnter,
  onMouseLeave,
  hideCta = false,
  onReadClick,
  onActiveCardClick,
  gradientType = 'linear',
  angleDeg = 9,
  anchorXPercent = 0,
  anchorYPercent = 1,
  radialShape = 'circle',
  radialExtent,
  scale,
  scaleX = 0,
  scaleY = 0,
  baseHue,
  hueScheme,
  lightnessRange,
  chromaRange,
  mode,
  stops,
  variance,
  centerStretch,
  seed,
}: PostCardProps) {
  const [isExpandedInternal, setIsExpandedInternal] = useState(false)
  const [isContentVisible, setIsContentVisible] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()

  const isControlled = typeof expanded === 'boolean'
  const isExpanded = isControlled ? expanded : isExpandedInternal

  const setExpanded = (next: boolean) => {
    if (!isControlled) setIsExpandedInternal(next)
    onExpandedChange?.(next)
  }

  useEffect(() => {
    setIsContentVisible(isExpanded)
    if (!isExpanded) onCollapseComplete?.()
  }, [isExpanded, onCollapseComplete])

  // ----- Gradient computation (unchanged) -----
  const anchorProvided =
    typeof anchorXPercent === 'number' && typeof anchorYPercent === 'number'

  const resolvedAnchor = anchorProvided
    ? {
        xPercent: clampPercent(anchorXPercent as number, DEFAULT_PIVOT.xPercent),
        yPercent: clampPercent(anchorYPercent as number, DEFAULT_PIVOT.yPercent),
      }
    : undefined

  const hasScale = scale != null || scaleX != null || scaleY != null
  const layoutEnabled = Boolean(resolvedAnchor || hasScale)

  const layoutAnchor = resolvedAnchor ?? DEFAULT_PIVOT
  const layoutPlacement = layoutAnchor
  const resolvedScaleX = resolveScale(scaleX ?? scale)
  const resolvedScaleY = resolveScale(scaleY ?? scale)

  const gradientStops = useMemo(
    () =>
      buildStops({
        baseHue,
        hueScheme,
        lightnessRange,
        chromaRange,
        mode,
        stops,
        variance,
        centerStretch,
        seed,
      }),
    [
      baseHue,
      hueScheme,
      lightnessRange,
      chromaRange,
      mode,
      stops,
      variance,
      centerStretch,
      seed,
    ],
  )

  const gradient = useMemo(
    () =>
      stopsToCssGradient({
        type: gradientType,
        stops: gradientStops.map((stop) => ({ color: stop.color, at: stop.at })),
        angleDeg,
        anchorXPercent: resolvedAnchor?.xPercent,
        anchorYPercent: resolvedAnchor?.yPercent,
        radialShape,
        radialExtent,
      }),
    [
      gradientType,
      gradientStops,
      angleDeg,
      resolvedAnchor?.xPercent,
      resolvedAnchor?.yPercent,
      radialShape,
      radialExtent,
    ],
  )

  const backgroundStyles = useMemo<React.CSSProperties>(
    () =>
      layoutEnabled
        ? {
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${resolvedScaleX * 100}% ${resolvedScaleY * 100}%`,
            backgroundPosition: `${computeBackgroundPosition(
              layoutAnchor.xPercent,
              layoutPlacement.xPercent,
              resolvedScaleX,
            )} ${computeBackgroundPosition(
              layoutAnchor.yPercent,
              layoutPlacement.yPercent,
              resolvedScaleY,
            )}`,
          }
        : {
            backgroundRepeat: 'no-repeat',
          },
    [
      layoutEnabled,
      layoutAnchor.xPercent,
      layoutAnchor.yPercent,
      layoutPlacement.xPercent,
      layoutPlacement.yPercent,
      resolvedScaleX,
      resolvedScaleY,
    ],
  )

  const nextLayerStyle = useMemo<React.CSSProperties>(
    () => ({
      backgroundImage: gradient,
      ...backgroundStyles,
    }),
    [gradient, backgroundStyles],
  )

  const nextLayerKey = useMemo(
    () =>
      [
        gradient,
        backgroundStyles.backgroundRepeat ?? '',
        backgroundStyles.backgroundSize ?? '',
        backgroundStyles.backgroundPosition ?? '',
      ].join('|'),
    [gradient, backgroundStyles],
  )
  const nextLayerRef = useRef<BaseBackground>({ key: nextLayerKey, style: nextLayerStyle })
  useEffect(() => {
    nextLayerRef.current = { key: nextLayerKey, style: nextLayerStyle }
  }, [nextLayerKey, nextLayerStyle])

  // ----- Background crossfade (base layer always visible) -----
  const layerIdRef = useRef(0)
  const cleanupTimerRef = useRef<number | null>(null)
  const fadeRaf1Ref = useRef<number | null>(null)
  const fadeRaf2Ref = useRef<number | null>(null)

  const [baseBg, setBaseBg] = useState<BaseBackground>(() => ({
    key: nextLayerKey,
    style: nextLayerStyle,
  }))
  const baseBgRef = useRef<BaseBackground>(baseBg)
  useEffect(() => {
    baseBgRef.current = baseBg
  }, [baseBg])

  // Outgoing overlays that fade OUT, revealing base behind.
  const [fadeLayers, setFadeLayers] = useState<BackgroundLayer[]>([])
  const fadeLayersRef = useRef<BackgroundLayer[]>(fadeLayers)
  useEffect(() => {
    fadeLayersRef.current = fadeLayers
  }, [fadeLayers])
  const transitionSeqRef = useRef(0)

  const resolvedBackgroundTransitionMs = Number.isFinite(backgroundTransitionMs)
    ? Math.max(0, backgroundTransitionMs)
    : 0
  const resolvedBackgroundTransitionDelayMs = Number.isFinite(
    backgroundTransitionDelayMs,
  )
    ? Math.max(0, backgroundTransitionDelayMs)
    : 0
  const resolvedBackgroundTransitionEasing =
    typeof backgroundTransitionEasing === 'string' && backgroundTransitionEasing.trim()
      ? backgroundTransitionEasing
      : 'linear'

  useEffect(() => {
    if (typeof window === 'undefined') return

    const commitBackground = () => {
      setFadeLayers([])
      setBaseBg(nextLayerRef.current)
    }

    const handleBlur = () => commitBackground()
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        commitBackground()
      }
    }

    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (cleanupTimerRef.current != null) {
        window.clearTimeout(cleanupTimerRef.current)
        cleanupTimerRef.current = null
      }
      if (fadeRaf1Ref.current != null) {
        window.cancelAnimationFrame(fadeRaf1Ref.current)
        fadeRaf1Ref.current = null
      }
      if (fadeRaf2Ref.current != null) {
        window.cancelAnimationFrame(fadeRaf2Ref.current)
        fadeRaf2Ref.current = null
      }
    }
  }, [])

  useEffect(() => {
    transitionSeqRef.current += 1
    const seq = transitionSeqRef.current

    if (baseBgRef.current.key === nextLayerKey) return

    if (cleanupTimerRef.current != null) {
      window.clearTimeout(cleanupTimerRef.current)
      cleanupTimerRef.current = null
    }
    if (fadeRaf1Ref.current != null) {
      window.cancelAnimationFrame(fadeRaf1Ref.current)
      fadeRaf1Ref.current = null
    }
    if (fadeRaf2Ref.current != null) {
      window.cancelAnimationFrame(fadeRaf2Ref.current)
      fadeRaf2Ref.current = null
    }

    // PRM or zero duration: swap instantly
    if (prefersReducedMotion || resolvedBackgroundTransitionMs <= 0) {
      setFadeLayers([])
      setBaseBg({ key: nextLayerKey, style: nextLayerRef.current.style })
      return
    }

    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now()

    // If a fade is already visible, avoid stacking a full-opacity overlay on top
    // (that would "pop" over an in-flight composite). Just update the base behind it.
    const hasVisibleOverlay = fadeLayersRef.current.some((l) => l.opacity > 0.001)
    const hasAnyOverlay = fadeLayersRef.current.length > 0

    const previousBase = baseBgRef.current
    setBaseBg({ key: nextLayerKey, style: nextLayerRef.current.style })

    if (hasAnyOverlay) {
      fadeRaf1Ref.current = window.requestAnimationFrame(() => {
        if (seq !== transitionSeqRef.current) return
        setFadeLayers((prev) =>
          prev.map((layer) => ({ ...layer, opacity: 0 })),
        )
      })
    }

    if (!hasVisibleOverlay) {
      const removeAt =
        now + resolvedBackgroundTransitionDelayMs + resolvedBackgroundTransitionMs + 20
      const id = String(layerIdRef.current++)

      // Replace any stale/invisible layers with the new outgoing overlay.
      setFadeLayers([
        {
          id,
          key: previousBase.key,
          style: previousBase.style,
          opacity: 1,
          removeAt,
        },
      ])

      // Trigger fade-out on next paint.
      fadeRaf1Ref.current = window.requestAnimationFrame(() => {
        if (seq !== transitionSeqRef.current) return
        setFadeLayers((prev) =>
          prev.map((layer) =>
            layer.id === id ? { ...layer, opacity: 0 } : layer,
          ),
        )
      })
    }

    cleanupTimerRef.current = window.setTimeout(() => {
      if (seq !== transitionSeqRef.current) return
      const t =
        typeof performance !== 'undefined' ? performance.now() : Date.now()
      setFadeLayers((prev) =>
        prev.filter((layer) => {
          if (layer.opacity !== 0) return true
          if (layer.removeAt == null) return false
          return layer.removeAt > t
        }),
      )
      cleanupTimerRef.current = null
    }, resolvedBackgroundTransitionDelayMs + resolvedBackgroundTransitionMs + 40)
  }, [
    nextLayerKey,
    prefersReducedMotion,
    resolvedBackgroundTransitionMs,
    resolvedBackgroundTransitionDelayMs,
  ])

  const transitionStyle: React.CSSProperties = prefersReducedMotion
    ? { transitionDuration: '0ms', transitionDelay: '0ms' }
    : {
        transitionDuration: `${resolvedBackgroundTransitionMs}ms`,
        transitionDelay: `${resolvedBackgroundTransitionDelayMs}ms`,
        transitionTimingFunction: resolvedBackgroundTransitionEasing,
      }
  const textTransitionStyle: React.CSSProperties = prefersReducedMotion
    ? { transitionDuration: '0ms', transitionDelay: '0ms' }
    : {
        transitionDuration: `${POSTCARD_MOTION.text.durationMs}ms`,
        transitionDelay: `${POSTCARD_MOTION.text.delayMs}ms`,
        transitionTimingFunction: POSTCARD_MOTION.text.easing,
      }
  const readingTimeTransitionStyle: React.CSSProperties = prefersReducedMotion
    ? { transitionDuration: '0ms', transitionDelay: '0ms' }
    : {
        transitionDuration: `${POSTCARD_MOTION.readingTime.durationMs}ms`,
        transitionDelay: `${POSTCARD_MOTION.readingTime.delayMs}ms`,
        transitionTimingFunction: POSTCARD_MOTION.readingTime.easing,
      }
  const ctaTransitionStyle: React.CSSProperties = prefersReducedMotion
    ? { transitionDuration: '0ms', transitionDelay: '0ms' }
    : {
        transitionDuration: `${POSTCARD_MOTION.cta.durationMs}ms`,
        transitionDelay: `${POSTCARD_MOTION.cta.delayMs}ms`,
      }

  const textOpacityClass = deemphasized ? 'opacity-50' : 'opacity-100'
  const activeScaleClass = isExpanded ? ACTIVE_TEXT_SCALE_CLASS : 'scale-100'
  const activeTitlePaddingClass = isExpanded ? ACTIVE_TITLE_PADDING_CLASS : ''
  const activeExcerptPaddingClass = isExpanded ? ACTIVE_EXCERPT_PADDING_CLASS : ''
  const resolvedTitleScale =
    Number.isFinite(titleScale) && titleScale != null
      ? titleScale
      : isExpanded
        ? 1.2
        : 1

  const containerPaddingClass = noPadding ? 'px-0' : 'px-6'
  const contentPaddingClass = noPadding ? 'pb-0' : 'pb-12'
  const headerPaddingClass = noPadding ? 'pt-0 md:pt-0' : 'pt-3 md:pt-4'
  const metaPaddingClass = noPadding ? 'px-0 pb-0' : 'px-6 pb-3'

  return (
    <article
      className={`group relative flex w-full min-h-0 items-center justify-between overflow-hidden text-white ${containerPaddingClass} ${className ?? ''}`}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={() => {
        if (isExpanded) {
          onActiveCardClick?.()
          console.log('PostCard active card click')
        }
        setExpanded(!isExpanded)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          setExpanded(!isExpanded)
        }
      }}
      onMouseEnter={(event) => {
        if (expandOnHover) setExpanded(true)
        onMouseEnter?.(event)
      }}
      onMouseLeave={(event) => {
        if (expandOnHover) setExpanded(false)
        onMouseLeave?.(event)
      }}
      style={{
        minHeight,
        ...(style ?? {}),
      }}
    >
      {/* Background: base is always visible, overlays fade OUT */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            ...baseBg.style,
          }}
        />
        {fadeLayers.map((layer) => (
          <div
            key={layer.id}
            className="absolute inset-0 transition-opacity motion-reduce:transition-none"
            style={{
              ...layer.style,
              opacity: layer.opacity,
              ...transitionStyle,
            }}
          />
        ))}
      </div>

      {/* Foreground content */}
      <div
        className={`relative z-10 flex h-full w-full min-h-0 flex-col gap-3 self-stretch ${contentPaddingClass}`}
        style={contentStyle}
      >
        {children ? (
          <div className={headerPaddingClass}>{children}</div>
        ) : null}
        <div className={`${headerPaddingClass} min-w-0 max-w-[67ch]`}>
          <h3
            className={`mt-0 mb-0 pt-[1px] text-xs sm:text-md  md:text-lg font-semibold tracking-tight ${textOpacityClass} ${TITLE_TRANSITION_CLASS} ${activeTitlePaddingClass} origin-top-left pr-12`}
            style={{ ...textTransitionStyle, ...titleStyle }}
          >
            <span className="inline-flex flex-wrap items-baseline gap-x-1 text-pretty break-words">
              <span
                className={TITLE_INNER_TRANSITION_CLASS}
                style={{ transform: `scale(${resolvedTitleScale})`, ...textTransitionStyle }}
              >
                {title}
              </span>
              {false ? (
                <span className="font-serif text-xs opacity-50 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
                  <span className="px-1">·</span>
                  {date}
                </span>
              ) : null}
            </span>
          </h3>
        </div>

        <PostMetaRow
          topic={topic}
          date={date}
          readingTime={readingTime}
          className={`flex flex-wrap pt-1 pb-0 items-center gap-2 text-xs md:text-md text-white/70 ${EXCERPT_TRANSITION_CLASS} ${
            isContentVisible ? 'opacity-100' : 'opacity-0'
          } ${activeScaleClass} ${activeExcerptPaddingClass} origin-top-left`}
          style={textTransitionStyle}
          topicClassName="rounded-full py-0.5 text-[11px] uppercase tracking-wide text-white/80"
          readingTimeClassName={`transition-opacity ease-linear motion-reduce:transition-none ${
            isContentVisible ? 'opacity-100' : 'opacity-0'
          }`}
          readingTimeStyle={readingTimeTransitionStyle}
          dotClassName="opacity-50"
        />

        {/* Excerpt: fade only; full opacity only when expanded/active */}
        <div
          className={`max-w-[60ch] overflow-hidden ${EXCERPT_TRANSITION_CLASS} origin-top-left ${
            isContentVisible ? 'opacity-100' : 'opacity-0'
          } ${activeScaleClass} ${activeExcerptPaddingClass}`}
          style={{ ...textTransitionStyle, ...excerptStyle }}
        >
          {excerpt ? (
            <p
              className={`mt-0 text-xs md:text-lg text-white/50 ${textOpacityClass} ${
                isContentVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {excerpt}
            </p>
          ) : null}
        </div>
      </div>

      {/* Metadata: fade only; full opacity only when expanded/active */}
        <div
        className={`pointer-events-none absolute left-0 bottom-2 z-10 w-full transition-opacity motion-reduce:transition-none ${
          isContentVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={transitionStyle}
      >
        <div className={`flex items-center justify-start gap-4 ${metaPaddingClass}`}>
          {hideCta ? null : (
            <button
              type="button"
              className={`pointer-events-auto shrink-0 rounded-full border-2 border-white/30 px-4 py-1 text-xs md:text-lg uppercase tracking-wide text-white/80 transition hover:border-white/60 hover:text-white ${
                isContentVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={ctaTransitionStyle}
              onClick={(event) => {
                event.stopPropagation()
                onReadClick?.()
                console.log('PostCard read click')
                setExpanded(true)
              }}
            >
              Read
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export type { PostCardProps }
