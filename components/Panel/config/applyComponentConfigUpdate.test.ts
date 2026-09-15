import { describe, expect, it } from 'vitest';
import { applyComponentConfigUpdateToSource } from './applyComponentConfigUpdate';
import type { ParsedComponentConfigUpdate } from './componentConfigUpdateParser';

function makePayload(overrides: Partial<ParsedComponentConfigUpdate>): ParsedComponentConfigUpdate {
  return {
    component: 'Example',
    scope: 'test',
    targetFile: 'Example.ts',
    targetSymbol: 'DEFAULT_EXAMPLE_CONFIG',
    targetType: 'ExampleConfig',
    updateStrategy: 'merge',
    completeScope: false,
    config: {},
    ...overrides,
  };
}

describe('applyComponentConfigUpdateToSource', () => {
  it('replaces only the named fields, leaving comments/formatting/other fields untouched', () => {
    const source = [
      "export const DEFAULT_EXAMPLE_CONFIG = {",
      "  // durationMs: how long the thing takes",
      "  durationMs: 300,",
      "  easing: 'ease',",
      "  enabled: true,",
      "} satisfies ExampleConfig;",
      "",
    ].join('\n');

    const result = applyComponentConfigUpdateToSource(source, makePayload({
      config: { durationMs: 480, easing: 'settle' },
    }));

    expect(result.ok).toBe(true);
    expect(result.changedKeys).toEqual(['durationMs', 'easing']);
    expect(result.updatedSource).toBe([
      "export const DEFAULT_EXAMPLE_CONFIG = {",
      "  // durationMs: how long the thing takes",
      "  durationMs: 480,",
      "  easing: 'settle',",
      "  enabled: true,",
      "} satisfies ExampleConfig;",
      "",
    ].join('\n'));
  });

  it('picks the correct symbol among two objects sharing identical field names', () => {
    const source = [
      "export const ABSTRACT_CONFIG = {",
      "  narrowColumnContentAlignWide: 'items-start',",
      "};",
      "",
      "export const ABOUT_CONFIG = {",
      "  narrowColumnContentAlignWide: 'items-start',",
      "};",
      "",
    ].join('\n');

    const result = applyComponentConfigUpdateToSource(source, makePayload({
      targetSymbol: 'ABSTRACT_CONFIG',
      config: { narrowColumnContentAlignWide: 'items-center' },
    }));

    expect(result.ok).toBe(true);
    expect(result.updatedSource).toContain("ABSTRACT_CONFIG = {\n  narrowColumnContentAlignWide: 'items-center',");
    expect(result.updatedSource).toContain("ABOUT_CONFIG = {\n  narrowColumnContentAlignWide: 'items-start',");
  });

  it('fails atomically (no partial write) when a config key does not exist on the target', () => {
    const source = "export const DEFAULT_EXAMPLE_CONFIG = {\n  enabled: true,\n};\n";

    const result = applyComponentConfigUpdateToSource(source, makePayload({
      config: { enabled: false, nonexistentField: 1 },
    }));

    expect(result.ok).toBe(false);
    expect(result.unmatchedKeys).toEqual(['nonexistentField']);
    expect(result.updatedSource).toBeUndefined();
  });

  it('reports an error when target_symbol is not found', () => {
    const source = "export const SOMETHING_ELSE = { enabled: true };\n";
    const result = applyComponentConfigUpdateToSource(source, makePayload({ config: { enabled: false } }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Could not find/);
  });

  it('reports unmentionedExistingKeys only when completeScope is true', () => {
    const source = "export const DEFAULT_EXAMPLE_CONFIG = {\n  a: 1,\n  b: 2,\n};\n";

    const partial = applyComponentConfigUpdateToSource(source, makePayload({
      completeScope: false,
      config: { a: 9 },
    }));
    expect(partial.unmentionedExistingKeys).toEqual([]);

    const complete = applyComponentConfigUpdateToSource(source, makePayload({
      completeScope: true,
      config: { a: 9 },
    }));
    expect(complete.unmentionedExistingKeys).toEqual(['b']);
  });

  it('formats replacement strings with single quotes and escapes embedded quotes', () => {
    const source = "export const DEFAULT_EXAMPLE_CONFIG = {\n  label: 'old',\n};\n";
    const result = applyComponentConfigUpdateToSource(source, makePayload({
      config: { label: "editor's choice" },
    }));
    expect(result.updatedSource).toContain("label: 'editor\\'s choice',");
  });

  it('formats a numeric array replacement', () => {
    const source = "export const DEFAULT_EXAMPLE_CONFIG = {\n  curve: [0, 0, 1, 1],\n};\n";
    const result = applyComponentConfigUpdateToSource(source, makePayload({
      config: { curve: [0.33, 1, 0.68, 1] },
    }));
    expect(result.updatedSource).toContain('curve: [0.33, 1, 0.68, 1],');
  });
});
