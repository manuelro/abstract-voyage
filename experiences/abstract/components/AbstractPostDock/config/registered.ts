import type {
  MagnificationDockRevealDistribution,
  MagnificationDockRevealMode,
} from '../../../../../helpers/magnificationDockRevealMath';
import type { MagnificationDockDimmingEasing } from '../../../../../components/MagnificationDock';
import { clamp } from '../../../../../components/mathUtils';
import type { CtaButtonRadius } from '../../../../../components/CtaButton/config/registered';
import type { PointerProximityEasing } from '../../../../../helpers/pointerProximity';
import type {
  HologramSweepEnvelopeShape,
  HologramSweepGeometry,
} from '../../../../../helpers/hologramExciteSweep';
import type {
  PaddingTopClass,
  PaddingTopWideClass,
  PaddingTopLgClass,
  PaddingRightClass,
  PaddingRightWideClass,
  PaddingRightLgClass,
  PaddingBottomClass,
  PaddingBottomWideClass,
  PaddingBottomLgClass,
  PaddingLeftClass,
  PaddingLeftWideClass,
  PaddingLeftLgClass,
} from '../../../../../components/tailwindSpacingScale';

export type AbstractPostDockEasingPreset =
  | 'standard'
  | 'soft-expo'
  | 'viscous'
  | 'settle'
  | 'luxury';

// The one CSS mapping every reveal/transition timing in this file resolves
// through — lives here (not on the .tsx side) so both AbstractPostDock.tsx
// (slider/deck reveal) and AbstractPostDockScatter.tsx (scattered/grid
// reveal) can import it without one importing the other back.
export const ABSTRACT_POST_DOCK_EASING_PRESET_CSS: Record<AbstractPostDockEasingPreset, string> = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  'soft-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
  viscous: 'cubic-bezier(0.22, 1, 0.36, 1)',
  settle: 'cubic-bezier(0.25, 0.9, 0.2, 1)',
  luxury: 'cubic-bezier(0.19, 1, 0.22, 1)',
};

export function resolveAbstractPostDockEasing(preset: AbstractPostDockEasingPreset): string {
  return ABSTRACT_POST_DOCK_EASING_PRESET_CSS[preset] ?? ABSTRACT_POST_DOCK_EASING_PRESET_CSS['soft-expo'];
}

export type AbstractPostDockIntroductionConfig = {
  enabled: boolean;
  mode: MagnificationDockRevealMode;
  overlapMs: number;
  firstDelayMs: number;
  durationMs: number;
  staggerMs: number;
  easing: AbstractPostDockEasingPreset;
  distribution: MagnificationDockRevealDistribution;
  cadenceAmount: number;
  /** Slider/deck mode only: horizontal entrance offset (vw, relative to the
   * dock's own container width) — negative enters from the left. */
  offsetXVw: number;
  /** Scattered/grid mode only: vertical entrance travel, as a percentage of
   * the card's own height — cards start this far below their resting
   * position and rise up into place. The scattered-mode analogue of
   * offsetXVw, which only makes sense for the horizontal slider/deck. Each
   * card also gets a brief tilt + hologram "excite" (peaking mid-rise,
   * settled by arrival) driven by this same schedule — not a separate knob,
   * it reuses the card's own tiltMaxDegrees/hologram config for its
   * strength, so tuning those tunes the excite too. */
  offsetYPercent: number;
};

export type AbstractPostDockGradientActivityPolicy = 'active-only' | 'all' | 'static';

export type AbstractPostDockGradientPerformanceConfig = {
  activityPolicy: AbstractPostDockGradientActivityPolicy;
  /** Narrow/touch dock override — when set, wins over `activityPolicy`
   * whenever the dock is in its narrow presentation (see `isNarrowDock` in
   * View.tsx, the only place this is consulted). Optional and unset by
   * default so existing callers (`about.tsx`, `slider.tsx`) see zero
   * behavior change; only a caller that opts in (e.g. `abstract.tsx`
   * setting this to `'static'` for a fully static narrow gradient) is
   * affected. */
  activityPolicyNarrow?: AbstractPostDockGradientActivityPolicy;
  pauseWhenOffscreen: boolean;
};

export const DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG = {
  enabled: true,
  mode: 'stagger',
  overlapMs: 0,
  firstDelayMs: 240,
  durationMs: 540,
  staggerMs: 140,
  easing: 'viscous',
  distribution: 'gaussian',
  cadenceAmount: 1,
  offsetXVw: -10,
  offsetYPercent: 5,
} satisfies AbstractPostDockIntroductionConfig;

export const DEFAULT_ABSTRACT_POST_DOCK_GRADIENT_PERFORMANCE_CONFIG = {
  activityPolicy: 'active-only',
  pauseWhenOffscreen: true,
  activityPolicyNarrow: 'static',
} satisfies AbstractPostDockGradientPerformanceConfig;

/**
 * Opt-in alternate presentation for wide viewports: instead of one active
 * slide in the horizontal dock, every item renders at once as an
 * individually-rotated 3:4 card scattered across a jittered grid, page
 * scroll growing to fit them. Narrow viewports always keep the existing
 * dock/deck behavior regardless of this setting — see `isNarrowDock` in
 * AbstractPostDock.tsx.
 */
export type AbstractPostDockLayoutMode = 'slider' | 'scattered';

/**
 * Scattered mode's card placement strategy. 'randomized' (default) places
 * each row's cards with a bounded jitter around their slot — enough freedom
 * to read as tossed, not gridded, while the jitter range itself (see
 * `columnJitterPercent`/`rowJitterPercent`) is sized so neighbours can never
 * reach each other, rotation included. That's a structural guarantee, not a
 * checked one — there's no rejection-sampling/fallback-scan machinery left
 * to run out of luck the way the old dart-throwing approach could. 'grid' is
 * the opt-in alternative — zero jitter, a plain predictable one-card-per-cell
 * ordering, for when a legible reading order matters more than the scattered
 * look.
 */
export type AbstractPostDockScatterDistribution = 'randomized' | 'grid';

/** Slider mode only: axis the active-card magnification travels along.
 * 'horizontal' (default) is today's behavior — zero change unless opted in.
 * MagnificationDock (the primitive this renders through) already has full
 * vertical-axis support; enabling this only changes which prop combination
 * AbstractPostDock.tsx passes it (see the render branch in that file). */
export type AbstractPostDockSliderOrientation = 'horizontal' | 'vertical';

/** Slider minimal mode only — Tailwind's own text-size scale (a literal
 * class, never a raw px/rem number: see the repo's Tailwind-only styling
 * rule for spacing/font-size fields). */
export type AbstractPostDockMinimalTextSize =
  | 'text-sm'
  | 'text-base'
  | 'text-lg'
  | 'text-xl'
  | 'text-2xl'
  | 'text-3xl'
  | 'text-4xl';

/** Same scale as `AbstractPostDockMinimalTextSize`, `md:`-prefixed — applied
 * ≥ 768px (the panel's own TABLET tab). */
export type AbstractPostDockMinimalTextSizeWide =
  | 'md:text-sm'
  | 'md:text-base'
  | 'md:text-lg'
  | 'md:text-xl'
  | 'md:text-2xl'
  | 'md:text-3xl'
  | 'md:text-4xl';

/** Same scale, `lg:`-prefixed — applied ≥ 1024px (the panel's own DESKTOP
 * tab). */
export type AbstractPostDockMinimalTextSizeLg =
  | 'lg:text-sm'
  | 'lg:text-base'
  | 'lg:text-lg'
  | 'lg:text-xl'
  | 'lg:text-2xl'
  | 'lg:text-3xl'
  | 'lg:text-4xl';

/** Slider minimal mode only — Tailwind's own max-width scale (a literal
 * class, same Tailwind-only rule as the font-size field above). Bounds a
 * slide's own line length to a readable measure rather than letting it run
 * the slide's full (often very wide) rendered width. */
export type AbstractPostDockMinimalTextMaxWidth =
  | 'max-w-sm'
  | 'max-w-md'
  | 'max-w-lg'
  | 'max-w-xl'
  | 'max-w-2xl'
  | 'max-w-prose'
  | 'max-w-none';

export type AbstractPostDockLayoutConfig = {
  /** 'slider' (default) is today's dock/deck — zero change unless opted in. */
  mode: AbstractPostDockLayoutMode;
  /** Slider mode only. See AbstractPostDockSliderOrientation. */
  orientation: AbstractPostDockSliderOrientation;
  /** Scattered mode: each card's wrapper width in px; height is width * 4/3. */
  cardWidthPx: number;
  /** Scattered mode: horizontal gap between a row's slots, in px — also the
   * basis `columnJitterPercent` wanders within. */
  columnGapPx: number;
  /** Scattered mode: vertical distance between row baselines, in px — also
   * the basis `rowJitterPercent` wanders within. */
  rowGapPx: number;
  /** Scattered mode: symmetric ± range for each card's static resting rotation. */
  maxRotationDeg: number;
  /** Scattered mode: how cards are placed within the field. */
  distribution: AbstractPostDockScatterDistribution;
  /** Randomized distribution only: how far a card may wander horizontally
   * from its slot's center, as a percentage of the safe half-gap (the gap
   * remaining after `maxRotationDeg`'s worst-case footprint growth is
   * reserved) — 100% uses the full safe range, 0% is slot-locked. */
  columnJitterPercent: number;
  /** Randomized distribution only: same, vertically within the row. */
  rowJitterPercent: number;
  /** Scattered mode: how far the first row extends upward past the field's
   * own top edge, as a percentage of one card's height — reads as the deck
   * peeking up from behind the heading that sits just above it (see
   * pages/abstract.tsx's FiberHeading instance) rather than starting neatly
   * below it. Clamped to 20% max. */
  topPeekPercent: number;
  /** Space (in px) between the hero section and the heading that follows it
   * (see pages/abstract.tsx's FiberHeading instance above the cards) —
   * replaces a fixed margin that used to push the heading (and everything
   * riding above it via `topPeekPercent`) below the hero section's own
   * reserved above-the-fold sliver, hiding the peek entirely. 0 lets the
   * heading sit right at that sliver's edge, fully restoring the peek; raise
   * it to push the journal section back below the fold like an ordinary
   * section break. */
  headingOffsetPx: number;
  /** Opt-in, both scattered and slider mode: replaces the real article
   * content with a flat presentation instead of ArticleCard's gradient
   * canvas. Scattered mode renders an empty rectangle (the Editorial Hero's
   * surface color) — position, rotation, and lift/shadow physics unchanged,
   * only the visible content stripped. Slider mode instead renders each
   * item's own accent color as a solid background with its title shown
   * large over it — a slider only ever shows one active slide plus a couple
   * of peeks, so (unlike scattered mode's many small cards) a fully empty
   * slide would read as broken rather than restrained. */
  minimalModeEnabled: boolean;
  /** Slider mode's own minimal branch only: replaces the flat accent-color
   * background with the same dynamic procedural gradient (LiquidGradientAdapter,
   * the WebGL canvas the non-minimal ArticleCard branch already uses) —
   * still one independent canvas per slide, but with the palette's 'window'
   * mode driving a shared-field, index-offset relationship between them (see
   * AbstractPostDockPaletteConfig), so the collection reads as one
   * continuous gradient sliced across the slides rather than unrelated flat
   * colors. Off keeps minimal mode's original flat `item.accent` fill. */
  minimalModeGradientEnabled: boolean;
  /** Slider minimal mode only: font size for every slide's title text (both
   * active and inactive render at the same size — only opacity/visibility
   * differs between them, see minimalModeTextDimOpacity). Tiered by
   * breakpoint (operator ask) — same MOBILE/TABLET/DESKTOP tabbed
   * device-size switcher `gradientScale`/`gradientNoise` above already use;
   * this field is the mobile/base tier. Note this branch itself never
   * renders below 768px (narrow viewports route to AbstractDeckSwiper
   * instead, see minimalModeContentPaddingTop's own doc comment below), so
   * this tier's practical effect is "the floor `Wide`/`Lg` inherit from
   * unless they override it" rather than a true mobile-only value — kept
   * as its own tier anyway for the same tab-shape consistency the
   * gradient fields already established, and because Tailwind's own
   * mobile-first cascade needs an unprefixed base class regardless. */
  minimalModeFontSize: AbstractPostDockMinimalTextSize;
  /** Same as `minimalModeFontSize` above, `md:`-prefixed — applied ≥ 768px. */
  minimalModeFontSizeWide: AbstractPostDockMinimalTextSizeWide;
  /** Same as `minimalModeFontSize` above, `lg:`-prefixed — applied ≥ 1024px. */
  minimalModeFontSizeLg: AbstractPostDockMinimalTextSizeLg;
  /** Slider minimal mode only: opacity for a slide's title text outside
   * `**emphasized**` runs, while active. Inactive slides are fully hidden
   * (opacity 0) regardless of this value — see minimalModeTextEmphasisOpacity
   * for the emphasized-run opacity. */
  minimalModeTextDimOpacity: number;
  /** Slider minimal mode only: opacity for `**emphasized**` runs within a
   * slide's title text — should read as brighter/more legible than the
   * surrounding dimmed text (minimalModeTextDimOpacity). */
  minimalModeTextEmphasisOpacity: number;
  /** Slider minimal mode only: caps a slide's title text to a readable line
   * length instead of letting it run the slide's full rendered width. */
  minimalModeTextMaxWidth: AbstractPostDockMinimalTextMaxWidth;
  /** Slider minimal mode only: the slide's own content padding, per side —
   * four independent literal Tailwind classes, tiered by breakpoint the
   * same MOBILE/TABLET/DESKTOP way `minimalModeFontSize` above is (see that
   * field's own doc comment on why the "mobile" tier is a floor rather
   * than a true mobile-only value: narrow viewports route to the deck's
   * own AbstractDeckSwiper presentation entirely, with its own unrelated
   * inset config). Supersedes an earlier single `minimalModeContentPadding`
   * uniform-all-sides field. */
  minimalModeContentPaddingTop: PaddingTopClass;
  minimalModeContentPaddingRight: PaddingRightClass;
  minimalModeContentPaddingBottom: PaddingBottomClass;
  minimalModeContentPaddingLeft: PaddingLeftClass;
  /** Same as the four fields above, `md:`-prefixed — applied ≥ 768px. */
  minimalModeContentPaddingTopWide: PaddingTopWideClass;
  minimalModeContentPaddingRightWide: PaddingRightWideClass;
  minimalModeContentPaddingBottomWide: PaddingBottomWideClass;
  minimalModeContentPaddingLeftWide: PaddingLeftWideClass;
  /** Same as the four fields above, `lg:`-prefixed — applied ≥ 1024px. */
  minimalModeContentPaddingTopLg: PaddingTopLgClass;
  minimalModeContentPaddingRightLg: PaddingRightLgClass;
  minimalModeContentPaddingBottomLg: PaddingBottomLgClass;
  minimalModeContentPaddingLeftLg: PaddingLeftLgClass;
  /** Scattered mode: shows the excerpt below the title. Defaults to true —
   * the excerpt element still renders and reserves its own layout space
   * either way, so the title's own position within the card never shifts
   * when this (or `descriptionHoverReveal`) is toggled. */
  descriptionVisible: boolean;
  /** Scattered mode, only meaningful when `descriptionVisible` is true:
   * hides the excerpt until the card itself is hovered or focused, fading
   * it in/out with the same easing/duration as the "Read article" CTA's own
   * hover reveal — rather than the excerpt being permanently shown. Off
   * reads as always-visible, matching `descriptionVisible`'s plain
   * semantics on its own. */
  descriptionHoverReveal: boolean;
  /** Card corner radius — reuses CtaButton's Tailwind radius tokens rather
   * than a parallel set of literals. Applies to scattered mode's grid AND
   * the narrow/touch deck (AbstractDeckSwiper), independent of `mode` —
   * the two aren't mutually exclusive (deck is a viewport-width fallback,
   * not a `mode` value), so this one field governs both presentations'
   * cards rather than each having its own radius knob. */
  cardRadius: CtaButtonRadius;
  /** Narrow/touch deck (AbstractDeckPager, and AbstractDeckSwiper if that
   * mode is selected): visible separation between the active card and its
   * peeking neighbors, in px. A sibling of `peekPx`'s own derivation
   * (`dockMobilePeekRem` in the shared LiquidSliderConfig) — a plain px
   * number rather than a Tailwind `gap-*` class, because it isn't a real
   * CSS gap at all: these cards are positioned via imperative translate3d
   * math (Swiper `virtualTranslate`), not CSS flex/grid flow, so there's no
   * literal Tailwind utility this could ever bind to. Eats into the
   * existing peek margin rather than shrinking the active card's own
   * width — raising this shows less of each neighbor, not a narrower
   * active card. Not scattered mode: that presentation already has its own
   * `columnGapPx`/`rowGapPx`. */
  peekGapPx: number;
  /** Narrow/touch deck (AbstractDeckPager) only: whether peeking neighbor
   * cards get dimmed toward black as they recede from the active card. Off
   * by default — the darkening read as a hard, unwanted brightness edge
   * right at the card seam. Only gates whether it applies at all; the
   * existing `dockNarrowDistanceDimmingMaxOpacity` (LiquidSliderConfig)
   * still controls how dark, unchanged, for whenever this is turned on. */
  peekDimmingEnabled: boolean;
};

export const DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG = {
  mode: 'slider',
  orientation: 'vertical',
  cardWidthPx: 344,
  columnGapPx: 88,
  rowGapPx: 128,
  maxRotationDeg: 0,
  distribution: 'grid',
  columnJitterPercent: 70,
  rowJitterPercent: 70,
  topPeekPercent: 20,
  headingOffsetPx: 0,
  minimalModeEnabled: true,
  minimalModeGradientEnabled: true,
  minimalModeFontSize: 'text-3xl',
  minimalModeFontSizeWide: 'md:text-3xl',
  minimalModeFontSizeLg: 'lg:text-3xl',
  minimalModeTextDimOpacity: 0.45,
  minimalModeTextEmphasisOpacity: 0.95,
  minimalModeTextMaxWidth: 'max-w-prose',
  minimalModeContentPaddingTop: 'pt-8',
  minimalModeContentPaddingRight: 'pr-8',
  minimalModeContentPaddingBottom: 'pb-8',
  minimalModeContentPaddingLeft: 'pl-8',
  minimalModeContentPaddingTopWide: 'md:pt-8',
  minimalModeContentPaddingRightWide: 'md:pr-8',
  minimalModeContentPaddingBottomWide: 'md:pb-8',
  minimalModeContentPaddingLeftWide: 'md:pl-8',
  minimalModeContentPaddingTopLg: 'lg:pt-8',
  minimalModeContentPaddingRightLg: 'lg:pr-8',
  minimalModeContentPaddingBottomLg: 'lg:pb-8',
  minimalModeContentPaddingLeftLg: 'lg:pl-8',
  descriptionVisible: true,
  descriptionHoverReveal: true,
  cardRadius: 'rounded-2xl',
  peekGapPx: 8,
  peekDimmingEnabled: false,
} satisfies AbstractPostDockLayoutConfig;

/**
 * How far (in px) scattered mode's first row rides up past its own
 * container's top edge — the exact formula `useScatterLayout` (in
 * AbstractPostDockScatter.tsx) applies as that container's negative
 * margin-top. Exported so a caller placing content directly above the deck
 * (e.g. pages/abstract.tsx's JOURNAL heading, sitting flush above the
 * embedded-variant deck with no gap of its own) can reserve exactly this
 * much clearance beforehand and cancel the peek out before it ever reaches
 * that content — one formula, so the reserved clearance can never drift out
 * of sync with what the deck itself actually rides up by.
 */
export function computeAbstractPostDockTopPeekPx(
  layoutConfig: Pick<AbstractPostDockLayoutConfig, 'cardWidthPx' | 'topPeekPercent'>,
): number {
  const cardWidthPx = clamp(layoutConfig.cardWidthPx, 160, 480);
  const cardHeightPx = cardWidthPx * (4 / 3);
  return cardHeightPx * clamp(layoutConfig.topPeekPercent, 0, 20) / 100;
}

/**
 * Ties each card's own gradient to its own tilt signal, so interacting with
 * a card reads as light catching a holographic/foil surface rather than a
 * flat rectangle. This config only controls how strongly a tilt signal is
 * translated into the gradient's own offset/hue/saturation/brightness, not
 * how that signal itself is produced — the two device classes derive it
 * differently:
 * - Scattered mode, pointer devices: the card's existing hover-tilt signal
 *   (the same proximity/x/y that already drives rotateX/rotateY via
 *   useCardLiftPhysics → usePointerProximity, which deliberately excludes
 *   touch pointers — unchanged by this config).
 * - Narrow/touch deck (AbstractDeckSwiper): a separate, drag-derived signal
 *   — the two cards currently interpolating between rest positions during a
 *   swipe — since touch has no hover/proximity phase to sample from. See
 *   DeckSwiper.tsx's own top-of-file comment.
 */
export type AbstractPostDockHologramConfig = {
  enabled: boolean;
  /** Strength of the gradient pan driven by tilt (0 disables the
   * displacement only, leaving colour response intact). */
  offsetGain: number;
  /** Max hue rotation at full tilt — same unit (fraction of the hue wheel)
   * as the dock's own `shaderColorHueOffset`, so it sits on the same scale
   * as a knob already in this panel rather than introducing a new one. */
  hueShiftAmount: number;
  /** Extra saturation at full tilt. */
  saturationBoost: number;
  /** Extra brightness at full tilt — the "catching the light" flash. */
  brightnessBoost: number;
  /** Shapes tilt magnitude before it drives the gradient response — reuses
   * the same easing vocabulary already used for the tilt/lift physics
   * itself, rather than a bespoke curve type. */
  responseEasing: PointerProximityEasing;
  /** Opt-in: smooths the hologram's response strength toward its live
   * proximity-derived target with an attack/release envelope (reusing
   * CtaButton's own `proximityAttackMs`/`proximityReleaseMs` — the same
   * constants already damping this exact signal's x/y), symmetric for both
   * approach and departure. Off reads the proximity-derived target strength
   * directly, unsmoothed, each frame. Either way the hologram always tracks
   * the live tilt signal — there is no separate pointer-leave-triggered
   * fade; leaving is just the release side of the same envelope as
   * entering. */
  dampingEnabled: boolean;
  /** Touch's direct equivalent of desktop's cursor-proximity tilt (PLAN:
   * touch hologram reveal) — while a finger is actually in contact with a
   * hologram-enabled card, its position relative to that card's own bounds
   * drives the same `{proximity, x, y}` signal a mouse would, computed
   * independently of `usePointerProximity` (that engine explicitly excludes
   * touch — see `AbstractDeckSwiper`'s own drag-coupled tilt for this
   * codebase's existing precedent of deriving a touch-native signal
   * separately rather than extending that shared, mouse-only engine). Never
   * drives the card's own lift/tilt/shadow physics — those stay pointer-
   * only, matching the deck's own scope for the same reason: a finger
   * sweeping past a card while scrolling shouldn't visibly puff it up or
   * cast a shadow, only shift its gradient. */
  touchDragEnabled: boolean;
  /** Ambient, scripted hologram "excite" sweep (PLAN: touch hologram reveal)
   * for hover-incapable/coarse-pointer devices — the passive introduction
   * layered before any real touch, since touchDragEnabled above only ever
   * fires once a finger actually lands on a card. Reuses
   * `runHologramExciteSweep` (helpers/hologramExciteSweep.ts), the same
   * sine-envelope driver `AbstractPostDockScatterCard`'s own mount-entrance
   * excite already uses. Ignored entirely on hover-capable devices, which
   * keep today's live cursor-proximity hologram unchanged. */
  ambientSweepEnabled: boolean;
  /** Delay (ms) from this card first becoming visible to when the sweep's
   * own timeline actually starts — same `startMs` concept `CardReveal`/
   * `AbstractPostDockScatterCardReveal` already use elsewhere for exactly
   * this "wait before the entrance begins" purpose. Lets the sweep wait out
   * the stack's own initial mount/paint instead of competing with it, or
   * simply read as a deliberate beat rather than an immediate reaction to
   * scrolling into view. `runHologramExciteSweep` already implements the
   * wait — this field only had to be plumbed through. */
  ambientSweepStartMs: number;
  ambientSweepDurationMs: number;
  /** `AbstractPostDockEasingPreset` (this file's own reveal/entrance timing
   * vocabulary — resolveAbstractPostDockEasing), not `PointerProximityEasing`:
   * this shapes a genuine CSS transition-timing curve for the sweep's own
   * progress, the same kind of value `AbstractPostDockIntroductionConfig`'s
   * own `easing` field already resolves, not a distance falloff. */
  ambientSweepEasing: AbstractPostDockEasingPreset;
  /** 'linear' (default): the sweep's `x` only ever nudges toward one side
   * and back — `GradientRenderer.tsx`'s own hue/saturation/brightness
   * response reads only `x`, never `y`, so a linear sweep visibly
   * under-delivers relative to its own motion. 'circular': `x`/`y` orbit
   * instead, crossing the full range on both axes — see
   * `runHologramExciteSweep`'s own `geometry` doc comment. */
  ambientSweepGeometry: HologramSweepGeometry;
  /** Circular geometry only — 0..1 fraction of the full -1..1 axis range
   * the orbit reaches. */
  ambientSweepRadius: number;
  /** Circular geometry only — number of full revolutions over the sweep's
   * own duration. */
  ambientSweepLoopCount: number;
  /** 'gaussian' (default): one smooth peak mid-sweep. 'inverse-gaussian':
   * two smaller pulses near the start and end with a dip in the middle —
   * see `runHologramExciteSweep`'s own `envelopeShape` doc comment for why
   * this isn't a literal `1 - gaussian`. Independent of `ambientSweepGeometry`
   * above — shape governs *how strong*, geometry governs *which direction*,
   * any combination is valid. */
  ambientSweepEnvelopeShape: HologramSweepEnvelopeShape;
  /** Opt-in: an additional physical rotateX/rotateY tilt on the card's own
   * outer wrapper (`AbstractJournalLabCollection/styles.module.css`'s
   * `.fadeSlot` rule — the same element `reveal.offsetYPercent`'s
   * `--reveal-offset-y` already animates for the flat/grid branch, unused
   * by the card stack until this), driven by the exact same geometry/
   * envelope/timing as the hologram gradient above so the card visibly
   * tilts as if physically catching the light the gradient is reacting to
   * — not a second, independently-tuned motion. A separate DOM layer from
   * the card's own live pointer-driven tilt (`useCardLiftPhysics`'s inner
   * `.physics` element), so it composes rather than fights, and naturally
   * goes idle once a real touch drag takes over (see
   * `handleHologramTouchStart`). */
  ambientTiltEnabled: boolean;
  /** Max rotateX/rotateY at full sweep strength — same "degrees at full
   * strength" concept as `CtaButtonConfig.tiltMaxDegrees`, a local copy
   * rather than reusing that field since this tilt is driven by the
   * ambient sweep's own signal, not live pointer proximity. */
  ambientTiltMaxDegrees: number;
};

export const DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG = {
  enabled: true,
  offsetGain: 1.8,
  hueShiftAmount: 0.24,
  saturationBoost: 0.27,
  brightnessBoost: 0.07,
  responseEasing: 'smootherstep',
  dampingEnabled: true,
  touchDragEnabled: true,
  ambientSweepEnabled: true,
  ambientSweepStartMs: 500,
  ambientSweepDurationMs: 1100,
  ambientSweepEasing: 'viscous',
  ambientSweepGeometry: 'linear',
  ambientSweepRadius: 1,
  ambientSweepLoopCount: 1,
  ambientSweepEnvelopeShape: 'gaussian',
  ambientTiltEnabled: true,
  ambientTiltMaxDegrees: 3,
} satisfies AbstractPostDockHologramConfig;

/**
 * Deck palette direction — opt-in art direction for the dock gradients.
 *
 * Two modes:
 *
 * 'window' (default, production): the ORIGINAL full-wheel rainbow renderer is
 * untouched — its colour quality is the bar. Connection comes from organizing
 * where in one great field each card lives: a shared field seed (kinship), an
 * index-proportional window offset into that field (same sky, different
 * windows) and an index-driven rotation of the colour wheel (hue-space
 * panorama). Nothing constrains the palette, so nothing can go muddy.
 *
 * 'chord' (experiment): replaces the wheel with a per-card three-voice chord
 * LUT. Kept behind the mode switch; the shader's multi-sample averaging tends
 * to mute restrained palettes, so it is not the production path.
 *
 * When disabled, the legacy renderer with legacy per-slide values renders
 * byte-for-byte as before.
 */
export type AbstractPostDockPaletteMode = 'window' | 'chord';

export type AbstractPostDockPaletteRampPath = 'wrap' | 'mirror';

export type AbstractPostDockWindowPanCurve = 'linear' | 'gaussian';

export type AbstractPostDockPaletteConfig = {
  enabled: boolean;
  /** 'window': original colours, connected by field windows + wheel rotation.
   * 'chord': experimental LUT palette replacement. */
  mode: AbstractPostDockPaletteMode;
  /** Window mode: field offset per card (how far apart the windows are). */
  windowStep: number;
  /** Window mode: total colour-wheel rotation across the deck (0..0.72). */
  hueSpread: number;
  /** Window mode only. 'linear' (default): today's straight index-proportional
   * pan via windowStep, byte-identical to pre-existing behavior. 'gaussian':
   * the pan magnitude follows a bell curve peaking at gaussianPeakIndex — one
   * card reads as the widest/loudest window, the rest recede toward
   * gaussianFloor. Inert (read nowhere) when 'linear'. */
  windowPanCurve: AbstractPostDockWindowPanCurve;
  /** Gaussian pan curve only. The REAL index value the bell's peak (μ) sits
   * at — e.g. -1 for about.tsx's synthetic header slot, 0 for its first
   * narrative row. Not a 0..1 normalized fraction: passed straight through
   * to deckGaussianOffsetX's peakIndex, so the caller names the literal
   * band, not an abstract position. */
  gaussianPeakIndex: number;
  /** Gaussian pan curve only. Spread (σ) of the bell along the index axis —
   * this is also "how wide the gaussian goes": the pan offset is the entire
   * visual output of this mechanism, so there's no separate width to scale. */
  gaussianSigma: number;
  /** Gaussian pan curve only. Peak-of-bell pan magnitude at μ — plays the
   * role windowStep plays for the linear curve. */
  gaussianAmplitude: number;
  /** Gaussian pan curve only. Minimum retained |offset| at the curve's quiet
   * tail(s), so far-from-peak cards never fully flatten to zero pan. */
  gaussianFloor: number;
  /** Gaussian pan curve only. Off (default): normal rendering. On: an
   * art-direction aid that strips out every OTHER source of per-card visual
   * difference — cards render at equal size (no magnification-driven size
   * variance), at equal opacity (no distance dimming), and with chroma
   * ducking/value-rig darkening both forced off — so the Gaussian curve's
   * own effect on the shared field is the only thing left varying between
   * cards. Only meaningful (and only ever shown in the panel) while
   * windowPanCurve is 'gaussian'. */
  gaussianVisualTestModeEnabled: boolean;
  /** Gaussian pan curve only. Off (default): the peak stays fixed at
   * gaussianPeakIndex — byte-identical to the static curve. On: each card's
   * own live pointer proximity (usePointerProximity) continuously pulls
   * that card's effective distance-from-peak toward zero, proportional to
   * how close the pointer sits to that card's own element — no discrete
   * hover threshold, no snap. Fully isolated: no listener of any kind
   * attaches anywhere when this is false. */
  gaussianProximityMorphEnabled: boolean;
  /** Time constant (ms) each card's own live-blended offset takes to follow
   * its proximity-derived target — fed into stepDampedValue, the same
   * time-correct exponential-follow primitive usePointerProximity's own
   * position damping already uses. Higher = laggier, more viscous follow. */
  gaussianProximityResponseMs: number;
  /** Extra response time (ms) added per unit of real-index distance between
   * a card and the nearest currently-hovered card — produces the ripple/
   * cascade read (near cards catch up first, far cards trail). 0 disables
   * the stagger (every card responds at the same rate). */
  gaussianProximityStaggerMsPerBand: number;
  /** Distance-falloff curve shaping each card's own live proximity signal
   * before it drives the peak shift — reuses usePointerProximity's own
   * easing vocabulary (the same one AbstractPostDockHologramConfig.
   * responseEasing already uses for an analogous distance-to-shader-value
   * job), not AbstractPostDockEasingPreset's CSS transition-timing curves. */
  gaussianProximityEasing: PointerProximityEasing;
  /** 0 = fully individual field seeds, 1 = tight per-index phase family. */
  fieldKinship: number;
  /** How far inactive cards duck their chroma toward ink (0..1). */
  inactiveChromaDuck: number;
  /** Luminance shaping: calm/dark text zones (top-left), light lower-right. */
  valueRigAmount: number;
  /** Master bus: saturation trim on the final colour (1 = neutral). */
  masterSaturation: number;
  /** Master bus: brightness trim on the final colour (1 = neutral). */
  masterBrightness: number;
  /** Master bus: contrast around mid-grey (1 = neutral). */
  masterContrast: number;
  /** Master bus: extra colour smoothing — widens the shader's softness taps
   * and the canvas blur (0 = legacy softness only). */
  masterSoftness: number;
  /** Zoom into the gradient field — maps straight through to
   * LiquidSliderConfig's own `shaderColorScale` (the same "Shader scale"
   * uniform every card's gradient shader already reads). Lower shows more
   * hue variety per card; higher is flatter/more concentrated. Shared
   * across every consumer of *this one page's own* palette config instance
   * (e.g. every card in /abstract's own card stack all reading the same
   * object) so a single control tunes the mesh's own zoom everywhere that
   * page uses it at once. NOT shared across pages: /about holds its own
   * independent `AbstractPostDockPaletteConfig` value (see
   * PLAN-DOCK-PALETTE-CONFIG-SEGREGATION.md — pages/about.panel.ts's own
   * ABOUT_DOCK_PALETTE_PANEL scope, forked from this one specifically so
   * tuning either page's copy can never affect the other's stored
   * default). This doc comment previously said otherwise (a description of
   * this config's pre-fork architecture) — corrected because an
   * overclaiming comment here is exactly what makes an already-fixed
   * cross-page bleed bug look unresolved. */
  gradientScale: number;
  /** Amplitude of the gradient shader's own domain-warp noise — maps
   * straight through to LiquidSliderConfig's `shaderColorRandomness` (the
   * "Field randomness" uniform). 0 is a smooth, static field; 1 is the full
   * organic wobble. Same page-scoped-not-cross-page-shared scope as
   * `gradientScale` above. */
  gradientNoise: number;
  /** Same two fields, ≥ tablet width (768px) — same three-tier
   * unprefixed/-Wide/-Lg vocabulary `PolymorphicLayoutConfig` already uses
   * (base = mobile, `Wide` = tablet, `Lg` = desktop). Default to
   * `gradientScale`/`gradientNoise`'s own values, so every existing
   * consumer that has never touched these tiers sees byte-identical
   * behavior across every breakpoint until deliberately diverged. Declared
   * (and normalized/defaulted) in this tier-grouped order — mobile pair,
   * tablet pair, desktop pair — to match the panel's own MOBILE/TABLET/
   * DESKTOP tab traversal order exactly (enforced by
   * `panel.test.ts`'s field-key-order assertion). */
  gradientScaleWide: number;
  gradientNoiseWide: number;
  /** Same two fields, ≥ desktop width (1024px). */
  gradientScaleLg: number;
  gradientNoiseLg: number;
  /** Accordion-row distance dimming — maps straight through to
   * LiquidSliderConfig's own `dockDistanceDimming*` fields (a black overlay
   * MagnificationDock already paints over inactive rows, unrelated to the
   * shader/mesh above — grouped here anyway because it's the same "shared
   * across every consumer, page-tunable" shape as gradientScale/gradientNoise,
   * not because it touches the gradient itself). Opt-out entirely: off
   * renders every row at full brightness regardless of distance. */
  distanceDimmingEnabled: boolean;
  /** Opacity of the black overlay at the farthest inactive row. */
  distanceDimmingMaxOpacity: number;
  /** Opacity floor even for the row closest to active — the dimming range
   * is [baseline, max], not [0, max]. 0 lets the nearest row go fully
   * undimmed before the eased curve takes over. */
  distanceDimmingBaselineOpacity: number;
  /** Exponent shaping how quickly opacity rises across the [baseline, max]
   * range as distance grows — below 1 front-loads the darkening (reaches
   * near-max quickly, even close to active); above 1 delays it. */
  distanceDimmingPower: number;
  /** Curve shaping normalized distance before the power above applies —
   * same three-case vocabulary MagnificationDock's own easeDimmingDistance
   * already uses. */
  distanceDimmingEasing: MagnificationDockDimmingEasing;
  /** Chord mode: fraction of the spectral ramp the collection traverses. */
  rampSpan: number;
  /** Chord mode: base offset along the ramp (0..1). */
  rampRotation: number;
  /** Chord mode: 'mirror' ping-pongs the ramp; 'wrap' cycles past the ends. */
  rampPath: AbstractPostDockPaletteRampPath;
  /** Chord mode: support voice = next card's dominant. */
  relayEnabled: boolean;
  /** Chord mode: chroma scale for the counterpoint voice. */
  counterpointChroma: number;
  /** Chord mode: chroma gain baked into the LUT. */
  chordChroma: number;
  /** Chord mode: shared tonal register (0 = ink-dark, 1 = airy). */
  paletteLightness: number;
  /** Chord mode: value spread within each card's cycle. */
  lightnessContrast: number;
  /** Chord mode: glaze toward one shared ink anchor. */
  inkUnity: number;
  /** Chord mode: intra-voice hue drift across cycle segments. */
  voiceSpread: number;
};

export const DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG = {
  enabled: true,
  mode: 'window',
  windowStep: 0.27,
  hueSpread: 0.5,
  windowPanCurve: 'gaussian',
  gaussianPeakIndex: 0,
  gaussianSigma: 6,
  gaussianAmplitude: 1,
  gaussianFloor: 1,
  gaussianVisualTestModeEnabled: false,
  gaussianProximityMorphEnabled: false,
  gaussianProximityResponseMs: 220,
  gaussianProximityStaggerMsPerBand: 60,
  gaussianProximityEasing: 'smootherstep',
  fieldKinship: 0.76,
  inactiveChromaDuck: 0.2,
  valueRigAmount: 1,
  masterSaturation: 0.82,
  masterBrightness: 0.88,
  masterContrast: 1,
  masterSoftness: 1,
  gradientScale: 0.5,
  gradientNoise: 1,
  gradientScaleWide: 0.5,
  gradientNoiseWide: 1,
  gradientScaleLg: 4,
  gradientNoiseLg: 1,
  distanceDimmingEnabled: true,
  distanceDimmingMaxOpacity: 1,
  distanceDimmingBaselineOpacity: 1,
  distanceDimmingPower: 4,
  distanceDimmingEasing: 'expo',
  rampSpan: 1,
  rampRotation: 0.29,
  rampPath: 'mirror',
  relayEnabled: true,
  counterpointChroma: 0.5,
  chordChroma: 1.4,
  paletteLightness: 0.42,
  lightnessContrast: 0.55,
  inkUnity: 0.15,
  voiceSpread: 0.4,
} satisfies AbstractPostDockPaletteConfig;

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

const clampRange = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const VALID_POINTER_PROXIMITY_EASINGS: ReadonlyArray<PointerProximityEasing> =
  ['linear', 'smoothstep', 'smootherstep', 'ease-out-cubic'];

const VALID_DIMMING_EASINGS: ReadonlyArray<MagnificationDockDimmingEasing> =
  ['linear', 'soft', 'expo'];

/** Single normalization path for the palette config at the runtime boundary. */
export function normalizeAbstractPostDockPaletteConfig(
  config: Partial<AbstractPostDockPaletteConfig> | undefined,
): AbstractPostDockPaletteConfig {
  const base = { ...DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG, ...(config ?? {}) };
  return {
    enabled: Boolean(base.enabled),
    mode: base.mode === 'chord' ? 'chord' : 'window',
    windowStep: clamp01(base.windowStep),
    hueSpread: clampRange(base.hueSpread, 0, 0.72),
    windowPanCurve: base.windowPanCurve === 'gaussian' ? 'gaussian' : 'linear',
    gaussianPeakIndex: Number.isFinite(base.gaussianPeakIndex) ? base.gaussianPeakIndex : 0,
    gaussianSigma: Math.max(0.01, Number.isFinite(base.gaussianSigma) ? base.gaussianSigma : 1.5),
    gaussianAmplitude: Number.isFinite(base.gaussianAmplitude) ? base.gaussianAmplitude : 0.27,
    gaussianFloor: Math.max(0, Number.isFinite(base.gaussianFloor) ? base.gaussianFloor : 0),
    gaussianVisualTestModeEnabled: Boolean(base.gaussianVisualTestModeEnabled),
    gaussianProximityMorphEnabled: Boolean(base.gaussianProximityMorphEnabled),
    gaussianProximityResponseMs: Math.max(
      1,
      Number.isFinite(base.gaussianProximityResponseMs) ? base.gaussianProximityResponseMs : 220,
    ),
    gaussianProximityStaggerMsPerBand: Math.max(
      0,
      Number.isFinite(base.gaussianProximityStaggerMsPerBand)
        ? base.gaussianProximityStaggerMsPerBand
        : 60,
    ),
    gaussianProximityEasing: VALID_POINTER_PROXIMITY_EASINGS.includes(base.gaussianProximityEasing)
      ? base.gaussianProximityEasing
      : 'smootherstep',
    fieldKinship: clamp01(base.fieldKinship),
    inactiveChromaDuck: clamp01(base.inactiveChromaDuck),
    valueRigAmount: clamp01(base.valueRigAmount),
    masterSaturation: clampRange(base.masterSaturation, 0, 2),
    masterBrightness: clampRange(base.masterBrightness, 0.5, 1.6),
    masterContrast: clampRange(base.masterContrast, 0, 2),
    masterSoftness: clamp01(base.masterSoftness),
    gradientScale: clampRange(base.gradientScale, 0.5, 4),
    gradientNoise: clamp01(base.gradientNoise),
    gradientScaleWide: clampRange(base.gradientScaleWide, 0.5, 4),
    gradientNoiseWide: clamp01(base.gradientNoiseWide),
    gradientScaleLg: clampRange(base.gradientScaleLg, 0.5, 4),
    gradientNoiseLg: clamp01(base.gradientNoiseLg),
    distanceDimmingEnabled: Boolean(base.distanceDimmingEnabled),
    distanceDimmingMaxOpacity: clamp01(base.distanceDimmingMaxOpacity),
    distanceDimmingBaselineOpacity: clampRange(
      base.distanceDimmingBaselineOpacity, 0, clamp01(base.distanceDimmingMaxOpacity),
    ),
    distanceDimmingPower: clampRange(base.distanceDimmingPower, 0.1, 4),
    distanceDimmingEasing: VALID_DIMMING_EASINGS.includes(base.distanceDimmingEasing)
      ? base.distanceDimmingEasing
      : 'soft',
    rampSpan: clamp01(base.rampSpan),
    rampRotation: clamp01(base.rampRotation),
    rampPath: base.rampPath === 'wrap' ? 'wrap' : 'mirror',
    relayEnabled: Boolean(base.relayEnabled),
    counterpointChroma: clamp01(base.counterpointChroma),
    chordChroma: clampRange(base.chordChroma, 0, 2),
    paletteLightness: clamp01(base.paletteLightness),
    lightnessContrast: clamp01(base.lightnessContrast),
    inkUnity: clamp01(base.inkUnity),
    voiceSpread: clamp01(base.voiceSpread),
  };
}

/**
 * Journal-only spatial shaping for the existing procedural source field.
 *
 * These values never author color. They increase the amplitude of the
 * coordinate warp and the cross-axis phase coupling that already form the
 * journal's curved color boundaries. Zero values retain the legacy shader
 * path; lab metal output explicitly bypasses this treatment.
 */
export type AbstractPostDockMeshGeometryConfig = {
  enabled: boolean;
  domainCurveBoost: number;
  bandCurveBoost: number;
};

export const DEFAULT_ABSTRACT_POST_DOCK_MESH_GEOMETRY_CONFIG = {
  enabled: true,
  domainCurveBoost: 0.27,
  bandCurveBoost: 0.5,
} satisfies AbstractPostDockMeshGeometryConfig;

export function normalizeAbstractPostDockMeshGeometryConfig(
  config: Partial<AbstractPostDockMeshGeometryConfig> | undefined,
): AbstractPostDockMeshGeometryConfig {
  const base = {
    ...DEFAULT_ABSTRACT_POST_DOCK_MESH_GEOMETRY_CONFIG,
    ...(config ?? {}),
  };

  return {
    enabled: Boolean(base.enabled),
    domainCurveBoost: clamp01(base.domainCurveBoost),
    bandCurveBoost: clamp01(base.bandCurveBoost),
  };
}

/**
 * Optional final-stage journal color grade. The selected color contributes
 * only its perceptual hue; the finished procedural field keeps its own OKLab
 * lightness and chroma structure.
 */
export type AbstractPostDockHueInfluenceConfig = {
  enabled: boolean;
  gradeMix: number;
  targetColor: string;
  hueTrimDegrees: number;
  /** Strength of the bounded ±24° per-card palette accent. */
  paletteHueCoupling: number;
  strength: number;
  chromaScale: number;
  shadowChromaScale: number;
  highlightChromaScale: number;
  chromaPivot: number;
  /** Amount of target-color chroma restored into neutral source regions. */
  neutralRecovery: number;
  /** OKLab chroma range over which neutral recovery fades out. */
  neutralThreshold: number;
  tonalRegister: number;
  lightnessContrast: number;
  inkUnity: number;
  counterpointWidthDegrees: number;
  counterpointFalloff: number;
  counterpointChromaScale: number;
  /** Target-relative minimum chroma carried by the counterpoint band. */
  counterpointChromaFloor: number;
  ditherStrength: number;
  transitionEnabled: boolean;
  transitionDurationMs: number;
  tuningResponseMs: number;
  transitionEasing: AbstractPostDockEasingPreset;
};

export const DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG = {
  enabled: false,
  gradeMix: 0.75,
  targetColor: '#004c9e',
  hueTrimDegrees: 2,
  paletteHueCoupling: 0,
  strength: 1,
  chromaScale: 1.59,
  shadowChromaScale: 1.76,
  highlightChromaScale: 1.81,
  chromaPivot: 0.85,
  neutralRecovery: 0.89,
  neutralThreshold: 0.105,
  tonalRegister: 0,
  lightnessContrast: 0.5,
  inkUnity: 0.1,
  counterpointWidthDegrees: 50.5,
  counterpointFalloff: 0.5,
  counterpointChromaScale: 1.1,
  counterpointChromaFloor: 1.25,
  ditherStrength: 1,
  transitionEnabled: true,
  transitionDurationMs: 1220,
  tuningResponseMs: 180,
  transitionEasing: 'viscous',
} satisfies AbstractPostDockHueInfluenceConfig;

const SIX_DIGIT_HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function normalizeAbstractPostDockHueInfluenceConfig(
  config: Partial<AbstractPostDockHueInfluenceConfig> | undefined,
): AbstractPostDockHueInfluenceConfig {
  const base = {
    ...DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG,
    ...(config ?? {}),
  };

  return {
    enabled: Boolean(base.enabled),
    gradeMix: clamp01(base.gradeMix),
    targetColor: typeof base.targetColor === 'string' &&
      SIX_DIGIT_HEX_COLOR.test(base.targetColor)
      ? base.targetColor.toLowerCase()
      : DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG.targetColor,
    hueTrimDegrees: clampRange(base.hueTrimDegrees, -45, 45),
    paletteHueCoupling: clamp01(base.paletteHueCoupling),
    strength: clamp01(base.strength),
    chromaScale: clampRange(base.chromaScale, 0, 1.75),
    shadowChromaScale: clampRange(base.shadowChromaScale, 0, 2),
    highlightChromaScale: clampRange(base.highlightChromaScale, 0, 2),
    chromaPivot: clampRange(base.chromaPivot, 0.15, 0.85),
    neutralRecovery: clamp01(base.neutralRecovery),
    neutralThreshold: clampRange(base.neutralThreshold, 0.01, 0.2),
    tonalRegister: clampRange(base.tonalRegister, -1, 1),
    lightnessContrast: clampRange(base.lightnessContrast, 0.5, 1.5),
    inkUnity: clamp01(base.inkUnity),
    counterpointWidthDegrees: clampRange(
      base.counterpointWidthDegrees,
      0,
      120,
    ),
    counterpointFalloff: clampRange(base.counterpointFalloff, 0.5, 10),
    counterpointChromaScale: clampRange(
      base.counterpointChromaScale,
      0,
      1.5,
    ),
    counterpointChromaFloor: clampRange(
      base.counterpointChromaFloor,
      0,
      1.25,
    ),
    ditherStrength: clamp01(base.ditherStrength),
    transitionEnabled: Boolean(base.transitionEnabled),
    transitionDurationMs: clampRange(base.transitionDurationMs, 0, 2400),
    tuningResponseMs: clampRange(base.tuningResponseMs, 0, 600),
    transitionEasing: (
      base.transitionEasing === 'standard' ||
      base.transitionEasing === 'soft-expo' ||
      base.transitionEasing === 'viscous' ||
      base.transitionEasing === 'settle' ||
      base.transitionEasing === 'luxury'
    ) ? base.transitionEasing : 'soft-expo',
  };
}
