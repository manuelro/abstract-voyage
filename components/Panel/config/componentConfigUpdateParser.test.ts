import { describe, expect, it } from 'vitest';
import { formatComponentConfigPayload } from '../componentConfigPayload';
import { parseComponentConfigUpdatePayloads } from './componentConfigUpdateParser';

describe('parseComponentConfigUpdatePayloads', () => {
  it('round-trips formatComponentConfigPayload output for a single block', () => {
    const text = formatComponentConfigPayload({
      component: 'AbstractPostDock',
      scope: 'introduction',
      targetFile: 'experiences/abstract/components/AbstractPostDock/config/registered.ts',
      targetSymbol: 'DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG',
      targetType: 'AbstractPostDockIntroductionConfig',
      updateStrategy: 'merge',
      completeScope: false,
      knownKeys: [],
      config: {
        enabled: false,
        durationMs: 480,
        easing: 'settle',
      },
    });

    const [parsed] = parseComponentConfigUpdatePayloads(text);
    expect(parsed).toEqual({
      component: 'AbstractPostDock',
      scope: 'introduction',
      targetFile: 'experiences/abstract/components/AbstractPostDock/config/registered.ts',
      targetSymbol: 'DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG',
      targetType: 'AbstractPostDockIntroductionConfig',
      updateStrategy: 'merge',
      completeScope: false,
      knownKeys: [],
      config: {
        enabled: false,
        durationMs: 480,
        easing: 'settle',
      },
    });
  });

  it('round-trips an escaped single quote and a fractional number', () => {
    const text = formatComponentConfigPayload({
      component: 'Example',
      scope: 'test',
      targetFile: 'Example.tsx',
      targetSymbol: 'DEFAULT_EXAMPLE',
      targetType: 'ExampleConfig',
      config: { amount: 0.123456, label: "editor's choice" },
    });

    const [parsed] = parseComponentConfigUpdatePayloads(text);
    expect(parsed.config.amount).toBe(0.1235);
    expect(parsed.config.label).toBe("editor's choice");
  });

  it('round-trips a numeric array field', () => {
    const text = formatComponentConfigPayload({
      component: 'Example',
      scope: 'test',
      targetFile: 'Example.tsx',
      targetSymbol: 'DEFAULT_EXAMPLE',
      targetType: 'ExampleConfig',
      config: { easingCurve: [0.33, 1, 0.68, 1] },
    });

    const [parsed] = parseComponentConfigUpdatePayloads(text);
    expect(parsed.config.easingCurve).toEqual([0.33, 1, 0.68, 1]);
  });

  it('parses multiple blocks joined by a blank line, matching serializeConfigScopeBindingsDiff', () => {
    const blockA = formatComponentConfigPayload({
      component: 'A',
      scope: 'a',
      targetFile: 'A.ts',
      targetSymbol: 'DEFAULT_A',
      targetType: 'AConfig',
      updateStrategy: 'merge',
      completeScope: false,
      config: { enabled: true },
    });
    const blockB = formatComponentConfigPayload({
      component: 'B',
      scope: 'b',
      targetFile: 'B.ts',
      targetSymbol: 'DEFAULT_B',
      targetType: 'BConfig',
      updateStrategy: 'merge',
      completeScope: false,
      config: { durationMs: 200 },
    });

    const parsed = parseComponentConfigUpdatePayloads([blockA, blockB].join('\n\n'));
    expect(parsed).toHaveLength(2);
    expect(parsed[0].targetSymbol).toBe('DEFAULT_A');
    expect(parsed[0].config).toEqual({ enabled: true });
    expect(parsed[1].targetSymbol).toBe('DEFAULT_B');
    expect(parsed[1].config).toEqual({ durationMs: 200 });
  });

  it('throws with a descriptive message on a malformed block', () => {
    expect(() => parseComponentConfigUpdatePayloads('# component-config-update/v1\nnot a valid header line'))
      .toThrow(/Unrecognized header line/);
  });

  it('returns an empty array for blank input', () => {
    expect(parseComponentConfigUpdatePayloads('   \n  ')).toEqual([]);
  });
});
