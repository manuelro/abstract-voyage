import type { ConfigScopeEntry } from '../../../../../components/Panel/config';
import { defineConfigScope } from '../../../../../components/Panel/config';
import {
  ABOUT_SITE_HEADER_COLOR_OVERRIDE_CONFIG,
  ABSTRACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG,
  CONTACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG,
  POSTS_LAB_SITE_HEADER_COLOR_OVERRIDE_CONFIG,
  type SiteHeaderColorOverrideConfig,
} from './colorOverride';
import { SITE_HEADER_COLOR_FIELDS } from './panel';

// A ConfigFieldGroup's own `fields` type only accepts leaf fields, never a
// nested group (see ConfigFieldGroup in components/Panel/config/types.ts) —
// and the renderer's own flattening (defineConfigScope.ts's
// getRuntimeFields) only unwraps one level of `kind: 'group'` too. So
// SITE_HEADER_COLOR_FIELDS (a leaf field plus two groups) has to sit at
// this scope's own top level, not nested inside a wrapping "enabled" group
// — each entry's own visibleWhen is combined with config.enabled here
// instead, so the whole set collapses to nothing when the override is off.
function gateByEnabled(
  fields: ReadonlyArray<ConfigScopeEntry<SiteHeaderColorOverrideConfig>>,
): ConfigScopeEntry<SiteHeaderColorOverrideConfig>[] {
  return fields.map(field => ({
    ...field,
    visibleWhen: (config: Readonly<SiteHeaderColorOverrideConfig>) => (
      config.enabled && (field.visibleWhen ? field.visibleWhen(config) : true)
    ),
  }));
}

/**
 * Per-page override of SiteHeaderConfig's color fields — see
 * SiteHeaderColorOverride.config.ts's own doc comment for the
 * per-page config ownership model this implements
 * (PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md). Each page (about/abstract/contact)
 * calls this factory with its own complete config literal from that file
 * (e.g. CONTACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG) and its own matching
 * `targetSymbol` — never the same `defaultValue`/copy target for two
 * pages, which is what previously let a "COPY" from one page's panel,
 * applied back into source, silently become every other page's resting
 * state too. The returned scope is a plain top-level export the owning
 * page imports directly — not registered in an experience-level registry,
 * same "already uniquely named per page, gets nothing from .resolve(id)"
 * reasoning as every other per-page-owned scope in this codebase.
 */
export function createSiteHeaderColorOverridePanel(
  pageName: string,
  defaultValue: SiteHeaderColorOverrideConfig,
  targetSymbol: string,
) {
  // Same field objects HERO_HEADER_COLORS_PANEL's own "Header color
  // mode"/"Custom colors"/"Surface-derived colors" fields already are (see
  // SITE_HEADER_COLOR_FIELDS's own doc comment in SiteHeader.panel.ts)
  // — SiteHeaderColorOverrideConfig is field-for-field identical to
  // the subset of SiteHeaderConfig those fields describe (colorMode,
  // logoColor, navTextColor, navBorderColor, and the three *SurfaceOffset
  // numbers), so every key/visibleWhen in the reused array reads/matches
  // real fields on this config too. The cast exists only to satisfy
  // ConfigFieldDefinition's own per-TConfig key/visibleWhen typing — not
  // because the runtime shape actually differs.
  const colorFields = SITE_HEADER_COLOR_FIELDS as unknown as ReadonlyArray<
    ConfigScopeEntry<SiteHeaderColorOverrideConfig>
  >;

  return defineConfigScope<SiteHeaderColorOverrideConfig>({
    id: `SiteHeaderColorOverride/${pageName}`,
    component: 'SiteHeader',
    scope: `colorOverride:${pageName}`,
    title: `${pageName} header colors`,
    createdAt: '2026-08-09',
    summary: 'Per-page override of the shared header color foundation',
    defaultOpen: false,
    defaultValue,
    // logoColor/logoSurfaceOffset: same reasoning as SITE_HEADER_COLOR_FIELDS's
    // own HEADER_LAYOUT_KEYS_OWNED_ELSEWHERE entry for these two keys
    // (panel.ts) — moved to the shared Wordmark panel, still present on
    // this config's own type only as the legacy value a page that hasn't
    // migrated to `wordmarkConfig` gets.
    hiddenKeys: ['logoColor', 'logoSurfaceOffset'],
    fields: [
      {
        kind: 'boolean',
        key: 'enabled',
        label: `Override on ${pageName}`,
        description: 'Off (default): this page inherits the shared header color foundation (set in "Site header" above) exactly like every other page. On: the fields below apply only to this page.',
      },
      ...gateByEnabled(colorFields),
    ],
    copy: {
      targetFile: 'experiences/abstract/components/SiteHeader/config/colorOverride.ts',
      targetSymbol,
      targetType: 'SiteHeaderColorOverrideConfig',
      updateStrategy: 'replace_scope',
      completeScope: true,
    },
  });
}

// Per-page config ownership (PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md) — one
// instance per consuming page, constructed here (not inline at each page's
// own registry/call site) so every instance's defaultValue/targetSymbol
// pairing is visible in one place and machine-checkable — see
// SiteHeaderColorOverride.pageConfigs.test.ts. Plain top-level
// exports; each owning page imports its own directly.
export const ABOUT_SITE_HEADER_COLOR_OVERRIDE_PANEL = createSiteHeaderColorOverridePanel(
  'About',
  ABOUT_SITE_HEADER_COLOR_OVERRIDE_CONFIG,
  'ABOUT_SITE_HEADER_COLOR_OVERRIDE_CONFIG',
);
export const CONTACT_SITE_HEADER_COLOR_OVERRIDE_PANEL = createSiteHeaderColorOverridePanel(
  'Contact',
  CONTACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG,
  'CONTACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG',
);
export const ABSTRACT_SITE_HEADER_COLOR_OVERRIDE_PANEL = createSiteHeaderColorOverridePanel(
  'Abstract',
  ABSTRACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG,
  'ABSTRACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG',
);
export const POSTS_LAB_SITE_HEADER_COLOR_OVERRIDE_PANEL = createSiteHeaderColorOverridePanel(
  'Posts Lab',
  POSTS_LAB_SITE_HEADER_COLOR_OVERRIDE_CONFIG,
  'POSTS_LAB_SITE_HEADER_COLOR_OVERRIDE_CONFIG',
);
