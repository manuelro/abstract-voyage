import { defineConfigScope } from '../../../components/Panel/config';
import type { ConfigScopeEntry } from '../../../components/Panel/config';
import {
  MIN_HEIGHT_OPTIONS,
  PADDING_OPTIONS,
  AFFORDANCE_BORDER_THICKNESS_OPTIONS,
  AFFORDANCE_CORNER_RADIUS_OPTIONS,
  AFFORDANCE_DIMENSION_OPTIONS,
} from '../../../components/tailwindSpacingScale';
import {
  DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG,
  type AboutMobileAccordionConfig,
} from './AboutMobileAccordion.config';

export const ABOUT_MOBILE_ACCORDION_SCOPE_ID = 'AboutMobileAccordion/appearance' as const;

// Local to this scope, same "each panel.ts keeps its own copy" convention
// pages/about.panel.ts and every other panel recipe in this repo already
// follows — no shared MOTION_EASING_OPTIONS export exists to reuse.
const MOTION_EASING_OPTIONS = [
  { label: 'LINEAR', value: 'linear' },
  { label: 'STANDARD', value: 'standard' },
  { label: 'EXPRESSIVE', value: 'expressive' },
  { label: 'VISCOUS', value: 'viscous' },
  { label: 'GENTLE', value: 'gentle' },
] as const;

// AbstractPostDockEasingPreset's own vocabulary (AbstractPostDock/config/
// registered.ts) — distinct from MOTION_EASING_OPTIONS above (that's
// CtaButtonMotionEasing). transitionEasing below drives both this accordion
// AND the desktop MagnificationDock engine (View.tsx's own dockTransitionEasing),
// so it uses that engine's own easing vocabulary, not this component's other
// (unrelated, mobile-only) motion fields' vocabulary.
const TRANSITION_EASING_OPTIONS = [
  { label: 'STD', value: 'standard' },
  { label: 'EXPO', value: 'soft-expo' },
  { label: 'VISC', value: 'viscous' },
  { label: 'SET', value: 'settle' },
  { label: 'LUX', value: 'luxury' },
] as const;

// PLAN-EDITORIAL-HERO-UNIFICATION-AND-CARDSTACK-RESIZE-FIX.md Part 4 — the
// 3 fields shared with the desktop MagnificationDock engine (`View.tsx`'s
// own `dockTransitionMs`/`dockTransitionEasing`/`dockContentSettleMs`,
// copied in from this same config by `pages/about.tsx`'s `dockSliderConfig`
// memo). Live in their own ALL SIZES tab because they aren't a mobile-only
// concern, unlike every other field in this scope.
const ALL_SIZES_FIELDS = [
  {
    kind: 'number',
    key: 'transitionMs',
    label: 'Resize duration',
    description: 'Duration of an item\'s own size/position change when it becomes active — shared with the desktop accordion\'s own resize transition.',
    min: 100,
    max: 1600,
    step: 25,
    unit: 'ms',
    integer: true,
  },
  {
    kind: 'enum',
    key: 'transitionEasing',
    label: 'Resize easing',
    options: TRANSITION_EASING_OPTIONS,
  },
  {
    kind: 'number',
    key: 'contentSettleMs',
    label: 'Content settle',
    description: 'How long the expanded content waits before it starts revealing. 0 = wait exactly the resize duration above.',
    min: 0,
    max: 2000,
    step: 20,
    unit: 'ms',
    integer: true,
  },
] as const satisfies ReadonlyArray<ConfigScopeEntry<AboutMobileAccordionConfig>>;

const MOBILE_ONLY_FIELDS = [
  {
    kind: 'boolean',
    key: 'enabled',
    label: 'Mobile accordion',
    description: 'Below 768px on touch-capable devices, shows the narrative paragraphs as a tap-to-expand accordion instead of the vertical slider. Off keeps the vertical slider at every breakpoint.',
  },
  {
    kind: 'select',
    key: 'previewMinHeight',
    label: 'Preview tab height',
    description: 'Uniform collapsed row height, every item, regardless of its own excerpt length.',
    options: MIN_HEIGHT_OPTIONS,
    visibleWhen: config => config.enabled,
  },
  {
    kind: 'number',
    key: 'maxExpandedItems',
    label: 'Max expanded items',
    description: '0 = unlimited (every item can be open at once). A positive cap evicts the oldest-opened item (FIFO) once exceeded, rather than blocking a tap.',
    min: 0,
    max: 8,
    step: 1,
    integer: true,
    visibleWhen: config => config.enabled,
  },
  {
    kind: 'number',
    key: 'collapseLeadFraction',
    label: 'Collapse lead',
    description: 'When opening an item closes another (the max expanded cap above), the newly-opening item waits until the closing item\'s own height transition is this fraction complete before it starts. 0 = both start at once; 1 = wait for the close to fully finish first.',
    min: 0,
    max: 1,
    step: 0.01,
    visibleWhen: config => config.enabled,
  },
  {
    kind: 'number',
    key: 'affordanceRotationDurationMs',
    label: 'Affordance rotation duration',
    description: 'Duration of the disclosure affordance\'s own rotate transition — its own knob, not tied to the two durations above.',
    min: 60,
    max: 600,
    step: 10,
    unit: 'ms',
    integer: true,
    visibleWhen: config => config.enabled,
  },
    {
      kind: 'enum',
      key: 'affordanceRotationEasing',
      label: 'Affordance rotation easing',
      options: MOTION_EASING_OPTIONS,
      visibleWhen: config => config.enabled,
    },
    {
      kind: 'select',
      key: 'affordanceBorderThicknessClassName',
      label: 'Affordance border thickness',
      description: 'Thickness of the affordance\'s two visible borders (top + right).',
      options: AFFORDANCE_BORDER_THICKNESS_OPTIONS,
      visibleWhen: config => config.enabled,
    },
    {
      kind: 'select',
      key: 'affordanceCornerRadiusClassName',
      label: 'Affordance corner radius',
      description: 'Radius of the corner where the two visible borders meet.',
      options: AFFORDANCE_CORNER_RADIUS_OPTIONS,
      visibleWhen: config => config.enabled,
    },
    {
      kind: 'select',
      key: 'affordanceDimensionClassName',
      label: 'Affordance dimension',
      description: 'Width + height of the affordance\'s icon box, before rotation.',
      options: AFFORDANCE_DIMENSION_OPTIONS,
      visibleWhen: config => config.enabled,
    },
    {
      kind: 'select',
      key: 'affordancePadding',
      label: 'Preview tab padding',
      description: 'Uniform padding on the preview tab — the same value on every side is what keeps the affordance equidistant from the row\'s top and right edges.',
      options: PADDING_OPTIONS,
      visibleWhen: config => config.enabled,
    },
    {
      kind: 'number',
      key: 'affordanceRotateCollapsedDeg',
      label: 'Affordance rotation (collapsed)',
      description: 'Points down while collapsed by default — invites opening.',
      min: -360,
      max: 360,
      step: 1,
      unit: 'deg',
      integer: true,
      visibleWhen: config => config.enabled,
    },
    {
      kind: 'number',
      key: 'affordanceRotateExpandedDeg',
      label: 'Affordance rotation (expanded)',
      description: 'Points up while expanded by default — a 180° flip from the collapsed angle, inviting closing.',
      min: -360,
      max: 360,
      step: 1,
      unit: 'deg',
      integer: true,
      visibleWhen: config => config.enabled,
    },
    {
      kind: 'enum',
      key: 'affordanceColorMode',
      label: 'Affordance color source',
      description: '"Accent" derives the affordance\'s border color from its own row\'s resolved accent color. "Custom" uses an independent color below.',
      options: [
        { label: 'ACCENT', value: 'accent' },
        { label: 'CUSTOM', value: 'custom' },
      ],
      visibleWhen: config => config.enabled,
    },
    {
      kind: 'color',
      key: 'affordanceCustomColor',
      label: 'Affordance custom color',
      visibleWhen: config => config.enabled && config.affordanceColorMode === 'custom',
    },
    {
      kind: 'number',
      key: 'affordanceHoverOpacity',
      label: 'Affordance hover opacity',
      description: 'Opacity while hovering anywhere on the header row. At rest, the affordance always sits at the row\'s own non-highlighted-text opacity — never the highlighted/active opacity, even while the item is expanded.',
      min: 0,
      max: 1,
      step: 0.01,
      visibleWhen: config => config.enabled,
    },
    {
      kind: 'number',
      key: 'affordanceHoverTransitionMs',
      label: 'Affordance hover-in duration',
      description: 'Opacity transition duration when the pointer enters the header row.',
      min: 0,
      max: 1000,
      step: 10,
      unit: 'ms',
      integer: true,
      visibleWhen: config => config.enabled,
    },
    {
      kind: 'enum',
      key: 'affordanceHoverEasing',
      label: 'Affordance hover-in easing',
      options: MOTION_EASING_OPTIONS,
      visibleWhen: config => config.enabled,
    },
    {
      kind: 'number',
      key: 'affordanceMouseOutTransitionMs',
      label: 'Affordance hover-out duration',
      description: 'Opacity transition duration when the pointer leaves the header row (or on mount, before any hover).',
      min: 0,
      max: 1500,
      step: 10,
      unit: 'ms',
      integer: true,
      visibleWhen: config => config.enabled,
    },
  {
    kind: 'enum',
    key: 'affordanceMouseOutEasing',
    label: 'Affordance hover-out easing',
    options: MOTION_EASING_OPTIONS,
    visibleWhen: config => config.enabled,
  },
] as const satisfies ReadonlyArray<ConfigScopeEntry<AboutMobileAccordionConfig>>;

/**
 * The unified accordion scope — shared resize/reveal timing (ALL SIZES,
 * also consumed by the desktop `MagnificationDock` engine via
 * `pages/about.tsx`'s own `dockSliderConfig` memo) plus the mobile (below-md)
 * accordion's own interaction/geometry knobs (MOBILE). See
 * `AboutMobileAccordion.config.ts`'s own doc comment for why colors are
 * deliberately absent here (the component reuses the page's existing
 * `dockPaletteConfig`/`dockSliderConfig` verbatim). Registered in
 * `pages/aboutConfigPanels.ts`'s `aboutConfigPanelRegistry` — single page
 * consumer, same registration shape the outgoing `AboutMobileCardStack`
 * scope used, not the per-page-ownership pattern (which is for one shared
 * component type instanced differently across ≥2 pages).
 */
export const ABOUT_MOBILE_ACCORDION_PANEL = defineConfigScope<AboutMobileAccordionConfig>({
  id: ABOUT_MOBILE_ACCORDION_SCOPE_ID,
  component: 'AboutMobileAccordion',
  scope: 'appearance',
  title: 'Accordion',
  createdAt: '2026-08-25',
  summary: 'Shared resize/reveal timing, preview height, and the disclosure affordance',
  defaultOpen: false,
  defaultValue: DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG,
  fields: [
    {
      kind: 'tabs',
      tabs: [
        {
          id: 'all-sizes',
          label: 'ALL SIZES',
          fields: ALL_SIZES_FIELDS,
        },
        {
          id: 'mobile',
          label: 'MOBILE (< 768px)',
          fields: MOBILE_ONLY_FIELDS,
        },
      ],
    },
  ],
  copy: {
    targetFile: 'experiences/about/components/AboutMobileAccordion.config.ts',
    targetSymbol: 'DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG',
    targetType: 'AboutMobileAccordionConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
