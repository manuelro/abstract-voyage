# Wordmark ↔ Scroll-Gradient-Background Integration — Findings & Plan

## Part 1 — Findings: does the wordmark already support a gradient?

**Yes, confirmed.** The wordmark component (`experiences/abstract/components/Logo.tsx`,
`LogoWithGradientBg`) renders `BRAND_WORDMARK_GLYPH_PATHS`
(`components/BrandWordmark.tsx` — fixed vector glyph outlines, not live text)
through a real SVG `<linearGradient>`/`<radialGradient>` fill
(`helpers/SvgGradientDef.tsx`), driven by a `stops: SvgStop[]` array
(`helpers/gradientMath.ts`, `{ color: string; at: number }[]`). This is the
same "legacy system" mentioned in the task — `Logo.tsx`'s own
`DEFAULT_STOPS` is generated once via `generateHarmonicGradient`
(`helpers/harmonicGradient.ts`) with a hardcoded 22-stop, mono-hue recipe.

**What the config layer (`SiteHeader/config/wordmark.ts`, the file named in
scope) actually exposes today is narrower than what the component can do.**
`WordmarkConfig.colorMode` has 4 values, resolved by
`resolveSiteHeaderLogoStops` (`SiteHeader/hooks/resolveSiteHeaderLogoStops.ts`):

| colorMode | Stops produced |
|---|---|
| `custom` | `color` at both 0 and 100 — a **flat** color, rendered through the gradient machinery but visually a solid fill |
| `surface` | page-surface-derived flat color, same both-stops-identical pattern |
| `column` | contrast-search-derived flat color against the split column, same pattern |
| `adaptive` | **the one real gradient path** — returns whatever `SvgStop[]` the calling page supplies via `SiteHeader`'s `logoStops` prop, unresolved internally |

So: **three of the four modes are flat color dressed as a degenerate
gradient; only `adaptive` mode renders an actual multi-stop gradient**, and
only when the page passes one in. Today, `pages/abstract.tsx` is the only
caller that does — it's wired to a bespoke, page-local system
(`backgroundAwarenessActive` + hardcoded `ABSTRACT_SYNTH_LOGO_STOPS`/
`ABSTRACT_SYNTH_LOGO_DARK_STOPS`, chosen by a `headerTone` flag), unrelated to
`PolymorphicLayout`'s scroll-gradient-background feature. `about.tsx` and
other `PolymorphicLayout` pages don't use `adaptive` mode at all today.

**Conclusion: the wordmark's rendering capability already fully supports an
arbitrary multi-stop gradient — nothing needs to change in `Logo.tsx` or
`SvgGradientDef`. The gap is entirely in wiring: `adaptive` mode needs a
stop array from *somewhere*, and today nothing connects it to
`PolymorphicLayout`'s scroll-gradient-background.**

## Part 2 — Feasibility: reusing the scroll-gradient's own recipe

**Very feasible, and closer than it first looks — both systems already use
the exact same generator.** `PolymorphicScrollGradientBackground.tsx` builds
its background with the identical `generateHarmonicGradient()` call
`Logo.tsx`'s own `DEFAULT_STOPS` uses, and both produce the same `SvgStop[]`
shape. This isn't "similar" infrastructure — it's the literal same function.

The scroll-gradient's palette lives in `PolymorphicLayoutConfig`
(`PolymorphicLayout.config.ts`) as 9 tiered knobs per breakpoint
(`scrollGradientBaseHue(-Wide/-Lg)`, `-HueScheme`, `-LightnessMin`,
`-ChromaMin`, `-Mode`, `-Stops`, `-Variance`, `-CenterStretch`, `-Seed`),
plus a per-tier **ink color** (`scrollGradientInkColor(-Wide/-Lg)`) that the
feature *already* uses to decide what text/ink color reads well against that
tier's background (`/abstract` mobile: `#1b67ff`; wide/lg: `#f8fafc`).

**This ink color is the answer to "does it need a light or dark wordmark" —
it's already been decided, per tier, by whoever tuned the background.** No
new heuristic needs inventing: read the active tier's `scrollGradientInkColor`,
check its own lightness (`colord(ink).isLight()` — the `colord` a11y plugin
is already a dependency, already used this way in
`helpers/surfaceColorDerivation.ts`), and that tells us which direction to
retarget the wordmark's gradient toward.

**The "transform" itself:** call `generateHarmonicGradient()` again with the
*same* `baseHue`/`hueScheme`/`chromaRange.min`/`mode`/`variance`/
`centerStretch`/`seed` as the active tier (so the wordmark reads as
unmistakably drawn from the same palette family/hue rhythm as the
background), but override `lightnessRange.min` and `stops` count for
legibility purposes:
- If the tier's ink is **light** → use a light-leaning `lightnessRange`
  (e.g. `{ min: 65 }`, matching `Logo.tsx`'s own current default) and a
  smaller stop count appropriate for a wordmark, not a full-viewport field
  (e.g. `~16–22`, matching `Logo.tsx`'s existing 22).
- If the tier's ink is **dark** → a dark-leaning `lightnessRange`
  (e.g. `{ min: 12–18 }`).

Using the raw `scrollGradientLightnessMin` verbatim (often `10-11`, tuned
for a moody full-viewport backdrop) would render the wordmark nearly
illegible against a similarly dark page — this retargeting step is exactly
why the task calls for a "transform for clarity," not a direct 1:1 copy.

**A further, cheap bonus worth flagging (not required, optional phase 2):**
the scroll-gradient background also live-darkens on scroll via a CSS custom
property (`--polymorphic-scroll-gradient-darken`, written every frame by a
`requestAnimationFrame` loop in `PolymorphicScrollGradientBackground.tsx`).
The wordmark's SVG could sync to this for free with a single
`filter: brightness(calc(1 - var(--polymorphic-scroll-gradient-darken) * k))`
rule — reusing the exact same live CSS variable, zero extra JS. Recommend
treating this as a follow-up, not part of this feature's first cut.

## Part 3 — Implementation plan

### New config surface: `PolymorphicLayoutConfig` (not `WordmarkConfig`)

Per the task, the opt-in lives under the BACKGROUND tab in
`PolymorphicLayout.panel.ts`, so the fields belong on
`PolymorphicLayoutConfig`, not on the wordmark's own config type. Two new
fields, **not tiered** (a single global decision, independent of which
breakpoint tier's palette is currently active — see below):

```ts
/** Opt-in: when true AND the currently-active tier's own
 * scrollGradientEnabled(-Wide/-Lg) is also true, the wordmark's gradient is
 * derived from that same tier's scroll-gradient recipe (same baseHue/
 * hueScheme/chromaRange/mode/variance/centerStretch/seed), retargeted in
 * lightness for legibility — see wordmarkGradientClarity below. Off by
 * default: every page's wordmark keeps its current WordmarkConfig-driven
 * color untouched unless a page explicitly opts in. */
wordmarkUsesScrollGradient: boolean;
/** 'auto' (default): the lightness retarget direction (light-leaning vs
 * dark-leaning gradient) is read from the active tier's own
 * scrollGradientInkColor(-Wide/-Lg) — the same color the feature already
 * uses to decide "does this background need light or dark ink." 'light'/
 * 'dark' force a direction regardless of the ink color, for a page whose
 * background doesn't cleanly resolve to one or the other. */
wordmarkGradientClarity: 'auto' | 'light' | 'dark';
```

Why not tiered ×3 (base/Wide/Lg) like the scroll-gradient fields themselves:
the wordmark is one instance rendered by `SiteHeader`, not re-mounted per
breakpoint — the *toggle* and *clarity override* are one global operator
decision. What DOES vary per breakpoint is which tier's recipe is currently
active, and that's resolved at read-time from whichever
`scrollGradientEnabled(-Wide/-Lg)` is true right now — the same resolution
`usePolymorphicLayoutColors()` already performs for ink/paint colors.

### Computation: a new exported helper + a `usePolymorphicLayoutColors()` field

Add a small pure function (new file,
`experiences/abstract/components/PolymorphicScrollGradientWordmarkStops.ts`,
or inline in `PolymorphicLayout.tsx` if small enough) that:
1. Takes the active tier's 9 scroll-gradient palette fields + ink color +
   `wordmarkGradientClarity`.
2. Resolves the light/dark direction (`'auto'` → `colord(ink).isLight()`;
   otherwise the forced value).
3. Calls `generateHarmonicGradient()` with the same hue/scheme/chroma/mode/
   variance/centerStretch/seed, a direction-selected `lightnessRange`, and a
   wordmark-appropriate `stops` count.
4. Returns `SvgStop[] | undefined` (`undefined` when
   `wordmarkUsesScrollGradient` is off, or the active tier's own
   `scrollGradientEnabled(-Wide/-Lg)` is off — nothing to derive from).

Expose the result as a new field on `usePolymorphicLayoutColors()`'s return
value, e.g. `colors.wordmarkGradientStops`.

### Per-page wiring (small, mechanical, one spot per page)

Each `PolymorphicLayout`-consuming page that renders `<SiteHeader>`
(`abstract.tsx`, `about.tsx`, `contact.tsx`, `posts/[slug].tsx`) needs to
pass the computed stops through when present:

```tsx
<SiteHeader
  wordmarkConfig={colors.wordmarkGradientStops ? { ...wordmarkConfig, colorMode: 'adaptive' } : wordmarkConfig}
  logoStops={colors.wordmarkGradientStops}
  ...
/>
```

This is the one place true cross-cutting wiring is unavoidable — `adaptive`
mode is a per-page prop on `SiteHeaderProps`/`WordmarkConfig`, not something
`PolymorphicLayout` can inject on its own. Worth calling out explicitly
since it's the main reason this isn't a single-file change despite the
scope note only naming `wordmark.ts`.

### Panel: new "Wordmark" group under BACKGROUND

`PolymorphicLayout.panel.ts`'s existing `background` area (added by
`PLAN-POLYMORPHIC-SCROLL-GRADIENT-BACKGROUND.md`) already has ALL SIZES /
MOBILE / TABLET / DESKTOP tabs. Since the two new fields are global (not
tiered), they belong in the **ALL SIZES** tab — the same place
`scrollGradientTauMs` (the one other non-tiered field in that area) already
lives — as a new group:

```ts
{
  kind: 'group',
  label: 'Wordmark',
  fields: [
    { kind: 'boolean', key: 'wordmarkUsesScrollGradient', label: 'Use scroll gradient for wordmark' },
    {
      kind: 'enum', key: 'wordmarkGradientClarity', label: 'Clarity direction',
      options: [{ label: 'AUTO (from ink color)', value: 'auto' }, { label: 'LIGHT', value: 'light' }, { label: 'DARK', value: 'dark' }],
      visibleWhen: config => config.wordmarkUsesScrollGradient,
    },
  ],
}
```

### Files touched (estimate)

- `experiences/abstract/components/PolymorphicLayout.config.ts` — 2 new
  fields + normalize/default entries.
- `experiences/abstract/components/PolymorphicLayout.tsx` — new derived
  `wordmarkGradientStops` field in `usePolymorphicLayoutColors()`.
- New: `PolymorphicScrollGradientWordmarkStops.ts` (or inline) — the
  retargeting helper.
- `experiences/abstract/components/PolymorphicLayout.panel.ts` — new
  "Wordmark" group in the BACKGROUND → ALL SIZES tab.
- `experiences/abstract/components/PolymorphicLayout.pageConfigs.ts`,
  `pages/contact.config.ts` — default the 2 new fields (`false`/`'auto'`)
  on every existing page config literal (`satisfies` will otherwise fail).
- `pages/abstract.tsx`, `pages/about.tsx`, `pages/contact.tsx`,
  `pages/posts/[slug].tsx` — one-line `wordmarkConfig`/`logoStops` wiring
  each, at their existing `<SiteHeader>` call sites.
- `experiences/abstract/components/SiteHeader/config/wordmark.ts` — no
  change needed; `adaptive` mode already exists and does exactly what's
  required.

### Verification plan

- Dev server, `/abstract` (the only page with `scrollGradientEnabled: true`
  today) mobile viewport: toggle `wordmarkUsesScrollGradient` on in the
  panel, confirm the wordmark's gradient stops visually match the
  background's hue family while remaining legible (screenshot comparison).
- Toggle `wordmarkGradientClarity` between `auto`/`light`/`dark`, confirm
  the wordmark visibly shifts lighter/darker while the background is
  unaffected.
- Confirm the toggle is off by default and every other page (`/about`,
  `/contact`, `/journal`, `/posts/[slug]`) is visually unchanged.
- Resize across the Wide/Lg breakpoints on a page where the active tier's
  `scrollGradientEnabled` differs (e.g. `/abstract`: on for mobile, off for
  Wide/Lg) and confirm the wordmark gradient correctly disengages back to
  its normal `WordmarkConfig` color once the active tier's scroll-gradient
  turns off.
