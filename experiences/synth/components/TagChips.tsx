import { useMemo, useState } from 'react'

type Article = {
  id: string
  title: string
  tags: string[]
}

type TagChipsProps = {
  articles: Article[]
  featuredTagsOverride?: string[]
  maxFeatured?: number
  onSelectTag?: (tag: string | null) => void
  selectedTag?: string | null
}

export default function TagChips({
  articles,
  featuredTagsOverride,
  maxFeatured = 5,
  onSelectTag,
  selectedTag = null,
}: TagChipsProps) {
  const [showAllTags, setShowAllTags] = useState(false)

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const article of articles) {
      for (const tag of article.tags) {
        const cleaned = tag.trim()
        if (!cleaned) continue
        counts.set(cleaned, (counts.get(cleaned) ?? 0) + 1)
      }
    }
    return counts
  }, [articles])

  const allTags = useMemo(() => {
    return Array.from(tagCounts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]
        if (a[0] < b[0]) return -1
        if (a[0] > b[0]) return 1
        return 0
      })
      .map(([tag]) => tag)
  }, [tagCounts])

  const featuredTags = useMemo(() => {
    if (featuredTagsOverride && featuredTagsOverride.length > 0) {
      const available = new Set(tagCounts.keys())
      const deduped = Array.from(
        new Set(featuredTagsOverride.map(tag => tag.trim()).filter(Boolean).filter(tag => available.has(tag))),
      )
      return deduped.slice(0, maxFeatured)
    }
    return allTags.slice(0, maxFeatured)
  }, [allTags, featuredTagsOverride, maxFeatured])

  const chipBase =
    'border-2 px-5 py-1.5 rounded-full text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/70 dark:focus-visible:ring-slate-200 whitespace-nowrap w-auto min-w-0'

  const chipSelected = 'bg-white/20 text-slate-900 border-white/70 dark:bg-slate-800/60 dark:text-white dark:border-slate-200/80'
  const chipIdle = 'border-white/70 text-slate-900 hover:border-white dark:border-slate-200/70 dark:text-slate-100 dark:hover:border-slate-100'

  const handleSelect = (tag: string | null) => {
    if (!onSelectTag) return
    if (selectedTag === tag) {
      onSelectTag(null)
      return
    }
    onSelectTag(tag)
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap justify-start gap-3">
        <button
          type="button"
          className={`${chipBase} ${selectedTag === null ? chipSelected : chipIdle}`}
          aria-pressed={selectedTag === null}
          onClick={() => handleSelect(null)}
        >
          All
        </button>

        {featuredTags.map(tag => (
          <button
            key={tag}
            type="button"
            className={`${chipBase} ${selectedTag === tag ? chipSelected : chipIdle}`}
            aria-pressed={selectedTag === tag}
            onClick={() => handleSelect(tag)}
          >
            {tag}
          </button>
        ))}

        <button
          type="button"
          className="text-sm text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/70 dark:focus-visible:ring-slate-200"
          aria-expanded={showAllTags}
          aria-controls="synth-all-tags"
          onClick={() => setShowAllTags(prev => !prev)}
        >
          {showAllTags ? 'Hide tags' : 'See all tags'}
        </button>
      </div>

      <div
        id="synth-all-tags"
        className={`mt-4 text-sm flex-wrap text-slate-200 w-full bg-blue-500 ${showAllTags ? 'block' : 'hidden'}`}
        aria-hidden={!showAllTags}
      >
        <div className="flex flex-wrap justify-start gap-2">
          {allTags.map(tag => (
            <button
              key={tag}
              type="button"
              className={`${chipBase} ${selectedTag === tag ? chipSelected : chipIdle}`}
              aria-pressed={selectedTag === tag}
              onClick={() => handleSelect(tag)}
            >
              <span>{tag}</span>
              <span className="ml-2 text-xs text-slate-500/80 dark:text-slate-400/80">({tagCounts.get(tag) ?? 0})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
