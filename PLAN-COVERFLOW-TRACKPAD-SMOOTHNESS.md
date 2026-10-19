# Plan: smooth desktop CoverFlow trackpad navigation

**Status:** Core code implemented; physical trackpad and production performance gates remain unmeasured. **Date:** 2026-10-06.

## Goal and guardrails

Make horizontal trackpad navigation feel directly connected to the fingers, maintain even motion through every card position, and settle promptly without visible jumps. Preserve the existing gradient detail, blur, depth control, hover behavior, card count, keyboard/click/drag navigation, and reduced-motion behavior. Treat lowering shader resolution, removing blur, freezing the active gradient, or reducing the visual frame rate as diagnostic comparisons, not default fixes.

The requested page/config scope is `pages/abstract.tsx` and `experiences/abstract/components/AbstractPostDock/config/registered.ts`. The implementation will also need the actual input/geometry/render consumers: `CoverFlow/CoverFlow.tsx`, `CoverFlow/CoverFlow.config.ts`, `AbstractJournalLabCollection.tsx`, and `AbstractPostDock/components/GradientRenderer.tsx` as findings warrant. Keep new operator controls to the minimum needed; first improve the existing defaults and algorithms.

This follows `PLAN-COVERFLOW-WHEEL-TRACKPAD-DRAG-PARITY.md`, whose continuous wheel tracking is already implemented. Do not restore its old threshold-and-jump behavior.

## Current evidence and hypotheses

1. **Proven velocity-window defect.** `CoverFlow.tsx` waits for `wheelReleaseGapMs` (default 200 ms) after the last wheel event, then discards samples older than `VELOCITY_WINDOW_MS` (100 ms) when estimating release velocity. The sample set is therefore empty at normal release. The intended velocity-seeded settle receives zero. Preserve the last rolling velocity estimate *before* the idle timer, and distinguish the OS momentum tail from an active gesture when tuning the projection. Avoid double-applying native momentum.
2. **Proven depth-velocity discontinuity.** The `z` transform changes formula at fractional distance 0.5. With the current 72% `inactiveCardDepthIncrementPercent`, the slope changes sharply at that crossing. The opt-in feature is enabled by default. This can look like a frame hitch even at a steady frame rate. A smooth curve must preserve `z(0)=0`, the current depth at integer card positions (especially card 1), monotonic ordering, and WebKit-compatible depth sorting.
3. **Likely input/settle timing issue.** Every wheel event writes to `positionX` immediately. The 200 ms idle gap and long Gaussian settle can make brief pauses and renewed motion feel alternately raw and eased. The exact contribution needs a real trackpad recording; synthetic wheel bursts alone cannot establish the best timing.
4. **Possible rendering bottleneck.** The previous bounded headless probe showed three gradient canvases at rest, one continuous, each 992 × 1323 backing pixels; the canvas has a CSS blur and cards use 3D transforms. Subsequent inspection found the default desktop layout was **stacked**, using the externally scroll-driven CoverFlow with wheel navigation disabled. Those earlier measurements are therefore not a wheel-navigation baseline. Profile the side-by-side desktop CoverFlow, reached by disabling the desktop Timeline-in-track placement through the config panel, before attributing its jank to GPU work. Headless timing and raw canvas bytes do not measure physical GPU utilization or memory.
5. **Possible selection-boundary work.** Changing the active index updates the page and temporarily keeps the outgoing and incoming meshes live. Check this specifically at the snap boundary. One gesture showed stable canvas and DOM counts and only a small transient JS heap increase; a leak has not been established.

## Baseline and success criteria

Capture a short, repeatable *physical trackpad* gesture on the target desktop in the **side-by-side desktop layout** in a production build, plus a mouse wheel gesture, pointer drag, card click, and a quick re-grab during settle. Include a one-card move, a deliberate multi-card move, and edge overscroll. Record actual wheel `deltaMode`, timestamps/deltas, `positionX`, target index, settle start/end, active-index commit, and relevant card transforms with a temporary, lightweight, locally gated sampler. Remove or disable instrumentation before shipping.

For each run, record viewport, browser, display refresh rate, config, frame intervals/dropped-frame clusters, input-to-visible-motion latency, long tasks, JS heap trend, canvas count/backing dimensions, and Chrome/Safari rendering or GPU evidence where available. Separate **during-input**, **idle gap**, **settle**, and **active-card handoff** in the timeline. Compare production builds on the same machine; development mode and headless Chromium are diagnostic only.

Acceptance gates:

- Card movement begins by the next display refresh after accepted trackpad input and stays continuous through the 0.5 depth crossing; no visible position, depth, or velocity step.
- A normal one-card swipe selects one adjacent card; deliberate longer swipes can select more. Re-grabbing during settle continues from the current position without a snap. Edge resistance remains bounded.
- No new clusters of missed frames relative to the measured baseline, with the target of at least 95% of *interaction* frame intervals within one refresh period on the target machine (about 16.7 ms at 60 Hz or 8.3 ms at 120 Hz). Record 99th-percentile intervals and any long-task cluster; if the target is missed, profile the remaining bottleneck before declaring success.
- Pixel appearance at rest and in motion, gradient blur/detail, inactive scale modes, depth control, card order, and active/outgoing reveal match the current design. Memory, canvas count, and GPU resources return to their settled baseline after repeated navigation.

## Implementation sequence

### 1. Repair input tracking and release semantics

- Normalize wheel deltas by `deltaMode` before mapping to card units. Preserve small trackpad deltas rather than quantizing them; retain one shared path for trackpad and horizontal wheel without brittle device detection.
- Keep the latest *rolling, time-windowed* velocity while events arrive. On the idle timer, use that saved estimate rather than filtering samples against the later timer timestamp. Verify the sign, units, projection, and spring seeding against drag. Measure whether the OS already supplied a momentum tail and tune projection so it does not produce an extra card step.
- If measured event cadence causes redundant position writes, accumulate deltas and publish at most once per animation frame while preserving their sum and the first-frame response. Compare before/after latency; do not add smoothing that makes motion lag behind the fingers.
- Tune release-gap and settle duration/curve from real trackpad captures. Make the transition from direct tracking to the chosen curve continuous in position **and velocity**. Keep interruption/re-grab continuous, and retain click, drag, looping, overscroll, and reduced-motion behavior.

**Gate:** Physical trackpad replay and direct use show no false extra step, stalled 200 ms pause, or re-grab jump. Input latency is unchanged or lower.

### 2. Make depth motion continuously smooth

- Replace the `absPos > 0.5` depth switch with a curve whose position and first derivative are continuous. Preserve the exact active depth and each inactive card's configured resting depth: card `n` should retain the existing `-depthPx * (1 + n * increment/100)` for integer `n >= 1` when enabled. Use a smooth first-card ramp into the existing progression, or a spline through the required anchor points, rather than changing the configured percentage semantics.
- Keep the existing 3D paint-order approach; check crossover in Chromium and WebKit. Evaluate depth both with progression enabled and disabled, including 0% and 200% increments and the first neighbor immediately after the active card.

**Gate:** Sample the same card's computed transform during wheel/drag/settle. Its Z position and frame-to-frame velocity have no cusp near fractional distance 0.5, while integer resting positions and layer order remain correct.

### 3. Profile and reduce render cost without changing pixels

- Capture one short production Chrome Performance trace and, if the target browser is Safari, one Web Inspector sample on the real machine. Determine whether missed frames correlate with JS, React commit, style/layout, raster/filter/compositing, shader draw, or GPU process pressure. Inspect Chrome's layers and per-canvas backing sizes; measure sustained use across repeated navigation for retained contexts/textures and heap growth.
- If rendering is the bottleneck, first eliminate redundant work: unnecessary frozen-card invalidations, unchanged uniform-scale updates, duplicated draw requests, or unconditional `gl.flush()` if measurement shows it causes stalls. Keep the active gradient and reveal animation visually identical. Batch gradient redraws to their actual invalidation and keep offscreen cards gated.
- Use lower resolution or blur-off runs only to estimate each cost. Adopt any adaptive quality policy only if it is visually indistinguishable at the affected pixel density and demonstrably improves real-device frame pacing; otherwise retain full fidelity and optimize scheduling/compositing instead.

**Gate:** Same screenshots/pixel samples and animation behavior at rest, mid-gesture, and handoff; lower render cost or fewer missed frames on the target machine; no rising canvas/context count after repeated navigation.

### 4. Remove handoff spikes if profiling confirms them

- At active-index commits, check React commit time, URL/timeline updates, gradient activation and outgoing timer overlap. Move only non-visual work out of the critical frame, or batch state updates where safe. Do not delay the incoming gradient or truncate the outgoing reveal.
- Reprofile the snap boundary separately from continuous trackpad movement.

**Gate:** Handoff stays within the same frame budget, with no regression in timeline, URL, card content, or reveal timing.

## Verification and handoff

Run the visual checks required by `AGENTS.md` for every changed breakpoint and alternate render path, including default and relevant minimum/maximum config values. Change config through the real panel/runtime path and inspect the final card transform, canvas dimensions/activity, and rendered pixels. Capture screenshots for default, mid-gesture, settled, depth off/on, extreme depth increments, and relevant gradient modes. Test desktop Chromium and WebKit/Safari because 3D card ordering has differed between them; include tablet/mobile paths for regressions even though the performance objective is desktop trackpad navigation.

Respect `AGENTS.md` resource limits: inspect running browser/Next processes first, use one agent-owned browser and one private-build-directory server at most, keep traces bounded, and stop agent-owned processes at handoff. Report measured before/after numbers, viewport/config, screenshot paths, remaining limits, and any process left running. Implement one stage at a time so each performance claim has a comparable baseline.

## Implementation record (2026-10-06)

- Stage 1: Wheel deltas are normalized to pixels, accumulated once per animation frame, and the rolling release velocity is saved during input. The wheel gesture now settles with a velocity-seeded spring; Gaussian remains for discrete index jumps. Projection and spring velocity are bounded so a noisy/discrete wheel event cannot create an unbounded leap. The default release gap is 120 ms, down from 200 ms.
- Stage 2: The fractional depth and rotation curves now have a continuous first derivative around distance 0.5. Active and integer inactive resting positions, including the first neighbor's configured depth, are unchanged.
- Stage 3: Frozen gradient canvases skip invalidation for an unchanged scale value. The per-draw explicit WebGL flush was removed; the browser still presents the rendered canvas normally. No shader resolution, blur, animation, or card-count reduction was made. Further GPU work requires a real-device trace.
- Stage 4: Selection handoff code remains as designed because there is no production trace attributing missed frames to it. This stage is still conditional.
- TypeScript compilation and `git diff --check` passed. Browser checks used the existing Next server at port 3001. In Chromium at 1440 × 900, the side-by-side layout was enabled through the Timeline-in-track panel, then the Dock palette panel was used to set depth to 0%, 200%, and off. The nearest inactive card's computed Z was approximately −103 px at 0%, −309 px at 200%, and −103 px with the feature off; the active card stayed at zero. A −350 px synthetic wheel event selected another card. Screenshots: `/tmp/coverflow-split-rest.png`, `/tmp/coverflow-split-moving.png`, `/tmp/coverflow-depth-0.png`, `/tmp/coverflow-depth-200.png`, `/tmp/coverflow-depth-off.png`, `/tmp/coverflow-wheel-next.png`.
- At 800 × 900 and 390 × 844, panel-driven 0% and 200% values changed the final nearest-card Z as expected. Screenshots: `/tmp/coverflow-tablet0.png`, `/tmp/coverflow-tablet200.png`, `/tmp/coverflow-mobile0.png`, `/tmp/coverflow-mobile200.png`. The default stacked desktop state was also captured at 1280 × 800 (`/tmp/coverflow-desktop-rest.png`), and side-by-side WebKit rendering/motion at 1440 × 900 at `/tmp/coverflow-webkit-rest.png` and `/tmp/coverflow-webkit-moving.png`.
- A short six-gesture side-by-side Chromium check kept two canvases at 872 × 1163; CDP reported heap use falling from about 71 MB to 40 MB after settling. This is evidence against an acute leak in that run, not a long-term GPU memory result. Reduced-motion and line-delta wheel input were exercised; the selected-card state committed after the visual position moved in development mode.
- No production build, physical trackpad run, production frame trace, or GPU utilization/memory capture was performed. The 95% frame-budget target and real-device feel therefore remain open acceptance gates. All agent-owned browsers were closed. The pre-existing Next server was left running.
