import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import matter from 'gray-matter'

const SITE = {
  name: 'Abstract Voyage',
  url: 'https://abstract.voyage',
  author: 'Manuel Cerdas',
  description:
    'Manuel Cerdas is a creative engineer and consultant working across AI engineering, product strategy, systems thinking, and expressive web interfaces.',
  defaultDate: '2024-01-01',
}

const ROOT = process.cwd()
const POSTS_DIR = path.join(ROOT, 'posts')
const PUBLIC_DIR = path.join(ROOT, 'public')
const OG_DIR = path.join(PUBLIC_DIR, 'og')
const POST_OG_DIR = path.join(OG_DIR, 'posts')

const absoluteUrl = (pathname = '/') => {
  if (/^https?:\/\//i.test(pathname)) return pathname
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${SITE.url}${normalized}`
}

const escapeXml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const escapeSvg = escapeXml

const normalizeIsoDate = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

const dateFromSlug = (slug) => slug.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null

const getPublishedDate = ({ slug, frontmatter }) =>
  normalizeIsoDate(frontmatter?.source?.originallyPublished) ??
  normalizeIsoDate(frontmatter?.date) ??
  dateFromSlug(slug)

const getReadingTimeMinutes = (content) => {
  const wordCount = content
    .replace(/[#_*`>\\-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length

  return wordCount ? Math.max(1, Math.round(wordCount / 200)) : null
}

const getPostSummaries = () =>
  fs
    .readdirSync(POSTS_DIR)
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '')
      const raw = fs.readFileSync(path.join(POSTS_DIR, fileName), 'utf-8')
      const { data: frontmatter, content } = matter(raw)
      const title = String(frontmatter?.title ?? slug)
      const excerpt = frontmatter?.excerpt
        ? String(frontmatter.excerpt).replace(/\s+/g, ' ').trim()
        : content
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#'))
            .shift() ?? ''

      return {
        slug,
        title,
        excerpt,
        date: getPublishedDate({ slug, frontmatter }),
        tags: Array.isArray(frontmatter?.tags) ? frontmatter.tags : [],
        canonicalPath: `/posts/${slug}`,
        readingTimeMinutes: getReadingTimeMinutes(content),
      }
    })
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

const splitLines = (value, maxChars, maxLines) => {
  const words = String(value ?? '').split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
      return
    }
    current = next
  })

  if (current) lines.push(current)

  return lines.slice(0, maxLines).map((line, index, visibleLines) => {
    if (index === visibleLines.length - 1 && lines.length > maxLines) {
      return `${line.replace(/[.,;:!?]?$/, '')}...`
    }
    return line
  })
}

const buildOgSvg = ({ title, subtitle }) => {
  const titleLines = splitLines(title, 25, 3)
  const subtitleLines = splitLines(subtitle, 64, 2)

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeSvg(title)}">
  <defs>
    <radialGradient id="bg" cx="68%" cy="22%" r="90%">
      <stop offset="0%" stop-color="#29ffc6"/>
      <stop offset="32%" stop-color="#4169e1"/>
      <stop offset="64%" stop-color="#8b2be2"/>
      <stop offset="100%" stop-color="#05060a"/>
    </radialGradient>
    <linearGradient id="veil" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="52%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.45"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#05060a"/>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#veil)"/>
  <circle cx="960" cy="140" r="300" fill="#ffffff" opacity="0.08"/>
  <circle cx="990" cy="170" r="190" fill="#05060a" opacity="0.12"/>
  <text x="72" y="86" fill="#f8fafc" opacity="0.72" font-family="Inter, Arial, sans-serif" font-size="26" letter-spacing="5">${escapeSvg(SITE.name)}</text>
  ${titleLines
    .map(
      (line, index) =>
        `<text x="72" y="${230 + index * 76}" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="700">${escapeSvg(line)}</text>`,
    )
    .join('\n  ')}
  ${subtitleLines
    .map(
      (line, index) =>
        `<text x="76" y="${500 + index * 34}" fill="#f8fafc" opacity="0.72" font-family="Inter, Arial, sans-serif" font-size="28">${escapeSvg(line)}</text>`,
    )
    .join('\n  ')}
</svg>
`
}

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n += 1) {
  let c = n
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[n] = c >>> 0
}

const crc32 = (buffers) => {
  let crc = 0xffffffff
  buffers.forEach((buffer) => {
    for (let i = 0; i < buffer.length; i += 1) {
      crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
    }
  })
  return (crc ^ 0xffffffff) >>> 0
}

const pngChunk = (type, data = Buffer.alloc(0)) => {
  const typeBuffer = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32([typeBuffer, data]), 0)
  return Buffer.concat([length, typeBuffer, data, crc])
}

const hashString = (value) => {
  let hash = 2166136261
  String(value).split('').forEach((char) => {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  })
  return hash >>> 0
}

const hslToRgb = (h, s, l) => {
  const hue = (((h % 360) + 360) % 360) / 360
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (offset) => {
    let t = hue + offset
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  return [channel(1 / 3), channel(0), channel(-1 / 3)].map((value) =>
    Math.round(Math.max(0, Math.min(1, value)) * 255),
  )
}

const writeOgPng = (relativePath, { title, subtitle }) => {
  const width = 1200
  const height = 630
  const seed = hashString(`${title}:${subtitle}`)
  const hueBase = seed % 360
  const raw = Buffer.alloc((width * 4 + 1) * height)

  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < width; x += 1) {
      const nx = x / (width - 1)
      const ny = y / (height - 1)
      const wave =
        Math.sin((nx * 2.1 + seed * 0.00013) * Math.PI * 2) * 0.5 +
        Math.cos((ny * 2.7 + seed * 0.00007) * Math.PI * 2) * 0.5
      const d1 = Math.hypot(nx - 0.72, ny - 0.24)
      const d2 = Math.hypot(nx - 0.24, ny - 0.86)
      const glow = Math.max(0, 1 - d1 * 1.4) + Math.max(0, 1 - d2 * 1.65) * 0.62
      const hue = hueBase + nx * 128 - ny * 86 + wave * 28
      const saturation = 0.64 + Math.max(0, Math.min(0.24, glow * 0.12))
      const lightness = 0.24 + Math.max(0, Math.min(0.38, glow * 0.2)) + (1 - ny) * 0.08
      const [r, g, b] = hslToRgb(hue, saturation, lightness)
      const veil = 0.1 + ny * 0.25
      const offset = row + 1 + x * 4
      raw[offset] = Math.round(r * (1 - veil))
      raw[offset + 1] = Math.round(g * (1 - veil))
      raw[offset + 2] = Math.round(b * (1 - veil))
      raw[offset + 3] = 255
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND'),
  ])

  writeFile(relativePath, png)
}

const writeFile = (relativePath, content) => {
  const target = path.join(PUBLIC_DIR, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content)
}

const buildSitemap = (posts) => {
  const staticRoutes = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
    { loc: '/lab/sota', priority: '0.4', changefreq: 'monthly' },
  ]

  const urls = [
    ...staticRoutes.map((route) => ({
      ...route,
      lastmod: SITE.defaultDate,
    })),
    ...posts.map((post) => ({
      loc: post.canonicalPath,
      priority: '0.8',
      changefreq: 'monthly',
      lastmod: post.date ?? SITE.defaultDate,
    })),
  ]

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeXml(absoluteUrl(url.loc))}</loc>
    <lastmod>${escapeXml(url.lastmod)}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`
}

const buildRobots = () => `User-agent: *
Allow: /

Sitemap: ${absoluteUrl('/sitemap.xml')}
`

const buildFeed = (posts) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.name)}</title>
    <link>${escapeXml(SITE.url)}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(absoluteUrl('/feed.xml'))}" rel="self" type="application/rss+xml" />
${posts
  .map(
    (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(absoluteUrl(post.canonicalPath))}</link>
      <guid>${escapeXml(absoluteUrl(post.canonicalPath))}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${new Date(post.date ?? SITE.defaultDate).toUTCString()}</pubDate>
    </item>`,
  )
  .join('\n')}
  </channel>
</rss>
`

const buildLlmsTxt = (posts) => `# ${SITE.name}

${SITE.description}

## Canonical Resources

- Home: ${absoluteUrl('/')}
- Sitemap: ${absoluteUrl('/sitemap.xml')}
- RSS feed: ${absoluteUrl('/feed.xml')}
- Contact: ${absoluteUrl('/contact')}
- Lab: ${absoluteUrl('/lab/sota')}

## Articles

${posts
  .map((post) => `- [${post.title}](${absoluteUrl(post.canonicalPath)}) - ${post.excerpt}`)
  .join('\n')}
`

const main = () => {
  const posts = getPostSummaries()

  fs.mkdirSync(OG_DIR, { recursive: true })
  fs.mkdirSync(POST_OG_DIR, { recursive: true })

  writeFile('sitemap.xml', buildSitemap(posts))
  writeFile('robots.txt', buildRobots())
  writeFile('feed.xml', buildFeed(posts))
  writeFile('llms.txt', buildLlmsTxt(posts))
  writeFile(
    'og/index.svg',
    buildOgSvg({
      title: SITE.author,
      subtitle: SITE.description,
    }),
  )
  writeOgPng('og/index.png', {
    title: SITE.author,
    subtitle: SITE.description,
  })

  posts.forEach((post) => {
    writeFile(
      `og/posts/${post.slug}.svg`,
      buildOgSvg({
        title: post.title,
        subtitle: post.excerpt,
      }),
    )
    writeOgPng(`og/posts/${post.slug}.png`, {
      title: post.title,
      subtitle: post.excerpt,
    })
  })

  console.log(`Generated SEO assets for ${posts.length} posts.`)
}

main()
