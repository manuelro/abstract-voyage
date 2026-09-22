# Plan — Contact chat-history refinement (P1 role differentiation + P2/F10 history accuracy)

Scope: `pages/contact.tsx` (`GuidedIntake` feed) + `experiences/contact/
ContactExperience.config.ts` / `.panel.ts`.
Source analysis: `AUDIT-CONTACT-CHAT-HISTORY-PRESENTATION.md` (findings,
dismissals, and rationale live there; this file is the actionable plan).
Created 2026-09-22. Status: **All three stages DONE (2026-09-22), verified live
+ unit-tested.**

**Done:**
- Stage 1 — `ChatTurn.field`/`kind` added, `isValidChatTurn` updated, no
  snapshot version bump needed.
- Stage 2 — `upsertAnswerTurnInList` (pure, exported, unit-tested in
  `pages/contact.answerTurns.test.ts`, 7 cases) wired into `submitReplyRoute`/
  `submitName`/`handleSkipName`; `submitNoteEdit` got the same-value no-op
  guard. Verified live: skip-name records "Staying anonymous"; editing the
  email to the *same* value changes nothing (no duplicate email/name-question);
  editing to a *different* value rewrites the one email turn in place and does
  not re-ask the name question.
- Stage 3 — new "Message roles" config group (`visitorAnswerFillOpacityPercent`,
  `visitorAnswerFontWeight`, `visitorChoiceOpacity`), reusing
  `--contact-border`/`resolvedBorderColor` (this file's existing border-color
  knob) rather than a parallel color field. Visitor answers render with a
  stronger, colored fill + a heavier weight; `kind: 'choice'` turns render
  italic and dimmed. The originally-planned single-axis leading accent rule
  (`visitorAnswerAccentRuleWidthPx`) was **removed** — see
  `AUDIT-CONTACT-CHAT-HISTORY-PRESENTATION.md`'s own F11: on this pill's
  `rounded-[22px]` capsule shape (2×radius > height, no straight left edge),
  neither a real `border-left` nor an inset `box-shadow` can render flush
  against the curve without a crescent artifact — a geometry problem, not a
  CSS-property problem. Fill + weight (geometry-independent) carry the role
  cue instead. Verified live at 4× zoom on the exact corner that showed the
  bug: clean, no artifact; computed style confirms `boxShadow: none`; panel
  controls confirmed wired.
- Incidental fix: `vitest.config.ts` now aliases `next/font/google` to
  `test/mocks/nextFontGoogle.ts` — a pre-existing regression (unrelated to this
  plan, from an earlier `pages/_app.tsx` `siteSans` export) broke every test
  that imports `pages/contact.tsx`; fixed since it blocked verifying this work.

**Deferred (unchanged from the audit):** F6 (auto-scroll hijack), F9 (status vs
recap-intro ambiguity).

## Context / decisions already made
- Fade behaviour (old F2/F3/F4/F5) is **accepted by design** — do NOT change it.
- **P1** = differentiate agent vs. visitor turns obviously, **without** copying
  messaging-platform grammar (no sender-sides/avatars). Direction: **Option
  B + A** — editorial spatial asymmetry + a type/color cue that survives the
  fade (Option C's stronger object folded in).
- **P2 / F10** = history must record every visitor decision exactly once; edits
  amend in place; re-submitting the same value is a history no-op.
- **F6** (auto-scroll hijack) and **F9** (status vs recap-intro) are **deferred**.

## Guiding rule for P2 (F10c)
Every flow-advancing visitor decision leaves **exactly one accurate trace**:
1. New decision → append one turn.
2. Re-edit → mutate that existing turn in place, never append.
3. Re-submit same value → history no-op (indicate the same info, add nothing).

---

## Stage 1 — Turn identity foundation (unblocks P2, feeds P1)

Turns are currently anonymous (`role`+`text`+`variant`), so nothing can locate
"the email/name turn" to amend, nor distinguish a typed answer from a chosen one.

**Change `ChatTurn` (`contact.tsx:183`)** — add two optional fields:
- `field?: 'reply-route' | 'name'` — stable slot id on editable visitor answers,
  so an edit locates and rewrites exactly that turn (the role `variant:'recap'`
  already plays for the note at `:1277-1288`).
- `kind?: 'choice'` — marks a *decision* turn (e.g. "Staying anonymous") vs.
  typed prose, for P1 styling + screen-reader clarity.

**Coupled edits (same change):**
- `isValidChatTurn` (`contact.tsx:253`) — add both to the validation allowlist
  (string-enum checks, mirroring the `variant` check).
- Persistence: both fields optional/additive ⇒ old snapshots still validate ⇒
  **no `CONVERSATION_SNAPSHOT_VERSION` bump**. Note in code: a conversation
  resumed from a pre-change snapshot lacks `field` markers, so an edit on such a
  turn can't locate it — must fall back safely (append-guarded / no-op), never
  crash.

---

## Stage 2 — P2/F10 history accuracy (correctness; ship independently)

**F10a — record skip-name.** In `handleSkipName` (`contact.tsx:1327`) stop
routing through `submitName('')`. Append one explicit visitor turn
`{ role:'visitor', kind:'choice', field:'name', text: NAME_SKIPPED_LABEL }`
(new constant, e.g. `'Staying anonymous'`), clear input, go to `confirm`.
`nameRef.current` stays empty (delivery unchanged). The name question now always
has a visible answer beneath it.

**F10b — amend-in-place helper.** Add `upsertAnswerTurn(field, text)`:
```
locate existing visitor turn with matching `field` (lastIndexOf-style):
  not found      → append { role:'visitor', field, text }   (first answer)
  found, same    → no-op on turns                            (same value)
  found, changed → rewrite that turn's text in place         (never append)
```
Apply in:
- `submitReplyRoute` (`:1301`) → `upsertAnswerTurn('reply-route', text)`; **emit
  `NAME_QUESTION` + advance to name step ONLY on first answer** (no prior
  reply-route turn). On edit: skip the question, return straight to `confirm`.
  Kills the duplicate email + duplicate name-question.
- `submitName` (`:1317`) → non-empty → `upsertAnswerTurn('name', text)`; F10a
  skip writes the choice turn into the same slot, so re-skip/re-edit also amends.
- `submitNoteEdit` (`:1273`) → already in-place; add the same-value no-op guard.

Editing entry points (`handleRequestIdentityEdit` `:1421`,
`handleRequestCorrection` `:1413`) stay structurally unchanged — correctness now
lives in the submit handlers.

**Guard (F10c):** the `field` lookup is the guard for answers; for agent
questions, gate the `NAME_QUESTION`/`REPLY_ROUTE_QUESTION` emit on
"not already present."

**Tests:** skip-name records one turn; edit-email-same-value adds nothing;
edit-email-changed rewrites one turn and does NOT re-ask name; edit never grows
turn count.

---

## Stage 3 — P1 role differentiation (visual; behind default-noop config)

In the turn-render block (`contact.tsx:1736-1784`). Keep the feed centered
(fade + editorial calm depend on it); differentiate by *kind of thing*, not side:
- **Agent** — unchanged: container-less prose, primary color, ambient voice.
- **Visitor answer** — promote from near-invisible `bg-black/[0.06]` (`:1780`)
  to a deliberate captured-value object: (a) stronger configurable fill
  (survives the fade — folds in old F7); (b) type/color accent on the value text
  (weight or subtle accent hue) so "you said this" reads even at low opacity;
  (c) a quiet **non-chat** spatial cue — consistent single-axis inset + thin
  leading accent rule or small "captured input" glyph; NOT an opposite-aligned
  sender bubble.
- **Choice turns** (`kind:'choice'`) — lighter visitor-object variant (italic /
  reduced fill / "✓ chosen") so a decision looks different from typed words,
  still clearly the visitor's.

**New config knobs** — Tailwind-token unions + `.panel.ts` controls, defaults =
today's look so nothing shifts until tuned: visitor-object fill color, value
accent color, value font-weight, spatial inset token, leading-rule/glyph toggle.
Group under a new "Message roles" panel section.

**Guardrails:** no fixed floor / per-viewport math; respect reduced-motion; keep
the visitor-bubble containing-block fix (`:1723-1735`) intact.

---

## Sequencing
1. Stage 1 + Stage 2 first (correctness, low visual risk, fully testable).
2. Stage 3 next (visual, default-noop config), verified live on the confirm
   screen **and** a resumed conversation.
3. Revisit F6 / F9 afterwards if still desired.

## Verification
- Unit: the F10 test cases above (`contact` test suite).
- Live (isolated dist dir + port): drive the full flow via simulate mode; assert
  skip records a turn, identity edit doesn't duplicate, same-value edit is a
  no-op; screenshot the feed to confirm role differentiation and that defaults
  match today's look before tuning.
