import { defineConfigScope } from './defineConfigScope';
import type { ConfigScopeEntry, DefinedConfigScope } from './types';

/**
 * Registers one page's own complete, independently-authoritative instance of
 * a config scope shared by two or more pages — see
 * `PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md` for the failure this replaces
 * (`SplitColumnLayout`'s own history: a shared default a page's local state
 * spread from, silently drifting other pages that had no override of their
 * own, three times in a row across two different fix attempts).
 *
 * Deliberately has no `enabled` field and no merge-over-shared semantics —
 * `defaultValue` *is* the page's own truth, full stop. A page that doesn't
 * diverge simply never calls this and consumes the base scope directly;
 * there is no "off" state to represent here. Not registered in an
 * experience-level registry either — every real call site of
 * `defineConfigScopeRegistry`'s `.resolve(id)` in this codebase resolves
 * back to an object already directly importable by name, so a scope that's
 * already uniquely named per page (see `id`/`scope` below) gets nothing
 * from that indirection. Callers import the returned definition directly.
 */
export function definePageConfigScope<TConfig extends object>({
  component,
  scope,
  pageName,
  title,
  createdAt,
  summary,
  defaultOpen,
  fields,
  hiddenKeys,
  defaultValue,
  targetFile,
  targetSymbol,
  targetType,
}: {
  component: string;
  scope: string;
  pageName: string;
  title: string;
  createdAt: string;
  summary?: string;
  defaultOpen?: boolean;
  fields: ReadonlyArray<ConfigScopeEntry<TConfig>>;
  /** Forwarded straight through to defineConfigScope's own hiddenKeys —
   * see that function's own doc comment. Declares a real, valid config key
   * this page's own scope deliberately doesn't render as a control (e.g. a
   * shared field array's key this particular page never wires) — never
   * set for a key that's actually rendered in `fields` above; the
   * underlying validation already rejects a key represented both ways. */
  hiddenKeys?: ReadonlyArray<Extract<keyof TConfig, string>>;
  defaultValue: Readonly<TConfig>;
  targetFile: string;
  targetSymbol: string;
  targetType: string;
}): DefinedConfigScope<TConfig> {
  return defineConfigScope<TConfig>({
    id: `${component}/${scope}:${pageName}`,
    component,
    scope: `${scope}:${pageName}`,
    title,
    createdAt,
    summary,
    defaultOpen,
    defaultValue,
    fields,
    hiddenKeys,
    copy: {
      targetFile,
      targetSymbol,
      targetType,
      updateStrategy: 'replace_scope',
      completeScope: true,
    },
  });
}
