import { describe, expect, it } from 'vitest';
import { defineConfigScope } from './defineConfigScope';
import { generateStorybookStoriesSource } from './generateStorybookStories';

type DemoConfig = {
  enabled: boolean;
  amount: number;
};

const DEFAULT_DEMO_CONFIG: DemoConfig = { enabled: true, amount: 0.5 };

const baseOptions = {
  componentName: 'Demo',
  componentImportPath: './Demo',
  definitionImportPath: './Demo.panel',
  definitionExportName: 'DEMO_PANEL',
  configTypeName: 'DemoConfig',
  configTypeImportPath: './Demo.config',
} as const;

function createDemoDefinition(withStates: boolean) {
  return defineConfigScope<DemoConfig>({
    id: 'Demo/performance',
    component: 'Demo',
    scope: 'performance',
    title: 'Demo performance',
    createdAt: '2026-01-01',
    defaultValue: DEFAULT_DEMO_CONFIG,
    fields: [
      { kind: 'boolean', key: 'enabled', label: 'Enabled' },
      { kind: 'number', key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.1 },
    ],
    documentedStates: withStates ? [
      { name: 'Disabled', description: 'Turned off entirely', value: { enabled: false } },
    ] : [],
    copy: {
      targetFile: 'demo.config.ts',
      targetSymbol: 'DEFAULT_DEMO_CONFIG',
      targetType: 'DemoConfig',
    },
  });
}

describe('generateStorybookStoriesSource', () => {
  it('emits a header marking the file as auto-generated, never hand-edited', () => {
    const source = generateStorybookStoriesSource({
      ...baseOptions,
      definition: createDemoDefinition(false),
    });
    expect(source).toContain('AUTO-GENERATED');
    expect(source).toContain('do not hand-edit');
  });

  it('imports the component and definition from the given paths, and the adapter by direct path', () => {
    const source = generateStorybookStoriesSource({
      ...baseOptions,
      definition: createDemoDefinition(false),
    });
    expect(source).toContain("import { Demo } from './Demo';");
    expect(source).toContain("import { DEMO_PANEL } from './Demo.panel';");
    expect(source).toContain("from './Panel/config/storybookArgTypes'");
    expect(source).toContain("from './Panel/config/storybookScopeRender'");
  });

  it('defaults the sidebar group to Generated/<component>, distinct from the hand-authored title', () => {
    const source = generateStorybookStoriesSource({
      ...baseOptions,
      definition: createDemoDefinition(false),
    });
    expect(source).toContain("title: 'Generated/Demo'");
  });

  it('always emits exactly one Default (Playground) story', () => {
    const source = generateStorybookStoriesSource({
      ...baseOptions,
      definition: createDemoDefinition(false),
    });
    expect(source.match(/export const Default: Story = \{\};/g)).toHaveLength(1);
  });

  it('emits one additional named story per documentedStates entry, with its value serialized as args', () => {
    const source = generateStorybookStoriesSource({
      ...baseOptions,
      definition: createDemoDefinition(true),
    });
    expect(source).toContain('export const Disabled: Story = {');
    expect(source).toContain('enabled: false,');
    expect(source).toContain('/** Turned off entirely */');
  });

  it('emits no extra stories when documentedStates is empty', () => {
    const source = generateStorybookStoriesSource({
      ...baseOptions,
      definition: createDemoDefinition(false),
    });
    expect(source.match(/^export const /gm)).toHaveLength(1);
  });

  it('serializes extraArgs into the shared meta.args', () => {
    const source = generateStorybookStoriesSource({
      ...baseOptions,
      definition: createDemoDefinition(false),
      extraArgs: { children: 'Click me' },
    });
    expect(source).toContain("children: \"Click me\",");
    expect(source).toContain('children: string;');
  });

  it('emits a { raw } extraArg verbatim, typed as unknown rather than guessed', () => {
    const source = generateStorybookStoriesSource({
      ...baseOptions,
      definition: createDemoDefinition(false),
      extraArgs: { theme: { raw: 'DEFAULT_THEME' } },
    });
    expect(source).toContain('theme: DEFAULT_THEME,');
    expect(source).not.toContain('"raw"');
    expect(source).toContain('theme: unknown;');
  });

  it('emits no decorators field when none are supplied', () => {
    const source = generateStorybookStoriesSource({
      ...baseOptions,
      definition: createDemoDefinition(false),
    });
    expect(source).not.toContain('decorators:');
  });

  it('emits decorator imports and a decorators field wrapping the story', () => {
    const source = generateStorybookStoriesSource({
      ...baseOptions,
      definition: createDemoDefinition(false),
      decorators: {
        imports: ["import { GradientTextureSourceDecorator } from './Panel/config/storybookDecorators';"],
        wrap: ['Story => <GradientTextureSourceDecorator><Story /></GradientTextureSourceDecorator>'],
      },
    });
    expect(source).toContain(
      "import { GradientTextureSourceDecorator } from './Panel/config/storybookDecorators';",
    );
    expect(source).toContain(
      'decorators: [Story => <GradientTextureSourceDecorator><Story /></GradientTextureSourceDecorator>],',
    );
  });
});
