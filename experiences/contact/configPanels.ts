import { defineConfigScopeRegistry } from '../../components/Panel/config';
import {
  CTA_BUTTON_APPEARANCE_PANEL,
  CTA_BUTTON_APPEARANCE_SCOPE_ID,
} from '../../components/CtaButton/config/panel';
import {
  PAGE_SURFACE_APPEARANCE_PANEL,
  PAGE_SURFACE_APPEARANCE_SCOPE_ID,
} from '../../components/PageSurface.panel';
import {
  SITE_HEADER_COLORS_PANEL,
  SITE_HEADER_COLORS_SCOPE_ID,
} from '../abstract/components/SiteHeader/config/panel';
import {
  CONTACT_EXPERIENCE_PANEL,
  CONTACT_EXPERIENCE_SCOPE_ID,
} from './ContactExperience.panel';
import {
  CONTACT_DEV_MODE_PANEL,
  CONTACT_DEV_MODE_SCOPE_ID,
} from './ContactDevMode.panel'
import { LAYOUT_DEBUG_PANEL, LAYOUT_DEBUG_SCOPE_ID } from '../../components/LayoutDebug.panel';;

// SiteHeaderColorOverride and CtaButtonColorOverride have no
// entries here — /contact owns a complete, independent instance of each,
// imported directly from their own component-owned .panel.ts files
// (CONTACT_SITE_HEADER_COLOR_OVERRIDE_PANEL from
// ../../components/SiteHeaderColorOverride.panel.ts,
// CONTACT_CTA_BUTTON_COLOR_OVERRIDE_PANEL from
// ../../components/CtaButton/config/colorOverride.panel.ts, each imported
// straight into pages/contact.tsx) per PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md
// — no registry indirection needed for a scope that's already uniquely
// named per page.

// Re-registers scopes already authored elsewhere (CtaButton, PageSurface,
// SiteHeader) under contact's own experience registry — same PANEL
// objects, not forked copies, so contact.tsx can render the exact same
// abstract.tsx aesthetics through its own panel without a second definition
// of any of them existing anywhere.
export const contactConfigPanelRegistry = defineConfigScopeRegistry({
  [CONTACT_EXPERIENCE_SCOPE_ID]: CONTACT_EXPERIENCE_PANEL,
  [CONTACT_DEV_MODE_SCOPE_ID]: CONTACT_DEV_MODE_PANEL,
  [PAGE_SURFACE_APPEARANCE_SCOPE_ID]: PAGE_SURFACE_APPEARANCE_PANEL,
  [CTA_BUTTON_APPEARANCE_SCOPE_ID]: CTA_BUTTON_APPEARANCE_PANEL,
  [SITE_HEADER_COLORS_SCOPE_ID]: SITE_HEADER_COLORS_PANEL,
  [LAYOUT_DEBUG_SCOPE_ID]: LAYOUT_DEBUG_PANEL,
});
