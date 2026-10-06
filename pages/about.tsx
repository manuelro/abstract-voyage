import SeoHead from '../components/SeoHead';
import { buildSiteTitle } from '../helpers/siteMetadata';
import { SiteContentProvider } from '../helpers/content/SiteContentProvider';
import type { AboutPageContent, SiteContent } from '../helpers/content/pageContent.schema';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { PanelShell, PanelStandardHeaderActions } from '../components/Panel';
import {
  ConfigScopeList,
  createConfigScopeBinding,
  useConfigPanelBindings,
} from '../components/Panel/config';
import { CTA_BUTTON_MOTION_EASINGS } from '../components/CtaButton/config/registered';
import {
  DEFAULT_PAGE_SURFACE_CONFIG,
  normalizePageSurfaceConfig,
} from '../components/PageSurface.config';
import { DEFAULT_LAYOUT_DEBUG_CONFIG } from '../components/LayoutDebug.config';
import { useSharedDesignConfig } from '../components/SharedDesignConfigProvider';
import { useAbstractDesignConfig } from '../experiences/abstract/components/AbstractDesignConfigProvider';
import { DEFAULT_PANEL_SHELL_CONFIG } from '../components/Panel/config/shell';
import { useAuthoringToolsVisibility } from '../components/Panel/useAuthoringToolsVisibility';
import { buildSplitAlignedSiteHeaderConfig } from '../experiences/abstract/components/SiteHeader/hooks/buildSplitAlignedSiteHeaderConfig';
import { SiteHeader } from '../experiences/abstract/components/SiteHeader';
import { buildEffectiveSiteHeaderConfig } from '../experiences/abstract/components/SiteHeader/buildEffectiveSiteHeaderConfig';
import { DEFAULT_SITE_HEADER_CONFIG } from '../experiences/abstract/components/SiteHeader/config/registered';
import { DEFAULT_WORDMARK_CONFIG } from '../experiences/abstract/components/SiteHeader/config/wordmark';
import {
  ABOUT_SITE_HEADER_COLOR_OVERRIDE_CONFIG,
  normalizeSiteHeaderColorOverrideConfig,
  type SiteHeaderColorOverrideConfig,
} from '../experiences/abstract/components/SiteHeader/config/colorOverride';
import { useNormalizedSiteHeaderConfig } from '../experiences/abstract/components/SiteHeader/hooks/useNormalizedSiteHeaderConfig';
import { ABOUT_SITE_HEADER_COLOR_OVERRIDE_PANEL } from '../experiences/abstract/components/SiteHeader/config/colorOverride.panel';
import {
  ABSTRACT_DESIGN_CONFIG_BINDING_KEYS_BY_PAGE,
  useAbstractDesignConfigBindings,
} from '../experiences/abstract/hooks/useAbstractDesignConfigBindings';
import {
  AbstractPostDock,
  DEFAULT_LIQUID_SLIDER_CONFIG,
  LiquidGradientAdapter,
} from '../experiences/abstract/components/AbstractPostDock';
import { useLiquidSliderMotion } from '../experiences/abstract/components/AbstractPostDock/hooks/motion';
import {
  resolveAbstractPostDockEasing,
  type AbstractPostDockLayoutConfig,
  type AbstractPostDockPaletteConfig,
} from '../experiences/abstract/components/AbstractPostDock/config/registered';
import {
  buildDeckPaletteStates,
  deckWindowHueOffset,
  deckWindowOffsetX,
  deckGaussianOffsetX,
  deckGaussianEnvelope,
  deckKinshipSeed,
  mixRgb,
  scaleRgbLightness,
} from '../experiences/abstract/helpers/deckPalette';
import {
  useGaussianProximityBand,
  useGaussianProximityMorph,
} from '../experiences/abstract/helpers/useGaussianProximityMorph';
import {
  narrowColumnContentBoxProps,
  NarrowColumnContent,
  PolymorphicLayout,
  usePolymorphicLayoutColors,
} from '../experiences/abstract/components/PolymorphicLayout';
import { usePolymorphicColumnAdaptiveInk } from '../experiences/abstract/components/usePolymorphicColumnAdaptiveInk';
import { resolvePolymorphicNarrowColumnTypography } from '../experiences/abstract/components/PolymorphicLayout.narrowColumnTypography';
import { DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG } from '../components/GlobalTypography.config';
import { resolveContrastAwareTextColor } from '../helpers/surfaceColorDerivation';
import {
  normalizePolymorphicLayoutConfig,
  type PolymorphicLayoutConfig,
} from '../experiences/abstract/components/PolymorphicLayout.config';
import { useMeasuredElementRect } from '../components/useMeasuredElementRect';
import { usePrefersReducedMotion } from '../helpers/usePrefersReducedMotion';
import { AboutSlideNavControl } from '../experiences/about/components/AboutSlideNavControl';
import { AboutSlidesProvider, useAboutSlides } from '../experiences/about/AboutSlidesContext';
import {
  resolveSplitColumnAccent,
  parseCssColorToRgb,
} from '../experiences/abstract/components/SplitColumnLayout/colorResolution';
import type { SliderContentSlide } from '../helpers/postContent';
import { spacefieldConfigPanelRegistry } from '../experiences/spacefield/configPanels';
import { SPACEFIELD_SCOPE_ID } from '../experiences/spacefield/SpacefieldBackground/config/panel';
import {
  DEFAULT_SPACEFIELD_CONFIG,
  normalizeSpacefieldConfig,
  type SpacefieldConfig,
} from '../experiences/spacefield/SpacefieldBackground/config/registered';
import { SpacefieldBackground } from '../experiences/spacefield/SpacefieldBackground';
import {
  ABOUT_POLYMORPHIC_LAYOUT_CONFIG,
  DEFAULT_ABOUT_PAGE_TIMELINE_CONFIG,
  DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG,
  DEFAULT_ABOUT_TOP_SEGMENT_GRADIENT_CONFIG,
  ABOUT_DEFAULT_DOCK_PALETTE_CONFIG,
  ABOUT_DEFAULT_DOCK_LAYOUT_CONFIG,
  normalizeAboutPageLayoutConfig,
  normalizeAboutTopSegmentGradientConfig,
  type AboutPageLayoutConfig,
  type AboutTopSegmentGradientConfig,
} from './about.config';
import {
  ABOUT_PAGE_LAYOUT_SCOPE_ID,
  ABOUT_TIMELINE_SCOPE_ID,
  ABOUT_TOP_SEGMENT_GRADIENT_SCOPE_ID,
  ABOUT_DOCK_PALETTE_SCOPE_ID,
  ABOUT_DOCK_LAYOUT_SCOPE_ID,
  ABOUT_POLYMORPHIC_LAYOUT_PANEL,
} from './about.panel';
import { aboutConfigPanelRegistry } from './aboutConfigPanels';
import { LG_BREAKPOINT_PX, MD_BREAKPOINT_PX } from '../components/breakpoints';
import { useBreakpointTier } from '../components/useBreakpointTier';
import { AboutMobileAccordion } from '../experiences/about/components/AboutMobileAccordion';
import {
  DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG,
  normalizeAboutMobileAccordionConfig,
  type AboutMobileAccordionConfig,
} from '../experiences/about/components/AboutMobileAccordion.config';
import { ABOUT_MOBILE_ACCORDION_SCOPE_ID } from '../experiences/about/components/AboutMobileAccordion.panel';
import { AboutTimeline } from '../experiences/about/components/AboutTimeline';
import {
  normalizeAboutTimelineConfig,
  type AboutTimelineConfig,
} from '../experiences/about/components/AboutTimeline.config';
import styles from './about.module.css';

// /about uses one compact composition through tablet. Derive the boundary
// from the shared lg breakpoint so the runtime branch and the Polymorphic
// Layout panel's stacked tablet value cannot drift apart.
const NARROW_VIEWPORT_MEDIA_QUERY = `(max-width: ${LG_BREAKPOINT_PX - 1}px)`;

// Legible against the spacefield's own dark backgroundColor — the header's
// nav text/logo are otherwise tuned for the light tan/blue split-band this
// page normally shows, which the spacefield replaces outright (see
// spacefieldVisible below), not merely covers.
const SPACEFIELD_HEADER_NAV_TEXT_COLOR = '#f4f4fa';
const SPACEFIELD_HEADER_NAV_BORDER_COLOR = 'rgba(244, 244, 250, 0.4)';

// PLAN-DOCK-PALETTE-CONFIG-SEGREGATION.md: ABOUT_DEFAULT_DOCK_LAYOUT_CONFIG
// (this page's own baseline — vertical minimal-mode slider, not the
// component's raw scattered-mode DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG,
// which is what abstract.tsx's own JOURNAL section reads directly and must
// stay untouched) moved to about.config.ts so ABOUT_DOCK_LAYOUT_PANEL
// (about.panel.ts) could also import it as its own scope's `copy` target —
// same fix already applied to ABOUT_DEFAULT_DOCK_PALETTE_CONFIG below.

const ABOUT_DOCK_PALETTE_DEFINITION =
  aboutConfigPanelRegistry.resolve(ABOUT_DOCK_PALETTE_SCOPE_ID);
const ABOUT_DOCK_LAYOUT_DEFINITION =
  aboutConfigPanelRegistry.resolve(ABOUT_DOCK_LAYOUT_SCOPE_ID);
const ABOUT_PAGE_LAYOUT_DEFINITION =
  aboutConfigPanelRegistry.resolve(ABOUT_PAGE_LAYOUT_SCOPE_ID);
const ABOUT_MOBILE_ACCORDION_DEFINITION =
  aboutConfigPanelRegistry.resolve(ABOUT_MOBILE_ACCORDION_SCOPE_ID);
const ABOUT_TIMELINE_DEFINITION =
  aboutConfigPanelRegistry.resolve(ABOUT_TIMELINE_SCOPE_ID);
const ABOUT_TOP_SEGMENT_GRADIENT_DEFINITION =
  aboutConfigPanelRegistry.resolve(ABOUT_TOP_SEGMENT_GRADIENT_SCOPE_ID);
const SPACEFIELD_DEFINITION =
  spacefieldConfigPanelRegistry.resolve(SPACEFIELD_SCOPE_ID);

// CNT-01 (about-IA-timeline-copy-rework) — single source of truth for the
// desktop left-column timeline (AboutTimeline, mounted below) and the
// mobile accordion's own collapsed-preview headers (ABOUT_NARRATIVE_PREVIEWS
// below). Every date/range/scale claim on this page lives here and only
// here — see the left/right column rule above ABOUT_EDITORIAL_HEADLINE for
// why. slideIndex must equal each row's own array position — a row
// activates the dock slide/accordion item at that index and vice versa
// (AboutSlidesContext.activeIndex). The 2018-2023 and 2023-2025 ranges
// deliberately elide the real April-November 2023 gap between them; no
// per-year granularity is meant here. McKinsey (row index 3) is past
// employment — tense in AboutTimelineRow's own rendering must reflect that.
// Row 4 ("On my own") stays deliberately vague — no client count, no team
// size, no named clients (see the left/right column rule's own "opacity is
// deliberate" note).
// Left column (index 0) + the five slides (index 1..5) share one continuous
// ramp (ABOUT_PALETTE_STOP_COUNT stops), so the left panel reads as part of
// the same palette sequence the dock's own slides use rather than an
// arbitrarily-picked color.
const LEFT_PANEL_PALETTE_INDEX = 0;
// The header's own top-segment row (topSegmentDynamicBackgroundEnabled) is
// deliberately NOT a stop in the ABOUT_PALETTE_STOP_COUNT ramp above — an
// earlier version of this feature inserted one there, but that ramp/count
// only ever drives resolveSplitColumnAccent's flat, non-WebGL fallback
// values (the left panel's own solid color, and each dock slide's brief
// pre-paint fallback backgroundColor). The narrative rows' own real,
// visible color comes from a SEPARATE computation entirely:
// AbstractPostDock's own internal buildDeckPaletteStates(aboutSlides, ...)
// call (experiences/abstract/components/AbstractPostDock/components/
// View.tsx), which derives each row's hueOffset from its own position
// *within the aboutSlides array itself* (deckWindowHueOffset(localIndex,
// aboutSlides.length, hueSpread) — an N-item window sized to however many
// narrative slides exist (5, since about-IA-timeline-copy-rework's DEC-06:
// accept the redistribution — this mechanism is one continuous field sliced
// across however many slides render, by design; growing the slide count
// shifts every hue, which is the intended behavior, not a regression),
// regardless of ABOUT_PALETTE_STOP_COUNT) and feeds it through the real
// WebGL shader (LiquidGradientAdapter) — the flat accent is never what's
// actually painted once that shader has a frame ready. Inserting a stop
// into the unrelated 6-stop ramp changed the header's own flat fallback
// color but had zero effect on the narrative rows' actual rendered hue,
// which is why the two visually diverged so badly (operator-reported,
// confirmed via a live screenshot: a flat, bright, saturated lime top
// segment against deep, muted teal/purple rows). The correct fix (see
// topSegmentPaletteState below) computes the header's own hueOffset via
// the exact same deckWindowHueOffset(index, count, hueSpread) call the
// rows use, at index -1 in that SAME N-item window — "one slide before the
// first" — and renders it through the same LiquidGradientAdapter shader,
// not a CSS approximation.
// Arbitrary but stable — id/seed only need to differ from every real slide's
// own (0..3) and stay constant across renders (used as GradientRenderer's
// own effect dependency and deckKinshipSeed's own base value).
const TOP_SEGMENT_SLIDE_ID = -1;
const TOP_SEGMENT_SLIDE_SEED = 0.5;

// A11Y-01 (about-IA-timeline-copy-rework) — the single dock region
// AboutTimeline's own tabs (role="tab", aria-controls) point at, via
// role="tabpanel" on the desktop dock's own wrapper below. One shared
// region whose content changes, not a separate tabpanel per slide — the
// desktop dock (AbstractPostDock/View.tsx) is a shared, multi-page
// component this page must not fork just to thread a per-slide id through
// it; this stays a page-local wrapper around that component's existing
// render instead.
const ABOUT_TIMELINE_PANEL_ID = 'about-timeline-panel';

// resolveSplitColumnAccent/parseCssColorToRgb (the left column's own
// palette-derived color + the nav control's idle/hover RGB math) live in
// components/SplitColumnLayout/colorResolution.ts — relocated, not
// rewritten, so /about's colors are still the same pure functions
// abstract.tsx's WebGL pipeline is built on
// (experiences/abstract/helpers/deckPalette.ts), just shared with
// SplitColumnLayout's other consumers instead of page-local here. The
// header split-band's own former chained-hue-complement algorithm
// (complementCssColor) is dropped — see usePolymorphicLayoutColors's own
// call above.

// Tailwind's numeric spacing tokens (h-N, mt-N, ...) are always N * 4px —
// parsing the literal token avoids a second hand-maintained px lookup table
// alongside SiteHeaderConfig's own token unions.
function tailwindTokenToPx(token: string): number {
  const match = token.match(/-(\d+(?:\.\d+)?)$/);
  return match ? Number(match[1]) * 4 : 0;
}
// Slide-navigation state (activeIndex, prev/next triggers) lives in
// AboutSlidesContext, shared by AboutSlideNavControl (narrow column) and
// AbstractPostDock (wide column) — a thin wrapper provides it since a
// component can't consume a context it renders the Provider for within its
// own return (see AboutPageContent's own doc comment below).
type AboutPageProps = { pageContent: AboutPageContent; siteContent: SiteContent };

export async function getStaticProps() {
  const { loadAboutPageContent, loadSiteContent } = await import('../helpers/content/pageContent.build');
  return { props: { pageContent: loadAboutPageContent(), siteContent: loadSiteContent() } };
}

export default function AboutPage({ pageContent, siteContent }: AboutPageProps) {
  return (
    <SiteContentProvider site={siteContent} page={pageContent}>
      <AboutSlidesProvider slideCount={pageContent.timeline.length}>
        <AboutPageContent pageContent={pageContent} />
      </AboutSlidesProvider>
    </SiteContentProvider>
  );
}

/** All of /about's own real render logic — a descendant of AboutSlidesProvider
 * (rendered by the default-exported wrapper above) so it can call
 * useAboutSlides() itself to source AbstractPostDock's activeIndex/
 * onActiveIndexChange props from the shared context, same interface as
 * before, just sourced from context instead of a local useState. */
function AboutPageContent({ pageContent }: { pageContent: AboutPageContent }) {
  const aboutTimelineRows = pageContent.timeline.map((row, slideIndex) => ({
    caption: `${row.title}, ${row.period}`,
    line: row.line,
    slideIndex,
  }));
  const aboutNarrativeParagraphs = pageContent.timeline.map(row => row.body);
  const aboutNarrativePreviews = aboutTimelineRows.map(row => row.caption);
  const aboutPaletteStopCount = aboutNarrativeParagraphs.length + 1;
  const {
    pageSurfaceConfig,
    setPageSurfaceConfig,
    panelShellConfig,
    setPanelShellConfig,
    setLayoutDebugConfig,
  } = useSharedDesignConfig();
  const {
    siteHeaderConfig, setSiteHeaderConfig, wordmarkConfig, setWordmarkConfig,
  } = useAbstractDesignConfig();
  // Page-local override of the shared siteHeaderConfig's color fields —
  // enabled: false (default) inherits the shared foundation exactly like
  // every other page. Seeded from this page's own complete config
  // (ABOUT_SITE_HEADER_COLOR_OVERRIDE_CONFIG), not a shared
  // DEFAULT_..._CONFIG object — see SiteHeaderColorOverride.config.ts's
  // own doc comment for the full per-page config ownership model
  // (PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md).
  const [siteHeaderColorOverride, setSiteHeaderColorOverride] =
    useState<SiteHeaderColorOverrideConfig>(() => (
      normalizeSiteHeaderColorOverrideConfig(ABOUT_SITE_HEADER_COLOR_OVERRIDE_CONFIG)
    ));
  const normalizedPageSurfaceConfig = useMemo(
    () => normalizePageSurfaceConfig(pageSurfaceConfig),
    [pageSurfaceConfig],
  );
  const normalizedSiteHeaderConfig = useNormalizedSiteHeaderConfig(siteHeaderConfig, siteHeaderColorOverride);
  const [spacefieldConfig, setSpacefieldConfig] = useState<SpacefieldConfig>(
    () => normalizeSpacefieldConfig(DEFAULT_SPACEFIELD_CONFIG),
  );
  // Mirrors usePrefersReducedMotion's own shape (matchMedia + live
  // listener, SSR-safe default) — kept as a plain local effect rather than
  // a new shared hook, since the spacefield's narrow-mode decision below is
  // its only consumer today.
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia(NARROW_VIEWPORT_MEDIA_QUERY);
    const handleChange = () => setIsNarrowViewport(mediaQuery.matches);
    handleChange();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);
  const prefersReducedMotion = usePrefersReducedMotion();
  // Live tier for the gradient scale/noise breakpoint split below — same
  // 'mobile' | 'md' | 'lg' vocabulary/hook PolymorphicLayout's own tiered
  // color resolution already reads (components/useBreakpointTier.ts), not
  // a second independent viewport check.
  const { tier: gradientBreakpointTier } = useBreakpointTier();
  // Each region's own starfield instance is fully self-contained (see
  // SpacefieldBackground's own doc comment) — no DOM measurement, no
  // cross-region geometry, nothing here beyond "is it on." The header's
  // instance originates at its own bottom-left corner (stars travel up and
  // right); the hero panel's originates at its own top-right corner (stars
  // travel down and left) — the two corners sit at the same physical point
  // on screen, and the two directions continue each other, which is what
  // reads as one diagonal current crossing the seam even though they're two
  // independent fields that never share state.
  //
  const spacefieldVisible = spacefieldConfig.enabled
    && !(isNarrowViewport && spacefieldConfig.narrowBehavior === 'hidden');
  // Local override, layered on top of the shared header config rather than
  // mutating it — only applied while the spacefield is actually visible, so
  // every other page reading the same shared siteHeaderConfig is
  // unaffected. logoColor is NOT overridden here (unlike navTextColor/
  // navBorderColor, which get a hardcoded light override for the nav links
  // sitting over the right 62%, the part that does turn into visible
  // starfield): SiteHeader itself already recomputes the logo's own
  // 'column'-mode color internally from physicalLeftColumnColor (see the
  // render call below), so a second, redundant hardcoded override here
  // isn't needed — and would be actively wrong if colorMode were ever
  // 'custom' or 'surface' instead, which SiteHeader's own internal
  // resolveSiteHeaderLogoStops call already handles correctly on its own.
  const spacefieldHeaderConfig = useMemo(() => ({
    ...normalizedSiteHeaderConfig,
    colorMode: 'custom' as const,
    navTextColor: SPACEFIELD_HEADER_NAV_TEXT_COLOR,
    navBorderColor: SPACEFIELD_HEADER_NAV_BORDER_COLOR,
  }), [normalizedSiteHeaderConfig]);

  // Real, live-measured header height — NOT derived from the header's own
  // Tailwind height/marginTop tokens (the previous approach here). That
  // token math silently resolved to 0 at the mobile breakpoint: SiteHeader's
  // own `height` field defaults to `'h-auto'` below md (SiteHeaderConfig's
  // own doc comment — the header switches to a block/stacked layout there,
  // so its box has no fixed token to parse, by design) and `tailwindTokenToPx`
  // has no numeric suffix to extract from `'h-auto'`, so it silently
  // returned 0. That 0 fed straight into `--about-nav-h-mobile` below, so
  // .splitRight's own `calc(100dvh - var(--about-nav-h))` (about.module.css)
  // always resolved to the FULL viewport height even though the column
  // itself already sits `marginTop: <the header's real height>` lower
  // (SplitColumnPageShell's own pushDown mechanism, driven by a SEPARATE,
  // already-correct internal measurement) — the header's real height was
  // being reserved twice in effect: once correctly (marginTop) and once as
  // an invisible 0 (the fixed-height column below it), so their sum
  // overflowed the viewport and forced <main>/the page itself to grow and
  // scroll instead of only the accordion's own items. Confirmed live via
  // Playwright at a 390x844 viewport: `document.documentElement.scrollHeight`
  // was 964px against a 844px window, a 120px overshoot exactly matching the
  // real mobile header's own rendered height.
  //
  // headerWrapperRef (attached below) is SplitColumnPageShell's own
  // documented mechanism for exactly this need — "a page can measure its
  // real rendered height ... without re-deriving that height from the
  // header's own many independent config knobs (height/padding/margin) by
  // hand, which would just be another version of the 'two things that can
  // silently drift' problem" (that prop's own doc comment) — this page's
  // former hand-rolled token math was precisely that drift-prone
  // reinvention, not a special case that needed one. One measured value
  // feeds both CSS custom properties below: only one of
  // --about-nav-h-mobile/--about-nav-h-desktop is ever actually consumed at
  // a time (about.module.css's own media query selects between them into
  // --about-nav-h), so there's nothing to gain from computing two
  // independent numbers when the live DOM measurement already reflects
  // whichever breakpoint is currently rendered.
  const { ref: headerWrapperRef, rect: headerWrapperRect } = useMeasuredElementRect<HTMLDivElement>();
  const navHeightPx = headerWrapperRect?.height ?? (
    tailwindTokenToPx(normalizedSiteHeaderConfig.heightWide)
    + tailwindTokenToPx(normalizedSiteHeaderConfig.marginTopWide)
  );


  const [dockPaletteConfig, setDockPaletteConfig] = useState<AbstractPostDockPaletteConfig>(
    () => ({ ...ABOUT_DEFAULT_DOCK_PALETTE_CONFIG }),
  );
  const [dockLayoutConfig, setDockLayoutConfig] = useState<AbstractPostDockLayoutConfig>(
    () => ({ ...ABOUT_DEFAULT_DOCK_LAYOUT_CONFIG }),
  );
  const [aboutPageLayoutConfig, setAboutPageLayoutConfig] = useState<AboutPageLayoutConfig>(
    () => normalizeAboutPageLayoutConfig(DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG),
  );
  const [aboutMobileAccordionConfig, setAboutMobileAccordionConfig] =
    useState<AboutMobileAccordionConfig>(
      () => normalizeAboutMobileAccordionConfig(DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG),
    );
  // CMP-01/CFG-01 (about-IA-timeline-copy-rework) — the desktop left-column
  // timeline's own page-owned scope, same "own local state, shared
  // schema" shape aboutMobileAccordionConfig above already uses.
  const [aboutTimelineConfig, setAboutTimelineConfig] =
    useState<AboutTimelineConfig>(
      () => normalizeAboutTimelineConfig(DEFAULT_ABOUT_PAGE_TIMELINE_CONFIG),
    );
  const [topSegmentGradientConfig, setTopSegmentGradientConfig] =
    useState<AboutTopSegmentGradientConfig>(
      () => normalizeAboutTopSegmentGradientConfig(DEFAULT_ABOUT_TOP_SEGMENT_GRADIENT_CONFIG),
    );
  // This page's own complete, independently-authoritative config
  // (PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md) — ABOUT_POLYMORPHIC_LAYOUT_CONFIG
  // in pages/about.config.ts (PolymorphicLayoutConfig — components/
  // PolymorphicLayout.config.ts's own fully independent type, per PLAN-
  // SPLIT-COLUMN-LAYOUT-ENRICHMENT-EXTRACTION.md). Supersedes the former
  // components/SplitColumnLayout.config.ts-based ABOUT_SPLIT_COLUMN_LAYOUT_CONFIG
  // (that scope's own panel is now dead — this page edits these fields from
  // ABOUT_POLYMORPHIC_LAYOUT_PANEL, "Polymorphic Layout," instead). The left
  // column's own color source/custom color — narrowColumnCustomColor is
  // what this page's own leftPanelCustomColor maps onto, since /about's
  // narrow column is SplitColumnLayout's narrowColumn slot. wideColumnSide
  // is 'right' because this page's correct rendering (narrow-left hero
  // text, wide-right dock) shouldn't depend on a shared constant nobody
  // else ever changes — it already drifted once (to 'left'), and since this
  // page previously had no override of its own, that one shared value
  // drifting broke this layout too. See pages/abstract.tsx's own
  // splitColumnLayoutConfig doc comment for the fuller account — this
  // page's own complete config is what fixes that class of bug for good,
  // not just this one field.
  const [splitColumnLayoutConfig, setSplitColumnLayoutConfig] =
    useState<PolymorphicLayoutConfig>(
      () => normalizePolymorphicLayoutConfig(ABOUT_POLYMORPHIC_LAYOUT_CONFIG),
    );
  const { showAuthoringTools, isPanelOpen, setIsPanelOpen, togglePanel } = useAuthoringToolsVisibility();

  // Gates the whole feature — see AboutPageLayoutConfig.topSegmentDynamic-
  // BackgroundEnabled's own doc comment. Deliberately NOT also gated on
  // !spacefieldVisible: the spacefield starfield defaults to on for this
  // page, so a version of this flag that also required the spacefield off
  // made the toggle a silent no-op under the page's own default settings —
  // an operator flipping this switch (explicit intent) got overridden by a
  // different, unrelated switch they never touched (caught live,
  // 2026-08-24: toggled on via the real panel, screenshot showed no
  // change). This flag alone is now authoritative for the right segment;
  // see displayedSplitBandRightColor/headerOverlay below for how the
  // spacefield's own header-region rendering steps aside instead of
  // silently winning.
  //
  // !isNarrowViewport || topSegmentDynamicBackgroundMobileEnabled (operator
  // ask, 2026-09-12): the base flag alone used to gate every breakpoint at
  // once — bringing it back on by default meant it also came back on
  // mobile, which the operator wants to keep excluded. See that field's own
  // doc comment (about.config.ts) for the per-breakpoint override this adds;
  // every breakpoint OTHER than the mobile/stacked one is untouched by it.
  const topSegmentBackgroundEnabled = aboutPageLayoutConfig.topSegmentDynamicBackgroundEnabled
    && (!isNarrowViewport || aboutPageLayoutConfig.topSegmentDynamicBackgroundMobileEnabled);

  // PLAN-ABOUT-MOBILE-UNIFIED-HERO-GRADIENT.md — extends topSegmentBackground-
  // Enabled's gradient to the logo segment and the entire narrow column, but
  // only at the mobile/stacked breakpoint (desktop's nav-only gradient stays
  // byte-identical) and only once the base feature is already on (this flag
  // is additive, never a standalone replacement).
  const mobileUnifiedGradientEnabled = topSegmentBackgroundEnabled
    && aboutPageLayoutConfig.mobileUnifiedNarrowColumnGradientEnabled
    && isNarrowViewport;

  // Live-measured real heights of the three segments that need to read as
  // one continuous gradient field — logo row, nav row, and the narrow
  // column's own full box (content-driven, not a fixed constant; see the
  // plan's own "chaining mechanism" section for why a static SiteHeader
  // config read isn't good enough here). Each ref is attached to that
  // segment's own real crop-window box below (never a canonical/fixed-size
  // stand-in), so this stays correct through a panel edit, a copy change, or
  // a viewport rotation, the same ResizeObserver-driven guarantee
  // leftAlignPx's own measurement above already relies on.
  // extraDeps: each of these three mounts is conditionally rendered (only
  // once topSegmentBackgroundEnabled/mobileUnifiedGradientEnabled are on),
  // so the ref's target element doesn't exist yet at the hook's own initial
  // mount — without forcing a remeasure when that gate flips, the hook's
  // one-shot mount effect would capture a null element forever and never
  // notice the real one attaching later (useMeasuredElementRect's own doc
  // comment: extraDeps exists for exactly "a value ResizeObserver/resize
  // can't see by itself").
  const { ref: logoGradientSegmentRef, rect: logoGradientSegmentRect } = useMeasuredElementRect<HTMLDivElement>(
    [mobileUnifiedGradientEnabled],
  );
  const { ref: navGradientSegmentRef, rect: navGradientSegmentRect } = useMeasuredElementRect<HTMLDivElement>(
    [topSegmentBackgroundEnabled],
  );
  const { ref: narrowColumnGradientRef, rect: narrowColumnGradientRect } = useMeasuredElementRect<HTMLDivElement>(
    [mobileUnifiedGradientEnabled],
  );
  const logoGradientSegmentHeightPx = logoGradientSegmentRect?.height ?? 0;
  const navGradientSegmentHeightPx = navGradientSegmentRect?.height ?? 0;
  const narrowColumnGradientHeightPx = narrowColumnGradientRect?.height ?? 0;
  // The "virtual canvas" all three crop windows share — see PLAN-ABOUT-
  // MOBILE-UNIFIED-HERO-GRADIENT.md §1. Each LiquidGradientAdapter mount
  // below gets an inner wrapper this tall, shifted up by its own cumulative
  // offset, so the three independently-rendered (but identically
  // config'd/paletted) canvases line up into one field instead of three
  // disconnected ones.
  const unifiedGradientTotalHeightPx = logoGradientSegmentHeightPx
    + navGradientSegmentHeightPx
    + narrowColumnGradientHeightPx;

  // Only title/accent are semantically used, by AbstractPostDock's slider
  // minimal-mode branch — the remaining fields are blog-specific and inert
  // here, filled with placeholders so SliderContentSlide's shape is
  // satisfied. accent is re-derived whenever the live palette config changes
  // (it's also the fallback fill behind the dynamic-gradient canvas, so it
  // stays meaningful even with minimalModeGradientEnabled on).
  const aboutSlides: SliderContentSlide[] = useMemo(() => (
    aboutNarrativeParagraphs.map((body, index) => ({
      id: index,
      slug: `about-${index}`,
      label: String(index + 1).padStart(2, '0'),
      title: body,
      excerpt: aboutNarrativePreviews[index] ?? '',
      topic: '',
      date: '',
      readingTime: '',
      href: '#',
      externalUrl: null,
      forceExternalNavigation: false,
      seed: index,
      // Window-mode deltas: every slide is a differently-offset/hue-rotated
      // window onto the SAME shared gradient field, driven straight from the
      // dock's own palette config (see AbstractPostDock/palette's windowStep
      // and hueSpread) — this is what makes the gradient read as one
      // continuous field sliced across the slides rather than N independent
      // ones.
      hueOffset: deckWindowHueOffset(index + 1, aboutPaletteStopCount, dockPaletteConfig.hueSpread),
      variationBias: 0,
      offsetX: 0,
      offsetY: 0,
      accent: resolveSplitColumnAccent(index + 1, aboutPaletteStopCount, dockPaletteConfig),
    }))
  ), [dockPaletteConfig]);

  // Sourced from AboutSlidesContext (shared with AboutSlideNavControl, the
  // narrow column's own prev/next triggers) rather than a page-local
  // useState — see this file's own AboutSlidesProvider wrapper above.
  const { activeIndex: activeSlideIndex, setActiveIndex: setActiveSlideIndex } = useAboutSlides();

  // Only consulted when splitColumnLayoutConfig.colorSource === 'palette' —
  // see usePolymorphicLayoutColors's own doc comment. 'wide' is never
  // actually rendered (the dock paints its own background; wideColumnStyle
  // below explicitly opts this page's wide column out of the shared
  // component's own generic backgroundColor), so both columns resolve the
  // same fixed palette stop — matching this page's own original,
  // slide-index-independent left-panel color exactly (see
  // LEFT_PANEL_PALETTE_INDEX/ABOUT_PALETTE_STOP_COUNT's own doc comment
  // above).
  const paletteColorResolver = useCallback(
    () => resolveSplitColumnAccent(LEFT_PANEL_PALETTE_INDEX, aboutPaletteStopCount, dockPaletteConfig),
    [aboutPaletteStopCount, dockPaletteConfig],
  );
  // The header top-segment row's own palette state — the SAME
  // buildDeckPaletteStates(...) call AbstractPostDock's own View.tsx makes
  // internally for aboutSlides (see the ABOUT_PALETTE_STOP_COUNT doc
  // comment above for why this has to be a second, parallel call rather
  // than reading the dock's own instance out — that instance is private to
  // the dock and only ever sized to aboutSlides.length). Then hueOffset/
  // offsetX/kinshipSeed — the three POSITION-dependent fields — are
  // overridden using index -1 in that exact same aboutSlides.length window,
  // i.e. "one slide before the first real one," using the identical
  // deckWindowHueOffset/deckWindowOffsetX/deckKinshipSeed formulas the real
  // slides are positioned with. Every other field on the state (
  // masterSaturation/masterBrightness/the hueInfluence* family) comes
  // straight from the reference call, unmodified — those are uniform,
  // config-derived values, never index-dependent, so reusing them verbatim
  // guarantees this segment picks up every live tuning knob
  // (dockPaletteConfig, hue influence) the narrative rows themselves
  // respond to, with nothing hand-duplicated or able to drift out of sync.
  const topSegmentPaletteState = useMemo(() => {
    if (!topSegmentBackgroundEnabled) return null;
    const referenceStates = buildDeckPaletteStates({
      slides: aboutSlides, paletteConfig: dockPaletteConfig, activeIndex: null,
      tier: gradientBreakpointTier,
    });
    const reference = referenceStates?.[0];
    if (!reference) return null;
    return {
      ...reference,
      hueOffset: deckWindowHueOffset(-1, aboutSlides.length, dockPaletteConfig.hueSpread),
      offsetX: dockPaletteConfig.windowPanCurve === 'gaussian'
        ? deckGaussianOffsetX(
            -1,
            dockPaletteConfig.gaussianPeakIndex,
            dockPaletteConfig.gaussianSigma,
            dockPaletteConfig.gaussianAmplitude,
            dockPaletteConfig.gaussianFloor,
          )
        : deckWindowOffsetX(-1, aboutSlides.length, dockPaletteConfig.windowStep),
      kinshipSeed: deckKinshipSeed(TOP_SEGMENT_SLIDE_SEED, -1, dockPaletteConfig.fieldKinship),
      // reference's own chromaDuckTarget is always 0 (its activeIndex: null
      // call above never trips the linear/chord duck gate) — the header
      // needs its own explicit override to participate in the gaussian
      // visible-amplitude bell the same way the narrative rows do. Falls
      // back to reference's own value (0) outside gaussian mode, matching
      // the offsetX ternary's own fallback-to-a-real-computed-value shape
      // above rather than a bare literal.
      chromaDuckTarget: dockPaletteConfig.windowPanCurve === 'gaussian'
        ? dockPaletteConfig.inactiveChromaDuck * (1 - deckGaussianEnvelope(
            -1, dockPaletteConfig.gaussianPeakIndex, dockPaletteConfig.gaussianSigma,
          ))
        : reference.chromaDuckTarget,
    };
  }, [topSegmentBackgroundEnabled, aboutSlides, dockPaletteConfig, gradientBreakpointTier]);
  // Gaussian pan curve, proximity morph (opt-in via
  // dockPaletteConfig.gaussianProximityMorphEnabled, off by default): 5
  // explicit useGaussianProximityBand calls — one per real band index in
  // the same window topSegmentPaletteState/aboutSlides use above (header at
  // -1, rows at 0..3) — an unrolled, fixed-count set of hook calls rather
  // than a loop over a dynamic array, since this page's narrative-row count
  // is an architectural constant (ABOUT_NARRATIVE_PARAGRAPHS), not a
  // runtime-variable one; Rules of Hooks requires a stable call count/order
  // regardless. If that constant ever changes length, only the newly
  // uncovered band(s) silently keep the static (non-morphing) curve — see
  // GradientRenderer.tsx's own `?? (paletteState ? ... : null)` fallback —
  // not a broken or regressed one.
  const gaussianProximityMorphEnabled = dockPaletteConfig.gaussianProximityMorphEnabled;
  const headerProximityBand = useGaussianProximityBand(!gaussianProximityMorphEnabled);
  const row0ProximityBand = useGaussianProximityBand(!gaussianProximityMorphEnabled);
  const row1ProximityBand = useGaussianProximityBand(!gaussianProximityMorphEnabled);
  const row2ProximityBand = useGaussianProximityBand(!gaussianProximityMorphEnabled);
  const row3ProximityBand = useGaussianProximityBand(!gaussianProximityMorphEnabled);
  const gaussianProximityBands = useMemo(() => ([
    { index: -1, proximityRef: headerProximityBand.proximityRef },
    { index: 0, proximityRef: row0ProximityBand.proximityRef },
    { index: 1, proximityRef: row1ProximityBand.proximityRef },
    { index: 2, proximityRef: row2ProximityBand.proximityRef },
    { index: 3, proximityRef: row3ProximityBand.proximityRef },
  ]), [
    headerProximityBand.proximityRef,
    row0ProximityBand.proximityRef,
    row1ProximityBand.proximityRef,
    row2ProximityBand.proximityRef,
    row3ProximityBand.proximityRef,
  ]);
  const gaussianProximityOffsetRefs = useGaussianProximityMorph({
    bands: gaussianProximityBands,
    enabled: gaussianProximityMorphEnabled,
    peakIndex: dockPaletteConfig.gaussianPeakIndex,
    sigma: dockPaletteConfig.gaussianSigma,
    amplitude: dockPaletteConfig.gaussianAmplitude,
    floor: dockPaletteConfig.gaussianFloor,
    responseMs: dockPaletteConfig.gaussianProximityResponseMs,
    staggerMsPerBand: dockPaletteConfig.gaussianProximityStaggerMsPerBand,
    easing: dockPaletteConfig.gaussianProximityEasing,
  });
  const [
    headerGaussianOffsetXRef,
    row0GaussianOffsetXRef,
    row1GaussianOffsetXRef,
    row2GaussianOffsetXRef,
    row3GaussianOffsetXRef,
  ] = gaussianProximityOffsetRefs;
  // Only ever non-null while the feature is actually enabled — see the
  // header LiquidGradientAdapter's own identical gating for why an
  // unconditionally-passed ref would permanently shadow each row's live
  // palette.offsetX (including ordinary windowPanCurve/gaussian-param panel
  // edits) via GradientRenderer's `?? ` fallback, even with the morph off.
  const rowGaussianProximityOffsetXRefs = useMemo(() => (
    gaussianProximityMorphEnabled
      ? [row0GaussianOffsetXRef, row1GaussianOffsetXRef, row2GaussianOffsetXRef, row3GaussianOffsetXRef]
      : [null, null, null, null]
  ), [
    gaussianProximityMorphEnabled,
    row0GaussianOffsetXRef, row1GaussianOffsetXRef, row2GaussianOffsetXRef, row3GaussianOffsetXRef,
  ]);
  const rowGaussianProximityDomRefs = useMemo(() => ([
    row0ProximityBand.domRef, row1ProximityBand.domRef, row2ProximityBand.domRef, row3ProximityBand.domRef,
  ]), [row0ProximityBand.domRef, row1ProximityBand.domRef, row2ProximityBand.domRef, row3ProximityBand.domRef]);
  // The header top-segment row's own flat accent — same resolveSplitColumnAccent
  // window-mode formula the narrative rows' own fallback accent uses, at
  // the same index -1 position topSegmentPaletteState above uses for its
  // real hueOffset, so the two agree with each other (this is the color
  // painted for one frame before the WebGL canvas below has anything ready,
  // and the color nav-text contrast is computed against — see
  // displayedSplitBandRightColor's own doc comment for why nav contrast
  // actually uses a different, fixed value instead of this one, mirroring
  // how the narrative rows' own text is never contrast-computed against
  // their accent either).
  const topSegmentAccent = topSegmentBackgroundEnabled
    ? resolveSplitColumnAccent(-1, aboutSlides.length, dockPaletteConfig)
    : undefined;
  // A stable, minimal-mode SliderContentSlide-shaped object for the header
  // row — same shape every real narrative slide uses (aboutSlides above),
  // so LiquidGradientAdapter (built for that exact type) needs no special
  // casing to render it.
  const topSegmentSlide: SliderContentSlide | null = topSegmentBackgroundEnabled ? {
    id: TOP_SEGMENT_SLIDE_ID,
    slug: 'about-top-segment',
    label: '',
    title: '',
    excerpt: '',
    topic: '',
    date: '',
    readingTime: '',
    href: '#',
    externalUrl: null,
    forceExternalNavigation: false,
    seed: TOP_SEGMENT_SLIDE_SEED,
    hueOffset: topSegmentPaletteState?.hueOffset ?? 0,
    variationBias: 0,
    offsetX: 0,
    offsetY: 0,
    accent: topSegmentAccent ?? '#0e1230',
  } : null;
  // Gradient scale/noise used to be resolved here (against the page's own
  // live breakpoint) and written into shaderColorScale/shaderColorRandomness
  // below — a second, parallel tier-resolution path alongside
  // buildDeckPaletteStates's own paletteScale/paletteNoise (deckPalette.ts),
  // which every LiquidGradientAdapter mount on this page ALSO receives via
  // its own `palette` prop (View.tsx's deckPaletteStates, and
  // topSegmentPaletteState below — both now correctly tier-aware, see their
  // own `tier: gradientBreakpointTier` call sites). Since webgl.ts's own
  // uScale/uRandomness assembly always prefers a non-null paletteScale/
  // paletteNoise over shaderColorScale/shaderColorRandomness
  // (`paletteScale ?? config.shaderColorScale`), this page-local copy was
  // already fully overridden and inert everywhere it was still set —
  // removed rather than left as dead, misleading state (PLAN-DOCK-PALETTE-
  // CONFIG-SEGREGATION.md's own audit: the two mechanisms happened to
  // agree only because every gradient tier here was ported to an identical
  // value; they would silently diverge — this page-local copy losing — the
  // moment any tier was tuned to actually differ from another).
  const dockSliderConfig = useMemo(() => ({
    ...DEFAULT_LIQUID_SLIDER_CONFIG,
    // PLAN-EDITORIAL-HERO-UNIFICATION-AND-CARDSTACK-RESIZE-FIX.md Part 4 —
    // the "Accordion" panel's own ALL SIZES tab (AboutMobileAccordion.panel.ts)
    // is the one shared source for these three now; copying them in here is
    // what makes the desktop MagnificationDock engine (View.tsx reads them
    // straight off this config) retune in lockstep with the mobile
    // accordion (AboutMobileAccordionItem.tsx reads the same three fields
    // directly off aboutMobileAccordionConfig) from a single edit.
    dockTransitionMs: aboutMobileAccordionConfig.transitionMs,
    dockTransitionEasing: aboutMobileAccordionConfig.transitionEasing,
    dockContentSettleMs: aboutMobileAccordionConfig.contentSettleMs,
    dockDistanceDimmingEnabled: dockPaletteConfig.distanceDimmingEnabled,
    dockDistanceDimmingMaxOpacity: dockPaletteConfig.distanceDimmingMaxOpacity,
    dockDistanceDimmingBaselineOpacity: dockPaletteConfig.distanceDimmingBaselineOpacity,
    dockDistanceDimmingPower: dockPaletteConfig.distanceDimmingPower,
    dockDistanceDimmingEasing: dockPaletteConfig.distanceDimmingEasing,
    // Gaussian bell silhouette, v1: painted automatically whenever the
    // gaussian pan curve is active (no separate manual toggle to remember
    // to flip — the whole point of gaussian mode is that the bell reads
    // visibly) and applies to both the header (spreads dockSliderConfig
    // directly) and every narrative row (View.tsx's own dock reads this
    // same config) — "one bell in each of the segments" without
    // per-segment plumbing. Width/intensity are starting values; both are
    // the first things worth tuning once this is visible live.
    shaderBellStrokeWidth: 0.05,
    shaderBellStrokeIntensity: dockPaletteConfig.windowPanCurve === 'gaussian' ? 0.85 : 0,
    // A11Y-08 (about-IA-timeline-copy-rework) — this page-local override
    // only; DEFAULT_LIQUID_SLIDER_CONFIG's own dockCounterEnabled: true
    // default is untouched, so every other AbstractPostDock consumer keeps
    // its counter. On /about specifically, this counter (View.tsx's own
    // "N of M" indicator) would now duplicate AboutTimeline's own real
    // tablist on desktop — the only place View.tsx ever renders here, since
    // mobileAccordionActive swaps to the wholly separate AboutMobileAccordion
    // component below the mobile breakpoint (which never rendered this
    // counter either), so disabling it here removes it from every /about
    // context this counter could actually appear in, with no viewport it
    // needs to be preserved at.
    dockCounterEnabled: false,
  }), [
    aboutMobileAccordionConfig.transitionMs,
    aboutMobileAccordionConfig.transitionEasing,
    aboutMobileAccordionConfig.contentSettleMs,
    dockPaletteConfig.distanceDimmingEnabled,
    dockPaletteConfig.distanceDimmingMaxOpacity,
    dockPaletteConfig.distanceDimmingBaselineOpacity,
    dockPaletteConfig.distanceDimmingPower,
    dockPaletteConfig.distanceDimmingEasing,
    dockPaletteConfig.windowPanCurve,
  ]);
  // Always called (rules of hooks) — inert (no drag events ever bound to
  // it) whenever the feature is off. A genuinely separate instance from the
  // dock's own internal one (View.tsx) is correct here, not a bug: this
  // segment is never part of the dock's own drag/slide-transition
  // interaction (confirmed non-goal — its own height never changes), so it
  // has no reason to share that live pointer state; it only needs the
  // shader's idle/continuous animation, which this hook still drives on
  // its own regardless of whether anything ever drags it.
  const topSegmentMotion = useLiquidSliderMotion(dockSliderConfig);
  // AboutTimeline's own marker gradient (PLAN-ABOUT-TIMELINE-GRADIENT-
  // MARKER.md) — a third, genuinely separate LiquidSliderMotion instance
  // alongside the dock's own internal one (View.tsx) and topSegmentMotion
  // above, same reasoning as that field's own doc comment: never more than
  // one marker is ever filled at a time (AboutTimelineRow.tsx's own
  // showMarkerGradient), so this single shared instance is never actually
  // driving more than one concurrent WebGL canvas, but it still needs to
  // exist independently of the dock's own drag/slide-transition state.
  // Always called (rules of hooks) — inert whenever
  // aboutTimelineConfig.markerGradientEnabled is off, same as
  // topSegmentMotion while topSegmentBackgroundEnabled is off.
  const timelineMarkerMotion = useLiquidSliderMotion(dockSliderConfig);
  // Same buildDeckPaletteStates(...) call topSegmentPaletteState above makes
  // — INT-04: no new palette math here. paletteScale is then overridden per
  // state to markerGradientScale (the ONE marker-specific value this
  // feature adds) via the exact override mechanism DeckPaletteState.
  // paletteScale already exists for (applySliderGradientUniforms's own
  // `paletteScale ?? config.shaderColorScale`, AbstractPostDock/helpers/
  // webgl.ts) — never touches dockPaletteConfig/dockSliderConfig.shaderColorScale,
  // so the real dock's own gradient scale is completely unaffected. Falls
  // back to `null` (AboutTimelineRow.tsx's own `gradientPalette ?? null`
  // already handles this, same fallback GradientRenderer.tsx gives every
  // other caller with no palette) if buildDeckPaletteStates itself returns
  // null — only possible if an operator turns dockPaletteConfig.enabled AND
  // hue influence both off, in which case markers fall back to the dock's
  // own base shaderColorScale rather than markerGradientScale; a graceful
  // degradation, not a broken state.
  const timelineMarkerPaletteStates = useMemo(() => {
    if (!aboutTimelineConfig.markerGradientEnabled) return null;
    const states = buildDeckPaletteStates({
      slides: aboutSlides, paletteConfig: dockPaletteConfig, activeIndex: null,
      tier: gradientBreakpointTier,
    });
    if (!states) return null;
    return states.map(state => ({ ...state, paletteScale: aboutTimelineConfig.markerGradientScale }));
  }, [
    aboutTimelineConfig.markerGradientEnabled, aboutTimelineConfig.markerGradientScale,
    aboutSlides, dockPaletteConfig, gradientBreakpointTier,
  ]);
  // Every breakpoint-tiered column/split-band color computation this page
  // used to hand-roll (leftPanelColor's own colorSource switch) now lives
  // once inside usePolymorphicLayoutColors (components/PolymorphicLayout.tsx)
  // — see PLAN-SPLIT-COLUMN-LAYOUT-ENRICHMENT-EXTRACTION.md's own
  // correction. This page's own former navSplitLeftColor/navSplitRightColor
  // chained-hue-complement algorithm for the header split-band is dropped
  // entirely, per explicit instruction — the band's own left/right colors
  // now come from splitColumnLayoutConfig's real, shared splitBandLeftMode/
  // splitBandRightMode (colors.resolvedSplitBandLeftColor/-RightColor
  // below), the same mechanism every other PolymorphicLayoutConfig page
  // uses, not a page-specific relationship invented on top of it.
  const colors = usePolymorphicLayoutColors(
    splitColumnLayoutConfig, normalizedPageSurfaceConfig.color, paletteColorResolver,
  );

  // Bug fix, /abstract used as the role model (PLAN-POLYMORPHIC-ADAPTIVE-
  // INK-EXTRACTION.md's "bring the gradient config to /about" follow-up
  // exposed this): AboutTimeline's own inkColorOverride was never wired
  // here, so it fell back to resolveContrastAwareTextColor(columnBackground
  // Color, ...) with columnBackgroundColor={colors.narrowColumnColor} — a
  // literal 'transparent' string now that narrowColumnTransparent is true
  // at every tier (the scroll gradient shows through instead of a flat
  // paint). Feeding 'transparent' to a contrast resolver produces a
  // meaningless decision, exactly the washed-out/near-invisible text
  // reported live.
  //
  // Now shared with abstract.tsx (and any future PolymorphicLayout page)
  // via resolvePolymorphicNarrowColumnTypography — this used to be its own
  // ported-verbatim copy of that chain, which is the exact class of drift
  // AUDIT-POLYMORPHIC-GRADIENT-ABSTRACTION.md flagged and
  // PolymorphicLayout.narrowColumnTypography.ts's own doc comment explains
  // closing. DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG (not a live/panel-editable
  // config) is still this page's own choice of typography-config input,
  // unchanged from before — only the chain that turns it plus `colors` into
  // a resolved ink moved, not which config this page passes into it.
  const narrowColumnTypography = resolvePolymorphicNarrowColumnTypography(
    colors, DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG,
  );
  const aboutTimelineInkRef = useRef<HTMLDivElement>(null);
  const aboutTimelineInkColorResolved = usePolymorphicColumnAdaptiveInk({
    ref: aboutTimelineInkRef,
    baseColor: narrowColumnTypography.titleColor,
    config: splitColumnLayoutConfig,
    colors,
  });
  const aboutTimelineInkColor = aboutTimelineInkColorResolved ?? narrowColumnTypography.titleColor;
  // The timeline and wordmark are separate DOM subtrees. The adaptive ink is
  // a live `color-mix()` expression whose CSS progress variable must exist on
  // each subtree's own ancestor; sharing the timeline's string alone leaves
  // the wordmark's `var(...)` unresolved and its SVG stops fall back to black.
  const aboutWordmarkInkRef = useRef<HTMLAnchorElement | null>(null);
  const aboutWordmarkInkColor = usePolymorphicColumnAdaptiveInk({
    ref: aboutWordmarkInkRef,
    baseColor: narrowColumnTypography.titleColor,
    config: splitColumnLayoutConfig,
    colors,
  }) ?? narrowColumnTypography.titleColor;
  // Bug fix, /abstract used as the role model (its own <SiteHeader> render
  // call forces this same override — pages/abstract.tsx: `colorMode:
  // colors.scrollGradientActive ? 'custom' : ...`, `navTextColor: colors.
  // scrollGradientActive ? topHeaderTitleColor : ...`). Without it, nav
  // text here fell back to SiteHeader's own default 'column'-mode
  // derivation — rightSegmentActualColor, which (this page never passes
  // physicalRightColumnColor, and splitBandRightMode is 'transparent' at
  // the base/mobile tier) resolves to the flat, static pageSurfaceConfig
  // .color, not the real narrow-column background now that the scroll
  // gradient is active there — exactly the washed-out/mismatched mobile
  // nav text reported live. aboutTimelineInkColor (the same live scroll-
  // adaptive ink AboutTimeline's own fix above now uses) is the correct
  // real reference here too — the header sits directly above that same
  // narrow-column surface, with no separate hero component of its own to
  // derive from (removed per CMP-06/INT-06).
  const scrollGradientAdaptiveHeaderConfig = useMemo(() => ({
    ...normalizedSiteHeaderConfig,
    colorMode: 'custom' as const,
    navTextColor: aboutTimelineInkColor,
  }), [normalizedSiteHeaderConfig, aboutTimelineInkColor]);
  // Tablet intentionally uses the compact/mobile accordion composition.
  // Its stored custom text color is a static fallback, so replace it at the
  // final consumer with the same live adaptive ink supplied to the tablet
  // wordmark and primary nav.
  const effectiveAboutMobileAccordionConfig = colors.breakpointTier === 'md'
    ? {
      ...aboutMobileAccordionConfig,
      textColorMode: 'custom' as const,
      textCustomColor: aboutTimelineInkColor,
    }
    : aboutMobileAccordionConfig;
  // Bug fix, /abstract used as the role model (pages/abstract.tsx's own
  // gradientBackedNarrowColumn gate): whenever the narrow column is
  // genuinely gradient-backed (colors.narrowColumnGradientReferenceColor
  // defined — true here now that the scroll gradient is active at every
  // tier), /abstract does NOT render its wordmark with the raw, independently-
  // tuned wordmarkGradient* palette — it forces a flat two-stop "gradient"
  // using the SAME unified narrow-column ink the hero/timeline text use
  // (heroAccordionBaseTextColor there, aboutTimelineInkColor's own
  // equivalent here), so the wordmark reads as one continuous ink with
  // everything else on the page rather than its own independently-colored
  // accent. This page's own <SiteHeader> call was still passing the raw
  // colors.wordmarkGradientStops straight through, which is why the two
  // pages' wordmarks visibly diverged (screenshot-reported) even after
  // sharing the identical wordmarkGradient* config values.
  const aboutGradientBackedNarrowColumn = colors.narrowColumnGradientReferenceColor !== undefined;
  const aboutLogoStops = aboutGradientBackedNarrowColumn
    ? [{ color: aboutTimelineInkColor, at: 0 }, { color: aboutTimelineInkColor, at: 100 }]
    : colors.wordmarkGradientStops;

  // Measures the logo link's own rendered left edge so the left column's
  // content can start at the exact same x — PageContainer's padding/max-width
  // config (read secondhand here) would only approximate this on viewports
  // wide enough to trigger the container's own centering, so this reads the
  // real DOM position instead. Sourced from useMeasuredElementRect (PLAN-
  // DEDUPLICATE-PAGE-SHELL-LOGIC.md §1) — was a page-local hand-rolled
  // ResizeObserver-preferred-with-resize-fallback effect before that hook
  // existed; the shared hook attaches both unconditionally instead (a
  // zero-visible-behavior standardization — resize firing redundantly
  // alongside a working ResizeObserver is a no-op cost, not a correctness
  // risk — see that hook's own PLAN §1 note).
  //
  // extraDeps: [colors.breakpointTier, colors.viewportWidthPx] — without
  // this, the hook's own mount-only effect captures the logo's position
  // exactly once, before useBreakpointTier's own effect (PolymorphicLayout.tsx,
  // via usePolymorphicLayoutColors above) has replaced its SSR-safe
  // placeholder (`tier: 'mobile', viewportWidthPx: undefined` — that hook's
  // own doc comment) with the real, live-measured tier/width. That
  // correction can reposition the logo (a splitBandBoundaryPx/grid-math
  // change, not a resize of the anchor's own box) — invisible to both this
  // hook's ResizeObserver (watches box SIZE, not position) and to a real
  // `resize` listener (the viewport itself never resized, only React's own
  // output settled) — so the stale, pre-settle px stayed baked into
  // --about-left-align-px indefinitely, until an actual window resize
  // forced a fresh read (confirmed live, 2026-08-25: fresh load at 1440px
  // measured 182.7px against a logo that had already settled at 171.2px;
  // stayed wrong for 2+ seconds; only a real resize event corrected it).
  // Forcing a remeasure once the tier/width these fields depend on has
  // itself settled closes exactly that gap.
  const { ref: logoAnchorRef, rect: logoAnchorRect } = useMeasuredElementRect<HTMLAnchorElement>(
    [colors.breakpointTier, colors.viewportWidthPx],
  );
  const setAboutLogoAnchorRef = useCallback((element: HTMLAnchorElement | null) => {
    logoAnchorRef(element);
    aboutWordmarkInkRef.current = element;
  }, [logoAnchorRef]);
  // Only meaningful once the header is genuinely in its side-by-side (≥md)
  // layout, where the logo really does sit at a fixed left edge that the
  // narrow column's own content can line up against. Below md, the header
  // is in its stacked/mobile arrangement — headerLeftSegmentAlign's own
  // documented mobile default is CENTER ("reproduces today's mobile
  // baseline," PolymorphicLayout.panel.ts) — so the logo's real left edge
  // is an arbitrary, viewport-width-dependent centered x-coordinate, not a
  // left edge at all. Feeding that raw number into padding-left regardless
  // of tier produced a left gap that grew as the viewport widened toward
  // 768px (confirmed live, 2026-08-26: 88px at 390px wide, 271px at
  // 767px wide, wrapping the hero copy into extra lines and pushing the
  // wide column/accordion down with it — the same "spacing to the left and
  // bottom" reported live). Gating on !isNarrowViewport restores the CSS
  // clamp() fallback (about.module.css's own documented "pre-measurement/
  // no-JS fallback") for the entire mobile/stacked range, and only lets
  // the live measurement take over once it's actually measuring a real
  // left edge.
  // narrowColumnContentWidthDecoupledEnabled (about.config.ts's own doc
  // comment has the full mechanism): opting in drops this live measurement
  // entirely, so .splitLeft's own padding-left (about.module.css) falls
  // back to its static clamp() default instead of the wordmark's own
  // measured left edge — the narrow column's real available content width
  // stops being a function of wherever the wordmark happens to render.
  const leftAlignPx = (isNarrowViewport || aboutPageLayoutConfig.narrowColumnContentWidthDecoupledEnabled)
    ? undefined
    : logoAnchorRect?.left;
  // The decoupled narrow-column mode intentionally owns its own body width,
  // so it must not borrow the wordmark inset wholesale. The desktop timeline
  // is the one exception: its column is a navigational index, and its outer
  // edge should share the wordmark's masthead anchor without changing the
  // body column or the timeline's configured right-aligned rows.
  const desktopTimelineStartPx = colors.breakpointTier === 'lg'
    ? logoAnchorRect?.left
    : undefined;
  // The body grids remain intentionally page-specific, but the masthead is
  // one site-level spatial cue. At md and lg, resolve About's header fields
  // to Abstract's final consumer values: wordmark against the left edge and
  // primary nav against the right edge, with the same content-track widths
  // and no inherited inner padding changing either anchor.
  const headerLayoutConfig = colors.breakpointTier === 'md'
    ? {
      ...splitColumnLayoutConfig,
      headerLeftContentPaddingRightWide: 'md:pr-0' as PolymorphicLayoutConfig['headerLeftContentPaddingRightWide'],
      headerRightSegmentAlignWide: 'md:justify-end' as PolymorphicLayoutConfig['headerRightSegmentAlignWide'],
      headerRightInnerAlignWide: 'md:justify-end' as PolymorphicLayoutConfig['headerRightInnerAlignWide'],
    }
    : colors.breakpointTier === 'lg'
      ? {
        ...splitColumnLayoutConfig,
        headerLeftSegmentAlignLg: 'lg:justify-start' as PolymorphicLayoutConfig['headerLeftSegmentAlignLg'],
        headerRightSegmentAlignLg: 'lg:justify-end' as PolymorphicLayoutConfig['headerRightSegmentAlignLg'],
        headerLeftContentWidthLg: 'lg:max-w-percent-90' as PolymorphicLayoutConfig['headerLeftContentWidthLg'],
        headerRightContentWidthLg: 'lg:max-w-percent-80' as PolymorphicLayoutConfig['headerRightContentWidthLg'],
        headerLeftInnerAlignLg: 'lg:justify-start' as PolymorphicLayoutConfig['headerLeftInnerAlignLg'],
        headerRightInnerAlignLg: 'lg:justify-end' as PolymorphicLayoutConfig['headerRightInnerAlignLg'],
        headerLeftContentPaddingRightLg: 'lg:pr-0' as PolymorphicLayoutConfig['headerLeftContentPaddingRightLg'],
        headerRightContentPaddingLeftLg: 'lg:pl-0' as PolymorphicLayoutConfig['headerRightContentPaddingLeftLg'],
      }
      : splitColumnLayoutConfig;

  // Arrow idle/hover fill — both derived from the header split-band's own
  // resolved left color (never an independent pick), so the control always
  // reads as a shade of whatever the band actually shows, not an arbitrary
  // choice. Matches usePolymorphicLayoutColors's own doc comment: "a nav
  // control deriving its idle/hover fill from the resolved split-band
  // color" is exactly the kind of page-local layering this hook is
  // exported standalone for.
  const navControlIdleColor = useMemo(() => {
    const [r, g, b] = scaleRgbLightness(
      parseCssColorToRgb(colors.resolvedSplitBandLeftColor),
      1 - aboutPageLayoutConfig.navControlColorDarkenAmount,
    );
    return `rgb(${r}, ${g}, ${b})`;
  }, [colors.resolvedSplitBandLeftColor, aboutPageLayoutConfig.navControlColorDarkenAmount]);
  const navControlHoverColor = useMemo(() => {
    const [r, g, b] = mixRgb(
      parseCssColorToRgb(navControlIdleColor),
      parseCssColorToRgb(colors.resolvedSplitBandLeftColor),
      aboutPageLayoutConfig.navControlHoverBrightenAmount,
    );
    return `rgb(${r}, ${g}, ${b})`;
  }, [navControlIdleColor, colors.resolvedSplitBandLeftColor, aboutPageLayoutConfig.navControlHoverBrightenAmount]);

  // On mount (arriving at /about from elsewhere), start every palette-derived
  // swatch at the page's own neutral surface color and reveal the real
  // values one tick later — that later state change is what the CSS
  // background-color transition (about.module.css / SiteHeader) has
  // something to actually animate from, instead of the colors just
  // appearing instantly on first paint.
  const [colorsRevealed, setColorsRevealed] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setColorsRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const entranceTransition = `background-color ${aboutPageLayoutConfig.pageEntranceTransitionMs}ms `
    + `${CTA_BUTTON_MOTION_EASINGS[aboutPageLayoutConfig.pageEntranceEasing]}`;
  // An entrance fallback may stand in for an opaque palette swatch, but it
  // must never replace an explicit transparent paint instruction. Doing so
  // turns a transparent header segment into the page surface for the whole
  // CSS transition, visibly creating a pale band before the gradient behind
  // it can be seen. Preserve transparent at first paint; the layer behind
  // the band is then the authored loading surface from the outset.
  const entranceColor = (resolvedColor: string) => (
    !colorsRevealed && resolvedColor !== 'transparent'
      ? normalizedPageSurfaceConfig.color
      : resolvedColor
  );
  // The header gradient is the dock's conceptual item -1: it uses the same
  // reveal properties and starts one stagger interval before item 0. The
  // transparent split band underneath remains visible while it waits, so
  // this pre-reveal phase exposes the real page gradient—not a neutral band.
  const [topSegmentRevealed, setTopSegmentRevealed] = useState(false);
  const topSegmentRevealDelayMs = Math.max(
    0, dockSliderConfig.dockRevealFirstDelayMs - dockSliderConfig.dockRevealStaggerMs,
  );
  useEffect(() => {
    if (!topSegmentBackgroundEnabled) return undefined;
    if (prefersReducedMotion || !dockSliderConfig.dockRevealEnabled) {
      setTopSegmentRevealed(true);
      return undefined;
    }
    setTopSegmentRevealed(false);
    const timeoutId = window.setTimeout(
      () => setTopSegmentRevealed(true),
      topSegmentRevealDelayMs,
    );
    return () => window.clearTimeout(timeoutId);
  }, [
    topSegmentBackgroundEnabled,
    prefersReducedMotion,
    dockSliderConfig.dockRevealEnabled,
    topSegmentRevealDelayMs,
  ]);
  // Transparent, not a color transition, while the spacefield is visible —
  // its own backgroundColor becomes this panel's real background, painted
  // by the layer behind it (see SpacefieldBackground's z-[-1]) rather than
  // this element's own background-color.
  const displayedLeftPanelColor = spacefieldVisible
    ? 'transparent'
    : entranceColor(colors.narrowColumnColor);
  // The wide column's own box background — previously never applied at all
  // (wideColumnStyle={{}} below), so colors.wideColumnColor/colorSource/
  // wideColumnCustomColor* were entirely inert on this page: real,
  // correctly-computed values that drove nothing visible (operator-
  // reported, live screenshots, 2026-08-24 — a live update to
  // wideColumnCustomColorLg via the panel/component-config-update prompt
  // landed correctly in the file every time, the "config not persisting"
  // symptom was actually this page silently never reading it at all). Not
  // gated on spacefieldVisible the way displayedLeftPanelColor is — nothing
  // spacefield-related replaces the WIDE column's own body background the
  // way it replaces the narrow column's, so there's no established
  // "transparent while starfield" behavior to mirror here.
  //
  // colors.wideColumnPaintColor, not colors.wideColumnColor — the latter is
  // scrollGradientInkColor while the mobile scroll-gradient background is
  // active (a contrast-basis ink color, never meant to be PAINTED as a flat
  // fill), and this page was reading it as a real background-color
  // regardless, an opaque solid box that silently sat in front of the fixed
  // <PolymorphicScrollGradientBackground> and blocked it completely
  // (operator-reported, live screenshot: the accordion column read as one
  // uniform flat wash, not the intended full-viewport gradient). paintColor
  // already resolves to 'transparent' at exactly the tiers where the scroll
  // gradient is active (PolymorphicLayout.tsx's own wideColumnPaintColor —
  // identical to wideColumnColor everywhere else), so this is a drop-in
  // swap: unchanged on desktop (scrollGradientEnabled off there), fixed on
  // mobile.
  const displayedWideColumnColor = entranceColor(colors.wideColumnPaintColor);
  // Matches SpacefieldBackground's own flat backgroundColor exactly while
  // the field is visible, rather than the config-resolved split-band color
  // used otherwise. The header's left 38% is deliberately excluded from the
  // starfield itself (see spacefieldHeaderConfig's own doc comment above) so
  // the logo keeps a calm, uncluttered backdrop — but a color unrelated to
  // the field's own tone made that backdrop read as a stray opaque box
  // dropped over the scene rather than the same night sky, just without
  // stars there. Using the field's own base tone removes that seam.
  const displayedSplitBandLeftColor = spacefieldVisible
    ? spacefieldConfig.backgroundColor
    : entranceColor(colors.resolvedSplitBandLeftColor);
  // The dynamic top-segment layer remains independent visual content, but
  // its base paint and SiteHeader's nav-contrast basis must still come from
  // Polymorphic Layout. The former '#0e1230' override made every
  // splitBandRightMode* selection — including syncWithColumnBelow — inert
  // whenever the dynamic layer was enabled (the default). Keeping the
  // operator-selected resolved color here preserves the gradient while
  // restoring the layout panel as the authoritative color source.
  const displayedSplitBandRightColor = topSegmentBackgroundEnabled
    ? entranceColor(colors.resolvedSplitBandRightColor)
    : spacefieldVisible
      ? 'transparent'
      : entranceColor(colors.resolvedSplitBandRightColor);
  // The right segment's own actual injected background content (SiteHeader's
  // generic splitBandRightBackgroundSlot). Renders the real WebGL mesh
  // gradient — LiquidGradientAdapter, the exact component the narrative
  // rows below use for their own background (View.tsx's own minimal-mode
  // branch) — fed topSegmentSlide/topSegmentPaletteState (both computed
  // above from the same live dockPaletteConfig/dockSliderConfig every
  // narrative row already reads, so a live edit to any gradient panel
  // field retunes this segment identically, not just the rows). An earlier
  // version of this slot was a flat two-stop CSS gradient sampling only
  // the raw resolveSplitColumnAccent color — the narrative rows never
  // paint that raw value either (it's only their own brief pre-shader
  // fallback), which is why that version read as a flat, saturated,
  // out-of-family color against the rows' own deep, OKLab-processed mesh
  // (operator-reported, live screenshot). null (nothing rendered) whenever
  // the feature is off — SiteHeader's own band div keeps painting
  // splitBandRightColor alone, byte-identical to before this feature
  // existed. The wrapping div's own opacity (not the canvas itself, which
  // has no flat color to transition) carries the mount reveal, same
  // duration/easing as entranceTransition above.
  // PLAN-ABOUT-MOBILE-UNIFIED-HERO-GRADIENT.md §1 — used by the logo-segment
  // and narrow-column mounts below (not this nav segment, which keeps its
  // own bespoke gaussianProximityOffsetXRef wiring inline): an inner wrapper
  // sized to the shared "virtual canvas" (unifiedGradientTotalHeightPx, all
  // three real segment heights added together), shifted up by offsetPx so
  // each segment's own real crop window (its outer overflow-hidden ancestor)
  // reveals the slice that continues where the previous segment's own crop
  // left off. Same config/palette/activity as the nav segment's own mount —
  // color/scale never drift between the three.
  const renderUnifiedGradientLayer = (offsetPx: number) => (
    <div
      className="absolute inset-x-0"
      style={{
        top: -offsetPx,
        height: unifiedGradientTotalHeightPx > 0 ? `${unifiedGradientTotalHeightPx}px` : '100%',
      }}
    >
      <LiquidGradientAdapter
        slide={topSegmentSlide as SliderContentSlide}
        motion={topSegmentMotion}
        config={{ ...dockSliderConfig, ...topSegmentGradientConfig }}
        palette={topSegmentPaletteState}
        gaussianProximityOffsetXRef={null}
        activity="frozen"
      />
    </div>
  );

  const topSegmentBackgroundSlot = topSegmentBackgroundEnabled && topSegmentSlide ? (
    <div
      aria-hidden="true"
      ref={(el: HTMLDivElement | null) => {
        navGradientSegmentRef(el);
        if (gaussianProximityMorphEnabled) headerProximityBand.domRef(el);
      }}
      className="w-full h-full overflow-hidden relative"
      style={{
        // Same opacity/translation contract as each accordion row.
        opacity: topSegmentRevealed ? 1 : 0,
        transform: topSegmentRevealed
          ? 'none'
          : `translate3d(${dockSliderConfig.dockRevealOffsetXVw}vw, 0, 0)`,
        transitionProperty: 'opacity, transform',
        transitionDuration: prefersReducedMotion ? '0ms' : `${dockSliderConfig.dockRevealDurationMs}ms`,
        transitionTimingFunction: resolveAbstractPostDockEasing(dockSliderConfig.dockRevealEasing),
      }}
    >
      {/* LiquidGradientAdapter's own canvas sizes itself as a single CSS
          %-of-container value (GRADIENT_LAYER_SIZE, GradientRenderer.tsx)
          applied uniformly to width AND height — correct only when its
          containing box is roughly the aspect ratio a real accordion row
          renders at (wide, but tall enough for the shader's own square-UV
          noise field to read at full scale, confirmed against the rows
          below, which are ~viewport-height / paragraph-count tall). The
          header segment's own real box is far shorter and far wider than
          that (a full-bleed nav strip, not a row), so giving
          LiquidGradientAdapter that literal short box directly (as an
          earlier version of this did) squished its own % height down to
          match, reading as a vertically shrunk/compressed pattern next to
          the rows' own full-scale mesh (operator-reported, live
          screenshot). This inner div instead gives the canvas a box sized
          to ONE accordion row's own real height (100vh / paragraph count —
          the same even division MagnificationDock's own vertical flex
          layout uses for each row, `styles.module.css`'s .segment sizing),
          anchored to this slot's own bottom edge (the seam with the real
          first row below, same convention as SpacefieldBackground's own
          originCorner="bottom-left" a few lines up) — the canvas renders
          at genuine row scale, and only the header's own real, shorter
          height (this element's own outer overflow-hidden ancestor above)
          crops the visible slice, instead of the shader compressing its
          own pattern down to fit.

          mobileUnifiedGradientEnabled swaps this bottom-anchored, canonical-
          row-sized wrapper for the shared "virtual canvas" wrapper instead
          (PLAN-ABOUT-MOBILE-UNIFIED-HERO-GRADIENT.md §1) — sized to
          unifiedGradientTotalHeightPx and shifted up by exactly the logo
          segment's own real height, so this nav segment's crop reveals the
          slice immediately following the logo segment's own slice (which
          uses offset 0, i.e. no shift, below). Byte-identical to the
          original canonical-row behavior whenever the feature is off. */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={mobileUnifiedGradientEnabled ? {
          top: -logoGradientSegmentHeightPx,
          bottom: 'auto',
          height: unifiedGradientTotalHeightPx > 0 ? `${unifiedGradientTotalHeightPx}px` : '100%',
        } : { height: `calc(100vh / ${aboutNarrativeParagraphs.length})` }}
      >
        <LiquidGradientAdapter
          slide={topSegmentSlide}
          motion={topSegmentMotion}
          // dockSliderConfig, spread first, is the SAME palette-adjacent
          // config the real rows use (color/motion physics come from
          // topSegmentPaletteState/topSegmentMotion, not this object) —
          // topSegmentGradientConfig then overrides only the geometry/
          // behavior fields exposed via the segregated "Header top segment
          // gradient" panel scope, so this segment starts reading as
          // identical to the rows below and stays that way until an
          // operator deliberately retunes the seam (operator ask,
          // 2026-08-24: "verify... the same config applied to the
          // accordion is being applied to this first item"). Gradient
          // scale/noise are deliberately NOT part of that override set —
          // both segments always share dockSliderConfig's own values there
          // (Dock palette direction panel), so they can never drift apart.
          config={{ ...dockSliderConfig, ...topSegmentGradientConfig }}
          palette={topSegmentPaletteState}
          // Only ever passed while the feature is actually enabled — the
          // hook's own output ref holds a real (if stale/inert) number from
          // the moment it's created, so passing it unconditionally would
          // permanently shadow palette.offsetX's own live value (including
          // ordinary windowPanCurve/gaussian-param panel edits) via
          // GradientRenderer's `?? ` fallback, even with the morph off.
          gaussianProximityOffsetXRef={gaussianProximityMorphEnabled ? headerGaussianOffsetXRef : null}
          // PLAN-ABOUT-MOBILE-ACCORDION.md §9 — this segment is its own,
          // separate LiquidGradientAdapter call site (not routed through
          // AbstractPostDock's own gradientPerformanceConfig prop above),
          // so it needs the same forced-static treatment applied directly:
          // otherwise it keeps defaulting to 'continuous' (a genuine
          // per-frame shader recalculation, forever) even after the real
          // accordion rows below it are frozen — confirmed live (Playwright,
          // 2026-08-25: data-gradient-activity read 'continuous' here while
          // every row read 'frozen').
          activity="frozen"
        />
      </div>
    </div>
  ) : null;

  // PLAN-ABOUT-MOBILE-UNIFIED-HERO-GRADIENT.md §2 — the logo segment's own
  // mount, parallel to topSegmentBackgroundSlot above and wired into
  // SiteHeader's already-existing splitBandLeftBackgroundSlot (the exact
  // sibling of splitBandRightBackgroundSlot, which topSegmentBackgroundSlot
  // already uses) — no SiteHeader.tsx changes needed, that generic slot
  // already exists. offset 0: this segment is first in the shared "virtual
  // canvas" stack, so its own crop window needs no shift. Gated on
  // mobileUnifiedGradientEnabled alone (on top of topSegmentBackgroundEnabled
  // && topSegmentSlide, both folded into that flag/its dependency) — null
  // whenever the feature is off, so SiteHeader's own left band div keeps
  // painting splitBandLeftColor alone, same as before this feature existed.
  const logoSegmentBackgroundSlot = mobileUnifiedGradientEnabled && topSegmentSlide ? (
    <div
      aria-hidden="true"
      ref={logoGradientSegmentRef}
      className="w-full h-full overflow-hidden relative"
      style={{
        // Same item -1 reveal as the nav segment above.
        opacity: topSegmentRevealed ? 1 : 0,
        transform: topSegmentRevealed
          ? 'none'
          : `translate3d(${dockSliderConfig.dockRevealOffsetXVw}vw, 0, 0)`,
        transitionProperty: 'opacity, transform',
        transitionDuration: prefersReducedMotion ? '0ms' : `${dockSliderConfig.dockRevealDurationMs}ms`,
        transitionTimingFunction: resolveAbstractPostDockEasing(dockSliderConfig.dockRevealEasing),
      }}
    >
      {renderUnifiedGradientLayer(0)}
    </div>
  ) : null;

  // PLAN-ABOUT-MOBILE-UNIFIED-HERO-GRADIENT.md §3 — the narrow column's own
  // mount, covering the column's entire real box (not a hero-content-sized
  // region within it). offset is the cumulative height of both header
  // segments, so this column's own crop window picks up exactly where the
  // nav segment's own slice left off. Mounted as the narrow column's own
  // first child (see narrowColumn prop below) so displayedLeftPanelColor
  // (painted via the parent's own background-color) stays visible behind it
  // as a fallback layer, and every other narrow-column child (spacefield,
  // hero content) keeps painting on top of it via ordinary DOM stacking —
  // no z-index needed.
  const narrowColumnGradientLayer = mobileUnifiedGradientEnabled && topSegmentSlide ? (
    <div
      aria-hidden="true"
      ref={narrowColumnGradientRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{
        opacity: topSegmentRevealed ? 1 : 0,
        transitionProperty: 'opacity',
        transitionDuration: prefersReducedMotion ? '0ms' : `${dockSliderConfig.dockRevealDurationMs}ms`,
        transitionTimingFunction: resolveAbstractPostDockEasing(dockSliderConfig.dockRevealEasing),
      }}
    >
      {renderUnifiedGradientLayer(logoGradientSegmentHeightPx + navGradientSegmentHeightPx)}
    </div>
  ) : null;

  // PLAN-ABOUT-MOBILE-ACCORDION.md: below 768px, swap the vertical-slider
  // AbstractPostDock for the tap-to-expand mobile accordion (formerly the
  // shared Card Stack, fully retired from this page — see
  // AboutMobileAccordion's own doc comment). No longer gated on
  // touchCarouselCapable (operator ask, 2026-08-25: "show this component
  // also for the non-touch devices") — tap-to-expand works identically
  // with a mouse click, unlike the outgoing Card Stack's swipe gesture,
  // which genuinely needed a touch-capable check. isNarrowViewport is the
  // one real gate left; aboutMobileAccordionConfig.enabled is the
  // operator's own escape hatch back to the vertical slider at every
  // breakpoint.
  const mobileAccordionActive = aboutMobileAccordionConfig.enabled && isNarrowViewport;
  const sharedConfigBindings = useAbstractDesignConfigBindings(
    ABSTRACT_DESIGN_CONFIG_BINDING_KEYS_BY_PAGE.about,
  );
  const localConfigBindings = useMemo(() => [
    createConfigScopeBinding({
      definition: ABOUT_DOCK_PALETTE_DEFINITION,
      value: dockPaletteConfig,
      onChange: setDockPaletteConfig,
    }),
    createConfigScopeBinding({
      definition: ABOUT_DOCK_LAYOUT_DEFINITION,
      value: dockLayoutConfig,
      onChange: setDockLayoutConfig,
    }),
    createConfigScopeBinding({
      definition: ABOUT_PAGE_LAYOUT_DEFINITION,
      value: aboutPageLayoutConfig,
      onChange: setAboutPageLayoutConfig,
    }),
    createConfigScopeBinding({
      definition: ABOUT_MOBILE_ACCORDION_DEFINITION,
      value: aboutMobileAccordionConfig,
      onChange: setAboutMobileAccordionConfig,
    }),
    createConfigScopeBinding({
      definition: ABOUT_TIMELINE_DEFINITION,
      value: aboutTimelineConfig,
      onChange: setAboutTimelineConfig,
    }),
    createConfigScopeBinding({
      definition: ABOUT_TOP_SEGMENT_GRADIENT_DEFINITION,
      value: topSegmentGradientConfig,
      onChange: setTopSegmentGradientConfig,
    }),
    createConfigScopeBinding({
      definition: ABOUT_POLYMORPHIC_LAYOUT_PANEL,
      value: splitColumnLayoutConfig,
      // Wrapped rather than passed directly (setSplitColumnLayoutConfig):
      // PolymorphicLayoutConfig's own shape throws off
      // createConfigScopeBinding's TConfig inference when a raw
      // Dispatch<SetStateAction<T>> is passed straight through — same
      // runtime behavior, this only fixes what TS infers TConfig as.
      onChange: value => setSplitColumnLayoutConfig(value),
    }),
    createConfigScopeBinding({
      definition: SPACEFIELD_DEFINITION,
      value: spacefieldConfig,
      onChange: setSpacefieldConfig,
    }),
    createConfigScopeBinding({
      definition: ABOUT_SITE_HEADER_COLOR_OVERRIDE_PANEL,
      value: siteHeaderColorOverride,
      onChange: setSiteHeaderColorOverride,
    }),
  ], [
    dockPaletteConfig,
    dockLayoutConfig,
    aboutPageLayoutConfig,
    aboutMobileAccordionConfig,
    aboutTimelineConfig,
    topSegmentGradientConfig,
    splitColumnLayoutConfig,
    spacefieldConfig,
    siteHeaderColorOverride,
  ]);
  const applicableConfigBindings = useMemo(
    () => [...sharedConfigBindings, ...localConfigBindings],
    [sharedConfigBindings, localConfigBindings],
  );
  const componentConfigBindings = useConfigPanelBindings(applicableConfigBindings);
  const resetAllConfig = useCallback(() => {
    setPanelShellConfig({ ...DEFAULT_PANEL_SHELL_CONFIG });
    setPageSurfaceConfig({ ...DEFAULT_PAGE_SURFACE_CONFIG });
    setSiteHeaderConfig({ ...DEFAULT_SITE_HEADER_CONFIG });
    setWordmarkConfig({ ...DEFAULT_WORDMARK_CONFIG });
    setLayoutDebugConfig({ ...DEFAULT_LAYOUT_DEBUG_CONFIG });
    setDockPaletteConfig({ ...ABOUT_DEFAULT_DOCK_PALETTE_CONFIG });
    setDockLayoutConfig({ ...ABOUT_DEFAULT_DOCK_LAYOUT_CONFIG });
    setAboutPageLayoutConfig(normalizeAboutPageLayoutConfig(DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG));
    setAboutMobileAccordionConfig(
      normalizeAboutMobileAccordionConfig(DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG),
    );
    setAboutTimelineConfig(
      normalizeAboutTimelineConfig(DEFAULT_ABOUT_PAGE_TIMELINE_CONFIG),
    );
    setTopSegmentGradientConfig(
      normalizeAboutTopSegmentGradientConfig(DEFAULT_ABOUT_TOP_SEGMENT_GRADIENT_CONFIG),
    );
    setSplitColumnLayoutConfig(
      normalizePolymorphicLayoutConfig(ABOUT_POLYMORPHIC_LAYOUT_CONFIG),
    );
    setSpacefieldConfig(normalizeSpacefieldConfig(DEFAULT_SPACEFIELD_CONFIG));
    setSiteHeaderColorOverride({ ...ABOUT_SITE_HEADER_COLOR_OVERRIDE_CONFIG });
  }, [
    setLayoutDebugConfig,
    setPageSurfaceConfig,
    setPanelShellConfig,
    setSiteHeaderConfig,
    setWordmarkConfig,
  ]);

  return (
    // LayoutDebugHighlightProvider now mounts once in pages/_app.tsx
    // (PLAN-DEDUPLICATE-PAGE-SHELL-LOGIC.md §6) — was independently
    // mounted per-page before; see that stage's own doc comment in
    // _app.tsx for the full reasoning (and the real, previously-shipping
    // gap this closed on pages/abstract.tsx, which never had this
    // wrapper). Every LayoutDebugOverlay instance below (via
    // PolymorphicLayout/SplitColumnPageShell/SplitColumnLayout/
    // SiteHeader) and the settings panel itself still share the
    // same context — now app-wide, not just page-wide.
    <>
      <SeoHead
        title={buildSiteTitle(pageContent.meta.title)}
        description={pageContent.meta.description}
        canonicalPath="/about"
      />
      <PolymorphicLayout
        className={`${styles.main} flex flex-col`}
        style={{
          '--about-nav-h-mobile': `${navHeightPx}px`,
          '--about-nav-h-desktop': `${navHeightPx}px`,
        } as CSSProperties}
        config={splitColumnLayoutConfig}
        pageSurfaceConfig={normalizedPageSurfaceConfig}
        paletteColorResolver={paletteColorResolver}
        headerWrapperRef={headerWrapperRef}
        // PLAN-POLYMORPHIC-LAYOUT-DECOUPLING.md §4 — this page constructs
        // its own <SiteHeader> instead of handing PolymorphicLayout
        // a siteHeaderConfig/logoStops/splitBand*/etc. bundle to render
        // automatically. slotProps (HeaderSlotProps) carries the values
        // only PolymorphicLayout's own internal machinery can compute.
        // Spread first: this page's spacefield/reveal overrides below remain
        // authoritative over those centralized defaults.
        header={(slotProps) => (
          <SiteHeader
            {...slotProps}
            // Local override, same technique as spacefieldHeaderConfig
            // just above — layered on at the render call site rather than
            // mutating the shared siteHeaderConfig, so every other page
            // reading that same shared config stays on the original nav
            // layout by default (see SiteHeader.config.ts's own
            // doc comment on this field). /about is the only page opting
            // into it right now. buildEffectiveSiteHeaderConfig merges
            // headerContentLayoutOwnedByPage plus the four joined segment/
            // content className fields on top of this object — the exact
            // same merge PolymorphicLayout used to run for this page
            // automatically. buildSplitAlignedSiteHeaderConfig sets
            // navContentGapPx explicitly, not left to inherit the shared
            // DEFAULT_SITE_HEADER_CONFIG.navContentGapPx — that
            // value is mutable (SharedDesignConfigProvider) and has
            // already drifted at least once (it's currently 8, not the 32
            // this exact gap was tuned to — see
            // SPLIT_ALIGNED_NAV_CONTENT_GAP_PX's own doc comment).
            config={buildEffectiveSiteHeaderConfig(
              buildSplitAlignedSiteHeaderConfig(
                spacefieldVisible
                  ? spacefieldHeaderConfig
                  // Bug fix (regression, fix-forward): the flat unified-ink
                  // override below is correct for the mobile/base tier,
                  // where the header's left and right segments are stacked
                  // over the same real narrow-column-ish background (see
                  // scrollGradientAdaptiveHeaderConfig's own doc comment —
                  // ported from /abstract, whose own header sits in a
                  // comparatively uniform part of the gradient). At md/lg
                  // the right segment sits directly over the wide column's
                  // own highly saturated, multi-hue gradient card — the
                  // SAME narrow-column ink read there instead washed the
                  // nav text into near-invisibility against a background
                  // it was never resolved against (operator-reported,
                  // screenshot evidence). Tablet shares the narrow-column
                  // mobile composition, so its nav must consume that same
                  // derived ink as the wordmark and accordion content.
                  : colors.scrollGradientActive && (
                    colors.breakpointTier === 'mobile' || colors.breakpointTier === 'md'
                  )
                    ? scrollGradientAdaptiveHeaderConfig
                    : normalizedSiteHeaderConfig,
              ),
              headerLayoutConfig,
            )}
            // The wordmark's own color/adaptive/intro config, fully
            // decoupled from `config` above (which is nav-only now) — the
            // same shared instance /abstract also binds, via
            // AbstractDesignConfigProvider, so the two pages' wordmarks
            // stay in genuine parity rather than merely starting from the
            // same default (see WordmarkConfig's own doc comment for the
            // bug this fixes: /about's colorMode/columnTextMinContrast
            // previously silently diverged from /abstract's whenever this
            // page's own now-nav-only SiteHeaderColorOverride was off,
            // which it is by default).
            // colors.wordmarkGradientStops (PolymorphicLayout.tsx's own
            // usePolymorphicLayoutColors) takes priority when present — the
            // operator opted into PolymorphicLayoutConfig's own
            // wordmarkUsesScrollGradient, and the active tier's own
            // scrollGradientEnabled is on. colorMode is forced to 'adaptive'
            // only in that case — SiteHeader only reads logoStops in that
            // mode (see resolveSiteHeaderLogoStops). See
            // PLAN-WORDMARK-SCROLL-GRADIENT-INTEGRATION.md.
            wordmarkConfig={aboutGradientBackedNarrowColumn || colors.wordmarkGradientStops
              ? { ...wordmarkConfig, colorMode: 'adaptive' }
              : wordmarkConfig}
            logoStops={aboutLogoStops}
            // The wordmark is the timeline's header-level label on this
            // composition. Feed it the same final, adaptive timeline ink
            // directly rather than allowing SiteHeader to derive a second
            // color from the logo segment's background.
            titleColorOverride={aboutWordmarkInkColor}
            // physicalLeftColumnColor: SiteHeader itself resolves the
            // logo's own colorMode-driven stops internally from this value
            // now (see SiteHeaderProps.logoStops's own doc comment for
            // why this used to be a page-level computation) — the
            // spacefield override mirrors displayedSplitBandLeftColor's
            // own swap just above, so the logo and the band it sits on
            // are always reading the same real backdrop.
            physicalLeftColumnColor={
              spacefieldVisible ? spacefieldConfig.backgroundColor : colors.actualLeftSegmentColor
            }
            pageSurfaceConfig={normalizedPageSurfaceConfig}
            // Page-owned — this page's own separate leftAlignPx
            // measurement, unrelated to the shell's own internal ref-
            // merging (never one of HeaderSlotProps's own values; pure
            // passthrough both before and after this migration).
            logoAnchorRef={setAboutLogoAnchorRef}
            // splitBandActive: not spacefieldVisible falls back to
            // splitColumnLayoutConfig.headerSplitBandEnabled directly — the
            // field the panel's own "Header split band" toggle actually
            // edits. Previously PolymorphicLayout's own internal merge did
            // this (`splitBandActive ?? normalizedConfig.headerSplitBandEnabled`,
            // components/PolymorphicLayout.tsx) whenever this page passed
            // `undefined`; now that this page's own <SiteHeader>
            // bypasses that merge entirely, it must replicate the fallback
            // itself — SiteHeader's own default (`splitBandActive =
            // false`) is NOT equivalent (this page's own config defaults
            // this field to a real, non-false value), and unlike /contact
            // (PLAN-POLYMORPHIC-LAYOUT-DECOUPLING.md's own Stage B notes,
            // where this exact gap is inert because splitBandLeftColor/
            // -RightColor are also never set), this page always sets real
            // colors below, so splitBandActive's own value genuinely
            // controls visibility here — dropping this fallback would
            // silently make the header's own split band a permanent no-op
            // whenever spacefield isn't visible. splitBandLeftColor/
            // -RightColor: always explicit overrides here, never left to
            // the internal default — both need this page's own mount-
            // fade-in (colorsRevealed) and spacefield-visible treatment
            // layered on top of colors.resolvedSplitBandLeft/RightColor
            // (computed above via usePolymorphicLayoutColors, the same
            // real splitBandLeftMode/splitBandRightMode resolution every
            // other page uses — no page-specific color *relationship*
            // invented here anymore, only the reveal-timing/spacefield
            // override on top of it).
            splitBandActive={spacefieldVisible ? true : splitColumnLayoutConfig.headerSplitBandEnabled}
            splitBandLeftColor={displayedSplitBandLeftColor}
            splitBandRightColor={displayedSplitBandRightColor}
            splitBandLeftBackgroundSlot={logoSegmentBackgroundSlot}
            splitBandRightBackgroundSlot={topSegmentBackgroundSlot}
            splitBandStacked={colors.splitBandStacked}
            splitBandTransition={entranceTransition}
          />
        )}
        headerOverlay={spacefieldVisible && !topSegmentBackgroundEnabled ? (
          // Width-constrained to the header's own right 62% — matching
          // splitRight's width below, and putting this field's own
          // bottom-left origin exactly at the seam with the hero panel's
          // field (also top-right-originated), so the two independent
          // fields visually continue each other. The left 38% (the logo)
          // keeps its original split-band color untouched (see
          // splitBandLeftColor above) and was never meant to host a
          // starfield at all, so constraining width here — rather than
          // spanning the whole header and hiding the left portion behind
          // an opaque color — keeps the origin actually visible instead of
          // sitting behind that opaque area.
          //
          // !topSegmentBackgroundEnabled (round 2 fix, 2026-08-24): this
          // overlay paints the exact same right-62% box the new dynamic
          // background also claims — both rendering there at once isn't
          // "combining," it's the starfield's own opaque canvas silently
          // covering the gradient underneath. The explicit operator toggle
          // steps this aside instead of leaving two systems to fight over
          // the same pixels invisibly.
          <div className="absolute inset-y-0 right-0 w-[62%]">
            <SpacefieldBackground config={spacefieldConfig} narrow={isNarrowViewport} originCorner="bottom-left" />
          </div>
        ) : null}
        wideColumnClassName={styles.splitRight}
        narrowColumnClassName={[
          styles.splitLeft,
          'relative isolate',
          // The mobile accordion owns tablet too; suppress the otherwise
          // empty desktop-timeline track above it.
          isNarrowViewport ? 'md:!hidden' : '',
          // See narrowColumnContentWidthDecoupledEnabled's own doc comment
          // (about.config.ts) — this modifier suppresses .splitLeft's own
          // padding-left rule (about.module.css) entirely, so the
          // narrowColumnContentPaddingLeft*/-Wide/-Lg fields already live in
          // this page's own Polymorphic Layout panel become the real,
          // working source of left padding instead of always losing to that
          // rule on equal-specificity/later-cascade-order (the same class of
          // bug already fixed for padding-top/-bottom, see .splitLeft's own
          // doc comment).
          aboutPageLayoutConfig.narrowColumnContentWidthDecoupledEnabled ? styles.splitLeftWidthDecoupled : '',
        ].filter(Boolean).join(' ')}
        // Was an explicit empty override ({}) — <PolymorphicLayout>'s own
        // default wideColumnStyle already paints colors.wideColumnColor
        // inline; this page used to opt out entirely on the theory that
        // "AbstractPostDock paints everything it needs itself," which is
        // true for the AREA its own rows actually cover but not for the
        // wide column's own full box — confirmed live (AbstractPostDock/
        // MagnificationDock render in normal document flow, never
        // position:fixed, so the wide column's own box genuinely has real
        // height beyond what the rows fill) — any uncovered slice (below
        // the last row, gaps during a step transition) fell through to the
        // page's own light base surface instead of the configured wide-
        // column color, which is the exact gap the operator's own
        // screenshot showed. displayedWideColumnColor (colorsRevealed-
        // gated, same pattern every other palette color on this page uses)
        // now fills it — about.module.css's .splitRight still carries no
        // background-color rule of its own, so this inline value is the
        // only source now, same as narrowColumnStyle's own
        // --about-left-panel-color below.
        wideColumnStyle={{
          backgroundColor: displayedWideColumnColor,
          transition: entranceTransition,
        }}
        narrowColumnStyle={{
          '--about-left-panel-color': displayedLeftPanelColor,
          transition: entranceTransition,
          ...(leftAlignPx != null ? { '--about-left-align-px': `${leftAlignPx}px` } : {}),
        } as CSSProperties}
        narrowColumn={(
          <>
            {narrowColumnGradientLayer}
            {spacefieldVisible ? (
              <SpacefieldBackground config={spacefieldConfig} narrow={isNarrowViewport} originCorner="top-right" />
            ) : null}
            {/* Spreads narrowColumnContentBoxProps(splitColumnLayoutConfig)
                — the same complete, every-tier field mapping the
                coordinator's own 'bounded' default path uses internally —
                rather than hand-picking individual fields, so no tier of
                this page's own "Polymorphic Layout" panel controls can go
                silently dead (see pages/posts-lab/[slug].tsx's own doc
                comment on this same call for the concrete incident that
                pattern caused there). debugLabel isn't overridden — the
                builder's own default ('NARROW COLUMN CONTENT') already
                matches what this call site wants. */}
            <NarrowColumnContent
              {...narrowColumnContentBoxProps(splitColumnLayoutConfig)}
              // Replaces about.module.css's former .splitLeftContent —
              // same container-type: inline-size context the headline's own
              // responsive font sizing needs, now composed directly instead
              // of a page-CSS class.
              containerQuery
            >
              {/* CMP-06/INT-06 (about-IA-timeline-copy-rework) — the narrow
                  column's only content now: the standfirst headline this
                  page previously rendered above it (AbstractEditorialHero)
                  was removed per operator request, so AboutTimeline (and its
                  own lead-in description) is the entire column. Still inside
                  NarrowColumnContent's own containerQuery context. Desktop-only
                  (!isNarrowViewport, not mobileAccordionActive — this is a
                  viewport decision, independent of whether an operator has
                  toggled the mobile accordion feature off): mobile keeps
                  the accordion's own headers (ABOUT_NARRATIVE_PREVIEWS,
                  CNT-06) as its only "timeline," never this synchronized
                  tablist. */}
              {!isNarrowViewport ? (
                <div
                  ref={aboutTimelineInkRef}
                  style={desktopTimelineStartPx != null ? {
                    marginLeft: `${desktopTimelineStartPx}px`,
                    width: `calc(100% - ${desktopTimelineStartPx}px)`,
                  } : undefined}
                >
                  <AboutTimeline
                    rows={aboutTimelineRows}
                    activeIndex={activeSlideIndex}
                    onSelect={setActiveSlideIndex}
                    accentColor={aboutSlides[activeSlideIndex]?.accent ?? '#ffffff'}
                    columnBackgroundColor={colors.narrowColumnColor}
                    inkColorOverride={aboutTimelineInkColor}
                    inkOpacityMultiplier={colors.scrollGradientDarkInkOpacityMultiplier}
                    description={aboutTimelineConfig.description || undefined}
                    config={aboutTimelineConfig}
                    prefersReducedMotion={prefersReducedMotion}
                    panelId={ABOUT_TIMELINE_PANEL_ID}
                    gradientSlides={aboutSlides}
                    gradientPaletteStates={timelineMarkerPaletteStates}
                    gradientMotion={timelineMarkerMotion}
                    gradientConfig={dockSliderConfig}
                  />
                </div>
              ) : null}
            </NarrowColumnContent>

            {/* !mobileAccordionActive: PLAN-ABOUT-MOBILE-ACCORDION.md §4 —
                the prev/next triangles drive a single activeIndex, which
                has no clear meaning against a multi-expand accordion (no
                one "next" item to step to once more than one can be open).
                Tap-per-item fully replaces sequential navigation as the
                mobile interaction model, so the control is hidden rather
                than left to do something ambiguous.
                CMP-07 (about-IA-timeline-copy-rework): AboutTimeline now
                serves this same "jump to a slide" role on desktop (a real
                tablist, not a pair of triangles) — this control is left in
                place, unchanged, at its existing navControlEnabled: false
                default rather than deleted, per that decision. */}
            {aboutPageLayoutConfig.navControlEnabled && !mobileAccordionActive ? (
              <AboutSlideNavControl
                arrowSizePx={aboutPageLayoutConfig.navControlArrowSizePx}
                idleColor={navControlIdleColor}
                hoverColor={navControlHoverColor}
                idleOpacity={aboutPageLayoutConfig.navControlIdleOpacity}
                hoverOpacity={aboutPageLayoutConfig.navControlHoverOpacity}
                disabledOpacity={aboutPageLayoutConfig.navControlDisabledOpacity}
                hoverTransitionMs={aboutPageLayoutConfig.navControlHoverTransitionMs}
                hoverEasing={aboutPageLayoutConfig.navControlHoverEasing}
                mouseOutTransitionMs={aboutPageLayoutConfig.navControlMouseOutTransitionMs}
                mouseOutEasing={aboutPageLayoutConfig.navControlMouseOutEasing}
              />
            ) : null}
          </>
        )}
        wideColumn={mobileAccordionActive ? (
          <AboutMobileAccordion
            slides={aboutSlides}
            gradientConfig={dockSliderConfig}
            paletteConfig={dockPaletteConfig}
            config={effectiveAboutMobileAccordionConfig}
            dimOpacity={dockLayoutConfig.minimalModeTextDimOpacity}
            emphasisOpacity={dockLayoutConfig.minimalModeTextEmphasisOpacity}
            prefersReducedMotion={prefersReducedMotion}
            onActiveIndexChange={setActiveSlideIndex}
            columnBackgroundColor={colors.wideColumnColor}
          />
        ) : (
          // A11Y-01/A11Y-10 (about-IA-timeline-copy-rework) — `display:
          // contents` so this wrapper adds ARIA semantics only, with zero
          // layout footprint (AbstractPostDock still renders as if it were
          // .splitRight's own direct flex child, unchanged). role="tabpanel"
          // pairs with AboutTimeline's own tabs (aria-controls, same id);
          // aria-live="polite" is what makes screen readers actually
          // announce the panel change AboutTimeline's tab activation causes,
          // not just the tab's own aria-selected flip (QA-10).
          <div role="tabpanel" id={ABOUT_TIMELINE_PANEL_ID} aria-live="polite" style={{ display: 'contents' }}>
            <AbstractPostDock
              items={aboutSlides}
              layoutConfig={dockLayoutConfig}
              paletteConfig={dockPaletteConfig}
              config={dockSliderConfig}
              variant="embedded"
              narrowDetectionSource="viewport"
              // The dock's own narrow/touch presentation otherwise flips on
              // at its generic 1180px default — ~400px before this page's
              // real mobile breakpoint (mobileAccordionActive swaps to
              // AboutMobileAccordion at MD_BREAKPOINT_PX). Without this, the
              // accordion silently re-tuned itself (mobile peek sizing, deck/
              // pager behavior, narrow shadow/dimming) across that gap even
              // though the page still considered itself a wide device.
              narrowBreakpointPx={MD_BREAKPOINT_PX}
              // PLAN-ABOUT-MOBILE-ACCORDION.md §9 — without this, View.tsx
              // falls back to its own legacy activeOnlyIdleDrift-derived
              // policy, which still resolves the ACTIVE row to 'continuous'
              // (a genuine per-frame shader recalculation, forever). 'static'
              // freezes every row, active or not — one render per relevant
              // change, never a live idle-drift loop, matching the mobile
              // accordion's own forced-static gradient below it.
              gradientPerformanceConfig={{ activityPolicy: 'static', pauseWhenOffscreen: true }}
              activeIndex={activeSlideIndex}
              onActiveIndexChange={setActiveSlideIndex}
              gaussianProximityOffsetXRefs={rowGaussianProximityOffsetXRefs}
              gaussianProximityDomRefs={rowGaussianProximityDomRefs}
            />
          </div>
        )}
      >
        {showAuthoringTools ? (
          <PanelShell
            title="ABOUT SETTINGS"
            isOpen={isPanelOpen}
            onToggle={togglePanel}
            config={panelShellConfig}
            headerActions={(
              <PanelStandardHeaderActions
                bindings={componentConfigBindings}
                onReset={resetAllConfig}
                panelShellConfig={panelShellConfig}
              />
            )}
          >
            <ConfigScopeList bindings={componentConfigBindings} />
          </PanelShell>
        ) : null}
      </PolymorphicLayout>
    </>
  );
}
