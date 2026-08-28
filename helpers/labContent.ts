import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { formatDate } from './date'

type FrontmatterValue = string | number | boolean | string[] | null | undefined

export type LabFrontmatter = Record<string, FrontmatterValue> & {
  title?: string
  slug?: string
  excerpt?: string
  tags?: string[] | string
  tech?: string[] | string
  status?: 'published' | 'draft' | 'archived'
  date?: string
  heroImage?: string
  heroAlt?: string
  source?: string
  hasConfigPanel?: boolean
}

export type LabSummary = {
  slug: string
  title: string
  excerpt: string
  tags: string[]
  tech: string[]
  status: 'published' | 'draft' | 'archived'
  date: string
  formattedDate: string | null
  canonicalPath: string
  heroImage: string | null
  heroAlt: string | null
  source: string | null
  hasConfigPanel: boolean
}

const DEFAULT_LABS_DIR = 'labs'

function normalizeTags(value: LabFrontmatter['tags']): string[] {
  if (Array.isArray(value)) {
    return value.map((tag) => tag.trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value.split(',').map((tag) => tag.trim()).filter(Boolean)
  }
  return []
}

export function normalizeLabSummary(fileName: string, frontmatter: LabFrontmatter): LabSummary {
  const slug = path.basename(fileName, '.md')
  const date = frontmatter.date ? String(frontmatter.date) : ''
  const title = String(frontmatter.title ?? slug)
  const tags = normalizeTags(frontmatter.tags)
  const tech = normalizeTags(frontmatter.tech)
  const excerpt = frontmatter.excerpt ? String(frontmatter.excerpt) : ''
  const status = (frontmatter.status as LabSummary['status']) ?? 'published'

  return {
    slug,
    title,
    excerpt,
    tags,
    tech,
    status,
    date,
    formattedDate: date ? formatDate(date) : null,
    canonicalPath: `/labs/${slug}`,
    heroImage: frontmatter.heroImage ? String(frontmatter.heroImage) : null,
    heroAlt: frontmatter.heroAlt ? String(frontmatter.heroAlt) : null,
    source: frontmatter.source ? String(frontmatter.source) : null,
    hasConfigPanel: Boolean(frontmatter.hasConfigPanel),
  }
}

export function sortLabSummaries(labs: LabSummary[]): LabSummary[] {
  return [...labs].sort((a, b) => {
    if (a.date < b.date) return 1
    if (a.date > b.date) return -1
    return 0
  })
}

export function getLabSummaries(labsDir = DEFAULT_LABS_DIR): LabSummary[] {
  const files = fs.readdirSync(labsDir).filter((fileName) => fileName.endsWith('.md'))
  const isDev = process.env.NODE_ENV !== 'production'

  return sortLabSummaries(
    files
      .map((fileName) => {
        const readFile = fs.readFileSync(`${labsDir}/${fileName}`, 'utf-8')
        const { data: frontmatter } = matter(readFile)
        return normalizeLabSummary(fileName, frontmatter as LabFrontmatter)
      })
      .filter((lab) => {
        if (!lab.title) return false
        if (!isDev && lab.status === 'draft') return false
        return true
      }),
  )
}
