import fs from 'fs'
import matter from 'gray-matter'
import { formatDate } from './date'
import { getSliderVisualParameters } from './sliderVisualParameters'
import { getReadingTimeMinutes } from './readingTime'

export {
  getSliderVisualParameters,
  type SliderVisualParameters,
} from './sliderVisualParameters'

type FrontmatterValue = string | number | boolean | string[] | null | undefined

export type PostFrontmatter = Record<string, FrontmatterValue> & {
  title?: string
  excerpt?: string
  tags?: string[] | string
  externalUrl?: string
  forceExternalNavigation?: boolean
  /** Opt-in candidacy for the frontpage (abstract.tsx) hero spotlight rail —
   * see PostSummary.featured's own doc comment. Absent/falsy is the default
   * for every post that hasn't been curated yet. */
  featured?: boolean
}

export type PostSummary = {
  slug: string
  date: string
  formattedDate: string | null
  title: string
  excerpt: string
  tags: string[]
  canonicalPath: string
  externalUrl: string | null
  forceExternalNavigation: boolean
  readingTimeMinutes: number | null
  /** Whether this post is a curated candidate for the frontpage (abstract.tsx)
   * hero spotlight rail (CoverFlow + its AboutTimeline rail) — an opt-in
   * editorial flag, not a derived one: a post with no `featured` frontmatter
   * simply never appears there, regardless of how recent it is. Every other
   * listing (journal.tsx, the frontpage's own full "Journal & Labs" archive)
   * is unaffected and keeps showing every post. */
  featured: boolean
}

export type SliderContentSlide = {
  id: number
  slug: string
  label: string
  title: string
  excerpt: string
  topic: string
  date: string
  /** Raw ISO publication date when the slide comes from a post. Optional so
   * hand-authored slides remain valid. */
  publishedDate?: string
  readingTime: string
  href: string
  externalUrl: string | null
  forceExternalNavigation: boolean
  /** See PostSummary.featured's own doc comment. Optional (unlike
   * PostSummary's own required field) since hand-authored slides elsewhere
   * (e.g. pages/about.tsx's own aboutSlides/topSegmentSlide) build this type
   * directly without ever going through toSliderSlides, and have no
   * equivalent "featured post" concept to report — they simply omit it. */
  featured?: boolean
  seed: number
  hueOffset: number
  variationBias: number
  offsetX: number
  offsetY: number
  accent: string
}

const DEFAULT_POSTS_DIR = 'posts'

function normalizeTags(value: PostFrontmatter['tags']) {
  if (Array.isArray(value)) {
    return value.map((tag) => tag.trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value.split(',').map((tag) => tag.trim()).filter(Boolean)
  }

  return []
}

export function getPostSlug(fileName: string) {
  return fileName.replace(/\.md$/, '')
}

export function getPostDate(fileName: string) {
  return fileName.split('_')[0].replace(/\.md$/, '')
}

export function normalizePostSummary(fileName: string, frontmatter: PostFrontmatter, content: string): PostSummary {
  const slug = getPostSlug(fileName)
  const date = getPostDate(fileName)
  const title = String(frontmatter?.title ?? slug)
  const tags = normalizeTags(frontmatter?.tags)
  const excerpt = frontmatter?.excerpt ? String(frontmatter.excerpt) : ''

  return {
    slug,
    date,
    formattedDate: formatDate(date),
    title,
    excerpt,
    tags,
    canonicalPath: `/posts/${slug}`,
    externalUrl: frontmatter?.externalUrl ? String(frontmatter.externalUrl) : null,
    forceExternalNavigation: Boolean(frontmatter?.forceExternalNavigation),
    readingTimeMinutes: getReadingTimeMinutes(content),
    featured: Boolean(frontmatter?.featured),
  }
}

export function sortPostSummaries(posts: PostSummary[]) {
  return [...posts].sort((a, b) => {
    if (a.date < b.date) return 1
    if (a.date > b.date) return -1
    return 0
  })
}

export function getPostSummaries(postsDir = DEFAULT_POSTS_DIR): PostSummary[] {
  const files = fs.readdirSync(postsDir).filter((fileName) => fileName.endsWith('.md'))

  return sortPostSummaries(
    files
      .map((fileName) => {
        const readFile = fs.readFileSync(`${postsDir}/${fileName}`, 'utf-8')
        const { data: frontmatter, content } = matter(readFile)
        return normalizePostSummary(fileName, frontmatter as PostFrontmatter, content)
      })
      .filter((post) => Boolean(post && post.title)),
  )
}

export function toSliderSlides(posts: PostSummary[]): SliderContentSlide[] {
  return posts.map((post, index) => {
    const slideNumber = index + 1
    const href = post.forceExternalNavigation && post.externalUrl
      ? post.externalUrl
      : `/posts/${post.slug}`
    const displayDate = post.formattedDate ?? (post.date.startsWith('20') ? post.date : '')
    const visualParameters = getSliderVisualParameters(index)

    return {
      id: slideNumber,
      slug: post.slug,
      label: `${slideNumber}`.padStart(2, '0'),
      title: post.title,
      excerpt: post.excerpt,
      topic: post.tags?.[0] ?? '',
      date: displayDate,
      publishedDate: post.date,
      readingTime: post.readingTimeMinutes != null ? `${post.readingTimeMinutes} min read` : '',
      href,
      externalUrl: post.externalUrl,
      forceExternalNavigation: post.forceExternalNavigation,
      featured: post.featured,
      ...visualParameters,
    }
  })
}
