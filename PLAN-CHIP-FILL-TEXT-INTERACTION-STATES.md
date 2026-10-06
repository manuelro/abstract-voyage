# PLAN — Chip fill-text contrast, hover/press states, and closing journal.tsx's GlobalTypography wiring gap

## Context

Continuation of `PLAN-CHIP-COLUMN-INK-DERIVATION.md` (the unselected/border
look's ink-matching fix — unchanged, still pending its own separate
implementation). This document covers three more decisions made across
several planning turns, now consolidated into one file per this repo's own
plan-handoff convention:

1. The filled/selected look needs its own text color auto-picked light or
   dark against whatever the fill background actually is (not a static
   authored literal).
2. Hover and press need their own color modulation.
3. **New this turn**: closing a real, pre-existing wiring gap in
   `pages/journal.tsx` so the contrast parameters behind (1) come from the
   same truly-global, already-centralized config every other
   `PolymorphicLayout` page reads, instead of a redundant chip-local field.

Scope: `components/Chip.tsx` (→ `components/Chip/Chip.tsx` +
`components/Chip/config/*`), `pages/journal.tsx`, `components/GlobalTypography.config.ts`
(read-only reference — no shape change needed, see Part A). `pages/abstract.tsx`
needs no changes; it is already correctly wired and remains the reference
implementation.

## Part A — `GlobalTypography.config.ts` is already a truly centralized, shared config. `journal.tsx` just isn't plugged into it.

This needed verifying, not inventing. Three pieces already exist and already
work together, exactly the "stop duplicating per-page state for one global
source of truth" pattern the referenced commits established:

1. **`SharedDesignConfigProvider`** (`components/SharedDesignConfigProvider.tsx`,
   mounted once in `pages/_app.tsx`) — one React Context holding
   `globalTypographyConfig`/`setGlobalTypographyConfig` as one of several
   genuinely cross-page scopes (alongside `pageSurfaceConfig`, `ctaButtonConfig`,
   etc.). Its own doc comment states the exact problem this solves: "every
   page... started from the same *default values*, but tuning one page's
   panel never reached any other page."
2. **`GLOBAL_TYPOGRAPHY_APPEARANCE_PANEL`** (`components/GlobalTypography.panel.ts`)
   — the real, already-built config-panel scope (`minContrastRatio`,
   `toleranceRatio`, `bodyToleranceRatio`, `titleOpacity`, `bodyOpacity`,
   `highlightOpacity`, `headingFontFamily`), `copy: { updateStrategy:
   'replace_scope', completeScope: true }`.
3. **`useAbstractDesignConfigBindings(keys)`**
   (`experiences/abstract/hooks/useAbstractDesignConfigBindings.ts`) — the
   shared binding-builder every cross-page scope goes through, keyed by
   `ABSTRACT_DESIGN_CONFIG_BINDING_KEYS_BY_PAGE[page]`. `'globalTypography'`
   is one of the keys `/abstract` lists (line 45); `/about`, `/contact`,
   `/posts/[slug]` each list their own subset and merge the result with
   their own page-local bindings via `[...sharedConfigBindings,
   ...localConfigBindings]` (exact precedent: `pages/about.tsx:1398-1399,
   1463-1466`).

**Confirmed via `useAbstractDesignConfigBindings` import grep: `pages/abstract.tsx`,
`pages/about.tsx`, `pages/contact.tsx`, `pages/posts/[slug].tsx` all call it.
`pages/journal.tsx` does not.** Concretely, `journal.tsx`:

- Imports `DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG` — the static default, not the
  live value — directly (`pages/journal.tsx:31`).
- Feeds that static literal into both
  `resolvePolymorphicNarrowColumnTypography`/`resolvePolymorphicWideColumnTypography`
  calls (`pages/journal.tsx:219, 222`).
- Only destructures `pageSurfaceConfig, panelShellConfig` from
  `useSharedDesignConfig()` (`pages/journal.tsx:109`) — never
  `globalTypographyConfig`/`setGlobalTypographyConfig`.
- Never calls `useAbstractDesignConfigBindings` at all, so its own "JOURNAL
  SETTINGS" panel has no "Global typography" scope to edit, and never will
  until this is wired.

**Real-world consequence, independent of the Chip work:** an operator who
tunes "Global typography" from `/abstract` (or `/about`/`/contact`/`/posts`)
today sees zero effect on `/journal`'s narrow/wide column ink — it's frozen
at the hardcoded default. This is a genuine, standing bug this plan also
fixes as a side effect.

### Fix

1. Add a `journal` entry to `ABSTRACT_DESIGN_CONFIG_BINDING_KEYS_BY_PAGE`
   (`experiences/abstract/hooks/useAbstractDesignConfigBindings.ts:40-54`)
   with `['globalTypography']`. Scoped intentionally — `journal.tsx` already
   reads `siteHeaderConfig`/`wordmarkConfig` through the separate
   `useAbstractDesignConfig()` context and `pageSurfaceConfig` through
   `useSharedDesignConfig()` directly; re-auditing those is out of scope
   here, not a known gap.
2. In `pages/journal.tsx`: call
   `useAbstractDesignConfigBindings(ABSTRACT_DESIGN_CONFIG_BINDING_KEYS_BY_PAGE.journal)`,
   merge its result with journal's existing page-local `bindings` the same
   way `about.tsx` does (`[...sharedConfigBindings, ...localConfigBindings]`).
3. Destructure `globalTypographyConfig, setGlobalTypographyConfig` from the
   existing `useSharedDesignConfig()` call at `pages/journal.tsx:109` (both,
   not value-only — a "truly global" scope should be editable from any page
   that uses it, not read-only on every page but `/abstract`).
4. Replace both literal `DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG` arguments
   (`pages/journal.tsx:219, 222`) with the live `globalTypographyConfig`.
5. Keep the `DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG` import only for the page's own
   reset handler — add `setGlobalTypographyConfig({ ...DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG })`
   there, matching `pages/abstract.tsx:3289`'s own reset line exactly.

## Part B — Chip's filled look: text color always auto-picked, never authored

Decisions already made in prior turns (recapped for one coherent record):

- **Remove `textColor` as a `ChipAppearanceConfig` field entirely.** Whenever
  there's a fill background — `manual` mode's literal `backgroundColor` or
  `deriveFromBackground` mode's offset-derived one — its text is always
  `resolveContrastAwareTextColor(fillBackgroundColor, minContrastRatio, 0,
  { toleranceRatio })`, picking light or dark from the real, computed
  contrast against that exact background. One code path for both color
  modes (previously duplicated).
- **Reuse `lightInkTolerance`**, don't add a second tolerance field — it
  already feeds `resolveContrastAwareTextColor`'s own `toleranceRatio`
  parameter for the unselected-ink derivation; the fill-text pick becomes a
  second consumer of the same field.
- **`minContrastRatio` stays on `ChipAppearanceConfig`** as the shared
  component's own generic, standalone default (needed for any consumer with
  no `GlobalTypographyConfig` to read from) — **but on `journal.tsx`
  specifically, bypass it.** Per Part A, journal now has a live
  `globalTypographyConfig` in scope; its own `resolvedChipAppearance`
  computation (already page-owned and bypassing `resolveChipAppearance`'s
  derive branch, per `PLAN-CHIP-COLUMN-INK-DERIVATION.md`) should pass
  `globalTypographyConfig.minContrastRatio` and `globalTypographyConfig.toleranceRatio`
  directly into the fill-text contrast search, not
  `chipAppearanceConfig.minContrastRatio`/`.lightInkTolerance`. This is the
  "divergence" flagged two turns ago, now closed: the chip's own fields
  remain a legitimate fallback for a consumer with no shared typography
  config; `journal.tsx` has one, so it uses it.
  - **`toleranceRatio` over `bodyToleranceRatio`, specifically**:
    `GlobalTypographyConfig`'s two tolerance fields are calibrated for two
    different render-opacity situations — `bodyToleranceRatio` is wider
    because body text renders diluted (`bodyOpacity: 0.65` by default,
    costing real contrast headroom); `toleranceRatio` is for near-opaque
    text (title/highlight, rendered close to full opacity). A chip's filled-
    look text renders fully opaque on a solid, non-transparent fill — the
    near-opaque case, not the diluted one — so `toleranceRatio` is the
    correct analogue, not `bodyToleranceRatio`. Flagging this as a judgment
    call, not a certainty, since it's a new cross-reading of an existing
    config rather than something already precedented elsewhere.

## Part C — Hover and press

Also already decided:

- `active` keeps meaning "selected" (drives filled-vs-border) — operator
  confirmed reusing the word for both the prop and the unrelated CSS
  `:active` pseudo-class is fine, since one's a React prop and the other a
  browser pseudo-class with no code-level contact.
- New `ChipAppearanceConfig` fields: `hoverSurfaceOffset`, `pressSurfaceOffset`
  — plain lightness-shift offsets, same `-1..1` convention and same
  `deriveSurfaceColor` primitive `activeSurfaceOffset` already uses. No
  saturation/opacity modulation on these — that pair
  (`darkInkSaturation`/`darkInkOpacityMultiplier`) is specifically for
  deriving a tinted ink *from a raw background*, not for nudging an
  already-resolved color on hover/press.
- **One shared adjustment for both looks** (operator-confirmed): the offset
  applies to whichever color currently carries that look's visual weight —
  the fill background when selected, the ink (border+text) when unselected.
  When the fill background shifts, its text is re-derived through Part B's
  same auto-pick against the shifted background, so a hovered/pressed filled
  chip stays readable, not just the resting state.
- **Mechanism (engineering choice, not a design decision)**: real CSS
  `:hover`/`:active` pseudo-classes, driven by CSS custom properties Chip
  sets inline per render (idle/hover/press background + text + border,
  precomputed once) — zero re-renders, works for touch via `:active`
  natively, consistent with this codebase's existing "resolve once, render
  via inline style/CSS var" pattern (e.g. `--article-card-topic-color` in
  `components/ArticleCard.tsx`).

## Part D — Net config-shape changes

`ChipAppearanceConfig` (`components/Chip/config/appearance.ts`):

- **Remove**: `textColor`.
- **Add**: `minContrastRatio: number` (generic standalone fallback only —
  `journal.tsx` overrides this path per Part B), `hoverSurfaceOffset: number`,
  `pressSurfaceOffset: number`.
- **Unchanged**: `colorMode`, `inkColor`, `backgroundColor`,
  `darkInkSaturation`, `darkInkOpacityMultiplier`, `lightInkTolerance`
  (now dual-purpose, see Part B), `activeSurfaceOffset`, `borderWidth`.

`ResolvedChipAppearance` (`components/Chip/config/resolveChipAppearance.ts`)
gains hover/press variants alongside the existing idle ones (shape TBD at
implementation time — e.g. `{ idle, hover, press }` each holding the same
`{ borderColor, textColor, fillBackgroundColor, fillTextColor }` shape, or an
equivalent flattened form — not fixed yet, deliberately left open since it's
an implementation detail, not a design decision).

`pages/journal.tsx` gains: the `journal` binding-key entry (Part A), a live
`globalTypographyConfig`/`setGlobalTypographyConfig` pair, and its own
`resolvedChipAppearance` computation reading `globalTypographyConfig.minContrastRatio`/
`.toleranceRatio` instead of `chipAppearanceConfig`'s own fields for the
fill-text pick specifically (the hover/press offsets and `backgroundColor`/
`inkColor`/`activeSurfaceOffset` still come from `chipAppearanceConfig` as
today).

## Still not implemented — this is a plan only, per the task's own instruction.
