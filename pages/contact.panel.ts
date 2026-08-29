import { definePageConfigScope } from '../components/Panel/config'
import { POLYMORPHIC_LAYOUT_FIELDS } from '../experiences/abstract/components/PolymorphicLayout.panel'
import type { PolymorphicLayoutConfig } from '../experiences/abstract/components/PolymorphicLayout.config'
import { CONTACT_POLYMORPHIC_LAYOUT_CONFIG } from './contact.config'

// /contact's own instance of the shared PolymorphicLayoutConfig field
// structure (components/PolymorphicLayout.panel.ts's own POLYMORPHIC_LAYOUT_FIELDS
// — the identical array reference pages/about.panel.ts and
// pages/posts-lab/postLab.panel.ts already use, not a filtered/rebuilt
// subset). definePageConfigScope (not the plain defineConfigScope), same
// reasoning as ABOUT_POLYMORPHIC_LAYOUT_PANEL (pages/about.panel.ts) —
// PolymorphicLayoutConfig is genuinely shared by multiple pages, each with
// its own independent defaultValue. component/title copied verbatim from
// about's own scope (not page-prefixed) — reads at a glance as "this page
// runs on the shared system," matching that precedent exactly.
export const CONTACT_POLYMORPHIC_LAYOUT_PANEL = definePageConfigScope<PolymorphicLayoutConfig>({
  component: 'SplitColumnLayout',
  scope: 'layout',
  pageName: 'Contact',
  title: 'Polymorphic Layout',
  createdAt: '2026-08-17',
  summary: 'Content container, column split, color source, header split band',
  defaultOpen: false,
  fields: POLYMORPHIC_LAYOUT_FIELDS,
  defaultValue: CONTACT_POLYMORPHIC_LAYOUT_CONFIG,
  targetFile: 'pages/contact.config.ts',
  targetSymbol: 'CONTACT_POLYMORPHIC_LAYOUT_CONFIG',
  targetType: 'PolymorphicLayoutConfig',
})
