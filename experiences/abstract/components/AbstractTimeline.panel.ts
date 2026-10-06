import { defineConfigScope } from '../../../components/Panel/config';
import { ABOUT_TIMELINE_PANEL_FIELDS } from '../../about/components/AboutTimeline.panel';
import { DEFAULT_ABSTRACT_TIMELINE_CONFIG, type AbstractTimelineConfig } from '../../../pages/abstract.config';

export const ABSTRACT_TIMELINE_SCOPE_ID = 'AboutTimeline/abstract-appearance' as const;

/**
 * Abstract reuses the shared Timeline field list and adds its own mobile
 * expanded-list gesture controls. Its page-owned config remains independent
 * from /about's Timeline instance.
 */
export const ABSTRACT_TIMELINE_PANEL = defineConfigScope<AbstractTimelineConfig>({
  id: ABSTRACT_TIMELINE_SCOPE_ID,
  component: 'AboutTimeline',
  scope: 'appearance',
  title: 'Timeline',
  createdAt: '2026-09-01',
  summary: 'Article timeline appearance and mobile expanded-list gesture',
  defaultOpen: false,
  defaultValue: DEFAULT_ABSTRACT_TIMELINE_CONFIG,
  fields: [
    ...ABOUT_TIMELINE_PANEL_FIELDS,
    {
      kind: 'group',
      label: 'Mobile expanded list',
      fields: [
        {
          kind: 'boolean', key: 'mobileExpandedDragDownEnabled', label: 'Drag down to close',
          description: 'A downward pull that begins at the top of the expanded list closes it on release. Scrolling inside a longer list remains available.',
        },
        {
          kind: 'number', key: 'mobileExpandedDragDownThresholdPx', label: 'Close drag distance',
          description: 'Minimum downward distance before releasing the gesture closes the list.',
          min: 32, max: 240, step: 8, unit: 'px', integer: true,
          visibleWhen: config => config.mobileExpandedDragDownEnabled,
        },
      ],
    },
  ],
  copy: {
    targetFile: 'pages/abstract.config.ts',
    targetSymbol: 'DEFAULT_ABSTRACT_TIMELINE_CONFIG',
    targetType: 'AbstractTimelineConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
