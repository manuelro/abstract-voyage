# Audit — PolymorphicLayout gradient-background config knobs (for a cross-breakpoint sync button)

**Date:** 2026-09-28
**Scope requested:** `./pages/abstract.config.ts` → resolves to the gradient
knobs owned by `experiences/abstract/components/PolymorphicLayout.config.ts`
(the abstract page's layout config is `PolymorphicLayoutConfig`; the
gradient-background fields live there, not on `abstract.config.ts` itself).
**Objective:** enumerate the config knobs that define the gradient background so
a "sync gradient across breakpoints" button can copy one tier's values into the
others.

## What "the gradient background" is

The fixed, full-viewport, scroll-darkening procedural gradient rendered behind
everything by `PolymorphicScrollGradientBackground`
(PLAN-POLYMORPHIC-SCROLL-GRADIENT-BACKGROUND.md). Every field that shapes it is
prefixed `scrollGradient*` on `PolymorphicLayoutConfig`. The **wordmark**
gradient (`PolymorphicLayoutWordmarkGradientClarity`, "Wordmark uses scroll
gradient") is a *text* treatment that samples this background, not part of the
background itself — **out of scope** for this sync.

## Tiering convention

- **base / mobile** — no suffix (e.g. `scrollGradientBaseHue`)
- **tablet** — `Wide` suffix (e.g. `scrollGradientBaseHueWide`)
- **desktop** — `Lg` suffix (e.g. `scrollGradientBaseHueLg`)

The panel groups these as three parallel blocks: "Scroll gradient" (mobile,
panel line ~1938), "Scroll gradient (≥ tablet)" (~2253), "Scroll gradient
(≥ desktop)" (~2573).

## Knob inventory, by tiering pattern

### A. Fully tiered — exist at all three tiers (base + `Wide` + `Lg`) — 34 knobs

These are the sync target: each has a mobile/tablet/desktop triplet, so a value
can be copied cleanly in any direction. Grouped below into six functional
clusters that mirror the pipeline order (enable → generate palette → shape
light → dither → scroll-darken → keep text legible). The clusters exist to make
the audit and the key list readable and to align with the panel's own visual
ordering; the sync button treats all 34 as one atomic set (see plan).

**A1 — Master enable & column scope** (3) — is the gradient on, and behind which
columns.
| Base key | Type | Range |
|---|---|---|
| `scrollGradientEnabled` | boolean | `=== true` |
| `scrollGradientNarrowColumnEnabled` | boolean | `=== true` |
| `scrollGradientWideColumnEnabled` | boolean | `=== true` |

**A2 — Palette generation** (9) — the harmonic-gradient color source
(`helpers/harmonicGradient.ts`): hue family, lightness/chroma floor, stop
distribution, deterministic seed.
| Base key | Type | Range |
|---|---|---|
| `scrollGradientBaseHue` | number | clamp |
| `scrollGradientHueScheme` | enum `mono \| dual-complementary` | token |
| `scrollGradientLightnessMin` | number | clamp |
| `scrollGradientChromaMin` | number | clamp |
| `scrollGradientMode` | enum `center-bright \| side-bright` | token |
| `scrollGradientStops` | number (int) | clamp+round |
| `scrollGradientVariance` | number | clamp |
| `scrollGradientCenterStretch` | number | clamp |
| `scrollGradientSeed` | number | clamp |

**A3 — Compositor & light shaping** (10) — how the enhanced compositor projects
that palette (focal light geometry, sampling, interpolation, extent). Most gate
on `scrollGradientCompositor === 'enhanced'` in the panel.
| Base key | Type | Range |
|---|---|---|
| `scrollGradientCompositor` | enum `legacy \| enhanced` | token |
| `scrollGradientFocalHorizontal` | enum `left \| center \| right` | token |
| `scrollGradientLightHiddenPercent` | number | 0–95 |
| `scrollGradientLightRadiusPercent` | number | 10–300 |
| `scrollGradientLightAspectRatio` | number | 0.25–4 |
| `scrollGradientLightFalloff` | number | 0.25–4 |
| `scrollGradientMixSamples` | number (int) | 16–128 |
| `scrollGradientInterpolation` | enum `srgb \| oklab` | token |
| `scrollGradientExtentPercent` | number | 25–400 |
| `scrollGradientSmoothness` | number | 0.25–4 |

**A4 — Dithering** (4) — banding suppression; all but the toggle gate on
`scrollGradientDitherEnabled`.
| Base key | Type | Range |
|---|---|---|
| `scrollGradientDitherEnabled` | boolean | `=== true` |
| `scrollGradientDitherAmount` | number | 0–0.08 |
| `scrollGradientDitherScale` | number | 0.5–4 |
| `scrollGradientDitherSeed` | number (int) | 0–100000 |

**A5 — Scroll-darken behavior** (3) — how the background darkens with scroll
travel.
| Base key | Type | Range |
|---|---|---|
| `scrollGradientViewportRangeVh` | number | clamp |
| `scrollGradientMaxDarken` | number | clamp |
| `scrollGradientDarkenOnScrollEnabled` | boolean | `!== false` |

**A6 — Ink & legibility** (5) — the text/ink treatment layered over the
gradient (base ink color, contrast target, dark/light-ink saturation & opacity
adjustments).
| Base key | Type | Range |
|---|---|---|
| `scrollGradientInkColor` | string (color) | `normalizeColor` |
| `scrollGradientLegibilityTargetRatio` | number | clamp |
| `scrollGradientDarkInkSaturation` | number | clamp |
| `scrollGradientDarkInkOpacityMultiplier` | number | clamp |
| `scrollGradientLightInkOnLightBackgroundContrastTolerance` | number | clamp |

(= 34 keys × 3 tiers = 102 fields. 3 + 9 + 10 + 4 + 3 + 5 = 34.)

### B. Partially tiered — tablet + desktop only (`Wide` + `Lg`, **no base**) — 2 knobs

The narrow-column glass treatment "begins at tablet" by design (config comment,
~line 995), so mobile has no counterpart.

- `scrollGradientNarrowColumnGlassOpacity` → `…Wide`, `…Lg`
- `scrollGradientNarrowColumnBackdropBlurPx` → `…Wide`, `…Lg`

Can only sync **between tablet and desktop**; mobile is not a valid source or
target.

### C. Desktop-only (`Lg` suffix, no base/tablet) — 3 knobs

- `scrollGradientNarrowColumnVariantEnabledLg`
- `scrollGradientNarrowColumnSaturationLg`
- `scrollGradientNarrowColumnDarknessLg`

**No sync possible** — there is no mobile/tablet field to copy to or from.

### D. Non-tiered — a single value shared across all breakpoints — 7 knobs

Nothing to sync (one value already governs every tier).

- `scrollGradientTauMs`
- `scrollGradientAdaptiveInkEnabled`
- `scrollGradientAdaptiveInkMaxAmount`
- `scrollGradientAdaptiveInkTargetContrastRatio`
- `scrollGradientAdaptiveInkReturnToLightEnabled`
- `scrollGradientAdaptiveInkReturnToLightRangeVh`
- `scrollGradientAdaptiveInkReturnToLightFinalDarken`

## Recommendation for the sync button's scope

Sync **Group A (the 34 fully-tiered knobs, clusters A1–A6)** across all three tiers — this is
the honest, lossless "copy the gradient config into the other breakpoints"
operation. Additionally sync **Group B (2 knobs)** between tablet and desktop
only (skip mobile, which lacks them). Exclude Groups C and D (no valid
cross-tier target). This mirrors the existing "Sync colors across breakpoints"
buttons exactly (`PolymorphicLayout.panel.ts` ~686–732), which likewise sync
only the fields that exist at every participating tier.

## Precedent to reuse (do not reinvent)

- **`ConfigFieldAction`** (`components/Panel/config/types.ts:117`) — the generic
  "compute a multi-key patch, apply in one `updateFields` call" primitive, built
  precisely for these sync buttons. `key` is DOM identity only, not a config
  key.
- **Existing sync-color buttons** (`PolymorphicLayout.panel.ts:686–732`) — three
  actions (`syncColorTiersFromMobile/-Tablet/-Desktop`), one placed in each
  tier's own group, each `visibleWhen: config => !tiersInSync(config)`, patch
  returned by `onClick`. The gradient button should copy this shape verbatim.
