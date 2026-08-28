/**
 * Configuration for the labs section that appears below the journal on the
 * abstract page. Controls the section background and the matching blend color
 * passed to each lab card.
 *
 * 'surface'     — section has no explicit background; cards blend against the
 *                 page surface color (PageSurfaceConfig.color).
 * 'custom'      — section renders its own solid background; cards match it.
 * 'transparent' — section has no background; cards are also transparent so
 *                 whatever is behind the section shows through the card body.
 */
export type LabSectionBgMode = 'surface' | 'custom' | 'transparent';

export type AbstractLabSectionConfig = {
  backgroundMode: LabSectionBgMode;
  /** Applied when backgroundMode is 'custom'. */
  customBackgroundColor: string;
};

export const DEFAULT_ABSTRACT_LAB_SECTION_CONFIG = {
  backgroundMode: 'surface',
  customBackgroundColor: '#0a0d14',
} satisfies AbstractLabSectionConfig;
