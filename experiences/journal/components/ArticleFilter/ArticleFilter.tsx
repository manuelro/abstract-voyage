import { useState, type CSSProperties, type FocusEvent } from 'react'
import Chip, { type ChipTintAppearance } from '../../../../components/Chip'
import {
  computeTitleOpacity,
  computeTitleScale,
  type DockMathConfig,
} from '../../../synth-archive/math/dockMath'
import type { ArticleFilterConfig, ArticleFilterLayoutDirection } from './ArticleFilter.config'
import styles from './ArticleFilter.module.css'

// The original Synth PostCardDock (523a512) uses these Gaussian curves for
// its title wave. Filter controls keep their layout slots so distant choices
// remain legible and clickable when there are many categories.
const FILTER_DOCK_WAVE: DockMathConfig = {
  activePct: 38.19530284,
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
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

// 'horizontal' keeps the original single-row, wrapping, vertically-centered
// layout; 'vertical' stacks one chip per line, left-aligned (wrapping has no
// meaning in a single column, and centering reads oddly once chips no
// longer share a text baseline).
const LAYOUT_DIRECTION_CLASS_BASE: Record<ArticleFilterLayoutDirection, string> = {
  horizontal: 'flex-row flex-wrap items-center',
  vertical: 'flex-col items-start',
}
const LAYOUT_DIRECTION_CLASS_WIDE: Record<ArticleFilterLayoutDirection, string> = {
  horizontal: 'md:flex-row md:flex-wrap md:items-center',
  vertical: 'md:flex-col md:items-start',
}
const LAYOUT_DIRECTION_CLASS_LG: Record<ArticleFilterLayoutDirection, string> = {
  horizontal: 'lg:flex-row lg:flex-wrap lg:items-center',
  vertical: 'lg:flex-col lg:items-start',
}

export type ArticleFilterProps = {
  /** Already capped to config.maxCategories by the caller. */
  categories: string[]
  selectedCategory: string | null
  onSelectCategory: (category: string | null) => void
  config: ArticleFilterConfig
  textColor?: string
  chipTintAppearance?: ChipTintAppearance
}

export function ArticleFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  config,
  textColor,
  chipTintAppearance,
}: ArticleFilterProps) {
  const [interactionIndex, setInteractionIndex] = useState<number | null>(null)
  if (!config.enabled) return null

  const selectedIndex = selectedCategory === null ? 0 : Math.max(0, categories.indexOf(selectedCategory) + 1)
  const activeIndex = interactionIndex !== null && interactionIndex <= categories.length
    ? interactionIndex : selectedIndex

  const chipStyle: CSSProperties | undefined = !chipTintAppearance && textColor
    ? { color: textColor, borderColor: textColor }
    : undefined

  return (
    <div
      className={`${styles.filter} flex ${LAYOUT_DIRECTION_CLASS_BASE[config.layoutDirection]} ${LAYOUT_DIRECTION_CLASS_WIDE[config.layoutDirectionWide]} ${LAYOUT_DIRECTION_CLASS_LG[config.layoutDirectionLg]} ${config.gapClassName} ${config.spaceBeforeClassName}`}
      data-journal-article-filter="true"
      data-layout-base={config.layoutDirection}
      data-layout-wide={config.layoutDirectionWide}
      data-layout-lg={config.layoutDirectionLg}
      data-dock-active-index={activeIndex}
      style={{ '--filter-dock-clearance': `${Math.max(0, (config.dockMaxScale - 1.4) * 20)}px` } as CSSProperties}
      role="group"
      aria-label="Filter articles by category"
      onPointerLeave={() => setInteractionIndex(null)}
      onBlurCapture={(event: FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteractionIndex(null)
      }}
    >
      {[null, ...categories].map((category, index) => {
        const selected = selectedCategory === category
        const titleOpacity = computeTitleOpacity(index, activeIndex, FILTER_DOCK_WAVE)
        const dockTitleScale = computeTitleScale(index, activeIndex, FILTER_DOCK_WAVE)
        const proximity = clamp01(
          (dockTitleScale - FILTER_DOCK_WAVE.farTitleScale) /
          (FILTER_DOCK_WAVE.closestTitleScale - FILTER_DOCK_WAVE.farTitleScale),
        )
        const waveStyle = {
          '--filter-dock-scale': config.dockMinScale + proximity * (config.dockMaxScale - config.dockMinScale),
          // Preserve the curve while lifting its floor for readable controls.
          '--filter-dock-opacity': selected ? 1 : 0.84 + 0.16 * clamp01((titleOpacity - 0.2) / 0.8),
        } as CSSProperties
        return <div
          key={category ?? 'all'}
          className={styles.item}
          data-article-filter-dock-index={index}
          data-wave-active={activeIndex === index}
          style={waveStyle}
          onPointerEnter={() => setInteractionIndex(index)}
          onFocusCapture={() => setInteractionIndex(index)}
        >
          <Chip
            as="button"
            label={category ?? 'All'}
            active={selected}
            onClick={() => onSelectCategory(category)}
            className={`rounded-full border border-current/30 uppercase transition-opacity ${config.fontSize} ${config.fontSizeWide} ${config.fontSizeLg}`}
            style={chipStyle}
            tintAppearance={chipTintAppearance}
          />
        </div>
      })}
    </div>
  )
}
