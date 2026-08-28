import type { CtaButtonMotionEasing } from '../../../components/CtaButton/config/registered';
import type { AbstractPostDockEasingPreset } from '../../abstract/components/AbstractPostDock/config/registered';
import {
  MIN_HEIGHT_OPTIONS,
  PADDING_OPTIONS,
  AFFORDANCE_BORDER_THICKNESS_OPTIONS,
  AFFORDANCE_CORNER_RADIUS_OPTIONS,
  AFFORDANCE_DIMENSION_OPTIONS,
  type MinHeightClass,
  type PaddingClass,
  type AffordanceBorderThicknessClass,
  type AffordanceCornerRadiusClass,
  type AffordanceDimensionClass,
} from '../../../components/tailwindSpacingScale';

/** 'accent' derives the affordance's border color from the row's own
 * resolved accent/text color (the same "derive, don't invent a new color"
 * convention `navControlIdleColor` already follows in `pages/about.tsx`) —
 * 'custom' exposes an independent color field for an operator who wants the
 * affordance to stand apart from its row. */
export type AboutMobileAccordionAffordanceColorMode = 'accent' | 'custom';

/**
 * PLAN-ABOUT-MOBILE-ACCORDION.md — the mobile (below-md) replacement for
 * `AboutMobileCardStack` on `/about`. Component-owned config: interaction/
 * geometry knobs for `AboutMobileAccordion`/`AboutMobileAccordionItem`
 * themselves, not page-composition decisions (contrast
 * `AboutMobileCardStackConfig`, which stayed in `pages/about.config.ts`
 * because that component takes its whole appearance as props). No color or
 * gradient field lives here on purpose — the accordion's background reuses
 * the page's own `dockPaletteConfig`/`dockSliderConfig` verbatim, so colors
 * and color config stay identical to the desktop accordion by construction,
 * never a second, divergent source of truth.
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
   * Purely cosmetic sequencing — has no effect when nothing is being
   * evicted (e.g. the first item ever opened, or `maxExpandedItems: 0`
   * with room to spare). */
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
};

export const DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG = {
  enabled: true,
  previewMinHeight: 'min-h-20',
  maxExpandedItems: 1,
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
  affordanceRotateExpandedDeg: -45,
  affordanceColorMode: 'accent',
  affordanceCustomColor: '#ffffff',
  affordanceHoverOpacity: 0.9,
  affordanceHoverTransitionMs: 430,
  affordanceHoverEasing: 'standard',
  affordanceMouseOutTransitionMs: 320,
  affordanceMouseOutEasing: 'gentle',
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
  };
}
