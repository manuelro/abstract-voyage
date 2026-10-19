# Plan — Normalizing the Quote Wall (cognitive-load & art-direction refinement)

## Context

`pages/wall.tsx` renders a masonry wall that interleaves two object families:

1. **Article cards** — vivid full-bleed liquid-gradient surfaces, white ink, an eyebrow (category · date · read time) + title + dek. Navigational, clickable, dense.
2. **Quote cards** — pale tinted surfaces, mostly-serif text, quotation marks, sometimes an author. These are excerpts of the `/about` narrative, pulled from `aboutPageContent.timeline`.

The quote content model is fixed and meaningful: **5 timeline stages**, each emitting exactly two fragments via `flatMap` (`experiences`… `wall.tsx:5959`):

- a **`line`** — a punchy 8–14 word aphorism (the headline voice), and
- a **`body`** — a 40–90 word reflective paragraph.

So the 10 quote nodes alternate **short, loud / long, quiet** by construction (even index = line, odd index = body).

The current styling ignores that structure and instead assigns **role by arbitrary index arithmetic** (`wall.tsx:5963–5986`):

- font family: `index % 3 === 1` → sans, else serif
- quotation marks: shown on `[0,3,5,8]`
- author: shown on `[1,3,6,9]`
- surface/ink: `index % 5` across **5 pastel tints × 5 inks** (`wall.tsx:1714–1715`)
- "feature" gradient-ink: `index === 3 || 6 || 9`

And critically, **both lines and bodies render at the same display size** (`textSize: text-4xl`, `config.ts:61`) with a global `max-inline-size: 34ch` and `line-height: 1.26` hardcoded in `Quote.module.css`.

The observable result (see the reference screenshot) is high **extraneous cognitive load**: a 60-word McKinsey paragraph set at 36px serif becomes a towering block that dominates the viewport and is hard to read; five random pastel tints and a random serif/sans flip encode nothing yet consume attention; quotation marks and author lines appear on no discernible rule. Nothing signals which fragments matter.

**Intended outcome:** collapse ~10 near-random quote variants into a small, intentional **typology of three archetypes** derived from the content model, encode importance with size and category with one restrained paper+ink system, and reserve color/gradient for a single deliberate feature — so the wall reads as *article cards + a calm editorial quote layer + the occasional feature*, learnable at a glance.

This plan is design + art direction. **Do not implement yet.**

---

## Diagnosis — what's overloading the wall (with the principle each violates)

| # | Problem (in the screenshot) | Principle violated |
|---|---|---|
| 1 | Short `line`s and long `body`s share one display size (`text-4xl`); long paragraphs become giant, hard-to-read blocks. | Display type is for short bursts; continuous reading wants ~45–75 characters/line and body-size type. **Dyson 2004** (line length & reading rate); **Legge & Bigelow 2011** (critical print size); **Bringhurst 2004** (measure). |
| 2 | 5 pastel surfaces × 5 inks assigned by `index % 5` — color means nothing. Plus the saturated article gradients. | Color is a strong preattentive channel; spending it on non-signifying variation is noise. **Ware 2012** (preattentive processing); **Tufte** (data-ink / chartjunk); **Bertin** (visual variables). |
| 3 | Serif/sans flips on `index % 3` — no meaning; parser resets at each switch ("ransom note"). | Pair serif + sans *functionally* (voice vs. apparatus), never randomly within one role. **Bringhurst 2004**; **Lupton, *Thinking with Type***. |
| 4 | Quotation marks on an arbitrary subset `[0,3,5,8]`; closing mark floats to the right edge on short quotes. | A mark is a semantic cue ("verbatim voice"); applied by no rule it becomes decoration. **Tufte** (remove non-signifying ink). |
| 5 | Author "— Manuel Cerdas" on `[1,3,6,9]` though every fragment is the same single author. | Redundant repetition the eye must re-scan and discard. **NN/g** scanning; **Nielsen** heuristics (minimalist design). |
| 6 | "Importance" is faked via gradient-ink on the *long* ones, and gradient-clipped text is *harder* to read — emphasis via reduced legibility. | Importance should raise salience, not lower legibility. **Lidwell/Holden/Butler** (visual hierarchy, squint test). |
| 7 | Too many visually distinct "card kinds" to parse. | Processing time grows with the number of distinguishable choices; group into few recognizable chunks. **Hick 1952 / Hyman 1953**; **Miller 1956** (chunking); **Sweller 1988/1998** (cognitive load: cut *extraneous* load). |
| 8 | Several pastel-on-pastel pairs (e.g. olive `#4d442d` on pink `#f5e9e6`) are low-contrast. | Body text needs WCAG AA ≥ 4.5:1. **WCAG 2.2 §1.4.3**. |

What's already fine: everything is **left-aligned, ragged-right** (correct — never center or justify blocks at this size; **Bringhurst**). The fix is measure + size + palette discipline, not alignment.

---

## The design — three archetypes, each with a job

Collapse the per-index soup into **three quote roles**, mapped to the structure that already exists in the data rather than to arbitrary indices (so the typology is honest, not imposed — it "falls out" of line vs. body):

### 1. STATEMENT — the short `line`s (even indices)
The loud accents. The quotable aphorisms, one per timeline stage.
- **Serif**, **display size** (largest step), tight leading (~1.15–1.25).
- Wide-ish measure is fine (they're short anyway); 34ch is acceptable here.
- **One** quiet oversized opening quotation mark; **no closing mark** (kills the floating-right glyph); **no author**.
- Sit on the **base paper** surface.

### 2. PASSAGE — the long `body`s (odd indices)
The quiet substance. Reflective prose.
- **Serif**, **reading size** (the base of the scale — *smaller than today*, ~`text-lg`→`text-xl`), comfortable leading **~1.5** (grows with word count).
- Measure clamped to **~60ch** (not 34ch — 34ch over-rags a 60-word paragraph).
- **No decorative marks.** Optional **author/attribution in sans**, small, muted ink — the signed-reflection cue does the "this is a voice" work.
- Base paper surface.

### 3. FEATURE — exactly one (maybe two per full scroll)
The single fragment that earns the vivid, card-like treatment, chosen by **editorial importance**, not by length or `index % n`.
- Carries the **palette-derived gradient-ink / tint** via the mechanism that *already exists* in `Quote.tsx` (`coverFlowGradient` + `gradientInk*` props) and in the standalone "Editorial thought" quote (`wall.tsx:7326`, which already consumes live `quoteGradients`).
- Because only the feature is chromatic, **color now means "this is the one"**, and it visually rhymes with the article cards, tying the two object families together.

**Why three, not one and not ten** (the user's explicit question): one uniform treatment flattens the narrative's natural beats (claim vs. elaboration) into monotony and loses germane engagement; ten variants overload (Hick/Miller). Three is the smallest set that creates rhythm and hierarchy while staying instantly learnable and groupable by Gestalt **similarity** — and it maps 1:1 onto the data's own two tiers plus the pre-existing feature mechanism.

---

## The rules that normalize each aspect

**Palette — one paper + one ink, plus a reserved accent (effectively a 2-color system).**
Replace the 5-tint `wallQuoteSurfaces`/`wallQuoteInk` arrays with:
- **Base paper:** a single warm off-white (reuse the site's existing paper, ~`#faf9f6`). 90% of quotes share it, so they group as one calm editorial layer and recede behind the article cards (figure/ground — cards become figures, quotes the ground).
- **Ink:** one warm near-black at AA ≥ 4.5:1 on that paper, plus one muted secondary for attribution/eyebrow.
- **Accent:** borrowed from the live gradient palette (`coverFlowPalettes` / `quoteGradients`) — used **only** on the FEATURE.
- *If gentle variety is still wanted:* vary the paper within a **≤3% lightness band of the single hue** (variety you feel, not parse) — never the five distinct hues of today.

**Serif vs. sans — functional, not random.** Serif (**Instrument Serif**) = the reading voice for every Statement and Passage body. Sans (**Instrument Sans**) = the *apparatus*: attribution and any stage/eyebrow label, small and muted. (Only these two faces exist — `tailwind.config.js:37–41` — so this is the full, honest system.) Drop the `index % 3` sans flip.

**Size = importance; it is noted *implicitly*.** A single modular scale (~1.25 major-third or 1.333 perfect-fourth) with three steps: **Statement (display) > Passage (reading, = base) > attribution/eyebrow (small)**. The long paragraphs get **smaller**, fixing problem #1. On "should importance be noted by the user?" — **yes, but through size/whitespace/position, never a badge or 'Important' label**; intrinsic salience over explicit markers (Lidwell; NN/g). The user should *feel* the hierarchy at a squint.

**Measure & leading become role-dependent** (today both are global CSS constants): Statement ≈34ch / lh ~1.2; Passage ≈60ch / lh ~1.5.

**Marks:** one opening mark on Statements only; none on Passages. **Author:** Passages only (or omit entirely given single authorship) — never a random subset.

**Alignment:** keep left / ragged-right everywhere.

**Spacing/rhythm:** identical internal padding within a role (Gestalt similarity), stepped on the same scale at md/lg (already supported via the Tailwind token padding fields).

---

## Where each change lands (reuse existing knobs — minimal new code)

`QuoteConfig` already exposes every lever needed: `textSize/Md/Lg`, `authorSize*`, `textFontFamily`/`authorFontFamily`, `padding*`, `showQuotationMarks`, `showAuthor`, `gradientInk*`, `textColorSource`, `coverFlowGradient`. So most of this is **values, not new fields**.

1. **`experiences/abstract/components/Quote/config.ts`** — add three presets built from `DEFAULT_QUOTE_CONFIG`: `STATEMENT_QUOTE_CONFIG`, `PASSAGE_QUOTE_CONFIG`, `FEATURE_QUOTE_CONFIG`. (Presets, not a new enum, per the "reuse existing knobs / don't overcomplicate" preference.)

2. **`experiences/abstract/components/Quote/Quote.module.css` + `Quote.tsx`** — the only genuine code addition: `.text`'s `max-inline-size: 34ch` and `line-height: 1.26` are hardcoded, so they can't differ by role today. Promote them to config-driven CSS custom properties (e.g. `--quote-measure`, `--quote-leading`) set from the preset, matching the existing pattern that already drives `--quote-text-font` etc. in `Quote.tsx:81`.

3. **`pages/wall.tsx` `wallQuoteNodes` (≈5959–6028)** — replace the index arithmetic with the deterministic mapping that already exists: **even index → STATEMENT, odd index → PASSAGE**; pick **one** editorially-strongest fragment as the FEATURE (e.g. the McKinsey statement). Delete `wallQuoteSurfaces`/`wallQuoteInk` (`1714–1715`); replace with the single paper+ink constant.

4. **Standalone "Editorial thought" quote (`wall.tsx:7326`)** — adopt `FEATURE_QUOTE_CONFIG` as its canonical preset (it already consumes `quoteGradients`).

No change to the interleave/placement logic (`WALL_QUOTE_INTERLEAVE_WEIGHTS`, masonry columns) — that governs *distribution*, which is a separate, already-tuned concern.

---

## Verification (design change — observe the real rendering)

1. Run the wall page (isolated dist dir + a non-3000 port per repo hygiene) and capture the wall at **mobile (1 col), tablet (2), desktop (4)**.
2. **Squint test:** Statements should remain the loud accents; Passages should read as calm prose; exactly one Feature should pop. If a long paragraph still dominates, the size step is wrong.
3. **Measure the McKinsey/"That curiosity…" passages:** confirm they now render at reading size, ≈60ch, lh ~1.5, and are comfortably readable (not display blocks).
4. **Contrast:** measure chosen paper+ink with a WCAG checker — body ≥ 4.5:1, large display ≥ 3:1.
5. **Grouping:** confirm the wall visually resolves into *article cards / calm quote layer / one feature* (3 chunks), not ~10 unrelated objects.
6. **Responsive overflow:** Statement display size must not overflow the single-column mobile card; verify md:/lg: steps.
7. Reduced-motion and lift-physics already gated — spot-check unchanged.
8. Before/after screenshots side by side as the evidence artifact.

---

## Open art-direction lever (recommended default chosen; flag for the user)

I recommend the **calm single-paper** direction (quote layer recedes, one chromatic feature). The alternative — keeping gentle chromatic playfulness via a narrow tonal paper band and/or more than one feature — is a legitimate mood choice. Recommendation stands unless the user wants the livelier variant; it does not change the architecture above, only the palette constants and how many Features are allowed.

## References
Sweller 1988; Sweller/van Merriënboer/Paas 1998. Hick 1952; Hyman 1953. Miller 1956. Ware, *Information Visualization* 2012; Treisman & Gelade 1980. Bertin, *Semiology of Graphics*. Tufte, *The Visual Display of Quantitative Information*. Bringhurst, *The Elements of Typographic Style* 2004; Lupton, *Thinking with Type*; Brown, *More Perfect Typography*. Dyson 2004 (line length); Legge & Bigelow 2011 (print size). Lidwell/Holden/Butler, *Universal Principles of Design*. Nielsen/NN/g scanning & minimalist heuristics. WCAG 2.2 §1.4.3.
