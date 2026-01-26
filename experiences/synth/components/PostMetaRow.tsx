type PostMetaRowProps = {
  topic?: string | null
  date?: string | null
  readingTime?: string | null
  className?: string
  style?: React.CSSProperties
  topicClassName?: string
  dateClassName?: string
  readingTimeClassName?: string
  readingTimeStyle?: React.CSSProperties
  dotClassName?: string
}

export default function PostMetaRow({
  topic,
  date,
  readingTime,
  className,
  style,
  topicClassName,
  dateClassName,
  readingTimeClassName,
  readingTimeStyle,
  dotClassName,
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
        <span className={dotClassName ?? 'opacity-50'}>·</span>
      ) : null}
      {hasDate ? <span className={dateClassName}>{date}</span> : null}
      {(hasReading && (hasTopic || hasDate)) ? (
        <span className={dotClassName ?? 'opacity-50'}>·</span>
      ) : null}
      {hasReading ? (
        <span className={readingTimeClassName} style={readingTimeStyle}>
          {readingTime}
        </span>
      ) : null}
    </div>
  )
}
