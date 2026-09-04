import Link from 'next/link';
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
 * `[text](href)` link syntax (Markdown's own inline-link shape) rides the
 * same split/map pass — a linked run always renders at emphasisOpacity with
 * a dotted 1px underline (deliberately distinct from a plain solid
 * underline — this site's body copy already uses bold/opacity for
 * **emphasis**, so a link needs its own, different "this is interactive"
 * cue rather than looking like a heavier emphasis run), since a plain color
 * change alone isn't reliably visible against a live gradient background.
 * One shared rule for every content-column link on the site (both the
 * narrow and wide columns of the main layout render through this same
 * function) — never a per-page variant. Internal-only in practice (every
 * current caller links to another route on this site), so a plain
 * `next/link` is correct here with no external-link branch to maintain.
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
const EMPHASIS_OR_LINK_PATTERN = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
const EMPHASIS_PATTERN = /^\*\*([^*]+)\*\*$/;
const LINK_PATTERN = /^\[([^\]]+)\]\(([^)]+)\)$/;

export function renderEmphasisText(
  text: string,
  dimOpacity: number,
  emphasisOpacity: number,
  emphasisClassName?: string,
  // PLAN-ABSTRACT-TYPOGRAPHY-COLOR-UNIFICATION.md Part C — when supplied,
  // applied as this run's own explicit `color` (both the **word** span and
  // the link), rather than the run inheriting whatever color its ancestor
  // paragraph resolved (today's only behavior, still exactly what happens
  // when this is omitted). A flat, opacity-free color — GlobalTypography-
  // Config's own resolveTypographyColors returns a bare ink hex, never an
  // alpha-baked rgba (an earlier version of this function assumed the
  // latter and hardcoded this run's own opacity to 1 whenever a color
  // override was present, silently discarding emphasisOpacity — fixed:
  // opacity is always this run's own emphasisOpacity/dimOpacity argument,
  // independent of whether a color override is supplied). Undefined for
  // every existing caller (About's narrative slides, AbstractPostDock,
  // contact.tsx) is byte-identical to before this param existed.
  emphasisColorOverride?: string,
): ReactNode[] {
  return text
    .split(EMPHASIS_OR_LINK_PATTERN)
    .filter(Boolean)
    .map((part, index) => {
      const linkMatch = part.match(LINK_PATTERN);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        return (
          <Link
            key={index}
            href={href}
            // Same emphasisClassName (font-weight) as a **word** run below —
            // a link is already visually distinguished by its dotted
            // underline, but the caller's chosen emphasis weight (e.g.
            // AbstractEditorialHero's emphasisFontWeight) is one visual
            // language for "this text is called out," and a link left at
            // the surrounding paragraph's own weight read as a third,
            // unrelated treatment. undefined for every caller that omits
            // emphasisClassName (About's narrative slides, contact.tsx) —
            // byte-identical to before for those.
            className={emphasisClassName}
            // Plain inline text-decoration, not Tailwind's decoration-dotted/
            // decoration-1 utilities: this file lives in helpers/, which
            // tailwind.config.js's own `content` glob list doesn't scan (only
            // pages/, components/, app/, experiences/, and one dpa-testing
            // path are covered) — those utility classes silently compiled to
            // nothing here, confirmed live (computed textDecorationStyle
            // still read 'solid'). Inline style has no such dependency.
            style={{
              opacity: emphasisOpacity,
              color: emphasisColorOverride,
              textDecorationLine: 'underline',
              textDecorationStyle: 'dotted',
              textDecorationThickness: '1px',
              textUnderlineOffset: '2px',
            }}
          >
            {label}
          </Link>
        );
      }
      const emphasisMatch = part.match(EMPHASIS_PATTERN);
      return emphasisMatch ? (
        <span
          key={index}
          className={emphasisClassName}
          style={{ opacity: emphasisOpacity, color: emphasisColorOverride }}
        >
          {emphasisMatch[1]}
        </span>
      ) : (
        <span key={index} style={{ opacity: dimOpacity }}>{part}</span>
      );
    });
}

// Every consumer of a **word**-marked/[text](href)-linked string that isn't
// rendering it through renderEmphasisText (aria-labels, plain-text titles,
// ...) needs both markers stripped instead of shown literally — link syntax
// first, so a link label containing e.g. an underscore is never mistaken for
// leftover emphasis markup by the second pass.
export function stripEmphasisMarkup(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1');
}
