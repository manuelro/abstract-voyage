import { defineConfigScope, definePageConfigScope } from '../components/Panel/config';
import { POLYMORPHIC_LAYOUT_FIELDS } from '../experiences/abstract/components/PolymorphicLayout.panel';
import type { PolymorphicLayoutConfig } from '../experiences/abstract/components/PolymorphicLayout.config';
import {
  ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG,
  DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG,
  DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG,
  type AbstractNarrowColumnStackConfig,
  type AbstractPageLayoutConfig,
} from './abstract.config';

export const ABSTRACT_PAGE_LAYOUT_SCOPE_ID = 'AbstractPage/layout' as const;
export const ABSTRACT_NARROW_COLUMN_STACK_SCOPE_ID = 'AbstractPage/narrowColumnStack' as const;

// /abstract's own instance of the shared PolymorphicLayoutConfig field
// structure (components/PolymorphicLayout.panel.ts's own
// POLYMORPHIC_LAYOUT_FIELDS — the identical array reference pages/about.panel.ts
// and pages/posts-lab/postLab.panel.ts already use for their own scopes, not
// a filtered/rebuilt copy). definePageConfigScope (not the plain
// defineConfigScope ABSTRACT_PAGE_LAYOUT_PANEL below uses) because
// PolymorphicLayoutConfig is now shared by three pages — see that helper's
// own doc comment. Replaces components/SplitColumnLayout.panel.ts's own
// ABSTRACT_SPLIT_COLUMN_LAYOUT_PANEL, which is now dead — abstract.tsx edits
// these fields from this scope instead. Titled exactly "Polymorphic
// Layout" — the same generic name every PolymorphicLayoutConfig-integrated
// page uses, so it reads at a glance as "this page runs on the shared
// system."
export const ABSTRACT_POLYMORPHIC_LAYOUT_PANEL = definePageConfigScope<PolymorphicLayoutConfig>({
  component: 'SplitColumnLayout',
  scope: 'layout',
  pageName: 'Abstract',
  title: 'Polymorphic Layout',
  createdAt: '2026-08-17',
  summary: 'Content container, column split, color source, header split band',
  defaultOpen: false,
  fields: POLYMORPHIC_LAYOUT_FIELDS,
  defaultValue: ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG,
  // Same fix as ABOUT_POLYMORPHIC_LAYOUT_PANEL (pages/about.panel.ts) —
  // pages/abstract.config.ts only re-exports this object (PLAN-POLYMORPHIC-
  // LAYOUT-PAGE-CONFIG-PARITY.md moved the real definition here); a
  // component-config-update payload targeting the old file has nothing to
  // patch and silently fails to persist.
  targetFile: 'experiences/abstract/components/PolymorphicLayout.pageConfigs.ts',
  targetSymbol: 'ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG',
  targetType: 'PolymorphicLayoutConfig',
});

export const ABSTRACT_PAGE_LAYOUT_PANEL = defineConfigScope<AbstractPageLayoutConfig>({
  id: ABSTRACT_PAGE_LAYOUT_SCOPE_ID,
  component: 'AbstractPage',
  scope: 'layout',
  title: 'Abstract page presentation',
  createdAt: '2026-08-07',
  summary: 'Split-column (new) vs. classic',
  defaultOpen: false,
  defaultValue: DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG,
  fields: [
    {
      kind: 'enum',
      key: 'presentationMode',
      label: 'Presentation',
      description: 'Split column (default): the new stacked-hero + single-card-preview layout. Classic: today\'s splitRow hero + full Journal/Labs tabbed collection, kept fully working as a fallback.',
      options: [
        { label: 'SPLIT COLUMN', value: 'splitColumn' },
        { label: 'CLASSIC', value: 'classic' },
      ],
    },
  ],
  copy: {
    targetFile: 'pages/abstract.config.ts',
    targetSymbol: 'DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG',
    targetType: 'AbstractPageLayoutConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});

const HORIZONTAL_ALIGN_OPTIONS = [
  { label: 'START', value: 'start' },
  { label: 'CENTER', value: 'center' },
  { label: 'END', value: 'end' },
  { label: 'STRETCH', value: 'stretch' },
] as const;
const VERTICAL_ALIGN_OPTIONS = [
  { label: 'START', value: 'start' },
  { label: 'CENTER', value: 'center' },
  { label: 'END', value: 'end' },
] as const;

export const ABSTRACT_NARROW_COLUMN_STACK_PANEL = defineConfigScope<AbstractNarrowColumnStackConfig>({
  id: ABSTRACT_NARROW_COLUMN_STACK_SCOPE_ID,
  component: 'AbstractNarrowColumnStack',
  scope: 'layout',
  title: 'Narrow column stack',
  createdAt: '2026-09-01',
  summary: 'Top and bottom region proportions and content alignment',
  defaultOpen: false,
  defaultValue: DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG,
  fields: [
    {
      kind: 'group',
      label: 'Region proportions',
      fields: [
        {
          kind: 'number',
          key: 'topRegionPercent',
          label: 'Top region weight',
          description: 'Top region share of the available height. The top and bottom values are normalized as relative weights so the stack always fills its parent.',
          min: 1,
          max: 99,
          step: 1,
        },
        {
          kind: 'number',
          key: 'bottomRegionPercent',
          label: 'Bottom region weight',
          description: 'Bottom region share of the available height. Defaults to 62 against the top region\'s 38.',
          min: 1,
          max: 99,
          step: 1,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Top content',
      fields: [
        {
          kind: 'enum',
          key: 'topHorizontalAlign',
          label: 'Horizontal alignment',
          options: HORIZONTAL_ALIGN_OPTIONS,
        },
        {
          kind: 'enum',
          key: 'topVerticalAlign',
          label: 'Vertical alignment',
          options: VERTICAL_ALIGN_OPTIONS,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Bottom content',
      fields: [
        {
          kind: 'enum',
          key: 'bottomHorizontalAlign',
          label: 'Horizontal alignment',
          options: HORIZONTAL_ALIGN_OPTIONS,
        },
        {
          kind: 'enum',
          key: 'bottomVerticalAlign',
          label: 'Vertical alignment',
          options: VERTICAL_ALIGN_OPTIONS,
        },
      ],
    },
  ],
  copy: {
    targetFile: 'pages/abstract.config.ts',
    targetSymbol: 'DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG',
    targetType: 'AbstractNarrowColumnStackConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
