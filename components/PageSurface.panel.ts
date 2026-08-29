import { defineConfigScope } from './Panel/config';
import {
  DEFAULT_PAGE_SURFACE_CONFIG,
  type PageSurfaceConfig,
} from './PageSurface.config';

export const PAGE_SURFACE_APPEARANCE_SCOPE_ID = 'PageSurface/appearance' as const;

export const PAGE_SURFACE_APPEARANCE_PANEL = defineConfigScope<PageSurfaceConfig>({
  id: PAGE_SURFACE_APPEARANCE_SCOPE_ID,
  component: 'PageSurface',
  scope: 'appearance',
  title: 'Page surface',
  createdAt: '2026-07-21',
  summary: 'Background color · shared max-width cap',
  defaultOpen: false,
  defaultValue: DEFAULT_PAGE_SURFACE_CONFIG,
  fields: [
    {
      kind: 'color',
      key: 'color',
      label: 'Editorial surface',
      description: 'Also the headline\'s default color while Headline fill is SURFACE (see the Headline color group) — and the accent color threaded into the cards section below.',
    },
    {
      kind: 'boolean',
      key: 'maxWidthEnabled',
      label: 'Cap page width on large screens',
      description: 'Caps the hero content row, the top nav, and the cards below to one shared max width — so all three read as one consistent column instead of drifting to independent widths on very wide viewports. Never narrows anything below this width.',
    },
    {
      kind: 'number',
      key: 'maxWidthPx',
      label: 'Max width',
      description: 'Shared by the hero, the top nav, and the cards/journal section.',
      min: 960,
      max: 1920,
      step: 10,
      unit: 'px',
      integer: true,
      visibleWhen: config => config.maxWidthEnabled,
    },
  ],
  copy: {
    targetFile: 'components/PageSurface.config.ts',
    targetSymbol: 'DEFAULT_PAGE_SURFACE_CONFIG',
    targetType: 'PageSurfaceConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
