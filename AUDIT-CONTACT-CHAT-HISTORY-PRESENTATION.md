# Audit — Contact page chat-history presentation

Scope: `pages/contact.tsx` (the `GuidedIntake` message feed), with config in
`experiences/contact/ContactExperience.config.ts`.
Created 2026-09-22. **Revised 2026-09-22** (operator review — decisions below).
Implementation plan: `PLAN-CONTACT-CHAT-HISTORY-REFINEMENT.md` (P1/P2/F10,
all 3 stages DONE).

---

## F11 — Rounded-corner border artifact on the visitor accent rule (RESOLVED —
## rule removed after two failed attempts, third fix visually confirmed)

**Found:** after Stage 3 (P1 role differentiation) shipped, the visitor
answer's leading accent rule — implemented as a real `border-left` on a box
that also carries `rounded-[22px]` — rendered a visible crescent of the rule
color bulging past the pill's own fill at the top-left/bottom-left corners
(operator-reported, screenshot evidence, 2026-09-22).

**Attempt 1 (WRONG — claimed fixed without adequate visual proof):** swapped
`border-left` for an inset `box-shadow` (`boxShadow: inset {width}px 0 0
var(--contact-border)`), reasoning that an inset shadow "clips cleanly to
border-radius." Initially reported FIXED on a standard-resolution screenshot.
**The operator re-reported the same artifact still present.** A 3–4×
device-scale-factor zoomed re-test (`deviceScaleFactor: 3`, tight crop on the
top-left corner) proved the box-shadow variant produced the *exact same*
crescent — the earlier "fix" was never actually verified closely enough to
catch it.

**Real root cause (found on the second pass):** `rounded-[22px]` on a pill
only ~40px tall means `2 × radius` (44px) exceeds the box's own height — the
shape is a full capsule with **no straight segment anywhere on the left
edge**. Any edge-following treatment (a real border *or* an inset box-shadow)
fundamentally cannot render flush against a curve with no straight run:
offsetting a rounded shape sideways and clipping it to itself produces a
crescent at the corner, regardless of which CSS property draws it. This is a
geometry problem, not a "wrong CSS property" problem — no border/shadow
variant of an edge-following rule can fix it while the pill stays this
capsule-shaped.

**Fix (verified):** removed the edge-following rule entirely —
`visitorAnswerAccentRuleWidthPx` deleted from config/panel/render
(`ContactExperience.config.ts`, `.panel.ts`, `pages/contact.tsx`). Role
differentiation now rests entirely on the fill color and font-weight (both
geometry-independent, no artifact risk) plus the italic/dimmed treatment for
`kind: 'choice'` turns — all already confirmed working. Re-verified at 4×
device-scale-factor with a tight top-left-corner crop (the same zoom level
that exposed the original bug): the rounded edge is now clean with no bulge.
Computed style confirms `boxShadow: none`, `borderLeftWidth: 0px`. Full
regression pass (27 tests) still green.

**Process note for future visual-fix claims:** a fix is only "resolved" once
verified at a zoom level that would actually reveal the reported defect — a
full-page or standard-resolution screenshot is not sufficient proof for a
sub-pixel/corner-level artifact like this one.

---

## 0. Status after operator review (2026-09-22)

The fade behaviour is **accepted by design** and no longer a defect:

- **F2 (scroll can't restore legibility) — DISMISSED.**
- **F3 (hard DOM eviction of old turns) — DISMISSED.**
- **F4 (faded text fails WCAG contrast) — DISMISSED.**
- **F5 (fade curve steepness) — DISMISSED** (same rationale; informational only).

Rationale (operator): this is a *simple form* with few inputs to change, not a
long-lived conversation. Older turns *should* fade out the older they get; we
deliberately do **not** want to preserve/reveal full history or pollute the
experience with unnecessary information. The fade is a feature, not a bug.

Two concerns are now the active focus, both **PENDING**:

- **P1 — Role differentiation** (refines F1, absorbs F7 + F8): make
  operator/agent turns *obviously* distinct **without** copying standard
  messaging-platform conventions (left/right sender bubbles, avatars, read
  receipts). Decision on visual direction still open.
- **P2 — History accuracy** (new, F10): some visitor decisions are never
  written to the transcript, and one edit path duplicates turns — so the
  history misrepresents what actually happened.

Secondary, still open: **F6** (auto-scroll hijack), **F9** (status vs
recap-intro ambiguity).

**No code changes yet** — this pass refines the plan only.

---

## 1. Current mechanics (as built)

**Data model.** Each turn is `{ role: 'agent' | 'visitor', text, variant?:
'status' | 'recap', recapQuestion? }` (`contact.tsx:183`). Turns are appended
to a single `turns` array via `setTurns`.

**Windowing (accepted).** Only the last `messageVisibleCount` turns render:
`turns.slice(-config.messageVisibleCount)` (`contact.tsx:1525`), default **6**
(`config.ts:646`). Older turns are removed from the DOM. *By design.*

**Top-fade (accepted).** Each visible turn's opacity is
`computeMessageFadeOpacity(distanceFromBottom, 6, floor)` (`contact.tsx:1710`,
fn at `:368`), linear from `1.0` (newest) to `messageFadeFloorOpacity` (default
**0.1**, `config.ts:647`), keyed to list position. *By design.*

**Layout.** Scroll container `flex flex-col items-center justify-end`
(`contact.tsx:1705`); every per-turn wrapper `flex w-full justify-center`
(`contact.tsx:1722`) — **every turn horizontally centered, regardless of role**.
Agent = plain `<p>`, no bubble, primary color, text left-aligned in a centered
`w-fit` block. Visitor = centered pill `mx-auto ... rounded-[22px]
bg-black/[0.06] px-4 py-2.5` (`contact.tsx:1780`).

**Auto-scroll.** Scrolls to `scrollHeight` on every `turns.length`/`phase`
change (`contact.tsx:959-972`).

---

## 2. Active concern P1 — Role differentiation (PENDING)

**Problem.** Both roles are centered (`contact.tsx:1722`); the only who-said-
what cue is "faint grey pill vs. plain text," and the pill (`bg-black/[0.06]`,
`contact.tsx:1780`) is a whisper on the light gradient — the differentiator is
weakest exactly when a turn starts to fade. On a glance, agent questions and the
visitor's own answers read as one undifferentiated centered column.

**Constraint (operator).** Make it obvious, but **do not** copy standard
messaging platforms — no opposite-side sender bubbles, no avatars, no
iMessage/WhatsApp grammar.

**Design direction to explore (decision open).** The page already has a latent
editorial grammar worth leaning into rather than replacing: the **agent is an
ambient voice** (prose, no container) and the **visitor's words are captured
into an object** (a pill). Differentiate by *kind of thing*, not by *side*:

- **Option A — Typographic voice split.** Agent stays quiet flowing prose;
  visitor answers take a distinct type treatment (e.g. the visitor answer in a
  different family/weight or a subtle accent color), so "the system speaks" vs.
  "you answered" is legible from the type alone, centered or not.
- **Option B — Editorial asymmetry (the "alignment trick," de-chatted).** Not
  left/right *sender* sides — instead a consistent single-axis offset + a
  quiet marker: agent prose flush to one rhythm; visitor answers inset with a
  thin accent rule or a small leading glyph (a "captured input" mark), reading
  as an echoed field value rather than a chat bubble.
- **Option C — Strengthen the object metaphor.** Keep centered, but make the
  visitor pill unmistakably a solid captured chip (real fill/contrast, maybe a
  faint field-label like a form value) while the agent remains container-less
  prose — pushing the existing "voice vs. captured value" contrast until it's
  obvious without borrowing chat conventions.

Recommend combining a **type/color role cue** (survives the fade) with **one
non-chat spatial cue**. Pick a direction before implementing. Absorbs the old
F7 (pill too faint) and F8 (centered + left-aligned text is anchorless).

---

## 3. Active concern P2 / F10 — History accuracy (PENDING)

The transcript does not faithfully record what happened. Two concrete defects:

### F10a — "Stay anonymous" / skip-name is never recorded
`handleSkipName` → `submitName('')` (`contact.tsx:1327-1330`), and `submitName`
only appends a visitor turn when the text is non-empty
(`contact.tsx:1317-1325`). So choosing **Stay anonymous** adds nothing to the
history: the agent's "What should Manuel call you? This is optional."
(`NAME_QUESTION`) remains the last turn with no answer beneath it, looking as if
the question was ignored/unanswered. The decision *was* made — it just isn't
reflected. (This is the core of the operator's evidence image.)

*Fix direction:* record an explicit visitor turn for the skip choice (e.g. a
turn reading "Staying anonymous" / "No name"), so the answer is visible like any
other. Consider a lightweight turn variant so it can read as a *choice* rather
than typed text if desired.

### F10b — "Edit reply details" duplicates turns
`handleRequestIdentityEdit` ("Edit reply details", `contact.tsx:1421-1427`)
sends the visitor back to the `reply-route` step with the email pre-filled, but
appends nothing. Re-submitting runs `submitReplyRoute` again
(`contact.tsx:1301-1315`), which **re-appends both the email visitor turn and a
fresh `NAME_QUESTION` agent turn**. Result: the email answer and the name
question appear **twice** in the history (visible in the operator's evidence
image), implying a loop that didn't happen.

*Fix direction:* editing an existing answer must operate on the **existing
turn**, not replay the step. Two cases, both must be handled:

- **Value unchanged (operator's added concern).** If the visitor opens an edit
  and submits the *same* value, the transcript must show **no new record at
  all** — the single existing trace simply stays as it was. No second bubble,
  no re-asked question, no "you changed it to the same thing" echo. Re-confirming
  an unchanged answer is a no-op on history; only the flow advances.
- **Value changed.** Rewrite the existing answer turn **in place** (mirroring
  the recap-correction pattern at `contact.tsx:1277-1288`, which locates the
  prior turn and rewrites it rather than appending), and do **not** re-emit the
  downstream question turn that already exists further down the transcript.

The distinction is: an edit is a *mutation of one prior record*, never an
append. Same value → the record is untouched; different value → the same record
is updated. Either way the transcript still contains exactly one email answer
and one name question, in their original positions.

### F10c — General principle
Every visitor-visible decision that advances the flow (skip, send-as-is,
corrections, identity edits) should leave **exactly one accurate trace** in the
transcript:

1. A *new* decision appends one turn.
2. *Re-editing* mutates that existing turn in place — it never appends a second.
3. Re-submitting the *same* value is a history no-op — indicate the same info
   that's already there, add nothing.

Audit every step-transition handler (`submitReplyRoute`, `submitName`,
`submitIdentity`/degraded addendum, correction, send-as-is) against these three
rules before implementing, and add a guard so no handler can stack a duplicate
question/answer pair on re-entry.

---

## 4. Secondary, still open

- **F6 — Auto-scroll hijack (open).** Every new turn force-scrolls to bottom
  (`contact.tsx:968`) with no "already near bottom?" guard. Lower priority given
  the short-form flow, but still worth a guard.
- **F9 — Status vs recap-intro ambiguity (open).** Auto-retry status and the
  recap intro share the muted small treatment (`contact.tsx:1745, 1765, 1775`).

---

## 5. What's working (keep)

Deterministic fade window with a unit test (`contact.fade.test.ts`); the
multiplicative entrance fade composing with position opacity
(`contact.tsx:1712-1721`); `aria-live="polite"` on the feed; reduced-motion
handling; the visitor-bubble containing-block fix (`contact.tsx:1723-1735`); the
single-scroller simplification; and the in-place recap-correction rewrite
(`contact.tsx:1277-1288`) — which is exactly the pattern F10b should adopt.

---

## 6. Decisions (resolved for this plan)

1. **P1 direction — Option B + A combined (recommended, adopted below).** A
   non-chat *spatial* cue (editorial asymmetry, no sender-sides) reinforced by a
   *type/color* cue that survives the fade. Rationale: the operator explicitly
   liked "the alignment trick… without copying standard messaging platforms,"
   and a purely spatial cue vanishes as legibility drops, so it needs the
   type/color partner. Option C's stronger pill is folded in as the visitor
   object treatment.
2. **F10a — record an explicit skip turn**, authored as a *choice* turn (new
   `kind`, see §7.2) reading e.g. "Staying anonymous," visually marked as a
   decision rather than typed text.
3. **F10b — edit = amend in place**, for every editable answer (email, name,
   note), with same-value = history no-op. Requires a stable per-turn field
   discriminator (§7.2).
4. **F6 / F9 — deferred.** Not in this plan; left in §4 as tracked/open.

---

## 7. Implementation plan — P1 + P2/F10

Staged so P2 (correctness) can ship independently of P1 (visual), and neither
blocks the other. All new tunables follow the existing config conventions
(Tailwind-token unions + a `ContactExperience.panel.ts` control), never raw
inline values.

### 7.1 Shared foundation — turn identity (unblocks P2, feeds P1)

**Problem it solves:** turns are currently anonymous (`role`+`text`+`variant`
only), so nothing can locate "the email turn" or "the name turn" to amend, and
nothing distinguishes a typed answer from a chosen one.

**Change:** extend `ChatTurn` (`contact.tsx:183`) with two optional fields:

- `field?: 'reply-route' | 'name'` — a stable slot id on the visitor answer
  turns that are editable, so an edit can find and rewrite exactly that turn
  (the same role the `variant: 'recap'` discriminator already plays for the
  note). Absent on all other turns.
- `kind?: 'choice'` — marks a turn that records a *decision* rather than typed
  prose (e.g. "Staying anonymous"), so P1 can style it distinctly and screen
  readers can read it as a choice.

**Coupled edits (must land in the same change):**

- `isValidChatTurn` (`contact.tsx:253`) — add both to the validation allowlist
  (string-enum checks, mirroring the existing `variant` check).
- Snapshot compatibility: both fields are *optional and additive*, so old
  persisted snapshots (lacking them) still validate — **no
  `CONVERSATION_SNAPSHOT_VERSION` bump required**. Caveat to note in code: a
  conversation *resumed* from a pre-change snapshot won't carry `field`
  markers, so an edit on such a resumed turn can't locate it; acceptable (the
  amend path falls back to no-op / append-guarded, never crashes).

### 7.2 P2 / F10 — history accuracy

**F10a — record the skip-name choice.** In `handleSkipName`
(`contact.tsx:1327`), stop routing through `submitName('')`. Append one explicit
visitor turn `{ role: 'visitor', kind: 'choice', field: 'name', text: <skip
copy> }` (new constant, e.g. `NAME_SKIPPED_LABEL = 'Staying anonymous'`), clear
input, go to confirm. `nameRef.current` stays empty (delivery unchanged). Net:
the name question now always has a visible answer beneath it.

**F10b — amend-in-place for edits.** Introduce a small helper,
`upsertAnswerTurn(field, text)`, used by every editable-answer submit:

```
find the existing visitor turn whose `field` === field (lastIndexOf-style):
  - not found      → append a new { role:'visitor', field, text }  (first answer)
  - found, same    → no-op on turns  (same value → indicate the same info, add nothing)
  - found, changed → rewrite that turn's text in place  (never append)
```

Apply it in:

- `submitReplyRoute` (`contact.tsx:1301`) — replace the unconditional
  `setTurns(... email)` with `upsertAnswerTurn('reply-route', text)`. **Only
  emit `NAME_QUESTION` + advance to the name step when this was a first answer**
  (no prior `reply-route` turn); on an edit, skip the question and return
  straight to `confirm`. This kills the duplicate email + duplicate
  name-question.
- `submitName` (`contact.tsx:1317`) — non-empty → `upsertAnswerTurn('name',
  text)`; the F10a skip path writes the choice turn (same slot), so re-skipping
  or re-editing the name also amends in place.
- `submitNoteEdit` (`contact.tsx:1273`) — already amends in place; add the
  same-value no-op guard for consistency.

**Editing entry points** (`handleRequestIdentityEdit` `:1421`,
`handleRequestCorrection` `:1413`) are unchanged structurally — they still
pre-fill and reopen the step; the correctness now lives in the submit handlers.

**Guard (F10c):** add a shared assertion/util so no submit can stack a
duplicate question/answer pair on re-entry — the `field` lookup *is* that guard
for answers; for agent questions, gate the `NAME_QUESTION`/`REPLY_ROUTE_QUESTION`
emit on "not already present" the same way.

**Tests:** extend the contact test suite with cases: skip-name records one turn;
edit-email-same-value adds nothing; edit-email-changed rewrites one turn and
does not re-ask name; edit never grows turn count.

### 7.3 P1 — role differentiation (visual)

Implemented in the turn-render block (`contact.tsx:1736-1784`). Keep the feed
centered (the fade + editorial calm depend on it); differentiate by *kind of
thing*, not side:

- **Agent** — unchanged: container-less prose, primary color, the ambient
  "system voice."
- **Visitor answer** — promote from the near-invisible `bg-black/[0.06]` pill to
  a deliberate *captured-value object*: (a) a **stronger, configurable fill**
  (real contrast, so the role cue survives the fade — folds in old F7); (b) a
  **type/color accent** on the value text (weight or a subtle accent hue) so
  "you said this" reads even at low opacity; (c) a **quiet non-chat spatial
  cue** — a consistent single-axis inset + a thin leading accent rule or a small
  "captured input" glyph, reading as an echoed field value, **not** an
  opposite-aligned sender bubble.
- **Choice turns** (`kind: 'choice'`, from F10a) — a lighter variant of the
  visitor object (e.g. italic / reduced fill / a "✓ chosen" affordance) so a
  *decision* is visibly different from *typed words*, while still clearly the
  visitor's.

**New config knobs** (all Tailwind-token unions + panel controls, defaults =
today's look so nothing shifts until tuned): visitor-object fill color, value
accent color, value font-weight, the spatial inset token, and the
leading-rule/glyph toggle. Group them under a new "Message roles" panel section.

**Guardrails:** don't reintroduce a fixed floor or per-viewport math; respect
reduced-motion; keep the visitor bubble's containing-block fix
(`contact.tsx:1723-1735`) intact.

### 7.4 Suggested sequencing

1. **§7.1 + §7.2 first** (correctness, low visual risk, fully testable).
2. **§7.3 next** (visual, behind default-noop config), verified live on the
   confirm screen and a resumed conversation.
3. Revisit **F6 / F9** afterwards if still desired.
