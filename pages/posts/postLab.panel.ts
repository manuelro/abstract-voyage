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
  targetFile: 'pages/posts-lab/postLab.config.ts',
  targetSymbol: 'DEFAULT_POST_LAB_PAGE_LAYOUT_CONFIG',
  targetType: 'PostLabPageLayoutConfig',
});
