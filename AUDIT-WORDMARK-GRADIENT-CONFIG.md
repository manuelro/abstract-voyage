# Audit, wordmark gradient config knobs (PolymorphicLayout)

**Date:** 2026-09-28
**Scope requested:** `./pages/abstract.config.ts`, resolving to the wordmark
gradient knobs owned by `PolymorphicLayoutConfig`
(`experiences/abstract/components/PolymorphicLayout.config.ts`).
**Objective:** enumerate every `wordmarkGradient*` config knob and assess, for
each, that it is properly wired and integrated across all layers.

## What the feature is

Opt-in behavior (`wordmarkUsesScrollGradient`): when on AND the active tier's own
`scrollGradientEnabled(-Wide/-Lg)` is also on, the site wordmark's gradient is
derived from an independent `wordmarkGradient*` palette (its own recipe, not the
background's) via `deriveWordmarkScrollGradientStops`
(`PolymorphicScrollGradientWordmarkStops.ts`), retargeted for legibility by
`wordmarkGradientClarity`. Reference: `PLAN-WORDMARK-SCROLL-GRADIENT-INTEGRATION.md`.

## Method

Each knob was checked against six integration layers:

1. **Declared** in the `PolymorphicLayoutConfig` interface (typed).
2. **Default** present in `DEFAULT_POLYMORPHIC_LAYOUT_CONFIG`.
3. **Normalized** in `normalizePolymorphicLayoutConfig` (clamp/token/round).
4. **Panel** control present in `PolymorphicLayout.panel.ts`, gated by
   `wordmarkUsesScrollGradient`.
5. **Resolved** into the recipe in `PolymorphicLayout.tsx` (tier selection for
   tiered knobs).
6. **Consumed** by `deriveWordmarkScrollGradientStops` and threaded to the
   render surface (SiteHeader/Logo, hero, nav text).

A set-difference cross-check (interface keys vs. panel vs. defaults vs.
normalizer) returned no real gaps: the only non-matching token was the bare
`wordmarkGradient` substring from doc-comment prose, a false positive.

## Inventory (33 knobs)

### A. Global / non-tiered controls (2)

| Knob | Type | Role |
|---|---|---|
| `wordmarkUsesScrollGradient` | boolean | Master opt-in. Also the panel `visibleWhen` gate for every other knob below. |
| `wordmarkGradientClarity` | enum `auto \| light \| dark` | Light/dark direction for the lightness range; `auto` reads the active tier's `scrollGradientInkColor*` lightness. |

### B. Tiered parity set (9 knobs x 3 tiers = 27)

Full parity with the background's nine exposed knobs, same names, same tiering
(base / `Wide` / `Lg`), independent values.

| Base knob (also `…Wide`, `…Lg`) | Type | Normalizer |
|---|---|---|
| `wordmarkGradientBaseHue` | number | clamp |
| `wordmarkGradientHueScheme` | enum `mono \| dual-complementary` | token |
| `wordmarkGradientLightnessMin` | number | clamp |
| `wordmarkGradientChromaMin` | number | clamp |
| `wordmarkGradientMode` | enum `center-bright \| side-bright` | token |
| `wordmarkGradientStops` | number (int) | clamp+round |
| `wordmarkGradientVariance` | number | clamp |
| `wordmarkGradientCenterStretch` | number | clamp |
| `wordmarkGradientSeed` | number | clamp |

### C. Non-tiered wordmark-only extras (4)

No `scrollGradient*` equivalent; single value applied across every breakpoint.

| Knob | Type | Panel range | Role |
|---|---|---|---|
| `wordmarkGradientHueSpread` | number | 0–90 deg | Hue jitter/band width around the base hue. |
| `wordmarkGradientLightnessMax` | number | 0–100 | Lightness ceiling; paired with the tiered `LightnessMin`. |
| `wordmarkGradientZoom` | number | 0–1 | Stop convergence toward the center color. |
| `wordmarkGradientDarken` | number | 0–1 | Post-hoc `l * (1 - darken)` on every stop; wordmark's analog to `scrollGradientMaxDarken`. |

## Per-layer assessment

| Layer | Result |
|---|---|
| 1. Declared (interface) | **PASS** — all 33 typed; enums reuse the shared `PolymorphicLayoutScrollGradientHueScheme/Mode` and `PolymorphicLayoutWordmarkGradientClarity` unions. |
| 2. Defaults | **PASS** — all 33 present. Tiered defaults are literal copies of the same page's `scrollGradient*` defaults (hue 215, chroma 45, side-bright, 22 stops, seed 50, etc.), so turning the feature on with nothing else changed renders identically to inherit-from-background. `LightnessMin` default is 18 (vs. background's 10), an intentional wordmark-legibility choice. Extras: hueSpread 30, lightnessMax 58, zoom 1, darken 0. |
| 3. Normalizer | **PASS** — all 33 normalized. Numbers clamped, `Stops*` `Math.round`ed, enums run through `token(...)` against their option sets, all falling back to the matching default. |
| 4. Panel | **PASS** — all 33 exposed. Globals + extras live in the "All sizes" Wordmark group; the 27 tiered fields live in the MOBILE/TABLET/DESKTOP tabs' Wordmark groups. Every one of the 32 non-master fields is gated `visibleWhen: config => config.wordmarkUsesScrollGradient` (verified: 27/27 tiered + all 5 global-secondary). |
| 5. Resolved | **PASS** — `PolymorphicLayout.tsx` (~L380-421) builds the recipe: each tiered knob via `tier(base, Wide, Lg)`, each extra read directly, gated by `wordmarkUsesScrollGradient && scrollGradientActive`. All 13 recipe fields sourced from config; none hardcoded. |
| 6. Consumed | **PASS** — `deriveWordmarkScrollGradientStops` reads all 13 recipe fields plus `inkColor` and `clarity`; `darken` applied last via `darkenHex`. Output (`wordmarkGradientStops`) is returned from the layout color hook (L567) and threaded to consumers. |

## Render-path integration (downstream of the recipe)

The derived stops reach three surfaces, confirming the output is not dead:

- **Logo/wordmark:** pages pass the derived stops as `logoStops` to `SiteHeader`
  (`pages/abstract.tsx` `topHeaderLogoStops`, and `contact/journal/about/posts`
  pass `colors.wordmarkGradientStops` / equivalent). `resolveSiteHeaderLogoStops`
  turns them into the Logo's `<linearGradient>` stop-colors.
- **Hero title:** `AbstractEditorialHero` receives `wordmarkGradientStops` and
  builds its title gradient (L295-310).
- **Nav text:** `SiteHeader` builds a `linear-gradient(90deg, …)` from the same
  stops when `navTextUsesWordmarkGradient` is on (L733-735).

## Findings

**No wiring or integration defects found.** Every one of the 33
`wordmarkGradient*` knobs is declared, defaulted, normalized, exposed in the
panel (correctly gated), resolved with proper tier selection, consumed by the
derivation, and rendered on a real surface. The tiered/non-tiered split in the
config matches the panel placement (tiered fields in the per-breakpoint tabs,
extras in "All sizes") and matches the resolver (`tier(...)` vs. direct read).

### Observations (not defects)

1. **`wordmarkGradientLightnessMax` is non-tiered while `LightnessMin` is
   tiered.** Intentional and documented (one ceiling works across breakpoints;
   clarity mirrors the pair). Worth noting only because a min/max pair split
   across the tiered/non-tiered boundary is an easy thing for a future editor to
   misread as an oversight. The panel description already calls this out.
2. **Two runtime couplings to the background remain**, both by design:
   (a) the feature only activates while the active tier's `scrollGradient*`
   background is on (`scrollGradientActive`); (b) `clarity: 'auto'` reads
   `scrollGradientInkColor*`. Everything else about the recipe is independent.
3. **`navTextUsesWordmarkGradient`** is a separate SiteHeader/WordmarkConfig
   flag (`SiteHeader/config/registered.ts`), not a `PolymorphicLayoutConfig`
   knob; it consumes the output but is out of scope for this config audit.

## Out of scope

- Scroll-gradient *background* knobs (`scrollGradient*`), covered by
  `AUDIT-POLYMORPHIC-GRADIENT-SYNC.md`.
- SiteHeader wordmark color-mode knobs and nav-text flags (separate config).
- Visual/aesthetic tuning of default values; this audit assesses wiring, not
  taste.
