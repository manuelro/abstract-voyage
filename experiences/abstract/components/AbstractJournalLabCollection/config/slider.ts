import {
  ABSTRACT_POST_DOCK_EASING_PRESET_CSS,
  type AbstractPostDockEasingPreset,
} from '../../AbstractPostDock/config/registered';
import {
  MARGIN_BOTTOM_OPTIONS,
  type MarginBottomClass,
} from '../../../../../components/tailwindSpacingScale';

/**
 * 'grid' (default): today's untouched, uncapped multi-row scatter layout —
 * every article/lab renders, byte-identical to the component's original
 * behavior. 'slider': an opt-in, physics-driven, draggable single row
 * capped at `groupSize * groupCount` items per view, with a "View all" CTA
 * that reveals once the drag position crosses into the second group.
 */
export type AbstractJournalLabCollectionLayoutMode = 'grid' | 'slider';

export type AbstractJournalLabCollectionSliderConfig = {
  layoutMode: AbstractJournalLabCollectionLayoutMode;

  /** Cards visible at once (per view) on wide/desktop viewports. */
  wideGroupSize: number;
  /** Cards visible at once (per view) on narrow/mobile viewports. */
  narrowGroupSize: number;
  /** Number of groups reachable by dragging — total cap per view is
   * groupSize * groupCount (default 4 * 2 = 8). Shared by both breakpoints:
   * only the per-group card count differs, not how many groups exist. */
  groupCount: number;

  /** Swiper progress (0..1) at which "View all" reveals, on wide viewports. */
  wideViewAllThreshold: number;
  /** Swiper progress (0..1) at which "View all" reveals, on narrow viewports. */
  narrowViewAllThreshold: number;

  /** Viewport width, in px, below which the narrow group size/threshold
   * apply instead of the wide ones. An independent, self-owned value —
   * this component's own layout knobs (e.g. AbstractPostDockLayoutConfig)
   * already each carry their own breakpoint rather than importing a
   * page-level constant, so this follows the same established pattern. */
  narrowBreakpointPx: number;

  /** Swiper resistanceRatio — how much the drag is allowed to overshoot past
   * the first/last card while still touched (0 = hard clamp at the edge,
   * no overshoot at all; 1 = follows the finger 1:1 past the edge, no
   * resistance). Defaults to 0 deliberately, not merely "tight": Swiper's
   * own `freeMode` touch-end handling (`modules/free-mode.mjs`) has a
   * verified edge-case where, if the touch position at release is still
   * overshot past the first slide's boundary (`currentPos < -minTranslate()`
   * — reachable at ANY `dragResistance > 0`, since resistance only damps
   * overshoot, it never prevents it), it calls `swiper.slideTo(activeIndex)`
   * instead of explicitly slide 0 — if `activeIndex` hasn't yet updated to
   * 0 at that exact moment (plausible on a fast "flick back to start"),
   * the slider snaps to the wrong card instead of the first one. `0` makes
   * that overshoot mathematically unreachable (`(...) ** 0 === 1`, per the
   * same file's resistance formula), removing the precondition entirely
   * rather than papering over the symptom. */
  dragResistance: number;
  /** Swiper freeMode.momentum — enables inertial coasting after release. */
  dragMomentumEnabled: boolean;
  /** Swiper freeMode.momentumRatio — momentum travel distance multiplier. */
  dragMomentumRatio: number;
  /** Swiper freeMode.momentumVelocityRatio — release-velocity multiplier
   * feeding the momentum distance/duration calculation. */
  dragMomentumVelocityRatio: number;
  /** Swiper speed (ms) — the snap/settle transition duration once freeMode's
   * momentum decays and `sticky` commits to the nearest single card. Uses
   * `freeMode` deliberately: continuous free drag throughout the gesture,
   * settling only once motion actually stops — not a forced per-group jump.
   * `slidesPerGroup` is kept at 1 (Swiper's own default) specifically so
   * every individual card is a valid snap point, not just every Nth one —
   * `snapGrid` (what `sticky` snaps against) only contains slides where
   * `index % slidesPerGroup === 0`, confirmed by reading Swiper's own core
   * (`shared/swiper-core.mjs`, `updateSlides`). */
  snapSpeedMs: number;
  /** Reuses AbstractPostDock's shared CSS easing preset vocabulary for the
   * snap/settle transition, instead of a parallel enum. */
  snapEasing: AbstractPostDockEasingPreset;

  /** Duration of the whole-slider opacity cross-fade used when switching
   * Articles/Labs while the slider is scrolled away from its rest position
   * — fades the current (stale-position) slider out, resets to the first
   * card, then fades the new view's slider in. Skipped entirely when the
   * slider is already at rest, where the per-card flip/hue-fade transition
   * (the existing "Journal / labs transition" config) is enough on its own. */
  viewSwitchFadeDurationMs: number;
  /** Easing for the view-switch cross-fade above — reuses the same shared
   * CSS easing preset vocabulary as `snapEasing`. */
  viewSwitchFadeEasing: AbstractPostDockEasingPreset;

  /** Space reserved below the slider (or the grid field, in 'grid' mode) —
   * a literal Tailwind margin-bottom class (Tailwind-only styling rule),
   * reusing the same MARGIN_BOTTOM_OPTIONS scale other spacing fields in
   * this codebase already use, instead of a raw px/rem number. */
  bottomSpacingClass: MarginBottomClass;

  // No separate gap field: the slide gap reuses layoutConfig.columnGapPx —
  // the same knob 'grid' mode already gets its own gap from — so the two
  // modes' resting-state geometry stays identical by construction (one
  // shared source of truth) instead of by two independently configured
  // values that merely default to matching numbers.
};

export const DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG = {
  layoutMode: 'slider',
  wideGroupSize: 4,
  narrowGroupSize: 2,
  groupCount: 2,
  wideViewAllThreshold: 0.5,
  narrowViewAllThreshold: 0.5,
  narrowBreakpointPx: 1180,
  dragResistance: 0,
  dragMomentumEnabled: true,
  dragMomentumRatio: 1,
  dragMomentumVelocityRatio: 1,
  snapSpeedMs: 420,
  snapEasing: 'soft-expo',
  viewSwitchFadeDurationMs: 260,
  viewSwitchFadeEasing: 'soft-expo',
  bottomSpacingClass: 'mb-16',
} satisfies AbstractJournalLabCollectionSliderConfig;

const LAYOUT_MODE_VALUES = new Set<AbstractJournalLabCollectionLayoutMode>([
  'grid',
  'slider',
]);

const EASING_VALUES = new Set<AbstractPostDockEasingPreset>(
  Object.keys(ABSTRACT_POST_DOCK_EASING_PRESET_CSS) as AbstractPostDockEasingPreset[],
);

const MARGIN_BOTTOM_VALUES = new Set<MarginBottomClass>(
  MARGIN_BOTTOM_OPTIONS.map(option => option.value),
);

const finiteOr = (value: number | undefined, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function normalizeAbstractJournalLabCollectionSliderConfig(
  config?: Partial<AbstractJournalLabCollectionSliderConfig> | null,
): AbstractJournalLabCollectionSliderConfig {
  const base = {
    ...DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG,
    ...(config ?? {}),
  };

  return {
    layoutMode: LAYOUT_MODE_VALUES.has(base.layoutMode)
      ? base.layoutMode
      : DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG.layoutMode,
    wideGroupSize: Math.round(clamp(
      finiteOr(
        base.wideGroupSize,
        DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG.wideGroupSize,
      ),
      1,
      8,
    )),
    narrowGroupSize: Math.round(clamp(
      finiteOr(
        base.narrowGroupSize,
        DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG.narrowGroupSize,
      ),
      1,
      8,
    )),
    groupCount: Math.round(clamp(
      finiteOr(
        base.groupCount,
        DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG.groupCount,
      ),
      1,
      4,
    )),
    wideViewAllThreshold: clamp(
      finiteOr(
        base.wideViewAllThreshold,
        DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG.wideViewAllThreshold,
      ),
      0,
      1,
    ),
    narrowViewAllThreshold: clamp(
      finiteOr(
        base.narrowViewAllThreshold,
        DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG.narrowViewAllThreshold,
      ),
      0,
      1,
    ),
    narrowBreakpointPx: Math.round(clamp(
      finiteOr(
        base.narrowBreakpointPx,
        DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG.narrowBreakpointPx,
      ),
      320,
      2400,
    )),
    dragResistance: clamp(
      finiteOr(
        base.dragResistance,
        DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG.dragResistance,
      ),
      0,
      1,
    ),
    dragMomentumEnabled: Boolean(base.dragMomentumEnabled),
    dragMomentumRatio: clamp(
      finiteOr(
        base.dragMomentumRatio,
        DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG.dragMomentumRatio,
      ),
      0.1,
      3,
    ),
    dragMomentumVelocityRatio: clamp(
      finiteOr(
        base.dragMomentumVelocityRatio,
        DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG.dragMomentumVelocityRatio,
      ),
      0.1,
      3,
    ),
    snapSpeedMs: Math.round(clamp(
      finiteOr(
        base.snapSpeedMs,
        DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG.snapSpeedMs,
      ),
      120,
      1200,
    )),
    snapEasing: EASING_VALUES.has(base.snapEasing)
      ? base.snapEasing
      : DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG.snapEasing,
    viewSwitchFadeDurationMs: Math.round(clamp(
      finiteOr(
        base.viewSwitchFadeDurationMs,
        DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG.viewSwitchFadeDurationMs,
      ),
      0,
      1500,
    )),
    viewSwitchFadeEasing: EASING_VALUES.has(base.viewSwitchFadeEasing)
      ? base.viewSwitchFadeEasing
      : DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG.viewSwitchFadeEasing,
    bottomSpacingClass: MARGIN_BOTTOM_VALUES.has(base.bottomSpacingClass)
      ? base.bottomSpacingClass
      : DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG.bottomSpacingClass,
  };
}
