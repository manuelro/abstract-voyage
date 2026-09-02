import type { ArgTypes } from '@storybook/react';
import type {
  ConfigScalar,
  RuntimeConfigFieldAction,
  RuntimeConfigFieldDefinition,
  RuntimeConfigFieldGroup,
  RuntimeConfigFieldTabs,
  RuntimeConfigScopeDefinition,
} from './types';

type VisibleWhen = (config: Readonly<Record<string, ConfigScalar>>) => boolean;
type StorybookCondition = { arg: string; eq: ConfigScalar } | { arg: string; truthy: boolean };

/**
 * Best-effort, deliberately narrow translation of a scope field's
 * `visibleWhen` predicate into Storybook's declarative `argTypes[x].if`
 * condition. `visibleWhen` is an arbitrary closure — there is no general
 * way to know what it checks without executing it against every possible
 * config, which Storybook's static `if` cannot do. This recognizes only
 * the exact single-key shapes already common in this codebase's panels
 * (matched against `Function.prototype.toString()`'s source text, never by
 * calling the function) and returns `null` for anything else — a multi-key
 * `&&`/`||` predicate, a comparison against a non-string literal, or any
 * shape not listed here. A wrong guess would silently hide/show a control
 * incorrectly, which is worse than leaving it always visible, so callers
 * must fall back to always-visible + a description note when this returns
 * `null` rather than attempt a looser match.
 */
export function translateVisibleWhen(visibleWhen: VisibleWhen): StorybookCondition | null {
  const source = visibleWhen.toString().trim();

  const eqMatch = source.match(/^\(?(\w+)\)?\s*=>\s*\1\.(\w+)\s*===\s*(['"])(.*?)\3$/);
  if (eqMatch) return { arg: eqMatch[2], eq: eqMatch[4] };

  const truthyMatch = source.match(/^\(?(\w+)\)?\s*=>\s*\1\.(\w+)$/);
  if (truthyMatch) return { arg: truthyMatch[2], truthy: true };

  const negatedMatch = source.match(/^\(?(\w+)\)?\s*=>\s*!\1\.(\w+)$/);
  if (negatedMatch) return { arg: negatedMatch[2], truthy: false };

  return null;
}

export type ScopeStorybookMeta = {
  argTypes: ArgTypes;
  /** Flat baseline args (one entry per rendered field, at its scope
   * default) — spread onto the generated file's `meta.args`, so every
   * story inherits sensible defaults for fields it doesn't itself
   * override. */
  args: Record<string, ConfigScalar>;
};

/**
 * Converts a registered config scope into Storybook `argTypes` + baseline
 * `args` — the same field list `ConfigControlResolver` renders in the live
 * panel, walked the same way, so the two surfaces can never silently cover
 * a different set of fields. `hiddenKeys` and `copy` metadata are excluded
 * on purpose: hidden fields are derived/resolved, not meant for direct
 * hand-editing, and `copy` (targetFile/targetSymbol/updateStrategy) has no
 * Storybook equivalent.
 */
export function configScopeToStorybookMeta(
  definition: RuntimeConfigScopeDefinition,
): ScopeStorybookMeta {
  const argTypes: ArgTypes = {};
  const args: Record<string, ConfigScalar> = {};
  const hiddenKeys = new Set(definition.hiddenKeys ?? []);

  const visitField = (
    field: RuntimeConfigFieldDefinition | RuntimeConfigFieldAction,
    groupLabel: string | undefined,
    inheritedVisibleWhen: VisibleWhen | undefined,
  ) => {
    if (hiddenKeys.has(field.key)) return;

    const effectiveVisibleWhen = field.visibleWhen ?? inheritedVisibleWhen;
    let condition: StorybookCondition | null = null;
    const descriptionParts: string[] = [];
    if (field.description) descriptionParts.push(field.description);
    if ('unit' in field && field.unit) descriptionParts.push(`Unit: ${field.unit}.`);
    if (effectiveVisibleWhen) {
      condition = translateVisibleWhen(effectiveVisibleWhen);
      if (!condition) {
        descriptionParts.push(
          'Only meaningful under a specific condition — see the live panel for the exact rule.',
        );
      }
    }

    let control: ArgTypes[string]['control'];
    let options: ReadonlyArray<string> | undefined;
    switch (field.kind) {
      case 'boolean':
        control = 'boolean';
        break;
      case 'color':
        control = 'color';
        break;
      case 'text':
        control = 'text';
        break;
      case 'number':
        // min/max/step are guaranteed present for a 'number'-kind field —
        // enforced by validateConfigScopeDefinition at scope-definition
        // time, not re-checked here.
        control = { type: 'range', min: field.min!, max: field.max!, step: field.step! };
        break;
      case 'enum':
      case 'select':
        control = 'select';
        options = field.options?.map(option => option.value);
        break;
      default:
        return;
    }

    argTypes[field.key] = {
      name: field.label,
      ...(descriptionParts.length ? { description: descriptionParts.join(' ') } : {}),
      control,
      ...(options ? { options } : {}),
      ...(groupLabel ? { table: { category: groupLabel } } : {}),
      ...(condition ? { if: condition } : {}),
    };

    if (field.key in definition.defaultValue) {
      args[field.key] = definition.defaultValue[field.key];
    }
  };

  // A group's own `fields` may themselves be plain fields or `kind:
  // 'subgroup'` collapsible zones (PLAN-POSTS-LAB-PANEL-TABS.md §11) — the
  // category label extends one more level (`"{prefix} · {subgroup.label}"`)
  // the same way it already does for tab → group.
  const visitGroupFields = (
    fields: RuntimeConfigFieldGroup['fields'],
    categoryPrefix: string,
    groupVisibleWhen: VisibleWhen | undefined,
  ) => {
    for (const groupEntry of fields) {
      if (groupEntry.kind === 'subgroup') {
        for (const field of groupEntry.fields) {
          visitField(field, `${categoryPrefix} · ${groupEntry.label}`, groupEntry.visibleWhen);
        }
      } else {
        visitField(groupEntry, categoryPrefix, groupVisibleWhen);
      }
    }
  };

  // Shared by an area's own `fields` and a scope's own top-level `fields`
  // (structurally identical: plain field, group, or a single tabs switch) —
  // `categoryPrefix` is undefined at the scope's own top level and the
  // area's own label once inside `kind: 'areas'`, extending the same
  // "{prefix} · {label}" convention already used for tab → group.
  const visitTabsOrEntry = (
    entry: RuntimeConfigFieldDefinition | RuntimeConfigFieldGroup | RuntimeConfigFieldTabs | RuntimeConfigFieldAction,
    categoryPrefix: string | undefined,
  ) => {
    if (entry.kind === 'tabs') {
      for (const tab of entry.tabs) {
        const tabLabel = categoryPrefix ? `${categoryPrefix} · ${tab.label}` : tab.label;
        for (const tabEntry of tab.fields) {
          if (tabEntry.kind === 'group') {
            visitGroupFields(tabEntry.fields, `${tabLabel} · ${tabEntry.label}`, tabEntry.visibleWhen);
          } else {
            visitField(tabEntry, tabLabel, undefined);
          }
        }
      }
    } else if (entry.kind === 'group') {
      const groupLabel = categoryPrefix ? `${categoryPrefix} · ${entry.label}` : entry.label;
      visitGroupFields(entry.fields, groupLabel, entry.visibleWhen);
    } else {
      visitField(entry, categoryPrefix, undefined);
    }
  };

  for (const entry of definition.fields) {
    if (entry.kind === 'areas') {
      for (const area of entry.areas) {
        for (const areaEntry of area.fields) {
          visitTabsOrEntry(areaEntry, area.label);
        }
      }
    } else {
      visitTabsOrEntry(entry, undefined);
    }
  }

  return { argTypes, args };
}

/**
 * Splits a flat Storybook `args` object (matching `argTypes`' flat keys)
 * back into the scope-covered subset — the complement (everything not a
 * scope field key: `children`, `href`, `surfaceColor`, …) is exactly the
 * set of "extra" structural props a story's `render` should spread
 * directly onto the component. See `storybookScopeRender.tsx`'s
 * `createScopeStoryRender`, which uses this to stay fully generic across
 * every component using this system rather than needing per-component
 * `render` wiring.
 */
export function argsToScopeConfig(
  args: Readonly<Record<string, unknown>>,
  definition: RuntimeConfigScopeDefinition,
): { config: Record<string, unknown>; rest: Record<string, unknown> } {
  const { argTypes } = configScopeToStorybookMeta(definition);
  const scopeKeys = new Set(Object.keys(argTypes));
  const config: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (scopeKeys.has(key)) config[key] = value;
    else rest[key] = value;
  }
  return { config, rest };
}
