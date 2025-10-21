// Minimal, SSR-safe motion/config helpers used across the app.
// Provides both default and named exports to satisfy various import styles. // pocoyo-soft

export const PREFER_REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  try {
    return window.matchMedia(PREFER_REDUCED_MOTION_QUERY).matches
  } catch {
    return false
  }
}

/**
 * SSR-only body background CSS.
 * Kept independent of runtime CONFIG to avoid circular deps and to be safe on the server.
 * Matches the sphere theme (subtle dark vertical/radial blend).
 */
// Shared background palette (single source of truth) // pocoyo-soft
const BG_TOP = '#213D6E'   // deep indigo
const BG_MID = '#0E5170'   // rich teal
const BG_BOTTOM = '#2F6266'// emerald // pocoyo-soft
/** Export all three gradient stops for reuse (top/mid/bottom). */ // hvle
export function bgStops() {
  return { top: BG_TOP, mid: BG_MID, bottom: BG_BOTTOM }
}

export function bodyBgCSS(): string {
  const top = BG_TOP
  const bottom = BG_BOTTOM
  // Lightweight, works in SSR without side effects
  return `
    body {
      background: linear-gradient(185deg, ${BG_TOP} 0%, ${BG_MID} 48%, ${BG_BOTTOM} 100%);
      background-color: ${BG_BOTTOM}; /* darkest of the three to avoid flash — hvle */
      background-attachment: fixed;
    }
  `.trim()
}

/** Canonical z-depths used by pages/index.tsx and friends (SSR-safe). */
const Z = {
  front: 1,
  center: 0,
  back: -1,
  footer: 5, // keep UI elements (like the immersive footer) above the main layers // pocoyo-soft
} as const

/** Named export expected by some call sites: `import { exp } ...` then `exp.z.front`. */
export const exp = { z: Z } as const

/** Also export `z` directly so `import * as exp ...; exp.z.front` works. */
export const z = Z

/** Motion + background config consumed by pages/index.tsx */ // pocoyo-soft
export const experienceMotion = {
  z: Z,
  durations: {
    // animation durations used by the page
    fadeMs: 500,
    dissolveMs: 800,
  },
  delays: {
    // small stagger so immersive layer fades in before sphere re-inflates
    immersiveSoftIntroMs: 180,
  },
  easing: {
    // CSS timing used by the page for fades
    fadeCss: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  bg: {
    top: BG_TOP,
    bottom: BG_BOTTOM,
    repeat: 'no-repeat',
    size: 'cover',
    attachment: 'scroll',
  },
} as const

/** Scalar tween used by the dissolve tween on the page (easeInOutCubic). */ // pocoyo-soft
export function tweenFn(t: number): number {
  t = Math.min(1, Math.max(0, t))
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** Watchdog duration for when CSS `transitionend` might not fire. */ // pocoyo-soft
export function fadeWatchdogMs(animate: boolean): number {
  return animate ? experienceMotion.durations.fadeMs + 50 : 0
}

/** Returns the layered background (used as `backgroundImage`). */ // pocoyo-soft
export function backgroundLayers(): string {
  return `linear-gradient(180deg, ${BG_TOP} 0%, ${BG_BOTTOM} 100%)`
}

export const EXPERIENCE_MOTION = {
  // Keep the rich motion/background config
  ...experienceMotion,
  // Keep previous helpers on the default as well
  prefersReducedMotionQuery: PREFER_REDUCED_MOTION_QUERY,
  getPrefersReducedMotion,
  bodyBgCSS,
  // Back-compat aliases so "default as exp" or "{ exp }" both keep working
  z: Z,
  exp: { z: Z },
} as const

// Default export for consumers expecting a default.
export default EXPERIENCE_MOTION
