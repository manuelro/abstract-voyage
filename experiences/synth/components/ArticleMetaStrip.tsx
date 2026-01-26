import PostMetaRow from './PostMetaRow'

type SourceMeta = {
  name?: string
  platform?: string
  url?: string
  originallyPublished?: string
}

type ArticleMetaStripProps = {
  date: string
  primaryTopic?: string | null
  readingTimeMinutes?: number | null
  source?: SourceMeta | null
}

const formatMonthYear = (value?: string) => {
  if (!value) return null
  const [year, month] = value.split('-')
  const monthIndex = Number.parseInt(month ?? '', 10) - 1
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  if (!year || monthIndex < 0 || monthIndex >= monthNames.length) return value
  return `${monthNames[monthIndex]} ${year}`
}

export default function ArticleMetaStrip({
  date,
  primaryTopic,
  readingTimeMinutes,
  source,
}: ArticleMetaStripProps) {
  const sourceName = source?.name ?? source?.platform
  const readingTime =
    readingTimeMinutes != null ? `${readingTimeMinutes} min read` : null
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/60">
      <PostMetaRow
        topic={primaryTopic}
        date={date}
        readingTime={readingTime}
        className="contents"
        topicClassName="rounded-full border-2 dark:border-slate-200/40 px-3 py-1 text-[11px] uppercase tracking-wide dark:text-slate-100"
        dotClassName="opacity-50"
      />
      {sourceName && source?.url ? (
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="text-white/60 hover:text-white underline underline-offset-4 decoration-slate-300/60"
        >
          Originally published on {sourceName}
          {source.originallyPublished ? ` — ${formatMonthYear(source.originallyPublished)}` : ''}
        </a>
      ) : null}
    </div>
  )
}
