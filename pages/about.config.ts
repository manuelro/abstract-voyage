import type { CtaButtonMotionEasing } from '../components/CtaButton/config/registered';
import { DEFAULT_LIQUID_SLIDER_CONFIG } from '../experiences/abstract/components/AbstractPostDock';
import {
  DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG,
  DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG,
  type AbstractPostDockPaletteConfig,
  type AbstractPostDockLayoutConfig,
} from '../experiences/abstract/components/AbstractPostDock/config/registered';

/** 'column' (the default) derives the headline's own color from the left
 * column's real resolved background via resolveContrastAwareTextColor —
 * the same shared primitive SiteHeader/AbstractEditorialHero's own
 * 'column'-mode fields already use, not a page-local reimplementation.
 * 'light'/'dark' remain as explicit manual overrides. */
export type AboutPageLeftPanelTextTone = 'light' | 'dark' | 'column';

/**
 * Page-owned settings for about.tsx's left column — not an AbstractPostDock
 * concern (it renders outside the dock entirely), so it gets its own small
 * scope rather than being flattened into AbstractPostDockLayoutConfig.
 * The left column's own color source/custom-color fields live on
 * SplitColumnLayout's own panel now (colorSource/narrowColumnCustomColor —
 * about.tsx's left column is SplitColumnLayout's narrow column), not here.
 */
export type AboutPageLayoutConfig = {
  /** Text color over the left column's solid background — see
   * AboutPageLeftPanelTextTone's own doc comment for what each mode means. */
  leftPanelTextTone: AboutPageLeftPanelTextTone;
  /** Shows the triangle prev/next control at the left panel's top-right
   * corner. */
  navControlEnabled: boolean;
  /** Triangle glyph height, in px (width follows from the same aspect the
   * triangle is drawn at). The gap between the two triangles is always 32%
   * of this value (NAV_CONTROL_GAP_RATIO in about.tsx) — a fixed relationship,
   * not independently configurable. */
  navControlArrowSizePx: number;
  /** The triangle's own idle fill color is the nav split-background's left
   * color (itself the about-left-panel color's complement — see
   * navSplitLeftColor in about.tsx) darkened by this fraction (OKLab
   * lightness scale, 0 = unchanged, 1 = black) — no independent color
   * picker, so the arrow always stays a coherent, derived shade rather than
   * an arbitrary pick. */
  navControlColorDarkenAmount: number;
  /** Hover blends the idle (darkened) fill back toward the undarkened nav
   * split-left color by this fraction (0 = no change from idle, 1 = fully
   * undarkened) — the "lighting up" cue that stands in for the elevation
   * shadow this control no longer casts. */
  navControlHoverBrightenAmount: number;
  /** Resting-state opacity of the triangle control. */
  navControlIdleOpacity: number;
  /** Opacity while a (non-disabled) triangle is hovered. */
  navControlHoverOpacity: number;
  /** Opacity of a triangle when there is no earlier/later slide to go to
   * (its "inactive" state). */
  navControlDisabledOpacity: number;
  /** Hover-enter transition duration (color + opacity together), in ms. */
  navControlHoverTransitionMs: number;
  /** Hover-enter easing — same preset vocabulary as CtaButtonConfig's own
   * stateEasing, reused rather than a parallel enum. */
  navControlHoverEasing: CtaButtonMotionEasing;
  /** Hover-exit / disabled transition duration (color + opacity together),
   * in ms — deliberately separate from the enter duration above so the
   * control can, e.g., ease in quickly and settle out slowly. */
  navControlMouseOutTransitionMs: number;
  /** Hover-exit / disabled easing. */
  navControlMouseOutEasing: CtaButtonMotionEasing;
  /** On mount (i.e. arriving at /about from elsewhere), the three
   * palette-derived swatches (left panel, nav split-left, nav split-right)
   * start at the page's own neutral surface color and transition to their
   * real values over this duration, in ms, instead of appearing instantly. */
  pageEntranceTransitionMs: number;
  /** Easing for the page-entrance color transition above. */
  pageEntranceEasing: CtaButtonMotionEasing;
  /** Off (default): the header's split-band right segment (behind the nav)
   * gets its color the way it always has — colors.resolvedSplitBandRightColor,
   * SplitColumnLayout's own splitBandRightMode resolution. On: that segment
   * instead becomes a new, dedicated leading stop in the same palette
   * sequence the narrative rows already share (PLAN-ABOUT-HEADER-DYNAMIC-
   * BACKGROUND-ROW.md) — its hue precedes every narrative row's own hue in
   * the palette's continuous sweep, it reveals on mount using the exact
   * same colorsRevealed/entranceTransition mechanism every other palette
   * color on this page already uses, and it drives the nav's own text
   * contrast the same way splitBandRightColor always has. Unlike the
   * narrative rows (each a real AbstractPostDock slide, resizing with the
   * dock), this segment's own height never changes — it's always exactly
   * the header's height, painted once, not a slide. Takes priority over
   * the spacefield starfield (about.tsx's own spacefieldVisible) for this
   * one segment when both are on — an earlier version of this field
   * instead went silently inert whenever the spacefield's own default-on
   * state was active, which meant toggling this switch from the panel did
   * nothing under the page's own default settings (caught live,
   * 2026-08-24). This field alone is now authoritative for the header's
   * right segment; the spacefield's own header-region rendering steps
   * aside instead. */
  topSegmentDynamicBackgroundEnabled: boolean;
  /** Off (default): only the header's nav segment (topSegmentDynamicBackground-
   * Enabled above) gets the dynamic gradient mesh — the logo segment and the
   * entire narrow column keep their flat, palette-resolved colors, same as
   * before this field existed. On: at the mobile/stacked breakpoint only
   * (desktop is untouched), the logo segment and the narrow column each get
   * their own mount of the same shared LiquidGradientAdapter mesh
   * (identical config/palette, so color never drifts between the three),
   * composited via a shared "virtual canvas" offset so the three
   * independently-mounted crops read as one continuous field spanning logo
   * bar -> nav bar -> narrow column (PLAN-ABOUT-MOBILE-UNIFIED-HERO-
   * GRADIENT.md §1). Inert unless topSegmentDynamicBackgroundEnabled is also
   * on — this field only extends that one's reach, it never substitutes for
   * it. */
  mobileUnifiedNarrowColumnGradientEnabled: boolean;
};

export const DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG = {
  leftPanelTextTone: 'column',
  navControlEnabled: false,
  navControlArrowSizePx: 40,
  navControlColorDarkenAmount: 0.4,
  navControlHoverBrightenAmount: 0.6,
  navControlIdleOpacity: 0.85,
  navControlHoverOpacity: 1,
  navControlDisabledOpacity: 0.35,
  navControlHoverTransitionMs: 160,
  navControlHoverEasing: 'expressive',
  navControlMouseOutTransitionMs: 320,
  navControlMouseOutEasing: 'gentle',
  pageEntranceTransitionMs: 900,
  pageEntranceEasing: 'viscous',
  topSegmentDynamicBackgroundEnabled: true,
  mobileUnifiedNarrowColumnGradientEnabled: true,
} satisfies AboutPageLayoutConfig;

const TEXT_TONES: ReadonlyArray<AboutPageLeftPanelTextTone> = ['light', 'dark', 'column'];
const MOTION_EASINGS: ReadonlyArray<CtaButtonMotionEasing> = [
  'linear', 'standard', 'expressive', 'viscous', 'gentle',
];

const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);
const clampRange = (value: number, min: number, max: number, fallback: number) => (
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
);

export function normalizeAboutPageLayoutConfig(
  config: Partial<AboutPageLayoutConfig> | undefined,
): AboutPageLayoutConfig {
  const base = { ...DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG, ...(config ?? {}) };
  return {
    leftPanelTextTone: token(
      base.leftPanelTextTone, TEXT_TONES, DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG.leftPanelTextTone,
    ),
    navControlEnabled: Boolean(base.navControlEnabled),
    navControlArrowSizePx: clampRange(
      base.navControlArrowSizePx, 8, 40, DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG.navControlArrowSizePx,
    ),
    navControlColorDarkenAmount: clampRange(
      base.navControlColorDarkenAmount, 0, 1, DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG.navControlColorDarkenAmount,
    ),
    navControlHoverBrightenAmount: clampRange(
      base.navControlHoverBrightenAmount, 0, 1, DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG.navControlHoverBrightenAmount,
    ),
    navControlIdleOpacity: clampRange(
      base.navControlIdleOpacity, 0, 1, DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG.navControlIdleOpacity,
    ),
    navControlHoverOpacity: clampRange(
      base.navControlHoverOpacity, 0, 1, DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG.navControlHoverOpacity,
    ),
    navControlDisabledOpacity: clampRange(
      base.navControlDisabledOpacity, 0, 1, DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG.navControlDisabledOpacity,
    ),
    navControlHoverTransitionMs: clampRange(
      base.navControlHoverTransitionMs, 0, 1000, DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG.navControlHoverTransitionMs,
    ),
    navControlHoverEasing: token(
      base.navControlHoverEasing, MOTION_EASINGS, DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG.navControlHoverEasing,
    ),
    navControlMouseOutTransitionMs: clampRange(
      base.navControlMouseOutTransitionMs,
      0,
      1500,
      DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG.navControlMouseOutTransitionMs,
    ),
    navControlMouseOutEasing: token(
      base.navControlMouseOutEasing, MOTION_EASINGS, DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG.navControlMouseOutEasing,
    ),
    pageEntranceTransitionMs: clampRange(
      base.pageEntranceTransitionMs, 0, 3000, DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG.pageEntranceTransitionMs,
    ),
    pageEntranceEasing: token(
      base.pageEntranceEasing, MOTION_EASINGS, DEFAULT_ABOUT_PAGE_LAYOUT_CONFIG.pageEntranceEasing,
    ),
    topSegmentDynamicBackgroundEnabled: Boolean(base.topSegmentDynamicBackgroundEnabled),
    mobileUnifiedNarrowColumnGradientEnabled: Boolean(base.mobileUnifiedNarrowColumnGradientEnabled),
  };
}

/**
 * The header top segment's own gradient — scale/geometry/behavior only,
 * deliberately NOT color (hue/saturation/palette come from dockPaletteConfig,
 * the exact same source every real narrative row already reads — see
 * pages/about.tsx's own topSegmentPaletteState). A short, wide header strip
 * and a tall narrative row are different enough shapes that the same raw
 * shader tuning doesn't necessarily read as "one continuous mesh" across the
 * seam between them (operator-reported, live screenshot, 2026-08-24) — this
 * scope exists so that seam can be tuned directly, without touching
 * dockSliderConfig (AboutPageLayoutConfig above), which stays the real rows'
 * own unmodified tuning. Every field here starts at the exact same default
 * LiquidSliderConfig's own field of the same name already has
 * (DEFAULT_LIQUID_SLIDER_CONFIG, AbstractPostDock/config/legacy.ts) — the top
 * segment therefore reads as identical to the rows out of the box, with this
 * scope as the deliberate override surface once an operator wants to retune
 * the seam. Field set is SliderGradientConfig's own shape minus
 * `seed`/`backgroundColor` (identity/fallback values, not "how it looks"
 * tuning) — spread directly onto dockSliderConfig at the render call site
 * (`{ ...dockSliderConfig, ...topSegmentGradientConfig }`), never a
 * hand-retyped subset of field names. `shaderColorScale`/`shaderColorRandomness`
 * are deliberately NOT part of that shape (unlike every other
 * SliderGradientConfig field): those two now come from the shared "Gradient
 * scale"/"Gradient noise" fields (Dock palette direction panel,
 * dockPaletteConfig) instead, on both the header and the rows, so the two
 * segments' own zoom/noise can never drift apart the way the rest of this
 * scope's fields still deliberately can.
 */
export type AboutTopSegmentGradientConfig = {
  /** Hue variety per unit area — lower shows more of the color field. */
  shaderColorVariation: number;
  shaderColorSaturation: number;
  shaderColorBrightness: number;
  /** Shader texture resolution, px. Higher is crisper/more detailed, more
   * expensive. */
  shaderColorResolution: number;
  /** Edge softness between color bands. */
  shaderColorSoftness: number;
  /** Vertical color variation, independent of the horizontal field. */
  shaderColorVerticalRichness: number;
  /** Hue rotation applied on top of the palette-derived base hue. */
  shaderColorHueOffset: number;
  /** Domain-warp amplitude — higher reads as more organic/liquid distortion. */
  shaderColorMorph: number;
  /** Specular shimmer intensity. */
  shaderColorShimmer: number;
  /** Pulsing animation intensity. */
  shaderColorPulse: number;
  /** Additional domain-warp amplitude layered on top of shaderColorMorph. */
  shaderDomainCurveBoost: number;
  /** Additional band-phase coupling amplitude. */
  shaderBandCurveBoost: number;
  /** Idle drift animation once the field has settled. */
  shaderSettledDriftEnabled: boolean;
  shaderSettledDriftSpeed: number;
  shaderSettledDriftAmount: number;
  shaderSettledDriftOrganic: number;
};

export const DEFAULT_ABOUT_TOP_SEGMENT_GRADIENT_CONFIG = {
  shaderColorVariation: DEFAULT_LIQUID_SLIDER_CONFIG.shaderColorVariation,
  shaderColorSaturation: DEFAULT_LIQUID_SLIDER_CONFIG.shaderColorSaturation,
  shaderColorBrightness: DEFAULT_LIQUID_SLIDER_CONFIG.shaderColorBrightness,
  shaderColorResolution: DEFAULT_LIQUID_SLIDER_CONFIG.shaderColorResolution,
  shaderColorSoftness: DEFAULT_LIQUID_SLIDER_CONFIG.shaderColorSoftness,
  shaderColorVerticalRichness: DEFAULT_LIQUID_SLIDER_CONFIG.shaderColorVerticalRichness,
  shaderColorHueOffset: DEFAULT_LIQUID_SLIDER_CONFIG.shaderColorHueOffset,
  shaderColorMorph: DEFAULT_LIQUID_SLIDER_CONFIG.shaderColorMorph,
  shaderColorShimmer: DEFAULT_LIQUID_SLIDER_CONFIG.shaderColorShimmer,
  shaderColorPulse: DEFAULT_LIQUID_SLIDER_CONFIG.shaderColorPulse,
  shaderDomainCurveBoost: DEFAULT_LIQUID_SLIDER_CONFIG.shaderDomainCurveBoost,
  shaderBandCurveBoost: DEFAULT_LIQUID_SLIDER_CONFIG.shaderBandCurveBoost,
  shaderSettledDriftEnabled: DEFAULT_LIQUID_SLIDER_CONFIG.shaderSettledDriftEnabled,
  shaderSettledDriftSpeed: DEFAULT_LIQUID_SLIDER_CONFIG.shaderSettledDriftSpeed,
  shaderSettledDriftAmount: DEFAULT_LIQUID_SLIDER_CONFIG.shaderSettledDriftAmount,
  shaderSettledDriftOrganic: DEFAULT_LIQUID_SLIDER_CONFIG.shaderSettledDriftOrganic,
} satisfies AboutTopSegmentGradientConfig;

export function normalizeAboutTopSegmentGradientConfig(
  config: Partial<AboutTopSegmentGradientConfig> | undefined,
): AboutTopSegmentGradientConfig {
  const base = { ...DEFAULT_ABOUT_TOP_SEGMENT_GRADIENT_CONFIG, ...(config ?? {}) };
  const D = DEFAULT_ABOUT_TOP_SEGMENT_GRADIENT_CONFIG;
  return {
    shaderColorVariation: clampRange(base.shaderColorVariation, 0, 2, D.shaderColorVariation),
    shaderColorSaturation: clampRange(base.shaderColorSaturation, 0, 2, D.shaderColorSaturation),
    shaderColorBrightness: clampRange(base.shaderColorBrightness, 0, 2, D.shaderColorBrightness),
    shaderColorResolution: clampRange(base.shaderColorResolution, 64, 2048, D.shaderColorResolution),
    shaderColorSoftness: clampRange(base.shaderColorSoftness, 0, 2, D.shaderColorSoftness),
    shaderColorVerticalRichness: clampRange(base.shaderColorVerticalRichness, 0, 2, D.shaderColorVerticalRichness),
    shaderColorHueOffset: clampRange(base.shaderColorHueOffset, -1, 1, D.shaderColorHueOffset),
    shaderColorMorph: clampRange(base.shaderColorMorph, 0, 3, D.shaderColorMorph),
    shaderColorShimmer: clampRange(base.shaderColorShimmer, 0, 3, D.shaderColorShimmer),
    shaderColorPulse: clampRange(base.shaderColorPulse, 0, 3, D.shaderColorPulse),
    shaderDomainCurveBoost: clampRange(base.shaderDomainCurveBoost, 0, 1, D.shaderDomainCurveBoost),
    shaderBandCurveBoost: clampRange(base.shaderBandCurveBoost, 0, 1, D.shaderBandCurveBoost),
    shaderSettledDriftEnabled: Boolean(base.shaderSettledDriftEnabled),
    shaderSettledDriftSpeed: clampRange(base.shaderSettledDriftSpeed, 0, 10, D.shaderSettledDriftSpeed),
    shaderSettledDriftAmount: clampRange(base.shaderSettledDriftAmount, 0, 3, D.shaderSettledDriftAmount),
    shaderSettledDriftOrganic: clampRange(base.shaderSettledDriftOrganic, 0, 3, D.shaderSettledDriftOrganic),
  };
}

/**
 * This page's own tuning of AbstractPostDock's shared palette config,
 * layered onto (not replacing) DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG —
 * /abstract's own JOURNAL section reads that same shared default directly,
 * unmodified.
 *
 * Moved here from pages/about.tsx (was a page-local, unexported const)
 * specifically so pages/about.panel.ts can also import it — the root cause
 * of a real, confirmed bug (operator-reported, live screenshots, 2026-08-24):
 * about.tsx's own "Dock palette direction" panel section was bound to
 * ABSTRACT_POST_DOCK_PALETTE_PANEL, the SAME scope definition /abstract
 * uses, whose own `copy` metadata targets the SHARED symbol
 * (DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG in AbstractPostDock/config/
 * registered.ts) — but about.tsx's actual LIVE state initializes from THIS
 * constant, which hardcodes windowStep/inactiveChromaDuck on top of that
 * shared default. An operator tuning "Inactive duck" on /about and applying
 * the resulting component-config-update/v1 prompt was therefore updating a
 * symbol that governs every OTHER consumer of the shared default, while
 * about.tsx's own inactiveChromaDuck stayed pinned to whatever literal sits
 * here — silently discarding the update on every subsequent refresh, which
 * read as "the config isn't persisting" when the update itself had actually
 * landed correctly in the file. See ABOUT_DOCK_PALETTE_PANEL (about.panel.ts)
 * for the fix: a page-owned scope whose own `copy.targetSymbol` points at
 * THIS constant instead, so an operator's own update-prompt lands where the
 * page actually reads from. AbstractPostDockLayoutConfig's own equivalent
 * page-local override had the identical defect (same class of bug,
 * different scope) — since fixed the same way; see
 * ABOUT_DEFAULT_DOCK_LAYOUT_CONFIG below and ABOUT_DOCK_LAYOUT_PANEL
 * (about.panel.ts).
 */
export const ABOUT_DEFAULT_DOCK_PALETTE_CONFIG: AbstractPostDockPaletteConfig = {
  ...DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG,
  windowStep: 0.16,
  hueSpread: 0.3,
  windowPanCurve: 'gaussian',
  gaussianPeakIndex: -1,
  gaussianSigma: 1.7,
  gaussianAmplitude: 0.72,
  gaussianFloor: 0,
  fieldKinship: 0,
  // Wide/Lg (tablet/desktop) start byte-identical to the base/mobile value
  // below — preserves this page's existing tuned look at every breakpoint
  // it already rendered at (AbstractPostDock, ≥768px) now that gradient
  // scale/noise are tiered; the mobile accordion (<768px) is the newly
  // independently-tunable tier this split was actually for (operator ask,
  // 2026-08-25).
  gradientScale: 1.91,
  gradientNoise: 0.2,
  gradientScaleWide: 0.75,
  gradientNoiseWide: 0.1,
  gradientScaleLg: 0.87,
  gradientNoiseLg: 0.16,
  // Recalibrated for continuous gaussian-envelope duck (0.1 was tuned for
  // the old binary "take the edge off the unfocused row" nudge — reached
  // only at the bell's extreme tail, that read as barely visible).
  inactiveChromaDuck: 0.65,
  valueRigAmount: 0,
  masterSaturation: 0.9,
  masterBrightness: 0.9,
  masterContrast: 0.82,
  // Recalibrated from the shared default's power: 0.25/maxOpacity: 0.75 —
  // that front-loads the black overlay so hard the row right next to
  // active was already ~54% dark (operator-reported, live screenshot).
  // power: 1 removes the front-loading; baselineOpacity keeps the nearest
  // row very slightly receded (reinforcing which row has focus) instead of
  // starting from a hard 0; maxOpacity is lowered so even the farthest row
  // never goes fully black. Starting values — tune live via the panel.
  distanceDimmingMaxOpacity: 0.39,
  distanceDimmingBaselineOpacity: 0.05,
  distanceDimmingPower: 1.8,
  distanceDimmingEasing: 'linear',
};

/**
 * This page's own baseline for AbstractPostDockLayoutConfig (vertical
 * minimal-mode slider) — NOT DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG
 * itself (scattered mode), which is what /abstract's own JOURNAL section
 * reads directly and must stay untouched.
 *
 * Moved here from pages/about.tsx (was a page-local, unexported const)
 * specifically so pages/about.panel.ts can also import it —
 * PLAN-DOCK-PALETTE-CONFIG-SEGREGATION.md's own audit found this was the
 * exact same class of bug ABOUT_DEFAULT_DOCK_PALETTE_CONFIG's own doc
 * comment above already named and fixed for palette, still live here:
 * about.tsx's "Dock layout" panel section was bound to
 * ABSTRACT_POST_DOCK_LAYOUT_PANEL, the SAME scope /abstract uses, whose own
 * `copy` metadata targets the SHARED symbol
 * (DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG in AbstractPostDock/config/
 * registered.ts) — but about.tsx's actual LIVE state initializes from THIS
 * constant. An operator tuning "Dock layout" on /about and applying the
 * resulting update-prompt would have been silently editing a symbol this
 * page's own rendered value never reads, while also retargeting
 * /abstract's own scattered-mode default out from under it. See
 * ABOUT_DOCK_LAYOUT_PANEL (about.panel.ts) for the fix: a page-owned scope
 * whose own `copy.targetSymbol` points at THIS constant instead.
 */
export const ABOUT_DEFAULT_DOCK_LAYOUT_CONFIG: AbstractPostDockLayoutConfig = {
  ...DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG,
  mode: 'slider',
  orientation: 'vertical',
  minimalModeEnabled: true,
  minimalModeGradientEnabled: true,
  minimalModeFontSize: 'text-3xl',
  minimalModeTextDimOpacity: 0.45,
  minimalModeTextEmphasisOpacity: 0.95,
};

// PLAN-POLYMORPHIC-LAYOUT-PAGE-CONFIG-PARITY.md: relocated to
// experiences/abstract/components/PolymorphicLayout.pageConfigs.ts, co-located
// with /abstract's and /posts-lab's own instances next to the shared type
// they're all instances of (PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md's own
// "Round 1" ruling — see that file's own doc comment for the full per-field
// reasoning). Re-exported here unchanged so no other consumer of this file's
// own ABOUT_POLYMORPHIC_LAYOUT_CONFIG import needs to change.
export { ABOUT_POLYMORPHIC_LAYOUT_CONFIG } from '../experiences/abstract/components/PolymorphicLayout.pageConfigs';
