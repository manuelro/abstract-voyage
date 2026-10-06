#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const ROOT = path.resolve(__dirname, '..')
const ALLOWLIST_PATH = path.join(__dirname, 'tailwind-field-legacy-allowlist.json')
const GENERATED_PATH = 'components/Panel/config/tailwindUtilities.generated.ts'
const SHARED_LEGACY_INFRASTRUCTURE = new Set([
  'components/tailwindMinHeightScale.ts',
  'components/tailwindSpacingScale.ts',
  'components/tailwindTypographyScale.ts',
  'components/tailwindWidthScale.ts',
])
const MIGRATED_FILES = new Set(['pages/abstract.config.ts', 'pages/abstract.panel.ts'])
const LEGACY_SCALE_MODULES = new Set([
  '../components/tailwindSpacingScale',
  '../components/tailwindTypographyScale',
])
const SKIPPED_DIRECTORIES = new Set([
  '.git', '.next', '.next-verify', 'node_modules', 'out', 'out-verify', 'coverage',
])
const TAILWIND_CLASS = {
  test(value) {
    const base = value.replace(/^(?:[a-z0-9-[\].]+:)*/, '')
    return /^(?:-?(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y)-(?:px|\d+(?:\.5)?))$/.test(base)
      || /^text-(?:xs|sm|base|lg|[2-9]xl|left|center|right|justify|\[.+\])$/.test(base)
      || /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|sans|serif|mono)$/.test(base)
      || /^border(?:-[trblxy])?(?:-(?:0|2|4|8))?$/.test(base)
      || /^(?:h|w|min-h|min-w|max-w)-(?:auto|full|screen|px|\d+(?:\.5)?|\[.+\]|xs|sm|md|lg|xl|[2-7]xl|prose)$/.test(base)
  },
}

function toPosix(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/')
}

function sourceFiles(directory = ROOT) {
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name) && !entry.name.startsWith('.next-')) {
        files.push(...sourceFiles(path.join(directory, entry.name)))
      }
      continue
    }
    if (/\.(ts|tsx)$/.test(entry.name)) files.push(path.join(directory, entry.name))
  }
  return files
}

function stringLiterals(node) {
  const values = []
  function visit(current) {
    if (ts.isStringLiteralLike(current)) values.push(current.text)
    ts.forEachChild(current, visit)
  }
  visit(node)
  return values
}

function propertyString(object, propertyName) {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue
    const name = property.name && property.name.getText().replace(/^['"]|['"]$/g, '')
    if (name === propertyName && ts.isStringLiteralLike(property.initializer)) {
      return property.initializer.text
    }
  }
  return undefined
}

function enclosingFieldKey(node) {
  let current = node.parent
  while (current) {
    if (ts.isObjectLiteralExpression(current)) {
      const key = propertyString(current, 'key')
      if (key) return key
    }
    current = current.parent
  }
  return 'anonymous-options'
}

function containsTailwindClass(node) {
  const values = stringLiterals(node)
  const matches = values.filter(value => TAILWIND_CLASS.test(value)).length
  return matches >= 2 && matches * 2 >= values.length
}

function unwrapExpression(node) {
  let current = node
  while (
    ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isParenthesizedExpression(current)
    || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(current))
  ) {
    current = current.expression
  }
  return current
}

function isTailwindStringUnion(typeNode) {
  const members = ts.isUnionTypeNode(typeNode) ? typeNode.types : [typeNode]
  return members.length > 0
    && members.every(member => ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal))
    && members.some(member => TAILWIND_CLASS.test(member.literal.text))
}

function violation(file, kind, symbol) {
  return { file, kind, symbol }
}

function scanFile(absolutePath) {
  const file = toPosix(absolutePath)
  if (
    file === GENERATED_PATH
    || SHARED_LEGACY_INFRASTRUCTURE.has(file)
    || file.endsWith('.test.ts')
    || file.endsWith('.test.tsx')
  ) return []

  return scanSource(file, absolutePath, fs.readFileSync(absolutePath, 'utf8'))
}

function scanSource(file, sourcePath, sourceText) {
  const source = ts.createSourceFile(
    sourcePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    sourcePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const findings = []

  function visit(node) {
    if (ts.isImportDeclaration(node) && MIGRATED_FILES.has(file)) {
      const moduleName = ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : ''
      if (LEGACY_SCALE_MODULES.has(moduleName)) {
        findings.push(violation(file, 'deprecated-import', moduleName))
      }
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const symbol = node.name.text
      const initializer = unwrapExpression(node.initializer)
      if (ts.isArrayLiteralExpression(initializer) && containsTailwindClass(initializer)) {
        findings.push(violation(file, 'tailwind-option-array', symbol))
      }
      if (/^[A-Z0-9_]+_CLASSES$/.test(symbol) && ts.isCallExpression(node.initializer)) {
        findings.push(violation(file, 'normalizer-allowlist', symbol))
      }
    }

    if (
      ts.isPropertyAssignment(node)
      && node.name.getText().replace(/^['"]|['"]$/g, '') === 'options'
      && ts.isArrayLiteralExpression(unwrapExpression(node.initializer))
      && containsTailwindClass(unwrapExpression(node.initializer))
    ) {
      findings.push(violation(file, 'inline-tailwind-options', enclosingFieldKey(node)))
    }

    if (
      ts.isPropertyAssignment(node)
      && node.name.getText().replace(/^['"]|['"]$/g, '') === 'tokens'
      && containsTailwindClass(node.initializer)
    ) {
      findings.push(violation(file, 'component-token-profile', enclosingFieldKey(node)))
    }

    if (ts.isTypeAliasDeclaration(node) && isTailwindStringUnion(node.type)) {
      findings.push(violation(file, 'tailwind-string-type', node.name.text))
    }

    if (
      ts.isTemplateExpression(node)
      && /(?:^|\s)(?:[a-z0-9-[\].]+:)*(?:-?(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|text|font|border|border-t|h|w|max-w|min-w|min-h)-)$/.test(node.head.text)
    ) {
      const owner = node.parent && ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)
        ? node.parent.name.text
        : `template:${node.head.text}`
      findings.push(violation(file, 'dynamic-tailwind-class', owner))
    }

    ts.forEachChild(node, visit)
  }

  visit(source)
  return findings
}

function runScannerSelfTest() {
  const findings = scanSource('architecture-self-test.ts', 'architecture-self-test.ts', `
    const LOCAL_OPTIONS = [
      { label: 'px-0', value: 'px-0' },
      { label: 'px-4', value: 'px-4' },
    ] as const
    type LocalPadding = 'py-0' | 'py-4'
    const dynamicClass = \`px-\${value}\`
    const profile = { tokens: ['mt-0', 'mt-4'] }
    type OrdinaryMode = 'gap-check' | 'recap'
  `)
  const kinds = new Set(findings.map(entry => entry.kind))
  for (const expected of [
    'tailwind-option-array',
    'tailwind-string-type',
    'dynamic-tailwind-class',
    'component-token-profile',
  ]) {
    if (!kinds.has(expected)) throw new Error(`Architecture scanner self-test missed ${expected}`)
  }
  if (findings.some(entry => entry.symbol === 'OrdinaryMode')) {
    throw new Error('Architecture scanner self-test misclassified an ordinary enum')
  }
}

function identity(entry) {
  return `${entry.file}|${entry.kind}|${entry.symbol}`
}

function validateOversizedEnumAllowlist(entries) {
  const approved = new Set([
    'FiberHeading/appearance|containerHeight|10',
    'FiberHeading/appearance|containerHeightDesktop|10',
    'FiberHeading/appearance|fontSize|9',
    'FiberHeading/appearance|fontSizeDesktop|9',
    'SiteHeader/colors|height|10',
    'SiteHeader/colors|desktopHeight|10',
  ])
  const seen = new Set()
  for (const entry of entries) {
    const id = `${entry.scopeId}|${entry.fieldKey}|${entry.optionCount}`
    if (!approved.has(id)) throw new Error(`Unapproved oversized-enum exception: ${id}`)
    if (seen.has(id)) throw new Error(`Duplicate oversized-enum exception: ${id}`)
    if (!entry.rationale || !entry.rationale.trim()) throw new Error(`Missing rationale: ${id}`)
    seen.add(id)
  }
}

function main() {
  runScannerSelfTest()
  const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'))
  validateOversizedEnumAllowlist(allowlist.oversizedEnums || [])

  const baselineGroups = allowlist.architecture || []
  const baseline = []
  for (const entry of baselineGroups) {
    if (!entry.file || !entry.kind || !Array.isArray(entry.symbols) || !entry.symbols.length || !entry.rationale?.trim()) {
      throw new Error('Every architecture baseline entry requires file, kind, symbols, and rationale')
    }
    for (const symbol of entry.symbols) baseline.push({ file: entry.file, kind: entry.kind, symbol })
  }

  const findings = sourceFiles()
    .flatMap(scanFile)
    .filter((entry, index, entries) => entries.findIndex(candidate => identity(candidate) === identity(entry)) === index)
    .sort((left, right) => identity(left).localeCompare(identity(right)))

  if (process.argv.includes('--print-baseline')) {
    const grouped = []
    for (const entry of findings) {
      const existing = grouped.find(group => group.file === entry.file && group.kind === entry.kind)
      if (existing) existing.symbols.push(entry.symbol)
      else grouped.push({
        file: entry.file,
        kind: entry.kind,
        symbols: [entry.symbol],
        rationale: 'Pre-existing Tailwind declaration awaiting migration.',
      })
    }
    console.log(JSON.stringify(grouped, null, 2))
    return
  }

  const baselineIds = new Set(baseline.map(identity))
  const regressions = findings.filter(entry => !baselineIds.has(identity(entry)))
  if (regressions.length) {
    console.error('New Tailwind config-field architecture violations:')
    for (const entry of regressions) console.error(`- ${identity(entry)}`)
    process.exitCode = 1
  }
}

main()
