# PLAN — Chip tint should derive from the same column ink `/abstract`'s text uses

## Context

Operator-reported: the article-filter chips on `/journal` (`pages/journal.tsx`)
are "not using the correct derived color... as the text in abstract.tsx
does." This is correct — confirmed by reading the code, not just the visual
symptom. `pages/journal.tsx` currently wires the chip's color through
`resolveChipAppearance` (`components/Chip/config/resolveChipAppearance.ts`), a
generic, hand-rolled contrast resolver I built for the shared `Chip`
component. That resolver is **architecturally disconnected** from the real
mechanism every other piece of text on `/journal` and `/abstract` uses —
`resolvePolymorphicNarrowColumnTypography`/`resolveGradientColumnTypography`
— and the disconnect is two layers deep, not one. This document root-causes
both layers and proposes a fix that deletes the generic resolver from this
call site entirely rather than tuning it.

Scope: `pages/journal.tsx` (the only file that needs to change).
`components/Chip.tsx`/`components/Chip/Chip.tsx` needs **no changes** — its
`appearance` prop already accepts a pre-resolved color object from any
caller; the bug is in what `journal.tsx` computes and passes into it.
`pages/abstract.tsx` needs no changes either — it's the reference
implementation being studied, not a consumer of `Chip`.

## How `/abstract`'s text color derivation actually works

One shared primitive, used identically by both pages:
`resolvePolymorphicNarrowColumnTypography(colors, globalTypographyConfig)` /
`resolvePolymorphicWideColumnTypography(...)`
(`experiences/abstract/components/PolymorphicLayout.narrowColumnTypography.ts:95,210+`),
both thin wrappers around the shared `resolveGradientColumnTypography`:

- Grayscales the column's real background reference first (never the raw,
  possibly-`'transparent'` paint sentinel — see
  `resolvePolymorphicColumnBackgroundReference`'s own doc comment in the same
  file for why that distinction exists and the two prior incidents it fixed).
- Picks the correct light/dark contrast side against that grayscaled
  reference via `resolveContrastAwareTextColor`
  (`helpers/surfaceColorDerivation.ts:256`), targeting
  `globalTypographyConfig.minContrastRatio` (**`5`**, `components/
  GlobalTypography.config.ts:78`), with `lightInkOnLightBackgroundContrastTolerance`
  as the tolerance band.
- Reintroduces a **bounded fraction** of the background's own hue/saturation
  on top of that neutral pick, scaled by `darkInkSaturation` (capped ×4
  boost, mixed in proportion to `min(1, darkInkSaturation)`) — never the
  background's full chroma.
- Scales opacity independently by `darkInkOpacityMultiplier`.
- All three modulation inputs — `darkInkSaturation`, `darkInkOpacityMultiplier`,
  `lightInkOnLightBackgroundContrastTolerance` — are read **straight off
  `colors`** (`PolymorphicLayoutResolvedColors`,
  `experiences/abstract/components/PolymorphicLayout.tsx:147-149`), i.e.
  already tier-resolved from the page's own `scrollGradientDarkInkSaturation*`/
  `scrollGradientDarkInkOpacityMultiplier*`/
  `scrollGradientLightInkOnLightBackgroundContrastTolerance*` config fields.
  **A page never supplies these itself** — that doc comment is explicit.

`pages/journal.tsx` already calls this correctly, once:

```ts
// pages/journal.tsx:221
const narrowColumnTypography = resolvePolymorphicNarrowColumnTypography(
  layoutColors, DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG,
)
```

`narrowColumnTypography.titleColor` is the result — the correctly-derived
narrow-column ink this plan targets.

`pages/abstract.tsx` uses the identical primitive for every narrow-column
text role it has (hero title/body, header wordmark, mobile article list,
timeline link color) — see `pages/abstract.tsx:2399`
(`narrowColumnTypography`). It never calls `resolveEditorialAccordionInk` or
mounts `EditorialAccordionItem` at all — confirmed by grep, zero matches.

## Root cause — two independent, compounding gaps

**Gap 1 — the chip isn't even wired to the derivation that exists.**
`pages/journal.tsx:254-257` feeds `narrowColumnBackgroundReference` into
`resolveChipAppearance`, but `DEFAULT_JOURNAL_CHIP_APPEARANCE_CONFIG`
(`pages/journal.config.ts`) leaves `colorMode: 'manual'` (inherited,
unoverridden, from the shared `DEFAULT_CHIP_APPEARANCE_CONFIG`). In `'manual'`
mode, `resolveChipAppearance` (`components/Chip/config/
resolveChipAppearance.ts`, the `colorMode === 'manual'` branch) **ignores its
`backgroundReferenceColor` argument entirely** and returns four literal hex
strings. The chip's color is a static, hand-picked value with no
relationship to the page's live background at all — this alone is why it
doesn't match.

**Gap 2 — even in `'deriveFromBackground'` mode, the modulation inputs are
wrong.** My own `deriveChipInk` helper (same file) reimplements
`resolveGradientColumnTypography`'s algorithm against lower-level primitives,
but it reads `darkInkSaturation`/`darkInkOpacityMultiplier`/`lightInkTolerance`
from `ChipAppearanceConfig`'s own independent fields
(`DEFAULT_CHIP_APPEARANCE_CONFIG`: `1`/`1`/`0.4`) and a hardcoded
`CHIP_MIN_CONTRAST_RATIO = 4.5` — none of which match `/journal`'s real,
tier-resolved values (`JOURNAL_POLYMORPHIC_LAYOUT_CONFIG`:
`scrollGradientDarkInkSaturation: 2` at every tier,
`scrollGradientDarkInkOpacityMultiplier: 1`,
`scrollGradientLightInkOnLightBackgroundContrastToleranceLg: 0.5`; and
`DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG.minContrastRatio: 5`, not `4.5`). Flipping
`colorMode` alone would still produce a visibly different shade than the
header/timeline ink, because the two computations target different numbers.

**A third, smaller fact worth stating plainly:** the chip's current base
color input, `introInkColor` (`pages/journal.tsx:250`,
`resolveEditorialAccordionInk` → `experiences/about/components/
EditorialAccordionItem.tsx:7-11`), is not "the text in abstract.tsx" at all.
It's a `/about`-style accordion-item ink (`deriveSurfaceColor(backgroundColor,
config.textSurfaceOffset)` or a literal custom color — no contrast search,
no chroma modulation), used on `/journal` only for its own editorial intro
paragraph. `/abstract` never mounts that component or calls that function
for any text role. It is the wrong reference point for the chip,
independent of Gaps 1-2 above.

## Proposed fix

Delete `resolveChipAppearance`'s derive-mode call from this call site and
replace it with the same primitive `narrowColumnTypography` already uses,
in `pages/journal.tsx` only:

1. **Unselected (border) look's ink** — use
   `narrowColumnTypography.titleColor` directly (already computed at
   `pages/journal.tsx:221`, no new call needed). This is the page's one
   canonical narrow-column ink.
2. **Selected (filled) look's background** — keep
   `deriveSurfaceColor(narrowColumnBackgroundReference, activeSurfaceOffset)`
   (`helpers/surfaceColorDerivation.ts:16`) exactly as `resolveChipAppearance`
   already does today. This already matches the "offset the background,
   then re-derive ink against it" relationship `AbstractTimelineLinkColorConfig`'s
   own `activeSurfaceOffsetMd/-Lg` has to its own active-state ink (the
   precedent the original Chip task named).
3. **Selected (filled) look's text** — call `resolveGradientColumnTypography`
   (not my own `deriveChipInk`) directly, against the offset background from
   step 2, passing `layoutColors.scrollGradientDarkInkSaturation`,
   `layoutColors.scrollGradientDarkInkOpacityMultiplier`,
   `layoutColors.scrollGradientLightInkOnLightBackgroundContrastTolerance`,
   and `DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG` — the same four inputs
   `narrowColumnTypography` itself was computed with. Read `.ink` off the
   result.
4. **`activeSurfaceOffset` and `borderWidth`** stay configurable via
   `ChipAppearanceConfig`/the "Chip Appearance" panel exactly as today —
   they're presentation choices, not part of the color-derivation mismatch.
5. **`colorMode: 'manual'`** stays fully supported and unchanged, as an
   explicit operator escape hatch for literal, fixed colors. Only the
   `'deriveFromBackground'` path on *this specific page* is replaced — the
   shared `resolveChipAppearance`/`deriveChipInk` in `components/Chip/config/`
   are untouched and remain correct for any consumer that has no
   `PolymorphicLayout` column-ink system to plug into (there is no reason to
   couple the shared `Chip` component's config shape to `PolymorphicLayout`
   internals it doesn't know about).

Net effect: `pages/journal.tsx` computes its own `resolvedChipAppearance`
object (same `ResolvedChipAppearance` shape `ArticleFilter`'s `chipAppearance`
prop already expects — no change to `ArticleFilter.tsx` or `Chip.tsx`) using
the page's real, tier-resolved ink pipeline when
`chipAppearanceConfig.colorMode === 'deriveFromBackground'`, and falls back
to `resolveChipAppearance`'s literal `'manual'` branch otherwise. The chip's
unselected border/text will be pixel-identical to `narrowColumnTypography.titleColor`
— the same correctly-derived ink `/abstract`'s own narrow-column text uses;
the filled look's text will be contrast-correct against its own shifted
background using the page's real modulation numbers instead of the shared
component's generic placeholder defaults.

## What to verify after implementing (not yet done — plan only)

1. The unselected chip's border/text color equals
   `narrowColumnTypography.titleColor`'s rendered value exactly (same
   computed string), at every breakpoint tier.
2. The filled chip's text clears the real target contrast ratio (`5`, not
   `4.5`) against its own rendered background at every breakpoint tier
   (`scrollGradientDarkInkSaturation`/`-OpacityMultiplier`/
   `-LightInkOnLightBackgroundContrastTolerance` all vary by tier on this
   page).
3. `colorMode: 'manual'` still renders the exact literal configured colors,
   unchanged.
4. `pages/journal.tsx`'s own existing tests
   (`journal.polymorphicLayoutParity.test.ts`, `journal.editorialAccordion.test.ts`)
   and the new `components/Chip/Chip.test.tsx` still pass; add a new
   assertion (or extend an existing journal test) that the resolved chip ink
   equals `narrowColumnTypography.titleColor` at the default config.
