import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, Ref } from 'react';
import { LayoutDebugOverlay, type LayoutDebugOverlayLabel } from '../../../components/LayoutDebug';
import { SplitColumnPageShell, type HeaderSlotProps } from './SplitColumnPageShell';
import { narrowColumnFractionForTier } from './SplitColumnLayout';
import {
  computeNavSplitBoundaryPx,
  type SplitColumnNavAlignment,
} from './SplitColumnPageShell/hooks/useSplitColumnNavAlignment';
import { useBreakpointTier, type BreakpointTier } from '../../../components/useBreakpointTier';
import { tailwindSpacingTokenToPx } from '../../../components/tailwindSpacingScale';
import { deriveSurfaceColor } from '../../../helpers/surfaceColorDerivation';
import type { PageSurfaceConfig } from '../../../components/PageSurface.config';
import { normalizePageSurfaceConfig } from '../../../components/PageSurface.config';
import {
  CONTENT_ALIGN_MARGIN_CLASS,
  CONTENT_ALIGN_MARGIN_CLASS_WIDE,
  CONTENT_ALIGN_MARGIN_CLASS_LG,
  WIDE_COLUMN_CONTENT_MATCH_NARROW_CLASS_WIDE,
  WIDE_COLUMN_CONTENT_MATCH_NARROW_CLASS_LG,
  normalizePolymorphicLayoutConfig,
  type PolymorphicLayoutConfig,
  type PolymorphicLayoutRatioTier,
  type PolymorphicLayoutContentContainerAlign,
} from './PolymorphicLayout.config';

/**
 * The real, shared `PolymorphicLayoutConfig` rendering component — every
 * real `PolymorphicLayoutConfig` consumer (`/contact`, `/about`,
 * `/posts-lab/[slug]`, `/abstract`'s own `splitColumn` presentation) calls
 * this directly instead of each hand-computing their own breakpoint-tier
 * color resolution and column class joins (see PLAN-SPLIT-COLUMN-LAYOUT-
 * ENRICHMENT-EXTRACTION.md's own correction — "we're not reusing, we're
 * duplicating" — for why a config type + panel definition without a real
 * shared render layer isn't actually one shared layout). Wraps
 * `SplitColumnPageShell` — every generic body/header-seam mechanism a page
 * previously had to reimplement by hand now lives here once: breakpoint-
 * tier color/width resolution, physical column color mapping, split-band
 * boundary resolution, the body columns' own bottom content-container
 * assembly (outer padding/margin classes + the inner width/align/min-
 * height/vertical-align wrapper, gated by wideColumnContentContainer/
 * narrowColumnContentContainer). A page supplies only its own config
 * instance, its own top/bottom content, its own concrete `header` render-
 * prop, and the handful of genuinely page-specific inputs below — never
 * the container-building logic itself.
 *
 * This component renders no concrete header of its own (PLAN-POLYMORPHIC-
 * LAYOUT-DECOUPLING.md) — a page's own `header` render-prop constructs
 * whatever header component it needs (in practice, always
 * `<SiteHeader>` today, but this file has no dependency on that or
 * any other concrete header component), receiving `HeaderSlotProps` (see
 * that type's own doc comment, experiences/abstract/components/SplitColumnPageShell.tsx) for
 * everything this component's own internal machinery computes that a page
 * can't reconstruct itself. `experiences/abstract/components/
 * SiteHeader/buildEffectiveSiteHeaderConfig.ts` is the one
 * shared implementation of turning this component's own `PolymorphicLayoutConfig`
 * `header*` fields into a concrete `SiteHeaderConfig` — every
 * migrated page calls it directly inside its own `header` render function,
 * the same way this component used to call it internally before every page
 * migrated off the old, hardcoded prop surface.
 *
 * Header/body seam alignment is unconditional, internal behavior — not a
 * page-configurable flag. `SplitColumnPageShell`'s own `autoAlignNavSplit`
 * is always passed `true` here: `HeaderSlotProps.navSplitBoundaryPx` is
 * always the real, live-measured position of the body's own column split,
 * never an independently-computed percentage that can silently drift from
 * it. That drift is exactly what caused `/about`'s header/body seam
 * misalignment when this page first adopted `PolymorphicLayout` — the
 * static-percentage fallback (used whenever a page didn't opt into
 * `autoAlignNavSplit`) computes 38% of the header's own padded
 * `PageContainer` width, while the body's real 38% is a fraction of the
 * *viewport* (when `contentContainer: 'full-bleed'` with no body gutter,
 * as `/about` uses) — two independently-computed numbers with no reason
 * to agree at every viewport width. Making measurement mandatory here,
 * not opt-in, is what makes that class of bug structurally impossible for
 * every current and future consumer of this component, not just the ones
 * that remembered to ask for it.
 */

const COLOR_SOURCE_NONE_FALLBACK = 'transparent';

function resolveColorTier<T>(tier: BreakpointTier, base: T, wide: T, lg: T): T {
  return tier === 'lg' ? lg : tier === 'md' ? wide : base;
}

/** `none`/`custom`/`surface` are fully generic — resolved here with no
 * page knowledge. `palette` is inherently page-specific (what "index"/
 * "stop count"/"ramp" mean is that page's own content business, e.g.
 * /about's own dock-slide palette) — resolved via the caller-supplied
 * `paletteColorResolver`, never invented here. Falls back to `'transparent'`
 * for `palette` when no resolver is supplied (matches `colorSource: 'none'`'s
 * own "page surface shows through" intent — this function has no page
 * surface color to fall back to by itself, so the caller's own
 * `pageSurfaceConfig` is expected to already be painted behind whatever
 * uses this return value). */
function resolveColumnColor(
  colorSource: PolymorphicLayoutConfig['colorSource'],
  customColor: string,
  surfaceOffset: number,
  pageSurfaceColor: string,
  paletteColorResolver: ((column: 'wide' | 'narrow') => string) | undefined,
  column: 'wide' | 'narrow',
): string {
  if (colorSource === 'custom') return customColor;
  if (colorSource === 'surface') return deriveSurfaceColor(pageSurfaceColor, surfaceOffset);
  if (colorSource === 'palette') {
    return paletteColorResolver ? paletteColorResolver(column) : COLOR_SOURCE_NONE_FALLBACK;
  }
  return COLOR_SOURCE_NONE_FALLBACK;
}

export type PolymorphicLayoutResolvedColors = {
  breakpointTier: BreakpointTier;
  viewportWidthPx: number | undefined;
  wideColumnColor: string;
  narrowColumnColor: string;
  physicalLeftColumnColor: string;
  physicalRightColumnColor: string;
  resolvedSplitBandLeftColor: string;
  resolvedSplitBandRightColor: string;
  /** The left segment's own real, physically-painted background — the same
   * value the decorative split-band div actually paints when the band is
   * on and not 'transparent' at the current tier; falling back to
   * physicalLeftColumnColor (the real column background, which still
   * extends full-height behind a merely-transparent band) when the band
   * itself paints nothing, and only collapsing to the flat page surface
   * when headerSplitBandEnabled is off entirely (no split-column concept
   * configured, so there's truly nothing but the page surface behind the
   * header). Distinct from resolvedSplitBandLeftColor above:
   * that value is 'transparent' whenever the band mode is 'transparent' or
   * the whole band is disabled, which is a legitimate CSS paint instruction
   * but never a legitimate CONTRAST BASIS — deriving a logo/nav-text color
   * against literal 'transparent' means deriving it against whatever
   * arbitrary color a contrast helper falls back to internally, not what a
   * user actually sees. Any page-level element whose own color needs to
   * read correctly against "whatever's really behind the header's left
   * segment" (a logo, nav text) should read this field, not
   * resolvedSplitBandLeftColor directly — see SiteHeader.tsx's own
   * rightSegmentActualColor/physicalRightColumnColor for the mirrored
   * right-segment convention this generalizes (BUG-012,
   * BUGS-AUDIT-POLYMORPHIC-LAYOUT-CARD-STACK.md). Computed once, here, in
   * the one shared hook every PolymorphicLayoutConfig-integrated page
   * already calls — not independently re-derived per page (that
   * duplication is exactly how /abstract's own header logo got this fix
   * while /about's own separately-hand-rolled version never did,
   * operator-reported, 2026-08-24). */
  actualLeftSegmentColor: string;
  /** Same contract as actualLeftSegmentColor above, for the right segment. */
  actualRightSegmentColor: string;
  /** True when the current tier's splitBandWidthTier is 'stacked' — no
   * horizontal split configured, so SiteHeader renders the two band
   * segments as a vertical stack instead of side-by-side. See
   * SiteHeader's own splitBandStacked prop doc comment. */
  splitBandStacked: boolean;
  splitBandBoundaryPx: number | undefined;
};

/** Standalone, exported so a page needing to layer its own logic on top
 * of the shared resolution (e.g. /about's own header-color override while
 * its Spacefield background is visible, or a nav control deriving its
 * idle/hover fill from the resolved split-band color) can read the exact
 * same values `<PolymorphicLayout>` itself uses internally — not a
 * second, independently-computed copy. */
export function usePolymorphicLayoutColors(
  config: PolymorphicLayoutConfig,
  pageSurfaceColor: string,
  paletteColorResolver?: (column: 'wide' | 'narrow') => string,
): PolymorphicLayoutResolvedColors {
  const { tier: breakpointTier, viewportWidthPx } = useBreakpointTier();
  const tier = <T,>(base: T, wide: T, lg: T) => resolveColorTier(breakpointTier, base, wide, lg);

  const wideColumnCustomColor = tier(
    config.wideColumnCustomColor, config.wideColumnCustomColorWide, config.wideColumnCustomColorLg,
  );
  const narrowColumnCustomColor = tier(
    config.narrowColumnCustomColor, config.narrowColumnCustomColorWide, config.narrowColumnCustomColorLg,
  );
  // Resolved per-tier, not just the custom color/offset value within it — a
  // page can now genuinely run a different color source per breakpoint
  // (e.g. 'none' on mobile, 'custom' from tablet up), not just a different
  // color while stuck on whichever source the base/mobile tier picked. Same
  // fix as splitBandLeftModeResolved/splitBandRightModeResolved below,
  // applied to the column background's own source instead of the header
  // band's.
  const colorSourceResolved = tier(config.colorSource, config.colorSourceWide, config.colorSourceLg);
  const wideColumnSurfaceOffset = tier(
    config.wideColumnSurfaceOffset, config.wideColumnSurfaceOffsetWide, config.wideColumnSurfaceOffsetLg,
  );
  const narrowColumnSurfaceOffset = tier(
    config.narrowColumnSurfaceOffset, config.narrowColumnSurfaceOffsetWide, config.narrowColumnSurfaceOffsetLg,
  );
  const wideColumnColor = resolveColumnColor(
    colorSourceResolved, wideColumnCustomColor, wideColumnSurfaceOffset,
    pageSurfaceColor, paletteColorResolver, 'wide',
  );
  const narrowColumnColor = resolveColumnColor(
    colorSourceResolved, narrowColumnCustomColor, narrowColumnSurfaceOffset,
    pageSurfaceColor, paletteColorResolver, 'narrow',
  );

  const physicalLeftColumnColor = config.wideColumnSide === 'left' ? wideColumnColor : narrowColumnColor;
  const physicalRightColumnColor = config.wideColumnSide === 'left' ? narrowColumnColor : wideColumnColor;

  const splitBandLeftCustomColor = tier(
    config.splitBandLeftCustomColor, config.splitBandLeftCustomColorWide, config.splitBandLeftCustomColorLg,
  );
  const splitBandRightCustomColor = tier(
    config.splitBandRightCustomColor, config.splitBandRightCustomColorWide, config.splitBandRightCustomColorLg,
  );
  // Resolved per-tier, not just the custom color value within it — a page
  // can now genuinely run a different mode per breakpoint (e.g. transparent
  // on mobile, a custom color from tablet up), not just a different color
  // while stuck on whichever mode the base/mobile tier happened to pick.
  const splitBandLeftModeResolved = tier(
    config.splitBandLeftMode, config.splitBandLeftModeWide, config.splitBandLeftModeLg,
  );
  const splitBandRightModeResolved = tier(
    config.splitBandRightMode, config.splitBandRightModeWide, config.splitBandRightModeLg,
  );
  const resolvedSplitBandLeftColor = splitBandLeftModeResolved === 'transparent'
    ? 'transparent'
    : splitBandLeftModeResolved === 'custom'
      ? splitBandLeftCustomColor
      : physicalLeftColumnColor;
  const resolvedSplitBandRightColor = splitBandRightModeResolved === 'transparent'
    ? 'transparent'
    : splitBandRightModeResolved === 'custom'
      ? splitBandRightCustomColor
      : physicalRightColumnColor;

  const splitBandWidthTierResolved = tier(
    config.splitBandWidthTier, config.splitBandWidthTierWide, config.splitBandWidthTierLg,
  );
  const splitBandNarrowFraction = narrowColumnFractionForTier(splitBandWidthTierResolved);
  const splitBandBoundaryPx = splitBandNarrowFraction !== undefined && viewportWidthPx !== undefined
    ? computeNavSplitBoundaryPx(viewportWidthPx, config.wideColumnSide, splitBandNarrowFraction)
    : undefined;
  // 'stacked' (splitBandNarrowFraction undefined): no horizontal split
  // configured at this breakpoint. Previously this collapsed the right
  // segment's own color to match the left segment's, so the two-cell
  // horizontal grid painted as one unified band regardless of each
  // segment's own independently configured mode/color — the exact
  // "all sizes" collapsing this type's per-tier fields were built to
  // eliminate elsewhere (BUG-010, BUGS-AUDIT-POLYMORPHIC-LAYOUT-CARD-STACK.md).
  // Both segments now always resolve their own real, independent color;
  // SiteHeader itself renders the two segments as a vertical stack instead
  // of side-by-side whenever splitBandStacked is true (see that prop's own
  // doc comment, SiteHeader.tsx), so a genuinely different color per
  // segment is visible even with no horizontal split to show them across.
  const splitBandStacked = splitBandNarrowFraction === undefined;

  // See actualLeftSegmentColor/-RightSegmentColor's own doc comments above.
  // headerSplitBandEnabled off means no split-column concept is configured
  // at all, so there's genuinely nothing but the flat page surface behind
  // the header — pageSurfaceColor is correct there. But when the band IS
  // enabled and merely painting 'transparent' (a real, supported band
  // mode), the columns (wideColumnColor/narrowColumnColor, 100dvh,
  // rendered behind the header) are still physically there — falling all
  // the way to pageSurfaceColor in that case was BUG-012's exact pattern
  // recurring one level up: skipping physicalLeftColumnColor/
  // physicalRightColumnColor (the real, physically-painted column color)
  // and landing on the flat surface instead, which is what let the header
  // logo/nav derive a contrast color against a background nobody actually
  // sees once the band goes transparent over a colored column (operator-
  // reported, 2026-08-24).
  const actualLeftSegmentColor = !config.headerSplitBandEnabled
    ? pageSurfaceColor
    : resolvedSplitBandLeftColor !== 'transparent'
      ? resolvedSplitBandLeftColor
      : physicalLeftColumnColor;
  const actualRightSegmentColor = !config.headerSplitBandEnabled
    ? pageSurfaceColor
    : resolvedSplitBandRightColor !== 'transparent'
      ? resolvedSplitBandRightColor
      : physicalRightColumnColor;

  return {
    breakpointTier,
    viewportWidthPx,
    wideColumnColor,
    narrowColumnColor,
    physicalLeftColumnColor,
    physicalRightColumnColor,
    resolvedSplitBandLeftColor,
    resolvedSplitBandRightColor,
    actualLeftSegmentColor,
    actualRightSegmentColor,
    splitBandStacked,
    splitBandBoundaryPx,
  };
}

/**
 * Live, viewport-relative bottom edge of the page's own fixed/floating
 * `<header>` — the same raw measurement `useFixedViewportColumnLayout`
 * (`SplitColumnPageShell/hooks/`) already proves out for `useCardStackLayout`'s
 * own "clear the header" math, given its own minimal hook here (no anchor
 * ref, no fixed-left/width tracking — a consumer that only needs this one
 * number shouldn't have to carry that unrelated baggage). Unlike that
 * hook's own anchor measurement, this doesn't need a no-deps layout effect
 * to catch position shifts from unrelated layout changes — the header
 * itself is what's being measured, and its own ResizeObserver already
 * fires on every height change; a plain effect (not `useLayoutEffect`,
 * which — confirmed via this file's own test suite — trips React's SSR
 * warning whenever `PolymorphicLayout` renders through
 * `renderToStaticMarkup`) is sufficient and SSR-safe.
 *
 * This is the one, centralized answer to "how far down does the real,
 * current header actually reach" — a continuous, live-measured quantity
 * with no static Tailwind-class equivalent, the same category of exception
 * `narrowColumnMobileAlignOffsetPx`'s own doc comment already documents
 * (`PolymorphicLayout.config.ts`). Any column content that needs to avoid
 * sitting under a `*ColumnHeaderBehavior: 'float'` header (nothing reserves
 * space for it, so content must self-offset) should read this instead of
 * hand-tuning its own per-viewport-combination magic numbers — see
 * `AbstractEditorialHero.module.css`'s own former hardcoded 136px/168px
 * rules, now `headerBottomPx + 24` computed live via this hook instead of
 * two separately-guessed constants.
 */
export function usePolymorphicLayoutHeaderBottomPx(): number {
  const [headerBottomPx, setHeaderBottomPx] = useState(0);
  const lastMeasuredRef = useRef(0);

  const measure = useCallback(() => {
    if (typeof window === 'undefined') return;
    const headerEl = document.querySelector('header');
    const next = headerEl ? headerEl.getBoundingClientRect().bottom : 0;
    if (lastMeasuredRef.current !== next) {
      lastMeasuredRef.current = next;
      setHeaderBottomPx(next);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    measure();
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('scroll', measure);
    const headerEl = document.querySelector('header');
    const observer = typeof ResizeObserver === 'function' && headerEl
      ? new ResizeObserver(measure)
      : null;
    if (observer && headerEl) observer.observe(headerEl);
    return () => {
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [measure]);

  return headerBottomPx;
}

function joinClasses(...classes: ReadonlyArray<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** The body columns' own bottom content-container assembly — outer grid-
 * cell padding/margin/vertical-align classes, mirroring
 * pages/posts-lab/[slug].tsx's own former wideColumnClassName/
 * narrowColumnClassName joins exactly (now the one real implementation).
 * `ownClassName` is the page's own structural/chrome class(es) (posts-lab's
 * `min-h-[100dvh] flex flex-col`, about's `styles.splitRight`) — appended
 * *before* the config-driven classes below, same order posts-lab's own
 * code already used, so a page's own layout-critical classes (e.g. the
 * `flex flex-col` that makes `*ContentVerticalAlign`'s `justify-*` value
 * meaningful) stay under that page's own control rather than being
 * silently assumed by this shared function. */
function buildWideColumnClassName(config: PolymorphicLayoutConfig, ownClassName?: string): string {
  return joinClasses(
    ownClassName,
    config.wideColumnContentPaddingTop,
    config.wideColumnContentPaddingTopWide,
    config.wideColumnContentPaddingTopLg,
    config.wideColumnContentPaddingRight,
    config.wideColumnContentPaddingRightWide,
    config.wideColumnContentPaddingRightLg,
    config.wideColumnContentPaddingBottom,
    config.wideColumnContentPaddingBottomWide,
    config.wideColumnContentPaddingBottomLg,
    config.wideColumnContentPaddingLeft,
    config.wideColumnContentPaddingLeftWide,
    config.wideColumnContentPaddingLeftLg,
    config.wideColumnContentMarginTop,
    config.wideColumnContentMarginTopWide,
    config.wideColumnContentMarginTopLg,
    config.wideColumnContentMarginRight,
    config.wideColumnContentMarginRightWide,
    config.wideColumnContentMarginRightLg,
    config.wideColumnContentMarginBottom,
    config.wideColumnContentMarginBottomWide,
    config.wideColumnContentMarginBottomLg,
    config.wideColumnContentMarginLeft,
    config.wideColumnContentMarginLeftWide,
    config.wideColumnContentMarginLeftLg,
    config.wideColumnContentVerticalAlign,
    // Wide/Lg tiers of the same field — previously missing here (only the
    // base tier ever applied to this outer grid cell), a pre-existing gap
    // that matters specifically for 'full-bleed' content (no ColumnContentBox
    // wrapper rendered, so this outer class is the only thing providing
    // vertical positioning at any tier).
    config.wideColumnContentVerticalAlignWide,
    config.wideColumnContentVerticalAlignLg,
  );
}

function buildNarrowColumnClassName(config: PolymorphicLayoutConfig, ownClassName?: string): string {
  return joinClasses(
    ownClassName,
    // Top/Right/Left were missing here entirely until this fix — declared
    // on PolymorphicLayoutConfig, defaulted, panel-editable (every
    // PolymorphicLayout consumer's own settings panel showed them), yet
    // never read by this function, so changing them had zero visible
    // effect on /about, /contact, or /abstract (only pages/posts-lab/
    // [slug].tsx's own separate, hand-rolled render path — which reads the
    // same PolymorphicLayoutConfig fields directly, not through this
    // function — ever consumed them, for its own bespoke sticky-TOC-sidebar
    // DOM shape). Folded in at the same position buildWideColumnClassName's
    // own equivalent fields already occupy, since this generic narrow
    // column (unlike posts-lab's own two-element sticky wrapper) is a
    // single outer box, same shape as the wide column's own.
    config.narrowColumnContentPaddingTop,
    config.narrowColumnContentPaddingTopWide,
    config.narrowColumnContentPaddingTopLg,
    config.narrowColumnContentPaddingRight,
    config.narrowColumnContentPaddingRightWide,
    config.narrowColumnContentPaddingRightLg,
    config.narrowColumnContentPaddingBottom,
    config.narrowColumnContentPaddingBottomWide,
    config.narrowColumnContentPaddingBottomLg,
    config.narrowColumnContentPaddingLeft,
    config.narrowColumnContentPaddingLeftWide,
    config.narrowColumnContentPaddingLeftLg,
    config.narrowColumnContentMarginTop,
    config.narrowColumnContentMarginTopWide,
    config.narrowColumnContentMarginTopLg,
    config.narrowColumnContentMarginRight,
    config.narrowColumnContentMarginRightWide,
    config.narrowColumnContentMarginRightLg,
    config.narrowColumnContentMarginBottom,
    config.narrowColumnContentMarginBottomWide,
    config.narrowColumnContentMarginBottomLg,
    config.narrowColumnContentMarginLeft,
    config.narrowColumnContentMarginLeftWide,
    config.narrowColumnContentMarginLeftLg,
    // Previously missing at every tier on this outer grid cell — see
    // buildWideColumnClassName's own comment above for why this matters
    // specifically for 'full-bleed' content.
    config.narrowColumnContentVerticalAlign,
    config.narrowColumnContentVerticalAlignWide,
    config.narrowColumnContentVerticalAlignLg,
  );
}

/** The reusable content-container primitive underneath both
 * `WideColumnContent`/`NarrowColumnContent` below — two nested boxes,
 * matching the shape pages/posts-lab/[slug].tsx's own hand-rolled
 * article/TOC containers already proved out
 * (PLAN-POLYMORPHIC-LAYOUT-CONTENT-CONTAINER-PRIMITIVE.md), then promoted
 * again into a standalone, directly-composable export
 * (PLAN-POLYMORPHIC-LAYOUT-CONTENT-CONTAINER-UNIFICATION.md) so a page with
 * a genuinely different structural need (overlay chrome escaping the box, a
 * container-query context, live sticky positioning) can compose the real
 * primitive directly instead of the coordinator growing a per-page escape
 * hatch on `PolymorphicLayoutConfig`:
 *   - outer: `flex flex-col` + verticalAlign*  (justify-content) + minHeight
 *     (the slack that vertical-align distributes into) — positions the
 *     inner box *within the column's own block*.
 *   - inner: width* (a literal percentage-of-column max-width, 'auto'/
 *     undefined for shrink-to-fit) + align* (a margin-based horizontal
 *     position for that width-capped box) + textAlign* (the text within
 *     that same box) — positions and sizes the actual content box within
 *     the column's own width.
 * Both halves are tiered base/Wide/Lg — genuine per-device-size control. */
export interface ColumnContentBoxProps {
  align: PolymorphicLayoutContentContainerAlign;
  alignWide?: PolymorphicLayoutContentContainerAlign;
  alignLg?: PolymorphicLayoutContentContainerAlign;
  /** 'auto'/undefined or a literal, static Tailwind class — the caller's
   * own concern to supply a real, JIT-scannable literal, same discipline
   * every other Tailwind-only field in this repo already follows; no closed
   * enum required at this layer. */
  width?: string;
  widthWide?: string;
  widthLg?: string;
  textAlign?: string;
  textAlignWide?: string;
  textAlignLg?: string;
  verticalAlign?: string;
  verticalAlignWide?: string;
  verticalAlignLg?: string;
  minHeight?: string;
  /** Adds `[container-type:inline-size]` to the outer box — for content
   * that needs a CSS Container Query context (e.g. a `cqw`-based
   * responsive font-size), same mechanism about.tsx's own former
   * `.splitLeftContent` used. */
  containerQuery?: boolean;
  /** Merged onto the outer flex box. */
  outerClassName?: string;
  /** For live-measurement-driven values (sticky top, custom properties) —
   * same category as headerWrapperRef/primaryNavRef, already passed as raw
   * refs elsewhere in this file. */
  outerStyle?: CSSProperties;
  /** The caller's own semantic label for LayoutDebugOverlay. */
  debugLabel: LayoutDebugOverlayLabel;
  children: ReactNode;
}

function ColumnContentBox({
  align,
  alignWide,
  alignLg,
  width,
  widthWide,
  widthLg,
  textAlign,
  textAlignWide,
  textAlignLg,
  verticalAlign,
  verticalAlignWide,
  verticalAlignLg,
  minHeight,
  containerQuery,
  outerClassName,
  outerStyle,
  debugLabel,
  children,
}: ColumnContentBoxProps) {
  return (
    <div
      className={joinClasses(
        // w-full explicit, not relying on flex's own implicit stretch
        // sizing for this outer box's cross-axis (width) — confirmed via
        // live measurement that a page's own nested content (e.g. about.tsx's
        // former .splitLeftContent, which set its own container-type:
        // inline-size) can make an ancestor flex item compute to its own
        // content width instead of stretching, even with the parent's
        // align-items at its default (normal → stretch) value. An explicit
        // width class doesn't depend on that ancestor negotiation succeeding.
        'relative flex w-full flex-col',
        containerQuery ? '[container-type:inline-size]' : '',
        verticalAlign,
        verticalAlignWide,
        verticalAlignLg,
        minHeight,
        outerClassName,
      )}
      style={outerStyle}
    >
      <div
        data-column-content-box={debugLabel.startsWith('WIDE') ? 'wide' : 'narrow'}
        className={joinClasses(
          'relative',
          width && width !== 'auto' ? `w-full ${width}` : '',
          widthWide && widthWide !== 'auto' ? `w-full ${widthWide}` : '',
          widthLg && widthLg !== 'auto' ? `w-full ${widthLg}` : '',
          CONTENT_ALIGN_MARGIN_CLASS[align],
          alignWide ? CONTENT_ALIGN_MARGIN_CLASS_WIDE[alignWide] : '',
          alignLg ? CONTENT_ALIGN_MARGIN_CLASS_LG[alignLg] : '',
          textAlign,
          textAlignWide,
          textAlignLg,
        )}
      >
        {children}
        <LayoutDebugOverlay tone="contentBox" label={debugLabel} />
      </div>
    </div>
  );
}

/** Standalone, exported so a page can compose the real content-container
 * primitive directly inside its own `wideColumn`/`narrowColumn` JSX (see
 * this component's own doc comment above `ColumnContentBox`) rather than
 * only reaching it through the coordinator's `wideColumnContentContainer:
 * 'bounded'` config flag below. Same implementation as `NarrowColumnContent`
 * — the two names exist for call-site readability, not divergent behavior. */
export function WideColumnContent(props: ColumnContentBoxProps) {
  return <ColumnContentBox {...props} />;
}

/** See `WideColumnContent`'s own doc comment. */
export function NarrowColumnContent(props: ColumnContentBoxProps) {
  return <ColumnContentBox {...props} />;
}

/** Resolves wideColumnContentWidthWide/-Lg's own 'match-narrow-column'
 * sentinel (see that field's own doc comment, PolymorphicLayout.config.ts)
 * into the literal calc() class matching whichever ratio tier is actually
 * configured at this same breakpoint — 'stacked' (no split at this tier, so
 * there's no narrow-column width to match) falls back to 'auto', same as an
 * explicit 'auto' selection. Every other value (a plain percentage class, or
 * 'auto' itself) passes straight through unchanged. */
function resolveWideColumnContentWidth(
  value: string,
  narrowColumnWidthTier: PolymorphicLayoutRatioTier,
  matchNarrowClassByTier: Record<Exclude<PolymorphicLayoutRatioTier, 'stacked'>, string>,
): string {
  if (value !== 'match-narrow-column') return value;
  if (narrowColumnWidthTier === 'stacked') return 'auto';
  return matchNarrowClassByTier[narrowColumnWidthTier];
}

/** Builds a complete, every-tier `ColumnContentBoxProps` object from a
 * page's full `PolymorphicLayoutConfig` — the coordinator's own internal
 * "convenient default" path (`*ColumnContentContainer: 'bounded'`,
 * described in this component's own top-level doc comment) AND the one
 * real source a page composing `<WideColumnContent>` directly should spread
 * from, rather than hand-picking individual fields itself. Hand-picking is
 * exactly the failure mode this exists to close: a page that types out only
 * the tiers/fields it happens to think it needs (e.g. `align`/`alignWide`
 * but not `alignLg`) silently strands that page's own already-live panel
 * controls for the tier it forgot — the field still renders in "Polymorphic
 * Layout" (every `PolymorphicLayoutConfig` consumer shares
 * `POLYMORPHIC_LAYOUT_FIELDS`), edits still write to config, nothing errors,
 * the box on screen just never moves. Spreading this function's full return
 * value and overriding only the fields a page's own content genuinely needs
 * to diverge on (e.g. `width` for a page with its own separate prose-measure
 * field) makes that class of bug structurally impossible: the
 * config-field-to-prop mapping lives in exactly one place, so every tier a
 * page didn't explicitly override is still live, not silently dropped. */
export function wideColumnContentBoxProps(config: PolymorphicLayoutConfig): ColumnContentBoxProps {
  return {
    align: config.wideColumnContentAlign,
    alignWide: config.wideColumnContentAlignWide,
    alignLg: config.wideColumnContentAlignLg,
    width: config.wideColumnContentWidth,
    widthWide: resolveWideColumnContentWidth(
      config.wideColumnContentWidthWide, config.narrowColumnWidthTierMd, WIDE_COLUMN_CONTENT_MATCH_NARROW_CLASS_WIDE,
    ),
    widthLg: resolveWideColumnContentWidth(
      config.wideColumnContentWidthLg, config.narrowColumnWidthTierLg, WIDE_COLUMN_CONTENT_MATCH_NARROW_CLASS_LG,
    ),
    textAlign: config.wideColumnTextAlign,
    textAlignWide: config.wideColumnTextAlignWide,
    textAlignLg: config.wideColumnTextAlignLg,
    verticalAlign: config.wideColumnContentVerticalAlign,
    verticalAlignWide: config.wideColumnContentVerticalAlignWide,
    verticalAlignLg: config.wideColumnContentVerticalAlignLg,
    minHeight: config.wideColumnContentMinHeight,
    debugLabel: 'WIDE COLUMN CONTENT',
    children: null,
  };
}

/** See `wideColumnContentBoxProps`'s own doc comment. */
export function narrowColumnContentBoxProps(config: PolymorphicLayoutConfig): ColumnContentBoxProps {
  return {
    align: config.narrowColumnContentAlign,
    alignWide: config.narrowColumnContentAlignWide,
    alignLg: config.narrowColumnContentAlignLg,
    width: config.narrowColumnContentWidth,
    widthWide: config.narrowColumnContentWidthWide,
    widthLg: config.narrowColumnContentWidthLg,
    textAlign: config.narrowColumnTextAlign,
    textAlignWide: config.narrowColumnTextAlignWide,
    textAlignLg: config.narrowColumnTextAlignLg,
    verticalAlign: config.narrowColumnContentVerticalAlign,
    verticalAlignWide: config.narrowColumnContentVerticalAlignWide,
    verticalAlignLg: config.narrowColumnContentVerticalAlignLg,
    minHeight: config.narrowColumnContentMinHeight,
    debugLabel: 'NARROW COLUMN CONTENT',
    children: null,
  };
}

export type PolymorphicLayoutProps = {
  config: PolymorphicLayoutConfig;
  pageSurfaceConfig: PageSurfaceConfig;
  /** Render-prop that constructs this page's own concrete header (e.g.
   * `<SiteHeader>`) — forwarded straight through to
   * SplitColumnPageShell's own `header` prop unchanged; this component has
   * no header-specific logic of its own to inject beyond what
   * SplitColumnPageShell's own HeaderSlotProps already carries. See that
   * type's own doc comment (experiences/abstract/components/SplitColumnPageShell.tsx) and
   * PLAN-POLYMORPHIC-LAYOUT-DECOUPLING.md. */
  header: (slotProps: HeaderSlotProps) => ReactNode;
  /** Only consulted when config.colorSource === 'palette' — see
   * usePolymorphicLayoutColors's own doc comment. Undefined pages
   * (posts-lab, /abstract) never need it; their own colorSource is
   * always 'custom'. */
  paletteColorResolver?: (column: 'wide' | 'narrow') => string;
  wideColumn: ReactNode;
  narrowColumn: ReactNode;
  /** Page-owned structural/chrome class(es) for each column's own outer
   * grid cell — appended before the config-driven padding/margin/
   * vertical-align classes (see buildWideColumnClassName's own doc
   * comment). */
  wideColumnClassName?: string;
  narrowColumnClassName?: string;
  wideColumnStyle?: CSSProperties;
  narrowColumnStyle?: CSSProperties;
  className?: string;
  style?: CSSProperties;
  backgroundColor?: string;
  headerOverlay?: ReactNode;
  headerWrapperClassName?: string;
  headerWrapperRef?: Ref<HTMLDivElement>;
  /** 'bounded' contentContainer only — paints a full-viewport-width color
   * backdrop behind the (inset) content, split at the real, live-measured
   * column seam (see the component's own top-level doc comment on nav-
   * boundary alignment). No effect under 'full-bleed', where the content
   * itself already reaches the viewport edge. */
  edgeBackdropEnabled?: boolean;
  /** Forwarded straight through to SplitColumnPageShell's own
   * onNavAlignmentChange — see that prop's doc comment. autoAlignNavSplit is
   * always on here (this component's own top-level doc comment), so this
   * fires for any consumer that supplies it. Called alongside (not instead
   * of) this component's own internal capture of the same alignment object,
   * used for mobileNavAlignEnabled below — see that prop's own doc comment. */
  onNavAlignmentChange?: (alignment: SplitColumnNavAlignment) => void;
  /** Opt-in, default false: applies useSplitColumnNavAlignment's own
   * mobileNavAlignBasePx (see that field's own doc comment,
   * useSplitColumnNavAlignment.ts) plus config.narrowColumnMobileAlignOffsetPx
   * as the narrow column's own inline paddingLeft, below md — aligning the
   * narrow column's real content to the actual rendered <nav> element's own
   * left edge, the same live-measurement pages/posts-lab/[slug].tsx's own
   * hand-rolled mobileNavAlignPaddingLeftPx already did before this existed
   * generically. Defaults false (not on for every consumer) because an
   * inline style always wins the cascade over a class, unlike every other
   * knob this component resolves from config — a page with its own existing,
   * different mechanism for the same visual goal (e.g. /about's own
   * about.module.css .splitLeft padding, driven by a separately-measured
   * --about-left-align-px custom property keyed to the logo, not the nav)
   * would get a second mechanism silently fighting the first if this were
   * on by default. A page with no competing mechanism (e.g. /abstract,
   * /contact) can safely opt in. */
  mobileNavAlignEnabled?: boolean;
  children?: ReactNode;
};

export function PolymorphicLayout({
  config,
  pageSurfaceConfig,
  header,
  paletteColorResolver,
  wideColumn,
  narrowColumn,
  wideColumnClassName,
  narrowColumnClassName,
  wideColumnStyle,
  narrowColumnStyle,
  className,
  style,
  backgroundColor,
  headerOverlay,
  headerWrapperClassName,
  headerWrapperRef,
  edgeBackdropEnabled,
  onNavAlignmentChange,
  mobileNavAlignEnabled = false,
  children,
}: PolymorphicLayoutProps) {
  const normalizedConfig = normalizePolymorphicLayoutConfig(config);
  const normalizedPageSurfaceConfig = normalizePageSurfaceConfig(pageSurfaceConfig);
  const colors = usePolymorphicLayoutColors(
    normalizedConfig, normalizedPageSurfaceConfig.color, paletteColorResolver,
  );
  // Same live-tier pattern usePolymorphicLayoutColors's own internal `tier`
  // helper already uses (that one's private to its own closure, resolving
  // colors only — not reused here to avoid changing that hook's public
  // return shape for an unrelated field). A second useBreakpointTier()
  // subscription is a second matchMedia listener, not a second source of
  // truth — both read the same live window state.
  const { tier: headerScrollBreakpointTier } = useBreakpointTier();
  const headerScrollBehaviorForTier = <T,>(base: T, wide: T, lg: T): T => (
    headerScrollBreakpointTier === 'lg' ? lg : headerScrollBreakpointTier === 'md' ? wide : base
  );

  // *ColumnClearsFloatingHeader (base/Wide/Lg) — see
  // those fields' own doc comments (PolymorphicLayout.config.ts). Live
  // header-bottom measurement, resolved once here and turned into a
  // `max()` floor against each column's own currently-active
  // *ColumnContentPaddingTop tier (never reducing a deliberately larger
  // configured value, only topping it up when it isn't enough to clear the
  // header). undefined (no inline override at all) when the column's own
  // flag is off, so this is fully inert — byte-identical to before these
  // fields existed — for every page that hasn't opted in.
  const headerBottomPx = usePolymorphicLayoutHeaderBottomPx();
  const floatingHeaderClearancePx = headerBottomPx + 24;
  const wideColumnClearsFloatingHeader = headerScrollBehaviorForTier(
    normalizedConfig.wideColumnClearsFloatingHeader,
    normalizedConfig.wideColumnClearsFloatingHeaderWide,
    normalizedConfig.wideColumnClearsFloatingHeaderLg,
  );
  const narrowColumnClearsFloatingHeader = headerScrollBehaviorForTier(
    normalizedConfig.narrowColumnClearsFloatingHeader,
    normalizedConfig.narrowColumnClearsFloatingHeaderWide,
    normalizedConfig.narrowColumnClearsFloatingHeaderLg,
  );
  // BUG-014 (bugs audit, 2026-08-21): a *ColumnClearsFloatingHeader column's
  // own paddingTop-only clearance floor shrinks the flex box it's applied to
  // from the top edge alone. That box is the *same* box
  // *ColumnContentVerticalAlign's 'justify-center' centers content inside —
  // border-box, so the box's own total height stays pinned to its
  // `min-h-[100dvh]` floor (the column's own real height, unaffected by this
  // padding), but the *content area* available for centering shrinks to
  // "100dvh minus this top-only inset," whose own midpoint sits
  // `clearancePx / 2` below the real viewport's true vertical center — a
  // floating (`position: fixed`) header claims no flow height, so nothing
  // ought to shift that center at all, only ever act as a floor beneath it.
  // Reported live: headline top landed at y=390 on a 1000px-tall viewport
  // whose header ends at y=144 (true center 500, actual content center 584
  // — exactly half the 168px clearance too low).
  // Fix: mirror the same live clearance as `paddingBottom` too, but *only*
  // while this column's own currently-active vertical-align tier resolves
  // to 'center'. Symmetric top+bottom padding on a border-box flex column
  // leaves its own midpoint exactly where it already was
  // (`paddingTop + (H - paddingTop - paddingBottom) / 2 = H / 2` for equal
  // paddingTop/paddingBottom, regardless of their shared value) — content
  // centers against the *true* viewport again, while the paddingTop half
  // alone still guarantees the same never-render-above-the-header floor as
  // before (paddingBottom itself needs no such floor — nothing floats
  // beneath this column to clear). 'start'/'end' tiers are untouched: a
  // top-only floor already *is* the correct, exact "flush against the
  // clearance line" position for 'start', and 'end' was never affected by a
  // top-only inset to begin with (its own flush-to-bottom position never
  // read paddingTop at all) — adding a matching paddingBottom there would
  // introduce the identical bug in reverse (an unwanted gap above the true
  // bottom edge), so this stays conditional on 'center' specifically, not a
  // blanket change to the clearance mechanism.
  const resolveActiveTierAlign = (base: string, wide: string, lg: string): string => (
    headerScrollBehaviorForTier(base, wide, lg).replace(/^(?:md:|lg:)/, '')
  );
  const wideColumnActiveVerticalAlign = resolveActiveTierAlign(
    normalizedConfig.wideColumnContentVerticalAlign,
    normalizedConfig.wideColumnContentVerticalAlignWide,
    normalizedConfig.wideColumnContentVerticalAlignLg,
  );
  const narrowColumnActiveVerticalAlign = resolveActiveTierAlign(
    normalizedConfig.narrowColumnContentVerticalAlign,
    normalizedConfig.narrowColumnContentVerticalAlignWide,
    normalizedConfig.narrowColumnContentVerticalAlignLg,
  );
  const wideColumnClearsFloatingHeaderStyle: CSSProperties | undefined = wideColumnClearsFloatingHeader
    ? {
      paddingTop: `max(${tailwindSpacingTokenToPx(
        headerScrollBehaviorForTier(
          normalizedConfig.wideColumnContentPaddingTop,
          normalizedConfig.wideColumnContentPaddingTopWide,
          normalizedConfig.wideColumnContentPaddingTopLg,
        ),
        0,
      )}px, ${floatingHeaderClearancePx}px)`,
      ...(wideColumnActiveVerticalAlign === 'justify-center'
        ? {
          paddingBottom: `max(${tailwindSpacingTokenToPx(
            headerScrollBehaviorForTier(
              normalizedConfig.wideColumnContentPaddingBottom,
              normalizedConfig.wideColumnContentPaddingBottomWide,
              normalizedConfig.wideColumnContentPaddingBottomLg,
            ),
            0,
          )}px, ${floatingHeaderClearancePx}px)`,
        }
        : {}),
    }
    : undefined;
  const narrowColumnClearsFloatingHeaderStyle: CSSProperties | undefined = narrowColumnClearsFloatingHeader
    ? {
      paddingTop: `max(${tailwindSpacingTokenToPx(
        headerScrollBehaviorForTier(
          normalizedConfig.narrowColumnContentPaddingTop,
          normalizedConfig.narrowColumnContentPaddingTopWide,
          normalizedConfig.narrowColumnContentPaddingTopLg,
        ),
        0,
      )}px, ${floatingHeaderClearancePx}px)`,
      ...(narrowColumnActiveVerticalAlign === 'justify-center'
        ? {
          paddingBottom: `max(${tailwindSpacingTokenToPx(
            headerScrollBehaviorForTier(
              normalizedConfig.narrowColumnContentPaddingBottom,
              normalizedConfig.narrowColumnContentPaddingBottomWide,
              normalizedConfig.narrowColumnContentPaddingBottomLg,
            ),
            0,
          )}px, ${floatingHeaderClearancePx}px)`,
        }
        : {}),
    }
    : undefined;

  // mobileNavAlignEnabled's own internal capture — SplitColumnPageShell's
  // onNavAlignmentChange fires with the full, live SplitColumnNavAlignment
  // object (including mobileNavAlignBasePx) whenever it changes; this
  // component needs its own copy to compute the narrow column's inline
  // paddingLeft below, in addition to (never instead of) forwarding to
  // whatever onNavAlignmentChange a page also supplied for its own,
  // separate downstream use (e.g. /abstract's own hero content inset).
  const [navAlignmentState, setNavAlignmentState] = useState<SplitColumnNavAlignment | undefined>(undefined);
  const handleNavAlignmentChange = useCallback((alignment: SplitColumnNavAlignment) => {
    setNavAlignmentState(alignment);
    onNavAlignmentChange?.(alignment);
  }, [onNavAlignmentChange]);
  const mobileAlignPaddingLeftPx = mobileNavAlignEnabled && navAlignmentState?.mobileNavAlignBasePx !== undefined
    ? Math.max(0, navAlignmentState.mobileNavAlignBasePx + normalizedConfig.narrowColumnMobileAlignOffsetPx)
    : undefined;

  const bodyGutterClassName = joinClasses(
    normalizedConfig.bodyGutterPaddingLeft,
    normalizedConfig.bodyGutterPaddingLeftWide,
    normalizedConfig.bodyGutterPaddingLeftLg,
    normalizedConfig.bodyGutterPaddingRight,
    normalizedConfig.bodyGutterPaddingRightWide,
    normalizedConfig.bodyGutterPaddingRightLg,
  );

  return (
    <SplitColumnPageShell
      className={className}
      style={style}
      backgroundColor={backgroundColor}
      pageSurfaceConfig={normalizedPageSurfaceConfig}
      header={header}
      headerOverlay={headerOverlay}
      headerWrapperClassName={headerWrapperClassName}
      headerWrapperRef={headerWrapperRef}
      headerPositionMode={headerScrollBehaviorForTier(
        normalizedConfig.headerScrollBehavior,
        normalizedConfig.headerScrollBehaviorWide,
        normalizedConfig.headerScrollBehaviorLg,
      )}
      splitBandBoundaryPx={colors.splitBandBoundaryPx}
      physicalRightColumnColor={colors.physicalRightColumnColor}
      splitColumnLayoutConfig={normalizedConfig}
      wideColumn={
        normalizedConfig.wideColumnContentContainer === 'full-bleed'
          ? wideColumn
          : (
            <WideColumnContent {...wideColumnContentBoxProps(normalizedConfig)}>
              {wideColumn}
            </WideColumnContent>
          )
      }
      narrowColumn={
        normalizedConfig.narrowColumnContentContainer === 'full-bleed'
          ? narrowColumn
          : <NarrowColumnContent {...narrowColumnContentBoxProps(normalizedConfig)}>{narrowColumn}</NarrowColumnContent>
      }
      wideColumnClassName={buildWideColumnClassName(normalizedConfig, wideColumnClassName)}
      narrowColumnClassName={buildNarrowColumnClassName(normalizedConfig, narrowColumnClassName)}
      // wideColumnClearsFloatingHeaderStyle spread last so its own
      // paddingTop always wins over a page's own wideColumnStyle — never
      // the reverse — same precedent as mobileAlignPaddingLeftPx below.
      // undefined (spreads nothing) whenever wideColumnClearsFloatingHeader
      // is off, this component's own default, so this is byte-identical to
      // before these fields existed for every page that hasn't opted in.
      wideColumnStyle={{
        ...(wideColumnStyle ?? { backgroundColor: colors.wideColumnColor }),
        ...(wideColumnClearsFloatingHeaderStyle ?? {}),
      }}
      // mobileAlignPaddingLeftPx spread last so it always wins over
      // backgroundColor's own object literal — never the reverse — matching
      // effectiveNarrowColumnStyle's own marginTop merge precedent
      // (SplitColumnPageShell.tsx). undefined when mobileNavAlignEnabled is
      // off (this component's own top-level default) or above md, in which
      // case this spreads nothing and narrowColumnStyle is byte-identical to
      // before this prop existed. narrowColumnClearsFloatingHeaderStyle
      // spreads last of all — its own paddingTop always wins.
      narrowColumnStyle={{
        ...(narrowColumnStyle ?? { backgroundColor: colors.narrowColumnColor }),
        ...(mobileAlignPaddingLeftPx !== undefined ? { paddingLeft: mobileAlignPaddingLeftPx } : {}),
        ...(narrowColumnClearsFloatingHeaderStyle ?? {}),
      }}
      contentContainer={normalizedConfig.contentContainer}
      bodyGutterClassName={bodyGutterClassName}
      edgeBackdropEnabled={edgeBackdropEnabled}
      // Unconditional — see this component's own top-level doc comment.
      // Not a page-configurable prop: every page gets a live-measured
      // header/body seam by construction, nothing to opt into or forget.
      autoAlignNavSplit
      onNavAlignmentChange={handleNavAlignmentChange}
    >
      {children}
    </SplitColumnPageShell>
  );
}

// FixedViewportColumnContent moved to its own file, components/
// FixedViewportColumnContent.tsx (PLAN-POLYMORPHIC-LAYOUT-DECOUPLING.md
// §7) — it was always SiteHeader-agnostic, genuinely generic column
// content, unrelated to what this file's own top-level doc comment now
// describes.
