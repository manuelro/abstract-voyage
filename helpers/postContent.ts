import fs from 'fs'
import matter from 'gray-matter'
import { formatDate } from './date'
import { getSliderVisualParameters } from './sliderVisualParameters'

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
}

export type SliderContentSlide = {
  id: number
  slug: string
  label: string
  title: string
  excerpt: string
  topic: string
  date: string
  readingTime: string
  href: string
  externalUrl: string | null
  forceExternalNavigation: boolean
  seed: number
  hueOffset: number
  variationBias: number
  offsetX: number
  offsetY: number
  accent: string
}

const DEFAULT_POSTS_DIR = 'posts'
const WORDS_PER_MINUTE = 200

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

export function getReadingTimeMinutes(content: string) {
  const wordCount = content.replace(/[#_*`>\\-]/g, ' ').split(/\s+/).filter(Boolean).length
  return wordCount ? Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)) : null
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
      readingTime: post.readingTimeMinutes != null ? `${post.readingTimeMinutes} min read` : '',
      href,
      externalUrl: post.externalUrl,
      forceExternalNavigation: post.forceExternalNavigation,
      ...visualParameters,
    }
  })
}
