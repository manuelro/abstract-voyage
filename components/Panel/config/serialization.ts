import { formatComponentConfigPayload } from '../componentConfigPayload';
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
