# PLAN — AboutTimeline gradient-mesh marker (opt-in)

Scope: `experiences/about/components/AboutTimeline*`, plus small, low-risk touches to `pages/about.tsx` (new props) and `AbstractPostDock/helpers/webgl.ts` (clamp floor only).

## 1. Feasibility summary (already researched, not re-litigated here)

- The dock's gradient mesh (`LiquidGradientAdapter`, `experiences/abstract/components/AbstractPostDock/components/GradientRenderer.tsx`) is a WebGL1 canvas shader. It already runs in a `'frozen'`/`'static'` mode (render once on prop change, no per-frame RAF loop) — `AboutMobileAccordion` already mounts one instance **per item simultaneously** in this exact mode (`AboutMobileAccordionItem.tsx`, `STATIC_GRADIENT_PERFORMANCE_CONFIG`). Five simultaneous frozen instances (one per timeline row) is not a new risk pattern — it's the same one already shipped.
- The failure mode identified initially — a small render reading as a flat blurred smear — has a direct fix: the shader already exposes a `uScale` uniform (`helpers/proceduralColorShader.ts`) that controls spatial zoom. Lower `uScale` = more of the pattern's spatial frequency sampled per pixel = denser, more legible pattern at small sizes. It's set via `applySliderGradientUniforms` (`AbstractPostDock/helpers/webgl.ts:346`) from `config.shaderColorScale` (default `0.5`), with an existing optional per-call override param (`paletteScale`) that already bypasses the shared dock config — the exact "opt-in per-instance override, config-independent" mechanism `domainCurveBoost`/`hologramConfig` already establish as precedent.
- The hardcoded clamp at that call site is `clamp(..., 0.5, 4)`. `0.5` is already the dock's own default, i.e. already at the clamp's zoomed-in floor. A marker at ~24px will likely need to go below `0.5` for the pattern to read as multiple bands rather than one wash — this plan lowers the clamp floor (not the dock's default), a narrow, additive change.

**Verdict: feasible as a moderate, self-contained feature.** Main engineering cost is data plumbing (palette/motion down to `AboutTimeline`), not new shader work.

## 2. What "reuse the same gradient mesh" concretely means

Render one `LiquidGradientAdapter` instance per timeline row, clipped to the row's existing circular `.marker` box, in place of (or layered under) the current flat `background-color: currentColor` fill — **only** while a new opt-in config flag is on, and only ever mounted on desktop (this component is already desktop-only; nothing changes for `AboutMobileAccordion`, which already has its own gradient).

Each row's marker instance needs, per `LiquidGradientAdapter`'s existing props:
- `slide`: the row's own `aboutSlides[row.slideIndex]` (already resolved in `pages/about.tsx`, just not currently passed to `AboutTimeline`).
- `palette`: that same slide's own resolved `DeckPaletteState` (already computed in `pages/about.tsx` alongside `aboutSlides`).
- `motion`: a single shared `useLiquidSliderMotion(dockSliderConfig)` instance, reused across all 5 markers (matches the page's own existing "topSegment" standalone-gradient precedent — `pages/about.tsx`'s `topSegmentMotion`, an independent mount not tied to the active dock slide).
- `config`: the same `dockSliderConfig` the real dock already uses (`pages/about.tsx`), so palette/tuning never drifts from the dock's own values (INT-04's existing "no new palette math here" rule, extended).
- `activity`: forced `'frozen'`/`'static'`, gated by `prefersReducedMotion` and (reusing `useDockGradientAvailability`) offscreen/document-visibility — same as `AboutMobileAccordion`'s own gating.

## 3. Config additions (`AboutTimeline.config.ts`)

New fields on `AboutTimelineConfig`, all opt-in, defaulting to today's exact behavior:

```ts
/** Off (default): marker fill is the existing flat markerColor/markerColor-mode
 * behavior, unchanged. On: the marker renders the same LiquidGradientAdapter
 * mesh the active dock slide/mobile accordion item already uses, clipped to
 * the marker's own circle, in place of the flat fill. Desktop-only (this
 * component already is); no effect while off. */
markerGradientEnabled: boolean;
/** Only read while markerGradientEnabled is on. Overrides the shader's own
 * uScale uniform for marker instances only (via applySliderGradientUniforms's
 * existing paletteScale override param) — independent of the dock's own
 * shaderColorScale, never written back to the shared dock config. Lower =
 * more zoomed in / denser pattern, higher = flatter/smoother. Default picked
 * for legibility at the current default markerSizeClassName (24px); retune
 * here, not in webgl.ts, if the marker size changes. */
markerGradientScale: number;
```

`normalizeAboutTimelineConfig`: `markerGradientEnabled: Boolean(...)`, default `false`; `markerGradientScale: clampRange(..., LOOSENED_FLOOR, 4, DEFAULT)` (see §5 for the floor value — determined empirically in the prototype step, not guessed here).

`DEFAULT_ABOUT_TIMELINE_CONFIG`: `markerGradientEnabled: false` (zero visual change until an operator opts in), `markerGradientScale`: prototype-determined default (§6 first step).

## 4. Component changes

- **`AboutTimeline.tsx`**: accepts new optional props (`aboutSlides`/per-row slide+palette lookup, `motion`, `gradientConfig`, `prefersReducedMotion` — the last already exists as a prop). Only actually reads/uses them while `config.markerGradientEnabled` is on; otherwise identical render path, so passing `undefined` from any other future consumer of `AboutTimeline` is safe (matches existing "every prop optional unless truly required" pattern here).
- **`AboutTimelineRow.tsx`**: `.marker` span becomes a small wrapper (`overflow: hidden`, same `border-radius: 9999px`, same size) that, while gradient mode is on, mounts `LiquidGradientAdapter` absolutely-positioned inside it (matching the adapter's own existing `position: absolute; left/top: 50%` self-centering) instead of relying on `background-color: currentColor`. The existing hollow/filled outline (`border: 1.5px solid currentColor`) stays — the gradient replaces the *fill*, not the ring, so inactive vs. active still reads via the same fill-toggle mechanism (A11Y-04, unchanged).
- **`AboutTimeline.module.css`**: `.marker` gets `overflow: hidden` (only meaningful once a canvas child exists); no other rule changes.
- **`AboutTimeline.panel.ts`**: two new fields in the existing "Timeline" scope — a `boolean` toggle (`markerGradientEnabled`) and a `number` field (`markerGradientScale`, `visibleWhen` gated on the toggle, matching the existing `whenCustomMarkerColor`/`whenRuleVisible` pattern already used in this file).
- **`pages/about.tsx`**: passes the new props through to `<AboutTimeline>` (slides/palettes/motion/gradientConfig already computed there for the dock; this is wiring, not new computation — same "don't invent new palette math" rule §2 already states).
- **`AbstractPostDock/helpers/webgl.ts`**: loosen the `uScale` clamp floor from `0.5` to a lower value determined in the prototype step (e.g. `0.15`–`0.2`, TBD empirically). This only *widens* the allowed range — the dock's own default (`0.5`) and every existing caller's behavior at `scale >= 0.5` is completely unaffected.

## 5. What's deliberately NOT changed

- No changes to `AboutMobileAccordion`/mobile rendering at all.
- No changes to the shared `LiquidSliderConfig`/`dockPaletteConfig` used by the real dock — the marker's scale override is per-instance only (§2/§3).
- No new shader code — reuses `uScale` exactly as-is.
- `markerColorMode`/`markerCustomColor`/`markerIdleOpacity`/`markerActiveOpacity` all keep their current meaning and continue to apply to the ring/outline; gradient mode only changes what fills the inside.

## 6. Rollout steps

1. **Prototype spike first** (per prior agreement): wire one hardcoded marker instance behind a temporary flag, screenshot at the default `markerSizeClassName` (24px) and a couple of the larger catalog options (28px/32px), and tune `markerGradientScale`'s real default + the `webgl.ts` clamp floor against what's actually legible — don't guess these two numbers ahead of a visual check.
2. If the prototype reads well: implement §3/§4 fully, default `markerGradientEnabled: false` (opt-in, zero change for every existing page/operator until toggled).
3. If the prototype does NOT read well even after scale tuning: stop here — do not build the full opt-in plumbing for a feature that doesn't look good at any tested scale; report back instead of shipping a config-gated feature nobody would enable.
4. Either way: no regressions possible for operators who never touch the new panel fields, since every new field defaults to current behavior.
