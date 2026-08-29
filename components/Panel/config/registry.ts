import type { RuntimeConfigScopeDefinition } from './types';

type ConfigScopeDefinitions = Record<string, RuntimeConfigScopeDefinition>;

export function defineConfigScopeRegistry<
  const TDefinitions extends ConfigScopeDefinitions,
>(definitions: TDefinitions) {
  const ids = new Set<string>();

  for (const [key, definition] of Object.entries(definitions)) {
    if (key !== definition.id) {
      throw new Error(`Config registry key "${key}" must match definition id "${definition.id}"`);
    }
    if (ids.has(definition.id)) {
      throw new Error(`Duplicate config scope id "${definition.id}"`);
    }
    ids.add(definition.id);
  }

  return Object.freeze({
    resolve<TKey extends Extract<keyof TDefinitions, string>>(key: TKey): TDefinitions[TKey] {
      const definition = definitions[key];
      if (!definition) throw new Error(`Unknown config scope "${key}"`);
      return definition;
    },
    values(): ReadonlyArray<RuntimeConfigScopeDefinition> {
      return Object.values(definitions);
    },
  });
}
