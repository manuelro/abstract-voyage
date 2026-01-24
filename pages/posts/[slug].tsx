import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Head from 'next/head'
import Link from 'next/link'
import { formatDate } from 'components/helpers/date'
import Article from '../../experiences/synth/components/Article'
import SynthLayout from '../../experiences/synth/components/SynthLayout'
import ArticleLayout from '../../experiences/synth/components/ArticleLayout'
import ArticleMetaStrip from '../../experiences/synth/components/ArticleMetaStrip'
import KeyTakeaways from '../../experiences/synth/components/KeyTakeaways'
import TableOfContents, { HeadingItem, FigureItem } from '../../experiences/synth/components/TableOfContents'
import TocTrigger from '../../experiences/synth/components/TocTrigger'
import TypographyProse from '../../experiences/synth/components/TypographyProse'
import MarkdownContent from '../../experiences/synth/components/MarkdownContent'
import MarkdownIt from 'markdown-it'
import { getHighlighter } from 'shiki'
import { useState } from 'react'

export type PostType = {
  frontmatter: {
    title: string
    excerpt?: string
    primaryTopic?: string
    tags: string[]
    source?: {
      platform?: string
      url?: string
      originallyPublished?: string
    }
    heroImage?: string
    heroAlt?: string
    takeaways?: string[]
    toc?: boolean
    tocHeadings?: boolean
    tocFigures?: boolean
    tocMinHeadings?: number
    tocMinFigures?: number
    tocInclude?: string[]
    tocExclude?: string[]
  }
  content: string
  formattedDate: string
  headings: HeadingItem[]
  figures: FigureItem[]
  codeBlocks: {
    html: string
    language: string | null
    code: string
  }[]
  tables: Record<string, {
    title?: string
    headers: string[]
    rows: string[][]
    footer?: string[]
  }> | null
  readingTimeMinutes?: number | null
  previousPost?: {
    slug: string
    title: string
  } | null
  nextPost?: {
    slug: string
    title: string
  } | null
}

export default function Post({
  frontmatter,
  content,
  formattedDate,
  readingTimeMinutes,
  headings,
  figures,
  codeBlocks,
  tables,
  previousPost,
  nextPost,
}: PostType) {
    const { title, excerpt, primaryTopic, tags, source, heroImage, heroAlt, takeaways } = frontmatter
    const tocConfig = {
      tocEnabled: frontmatter.toc !== false,
      tocHeadingsEnabled: frontmatter.tocHeadings !== false,
      tocFiguresEnabled: frontmatter.tocFigures !== false,
      tocMinHeadings: typeof frontmatter.tocMinHeadings === 'number' ? frontmatter.tocMinHeadings : 2,
      tocMinFigures: typeof frontmatter.tocMinFigures === 'number' ? frontmatter.tocMinFigures : 1,
      tocInclude: Array.isArray(frontmatter.tocInclude) ? frontmatter.tocInclude : null,
      tocExclude: Array.isArray(frontmatter.tocExclude) ? frontmatter.tocExclude : null,
    }
    const topic = primaryTopic ?? tags?.[0] ?? null
    const hasBody = content.trim().length > 0
    const [tocOpen, setTocOpen] = useState(false)

    return (
        <SynthLayout
          controls={(
            <Link
              href="/"
              className="text-xs text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/60"
            >
              Back to All articles
            </Link>
          )}
        >
            <Head>
                <title>{title}</title>
            </Head>

            <ArticleLayout
              header={(
                <Article
                  title={title}
                  excerpt={excerpt}
                  heroImage={heroImage}
                  heroAlt={heroAlt}
                  meta={(
                    <>
                      <ArticleMetaStrip
                        date={formattedDate}
                        primaryTopic={topic}
                        readingTimeMinutes={readingTimeMinutes ?? null}
                        source={{
                          name: source?.name ?? source?.platform,
                          url: source?.url,
                          originallyPublished: source?.originallyPublished,
                        }}
                      />
                  {(
                    tocConfig.tocEnabled
                    && (
                      (tocConfig.tocHeadingsEnabled && headings.length >= tocConfig.tocMinHeadings)
                      || (tocConfig.tocFiguresEnabled && figures.length >= tocConfig.tocMinFigures)
                    )
                  ) ? (
                    <TocTrigger isOpen={tocOpen} onClick={() => setTocOpen((prev) => !prev)} />
                  ) : null}
                </>
              )}
                  afterLede={<KeyTakeaways items={takeaways ?? null} />}
                >
                </Article>
              )}
              toc={(
                <TableOfContents
                  headings={headings}
                  figures={figures}
                  tocEnabled={tocConfig.tocEnabled}
                  tocHeadingsEnabled={tocConfig.tocHeadingsEnabled}
                  tocFiguresEnabled={tocConfig.tocFiguresEnabled}
                  tocMinHeadings={tocConfig.tocMinHeadings}
                  tocMinFigures={tocConfig.tocMinFigures}
                />
              )}
            >
              <div
                id="article-toc-panel"
                className={`fixed inset-0 z-40 bg-slate-950/90 p-6 lg:hidden ${tocOpen ? 'block' : 'hidden'}`}
              >
                <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-wide text-white/60">
                  <span>On this page</span>
                  <button
                    type="button"
                    className="text-white/60 hover:text-white"
                    onClick={() => setTocOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <TableOfContents
                  headings={headings}
                  figures={figures}
                  tocEnabled={tocConfig.tocEnabled}
                  tocHeadingsEnabled={tocConfig.tocHeadingsEnabled}
                  tocFiguresEnabled={tocConfig.tocFiguresEnabled}
                  tocMinHeadings={tocConfig.tocMinHeadings}
                  tocMinFigures={tocConfig.tocMinFigures}
                  onNavigate={() => {
                    setTocOpen(false)
                    if (typeof window !== 'undefined') {
                      window.requestAnimationFrame(() => {
                        const hash = window.location.hash
                        if (!hash) return
                        const target = document.querySelector(hash)
                        if (target instanceof HTMLElement) {
                          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }
                      })
                    }
                  }}
                />
              </div>

              <TypographyProse>
                {hasBody ? (
                  <MarkdownContent content={content} figures={figures} codeBlocks={codeBlocks} tables={tables ?? {}} />
                ) : (
                  <div className="mt-6 rounded-md border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                    This article is being migrated. Read the original on{' '}
                    {source?.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-4 decoration-slate-300/60 hover:text-slate-50"
                      >
                        Medium
                      </a>
                    ) : (
                      'Medium'
                    )}
                    .
                  </div>
                )}
              </TypographyProse>
            </ArticleLayout>

            {(previousPost || nextPost) ? (
              <div className="mt-10 border-t border-white/10 pt-6 text-sm text-white/60">
                <div className="w-full flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  {nextPost ? (
                    <Link
                      href={`/posts/${nextPost.slug}`}
                      className="hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/60"
                    >
                      ← {nextPost.title}
                    </Link>
                  ) : <span />}
                  
                  {previousPost ? (
                    <Link
                      href={`/posts/${previousPost.slug}`}
                      className="text-right hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/60"
                    >
                      {previousPost.title} →
                    </Link>
                  ) : <span />}
                </div>
              </div>
            ) : null}
        </SynthLayout>
    )
}

export async function getStaticPaths() {
  const files = fs.readdirSync('posts')
  const paths = files.map((fileName) => ({
    params: {
      slug: fileName.replace('.md', ''),
    },
  }))

  return {
    paths,
    fallback: false
  }
}

const applySnippetIncludes = (source: string, postId: string) => {
  const baseDir = path.join(process.cwd(), 'content', 'posts', postId, 'snippets')
  const marker = /<!--\s*code:include\s+file="([^"]+)"\s+lang="([^"]+)"(?:\s+title="([^"]+)")?\s*-->/g
  const inDev = process.env.NODE_ENV !== 'production'

  return source.replace(marker, (_match, file, lang, title) => {
    const safeName = path.basename(file)
    const snippetPath = path.join(baseDir, safeName)
    if (!snippetPath.startsWith(baseDir)) {
      const msg = `Invalid snippet path: ${file}`
      if (inDev) {
        return `\n\n> ${msg}\n\n`
      }
      throw new Error(msg)
    }
    if (!fs.existsSync(snippetPath)) {
      const msg = `Missing snippet: ${safeName}`
      if (inDev) {
        return `\n\n> ${msg}\n\n`
      }
      throw new Error(msg)
    }
    const contents = fs.readFileSync(snippetPath, 'utf-8').trimEnd()
    const titleAttr = title ? ` title="${title}"` : ''
    return `\n\n\`\`\`${lang}${titleAttr}\n${contents}\n\`\`\`\n\n`
  })
}

export async function getStaticProps({ params: { slug } } : { params: { slug: string } }) {
  const fileName = fs.readFileSync(`posts/${slug}.md`, 'utf-8')
  const date = fileName.split('_')[0]
  const { data: frontmatter, content } = matter(fileName)
  const processedContent = applySnippetIncludes(content, slug)
  const highlighter = await getHighlighter({ themes: ['dracula-soft'] })
  const languageAliases: Record<string, string> = {
    bash: 'shellscript',
    sh: 'shellscript',
    shell: 'shellscript',
    zsh: 'shellscript',
    console: 'shellscript',
  }
  const preferredLanguages = [
    'shellscript',
    'javascript',
    'typescript',
    'jsx',
    'tsx',
    'json',
    'html',
    'css',
    'scss',
    'markdown',
    'yaml',
    'yml',
  ]
  const loadedLangs = new Set(highlighter.getLoadedLanguages())
  await Promise.all(
    preferredLanguages
      .filter((lang) => !loadedLangs.has(lang))
      .map(async (lang) => {
        try {
          await highlighter.loadLanguage(lang)
        } catch {
          // ignore missing grammar
        }
      })
  )
  const md = new MarkdownIt({
    html: false,
    linkify: true,
  })
  const tokens = md.parse(processedContent, {})
  const loaded = new Set(highlighter.getLoadedLanguages())
  const codeBlocks = tokens
    .filter((token) => token.type === 'fence' || token.type === 'code_block')
    .map((token) => {
      const info = token.info?.trim().split(/\s+/)[0]?.toLowerCase() ?? ''
      const mapped = languageAliases[info] ?? info
      const language = mapped && loaded.has(mapped) ? mapped : 'text'
      const html = highlighter.codeToHtml(token.content, { lang: language, theme: 'dracula-soft' })
      return {
        html,
        language: info || null,
        code: token.content,
      }
    })
  const tableMarkers = tokens
    .filter((token) => token.type === 'html_block' || token.type === 'html_inline' || token.type === 'inline')
    .map((token) => {
      const match = token.content.match(/table:([a-z0-9-]+)/i)
      return match ? match[1].toLowerCase() : null
    })
    .filter((value): value is string => Boolean(value))
  const tables: Record<string, { title?: string; headers: string[]; rows: string[][]; footer?: string[] }> = {}
  const tableBaseDir = path.join(process.cwd(), 'content', 'posts', slug, 'tables')
  for (const key of tableMarkers) {
    const tableFile = path.join(tableBaseDir, `${key}.json`)
    if (fs.existsSync(tableFile)) {
      const raw = fs.readFileSync(tableFile, 'utf-8')
      tables[key] = JSON.parse(raw)
    } else if (process.env.NODE_ENV !== 'production') {
      tables[key] = {
        title: 'Missing table data',
        headers: ['Column'],
        rows: [[`Missing table: ${key}`]],
      }
    } else {
      throw new Error(`Missing table data for ${key}`)
    }
  }
  const rawExcerpt = typeof frontmatter.excerpt === 'string'
    ? frontmatter.excerpt
    : processedContent
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .shift() ?? ''
  const excerpt = rawExcerpt.length > 220
    ? `${rawExcerpt.slice(0, 217).trimEnd()}...`
    : rawExcerpt
  const wordCount = processedContent.replace(/[#_*`>\\-]/g, ' ').split(/\s+/).filter(Boolean).length
  const readingTimeMinutes = wordCount ? Math.max(1, Math.round(wordCount / 200)) : null
  const lines = processedContent.split('\n')
  let headings: HeadingItem[] = []
  let figures: FigureItem[] = []
  let figureCount = 0
  let inFence = false

  const slugify = (value: string) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (line.trim().startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const headingMatch = line.match(/^(#{2,3})\s+(.*)$/)
    if (headingMatch) {
        const level = headingMatch[1].length
        const text = headingMatch[2].trim()
        const id = slugify(text)
        headings.push({ id, text, level })
        continue
      }

  }

  const extractCaption = (value: string) => {
    const match = value.match(/_Figure\s*(\d+)?\.\s*(.*?)_/)
    return match ? match[2].trim() : null
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (token.type === 'paragraph_open') {
      const inlineToken = tokens[i + 1]
      if (inlineToken?.type === 'inline' && inlineToken.children?.length === 1 && inlineToken.children[0].type === 'image') {
        const imageToken = inlineToken.children[0]
        const src = imageToken.attrGet('src') ?? ''
        const alt = imageToken.content?.trim() || 'Figure'
        let caption: string | null = extractCaption(inlineToken.content ?? '')
        const nextOpen = tokens[i + 3]
        const nextInline = tokens[i + 4]
        if (!caption && nextOpen?.type === 'paragraph_open' && nextInline?.type === 'inline') {
          caption = extractCaption(nextInline.content ?? '')
        }
        figureCount += 1
        figures.push({ id: `fig-${figureCount}`, alt, caption, src })
      }
    }

  }

  const tocInclude = Array.isArray(frontmatter.tocInclude) ? frontmatter.tocInclude : null
  const tocExclude = Array.isArray(frontmatter.tocExclude) ? frontmatter.tocExclude : null
  if (tocInclude && tocInclude.length > 0) {
    const includeSet = new Set(tocInclude.map((value) => value.toLowerCase()))
    headings = headings.filter((item) => includeSet.has(item.id) || includeSet.has(item.text.toLowerCase()))
    figures = figures.filter((item) => includeSet.has(item.id) || includeSet.has(item.alt.toLowerCase()) || (item.caption && includeSet.has(item.caption.toLowerCase())))
  }
  if (tocExclude && tocExclude.length > 0) {
    const excludeSet = new Set(tocExclude.map((value) => value.toLowerCase()))
    headings = headings.filter((item) => !excludeSet.has(item.id) && !excludeSet.has(item.text.toLowerCase()))
    figures = figures.filter((item) => !excludeSet.has(item.id) && !excludeSet.has(item.alt.toLowerCase()) && (!item.caption || !excludeSet.has(item.caption.toLowerCase())))
  }
  const files = fs.readdirSync('posts')
  const allPosts = files.map((file) => {
    const fileContent = fs.readFileSync(`posts/${file}`, 'utf-8')
    const { data } = matter(fileContent)
    return {
      slug: file.replace('.md', ''),
      date: file.split('_')[0],
      title: data?.title ?? file.replace('.md', ''),
    }
  }).sort((a, b) => {
    if (a.date < b.date) return -1
    if (a.date > b.date) return 1
    return 0
  })
  const currentIndex = allPosts.findIndex((post) => post.slug === slug)
  const previousPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null
  const nextPost = currentIndex >= 0 && currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null
  return {
    props: {
      frontmatter: {
        ...frontmatter,
        excerpt,
        toc: typeof frontmatter.toc === 'boolean' ? frontmatter.toc : null,
        tocHeadings: typeof frontmatter.tocHeadings === 'boolean' ? frontmatter.tocHeadings : null,
        tocFigures: typeof frontmatter.tocFigures === 'boolean' ? frontmatter.tocFigures : null,
        tocMinHeadings: typeof frontmatter.tocMinHeadings === 'number' ? frontmatter.tocMinHeadings : null,
        tocMinFigures: typeof frontmatter.tocMinFigures === 'number' ? frontmatter.tocMinFigures : null,
        tocInclude: Array.isArray(frontmatter.tocInclude) ? frontmatter.tocInclude : null,
        tocExclude: Array.isArray(frontmatter.tocExclude) ? frontmatter.tocExclude : null,
      },
      content: processedContent,
      formattedDate: formatDate(date),
      readingTimeMinutes,
      previousPost,
      nextPost,
      headings,
      figures,
      codeBlocks,
      tables,
    },
  }
}
