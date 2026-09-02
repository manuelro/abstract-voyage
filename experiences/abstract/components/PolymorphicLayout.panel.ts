import type { ConfigScopeEntry } from '../../../components/Panel/config';
import type { ConfigFieldAction, ConfigFieldDefinition } from '../../../components/Panel/config/types';
import {
  CONTENT_WIDTH_PERCENT_OPTIONS,
  CONTENT_WIDTH_PERCENT_WIDE_OPTIONS,
  CONTENT_WIDTH_PERCENT_LG_OPTIONS,
} from '../../../components/tailwindWidthScale';
import {
  MAX_WIDTH_OPTIONS,
  MAX_WIDTH_WIDE_OPTIONS,
  MAX_WIDTH_LG_OPTIONS,
} from '../../../components/tailwindTypographyScale';
import { CONTENT_MIN_HEIGHT_OPTIONS } from '../../../components/tailwindMinHeightScale';
import {
  PADDING_TOP_OPTIONS,
  PADDING_TOP_WIDE_OPTIONS,
  PADDING_TOP_LG_OPTIONS,
  PADDING_RIGHT_OPTIONS,
  PADDING_RIGHT_WIDE_OPTIONS,
  PADDING_RIGHT_LG_OPTIONS,
  PADDING_BOTTOM_OPTIONS,
  PADDING_BOTTOM_WIDE_OPTIONS,
  PADDING_BOTTOM_LG_OPTIONS,
  PADDING_LEFT_OPTIONS,
  PADDING_LEFT_WIDE_OPTIONS,
  PADDING_LEFT_LG_OPTIONS,
  MARGIN_TOP_OPTIONS,
  MARGIN_TOP_WIDE_OPTIONS,
  MARGIN_TOP_LG_OPTIONS,
  MARGIN_RIGHT_OPTIONS,
  MARGIN_RIGHT_WIDE_OPTIONS,
  MARGIN_RIGHT_LG_OPTIONS,
  MARGIN_BOTTOM_OPTIONS,
  MARGIN_BOTTOM_WIDE_OPTIONS,
  MARGIN_BOTTOM_LG_OPTIONS,
  MARGIN_LEFT_OPTIONS,
  MARGIN_LEFT_WIDE_OPTIONS,
  MARGIN_LEFT_LG_OPTIONS,
} from '../../../components/tailwindSpacingScale';
import type { PolymorphicLayoutConfig } from './PolymorphicLayout.config';

// Promoted from pages/posts-lab/postLab.panel.ts (PLAN-SPLIT-COLUMN-LAYOUT-
// ENRICHMENT-EXTRACTION.md Stage 1) — the entire field structure (HEADER/
// CONTENT areas, four device tabs, every group/subgroup) for
// PolymorphicLayoutConfig, exported as a plain field array rather than a
// registered scope. Mirrors SITE_HEADER_COLOR_FIELDS's own reuse shape
// (experiences/abstract/components/SiteHeader/config/panel.ts) — a
// consuming page wraps this array in its own `defineConfigScope(...)` call
// (id/title/defaultValue/copy target are page-owned), the same way
// pages/posts-lab/postLab.panel.ts does today. Posts-lab is this array's
// first and, for now, only consumer.

const HORIZONTAL_ALIGN_OPTIONS = [
  { label: 'START', value: 'items-start' },
  { label: 'CENTER', value: 'items-center' },
  { label: 'END', value: 'items-end' },
] as const;

const VERTICAL_ALIGN_OPTIONS = [
  { label: 'TOP', value: 'justify-start' },
  { label: 'MIDDLE', value: 'justify-center' },
  { label: 'BOTTOM', value: 'justify-end' },
] as const;

// Header segment/inner-alignment fields below hold literal justify-content/
// align-items classes directly (like HORIZONTAL_ALIGN_OPTIONS/
// VERTICAL_ALIGN_OPTIONS above, not SiteHeaderConfig's own enum
// vocabulary) — headerContentLayoutOwnedByPage (SiteHeader.config.ts)
// turns off the shared component's own alignment mechanism for this page
// entirely, so these values are consumed as plain classes at this page's
// own effectiveSiteHeaderConfig call site, one real tier per breakpoint tab
// instead of one shared value shown only here.
const HEADER_SEGMENT_JUSTIFY_OPTIONS = [
  { label: 'START', value: 'justify-start' },
  { label: 'CENTER', value: 'justify-center' },
  { label: 'END', value: 'justify-end' },
] as const;
const HEADER_SEGMENT_JUSTIFY_WIDE_OPTIONS = [
  { label: 'START', value: 'md:justify-start' },
  { label: 'CENTER', value: 'md:justify-center' },
  { label: 'END', value: 'md:justify-end' },
] as const;
const HEADER_SEGMENT_JUSTIFY_LG_OPTIONS = [
  { label: 'START', value: 'lg:justify-start' },
  { label: 'CENTER', value: 'lg:justify-center' },
  { label: 'END', value: 'lg:justify-end' },
] as const;
const HEADER_SEGMENT_ITEMS_OPTIONS = [
  { label: 'START', value: 'items-start' },
  { label: 'CENTER', value: 'items-center' },
  { label: 'END', value: 'items-end' },
] as const;
const HEADER_SEGMENT_ITEMS_WIDE_OPTIONS = [
  { label: 'START', value: 'md:items-start' },
  { label: 'CENTER', value: 'md:items-center' },
  { label: 'END', value: 'md:items-end' },
] as const;
const HEADER_SEGMENT_ITEMS_LG_OPTIONS = [
  { label: 'START', value: 'lg:items-start' },
  { label: 'CENTER', value: 'lg:items-center' },
  { label: 'END', value: 'lg:items-end' },
] as const;

const HEADER_CONTENT_WIDTH_OPTIONS_BASE = [
  { label: 'AUTO (shrink to fit)', value: 'auto' },
  ...CONTENT_WIDTH_PERCENT_OPTIONS,
] as const;
const HEADER_CONTENT_WIDTH_OPTIONS = [
  { label: 'AUTO (shrink to fit)', value: 'auto' },
  ...CONTENT_WIDTH_PERCENT_WIDE_OPTIONS,
] as const;
const HEADER_CONTENT_WIDTH_OPTIONS_LG = [
  { label: 'AUTO (shrink to fit)', value: 'auto' },
  ...CONTENT_WIDTH_PERCENT_LG_OPTIONS,
] as const;
// wideColumnContentWidthWide/-Lg's own options — HEADER_CONTENT_WIDTH_OPTIONS/
// -_LG above, plus 'match-narrow-column' (see that field's own doc comment,
// PolymorphicLayout.config.ts): caps the wide column's content to the narrow
// column's own real absolute width, whatever ratio narrowColumnWidthTierMd/Lg
// is actually configured to, instead of a fixed percentage. Only the wide
// column's own width fields get this option — narrowColumnContentWidthWide/-Lg
// keep the plain HEADER_CONTENT_WIDTH_OPTIONS/-_LG above (matching >100% of
// the narrow column's own box isn't expressible via max-width).
const WIDE_COLUMN_CONTENT_WIDTH_OPTIONS = [
  ...HEADER_CONTENT_WIDTH_OPTIONS,
  { label: 'MATCH NARROW COLUMN', value: 'match-narrow-column' },
] as const;
const WIDE_COLUMN_CONTENT_WIDTH_OPTIONS_LG = [
  ...HEADER_CONTENT_WIDTH_OPTIONS_LG,
  { label: 'MATCH NARROW COLUMN', value: 'match-narrow-column' },
] as const;

// *ColumnContentMaxWidth* fields' own options — a rem-based cap, alongside
// (not instead of) the percentage width fields above. 'NONE' (default)
// applies no cap. See narrowColumnContentMaxWidth's own doc comment
// (PolymorphicLayout.config.ts) for why this field exists as its own thing:
// it stays effective under a containerQuery ancestor, where the percentage
// width fields above silently fall back to shrink-to-fit/full.
const CONTENT_MAX_WIDTH_OPTIONS_BASE = [
  { label: 'NONE', value: 'none' },
  ...MAX_WIDTH_OPTIONS,
] as const;
const CONTENT_MAX_WIDTH_OPTIONS_WIDE = [
  { label: 'NONE', value: 'none' },
  ...MAX_WIDTH_WIDE_OPTIONS,
] as const;
const CONTENT_MAX_WIDTH_OPTIONS_LG = [
  { label: 'NONE', value: 'none' },
  ...MAX_WIDTH_LG_OPTIONS,
] as const;

const HEADER_SCROLL_BEHAVIOR_OPTIONS = [
  { label: 'FIXED', value: 'fixed' },
  { label: 'STICKY', value: 'sticky' },
  { label: 'STATIC', value: 'static' },
] as const;

// 'select' (a native <select>), not 'enum' (SegmentedControl) — 7 options
// is past SegmentedControl's legible ceiling (~6-8 fixed-width buttons).
// Labels spell out the literal ratio so picking one reads as "choose a
// split," not as an abstract token. Exported so any field elsewhere in
// this file needing the same ratio-tier vocabulary (e.g. the
// splitBandWidthTier* fields below, a decorative header element's own
// split ratio, independent of the base column split) reuses this one list
// rather than a second, hand-copied one that could silently drift.
// Declared locally — not imported from components/SplitColumnLayout.panel.ts
// — per this file's own operational-independence requirement (see
// PolymorphicLayout.config.ts's own note); structurally identical to that
// file's own RATIO_TIER_OPTIONS, which is exactly why no shared import is
// needed for the two to stay interchangeable in practice.
export const RATIO_TIER_OPTIONS = [
  { label: 'Stacked (no split)', value: 'stacked' },
  { label: '30% / 70%', value: '30/70' },
  { label: '35% / 65%', value: '35/65' },
  { label: '38% / 62% (default)', value: '38/62' },
  { label: '40% / 60%', value: '40/60' },
  { label: '45% / 55%', value: '45/55' },
  { label: '50% / 50%', value: '50/50' },
] as const;

const CONTENT_CONTAINER_OPTIONS = [
  { label: 'BOUNDED', value: 'bounded' },
  { label: 'FULL-BLEED', value: 'full-bleed' },
] as const;

// PolymorphicLayout's own base-field panel entries — the 17 fields
// PolymorphicLayoutConfig declares directly (components/PolymorphicLayout.config.ts's
// own operational-independence note), plus contentContainer (the one
// primitive genuinely promoted from about.tsx — see
// PLAN-SPLIT-COLUMN-LAYOUT-ENRICHMENT-EXTRACTION.md's own "Worth-
// transferring" section). Declared directly against PolymorphicLayoutConfig
// — no cast needed, unlike a reused foreign-typed array would require —
// since this file owns both the type and the field definitions now.
// Exported (not just used internally to build POLYMORPHIC_LAYOUT_FIELDS's
// own nested tree below) so a page whose own render code only wires a
// subset of these base fields — e.g. pages/about.config.ts's own
// ABOUT_POLYMORPHIC_LAYOUT_PANEL — can filter this flat array down to just
// its own connected keys, rather than needing the full nested HEADER/
// CONTENT tree POLYMORPHIC_LAYOUT_FIELDS builds for posts-lab's own richer
// per-breakpoint needs. A plain `.filter()` on this flat array is all a
// page like that needs — the same shape fieldsWithKeys/fieldsExcludingKeys
// below already use internally, just exposed for external reuse too.
export const POLYMORPHIC_LAYOUT_BASE_FIELDS: ReadonlyArray<NonTabsEntry<PolymorphicLayoutConfig>> = [
  {
    kind: 'enum',
    key: 'contentContainer',
    debugHighlightIds: ['BODY'],
    label: 'Content container',
    description: 'Bounded: the whole body grid (both columns together) sits inside a max-width, centered wrapper. Full-bleed: the body grid renders directly, no cap, no centering — its columns reach the true viewport edge, on both sides simultaneously (this is always a single toggle over the entire two-column grid as one unit, never a per-column setting). The Body gutter group (Mobile/Tablet/Desktop tabs below) only has an effect while this is Bounded.',
    options: CONTENT_CONTAINER_OPTIONS,
  },
  {
    kind: 'enum',
    key: 'wideColumnContentContainer',
    debugHighlightIds: ['WIDE COLUMN'],
    label: 'Wide column content container',
    description: 'Independent of Content container above, which only controls the outer body grid. Bounded: this column\'s own children sit inside a width-capped, aligned wrapper (Content align/width fields below). Full-bleed: children render directly, no width cap, no alignment margin, no min-height wrapper — fill the column edge-to-edge.',
    options: CONTENT_CONTAINER_OPTIONS,
  },
  {
    kind: 'enum',
    key: 'wideColumnContentHeight',
    debugHighlightIds: ['WIDE COLUMN CONTENT'],
    label: 'Wide content height',
    description: 'Auto preserves intrinsic height. Fill column follows the parent column\'s resolved height. Fill viewport uses the visible viewport slot while the columns sit side by side.',
    options: [
      { label: 'AUTO', value: 'auto' },
      { label: 'FILL COLUMN', value: 'full' },
      { label: 'FILL VIEWPORT', value: 'viewport' },
    ],
  },
  {
    kind: 'enum',
    key: 'narrowColumnContentContainer',
    debugHighlightIds: ['NARROW COLUMN'],
    label: 'Narrow column content container',
    description: 'Same idea as Wide column content container, for the narrow column\'s own children instead — independently configurable.',
    options: CONTENT_CONTAINER_OPTIONS,
  },
  {
    kind: 'enum',
    key: 'narrowColumnContentHeight',
    debugHighlightIds: ['NARROW COLUMN CONTENT'],
    label: 'Narrow content height',
    description: 'Auto preserves intrinsic height. Fill column follows the parent column\'s resolved height, allowing a page-owned slot to subdivide it. Fill viewport uses the visible viewport slot while the columns sit side by side.',
    options: [
      { label: 'AUTO', value: 'auto' },
      { label: 'FILL COLUMN', value: 'full' },
      { label: 'FILL VIEWPORT', value: 'viewport' },
    ],
  },
  {
    kind: 'enum',
    key: 'wideColumnSide',
    debugHighlightIds: ['WIDE COLUMN', 'NARROW COLUMN'],
    label: 'Wide column side',
    description: 'Which physical side gets the wider (62%) column.',
    options: [
      { label: 'LEFT', value: 'left' },
      { label: 'RIGHT', value: 'right' },
    ],
  },
  {
    kind: 'select',
    key: 'narrowColumnWidthTierMd',
    debugHighlightIds: ['WIDE COLUMN', 'NARROW COLUMN'],
    label: 'Column split (≥ tablet)',
    description: '"Stacked" keeps both columns full-width, one on top of the other — no split at this breakpoint at all. Any ratio splits into two real columns at this width, narrow%/wide%. 38/62 (default) reproduces this layout\'s original, single-breakpoint behavior exactly.',
    options: RATIO_TIER_OPTIONS,
  },
  {
    kind: 'select',
    key: 'narrowColumnWidthTierLg',
    debugHighlightIds: ['WIDE COLUMN', 'NARROW COLUMN'],
    label: 'Column split (≥ desktop)',
    description: 'Same as the tablet field above, at the wider breakpoint instead — lets a page defer its split past a cramped intermediate width by staying "Stacked" here\'s own sibling field and only splitting once there\'s real room. 38/62 (default), matching the field above\'s own default, reproduces the original single-breakpoint split with no visible change from adding this field alone.',
    options: RATIO_TIER_OPTIONS,
  },
  {
    kind: 'enum',
    key: 'stackedColumnOrder',
    debugHighlightIds: ['WIDE COLUMN', 'NARROW COLUMN'],
    label: 'Stacked order',
    description: 'Which column renders first while the layout is stacked (either width field above is "Stacked", or the viewport is narrower than both). NARROW FIRST (default) matches this layout\'s real DOM order today. WIDE FIRST visually reorders via CSS only — a screen reader still encounters the columns in their real DOM order regardless of this setting (WCAG 1.3.2/2.4.3), so choose it deliberately, e.g. when the narrow column is long navigational content that would otherwise bury the page\'s own primary content far down the page for a mobile reader.',
    options: [
      { label: 'NARROW FIRST', value: 'narrowFirst' },
      { label: 'WIDE FIRST', value: 'wideFirst' },
    ],
  },
  {
    kind: 'enum',
    key: 'wideColumnHeaderBehavior',
    label: 'Wide column · header',
    description: 'Push down: this column reserves space below the fixed header, same as before it became fixed. Float: no reserved space — this column starts at the true viewport top and the header floats over it.',
    options: [
      { label: 'PUSH DOWN', value: 'pushDown' },
      { label: 'FLOAT', value: 'float' },
    ],
  },
  {
    kind: 'enum',
    key: 'narrowColumnHeaderBehavior',
    label: 'Narrow column · header',
    description: 'Push down: this column reserves space below the fixed header, same as before it became fixed. Float: no reserved space — this column starts at the true viewport top and the header floats over it.',
    options: [
      { label: 'PUSH DOWN', value: 'pushDown' },
      { label: 'FLOAT', value: 'float' },
    ],
  },
  {
    kind: 'boolean',
    key: 'legibilityScrimEnabled',
    label: 'Header legibility blur',
    description: 'Off by default. When on, blurs behind the header on whichever side(s) above are set to FLOAT, so nav text/logo stay legible over real content bleeding underneath — a PUSH DOWN side never gets it, since nothing renders under the header there.',
  },
  {
    kind: 'boolean',
    key: 'wideColumnClearsFloatingHeader',
    label: 'Wide column clears floating header (mobile)',
    description: 'Only meaningful while Wide column · header above is FLOAT. On: this column\'s own outer box gets a live, continuously re-measured top-padding floor equal to the header\'s real current bottom edge plus 24px breathing room. It overrides the configured Mobile padding top while active.',
    visibleWhen: config => config.wideColumnHeaderBehavior === 'float',
    debugHighlightIds: ['WIDE COLUMN'],
  },
  {
    kind: 'boolean',
    key: 'wideColumnClearsFloatingHeaderWide',
    label: 'Wide column clears floating header (≥ tablet)',
    description: 'Tablet override of the Mobile floating-header clearance setting.',
    visibleWhen: config => config.wideColumnHeaderBehavior === 'float',
    debugHighlightIds: ['WIDE COLUMN'],
  },
  {
    kind: 'boolean',
    key: 'wideColumnClearsFloatingHeaderLg',
    label: 'Wide column clears floating header (≥ desktop)',
    description: 'Desktop override of the Tablet floating-header clearance setting.',
    visibleWhen: config => config.wideColumnHeaderBehavior === 'float',
    debugHighlightIds: ['WIDE COLUMN'],
  },
  {
    kind: 'boolean',
    key: 'narrowColumnClearsFloatingHeader',
    label: 'Narrow column clears floating header (mobile)',
    description: 'Same as the Wide column control, for the narrow column. It overrides the configured Mobile padding top while active and is only meaningful while Narrow column · header is FLOAT.',
    visibleWhen: config => config.narrowColumnHeaderBehavior === 'float',
    debugHighlightIds: ['NARROW COLUMN'],
  },
  {
    kind: 'boolean',
    key: 'narrowColumnClearsFloatingHeaderWide',
    label: 'Narrow column clears floating header (≥ tablet)',
    description: 'Tablet override of the Mobile floating-header clearance setting.',
    visibleWhen: config => config.narrowColumnHeaderBehavior === 'float',
    debugHighlightIds: ['NARROW COLUMN'],
  },
  {
    kind: 'boolean',
    key: 'narrowColumnClearsFloatingHeaderLg',
    label: 'Narrow column clears floating header (≥ desktop)',
    description: 'Desktop override of the Tablet floating-header clearance setting.',
    visibleWhen: config => config.narrowColumnHeaderBehavior === 'float',
    debugHighlightIds: ['NARROW COLUMN'],
  },
  {
    kind: 'enum',
    key: 'colorSource',
    label: 'Color source',
    description: 'None: no background, the page surface shows through. Palette: derived from the card coloring engine\'s ramp. Custom: the two fixed colors below. Surface: derived from the page surface color, offset by the amounts below.',
    options: [
      { label: 'NONE', value: 'none' },
      { label: 'PALETTE', value: 'palette' },
      { label: 'CUSTOM', value: 'custom' },
      { label: 'SURFACE', value: 'surface' },
    ],
  },
  {
    kind: 'color',
    key: 'wideColumnCustomColor',
    label: 'Wide column custom color',
    visibleWhen: config => config.colorSource === 'custom',
  },
  {
    kind: 'color',
    key: 'narrowColumnCustomColor',
    label: 'Narrow column custom color',
    visibleWhen: config => config.colorSource === 'custom',
  },
  {
    kind: 'number',
    key: 'wideColumnSurfaceOffset',
    label: 'Wide column offset',
    description: 'How much lighter (positive) or darker (negative) than the page surface color the wide column background is.',
    min: -1,
    max: 1,
    step: 0.01,
    visibleWhen: config => config.colorSource === 'surface',
  },
  {
    kind: 'number',
    key: 'narrowColumnSurfaceOffset',
    label: 'Narrow column offset',
    description: 'How much lighter (positive) or darker (negative) than the page surface color the narrow column background is.',
    min: -1,
    max: 1,
    step: 0.01,
    visibleWhen: config => config.colorSource === 'surface',
  },
  {
    kind: 'boolean',
    key: 'headerSplitBandEnabled',
    label: 'Header split band',
    description: 'Passthrough to the page\'s header — wires into SiteHeader\'s splitBandActive prop.',
  },
  {
    kind: 'enum',
    key: 'splitBandLeftMode',
    label: 'Header band · left segment',
    description: 'Transparent: no background, page surface shows through. Custom: the fixed color below. Sync with column: mirrors whatever the narrow/left column above resolves to.',
    visibleWhen: config => config.headerSplitBandEnabled,
    options: [
      { label: 'TRANSPARENT', value: 'transparent' },
      { label: 'CUSTOM', value: 'custom' },
      { label: 'SYNC WITH COLUMN', value: 'syncWithColumnBelow' },
    ],
  },
  {
    kind: 'color',
    key: 'splitBandLeftCustomColor',
    label: 'Header band · left custom color',
    visibleWhen: config => config.headerSplitBandEnabled && config.splitBandLeftMode === 'custom',
  },
  {
    kind: 'enum',
    key: 'splitBandRightMode',
    label: 'Header band · right segment',
    description: 'Transparent: no background, page surface shows through. Custom: the fixed color below. Sync with column: mirrors whatever the wide/right column above resolves to. On /abstract this right segment is the one containing the main nav items.',
    visibleWhen: config => config.headerSplitBandEnabled,
    options: [
      { label: 'TRANSPARENT', value: 'transparent' },
      { label: 'CUSTOM', value: 'custom' },
      { label: 'SYNC WITH COLUMN', value: 'syncWithColumnBelow' },
    ],
  },
  {
    kind: 'color',
    key: 'splitBandRightCustomColor',
    label: 'Header band · right custom color',
    visibleWhen: config => config.headerSplitBandEnabled && config.splitBandRightMode === 'custom',
  },
];

// wideColumnHeaderBehavior/narrowColumnHeaderBehavior ('pushDown' margin
// reservation) and legibilityScrimEnabled (blur behind a floating header)
// both become inert at a given breakpoint once that breakpoint's own
// resolved header scroll behavior is 'static' — see SplitColumnPageShell's
// own headerPositionMode doc comment for why. These three fields are
// themselves untiered (one value across every breakpoint, per
// PolymorphicLayoutConfig), so they're hidden only when *every* tier
// (headerScrollBehavior/-Wide/-Lg) is 'static' — visible whenever there's
// at least one breakpoint where the header is genuinely fixed/sticky and a
// push/float/scrim choice could matter. Hidden entirely, rather than left
// visible-but-no-op, so the panel never shows a control with nothing to
// affect anywhere.
const HEADER_BEHAVIOR_GATED_KEYS = new Set<keyof PolymorphicLayoutConfig>([
  'wideColumnHeaderBehavior',
  'narrowColumnHeaderBehavior',
  'legibilityScrimEnabled',
  'wideColumnClearsFloatingHeader',
  'wideColumnClearsFloatingHeaderWide',
  'wideColumnClearsFloatingHeaderLg',
  'narrowColumnClearsFloatingHeader',
  'narrowColumnClearsFloatingHeaderWide',
  'narrowColumnClearsFloatingHeaderLg',
]);
// POLYMORPHIC_LAYOUT_BASE_FIELDS is flat — no
// 'group'/'tabs'/'areas' entries in it today — but is typed as the wider
// ConfigScopeEntry union. The three helpers below all consume/return this
// same array, and a *tab's own* `fields` array (components/Panel/config/
// types.ts's own ConfigFieldTabs) is deliberately typed to exclude 'tabs'
// and 'areas' (tabs can't nest, and areas only ever sit above a scope's own
// tabs, never inside one) — so their return type is narrowed to match what
// a tab can actually hold, verified by the `field.kind !== 'tabs'` filters
// below rather than just asserted.
// Excludes 'action' alongside 'tabs'/'areas': POLYMORPHIC_LAYOUT_BASE_FIELDS
// (the only array this type describes) holds only real, config-key-bound
// definitions/groups — the sync-color action buttons are declared directly
// inside POLYMORPHIC_LAYOUT_FIELDS's own per-tier "Column colors" groups
// below, never folded in through this base-fields/fieldsWithKeys machinery,
// so fieldsWithKeys/fieldsExcludingKeys below can keep assuming every
// field's own `.key` is a real `keyof PolymorphicLayoutConfig`.
type NonTabsEntry<TConfig extends object> =
  Exclude<ConfigScopeEntry<TConfig>, { kind: 'tabs' } | { kind: 'areas' } | { kind: 'action' }>;

function gateByHeaderScrollBehavior(
  fields: ReadonlyArray<NonTabsEntry<PolymorphicLayoutConfig>>,
): NonTabsEntry<PolymorphicLayoutConfig>[] {
  return fields.map(field => {
    if (field.kind === 'group' || !HEADER_BEHAVIOR_GATED_KEYS.has(field.key)) return field;
    return {
      ...field,
      visibleWhen: (config: Readonly<PolymorphicLayoutConfig>) => (
        (config.headerScrollBehavior !== 'static'
          || config.headerScrollBehaviorWide !== 'static'
          || config.headerScrollBehaviorLg !== 'static')
        && (field.visibleWhen ? field.visibleWhen(config) : true)
      ),
    };
  });
}

// Splits POLYMORPHIC_LAYOUT_BASE_FIELDS (flat, no groups today) by device tier
// for the tab restructuring below — PLAN-POSTS-LAB-PANEL-TABS.md §3.
// Header-clearance is independently tiered too: its live measured padding
// floor must never silently override the Mobile padding controls at a wider
// breakpoint than the operator selected.
const DESKTOP_TIER_KEYS = new Set<keyof PolymorphicLayoutConfig>([
  'narrowColumnWidthTierLg',
  'wideColumnClearsFloatingHeaderLg',
  'narrowColumnClearsFloatingHeaderLg',
]);
const TABLET_TIER_KEYS = new Set<keyof PolymorphicLayoutConfig>([
  'narrowColumnWidthTierMd',
  'wideColumnClearsFloatingHeaderWide',
  'narrowColumnClearsFloatingHeaderWide',
]);
function fieldsWithKeys(
  fields: ReadonlyArray<NonTabsEntry<PolymorphicLayoutConfig>>,
  keys: ReadonlySet<keyof PolymorphicLayoutConfig>,
): NonTabsEntry<PolymorphicLayoutConfig>[] {
  return fields.filter(field => field.kind !== 'group' && keys.has(field.key));
}
function fieldsExcludingKeys(
  fields: ReadonlyArray<NonTabsEntry<PolymorphicLayoutConfig>>,
  keys: ReadonlySet<keyof PolymorphicLayoutConfig>,
): NonTabsEntry<PolymorphicLayoutConfig>[] {
  return fields.filter(field => field.kind === 'group' || !keys.has(field.key));
}

// The 5 "top segments" band-color fields that visually belong to the fixed
// header bar itself (PLAN-POSTS-LAB-PANEL-TABS.md §12.3) — split out of
// POLYMORPHIC_LAYOUT_BASE_FIELDS's own flat "All sizes" field set so they land
// under the HEADER area below instead of CONTENT, alongside every other
// header-owned field. wideColumnHeaderBehavior/narrowColumnHeaderBehavior/
// legibilityScrimEnabled stay out of this set on purpose — they gate
// column push-down/float behavior, not the header bar's own visuals, so
// they land under CONTENT per the plan's own judgment call.
const HEADER_SPLIT_BAND_KEYS = new Set<keyof PolymorphicLayoutConfig>([
  'headerSplitBandEnabled',
  'splitBandLeftMode',
  'splitBandLeftCustomColor',
  'splitBandRightMode',
  'splitBandRightCustomColor',
]);

// The column-background-color base/mobile-tier fields — split out of
// POLYMORPHIC_LAYOUT_BASE_FIELDS's own flat "All sizes" field set for the
// same reason HEADER_SPLIT_BAND_KEYS is: colorSource (the mode selector,
// like splitBandLeftMode) only ever takes effect below md once
// colorSourceWide/-Lg exist as real, independent per-tier fields — a tab
// literally labeled "ALL SIZES" misrepresented that (BUG-005/BUG-009's own
// precedent for this exact "mislabeled base-tier field" pattern). Landing
// these under CONTENT's own MOBILE tab instead, alongside every other
// genuinely mobile-only field, makes the base tier's real scope honest.
const COLUMN_COLOR_KEYS = new Set<keyof PolymorphicLayoutConfig>([
  'colorSource',
  'wideColumnCustomColor',
  'narrowColumnCustomColor',
  'wideColumnSurfaceOffset',
  'narrowColumnSurfaceOffset',
]);

// PLAN-EDITORIAL-HERO-UNIFICATION-AND-CARDSTACK-RESIZE-FIX.md Part 3
// (operator ask, 2026-08-25): keeping Wide column / Narrow column custom
// color in sync across all three tiers by hand means six edits (two colors
// × three tiers, since a color value change alone is inert wherever that
// tier's own colorSource* isn't 'custom' — see each tier's own
// visibleWhen), easy to half-finish. `colorTiersInSync` is a pure function
// of the live config, not "was a field just edited" tracking — each sync
// button below (one per tier, added directly into that tier's own "Column
// colors" group so "the currently active one" is simply whichever button
// the operator clicked) is visible only while the tiers genuinely
// disagree, and disappears again on its own once they don't, including
// immediately after the sync itself lands — no separate "hide after click"
// step. Declared once here, at `POLYMORPHIC_LAYOUT_FIELDS` scope-definition
// time (this file is the one shared field array every PolymorphicLayoutConfig
// page's own panel instance already reuses verbatim), not per page.
const colorTiersInSync = (config: PolymorphicLayoutConfig) => (
  config.wideColumnCustomColor === config.wideColumnCustomColorWide
  && config.wideColumnCustomColor === config.wideColumnCustomColorLg
  && config.narrowColumnCustomColor === config.narrowColumnCustomColorWide
  && config.narrowColumnCustomColor === config.narrowColumnCustomColorLg
);

const SYNC_COLORS_FROM_MOBILE_ACTION: ConfigFieldAction<PolymorphicLayoutConfig> = {
  kind: 'action',
  key: 'syncColorTiersFromMobile',
  label: 'Sync colors across breakpoints',
  description: 'Applies this tier\'s own Wide/Narrow column colors (and Custom color source) to the Tablet and Desktop tiers.',
  visibleWhen: config => !colorTiersInSync(config),
  onClick: config => ({
    colorSourceWide: 'custom',
    wideColumnCustomColorWide: config.wideColumnCustomColor,
    narrowColumnCustomColorWide: config.narrowColumnCustomColor,
    colorSourceLg: 'custom',
    wideColumnCustomColorLg: config.wideColumnCustomColor,
    narrowColumnCustomColorLg: config.narrowColumnCustomColor,
  }),
};

const SYNC_COLORS_FROM_TABLET_ACTION: ConfigFieldAction<PolymorphicLayoutConfig> = {
  kind: 'action',
  key: 'syncColorTiersFromTablet',
  label: 'Sync colors across breakpoints',
  description: 'Applies this tier\'s own Wide/Narrow column colors (and Custom color source) to the Mobile and Desktop tiers.',
  visibleWhen: config => !colorTiersInSync(config),
  onClick: config => ({
    colorSource: 'custom',
    wideColumnCustomColor: config.wideColumnCustomColorWide,
    narrowColumnCustomColor: config.narrowColumnCustomColorWide,
    colorSourceLg: 'custom',
    wideColumnCustomColorLg: config.wideColumnCustomColorWide,
    narrowColumnCustomColorLg: config.narrowColumnCustomColorWide,
  }),
};

const SYNC_COLORS_FROM_DESKTOP_ACTION: ConfigFieldAction<PolymorphicLayoutConfig> = {
  kind: 'action',
  key: 'syncColorTiersFromDesktop',
  label: 'Sync colors across breakpoints',
  description: 'Applies this tier\'s own Wide/Narrow column colors (and Custom color source) to the Mobile and Tablet tiers.',
  visibleWhen: config => !colorTiersInSync(config),
  onClick: config => ({
    colorSource: 'custom',
    wideColumnCustomColor: config.wideColumnCustomColorLg,
    narrowColumnCustomColor: config.narrowColumnCustomColorLg,
    colorSourceWide: 'custom',
    wideColumnCustomColorWide: config.wideColumnCustomColorLg,
    narrowColumnCustomColorWide: config.narrowColumnCustomColorLg,
  }),
};

const FLOATING_HEADER_CLEARANCE_BASE_KEYS = new Set<keyof PolymorphicLayoutConfig>([
  'wideColumnClearsFloatingHeader',
  'narrowColumnClearsFloatingHeader',
]);

// POLYMORPHIC_LAYOUT_BASE_FIELDS's own device-agnostic subset (md/lg-tier
// column-split fields excluded — those live under their own Tablet/Desktop
// tabs below), computed once and split by HEADER_SPLIT_BAND_KEYS into the
// HEADER area's and CONTENT area's own "All sizes" tab fields.
const allSizesSplitColumnFields = gateByHeaderScrollBehavior(
  fieldsExcludingKeys(
    POLYMORPHIC_LAYOUT_BASE_FIELDS,
    new Set([...Array.from(DESKTOP_TIER_KEYS), ...Array.from(TABLET_TIER_KEYS)]),
  ),
);

// Base/mobile-tier content-container alignment fields (align, width, text
// align, vertical align — both columns, 8 fields total). Extracted into
// their own named array (bugs audit, 2026-08-21, "gain mobile alignment
// parity with Tablet/Desktop") — previously typed out inline directly under
// the ALL SIZES tab; now rendered under this area's own MOBILE (< 768px)
// tab instead (see that tab below), matching the dedicated section shape
// Tablet/Desktop already each get for the same 4 field families. A field
// may only be registered in exactly one panel location
// (defineConfigScope.ts's own "a config key is represented by more than one
// field" invariant — first attempt at this fix tried surfacing the same
// field under *both* ALL SIZES and MOBILE for discoverability without
// relocating it, which that invariant rejects outright), so this is a
// relocation, not a second copy — named as its own array (rather than left
// inline under MOBILE directly) purely so a future reader can find "every
// field this parity fix touched" in one place, same motivation
// COLUMN_COLOR_KEYS/HEADER_SPLIT_BAND_KEYS already have for their own
// relocated field sets above.
const CONTENT_ALIGNMENT_FIELDS: NonTabsEntry<PolymorphicLayoutConfig>[] = [
  {
    kind: 'enum',
    key: 'narrowColumnContentAlign',
    debugHighlightIds: ['TABLE OF CONTENTS'],
    label: 'Narrow column content align',
    description: 'Where the content container sits across the narrow column\'s own width, below tablet width (the column itself is full-width in stacked mode, but the content box within it can still be narrower and aligned). See the Tablet/Desktop tabs to override starting at those widths.',
    options: HORIZONTAL_ALIGN_OPTIONS,
  },
  {
    kind: 'enum',
    key: 'wideColumnContentAlign',
    debugHighlightIds: ['WIDE COLUMN'],
    label: 'Wide column content align',
    description: 'Same as the narrow column\'s own align field, applied to the wide column\'s content container instead.',
    options: HORIZONTAL_ALIGN_OPTIONS,
  },
  {
    kind: 'select',
    key: 'narrowColumnContentWidth',
    debugHighlightIds: ['TABLE OF CONTENTS'],
    label: 'Narrow column content width',
    description: 'Width of the content container as a percentage of the narrow column, below tablet width. AUTO (default) keeps shrink-to-fit behavior. See the Tablet/Desktop tabs to override starting at those widths.',
    options: HEADER_CONTENT_WIDTH_OPTIONS_BASE,
  },
  {
    kind: 'select',
    key: 'wideColumnContentWidth',
    debugHighlightIds: ['WIDE COLUMN'],
    label: 'Wide column content width',
    description: 'Same as the narrow column\'s own width field, applied to the wide column\'s content container instead. Composes with (does not replace) a page\'s own additional reading-measure field if it has one, e.g. the Article Reading panel\'s Body reading measure on posts-lab.',
    options: HEADER_CONTENT_WIDTH_OPTIONS_BASE,
  },
  {
    kind: 'select',
    key: 'narrowColumnContentMaxWidth',
    debugHighlightIds: ['TABLE OF CONTENTS'],
    label: 'Narrow column content max width',
    description: 'A fixed, rem-based cap, alongside the percentage width above — NONE (default) applies no cap. Unlike the percentage width, this stays effective even when the column\'s own children establish a CSS Container Query context (e.g. a page using a cqw-based responsive font-size) — pair this with Content align above for alignment that actually moves the box in that case. See the Tablet/Desktop tabs to override starting at those widths.',
    options: CONTENT_MAX_WIDTH_OPTIONS_BASE,
  },
  {
    kind: 'select',
    key: 'wideColumnContentMaxWidth',
    debugHighlightIds: ['WIDE COLUMN'],
    label: 'Wide column content max width',
    description: 'Same as the narrow column\'s own max width field, applied to the wide column\'s content container instead.',
    options: CONTENT_MAX_WIDTH_OPTIONS_BASE,
  },
  {
    kind: 'enum',
    key: 'narrowColumnTextAlign',
    debugHighlightIds: ['TABLE OF CONTENTS'],
    label: 'Narrow column text align',
    description: 'Text alignment of the table-of-contents content.',
    options: [
      { label: 'LEFT', value: 'text-left' },
      { label: 'CENTER', value: 'text-center' },
      { label: 'RIGHT', value: 'text-right' },
    ],
  },
  {
    kind: 'enum',
    key: 'wideColumnTextAlign',
    debugHighlightIds: ['WIDE COLUMN'],
    label: 'Wide column text align',
    description: 'Same as the narrow column\'s own text-align field, applied to the wide column\'s content instead.',
    options: [
      { label: 'LEFT', value: 'text-left' },
      { label: 'CENTER', value: 'text-center' },
      { label: 'RIGHT', value: 'text-right' },
    ],
  },
  {
    kind: 'enum',
    key: 'narrowColumnContentVerticalAlign',
    debugHighlightIds: ['TABLE OF CONTENTS'],
    label: 'Narrow column content vertical align',
    description: 'Where the table-of-contents content container sits across the narrow column\'s own height. Applies at every width — the column itself always has real vertical space (min-h-[100dvh]), even in stacked/mobile mode. Pair with the content container\'s own min-height below for center/bottom to have real room to work with. See the Tablet/Desktop tabs to override starting at those widths.',
    options: VERTICAL_ALIGN_OPTIONS,
  },
  {
    kind: 'enum',
    key: 'wideColumnContentVerticalAlign',
    debugHighlightIds: ['WIDE COLUMN'],
    label: 'Wide column content vertical align',
    description: 'Same as the narrow column\'s own vertical-align field, applied to the wide column\'s reading content container instead.',
    options: VERTICAL_ALIGN_OPTIONS,
  },
];

export const POLYMORPHIC_LAYOUT_FIELDS: ReadonlyArray<ConfigScopeEntry<PolymorphicLayoutConfig>> = [
    // Macro-area split above the device tabs (PLAN-POSTS-LAB-PANEL-TABS.md
    // §12) — HEADER holds every field that visually belongs to the fixed
    // top header bar (scroll behavior, split-band coloring, and the full
    // "Header layout (top segments)" group at every device tier); CONTENT
    // holds everything that shapes the two reading columns beneath it. Both
    // areas keep the full four device tabs (ALL SIZES/MOBILE/TABLET/
    // DESKTOP) — device size is an orthogonal axis to which part of the
    // layout is being edited, so neither area collapses it.
    {
      kind: 'areas',
      areas: [
        {
          id: 'header',
          label: 'HEADER',
          fields: [
            {
              kind: 'tabs',
              tabs: [
                {
                  id: 'all-sizes',
                  label: 'ALL SIZES',
                  fields: [
                    {
                      kind: 'select',
                      key: 'splitBandWidthTier',
                      label: 'Header segment split',
                      description: 'The header\'s own left/right segment split ratio, independent of the content columns below — can meaningfully split even below tablet width, unlike those. Drives the decorative split band\'s own width (while header split band, above, is on) AND the actual logo/nav content grid whenever this page has no live-measured body-column boundary to align against (a single-column page, e.g. Column split above set to Stacked at every tier) — the primitive that gives such a page a real, config-driven header split instead of a silently unconfigurable 38/62 default. Stacked (default): no split — the band renders as one unified color, and (absent a live measurement) the header content falls back to the original 38/62 constant.',
                      options: RATIO_TIER_OPTIONS,
                      visibleWhen: config => config.headerSplitBandEnabled
                        || (config.narrowColumnWidthTierMd === 'stacked' && config.narrowColumnWidthTierLg === 'stacked'),
                    },
                  ],
                },
                {
                  id: 'mobile',
                  label: 'MOBILE (< 768px)',
                  fields: [
                    {
                      kind: 'group',
                      label: 'Header band colors',
                      // Split-band coloring — folded in from POLYMORPHIC_LAYOUT_BASE_FIELDS,
                      // filtered to just the 5 header-band-owned keys (see
                      // HEADER_SPLIT_BAND_KEYS above). Lives here, not ALL SIZES —
                      // this base/unprefixed tier only takes effect below md once
                      // splitBandLeftModeWide/-Lg exist as real independent
                      // fields, same shape as the Tablet/Desktop tabs' own
                      // "Header band colors (≥ tablet/desktop)" groups below.
                      fields: fieldsWithKeys(allSizesSplitColumnFields, HEADER_SPLIT_BAND_KEYS) as ConfigFieldDefinition<PolymorphicLayoutConfig>[],
                    },
                    {
                      kind: 'enum',
                      key: 'headerScrollBehavior',
                      label: 'Header scroll behavior',
                      description: 'Fixed (default): the header stays pinned to the viewport top always — today\'s behavior everywhere else in this codebase. Sticky: starts in normal document flow, pins once scrolled to. Static: normal document flow throughout — scrolls away with the page, nothing stays reserved for it once scrolled past. Applies below tablet width — see the Tablet/Desktop tabs\' own copies of this control to diverge at wider breakpoints; resolved live against the current viewport, so it takes effect immediately on browser resize, not just on load.',
                      options: HEADER_SCROLL_BEHAVIOR_OPTIONS,
                    },
                    // Header content-container fields — centralized here rather than
                    // on SiteHeader's own panel, per this codebase's
                    // "centralize layout config in one place" direction. Layered
                    // onto the shared siteHeaderConfig at this page's own render
                    // call site (effectiveSiteHeaderConfig in
                    // pages/posts-lab/[slug].tsx).
                    {
                      kind: 'group',
                      label: 'Header layout (top segments)',
                      fields: [
                        {
                          kind: 'subgroup',
                          label: 'Alignment',
                          fields: [
                            {
                              kind: 'enum',
                              key: 'headerLeftSegmentAlign',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment content align — horizontal',
                              description: 'Where the logo sits within the header\'s own left split segment, below tablet width. CENTER (default) reproduces today\'s mobile baseline.',
                              options: HEADER_SEGMENT_JUSTIFY_OPTIONS,
                            },
                            {
                              kind: 'enum',
                              key: 'headerLeftSegmentVerticalAlign',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment content align — vertical',
                              description: 'Same as the horizontal field above, vertical axis. CENTER (default) reproduces today\'s de-facto position.',
                              options: HEADER_SEGMENT_ITEMS_OPTIONS,
                            },
                            {
                              kind: 'enum',
                              key: 'headerRightSegmentAlign',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment content align — horizontal',
                              description: 'Where the nav content sits within the header\'s own right split segment, below tablet width. CENTER (default) reproduces today\'s mobile baseline.',
                              options: HEADER_SEGMENT_JUSTIFY_OPTIONS,
                            },
                            {
                              kind: 'enum',
                              key: 'headerRightSegmentVerticalAlign',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment content align — vertical',
                              description: 'Same as the horizontal field above, vertical axis. CENTER (default) reproduces today\'s de-facto position.',
                              options: HEADER_SEGMENT_ITEMS_OPTIONS,
                            },
                            {
                              kind: 'enum',
                              key: 'headerLeftInnerAlign',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment content align within box',
                              description: 'Where the logo sits *within* its own content box — different from "Left segment content align" above, which positions that whole box within the split segment. Only visibly changes anything once the content box is wider than the logo (Left segment content width below is not AUTO). END (default) reproduces today\'s de-facto behavior.',
                              options: HEADER_SEGMENT_JUSTIFY_OPTIONS,
                            },
                            {
                              kind: 'enum',
                              key: 'headerRightInnerAlign',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment content align within box',
                              description: 'Same as the left segment\'s own within-box align field, applied to the nav content box instead — positions the separator + nav items together within it.',
                              options: HEADER_SEGMENT_JUSTIFY_OPTIONS,
                            },
                          ],
                        },
                        {
                          kind: 'subgroup',
                          label: 'Width',
                          fields: [
                            {
                              kind: 'select',
                              key: 'headerLeftContentWidth',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment content width',
                              description: 'Width of the logo content container as a percentage of the left split segment, below tablet width. AUTO (default) keeps shrink-to-fit behavior — only visibly changes anything once paired with a non-default align above.',
                              options: HEADER_CONTENT_WIDTH_OPTIONS_BASE,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentWidth',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment content width',
                              description: 'Same as the left segment\'s own width field, applied to the nav content container instead.',
                              options: HEADER_CONTENT_WIDTH_OPTIONS_BASE,
                            },
                          ],
                        },
                        {
                          kind: 'subgroup',
                          label: 'Padding',
                          fields: [
                            {
                              kind: 'select',
                              key: 'headerLeftContentPaddingTop',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment padding top',
                              options: PADDING_TOP_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentPaddingRight',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment padding right',
                              options: PADDING_RIGHT_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentPaddingBottom',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment padding bottom',
                              options: PADDING_BOTTOM_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentPaddingLeft',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment padding left',
                              options: PADDING_LEFT_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentPaddingTop',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment padding top',
                              options: PADDING_TOP_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentPaddingRight',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment padding right',
                              options: PADDING_RIGHT_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentPaddingBottom',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment padding bottom',
                              options: PADDING_BOTTOM_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentPaddingLeft',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment padding left',
                              options: PADDING_LEFT_OPTIONS,
                            },
                          ],
                        },
                        {
                          kind: 'subgroup',
                          label: 'Margin',
                          fields: [
                            {
                              kind: 'select',
                              key: 'headerLeftContentMarginTop',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment margin top',
                              options: MARGIN_TOP_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentMarginRight',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment margin right',
                              options: MARGIN_RIGHT_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentMarginBottom',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment margin bottom',
                              options: MARGIN_BOTTOM_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentMarginLeft',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment margin left',
                              options: MARGIN_LEFT_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentMarginTop',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment margin top',
                              options: MARGIN_TOP_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentMarginRight',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment margin right',
                              options: MARGIN_RIGHT_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentMarginBottom',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment margin bottom',
                              options: MARGIN_BOTTOM_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentMarginLeft',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment margin left',
                              options: MARGIN_LEFT_OPTIONS,
                            },
                          ],
                        },
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
                      key: 'headerScrollBehaviorWide',
                      label: 'Header scroll behavior (≥ tablet)',
                      description: 'Overrides the Mobile tab\'s own header scroll behavior starting at md. Resolved live against the current viewport — a resize across this breakpoint takes effect immediately, not just on load.',
                      options: HEADER_SCROLL_BEHAVIOR_OPTIONS,
                    },
                    {
                      kind: 'group',
                      label: 'Header layout (top segments)',
                      fields: [
                        {
                          kind: 'subgroup',
                          label: 'Alignment',
                          fields: [
                            {
                              kind: 'enum',
                              key: 'headerLeftSegmentAlignWide',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment content align — horizontal (≥ tablet)',
                              description: 'Where the logo sits within the header\'s own left split segment. No effect unless "Move logo next to divider" (Site header & navigation panel) is also on — that field lives on a different, shared scope, so this one can\'t gate its own visibility on it. END (default) reproduces today\'s de-facto position.',
                              options: HEADER_SEGMENT_JUSTIFY_WIDE_OPTIONS,
                            },
                            {
                              kind: 'enum',
                              key: 'headerLeftSegmentVerticalAlignWide',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment content align — vertical (≥ tablet)',
                              description: 'Same as the horizontal field above, vertical axis. CENTER (default) reproduces today\'s de-facto position.',
                              options: HEADER_SEGMENT_ITEMS_WIDE_OPTIONS,
                            },
                            {
                              kind: 'enum',
                              key: 'headerRightSegmentAlignWide',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment content align — horizontal (≥ tablet)',
                              description: 'Where the nav content sits within the header\'s own right split segment. START (default) reproduces today\'s de-facto position (nav begins right after the separator, not stretched to the far right edge).',
                              options: HEADER_SEGMENT_JUSTIFY_WIDE_OPTIONS,
                            },
                            {
                              kind: 'enum',
                              key: 'headerRightSegmentVerticalAlignWide',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment content align — vertical (≥ tablet)',
                              description: 'Same as the horizontal field above, vertical axis. CENTER (default) reproduces today\'s de-facto position.',
                              options: HEADER_SEGMENT_ITEMS_WIDE_OPTIONS,
                            },
                            {
                              kind: 'enum',
                              key: 'headerLeftInnerAlignWide',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment content align within box (≥ tablet)',
                              description: 'Where the logo sits *within* its own content box — different from "Left segment content align" above, which positions that whole box within the split segment. Only visibly changes anything once the content box is wider than the logo (Left segment content width above is not AUTO). END (default) reproduces today\'s de-facto behavior.',
                              options: HEADER_SEGMENT_JUSTIFY_WIDE_OPTIONS,
                            },
                            {
                              kind: 'enum',
                              key: 'headerRightInnerAlignWide',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment content align within box (≥ tablet)',
                              description: 'Same as the left segment\'s own within-box align field, applied to the nav content box instead — positions the separator + nav items together within it.',
                              options: HEADER_SEGMENT_JUSTIFY_WIDE_OPTIONS,
                            },
                          ],
                        },
                        {
                          kind: 'subgroup',
                          label: 'Width',
                          fields: [
                            {
                              kind: 'select',
                              key: 'headerLeftContentWidthWide',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment content width (≥ tablet)',
                              description: 'Width of the logo content container as a percentage of the left split segment. AUTO (default) keeps today\'s shrink-to-fit behavior — only visibly changes anything once paired with a non-default align above.',
                              options: HEADER_CONTENT_WIDTH_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentWidthWide',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment content width (≥ tablet)',
                              description: 'Same as the left segment\'s own width field, applied to the nav content container instead.',
                              options: HEADER_CONTENT_WIDTH_OPTIONS,
                            },
                          ],
                        },
                        {
                          kind: 'subgroup',
                          label: 'Padding',
                          fields: [
                            {
                              kind: 'select',
                              key: 'headerLeftContentPaddingTopWide',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment padding top (≥ tablet)',
                              options: PADDING_TOP_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentPaddingRightWide',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment padding right (≥ tablet)',
                              options: PADDING_RIGHT_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentPaddingBottomWide',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment padding bottom (≥ tablet)',
                              options: PADDING_BOTTOM_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentPaddingLeftWide',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment padding left (≥ tablet)',
                              options: PADDING_LEFT_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentPaddingTopWide',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment padding top (≥ tablet)',
                              options: PADDING_TOP_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentPaddingRightWide',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment padding right (≥ tablet)',
                              options: PADDING_RIGHT_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentPaddingBottomWide',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment padding bottom (≥ tablet)',
                              options: PADDING_BOTTOM_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentPaddingLeftWide',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment padding left (≥ tablet)',
                              options: PADDING_LEFT_WIDE_OPTIONS,
                            },
                          ],
                        },
                        {
                          kind: 'subgroup',
                          label: 'Margin',
                          fields: [
                            {
                              kind: 'select',
                              key: 'headerLeftContentMarginTopWide',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment margin top (≥ tablet)',
                              options: MARGIN_TOP_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentMarginRightWide',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment margin right (≥ tablet)',
                              options: MARGIN_RIGHT_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentMarginBottomWide',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment margin bottom (≥ tablet)',
                              options: MARGIN_BOTTOM_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentMarginLeftWide',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment margin left (≥ tablet)',
                              options: MARGIN_LEFT_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentMarginTopWide',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment margin top (≥ tablet)',
                              options: MARGIN_TOP_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentMarginRightWide',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment margin right (≥ tablet)',
                              options: MARGIN_RIGHT_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentMarginBottomWide',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment margin bottom (≥ tablet)',
                              options: MARGIN_BOTTOM_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentMarginLeftWide',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment margin left (≥ tablet)',
                              options: MARGIN_LEFT_WIDE_OPTIONS,
                            },
                          ],
                        },
                      ],
                    },
                    {
                      kind: 'select',
                      key: 'splitBandWidthTierWide',
                      label: 'Header segment split (≥ tablet)',
                      description: 'Overrides the All sizes tab\'s own "Header segment split" starting at md. Drives the decorative band\'s own width AND (absent a live body-column measurement) the actual logo/nav content grid — see that field\'s own description.',
                      options: RATIO_TIER_OPTIONS,
                      visibleWhen: config => config.headerSplitBandEnabled
                        || (config.narrowColumnWidthTierMd === 'stacked' && config.narrowColumnWidthTierLg === 'stacked'),
                    },
                    {
                      kind: 'group',
                      label: 'Header band colors (≥ tablet)',
                      fields: [
                        {
                          kind: 'enum',
                          key: 'splitBandLeftModeWide',
                          label: 'Header band · left segment (≥ tablet)',
                          description: 'Overrides the Mobile tab\'s own "Header band · left segment" starting at md — a genuinely independent mode for this tier, not just a different color within whichever mode Mobile picked. Transparent: no background, page surface shows through. Custom: the fixed color below. Sync with column: mirrors whatever the narrow/left column above resolves to.',
                          visibleWhen: config => config.headerSplitBandEnabled,
                          options: [
                            { label: 'TRANSPARENT', value: 'transparent' },
                            { label: 'CUSTOM', value: 'custom' },
                            { label: 'SYNC WITH COLUMN', value: 'syncWithColumnBelow' },
                          ],
                        },
                        {
                          kind: 'color',
                          key: 'splitBandLeftCustomColorWide',
                          label: 'Header band · left custom color (≥ tablet)',
                          description: 'Used only when this tier\'s own "Header band · left segment (≥ tablet)" above is set to Custom.',
                          visibleWhen: config => config.headerSplitBandEnabled && config.splitBandLeftModeWide === 'custom',
                        },
                        {
                          kind: 'enum',
                          key: 'splitBandRightModeWide',
                          label: 'Header band · right segment (≥ tablet)',
                          description: 'Overrides the Mobile tab\'s own "Header band · right segment" starting at md — a genuinely independent mode for this tier, not just a different color within whichever mode Mobile picked. Transparent: no background, page surface shows through. Custom: the fixed color below. Sync with column: mirrors whatever the wide/right column above resolves to.',
                          visibleWhen: config => config.headerSplitBandEnabled,
                          options: [
                            { label: 'TRANSPARENT', value: 'transparent' },
                            { label: 'CUSTOM', value: 'custom' },
                            { label: 'SYNC WITH COLUMN', value: 'syncWithColumnBelow' },
                          ],
                        },
                        {
                          kind: 'color',
                          key: 'splitBandRightCustomColorWide',
                          label: 'Header band · right custom color (≥ tablet)',
                          description: 'Used only when this tier\'s own "Header band · right segment (≥ tablet)" above is set to Custom.',
                          visibleWhen: config => config.headerSplitBandEnabled && config.splitBandRightModeWide === 'custom',
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'desktop',
                  label: 'DESKTOP (≥ 1024px)',
                  fields: [
                    {
                      kind: 'enum',
                      key: 'headerScrollBehaviorLg',
                      label: 'Header scroll behavior (≥ desktop)',
                      description: 'Overrides the Tablet tab\'s own header scroll behavior starting at lg. Resolved live against the current viewport — a resize across this breakpoint takes effect immediately, not just on load.',
                      options: HEADER_SCROLL_BEHAVIOR_OPTIONS,
                    },
                    // Parity with the Mobile/Tablet tabs' own padding/margin
                    // group above — a real, independent lg: override for every
                    // field that already had a mobile+tablet pair. Defaults
                    // mirror each field's current Tablet-tab value (same
                    // computed padding/margin in px), so adding this tier alone
                    // changes nothing visually until an operator touches it.
                    {
                      kind: 'group',
                      label: 'Header layout (top segments)',
                      fields: [
                        {
                          kind: 'subgroup',
                          label: 'Alignment',
                          fields: [
                            {
                              kind: 'enum',
                              key: 'headerLeftSegmentAlignLg',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment content align — horizontal (≥ desktop)',
                              description: 'Where the logo sits within the header\'s own left split segment, at desktop width — independent of the Tablet tab\'s own value. END (default) mirrors the Tablet tab\'s own default, so nothing changes until touched.',
                              options: HEADER_SEGMENT_JUSTIFY_LG_OPTIONS,
                            },
                            {
                              kind: 'enum',
                              key: 'headerLeftSegmentVerticalAlignLg',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment content align — vertical (≥ desktop)',
                              description: 'Same as the horizontal field above, vertical axis. CENTER (default) mirrors the Tablet tab.',
                              options: HEADER_SEGMENT_ITEMS_LG_OPTIONS,
                            },
                            {
                              kind: 'enum',
                              key: 'headerRightSegmentAlignLg',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment content align — horizontal (≥ desktop)',
                              description: 'Where the nav content sits within the header\'s own right split segment, at desktop width. START (default) mirrors the Tablet tab.',
                              options: HEADER_SEGMENT_JUSTIFY_LG_OPTIONS,
                            },
                            {
                              kind: 'enum',
                              key: 'headerRightSegmentVerticalAlignLg',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment content align — vertical (≥ desktop)',
                              description: 'Same as the horizontal field above, vertical axis. CENTER (default) mirrors the Tablet tab.',
                              options: HEADER_SEGMENT_ITEMS_LG_OPTIONS,
                            },
                            {
                              kind: 'enum',
                              key: 'headerLeftInnerAlignLg',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment content align within box (≥ desktop)',
                              description: 'Where the logo sits *within* its own content box, at desktop width — independent of the Tablet tab\'s own value. Only visibly changes anything once the content box is wider than the logo. END (default) mirrors the Tablet tab.',
                              options: HEADER_SEGMENT_JUSTIFY_LG_OPTIONS,
                            },
                            {
                              kind: 'enum',
                              key: 'headerRightInnerAlignLg',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment content align within box (≥ desktop)',
                              description: 'Same as the left segment\'s own within-box align field, applied to the nav content box instead.',
                              options: HEADER_SEGMENT_JUSTIFY_LG_OPTIONS,
                            },
                          ],
                        },
                        {
                          kind: 'subgroup',
                          label: 'Width',
                          fields: [
                            {
                              kind: 'select',
                              key: 'headerLeftContentWidthLg',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment content width (≥ desktop)',
                              description: 'Width of the logo content container as a percentage of the left split segment, at desktop width — independent of the Tablet tab\'s own value. AUTO (default) keeps shrink-to-fit behavior.',
                              options: HEADER_CONTENT_WIDTH_OPTIONS_LG,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentWidthLg',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment content width (≥ desktop)',
                              description: 'Same as the left segment\'s own width field, applied to the nav content container instead.',
                              options: HEADER_CONTENT_WIDTH_OPTIONS_LG,
                            },
                          ],
                        },
                        {
                          kind: 'subgroup',
                          label: 'Padding',
                          fields: [
                            {
                              kind: 'select',
                              key: 'headerLeftContentPaddingTopLg',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment padding top (≥ desktop)',
                              options: PADDING_TOP_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentPaddingRightLg',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment padding right (≥ desktop)',
                              options: PADDING_RIGHT_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentPaddingBottomLg',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment padding bottom (≥ desktop)',
                              options: PADDING_BOTTOM_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentPaddingLeftLg',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment padding left (≥ desktop)',
                              options: PADDING_LEFT_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentPaddingTopLg',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment padding top (≥ desktop)',
                              options: PADDING_TOP_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentPaddingRightLg',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment padding right (≥ desktop)',
                              options: PADDING_RIGHT_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentPaddingBottomLg',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment padding bottom (≥ desktop)',
                              options: PADDING_BOTTOM_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentPaddingLeftLg',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment padding left (≥ desktop)',
                              options: PADDING_LEFT_LG_OPTIONS,
                            },
                          ],
                        },
                        {
                          kind: 'subgroup',
                          label: 'Margin',
                          fields: [
                            {
                              kind: 'select',
                              key: 'headerLeftContentMarginTopLg',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment margin top (≥ desktop)',
                              options: MARGIN_TOP_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentMarginRightLg',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment margin right (≥ desktop)',
                              options: MARGIN_RIGHT_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentMarginBottomLg',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment margin bottom (≥ desktop)',
                              options: MARGIN_BOTTOM_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerLeftContentMarginLeftLg',
                              debugHighlightIds: ['HEADER · LEFT CONTENT'],
                              label: 'Left segment margin left (≥ desktop)',
                              options: MARGIN_LEFT_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentMarginTopLg',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment margin top (≥ desktop)',
                              options: MARGIN_TOP_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentMarginRightLg',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment margin right (≥ desktop)',
                              options: MARGIN_RIGHT_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentMarginBottomLg',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment margin bottom (≥ desktop)',
                              options: MARGIN_BOTTOM_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'headerRightContentMarginLeftLg',
                              debugHighlightIds: ['HEADER · RIGHT CONTENT'],
                              label: 'Right segment margin left (≥ desktop)',
                              options: MARGIN_LEFT_LG_OPTIONS,
                            },
                          ],
                        },
                      ],
                    },
                    {
                      kind: 'select',
                      key: 'splitBandWidthTierLg',
                      label: 'Header segment split (≥ desktop)',
                      description: 'Overrides the Tablet tab\'s own "Header segment split (≥ tablet)" starting at 1024px. Drives the decorative band\'s own width AND (absent a live body-column measurement) the actual logo/nav content grid — see that field\'s own description.',
                      options: RATIO_TIER_OPTIONS,
                      visibleWhen: config => config.headerSplitBandEnabled
                        || (config.narrowColumnWidthTierMd === 'stacked' && config.narrowColumnWidthTierLg === 'stacked'),
                    },
                    {
                      kind: 'group',
                      label: 'Header band colors (≥ desktop)',
                      fields: [
                        {
                          kind: 'enum',
                          key: 'splitBandLeftModeLg',
                          label: 'Header band · left segment (≥ desktop)',
                          description: 'Overrides the Tablet tab\'s own "Header band · left segment (≥ tablet)" starting at 1024px — a genuinely independent mode for this tier. Transparent: no background, page surface shows through. Custom: the fixed color below. Sync with column: mirrors whatever the narrow/left column above resolves to.',
                          visibleWhen: config => config.headerSplitBandEnabled,
                          options: [
                            { label: 'TRANSPARENT', value: 'transparent' },
                            { label: 'CUSTOM', value: 'custom' },
                            { label: 'SYNC WITH COLUMN', value: 'syncWithColumnBelow' },
                          ],
                        },
                        {
                          kind: 'color',
                          key: 'splitBandLeftCustomColorLg',
                          label: 'Header band · left custom color (≥ desktop)',
                          description: 'Used only when this tier\'s own "Header band · left segment (≥ desktop)" above is set to Custom.',
                          visibleWhen: config => config.headerSplitBandEnabled && config.splitBandLeftModeLg === 'custom',
                        },
                        {
                          kind: 'enum',
                          key: 'splitBandRightModeLg',
                          label: 'Header band · right segment (≥ desktop)',
                          description: 'Overrides the Tablet tab\'s own "Header band · right segment (≥ tablet)" starting at 1024px — a genuinely independent mode for this tier. Transparent: no background, page surface shows through. Custom: the fixed color below. Sync with column: mirrors whatever the wide/right column above resolves to.',
                          visibleWhen: config => config.headerSplitBandEnabled,
                          options: [
                            { label: 'TRANSPARENT', value: 'transparent' },
                            { label: 'CUSTOM', value: 'custom' },
                            { label: 'SYNC WITH COLUMN', value: 'syncWithColumnBelow' },
                          ],
                        },
                        {
                          kind: 'color',
                          key: 'splitBandRightCustomColorLg',
                          label: 'Header band · right custom color (≥ desktop)',
                          description: 'Used only when this tier\'s own "Header band · right segment (≥ desktop)" above is set to Custom.',
                          visibleWhen: config => config.headerSplitBandEnabled && config.splitBandRightModeLg === 'custom',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'content',
          label: 'CONTENT',
          fields: [
            {
              kind: 'tabs',
              tabs: [
                {
                  id: 'all-sizes',
                  label: 'ALL SIZES',
                  fields: [
                    // Split column layout — folded in from this page's own former
                    // SplitColumnLayout/layout:PostsLab scope (see
                    // PolymorphicLayoutConfig's own doc comment in postLab.config.ts),
                    // minus the 5 header-band-owned keys (HEADER_SPLIT_BAND_KEYS,
                    // now under HEADER's own MOBILE tab) and the 5 column-color
                    // keys (COLUMN_COLOR_KEYS, now under this area's own MOBILE
                    // tab below — same "base tier only, not ALL SIZES" reasoning).
                    // narrowColumnWidthTierMd/Lg live under Tablet/Desktop instead — see
                    // those tabs below.
                    ...fieldsExcludingKeys(
                      allSizesSplitColumnFields,
                      new Set([
                        ...Array.from(HEADER_SPLIT_BAND_KEYS),
                        ...Array.from(COLUMN_COLOR_KEYS),
                        ...Array.from(FLOATING_HEADER_CLEARANCE_BASE_KEYS),
                      ]),
                    ),
                    // narrowColumnContentAlign/wideColumnContentAlign/-Width/
                    // -TextAlign/-ContentVerticalAlign (8 fields, CONTENT_ALIGNMENT_FIELDS)
                    // moved to this area's own MOBILE tab below (bugs audit,
                    // 2026-08-21, "gain mobile alignment parity with Tablet/
                    // Desktop") — Tablet/Desktop each already show their own
                    // dedicated align/width/text-align/vertical-align section;
                    // Mobile showed nothing, even though these exact fields'
                    // base/unprefixed values are what mobile actually renders.
                    // A field may only ever be registered in one location
                    // (defineConfigScope.ts's own "a config key is represented
                    // by more than one field" invariant) — a relocation, not a
                    // second copy alongside this one.
                    {
                      kind: 'select',
                      key: 'narrowColumnContentMinHeight',
                      debugHighlightIds: ['TABLE OF CONTENTS'],
                      label: 'Narrow column content min height',
                      description: 'Minimum height the table-of-contents content container is guaranteed. Gives the vertical-align field above real slack to distribute when the content itself is short.',
                      options: CONTENT_MIN_HEIGHT_OPTIONS,
                    },
                    {
                      kind: 'select',
                      key: 'wideColumnContentMinHeight',
                      debugHighlightIds: ['READING COLUMN'],
                      label: 'Wide column content min height',
                      description: 'Same as the narrow column\'s own min-height field, applied to the wide column\'s reading content container instead.',
                      options: CONTENT_MIN_HEIGHT_OPTIONS,
                    },
                  ],
                },
                {
                  id: 'mobile',
                  label: 'MOBILE (< 768px)',
                  fields: [
                    {
                      kind: 'group',
                      label: 'Column colors',
                      // Folded in from POLYMORPHIC_LAYOUT_BASE_FIELDS, filtered to
                      // just the 5 column-color-owned keys (COLUMN_COLOR_KEYS
                      // above). Lives here, not ALL SIZES — this base/unprefixed
                      // tier only takes effect below md once colorSourceWide/-Lg
                      // exist as real independent fields, same shape as the
                      // Tablet/Desktop tabs' own "Column colors (≥ tablet/desktop)"
                      // groups below.
                      fields: [
                        ...fieldsWithKeys(allSizesSplitColumnFields, COLUMN_COLOR_KEYS) as ConfigFieldDefinition<PolymorphicLayoutConfig>[],
                        SYNC_COLORS_FROM_MOBILE_ACTION,
                      ],
                    },
                    {
                      kind: 'group',
                      label: 'Content alignment',
                      // Parity fix (bugs audit, 2026-08-21): Tablet/Desktop each
                      // already show their own dedicated "content align/width/
                      // text align/vertical align" section (see those tabs
                      // below) — Mobile showed nothing, even though these exact
                      // 8 fields' base/unprefixed values (CONTENT_ALIGNMENT_FIELDS,
                      // defined above) are what mobile actually renders.
                      // Relocated here from the ALL SIZES tab, not duplicated —
                      // a field may only ever be registered in one location
                      // (defineConfigScope.ts's own "a config key is
                      // represented by more than one field" invariant, hit
                      // live while first attempting this as a same-field
                      // "also show it here" duplication). Same tradeoff
                      // Column colors above already accepted: like colorSource,
                      // these values still act as the real, cascading fallback
                      // Tablet/Desktop fall back to whenever their own Wide/Lg
                      // override is unset — grouping under MOBILE describes
                      // "what an operator changes to affect only mobile
                      // without already having diverged Tablet/Desktop," not
                      // "the only breakpoint this value can ever reach."
                      fields: CONTENT_ALIGNMENT_FIELDS as ConfigFieldDefinition<PolymorphicLayoutConfig>[],
                    },
                    {
                      kind: 'group',
                      label: 'Floating-header clearance',
                      fields: fieldsWithKeys(
                        allSizesSplitColumnFields,
                        FLOATING_HEADER_CLEARANCE_BASE_KEYS,
                      ) as ConfigFieldDefinition<PolymorphicLayoutConfig>[],
                    },
                    {
                      kind: 'group',
                      label: 'Wide column padding & margin',
                      fields: [
                        {
                          kind: 'subgroup',
                          label: 'Padding',
                          fields: [
                            { kind: 'select', key: 'wideColumnContentPaddingTop', debugHighlightIds: ['WIDE COLUMN'], label: 'Padding top', options: PADDING_TOP_OPTIONS },
                            { kind: 'select', key: 'wideColumnContentPaddingRight', debugHighlightIds: ['WIDE COLUMN'], label: 'Padding right', options: PADDING_RIGHT_OPTIONS },
                            { kind: 'select', key: 'wideColumnContentPaddingBottom', debugHighlightIds: ['WIDE COLUMN'], label: 'Padding bottom', options: PADDING_BOTTOM_OPTIONS },
                            { kind: 'select', key: 'wideColumnContentPaddingLeft', debugHighlightIds: ['WIDE COLUMN'], label: 'Padding left', options: PADDING_LEFT_OPTIONS },
                          ],
                        },
                        {
                          kind: 'subgroup',
                          label: 'Margin',
                          fields: [
                            { kind: 'select', key: 'wideColumnContentMarginTop', debugHighlightIds: ['WIDE COLUMN'], label: 'Margin top', options: MARGIN_TOP_OPTIONS },
                            { kind: 'select', key: 'wideColumnContentMarginRight', debugHighlightIds: ['WIDE COLUMN'], label: 'Margin right', options: MARGIN_RIGHT_OPTIONS },
                            { kind: 'select', key: 'wideColumnContentMarginBottom', debugHighlightIds: ['WIDE COLUMN'], label: 'Margin bottom', options: MARGIN_BOTTOM_OPTIONS },
                            { kind: 'select', key: 'wideColumnContentMarginLeft', debugHighlightIds: ['WIDE COLUMN'], label: 'Margin left', options: MARGIN_LEFT_OPTIONS },
                          ],
                        },
                      ],
                    },
                    {
                      kind: 'group',
                      label: 'Narrow column padding & margin',
                      fields: [
                        {
                          kind: 'subgroup',
                          label: 'Padding',
                          fields: [
                            { kind: 'select', key: 'narrowColumnContentPaddingTop', debugHighlightIds: ['NARROW COLUMN'], label: 'Padding top', options: PADDING_TOP_OPTIONS },
                            { kind: 'select', key: 'narrowColumnContentPaddingRight', debugHighlightIds: ['NARROW COLUMN'], label: 'Padding right', options: PADDING_RIGHT_OPTIONS },
                            { kind: 'select', key: 'narrowColumnContentPaddingBottom', debugHighlightIds: ['NARROW COLUMN'], label: 'Padding bottom', options: PADDING_BOTTOM_OPTIONS },
                            { kind: 'select', key: 'narrowColumnContentPaddingLeft', debugHighlightIds: ['NARROW COLUMN'], label: 'Padding left', options: PADDING_LEFT_OPTIONS },
                          ],
                        },
                        {
                          kind: 'subgroup',
                          label: 'Margin',
                          fields: [
                            { kind: 'select', key: 'narrowColumnContentMarginTop', debugHighlightIds: ['NARROW COLUMN'], label: 'Margin top', options: MARGIN_TOP_OPTIONS },
                            { kind: 'select', key: 'narrowColumnContentMarginRight', debugHighlightIds: ['NARROW COLUMN'], label: 'Margin right', options: MARGIN_RIGHT_OPTIONS },
                            { kind: 'select', key: 'narrowColumnContentMarginBottom', debugHighlightIds: ['NARROW COLUMN'], label: 'Margin bottom', options: MARGIN_BOTTOM_OPTIONS },
                            { kind: 'select', key: 'narrowColumnContentMarginLeft', debugHighlightIds: ['NARROW COLUMN'], label: 'Margin left', options: MARGIN_LEFT_OPTIONS },
                          ],
                        },
                      ],
                    },
                    {
                      kind: 'number',
                      key: 'narrowColumnMobileAlignOffsetPx',
                      debugHighlightIds: ['TABLE OF CONTENTS'],
                      label: 'Narrow column nav-align offset',
                      description: 'Fine-tune nudge (px) on top of the table of contents\' own live-measured alignment against the header nav\'s real left edge. That base alignment is automatic and correct by default (0 = no adjustment) — the nav\'s own left edge is centered and width-capped below md, so it moves continuously with viewport width, which is why this is a measured base + offset rather than a fixed padding class. Only meaningful below md — at md and up that alignment is already live-measured via autoAlignNavSplit (see the Tablet tab).',
                      min: -40,
                      max: 40,
                      step: 1,
                      unit: 'px',
                    },
                    {
                      kind: 'group',
                      label: 'Body gutter (both columns)',
                      fields: [
                        {
                          kind: 'select',
                          key: 'bodyGutterPaddingLeft',
                          debugHighlightIds: ['BODY'],
                          label: 'Padding left',
                          description: 'Left inset of the body grid as a whole (both columns together).',
                          options: PADDING_LEFT_OPTIONS,
                        },
                        {
                          kind: 'select',
                          key: 'bodyGutterPaddingRight',
                          debugHighlightIds: ['BODY'],
                          label: 'Padding right',
                          description: 'Right inset of the body grid as a whole (both columns together).',
                          options: PADDING_RIGHT_OPTIONS,
                        },
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
                      key: 'narrowColumnContentAlignWide',
                      debugHighlightIds: ['TABLE OF CONTENTS'],
                      label: 'Narrow column content align (≥ tablet)',
                      description: 'Overrides the All sizes tab\'s own "Narrow column content align" starting at md.',
                      options: HORIZONTAL_ALIGN_OPTIONS,
                    },
                    {
                      kind: 'select',
                      key: 'narrowColumnContentWidthWide',
                      debugHighlightIds: ['TABLE OF CONTENTS'],
                      label: 'Narrow column content width (≥ tablet)',
                      description: 'Overrides the All sizes tab\'s own "Narrow column content width" starting at md.',
                      options: HEADER_CONTENT_WIDTH_OPTIONS,
                    },
                    {
                      kind: 'select',
                      key: 'narrowColumnContentMaxWidthWide',
                      debugHighlightIds: ['TABLE OF CONTENTS'],
                      label: 'Narrow column content max width (≥ tablet)',
                      description: 'Overrides the All sizes tab\'s own "Narrow column content max width" starting at md. Stays effective under a containerQuery ancestor, unlike the percentage width above — pair with Content align for alignment that actually moves the box in that case.',
                      options: CONTENT_MAX_WIDTH_OPTIONS_WIDE,
                    },
                    {
                      kind: 'enum',
                      key: 'narrowColumnTextAlignWide',
                      debugHighlightIds: ['TABLE OF CONTENTS'],
                      label: 'Narrow column text align (≥ tablet)',
                      description: 'Overrides the All sizes tab\'s own "Narrow column text align" starting at md.',
                      options: [
                        { label: 'LEFT', value: 'md:text-left' },
                        { label: 'CENTER', value: 'md:text-center' },
                        { label: 'RIGHT', value: 'md:text-right' },
                      ],
                    },
                    {
                      kind: 'enum',
                      key: 'narrowColumnContentVerticalAlignWide',
                      debugHighlightIds: ['TABLE OF CONTENTS'],
                      label: 'Narrow column content vertical align (≥ tablet)',
                      description: 'Overrides the All sizes tab\'s own "Narrow column content vertical align" starting at md.',
                      options: HEADER_SEGMENT_JUSTIFY_WIDE_OPTIONS,
                    },
                    {
                      kind: 'enum',
                      key: 'wideColumnContentAlignWide',
                      debugHighlightIds: ['READING COLUMN'],
                      label: 'Wide column content align (≥ tablet)',
                      description: 'Overrides the All sizes tab\'s own "Wide column content align" starting at md. The content container\'s own width stays governed by a page\'s own additional reading-measure field if it has one (e.g. posts-lab\'s Article Reading panel), not this one.',
                      options: HORIZONTAL_ALIGN_OPTIONS,
                    },
                    {
                      kind: 'select',
                      key: 'wideColumnContentWidthWide',
                      debugHighlightIds: ['READING COLUMN'],
                      label: 'Wide column content width (≥ tablet)',
                      description: 'Overrides the All sizes tab\'s own "Wide column content width" starting at md. MATCH NARROW COLUMN caps this column\'s content to the narrow column\'s own real width, derived from this tab\'s own "Column split (≥ tablet)" ratio instead of a fixed percentage.',
                      options: WIDE_COLUMN_CONTENT_WIDTH_OPTIONS,
                    },
                    {
                      kind: 'select',
                      key: 'wideColumnContentMaxWidthWide',
                      debugHighlightIds: ['READING COLUMN'],
                      label: 'Wide column content max width (≥ tablet)',
                      description: 'Overrides the All sizes tab\'s own "Wide column content max width" starting at md.',
                      options: CONTENT_MAX_WIDTH_OPTIONS_WIDE,
                    },
                    {
                      kind: 'enum',
                      key: 'wideColumnTextAlignWide',
                      debugHighlightIds: ['READING COLUMN'],
                      label: 'Wide column text align (≥ tablet)',
                      description: 'Overrides the All sizes tab\'s own "Wide column text align" starting at md.',
                      options: [
                        { label: 'LEFT', value: 'md:text-left' },
                        { label: 'CENTER', value: 'md:text-center' },
                        { label: 'RIGHT', value: 'md:text-right' },
                      ],
                    },
                    {
                      kind: 'enum',
                      key: 'wideColumnContentVerticalAlignWide',
                      debugHighlightIds: ['READING COLUMN'],
                      label: 'Wide column content vertical align (≥ tablet)',
                      description: 'Overrides the All sizes tab\'s own "Wide column content vertical align" starting at md.',
                      options: HEADER_SEGMENT_JUSTIFY_WIDE_OPTIONS,
                    },
                    {
                      kind: 'group',
                      label: 'Column colors (≥ tablet)',
                      fields: [
                        {
                          kind: 'enum',
                          key: 'colorSourceWide',
                          label: 'Color source (≥ tablet)',
                          description: 'Overrides the Mobile tab\'s own "Color source" starting at md — a genuinely independent source for this tier, not just a different color within whichever source the Mobile tab picked. None: no background, the page surface shows through. Palette: derived from the card coloring engine\'s ramp. Custom: the two fixed colors below. Surface: derived from the page surface color, offset by the amounts below.',
                          options: [
                            { label: 'NONE', value: 'none' },
                            { label: 'PALETTE', value: 'palette' },
                            { label: 'CUSTOM', value: 'custom' },
                            { label: 'SURFACE', value: 'surface' },
                          ],
                        },
                        {
                          kind: 'color',
                          key: 'wideColumnCustomColorWide',
                          debugHighlightIds: ['READING COLUMN'],
                          label: 'Wide column custom color (≥ tablet)',
                          description: 'Used only when this tier\'s own "Color source (≥ tablet)" above is set to Custom.',
                          visibleWhen: config => config.colorSourceWide === 'custom',
                        },
                        {
                          kind: 'color',
                          key: 'narrowColumnCustomColorWide',
                          debugHighlightIds: ['TABLE OF CONTENTS'],
                          label: 'Narrow column custom color (≥ tablet)',
                          description: 'Used only when this tier\'s own "Color source (≥ tablet)" above is set to Custom.',
                          visibleWhen: config => config.colorSourceWide === 'custom',
                        },
                        {
                          kind: 'number',
                          key: 'wideColumnSurfaceOffsetWide',
                          debugHighlightIds: ['READING COLUMN'],
                          label: 'Wide column offset (≥ tablet)',
                          description: 'Used only when this tier\'s own "Color source (≥ tablet)" above is set to Surface. How much lighter (positive) or darker (negative) than the page surface color the wide column background is.',
                          min: -1,
                          max: 1,
                          step: 0.01,
                          visibleWhen: config => config.colorSourceWide === 'surface',
                        },
                        {
                          kind: 'number',
                          key: 'narrowColumnSurfaceOffsetWide',
                          debugHighlightIds: ['TABLE OF CONTENTS'],
                          label: 'Narrow column offset (≥ tablet)',
                          description: 'Used only when this tier\'s own "Color source (≥ tablet)" above is set to Surface. How much lighter (positive) or darker (negative) than the page surface color the narrow column background is.',
                          min: -1,
                          max: 1,
                          step: 0.01,
                          visibleWhen: config => config.colorSourceWide === 'surface',
                        },
                        SYNC_COLORS_FROM_TABLET_ACTION,
                      ],
                    },
                    ...gateByHeaderScrollBehavior(fieldsWithKeys(POLYMORPHIC_LAYOUT_BASE_FIELDS, TABLET_TIER_KEYS)),
                    {
                      kind: 'group',
                      label: 'Body gutter (both columns)',
                      fields: [
                        {
                          kind: 'select',
                          key: 'bodyGutterPaddingLeftWide',
                          debugHighlightIds: ['BODY'],
                          label: 'Padding left (≥ tablet)',
                          description: 'Same as padding left, md and up.',
                          options: PADDING_LEFT_WIDE_OPTIONS,
                        },
                        {
                          kind: 'select',
                          key: 'bodyGutterPaddingRightWide',
                          debugHighlightIds: ['BODY'],
                          label: 'Padding right (≥ tablet)',
                          description: 'Same as padding right, md and up.',
                          options: PADDING_RIGHT_WIDE_OPTIONS,
                        },
                      ],
                    },
                    {
                      kind: 'group',
                      label: 'Wide column padding & margin',
                      fields: [
                        {
                          kind: 'subgroup',
                          label: 'Padding',
                          fields: [
                            {
                              kind: 'select',
                              key: 'wideColumnContentPaddingTopWide',
                              debugHighlightIds: ['WIDE COLUMN'],
                              label: 'Padding top (≥ tablet)',
                              description: 'Same as padding top, md and up.',
                              options: PADDING_TOP_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'wideColumnContentPaddingRightWide',
                              debugHighlightIds: ['WIDE COLUMN'],
                              label: 'Padding right (≥ tablet)',
                              description: 'Right padding on the article column\'s own outer box, once the split-column layout is active — the space between the seam and the article\'s own content start.',
                              options: PADDING_RIGHT_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'wideColumnContentPaddingBottomWide',
                              debugHighlightIds: ['WIDE COLUMN'],
                              label: 'Padding bottom (≥ tablet)',
                              description: 'Overrides the All sizes tab\'s own "Padding bottom" starting at md.',
                              options: PADDING_BOTTOM_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'wideColumnContentPaddingLeftWide',
                              debugHighlightIds: ['WIDE COLUMN'],
                              label: 'Padding left (≥ tablet)',
                              description: 'Left padding on the article column\'s own outer box, once the split-column layout is active — the space between the seam and the article\'s own content start.',
                              options: PADDING_LEFT_WIDE_OPTIONS,
                            },
                          ],
                        },
                        {
                          kind: 'subgroup',
                          label: 'Margin',
                          fields: [
                            {
                              kind: 'select',
                              key: 'wideColumnContentMarginTopWide',
                              debugHighlightIds: ['WIDE COLUMN'],
                              label: 'Margin top (≥ tablet)',
                              description: 'Same as margin top, md and up.',
                              options: MARGIN_TOP_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'wideColumnContentMarginRightWide',
                              debugHighlightIds: ['WIDE COLUMN'],
                              label: 'Margin right (≥ tablet)',
                              description: 'Overrides the All sizes tab\'s right margin starting at md.',
                              options: MARGIN_RIGHT_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'wideColumnContentMarginBottomWide',
                              debugHighlightIds: ['WIDE COLUMN'],
                              label: 'Margin bottom (≥ tablet)',
                              description: 'Same as margin bottom, md and up.',
                              options: MARGIN_BOTTOM_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'wideColumnContentMarginLeftWide',
                              debugHighlightIds: ['WIDE COLUMN'],
                              label: 'Margin left (≥ tablet)',
                              description: 'Overrides the All sizes tab\'s left margin starting at md.',
                              options: MARGIN_LEFT_WIDE_OPTIONS,
                            },
                          ],
                        },
                      ],
                    },
                    {
                      kind: 'group',
                      label: 'Narrow column padding & margin',
                      fields: [
                        {
                          kind: 'subgroup',
                          label: 'Padding',
                          fields: [
                            {
                              kind: 'select',
                              key: 'narrowColumnContentPaddingTopWide',
                              debugHighlightIds: ['TABLE OF CONTENTS'],
                              label: 'Padding top (≥ tablet)',
                              description: 'Same as padding top, md and up.',
                              options: PADDING_TOP_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'narrowColumnContentPaddingRightWide',
                              debugHighlightIds: ['TABLE OF CONTENTS'],
                              label: 'Padding right (≥ tablet)',
                              description: 'Right padding on the TOC\'s sticky wrapper, once the split-column layout is active — the space between the TOC content box and the seam against the wide column.',
                              options: PADDING_RIGHT_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'narrowColumnContentPaddingBottomWide',
                              debugHighlightIds: ['NARROW COLUMN'],
                              label: 'Padding bottom (≥ tablet)',
                              description: 'Overrides the All sizes tab\'s own "Padding bottom" starting at md.',
                              options: PADDING_BOTTOM_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'narrowColumnContentPaddingLeftWide',
                              debugHighlightIds: ['TABLE OF CONTENTS'],
                              label: 'Padding left (≥ tablet)',
                              description: 'Left padding on the TOC\'s sticky wrapper, once the split-column layout is active. No mobile-tab sibling — below md the left side is instead a live-measured inline value (see the Mobile tab\'s own narrow column nav-align offset).',
                              options: PADDING_LEFT_WIDE_OPTIONS,
                            },
                          ],
                        },
                        {
                          kind: 'subgroup',
                          label: 'Margin',
                          fields: [
                            {
                              kind: 'select',
                              key: 'narrowColumnContentMarginTopWide',
                              debugHighlightIds: ['NARROW COLUMN'],
                              label: 'Margin top (≥ tablet)',
                              description: 'Same as margin top, md and up.',
                              options: MARGIN_TOP_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'narrowColumnContentMarginRightWide',
                              debugHighlightIds: ['NARROW COLUMN'],
                              label: 'Margin right (≥ tablet)',
                              description: 'Overrides the All sizes tab\'s right margin starting at md.',
                              options: MARGIN_RIGHT_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'narrowColumnContentMarginBottomWide',
                              debugHighlightIds: ['NARROW COLUMN'],
                              label: 'Margin bottom (≥ tablet)',
                              description: 'Same as margin bottom, md and up.',
                              options: MARGIN_BOTTOM_WIDE_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'narrowColumnContentMarginLeftWide',
                              debugHighlightIds: ['NARROW COLUMN'],
                              label: 'Margin left (≥ tablet)',
                              description: 'Overrides the All sizes tab\'s left margin starting at md.',
                              options: MARGIN_LEFT_WIDE_OPTIONS,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'desktop',
                  label: 'DESKTOP (≥ 1024px)',
                  fields: [
                    ...gateByHeaderScrollBehavior(fieldsWithKeys(POLYMORPHIC_LAYOUT_BASE_FIELDS, DESKTOP_TIER_KEYS)),
                    {
                      kind: 'enum',
                      key: 'narrowColumnContentAlignLg',
                      debugHighlightIds: ['TABLE OF CONTENTS'],
                      label: 'Narrow column content align (≥ desktop)',
                      description: 'Overrides the Tablet tab\'s own "Narrow column content align (≥ tablet)" starting at 1024px.',
                      options: HORIZONTAL_ALIGN_OPTIONS,
                    },
                    {
                      kind: 'select',
                      key: 'narrowColumnContentWidthLg',
                      debugHighlightIds: ['TABLE OF CONTENTS'],
                      label: 'Narrow column content width (≥ desktop)',
                      description: 'Overrides the Tablet tab\'s own "Narrow column content width (≥ tablet)" starting at 1024px.',
                      options: HEADER_CONTENT_WIDTH_OPTIONS_LG,
                    },
                    {
                      kind: 'select',
                      key: 'narrowColumnContentMaxWidthLg',
                      debugHighlightIds: ['TABLE OF CONTENTS'],
                      label: 'Narrow column content max width (≥ desktop)',
                      description: 'Overrides the Tablet tab\'s own "Narrow column content max width (≥ tablet)" starting at 1024px. Stays effective under a containerQuery ancestor, unlike the percentage width above — pair with Content align for alignment that actually moves the box in that case.',
                      options: CONTENT_MAX_WIDTH_OPTIONS_LG,
                    },
                    {
                      kind: 'enum',
                      key: 'narrowColumnTextAlignLg',
                      debugHighlightIds: ['TABLE OF CONTENTS'],
                      label: 'Narrow column text align (≥ desktop)',
                      description: 'Overrides the Tablet tab\'s own "Narrow column text align (≥ tablet)" starting at 1024px.',
                      options: [
                        { label: 'LEFT', value: 'lg:text-left' },
                        { label: 'CENTER', value: 'lg:text-center' },
                        { label: 'RIGHT', value: 'lg:text-right' },
                      ],
                    },
                    {
                      kind: 'enum',
                      key: 'narrowColumnContentVerticalAlignLg',
                      debugHighlightIds: ['TABLE OF CONTENTS'],
                      label: 'Narrow column content vertical align (≥ desktop)',
                      description: 'Overrides the Tablet tab\'s own "Narrow column content vertical align (≥ tablet)" starting at 1024px.',
                      options: HEADER_SEGMENT_JUSTIFY_LG_OPTIONS,
                    },
                    {
                      kind: 'enum',
                      key: 'wideColumnContentAlignLg',
                      debugHighlightIds: ['READING COLUMN'],
                      label: 'Wide column content align (≥ desktop)',
                      description: 'Overrides the Tablet tab\'s own "Wide column content align (≥ tablet)" starting at 1024px.',
                      options: HORIZONTAL_ALIGN_OPTIONS,
                    },
                    {
                      kind: 'select',
                      key: 'wideColumnContentWidthLg',
                      debugHighlightIds: ['READING COLUMN'],
                      label: 'Wide column content width (≥ desktop)',
                      description: 'Overrides the Tablet tab\'s own "Wide column content width (≥ tablet)" starting at 1024px. MATCH NARROW COLUMN caps this column\'s content to the narrow column\'s own real width, derived from this tab\'s own "Column split (≥ desktop)" ratio instead of a fixed percentage.',
                      options: WIDE_COLUMN_CONTENT_WIDTH_OPTIONS_LG,
                    },
                    {
                      kind: 'select',
                      key: 'wideColumnContentMaxWidthLg',
                      debugHighlightIds: ['READING COLUMN'],
                      label: 'Wide column content max width (≥ desktop)',
                      description: 'Overrides the Tablet tab\'s own "Wide column content max width (≥ tablet)" starting at 1024px.',
                      options: CONTENT_MAX_WIDTH_OPTIONS_LG,
                    },
                    {
                      kind: 'enum',
                      key: 'wideColumnTextAlignLg',
                      debugHighlightIds: ['READING COLUMN'],
                      label: 'Wide column text align (≥ desktop)',
                      description: 'Overrides the Tablet tab\'s own "Wide column text align (≥ tablet)" starting at 1024px.',
                      options: [
                        { label: 'LEFT', value: 'lg:text-left' },
                        { label: 'CENTER', value: 'lg:text-center' },
                        { label: 'RIGHT', value: 'lg:text-right' },
                      ],
                    },
                    {
                      kind: 'enum',
                      key: 'wideColumnContentVerticalAlignLg',
                      debugHighlightIds: ['READING COLUMN'],
                      label: 'Wide column content vertical align (≥ desktop)',
                      description: 'Overrides the Tablet tab\'s own "Wide column content vertical align (≥ tablet)" starting at 1024px.',
                      options: HEADER_SEGMENT_JUSTIFY_LG_OPTIONS,
                    },
                    {
                      kind: 'group',
                      label: 'Column colors (≥ desktop)',
                      fields: [
                        {
                          kind: 'enum',
                          key: 'colorSourceLg',
                          label: 'Color source (≥ desktop)',
                          description: 'Overrides the Tablet tab\'s own "Color source (≥ tablet)" starting at 1024px — a genuinely independent source for this tier. None: no background, the page surface shows through. Palette: derived from the card coloring engine\'s ramp. Custom: the two fixed colors below. Surface: derived from the page surface color, offset by the amounts below.',
                          options: [
                            { label: 'NONE', value: 'none' },
                            { label: 'PALETTE', value: 'palette' },
                            { label: 'CUSTOM', value: 'custom' },
                            { label: 'SURFACE', value: 'surface' },
                          ],
                        },
                        {
                          kind: 'color',
                          key: 'wideColumnCustomColorLg',
                          debugHighlightIds: ['READING COLUMN'],
                          label: 'Wide column custom color (≥ desktop)',
                          description: 'Used only when this tier\'s own "Color source (≥ desktop)" above is set to Custom.',
                          visibleWhen: config => config.colorSourceLg === 'custom',
                        },
                        {
                          kind: 'color',
                          key: 'narrowColumnCustomColorLg',
                          debugHighlightIds: ['TABLE OF CONTENTS'],
                          label: 'Narrow column custom color (≥ desktop)',
                          description: 'Used only when this tier\'s own "Color source (≥ desktop)" above is set to Custom.',
                          visibleWhen: config => config.colorSourceLg === 'custom',
                        },
                        {
                          kind: 'number',
                          key: 'wideColumnSurfaceOffsetLg',
                          debugHighlightIds: ['READING COLUMN'],
                          label: 'Wide column offset (≥ desktop)',
                          description: 'Used only when this tier\'s own "Color source (≥ desktop)" above is set to Surface. How much lighter (positive) or darker (negative) than the page surface color the wide column background is.',
                          min: -1,
                          max: 1,
                          step: 0.01,
                          visibleWhen: config => config.colorSourceLg === 'surface',
                        },
                        {
                          kind: 'number',
                          key: 'narrowColumnSurfaceOffsetLg',
                          debugHighlightIds: ['TABLE OF CONTENTS'],
                          label: 'Narrow column offset (≥ desktop)',
                          description: 'Used only when this tier\'s own "Color source (≥ desktop)" above is set to Surface. How much lighter (positive) or darker (negative) than the page surface color the narrow column background is.',
                          min: -1,
                          max: 1,
                          step: 0.01,
                          visibleWhen: config => config.colorSourceLg === 'surface',
                        },
                        SYNC_COLORS_FROM_DESKTOP_ACTION,
                      ],
                    },
                    // Parity with the Mobile/Tablet tabs' own padding/margin
                    // groups below — a real, independent lg: override for every
                    // field that already had a mobile+tablet pair, not just the
                    // split ratio above. Defaults mirror each field's current
                    // Tablet-tab value (same computed padding/margin in px), so
                    // adding this tier alone changes nothing visually until an
                    // operator touches it.
                    {
                      kind: 'group',
                      label: 'Body gutter (both columns)',
                      fields: [
                        {
                          kind: 'select',
                          key: 'bodyGutterPaddingLeftLg',
                          debugHighlightIds: ['BODY'],
                          label: 'Padding left (≥ desktop)',
                          description: 'Same as padding left, lg and up — overrides the Tablet tab\'s own value starting at 1024px.',
                          options: PADDING_LEFT_LG_OPTIONS,
                        },
                        {
                          kind: 'select',
                          key: 'bodyGutterPaddingRightLg',
                          debugHighlightIds: ['BODY'],
                          label: 'Padding right (≥ desktop)',
                          description: 'Same as padding right, lg and up — overrides the Tablet tab\'s own value starting at 1024px.',
                          options: PADDING_RIGHT_LG_OPTIONS,
                        },
                      ],
                    },
                    {
                      kind: 'group',
                      label: 'Wide column padding & margin',
                      fields: [
                        {
                          kind: 'subgroup',
                          label: 'Padding',
                          fields: [
                            {
                              kind: 'select',
                              key: 'wideColumnContentPaddingTopLg',
                              debugHighlightIds: ['WIDE COLUMN'],
                              label: 'Padding top (≥ desktop)',
                              description: 'Same as padding top, lg and up.',
                              options: PADDING_TOP_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'wideColumnContentPaddingRightLg',
                              debugHighlightIds: ['WIDE COLUMN'],
                              label: 'Padding right (≥ desktop)',
                              description: 'Right padding on the article column\'s own outer box, lg and up — overrides the Tablet tab\'s own value starting at 1024px.',
                              options: PADDING_RIGHT_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'wideColumnContentPaddingBottomLg',
                              debugHighlightIds: ['WIDE COLUMN'],
                              label: 'Padding bottom (≥ desktop)',
                              description: 'Overrides the Tablet tab\'s own "Padding bottom (≥ tablet)" starting at 1024px.',
                              options: PADDING_BOTTOM_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'wideColumnContentPaddingLeftLg',
                              debugHighlightIds: ['WIDE COLUMN'],
                              label: 'Padding left (≥ desktop)',
                              description: 'Left padding on the article column\'s own outer box, lg and up — overrides the Tablet tab\'s own value starting at 1024px.',
                              options: PADDING_LEFT_LG_OPTIONS,
                            },
                          ],
                        },
                        {
                          kind: 'subgroup',
                          label: 'Margin',
                          fields: [
                            {
                              kind: 'select',
                              key: 'wideColumnContentMarginTopLg',
                              debugHighlightIds: ['WIDE COLUMN'],
                              label: 'Margin top (≥ desktop)',
                              description: 'Same as margin top, lg and up.',
                              options: MARGIN_TOP_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'wideColumnContentMarginRightLg',
                              debugHighlightIds: ['WIDE COLUMN'],
                              label: 'Margin right (≥ desktop)',
                              description: 'Overrides the Tablet tab\'s right margin starting at 1024px.',
                              options: MARGIN_RIGHT_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'wideColumnContentMarginBottomLg',
                              debugHighlightIds: ['WIDE COLUMN'],
                              label: 'Margin bottom (≥ desktop)',
                              description: 'Same as margin bottom, lg and up.',
                              options: MARGIN_BOTTOM_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'wideColumnContentMarginLeftLg',
                              debugHighlightIds: ['WIDE COLUMN'],
                              label: 'Margin left (≥ desktop)',
                              description: 'Overrides the Tablet tab\'s left margin starting at 1024px.',
                              options: MARGIN_LEFT_LG_OPTIONS,
                            },
                          ],
                        },
                      ],
                    },
                    {
                      kind: 'group',
                      label: 'Narrow column padding & margin',
                      fields: [
                        {
                          kind: 'subgroup',
                          label: 'Padding',
                          fields: [
                            {
                              kind: 'select',
                              key: 'narrowColumnContentPaddingTopLg',
                              debugHighlightIds: ['TABLE OF CONTENTS'],
                              label: 'Padding top (≥ desktop)',
                              description: 'Same as padding top, lg and up.',
                              options: PADDING_TOP_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'narrowColumnContentPaddingRightLg',
                              debugHighlightIds: ['TABLE OF CONTENTS'],
                              label: 'Padding right (≥ desktop)',
                              description: 'Right padding on the TOC\'s sticky wrapper, lg and up — overrides the Tablet tab\'s own value starting at 1024px.',
                              options: PADDING_RIGHT_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'narrowColumnContentPaddingBottomLg',
                              debugHighlightIds: ['NARROW COLUMN'],
                              label: 'Padding bottom (≥ desktop)',
                              description: 'Overrides the Tablet tab\'s own "Padding bottom (≥ tablet)" starting at 1024px.',
                              options: PADDING_BOTTOM_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'narrowColumnContentPaddingLeftLg',
                              debugHighlightIds: ['TABLE OF CONTENTS'],
                              label: 'Padding left (≥ desktop)',
                              description: 'Left padding on the TOC\'s sticky wrapper, lg and up — overrides the Tablet tab\'s own value starting at 1024px.',
                              options: PADDING_LEFT_LG_OPTIONS,
                            },
                          ],
                        },
                        {
                          kind: 'subgroup',
                          label: 'Margin',
                          fields: [
                            {
                              kind: 'select',
                              key: 'narrowColumnContentMarginTopLg',
                              debugHighlightIds: ['NARROW COLUMN'],
                              label: 'Margin top (≥ desktop)',
                              description: 'Same as margin top, lg and up.',
                              options: MARGIN_TOP_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'narrowColumnContentMarginRightLg',
                              debugHighlightIds: ['NARROW COLUMN'],
                              label: 'Margin right (≥ desktop)',
                              description: 'Overrides the Tablet tab\'s right margin starting at 1024px.',
                              options: MARGIN_RIGHT_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'narrowColumnContentMarginBottomLg',
                              debugHighlightIds: ['NARROW COLUMN'],
                              label: 'Margin bottom (≥ desktop)',
                              description: 'Same as margin bottom, lg and up.',
                              options: MARGIN_BOTTOM_LG_OPTIONS,
                            },
                            {
                              kind: 'select',
                              key: 'narrowColumnContentMarginLeftLg',
                              debugHighlightIds: ['NARROW COLUMN'],
                              label: 'Margin left (≥ desktop)',
                              description: 'Overrides the Tablet tab\'s left margin starting at 1024px.',
                              options: MARGIN_LEFT_LG_OPTIONS,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
];
