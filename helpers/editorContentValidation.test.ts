import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  extractArticleDirectives,
  isValidArticleFileName,
  validateArticleSource,
} from './editorContentValidation';

describe('editor article content contract', () => {
  it('accepts the established filename pattern and welcome singleton', () => {
    expect(isValidArticleFileName('2026-09-15_editorial-systems.md')).toBe(true);
    expect(isValidArticleFileName('welcome.md')).toBe(true);
    expect(isValidArticleFileName('editorial-systems.md')).toBe(false);
    expect(isValidArticleFileName('../escape.md')).toBe(false);
  });

  it('extracts the custom Markdown directives', () => {
    expect(extractArticleDirectives(`
<!-- code:include file="example.js" lang="js" title="Example" -->
<!-- table:system-map -->
`)).toEqual([
      { kind: 'snippet', id: 'example.js' },
      { kind: 'table', id: 'system-map' },
    ]);
  });

  it('validates every checked-in article and its referenced assets', () => {
    const postsDir = path.join(process.cwd(), 'posts');
    const failures = fs.readdirSync(postsDir)
      .filter(fileName => fileName.endsWith('.md'))
      .flatMap(fileName => {
        const result = validateArticleSource({
          fileName,
          source: fs.readFileSync(path.join(postsDir, fileName), 'utf8'),
        });
        return result.errors.map(error => `${fileName}: ${error}`);
      });

    expect(failures).toEqual([]);
  });
});
