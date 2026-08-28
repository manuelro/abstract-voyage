#!/usr/bin/env node
// Deterministic pre-promotion gate for this release branch. Runs the full
// build, then checks the actual exported output against
// release-manifest.json: every approved route must exist, nothing
// unapproved may appear, required static files (sitemap/robots/feed) must
// be present, no stripped panel identifier may leak into the compiled
// output, and every internal link discovered in the export must resolve to
// a real file. See P1-404-INCIDENT-RCA-AND-RELEASE-PROTOCOL.md §C/§H for
// why each check exists — this script is the automated replacement for the
// manual verification that let the original 404 incident reach production.
//
// This is deliberately deterministic, not AI-assisted: pass/fail here must
// be reproducible and non-probabilistic. AI-assisted checks (content-parity
// review, visual regression judgment calls) are a separate, advisory layer
// on top of this — see §G — not a substitute for it.

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = process.env.VERIFY_OUT_DIR || path.join(ROOT, 'out-verify')
const DIST_DIR = process.env.VERIFY_DIST_DIR || '.next-verify'
const SKIP_BUILD = process.env.VERIFY_SKIP_BUILD === '1'

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'release-manifest.json'), 'utf8'))

let failures = []
let warnings = []

function section(title) {
  console.log(`\n=== ${title} ===`)
}

function run() {
  section('1. Build + static export')
  if (SKIP_BUILD) {
    console.log('VERIFY_SKIP_BUILD=1 — reusing existing OUT_DIR:', OUT_DIR)
  } else {
    execSync(
      `npx next build`,
      { cwd: ROOT, stdio: 'inherit', env: { ...process.env, CLAUDE_NEXT_DIST_DIR: DIST_DIR } },
    )
    execSync(
      `npx next export -o ${JSON.stringify(OUT_DIR)}`,
      { cwd: ROOT, stdio: 'inherit', env: { ...process.env, CLAUDE_NEXT_DIST_DIR: DIST_DIR } },
    )
  }

  section('2. Type check + unit tests')
  execSync('npx tsc --noEmit', { cwd: ROOT, stdio: 'inherit' })
  execSync('npx vitest run', { cwd: ROOT, stdio: 'inherit' })

  section('3. Route manifest diff')
  const htmlFiles = walk(OUT_DIR).filter((f) => f.endsWith('.html'))
  const actualRoutes = htmlFiles
    .map((f) => f.slice(OUT_DIR.length))
    .map((f) => f.replace(/\.html$/, ''))
    .map((f) => (f.endsWith('/index') ? f.slice(0, -('/index'.length)) : f))
    .map((f) => (f === '' ? '/' : f))
    .filter((f) => f !== '/404')
    .sort()
  const approvedRoutes = [...manifest.routes].sort()

  const unapproved = actualRoutes.filter((r) => !approvedRoutes.includes(r))
  const missing = approvedRoutes.filter((r) => !actualRoutes.includes(r))

  if (unapproved.length) {
    failures.push(
      `Unapproved route(s) in export, not present in release-manifest.json: ${unapproved.join(', ')}. ` +
      `If this addition is intentional, update release-manifest.json in the same change.`,
    )
  }
  if (missing.length) {
    failures.push(
      `Approved route(s) missing from export: ${missing.join(', ')}. ` +
      `Either the build silently dropped a route, or release-manifest.json is stale.`,
    )
  }
  if (!unapproved.length && !missing.length) {
    console.log(`OK — ${actualRoutes.length} routes match release-manifest.json exactly.`)
  }

  section('4. Required static files (sitemap/robots/feed)')
  for (const rel of manifest.requiredStaticFiles || []) {
    const p = path.join(OUT_DIR, rel)
    if (fs.existsSync(p)) {
      console.log(`OK      ${rel}`)
    } else {
      failures.push(`Required static file missing from export: ${rel}`)
    }
  }

  section('5. Stripped panel-identifier leak check')
  const forbidden = manifest.forbiddenIdentifiers || []
  const allOutputFiles = walk(OUT_DIR).filter((f) => f.endsWith('.html') || f.endsWith('.js'))
  let leakCount = 0
  for (const file of allOutputFiles) {
    const content = fs.readFileSync(file, 'utf8')
    for (const ident of forbidden) {
      if (content.includes(ident)) {
        failures.push(`Forbidden identifier "${ident}" found in ${file.slice(ROOT.length)}`)
        leakCount += 1
      }
    }
  }
  if (!leakCount) {
    console.log(`OK — zero references to any of ${forbidden.length} forbidden panel identifiers.`)
  }

  section('6. Internal link integrity')
  const linkIssues = checkInternalLinks(OUT_DIR, htmlFiles)
  if (linkIssues.length) {
    for (const issue of linkIssues) failures.push(issue)
  } else {
    console.log('OK — every internal link discovered resolves to a real file in the export.')
  }

  section('Result')
  if (failures.length) {
    console.log(`FAILED — ${failures.length} issue(s):\n`)
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`))
    if (warnings.length) {
      console.log(`\nWarnings:\n`)
      warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`))
    }
    process.exit(1)
  }
  console.log('PASSED — all deterministic release gates green. Not a substitute for the production verification steps in §C after deploy.')
}

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

function checkInternalLinks(outDir, htmlFiles) {
  const issues = []
  const hrefPattern = /href[":]{1,2}\\?"(\/[a-zA-Z0-9_\-./]*)\\?"/g
  const existing = new Set(
    walk(outDir).map((f) => f.slice(outDir.length)),
  )
  const resolves = (route) => {
    if (route.startsWith('/_next/') || route.startsWith('/og/') || route.includes('.')) {
      // asset paths (has an extension) — check literally
      return existing.has(route)
    }
    const clean = route === '/' ? '/index.html' : `${route}.html`
    return existing.has(clean) || existing.has(`${route}/index.html`)
  }

  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8')
    const seen = new Set()
    let match
    while ((match = hrefPattern.exec(content))) {
      const href = match[1]
      if (seen.has(href)) continue
      seen.add(href)
      if (!resolves(href)) {
        issues.push(`${file.slice(outDir.length)} links to "${href}", which has no matching file in the export.`)
      }
    }
  }
  return issues
}

run()
