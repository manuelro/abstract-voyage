# Plan: mobile accordion spans full available height + first item open by default

Scope: `pages/about.tsx` and its mobile accordion (`experiences/about/components/AboutMobileAccordion*`).

## Assessment: feasible, low-to-medium risk

Both asks are straightforward, localized changes. No architectural blockers. Estimated effort: small (a handful of CSS rule edits + one `useState` initializer change).

### Root cause of the current gap (screenshot)

The empty band above the accordion headers in the screenshot is **not** empty space inside the accordion itself — it's `.splitLeft`'s own reserved slot rendering with nothing in it.

- At mobile widths (`@media (max-width: 767px)`, `pages/about.module.css:102-108`), `.splitLeft` and `.splitRight` stack as two separate rows and **each individually reserves `min-height: calc(50vh - var(--about-nav-h) / 2)`** — a straight 50/50 split of the remaining viewport below the header.
- `.splitLeft` is the page's narrow column. Earlier in this session, the standfirst headline (`AbstractEditorialHero`) was removed from it entirely, and its only other possible content (`AboutTimeline`) is desktop-only (`{!isNarrowViewport ? <AboutTimeline/> : null}`, `pages/about.tsx:1556`). So **on mobile, `.splitLeft` renders no visible content at all** — only its own background gradient layers (`narrowColumnGradientLayer`, `SpacefieldBackground`) — yet it still claims half the remaining screen.
- `.splitRight` (where the accordion mounts) is left with only the other half, and the accordion itself has no height constraint of its own (`AboutMobileAccordion.tsx:142`, plain `flex w-full flex-col`, sized to content) — so it just renders its natural (short) height inside that half-screen box.

Fixing the height math for `.splitRight` alone, without addressing `.splitLeft`'s now-pointless 50vh reservation, would only get the accordion to "half the screen," not "the entire available space."

### Trade-off worth confirming

`.splitLeft`'s currently-empty reserved band isn't rendering literally nothing — it's showing that column's own gradient/spacefield background art before the accordion starts. Collapsing that reservation to give the accordion the full column removes that standalone gradient band; the accordion's own per-row gradient backgrounds become the only visual from just below the header down. This matches what was asked ("span the entire available vertical space below the header"), but is a visible change beyond a pure bugfix, so it's called out explicitly here rather than silently folded in.

## Implementation plan

### 1. Collapse `.splitLeft`'s mobile reservation, give `.splitRight` the full remaining height

`pages/about.module.css`, mobile media query block (currently lines 102-108):

```css
@media (max-width: 767px) {
  .splitLeft,
  .splitRight {
    height: auto;
    min-height: calc(50vh - var(--about-nav-h) / 2);
    min-height: calc(50dvh - var(--about-nav-h) / 2);
  }
  ...
}
```

Split into two separate rules — `.splitLeft` no longer reserves half the screen (it has nothing to show), `.splitRight` claims the whole remaining height using the exact same vh-then-dvh formula the desktop rule already uses one block up (`pages/about.module.css:30-31`):

```css
@media (max-width: 767px) {
  .splitLeft {
    height: auto;
    min-height: 0;
  }

  .splitRight {
    height: calc(100vh - var(--about-nav-h));
    height: calc(100dvh - var(--about-nav-h));
  }
  ...
}
```

No new CSS custom property needed — `--about-nav-h` already resolves to the mobile header height at this breakpoint (`.main`'s own rule, lines 10-12).

Only touch this page's own module — `.splitLeft`/`.splitRight` are page-owned classes (`pages/about.module.css`), not the shared `SplitColumnLayout` component, so this can't regress `/abstract` or any other `SplitColumnLayout` consumer.

### 2. Confirm/adjust `.splitRight`'s flex stretch behavior

`.splitRight` already has `display: flex` with no explicit `flex-direction`/`align-items` (`pages/about.module.css:86-100`) — default flex behavior (`row` + `align-items: stretch`) already stretches its single child to the container's full cross-axis height. Once `.splitRight` itself has real height (step 1), the accordion's own root div should already be stretched to fill it with no extra change needed. **Verify this live** during implementation — if the accordion's own root needs an explicit `h-full` to actually claim that stretched height (e.g. if some intermediate wrapper breaks the percentage chain), add `h-full` to `AboutMobileAccordion.tsx:142`'s existing `className="flex w-full flex-col"`.

### 3. Default-open the first accordion item

`experiences/about/components/AboutMobileAccordion.tsx:45`:

```ts
const [expandedIndices, setExpandedIndices] = useState<ReadonlyArray<number>>([]);
```

Change the initializer so index 0 starts expanded:

```ts
const [expandedIndices, setExpandedIndices] = useState<ReadonlyArray<number>>([0]);
```

This is independent of `AboutSlidesContext`'s `activeIndex` (confirmed: this accordion doesn't read `activeIndex` on mount, only pushes to it via `onActiveIndexChange` on toggle — `AboutMobileAccordion.tsx:138`) — no other wiring changes needed. Each `AboutMobileAccordionItem`'s existing `expanded={expandedIndices.includes(index)}` (line 151) already does the right thing once the initial array contains `0`.

### 4. Expected remaining behavior (no action needed, stating for clarity)

- If the open first item + four collapsed items' natural heights don't add up to the full container height, empty space remains at the **bottom** of the accordion (not top) once step 1's stretch applies — same as any ordinary accordion with room to spare. Acceptable; this differs from today's "empty gap above everything" bug.
- Items already animate open/collapse via `useExpandableHeight` (`components/useExpandableHeight.ts`, added earlier this session) — no changes needed there; it measures real content height regardless of the container's own size.
- No height-driven media query anywhere in `AboutMobileAccordion.module.css`/`AboutTimeline.module.css` conflicts with this (the one `@media (max-height: 900px)` rule is scoped to the desktop `AboutTimeline`/dock, confirmed unrelated).

## Files to touch

- `pages/about.module.css` — split the mobile media query rule (step 1).
- `experiences/about/components/AboutMobileAccordion.tsx` — one-line `useState` initializer change (step 3), plus a possible `h-full` addition if step 2's live check finds it necessary.

## Verification plan

- Live check at a mobile viewport (e.g. 390×844): confirm the accordion's own box now starts immediately below the header/nav with no visible gap, and the first item (`caption[0]`) renders expanded on a fresh load with no interaction.
- Confirm collapsing/expanding other items still works and doesn't reintroduce the sibling-clipping bug fixed earlier this session (`useExpandableHeight`-based transitions).
- Confirm desktop (`≥768px`) rendering (`AbstractPostDock` branch, `.splitLeft`/`.splitRight` both still `calc(100vh/100dvh - navH)`) is untouched — the edited rule is entirely inside the `@media (max-width: 767px)` block.
- Regression-check `/about` at a tablet width (768-1023px) to confirm the desktop-mode 50/50 grid still renders correctly (unaffected by this change, but worth a visual pass since `.splitLeft`/`.splitRight` share several rules).
