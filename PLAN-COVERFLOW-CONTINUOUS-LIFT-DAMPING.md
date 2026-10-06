# Plan — damp the lift ceiling continuously, before the axis switch, not after

## Status

Implemented and verified (2026-09-25). One deviation from the original
sketch, forced by React's rules of hooks: `CoverFlow.tsx` exposes the
continuous distance as a `MotionValue` (`position.distanceFromActiveLive`),
but the ceiling formula itself (`inactiveCardHoverAmplitudeStep`-shaped) is
resolved inside `AbstractJournalLabCollection.tsx`'s own component body via
`useTransform` — not inside the plain `renderCoverFlowItem` callback in
`pages/abstract.tsx` as originally sketched, since that callback isn't a
component and can't call hooks. `pages/abstract.tsx` now also passes a new
`inactiveCardHoverAmplitudeStep` number prop alongside the MotionValue so
`AbstractJournalLabCollection.tsx` (already CoverFlow/stack-aware) can
resolve the formula without duplicating it, then mirrors the resolved 0-1
ceiling into a plain ref for `useCardLiftPhysics` to read imperatively —
`useCardLiftPhysics.ts` itself stays fully generic, no CoverFlow-specific
knowledge added to it.

**Verified live**, using the exact same transform-matrix-decomposition
method this saga's root-cause analysis used: tracking one identical DOM
node's `getComputedStyle(el).transform` across a real drag-release.
- Quick/short drag: the Y-translate pop at the `isActive` flip dropped from
  the previously-measured **~11.9px** to **~5.0px** (~58% reduction) — the
  drag hadn't fully carried the card to the boundary before release, so
  `distanceFromActiveLive` (and thus the ceiling) hadn't reached its floor
  yet.
- Fuller, slower drag (card allowed to approach the boundary before
  release): the pop dropped to **~1.7px** — barely perceptible, and
  continuing to shrink further the closer the drag gets to the true
  boundary before release.

This confirms the mechanism works exactly as designed: the residual pop
scales with how much runway the live drag had before release, converging
toward zero the more naturally a user's own gesture already approached the
boundary — not a hard guarantee of *exactly* zero in every possible release
velocity, but a large, direct, measured improvement with no flag and no new
duration/easing system.

**Follow-up tuning (2026-09-25):** operator-reported the pop was still
visible, just smaller, on quick drags. Root cause: `inactiveCardHoverAmplitudeStep`
(the field driving this curve's aggressiveness) defaulted to `1`, which
means the continuous lift ceiling only reaches exactly `0` once the card's
live drag position has traveled the *full* distance to the neighbor slot —
most real gestures (quick drags, velocity-projected snaps) release well
before that. Raised the default to `3` (zero by a third of the way there)
and the config ceiling from `1` to `4` so it can be tuned further. Confirmed
safe: the same field also drives a pre-existing *discrete* taper
(`pages/abstract.tsx`'s `hoverAmplitudeMultiplier`, feeding the hologram/CTA
ceiling for distance ≥ 2) that already saturates at `step >= 1` — raising it
further has no effect on that consumer.

Re-verified live with the same method:
- Quick drag: pop dropped from **~5.0px → ~2.1px**, and now reaches a fully
  settled `0` by ~350ms instead of continuing past 900ms.
- Fuller drag: the lift ceiling now reaches `0` *before* release even
  happens — the pop is **fully zero**, not just small, for this gesture
  pattern (previously ~1.7px).

## Objective

Every fix attempted so far reacted to `isActive` flipping (a discrete,
one-render event) by trying to *recover* smoothly afterward — ramping a
ceiling down, blending a shadow's elevation input, etc. All of them left the
same structural gap: `liftAxis` itself flips `'z' -> 'y'` in the same
render `isActive` does, with zero transition of its own, and if the live
`lift` value is still non-trivial at that instant (it usually is — the
cursor was just on the card), the same magnitude that was invisible on Z
reappears as a real Y-displacement in one frame.

The proposed fix inverts the approach: instead of reacting to the flip
after it happens, make the **lift ceiling itself already be at (or very
near) zero by the time the flip occurs** — driven by a continuous signal
that starts falling *before* release, not by a timer that starts *after*
it. If lift is ~0 on both sides of the axis switch, the switch is inert —
0 rendered on Z and 0 rendered on Y look identical. No flag needed, per the
constraint: the axis behavior (`'z'` while active, `'y'` while inactive)
stays exactly as-is; only how the *magnitude* fed into it is computed
changes.

## Why this is better than every prior attempt

Every previous fix (color-duration sync, hologram-taper exemption,
shadow-elevation ramp) was keyed on `isActive`/`activationRampDurationMs` —
a timer that only starts counting **after** the role has already changed.
That structurally cannot prevent a discontinuity that happens **at the
instant of the flip itself**, only smooth out what happens afterward. This
proposal is the first one keyed on a signal that's already moving **before**
the flip: the card's own live position in the carousel, which changes
continuously throughout a drag — well before release ever commits a new
`activeIndex`.

## Current gap: no continuous signal reaches this decision today

`CoverFlow.tsx`'s `CoverFlowItemInner` already computes exactly the right
continuous value every frame, for its own `x`/`rotateY`/`z` transforms:

```js
const x = useTransform(scrollX, (value) => {
  const pos = index - value;
  const absPos = Math.abs(pos); // 0 at fully active, 1 at the immediate neighbour's rest slot
  ...
});
```

But `renderItem` (and everything downstream — `pages/abstract.tsx`'s
`renderCoverFlowItem`, `AbstractJournalLabCollection.tsx`,
`useCardLiftPhysics.ts`) only ever receives the **discrete** distance:

```js
renderItem(item, index, isActive, { width, height }, reveal, {
  distanceFromActive: Math.abs(index - activeIndex), // integer, from the committed index only
});
```

`activeIndex` is the committed React state — it only changes once a
gesture *resolves* to a new index, not continuously as `positionX` (the
live drag/spring value) moves. That's the actual gap: the only distance
signal available to `useCardLiftPhysics` today is the one that changes
*after* the transition, never the one that's already changing *during* it.

## Proposed mechanism

1. **Expose the continuous distance CoverFlow already computes.** Add one
   more `useTransform(scrollX, value => Math.abs(index - value))` in
   `CoverFlowItemInner` (the same computation `x`/`rotateY` already do
   inline — no new math, just surfacing it) and pass it down as an
   additional, purely additive field —
   e.g. `position.distanceFromActiveLive: MotionValue<number>` — alongside
   the existing `distanceFromActive: number`. Every current consumer of
   `position.distanceFromActive` (the plain integer) is untouched; this is
   a new sibling field, not a replacement.

2. **Bridge it into `useCardLiftPhysics` the same way this codebase already
   bridges other live, per-frame signals** — `interactionRef`/
   `hologramInteraction` are already passed as imperative refs updated every
   frame, deliberately *not* as reactive React props, specifically to avoid
   a React re-render per animation frame. `AbstractJournalLabCollection.tsx`
   would subscribe to the new MotionValue via `.on('change', ...)` (a
   standard Framer Motion subscription, no re-render) and write into a new
   ref (`distanceFromActiveLiveRef`), mirroring `interactionRef`'s own
   existing pattern exactly.

3. **Derive the lift ceiling from that continuous value inside
   `useCardLiftPhysics.ts`'s own `composeAndApply`**, reusing
   `CoverFlowConfig.inactiveCardHoverAmplitudeStep`'s existing formula shape
   (no new config field) but fed the continuous value instead of the
   discrete one:
   ```js
   const liftCeiling = 1 - Math.min(1, distanceFromActiveLiveRef.current * inactiveCardHoverAmplitudeStep);
   const lift = elevationPx * liftGain * liftCeiling; // in place of today's activationRampCeiling-only gating
   ```
   As `distanceFromActiveLiveRef.current` rises smoothly from `0` toward
   `1` during the drag itself — well before release — `liftCeiling` falls
   toward `0` in lockstep, every frame, driven by the same value already
   moving the card across the screen. By the time `isActive` actually flips
   and `liftAxis` switches to `'y'`, `liftCeiling` (and therefore `lift`)
   has already been at or near `0` for as long as the drag's own approach
   to the boundary took — the axis switch becomes a non-event.

4. **`activationRampCeiling` (the existing `isActive`-keyed ramp) stays
   in place, composed alongside, not replaced** — it already correctly
   governs the *incoming* card's ramp-up (where `distanceFromActiveLive`
   isn't relevant, since gesture-driven navigation doesn't have a
   symmetric "how close to becoming active" runway the same way release
   does) and still provides a floor for discrete, non-drag transitions
   (click-to-snap, an externally-requested jump, where `positionX` snaps
   via a spring/gaussian curve rather than tracking a live finger 1:1 —
   `distanceFromActiveLive` still tracks that animation continuously too,
   so this composes naturally, not as a special case).

## Design decisions to confirm before implementing

1. **Scope to lift only, or also scale/tilt?** The ask is specifically
   about the lift-axis jump. `proximityScale`/`tiltMaxDegrees` share the
   same `activationRampCeiling` today and did not show up as a reported
   symptom (only `translateY`/shadow did). Recommend scoping this fix to
   `lift` only for now — narrower blast radius, directly targets the
   reported bug — and revisiting scale/tilt separately if a similar
   artifact is ever reported there.
2. **Does the existing `hoverAmplitudeMultiplier` distance-1 exemption
   (`pages/abstract.tsx`, from the hologram-taper fix) still apply once
   distance is continuous for lift specifically?** That exemption was a
   workaround for distance being a *discrete* integer with no gradient
   through the transition. A continuous lift ceiling doesn't need that
   workaround — it can taper smoothly through exactly the region the
   exemption used to protect. Recommend: leave the hologram/color
   `hoverAmplitudeMultiplier` exactly as it is today (it governs a
   different channel — hue/saturation/brightness — already fixed and
   verified working); introduce the continuous signal as lift's own,
   independent ceiling, not a replacement for that one.
3. **Naming/shape of the new `position` field** — `distanceFromActiveLive`
   is a working name; should match this codebase's own established
   "-Live"/"-Ref" naming for imperative, per-frame values (e.g.
   `hologramInteraction`, `interactionRef`) rather than implying it's a
   plain reactive prop.

## Implementation sequence

1. `CoverFlow.tsx`: add the new `useTransform` for continuous distance in
   `CoverFlowItemInner`; extend `CoverFlowRenderItem`'s `position` argument
   type with the new optional/additive field; pass it through the existing
   `renderItem(...)` call.
2. `pages/abstract.tsx`'s `renderCoverFlowItem`: accept the new field,
   thread it down to wherever `AbstractJournalLabCollection`/`Card` is
   invoked (likely a new prop alongside the existing `hologramInteraction`-
   style refs).
3. `AbstractJournalLabCollection.tsx`: subscribe to the MotionValue via
   `.on('change', ...)` into a new ref, matching `interactionRef`'s own
   existing subscription pattern; pass the ref (or its `.current` reader)
   into `useCardLiftPhysics`.
4. `useCardLiftPhysics.ts`: read the new continuous-distance ref inside
   `composeAndApply`, compute `liftCeiling` from it using
   `inactiveCardHoverAmplitudeStep`'s existing formula shape, and multiply
   it into `lift` (only `lift`, per the scoping decision above) alongside
   the existing `activationRampCeiling`.
5. No new config fields, no new duration/easing knobs, no flag — reuses
   `inactiveCardHoverAmplitudeStep` (existing) fed a new, continuous input.

## Verification

1. Reproduce the exact repro: drag-release navigation on the card that was
   active. Confirm no visible Y-position jump — the same transform-matrix
   decomposition method already used in this saga's root-cause analysis
   (reading `getComputedStyle(el).transform` on the identical DOM node
   across the gesture) should show the Y-translate component already at
   (or extremely close to) `0` in the frame immediately after `isActive`
   flips, rather than a fresh non-zero value appearing there.
2. Confirm the SAME test performed via click-to-snap (not drag) still
   behaves correctly — the continuous signal should track the
   spring/gaussian settle curve smoothly there too, not just raw finger
   drags.
3. Confirm a card that never gets dragged near the boundary (e.g. an
   operator clicks a distant Timeline row, jumping several cards at once)
   doesn't show any different lift behavior for cards it never passes
   through — `distanceFromActiveLive` for those cards moves from a large
   value straight past 1 without lingering, so their lift ceiling was
   already at its floor throughout, unaffected.
4. Confirm `prefersReducedMotion` remains an honest instant state (no
   added motion) — `useCardLiftPhysics.ts` already computes
   `activationRampDurationEffectiveMs` as `0` under that flag; the new
   `liftCeiling` should follow the same convention (either short-circuited
   to the discrete resting value under reduced motion, or naturally
   irrelevant since `elevationPx` itself is likely already suppressed
   there — confirm which, don't assume).
