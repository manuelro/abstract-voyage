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
  // SPIKE (components/Panel.stub) — proves panel code can live in this
  // branch's tree and still be provably absent from production output,
  // via build-time module substitution rather than physical file removal.
  // Only active for production builds (`dev` is true under `next dev`,
  // false under `next build`) — see CONFIG-CHANGE-PROTOCOL.md's
  // "Architecture path" decision for why this exists and what it must
  // prove before the real panel system is ported on top of it.
  webpack(config, { dev }) {
    if (!dev) {
      const path = require('path')
      const fs = require('fs')
      const alias = {
        [path.resolve(__dirname, 'components/Panel')]: path.resolve(__dirname, 'components/Panel.stub'),
      }
      // Every *.panel.ts scope-definition file gets its own alias entry,
      // read from the manifest scripts/generate-panel-stubs.js produces —
      // adding a new panel file and re-running that script is the only
      // step required to keep this list current; nothing here is
      // hand-maintained. See CONFIG-CHANGE-PROTOCOL.md.
      const manifestPath = path.resolve(__dirname, 'scripts/panel-stub-manifest.json')
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
        for (const { real, stub } of manifest.scopes) {
          alias[path.resolve(__dirname, real.replace(/\.tsx?$/, ''))] =
            path.resolve(__dirname, stub.replace(/\.ts$/, ''))
        }
      }
      config.resolve.alias = { ...config.resolve.alias, ...alias }
    }
    return config
  },
}

module.exports = nextConfig
