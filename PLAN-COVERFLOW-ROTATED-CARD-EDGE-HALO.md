# Plan: eliminate the bright edge halo on rotated CoverFlow neighbor cards

## Context

Operator-reported, via annotated screenshots: a thin, distinctly *lighter* line hugging the edge of CoverFlow's rotated neighbor cards, most visible where the card's edge meets the dark page/column background. Two prior fix attempts targeted the wrong mechanism:

1. First diagnosis mistakenly attributed it to `.stackNeutralSurface`'s border-mode ring — ruled out (that ring is 0-width/transparent on any card actually showing this artifact).
2. Second diagnosis mistakenly attributed it to `useCardLiftPhysics`'s elevation `box-shadow` on `.fadeSurface` — implemented and reverted after the operator confirmed it didn't fix the reported issue.

This document is the corrected root-cause diagnosis (data-backed, not the same guess repeated) and a concrete, ranked remediation plan. No code has been changed as part of this plan — see `## Experiments run` for what *was* touched (and reverted) to gather evidence.

## Root cause (confirmed)

**Not a border, shadow, or any authored CSS on this card.** Live DOM inspection (`elementsFromPoint` + `getComputedStyle` at the flagged pixels) found zero `border`/`outline` and only the already-known, unrelated `.fadeSurface` shadow — which is active-card-only and therefore can't explain an artifact that is in fact *strongest on inactive, rotated neighbor cards* (which have no elevation shadow at all; `shadowEnabled: stackActiveSlide` is false for them). That comparison alone disproves the previous fix's target.

**It's a GPU-compositing anti-aliasing artifact**, confirmed with pixel-level measurement (`sharp`, raw RGB scan across the edge of a 40°-rotated neighbor card):

| Position | RGB | Luminance |
|---|---|---|
| background | (30, 29, 48) | 31 |
| **edge peak** | **(128, 83, 115)** | **95** |
| card's own steady fill | (126, 51, 84) | 69–71 |

Every channel of the peak pixel (R, G, *and* B) exceeds both the background's and the card's own fill's corresponding channel simultaneously — mathematically impossible for ordinary linear alpha blending between the two colors actually visible on screen. A third, brighter contribution is entering the compositing math at exactly that pixel column. On the flat, unrotated active card (rotateY ≈ 0), the same scan shows no such overshoot — only sub-shadow-scale noise.

**Mechanism**: the architecture nests, inside one `transform-style: preserve-3d` scene:
- `CoverFlowItemInner`'s own wrapper (`CoverFlow.tsx`) — carries the `rotateY`/`z` 3D transform, up to `rotationDeg` (40° default) for every inactive card.
- `.physics` — a second, independent transform (hover-lift scale/translateZ).
- `.fadeSurface` — carries the elevation `box-shadow`.
- `ArticleCard`'s own root `div` — the *actual* `border-radius` + `overflow: hidden` rounded clip, and the WebGL `<canvas>` gradient mesh underneath it.

The rounded clip is several transform layers *inside* the rotated one, not coincident with it. Browsers commonly rasterize a clipped, composited layer flat (at native resolution) and then apply the 3D transform to the resulting texture as a separate compositing step. Anti-aliasing that rounded-clip edge and then resampling it under a steep `rotateY`/`perspective` warp — especially if that resampling blends in non-linear (gamma/sRGB) space rather than linear space — is a well-documented class of browser rendering artifact that produces exactly this kind of brightness overshoot at rounded, foreshortened edges against a dark backdrop. It is a rendering-pipeline side effect of *this specific layering*, not a mis-set style property — there is no single CSS declaration to delete.

## Experiments run (evidence-gathering only, all reverted)

- Temporarily set `rotationDeg` 40 → 20 in `CoverFlow.config.ts`, re-measured the same neighbor-card edge: peak overshoot above the card's own fill was **~24 luminance units at 20° vs. ~25 at 40°** — essentially unchanged. **Reducing the rotation angle alone does not reliably shrink the artifact's intensity** in this range, though the two measurements aren't perfectly controlled (different mesh phase/hue, different card width from the resulting layout reflow) and only cover one data point per angle — treat as a strong *caution*, not a proof that geometry tuning is useless.
- Config file restored to its pre-experiment value (`rotationDeg: 40`) immediately after measuring; no residual diff beyond this session's own already-committed work.
- **Implemented and measured option 2 (`clip-path` swap) — did not fix it, reverted.** Added an opt-in `edgeClipMode`/`edgeClipRadiusPx` pair to `ArticleCard.tsx` (default `'overflow'`, byte-identical everywhere else), an `edgeClipViaMask` opt-in prop threading it through `AbstractJournalLabHueFadeCard`, and wired it on for CoverFlow only (`pages/abstract.tsx`). Re-ran the exact same pixel scan at the identical crop coordinates (box position matched the original 40° baseline exactly, confirming an apples-to-apples comparison): peak-above-fill overshoot was **~24 luminance units with `clip-path` vs. ~26 with `overflow: hidden`** — within measurement noise, not a real fix. `clip-path` goes through a similarly-affected compositing path for this specific nested-transform scenario. Fully reverted (`tsc --noEmit` clean, zero diff across all three touched files) rather than keep unused surface area per this plan's own "don't overcomplicate" standard.
- **Implemented and measured option 1 (collapse the layering) — also did not fix it, reverted. This is the more important negative result.** Added `CoverFlowConfig.cardClipRadiusPx` (default 16px), applied as `overflow: hidden` + `border-radius` directly on `CoverFlowItemInner`'s own outer wrapper — the *same* element that owns `rotateY`/`z` — gated to inactive cards only (the active card keeps its unclipped wrapper, since it needs the hover-lift headroom `resolveMaxHoverSafeItemHeightPx` reserves, and it's unrotated anyway so it never showed the halo). Confirmed via live DOM inspection that the fix was genuinely applied exactly as designed: computed style showed `overflow: hidden`, `border-radius: 16px`, and a real `matrix3d(...)` confirming an actual 40° `rotateY` on that same element. Re-ran the identical pixel scan (box position matched the baseline exactly): peak-above-fill overshoot was **~24 luminance units — statistically the same as both the original `overflow: hidden`-nested-deep baseline (~26) and the `clip-path` spike (~24)**. Clipping at the *same* layer as the rotation, with zero intervening transformed layers, made no measurable difference. Fully reverted (`tsc --noEmit` clean, zero diff across all three touched files).

### What this means — revised diagnosis

The original hypothesis (a rounded clip nested *inside* other transformed layers gets anti-aliased, then re-resampled under the outer rotation, producing the overshoot) predicted that removing the nesting would fix it. It didn't. Since **neither the clip mechanism (`overflow: hidden` vs `clip-path`) nor its position in the transform hierarchy (nested vs. coincident with the rotation) changed the measured overshoot at all**, the artifact is very likely a more fundamental property of how this browser (Chromium, tested via Playwright) anti-aliases *any* rounded-rect edge once it's rendered under a steep CSS 3D `rotateY`/`perspective`, independent of DOM structure — i.e., not something fixable by rearranging this codebase's own clip/transform layering at all. Everything in the "Candidate fixes" list above that assumed a DOM-structural fix was reachable (options 1 and 2) is now empirically ruled out. What's left:

- **Option 4 (soften background contrast)** is now the primary remaining, *practical* lever — it doesn't remove the artifact but reduces its visibility, and doesn't depend on the (now-disproven) structural hypothesis.
- **Option 3 (geometry tuning)** — `rotationDeg` was already shown not to help meaningfully between 40°→20°; not retested further given the two structural options above also failed under the same methodology.
- **A more radical, untested option**: bake the rounded-corner mask into the WebGL shader/canvas itself (discard/alpha-out pixels outside the rounded rect inside the fragment shader) instead of relying on any CSS-level clip at all, so there's no browser-side rounded-clip-under-rotation compositing step to produce the artifact in the first place. This is a bigger change (touches `GradientRenderer`'s shader code, not just layout/CSS) and wasn't attempted in this session — it's the only remaining idea that doesn't route through the same CSS-clip mechanism already shown twice not to matter.

## Candidate fixes, ranked by expected effectiveness vs. effort/risk

1. **Collapse the layering so the rounded clip is coincident with the rotated element** (highest confidence, highest effort). Currently the rotation lives on the outermost wrapper while the `border-radius`/`overflow:hidden` clip lives 3 levels deeper (past `.physics`'s own transform and `.fadeSurface`'s shadow). Moving the rounded clip to the *same* element that owns `rotateY` (or removing the intermediate transformed layers between them) gives the browser one clip boundary to rasterize against the rotation instead of a clip nested inside other transformed/composited layers. This is the most likely mechanism to actually address the root cause, but it touches `AbstractJournalLabHueFadeCard`/`ArticleCard`'s shared structure (used by `/about`'s `CardStack` too) — needs careful scoping so `/about`'s own look doesn't shift, mirroring how this session's earlier scrim/shadow knobs stayed opt-in per caller.
2. **Try `clip-path` instead of `border-radius` + `overflow: hidden`** on the same element (low effort, isolated, fully reversible). Some browsers rasterize `clip-path` through a different compositing path than `overflow: hidden`, which can behave differently (better *or* worse) under 3D transforms. Cheap enough to A/B directly against a live screenshot before committing to option 1's larger refactor.
3. **Geometry tuning (`rotationDeg` / `perspectivePx`) as a contributing lever, not a standalone fix** — both already live in `CoverFlow.config.ts`, zero code risk. The quick experiment above suggests this alone won't be sufficient, but a larger `perspectivePx` (flatter projection for the same rotation) hasn't been tested yet and may behave differently from lowering `rotationDeg` — worth a real pass, ideally combined with option 1 or 2 rather than relied on alone.
4. **Cosmetic mitigation: soften the background contrast behind the CoverFlow** (lowest risk, doesn't remove the artifact, just makes it less visible). Since the overshoot's *visibility* is a function of contrast against the column background, a background that's closer in luminance to the card's own edge tones (e.g., a subtle gradient/vignette instead of one flat dark navy) would make a residual halo read as a soft glow rather than a hard line. Worth doing as a finishing touch regardless of which structural option above is chosen — it's the safety net if 1/2 only partially close the gap.

## Recommended order of operations (post-experiment)

1. ~~Spike option 2 (`clip-path` swap)~~ — **done, ruled out.**
2. ~~Option 1 (collapse the clip/rotation layering)~~ — **done, also ruled out.** Both CSS-clip-based structural options are now empirically dead ends.
3. **Option 4 (soften background contrast) is the next practical step** — doesn't require any further structural experimentation, low risk, and is honest about not removing the artifact, only its visibility.
4. **The shader-level rounded-mask idea (see "What this means" above) is the only remaining path to actually eliminate it**, but is a bigger, untried change (touches `GradientRenderer`'s WebGL fragment shader) — worth a explicit decision before starting, given two structural attempts have already failed and this one has real implementation cost.
5. `rotationDeg`/`perspectivePx` tuning: not worth further investment as a standalone fix given the evidence so far.

## Verification plan (for whichever option is implemented)

- Repeat this session's exact pixel-scan methodology (`sharp`, RGB across the edge at a fixed y) before/after, on the same card/angle, to get an objective luminance-overshoot number rather than a subjective "looks better."
- Live visual screenshot comparison at the same zoom/crop as the operator's own reports.
- Cross-browser check: this class of bug is notoriously engine-specific. This session's own quick WebKit screenshot attempt didn't render correctly (script/timing issue, not a confirmed engine difference) — redo that properly as part of verification rather than relying on Chromium alone.
- Confirm no regression to `/about`'s `CardStack` presentation if option 1 is the one implemented, since it shares the same underlying component.

No file changes were made as part of producing this plan (the `rotationDeg` edit used to gather evidence was reverted immediately after measuring).
