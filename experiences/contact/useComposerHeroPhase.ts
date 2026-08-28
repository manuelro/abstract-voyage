import { useEffect, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { CTA_BUTTON_MOTION_EASINGS } from '../../components/CtaButton/config/registered';
import { usePrefersReducedMotion } from '../../helpers/usePrefersReducedMotion';
import type { ContactExperienceConfig } from './ContactExperience.config';

export type HeroPhase = 'centered' | 'exiting' | 'settled';

/**
 * Drives the contact page's centered-hero-to-docked-conversation transition
 * with exactly one state value, flipped exactly once by the visitor's first
 * real submission. `hasExitedRef` makes triggerExit idempotent specifically
 * so more than one call site can reach for it without coordinating: see
 * pages/contact.tsx's submitFirstMessage (the normal path) and
 * handleSendAsIs (which can also be the first-ever submission, via its own
 * skip-ahead-to-identity branch).
 *
 * The turns-feed/spacer flex values resolve to their settled state
 * *instantly* the moment heroPhase leaves 'centered' (see
 * pages/contact.tsx's heroSpacerStyle — no transition on flex-grow itself)
 * — an already-rendered first message never has to reflow alongside a
 * container that's still resizing under it. The dock's own "glide to the
 * bottom" motion the design still wants is reproduced here instead, as a
 * plain CSS transform on the dock element itself, measured before and
 * after that instant layout change (the standard First-Last-Invert-Play
 * technique) rather than coupled to the layout change happening gradually.
 * `dockRef` is the one thing this hook needs from its caller to do that
 * measurement.
 */
export function useComposerHeroPhase(config: ContactExperienceConfig, dockRef: RefObject<HTMLElement>) {
  const [heroPhase, setHeroPhase] = useState<HeroPhase>('centered');
  const prefersReducedMotion = usePrefersReducedMotion();
  const hasExitedRef = useRef(false);
  const settleTimeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (settleTimeoutRef.current !== null) window.clearTimeout(settleTimeoutRef.current);
  }, []);

  const triggerExit = () => {
    if (hasExitedRef.current) return;
    hasExitedRef.current = true;

    if (prefersReducedMotion) {
      // The greeting is real copy, not decorative chrome — reduced motion
      // skips the *transition*, not the content; it was already shown at
      // full opacity during 'centered' (see ContactHeroGreeting), so
      // jumping straight to 'settled' here only removes it instantly
      // instead of animating the removal. No FLIP needed either: the dock
      // just lands in its settled position with no simulated motion.
      setHeroPhase('settled');
      return;
    }

    const dockEl = dockRef.current;
    const first = dockEl?.getBoundingClientRect();

    // Forces this specific update to commit synchronously, so the
    // getBoundingClientRect() below actually reads the *new* (settled)
    // layout rather than a stale, pre-update one — React's own documented
    // use case for flushSync.
    flushSync(() => {
      setHeroPhase('exiting');
    });

    if (dockEl && first) {
      const last = dockEl.getBoundingClientRect();
      const deltaY = first.top - last.top;
      if (deltaY !== 0) {
        // Invert: jump back to where the dock visually was, with no
        // transition, then read offsetHeight to force the browser to
        // register that jump before re-enabling the transition below —
        // without this forced reflow the two style writes would coalesce
        // and the "first" frame would never actually paint.
        dockEl.style.transition = 'none';
        dockEl.style.transform = `translateY(${deltaY}px)`;
        void dockEl.offsetHeight;
        // Play: transition back to identity, landing exactly where normal
        // flow already put it.
        dockEl.style.transitionProperty = 'transform';
        dockEl.style.transitionDuration = `${config.composerDockTransitionDurationMs}ms`;
        dockEl.style.transitionTimingFunction = CTA_BUTTON_MOTION_EASINGS[config.composerDockTransitionEasing];
        dockEl.style.transitionDelay = `${config.composerDockOverlapMs}ms`;
        dockEl.style.transform = 'translateY(0)';
      }
    }

    const dockDurationMs = config.composerDockOverlapMs + config.composerDockTransitionDurationMs;
    const greetingExitDurationMs = config.heroGreetingExitDelayMs + config.heroGreetingExitDurationMs;
    const settleAfterMs = Math.max(dockDurationMs, greetingExitDurationMs);
    settleTimeoutRef.current = window.setTimeout(() => {
      settleTimeoutRef.current = null;
      setHeroPhase('settled');
      // The FLIP is a one-shot; once it's finished, clear the imperative
      // styles rather than leaving them declared forever on an element
      // that never moves again.
      if (dockEl) {
        dockEl.style.transition = '';
        dockEl.style.transform = '';
      }
    }, settleAfterMs);
  };

  return { heroPhase, triggerExit };
}
