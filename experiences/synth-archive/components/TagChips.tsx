import { useMemo, useState } from 'react'
import Chip from './Chip'

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

  const normalizedSelected = selectedTag?.trim() ?? null
  const visibleAllTags = useMemo(() => {
    if (!normalizedSelected) return allTags
    return allTags.filter(tag => tag !== normalizedSelected)
  }, [allTags, normalizedSelected])

  const handleSelect = (tag: string | null) => {
    setShowAllTags(false)
    if (!onSelectTag) return
    if (selectedTag === tag) {
      onSelectTag(null)
      return
    }
    onSelectTag(tag)
  }

  return (
    <div className="mb-7">
      <div className="flex flex-wrap items-center justify-start gap-2">
        <Chip
          selected={normalizedSelected === null}
          faded={normalizedSelected !== null}
          onClick={() => handleSelect(null)}
          pressed={normalizedSelected === null}
        >
          All Articles
        </Chip>

        {normalizedSelected && (
          <Chip
            selected
            onClick={() => handleSelect(normalizedSelected)}
            pressed
          >
            {normalizedSelected}
          </Chip>
        )}
      </div>

      <button
        type="button"
        className="text-xs pt-4 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/70 dark:focus-visible:ring-slate-200"
        aria-expanded={showAllTags}
        aria-controls="synth-all-tags"
        onClick={() => setShowAllTags(prev => !prev)}
      >
        {showAllTags ? 'Hide tags' : 'See all tags'}
      </button>

      <div
        id="synth-all-tags"
        className={`mt-4 text-sm text-slate-700 dark:text-slate-200 ${showAllTags ? 'block' : 'hidden'}`}
        aria-hidden={!showAllTags}
      >
        <div className="flex flex-wrap justify-start gap-2">
          {visibleAllTags.map(tag => (
            <Chip
              key={tag}
              selected={selectedTag === tag}
              onClick={() => handleSelect(tag)}
              pressed={selectedTag === tag}
            >
              <span>{tag}</span>
            </Chip>
          ))}
        </div>
      </div>
    </div>
  )
}
