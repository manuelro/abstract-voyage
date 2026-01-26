import { useMemo, useRef, type CSSProperties } from 'react'
import PostCard, { type PostCardProps } from '../components/PostCard'
import { BASE_SYNTH_GRADIENT_CONFIG } from '../gradients/synthGradient'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { computeArcRow } from '../math/dockArcMath'
import {
  clamp01,
  computeHeights,
  computeTitleOpacity,
  computeTitleScale,
  type DockMathConfig,
} from '../math/dockMath'
import { useDockActiveIndex } from '../hooks/useDockActiveIndex'
import { useDockInputHandlers } from '../hooks/useDockInputHandlers'
import type { Item } from '../data/postCardFixtures'

const DOCK_CONFIG: DockMathConfig & {
  transitionMs: number
  transitionDelayMs: number
  transitionEasing: string
  peakX: number
  yArcAmplitude: number
  hueAmplitude: number
  angleAmplitude: number
} = {
  activePct: 38.19530284,
  transitionMs: 700,
  transitionDelayMs: 0,
  transitionEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',

  closestTitleOpacity: 0.5,
  farTitleOpacity: 0.2,
  sigmaTitleOpacity: 1.2,
  titleOpacityGamma: 1.4,
  influenceRadius: null,
  closestTitleScale: 1,
  farTitleScale: 0.82,
  sigmaTitleScale: 1.25,
  titleScaleGamma: 1.4,
  titleScaleInfluenceRadius: null,
  titleScaleTransitionMs: 350,
  titleScaleTransitionDelayMs: 50,
  titleScaleEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',

  peakX: 40,
  yArcAmplitude: 20,
  hueAmplitude: 40,
  angleAmplitude: 40,
}

const CARD_FILL_STYLE: CSSProperties = { height: '100%' }
const DOCK_CONTAINER_STYLE: CSSProperties = { touchAction: 'none' }
const NAV_BAR_HEIGHT_PX = 72
const ACTIVE_TITLE_SCALE = 1.2

type PostCardDockProps = Omit<
  PostCardProps,
  | 'title'
  | 'subtitle'
  | 'excerpt'
  | 'topic'
  | 'date'
  | 'readingTime'
  | 'href'
  | 'children'
  | 'expanded'
  | 'expandOnHover'
  | 'onMouseEnter'
  | 'onMouseLeave'
  | 'hideCta'
  | 'noPadding'
  | 'titleStyle'
  | 'excerptStyle'
  | 'onReadClick'
  | 'onActiveCardClick'
  | 'lightnessRange'
  | 'chromaRange'
> & {
  items: Item[]
  lightnessRange?: number
  chromaRange?: number
  firstItemChildren?: React.ReactNode
  peakTravel?: number
  arcLift?: number
}

export default function PostCardDock({
  items,
  firstItemChildren,
  lightnessRange,
  chromaRange,
  baseHue,
  hueScheme,
  mode,
  stops,
  variance,
  centerStretch,
  seed,
  gradientType,
  angleDeg = 9,
  anchorXPercent,
  anchorYPercent,
  peakTravel,
  arcLift,
  radialShape,
  radialExtent,
  scale,
  scaleX,
  scaleY,
  backgroundTransitionMs,
  backgroundTransitionDelayMs,
  backgroundTransitionEasing,
  minHeight,
  onExpandedChange,
  onCollapseComplete,
}: PostCardDockProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const cancelPendingRef = useRef<() => void>(() => {})
  const {
    hoverIndex,
    lockedIndex,
    activeIndex,
    setHoverIndex,
    setLockedIndex,
    markUserInteracted,
    hoverIndexRef,
    lockedIndexRef,
    lastActiveIndexRef,
  } = useDockActiveIndex({ cancelPendingRef })

  const {
    onPointerMove,
    onPointerLeave,
    onPointerCancel,
    onPointerDown,
    onPointerUp,
    onWheel,
  } = useDockInputHandlers({
    itemsLength: items.length,
    markUserInteracted,
    hoverIndexRef,
    lockedIndexRef,
    lastActiveIndexRef,
    setHoverIndex,
    setLockedIndex,
    cancelPendingRef,
  })

  const resolvedBaseHue =
    typeof baseHue === 'number'
      ? baseHue
      : BASE_SYNTH_GRADIENT_CONFIG.baseHue

  const peakX =
    typeof peakTravel === 'number'
      ? peakTravel
      : typeof anchorXPercent === 'number'
        ? anchorXPercent
        : DOCK_CONFIG.peakX
  const arcLiftValue =
    typeof arcLift === 'number'
      ? arcLift
      : typeof anchorYPercent === 'number'
        ? anchorYPercent
        : DOCK_CONFIG.yArcAmplitude
  const anchorBaseY = 50

  const navMode = activeIndex !== 0
  const heights = computeHeights(items.length, activeIndex, navMode, DOCK_CONFIG.activePct)
  const remainingHeight = `calc(100% - ${NAV_BAR_HEIGHT_PX}px)`

  const center = activeIndex ?? lastActiveIndexRef.current ?? (items.length - 1) / 2
  const last = Math.max(1, items.length - 1)

  const backgroundTransition = useMemo(
    () => ({
      durationMs:
        typeof backgroundTransitionMs === 'number'
          ? backgroundTransitionMs
          : DOCK_CONFIG.transitionMs,
      delayMs:
        typeof backgroundTransitionDelayMs === 'number'
          ? backgroundTransitionDelayMs
          : DOCK_CONFIG.transitionDelayMs,
      easing:
        typeof backgroundTransitionEasing === 'string' &&
        backgroundTransitionEasing.trim()
          ? backgroundTransitionEasing
          : DOCK_CONFIG.transitionEasing,
    }),
    [backgroundTransitionDelayMs, backgroundTransitionEasing, backgroundTransitionMs],
  )

  return (
    <div
      className="flex h-[100dvh] flex-col overflow-hidden"
      style={DOCK_CONTAINER_STYLE}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
    >
      {items.map((item, index) => {
        const isActive = activeIndex === index
        const isHome = index === 0 && Boolean(firstItemChildren)
        const href = item.href

        const rowFlexBasis = navMode
          ? index === 0 && !isActive
            ? `${NAV_BAR_HEIGHT_PX}px`
            : `calc(${remainingHeight} * ${heights[index] / 100})`
          : `${heights[index]}%`

        const heightStyle: CSSProperties = {
          flexBasis: rowFlexBasis,
          flex: `0 0 ${rowFlexBasis}`,
          height: rowFlexBasis,
          minHeight: navMode && index === 0 && !isActive ? `${NAV_BAR_HEIGHT_PX}px` : undefined,
          zIndex: navMode && index === 0 && !isActive ? 2 : undefined,
          transitionProperty: 'flex-basis, min-height',
          transitionTimingFunction: DOCK_CONFIG.transitionEasing,
          transitionDuration: prefersReducedMotion ? '0ms' : `${DOCK_CONFIG.transitionMs}ms`,
          transitionDelay: prefersReducedMotion ? '0ms' : `${DOCK_CONFIG.transitionDelayMs}ms`,
        }

        const arc = computeArcRow(index, center, last, resolvedBaseHue, angleDeg, {
          peakX,
          arcLift: arcLiftValue,
          anchorBaseY,
          hueAmplitude: DOCK_CONFIG.hueAmplitude,
          angleAmplitude: DOCK_CONFIG.angleAmplitude,
        })

        const titleOpacity = computeTitleOpacity(index, activeIndex, DOCK_CONFIG)
        const dockTitleScale = computeTitleScale(index, activeIndex, DOCK_CONFIG)
        const proximity =
          activeIndex == null
            ? 0
            : clamp01(
                (dockTitleScale - DOCK_CONFIG.farTitleScale) /
                  Math.max(1e-6, DOCK_CONFIG.closestTitleScale - DOCK_CONFIG.farTitleScale),
              )
        const titleScale = 1 + proximity * (ACTIVE_TITLE_SCALE - 1)
        const titleStyle: CSSProperties = {
          opacity: titleOpacity,
          transitionProperty: 'opacity, transform',
          transitionDuration: prefersReducedMotion
            ? '0ms'
            : `${DOCK_CONFIG.titleScaleTransitionMs}ms`,
          transitionDelay: prefersReducedMotion
            ? '0ms'
            : `${DOCK_CONFIG.titleScaleTransitionDelayMs}ms`,
          transitionTimingFunction: DOCK_CONFIG.titleScaleEasing,
        }

        return (
          <div
            key={item.title}
            data-postcard-index={index}
            className="shrink-0 min-h-0 overflow-hidden relative"
            style={heightStyle}
          >
            <PostCard
              title={item.title}
              excerpt={isHome ? undefined : item.excerpt}
              topic={isHome ? undefined : item.topic}
              date={isHome ? undefined : item.date}
              readingTime={isHome ? undefined : item.readingTime}
              children={index === 0 ? firstItemChildren : undefined}
              noPadding={index === 0}
              hideCta={index === 0}
              href={isHome ? undefined : href}
              baseHue={arc.rowHue}
              gradientType={gradientType}
              hueScheme={hueScheme}
              lightnessRange={
                typeof lightnessRange === 'number' ? { min: lightnessRange } : undefined
              }
              chromaRange={
                typeof chromaRange === 'number' ? { min: chromaRange } : undefined
              }
              mode={mode}
              stops={stops}
              variance={variance}
              centerStretch={centerStretch}
              seed={seed}
              radialShape={radialShape}
              radialExtent={radialExtent}
              scale={scale}
              scaleX={scaleX}
              scaleY={scaleY}
              angleDeg={arc.rowAngle}
              anchorXPercent={arc.anchorXPercent}
              anchorYPercent={arc.anchorYPercent}
              expanded={isActive}
              expandOnHover={false}
              minHeight={minHeight ?? '0px'}
              style={CARD_FILL_STYLE}
              titleStyle={isHome ? { display: 'none' } : titleStyle}
              titleScale={isHome ? undefined : titleScale}
              excerptStyle={isHome ? { display: 'none' } : undefined}
              backgroundTransitionMs={backgroundTransition.durationMs}
              backgroundTransitionDelayMs={backgroundTransition.delayMs}
              backgroundTransitionEasing={backgroundTransition.easing}
              onCollapseComplete={onCollapseComplete}
              onReadClick={
                !isHome && href
                  ? () => {
                      console.log('PostCard read navigate', href)
                      window.location.assign(href)
                    }
                  : undefined
              }
              onActiveCardClick={
                !isHome && href
                  ? () => {
                      console.log('PostCard active navigate', href)
                      window.location.assign(href)
                    }
                  : undefined
              }
              onExpandedChange={(expanded) => {
                onExpandedChange?.(expanded)
                markUserInteracted()
                if (expanded) {
                  setLockedIndex(index)
                } else if (lockedIndexRef.current === index) {
                  setLockedIndex(null)
                }
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
