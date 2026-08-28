// Canonical breakpoint pixel values — the one file every other breakpoint
// reference in this repo (Tailwind's own config, every JS-side matchMedia/
// viewport check) derives from. Plain CommonJS (not .ts) so tailwind.config.js
// — invoked by PostCSS/Tailwind's own CLI, not Next.js's webpack/TS pipeline
// — can require() it directly with no extra tooling. components/breakpoints.ts
// is the typed React/TS-side wrapper (tsconfig.json's own allowJs +
// esModuleInterop make importing this file from .ts a plain named import,
// no extra config needed).
//
// Values match Tailwind's own long-standing defaults exactly — this file
// doesn't change any breakpoint, it gives the numbers a single home so
// nothing else has to guess/duplicate them again. 'xxl' (not the literal
// '2xl') since a leading-digit property name can't be a plain JS/TS import
// identifier — tailwind.config.js maps this back onto the real '2xl'
// screens key explicitly.
module.exports = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
};
