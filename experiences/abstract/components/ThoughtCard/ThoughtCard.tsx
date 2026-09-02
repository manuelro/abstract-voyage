import type { CSSProperties } from 'react'
import ArticleCard from '../../../../components/ArticleCard'
import type { ThoughtSummary } from '../../../../helpers/thoughtContent'
import {
  DEFAULT_THOUGHT_CARD_CONFIG,
  normalizeThoughtCardConfig,
  type ThoughtCardConfig,
} from './config/registered'
import styles from './ThoughtCard.module.css'

export type ThoughtCardProps = ThoughtSummary & {
  scale?: 'compact' | 'amplified'
  link?: boolean
  config?: Partial<ThoughtCardConfig>
}

export function ThoughtCard({
  slug,
  title,
  description,
  scale = 'compact',
  link = true,
  config,
}: ThoughtCardProps) {
  const normalized = normalizeThoughtCardConfig({ ...DEFAULT_THOUGHT_CARD_CONFIG, ...config })
  const rootSize = scale === 'amplified'
    ? normalized.amplifiedRootSizePx
    : normalized.compactRootSizePx
  const style = {
    '--thought-card-root-size': `${rootSize}px`,
    '--thought-card-title-ratio': normalized.titleRatioCqw,
    '--thought-card-description-ratio': normalized.descriptionRatioCqw,
  } as CSSProperties

  return (
    <div className={styles.root} style={style}>
      <ArticleCard
        title={title}
        excerpt={description || undefined}
        href={link ? `/thoughts/${slug}` : undefined}
        aspectRatio="3:4"
        typographyScale="proportional"
        proportionalContentInsetCqw={normalized.paddingRatioCqw}
        appearance="neutral"
        contentMode="title-and-summary"
        interactive={link ? 'whole-card' : undefined}
        className={styles.card}
      />
    </div>
  )
}

export default ThoughtCard
