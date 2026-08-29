import type { ConfigScalar, RuntimeConfigScopeDefinition } from './types';

/** A static, literal source-text expression the generator emits verbatim
 * instead of `JSON.stringify`-ing — for a non-scalar extraArg value JSON
 * can't represent (e.g. referencing an imported constant), but that's
 * still a plain expression, not something needing live/mounted behavior
 * (that's what `decorators` is for instead). */
export type ExtraArgValue = ConfigScalar | { raw: string };

export type GenerateStorybookStoriesOptions = {
  definition: RuntimeConfigScopeDefinition;
  componentName: string;
  /** Import path to the component, relative to the generated file's own
   * location (which sits next to `<Component>.tsx`, same as the
   * hand-authored `.stories.tsx`). */
  componentImportPath: string;
  definitionImportPath: string;
  definitionExportName: string;
  /** The component's own config type (e.g. `CtaButtonConfig`) and where to
   * import it from. Needed because the generated meta's args are flat —
   * one key per scope field, for the Controls addon — not the component's
   * real nested `config` prop shape, so `Meta<typeof Component>` (which
   * would tie args to the real props) can't be used here; a local
   * `Partial<${configTypeName}> & { extraArgs }` type is generated instead. */
  configTypeName: string;
  configTypeImportPath: string;
  /** Storybook sidebar group — defaults to a distinct `Generated/…` group
   * so this never has to coordinate title/casing with the hand-authored
   * file's own `title` (see plan.md). */
  storybookGroup?: string;
  /** The handful of non-config, structurally-required props (`children`,
   * `href`, …) a scope cannot see — see plan.md's "Building blocks the
   * flow depends on." Plain scalars are serialized as JSON; `{ raw }`
   * values are emitted as literal source text instead. */
  extraArgs?: Readonly<Record<string, ExtraArgValue>>;
  /** For a non-`config` prop that needs *live, mounted* behavior (an
   * effect, a ref, an animation loop — e.g. a gradient texture source),
   * not just a static value: emitted as a real Storybook `decorators`
   * entry on the generated `meta`, matching CSF's own `Meta['decorators']`
   * field. `imports` are emitted verbatim above `meta`; each `wrap` entry
   * is the literal source text of a `(Story) => ReactNode` decorator
   * function. See `storybookDecorators.tsx` for the shared
   * `GradientTextureSourceDecorator` this is built to use. */
  decorators?: {
    imports: ReadonlyArray<string>;
    wrap: ReadonlyArray<string>;
  };
  /** Directory (relative to the generated file) containing
   * `storybookArgTypes.ts`/`storybookScopeRender.tsx` — deliberately
   * imported by direct path, not through `components/Panel/config`'s
   * public barrel, since that barrel ships in the production bundle and
   * this adapter has no reason to. */
  scopeAdapterDirImportPath?: string;
};

function scalarTypeName(value: ConfigScalar): 'string' | 'number' | 'boolean' {
  return typeof value as 'string' | 'number' | 'boolean';
}

function isRawExtraArg(value: ExtraArgValue): value is { raw: string } {
  return typeof value === 'object' && value !== null && 'raw' in value;
}

/** Serialized source text for one extraArg value — `JSON.stringify` for a
 * plain scalar, verbatim for `{ raw }`. */
function serializeExtraArgValue(value: ExtraArgValue): string {
  return isRawExtraArg(value) ? value.raw : JSON.stringify(value);
}

/** `{ raw }` values can be any expression (an imported constant, a
 * function, a class instance) — there's no way to know its real type from
 * a string, so it's typed `unknown` rather than guessed. A plain scalar
 * still gets its exact primitive type. */
function extraArgTypeName(value: ExtraArgValue): string {
  return isRawExtraArg(value) ? 'unknown' : scalarTypeName(value);
}

/** Serializes a flat scalar-args object as an indented object literal —
 * `baseIndent` is the indentation of the line the opening `{` sits on. */
function serializeArgsLiteral(args: Readonly<Record<string, ConfigScalar>>, baseIndent: string): string {
  const entries = Object.entries(args)
    .map(([key, value]) => `${baseIndent}  ${key}: ${JSON.stringify(value)},`);
  return entries.length ? `{\n${entries.join('\n')}\n${baseIndent}}` : '{}';
}

/**
 * Produces the full source text of `<Component>.generated.stories.tsx` —
 * note the order: `.generated.stories.tsx`, so the filename still ends in
 * `.stories.tsx`, matching `.storybook/main.ts`'s
 * `'../**\/*.stories.@(ts|tsx|mdx)'` glob (the reversed `.stories.generated.tsx`
 * does not match it and is silently invisible to Storybook — confirmed by
 * booting it and checking the story index; see plan.md). A real,
 * statically-analyzable CSF file — Storybook's own indexer needs real
 * named exports, so this cannot be a thin runtime dispatcher over
 * `documentedStates`. Pure string generation, no filesystem access — the
 * caller decides where/whether to write it, keeping this function
 * trivially unit-testable and keeping the actual file write (a real,
 * explicit-request-gated action) out of this module entirely.
 */
export function generateStorybookStoriesSource(options: GenerateStorybookStoriesOptions): string {
  const {
    definition, componentName, componentImportPath, definitionImportPath, definitionExportName,
    configTypeName, configTypeImportPath,
    storybookGroup = `Generated/${componentName}`,
    extraArgs = {},
    decorators,
    scopeAdapterDirImportPath = './Panel/config',
  } = options;

  const extraArgsEntries = Object.entries(extraArgs)
    .map(([key, value]) => `    ${key}: ${serializeExtraArgValue(value)},`)
    .join('\n');

  const extraArgsTypeEntries = Object.entries(extraArgs)
    .map(([key, value]) => `  ${key}: ${extraArgTypeName(value)};`)
    .join('\n');

  const decoratorImports = decorators?.imports.length ? `${decorators.imports.join('\n')}\n` : '';
  const decoratorsField = decorators?.wrap.length
    ? `\n  decorators: [${decorators.wrap.join(', ')}],`
    : '';

  const documentedStateBlocks = (definition.documentedStates ?? []).map(state => {
    const doc = state.description ? `/** ${state.description} */\n` : '';
    return `\n${doc}export const ${state.name}: Story = {\n  args: ${serializeArgsLiteral(state.value, '  ')},\n};\n`;
  }).join('');

  return `// AUTO-GENERATED by components/Panel/config/generateStorybookStories.ts —
// do not hand-edit. Regenerate by re-running the SB8 story generator for
// this component; see plan.md / AGENTS.md's "Storybook (SB8) documentation
// automation" section for the explicit-trigger rule governing when this
// file may be rewritten. Hand-curated narrative stories belong in
// ${componentName}.stories.tsx instead — this file is never merged with it.
import type { Meta, StoryObj } from '@storybook/react';
import { ${componentName} } from '${componentImportPath}';
import type { ${configTypeName} } from '${configTypeImportPath}';
import { ${definitionExportName} } from '${definitionImportPath}';
import { configScopeToStorybookMeta } from '${scopeAdapterDirImportPath}/storybookArgTypes';
import { createScopeStoryRender } from '${scopeAdapterDirImportPath}/storybookScopeRender';
${decoratorImports}
const { argTypes, args } = configScopeToStorybookMeta(${definitionExportName});

// Flat — one key per scope field, for the Controls addon — not the
// component's own nested \`config\` prop shape, so this is typed
// independently of \`typeof ${componentName}\` rather than via
// \`Meta<typeof ${componentName}>\`. See createScopeStoryRender's own doc
// comment for why this is safe.
type GeneratedStoryArgs = Partial<${configTypeName}> & {
${extraArgsTypeEntries}
};

// Deliberately no \`component: ${componentName}\` here — Storybook's own
// prop-docgen inference for a \`component\` field would describe
// ${componentName}'s real (nested-\`config\`) props, fighting the flat
// GeneratedStoryArgs shape above rather than complementing it. \`argTypes\`
// and \`render\` alone are enough for Controls/autodocs to work correctly.
const meta = {
  title: '${storybookGroup}',
  tags: ['autodocs'],
  argTypes,
  args: {
    ...args,
${extraArgsEntries}
  },
  render: createScopeStoryRender(${componentName}, ${definitionExportName}),${decoratorsField}
} satisfies Meta<GeneratedStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
${documentedStateBlocks}`;
}
