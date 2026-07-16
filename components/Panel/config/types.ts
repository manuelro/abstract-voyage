export type ConfigScalar = string | number | boolean;

type StringKeyOf<TConfig extends object> = Extract<keyof TConfig, string>;

type ConfigFieldBase<TConfig extends object, TKey extends StringKeyOf<TConfig>> = {
  key: TKey;
  label: string;
  description?: string;
  visibleWhen?: (config: Readonly<TConfig>) => boolean;
};

export type BooleanConfigField<
  TConfig extends object,
  TKey extends StringKeyOf<TConfig>,
> = ConfigFieldBase<TConfig, TKey> & {
  kind: 'boolean';
};

export type NumberConfigField<
  TConfig extends object,
  TKey extends StringKeyOf<TConfig>,
> = ConfigFieldBase<TConfig, TKey> & {
  kind: 'number';
  min: number;
  max: number;
  step: number;
  unit?: string;
  integer?: boolean;
};

export type EnumConfigField<
  TConfig extends object,
  TKey extends StringKeyOf<TConfig>,
  TValue extends string,
> = ConfigFieldBase<TConfig, TKey> & {
  kind: 'enum';
  options: ReadonlyArray<{ label: string; value: TValue }>;
};

export type ColorConfigField<
  TConfig extends object,
  TKey extends StringKeyOf<TConfig>,
> = ConfigFieldBase<TConfig, TKey> & {
  kind: 'color';
};

export type ConfigFieldDefinition<TConfig extends object> = {
  [TKey in StringKeyOf<TConfig>]:
    TConfig[TKey] extends boolean
      ? BooleanConfigField<TConfig, TKey>
      : TConfig[TKey] extends number
        ? NumberConfigField<TConfig, TKey>
        : TConfig[TKey] extends string
          ? EnumConfigField<TConfig, TKey, Extract<TConfig[TKey], string>>
            | ColorConfigField<TConfig, TKey>
          : never;
}[StringKeyOf<TConfig>];

export type ConfigFieldGroup<TConfig extends object> = {
  kind: 'group';
  label: string;
  fields: ReadonlyArray<ConfigFieldDefinition<TConfig>>;
  visibleWhen?: (config: Readonly<TConfig>) => boolean;
};

export type ConfigScopeEntry<TConfig extends object> =
  | ConfigFieldDefinition<TConfig>
  | ConfigFieldGroup<TConfig>;

export type ConfigScopeCopyMetadata = {
  targetFile: string;
  targetSymbol: string;
  targetType: string;
  updateStrategy?: 'replace_scope' | 'merge';
  completeScope?: boolean;
};

export type ConfigScopeDefinition<TConfig extends object> = {
  id: string;
  component: string;
  scope: string;
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  defaultValue: Readonly<TConfig>;
  fields: ReadonlyArray<ConfigScopeEntry<TConfig>>;
  hiddenKeys?: ReadonlyArray<StringKeyOf<TConfig>>;
  copy: ConfigScopeCopyMetadata;
};

export type RuntimeConfigFieldDefinition = {
  kind: 'boolean' | 'number' | 'enum' | 'color';
  key: string;
  label: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  integer?: boolean;
  options?: ReadonlyArray<{ label: string; value: string }>;
  visibleWhen?: (config: Readonly<Record<string, ConfigScalar>>) => boolean;
};

export type RuntimeConfigFieldGroup = {
  kind: 'group';
  label: string;
  fields: ReadonlyArray<RuntimeConfigFieldDefinition>;
  visibleWhen?: (config: Readonly<Record<string, ConfigScalar>>) => boolean;
};

export type RuntimeConfigScopeDefinition = {
  id: string;
  component: string;
  scope: string;
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  defaultValue: Readonly<Record<string, ConfigScalar>>;
  fields: ReadonlyArray<RuntimeConfigFieldDefinition | RuntimeConfigFieldGroup>;
  hiddenKeys?: ReadonlyArray<string>;
  copy: ConfigScopeCopyMetadata;
};

export type DefinedConfigScope<TConfig extends object> =
  ConfigScopeDefinition<TConfig> & RuntimeConfigScopeDefinition;

export type ConfigScopeBinding = {
  definition: RuntimeConfigScopeDefinition;
  value: Readonly<Record<string, ConfigScalar>>;
  updateField: (key: string, value: ConfigScalar) => void;
  reset: () => void;
};
