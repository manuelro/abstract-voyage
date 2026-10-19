# Plan: reference-led depth navigation for the existing CoverFlow

**Status:** Implemented and browser-checked 2026-10-06. The current checked-in desktop default is depth pass; classic remains selectable.

## Target and reference

Reference: `/Users/manuelc/Downloads/creative-geometric-cubic-shape-abstract-background_1017-60739.avif` (740 × 740). It depicts approximately seven overlapping translucent planes. Their faces stay broad, their leading vertical edges step steadily right, and their projected heights grow toward the viewer. The nearest plane remains fully inside the image. Thin bright edges and restrained yaw make the depth readable without reducing distant planes to slivers.

The still image does **not** show navigation, an active article, or a plane leaving the frame. The exit comes from the product brief: each card reaches a fully visible, readable focus stop; advancing again carries the departing card toward the viewer until it leaves the viewport. Treat the reference as the **approach and focus composition**, then extend that trajectory for exit. Do not tune the focus to the oversized exit state.

## Current technology and gaps

| Existing capability | Code reality | Consequence |
| --- | --- | --- |
| Shared navigation motion | `CoverFlow.tsx` derives every card's X, Z, yaw, and optional opacity from one `positionX` MotionValue; drag, wheel, click, external scroll, and timeline feed it. | Keep this engine and drive the new path from signed continuous position. |
| Measured geometry | `useCoverFlowGeometry` resolves dimensions, spacing, depth, and landing; the root clips overflow. Desktop can align landing to main navigation. | Derive focus and exit bounds from measurements on resize/config changes, with no layout read per frame. |
| Tunable waiting stack | Perspective/origin, card size, gap/growth, depth, yaw distribution, and landing already have panel fields. Dock palette adds enabled, default-72% inactive depth progression. | Tune existing knobs first. Default 25° base yaw plus 200% desktop rotation growth and 90° cap make near neighbors much narrower than the image. Default `inactiveCardColumnDarkeningStep=1` can hide its translucent layering. |
| Symmetric path | X/Z/yaw depend mainly on `abs(index - positionX)`; Z is never positive. Both sides are waiting-style neighbors. | A pass-through needs signed waiting/focus/departed phases. Keep the old symmetric path untouched in classic mode. |
| Discrete card state | `pages/abstract.tsx` uses `isActive`/`activeIndex` for content, surface, hover, clicks, and mesh. Outgoing mesh shutdown is timer based. | Add live focus weight and separate coarse actionability/visibility state; keep logical article selection distinct. |
| Appearance controls | Card Appearance offers unified inactive gradient, neighbor frame mode, flat-fill opacity, scrim, text and border colors. CoverFlow can fade whole left cards. | No independent inactive surface translucency and leading-edge light while keeping article text legible. Add surface-only controls if existing treatments cannot reach the reference. |
| Two desktop compositions | `/abstract` has side-by-side native wheel/drag and stacked desktop with an external scroll driver. The latter component also serves tablet/mobile. | Scope by actual `lg` tier, not call site; verify both desktop paths. |
| Order and loop | `reverseItemOrder` remaps indices; loop mode uses wrapped deltas and is off by default. | Default reversed order puts upcoming cards left and departing cards right. A shortest wrapped delta can switch sides mid-loop, so loop needs stable unwrapped/virtual coordinates. |

## Spatial model

Use a signed per-card slot coordinate `q` from live `positionX`. Define its sign from display order: `q > 0` is upcoming/waiting, `q = 0` is focus, `q < 0` is departed. In today's reversed order, the waiting stack is left and departure moves right, matching the image. Turning off `reverseItemOrder` mirrors that path. Backward navigation retraces it.

```text
q >= 1:  one-sided depth stack with broad faces and staggered leading edges
0 < q < 1: approach focus; projected bounds grow into readable anchor
q = 0:   whole card inside clip, front-facing and fully readable
-1 < q < 0: positive-Z foreground pass toward exit edge
q <= -1: projected card fully beyond clip, inert and visually culled
```

- Reuse waiting-side spacing, depth, and landing calculations, but make the focus and exit joins smooth in position **and velocity**. The existing easing near `absPos` 0.35–0.65 cannot simply be mirrored into positive Z.
- Let CSS perspective create growth. `z = P(1 - 1/s)` is only a center-depth estimate for apparent scale `s` on an unrotated centered plane. Actual projected corners depend on yaw, transform order, origin, and dimensions. Evaluate all four corners to prove focus fit and complete exit, and bound the nearest rotated corner short of the camera plane.
- The reference's largest visible plane is the focused card. The exit is a later state: positive Z plus enough signed X translation for the **entire projected quadrilateral** to clear the clip, with a configurable clearance margin. In-frame scaling alone covers more of the viewport.
- Earlier/departed cards park outside the clip at rest. Do not leave invisible large transformed layers or live canvases in paint. Re-enable them before their first corner re-enters during reversal.
- Keep transform-based depth sorting with `preserve-3d`; existing source comments document a WebKit crossover bug caused by an animated `z-index`.

## Configurable controls and ownership

Add a **Depth navigation (desktop)** group to the CoverFlow panel. Keep existing geometry knobs in their current groups; add fields only for behaviors they cannot express. Normalize finite numbers and show depth-mode fields only when enabled. Proposed ranges need tuning in rendered output.

| Knob | Initial control/range | Purpose |
| --- | --- | --- |
| `navigationPathLg` | `classic` / `depth-pass`; default `classic` | Opt in without changing existing saved layouts. Two choices use `enum`. |
| `depthPassExitScaleLg` | number, roughly 1.1–2.5 | Set foreground end depth and whole-card projection; independent of inner-gradient scale. |
| `depthPassExitClearancePercentLg` | number, 0–30% of projected card width | Tune room beyond the clip edge while deriving actual X travel from measured bounds. |
| `depthPassFocusHandoffPercentLg` | number, 0–100% of slot transition | Tune when readable active content transfers between cards. Clamp so only one full article hierarchy is exposed. |
| `depthPassInactiveSurfaceOpacityLg` | number, 0–1 | Tune translucent waiting planes at the actual surface/gradient layer without fading focused text. |
| `depthPassLeadingEdgeOpacityLg` | number, 0–1 | Tune the thin luminous leading edge separately from fill; reuse existing border color. Add width/color only if rendering shows a need. |

Existing controls remain authoritative for `perspectivePx`, perspective origin, card dimensions, landing, `depthPxAtReferenceWidth`, Dock palette's inactive depth increment, spacing/growth, rotation distribution/base/max/spread, gradient source, scrim, and colors. After visual tuning, document a **reference starting recipe**: lower yaw with broad faces, measured progression in projected size and leading-edge spacing, and darkening low enough to retain translucent layers. Add a preset only if operators cannot reliably restore the recipe from exposed knobs. Do not hard-code the illustration's blue palette into article cards.

| Reference cue | Primary knobs to tune | Expected visible direction |
| --- | --- | --- |
| More planes visible with stepped left edges | Card size, active landing, further-neighbor spacing ratio/growth | Smaller cards or tighter spacing reveal more distinct planes; landing controls the available waiting-side runway. |
| Gradual growth toward nearest plane | Perspective, neighbor depth, inactive depth increment | Stronger depth makes far planes smaller while the focused card remains at its resolved size. |
| Broad faces and slight trapezoids | Neighbor rotation, distribution, maximum rotation, spread depth/exponent | Less yaw preserves face area; moderate yaw still exposes a luminous leading edge. |
| Pale translucent layers | Inactive gradient/source and frame mode, darkening step, new inactive-surface opacity | Surface transparency reveals overlap without lowering focused text opacity. |
| Departure beyond the image-like focus | New exit scale and clearance | Scale controls forward projection; clearance guarantees full offscreen departure. |

Important existing dependency: `stackSpacingGrowthIncludesFirstNeighbor` defaults to `true`. In that mode the first settled gap uses `stackSpacing`, which is derived from `centerGap = cardWidth × cardDistanceRatioLg` and `stackSpacingToCenterGapRatioLg`. Thus card distance still changes the visual gap **indirectly** and also changes drag/wheel sensitivity. Tune the spacing ratio/growth when possible, then check gesture feel separately; otherwise a visually useful change may unintentionally change navigation speed.

Place surface/edge fields in Card Appearance if they prove reusable outside CoverFlow; otherwise scope them to depth mode and pass them through the card adapter. These are continuous values, not Tailwind tokens. Fixed lists over 6–8 options must use `select` per `AGENTS.md`.

## Implementation sequence for a later pass

1. **Measure baseline and target.** Inspect both desktop compositions at wide and narrow `lg` viewports, focused and mid-transition. Record clip/card bounds, yaw, depth, projected size ratio across visible planes, leading-edge spacing, and mesh activity. Tune existing controls before adding path code.
2. **Write a pure geometry resolver.** Given measured size, perspective/origin, landing, display-order sign, signed `q`, and normalized knobs, return X/Z/yaw, projected bounds, and phase. Keep classic transforms unchanged when disabled. Solve waiting/focus/exit joins with velocity continuity; calculate exit X from projected corners and clearance. Memoize measurement-derived constants and feed MotionValues without per-frame React renders or DOM reads.
3. **Integrate drivers, order, and loop.** Share one path across wheel/drag/click and external scroll. Preserve `reverseItemOrder` at the boundary. For loop mode, anchor a small set of virtual card copies to unwrapped position, recycle only offscreen copies, and retain article identity. Check first/last indices, overscroll, multi-index jumps, interruption, and reverse dragging.
4. **Implement visual handoff.** Expose signed travel/focus weight to the card adapter. Geometry and surface/edge response track it without per-frame React state. Use coarse state updates only at actionability/visibility boundaries. Logical active index continues to drive URL/timeline; readable content, hover ceiling, hit targets, accessibility tree, and mesh activity follow visual handoff. In depth mode, replace or supplement timer-based outgoing mesh lifetime so visible cards do not freeze early and offscreen cards stop drawing.
5. **Tune appearance and performance.** Apply translucency to waiting surfaces, preserve focused contrast and gradient quality, and inspect mesh sharpness at maximum exit scale. Freeze/unmount offscreen heavy surfaces while retaining stable navigation identity. Avoid large simultaneous live WebGL canvases, forced layout reads, and `will-change` on permanently invisible cards.
6. **Verify rendered composition and motion.** Follow the visual evidence plan below and `AGENTS.md` resource limits. Treat source inspection, numeric transforms, and a focused-card screenshot as insufficient evidence for the requested depth experience. Stop agent-owned processes and record viewport, config, screenshot paths, observed results, and limits.

## Visual evidence and interaction test plan for implementation

The goal of verification is to show an actual **depth- and perspective-driven composition in motion**, reached through the same navigation gestures users have today. Use the real `/abstract` page and config panel/runtime state. At both a wide and a narrow `lg` viewport, verify the side-by-side CoverFlow and the stacked desktop CoverFlow independently; verify classic fallback at `md` and mobile. Inspect existing Next/Chrome/Playwright processes first, then use one private Next dev server on a non-3000 port and at most one bounded browser session at a time.

| Evidence state | Action and capture | What the image/DOM must demonstrate |
| --- | --- | --- |
| Resting focus, default depth config | Select `depth-pass` through the real panel; capture the whole CoverFlow clip and a closer crop of the card stack. | Several distinct, broad waiting faces; progressively larger projected heights and staggered leading edges toward one fully visible, readable active card. Compare the planes' silhouette, overlap, and translucency with the supplied reference image. |
| Live forward drag | Use the existing pointer drag mechanism in **each desktop composition**; pause at representative early, middle, and late positions within one card step and capture a small bounded set of screenshots. | Incoming card approaches from depth while the outgoing card moves in positive Z, grows, and crosses toward the exit edge. No transform, layering, content, or opacity pop at focus. |
| Released drag and reverse drag | Release the drag to invoke today's settle behavior, then drag backward through the same positions. Capture the settled and reversed states. | Motion settles into the readable stop and retraces the same spatial path without a side switch, clipped active card, or lingering enlarged layer. |
| Trackpad/wheel and stacked scroll driver | Navigate one step with wheel events and a human-operated trackpad in the side-by-side layout, then with the existing external scroll driver in the stacked desktop layout. Capture the focus and a transition state for each. | Both drivers produce the same ordered depth trajectory and retain their current input/settle mechanisms; no jump, stutter, or different geometry between drivers. |
| Config extremes | Change exit scale, clearance, surface opacity, and leading-edge opacity through panel/runtime state to minimum and maximum values; capture only the changed states needed to establish each control's direction. | Exit scale changes apparent foreground size, clearance changes fully offscreen margin, and surface/edge controls change the intended layer without fading focused text. |

For each capture, log viewport, composition/driver, active index, live fractional position, relevant config values, screenshot path, and the actual computed transform matrix, opacity, visibility, and projected four-corner bounds of the affected card elements. Inspect the final rendered surface/edge styles or pixel samples, not just upstream values. Keep a labeled contact sheet or paired reference/implementation screenshots so the spatial progression can be reviewed visually. Capture enough distinct states to prove the trajectory; avoid a long recording or repeated screenshots on this graphics-heavy page. If static frames cannot establish temporal smoothness, make one short bounded motion recording and inspect it frame by frame, then close the browser. Compare Chromium and WebKit at the focus crossover because this component has a documented engine-specific paint-order issue.

Record whether the gestures feel continuous under active input and during release: no visible hesitation, sudden acceleration, freeze of a visible gradient, frame hitch, or jump in article content. Confirm offscreen cards are outside the clip, inert to pointer/keyboard input, and no longer drawing a continuous mesh. Include reduced-motion, reverse order, loop boundary, and first/last article cases. Do not claim the composition matches the reference unless the screenshots visibly show the broad layered planes **and** the gesture captures show the forward depth pass and reversible departure.

## Acceptance gates

- At `q=0`, the complete focused card fits in the clip and is readable; waiting planes show several distinct broad faces and steadily increasing apparent size. No neighbor unexpectedly covers the article.
- The foreground continuation grows without a position, velocity, yaw, depth, opacity, or content pop. By `q=-1`, every projected corner is beyond the chosen clip edge plus clearance; reversing retraces the path.
- Focused content keeps sufficient contrast with translucent neighbors. Incoming and outgoing content are never both fully readable. Offscreen cards have no pointer or keyboard target and no continuous mesh draw.
- Every new knob causes a visible, directional change via the config panel at `lg`. For the same config, `classic` keeps its existing transforms and behavior; `md` and mobile keep their existing navigation path. Both desktop render paths meet the same checks.

## Improvement over the first plan

The reference defines the **stack and readable nearest plane**; the product brief adds the later exit. The first plan centered its controls on exit scale and assumed current appearance fields could recreate the reference. This revision addresses projected stack shape, surface translucency, edge light, focus handoff, and exit clearance while preserving the existing CoverFlow engine.

## Implementation and verification record — 2026-10-06

The path is implemented in `CoverFlow.depthPass.ts` and driven by the existing CoverFlow MotionValue for drag, wheel, click, and the optional pinned-section scroll driver. `CoverFlow.config.ts` and the panel expose the desktop path, waiting-plane spacing/yaw, exit scale/clearance, content handoff, surface opacity, and edge brightness. The depth path is applied only at `lg`; classic remains selectable. The article adapter keeps translucent treatment on the surface rather than fading text, switches the live mesh with visible focus/departure, and makes exited cards inert. The loop uses virtual positions. The pure geometry tests check velocity continuity at focus/stack joins, projected exit clearance for both directions and scale extremes, and monotonic forward movement.

The earlier straight-stack recipe used waiting spacing 42%, nearest yaw 12°, maximum yaw 24°, exit scale 1.8, exit clearance 8%, handoff 50%, waiting surface opacity 0.66, and edge brightness 0.75. Keep the existing desktop perspective, card size, landing, and Dock depth progression. The default reversed order puts waiting cards on the left; toggling reverse order mirrors the route.

The local screenshots are under `evidence/coverflow-depth-pass/` (ignored by Git). All tests used the existing user-owned server at port 3001; no agent-owned server was started. Browser instances were run sequentially and closed after each check.

| Viewport and path | Panel/runtime values and action | Screenshot(s) and observed final output |
| --- | --- | --- |
| 1440 × 900, stacked desktop | Depth pass defaults; pointer drag forward, release, drag back | `stacked-lg-forward-drag.png`, `stacked-lg-reverse-drag.png`, `stacked-lg-reverse-settled.png`. The first article left the focus, reached positive Z and an x-position beyond the right clip; reversing restored the original focused article. The settled outgoing card measured x≈1498, width≈729, Z≈449; its left edge exceeded the 1440 px clip. |
| 1440 × 900, stacked desktop | Scroll-driven carousel nav enabled through its own panel; vertical wheel | `stacked-lg-scroll-mid.png`, `stacked-lg-scroll-forward.png`, `stacked-lg-scroll-reverse.png`. At scrollY 220, the focused card had a positive-Z transform; scrolling back retraced the route. The scroll driver is off by default. |
| 1440 × 900, side-by-side desktop | Column split 38/62; horizontal wheel and loop boundary | `split-lg-rest.png`, `split-lg-horizontal-wheel.png`, `split-lg-loop-crossing.png`. The focused card fit inside the 893 px CoverFlow clip; wheel navigation moved the previous card fully outside the viewport. At the loop seam, one focus and one culled virtual card remained. |
| 1024 × 768, 800 × 900, 390 × 844 | Depth pass selected at desktop | `narrow-lg.png`, `tablet.png`, `mobile.png`. The 1024 px desktop focus fit within the clip; tablet/mobile retained the classic path. |
| 1440 × 900, WebKit | Depth pass defaults; drag | `webkit-lg-rest.png`, `webkit-lg-drag.png`. Incoming/departing planes retained coherent paint order at the crossover. |
| 1440 × 900, desktop | Exit scale 1.1→2.5, surface 0→1, edge 0→1 through panel | `desktop-min-rest.png`, `desktop-min-drag.png`, `desktop-max-rest.png`, `desktop-max-drag.png`. The outgoing width increased approximately 438→605 at a comparable drag point; final computed surface and edge opacity variables changed 0→1. |
| 1440 × 900, desktop | Waiting spacing 10→150%, nearest yaw 0→45°, exit clearance 0→30% through panel | `geometry-controls-min.png`, `geometry-controls-max.png`. The waiting planes moved from a tight overlapping fan to a wide fan, and the actual transform matrices changed. The exit-clearance bound was checked by the geometry test. |
| 1440 × 900, desktop | Reverse list order disabled; reduced motion | `reverse-order-lg-fixed.png`, `reduced-motion-lg-default.png`. Waiting planes moved to the right; focused computed opacity stayed 1. Reduced motion removed perspective and kept one readable focused card. |

Validation: `tsc --noEmit`, `git diff --check`, and the three focused depth-geometry Vitest cases passed. Screenshots were visually inspected and final card transforms, bounding boxes, opacity, phase, and focus state were read from the rendered DOM. A transient whole-card opacity retained after switching/reversing was found in visual review and corrected. Human trackpad feel and frame timing were not measured; the wheel checks are synthetic browser input, so subjective smoothness still needs a hands-on check on the target desktop hardware.

## Semi-circular arrangement refinement — 2026-10-06

The annotated `/Users/manuelc/Downloads/Group 83.png` reference shows a narrow distant stack opening into a tall, readable focus card. The earlier waiting path had almost linear Z progression and one constant inactive opacity. The desktop depth panel now exposes Arc depth bend, Arc reach, Far plane drop, Depth composition vertical offset, and Far surface opacity. The X spacing, yaw, perspective, card size, focus landing, and foreground exit retain their existing controls. Setting bend/drop/vertical offset to zero and far opacity equal to near opacity recovers the earlier straight fan. The vertical offset is bounded by the measured spare room around the focused card; an undersized parent clip cannot be corrected by translation alone.

Current starting values: waiting spacing 27%, nearest/maximum yaw 12°/24°, bend 150%, reach 5 cards, far drop 55 px, vertical offset 33 px, near/far surface opacity 0.66/0.45. At 1842 × 815, rendered far/near/focus card heights were 330/461/540 px; their top edges were 296/206/171 px and final surface opacities 0.45/0.66/1. At the panel extremes, bend 0→400%, reach 1→10, drop −160→160 px, offset −200→200 px, and far opacity 0→1 all changed rendered boxes or computed opacity. Focus remained inside the clip at both vertical-offset bounds. Screenshots: `evidence/coverflow-depth-pass/arc-before-1842.png`, `arc-default-1842.png`, `arc-controls-min-1842.png`, `arc-controls-max-1842.png`, `arc-narrow-lg-1024.png`, `arc-split-lg-1440.png`, `arc-tablet-classic-800.png`, `arc-mobile-classic-390.png`, `arc-drag-mid-1842.png`, and `arc-drag-settled-1842.png`. The forward drag entered positive Z, while tablet and mobile remained classic. These are local ignored evidence files. The existing user server on port 3001 was reused; each agent browser was closed after its bounded check.

## Apparent-width correction — 2026-10-06

The later tuned desktop config (waiting spacing 114%, yaw 0° to 70°, arc bend 400%, arc reach 1) exposed two causes of apparent widening. First, far waiting planes were strongly off-axis: their center X was far left of the camera origin while positive yaw brought the left edge closer to the eye. At 1998 × 840, five waiting planes projected to widths 227, 217, 205, 204, and 243 px from far to near, although equivalent front-facing widths at the same depths were 167, 174, 184, 200, and 243 px. Second, WebKit painted some transformed surfaces at approximately their unprojected 405 px local width even while `getBoundingClientRect` and hit testing reported their smaller projected bounds. This matched the supplied screenshot's oversized distant card.

The depth resolver now caps each waiting plane's projected width relative to its front-facing width at the same Z. The new **Maximum apparent width** desktop control spans 1–1.5 and defaults to 1.05. It limits yaw continuously; other depth, spacing, opacity, and gesture settings stay configurable. WebKit uses a camera-projected local-plane transform so its painted surface agrees with the card's rendered box. A width correction retains the same off-axis width as the regular 3D path, including the configured cap. Classic mode and narrower tiers retain their prior path.

At 1998 × 840 in Chromium and WebKit, setting the control through the real panel gave far-to-near widths of approximately 167/174/184/200/243 px at 1, 175/183/193/204/243 px at the 1.05 default, and 227/217/205/204/243 px at 1.5. WebKit's final card surfaces were visually inspected at both extremes and the default. Its forward pointer drag produced an incoming focus card of 368 px and an outgoing foreground card of 684 px mid-gesture, then settled to one 405 px focus card. At 1024 × 768 the default waiting widths remained depth scaled; at 800 px and 390 px the path stayed classic. Reverse ordering was checked in Chromium at 1998 px and mirrored the yaw and width cap. Evidence: `evidence/coverflow-depth-pass/widening-limited-default-1998.png`, `widening-narrow-lg-1024.png`, `widening-reverse-1998.png`, `widening-webkit-corrected-default-1998.png`, `widening-webkit-panel-min-1998.png`, `widening-webkit-panel-max-1998.png`, and `widening-webkit-forward-drag-mid-1998.png`. These evidence files are local and ignored by Git. TypeScript and diff checks passed. Browser instances were closed; the pre-existing user-owned port-3001 dev server remains running. A hands-on trackpad smoothness check was outside this bounded geometry investigation.

## Focus gap and oval convergence — 2026-10-06

The annotated oval reference clarified two independent parts of the resting composition. A new **Focus-to-stack edge gap** control solves the first waiting card's visible edge against the focused card's edge after perspective projection. The default is 2% of card width (about 8 px at the 405 px desktop card); 0 touches the edges and 100 leaves a one-card-width gap. The solver shifts the waiting path in X only, leaving Z, arc bend, and focus dimensions unchanged. A bounded join curve carries that shift into focus without reversing the waiting card's horizontal direction during the sampled forward drag.

A separate **Distant-plane convergence** control compresses X spacing only after the first waiting card. The default is 55%; 0 restores the previous spread, while 100 packs the distant planes more tightly. The first edge gap and Z arc are unchanged at either extreme. At 1998 × 840, measured far-to-near center steps were 23/41/84/233 px at the default, 210/227/258/335 px at 0, and 11/22/50/191 px at 100. The first card stayed 8 px from focus in all three states. Chromium screenshots: `evidence/coverflow-depth-pass/oval-convergence-default-1998.png`, `oval-convergence-min-1998.png`, `oval-convergence-max-1998.png`, and `oval-convergence-drag-mid-1998.png`. The two nearest waiting cards advanced monotonically across 13 sampled pointer positions; release settled to one focused card. At 1024 × 768, default steps were 11/30/62/175 px and the focus gap remained 8 px; 0 and 100 changed spacing in the expected direction. WebKit screenshots at 1998 × 840 and 1024 × 768 showed the same measured gap and step progression. At 800 px and 390 px, the page retained the classic path. All screenshots are local ignored evidence. Browser instances were closed; the pre-existing user-owned port-3001 dev server remains running.

The mirrored order was also exercised through the real Reverse list order checkbox. Its nearest waiting edge remained 8 px from focus after settling, but the page's current 72% desktop focus landing places most right-side waiting planes outside the viewport. A representative in-viewport mirror screenshot requires changing that separate landing control; this branch has numeric geometry evidence but no useful visual composition evidence in this pass. The converged path is a configurable perspective composition, not a literal ellipse mesh.
