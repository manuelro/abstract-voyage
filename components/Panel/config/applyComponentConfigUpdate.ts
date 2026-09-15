import * as ts from 'typescript';
import type { ComponentConfigUpdateScalar, ParsedComponentConfigUpdate } from './componentConfigUpdateParser';

export type ApplyComponentConfigUpdateResult = {
  ok: boolean;
  /** Config keys whose existing property initializer was replaced. */
  changedKeys: string[];
  /** Config keys with no matching top-level property on the target object
   * literal — always treated as a hard error (see applyComponentConfigUpdateToSource's
   * own doc comment): we never silently invent a new field, since a mismatch
   * here almost always means target_symbol/target_type drifted from the
   * config's real shape, not that a genuinely new field should be added. */
  unmatchedKeys: string[];
  /** Present (non-empty) only when completeScope is true and the target
   * object literal has an existing property this payload's own config:
   * block never mentions — informational only, does not block the write,
   * since a targeted "replace_scope" payload authored before a later field
   * was added to the type would otherwise become permanently impossible to
   * apply through no fault of the operator's. */
  unmentionedExistingKeys: string[];
  error?: string;
  /** Only present when ok is true. */
  updatedSource?: string;
};

// TypeScript string literals in this codebase's own config files are
// consistently single-quoted (see any DEFAULT_*_CONFIG) — matched here so a
// round-tripped field reads identically to a field a human typed by hand,
// not like an auto-generated diff.
function formatTsValue(value: ComponentConfigUpdateScalar): string {
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `[${value.map(entry => formatTsValue(entry)).join(', ')}]`;
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

// `export const NAME = {...}` and `export const NAME: Type = {...}` are both
// common in this codebase (some scopes carry an explicit type annotation,
// e.g. PolymorphicLayout.pageConfigs.ts's own page-level constants; most
// DEFAULT_*_CONFIG constants instead rely on `satisfies Type` for the same
// checking without widening the literal type) — unwrapped here so both
// shapes resolve to the same underlying ObjectLiteralExpression.
function unwrapToObjectLiteral(expression: ts.Expression): ts.ObjectLiteralExpression | undefined {
  let current = expression;
  while (
    ts.isSatisfiesExpression(current)
    || ts.isAsExpression(current)
    || ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return ts.isObjectLiteralExpression(current) ? current : undefined;
}

function findTargetObjectLiteral(
  sourceFile: ts.SourceFile,
  targetSymbol: string,
): ts.ObjectLiteralExpression | undefined {
  let found: ts.ObjectLiteralExpression | undefined;
  sourceFile.forEachChild(node => {
    if (found || !ts.isVariableStatement(node)) return;
    for (const declaration of node.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name)
        && declaration.name.text === targetSymbol
        && declaration.initializer
      ) {
        found = unwrapToObjectLiteral(declaration.initializer);
      }
    }
  });
  return found;
}

/**
 * Applies one already-parsed component-config-update/v1 payload to a
 * TypeScript source file's own text, returning the updated text rather than
 * writing anything — the caller (the API route) owns all filesystem I/O, so
 * this stays a pure, disk-free function safe to unit test directly.
 *
 * Locates target_symbol via the real TypeScript AST (not a text/regex
 * search) specifically because PolymorphicLayout.pageConfigs.ts's own doc
 * comment records two real incidents of a config update landing in the
 * wrong of two objects that share an identical field set — a name search
 * for a field alone can't distinguish them, but an AST walk for the
 * variable declaration named target_symbol always finds the right one.
 *
 * Every matched property's value is replaced via a targeted text-range
 * splice on the ORIGINAL source (the property's own initializer start/end),
 * never by reprinting the object literal — every other property, every
 * comment, and all surrounding formatting are left byte-for-byte untouched.
 * All edits are computed first and applied in a single pass (highest offset
 * first) so earlier replacements never invalidate later nodes' offsets.
 *
 * Fails atomically: if ANY config key has no matching existing property,
 * nothing is changed and updatedSource is omitted — a partial write here
 * would leave the file in a state that matches neither the old nor the new
 * config, which is worse than doing nothing.
 */
export function applyComponentConfigUpdateToSource(
  sourceText: string,
  payload: ParsedComponentConfigUpdate,
): ApplyComponentConfigUpdateResult {
  const sourceFile = ts.createSourceFile(
    'target.ts',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const objectLiteral = findTargetObjectLiteral(sourceFile, payload.targetSymbol);
  if (!objectLiteral) {
    return {
      ok: false,
      changedKeys: [],
      unmatchedKeys: [],
      unmentionedExistingKeys: [],
      error: `Could not find "export const ${payload.targetSymbol} = {...}" (an object literal) in the target file.`,
    };
  }

  const propertiesByName = new Map<string, ts.PropertyAssignment>();
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
      ? property.name.text
      : undefined;
    if (name) propertiesByName.set(name, property);
  }

  const changedKeys: string[] = [];
  const unmatchedKeys: string[] = [];
  const edits: Array<{ start: number; end: number; text: string }> = [];

  for (const [key, value] of Object.entries(payload.config)) {
    const property = propertiesByName.get(key);
    if (!property) {
      unmatchedKeys.push(key);
      continue;
    }
    changedKeys.push(key);
    edits.push({
      start: property.initializer.getStart(sourceFile),
      end: property.initializer.getEnd(),
      text: formatTsValue(value),
    });
  }

  const unmentionedExistingKeys = payload.completeScope
    ? Array.from(propertiesByName.keys()).filter(name => !(name in payload.config))
    : [];

  if (unmatchedKeys.length > 0) {
    return {
      ok: false,
      changedKeys: [],
      unmatchedKeys,
      unmentionedExistingKeys,
      error: `${payload.targetSymbol} has no existing field(s) named: ${unmatchedKeys.join(', ')}. `
        + 'Nothing was written — confirm target_symbol/target_type still match this file\'s current shape.',
    };
  }

  let updatedSource = sourceText;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    updatedSource = updatedSource.slice(0, edit.start) + edit.text + updatedSource.slice(edit.end);
  }

  return {
    ok: true,
    changedKeys,
    unmatchedKeys: [],
    unmentionedExistingKeys,
    updatedSource,
  };
}
