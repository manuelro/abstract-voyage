import type { Args } from '@storybook/react';
import type { ComponentType, ReactNode } from 'react';
import { argsToScopeConfig } from './storybookArgTypes';
import type { RuntimeConfigScopeDefinition } from './types';

/**
 * Generic Storybook `render` factory for any component using this
 * referential config-panel system — splits Storybook's flat `args` (one
 * key per scope field, per `configScopeToStorybookMeta`) back into the
 * component's own `{ config, ...rest }` shape and renders it. Fully
 * generic across every scope-bound component; a generated story file only
 * needs `render: createScopeStoryRender(Component, definition)`, never its
 * own per-component render wiring.
 *
 * Typed against Storybook's own loose `Args` (`{ [name: string]: any }`),
 * not the component's real prop type — a generated story's `meta` is typed
 * against a flat per-field args shape (see `generateStorybookStories.ts`'s
 * `GeneratedStoryArgs`), not the component's actual nested `config` prop,
 * so this render function's parameter must stay structurally compatible
 * with that flat shape rather than the component's own props.
 */
export function createScopeStoryRender<TProps extends { config?: unknown }>(
  Component: ComponentType<TProps>,
  definition: RuntimeConfigScopeDefinition,
): (args: Args) => ReactNode {
  return (args: Args): ReactNode => {
    const { config, rest } = argsToScopeConfig(args, definition);
    return <Component {...(rest as TProps)} config={config} />;
  };
}
