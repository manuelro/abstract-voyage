# PLAN-COVERFLOW-NARROW-GRADIENT-SYNC

## Objective

On `/abstract` (desktop/Lg), enrich the narrow column's scroll-gradient
background — `scrollGradientNarrowColumnSaturationLg` 1 → 1.16,
`scrollGradientNarrowColumnDarknessLg` 0 → 0.03 — at the specific moment
CoverFlow's first card (index 0) stops being the active card and becomes
the left-side inactive neighbor. Pristine state (image 14, card 0 active)
keeps today's flat values; the first navigation away (image 15, card 0 now
left-of-center) is the trigger for the richer tint.

## What already exists (don't rebuild)

- `pages/abstract.tsx` already holds `splitColumnLayoutConfig` as
  `useState<PolymorphicLayoutConfig>` (~line 1799), seeded from
  `ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG`. `usePolymorphicLayoutColors(config, …)`
  (`PolymorphicLayout.tsx:215`) re-derives every gradient value from this
  object on every render — `scrollGradientNarrowColumnSaturation`/`-Darkness`
  (`PolymorphicLayout.tsx:278-279`) are read straight off `config`, no
  memo barrier blocks a runtime override. Nothing needs to be added to
  `PolymorphicLayout.pageConfigs.ts` for this — the *base* (card-0-active)
  values stay exactly as `ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG` already
  defines them (1 / 0); only the *navigated* target is new, and per the
  task's own scope that target belongs in `CoverFlow.config.ts` (see
  "New config knobs" below), not hardcoded in `pages/abstract.tsx` or
  duplicated into `PolymorphicLayout.pageConfigs.ts`.
- `CoverFlowConfig` already carries fields that CoverFlow.tsx itself never
  reads — `inactiveCardColumnDarkeningStep`/`inactiveCardHoverAmplitudeStep`
  are defined and clamped in `CoverFlow.config.ts`, but `grep` confirms
  neither name appears in `CoverFlow.tsx`; `pages/abstract.tsx` reads them
  directly off its own `coverFlowConfig` state
  (`coverFlowConfig.inactiveCardColumnDarkeningStep`, line ~4633) to
  compute values CoverFlow itself has no opinion about. This is the exact
  precedent for the two new fields below: CoverFlow.config.ts is already
  used as the operator-facing home for "a number this page's own render
  logic needs, panel-editable, geometry-component-adjacent but not
  actually consumed by the geometry component."
- `pages/abstract.tsx` already has the exact "detect the transition off the
  previously-active card" pattern, built for the mesh-performance state
  machine (~line 4506-4539): a `coverFlowPrevActiveIndexRef` ref plus a
  `useEffect` keyed on `articleActiveIndex` that fires once per index
  change and knows both the new index and the one being left. This is the
  same signal the gradient trigger needs — same `articleActiveIndex` state
  already feeds both `<CoverFlow>` instances (line 5437, 5464, 5639).
- `PolymorphicScrollGradientBackground.tsx` already runs a
  `requestAnimationFrame` loop that exponentially smooths a live value
  toward a target using `alphaFromTau(dt, tauMs)` (line 538, tau sourced
  from `scrollGradientTauMs`) — the established "ease a config number
  toward a moving target over time" mechanism in this codebase, currently
  used for scroll-driven darken/adaptive-ink. This is the natural mechanism
  to reuse if the saturation/darkness change should ease in rather than
  pop.

## Options

### A — Discrete index threshold, instant swap (cheapest)
Add a small `useEffect` beside the existing mesh-state one, keyed on
`articleActiveIndex`: once `articleActiveIndex > 0` for the first time,
patch `splitColumnLayoutConfig` (`setSplitColumnLayoutConfig(prev => ({
...prev, scrollGradientNarrowColumnSaturationLg: 1.16,
scrollGradientNarrowColumnDarknessLg: 0.03 }))`); reset back to `1`/`0`
only if `articleActiveIndex` returns to `0` (optional — see Open
Questions). No new mechanism, no new file. The visual change is an
instant pop timed to the same render tick the card's own position spring
starts animating — because the delta is small (saturation +0.16, darkness
+0.03), a pop at this magnitude is close to imperceptible next to a
~1.1-1.3s card transition (`gaussianSettleBaseDurationMs`/`-PerStepDurationMs`
in `CoverFlow.config.ts`), but it is not literally eased.

### B — Same trigger, eased via the existing tau-smoothing mechanism (recommended)
Same trigger as A, but instead of writing the target values straight into
`splitColumnLayoutConfig`, drive them through a small local RAF loop that
reuses `alphaFromTau` (already imported by
`PolymorphicScrollGradientBackground.tsx`, itself already imported by
`experiences/abstract/components` — no new dependency) to ease from the
current value to the target over a tau matched to (or a fraction of) the
card's own settle duration, then commits the eased value into
`splitColumnLayoutConfig` each frame. This makes the tint's own arrival
track the card's motion instead of snapping the instant the state flips,
without inventing a second animation system — same primitive the gradient
background already uses for its own scroll-driven easing.

### C — Continuous, position-driven (most connected, most invasive)
Extend `CoverFlowExternalGeometry`/add an `onPositionChange` to
`CoverFlowProps` so the parent receives CoverFlow's continuous internal
`positionX` (currently private — `CoverFlow.tsx:418`), then interpolate
`scrollGradientNarrowColumnSaturationLg`/`-DarknessLg` as a direct function
of `positionX` crossing `0 → 1` (fully continuous — the tint arrives in
lockstep with the card's own motion, not just at the same start time).
Requires a `CoverFlow.tsx` prop-surface change (new public contract on a
component with an existing, carefully-scoped prop list — see its own
`CoverFlowExternalDriver` doc comments) and touches every other caller's
type-check even though behavior stays opt-in. Justified only if A/B read
as insufficiently "connected" once live — CoverFlow doesn't expose this
today, and its existing `distanceFromActive` passed to `renderItem` is
itself discrete (`Math.abs(index - activeIndex)`, recomputed from the
committed `activeIndex`, not from `positionX`), so even CoverFlow's own
card rendering doesn't currently have continuous distance to react to —
this would be new ground for the component, not a reuse.

### D — CSS-only crossfade (rejected as a starting point)
Toggle a class/CSS custom property pair and let a CSS `transition` ease
the resolved narrow-column background color. Rejected because the two
target fields (`scrollGradientNarrowColumnSaturationLg`/`-DarknessLg`)
feed into gradient-stop *generation* (`sampleScrollGradientColor` in
`PolymorphicLayout.tsx:494-512`), not a single CSS color value — there is
no single CSS property a `transition` could animate between "current
stops" and "target stops" without first collapsing them to one resolved
color per frame in JS anyway, at which point it's option B with extra
steps.

## Recommendation

Ship **B**: same trigger point as the already-existing mesh-activation
effect (`articleActiveIndex` change, previous-index known via ref),
committed through the codebase's own existing tau-smoothing primitive
rather than a raw state write. This is the smallest change that (a)
fires at the literal moment specified — card 0 leaving active — and
(b) avoids a visible pop by reusing motion infrastructure this component
tree already has, instead of adding a second one.

Fall back to **A** first if the eased version isn't worth the extra RAF
loop once seen live — given how small the value deltas are (1 → 1.16,
0 → 0.03), the instant version may already read as connected because it
lands in the same frame the card starts moving.

Escalate to **C** only if A/B are live-reviewed and still read as
disconnected — it's a real capability CoverFlow doesn't expose today
(continuous position out), not a small addition.

## Open questions for the operator

1. **Does the enrichment revert if the user navigates back to card 0?**
   Two readings: (a) the narrow column stays enriched permanently after
   the first departure from index 0 ("has the user ever scrolled" state),
   or (b) it's tied to "is card 0 currently inactive" and un-enriches the
   moment index 0 is active again (symmetric with images 14/15). The
   trigger effect's shape differs slightly (one-time latch vs. every
   index change), so this should be confirmed before implementing either
   A or B.
2. **Does this apply to every subsequent transition, or only the very
   first one?** The task specifically calls out "the first card... about
   to become inactive" — worth confirming whether card 1→2, 2→3, etc.
   should hold the enriched values steady (most likely reading) rather
   than re-triggering or reverting on every subsequent step.
3. **Mobile/base and Wide tiers**: the two target config fields are
   Lg-only (`...SaturationLg`/`...DarknessLg`); confirm this capability is
   desktop-only by design (matches `scrollGradientNarrowColumnVariantEnabledLg`
   already being Lg-gated) and not meant to have a Wide/base equivalent
   which the current CoverFlow desktop-only carousel wouldn't have anyway.

**Resolved** (operator confirmed): revert to base values once card 0 is
back in the starting/active position — symmetric, not a one-way latch.
The "every transition past index 0 holds steady" and "Lg-only" readings
below are still this plan's own assumption, not separately reconfirmed,
but are unchanged and kept for the same reasons stated originally.

## Implementation plan — Option B

- **Revert on return to index 0**: confirmed. `articleActiveIndex === 0`
  (card 1 in 1-indexed/user-facing terms back in the starting position)
  drives the target back to the base values, so images 14 and 15 stay
  exact opposites of each other regardless of navigation history — not a
  one-way latch.
- **Every transition past index 0, not just the first**: the enrichment is
  a binary target keyed on `articleActiveIndex === 0` vs. `> 0`, not
  "count of transitions so far" — so it engages once on the first move off
  card 0 and then holds steady (the eased value has already arrived at its
  ceiling) for every further 1→2, 2→3, … step. No re-trigger, no
  per-step increment.
- **Lg-only**: yes — no Wide/base equivalent. CoverFlow's desktop
  narrow-column variant (`scrollGradientNarrowColumnVariantEnabledLg`) is
  itself Lg-gated already, and the two target fields don't have Wide/base
  counterparts in `CoverFlowConfig` or in `ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG`.

### New config knobs — `CoverFlow.config.ts`

Per this task's own scope, the *navigated* target values become
operator-facing, panel-editable `CoverFlowConfig` fields — not literals
hardcoded into the `pages/abstract.tsx` effect. This makes "what does the
narrow column look like once navigated" tunable the same way every other
CoverFlow-adjacent visual value already is (`inactiveCardColumnDarkeningStep`
et al.), and self-documents the base-vs-navigated pairing rather than
leaving the navigated numbers to be discovered only inside an effect body.

```ts
/** Narrow-column scroll-gradient target once CoverFlow has navigated away
 * from the first card (index 0) — see PLAN-COVERFLOW-NARROW-GRADIENT-SYNC.md.
 * CoverFlow.tsx never reads this itself (same precedent as
 * inactiveCardColumnDarkeningStep above): pages/abstract.tsx reads it
 * directly off its own coverFlowConfig state and eases
 * PolymorphicLayoutConfig's own scrollGradientNarrowColumnSaturationLg
 * toward it as articleActiveIndex leaves/returns to 0. Same 0-2 range
 * PolymorphicLayout.config.ts's own scrollGradientNarrowColumnSaturationLg
 * clamps to — this is a target for that exact field, not an independent
 * scale. Defaults to the pristine base value (1) — not the operator's
 * already-requested 1.16 — so an uninitialized/reset panel value is
 * byte-identical to "no enrichment," matching every other CoverFlowConfig
 * field's own opt-in-from-neutral convention; the live page config below
 * is what actually ships 1.16. */
narrowColumnGradientSaturationOnNavigateLg: number;
/** Companion to the above, target for scrollGradientNarrowColumnDarknessLg.
 * Same 0-1 range that field clamps to. Defaults to 0 (the base value) for
 * the same neutral-default reason. */
narrowColumnGradientDarknessOnNavigateLg: number;
```

`DEFAULT_COVER_FLOW_CONFIG` additions: `narrowColumnGradientSaturationOnNavigateLg:
1`, `narrowColumnGradientDarknessOnNavigateLg: 0` — neutral, matching the
"every existing caller stays byte-identical" convention this file already
follows for every opt-in field. The operator's actual requested values
(1.16 / 0.03) get set live through the panel (`onChange: setCoverFlowConfig`,
already wired at `pages/abstract.tsx:3016`) the same way every other
CoverFlow value is tuned today — no separate per-page CoverFlow config
file exists to hardcode them into (unlike PolymorphicLayout's
`pageConfigs.ts` pattern), and none needs to be created for two fields.

`normalizeCoverFlowConfig` additions, mirroring the existing
`clampRange`-style calls immediately below the type (reusing this file's
own `clamp` import, matching `cardDistanceRatioLg`'s own
`clamp(base.cardDistanceRatioLg, CARD_DISTANCE_RATIO_MIN,
CARD_DISTANCE_RATIO_MAX)` shape) — two new module-level constants,
`NARROW_COLUMN_GRADIENT_SATURATION_ON_NAVIGATE_MIN/MAX` (0/2) and
`NARROW_COLUMN_GRADIENT_DARKNESS_ON_NAVIGATE_MIN/MAX` (0/1), alongside the
file's other `_MIN`/`_MAX` constants.

### Target derivation

```
enrichmentTarget = articleActiveIndex === 0 ? 0 : 1   // 0..1
saturationLg = lerp(1, coverFlowConfig.narrowColumnGradientSaturationOnNavigateLg, smoothedEnrichment)
darknessLg   = lerp(0, coverFlowConfig.narrowColumnGradientDarknessOnNavigateLg,   smoothedEnrichment)
```

`smoothedEnrichment` is the tau-eased value described below — never the
raw target directly, so both the enrich and the revert ease rather than
pop. The base endpoints (`1`, `0`) are still `ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG`'s
own `scrollGradientNarrowColumnSaturationLg`/`-DarknessLg` values, read
off `splitColumnLayoutConfig` rather than re-literaled here, so a future
change to the page's own base values doesn't silently desync from this
effect's starting point.

### Reuse the file's own existing rAF+tau pattern, not a new mechanism

`pages/abstract.tsx:2601-2670` already runs exactly this shape of loop —
`targetRef`/`smoothRef`/`rafRef`/`lastTsRef`, `alphaFromTau`, a
`schedule()` that only starts a frame if one isn't already pending, and
the already-fixed "reset `lastTsRef` on schedule, not on convergence"
gotcha documented in that same block (a bug this codebase has hit twice
before on the OTHER two rAF loops it already runs — worth inheriting the
fix, not re-discovering it). New code should be a sibling loop with the
same shape, not a shared abstraction — the existing three loops
(`PolymorphicScrollGradientBackground.tsx`, `useScrollAdaptiveInk.ts`,
this file's own list-darken effect) are already independent, inlined
copies of the same nine lines; matching that precedent, per this repo's
existing style, beats extracting a fourth shared helper for one more
caller.

One real difference from the existing loop: that one writes its smoothed
value to a CSS custom property (`el.style.setProperty(...)`) specifically
so the parent component never re-renders on every scroll frame. This
loop's output (`scrollGradientNarrowColumnSaturationLg`/`-DarknessLg`)
instead has to land inside `splitColumnLayoutConfig` — plain numbers
consumed deep inside `usePolymorphicLayoutColors`
(`PolymorphicLayout.tsx:278-279`, then `sampleScrollGradientColor`'s own
`saturation`/`darkness` params at `PolymorphicLayout.tsx:508-511`) — so
there is no CSS-var shortcut available here; the value has to travel
through React state.

### Performance note (read before implementing, not after)

`usePolymorphicLayoutColors` is called unmemoized
(`pages/abstract.tsx:2203`), and the harmonic-gradient stop generation
inside it (`PolymorphicLayout.tsx:478-489`,
`generateHarmonicGradient(...)`) has no `useMemo` gate — it does not
depend on `scrollGradientNarrowColumnSaturationLg`/`-DarknessLg` at all,
but it currently reruns on literally every render of this
900+-line page component regardless, including ones this new rAF loop
would cause. This is an existing, unrelated cost (present today any time
this page re-renders for any reason), not something this feature
introduces — but this feature is the first thing that would turn it into
a **sustained 60fps** cost for the duration of the ease, where today it's
only ever a per-interaction cost.

Two ways to keep this bounded, in order of preference:

1. **Keep the eased transition short** (roughly match
   `activeSettleDelayMs`/the card's own settle time, ~200-400ms) so the
   rAF loop is a brief, bounded burst tied to one user action — directly
   analogous to CoverFlow's own position spring already causing a similar
   burst of re-renders elsewhere on this same page during every card
   transition, not a new category of cost. Convergence-based stop
   (`Math.abs(target - current) >= 0.001`, same threshold the existing
   loop uses) keeps it from running longer than needed.
2. **If that still reads as janky live**, memoize
   `generateHarmonicGradient`'s call inside `usePolymorphicLayoutColors`
   on its actual inputs (`baseHue`/`hueScheme`/`lightnessMin`/
   `chromaMin`/`mode`/`stops`/`variance`/`centerStretch`/`seed` — none of
   which this feature touches) — a legitimate, narrowly-scoped perf fix,
   but to `PolymorphicLayout.tsx`, a file shared by `/about`, `/abstract`,
   and posts-lab. Raise this as its own follow-up if needed rather than
   bundling a shared-file change into this task's diff.

Start with (1); only reach for (2) if a live check shows it's not enough.

### Concrete edit — `CoverFlow.config.ts`

1. Add the two fields to the `CoverFlowConfig` type (doc comments as
   drafted above), immediately after `inactiveCardHoverAmplitudeStep` —
   same "CoverFlow.tsx doesn't read this, the calling page does" category
   of field, kept adjacent to its one existing sibling in that category.
2. Add both to `DEFAULT_COVER_FLOW_CONFIG` with neutral defaults (`1`,
   `0`).
3. Add the two `_MIN`/`_MAX` constants and the two corresponding
   `clamp(...)` calls inside `normalizeCoverFlowConfig`.

### Concrete edit — `pages/abstract.tsx`

Add a new effect immediately after the existing mesh-activation effect
(~line 4539), same locality, same `articleActiveIndex` dependency:

1. Refs: `narrowGradientEnrichTargetRef` (0 or 1, written synchronously
   whenever `articleActiveIndex` changes — no need to wait for an
   effect), `narrowGradientEnrichSmoothRef` (0..1, persists across
   renders), `narrowGradientRafRef`, `narrowGradientLastTsRef` — same
   four-ref shape as the existing loop.
2. A `tauMsRef` sourced from `colors.scrollGradientResolved.tauMs` (reuse
   the page's existing gradient tau rather than adding a new operator
   knob — matches the "reuse an existing config value instead of
   inventing a parallel one" precedent already followed elsewhere in this
   file for the identical smoothing shape).
3. A `navigateTargetsRef` tracking the three live inputs the tick loop
   needs but shouldn't force the effect to re-run for: the page's own
   base values (`splitColumnLayoutConfig.scrollGradientNarrowColumnSaturationLg`/
   `-DarknessLg`, i.e. `1`/`0` today, read live rather than re-literaled)
   and the two new `coverFlowConfig.narrowColumnGradientSaturationOnNavigateLg`/
   `-DarknessOnNavigateLg` targets — updated on every render the same way
   `tauMsRef.current` already is, so a live panel edit to either config
   takes effect on the next tick without tearing the loop down.
4. `useEffect` keyed on `articleActiveIndex`: set
   `narrowGradientEnrichTargetRef.current = articleActiveIndex === 0 ? 0
   : 1`, then `schedule()` the loop (same guarded-single-rAF pattern).
5. The `tick(ts)` function: same `alphaFromTau(dt, tauMsRef.current)` +
   exponential-approach math as the existing loop, then
   `lerp(base, navigateTargetsRef.current.saturation, smoothed)` /
   `lerp(base, navigateTargetsRef.current.darkness, smoothed)` in place of
   the hardcoded `1.16`/`0.03` literals, then — instead of
   `el.style.setProperty(...)` — call
   `setSplitColumnLayoutConfig(prev => (prev.scrollGradientNarrowColumnSaturationLg
   === saturation && prev.scrollGradientNarrowColumnDarknessLg === darkness
   ? prev : { ...prev, scrollGradientNarrowColumnSaturationLg: saturation,
   scrollGradientNarrowColumnDarknessLg: darkness })` — the no-op guard
   matters here (unlike the CSS-var version) since every call is a real
   `setState`, and skipping identical writes avoids scheduling an empty
   render once the value has converged and rounding keeps producing the
   same number frame over frame.
6. Same cleanup effect shape (`return () => { if (rafRef.current !==
   null) cancelAnimationFrame(rafRef.current); }`) plus canceling on
   unmount.

No changes needed to `CoverFlow.tsx`, `PolymorphicLayout.pageConfigs.ts`,
or `PolymorphicLayout.tsx` — CoverFlow.tsx doesn't need to know this
field pair exists (matching `inactiveCardColumnDarkeningStep`'s own
precedent), and the two base-value fields in
`ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG` already exist and are already read
per-render; this only adds the CoverFlow config fields and the page
effect that eases between them.

### Verification

1. Dev server, `/abstract` at an Lg viewport (≥1024px).
2. Confirm the narrow column matches image 14 (baseline) at rest on card 0.
3. Navigate forward one card; confirm the narrow column tint visibly (if
   subtly) enriches as card 0 recedes to the left, converging by the time
   the card settles — not a hard pop, not still visibly animating well
   after the card has stopped.
4. Navigate back to card 0; confirm it eases back to baseline, matching
   image 14 again.
5. Rapid back-and-forth (click through several cards quickly): confirm no
   visible jank/frame drop and no stuck/incorrect final value (the no-op
   `setState` guard and `schedule()`'s "only one rAF in flight" guard are
   what this step is actually checking).
6. Panel check: edit `narrowColumnGradientSaturationOnNavigateLg`/
   `-DarknessOnNavigateLg` live via the CoverFlow panel while a card past
   index 0 is active; confirm the narrow column updates to the new target
   without needing a re-navigation (covers the "live panel edit takes
   effect on the next tick" requirement from step 3 of the `pages/abstract.tsx`
   edit above).
7. `tsc --noEmit` clean.
