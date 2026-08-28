import type { CSSProperties } from 'react'

type PostMetaRowProps = {
  topic?: string | null
  date?: string | null
  readingTime?: string | null
  className?: string
  style?: CSSProperties
  topicClassName?: string
  dateClassName?: string
  dateStyle?: CSSProperties
  readingTimeClassName?: string
  readingTimeStyle?: CSSProperties
  dotClassName?: string
  topicDateSeparatorClassName?: string
  readingTimeSeparatorClassName?: string
  topicDateSeparatorStyle?: CSSProperties
  readingTimeSeparatorStyle?: CSSProperties
}

export default function PostMetaRow({
  topic,
  date,
  readingTime,
  className,
  style,
  topicClassName,
  dateClassName,
  dateStyle,
  readingTimeClassName,
  readingTimeStyle,
  dotClassName,
  topicDateSeparatorClassName,
  readingTimeSeparatorClassName,
  topicDateSeparatorStyle,
  readingTimeSeparatorStyle,
}: PostMetaRowProps) {
  const hasTopic = Boolean(topic)
  const hasDate = Boolean(date)
  const hasReading = Boolean(readingTime)

  if (!hasTopic && !hasDate && !hasReading) return null

  return (
    <div className={className} style={style}>
      {hasTopic ? (
        <span
          className={
            topicClassName ??
            'rounded-full border border-white/30 px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/80'
          }
        >
          {topic}
        </span>
      ) : null}
      {hasTopic && hasDate ? (
        <span
          className={[dotClassName ?? 'opacity-50', topicDateSeparatorClassName].filter(Boolean).join(' ')}
          style={topicDateSeparatorStyle}
        >
          ·
        </span>
      ) : null}
      {hasDate ? <span className={dateClassName} style={dateStyle}>{date}</span> : null}
      {(hasReading && (hasTopic || hasDate)) ? (
        <span
          className={[dotClassName ?? 'opacity-50', readingTimeSeparatorClassName].filter(Boolean).join(' ')}
          style={readingTimeSeparatorStyle}
        >
          ·
        </span>
      ) : null}
      {hasReading ? (
        <span className={readingTimeClassName} style={readingTimeStyle}>
          {readingTime}
        </span>
      ) : null}
    </div>
  )
}
