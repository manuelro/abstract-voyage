import { sm, md, lg, xl, xxl } from '../breakpoints.js';

/**
 * The one place every React/TS-side breakpoint check in this repo reads
 * its threshold from — see ../breakpoints.js's own doc comment for why
 * that plain-CommonJS file (not this one) is the actual numeric source,
 * and PLAN-CENTRALIZED-BREAKPOINTS-RESPONSIVE-CARD-STACK.md for the full
 * incident this closes: five independent hardcoded copies of the same
 * md/lg pair (components/useBreakpointTier.ts, components/
 * SplitColumnPageShell/useSplitColumnNavAlignment.ts, experiences/synth/
 * components/TableOfContents.tsx, pages/about.tsx, experiences/abstract/
 * components/AbstractPostDock/hooks/viewport.ts), none aware of the
 * others, plus Tailwind's own `md:`/`lg:` classes resolving against
 * whatever tailwind.config.js's theme.screens says independently of all
 * five. breakpoints.test.ts asserts Tailwind's own resolved config still
 * matches these same numbers — this is enforced, not just conventional.
 */
export const SM_BREAKPOINT_PX = sm;
export const MD_BREAKPOINT_PX = md;
export const LG_BREAKPOINT_PX = lg;
export const XL_BREAKPOINT_PX = xl;
export const XXL_BREAKPOINT_PX = xxl;

export const SM_MEDIA_QUERY = `(min-width: ${sm}px)`;
export const MD_MEDIA_QUERY = `(min-width: ${md}px)`;
export const LG_MEDIA_QUERY = `(min-width: ${lg}px)`;
export const XL_MEDIA_QUERY = `(min-width: ${xl}px)`;
export const XXL_MEDIA_QUERY = `(min-width: ${xxl}px)`;

/** One px below md — the correct mobile-first complement to
 * MD_MEDIA_QUERY, derived rather than a second hardcoded literal (the
 * bug pages/about.tsx's own former NARROW_VIEWPORT_MEDIA_QUERY = '(max-
 * width: 767px)' was — correct only because someone did the arithmetic
 * by hand once). */
export const BELOW_MD_MEDIA_QUERY = `(max-width: ${md - 1}px)`;
