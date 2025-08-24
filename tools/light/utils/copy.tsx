// @ts-nocheck
// Centralized UI copy (EN). Short, clear, and consistent.

export const COPY = {
  tabs: {
    light: 'Light',
    dark: 'Dark',
    primary: 'Primary',
    secondary: 'Secondary',
    accentLabel: 'Accent',
  },

  controls: {
    title: 'Pick your accent & steps',
    primaryBase: 'Accent color',
    deltaLabel: 'Delta (spacing)',
    deltaHelp: 'Golden-ratio spacing between steps.',
    levelsLabel: 'Steps (3–10)',
    secondaryLegend: 'Secondary accent (optional)',
    secondaryEnable: 'Use a secondary accent',
    secondaryHint: 'Turn this on to preview a second brand color.',
    reset: 'Reset',
  },

  ladders: {
    title: (min: number, max: number) => `Steps (${min}…+${max})`,
  },

  tinyUi: {
    title: 'Tiny preview',
    lightDesc: 'Light uses the light ladder. Defaults pick the closest step.',
    darkDesc: 'Dark uses the dark ladder (brighter center, richer shades).',
    primaryAction: 'Primary action',
    disabled: 'Disabled',
    wantDetails: 'Want details?',
    readGuide: 'Read the guide',
  },

  gallery: {
    title: 'Component gallery preview',
    typography: 'Type',
    hierarchy: 'Sizes & scale',
    h1: 'H1 Heading',
    h2: 'H2 Heading',
    bodyPrefix: 'Body text with ',
    bodyLink: 'link',
    bodySuffix: '.',
    smallLead: 'Small',
    smallTail: 'caption text.',
    buttons: 'Buttons',
    form: 'Form',
    email: 'Email',
    search: 'Search',
    table: 'Table',
    item: 'Item',
    status: 'Status',
    action: 'Action',
    statusActive: 'Active',
    statusReview: 'Review',
    view: 'View',
    tiles: 'Tiles',
  },

  a11y: {
    title: 'Accessibility check',
    passRateLabel: 'Accent links & focus passing',
    optimizeTo: (pct: number) => `Improve to ≥${Math.round(pct)}%`,
    optimizing: 'Optimizing…',
    tableNote:
      'Text AA ≥4.5 (AAA ≥7). Large text AA ≥3. UI (borders, focus) ≥3.',
  },

  export: {
    title: 'Export tokens',
    blurb: 'Click a button to copy. Paste into your project as described below.',
    help: [
      'CSS: paste into your global stylesheet. It defines :root and [data-theme="dark"] variables.',
      'Figma: open Tokens Studio → Import JSON → Paste → Create Light/Dark themes → Sync to Figma Variables.',
      'Tailwind: paste into tailwind.config.js (theme.extend.colors). Use [data-theme="dark"] in your app to switch.',
      'Bootstrap: paste the CSS into a file loaded after Bootstrap. It maps Bootstrap variables to your tokens.',
    ],
    buttons: {
      css: 'Copy CSS',
      json: 'Copy JSON',
      tailwind: 'Copy Tailwind',
      figma: 'Copy Figma',
      bootstrap: 'Copy Bootstrap',
    },
  },

  toasts: {
    copied: 'Copied!',
    hexCopied: 'HEX copied',
    cssCopied: 'CSS copied',
    jsonCopied: 'JSON copied',
    tailwindCopied: 'Tailwind config copied',
    figmaCopied: 'Figma tokens copied',
    bootstrapCopied: 'Bootstrap vars copied',
    resetDark: 'Reset to defaults (dark)',
    alreadyAt: (passPct: number, targetPct: number) =>
      `Already at ${Math.round(passPct)}% (target ${Math.round(targetPct)}%).`,
    optimized: (
      which: 'primary' | 'secondary',
      hex: string,
      passPct: number,
      targetPct: number
    ) =>
      `Optimized ${which} → ${hex} (${Math.round(passPct)}% ≥ ${Math.round(
        targetPct
      )}%).`,
    nudged: (passPct: number, targetPct: number) =>
      `Dark surface slightly darker. Now ${Math.round(
        passPct
      )}% ≥ ${Math.round(targetPct)}%.`,
    strongerTried: (val: number, passPct: number) =>
      `Tried stronger delta (${val.toFixed(3)}). Best is ${Math.round(
        passPct
      )}%.`,
    limits: (passPct: number) =>
      `Search limits reached. Best ${Math.round(
        passPct
      )}%. Try more hue drift or tweak surfaces.`,
  },
};
