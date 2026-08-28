'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { ComposerPill } from '../../../components/ComposerPill';
import { CTA_BUTTON_MOTION_EASINGS, type CtaButtonConfig } from '../../../components/CtaButton/config/registered';
import { usePrefersReducedMotion } from '../../../helpers/usePrefersReducedMotion';
import { setPendingComposerDraft } from '../../../helpers/pendingComposerDraft';
import { useHeroComposerIntroPhase } from './AbstractHeroCtaComposer/useHeroComposerIntroPhase';
import type { AbstractHeroCtaComposerConfig } from './AbstractHeroCtaComposer/config/registered';

// The composer's first intro line — kept local to this component (rather
// than threaded down as a prop from AbstractEditorialHero) since it's one
// half of a matched pair with REVEALED_PLACEHOLDER below: the same element
// reveals this line, holds it, then swaps to that one, so both belong to
// this component's own lifecycle, not the caller's.
const INTRO_LINE_1 = 'Tell me what you’re working on';

// Deliberately the same copy contact.tsx's own composer placeholder shows
// (its ENTRY_PLACEHOLDER, pages/contact.tsx) — the second intro line reads
// as this composer settling into being the exact same input contact.tsx
// has. Not imported from there: that constant is private to a page module,
// and re-declaring one short literal here is cheaper than exporting a
// page-local constant across module boundaries for a single shared use.
const REVEALED_PLACEHOLDER = 'Start anywhere';

/**
 * The abstract.tsx hero CTA, reimagined as the first turn of the contact
 * conversation rather than just a link to it. Renders as a real ComposerPill
 * — the same shared component/mechanism contact.tsx's own composer uses,
 * independently elevation/motion-tuned (see AbstractHeroCtaComposerConfig)
 * — from first paint, with no button-to-input swap: this composer never was
 * anything else. Left-aligned by default (config.composerAlign), flush with
 * AbstractEditorialHero's own left-aligned headline/paragraph copy, rather
 * than contact.tsx's own centered composer.
 *
 * Its own entrance is a three-phase placeholder intro: INTRO_LINE_1 enters
 * (per-character, evenly-staggered — see ComposerPill's overlayDistribution/
 * overlayCadenceAmount doc comment for why cross-character delay always
 * stays linear rather than being warped through an easing curve), holds for
 * config.introLine1HoldMs once fully revealed so a visitor actually reads
 * it, then fades out as one plain block (a single opacity transition on
 * the whole line, no per-character animation of its own — see
 * ComposerPill's introOpacity prop) before REVEALED_PLACEHOLDER enters and
 * becomes the real, persistent placeholder. Line1's own stagger duration is
 * inferred from its length (charCount * the shared base ms/char rate) then
 * dilated (introLine1TimeDilation); line2 gets its own independent
 * dilation. See useHeroComposerIntroPhase, the single source of truth for
 * every derived timestamp below. The composer's resting elevation starts at
 * 0 (flat) and rises to config.composerElevationPx the moment line2 begins
 * (switchDelayMs) — the same beat as the placeholder swap itself, once
 * line1's fade-out finishes.
 *
 * On submit, the typed text is handed to pages/contact.tsx via a one-shot
 * module-scoped store (helpers/pendingComposerDraft.ts) immediately before a
 * client-side navigation, so the conversation there can pick up already
 * carrying what the visitor wrote here.
 *
 * INTRO_LINE_1 renders in the same color real typed content would
 * (colors.text, via ComposerPill's introText) — it reads as committed text,
 * not a hint. Only once REVEALED_PLACEHOLDER has *also* fully finished
 * revealing (colorTransitionDelayMs — a later, independent beat from the
 * elevation rise/placeholder swap above) does that color ease down to the
 * muted placeholder tone, over its own dedicated
 * placeholderColorTransitionDurationMs/Easing.
 */
export function AbstractHeroCtaComposer({
  config, ctaButtonConfig, surfaceColor, className = '',
}: {
  config: AbstractHeroCtaComposerConfig;
  ctaButtonConfig: CtaButtonConfig;
  surfaceColor: string;
  className?: string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const line1RevealInitialDelayMs = config.heroContainerFadeInDurationMs
    + config.heroPlaceholderRevealInitialDelayMs;
  const { phase: introPhase, switchDelayMs, colorTransitionDelayMs } = useHeroComposerIntroPhase({
    line1Text: INTRO_LINE_1,
    line2Text: REVEALED_PLACEHOLDER,
    line1RevealInitialDelayMs,
    baseMsPerChar: config.heroPlaceholderRevealStepDelayMs,
    unitDurationMs: config.heroPlaceholderRevealUnitDurationMs,
    line1TimeDilation: config.introLine1TimeDilation,
    line2TimeDilation: config.introLine2TimeDilation,
    introLine1HoldMs: config.introLine1HoldMs,
    introLine1ExitDurationMs: config.introLine1ExitDurationMs,
    distribution: config.introRevealDistribution,
    cadenceAmount: config.introRevealCadenceAmount,
  });
  // ComposerPill/SplitTextReveal read heroPlaceholderRevealStepDelayMs
  // directly off motionConfig as the literal (linear) per-character
  // stagger step — this composer's own per-line dilation has to be baked
  // in here, per whichever line/phase is currently showing, rather than
  // passing config straight through undilated.
  const effectiveMotionConfig = {
    ...config,
    heroPlaceholderRevealStepDelayMs: config.heroPlaceholderRevealStepDelayMs * (
      introPhase === 'line2' ? config.introLine2TimeDilation : config.introLine1TimeDilation
    ),
  };
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const router = useRouter();

  const handleSubmit = useCallback(() => {
    const text = value.trim();
    if (!text) return;
    // Synchronous, no `await` between the write and the navigation call —
    // both happen in the same click/keydown handler, so there's no async
    // gap for a race to open between writing the draft and leaving this
    // page (see helpers/pendingComposerDraft.ts's own doc comment).
    setPendingComposerDraft(text);
    void router.push('/contact');
  }, [value, router]);

  return (
    <>
      {/* Visually-hidden fallback for non-JS/crawler visitors — the
          composer below is a real <textarea>, not a link, so it carries no
          href of its own. This preserves the one path into /contact that
          the previous CTA-button rendering used to provide. Inert for
          JS-enabled visitors, who submit through the composer itself. */}
      <a href="/contact" className="sr-only">
        {INTRO_LINE_1}
      </a>
      <ComposerPill
        align={config.composerAlign}
        className={className}
        // Never auto-focused: this composer appears via a passive, timed
        // transition, not a direct user action — stealing keyboard focus
        // from a background timer would be jarring, especially if the
        // visitor is reading elsewhere on the page when it fires. It simply
        // sits there, ready, until the visitor deliberately clicks/taps/
        // tabs to it.
        autoFocus={false}
        bounceElevationPx={0}
        bounceOnSubmitEnabled={false}
        chrome={config.chrome}
        composerElevationPx={config.composerElevationPx}
        ctaButtonConfig={ctaButtonConfig}
        disabled={false}
        elevationEntranceDelayMs={switchDelayMs}
        elevationEntranceDurationMs={config.elevationRiseDurationMs}
        elevationEntranceEasing={CTA_BUTTON_MOTION_EASINGS[config.elevationRiseEasing]}
        // Starts perfectly flat — unlike a composer that morphs out of an
        // already-elevated element in place, this one was never anything
        // but itself, so there's no prior on-screen elevation to inherit.
        elevationEntranceFromPx={0}
        heroPhase="centered"
        introColorTransitionDelayMs={colorTransitionDelayMs}
        introColorTransitionDurationMs={prefersReducedMotion ? 0 : config.placeholderColorTransitionDurationMs}
        introColorTransitionEasing={CTA_BUTTON_MOTION_EASINGS[config.placeholderColorTransitionEasing]}
        introOpacity={introPhase === 'line1-exit' ? 0 : 1}
        introOpacityTransitionDurationMs={prefersReducedMotion ? 0 : config.introLine1ExitDurationMs}
        introOpacityTransitionEasing={CTA_BUTTON_MOTION_EASINGS[config.introLine1ExitEasing]}
        introText={introPhase === 'line2' ? undefined : INTRO_LINE_1}
        introUnitTranslateYPx={config.introUnitTranslateYPx}
        motionConfig={effectiveMotionConfig}
        onChange={setValue}
        onSubmit={handleSubmit}
        overlayCadenceAmount={config.introRevealCadenceAmount}
        overlayDistribution={config.introRevealDistribution}
        placeholder={REVEALED_PLACEHOLDER}
        placeholderMinContrast={config.placeholderMinContrast}
        // Line 1's own entrance gets the configured lead-in gap; both the
        // exit (a direct continuation of the hold, no gap of its own) and
        // line 2 (introLine1HoldMs already provided its lead-in pause — see
        // useHeroComposerIntroPhase's own doc comment) start at 0 extra
        // delay.
        placeholderRevealInitialDelayMs={introPhase === 'line1' ? line1RevealInitialDelayMs : 0}
        surfaceColor={surfaceColor}
        textareaRef={textareaRef}
        value={value}
      />
    </>
  );
}
