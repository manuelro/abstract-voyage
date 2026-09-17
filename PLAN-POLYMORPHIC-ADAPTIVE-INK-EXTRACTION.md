# Polymorphic Adaptive-Ink Extraction Plan

## Status

- Planning only — no implementation yet.
- Scope of the *implementation* this plan describes is broader than
  `PolymorphicLayout.pageConfigs.ts` (the file this planning task was scoped
  to) — it touches `PolymorphicLayout.config.ts`, a new hook module beside
  `PolymorphicScrollGradientBackground.tsx`, `pages/abstract.tsx`, and
  `SiteFooter.tsx`. Flagged here rather than silently expanded; confirm
  before implementing.

## Objective

`/abstract` today gets two genuinely different things from its scroll
gradient: (1) a **painted background** — fully global already, see
`PLAN-POLYMORPHIC-COLUMN-SCROLL-GRADIENT.md` — and (2) **text ink that
adapts to that background as the user scrolls** (header wordmark, hero
title/body/highlight, timeline rows, footer), which is still hand-rolled
per call site inside `pages/abstract.tsx`. This plan extracts (2) into the
same global, config-driven surface (1) already has, so any page mounting
`<PolymorphicLayout>` gets live scroll-adaptive text ink out of the box,
purely through page-level config — no bespoke page code required.

## Current State (verified by reading the actual code, not inferred)

### Already global — no work needed here

`PolymorphicLayoutConfig` (`PolymorphicLayout.config.ts`) + `PolymorphicScrollGradientBackground.tsx` + `PolymorphicLayout.tsx` already own, fully config-driven, per-tier:

- Column paint: `scrollGradientEnabled(-Wide/-Lg)`, `scrollGradientNarrowColumnEnabled*`, `scrollGradientWideColumnEnabled*`, narrow-column desktop variant (`-VariantEnabledLg`, `-SaturationLg`, `-DarknessLg`)
- Palette recipe: `scrollGradientBaseHue`, `-HueScheme`, `-LightnessMin`, `-ChromaMin`, `-Mode`, `-Stops`, `-Variance`, `-CenterStretch`, `-Seed` (×3 tiers)
- Compositor: `scrollGradientCompositor(-Wide/-Lg)` (`'legacy'`/`'enhanced'`) + enhanced-only shape controls, all with compat defaults (`POLYMORPHIC_LAYOUT_ENHANCED_GRADIENT_COMPAT_DEFAULTS`)
- Dithering: `scrollGradientDitherEnabled/-Amount/-Scale/-Seed` (×3 tiers)
- Ink/contrast basis: `scrollGradientInkColor`, `-DarkInkSaturation`, `-DarkInkOpacityMultiplier`, `-LightInkOnLightBackgroundContrastTolerance`
- Darken schedule: `-ViewportRangeVh`, `-MaxDarken`, `-TauMs`, `-LegibilityTargetRatio`
- Wordmark's own gradient: `wordmarkUsesScrollGradient` + full `wordmarkGradient*` set
- `PolymorphicLayout` props `scrollGradientForceMaxDarken`, `scrollGradientReturnToLight`
- `usePolymorphicLayoutColors()` exposes `scrollGradientActive/-NarrowColumnActive/-WideColumnActive`, `scrollGradientResolved`, `scrollGradientOriginColor`, `narrowColumnGradientReferenceColor`, `wordmarkGradientStops`

Do not re-derive or duplicate any of the above. This plan's implementation phase consumes these as inputs.

### Still page-local (the actual gap)

All of the following live only in `pages/abstract.tsx` (and `SiteFooter.tsx`, `AbstractEditorialHero.tsx`, `AboutTimeline` call sites within that page):

| Logic | Region | Reusable as-is? |
|---|---|---|
| `topHeaderInkOptions` + `useScrollAdaptiveInk` on the header ref | Header wordmark/logo | Mechanism generic, base-color derivation page-specific |
| `shortArticleListInkOptions` + two `useScrollAdaptiveInk` calls (mobile + desktop refs) | Timeline / short article list rows | Mechanism generic, inputs page-typed |
| `narrowColumnAdaptiveInkColor` (`buildScrollAdaptiveInkColor` wrapping `narrowColumnTypography.titleColor`) | Hero title/body/highlight, general narrow-column text | Generic formula, page-typed inputs |
| `mobileArticleListBackgroundAtRest/-Darkened`, `mobileArticleListInkAtRest/-Darkened`, `resolveMobileArticleListInkColor`, the `--mobile-article-list-darken` rAF loop | Mobile article list expand/collapse | **Page-specific** — tied to `MobilePinnedArticleSection`'s own expand state; out of scope for extraction |
| `heroAccordionBaseTextColor` / `accordionItemTextColorOverride` | Hero accordion presentation | **Deeply `/abstract`-specific** — depends on `AbstractEditorialHero`'s reuse of `AboutMobileAccordionItem` internals; out of scope |
| `SiteFooter.tsx`'s own `useScrollAdaptiveInk` call | Footer text/border/wordmark | Mechanism generic — but imports `AbstractFooterConfig` **directly from `pages/abstract.config.ts`**, a pre-existing scope violation (a shared component typed to one page's config) |

### Already-generic primitives (do not rewrite)

- `useScrollAdaptiveInk` (`experiences/abstract/components/useScrollAdaptiveInk.ts`) — page-agnostic today. Takes `baseColor`, `scrollGradientOriginColor`, `scrollGradientMaxDarken`, `viewportRangeVh`, `tauMs`, `returnToLight*`, `forceProgress`, a `ref` — all either primitives or values `usePolymorphicLayoutColors()` already resolves.
- `buildScrollAdaptiveInkColor` / `buildScrollAdaptiveInkStops` — pure functions, already reused by `SiteFooter.tsx`.
- `resolveTypographyColors` (`components/GlobalTypography.config.ts`) — already a shared, non-page-specific resolver.

The genuine gap is not "write new color math." It's: **the tuning knobs for `useScrollAdaptiveInk` are trapped in `AbstractFooterConfig` (a page-owned type), and every call site hand-threads 8+ props from `colors.scrollGradientResolved` instead of a page just flipping a config flag.**

## Design

### Part A — Promote the adaptive-ink schedule into `PolymorphicLayoutConfig`

Move `AbstractFooterConfig`'s pure tuning fields — `adaptiveInkEnabled`, `adaptiveInkMaxAmount`, `adaptiveInkTargetContrastRatio`, `backgroundReturnToLightEnabled`, `backgroundReturnToLightRangeVh`, `backgroundReturnToLightFinalDarken` — onto `PolymorphicLayoutConfig` itself, alongside the existing `scrollGradient*` fields (same naming convention, e.g. `scrollGradientAdaptiveInkEnabled`, `scrollGradientAdaptiveInkMaxAmount`, `scrollGradientAdaptiveInkTargetContrastRatio`). Tier these (base/Wide/Lg) only if a real per-tier need surfaces during migration — default to one flat value first, matching this codebase's stated precedent (`PLAN-ABSTRACT-TYPOGRAPHY-COLOR-UNIFICATION.md`'s Part C: "one flat value per role, no per-breakpoint tiering... revisit only if a real screen shows a role needs to read differently at a different size").

Add these to `POLYMORPHIC_LAYOUT_ENHANCED_GRADIENT_COMPAT_DEFAULTS` (or a sibling compat-defaults constant if they shouldn't be bundled with the enhanced-compositor-only fields) so every existing page config gets a safe, inert-by-default value without per-page edits.

`AbstractFooterConfig` keeps only what's genuinely `/abstract`-specific (footer copy, layout); the adaptive-ink fields get deleted from it once every reader is migrated (Part C).

### Part B — A reusable hook, not a component-owned effect

`PolymorphicLayout` cannot own the refs for header wordmark / hero / timeline / footer — those DOM nodes belong to the page's own child components, not to `PolymorphicLayout`, which only wraps them. So the extraction target is a **hook**, exported alongside `PolymorphicScrollGradientBackground`, e.g.:

```ts
// experiences/abstract/components/usePolymorphicColumnAdaptiveInk.ts
usePolymorphicColumnAdaptiveInk({
  ref,                    // caller-owned, one per DOM subtree
  baseColor,               // caller-resolved (e.g. narrowColumnTypography.titleColor)
  column: 'narrow' | 'wide',
  forceProgress?: number,  // e.g. accordion-expanded forcing
}): string                 // live, scroll-reactive resolved ink
```

Internally it reads `scrollGradientResolved`, `scrollGradientOriginColor`, and the new Part A config fields from `usePolymorphicLayoutColors()`, and calls the existing `useScrollAdaptiveInk` + `buildScrollAdaptiveInkColor` primitives underneath — zero new color math, just centralizing the prop-threading boilerplate every page call site currently repeats by hand.

**Must be a per-call-site hook, not a singleton inside `PolymorphicLayout`** — confirmed landmine: `shortArticleListMobileInkRef`/`shortArticleListDesktopInkRef` exist as two independent instances specifically because `PolymorphicLayout` mounts both narrow- and wide-column content simultaneously (CSS media queries pick which is visible); a single shared ref silently starves whichever DOM subtree loses the ref-assignment race (prior confirmed regression). Any content mounted twice (mobile + desktop variants) needs its own hook call.

### Part C — Migrate `/abstract`'s own call sites

Replace `topHeaderInkOptions`, `shortArticleListInkOptions`, and `narrowColumnAdaptiveInkColor`'s hand-built options objects in `pages/abstract.tsx` with calls to the new hook, reading the now-global config fields instead of `abstractFooterConfig.adaptiveInk*`/`backgroundReturnToLight*`. This is the parity proof: `/abstract` must render pixel-identically before/after.

Fix `SiteFooter.tsx`'s `AbstractFooterConfig` import as part of this pass — swap it for the hook (or for direct `PolymorphicLayoutConfig`-sourced props), removing the shared-component-importing-a-page-type violation instead of leaving it as prior art for the next page that copies this pattern.

Explicitly **not** migrated (stays page-local, by design — see gap table above): `AbstractEditorialHero`'s accordion-branch text-color internals, `MobilePinnedArticleSection`'s own expand-state darken loop, `AbstractMobileArticleListInkConfig`.

### Part D — Not doing this now (flagged, not decided)

The "one unified ink, opacity-only role hierarchy" policy (`narrowColumnTypography`'s title=body=highlight color override while gradient-backed) is a **content-authoring decision**, not a rendering-mechanism gap — recommend leaving it page-local, layered on top of the now-global ink hook, rather than promoting it into `PolymorphicLayoutConfig` as a named mode. Revisit only if a second page wants the identical policy verbatim.

## Landmines (do not relearn these the hard way)

1. **Darken-flash regression pattern.** Any effect whose dependency array includes a frequently-toggled input (`forceMaxDarken`, `forceProgress`) tears down and re-seeds the rAF smoothing state to 0, producing a visible dark→light→dark flash. Both `PolymorphicScrollGradientBackground.tsx` and `useScrollAdaptiveInk.ts` already use the fix (persistent mount-once effect + live-value refs + a separate small effect that only calls a `recomputeNow` ref). The new hook must follow this exact pattern, not a naive `useEffect([...deps])`.
2. **Dual-mount refs, always.** See Part B — one hook call per real DOM subtree, never a shared singleton.
3. **Background/text contrast guarantee is a matched pair** (`PLAN-HERO-SCROLL-CONTRAST-GUARANTEE.md`). The background-side `scrollGradientLegibilityTargetRatio` floor exists specifically so the text-side search (which can only mix toward white, never past it) always has a feasible solution. Don't let this extraction decouple them — the new hook is the text side; it still depends on the background side's floor already being correctly configured.
4. **Config-collision discipline.** `PolymorphicLayout.pageConfigs.ts` already warns (lines 37-52) that `ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG` and `ABOUT_POLYMORPHIC_LAYOUT_CONFIG` share an identical field set, and pasting into the wrong block has happened twice. Promoting more fields onto the shared `PolymorphicLayoutConfig` type makes this collision surface *larger*. Implementation must preserve (not just note) the "confirm `target_symbol` before pasting" discipline.
5. **Opacity-hierarchy regression precedent.** A prior fix note: "reusing `bodyOpacity` for the title was the regression that washed out the wordmark." Any generalized ink API must keep per-role opacity independently configurable even when ink *color* is unified — don't collapse title/body/highlight opacity into one value while generalizing.
6. **`MobilePinnedArticleSection`'s reference to `colors.wideColumnColor` on mobile is intentional, not a bug** (per `PLAN-ABSTRACT-TYPOGRAPHY-COLOR-UNIFICATION.md` Part B.1, previously verified live and retracted as a "fix"). Do not fold this into the extraction as if it were part of the same background.

## Validation Plan

1. `npx tsc --noEmit` clean after each part.
2. Live Playwright screenshot + computed-style diff of `/abstract` at mobile/tablet/desktop, before and after Part C — must be pixel-identical (same colors, same opacity, same scroll-reactive behavior at multiple scroll depths). This is a refactor, not a visual change.
3. Smoke test: enable the new Part A config fields + one `usePolymorphicColumnAdaptiveInk` call on `/about` (or a throwaway test page) with no other `/about`-specific code, to prove the "out of the box, config-only" claim actually holds. Revert the smoke test before shipping unless `/about` is meant to adopt it for real.
4. Run existing polymorphic layout / color-resolution test suites (`PolymorphicLayout.pageConfigs.test.ts` and siblings).

## Explicit Non-Goals

- Not touching the already-global background-painting system (`PLAN-POLYMORPHIC-COLUMN-SCROLL-GRADIENT.md`) — it's done, don't re-open it.
- Not rewriting `useScrollAdaptiveInk`, `buildScrollAdaptiveInkColor`, or `resolveTypographyColors` — they're already generic; this plan only centralizes how they're *wired*.
- Not migrating `AbstractEditorialHero`'s accordion-branch color internals or `MobilePinnedArticleSection`'s expand-state darken loop — genuinely page-specific, stays put.
- Not deciding the "unified ink, opacity-only hierarchy" question for other pages (Part D) — flagged for a future call, not resolved here.
