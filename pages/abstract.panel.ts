import {
  createTailwindFieldFactory,
  defineConfigScope,
  definePageConfigScope,
} from '../components/Panel/config';
import type { ConfigFieldAction } from '../components/Panel/config/types';
import { POLYMORPHIC_LAYOUT_FIELDS } from '../experiences/abstract/components/PolymorphicLayout.panel';
import { MOTION_EASING_OPTIONS } from '../experiences/about/components/AboutTimeline.panel';
import type { PolymorphicLayoutConfig } from '../experiences/abstract/components/PolymorphicLayout.config';
import type { AboutMobileAccordionConfig } from '../experiences/about/components/AboutMobileAccordion.config';
import { EDITORIAL_ACCORDION_ITEM_FIELDS, EDITORIAL_ACCORDION_ITEM_HIDDEN_KEYS } from '../experiences/about/components/EditorialAccordionItem.panel';
import {
  ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG,
  DEFAULT_ABSTRACT_FOOTER_CONFIG,
  DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG,
  DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG,
  DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG,
  DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG,
  DEFAULT_ABSTRACT_MOBILE_ARTICLE_LIST_INK_CONFIG,
  DEFAULT_ABSTRACT_COVER_FLOW_TIMELINE_SLOT_CONFIG,
  DEFAULT_ABSTRACT_TIMELINE_LINK_COLOR_CONFIG,
  type AbstractNarrowColumnStackConfig,
  type AbstractTimelineContentConfig,
  type AbstractPageLayoutConfig,
  type AbstractMobileArticleListInkConfig,
  type AbstractFooterConfig,
  type AbstractCoverFlowTimelineSlotConfig,
  type AbstractTimelineLinkColorConfig,
} from './abstract.config';

export const ABSTRACT_PAGE_LAYOUT_SCOPE_ID = 'AbstractPage/layout' as const;
export const ABSTRACT_NARROW_COLUMN_STACK_SCOPE_ID = 'AbstractPage/narrowColumnStack' as const;
export const ABSTRACT_FOOTER_SCOPE_ID = 'AbstractPage/footer' as const;

const tailwindFooterField = createTailwindFieldFactory<AbstractFooterConfig>();
const tailwindCoverFlowTimelineSlotField = createTailwindFieldFactory<AbstractCoverFlowTimelineSlotConfig>();

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
  summary: 'Content container, column split, and wide/narrow column background controls',
  defaultOpen: false,
  fields: POLYMORPHIC_LAYOUT_FIELDS,
  defaultValue: ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG,
  // Previously pointed at experiences/abstract/components/
  // PolymorphicLayout.pageConfigs.ts — same fix as ABOUT_POLYMORPHIC_LAYOUT_PANEL
  // (pages/about.panel.ts) once did for the same reason (PLAN-POLYMORPHIC-
  // LAYOUT-PAGE-CONFIG-PARITY.md had moved the real definition there,
  // leaving pages/abstract.config.ts with only a re-export). Re-pointed
  // again (operator ask, 2026-09-23: journal's mobile/tablet gradient
  // recipe copied onto this page too — pages/abstract.config.ts's own doc
  // comment on this const): that file's own ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG
  // is now itself a real, page-owned object literal again (spreading the
  // shared pageConfigs.ts instance and overriding its gradient and tablet
  // layout fields), not a bare re-export — so the real literal to patch moved
  // back to pages/abstract.config.ts. Pointing this panel at the old shared
  // pageConfigs.ts literal would both show stale values (missing the
  // gradient override) and, on Update diff, patch the wrong file — the
  // same class of bug postLab.panel.ts's own doc comment documents
  // happening for real on /posts.
  targetFile: 'pages/abstract.config.ts',
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
const COVER_FLOW_TIMELINE_SLOT_POSITION_MODE_OPTIONS = [
  { label: 'FREE', value: 'free' },
  { label: 'SNAP LEFT', value: 'snapLeft' },
  { label: 'SNAP RIGHT', value: 'snapRight' },
  { label: 'IN GAP (LEFT NEIGHBOR)', value: 'betweenActiveAndLeftNeighbor' },
] as const;
const whenCoverFlowTimelineSlotPositionModeMdFree = (config: Readonly<AbstractCoverFlowTimelineSlotConfig>) => (
  config.positionModeMd === 'free'
);
const whenCoverFlowTimelineSlotPositionModeLgFree = (config: Readonly<AbstractCoverFlowTimelineSlotConfig>) => (
  config.positionModeLg === 'free'
);
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
  fields: [{
    kind: 'tabs',
    tabs: [
      {
        id: 'mobile-desktop',
        label: 'MOBILE & DESKTOP',
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
      kind: 'boolean',
      key: 'invertOrder',
      label: 'Invert visual order',
      description: 'Swap the top and bottom content positions while keeping each region’s own size and alignment settings. DOM and keyboard reading order remain top then bottom.',
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
      },
      {
        id: 'tablet',
        label: 'TABLET (768–1023PX)',
        fields: [
          {
            kind: 'enum', key: 'tabletFlow', label: 'Flow', options: [
              { label: 'VERTICAL', value: 'vertical' }, { label: 'HORIZONTAL', value: 'horizontal' },
            ],
          },
          {
            kind: 'enum', key: 'tabletRegionOrder', label: 'Horizontal pair order', options: [
              { label: 'HERO FIRST', value: 'heroFirst' }, { label: 'TIMELINE FIRST', value: 'timelineFirst' },
            ],
          },
          { kind: 'number', key: 'tabletHeroWeight', label: 'Hero relative width', min: 1, max: 99, step: 1 },
          { kind: 'number', key: 'tabletTimelineWeight', label: 'Timeline relative width', min: 1, max: 99, step: 1 },
          {
            kind: 'enum',
            key: 'tabletPairVerticalAlign',
            label: 'Row alignment',
            description: 'Cross-axis alignment of the Hero/Timeline row. STRETCH gives both columns the row\'s full height, which is what makes the two alignment fields below actually move content — any other value sizes each column to its own content first, leaving them no room to act on.',
            options: HORIZONTAL_ALIGN_OPTIONS,
          },
          {
            kind: 'enum', key: 'tabletHeroVerticalAlign', label: 'Hero vertical alignment', options: VERTICAL_ALIGN_OPTIONS,
          },
          {
            kind: 'enum', key: 'tabletTimelineVerticalAlign', label: 'Timeline vertical alignment', options: VERTICAL_ALIGN_OPTIONS,
          },
        ],
      },
    ],
  }],
  copy: {
    targetFile: 'pages/abstract.config.ts',
    targetSymbol: 'DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG',
    targetType: 'AbstractNarrowColumnStackConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});

export const ABSTRACT_COVER_FLOW_TIMELINE_SLOT_SCOPE_ID = 'AbstractPage/coverFlowTimelineSlot' as const;

const TIMELINE_SLOT_BACKGROUND_MODE_OPTIONS = [
  { label: 'FLAT', value: 'flat' },
  { label: 'GRADIENT', value: 'gradient' },
] as const;

export const ABSTRACT_COVER_FLOW_TIMELINE_SLOT_PANEL = defineConfigScope<AbstractCoverFlowTimelineSlotConfig>({
  id: ABSTRACT_COVER_FLOW_TIMELINE_SLOT_SCOPE_ID,
  component: 'AbstractCoverFlowTimelineSlot',
  scope: 'layout',
  title: 'Timeline in CoverFlow track',
  createdAt: '2026-09-24',
  summary: 'Opt-in figure that hosts the Timeline inside the CoverFlow track (tablet/desktop only)',
  defaultOpen: false,
  defaultValue: DEFAULT_ABSTRACT_COVER_FLOW_TIMELINE_SLOT_CONFIG,
  fields: [
    {
      kind: 'tabs',
      tabs: [
        {
          id: 'base',
          label: 'BASE (< 768px)',
          fields: [
            tailwindCoverFlowTimelineSlotField('paddingLeft', {
              key: 'minLeftInsetClassName', label: 'Minimum left inset',
              description: 'Stored base value; the Timeline-in-track placement begins at tablet.',
            }),
            { kind: 'enum', key: 'backgroundMode', label: 'Background mode', options: TIMELINE_SLOT_BACKGROUND_MODE_OPTIONS },
            { kind: 'color', key: 'backgroundColor', label: 'Background color (start)' },
            { kind: 'number', key: 'backgroundOpacity', label: 'Background opacity', min: 0, max: 1, step: 0.05 },
            { kind: 'number', key: 'backdropBlurPx', label: 'Backdrop blur', min: 0, max: 64, step: 1, unit: 'px' },
            { kind: 'color', key: 'backgroundGradientColorEnd', label: 'Background color (end)' },
            { kind: 'number', key: 'backgroundGradientAngleDeg', label: 'Gradient direction', min: 0, max: 360, step: 1, unit: '°' },
            { kind: 'number', key: 'backgroundGradientScale', label: 'Gradient scale', min: 10, max: 400, step: 5, unit: '%' },
            { kind: 'number', key: 'minWidth', label: 'Minimum width', min: 0, max: 2000, step: 1, unit: 'px' },
          ],
        },
        {
          id: 'tablet',
          label: 'TABLET (≥ 768px)',
          fields: [
            {
              kind: 'boolean',
              key: 'enabledMd',
              label: 'Enabled (tablet)',
              description: 'Moves the Timeline out of the narrow column\'s bottom region and into a figure inside the CoverFlow\'s own track, on this tier only. The narrow column\'s bottom Timeline is suppressed on this tier while it\'s on, so only one timeline/tablist exists in the DOM here. Independent of the Desktop tab\'s own toggle — either, both, or neither can be on.',
            },
            {
              kind: 'boolean', key: 'adaptiveTextInkEnabledMd', label: 'Adaptive text ink',
              description: 'Opt-in: derives Timeline copy from this figure’s configured background start color at tablet width. Off preserves the current Timeline ink exactly.',
            },
            {
              kind: 'number', key: 'adaptiveTextInkDarkInkSaturationMd', label: 'Dark ink saturation',
              description: '0 is neutral, 1 preserves the background hue/saturation contribution, and 2 doubles it.', min: 0, max: 2, step: 0.05,
              visibleWhen: config => config.adaptiveTextInkEnabledMd,
            },
            {
              kind: 'number', key: 'adaptiveTextInkDarkInkOpacityMultiplierMd', label: 'Dark ink opacity',
              description: 'Independent opacity multiplier for derived dark text. Lower values create a softer fusion with the figure.', min: 0.2, max: 1, step: 0.01,
              visibleWhen: config => config.adaptiveTextInkEnabledMd,
            },
            {
              kind: 'number', key: 'adaptiveTextInkLightInkToleranceMd', label: 'Light ink tolerance',
              description: 'Allows a bounded contrast shortfall for light ink over a light figure background. Use sparingly.', min: 0, max: 20, step: 0.1,
              visibleWhen: config => config.adaptiveTextInkEnabledMd,
            },
            {
              kind: 'number',
              key: 'aspectRatioMd',
              label: 'Aspect ratio (W / H)',
              description: 'CSS width/height ratio — defaults to the same shape as CoverFlow\'s own card.',
              min: 0.2,
              max: 5,
              step: 0.05,
            },
            {
              kind: 'number',
              key: 'widthPercentMd',
              label: 'Width %',
              description: 'Scales the figure\'s own box (width and height together, via aspect ratio) relative to the CoverFlow track — never scales the Timeline content inside.',
              min: 5,
              max: 100,
              step: 1,
            },
            {
              kind: 'enum',
              key: 'positionModeMd',
              label: 'Position mode',
              description: 'FREE (default): positioned via X position % below. SNAP LEFT/RIGHT: the figure bleeds flush against that edge of the CoverFlow track instead — X position % is ignored, tilt/lift are force-disabled, and the snapped edge\'s corner radius goes to 0. IN GAP (LEFT NEIGHBOR): the figure centers itself in the live gap between the active card and its left neighbor (or the track\'s left edge, if there is no left neighbor), tracking them as they move. Exactly one mode is active at a time.',
              options: COVER_FLOW_TIMELINE_SLOT_POSITION_MODE_OPTIONS,
            },
            {
              kind: 'number',
              key: 'xPercentMd',
              label: 'X position %',
              description: 'Requested center position within the CoverFlow track. Minimum left inset below protects the figure’s rendered left edge when this value would otherwise place it too close to or beyond the edge.',
              min: 0,
              max: 100,
              step: 1,
              visibleWhen: whenCoverFlowTimelineSlotPositionModeMdFree,
            },
            {
              kind: 'enum', key: 'verticalAlignMd', label: 'Vertical alignment', options: VERTICAL_ALIGN_OPTIONS,
            },
            {
              kind: 'number',
              key: 'scrollWindowActiveScrollDurationMsMd',
              label: 'Active row scroll duration',
              description: 'How long the row list takes to smoothly scroll a newly-active row back into view when drag/swipe navigation lands on one outside the visible window. 0 jumps instantly.',
              min: 0,
              max: 2000,
              step: 10,
              unit: 'ms',
            },
            {
              kind: 'enum',
              key: 'scrollWindowActiveScrollEasingMd',
              label: 'Active row scroll easing',
              options: MOTION_EASING_OPTIONS,
            },
            {
              kind: 'number',
              key: 'scrollWindowActiveScrollDelayMsMd',
              label: 'Active row scroll delay',
              description: 'Waits this long after the active card changes before bringing its row into view — gives the CoverFlow card\'s own settle glide time to finish first, so the list and card never appear to move at the same time.',
              min: 0,
              max: 2000,
              step: 10,
              unit: 'ms',
            },
            {
              kind: 'boolean', key: 'alignToTopWordmarkMd', label: 'Align to top wordmark',
              description: 'Aligns this figure’s left edge to the rendered wordmark in FREE position mode.',
              visibleWhen: whenCoverFlowTimelineSlotPositionModeMdFree,
            },
            tailwindCoverFlowTimelineSlotField('paddingLeft', {
              key: 'minLeftInsetClassNameMd', label: 'Minimum left inset', breakpoint: 'md',
              description: 'Minimum safe inset in FREE position mode.',
              visibleWhen: whenCoverFlowTimelineSlotPositionModeMdFree,
            }),
            { kind: 'enum', key: 'backgroundModeMd', label: 'Background mode', options: TIMELINE_SLOT_BACKGROUND_MODE_OPTIONS },
            { kind: 'color', key: 'backgroundColorMd', label: 'Background color (start)' },
            { kind: 'number', key: 'backgroundOpacityMd', label: 'Background opacity', min: 0, max: 1, step: 0.05 },
            { kind: 'number', key: 'backdropBlurPxMd', label: 'Backdrop blur', min: 0, max: 64, step: 1, unit: 'px' },
            { kind: 'color', key: 'backgroundGradientColorEndMd', label: 'Background color (end)' },
            { kind: 'number', key: 'backgroundGradientAngleDegMd', label: 'Gradient direction', min: 0, max: 360, step: 1, unit: '°' },
            { kind: 'number', key: 'backgroundGradientScaleMd', label: 'Gradient scale', min: 10, max: 400, step: 5, unit: '%' },
            { kind: 'number', key: 'minWidthMd', label: 'Minimum width', min: 0, max: 2000, step: 1, unit: 'px' },
          ],
        },
        {
          id: 'desktop',
          label: 'DESKTOP (≥ 1024px)',
          fields: [
            {
              kind: 'boolean',
              key: 'enabledLg',
              label: 'Enabled (desktop)',
              description: 'Same behavior as Tablet\'s Enabled toggle, independently tunable for this tier — either, both, or neither can be on.',
            },
            {
              kind: 'boolean', key: 'adaptiveTextInkEnabledLg', label: 'Adaptive text ink',
              description: 'Opt-in: derives Timeline copy from this figure’s configured background start color at desktop width. Off preserves the current Timeline ink exactly.',
            },
            {
              kind: 'number', key: 'adaptiveTextInkDarkInkSaturationLg', label: 'Dark ink saturation',
              description: 'Same behavior as Tablet’s Dark ink saturation, independently tunable for desktop.', min: 0, max: 2, step: 0.05,
              visibleWhen: config => config.adaptiveTextInkEnabledLg,
            },
            {
              kind: 'number', key: 'adaptiveTextInkDarkInkOpacityMultiplierLg', label: 'Dark ink opacity',
              description: 'Same behavior as Tablet’s Dark ink opacity, independently tunable for desktop.', min: 0.2, max: 1, step: 0.01,
              visibleWhen: config => config.adaptiveTextInkEnabledLg,
            },
            {
              kind: 'number', key: 'adaptiveTextInkLightInkToleranceLg', label: 'Light ink tolerance',
              description: 'Same behavior as Tablet’s Light ink tolerance, independently tunable for desktop.', min: 0, max: 20, step: 0.1,
              visibleWhen: config => config.adaptiveTextInkEnabledLg,
            },
            {
              kind: 'number',
              key: 'aspectRatioLg',
              label: 'Aspect ratio (W / H)',
              description: 'Same behavior as Tablet\'s Aspect ratio, independently tunable for this tier.',
              min: 0.2,
              max: 5,
              step: 0.05,
            },
            {
              kind: 'number',
              key: 'widthPercentLg',
              label: 'Width %',
              description: 'Same behavior as Tablet\'s Width %, independently tunable for this tier.',
              min: 5,
              max: 100,
              step: 1,
            },
            {
              kind: 'enum',
              key: 'positionModeLg',
              label: 'Position mode',
              description: 'Same behavior as Tablet\'s Position mode, independently tunable for this tier.',
              options: COVER_FLOW_TIMELINE_SLOT_POSITION_MODE_OPTIONS,
            },
            {
              kind: 'number',
              key: 'xPercentLg',
              label: 'X position %',
              description: 'Requested center position within the CoverFlow track. Minimum left inset below protects the figure’s rendered left edge when this value would otherwise place it too close to or beyond the edge.',
              min: 0,
              max: 100,
              step: 1,
              visibleWhen: whenCoverFlowTimelineSlotPositionModeLgFree,
            },
            {
              kind: 'enum', key: 'verticalAlignLg', label: 'Vertical alignment', options: VERTICAL_ALIGN_OPTIONS,
            },
            {
              kind: 'number',
              key: 'scrollWindowActiveScrollDurationMsLg',
              label: 'Active row scroll duration',
              description: 'Same behavior as Tablet\'s Active row scroll duration, independently tunable for this tier.',
              min: 0,
              max: 2000,
              step: 10,
              unit: 'ms',
            },
            {
              kind: 'enum',
              key: 'scrollWindowActiveScrollEasingLg',
              label: 'Active row scroll easing',
              options: MOTION_EASING_OPTIONS,
            },
            {
              kind: 'number',
              key: 'scrollWindowActiveScrollDelayMsLg',
              label: 'Active row scroll delay',
              description: 'Same behavior as Tablet\'s Active row scroll delay, independently tunable for this tier.',
              min: 0,
              max: 2000,
              step: 10,
              unit: 'ms',
            },
            {
              kind: 'boolean', key: 'alignToTopWordmarkLg', label: 'Align to top wordmark',
              description: 'Aligns this figure’s left edge to the rendered wordmark in FREE position mode.',
              visibleWhen: whenCoverFlowTimelineSlotPositionModeLgFree,
            },
            tailwindCoverFlowTimelineSlotField('paddingLeft', {
              key: 'minLeftInsetClassNameLg', label: 'Minimum left inset', breakpoint: 'lg',
              description: 'Minimum safe inset in FREE position mode.',
              visibleWhen: whenCoverFlowTimelineSlotPositionModeLgFree,
            }),
            { kind: 'enum', key: 'backgroundModeLg', label: 'Background mode', options: TIMELINE_SLOT_BACKGROUND_MODE_OPTIONS },
            { kind: 'color', key: 'backgroundColorLg', label: 'Background color (start)' },
            { kind: 'number', key: 'backgroundOpacityLg', label: 'Background opacity', min: 0, max: 1, step: 0.05 },
            { kind: 'number', key: 'backdropBlurPxLg', label: 'Backdrop blur', min: 0, max: 64, step: 1, unit: 'px' },
            { kind: 'color', key: 'backgroundGradientColorEndLg', label: 'Background color (end)' },
            { kind: 'number', key: 'backgroundGradientAngleDegLg', label: 'Gradient direction', min: 0, max: 360, step: 1, unit: '°' },
            { kind: 'number', key: 'backgroundGradientScaleLg', label: 'Gradient scale', min: 10, max: 400, step: 5, unit: '%' },
            { kind: 'number', key: 'minWidthLg', label: 'Minimum width', min: 0, max: 2000, step: 1, unit: 'px' },
          ],
        },
      ],
    },
    {
      kind: 'boolean',
      key: 'tiltEnabled',
      label: 'Tilt on hover (pointer devices)',
      description: 'Reuses the same tilt/lift/scale magnitudes as CoverFlow\'s cards (the CTA button config) — this only gates whether that shared physics engine is attached to this figure at all.',
    },
  ],
  copy: {
    targetFile: 'pages/abstract.config.ts',
    targetSymbol: 'DEFAULT_ABSTRACT_COVER_FLOW_TIMELINE_SLOT_CONFIG',
    targetType: 'AbstractCoverFlowTimelineSlotConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});

const TIMELINE_LINK_COLOR_MODE_OPTIONS = [
  { label: 'MANUAL', value: 'manual' },
  { label: 'DERIVE FROM GRADIENT', value: 'deriveFromGradient' },
] as const;

const timelineLinkColorTiersInSync = (config: AbstractTimelineLinkColorConfig) => (
  config.colorModeMd === config.colorModeLg
  && config.backgroundColorMd === config.backgroundColorLg
  && config.textColorMd === config.textColorLg
  && config.backgroundColorActiveMd === config.backgroundColorActiveLg
  && config.textColorActiveMd === config.textColorActiveLg
  && config.darkInkSaturationMd === config.darkInkSaturationLg
  && config.darkInkOpacityMultiplierMd === config.darkInkOpacityMultiplierLg
  && config.lightInkToleranceMd === config.lightInkToleranceLg
  && config.activeSurfaceOffsetMd === config.activeSurfaceOffsetLg
);

// Same one-time-copy "sync" mechanism PolymorphicLayout.panel.ts's own
// SYNC_COLORS_FROM_*_ACTION already uses for its column colors (see that
// file's own doc comment) — a button per tier, visible only while the two
// genuinely disagree, applying this tier's complete color config onto the
// other. Not a persistent "keep linked forever" toggle.
const SYNC_TIMELINE_LINK_COLOR_FROM_TABLET_ACTION: ConfigFieldAction<AbstractTimelineLinkColorConfig> = {
  kind: 'action',
  key: 'syncTimelineLinkColorFromTablet',
  label: 'Sync colors across breakpoints',
  description: 'Applies this tier\'s own link colors to the Desktop tier.',
  visibleWhen: config => !timelineLinkColorTiersInSync(config),
  onClick: config => ({
    colorModeLg: config.colorModeMd,
    backgroundColorLg: config.backgroundColorMd,
    textColorLg: config.textColorMd,
    backgroundColorActiveLg: config.backgroundColorActiveMd,
    textColorActiveLg: config.textColorActiveMd,
    darkInkSaturationLg: config.darkInkSaturationMd,
    darkInkOpacityMultiplierLg: config.darkInkOpacityMultiplierMd,
    lightInkToleranceLg: config.lightInkToleranceMd,
    activeSurfaceOffsetLg: config.activeSurfaceOffsetMd,
  }),
};

const SYNC_TIMELINE_LINK_COLOR_FROM_DESKTOP_ACTION: ConfigFieldAction<AbstractTimelineLinkColorConfig> = {
  kind: 'action',
  key: 'syncTimelineLinkColorFromDesktop',
  label: 'Sync colors across breakpoints',
  description: 'Applies this tier\'s own link colors to the Tablet tier.',
  visibleWhen: config => !timelineLinkColorTiersInSync(config),
  onClick: config => ({
    colorModeMd: config.colorModeLg,
    backgroundColorMd: config.backgroundColorLg,
    textColorMd: config.textColorLg,
    backgroundColorActiveMd: config.backgroundColorActiveLg,
    textColorActiveMd: config.textColorActiveLg,
    darkInkSaturationMd: config.darkInkSaturationLg,
    darkInkOpacityMultiplierMd: config.darkInkOpacityMultiplierLg,
    lightInkToleranceMd: config.lightInkToleranceLg,
    activeSurfaceOffsetMd: config.activeSurfaceOffsetLg,
  }),
};

export const ABSTRACT_TIMELINE_LINK_COLOR_SCOPE_ID = 'AbstractPage/timelineLinkColor' as const;

export const ABSTRACT_TIMELINE_LINK_COLOR_PANEL = defineConfigScope<AbstractTimelineLinkColorConfig>({
  id: ABSTRACT_TIMELINE_LINK_COLOR_SCOPE_ID,
  component: 'AboutTimeline',
  scope: 'content',
  title: 'Timeline link color',
  createdAt: '2026-09-25',
  summary: 'Mobile expanded text ink; tablet and desktop link backgrounds and text',
  defaultOpen: false,
  defaultValue: DEFAULT_ABSTRACT_TIMELINE_LINK_COLOR_CONFIG,
  fields: [
    {
      kind: 'boolean',
      key: 'enabled',
      label: 'Tablet and desktop enabled',
      description: 'Paints a background behind tablet and desktop Timeline links, with their own text color.',
    },
    {
      kind: 'tabs',
      tabs: [
        {
          id: 'mobile',
          label: 'MOBILE (< 768px)',
          fields: [
            {
              kind: 'boolean', key: 'enabledMobile', label: 'Expanded links enabled',
              description: 'Modulates only link text while the mobile Timeline list is expanded. Row backgrounds stay transparent; the collapsed list keeps its current appearance.',
            },
            {
              kind: 'enum', key: 'colorModeMobile', label: 'Color mode',
              options: TIMELINE_LINK_COLOR_MODE_OPTIONS,
              visibleWhen: config => config.enabledMobile,
            },
            {
              kind: 'group', label: 'Manual ink',
              fields: [
                { kind: 'color', key: 'textColorMobile', label: 'Text (default)', visibleWhen: config => config.enabledMobile && config.colorModeMobile === 'manual' },
                { kind: 'color', key: 'textColorActiveMobile', label: 'Text (hover/active)', visibleWhen: config => config.enabledMobile && config.colorModeMobile === 'manual' },
              ],
            },
            {
              kind: 'group', label: 'Derive from container',
              fields: [
                { kind: 'number', key: 'darkInkSaturationMobile', label: 'Dark ink saturation', description: '0 is neutral; 1 preserves the container hue; 2 doubles its saturation.', min: 0, max: 2, step: 0.01, visibleWhen: config => config.enabledMobile && config.colorModeMobile === 'deriveFromGradient' },
                { kind: 'number', key: 'darkInkOpacityMultiplierMobile', label: 'Dark ink opacity', description: 'Controls opacity of dark derived ink; contrast is resolved at the resulting opacity.', min: 0.2, max: 1, step: 0.01, visibleWhen: config => config.enabledMobile && config.colorModeMobile === 'deriveFromGradient' },
                { kind: 'number', key: 'lightInkToleranceMobile', label: 'Light ink tolerance', description: 'Allows a bounded contrast shortfall when preferring light ink.', min: 0, max: 20, step: 0.1, unit: 'ratio', visibleWhen: config => config.enabledMobile && config.colorModeMobile === 'deriveFromGradient' },
              ],
            },
          ],
        },
        {
          id: 'tablet',
          label: 'TABLET (≥ 768px)',
          fields: [
            {
              kind: 'enum',
              key: 'colorModeMd',
              label: 'Color mode',
              description: 'MANUAL: the colors below, used verbatim. DERIVE FROM GRADIENT: background and text are computed from the page\'s own live background gradient instead, via the same algorithm the narrow/wide column\'s own unified text ink already uses.',
              options: TIMELINE_LINK_COLOR_MODE_OPTIONS,
            },
            {
              kind: 'group',
              label: 'Manual colors',
              fields: [
                {
                  kind: 'color', key: 'backgroundColorMd', label: 'Background (default)',
                  visibleWhen: config => config.colorModeMd === 'manual',
                },
                {
                  kind: 'color', key: 'textColorMd', label: 'Text (default)',
                  visibleWhen: config => config.colorModeMd === 'manual',
                },
                {
                  kind: 'color', key: 'backgroundColorActiveMd', label: 'Background (hover/active)',
                  visibleWhen: config => config.colorModeMd === 'manual',
                },
                {
                  kind: 'color', key: 'textColorActiveMd', label: 'Text (hover/active)',
                  visibleWhen: config => config.colorModeMd === 'manual',
                },
              ],
            },
            {
              kind: 'group',
              label: 'Derive from gradient',
              fields: [
                {
                  kind: 'number',
                  key: 'darkInkSaturationMd',
                  label: 'Dark ink saturation',
                  description: 'Controls gradient saturation in dark derived text. 0 is neutral, 1 preserves the sampled saturation, and 2 doubles it.',
                  min: 0,
                  max: 2,
                  step: 0.01,
                  visibleWhen: config => config.colorModeMd === 'deriveFromGradient',
                },
                {
                  kind: 'number',
                  key: 'darkInkOpacityMultiplierMd',
                  label: 'Dark ink opacity',
                  description: 'Independent opacity multiplier for dark gradient-derived text. 1 preserves full opacity; lower values create a softer fusion.',
                  min: 0.2,
                  max: 1,
                  step: 0.01,
                  visibleWhen: config => config.colorModeMd === 'deriveFromGradient',
                },
                {
                  kind: 'number',
                  key: 'lightInkToleranceMd',
                  label: 'Light ink tolerance',
                  description: 'Allows light text over a light gradient by accepting a bounded contrast shortfall. 0 keeps strict automatic contrast; use sparingly.',
                  min: 0,
                  max: 20,
                  step: 0.1,
                  unit: 'ratio',
                  visibleWhen: config => config.colorModeMd === 'deriveFromGradient',
                },
                {
                  kind: 'number',
                  key: 'activeSurfaceOffsetMd',
                  label: 'Active surface offset',
                  description: 'Lightens (positive) or darkens (negative) the derived background for the hover/active chip, so it reads as lifted relative to the resting one. Text is re-resolved against the adjusted background.',
                  min: -1,
                  max: 1,
                  step: 0.01,
                  visibleWhen: config => config.colorModeMd === 'deriveFromGradient',
                },
              ],
            },
            SYNC_TIMELINE_LINK_COLOR_FROM_TABLET_ACTION,
          ],
        },
        {
          id: 'desktop',
          label: 'DESKTOP (≥ 1024px)',
          fields: [
            {
              kind: 'enum',
              key: 'colorModeLg',
              label: 'Color mode',
              description: 'Same behavior as Tablet\'s Color mode, independently tunable for this tier.',
              options: TIMELINE_LINK_COLOR_MODE_OPTIONS,
            },
            {
              kind: 'group',
              label: 'Manual colors',
              fields: [
                {
                  kind: 'color', key: 'backgroundColorLg', label: 'Background (default)',
                  visibleWhen: config => config.colorModeLg === 'manual',
                },
                {
                  kind: 'color', key: 'textColorLg', label: 'Text (default)',
                  visibleWhen: config => config.colorModeLg === 'manual',
                },
                {
                  kind: 'color', key: 'backgroundColorActiveLg', label: 'Background (hover/active)',
                  visibleWhen: config => config.colorModeLg === 'manual',
                },
                {
                  kind: 'color', key: 'textColorActiveLg', label: 'Text (hover/active)',
                  visibleWhen: config => config.colorModeLg === 'manual',
                },
              ],
            },
            {
              kind: 'group',
              label: 'Derive from gradient',
              fields: [
                {
                  kind: 'number',
                  key: 'darkInkSaturationLg',
                  label: 'Dark ink saturation',
                  description: 'Same behavior as Tablet\'s Dark ink saturation, independently tunable for this tier.',
                  min: 0,
                  max: 2,
                  step: 0.01,
                  visibleWhen: config => config.colorModeLg === 'deriveFromGradient',
                },
                {
                  kind: 'number',
                  key: 'darkInkOpacityMultiplierLg',
                  label: 'Dark ink opacity',
                  description: 'Same behavior as Tablet\'s Dark ink opacity, independently tunable for this tier.',
                  min: 0.2,
                  max: 1,
                  step: 0.01,
                  visibleWhen: config => config.colorModeLg === 'deriveFromGradient',
                },
                {
                  kind: 'number',
                  key: 'lightInkToleranceLg',
                  label: 'Light ink tolerance',
                  description: 'Same behavior as Tablet\'s Light ink tolerance, independently tunable for this tier.',
                  min: 0,
                  max: 20,
                  step: 0.1,
                  unit: 'ratio',
                  visibleWhen: config => config.colorModeLg === 'deriveFromGradient',
                },
                {
                  kind: 'number',
                  key: 'activeSurfaceOffsetLg',
                  label: 'Active surface offset',
                  description: 'Same behavior as Tablet\'s Active surface offset, independently tunable for this tier.',
                  min: -1,
                  max: 1,
                  step: 0.01,
                  visibleWhen: config => config.colorModeLg === 'deriveFromGradient',
                },
              ],
            },
            SYNC_TIMELINE_LINK_COLOR_FROM_DESKTOP_ACTION,
          ],
        },
      ],
    },
  ],
  copy: {
    targetFile: 'pages/abstract.config.ts',
    targetSymbol: 'DEFAULT_ABSTRACT_TIMELINE_LINK_COLOR_CONFIG',
    targetType: 'AbstractTimelineLinkColorConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});

export const ABSTRACT_FOOTER_PANEL = defineConfigScope<AbstractFooterConfig>({
  id: ABSTRACT_FOOTER_SCOPE_ID,
  component: 'SiteFooter',
  scope: 'content',
  title: 'Footer',
  createdAt: '2026-09-14',
  summary: 'Page links, contact line, spacing, color, and scroll-gradient return',
  defaultOpen: false,
  defaultValue: DEFAULT_ABSTRACT_FOOTER_CONFIG,
  fields: [
    {
      kind: 'boolean',
      key: 'enabled',
      label: 'Show footer (mobile)',
      description: 'Footer visibility below the tablet breakpoint.',
    },
    {
      kind: 'boolean',
      key: 'enabledWide',
      label: 'Show footer (tablet)',
      description: 'Footer visibility from the tablet breakpoint upward until desktop.',
    },
    {
      kind: 'boolean',
      key: 'enabledLg',
      label: 'Show footer (desktop)',
      description: 'Footer visibility from the desktop breakpoint upward.',
    },
    {
      kind: 'group',
      label: 'Surface and ink',
      fields: [
        {
          kind: 'enum',
          key: 'backgroundMode',
          label: 'Background',
          options: [
            { label: 'TRANSPARENT', value: 'transparent' },
            { label: 'SURFACE', value: 'surface' },
            { label: 'CUSTOM', value: 'custom' },
            { label: 'GRADIENT DARKEST', value: 'gradientDarkest' },
          ],
        },
        {
          kind: 'color',
          key: 'backgroundColor',
          label: 'Background color',
          visibleWhen: config => config.backgroundMode === 'custom',
        },
        {
          kind: 'number',
          key: 'backgroundOpacity',
          label: 'Background opacity',
          description: 'Alpha applied on top of the resolved background color. No effect while Background is TRANSPARENT.',
          min: 0,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.backgroundMode !== 'transparent',
        },
        {
          kind: 'enum',
          key: 'textColorMode',
          label: 'Text color',
          options: [
            { label: 'DERIVED', value: 'derived' },
            { label: 'CUSTOM', value: 'custom' },
          ],
        },
        {
          kind: 'color',
          key: 'textColor',
          label: 'Title/contact color',
          visibleWhen: config => config.textColorMode === 'custom',
        },
        {
          kind: 'color',
          key: 'descriptionColor',
          label: 'Description color',
          visibleWhen: config => config.textColorMode === 'custom',
        },
        {
          kind: 'number',
          key: 'textSurfaceOffset',
          label: 'Title/contact offset',
          min: -1,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.textColorMode === 'derived',
        },
        {
          kind: 'number',
          key: 'descriptionSurfaceOffset',
          label: 'Description offset',
          min: -1,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.textColorMode === 'derived',
        },
        {
          kind: 'boolean',
          key: 'adaptiveInkEnabled',
          label: 'Adaptive scroll ink',
          description: 'Use the same scroll-driven white-mix and contrast correction as the hero text.',
        },
        {
          kind: 'number',
          key: 'adaptiveInkMaxAmount',
          label: 'Adaptive max mix',
          min: 0,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.adaptiveInkEnabled,
        },
        {
          kind: 'number',
          key: 'adaptiveInkTargetContrastRatio',
          label: 'Adaptive contrast target',
          min: 0,
          max: 21,
          step: 0.1,
          visibleWhen: config => config.adaptiveInkEnabled,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Layout',
      fields: [
        tailwindFooterField('paddingY', {
          key: 'sectionPaddingYClassName',
          label: 'Section vertical padding',
          description: 'Tailwind vertical padding scale.',
        }),
        tailwindFooterField('gap', {
          key: 'pageItemGapClassName',
          label: 'Page item gap',
          description: 'Tailwind gap scale.',
        }),
        tailwindFooterField('paddingY', {
          key: 'pageItemPaddingYClassName',
          label: 'Item vertical padding',
          description: 'Tailwind vertical padding scale.',
        }),
        tailwindFooterField('paddingX', {
          key: 'pageItemPaddingXClassName',
          label: 'Item horizontal padding',
          description: 'Tailwind horizontal padding scale.',
        }),
        tailwindFooterField('paddingBottom', {
          key: 'pageTitlePaddingBottomClassName',
          label: 'Title bottom padding',
          description: 'Tailwind padding-bottom scale.',
        }),
        tailwindFooterField('fontSize', {
          key: 'pageTitleFontSizeClassName',
          label: 'Title font size',
        }),
        tailwindFooterField('fontWeight', {
          key: 'pageTitleFontWeightClassName',
          label: 'Title font weight',
        }),
        tailwindFooterField('paddingTop', {
          key: 'pageDescriptionPaddingTopClassName',
          label: 'Description top padding',
          description: 'Tailwind padding-top scale.',
        }),
        tailwindFooterField('marginTop', {
          key: 'pageDescriptionMarginTopClassName',
          label: 'Title-description gap',
          description: 'Tailwind margin-top scale for the space between each footer link title and description.',
        }),
        tailwindFooterField('fontSize', {
          key: 'pageDescriptionFontSizeClassName',
          label: 'Description font size',
        }),
        tailwindFooterField('fontWeight', {
          key: 'pageDescriptionFontWeightClassName',
          label: 'Description font weight',
        }),
      ],
    },
    {
      kind: 'group',
      label: 'Page links',
      fields: [
        {
          kind: 'boolean',
          key: 'pageLinkBulletEnabled',
          label: 'Show link bullet',
          description: 'Opt-in active-item marker inherited from the shared accordion item.',
        },
        {
          kind: 'boolean',
          key: 'pageLinkBorderEnabled',
          label: 'Show link dividers',
          description: 'Opt-in separator line on each footer page item.',
        },
        tailwindFooterField('borderTopWidth', {
          key: 'pageLinkBorderWidthClassName',
          label: 'Divider thickness',
          description: 'Tailwind border-top width scale.',
          visibleWhen: config => config.pageLinkBorderEnabled,
        }),
        {
          kind: 'enum',
          key: 'pageLinkBorderColorMode',
          label: 'Divider color',
          options: [
            { label: 'DERIVED', value: 'derived' },
            { label: 'CUSTOM', value: 'custom' },
          ],
          visibleWhen: config => config.pageLinkBorderEnabled,
        },
        {
          kind: 'number',
          key: 'pageLinkBorderSurfaceOffset',
          label: 'Divider color offset',
          min: -1,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.pageLinkBorderEnabled && config.pageLinkBorderColorMode === 'derived',
        },
        {
          kind: 'color',
          key: 'pageLinkBorderColor',
          label: 'Divider custom color',
          visibleWhen: config => config.pageLinkBorderEnabled && config.pageLinkBorderColorMode === 'custom',
        },
        {
          kind: 'number',
          key: 'pageLinkBorderOpacity',
          label: 'Divider opacity',
          min: 0,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.pageLinkBorderEnabled,
        },
        { kind: 'boolean', key: 'abstractEnabled', label: 'Show Abstract' },
        { kind: 'text', key: 'abstractTitle', label: 'Abstract title' },
        { kind: 'text', key: 'abstractDescription', label: 'Abstract description' },
        { kind: 'boolean', key: 'aboutEnabled', label: 'Show About' },
        { kind: 'text', key: 'aboutTitle', label: 'About title' },
        { kind: 'text', key: 'aboutDescription', label: 'About description' },
        { kind: 'boolean', key: 'journalEnabled', label: 'Show Journal' },
        { kind: 'text', key: 'journalTitle', label: 'Journal title' },
        { kind: 'text', key: 'journalDescription', label: 'Journal description' },
        { kind: 'boolean', key: 'contactEnabled', label: 'Show Contact' },
        { kind: 'text', key: 'contactTitle', label: 'Contact title' },
        { kind: 'text', key: 'contactDescription', label: 'Contact description' },
      ],
    },
    {
      kind: 'group',
      label: 'Top border',
      fields: [
        {
          kind: 'boolean',
          key: 'topBorderEnabled',
          label: 'Show top border',
          description: 'A single rule along the whole footer’s top edge, separate from the per-item link dividers above.',
        },
        tailwindFooterField('borderTopWidth', {
          key: 'topBorderWidthClassName',
          label: 'Top border thickness',
          description: 'Tailwind border-top width scale.',
          visibleWhen: config => config.topBorderEnabled,
        }),
        {
          kind: 'enum',
          key: 'topBorderColorMode',
          label: 'Top border color',
          options: [
            { label: 'DERIVED', value: 'derived' },
            { label: 'CUSTOM', value: 'custom' },
            { label: 'GRADIENT DARKEST', value: 'gradientDarkest' },
          ],
          visibleWhen: config => config.topBorderEnabled,
        },
        {
          kind: 'number',
          key: 'topBorderSurfaceOffset',
          label: 'Top border color offset',
          min: -1,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.topBorderEnabled && config.topBorderColorMode === 'derived',
        },
        {
          kind: 'color',
          key: 'topBorderColor',
          label: 'Top border custom color',
          visibleWhen: config => config.topBorderEnabled && config.topBorderColorMode === 'custom',
        },
        {
          kind: 'number',
          key: 'topBorderOpacity',
          label: 'Top border opacity',
          min: 0,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.topBorderEnabled,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Contact and wordmark',
      fields: [
        { kind: 'text', key: 'navigationLabel', label: 'Navigation label' },
        tailwindFooterField('fontSize', {
          key: 'contactFontSizeClassName',
          label: 'Contact font size',
        }),
        tailwindFooterField('fontWeight', {
          key: 'contactFontWeightClassName',
          label: 'Contact font weight',
        }),
        {
          kind: 'boolean',
          key: 'contactEmailEnabled',
          label: 'Show email line',
        },
        tailwindFooterField('marginTop', {
          key: 'contactSpaceBeforeClassName',
          label: 'Space before contact',
          description: 'Tailwind margin-top scale.',
        }),
        {
          kind: 'text',
          key: 'contactText',
          label: 'Contact email',
          description: 'Rendered as a mailto link.',
          visibleWhen: config => config.contactEmailEnabled,
        },
        tailwindFooterField('marginTop', {
          key: 'wordmarkSpaceBeforeClassName',
          label: 'Space before wordmark',
          description: 'Tailwind margin-top scale.',
        }),
        {
          kind: 'number',
          key: 'wordmarkOpacity',
          label: 'Wordmark opacity',
          min: 0,
          max: 1,
          step: 0.01,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Scroll-gradient return',
      fields: [
        {
          kind: 'boolean',
          key: 'backgroundReturnToLightEnabled',
          label: 'Return gradient to light',
          description: 'Opt-in phase that eases the scroll-gradient dark overlay back down once the footer starts.',
        },
        {
          kind: 'number',
          key: 'backgroundReturnToLightRangeVh',
          label: 'Return range',
          min: 0.1,
          max: 4,
          step: 0.1,
          unit: 'vh',
          visibleWhen: config => config.backgroundReturnToLightEnabled,
        },
        {
          kind: 'number',
          key: 'backgroundReturnToLightFinalDarken',
          label: 'Final darken',
          min: 0,
          max: 1,
          step: 0.01,
          visibleWhen: config => config.backgroundReturnToLightEnabled,
        },
      ],
    },
  ],
  copy: {
    targetFile: 'pages/abstract.config.ts',
    targetSymbol: 'DEFAULT_ABSTRACT_FOOTER_CONFIG',
    targetType: 'AbstractFooterConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});

export const ABSTRACT_TIMELINE_CONTENT_SCOPE_ID = 'AbstractPage/timelineContent' as const;

export const ABSTRACT_TIMELINE_CONTENT_PANEL = defineConfigScope<AbstractTimelineContentConfig>({
  id: ABSTRACT_TIMELINE_CONTENT_SCOPE_ID,
  component: 'AboutTimeline',
  scope: 'content',
  title: 'Timeline content',
  createdAt: '2026-09-02',
  summary: 'Visible article count and ordering shared with CoverFlow',
  defaultOpen: false,
  defaultValue: DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG,
  fields: [
    {
      kind: 'number',
      key: 'visibleItemCount',
      label: 'Visible article count',
      description: 'How many articles appear in both the timeline and CoverFlow. The selected ordering determines which top N articles are retained.',
      min: 1,
      max: 100,
      step: 1,
      integer: true,
    },
    {
      kind: 'enum',
      key: 'order',
      label: 'Article order',
      description: 'Controls the shared sequence used by the timeline and CoverFlow. Newest first is the current publication order.',
      options: [
        { label: 'NEWEST FIRST', value: 'newest' },
        { label: 'OLDEST FIRST', value: 'oldest' },
        { label: 'TITLE A–Z', value: 'titleAsc' },
        { label: 'TITLE Z–A', value: 'titleDesc' },
      ],
    },
  ],
  copy: {
    targetFile: 'pages/abstract.config.ts',
    targetSymbol: 'DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG',
    targetType: 'AbstractTimelineContentConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});

export const ABSTRACT_MOBILE_ARTICLE_LIST_INK_SCOPE_ID = 'AbstractPage/mobileArticleListInk' as const;

/**
 * Single shared ink color for the mobile article list's own row text —
 * see AbstractMobileArticleListInkConfig's own doc comment
 * (pages/abstract.config.ts) for why this replaced two independently-
 * tinted active/inactive colors. Operator ask, PLAN-MOBILE-ARTICLE-LIST-
 * SHARED-INK.md.
 */
export const ABSTRACT_MOBILE_ARTICLE_LIST_INK_PANEL = defineConfigScope<AbstractMobileArticleListInkConfig>({
  id: ABSTRACT_MOBILE_ARTICLE_LIST_INK_SCOPE_ID,
  component: 'AboutTimeline',
  scope: 'appearance',
  title: 'Mobile article list ink',
  createdAt: '2026-09-13',
  summary: 'Shared tint, saturation, and lightness bounds for the mobile article list\'s row text',
  defaultOpen: false,
  defaultValue: DEFAULT_ABSTRACT_MOBILE_ARTICLE_LIST_INK_CONFIG,
  fields: [
    {
      kind: 'number',
      key: 'hue',
      label: 'Tint (hue)',
      description: 'The row text\'s own fixed hue, independent of whatever the scroll-gradient background currently is. Active vs. inactive rows share this exact color — only opacity (AboutTimeline\'s own existing knobs) tells them apart.',
      min: 0,
      max: 360,
      step: 1,
      unit: '°',
    },
    {
      kind: 'number',
      key: 'saturation',
      label: 'Saturation',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
    },
    {
      kind: 'number',
      key: 'minLightness',
      label: 'Min light',
      description: 'Floor when the ink resolves to a light color — never dimmer than this, even if the target contrast ratio would technically allow it.',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
    },
    {
      kind: 'number',
      key: 'minDarkness',
      label: 'Min dark',
      description: 'The equivalent floor on the dark side — how much darkness is guaranteed when the ink resolves to a dark color, never lighter than (100 - this value).',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
    },
    {
      kind: 'number',
      key: 'minContrastRatio',
      label: 'Guaranteed contrast ratio',
      min: 1,
      max: 21,
      step: 0.5,
    },
  ],
  copy: {
    targetFile: 'pages/abstract.config.ts',
    targetSymbol: 'DEFAULT_ABSTRACT_MOBILE_ARTICLE_LIST_INK_CONFIG',
    targetType: 'AbstractMobileArticleListInkConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});

export const ABSTRACT_HERO_ACCORDION_ITEM_SCOPE_ID = 'AbstractPage/heroAccordionItem' as const;

/**
 * AbstractEditorialHero's own accordionItemPresentationEnabled (AbstractEditorialHero
 * .config.ts) reuses AboutMobileAccordionItem verbatim — this scope exposes
 * that reused item's own font-size/spacing/open-indicator controls. The
 * three breakpoint tabs use the shared Tailwind field factory, so each
 * control reads the generated project token set rather than a local list.
 * Bound to this
 * page's OWN instance (DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG,
 * abstract.config.ts) — not /about's own ABOUT_MOBILE_ACCORDION_PANEL scope
 * — so a panel edit here never retunes /about's real mobile accordion, and
 * vice versa (same class of bug ABOUT_DEFAULT_DOCK_PALETTE_CONFIG's own doc
 * comment, about.config.ts, already documents and fixes for a different
 * scope).
 */
export const ABSTRACT_HERO_ACCORDION_ITEM_PANEL = defineConfigScope<AboutMobileAccordionConfig>({
  id: ABSTRACT_HERO_ACCORDION_ITEM_SCOPE_ID,
  component: 'AbstractEditorialHero',
  scope: 'appearance',
  title: 'Hero accordion item',
  createdAt: '2026-09-12',
  summary: 'Breakpoint-specific font size and padding for the reused accordion-item hero presentation',
  defaultOpen: false,
  defaultValue: DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG,
  fields: EDITORIAL_ACCORDION_ITEM_FIELDS,
  hiddenKeys: EDITORIAL_ACCORDION_ITEM_HIDDEN_KEYS,
  copy: {
    targetFile: 'pages/abstract.config.ts',
    targetSymbol: 'DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG',
    targetType: 'AboutMobileAccordionConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
