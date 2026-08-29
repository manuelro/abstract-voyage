# Audit: about.tsx gradient mesh renders differently from commit 0f47c5d despite matching config values

## Context

A prior task ported the historical `DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG` (as it stood at commit `0f47c5df0e7f9238ee74fb30d3fff05c103b1cb4`, before it was retuned) into `pages/about.config.ts`'s own `ABOUT_DEFAULT_DOCK_PALETTE_CONFIG`, all 41 fields verbatim. The expectation was that `/about`'s gradient mesh would then match how it rendered at that historical commit. It doesn't — screenshots show a much more muted, large-scale, low-hue-variety mesh at the historical commit vs. a saturated, small-scale, high-hue-variety mesh today, on the same active card ("1 of 4" in both).

This audit traces every place a value could diverge between "the config values about.tsx now holds" and "the value the shader actually receives," since — confirmed below — **the config values themselves are not the problem.**

## Finding 0 (ruled out): the ported config values are correct

Re-verified directly against `pages/about.config.ts`: `enabled`, `mode`, `windowStep`, `hueSpread`, `windowPanCurve`, `gaussianPeakIndex/Sigma/Amplitude/Floor`, `fieldKinship`, `masterSaturation/Brightness/Contrast/Softness`, `gradientScale/Noise` (base/Wide/Lg, all uniformly `0.5`/`1`), and every other field match the historical commit's `DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG` exactly. `pages/about.tsx`'s own `dockPaletteConfig` state (`useState(() => ({ ...ABOUT_DEFAULT_DOCK_PALETTE_CONFIG }))`) is a plain, unmodified spread — no normalize call, no partial merge, nothing intercepts it before it becomes the live state value. This is not the cause.

## Finding 1 (confirmed, currently latent — direct answer to the "are the breakpoint knobs properly wired" question): a double-wiring collision between two independent gradient-scale/noise mechanisms

`pages/about.tsx` has **two separate, independently-built mechanisms** that both claim to apply `gradientScale`/`gradientNoise` to the rendered shader, and they now silently compete:

**Mechanism A (older, correctly tier-aware)** — `pages/about.tsx:728-750`:
```ts
const resolvedGradientScale = gradientBreakpointTier === 'lg'
  ? dockPaletteConfig.gradientScaleLg
  : gradientBreakpointTier === 'md'
    ? dockPaletteConfig.gradientScaleWide
    : dockPaletteConfig.gradientScale;
// ...
const dockSliderConfig = useMemo(() => ({
  ...DEFAULT_LIQUID_SLIDER_CONFIG,
  shaderColorScale: resolvedGradientScale,
  shaderColorRandomness: resolvedGradientNoise,
  ...
```
This correctly reads the live breakpoint (`gradientBreakpointTier`) and resolves the matching tier before writing into `dockSliderConfig.shaderColorScale`/`shaderColorRandomness` — the config object ultimately passed to every `LiquidGradientAdapter`/`AbstractPostDock` instance on this page.

**Mechanism B (newer, added by the "wire the dead gradientScale/gradientNoise knobs" fix, NOT tier-aware for this page)** — `experiences/abstract/components/AbstractPostDock/components/View.tsx:127-132`:
```ts
const deckPaletteStates = useMemo(() => buildDeckPaletteStates({
  slides, paletteConfig, hueInfluenceConfig, activeIndex,
}), [activeIndex, hueInfluenceConfig, paletteConfig, slides]);
```
No `tier` argument is passed. `buildDeckPaletteStates`'s own `tier` parameter (`experiences/abstract/helpers/deckPalette.ts`) defaults to `'mobile'` when omitted — so `paletteScale`/`paletteNoise` for every row rendered through `AbstractPostDock`/`View.tsx` (which is exactly how `/about`'s narrative dock rows render) is **always resolved against the mobile tier**, regardless of the page's actual current viewport width.

**The collision**: `webgl.ts`'s uniform assembly (`applySliderGradientUniforms`) does:
```ts
gl.uniform1f(gradientProgram.uScale, clamp((paletteScale ?? config.shaderColorScale) * (...), 0.5, 4));
gl.uniform1f(gradientProgram.uRandomness, clamp((paletteNoise ?? config.shaderColorRandomness) + (...), 0, 1));
```
`paletteScale`/`paletteNoise` (Mechanism B, mobile-tier-locked) is non-null whenever `paletteConfig.enabled` is true — which it is for `/about`. The `??` therefore makes Mechanism B **unconditionally win** over Mechanism A's `dockSliderConfig.shaderColorScale`/`shaderColorRandomness`, silently discarding about.tsx's own correctly-tier-resolved value.

**Why this hasn't visibly broken anything yet**: the currently-ported `ABOUT_DEFAULT_DOCK_PALETTE_CONFIG` has identical `gradientScale`/`gradientScaleWide`/`gradientScaleLg` values (`0.5`/`0.5`/`0.5`) and identical `gradientNoise`/`gradientNoiseWide`/`gradientNoiseLg` values (`1`/`1`/`1`) across every tier — a side effect of porting a single historical shared default that itself had no real tiering. Mechanism A and Mechanism B currently resolve to the same number by coincidence, not because the wiring is correct. **The moment an operator tunes the Wide or Lg tier fields to genuinely differ from the base tier — exactly what the "breakpoint (mobile/tablet/desktop)" panel section exists for — desktop/tablet visitors to `/about` will silently keep getting the mobile-tier value, because Mechanism B always wins and is locked to `'mobile'`.**

This directly answers the requested check: **the breakpoint gradient scale/noise knobs are not properly wired for `/about`'s dock rows.** They're double-wired, and the correct, page-aware mechanism (A) is currently inert, overridden by an incorrect, tier-blind one (B).

A second, smaller instance of the same gap: `pages/about.tsx:585-589` (`topSegmentPaletteState`, the header/top-segment gradient) also calls `buildDeckPaletteStates` with no `tier` argument — same latent mobile-tier lock, same currently-masked-by-coincidence non-symptom.

## Finding 2 (confirmed as a real architectural risk, not proven as the current cause): `normalizeAbstractPostDockPaletteConfig` still bases its fallback on the shared, cross-page default

`experiences/abstract/components/AbstractPostDock.tsx:163` — the actual component `/about` mounts (`AbstractPostDock`, a thin wrapper around `AbstractPostDockView`) does:
```ts
const resolvedPaletteConfig = useMemo(() => normalizeAbstractPostDockPaletteConfig(paletteConfig), [paletteConfig]);
```
and `normalizeAbstractPostDockPaletteConfig` (`experiences/abstract/components/AbstractPostDock/config/registered.ts:707`):
```ts
const base = { ...DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG, ...(config ?? {}) };
```
This spreads the **shared, `/abstract`-owned** `DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG` first, then layers the caller's own `paletteConfig` on top. Verified live: `DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG` has continued to be independently retuned since the palette fork (currently `gradientScaleLg: 4`, `fieldKinship: 0.76`, `gaussianSigma: 6`, `gaussianAmplitude: 1`, `gaussianFloor: 1`, `valueRigAmount: 1`, `masterContrast: 1.04`, `distanceDimmingMaxOpacity/BaselineOpacity: 1`, `distanceDimmingPower: 4`, `distanceDimmingEasing: 'expo'` — all far from the historical/about-ported values).

Because `AbstractPostDock`'s own `paletteConfig` prop is typed `Partial<AbstractPostDockPaletteConfig>` (line 54), this function is explicitly designed to accept an incomplete object and fill gaps from the shared default. **Today, `/about`'s own `dockPaletteConfig` state happens to be a complete, all-41-fields object, so every key gets overridden and this fallback never actually engages** — this is why Finding 2 doesn't currently explain the screenshots. But this is exactly the kind of "spooky action at a distance" the whole segregation effort (`PLAN-DOCK-PALETTE-CONFIG-SEGREGATION.md`) was meant to eliminate: any future code path that passes a genuinely partial `paletteConfig` into `AbstractPostDock` (a narrower panel binding, a future refactor, a bug) will silently blend in whatever `/abstract`'s shared default currently is, re-opening the exact cross-page bleed class the fork was built to close — just one level deeper than the scope-registration layer the fork already fixed.

## Verdict, updated after direct computation (not just static reading)

**Findings 1 and 2 are real structural bugs but empirically DISPROVEN as the cause of the screenshot mismatch.** Rather than continue reasoning about this from static code alone, a temporary vitest spec was written that imports the actual repo functions (`buildDeckPaletteStates`, `deckWindowHueOffset`, `deckWindowOffsetX`, `deckKinshipSeed`) and `ABOUT_DEFAULT_DOCK_PALETTE_CONFIG` directly, and prints the literal computed values for card index 0 of a 4-card deck (matching the "1 of 4" shown in both screenshots) — no browser needed, since these are pure functions with no DOM/WebGL dependency. Executed and then deleted (never committed). Result: `paletteScale`/`paletteNoise` (Mechanism B, tier defaults to `'mobile'`) = `0.5`/`1` at every tier; `resolvedGradientScale`/`resolvedGradientNoise` (Mechanism A, the correct tier-aware one) = **also** `0.5`/`1` at every tier — they agree, because `about.config.ts`'s three tiers are currently uniform. `hueOffset: -0.155`, `offsetX: -0.405`, `kinshipSeed: 0.078`, `masterSaturation/Brightness/Contrast: 0.85/0.96/0.98` — all exactly the ported historical values, nothing distorted. **Every field this audit flagged as risky produces numerically identical output to the historical commit, for this page's current config.** No other file in the render path changed either: `proceduralColorShader.ts`, `shaderSource.ts`, `legacy.ts` (`LiquidSliderConfig`), and `DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG`/`DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG` (both still `enabled: false`/unchanged) are byte-identical to the historical commit — confirmed via direct diff, not assumption. `pages/about.tsx`'s own full diff against that commit is purely the mechanical Dock-Layout-scope-fork rename — zero logic change to anything gradient-related.

**A third, previously-unexamined instance of the same tier-defaulting gap was found while chasing this**: `experiences/about/components/AboutMobileAccordion.tsx:54` also calls `buildDeckPaletteStates({ slides, paletteConfig, activeIndex: null })` with no `tier` argument — `/about`'s own mobile/narrow-breakpoint rendering path, entirely separate from `View.tsx`'s desktop path, and not previously audited. Worth noting because the two screenshots' own layouts look meaningfully different in overall width (the current one shows the left column's text truncated/cut in a way the historical one doesn't) — if they were captured at different browser widths, they may not both be going through `View.tsx` at all.

**Given the config-value math is now proven identical, the remaining explanation must be one of:**
1. **The two screenshots were captured through different components** — `View.tsx` (desktop dock) vs. `AboutMobileAccordion.tsx` (narrow/mobile), which this audit has not yet compared line-for-line for non-palette differences (their own respective `dockSliderConfig`-equivalent construction, CSS blur/softness application, canvas sizing).
2. **Live, time-varying motion/interaction state** — `uScale`/`uHueOffset`/`uSaturation`/`uBrightness` all also incorporate `motionValues.gradientStretch`/`velocity`/`settlingIntensity` (idle-drift animation) and, if a cursor was near the card, hologram tilt state — neither is a config bug, both are inherently different from one screenshot instant to the next.
3. Something outside this audit's own search space entirely.

**This needs one piece of information only the user has, since it can't be determined from the repository alone**: were the two screenshots captured at the same browser viewport width, and was the cursor resting on/near the card in either capture? That answer determines whether to chase (1) or (2) next — continuing to guess further from static code without it risks the same false-lead pattern this update just corrected.

**Operator follow-up**: same width (desktop breakpoint both times), cursor far from the card in both captures. This rules out (1) and the hologram half of (2). The idle-drift half of (2) was also checked and requires the slider to have actually been dragged at least once (`drift.hasDragged` in `GradientRenderer.tsx`, only ever set by `motionValues.isDragging`) — confirmed not applicable (operator: no dragging occurred). **The exact root cause of the original screenshot mismatch remains unresolved** — every mechanism this audit could check from the repository (config values, shared defaults, shader code, hue-influence/hologram defaults, component/breakpoint routing, motion/idle-drift state) has now been checked and ruled out. Per operator direction, this audit stopped chasing the exact visual cause and moved straight to fixing Finding 1 (below), the one concrete, confirmed bug regardless of whether it explains the original screenshots.

## Fix implemented (Finding 1)

1. `experiences/abstract/components/AbstractPostDock/components/View.tsx` now calls `useBreakpointTier()` and passes `tier` into its `buildDeckPaletteStates` call — the same pattern `AbstractJournalLabCollection.tsx` already used.
2. `pages/about.tsx`'s `topSegmentPaletteState` (the header/top-segment gradient) now passes `tier: gradientBreakpointTier` — the page's own already-computed live tier — into its own `buildDeckPaletteStates` call.
3. `experiences/about/components/AboutMobileAccordion.tsx` now passes `tier: 'mobile'` explicitly (functionally unchanged — this component only ever mounts below `md` — but made explicit so a future reader doesn't have to re-derive that this default happens to be safe here).
4. **Mechanism A removed**: `pages/about.tsx`'s own `resolvedGradientScale`/`resolvedGradientNoise` → `dockSliderConfig.shaderColorScale`/`shaderColorRandomness` was deleted outright, since it was already fully overridden everywhere by Mechanism B (`webgl.ts`'s `paletteScale ?? config.shaderColorScale`) and kept as dead, misleading state would have re-created the exact same silent-collision risk the moment anyone touched it. There is now exactly one gradient-scale/noise tier-resolution path.

**Important consequence, not a side effect of touching `pages/abstract.tsx` (that file was not edited) but of fixing shared code `pages/abstract.tsx` also depends on**: `/abstract`'s own "JOURNAL & LABS" dock (`pages/abstract.tsx:3567`, `<AbstractPostDock paletteConfig={dockPaletteConfig} .../>`) renders through this exact same `View.tsx`. It had the identical bug — desktop always silently got the mobile-tier `gradientScale`/`gradientNoise` — and this fix corrects it there too. Since `/abstract`'s own shared default (`DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG` in `registered.ts`) currently has **non-uniform** tiers (`gradientScale: 0.5`, `gradientScaleWide: 0.5`, `gradientScaleLg: 4`), this is a real, visible change: `/abstract`'s JOURNAL cards will now correctly render with `gradientScaleLg: 4` on desktop instead of the previously-always-applied `0.5`. This was not requested and `pages/abstract.tsx`'s own file was left untouched per every prior instruction in this thread, but the shared-code fix cannot help but correct the same bug there too — flagging this explicitly rather than letting it pass silently, since it's the kind of visible change that should be confirmed, not discovered later.

Verified: `tsc --noEmit` clean; `vitest run pages components/Panel experiences/abstract experiences/about` shows the same 3 pre-existing, unrelated failures (no regressions); dev server smoke-tested on both `/about` and `/abstract` (200, no runtime errors), killed immediately after the check. Not visually confirmed in a live browser (no tooling available this session) — the regression test from the original fix plan (tune `/about`'s Wide/Lg gradient tiers to visibly differ from the base tier, confirm desktop/tablet actually reflects it) and a live look at `/abstract`'s JOURNAL section (to confirm the `gradientScaleLg: 4` consequence above is the intended look, not itself a leftover live-tuning artifact worth reverting) both still need a human check.

## Remaining fix plan (Finding 2 — not yet implemented, not requested this round)

1. **Remove the shared-default fallback risk from `normalizeAbstractPostDockPaletteConfig`.** Options, in order of preference:
   - Tighten `AbstractPostDock`'s own `paletteConfig` prop type from `Partial<AbstractPostDockPaletteConfig>` to the full `AbstractPostDockPaletteConfig`, forcing every caller (both `/abstract` and `/about`) to supply a complete, already-normalized object — removing the need for `normalizeAbstractPostDockPaletteConfig` to have any fallback-merging behavior at the call site at all (normalization can still happen once, at each page's own config-binding layer, using that page's own default as the fallback rather than the shared one).
   - If a `Partial<>` input must stay supported for some other real caller, change `normalizeAbstractPostDockPaletteConfig` to require an explicit fallback-default argument (`normalizeAbstractPostDockPaletteConfig(config, fallbackDefault = DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG)`), and have `pages/about.tsx`'s own call site (wherever it ultimately triggers this normalize, currently inside `AbstractPostDock.tsx`) pass `ABOUT_DEFAULT_DOCK_PALETTE_CONFIG` explicitly instead of silently inheriting the shared one.
2. **Verification once implemented**: confirm that passing a deliberately-partial `paletteConfig` (missing several fields) into `<AbstractPostDock>` on `/about` falls back to `ABOUT_DEFAULT_DOCK_PALETTE_CONFIG`'s own values for the missing fields, not `/abstract`'s shared default's current values.
