import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MutableRefObject, ReactNode, Ref, RefObject } from 'react';
import Link from 'next/link';
import { PageContainer } from '../../../components/PageContainer';
import type { PageSurfaceConfig } from '../../../components/PageSurface.config';
import type { SvgStop } from '../../../helpers/gradientMath';
import { deriveSurfaceColor, resolveContrastAwareTextColor } from '../../../helpers/surfaceColorDerivation';
import { useSharedDesignConfig } from '../../../components/SharedDesignConfigProvider';
import { LayoutDebugOverlay } from '../../../components/LayoutDebug';
import { resolveSiteHeaderLogoStops } from './SiteHeader/hooks/resolveSiteHeaderLogoStops';
import Logo from './Logo';
import {
  normalizeSiteHeaderConfig,
  type SiteHeaderConfig,
  type SiteHeaderContentAlign,
  type SiteHeaderDesktopMarginTop,
  type SiteHeaderMarginTop,
} from './SiteHeader/config/registered';
import { DEFAULT_WORDMARK_CONFIG, type WordmarkConfig } from './SiteHeader/config/wordmark';
import styles from '../../../pages/abstract.module.css';

// margin-top sits OUTSIDE the header's own box, so a child positioned via
// inset-0 (as the split band below is) starts only where the header itself
// starts — after the margin already pushed it down — leaving the page's own
// background color showing through above it. Bleeding the split band
// upward by the header's own marginTop (negative top, one literal class per
// token so Tailwind's scanner still sees a complete string) closes that gap
// without touching the margin itself, which every other page still relies
// on for its own spacing.
const NEGATIVE_TOP_BY_MARGIN_TOP: Record<SiteHeaderMarginTop, string> = {
  'mt-0': '-top-0',
  'mt-2': '-top-2',
  'mt-4': '-top-4',
  'mt-6': '-top-6',
  'mt-8': '-top-8',
};
const NEGATIVE_TOP_BY_DESKTOP_MARGIN_TOP: Record<SiteHeaderDesktopMarginTop, string> = {
  'md:mt-0': 'md:-top-0',
  'md:mt-2': 'md:-top-2',
  'md:mt-4': 'md:-top-4',
  'md:mt-6': 'md:-top-6',
  'md:mt-8': 'md:-top-8',
};
// Literal per direction — never interpolated — so Tailwind's JIT scanner
// still sees both complete class strings regardless of which one is active.
// Shared by the decorative split-band/legibility-scrim grids below (both
// unconditionally rendered, every breakpoint, by design — each page gates
// the *colors* it feeds in instead, see splitBandBoundaryPx's own doc
// comment / PLAN-POSTS-LAB-MOBILE-LAYOUT.md §7.5) — do not repurpose this
// table for navSplitOverlay's own grid below; that one needs an md:-gated
// variant instead (MD_SPLIT_BAND_GRID_COLS_BY_SIDE), since unlike the
// decorative grids it's no longer wrapped `hidden md:block` and must not
// force a two-column split below md. The split-band overlay specifically
// (not the legibility-scrim grid, which has no per-segment color to show)
// swaps this side-by-side table out for SPLIT_BAND_STACKED_GRID_CLASS
// below whenever splitBandStacked is true — see that prop's own doc
// comment for why the grid's own *shape* (not just its colors) now needs
// to vary too.
const SPLIT_BAND_GRID_COLS_BY_SIDE: Record<'left' | 'right', string> = {
  right: 'grid-cols-[38%_62%]',
  left: 'grid-cols-[62%_38%]',
};
// Vertical-stack sibling of SPLIT_BAND_GRID_COLS_BY_SIDE — one column, two
// equal-height rows, so the left/right segment divs (still rendered in the
// same DOM order, top then bottom) each paint as their own full-width bar
// instead of two side-by-side slices. No per-side variant needed (unlike
// the table above) — stacking order is always left-then-right regardless
// of splitBandSide, since there's no physical left/right seam to mirror
// once the split is vertical.
const SPLIT_BAND_STACKED_GRID_CLASS = 'grid-cols-1 grid-rows-2';
// navSplitOverlay's own grid (cappedContainerRef below) renders at every
// breakpoint now, mobile-first (`grid-cols-1` base) — this md:-prefixed
// sibling of SPLIT_BAND_GRID_COLS_BY_SIDE is what lets its percentage
// fallback only take effect from md upward, the same
// grid-cols-1-base-plus-md:-fragment pattern components/SplitColumnLayout.tsx's
// own resolveGridColsClassName already uses for the body's WIDE COLUMN/
// NARROW COLUMN grid.
const MD_SPLIT_BAND_GRID_COLS_BY_SIDE: Record<'left' | 'right', string> = {
  right: 'md:grid-cols-[38%_62%]',
  left: 'md:grid-cols-[62%_38%]',
};
// navSplitOverlay's two cells are both flex containers that stretch to fill
// their own grid cell (no justify-self/width override on either) — each
// positions its own content internally via justify-content/align-items, so
// both a full-cell debug overlay (tone="headerLeft"/"headerRight") and a
// tight content-only one (tone="contentBox") can coexist at the same cell.
const FLEX_JUSTIFY_CLASS: Record<SiteHeaderContentAlign, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
};
// md:-prefixed sibling of FLEX_JUSTIFY_CLASS — headerLeftContentAlign/
// headerRightContentAlign position content *within a split segment*, which
// (like the body's own narrowColumnContentAlignWide/wideColumnContentAlignWide,
// postLab.config.ts's own doc comment) only exists once a real split is
// active; below md there is no second segment to align against yet, so
// these fields' own config value applies from md upward only, same as that
// established precedent. The unprefixed `justify-center` baseline applied
// alongside this (see navSplitOverlay's two cells below) reproduces today's
// actual shipped mobile visual (centered logo/nav), which predates and is
// independent of this config field.
const FLEX_JUSTIFY_CLASS_MD: Record<SiteHeaderContentAlign, string> = {
  start: 'md:justify-start',
  center: 'md:justify-center',
  end: 'md:justify-end',
};
// FLEX_ITEMS_CLASS (vertical align) has no md:-prefixed sibling —
// headerLeftContentVerticalAlign/headerRightContentVerticalAlign apply
// unprefixed at every breakpoint, matching the body's own
// narrowColumnContentVerticalAlign/wideColumnContentVerticalAlign, which
// carry no "below md has no effect" caveat and already work this way.
const FLEX_ITEMS_CLASS: Record<SiteHeaderContentAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
};

// Standard merge-refs idiom — lets this component measure the logo anchor
// itself (for navAlignedToSplitEnabled's separator height) without
// disturbing `logoAnchorRef`, a page-owned ref this component has always
// forwarded verbatim (e.g. /about's own left-column alignment effect).
function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): (node: T | null) => void {
  return (node) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') ref(node);
      else (ref as MutableRefObject<T | null>).current = node;
    });
  };
}

export type SiteHeaderProps = {
  config: SiteHeaderConfig;
  pageSurfaceConfig: PageSurfaceConfig;
  /** Only meaningful in 'adaptive' colorMode — a page-owned, pre-sampled
   * gradient (e.g. abstract.tsx's own live-WebGL-derived synth stops) that
   * genuinely cannot be generalized into a formula, since it depends on
   * that page's own runtime palette state. Every OTHER colorMode
   * ('custom'/'surface'/'column') is resolved internally by this
   * component itself (see resolvedLogoStops below,
   * resolveSiteHeaderLogoStops's own doc comment) from config +
   * pageSurfaceConfig + physicalLeftColumnColor — a caller in one of those
   * three modes never needs to supply this prop at all. Before this,
   * EVERY page (about.tsx, abstract.tsx, contact.tsx, design-system.tsx,
   * posts-lab/[slug].tsx) independently called resolveSiteHeaderLogoStops
   * itself and passed the finished result in here — five copies of the
   * same formula, one of which (about.tsx) was missing a fix the other
   * four had already received (BUG-012, BUGS-AUDIT-POLYMORPHIC-LAYOUT-
   * CARD-STACK.md), confirmed live 2026-08-24. Centralizing the common-
   * mode computation here is what makes that class of drift structurally
   * impossible going forward, not just fixed once. */
  logoStops?: SvgStop[];
  /** The wordmark's own color/adaptive/intro-animation config — see
   * WordmarkConfig's own doc comment (config/wordmark.ts). Omit to fall
   * back to this component's legacy behavior: the logo's color is derived
   * from `config`'s own (now nav-facing) colorMode/logoColor/
   * logoSurfaceOffset/columnTextMinContrast fields instead, and the intro
   * animation/color-transition use the same fixed values every caller got
   * before this config existed (pages/contact.tsx, pages/posts/[slug].tsx —
   * both unmigrated, so this keeps their logo pixel-identical). A page that
   * supplies this prop (pages/about.tsx, pages/abstract.tsx) gets the
   * dedicated, cross-page-shared Wordmark config instead, fully decoupled
   * from `config`'s own nav-facing color fields. */
  wordmarkConfig?: WordmarkConfig;
  /** The left/logo segment's own real, physically-painted background —
   * same contract as physicalRightColumnColor below, mirrored for the
   * left side (see that prop's own doc comment and
   * PolymorphicLayoutResolvedColors.actualLeftSegmentColor, components/
   * PolymorphicLayout.tsx, the shared hook this value should always come
   * from). Feeds resolvedLogoStops's own 'column'-mode contrast search —
   * optional because a page with no split-column concept at all simply
   * omits it, falling back to pageSurfaceConfig.color below, same as the
   * right segment's own fallback. */
  physicalLeftColumnColor?: string;
  /** Only meaningful in 'adaptive' colorMode — the adaptive-ink feature
   * abstract.tsx's own live-gradient hero drives. Omit for any page (like
   * contact.tsx) with no such background to sample from; 'custom' colorMode
   * (the default) never reads this. */
  dataInkTone?: 'light' | 'dark';
  /** Nav-band canvas: an opt-in strip that samples a live gradient behind
   * the header (see pages/abstract.tsx's own WebGL hero). Omit entirely for
   * pages with no such gradient source — no canvas renders when inactive. */
  navBandActive?: boolean;
  navBandCanvasRef?: RefObject<HTMLCanvasElement>;
  navBandColorFilter?: string;
  /** Opt-in: exposes the logo link's own DOM node so a page can measure its
   * real rendered left edge (e.g. to align other content to it) instead of
   * re-deriving an approximation from the header's padding config. */
  logoAnchorRef?: Ref<HTMLAnchorElement>;
  /** Opt-in: exposes the *default* (sub-md, `navAlignedToSplitEnabled`-
   * independent) primary nav's own DOM node. Below md this row is centered
   * within PageContainer's own content box (`items-center` on a flex
   * column) and width-capped at `w-[min(100%,360px)]` — its real left edge
   * is a function of the live viewport width (shrinks toward 0 as the
   * viewport narrows past 360px, grows again above it), not a fixed
   * padding value, so no static class can reproduce it. A page that needs
   * to align other content (e.g. an off-canvas TOC) to this nav's actual
   * position below md must measure this ref directly rather than
   * re-deriving an approximation — same reasoning as logoAnchorRef above,
   * for the sub-md case specifically. Unset above md, where this row is
   * `md:hidden` in navAlignedToSplitEnabled mode. */
  primaryNavRef?: Ref<HTMLElement>;
  /** Decorative 38/62 split background behind the whole header, echoing a
   * page's own left/right content split (e.g. about.tsx's). Omit entirely
   * for pages with no such split — nothing renders while splitBandActive is
   * off, or while *both* colors are missing/falsy. Either color alone is
   * enough to show that one segment while the other stays unpainted — a
   * page can deliberately color just its nav-containing segment and leave
   * the other transparent (or vice versa). */
  splitBandActive?: boolean;
  splitBandLeftColor?: string;
  splitBandRightColor?: string;
  /** The right/wide column's own real, physically-resolved background —
   * independent of whatever splitBandRightMode currently paints there (see
   * rightSegmentActualColor's own doc comment below for why this exists:
   * 'transparent' is a legitimate, supported band mode that must still
   * derive nav-text contrast against what's actually visible behind it,
   * not against the unrelated page surface). Optional — pages/layouts with
   * no split-column concept at all (colorMode !== 'column', or no column
   * behind the header regardless) simply omit it, and the pageSurfaceConfig
   * fallback below is unchanged for them. */
  physicalRightColumnColor?: string;
  /** CSS `transition` shorthand value (e.g. `'background-color 900ms ease'`)
   * applied to both split-band color layers — lets the hosting page drive
   * an entrance reveal (or live palette edits) with its own duration/easing
   * instead of the colors snapping in. */
  splitBandTransition?: string;
  /** Arbitrary page-owned content painted over this segment's own flat
   * splitBandLeftColor/-RightColor (which stays the base/fallback paint
   * underneath — nothing changes for a page that never passes a slot).
   * Generic on purpose: this component has no opinion on what a page puts
   * here (a richer gradient, a texture, an animated field) — it only
   * guarantees the content fills the segment, sits below the nav (same
   * stacking level the flat color already occupies), and is CLIPPED to
   * the segment's own real box (the band div itself is `overflow-hidden`
   * specifically for this — a WebGL gradient canvas's own natural render
   * overscan, by design well beyond its immediate container on every
   * side, was bleeding sideways past the segment's own edge into the
   * OTHER segment before this existed, confirmed live via screenshot,
   * 2026-08-24). A page choosing to use this is fully responsible for
   * keeping whatever it renders visually consistent with the color it
   * also passes via splitBandLeftColor/-RightColor (the value nav-text
   * contrast is actually computed against) — this component never
   * inspects the slot's own content to derive anything from it. */
  splitBandLeftBackgroundSlot?: ReactNode;
  /** Same contract as splitBandLeftBackgroundSlot, for the right segment. */
  splitBandRightBackgroundSlot?: ReactNode;
  /** Only meaningful when config.navAlignedToSplitEnabled is on. A live-
   * measured, viewport-relative x position (px) — where the hosting page's
   * own body content actually starts, per a real DOM measurement it owns
   * (e.g. a marker anchored inside whichever column its own reversed-or-
   * not column-order config puts there), not a value this header derives
   * itself. When provided (a finite number), this "floating" position
   * entirely replaces the CSS-grid-percentage approach
   * (navAlignedToPageContainer/splitBandSide) for computing where nav
   * starts — for a page whose column order genuinely reverses at the body
   * level (e.g. /abstract's wide-left/narrow-right, the opposite of
   * /about's narrow-left/wide-right) while the header itself never
   * reorders logo/nav, re-deriving that same reversal as a second,
   * independent percentage calculation here is exactly the kind of
   * drift-prone duplication this repo's own audit history (see
   * PLAN-VERTICAL-CARD-STACK.md) keeps flagging — asking the real DOM,
   * which the body's own (correctly reversed) layout already produced, is
   * the more robust source of truth. Omit for a page like /about, whose
   * body has no such reversal and where a live measurement would be pure
   * overhead for a value the grid percentage already gets exactly right. */
  navSplitBoundaryPx?: number;
  /** Opt-in override for the split-band's own boundary specifically (the
   * decorative two-color layer below, `splitBandVisible`) — decoupled from
   * navSplitBoundaryPx above, which stays the real, body-measured
   * boundary used for nav/TOC alignment. Omit (default) to keep sharing
   * navSplitBoundaryPx for the band too, exactly as before this prop
   * existed — every page but the one that opts in is unaffected.
   *
   * Also doubles as the logo/nav content grid's own fallback (see
   * resolvedNavBoundaryPx below) whenever navSplitBoundaryPx isn't
   * live-measured — the primitive that gives a page with no real second
   * body column (e.g. a single-column PolymorphicLayout consumer) a real,
   * config-driven header split ratio (PolymorphicLayoutConfig's own
   * splitBandWidthTier) instead of a silently unconfigurable hardcoded
   * constant. Exists because navSplitBoundaryPx's own live-measurement hook
   * (components/SplitColumnPageShell/useSplitColumnNavAlignment.ts) always
   * resolves to a real number even while a page's body layout is genuinely
   * stacked (an intentional placeholder for *its own* other consumers,
   * documented there as "never actually gets used for anything real" while
   * stacked) — true for those, not true for this band, which rendered a
   * real two-tone split with no structural column boundary beneath it any
   * time a hosting page's body hadn't actually split yet (confirmed via
   * live DOM inspection on pages/posts-lab/[slug].tsx below its own split
   * tier — see PLAN-POSTS-LAB-MOBILE-LAYOUT.md §7.5 for the full
   * diagnosis). A page that wants the band's own width independently
   * operator-configurable (not tied to the real body boundary at all)
   * resolves its own pixel value and supplies it here instead. */
  splitBandBoundaryPx?: number;
  /** When true, renders the two split-band segments as a vertical stack
   * (one full-width bar above the other) instead of the default
   * side-by-side horizontal split — for a breakpoint tier with no real
   * horizontal split configured (PolymorphicLayoutConfig's own
   * splitBandWidthTier: 'stacked'), so each segment's own independently
   * configured color still shows as its own distinct band rather than
   * being forced into a single unified color to hide the lack of a visible
   * seam (BUG-010, BUGS-AUDIT-POLYMORPHIC-LAYOUT-CARD-STACK.md — the
   * two-cell horizontal grid used to be unconditional at every breakpoint,
   * with pages instead collapsing the right segment's own resolved color
   * to match the left segment's so the seam wasn't visible; this replaces
   * that color-level hack with a genuine layout change). Omit (default
   * false) for the existing side-by-side behavior — a page with no
   * "stacked" tier never sets this. */
  splitBandStacked?: boolean;
  /** Opt-in backdrop blur behind the header's own box, scoped per physical
   * side — for a page whose body renders this header as a permanent
   * `position: fixed` overlay with a column floating under one or both
   * sides of it, so nav text/logo stay legible over real, potentially
   * colorful/busy content bleeding underneath, regardless of whichever
   * colorSource/split-band mode an operator picks (including
   * 'transparent'/'none' — a blur degrades whatever's behind it without
   * hiding it outright, unlike a flat scrim color, which would defeat the
   * point of choosing transparent in the first place). Two independent
   * booleans, not one, because only the side(s) actually floating under the
   * header need it — SplitColumnPageShell resolves
   * splitColumnLayoutConfig.legibilityScrimEnabled (the page/operator's own
   * opt-in) together with wideColumnSide and each column's own
   * *ColumnHeaderBehavior into these two physical-side values; this
   * component never inspects that config itself. Both default false: no
   * visual change for /about, /contact, /design-system, or any other page/
   * config where nothing floats under either side. */
  legibilityScrimLeftEnabled?: boolean;
  legibilityScrimRightEnabled?: boolean;
};

/**
 * Abstract Voyage's top nav: logo + About/Journal/Contact links, capped to
 * the shared page container width. Extracted verbatim from pages/abstract.tsx
 * (previously inline JSX despite SiteHeader.config.ts/.panel.ts
 * already existing as if this were a component) so any page can render the
 * identical header without duplicating the markup.
 */
export function SiteHeader({
  config,
  pageSurfaceConfig,
  logoStops: adaptiveLogoStops,
  wordmarkConfig,
  physicalLeftColumnColor,
  dataInkTone,
  navBandActive = false,
  navBandCanvasRef,
  navBandColorFilter,
  logoAnchorRef,
  primaryNavRef,
  splitBandActive = false,
  splitBandLeftColor,
  splitBandRightColor,
  physicalRightColumnColor,
  splitBandTransition,
  splitBandLeftBackgroundSlot,
  splitBandRightBackgroundSlot,
  navSplitBoundaryPx,
  splitBandBoundaryPx,
  splitBandStacked = false,
  legibilityScrimLeftEnabled = false,
  legibilityScrimRightEnabled = false,
}: SiteHeaderProps) {
  const normalized = normalizeSiteHeaderConfig(config);
  // See SiteHeaderProps.wordmarkConfig's own doc comment — a caller that
  // hasn't migrated gets a shim built from this same `normalized` object's
  // legacy logo fields (byte-identical to this component's pre-Wordmark-
  // config behavior), still spread over DEFAULT_WORDMARK_CONFIG's own
  // intro/motion/colorTransitionMs values (which are themselves just this
  // component's previous hardcoded <Logo> call-site literals, unchanged).
  const effectiveWordmarkConfig: WordmarkConfig = wordmarkConfig ?? {
    ...DEFAULT_WORDMARK_CONFIG,
    colorMode: normalized.colorMode,
    color: normalized.logoColor,
    surfaceOffset: normalized.logoSurfaceOffset,
    columnTextMinContrast: normalized.columnTextMinContrast,
  };
  const { globalTypographyConfig } = useSharedDesignConfig();
  const resolvedFontFamily = normalized.fontFamily === 'inherit'
    ? globalTypographyConfig.headingFontFamily
    : normalized.fontFamily;
  // Either color alone is enough to render the band — each side paints its
  // own div independently (see the two `<div style={{ backgroundColor }}>`s
  // below), so a page that wants only its nav-containing segment colored
  // (leaving the other literally `undefined`/unset) must not have the whole
  // band suppressed just because one side has nothing to show. Requiring
  // *both* here (the original check) meant a page could never color just
  // one segment — a real, reported limitation, not a hypothetical.
  const splitBandVisible = splitBandActive && (Boolean(splitBandLeftColor) || Boolean(splitBandRightColor));
  // Falls back to splitBandBoundaryPx (PolymorphicLayoutConfig's own
  // splitBandWidthTier — a real, config-driven ratio, exposed in every
  // PolymorphicLayout page's own panel) when navSplitBoundaryPx isn't
  // live-measured. A page with no real second body column to measure
  // against (e.g. a single-column PolymorphicLayout consumer, narrowColumnWidthTierMd/Lg
  // both 'stacked') would otherwise permanently fall through to the
  // hardcoded MD_SPLIT_BAND_GRID_COLS_BY_SIDE constant below with no config
  // surface to ever adjust it — this is the primitive that makes the
  // header's own left/right segment sizing a real, page-configurable value
  // on every PolymorphicLayout page, not just the ones with a live column.
  // Live measurement still wins when available (strictly more precise than
  // a formula computed off the raw viewport width) — this is a fallback,
  // not an override; every page with a real body split (which already had
  // hasMeasuredNavBoundary true) renders byte-identical to before this
  // fallback existed.
  const resolvedNavBoundaryPx = typeof navSplitBoundaryPx === 'number' ? navSplitBoundaryPx : splitBandBoundaryPx;
  const hasMeasuredNavBoundary = typeof resolvedNavBoundaryPx === 'number' && Number.isFinite(resolvedNavBoundaryPx);
  // Falls back to navSplitBoundaryPx when splitBandBoundaryPx isn't
  // supplied — see that prop's own doc comment above for why the two need
  // to be independently overridable at all.
  const resolvedSplitBandBoundaryPx = typeof splitBandBoundaryPx === 'number' ? splitBandBoundaryPx : navSplitBoundaryPx;
  const hasMeasuredSplitBandBoundary = typeof resolvedSplitBandBoundaryPx === 'number'
    && Number.isFinite(resolvedSplitBandBoundaryPx);

  // navAlignedToSplitEnabled's separator height tracks the logo's own real
  // rendered height (never a guessed constant — see this field's own doc
  // comment in SiteHeader.config.ts) rather than measuring only
  // when the flag flips, so a later logoWidth/desktopLogoWidth panel edit
  // stays correct too.
  const internalLogoRef = useRef<HTMLAnchorElement | null>(null);
  // Memoized — a fresh function identity on every render would make React
  // detach/reattach the ref (null, then the node) on every render too,
  // which previously caused a runaway re-render loop once this component
  // actually mounted with navAlignedToSplitEnabled on.
  const mergedLogoRef = useMemo(
    () => (normalized.navAlignedToSplitEnabled ? mergeRefs(logoAnchorRef, internalLogoRef) : logoAnchorRef),
    [normalized.navAlignedToSplitEnabled, logoAnchorRef],
  );
  const [logoHeightPx, setLogoHeightPx] = useState(0);
  useEffect(() => {
    if (!normalized.navAlignedToSplitEnabled || typeof window === 'undefined') return undefined;
    const element = internalLogoRef.current;
    if (!element) return undefined;
    const measure = () => setLogoHeightPx(element.getBoundingClientRect().height);
    measure();
    window.addEventListener('resize', measure);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
    // logoAlignedToSplitEnabled is a dependency too, not just
    // navAlignedToSplitEnabled: toggling it moves *which* rendered <Link>
    // internalLogoRef points to (PageContainer's slot vs. the overlay's —
    // see mergedLogoRef and the two renderLogo call sites), and without
    // re-running this effect on that change, the old ResizeObserver keeps
    // watching a detached node while the new one never gets its first
    // measurement — reported as the separator silently collapsing to
    // height: 0 after the toggle (its height is logoHeightPx times a
    // multiplier, so a stuck-at-0 logoHeightPx makes it disappear
    // entirely).
  }, [normalized.navAlignedToSplitEnabled, normalized.logoAlignedToSplitEnabled]);
  const navSeparatorHeightPx = logoHeightPx * normalized.navSeparatorHeightMultiplier;

  // navSplitOverlay's grid now renders inside a PageContainer (capped +
  // centered, matching the body's own bounded column), instead of directly
  // on the header's full-width box. navSplitBoundaryPx is a *viewport*-
  // relative pixel (measured off the body's own real, already-capped
  // column seam) — the grid's own gridTemplateColumns interprets its px
  // value relative to whatever now-inset containing block it renders in,
  // so without this correction the seam would silently drift right by
  // exactly this PageContainer's own left inset whenever the viewport
  // exceeds maxWidthPx. Measured directly off the real rendered element
  // (not recomputed from maxWidthPx/window.innerWidth by hand) so this
  // can never independently drift from whatever PageContainer's own
  // centering math actually does — the same "don't compute the same
  // seam two different ways" principle navSplitBoundaryPx itself exists
  // for (see its own doc comment on SiteHeaderProps).
  const cappedContainerRef = useRef<HTMLDivElement | null>(null);
  const [cappedContainerLeftPx, setCappedContainerLeftPx] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const element = cappedContainerRef.current;
    if (!element) return undefined;
    const measure = () => setCappedContainerLeftPx(element.getBoundingClientRect().left);
    measure();
    window.addEventListener('resize', measure);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, []);

  // Resolved once, here, for every colorMode — see logoStops's own doc
  // comment (SiteHeaderProps) for why this used to be a page-level
  // computation duplicated across five call sites. physicalLeftColumnColor
  // ?? pageSurfaceConfig.color mirrors rightSegmentActualColor's own
  // fallback below exactly (the right segment's equivalent), so a page
  // with no split-column concept at all needs neither prop and still gets
  // a correct, surface-derived logo. adaptiveLogoStops (the renamed
  // logoStops prop) is only ever actually read inside
  // resolveSiteHeaderLogoStops when colorMode is 'adaptive' — its own
  // fallback here (flat normalized.logoColor) only matters if a page runs
  // 'adaptive' mode without supplying anything, which never happens for
  // any current caller but keeps this component correct regardless.
  const resolvedLogoStops = resolveSiteHeaderLogoStops(
    effectiveWordmarkConfig,
    pageSurfaceConfig.color,
    physicalLeftColumnColor ?? pageSurfaceConfig.color,
    adaptiveLogoStops ?? [
      { color: effectiveWordmarkConfig.color, at: 0 },
      { color: effectiveWordmarkConfig.color, at: 100 },
    ],
  );

  // Live-preview support for the Wordmark panel (operator ask: "any knob
  // ... let us visualize the change in the UI on knobs update"). Color
  // fields (colorMode/color/surfaceOffset/columnTextMinContrast) already
  // preview live for free — editing them changes resolvedLogoStops above,
  // which the persistently-mounted <Logo>/SvgGradientDef below already
  // cross-fades via its own CSS `transition: stop-color ...` (confirmed
  // live). Two classes of knob don't get that for free, though:
  //
  // 1. Every intro* field (SvgStaggerGroup's own per-glyph fade/scale/
  //    bloom) only plays once, on mount — it's a CSS custom-property-driven
  //    animation, not a live-bound style, so editing e.g. introDurationS
  //    after the glyphs have already settled into their resting state
  //    changes the CSS variable but has nothing left to animate; there's no
  //    visible feedback until a full page reload replays the mount. Keying
  //    just the <Logo> (not the whole header/page) on a signature of these
  //    fields forces exactly that replay, scoped to the logo alone, the
  //    moment any of them changes. introReplayKey below is a stable, small
  //    integer — bumped only when the signature string actually differs
  //    from the previous render's, via React's own documented "adjust
  //    state during render when a prop changes" pattern (calling setState
  //    directly in the render body), not an effect (an effect would
  //    remount one paint late, showing a stale frame first).
  const introReplaySignature = [
    effectiveWordmarkConfig.introEnabled,
    effectiveWordmarkConfig.introInitialDelayS,
    effectiveWordmarkConfig.introStepDelayS,
    effectiveWordmarkConfig.introDurationS,
    effectiveWordmarkConfig.introEasing,
    effectiveWordmarkConfig.introDirection,
    effectiveWordmarkConfig.introScalePivot,
    effectiveWordmarkConfig.introBloomEnabled,
    effectiveWordmarkConfig.introBloomBase,
    effectiveWordmarkConfig.introBloomPeak,
    effectiveWordmarkConfig.introBloomInitialDelayS,
    effectiveWordmarkConfig.introBloomStepDelayS,
  ].join('|');
  const [previousIntroReplaySignature, setPreviousIntroReplaySignature] = useState(introReplaySignature);
  const [introReplayKey, setIntroReplayKey] = useState(0);
  if (introReplaySignature !== previousIntroReplaySignature) {
    setPreviousIntroReplaySignature(introReplaySignature);
    setIntroReplayKey(key => key + 1);
  }

  // 2. colorTransitionMs (the cross-fade duration/easing itself) has no
  //    visible effect when edited alone — nothing about the *resting*
  //    color changed, so there's nothing for the operator to watch
  //    transition. A self-reverting "nudge" — offset the current resolved
  //    color's lightness, hold it for exactly the just-edited duration (so
  //    the full out-transition genuinely completes, not a single-frame
  //    blip too brief to see), then hand back the real target for the
  //    same duration — makes the edited value visible by riding the exact
  //    same stop-color CSS transition colorMode/color/surfaceOffset/
  //    columnTextMinContrast edits already use, rather than inventing a
  //    second animation mechanism.
  const [colorPreviewNudgeActive, setColorPreviewNudgeActive] = useState(false);
  const previousColorTransitionMsRef = useRef(effectiveWordmarkConfig.colorTransitionMs);
  useEffect(() => {
    if (previousColorTransitionMsRef.current === effectiveWordmarkConfig.colorTransitionMs) return undefined;
    previousColorTransitionMsRef.current = effectiveWordmarkConfig.colorTransitionMs;
    // The DOM's own transition-duration is already this new value by the
    // time this effect runs (same render committed both) — held for long
    // enough that the nudge-out transition genuinely completes before
    // reverting, so a slow duration reads as slow, not clipped.
    const holdMs = Math.max(16, effectiveWordmarkConfig.colorTransitionMs);
    setColorPreviewNudgeActive(true);
    const timeout = window.setTimeout(() => setColorPreviewNudgeActive(false), holdMs);
    return () => window.clearTimeout(timeout);
  }, [effectiveWordmarkConfig.colorTransitionMs]);
  const previewedLogoStops = colorPreviewNudgeActive
    ? resolvedLogoStops.map((stop) => {
        // Try lightening first; if the stop was already at (or clamped to)
        // white, lightening is a no-op, so fall back to darkening instead
        // — either direction reads as a visible "nudge," which is all this
        // needs, but a no-op wouldn't be visible at all.
        const lightened = deriveSurfaceColor(stop.color, 0.4);
        const nudged = lightened.toLowerCase() === stop.color.toLowerCase()
          ? deriveSurfaceColor(stop.color, -0.4)
          : lightened;
        return { ...stop, color: nudged };
      })
    : resolvedLogoStops;

  // Shared between the default (PageContainer) slot and, when
  // logoAlignedToSplitEnabled is on, the moved desktop position next to
  // the separator — same markup either way, only the ref (which instance
  // is actually visible feeds the separator-height measurement) and extra
  // className (md:hidden on the default slot once the logo has moved)
  // differ, so the two placements can never drift on the logo itself.
  const renderLogo = (ref: Ref<HTMLAnchorElement> | undefined, extraClassName: string) => (
    <Link
      aria-label="Abstract Voyage home"
      className={`${styles.synthAffordance} ${normalized.logoWidth} ${normalized.desktopLogoWidth} pointer-events-auto relative flex min-h-[2.75rem] max-w-full shrink-0 items-center justify-center md:justify-start ${extraClassName}`}
      href="/abstract"
      ref={ref}
      style={{ maxWidth: `${effectiveWordmarkConfig.maxWidthPx}px` }}
    >
      <Logo
        // Remounts (replaying the intro stagger from scratch) only when an
        // intro/motion field's own value actually changes — see
        // introReplayKey's own doc comment above. Every other prop change
        // (color, layout, etc.) reconciles onto the same instance as
        // before, so this never disrupts the color cross-fade.
        key={introReplayKey}
        ariaLabel="Abstract Voyage"
        stops={previewedLogoStops}
        stopTransitionMs={effectiveWordmarkConfig.colorTransitionMs}
        width="100%"
        introAnimate={effectiveWordmarkConfig.introEnabled}
        introInitialDelay={effectiveWordmarkConfig.introInitialDelayS}
        introStepDelay={effectiveWordmarkConfig.introStepDelayS}
        introDuration={effectiveWordmarkConfig.introDurationS}
        introEasing={effectiveWordmarkConfig.introEasing}
        introDirection={effectiveWordmarkConfig.introDirection}
        introScalePivot={effectiveWordmarkConfig.introScalePivot}
        introBloomEnabled={effectiveWordmarkConfig.introBloomEnabled}
        introBloomBase={effectiveWordmarkConfig.introBloomBase}
        introBloomPeak={effectiveWordmarkConfig.introBloomPeak}
        introBloomInitialDelay={effectiveWordmarkConfig.introBloomInitialDelayS}
        introBloomStepDelay={effectiveWordmarkConfig.introBloomStepDelayS}
      />
    </Link>
  );

  const navItemClassName = `${styles.navLink} relative inline-flex min-h-[2.75rem] w-full items-center justify-center p-0 md:w-auto ${normalized.navFontSizeNarrow} ${normalized.navFontSizeDesktop} ${normalized.navUppercase ? 'uppercase' : 'normal-case'} ${normalized.navFontWeight}`;
  // md:px-0 md:py-0 md:border-0 md:rounded-none: literal reset fragments
  // (never interpolated) that zero contactPaddingX/contactPaddingY/
  // contactBorderWidth back out from md upward — navSplitOverlay's own
  // <nav> (below) is now the single call site for both mobile and desktop
  // Contact chrome, so this reproduces what used to be two separate
  // JS-level decisions (mobile: renderNavItems(mobileContactPlain), desktop:
  // renderNavItems(true), hardcoded always-plain) through one shared
  // element instead — always-plain at md+ regardless of mobileContactPlain,
  // matching today's desktop behavior exactly. Below md these reset classes
  // are simply absent (mobile-first — nothing to override), so
  // contactPaddingX/-Y/contactBorderWidth apply exactly as configured,
  // unchanged from today's mobile behavior.
  const contactItemClassName = `${navItemClassName} ${styles.contactLink} ${normalized.contactPaddingX} ${normalized.contactPaddingY} ${normalized.contactBorderWidth} box-border rounded-full whitespace-nowrap md:px-0 md:py-0 md:border-0 md:rounded-none`;
  // The three nav items are identical in both the default (Mode 1 only now
  // — see the guard around this block's own JSX below) and
  // navSplitOverlay (Mode 2's now-only renderer) renders — only Contact's
  // own chrome differs, via contactItemClassName's own md:-reset above
  // rather than two independent JS-level renderNavItems(...) call sites
  // (previously: default block passed mobileContactPlain, the overlay
  // hardcoded true). Kept as one function instead of duplicated JSX so the
  // two callers can never silently drift on label/href.
  const renderNavItems = (contactPlain: boolean) => (
    <>
      <li className="min-w-0">
        <Link className={navItemClassName} href="/about">
          <span className={styles.navLabel}>About</span>
        </Link>
      </li>
      <li className="min-w-0">
        <Link className={navItemClassName} href="/abstract#journal">
          <span className={styles.navLabel}>Journal</span>
        </Link>
      </li>
      <li className="min-w-0">
        <Link className={contactPlain ? navItemClassName : contactItemClassName} href="/contact">
          <span className={styles.navLabel}>Contact</span>
        </Link>
      </li>
    </>
  );
  // Only meaningful in 'column' colorMode — the right segment's own
  // ACTUALLY rendered background (splitBandRightColor, the same value the
  // decorative band div below paints) when the band itself paints
  // something; when it doesn't (splitBandRightMode: 'transparent' — a
  // legitimate, supported mode, not an edge case to route around — or the
  // whole band disabled via splitBandActive), nothing is *painted* there,
  // but the header still sits on top of a real, physically visible surface:
  // physicalRightColumnColor, the right/wide column's own resolved
  // background, independent of whatever the band is currently doing. Using
  // that instead of pageSurfaceConfig.color (this component's own former
  // fallback) is what makes 'transparent' actually safe to pick — nav text
  // contrast used to be derived against the flat page surface even though
  // the column's own, differently-colored background was what was really
  // showing through, which is BUG-012's exact pattern
  // (BUGS-AUDIT-POLYMORPHIC-LAYOUT-CARD-STACK.md) and the reason this kept
  // regressing: an earlier fix (commit 38b77d9) worked around it by forcing
  // splitBandRightMode* to 'syncWithColumnBelow' instead of fixing this
  // fallback, which silently took 'transparent' off the table as a real
  // option for the operator. physicalRightColumnColor is optional — pages
  // with no split-column concept behind the header at all simply never
  // pass it, and pageSurfaceConfig.color remains the correct fallback for
  // them, unchanged.
  const rightSegmentActualColor = splitBandActive && splitBandRightColor && splitBandRightColor !== 'transparent'
    ? splitBandRightColor
    : physicalRightColumnColor ?? pageSurfaceConfig.color;
  const heroHeaderColorStyle = normalized.colorMode === 'custom'
    ? {
      '--hero-header-nav-text': normalized.navTextColor,
      '--hero-header-nav-border': normalized.navBorderColor,
    } as CSSProperties
    : normalized.colorMode === 'surface'
      ? {
        '--hero-header-nav-text': deriveSurfaceColor(
          pageSurfaceConfig.color,
          normalized.navTextSurfaceOffset,
        ),
        '--hero-header-nav-border': deriveSurfaceColor(
          pageSurfaceConfig.color,
          normalized.navBorderSurfaceOffset,
        ),
      } as CSSProperties
      : normalized.colorMode === 'column'
        ? {
          '--hero-header-nav-text': resolveContrastAwareTextColor(
            rightSegmentActualColor,
            normalized.columnTextMinContrast,
            normalized.navTextSurfaceOffset,
          ),
          '--hero-header-nav-border': resolveContrastAwareTextColor(
            rightSegmentActualColor,
            normalized.columnTextMinContrast,
            normalized.navBorderSurfaceOffset,
          ),
        } as CSSProperties
        : undefined;
  const heroHeaderStyle = {
    ...heroHeaderColorStyle,
    // var(--hero-sans) preserves /abstract's exact existing font stack;
    // its own fallback to --site-font-sans covers pages/about.tsx, which
    // renders this same header but never defines --hero-sans itself.
    '--active-heading-font': resolvedFontFamily === 'serif'
      ? 'var(--site-font-serif)'
      : 'var(--hero-sans, var(--site-font-sans))',
    '--nav-letter-spacing': `${normalized.navLetterSpacingEm}em`,
  } as CSSProperties;
  // Degrades whatever's behind the header (a bleeding card/slider) without
  // hiding it outright — see legibilityScrimLeftEnabled/-RightEnabled's own
  // doc comment for why this is a blur, not a flat color, and why it's two
  // independent per-side booleans rather than one applied to the header's
  // whole box: blurring a flat, unbroken color is visually a no-op, so a
  // header-wide blur was only ever visible as a smudge at whatever color
  // seam happened to sit underneath it (e.g. the two columns' own boundary)
  // — exactly the "what's this blurry structure?" symptom that showed this
  // needed scoping in the first place. -webkit- prefixed: Safari still
  // requires it for backdrop-filter.
  const legibilityScrimVisible = legibilityScrimLeftEnabled || legibilityScrimRightEnabled;

  // Desktop-only nav overlay. Two different ways to compute where its
  // split column starts, chosen per the doc comments on navSplitBoundaryPx
  // (SiteHeaderProps) and navAlignedToPageContainer
  // (SiteHeader.config.ts):
  //   - hasMeasuredNavBoundary: a live, viewport-relative pixel position
  //     the hosting page measured from its own real body layout —
  //     gridTemplateColumns takes an absolute px track directly, so no
  //     percentage-of-which-box question even arises.
  //   - otherwise: SPLIT_BAND_GRID_COLS_BY_SIDE's percentage split,
  //     computed either against the header's own full, unpadded width
  //     (default) or the same padded PageContainer box the header's own
  //     logo/nav sit inside (navAlignedToPageContainer) — see that field's
  //     own doc comment for the padding-box-vs-content-box reasoning.
  // Mounted at one of several different points in the tree below depending
  // on which mode is active; the overlay's own JSX never changes.
  // pointer-events is split the same way CardStack.tsx's `.viewport`/
  // `.column` is: the outer grid (and its empty first column, whichever
  // side that is) stays `pointer-events-none` so it never blocks the logo
  // underneath; only the `<nav>` itself re-enables it.
  const navSeparator = (
    <div
      aria-hidden="true"
      style={{
        width: '1px',
        height: `${navSeparatorHeightPx}px`,
        // transparent, not removed from the DOM, while hidden — see
        // navSeparatorVisible's own doc comment on SiteHeaderConfig
        // for why this element's own 1px flex slot has to stay put either
        // way.
        backgroundColor: normalized.navSeparatorVisible ? normalized.navSeparatorColor : 'transparent',
        flexShrink: 0,
      }}
    />
  );
  // True only in the unmeasured, percentage-split fallback with
  // navAlignedToPageContainer on (no page currently sets that combination,
  // but the panel can still toggle it live) — the one state where the grid
  // below already carries paddingX/desktopPaddingX directly on itself, per
  // its own doc comment. Shared between that grid and the PageContainer
  // wrapping it below so the "apply the gutter exactly once, never twice"
  // invariant can't drift between the two independently-written class lists.
  const innerGridHasOwnPadding = !hasMeasuredNavBoundary && normalized.navAlignedToPageContainer;
  const navSplitOverlay = (
    // Positioning shell only — no grid classes here anymore. The grid moved
    // one level down, inside a real PageContainer, so the header's content
    // gets the same capped + centered "bounded column" the body's own
    // SplitColumnLayout already has (matching wideColumnCustomColor/
    // narrowColumnCustomColor's own full-bleed *background*, painted on
    // <header> itself, unaffected — this only caps where the *content*
    // renders, same split as the body's edgeBackdropEnabled + bounded
    // SplitColumnLayout).
    <div
      aria-hidden="false"
      className="pointer-events-none absolute inset-0 z-[2] box-border"
    >
      {/* paddingX/desktopPaddingX here (not further down on the grid —
          see that div's own doc comment on why its own conditional
          padding must stay exactly as-is) is what gives this PageContainer
          the *same* gutter the body's own PageContainer already applies
          (SplitColumnPageShell.tsx's own bounded-content wrapper) —
          previously this box had none, so the header's own left/right
          edges silently extended past the body's own NARROW COLUMN/WIDE
          COLUMN edges by a full gutter's width on each side (confirmed by
          measuring: 0px padding here vs. 48px on the body's own wrapper,
          landing HEADER · LEFT/HEADER · RIGHT's own bounds a matching 48px
          outside NARROW COLUMN/WIDE COLUMN in the layout debug overlay).
          innerGridHasOwnPadding guards the one state where the grid below
          already carries this same padding directly on itself (the
          unmeasured, navAlignedToPageContainer percentage-split fallback)
          — applying it here too in that one case would double it. */}
      <PageContainer
        config={pageSurfaceConfig}
        className={[
          'h-full',
          innerGridHasOwnPadding ? '' : normalized.paddingX,
          innerGridHasOwnPadding ? '' : normalized.desktopPaddingX,
        ].filter(Boolean).join(' ')}
      >
        {/* No container-level items-center anymore (was hardcoded here
            before headerLeftContentVerticalAlign/headerRightContentVerticalAlign
            existed) — CSS Grid's own default (stretch) is what gives each
            cell below real full-height room to position its own content
            via self / items-star instead. A container-level items-center would
            shrink each cell to its own content height first, leaving those
            per-cell fields nothing to work with (confirmed while building
            this — see LayoutDebug.tsx's own doc comment on the identical
            "min-height gives vertical-align real slack" issue elsewhere in
            this codebase).
            cappedContainerRef/cappedContainerLeftPx: navSplitBoundaryPx is a
            *viewport*-relative pixel: gridTemplateColumns below interprets
            it relative to *this* element's own left edge, which is now
            inset from the viewport by PageContainer's own centering above
            — subtracting that measured inset is what keeps the seam
            landing at the correct absolute position instead of silently
            drifting right by exactly that inset (see this component's own
            cappedContainerLeftPx effect for the full reasoning). */}
        <div
          ref={cappedContainerRef}
          className={[
            'grid-cols-1 h-full grid box-border',
            innerGridHasOwnPadding ? normalized.paddingX : '',
            innerGridHasOwnPadding ? normalized.desktopPaddingX : '',
            !hasMeasuredNavBoundary ? MD_SPLIT_BAND_GRID_COLS_BY_SIDE[normalized.splitBandSide] : '',
          ].filter(Boolean).join(' ')}
          style={hasMeasuredNavBoundary
            ? { gridTemplateColumns: `${Math.max(0, resolvedNavBoundaryPx - cappedContainerLeftPx)}px 1fr` }
            : undefined}
        >
      {/* The header's own left content cell — a real CSS Grid item now
          (previously an always-empty aria-hidden placeholder; the logo
          rendered via an absolute right-full trick against nav's own left
          edge instead — see logoAlignedToSplitEnabled's own doc comment in
          SiteHeader.config.ts for why that never moved the split
          seam itself). Stretches to fill the cell (no justify-self/width
          override), matching <nav>'s own structure below exactly:
          headerLeftContentAlign/-VerticalAlign position the logo *within*
          this now-full-cell box via justify-content/align-items on this
          flex container, not a grid item's own self-alignment — same
          mechanism as the right side, for the same reason (a full-cell box
          is what the headerLeft tone overlay below needs to bound; a
          shrink-to-content grid item wouldn't cover the whole cell).
          navSeparator is deliberately NOT moved here with the logo — it
          stays pinned to <nav>'s own left edge below, so non-default logo
          alignment intentionally decouples the two rather than guessing
          how the separator should follow. */}
      <div
        className={[
          'relative h-full flex',
          // headerContentLayoutOwnedByPage: true (posts-lab) skips this
          // segment's own alignment classes entirely — headerLeftSegmentClassName
          // below becomes the sole source of them, computed page-side with
          // real Mobile/Tablet/Desktop tiers instead of this component's
          // own single Tablet-only value. See that field's own doc comment
          // in SiteHeader.config.ts.
          normalized.headerContentLayoutOwnedByPage ? '' : [
            'justify-center',
            FLEX_JUSTIFY_CLASS_MD[normalized.headerLeftContentAlign],
            FLEX_ITEMS_CLASS[normalized.headerLeftContentVerticalAlign],
          ].join(' '),
          normalized.headerLeftSegmentClassName,
        ].filter(Boolean).join(' ')}
      >
        <LayoutDebugOverlay tone="headerLeft" label="HEADER · LEFT" />
        {/* paddingRight: navContentGapPx reproduces the exact gap that used
            to sit between the logo and the separator (the right-full
            trick's own `gap` gave that spacing before) — without it, the
            default 'end' alignment above would land the logo flush against
            the seam with zero gap instead of the original spacing. Only
            applied while the logo actually renders here, so it never
            affects this box when logoAlignedToSplitEnabled is off. Gated a
            second time by logoContentGapPaddingEnabled (default true, so
            every page but posts-lab is unaffected) — an inline style always
            beats a class-based rule regardless of specificity, so leaving
            this unconditional would silently override
            headerLeftContentClassName's own literal padding-right classes
            on any page that (like posts-lab) supplies its own; see that
            field's own doc comment in SiteHeader.config.ts for the
            confirmed symptom this caused before the flag existed. Note for
            headerLeftContentInnerAlignWide below: while this padding is
            still applied, it sits inside the same flex box that field
            centers/ends the logo within, so 'center' lands a few px left of
            true center by half this gap — expected, not a bug (padding is
            part of what's being centered against).
            headerLeftContentWidthWide 'auto' (default): no width class at
            all, unchanged shrink-to-fit. Any other value: 'w-full' is
            added *together* with the chosen max-w-* cap — a max-width
            alone on a flex item that's already narrower than any
            reasonable percentage would never visibly do anything, since
            the item never grows past its own content size without
            w-full first (see SiteHeaderContentWidth's own doc
            comment in SiteHeader.config.ts).
            headerLeftContentInnerAlignWide: positions the logo *within*
            this box via justify-content — distinct from
            headerLeftContentAlign above, which positions this whole box
            within the header's own left segment one level up. 'flex' is
            new on this div for exactly this; deliberately not
            text-align — the logo is a `display: flex` block-level box,
            which text-align has no effect on (confirmed: tried first,
            visibly did nothing). Only visible once this box is wider than
            the logo itself (headerLeftContentWidthWide non-'auto', or the
            box's own min-width otherwise exceeds the logo's natural
            size) — a box exactly as wide as its content has no slack for
            this to move within. 'start' (default) reproduces today's
            flush-left behavior exactly (identical to this div's own
            pre-flex block layout, since a single flex item at
            justify-content: flex-start renders at the same position a
            block child already did). */}
        <div
          className={[
            'relative flex',
            // headerContentLayoutOwnedByPage: true skips both of these too —
            // headerLeftContentClassName below (already page-owned for
            // padding/margin) carries the equivalent literal classes
            // instead, computed page-side with real per-breakpoint tiers.
            normalized.headerContentLayoutOwnedByPage
              ? ''
              : FLEX_JUSTIFY_CLASS[normalized.headerLeftContentInnerAlignWide],
            normalized.headerContentLayoutOwnedByPage
              ? ''
              : (normalized.headerLeftContentWidthWide !== 'auto'
                ? ['w-full', normalized.headerLeftContentWidthWide].join(' ')
                : ''),
            normalized.headerLeftContentClassName,
          ].filter(Boolean).join(' ')}
          style={normalized.logoAlignedToSplitEnabled && normalized.logoContentGapPaddingEnabled
            ? { paddingRight: normalized.navContentGapPx }
            : undefined}
        >
          {normalized.logoAlignedToSplitEnabled ? renderLogo(mergedLogoRef, '') : null}
          <LayoutDebugOverlay tone="contentBox" label="HEADER · LEFT CONTENT" />
        </div>
      </div>
      {/* The header's own right content cell — <nav> was already a flex row
          (items-center hardcoded); headerRightContentAlign/-VerticalAlign
          make that justify-content/align-items pair configurable instead,
          positioning <nav>'s own children (the separator + nav items,
          together) within nav's own box, which stretches to fill this
          cell (see the container className's own doc comment above on why
          that stretch matters). */}
      <nav
        ref={primaryNavRef}
        aria-label="Primary navigation"
        className={[
          styles.primaryNav,
          'pointer-events-auto relative flex',
          // headerContentLayoutOwnedByPage: same skip as the left segment
          // above — headerRightSegmentClassName becomes the sole source.
          normalized.headerContentLayoutOwnedByPage ? '' : [
            'justify-center',
            FLEX_JUSTIFY_CLASS_MD[normalized.headerRightContentAlign],
            FLEX_ITEMS_CLASS[normalized.headerRightContentVerticalAlign],
          ].join(' '),
          normalized.headerRightSegmentClassName,
        ].filter(Boolean).join(' ')}
      >
        <LayoutDebugOverlay tone="headerRight" label="HEADER · RIGHT" />
        {/* Wraps the separator + ul (nav's own visible content) so the
            debug overlay below tightly bounds and moves with them —
            <nav> itself always stretches to fill the full cell (see the
            container className's own doc comment above), so an overlay
            placed directly on <nav> would always show the full cell
            width regardless of headerRightContentAlign, never reflecting
            where the content actually moved to. headerRightContentWidthWide:
            same 'auto' vs 'w-full'+cap mechanism as the left cell's own
            content box — see that div's own doc comment above.
            headerRightContentInnerAlignWide: same idea as
            headerLeftContentInnerAlignWide (see that field's own doc
            comment) applied here instead — positions the separator + ul
            *together* as one unit within this box via justify-content.
            This div was already `flex` (unlike the left cell's own content
            box, which needed it added) since the separator + ul already
            needed to lay out side by side; only the justify-content class
            itself is new. 'start' (default) reproduces today's flush-left
            behavior exactly. */}
        <div
          className={[
            // w-full unconditional below md (not just when
            // headerRightContentWidthWide is set) — below md this is the
            // <ul>'s own definite-width ancestor: the deleted mobile-only
            // block's own <nav> used to be w-[min(100%,360px)] itself,
            // giving its direct <ul> child's own w-full something real to
            // resolve against; this div is that ancestor now, so it needs
            // the same width or the grid-cols-3 nav items below collapse
            // toward each other instead of spreading across three even
            // columns (confirmed by live screenshot before this fix —
            // ABOUT/JOURNAL/CONTACT collided). md:w-auto reverts to
            // shrink-to-fit from md upward when headerRightContentWidthWide
            // is 'auto' (today's default) — this div genuinely rendered at
            // md+ before this change too (unlike the ul's own width, which
            // only matters below md), so its own desktop shrink-to-fit
            // behavior — what gives headerRightContentAlign's own
            // justify-content on <nav> real room to position this div
            // within — must stay exactly as before at md+.
            'relative flex w-full items-center',
            // headerContentLayoutOwnedByPage: same skip as the left cell's
            // own inner content box above — headerRightContentClassName
            // (already page-owned for padding/margin) carries the
            // equivalent literal classes instead, including its own
            // width-or-shrink-to-fit chain. The base 'w-full' just above
            // stays unconditional either way — it's what gives the <ul>
            // below its own definite-width ancestor (see that div's own
            // doc comment), unrelated to who owns alignment/width.
            normalized.headerContentLayoutOwnedByPage
              ? ''
              : FLEX_JUSTIFY_CLASS[normalized.headerRightContentInnerAlignWide],
            normalized.headerContentLayoutOwnedByPage
              ? ''
              : (normalized.headerRightContentWidthWide !== 'auto'
                ? normalized.headerRightContentWidthWide
                : 'md:w-auto'),
            normalized.headerRightContentClassName,
          ].filter(Boolean).join(' ')}
        >
          {navSeparator}
          <ul
            className={`m-0 grid w-full list-none grid-cols-3 items-center p-0 md:flex md:w-auto ${normalized.mobileNavGap} ${normalized.navGap}`}
            // headerContentLayoutOwnedByPage: true (posts-lab) suppresses
            // this inline gap-from-separator style entirely — that page's
            // own headerRightContentPaddingLeft/-Wide/-Lg (already real,
            // already per-breakpoint, already folded into
            // headerRightContentClassName on the wrapping div) become the
            // sole source of this edge's spacing instead, closing the
            // "shared navContentGapPx leaking into this page's own layout"
            // complaint at the source. Every other page keeps this exactly
            // as before.
            style={normalized.headerContentLayoutOwnedByPage
              ? undefined
              : { paddingLeft: `${normalized.navContentGapPx}px` }}
          >
            {renderNavItems(normalized.mobileContactPlain)}
          </ul>
          <LayoutDebugOverlay tone="contentBox" label="HEADER · RIGHT CONTENT" />
        </div>
      </nav>
        </div>
      </PageContainer>
    </div>
  );

  return (
    <header
      className={[
        styles.siteHeader,
        // pointer-events-none unconditionally (mobile and desktop alike) —
        // now that SplitColumnPageShell can render this header as a
        // permanently position: fixed overlay floating over real,
        // interactive content beneath it (a column set to 'float' in
        // splitColumnLayoutConfig's *ColumnHeaderBehavior), the
        // header's own empty/dead space (the gap around the logo/nav, any
        // area no child explicitly claims) must never capture clicks meant
        // for whatever's underneath. The logo (renderLogo) and both nav
        // rows already explicitly opt back into pointer-events-auto
        // themselves — this was already the pattern the split-aligned nav
        // overlay used for exactly this reason (see its own doc comment
        // just above); the header's own box was the one piece still
        // claiming pointer-events-auto wholesale at desktop.
        'relative z-[1000] flex w-full shrink-0 items-center justify-center pointer-events-none',
        normalized.height,
        normalized.desktopHeight,
        normalized.paddingY,
        normalized.desktopPaddingY,
        normalized.marginTop,
        normalized.marginBottom,
        normalized.desktopMarginTop,
        normalized.desktopMarginBottom,
        // overflow-hidden clips to the header's own box — right for the nav
        // band (its canvas should never bleed past the header), wrong for
        // the split band and legibility scrim overlays (both deliberately
        // bleed upward past the header's own top edge to cover the
        // marginTop gap above it — see their own classNames below). isolate
        // alone (no clipping) still gives either its own stacking context.
        navBandActive ? 'isolate overflow-hidden' : (splitBandVisible || legibilityScrimVisible) ? 'isolate' : '',
      ].filter(Boolean).join(' ')}
      data-color-mode={normalized.colorMode}
      data-ink-tone={dataInkTone}
      data-nav-band={navBandActive ? 'true' : undefined}
      data-split-band={splitBandVisible ? 'true' : undefined}
      style={heroHeaderStyle}
    >
      {navBandActive ? (
        <canvas
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 block h-full w-full [transition-property:opacity,filter] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          ref={navBandCanvasRef}
          style={{
            filter: navBandColorFilter,
            opacity: normalized.navBandOpacity,
          }}
        />
      ) : null}
      {splitBandVisible ? (
        // Same 38/62 ratio as about.module.css's own .splitGrid — literal
        // here (Tailwind arbitrary value) since a CSS module can't share a
        // JS/CSS constant with this component; kept in sync by convention.
        // top is bled upward by the header's own marginTop (see the lookup
        // tables above) instead of using inset-0, so the split band covers
        // the margin gap above the header too, not just the header's own box.
        // When a page supplies navSplitBoundaryPx (see navSplitOverlay's own
        // doc comment above for the same pattern), that live-measured pixel
        // replaces the plain percentage split here too — otherwise this
        // band's own seam and the nav overlay's/body grid's real seam are
        // two independently-computed values that can silently drift apart
        // at some viewport widths, the same class of bug this codebase has
        // hit more than once (see navSplitBoundaryPx's own doc comment).
        <div
          aria-hidden="true"
          className={[
            'pointer-events-none absolute inset-x-0 bottom-0 z-0 grid',
            splitBandStacked
              ? SPLIT_BAND_STACKED_GRID_CLASS
              : (!hasMeasuredSplitBandBoundary ? SPLIT_BAND_GRID_COLS_BY_SIDE[normalized.splitBandSide] : ''),
            NEGATIVE_TOP_BY_MARGIN_TOP[normalized.marginTop],
            NEGATIVE_TOP_BY_DESKTOP_MARGIN_TOP[normalized.desktopMarginTop],
          ].filter(Boolean).join(' ')}
          style={!splitBandStacked && hasMeasuredSplitBandBoundary ? { gridTemplateColumns: `${resolvedSplitBandBoundaryPx}px 1fr` } : undefined}
        >
          <div
            data-header-split-band="left"
            className="relative overflow-hidden"
            style={{ backgroundColor: splitBandLeftColor, transition: splitBandTransition }}
          >
            {splitBandLeftBackgroundSlot ? (
              <div className="absolute inset-0 pointer-events-none">{splitBandLeftBackgroundSlot}</div>
            ) : null}
          </div>
          <div
            data-header-split-band="right"
            className="relative overflow-hidden"
            style={{ backgroundColor: splitBandRightColor, transition: splitBandTransition }}
          >
            {splitBandRightBackgroundSlot ? (
              <div className="absolute inset-0 pointer-events-none">{splitBandRightBackgroundSlot}</div>
            ) : null}
          </div>
        </div>
      ) : null}
      {legibilityScrimVisible ? (
        // Same 38/62 geometry as the split-band overlay just above (down to
        // reusing normalized.splitBandSide/navSplitBoundaryPx for the same
        // seam-drift reason that overlay's own doc comment already covers)
        // — a deliberately separate DOM node, not merged into that overlay,
        // since the two features have independent toggles and a page can
        // have one without the other (e.g. this repo's own default: the
        // split band off, the scrim on for whichever side floats). Each
        // side's own backdrop-filter is applied only when that physical
        // side's own boolean is true — a 'pushDown' side has nothing
        // rendering underneath the header to blur, so it gets `undefined`
        // (no filter), not a wasted always-on blur over a flat color, which
        // is exactly what read as a stray blurry seam before this was
        // scoped per side.
        <div
          aria-hidden="true"
          className={[
            'pointer-events-none absolute inset-x-0 bottom-0 z-0 grid',
            !hasMeasuredNavBoundary ? SPLIT_BAND_GRID_COLS_BY_SIDE[normalized.splitBandSide] : '',
            NEGATIVE_TOP_BY_MARGIN_TOP[normalized.marginTop],
            NEGATIVE_TOP_BY_DESKTOP_MARGIN_TOP[normalized.desktopMarginTop],
          ].filter(Boolean).join(' ')}
          style={hasMeasuredNavBoundary ? { gridTemplateColumns: `${resolvedNavBoundaryPx}px 1fr` } : undefined}
        >
          <div style={legibilityScrimLeftEnabled ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as CSSProperties : undefined} />
          <div style={legibilityScrimRightEnabled ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as CSSProperties : undefined} />
        </div>
      ) : null}
      <PageContainer
        className={[
          'relative z-[1] flex flex-col items-center justify-center',
          normalized.paddingX,
          normalized.desktopPaddingX,
          normalized.gap,
          normalized.desktopGap,
          'md:flex-row md:items-center md:justify-between',
        ].filter(Boolean).join(' ')}
        config={pageSurfaceConfig}
      >
        {/* Mode 1 only (navAlignedToSplitEnabled false — /design-system
            today). Mode 2 (navAlignedToSplitEnabled true — /about, /contact,
            /abstract, /posts-lab) renders logo+nav exclusively through
            navSplitOverlay below now, which is present (not hidden) at
            every breakpoint — this block used to double as Mode 2's own
            mobile-only renderer (its own nav row getting md:hidden from md
            upward while the overlay handled desktop); that split no longer
            exists, so this block simply doesn't mount at all for Mode 2. */}
        {!normalized.navAlignedToSplitEnabled ? (
          <>
            {renderLogo(
              normalized.logoAlignedToSplitEnabled ? logoAnchorRef : mergedLogoRef,
              normalized.logoAlignedToSplitEnabled ? 'md:hidden' : '',
            )}
            <nav
              ref={primaryNavRef}
              aria-label="Primary navigation"
              className={`${styles.primaryNav} pointer-events-auto relative w-[min(100%,360px)] shrink-0 md:w-auto`}
            >
              <ul className={`m-0 grid w-full list-none grid-cols-3 items-center p-0 md:flex md:w-auto ${normalized.mobileNavGap} ${normalized.navGap}`}>
                {renderNavItems(normalized.mobileContactPlain)}
              </ul>
            </nav>
          </>
        ) : null}
        {/* navAlignedToPageContainer (percentage mode only — a measured
            boundary is already an absolute px offset from the header's own
            left edge, so it mounts as PageContainer's sibling below
            regardless, same as the default percentage mode) mounts the
            split-aligned overlay *inside* this same PageContainer instead
            of escaping it — for a page whose body split is *also* wrapped
            in an identically-configured PageContainer (e.g. /abstract's
            "bounded" contentContainer, when not using a measured
            boundary), the true split boundary is a percentage of *this*
            box, not the header's full width. */}
        {normalized.navAlignedToSplitEnabled && normalized.navAlignedToPageContainer && !hasMeasuredNavBoundary
          ? navSplitOverlay : null}
      </PageContainer>
      {normalized.navAlignedToSplitEnabled && (!normalized.navAlignedToPageContainer || hasMeasuredNavBoundary)
        ? navSplitOverlay : null}
    </header>
  );
}

export default SiteHeader;
