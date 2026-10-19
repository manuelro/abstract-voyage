# PLAN — Practices section: responsive layout + per-element typography + per-section box config

Scope: `experiences/abstract/components/PracticesSection.tsx`,
`PracticesSection.config.ts`, `PracticesSection.panel.ts`, `content/practices.md`.
Objective: the 5-zone responsive composition, plus a comprehensive,
breakpoint-segregated config surface for every title and paragraph in the
section (and, later, per-section border/padding boxes).

Companion: `PLAN-PRACTICES-SECTION-CONFIG.md` is the earlier, already-built plan
(columns/gaps/separators + the practice-ink bug). This plan builds on it.

Breakpoint vocabulary: three config tiers via the generated Tailwind token
system: `base` = mobile (<768), `md` = tablet (768-1023), `lg` = desktop
(>=1024). (`breakpoints.js`: sm 640, md 768, lg 1024, xl 1280, xxl 1536.)

---

## STATUS

- DONE (Step 1, structural layout, committed + live-verified): `maxColumnCount`
  capped at 2 (orphan-3 fixed), full-width Differentiator band, subordinate Proof
  block, button-grade CTA (`w-full` mobile / auto md+, min 48dp). Mobile single
  column and desktop/xl 2x2 verified.
- OPEN FINDING (supersedes the earlier optimistic tablet assessment): the banner
  content box is much narrower than estimated. Measured live: 536px at 768, 644px
  at 1024, 1024px at 1280. So with the width-driven grid the 2x2 only appears at
  ~xl; tablet and the lg-desktop floor render a single column. Forcing 2x2 at
  md/lg would give 31-37 char columns, below the 45-75 optimum. Awaiting the
  user's choice (section 1, options A/B/C).
- PENDING: the per-element typography surface (section 3), the title change
  (section 2.6), and the per-section box surface (section 4).

---

## 0. Scope boundaries (ownership)

IN SCOPE, rendered directly by `PracticesSection.tsx` (fully governable here):
- Zone 2 Approach: section `heading` (now "The Practice"), `introduction`, `subtext`.
- Zone 4 Differentiator: `delivery.heading`, `delivery.text`.
- Zone 5 Proof: `industry.label`, `industry.title`, `industry.text`.
- Zone 6 Ask: `cta.label` + button affordance.

CARD-OWNED (rendered via `EditorialQuote variant="practice"`): card title ×4
and card body ×4. Their measure is already overridden from PracticesSection
(`practiceCardMeasure`, see 3). Full card typography under PracticesSection is
the D4 extension (override merged into the card quote config).

OUT OF SCOPE: Zone 1 Promise (hero quote) typography, owned by
`bottomBannerConfig.ts` / `EditorialQuote.tsx`.

---

## 1. Tablet / column-width finding (DECISION PENDING)

The large 2x2 does not fit tablet or lg-desktop with readable measure, because
the banner wraps the section in heavy horizontal padding (`lg:pl-20 lg:pr-20`)
plus the wall max-width. Measured content widths and the measure a forced 2x2
would yield:

| Viewport | Tier | Content box | Current cols | 2-col measure |
|----------|------|-------------|--------------|---------------|
| 768 | tablet floor | 536px | 1 | ~31ch |
| 1024 | desktop (lg) floor | 644px | 1 | ~37ch |
| 1280 | xl | 1024px | 2 | ~61ch (good) |

Options:
- A. Accept width-driven (current): single column until ~xl, 2x2 at xl. Readable,
  but tablet/lg are single column (does not match "2x2 on tablet").
- B. Force explicit 2x2 at md+ (per-tier 1/2/2): matches the request, but 31-37ch
  columns, below optimum, until xl.
- C. Widen the banner content box at md/lg (reduce the banner's horizontal padding
  and/or max-width in `bottomBannerConfig.ts`). Only way to get 2x2 WITH good
  measure, but it reshapes the hero quote above and is a shared-file edit outside
  the two in-scope files.

Recommendation: A for readability, or C if the 2x2 on tablet is a hard
requirement. Not B.

---

## 2. Structural layout (Step 1 — DONE, plus the title change — PENDING)

1. Offer column count: 1 / 2 / 2 target, never 3 (Gestalt Pragnanz). Done via
   `maxColumnCount: 2`; see section 1 for the width caveat.
2. Differentiator `delivery`: full-width band. DONE.
3. Proof `industry`: subordinate block beneath (narrower, smaller title). DONE.
4. Ask `cta`: button-grade, `w-full` mobile / auto md+, min 48dp (Fitts 1954;
   Material/Apple HIG). DONE.
5. Reading order unchanged across breakpoints (source = DOM = reading order).
6. TITLE CHANGE (pending): the top title "The Practice" uses the same title
   treatment as the Differentiator title "Independent expertise. Connected
   delivery." Rationale: consistency; today the top is a tiny uppercase eyebrow
   while the section titles below are large. Implementation: `content/practices.md`
   set `heading: The Practice`, `eyebrow: ''`; render the heading with the T2
   title style (and, once section 3 lands, with the T1 title style).

---

## 3. Typography surface: PER-ELEMENT (the current direction)

Decision: per-element config, not three shared roles. "As many titles as we have"
means each title is independently tunable, which is also the only way the
primary-vs-subordinate title rank (T1/T2 large, T3 small) stays independent. A
role model would force all titles identical. (Role-based remains the fallback if
the surface proves too large; see D-granularity.)

### 3.1 The font knobs added to each element (per breakpoint base/md/lg)

Six font knobs, exactly the agreed list:
1. Font size (`fontSize` token)
2. Tracking / letter-spacing (`letterSpacing` token)
3. Line height (`lineHeight` token)
4. Font weight (`fontWeight` token)
5. Text transform (`textTransform` token)
6. Opacity (number 0-100)

Plus, added alongside (requested in prior turns, not strictly "font"):
7. Max width (`maxWidth` token) — on every title and paragraph (the measure).
8-11. Paragraphs only: Text wrap, Overflow wrap, Word break, Hyphens
   (small single-property enums applied inline; D9a).

NOT added (unless the user flips it): font family (not in the list; stays on the
current family), and any color/ink knob (ink stays inherited).

Field math:
- Title / label set = 7 props (knobs 1-7) x 3 tiers = 21 fields.
- Paragraph set = 7 props x 3 tiers (21) + 4 wrap/break single-value (4) = 25
  fields (33 if wrap/break go per-tier; D-wrapbreak).

### 3.2 Element inventory and field counts

TITLES (4 types):
- T1 Section title "The Practice" (`heading`, moved from eyebrow) — 21
- T2 Differentiator title (`delivery.heading`) — 21
- T3 Proof title (`industry.title`) — 21
- T4 Card title ×4 (quote-owned, D4) — 21

LABEL (1 type):
- L1 Proof label (`industry.label`) — 21

PARAGRAPHS (5 types):
- P1 Introduction — 25
- P2 Subtext — 25
- P3 Differentiator body (`delivery.text`) — 25
- P4 Proof body (`industry.text`) — 25
- P5 Card body ×4 (quote-owned, D4; measure already via `practiceCardMeasure`) — 25

Totals: direct elements (T1-3, L1, P1-4) = 4x21 + 4x25 = 184 fields. With the two
card types (T4, P5) = +46 = 230 fields.

### 3.3 Paragraph width knobs (how the width issue is fixed)

Two logical width controls, both now folded into the per-element sets above:
- `paragraphMaxWidth`: the Max width knob on P1-P4 (the four full-width body
  paragraphs). Default a rem-based token (~`max-w-xl`), NOT `max-w-prose`: `ch` is
  the "0" width (~0.666em here), so `max-w-prose` (65ch) renders ~85 chars, past
  the 45-75 optimum. Apply directly on each `<p>` (a wrapper max-width does not
  propagate; that is why industry.text is currently uncapped at ~162ch).
- `practiceCardMeasure`: the Max width / measure knob on P5 (the card body). Today
  `measureCh: 34` renders 365px inside a 499px column (empty gutter); bring it into
  PracticesSection and override the card quote's `measureCh` from this knob so the
  card fills its column (~56-60ch at the 2-col width). Per tier (1-col mobile vs
  2-col desktop differ).

### 3.4 Scalability (do NOT hand-write ~230 fields)

- One reusable `PracticesTitleStyle` type (knobs 1-7) and one
  `PracticesParagraphStyle` type (knobs 1-11), instantiated per element.
- `defaultTitleStyle(overrides)` / `defaultParagraphStyle(overrides)`: concise
  defaults; each element's default reproduces today's rendered look (section 5).
- One normalizer per type, mapped over the per-element records.
- Panel generators emit one element's fields for one tier; loop elements x tiers.
- Component resolvers `resolveTitleStyle(id, tier)` / `resolveParagraphStyle(id,
  tier)` -> CSSProperties, applied inline.
- All Tailwind-backed fields go through `createTailwindFieldFactory` /
  `normalizeTailwindToken` / `tailwindTokenCssValue` by utility name + breakpoint.
  No local token arrays, no per-breakpoint copies (AGENTS.md).

### 3.5 Panel IA (keeping the surface usable)

Panel `areas` (macro switch) + `tabs` (device-size switch, highlights current
tier): Area "Titles", Area "Paragraphs" (and later "Sections" for boxes, "Layout"
for grid/gaps). Within each area, a device-size tab (mobile/tablet/desktop); under
each tab, one group per element with that tier's fields. Operator edits one tier
at a time.

---

## 4. Section boxes (LATER phase — border + padding per zone)

Still planned, unchanged from the prior revision. One reusable
`PracticesSectionBox` per zone (`root`, `approach`, `offer`, `differentiator`,
`proof`, `ask`): `borderTopWidth`/`borderBottomWidth` (token, per tier),
`borderColor` (single, 'inherit' | custom; D1), `borderOpacityPercent` (per tier),
`paddingTop/Right/Bottom/Left` (token, per tier). ~22 fields/section. Coexists
with the existing inter-card `separator*` config.

---

## 5. Defaults = visual no-op (migration safety + verification anchor)

Per-element defaults reproduce today's rendered look so adding the surface changes
nothing until edited. Encode current values:
- labels/eyebrow: `text-xs`, `font-medium`, `uppercase`, tracking ~`tracking-widest`
  (D7: token tops at 0.1em vs the current 0.18-0.2em), `opacity 50`.
- titles: `text-2xl` / md `text-3xl` (T3 subordinate: `text-xl` / md `text-2xl`),
  `font-semibold`, `leading-snug`, `tracking-tight`, `opacity 100`.
- paragraphs: `text-base` / md `text-lg`, `font-normal`, `leading-relaxed`,
  `normal-case`, `opacity 70`; wrap/break at browser defaults (`pretty`/`break-word`
  are an opt-in improvement, applied deliberately not silently).

Remove (subsumed): `introductionMaxWidth`, the 10 `subtext*` fields. Keep
`headerMaxWidth` and the `separator*` config.

---

## 6. Edits (non-additive)

1. `content/practices.md`: `heading: The Practice`, `eyebrow: ''`.
2. `PracticesSection.config.ts`: add the per-element title/paragraph style records
   + reusable types + defaults + normalizers; add `practiceCardMeasure` (per tier);
   remove `introductionMaxWidth` and `subtext*`.
3. `PracticesSection.tsx`: apply resolved per-element styles inline; remove all
   hardcoded typography classes and the hardcoded `max-w-prose`; render "The
   Practice" with the title style; merge `practiceCardMeasure` (and, if D4, T4/P5
   styles) into the card `EditorialQuote` config.
4. `PracticesSection.panel.ts`: Titles / Paragraphs areas with device tabs via
   generators; remove `introductionMaxWidth` / `subtext*` fields.
5. `PracticesSection.config.test.ts`: update for added/removed fields + per-element
   normalizers.
6. Live verification at base/md/lg.

---

## 7. Decisions to confirm

- D-granularity: per-element (section 3, ~184-230 fields) vs shared roles
  (title/subtitle/content, ~54 fields). Current plan assumes per-element.
- D4 cards: include T4 (card title) + P5 (card body) full typography (+46 fields,
  override plumbing) vs keep card typography on the practice quote panel and only
  override the card measure here.
- D-wrapbreak: paragraph wrap/break single-value (4 fields each, recommended) vs
  per-tier (12 each).
- D-tablet (from section 1): A width-driven / B forced 2x2 / C widen banner.
- D7 letterSpacing: accept `tracking-widest` (0.1em) for labels vs extend the
  manifest to the current 0.18-0.2em.
- D1/D2 (section 4, boxes): border color single vs per-tier; shared vs per-edge.
- Font family: excluded unless the user asks to include it.

---

## 8. Sequencing (each step independently reviewable + live-verified)

1. Structural layout + title change. (Layout DONE; title change pending.)
2. Per-element typography (titles + paragraphs), defaults = no-op.
3. Per-section boxes (borders + padding).

---

## 9. Verification (AGENTS.md definition-of-done)

1. Dev on a non-3000 port with isolated `CLAUDE_NEXT_DIST_DIR`.
2. No-op default: unedited section pixel-identical to today at base/md/lg.
3. Per-element type: edit each title/paragraph at EACH tier via the real panel
   path; confirm only that element and tier change.
4. Paragraph width: each of P1-P4 caps at its `maxWidth` (full width on mobile);
   card body (P5) fills its column; a long unbroken token does not overflow once
   `break-word` is set.
5. Title change: "The Practice" matches the Differentiator title treatment.
6. Mobile: single-column Offer, full-width CTA in the thumb zone, >=48dp.
7. Config-update round-trip persists into the default symbol; no `targetSymbol`
   collision. SSR (no `window`) falls back without throwing.
8. Screenshots of each affected state in the handoff.

## 10. Out of scope
- Hero quote (Zone 1) typography.
- Practices copy/content beyond the title move (`content/practices.md`).
- Shared-file edits beyond the additive wall binding, except option 1-C if chosen.
