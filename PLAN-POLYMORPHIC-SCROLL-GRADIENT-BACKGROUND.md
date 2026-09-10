# Extract legacy scroll-driven gradient into PolymorphicLayout as a shared, root-level opt-in

## Context

The legacy scroll-gradient (`experiences/synth/components/SynthLayout.tsx`, deleted pre-`2f29e02`, recoverable via `git show '2f29e02^:experiences/synth/components/SynthLayout.tsx'`) painted the old `/posts/<slug>` article page: a fixed, full-viewport procedural radial gradient with a scroll-driven darkening overlay.

This has been re-implemented as a **shared `PolymorphicLayout` feature** — available to every page that consumes `PolymorphicLayout` (`/abstract`, `/about`, `/posts/[slug]`, `/journal`, `/contact`), opt-in **per breakpoint**, with **configurable colors**, filling **100% of the viewport** including the header row, and driving **downstream text/ink color**.

Two earlier iterations were superseded by explicit correction:
1. Wiring it into `pages/abstract.tsx`'s own bespoke `GradientDesignerPanel`/`skyRenderMode` system — rejected (nested inside the dead `presentationMode === 'classic'` branch, not the page's live config UI).
2. Modeling it as a fifth `PolymorphicLayoutColorSource` value (`colorSource: 'scrollGradient'`) — rejected: the scroll gradient must not be tied to either the content columns or the header, and its panel controls must live at the panel's own root, not nested inside the CONTENT tab's per-column "Column colors" groups.

## Final architecture: `scrollGradientEnabled`, a root-level override independent of `colorSource`

`PolymorphicLayoutConfig` (`experiences/abstract/components/PolymorphicLayout.config.ts`) has a new, independent, per-breakpoint-tiered boolean: `scrollGradientEnabled` / `scrollGradientEnabledWide` / `scrollGradientEnabledLg`. It does **not** touch `PolymorphicLayoutColorSource` (`'none' | 'palette' | 'custom' | 'surface'`, unchanged) — a column keeps whatever `colorSource` it's configured with, but when `scrollGradientEnabled` resolves true at the current tier, that decision is overridden: both columns' paint becomes transparent and the header row is no longer blocked either, letting the fixed background show through everywhere.

In `usePolymorphicLayoutColors` (`PolymorphicLayout.tsx`):
1. `wideColumnColorFromSource`/`narrowColumnColorFromSource` — the normal `colorSource`-derived color, computed exactly as before (unchanged `resolveColumnColor()`).
2. `scrollGradientActive = tier(scrollGradientEnabled, -Wide, -Lg)`.
3. Final `wideColumnColor`/`narrowColumnColor` (the public ink/contrast fields every downstream consumer already reads) = `scrollGradientActive ? scrollGradientInkColor : ...FromSource`.
4. `wideColumnPaintColor`/`narrowColumnPaintColor` = `scrollGradientActive ? 'transparent' : wideColumnColor`.

## Not tied to content or header

- `PolymorphicLayout.tsx` mounts `<PolymorphicScrollGradientBackground>` as a `position: fixed inset-0` **sibling** of `<SplitColumnPageShell>` (both header and body), not a descendant of either.
- `<SplitColumnPageShell>`'s own `backgroundColor` prop, and both columns' `wideColumnStyle`/`narrowColumnStyle` `backgroundColor`, are forced transparent whenever `scrollGradientActive` — including a final override spread *after* any page's own (possibly stale) `backgroundColor` in `wideColumnStyle`/`narrowColumnStyle`, since several pages redundantly pass `colors.wideColumnColor` there themselves (harmless before this feature existed, since paint == ink for every other `colorSource`).
- **MobilePinnedArticleSection** (`pages/abstract.tsx`) is a separate call site that paints its own background from `carouselColor`/`panelColor` props, entirely bypassing `PolymorphicLayout`'s own style merge. It was still reading `colors.wideColumnColor` (ink) instead of `colors.wideColumnPaintColor` — this is what caused the light `#f8fafc` background visible behind the timeline/carousel area. Fixed by switching both props to `colors.wideColumnPaintColor`.
- `MobilePinnedArticleSection/styles.module.css`'s `.panel` background used `rgb(from var(--mobile-pinned-panel-color) r g b / var(--mobile-pinned-panel-opacity))`, which discards the input color's own alpha — feeding it `'transparent'` produced opaque-black-at-opacity, not see-through. Fixed by switching to `color-mix(in srgb, var(--mobile-pinned-panel-color) calc(var(--mobile-pinned-panel-opacity) * 100%), transparent)`, which correctly composites to full transparency when the input is `'transparent'`.

## Panel: a root-level BACKGROUND area, not nested in CONTENT

`PolymorphicLayout.panel.ts`'s `POLYMORPHIC_LAYOUT_FIELDS` top-level shape is `{ kind: 'areas', areas: [HEADER, CONTENT] }`. Added a third, sibling area — `{ id: 'background', label: 'BACKGROUND', fields: [...] }` — inserted between HEADER and CONTENT in the `areas` array. It has its own ALL SIZES / MOBILE / TABLET / DESKTOP tabs (same shape as HEADER/CONTENT), each tab holding that tier's `scrollGradientEnabled(-Wide/-Lg)` toggle plus the 9 palette knobs, ink color, and darken-range/max-darken fields, gated `visibleWhen` on that tier's own `scrollGradientEnabled*`. `scrollGradientTauMs` (not tiered) lives in the ALL SIZES tab.

The `colorSource`/`colorSourceWide`/`colorSourceLg` enum fields (in CONTENT's own "Column colors" groups) no longer have a `'scrollGradient'` option — reverted to their original 4 values.

## The 9 palette knobs, and why only 9

`BASE_SYNTH_GRADIENT_CONFIG` (the legacy default) only set 9 of the 15 fields `helpers/harmonicGradient.ts`'s `GradientConfig` supports: `baseHue`, `hueScheme`, `lightnessRange.min`, `chromaRange.min`, `mode`, `stops`, `variance`, `centerStretch`, `seed`. Those 9 are tiered (base/Wide/Lg, 27 fields); the other 6 (`hueSpread`, `secondaryHue`, `zoom`, `perStopLightness`, `perStopChroma`, `contrast`) are never exposed — always passed `undefined`, matching legacy behavior exactly. `scrollGradientBaseHue` defaults to `215` (legacy literal `575`, pre-normalized mod 360) and `scrollGradientVariance` defaults to `1` (legacy literal `100`; the generator clamps variance to `[0,1]` internally, so `100` was always effectively `1`).

## Files

- `experiences/abstract/components/PolymorphicLayout.config.ts` — `scrollGradientEnabled`/-Wide/-Lg + 37 palette/ink/darken fields; `resolveColumnColor()` reverted to its original 4-branch form (no `scrollGradient` case).
- `experiences/abstract/components/PolymorphicLayout.tsx` — override logic in `usePolymorphicLayoutColors`; fixed-background mount point; `backgroundColor`/`wideColumnStyle`/`narrowColumnStyle` transparency overrides.
- `experiences/abstract/components/PolymorphicScrollGradientBackground.tsx` — the fixed full-viewport component (gradient + scroll-darken overlay), using `generateHarmonicGradient` (`helpers/harmonicGradient.ts`).
- `experiences/abstract/components/PolymorphicLayout.panel.ts` — new root `background` area; `colorSource*` enums reverted.
- `experiences/abstract/components/PolymorphicLayout.pageConfigs.ts`, `pages/contact.config.ts` — the 4 complete `PolymorphicLayoutConfig` literals each carry `scrollGradientEnabled(-Wide/-Lg)` defaults (`false` everywhere except `/abstract`'s mobile tier, `true`, preserving the feature's current live state).
- `pages/abstract.tsx` — `MobilePinnedArticleSection`'s `carouselColor`/`panelColor` now read `colors.wideColumnPaintColor`.
- `experiences/abstract/components/MobilePinnedArticleSection/styles.module.css` — `.panel` background switched from `rgb(from ...)` to `color-mix(...)` so `transparent` composites correctly.

## Verification

Dev server + Playwright, mobile viewport (390×844), `/abstract`:
- Gradient fills 100% of viewport including behind the header row (confirmed: no opaque header bar).
- `.outer`/`.stickyViewport`/`.panel` (MobilePinnedArticleSection) all resolve to fully transparent — timeline/carousel area now shows the gradient through it, not the previous `#f8fafc` light background.
- Config panel: "Polymorphic Layout" scope now shows `HEADER | BACKGROUND | CONTENT` as three sibling top-level areas; BACKGROUND → MOBILE tab shows the live-on "Scroll gradient background" toggle plus all palette/ink/darken fields.
- `/about` unaffected, zero console errors, clean `tsc`.
