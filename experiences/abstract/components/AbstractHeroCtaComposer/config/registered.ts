import type { CtaButtonMotionEasing } from '../../../../../components/CtaButton/config/registered';
import type { MagnificationDockRevealDistribution } from '../../../../../helpers/magnificationDockRevealMath';

/**
 * Tunables for the abstract.tsx hero CTA's morph into a real text input
 * (see experiences/abstract/components/AbstractHeroCtaComposer.tsx). Numeric
 * defaults for composerElevationPx/placeholderMinContrast/the hero-reveal
 * fields deliberately match contact.tsx's own ContactExperienceConfig
 * defaults for out-of-the-box visual parity — the two composers share a
 * component (components/ComposerPill.tsx) and a mechanism, but each keeps
 * its own independently-tunable magnitude, the same "shared mechanism,
 * separately-tuned per context" precedent already used elsewhere in this
 * codebase (e.g. AbstractPostDock's dockShadowNarrowScale).
 */
export type AbstractHeroCtaComposerConfig = {
  /** How long (ms) the composer holds on its fully-revealed first intro
   * line ("Tell me what you're working on") before it fades out (see
   * introLine1ExitDurationMs/Easing below) to make way for the real
   * placeholder — long enough that a visitor actually reads it before
   * anything changes underneath it. */
  introLine1HoldMs: number;
  /** How long (ms)/which easing the fully-revealed first line takes to fade
   * out as one plain block (a single opacity transition on the whole line,
   * no per-character animation of its own) once introLine1HoldMs elapses,
   * before the real placeholder enters. Also the moment the resting
   * elevation begins its rise (see elevationRiseDurationMs below): the
   * placeholder swap and the elevation gain land on that same later
   * transition, once this fade-out finishes. */
  introLine1ExitDurationMs: number;
  introLine1ExitEasing: CtaButtonMotionEasing;
  /** How long (ms) the resting elevation takes to tween from 0 (this
   * composer starts perfectly flat) up to composerElevationPx, once line1's
   * fade-out finishes. */
  elevationRiseDurationMs: number;
  elevationRiseEasing: CtaButtonMotionEasing;
  /** This composer's own pinned resting elevation (px) once risen —
   * independent of contact.tsx's own composerElevationPx, defaulting to the
   * same number as the latter for out-of-the-box parity. */
  composerElevationPx: number;
  placeholderMinContrast: number;
  /** Container fade-in on mount, same mechanism as ContactExperienceConfig's
   * own field of the same name. Defaults to 0 — this composer is the first
   * thing to occupy its spot in the hero (there's no earlier element it
   * would otherwise flicker against), so an instant appearance reads fine;
   * kept as a real, tunable field in case some layout wants a brief
   * cross-fade after all. */
  heroContainerFadeInDurationMs: number;
  heroContainerFadeInEasing: CtaButtonMotionEasing;
  /** Gap after the container fade before the first intro line starts its
   * own per-character reveal — mirrors ContactExperienceConfig's own field
   * of the same name. Cascaded on top of heroContainerFadeInDurationMs by
   * AbstractHeroCtaComposer.tsx into ComposerPill's own resolved,
   * absolute-from-mount placeholderRevealInitialDelayMs prop. The second
   * intro line (the real placeholder) starts at 0 extra delay of its own —
   * introLine1HoldMs above already provides its lead-in pause. */
  heroPlaceholderRevealInitialDelayMs: number;
  /** The base "ms per character" rate each line's own linear stagger step
   * is inferred from (this * that line's own introLineXTimeDilation below)
   * — shared across both lines, so a dilation of 1 on either line reads as
   * the same pacing. Still a literal, linear per-character step (never run
   * through an easing curve — see heroPlaceholderRevealEasing below for
   * why that matters); this composer just applies its own per-line
   * dilation on top before handing it to ComposerPill as
   * ComposerPillMotionConfig's heroPlaceholderRevealStepDelayMs, the same
   * shared type contact.tsx's own config satisfies with its own literal
   * step-delay. */
  heroPlaceholderRevealStepDelayMs: number;
  /** Each character's own fade-in duration/easing (opacity 0->1) — one
   * shared curve applied to every character's own local progress, the same
   * way AbstractPostDock's own card intro applies one shared easing to
   * each card's local progress. Never applied to cross-character delay
   * (see heroPlaceholderRevealStepDelayMs above, which stays perfectly
   * linear) — that's what keeps the stagger evenly distributed rather than
   * bunching up under a non-linear curve. */
  heroPlaceholderRevealUnitDurationMs: number;
  heroPlaceholderRevealEasing: CtaButtonMotionEasing;
  /** Per-line multiplier on top of the inferred base linear stagger step
   * (heroPlaceholderRevealStepDelayMs) — stretches/compresses that line's
   * own total reveal time. 1 = exactly the inferred pacing. */
  introLine1TimeDilation: number;
  introLine2TimeDilation: number;
  /** Shapes each character's own *duration* (not delay) via a Gaussian bell
   * curve over character index — mirrors AbstractPostDock's own
   * dockRevealDistribution/dockRevealCadenceAmount exactly (same shared
   * helper, computeMagnificationDockRevealSchedule). Shared across both
   * lines, not per-line — matching the cards' own single shared config.
   * 'linear' (default) + cadenceAmount 0 means every character gets exactly
   * heroPlaceholderRevealUnitDurationMs, an evenly-paced stagger. */
  introRevealDistribution: MagnificationDockRevealDistribution;
  introRevealCadenceAmount: number;
  /** How long (ms)/which easing the placeholder text color takes to ease
   * from introText's color to the real placeholder's own (more muted)
   * color — starting only once line2 has *also* fully finished revealing
   * (see useHeroComposerIntroPhase's own colorTransitionDelayMs), not at
   * the line1->line2 swap itself. Dedicated fields, independent of the
   * elevation rise's own timing. */
  placeholderColorTransitionDurationMs: number;
  placeholderColorTransitionEasing: CtaButtonMotionEasing;
  /** The composer's own horizontal placement within AbstractEditorialHero's
   * column — 'left' keeps it flush with the left-aligned headline/paragraph
   * copy above it; 'center' matches contact.tsx's own composer instead. */
  composerAlign: 'left' | 'center';
  /** Opt-in chrome swap, hero-only (ComposerPill's own `chrome` prop
   * defaults to 'default', so contact.tsx — which never reads this config
   * — is unaffected either way). 'default' is today's shadowed, `border-2`
   * pill. 'tagPill' rebuilds the same pill from the site's own card-tag
   * idiom instead (`ArticleCard.tsx`'s `articleCardTopic`): a hairline
   * border, no shadow, and a monospace/letterspaced placeholder + submit
   * glyph — see AbstractHeroCtaComposer/config/panel.ts's own field
   * description for the exact precedent citations. */
  chrome: 'default' | 'tagPill';
  /** Secondary motion alongside each character's opacity fade — a
   * character settles down from this translateY offset (px) as it enters.
   * Shared across both lines. 0 disables it entirely (plain opacity fade).
   * line1's own exit is a plain whole-block opacity fade with no
   * per-character motion of its own, so this doesn't apply there. */
  introUnitTranslateYPx: number;
};

export const DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG = {
  introLine1HoldMs: 1200,
  introLine1ExitDurationMs: 580,
  introLine1ExitEasing: 'viscous',
  elevationRiseDurationMs: 540,
  elevationRiseEasing: 'viscous',
  composerElevationPx: 8.5,
  placeholderMinContrast: 1.5,
  heroContainerFadeInDurationMs: 0,
  heroContainerFadeInEasing: 'viscous',
  heroPlaceholderRevealInitialDelayMs: 180,
  heroPlaceholderRevealStepDelayMs: 20,
  heroPlaceholderRevealUnitDurationMs: 160,
  heroPlaceholderRevealEasing: 'viscous',
  introLine1TimeDilation: 1,
  introLine2TimeDilation: 1,
  introRevealDistribution: 'linear',
  introRevealCadenceAmount: 0,
  placeholderColorTransitionDurationMs: 780,
  placeholderColorTransitionEasing: 'viscous',
  composerAlign: 'left',
  introUnitTranslateYPx: 8,
  chrome: 'default',
} satisfies AbstractHeroCtaComposerConfig;

const MOTION_EASINGS: ReadonlyArray<CtaButtonMotionEasing> = [
  'linear', 'standard', 'expressive', 'viscous', 'gentle', 'gaussian',
];

const DISTRIBUTIONS: ReadonlyArray<MagnificationDockRevealDistribution> = [
  'linear', 'gaussian', 'gaussian-inverse',
];

const clampRange = (value: number, min: number, max: number, fallback: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));

const easingToken = (value: string, fallback: CtaButtonMotionEasing): CtaButtonMotionEasing => (
  (MOTION_EASINGS as ReadonlyArray<string>).includes(value) ? value as CtaButtonMotionEasing : fallback
);

/** Single normalization path for every runtime and panel-provided value. */
export function normalizeAbstractHeroCtaComposerConfig(
  config: Partial<AbstractHeroCtaComposerConfig> | undefined,
): AbstractHeroCtaComposerConfig {
  const base = { ...DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG, ...(config ?? {}) };

  return {
    introLine1HoldMs: clampRange(
      base.introLine1HoldMs, 0, 8000, DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.introLine1HoldMs,
    ),
    introLine1ExitDurationMs: clampRange(
      base.introLine1ExitDurationMs, 0, 2000,
      DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.introLine1ExitDurationMs,
    ),
    introLine1ExitEasing: easingToken(
      base.introLine1ExitEasing, DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.introLine1ExitEasing,
    ),
    elevationRiseDurationMs: clampRange(
      base.elevationRiseDurationMs, 0, 2000,
      DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.elevationRiseDurationMs,
    ),
    elevationRiseEasing: easingToken(
      base.elevationRiseEasing, DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.elevationRiseEasing,
    ),
    composerElevationPx: clampRange(
      base.composerElevationPx, 0, 32, DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.composerElevationPx,
    ),
    placeholderMinContrast: clampRange(
      base.placeholderMinContrast, 1, 7, DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.placeholderMinContrast,
    ),
    heroContainerFadeInDurationMs: clampRange(
      base.heroContainerFadeInDurationMs, 0, 2000,
      DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.heroContainerFadeInDurationMs,
    ),
    heroContainerFadeInEasing: easingToken(
      base.heroContainerFadeInEasing, DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.heroContainerFadeInEasing,
    ),
    heroPlaceholderRevealInitialDelayMs: clampRange(
      base.heroPlaceholderRevealInitialDelayMs, 0, 2000,
      DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.heroPlaceholderRevealInitialDelayMs,
    ),
    heroPlaceholderRevealStepDelayMs: clampRange(
      base.heroPlaceholderRevealStepDelayMs, 0, 200,
      DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.heroPlaceholderRevealStepDelayMs,
    ),
    heroPlaceholderRevealUnitDurationMs: clampRange(
      base.heroPlaceholderRevealUnitDurationMs, 0, 2000,
      DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.heroPlaceholderRevealUnitDurationMs,
    ),
    heroPlaceholderRevealEasing: easingToken(
      base.heroPlaceholderRevealEasing, DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.heroPlaceholderRevealEasing,
    ),
    introLine1TimeDilation: clampRange(
      base.introLine1TimeDilation, 0.25, 4, DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.introLine1TimeDilation,
    ),
    introLine2TimeDilation: clampRange(
      base.introLine2TimeDilation, 0.25, 4, DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.introLine2TimeDilation,
    ),
    introRevealDistribution: DISTRIBUTIONS.includes(base.introRevealDistribution)
      ? base.introRevealDistribution
      : DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.introRevealDistribution,
    introRevealCadenceAmount: clampRange(
      base.introRevealCadenceAmount, 0, 1,
      DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.introRevealCadenceAmount,
    ),
    placeholderColorTransitionDurationMs: clampRange(
      base.placeholderColorTransitionDurationMs, 0, 2000,
      DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.placeholderColorTransitionDurationMs,
    ),
    placeholderColorTransitionEasing: easingToken(
      base.placeholderColorTransitionEasing,
      DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.placeholderColorTransitionEasing,
    ),
    composerAlign: base.composerAlign === 'center' ? 'center' : 'left',
    introUnitTranslateYPx: clampRange(
      base.introUnitTranslateYPx, 0, 40, DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG.introUnitTranslateYPx,
    ),
    chrome: base.chrome === 'tagPill' ? 'tagPill' : 'default',
  };
}
