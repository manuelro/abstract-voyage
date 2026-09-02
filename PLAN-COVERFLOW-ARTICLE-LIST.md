# PLAN — Homepage CoverFlow carousel + article list

## Context

`/abstract`'s homepage copy currently names Abstract Voyage nowhere except the title tag, and the split-column layout only shows the existing card stack. This work rewrites the hero copy so the H1 carries the name, moves the "how I work" paragraph to `/contact` where it belongs, removes the synthetic "Thinking in systems." masthead entry from the new surfaces (it stays in the existing stack), and adds two new views onto the same article data: a 3D `CoverFlow` carousel (promoted from an already-built, already-working spike, `CoverFlowLab`) and a native-scroll `ArticleList` index, kept in sync via a single shared `activeIndex`. The existing card stack (`SplitColumnCardPreview`/`CardStack`) is never modified — the new pieces are added alongside it.

Full requirements source: the implementation prompt supplied by the user (copy strings, hard constraints C-01..C-09, component contracts CMP-01..07, state/sync STA-01..07, interaction INT-01..05, layout IA-01..06, accessibility A11Y-01..07, art direction ART-01..05, config CFG-01..04, acceptance QA-01..15). This plan translates those into concrete files and mechanisms verified against the actual repo.

## Verified repo facts (do not re-derive)

- Production split-column layout: `pages/abstract.tsx` lines 3672-3893, via `<PolymorphicLayout>`. `wideColumn` = `<SplitColumnCardPreview articles={dockItems ?? []} labs={labs ?? []} ... />` (the existing stack). `narrowColumn` = `<AbstractEditorialHero headline=... paragraphs=... layoutMode={gridLayoutActive ? 'editorial' : heroLayoutMode} ... />`.
- `gridLayoutActive` (`pages/abstract.tsx:1614`, `heroLayoutMode === 'grid'`) gates a **separate, non-production** branch at lines 3402-3459, only reachable when `config.skyRenderMode === 'legacy'` AND `config.heroLayoutMode` is manually set to `'grid'` via the authoring panel (default `'full'`). Out of scope — confirms IA-06.
- Copy constants: `ABSTRACT_EDITORIAL_HEADLINE` (`pages/abstract.tsx:358-359`), `ABSTRACT_EDITORIAL_PARAGRAPH_1` (`:374-378`, currently reads `'**Abstract Voyage** started as a name...'` — note the brief's "current" quote in CPY-02 omits this bold markup; cosmetic mismatch, the *new* string is unambiguous), `ABSTRACT_EDITORIAL_PARAGRAPH_2` (`:379-382`), `ABSTRACT_EDITORIAL_PARAGRAPHS` array (`:383`).
- `AbstractEditorialHero` (`experiences/abstract/components/AbstractEditorialHero.tsx:32-80`) already takes `paragraphs?: ReadonlyArray<string>` — no signature change needed for a length-1 array.
- The spike is `experiences/abstract/components/CoverFlowLab/CoverFlowLab.tsx` (342 lines), wired into `pages/carousel-lab.tsx`. Explicit fork of `github.com/ashishgogula/coverflow` (MIT), documents its own divergences. Uses `motion/react`. Fully controlled (`activeIndex`/`onActiveIndexChange`, no internal index state). Deliberately does **not** pair `zIndex` with the `z` transform — documented WebKit stacking-context bug workaround, must be preserved verbatim.
  - Current props: `items`, `activeIndex`, `onActiveIndexChange`, `renderItem: (item, index, isActive) => ReactNode`, `itemWidth?`, `itemHeight?`, `stackSpacing?`, `centerGap?`, `rotation?`, `perspective?`, `depthPx?`, `perspectiveOrigin?`, `enableClickToSnap?`, `enableScroll?`, `scrollThreshold?`, `reduceMotion?`, `className?`, `onItemClick?`.
  - `pages/carousel-lab.tsx` externalizes most of this as *responsive ratios* per breakpoint tier (`CarouselLabConfig`: `cardDistanceRatio(Md/Lg)`, `cardWidthRatio(Md/Lg)`, `perspectivePx`, `perspectiveOriginXPercent/YPercent`), resolved inline in that page (lines ~221-261) because raw pixel props don't scale. The promoted component should own this resolution itself.
  - Neighbour title/excerpt hiding is done via a scoped `<style jsx global>` block in `carousel-lab.tsx` (~lines 438-474) targeting `articleCardStyles.titleInk`/`.hoverReveal` (from `components/ArticleCard.module.css`) through a `data-card-state="inactive"` attribute — not a prop on the card component.
- Existing stack: `experiences/abstract/components/SplitColumnCardPreview.tsx` (routes to `CardStack` when `stackConfig.enabled`) → `SplitColumnCardPreview/components/CardStack.tsx` (1289 lines; `useCardStackLayout()`, `useStackStepMotion()`, `useMobileCardStackEmbla()` for touch <768px). Both stack and spike render the same card: `AbstractJournalLabHueFadeCard` in `experiences/abstract/components/AbstractJournalLabCollection.tsx` (props ~538-713, component ~722-751). Active/inactive driven by `stackPresentation.state`, `stackActiveSlide`, `stackNeighborSettled`, `meshActivity`.
- `posts/welcome.md` is the masthead ("Thinking in systems.", id 1, slug `welcome`) — a real post file, not a synthetic entry. Distinguished today only by `firstArticleTitleAndSummaryOnly` config in `SplitColumnCardPreview/config/stack.ts` (~line 102-110), which the stack still needs. `dockItems` (`AbstractPostDockItem[]`) is computed once in `getStaticProps` and passed into the page.
- `experiences/abstract/helpers/deckPalette.ts` `buildDeckPaletteStates()` (565-816) derives per-card palette state from `slides + paletteConfig + activeIndex + tier` — index-driven, callable independently per consumer.
- Reference pattern for shared index state: `experiences/about/AboutSlidesContext.tsx` (69 lines) — `{ activeIndex, setActiveIndex, goToPrevious, goToNext, canGoPrevious, canGoNext, slideCount }`. Multi-consumer on `/about` (context needed there). Abstract's new pair has exactly 2 consumers defined in the same page scope → a plain hook is sufficient, no Context needed.
- Config panel trio pattern (e.g. `AbstractEditorialHero.config.ts`/`.panel.ts`/`.panel.stub.ts`, `AbstractMetalLabList.*`): `.config.ts` = interface + `DEFAULT_*_CONFIG` + `normalize*Config()` with clamping. `.panel.ts` = `defineConfigScope` from `components/Panel/config`, exports a `*_SCOPE_ID`, declarative field schema, `copy` block naming target file/symbol/update strategy. `.panel.stub.ts` = generated Proxy no-ops (per root `PLAN-PANEL-BUILD-EXCLUSION-PRODUCTION-READINESS.md`, webpack aliases `*.panel.ts` → `*.panel.stub.ts` in production builds — zero panel code ships). Central registry: `experiences/abstract/configPanels.ts`, consumed via `abstractConfigPanelRegistry.resolve(SCOPE_ID)`.
- No `scroll-snap-type`/`scroll-snap-align`/`scrollend` usage anywhere in the repo today — this is the first. `IntersectionObserver` is already used repeatedly and inlined per-consumer (no shared wrapper hook exists): `components/proximity/usePointerProximity.ts`, `AbstractJournalLabCollection.tsx`, `AbstractPostDock/hooks/browserState.ts` (`pauseWhenOffscreen`), `AbstractMetalLabList.tsx`.
- `helpers/textEmphasis.tsx`: `renderEmphasisText(text, dimOpacity, emphasisOpacity, emphasisClassName?): ReactNode[]` — already supports `**bold**` and `[text](href)` (renders `next/link`, dotted underline), plus `stripEmphasisMarkup()`. Already used by `AbstractEditorialHero`. Reuse as-is on `/contact`.

## Copy changes (CPY-01..05)

All in `pages/abstract.tsx` unless noted.

1. `ABSTRACT_EDITORIAL_HEADLINE` → `'Abstract Voyage is where I think out loud.'`
2. `ABSTRACT_EDITORIAL_PARAGRAPH_1` → `'It started as a name to write under, loose enough to let me study whatever held my attention. It began with how **light and sound** relate. That habit took me to McKinsey, where I kept studying and experimenting. Then AI opened a **question** I wanted to chase [on my own terms](/about).'`
3. Delete `ABSTRACT_EDITORIAL_PARAGRAPH_2` from `pages/abstract.tsx`; `ABSTRACT_EDITORIAL_PARAGRAPHS = [ABSTRACT_EDITORIAL_PARAGRAPH_1]`.
4. In `pages/contact.tsx`: add `CONTACT_INTRO_PARAGRAPH = 'I start by listening to the people closest to the work. That is usually where the unnamed **risks** are. Once the picture is accurate I plan against **outcomes**, and we test the plan.'`, rendered via `renderEmphasisText` (same call convention as `AbstractEditorialHero`), placed as a new sibling directly above `<ContactHeroGreeting>` so it reads as a lead-in line, not a conversation turn — reuse the file's existing `primaryClassName`/`mutedClassName` conventions rather than new classes.
5. No dates/tenure/em-or-en-dashes/byline anywhere in either new string (verified) or elsewhere in changed files — grep check in verification section.

## RM-01 — Masthead filter

Do not touch `posts/welcome.md`, `helpers/postContent.ts`, or `firstArticleTitleAndSummaryOnly` (`SplitColumnCardPreview/config/stack.ts`) — the stack still needs all three untouched (C-01).

In `pages/abstract.tsx`, add one `useMemo` near where `dockItems` is already consumed:

```ts
// RM-01: excludes the masthead/welcome post (posts/welcome.md, slug
// 'welcome') from the new carousel + list only — it's the site's
// "Thinking in systems." intro, meant for the existing card stack, which
// still shows it unchanged via firstArticleTitleAndSummaryOnly.
const carouselAndListItems = useMemo(
  () => (dockItems ?? []).filter((item) => item.slug !== 'welcome'),
  [dockItems],
);
```

Filter by `slug` (stable identifier), not `id` or title text. This filtered array is the sole data source for both `CoverFlow` and `ArticleList`, keeping their indices identical to each other.

## CMP-01 — No card extraction

**Decision:** both the stack and `CoverFlow` keep calling `AbstractJournalLabHueFadeCard` directly. No new wrapper component. Reasoning: the spike already renders the real card successfully with real palette/mesh/tilt/click-vs-drag logic; a wrapper would either pass through the full prop surface (no abstraction gained) or narrow it (risking divergence from what the stack needs) — exactly what CMP-01 warns against. `CoverFlow`'s `renderItem` becomes the second call site, implemented in a new glue file `experiences/abstract/components/CoverFlow/renderArticleCoverFlowItem.tsx` (promoted from `carousel-lab.tsx` lines ~165-359: palette lookup, `stackPresentation` construction, click-vs-drag disambiguation). `ArticleListRow` renders no card at all — it's plain text markup, unrelated to this decision.

## CMP-02/03 — Promote CoverFlow

New directory: `experiences/abstract/components/CoverFlow/`
- `CoverFlow.tsx` — promoted 1:1 from `CoverFlowLab.tsx` (rename `CoverFlowLabRenderItem` → `CoverFlowRenderItem`, etc.), same internals, WebKit z-index workaround comment preserved verbatim. Flat numeric props collapse into a single `config: CoverFlowConfig`. Keeps `items`, `activeIndex`, `onActiveIndexChange`, `renderItem`, `className`, `onItemClick`, `prefersReducedMotion` (renamed from `reduceMotion` to match the repo's existing naming, e.g. `CardStack.tsx`). No focus/keyboard handling (confirmed absent in the spike already — matches "the list owns that").
- `CoverFlow.config.ts` — `CoverFlowConfig` interface absorbing `CarouselLabConfig`'s responsive-ratio shape (`cardDistanceRatio`/`-Md`/`-Lg`, `cardWidthRatio`/`-Md`/`-Lg`, `cardAspectRatio`, `rotationDeg`, `perspectivePx`, `perspectiveOriginXPercent/YPercent`, `depthPxAtReferenceWidth`, `referenceWidthPx`, `minCardWidthPx`, `enableClickToSnap`, `enableScroll`, `scrollThresholdPx`, `clickVsDragThresholdPx`, `stackSpacingToCenterGapRatio`), `DEFAULT_COVER_FLOW_CONFIG`, `normalizeCoverFlowConfig()` reusing `carousel-lab.config.ts`'s existing clamp bounds. The component (or an internal `useCoverFlowGeometry` hook) resolves tier → concrete pixel values itself, so `pages/abstract.tsx` doesn't reimplement `carousel-lab.tsx`'s inline resolution logic.
- `CoverFlow.panel.ts` / `CoverFlow.panel.stub.ts` — standard trio, `COVER_FLOW_SCOPE_ID = 'abstract/coverFlow'`.
- `renderArticleCoverFlowItem.tsx` — the `renderItem` glue (§CMP-01).

**Neighbour minimal rendering (border + metadata only, no title/excerpt):** promote the scoped CSS mechanism from `carousel-lab.tsx` (targeting `articleCardStyles.titleInk`/`.hoverReveal` via `data-card-state`) into `CoverFlow`'s render path, parameterized by `isActive`. Do not add a new `contentMode` value to `ArticleCardContentMode` — the CSS approach already works without touching the shared card's contract.

**Fate of the spike:** `CoverFlowLab.tsx` and `pages/carousel-lab.tsx` stay exactly as-is, untouched, as a frozen reference — not repointed at the promoted component.

## CMP-04/05/06 — ArticleList, ArticleListRow, shared state

New directory: `experiences/abstract/components/ArticleList/`
- `ArticleList.tsx` — renders `carouselAndListItems.map(...)` as `ArticleListRow`s inside a `<ul>` (or `role="tablist"` per A11Y-01, see below), owns the scroll-snap container (`scroll-snap-type: y mandatory`) and the settled-row detection (§State sync below).
- `ArticleListRow.tsx` — one row, markup differs by state per the brief's A11Y-01 framing: active row = `<a>` with real `href` (navigates on click, per INT-01); inactive rows = a selection control (`<button role="tab">` or similar) that only calls `onActiveIndexChange`, no navigation. `aria-selected`, `aria-controls` wired per A11Y-01.
- `ArticleList.config.ts` / `.panel.ts` / `.panel.stub.ts` — row gap, active-row treatment, max row count (`IA-03`, default "show all"), scroll behavior. `ARTICLE_LIST_SCOPE_ID = 'abstract/articleList'`.
- Shared state: `experiences/abstract/components/ArticleListCoverFlowSync/useArticleListCoverFlowSync.ts` — plain hook (not Context; exactly 2 consumers, both mounted in the same `pages/abstract.tsx` scope), shape mirrors `AboutSlidesContext`: `{ activeIndex, setActiveIndex(index, origin), itemCount }`, `origin: 'coverflow' | 'list' | 'hash' | 'external'`.

## State sync (STA-01..07)

Single-writer guard inside `useArticleListCoverFlowSync`:

```ts
const setActiveIndex = useCallback((index: number, origin: SyncOrigin) => {
  if (index === activeIndex) return; // primary loop-breaker: same-index echo is always a no-op
  const now = performance.now();
  if (origin !== lastOriginRef.current && now < suppressUntilRef.current) return;
  lastOriginRef.current = origin;
  suppressUntilRef.current = now + SYNC_SUPPRESS_WINDOW_MS; // tune against CoverFlow's spring settle time, Phase 5
  setActiveIndexRaw(index);
}, [activeIndex]);
```

Settled-row detection in `ArticleList` (list → index direction only; `CoverFlow → ArticleList` is push-only, `ArticleList` just scrolls its active row into view on non-`'list'`-origin changes):
- Prefer `container.addEventListener('scrollend', ...)` where `'onscrollend' in window`.
- Fallback: `IntersectionObserver` with `rootMargin: '-45% 0px -45% 0px'`, `threshold: 0`, keyed to each row via `data-row-index` — same idiom as `AbstractPostDock/hooks/browserState.ts`'s `pauseWhenOffscreen`. No raw debounced `scroll` handler (explicitly disallowed by the brief — fires during programmatic scroll and is the likely loop source).

URL hash (STA-06): read once on mount to seed initial `activeIndex` (origin `'hash'`), before either component's listeners attach. Write via `history.replaceState` (not `pushState`), debounced, only after `suppressUntilRef`'s cooldown has cleared — hash never calls `setActiveIndex` itself post-mount, so it can't become a third competing writer.

## Layout integration (`pages/abstract.tsx`, IA-01..06)

Both new components are **added as siblings**, not replacements, inside the existing `wideColumn`/`narrowColumn` JSX (lines ~3829-3893):

```tsx
wideColumn={(
  <>
    <SplitColumnCardPreview ... />  {/* unchanged, C-01 */}
    <CoverFlow items={carouselAndListItems} activeIndex={activeIndex}
      onActiveIndexChange={(i) => setActiveIndex(i, 'coverflow')}
      renderItem={renderArticleCoverFlowItem} config={coverFlowConfig}
      prefersReducedMotion={prefersReducedMotion} />
  </>
)}
narrowColumn={(
  <>
    <AbstractEditorialHero ... />  {/* unchanged except CPY copy */}
    <ArticleList items={carouselAndListItems} activeIndex={activeIndex}
      onActiveIndexChange={(i) => setActiveIndex(i, 'list')}
      config={articleListConfig} />
  </>
)}
```

`SplitColumnCardPreview`'s existing `wideColumnClassName="flex flex-col gap-6 ..."` already establishes the flex-col rhythm a second child slots into.

- **Mobile (IA-02):** carousel = 62% of available height below the nav, list = remainder, computed against space-below-nav (not raw viewport height) using `dvh` units — confirmed a height split (the two columns already stack to 100% width via the existing `abstractStackedRow` breakpoint), not a width split.
- **1024-1180px tier (IA-04):** narrower than the existing `lg` (≥1024px) tier in `components/useBreakpointTier.ts`. Add a scoped `matchMedia('(min-width: 1024px) and (max-width: 1179px)')` check local to `CoverFlow`'s own geometry resolution rather than extending the shared `useBreakpointTier` hook (keeps a `CoverFlow`-specific concept out of a widely-depended-on shared hook).
- **IA-05 alignment:** flip the narrow column to left-aligned to match `/about`, rather than mirroring `ArticleList`'s markers to the right edge (approved decision).
- **IA-06:** confirmed — work stays in the `PolymorphicLayout` split path only; `gridLayoutActive` branch untouched.

## Config panels (CFG-01..04)

New files: `CoverFlow.config.ts`/`.panel.ts`/`.panel.stub.ts`, `ArticleList.config.ts`/`.panel.ts`/`.panel.stub.ts`. Registered in `experiences/abstract/configPanels.ts`:

```ts
import { COVER_FLOW_PANEL, COVER_FLOW_SCOPE_ID } from './components/CoverFlow/CoverFlow.panel';
import { ARTICLE_LIST_PANEL, ARTICLE_LIST_SCOPE_ID } from './components/ArticleList/ArticleList.panel';
// added into the existing defineConfigScopeRegistry({...}) call
```
Bindings consumed in `pages/abstract.tsx` via the page's existing `componentConfigBindings` aggregation point (same mechanism every other Abstract scope already uses) — append, don't create a second aggregation site. Before authoring `.panel.stub.ts` files, check whether `scripts/generate-panel-stubs.js` needs to be run to produce them (Phase 7 checkpoint) rather than hand-writing out of sync with the generator.

## Accessibility (A11Y-01..07)

- `ArticleList`: `role="tablist"`, rows `role="tab"` + `aria-selected` + `aria-controls` (pointing at each card's implicit panel region); cards conceptually `role="tabpanel"`.
- Roving `tabindex` across rows, arrow keys / `Home` / `End` operate the list (single tab stop) — `CoverFlow` itself binds no keyboard handlers (confirmed already true of the spike).
- Neighbour cards in `CoverFlow`, if focusable, carry the full title via `aria-label` (title is visually hidden per CMP-02/ART).
- Active state never carried by color alone — active row's distinct markup (real link vs. selection control) already makes the difference structurally visible, not just decorative.
- Every article title present in DOM on first paint via `ArticleList` (A11Y-06) — this is what keeps the homepage crawlable.
- `aria-live="polite"` region (owned by `ArticleList`) announces the newly active row on scroll-snap settle (A11Y-07).

## Build order (verify each phase before the next)

1. **Copy only** (CPY-01..05) — ship independently, zero coupling to the rest.
2. **RM-01 filter** — add `carouselAndListItems`, confirm it excludes `welcome` and that `SplitColumnCardPreview`/`dockItems` are unaffected.
3. **Promote `CoverFlow` standalone** — build the new directory, verify via a scratch/local mount (not `carousel-lab.tsx`, which stays frozen) that it matches the spike's behavior.
4. **Build `ArticleList` standalone** — static/mock `activeIndex`, no sync yet.
5. **Wire the sync guard (STA-01..07)** — mount both side-by-side on a scratch page first; this is the highest-risk phase.
6. **Integrate into `pages/abstract.tsx`** — mount both in final positions; diff `SplitColumnCardPreview` before/after to confirm pixel-identical (C-01).
7. **Config panels (CFG-01..04)** — can run in parallel with 3-6; panels are stubbed out of production regardless.
8. **Accessibility + responsive polish (A11Y, IA-04/05)** — last, refinement on top of working functionality.

## Verification

- `npm run build` (or repo's equivalent) to confirm the production bundle excludes the two new `.panel.ts` files (aliased to their stubs) — inspect for absence of `defineConfigScope`'s full implementation in the client bundle.
- Manual QA against QA-01..15 from the original brief: pixel-diff the active card against the stack's own rendering; verify hover/tilt on the active `CoverFlow` card; verify neighbours show border+metadata only; verify list-select ↔ carousel-drag stay in sync under rapid alternation (no oscillation); verify tap-active-row navigates, tap-inactive-row doesn't; full keyboard traversal of the list including Home/End with `CoverFlow` taking no focus; mobile 62/38 height split with browser chrome show/hide; `prefers-reduced-motion` removes animation but keeps snap points; existing card stack full regression pass; URL hash round-trip (set index, copy link, paste in new tab, confirms same active article); grep all changed files for em/en dashes (`grep -rn '—\|–' pages/abstract.tsx pages/contact.tsx experiences/abstract/components/CoverFlow experiences/abstract/components/ArticleList`) — expect zero hits.
- Visual check: start the dev server (isolated `CLAUDE_NEXT_DIST_DIR`, non-3000/3001 port per repo convention) and click through `/abstract` and `/contact` in a real browser before calling this done.
