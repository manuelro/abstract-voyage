import type { CSSProperties, ReactNode, Ref } from 'react';
import {
  normalizeSplitColumnLayoutConfig,
  type SplitColumnLayoutConfig,
  type SplitColumnRatioTier,
} from './SplitColumnLayout/config/registered';
import { resolveSplitColumnAccent, complementCssColor } from './SplitColumnLayout/colorResolution';
import type { AbstractPostDockPaletteConfig } from './AbstractPostDock/config/registered';
import { LayoutDebugOverlay } from '../../../components/LayoutDebug';

// Every non-'stacked' SplitColumnRatioTier's own literal class fragment, one
// table per breakpoint tier, each keyed by wideColumnSide too — hand-written
// in full (never assembled from an interpolated percentage number) so
// Tailwind's JIT scanner sees every complete string regardless of which one
// is actually selected at runtime, per this codebase's Tailwind-only styling
// rule. 'stacked' deliberately has no entry in either table — see
// resolveGridColsClassName's own doc comment for why that absence, not a
// value, is what makes 'stacked' mean stacked.
const MD_RATIO_FRAGMENT: Record<'left' | 'right', Record<Exclude<SplitColumnRatioTier, 'stacked'>, string>> = {
  right: {
    '30/70': 'md:grid-cols-[30%_70%]',
    '35/65': 'md:grid-cols-[35%_65%]',
    '38/62': 'md:grid-cols-[38%_62%]',
    '40/60': 'md:grid-cols-[40%_60%]',
    '45/55': 'md:grid-cols-[45%_55%]',
    '50/50': 'md:grid-cols-[50%_50%]',
  },
  left: {
    '30/70': 'md:grid-cols-[70%_30%]',
    '35/65': 'md:grid-cols-[65%_35%]',
    '38/62': 'md:grid-cols-[62%_38%]',
    '40/60': 'md:grid-cols-[60%_40%]',
    '45/55': 'md:grid-cols-[55%_45%]',
    '50/50': 'md:grid-cols-[50%_50%]',
  },
};
const LG_RATIO_FRAGMENT: Record<'left' | 'right', Record<Exclude<SplitColumnRatioTier, 'stacked'>, string>> = {
  right: {
    '30/70': 'lg:grid-cols-[30%_70%]',
    '35/65': 'lg:grid-cols-[35%_65%]',
    '38/62': 'lg:grid-cols-[38%_62%]',
    '40/60': 'lg:grid-cols-[40%_60%]',
    '45/55': 'lg:grid-cols-[45%_55%]',
    '50/50': 'lg:grid-cols-[50%_50%]',
  },
  left: {
    '30/70': 'lg:grid-cols-[70%_30%]',
    '35/65': 'lg:grid-cols-[65%_35%]',
    '38/62': 'lg:grid-cols-[62%_38%]',
    '40/60': 'lg:grid-cols-[60%_40%]',
    '45/55': 'lg:grid-cols-[55%_45%]',
    '50/50': 'lg:grid-cols-[50%_50%]',
  },
};
// Literal, matching MD_RATIO_FRAGMENT/LG_RATIO_FRAGMENT's own tier keys —
// the narrow column's percentage share for each non-'stacked' tier value,
// as a real number. Callers that need a live pixel boundary matching the
// *currently active* tier's own split (e.g. useSplitColumnNavAlignment)
// read this instead of assuming a single fixed ratio — see that hook's own
// doc comment. Kept beside the class-string tables above so the two can
// never silently disagree (same guarantee the old single
// NARROW_COLUMN_WIDTH_RATIO constant existed for, generalized to N tiers).
const RATIO_TIER_NARROW_FRACTION: Record<Exclude<SplitColumnRatioTier, 'stacked'>, number> = {
  '30/70': 0.3,
  '35/65': 0.35,
  '38/62': 0.38,
  '40/60': 0.4,
  '45/55': 0.45,
  '50/50': 0.5,
};

/** The narrow column's own share of the grid for a given non-'stacked' tier
 * value, as a plain fraction (e.g. '38/62' → 0.38) — see
 * RATIO_TIER_NARROW_FRACTION's own doc comment. Returns undefined for
 * 'stacked' (there is no ratio; the column isn't split at that tier). */
export function narrowColumnFractionForTier(tier: SplitColumnRatioTier): number | undefined {
  return tier === 'stacked' ? undefined : RATIO_TIER_NARROW_FRACTION[tier];
}

/** Resolves a page's own narrowColumnWidthTierMd/Lg + wideColumnSide into
 * the complete grid-template-columns className — mobile-first: the
 * unconditional `grid-cols-1` base (single column, stacked), then the `md:`
 * fragment if that tier isn't 'stacked', then the `lg:` fragment if *that*
 * tier isn't 'stacked'. A 'stacked' tier contributes no fragment at all
 * (not a `grid-cols-1` override — literally nothing), which is exactly what
 * lets CSS's own cascade carry forward whatever the narrower tier already
 * resolved to, the same way any other unprefixed-then-md:-then-lg: Tailwind
 * class already behaves everywhere else in this codebase. */
function resolveGridColsClassName(
  wideColumnSide: 'left' | 'right',
  narrowColumnWidthTierMd: SplitColumnRatioTier,
  narrowColumnWidthTierLg: SplitColumnRatioTier,
): string {
  const mdFragment = narrowColumnWidthTierMd === 'stacked'
    ? ''
    : MD_RATIO_FRAGMENT[wideColumnSide][narrowColumnWidthTierMd];
  const lgFragment = narrowColumnWidthTierLg === 'stacked'
    ? ''
    : LG_RATIO_FRAGMENT[wideColumnSide][narrowColumnWidthTierLg];
  return ['grid-cols-1', mdFragment, lgFragment].filter(Boolean).join(' ');
}

// Which breakpoint prefix the grid actually leaves its stacked state at,
// for a given pair of tier values — 'md' if that tier alone already isn't
// 'stacked', else 'lg' if *that* one isn't, else null (never splits, at any
// width tested). Shared by resolveGridColsClassName's own reasoning and
// resolveWideColumnOrderClassName below, so both can never disagree on
// which breakpoint is "the one where this page's split actually begins."
export function firstSplitTierPrefix(
  narrowColumnWidthTierMd: SplitColumnRatioTier,
  narrowColumnWidthTierLg: SplitColumnRatioTier,
): 'md' | 'lg' | null {
  if (narrowColumnWidthTierMd !== 'stacked') return 'md';
  if (narrowColumnWidthTierLg !== 'stacked') return 'lg';
  return null;
}

// Literal per prefix — the counter-class that restores an element's order
// to its default (0) once the grid genuinely splits, so CSS Grid's own
// auto-placement (which assigns items to explicit grid-template-columns
// tracks in order value, then DOM order) goes back to following DOM order
// — and therefore wideColumnSide's own physical left/right placement —
// once there are real left/right tracks to place into. Left unreset, an
// 'order-first' surviving into the split tier would put the wide column in
// the *first* grid track regardless of wideColumnSide, silently fighting
// it exactly the way this file's own render logic (DOM order driven by
// wideColumnSide) is supposed to be the single source of truth for that.
const RESET_ORDER_CLASS_BY_PREFIX: Record<'md' | 'lg', string> = {
  md: 'md:order-none',
  lg: 'lg:order-none',
};

/** stackedColumnOrder: 'narrowFirst' (default) needs no class on either
 * element — today's real DOM order already puts narrow first, a no-op.
 * 'wideFirst': `order-first` (Tailwind's own -9999 utility, unprefixed —
 * applies at every width up to whichever tier actually splits) on the wide
 * column alone is enough to move it ahead of the narrow column's own
 * (untouched, still order:0) default while stacked; RESET_ORDER_CLASS_BY_
 * PREFIX's own counter-class at the resolved split tier hands control back
 * to DOM order once the grid genuinely splits into two real tracks. */
function resolveWideColumnOrderClassName(
  stackedColumnOrder: SplitColumnLayoutConfig['stackedColumnOrder'],
  narrowColumnWidthTierMd: SplitColumnRatioTier,
  narrowColumnWidthTierLg: SplitColumnRatioTier,
): string {
  if (stackedColumnOrder !== 'wideFirst') return '';
  const splitPrefix = firstSplitTierPrefix(narrowColumnWidthTierMd, narrowColumnWidthTierLg);
  return ['order-first', splitPrefix ? RESET_ORDER_CLASS_BY_PREFIX[splitPrefix] : ''].filter(Boolean).join(' ');
}

export type SplitColumnLayoutColors = {
  wideColumnColor: string;
  narrowColumnColor: string;
  headerSplitLeftColor: string;
  headerSplitRightColor: string;
};

/**
 * Resolves the layout's four derived colors — two column backgrounds, two
 * header split-band colors — from either the palette engine (keyed off
 * activeColorIndex, same continuous ramp the dock's slides use) or the
 * config's own fixed custom colors. `wideColumnSide` decides which resolved
 * color lands on the header's physical left vs. right half, so the band
 * never falls out of sync with the body grid beneath it.
 */
export function resolveSplitColumnLayoutColors(
  config: SplitColumnLayoutConfig,
  activeColorIndex: number,
  paletteConfig?: AbstractPostDockPaletteConfig,
  paletteStopCount?: number,
): SplitColumnLayoutColors {
  let wideColumnColor: string;
  let narrowColumnColor: string;
  if (config.colorSource === 'palette' && paletteConfig && paletteStopCount) {
    narrowColumnColor = resolveSplitColumnAccent(activeColorIndex, paletteStopCount, paletteConfig);
    wideColumnColor = narrowColumnColor;
  } else {
    wideColumnColor = config.wideColumnCustomColor;
    narrowColumnColor = config.narrowColumnCustomColor;
  }
  const anchorColor = config.wideColumnSide === 'left' ? narrowColumnColor : wideColumnColor;
  const headerSplitLeftColor = anchorColor;
  const headerSplitRightColor = complementCssColor(anchorColor);
  return {
    wideColumnColor,
    narrowColumnColor,
    headerSplitLeftColor,
    headerSplitRightColor,
  };
}

export type SplitColumnLayoutProps = {
  config: SplitColumnLayoutConfig;
  wideColumn: ReactNode;
  narrowColumn: ReactNode;
  /** Grid wrapper's own className — column-count/ratio classes are always
   * appended, so this is for spacing/positioning only. */
  className?: string;
  wideColumnClassName?: string;
  narrowColumnClassName?: string;
  /** Per-instance CSS custom properties / transitions (e.g. a page's own
   * palette-derived background-color + entrance transition) — the slot
   * classNames above cover static styling, this covers whatever a page
   * still needs to set inline. */
  wideColumnStyle?: CSSProperties;
  narrowColumnStyle?: CSSProperties;
  /** Opt-in: overrides resolveGridColsClassName's own literal ratio split
   * with an explicit pixel boundary (grid-template-columns: {value}px 1fr) — the
   * first column's own width from this grid's own left edge, regardless of
   * wideColumnSide (which only decides DOM order/content assignment, not
   * this). For a page whose column split must land at an exact pixel
   * matched elsewhere (e.g. a header's own live-measured nav-split
   * position) rather than a percentage of this grid's own — possibly
   * padded/capped/centered — box, which a plain percentage has no way to
   * guarantee agreement with. Only meaningful at the same md breakpoint
   * the percentage classes themselves apply from — passing a value below
   * that breakpoint would incorrectly override the mobile grid-cols-1
   * single-column collapse, so callers must gate this to md+ themselves
   * (see pages/abstract.tsx's own desktopNavAlignmentActive). Undefined
   * (default, what /about uses): today's plain percentage behavior,
   * unchanged. */
  measuredWideColumnBoundaryPx?: number;
  /** Opt-in refs on each column's own outer cell — the same box
   * measuredWideColumnBoundaryPx's own doc comment describes ("the first
   * column's own width from this grid's own left edge"). Exists so a
   * measurement hook (useSplitColumnNavAlignment) can read that cell's real
   * position directly, instead of a page rooting its own ref one level
   * deeper inside page-authored content — which is exactly where an
   * accidental padding class previously broke the measurement it fed (see
   * that hook's own doc comment). Undefined (default): no ref attached,
   * unchanged behavior for every existing caller. */
  wideColumnRef?: Ref<HTMLDivElement>;
  narrowColumnRef?: Ref<HTMLDivElement>;
};

/**
 * Two-column shell extracted from pages/about.tsx's own `.splitGrid` (see
 * PLAN-HOMEPAGE-IA-LAYOUT.md Section 8). Owns only the grid ratio and named
 * slots — height, padding, background hookup, and any per-page chrome
 * (e.g. about.tsx's nav-control triangles) stay page-owned via
 * wideColumnClassName/narrowColumnClassName.
 */
export function SplitColumnLayout({
  config,
  wideColumn,
  narrowColumn,
  className,
  wideColumnClassName,
  narrowColumnClassName,
  wideColumnStyle,
  narrowColumnStyle,
  measuredWideColumnBoundaryPx,
  wideColumnRef,
  narrowColumnRef,
}: SplitColumnLayoutProps) {
  const normalized = normalizeSplitColumnLayoutConfig(config);
  const gridClassName = [
    'grid w-full',
    resolveGridColsClassName(
      normalized.wideColumnSide,
      normalized.narrowColumnWidthTierMd,
      normalized.narrowColumnWidthTierLg,
    ),
    className,
  ].filter(Boolean).join(' ');
  const gridStyle = typeof measuredWideColumnBoundaryPx === 'number'
    ? { gridTemplateColumns: `${measuredWideColumnBoundaryPx}px 1fr` }
    : undefined;
  const wideColumnOrderClassName = resolveWideColumnOrderClassName(
    normalized.stackedColumnOrder,
    normalized.narrowColumnWidthTierMd,
    normalized.narrowColumnWidthTierLg,
  );

  // 'relative' here (not folded into wideColumnClassName/narrowColumnClassName
  // above) exists solely so LayoutDebugOverlay's own 'absolute inset-0' can
  // anchor to this exact box — a no-op for layout/paint among siblings on an
  // element with no other explicit position, see LayoutDebug.tsx's own doc
  // comment for why this can never change existing layout. wideColumnOrder
  // ClassName is '' for the default stackedColumnOrder ('narrowFirst') — see
  // resolveWideColumnOrderClassName's own doc comment.
  const wideColumnEl = (
    <div
      ref={wideColumnRef}
      className={[wideColumnClassName, 'relative', wideColumnOrderClassName].filter(Boolean).join(' ')}
      style={wideColumnStyle}
    >
      {wideColumn}
      <LayoutDebugOverlay tone="wideColumn" label="WIDE COLUMN" />
    </div>
  );
  const narrowColumnEl = (
    <div ref={narrowColumnRef} className={[narrowColumnClassName, 'relative'].filter(Boolean).join(' ')} style={narrowColumnStyle}>
      {narrowColumn}
      <LayoutDebugOverlay tone="narrowColumn" label="NARROW COLUMN" />
    </div>
  );

  return (
    <div className={gridClassName} style={gridStyle}>
      {normalized.wideColumnSide === 'left' ? (
        <>
          {wideColumnEl}
          {narrowColumnEl}
        </>
      ) : (
        <>
          {narrowColumnEl}
          {wideColumnEl}
        </>
      )}
    </div>
  );
}
