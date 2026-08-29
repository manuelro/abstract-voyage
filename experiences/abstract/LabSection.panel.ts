import { defineConfigScope } from '../../components/Panel/config';
import {
  DEFAULT_ABSTRACT_LAB_SECTION_CONFIG,
  type AbstractLabSectionConfig,
} from './LabSection.config';

export const ABSTRACT_LAB_SECTION_APPEARANCE_SCOPE_ID =
  'AbstractLabSection/appearance' as const;

export const ABSTRACT_LAB_SECTION_APPEARANCE_PANEL =
  defineConfigScope<AbstractLabSectionConfig>({
    id: ABSTRACT_LAB_SECTION_APPEARANCE_SCOPE_ID,
    component: 'AbstractLabSection',
    scope: 'appearance',
    title: 'Labs section',
    createdAt: '2026-07-27',
    summary: 'Background · card blend color',
    defaultOpen: false,
    defaultValue: DEFAULT_ABSTRACT_LAB_SECTION_CONFIG,
    fields: [
      {
        kind: 'enum',
        key: 'backgroundMode',
        label: 'Section background',
        description:
          'SURFACE: section is transparent, cards blend against the page surface color. CUSTOM: section and cards share a custom solid color. TRANSPARENT: section and cards are fully transparent — shows whatever is behind the section.',
        options: [
          { label: 'SURFACE', value: 'surface' },
          { label: 'CUSTOM', value: 'custom' },
          { label: 'TRANSPARENT', value: 'transparent' },
        ],
      },
      {
        kind: 'color',
        key: 'customBackgroundColor',
        label: 'Color',
        visibleWhen: config => config.backgroundMode === 'custom',
      },
    ],
    copy: {
      targetFile: 'experiences/abstract/LabSection.config.ts',
      targetSymbol: 'DEFAULT_ABSTRACT_LAB_SECTION_CONFIG',
      targetType: 'AbstractLabSectionConfig',
      updateStrategy: 'replace_scope',
      completeScope: true,
    },
  });
