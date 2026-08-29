import { describe, expect, it } from 'vitest';
import { defineConfigScope } from './defineConfigScope';
import {
  argsToScopeConfig,
  configScopeToStorybookMeta,
  translateVisibleWhen,
} from './storybookArgTypes';

type DemoConfig = {
  enabled: boolean;
  mode: 'active' | 'all';
  amount: number;
  color: string;
  hidden: number;
  advanced: number;
};

const DEFAULT_DEMO_CONFIG: DemoConfig = {
  enabled: true,
  mode: 'active',
  amount: 0.5,
  color: '#000000',
  hidden: 1,
  advanced: 2,
};

function createDemoDefinition() {
  return defineConfigScope<DemoConfig>({
    id: 'Demo/performance',
    component: 'Demo',
    scope: 'performance',
    title: 'Demo performance',
    createdAt: '2026-01-01',
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
      { kind: 'number', key: 'amount', label: 'Amount', description: 'How much', unit: '%', min: 0, max: 1, step: 0.1 },
      { kind: 'color', key: 'color', label: 'Color' },
      {
        kind: 'group',
        label: 'Advanced',
        fields: [
          {
            kind: 'number',
            key: 'advanced',
            label: 'Advanced amount',
            min: 0,
            max: 10,
            step: 1,
            visibleWhen: config => config.mode === 'all',
          },
        ],
      },
    ],
    hiddenKeys: ['hidden'],
    copy: {
      targetFile: 'demo.config.ts',
      targetSymbol: 'DEFAULT_DEMO_CONFIG',
      targetType: 'DemoConfig',
    },
  });
}

describe('translateVisibleWhen', () => {
  it('translates a single-key equality predicate', () => {
    expect(translateVisibleWhen(config => config.mode === 'all'))
      .toEqual({ arg: 'mode', eq: 'all' });
  });

  it('translates a bare truthy predicate', () => {
    // `translateVisibleWhen` only ever stringifies the function via
    // `.toString()` — it never invokes it — so the cast below is safe: it
    // exists purely to satisfy TS's boolean return-type check on a real
    // scope's own `visibleWhen` (which returns a real `boolean` because
    // it's authored against the concrete config type, not this generic
    // `Record<string, ConfigScalar>` test parameter).
    const predicate = ((config: Record<string, DemoConfig['enabled']>) => config.enabled) as
      unknown as Parameters<typeof translateVisibleWhen>[0];
    expect(translateVisibleWhen(predicate)).toEqual({ arg: 'enabled', truthy: true });
  });

  it('translates a negated truthy predicate', () => {
    expect(translateVisibleWhen(config => !config.enabled))
      .toEqual({ arg: 'enabled', truthy: false });
  });

  it('returns null for a multi-key predicate rather than guessing', () => {
    const predicate = ((config: DemoConfig) => config.mode === 'all' && config.enabled) as
      unknown as Parameters<typeof translateVisibleWhen>[0];
    expect(translateVisibleWhen(predicate)).toBeNull();
  });

  it('returns null for an OR predicate rather than guessing', () => {
    const predicate = ((config: DemoConfig) => config.mode === 'all' || config.enabled) as
      unknown as Parameters<typeof translateVisibleWhen>[0];
    expect(translateVisibleWhen(predicate)).toBeNull();
  });
});

describe('configScopeToStorybookMeta', () => {
  it('maps each field kind to its Storybook control', () => {
    const { argTypes } = configScopeToStorybookMeta(createDemoDefinition());
    expect(argTypes.enabled?.control).toBe('boolean');
    expect(argTypes.color?.control).toBe('color');
    expect(argTypes.amount?.control).toEqual({ type: 'range', min: 0, max: 1, step: 0.1 });
    expect(argTypes.mode?.control).toBe('select');
    expect(argTypes.mode?.options).toEqual(['active', 'all']);
  });

  it('excludes hiddenKeys from both argTypes and baseline args', () => {
    const { argTypes, args } = configScopeToStorybookMeta(createDemoDefinition());
    expect(argTypes.hidden).toBeUndefined();
    expect(args.hidden).toBeUndefined();
  });

  it('folds description/unit into the argType description and label into name', () => {
    const { argTypes } = configScopeToStorybookMeta(createDemoDefinition());
    expect(argTypes.amount?.name).toBe('Amount');
    expect(argTypes.amount?.description).toContain('How much');
    expect(argTypes.amount?.description).toContain('Unit: %.');
  });

  it('applies group label as table.category for fields inside a group', () => {
    const { argTypes } = configScopeToStorybookMeta(createDemoDefinition());
    expect(argTypes.advanced?.table).toEqual({ category: 'Advanced' });
  });

  it('translates a translatable visibleWhen into argTypes[x].if', () => {
    const { argTypes } = configScopeToStorybookMeta(createDemoDefinition());
    expect(argTypes.advanced?.if).toEqual({ arg: 'mode', eq: 'all' });
  });

  it('produces baseline args matching the scope defaults for every rendered field', () => {
    const { args } = configScopeToStorybookMeta(createDemoDefinition());
    expect(args).toEqual({
      enabled: true,
      mode: 'active',
      amount: 0.5,
      color: '#000000',
      advanced: 2,
    });
  });
});

describe('argsToScopeConfig', () => {
  it('splits flat args into the scope-covered config and everything else', () => {
    const definition = createDemoDefinition();
    const { config, rest } = argsToScopeConfig(
      { enabled: false, mode: 'all', children: 'Click me', href: '/somewhere' },
      definition,
    );
    expect(config).toEqual({ enabled: false, mode: 'all' });
    expect(rest).toEqual({ children: 'Click me', href: '/somewhere' });
  });
});
