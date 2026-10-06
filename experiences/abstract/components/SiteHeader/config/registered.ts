import { normalizeTailwindToken, translateTailwindTokenBreakpoint, type TailwindTokenValue } from '../../../../../components/Panel/config/tailwindFields';

// The gap this header's own split-aligned nav overlay uses on *both* sides
// of its separator (logo-to-separator and separator-to-first-item — see
// SiteHeader.tsx's own navSplitOverlay, which deliberately reuses
// one navContentGapPx value for both rather than two independently-tuned
// ones, precisely so they can't visually disagree). Exported here — not
// left as a private constant on whichever page happened to define it first
// — because every page that turns navAlignedToSplitEnabled on needs the
// exact same value: SiteHeaderConfig.navContentGapPx is shared
// state (SharedDesignConfigProvider), so leaving even one page to silently
// fall back to whatever DEFAULT_SITE_HEADER_CONFIG.
// navContentGapPx currently is (a value that has already drifted at least
// once) reproduces the exact "two things that can silently disagree"
// failure this codebase's own history keeps flagging — the same defect
// class as wideColumnSide's own (see SplitColumnPageShell.tsx's doc
// comment). Every page opting into the split-aligned overlay should pass
// this explicitly as its own navContentGapPx override rather than trust
// the shared default.
export const SPLIT_ALIGNED_NAV_CONTENT_GAP_PX = 32;
// 'surface': logoColor/navTextColor/navBorderColor are all derived from the
// pageSurfaceConfig prop via deriveSurfaceColor (helpers/
// surfaceColorDerivation.ts — the same primitive CtaButtonConfig's own auto
// colors use), each offset by its own *SurfaceOffset field below. 'column':
// logoColor derives from physicalLeftColumnColor and navTextColor/
// navBorderColor derive from physicalRightColumnColor (see
// SiteHeaderProps) via resolveContrastAwareTextColor (same file) —
// a WCAG-contrast-aware, hue-preserving search rather than a fixed offset,
// still biased by each element's own *SurfaceOffset field below and gated
// by columnTextMinContrast. Because logo and nav text/border resolve
// against the two different physical column colors even though they share
// one colorMode switch, 'column' mode doesn't reproduce 'surface' mode's
// own documented problem (see DEFAULT_SITE_HEADER_CONFIG's comment
// on why 'custom' was chosen over 'surface' for /abstract) of one shared
// derivation being wrong for whichever element doesn't actually sit on that
// surface. Sits alongside 'adaptive'/'custom' as a third/fourth value on
// the *same* switch (rather than three independent per-color modes like
// AbstractEditorialHero gets) since this header's logo/nav text/nav border
// have always moved together as one coupled set under colorMode.
export type SiteHeaderColorMode = 'adaptive' | 'custom' | 'surface' | 'column';
// Generic on purpose, same reasoning as PolymorphicLayoutContentContainerAlign
// (pages/posts-lab/postLab.config.ts) — 'where a content container sits
// within its own segment,' not tied to logo or nav specifically. A single
// component-agnostic value; SiteHeader.tsx maps it to the literal
// justify-content/align-items class its own flex-container mechanism needs.
export type SiteHeaderContentAlign = 'start' | 'center' | 'end';
// 'auto' (default): no width class at all — the content container shrink-
// wraps to its own content (the logo/nav's natural size), today's exact
// behavior. Any other value: the container is given `w-full` *and* this
// max-width cap together (see SiteHeader.tsx's own doc comment on
// why both are needed) — a max-width cap alone on a flex item that's
// already narrower than any reasonable percentage would silently do
// nothing at every value, since the item never grows past its own
// intrinsic size in the first place without `w-full` first. Not a copy of
// PolymorphicLayoutContentContainerAlign's own width field (narrowColumnContentWidthWide)
// for exactly this reason — that field's box is a block element (100%
// width by default already), this one's is a flex item (shrink-to-fit by
// default), so the same "just a percentage" shape would be inert here.
export type SiteHeaderContentWidth = TailwindTokenValue<'maxWidth'>;
export type SiteHeaderContentWidthWide = TailwindTokenValue<'maxWidth', 'md'>;
export type SiteHeaderContentWidthLg = TailwindTokenValue<'maxWidth', 'lg'>;
/** 'inherit' (default) follows GlobalTypographyConfig.headingFontFamily —
 * see components/GlobalTypography.config.ts. 'sans'/'serif' pin the nav/
 * logo font regardless of the site-wide default. */
export type SiteHeaderFontFamily = 'inherit' | 'sans' | 'serif';
/** The shared resolved Tailwind font-weight scale. The default remains
 * font-semibold (600), preserving the previous named-token choice. */
export type SiteHeaderNavFontWeight = TailwindTokenValue<'fontWeight'>;
export type SiteHeaderNavFontSize = TailwindTokenValue<'fontSize'>;
export type SiteHeaderNavFontSizeWide = TailwindTokenValue<'fontSize', 'md'>;
export type SiteHeaderNavFontSizeLg = TailwindTokenValue<'fontSize', 'lg'>;

export type SiteHeaderHeight = TailwindTokenValue<'height'>;
export type SiteHeaderHeightWide = TailwindTokenValue<'height', 'md'>;
export type SiteHeaderHeightLg = TailwindTokenValue<'height', 'lg'>;
export type SiteHeaderPaddingX = TailwindTokenValue<'paddingX'>;
export type SiteHeaderPaddingXWide = TailwindTokenValue<'paddingX', 'md'>;
export type SiteHeaderPaddingXLg = TailwindTokenValue<'paddingX', 'lg'>;
export type SiteHeaderPaddingY = TailwindTokenValue<'paddingY'>;
export type SiteHeaderPaddingYWide = TailwindTokenValue<'paddingY', 'md'>;
export type SiteHeaderPaddingYLg = TailwindTokenValue<'paddingY', 'lg'>;
export type SiteHeaderMarginTop = TailwindTokenValue<'marginTop'>;
export type SiteHeaderMarginTopWide = TailwindTokenValue<'marginTop', 'md'>;
export type SiteHeaderMarginTopLg = TailwindTokenValue<'marginTop', 'lg'>;
export type SiteHeaderMarginBottom = TailwindTokenValue<'marginBottom'>;
export type SiteHeaderMarginBottomWide = TailwindTokenValue<'marginBottom', 'md'>;
export type SiteHeaderMarginBottomLg = TailwindTokenValue<'marginBottom', 'lg'>;
export type SiteHeaderLogoWidth = TailwindTokenValue<'width'>;
export type SiteHeaderLogoWidthWide = TailwindTokenValue<'width', 'md'>;
export type SiteHeaderLogoWidthLg = TailwindTokenValue<'width', 'lg'>;
export type SiteHeaderGap = TailwindTokenValue<'gap'>;
export type SiteHeaderGapWide = TailwindTokenValue<'gap', 'md'>;
export type SiteHeaderGapLg = TailwindTokenValue<'gap', 'lg'>;
export type SiteHeaderNavGap = TailwindTokenValue<'gap'>;
export type SiteHeaderNavGapWide = TailwindTokenValue<'gap', 'md'>;
export type SiteHeaderNavGapLg = TailwindTokenValue<'gap', 'lg'>;
export type SiteHeaderMobileNavDistribution =
  | 'justify-start'
  | 'justify-center'
  | 'justify-between'
  | 'justify-around'
  | 'justify-evenly';
export type SiteHeaderMobileNavDivider = 'none' | 'pipe' | 'dot' | 'rule';
export type SiteHeaderMobileNavItemGap = TailwindTokenValue<'gapX'>;
export type SiteHeaderMobileNavDividerHeight = TailwindTokenValue<'height'>;
export type SiteHeaderMobileNavDividerWidth = TailwindTokenValue<'width'>;
export type AbstractHeroContactPaddingX = TailwindTokenValue<'paddingX'>;
export type AbstractHeroContactPaddingY = TailwindTokenValue<'paddingY'>;
export type AbstractHeroContactBorderWidth = TailwindTokenValue<'borderWidth'>;

export type SiteHeaderConfig = {
  colorMode: SiteHeaderColorMode;
  fontFamily: SiteHeaderFontFamily;
  navIntroEnabled: boolean;
  navIntroDelayMs: number;
  navIntroDurationMs: number;
  navIntroEasing: string;
  navIntroItemStaggerMs: number;
  /** Nav labels (About/Journal/Contact) only — never the logo, which is
   * vector artwork (see Logo.tsx), not text, and has no font properties at
   * all. Color is deliberately not part of this config — nav text color is
   * already fully owned by colorMode/*Color/*SurfaceOffset above and stays
   * inferred per-page exactly as it works today. */
  navUppercase: boolean;
  navLetterSpacingEm: number;
  navFontWeight: SiteHeaderNavFontWeight;
  navFontSize: SiteHeaderNavFontSize;
  navFontSizeWide: SiteHeaderNavFontSizeWide;
  navFontSizeLg: SiteHeaderNavFontSizeLg;
  // logoColor/logoSurfaceOffset: legacy-only now. The logo's own color/
  // adaptive config lives on the shared WordmarkConfig scope (config/
  // wordmark.ts) — see that file's own doc comment for the parity bug this
  // split fixed. These two fields still exist here, and SiteHeader.tsx
  // still reads them, ONLY as the fallback a caller that doesn't supply the
  // new `wordmarkConfig` prop gets (pages/contact.tsx, pages/posts/[slug]
  // .tsx — both out of scope for the Wordmark consolidation), so their
  // pre-existing logo behavior stays byte-identical. Not exposed on this
  // scope's own panel.ts anymore; a page that HAS migrated to
  // `wordmarkConfig` never reads these two at all.
  logoColor: string;
  navTextColor: string;
  navBorderColor: string;
  /** Opt-in (default off), independent of colorMode above — mirrors
   * AbstractEditorialHero's own paragraphUsesWordmarkGradient (that field's
   * own doc comment, AbstractEditorialHero.config.ts). When on and a page
   * supplies wordmarkGradientStops (SiteHeaderProps), the nav labels (About/
   * Journal/Contact) render through that exact same gradient — the one the
   * wordmark/paragraph already use, not a re-derived approximation — as one
   * continuous CSS background-clip:text fill per label, overriding
   * colorMode/navTextColor/navTextSurfaceOffset/columnTextMinContrast
   * entirely for the nav text color (navBorderColor is untouched — this only
   * ever targets the label glyphs, never the Contact pill's border). Inert
   * (falls back to colorMode's existing resolution) whenever the page hasn't
   * opted in, or hasn't supplied wordmarkGradientStops, or the active tier's
   * scroll-gradient/wordmark-gradient source is off — byte-identical to
   * today for every caller not opting in. */
  navTextUsesWordmarkGradient: boolean;
  // Meaningful while colorMode is 'surface' or 'column' — see that type's
  // own doc comment. The base color each offsets differs by mode (the flat
  // page surface vs. this element's own physical column color) but the
  // offset math is identical either way. Independent per property, like
  // CtaButtonConfig's own auto*LightenAmount fields, so e.g. the border can
  // sit closer to the surface than the nav text does.
  logoSurfaceOffset: number;
  navTextSurfaceOffset: number;
  navBorderSurfaceOffset: number;
  // Only meaningful while colorMode is 'column'. Minimum WCAG contrast
  // ratio resolveContrastAwareTextColor must clear against each element's
  // own physical column color — shared across nav text/nav border, same
  // coupling precedent as colorMode itself. Nav-only now (see logoColor's
  // own doc comment above); the logo has its own independent copy,
  // WordmarkConfig.columnTextMinContrast. Same 1-21 range/semantics as
  // CtaButtonConfig.autoTextMinContrast.
  columnTextMinContrast: number;
  height: SiteHeaderHeight;
  heightWide: SiteHeaderHeightWide;
  heightLg: SiteHeaderHeightLg;
  paddingX: SiteHeaderPaddingX;
  paddingY: SiteHeaderPaddingY;
  paddingXWide: SiteHeaderPaddingXWide;
  paddingYWide: SiteHeaderPaddingYWide;
  paddingXLg: SiteHeaderPaddingXLg;
  paddingYLg: SiteHeaderPaddingYLg;
  marginTop: SiteHeaderMarginTop;
  marginBottom: SiteHeaderMarginBottom;
  marginTopWide: SiteHeaderMarginTopWide;
  marginBottomWide: SiteHeaderMarginBottomWide;
  marginTopLg: SiteHeaderMarginTopLg;
  marginBottomLg: SiteHeaderMarginBottomLg;
  logoWidth: SiteHeaderLogoWidth;
  logoWidthWide: SiteHeaderLogoWidthWide;
  logoWidthLg: SiteHeaderLogoWidthLg;
  gap: SiteHeaderGap;
  gapWide: SiteHeaderGapWide;
  gapLg: SiteHeaderGapLg;
  navGap: SiteHeaderNavGap;
  navGapWide: SiteHeaderNavGapWide;
  navGapLg: SiteHeaderNavGapLg;
  /** Off (default): mobile nav keeps the legacy three-column grid. On:
   * mobile nav switches to a full-width flex row, enabling the distribution
   * and divider controls below. Desktop keeps the existing md:flex layout. */
  mobileNavFlexEnabled: boolean;
  /** Gap between mobile nav items/dividers while mobileNavFlexEnabled is
   * on. Separate from the legacy navGap so the flex/divider layout
   * can be tuned without changing the fallback grid. */
  mobileNavItemGap: SiteHeaderMobileNavItemGap;
  /** While mobileNavFlexEnabled is on, controls how the mobile nav items
   * distribute across the row's available width. */
  mobileNavDistribution: SiteHeaderMobileNavDistribution;
  /** While mobileNavFlexEnabled is on, each mobile nav item consumes an
   * equal share of the row. Useful when the right segment should read as
   * three evenly weighted destinations instead of three intrinsic labels. */
  mobileNavEqualItemWidth: boolean;
  /** Mobile-only divider between primary nav items. Inherits the resolved
   * nav text color/wordmark gradient and renders at 50% opacity. */
  mobileNavDivider: SiteHeaderMobileNavDivider;
  /** Height of the custom mobile divider rule. */
  mobileNavDividerHeight: SiteHeaderMobileNavDividerHeight;
  /** Width of the custom mobile divider rule. */
  mobileNavDividerWidth: SiteHeaderMobileNavDividerWidth;
  contactPaddingX: AbstractHeroContactPaddingX;
  contactPaddingY: AbstractHeroContactPaddingY;
  contactBorderWidth: AbstractHeroContactBorderWidth;
  navBandEnabled: boolean;
  navBandSourceRow: number;
  navBandScale: number;
  navBandPanXPercent: number;
  navBandPanYPercent: number;
  navBandOpacity: number;
  navBandChromaDuck: number;
  navBandSaturation: number;
  navBandBrightness: number;
  /** Opt-in, decorative 38/62 split background behind the whole header —
   * only ever rendered when a page also supplies splitBandLeftColor/
   * splitBandRightColor (see SiteHeaderProps); today that's only
   * pages/about.tsx, so this is structurally inert everywhere else
   * regardless of this flag. */
  splitBandEnabled: boolean;
  /** Which physical side gets the wider (62%) band. 'right' (default):
   * narrow-left/wide-right, matching /about's arrangement and the band's
   * historical single hardcoded direction. 'left': wide-left/narrow-right,
   * for pages (e.g. /abstract's SplitColumnLayout usage) that reverse which
   * side holds the wider column — mirrors SplitColumnLayout's own
   * wideColumnSide so the header band and the body grid beneath it never
   * fall out of sync. Both resolve to literal Tailwind classes, never an
   * interpolated one. */
  splitBandSide: 'left' | 'right';
  /** Off (default): nav renders exactly as it always has, inside the
   * padded PageContainer row, pushed to the far side via justify-between —
   * every page using this header keeps today's behavior unchanged. On: nav
   * moves out of that padded row into its own overlay sharing the split
   * band's own unpadded 38/62 grid (see `SPLIT_BAND_GRID_COLS_BY_SIDE` in
   * SiteHeader.tsx), landing exactly at the true split boundary —
   * not a percentage computed inside PageContainer's own padding, which
   * would land at a different x than the body's real split — with a
   * vertical separator line before the first item and the Contact link
   * de-chromed to a plain nav item. Opt-in per page (e.g. /about's own
   * siteHeaderConfig), never a shared default change. */
  navAlignedToSplitEnabled: boolean;
  /** On (default): Contact renders identically to About/Journal — plain,
   * no bordered pill — at every breakpoint, on the always-mobile-visible
   * default nav row and on the split-aligned desktop overlay alike (that
   * overlay already de-chromes Contact to a plain nav item regardless of
   * this flag — see navAlignedToSplitEnabled's own doc comment — so this
   * field's own effect is really only visible below md). Off: Contact
   * renders as a bordered pill on the mobile-visible row instead — an
   * explicit opt-in for a page that genuinely wants that treatment, not a
   * fallback. Was `false`-by-default until every real page in this
   * codebase (about/contact/posts-lab) ended up independently setting it
   * `true` to get the plain treatment, leaving only pages/abstract.tsx's
   * own *omission* of this field as the one page that still showed the
   * pill — not a deliberate choice, just a missed override (caught via a
   * live cross-page screenshot comparison). Flipping the default here
   * once, rather than requiring every consuming page to keep repeating
   * the same override, is what actually closes that gap for good — a new
   * page gets the shared, correct nav treatment automatically now, with
   * nothing to remember to opt out of. */
  mobileContactPlain: boolean;
  /** On (default): the separator line is visible. Off: it renders
   * transparent rather than being removed from the DOM — it still occupies
   * its own 1px flex slot either way, so navContentGapPx's gap (a flexbox
   * `gap`, which only has an effect *between* children) still reserves the
   * same space on both sides and toggling this can't shift the logo or the
   * first nav item. */
  navSeparatorVisible: boolean;
  /** Separator line color — dim, near-white gray by design intent (a
   * subtle divider, not a visible rule). */
  navSeparatorColor: string;
  /** Separator height = the logo's own live-measured rendered height
   * (`getBoundingClientRect().height` on mount/resize, never a guessed
   * constant, since it changes with `logoWidth`/`logoWidthWide` and the
   * wordmark's own aspect ratio) times this multiplier. Default 2 —
   * "twice the height of the main logo" per the original design request —
   * but independently configurable per that same request. */
  navSeparatorHeightMultiplier: number;
  /** Gap between the separator line and the first nav item — set to match
   * the wide column's own real left content inset (empirically measured
   * against /about's current AbstractPostDock layout at the time this was
   * added: 32px) so the first nav item's left edge lines up with the body
   * text starting beneath it. A plain configurable pixel value, not a
   * live cross-component measurement — see SiteHeader.tsx's own
   * doc comment on this field's rendering for the honest limitation: if
   * the wide column's own content padding changes later, this needs
   * re-syncing by hand, it does not auto-follow. */
  navContentGapPx: number;
  /** Only meaningful when navAlignedToSplitEnabled is on. Which box the
   * split-ratio grid (`SPLIT_BAND_GRID_COLS_BY_SIDE`) is computed against.
   * false (default): the header's own full, unpadded width — correct for a
   * page whose body split is itself full-bleed/edge-to-edge (no
   * PageContainer wrapping it — /about's SplitColumnPageShell usage,
   * contentContainer: 'full-bleed'). true: the *same* PageContainer box
   * the header's own logo/nav already sit inside — correct for a page
   * whose body split is wrapped in an identically-configured PageContainer
   * (SplitColumnPageShell's contentContainer: 'bounded', e.g. /abstract),
   * since in that case the body's real split boundary is a percentage of
   * that narrower, padded, max-width-capped box, not the full header
   * width. Getting this wrong doesn't error — it just silently lands nav
   * at the wrong x, which is exactly the failure mode this field exists
   * to prevent rather than leaving to be rediscovered per page. */
  navAlignedToPageContainer: boolean;
  /** Only meaningful when navAlignedToSplitEnabled is on. Off (default):
   * the logo stays in its usual far-left slot, unaffected by any of this —
   * every page keeps today's logo position regardless of this whole
   * feature. On: the logo moves out of that slot (hidden there from `md`
   * upward; still shown on mobile, where the split-aligned nav overlay
   * itself doesn't apply) and renders immediately to the left of the
   * separator line instead, using `navContentGapPx` — the *same* gap
   * already used on the separator's other side (between the separator and
   * the first nav item) — so the divider sits at equal distance from the
   * logo and from the first nav item, not a visually different gap on
   * each side. (An earlier version reused `gap`/`gapWide` instead,
   * reasoning it was "already used between logo and nav elsewhere" — but
   * that produced two different-looking gaps flanking the same divider,
   * which is a real, reported defect, not a valid reading of "the same
   * spacing.") The separator/nav items' own position is unaffected
   * either way: the moved logo is positioned via `right: 100%` against
   * the nav row's own left edge (see SiteHeader.tsx), not by
   * shifting that row's own flow, so it never changes where the split
   * boundary itself lands. */
  logoAlignedToSplitEnabled: boolean;
  /** Only meaningful when logoAlignedToSplitEnabled is also on. True
   * (default): reproduces every page's own existing behavior exactly — the
   * navContentGapPx gap above is applied as literal inline `padding-right`
   * on the header's own left content box (SiteHeader.tsx's
   * 'HEADER · LEFT CONTENT' div). False: that inline padding is omitted
   * entirely, leaving this box's real padding-right fully owned by
   * whatever literal Tailwind classes the page supplies instead (see
   * headerLeftContentClassName below) — for a page whose own layout config
   * (e.g. posts-lab's own headerLeftContentPaddingRight/-RightWide fields)
   * already controls this exact edge, the inline style would otherwise
   * silently win over those classes every time (inline styles always beat
   * class-based rules regardless of specificity), making that page's own
   * padding-right fields look broken/inert even though they're correctly
   * wired — confirmed as the exact cause of that symptom on posts-lab
   * before this field existed. Only posts-lab turns this off today; every
   * other page keeps the default. */
  logoContentGapPaddingEnabled: boolean;
  /** Only meaningful when navAlignedToSplitEnabled AND
   * logoAlignedToSplitEnabled are both on (today's default, and the only
   * configuration every real page currently uses). Where the logo sits
   * within the header's own left split segment (the same segment
   * LayoutDebugOverlay's 'HEADER · LEFT' box visualizes) — 'end'
   * reproduces today's de-facto position, snug against the separator/nav.
   * Unlike navSplitOverlay's split-ratio grid itself, this never changes
   * where that grid's own seam lands — only where the logo sits within
   * its own cell, exactly like *ColumnContentAlign positions a content
   * container within its column elsewhere in this codebase. Implemented
   * as `justify-content` on this cell's own flex container (the cell
   * itself stretches to fill the full grid column, same mechanism as
   * headerRightContentAlign below — see SiteHeader.tsx's own doc
   * comment on why both cells share one mechanism now). */
  headerLeftContentAlign: SiteHeaderContentAlign;
  headerLeftContentAlignWide: SiteHeaderContentAlign;
  headerLeftContentAlignLg: SiteHeaderContentAlign;
  /** Same as headerLeftContentAlign, vertical axis. 'center' reproduces
   * today's de-facto position. */
  headerLeftContentVerticalAlign: SiteHeaderContentAlign;
  headerLeftContentVerticalAlignWide: SiteHeaderContentAlign;
  headerLeftContentVerticalAlignLg: SiteHeaderContentAlign;
  /** Where the nav content sits within the header's own right split
   * segment (the same segment LayoutDebugOverlay's 'HEADER · RIGHT' box
   * visualizes) — 'start' reproduces today's de-facto position (nav items
   * begin immediately after the separator, not stretched to the header's
   * far right edge). Implemented as `justify-content` on the <nav> element
   * itself, which is already a flex row container for its own <ul>. */
  headerRightContentAlign: SiteHeaderContentAlign;
  headerRightContentAlignWide: SiteHeaderContentAlign;
  headerRightContentAlignLg: SiteHeaderContentAlign;
  /** Same as headerRightContentAlign, vertical axis (`align-items` on
   * <nav>). 'center' reproduces today's de-facto position (previously a
   * hardcoded items-center with no field). */
  headerRightContentVerticalAlign: SiteHeaderContentAlign;
  headerRightContentVerticalAlignWide: SiteHeaderContentAlign;
  headerRightContentVerticalAlignLg: SiteHeaderContentAlign;
  /** Width of the logo content container as a percentage of the header's
   * own left split segment (the same segment LayoutDebugOverlay's
   * 'HEADER · LEFT' box visualizes) — a literal class from
   * CONTENT_WIDTH_PERCENT_WIDE_OPTIONS (components/tailwindWidthScale.ts),
   * or 'auto' (default) to keep today's shrink-to-fit behavior exactly —
   * see SiteHeaderContentWidth's own doc comment for why 'auto'
   * exists here and not on the body's equivalent field. Only visible to
   * meaningfully change anything once combined with a non-default
   * headerLeftContentAlign — a wide box that's still left/start-aligned
   * looks identical to a shrink-wrapped one. */
  headerLeftContentWidth: SiteHeaderContentWidth;
  headerLeftContentWidthWide: SiteHeaderContentWidthWide;
  headerLeftContentWidthLg: SiteHeaderContentWidthLg;
  /** Same as headerLeftContentWidthWide, applied to the nav content
   * container within the header's own right split segment instead. */
  headerRightContentWidth: SiteHeaderContentWidth;
  headerRightContentWidthWide: SiteHeaderContentWidthWide;
  headerRightContentWidthLg: SiteHeaderContentWidthLg;
  /** Where the logo sits *within* the header's own left content box (the
   * same box LayoutDebugOverlay's 'HEADER · LEFT CONTENT' visualizes) —
   * distinct from headerLeftContentAlign above, which positions that whole
   * box within the header's own left split segment one level up. Only
   * visibly does anything once the content box is wider than the logo
   * itself (headerLeftContentWidthWide set to something other than 'auto',
   * or the box's own min-width otherwise exceeds the logo's natural size)
   * — a box exactly as wide as its content has no slack for this to move
   * within. Implemented as `justify-content` on this box (which becomes a
   * flex container to support it), not `text-align` — the logo renders as
   * a `display: flex` block-level box, which text-align has no effect on;
   * see SiteHeader.tsx's own doc comment on this field for the
   * confirmed reasoning. 'start' (default) reproduces today's flush-left
   * behavior exactly. */
  headerLeftContentInnerAlign: SiteHeaderContentAlign;
  headerLeftContentInnerAlignWide: SiteHeaderContentAlign;
  headerLeftContentInnerAlignLg: SiteHeaderContentAlign;
  /** Same as headerLeftContentInnerAlignWide, applied to the nav content
   * box ('HEADER · RIGHT CONTENT') instead — that box is already a flex
   * container today (nav's own separator + <ul> already lay out inside
   * it), so this only adds the missing justify-content control, no new
   * flex conversion needed there. */
  headerRightContentInnerAlign: SiteHeaderContentAlign;
  headerRightContentInnerAlignWide: SiteHeaderContentAlign;
  headerRightContentInnerAlignLg: SiteHeaderContentAlign;
  /** Raw literal Tailwind classes (space-separated, e.g. 'pt-2 md:pt-4
   * mb-6'), appended verbatim to the header's own left content box
   * (SiteHeader.tsx's 'HEADER · LEFT CONTENT' div) — a passthrough,
   * not a validated token, since the actual padding/margin scale
   * validation already happens one layer up, on the per-direction/per-
   * breakpoint fields (PostLabPageLayoutConfig's own
   * headerLeftContentPadding-/Margin-prefixed fields in postLab.config.ts)
   * that get joined into this single string at the page's own effectiveSiteHeaderConfig
   * call site. Kept as a plain string here rather than duplicating those
   * ~16 literal-scale fields a second time on this shared, cross-page
   * config, mirroring why headerLeftContentAlign/-WidthWide above are
   * edited from postLab's own panel instead of this component's (see
   * HEADER_LAYOUT_KEYS_OWNED_ELSEWHERE in SiteHeader.panel.ts).
   * '' (default) is a no-op — no classes appended. */
  headerLeftContentClassName: string;
  /** Same as headerLeftContentClassName, applied to the header's own right
   * content box ('HEADER · RIGHT CONTENT' div) instead. */
  headerRightContentClassName: string;
  /** Off (default): headerLeftContentAlign/-VerticalAlign/-WidthWide/
   * -InnerAlignWide (and their Right equivalents) above are the real,
   * effective source of the segment/content-box alignment and width
   * classes, exactly as documented on each field. On: this component stops
   * applying any of those four fields' own classes entirely (on both the
   * outer segment div and the inner content box, both sides) — the page
   * supplying headerLeftSegmentClassName/headerRightSegmentClassName below,
   * plus its own literal classes folded into headerLeftContentClassName/
   * headerRightContentClassName above, becomes the *only* source of that
   * alignment/width. Same precedent as logoContentGapPaddingEnabled: a page
   * whose own per-breakpoint config (e.g. posts-lab's own Posts lab page
   * layout panel) fully owns a dimension needs the shared component to get
   * out of the way entirely, not just supply a default that a passthrough
   * class then has to out-fight via cascade order. Only posts-lab turns
   * this on today; every other page keeps the default. */
  headerContentLayoutOwnedByPage: boolean;
  /** Raw literal Tailwind classes (space-separated), appended verbatim to
   * the header's own left *segment* div (the outer box
   * LayoutDebugOverlay's 'HEADER · LEFT' visualizes — one level up from
   * headerLeftContentClassName's own 'HEADER · LEFT CONTENT' box). Only
   * meaningful alongside headerContentLayoutOwnedByPage: true — see that
   * field's own doc comment. '' (default) is a no-op. */
  headerLeftSegmentClassName: string;
  /** Same as headerLeftSegmentClassName, applied to the header's own right
   * segment (the `<nav>` element LayoutDebugOverlay's 'HEADER · RIGHT'
   * visualizes) instead. */
  headerRightSegmentClassName: string;
};

export const DEFAULT_SITE_HEADER_CONFIG = {
  colorMode: 'column',
  fontFamily: 'serif',
  navIntroEnabled: true,
  navIntroDelayMs: 220,
  navIntroDurationMs: 430,
  navIntroEasing: 'linear',
  navIntroItemStaggerMs: 0,
  navUppercase: true,
  navLetterSpacingEm: 0.14,
  navFontWeight: 'font-normal',
  navFontSize: 'text-3xs',
  navFontSizeWide: 'md:text-xs',
  navFontSizeLg: 'lg:text-xs',
  logoColor: '#f5f5f5',
  navTextColor: '#787878',
  navBorderColor: '#787878',
  navTextUsesWordmarkGradient: true,
  logoSurfaceOffset: 0.36,
  navTextSurfaceOffset: 0.26,
  navBorderSurfaceOffset: 0,
  columnTextMinContrast: 14.3,
  height: 'h-auto',
  heightWide: 'md:h-28',
  heightLg: 'lg:h-28',
  paddingX: 'px-8',
  paddingY: 'py-0',
  paddingXWide: 'md:px-20',
  paddingYWide: 'md:py-2',
  paddingXLg: 'lg:px-12',
  paddingYLg: 'lg:py-2',
  marginTop: 'mt-0',
  marginBottom: 'mb-0',
  marginTopWide: 'md:mt-8',
  marginBottomWide: 'md:mb-0',
  marginTopLg: 'lg:mt-8',
  marginBottomLg: 'lg:mb-0',
  logoWidth: 'w-56',
  logoWidthWide: 'md:w-80',
  logoWidthLg: 'lg:w-80',
  gap: 'gap-1',
  gapWide: 'md:gap-6',
  gapLg: 'lg:gap-6',
  navGap: 'gap-3',
  navGapWide: 'md:gap-8',
  navGapLg: 'lg:gap-8',
  mobileNavFlexEnabled: true,
  mobileNavItemGap: 'gap-x-4',
  mobileNavDistribution: 'justify-start',
  mobileNavEqualItemWidth: true,
  mobileNavDivider: 'dot',
  mobileNavDividerHeight: 'h-2',
  mobileNavDividerWidth: 'w-px',
  contactPaddingX: 'px-5',
  contactPaddingY: 'py-2.5',
  contactBorderWidth: 'border',
  navBandEnabled: false,
  navBandSourceRow: 1,
  navBandScale: 1,
  navBandPanXPercent: 50,
  navBandPanYPercent: 50,
  navBandOpacity: 1,
  navBandChromaDuck: 0.16,
  navBandSaturation: 1.36,
  navBandBrightness: 0.76,
  splitBandEnabled: true,
  splitBandSide: 'right',
  navAlignedToSplitEnabled: false,
  mobileContactPlain: true,
  navSeparatorVisible: false,
  navSeparatorColor: '#b5b5b5',
  navSeparatorHeightMultiplier: 1,
  navContentGapPx: 8,
  navAlignedToPageContainer: false,
  logoAlignedToSplitEnabled: true,
  logoContentGapPaddingEnabled: true,
  // 'end', not 'start': reproduces the logo's previous position exactly —
  // it used to be positioned via `right: 100%` against nav's own left edge
  // (i.e. snug against the separator, at the seam), not flush at the far
  // left of its own cell. See SiteHeader.tsx's own doc comment on
  // this cell's conditional paddingRight for how the exact navContentGapPx
  // gap that used to sit between logo and separator is preserved too.
  headerLeftContentAlign: 'center',
  headerLeftContentAlignWide: 'end',
  headerLeftContentAlignLg: 'end',
  headerLeftContentVerticalAlign: 'center',
  headerLeftContentVerticalAlignWide: 'center',
  headerLeftContentVerticalAlignLg: 'center',
  headerRightContentAlign: 'center',
  headerRightContentAlignWide: 'start',
  headerRightContentAlignLg: 'start',
  headerRightContentVerticalAlign: 'center',
  headerRightContentVerticalAlignWide: 'center',
  headerRightContentVerticalAlignLg: 'center',
  headerLeftContentWidth: 'auto',
  headerLeftContentWidthWide: 'auto',
  headerLeftContentWidthLg: 'auto',
  headerRightContentWidth: 'auto',
  headerRightContentWidthWide: 'auto',
  headerRightContentWidthLg: 'auto',
  headerLeftContentInnerAlign: 'start',
  headerLeftContentInnerAlignWide: 'start',
  headerLeftContentInnerAlignLg: 'start',
  headerRightContentInnerAlign: 'start',
  headerRightContentInnerAlignWide: 'start',
  headerRightContentInnerAlignLg: 'start',
  headerLeftContentClassName: '',
  headerRightContentClassName: '',
  headerContentLayoutOwnedByPage: false,
  headerLeftSegmentClassName: '',
  headerRightSegmentClassName: '',
} satisfies SiteHeaderConfig;

const clampRange = (value: number, min: number, max: number, fallback: number) => (
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback))
);

const normalizeColor = (value: string, fallback: string) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
};

const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);

const MOBILE_NAV_DISTRIBUTIONS: ReadonlyArray<SiteHeaderMobileNavDistribution> = [
  'justify-start', 'justify-center', 'justify-between', 'justify-around', 'justify-evenly',
];
const MOBILE_NAV_DIVIDERS: ReadonlyArray<SiteHeaderMobileNavDivider> = [
  'none', 'pipe', 'dot', 'rule',
];
const SPLIT_BAND_SIDES: ReadonlyArray<'left' | 'right'> = ['left', 'right'];
const COLOR_MODES: ReadonlyArray<SiteHeaderColorMode> = [
  'adaptive', 'custom', 'surface', 'column',
];
const CONTENT_ALIGN_VALUES: ReadonlyArray<SiteHeaderContentAlign> = ['start', 'center', 'end'];
const FONT_FAMILIES: ReadonlyArray<SiteHeaderFontFamily> = ['inherit', 'sans', 'serif'];

/** Read bridge for configurations saved before the base/Wide/Lg rename.
 * Remove after all persisted SiteHeader values have been rewritten by the
 * config update path and the old keys no longer appear in stored data. */
function migrateLegacySiteHeaderConfig(config: Partial<SiteHeaderConfig> | undefined): Partial<SiteHeaderConfig> {
  if (!config) return {};
  const raw = config as Record<string, unknown>;
  const migrated: Record<string, unknown> = { ...raw };
  const renamed: Record<string, string> = {
    desktopHeight: 'heightWide', desktopPaddingX: 'paddingXWide', desktopPaddingY: 'paddingYWide',
    desktopMarginTop: 'marginTopWide', desktopMarginBottom: 'marginBottomWide',
    desktopLogoWidth: 'logoWidthWide', desktopGap: 'gapWide',
    navFontSizeNarrow: 'navFontSize', navFontSizeDesktop: 'navFontSizeWide',
  };
  for (const [oldKey, newKey] of Object.entries(renamed)) {
    if (migrated[newKey] === undefined && raw[oldKey] !== undefined) migrated[newKey] = raw[oldKey];
  }
  if (raw.mobileNavGap !== undefined) {
    if (migrated.navGapWide === undefined) migrated.navGapWide = raw.navGap;
    migrated.navGap = raw.mobileNavGap;
  } else if (typeof raw.navGap === 'string' && raw.navGap.startsWith('md:') && migrated.navGapWide === undefined) {
    migrated.navGapWide = raw.navGap;
    migrated.navGap = undefined;
  }
  if (raw.mobileNavDivider === 'hidden') migrated.mobileNavDivider = 'none';
  if (raw.mobileNavDivider === "before:content-['|']") migrated.mobileNavDivider = 'pipe';
  if (raw.mobileNavDivider === "before:content-['⋅']") migrated.mobileNavDivider = 'dot';
  if (raw.mobileNavDivider === 'border-l') migrated.mobileNavDivider = 'rule';
  const responsive = [
    ['height', 'height'], ['paddingX', 'paddingX'], ['paddingY', 'paddingY'],
    ['marginTop', 'marginTop'], ['marginBottom', 'marginBottom'],
    ['logoWidth', 'width'], ['gap', 'gap'], ['navFontSize', 'fontSize'], ['navGap', 'gap'],
  ] as const;
  const defaults = DEFAULT_SITE_HEADER_CONFIG as unknown as Record<string, string>;
  for (const [key, utility] of responsive) {
    const wideKey = `${key}Wide`;
    const lgKey = `${key}Lg`;
    if (migrated[lgKey] !== undefined || migrated[wideKey] === undefined) continue;
    const wide = normalizeTailwindToken({
      utility, breakpoint: 'md', value: migrated[wideKey],
      fallback: defaults[wideKey] as TailwindTokenValue<typeof utility, 'md'>,
    });
    migrated[lgKey] = translateTailwindTokenBreakpoint(utility, 'md', 'lg', wide, defaults[lgKey] as TailwindTokenValue<typeof utility, 'lg'>);
  }
  return migrated as Partial<SiteHeaderConfig>;
}

export function normalizeSiteHeaderConfig(
  config: Partial<SiteHeaderConfig> | undefined,
): SiteHeaderConfig {
  const base = { ...DEFAULT_SITE_HEADER_CONFIG, ...migrateLegacySiteHeaderConfig(config) };
  return {
    colorMode: token(base.colorMode, COLOR_MODES, DEFAULT_SITE_HEADER_CONFIG.colorMode),
    fontFamily: token(base.fontFamily, FONT_FAMILIES, DEFAULT_SITE_HEADER_CONFIG.fontFamily),
    navIntroEnabled: base.navIntroEnabled === true,
    navIntroDelayMs: clampRange(base.navIntroDelayMs, 0, 2000, DEFAULT_SITE_HEADER_CONFIG.navIntroDelayMs),
    navIntroDurationMs: clampRange(base.navIntroDurationMs, 0, 2000, DEFAULT_SITE_HEADER_CONFIG.navIntroDurationMs),
    navIntroEasing: typeof base.navIntroEasing === 'string' && base.navIntroEasing.trim()
      ? base.navIntroEasing.trim() : DEFAULT_SITE_HEADER_CONFIG.navIntroEasing,
    navIntroItemStaggerMs: clampRange(base.navIntroItemStaggerMs, 0, 250, DEFAULT_SITE_HEADER_CONFIG.navIntroItemStaggerMs),
    navUppercase: base.navUppercase !== false,
    navLetterSpacingEm: clampRange(
      base.navLetterSpacingEm, 0, 0.3, DEFAULT_SITE_HEADER_CONFIG.navLetterSpacingEm,
    ),
    navFontWeight: normalizeTailwindToken({ utility: 'fontWeight', breakpoint: 'base', value: base.navFontWeight, fallback: DEFAULT_SITE_HEADER_CONFIG.navFontWeight }),
    navFontSize: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'base', value: base.navFontSize, fallback: DEFAULT_SITE_HEADER_CONFIG.navFontSize }),
    navFontSizeWide: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'md', value: base.navFontSizeWide, fallback: DEFAULT_SITE_HEADER_CONFIG.navFontSizeWide }),
    navFontSizeLg: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'lg', value: base.navFontSizeLg, fallback: DEFAULT_SITE_HEADER_CONFIG.navFontSizeLg }),
    logoColor: normalizeColor(base.logoColor, DEFAULT_SITE_HEADER_CONFIG.logoColor),
    navTextColor: normalizeColor(
      base.navTextColor,
      DEFAULT_SITE_HEADER_CONFIG.navTextColor,
    ),
    navBorderColor: normalizeColor(
      base.navBorderColor,
      DEFAULT_SITE_HEADER_CONFIG.navBorderColor,
    ),
    navTextUsesWordmarkGradient: base.navTextUsesWordmarkGradient === true,
    logoSurfaceOffset: clampRange(
      base.logoSurfaceOffset, -1, 1, DEFAULT_SITE_HEADER_CONFIG.logoSurfaceOffset,
    ),
    navTextSurfaceOffset: clampRange(
      base.navTextSurfaceOffset, -1, 1, DEFAULT_SITE_HEADER_CONFIG.navTextSurfaceOffset,
    ),
    navBorderSurfaceOffset: clampRange(
      base.navBorderSurfaceOffset,
      -1,
      1,
      DEFAULT_SITE_HEADER_CONFIG.navBorderSurfaceOffset,
    ),
    columnTextMinContrast: clampRange(
      base.columnTextMinContrast,
      1,
      21,
      DEFAULT_SITE_HEADER_CONFIG.columnTextMinContrast,
    ),
    height: normalizeTailwindToken({ utility: 'height', breakpoint: 'base', value: base.height, fallback: DEFAULT_SITE_HEADER_CONFIG.height }),
    heightWide: normalizeTailwindToken({ utility: 'height', breakpoint: 'md', value: base.heightWide, fallback: DEFAULT_SITE_HEADER_CONFIG.heightWide }),
    heightLg: normalizeTailwindToken({ utility: 'height', breakpoint: 'lg', value: base.heightLg, fallback: DEFAULT_SITE_HEADER_CONFIG.heightLg }),
    paddingX: normalizeTailwindToken({ utility: 'paddingX', breakpoint: 'base', value: base.paddingX, fallback: DEFAULT_SITE_HEADER_CONFIG.paddingX }),
    paddingXWide: normalizeTailwindToken({ utility: 'paddingX', breakpoint: 'md', value: base.paddingXWide, fallback: DEFAULT_SITE_HEADER_CONFIG.paddingXWide }),
    paddingXLg: normalizeTailwindToken({ utility: 'paddingX', breakpoint: 'lg', value: base.paddingXLg, fallback: DEFAULT_SITE_HEADER_CONFIG.paddingXLg }),
    paddingY: normalizeTailwindToken({ utility: 'paddingY', breakpoint: 'base', value: base.paddingY, fallback: DEFAULT_SITE_HEADER_CONFIG.paddingY }),
    paddingYWide: normalizeTailwindToken({ utility: 'paddingY', breakpoint: 'md', value: base.paddingYWide, fallback: DEFAULT_SITE_HEADER_CONFIG.paddingYWide }),
    paddingYLg: normalizeTailwindToken({ utility: 'paddingY', breakpoint: 'lg', value: base.paddingYLg, fallback: DEFAULT_SITE_HEADER_CONFIG.paddingYLg }),
    marginTop: normalizeTailwindToken({ utility: 'marginTop', breakpoint: 'base', value: base.marginTop, fallback: DEFAULT_SITE_HEADER_CONFIG.marginTop }),
    marginTopWide: normalizeTailwindToken({ utility: 'marginTop', breakpoint: 'md', value: base.marginTopWide, fallback: DEFAULT_SITE_HEADER_CONFIG.marginTopWide }),
    marginTopLg: normalizeTailwindToken({ utility: 'marginTop', breakpoint: 'lg', value: base.marginTopLg, fallback: DEFAULT_SITE_HEADER_CONFIG.marginTopLg }),
    marginBottom: normalizeTailwindToken({ utility: 'marginBottom', breakpoint: 'base', value: base.marginBottom, fallback: DEFAULT_SITE_HEADER_CONFIG.marginBottom }),
    marginBottomWide: normalizeTailwindToken({ utility: 'marginBottom', breakpoint: 'md', value: base.marginBottomWide, fallback: DEFAULT_SITE_HEADER_CONFIG.marginBottomWide }),
    marginBottomLg: normalizeTailwindToken({ utility: 'marginBottom', breakpoint: 'lg', value: base.marginBottomLg, fallback: DEFAULT_SITE_HEADER_CONFIG.marginBottomLg }),
    logoWidth: normalizeTailwindToken({ utility: 'width', breakpoint: 'base', value: base.logoWidth, fallback: DEFAULT_SITE_HEADER_CONFIG.logoWidth }),
    logoWidthWide: normalizeTailwindToken({ utility: 'width', breakpoint: 'md', value: base.logoWidthWide, fallback: DEFAULT_SITE_HEADER_CONFIG.logoWidthWide }),
    logoWidthLg: normalizeTailwindToken({ utility: 'width', breakpoint: 'lg', value: base.logoWidthLg, fallback: DEFAULT_SITE_HEADER_CONFIG.logoWidthLg }),
    gap: normalizeTailwindToken({ utility: 'gap', breakpoint: 'base', value: base.gap, fallback: DEFAULT_SITE_HEADER_CONFIG.gap }),
    gapWide: normalizeTailwindToken({ utility: 'gap', breakpoint: 'md', value: base.gapWide, fallback: DEFAULT_SITE_HEADER_CONFIG.gapWide }),
    gapLg: normalizeTailwindToken({ utility: 'gap', breakpoint: 'lg', value: base.gapLg, fallback: DEFAULT_SITE_HEADER_CONFIG.gapLg }),
    navGap: normalizeTailwindToken({ utility: 'gap', breakpoint: 'base', value: base.navGap, fallback: DEFAULT_SITE_HEADER_CONFIG.navGap }),
    navGapWide: normalizeTailwindToken({ utility: 'gap', breakpoint: 'md', value: base.navGapWide, fallback: DEFAULT_SITE_HEADER_CONFIG.navGapWide }),
    navGapLg: normalizeTailwindToken({ utility: 'gap', breakpoint: 'lg', value: base.navGapLg, fallback: DEFAULT_SITE_HEADER_CONFIG.navGapLg }),
    mobileNavFlexEnabled: base.mobileNavFlexEnabled === true,
    mobileNavItemGap: normalizeTailwindToken({ utility: 'gapX', breakpoint: 'base', value: base.mobileNavItemGap, fallback: DEFAULT_SITE_HEADER_CONFIG.mobileNavItemGap }),
    mobileNavDistribution: token(
      base.mobileNavDistribution,
      MOBILE_NAV_DISTRIBUTIONS,
      DEFAULT_SITE_HEADER_CONFIG.mobileNavDistribution,
    ),
    mobileNavEqualItemWidth: base.mobileNavEqualItemWidth === true,
    mobileNavDivider: token(
      base.mobileNavDivider,
      MOBILE_NAV_DIVIDERS,
      DEFAULT_SITE_HEADER_CONFIG.mobileNavDivider,
    ),
    mobileNavDividerHeight: normalizeTailwindToken({ utility: 'height', breakpoint: 'base', value: base.mobileNavDividerHeight, fallback: DEFAULT_SITE_HEADER_CONFIG.mobileNavDividerHeight }),
    mobileNavDividerWidth: normalizeTailwindToken({ utility: 'width', breakpoint: 'base', value: base.mobileNavDividerWidth, fallback: DEFAULT_SITE_HEADER_CONFIG.mobileNavDividerWidth }),
    contactPaddingX: normalizeTailwindToken({ utility: 'paddingX', breakpoint: 'base', value: base.contactPaddingX, fallback: DEFAULT_SITE_HEADER_CONFIG.contactPaddingX }),
    contactPaddingY: normalizeTailwindToken({ utility: 'paddingY', breakpoint: 'base', value: base.contactPaddingY, fallback: DEFAULT_SITE_HEADER_CONFIG.contactPaddingY }),
    contactBorderWidth: normalizeTailwindToken({ utility: 'borderWidth', breakpoint: 'base', value: base.contactBorderWidth, fallback: DEFAULT_SITE_HEADER_CONFIG.contactBorderWidth }),
    navBandEnabled: base.navBandEnabled === true,
    navBandSourceRow: Math.round(clampRange(
      base.navBandSourceRow,
      1,
      16,
      DEFAULT_SITE_HEADER_CONFIG.navBandSourceRow,
    )),
    navBandScale: clampRange(
      base.navBandScale,
      1,
      3,
      DEFAULT_SITE_HEADER_CONFIG.navBandScale,
    ),
    navBandPanXPercent: clampRange(
      base.navBandPanXPercent,
      0,
      100,
      DEFAULT_SITE_HEADER_CONFIG.navBandPanXPercent,
    ),
    navBandPanYPercent: clampRange(
      base.navBandPanYPercent,
      0,
      100,
      DEFAULT_SITE_HEADER_CONFIG.navBandPanYPercent,
    ),
    navBandOpacity: clampRange(
      base.navBandOpacity,
      0,
      1,
      DEFAULT_SITE_HEADER_CONFIG.navBandOpacity,
    ),
    navBandChromaDuck: clampRange(
      base.navBandChromaDuck,
      0,
      1,
      DEFAULT_SITE_HEADER_CONFIG.navBandChromaDuck,
    ),
    navBandSaturation: clampRange(
      base.navBandSaturation,
      0,
      2,
      DEFAULT_SITE_HEADER_CONFIG.navBandSaturation,
    ),
    navBandBrightness: clampRange(
      base.navBandBrightness,
      0.5,
      1.6,
      DEFAULT_SITE_HEADER_CONFIG.navBandBrightness,
    ),
    splitBandEnabled: base.splitBandEnabled !== false,
    splitBandSide: token(
      base.splitBandSide,
      SPLIT_BAND_SIDES,
      DEFAULT_SITE_HEADER_CONFIG.splitBandSide,
    ),
    navAlignedToSplitEnabled: base.navAlignedToSplitEnabled === true,
    mobileContactPlain: base.mobileContactPlain === true,
    navSeparatorVisible: base.navSeparatorVisible !== false,
    navSeparatorColor: normalizeColor(
      base.navSeparatorColor,
      DEFAULT_SITE_HEADER_CONFIG.navSeparatorColor,
    ),
    navSeparatorHeightMultiplier: clampRange(
      base.navSeparatorHeightMultiplier,
      1,
      4,
      DEFAULT_SITE_HEADER_CONFIG.navSeparatorHeightMultiplier,
    ),
    navContentGapPx: clampRange(
      base.navContentGapPx,
      8,
      96,
      DEFAULT_SITE_HEADER_CONFIG.navContentGapPx,
    ),
    navAlignedToPageContainer: base.navAlignedToPageContainer === true,
    logoAlignedToSplitEnabled: base.logoAlignedToSplitEnabled === true,
    logoContentGapPaddingEnabled: base.logoContentGapPaddingEnabled !== false,
    headerLeftContentAlign: token(base.headerLeftContentAlign, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerLeftContentAlign),
    headerLeftContentAlignWide: token(base.headerLeftContentAlignWide, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerLeftContentAlignWide),
    headerLeftContentAlignLg: token(base.headerLeftContentAlignLg, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerLeftContentAlignLg),
    headerLeftContentVerticalAlign: token(base.headerLeftContentVerticalAlign, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerLeftContentVerticalAlign),
    headerLeftContentVerticalAlignWide: token(base.headerLeftContentVerticalAlignWide, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerLeftContentVerticalAlignWide),
    headerLeftContentVerticalAlignLg: token(base.headerLeftContentVerticalAlignLg, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerLeftContentVerticalAlignLg),
    headerRightContentAlign: token(base.headerRightContentAlign, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerRightContentAlign),
    headerRightContentAlignWide: token(base.headerRightContentAlignWide, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerRightContentAlignWide),
    headerRightContentAlignLg: token(base.headerRightContentAlignLg, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerRightContentAlignLg),
    headerRightContentVerticalAlign: token(base.headerRightContentVerticalAlign, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerRightContentVerticalAlign),
    headerRightContentVerticalAlignWide: token(base.headerRightContentVerticalAlignWide, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerRightContentVerticalAlignWide),
    headerRightContentVerticalAlignLg: token(base.headerRightContentVerticalAlignLg, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerRightContentVerticalAlignLg),
    headerLeftContentInnerAlign: token(base.headerLeftContentInnerAlign, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerLeftContentInnerAlign),
    headerLeftContentInnerAlignWide: token(base.headerLeftContentInnerAlignWide, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerLeftContentInnerAlignWide),
    headerLeftContentInnerAlignLg: token(base.headerLeftContentInnerAlignLg, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerLeftContentInnerAlignLg),
    headerRightContentInnerAlign: token(base.headerRightContentInnerAlign, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerRightContentInnerAlign),
    headerRightContentInnerAlignWide: token(base.headerRightContentInnerAlignWide, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerRightContentInnerAlignWide),
    headerRightContentInnerAlignLg: token(base.headerRightContentInnerAlignLg, CONTENT_ALIGN_VALUES, DEFAULT_SITE_HEADER_CONFIG.headerRightContentInnerAlignLg),
    headerLeftContentWidth: normalizeTailwindToken({ utility: 'maxWidth', breakpoint: 'base', value: base.headerLeftContentWidth, fallback: DEFAULT_SITE_HEADER_CONFIG.headerLeftContentWidth }),
    headerLeftContentWidthWide: normalizeTailwindToken({ utility: 'maxWidth', breakpoint: 'md', value: base.headerLeftContentWidthWide, fallback: DEFAULT_SITE_HEADER_CONFIG.headerLeftContentWidthWide }),
    headerLeftContentWidthLg: normalizeTailwindToken({ utility: 'maxWidth', breakpoint: 'lg', value: base.headerLeftContentWidthLg, fallback: DEFAULT_SITE_HEADER_CONFIG.headerLeftContentWidthLg }),
    headerRightContentWidth: normalizeTailwindToken({ utility: 'maxWidth', breakpoint: 'base', value: base.headerRightContentWidth, fallback: DEFAULT_SITE_HEADER_CONFIG.headerRightContentWidth }),
    headerRightContentWidthWide: normalizeTailwindToken({ utility: 'maxWidth', breakpoint: 'md', value: base.headerRightContentWidthWide, fallback: DEFAULT_SITE_HEADER_CONFIG.headerRightContentWidthWide }),
    headerRightContentWidthLg: normalizeTailwindToken({ utility: 'maxWidth', breakpoint: 'lg', value: base.headerRightContentWidthLg, fallback: DEFAULT_SITE_HEADER_CONFIG.headerRightContentWidthLg }),
    headerLeftContentClassName: typeof base.headerLeftContentClassName === 'string'
      ? base.headerLeftContentClassName
      : DEFAULT_SITE_HEADER_CONFIG.headerLeftContentClassName,
    headerRightContentClassName: typeof base.headerRightContentClassName === 'string'
      ? base.headerRightContentClassName
      : DEFAULT_SITE_HEADER_CONFIG.headerRightContentClassName,
    headerContentLayoutOwnedByPage: base.headerContentLayoutOwnedByPage === true,
    headerLeftSegmentClassName: typeof base.headerLeftSegmentClassName === 'string'
      ? base.headerLeftSegmentClassName
      : DEFAULT_SITE_HEADER_CONFIG.headerLeftSegmentClassName,
    headerRightSegmentClassName: typeof base.headerRightSegmentClassName === 'string'
      ? base.headerRightSegmentClassName
      : DEFAULT_SITE_HEADER_CONFIG.headerRightSegmentClassName,
  };
}
export function resolveSiteHeaderNavBandColorFilter(
  config: Pick<
    SiteHeaderConfig,
    'navBandBrightness' | 'navBandChromaDuck' | 'navBandSaturation'
  >,
) {
  const chromaDuck = clampRange(config.navBandChromaDuck, 0, 1, 0);
  const saturation = clampRange(config.navBandSaturation, 0, 2, 1) * (1 - chromaDuck);
  const brightness = clampRange(config.navBandBrightness, 0.5, 1.6, 1);
  return `saturate(${Number(saturation.toFixed(4))}) brightness(${Number(brightness.toFixed(4))})`;
}
