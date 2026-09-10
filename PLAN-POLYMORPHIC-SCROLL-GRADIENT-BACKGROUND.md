# Extract legacy scroll-driven gradient into PolymorphicLayout as a shared, per-breakpoint opt-in `colorSource`

## Context

Earlier iterations of this task explored wiring the legacy scroll-gradient (`experiences/synth/components/SynthLayout.tsx`, deleted pre-`2f29e02`, recoverable via `git show '2f29e02^:experiences/synth/components/SynthLayout.tsx'`) into `pages/abstract.tsx`'s own bespoke `GradientDesignerPanel`/`skyRenderMode` system. That system was rejected: it's nested inside the dead `presentationMode === 'classic'` branch and isn't part of the page's real, live config UI.

The user redirected: this must be a **shared `PolymorphicLayout` feature** — available to every page that consumes `PolymorphicLayout` (`/abstract`, `/about`, `/posts/[slug]`, `/journal`), opt-in **per breakpoint**, with **configurable colors**, filling **100% of the viewport** (matching the legacy behavior), and driving **downstream text/ink color** the same way the existing flat column colors already do. All prior `AbstractGradientBackground.config.ts`/`skyRenderMode` plumbing is irrelevant to this task.

## Key architectural finding: `colorSource` is the existing knob to extend, not a new one

`PolymorphicLayoutConfig` (`experiences/abstract/components/PolymorphicLayout.config.ts`) already has a fully generic, per-breakpoint-tiered enum for "what paints this column": `colorSource` / `colorSourceWide` / `colorSourceLg`, typed `PolymorphicLayoutColorSource = 'none' | 'palette' | 'custom' | 'surface'` (`.config.ts:140`). Each tier is independently resolved at render time via `usePolymorphicLayoutColors`'s `tier()` helper (`PolymorphicLayout.tsx:170,185`). This is already exactly "opt-in, segregated by breakpoint" — adding a fifth value, `'scrollGradient'`, gets per-breakpoint opt-in for free, with zero new state-shape/tiering machinery.

`resolveColumnColor()` (`PolymorphicLayout.tsx:96-110`) is the single function that turns a resolved `colorSource` into a color string; it gets a new `'scrollGradient'` branch.

## The paint/ink split (this is the part that needs new plumbing)

Today, one value does double duty: `colors.wideColumnColor` / `colors.narrowColumnColor` (returned by `usePolymorphicLayoutColors`) is used BOTH as the literal `backgroundColor` painted on the column (`PolymorphicLayout.tsx:1169,1183`) AND as the contrast/ink basis every downstream page already reads for text color — confirmed consumers: `pages/posts/[slug].tsx:291-298` (`resolvePostLabArticlePresentation({ columnColor: colors.wideColumnColor, ... })` → `articlePresentation.bodyInk/headingInk/mutedInk/...`), `pages/about.tsx:1016`, `pages/journal.tsx:100`, and `PolymorphicLayout.tsx`'s own `actualLeftSegmentColor`/`actualRightSegmentColor` (SiteHeader nav/logo contrast, `.tsx:266-275`) — all chain from `wideColumnColor`/`narrowColumnColor`.

A scroll-driven gradient can't be one static CSS color string, but every downstream consumer already expects exactly that. So: **keep `wideColumnColor`/`narrowColumnColor` as the ink/contrast basis (untouched contract), and add a separate `wideColumnPaintColor`/`narrowColumnPaintColor` to `PolymorphicLayoutResolvedColors`** used only for the two inline `backgroundColor` call sites. For every existing `colorSource` value, `paintColor === color` (byte-identical behavior, zero risk to current pages). For `'scrollGradient'`, `paintColor = 'transparent'` (letting the fixed full-viewport gradient layer show through that column) while `color` resolves to a new, explicitly configured ink-basis hex field. This means **zero changes to `about.tsx`, `posts/[slug].tsx`, `journal.tsx`, or `abstract.tsx`** — they keep reading `colors.wideColumnColor`/`narrowColumnColor` exactly as before and automatically get gradient-aware ink the moment an operator flips `colorSource` to `'scrollGradient'` for a tier.

## Visual layer: one new component, mounted once in `PolymorphicLayout.tsx`

`PolymorphicLayout.tsx:1099` returns a single `<SplitColumnPageShell>` — no wrapping fragment today. Change the return to a fragment: render a new `<PolymorphicScrollGradientBackground>` as a preceding sibling (mounted whenever the resolved `colorSource` for either column at the current tier is `'scrollGradient'`), then `<SplitColumnPageShell>` unchanged. Because it's a sibling of `SplitColumnPageShell`, not a descendant, `position: fixed; inset: 0` escapes any ancestor's `overflow-x-clip`/stacking context cleanly — same technique the legacy `SynthLayout.tsx` used (`fixed -inset-4 z-0 pointer-events-none`), now scoped to `inset-0`.

**New file:** `experiences/abstract/components/PolymorphicScrollGradientBackground.tsx` — one self-contained file (matching the flat-sibling-file convention `PolymorphicLayout.tsx`/`.config.ts`/`.panel.ts`/`.pageConfigs.ts` already use):
- Ports the rAF scroll-darken loop verbatim from `SynthLayout.tsx` (reads `window.scrollY`, maps against `viewportRangeVh`, exponential smoothing via `tauMs`, writes to a CSS var on a ref'd overlay div, `passive: true` scroll/resize listeners, full cleanup).
- Renders two full-bleed fixed divs: a static radial-gradient layer (`radial-gradient(circle at 0% 0%, ...)`, composed from `generateHarmonicGradient()`'s output stops, ported from `buildSynthBackgroundGradient()`'s own composition) + the scroll-darkened black overlay on top.
- **Gradient palette: the real harmonic generator.** Imports `generateHarmonicGradient`/`GradientConfig` directly from `helpers/harmonicGradient.ts` (general-purpose, no `experiences/synth` coupling). Does NOT import `buildSynthBackgroundGradient`/`BASE_SYNTH_GRADIENT_CONFIG` from `experiences/synth/gradients/synthGradient.ts` — only reuses that file's literal default values and gradient-string composition.

## Config additions (`PolymorphicLayout.config.ts`)

Extend `PolymorphicLayoutColorSource` to `'none' | 'palette' | 'custom' | 'surface' | 'scrollGradient'`.

### The 15 knobs on `GradientConfig`, and which are exposed

`BASE_SYNTH_GRADIENT_CONFIG` only ever set 9 of the 15 fields `GradientConfig` supports. Decision: **tier those 9** (base/Wide/Lg); **leave the other 6 unexposed** (always `undefined`, generator's own internal defaults — byte-identical to legacy behavior, which also never set them).

Tiered (9 × 3 = 27 fields), defaults ported from `BASE_SYNTH_GRADIENT_CONFIG`:
- `scrollGradientBaseHue` / `-Wide` / `-Lg` — default `215` (legacy value `575`, normalized mod 360 — stored pre-normalized so the panel's 0–360 range is meaningful)
- `scrollGradientHueScheme` / `-Wide` / `-Lg` (`'mono' | 'dual-complementary'`) — default `'dual-complementary'`
- `scrollGradientLightnessMin` / `-Wide` / `-Lg` — default `10`
- `scrollGradientChromaMin` / `-Wide` / `-Lg` — default `45`
- `scrollGradientMode` / `-Wide` / `-Lg` (`'center-bright' | 'side-bright'`) — default `'side-bright'`
- `scrollGradientStops` / `-Wide` / `-Lg` (integer, min 2) — default `22`
- `scrollGradientVariance` / `-Wide` / `-Lg` (0–1) — default `1` (legacy value `100`; the generator clamps to `[0,1]` internally, so `100` was always effectively `1`)
- `scrollGradientCenterStretch` / `-Wide` / `-Lg` (0–1) — default `0.3`
- `scrollGradientSeed` / `-Wide` / `-Lg` — default `50`

Not exposed: `hueSpread`, `secondaryHue`, `zoom`, `perStopLightness`, `perStopChroma`, `contrast`.

### Ink + scroll-darken fields (new, no legacy precedent)

- `scrollGradientInkColor` / `-Wide` / `-Lg` — ink/contrast-basis hex. Default `#f8fafc` (matches legacy `Header.tsx`'s light text classes — `text-slate-200/55`/`text-slate-50`).
- `scrollGradientViewportRangeVh` / `-Wide` / `-Lg` — default `1.25` (legacy `SCROLL_BG_CONFIG.viewportRangeVh`).
- `scrollGradientMaxDarken` / `-Wide` / `-Lg` — default `0.65` (legacy `maxDarken`).
- `scrollGradientTauMs` — NOT tiered (shared). Default `550` (legacy `tauMs`).

Total new fields: 27 (palette) + 3 (ink) + 6 (viewportRangeVh/maxDarken × 3 tiers) + 1 (tauMs) = **37**.

Add `token()`/`normalizeColor()`/`clampRange()` calls for all new fields in `normalizePolymorphicLayoutConfig()`, mirroring the existing `colorSourceWide`/`wideColumnCustomColorWide`/`wideColumnSurfaceOffsetWide` blocks (`.config.ts:2262-2290`).

## Panel wiring (`PolymorphicLayout.panel.ts`)

- Add `{ label: 'SCROLL GRADIENT', value: 'scrollGradient' }` to the `options` array on all three `colorSource`/`colorSourceWide`/`colorSourceLg` enum field entries (`.panel.ts:406-411` + their `-Wide`/`-Lg` counterparts).
- Add the new tiered field entries immediately after the existing `wideColumnCustomColor`/`narrowColumnCustomColor`/`wideColumnSurfaceOffset`/`narrowColumnSurfaceOffset` blocks (`.panel.ts:413-444`), each `visibleWhen: config => config.colorSource === 'scrollGradient'` (and `-Wide`/`-Lg` equivalents) — same `visibleWhen` idiom those existing fields already use.

Surfaces automatically in every page's existing `PanelShell`/`ConfigScopeList` UI — no new panel registration needed.

## Per-page defaults (`PolymorphicLayout.pageConfigs.ts`)

No page needs new entries — `colorSource`/`-Wide`/`-Lg` stay at whatever each page already has. Opt-in by construction. New `scrollGradient*` fields fall back to `DEFAULT_POLYMORPHIC_LAYOUT_CONFIG`'s defaults via the existing spread pattern.

## Files

**Create:** `experiences/abstract/components/PolymorphicScrollGradientBackground.tsx`.

**Edit:**
- `experiences/abstract/components/PolymorphicLayout.config.ts` — extend `PolymorphicLayoutColorSource`; add 37 new fields; extend `resolveColumnColor()`; extend `normalizePolymorphicLayoutConfig()`.
- `experiences/abstract/components/PolymorphicLayout.tsx` — extend `PolymorphicLayoutResolvedColors` with `wideColumnPaintColor`/`narrowColumnPaintColor`; update the two `backgroundColor:` call sites (`:1169`, `:1183`); wrap the `:1099` return in a fragment, mounting `<PolymorphicScrollGradientBackground>` conditionally.
- `experiences/abstract/components/PolymorphicLayout.panel.ts` — add `'scrollGradient'` option + new tiered field entries.

## Verification

1. Isolated dev server (unique port, `CLAUDE_NEXT_DIST_DIR` set).
2. Load `/abstract`, open the config panel, find "Polymorphic Layout" scope, set `Color source` (mobile) to `SCROLL GRADIENT`.
3. Playwright at a mobile viewport: screenshot at scroll-top (gradient visible, full-bleed, no darkening), scroll ~1.25 viewport-heights and screenshot again (darkened toward `maxDarken`), confirm text over the column is legible, confirm no console errors.
4. Resize/re-test at tablet and desktop viewport widths with Wide/Lg tiers left at defaults, to confirm the feature is inert unless a tier explicitly opts in.
5. Spot-check one other `PolymorphicLayout` page (e.g. `/about`) still renders unaffected (regression check on the paint/ink split).
6. Clean up dev server / scratch `.next` dist dir afterward.
