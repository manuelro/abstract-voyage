import type {
  ConfigScalar,
  ConfigScopeDefinition,
  DefinedConfigScope,
  RuntimeConfigFieldDefinition,
  RuntimeConfigScopeDefinition,
} from './types';

function fail(definition: Pick<RuntimeConfigScopeDefinition, 'id'>, message: string): never {
  throw new Error(`Invalid config scope "${definition.id}": ${message}`);
}

function getRuntimeFields(definition: RuntimeConfigScopeDefinition) {
  return definition.fields.flatMap(entry => (
    entry.kind === 'group' ? entry.fields : [entry]
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

  if (field.kind === 'enum') {
    if (typeof defaultValue !== 'string') {
      fail(definition, `enum field "${field.key}" has a non-string default`);
    }
    if (!field.options?.length) fail(definition, `enum field "${field.key}" has no options`);
    const optionValues = field.options!.map(option => option.value);
    if (new Set(optionValues).size !== optionValues.length) {
      fail(definition, `enum field "${field.key}" has duplicate option values`);
    }
    if (!optionValues.includes(defaultValue)) {
      fail(definition, `enum field "${field.key}" does not include its default value`);
    }
  }
}

export function validateConfigScopeDefinition(definition: RuntimeConfigScopeDefinition) {
  if (!definition.id.trim()) fail(definition, 'id is required');
  if (!definition.component.trim()) fail(definition, 'component is required');
  if (!definition.scope.trim()) fail(definition, 'scope is required');
  if (!definition.title.trim()) fail(definition, 'title is required');
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
}

export function defineConfigScope<TConfig extends object>(
  definition: ConfigScopeDefinition<TConfig>,
): DefinedConfigScope<TConfig> {
  const runtimeDefinition = definition as unknown as RuntimeConfigScopeDefinition;
  validateConfigScopeDefinition(runtimeDefinition);
  return definition as DefinedConfigScope<TConfig>;
}
