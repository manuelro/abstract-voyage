# Wall information architecture and reading rhythm

**Status:** Implemented in source on 2026-10-13; rendered visual verification pending. This document records the intended behavior and acceptance checks, not a claim that the browser outcome has been confirmed.
**Scope:** The wall experience assembled in `pages/wall.tsx`. Shared Quote files may need narrowly scoped changes during implementation if the wall cannot express the chosen treatment through existing props; do not change Quote Lab or standalone-quote defaults as a side effect.
**Reference:** The wall screenshot supplied on 2026-10-13 (`/Users/manuelc/Downloads/wall.jpg`). This plan supersedes the older `PLAN-WALL-QUOTE-TYPOGRAPHY.md` as a description of the current wall, whose quoted code and layout assumptions are now stale.

## Current behavior and design aim

`wall.tsx` makes two wall quotes for each About timeline entry (`line` and `body`), then distributes them after article cards with `WALL_QUOTE_INTERLEAVE_WEIGHTS`. Each wall quote receives the same live Quote Lab config apart from its text and author. `MasonryWall` uses CSS columns, so visual and DOM order run down columns. The screenshot shows multiple similarly prominent blue passages; one very long passage occupies much of a column. A neighboring About quote is not necessarily about the article card beside it.

Make the wall scannable while keeping its expressive cards and complete About narrative. Establish a small, meaningful quote hierarchy and a readable minimum size. Preserve the source text; an excerpt on the wall must have a clear route to its full version.

## Decisions to implement

### 1. Three editorial roles and a full-text route

- Derive a wall-only quote model from timeline data with `entryId`, source kind (`line` or `body`), full text, display text, period/topic, destination, and editorial role: **statement**, **excerpt**, or **feature**.
- Statements show a short complete thought. Excerpts show an editorially chosen opening or summary, ending at a sentence boundary; do not use CSS line clamping as the sole means of shortening because hidden text would still lack a clear route. Long source passages remain accessible at a stable About destination. If the destination lacks a stable entry anchor, add one as part of implementation and check it works.
- The feature role is an editorial choice, not a consequence of text length or array index. Limit the initial wall to one feature quote. Keep all full timeline copy in its canonical About presentation.
- Show no more than roughly eight rendered lines in a wall excerpt at its chosen breakpoint. Treat that as an initial editorial target to validate, not a research-backed universal limit. If copy still exceeds it at the minimum font token, shorten the wall excerpt or give it more width; do not shrink further.

### 2. Responsive type sizes using generated Tailwind tokens

- Choose the size from **estimated or measured rendered lines in the actual quote width**, not raw character count alone. Text, column width, font, padding, language, and breakpoint affect the result. Use a deterministic initial size for server rendering, then a bounded measurement adjustment if needed; avoid visible oscillation and hydration mismatch.
- Trial token ladder for body text: short (up to about four lines) `text-3xl` (30px), medium (about five to eight lines) `text-2xl` (24px), long excerpt `text-xl` (20px). Permit `text-lg` (18px) only as the absolute minimum for a dense edge case; prefer shorter copy first. Re-evaluate thresholds and tokens at base, md, and lg widths. These numbers are design hypotheses, not values prescribed by the cited studies.
- Keep user zoom effective at 200%; do not defeat browser text resizing with fixed-height cards or transforms. Check final rendered size, line count, overflow, and computed line height at each breakpoint.
- Use the existing generated `fontSize` utility and `TailwindTokenValue<'fontSize'>` types. If new Tailwind-backed panel fields become necessary, build them with `createTailwindFieldFactory` and normalize with `normalizeTailwindToken`. Put role-to-token mapping in the wall consumer; do not add local token allowlists, generated-registry edits, dynamic class names, or override the generated field `kind`/`options`. Existing Quote `textSize`/`textSizeMd`/`textSizeLg` may carry static token choices per quote.

### 3. Consistent source and topic cues

- Give every wall quote a concise visible cue such as `ABOUT · 2020` and, where the source has a reliable topic, a short topic name. It should identify the About timeline as the source rather than imply a relationship with the neighboring article.
- Keep the cue's wording, size, placement, and interaction pattern consistent across roles. The full-text route should have a descriptive visible label and keyboard focus; do not make the entire quote look clickable unless the entire quote is a link.
- Use stable timeline IDs for link targets and verify the target lands at the intended stage.

### 4. Controlled visual rhythm

- Preserve vibrant article cards. Let ordinary statement and excerpt quotes share a quieter visual system; reserve a stronger treatment for the single feature. Role, contrast, spacing, and size should express importance consistently.
- Review local groups of four to six items and the first two desktop viewports. Avoid clusters of equally prominent text, and avoid consecutive long excerpts where a short statement or an article could provide a rest. Treat the existing `[1, 2, 1, 2, 2, 1, 3]` weights as a starting distribution, not a semantic rule.
- Keep at least one article card between groups of text where the available content allows it. Preserve DOM reading order and the one-column mobile narrative. Do not change ordering solely to improve a desktop screenshot.

### 5. Honest relationships and grouping

- Do not visually attach an About quote to an article unless editorial data explicitly relates them. Use source labels and spacing to distinguish the two content families.
- If an article and quote genuinely relate, encode the relationship in data and expose it in text and semantics, not only proximity or color. Otherwise link quotes to About and article cards to their articles.
- Check how CSS-column balancing separates items at desktop and tablet widths. If a deliberate card–quote group cannot stay together without harming reading order, favor independent, clearly labeled items over a misleading pair.

## Implementation sequence for a future coding turn

1. Inventory timeline entries, full-text destinations, actual word counts, and rendered line counts at base/md/lg. Record the current wall screenshot as baseline. Decide which source passages need editorial excerpts and which one earns feature status.
2. Add a wall-only quote view model and excerpt data or derivation in `pages/wall.tsx`; preserve the canonical full copy. Establish stable About anchors only if absent.
3. Add role-based size selection using existing `QuoteConfig` font-size tokens. Resolve size per breakpoint from width and measured line count, with a bounded fallback and 18px floor. Keep a stable initial render and test with slow font loading.
4. Render source/topic cues and descriptive full-text links. Set article/quote semantics and destinations according to actual source relationships.
5. Tune quote rhythm, spacing, and feature placement using the real masonry result, without changing the semantic order to force a screenshot composition.
6. Validate with the checks below; adjust thresholds based on observed reading and layout, then document final token choices and excerpt decisions.

## Acceptance and evidence

- At base, md, and lg, capture screenshots of a short statement, medium excerpt, longest excerpt, and feature in their actual wall positions. Include the first two desktop viewports and one-column mobile order.
- Inspect DOM order, computed font size/line height, final line count, overflow, focusable full-text links, and target anchors. Test a narrow viewport, 200% text resize, delayed web font, and unusually long words.
- Verify the wall uses no body-text token below `text-lg` (18px); long content is excerpted or given sufficient space. Confirm no quote silently truncates its only full copy.
- Confirm source cues identify About material, no article relationship is implied without data, and the chosen feature remains distinctive among adjacent cards and quotes.
- Follow `AGENTS.md`: one bounded browser and one private-build Next server on a non-3000 port, after checking existing processes; verify actual rendered states, inspect screenshots and final computed styles, and stop owned processes at handoff.
- Evaluate with a small task test: ask visitors to locate an article by topic and identify where a quoted passage comes from. Compare completion and misattribution against the current wall; use results to refine copy and prominence. Do not describe the design as effective until this or equivalent observation supports it.

## Research basis and limits

- [Sweller (1988), cognitive load](https://onlinelibrary.wiley.com/doi/10.1207/s15516709cog1202_4): supports reducing competing processing demands; it does not specify a quote-length cap.
- [Dyson & Haselgrove (2001), screen reading and line length](https://www.sciencedirect.com/science/article/pii/S1071581901904586): informs the concern with very narrow, long prose; it does not prescribe this wall's font tokens.
- [Bernard, Liao & Mills (2001), online type size and legibility](https://portfolio.erau.edu/en/publications/examining-perceptions-of-online-text-size-and-typeface-legibility/): supports protecting readable size, especially for older readers.
- [Lorch & Lorch (1996), headings and recall](https://scholars.uky.edu/es/publications/effects-of-headings-on-text-recall-and-summarization/): supports consistent source/topic cues.
- [Itti, Koch & Niebur (1998), visual attention](https://hasler.ece.gatech.edu/Courses/MachineLearning/FoundationalPapers/Itti_Koch_Neiber1998.pdf) and [Rosenholtz, Li & Nakano (2007), visual clutter](https://pubmed.ncbi.nlm.nih.gov/18217832/): support controlled salience and less competition, not a fixed feature frequency.
- [Wagemans and colleagues (2012), perceptual grouping](https://www.elderlab.yorku.ca/wp-content/uploads/2016/12/WagemansPsychBull12.pdf): supports treating proximity as a meaningful relationship cue.
- [W3C, resize text](https://www.w3.org/WAI/WCAG21/Understanding/resize-text) is the accessibility acceptance criterion for 200% resizing; it is a standard, not an academic experiment.

## Implementation record

- `pages/wallQuoteModel.ts` derives source-aware statements, sentence-boundary excerpts, one editorial feature, and About deep links from the canonical timeline.
- `pages/WallQuoteItem.tsx` now maps the source-aware roles into the shared `EditorialQuote` variants. Cue, link, rule, surface, and typography are configured in Quote Lab and persisted per variant. Adaptive sizing remains available as an explicit opt-in control with a configurable minimum font-size token; it no longer silently overrides the chosen quote size.
- `pages/wall.tsx` uses those persisted variant designs while preserving the existing article/quote order.
- `pages/about.tsx` selects a stage from a stable `#about-{id}` link; `AboutMobileAccordion.tsx` opens that stage in its separate mobile expand state.
- Focused content and timeline tests plus TypeScript pass. The mandatory breakpoint screenshots, final computed-style checks, link navigation, and 200% resize check remain open until the existing agent-owned verification servers are stopped.
