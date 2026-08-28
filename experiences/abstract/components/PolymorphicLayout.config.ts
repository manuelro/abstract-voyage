import {
  CONTENT_WIDTH_PERCENT_OPTIONS,
  CONTENT_WIDTH_PERCENT_WIDE_OPTIONS,
  CONTENT_WIDTH_PERCENT_LG_OPTIONS,
  type ContentWidthPercentClass,
  type ContentWidthPercentWideClass,
  type ContentWidthPercentLgClass,
} from '../../../components/tailwindWidthScale'
import { CONTENT_MIN_HEIGHT_OPTIONS, type ContentMinHeightClass } from '../../../components/tailwindMinHeightScale'
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
  type PaddingTopClass,
  type PaddingTopWideClass,
  type PaddingTopLgClass,
  type PaddingRightClass,
  type PaddingRightWideClass,
  type PaddingRightLgClass,
  type PaddingBottomClass,
  type PaddingBottomWideClass,
  type PaddingBottomLgClass,
  type PaddingLeftClass,
  type PaddingLeftWideClass,
  type PaddingLeftLgClass,
  type MarginTopClass,
  type MarginTopWideClass,
  type MarginTopLgClass,
  type MarginRightClass,
  type MarginRightWideClass,
  type MarginRightLgClass,
  type MarginBottomClass,
  type MarginBottomWideClass,
  type MarginBottomLgClass,
  type MarginLeftClass,
  type MarginLeftWideClass,
  type MarginLeftLgClass,
} from '../../../components/tailwindSpacingScale'
import type {
  SiteHeaderContentWidth,
} from './SiteHeader/config/registered'

// PolymorphicLayout owns its full type domain — no import from
// SplitColumnLayout.config.ts (see PLAN-SPLIT-COLUMN-LAYOUT-ENRICHMENT-
// EXTRACTION.md's own "full operational independence" requirement). The 6
// unions and 17 base fields below are redeclared here structurally
// matching SplitColumnLayoutConfig's own shape exactly (same literal
// values, same field names) — not imported — so PolymorphicLayoutConfig
// can outlive/replace that type without any consuming page's own render
// call site (which still passes this object straight into
// SplitColumnPageShell's own SplitColumnLayoutConfig-typed prop) needing a
// breaking change. TypeScript's structural typing keeps the two
// interchangeable at that render call site with zero shared import.
/** Which physical side gets the wider (62%) column. 'right' (default):
 * narrow-left/wide-right, /about's arrangement. 'left': wide-left/
 * narrow-right, /abstract's arrangement. */
export type PolymorphicLayoutWideSide = 'left' | 'right';
/** The narrow column's own share of the grid at a given breakpoint tier —
 * 'stacked' emits no split at all (both columns render at their natural
 * 100% width); every other value is a literal, pre-written
 * narrow%/wide% pair. */
export type PolymorphicLayoutRatioTier =
  'stacked' | '30/70' | '35/65' | '38/62' | '40/60' | '45/55' | '50/50';
// One literal, JIT-scannable calc() class per non-'stacked' PolymorphicLayoutRatioTier
// value — narrow% / wide% of the wide column's own box, which caps the wide
// column's content to exactly the narrow column's own absolute width (see
// wideColumnContentWidthWide's own doc comment above for why this must be
// derived per-tier rather than a single hardcoded fraction). Hand-written in
// full per tier (never assembled via `` `calc(100%_*_${n}/${100 - n})` `` at
// runtime), same discipline as MD_RATIO_FRAGMENT/LG_RATIO_FRAGMENT
// (SplitColumnLayout.tsx) — this codebase's Tailwind-only styling rule.
// Deliberately its own copy, not imported from SplitColumnLayout.tsx's own
// narrowColumnFractionForTier — see this file's own top-of-file
// operational-independence note (PolymorphicLayoutRatioTier is a structural,
// not nominal, duplicate of SplitColumnRatioTier for the same reason).
export const WIDE_COLUMN_CONTENT_MATCH_NARROW_CLASS_WIDE: Record<Exclude<PolymorphicLayoutRatioTier, 'stacked'>, string> = {
  '30/70': 'md:max-w-[calc(100%_*_30/70)]',
  '35/65': 'md:max-w-[calc(100%_*_35/65)]',
  '38/62': 'md:max-w-[calc(100%_*_38/62)]',
  '40/60': 'md:max-w-[calc(100%_*_40/60)]',
  '45/55': 'md:max-w-[calc(100%_*_45/55)]',
  '50/50': 'md:max-w-[calc(100%_*_50/50)]',
};
// lg:-prefixed sibling, resolved against narrowColumnWidthTierLg instead of
// narrowColumnWidthTierMd — see wideColumnContentWidthLg's own doc comment.
export const WIDE_COLUMN_CONTENT_MATCH_NARROW_CLASS_LG: Record<Exclude<PolymorphicLayoutRatioTier, 'stacked'>, string> = {
  '30/70': 'lg:max-w-[calc(100%_*_30/70)]',
  '35/65': 'lg:max-w-[calc(100%_*_35/65)]',
  '38/62': 'lg:max-w-[calc(100%_*_38/62)]',
  '40/60': 'lg:max-w-[calc(100%_*_40/60)]',
  '45/55': 'lg:max-w-[calc(100%_*_45/55)]',
  '50/50': 'lg:max-w-[calc(100%_*_50/50)]',
};
/** Which column renders first while the layout is in its stacked state.
 * 'narrowFirst' (default) matches real DOM order. 'wideFirst' visually
 * reorders via CSS only — a screen reader still encounters the columns in
 * DOM order regardless (WCAG 1.3.2/2.4.3), so choose deliberately. */
export type PolymorphicLayoutStackedOrder = 'narrowFirst' | 'wideFirst';
/** 'pushDown' (default): this column reserves space for the fixed header.
 * 'float': no reserved space — the column starts at the true viewport top
 * and the header floats over it. */
export type PolymorphicLayoutHeaderBehavior = 'pushDown' | 'float';
/** 'none': no background, the page surface shows through. 'palette':
 * derived from the card coloring engine's own ramp. 'custom': the two
 * fixed colors below, used verbatim. 'surface': derived from the page
 * surface color, offset by the amounts below. */
export type PolymorphicLayoutColorSource = 'none' | 'palette' | 'custom' | 'surface';
/** 'transparent': this header segment gets no background of its own.
 * 'custom': the fixed color below, used verbatim. 'syncWithColumnBelow':
 * mirrors whichever color the column below it actually resolved to. */
export type PolymorphicLayoutBandMode = 'transparent' | 'custom' | 'syncWithColumnBelow';
/** 'bounded': the whole body grid (both columns together) sits inside a
 * max-width, centered wrapper. 'full-bleed': the body grid renders
 * directly, no cap, no centering — its columns reach the true viewport
 * edge, on both sides simultaneously (this is a single toggle over the
 * entire two-column grid as one unit, never a per-column setting — see
 * SplitColumnPageShell.tsx's own contentContainer prop, which this
 * mirrors structurally, not by import). */
export type PolymorphicLayoutContentContainer = 'bounded' | 'full-bleed';

// Promoted from pages/posts-lab/postLab.config.ts (PLAN-SPLIT-COLUMN-LAYOUT-ENRICHMENT-EXTRACTION.md
// Stage 1) — the entire "Posts lab page layout" scope, relocated here
// under a name that doesn't hint at any one page, mechanic (the current
// two-column "split" grid), or content shape. Deliberately not "Abstract"
// either — this codebase already uses "Abstract" as the /abstract page's
// own brand prefix (SiteHeader, AbstractPostDock, etc.), which
// would make that name ambiguous here. "Polymorphic" is unclaimed and
// carries the intended meaning: one config/panel shape, many concrete
// per-page value instances.
//
// Generic on purpose — this is the shared vocabulary for "a content
// container positioned inside a split-column layout's own column," not
// anything specific to a table of contents or an article body. Keeping it
// abstract here is what let narrowColumnContentAlignWide/
// wideColumnContentAlignWide below share one type instead of two identical
// ones, and is what a future cross-page unification would reuse.
export type PolymorphicLayoutContentContainerAlign = 'items-start' | 'items-center' | 'items-end';
// A literal margin class on a width-capped wrapper repositions the block
// itself, not `items-*`/align-items on a flex container (see
// PolymorphicLayoutContentContainerAlign's own doc comment for why). md:-prefixed
// since a column's own content container only applies width/horizontal-
// align once the split-column layout is active (md+) — below md it
// renders full-width, unaligned, in stacked mode. Shared by both columns'
// content containers (wideColumnContentAlignWide, narrowColumnContentAlignWide)
// since the mapping itself is identical either way. Relocated here from
// pages/posts-lab/[slug].tsx (its own former home, despite already being
// documented there as "a generic 'position a content container within
// its column' primitive, not tied to either column's own content") —
// components/PolymorphicLayout.tsx is this array's one real internal
// consumer now, on behalf of every PolymorphicLayoutConfig-integrated
// page, rather than each page declaring its own copy.
// Every tier below explicitly sets *both* margin-left and margin-right at
// every key, never just the one side that happens to differ from the
// previous tier's default. This is load-bearing, not stylistic: a page
// whose base/Wide tier resolves to 'items-end' (ml-auto) and whose Lg tier
// is set to 'items-start' (mr-auto alone) would, at ≥1024px, have BOTH
// classes' media queries simultaneously true — `ml-auto` (unprefixed,
// always active) and `lg:mr-auto` don't share a CSS property, so neither
// one is a specificity/cascade "override" of the other; both compute at
// once, and a box with margin-left:auto AND margin-right:auto together
// centers itself regardless of which single value either tier named alone.
// Confirmed live: pages/abstract.tsx's own "Wide column content align"
// panel control set to START rendered the card dead-center, not
// left-aligned, until this fix. Every tier now redundantly re-declares the
// *other* side back to its zero value (mr-0/ml-0), so a higher tier's class
// is a genuine same-property override at every key, the identical
// mobile-first guarantee every other tiered field in this file (padding,
// margin, width) already relies on — not a new mechanism, just correcting
// this one field to actually follow it.
export const CONTENT_ALIGN_MARGIN_CLASS_WIDE: Record<PolymorphicLayoutContentContainerAlign, string> = {
  'items-start': 'md:mr-auto md:ml-0',
  'items-center': 'md:mx-auto',
  'items-end': 'md:ml-auto md:mr-0',
};
// Base (unprefixed, applies whenever the layout is stacked below md — a
// content container's own horizontal position within its full-width single
// column) and Lg (≥ desktop, overriding the Wide/md tier starting at 1024px)
// siblings of CONTENT_ALIGN_MARGIN_CLASS_WIDE above — same PolymorphicLayoutContentContainerAlign
// key vocabulary, same margin-class mechanism, different breakpoint prefix.
// Promoted alongside wideColumnContentWidth*/wideColumnContentVerticalAlign*
// (PLAN-POLYMORPHIC-LAYOUT-CONTENT-CONTAINER-PRIMITIVE.md) so a column's own
// content-container alignment is genuinely configurable per device size —
// previously Wide-only, with no base/Lg override, on both columns.
export const CONTENT_ALIGN_MARGIN_CLASS: Record<PolymorphicLayoutContentContainerAlign, string> = {
  'items-start': 'mr-auto ml-0',
  'items-center': 'mx-auto',
  'items-end': 'ml-auto mr-0',
};
export const CONTENT_ALIGN_MARGIN_CLASS_LG: Record<PolymorphicLayoutContentContainerAlign, string> = {
  'items-start': 'lg:mr-auto lg:ml-0',
  'items-center': 'lg:mx-auto',
  'items-end': 'lg:ml-auto lg:mr-0',
};
export type PolymorphicLayoutContentTextAlign = 'text-left' | 'text-center' | 'text-right';
// Wide (≥ tablet)/Lg (≥ desktop) siblings of PolymorphicLayoutContentTextAlign
// above — same literal-tiered-class shape as PaddingTopClass/-Wide/-Lg
// (./tailwindSpacingScale.ts) and HeaderSegmentJustifyClass/-Wide/-Lg below,
// not a lookup-map key like PolymorphicLayoutContentContainerAlign (a text-align value
// is already the literal class itself, nothing to resolve through a Record).
export type PolymorphicLayoutContentTextAlignWide = 'md:text-left' | 'md:text-center' | 'md:text-right';
export type PolymorphicLayoutContentTextAlignLg = 'lg:text-left' | 'lg:text-center' | 'lg:text-right';
// The header's own segment/inner-content alignment — unlike
// PolymorphicLayoutContentContainerAlign above (a margin-class lookup key for the
// body's own columns), these are the literal justify-content/align-items
// classes applied directly, one independent value per breakpoint tier
// (base/-Wide/-Lg), same 3-tier shape as the padding/margin fields below.
// SiteHeaderConfig's own single-tier headerLeftContentAlign/etc.
// enum fields are not used by a page that turns this system on — see
// headerContentLayoutOwnedByPage's own doc comment
// (SiteHeader.config.ts) for why the shared component's own
// alignment mechanism is turned off entirely in favor of these, computed
// page-side and passed through as plain literal classes.
export type HeaderSegmentJustifyClass = 'justify-start' | 'justify-center' | 'justify-end';
export type HeaderSegmentJustifyWideClass = 'md:justify-start' | 'md:justify-center' | 'md:justify-end';
export type HeaderSegmentJustifyLgClass = 'lg:justify-start' | 'lg:justify-center' | 'lg:justify-end';
export type HeaderSegmentItemsClass = 'items-start' | 'items-center' | 'items-end';
export type HeaderSegmentItemsWideClass = 'md:items-start' | 'md:items-center' | 'md:items-end';
export type HeaderSegmentItemsLgClass = 'lg:items-start' | 'lg:items-center' | 'lg:items-end';
/** 'fixed' (default): the header stays pinned to the viewport top at all
 * times — today's only behavior everywhere else in this codebase (see
 * SplitColumnPageShell's own headerPositionMode doc comment). 'sticky':
 * starts in normal document flow, pins once scrolled to. 'static': normal
 * document flow throughout — scrolls away with the page like any other
 * element, so nothing stays permanently reserved for it once scrolled past. */
export type PolymorphicLayoutHeaderScrollBehavior = 'fixed' | 'sticky' | 'static';

/**
 * The shared, per-page-instantiable layout config for a split-column page
 * — grid ratio/colors (own base fields, declared independently above —
 * see this file's own operational-independence note) plus every
 * per-breakpoint dressing field a page built on top of it (header segment
 * alignment/width, column/band color tiers, content width/align,
 * padding/margin). Structure and resolution logic are shared; each
 * consuming page supplies its own default-value instance (e.g.
 * pages/posts-lab/postLab.config.ts's own DEFAULT_POST_LAB_PAGE_LAYOUT_CONFIG,
 * pages/about.config.ts's own ABOUT_POLYMORPHIC_LAYOUT_CONFIG).
 * No content fields live here (title, excerpt, prose, figures, TOC items,
 * narrative copy, etc.) — those stay page-owned, on each page's own
 * separate content-config files, since a page's content shape is exactly
 * what varies from one consumer of this type to the next.
 */
export type PolymorphicLayoutConfig = {
  /** Which physical side gets the wider (62%) column. See
   * PolymorphicLayoutWideSide's own doc comment. */
  wideColumnSide: PolymorphicLayoutWideSide;
  /** The narrow column's own share of the grid at the `md` breakpoint
   * (768px). See PolymorphicLayoutRatioTier's own doc comment. */
  narrowColumnWidthTierMd: PolymorphicLayoutRatioTier;
  /** Same idea as narrowColumnWidthTierMd, at the `lg` breakpoint (1024px)
   * instead. */
  narrowColumnWidthTierLg: PolymorphicLayoutRatioTier;
  /** See PolymorphicLayoutStackedOrder's own doc comment. */
  stackedColumnOrder: PolymorphicLayoutStackedOrder;
  /** Independent per-column choice between reserving space for the fixed
   * header ('pushDown') and letting it float over this column's own
   * content ('float'). */
  wideColumnHeaderBehavior: PolymorphicLayoutHeaderBehavior;
  narrowColumnHeaderBehavior: PolymorphicLayoutHeaderBehavior;
  /** Opt-in, default false: blurs behind the header, scoped to whichever
   * physical side(s) currently have a column set to 'float' above. */
  legibilityScrimEnabled: boolean;
  /** Opt-in, default false. Only meaningful when the matching
   * *ColumnHeaderBehavior above is 'float' — 'pushDown' already reserves
   * real space, so this would only ever add a redundant second reservation
   * on top of it. On: this column's own outer box gets a live, continuously
   * re-measured `padding-top` floor of "the header's real, current bottom
   * edge + 24px breathing room" (PolymorphicLayout.tsx's own
   * `usePolymorphicLayoutHeaderBottomPx`) — a `max()` against whatever this
   * column's own configured `*ColumnContentPaddingTop` (base/Wide/Lg,
   * whichever tier is active) already produces, so a deliberately larger
   * configured padding is never reduced, only ever topped up to guarantee
   * this column's content can never render underneath the header. Exists
   * because that floor is a genuinely continuous, live-measured quantity
   * (the header's own height varies by breakpoint/content and can change
   * independently of anything this column's own config controls) — no
   * static Tailwind class can express it, the same category of exception
   * `narrowColumnMobileAlignOffsetPx` below already documents. Replaces
   * what used to be hand-tuned, per-viewport-combination hardcoded
   * `padding-top` literals inside individual column-content components
   * (e.g. `AbstractEditorialHero.module.css`'s former 136px/168px rules) —
   * those measured this exact same quantity by hand, once, per viewport,
   * instead of reading it live from here. */
  wideColumnClearsFloatingHeader: boolean;
  /** Overrides wideColumnClearsFloatingHeader from the `md` breakpoint. */
  wideColumnClearsFloatingHeaderWide: boolean;
  /** Overrides wideColumnClearsFloatingHeaderWide from the `lg` breakpoint. */
  wideColumnClearsFloatingHeaderLg: boolean;
  /** Same idea as wideColumnClearsFloatingHeader, narrow column. */
  narrowColumnClearsFloatingHeader: boolean;
  /** Overrides narrowColumnClearsFloatingHeader from the `md` breakpoint. */
  narrowColumnClearsFloatingHeaderWide: boolean;
  /** Overrides narrowColumnClearsFloatingHeaderWide from the `lg` breakpoint. */
  narrowColumnClearsFloatingHeaderLg: boolean;
  /** See PolymorphicLayoutColorSource's own doc comment. Base/mobile tier
   * (<768px) — resolved live against the current breakpoint by
   * PolymorphicLayout.tsx's own `tier()` helper, same as splitBandLeftMode's
   * own base tier. Overridden starting at md by colorSourceWide, and at lg
   * by colorSourceLg — see those fields' own doc comments (below, alongside
   * wideColumnCustomColorWide/-Lg) for why a page can now genuinely run a
   * different color source per breakpoint (e.g. 'none' on mobile, 'custom'
   * from tablet up), not just a different color while stuck on whichever
   * source this base tier picked. */
  colorSource: PolymorphicLayoutColorSource;
  /** Used only when colorSource is 'custom'. */
  wideColumnCustomColor: string;
  /** Used only when colorSource is 'custom'. */
  narrowColumnCustomColor: string;
  /** Used only when colorSource is 'surface' — how much lighter (positive)
   * or darker (negative) than the page surface color each column is,
   * independently. Base/mobile tier — see wideColumnSurfaceOffsetWide/-Lg
   * (below) for the tablet/desktop overrides. */
  wideColumnSurfaceOffset: number;
  narrowColumnSurfaceOffset: number;
  /** Passthrough for whichever header the consuming page renders — wires
   * into SiteHeader's own splitBandActive prop. */
  headerSplitBandEnabled: boolean;
  /** Only meaningful while headerSplitBandEnabled is on. See
   * PolymorphicLayoutBandMode's own doc comment. Base/mobile tier
   * (<768px) — resolved live against the current breakpoint by
   * PolymorphicLayout.tsx's own `tier()` helper, same as every other
   * base/Wide/Lg field in this type, so a page can genuinely run a
   * different mode per breakpoint (e.g. transparent on mobile, a custom
   * color from tablet up) — not just a different custom color value while
   * stuck on one shared mode. See splitBandLeftModeWide/-Lg (this type's
   * own "per-breakpoint siblings" block below, alongside
   * splitBandLeftCustomColorWide/-Lg). */
  splitBandLeftMode: PolymorphicLayoutBandMode;
  /** Used only when splitBandLeftMode is 'custom'. */
  splitBandLeftCustomColor: string;
  splitBandRightMode: PolymorphicLayoutBandMode;
  /** Used only when splitBandRightMode is 'custom'. */
  splitBandRightCustomColor: string;
  /** See PolymorphicLayoutContentContainer's own doc comment. */
  contentContainer: PolymorphicLayoutContentContainer;
  /** The *inner* content container — the wrapper around the wide column's
   * own children that applies wideColumnContentAlignWide/
   * wideColumnContentMinHeight (via CONTENT_ALIGN_MARGIN_CLASS_WIDE) —
   * independent of contentContainer above, which only controls the
   * *outer* body grid (both columns as one unit, bounded vs. full-bleed
   * relative to the viewport). Reuses PolymorphicLayoutContentContainer,
   * the exact same 'bounded' | 'full-bleed' type contentContainer uses —
   * not a new type — since the underlying question is the same ("does
   * this box get a width cap and centering, or fill its container
   * edge-to-edge"), just asked at the per-column level instead of the
   * whole-grid level. 'bounded' (default — posts-lab's value): today's
   * exact wrapping behavior, unchanged. 'full-bleed': components/
   * PolymorphicLayout.tsx renders this column's children directly, no
   * width cap, no alignment margin, no min-height wrapper — /about's own
   * real value, since its content (the AbstractPostDock) was never meant
   * to be width-capped or centered within its own column. */
  wideColumnContentContainer: PolymorphicLayoutContentContainer;
  /** Same idea as wideColumnContentContainer, for the narrow column's own
   * children (gates narrowColumnContentAlignWide/narrowColumnContentWidthWide/
   * narrowColumnTextAlign/narrowColumnContentMinHeight). Independent of
   * wideColumnContentContainer — a page can set the two columns
   * differently, same design precedent as wideColumnHeaderBehavior/
   * narrowColumnHeaderBehavior already being independently configurable
   * per column elsewhere in this same type. */
  narrowColumnContentContainer: PolymorphicLayoutContentContainer;
  /** See PolymorphicLayoutHeaderScrollBehavior's own doc comment. Base/
   * mobile tier (<768px) — resolved live against the current breakpoint by
   * PolymorphicLayout.tsx's own `tier()` helper (the same one every other
   * base/Wide/Lg field in this type already uses), so a value here, at
   * headerScrollBehaviorWide, or at headerScrollBehaviorLg takes effect
   * immediately on browser resize — the resolved value flows straight into
   * SplitColumnPageShell's headerPositionMode prop, which was already
   * fully reactive to whatever it's given (its own measuredHeaderHeightPx
   * uses a live ResizeObserver + resize listener, and every mode-dependent
   * boolean/style downstream is a plain per-render expression) — the only
   * missing piece was this file resolving three tiers into one live value
   * instead of passing a single static one straight through. */
  headerScrollBehavior: PolymorphicLayoutHeaderScrollBehavior;
  /** Same idea as headerScrollBehavior, md and up (≥768px). Shared default
   * mirrors the base tier's own default (see DEFAULT_POLYMORPHIC_LAYOUT_CONFIG),
   * so adding this field alone changes nothing until an operator diverges
   * it — same convention every other Wide-tier field in this type already
   * follows. Every real page config below sets this explicitly to match
   * its own existing headerScrollBehavior value, same reasoning. */
  headerScrollBehaviorWide: PolymorphicLayoutHeaderScrollBehavior;
  /** Same idea as headerScrollBehavior, lg and up (≥1024px). */
  headerScrollBehaviorLg: PolymorphicLayoutHeaderScrollBehavior;
  // ── Column content container: alignment, width, and vertical position ──
  // The primitive that positions a column's own children *within* that
  // column, independent of *ColumnContentContainer above (which only gates
  // whether this wrapper renders at all — 'full-bleed' skips it entirely,
  // rendering children directly with none of the fields below in effect —
  // "the option not to use it"). Every field here is tiered base/Wide/Lg,
  // same 3-tier shape as the header segment fields above and the padding/
  // margin fields below — real per-device-size control, not a single value
  // that only ever applies from md up. wideColumn and narrowColumn each get
  // the complete, independent field set (PLAN-POLYMORPHIC-LAYOUT-CONTENT-CONTAINER-PRIMITIVE.md)
  // — previously the wide column had no content-width field at all, and
  // vertical alignment was declared but never actually wired into either
  // column's own render output.
  //
  // Horizontal position of the content container within its own column — a
  // literal margin class (mr-auto/mx-auto/ml-auto, via
  // CONTENT_ALIGN_MARGIN_CLASS/-_WIDE/-_LG at the render call site), not
  // `items-*`/align-items on a flex container. Complementary to, not a
  // substitute for, *ColumnTextAlign below — this moves the box itself;
  // *ColumnTextAlign aligns the text within that box. Below md, in stacked
  // mode, the base tier still applies (the column is full-width, but the
  // *content* box within it can still be narrower and aligned) — this is
  // genuinely different from the pre-tiered field, which had no effect at
  // all below md.
  narrowColumnContentAlign: PolymorphicLayoutContentContainerAlign;
  narrowColumnContentAlignWide: PolymorphicLayoutContentContainerAlign;
  narrowColumnContentAlignLg: PolymorphicLayoutContentContainerAlign;
  wideColumnContentAlign: PolymorphicLayoutContentContainerAlign;
  wideColumnContentAlignWide: PolymorphicLayoutContentContainerAlign;
  wideColumnContentAlignLg: PolymorphicLayoutContentContainerAlign;
  /** Width of the content container within its own column — a literal
   * percentage-of-column class from CONTENT_WIDTH_PERCENT_OPTIONS/
   * -_WIDE_OPTIONS/-_LG_OPTIONS (./tailwindWidthScale.ts), 'auto' for
   * shrink-to-fit. A page with its own additional prose-measure concern
   * (e.g. posts-lab's own articleConfig.contentMaxWidth, a numeric px
   * reading-width tuning) composes this with that page-owned field rather
   * than this one replacing it — this field answers "how much of the
   * column" a generic content box occupies, not "what's the ideal reading
   * measure in ch/px," a genuinely different, page-specific question.
   *
   * A CSS constraint, not a wiring one: any percentage width here (any
   * value but 'auto') silently falls back to shrink-to-fit if the column's
   * own children establish a CSS Container Query context anywhere in their
   * subtree (`container-type: inline-size`, e.g. for a `cqw`-based
   * responsive font-size — about.tsx's own directly-composed
   * `<NarrowColumnContent containerQuery>` and AbstractPostDock's own
   * styles.module.css both do this). This is the
   * Container Queries spec's own cycle-avoidance rule (a percentage
   * dependent on an ancestor of a query container must resolve to auto to
   * avoid an unresolvable loop), confirmed directly: a hardcoded pixel
   * width resolves correctly on the exact same element a percentage width
   * doesn't. *ColumnContentAlign (margin-based, and therefore dependent on
   * this box having real width slack to move within) is affected the same
   * way. *ColumnContentVerticalAlign/*ColumnTextAlign are not — neither
   * depends on width-percentage resolution. */
  narrowColumnContentWidth: ContentWidthPercentClass | 'auto';
  narrowColumnContentWidthWide: ContentWidthPercentWideClass | 'auto';
  narrowColumnContentWidthLg: ContentWidthPercentLgClass | 'auto';
  wideColumnContentWidth: ContentWidthPercentClass | 'auto';
  /** Same percentage-step union as narrowColumnContentWidthWide, plus one
   * extra sentinel these two wide-column fields alone get:
   * 'match-narrow-column' resolves (in wideColumnContentBoxProps,
   * PolymorphicLayout.tsx) to a literal calc() class — via
   * WIDE_COLUMN_CONTENT_MATCH_NARROW_CLASS_WIDE below, keyed off this same
   * config's own narrowColumnWidthTierMd — that caps the wide column's
   * content to exactly the narrow column's own absolute width, whatever
   * ratio narrowColumnWidthTierMd is actually set to. Exists because a wide
   * (>50%) column's content sized for visual symmetry with the narrow
   * column has no fixed percentage answer — it's mechanically derived from
   * whatever split ratio is configured, not a design-scale pick, so it
   * can't be one of the plain percentage options above. Replaces
   * pages/abstract.tsx's former wideColumnContentWidthOverride prop, which
   * hardcoded this same derivation as a page-level literal
   * (`md:max-w-[calc(100%_*_38/62)]`) — correct only by coincidence, and
   * silently wrong the moment narrowColumnWidthTierMd changed to anything
   * else, since nothing recomputed it. This field lived, unread, right next
   * to that override the whole time (defaulted to 'auto', overridden into
   * irrelevance) — the disconnect this fixes. */
  wideColumnContentWidthWide: ContentWidthPercentWideClass | 'auto' | 'match-narrow-column';
  /** Lg-tier sibling of wideColumnContentWidthWide above — resolves via
   * WIDE_COLUMN_CONTENT_MATCH_NARROW_CLASS_LG, keyed off narrowColumnWidthTierLg
   * (not narrowColumnWidthTierMd) — the two breakpoints can be configured to
   * genuinely different split ratios, so each resolves against its own tier
   * rather than both reusing whichever one a page happened to hardcode. */
  wideColumnContentWidthLg: ContentWidthPercentLgClass | 'auto' | 'match-narrow-column';
  /** Text alignment of the content itself — a literal text-align class
   * applied directly to the same wrapper *ColumnContentAlign's margin class
   * lands on. */
  narrowColumnTextAlign: PolymorphicLayoutContentTextAlign;
  narrowColumnTextAlignWide: PolymorphicLayoutContentTextAlignWide;
  narrowColumnTextAlignLg: PolymorphicLayoutContentTextAlignLg;
  wideColumnTextAlign: PolymorphicLayoutContentTextAlign;
  wideColumnTextAlignWide: PolymorphicLayoutContentTextAlignWide;
  wideColumnTextAlignLg: PolymorphicLayoutContentTextAlignLg;
  /** Vertical position of the content container within the column's own
   * box. Applied as `justify-content` on the *outer* flex flex-col wrapper
   * (never `align-items` — align-items is that same container's *cross*
   * axis (horizontal), and a value there would collide with/disable the
   * mr-auto/mx-auto/ml-auto horizontal-alignment mechanism above: a flex
   * item with a cross-axis auto margin is disqualified from
   * align-items:stretch and can collapse). *ColumnContentMinHeight below
   * gives this real slack to distribute when the content itself is short —
   * with no min-height, the flex container is exactly as tall as its own
   * content and this has nothing to work with. */
  narrowColumnContentVerticalAlign: HeaderSegmentJustifyClass;
  narrowColumnContentVerticalAlignWide: HeaderSegmentJustifyWideClass;
  narrowColumnContentVerticalAlignLg: HeaderSegmentJustifyLgClass;
  wideColumnContentVerticalAlign: HeaderSegmentJustifyClass;
  wideColumnContentVerticalAlignWide: HeaderSegmentJustifyWideClass;
  wideColumnContentVerticalAlignLg: HeaderSegmentJustifyLgClass;
  /** Minimum height the content container is guaranteed — a literal class
   * from CONTENT_MIN_HEIGHT_OPTIONS (./tailwindMinHeightScale.ts). A single,
   * untiered value (unlike the alignment fields above): it exists purely to
   * give *ColumnContentVerticalAlign real slack, not to express a
   * standalone per-device design decision, so one value across every
   * breakpoint is sufficient — the same scope this field always had. */
  narrowColumnContentMinHeight: ContentMinHeightClass;
  wideColumnContentMinHeight: ContentMinHeightClass;
  /** Fine-tune offset (px, signed) added on top of a live-measured base
   * alignment against the header nav's real left edge below the md
   * breakpoint. Deliberately NOT a Tailwind padding class: below md the
   * nav's own left edge is a continuous function of live viewport width,
   * not a fixed offset — no static spacing step can reproduce it. This
   * field exists only to nudge the correct, automatically-computed base
   * value — e.g. for optical adjustment — not to replace the measurement.
   * At/above md, this field has no effect. */
  narrowColumnMobileAlignOffsetPx: number;
  /** Left padding on the narrow column's own outer box. The separate
   * narrowColumnMobileAlignOffsetPx is a live-measured optical nudge that
   * layers on top at mobile; it is not a replacement for this structural
   * inset. */
  narrowColumnContentPaddingLeft: PaddingLeftClass;
  narrowColumnContentPaddingLeftWide: PaddingLeftWideClass;
  narrowColumnContentPaddingLeftLg: PaddingLeftLgClass;
  /** Right padding on the narrow column's own outer box, once the
   * split-column layout is active (md and up). */
  narrowColumnContentPaddingRightWide: PaddingRightWideClass;
  narrowColumnContentPaddingRightLg: PaddingRightLgClass;
  /** Right padding on the narrow column's own outer box below md. No
   * effect at/above md — see narrowColumnContentPaddingRightWide above for
   * that breakpoint. */
  narrowColumnContentPaddingRight: PaddingRightClass;
  /** Top padding on the narrow column's own outer box (mobile) — same outer
   * box narrowColumnContentPaddingBottom below applies to, both read by
   * components/PolymorphicLayout.tsx's own buildNarrowColumnClassName (a
   * single flat box — unlike posts-lab/[slug].tsx's own separate,
   * two-element sticky-wrapper render path for this same field, which
   * groups Top/Right/Left on its own inner sticky element instead). */
  narrowColumnContentPaddingTop: PaddingTopClass;
  /** Same as narrowColumnContentPaddingTop, md and up. */
  narrowColumnContentPaddingTopWide: PaddingTopWideClass;
  narrowColumnContentPaddingTopLg: PaddingTopLgClass;
  /** Bottom padding on the narrow column's own outer box — applies at every
   * breakpoint unless overridden by the Wide/Lg siblings below. */
  narrowColumnContentPaddingBottom: PaddingBottomClass;
  /** Same idea as narrowColumnContentPaddingBottom, md and up. */
  narrowColumnContentPaddingBottomWide: PaddingBottomWideClass;
  narrowColumnContentPaddingBottomLg: PaddingBottomLgClass;
  /** Margin on the narrow column's outer grid cell. These are deliberately
   * separate from *ColumnContentAlign: that alignment's auto margins land
   * on the nested ColumnContentBox, so all four outer edges remain safe and
   * independently configurable. */
  narrowColumnContentMarginTop: MarginTopClass;
  /** Same as narrowColumnContentMarginTop, md and up. */
  narrowColumnContentMarginTopWide: MarginTopWideClass;
  narrowColumnContentMarginTopLg: MarginTopLgClass;
  narrowColumnContentMarginRight: MarginRightClass;
  narrowColumnContentMarginRightWide: MarginRightWideClass;
  narrowColumnContentMarginRightLg: MarginRightLgClass;
  /** Same as narrowColumnContentMarginTop, bottom edge. */
  narrowColumnContentMarginBottom: MarginBottomClass;
  /** Same as narrowColumnContentMarginBottom, md and up. */
  narrowColumnContentMarginBottomWide: MarginBottomWideClass;
  narrowColumnContentMarginBottomLg: MarginBottomLgClass;
  narrowColumnContentMarginLeft: MarginLeftClass;
  narrowColumnContentMarginLeftWide: MarginLeftWideClass;
  narrowColumnContentMarginLeftLg: MarginLeftLgClass;
  /** Left padding on the wide column's own outer box below md. */
  wideColumnContentPaddingLeft: PaddingLeftClass;
  /** Right padding on the wide column's own outer box below md. */
  wideColumnContentPaddingRight: PaddingRightClass;
  /** Left padding on the wide column's own outer box, once the split-column
   * layout is active (md and up). */
  wideColumnContentPaddingLeftWide: PaddingLeftWideClass;
  wideColumnContentPaddingLeftLg: PaddingLeftLgClass;
  /** Right padding on the wide column's own outer box, once the
   * split-column layout is active (md and up). */
  wideColumnContentPaddingRightWide: PaddingRightWideClass;
  wideColumnContentPaddingRightLg: PaddingRightLgClass;
  /** Top padding on the wide column's own outer box (mobile). */
  wideColumnContentPaddingTop: PaddingTopClass;
  /** Same as wideColumnContentPaddingTop, md and up. */
  wideColumnContentPaddingTopWide: PaddingTopWideClass;
  wideColumnContentPaddingTopLg: PaddingTopLgClass;
  /** Bottom padding on the wide column's own outer box — applies at every
   * breakpoint unless overridden by the Wide/Lg siblings below. */
  wideColumnContentPaddingBottom: PaddingBottomClass;
  /** Same idea as wideColumnContentPaddingBottom, md and up. */
  wideColumnContentPaddingBottomWide: PaddingBottomWideClass;
  wideColumnContentPaddingBottomLg: PaddingBottomLgClass;
  /** Same idea as narrowColumnContentMarginTop, applied to the wide
   * column's own outer box instead — its own single box, no sticky-wrapper
   * split to worry about. */
  wideColumnContentMarginTop: MarginTopClass;
  /** Same as wideColumnContentMarginTop, md and up. */
  wideColumnContentMarginTopWide: MarginTopWideClass;
  wideColumnContentMarginTopLg: MarginTopLgClass;
  wideColumnContentMarginRight: MarginRightClass;
  wideColumnContentMarginRightWide: MarginRightWideClass;
  wideColumnContentMarginRightLg: MarginRightLgClass;
  /** Same as wideColumnContentMarginTop, bottom edge. */
  wideColumnContentMarginBottom: MarginBottomClass;
  /** Same as wideColumnContentMarginBottom, md and up. */
  wideColumnContentMarginBottomWide: MarginBottomWideClass;
  wideColumnContentMarginBottomLg: MarginBottomLgClass;
  wideColumnContentMarginLeft: MarginLeftClass;
  wideColumnContentMarginLeftWide: MarginLeftWideClass;
  wideColumnContentMarginLeftLg: MarginLeftLgClass;
  /** Where the header's own left-segment content sits within the header's
   * own left split segment (the segment LayoutDebugOverlay's 'HEADER ·
   * LEFT' box visualizes) — layered onto the shared siteHeaderConfig at a
   * consuming page's own SplitColumnPageShell call site via
   * headerLeftSegmentClassName, with headerContentLayoutOwnedByPage turned
   * on so the shared component's own single-tier alignment fields never
   * fight these (see that flag's own doc comment,
   * SiteHeader.config.ts). Real per-breakpoint tiers, same 3-tier
   * shape as the padding/margin fields below. */
  headerLeftSegmentAlign: HeaderSegmentJustifyClass;
  headerLeftSegmentAlignWide: HeaderSegmentJustifyWideClass;
  headerLeftSegmentAlignLg: HeaderSegmentJustifyLgClass;
  /** Same as headerLeftSegmentAlign, vertical axis (`align-items`). */
  headerLeftSegmentVerticalAlign: HeaderSegmentItemsClass;
  headerLeftSegmentVerticalAlignWide: HeaderSegmentItemsWideClass;
  headerLeftSegmentVerticalAlignLg: HeaderSegmentItemsLgClass;
  /** Width of the header's own left-segment content container as a
   * percentage of the header's own left split segment, or 'auto' for
   * shrink-to-fit behavior — see SiteHeaderContentWidth's own doc
   * comment for why 'auto' exists (the header's content containers are
   * flex items, not blocks, so a percentage cap alone would be inert).
   * base/-Lg reuse ./tailwindWidthScale.ts's own CONTENT_WIDTH_PERCENT_OPTIONS/
   * -LG_OPTIONS — a percentage cap that historically only ever applied
   * from md upward for a column-relative consumer is genuinely usable at
   * every tier here, since the header's own row is always full-width
   * regardless of breakpoint. Only visibly changes anything once paired
   * with a non-default align above. */
  headerLeftContentWidth: ContentWidthPercentClass | 'auto';
  headerLeftContentWidthWide: SiteHeaderContentWidth;
  headerLeftContentWidthLg: ContentWidthPercentLgClass | 'auto';
  /** Where the header's own right-segment content sits within the header's
   * own right split segment (the segment LayoutDebugOverlay's 'HEADER ·
   * RIGHT' box visualizes). */
  headerRightSegmentAlign: HeaderSegmentJustifyClass;
  headerRightSegmentAlignWide: HeaderSegmentJustifyWideClass;
  headerRightSegmentAlignLg: HeaderSegmentJustifyLgClass;
  /** Same as headerRightSegmentAlign, vertical axis. */
  headerRightSegmentVerticalAlign: HeaderSegmentItemsClass;
  headerRightSegmentVerticalAlignWide: HeaderSegmentItemsWideClass;
  headerRightSegmentVerticalAlignLg: HeaderSegmentItemsLgClass;
  /** Same as headerLeftContentWidth/-Wide/-Lg, applied to the right-segment
   * content container instead. */
  headerRightContentWidth: ContentWidthPercentClass | 'auto';
  headerRightContentWidthWide: SiteHeaderContentWidth;
  headerRightContentWidthLg: ContentWidthPercentLgClass | 'auto';
  /** Where the header's own left-segment content sits *within* its own
   * content box (the same box headerLeftContentWidth/-Wide/-Lg sizes and
   * LayoutDebugOverlay's 'HEADER · LEFT CONTENT' visualizes) — distinct
   * from headerLeftSegmentAlign above, which positions that whole box
   * within the left segment one level up. This is what "text alignment"
   * means for a header whose left segment holds non-prose content (e.g. a
   * logo) — there's no literal CSS text-align involved. Only visibly does
   * anything once the box is wider than its own content
   * (headerLeftContentWidth/-Wide/-Lg non-'auto'). */
  headerLeftInnerAlign: HeaderSegmentJustifyClass;
  headerLeftInnerAlignWide: HeaderSegmentJustifyWideClass;
  headerLeftInnerAlignLg: HeaderSegmentJustifyLgClass;
  /** Same as headerLeftInnerAlign/-Wide/-Lg, applied to the header's own
   * right-segment content box ('HEADER · RIGHT CONTENT') instead. */
  headerRightInnerAlign: HeaderSegmentJustifyClass;
  headerRightInnerAlignWide: HeaderSegmentJustifyWideClass;
  headerRightInnerAlignLg: HeaderSegmentJustifyLgClass;
  /** Padding/margin on the header's own left-segment content box (the
   * 'HEADER · LEFT CONTENT' box LayoutDebugOverlay visualizes). Threaded
   * onto SiteHeaderConfig's own headerLeftContentClassName
   * passthrough prop (a plain joined string, not 16 duplicate fields on
   * that shared, cross-page config — see that field's own doc comment in
   * SiteHeader.config.ts) at a consuming page's own
   * effectiveSiteHeaderConfig call site. */
  headerLeftContentPaddingTop: PaddingTopClass;
  headerLeftContentPaddingTopWide: PaddingTopWideClass;
  headerLeftContentPaddingTopLg: PaddingTopLgClass;
  headerLeftContentPaddingRight: PaddingRightClass;
  headerLeftContentPaddingRightWide: PaddingRightWideClass;
  headerLeftContentPaddingRightLg: PaddingRightLgClass;
  headerLeftContentPaddingBottom: PaddingBottomClass;
  headerLeftContentPaddingBottomWide: PaddingBottomWideClass;
  headerLeftContentPaddingBottomLg: PaddingBottomLgClass;
  headerLeftContentPaddingLeft: PaddingLeftClass;
  headerLeftContentPaddingLeftWide: PaddingLeftWideClass;
  headerLeftContentPaddingLeftLg: PaddingLeftLgClass;
  headerLeftContentMarginTop: MarginTopClass;
  headerLeftContentMarginTopWide: MarginTopWideClass;
  headerLeftContentMarginTopLg: MarginTopLgClass;
  headerLeftContentMarginRight: MarginRightClass;
  headerLeftContentMarginRightWide: MarginRightWideClass;
  headerLeftContentMarginRightLg: MarginRightLgClass;
  headerLeftContentMarginBottom: MarginBottomClass;
  headerLeftContentMarginBottomWide: MarginBottomWideClass;
  headerLeftContentMarginBottomLg: MarginBottomLgClass;
  headerLeftContentMarginLeft: MarginLeftClass;
  headerLeftContentMarginLeftWide: MarginLeftWideClass;
  headerLeftContentMarginLeftLg: MarginLeftLgClass;
  /** Same as the 16 headerLeftContent* padding/margin fields above, applied
   * to the header's own right-segment content box ('HEADER · RIGHT
   * CONTENT') and its own headerRightContentClassName passthrough instead. */
  headerRightContentPaddingTop: PaddingTopClass;
  headerRightContentPaddingTopWide: PaddingTopWideClass;
  headerRightContentPaddingTopLg: PaddingTopLgClass;
  headerRightContentPaddingRight: PaddingRightClass;
  headerRightContentPaddingRightWide: PaddingRightWideClass;
  headerRightContentPaddingRightLg: PaddingRightLgClass;
  headerRightContentPaddingBottom: PaddingBottomClass;
  headerRightContentPaddingBottomWide: PaddingBottomWideClass;
  headerRightContentPaddingBottomLg: PaddingBottomLgClass;
  headerRightContentPaddingLeft: PaddingLeftClass;
  headerRightContentPaddingLeftWide: PaddingLeftWideClass;
  headerRightContentPaddingLeftLg: PaddingLeftLgClass;
  headerRightContentMarginTop: MarginTopClass;
  headerRightContentMarginTopWide: MarginTopWideClass;
  headerRightContentMarginTopLg: MarginTopLgClass;
  headerRightContentMarginRight: MarginRightClass;
  headerRightContentMarginRightWide: MarginRightWideClass;
  headerRightContentMarginRightLg: MarginRightLgClass;
  headerRightContentMarginBottom: MarginBottomClass;
  headerRightContentMarginBottomWide: MarginBottomWideClass;
  headerRightContentMarginBottomLg: MarginBottomLgClass;
  headerRightContentMarginLeft: MarginLeftClass;
  headerRightContentMarginLeftWide: MarginLeftWideClass;
  headerRightContentMarginLeftLg: MarginLeftLgClass;
  /** Horizontal inset of the outer wrapper around the *entire* body grid
   * (both columns together — components/SplitColumnPageShell.tsx's own
   * PageContainer around SplitColumnLayout, via its bodyGutterClassName
   * prop), not a per-column padding like wideColumnContentPaddingLeft/
   * narrowColumnContentPaddingRight above. A page's own, independent value
   * — SplitColumnPageShell never reads the shared header's own paddingX/
   * desktopPaddingX for this wrapper once bodyGutterClassName is supplied.
   * No margin equivalent exists for this wrapper — it's centered via a
   * structural `mx-auto`, and has no vertical role of its own. */
  bodyGutterPaddingLeft: PaddingLeftClass;
  bodyGutterPaddingLeftWide: PaddingLeftWideClass;
  bodyGutterPaddingLeftLg: PaddingLeftLgClass;
  bodyGutterPaddingRight: PaddingRightClass;
  bodyGutterPaddingRightWide: PaddingRightWideClass;
  bodyGutterPaddingRightLg: PaddingRightLgClass;
  /** Overrides colorSource above starting at md (≥ tablet) — same "one
   * segment, one independent picker per breakpoint" shape splitBandLeftModeWide
   * already has. Shared default mirrors the base tier's own default, so
   * adding this field alone changes nothing until a page diverges it.
   * Previously the *only* tiered piece here was the custom color value
   * below (wideColumnCustomColorWide/-Lg) while the source itself stayed
   * locked to the base tier's own choice — meaning every breakpoint was
   * forced to share one source, and only the color used *within* 'custom'
   * (or the offset within 'surface') could vary. This field is what
   * actually lets a page run a different source per breakpoint (e.g. 'none'
   * on mobile, 'custom' from tablet up), not just a different color while
   * stuck on one source everywhere. */
  colorSourceWide: PolymorphicLayoutColorSource;
  /** Overrides colorSourceWide above starting at lg (≥ desktop). */
  colorSourceLg: PolymorphicLayoutColorSource;
  /** Per-breakpoint siblings of the folded-in SplitColumnLayoutConfig's own
   * wideColumnCustomColor/narrowColumnCustomColor/splitBandLeftCustomColor/
   * splitBandRightCustomColor. Used only when this tier's own color source
   * (colorSourceWide/-Lg, not the base colorSource) is 'custom' — same
   * per-tier gating colorSourceWide/-Lg above exists for. The base,
   * unprefixed field is the mobile/base tier; these are the ≥ tablet (md)
   * and ≥ desktop (lg) tiers, resolved down to one effective value per live
   * viewport width at a consuming page's own render call site, then handed
   * to SplitColumnLayout/SiteHeader through the exact same
   * single-color props those shared components already take — neither of
   * them, nor SplitColumnLayoutConfig itself, needs to know a page resolves
   * colors per breakpoint. */
  wideColumnCustomColorWide: string;
  wideColumnCustomColorLg: string;
  narrowColumnCustomColorWide: string;
  narrowColumnCustomColorLg: string;
  /** Per-breakpoint siblings of wideColumnSurfaceOffset/narrowColumnSurfaceOffset
   * above — used only when this tier's own color source (colorSourceWide/-Lg)
   * is 'surface'. Same tiering shape as wideColumnCustomColorWide/-Lg. */
  wideColumnSurfaceOffsetWide: number;
  wideColumnSurfaceOffsetLg: number;
  narrowColumnSurfaceOffsetWide: number;
  narrowColumnSurfaceOffsetLg: number;
  /** Overrides splitBandLeftMode above starting at md (≥ tablet) — same
   * "one segment, one independent picker per breakpoint" shape every other
   * tiered field in this type already has. Shared default mirrors the base
   * tier's own default ('syncWithColumnBelow'), so adding this field alone
   * changes nothing until a page diverges it. Previously the *only* tiered
   * piece here was the custom color value below (splitBandLeftCustomColorWide/
   * -Lg) while the mode itself stayed locked to the base tier's own
   * choice — meaning every breakpoint was forced to share one mode, and
   * only the color used *within* 'custom' mode could vary. This field is
   * what actually lets a page run a different mode per breakpoint (e.g.
   * transparent on mobile, a custom color from tablet up), not just a
   * different color while stuck on one mode everywhere. */
  splitBandLeftModeWide: PolymorphicLayoutBandMode;
  /** Overrides splitBandLeftModeWide above starting at lg (≥ desktop). */
  splitBandLeftModeLg: PolymorphicLayoutBandMode;
  /** Used only when headerSplitBandEnabled is on and splitBandLeftModeWide
   * is 'custom' (not splitBandLeftMode — this is the tablet tier's own
   * color, gated by the tablet tier's own mode). */
  splitBandLeftCustomColorWide: string;
  /** Used only when headerSplitBandEnabled is on and splitBandLeftModeLg is
   * 'custom'. */
  splitBandLeftCustomColorLg: string;
  /** Same idea as splitBandLeftModeWide/-Lg, right segment. */
  splitBandRightModeWide: PolymorphicLayoutBandMode;
  splitBandRightModeLg: PolymorphicLayoutBandMode;
  /** Used only when headerSplitBandEnabled is on and splitBandRightModeWide
   * is 'custom'. */
  splitBandRightCustomColorWide: string;
  /** Used only when headerSplitBandEnabled is on and splitBandRightModeLg
   * is 'custom'. */
  splitBandRightCustomColorLg: string;
  /** The header's own left/right segment split ratio, per breakpoint tier —
   * same PolymorphicLayoutRatioTier vocabulary as narrowColumnWidthTierMd/Lg
   * above (Stacked/30-70/.../50-50), but independent of them: unlike the
   * real body columns, this can meaningfully take a real split ratio even
   * below md, where the body itself structurally cannot.
   *
   * Drives two things: the decorative split-band color layer (only while
   * headerSplitBandEnabled is on — the field's original purpose), and — as
   * of SiteHeader's own resolvedNavBoundaryPx — the actual logo/nav
   * content grid too, whenever the header has no live-measured body-column
   * boundary to align against (narrowColumnWidthTierMd/Lg both 'stacked',
   * e.g. a single-column PolymorphicLayout page like /contact). This is
   * what gives a single-column page a real, config-driven header split
   * ratio instead of a silently unconfigurable hardcoded 38/62 constant —
   * the same panel control every PolymorphicLayout page already has.
   *
   * 'stacked' at the base/mobile and Wide/tablet tiers (a page's own
   * default): no split — the band colors above aren't rendered side by
   * side, and (absent a live body-column measurement) the header content
   * grid falls through to the hardcoded 38/62 constant, matching this
   * codebase's original, pre-primitive behavior exactly. */
  splitBandWidthTier: PolymorphicLayoutRatioTier;
  /** Same as splitBandWidthTier, ≥ tablet (md). */
  splitBandWidthTierWide: PolymorphicLayoutRatioTier;
  /** Same as splitBandWidthTier, ≥ desktop (lg). */
  splitBandWidthTierLg: PolymorphicLayoutRatioTier;
};

// Posts-lab is this type's first consumer — its own current values are
// used as this shared file's own default object directly (posts-lab's own
// postLab.config.ts re-exports this verbatim as
// DEFAULT_POST_LAB_PAGE_LAYOUT_CONFIG). When a second page adopts this
// type, its own default-value instance lives on that page's own config
// file (see pages/about.config.ts's own ABOUT_POLYMORPHIC_LAYOUT_CONFIG).
// The base fields below are copied *by value* from
// components/SplitColumnLayout.config.ts's own POSTS_LAB_SPLIT_COLUMN_LAYOUT_CONFIG
// (not imported/spread — see this file's own independence note above) —
// this is a one-time snapshot of posts-lab's real current settings, not a
// live link; a future change to that file's own config has no effect
// here, matching the operational-independence requirement.
// The header's own left/right segment alignment, content width, and inner-
// align fields — the primitive that governs *where the logo/nav sit within
// their header segments*, as opposed to per-page tuning like padding/margin/
// color, which genuinely differs page to page and stays in each page's own
// config. These 24 fields have no legitimate reason to diverge between
// PolymorphicLayout consumers — /contact's own header briefly drifted from
// /about's and posts-lab's (a content-width cap and inner-align mismatch,
// found via a cross-page layout debug overlay comparison) precisely because
// they were three independently-typed literal blocks with nothing enforcing
// agreement. Every page's own PolymorphicLayoutConfig spreads this constant
// in directly (`...POLYMORPHIC_LAYOUT_HEADER_SEGMENT_DEFAULTS`) rather than
// retyping these values — one real source, not three that can silently
// drift from each other. A page with a genuine reason to diverge overrides
// individual keys after the spread, same as any other object spread; this
// is not the "shared default merged with page state" shape
// PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md warns against (that pattern's failure
// mode was a *live, mutable* shared value silently drifting under a page's
// own tuning — this is a `satisfies`-checked literal constant every page
// copies once, structurally identical to About/posts-lab already agreeing
// on these exact values by convention before this constant existed).
export const POLYMORPHIC_LAYOUT_HEADER_SEGMENT_DEFAULTS = {
  headerLeftSegmentAlign: 'justify-center',
  headerLeftSegmentAlignWide: 'md:justify-end',
  headerLeftSegmentAlignLg: 'lg:justify-end',
  headerLeftSegmentVerticalAlign: 'items-center',
  headerLeftSegmentVerticalAlignWide: 'md:items-center',
  headerLeftSegmentVerticalAlignLg: 'lg:items-center',
  headerLeftContentWidth: 'max-w-[90%]',
  headerLeftContentWidthWide: 'md:max-w-[100%]',
  headerLeftContentWidthLg: 'lg:max-w-[100%]',
  headerRightSegmentAlign: 'justify-center',
  headerRightSegmentAlignWide: 'md:justify-start',
  headerRightSegmentAlignLg: 'lg:justify-start',
  headerRightSegmentVerticalAlign: 'items-center',
  headerRightSegmentVerticalAlignWide: 'md:items-center',
  headerRightSegmentVerticalAlignLg: 'lg:items-center',
  headerRightContentWidth: 'max-w-[80%]',
  headerRightContentWidthWide: 'auto',
  headerRightContentWidthLg: 'auto',
  headerLeftInnerAlign: 'justify-center',
  headerLeftInnerAlignWide: 'md:justify-end',
  headerLeftInnerAlignLg: 'lg:justify-end',
  headerRightInnerAlign: 'justify-center',
  headerRightInnerAlignWide: 'md:justify-start',
  headerRightInnerAlignLg: 'lg:justify-start',
} satisfies Pick<PolymorphicLayoutConfig,
  | 'headerLeftSegmentAlign' | 'headerLeftSegmentAlignWide' | 'headerLeftSegmentAlignLg'
  | 'headerLeftSegmentVerticalAlign' | 'headerLeftSegmentVerticalAlignWide' | 'headerLeftSegmentVerticalAlignLg'
  | 'headerLeftContentWidth' | 'headerLeftContentWidthWide' | 'headerLeftContentWidthLg'
  | 'headerRightSegmentAlign' | 'headerRightSegmentAlignWide' | 'headerRightSegmentAlignLg'
  | 'headerRightSegmentVerticalAlign' | 'headerRightSegmentVerticalAlignWide' | 'headerRightSegmentVerticalAlignLg'
  | 'headerRightContentWidth' | 'headerRightContentWidthWide' | 'headerRightContentWidthLg'
  | 'headerLeftInnerAlign' | 'headerLeftInnerAlignWide' | 'headerLeftInnerAlignLg'
  | 'headerRightInnerAlign' | 'headerRightInnerAlignWide' | 'headerRightInnerAlignLg'>;

export const DEFAULT_POLYMORPHIC_LAYOUT_CONFIG = {
  wideColumnSide: 'right',
  narrowColumnWidthTierMd: '38/62',
  narrowColumnWidthTierLg: '38/62',
  stackedColumnOrder: 'narrowFirst',
  wideColumnHeaderBehavior: 'pushDown',
  narrowColumnHeaderBehavior: 'pushDown',
  legibilityScrimEnabled: true,
  wideColumnClearsFloatingHeader: false,
  wideColumnClearsFloatingHeaderWide: false,
  wideColumnClearsFloatingHeaderLg: false,
  narrowColumnClearsFloatingHeader: false,
  narrowColumnClearsFloatingHeaderWide: false,
  narrowColumnClearsFloatingHeaderLg: false,
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
  // Matches pages/posts-lab/[slug].tsx's own current hardcoded
  // contentContainer="bounded" literal exactly — zero visual change.
  contentContainer: 'bounded',
  // 'full-bleed' — NOT 'bounded' — on both, deliberately: this page's own
  // wide-column content wrapper always combined its width cap
  // (articleConfig.contentMaxWidth, a page-owned reading-width field with
  // no PolymorphicLayoutConfig equivalent) with wideColumnContentAlignWide's
  // margin-auto class on the *same* div; the shared 'bounded' wrapper here
  // has no such width field for the wide column; wrapping it separately
  // would put the alignment margin on an unconstrained outer box, making it
  // a silent no-op. Same reasoning, different mechanism, for the narrow
  // column: its sticky TOC wrapper (position: sticky, the live-measured
  // top offset, and this page's own padding fields) must stay the *outer*
  // box relative to the width-capped/centered box — nesting it the other
  // way (shared wrapper outside, sticky div inside) changes where the
  // padding math lands relative to the centering math, a measurable pixel
  // shift, not a cosmetic one. 'full-bleed' keeps both columns' own inner
  // wrapper divs exactly page-owned, matching current behavior exactly —
  // zero visual change, verified by the reasoning above rather than by
  // trying to force this page's real DOM into the generic shared shape.
  wideColumnContentContainer: 'full-bleed',
  narrowColumnContentContainer: 'full-bleed',
  headerScrollBehavior: 'static',
  headerScrollBehaviorWide: 'static',
  headerScrollBehaviorLg: 'static',
  narrowColumnContentAlign: 'items-end',
  narrowColumnContentAlignWide: 'items-end',
  narrowColumnContentAlignLg: 'items-end',
  wideColumnContentAlign: 'items-start',
  wideColumnContentAlignWide: 'items-start',
  wideColumnContentAlignLg: 'items-start',
  narrowColumnContentWidth: 'auto',
  narrowColumnContentWidthWide: 'md:max-w-[100%]',
  narrowColumnContentWidthLg: 'lg:max-w-[100%]',
  // Unconstrained by default (both new fields) — the wide column's own
  // reading-width tuning stays each page's own separate, page-owned concern
  // (e.g. posts-lab's own articleConfig.contentMaxWidth, a numeric px value
  // this generic percentage-of-column field was never meant to replace —
  // see wideColumnContentWidth's own doc comment).
  wideColumnContentWidth: 'auto',
  wideColumnContentWidthWide: 'auto',
  wideColumnContentWidthLg: 'auto',
  narrowColumnTextAlign: 'text-left',
  narrowColumnTextAlignWide: 'md:text-left',
  narrowColumnTextAlignLg: 'lg:text-left',
  wideColumnTextAlign: 'text-left',
  wideColumnTextAlignWide: 'md:text-left',
  wideColumnTextAlignLg: 'lg:text-left',
  narrowColumnContentVerticalAlign: 'justify-start',
  narrowColumnContentVerticalAlignWide: 'md:justify-start',
  narrowColumnContentVerticalAlignLg: 'lg:justify-start',
  wideColumnContentVerticalAlign: 'justify-start',
  wideColumnContentVerticalAlignWide: 'md:justify-start',
  wideColumnContentVerticalAlignLg: 'lg:justify-start',
  narrowColumnContentMinHeight: 'min-h-0',
  wideColumnContentMinHeight: 'min-h-0',
  narrowColumnMobileAlignOffsetPx: 0,
  narrowColumnContentPaddingLeft: 'pl-0',
  narrowColumnContentPaddingLeftWide: 'md:pl-4',
  narrowColumnContentPaddingLeftLg: 'lg:pl-4',
  narrowColumnContentPaddingRightWide: 'md:pr-4',
  narrowColumnContentPaddingRightLg: 'lg:pr-4',
  narrowColumnContentPaddingRight: 'pr-0',
  narrowColumnContentPaddingTop: 'pt-0',
  narrowColumnContentPaddingTopWide: 'md:pt-14',
  narrowColumnContentPaddingTopLg: 'lg:pt-14',
  narrowColumnContentPaddingBottom: 'pb-16',
  narrowColumnContentPaddingBottomWide: 'md:pb-6',
  narrowColumnContentPaddingBottomLg: 'lg:pb-6',
  narrowColumnContentMarginTop: 'mt-0',
  narrowColumnContentMarginTopWide: 'md:mt-0',
  narrowColumnContentMarginTopLg: 'lg:mt-0',
  narrowColumnContentMarginRight: 'mr-0',
  narrowColumnContentMarginRightWide: 'md:mr-0',
  narrowColumnContentMarginRightLg: 'lg:mr-0',
  narrowColumnContentMarginBottom: 'mb-0',
  narrowColumnContentMarginBottomWide: 'md:mb-0',
  narrowColumnContentMarginBottomLg: 'lg:mb-0',
  narrowColumnContentMarginLeft: 'ml-0',
  narrowColumnContentMarginLeftWide: 'md:ml-0',
  narrowColumnContentMarginLeftLg: 'lg:ml-0',
  wideColumnContentPaddingLeft: 'pl-7',
  wideColumnContentPaddingRight: 'pr-7',
  wideColumnContentPaddingLeftWide: 'md:pl-7',
  wideColumnContentPaddingLeftLg: 'lg:pl-14',
  wideColumnContentPaddingRightWide: 'md:pr-8',
  wideColumnContentPaddingRightLg: 'lg:pr-8',
  wideColumnContentPaddingTop: 'pt-0',
  wideColumnContentPaddingTopWide: 'md:pt-14',
  wideColumnContentPaddingTopLg: 'lg:pt-14',
  wideColumnContentPaddingBottom: 'pb-16',
  wideColumnContentPaddingBottomWide: 'md:pb-16',
  wideColumnContentPaddingBottomLg: 'lg:pb-16',
  wideColumnContentMarginTop: 'mt-0',
  wideColumnContentMarginTopWide: 'md:mt-0',
  wideColumnContentMarginTopLg: 'lg:mt-0',
  wideColumnContentMarginRight: 'mr-0',
  wideColumnContentMarginRightWide: 'md:mr-0',
  wideColumnContentMarginRightLg: 'lg:mr-0',
  wideColumnContentMarginBottom: 'mb-0',
  wideColumnContentMarginBottomWide: 'md:mb-0',
  wideColumnContentMarginBottomLg: 'lg:mb-0',
  wideColumnContentMarginLeft: 'ml-0',
  wideColumnContentMarginLeftWide: 'md:ml-0',
  wideColumnContentMarginLeftLg: 'lg:ml-0',
  ...POLYMORPHIC_LAYOUT_HEADER_SEGMENT_DEFAULTS,
  headerLeftContentPaddingTop: 'pt-0',
  headerLeftContentPaddingTopWide: 'md:pt-0',
  headerLeftContentPaddingTopLg: 'lg:pt-0',
  headerLeftContentPaddingRight: 'pr-0',
  headerLeftContentPaddingRightWide: 'md:pr-7',
  headerLeftContentPaddingRightLg: 'lg:pr-14',
  headerLeftContentPaddingBottom: 'pb-0',
  headerLeftContentPaddingBottomWide: 'md:pb-0',
  headerLeftContentPaddingBottomLg: 'lg:pb-0',
  headerLeftContentPaddingLeft: 'pl-0',
  headerLeftContentPaddingLeftWide: 'md:pl-0',
  headerLeftContentPaddingLeftLg: 'lg:pl-0',
  headerLeftContentMarginTop: 'mt-0',
  headerLeftContentMarginTopWide: 'md:mt-0',
  headerLeftContentMarginTopLg: 'lg:mt-0',
  headerLeftContentMarginRight: 'mr-0',
  headerLeftContentMarginRightWide: 'md:mr-0',
  headerLeftContentMarginRightLg: 'lg:mr-0',
  headerLeftContentMarginBottom: 'mb-0',
  headerLeftContentMarginBottomWide: 'md:mb-0',
  headerLeftContentMarginBottomLg: 'lg:mb-0',
  headerLeftContentMarginLeft: 'ml-0',
  headerLeftContentMarginLeftWide: 'md:ml-0',
  headerLeftContentMarginLeftLg: 'lg:ml-0',
  headerRightContentPaddingTop: 'pt-0',
  headerRightContentPaddingTopWide: 'md:pt-0',
  headerRightContentPaddingTopLg: 'lg:pt-0',
  headerRightContentPaddingRight: 'pr-0',
  headerRightContentPaddingRightWide: 'md:pr-0',
  headerRightContentPaddingRightLg: 'lg:pr-0',
  headerRightContentPaddingBottom: 'pb-0',
  headerRightContentPaddingBottomWide: 'md:pb-0',
  headerRightContentPaddingBottomLg: 'lg:pb-0',
  headerRightContentPaddingLeft: 'pl-0',
  headerRightContentPaddingLeftWide: 'md:pl-7',
  headerRightContentPaddingLeftLg: 'lg:pl-14',
  headerRightContentMarginTop: 'mt-0',
  headerRightContentMarginTopWide: 'md:mt-0',
  headerRightContentMarginTopLg: 'lg:mt-0',
  headerRightContentMarginRight: 'mr-0',
  headerRightContentMarginRightWide: 'md:mr-0',
  headerRightContentMarginRightLg: 'lg:mr-0',
  headerRightContentMarginBottom: 'mb-0',
  headerRightContentMarginBottomWide: 'md:mb-0',
  headerRightContentMarginBottomLg: 'lg:mb-0',
  headerRightContentMarginLeft: 'ml-0',
  headerRightContentMarginLeftWide: 'md:ml-0',
  headerRightContentMarginLeftLg: 'lg:ml-0',
  bodyGutterPaddingLeft: 'pl-0',
  bodyGutterPaddingLeftWide: 'md:pl-0',
  bodyGutterPaddingLeftLg: 'lg:pl-0',
  bodyGutterPaddingRight: 'pr-0',
  bodyGutterPaddingRightWide: 'md:pr-0',
  bodyGutterPaddingRightLg: 'lg:pr-0',
  colorSourceWide: 'custom',
  colorSourceLg: 'custom',
  wideColumnCustomColorWide: '#d3d4de',
  wideColumnCustomColorLg: '#d3d4de',
  narrowColumnCustomColorWide: '#dadbe2',
  narrowColumnCustomColorLg: '#dadbe2',
  wideColumnSurfaceOffsetWide: 0,
  wideColumnSurfaceOffsetLg: 0,
  narrowColumnSurfaceOffsetWide: 0,
  narrowColumnSurfaceOffsetLg: 0,
  splitBandLeftModeWide: 'syncWithColumnBelow',
  splitBandLeftModeLg: 'syncWithColumnBelow',
  splitBandLeftCustomColorWide: '#d1d1d1',
  splitBandLeftCustomColorLg: '#d1d1d1',
  splitBandRightModeWide: 'syncWithColumnBelow',
  splitBandRightModeLg: 'syncWithColumnBelow',
  splitBandRightCustomColorWide: '#27307c',
  splitBandRightCustomColorLg: '#27307c',
  splitBandWidthTier: 'stacked',
  splitBandWidthTierWide: '38/62',
  splitBandWidthTierLg: '38/62',
} satisfies PolymorphicLayoutConfig;

const HORIZONTAL_ALIGN_VALUES: ReadonlyArray<PolymorphicLayoutContentContainerAlign> = [
  'items-start', 'items-center', 'items-end',
];
const TEXT_ALIGN_VALUES: ReadonlyArray<PolymorphicLayoutContentTextAlign> = [
  'text-left', 'text-center', 'text-right',
];
const TEXT_ALIGN_WIDE_VALUES: ReadonlyArray<PolymorphicLayoutContentTextAlignWide> = [
  'md:text-left', 'md:text-center', 'md:text-right',
];
const TEXT_ALIGN_LG_VALUES: ReadonlyArray<PolymorphicLayoutContentTextAlignLg> = [
  'lg:text-left', 'lg:text-center', 'lg:text-right',
];
// Column content-container width fields (narrow/wideColumnContentWidth*)
// allow 'auto' (shrink-to-fit / no width class) alongside the literal
// percentage scale — unlike CONTENT_WIDTH_PERCENT_WIDE_VALUES above, which
// backs other Wide-only, always-percentage fields with no 'auto' option.
const CONTENT_WIDTH_PERCENT_BASE_AUTO_VALUES: ReadonlyArray<ContentWidthPercentClass | 'auto'> = [
  'auto',
  ...CONTENT_WIDTH_PERCENT_OPTIONS.map(option => option.value),
];
const CONTENT_WIDTH_PERCENT_WIDE_AUTO_VALUES: ReadonlyArray<ContentWidthPercentWideClass | 'auto'> = [
  'auto',
  ...CONTENT_WIDTH_PERCENT_WIDE_OPTIONS.map(option => option.value),
];
const CONTENT_WIDTH_PERCENT_LG_AUTO_VALUES: ReadonlyArray<ContentWidthPercentLgClass | 'auto'> = [
  'auto',
  ...CONTENT_WIDTH_PERCENT_LG_OPTIONS.map(option => option.value),
];
// wideColumnContentWidthWide/-Lg's own validation whitelist — the same
// percentage-step + 'auto' values as their narrow-column counterparts above,
// plus 'match-narrow-column' (see that field's own doc comment,
// PolymorphicLayoutConfig). Deliberately separate arrays, not the shared
// CONTENT_WIDTH_PERCENT_WIDE/LG_AUTO_VALUES above — that sentinel is only
// meaningful for the wide column's own fields (matching >100%-of-own-box
// isn't expressible via max-width, so the narrow column has no equivalent
// use for it), and reusing the shared array would silently accept it there
// too with no resolution logic to back it up.
const WIDE_COLUMN_CONTENT_WIDTH_WIDE_AUTO_VALUES: ReadonlyArray<ContentWidthPercentWideClass | 'auto' | 'match-narrow-column'> = [
  ...CONTENT_WIDTH_PERCENT_WIDE_AUTO_VALUES,
  'match-narrow-column',
];
const WIDE_COLUMN_CONTENT_WIDTH_LG_AUTO_VALUES: ReadonlyArray<ContentWidthPercentLgClass | 'auto' | 'match-narrow-column'> = [
  ...CONTENT_WIDTH_PERCENT_LG_AUTO_VALUES,
  'match-narrow-column',
];
const CONTENT_MIN_HEIGHT_VALUES: ReadonlyArray<ContentMinHeightClass> =
  CONTENT_MIN_HEIGHT_OPTIONS.map(option => option.value);
const PADDING_TOP_VALUES: ReadonlyArray<PaddingTopClass> =
  PADDING_TOP_OPTIONS.map(option => option.value);
const PADDING_TOP_WIDE_VALUES: ReadonlyArray<PaddingTopWideClass> =
  PADDING_TOP_WIDE_OPTIONS.map(option => option.value);
const PADDING_RIGHT_VALUES: ReadonlyArray<PaddingRightClass> =
  PADDING_RIGHT_OPTIONS.map(option => option.value);
const PADDING_RIGHT_WIDE_VALUES: ReadonlyArray<PaddingRightWideClass> =
  PADDING_RIGHT_WIDE_OPTIONS.map(option => option.value);
const PADDING_BOTTOM_VALUES: ReadonlyArray<PaddingBottomClass> =
  PADDING_BOTTOM_OPTIONS.map(option => option.value);
const PADDING_BOTTOM_WIDE_VALUES: ReadonlyArray<PaddingBottomWideClass> =
  PADDING_BOTTOM_WIDE_OPTIONS.map(option => option.value);
const PADDING_LEFT_VALUES: ReadonlyArray<PaddingLeftClass> =
  PADDING_LEFT_OPTIONS.map(option => option.value);
const PADDING_LEFT_WIDE_VALUES: ReadonlyArray<PaddingLeftWideClass> =
  PADDING_LEFT_WIDE_OPTIONS.map(option => option.value);
const MARGIN_TOP_VALUES: ReadonlyArray<MarginTopClass> =
  MARGIN_TOP_OPTIONS.map(option => option.value);
const MARGIN_TOP_WIDE_VALUES: ReadonlyArray<MarginTopWideClass> =
  MARGIN_TOP_WIDE_OPTIONS.map(option => option.value);
const MARGIN_RIGHT_VALUES: ReadonlyArray<MarginRightClass> =
  MARGIN_RIGHT_OPTIONS.map(option => option.value);
const MARGIN_RIGHT_WIDE_VALUES: ReadonlyArray<MarginRightWideClass> =
  MARGIN_RIGHT_WIDE_OPTIONS.map(option => option.value);
const MARGIN_BOTTOM_VALUES: ReadonlyArray<MarginBottomClass> =
  MARGIN_BOTTOM_OPTIONS.map(option => option.value);
const MARGIN_BOTTOM_WIDE_VALUES: ReadonlyArray<MarginBottomWideClass> =
  MARGIN_BOTTOM_WIDE_OPTIONS.map(option => option.value);
const MARGIN_LEFT_VALUES: ReadonlyArray<MarginLeftClass> =
  MARGIN_LEFT_OPTIONS.map(option => option.value);
const MARGIN_LEFT_WIDE_VALUES: ReadonlyArray<MarginLeftWideClass> =
  MARGIN_LEFT_WIDE_OPTIONS.map(option => option.value);
const PADDING_TOP_LG_VALUES: ReadonlyArray<PaddingTopLgClass> =
  PADDING_TOP_LG_OPTIONS.map(option => option.value);
const PADDING_RIGHT_LG_VALUES: ReadonlyArray<PaddingRightLgClass> =
  PADDING_RIGHT_LG_OPTIONS.map(option => option.value);
const PADDING_BOTTOM_LG_VALUES: ReadonlyArray<PaddingBottomLgClass> =
  PADDING_BOTTOM_LG_OPTIONS.map(option => option.value);
const PADDING_LEFT_LG_VALUES: ReadonlyArray<PaddingLeftLgClass> =
  PADDING_LEFT_LG_OPTIONS.map(option => option.value);
const MARGIN_TOP_LG_VALUES: ReadonlyArray<MarginTopLgClass> =
  MARGIN_TOP_LG_OPTIONS.map(option => option.value);
const MARGIN_RIGHT_LG_VALUES: ReadonlyArray<MarginRightLgClass> =
  MARGIN_RIGHT_LG_OPTIONS.map(option => option.value);
const MARGIN_BOTTOM_LG_VALUES: ReadonlyArray<MarginBottomLgClass> =
  MARGIN_BOTTOM_LG_OPTIONS.map(option => option.value);
const MARGIN_LEFT_LG_VALUES: ReadonlyArray<MarginLeftLgClass> =
  MARGIN_LEFT_LG_OPTIONS.map(option => option.value);
const HEADER_SEGMENT_JUSTIFY_VALUES: ReadonlyArray<HeaderSegmentJustifyClass> = [
  'justify-start', 'justify-center', 'justify-end',
];
const HEADER_SEGMENT_JUSTIFY_WIDE_VALUES: ReadonlyArray<HeaderSegmentJustifyWideClass> = [
  'md:justify-start', 'md:justify-center', 'md:justify-end',
];
const HEADER_SEGMENT_JUSTIFY_LG_VALUES: ReadonlyArray<HeaderSegmentJustifyLgClass> = [
  'lg:justify-start', 'lg:justify-center', 'lg:justify-end',
];
const HEADER_SEGMENT_ITEMS_VALUES: ReadonlyArray<HeaderSegmentItemsClass> = [
  'items-start', 'items-center', 'items-end',
];
const HEADER_SEGMENT_ITEMS_WIDE_VALUES: ReadonlyArray<HeaderSegmentItemsWideClass> = [
  'md:items-start', 'md:items-center', 'md:items-end',
];
const HEADER_SEGMENT_ITEMS_LG_VALUES: ReadonlyArray<HeaderSegmentItemsLgClass> = [
  'lg:items-start', 'lg:items-center', 'lg:items-end',
];
const HEADER_CONTENT_WIDTH_BASE_VALUES: ReadonlyArray<ContentWidthPercentClass | 'auto'> = [
  'auto',
  ...CONTENT_WIDTH_PERCENT_OPTIONS.map(option => option.value),
];
const HEADER_CONTENT_WIDTH_VALUES: ReadonlyArray<SiteHeaderContentWidth> = [
  'auto',
  ...CONTENT_WIDTH_PERCENT_WIDE_OPTIONS.map(option => option.value),
];
const HEADER_CONTENT_WIDTH_LG_VALUES: ReadonlyArray<ContentWidthPercentLgClass | 'auto'> = [
  'auto',
  ...CONTENT_WIDTH_PERCENT_LG_OPTIONS.map(option => option.value),
];
const HEADER_SCROLL_BEHAVIOR_VALUES: ReadonlyArray<PolymorphicLayoutHeaderScrollBehavior> = ['fixed', 'sticky', 'static'];
const RATIO_TIER_VALUES: ReadonlyArray<PolymorphicLayoutRatioTier> = [
  'stacked', '30/70', '35/65', '38/62', '40/60', '45/55', '50/50',
];
const WIDE_SIDES: ReadonlyArray<PolymorphicLayoutWideSide> = ['left', 'right'];
const STACKED_ORDERS: ReadonlyArray<PolymorphicLayoutStackedOrder> = ['narrowFirst', 'wideFirst'];
const HEADER_BEHAVIORS: ReadonlyArray<PolymorphicLayoutHeaderBehavior> = ['pushDown', 'float'];
const COLOR_SOURCES: ReadonlyArray<PolymorphicLayoutColorSource> = [
  'none', 'palette', 'custom', 'surface',
];
const BAND_MODES: ReadonlyArray<PolymorphicLayoutBandMode> = [
  'transparent', 'custom', 'syncWithColumnBelow',
];
const CONTENT_CONTAINER_VALUES: ReadonlyArray<PolymorphicLayoutContentContainer> = [
  'bounded', 'full-bleed',
];

const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);
const clampRange = (value: number, min: number, max: number, fallback: number) => (
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback))
);
// Same shape as components/SplitColumnLayout.config.ts's own normalizeColor
// — not imported from there since it's a private, unexported helper in that
// file.
const normalizeColor = (value: string, fallback: string) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
};

export function normalizePolymorphicLayoutConfig(
  config: Partial<PolymorphicLayoutConfig> | undefined,
): PolymorphicLayoutConfig {
  const base = { ...DEFAULT_POLYMORPHIC_LAYOUT_CONFIG, ...(config ?? {}) };
  return {
    // Mirrors SplitColumnLayout.config.ts's own normalizeSplitColumnLayoutConfig
    // per-field token/color logic exactly — not called into (that function
    // lives in the file this type owns zero import from), reimplemented
    // here using this file's own local token/clampRange/normalizeColor
    // helpers, same as every other field below already does.
    wideColumnSide: token(
      base.wideColumnSide, WIDE_SIDES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnSide,
    ),
    narrowColumnWidthTierMd: token(
      base.narrowColumnWidthTierMd, RATIO_TIER_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnWidthTierMd,
    ),
    narrowColumnWidthTierLg: token(
      base.narrowColumnWidthTierLg, RATIO_TIER_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnWidthTierLg,
    ),
    stackedColumnOrder: token(
      base.stackedColumnOrder, STACKED_ORDERS, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.stackedColumnOrder,
    ),
    wideColumnHeaderBehavior: token(
      base.wideColumnHeaderBehavior,
      HEADER_BEHAVIORS,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnHeaderBehavior,
    ),
    narrowColumnHeaderBehavior: token(
      base.narrowColumnHeaderBehavior,
      HEADER_BEHAVIORS,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnHeaderBehavior,
    ),
    legibilityScrimEnabled: base.legibilityScrimEnabled === true,
    wideColumnClearsFloatingHeader: base.wideColumnClearsFloatingHeader === true,
    wideColumnClearsFloatingHeaderWide: base.wideColumnClearsFloatingHeaderWide === true,
    wideColumnClearsFloatingHeaderLg: base.wideColumnClearsFloatingHeaderLg === true,
    narrowColumnClearsFloatingHeader: base.narrowColumnClearsFloatingHeader === true,
    narrowColumnClearsFloatingHeaderWide: base.narrowColumnClearsFloatingHeaderWide === true,
    narrowColumnClearsFloatingHeaderLg: base.narrowColumnClearsFloatingHeaderLg === true,
    colorSource: token(
      base.colorSource, COLOR_SOURCES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.colorSource,
    ),
    wideColumnCustomColor: normalizeColor(
      base.wideColumnCustomColor, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnCustomColor,
    ),
    narrowColumnCustomColor: normalizeColor(
      base.narrowColumnCustomColor, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnCustomColor,
    ),
    wideColumnSurfaceOffset: clampRange(
      base.wideColumnSurfaceOffset,
      -1,
      1,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnSurfaceOffset,
    ),
    narrowColumnSurfaceOffset: clampRange(
      base.narrowColumnSurfaceOffset,
      -1,
      1,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnSurfaceOffset,
    ),
    headerSplitBandEnabled: base.headerSplitBandEnabled !== false,
    splitBandLeftMode: token(
      base.splitBandLeftMode, BAND_MODES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.splitBandLeftMode,
    ),
    splitBandLeftCustomColor: normalizeColor(
      base.splitBandLeftCustomColor, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.splitBandLeftCustomColor,
    ),
    splitBandRightMode: token(
      base.splitBandRightMode, BAND_MODES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.splitBandRightMode,
    ),
    splitBandRightCustomColor: normalizeColor(
      base.splitBandRightCustomColor, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.splitBandRightCustomColor,
    ),
    contentContainer: token(
      base.contentContainer, CONTENT_CONTAINER_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.contentContainer,
    ),
    wideColumnContentContainer: token(
      base.wideColumnContentContainer,
      CONTENT_CONTAINER_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentContainer,
    ),
    narrowColumnContentContainer: token(
      base.narrowColumnContentContainer,
      CONTENT_CONTAINER_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentContainer,
    ),
    headerScrollBehavior: token(
      base.headerScrollBehavior,
      HEADER_SCROLL_BEHAVIOR_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerScrollBehavior,
    ),
    headerScrollBehaviorWide: token(
      base.headerScrollBehaviorWide,
      HEADER_SCROLL_BEHAVIOR_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerScrollBehaviorWide,
    ),
    headerScrollBehaviorLg: token(
      base.headerScrollBehaviorLg,
      HEADER_SCROLL_BEHAVIOR_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerScrollBehaviorLg,
    ),
    narrowColumnContentAlign: token(
      base.narrowColumnContentAlign, HORIZONTAL_ALIGN_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentAlign,
    ),
    narrowColumnContentAlignWide: token(
      base.narrowColumnContentAlignWide, HORIZONTAL_ALIGN_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentAlignWide,
    ),
    narrowColumnContentAlignLg: token(
      base.narrowColumnContentAlignLg, HORIZONTAL_ALIGN_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentAlignLg,
    ),
    wideColumnContentAlign: token(
      base.wideColumnContentAlign, HORIZONTAL_ALIGN_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentAlign,
    ),
    wideColumnContentAlignWide: token(
      base.wideColumnContentAlignWide, HORIZONTAL_ALIGN_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentAlignWide,
    ),
    wideColumnContentAlignLg: token(
      base.wideColumnContentAlignLg, HORIZONTAL_ALIGN_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentAlignLg,
    ),
    narrowColumnContentWidth: token(
      base.narrowColumnContentWidth, CONTENT_WIDTH_PERCENT_BASE_AUTO_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentWidth,
    ),
    narrowColumnContentWidthWide: token(
      base.narrowColumnContentWidthWide, CONTENT_WIDTH_PERCENT_WIDE_AUTO_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentWidthWide,
    ),
    narrowColumnContentWidthLg: token(
      base.narrowColumnContentWidthLg, CONTENT_WIDTH_PERCENT_LG_AUTO_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentWidthLg,
    ),
    wideColumnContentWidth: token(
      base.wideColumnContentWidth, CONTENT_WIDTH_PERCENT_BASE_AUTO_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentWidth,
    ),
    wideColumnContentWidthWide: token(
      base.wideColumnContentWidthWide, WIDE_COLUMN_CONTENT_WIDTH_WIDE_AUTO_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentWidthWide,
    ),
    wideColumnContentWidthLg: token(
      base.wideColumnContentWidthLg, WIDE_COLUMN_CONTENT_WIDTH_LG_AUTO_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentWidthLg,
    ),
    narrowColumnTextAlign: token(
      base.narrowColumnTextAlign, TEXT_ALIGN_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnTextAlign,
    ),
    narrowColumnTextAlignWide: token(
      base.narrowColumnTextAlignWide, TEXT_ALIGN_WIDE_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnTextAlignWide,
    ),
    narrowColumnTextAlignLg: token(
      base.narrowColumnTextAlignLg, TEXT_ALIGN_LG_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnTextAlignLg,
    ),
    wideColumnTextAlign: token(
      base.wideColumnTextAlign, TEXT_ALIGN_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnTextAlign,
    ),
    wideColumnTextAlignWide: token(
      base.wideColumnTextAlignWide, TEXT_ALIGN_WIDE_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnTextAlignWide,
    ),
    wideColumnTextAlignLg: token(
      base.wideColumnTextAlignLg, TEXT_ALIGN_LG_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnTextAlignLg,
    ),
    narrowColumnContentVerticalAlign: token(
      base.narrowColumnContentVerticalAlign, HEADER_SEGMENT_JUSTIFY_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentVerticalAlign,
    ),
    narrowColumnContentVerticalAlignWide: token(
      base.narrowColumnContentVerticalAlignWide, HEADER_SEGMENT_JUSTIFY_WIDE_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentVerticalAlignWide,
    ),
    narrowColumnContentVerticalAlignLg: token(
      base.narrowColumnContentVerticalAlignLg, HEADER_SEGMENT_JUSTIFY_LG_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentVerticalAlignLg,
    ),
    wideColumnContentVerticalAlign: token(
      base.wideColumnContentVerticalAlign, HEADER_SEGMENT_JUSTIFY_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentVerticalAlign,
    ),
    wideColumnContentVerticalAlignWide: token(
      base.wideColumnContentVerticalAlignWide, HEADER_SEGMENT_JUSTIFY_WIDE_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentVerticalAlignWide,
    ),
    wideColumnContentVerticalAlignLg: token(
      base.wideColumnContentVerticalAlignLg, HEADER_SEGMENT_JUSTIFY_LG_VALUES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentVerticalAlignLg,
    ),
    narrowColumnContentMinHeight: token(
      base.narrowColumnContentMinHeight,
      CONTENT_MIN_HEIGHT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentMinHeight,
    ),
    wideColumnContentMinHeight: token(
      base.wideColumnContentMinHeight,
      CONTENT_MIN_HEIGHT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentMinHeight,
    ),
    narrowColumnMobileAlignOffsetPx: clampRange(
      base.narrowColumnMobileAlignOffsetPx,
      -40,
      40,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnMobileAlignOffsetPx,
    ),
    narrowColumnContentPaddingLeft: token(
      base.narrowColumnContentPaddingLeft,
      PADDING_LEFT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentPaddingLeft,
    ),
    narrowColumnContentPaddingLeftWide: token(
      base.narrowColumnContentPaddingLeftWide,
      PADDING_LEFT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentPaddingLeftWide,
    ),
    narrowColumnContentPaddingLeftLg: token(
      base.narrowColumnContentPaddingLeftLg,
      PADDING_LEFT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentPaddingLeftLg,
    ),
    narrowColumnContentPaddingRightWide: token(
      base.narrowColumnContentPaddingRightWide,
      PADDING_RIGHT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentPaddingRightWide,
    ),
    narrowColumnContentPaddingRightLg: token(
      base.narrowColumnContentPaddingRightLg,
      PADDING_RIGHT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentPaddingRightLg,
    ),
    narrowColumnContentPaddingRight: token(
      base.narrowColumnContentPaddingRight,
      PADDING_RIGHT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentPaddingRight,
    ),
    narrowColumnContentPaddingTop: token(
      base.narrowColumnContentPaddingTop,
      PADDING_TOP_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentPaddingTop,
    ),
    narrowColumnContentPaddingTopWide: token(
      base.narrowColumnContentPaddingTopWide,
      PADDING_TOP_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentPaddingTopWide,
    ),
    narrowColumnContentPaddingTopLg: token(
      base.narrowColumnContentPaddingTopLg,
      PADDING_TOP_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentPaddingTopLg,
    ),
    narrowColumnContentPaddingBottom: token(
      base.narrowColumnContentPaddingBottom,
      PADDING_BOTTOM_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentPaddingBottom,
    ),
    narrowColumnContentPaddingBottomWide: token(
      base.narrowColumnContentPaddingBottomWide,
      PADDING_BOTTOM_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentPaddingBottomWide,
    ),
    narrowColumnContentPaddingBottomLg: token(
      base.narrowColumnContentPaddingBottomLg,
      PADDING_BOTTOM_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentPaddingBottomLg,
    ),
    narrowColumnContentMarginTop: token(
      base.narrowColumnContentMarginTop,
      MARGIN_TOP_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentMarginTop,
    ),
    narrowColumnContentMarginTopWide: token(
      base.narrowColumnContentMarginTopWide,
      MARGIN_TOP_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentMarginTopWide,
    ),
    narrowColumnContentMarginTopLg: token(
      base.narrowColumnContentMarginTopLg,
      MARGIN_TOP_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentMarginTopLg,
    ),
    narrowColumnContentMarginRight: token(
      base.narrowColumnContentMarginRight,
      MARGIN_RIGHT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentMarginRight,
    ),
    narrowColumnContentMarginRightWide: token(
      base.narrowColumnContentMarginRightWide,
      MARGIN_RIGHT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentMarginRightWide,
    ),
    narrowColumnContentMarginRightLg: token(
      base.narrowColumnContentMarginRightLg,
      MARGIN_RIGHT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentMarginRightLg,
    ),
    narrowColumnContentMarginBottom: token(
      base.narrowColumnContentMarginBottom,
      MARGIN_BOTTOM_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentMarginBottom,
    ),
    narrowColumnContentMarginBottomWide: token(
      base.narrowColumnContentMarginBottomWide,
      MARGIN_BOTTOM_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentMarginBottomWide,
    ),
    narrowColumnContentMarginBottomLg: token(
      base.narrowColumnContentMarginBottomLg,
      MARGIN_BOTTOM_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentMarginBottomLg,
    ),
    narrowColumnContentMarginLeft: token(
      base.narrowColumnContentMarginLeft,
      MARGIN_LEFT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentMarginLeft,
    ),
    narrowColumnContentMarginLeftWide: token(
      base.narrowColumnContentMarginLeftWide,
      MARGIN_LEFT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentMarginLeftWide,
    ),
    narrowColumnContentMarginLeftLg: token(
      base.narrowColumnContentMarginLeftLg,
      MARGIN_LEFT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnContentMarginLeftLg,
    ),
    wideColumnContentPaddingLeft: token(
      base.wideColumnContentPaddingLeft,
      PADDING_LEFT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentPaddingLeft,
    ),
    wideColumnContentPaddingRight: token(
      base.wideColumnContentPaddingRight,
      PADDING_RIGHT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentPaddingRight,
    ),
    wideColumnContentPaddingLeftWide: token(
      base.wideColumnContentPaddingLeftWide,
      PADDING_LEFT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentPaddingLeftWide,
    ),
    wideColumnContentPaddingLeftLg: token(
      base.wideColumnContentPaddingLeftLg,
      PADDING_LEFT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentPaddingLeftLg,
    ),
    wideColumnContentPaddingRightWide: token(
      base.wideColumnContentPaddingRightWide,
      PADDING_RIGHT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentPaddingRightWide,
    ),
    wideColumnContentPaddingRightLg: token(
      base.wideColumnContentPaddingRightLg,
      PADDING_RIGHT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentPaddingRightLg,
    ),
    wideColumnContentPaddingTop: token(
      base.wideColumnContentPaddingTop,
      PADDING_TOP_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentPaddingTop,
    ),
    wideColumnContentPaddingTopWide: token(
      base.wideColumnContentPaddingTopWide,
      PADDING_TOP_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentPaddingTopWide,
    ),
    wideColumnContentPaddingTopLg: token(
      base.wideColumnContentPaddingTopLg,
      PADDING_TOP_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentPaddingTopLg,
    ),
    wideColumnContentPaddingBottom: token(
      base.wideColumnContentPaddingBottom,
      PADDING_BOTTOM_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentPaddingBottom,
    ),
    wideColumnContentPaddingBottomWide: token(
      base.wideColumnContentPaddingBottomWide,
      PADDING_BOTTOM_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentPaddingBottomWide,
    ),
    wideColumnContentPaddingBottomLg: token(
      base.wideColumnContentPaddingBottomLg,
      PADDING_BOTTOM_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentPaddingBottomLg,
    ),
    wideColumnContentMarginTop: token(
      base.wideColumnContentMarginTop,
      MARGIN_TOP_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentMarginTop,
    ),
    wideColumnContentMarginTopWide: token(
      base.wideColumnContentMarginTopWide,
      MARGIN_TOP_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentMarginTopWide,
    ),
    wideColumnContentMarginTopLg: token(
      base.wideColumnContentMarginTopLg,
      MARGIN_TOP_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentMarginTopLg,
    ),
    wideColumnContentMarginRight: token(
      base.wideColumnContentMarginRight,
      MARGIN_RIGHT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentMarginRight,
    ),
    wideColumnContentMarginRightWide: token(
      base.wideColumnContentMarginRightWide,
      MARGIN_RIGHT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentMarginRightWide,
    ),
    wideColumnContentMarginRightLg: token(
      base.wideColumnContentMarginRightLg,
      MARGIN_RIGHT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentMarginRightLg,
    ),
    wideColumnContentMarginBottom: token(
      base.wideColumnContentMarginBottom,
      MARGIN_BOTTOM_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentMarginBottom,
    ),
    wideColumnContentMarginBottomWide: token(
      base.wideColumnContentMarginBottomWide,
      MARGIN_BOTTOM_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentMarginBottomWide,
    ),
    wideColumnContentMarginBottomLg: token(
      base.wideColumnContentMarginBottomLg,
      MARGIN_BOTTOM_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentMarginBottomLg,
    ),
    wideColumnContentMarginLeft: token(
      base.wideColumnContentMarginLeft,
      MARGIN_LEFT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentMarginLeft,
    ),
    wideColumnContentMarginLeftWide: token(
      base.wideColumnContentMarginLeftWide,
      MARGIN_LEFT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentMarginLeftWide,
    ),
    wideColumnContentMarginLeftLg: token(
      base.wideColumnContentMarginLeftLg,
      MARGIN_LEFT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnContentMarginLeftLg,
    ),
    headerLeftSegmentAlign: token(
      base.headerLeftSegmentAlign,
      HEADER_SEGMENT_JUSTIFY_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftSegmentAlign,
    ),
    headerLeftSegmentAlignWide: token(
      base.headerLeftSegmentAlignWide,
      HEADER_SEGMENT_JUSTIFY_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftSegmentAlignWide,
    ),
    headerLeftSegmentAlignLg: token(
      base.headerLeftSegmentAlignLg,
      HEADER_SEGMENT_JUSTIFY_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftSegmentAlignLg,
    ),
    headerLeftSegmentVerticalAlign: token(
      base.headerLeftSegmentVerticalAlign,
      HEADER_SEGMENT_ITEMS_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftSegmentVerticalAlign,
    ),
    headerLeftSegmentVerticalAlignWide: token(
      base.headerLeftSegmentVerticalAlignWide,
      HEADER_SEGMENT_ITEMS_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftSegmentVerticalAlignWide,
    ),
    headerLeftSegmentVerticalAlignLg: token(
      base.headerLeftSegmentVerticalAlignLg,
      HEADER_SEGMENT_ITEMS_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftSegmentVerticalAlignLg,
    ),
    headerLeftContentWidth: token(
      base.headerLeftContentWidth,
      HEADER_CONTENT_WIDTH_BASE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentWidth,
    ),
    headerLeftContentWidthWide: token(
      base.headerLeftContentWidthWide,
      HEADER_CONTENT_WIDTH_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentWidthWide,
    ),
    headerLeftContentWidthLg: token(
      base.headerLeftContentWidthLg,
      HEADER_CONTENT_WIDTH_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentWidthLg,
    ),
    headerRightSegmentAlign: token(
      base.headerRightSegmentAlign,
      HEADER_SEGMENT_JUSTIFY_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightSegmentAlign,
    ),
    headerRightSegmentAlignWide: token(
      base.headerRightSegmentAlignWide,
      HEADER_SEGMENT_JUSTIFY_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightSegmentAlignWide,
    ),
    headerRightSegmentAlignLg: token(
      base.headerRightSegmentAlignLg,
      HEADER_SEGMENT_JUSTIFY_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightSegmentAlignLg,
    ),
    headerRightSegmentVerticalAlign: token(
      base.headerRightSegmentVerticalAlign,
      HEADER_SEGMENT_ITEMS_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightSegmentVerticalAlign,
    ),
    headerRightSegmentVerticalAlignWide: token(
      base.headerRightSegmentVerticalAlignWide,
      HEADER_SEGMENT_ITEMS_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightSegmentVerticalAlignWide,
    ),
    headerRightSegmentVerticalAlignLg: token(
      base.headerRightSegmentVerticalAlignLg,
      HEADER_SEGMENT_ITEMS_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightSegmentVerticalAlignLg,
    ),
    headerRightContentWidth: token(
      base.headerRightContentWidth,
      HEADER_CONTENT_WIDTH_BASE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentWidth,
    ),
    headerRightContentWidthWide: token(
      base.headerRightContentWidthWide,
      HEADER_CONTENT_WIDTH_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentWidthWide,
    ),
    headerRightContentWidthLg: token(
      base.headerRightContentWidthLg,
      HEADER_CONTENT_WIDTH_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentWidthLg,
    ),
    headerLeftInnerAlign: token(
      base.headerLeftInnerAlign,
      HEADER_SEGMENT_JUSTIFY_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftInnerAlign,
    ),
    headerLeftInnerAlignWide: token(
      base.headerLeftInnerAlignWide,
      HEADER_SEGMENT_JUSTIFY_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftInnerAlignWide,
    ),
    headerLeftInnerAlignLg: token(
      base.headerLeftInnerAlignLg,
      HEADER_SEGMENT_JUSTIFY_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftInnerAlignLg,
    ),
    headerRightInnerAlign: token(
      base.headerRightInnerAlign,
      HEADER_SEGMENT_JUSTIFY_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightInnerAlign,
    ),
    headerRightInnerAlignWide: token(
      base.headerRightInnerAlignWide,
      HEADER_SEGMENT_JUSTIFY_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightInnerAlignWide,
    ),
    headerRightInnerAlignLg: token(
      base.headerRightInnerAlignLg,
      HEADER_SEGMENT_JUSTIFY_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightInnerAlignLg,
    ),
    headerLeftContentPaddingTop: token(
      base.headerLeftContentPaddingTop,
      PADDING_TOP_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentPaddingTop,
    ),
    headerLeftContentPaddingTopWide: token(
      base.headerLeftContentPaddingTopWide,
      PADDING_TOP_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentPaddingTopWide,
    ),
    headerLeftContentPaddingTopLg: token(
      base.headerLeftContentPaddingTopLg,
      PADDING_TOP_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentPaddingTopLg,
    ),
    headerLeftContentPaddingRight: token(
      base.headerLeftContentPaddingRight,
      PADDING_RIGHT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentPaddingRight,
    ),
    headerLeftContentPaddingRightWide: token(
      base.headerLeftContentPaddingRightWide,
      PADDING_RIGHT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentPaddingRightWide,
    ),
    headerLeftContentPaddingRightLg: token(
      base.headerLeftContentPaddingRightLg,
      PADDING_RIGHT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentPaddingRightLg,
    ),
    headerLeftContentPaddingBottom: token(
      base.headerLeftContentPaddingBottom,
      PADDING_BOTTOM_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentPaddingBottom,
    ),
    headerLeftContentPaddingBottomWide: token(
      base.headerLeftContentPaddingBottomWide,
      PADDING_BOTTOM_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentPaddingBottomWide,
    ),
    headerLeftContentPaddingBottomLg: token(
      base.headerLeftContentPaddingBottomLg,
      PADDING_BOTTOM_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentPaddingBottomLg,
    ),
    headerLeftContentPaddingLeft: token(
      base.headerLeftContentPaddingLeft,
      PADDING_LEFT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentPaddingLeft,
    ),
    headerLeftContentPaddingLeftWide: token(
      base.headerLeftContentPaddingLeftWide,
      PADDING_LEFT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentPaddingLeftWide,
    ),
    headerLeftContentPaddingLeftLg: token(
      base.headerLeftContentPaddingLeftLg,
      PADDING_LEFT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentPaddingLeftLg,
    ),
    headerLeftContentMarginTop: token(
      base.headerLeftContentMarginTop,
      MARGIN_TOP_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentMarginTop,
    ),
    headerLeftContentMarginTopWide: token(
      base.headerLeftContentMarginTopWide,
      MARGIN_TOP_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentMarginTopWide,
    ),
    headerLeftContentMarginTopLg: token(
      base.headerLeftContentMarginTopLg,
      MARGIN_TOP_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentMarginTopLg,
    ),
    headerLeftContentMarginRight: token(
      base.headerLeftContentMarginRight,
      MARGIN_RIGHT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentMarginRight,
    ),
    headerLeftContentMarginRightWide: token(
      base.headerLeftContentMarginRightWide,
      MARGIN_RIGHT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentMarginRightWide,
    ),
    headerLeftContentMarginRightLg: token(
      base.headerLeftContentMarginRightLg,
      MARGIN_RIGHT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentMarginRightLg,
    ),
    headerLeftContentMarginBottom: token(
      base.headerLeftContentMarginBottom,
      MARGIN_BOTTOM_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentMarginBottom,
    ),
    headerLeftContentMarginBottomWide: token(
      base.headerLeftContentMarginBottomWide,
      MARGIN_BOTTOM_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentMarginBottomWide,
    ),
    headerLeftContentMarginBottomLg: token(
      base.headerLeftContentMarginBottomLg,
      MARGIN_BOTTOM_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentMarginBottomLg,
    ),
    headerLeftContentMarginLeft: token(
      base.headerLeftContentMarginLeft,
      MARGIN_LEFT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentMarginLeft,
    ),
    headerLeftContentMarginLeftWide: token(
      base.headerLeftContentMarginLeftWide,
      MARGIN_LEFT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentMarginLeftWide,
    ),
    headerLeftContentMarginLeftLg: token(
      base.headerLeftContentMarginLeftLg,
      MARGIN_LEFT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerLeftContentMarginLeftLg,
    ),
    headerRightContentPaddingTop: token(
      base.headerRightContentPaddingTop,
      PADDING_TOP_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentPaddingTop,
    ),
    headerRightContentPaddingTopWide: token(
      base.headerRightContentPaddingTopWide,
      PADDING_TOP_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentPaddingTopWide,
    ),
    headerRightContentPaddingTopLg: token(
      base.headerRightContentPaddingTopLg,
      PADDING_TOP_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentPaddingTopLg,
    ),
    headerRightContentPaddingRight: token(
      base.headerRightContentPaddingRight,
      PADDING_RIGHT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentPaddingRight,
    ),
    headerRightContentPaddingRightWide: token(
      base.headerRightContentPaddingRightWide,
      PADDING_RIGHT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentPaddingRightWide,
    ),
    headerRightContentPaddingRightLg: token(
      base.headerRightContentPaddingRightLg,
      PADDING_RIGHT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentPaddingRightLg,
    ),
    headerRightContentPaddingBottom: token(
      base.headerRightContentPaddingBottom,
      PADDING_BOTTOM_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentPaddingBottom,
    ),
    headerRightContentPaddingBottomWide: token(
      base.headerRightContentPaddingBottomWide,
      PADDING_BOTTOM_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentPaddingBottomWide,
    ),
    headerRightContentPaddingBottomLg: token(
      base.headerRightContentPaddingBottomLg,
      PADDING_BOTTOM_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentPaddingBottomLg,
    ),
    headerRightContentPaddingLeft: token(
      base.headerRightContentPaddingLeft,
      PADDING_LEFT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentPaddingLeft,
    ),
    headerRightContentPaddingLeftWide: token(
      base.headerRightContentPaddingLeftWide,
      PADDING_LEFT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentPaddingLeftWide,
    ),
    headerRightContentPaddingLeftLg: token(
      base.headerRightContentPaddingLeftLg,
      PADDING_LEFT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentPaddingLeftLg,
    ),
    headerRightContentMarginTop: token(
      base.headerRightContentMarginTop,
      MARGIN_TOP_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentMarginTop,
    ),
    headerRightContentMarginTopWide: token(
      base.headerRightContentMarginTopWide,
      MARGIN_TOP_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentMarginTopWide,
    ),
    headerRightContentMarginTopLg: token(
      base.headerRightContentMarginTopLg,
      MARGIN_TOP_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentMarginTopLg,
    ),
    headerRightContentMarginRight: token(
      base.headerRightContentMarginRight,
      MARGIN_RIGHT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentMarginRight,
    ),
    headerRightContentMarginRightWide: token(
      base.headerRightContentMarginRightWide,
      MARGIN_RIGHT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentMarginRightWide,
    ),
    headerRightContentMarginRightLg: token(
      base.headerRightContentMarginRightLg,
      MARGIN_RIGHT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentMarginRightLg,
    ),
    headerRightContentMarginBottom: token(
      base.headerRightContentMarginBottom,
      MARGIN_BOTTOM_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentMarginBottom,
    ),
    headerRightContentMarginBottomWide: token(
      base.headerRightContentMarginBottomWide,
      MARGIN_BOTTOM_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentMarginBottomWide,
    ),
    headerRightContentMarginBottomLg: token(
      base.headerRightContentMarginBottomLg,
      MARGIN_BOTTOM_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentMarginBottomLg,
    ),
    headerRightContentMarginLeft: token(
      base.headerRightContentMarginLeft,
      MARGIN_LEFT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentMarginLeft,
    ),
    headerRightContentMarginLeftWide: token(
      base.headerRightContentMarginLeftWide,
      MARGIN_LEFT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentMarginLeftWide,
    ),
    headerRightContentMarginLeftLg: token(
      base.headerRightContentMarginLeftLg,
      MARGIN_LEFT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.headerRightContentMarginLeftLg,
    ),
    bodyGutterPaddingLeft: token(
      base.bodyGutterPaddingLeft,
      PADDING_LEFT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.bodyGutterPaddingLeft,
    ),
    bodyGutterPaddingLeftWide: token(
      base.bodyGutterPaddingLeftWide,
      PADDING_LEFT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.bodyGutterPaddingLeftWide,
    ),
    bodyGutterPaddingLeftLg: token(
      base.bodyGutterPaddingLeftLg,
      PADDING_LEFT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.bodyGutterPaddingLeftLg,
    ),
    bodyGutterPaddingRight: token(
      base.bodyGutterPaddingRight,
      PADDING_RIGHT_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.bodyGutterPaddingRight,
    ),
    bodyGutterPaddingRightWide: token(
      base.bodyGutterPaddingRightWide,
      PADDING_RIGHT_WIDE_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.bodyGutterPaddingRightWide,
    ),
    bodyGutterPaddingRightLg: token(
      base.bodyGutterPaddingRightLg,
      PADDING_RIGHT_LG_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.bodyGutterPaddingRightLg,
    ),
    colorSourceWide: token(
      base.colorSourceWide, COLOR_SOURCES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.colorSourceWide,
    ),
    colorSourceLg: token(
      base.colorSourceLg, COLOR_SOURCES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.colorSourceLg,
    ),
    wideColumnCustomColorWide: normalizeColor(
      base.wideColumnCustomColorWide,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnCustomColorWide,
    ),
    wideColumnCustomColorLg: normalizeColor(
      base.wideColumnCustomColorLg,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnCustomColorLg,
    ),
    narrowColumnCustomColorWide: normalizeColor(
      base.narrowColumnCustomColorWide,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnCustomColorWide,
    ),
    narrowColumnCustomColorLg: normalizeColor(
      base.narrowColumnCustomColorLg,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnCustomColorLg,
    ),
    wideColumnSurfaceOffsetWide: clampRange(
      base.wideColumnSurfaceOffsetWide, -1, 1, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnSurfaceOffsetWide,
    ),
    wideColumnSurfaceOffsetLg: clampRange(
      base.wideColumnSurfaceOffsetLg, -1, 1, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.wideColumnSurfaceOffsetLg,
    ),
    narrowColumnSurfaceOffsetWide: clampRange(
      base.narrowColumnSurfaceOffsetWide, -1, 1, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnSurfaceOffsetWide,
    ),
    narrowColumnSurfaceOffsetLg: clampRange(
      base.narrowColumnSurfaceOffsetLg, -1, 1, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.narrowColumnSurfaceOffsetLg,
    ),
    splitBandLeftModeWide: token(
      base.splitBandLeftModeWide, BAND_MODES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.splitBandLeftModeWide,
    ),
    splitBandLeftModeLg: token(
      base.splitBandLeftModeLg, BAND_MODES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.splitBandLeftModeLg,
    ),
    splitBandLeftCustomColorWide: normalizeColor(
      base.splitBandLeftCustomColorWide,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.splitBandLeftCustomColorWide,
    ),
    splitBandLeftCustomColorLg: normalizeColor(
      base.splitBandLeftCustomColorLg,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.splitBandLeftCustomColorLg,
    ),
    splitBandRightModeWide: token(
      base.splitBandRightModeWide, BAND_MODES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.splitBandRightModeWide,
    ),
    splitBandRightModeLg: token(
      base.splitBandRightModeLg, BAND_MODES, DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.splitBandRightModeLg,
    ),
    splitBandRightCustomColorWide: normalizeColor(
      base.splitBandRightCustomColorWide,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.splitBandRightCustomColorWide,
    ),
    splitBandRightCustomColorLg: normalizeColor(
      base.splitBandRightCustomColorLg,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.splitBandRightCustomColorLg,
    ),
    splitBandWidthTier: token(
      base.splitBandWidthTier,
      RATIO_TIER_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.splitBandWidthTier,
    ),
    splitBandWidthTierWide: token(
      base.splitBandWidthTierWide,
      RATIO_TIER_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.splitBandWidthTierWide,
    ),
    splitBandWidthTierLg: token(
      base.splitBandWidthTierLg,
      RATIO_TIER_VALUES,
      DEFAULT_POLYMORPHIC_LAYOUT_CONFIG.splitBandWidthTierLg,
    ),
  };
}
