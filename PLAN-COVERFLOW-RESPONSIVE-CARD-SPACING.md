# Desktop CoverFlow: responsive card spacing plan

## Implementation note (2026-10-07)

The full-arch golden path now fits projected card widths and edge clearances
inside the CoverFlow clip. The smallest-card position is configurable. Its
default places the minimum at the far end, so each successive waiting card
gets smaller along a rounded arch; lower values restore a middle depth hump
and a growing far arm. The default tail depth now leaves enough runway for
the last card to render fully at the reference desktop width.
Golden gap weights distribute spare room between visible
cards. When the runway is too short, only the farthest waiting cards fade out;
their navigation positions stay intact. Fitted centers and interpolation
tangents remain continuous when the visible budget changes. The Motion Path
Preview uses the same path and displays the visible waiting-card count.

In the current stacked composition, the Timeline figure is intentionally
placed over the shared CoverFlow track. The clip's left edge is the safe
boundary for that render path, as allowed by the contract below. In the
side-by-side composition, the CoverFlow clip begins at the reading-column
boundary, so its measured width supplies the runway without a separate
page-level boundary prop.

## Goal

Keep the existing perspective, depth arch, active-card landing, and drag path while preventing waiting cards from colliding as the desktop viewport changes. Keep the active card and article text readable. This document is a plan; it does not change the UI.

## What the screenshot and code show

- The supplied 2874 × 1454 screenshot shows waiting cards overlapping one another and the farthest cards entering the left text panel's area. A large gap remains between the nearest waiting card and the active card.
- In `resolveFullOvalArchPose` (`CoverFlow.depthPass.ts`), the active center, first waiting center, and far edge are separate screen-space anchors. Intermediate centers are placed by `ovalArcSpacingBend`, independent of each card's projected width. No edge-clearance check exists.
- The default first-neighbor gap is `22%` of the active card width. It reserves space near the active card even when intermediate cards need that space.
- Card width is based on a measured section width, with a 355 px minimum before height caps. The actual CoverFlow clip, active-card landing, and adjacent text panel can change the usable runway independently. Resizing therefore changes the ratio between required card width and available runway.
- Perspective changes the width of every waiting card by a different amount. Uniform `gap`, flex spacing, or a single new percentage cannot guarantee clearances across widths and drag positions.

## Proposed layout contract

1. Keep the active card's current landing/alignment and physical aspect ratio. Preserve the existing depth function `z(q)` and camera projection, so distant cards continue to shrink naturally. Do not use horizontal scaling to force a fit.
2. Define a desktop **safe runway** in the same screen coordinate system used by the path: from the right edge of the left reading panel (plus a small breathing margin) to the active card's left edge. If the reading panel is intentionally allowed to sit over the track in a particular layout, use the CoverFlow clip's left edge instead. Measure the real DOM boxes, including the current side-by-side branch, rather than duplicating layout constants.
3. For each waiting position, compute its projected visible width from the resolved depth and perspective. Express adjacent clearance as `next.left - previous.right`. Set configurable minimum clearances for waiting pairs and for the nearest waiting card versus the active card. The current `ovalFirstNeighborGapPercentLg`, `ovalFarEdgeXPercentLg`, and `ovalArcSpacingBendLg` remain **preferred** composition values, subject to those clearances.
4. Solve the screen-space card centers inside the safe runway on resize and config changes. First reclaim excess active-to-first gap, then distribute remaining room according to the existing arch spacing preference. Enforce ordered centers and minimum edge clearance, with the far edge treated as a preferred target rather than a hard pin. Keep vertical arch and depth positions unchanged. Invert the solved screen centers through the current perspective transform to obtain world coordinates, as the path already does.
5. Fit a continuous, monotone center path through the solved positions. Check pairs at fractional drag positions, not just at integer card indices. Limit interpolation tangents or refine the path where a moving card would clip its neighbor. Keep exit motion and focus transition continuous. Solve only when layout/config changes; drag frames evaluate the already resolved path without DOM measurement or React state updates.
6. Check feasibility before solving: the sum of projected widths and required clearances must fit in the safe runway. If it does not, prefer reducing the **number of simultaneously visible far cards** while retaining their place in navigation. Do not push them over the text, squash their aspect ratio, or silently overlap them. A card joining/leaving the visible set should enter at the far path boundary with a smooth opacity transition. Keep this policy configurable if design needs a strict all-visible mode; strict mode must expose an infeasible state instead of promising collision-free placement.

## Configuration and integration

- Add an opt-in desktop responsive-fit mode, a minimum waiting-card edge gap in pixels, and a minimum active-neighbor edge gap in pixels. Consider a small text-panel clearance knob only if the measured boundary alone is insufficient. Keep existing arch/depth knobs as aesthetic preferences.
- Pass the measured left reading-panel boundary (or chosen safe boundary) from `pages/abstract.tsx` into the desktop CoverFlow. Use the same `ResizeObserver` lifecycle as the existing nav alignment, with stable dimensions and no per-frame layout reads. Account for both desktop render paths and transition between side-by-side and stacked layouts.
- Place the solver in a pure geometry helper beside `CoverFlow.depthPass.ts`. Reuse its output for card transforms and the Motion Path Preview so the inspector shows the fitted centers and the visible-card limit, not the unfitted ideal path.
- Keep the existing navigation index, wheel/trackpad/drag behavior, keyboard controls, and reduced-motion behavior. Visibility is a rendering budget, not a change to item order or accessibility state.

## Decision and verification sequence for implementation

1. Record the safe runway, projected widths, and pairwise clearances at the screenshot viewport and at representative narrower/wider desktop widths. This establishes whether reclaiming the 22% first gap is enough before any fallback is used.
2. Implement the width-aware fit with the current default depth and arch. Add the fallback only when the measured feasibility check requires it.
3. Exercise the actual config controls at their default and useful minimum/maximum values. Inspect settled and mid-drag positions, forward/reverse movement, first/last item, window resize, both desktop layout branches, and the Motion Path Preview.
4. Capture browser screenshots at the source viewport and representative desktop widths (for example 1024, 1280, 1440, and 1920 px), including the narrowest width where all cards are feasible and a width where fallback is required. Inspect final projected DOM bounds and verify each visible pair's clearance, active-card containment, reading-panel clearance, and stable aspect ratio. Record viewport, config values, screenshot paths, and measured results.

## Acceptance criteria

- No visible waiting cards intersect each other or the active card at rest, during drag, or after a resize; configured minimum edge gaps are met within a small pixel tolerance.
- Cards remain on a smooth, depth-based arch, remain camera-facing, and get smaller as they recede according to the existing perspective model.
- The active card remains readable and aligned; the left reading panel remains unobscured where designated as a safe boundary.
- No abrupt center jump or card-count flash occurs when the viewport crosses a fit threshold. The Motion Path Preview follows the same fitted path and visibility decisions as the rendered cards.
