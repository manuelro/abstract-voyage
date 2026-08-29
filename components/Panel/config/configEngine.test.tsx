import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createConfigScopeBinding } from './binding';
import { ConfigScopeRenderer } from './ConfigScopeRenderer';
import { defineConfigScope } from './defineConfigScope';
import { defineConfigScopeRegistry } from './registry';
import { serializeConfigScopeBinding } from './serialization';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

type DemoConfig = {
  enabled: boolean;
  mode: 'active' | 'all';
  amount: number;
  color: string;
};

const DEFAULT_DEMO_CONFIG: DemoConfig = {
  enabled: true,
  mode: 'active',
  amount: 0.5,
  color: '#000000',
};

function createDemoDefinition() {
  return defineConfigScope<DemoConfig>({
    id: 'Demo/performance',
    component: 'Demo',
    scope: 'performance',
    title: 'Demo performance',
    createdAt: '2026-01-01',
    summary: 'Dynamic controls',
    defaultOpen: true,
    defaultValue: DEFAULT_DEMO_CONFIG,
    fields: [
      { kind: 'boolean', key: 'enabled', label: 'Enabled' },
      {
        kind: 'enum',
        key: 'mode',
        label: 'Mode',
        options: [
          { label: 'ACTIVE', value: 'active' },
          { label: 'ALL', value: 'all' },
        ],
      },
      { kind: 'number', key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.1 },
      { kind: 'color', key: 'color', label: 'Color' },
    ],
    copy: {
      targetFile: 'demo.config.ts',
      targetSymbol: 'DEFAULT_DEMO_CONFIG',
      targetType: 'DemoConfig',
    },
  });
}

describe('dynamic config panel engine', () => {
  it('validates complete field coverage and enum defaults', () => {
    expect(() => defineConfigScope<DemoConfig>({
      ...createDemoDefinition(),
      fields: [
        { kind: 'boolean', key: 'enabled', label: 'Enabled' },
        {
          kind: 'enum',
          key: 'mode',
          label: 'Mode',
          options: [{ label: 'ALL', value: 'all' }],
        },
        { kind: 'number', key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.1 },
        { kind: 'color', key: 'color', label: 'Color' },
      ],
    })).toThrow('does not include its default value');

    expect(() => defineConfigScope<DemoConfig>({
      ...createDemoDefinition(),
      fields: [{ kind: 'boolean', key: 'enabled', label: 'Enabled' }],
    })).toThrow('default keys must be rendered or hidden');
  });

  it('accepts a valid documentedStates list and rejects duplicate names or unknown keys', () => {
    expect(() => defineConfigScope<DemoConfig>({
      ...createDemoDefinition(),
      documentedStates: [
        { name: 'AllMode', value: { mode: 'all' } },
        { name: 'Disabled', description: 'Enabled off', value: { enabled: false } },
      ],
    })).not.toThrow();

    expect(() => defineConfigScope<DemoConfig>({
      ...createDemoDefinition(),
      documentedStates: [
        { name: 'AllMode', value: { mode: 'all' } },
        { name: 'AllMode', value: { enabled: false } },
      ],
    })).toThrow('used by more than one state');

    expect(() => defineConfigScope<DemoConfig>({
      ...createDemoDefinition(),
      documentedStates: [
        { name: 'Bogus', value: { nonexistentKey: 'x' } as unknown as Partial<DemoConfig> },
      ],
    })).toThrow('references unknown key "nonexistentKey"');
  });

  it('resolves explicit registry entries and rejects mismatched keys', () => {
    const definition = createDemoDefinition();
    const registry = defineConfigScopeRegistry({
      'Demo/performance': definition,
    });

    expect(registry.resolve('Demo/performance')).toBe(definition);
    expect(() => defineConfigScopeRegistry({ wrong: definition }))
      .toThrow('must match definition id');
  });

  it('updates a typed binding and serializes it from definition metadata', () => {
    const definition = createDemoDefinition();
    const onChange = vi.fn();
    const binding = createConfigScopeBinding({
      definition,
      value: DEFAULT_DEMO_CONFIG,
      onChange,
    });

    binding.updateField('mode', 'all');
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_DEMO_CONFIG,
      mode: 'all',
    });
    binding.reset();
    expect(onChange).toHaveBeenLastCalledWith(DEFAULT_DEMO_CONFIG);

    const serialized = serializeConfigScopeBinding(binding);
    expect(serialized).toContain('component: Demo');
    expect(serialized).toContain('scope: performance');
    expect(serialized).toContain('target_symbol: DEFAULT_DEMO_CONFIG');
    expect(serialized).toContain("  mode: 'active'");
  });

  it('overrides title/summary per binding without mutating the shared definition, for reusing one scope against independent state', () => {
    const definition = createDemoDefinition();
    const secondValue: DemoConfig = { ...DEFAULT_DEMO_CONFIG, amount: 0.9 };

    const primaryBinding = createConfigScopeBinding({
      definition,
      value: DEFAULT_DEMO_CONFIG,
      onChange: vi.fn(),
    });
    const secondaryBinding = createConfigScopeBinding({
      definition,
      value: secondValue,
      onChange: vi.fn(),
      title: 'Demo performance — variant',
      summary: 'Independent instance',
    });

    expect(primaryBinding.definition.title).toBe('Demo performance');
    expect(primaryBinding.definition.summary).toBe('Dynamic controls');
    expect(secondaryBinding.definition.title).toBe('Demo performance — variant');
    expect(secondaryBinding.definition.summary).toBe('Independent instance');
    // The shared registered definition itself must stay untouched — only
    // this one binding's rendered copy is relabeled.
    expect(definition.title).toBe('Demo performance');
    expect(secondaryBinding.definition.fields).toBe(definition.fields);
    expect(secondaryBinding.definition.copy).toBe(definition.copy);
  });

  it('assembles shared controls without scope-specific JSX', () => {
    const definition = createDemoDefinition();
    const binding = createConfigScopeBinding({
      definition,
      value: DEFAULT_DEMO_CONFIG,
      onChange: () => undefined,
    });
    const html = renderToStaticMarkup(<ConfigScopeRenderer binding={binding} />);

    expect(html).toContain('Demo performance');
    expect(html).toContain('Dynamic controls');
    expect(html).toContain('Enabled');
    expect(html).toContain('ACTIVE');
    expect(html).toContain('Amount');
    expect(html).toContain('Color');
  });

  it('routes generated control changes back through the typed binding', () => {
    const definition = createDemoDefinition();
    const container = document.createElement('div');
    const root = createRoot(container);
    let currentValue = DEFAULT_DEMO_CONFIG;

    function Harness() {
      const [value, setValue] = React.useState(DEFAULT_DEMO_CONFIG);
      currentValue = value;
      return (
        <ConfigScopeRenderer
          binding={createConfigScopeBinding({ definition, value, onChange: setValue })}
        />
      );
    }

    act(() => root.render(<Harness />));
    const allButton = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent === 'ALL');
    expect(allButton).toBeTruthy();
    act(() => allButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(currentValue.mode).toBe('all');
    act(() => root.unmount());
  });
});
