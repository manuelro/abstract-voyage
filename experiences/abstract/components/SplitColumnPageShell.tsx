import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, Ref } from 'react';
import { LayoutDebugOverlay } from '../../../components/LayoutDebug';
import { PageContainer } from '../../../components/PageContainer';
import type { PageSurfaceConfig } from '../../../components/PageSurface.config';
import { normalizePageSurfaceConfig } from '../../../components/PageSurface.config';
import { SplitColumnLayout } from './SplitColumnLayout';
import {
  normalizeSplitColumnLayoutConfig,
  type SplitColumnLayoutConfig,
} from './SplitColumnLayout/config/registered';
import {
  useSplitColumnNavAlignment,
  type SplitColumnNavAlignment,
} from './SplitColumnPageShell/hooks/useSplitColumnNavAlignment';

/**
 * The bundle of everything this shell computes internally and, before the
 * `header` render-prop existed, fed straight into its own hardcoded
 * `<SiteHeader>` call — a page constructing its *own* header (via
 * `header` below) needs these same values, since none of them can be
 * trivially reconstructed from a page's own inputs alone:
 * `primaryNavRef` is this shell's own internal `useSplitColumnNavAlignment`
 * ref, which the page's own header must attach to its real `<nav>` element
 * for that hook's own live measurement to work; `navSplitBoundaryPx` is gated on
 * `autoAlignNavSplit`'s own live measurement; `splitBandBoundaryPx`/
 * `physicalRightColumnColor` originate one layer up, in `PolymorphicLayout`'s
 * own `usePolymorphicLayoutColors()`, and arrive here as plain passthrough
 * props (not computed by this component itself, despite living in this same
 * bundle — see PLAN-POLYMORPHIC-LAYOUT-DECOUPLING.md's own "Notes from
 * execution" for that correction); `legibilityScrimLeftEnabled`/
 * `-RightEnabled` are derived from `splitColumnLayoutConfig`'s own header-
 * behavior fields plus `headerPositionMode`. See
 * PLAN-POLYMORPHIC-LAYOUT-DECOUPLING.md §1 for the full audit this type is
 * extracted from.
 */
export type HeaderSlotProps = {
  primaryNavRef: Ref<HTMLElement>;
  navSplitBoundaryPx: number | undefined;
  splitBandBoundaryPx: number | undefined;
  legibilityScrimLeftEnabled: boolean;
  legibilityScrimRightEnabled: boolean;
  physicalRightColumnColor: string | undefined;
};

// Literal classes only, per this codebase's Tailwind-only styling rule — no
// runtime-interpolated class string. inset-x-0/top-0 apply to both 'fixed'
// and 'sticky' identically; 'static' needs neither.
const HEADER_POSITION_CLASS: Record<'fixed' | 'sticky' | 'static', string> = {
  fixed: 'fixed inset-x-0 top-0',
  sticky: 'sticky inset-x-0 top-0',
  static: 'static',
};

export type SplitColumnPageShellProps = {
  pageSurfaceConfig: PageSurfaceConfig;
  /** <main>'s own background — defaults to pageSurfaceConfig.color. Split
   * out so a page mid-transition (e.g. /about's spacefield reveal) can
   * still drive its own transition on this value if it needs to. */
  backgroundColor?: string;
  className?: string;
  /** Merged into <main>'s own style, after `background` — for a page's own
   * CSS custom properties (e.g. /about's --about-nav-h-mobile/-desktop). */
  style?: CSSProperties;
  /** Render-prop that renders this shell's own header — every value that
   * only this shell's internal machinery can compute is handed to it via
   * `HeaderSlotProps` (see that type's own doc comment above). Required:
   * every real consumer of this component constructs its own concrete
   * header (typically `<SiteHeader>`) through this render-prop —
   * see PLAN-POLYMORPHIC-LAYOUT-DECOUPLING.md, which replaced this
   * component's own former hardcoded `<SiteHeader>` call with this
   * generic seam so this file no longer needs to import anything from
   * `SiteHeader.config.ts` at all. */
  header: (slotProps: HeaderSlotProps) => ReactNode;
  /** Rendered as a sibling of the header, inside the same overflow-
   * containing wrapper — e.g. /about's own SpacefieldBackground, which
   * needs to sit behind the header within that same clipped box. */
  headerOverlay?: ReactNode;
  /** Extra class(es) appended to the header's own wrapper div (`relative
   * isolate overflow-hidden`) — additive only, default `undefined` leaves
   * that wrapper exactly as /about has always used it. /abstract's card
   * stack (PLAN-VERTICAL-CARD-STACK.md) needs the header wrapper pulled to
   * an explicit stacking level (`z-[100]`) above its own `position: fixed`
   * card layer, since that layer's own explicit `z-index` would otherwise
   * paint above this wrapper's implicit `z-index: auto` regardless of DOM
   * order — but that requirement is /abstract-only, so it's opt-in per
   * page here rather than a change to what /about renders. */
  headerWrapperClassName?: string;
  /** Opt-in: exposes the header's own wrapping `relative isolate
   * overflow-hidden` div (see this component's own doc comment on why that
   * box, not just the header itself) so a page can measure its real
   * rendered height — e.g. to size its own split-column row to "the rest
   * of the viewport below the header" without re-deriving that height from
   * the header's own many independent config knobs (height/padding/margin)
   * by hand, which would just be another version of the "two things that
   * can silently drift" problem splitBandSide/wideColumnSide above already
   * had. Omit for a page with no such need. */
  headerWrapperRef?: Ref<HTMLDivElement>;
  /** Positioning strategy for the header's own wrapper div. 'fixed'
   * (default): viewport-pinned, always visible — every page that doesn't
   * pass this prop renders byte-identical to before this prop existed.
   * 'sticky': starts in normal document flow, then pins once scrolled to —
   * *ColumnHeaderBehavior's 'pushDown' reservation and legibilityScrimEnabled
   * both stay meaningful here, same as 'fixed'. 'static': normal document
   * flow, scrolls away with the page — nothing is ever reserved *for* it
   * beyond its own real flow height, so both *ColumnHeaderBehavior (would
   * double-count space already claimed by flow) and legibilityScrimEnabled
   * (nothing ever bleeds under a static element) are forced inert below
   * regardless of their own configured value. */
  headerPositionMode?: 'fixed' | 'sticky' | 'static';
  /** Passthrough for SiteHeaderProps' own navSplitBoundaryPx — see
   * that prop's doc comment. A page-owned, live-measured value, not
   * something this shell computes itself. */
  navSplitBoundaryPx?: number;
  /** Passthrough for SiteHeaderProps' own splitBandBoundaryPx —
   * see that prop's doc comment. Independent of navSplitBoundaryPx/
   * autoAlignNavSplit above; not merged into effectiveNavSplitBoundaryPx
   * below, since the two are deliberately decoupled. */
  splitBandBoundaryPx?: number;
  /** Passthrough for SiteHeaderProps' own physicalRightColumnColor —
   * see that prop's doc comment. Omit for a page not opting into the
   * header's 'column' colorMode. */
  physicalRightColumnColor?: string;
  splitColumnLayoutConfig: SplitColumnLayoutConfig;
  wideColumn: ReactNode;
  narrowColumn: ReactNode;
  wideColumnClassName?: string;
  narrowColumnClassName?: string;
  wideColumnStyle?: CSSProperties;
  narrowColumnStyle?: CSSProperties;
  /** Passthrough for SplitColumnLayout's own measuredWideColumnBoundaryPx —
   * see that prop's doc comment. */
  measuredWideColumnBoundaryPx?: number;
  /** 'bounded' (default): wraps SplitColumnLayout in the same PageContainer
   * gutter/max-width the header's own logo/nav row uses, so content aligns
   * to the logo/Contact button edges — /abstract's look. 'full-bleed':
   * renders SplitColumnLayout directly, no width cap — /about's look,
   * preserved unchanged from its own pre-shell implementation (see
   * about.module.css's own "no mx-auto, no max-width" comment). */
  contentContainer?: 'bounded' | 'full-bleed';
  /** 'bounded' only. Horizontal padding classes for the PageContainer this
   * wraps SplitColumnLayout in — literal Tailwind classes joined by the
   * caller (e.g. 'pl-5 md:pl-12 pr-5 md:pr-12'), never interpolated.
   * Undefined: no extra padding on this wrapper. `PolymorphicLayout`, this
   * component's only real caller, always supplies a real (possibly
   * empty-string) value here, computed from its own `bodyGutterPadding*`
   * config fields — this wrapper never derives its own padding from the
   * header's own config, keeping the two independently settable (a page's
   * own body inset doesn't move the header's padding, and vice versa). */
  bodyGutterClassName?: string;
  /** Opt-in, 'bounded' only: /about's own full-bleed columns already paint
   * edge-to-edge, but 'bounded' content is deliberately capped/centered
   * (see contentContainer's own doc comment — /abstract needs that cap for
   * its nav/logo alignment) which otherwise leaves the page's own
   * background showing through in the gutters on wide viewports once a
   * column color is active, rather than that color continuing to the true
   * viewport edges the way /about's does. When true (and
   * edgeBackdropSeamPx is a finite number), renders a full-viewport-width,
   * two-color backdrop *behind* the bounded content, split at
   * edgeBackdropSeamPx — colored from wideColumnStyle/narrowColumnStyle's
   * own backgroundColor, not a separate color prop, so this can never
   * disagree with what the bounded columns themselves are actually
   * painted. Default false: no change to any existing page. */
  edgeBackdropEnabled?: boolean;
  /** The live-measured, viewport-relative x position of the seam between
   * the two bounded columns (e.g. a page's own already-measured column
   * row's right edge, since the columns sit flush against each other with
   * no gap) — not re-derived from wideColumnSide's percentage against the
   * page's own maxWidth/padding by hand, which would just be another
   * instance of the "two things that can silently drift" problem
   * splitBandSide/wideColumnSide above already had. Undefined (no
   * measurement yet, e.g. before first paint) renders no backdrop rather
   * than guessing. */
  edgeBackdropSeamPx?: number;
  /** Opt-in: runs useSplitColumnNavAlignment (SplitColumnPageShell/
   * useSplitColumnNavAlignment.ts) internally and uses its output for
   * navSplitBoundaryPx/measuredWideColumnBoundaryPx/edgeBackdropSeamPx —
   * overriding whatever those three props were explicitly passed as. A page
   * opting in supplies none of that measurement code itself: no ref, no
   * state, no effect. Requires contentContainer: 'bounded' and
   * edgeBackdropEnabled to have any visible effect (same precondition
   * those three manual props already have). Default false: no effect on
   * any existing page. Every current consumer (`/about`, `/posts-lab`,
   * `/abstract` via `PolymorphicLayout`) uses this flag now — no page calls
   * `useSplitColumnNavAlignment` directly anymore. A page with an
   * additional downstream use of the raw measurement (e.g. `/abstract`'s
   * own hero text inset) reads it via `onNavAlignmentChange` below instead
   * of a second, independently-measured hook instance. */
  autoAlignNavSplit?: boolean;
  /** Fires whenever autoAlignNavSplit is on and this shell's internally-
   * computed SplitColumnNavAlignment object changes (viewport resize, ratio-
   * tier resolution, or a live remeasurement of the first column's own
   * rendered edges) — the promoted form of what a page's own direct
   * useSplitColumnNavAlignment() call used to read straight off the hook's
   * return value. Lets a caller with an additional downstream use of
   * navSplitBoundaryPx (e.g. /abstract's own hero text inset) consume the
   * exact same measurement this shell already computes internally, instead
   * of a second, independently-measured hook instance — see
   * autoAlignNavSplit's own doc comment for why a second instance is the
   * wrong shape (two numbers that can silently drift). No effect when
   * autoAlignNavSplit is false/omitted. */
  onNavAlignmentChange?: (alignment: SplitColumnNavAlignment) => void;
  /** Rendered after the SplitColumnLayout content, inside <main> — e.g. a
   * page's own dev-only settings panel. */
  children?: ReactNode;
};

/**
 * The `<main>` → `header` → (optional `PageContainer`) →
 * `SplitColumnLayout` assembly, shared by `/about` and `/abstract`'s
 * `splitColumn` presentation — previously duplicated by hand in both page
 * files, which had silently drifted (see PLAN-SPLIT-COLUMN-UX-REFINEMENTS.md
 * 1.1): `/abstract` had picked up a page-specific `marginTop` override that
 * `/about` never got, so the header sat at two different vertical offsets
 * and a route change between the pages visibly shifted it.
 *
 * The header is always wrapped in the same `relative isolate
 * overflow-hidden` box `/about` already used — that's not decorative, it's
 * what contains the header's own `marginTop` (a margin on a `<main>`
 * child can otherwise collapse straight through `<main>` to `<body>`,
 * whose own background is `bg-slate-950` — see globals.css — which is what
 * actually produced the earlier "empty dark gap at the top" report on
 * `/abstract`, not the margin itself). Both pages now go through the exact
 * same header call with the exact same (shared, already-configurable)
 * `marginTop`/`desktopMarginTop`, properly contained — fixing both reports
 * with the one change, not a new hardcoded override.
 */
export function SplitColumnPageShell({
  pageSurfaceConfig,
  backgroundColor,
  className,
  style,
  header,
  headerOverlay,
  headerWrapperClassName,
  headerWrapperRef,
  headerPositionMode = 'fixed',
  navSplitBoundaryPx,
  splitBandBoundaryPx,
  physicalRightColumnColor,
  splitColumnLayoutConfig,
  wideColumn,
  narrowColumn,
  wideColumnClassName,
  narrowColumnClassName,
  wideColumnStyle,
  narrowColumnStyle,
  measuredWideColumnBoundaryPx,
  contentContainer = 'bounded',
  bodyGutterClassName,
  edgeBackdropEnabled = false,
  edgeBackdropSeamPx,
  autoAlignNavSplit = false,
  onNavAlignmentChange,
  children,
}: SplitColumnPageShellProps) {
  const normalizedPageSurfaceConfig = normalizePageSurfaceConfig(pageSurfaceConfig);
  const normalizedSplitColumnLayoutConfig = normalizeSplitColumnLayoutConfig(splitColumnLayoutConfig);

  // See autoAlignNavSplit's own doc comment — always called (hooks can't be
  // conditional), but its output is only actually used below when the flag
  // is on; otherwise every value it would have overridden falls through to
  // the caller's own explicit props unchanged.
  const navAlignment = useSplitColumnNavAlignment({
    wideColumnSide: normalizedSplitColumnLayoutConfig.wideColumnSide,
    narrowColumnWidthTierMd: normalizedSplitColumnLayoutConfig.narrowColumnWidthTierMd,
    narrowColumnWidthTierLg: normalizedSplitColumnLayoutConfig.narrowColumnWidthTierLg,
  });
  // onNavAlignmentChange's own promotion — navAlignment is memoized by
  // useSplitColumnNavAlignment itself (keyed on its four primitive fields),
  // so this effect only re-fires when something actually changed, not on
  // every render; without that memoization this would be an infinite loop
  // (new object -> effect fires -> caller's setState -> re-render -> new
  // object -> ...).
  useEffect(() => {
    if (!autoAlignNavSplit || !onNavAlignmentChange) return;
    onNavAlignmentChange(navAlignment);
  }, [autoAlignNavSplit, onNavAlignmentChange, navAlignment]);
  // Gated on desktopNavAlignmentActive — navSplitBoundaryPx's own live-
  // measurement hook always resolves to a real number even while genuinely
  // stacked (an intentional placeholder for other consumers, documented on
  // the hook itself). SiteHeader's own navSplitOverlay grid now
  // renders at every breakpoint (previously hidden md:block, so this was
  // never live before) — forwarding the raw, ungated value here would
  // wrongly force a two-column split below md for any page using
  // autoAlignNavSplit (posts-lab). Same fix pattern already shipped once for
  // the header's own split-band, see PLAN-POSTS-LAB-MOBILE-LAYOUT.md §7.5.
  const effectiveNavSplitBoundaryPx = autoAlignNavSplit
    ? (navAlignment.desktopNavAlignmentActive ? navAlignment.navSplitBoundaryPx : undefined)
    : navSplitBoundaryPx;
  const effectiveMeasuredWideColumnBoundaryPx = autoAlignNavSplit
    ? navAlignment.measuredWideColumnBoundaryPx
    : measuredWideColumnBoundaryPx;
  const effectiveEdgeBackdropSeamPx = autoAlignNavSplit
    ? navAlignment.edgeBackdropSeamPx
    : edgeBackdropSeamPx;

  // SiteHeader's own legibilityScrimLeftEnabled/-RightEnabled are
  // physical-side booleans; splitColumnLayoutConfig's own fields are
  // wide/narrow-relative (see SplitColumnLayoutHeaderBehavior's own doc
  // comment for why) — same wideColumnSide-driven translation
  // resolveSplitColumnLayoutColors (SplitColumnLayout.tsx) already does for
  // the header split-band's own two colors, reused here so this doesn't
  // become a second, independently-computed version of that same mapping.
  // legibilityScrimEnabled alone (the operator's own opt-in) is not enough
  // to blur a side — that side's own column must also actually be 'float',
  // since a 'pushDown' side has nothing rendering under the header to blur.
  // headerPositionMode 'static' forces both float-driven scrim sides off —
  // see headerPositionMode's own doc comment above: a static header sits in
  // normal flow, so nothing ever bleeds underneath it regardless of either
  // column's own *ColumnHeaderBehavior choice.
  const wideColumnFloating = headerPositionMode !== 'static'
    && normalizedSplitColumnLayoutConfig.wideColumnHeaderBehavior === 'float';
  const narrowColumnFloating = headerPositionMode !== 'static'
    && normalizedSplitColumnLayoutConfig.narrowColumnHeaderBehavior === 'float';
  const legibilityScrimLeftEnabled = normalizedSplitColumnLayoutConfig.legibilityScrimEnabled
    && (normalizedSplitColumnLayoutConfig.wideColumnSide === 'left' ? wideColumnFloating : narrowColumnFloating);
  const legibilityScrimRightEnabled = normalizedSplitColumnLayoutConfig.legibilityScrimEnabled
    && (normalizedSplitColumnLayoutConfig.wideColumnSide === 'left' ? narrowColumnFloating : wideColumnFloating);

  // Internal-only measurement of the header wrapper's own real rendered
  // height, independent of headerWrapperRef above (a page-owned ref for the
  // page's *own* purposes, e.g. /abstract's splitColumnHeaderHeightPx —
  // still forwarded untouched below) — this one exists purely to size
  // whichever column(s) below opt into 'pushDown' (see
  // normalizedSplitColumnLayoutConfig.*ColumnHeaderBehavior below), so a
  // page never has to duplicate this measurement itself. Always measured,
  // not gated on either column's behavior, since panel edits can flip a
  // column to 'pushDown' at any time and this needs to already be live by
  // then. Merged onto the same DOM node as headerWrapperRef via
  // mergeHeaderWrapperRefs, not a second wrapper element, so both refs see
  // the identical box.
  const internalHeaderWrapperRef = useRef<HTMLDivElement | null>(null);
  const [measuredHeaderHeightPx, setMeasuredHeaderHeightPx] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const element = internalHeaderWrapperRef.current;
    if (!element) return undefined;
    const measure = () => setMeasuredHeaderHeightPx(element.getBoundingClientRect().height);
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  const mergeHeaderWrapperRefs = (node: HTMLDivElement | null) => {
    internalHeaderWrapperRef.current = node;
    if (!headerWrapperRef) return;
    if (typeof headerWrapperRef === 'function') headerWrapperRef(node);
    else (headerWrapperRef as { current: HTMLDivElement | null }).current = node;
  };

  // Each column's own choice of reserving space for the fixed header
  // ('pushDown') vs. letting it float over that column's content ('float')
  // — see SplitColumnLayoutHeaderBehavior's own doc comment. Applied as
  // marginTop, not paddingTop, and not a shared sibling spacer (the
  // pre-per-column mechanism) — margin shifts the column's own box
  // *position* without touching whatever height that box already computes
  // for itself (e.g. /about's .splitLeft/.splitRight own
  // `calc(100dvh - var(--about-nav-h))`, entirely page-owned CSS this shell
  // has no visibility into); padding would instead eat into that box's own
  // already-correct content area from the inside, double-counting the
  // header height. This reproduces the old shared spacer's net visual
  // effect (push the whole row down by the header's height) per column
  // instead of for the whole row at once — a page opting a column into
  // 'pushDown' is still responsible for sizing that column's own height/
  // min-height to leave room below the fold for it (about's own
  // --about-nav-h-driven calc already does this; see pages/abstract.tsx's
  // own wideColumnRowMinHeightCss/narrowColumnRowMinHeightCss for the
  // splitColumn-presentation equivalent). Merged after the caller's own
  // wideColumnStyle/narrowColumnStyle so neither ever loses its own
  // minHeight/backgroundColor. Undefined height (before the first measurement lands)
  // renders as 0 margin — the same graceful-degrade pattern this component
  // already uses elsewhere.
  // headerPositionMode 'static' forces 'pushDown' inert on both columns —
  // see headerPositionMode's own doc comment above: a static header already
  // claims real document-flow height on its own, so reserving marginTop for
  // it here on top of that would double-count the same space.
  const effectiveWideColumnStyle = headerPositionMode !== 'static'
    && normalizedSplitColumnLayoutConfig.wideColumnHeaderBehavior === 'pushDown'
    ? { ...wideColumnStyle, marginTop: measuredHeaderHeightPx ?? 0 }
    : wideColumnStyle;
  const effectiveNarrowColumnStyle = headerPositionMode !== 'static'
    && normalizedSplitColumnLayoutConfig.narrowColumnHeaderBehavior === 'pushDown'
    ? { ...narrowColumnStyle, marginTop: measuredHeaderHeightPx ?? 0 }
    : narrowColumnStyle;

  // useSplitColumnNavAlignment's own firstColumnRef must land on whichever
  // column is physically first (left) — the same column
  // measuredWideColumnBoundaryPx's own width describes (see that prop's doc
  // comment on SplitColumnLayoutProps). Only attached when autoAlignNavSplit
  // is on; otherwise neither ref prop is set, unchanged from today.
  const wideColumnRef = autoAlignNavSplit && normalizedSplitColumnLayoutConfig.wideColumnSide === 'left'
    ? navAlignment.firstColumnRef
    : undefined;
  // navAlignment.narrowColumnRef (mobileNavAlignBasePx's own measurement)
  // always needs the real narrow column specifically, regardless of which
  // side is wide — unlike firstColumnRef above, which only lands on the
  // narrow column when it happens to be physically first. When wideColumnSide
  // is 'right' both refs target the same element, so they're merged into one
  // callback (same "combine two ref callbacks" shape as mergeHeaderWrapperRefs
  // below); when 'left', firstColumnRef goes to wideColumnRef instead (above)
  // and this callback is the narrow column's only ref.
  const narrowColumnRef = autoAlignNavSplit
    ? (element: HTMLDivElement | null) => {
      navAlignment.narrowColumnRef(element);
      if (normalizedSplitColumnLayoutConfig.wideColumnSide === 'right') navAlignment.firstColumnRef(element);
    }
    : undefined;

  const layout = (
    <SplitColumnLayout
      config={splitColumnLayoutConfig}
      wideColumnClassName={wideColumnClassName}
      narrowColumnClassName={narrowColumnClassName}
      wideColumnStyle={effectiveWideColumnStyle}
      narrowColumnStyle={effectiveNarrowColumnStyle}
      measuredWideColumnBoundaryPx={effectiveMeasuredWideColumnBoundaryPx}
      wideColumnRef={wideColumnRef}
      narrowColumnRef={narrowColumnRef}
      wideColumn={wideColumn}
      narrowColumn={narrowColumn}
    />
  );

  return (
    <main
      className={[
        'relative min-h-[100dvh] overflow-x-clip',
        className,
      ].filter(Boolean).join(' ')}
      style={{ background: backgroundColor ?? normalizedPageSurfaceConfig.color, ...style }}
    >
      {/* headerPositionMode default 'fixed': the header never claims
          document-flow height itself; each column's own
          splitColumnLayoutConfig.*ColumnHeaderBehavior (see
          effectiveWideColumnStyle/effectiveNarrowColumnStyle above) decides
          whether that column gives the space back via its own marginTop.
          'sticky'/'static' — see headerPositionMode's own doc comment above.
          isolate + overflow-hidden — see this component's own doc comment
          for why this wrapper (not just the header itself) is load-bearing. */}
      <div
        ref={mergeHeaderWrapperRefs}
        className={[
          HEADER_POSITION_CLASS[headerPositionMode],
          'z-[1000] isolate overflow-hidden',
          headerWrapperClassName,
        ].filter(Boolean).join(' ')}
      >
        {headerOverlay}
        {header({
          primaryNavRef: navAlignment.navRef,
          navSplitBoundaryPx: effectiveNavSplitBoundaryPx,
          splitBandBoundaryPx,
          legibilityScrimLeftEnabled,
          legibilityScrimRightEnabled,
          physicalRightColumnColor,
        })}
      </div>
      {contentContainer === 'bounded' ? (
        <div className="relative">
          {edgeBackdropEnabled && typeof effectiveEdgeBackdropSeamPx === 'number' ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 hidden md:block">
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${effectiveEdgeBackdropSeamPx}px`,
                  backgroundColor: normalizedSplitColumnLayoutConfig.wideColumnSide === 'left'
                    ? wideColumnStyle?.backgroundColor
                    : narrowColumnStyle?.backgroundColor,
                }}
              />
              <div
                className="absolute inset-y-0 right-0"
                style={{
                  left: `${effectiveEdgeBackdropSeamPx}px`,
                  backgroundColor: normalizedSplitColumnLayoutConfig.wideColumnSide === 'left'
                    ? narrowColumnStyle?.backgroundColor
                    : wideColumnStyle?.backgroundColor,
                }}
              />
            </div>
          ) : null}
          <PageContainer
            className={`relative z-[1] ${bodyGutterClassName ?? ''}`}
            config={normalizedPageSurfaceConfig}
          >
            {layout}
            {/* Encloses wideColumn/narrowColumn's own overlays, not a
                replacement for them — this box is the gutter-padded wrapper
                itself (bodyGutterClassName above), so its own padding is
                exactly the area visible between this outline and the column
                overlays nested inside it. */}
            <LayoutDebugOverlay tone="body" label="BODY" />
          </PageContainer>
        </div>
      ) : layout}
      {children}
    </main>
  );
}
