import { defineConfigScope } from '../../../components/Panel/config';
import { ABOUT_TIMELINE_PANEL_FIELDS } from '../../about/components/AboutTimeline.panel';
import type { AboutTimelineConfig } from '../../about/components/AboutTimeline.config';
import { DEFAULT_FACE_E_TIMELINE_CONFIG } from './FaceETimeline.config';

export const FACE_E_TIMELINE_SCOPE_ID = 'CuboidNavigation/FaceETimeline/appearance' as const;

export const FACE_E_TIMELINE_PANEL = defineConfigScope<AboutTimelineConfig>({
  id: FACE_E_TIMELINE_SCOPE_ID,
  component: 'CuboidNavigationList',
  scope: 'appearance',
  // 'Cuboid Navigation List' (operator ask) — names what this panel
  // actually controls (the reused AboutTimeline component's own marker/
  // rule/copy/spacing/motion knobs, applied to the Home/About/Journal/
  // Contact link list rendered inside the mobile cuboid nav's Face E), not
  // the internal cube-face codename ("Face E Timelline" — also a typo,
  // "Timelline") this scope shipped under. Matches MobileNavCube.panel.ts's
  // own "Cuboid Navigation" title — this is that same nav's link LIST,
  // specifically, not the cuboid shell/motion itself (already that other
  // panel's own scope).
  title: 'Cuboid Navigation List',
  createdAt: '2026-09-11',
  defaultOpen: false,
  summary: 'Marker, rule, copy, spacing, and motion for the mobile nav menu\'s link list',
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
