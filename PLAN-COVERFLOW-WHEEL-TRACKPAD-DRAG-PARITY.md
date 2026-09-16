# Plan: make wheel/trackpad navigation feel like dragging (continuous tracking + velocity-seeded settle)

**Revision note (2026-09-15, second pass):** operator report — on the desktop CoverFlow, a single trackpad swipe currently advances **two** cards instead of one, when the intended feel is a smooth, drag-like single-index move per gesture. Diagnosed below (root cause section) as a direct, deducible consequence of the current accumulator design already described in "Current wheel mechanism," not a separate bug — the design change in "Design" already eliminates it as a side effect, but it's called out explicitly since it's the concrete symptom motivating this plan and worth confirming closed during verification.

## Root cause of the "moves two at once" report

A single real trackpad swipe (two-finger horizontal gesture, OS-native momentum tail) commonly spans **300-500ms+** and easily accumulates well over `scrollThresholdPx`'s default of `100`px of total `deltaX` across the many small `wheel` events it dispatches. But the current handler's two timing guards are both shorter than that:

- `lastJump` cooldown: **150ms** (`CoverFlow.tsx:645`) — re-arms well before a single swipe's own event stream ends.
- Gesture-reset gap: **200ms** (`:638`) — a fast, continuous trackpad swipe rarely leaves a 200ms silence *mid-swipe* (that's what ends it), so the accumulator is never reset by the gap until the whole gesture is already over.

The consequence: nothing stops the **same physical swipe** from crossing the `100`px threshold, firing `jumpToIndex` once, resetting the accumulator to `0`, and then — since the swipe's own `deltaX` keeps arriving and the 150ms cooldown has already re-armed well before the swipe's momentum tail finishes — crossing the threshold a **second time** before the gap-reset ever gets a chance to end the gesture. One swipe, two threshold-crossings, two discrete one-step jumps: exactly the reported "moves two items at a time." This is a straightforward reading of the existing, already-confirmed constants (`scrollThresholdPx: 100`, cooldown `150ms`, gap `200ms`) against a real trackpad gesture's own typical duration and total travel — not something that needs new live measurement to explain, though confirming it disappears post-fix is still part of verification below.

**Why the "Design" section's fix removes this structurally, not just tunes around it:** replacing the threshold-crossing-counts-as-a-discrete-event model with continuous `positionX` tracking means there is no longer a "threshold" to cross multiple times within one gesture — the whole swipe becomes one continuous position update, and exactly one settle fires once release is detected (§2), landing on whichever index the accumulated travel and final velocity actually justify (one step for a normal swipe, more only if the user genuinely scrolled far enough to warrant it — the same proportionality drag already has, where flicking harder or farther legitimately crosses more than one card).

## Context

Operator ask: wheel navigation should feel like the current drag experience. Assess whether acceleration/character can be derived from the scroll gesture itself (rather than a fixed, gesture-blind jump), and whether the same approach extends to trackpads.

**Current wheel mechanism** (`CoverFlow.tsx:624-656`) is architecturally unrelated to drag — a discrete accumulate-and-jump model:
- Every `wheel` event adds `deltaX` to a running `accumulator` (a plain closure variable, not `positionX`).
- Once `|accumulator|` crosses `config.scrollThresholdPx` (default `100`, clamped `10-1000` — `CoverFlow.config.ts:118,305,354-355,423`), the carousel jumps **exactly one index** via `jumpToIndex`, then the accumulator resets to `0`.
- A 150ms cooldown (`lastJump`) blocks re-jumping immediately; a 200ms gap since the last wheel event resets the accumulator to zero, treating it as a new gesture.
- The card **never visually moves while the wheel is firing** — it sits frozen at rest until the threshold trips, then animates one full step using whichever curve `config.settleMotionCurve` selects (`spring` or `gaussian`), at a fixed duration **completely independent of how hard or fast the user scrolled**.

**Drag today** (`CoverFlow.tsx:669-755`), by contrast:
- `onDrag` writes directly to `positionX` every frame, 1:1 with pointer movement: `positionX.set(positionX.get() - info.delta.x / (centerGap * 0.8))` (`:707`) — the card visually tracks the gesture continuously.
- `onDragEnd` seeds the settle spring with the gesture's own real velocity: `velocity: -info.velocity.x / (centerGap * 0.8)` (`:748`), using Motion's `PanInfo.velocity` — a windowed estimate over the whole recent gesture, not a single-frame derivative (chosen deliberately over `positionX.getVelocity()` earlier this session after a live-verified overshoot bug from that noisier signal — see `CoverFlow.tsx:391-404`'s own doc comment on `externalReleaseVelocityRef`).

The two live-tracking-plus-momentum ingredients that make drag read as "physical" are both absent from wheel today.

## Feasibility: yes, no new architecture

Confirmed implementable with existing infrastructure — same `positionX`/`animate()`/`POSITION_SPRING_TRANSITION`/`animateGaussianToIndex` machinery drag and click-to-snap already share (`CoverFlow.tsx:204-215`, `:415-435`). No new dependency, no new animation engine.

## Design

### 1. Continuous tracking (replace the accumulator with a live `positionX.set()`)

Inside `handleWheel`, instead of accumulating toward a threshold and jumping once, apply each `deltaX` directly to `positionX`, using the **same scaling divisor drag already uses** (`centerGap * 0.8`) so wheel and drag feel like the same physical unit of travel per pixel:

```js
positionX.set(positionX.get() - e.deltaX / (centerGap * 0.8));
```

This alone makes the card visually follow the scroll gesture in real time instead of sitting frozen until a full step accumulates — the single biggest contributor to the reported "doesn't feel like dragging" gap.

### 2. Release detection (reuse the existing gap logic, repurposed)

Wheel has no `pointerup` — but the existing "gap resets the accumulator" logic (`:638`, currently `now - lastTime > 200`) already detects the natural end of a gesture. Repurpose that same gap as the **release trigger**: once no `wheel` event arrives for the gap duration, treat the gesture as released and settle to the nearest index — mirroring `onDragEnd`'s role, driven by a `setTimeout` armed/cleared on each wheel event rather than a synchronous check on the next event (since with the accumulator removed there's no "next event" to check it against).

### 3. Velocity-seeded settle (derive momentum from recent wheel deltas)

Maintain a short rolling window of recent `(timestamp, deltaX)` samples (e.g. last ~80-120ms, matching the order of magnitude of a single drag frame's own velocity window). On release, compute `velocityPxPerMs = sum(deltaX in window) / windowDurationMs`, convert to `positionX` units with the same `/ (centerGap * 0.8)` divisor, and feed it into the **same settle call drag uses**:

```js
const clamped = clampIndex(Math.round(positionX.get() - estimatedVelocity * SOME_PROJECTION_FACTOR), items.length);
if (prefersReducedMotion) positionX.jump(clamped);
else if (config.settleMotionCurve === 'gaussian') animateGaussianToIndex(clamped);
else animate(positionX, clamped, { ...POSITION_SPRING_TRANSITION, velocity: estimatedVelocity });
```

This is the same three-way branch `onDragEnd` already implements (`:712-753`) — the wheel handler should call into a shared helper rather than duplicate it, to avoid the two paths drifting apart the way `POSITION_SPRING_TRANSITION`/`animateGaussianToIndex` were deliberately centralized earlier this session.

**Caveat carried over from the drag-jitter fix earlier this session:** avoid `positionX.getVelocity()` for this estimate — that's a raw two-sample derivative already shown to spike under irregular timing (`CoverFlow.tsx:391-404`'s doc comment cites a live-verified >500px overshoot from exactly this). The rolling-window sum above is the wheel-equivalent of `PanInfo.velocity`'s own windowed-not-instantaneous approach, for the same reason.

### 4. Trackpad vs. mouse wheel — one code path, no device detection

Both trackpads and mouse wheels dispatch the same `WheelEvent`, but with very different physical character:

- **Trackpads** (two-finger horizontal swipe): continuous, high-frequency, small-magnitude `deltaX`, with the OS already tapering the tail off to simulate inertia after fingers lift. This is a **strong fit** for the continuous-tracking design above — expected to feel close to native drag with little extra tuning, since the input itself already resembles a drag's own delta stream.
- **Mouse wheels**: large, discrete, "notchy" `deltaY` (or `deltaX` with shift), typically one blunt ~100-120-unit tick per physical click, no natural deceleration tail — there is no continuous signal to derive velocity from; a single click **is** the whole gesture.
- There is **no reliable, official way to distinguish the two from a `WheelEvent` alone** — `deltaMode`/magnitude heuristics exist but are inconsistent across browsers/OSes (a known, long-standing web-platform gap).

**Decision: do not branch on device detection.** Ship one continuous-tracking + velocity-seeded-settle implementation; let the physical input naturally produce the right relative feel — a trackpad's small continuous deltas read as a smooth drag-like glide, a mouse wheel's single large delta produces a quick, decisive jump through the same settle curve (already an improvement over today's frozen-then-snap, since it now starts from wherever that one delta already nudged `positionX`, rather than a position-blind reset).

## Config surface

Reuse `enableScroll` and `settleMotionCurve` as-is — no change needed. Two likely new fields on `CoverFlowConfig`, following this file's existing "one operator dial per concern" convention:

- **Wheel-to-position sensitivity** — today's `scrollThresholdPx` (a threshold to cross before jumping) doesn't map onto a continuous model at all; needs replacing with a ratio field, or reusing the existing `centerGap * 0.8` divisor outright as a fixed constant (matching drag exactly) unless live testing shows wheel deltas need their own scale (mouse-wheel `deltaY`-style ticks are typically much larger magnitude than a drag pixel-delta of the same felt intensity).
- **Release-gap duration** — today's `200`ms gap is a hardcoded constant, not configurable. Promote to a field (e.g. `wheelReleaseGapMs`) so operators can tune how quickly a pause reads as "gesture over" vs. "still scrolling," the same way every other timing knob in this config is operator-facing rather than hardcoded.

`scrollThresholdPx` itself likely becomes dead code once the accumulator is removed — flag for removal or repurposing rather than leaving an orphaned field, per this repo's own "no unused config" convention.

## Verification plan

Following this session's own established methodology (Playwright + continuous per-DOM-element position sampling, not "whichever card is currently flagged active" — that swap-artifact was diagnosed and worked around earlier this session):

1. Simulate a trackpad-like wheel burst (many small, high-frequency `deltaX` events with a decaying tail) and confirm the active card's position tracks continuously through the burst, not frozen-then-jump. **Specifically confirm the reported regression is closed:** a single realistic swipe (total travel and duration matched to a real trackpad gesture, per the root-cause section above) lands on exactly one adjacent index, not two, at the default sensitivity.
2. Simulate a single large mouse-wheel-style `deltaX` tick and confirm it produces one clean settle to the adjacent index, using the configured settle curve, with no visible stall beforehand.
3. Bracket the release-gap duration at both ends and confirm the settle fires promptly after a real pause, and doesn't fire prematurely during a still-continuing trackpad gesture with natural micro-gaps between OS-batched events.
4. Confirm `prefersReducedMotion` still short-circuits to `positionX.jump()` for both input types, matching drag's own existing reduced-motion path.
5. Regression-check click-to-snap and drag are unaffected — the wheel handler should only ever call into the shared settle helper, never modify `onDragEnd`/`jumpToIndex` themselves.

## Open questions (not resolved in this pass)

- Exact velocity-window duration and the projection factor converting estimated velocity into a target index — needs live tuning against real trackpad/mouse hardware, not derivable from code alone.
- Whether `scrollThresholdPx` should be removed outright or repurposed as a minimum-delta noise floor (ignoring sub-pixel wheel jitter some trackpads emit at rest).
- Whether mouse-wheel `deltaY` (vertical scroll, the far more common wheel axis) should ever map to horizontal navigation as a fallback when `deltaX` is unavailable (today's `handleWheel` explicitly ignores this: `if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;`, `:634`) — out of scope for this plan, called out here so it isn't silently dropped.
