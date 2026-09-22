# Contact conversation persistence and resume

## Status

**Implemented and live-verified**, 2026-09-22. `conversationPersistenceEnabled`
ships `false` (off by default, per §7.1) — the whole feature is inert until
deliberately turned on. Implementation notes and one known minor limitation
below; §1–§7 remain the design rationale/spec this was built from.

### Implementation notes

- `pages/contact.tsx`: `validateConversationSnapshot` (exported, unit-tested
  in `pages/contact.resume.test.ts`) plus `readConversationSnapshot`/
  `writeConversationSnapshot`/`clearConversationSnapshot` implement §4.1/§4.2.
  The actual restore happens in a **mount-only `useEffect`, never inside a
  lazy `useState` initializer** — reading `localStorage` synchronously at
  render time caused a real, reproducible React hydration mismatch on
  reload (confirmed live), since the server always renders the empty/default
  state and has no `window`/`localStorage` to agree with. Every piece of
  restorable state starts at its ordinary pre-persistence default (matching
  SSR exactly) and only upgrades to the restored values one tick after
  hydration.
- `ConversationResumeNotice` (in `pages/contact.tsx`) is portaled to
  `document.body` — the page's own `lg:translate-y-[var(--contact-optical-y)]`
  ancestor transform would otherwise become the containing block for
  `position: fixed`, constraining the notice to that box instead of the true
  viewport at desktop widths.
- `experiences/contact/useComposerHeroPhase.ts` gained one new returned
  function, `settleImmediately` — a restored conversation with real turns
  was never actually `'centered'` in this browser session, so replaying the
  normal `triggerExit`'s FLIP/dock-glide animation for it briefly rendered
  the greeting on top of the just-restored turns (confirmed live,
  screenshot showed the overlap). `settleImmediately` jumps straight to
  `'settled'`, no animation. This hook has exactly one real consumer
  (`pages/contact.tsx`; `ContactHeroGreeting.tsx` only imports its `HeroPhase`
  type), so editing it is effectively contact-scoped despite living outside
  this plan's originally-listed file scope.
- Config knobs from §5 are all implemented and exposed in a new
  "Conversation resume" panel group (`ContactExperience.panel.ts`), gated
  behind `visibleWhen: config => config.conversationPersistenceEnabled`.

### Known minor limitation

Clicking "Start fresh" resets all conversation state correctly (verified:
storage cleared, composer empty, notice gone), but does **not** re-arm the
centered-hero/greeting-reveal entrance — `useComposerHeroPhase`'s own
`hasExitedRef` is one-shot by design (see its doc comment) and this plan
did not extend it with a "re-enter centered" path. The composer is fully
functional afterward, just without replaying the opening greeting
animation. Low priority; revisit only if it reads as a real gap in practice.

## 1. Problem and current state

`/contact` is a multi-step, high-investment guided intake: the visitor tells
a personal first-contact story in their own words, an agent shapes it into a
recap, then a reply route (email) and optional name are collected before
delivery. All of that state lives only in memory today, so any reload, tab
close, or full navigation loses everything.

Relevant current architecture (`pages/contact.tsx`, `GuidedIntake`):

- Conversation state: `turns` (`ChatTurn[]`), `step`
  (`'message' | 'followup' | 'reply-route' | 'name' | 'note-edit' |
  'degraded-addendum'`), `phase` (`'writing' | 'pending' | 'confirm' |
  'done' | 'failed'`).
- Refs carrying the substantive content: `visitorAnswersRef`,
  `modelTranscriptRef`, `recapRef`, `replyRouteRef`, `nameRef`,
  `recapIsRawRef`, `degradedRef`, `followUpCountRef`, `followUpTokenRef`,
  `submissionIdRef`, `deliveryRetryCountRef`.
- Existing partial precedent: `helpers/pendingComposerDraft.ts` is a
  module-scoped singleton that survives a Pages-Router client-side
  transition (same JS module scope) but **not** a reload or tab close, and
  only carries the abstract.tsx hero draft, not the whole conversation. It
  does not satisfy the "close the window and come back" requirement.
- Server contract: `netlify/functions/intake.js` is a zod-validated,
  staged API (`gap-check` / `recap` / `deliver`) with `MAX_*` length caps,
  a `submissionId`, and a `followUpToken`. A restored client state can
  reference a `followUpToken` that a changed server contract no longer
  honors; this is part of what "check the contract is still valid" must
  cover.

**Sensitivity gradient** (drives every privacy decision below):
`message`/`followup` (free text the visitor is actively composing) -> `recap`
(AI-shaped) -> `reply-route` (email, PII) -> `name` (PII, optional) ->
`confirm` -> `done` (delivered). Persistence stakes rise sharply once PII
enters, and a delivered note must never resurrect.

## 2. Verdict

Add it, but **not** as silent blanket restore of everything. The correct
shape is a **scoped, time-boxed, schema-validated resume that reappears with
a visible, reversible cue**. The operator's original instinct (auto-load,
validate the contract, then present) is right on the mechanism and slightly
wrong on the presentation: "present it" should be a reversible, visible
resume, not a silent rehydration, and the whole feature must be TTL-bound,
purged on delivery, and PII-aware.

## 3. Rationale and literature

Worth doing (user research + strategy):

- **Resumption cost of interrupted work.** An accidental close is a task
  interruption; the cost concentrates in rebuilding lost mental context
  (Altmann and Trafton, *Memory for goals*, Cognitive Science 2002; Trafton
  and Monk, 2007; Mark, Gudith and Klocke, *The cost of interrupted work*,
  CHI 2008). Here the lost "context" is a personal story already told once,
  so re-deriving it is costlier than re-typing form fields.
- **Zeigarnik effect** (1927): incomplete tasks stay cognitively open and
  motivate completion; return-to-complete works with that tension.
- **User work is sacred.** Raskin, *The Humane Interface* (2000); Cooper et
  al., *About Face* (prefer undo over confirmation, never lose work);
  Nielsen heuristics #6 recognition over recall and #1 visibility of system
  status.
- **Abandonment strategy.** Long multi-step intakes abandon heavily and
  progress loss is a driver (Baymard Institute; Wroblewski, *Web Form
  Design*, gradual engagement). Recovering a high-investment conversation
  is a stronger lever than shaving fields.

Why silent auto-restore alone is the wrong presentation (privacy + control):

- **Contextual integrity** (Nissenbaum, 2004/2010): persisting data past the
  moment the user believed it was gone changes the flow they consented to.
  Someone who typed a sensitive inquiry on a shared machine and closed the
  tab may reasonably expect it gone; silently re-exposing it is a real harm.
- **Privacy as boundary control** (Westin 1967; Altman 1975; Palen and
  Dourish, CHI 2003) and **data minimization / purpose limitation** (GDPR
  Art. 5): persist the least that satisfies the goal, with an easy exit.
- **User control and freedom** (Nielsen #3): the restore must be visible and
  reversible, the Google Docs / Gmail-drafts pattern (auto-restore plus a
  quiet dismissible cue and one-tap discard).
- **Defaults are powerful** (Thaler and Sunstein, *Nudge* 2008; Johnson and
  Goldstein, *Do defaults save lives?*, Science 2003): default-on restore is
  defensible only when paired with the visible cue and easy purge.
- **Robustness on load** (Postel's robustness principle): discard a
  malformed or stale snapshot silently rather than half-restore it.

## 4. Recommended design

### 4.1 Persistence

- Store a single versioned snapshot in `localStorage` (the only web store
  that survives a tab close; `sessionStorage` does not). IndexedDB only if
  structured querying is later wanted; localStorage is sufficient here.
- Snapshot payload: `version` (integer, bumped on any shape change),
  `savedAt` (epoch ms), `turns`, `step`, `phase`, and the substantive refs
  listed in section 1. Write is debounced on state change; also write on
  `visibilitychange`/`pagehide` so an abrupt close still captures the latest.
- Single-key, single active conversation. No history, no multi-draft.

### 4.2 "Check the contract is still valid" (load-time gates)

On mount, attempt to load and validate. Any failed gate discards the
snapshot silently (never half-restore):

1. **Schema version** equals the current build's `version`.
2. **Not expired**: `now - savedAt <= TTL` (configurable, see 4.4).
3. **Phase is restorable**: coerce `'pending'` back to `'writing'` (no
   in-flight request survives a reload); **discard outright if `'done'`**
   (already delivered, must never resurrect). `'failed'` restores as a
   resumable state.
4. **Structural validation** of the turn/ref shape (a dedicated validator,
   e.g. a zod schema mirrored from the client types).
5. **Stale AI contract**: if the payload carries a `followUpToken` whose
   shape or issuing contract no longer matches the current server
   expectation, drop the token (and its `followup` step) rather than replay
   an orphaned one; fall back to the nearest clean step.

### 4.3 Presentation (the crux)

Auto-restore the validated thread, but reappear with a **visible, reversible
affordance**, not a silent injection: "Picked up where you left off. Start
fresh?", text plus one inline link action. "Start fresh" purges storage and
resets to a clean `message`/`writing` state. This satisfies visibility of
system status, user control and freedom, and undo-over-confirm at once, at
near-zero friction. No modal, no blocking confirm on entry.

**Placement.** Rendered as its own `position: fixed` element pinned to the
very bottom of the viewport (not inline in the conversation column, not
scoped to the composer pill), horizontally centered, independent of scroll
position and of `heroPhase`/dock layout — it survives every step/phase
transition unless dismissed. It sits above page content in stacking order
but never blocks the composer or its send control (short, single-line
notice; no overlap with the fixed-height composer pill's own bottom-docked
position — verify at implementation time against the smallest supported
viewport, since both are bottom-anchored).

**Dismissal ("acking the conversation").** The notice fades out the moment
the visitor takes any action with the *existing, restored* conversation —
this is read as implicit acknowledgment that the resumed thread is valid and
theirs to continue, so it should feel automatic, not require a second explicit
dismiss on top of the action itself. Concretely, dismiss on:

- Any click on a CTA button already part of the guided-intake flow
  (`Send note to Manuel`, `Edit note`, `Add more`, `Try sending again`,
  confirm/degraded-confirm actions, `Stay anonymous`).
- A real submit of the composer (Enter-to-send or the send-arrow control),
  whichever step it happens on.

Not a dismissal trigger: hovering, focusing the composer without submitting,
or scrolling — those don't signify the visitor has accepted and acted on the
restored state. Clicking "Start fresh" is a separate, explicit path (full
reset) and also removes the notice, but is not "acking" the resumed
conversation — it rejects it.

The fade-out itself is a real transition (duration/easing configurable, see
§5), not an instant unmount, consistent with every other state change on
this page.

### 4.4 Privacy guards

- **TTL**: bounded by default (not indefinite); both the TTL and a master
  enable flag are config knobs in `ContactExperience.config.ts`, consistent
  with this page's config pattern. Default resolved at 24 hours — see §7.2.
- **Purge on delivery**: clear storage the moment `phase` reaches `'done'`.
- **Purge on "Start fresh"** and on an explicit discard.
- **PII-aware staging (recommended, not mandatory for v1)**: persist the
  pre-PII draft (`message`/`followup`/`recap`) eagerly, but gate the
  `reply-route`/`name` tail so a closed tab does not silently hold a
  plaintext email/name for the next person on a shared device. Minimum
  acceptable v1: the short TTL plus delivery-purge plus easy discard above;
  the staged-PII refinement can follow.
- Respect reduced-data expectations: the conservative default is the whole
  feature behind a config flag so it can ship off and be enabled
  deliberately.

## 5. Config knobs (proposed, `ContactExperience.config.ts`)

Follow the existing per-field-doc-comment + panel-field convention already
used throughout this file and `ContactExperience.panel.ts`, and reuse the
established naming/typing precedents (`primaryButton*`/`composerPill*`'s
`*BackgroundColor`, `FontWeightClass`, `CtaButtonMotionEasing`, and
`composerElevationPx`'s shadow-engine-override pattern) rather than
inventing a second convention.

**Feature/lifecycle:**

- `conversationPersistenceEnabled: boolean` (master gate; default likely
  `false` until reviewed).
- `conversationPersistenceTtlMs: number` (expiry window).
- `conversationResumeNoticeAutoDismissMs: number` (optional idle fallback:
  how long the notice lingers before auto-fading with no action taken; `0`
  = stays until an explicit dismissal per §4.3). Independent of, and
  additional to, the action-triggered dismissal in §4.3 — that one is the
  primary, deliberate trigger; this is only a secondary safety net so the
  notice doesn't linger forever for a visitor who never engages further.

**Resume-notice dismissal transition:**

- `resumeNoticeDismissDurationMs: number` — fade-out duration, per §4.3's
  "a real transition, not an instant unmount."
- `resumeNoticeDismissEasing: CtaButtonMotionEasing` — reuses the shared
  easing-token type/table (`CTA_BUTTON_MOTION_EASINGS`) already used for
  every other transition on this page (e.g. `heroContainerFadeInEasing`,
  `composerDockTransitionEasing`).

**Resume-notice typography:**

- `resumeNoticeFontSize: FontSizeClass` — one size, shared by the plain text
  and the link (matches `mandatoryActionsFontSize`'s own precedent for a
  small, single-tier UI string rather than a full Base/Wide/Lg triplet).
- `resumeNoticeTextOpacity: number` (0–1) — opacity of "Picked up where you
  left off." specifically.
- `resumeNoticeLinkOpacity: number` (0–1) — opacity of "Start fresh?"
  specifically, independent of the text's own opacity (mirrors this file's
  existing `mutedTextOpacity`/`recapBodyTextOpacity` precedent of
  per-role, not global, opacity knobs).
- `resumeNoticeLinkFontWeight: FontWeightClass` — weight for "Start fresh?"
  only; the plain text stays at its own (non-configurable, inherited)
  weight, matching the "only the link needs emphasis" framing of the ask.

**Resume-notice container box:**

- `resumeNoticePaddingXPx: number` / `resumeNoticePaddingYPx: number` —
  the notice's own container padding, independent axes (raw px, matching
  this file's numeric-knob convention for plain box metrics elsewhere,
  e.g. `chipPaddingXPx`, rather than the literal-Tailwind-class-union
  convention reserved for cases with an established multi-value scale need,
  e.g. `ContactMandatoryActionsPaddingRight`).
- `resumeNoticeBackgroundColor: string` — the container's fill.

**Resume-notice elevation (shared shadow engine, not a bespoke shadow):**

- `resumeNoticeElevationPx: number` — follows `composerElevationPx`'s own
  established pattern exactly: at implementation time, build a
  `resumeNoticePhysicsConfig` the same way `ComposerPill.tsx`'s own
  `pillPhysicsConfig` is built (`{ ...ctaButtonConfig,
  elevationReactionEnabled: false, shadowElevationRestingPx:
  resumeNoticeElevationPx }`), and drive the notice's box-shadow via the
  same `useCardLiftPhysics` hook every other elevated surface on this page
  already uses — never a hand-rolled CSS `box-shadow` value. Pinned
  (`elevationReactionEnabled: false`), matching the composer pill's own
  choice not to react to hover/press, since this notice is not itself the
  primary interactive surface.

All of the above get a corresponding `ContactExperience.panel.ts` group
(e.g. "Resume notice") mirroring the existing "Confirm buttons"/"Composer
pill"/"Composer resize" groups' field layout and `kind` usage (`color`,
`number`, `select`, `enum`).

## 6. Out of scope

- Cross-device resume (would require server-side session storage and auth;
  this plan is client-local only).
- Persisting a delivered/`done` conversation (explicitly forbidden).
- Multi-conversation history or drafts list.
- Any change to the server intake contract in `netlify/functions/intake.js`.

## 7. Operator decisions (resolved 2026-09-22)

1. **Default state**: `conversationPersistenceEnabled` ships **`false`**
   (off/opt-in) — the whole feature stays behind the flag until reviewed
   live, then flipped on deliberately.
2. **TTL default**: `conversationPersistenceTtlMs` = **24 hours**
   (`86_400_000`) — covers "came back the next morning," not just an
   immediate accidental close.
3. **PII-staging scope**: the §4.4 refinement (persist the pre-PII draft
   eagerly, gate the `reply-route`/`name` tail behind re-engagement) is a
   **fast-follow, not v1**. v1 ships with the TTL + delivery-purge + easy
   "Start fresh" discard only.
4. **Resume-notice copy**: ships as drafted — **"Picked up where you left
   off. Start fresh?"** ("Start fresh?" is the link/action).
5. **Notice width/inset**: **centered pill**, matching the composer
   column's own centered treatment (not a full-bleed bar). Still confirm at
   implementation time against the smallest supported viewport that it
   never overlaps the composer's own bottom-docked position.
