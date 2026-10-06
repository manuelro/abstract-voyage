const { sm, md, lg, xl, xxl } = require('./breakpoints.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './experiences/**/*.{js,ts,jsx,tsx}',
    // Generated dpa-testing result pages are rendered live via
    // lib/dpaTestingComponents.ts (require.context) but live outside every
    // glob above, so their own classes (esp. accent colors like
    // bg-indigo-500) were never scanned and silently compiled to nothing --
    // rendering transparent instead of colored. See contrast-review-prompt.md.
    './dpa-testing/results/**/*.tsx',
  ],
  theme: {
    // Explicit (was previously omitted, implicitly falling through to
    // Tailwind's own identical defaults) — now genuinely sourced from
    // breakpoints.js, the one file every JS-side matchMedia/viewport
    // breakpoint check (components/breakpoints.ts) also derives from, so
    // the two can never silently drift again (PLAN-CENTRALIZED-BREAKPOINTS-
    // RESPONSIVE-CARD-STACK.md). Values are unchanged from Tailwind's own
    // defaults — this closes a gap, it doesn't move any breakpoint.
    screens: {
      sm: `${sm}px`,
      md: `${md}px`,
      lg: `${lg}px`,
      xl: `${xl}px`,
      '2xl': `${xxl}px`,
    },
    // Preflight uses fontFamily.sans for every element that inherits its
    // family. Keep every Tailwind typography token within the two approved
    // Instrument faces; font-mono intentionally resolves to Instrument Sans
    // as no separate monospace family is authorized for the site.
    fontFamily: {
      sans: ['var(--site-font-sans)'],
      serif: ['var(--site-font-serif)'],
      mono: ['var(--site-font-sans)'],
    },
    extend: {
      // Reusable sub-xs labels used anywhere a compact interface needs
      // precise 9/10/11px typography, including SiteHeader navigation.
      fontSize: {
        '4xs': '0.5625rem',
        '3xs': '0.625rem',
        '2xs': '0.6875rem',
      },
      // Percentage caps are useful for content inside either side of a
      // split layout. Keep them in the resolved global scale.
      maxWidth: {
        'percent-40': '40%',
        'percent-50': '50%',
        'percent-60': '60%',
        'percent-70': '70%',
        'percent-80': '80%',
        'percent-90': '90%',
        'percent-100': '100%',
      },
      // Tailwind 3.3 does not map the spacing scale into min-width/
      // min-height by default. This repository's registered config tokens
      // deliberately use literals such as min-h-11 for the shared 44px
      // coarse-pointer floor, so expose the existing spacing vocabulary to
      // those two utility families instead of replacing semantic tokens
      // with one-off arbitrary pixel classes at each consumer.
      minHeight: ({ theme }) => theme('spacing'),
      minWidth: ({ theme }) => theme('spacing'),
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
