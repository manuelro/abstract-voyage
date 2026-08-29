import { defineConfigScope } from '../../Panel/config';
import {
  ABSTRACT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG,
  CONTACT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG,
  type CtaButtonColorOverrideConfig,
} from './colorOverride';

/**
 * Per-page override of CtaButtonConfig's color fields — see
 * colorOverride.ts's own doc comment for the per-page config ownership
 * model this implements (PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md). Each page
 * (/abstract, /contact — /about doesn't use this scope) calls this factory
 * with its own complete config literal from that file (e.g.
 * CONTACT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG) and its own matching
 * `targetSymbol` — never the same `defaultValue`/copy target for two
 * pages, which is what previously let a "COPY" from one page's panel,
 * applied back into source, silently become every other page's resting
 * state too (see SiteHeaderColorOverride's own sibling scope,
 * where this actually happened). The returned scope is a plain top-level
 * export the owning page imports directly — not registered in an
 * experience-level registry.
 *
 * Field definitions here are deliberately fresh, not reused from
 * CTA_BUTTON_APPEARANCE_PANEL (components/CtaButton/config/panel.ts) —
 * unlike SiteHeaderColorOverride.panel.ts's SITE_HEADER_COLOR_FIELDS
 * reuse, CtaButtonConfig's color fields aren't isolated into their own
 * group there (backgroundColorMode/backgroundColor live in "Surface" next
 * to unrelated fields like backgroundMode/radius; borderColorMode/
 * borderColor live in "Border" next to borderWidth/gradient fields) — so
 * extracting them would mean restructuring that already-shipped panel's
 * grouping, out of scope here. Labels/ranges below are kept in sync with
 * their counterparts by hand; there are only 11 fields.
 */
export function createCtaButtonColorOverridePanel(
  pageName: string,
  defaultValue: CtaButtonColorOverrideConfig,
  targetSymbol: string,
) {
  return defineConfigScope<CtaButtonColorOverrideConfig>({
    id: `CtaButtonColorOverride/${pageName}`,
    component: 'CtaButton',
    scope: `colorOverride:${pageName}`,
    title: `${pageName} CTA colors`,
    createdAt: '2026-08-09',
    summary: 'Per-page override of the shared CTA color foundation',
    defaultOpen: false,
    defaultValue,
    fields: [
      {
        kind: 'boolean',
        key: 'enabled',
        label: `Override on ${pageName}`,
        description: 'Off (default): this page inherits the shared CTA color foundation (set in "CTA button" above) exactly like every other page. On: the fields below apply only to this page.',
      },
      {
        kind: 'enum',
        key: 'backgroundColorMode',
        label: 'Background source',
        description: 'Auto derives from the surfaceColor prop; Custom uses the color below.',
        options: [
          { label: 'AUTO', value: 'auto' },
          { label: 'CUSTOM', value: 'custom' },
        ],
        visibleWhen: config => config.enabled,
      },
      {
        kind: 'color',
        key: 'backgroundColor',
        label: 'Background color',
        visibleWhen: config => config.enabled && config.backgroundColorMode === 'custom',
      },
      {
        kind: 'enum',
        key: 'borderColorMode',
        label: 'Border source',
        description: 'Auto derives from the surfaceColor prop, lightened; Custom uses the color below.',
        options: [
          { label: 'AUTO', value: 'auto' },
          { label: 'CUSTOM', value: 'custom' },
        ],
        visibleWhen: config => config.enabled,
      },
      {
        kind: 'color',
        key: 'borderColor',
        label: 'Border color',
        visibleWhen: config => config.enabled && config.borderColorMode === 'custom',
      },
      {
        kind: 'enum',
        key: 'textColorMode',
        label: 'Text source',
        description: 'Auto picks a darker or brighter tint of surfaceColor for contrast; Custom uses the color below.',
        options: [
          { label: 'AUTO', value: 'auto' },
          { label: 'CUSTOM', value: 'custom' },
        ],
        visibleWhen: config => config.enabled,
      },
      {
        kind: 'color',
        key: 'textColor',
        label: 'Text color',
        visibleWhen: config => config.enabled && config.textColorMode === 'custom',
      },
      {
        kind: 'number',
        key: 'autoBackgroundLightenAmount',
        label: 'Background lighten amount',
        description: 'How much lighter (positive) or darker (negative) than the surface the resting background is, while Background source is Auto.',
        min: -1,
        max: 1,
        step: 0.01,
        visibleWhen: config => config.enabled && config.backgroundColorMode === 'auto',
      },
      {
        kind: 'number',
        key: 'autoBorderLightenAmount',
        label: 'Border lighten amount',
        description: 'How much lighter (positive) or darker (negative) than the surface the resting border is, while Border source is Auto.',
        min: -1,
        max: 1,
        step: 0.01,
        visibleWhen: config => config.enabled && config.borderColorMode === 'auto',
      },
      {
        kind: 'number',
        key: 'autoBackgroundHoverLightenAmount',
        label: 'Background hover lighten amount',
        description: 'Additional lighten (positive) or darken (negative) applied to the background on hover, on top of whatever the resting background resolved to.',
        min: -1,
        max: 1,
        step: 0.01,
        visibleWhen: config => config.enabled && config.backgroundColorMode === 'auto',
      },
      {
        kind: 'number',
        key: 'autoBorderHoverLightenAmount',
        label: 'Border hover lighten amount',
        description: 'Additional lighten (positive) or darken (negative) applied to the border on hover, on top of whatever the resting border resolved to.',
        min: -1,
        max: 1,
        step: 0.01,
        visibleWhen: config => config.enabled && config.borderColorMode === 'auto',
      },
      {
        kind: 'number',
        key: 'autoTextMinContrast',
        label: 'Text minimum contrast',
        description: 'Minimum contrast ratio the auto-picked text tint must clear against the surface.',
        min: 1,
        max: 21,
        step: 0.1,
        visibleWhen: config => config.enabled && config.textColorMode === 'auto',
      },
    ],
    copy: {
      targetFile: 'components/CtaButton/config/colorOverride.ts',
      targetSymbol,
      targetType: 'CtaButtonColorOverrideConfig',
      updateStrategy: 'replace_scope',
      completeScope: true,
    },
  });
}

// Per-page config ownership (PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md) — one
// instance per consuming page, constructed here (not inline at each page's
// own registry/call site) so every instance's defaultValue/targetSymbol
// pairing is visible in one place and machine-checkable — see
// colorOverride.pageConfigs.test.ts. Plain top-level exports; each owning
// page imports its own directly.
export const ABSTRACT_CTA_BUTTON_COLOR_OVERRIDE_PANEL = createCtaButtonColorOverridePanel(
  'Abstract',
  ABSTRACT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG,
  'ABSTRACT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG',
);
export const CONTACT_CTA_BUTTON_COLOR_OVERRIDE_PANEL = createCtaButtonColorOverridePanel(
  'Contact',
  CONTACT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG,
  'CONTACT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG',
);
