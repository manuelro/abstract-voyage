/** @type {import('next').NextConfig} */
const nextConfig = {
  // Opt-in only (CLAUDE_NEXT_DIST_DIR unset for a normal `next dev`/`next
  // build`, so this is a no-op for anyone not setting it) — lets an agent's
  // own dev server use a private build directory instead of the repo's
  // shared .next, so two concurrent `next dev` processes in this same
  // working directory (a real, recurring situation on this repo) never
  // corrupt each other's webpack pack-file cache again.
  ...(process.env.CLAUDE_NEXT_DIST_DIR ? { distDir: process.env.CLAUDE_NEXT_DIST_DIR } : {}),
  reactStrictMode: true,
  images: { unoptimized: true },
  // Swiper ships ESM (.mjs); transpile it so Next can bundle it under the pages router.
  transpilePackages: ['swiper'],
  // Restricted to .tsx only: this release's `pages/` directory also holds
  // each page's own co-located `.config.ts` (abstract.config.ts,
  // contact.config.ts, about.config.ts — runtime defaults, not routes).
  // Next.js's default pageExtensions treats every matching file directly
  // under `pages/` as its own route, which fails the build ("found pages
  // without a React Component as default export") unless those defaults
  // files are excluded here.
  pageExtensions: ['tsx'],
}

module.exports = nextConfig
