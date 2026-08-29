'use client';

import { useMemo } from 'react';
import { useSharedDesignConfig } from '../../SharedDesignConfigProvider';
import { createConfigScopeBinding } from './binding';
import {
  PANEL_SHELL_APPEARANCE_PANEL,
  PANEL_SHELL_APPEARANCE_SCOPE_ID,
} from './shell.panel';
import type { ConfigScopeBinding } from './types';

/**
 * Scopes every canonical config-panel editor must expose independently of
 * the page-specific scopes supplied by its owner. Runtime value ownership
 * remains in SharedDesignConfigProvider; this module only supplies the
 * referential editing binding for that shared value.
 */
export function useGlobalConfigPanelBindings(): ReadonlyArray<ConfigScopeBinding> {
  const { panelShellConfig, setPanelShellConfig } = useSharedDesignConfig();

  return useMemo(() => [
    createConfigScopeBinding({
      definition: PANEL_SHELL_APPEARANCE_PANEL,
      value: panelShellConfig,
      onChange: setPanelShellConfig,
      global: true,
    }),
  ], [panelShellConfig, setPanelShellConfig]);
}

/**
 * Prepends universal bindings while rejecting a page that still assembles
 * the same universal scope manually. Local-to-local duplicate definitions
 * remain valid: one page can legitimately bind two independently configured
 * instances of the same component recipe.
 */
export function mergeGlobalConfigPanelBindings(
  globalBindings: ReadonlyArray<ConfigScopeBinding>,
  localBindings: ReadonlyArray<ConfigScopeBinding>,
): ReadonlyArray<ConfigScopeBinding> {
  const globalIds = new Set(globalBindings.map(binding => binding.definition.id));
  const duplicate = localBindings.find(binding => globalIds.has(binding.definition.id));

  if (duplicate) {
    throw new Error(
      `Config panel scope "${duplicate.definition.id}" is supplied globally and must not be bound locally`,
    );
  }

  return [...globalBindings, ...localBindings];
}

/** Complete binding collection for rendering, aggregate copy, and reset. */
export function useConfigPanelBindings(
  localBindings: ReadonlyArray<ConfigScopeBinding>,
): ReadonlyArray<ConfigScopeBinding> {
  const globalBindings = useGlobalConfigPanelBindings();
  return useMemo(
    () => mergeGlobalConfigPanelBindings(globalBindings, localBindings),
    [globalBindings, localBindings],
  );
}

export type ConfigPanelSurfaceSources = {
  rightmostColumnColor?: string | null;
  pageSurfaceColor?: string | null;
};

/**
 * Resolves the environmental color PanelShell's inherited appearance mode
 * transforms. Layout owns these inputs; PanelShell owns darkening, derived
 * ink, separators, and shadow response.
 */
export function resolveConfigPanelSurfaceColor({
  rightmostColumnColor,
  pageSurfaceColor,
}: ConfigPanelSurfaceSources): string | undefined {
  const rightmost = rightmostColumnColor?.trim();
  if (rightmost) return rightmost;
  const surface = pageSurfaceColor?.trim();
  return surface || undefined;
}

export const GLOBAL_CONFIG_PANEL_SCOPE_IDS = Object.freeze([
  PANEL_SHELL_APPEARANCE_SCOPE_ID,
]);
