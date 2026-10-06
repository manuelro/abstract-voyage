import type { CSSProperties } from 'react'
import type { ArticleMetaRowAppearanceConfig } from './config/appearance'

export type ArticleMetaRowProps = {
  topic?: string | null
  readingTimeMinutes?: number | null
  textColor: string
  config: ArticleMetaRowAppearanceConfig
}

/** Plain-language article context shown between the title and description. */
export function ArticleMetaRow({ topic, readingTimeMinutes, textColor, config }: ArticleMetaRowProps) {
  const category = topic?.trim()
  if (!category || readingTimeMinutes == null) return null

  const style: CSSProperties = { color: textColor, opacity: config.colorOpacity, textWrap: 'pretty' }

  return (
    <p
      className={`${config.fontFamily} ${config.fontSize} ${config.fontSizeWide} ${config.fontSizeLg} ${config.paddingTop} ${config.paddingTopWide} ${config.paddingTopLg} ${config.paddingRight} ${config.paddingRightWide} ${config.paddingRightLg} ${config.paddingBottom} ${config.paddingBottomWide} ${config.paddingBottomLg} ${config.paddingLeft} ${config.paddingLeftWide} ${config.paddingLeftLg}`}
      data-article-meta-row="true"
      style={style}
    >
      Archived under{' '}
      <span className={`${config.categoryFontWeight} ${config.categoryFontWeightWide} ${config.categoryFontWeightLg}`}>
        {category}
      </span>
      , {readingTimeMinutes} min read
    </p>
  )
}
