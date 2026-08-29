#!/usr/bin/env node
// Generates production-safe stand-ins for every source file OUTSIDE
// components/Panel/ that imports a *value* (not just a type) from
// components/Panel/* — see CONFIG-CHANGE-PROTOCOL.md's "Architecture path"
// decision. components/Panel/* itself is the shared engine, already
// covered wholesale by the single components/Panel -> components/Panel.stub
// alias in next.config.js.
//
// Detection is content-based (does this file actually import from
// components/Panel), not filename-pattern-based. That's a deliberate
// correction, not the original design: an earlier filename-regex version
// of this script (matching only `<Name>.panel.ts`) silently missed the
// bare `panel.ts` convention used by ~10 real scope-recipe files
// (CtaButton/config/panel.ts, SiteHeader/config/panel.ts, etc.), and would
// have missed page-specific panel *components* (FontConfigPanel.tsx,
// ContactConfigPanel.tsx, ...) entirely — a different filename shape again.
// Scanning actual imports instead of guessing at naming conventions covers
// every category by construction, including any future one no one has
// named yet.
//
// Usage: node scripts/generate-panel-stubs.js
// Writes: <file>.stub.ts next to each panel-touching file, and
//         scripts/panel-stub-manifest.json (real path -> stub path),
//         which next.config.js reads to build its production webpack
//         aliases. Re-run whenever a file starts or stops importing from
//         components/Panel.

const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const ROOT = path.resolve(__dirname, '..')
const PANEL_DIR = path.resolve(ROOT, 'components/Panel')
const SKIP_DIRS = new Set(['node_modules', '.git'])

// Whole-file stubbing is only safe when a file's SOLE purpose is
// panel-specific — nothing in it is needed for production at all. Two
// categories are unsafe to auto-detect this way, discovered by actually
// running the scan rather than assumed:
//
// 1. `pages/*.tsx` (route files specifically — next.config.js restricts
//    `pageExtensions` to `.tsx`, so those are the only files under pages/
//    Next.js ever treats as a route) — every page mixes real, always-shipped
//    content with an optional panel; never eligible for whole-file
//    replacement. Sibling `.ts` files under pages/ (`about.panel.ts`,
//    `aboutConfigPanels.ts`, ...) are NOT routes and are scanned normally —
//    an earlier version of this rule excluded the whole pages/ directory,
//    which silently skipped every real panel-recipe file that happens to be
//    co-located with its page.
// 2. Known shared/mixed files — real, always-needed logic with panel-adjacent
//    pieces mixed in, never eligible for whole-file replacement. Two
//    different shapes found so far, both requiring the file to stay real
//    rather than be aliased, but for different reasons:
//    - `SharedDesignConfigProvider.tsx`: a plain data field
//      (panelShellConfig) that's genuinely only read by the panel, but
//      lives inside a context-value object literal built unconditionally
//      for every page. Fixed with a surgical
//      `process.env.NODE_ENV !== 'production' ? {...} : {}` value-branch
//      around just that field (see that file's own `useMemo`).
//    - `useAbstractDesignConfigBindings.ts`: exports a plain lookup
//      constant (ABSTRACT_DESIGN_CONFIG_BINDING_KEYS_BY_PAGE) that pages
//      read unconditionally as a hook argument — hooks can't be
//      conditionally called, so this can never be null. Needed NO branch
//      once identified: keeping the whole file real is enough, because its
//      own downstream calls (createConfigScopeBinding, each *.panel.ts
//      import) are already individually aliased to safe no-ops elsewhere —
//      the function just harmlessly returns an array of already-stubbed
//      nulls in production, never dereferenced outside the
//      showAuthoringTools-gated render.
//    Maintained explicitly here, not detected automatically, because "is
//    this file 100% panel-only" can't be answered by import analysis
//    alone — found both of these by actually running the build, not by
//    inspection. Reviewed, explicit list rather than a guess.
const KNOWN_MIXED_FILES = new Set([
  'components/SharedDesignConfigProvider.tsx',
  'experiences/abstract/hooks/useAbstractDesignConfigBindings.ts',
])

const PAGES_DIR = path.resolve(ROOT, 'pages')

function isPageRouteFile(full) {
  const rel = path.relative(PAGES_DIR, full)
  return !rel.startsWith('..') && rel !== '' && full.endsWith('.tsx')
}

function walkSourceFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name.startsWith('out') || SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (full === PANEL_DIR) continue // the engine itself — already aliased wholesale
    if (entry.isDirectory()) {
      walkSourceFiles(full, results)
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) {
      if (isPageRouteFile(full)) continue // route file — see KNOWN_MIXED_FILES comment above
      results.push(full)
    }
  }
  return results
}

function resolveImportTarget(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null // not a relative import — can't be components/Panel/*
  const resolved = path.resolve(path.dirname(fromFile), specifier)
  return resolved
}

function isUnderPanelDir(resolvedPath) {
  const rel = path.relative(PANEL_DIR, resolvedPath)
  return !rel.startsWith('..') && rel !== ''
}

// True if this file has at least one VALUE import (not type-only) whose
// specifier resolves under components/Panel/. Type-only imports are erased
// by the compiler before webpack runs regardless of aliasing, so a
// type-only-importing file never needs stubbing on that basis alone.
function importsPanelValue(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true)
  let found = false

  sourceFile.forEachChild((node) => {
    if (found || !ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) return
    const target = resolveImportTarget(filePath, node.moduleSpecifier.text)
    if (!target || !isUnderPanelDir(target)) return

    const clause = node.importClause
    if (!clause) return // side-effect-only import — no value/type distinction, ignore
    if (clause.isTypeOnly) return // `import type { ... }` — fully erased, never bundled

    // Default import, or named imports where at least one isn't `import { type X }`.
    if (clause.name) { found = true; return }
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      if (clause.namedBindings.elements.some((el) => !el.isTypeOnly)) found = true
    } else if (clause.namedBindings) {
      found = true // namespace import (`import * as X`)
    }
  })

  return found
}

function getValueExportNames(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true)
  const names = []

  sourceFile.forEachChild((node) => {
    const hasExportModifier = (n) =>
      ts.canHaveModifiers(n) && ts.getModifiers(n)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)

    if (ts.isVariableStatement(node) && hasExportModifier(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) names.push(decl.name.text)
      }
    } else if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && hasExportModifier(node)) {
      if (node.name) names.push(node.name.text)
    } else if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const el of node.exportClause.elements) {
        if (!el.isTypeOnly) names.push(el.name.text)
      }
    }
  })

  return [...new Set(names)]
}

function stubPathFor(realPath) {
  // Inserting `.stub` right before the extension works uniformly
  // regardless of the real file's own naming convention — deliberately
  // not derived from a `panel`-specific substring match (see file header).
  return realPath.replace(/\.tsx?$/, '.stub.ts')
}

function writeStub(realPath, stubPath, exportNames) {
  const rel = path.relative(ROOT, realPath)
  // No shared, separately-named helper function at all — each export gets
  // its own fully self-contained, anonymous IIFE below. Tried a shared
  // `function createSafeStub() {...}` first (both the plain name every
  // generated stub used to share, then a per-file-hash-unique name to rule
  // out a cross-module collision) — neither survived production
  // minification: confirmed live, 2026-08-28, the minifier itself
  // synthesizes a debug-friendly name of the form `<ExportName>_stub_<fn>`
  // for a named function whose result is assigned to a single-use export
  // binding, regardless of what that function was actually named in
  // source — so a real panel component's own name (a forbidden identifier)
  // kept getting woven back into the compiled bundle no matter what this
  // script called the helper. An arrow-function IIFE has no name for the
  // minifier to key that synthesis off in the first place — self-reference
  // (for the recursive "any property access is itself safely stubbed" leg)
  // goes through a plain local `const p`, not a named function, since
  // minifiers don't apply this same debug-naming treatment to ordinary
  // variable bindings.
  const header = [
    '// GENERATED FILE — do not hand-edit.',
    `// Production stand-in for ${rel}, produced by scripts/generate-panel-stubs.js.`,
    '// Every real consumer only reads these values inside a showAuthoringTools-gated',
    '// render, which is always false in production — EXCEPT that some real code',
    '// constructs bindings/registries unconditionally (e.g. `registry.resolve(id)`',
    '// as an argument, before the result is ever gated) and only the RENDER of the',
    '// final result is gated. A blanket `null` crashes on the first `.method()` call',
    '// in that shape (confirmed the hard way — contact.tsx\'s',
    '// `contactConfigPanelRegistry.resolve(...)` — see CONFIG-CHANGE-PROTOCOL.md).',
    '// So: every export here is a Proxy that is safely callable AND safely has any',
    '// method called on it, always returning null/undefined rather than throwing,',
    '// regardless of which shape (component, function, plain value, or object with',
    '// methods like a registry) the real export actually has.',
    '//',
    '// Each export below is its own anonymous, self-contained IIFE, not a call',
    '// to a shared named helper — see this function\'s own doc comment in',
    '// generate-panel-stubs.js for why that distinction matters here.',
    '',
  ].join('\n')
  const body = exportNames
    .map((name) => [
      `export const ${name}: any = (() => {`,
      '  const p: any = new Proxy(() => undefined, {',
      '    get(t, prop) { return prop in t ? (t as any)[prop] : p },',
      '    apply() { return undefined },',
      '  })',
      '  return p',
      '})()',
    ].join('\n'))
    .join('\n')
  fs.writeFileSync(stubPath, header + body + '\n')
}

function main() {
  const candidates = walkSourceFiles(ROOT)
  const panelTouching = candidates.filter(importsPanelValue)
  const manifest = []
  const flaggedForReview = []

  for (const realPath of panelTouching) {
    const rel = path.relative(ROOT, realPath).replace(/\\/g, '/')
    if (KNOWN_MIXED_FILES.has(rel)) flaggedForReview.push(rel)
  }

  for (const realPath of panelTouching) {
    const rel = path.relative(ROOT, realPath).replace(/\\/g, '/')
    if (KNOWN_MIXED_FILES.has(rel)) continue // handled via surgical NODE_ENV branch, not whole-file stub
    const exportNames = getValueExportNames(realPath)
    if (!exportNames.length) continue // nothing to alias if it exports no values of its own
    const stubPath = stubPathFor(realPath)
    writeStub(realPath, stubPath, exportNames)
    manifest.push({
      real: path.relative(ROOT, realPath).replace(/\\/g, '/'),
      stub: path.relative(ROOT, stubPath).replace(/\\/g, '/'),
      exports: exportNames,
    })
  }

  fs.writeFileSync(
    path.join(__dirname, 'panel-stub-manifest.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), scopes: manifest }, null, 2) + '\n',
  )

  console.log(`Generated ${manifest.length} panel-touching stub(s):`)
  for (const entry of manifest) {
    console.log(`  ${entry.real} -> ${entry.stub}  (${entry.exports.join(', ')})`)
  }
  if (flaggedForReview.length) {
    console.log(`\nSkipped ${flaggedForReview.length} known-mixed file(s) — NOT auto-stubbed, needs the surgical NODE_ENV-branch technique instead (see KNOWN_MIXED_FILES):`)
    for (const rel of flaggedForReview) console.log(`  ${rel}`)
  }
  console.log(`\npages/ is excluded from this scan entirely — never eligible for whole-file stubbing (see file header).`)
}

main()
