import { defineConfigScope, definePageConfigScope } from '../components/Panel/config';
import { POLYMORPHIC_LAYOUT_FIELDS } from '../experiences/abstract/components/PolymorphicLayout.panel';
import type { PolymorphicLayoutConfig } from '../experiences/abstract/components/PolymorphicLayout.config';
import { ABOUT_TIMELINE_PANEL_FIELDS } from '../experiences/about/components/AboutTimeline.panel';
import type { AboutTimelineConfig } from '../experiences/about/components/AboutTimeline.config';
import {
  ABSTRACT_POST_DOCK_PALETTE_PANEL,
  ABSTRACT_POST_DOCK_LAYOUT_PANEL,
} from '../experiences/abstract/components/AbstractPostDock/config/panel';
import type {
  AbstractPostDockPaletteConfig,
  AbstractPostDockLayoutConfig,
} from '../experiences/abstract/components/AbstractPostDock/config/registered';
import {
  ABOUT_POLYMORPHIC_LAYOUT_CONFIG,
  DEFAULT_ABOUT_PAGE_TIMELINE_CONFIG,
  DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG,
  DEFAULT_ABOUT_TOP_SEGMENT_GRADIENT_CONFIG,
  ABOUT_DEFAULT_DOCK_PALETTE_CONFIG,
  ABOUT_DEFAULT_DOCK_LAYOUT_CONFIG,
  type AboutPageLayoutConfig,
  type AboutTopSegmentGradientConfig,
} from './about.config';

export const ABOUT_PAGE_LAYOUT_SCOPE_ID = 'AboutPage/layout' as const;
export const ABOUT_TIMELINE_SCOPE_ID = 'AboutTimeline/about-appearance' as const;
export const ABOUT_TOP_SEGMENT_GRADIENT_SCOPE_ID = 'AboutPage/topSegmentGradient' as const;
export const ABOUT_DOCK_PALETTE_SCOPE_ID = 'AboutPage/dockPalette' as const;
export const ABOUT_DOCK_LAYOUT_SCOPE_ID = 'AboutPage/dockLayout' as const;

// /about's own instance of the shared PolymorphicLayoutConfig field
// structure (components/PolymorphicLayout.panel.ts's own
// POLYMORPHIC_LAYOUT_FIELDS — the identical array reference
// pages/posts-lab/postLab.panel.ts already uses for its own scope, not a
// filtered/rebuilt copy). "One shared layout, many value instances" means
// the field *definitions* are never page-specific — only `defaultValue`
// differs per page. A prior version of this file built its own filtered
// subset (~12 of ~150 fields) plus a computed hiddenKeys list for the
// rest, which produced a panel with a visibly different control set from
// posts-lab's own — a real defect, not a style choice (see
// PLAN-SPLIT-COLUMN-LAYOUT-ENRICHMENT-EXTRACTION.md's own correction).
// pages/about.tsx's own render code is what changed instead, extended to
// genuinely consume the fields this array exposes via components/
// PolymorphicLayout.tsx, the shared rendering component both pages call —
// see that plan's own "Reference implementation" section for the full
// mechanism-by-mechanism mapping.
//
// definePageConfigScope (not the plain defineConfigScope postLab.panel.ts
// uses) because PolymorphicLayoutConfig is now genuinely shared by two
// pages, exactly the scenario that helper exists for (see its own doc
// comment). Replaces components/SplitColumnLayout.panel.ts's own
// ABOUT_SPLIT_COLUMN_LAYOUT_PANEL, which is now dead — about.tsx edits
// these fields from this scope instead. Titled exactly "Polymorphic
// Layout" — the same generic name every PolymorphicLayoutConfig-integrated
// page uses (not a page-prefixed variant), so it reads at a glance as
// "this page runs on the shared system." Verified not to collide with any
// other scope title on this page (ABOUT_PAGE_LAYOUT_PANEL below is titled
// "About page layout" — a real defect elsewhere in this same effort was
// two scopes sharing one exact title).
export const ABOUT_POLYMORPHIC_LAYOUT_PANEL = definePageConfigScope<PolymorphicLayoutConfig>({
  component: 'SplitColumnLayout',
  scope: 'layout',
  pageName: 'About',
  title: 'Polymorphic Layout',
  createdAt: '2026-08-17',
  summary: 'Content container, column split, color source, header split band',
  defaultOpen: false,
  fields: POLYMORPHIC_LAYOUT_FIELDS,
  defaultValue: ABOUT_POLYMORPHIC_LAYOUT_CONFIG,
  // Points at experiences/abstract/components/PolymorphicLayout.pageConfigs.ts,
  // NOT pages/about.config.ts — PLAN-POLYMORPHIC-LAYOUT-PAGE-CONFIG-PARITY.md
  // relocated the real `export const ABOUT_POLYMORPHIC_LAYOUT_CONFIG = {...}`
  // object literal there, leaving pages/about.config.ts with only a
  // re-export (`export { ABOUT_POLYMORPHIC_LAYOUT_CONFIG } from '../
  // experiences/abstract/components/PolymorphicLayout.pageConfigs'`) for
  // import-compatibility. That migration's own doc comment says "no other
  // consumer... needs to change" — true for JS imports, false for this
  // field: a component-config-update payload aimed at the old file has no
  // object literal to patch there, so it silently fails to persist (caught
  // live, 2026-08-25 — an update targeting narrowColumnContentWidthLg/
  // narrowColumnTextAlignLg against pages/about.config.ts never landed).
  targetFile: 'experiences/abstract/components/PolymorphicLayout.pageConfigs.ts',
  targetSymbol: 'ABOUT_POLYMORPHIC_LAYOUT_CONFIG',
  targetType: 'PolymorphicLayoutConfig',
});

const MOTION_EASING_OPTIONS = [
  { label: 'LINEAR', value: 'linear' },
  { label: 'STANDARD', value: 'standard' },
  { label: 'EXPRESSIVE', value: 'expressive' },
  { label: 'VISCOUS', value: 'viscous' },
  { label: 'GENTLE', value: 'gentle' },
] as const;

export const ABOUT_PAGE_LAYOUT_PANEL = defineConfigScope<AboutPageLayoutConfig>({
  id: ABOUT_PAGE_LAYOUT_SCOPE_ID,
  component: 'AboutPage',
  scope: 'layout',
  title: 'About page layout',
  createdAt: '2026-07-21',
  summary: 'Left column background + text tone',
  defaultOpen: false,
  defaultValue: DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG,
  fields: [
    {
      kind: 'enum',
      key: 'leftPanelTextTone',
      label: 'Left panel text tone',
      description: 'Column: derives the headline\'s color from the left column\'s real resolved background, always legible regardless of colorSource. Light/Dark: an explicit manual override instead.',
      options: [
        { label: 'COLUMN', value: 'column' },
        { label: 'LIGHT', value: 'light' },
        { label: 'DARK', value: 'dark' },
      ],
    },
    {
      kind: 'boolean',
      key: 'navControlEnabled',
      label: 'Slide nav control',
      description: 'Shows the triangle prev/next control at the left panel\'s top-right corner.',
    },
    {
      kind: 'number',
      key: 'navControlArrowSizePx',
      label: 'Arrow size',
      description: 'Triangle glyph height — the gap between the two triangles is always 32% of this value.',
      min: 8,
      max: 40,
      step: 1,
      unit: 'px',
      integer: true,
      visibleWhen: config => config.navControlEnabled,
    },
    {
      kind: 'number',
      key: 'navControlColorDarkenAmount',
      label: 'Arrow color darken',
      description: 'The arrow\'s idle fill is the nav split-background\'s left color, darkened by this fraction — no independent color picker, so it always stays a derived, coherent shade.',
      min: 0,
      max: 1,
      step: 0.01,
      visibleWhen: config => config.navControlEnabled,
    },
    {
      kind: 'number',
      key: 'navControlHoverBrightenAmount',
      label: 'Arrow hover brighten',
      description: 'Hover blends the idle (darkened) fill back toward the undarkened color by this fraction — the "lighting up" cue standing in for a shadow.',
      min: 0,
      max: 1,
      step: 0.01,
      visibleWhen: config => config.navControlEnabled,
    },
    {
      kind: 'number',
      key: 'navControlIdleOpacity',
      label: 'Nav control opacity',
      description: 'Resting-state opacity of the triangle control.',
      min: 0,
      max: 1,
      step: 0.01,
      visibleWhen: config => config.navControlEnabled,
    },
    {
      kind: 'number',
      key: 'navControlHoverOpacity',
      label: 'Nav control hover opacity',
      description: 'Opacity while a triangle is hovered.',
      min: 0,
      max: 1,
      step: 0.01,
      visibleWhen: config => config.navControlEnabled,
    },
    {
      kind: 'number',
      key: 'navControlDisabledOpacity',
      label: 'Nav control disabled opacity',
      description: 'Opacity of a triangle when there is no earlier/later slide to go to.',
      min: 0,
      max: 1,
      step: 0.01,
      visibleWhen: config => config.navControlEnabled,
    },
    {
      kind: 'number',
      key: 'navControlHoverTransitionMs',
      label: 'Hover enter duration',
      description: 'Color + opacity transition duration when a triangle starts being hovered.',
      min: 0,
      max: 1000,
      step: 10,
      unit: 'ms',
      integer: true,
      visibleWhen: config => config.navControlEnabled,
    },
    {
      kind: 'enum',
      key: 'navControlHoverEasing',
      label: 'Hover enter easing',
      options: MOTION_EASING_OPTIONS,
      visibleWhen: config => config.navControlEnabled,
    },
    {
      kind: 'number',
      key: 'navControlMouseOutTransitionMs',
      label: 'Hover exit duration',
      description: 'Color + opacity transition duration when the pointer leaves, or the triangle becomes disabled.',
      min: 0,
      max: 1500,
      step: 10,
      unit: 'ms',
      integer: true,
      visibleWhen: config => config.navControlEnabled,
    },
    {
      kind: 'enum',
      key: 'navControlMouseOutEasing',
      label: 'Hover exit easing',
      options: MOTION_EASING_OPTIONS,
      visibleWhen: config => config.navControlEnabled,
    },
    {
      kind: 'number',
      key: 'pageEntranceTransitionMs',
      label: 'Page entrance duration',
      description: 'On arriving at /about, the left panel + nav split colors transition in from the page\'s neutral surface color over this duration, instead of appearing instantly.',
      min: 0,
      max: 3000,
      step: 50,
      unit: 'ms',
      integer: true,
    },
    {
      kind: 'enum',
      key: 'pageEntranceEasing',
      label: 'Page entrance easing',
      options: MOTION_EASING_OPTIONS,
    },
    {
      kind: 'boolean',
      key: 'topSegmentDynamicBackgroundEnabled',
      label: 'Header top segment dynamic background',
      description: 'On: the header\'s right split-band segment (behind the nav) becomes a new leading stop in the same palette sequence the narrative rows use, revealing on mount with the same entrance timing. Off: that segment keeps its original split-band color.',
    },
    {
      kind: 'boolean',
      key: 'mobileUnifiedNarrowColumnGradientEnabled',
      label: 'Mobile unified narrow-column gradient',
      description: 'Mobile/stacked breakpoint only, and only while the header top segment dynamic background above is also on. Extends that same gradient mesh to the logo segment and the entire narrow column, composited so all three read as one continuous field instead of three separate flat/gradient treatments stacked on top of each other. Off (default): only the nav segment gets the gradient, matching today\'s behavior.',
      visibleWhen: config => config.topSegmentDynamicBackgroundEnabled,
    },
    {
      kind: 'boolean',
      key: 'narrowColumnContentWidthDecoupledEnabled',
      label: 'Narrow column width decoupled from wordmark',
      description: 'Off (default): the narrow column\'s left padding is live-measured from the header wordmark\'s own rendered left edge, so its available content width silently tracks wherever the wordmark renders, and the Polymorphic Layout panel\'s own narrow column padding-left fields never take effect. On: left padding comes from those fields alone, so the column\'s width stops depending on the wordmark, matching /abstract\'s narrow column.',
    },
  ],
  copy: {
    targetFile: 'pages/about.config.ts',
    targetSymbol: 'DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG',
    targetType: 'AboutPageLayoutConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});

export const ABOUT_TIMELINE_PANEL = defineConfigScope<AboutTimelineConfig>({
  id: ABOUT_TIMELINE_SCOPE_ID,
  component: 'AboutTimeline',
  scope: 'appearance',
  title: 'Timeline',
  createdAt: '2026-09-01',
  summary: 'Left-column narrative timeline — row gap, marker, rule, alignment, description',
  defaultOpen: false,
  defaultValue: DEFAULT_ABOUT_PAGE_TIMELINE_CONFIG,
  fields: ABOUT_TIMELINE_PANEL_FIELDS,
  copy: {
    targetFile: 'pages/about.config.ts',
    targetSymbol: 'DEFAULT_ABOUT_PAGE_TIMELINE_CONFIG',
    targetType: 'AboutTimelineConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});

// See AboutTopSegmentGradientConfig's own doc comment (about.config.ts) —
// geometry/behavior only, deliberately never color (that stays
// dockPaletteConfig, the same source every real narrative row uses) and no
// longer scale/noise either (also dockPaletteConfig now — "Gradient scale"/
// "Gradient noise" on the Dock palette direction panel — shared with the
// rows so the two segments can't drift apart on those two fields).
// Every field starts identical to DEFAULT_LIQUID_SLIDER_CONFIG's own value
// of the same name, so the top segment reads as the same gradient as the
// accordion rows out of the box; this scope exists purely as the override
// surface for retuning the seam between the header and row 0.
export const ABOUT_TOP_SEGMENT_GRADIENT_PANEL = defineConfigScope<AboutTopSegmentGradientConfig>({
  id: ABOUT_TOP_SEGMENT_GRADIENT_SCOPE_ID,
  component: 'AboutPage',
  scope: 'topSegmentGradient',
  title: 'Header top segment gradient',
  createdAt: '2026-08-24',
  summary: 'Gradient geometry and animation for the header row only',
  defaultOpen: false,
  defaultValue: DEFAULT_ABOUT_TOP_SEGMENT_GRADIENT_CONFIG,
  fields: [
    {
      kind: 'number',
      key: 'shaderColorVariation',
      label: 'Color variation',
      description: 'Hue variety per unit area.',
      min: 0,
      max: 2,
      step: 0.01,
    },
    {
      kind: 'number',
      key: 'shaderColorSaturation',
      label: 'Saturation',
      min: 0,
      max: 2,
      step: 0.01,
    },
    {
      kind: 'number',
      key: 'shaderColorBrightness',
      label: 'Brightness',
      min: 0,
      max: 2,
      step: 0.01,
    },
    {
      kind: 'number',
      key: 'shaderColorResolution',
      label: 'Resolution',
      description: 'Shader texture resolution, px. Higher is crisper/more detailed, more expensive.',
      min: 64,
      max: 2048,
      step: 32,
      integer: true,
    },
    {
      kind: 'number',
      key: 'shaderColorSoftness',
      label: 'Softness',
      description: 'Edge softness between color bands.',
      min: 0,
      max: 2,
      step: 0.01,
    },
    {
      kind: 'number',
      key: 'shaderColorVerticalRichness',
      label: 'Vertical richness',
      description: 'Vertical color variation, independent of the horizontal field.',
      min: 0,
      max: 2,
      step: 0.01,
    },
    {
      kind: 'number',
      key: 'shaderColorHueOffset',
      label: 'Hue offset',
      description: 'Hue rotation applied on top of the palette-derived base hue.',
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      kind: 'number',
      key: 'shaderColorMorph',
      label: 'Morph',
      description: 'Domain-warp amplitude — higher reads as more organic/liquid distortion.',
      min: 0,
      max: 3,
      step: 0.01,
    },
    {
      kind: 'number',
      key: 'shaderColorShimmer',
      label: 'Shimmer',
      description: 'Specular shimmer intensity.',
      min: 0,
      max: 3,
      step: 0.01,
    },
    {
      kind: 'number',
      key: 'shaderColorPulse',
      label: 'Pulse',
      description: 'Pulsing animation intensity.',
      min: 0,
      max: 3,
      step: 0.01,
    },
    {
      kind: 'number',
      key: 'shaderDomainCurveBoost',
      label: 'Domain curve boost',
      description: 'Additional domain-warp amplitude layered on top of Morph.',
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      kind: 'number',
      key: 'shaderBandCurveBoost',
      label: 'Band curve boost',
      description: 'Additional band-phase coupling amplitude.',
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      kind: 'boolean',
      key: 'shaderSettledDriftEnabled',
      label: 'Idle drift',
      description: 'Continues animating gently once the field has settled.',
    },
    {
      kind: 'number',
      key: 'shaderSettledDriftSpeed',
      label: 'Idle drift speed',
      min: 0,
      max: 10,
      step: 0.1,
      visibleWhen: config => config.shaderSettledDriftEnabled,
    },
    {
      kind: 'number',
      key: 'shaderSettledDriftAmount',
      label: 'Idle drift amount',
      min: 0,
      max: 3,
      step: 0.01,
      visibleWhen: config => config.shaderSettledDriftEnabled,
    },
    {
      kind: 'number',
      key: 'shaderSettledDriftOrganic',
      label: 'Idle drift organic',
      min: 0,
      max: 3,
      step: 0.01,
      visibleWhen: config => config.shaderSettledDriftEnabled,
    },
  ],
  copy: {
    targetFile: 'pages/about.config.ts',
    targetSymbol: 'DEFAULT_ABOUT_TOP_SEGMENT_GRADIENT_CONFIG',
    targetType: 'AboutTopSegmentGradientConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});

// Root-cause fix (operator-reported, live screenshots, 2026-08-24): about.tsx
// used to bind its "Dock palette direction" panel section straight to
// ABSTRACT_POST_DOCK_PALETTE_PANEL — the SAME scope definition /abstract's
// own JOURNAL section uses, whose `copy.targetSymbol` points at the shared
// DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG (AbstractPostDock/config/
// registered.ts). But about.tsx's own LIVE state initializes from
// ABOUT_DEFAULT_DOCK_PALETTE_CONFIG (about.config.ts), which hardcodes
// windowStep/inactiveChromaDuck on top of that shared default — so an
// operator tuning "Inactive duck" here and applying the resulting
// component-config-update/v1 prompt was updating a symbol this page's own
// rendered value never actually reads for those two fields, silently
// discarded on every refresh. Fields (ABSTRACT_POST_DOCK_PALETTE_PANEL.fields)
// and summary text are reused directly — same generic AbstractPostDockPaletteConfig
// shape, same controls, same descriptions as /abstract's own instance,
// never duplicated/retyped — only `defaultValue`/`copy` differ, correctly
// pointing at what this page actually renders from.
export const ABOUT_DOCK_PALETTE_PANEL = defineConfigScope<AbstractPostDockPaletteConfig>({
  id: ABOUT_DOCK_PALETTE_SCOPE_ID,
  component: 'AbstractPostDock',
  scope: 'palette',
  // Deliberately distinct from AbstractPostDock's own generic scope title
  // ('Dock palette direction', panel.ts) even though the fields/behavior
  // are identical — PLAN-DOCK-PALETTE-CONFIG-SEGREGATION.md's own audit:
  // the two scopes were already fully disconnected (own id/default/copy
  // target) as of the 2026-08-24 fix above, but sharing an identical title
  // gave an operator no way to tell that apart just from looking at the
  // panel, which is almost certainly why the same "editing /about changes
  // /abstract" bleed kept getting reported after the underlying storage
  // bug was already fixed.
  title: 'About dock palette',
  createdAt: '2026-08-24',
  summary: ABSTRACT_POST_DOCK_PALETTE_PANEL.summary,
  defaultOpen: false,
  defaultValue: ABOUT_DEFAULT_DOCK_PALETTE_CONFIG,
  fields: ABSTRACT_POST_DOCK_PALETTE_PANEL.fields,
  copy: {
    targetFile: 'pages/about.config.ts',
    targetSymbol: 'ABOUT_DEFAULT_DOCK_PALETTE_CONFIG',
    targetType: 'AbstractPostDockPaletteConfig',
    updateStrategy: 'merge',
    completeScope: false,
  },
});

// Same class of bug as ABOUT_DOCK_PALETTE_PANEL above, same fix
// (PLAN-DOCK-PALETTE-CONFIG-SEGREGATION.md): about.tsx used to bind its
// "Dock layout" panel section straight to ABSTRACT_POST_DOCK_LAYOUT_PANEL
// — the SAME scope definition /abstract's own JOURNAL section uses, whose
// `copy.targetSymbol` points at the shared
// DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG (AbstractPostDock/config/
// registered.ts, scattered-mode defaults /abstract actually renders). But
// about.tsx's own LIVE state initializes from ABOUT_DEFAULT_DOCK_LAYOUT_CONFIG
// (about.config.ts, vertical minimal-mode slider) — an operator tuning
// "Dock layout" here and applying the resulting update-prompt was updating
// a symbol this page's own rendered value never reads, while also
// retargeting /abstract's own default out from under it. Fields
// (ABSTRACT_POST_DOCK_LAYOUT_PANEL.fields) and summary text are reused
// directly — same generic AbstractPostDockLayoutConfig shape, same
// controls, same descriptions as /abstract's own instance, never
// duplicated/retyped — only `defaultValue`/`copy`/`title` differ.
export const ABOUT_DOCK_LAYOUT_PANEL = defineConfigScope<AbstractPostDockLayoutConfig>({
  id: ABOUT_DOCK_LAYOUT_SCOPE_ID,
  component: 'AbstractPostDock',
  scope: 'layout',
  // Distinct from AbstractPostDock's own generic scope title ('Dock
  // layout', panel.ts) for the same operator-facing-disambiguation reason
  // ABOUT_DOCK_PALETTE_PANEL's own title was renamed above.
  title: 'About dock layout',
  createdAt: '2026-08-29',
  summary: ABSTRACT_POST_DOCK_LAYOUT_PANEL.summary,
  defaultOpen: false,
  defaultValue: ABOUT_DEFAULT_DOCK_LAYOUT_CONFIG,
  fields: ABSTRACT_POST_DOCK_LAYOUT_PANEL.fields,
  copy: {
    targetFile: 'pages/about.config.ts',
    targetSymbol: 'ABOUT_DEFAULT_DOCK_LAYOUT_CONFIG',
    targetType: 'AbstractPostDockLayoutConfig',
    updateStrategy: 'merge',
    completeScope: false,
  },
});
