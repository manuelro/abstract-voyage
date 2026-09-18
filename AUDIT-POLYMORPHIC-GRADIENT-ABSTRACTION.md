# AUDIT-POLYMORPHIC-GRADIENT-ABSTRACTION

Scope audited: `experiences/abstract/components/PolymorphicLayout.pageConfigs.ts`,
`pages/abstract.tsx`, `pages/about.tsx` (plus `experiences/abstract/components/PolymorphicLayout.tsx`/
`.config.ts`/`.panel.ts` and `usePolymorphicColumnAdaptiveInk.ts`, read to
verify what the config fields actually do at runtime — a config field
existing is not evidence it's wired).

## Bottom line

The scroll-gradient **background painting** is genuinely, fully
abstracted — mount `<PolymorphicLayout>`, set the config, done, no page
glue required. The scroll-gradient-driven **text ink** on the narrow
column is not: the config knobs are centrally declared, resolved, and
panel-editable, but the algorithm that turns those knobs into an actual
rendered ink color is duplicated by hand in both `pages/abstract.tsx` and
`pages/about.tsx` (~50 lines each, near-verbatim) rather than living once
inside `PolymorphicLayout.tsx` or a shared hook. A third page mounting
`<PolymorphicLayout>` with those same knobs configured would get zero
visible effect from them until someone re-copies that block a third time.

## How "truly abstracted" is judged here

Three tiers, not two — a config field being declared in
`PolymorphicLayoutConfig` and panel-editable is necessary but not
sufficient for "works out of the box":

- **Automatic** — resolved AND applied entirely inside `PolymorphicLayout.tsx`
  itself (or a component it mounts internally, like
  `PolymorphicScrollGradientBackground`). Any page that mounts
  `<PolymorphicLayout config={...}>` gets the behavior with zero
  additional code.
- **Resolved, page-wired** — the value is computed once, consistently,
  inside `usePolymorphicLayoutColors` (or the sibling shared hook
  `usePolymorphicColumnAdaptiveInk`) and returned on `colors`, but the
  calling page must explicitly consume it — usually one prop pass-through
  or one hook call, not a re-derivation of the algorithm.
- **Config-only** — the field is declared, tier-resolved, clamped, and
  panel-editable, but the code that actually *does something* with the
  resolved number is not shared anywhere — each page that wants the
  behavior has hand-copied the same block.

All 142 `scrollGradient*`/`wordmarkGradient*`/`wordmarkUsesScrollGradient`
fields in `PolymorphicLayout.config.ts` have a panel entry
(`PolymorphicLayout.panel.ts`) — panel coverage is complete and is not
where the gap is.

## Inventory

### Automatic — works out of the box on any `<PolymorphicLayout>` page

| Capability | Config knobs | Where it's applied |
|---|---|---|
| Scroll-gradient mesh background (palette/hue/mode/stops/variance/compositor/dither/light-shape) | `scrollGradientEnabled(-Wide/-Lg)`, `scrollGradientBaseHue*`, `scrollGradientHueScheme*`, `scrollGradientLightnessMin*`, `scrollGradientChromaMin*`, `scrollGradientMode*`, `scrollGradientStops*`, `scrollGradientVariance*`, `scrollGradientCenterStretch*`, `scrollGradientSeed*`, `scrollGradientCompositor*`, `scrollGradientFocalHorizontal*`, `scrollGradientLightHiddenPercent*`, `scrollGradientLightRadiusPercent*`, `scrollGradientLightAspectRatio*`, `scrollGradientLightFalloff*`, `scrollGradientMixSamples*`, `scrollGradientInterpolation*`, `scrollGradientExtentPercent*`, `scrollGradientSmoothness*`, `scrollGradientDither*` | `PolymorphicLayout.tsx` mounts `<PolymorphicScrollGradientBackground>` internally (line ~1409-1426); no page ever mounts it directly |
| Column background paint (wide/narrow, incl. transparent-over-gradient) | `scrollGradientNarrowColumnEnabled*`, `scrollGradientWideColumnEnabled*`, `wideColumnTransparent*`, `narrowColumnTransparent*` | `wideColumnPaintColor`/`narrowColumnPaintColor` applied as inline `backgroundColor` inside `PolymorphicLayout.tsx` (lines 1510-1536) |
| Desktop narrow-column variant (own saturation/darkness on the physical DOM paint) | `scrollGradientNarrowColumnVariantEnabledLg`, `scrollGradientNarrowColumnSaturationLg`, `scrollGradientNarrowColumnDarknessLg` | Feeds `sampleScrollGradientColor(...)` inside `usePolymorphicLayoutColors` (`PolymorphicLayout.tsx:494-512`), which produces `narrowColumnPaintColor` above — same automatic sink |
| Scroll-driven darken overlay + legibility floor | `scrollGradientViewportRangeVh*`, `scrollGradientMaxDarken*`, `scrollGradientLegibilityTargetRatio*`, `scrollGradientTauMs` | Consumed by `<PolymorphicScrollGradientBackground>`'s own rAF loop, same automatic mount |
| Ink basis / origin color for contrast decisions | `scrollGradientInkColor*` | Read inside `usePolymorphicLayoutColors`, feeds `colors.scrollGradientOriginColor` |

### Resolved centrally, requires one page-level wiring step

| Capability | Config knobs | What's shared vs. what the page must still do |
|---|---|---|
| Wordmark gradient fill | `wordmarkUsesScrollGradient`, `wordmarkGradientBaseHue*`, `wordmarkGradientHueScheme*`, `wordmarkGradientLightnessMin*`, `wordmarkGradientChromaMin*`, `wordmarkGradientMode*`, `wordmarkGradientStops*`, `wordmarkGradientVariance*`, `wordmarkGradientCenterStretch*`, `wordmarkGradientSeed*`, `wordmarkGradientClarity`, `wordmarkGradientHueSpread`, `wordmarkGradientLightnessMax`, `wordmarkGradientZoom`, `wordmarkGradientDarken` | Fully computed inside `usePolymorphicLayoutColors` → `colors.wordmarkGradientStops` (`PolymorphicLayout.tsx:366-390`). Every consuming page (`abstract.tsx`, `about.tsx`, `contact.tsx`, `posts/[slug].tsx`) passes `wordmarkGradientStops={colors.wordmarkGradientStops}` into `<SiteHeader>`/`<AbstractEditorialHero>` — one line, already done consistently on all four, genuinely reusable, just not literally automatic |
| Scroll-reactive adaptive ink (any text element sitting on the gradient) | `scrollGradientAdaptiveInkEnabled`, `scrollGradientAdaptiveInkMaxAmount`, `scrollGradientAdaptiveInkTargetContrastRatio`, `scrollGradientAdaptiveInkReturnToLightEnabled`, `scrollGradientAdaptiveInkReturnToLightRangeVh`, `scrollGradientAdaptiveInkReturnToLightFinalDarken` | These 6 fields are the only `PolymorphicLayoutConfig` scroll-gradient fields **`PolymorphicLayout.tsx` itself never reads** (confirmed by grep — not present in its own `config.*` accesses). The real logic lives in the sibling, genuinely page-agnostic hook `usePolymorphicColumnAdaptiveInk.ts` (`PLAN-POLYMORPHIC-ADAPTIVE-INK-EXTRACTION.md`), which any page can call — but each page must call it itself, once per DOM ref it wants reactive (`pages/about.tsx:994`, `pages/abstract.tsx` calls it too). Genuinely shared code, not duplicated, but not automatic either — a page that sets these config values and never calls the hook gets nothing |

### Config-only — the real gap

| Capability | Config knobs | Status |
|---|---|---|
| Narrow-column dark-ink saturation/opacity blend (the actual text color painted on the gradient-backed narrow column) | `scrollGradientDarkInkSaturation*`, `scrollGradientDarkInkOpacityMultiplier*` | Tier-resolved inside `usePolymorphicLayoutColors` and returned on `colors` (so the *number* is centrally computed) — but the algorithm that consumes that number (grayscale the light-ink candidate or the resolved title color, reintroduce the gradient's own hue/saturation proportional to the knob, clamp lightness, blend) is **not** in `PolymorphicLayout.tsx` or any shared hook. It's hand-written as `narrowColumnUnifiedInkColor` independently in `pages/abstract.tsx:2303` and `pages/about.tsx:966` — the latter's own doc comment says as much: "ported verbatim from pages/abstract.tsx's own narrowColumnGradientReference/-ContrastBackground/darkInkSaturation/darkInkOpacityScale/narrowColumnTypography chain," not extracted into a function both call |
| Light-ink-on-light-background contrast tolerance | `scrollGradientLightInkOnLightBackgroundContrastTolerance*` | Same story — tier-resolved centrally, consumed only inside that same duplicated `narrowColumnUnifiedInkColor` block in both pages, via a direct call to `resolveContrastAwareTextColor(...)` re-written at each call site |
| Net effect | — | `posts/[slug].tsx` also mounts `<PolymorphicLayout>` and does **not** implement this block at all (confirmed — no `narrowColumnUnifiedInkColor` there). If that page's config ever set a non-zero `scrollGradientDarkInkSaturation*`, it would be silently inert. This is the concrete "does not work out of the box on every page" case the objective asked about |

## Not a PolymorphicLayout capability (by design, not a gap)

The CoverFlow-navigation-synced narrow-column enrichment shipped earlier
this session (`narrowColumnGradientOnNavigateEnabledLg`,
`narrowColumnGradientSaturationOnNavigateLg`,
`narrowColumnGradientDarknessOnNavigateLg`) lives entirely in
`CoverFlow.config.ts` + `pages/abstract.tsx`, with zero presence in
`PolymorphicLayout.config.ts`/`.tsx`. That's intentional scoping, not an
oversight: it's keyed to CoverFlow's own `activeIndex`, a component that
only exists on `/abstract`. Flagged here only so it isn't mistaken for a
missed PolymorphicLayout capability in this inventory.

## Recommendation (not implemented — audit only, per the task)

Extract the `narrowColumnUnifiedInkColor` chain (background→contrast-side
resolution→dark-ink-saturation chromatic blend→light-ink-candidate
grayscale, currently ~50 duplicated lines each in `abstract.tsx`/`about.tsx`)
into a shared hook alongside `usePolymorphicColumnAdaptiveInk.ts` —
matching that hook's own extraction precedent
(`PLAN-POLYMORPHIC-ADAPTIVE-INK-EXTRACTION.md`) and its "resolved
centrally, one page-level wiring call" tier, rather than leaving it as
"config-only." Would also make `scrollGradientDarkInkSaturation*`/
`scrollGradientLightInkOnLightBackgroundContrastTolerance*` actually
available on `posts/[slug].tsx` and any future `<PolymorphicLayout>`
page for the first time. Out of scope for this audit; surfaced as a
follow-up candidate only.
