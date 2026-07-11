import {
  cloneElement,
  isValidElement,
  useMemo,
  type CSSProperties,
} from 'react'
import MagnificationDock, {
  type MagnificationDockOrientation,
} from '../../../components/MagnificationDock'
import PostCard, { type PostCardProps } from '../components/PostCard'
import { BASE_SYNTH_GRADIENT_CONFIG } from '../gradients/synthGradient'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { computeArcRow } from '../math/dockArcMath'
import {
  clamp01,
  computeTitleOpacity,
  computeTitleScale,
  type DockMathConfig,
} from '../math/dockMath'
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

const CARD_FILL_STYLE: CSSProperties = { height: '100%', width: '100%' }
const NAV_BAR_HEIGHT_PX = 72
const ACTIVE_TITLE_SCALE = 1.2
const REVEAL_CONFIG = {
  firstCardDelayMs: 80,
  staggerMs: 90,
  durationMs: 480,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const

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
  | 'lightnessRange'
  | 'chromaRange'
> & {
  items: Item[]
  lightnessRange?: number
  chromaRange?: number
  firstItemChildren?: React.ReactNode
  peakTravel?: number
  arcLift?: number
  orientation?: MagnificationDockOrientation
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
  orientation = 'vertical',
}: PostCardDockProps) {
  const prefersReducedMotion = usePrefersReducedMotion()

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
    <div className="h-[100dvh] w-full">
      <MagnificationDock
        items={items}
        getItemKey={(item) => item.title}
        orientation={orientation}
        activePct={DOCK_CONFIG.activePct}
        initialActiveIndex={null}
        restoreActiveIndex={0}
        excludeLeadItemWhenActive
        leadItemCollapseSizePx={NAV_BAR_HEIGHT_PX}
        transitionMs={DOCK_CONFIG.transitionMs}
        transitionDelayMs={DOCK_CONFIG.transitionDelayMs}
        transitionEasing={DOCK_CONFIG.transitionEasing}
        revealFirstDelayMs={REVEAL_CONFIG.firstCardDelayMs}
        revealStaggerMs={REVEAL_CONFIG.staggerMs}
        revealDurationMs={REVEAL_CONFIG.durationMs}
        revealEasing={REVEAL_CONFIG.easing}
        prefersReducedMotion={prefersReducedMotion}
        renderItem={({
          item,
          index,
          isActive,
          activeIndex,
          lockedIndex,
          center,
          last,
          allRevealed,
          setLockedIndex,
          markUserInteracted,
        }) => {
        const isHome = index === 0 && Boolean(firstItemChildren)
        const href = item.href

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

        const firstContentStyle: CSSProperties | undefined =
          index === 0
            ? {
                opacity: allRevealed ? 1 : 0,
                transitionProperty: 'opacity',
                transitionTimingFunction: REVEAL_CONFIG.easing,
                transitionDuration: prefersReducedMotion ? '0ms' : `${REVEAL_CONFIG.durationMs}ms`,
                transitionDelay: prefersReducedMotion ? '0ms' : '0ms',
              }
            : undefined
        const firstLogoStyle: CSSProperties | undefined =
          index === 0
            ? {
                opacity: allRevealed ? 1 : 0,
                transitionProperty: 'opacity',
                transitionTimingFunction: REVEAL_CONFIG.easing,
                transitionDuration: prefersReducedMotion ? '0ms' : `${REVEAL_CONFIG.durationMs * 2}ms`,
                transitionDelay: prefersReducedMotion ? '0ms' : `${REVEAL_CONFIG.durationMs}ms`,
              }
            : undefined
        const resolvedFirstChildren =
          isHome && firstItemChildren && isValidElement(firstItemChildren)
            ? cloneElement(
                firstItemChildren as React.ReactElement<{
                  contentStyle?: CSSProperties
                  logoStyle?: CSSProperties
                }>,
                {
                  contentStyle: firstContentStyle,
                  logoStyle: firstLogoStyle,
                },
              )
            : firstItemChildren

        return (
          <PostCard
            title={item.title}
            excerpt={isHome ? undefined : item.excerpt}
            topic={isHome ? undefined : item.topic}
            date={isHome ? undefined : item.date}
            readingTime={isHome ? undefined : item.readingTime}
            children={index === 0 ? resolvedFirstChildren : undefined}
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
            onExpandedChange={(expanded) => {
              onExpandedChange?.(expanded)
              markUserInteracted()
              if (expanded) {
                setLockedIndex(index)
              } else if (lockedIndex === index) {
                setLockedIndex(null)
              }
            }}
          />
        )
        }}
      />
    </div>
  )
}
