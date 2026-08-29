# Audit + plan: segregating "Dock palette direction" (and its sibling scopes) per page

## Context

The user reported that tuning the floating settings panel's "Dock palette direction" section while viewing `/about` appears to alter the gradient mesh on `/abstract` too — two pages that should be fully independent. The ask: audit which fields are actually shared, then plan a fix that keeps one centralized config-panel UI (same knob set, same place operators go to tune it) while making the underlying stored values fully independent per page.

## Audit findings

### 1. The reported mechanism is real, but it isn't live React state sharing

Both pages hold their own independent `useState<AbstractPostDockPaletteConfig>` for their dock palette config — `pages/about.tsx:414-416` and `pages/abstract.tsx:1543-1546` — and there is no `dockPaletteConfig` (or equivalent) anywhere in `components/SharedDesignConfigProvider.tsx`, the one place this codebase does put genuinely cross-page state (`panelShellConfig`, `ctaButtonConfig`, etc.). Each page also assembles its **own** `bindings` array locally and passes it into its own `<ConfigScopeList>` (`pages/about.tsx`'s own `componentConfigBindings` / `pages/abstract.tsx:3898`) — there is no global registry that surfaces one page's scopes while the other page is mounted. A full Next.js page navigation between `/about` and `/abstract` unmounts one React tree and mounts the other; nothing here can bleed live, in-memory, across that boundary.

### 2. The actual mechanism: the panel's copy-to-source-code workflow shares a target file/symbol

Every config scope's `defineConfigScope(...)` call carries a `copy: { targetFile, targetSymbol, updateStrategy }` block (e.g. `experiences/abstract/components/AbstractPostDock/config/panel.ts:257-263`). This is what the panel's COPY/COPY ALL buttons use to generate a patch describing the operator's tuned values, targeted at a specific exported constant in a specific source file — the mechanism this codebase uses to turn a live, in-browser tuning session into a real code change (via a coding assistant applying that patch, exactly like the session that produced this document).

**If two pages' scopes share the same `id` and the same `copy.targetSymbol`, tuning either page and applying the resulting patch overwrites the one constant both pages read their own defaults from — this is the actual "editing `/about` changes `/abstract`" mechanism**, and it is a real, reproducible bug class (not live state, but a same-effect source-level one): tune → copy → apply → the *other* page's default silently changes on the next load.

### 3. "Dock palette direction" was already fixed for this exact bug, on 2026-08-24 — but kept a misleading name

`pages/about.panel.ts:420-453` shows `/about` no longer reuses `AbstractPostDock`'s own generic palette scope. It registers its own: `id: 'AboutPage/dockPalette'`, its own default (`ABOUT_DEFAULT_DOCK_PALETTE_CONFIG` in `pages/about.config.ts`), and — critically — its own `copy.targetFile: 'pages/about.config.ts'` / `targetSymbol: 'ABOUT_DEFAULT_DOCK_PALETTE_CONFIG'`, distinct from `AbstractPostDock`'s own scope (`copy.targetSymbol: 'DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG'` in `experiences/abstract/components/AbstractPostDock/config/registered.ts`). The doc comment at `pages/about.panel.ts:420-435` names the exact prior incident: an operator tuning "Inactive duck" on `/about` and applying the resulting patch was silently editing a constant `/about`'s own page never even reads for that field.

**Remaining problem: it still shows the title `'Dock palette direction'`** (`pages/about.panel.ts:440`) — byte-identical to `AbstractPostDock`'s own generic scope title (`experiences/abstract/components/AbstractPostDock/config/panel.ts:205`). The two are now fully disconnected under the hood, but an operator looking at the panel has no way to tell that apart from the *fields visible in `/about`'s dock UI itself* (e.g. `experiences/abstract/components/AbstractPostDock/config/registered.ts:565-573`'s own doc comment for `gradientScale` still says *"Shared across every consumer of this palette config (the card stack's own cards on /abstract, the real narrative rows and header top segment on /about)"* — a doc comment describing the **pre-fix** architecture, now stale and actively misleading). This identical naming is almost certainly why the bleed was suspected/reported again: the fix is real, but nothing signals it happened.

### 4. The same unfixed bug class is confirmed still present for at least one other scope: "Dock layout"

`pages/about.tsx:53,171` resolves `ABSTRACT_POST_DOCK_LAYOUT_SCOPE_ID` — **the exact same scope `id`** `pages/abstract.tsx:191` resolves for its own dock. This scope's definition (`experiences/abstract/components/AbstractPostDock/config/panel.ts:1003-1012`, title `'Dock layout'`) has `copy.targetFile: '.../registered.ts'`, `targetSymbol: 'DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG'` — the one shared constant both pages' own layout defaults trace to. **This is palette's exact pre-2026-08-24 bug, still live today, just under a different config family.** Tuning "Dock layout" from `/about` and applying the resulting copy would change `/abstract`'s own default layout too.

### 5. One more scope showing the identical risk pattern, different config family entirely

`pages/about.tsx:132,184` also pulls in `ABSTRACT_EDITORIAL_HERO_LAYOUT_SCOPE_ID` from `experiences/abstract/components/AbstractEditorialHero.panel` — a component defined for `/abstract`'s own editorial hero, reused unmodified on `/about`. Not independently verified line-by-line in this pass (out of the literal "Dock palette direction" ask), but it matches the identical shape of the bug (generic component scope, defined once, resolved verbatim by both pages) and should get the same audit-and-fork treatment before this is considered fully closed.

### Scopes confirmed already page-specific (no action needed)
`ABOUT_PAGE_LAYOUT_SCOPE_ID`, `ABOUT_MOBILE_ACCORDION_SCOPE_ID`, `ABOUT_TOP_SEGMENT_GRADIENT_SCOPE_ID`, and (as of the 2026-08-24 fix) `ABOUT_DOCK_PALETTE_SCOPE_ID` all have their own dedicated `id`+default+copy target, distinct from anything `/abstract` reads.

## The config knobs to keep centralized (same UI, same field set, on both pages)

`AbstractPostDockPaletteConfig` — 41 fields, unchanged by this plan (the fix forks *storage*, not the *schema* operators see):

`enabled`, `mode`, `windowStep`, `hueSpread`, `windowPanCurve`, `gaussianPeakIndex`, `gaussianSigma`, `gaussianAmplitude`, `gaussianFloor`, `gaussianVisualTestModeEnabled`, `gaussianProximityMorphEnabled`, `gaussianProximityResponseMs`, `gaussianProximityStaggerMsPerBand`, `gaussianProximityEasing`, `fieldKinship`, `inactiveChromaDuck`, `valueRigAmount`, `masterSaturation`, `masterBrightness`, `masterContrast`, `masterSoftness`, `gradientScale`, `gradientNoise`, `gradientScaleWide`, `gradientNoiseWide`, `gradientScaleLg`, `gradientNoiseLg`, `distanceDimmingEnabled`, `distanceDimmingMaxOpacity`, `distanceDimmingBaselineOpacity`, `distanceDimmingPower`, `distanceDimmingEasing`, `rampSpan`, `rampRotation`, `rampPath`, `relayEnabled`, `counterpointChroma`, `chordChroma`, `paletteLightness`, `lightnessContrast`, `inkUnity`, `voiceSpread`.

`AbstractPostDockLayoutConfig`'s own field set (the "Dock layout" scope) is likewise unchanged by this plan — only its storage/copy-target gets forked, same as palette already was.

## Plan

### Step 1 — Rename `/about`'s already-disconnected palette scope (the literal ask)

In `pages/about.panel.ts:440`, change `title: 'Dock palette direction'` to something naming what it actually does *on this page* rather than reusing `/abstract`'s own generic title — e.g. `'Narrative palette direction'` or `'About dock palette'` (final wording is a naming call, not an architectural one; pick whichever reads clearly against `/about`'s own other section titles like `'Dock layout'`/`'Mobile accordion'`). This alone resolves the operator-facing confusion: a distinctly-titled section makes it visually obvious this is `/about`'s own independent copy, not a shared control.

Also update the now-stale doc comment at `experiences/abstract/components/AbstractPostDock/config/registered.ts:565-573` (`gradientScale`'s own doc comment, and `gradientNoise`'s alongside it) — it still asserts these fields are "shared across every consumer... /abstract... /about," which was true before the 2026-08-24 fork and is no longer accurate. Leaving a doc comment that overclaims sharing is exactly the kind of thing that reads as confirmation of a bug that no longer exists.

### Step 2 — Fork "Dock layout" the same way palette was already forked

This is the one scope confirmed to still have the live bug class:

1. In `pages/about.config.ts`, add `ABOUT_DEFAULT_DOCK_LAYOUT_CONFIG: AbstractPostDockLayoutConfig = { ...DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG, /* only if `/about` needs its own overrides — otherwise a plain spread is enough to give it independent storage */ }`, mirroring `ABOUT_DEFAULT_DOCK_PALETTE_CONFIG`'s own existing pattern exactly.
2. In `pages/about.panel.ts`, add `ABOUT_DOCK_LAYOUT_SCOPE_ID = 'AboutPage/dockLayout'` and an `ABOUT_DOCK_LAYOUT_PANEL = defineConfigScope<AbstractPostDockLayoutConfig>({ ...same shape as ABOUT_DOCK_PALETTE_PANEL... fields: ABSTRACT_POST_DOCK_LAYOUT_PANEL.fields, copy: { targetFile: 'pages/about.config.ts', targetSymbol: 'ABOUT_DEFAULT_DOCK_LAYOUT_CONFIG', ... } })` — reusing the existing field-schema array (`ABSTRACT_POST_DOCK_LAYOUT_PANEL.fields`) so the operator-visible knob set is byte-identical to `/abstract`'s own, only the id/default/copy-target differ. Give it its own distinct title too (not `'Dock layout'` verbatim — same naming-collision reasoning as Step 1).
3. In `pages/about.tsx`, replace the `ABSTRACT_POST_DOCK_LAYOUT_SCOPE_ID` import/resolve (lines 53, 171) with the new `ABOUT_DOCK_LAYOUT_SCOPE_ID`/`aboutConfigPanelRegistry.resolve(...)`, and back it with `/about`'s own local `useState` (mirroring however `dockPaletteConfig`'s own `useState` is already wired) instead of whatever currently feeds `/about`'s dock layout prop.
4. Register `ABOUT_DOCK_LAYOUT_PANEL` in `aboutConfigPanelRegistry` (`pages/aboutConfigPanels.ts`), matching how the palette panel is already registered there.

### Step 3 — Audit and, if warranted, fork the editorial-hero scope the same way

Repeat the same read this plan gave palette/layout for `ABSTRACT_EDITORIAL_HERO_LAYOUT_SCOPE_ID`: confirm whether `/about`'s own usage of `AbstractEditorialHero` needs independent tuning from `/abstract`'s, and if so, fork it via the identical pattern (own id, own default constant, own copy target, same field schema reused for the UI). Flagged here as a known follow-up rather than executed in this pass, since it wasn't the scope named in the original report and deserves its own confirmation before touching it.

### Step 4 — Verification

- `tsc --noEmit` after each scope fork.
- Confirm both pages' panels still show the same *fields* for "Dock layout"/palette (schema reuse via `fields: ABSTRACT_POST_DOCK_LAYOUT_PANEL.fields` guarantees this structurally, but worth a live visual check).
- The real regression test for this class of bug isn't runtime — it's the copy workflow: tune a value in `/about`'s forked scope, use its "COPY" button, and confirm the resulting patch targets `pages/about.config.ts`'s own constant, never `experiences/abstract/components/AbstractPostDock/config/registered.ts`.

## Implementation status

**Steps 1 and 2 done.** Step 3 (editorial-hero scope) remains a flagged, unexecuted follow-up per its own section above.

- **Step 1**: `pages/about.panel.ts`'s `ABOUT_DOCK_PALETTE_PANEL` title changed to `'About dock palette'`. The stale "shared across /abstract and /about" doc comment on `gradientScale`/`gradientNoise` (`experiences/abstract/components/AbstractPostDock/config/registered.ts`) corrected to describe the current, per-page-forked reality.
- **Step 2**: `ABOUT_DEFAULT_DOCK_LAYOUT_CONFIG` — previously a page-local, unexported constant declared directly in `pages/about.tsx` (confirmed live: `/about`'s real `dockLayoutConfig` state already initialized from it) — relocated to `pages/about.config.ts` so `pages/about.panel.ts` could import it. New scope `ABOUT_DOCK_LAYOUT_SCOPE_ID = 'AboutPage/dockLayout'` / `ABOUT_DOCK_LAYOUT_PANEL` registered there (title `'About dock layout'`, `copy.targetSymbol: 'ABOUT_DEFAULT_DOCK_LAYOUT_CONFIG'`, `fields: ABSTRACT_POST_DOCK_LAYOUT_PANEL.fields` reused verbatim so the operator-visible knob set is unchanged), registered in `pages/aboutConfigPanels.ts`. `pages/about.tsx` now resolves this new scope instead of `AbstractPostDock`'s own generic `ABSTRACT_POST_DOCK_LAYOUT_SCOPE_ID` — the exact bug class Step 1 already fixed for palette, confirmed via this same audit to have been live for layout too (and already flagged as a known-unfixed sibling defect in `about.config.ts`'s own pre-existing doc comment on `ABOUT_DEFAULT_DOCK_PALETTE_CONFIG`).
- Verified: `tsc --noEmit` clean; `vitest run components/Panel pages` shows the same 3 pre-existing, unrelated color-derivation failures (no `pages/` test suite exists, no regressions in `components/Panel`); dev server smoke-tested — both `/about` and `/abstract` render 200 with no runtime errors.
- Not independently re-verified in a browser: that `/about`'s panel now shows "About dock layout"/"About dock palette" as distinct titles and that using each scope's own COPY button targets `pages/about.config.ts` rather than `experiences/abstract/components/AbstractPostDock/config/registered.ts` — this session has no browser-automation tool, so this is the one remaining live check per Step 4.
