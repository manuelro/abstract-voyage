import { useEffect, useMemo, useRef, useState } from 'react';
import { narrowColumnFractionForTier } from '../../SplitColumnLayout';
import type { SplitColumnLayoutWideSide, SplitColumnRatioTier } from '../../SplitColumnLayout/config/registered';
import { MD_MEDIA_QUERY, LG_MEDIA_QUERY } from '../../../../../components/breakpoints';

/** The narrow column's own seam position, measured from the viewport's left
 * edge — narrowFraction when narrow is physically first (wideColumnSide
 * 'right'), or its complement when wide is first instead ('left').
 * narrowFraction is the *caller's own resolved* fraction (see
 * resolveActiveNarrowFraction below) — this function no longer assumes a
 * single fixed ratio, since SplitColumnLayoutConfig's own split ratio is
 * now per-breakpoint-tier configurable. Exported as a pure function (not
 * inlined in the effect below) so it can be tested directly without
 * rendering the hook — see this file's own test for both wideColumnSide
 * branches, previously untested since today's only two consumers both use
 * 'right'. */
export function computeNavSplitBoundaryPx(
  viewportWidthPx: number,
  wideColumnSide: SplitColumnLayoutWideSide,
  narrowFraction: number,
): number {
  const seamRatio = wideColumnSide === 'left'
    ? 1 - narrowFraction
    : narrowFraction;
  return viewportWidthPx * seamRatio;
}

/** Resolves which of narrowColumnWidthTierMd/Lg's own ratio is actually in
 * effect at the current viewport, mirroring CSS's own mobile-first cascade
 * exactly: apply the `md` tier's fraction if that tier isn't 'stacked' and
 * `md` matches; then apply the `lg` tier's fraction on top if *that* one
 * also isn't 'stacked' and `lg` matches (only actually overriding the `md`
 * result if `lg` itself contributes something — the same way a real
 * `lg:grid-cols-[...]` class only overrides `md:grid-cols-[...]` when it's
 * actually present in the class list, not just because the viewport is wide
 * enough to match it). Returns undefined while genuinely stacked (no tier
 * has contributed a ratio yet) — the split-aligned nav overlay has nothing
 * to align to in that state, by design (see SplitColumnNavAlignment's own
 * desktopNavAlignmentActive doc comment). */
export function resolveActiveNarrowFraction(
  narrowColumnWidthTierMd: SplitColumnRatioTier,
  narrowColumnWidthTierLg: SplitColumnRatioTier,
  mdMatches: boolean,
  lgMatches: boolean,
): number | undefined {
  let fraction: number | undefined;
  if (mdMatches) {
    const mdFraction = narrowColumnFractionForTier(narrowColumnWidthTierMd);
    if (mdFraction !== undefined) fraction = mdFraction;
  }
  if (lgMatches) {
    const lgFraction = narrowColumnFractionForTier(narrowColumnWidthTierLg);
    if (lgFraction !== undefined) fraction = lgFraction;
  }
  return fraction;
}

/** mobileNavAlignBasePx's own pure core — see that field's own doc comment
 * (SplitColumnNavAlignment below) for the full mechanism. undefined at/
 * above md (mdMatches true — the desktop mechanism owns alignment there
 * instead) or before both real elements have been measured at least once,
 * matching this file's own graceful-degrade pattern elsewhere (e.g.
 * computeMeasuredWideColumnBoundaryPx below). */
export function computeMobileNavAlignBasePx(
  mdMatches: boolean,
  navLeftPx: number | undefined,
  narrowColumnLeftPx: number | undefined,
): number | undefined {
  if (mdMatches) return undefined;
  if (navLeftPx === undefined || narrowColumnLeftPx === undefined) return undefined;
  return navLeftPx - narrowColumnLeftPx;
}

/** Converts navSplitBoundaryPx (viewport-relative) into a grid-relative
 * pixel offset for SplitColumnLayout's own measuredWideColumnBoundaryPx —
 * undefined when disabled (below the desktop breakpoint) or before the
 * first real measurement lands, matching this hook's own graceful-degrade
 * pattern elsewhere. */
export function computeMeasuredWideColumnBoundaryPx(
  enabled: boolean,
  navSplitBoundaryPx: number | undefined,
  firstColumnLeftPx: number | undefined,
): number | undefined {
  return enabled && typeof navSplitBoundaryPx === 'number' && typeof firstColumnLeftPx === 'number'
    ? Math.max(0, navSplitBoundaryPx - firstColumnLeftPx)
    : undefined;
}

export type SplitColumnNavAlignment = {
  /** SiteHeader's own "floating" (viewport-measured, not CSS-grid-
   * percentage) x position for its split-aligned nav overlay — a raw
   * window.innerWidth * (whichever tier's fraction is currently active, or
   * the eventual split tier's own fraction while still stacked — see this
   * file's own resolveActiveNarrowFraction), deliberately independent of
   * any container. See this hook's own doc comment for why this, not a
   * measurement of the actual bounded grid, is the source of truth. */
  navSplitBoundaryPx: number | undefined;
  /** Passthrough for SplitColumnLayout's own measuredWideColumnBoundaryPx —
   * pins the body grid's first (physically left) column to the exact same
   * pixel navSplitBoundaryPx already committed to. */
  measuredWideColumnBoundaryPx: number | undefined;
  /** The live-measured right edge of the grid's first column, *after*
   * measuredWideColumnBoundaryPx has pinned it — what
   * SplitColumnPageShell's edgeBackdropEnabled backdrop actually splits at. */
  edgeBackdropSeamPx: number | undefined;
  /** Whether the split-aligned nav (and the pinning derived from it) is
   * currently active — true exactly when narrowColumnWidthTierMd/Lg's own
   * cascade (see resolveActiveNarrowFraction) has actually resolved a real
   * ratio at the current viewport, not a hardcoded md check anymore: a page
   * whose own narrowColumnWidthTierMd is 'stacked' stays inactive through
   * md, only activating at whichever tier actually isn't 'stacked'. While
   * inactive, SiteHeader falls back to its default padded nav row
   * and SplitColumnLayout stays a single column, so any inset derived from
   * this hook would misalign things instead. Exposed (not just used
   * internally to gate measuredWideColumnBoundaryPx) so a caller with its
   * own additional downstream use of navSplitBoundaryPx — e.g.
   * pages/abstract.tsx's own heroContentInsetEndPx — can gate that on the
   * same resolved state without a second matchMedia effect. */
  desktopNavAlignmentActive: boolean;
  /** Attach to whichever of SplitColumnLayout's wideColumnRef/narrowColumnRef
   * is the grid's own physically-first (left) column for the current
   * wideColumnSide — SplitColumnPageShell's autoAlignNavSplit wires this
   * automatically; a page calling this hook directly must pick the matching
   * one itself (wideColumnSide 'left' → wideColumnRef, 'right' →
   * narrowColumnRef). The measured element's own horizontal padding must be
   * zero for the resulting pixels to be valid — see this hook's own doc
   * comment on why. */
  firstColumnRef: (element: HTMLDivElement | null) => void;
  /** The real, live-measured horizontal offset between the actual rendered
   * `<nav>` element (navRef below) and the narrow column's own outer box
   * (narrowColumnRef below), below the md breakpoint only — undefined at/
   * above md (desktopNavAlignmentActive's own mechanism owns alignment
   * there instead; this value must never coexist with it, see this hook's
   * own top-level doc comment). Unlike navSplitBoundaryPx above (a formula:
   * viewport width times a configured ratio), this is a direct
   * getBoundingClientRect() delta — below md the real nav is centered and
   * width-capped, not split-aligned, so there's no ratio to compute from;
   * only a live measurement of the two actual elements gives the right
   * answer. A caller adds its own fine-tune offset on top (e.g.
   * PolymorphicLayoutConfig's own narrowColumnMobileAlignOffsetPx) and
   * applies the sum as that column's own inline paddingLeft. */
  mobileNavAlignBasePx: number | undefined;
  /** Attach to the narrow column's own outer box — unconditional, unlike
   * firstColumnRef above (which only lands there when narrow happens to be
   * physically first for the current wideColumnSide). mobileNavAlignBasePx
   * needs the real narrow column specifically, regardless of which side is
   * wide, so this is always the same element. Same zero-horizontal-padding
   * requirement as firstColumnRef — attach to SplitColumnLayout's own
   * narrowColumnRef prop directly, not page-authored content one level
   * deeper. */
  narrowColumnRef: (element: HTMLDivElement | null) => void;
  /** Attach to the real, rendered `<nav>` element — mobileNavAlignBasePx's
   * other half. SplitColumnPageShell merges this with whatever primaryNavRef
   * a page also supplies (same "combine two ref callbacks" pattern as that
   * component's own mergeHeaderWrapperRefs), so a page loses nothing by this
   * hook also needing the node. */
  navRef: (element: HTMLElement | null) => void;
};

/**
 * Extracted verbatim (not re-derived) from pages/abstract.tsx's own
 * navSplitBoundaryPx / heroColumnRowRef / measuredWideColumnBoundaryPx /
 * edgeBackdropSeamPx mechanism (pages/abstract.tsx:1412-1565 as of this
 * extraction) — the one working implementation of "keep the fixed header's
 * nav split, the body grid's column seam, and the edge-to-edge color
 * backdrop all pinned to the same pixel." Hand-copying this into a second
 * page (pages/posts-lab/[slug].tsx) took three attempts to get right, each
 * one reproducing a different subset of it — see AGENTS.md's "Consuming vs.
 * re-implementing an existing mechanism" for the full incident. This hook
 * exists so there is exactly one copy left to get right.
 *
 * Two invariants that are easy to drop when reading this code instead of
 * importing it, both responsible for a real regression this session:
 *
 * 1. **Direction of truth.** navSplitBoundaryPx is computed first, from the
 *    raw viewport — not derived from the grid's own rendered position. The
 *    body grid's own column split is then *forced* to that exact pixel via
 *    measuredWideColumnBoundaryPx. Deriving navSplitBoundaryPx from the
 *    grid instead only agrees by coincidence, and drifts the moment
 *    PageContainer's own max-width cap makes the bounded grid's percentage
 *    split land at a different pixel than the raw viewport's — which is
 *    exactly the 38%-of-1680px-capped-container vs. 38%-of-window.innerWidth
 *    divergence /abstract's own navSplitBoundaryPx doc comment (pages/
 *    abstract.tsx:1396-1411) explains for why /about's raw formula is used
 *    verbatim rather than re-derived from /abstract's own bounded container.
 * 2. **The measured element must have zero horizontal padding.** firstColumnRef
 *    is meant to land on SplitColumnLayout's own column cell directly (via
 *    its wideColumnRef/narrowColumnRef props), not page-authored content one
 *    level deeper — but even at that correct attachment point, any
 *    horizontal padding on that same cell (wideColumnClassName/
 *    narrowColumnClassName) shifts its measured left/right edges inward by
 *    the padding amount, silently invalidating measuredWideColumnBoundaryPx
 *    and edgeBackdropSeamPx alike. Put visual inset padding on an inner
 *    wrapper instead, never on the class list passed to the cell this ref
 *    attaches to. Confirmed this session: a page that had padding on the
 *    measured cell showed a real, visible logo/nav overflow; removing it
 *    fixed the overflow immediately with no other change.
 *
 * wideColumnSide is a real input (not hardcoded to a left-narrow
 * assumption) so the ratio resolves correctly regardless of which physical
 * side is narrow — today's only two consumers both use wideColumnSide:
 * 'right', so this was previously untested for 'left', see this file's own
 * test for both branches.
 */
export function useSplitColumnNavAlignment(options: {
  wideColumnSide: SplitColumnLayoutWideSide;
  /** This page's own SplitColumnLayoutConfig.narrowColumnWidthTierMd/Lg —
   * required (not defaulted here) so this hook can never silently disagree
   * with whichever ratio the body grid itself is actually rendering; see
   * resolveActiveNarrowFraction's own doc comment for the cascade. */
  narrowColumnWidthTierMd: SplitColumnRatioTier;
  narrowColumnWidthTierLg: SplitColumnRatioTier;
}): SplitColumnNavAlignment {
  const { wideColumnSide, narrowColumnWidthTierMd, narrowColumnWidthTierLg } = options;

  const [mdMatches, setMdMatches] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(MD_MEDIA_QUERY);
    const update = () => setMdMatches(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const [lgMatches, setLgMatches] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(LG_MEDIA_QUERY);
    const update = () => setLgMatches(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const activeNarrowFraction = resolveActiveNarrowFraction(
    narrowColumnWidthTierMd, narrowColumnWidthTierLg, mdMatches, lgMatches,
  );
  const desktopNavAlignmentActive = activeNarrowFraction !== undefined;
  // While genuinely stacked (activeNarrowFraction undefined), navSplitBoundaryPx
  // still needs *some* number — every existing consumer (this hook's own
  // measuredWideColumnBoundaryPx below, when it does go active; a caller's
  // own downstream use like pages/abstract.tsx's heroContentInsetEndPx)
  // expects a real value once mounted, not a gap while inactive. Falls back
  // to whichever tier eventually resolves once the layout does split. Only
  // a page that sets *both* tiers to 'stacked' (never splits, at any width
  // tested) reaches the final `?? 0.38` fallback — this layout's own
  // long-standing original ratio, a reasonable inert value that never
  // actually gets used for anything real in that case, since
  // desktopNavAlignmentActive stays false throughout.
  const eventualFraction = narrowColumnFractionForTier(narrowColumnWidthTierMd)
    ?? narrowColumnFractionForTier(narrowColumnWidthTierLg)
    ?? 0.38;
  const effectiveNarrowFraction = activeNarrowFraction ?? eventualFraction;

  const [navSplitBoundaryPx, setNavSplitBoundaryPx] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const measure = () => setNavSplitBoundaryPx(
      computeNavSplitBoundaryPx(window.innerWidth, wideColumnSide, effectiveNarrowFraction),
    );
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [wideColumnSide, effectiveNarrowFraction]);

  const elementRef = useRef<HTMLDivElement | null>(null);
  const [firstColumnLeftPx, setFirstColumnLeftPx] = useState<number | undefined>(undefined);
  const [firstColumnRightPx, setFirstColumnRightPx] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const element = elementRef.current;
    if (!element) return undefined;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      setFirstColumnLeftPx(rect.left);
      setFirstColumnRightPx(rect.right);
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  const firstColumnRef = (element: HTMLDivElement | null) => {
    elementRef.current = element;
  };

  // mobileNavAlignBasePx — see that field's own doc comment above. Ported
  // verbatim from pages/posts-lab/[slug].tsx's own mobileNavAlignPaddingLeftPx
  // effect (that page's only prior consumer of this measurement), generalized
  // so every PolymorphicLayout caller can use it, not just that one page's
  // own hand-rolled render path. mdMatches (not desktopNavAlignmentActive) is
  // the right gate — desktopNavAlignmentActive can stay false while
  // genuinely stacked at md+ (both ratio tiers 'stacked'), and this
  // measurement's own "am I below md" question is a real breakpoint check,
  // not a "did the split ratio resolve" one.
  const narrowColumnElRef = useRef<HTMLDivElement | null>(null);
  const navElRef = useRef<HTMLElement | null>(null);
  const [mobileNavAlignBasePx, setMobileNavAlignBasePx] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const measure = () => {
      const navEl = navElRef.current;
      const columnEl = narrowColumnElRef.current;
      setMobileNavAlignBasePx(computeMobileNavAlignBasePx(
        mdMatches,
        navEl ? navEl.getBoundingClientRect().left : undefined,
        columnEl ? columnEl.getBoundingClientRect().left : undefined,
      ));
    };
    measure();
    window.addEventListener('resize', measure);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    if (navElRef.current) observer?.observe(navElRef.current);
    if (narrowColumnElRef.current) observer?.observe(narrowColumnElRef.current);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [mdMatches]);
  const narrowColumnRef = (element: HTMLDivElement | null) => {
    narrowColumnElRef.current = element;
  };
  const navRef = (element: HTMLElement | null) => {
    navElRef.current = element;
  };

  const measuredWideColumnBoundaryPx = computeMeasuredWideColumnBoundaryPx(
    desktopNavAlignmentActive,
    navSplitBoundaryPx,
    firstColumnLeftPx,
  );

  // Memoized so a caller that feeds this object into a dependency array or
  // React state (e.g. SplitColumnPageShell's own onNavAlignmentChange
  // promotion) gets a stable reference when nothing actually changed —
  // otherwise every render produces a brand-new object literal, which (fed
  // into setState) re-triggers a render, which recomputes this hook, which
  // produces another new object, forever. Keyed on the five primitive
  // fields, not firstColumnRef/narrowColumnRef/navRef (stable closures
  // already, no need to gate on them).
  return useMemo(() => ({
    navSplitBoundaryPx,
    measuredWideColumnBoundaryPx,
    edgeBackdropSeamPx: firstColumnRightPx,
    desktopNavAlignmentActive,
    firstColumnRef,
    mobileNavAlignBasePx,
    narrowColumnRef,
    navRef,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    navSplitBoundaryPx, measuredWideColumnBoundaryPx, firstColumnRightPx, desktopNavAlignmentActive,
    mobileNavAlignBasePx,
  ]);
}
