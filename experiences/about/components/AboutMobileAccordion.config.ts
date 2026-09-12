import type { CtaButtonMotionEasing } from '../../../components/CtaButton/config/registered';
import type { AbstractPostDockEasingPreset } from '../../abstract/components/AbstractPostDock/config/registered';
import {
  MIN_HEIGHT_OPTIONS,
  PADDING_OPTIONS,
  AFFORDANCE_BORDER_THICKNESS_OPTIONS,
  AFFORDANCE_CORNER_RADIUS_OPTIONS,
  AFFORDANCE_DIMENSION_OPTIONS,
  OUTER_BORDER_WIDTH_OPTIONS,
  INNER_BORDER_WIDTH_OPTIONS,
  type MinHeightClass,
  type PaddingClass,
  type AffordanceBorderThicknessClass,
  type AffordanceCornerRadiusClass,
  type AffordanceDimensionClass,
  type OuterBorderWidthClass,
  type InnerBorderWidthClass,
} from '../../../components/tailwindSpacingScale';

/** 'accent' derives the affordance's border color from the row's own
 * resolved accent/text color (the same "derive, don't invent a new color"
 * convention `navControlIdleColor` already follows in `pages/about.tsx`) —
 * 'custom' exposes an independent color field for an operator who wants the
 * affordance to stand apart from its row. */
export type AboutMobileAccordionAffordanceColorMode = 'accent' | 'custom';

/** 'derived' (default) computes the color from `columnBackgroundColor`
 * (the page's own resolved column-color reference) via the matching
 * *SurfaceOffset field below — 'custom' bypasses that derivation entirely
 * and uses an independent, flat color field instead, for an operator who
 * finds the derived tone (e.g. against a very light background) reads too
 * washed-out/low-contrast at any offset the -1..0 range allows. */
export type AboutMobileAccordionColorMode = 'derived' | 'custom';

/**
 * PLAN-ABOUT-MOBILE-ACCORDION.md — the mobile (below-md) replacement for
 * `AboutMobileCardStack` on `/about`. Component-owned config: interaction/
 * geometry knobs for `AboutMobileAccordion`/`AboutMobileAccordionItem`
 * themselves, not page-composition decisions (contrast
 * `AboutMobileCardStackConfig`, which stayed in `pages/about.config.ts`
 * because that component takes its whole appearance as props).
 *
 * The outerBorder-/innerBorder-/textSurfaceOffset fields below are the one
 * deliberate exception to "no color field lives here" (the rest of this
 * doc comment's original reasoning — the accordion's own per-item background/gradient
 * mesh reused the page's dockPaletteConfig/dockSliderConfig verbatim — still
 * holds for the mesh itself). Once the accordion column's own background
 * became fully transparent (letting the page's scroll-gradient show through
 * uninterrupted, operator ask), the border/text colors this component used
 * to hardcode (`border-white/50`, `text-white`) stopped having any reliable
 * relationship to what's actually behind them. The color fields derive both
 * from `columnBackgroundColor` (the page's own resolved column-color
 * reference, passed in as a prop — not sampled from the live animated
 * gradient pixel-by-pixel, which no config knob could reasonably expose)
 * via the same `deriveSurfaceColor` primitive `CtaButtonConfig`'s own
 * auto-colors and `AboutMobileAccordionAffordanceColorMode`'s sibling
 * `affordanceCustomColor` field already use elsewhere in this codebase.
 *
 * outerBorder* (the accordion's own outer box edge) and innerBorder* (the
 * divider line between stacked rows) are two fully independent knob sets —
 * independent color AND independent width, each on Tailwind's own literal
 * border-width scale (OUTER_BORDER_WIDTH_OPTIONS/INNER_BORDER_WIDTH_OPTIONS,
 * tailwindSpacingScale.ts) rather than an arbitrary pixel value — `border-0`/
 * `divide-y-0` are real, supported "no border at all" choices on that same
 * scale, not a separate boolean layered on top of a width field that could
 * disagree with it.
 *
 * PLAN-EDITORIAL-HERO-UNIFICATION-AND-CARDSTACK-RESIZE-FIX.md Part 4:
 * `transitionMs`/`transitionEasing`/`contentSettleMs` are the same
 * unification — the desktop accordion (`MagnificationDock` via
 * `AbstractPostDock/components/View.tsx`) reads these exact three values
 * off its own `LiquidSliderConfig` (`dockTransitionMs`/`dockTransitionEasing`/
 * `dockContentSettleMs`, previously fixed at their hardcoded defaults with
 * no panel exposure at all). `pages/about.tsx` copies these three fields
 * from this config into the `LiquidSliderConfig` it builds for the desktop
 * engine, so one edit here retunes both accordions at once instead of two
 * independent, drift-prone timing systems.
 */
export type AboutMobileAccordionConfig = {
  /** Operator escape hatch — off keeps the vertical slider (desktop dock)
   * mounted at every breakpoint, same shape as
   * `AboutMobileCardStackConfig.enabled` did. */
  enabled: boolean;
  /** Uniform collapsed preview-tab height, every item, regardless of its
   * own excerpt length. */
  previewMinHeight: MinHeightClass;
  /** Cap on simultaneously expanded items. `0` = unlimited (every item can
   * be open at once) — the requirement is that more than two must be
   * possible, not that a lower cap is disallowed; an operator who wants a
   * classic single-open accordion sets this to `1`. When a tap would exceed
   * a positive cap, the oldest-opened item is evicted (FIFO), never
   * blocking the tap outright. */
  maxExpandedItems: number;
  /** When opening an item forces another one to close (maxExpandedItems'
   * own FIFO eviction), the newly-opening item doesn't start its own
   * height/reveal transition immediately alongside the closing one — it
   * waits until the closing item's `transitionMs` is this fraction
   * complete first. `0` starts both at once (no stagger); `1` waits for the
   * closing item's transition to fully finish before the new one begins.
   * Has no effect when nothing is being evicted (e.g. the first item ever
   * opened, or `maxExpandedItems: 0` with room to spare).
   *
   * Four rounds of tuning this field chased symptoms before the real root
   * cause (a frame-timing asymmetry inside useExpandableHeight, not this
   * field) was found. A STATIC once-per-toggle divide of the shared budget
   * (contentBudgetPx / expandedIndices.length) is exact under this
   * component's default `maxExpandedItems: 1` — but with `0`
   * (simultaneous), the closing item's own collapse-to-0 call went through
   * an extra two-`requestAnimationFrame` delay the opening item's
   * synchronous open call didn't, so the two `height` transitions began
   * interpolating 2 frames apart: for those 2 frames the closing item was
   * still rendering its full OLD height while the opening item had
   * already started growing from zero, pushing every row below down and
   * springing back once the closing item caught up ("pushed down ...
   * spring-like", confirmed via frame-by-frame `getBoundingClientRect`
   * sampling: 15 non-monotonic frames out of 90). Forcing `1` (fully
   * sequential) avoided that overlap but traded it for a real window
   * where NEITHER item has any height — the whole accordion collapses to
   * just its headers with a dead gap below ("empty gap at the bottom ...
   * during a transition"), a direct violation of the hard requirement
   * that this accordion fill 100% of its parent's height at every
   * instant, including mid-transition. Two more attempts (see
   * useExpandableHeight's own doc comment) tried live cross-reporting
   * between siblings, and then delaying the OPEN path by the same two
   * frames the close path used — both made things worse (the first
   * chased a moving target instead of one clean curve; the second could
   * starve the open path's `setHeight` from ever firing if `maxHeightPx`
   * fluctuated during the delay). The actual fix was removing the
   * `requestAnimationFrame` delay from BOTH paths — plain synchronous
   * `setHeight` either way — so a toggle's closing and opening item
   * commit their new height in the same React render/paint cycle, keeping
   * their CSS transitions phase-aligned (same start frame, same duration,
   * same easing, exactly complementary targets) purely from the browser's
   * own CSS timing-function math. With that fixed, `0` is safe again as
   * the default (confirmed live: 0 non-monotonic frames and 0 gap frames
   * across the full transition) and is what "both must collapse and
   * expand at the same time" requires. `1` (or any value between) remains
   * a legitimate, supported value for an operator who wants a cosmetic
   * "let the collapse read as its own event first" sequencing — it no
   * longer risks the dead-gap bug either, since the two curves stay
   * complementary regardless of how much they overlap in time. */
  collapseLeadFraction: number;
  /** Duration of the `grid-template-rows` height expand/collapse itself —
   * shared with the desktop accordion's own resize transition
   * (`AbstractPostDock/components/View.tsx`'s `dockTransitionMs`);
   * `pages/about.tsx` copies this value into the `LiquidSliderConfig` it
   * builds for that engine, so one edit here retunes both. */
  transitionMs: number;
  /** `AbstractPostDockEasingPreset`, not `CtaButtonMotionEasing` — the
   * desktop accordion's own easing vocabulary, since this field now drives
   * both engines. */
  transitionEasing: AbstractPostDockEasingPreset;
  /** Forwarded to the desktop engine's own `dockContentSettleMs`
   * (`pages/about.tsx`'s `dockSliderConfig` memo) — not read by this mobile
   * component's own paragraph reveal, which uses `transitionMs`/
   * `transitionEasing` directly (PLAN-ABOUT-MOBILE-ACCORDION-COLLAPSE-
   * REVEAL-FIX.md's audit: the real desktop mechanism has no settle delay
   * either, so there's nothing here for the mobile side to mirror). `0`
   * means "wait exactly `transitionMs`," mirroring `View.tsx`'s own
   * fallback exactly (same shared field). */
  contentSettleMs: number;
  /** Duration of the disclosure affordance's own rotate transition —
   * deliberately its own knob, not tied to the two durations above: a
   * slow-rotating icon on a fast-opening row reads as lagging behind its
   * own action. */
  affordanceRotationDurationMs: number;
  affordanceRotationEasing: CtaButtonMotionEasing;
  /** Both visible border sides (top + right) at once, as a complete literal
   * Tailwind class combo — its own explicit "border thickness" knob. */
  affordanceBorderThicknessClassName: AffordanceBorderThicknessClass;
  /** Radius of the corner where those two borders meet. */
  affordanceCornerRadiusClassName: AffordanceCornerRadiusClass;
  /** Width + height of the affordance's icon box, before rotation — its
   * own explicit "dimension" knob, independent of border thickness. */
  affordanceDimensionClassName: AffordanceDimensionClass;
  /** Uniform padding on the preview tab itself (all four sides, one literal
   * Tailwind class — this repo's hard styling rule for discrete/spacing
   * config values). The tab lays the affordance out as the last child of a
   * `flex items-center` row, so vertical centering is automatic; because
   * the same padding value applies to every side, the affordance ends up
   * equidistant from the row's top edge and its right edge by construction,
   * not by coincidence. */
  affordancePadding: PaddingClass;
  /** Rotation while collapsed — points down (invites opening). */
  affordanceRotateCollapsedDeg: number;
  /** Rotation while expanded — points up (invites closing), a 180° flip
   * from the collapsed angle by default. */
  affordanceRotateExpandedDeg: number;
  affordanceColorMode: AboutMobileAccordionAffordanceColorMode;
  /** Only read while `affordanceColorMode === 'custom'`. */
  affordanceCustomColor: string;
  /** Opacity while hovering anywhere on the header row — same
   * enter-on-:hover/exit-on-base transition split
   * `AboutSlideNavControl`/`NavTriangleButton` already uses for its own
   * idle/hover opacity (about.module.css), not a new mechanism. Idle
   * opacity is never a field here: it's always `dimOpacity` (the row's own
   * non-highlighted-text opacity, passed in from the page), matching the
   * requirement that the chevron read as part of the row's own
   * non-highlighted text at rest. */
  affordanceHoverOpacity: number;
  /** Duration of the opacity transition when the pointer enters the
   * header row. */
  affordanceHoverTransitionMs: number;
  affordanceHoverEasing: CtaButtonMotionEasing;
  /** Duration of the opacity transition when the pointer leaves (or on
   * mount, before any hover has occurred). */
  affordanceMouseOutTransitionMs: number;
  affordanceMouseOutEasing: CtaButtonMotionEasing;
  /** 'derived' (default) or 'custom' — see AboutMobileAccordionColorMode's
   * own doc comment. Drives the accordion's own OUTER box edge only —
   * innerBorderColorMode below is the same choice for the row-divider
   * lines, fully independent. */
  outerBorderColorMode: AboutMobileAccordionColorMode;
  /** How much darker than `columnBackgroundColor` (the prop passed in from
   * the page) the accordion's own outer border renders while
   * `outerBorderColorMode` is 'derived' — 0..-1, additive on HSL lightness
   * (deriveSurfaceColor, helpers/surfaceColorDerivation.ts), matching every
   * other "derive from a base color" knob in this codebase (e.g.
   * CtaButtonConfig's own auto*LightenAmount fields) rather than a flat,
   * disconnected hex value that could drift from the background it needs
   * to read against. */
  outerBorderSurfaceOffset: number;
  /** Only read while `outerBorderColorMode === 'custom'`. */
  outerBorderCustomColor: string;
  /** The accordion's own outer box edge (all four sides), Tailwind's
   * literal `border-*` width scale (OUTER_BORDER_WIDTH_OPTIONS,
   * tailwindSpacingScale.ts) — `border-0` is a real, supported "no border
   * at all" choice on that same scale. */
  outerBorderWidthClassName: OuterBorderWidthClass;
  /** Same shape as outerBorderColorMode above, applied to the divider line
   * between stacked rows instead of the outer edge — fully independent
   * color from the outer border. */
  innerBorderColorMode: AboutMobileAccordionColorMode;
  /** Same derivation as outerBorderSurfaceOffset above, applied to the
   * row-divider lines while `innerBorderColorMode` is 'derived'. */
  innerBorderSurfaceOffset: number;
  /** Only read while `innerBorderColorMode === 'custom'`. */
  innerBorderCustomColor: string;
  /** Alpha applied to the divider line's own resolved color (whichever
   * innerBorderColorMode produced it — derived or custom), via
   * deriveTransparentTint (helpers/surfaceColorDerivation.ts) — the same
   * "fade this color, don't shift its hue/lightness" primitive
   * CardStack's own scrimOpacity-driven fields already use. 1 = fully
   * opaque (the divider's own resolved color exactly); 0 = fully
   * transparent (no visible divider, independent of
   * innerBorderWidthClassName — a operator can keep a nonzero width
   * reserved for layout while fading the line itself out). Outer border
   * has no equivalent field: this is deliberately divider-only, since a
   * fully transparent OUTER edge is already reachable via
   * outerBorderWidthClassName's own `border-0` option on the same
   * "0 is a real choice" scale. */
  innerBorderOpacity: number;
  /** The divider line between stacked rows, Tailwind's literal `divide-y-*`
   * width scale (INNER_BORDER_WIDTH_OPTIONS, tailwindSpacingScale.ts) —
   * `divide-y-0` is a real, supported "no divider at all" choice on that
   * same scale, independent of outerBorderWidthClassName above. */
  innerBorderWidthClassName: InnerBorderWidthClass;
  /** 'derived' (default) or 'custom' — see AboutMobileAccordionColorMode's
   * own doc comment. */
  textColorMode: AboutMobileAccordionColorMode;
  /** Same derivation as outerBorderSurfaceOffset above, applied to this
   * component's own row text (both the collapsed header preview and the
   * expanded paragraph) instead of the previous hardcoded `text-white`,
   * while `textColorMode` is 'derived'. */
  textSurfaceOffset: number;
  /** Only read while `textColorMode === 'custom'`. */
  textCustomColor: string;
};

export const DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG = {
  enabled: true,
  previewMinHeight: 'min-h-14',
  maxExpandedItems: 1,
  // Simultaneous close+open — safe now that AboutMobileAccordion.tsx
  // continuously reconciles every item's live height against the shared
  // budget (see collapseLeadFraction's own doc comment above for the
  // two-bug history this replaces).
  collapseLeadFraction: 0,
  transitionMs: 700,
  transitionEasing: 'settle',
  contentSettleMs: 0,
  affordanceRotationDurationMs: 550,
  affordanceRotationEasing: 'viscous',
  affordanceBorderThicknessClassName: 'border-t border-r',
  affordanceCornerRadiusClassName: 'rounded-tr-sm',
  affordanceDimensionClassName: 'w-2.5 h-2.5',
  affordancePadding: 'p-4',
  affordanceRotateCollapsedDeg: 135,
  affordanceRotateExpandedDeg: 90,
  affordanceColorMode: 'accent',
  affordanceCustomColor: '#ffffff',
  affordanceHoverOpacity: 0.9,
  affordanceHoverTransitionMs: 430,
  affordanceHoverEasing: 'standard',
  affordanceMouseOutTransitionMs: 320,
  affordanceMouseOutEasing: 'gentle',
  // 'custom' by default (operator ask, screenshot-reported: the 'derived'
  // offsets below read too light/washed-out against this page's own
  // typically light-toned mobile scroll-gradient background — darkening a
  // near-white reference color by even the full -1 offset still only
  // reaches a mid-gray, additive HSL-lightness derivation has no way to
  // reach a genuinely dark, high-contrast tone from a light starting
  // point). 'derived' remains available and fully configurable via the two
  // *SurfaceOffset fields below for an operator who wants border/text to
  // track the background automatically instead.
  outerBorderColorMode: 'custom',
  outerBorderSurfaceOffset: -0.35,
  outerBorderCustomColor: '#334155',
  outerBorderWidthClassName: 'border-0',
  innerBorderColorMode: 'custom',
  innerBorderSurfaceOffset: -0.35,
  innerBorderCustomColor: '#101e33',
  innerBorderOpacity: 0.16,
  innerBorderWidthClassName: 'divide-y',
  textColorMode: 'custom',
  textSurfaceOffset: -0.55,
  textCustomColor: '#0f1724',
} satisfies AboutMobileAccordionConfig;

const MOTION_EASINGS: ReadonlyArray<CtaButtonMotionEasing> = [
  'linear', 'standard', 'expressive', 'viscous', 'gentle',
];
const TRANSITION_EASINGS: ReadonlyArray<AbstractPostDockEasingPreset> = [
  'standard', 'soft-expo', 'viscous', 'settle', 'luxury',
];
const MIN_HEIGHT_VALUES = MIN_HEIGHT_OPTIONS.map(option => option.value);
const PADDING_VALUES = PADDING_OPTIONS.map(option => option.value);
const AFFORDANCE_BORDER_THICKNESS_VALUES = AFFORDANCE_BORDER_THICKNESS_OPTIONS.map(option => option.value);
const AFFORDANCE_CORNER_RADIUS_VALUES = AFFORDANCE_CORNER_RADIUS_OPTIONS.map(option => option.value);
const AFFORDANCE_DIMENSION_VALUES = AFFORDANCE_DIMENSION_OPTIONS.map(option => option.value);
const AFFORDANCE_COLOR_MODES: ReadonlyArray<AboutMobileAccordionAffordanceColorMode> = ['accent', 'custom'];
const COLOR_MODES: ReadonlyArray<AboutMobileAccordionColorMode> = ['derived', 'custom'];
const OUTER_BORDER_WIDTH_VALUES = OUTER_BORDER_WIDTH_OPTIONS.map(option => option.value);
const INNER_BORDER_WIDTH_VALUES = INNER_BORDER_WIDTH_OPTIONS.map(option => option.value);

const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);
const clampRange = (value: number, min: number, max: number, fallback: number) => (
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
);

export function normalizeAboutMobileAccordionConfig(
  config: Partial<AboutMobileAccordionConfig> | undefined,
): AboutMobileAccordionConfig {
  const base = { ...DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG, ...(config ?? {}) };
  const D = DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG;
  return {
    enabled: Boolean(base.enabled),
    previewMinHeight: token(base.previewMinHeight, MIN_HEIGHT_VALUES, D.previewMinHeight),
    maxExpandedItems: Number.isFinite(base.maxExpandedItems)
      ? Math.max(0, Math.round(base.maxExpandedItems))
      : D.maxExpandedItems,
    collapseLeadFraction: clampRange(base.collapseLeadFraction, 0, 1, D.collapseLeadFraction),
    transitionMs: clampRange(base.transitionMs, 100, 1600, D.transitionMs),
    transitionEasing: token(base.transitionEasing, TRANSITION_EASINGS, D.transitionEasing),
    contentSettleMs: clampRange(base.contentSettleMs, 0, 2000, D.contentSettleMs),
    affordanceRotationDurationMs: clampRange(
      base.affordanceRotationDurationMs, 60, 600, D.affordanceRotationDurationMs,
    ),
    affordanceRotationEasing: token(base.affordanceRotationEasing, MOTION_EASINGS, D.affordanceRotationEasing),
    affordanceBorderThicknessClassName: token(
      base.affordanceBorderThicknessClassName,
      AFFORDANCE_BORDER_THICKNESS_VALUES,
      D.affordanceBorderThicknessClassName,
    ),
    affordanceCornerRadiusClassName: token(
      base.affordanceCornerRadiusClassName, AFFORDANCE_CORNER_RADIUS_VALUES, D.affordanceCornerRadiusClassName,
    ),
    affordanceDimensionClassName: token(
      base.affordanceDimensionClassName, AFFORDANCE_DIMENSION_VALUES, D.affordanceDimensionClassName,
    ),
    affordancePadding: token(base.affordancePadding, PADDING_VALUES, D.affordancePadding),
    affordanceRotateCollapsedDeg: Number.isFinite(base.affordanceRotateCollapsedDeg)
      ? base.affordanceRotateCollapsedDeg
      : D.affordanceRotateCollapsedDeg,
    affordanceRotateExpandedDeg: Number.isFinite(base.affordanceRotateExpandedDeg)
      ? base.affordanceRotateExpandedDeg
      : D.affordanceRotateExpandedDeg,
    affordanceColorMode: token(base.affordanceColorMode, AFFORDANCE_COLOR_MODES, D.affordanceColorMode),
    affordanceCustomColor: typeof base.affordanceCustomColor === 'string' && base.affordanceCustomColor.length > 0
      ? base.affordanceCustomColor
      : D.affordanceCustomColor,
    affordanceHoverOpacity: clampRange(base.affordanceHoverOpacity, 0, 1, D.affordanceHoverOpacity),
    affordanceHoverTransitionMs: clampRange(
      base.affordanceHoverTransitionMs, 0, 1000, D.affordanceHoverTransitionMs,
    ),
    affordanceHoverEasing: token(base.affordanceHoverEasing, MOTION_EASINGS, D.affordanceHoverEasing),
    affordanceMouseOutTransitionMs: clampRange(
      base.affordanceMouseOutTransitionMs, 0, 1500, D.affordanceMouseOutTransitionMs,
    ),
    affordanceMouseOutEasing: token(base.affordanceMouseOutEasing, MOTION_EASINGS, D.affordanceMouseOutEasing),
    outerBorderColorMode: token(base.outerBorderColorMode, COLOR_MODES, D.outerBorderColorMode),
    outerBorderSurfaceOffset: clampRange(base.outerBorderSurfaceOffset, -1, 0, D.outerBorderSurfaceOffset),
    outerBorderCustomColor:
      typeof base.outerBorderCustomColor === 'string' && base.outerBorderCustomColor.length > 0
        ? base.outerBorderCustomColor
        : D.outerBorderCustomColor,
    outerBorderWidthClassName: token(
      base.outerBorderWidthClassName, OUTER_BORDER_WIDTH_VALUES, D.outerBorderWidthClassName,
    ),
    innerBorderColorMode: token(base.innerBorderColorMode, COLOR_MODES, D.innerBorderColorMode),
    innerBorderSurfaceOffset: clampRange(base.innerBorderSurfaceOffset, -1, 0, D.innerBorderSurfaceOffset),
    innerBorderCustomColor:
      typeof base.innerBorderCustomColor === 'string' && base.innerBorderCustomColor.length > 0
        ? base.innerBorderCustomColor
        : D.innerBorderCustomColor,
    innerBorderOpacity: clampRange(base.innerBorderOpacity, 0, 1, D.innerBorderOpacity),
    innerBorderWidthClassName: token(
      base.innerBorderWidthClassName, INNER_BORDER_WIDTH_VALUES, D.innerBorderWidthClassName,
    ),
    textColorMode: token(base.textColorMode, COLOR_MODES, D.textColorMode),
    textSurfaceOffset: clampRange(base.textSurfaceOffset, -1, 0, D.textSurfaceOffset),
    textCustomColor: typeof base.textCustomColor === 'string' && base.textCustomColor.length > 0
      ? base.textCustomColor
      : D.textCustomColor,
  };
}
