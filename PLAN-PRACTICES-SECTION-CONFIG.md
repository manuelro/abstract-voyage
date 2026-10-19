# PLAN — Practices section component + config panel

Scope: `pages/wall.tsx`, `experiences/abstract/components/PracticesSection.tsx`
(new, untracked). Objective: give the practices section a real
component-level config panel (columns / gaps / separators), and fix the
near-transparent rendering of the quotes inside it. Plan only — not implemented.

References to study before implementing:
- Tailwind token field system — commit `7796da4`.
- Shared capability propagation + config-update payload plumbing — commit `b782731`.

---

## A. Current state (verified by source read)

`PracticesSection.tsx` exists but has **no config panel of its own**. It is
rendered as the **`children` of the bottom banner's featured `EditorialQuote`**
(`pages/wall.tsx:7381`, inside `<EditorialQuote variant="featured" …>`), and
`EditorialQuote` only renders children for the featured variant
(`EditorialQuote.tsx:214` → `{variant === 'featured' ? children : null}`). That
places the whole practices section **inside the banner's `GradientInkSurface`
`.ink` content layer**, which carries `mix-blend-mode: screen`
(`GradientInkSurface.module.css:26-29`; featured `gradientInkBlendMode: 'screen'`
at `editorialConfig.ts:90`).

Configurable today (borrowed, not section-owned):
- Per-item quote body/heading → `PRACTICE_QUOTE_PANEL = createEditorialQuotePanel('practice')`, bound `wall.tsx:3292`.
- Shared quote heading look → `quotePartsDesign.heading` (panel only bound on `quote-lab.tsx`, read-only on wall).

Hardcoded, no config surface: section eyebrow, `<h2>`, intro, the practices
**grid (columns/gaps)**, the `border-t` dividers, delivery/industry block, CTA.
There is no `PracticesSection.config.ts` / `.panel.ts`.

---

## B. Bug: practice quotes render almost transparent

### Root cause (confidence: HIGH from source; NOT yet live-verified)

1. The practice quote's resolved ink is a **dark purple** `solidTextColor:
   '#6a4384'` (`editorialConfig.ts:200`), because the practice variant inherits
   `backgroundMode: 'none'` → `resolveEditorialInk` returns `solidTextColor`
   (`editorialConfig.ts:233`). Both the practice **heading** (colorMode
   `inherit` → same `#6a4384`) and **body** resolve to this dark purple.
2. `EditorialQuote.tsx:207-213` then **deliberately overrides**
   `--gradient-ink-foreground: value.solidTextColor` on the practice quote root,
   so the banner's `.ink [data-gradient-ink-color]` descendant rule paints the
   practice text `#6a4384` instead of the banner's tuned ink.
3. That text sits under the banner's `mix-blend-mode: screen` layer. **Screen
   blend only lightens**; a dark purple `#6a4384` screened over the purple mesh
   gradient washes out to near-invisibility — exactly the attached screenshot.

The banner's own body text does **not** wash out because its ink is the tuned
`gradientInkTextColor` (`resolveEditorialInk` for gradient mode), i.e. a color
chosen to read under `screen`. The practices section's own chrome
(eyebrow/h2/intro) already uses `color: bannerInkColor =
resolveEditorialInk(bottomBannerQuoteDesign)` (`wall.tsx:6313`, `:7381`), which
is that same correct ink — so the chrome is fine; only the embedded practice
quotes use the dark override.

### Why the user's framing is right
"Make sure these are part of the text layer that applies the blending mode and
that the correct text color is being applied as with any other text." The
practice quotes ARE already inside the blend layer; the defect is purely the
**color** fed into it (`#6a4384` via the `--gradient-ink-foreground` override)
not matching the ink the blend was tuned for.

### Proposed fix (to design + verify, not yet implemented)
Make the practice quotes resolve their foreground to the **banner's gradient-ink
foreground** (`bannerInkColor`) instead of the dark static `#6a4384`:
- Pass `inkColor`/the banner ink down so the practice `EditorialQuote`'s
  `solidTextColor` (and therefore its `--gradient-ink-foreground` override and
  its `inherit` heading) equals `bannerInkColor`, OR
- Remove the dark `--gradient-ink-foreground` override for practice so the text
  inherits the banner's own `--gradient-ink-foreground` (the tuned ink) like
  every other `[data-gradient-ink-color]` element in that layer.

Decision to confirm: should the practice ink be **a single config color** on the
new panel (colorMode `inherit banner ink | custom`), so the operator can tune it,
rather than hardcoding `bannerInkColor`? Recommended: yes — expose `textColorMode`
+ `textColor` on the practices panel, default `inherit` (= banner ink). Reuses the
existing `QuotePartColorMode` pattern (memory: reuse-existing-knobs).

### Falsification / adversarial cases to run when implementing
- Confirm fix holds for BOTH heading and body, at base/md/lg.
- Confirm it holds when the banner gradient is re-tuned to a different hue
  (the ink must track the banner, not a fixed color).
- Confirm `multiply` banner blend (not just `screen`) still reads.
- Confirm forced-colors mode path (`GradientInkSurface.module.css:39`) unaffected.
- Confirm the section chrome (eyebrow/h2/intro) still reads (it already uses
  `bannerInkColor`) — i.e. we didn't regress the thing that currently works.

> NOTE: This is a visual bug. Per AGENTS.md + memory (verify-dont-assume), the
> fix is NOT "done" until reproduced and the corrected rendering is observed live
> at every breakpoint with a before/after capture. Everything above is a
> source-derived diagnosis only.

---

## C. New capability: practices layout config panel

A single `PracticesSection` appearance/layout scope, authored with the generated
Tailwind-token field system, wired through the config-update payload plumbing,
bound on `wall.tsx`. The embedded per-item quote styling stays on the existing
practice editorial + shared quote-parts panels (not duplicated).

### C.1 Columns (mirror the wall's width→count mechanism)
The wall derives column **count** from a target column **width** +
gap: `columnCount = floor((containerWidth + gap) / (cardWidth + gap))`
(`wall.tsx:800-806`, `resolveCollectionCardWidthPx`). Mirror that for practices:

- `columnTargetWidthPx` (preferred column width — the count driver), analogous to
  the wall's `cardWidthPx` / `maxColumnWidthPx`.
- `minColumnWidthPx`, `maxColumnWidthPx` — clamp the resolved column width; the
  count is chosen so each column stays within [min, max].
- Resolve count with the same floor-division formula, then flex columns to fill
  the content width (CSS grid `repeat(n, minmax(0, 1fr))` with the computed `n`),
  so no second narrower centered layout forms (same rationale as the wall).
- Clamp count to a sane ceiling (e.g. 1–4) given the "row/square of four" framing.

Implementation note: the count depends on the live container width, so it needs a
measured width (the section already renders inside a measured container; reuse
`useMeasuredElementRect` as `wall.tsx` already imports it, rather than a CSS
`auto-fill` guess — CSS `auto-fill minmax` can't express a hard max-count or the
separator-per-row-of-four rule below).

### C.2 Per-breakpoint gaps
- `columnGap` and `rowGap` as Tailwind `gap` tokens with base / md / lg
  breakpoint fields (use `createTailwindFieldFactory` + breakpoint param, the
  pattern in `tailwindFields.ts`). Defaults reproduce today's
  `gap-x-12 gap-y-12 md:gap-y-16 lg:gap-x-20`.

### C.3 Separators (layout-dependent, configurable)
A `separatorStyle` enum driving how dividers are drawn, plus visibility/color/
opacity/width knobs:

- **Stacked (1 column)**: a horizontal separator **between** items only — none
  above the first, none below the last. (Today each item hardcodes its own
  `border-t`, which already yields a rule above every item including the first;
  the new rule must suppress the leading/trailing edges.)
- **Row/grid (2–4 columns)**: **vertical** separators between columns within a
  row; and when items form a full **row of four** or a **square of four** (two
  rows of four / a 2×2 depending on count), one **horizontal** separator between
  each complete row of four. The exact "row of four vs square of four" is a
  layout option the operator picks — expose `rowGrouping: 'row-of-four' |
  'square-of-four' | 'auto'`.
- Fields: `separatorEnabled`, `separatorStyle` (`between-items` |
  `vertical-and-row` | `none`), `separatorWidth` (borderWidth token),
  `separatorColor`, `separatorOpacityPercent`. Default values reproduce the
  current `border-current opacity-20` rules so adding the panel is a visual no-op
  until edited.

> Separators spanning grid gaps can't be pure `border-t` per item; likely
> approach is grid pseudo-rules or absolutely-positioned divider lines computed
> from the resolved column count. This needs live verification that separators
> land only between (never at outer edges) for 1/2/3/4-column and 4+/8-item
> cases — explicitly a boundary-case test.

---

## D. Proposed files & shape

1. `experiences/abstract/components/PracticesSection.config.ts`
   - `PracticesSectionLayoutConfig` type with groups: `columns`
     (`columnTargetWidthPx`, `minColumnWidthPx`, `maxColumnWidthPx`, max count),
     `gaps` (`columnGap`/`rowGap` base+md+lg tokens), `separators`
     (enabled/style/grouping/width/color/opacity), `ink` (`textColorMode`,
     `textColor`) for the Section B fix, plus optional chrome groups (eyebrow/
     heading/intro/CTA) if we also promote those hardcoded classes.
   - `DEFAULT_PRACTICES_SECTION_CONFIG` reproducing today's hardcoded look
     exactly (so the panel is a visual no-op until edited — the key verification
     anchor).
   - `normalizePracticesSectionConfig(...)` mirroring `normalizeQuoteHeadingAppearance`
     (token() + color() + numeric clamp()), number fields clamped
     (`columnTargetWidthPx` within [min,max], counts within [1,4], etc.).

2. `experiences/abstract/components/PracticesSection.panel.ts`
   - `defineConfigScope<PracticesSectionLayoutConfig>({ id:'Practices/layout',
     component:'PracticesSection', scope:'layout', title:'PRACTICES SECTION',
     defaultValue: DEFAULT_PRACTICES_SECTION_CONFIG, copy:{ targetFile,
     targetSymbol:'DEFAULT_PRACTICES_SECTION_CONFIG',
     targetType:'PracticesSectionLayoutConfig', updateStrategy:'replace_scope',
     completeScope:true }, fields:[…] })`.
   - Token fields via `createTailwindFieldFactory<PracticesSectionLayoutConfig>()`.
   - Respect AGENTS.md: any option list >6-8 ⇒ `kind:'select'`.

3. `PracticesSection.tsx` — accept a `config` prop; compute grid columns from the
   measured container width + `columnTargetWidthPx`/min/max; apply per-breakpoint
   gaps; render separators per `separatorStyle`/`rowGrouping`; resolve practice
   ink per Section B. Keep DOM semantics/aria intact.

4. `pages/wall.tsx`
   - Add state + binding for the new scope in `localComponentConfigBindings`
     (`wall.tsx:3280`), next to `PRACTICE_QUOTE_PANEL`.
   - Pass resolved config + `bannerInkColor` into `<PracticesSection …>`
     (`wall.tsx:7381`).

5. Tests (match existing patterns):
   - `PracticesSection.config.test.ts` — normalizer round-trips/clamps/token
     fallback; column-count math at representative widths; separator-placement
     logic for 1/2/3/4 columns and 4/8 items (no edge separators).
   - Panel registration/serialization test alongside `Quote.test.tsx` style
     (scope-id uniqueness, `replace_scope` field-key coverage).

### Store scope decision
Practices is wall-only today → prefer **wall-local page state** (like
`editorialQuoteDesigns`/`collectionHeadingConfig`) over a new global
`useSyncExternalStore` store, unless it's meant to be reused off-wall. Confirm.

---

## E. Open decisions to confirm before implementing
1. Section B ink: expose `textColorMode` (`inherit banner ink | custom`) on the
   panel (recommended) vs. hardcode `bannerInkColor`.
2. `rowGrouping` semantics: is "square of four" a 2×2 block, or two stacked
   rows-of-four? Confirm the intended visual.
3. Whether to also promote the section chrome (eyebrow/h2/intro/CTA) into the
   panel now, or keep this panel to columns/gaps/separators/ink only.
4. Max column count ceiling (assume 4 from the "row/square of four" framing).

---

## F. Verification protocol (per definition-of-done; nothing below is done yet)
1. Run dev on a non-3000 port with an isolated `CLAUDE_NEXT_DIST_DIR` (memory).
2. **Bug B**: before/after capture of a practice item over the gradient at
   base/md/lg; confirm heading + body are legible; confirm they track the banner
   ink when the banner gradient hue is changed; confirm `screen` AND `multiply`
   blend read; confirm section chrome did not regress.
3. **Columns**: at several viewport widths, confirm the resolved column count and
   that each column width stays within [min,max]; confirm no inner narrower
   centered layout forms; confirm count ceiling holds.
4. **Gaps**: edit base/md/lg gap tokens; confirm each breakpoint changes
   independently.
5. **Separators**: confirm — stacked: rule only between items, never above first
   / below last; grid: vertical rules only between columns, horizontal rule only
   between complete rows of four; test 1/2/3/4 columns and 4/8-item counts.
6. **No-op default**: with the panel present but unedited, the section is
   pixel-identical to today (proves defaults reproduce the hardcoded look).
7. **Config-update round-trip**: exercise `pages/api/dev/apply-config-update.tsx`
   and confirm an edit persists back into `DEFAULT_PRACTICES_SECTION_CONFIG`
   (the `copy` block claims that capability); confirm no `targetSymbol` collision
   with other scopes.
8. SSR path (no `window`) falls back to defaults without throwing.

## G. Out of scope
- Re-architecting the embedded practice quotes beyond the ink fix.
- Practices copy/content (`content/wall.md` → `practicesContent`).
- Shared-file edits beyond the additive binding in `wall.tsx` (memory:
  avoid-shared-file-edits / stay-in-approved-scope).
