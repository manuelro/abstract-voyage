import { definePageConfigScope } from '../../components/Panel/config';
import { POLYMORPHIC_LAYOUT_FIELDS } from '../../experiences/abstract/components/PolymorphicLayout.panel';
import { POST_LAB_POLYMORPHIC_LAYOUT_CONFIG } from '../../experiences/abstract/components/PolymorphicLayout.pageConfigs';
import type { PostLabPageLayoutConfig } from './postLab.config';

// PLAN-POLYMORPHIC-LAYOUT-PAGE-CONFIG-PARITY.md: migrated off the plain
// defineConfigScope this scope used before onto definePageConfigScope,
// matching pages/abstract.panel.ts's ABSTRACT_POLYMORPHIC_LAYOUT_PANEL and
// pages/about.panel.ts's ABOUT_POLYMORPHIC_LAYOUT_PANEL exactly — same
// component/scope naming (component: 'SplitColumnLayout', scope: 'layout'),
// same title ('Polymorphic Layout', not the previous page-specific 'Posts
// lab page layout' — the operator-visible symptom this migration fixes:
// all three pages now read as running on the shared system at a glance).
// definePageConfigScope derives id as `${component}/${scope}:${pageName}`,
// i.e. 'SplitColumnLayout/layout:PostLab' — the SCOPE_ID constant below
// must match that exactly; postLab.panel.test.tsx / consistency-guard test
// verifies this stays true.
export const POST_LAB_PAGE_LAYOUT_SCOPE_ID = 'SplitColumnLayout/layout:PostLab' as const;

export const POST_LAB_PAGE_LAYOUT_PANEL = definePageConfigScope<PostLabPageLayoutConfig>({
  component: 'SplitColumnLayout',
  scope: 'layout',
  pageName: 'PostLab',
  title: 'Polymorphic Layout',
  createdAt: '2026-08-11',
  summary: 'Content container width/position, both columns',
  defaultOpen: false,
  fields: POLYMORPHIC_LAYOUT_FIELDS,
  defaultValue: POST_LAB_POLYMORPHIC_LAYOUT_CONFIG,
  // Bug fix (operator-reported: "Update diff" threw ERR on /posts —
  // components/Panel/index.tsx's UpdateDiffButton POSTs this targetFile to
  // pages/api/dev/apply-config-update.tsx, which does a literal
  // fs.readFile(targetFile) before anything else). Two stale values, both
  // left over from before this scope moved onto the shared
  // PolymorphicLayout.pageConfigs.ts system (PLAN-POLYMORPHIC-LAYOUT-PAGE-
  // CONFIG-PARITY.md, the migration this file's own top comment documents):
  // (1) targetFile pointed at pages/posts-lab/postLab.config.ts, this
  // page's own pre-move path (the actual file now lives at
  // pages/posts/postLab.config.ts) — a literal ENOENT, the direct cause of
  // the ERR state. (2) targetSymbol pointed at
  // DEFAULT_POST_LAB_PAGE_LAYOUT_CONFIG, which even at its current correct
  // path is only a re-export alias (`export { POST_LAB_POLYMORPHIC_LAYOUT_CONFIG
  // as DEFAULT_POST_LAB_PAGE_LAYOUT_CONFIG } from '...pageConfigs'`), not an
  // object literal applyComponentConfigUpdateToSource could ever patch —
  // fixing only (1) would have traded an ENOENT for a "target_symbol not
  // found" error instead. Both now point at this scope's own real,
  // defaultValue-matching object literal, the same pattern
  // pages/abstract.panel.ts's ABSTRACT_POLYMORPHIC_LAYOUT_PANEL and
  // pages/about.panel.ts's ABOUT_POLYMORPHIC_LAYOUT_PANEL already use
  // correctly for the identical scope shape. See
  // PolymorphicLayout.pageConfigs.test.ts for the guard that now keeps all
  // three (and any future page added to this family) from drifting the
  // same way again.
  targetFile: 'experiences/abstract/components/PolymorphicLayout.pageConfigs.ts',
  targetSymbol: 'POST_LAB_POLYMORPHIC_LAYOUT_CONFIG',
  targetType: 'PostLabPageLayoutConfig',
});
