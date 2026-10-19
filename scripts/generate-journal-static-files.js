#!/usr/bin/env node
// Regenerates public/sitemap.xml and public/feed.xml from the real posts/
// directory, so adding a new journal article is just "drop a .md file in
// posts/" — no hand-edited route list to keep in sync (see
// PLAN-PRODUCTION-ROUTE-ALLOWLIST.md §12). Run via `npm run
// generate:journal-static` (also wired into `build:static`, right before
// the real `next build`/`next export`, so a forgotten manual run can never
// ship a stale sitemap/feed).
//
// Deliberately a small, standalone duplication of helpers/postContent.ts's
// slug/date/title/excerpt extraction rather than importing that module —
// this script runs under plain `node`, same as scripts/build-production-
// routes.js, with no ts-node/register step in this repo to import a .ts
// helper directly.

const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')

const ROOT = path.resolve(__dirname, '..')
const POSTS_DIR = path.join(ROOT, 'posts')
const SITE_URL = 'https://abstract.voyage'

// Same exclusion pages/journal.tsx's own getStaticProps and pages/wall.tsx/
// pages/abstract.tsx's own featured-rail queries already apply: 'welcome'
// is a real, directly-linked page (getStaticPaths still generates it) but
// never appears in any listing of posts, so it's left out of the feed
// (an RSS reader has no "evergreen about page" slot) but still gets a
// sitemap entry (it's still a real, crawlable page).
const FEED_EXCLUDED_SLUGS = new Set(['welcome'])

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function readPosts() {
  return fs.readdirSync(POSTS_DIR)
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '')
      const raw = fs.readFileSync(path.join(POSTS_DIR, fileName), 'utf8')
      const { data } = matter(raw)
      const dateMatch = slug.match(/^(\d{4}-\d{2}-\d{2})/)
      return {
        slug,
        date: dateMatch ? dateMatch[1] : null,
        title: String(data.title ?? slug),
        excerpt: data.excerpt ? String(data.excerpt) : '',
      }
    })
    .sort((a, b) => {
      // Undated slugs (e.g. 'welcome') sort last, same as sortPostSummaries.
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0
    })
}

function buildSitemap(posts) {
  // The three fixed, hand-authored pages (/, /about, /contact) live only
  // here — there is no other source of truth for their priority/changefreq,
  // so this script owns the whole file, not just the generated tail.
  const urls = [
    { loc: `${SITE_URL}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE_URL}/about`, changefreq: 'monthly', priority: '0.8' },
    { loc: `${SITE_URL}/contact`, changefreq: 'monthly', priority: '0.7' },
    { loc: `${SITE_URL}/journal`, changefreq: 'weekly', priority: '0.8' },
    ...posts.map((post) => ({
      loc: `${SITE_URL}/journal/${post.slug}`,
      changefreq: 'yearly',
      priority: FEED_EXCLUDED_SLUGS.has(post.slug) ? '0.5' : '0.6',
    })),
  ]
  const body = urls.map((url) => (
    `  <url>\n    <loc>${escapeXml(url.loc)}</loc>\n    <changefreq>${url.changefreq}</changefreq>\n    <priority>${url.priority}</priority>\n  </url>`
  )).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

function buildFeed(posts) {
  const items = posts
    .filter((post) => !FEED_EXCLUDED_SLUGS.has(post.slug) && post.date)
    .map((post) => {
      const link = `${SITE_URL}/journal/${post.slug}`
      const pubDate = new Date(`${post.date}T00:00:00Z`).toUTCString()
      return `    <item>\n      <title>${escapeXml(post.title)}</title>\n      <link>${link}</link>\n      <guid>${link}</guid>\n      <pubDate>${pubDate}</pubDate>\n      <description>${escapeXml(post.excerpt)}</description>\n    </item>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>Abstract Voyage</title>\n    <link>${SITE_URL}</link>\n    <description>Manuel Cerdas is a creative engineer and consultant working across AI engineering, product strategy, systems thinking, and expressive web interfaces.</description>\n    <language>en</language>\n    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />\n${items}\n  </channel>\n</rss>\n`
}

function run() {
  const posts = readPosts()
  const sitemapPath = path.join(ROOT, 'public/sitemap.xml')
  const feedPath = path.join(ROOT, 'public/feed.xml')
  fs.writeFileSync(sitemapPath, buildSitemap(posts))
  fs.writeFileSync(feedPath, buildFeed(posts))
  console.log(`[generate-journal-static-files] wrote public/sitemap.xml and public/feed.xml for ${posts.length} post(s) (/journal + /journal/<slug> per post).`)
}

run()
