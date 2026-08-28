import type { CSSProperties } from 'react';

/**
 * PLAN-ABOUT-MOBILE-ACCORDION-COLLAPSE-REVEAL-FIX.md (correction,
 * 2026-08-25) — extracted from `View.tsx`'s own `renderDockItem` minimal-
 * mode branch, the real mechanism `/about`'s desktop accordion uses for its
 * per-row text: a plain opacity toggle, animated over the *same*
 * duration/easing as the row's own height/magnification transition — no
 * settle delay, no separate fade duration, and (confirmed via live,
 * frame-by-frame measurement) no transform of any kind. Any apparent
 * vertical "push" is entirely a side effect of the row's own height
 * animation reflowing its neighbors, never a deliberate translate on the
 * text itself. Shared so the mobile accordion (`AboutMobileAccordionItem`)
 * reads from the exact same implementation instead of re-deriving an
 * equivalent by hand — which is what produced two earlier, incorrect
 * mobile behaviors (a settle-gated fade borrowed from a *different* dock
 * variant's `ArticleCard`/`.detailFade` mechanism, and a translate-based
 * slide neither desktop variant actually has).
 */
export function abstractPostDockActiveOpacityStyle({
  isActive,
  transitionMs,
  easingCss,
}: {
  isActive: boolean;
  transitionMs: number;
  easingCss: string;
}): CSSProperties {
  return {
    opacity: isActive ? 1 : 0,
    transitionProperty: 'opacity',
    transitionDuration: `${transitionMs}ms`,
    transitionTimingFunction: easingCss,
  };
}
