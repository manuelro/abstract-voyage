# PLAN — Mobile CoverFlow: opt-in scroll nav + windowed timeline list with expand

## Context

`/abstract`'s mobile experience (`experiences/abstract/components/MobilePinnedArticleSection/`) currently drives the CoverFlow carousel's active index from **page scroll**: the section reserves extra scroll height (`travelPx`), and scrolling through it moves the carousel one card per `scrollStepPx` of scroll (`syncFromScroll`). A collapsible panel underneath shows a **transform-windowed** slice of the same `AboutTimeline` rows the desktop uses (CSS `translate3d` shifts the `<ol>` so `visibleRows` rows are visible, always trying to keep the active row at the top of that window). Expanding the panel body-locks the page and shows every row.

This plan does two things, both mobile-only, both scoped to this one component + its call site in `pages/abstract.tsx`:

1. **Make scroll-driven carousel navigation opt-in (default off).** The carousel's index should no longer move because the user scrolled the page. Selection instead happens through the list (short or expanded) or the carousel's own swipe gesture.
2. **Replace the transform-windowed short list with a real stop-and-expand list**: show at most **N** rows (config-driven), and when the active row would be the last visible slot, show an appended "Expand list" row. Expanding shows the full list via the same `AboutTimeline` component; selecting a row there collapses the panel and navigates the carousel; the short list then re-windows around the new active row using a fully-specified placement rule (this plan's main deliverable — see "Windowing algorithm" below).

**Known concurrent work:** this exact file has had four "WIP - mobile unstable" commits today from another active session in this same working tree (most recently `1b341e3`, which also includes an unrelated same-session fix of mine, `onActiveIndexCommit`, for a stale-activeIndex-on-collapse bug). Re-read `MobilePinnedArticleSection.tsx` immediately before starting implementation — it may have moved again.

## Verified repo facts

- **`AboutTimeline` (`experiences/about/components/AboutTimeline.tsx`) does no windowing itself.** It renders exactly the `rows` array it's given, in an `<ol role="tablist">`, one `<li>`/`AboutTimelineRow` per entry, keyed by `row.slideIndex` (the *global* article index, not array position). Arrow-key/Home/End navigation (`handleKeyDown`) operates on **positions within the array actually passed in** — so if only a windowed slice is passed, keyboard traversal can only reach rows in that slice. No prop exists to cap/window internally; the caller controls this by slicing `rows` before passing them in. **No changes to this component are needed or planned** — same instance, sliced differently by the caller.
- `pages/abstract.tsx`'s `mobileTimelineRows` (`:1547-1553`) is `abstractTimelineRows` (the desktop rows) mapped down to drop `category` — same order, same `slideIndex` values 0..N-1. Already "the very same timeline component," same data; nothing to unify there.
- `MobilePinnedArticleSectionConfig` (`.config.ts`) already has `visibleRowsLargePhone: number` (default 3) and `visibleRowsSmallPhone: number` (default 2), currently consumed only to compute the transform-window size. **This plan reuses these two fields as N** (the "max list size" the task calls for) rather than adding a parallel field — same intent, same knob, new mechanism underneath.
- `AboutTimelineConfig.maxActiveRows` (a different file, `AboutTimeline.config.ts`) is unrelated — clamped to 0 or 1, meaning "does this timeline have a selection concept at all." Not reused, not touched.
- Current scroll-linked machinery, all in `MobilePinnedArticleSection.tsx`, all conditional on this becoming opt-in:
  - `travelPx`/the `height: calc(100svh + travelPx)` spacer on `.outer` (styles.module.css) — exists solely to give page-scroll something to consume.
  - `sectionTop`, `syncFromScroll`, `scrollToIndex`, the scroll/scrollend/resize/orientationchange listener effect, the 120ms settle-snap timer, `data-mobile-pinned-snap-active` + the `scroll-snap-type` CSS rule, the `#article-*` hash scroll-restoration effect, `handleCarouselDragEnd`'s scroll-projection.
  - `lockOuterScroll`/`unlockOuterScroll`'s **position-restoring** behavior (`lockedScrollYRef`, `window.scrollTo` on unlock) exists to preserve "which page-scroll offset corresponds to which index" across an expand/collapse cycle. Body-locking itself (freezing background scroll while the panel is open) is still wanted in the new mode too — just without the index-restoration math, since there's no scroll-offset-to-index mapping left once scroll no longer drives the carousel.
- `renderCarousel` in `pages/abstract.tsx` (`:4487-4520`) passes the mobile `CoverFlow` both an `activeIndex` prop and an `externalDriver.position` — position drives the actual transform/x/z math (`CoverFlow.tsx`'s `useTransform(scrollX, ...)`), `activeIndex` drives `isActive`/`distanceFromActive` styling. Both must always agree; this already works correctly and is unaffected by this plan except that `position`/`onIndexRequest` stop being scroll-derived in the new mode (see "Carousel navigation" below).
- The control-strip toggle button (`aria-label="Show all articles"`/`"Close article list"`, always rendered at the bottom of `.panel`) is an **existing, unconditional** expand/collapse affordance, separate from the new boundary-triggered "Expand list" row this plan adds. Both remain; see "Decisions needed" #3.
- `styles.module.css` already defines `--mobile-pinned-row-height` and applies it via `.timeline :global(li) { height: var(--mobile-pinned-row-height) }` — the "Expand list" row should consume the same CSS variable + matching typography classes for visual parity ("a very same equal row"), as a sibling element the wrapper renders itself, **not** as an injected fake row inside `AboutTimeline`'s own `<ol>` (keeps the shared component untouched and keeps the tablist's ARIA semantics clean — a distinct `<button>` immediately after the tablist, not a fake `role="tab"`).

## Windowing algorithm (the core ask — "properly refine this math")

Given `selectedIndex` (global active index), `totalItems`, and `N` (the resolved `visibleRows` for the current breakpoint tier), compute `windowStart` for the **short** list:

```
function computeWindowStart(selectedIndex, totalItems, N):
  if totalItems <= N:
    return 0                                   # everything fits; show it all, no windowing

  maxStart = totalItems - N
  afterAvailable  = totalItems - 1 - selectedIndex   # items strictly after selectedIndex
  beforeAvailable = selectedIndex                    # items strictly before selectedIndex

  if afterAvailable >= N - 1:
    start = selectedIndex                       # Rule A — selected at TOP, (N-1) follow
  elif beforeAvailable >= N - 1:
    start = selectedIndex - (N - 1)             # Rule B — selected at BOTTOM, (N-1) precede
  else:
    start = selectedIndex - (N - 1)             # Rule C — neither side has a full (N-1);
                                                  # best-effort fill, see derivation below

  return clamp(start, 0, maxStart)              # safety clamp — see proof below
```

`shortListRows = rows.slice(windowStart, windowStart + min(N, totalItems))`.

**Why Rule C reduces correctly.** Rule C (`totalItems < 2N-1`, i.e. a genuinely short full list where neither "N-1 after" nor "N-1 before" can be satisfied on its own) uses the same `selectedIndex - (N-1)` expression as Rule B, then relies on the final clamp to pull it back into `[0, maxStart]`. Worked example, N=4, totalItems=6, selectedIndex=2 (available-before=2, available-after=3 — wait, recompute: totalItems-1-selectedIndex = 6-1-2=3 ≥ N-1=3, so this actually satisfies Rule A, not C). A genuine Rule-C case: N=4, totalItems=6, selectedIndex=3 → afterAvailable = 6-1-3=2 (<3, Rule A fails), beforeAvailable=3 (≥3 → **this is actually Rule B**, not C). To hit Rule C both must fail simultaneously, which requires `totalItems - N < selectedIndex < N - 1` — only possible when `totalItems < 2N - 2`. Example: N=4, totalItems=5, selectedIndex=2: afterAvailable=5-1-2=2 (<3), beforeAvailable=2 (<3) → Rule C. `start = 2-3 = -1`, clamp(-1, 0, maxStart=1) = **0**. Window = items [0,1,2,3] (4 of the 5 items), selected(2) sits at position 2 of 4 — 2 before it, 1 after — a reasonable best-effort fill given the list only has 5 items total. This is a genuinely narrow case (only reachable when `N < totalItems < 2N-2`, e.g. N=4 → only `totalItems ∈ {5,6}`... recheck 6: N=4,totalItems=6: bound is totalItems<2N-2=6, so totalItems=6 does *not* qualify, only totalItems=5 does for N=4) — see **Decision needed #1** for whether the plain clamp's asymmetric result (favors "more before" here) is acceptable or whether a centered variant is preferred.

**Proof Rules A/B never need the safety clamp (documented, not required for correctness):**
- Rule A: `afterAvailable ≥ N-1` ⟺ `totalItems-1-selectedIndex ≥ N-1` ⟺ `selectedIndex ≤ totalItems-N = maxStart`. `start = selectedIndex`, already in `[0, maxStart]`. ✓.
- Rule B (Rule A false, so `selectedIndex > maxStart`): `beforeAvailable ≥ N-1` ⟺ `selectedIndex ≥ N-1` ⟺ `start = selectedIndex-(N-1) ≥ 0`. Upper bound holds because `selectedIndex ≤ totalItems-1` ⟹ `start ≤ totalItems-N = maxStart`. ✓.

**Worked examples (N=4):**

| totalItems | selectedIndex | Rule | windowStart | Window (0-idx) | Selected position in window |
|---|---|---|---|---|---|
| 10 | 0 | A | 0 | 0,1,2,3 | top (0) |
| 10 | 2 | A | 2 | 2,3,4,5 | top (0) |
| 10 | 8 | B | 6 | 6,7,8,9 | bottom (3) |
| 10 | 9 | B | 6 | 6,7,8,9 | bottom (3) |
| 6 | 4 | B | 3 | 3,4,5 (only 3 — totalItems≤... wait see note | — |
| 5 | 2 | C | 0 | 0,1,2,3 | 3rd of 4 |
| 4 | 1 | trivial | 0 | 0,1,2,3 | (totalItems≤N, show all) |

(The `totalItems=6` row above is a placeholder flag for implementation to re-verify against the real clamp table during code review — hand-tracing every boundary combination for N=3 and N=4 (the two configured defaults) before merging is part of the verification plan below, not just this doc.)

**"Expand list" row visibility:** show it only when `totalItems > N` **and** the active row is rendered at the **last** slot of the current window (`selectedIndex - windowStart === (windowLength - 1)`). This is Rule B/C's signature (Rule A always puts the active row at the top slot). It is an appended row, not a replacement — the short list can therefore show up to `N + 1` rows for the single frame where this affordance is present. Tapping it opens the full-list panel (same `openPanel`/`expandedRef` mechanism as today).

## Carousel navigation (opt-in scroll linkage)

New config field `scrollDrivenNavigationEnabled: boolean` (default **false**) on `MobilePinnedArticleSectionConfig`.

- **`true` (legacy path, preserved as-is):** every scroll-linked mechanism listed above under "Verified repo facts" stays exactly as it is today — spacer height, `syncFromScroll`, snap timer, hash-restore effect, scroll-position bookkeeping in `openPanel`/`closePanel`.
- **`false` (new default):** `.outer` no longer reserves extra scroll height (`height` collapses to whatever the sticky viewport itself needs — effectively `100svh`, no `+ travelPx`); no scroll/scrollend/resize/orientationchange listeners are attached for navigation purposes; no CSS scroll-snap attribute is ever toggled; the hash-restore-on-load effect and the 120ms settle-snap timer are both skipped. `scrollToIndex`'s window-scrolling is replaced by a direct index commit (`onActiveIndexCommit`) — no `window.scrollTo` call at all. The carousel's own drag/swipe gesture (`onDragScrollStart/onDragScroll/onDragScrollEnd`, native to `CoverFlow`) is **unaffected either way** — that's carousel-native touch input, not page scroll, and stays live regardless of this flag (see Decision #2 to confirm this reading matches intent).
- `openPanel`/`closePanel` keep body-locking (`lockOuterScroll`/`unlockOuterScroll`) in both modes — it's still needed to stop the page scrolling underneath a full-screen list panel — but in the `false` mode, `closePanel` no longer computes or restores a `lockedScrollYRef` scroll offset; `unlockOuterScroll` just restores the body/root styles and does not call `window.scrollTo`.

This means the `false`-mode component is meaningfully simpler than today's: no scroll-position math anywhere in the expand/collapse cycle, since there's no scroll offset to preserve.

## Selection & collapse flow (all mode-independent except the scroll bookkeeping above)

1. Tap a row in the **short** list (whether or not the boundary "Expand list" row is currently showing) → `onActiveIndexCommit(index)` fires immediately (already-fixed pattern from the concurrent session's work — see `onActiveIndexCommit`'s existing doc comment in `MobilePinnedArticleSection.tsx`) → carousel navigates to it (swipe-equivalent, no page scroll) → short list re-windows around the new active index per `computeWindowStart` above.
2. Tap "Expand list" (only visible at the boundary) or the always-present control-strip button → `openPanel()` (unchanged: body-lock, focus management).
3. Tap a row in the **expanded/full** list → same `handleListSelect` "expanded" branch as today (`expandedSelectionRef`, `onActiveIndexCommit`, `setPosition`) → `closePanel()` → carousel navigates to the selected item (already correct, verified in this session's earlier `onActiveIndexCommit` fix) → **on the next render, the short list re-windows around the new active index**, which is where the new "current title at top / bottom / best-effort" placement becomes visible.

No new state is needed beyond what already exists (`activeIndex`, `expanded`) — `computeWindowStart(activeIndex, itemCount, visibleRows)` is a pure function of props/config already in scope; it does not need its own `useState`.

## Files to touch

- `experiences/abstract/components/MobilePinnedArticleSection/MobilePinnedArticleSection.config.ts` — add `scrollDrivenNavigationEnabled: boolean` (default `false`); document `visibleRowsLargePhone`/`visibleRowsSmallPhone`'s reused meaning ("N" for the new windowing, not just the old transform-window).
- `experiences/abstract/components/MobilePinnedArticleSection/MobilePinnedArticleSection.panel.ts` — one new boolean field (`{ kind: 'boolean', key: 'scrollDrivenNavigationEnabled', label: 'Scroll-driven carousel nav' }` or the repo's existing boolean-field shape — confirm exact `kind` value against another boolean field elsewhere in this panel registry before writing).
- `experiences/abstract/components/MobilePinnedArticleSection/MobilePinnedArticleSection.tsx` — the bulk of the work:
  - New pure helper `computeWindowStart` (co-located or in a small local `.windowing.ts` — confirm repo convention for pure helpers this size; several sibling components keep small pure helpers in the same file, e.g. `clampIndex` already does).
  - Replace `windowStart = Math.min(safeActiveIndex, maxWindowStart)` with `computeWindowStart(safeActiveIndex, itemCount, visibleRows)`.
  - Remove the CSS-transform windowing approach (`--mobile-pinned-window-start` custom property + `styles.module.css`'s `.timeline :global(ol) { transform: translate3d(...) }` rules) in favor of literally slicing the `rows` array passed into `renderList`'s `AboutTimeline` — the transform approach was built for continuous scroll-linked repositioning; a discrete slice is simpler and correct once scroll no longer drives this list continuously. Confirm this doesn't regress the *expanded* list's own transform-reset rule (`.panel[data-expanded='true'] .timeline :global(ol) { transform: none }`) — that rule becomes dead code once short mode stops using transforms at all; remove it too once confirmed unused.
  - Add the "Expand list" affordance row (new small subcomponent or inline JSX — plain `<button>`, styled via the existing `--mobile-pinned-row-height` variable + matching typography, `aria-label="Show all N articles"` or similar, `onClick={openPanel}`).
  - Gate every scroll-linked effect/callback listed in "Verified repo facts" behind `config.scrollDrivenNavigationEnabled`.
  - Simplify `closePanel`/`unlockOuterScroll`'s scroll-offset bookkeeping to a no-op path when the flag is off (see "Carousel navigation" above).
- `experiences/abstract/components/MobilePinnedArticleSection/styles.module.css` — remove/gate the scroll-snap media rule and the `<ol>` transform rules per above; no other structural change expected.
- `pages/abstract.tsx` — no prop-shape changes anticipated (still passes `activeIndex`/`onActiveIndexChange`/`onActiveIndexCommit`/`rows`/`config` as today); only the `config` object's new `scrollDrivenNavigationEnabled` default flows through from `MobilePinnedArticleSectionConfig`'s own default. Confirm no direct references to `travelPx`-derived layout (e.g. anchor rects used for other overlays) exist outside this component before removing the spacer — grep `MobilePinnedArticleSection` height assumptions in the page.

## Decisions needed

1. **Rule C tie-break (short-list edge case, `N < totalItems < 2N-2`):** use the plain `clamp(selectedIndex-(N-1), 0, maxStart)` fallback (asymmetric, tends to favor showing more *before* the selection in this narrow band — see worked example), or a centered variant (`clamp(selectedIndex - floor((N-1)/2), 0, maxStart)`)? Recommend the plain clamp — it's simpler, reuses Rule B's own formula, and this branch is rare (only fires for list lengths in a narrow band just above N).
2. **Carousel swipe while `scrollDrivenNavigationEnabled` is off:** confirmed reading is that direct touch-drag on the carousel itself keeps working (it's not "page scroll"); only the page-scroll-consumes-extra-height mechanism is disabled. Confirm this matches intent — if swipe should *also* require an opt-in, that's a different (larger) change to `CoverFlow`'s own drag handlers, not this component.
3. **Two expand affordances:** the existing always-visible control-strip button ("Show all articles") and the new boundary-triggered "Expand list" row will both exist simultaneously once this ships. Keep both (recommended — the control strip is a permanent, discoverable escape hatch; the in-list row is a contextual nudge at the exact moment it's useful), or should the control-strip button be removed/hidden now that the in-list affordance exists?
4. **Legacy scroll-driven mode's list UI:** confirmed plan is to share the *same* new windowing/expand list between both modes (only the scroll-to-carousel linkage is gated) rather than maintaining two separate list implementations. Confirm this is acceptable — it does mean the legacy mode's list behavior changes slightly (windowed-with-expand instead of continuous transform-follow) even though its scroll-linkage is unchanged.

## Build order

1. `computeWindowStart` as an isolated pure function + a scratch unit check (hand-run against the worked-examples table above, including the exact N=3/N=4 boundary sweep noted in that table) before touching any rendering.
2. Config + panel field additions (`scrollDrivenNavigationEnabled`), defaulted off — no behavior change yet, verify the panel field renders correctly and the default doesn't alter current behavior when left at today's implicit "always on" scroll linkage (i.e. temporarily default `true` during this step only, flip to the real default `false` in the final step, to keep every intermediate commit visually working).
3. Swap the short list's transform-windowing for real slicing + `computeWindowStart`, carousel navigation untouched — verify the short list still tracks the active row correctly under scroll-driven mode (still `true` at this point).
4. Add the "Expand list" row + its visibility rule, verify it appears/disappears exactly at the documented boundary.
5. Gate the scroll-linked mechanisms behind the flag; flip the real default to `false`; verify swipe-only + list-only navigation fully replaces scroll-driven navigation with the flag off, and that flipping it back to `true` in the config panel restores today's exact scroll-driven behavior (regression check on the legacy path).
6. Remove now-dead CSS (`<ol>` transform rules, scroll-snap media rule) only after step 5 confirms nothing else depends on it.

## Verification

- Live check at a mobile viewport (390×844 and a small-phone height ≤700px, to exercise both `visibleRowsLargePhone`/`visibleRowsSmallPhone` tiers): confirm short list shows exactly N rows, "Expand list" appears only at the documented boundary, expand → select → collapse re-windows per the algorithm for all three rules (A/B/C) using real article counts.
- Hand-trace the windowing table above against the *real* `carouselAndListItems.length` on `/abstract` (not just the synthetic N=4 examples) before calling this done — confirm at least one real selection lands in each of Rule A, B, and C (C may require temporarily reducing the article count or config's N to force it, since it's a narrow band).
- Confirm swipe-driven carousel navigation still works with `scrollDrivenNavigationEnabled: false` (Decision #2's assumption).
- Confirm the config panel's toggle flips behavior live without a reload (dev-mode panel, not production — panels are stripped from production builds per `PLAN-PANEL-BUILD-EXCLUSION-PRODUCTION-READINESS.md`).
- Regression: with `scrollDrivenNavigationEnabled: true`, confirm scroll-linked behavior is pixel/behavior-identical to pre-change (this is the exact area verified in this session's `onActiveIndexCommit` fix — re-run that same manual repro: scroll to an item, expand, select a different item, collapse, confirm it lands and stays on the selected item).
- `npx tsc --noEmit` clean; dev server smoke-test in a real mobile-emulated browser (isolated `CLAUDE_NEXT_DIST_DIR`, non-3000/3001 port) before calling this done.
