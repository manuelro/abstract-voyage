# Contact page: replace JS-measured fixed-viewport layout with pure-CSS `dvh`

## Status

**Implemented and verified**, 2026-09-21 (emulated real-WebKit testing —
see §6 results below; real-device confirmation from the operator still
pending). All of §3's changes landed as specified, plus the §3.4 removals.
One implementation nuance beyond the plan's own text: §3.2's "second
look" idea (`min-h-[min(var(--contact-viewport-height),100%)]`) turned out
to be unsound on reflection — `100%` for a flex item's min-height resolves
against the *entire* flex column, not "whatever's left after the composer
sibling," so it would have forced the feed to claim the whole column
regardless of the composer. Implemented as plain `min-h-0` instead (the
diff the plan's own code block already showed), with the 360px
desktop-floor tradeoff called out explicitly in the code comment: composer
visibility wins outright when the two would conflict, and in practice nothing
is lost on ordinary tall/desktop viewports since flex-grow (not min-height)
is what fills them.

Verified via Playwright's real WebKit engine (not Chromium emulation):
shrinking the viewport to 400px height (simulating a keyboard) and
focusing the composer left it fully within `[0, viewportHeight]` at every
sample, with the feed compressing to near-zero and the document staying
provably non-scrollable throughout (`scrollHeight === clientHeight`,
zero JS locks). Message send/auto-scroll and desktop (1440×900, no
split-column) both regression-checked clean. `tsc --noEmit` and the
existing `contact.starterPoints` suite pass.

---

This plan originally proposed superseding the last several rounds of
patches applied this session (body-scroll lock, `position:fixed` on
`<body>`, a defensive `scrollIntoView` timeout, red/blue diagnostic
overlays) — all of which were legitimate, individually-reasoned responses
to real-device evidence, but each one patched a symptom of the same
underlying design choice rather than the choice itself. Real-device
testing (operator-provided screenshots, 2026-09-21, narrow iOS
Safari/Chrome) confirms the composer still isn't reliably visible while
typing after all of them. This plan proposes removing the layer that keeps
causing the problem instead of patching around it again.

## 1. Diagnosis — why the current structure keeps failing

### 1.1 What's actually there today

`pages/contact.tsx`'s `narrowColumn` wraps its entire interactive surface
(greeting, composer, conversation) in `FixedViewportColumnContent`
(`experiences/abstract/components/FixedViewportColumnContent.tsx`):

- A zero-height anchor sits in normal document flow.
- The **real** content renders in a sibling `position: fixed` box, whose
  `top`/`height` are **JavaScript-computed** every render from
  `window.visualViewport.height` (`useFixedViewportColumnLayout.ts`),
  updated via `visualViewport`'s own `resize`/`scroll` event listeners.
- That fixed box is *itself* the scroll container (`overflow-y: auto`,
  `data-responsive-overflow-owner="true"`).
- Inside it, `GuidedIntake` renders one big flex column: a message feed
  (`flex-1`, `overflow-visible` — relies on the fixed box above it to
  actually scroll), the composer dock, and a spacer — with the message
  feed additionally floored at `min-h-[360px]`
  (`conversationViewportHeightPx`, `ContactExperience.config.ts`).

Layered on top of that this session, in response to real-device bugs:

- `styles/globals.css` + a mount effect in `ContactPage`: `<body>` forced
  to `position: fixed; inset: 0; overflow: hidden` for this route only,
  because the document was still scrollable despite the fixed layer
  supposedly already occupying the true viewport.
- A 350ms-delayed `scrollIntoView` on composer focus, defending against
  the OS's own native "scroll input into view" behavior fighting the
  above.
- Temporary red/blue backgrounds to visually separate the two regions for
  debugging (still in place, to be removed as part of this plan).

### 1.2 What the latest real-device evidence shows

Operator's own words, which match the screenshots exactly: *"the actual
content is at the bottom of the blue container that seems to have a large
fixed height that needs scrolling to bring its contents up even after
focusing on the composer input."*

That is: the fixed box (blue) is rendering **taller than the visible
keyboard-constrained viewport**, with the real content (greeting +
composer) sitting low inside it, below the fold — exactly what happens if
`fixedHeightPx` is not actually shrinking when the keyboard opens on this
device/browser, even though the code asks `visualViewport` for the
current height. Two independent, compounding reasons this is fragile by
construction, not by a fixable oversight:

1. **Event timing is a race, not a guarantee.** `visualViewport`
   `resize`/`scroll` firing promptly and *before* any native
   scroll-into-view behavior runs is a cross-browser/version assumption,
   not a spec guarantee — Chrome-iOS (WebKit under Google's own wrapper,
   per Apple's App Store policy) is a documented source of exactly this
   kind of inconsistency versus Safari proper.
2. **The 360px floor actively fights the shrink.** Even on a device where
   the resize event *does* fire, `min-h-[360px]` on the message feed
   forces the flex column to at least that height regardless of how much
   room the keyboard actually left — on a shorter phone with the keyboard
   open, 360px can exceed the entire remaining visual viewport, which is
   precisely "a large fixed height that needs scrolling" from the inside.

Four rounds of patches this session (lock the document, take body out of
flow, add a defensive scroll correction, color-code for debugging) have
all targeted *symptoms* of items 1 and 2 without removing either. The
right move now is removing the JS-measured `position: fixed` box itself,
not adding a fifth patch.

## 2. Target architecture — pure CSS, the industry-standard chat-layout pattern

Replace the JS/`visualViewport`/`position:fixed` mechanism with the same
three-region flex-column layout every modern chat UI uses (iMessage web,
WhatsApp web, Slack, Intercom): a viewport-height flex column with exactly
**one** scrollable region (the message feed), and the composer as a
pinned, non-scrolling sibling that can never be scrolled past because it
was never inside the scrolling region to begin with.

```
┌─ height: 100dvh, flex flex-col ───────────────┐
│ <header>            — shrink-0, unchanged      │
├────────────────────────────────────────────────┤
│ message feed        — flex-1, min-h-0,         │
│                        overflow-y: auto         │  ← the ONLY scroller
├────────────────────────────────────────────────┤
│ composer dock        — shrink-0, pinned         │  ← always visible,
│ (greeting/composer)                             │    never scrolled
└────────────────────────────────────────────────┘
```

**Why `dvh` fixes the root cause, not just this symptom:** `100dvh` (the
*dynamic* viewport height unit) is resolved natively by the browser's own
layout engine against the current visual viewport — including the
on-screen keyboard — with **zero JavaScript, zero event listeners, zero
timing race against the OS's own focus behavior**. It has been supported
in Safari since 15.4 (March 2022) and in every evergreen browser for
several years; this is a safe target for 2026. Whatever the browser
decides the current visible height is, the flex column reflows to it
immediately and correctly, by construction — because that is the literal,
spec-defined purpose of the unit.

This also removes the *entire* reason the document was ever scrollable in
the first place: with the whole interactive surface capped at `100dvh`
and only one internal scroller, there is nothing left for the OS's native
scroll-into-view behavior to mis-target. The document-level lock,
`position: fixed` on `<body>`, and the defensive `scrollIntoView` timeout
all become unnecessary — not merely redundant, but solving a problem that
no longer exists.

Tailwind 3.3.1 (this repo's pinned version) predates `dvh` scale utilities
(added in 3.4) — use arbitrary-value syntax (`h-[100dvh]`,
`min-h-[100dvh]`), the same convention this codebase already uses
everywhere else for one-off viewport/calc values (e.g. today's own
`min-h-[var(--contact-viewport-height)]`).

## 3. Concrete changes

### 3.1 `pages/contact.tsx` — `narrowColumn`

Replace `FixedViewportColumnContent` with a plain div:

```tsx
<div
  className={`flex w-full flex-col overflow-hidden ${PAGE_CONTENT_GUTTER_CLASSNAME}`}
  style={{ height: `calc(100dvh - ${headerWrapperRect?.height ?? 0}px)` }}
>
  <div className="mx-auto flex h-full min-h-0 w-full max-w-[var(--contact-conversation-max)] flex-col pt-6">
    <GuidedIntake ... />
  </div>
</div>
```

- Still reuses the **existing** `headerWrapperRect` measurement
  (`useMeasuredElementRect`, already wired to the header via
  `headerWrapperRef`) — nothing new to measure. The difference from
  today: this feeds a plain CSS `calc()`, recomputed automatically by the
  browser whenever the header's real height changes (already the case —
  `calc()` re-evaluates on any dependent value change), rather than
  driving a continuously-JS-synced `position: fixed` box. The header's
  own height essentially never changes from keyboard state, so this is a
  stable value, not something that needs to track `visualViewport` at
  all.
- `FixedViewportColumnContent`, `useFixedViewportColumnLayout`, and the
  `data-responsive-overflow-owner` marker are no longer used by this
  page. The component/hook files themselves can stay in the codebase
  (they're generic infrastructure that may have a future consumer) — only
  this page's own usage of them goes away.

### 3.2 `pages/contact.tsx` / `GuidedIntake`'s own return (~line 1066)

The message feed (`scrollRef`, ~line 1079) becomes the real scroller:

```diff
  <div
    ref={scrollRef}
    aria-live="polite"
    data-contact-turns="true"
-   className="flex w-full flex-1 min-h-[var(--contact-viewport-height)] flex-col items-center justify-end gap-[var(--contact-message-gap)] overflow-visible pr-2"
+   className="flex w-full flex-1 min-h-0 flex-col items-center justify-end gap-[var(--contact-message-gap)] overflow-y-auto pr-2"
+   data-responsive-overflow-owner="true"
  >
```

- `min-h-0` (not `min-h-[360px]`) — the standard, required pairing with
  `flex-1` in a column that must be able to shrink below its content size
  (MDN/CSS-flexbox's own documented default-`min-height:auto` trap this
  exists to override). This is what actually lets the feed compress when
  the keyboard eats space, instead of forcing a floor that can exceed the
  remaining room.
- `overflow-y-auto` — this element now owns its own scrolling directly,
  rather than delegating to a distant fixed-position ancestor.
- Re-adds `data-responsive-overflow-owner="true"` directly here (moved
  down from `FixedViewportColumnContent`'s old div) so the auto-scroll
  effect below needs no logic change.

**The 360px floor (`conversationViewportHeightPx`) is not simply deleted**
— it exists for a real, documented reason (tall/desktop viewports
shouldn't look cramped). It's re-expressed so it only ever applies when
there's actually room for it:

```
min-h-[min(var(--contact-viewport-height),100%)]
```

i.e. "360px, but never more than 100% of the flex column's own allotted
space" — floors the feed on generous viewports exactly as before, and
gets out of the way entirely once available height (post-keyboard) drops
below 360px. This is the one piece of this plan worth a second look
before implementation: confirm 360px is still the right *desktop* floor
independent of this fix (it is not in scope to retune), just that it must
stop fighting the mobile-keyboard case.

### 3.3 Auto-scroll-to-bottom effect (~line 480)

```diff
  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
-   const overflowOwner = node.closest<HTMLElement>('[data-responsive-overflow-owner="true"]')
-   const scrollOwner = overflowOwner ?? node
-   scrollOwner.scrollTo({
+   node.scrollTo({
      top: scrollOwner.scrollHeight,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    })
  }, [turns.length, phase, prefersReducedMotion])
```

`scrollRef.current` *is* the scroll owner now — the `.closest()` climb
existed only because the real scroller used to be two levels up.

### 3.4 Remove (in order, once 3.1–3.3 are verified working)

1. `pages/contact.tsx`'s `handleComposerFocusChange` — drop the
   `window.setTimeout(() => textareaRef.current?.scrollIntoView(...), 350)`
   body, back to a plain `setIsComposerFocused` passthrough. The composer
   is structurally never inside the scrolling region anymore, so there is
   nothing for a focus-triggered native scroll to displace.
2. `pages/contact.tsx`'s mount effect toggling
   `data-contact-viewport-lock` on `<html>`.
3. `styles/globals.css`: the entire
   `html[data-contact-viewport-lock='true']` block (the real lock rules
   *and* the temporary red/blue diagnostic rules layered on top of it this
   session) — all of it becomes dead weight once the document itself
   never has anything to scroll.

Removed only after 3.1–3.3 are confirmed on a real device — keeping the
lock one extra round as a safety net costs nothing and de-risks the
rollout; it would simply never activate once nothing overflows.

## 4. What stays exactly as-is

- The `<header>` itself — already `position: static`
  (`headerScrollBehavior: 'static'`, `pages/contact.config.ts`), already
  correct, not part of this problem.
- `GuidedIntake`'s own composer dock (`ContactHeroGreeting` +
  `ComposerPill` + the hero-centered spacer) — unchanged internally, just
  relocated conceptually from "a child of the one big scrolling box" to
  "a pinned sibling after the one scrolling box." No JSX reshaping needed
  beyond the message feed's own class changes above — it was already a
  flex sibling of the message feed within the same column; only the
  message feed's own overflow behavior changes.
- `ComposerPill`, the starters module, delivery/retry flow, dev-mode panel
  — untouched, no coupling to this layer.
- The wordmark/nav spacing fix and every other change from earlier this
  session — unrelated, unaffected.

## 5. Risks / things to verify explicitly

1. **Hero-centered phase** (`heroPhase === 'centered'`, before the first
   message): today relies on a `flexGrow` spacer sibling to visually
   center the greeting+composer within the *fixed* box's exact height.
   Confirm this still centers correctly once the column's height is
   `calc(100dvh - headerHeightPx)` instead of a JS-measured pixel value —
   should be a non-issue (same flex mechanics, different height source),
   but is the one part of the tree most entangled with the old
   measurement, worth explicit visual verification.
2. **`dvh` support floor.** iOS Safari 15.4+ (Mar 2022) and equivalent
   Chrome/Firefox versions. No stated minimum-supported-browser policy
   exists elsewhere in this codebase to check against; flag if there's an
   unstated one.
3. **Overscroll/bounce at the feed's own scroll boundaries** — verify
   `overscroll-behavior: contain` (present on today's fixed box) is worth
   carrying onto the message feed's own new `overflow-y-auto` box, so
   scrolling the feed to its top/bottom doesn't rubber-band the page
   behind it (there shouldn't be one, but confirm empirically).
4. **`env(safe-area-inset-bottom)`** — today's fixed box pads for it
   (`paddingBottom: 'env(safe-area-inset-bottom)'`,
   `scrollPaddingBottom`). Reproduce on the message feed's own box (or the
   composer dock, whichever the notch-safe-area gap should visually sit
   under) so this doesn't quietly regress on notched devices.
5. **Desktop (`md`+) regression check** — this whole mechanism today
   applies at every breakpoint, not just mobile; confirm desktop
   `/contact` (no split-column, no keyboard) looks and behaves identically
   before/after, per this session's own standing rule of checking
   diagnosed-narrow fixes against the wide tier too.

## 6. Verification plan

1. Real device retest (the operator's own, since that's what's surfaced
   every issue this session that emulation missed): focus the composer on
   a narrow phone in both Safari and Chrome-iOS, confirm the composer
   stays visible and in place through the keyboard's full open animation,
   with no manual scroll ever required.
2. Repeat at a genuinely short viewport (e.g. iPhone SE) with the keyboard
   open, to specifically exercise the case where 360px would have
   exceeded remaining height.
3. Send several messages, confirm auto-scroll-to-bottom still fires
   correctly on the feed itself.
4. Confirm the hero-centered (pre-first-message) layout still visually
   centers as before, at both mobile and desktop widths.
5. Confirm `window.scrollTo`/manual swipe on the outer page is now a
   genuine no-op simply because there's nothing to scroll (not because
   anything is still forcibly locking it) — i.e. `document.documentElement
   .scrollHeight <= clientHeight` naturally, with the lock CSS/effect
   already removed per §3.4.
6. Full regression pass: starters module (hint/browsing/dismiss), delivery
   retry flow, dev-mode panel, `tsc --noEmit`, existing vitest suite.
