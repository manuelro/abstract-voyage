import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyComponentConfigUpdateToSource } from '../components/Panel/config/applyComponentConfigUpdate';

describe('/about shared Timeline capability persistence', () => {
  it('can materialize a newly shared Timeline field in its page override object', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'pages/about.config.ts'), 'utf8');
    const result = applyComponentConfigUpdateToSource(source, {
      component: 'AboutTimeline',
      scope: 'appearance',
      targetFile: 'pages/about.config.ts',
      targetSymbol: 'DEFAULT_ABOUT_PAGE_TIMELINE_CONFIG',
      targetType: 'AboutTimelineConfig',
      updateStrategy: 'merge',
      completeScope: false,
      knownKeys: ['introEnabled'],
      config: { introEnabled: false },
    });

    expect(result.ok).toBe(true);
    expect(result.updatedSource).toContain('  introEnabled: false,');
  });
});
