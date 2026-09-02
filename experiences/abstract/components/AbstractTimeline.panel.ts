import { defineConfigScope } from '../../../components/Panel/config';
import { ABOUT_TIMELINE_PANEL_FIELDS } from '../../about/components/AboutTimeline.panel';
import type { AboutTimelineConfig } from '../../about/components/AboutTimeline.config';
import { DEFAULT_ABSTRACT_TIMELINE_CONFIG } from '../../../pages/abstract.config';

export const ABSTRACT_TIMELINE_SCOPE_ID = 'AboutTimeline/abstract-appearance' as const;

/**
 * /abstract's own registration of the shared `AboutTimeline` component
 * (experiences/about/components/AboutTimeline.tsx) — the narrow column's
 * article list now reuses that exact class rather than /abstract's former
 * bespoke `ArticleList`, per the "one centralized component, independent
 * per-page config" ask. `ABOUT_TIMELINE_PANEL_FIELDS` is the same field
 * list AboutTimeline.panel.ts's own `ABOUT_TIMELINE_PANEL` uses — reused
 * verbatim, not retyped, so the two pages' panels can never silently drift
 * apart on what fields exist. `defaultValue` comes from this page's own
 * baseline in pages/abstract.config.ts, while reusing the exact same field
 * schema /about does. This scope's state
 * (pages/abstract.tsx's own `abstractTimelineConfig`) is a fully
 * independent instance from /about's — editing one page's panel never
 * touches the other's.
 */
export const ABSTRACT_TIMELINE_PANEL = defineConfigScope<AboutTimelineConfig>({
  id: ABSTRACT_TIMELINE_SCOPE_ID,
  component: 'AboutTimeline',
  scope: 'appearance',
  title: 'Timeline',
  createdAt: '2026-09-01',
  summary: 'Narrow-column article timeline — row gap, marker, rule, alignment, description',
  defaultOpen: false,
  defaultValue: DEFAULT_ABSTRACT_TIMELINE_CONFIG,
  fields: ABOUT_TIMELINE_PANEL_FIELDS,
  copy: {
    targetFile: 'pages/abstract.config.ts',
    targetSymbol: 'DEFAULT_ABSTRACT_TIMELINE_CONFIG',
    targetType: 'AboutTimelineConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
