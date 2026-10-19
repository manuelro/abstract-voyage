# Quote config field audit

**Purpose:** a complete, field-by-field inventory of every config knob across the Quote family (base `<Quote>`, the three editorial types, and the two shared parts), which component/panel owns it, what it is supposed to do, where it is consumed in the renderer, and its verification status. Built by reading source directly (type definitions, panel declarations, renderer consumption), not inferred.

**Status column legend:**
- `CONFIRMED LIVE` — driven through the real panel control in a browser this session and the rendered/computed output was observed to change as expected.
- `WIRED (static)` — config→renderer consumption confirmed by reading source (the field is read and applied; not yet exercised through the live panel control in this audit pass).
- `BROKEN` — confirmed not working; root cause identified below the table.
- `NEEDS LIVE CHECK` — present and wired per static read, not yet exercised live.

This document is the worksheet for the systematic live-verification pass that follows. Every row must reach `CONFIRMED LIVE` (or `BROKEN` with a fix, then re-confirmed) before the integration can be called complete.

---

## 1. Base `<Quote>` — `Quote.panel.ts` (scope `Quote/appearance`)

Owns 73 fields. Spread into every editorial type's panel (minus 3 hidden keys — see §2). Renderer: `Quote.tsx`.

| Field | Panel control | Renderer (Quote.tsx) | Purpose | Status |
|---|---|---|---|---|
| `enabled` | action (reset) / boolean elsewhere | L627 | Show/hide the whole quote | WIRED (static) |
| `text` | text | — (prop-level, `value.text`) | Quote body copy | WIRED (static) |
| `showQuotationMarks` | boolean | L463 | Show/hide both quotation marks | CONFIRMED LIVE |
| `showClosingQuotationMark` | boolean | L476 | Show/hide only the closing mark | WIRED (static) |
| `openingMarkSizeEm` | number | L447 | Opening mark size (em) | CONFIRMED LIVE |
| `openingMarkOpacityPercent` | number | L448 | Opening mark opacity | NEEDS LIVE CHECK |
| `openingMarkOffsetXPercent` | number | L445 | Opening mark X position (% of figure) | NEEDS LIVE CHECK |
| `openingMarkOffsetYPercent` | number | L446 | Opening mark Y position (% of figure) | NEEDS LIVE CHECK |
| `closingMarkSizeEm` | number (subgroup) | L455 | Closing mark size (em) | NEEDS LIVE CHECK |
| `closingMarkOpacityPercent` | number | L456 | Closing mark opacity | NEEDS LIVE CHECK |
| `closingMarkOffsetXPercent` | number | L453 | Closing mark X position | NEEDS LIVE CHECK |
| `closingMarkOffsetYPercent` | number | L454 | Closing mark Y position | NEEDS LIVE CHECK |
| `markFontFamily` | tailwind:fontFamily | L442 | Font family of both quotation marks | CONFIRMED LIVE |
| `clipOverflowEnabled` | boolean | L545 (via `blendRootOverflow`) + figure overflow | Clip vs. bleed content past the figure box | NEEDS LIVE CHECK |
| `showAuthor` | boolean | L487 area (figcaption gate) | Show/hide attribution line | CONFIRMED LIVE |
| `author` | text | figcaption body | Attribution text | NEEDS LIVE CHECK |
| `measureCh` | number | L371 (`--quote-measure`) | Max line length (ch) | CONFIRMED LIVE |
| `leading` | tailwind:lineHeight | L372 (`--quote-leading`) | Body line-height | CONFIRMED LIVE |
| `tracking` | tailwind:letterSpacing | L377 (`--quote-tracking`) | Body letter-spacing | NEEDS LIVE CHECK |
| `textWrap` | enum | L378 (`--quote-text-wrap`) | `pretty`/`balance`/`wrap` | CONFIRMED LIVE |
| `hyphens` | boolean | L379 (`--quote-hyphens`) | Auto-hyphenate long words | CONFIRMED LIVE |
| `paletteBackgroundEnabled` | boolean | L347 (gates `paletteSwatches`) | Opt into solid-palette background/ink | WIRED (static); derived (not directly writable) on editorial types — see §2 note |
| `paletteColorIndex` | number | L350 | Which of 7 palette swatches | NEEDS LIVE CHECK |
| `paletteSaturationPercent` | number | L348 (`generateQuotePalette`) | Palette saturation | NEEDS LIVE CHECK |
| `paletteLightnessPercent` | number | L348 | Palette lightness | NEEDS LIVE CHECK |
| `textColorSaturationPercent` | number | L358 (`deriveQuoteTextColor`) | Derived-ink saturation (independent of bg) | NEEDS LIVE CHECK |
| `textColorLightnessPercent` | number | L358 | Derived-ink lightness | NEEDS LIVE CHECK |
| `geometryShape` | enum (group) | figure `aspectRatio` style | `auto`/`square`/`portrait`/`landscape` box | CONFIRMED LIVE |
| `borderRadiusEnabled` | boolean | figure/root radius gate | Opt into corner rounding | CONFIRMED LIVE |
| `borderRadius` | tailwind:borderRadius | root border-radius | Corner radius token | CONFIRMED LIVE |
| `elevationEnabled` | boolean (group) | passed into `useCardLiftPhysics` | Proximity lift/tilt/scale | CONFIRMED LIVE (pointer-driven transform observed) |
| `shadowEnabled` | boolean | passed into elevation shadow hook | Proximity cast shadow | CONFIRMED LIVE (box-shadow observed) |
| `textColorSource` | select, hidden (`visibleWhen: () => false`) | legacy; inert | Legacy field, kept for old payloads only | N/A (intentionally inert) |
| `gradientInkEnabled` | boolean | L270/L274/L347 (`unifiedInkActive`, palette suppression) | Opt into gradient ink | WIRED (static); derived from `backgroundMode` on editorial types |
| `gradientInkRenderMode` | enum | L282/L288/L301/L444 (`cssMode`/`unifiedMode`) | `unified` mesh vs `css` fallback | CONFIRMED LIVE |
| `gradientInkHologramEnabled` | boolean | L314 (`hologramEnabled`) | Pointer-reactive hologram on mesh | NEEDS LIVE CHECK |
| `gradientInkHologramStrengthPercent` | number | hologram tuning passthrough | Hologram response strength | NEEDS LIVE CHECK |
| `gradientInkMeshDarkeningPercent` | number | L297 / shader darkening | Darkens the mesh pre-blend | NEEDS LIVE CHECK |
| `gradientInkMeshSaturationPercent` | number | L297 / shader saturation | Mesh saturation | NEEDS LIVE CHECK |
| `gradientInkMeshScale` | number | L196 (CSS preview), mesh/background-size scale | Mesh zoom | WIRED (static) |
| `gradientInkCssAngleDegrees` | number | L286/L296 (css gradient angle) | CSS linear-gradient angle | CONFIRMED LIVE |
| `gradientInkSourceCard` | select | L289 (`computeDeckChord` index) | Which deck card sources the gradient | NEEDS LIVE CHECK |
| `gradientInkBaseColor` | color | L558 (`--quote-base-color`) | Unified-mode backdrop base color | CONFIRMED LIVE |
| `gradientInkSurfaceColor` | color | overlay surface color | Unified-mode text-layer surface color | NEEDS LIVE CHECK |
| `gradientInkTextColor` | color | L333/L608 | Unified-mode text ink color | CONFIRMED LIVE |
| `gradientInkBlendMode` | enum | L583 (`data-quote-blend`) | `screen`/`multiply` blend | CONFIRMED LIVE |
| `gradientInkOverlayOpacityPercent` | number | overlay alpha | Opacity of text-layer surface over mesh | NEEDS LIVE CHECK |
| `gradientInkTextOpacityPercent` | number | L334 (text ink alpha) | Opacity of the text ink itself | NEEDS LIVE CHECK |
| `gradientInkBorderEnabled` | boolean | L529 (`blendOverlayBorder`) | Opt-in overlay border | NEEDS LIVE CHECK |
| `gradientInkBorderWidth` | tailwind:borderWidth | overlay border width | Overlay border thickness | NEEDS LIVE CHECK |
| `gradientInkBorderStyle` | enum | overlay border style | CSS border-style (incl. inset/outset/groove/ridge) | NEEDS LIVE CHECK |
| `gradientInkBorderColor` | color | overlay border color | Overlay border color | NEEDS LIVE CHECK |
| `textSize` / `textSizeMd` / `textSizeLg` | tailwind:fontSize ×3 | L390 (figure class list) | Body font size per breakpoint | CONFIRMED LIVE (Lg tested) |
| `authorSize` / `authorSizeMd` / `authorSizeLg` | tailwind:fontSize ×3 | L398 (author class list) | Author font size per breakpoint | NEEDS LIVE CHECK |
| `textFontFamily` | tailwind:fontFamily | L362 (`--quote-text-font`) | Body font family | CONFIRMED LIVE |
| `textFontWeight` | tailwind:fontWeight | L474 (inline `fontWeight`) | Body font weight | CONFIRMED LIVE |
| `authorFontFamily` | tailwind:fontFamily | L363 (`--quote-author-font`) | Author font family | NEEDS LIVE CHECK |
| `paddingTop/Right/Bottom/Left` (+ Md/Lg ×3 each = 12 fields) | tailwind:paddingTop/Right/Bottom/Left ×12 | L391-394 (figure class list) | Figure box padding, 4 sides × 3 breakpoints | NEEDS LIVE CHECK (shared mechanism with textSize, which IS confirmed) |

**Count:** 73 fields (matches `getConfigScopeFieldKeys(QUOTE_PANEL.fields).length` and `Object.keys(DEFAULT_QUOTE_CONFIG).length`, verified via `defineConfigScope`'s own completeness validator — see §5).

---

## 2. Per-type editorial additions — `EditorialQuote.panel.ts` (one scope per `featured`/`plain`/`solid`)

Each type's panel = all 73 base fields above (via `QUOTE_PANEL.fields` spread, minus `gradientInkEnabled`/`paletteBackgroundEnabled` which are **hidden** because `backgroundMode` below derives them) **plus** these 20 own fields. Renderer: `EditorialQuote.tsx`.

| Field | Panel control | Renderer (EditorialQuote.tsx) | Purpose | Status |
|---|---|---|---|---|
| `headingEnabled` | boolean | L106 (gate) | Show/hide the source heading | CONFIRMED LIVE |
| `headingLabel` | text | L112 (label text) | Heading label text (e.g. "ABOUT") | WIRED (static) |
| `headingShowTitle` | boolean | L112 | Include chapter title in heading | WIRED (static) |
| `headingShowPeriod` | boolean | L112 | Include period in heading | WIRED (static) |
| `headingPlacement` | enum | L144/L145/L161/L164 | `before`/`after`/`inside-top`/`inside-bottom` | WIRED (static) |
| `headingAlign` | enum | L112 (`textAlign`) | start/center/end alignment | NEEDS LIVE CHECK |
| `linkEnabled` | boolean | L121 (gate) | Show/hide the source link | WIRED (static) |
| `linkLabel` | text | L131 | Link visible label | CONFIRMED LIVE |
| `linkPlacement` | enum | L144/L145/L163/L164 | `before`/`after`/`inside-top`/`inside-bottom` | CONFIRMED LIVE |
| `linkAlign` | enum | L122 (`textAlign`) | start/center/end alignment | NEEDS LIVE CHECK |
| `topRuleEnabled` | boolean | L171 (gate) | Show/hide the top rule | CONFIRMED LIVE |
| `topRuleWidth` | tailwind:borderWidth | L171 | Top rule thickness | CONFIRMED LIVE |
| `topRuleColor` | color | L171 | Top rule color | NEEDS LIVE CHECK |
| `topRuleOpacityPercent` | number | L171 (`colord(...).alpha(...)`) | Top rule opacity | CONFIRMED LIVE |
| `backgroundMode` | enum | L136-146 (`surfaceStyle`), L95/L97/L141 | `none`/`solid`/`palette`/`gradient` — single surface switch | CONFIRMED LIVE |
| `solidBackgroundColor` | color | L146 | Solid-mode background color | NEEDS LIVE CHECK |
| `solidTextColor` | color | L146, `resolveEditorialInk` | Fallback/solid/none text ink | WIRED (static; used by ink-inherit tests) |
| `adaptiveTypeEnabled` | boolean | L33/L82 (effect gate) | Opt into shrink-to-fit long text | NEEDS LIVE CHECK |
| `adaptiveMinSize` | tailwind:fontSize | L46 (`minimumPx`) | Floor size for adaptive fitting | NEEDS LIVE CHECK |
| `adaptiveMaxLines` | number | L66 (`value.adaptiveMaxLines`) | Target max lines before shrinking | NEEDS LIVE CHECK |

**Known behavior change (fixed this session, not yet re-audited live per-type):** `backgroundMode === 'gradient'` now backs the quote with `gradientInkBaseColor` instead of `solidBackgroundColor`, so the CSS render mode is legible. Confirmed via screenshot for `featured`; **not yet re-confirmed for `plain`/`solid` with `backgroundMode` manually set to `gradient`** (their defaults don't use gradient, but the field is live-editable on every type).

**Note on `gradientInkEnabled`/`paletteBackgroundEnabled`:** these two base fields are intentionally **not directly editable** on any editorial type (hidden in the panel); they are derived from `backgroundMode`. This is correct by design (§3 of the implementation), not a bug — flagging here so it isn't mistaken for a missing control during the live pass.

---

## 3. Shared heading appearance — `QuoteParts.panel.ts` → `QUOTE_HEADING_PANEL` (scope `Quote/heading-appearance`)

**One instance for the whole app.** Renderer: `EditorialQuote.tsx` (`headingLook`/`headingColor`).

| Field | Panel control | Renderer | Purpose | Status |
|---|---|---|---|---|
| `size` | tailwind:fontSize | L112 (`fontSize`) | Heading font size | NEEDS LIVE CHECK |
| `fontFamily` | tailwind:fontFamily | L113 (`fontFamily`) | Heading font family | **REPORTED BROKEN by user — reproduction in progress, not yet confirmed broken or fixed by me, see §6** |
| `fontWeight` | tailwind:fontWeight | L114 (`fontWeight`) | Heading font weight | NEEDS LIVE CHECK |
| `colorMode` | enum | L46-47 (`headingColor` branch) | `inherit` quote ink vs `custom` | CONFIRMED LIVE (custom; inherit confirmed for solid type) |
| `color` | color | L111 (`color`, when `colorMode==='custom'`) | Custom heading color | CONFIRMED LIVE |
| `paddingTop/Right/Bottom/Left` | tailwind:paddingTop/Right/Bottom/Left | via `padding(headingLook)` helper, L108 | Heading box padding, 4 sides | NEEDS LIVE CHECK (helper-mediated, not a direct `headingLook.paddingX` read — confirmed present via `padding()` in `EditorialQuote.tsx:34`) |

**Propagation (the core "shared" claim):** confirmed live this session — editing heading color through this single scope changed the computed color on the featured, plain, and solid previews simultaneously, and on the wall. Font-size propagation (not just color) was also confirmed (`text-2xl` → `font-size:1.5rem` observed across all three types in a test). **Font-family propagation specifically is the one knob reported broken — under investigation, see §6.**

---

## 4. Shared source-link appearance — `QuoteParts.panel.ts` → `QUOTE_SOURCE_LINK_PANEL` (scope `Quote/source-link-appearance`)

**One instance for the whole app.** Renderer: `EditorialQuote.tsx` (`linkLook`/`linkColor`/`icon`).

| Field | Panel control | Renderer | Purpose | Status |
|---|---|---|---|---|
| `size` | tailwind:fontSize | L125 | Link font size | NEEDS LIVE CHECK |
| `fontFamily` | tailwind:fontFamily | L126 | Link font family | NEEDS LIVE CHECK (same mechanism flagged broken for heading — must be checked for the same defect) |
| `fontWeight` | tailwind:fontWeight | L127 | Link font weight | NEEDS LIVE CHECK |
| `colorMode` | enum | L46-47 | `inherit` quote ink vs `custom` | CONFIRMED LIVE |
| `color` | color | L124 | Custom link color | CONFIRMED LIVE |
| `paddingTop/Right/Bottom/Left` | tailwind:paddingTop/Right/Bottom/Left | via `padding(linkLook)` helper, L123 | Link box padding, 4 sides | NEEDS LIVE CHECK |
| `icon` | enum | L99-103 (glyph choice) | `none`/`arrow-up-right`/`arrow-right` | WIRED (static; confirmed absent for `none` in an existing test) |
| `iconPlacement` | enum | L130/L132 | Icon before/after label | NEEDS LIVE CHECK |
| `iconSize` | tailwind:fontSize | L100 | Icon size | NEEDS LIVE CHECK |
| `iconGap` | tailwind:gap | L128 | Gap between icon and label | NEEDS LIVE CHECK |

---

## 5. Structural completeness (verified this session, static)

- Every field in `QuoteConfig` (73), the per-type `EditorialQuoteConfig` own fields (20), `QuoteHeadingAppearanceConfig` (9), and `QuoteSourceLinkAppearanceConfig`'s own fields (4) has an exact 1:1 matching panel field — confirmed by diffing the type's field-name set against each panel's declared `key`s. Zero fields are missing from a panel; zero panel fields reference a nonexistent config key (the latter would fail `npx tsc`, which is clean).
- `defineConfigScope`'s own runtime validator (`validateConfigScopeDefinition`, `components/Panel/config/defineConfigScope.ts`) independently enforces this for every scope (every `defaultValue` key must be rendered or hidden, and vice versa) — all four scopes construct without throwing, confirmed by the test suite importing and binding them.
- Every one of the 73 base fields has at least one consumption site in `Quote.tsx` (grepped `value.<field>`); none are dead/unread.

**What static completeness does NOT prove:** that a control's write actually reaches the DOM/computed style correctly in every case — that's what the `NEEDS LIVE CHECK` rows above are for, and exactly the category the reported `fontFamily` bug fell into.

---

## 6. Reported defect, reproduction in progress: shared heading `fontFamily`

Reported: changing "WALL QUOTE HEADING (shared) → Font family" has no visible effect. **I have not yet reproduced this myself through the real panel control to completion** — my reproduction attempt was interrupted before I could click SANS and re-read the computed style, so I cannot yet say whether it is actually broken, under what conditions, or why. Flagging what I know and don't know separately, honestly:

**Confirmed (seed-level, not through the real panel):** setting `headingAppearance.fontFamily` directly via a seeded config object and re-rendering **did** change computed `font-family` on the heading (sans↔serif). That only proves the renderer side (`EditorialQuote.tsx:113`, `tailwindTokenCssValue('fontFamily', 'base', headingLook.fontFamily)`) is correct in isolation — it does not prove the real panel control reaches that renderer correctly.

**Observed anomaly, not yet explained:** the on-disk default (`DEFAULT_QUOTE_HEADING_APPEARANCE` in `quotePartsConfig.ts`) no longer matches the values this implementation originally wrote (`size`/`fontFamily`/`fontWeight` differ from the original `text-xs`/`font-sans`/`font-semibold`). The scope's `UPDATE DIFF` (`copy.updateStrategy: 'replace_scope'`, targeting that symbol directly) is a real, intentional mechanism in this codebase — clicking it is supposed to patch the source default — so this alone isn't proof of a bug. But the live-value panel control and the on-disk default are two different things, and I have not yet confirmed which one (if either) is failing to update the rendered heading. That is the next concrete step: click SANS/SERIF in the real panel against a clean state, read the computed `font-family` before and after, and determine exactly where the chain breaks if it does.

This file is the worksheet; reproducing and root-causing this defect with real evidence, then re-running every `NEEDS LIVE CHECK` row through the real panel with screenshot/computed-style evidence, is the next phase — not yet started pending this review.
