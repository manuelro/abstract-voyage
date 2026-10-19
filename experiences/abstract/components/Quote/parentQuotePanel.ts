import type {
  ConfigScopeEntry, RuntimeConfigFieldDefinition, RuntimeConfigFieldGroup,
  RuntimeConfigFieldSubgroup, RuntimeConfigFieldTabs, ConfigScalar,
} from '../../../../components/Panel/config/types';
import { parentQuoteKey, type QuoteConfig, type QuoteSurfaceConfig } from './config';
import { resolveParentQuoteConfig } from './parentQuoteConfig';

// Reuse the Quote panel's definitions. Only the config key and visibility
// predicate need translation into the parent quote's namespace.
function parentVisibleWhen<T extends { visibleWhen?: (config: Readonly<Record<string, ConfigScalar>>) => boolean }>(entry: T) {
  return (config: Readonly<Record<string, ConfigScalar>>) => config.cardBlendEnabled === true
    && (entry.visibleWhen?.(resolveParentQuoteConfig(config as QuoteConfig)) ?? true);
}

function mapField(field: RuntimeConfigFieldDefinition): RuntimeConfigFieldDefinition {
  return {
    ...field,
    key: parentQuoteKey(field.key as keyof QuoteSurfaceConfig),
    visibleWhen: parentVisibleWhen(field),
  };
}

function mapSubgroup(subgroup: RuntimeConfigFieldSubgroup): RuntimeConfigFieldSubgroup {
  return {
    ...subgroup,
    visibleWhen: parentVisibleWhen(subgroup),
    fields: subgroup.fields.map(mapField),
  };
}

function mapGroup(group: RuntimeConfigFieldGroup): RuntimeConfigFieldGroup {
  return {
    ...group,
    visibleWhen: parentVisibleWhen(group),
    fields: group.fields.map(entry => entry.kind === 'subgroup'
      ? mapSubgroup(entry) : mapField(entry as RuntimeConfigFieldDefinition)),
  };
}

function mapEntry(entry: ConfigScopeEntry<QuoteSurfaceConfig>): ConfigScopeEntry<QuoteConfig> {
  if (entry.kind === 'group') return mapGroup(entry as RuntimeConfigFieldGroup) as ConfigScopeEntry<QuoteConfig>;
  if (entry.kind === 'tabs') {
    const tabs = entry as RuntimeConfigFieldTabs;
    return {
      ...tabs,
      visibleWhen: parentVisibleWhen(tabs),
      tabs: tabs.tabs.map(tab => ({
        ...tab,
        fields: tab.fields.map(field => field.kind === 'group'
          ? mapGroup(field as RuntimeConfigFieldGroup) : mapField(field as RuntimeConfigFieldDefinition)),
      })),
    } as ConfigScopeEntry<QuoteConfig>;
  }
  return mapField(entry as RuntimeConfigFieldDefinition) as ConfigScopeEntry<QuoteConfig>;
}

export function createWrappingQuoteSection(fields: ReadonlyArray<ConfigScopeEntry<QuoteSurfaceConfig>>): ConfigScopeEntry<QuoteConfig> {
  return {
    kind: 'areas', visibleWhen: config => config.cardBlendEnabled,
    areas: [{ id: 'wrapping-quote', label: 'PARENT QUOTE',
      fields: fields.map(mapEntry) as Exclude<ConfigScopeEntry<QuoteConfig>, { kind: 'areas' | 'action' }>[],
    }],
  };
}
