import fs from 'fs'
import matter from 'gray-matter'

export type ThoughtSummary = {
  slug: string
  title: string
  description: string
  date: string
}

const DEFAULT_THOUGHTS_DIR = 'content/thoughts'

export function getThoughtSlug(fileName: string) {
  return fileName.replace(/\.md$/, '')
}

export function getThoughts(thoughtsDir = DEFAULT_THOUGHTS_DIR): ThoughtSummary[] {
  return fs.readdirSync(thoughtsDir)
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const source = fs.readFileSync(`${thoughtsDir}/${fileName}`, 'utf-8')
      const { data } = matter(source)
      return {
        slug: getThoughtSlug(fileName),
        title: String(data.title ?? getThoughtSlug(fileName)),
        description: String(data.description ?? ''),
        date: String(data.date ?? ''),
      }
    })
    .filter((thought) => thought.title && thought.date)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getThoughtBySlug(slug: string, thoughtsDir = DEFAULT_THOUGHTS_DIR) {
  return getThoughts(thoughtsDir).find((thought) => thought.slug === slug) ?? null
}
