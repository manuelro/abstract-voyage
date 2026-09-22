import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  // next/font/google is a Next.js build-time compiler macro, not a real
  // runtime export — it only resolves under next build/next dev. Any test
  // that transitively imports it (e.g. pages/contact.tsx importing pages/
  // _app.tsx's own siteSans) throws under Vitest's plain esbuild transform
  // without this. See test/mocks/nextFontGoogle.ts's own doc comment.
  resolve: {
    alias: {
      'next/font/google': path.resolve(__dirname, 'test/mocks/nextFontGoogle.ts'),
    },
  },
  // Matches Next.js's own SWC transform (the automatic JSX runtime — no
  // `import React` needed per file). tsconfig's "jsx": "preserve" leaves the
  // actual transform to Next in the real app; esbuild (Vite/Vitest's own
  // transform) otherwise defaults to the classic runtime, which only some
  // files satisfy by importing React explicitly. Most don't (matching the
  // app's real build), so any test that mounts a real component tree via
  // createRoot instead of renderToStaticMarkup hits "React is not defined"
  // without this.
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'components/**/*.test.ts',
      'components/**/*.test.tsx',
      'experiences/**/*.test.ts',
      'experiences/**/*.test.tsx',
      'helpers/**/*.test.ts',
      'hooks/**/*.test.ts',
      'hooks/**/*.test.tsx',
      'netlify/**/*.test.js',
      'pages/**/*.test.ts',
      'pages/**/*.test.tsx',
    ],
  },
});
