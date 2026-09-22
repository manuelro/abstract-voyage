/** Stub for `next/font/google` under Vitest — see vitest.config.ts's own
 * `resolve.alias` for where this is wired in. `next/font/google` is a
 * Next.js build-time compiler macro (SWC), not a real runtime export; it
 * only resolves inside `next build`/`next dev`. Any test file that imports
 * (even transitively) a module which itself imports `next/font/google` —
 * e.g. pages/contact.tsx importing pages/_app.tsx's own `siteSans` (see its
 * doc comment) — throws "Instrument_Sans is not a function" under Vitest's
 * plain esbuild transform without this stub.
 *
 * Named exports only (no Proxy/default-export trick): Vite's dependency
 * scanner needs statically-analyzable named exports to satisfy `import {
 * Instrument_Sans, Instrument_Serif } from 'next/font/google'` — a
 * dynamically-built object can't be detected that way. Add a new named
 * export here if a future `next/font/google` import needs one. */
const stubFontLoader = () => ({
  className: 'mock-font',
  style: { fontFamily: 'mock-font-family' },
  variable: '--mock-font-family',
});

export const Instrument_Sans = stubFontLoader;
export const Instrument_Serif = stubFontLoader;
