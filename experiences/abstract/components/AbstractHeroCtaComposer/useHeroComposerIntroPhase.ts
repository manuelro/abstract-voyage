import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '../../../../helpers/usePrefersReducedMotion';
import {
  computeMagnificationDockRevealSchedule,
  type MagnificationDockRevealDistribution,
} from '../../../../helpers/magnificationDockRevealMath';

export type HeroComposerIntroPhase = 'line1' | 'line1-exit' | 'line2';

/** Total time a line's own stagger takes to fully resolve — the same
 * shared, DOM-agnostic scheduling helper AbstractPostDock's own card-intro
 * stagger uses (see Scatter.tsx's useScatterReveal). Cross-character start
 * times are always perfectly linear (index * staggerMs, staggerMs itself
 * dilated per line); distribution/cadenceAmount only ever vary each
 * character's own *duration* via a Gaussian bell, mirroring the cards
 * exactly. The line isn't done until the *last* character to finish
 * (start + duration) does — with a Gaussian duration spread that isn't
 * necessarily the highest-index character, so this takes the true max
 * across the whole schedule rather than assuming it. */
const lineSweepDurationMs = (
  text: string,
  baseMsPerChar: number,
  dilation: number,
  unitDurationMs: number,
  distribution: MagnificationDockRevealDistribution,
  cadenceAmount: number,
) => {
  const schedule = computeMagnificationDockRevealSchedule({
    itemCount: Array.from(text).length,
    staggerMs: baseMsPerChar * dilation,
    durationMs: unitDurationMs,
    distribution,
    cadenceAmount,
  });
  return schedule.reduce((max, item) => Math.max(max, item.startMs + item.durationMs), 0);
};

/**
 * Drives the abstract.tsx hero composer's three-phase placeholder intro:
 * 'line1' (line1Text enters, per-character) -> 'line1-exit' (the same,
 * already-fully-revealed line simply fades out as one block — see
 * ComposerPill's introOpacity prop; no per-character animation of its own)
 * -> 'line2' (the real, persistent placeholder enters).
 *
 * Returns two absolute-from-mount timestamps:
 * - switchDelayMs: when 'line2' begins — still what drives ComposerPill's
 *   elevationEntranceDelayMs and the placeholder swap itself.
 * - colorTransitionDelayMs: switchDelayMs + line2's own full stagger
 *   duration — the moment both lines have actually finished revealing, when
 *   ComposerPill's introColorTransitionDelayMs should fire.
 *
 * Reduced motion collapses every wait to effectively immediate — becoming a
 * real, ready-to-type placeholder is functional, not decorative, but
 * there's no reveal motion on the other side worth timing the wait against.
 */
export function useHeroComposerIntroPhase({
  line1Text, line2Text, line1RevealInitialDelayMs, baseMsPerChar, unitDurationMs,
  line1TimeDilation, line2TimeDilation, introLine1HoldMs, introLine1ExitDurationMs,
  distribution, cadenceAmount,
}: {
  line1Text: string;
  line2Text: string;
  line1RevealInitialDelayMs: number;
  baseMsPerChar: number;
  unitDurationMs: number;
  line1TimeDilation: number;
  line2TimeDilation: number;
  introLine1HoldMs: number;
  introLine1ExitDurationMs: number;
  distribution: MagnificationDockRevealDistribution;
  cadenceAmount: number;
}): { phase: HeroComposerIntroPhase; switchDelayMs: number; colorTransitionDelayMs: number } {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<HeroComposerIntroPhase>('line1');

  const line1EntranceSweepMs = lineSweepDurationMs(
    line1Text, baseMsPerChar, line1TimeDilation, unitDurationMs, distribution, cadenceAmount,
  );
  const line1ExitStartDelayMs = prefersReducedMotion
    ? 0
    : line1RevealInitialDelayMs + line1EntranceSweepMs + Math.max(0, introLine1HoldMs);
  const switchDelayMs = prefersReducedMotion
    ? 0
    : line1ExitStartDelayMs + Math.max(0, introLine1ExitDurationMs);
  const colorTransitionDelayMs = prefersReducedMotion
    ? 0
    : switchDelayMs
      + lineSweepDurationMs(line2Text, baseMsPerChar, line2TimeDilation, unitDurationMs, distribution, cadenceAmount);

  useEffect(() => {
    const exitTimeoutId = window.setTimeout(() => setPhase('line1-exit'), line1ExitStartDelayMs);
    const line2TimeoutId = window.setTimeout(() => setPhase('line2'), switchDelayMs);
    return () => {
      window.clearTimeout(exitTimeoutId);
      window.clearTimeout(line2TimeoutId);
    };
    // One-shot mount timers, deliberately not reactive to later prop/
    // preference changes — mirrors useComposerHeroPhase's own triggerExit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { phase, switchDelayMs, colorTransitionDelayMs };
}
