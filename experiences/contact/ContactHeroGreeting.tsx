import React, { type CSSProperties } from 'react';
import { SplitTextReveal } from '../../components/SplitTextReveal';
import { CTA_BUTTON_MOTION_EASINGS, type CtaButtonConfig } from '../../components/CtaButton/config/registered';
import type { ContactExperienceConfig } from './ContactExperience.config';
import type { HeroPhase } from './useComposerHeroPhase';

/**
 * The pre-conversation greeting — deliberately not a ChatTurn (see
 * useComposerHeroPhase's doc comment): it has its own reveal technique, its
 * own one-time exit, and a fixed position above the composer rather than a
 * place in the scrolling turns feed. Unmounts for good once heroPhase
 * reaches 'settled' — it never re-enters the conversation, including after
 * scrolling the turns feed.
 *
 * Positioned absolute/bottom-full of the dock, not a normal flex-col
 * sibling of the composer: this keeps the composer's own vertical center
 * exactly at the dock's center regardless of how long the greeting text
 * is — a normal-flow greeting would grow the dock's own content height and
 * shift the composer away from true center. Safe to overlay this way
 * because the dock itself no longer needs to coordinate any percentage
 * math with the turns-feed (see useComposerHeroPhase's own doc comment) —
 * the greeting only ever overlaps the dock during the pre-submission
 * 'centered' phase, before any turn exists to hide.
 *
 * `text` carries its own blank-line paragraph break straight through to a
 * single SplitTextReveal — one continuous reading-order word sweep across
 * both paragraphs, with the gap preserved by SplitTextReveal's own
 * white-space: pre-line handling (identical to how pages/contact.tsx
 * already renders multi-paragraph turns).
 *
 * Deliberately its own, smaller/muted/narrower type treatment (not
 * conversationTextSizePx/messageMeasureCh) — this is auxiliary, temporary
 * context, not a conversation turn, and shouldn't read as one.
 *
 * The outer wrapper below reproduces the composer pill's own horizontal
 * region (`mx-auto max-w-[520px]`, matching MessageComposerPill's container
 * literal in pages/contact.tsx — keep the two in sync) plus its textarea's
 * own paddingX/paddingXDesktop, rather than spanning flush against the
 * dock's own left edge the way `inset-x-0` alone would. Without that, this
 * text starts further left than the pill itself (which is centered and
 * narrower than the dock whenever the dock is wider than 520px) *and*
 * further left again than the placeholder text inside it (inset by the
 * textarea's own padding) — visibly unaligned with the one piece of UI
 * it sits directly above.
 */
export function ContactHeroGreeting({
  config, phase, text, revealInitialDelayMs, textAlignClassName, ctaButtonConfig, className = '',
  instant = false,
}: {
  config: ContactExperienceConfig;
  phase: HeroPhase;
  text: string;
  /** Resolved, absolute-from-mount delay — the caller (pages/contact.tsx)
   * cascades config.heroGreetingRevealInitialDelayMs (the configured *gap*
   * after the placeholder finishes) on top of the container-fade and
   * placeholder-sweep durations, since only the caller has all three
   * available to compute that cascade. */
  revealInitialDelayMs: number;
  /** The same 'text-left'/'text-center' class GuidedIntake already computes
   * from config.messageTextAlign for every turn — reused here rather than
   * duplicating that ternary, so the greeting's own paragraph alignment
   * stays consistent with the rest of the conversation's. */
  textAlignClassName: string;
  /** Only paddingX/paddingXDesktop are actually read here — see this
   * component's own doc comment for why the greeting needs to match the
   * composer textarea's own horizontal inset. */
  ctaButtonConfig: CtaButtonConfig;
  className?: string;
  /** Skips the word-by-word/char stagger and shows the whole greeting at
   * full opacity immediately (passes straight through to SplitTextReveal's
   * own `animate` prop). Default false preserves today's staggered reveal
   * exactly. Set true for a visitor arriving with a carried draft from
   * abstract.tsx's own composer (see pages/contact.tsx's GuidedIntake) —
   * they already composed and submitted a message elsewhere; a slow
   * word-by-word intro before their message auto-sends reads as a stall,
   * not a welcome. */
  instant?: boolean;
}) {
  if (phase === 'settled') return null;

  const style = {
    opacity: phase === 'exiting' ? 0 : 1,
    transitionProperty: 'opacity',
    transitionDuration: `${config.heroGreetingExitDurationMs}ms`,
    transitionDelay: `${config.heroGreetingExitDelayMs}ms`,
    transitionTimingFunction: CTA_BUTTON_MOTION_EASINGS[config.heroGreetingExitEasing],
  } as CSSProperties;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-full mx-auto w-full max-w-[520px] mb-[var(--contact-hero-greeting-gap)] ${ctaButtonConfig.paddingX} ${ctaButtonConfig.paddingXDesktop}`}
    >
      <div
        className={`whitespace-pre-line ${textAlignClassName} max-w-[var(--contact-hero-greeting-measure)] text-[length:var(--contact-hero-greeting-size)] leading-[var(--contact-line-height)] text-[color:var(--contact-muted)] opacity-[var(--contact-muted-opacity)] ${className}`}
        style={style}
      >
        <SplitTextReveal
          animate={!instant}
          text={text}
          unit={config.heroGreetingRevealUnit}
          initialDelayMs={revealInitialDelayMs}
          stepDelayMs={config.heroGreetingRevealStepDelayMs}
          unitDurationMs={config.heroGreetingRevealUnitDurationMs}
          easing={CTA_BUTTON_MOTION_EASINGS[config.heroGreetingRevealEasing]}
        />
      </div>
    </div>
  );
}
