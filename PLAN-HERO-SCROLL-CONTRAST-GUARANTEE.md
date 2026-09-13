# Hero Scroll-Gradient Contrast Guarantee — Plan

## Problem, restated precisely

`/abstract`'s hero paragraph/headline (`AbstractEditorialHero.tsx`) already
animates on scroll: while `paragraphUsesWordmarkGradient` +
`paragraphGradientScrollLightenEnabled` are on (both true by default,
`paragraphGradientScrollLightenMaxAmount: 0.75`), each wordmark-gradient stop
used as the text's `background-clip: text` fill is `color-mix()`'d toward
white, live, via a `--paragraph-gradient-lighten-progress` CSS var written by
its own `requestAnimationFrame` loop. This shares its timing curve
(`scrollGradientViewportRangeVh`/`scrollGradientTauMs`) with the separate
black-overlay darken effect in `PolymorphicScrollGradientBackground.tsx`, but
the two are otherwise **independently authored** — a `0.82` max darken on one
side, a `0.75` max white-mix on the other, never cross-checked against each
other. Nothing has ever guaranteed a real WCAG contrast ratio holds at every
point along that shared curve; the screenshot's mid-scroll illegible band is
exactly that gap. `AbstractEditorialHero.config.ts`'s own doc comment on
`paragraphGradientScrollLightenEnabled` confirms this was already a
"screenshot-reported, live" fix once before — patched with a fixed ratio
(0.75), not a measured guarantee, so the same class of bug can and did recur.

## Feasibility: high, no new dependency

`colord` + its `a11y` plugin (`.contrast()`) is already a project dependency,
already used this exact way in `helpers/harmonicGradient.ts`
(`adjustLightnessForContrast`) and in
`PolymorphicScrollGradientWordmarkStops.ts`. `colord/plugins/mix` also ships
in `node_modules/colord/plugins/` already — no new package needed to
linear-blend a color toward white in JS for a pre-check. Black-over-color
compositing (what the background darken overlay visually does) is just
`rgb × (1 − opacity)`, cheap to evaluate without re-running
`generateHarmonicGradient`.

## Where `PolymorphicLayout.pageConfigs.ts` actually fits

**It likely needs zero new fields.** Every raw ingredient the fix needs
already lives there, per page, today: the background recipe
(`scrollGradientBaseHue/-HueScheme/-LightnessMin/-ChromaMin/-Mode/-Stops/
-Variance/-CenterStretch/-Seed`), the ink color (`scrollGradientInkColor`),
the darken ceiling (`scrollGradientMaxDarken`), and the shared timing
(`scrollGradientViewportRangeVh`, `scrollGradientTauMs`). The bug isn't
missing data — it's that the *consuming* code (`PolymorphicLayout.tsx`'s
`usePolymorphicLayoutColors()` and `AbstractEditorialHero.tsx`'s own effect)
never combines this data into a measured contrast check. This plan is
consuming those existing values more fully, not adding to them — consistent
with reusing existing knobs rather than inventing parallel ones.

The one new tunable — a target contrast ratio — is a property of the hero's
own text-lightening behavior, not of `PolymorphicLayoutConfig`'s background
recipe, so it belongs in `AbstractEditorialHero.config.ts` /
`pages/abstract.config.ts`, not in the scoped file. Flagging this explicitly
since it's the main reason this isn't a single-file change, same caveat the
prior `PLAN-WORDMARK-SCROLL-GRADIENT-INTEGRATION.md` raised about its own
named scope file.

## Recommended fix (self-contained, text-side only)

Extend the *existing* mechanism rather than building a second one:

1. **`PolymorphicLayout.tsx`** (`usePolymorphicLayoutColors()`): alongside
   the existing `scrollGradientResolved` object already built from the
   active tier's recipe, also compute and expose the recipe's own **origin
   stop color** — `generateHarmonicGradient(recipe)[0].color` (the same call
   `PolymorphicScrollGradientBackground.tsx` already makes; the hero sits in
   the same `circle at 0% 0%` corner the gradient originates from, so this
   is a reasonable, cheap proxy for "the background color behind the hero
   text" without DOM sampling). Expose it as e.g.
   `colors.scrollGradientOriginColor`.

2. **Page wiring** (`pages/abstract.tsx`, next to the existing
   `scrollGradientDarkenViewportRangeVh`/`-TauMs` props at the
   `<AbstractEditorialHero>` call site, line ~4263): pass
   `scrollGradientOriginColor={colors.scrollGradientOriginColor}` and
   `scrollGradientMaxDarken={colors.scrollGradientResolved.maxDarken}`
   through, same pattern as the two props already threaded there.

3. **`AbstractEditorialHero.tsx`**: inside the existing rAF `tick()` (not a
   new loop — the same one already smoothing `current` progress every
   frame during active scroll, idle otherwise), after computing `current`:
   - Derive the effective background at this progress:
     `originColor scaled by (1 − current × maxDarken)`.
   - Derive the effective text color at the *linearly scheduled* mix
     (today's `current × 0.75`, or whatever
     `paragraphGradientScrollLightenMaxAmount` resolves to) using
     `colord(stopColor).mix('#fff', linearMixAmount)`.
   - If `colord(effectiveText).contrast(effectiveBg)` is below the target
     ratio, binary-search (same 16-step pattern `adjustLightnessForContrast`
     already uses) the minimum mix amount — **uncapped from the authored
     0.75 ceiling, up to 1.0 (pure white)** — that clears the target, and
     write that value instead of the linear one.
   - Only the *worst-case* stop (typically the darkest/most saturated one)
     needs checking per frame, not all of them, to keep this cheap.
   - Write the resulting value to the same
     `--paragraph-gradient-lighten-progress`-driven CSS var machinery
     already in place — no new CSS, no new custom property.

4. **New config field** (`AbstractEditorialHero.config.ts`): a
   `paragraphGradientScrollLightenTargetContrastRatio` (default `3` — WCAG's
   "large text" floor, appropriate for a headline; expose as an
   operator-editable panel field, sensible clamp `[1, 21]`). When absent/0,
   behavior is byte-identical to today (linear-only, no correction) —
   matches this codebase's existing "opt-in, inert by default" convention
   for every other field of this kind.

Why text-only, not also correcting the background darken: the background
`<div>` sits behind the *entire* viewport, not just the hero copy — nudging
its schedule for one region's legibility risks visibly over-darkening
content that was already fine. The text-side mechanism is single-purpose,
already half-solves this exact problem, and extending its own ceiling
dynamically is a fully self-contained change inside one component. Treat
background-side co-correction as an optional phase 2 if a future page's ink
color is dark enough that pushing text toward white can't reach target
contrast on its own (not the case for either of today's two ink colors,
`#1b67ff` and `#f8fafc` — both already light-leaning).

## Files touched (estimate)

- `experiences/abstract/components/PolymorphicLayout.tsx` — expose
  `scrollGradientOriginColor` on `usePolymorphicLayoutColors()`'s return
  value.
- `pages/abstract.tsx` — two new props at the existing
  `<AbstractEditorialHero>` call site(s) (there are two branches, line
  ~4231 and ~4729 per the earlier grep — both need the same two props).
- `experiences/abstract/components/AbstractEditorialHero.tsx` — extend the
  existing rAF tick with the contrast check + binary search; two new
  optional props (`scrollGradientOriginColor`, `scrollGradientMaxDarken`).
- `experiences/abstract/components/AbstractEditorialHero.config.ts` — one
  new field + normalize/default entry
  (`paragraphGradientScrollLightenTargetContrastRatio`).
- `pages/abstract.config.ts` (and any other page instancing
  `AbstractEditorialHeroConfig` that opts into
  `paragraphGradientScrollLightenEnabled`) — default the new field.
- `experiences/abstract/components/AbstractEditorialHero.panel.ts` — one
  new panel field (numeric, alongside the existing
  `paragraphGradientScrollLightenMaxAmount` control).
- **`PolymorphicLayout.pageConfigs.ts`** (the named scope) — no field
  changes expected; verify after implementation that no `satisfies` failure
  appears (it shouldn't, since no new `PolymorphicLayoutConfig` field is
  proposed).

## Verification plan

- Dev server, `/abstract`, mobile viewport (the only tier with
  `scrollGradientEnabled: true` + the hero's lighten opt-in today): scroll
  slowly through the full range, confirm no point along the scroll shows the
  screenshot's cyan-on-blue collision — the darkest/most saturated wordmark
  stop should stay legible throughout, not just at rest.
- Confirm behavior at `paragraphGradientScrollLightenTargetContrastRatio`
  unset/0 is byte-identical to current production (regression guard).
- Toggle the new ratio field between e.g. `1` (no effective floor) and
  `4.5` (AA body-text strength) in the panel, confirm the correction visibly
  engages earlier/later along the scroll accordingly.
- Confirm `/about` and any other `AbstractEditorialHero` consumer not
  opting into `paragraphGradientScrollLightenEnabled` is visually unchanged.
- Resize across breakpoints where the active tier's `scrollGradientEnabled`
  turns off (Wide/Lg for `/abstract`) and confirm the correction correctly
  disengages along with the rest of the scroll-gradient feature.
