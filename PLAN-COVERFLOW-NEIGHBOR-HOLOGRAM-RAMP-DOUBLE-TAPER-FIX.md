# Plan — fix the immediate-neighbor color snap on CoverFlow release

## Status

Implemented and verified (2026-09-25), after one reverted regression.

**Revision note:** the first attempt applied only the one-line
`hoverAmplitudeMultiplier` exemption below on its own. That closed the
reported hue/saturation/brightness snap, but introduced a *new*,
previously-invisible regression: `useCardLiftPhysics.ts`'s shadow output
read raw `elevationPx` directly, fully orthogonal to its own
`activationRampCeiling` (see that file's own pre-existing comment on why —
this was true before this plan existed, just never reachable). Restoring
the immediate neighbor's full proximity ceiling let its shadow track live
cursor proximity again with nothing damping it, so the shadow could keep
growing/shrinking after the card's own lift/scale/tilt had already settled
flat — screenshot-reported as an elevation/shadow "jump." That regression
was fixed at the source in the same file (`composeAndApply` now blends the
shadow's elevation input through the same `activationRampCeiling` the
transform already uses, toward `config.shadowElevationRestingPx`) and the
two fixes now ship together in one pass, verified live via real
`box-shadow` computed-style sampling showing a smooth, monotonic fade with
no discontinuity. Both changes described below reflect the final, shipped
version.

## Objective

The card that was just active (now the immediate neighbor, `distanceFromActive
=== 1`) shows its hue/saturation/brightness snap to a dimmer value the
instant a drag-driven CoverFlow navigation releases — while its position
hasn't even started visibly moving yet. Fix this without introducing a new,
separately-tuned timing system (which would risk feeling stiff or clashing
with the existing ramp), and without touching drag/position/click mechanics
at all.

## Root cause (confirmed)

Two independent tapering mechanisms both recede the same card's hologram
response at the exact same moment, and only one of them ramps over time:

1. **The instant one — `pages/abstract.tsx`'s `renderCoverFlowItem`:**
   ```js
   const hoverAmplitudeMultiplier = 1 - Math.min(
     1,
     position.distanceFromActive * coverFlowConfig.inactiveCardHoverAmplitudeStep,
   );
   const hoverAmplitudeTaperedHologramConfig = hoverAmplitudeMultiplier >= 1 ? dockHologramConfig : {
     ...dockHologramConfig,
     offsetGain: dockHologramConfig.offsetGain * hoverAmplitudeMultiplier,
     hueShiftAmount: dockHologramConfig.hueShiftAmount * hoverAmplitudeMultiplier,
     saturationBoost: dockHologramConfig.saturationBoost * hoverAmplitudeMultiplier,
     brightnessBoost: dockHologramConfig.brightnessBoost * hoverAmplitudeMultiplier,
   };
   ```
   `distanceFromActive` is a discrete integer that jumps `0 → 1` in the same
   render `isActive` flips. This multiplier is recomputed fresh every
   render with **no time component at all** — the moment the card stops
   being active, its passed-down `hueShiftAmount`/`saturationBoost`/
   `brightnessBoost`/`offsetGain` are already at their reduced, resting
   values. This is what's snapping.

2. **The already-correct, already-ramped one — `GradientRenderer.tsx`:**
   ```js
   hologramRampProgress = isActiveRef.current ? easedProgress : 1 - easedProgress;
   hologramResponseStrength *= hologramRampProgress;
   hologramHueShift = hologramX * hologramResponseStrength * hologramConfig.hueShiftAmount;
   hologramSaturationBoost = hologramResponseStrength * hologramConfig.saturationBoost;
   hologramBrightnessBoost = hologramResponseStrength * hologramConfig.brightnessBoost;
   ```
   `hologramRampProgress` genuinely eases from `1` to `0` over
   `activationRampDurationMs` (from `activationRampRate`, 800ms at the
   default `1`), keyed off **time since `isActive` last changed** — not
   cursor state. Crucially, this ramp is **cursor-position-independent**: it
   forces the overall response toward 0 within the configured window
   regardless of whether the pointer is still resting over the card.

**The two multiply together** (`hologramConfig.hueShiftAmount` is the
already-reduced value from #1; `hologramResponseStrength` is #2's smooth
ramp). #2 is doing exactly the right thing, correctly and smoothly — but
#1 has already collapsed the ceiling it's ramping *before* #2 gets a chance
to ease anything, so the visible output steps down in one frame regardless
of how gracefully #2 behaves.

**This makes #1 entirely redundant for the immediate neighbor specifically**
— not just visually wrong, but functionally unnecessary. `inactiveCardHoverAmplitudeStep`'s
own doc comment explains why it was deliberately *not* exempted for
distance-1 (`inactiveCardColumnDarkeningStep`'s equivalent exemption doesn't
apply here): "a card that has already left the active slot can still sit
under a stationary cursor... a full-amplitude ceiling that far from a card's
own resting focus is what makes any residual settle timing read as a
visible snap." But `hologramRampProgress` above **already solves exactly
this** — it forces the response toward 0 over `activationRampDurationMs`
regardless of the cursor, because it's driven by elapsed time since
`isActive` changed, not by live proximity. The original safety concern is
already covered by mechanism #2; mechanism #1 is now only adding the snap,
not adding any additional safety.

**The identical structure exists a second time, unreported but almost
certainly present:** `useCardLiftPhysics.ts` has the exact same
`activationRampActive`/`activationRampDurationMs` → `activationRampCeiling`
pattern (confirmed by reading it — same shape, same "time since role
changed, cursor-independent" ramp), and `cardCtaConfig` (feeding
`proximityScale`/`proximityLiftPx`/`tiltMaxDegrees`) is tapered by the exact
same discrete `hoverAmplitudeMultiplier` before reaching it. The screenshots
only show the color/gradient channel snapping (scale/lift/tilt may be less
visually obvious at rest, or simply wasn't what was screenshotted), but the
mechanism is structurally identical and should get the same fix for
consistency, or the same class of snap will resurface for scale/lift/tilt
under different repro conditions.

## Fix

**Exempt distance-1 from `hoverAmplitudeMultiplier`'s taper — mirror
`inactiveCardColumnDarkeningStep`'s own existing exemption exactly** (same
file, a few lines above):

```js
// Before
const hoverAmplitudeMultiplier = 1 - Math.min(
  1,
  position.distanceFromActive * coverFlowConfig.inactiveCardHoverAmplitudeStep,
);

// After
const hoverAmplitudeMultiplier = 1 - Math.min(
  1,
  Math.max(0, position.distanceFromActive - 1) * coverFlowConfig.inactiveCardHoverAmplitudeStep,
);
```

This is a **one-line change**, using a formula already present and proven
in this exact file (`columnDarkeningAmount`'s `Math.max(0, position.distanceFromActive
- 1)`), touching no new files, no new config fields, no new timing system.
For distance-1 (the just-departed active card and the about-to-become-active
incoming card alike), the multiplier now stays `1` — full ceiling — and the
already-correct, already-configured `activationRampDurationMs` ramp inside
`GradientRenderer.tsx` (and, with the mirrored fix below,
`useCardLiftPhysics.ts`) becomes the *sole* mechanism receding that card's
response, exactly the way it already handles the incoming card's ramp-up.
Distance ≥ 2 cards — which `isActive`/the ramp doesn't govern at all — keep
today's exact discrete tapering, unchanged.

**Mirror fix (same reasoning, the unreported twin):** apply the identical
`Math.max(0, distanceFromActive - 1)` change wherever `cardCtaConfig` is
derived from the same `hoverAmplitudeMultiplier` in `pages/abstract.tsx`, so
`useCardLiftPhysics`'s own `activationRampCeiling` becomes the sole mechanism
for the immediate neighbor's scale/lift/tilt too. Since both `cardCtaConfig`
and `hoverAmplitudeTaperedHologramConfig` read the *same*
`hoverAmplitudeMultiplier` value today, this resolved as a single shared
edit rather than two, confirmed once this plan was actually implemented.

**Mandatory companion fix, discovered during implementation (not optional):**
the ceiling exemption above only stays safe if `useCardLiftPhysics.ts`'s own
shadow output is *also* damped by `activationRampCeiling` — see this file's
own doc comment on why the shadow read raw `elevationPx` orthogonally to
that ceiling by original design. Shipping the exemption alone (first
attempt) restored the immediate neighbor's full proximity ceiling — including
its shadow's live cursor-tracking — with nothing left to damp it, producing
a new, screenshot-reported elevation/shadow snap. The fix, in
`composeAndApply`:

```js
// Before
applyElevationShadow(elevationPx, shadowVisibilityRef.current);

// After
const shadowElevationPx = activationRampDurationEffectiveMs > 0
  ? config.shadowElevationRestingPx
    + (elevationPx - config.shadowElevationRestingPx) * activationRampCeiling
  : elevationPx;
applyElevationShadow(shadowElevationPx, shadowVisibilityRef.current);
```

At ceiling `1` (active) this is byte-identical to before — full live
elevation, no behavior change for the active card. At ceiling `0` (fully
receded) the shadow is pinned to `config.shadowElevationRestingPx`
regardless of live cursor state, exactly mirroring how ceiling `0` already
zeroes the transform's own lift/scale/tilt. Both fixes must ship together —
the ceiling exemption above is not safe to apply on its own.

## Why this avoids stiffness and avoids new regressions

- **No new timing system.** The fix doesn't add a duration, an easing curve,
  or a ref-tracked ramp — it removes a redundant, un-ramped competitor to a
  ramp that already exists, is already correctly time-based, and is already
  tuned by the operator-facing `activationRampRate` field. The receding
  card now eases out on the *same* curve the incoming card already eases in
  on — more consistent than today, not a new competing feel.
- **No loosening of the original safety property.** The "lingering cursor on
  a departed card" concern `inactiveCardHoverAmplitudeStep` was written to
  prevent is still fully addressed — `activationRampDurationMs`'s ramp is
  cursor-position-independent by construction (it reads elapsed time since
  `isActive`/`activationRampActive` changed, never the live proximity state),
  so a stationary cursor still can't hold the departed card at full
  amplitude past the ramp window.
- **Zero blast radius on distance ≥ 2 cards.** The `Math.max(0, ... - 1)`
  offset only changes behavior for the one card at distance exactly 1;
  every deeper card's tapering formula and output are untouched.
- **Zero blast radius on drag/click/position mechanics.** Nothing in
  `CoverFlow.tsx` (drag handling, spring/gaussian settle, click-to-snap) or
  the earlier scrim/opacity/gradient-mesh-cover timing fix
  (`PLAN-COVERFLOW-NEIGHBOR-COLOR-TRANSITION-SYNC.md`) is touched — this is
  a narrowly-scoped correction to one derived value in one render function.

## Implementation sequence

1. Locate the exact `hoverAmplitudeMultiplier` expression in
   `pages/abstract.tsx`'s `renderCoverFlowItem` and apply the
   `Math.max(0, position.distanceFromActive - 1)` offset.
2. Confirm `cardCtaConfig`'s own derivation reads the same
   `hoverAmplitudeMultiplier` value (expected, since both are computed from
   it in the same function) — if so, the single change above already covers
   both the hologram and the CTA/lift-physics channel; if the CTA path turns
   out to use an independently-computed multiplier, apply the identical
   offset there too.
3. No config, type, or panel changes are needed — `inactiveCardHoverAmplitudeStep`'s
   own type/default/normalization/panel field are unaffected; only how its
   result is combined with distance changes.

## Verification

1. Reproduce the exact reported repro: drag-release a CoverFlow navigation
   so the card in view becomes the immediate (distance-1) neighbor. Confirm
   its hue/saturation/brightness now eases out smoothly over
   `activationRampDurationMs` instead of snapping in the release frame.
2. Repeat for the symmetric incoming-card case (a neighbor becoming active)
   to confirm the ramp-in side, already largely correct, is unaffected or
   improved.
3. Hover a card, then navigate away from it via drag, and hold the cursor
   in place over its new (off-center) position for longer than
   `activationRampDurationMs` — confirm the hologram response still fully
   recedes to the tapered distance ≥ 2 ceiling once distance actually
   reaches 2, and does not get "held open" at full strength by the
   lingering cursor beyond the ramp window while at distance 1. This is the
   specific regression `inactiveCardHoverAmplitudeStep`'s original
   no-exemption choice was guarding against — must still hold true.
4. Confirm a card at distance ≥ 2 still tapers exactly as before (no visual
   change expected there).
5. Repeat 1-2 for the CTA/lift-physics channel (scale/lift/tilt) if the
   mirror fix in step 2 of Implementation sequence is applied.
