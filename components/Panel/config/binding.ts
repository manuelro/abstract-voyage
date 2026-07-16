import type {
  ConfigScalar,
  ConfigScopeBinding,
  DefinedConfigScope,
  RuntimeConfigScopeDefinition,
} from './types';

export function createConfigScopeBinding<TConfig extends object>({
  definition,
  value,
  onChange,
  onReset,
}: {
  definition: DefinedConfigScope<TConfig>;
  value: TConfig;
  onChange: (value: TConfig) => void;
  onReset?: () => void;
}): ConfigScopeBinding {
  const runtimeValue = value as unknown as Readonly<Record<string, ConfigScalar>>;

  return {
    definition: definition as RuntimeConfigScopeDefinition,
    value: runtimeValue,
    updateField(key, nextValue) {
      if (!(key in runtimeValue)) {
        throw new Error(`Unknown config key "${key}" for scope "${definition.id}"`);
      }
      onChange({ ...value, [key]: nextValue });
    },
    reset() {
      if (onReset) {
        onReset();
        return;
      }
      onChange({ ...definition.defaultValue } as TConfig);
    },
  };
}
