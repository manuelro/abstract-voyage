import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ABSTRACT_POLYMORPHIC_LAYOUT_PANEL } from '../../../pages/abstract.panel';
import { ABOUT_POLYMORPHIC_LAYOUT_PANEL } from '../../../pages/about.panel';
import { POST_LAB_PAGE_LAYOUT_PANEL } from '../../../pages/posts/postLab.panel';

const PROJECT_ROOT = process.cwd();

/**
 * "Update diff" (components/Panel/index.tsx's UpdateDiffButton →
 * pages/api/dev/apply-config-update.tsx) trusts each scope's own
 * `copy.targetFile`/`copy.targetSymbol` completely — it does a literal
 * `fs.readFile(targetFile)` and then searches that source text for a
 * literal `export const <targetSymbol> = {...}` to patch. Neither value is
 * derived from anything at build time (`definePageConfigScope`'s own
 * `targetFile`/`targetSymbol` params are plain hand-typed strings — see
 * that function's own doc comment); nothing previously caught either one
 * going stale.
 *
 * That happened for real: `pages/posts/postLab.panel.ts`'s own
 * `POST_LAB_PAGE_LAYOUT_PANEL` pointed at `pages/posts-lab/postLab.config.ts`
 * (this page's own pre-`PLAN-POLYMORPHIC-LAYOUT-PAGE-CONFIG-PARITY.md` path
 * — the real file had already moved to `pages/posts/postLab.config.ts`) and
 * `DEFAULT_POST_LAB_PAGE_LAYOUT_CONFIG` (a re-export alias in that file, not
 * an object literal at all) — "Update diff" threw ERR on `/posts`
 * (operator-reported, screenshot evidence) until both were corrected to
 * point at this scope's own real object literal in this file, the same
 * pattern `ABSTRACT_POLYMORPHIC_LAYOUT_PANEL`/`ABOUT_POLYMORPHIC_LAYOUT_PANEL`
 * already used correctly.
 *
 * This guard exists so that exact class of drift can't silently recur for
 * any page in this `PolymorphicLayoutConfig` family again — add a new
 * page's own `*_POLYMORPHIC_LAYOUT_PANEL` (or `*_PAGE_LAYOUT_PANEL`, for a
 * page-config-scope wrapper like PostLab's own) to `PANELS` below and it's
 * covered automatically, the same "every page gets it for free" guarantee
 * `components/Panel/index.tsx`'s own `PanelStandardHeaderActions` gives the
 * header row itself.
 */
const PANELS = [
  ABSTRACT_POLYMORPHIC_LAYOUT_PANEL,
  ABOUT_POLYMORPHIC_LAYOUT_PANEL,
  POST_LAB_PAGE_LAYOUT_PANEL,
];

describe('PolymorphicLayout page-config panel scopes — Update diff target integrity', () => {
  it.each(PANELS.map(panel => [panel.id, panel] as const))(
    '%s: copy.targetFile exists on disk',
    (_id, panel) => {
      const resolvedPath = path.resolve(PROJECT_ROOT, panel.copy.targetFile);
      expect(existsSync(resolvedPath)).toBe(true);
    },
  );

  it.each(PANELS.map(panel => [panel.id, panel] as const))(
    '%s: copy.targetSymbol is a real object-literal export in copy.targetFile, not a re-export alias',
    (_id, panel) => {
      const resolvedPath = path.resolve(PROJECT_ROOT, panel.copy.targetFile);
      const source = readFileSync(resolvedPath, 'utf8');
      // Matches `export const <targetSymbol>` (optionally typed, e.g.
      // `: PolymorphicLayoutConfig`) followed by `=` — the exact shape
      // applyComponentConfigUpdateToSource patches. A re-export alias
      // (`export { X as <targetSymbol> }`) deliberately does NOT match this
      // pattern, which is the point: that shape is what silently broke
      // Update diff for /posts.
      const literalExportPattern = new RegExp(
        `export const ${panel.copy.targetSymbol}\\b[^=]*=`,
      );
      expect(source).toMatch(literalExportPattern);
    },
  );
});
