import type {
  ConfigScalar,
  ConfigScopeDefinition,
  DefinedConfigScope,
  RuntimeConfigFieldAction,
  RuntimeConfigFieldAreas,
  RuntimeConfigFieldDefinition,
  RuntimeConfigFieldGroup,
  RuntimeConfigFieldSubgroup,
  RuntimeConfigFieldTabs,
  RuntimeConfigScopeDefinition,
} from './types';

function fail(definition: Pick<RuntimeConfigScopeDefinition, 'id'>, message: string): never {
  throw new Error(`Invalid config scope "${definition.id}": ${message}`);
}

// Flattens a group's own `fields` (definitions, subgroups, or action
// buttons) into plain leaf definitions — shared below so "what does a group
// actually contain" has exactly one implementation regardless of subgroup
// nesting. `kind: 'action'` entries are dropped entirely, not collected as a
// leaf: unlike every other field kind, an action button's own `key` is a DOM
// identity only, never a real property of the scope's `TConfig` — it has no
// default value to validate against and must never appear in
// `getConfigScopeFieldKeys`'s own "which config keys does this scope cover"
// output (the same reason `group`/`subgroup`/`tabs` markers themselves are
// recursed into rather than collected, just terminal instead of recursive).
function flattenGroupFields(
  fields: ReadonlyArray<RuntimeConfigFieldDefinition | RuntimeConfigFieldSubgroup | RuntimeConfigFieldAction>,
): RuntimeConfigFieldDefinition[] {
  return fields.flatMap(entry => (
    entry.kind === 'subgroup' ? entry.fields : entry.kind === 'action' ? [] : [entry]
  ));
}

// Flattens a tab's own `fields` (definitions, groups, or action buttons)
// into plain leaf definitions — shared below so "what does a tab actually
// contain" has exactly one implementation, reused whether the tabs entry
// sits at a scope's own top level or nested inside an area. See
// flattenGroupFields's own doc comment for why `kind: 'action'` is dropped,
// not collected.
function flattenTabFields(
  fields: ReadonlyArray<RuntimeConfigFieldDefinition | RuntimeConfigFieldGroup | RuntimeConfigFieldAction>,
): RuntimeConfigFieldDefinition[] {
  return fields.flatMap(entry => (
    entry.kind === 'group' ? flattenGroupFields(entry.fields) : entry.kind === 'action' ? [] : [entry]
  ));
}

// Flattens an entry that can be a plain field, a group, a tabs switch, or an
// action button (the shape both a scope's own top-level `fields` and an
// area's own `fields` share) into plain leaf definitions.
function flattenFieldOrGroupOrTabs(
  entry: RuntimeConfigFieldDefinition | RuntimeConfigFieldGroup | RuntimeConfigFieldTabs | RuntimeConfigFieldAction,
): RuntimeConfigFieldDefinition[] {
  if (entry.kind === 'tabs') {
    return entry.tabs.flatMap(tab => flattenTabFields(tab.fields));
  }
  if (entry.kind === 'action') return [];
  return entry.kind === 'group' ? flattenGroupFields(entry.fields) : [entry];
}

// Flattens scope -> areas (optional) -> tabs (optional) -> group (optional)
// -> subgroup (optional) -> field into a plain field list for validation
// purposes — areas/tabs/groups/subgroups are purely a rendering concern
// (which fields are visible at once), never a reason a field's own
// key/default/option validation should differ, so every field reachable
// through any of them is checked exactly the same way as an ungrouped one.
function getRuntimeFields(definition: RuntimeConfigScopeDefinition) {
  return definition.fields.flatMap(entry => (
    entry.kind === 'areas'
      ? entry.areas.flatMap(area => area.fields.flatMap(flattenFieldOrGroupOrTabs))
      : flattenFieldOrGroupOrTabs(entry)
  ));
}

/**
 * The field-key set a scope's own `fields` (including any `areas`/`tabs`/
 * `group`/`subgroup` nesting) actually covers — exported so every
 * `*.panel.test.tsx`'s own "registers every field exactly once" assertion
 * shares this one flattening implementation instead of hand-copying it.
 * That copy-per-test-file pattern is what broke ~15 files in one change the
 * moment `kind: 'tabs'` was added as a new `ConfigScopeEntry` member none
 * of them knew about — this is the fix, not just for those, but for every
 * schema addition since (confirmed: adding `kind: 'subgroup'`, then `kind:
 * 'areas'`, required no changes to any of those ~15 files, only here).
 *
 * Takes the runtime-erased field shape (like `getRuntimeFields` above),
 * not the fully-generic `ConfigScopeEntry<TConfig>` — a `DefinedConfigScope`
 * object's own `.fields` is typed as an intersection of both shapes, which
 * TS's generic inference doesn't cleanly correlate back to a caller-supplied
 * `TConfig` here; the runtime shape sidesteps that friction the same way
 * `validateConfigScopeDefinition` already does.
 */
export function getConfigScopeFieldKeys(
  fields: ReadonlyArray<
    RuntimeConfigFieldDefinition
    | RuntimeConfigFieldGroup
    | RuntimeConfigFieldTabs
    | RuntimeConfigFieldAreas
    | RuntimeConfigFieldAction
  >,
): string[] {
  return fields.flatMap(entry => (
    entry.kind === 'areas'
      ? entry.areas.flatMap(area => area.fields.flatMap(flattenFieldOrGroupOrTabs)).map(field => field.key)
      : flattenFieldOrGroupOrTabs(entry).map(field => field.key)
  ));
}

function validateField(
  definition: RuntimeConfigScopeDefinition,
  field: RuntimeConfigFieldDefinition,
  defaults: Readonly<Record<string, ConfigScalar>>,
) {
  if (!(field.key in defaults)) fail(definition, `field "${field.key}" is missing from defaultValue`);
  const defaultValue = defaults[field.key];

  if (field.kind === 'boolean' && typeof defaultValue !== 'boolean') {
    fail(definition, `boolean field "${field.key}" has a non-boolean default`);
  }

  if (field.kind === 'number') {
    if (typeof defaultValue !== 'number' || !Number.isFinite(defaultValue)) {
      fail(definition, `number field "${field.key}" has a non-finite default`);
    }
    if (!Number.isFinite(field.min) || !Number.isFinite(field.max) || field.min! >= field.max!) {
      fail(definition, `number field "${field.key}" has an invalid range`);
    }
    if (!Number.isFinite(field.step) || field.step! <= 0) {
      fail(definition, `number field "${field.key}" has an invalid step`);
    }
    if (defaultValue < field.min! || defaultValue > field.max!) {
      fail(definition, `number field "${field.key}" default is outside its range`);
    }
  }

  if (field.kind === 'color' && typeof defaultValue !== 'string') {
    fail(definition, `color field "${field.key}" has a non-string default`);
  }

  if (field.kind === 'text' && typeof defaultValue !== 'string') {
    fail(definition, `text field "${field.key}" has a non-string default`);
  }

  if (field.kind === 'enum' || field.kind === 'select') {
    if (typeof defaultValue !== 'string') {
      fail(definition, `${field.kind} field "${field.key}" has a non-string default`);
    }
    if (!field.options?.length) fail(definition, `${field.kind} field "${field.key}" has no options`);
    const optionValues = field.options!.map(option => option.value);
    if (new Set(optionValues).size !== optionValues.length) {
      fail(definition, `${field.kind} field "${field.key}" has duplicate option values`);
    }
    if (!optionValues.includes(defaultValue)) {
      fail(definition, `${field.kind} field "${field.key}" does not include its default value`);
    }
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateConfigScopeDefinition(definition: RuntimeConfigScopeDefinition) {
  if (!definition.id.trim()) fail(definition, 'id is required');
  if (!definition.component.trim()) fail(definition, 'component is required');
  if (!definition.scope.trim()) fail(definition, 'scope is required');
  if (!definition.title.trim()) fail(definition, 'title is required');
  if (!ISO_DATE.test(definition.createdAt)) {
    fail(definition, "createdAt is required and must be an ISO date ('YYYY-MM-DD')");
  }
  if (!definition.copy.targetFile.trim()) fail(definition, 'copy.targetFile is required');
  if (!definition.copy.targetSymbol.trim()) fail(definition, 'copy.targetSymbol is required');
  if (!definition.copy.targetType.trim()) fail(definition, 'copy.targetType is required');

  const defaults = definition.defaultValue;
  const fields = getRuntimeFields(definition);
  const fieldKeys = fields.map(field => field.key);
  const hiddenKeys = [...(definition.hiddenKeys ?? [])];
  const representedKeys = [...fieldKeys, ...hiddenKeys];

  if (new Set(fieldKeys).size !== fieldKeys.length) {
    fail(definition, 'a config key is represented by more than one field');
  }
  if (new Set(representedKeys).size !== representedKeys.length) {
    fail(definition, 'a config key cannot be both rendered and hidden');
  }

  for (const field of fields) validateField(definition, field, defaults);
  for (const key of hiddenKeys) {
    if (!(key in defaults)) fail(definition, `hidden key "${key}" is missing from defaultValue`);
  }

  const missingKeys = Object.keys(defaults).filter(key => !representedKeys.includes(key));
  if (missingKeys.length) {
    fail(definition, `default keys must be rendered or hidden: ${missingKeys.join(', ')}`);
  }

  const documentedStates = definition.documentedStates ?? [];
  const documentedStateNames = documentedStates.map(state => state.name);
  if (new Set(documentedStateNames).size !== documentedStateNames.length) {
    fail(definition, 'a documentedStates name is used by more than one state');
  }
  for (const state of documentedStates) {
    if (!state.name.trim()) fail(definition, 'a documentedStates entry is missing its name');
    for (const key of Object.keys(state.value)) {
      if (!(key in defaults)) {
        fail(
          definition,
          `documentedStates "${state.name}" references unknown key "${key}"`,
        );
      }
    }
  }
}

export function defineConfigScope<TConfig extends object>(
  definition: ConfigScopeDefinition<TConfig>,
): DefinedConfigScope<TConfig> {
  const runtimeDefinition = definition as unknown as RuntimeConfigScopeDefinition;
  validateConfigScopeDefinition(runtimeDefinition);
  return definition as DefinedConfigScope<TConfig>;
}
