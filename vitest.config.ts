import { defineConfig } from 'vitest/config';

export default defineConfig({
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
      'netlify/functions/**/*.test.js',
      'pages/**/*.test.ts',
      'pages/**/*.test.tsx',
    ],
  },
});
