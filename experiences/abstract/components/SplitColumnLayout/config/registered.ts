export type SplitColumnLayoutWideSide = 'left' | 'right';
// 'stacked': this breakpoint tier emits no grid-column override at all —
// under CSS's own mobile-first cascade, that means whichever narrower tier
// already resolved to (ultimately the unconditional `grid-cols-1` base)
// keeps applying, i.e. both columns render at their natural 100% width,
// stacked in normal document flow. Every other value is a literal,
// pre-written `grid-cols-[X%_Y%]` pair (narrow%/wide%) — never assembled
// from an interpolated percentage number, per this codebase's Tailwind-only
// styling rule (see SplitColumnLayout.tsx's own two lookup tables, one per
// tier, each keyed by wideColumnSide too, for the complete literal strings).
// A small curated set, not a free-form percentage, for the same JIT-safety
// reason every other spacing/width scale in this codebase is a finite enum.
export type SplitColumnRatioTier = 'stacked' | '30/70' | '35/65' | '38/62' | '40/60' | '45/55' | '50/50';
// Which column renders first when the layout is in its stacked state (either
// tier resolves to 'stacked', or below the narrower tier's own breakpoint)
// — decoupled from wideColumnSide on purpose: wideColumnSide only ever
// meant "which physical side is wider once split," but its own DOM-order
// side effect (see SplitColumnLayout.tsx's own render — narrow/wide element
// order is currently tied directly to wideColumnSide, no override exists)
// silently doubled as "which one stacks on top," with no way to choose
// those two independently. 'narrowFirst' (default) reproduces today's real
// DOM order exactly for every existing consumer — a no-op default.
// 'wideFirst' visually reorders via a literal `order-*` class applied only
// below the tier the layout is actually split at (never disturbs DOM order
// at the split tier itself, which stays wideColumnSide-driven as today).
// Caution — this is a real, named accessibility tradeoff, not a free visual
// choice: a screen reader still linearizes by DOM order regardless of CSS
// `order`, so 'wideFirst' means sighted-stacked users and screen-reader
// users encounter the two columns in different sequences (WCAG 1.3.2
// Meaningful Sequence, 2.4.3 Focus Order). Choose it deliberately — e.g.
// when the narrow column is long, list-shaped navigational content that
// would otherwise bury the page's actual primary content many viewport-
// heights down before a mobile reader reaches it — not by default.
export type SplitColumnStackedOrder = 'narrowFirst' | 'wideFirst';
// 'pushDown' (default): this column reserves space for the fixed header —
// its own box gets a top padding equal to the header's live-measured
// height, reproducing the pre-fixed-header behavior of content starting
// visually below the nav. 'float': no reserved padding — the column starts
// at the true viewport top and the fixed header floats over it. Named per
// wideColumn/narrowColumn (not physical left/right) for the same reason
// wideColumnCustomColor/narrowColumnCustomColor already are — wideColumnSide
// decides which physical side each of these lands on.
export type SplitColumnLayoutHeaderBehavior = 'pushDown' | 'float';
// 'none': no background applied to either column — the page's own surface
// shows through, unchanged. 'surface': wideColumnColor/narrowColumnColor are
// each derived from the page surface color via deriveSurfaceColor (helpers/
// surfaceColorDerivation.ts — the same primitive CtaButtonConfig's own auto
// colors use), independently offset by wideColumnSurfaceOffset/
// narrowColumnSurfaceOffset below.
export type SplitColumnLayoutColorSource = 'none' | 'palette' | 'custom' | 'surface';
// 'transparent': this header segment gets no background of its own — the
// page's own surface shows straight through, same as before either of the
// two split-band fields below existed. 'custom': splitBand{Left,Right}
// CustomColor is used verbatim, independent of the columns' own colorSource.
// 'syncWithColumnBelow': mirrors whichever color wideColumnColor/
// narrowColumnColor above actually resolved to — the default, since it
// reproduces the band's only previous behavior (always hard-locked to the
// column color) byte-for-byte for anyone already using headerSplitBandEnabled.
export type SplitColumnLayoutBandMode = 'transparent' | 'custom' | 'syncWithColumnBelow';

/**
 * Shared two-column shell extracted from pages/about.tsx's own split-grid
 * (see PLAN-HOMEPAGE-IA-LAYOUT.md Section 8) — owns the grid ratio and the
 * palette-vs-custom color resolution, not the per-consumer visual treatment
 * (heights, padding, nav controls) that stays with each page.
 */
export type SplitColumnLayoutConfig = {
  /** Which physical side gets the wider (62%) column. 'right' (default):
   * narrow-left/wide-right, /about's arrangement. 'left': wide-left/
   * narrow-right, /abstract's arrangement. Resolves to one of exactly two
   * literal Tailwind arbitrary-value classes — no runtime-interpolated
   * ratio, per this codebase's Tailwind-only styling rule. */
  wideColumnSide: SplitColumnLayoutWideSide;
  /** The narrow column's own share of the grid at the `md` breakpoint (768px)
   * — see SplitColumnRatioTier's own doc comment for the full mechanism.
   * '38/62' (default) reproduces this layout's original, single-breakpoint
   * behavior exactly (previously the only value that existed, hardcoded).
   * 'stacked' here means the split doesn't begin at `md` at all — the
   * layout stays in its mobile-shaped single-column flow until whichever
   * width narrowColumnWidthTierLg's own tier resolves to. */
  narrowColumnWidthTierMd: SplitColumnRatioTier;
  /** Same idea as narrowColumnWidthTierMd, at the `lg` breakpoint (1024px)
   * instead. '38/62' (default) — combined with narrowColumnWidthTierMd's
   * own '38/62' default, both tiers agree, reproducing today's single-
   * breakpoint split exactly (no visible change from adding this field
   * alone). Deferring a page's own split until `lg` (narrowColumnWidthTierMd:
   * 'stacked', this field: '38/62') is what actually fixes a narrow column
   * whose own content breaks under the `md`-only default — confirmed via a
   * live measurement sweep against a real long-form table of contents:
   * splitting at `md` collapsed that column from ~700px to 248px in one
   * step, degrading ~1/3 of its entries, not recovering until ~1000px; this
   * field existing is what lets a page defer past that trough instead of
   * living inside it. See PLAN-SPLIT-COLUMN-RESPONSIVE-NARROW-COLUMN.md. */
  narrowColumnWidthTierLg: SplitColumnRatioTier;
  /** See SplitColumnStackedOrder's own doc comment. 'narrowFirst' (default)
   * reproduces today's real DOM order for every existing consumer exactly —
   * a no-op default. */
  stackedColumnOrder: SplitColumnStackedOrder;
  /** Independent per-column choice between reserving space for the fixed
   * header ('pushDown') and letting it float over this column's own content
   * ('float') — see SplitColumnLayoutHeaderBehavior's own doc comment.
   * Consumed by SplitColumnPageShell (the column's own top padding) and, for
   * whichever column renders the vertical card stack, by
   * useCardStackLayout's headerOffsetPx (the stack's fixed layer otherwise
   * ignores its column's box entirely). Defaults 'pushDown' for both — byte-
   * for-byte the only behavior that existed before this field, for every
   * current caller. */
  wideColumnHeaderBehavior: SplitColumnLayoutHeaderBehavior;
  narrowColumnHeaderBehavior: SplitColumnLayoutHeaderBehavior;
  /** Opt-in, default false: blurs behind the header, scoped to whichever
   * physical side(s) currently have a column set to 'float' above (a
   * 'pushDown' side never gets it — nothing renders under the header there
   * to blur in the first place). Exists so nav text/logo stay legible over
   * real, colorful content bleeding under the header regardless of
   * colorSource/split-band choice, without forcing that treatment on by
   * default — the blur is a deliberate visual choice per page/config, not
   * an automatic consequence of picking 'float'. SplitColumnPageShell
   * resolves this + wideColumnSide + each column's own *ColumnHeaderBehavior
   * into the two physical-side booleans SiteHeader actually renders
   * (legibilityScrimLeftEnabled/-RightEnabled) — this field alone doesn't
   * say which physical side, only whether the feature is armed at all. */
  legibilityScrimEnabled: boolean;
  /** 'palette' (default): wideColumnColor/narrowColumnColor/header
   * split-band colors are derived from the same continuous palette ramp
   * the card coloring engine's slides use, keyed off activeColorIndex.
   * 'custom': the two custom colors below are used verbatim, with no call
   * into the palette engine at all. */
  colorSource: SplitColumnLayoutColorSource;
  /** Used only when colorSource is 'custom'. */
  wideColumnCustomColor: string;
  /** Used only when colorSource is 'custom'. */
  narrowColumnCustomColor: string;
  /** Used only when colorSource is 'surface' — how much lighter (positive)
   * or darker (negative) than the page surface color each column is,
   * independently. */
  wideColumnSurfaceOffset: number;
  narrowColumnSurfaceOffset: number;
  /** Passthrough for whichever header the consuming page renders — wires
   * into SiteHeader's own splitBandActive prop. Structurally inert
   * unless the page also supplies the header with the two resolved colors. */
  headerSplitBandEnabled: boolean;
  /** Only meaningful while headerSplitBandEnabled is on. Independent
   * per-segment control over the header's own two band colors — previously
   * these always mirrored wideColumnColor/narrowColumnColor with no way to
   * diverge (e.g. a transparent header over a colored column, or a header
   * color unrelated to the column's own). 'left'/'right' name the same
   * physical sides wideColumnSide above does, not "wide"/"narrow" — the
   * header band's own two cells are a fixed physical split
   * (SiteHeader.tsx's SPLIT_BAND_GRID_COLS_BY_SIDE), independent of
   * which content slot currently happens to be wide. */
  splitBandLeftMode: SplitColumnLayoutBandMode;
  /** Used only when splitBandLeftMode is 'custom'. */
  splitBandLeftCustomColor: string;
  splitBandRightMode: SplitColumnLayoutBandMode;
  /** Used only when splitBandRightMode is 'custom'. */
  splitBandRightCustomColor: string;
};

// Neutral shared foundation — not consumed by /about or /abstract at
// runtime (both own a complete instance of their own, below, per
// PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md), only a safe starting point for a
// hypothetical future page that renders SplitColumnLayout without needing
// to diverge from it at all.
export const DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG = {
  wideColumnSide: 'right',
  narrowColumnWidthTierMd: '38/62',
  narrowColumnWidthTierLg: '38/62',
  stackedColumnOrder: 'narrowFirst',
  wideColumnHeaderBehavior: 'pushDown',
  narrowColumnHeaderBehavior: 'pushDown',
  legibilityScrimEnabled: false,
  colorSource: 'surface',
  wideColumnCustomColor: '#0e1230',
  narrowColumnCustomColor: '#0e1230',
  wideColumnSurfaceOffset: 0,
  narrowColumnSurfaceOffset: 0,
  headerSplitBandEnabled: false,
  splitBandLeftMode: 'syncWithColumnBelow',
  splitBandLeftCustomColor: '#0e1230',
  splitBandRightMode: 'syncWithColumnBelow',
  splitBandRightCustomColor: '#0e1230',
} satisfies SplitColumnLayoutConfig;

/**
 * Per-page config ownership (PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md): every
 * page that renders SplitColumnLayout with its own diverging needs owns a
 * complete, independent instance here — never a partial spread over
 * DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG above or over each other. `satisfies
 * SplitColumnLayoutConfig` means a missing or renamed field is a compile
 * error on each entry individually, not a silent runtime fallback — the
 * property this design is actually for. Co-located here, next to the
 * shared type they're both instances of, specifically so a future change to
 * that type's shape is reviewed against every page's value in the same
 * diff — see SplitColumnLayout.pageConfigs.test.ts for the automated check
 * that these stay in sync with what's actually registered
 * (SplitColumnLayout.panel.ts's own ABSTRACT_/ABOUT_SPLIT_COLUMN_LAYOUT_PANEL).
 */
export const ABSTRACT_SPLIT_COLUMN_LAYOUT_CONFIG = {
  wideColumnSide: 'right',
  narrowColumnWidthTierMd: '38/62',
  narrowColumnWidthTierLg: '38/62',
  stackedColumnOrder: 'narrowFirst',
  wideColumnHeaderBehavior: 'float',
  narrowColumnHeaderBehavior: 'float',
  legibilityScrimEnabled: false,
  colorSource: 'custom',
  wideColumnCustomColor: '#d3d4de',
  narrowColumnCustomColor: '#dadbe2',
  wideColumnSurfaceOffset: 0,
  narrowColumnSurfaceOffset: 0,
  headerSplitBandEnabled: true,
  splitBandLeftMode: 'syncWithColumnBelow',
  splitBandLeftCustomColor: '#0e1230',
  splitBandRightMode: 'transparent',
  splitBandRightCustomColor: '#0e1230',
} satisfies SplitColumnLayoutConfig;

export const ABOUT_SPLIT_COLUMN_LAYOUT_CONFIG = {
  wideColumnSide: 'right',
  narrowColumnWidthTierMd: '38/62',
  narrowColumnWidthTierLg: '38/62',
  stackedColumnOrder: 'narrowFirst',
  wideColumnHeaderBehavior: 'pushDown',
  narrowColumnHeaderBehavior: 'pushDown',
  legibilityScrimEnabled: false,
  colorSource: 'surface',
  wideColumnCustomColor: '#0e1230',
  narrowColumnCustomColor: '#0e1230',
  wideColumnSurfaceOffset: 0,
  narrowColumnSurfaceOffset: 0,
  headerSplitBandEnabled: false,
  splitBandLeftMode: 'syncWithColumnBelow',
  splitBandLeftCustomColor: '#0e1230',
  splitBandRightMode: 'syncWithColumnBelow',
  splitBandRightCustomColor: '#0e1230',
} satisfies SplitColumnLayoutConfig;

// pages/posts-lab/[slug].tsx (PLAN: article reading view) — originally a
// verbatim snapshot of ABSTRACT_SPLIT_COLUMN_LAYOUT_CONFIG's own colors/
// bands, since diverged in response to reading-view-specific feedback: the
// wide (article-body) column now uses a light custom color matching
// pageSurfaceConfig's own default (a light reading surface reads better for
// article body text than /abstract's dark card background), the narrow
// (ToC) column stays dark, and both columns reserve space for the fixed
// header via 'pushDown' rather than floating under it — a top-anchored
// reading column doesn't need /abstract's own card-stack-driven float
// behavior. legibilityScrimEnabled has no effect while both columns are
// 'pushDown' (see that field's own doc comment — a 'pushDown' side has
// nothing rendering under the header to blur), kept on only so a future
// 'float' experiment doesn't silently need it re-enabled too. Independent
// from /abstract's own instance from this moment on either way: tuning one
// never touches the other.
export const POSTS_LAB_SPLIT_COLUMN_LAYOUT_CONFIG = {
  wideColumnSide: 'right',
  // Deliberately diverges from every other page's own '38/62' default —
  // see narrowColumnWidthTierLg's own doc comment for the measured data
  // behind this. Stays stacked through `md`, splits at `lg`, closing the
  // measured cramped-column trough (~768-1000px) instead of narrowing it.
  narrowColumnWidthTierMd: 'stacked',
  narrowColumnWidthTierLg: '38/62',
  // Default ('narrowFirst') — deliberately NOT overridden. An earlier
  // revision of this config set 'wideFirst' here to stop the fully-expanded
  // ToC from burying the article's own <h1> ~1.23 viewport-heights down the
  // page on a real phone width. That reasoning stopped applying once
  // TableOfContents config's own collapsedByDefaultWhenStacked
  // shipped (TableOfContentsDisclosure in experiences/synth/components/
  // TableOfContents.tsx) — the ToC now renders as a single collapsed line
  // while stacked, so it no longer meaningfully pushes <h1> down regardless
  // of column order. 'wideFirst' was left in place anyway during that
  // change, which silently relocated the ToC to *after the entire article
  // body* (grid-cols-1 stacking gives each column its own full-height row,
  // so 'wideFirst' — order:-9999 on the multi-thousand-px wide column —
  // pushes the narrow column's row to the very end of the document) — a
  // real, confirmed regression (the ToC was reported as effectively
  // missing), not a tradeoff. 'narrowFirst' restores the ToC to its
  // conventional top-of-article position, collapsed to one line, matching
  // every other page's own default. See
  // PLAN-SPLIT-COLUMN-RESPONSIVE-NARROW-COLUMN.md §2.2 for the original
  // (now superseded) reasoning.
  stackedColumnOrder: 'narrowFirst',
  wideColumnHeaderBehavior: 'pushDown',
  narrowColumnHeaderBehavior: 'pushDown',
  legibilityScrimEnabled: true,
  colorSource: 'custom',
  wideColumnCustomColor: '#d3d4de',
  narrowColumnCustomColor: '#dadbe2',
  wideColumnSurfaceOffset: 0,
  narrowColumnSurfaceOffset: 0,
  headerSplitBandEnabled: true,
  splitBandLeftMode: 'syncWithColumnBelow',
  splitBandLeftCustomColor: '#d1d1d1',
  splitBandRightMode: 'syncWithColumnBelow',
  splitBandRightCustomColor: '#27307c',
} satisfies SplitColumnLayoutConfig;

const WIDE_SIDES: ReadonlyArray<SplitColumnLayoutWideSide> = ['left', 'right'];
const RATIO_TIERS: ReadonlyArray<SplitColumnRatioTier> = [
  'stacked', '30/70', '35/65', '38/62', '40/60', '45/55', '50/50',
];
const STACKED_ORDERS: ReadonlyArray<SplitColumnStackedOrder> = ['narrowFirst', 'wideFirst'];
const HEADER_BEHAVIORS: ReadonlyArray<SplitColumnLayoutHeaderBehavior> = ['pushDown', 'float'];
const COLOR_SOURCES: ReadonlyArray<SplitColumnLayoutColorSource> = [
  'none', 'palette', 'custom', 'surface',
];
const BAND_MODES: ReadonlyArray<SplitColumnLayoutBandMode> = [
  'transparent', 'custom', 'syncWithColumnBelow',
];

const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);
const normalizeColor = (value: string, fallback: string) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
};
const clampRange = (value: number, min: number, max: number, fallback: number) => (
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback))
);

export function normalizeSplitColumnLayoutConfig(
  config: Partial<SplitColumnLayoutConfig> | undefined,
): SplitColumnLayoutConfig {
  const base = { ...DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG, ...(config ?? {}) };
  return {
    wideColumnSide: token(
      base.wideColumnSide, WIDE_SIDES, DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG.wideColumnSide,
    ),
    narrowColumnWidthTierMd: token(
      base.narrowColumnWidthTierMd, RATIO_TIERS, DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG.narrowColumnWidthTierMd,
    ),
    narrowColumnWidthTierLg: token(
      base.narrowColumnWidthTierLg, RATIO_TIERS, DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG.narrowColumnWidthTierLg,
    ),
    stackedColumnOrder: token(
      base.stackedColumnOrder, STACKED_ORDERS, DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG.stackedColumnOrder,
    ),
    wideColumnHeaderBehavior: token(
      base.wideColumnHeaderBehavior,
      HEADER_BEHAVIORS,
      DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG.wideColumnHeaderBehavior,
    ),
    narrowColumnHeaderBehavior: token(
      base.narrowColumnHeaderBehavior,
      HEADER_BEHAVIORS,
      DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG.narrowColumnHeaderBehavior,
    ),
    legibilityScrimEnabled: base.legibilityScrimEnabled === true,
    colorSource: token(
      base.colorSource, COLOR_SOURCES, DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG.colorSource,
    ),
    wideColumnCustomColor: normalizeColor(
      base.wideColumnCustomColor, DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG.wideColumnCustomColor,
    ),
    narrowColumnCustomColor: normalizeColor(
      base.narrowColumnCustomColor, DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG.narrowColumnCustomColor,
    ),
    wideColumnSurfaceOffset: clampRange(
      base.wideColumnSurfaceOffset,
      -1,
      1,
      DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG.wideColumnSurfaceOffset,
    ),
    narrowColumnSurfaceOffset: clampRange(
      base.narrowColumnSurfaceOffset,
      -1,
      1,
      DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG.narrowColumnSurfaceOffset,
    ),
    headerSplitBandEnabled: base.headerSplitBandEnabled !== false,
    splitBandLeftMode: token(
      base.splitBandLeftMode, BAND_MODES, DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG.splitBandLeftMode,
    ),
    splitBandLeftCustomColor: normalizeColor(
      base.splitBandLeftCustomColor, DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG.splitBandLeftCustomColor,
    ),
    splitBandRightMode: token(
      base.splitBandRightMode, BAND_MODES, DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG.splitBandRightMode,
    ),
    splitBandRightCustomColor: normalizeColor(
      base.splitBandRightCustomColor, DEFAULT_SPLIT_COLUMN_LAYOUT_CONFIG.splitBandRightCustomColor,
    ),
  };
}
