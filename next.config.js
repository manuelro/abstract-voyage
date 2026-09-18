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
      // Bug fix (Netlify build failure, confirmed reproducible locally with
      // `next build`): this used to be one blanket directory alias —
      // `components/Panel` -> `components/Panel.stub` — on the theory that
      // "everything under components/Panel/ is panel UI, strip all of it."
      // That's false: components/Panel/config/componentConfigUpdateParser.ts
      // and .../applyComponentConfigUpdate.ts (server-side logic
      // pages/api/dev/apply-config-update.tsx needs) live under that same
      // directory but aren't panel UI and have no counterpart in
      // components/Panel.stub/ — webpack's directory-prefix alias redirected
      // them there anyway, producing "Module not found" for a file that
      // genuinely exists and that `tsc`/`vitest` both resolve without
      // complaint (neither applies this production-only webpack alias).
      // Fixed by aliasing exact files instead of the whole directory —
      // walking components/Panel.stub/ itself recursively so every file
      // that's ACTUALLY meant to be stubbed (today: ConfigPanel.tsx,
      // config.ts, config/shell.ts, index.ts, useAuthoringToolsVisibility.ts)
      // gets its own precise alias entry, the exact same "one entry per
      // real file, generated, not hand-maintained" shape the *.panel.ts
      // manifest below already uses — anything else under components/Panel/
      // (componentConfigUpdateParser.ts included) is left completely
      // unaliased and resolves normally, in production exactly like in dev.
      const alias = {}
      const stubRoot = path.resolve(__dirname, 'components/Panel.stub')
      const realRoot = path.resolve(__dirname, 'components/Panel')
      const walkStubFiles = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const stubPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            walkStubFiles(stubPath)
            continue
          }
          if (!/\.tsx?$/.test(entry.name)) continue
          const relativePath = path.relative(stubRoot, stubPath)
          const extensionlessRelative = relativePath.replace(/\.tsx?$/, '')
          // `$` forces an EXACT match, not webpack's default prefix match —
          // required here specifically because components/Panel/config.ts
          // (a file) and components/Panel/config/ (a directory containing
          // componentConfigUpdateParser.ts and friends) share the same
          // extensionless string. Without `$`, aliasing the FILE
          // `components/Panel/config` also silently matches every deeper
          // path under the DIRECTORY `components/Panel/config/*` — the
          // exact bug this whole per-file rewrite exists to fix, just
          // recreated one level down. Confirmed empirically: omitting `$`
          // here reproduced the identical "Module not found" Netlify build
          // failure this rewrite was meant to close.
          alias[`${path.join(realRoot, extensionlessRelative)}$`] =
            path.join(stubRoot, extensionlessRelative)
        }
      }
      if (fs.existsSync(stubRoot)) walkStubFiles(stubRoot)
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
