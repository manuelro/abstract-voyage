#!/usr/bin/env node
// Production build wrapper (PLAN-PRODUCTION-ROUTE-ALLOWLIST.md). Every page
// stays in pages/ in source control — this script only changes what a
// PRODUCTION build (`npm run build:static`, what Netlify actually runs)
// sees on disk while it runs.
//
// next.config.js's exportPathMap filters next export's own OUTPUT to just
// the production routes, but `next build` itself still compiles and
// prerenders every page under pages/ regardless of that filter — confirmed
// empirically (2026-10-18): pages/quote-lab.tsx (a dev-only panel sandbox,
// never part of the panel-build-exclusion production work) crashes
// "Collecting page data" under the production Panel.stub substitution,
// which fails the whole `next build`, before exportPathMap ever gets a
// chance to filter anything. A page that isn't meant to ship doesn't need
// to survive the production webpack aliasing; it just needs to not be
// *present* while that build runs.
//
// So this script temporarily moves every pages/**/*.tsx file EXCEPT the
// production allowlist (PRODUCTION_PAGE_FILES below) to a staging
// directory, runs the real build + export, then always moves everything
// back — a try/finally, so an interrupted or failed build can't leave
// pages/ missing files. Safe to run against an isolated checkout (this is
// exactly what Netlify does: a fresh clone per build, no concurrent dev
// server). Do NOT run this against a shared local working tree that
// another `next dev` session might be watching — the staged-out files
// briefly disappear from disk, which a concurrent session's file watcher
// would see. For local verification, run it inside a disposable `git
// worktree` instead (see PLAN-PRODUCTION-ROUTE-ALLOWLIST.md's test record).
//
// One file in PRODUCTION_PAGE_FILES (wall.tsx) is a real dependency that
// isn't itself a shipped route — pages/index.tsx imports its component and
// getStaticProps directly, so the file can't be staged out, but Next's own
// pages-router file-based routing still auto-discovers it as its own
// `/wall` page regardless. next.config.js's exportPathMap does NOT
// suppress this for a getStaticProps page in this Next version — confirmed
// empirically (2026-10-18): the export still wrote out/wall.html and
// out/_next/data/<buildId>/wall.json even with exportPathMap returning
// only /, /about, /contact. EXTRA_EXPORT_ARTIFACTS_TO_PRUNE below removes
// exactly that leftover after export, as a final, verified step — not a
// second guess layered on top of exportPathMap, a replacement for the part
// of this problem exportPathMap turned out not to solve.
//
// To add a new page to the production build: add its pages/**/*.tsx path
// to PRODUCTION_PAGE_FILES below, add its public route to
// PRODUCTION_ROUTES in next.config.js's exportPathMap, and add the route to
// release-manifest.json's `routes` array — all three in the same change.
// See PLAN-PRODUCTION-ROUTE-ALLOWLIST.md §9 for the full checklist.

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const PAGES_DIR = path.join(ROOT, 'pages')
const STAGING_DIR = process.env.PAGES_STAGING_DIR || path.join(ROOT, '.pages-excluded-staging')

// Files that must stay in pages/ for the production build to succeed:
// Next's framework files, the three shipped routes, and wall.tsx — not a
// shipped route on its own (next.config.js's exportPathMap hides /wall,
// public/_redirects 301s it to /), but pages/index.tsx imports its
// component and getStaticProps directly, so the file itself is a hard
// dependency of the one route that IS kept.
const PRODUCTION_PAGE_FILES = new Set([
  '_app.tsx',
  '_document.tsx',
  'index.tsx',
  'about.tsx',
  'contact.tsx',
  'wall.tsx',
])

function listTsxFiles(dir, baseDir = dir) {
  let out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out = out.concat(listTsxFiles(full, baseDir))
    } else if (entry.name.endsWith('.tsx')) {
      out.push(path.relative(baseDir, full))
    }
  }
  return out
}

function stageOut() {
  const allTsx = listTsxFiles(PAGES_DIR)
  const toMove = allTsx.filter((rel) => !PRODUCTION_PAGE_FILES.has(rel))
  fs.rmSync(STAGING_DIR, { recursive: true, force: true })
  fs.mkdirSync(STAGING_DIR, { recursive: true })
  for (const rel of toMove) {
    const from = path.join(PAGES_DIR, rel)
    const to = path.join(STAGING_DIR, rel)
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.renameSync(from, to)
  }
  return toMove
}

// Page-file paths (relative to pages/) that have to stay present as import
// dependencies of a kept route but are NOT themselves a shipped production
// route, so their own exported output must be removed after next export
// writes it (see the top-of-file comment on why exportPathMap alone
// doesn't suppress this). Map: pages/ file -> the route Next derives from
// it, used to delete both the .html and its out/_next/data/<buildId>/*.json
// companion.
const NON_ROUTE_DEPENDENCY_ROUTES = {
  'wall.tsx': 'wall',
}

function pruneLeakedNonRouteExports(outDir) {
  for (const route of Object.values(NON_ROUTE_DEPENDENCY_ROUTES)) {
    const htmlPath = path.join(outDir, `${route}.html`)
    if (fs.existsSync(htmlPath)) {
      fs.rmSync(htmlPath)
      console.log(`[build-production-routes] pruned leaked export: ${path.relative(ROOT, htmlPath)}`)
    }
    const dataDir = path.join(outDir, '_next', 'data')
    if (fs.existsSync(dataDir)) {
      for (const buildId of fs.readdirSync(dataDir)) {
        const dataPath = path.join(dataDir, buildId, `${route}.json`)
        if (fs.existsSync(dataPath)) {
          fs.rmSync(dataPath)
          console.log(`[build-production-routes] pruned leaked export: ${path.relative(ROOT, dataPath)}`)
        }
      }
    }
  }
}

function restore(moved) {
  for (const rel of moved) {
    const from = path.join(STAGING_DIR, rel)
    const to = path.join(PAGES_DIR, rel)
    if (fs.existsSync(from)) {
      fs.mkdirSync(path.dirname(to), { recursive: true })
      fs.renameSync(from, to)
    }
  }
  fs.rmSync(STAGING_DIR, { recursive: true, force: true })
}

let moved = []
let failed = false
try {
  moved = stageOut()
  console.log(`[build-production-routes] staged out ${moved.length} non-production page file(s):`)
  for (const rel of moved) console.log(`  - pages/${rel}`)
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' })
  execSync('npx next export', { cwd: ROOT, stdio: 'inherit' })
  pruneLeakedNonRouteExports(path.join(ROOT, 'out'))
} catch (err) {
  failed = true
  throw err
} finally {
  restore(moved)
  console.log(`[build-production-routes] restored ${moved.length} page file(s) to pages/.${failed ? ' (build failed; pages/ is back to its normal state)' : ''}`)
}
