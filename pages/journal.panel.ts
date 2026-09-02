import { defineConfigScope, definePageConfigScope } from '../components/Panel/config'
import { ABOUT_TIMELINE_PANEL_FIELDS } from '../experiences/about/components/AboutTimeline.panel'
import type { AboutTimelineConfig } from '../experiences/about/components/AboutTimeline.config'
import { CARD_APPEARANCE_PANEL } from '../experiences/abstract/components/Card/config/appearance.panel'
import type { CardAppearanceConfig } from '../experiences/abstract/components/Card/config/appearance'
import { POLYMORPHIC_LAYOUT_FIELDS } from '../experiences/abstract/components/PolymorphicLayout.panel'
import type { PolymorphicLayoutConfig } from '../experiences/abstract/components/PolymorphicLayout.config'
import {
  DEFAULT_JOURNAL_CARD_APPEARANCE_CONFIG,
  DEFAULT_JOURNAL_TIMELINE_CONFIG,
  JOURNAL_POLYMORPHIC_LAYOUT_CONFIG,
} from './journal.config'

export const JOURNAL_TIMELINE_SCOPE_ID = 'Journal/AboutTimeline/appearance' as const
export const JOURNAL_TIMELINE_PANEL = defineConfigScope<AboutTimelineConfig>({
  id: JOURNAL_TIMELINE_SCOPE_ID,
  component: 'AboutTimeline',
  scope: 'appearance',
  title: 'Timeline',
  createdAt: '2026-09-02',
  defaultOpen: false,
  summary: 'Article timeline spacing, marker, rule, alignment, and motion',
  defaultValue: DEFAULT_JOURNAL_TIMELINE_CONFIG,
  fields: ABOUT_TIMELINE_PANEL_FIELDS,
  copy: { targetFile: 'pages/journal.config.ts', targetSymbol: 'DEFAULT_JOURNAL_TIMELINE_CONFIG', targetType: 'AboutTimelineConfig', updateStrategy: 'merge', completeScope: false },
})

export const JOURNAL_CARD_APPEARANCE_SCOPE_ID = 'Journal/Card/appearance' as const
export const JOURNAL_CARD_APPEARANCE_PANEL = defineConfigScope<CardAppearanceConfig>({
  id: JOURNAL_CARD_APPEARANCE_SCOPE_ID,
  component: 'Card',
  scope: 'appearance',
  title: 'Card Appearance',
  createdAt: '2026-09-02',
  defaultOpen: false,
  summary: 'Shared card surface, ink, and visual transitions',
  defaultValue: DEFAULT_JOURNAL_CARD_APPEARANCE_CONFIG,
  fields: CARD_APPEARANCE_PANEL.fields,
  copy: { targetFile: 'pages/journal.config.ts', targetSymbol: 'DEFAULT_JOURNAL_CARD_APPEARANCE_CONFIG', targetType: 'CardAppearanceConfig', updateStrategy: 'merge', completeScope: false },
})

export const JOURNAL_POLYMORPHIC_LAYOUT_PANEL = definePageConfigScope<PolymorphicLayoutConfig>({
  component: 'SplitColumnLayout',
  scope: 'layout',
  pageName: 'Journal',
  title: 'Polymorphic Layout',
  createdAt: '2026-09-02',
  defaultOpen: false,
  summary: 'Journal column split, content containers, and centered mode',
  fields: POLYMORPHIC_LAYOUT_FIELDS,
  defaultValue: JOURNAL_POLYMORPHIC_LAYOUT_CONFIG,
  targetFile: 'pages/journal.config.ts',
  targetSymbol: 'JOURNAL_POLYMORPHIC_LAYOUT_CONFIG',
  targetType: 'PolymorphicLayoutConfig',
})
