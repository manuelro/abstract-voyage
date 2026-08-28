// Deliberately its own file, with zero Node-only imports (PLAN: article
// reading view) — helpers/postContent.ts imports `fs` at module scope, so
// anything importing from it gets bundled into the client too the moment a
// browser-rendered page (not just a getStaticProps call) imports anything
// from that file, which is exactly what broke when this function first
// lived there and pages/posts/[slug].tsx imported it for its own
// next/previous links ("Module not found: Can't resolve 'fs'" from
// webpack's client bundle). This file has no such import, so it's safe for
// both server code (helpers/postContent.ts's own toSliderSlides) and
// client-rendered page components to import directly.

// Dev-time-only redirect — while the new reading-view layout
// (pages/posts-lab/[slug].tsx) is under construction, every *navigable*
// article link across the site (homepage/journal cards, the article page's
// own next/previous footer links) should point users at the sandbox route
// instead of the production one, so it can be exercised by clicking
// through the real site rather than only by typing the sandbox URL
// directly. Tied to NODE_ENV, not a manual flag, so a production build can
// never accidentally ship with these links pointed at a noindex'd sandbox
// route — this reverts itself the moment `next build` runs, no one has to
// remember to flip it back.
//
// Deliberately separate from canonicalPath/getPostCanonicalPath
// (helpers/siteMetadata.ts) and PostSummary.canonicalPath
// (helpers/postContent.ts), both of which stay pointed at the real
// /posts/${slug} path always — SEO/OG/JSON-LD metadata must keep
// describing the production URL regardless of where a dev-mode click
// actually lands.
//
// Reads process.env.NODE_ENV live on every call, not a module-level
// constant cached at import time — Next.js's own value never actually
// changes mid-process, but a cached value would (harmlessly, since a
// stale flag stays consistent within any one real dev/build run) be
// impossible for helpers/postContent.test.ts to exercise both branches of
// without a full module reset.
//
// Removal, once the sandbox layout graduates to replace pages/posts/
// [slug].tsx for good: delete this file, and replace each call site with a
// plain `/posts/${slug}` template literal again (or, better, point them at
// whatever route the new layout lives at by then).
export function getArticleHref(slug: string): string {
  return process.env.NODE_ENV !== 'production' ? `/posts-lab/${slug}` : `/posts/${slug}`
}
