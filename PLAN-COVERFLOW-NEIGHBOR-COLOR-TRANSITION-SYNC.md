# Plan — CoverFlow neighbor color transition sync (no snap while visible)

## Status

Implemented and verified (2026-09-25). The immediate fix below was applied:
`stepTiltDurationMs`/`neighborGradientRevealDurationMs`/`neighborShadowFadeDurationMs`
raised to 1350ms via `pages/abstract.config.ts`'s page-owned
`DEFAULT_ABSTRACT_CARD_APPEARANCE_CONFIG`, with the shared normalizer
ceiling in `SplitColumnCardPreview/config/stack.ts` raised from 1200 to
1400 to allow it. This shipped alongside
`PLAN-COVERFLOW-NEIGHBOR-HOLOGRAM-RAMP-DOUBLE-TAPER-FIX.md`'s fix in the
same pass — see that plan's own revision note for a real regression this
combination caused on the first attempt (a shadow-elevation snap) and how
it was closed before re-shipping both together.

## Objective

The screenshot evidence shows the card immediately left/right of the active
slot changing color (overlay darkening, opacity, and/or the gradient
background) abruptly mid-flight, while its position is still visibly
sliding. Guarantee that a card's color/overlay/gradient treatment always
stays in lockstep with its own position animation for as long as it remains
on screen — no snap, regardless of which of the three channels (overlay
darkening, opacity, gradient background) is doing the changing.

## Findings

There are two entirely independent animation systems running on the same
card at the same time, with no coupling between them:

1. **Position** — `CoverFlow.tsx`'s own `positionX` motion value. Every
   card's `x`/`z`/`rotateY` derive from it continuously. On a discrete jump
   (click-to-snap, wheel, an externally-requested index change — the most
   common trigger for this page, since selecting a Timeline row lands here),
   the default `settleMotionCurve: 'gaussian'` (`pages/abstract.config.ts`)
   animates over:
   ```
   duration = clamp(
     gaussianSettleBaseDurationMs + gaussianSettlePerStepDurationMs * (distance - 1),
     gaussianSettleBaseDurationMs,   // 980ms
     gaussianSettleMaxDurationMs,    // 1290ms — hard cap, any distance
   )
   ```
   So a real visual glide takes **980–1290ms**, always, regardless of how far
   the jump travels (a drag release instead uses the spring — physically
   ~800ms–1s in practice with this repo's stiffness/damping/mass).

2. **Color** — three separate CSS-transitioned channels, none of which know
   about the position duration above, and all of which are triggered by a
   **different signal**: the discrete `articleActiveIndex` React state
   (`useArticleListCoverFlowSync`), which commits via `startTransition` at
   essentially the same moment the position animation *starts* (both fire
   back-to-back inside `jumpToIndex`/`onDragEnd`/the external-driver effect),
   but is bound to durations dramatically shorter than the glide it's
   supposed to accompany:
   - **Overlay darkening** — `Card.tsx`'s `scrimOpacity` (active vs.
     neighbor value, `CardAppearanceConfig.activeScrimOpacity`/
     `neighborScrimOpacity`) transitions via `--article-card-appearance-duration`,
     which resolves to `stepTiltDurationMs` — **180ms**
     (`SplitColumnCardPreview/config/stack.ts:636`, the shared default this
     page's own `cardAppearanceConfig` derives from).
   - **Opacity** (header/text opacity, same appearance-mode swap) — same
     `stepTiltDurationMs`, **180ms**.
   - **Gradient background** — the live-mesh/static-cover cross-fade.
     `pages/abstract.tsx`'s own `coverFlowLiveMeshIndices` effect
     (line ~4677) adds the new active index to the "live" set the instant
     `articleActiveIndex` changes, and schedules removal of the *outgoing*
     index after `coverFlowGradientRevealDurationMs` →
     `neighborGradientRevealDurationMs` — **500ms**
     (`SplitColumnCardPreview/config/stack.ts:612`). The CSS cover element
     itself does have a real `transition: opacity var(--article-card-gradient-reveal-duration)`
     (`AbstractJournalLabCollection/styles.module.css:217-225`) — this isn't
     a missing-transition bug, it's a **duration** bug.

**The mismatch, quantified:** every color channel finishes in 180–500ms;
the position it's supposed to accompany takes 980–1290ms (gaussian) or
~800ms–1s (spring). Every one of the three channels reaches its final
resting look while the card still has roughly 40–85% of its positional
glide left to run — read by an end user as the color "snapping" partway
through a still-visibly-moving card. This happens identically in both
directions the screenshots show: the incoming card's mesh goes live and its
scrim/opacity settle to their "active" values almost immediately after the
click, while its position keeps sliding in for another ~800ms+; the outgoing
card's mesh reverts to its static neutral cover and its scrim/opacity settle
to "neighbor" values after 500ms/180ms, while its position keeps sliding out
for the same remaining stretch.

This is not a missing-CSS-transition bug (every channel already animates
smoothly in isolation) — it's a **timing decoupling**: color duration is a
fixed, independently-configured constant; position duration is a distance-
aware curve capped well above every one of those constants.

## Plan

### Immediate fix (recommended first step) — raise the three durations to clear the position cap

`gaussianSettleMaxDurationMs` (1290ms) is a **hard ceiling** on position
duration regardless of jump distance under the default gaussian curve. Raise
`stepTiltDurationMs`, `neighborGradientRevealDurationMs`, and
`neighborShadowFadeDurationMs` (same class of fixed appearance-timing field)
to be **at or above that ceiling** (e.g., ~1300–1400ms, with a small margin).
This makes color transitions mathematically unable to finish before position
does, for *any* jump distance, under the curve this page actually uses by
default — no new plumbing, just three existing config values raised past an
already-existing ceiling. For the spring curve (drag release, or an operator
switching `settleMotionCurve` to `'spring'`), this isn't a hard mathematical
guarantee (springs have no configured duration cap) but is a strong,
low-risk practical fix given this repo's spring constants settle within
~1s in every observed case.

Tradeoff: color transitions become uniformly "slow" even for jumps that
only need the 980ms floor — an operator loses the ability to make a
short jump's color settle noticeably faster than its position. Given the
objective is "no snap, ever," that tradeoff is the correct default; an
operator who wants a snappier feel can still dial these three fields back
down deliberately (accepting the earlier-snap tradeoff, now a conscious
choice with the mismatch documented rather than an accidental default).

### Structural fix (more precise, higher effort) — derive color duration from the actual resolved position duration

Rather than a fixed worst-case ceiling, make the three color durations
**follow** whatever duration the position transition is actually using for
the current jump:

1. `CoverFlow.tsx` already computes the exact resolved gaussian duration per
   jump inside `animateGaussianToIndex` (`clamp(base + perStep * (distance
   - 1), base, max)`) but discards it after starting the animation. Expose
   it — the natural place is `CoverFlowCardReveal` (already threading
   per-card reveal timing: `hasSettled`, `stagger`, `exit`) — add a
   `settleDurationMs: number` field there, resolved once per transition
   alongside the existing `hasSettled` timer logic, so every `renderItem`
   call already receives "how long will this specific transition take."
2. `pages/abstract.tsx`'s `renderCoverFlowItem` reads `reveal.settleDurationMs`
   and feeds it into `stepTiltDurationMs`/`neighborGradientRevealDurationMs`/
   `activationRampRate`'s effective duration for that render, instead of the
   operator's independently configured constants.
3. Gate this behind a new opt-in config field (e.g.
   `CoverFlowConfig.neighborColorTransitionMatchesPositionSettle: boolean`,
   default `false` so today's independently-tunable behavior — now
   correctly documented as capable of this exact mismatch — remains
   available for an operator who wants it) rather than removing the
   existing fields outright.
4. For the spring curve (no fixed duration to expose), fall back to a
   documented constant approximating this repo's own spring settle time —
   the codebase already has exactly this precedent:
   `ACTIVATION_RAMP_REFERENCE_DURATION_MS = 800` (`CoverFlow.config.ts`) was
   established for the same "spring has no fixed duration, approximate it"
   problem `activationRampRate` already solves.

This is more implementation surface (a new reveal field, wiring through
`renderCoverFlowItem`, a new config flag) than the immediate fix, but is the
version that also correctly speeds UP a short jump's color transition
instead of always paying the worst-case ~1.3s, and stays correct if
`gaussianSettleMaxDurationMs` itself is ever retuned.

## Recommendation

Ship the immediate fix now (raise `stepTiltDurationMs`,
`neighborGradientRevealDurationMs`, `neighborShadowFadeDurationMs` past
`gaussianSettleMaxDurationMs`) — it's a three-constant change, mathematically
closes the gap for the default curve, and requires no new config surface.
Treat the structural fix as a follow-up only if an operator later wants
per-jump-distance responsiveness back without reintroducing the snap.

## Verification

1. Rendered check at the tablet/desktop tiers this bug was screenshotted at:
   trigger both directions (click a Timeline row several cards away, and a
   click-to-snap on an adjacent card) and confirm the outgoing/incoming
   card's scrim, text opacity, and gradient-mesh cover all finish changing
   at (or after) the moment the card's own translateX/rotateY visually
   settles, never before.
2. Repeat at the maximum jump distance available (first ↔ last item) to
   confirm the fix holds at `gaussianSettleMaxDurationMs`, not just a
   1-step jump.
3. Repeat with `prefersReducedMotion` — `coverFlowStackPresentationBase`
   already zeroes every one of these durations under that flag
   (`coverFlowPrefersReducedMotion ? 0 : ...`), which is correct and
   unaffected by this fix (reduced motion should stay an instant, honest
   snap, not a slowed one).
