import { defineConfigScope } from '../../../components/Panel/config';
import { ABOUT_TIMELINE_PANEL_FIELDS } from '../../about/components/AboutTimeline.panel';
import type { AboutTimelineConfig } from '../../about/components/AboutTimeline.config';
import { DEFAULT_FACE_E_TIMELINE_CONFIG } from './FaceETimeline.config';

export const FACE_E_TIMELINE_SCOPE_ID = 'CuboidNavigation/FaceETimeline/appearance' as const;

export const FACE_E_TIMELINE_PANEL = defineConfigScope<AboutTimelineConfig>({
  id: FACE_E_TIMELINE_SCOPE_ID,
  component: 'FaceENavigationTimeline',
  scope: 'appearance',
  title: 'Face E Timelline',
  createdAt: '2026-09-11',
  defaultOpen: false,
  summary: 'Face E navigation marker, rule, copy, spacing, and motion',
  defaultValue: DEFAULT_FACE_E_TIMELINE_CONFIG,
  fields: ABOUT_TIMELINE_PANEL_FIELDS,
  copy: {
    targetFile: 'experiences/abstract/components/FaceETimeline.config.ts',
    targetSymbol: 'DEFAULT_FACE_E_TIMELINE_CONFIG',
    targetType: 'AboutTimelineConfig',
    updateStrategy: 'merge',
    completeScope: false,
  },
});
