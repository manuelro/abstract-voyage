import type { ConfigScopeEntry } from './Panel/config';
import { defineConfigScope } from './Panel/config';
import { DEFAULT_LAYOUT_DEBUG_CONFIG, type LayoutDebugConfig } from './LayoutDebug.config';

export const LAYOUT_DEBUG_SCOPE_ID = 'LayoutDebug/overlay' as const;

export const LAYOUT_DEBUG_FIELDS: ReadonlyArray<ConfigScopeEntry<LayoutDebugConfig>> = [
  {
    kind: 'boolean',
    key: 'enabled',
    label: 'Show layout boundaries',
    description: 'Overlays vivid, labeled boxes on the split layout\'s columns and content boxes — DevTools-style, off by default. Purely cosmetic: pointer-events-none, adds no layout of its own.',
  },
];

export const LAYOUT_DEBUG_PANEL = defineConfigScope<LayoutDebugConfig>({
  id: LAYOUT_DEBUG_SCOPE_ID,
  component: 'LayoutDebug',
  scope: 'overlay',
  title: 'Layout debug',
  createdAt: '2026-08-12',
  summary: 'Highlights split-column boundaries — off by default',
  defaultOpen: false,
  defaultValue: DEFAULT_LAYOUT_DEBUG_CONFIG,
  fields: LAYOUT_DEBUG_FIELDS,
  copy: {
    targetFile: 'components/LayoutDebug.config.ts',
    targetSymbol: 'DEFAULT_LAYOUT_DEBUG_CONFIG',
    targetType: 'LayoutDebugConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
