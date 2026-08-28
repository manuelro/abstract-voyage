import type { ReactNode } from 'react';

/**
 * Site-wide inline `**word**` emphasis syntax — marked runs render at
 * emphasisOpacity, everything else at the dimmer dimOpacity. Originated in
 * the AbstractPostDock slider's minimal mode (pages/about.tsx's narrative
 * slides); promoted here once a second, unrelated component
 * (AbstractEditorialHero) started reusing it verbatim, so both — and
 * whatever else adopts the same convention next — read from one shared
 * implementation instead of each other's component-scoped helpers.
 *
 * `emphasisClassName` is optional and additive to the marked run only — it
 * exists because opacity alone can't always carry a visible highlight. A
 * contrast-locked body-text pairing (e.g. AbstractEditorialHero's, which
 * must hold a 4.5:1 floor) caps dimOpacity at ~0.88, which leaves at most a
 * ~12%-opacity gap to emphasisOpacity's ceiling of 1 — too subtle to read as
 * "highlighted" by eye, even though the two values are genuinely different.
 * A font-weight class sidesteps that ceiling entirely (heavier text at the
 * same color is never *less* contrasty), so it's the knob that actually
 * produces a visible highlight when the opacity gap alone can't. Omitted by
 * every caller that already has enough opacity gap to read clearly (About's
 * own 0.45/0.95 pairing) — those keep rendering exactly as before.
 */
export function renderEmphasisText(
  text: string,
  dimOpacity: number,
  emphasisOpacity: number,
  emphasisClassName?: string,
): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      const emphasisMatch = part.match(/^\*\*([^*]+)\*\*$/);
      return emphasisMatch ? (
        <span key={index} className={emphasisClassName} style={{ opacity: emphasisOpacity }}>{emphasisMatch[1]}</span>
      ) : (
        <span key={index} style={{ opacity: dimOpacity }}>{part}</span>
      );
    });
}

// Every consumer of a **word**-marked string that isn't rendering it through
// renderEmphasisText (aria-labels, plain-text titles, ...) needs the markers
// stripped instead of shown literally.
export function stripEmphasisMarkup(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}
