# PLAN — /abstract text-color consistency (header wordmark / editorial hero / timeline)

## Context

Operator-reported (2026-09-04, screenshot evidence): on `/abstract`, the header
wordmark, the editorial hero, and the timeline render text in a mixed set of
light/dark colors that don't visually agree, even where they sit on what looks
like one continuous background. Root-caused to two independent, compounding
issues in the existing `resolveContrastAwareTextColor` (`helpers/
surfaceColorDerivation.ts:114-169`) contrast-derivation system:

1. **Wrong/divergent background reference** — the three regions don't always
   get the *same* background color fed into their own independent contrast
   calls, even when they're visually in the same place (see "Verified repo
   facts" below).
2. **Tie-break instability** — even where the reference *is* identical, the
   algorithm's two-sided binary search (try darkening, try lightening, keep
   whichever passing candidate is numerically closer to the background's own
   lightness) is a near-50/50 coin flip for mid-tone backgrounds. Live-
   verified: at the desktop tier, header wordmark and hero headline received
   the literal same background color and still resolved to opposite ends
   (`rgb(2,2,3)` vs `rgb(253,252,253)`) — measured contrast against that
   background was 4.56:1 (black) vs 4.60:1 (white), a 0.04 margin.

Scope: `pages/abstract.tsx` and the shared helpers it depends on
(`helpers/surfaceColorDerivation.ts`, `helpers/textEmphasis.tsx`). Three
components are the test bed: `experiences/abstract/components/SiteHeader.tsx`
(wordmark), `experiences/abstract/components/AbstractEditorialHero.tsx`
(headline/paragraph/emphasis/links), `experiences/about/components/
AboutTimeline.tsx` (reused verbatim by `/abstract` via `AbstractTimeline.panel.ts`).

## Already shipped this session (do not redo)

- `PolymorphicLayout.pageConfigs.ts`: `narrowColumnClearsFloatingHeaderLg` set
  to `false` in `ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG` — was silently flooring
  `narrowColumnContentPaddingTopLg` via an inline `max()` style override.
  Verified live, unrelated to the color work below.
- CoverFlow neighbor-card color fix (`pages/abstract.tsx`
  `renderCoverFlowItem`): darkening step formula changed from
  `distanceFromActive * step` to `Math.max(0, distanceFromActive - 1) * step`
  so the immediate neighbor never double-darkens; `cardAppearanceConfig`'s
  `neighborFlatFillOpacity`/`neighborFlatFillToneOffset` overridden to `0`/`0`
  for this page (was defaulting to a broken combo that made the flat-fill
  color collapse to the neighbor's *text* color, not its background).
  Verified live, unrelated to the color work below.

## Verified repo facts (do not re-derive)

- `helpers/surfaceColorDerivation.ts:114-169` —
  `resolveContrastAwareTextColor(backgroundColor, minContrastRatio, offset)`.
  Provably meets `minContrastRatio` against *its own* `backgroundColor`
  argument (binary search both directions, line 132 fast-path, lines 134-163
  two-sided tie-break, lines 165-168 physically-impossible fallback to pure
  black/white). The guarantee is real but scoped to "the input you gave it,"
  and the tie-break (line 156-161, `Math.abs(a - preferredL)` then
  `Math.abs(a - l)`) is what's unstable near 50/50 backgrounds.
- **Wordmark** — `SiteHeader.tsx:497-505` `resolvedLogoStops` →
  `resolveSiteHeaderLogoStops(effectiveWordmarkConfig, pageSurfaceConfig.color,
  physicalLeftColumnColor ?? pageSurfaceConfig.color, ...)`. Reference =
  `physicalLeftColumnColor` prop. `WordmarkConfig.colorMode: 'column'`
  (default), `columnTextMinContrast: 4.5`, `surfaceOffset: 0`
  (`experiences/abstract/components/SiteHeader/config/wordmark.ts:119,121-122`).
  - Split-column call site (`pages/abstract.tsx:4083`, live default
    presentation mode): `physicalLeftColumnColor={colors.actualLeftSegmentColor}`.
  - `actualLeftSegmentColor` (`PolymorphicLayout.tsx:266-270`): **not** the
    raw column color — the header split-band's own resolved color
    (`splitBandLeftMode`/`splitBandLeftCustomColor`, independently tiered:
    `syncWithColumnBelow` at base/Lg, `'custom'` fixed hex `#d1d1e6` at Wide),
    falling back to `physicalLeftColumnColor` (= `narrowColumnColor` here,
    since `wideColumnSide: 'right'`) only while the band is `'transparent'`.
  - Legacy/classic presentation branch (`abstract.tsx:4070-4079`, inactive by
    default): passes **no** `physicalLeftColumnColor` → silently falls back
    to flat `pageSurfaceConfig.color`.
- **Hero** — `AbstractEditorialHero.tsx:128,136-144` →
  `resolveContrastAwareTextColor(columnBackgroundColor ?? surfaceColor,
  paragraphMinContrast, paragraphSurfaceOffset)`. `paragraphColorMode:
  'column'`, `paragraphMinContrast: 6`; headline's `copyColorMode: 'column'`,
  `copyMinContrast: 4.5` (`headlineFillMode: 'solid'` required for the
  headline to actually use `copyColor` instead of the shadow/surface look).
  - Split-column call site (`abstract.tsx:4587`):
    `columnBackgroundColor={colors.narrowColumnColor}` — the **raw** narrow
    column color, no split-band indirection. Diverges from the wordmark's own
    reference at the Wide (tablet) tier specifically (see above).
  - Legacy branch (`abstract.tsx:4084-4114`): no `columnBackgroundColor` prop
    → falls back to `surfaceColor={pageSurfaceConfig.color}` (same fallback
    the header's legacy branch lands on — the one place they happen to agree).
- **Timeline** — `AboutTimeline.tsx`, `resolveContrastAwareTextColor
  (columnBackgroundColor, minContrast, 0)` per sub-element.
  `descriptionMinContrast: 4.5` (lead-in line), `rowTitleMinContrastActive:
  5.1` / `rowTitleMinContrastInactive: 4`, `rowDescriptionMinContrastActive:
  5` / `rowDescriptionMinContrastInactive: 4` — five different targets on one
  component.
  - Desktop-tier call site (`abstract.tsx:4598`):
    `columnBackgroundColor={colors.narrowColumnColor}` — matches the hero.
  - **Mobile-tier call site** (`abstract.tsx:4533`, inside
    `MobilePinnedArticleSection`, live-confirmed as what's mounted at the
    screenshot's viewport): `columnBackgroundColor={colors.wideColumnColor}`
    — the **opposite** column's color, despite visually sitting in the same
    stacked-narrow-column flow as the hero above it. Sharpest confirmed bug.
- Live-measured background/text pairs, current config (drifts as the page's
  own config is edited — re-measure before trusting exact hex values, the
  *code paths* above are the stable facts):
  - 390px viewport: narrow row bg `rgb(203,203,225)` (relative luminance
    ≈0.61 — max reachable contrast by lightening is only ≈1.6:1, physically
    below every target in play, so dark wins unambiguously here, not a tie).
    Wide row bg `rgb(20,20,47)`.
  - 1440px viewport: narrow row bg `rgb(117,115,135)` (relative luminance
    ≈0.178 — true mid-tone; black text 4.56:1, white text 4.60:1, a 0.04
    margin). Header wordmark resolved black, hero headline resolved white,
    against what should be the same synced value — the tie-break instability
    caught in the act.
- `helpers/textEmphasis.tsx:42-85` `renderEmphasisText(text, dimOpacity,
  emphasisOpacity, emphasisClassName?)` — shared by `AbstractEditorialHero`,
  `AbstractPostDock/components/View.tsx`, `AboutMobileAccordionItem.tsx`,
  `pages/contact.tsx`. Already fixed this session to apply
  `emphasisClassName` (font-weight) to `[text](href)` links too, not just
  `**word**` runs — links and emphasis words now share weight, not yet color.
- `components/GlobalTypography.config.ts` exists today (font-family only —
  `headingFontFamily`, referenced by `AbstractEditorialHero.config.ts`'s
  `headlineFontFamily: 'inherit'` fallback). Natural home to extend with a
  color-role section rather than a disconnected new file.
- `experiences/abstract/components/Card/config/appearance.ts` /
  `AboutTimeline.config.ts` / `AbstractEditorialHero.config.ts` all already
  use the `style={{opacity: X}}` pattern for text emphasis/state — the
  ratio-token design below is a centralization of a pattern already present
  three times independently, not a new mechanism.

## Fix plan — three parts, in dependency order

### Part A — Deterministic/stable contrast resolver (new opt-in mode)

Add an opt-in mode to `resolveContrastAwareTextColor`
(`helpers/surfaceColorDerivation.ts`) — **default off, zero behavior change**
for every existing caller (this function is shared by `CtaButton.tsx` and
others outside this page's scope; do not change its default behavior).

Mechanism, replacing the two-sided tie-break with a one-sided deterministic
decision:
1. Decide the side *first*, with a single fixed comparison:
   `preferLight = backgroundRelativeLuminance < DECISION_THRESHOLD`.
   **Decided value: `DECISION_THRESHOLD = 0.2`** (relative luminance, the
   same unit `colord().contrast()` already uses throughout this codebase —
   not HSL lightness, to avoid a second, inconsistent color-space for the
   same decision). Sits inside the empirical 0.18-0.22 crossover measured at
   the 1440px viewport. Same input hex → same side, always, regardless of
   which call site asks — this is a pure function of the background color,
   nothing else.
2. No real hysteresis/deadband needed: since this is a stateless pure
   function (no "previous decision" to stay sticky against — every call is
   independent), a fixed threshold is already fully deterministic. Keep only
   a token floating-point epsilon (`~0.005` relative luminance) as jitter
   insurance, not a meaningful perceptual zone — the earlier "toleranceL
   deadband" framing overstated what's actually needed here.
3. Once the side is decided, binary-search *only that direction* for the
   nearest lightness clearing `minContrastRatio` (reuses ~80% of the existing
   search logic, just without the cross-side comparison).
4. **Opacity-aware target (closes the Gap 1 readiness finding):** Part C
   renders roles at different opacities over the same background — a color
   that passes `minContrastRatio` at full opacity does not pass it once
   alpha-blended toward the background at a lower opacity. The search must
   therefore target *"ink blended at `worstCaseOpacity` over the background
   clears `minContrastRatio`,"* not *"ink itself clears it."* `resolveContrast
   AwareTextColor` gains an optional `targetOpacity` (default `1`, i.e.
   today's exact behavior) that folds an alpha-blend step into the
   `contrastAt()` check before measuring. Part C calls this with
   `targetOpacity: bodyOpacity` (the lowest opacity in its role set) when
   resolving the shared `ink` — `title`/`highlight`, rendered at less
   dilution, then clear the target with margin automatically. No per-role
   separate searches needed.
5. If the winning side can't reach the full (opacity-adjusted) target, allow
   a small **capped** shortfall (down to `minContrastRatio - toleranceRatio`,
   **`toleranceRatio = 0.3`**) before falling back to the pure black/white
   endpoint *on that same side* — never cross sides to chase a better ratio,
   that reintroduces the instability. This is the explicit, bounded AA
   deviation the operator asked for — document which configs land in the
   shortfall band so it's auditable, not silent.

Proposed signature addition (additive, no breaking change):
```ts
resolveContrastAwareTextColor(
  backgroundColor: string,
  minContrastRatio: number,
  offset: number = 0,
  options?: { stable?: boolean; toleranceRatio?: number; targetOpacity?: number },
): string
```

### Part B — Unified region background reference

A "region" = a contiguous area with one true background color. On this page:
narrow column, wide column, header bar (which may or may not coincide with a
column's color depending on split-band config). Fix, in order of severity:

1. **RETRACTED (2026-09-04) — "mobile timeline reference bug".** Original
   audit claimed `abstract.tsx:4533`'s `columnBackgroundColor={colors.
   wideColumnColor}` was wrong because this content "visually sits in the
   same stacked-narrow-column flow as the hero above it" — that premise was
   never DOM-verified, only inferred from a screenshot. Verified now, live,
   via full ancestor-chain background inspection at the 390px viewport: the
   timeline row's true nearest painted background is `.styles_stickyViewport`
   / `.styles_outer` at `rgb(20,20,47)` — which **is** `colors.
   wideColumnColor`. `MobilePinnedArticleSection` (which hosts this
   `AboutTimeline` instance) is a genuinely separate, differently-colored
   panel stacked below the hero, not the same visual surface — the
   reference was already correct. The original screenshot's "looks like one
   continuous background" was very likely stale relative to the live config
   at the time (this session's own config has drifted repeatedly from
   concurrent edits — see the file's own "confirm live" discipline
   elsewhere). **No fix needed here — do not apply the originally-planned
   change.**
2. **Header vs hero reference divergence — revised decision (2026-09-04,
   superseding the earlier "mechanical unification" call).** Forcing the
   hero to read the header's own `actualLeftSegmentColor` is only correct
   while the split-band is synced/transparent — if an operator ever sets the
   band to a genuinely distinct custom color, that's two different painted
   regions, and forcing them to share a reference would reintroduce this
   exact bug in the opposite direction (hero deriving text color against a
   background it isn't actually sitting on). The confirmed defect is
   narrower than originally scoped: `splitBandLeftModeWide: 'custom'`
   (fixed hex `#d1d1e6`) is the only tier that doesn't match its siblings
   (`splitBandLeftMode`/`splitBandLeftModeLg` are both `'syncWithColumnBelow'`)
   — an inconsistent tier, not a structural code problem. **Fix: change
   `splitBandLeftModeWide` to `'syncWithColumnBelow'`** in
   `ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG` (`PolymorphicLayout.pageConfigs.ts`).
   Header keeps `actualLeftSegmentColor`, hero keeps `narrowColumnColor` —
   both remain correct for their own real background unconditionally, and
   naturally agree wherever the operator has the tiers synced, with no new
   shared-color abstraction and no risk to the legitimate distinct-band case.
3. **RETRACTED (2026-09-04) — "legacy/classic branch fallback".** Verified
   live before touching it (same discipline as item 1's retraction, same
   session): classic mode (`abstract.tsx:3932-3946`) renders a single
   flowing `<main>` with one `background`, no split-column grid at all — no
   "narrow"/"wide column" concept exists in this branch for the header or
   hero to diverge on. `pageSurfaceConfig.color` isn't a fallback standing in
   for a missing column reference, it's the only background this mode has,
   and both `SiteHeader` and `AbstractEditorialHero` already consistently
   use it in that branch (the audit's own original note already said as
   much: "the one place they happen to agree"). **No fix needed — nothing to
   pass through.**

### Part C — Typography color-role token system

One resolved **ink** color per region (via Part A's stable resolver + Part
B's unified reference), four roles derived from it by **opacity ratio**, not
independently re-derived colors:

| Role | Opacity | `toleranceRatio` | Consumers |
|---|---|---|---|
| `title` | **1.0** | 0.3 | header wordmark, hero headline, (timeline has no separate "title" role — see mapping below) |
| `body` | **0.85** (revised from the originally-seeded 0.7 — see verification note below) | **0.7** (role-specific, wider than title/highlight) | hero paragraph, timeline lead-in description, timeline row title/description when idle |
| `highlight` | **0.95** | 0.3 | hero `**word**` emphasis, hero inline links (color unified with emphasis, not just weight — extends this session's weight-only fix), timeline row title/description when active/hover |

**Verification note (2026-09-04) — why `body` moved from 0.7 to 0.85, and why
its `toleranceRatio` is wider than the other two roles.** Ran Part A's new
resolver against the three real backgrounds measured in this audit. Two
(`#cbcbe1`, the mobile narrow-column color; `#141230`, the dark navy wide-
column color) clear 4.5:1 comfortably at 0.85 opacity (4.53:1 both). The
third — `#757387`, the desktop-tier mid-tone sitting almost exactly at
Part A's own decision threshold — has almost no contrast headroom to begin
with (both black and white barely clear ~4.5:1 *at full opacity*), so any
opacity dilution costs it disproportionately: at 0.7 opacity it only reaches
3.15:1; even at 0.95 (indistinguishable from `highlight`, defeating the
point of a separate `body` role) it only just reaches 4.20:1. There is no
opacity value that both (a) reads as visibly de-emphasized body text and (b)
clears a 4.2-4.5:1 floor on this specific near-tie-point background — the
same background class that caused the original tie-break bug has the least
room to spare for opacity-based de-emphasis, full stop, this is a physical
limit of alpha-compositing, not a resolver shortcoming.
Resolution: keep `body` at a real, visibly-dimmer 0.85 (clears AA on 2 of 3
tested real backgrounds, comes within 0.67 of target on the third), and give
`body` specifically a wider `toleranceRatio: 0.7` (vs `0.3` for `title`/
`highlight`, which don't have this dilution problem) — worst-case measured
shortfall is 3.83:1 (at 0.85 opacity against `#757387`), which the 0.7
tolerance covers explicitly (accepts down to 3.8:1) rather than silently
falling through to the raw endpoint. This is a real, bounded, *auditable*
accessibility trade-off, narrower in scope than a flat page-wide tolerance —
it only bites near-tie-point backgrounds specifically, not typical ones.

**Decided (2026-09-04): flat values, no per-breakpoint tiering.** One
`titleOpacity`/`bodyOpacity`/`highlightOpacity` each, same at every
breakpoint — a deliberate departure from this codebase's usual 3-tier
(base/Wide/Lg) convention, to keep the new config surface small. Revisit only
if a real screen shows a role needs to read differently at a different size.

New config: extend `components/GlobalTypography.config.ts` with a color-role
section — `titleOpacity`/`bodyOpacity`/`highlightOpacity`, a shared
`minContrastRatio`, and **per-role** `toleranceRatio` (not one shared value —
see the verification note above for why `body` genuinely needs a wider one
than `title`/`highlight`) — plus a resolver. `ink` is calibrated once,
against `body`'s own opacity+tolerance (the role with the least headroom):
```ts
resolveTypographyColors(backgroundColor: string, config: GlobalTypographyConfig)
  => { ink: string; titleColor: string; bodyColor: string; highlightColor: string }
```
New panel group: "Typography — Color" inside the existing Global Typography
scope, not a per-component duplicate.

**Design decision made (not blocking): hybrid, not full rip-out.** Keep
existing per-component fields (`emphasisWordOpacity`, `rowTitleOpacityActive`,
`paragraphMinContrast`, etc.) as optional overrides, but change their
*defaults* to read from the new global tokens instead of a hardcoded literal.
Same pattern already used for the CoverFlow `cardAppearanceConfig` override
this session — centralizes the source of truth without deleting the escape
hatch, and doesn't break any other page/component that hasn't opted in.

**Region → role mapping to implement:**

| Region | Element | Role |
|---|---|---|
| Header | Wordmark | `title` |
| Hero | Headline | `title` |
| Hero | Paragraph | `body` |
| Hero | `**word**` emphasis | `highlight` |
| Hero | Inline links | `highlight` (color, not just weight/opacity) |
| Timeline | Row title/description, active/hover | `highlight` |
| Timeline | Row title/description, idle | `body` |
| Timeline | Lead-in description | `body` |

Wiring touches: `SiteHeader.tsx`, `AbstractEditorialHero.tsx`,
`AboutTimeline.tsx` (their own `resolveContrastAwareTextColor` calls swap for
the shared resolver's output), `helpers/textEmphasis.tsx` (link color, not
just weight, sourced from `highlightColor`) — **plus** each component's own
`.config.ts`/`.panel.ts` pair (`AbstractEditorialHero.config.ts`,
`AboutTimeline.config.ts`, `experiences/abstract/components/SiteHeader/
config/wordmark.ts` and its panel) for the hybrid default-from-global wiring
(§ hybrid decision above) — omitted from the original wiring list, added here.

## Status

- Readiness review complete (2026-09-04) — all four gaps found during
  critical re-read resolved, see Decisions log Round 2 below. Plan is fully
  spec'd: concrete numbers, no open two-sided-option items, no known
  correctness gaps remaining.
- **Part A: done.** `resolveContrastAwareTextColor` gained the `options`
  param (`stable`/`toleranceRatio`/`targetOpacity`), default behavior
  unchanged for every existing caller. Verified live against real
  `/abstract` backgrounds: determinism confirmed, opacity-aware compensation
  confirmed, and this verification pass is what surfaced the `bodyOpacity`
  revision (0.7 → 0.85) and per-role `toleranceRatio` split recorded in
  Part C above. `npx tsc --noEmit` clean.
- **Part B: done, with two of its three planned items retracted after live
  verification** (`PolymorphicLayout.pageConfigs.ts`:
  `splitBandLeftModeWide` → `'syncWithColumnBelow'`, the one genuine bug,
  fixed and confirmed live — header split-band and narrow column both now
  resolve to `rgb(203,203,225)` at the tablet viewport). Items 1 and 3 were
  both based on inferring the true rendered background from a screenshot
  rather than the DOM — checked properly before editing anything, found both
  premises false (the mobile timeline really does sit on its own, correctly-
  referenced dark panel; classic mode has no column concept to diverge on at
  all), and retracted rather than "fixing" things that already worked.
  `npx tsc --noEmit` clean.
- **Part C: done.** `components/GlobalTypography.config.ts` extended with
  `titleOpacity`/`bodyOpacity`/`highlightOpacity`/`minContrastRatio`/
  `toleranceRatio`/`bodyToleranceRatio` + `resolveTypographyColors()`; panel
  group "Typography — Color" added. `SiteHeader.tsx`/`AbstractEditorialHero
  .tsx`/`AboutTimeline.tsx` each gained additive `*ColorOverride`/
  `*OpacityOverride` props (undefined for every page/caller not opting in —
  `/about`'s own AboutTimeline usage untouched). `helpers/textEmphasis.tsx`
  gained an `emphasisColorOverride` param so links share color with emphasis
  words, not just weight. `pages/abstract.tsx` resolves one
  `resolveTypographyColors()` call per real region (header segment, narrow
  column, wide column) and threads the results into all four call sites
  (SiteHeader, AbstractEditorialHero, both AboutTimeline instances).

  **Bug found and fixed during live verification, not caught by typecheck:**
  the first implementation had `resolveTypographyColors()` return each
  role's color as an rgba string with opacity baked into the alpha channel
  (`deriveTransparentTint`). This broke two independent ways in practice —
  neither visible until an actual screenshot was compared against the
  automated color reads: (1) SiteHeader's SvgStop pipeline assumes a bare
  hex and prepends `'#'`, so `titleColorOverride` produced an invalid
  `#rgba(...)` `stop-color` the SVG renderer silently dropped to black —
  the wordmark rendered dark while every automated `getComputedStyle` read
  (on the gradient *reference*, not the dereferenced stop) showed the
  correct value, masking the bug for several verification passes; (2)
  AbstractEditorialHero/AboutTimelineRow already apply role opacity as a
  separate CSS `opacity` style alongside `color` — the baked-in alpha would
  have compounded with that separate opacity, and a leftover line in
  `textEmphasis.tsx` (written against the old baked-alpha design) hardcoded
  emphasis-run opacity to `1` whenever a color override was present,
  silently discarding `highlightOpacity` entirely.
  Fixed by returning a flat, opacity-free ink hex for all three color
  fields and adding real `bodyOpacityOverride`/`highlightOpacityOverride`
  props so each component applies opacity through its own existing
  mechanism instead. Re-verified live after the fix: SVG `stop-color` is a
  valid hex matching the headline exactly; timeline active/idle rows and
  hero paragraph/emphasis all show the correct, distinct opacities (0.95 /
  0.85 / 0.85 / 0.95) over the identical ink; full-page screenshots at both
  390px and 1440px confirm the fix visually, not just numerically.
  Global Typography panel confirmed live-reactive (editing `bodyOpacity`
  immediately re-resolves the shared ink and repaints the hero paragraph).
  `npx tsc --noEmit` clean throughout.

All three parts of PLAN-ABSTRACT-TYPOGRAPHY-COLOR-UNIFICATION.md are now
implemented and live-verified.

## Decisions log

**Round 1 (operator-confirmed 2026-09-04, via dynamic UI):**
1. Part B.2 — mechanical unification (superseded, see Round 2).
2. Part A tuning — proceed with proposed starting points, tune visually
   once wired.
3. Part C tiering — one flat value per role, no per-breakpoint tiering.

**Round 2 — readiness review (2026-09-04), operator agreed with all
suggested resolutions:**
1. **Gap: opacity dilutes contrast below nominal target.** Resolved —
   `resolveContrastAwareTextColor` gains `targetOpacity`; Part C's `ink`
   search is calibrated against `body`'s opacity (0.7, the lowest in the
   set), so `title`/`highlight` clear the target with margin automatically.
2. **Gap: mechanical unification's edge case.** Resolved — reversed Round
   1's answer. Fix the confirmed root cause instead (`splitBandLeftModeWide`
   → `'syncWithColumnBelow'`, matching its sibling tiers) rather than forcing
   hero and header to share a reference unconditionally. Each region keeps
   deriving from its own real background always.
3. **Gap: concrete numbers.** Resolved — `DECISION_THRESHOLD: 0.2`,
   floating-point epsilon only (no real deadband/hysteresis needed — pure
   function, no state to stay sticky against), `toleranceRatio: 0.3`,
   `titleOpacity: 1.0`, `bodyOpacity: 0.7`, `highlightOpacity: 0.95`.
4. **Gap: incomplete touched-file list.** Resolved — added each component's
   `.config.ts`/`.panel.ts` pair to Part C's wiring list.

Nothing blocking implementation remains. Next step: build Part A, then B,
then C, in that order (B and C both depend on A's stable resolver existing).
