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
    {
      kind: 'group',
      label: 'Typography — Color',
      fields: [
        {
          kind: 'number',
          key: 'minContrastRatio',
          label: 'Target contrast ratio',
          description: 'The WCAG ratio every role\'s shared "ink" color is resolved for (default 4.5, AA normal text). Title/highlight, rendered near-opaque, comfortably clear this; the search is actually calibrated against Body\'s own opacity below, since it has the least headroom.',
          min: 1,
          max: 21,
          step: 0.1,
        },
        {
          kind: 'number',
          key: 'toleranceRatio',
          label: 'AA shortfall tolerance (title / highlight)',
          description: 'Bounded deviation below the target ratio above that Title/Highlight may fall into before the resolver gives up and returns pure black/white. 0 = strict AA, no exceptions.',
          min: 0,
          max: 2,
          step: 0.05,
        },
        {
          kind: 'number',
          key: 'bodyToleranceRatio',
          label: 'AA shortfall tolerance (body)',
          description: 'Body\'s own, wider version of the tolerance above — verified live: Body\'s lower render opacity costs more contrast than Title/Highlight\'s on near-tie-point backgrounds, more than the shared tolerance can cover. Kept separate so Title/Highlight don\'t inherit a deviation they don\'t need.',
          min: 0,
          max: 2,
          step: 0.05,
        },
        {
          kind: 'number',
          key: 'titleOpacity',
          label: 'Title opacity',
          description: 'Headings/wordmark-tier text — header wordmark, hero headline. Applied to the shared resolved ink color, not independently derived.',
          min: 0,
          max: 1,
          step: 0.01,
        },
        {
          kind: 'number',
          key: 'bodyOpacity',
          label: 'Body opacity',
          description: 'Normal/de-emphasized text — hero paragraph, timeline lead-in description, idle timeline rows. Lowest opacity of the three roles, so this is also what the shared ink color\'s own contrast search is calibrated against.',
          min: 0,
          max: 1,
          step: 0.01,
        },
        {
          kind: 'number',
          key: 'highlightOpacity',
          label: 'Highlight opacity',
          description: 'Accent/emphasis text — hero **word** emphasis, inline links, timeline rows while active/hovered. Same token drives all three, so an accent reads the same wherever it appears.',
          min: 0,
          max: 1,
          step: 0.01,
        },
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
