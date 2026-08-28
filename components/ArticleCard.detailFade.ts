/**
 * PLAN-ABOUT-MOBILE-ACCORDION-COLLAPSE-REVEAL-FIX.md — the desktop
 * MagnificationDock engine's own "details fade" duration/easing
 * (`ArticleCard.module.css`'s `.detailFade` rule, previously hardcoded
 * there only). The one pair of values both `ArticleCard.tsx` (via the CSS
 * custom properties `.detailFade` now reads) and
 * `experiences/about/components/AboutMobileAccordionItem.tsx` (imported
 * directly, for its own equivalent opacity-only content fade) share, so
 * retuning "how fast a row's own details disappear" only ever requires
 * editing this one file. Lives here (not inside `experiences/abstract/...`)
 * because `ArticleCard` is a generic `components/` primitive — it must not
 * depend on an experience-specific module.
 */
export const ARTICLE_CARD_DETAIL_FADE_MS = 420;
// Matches AbstractPostDockEasingPreset's own 'luxury' curve
// (experiences/abstract/components/AbstractPostDock/config/registered.ts)
// exactly, as a plain CSS value — ArticleCard itself has no reason to
// depend on that experience-specific preset vocabulary for one literal.
export const ARTICLE_CARD_DETAIL_FADE_EASING_CSS = 'cubic-bezier(0.19, 1, 0.22, 1)';
