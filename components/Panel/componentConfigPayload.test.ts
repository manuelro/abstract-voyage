import { describe, expect, it } from 'vitest';
import { formatComponentConfigPayload } from './componentConfigPayload';

describe('formatComponentConfigPayload', () => {
  it('emits stable component-target metadata and exact TypeScript property names', () => {
    expect(formatComponentConfigPayload({
      component: 'AbstractPostDock',
      scope: 'introduction',
      targetFile: 'experiences/abstract/components/AbstractPostDock/config/registered.ts',
      targetSymbol: 'DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG',
      targetType: 'AbstractPostDockIntroductionConfig',
      config: {
        enabled: false,
        durationMs: 480,
        easing: 'settle',
      },
    })).toBe([
      '# component-config-update/v1',
      'component: AbstractPostDock',
      'scope: introduction',
      'target_file: experiences/abstract/components/AbstractPostDock/config/registered.ts',
      'target_symbol: DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG',
      'target_type: AbstractPostDockIntroductionConfig',
      'update_strategy: replace_scope',
      'complete_scope: true',
      '',
      'config:',
      '  enabled: false',
      '  durationMs: 480',
      "  easing: 'settle'",
    ].join('\n'));
  });

  it('normalizes numbers and escapes YAML string quotes', () => {
    const text = formatComponentConfigPayload({
      component: 'Example',
      scope: 'test',
      targetFile: 'Example.tsx',
      targetSymbol: 'DEFAULT_EXAMPLE',
      targetType: 'ExampleConfig',
      config: {
        amount: 0.123456,
        label: "editor's choice",
      },
    });

    expect(text).toContain('  amount: 0.1235');
    expect(text).toContain("  label: 'editor''s choice'");
  });
});
