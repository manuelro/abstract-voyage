import { describe, expect, it, vi } from 'vitest';
import { createConfigScopeBinding } from './binding';
import { defineConfigScope } from './defineConfigScope';
import {
  serializeConfigScopeBindingDiff,
  serializeConfigScopeBindings,
  serializeConfigScopeBindingsDiff,
} from './serialization';

type DemoConfig = {
  enabled: boolean;
  amount: number;
  mode: 'active' | 'all';
};

const DEFAULT_DEMO_CONFIG: DemoConfig = {
  enabled: true,
  amount: 0.5,
  mode: 'active',
};

function createDemoDefinition(id = 'Demo/performance') {
  return defineConfigScope<DemoConfig>({
    id,
    component: 'Demo',
    scope: 'performance',
    title: 'Demo performance',
    createdAt: '2026-01-01',
    defaultValue: DEFAULT_DEMO_CONFIG,
    fields: [
      { kind: 'boolean', key: 'enabled', label: 'Enabled' },
      { kind: 'number', key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.1 },
      {
        kind: 'enum',
        key: 'mode',
        label: 'Mode',
        options: [
          { label: 'ACTIVE', value: 'active' },
          { label: 'ALL', value: 'all' },
        ],
      },
    ],
    copy: {
      targetFile: 'demo.config.ts',
      targetSymbol: 'DEFAULT_DEMO_CONFIG',
      targetType: 'DemoConfig',
    },
  });
}

describe('serializeConfigScopeBindingDiff', () => {
  it('returns null when the value equals defaultValue in every field', () => {
    const binding = createConfigScopeBinding({
      definition: createDemoDefinition(),
      value: { ...DEFAULT_DEMO_CONFIG },
      onChange: vi.fn(),
    });

    expect(serializeConfigScopeBindingDiff(binding)).toBeNull();
  });

  it('emits only the fields that differ from defaultValue', () => {
    const binding = createConfigScopeBinding({
      definition: createDemoDefinition(),
      value: { ...DEFAULT_DEMO_CONFIG, amount: 0.9 },
      onChange: vi.fn(),
    });

    const payload = serializeConfigScopeBindingDiff(binding);
    expect(payload).not.toBeNull();
    expect(payload).toContain('amount: 0.9');
    expect(payload).not.toContain('enabled:');
    expect(payload).not.toContain('mode:');
  });

  it('always uses update_strategy: merge and complete_scope: false, regardless of the scope\'s own authored copy.updateStrategy', () => {
    const definition = defineConfigScope<DemoConfig>({
      id: 'Demo/replace-authored',
      component: 'Demo',
      scope: 'performance',
      title: 'Demo performance',
      createdAt: '2026-01-01',
      defaultValue: DEFAULT_DEMO_CONFIG,
      fields: [
        { kind: 'boolean', key: 'enabled', label: 'Enabled' },
        { kind: 'number', key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.1 },
        {
          kind: 'enum',
          key: 'mode',
          label: 'Mode',
          options: [
            { label: 'ACTIVE', value: 'active' },
            { label: 'ALL', value: 'all' },
          ],
        },
      ],
      copy: {
        targetFile: 'demo.config.ts',
        targetSymbol: 'DEFAULT_DEMO_CONFIG',
        targetType: 'DemoConfig',
        updateStrategy: 'replace_scope',
        completeScope: true,
      },
    });
    const binding = createConfigScopeBinding({
      definition,
      value: { ...DEFAULT_DEMO_CONFIG, amount: 0.9 },
      onChange: vi.fn(),
    });

    const payload = serializeConfigScopeBindingDiff(binding)!;
    expect(payload).toContain('update_strategy: merge');
    expect(payload).toContain('complete_scope: false');
  });

  it('does not flag a value as changed when it only differs from default by float round-trip noise', () => {
    const binding = createConfigScopeBinding({
      definition: createDemoDefinition(),
      // Same 4-decimal rounding formatComponentConfigPayload's own
      // formatScalar applies — 0.30000000000000004 is what 0.1 + 0.2
      // produces in floating point, and would serialize identically to 0.3.
      value: { ...DEFAULT_DEMO_CONFIG, amount: 0.5 + 1e-9 },
      onChange: vi.fn(),
    });

    expect(serializeConfigScopeBindingDiff(binding)).toBeNull();
  });

  it('diffs against a bound-instance defaultValue override instead of the registered scope default', () => {
    // A page shipping its own baseline for one field (mirrors
    // pages/abstract.tsx's ABSTRACT_SPLIT_COLUMN_CARD_STACK_CONFIG, which
    // starts showArrowControlsEnabled away from the shared scope default).
    const pageDefaultValue: DemoConfig = { ...DEFAULT_DEMO_CONFIG, enabled: false };

    // Value matches the page's own baseline exactly — nothing to diff, even
    // though it differs from the scope's own registered defaultValue.
    const untouched = createConfigScopeBinding({
      definition: createDemoDefinition(),
      value: { ...pageDefaultValue },
      onChange: vi.fn(),
      defaultValue: pageDefaultValue,
    });
    expect(serializeConfigScopeBindingDiff(untouched)).toBeNull();

    // The operator edits it back to the *scope's* own default (true) — a
    // real, deliberate change away from the page's own shipped baseline.
    // Without the override, this would incorrectly match
    // definition.defaultValue and vanish from the diff.
    const edited = createConfigScopeBinding({
      definition: createDemoDefinition(),
      value: { ...pageDefaultValue, enabled: true },
      onChange: vi.fn(),
      defaultValue: pageDefaultValue,
    });
    const diff = serializeConfigScopeBindingDiff(edited);
    expect(diff).not.toBeNull();
    expect(diff).toContain('enabled: true');
  });

  it('resets to the bound-instance defaultValue override, not the registered scope default', () => {
    const pageDefaultValue: DemoConfig = { ...DEFAULT_DEMO_CONFIG, enabled: false };
    const onChange = vi.fn();
    const binding = createConfigScopeBinding({
      definition: createDemoDefinition(),
      value: { ...pageDefaultValue, enabled: true },
      onChange,
      defaultValue: pageDefaultValue,
    });

    binding.reset();
    expect(onChange).toHaveBeenCalledWith(pageDefaultValue);
  });
});

describe('serializeConfigScopeBindingsDiff', () => {
  it('omits scopes with no diff entirely and includes only scopes that changed', () => {
    const untouched = createConfigScopeBinding({
      definition: createDemoDefinition('Demo/untouched'),
      value: { ...DEFAULT_DEMO_CONFIG },
      onChange: vi.fn(),
    });
    const touched = createConfigScopeBinding({
      definition: createDemoDefinition('Demo/touched'),
      value: { ...DEFAULT_DEMO_CONFIG, enabled: false },
      onChange: vi.fn(),
    });

    const result = serializeConfigScopeBindingsDiff([untouched, touched]);
    // Only one payload block present — the untouched scope contributes
    // nothing at all, not an empty-but-present entry (component/scope
    // alone can't distinguish the two bindings here, since both share the
    // same copy metadata; a single joined payload is proof enough).
    expect(result).toBe(serializeConfigScopeBindingDiff(touched));
    expect(result).toContain('enabled: false');
    expect(result.match(/# component-config-update\/v1/g)).toHaveLength(1);
  });

  it('returns an empty string when nothing in any bound scope differs from default', () => {
    const bindings = [
      createConfigScopeBinding({
        definition: createDemoDefinition('Demo/a'),
        value: { ...DEFAULT_DEMO_CONFIG },
        onChange: vi.fn(),
      }),
      createConfigScopeBinding({
        definition: createDemoDefinition('Demo/b'),
        value: { ...DEFAULT_DEMO_CONFIG },
        onChange: vi.fn(),
      }),
    ];

    expect(serializeConfigScopeBindingsDiff(bindings)).toBe('');
  });
});

describe('serializeConfigScopeBindings (unchanged)', () => {
  it('still emits the complete config regardless of what differs from default', () => {
    const binding = createConfigScopeBinding({
      definition: createDemoDefinition(),
      value: { ...DEFAULT_DEMO_CONFIG },
      onChange: vi.fn(),
    });

    const result = serializeConfigScopeBindings([binding]);
    expect(result).toContain('enabled: true');
    expect(result).toContain('amount: 0.5');
    expect(result).toContain("mode: 'active'");
    expect(result).toContain('update_strategy: replace_scope');
    expect(result).toContain('complete_scope: true');
  });
});
