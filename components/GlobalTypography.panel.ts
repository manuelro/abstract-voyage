import { defineConfigScope } from './Panel/config';
import {
  DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG,
  type GlobalTypographyConfig,
} from './GlobalTypography.config';

export const GLOBAL_TYPOGRAPHY_APPEARANCE_SCOPE_ID = 'GlobalTypography/appearance' as const;

export const GLOBAL_TYPOGRAPHY_APPEARANCE_PANEL = defineConfigScope<GlobalTypographyConfig>({
  id: GLOBAL_TYPOGRAPHY_APPEARANCE_SCOPE_ID,
  component: 'GlobalTypography',
  scope: 'appearance',
  title: 'Global typography',
  createdAt: '2026-08-10',
  summary: 'Site-wide default heading font — components can still opt out individually',
  defaultOpen: false,
  defaultValue: DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG,
  fields: [
    {
      kind: 'enum',
      key: 'headingFontFamily',
      label: 'Heading font',
      description: 'Default for every heading site-wide (PageTitle, SectionHeading, FiberHeading, AbstractEditorialHero, SiteHeader) unless a component\'s own font family is set to something other than "Inherit".',
      options: [
        { label: 'SANS', value: 'sans' },
        { label: 'SERIF', value: 'serif' },
      ],
    },
  ],
  copy: {
    targetFile: 'components/GlobalTypography.config.ts',
    targetSymbol: 'DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG',
    targetType: 'GlobalTypographyConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
