# Contact composer: in-pill starting points

## Status

**Implemented**, using the two substitute visual techniques proposed in §3
(border-corner chevron pair; two-bar rotated X) since no literal reusable
asset existed for either. Verified live via a scripted Playwright pass
against the dev server: hint row on load, hide-on-type (including a
click-through check on the plain placeholder text, away from the link),
5s idle reappearance, browsing carousel open/cycle-forward/cycle-backward,
and select-returns-to-normal with the caret confirmed at the end of the
seeded text. No console errors. `npx tsc --noEmit` and the full `vitest`
suite are clean (pre-existing, unrelated failures in `PanelShell.test.tsx`
and `MobilePinnedArticleSection.test.tsx` are unaffected, confirmed via
`git stash`).

Two follow-up refinements landed after the above, both live-verified the
same way:

- The affordance no longer appears unconditionally on arrival — see the
  revised §2.1/§2.3 (2026-09-20): it now requires a deliberate
  focus-and-pause or hover-and-pause signal (`ComposerPill`'s new
  `onFocusChange`/`onHoverChange` props), both gated on the same
  `starterAffordanceIdleReappearDelayMs`.
- The native textarea caret is hidden (`caret-transparent`) only while the
  browsing carousel is up, since it was otherwise pinned to the field's
  left edge regardless of the carousel's own centered content. Originally
  gated on the broader `showOverlay` flag (true for nearly the entire
  pre-submit window, not just browsing), which regressed the ordinary case
  — no visible caret at all while focused and empty/typing. Corrected
  2026-09-20 to gate on `isBrowsingStarterPoints` specifically.
- Selecting a stem now replays the exact `SplitTextReveal` intro animation
  ENTRY_PLACEHOLDER itself uses on a fresh load (via `ComposerPill`'s
  existing `introText` mechanism) before becoming real, editable value,
  instead of snapping the text in.
- Hardened that reveal-to-commit handoff (2026-09-20): the JS timer that
  swaps the animated intro for real, focused, caret-at-end value now starts
  its countdown after a double `requestAnimationFrame` (once the browser
  has actually committed and painted the newly mounted character spans,
  not from the synchronous call that triggers them), plus one extra
  `heroPlaceholderRevealStepDelayMs` of headroom — so the very last
  character's fade reliably finishes before the swap on a loaded or slower
  device, not just in a fast, empty-tab test run. Verified by sampling
  every animated character's live computed opacity per frame up to the
  swap moment (all at 1.0 before the swap in the automated pass).

## Scope

`pages/contact.tsx` and `components/ComposerPill.tsx` (opt-in props only —
see §4 for why the shared file needs to change and how existing callers stay
unaffected). No change to `netlify/functions/intake.js` or any other flow
already covered by `PLAN-CONTACT-AGENT-PROMPTING.md`.

## 1. Problem with the current design

Today "Not sure where to begin?" and its four sentence stems live in their
own block **below** the composer pill (`pages/contact.tsx:1030-1058`):

- an always-visible helper line,
- a toggle link that expands into a plain vertical list of four buttons,
- a second "Hide starting points" label that replaces the link once expanded.

This reads as a second, separate UI surface stacked under the real input,
competing with the pill for attention before the visitor has typed anything,
and staying inert (present but unused) for anyone who doesn't need it. It
also never reacts to hesitation — it's either open or closed, with no signal
tied to how the visitor is actually behaving.

## 2. Target experience

Everything moves **into the pill itself**, replacing the placeholder row in
place rather than adding a second block underneath it.

### 2.1 Arrival — nothing shown yet

Revised, 2026-09-20: the affordance is never visible on arrival, even
though the field auto-focuses on load. It only appears once one of the two
deliberate-hesitation signals in §2.3 fires. Until then the placeholder row
reads plain `Start anywhere`, identical to before this feature existed.

When it does appear, the row reads:

> Start anywhere · Not sure where to begin?

`Start anywhere` is inert label text (today's placeholder). `·` is a fixed,
non-interactive middle-dot separator (U+00B7, the standard "math floating
dot" glyph). `Not sure where to begin?` is the one interactive element in
that row — same underline/hover treatment already used for the current
"Not sure where to begin?" link.

### 2.2 Typing hides the affordance

The moment the visitor types anything, the whole `· Not sure where to
begin?` fragment fades out (opacity, not a layout shift — `Start anywhere`
was already gone at that point too, same as today's placeholder behavior).
Uses one configurable duration + easing pair (§5).

### 2.3 Reveal signals: focus-and-pause, or hover-and-pause

Revised, 2026-09-20 (supersedes the original "idle reappearance" framing,
which assumed the affordance started visible): the hint only ever appears
via one of two equally-weighted signals, both gated on the same configured
delay (§5) and both cancelled by leaving the signal before it elapses:

- **Focus and pause.** The visitor focuses the pill (including the
  automatic focus on page load) and leaves it untouched — no keystroke —
  for the configured delay.
- **Hover and pause.** The visitor rests the pointer over the pill itself
  (whether or not it's focused) for the same configured delay. Moving the
  pointer off before the delay elapses cancels it; re-entering restarts the
  wait from zero, the same way a tooltip delay behaves.

Either signal alone is sufficient — a visitor who tabs to the field and
pauses gets the same nudge as one who rests the mouse over it while
reading, without needing to also focus it. Any keystroke (even one that's
later deleted back to empty) hides the affordance immediately and cancels
any pending reveal; it never reappears over text the visitor has actually
committed to the field. This only ever fires while the field is empty —
it's a "you paused before starting" signal, not a "you
paused mid-sentence" one.

### 2.4 Browsing mode (stem carousel, in place of the placeholder)

Clicking "Not sure where to begin?" transforms the pill's trailing/leading
furniture in place, over the same duration/easing:

- The send arrow (`→`, currently `ComposerPill.tsx:591`) scales to zero and
  is replaced by a close **X**.
- The placeholder row is replaced by one stem at a time, shown at full
  opacity as a clickable link with its own distinctive hover color (not the
  underline-on-muted-text treatment the idle affordance uses — this is the
  primary interactive content of the row now, so it should read as more
  active).
- Two arrow controls — one left, one right — flank that single visible stem,
  letting the visitor step through the four `STARTER_STEMS`
  (`pages/contact.tsx:142-147`) one at a time. Cycling wraps at both ends.

From here the visitor can:

- **Click the visible stem** — identical outcome to today's
  `selectStarterStem` (`pages/contact.tsx:720-730`): seeds the composer with
  `"${stem} "` and focuses the caret at the end. The pill then animates back
  to its normal state (X → send arrow, stem row → real typed text) using the
  same duration/easing.
- **Click a directional arrow** — advances/retreats the visible stem in
  place; does not select or exit.
- **Click the X** — exits browsing mode with nothing selected, returning to
  whichever of 2.1/2.3's states is currently correct (empty + not idle yet
  → hidden; empty + idle timer already elapsed → hint visible again).

Typing directly into the field while browsing is open is treated as "the
visitor changed their mind" and exits browsing mode the same way the X does,
before the keystroke is applied.

## 3. Two open questions before implementation (please confirm or correct)

The task named two existing visual assets to reuse. I could not find either
of them as a literal, reusable component, and want to confirm my substitute
before building something that looks like a guess:

1. **"The two arrows … same as the one being used in the mobile version of
   the about.tsx accordion items."** The mobile accordion
   (`experiences/about/components/AboutMobileAccordionItem.tsx:282-305`) has
   exactly one rotating affordance per row — a single CSS border-corner
   chevron that rotates between `affordanceRotateCollapsedDeg` and
   `affordanceRotateExpandedDeg` — not two independent left/right arrows.
   **Proposed substitute:** reuse that same visual technique (a CSS
   border-corner chevron, same border thickness/corner-radius/color idiom),
   instantiated twice — one rotated to point left, one to point right —
   rather than importing the accordion component itself (which is tightly
   bound to that page's own expand/collapse config and state). Implemented
   as a small, local, contact-page-only presentational piece, not a shared
   file edit.
2. **"X arrow … same X used for the mobile cuboid nav from the abstract.tsx
   page."** `MobileNavCube.tsx` draws its close X from a 3-bar
   hamburger-to-X morph (`MobileNavCube.module.css:16-33`): the top and
   bottom bars rotate ±45° and translate to meet at center, the middle bar
   fades out. There's no burger state here — the composer's send arrow is
   the "before" state, not three bars. **Proposed substitute:** the same
   two-bar-rotating-to-an-X technique (top bar `rotate(45deg)`, bottom bar
   `rotate(-45deg)`, meeting at center), without the unused middle bar or
   any of the cube's own rotation/config machinery — same DNA, not a literal
   import of `MobileNavCube`.

If either substitute isn't what you had in mind, tell me and I'll adjust
before writing code.

## 4. Why `ComposerPill.tsx` needs new (opt-in) props rather than a fork

`ComposerPill` is shared with `AbstractHeroCtaComposer.tsx`. Per this
repo's own precedent in that file (`introText`, `chrome`, `singleLine`,
`overlayDistribution`, etc. — every one of them optional, every one
documented as "inert for the caller that doesn't pass it"), the established
pattern for a page-specific composer behavior is an additional optional
prop bundle, not a duplicated component. This feature reuses the exact
absolutely-positioned overlay span the hero-entrance intro text already
uses (`ComposerPill.tsx:514-556`) — kept mounted past the hero-entrance
window and made partly interactive — rather than adding a second, competing
overlay. New props (names indicative, finalized during implementation):

- `starterPoints?: { hintLabel: string; options: readonly string[]; index: number; mode: 'hidden' | 'hint' | 'browsing'; onHintClick, onPrev, onNext, onSelect, onClose }`
- `starterPointsTransitionDurationMs`, `starterPointsTransitionEasing`

`AbstractHeroCtaComposer` never passes `starterPoints`, so its rendering is
byte-for-byte unaffected — same guarantee this file already gives every
other optional prop.

## 5. Config (new `ContactExperienceConfig` fields + panel entries)

Following the existing `*DurationMs` / `*Easing: CtaButtonMotionEasing`
convention already used for every other timed transition in this config
(`heroContainerFadeInDurationMs`/`Easing`, `composerDockTransitionDurationMs`/
`Easing`, etc.):

- `starterAffordanceTransitionDurationMs: number` — the one duration reused
  for all four animated moments in §2.2–2.4 (hide-on-type, reveal-on-idle,
  arrow-to-X scale, stem crossfade). One knob, not four, per this project's
  existing "reuse existing knobs, don't overcomplicate" convention.
- `starterAffordanceTransitionEasing: CtaButtonMotionEasing` — paired
  easing for the same set of transitions.
- `starterAffordanceIdleReappearDelayMs: number` — the §2.3 delay, shared by
  both the focus-and-pause and hover-and-pause signals. A delay, not a
  duration, so it stays a separate field.

All three get panel entries in `ContactExperience.panel.ts` under a new
"Starting points" group, mirroring the existing "Hero entrance" group's
shape (`ContactExperience.panel.ts:305-312`).

## 6. State machine (contact.tsx)

Replaces the current single `showStartHelp: boolean`
(`pages/contact.tsx:242`) with:

```ts
type StarterPointsMode = 'hidden' | 'hint' | 'browsing'
const [starterMode, setStarterMode] = useState<StarterPointsMode>('hint')
const [starterIndex, setStarterIndex] = useState(0)
```

Transitions:

| From | Trigger | To |
| --- | --- | --- |
| `hint` | keystroke (any) | `hidden`, idle timer (re)armed |
| `hidden` | idle timer fires, value still empty, composer focused | `hint` |
| `hidden` \| `hint` | click "Not sure where to begin?" | `browsing`, `starterIndex = 0` |
| `browsing` | click left/right arrow | `browsing`, `starterIndex` ± 1 (wrapping) |
| `browsing` | click visible stem | `selectStarterStem(stem)` (unchanged), then `hidden` |
| `browsing` | click X, or any keystroke | back to `hidden` or `hint` per the idle timer's current state |

The idle timer itself: a single `window.setTimeout`, cleared and restarted
on every `onChange` while `step === 'message' && phase === 'writing' &&
!inputValue`, cancelled outright once `inputValue` is non-empty or `step`
moves on. No changes to `submitFirstMessage`, `runGapCheck`, or anything
past the opening message — this is purely a composer-affordance change.

`selectStarterStem` (`pages/contact.tsx:720-730`) is reused unmodified: it
already seeds the composer and places the caret at the end of the sentence,
which is exactly the "returns to normal, cursor at end" requirement.

## 7. Explicitly out of scope

- Category-helper UX, name Skip, review/send flow, original-word toggle, AI
  Gateway config — untouched, per task instructions.
- `STARTER_STEMS` wording — unchanged, only its presentation moves.
- Keyboard arrow-key cycling through stems (left/right arrow *keys*, as
  opposed to the two arrow *buttons*) — the arrow buttons are standard
  focusable/clickable controls (mouse, touch, Enter/Space), which avoids a
  conflict with the textarea's native caret-movement arrow keys. Can be
  added later if wanted.
- Any change to `AbstractHeroCtaComposer.tsx` itself — it doesn't opt into
  the new prop, so nothing about its rendering changes.

## 8. Verification plan

1. Unit test the idle-timer state machine in isolation (mirroring the
   existing `pages/contact.fade.test.ts` pattern) — hint → hidden on
   keystroke, hidden → hint after the configured delay, timer cancellation
   on unmount/step change.
2. Run the actual page through the Contact dev-mode panel at desktop and
   mobile: verify hint visibility on load, hide-on-type, idle reappearance,
   entering/cycling/selecting/exiting browsing mode, and that a selected
   stem lands in the field with the caret at the end.
3. Confirm reduced-motion handling: transitions collapse to nearly-instant
   (matching this codebase's existing `prefersReducedMotion` treatment
   elsewhere, e.g. `MobileNavCube.module.css`'s `1ms` override), not
   removed outright.
4. Screenshot each state (hint, hidden, browsing at each of the 4 stems,
   idle-reappeared) at desktop and mobile for the handoff record.
