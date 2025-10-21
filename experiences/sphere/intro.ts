// Single source of truth for intro sequencing & timings.
// Tweak values here; no changes needed in the page component.

import type { CSSProperties } from 'react'
import { stagger } from 'motion'

// Small helper so callers don't depend on motion directly
export { stagger }

export type IntroEls = {
  stage: HTMLElement | null
  textNodes: HTMLElement[]
  header: HTMLElement | null
  logo: HTMLElement | null
  links: HTMLElement[]
  footer: HTMLElement | null
  footerLine1: HTMLElement | null
  footerLine2: HTMLElement | null
}

export function buildIntroFlow({
  CONFIG,
  ORCHESTRATION,
  GOLDEN,
}: {
  CONFIG: any
  ORCHESTRATION: any
  GOLDEN: number
}) {
  /* ---------------- Selectors (edit if markup changes) ---------------- */
  const selectors = {
    header: 'header[role="banner"]',
    headerLogo: 'header[role="banner"] .logo',
    headerLinks: 'header[role="banner"] nav a',
    sphereStage: '[data-sphere-page]',
    footerRoot: 'footer',
    footerLine1: '.line1',
    footerLine2: '.line2',
    sphereTextTargets: [
      '[data-sphere-page] h1',
      '[data-sphere-page] h2',
      '[data-sphere-page] h3',
      '[data-sphere-page] p',
      '[data-sphere-page] [data-reveal]',
    ],
  }

  /* ---------------- Tokens (easy knobs) ---------------- */
  const tokens = {
    // Durations (ms)
    sphereScaleMs: Math.round(CONFIG.behavior.intro.durationMs / GOLDEN),
    logoFadeMs: ORCHESTRATION.durations.header,
    menuFadeMs: ORCHESTRATION.durations.header,
    footerFadeMs: ORCHESTRATION.durations.footer,
    footerLine2HoldMs: 1800, // "read time" for the paragraph
    // Staggers (ms)
    textStaggerMs: 60,
    menuStaggerMs: 80,
    // Easing
    ease: ORCHESTRATION.ease as string,
    textEase: CONFIG.behavior.carouselFade.cssTiming as string,
    // Gate
    gateTimeoutMs: 4000,
    // Pre-hide (to avoid black flash)
    prehide: { scaleStart: 0.9 },
  }

  /* ---------------- Anchors (computed beats) ----------------
   * Desired order: sphere → logo → footer → nav → sphere text
   * Note: we keep using existing ORCHESTRATION keys; we merely
   *       re-time when the "chrome group" begins.
   */
  const sphereStart = 0
  const sphereEnd = tokens.sphereScaleMs

  // Small configurable gap before chrome, reusing existing delay key (kept reversible)
  const chromeGap = ORCHESTRATION.delays.afterTextEnd_toChromeGroup || 0
  const chromeStart = sphereEnd + chromeGap

  // Chrome sequence
  const logoStart = chromeStart
  const logoEnd = logoStart + tokens.logoFadeMs

  const footerStart = logoEnd
  const footerEnd = footerStart + tokens.footerFadeMs

  const menuStart = footerEnd

  // Text last (carousel fade duration drives total)
  const textStart = menuStart
  const textEnd = textStart + (CONFIG.behavior.carouselFade.durationMs ?? 0)

  // Footer line transitions (Line2 in → hold → out, then Line1 in)
  const footerLine2InEnd = footerStart + tokens.footerFadeMs
  const footerLine2OutStart = footerStart + tokens.footerFadeMs + tokens.footerLine2HoldMs
  const footerLine1InStart = footerStart + tokens.footerFadeMs + tokens.footerLine2HoldMs + tokens.footerFadeMs

  const anchors = {
    sphereStart,
    textStart,
    textEnd,
    chromeStart,
    logoEnd,
    menuStart,
    footerStart,
    footerEnd,
    footerLine2InEnd,
    footerLine2OutStart,
    footerLine1InStart,
  }

  /* ---------------- Pre-hide CSS (before first paint) ---------------- */
  const prehideCss = `
    ${selectors.sphereStage} {
      opacity: 0;
      transform: scale(${tokens.prehide.scaleStart});
      transform-origin: 50% 50%;
    }
  `

  /* ---------------- Step builder ----------------
   * Returns Motion-ready step tuples: [targets, keyframes, { at (sec), duration (sec), ... }]
   */
  function buildSteps(els: IntroEls) {
    const steps: any[] = []

    // Sphere: fade/scale in
    if (els.stage) {
      steps.push([
        els.stage,
        { opacity: [0, 1], scale: [tokens.prehide.scaleStart, 1] },
        { at: anchors.sphereStart / 1000, duration: tokens.sphereScaleMs / 1000, easing: tokens.ease },
      ])
    }

    // Logo
    if (els.logo) {
      steps.push([
        els.logo,
        { opacity: [0, 1], transform: ['scale(0.96)', 'scale(1)'] },
        // FIX: units are seconds (was passing ms); duration fixed to /1000 (was /250)
        { at: anchors.chromeStart / 1000, duration: tokens.logoFadeMs / 1000, easing: tokens.ease },
      ])
    }

    // Footer chrome (container) — after logo
    if (els.footer) {
      steps.push([
        els.footer,
        { opacity: [0, 1] },
        { at: anchors.footerStart / 1000, duration: tokens.footerFadeMs / 1000, easing: tokens.ease },
      ])
    }

    // Footer: Line 2 in → hold → out
    if (els.footerLine2) {
      els.footerLine2.style.opacity = '0'
      steps.push([
        els.footerLine2,
        { opacity: [0, 1] },
        { at: anchors.footerStart / 1000, duration: tokens.footerFadeMs / 1000, easing: tokens.ease },
      ])
      steps.push([
        els.footerLine2,
        { opacity: [1, 0] },
        { at: anchors.footerLine2OutStart / 1000, duration: tokens.footerFadeMs / 1000, easing: tokens.ease },
      ])
    }

    // Menu links (stagger) — after footer
    if (els.links.length) {
      const start = anchors.menuStart / 1000
      els.links.forEach(l => { l.style.opacity = '0'; })
      steps.push([
        els.links,
        { opacity: [0, 1], transform: ['translateY(0px)', 'translateY(0px)'] },
        // FIX: use /1000 for stagger timing (was /250)
        { at: start, duration: tokens.menuFadeMs / 1000, delay: stagger(tokens.menuStaggerMs / 1000), easing: tokens.ease },
      ])
    }

    // Sphere text — last
    if (els.textNodes.length) {
      els.textNodes.forEach(n => (n.style.opacity = '0'))
      steps.push([
        els.textNodes,
        { opacity: [0, 1], transform: ['translateY(6px)', 'translateY(0px)'] },
        {
          at: anchors.textStart / 1000,
          duration: CONFIG.behavior.carouselFade.durationMs / 1000,
          delay: stagger(tokens.textStaggerMs / 1000),
          easing: tokens.textEase,
        },
      ])
    }

    // Footer: Line 1 after Line 2 fades out
    if (els.footerLine1) {
      els.footerLine1.style.opacity = '0'
      steps.push([
        els.footerLine1,
        { opacity: [0, 1], transform: ['translateY(4px)', 'translateY(0px)'] },
        { at: anchors.footerLine1InStart / 1000, duration: tokens.footerFadeMs / 1000, easing: tokens.ease },
      ])
    }

    return steps
  }

  return {
    selectors,
    tokens,
    anchors,
    prehideCss,
    buildSteps,
    // tiny helper for pre-hide <style> tag
    prehideStyleTagId: 'intro-prehide',
  }
}
