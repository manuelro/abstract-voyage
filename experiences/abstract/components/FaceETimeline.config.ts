import {
  DEFAULT_ABOUT_TIMELINE_CONFIG,
  normalizeAboutTimelineConfig,
  type AboutTimelineConfig,
} from '../../about/components/AboutTimeline.config';

/** Dedicated visual configuration for the navigation timeline on cuboid
 * Face E. It shares the production timeline primitive without coupling the
 * navigation's tuning to the article or career timeline instances. */
export const DEFAULT_FACE_E_TIMELINE_CONFIG: AboutTimelineConfig = normalizeAboutTimelineConfig({
  ...DEFAULT_ABOUT_TIMELINE_CONFIG,
  maxWidthClassName: 'max-w-2xl',
  maxActiveRows: 1,
  rowGap: 'gap-8',
  markerSizeClassName: 'w-3 h-3',
  markerColorMode: 'text',
  markerGradientEnabled: false,
  markerIdleOpacity: 0.2,
  markerActiveOpacity: 1,
  ruleVisible: true,
  rowTitleFontSizeClassName: 'text-xl',
  rowDescriptionFontSizeClassName: 'text-sm',
  rowTitleOpacityInactive: 0.58,
  rowDescriptionOpacityInactive: 0.48,
  rowDescriptionOpacityActive: 0.78,
  hoverDelayMs: 80,
  descriptionVisible: false,
  description: '',
  descriptionWide: '',
  descriptionLg: '',
  transitionDurationMs: 280,
});

export { normalizeAboutTimelineConfig as normalizeFaceETimelineConfig };
export type FaceETimelineConfig = AboutTimelineConfig;
