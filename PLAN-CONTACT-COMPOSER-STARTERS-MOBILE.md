# Contact composer starters — mobile layout refinement

## Status

**Implemented and live-verified**, 2026-09-21. Follow-on to
`PLAN-CONTACT-COMPOSER-STARTING-POINTS.md` (that feature is live). This plan
covers only the narrow-viewport (below `md`) presentation of the in-pill
starters affordance, which broke the placeholder onto two lines
(operator-reported; screenshot evidence 2026-09-21: "Start / anywhere"
wrapping at 375px because the `hint` row showed placeholder + hint
side-by-side with no room).

One implementation deviation from §4 below, both strict improvements over
what was drafted there: (1) the mobile placeholder↔hint swap uses an
absolute-stack crossfade (both occupy the identical box, opacity-toggled)
rather than a `hidden`/`display` swap — this also fixes a second,
previously-undetected instance of the same underlying bug: the hint's
`shrink-0` sibling was reserving its full layout width even while
invisible (`opacity: 0`) in ordinary `hidden` mode, meaning "Start
anywhere" could wrap on mobile even before any idle timer fired. The
absolute-stack technique removes the inactive text from flex-width
calculations entirely, fixing both the reported bug and this latent one in
one change, while still allowing a smooth opacity transition (a plain
`display:none`/breakpoint swap couldn't transition). (2) The `hint`-mode
mobile exit is a dedicated "Dismiss starting points" button (`md:hidden`,
reuses `onClose`) rather than folding into the `browsing` cluster's close
× — kept as two distinct controls since they occupy the same slot but
never coexist (mutually exclusive modes), avoiding a same-element
inline-style specificity conflict between the two triggers.

Live-verified via Playwright at 320–375px and 1280px: `tsc --noEmit`
clean, all 7 existing `starterPoints` unit tests pass, and:
- mobile `hidden` mode: "Start anywhere" renders on one line (bug fixed);
- mobile `hint`: "Not sure where to begin?" takes the full row at the
  placeholder's exact left position (measured equal), one line, dismiss ×
  in the trailing slot;
- dismiss × returns to plain placeholder, and does not re-nag on a
  subsequent idle dwell (anti-nag flag set on dismiss, matching browsing);
- mobile `browsing`: stem left-aligned at the placeholder's position,
  `← → ×` grouped as three adjacent ~44×44px squares at the trailing edge
  (measured, ~4px gaps), cycling and close both work;
- desktop (`md`+) fully unchanged: hint/placeholder coexist as before,
  browsing keeps the original centered chevron-stem-chevron row (36px
  chevrons, measured), the mobile dismiss × never renders there.

## Scope

`components/ComposerPill.tsx` only (the starters overlay row + trailing
controls). No new `ContactExperienceConfig` fields — the change is purely
responsive layout via Tailwind's existing `md:` breakpoint (the repo's
canonical 768px boundary, `components/breakpoints.ts`; Tailwind's `md:` is
asserted to match by `breakpoints.test.ts`). `AbstractHeroCtaComposer`
never passes `starterPoints`, so it stays byte-for-byte unaffected — same
"inert unless opted in" contract as every other optional prop.

## 1. Requirements (this task)

1. **Text starts at the placeholder's exact left position.** On mobile,
   whatever text occupies the placeholder row — the `hint` question ("Not
   sure where to begin?") and the `browsing` stem alike — must begin at the
   same left x as the normal placeholder ("Start anywhere"): the pill's
   `ctaButtonConfig.paddingX` inset. No leading label, no centering, no
   indent from a flanking control.
2. **Browsing arrows no longer flank the stem on mobile.** The prev/next
   chevrons move out of the stem row. They sit **next to each other**, as
   **perfect-square** tap targets, grouped **next to the close × at the
   trailing end** of the pill. Net trailing order, left→right: `← → ×`.

These are mobile-only. Desktop (`md`+) keeps today's layout unchanged
(placeholder + hint side-by-side in `hint`; chevron–stem–chevron centered
in `browsing`), because at those widths everything already fits and no
placeholder is sacrificed.

## 2. Current structure (with line refs, ComposerPill.tsx)

- **Overlay row** (`:691`) — absolutely positioned, `inset-x-0`,
  `${paddingX} ${paddingXDesktop} pr-12 md:pr-16` (left inset = paddingX;
  right inset reserves 48/64px for the single trailing control).
  - `hint`/default branch (`:758`): `inline-flex max-w-full items-center
    gap-1.5` holding `SplitTextReveal(placeholder)` + the hint `<span>`
    (dot `·` + the "Not sure where to begin?" button, `:786`).
  - `browsing` branch (`:731`): `flex w-full items-center justify-center
    gap-2` holding `ComposerStarterChevron(left)` + stem `<button>` +
    `ComposerStarterChevron(right)`.
- **Trailing controls** (`:815`–`:900`) — absolutely positioned in one
  slot at `right-2 md:right-4`:
  - send arrow `→` (`:847`) scales/fades to 0 while `isBrowsingStarterPoints`.
  - close `×` (`:878`) scales/fades to 1 while `isBrowsingStarterPoints`.
- `ComposerStarterChevron` (`:110`): `h-9 w-9` (36px) square button, CSS
  border-corner glyph.
- `ComposerStarterCloseIcon` (`:141`): two-bar X; hosted in a
  `min-h-11 min-w-11` (44px) button.

## 3. Target mobile layout (state table)

| Mode | Placeholder row (starts at `paddingX`, left-aligned) | Trailing cluster (pinned right) |
| --- | --- | --- |
| `hidden` | "Start anywhere" (unchanged) | `→` (disabled while empty) |
| `hint` | **"Not sure where to begin?"** only — placeholder text + `·` hidden | `×` dismiss → `hidden` *(exit-to-type, per prior analysis)* |
| `browsing` | current stem only, left-aligned, truncating | **`← → ×`** — square arrow pair adjacent to the close × |

Desktop (`md`+) unchanged in all three rows.

## 4. Implementation approach (pure responsive CSS, no JS breakpoint)

Chosen over a `useBreakpointTier` swap to avoid the hook's SSR-default
`'mobile'` first-paint flash and to keep the component stateless. The two
placements of the chevrons (in-row on desktop, trailing on mobile) are two
rendered instances toggled by `hidden`/`md:` classes; `display:none`
removes the inactive set from the a11y tree and from tab order, so there is
never a duplicate-control problem at any one width.

### 4a. Requirement 1 — text at placeholder position (`hint`)

In the `hint`/default branch (`:758`):
- Wrap the `SplitTextReveal(placeholder)` so that **when `mode === 'hint'`**
  it is `hidden md:inline` (gone on mobile, shown desktop). In `hidden`
  mode it stays visible on mobile as today (it *is* the placeholder).
- The `·` separator (`:799`): `hidden md:inline` whenever `mode === 'hint'`
  (nothing to separate from once the placeholder text is gone on mobile).
- Result: on mobile-`hint` the hint `<button>` is the first and only child
  of the row, so it renders at the row's left edge = `paddingX` = the
  placeholder's start. Keep the row `text-left`; drop `max-w-full`
  constraints that would indent it. The button keeps `whitespace-nowrap`;
  "Not sure where to begin?" (~24 chars) fits one line once "Start
  anywhere ·" is gone within the `pr-12` gutter (one trailing control).

### 4b. Requirement 1 — text at placeholder position (`browsing` stem)

In the `browsing` branch (`:731`):
- Mobile: row becomes `flex w-full items-center justify-start` (was
  `justify-center`), stem `<button>` left-aligned at `paddingX`, `truncate`
  retained, with **increased right padding** to clear the 3-control
  trailing cluster (see §5).
- Desktop (`md`+): restore `justify-center` and show the in-row chevrons.
- The in-row `ComposerStarterChevron` pair: add `hidden md:inline-flex`
  (desktop only). On mobile they are not rendered here — they live in the
  trailing cluster (§4c).

### 4c. Requirement 2/3 — trailing arrow pair next to × (mobile `browsing`)

Restructure the trailing region (`:815`–`:900`) so that, **on mobile while
`isBrowsingStarterPoints`**, it is a single flex cluster pinned right
holding `← → ×` in that order:
- Render a mobile-only chevron pair (`flex md:hidden`, `gap-0` or a hair)
  immediately left of the existing close `×`, each chevron in a
  **`min-h-11 min-w-11` perfect square** (bumped up from `h-9 w-9` for
  touch-target parity with the × and to satisfy "perfect square space" —
  see §6). They reuse `ComposerStarterChevron` (add an optional size prop
  or a `className` override rather than hardcoding 36px).
- The existing close `×` stays as-is (rightmost, `right-2 md:right-4`).
- The send arrow `→` continues to scale/fade to 0 in browsing (unchanged);
  the chevron pair and × occupy the freed space.
- **Transitions:** the mobile chevron pair animates in on the same
  `transform/opacity` scale as the × (reuse `transitionDurationMs`/
  `transitionEasing` from the `starterPoints` prop) so the whole trailing
  cluster resolves as one beat, not a pop.
- **a11y/focus:** only the visible set is focusable (`display:none` on the
  hidden breakpoint's set). Keep the existing `aria-label`s ("Previous
  starting point" / "Next starting point" / "Close starting points").

## 5. Padding / clearance math

- The overlay row's right inset (`pr-12 md:pr-16`) reserves room for the
  trailing control(s). On mobile it must clear:
  - `hint`: one control (`×`) → `pr-12` (48px) is enough.
  - `browsing`: three controls (`← → ×`) at 44px each ≈ 132px plus the
    `right-2` edge inset → the **stem row needs a larger mobile-browsing
    right padding** (≈ `pr-32`/128–140px). Apply this only to the browsing
    stem row on mobile (`pr-32 md:pr-16` scoped to the browsing branch), not
    to `hint`/`hidden`.
- The underlying `<textarea>` keeps its own `pr-12 md:pr-16` — it is
  caret-transparent and non-interactive while browsing, and its padding
  does not drive the absolutely-positioned overlay, so no change needed
  there. Verify no visible caret/scroll artifact behind the wider cluster.

## 6. "Perfect square space" — interpretation (confirm)

Interpreted as: **each** chevron is a perfect square tap target
(`min-h-11 min-w-11` = 44×44, Apple HIG / Material touch minimums, Fitts's
Law), the two sit immediately adjacent (a paired control, minimal/zero
gap), and the pair sits directly left of the trailing × (which stays pinned
at the pill's right end). Net trailing order `← → ×`.

Open sub-decisions to confirm before building:
1. **One combined square vs two squares.** Recommendation: two equal 44px
   squares (better touch targets than halving one square). Alternative: a
   single square split into two half-height/half-width hit zones — worse
   for touch, not recommended.
2. **Order.** `← → ×` (× rightmost, "at the end") vs `× ← →`.
   Recommendation: `← → ×` to honor "next to the x icon at the end."
3. **Divider between the pair and ×** (hairline vs whitespace only).
   Recommendation: whitespace only, matching the pill's minimal chrome.

## 7. Relationship to the prior analysis (exit-to-type ×)

The prior-turn analysis established that replacing the placeholder on mobile
creates a transient *mode* (typing affordance momentarily absent), which
per Raskin/Tesler (modes must be visibly indicated and trivially
reversible) and Nielsen heuristic #3 (clearly-marked exits) requires an
explicit exit. This plan realizes that exit as the trailing `×` in **both**
mobile `hint` (dismiss → `hidden`, placeholder + typing restored) and
`browsing` (close → `hidden`). Implementation note: the `×` in `hint` mode
should set the existing `hasEngagedStarterRef` anti-nag flag on dismiss (or
`onClose` should), so the idle hint does not immediately re-appear after the
next 5s pause — reusing the Lumière/Clippy-informed suppression already in
`pages/contact.tsx`. Typing remains the implicit exit in every mode
(existing `resolveStarterModeOnInput`).

If the exit-`×` for `hint` mode is deferred, mobile `hint` falls back to the
disabled send `→` in the trailing slot and typing-only dismissal — the two
layout requirements above still stand on their own.

## 8. Explicitly out of scope

- Desktop layout (all three modes) — unchanged.
- Copy, `STARTER_STEMS` wording, the idle-reveal timing/algorithm, fade-in
  knobs, reappear-after-use (all landed previously).
- Any `ContactExperienceConfig`/panel change — this is CSS-only.
- `AbstractHeroCtaComposer` — does not opt into `starterPoints`.

## 9. Verification plan

1. Widths 320 / 360 / 375 / 414px: `hint` shows "Not sure where to begin?"
   on **one line**, its left edge pixel-aligned with the `hidden`-mode
   placeholder's left edge and with typed text's left edge (measure
   `getBoundingClientRect().left` of all three; assert equal).
2. Same widths, `browsing`: stem left-aligned at `paddingX`, truncating
   cleanly; `← → ×` grouped at the trailing end, each ≥44×44, none
   overlapping the stem; tapping ← / → cycles in place; tapping × exits to
   `hidden`; tapping the stem selects (existing reveal-to-commit).
3. `md`+ (e.g. 1024px): all three modes identical to today (regression
   check — chevrons back in-row, hint side-by-side).
4. Cross the breakpoint live (resize 375↔1024) mid-`browsing`: chevrons
   move between in-row and trailing cluster with no duplicate controls, no
   focus loss, no layout jump in the stem baseline.
5. Reduced-motion: trailing-cluster transition collapses to near-instant
   (matches existing treatment), not removed.
6. Screenshot each mobile state (hint, browsing at ≥2 stems) at 375px and
   one desktop regression shot for the handoff record.
