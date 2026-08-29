import { formatComponentConfigPayload } from '../componentConfigPayload';
import type { ConfigScalar } from './types';
import type { ConfigScopeBinding } from './types';

export function serializeConfigScopeBinding(binding: ConfigScopeBinding) {
  const { definition, value } = binding;
  return formatComponentConfigPayload({
    component: definition.component,
    scope: definition.scope,
    targetFile: definition.copy.targetFile,
    targetSymbol: definition.copy.targetSymbol,
    targetType: definition.copy.targetType,
    updateStrategy: definition.copy.updateStrategy,
    completeScope: definition.copy.completeScope,
    config: { ...value },
  });
}

export function serializeConfigScopeBindings(bindings: ReadonlyArray<ConfigScopeBinding>) {
  return bindings.map(serializeConfigScopeBinding).join('\n\n');
}

// Same rounding formatComponentConfigPayload's own formatScalar applies to
// numbers before printing — comparing at full float precision would flag a
// value that round-trips through a slider (e.g. 0.30000000000000004) as
// "changed" from a literal 0.3 in source, when the two would serialize
// identically anyway.
function scalarsEqual(a: ConfigScalar, b: ConfigScalar): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
    return Number(a.toFixed(4)) === Number(b.toFixed(4));
  }
  return a === b;
}

// Diffs against definition.defaultValue — the scope's own authoritative
// default, sourced from the same DEFAULT_*_CONFIG object already exported
// from the scope's target_file. This is deliberate: it answers "what does
// the live panel value have that the *file* doesn't already have," not "what
// differs from some separate factory baseline." A field a previous manual
// edit already set away from some original default, left untouched by the
// operator this session, correctly produces no diff entry — the file's own
// existing value for it is already correct and must be left alone.
function diffAgainstDefault(
  value: Readonly<Record<string, ConfigScalar>>,
  defaultValue: Readonly<Record<string, ConfigScalar>>,
): Record<string, ConfigScalar> {
  const changed: Record<string, ConfigScalar> = {};
  for (const [key, current] of Object.entries(value)) {
    if (!scalarsEqual(current, defaultValue[key])) changed[key] = current;
  }
  return changed;
}

/**
 * "COPY DIFF" — same payload format as serializeConfigScopeBinding, but
 * `config:` holds only the fields that differ from definition.defaultValue,
 * with update_strategy/complete_scope always 'merge'/false regardless of
 * this scope's own authored copy.updateStrategy (COPY DIFF is a distinct,
 * separate action a human explicitly chooses — not a retrofit of what COPY
 * emits for this scope). Returns null when nothing differs, so a caller can
 * drop this scope from an aggregate payload entirely rather than emit an
 * empty-but-present entry.
 *
 * Applying a merge/complete_scope:false payload: locate the same target
 * object literal COPY's own procedure would (AGENTS.md's "Applying a copied
 * config update"), then for each key in config:, find and replace only that
 * key's own value in place — leaving every other key in the object
 * untouched. Do not treat this as license to skip verifying the file's
 * current state first: the diff was computed against this session's
 * in-memory defaultValue, which can drift from the file's real on-disk
 * content (a concurrent edit, a manual change) between when the diff was
 * copied and when it's applied — confirm each field's existing value in the
 * file actually matches what the diff implies it replaces before editing it,
 * the same way an Edit tool's own old_string match would.
 */
export function serializeConfigScopeBindingDiff(binding: ConfigScopeBinding): string | null {
  const { definition, value } = binding;
  const changed = diffAgainstDefault(value, definition.defaultValue);
  if (Object.keys(changed).length === 0) return null;
  return formatComponentConfigPayload({
    component: definition.component,
    scope: definition.scope,
    targetFile: definition.copy.targetFile,
    targetSymbol: definition.copy.targetSymbol,
    targetType: definition.copy.targetType,
    updateStrategy: 'merge',
    completeScope: false,
    config: changed,
  });
}

// Scopes with no diff from default are omitted entirely, not emitted empty —
// the most common real waste this exists to cut is "tuned one field, hit
// copy, resent every other untouched scope in the panel too."
export function serializeConfigScopeBindingsDiff(bindings: ReadonlyArray<ConfigScopeBinding>): string {
  return bindings
    .map(serializeConfigScopeBindingDiff)
    .filter((text): text is string => text !== null)
    .join('\n\n');
}
