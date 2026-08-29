import { describe, expect, it, vi } from 'vitest';
import { createConfigScopeBinding } from './binding';
import {
  GLOBAL_CONFIG_PANEL_SCOPE_IDS,
  mergeGlobalConfigPanelBindings,
  resolveConfigPanelSurfaceColor,
} from './globalBindings';
import { PANEL_SHELL_APPEARANCE_PANEL } from './shell.panel';
import { DEFAULT_PANEL_SHELL_CONFIG } from './shell';
import { defineConfigScope } from './defineConfigScope';

const LOCAL_PANEL = defineConfigScope<{ enabled: boolean }>({
  id: 'Demo/appearance',
  component: 'Demo',
  scope: 'appearance',
  title: 'Demo',
  createdAt: '2026-08-11',
  defaultValue: { enabled: true },
  fields: [{ kind: 'boolean', key: 'enabled', label: 'Enabled' }],
  copy: {
    targetFile: 'Demo.config.ts',
    targetSymbol: 'DEFAULT_DEMO_CONFIG',
    targetType: 'DemoConfig',
  },
});

function makeGlobalBinding() {
  return createConfigScopeBinding({
    definition: PANEL_SHELL_APPEARANCE_PANEL,
    value: DEFAULT_PANEL_SHELL_CONFIG,
    onChange: vi.fn(),
    global: true,
  });
}

describe('global config-panel binding composition', () => {
  it('prepends the universal PanelShell scope exactly once', () => {
    const local = createConfigScopeBinding({
      definition: LOCAL_PANEL,
      value: { enabled: true },
      onChange: vi.fn(),
    });

    const merged = mergeGlobalConfigPanelBindings([makeGlobalBinding()], [local]);

    expect(merged.map(binding => binding.definition.id)).toEqual([
      'PanelShell/appearance',
      'Demo/appearance',
    ]);
    expect(GLOBAL_CONFIG_PANEL_SCOPE_IDS).toEqual(['PanelShell/appearance']);
  });

  it('rejects page-level assembly of a universally supplied scope', () => {
    expect(() => mergeGlobalConfigPanelBindings(
      [makeGlobalBinding()],
      [makeGlobalBinding()],
    )).toThrow(/supplied globally and must not be bound locally/);
  });

  it('preserves legitimate repeated local instances of one recipe', () => {
    const first = createConfigScopeBinding({
      definition: LOCAL_PANEL,
      value: { enabled: true },
      onChange: vi.fn(),
      title: 'Demo one',
    });
    const second = createConfigScopeBinding({
      definition: LOCAL_PANEL,
      value: { enabled: false },
      onChange: vi.fn(),
      title: 'Demo two',
    });

    expect(mergeGlobalConfigPanelBindings([makeGlobalBinding()], [first, second]))
      .toHaveLength(3);
  });

  it('uses the rightmost column before the page-surface fallback', () => {
    expect(resolveConfigPanelSurfaceColor({
      rightmostColumnColor: ' #121321 ',
      pageSurfaceColor: '#d1d1d1',
    })).toBe('#121321');
    expect(resolveConfigPanelSurfaceColor({
      rightmostColumnColor: ' ',
      pageSurfaceColor: ' #d1d1d1 ',
    })).toBe('#d1d1d1');
    expect(resolveConfigPanelSurfaceColor({})).toBeUndefined();
  });
});
