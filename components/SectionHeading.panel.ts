import { defineConfigScope } from './Panel/config';
import {
  DEFAULT_SECTION_HEADING_CONFIG,
  type SectionHeadingConfig,
} from './SectionHeading.config';
import {
  INDENT_OPTIONS,
  MARGIN_BOTTOM_OPTIONS,
  MARGIN_TOP_OPTIONS,
  PADDING_X_OPTIONS,
  PADDING_Y_OPTIONS,
} from './tailwindSpacingScale';

export const SECTION_HEADING_APPEARANCE_SCOPE_ID = 'SectionHeading/appearance' as const;

export const SECTION_HEADING_APPEARANCE_PANEL = defineConfigScope<SectionHeadingConfig>({
  id: SECTION_HEADING_APPEARANCE_SCOPE_ID,
  component: 'SectionHeading',
  scope: 'appearance',
  title: 'Section heading',
  createdAt: '2026-07-21',
  summary: 'Plain text label used above a section\'s content',
  defaultOpen: false,
  defaultValue: DEFAULT_SECTION_HEADING_CONFIG,
  fields: [
    {
      kind: 'enum',
      key: 'align',
      label: 'Alignment',
      options: [
        { label: 'LEFT', value: 'left' },
        { label: 'CENTER', value: 'center' },
        { label: 'RIGHT', value: 'right' },
      ],
    },
    {
      kind: 'enum',
      key: 'fontSize',
      label: 'Font size (mobile)',
      description: 'Applies below the md breakpoint (768px).',
      options: [
        { label: 'xs', value: 'text-xs' },
        { label: 'sm', value: 'text-sm' },
        { label: 'base', value: 'text-base' },
        { label: 'lg', value: 'text-lg' },
        { label: 'xl', value: 'text-xl' },
        { label: '2xl', value: 'text-2xl' },
      ],
    },
    {
      kind: 'enum',
      key: 'fontSizeDesktop',
      label: 'Font size (desktop)',
      description: 'Overrides the mobile font size from md (768px) up.',
      options: [
        { label: 'xs', value: 'md:text-xs' },
        { label: 'sm', value: 'md:text-sm' },
        { label: 'base', value: 'md:text-base' },
        { label: 'lg', value: 'md:text-lg' },
        { label: 'xl', value: 'md:text-xl' },
        { label: '2xl', value: 'md:text-2xl' },
      ],
    },
    {
      kind: 'enum',
      key: 'fontFamily',
      label: 'Heading font',
      description: 'Inherit (default) follows the site-wide Global typography setting. Sans/Serif pin this label regardless of that setting.',
      options: [
        { label: 'INHERIT', value: 'inherit' },
        { label: 'SANS', value: 'sans' },
        { label: 'SERIF', value: 'serif' },
      ],
    },
    {
      kind: 'color',
      key: 'color',
      label: 'Text color',
    },
    {
      kind: 'number',
      key: 'letterSpacingEm',
      label: 'Letter spacing',
      min: 0,
      max: 1,
      step: 0.01,
      unit: 'em',
    },
    {
      kind: 'select',
      key: 'textIndent',
      label: 'Text indentation',
      description: 'Tailwind\'s own indent scale — every default step, not a curated subset.',
      options: INDENT_OPTIONS,
    },
    {
      kind: 'select',
      key: 'paddingX',
      label: 'Padding (horizontal)',
      description: 'Tailwind\'s own spacing scale — every default step, not a curated subset.',
      options: PADDING_X_OPTIONS,
    },
    {
      kind: 'select',
      key: 'paddingY',
      label: 'Padding (vertical)',
      description: 'Tailwind\'s own spacing scale — every default step, not a curated subset.',
      options: PADDING_Y_OPTIONS,
    },
    {
      kind: 'select',
      key: 'marginTop',
      label: 'Margin (top)',
      description: 'Tailwind\'s own spacing scale — every default step, not a curated subset.',
      options: MARGIN_TOP_OPTIONS,
    },
    {
      kind: 'select',
      key: 'marginBottom',
      label: 'Margin (bottom)',
      description: 'Tailwind\'s own spacing scale — every default step, not a curated subset.',
      options: MARGIN_BOTTOM_OPTIONS,
    },
  ],
  copy: {
    targetFile: 'components/SectionHeading.config.ts',
    targetSymbol: 'DEFAULT_SECTION_HEADING_CONFIG',
    targetType: 'SectionHeadingConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
