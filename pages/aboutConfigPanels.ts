import { defineConfigScopeRegistry } from '../components/Panel/config';
import { LAYOUT_DEBUG_PANEL, LAYOUT_DEBUG_SCOPE_ID } from '../components/LayoutDebug.panel';
import {
  WORDMARK_PANEL,
  WORDMARK_SCOPE_ID,
} from '../experiences/abstract/components/SiteHeader/config/wordmark.panel';
import {
  ABOUT_PAGE_LAYOUT_PANEL,
  ABOUT_PAGE_LAYOUT_SCOPE_ID,
  ABOUT_TIMELINE_PANEL,
  ABOUT_TIMELINE_SCOPE_ID,
  ABOUT_TOP_SEGMENT_GRADIENT_PANEL,
  ABOUT_TOP_SEGMENT_GRADIENT_SCOPE_ID,
  ABOUT_DOCK_PALETTE_PANEL,
  ABOUT_DOCK_PALETTE_SCOPE_ID,
  ABOUT_DOCK_LAYOUT_PANEL,
  ABOUT_DOCK_LAYOUT_SCOPE_ID,
} from './about.panel';
import {
  ABOUT_MOBILE_ACCORDION_PANEL,
  ABOUT_MOBILE_ACCORDION_SCOPE_ID,
} from '../experiences/about/components/AboutMobileAccordion.panel';

// SiteHeaderColorOverride and ABOUT_POLYMORPHIC_LAYOUT_PANEL have
// no entries here — /about owns a complete, independent instance of each,
// imported directly from their own component-owned .panel.ts files
// (ABOUT_SITE_HEADER_COLOR_OVERRIDE_PANEL from
// ../experiences/abstract/components/SiteHeaderColorOverride.panel.ts,
// ABOUT_POLYMORPHIC_LAYOUT_PANEL from ./about.panel.ts), each imported
// straight into pages/about.tsx) per PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md —
// no registry indirection needed for a scope that's already uniquely
// named per page. LAYOUT_DEBUG_PANEL *is* registered here — unlike those,
// it's a genuinely page-agnostic, single shared instance (component:
// 'LayoutDebug', one scope id for the whole app), the same pattern
// experiences/postsLab/configPanels.ts and
// experiences/abstract/configPanels.ts already use — matches PLAN-SPLIT-
// COLUMN-LAYOUT-ENRICHMENT-EXTRACTION.md's own "layout-debug parity on
// every PolymorphicLayout-integrated page" requirement.
export const aboutConfigPanelRegistry = defineConfigScopeRegistry({
  [ABOUT_PAGE_LAYOUT_SCOPE_ID]: ABOUT_PAGE_LAYOUT_PANEL,
  [ABOUT_MOBILE_ACCORDION_SCOPE_ID]: ABOUT_MOBILE_ACCORDION_PANEL,
  [ABOUT_TIMELINE_SCOPE_ID]: ABOUT_TIMELINE_PANEL,
  [ABOUT_TOP_SEGMENT_GRADIENT_SCOPE_ID]: ABOUT_TOP_SEGMENT_GRADIENT_PANEL,
  [ABOUT_DOCK_PALETTE_SCOPE_ID]: ABOUT_DOCK_PALETTE_PANEL,
  [ABOUT_DOCK_LAYOUT_SCOPE_ID]: ABOUT_DOCK_LAYOUT_PANEL,
  [LAYOUT_DEBUG_SCOPE_ID]: LAYOUT_DEBUG_PANEL,
  [WORDMARK_SCOPE_ID]: WORDMARK_PANEL,
});
