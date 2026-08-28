import React, { type CSSProperties } from 'react';
import styles from './SplitTextReveal.module.css';
import {
  computeMagnificationDockRevealSchedule,
  type MagnificationDockRevealDistribution,
} from '../helpers/magnificationDockRevealMath';

export type SplitTextRevealUnit = 'char' | 'word';

type SplitTextRevealProps = {
  text: string;
  /** 'word': splits on whitespace, each word its own animated unit —
   * whitespace (including a blank-line paragraph break) is preserved as
   * plain text between units, never itself animated. 'char': every
   * character (via Array.from, so multi-byte/surrogate-pair-safe) is its
   * own unit. */
  unit: SplitTextRevealUnit;
  /** false renders every unit at full opacity immediately, no stagger —
   * same escape hatch SvgStaggerGroup's own `animate` prop provides.
   * Default: true. */
  animate?: boolean;
  /** Delay before the first unit's fade starts (ms). */
  initialDelayMs: number;
  /** Extra delay added per unit index (ms) — same role as
   * AbstractPostDock's own dockRevealStaggerMs: a perfectly linear,
   * evenly-spaced step between consecutive units' start times. */
  stepDelayMs: number;
  /** Duration of each unit's own fade (ms) — dockRevealDurationMs's
   * counterpart. Uniform across every unit unless cadenceAmount below
   * varies it. */
  unitDurationMs: number;
  /** Raw CSS easing string. Callers resolve a named easing token (e.g.
   * CTA_BUTTON_MOTION_EASINGS[config.heroGreetingRevealEasing]) before
   * passing it down — this component stays decoupled from that config
   * module, the same way SvgStaggerGroup takes a raw `easing` string. One
   * shared curve applied to every unit's own local opacity/transform
   * progress — never to the cross-unit delay distribution (see
   * stepDelayMs above), mirroring exactly how AbstractPostDock's card
   * intro applies its own shared easing to each card's local progress
   * while keeping cross-card start times perfectly linear. */
  easing: string;
  /** Shapes each unit's own *duration* (not delay) via a Gaussian bell
   * curve over unit index — 'linear' (default): every unit gets the same
   * unitDurationMs. 'gaussian'/'gaussian-inverse': mirrors
   * AbstractPostDock's own dockRevealDistribution exactly (same shared
   * helper, computeMagnificationDockRevealSchedule) — cross-unit delay
   * stays linear either way; only duration varies. */
  distribution?: MagnificationDockRevealDistribution;
  /** 0..1 strength of the Gaussian duration variation above — 0 (default)
   * means every unit's duration is unitDurationMs regardless of
   * distribution. Mirrors dockRevealCadenceAmount. */
  cadenceAmount?: number;
  /** Optional secondary motion alongside opacity — a unit enters settling
   * down from translateY(unitTranslateYPx) to its resting position.
   * Defaults to 0 (no transform at all) for every caller that doesn't set
   * it — a plain opacity fade, exactly as before this existed. */
  unitTranslateYPx?: number;
  className?: string;
  style?: CSSProperties;
};

const WORD_SPLIT_PATTERN = /(\s+)/;
const isWhitespace = (token: string) => /^\s+$/.test(token);

/**
 * Always renders a `sr-only` node carrying the full, unsplit text alongside
 * an `aria-hidden` visually-staggered version — screen readers get one
 * coherent announcement and never encounter the individually-animated
 * pieces (mirrors SvgStaggerGroup's own "label the container, don't expose
 * the split children" approach, adapted for text via a hidden twin rather
 * than an aria-label, since this is prose meant to be read verbatim).
 *
 * Every unit's own {startMs, durationMs} is computed once, up front, via
 * helpers/magnificationDockRevealMath.ts's computeMagnificationDockRevealSchedule
 * — the exact same shared, DOM-agnostic scheduling helper
 * AbstractPostDock's own card-intro stagger uses (see Scatter.tsx's
 * useScatterReveal). That keeps this component's stagger model identical in
 * shape: cross-unit start times are always perfectly linear
 * (index * stepDelayMs), and the only per-unit non-linearity is an optional
 * Gaussian *duration* multiplier (distribution/cadenceAmount) — easing is
 * never applied to cross-unit delay, only to each unit's own local
 * opacity/transform progress via CSS `animation-timing-function`. The
 * schedule is plain, static numbers baked into each unit's inline
 * animationDelay/animationDuration once per render — the actual animation
 * still plays via native CSS `@keyframes` (see SplitTextReveal.module.css),
 * not an ongoing per-frame JS loop.
 */
export function SplitTextReveal({
  text, unit, animate = true, initialDelayMs, stepDelayMs, unitDurationMs, easing,
  distribution = 'linear', cadenceAmount = 0, unitTranslateYPx,
  className = '', style,
}: SplitTextRevealProps) {
  const rootClassName = [styles.root, className].filter(Boolean).join(' ');

  if (!animate) {
    return (
      <span className={rootClassName} style={style}>
        {text}
      </span>
    );
  }

  const rootStyle = {
    ...style,
    '--split-easing': easing,
    '--split-translate-y': `${unitTranslateYPx ?? 0}px`,
  } as CSSProperties;

  // Precompute the total animated-unit count up front — word mode's
  // whitespace tokens never reach the tally below, so it can't be derived
  // from the mapped node count after the fact.
  const totalUnits = unit === 'word'
    ? text.split(WORD_SPLIT_PATTERN).filter(token => token && !isWhitespace(token)).length
    : Array.from(text).length;

  const schedule = computeMagnificationDockRevealSchedule({
    itemCount: totalUnits,
    staggerMs: stepDelayMs,
    durationMs: unitDurationMs,
    distribution,
    cadenceAmount,
  });

  const resolveUnitStyle = (unitIndex: number): CSSProperties => {
    const timing = schedule[unitIndex];
    return {
      animationDelay: `${initialDelayMs + (timing?.startMs ?? 0)}ms`,
      animationDuration: `${timing?.durationMs ?? unitDurationMs}ms`,
    };
  };

  let index = 0;
  const nodes: React.ReactNode[] = unit === 'word'
    ? text.split(WORD_SPLIT_PATTERN).map((token, tokenIndex) => {
      if (!token) return null;
      if (isWhitespace(token)) return token;
      const unitIndex = index;
      index += 1;
      return (
        <span key={tokenIndex} className={styles.unit} style={resolveUnitStyle(unitIndex)}>
          {token}
        </span>
      );
    })
    : Array.from(text).map((char, tokenIndex) => {
      const unitIndex = index;
      index += 1;
      return (
        <span key={tokenIndex} className={styles.unit} style={resolveUnitStyle(unitIndex)}>
          {char}
        </span>
      );
    });

  return (
    <span className={rootClassName} style={rootStyle}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{nodes}</span>
    </span>
  );
}
