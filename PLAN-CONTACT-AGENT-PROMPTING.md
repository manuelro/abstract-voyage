# Contact agent: guided-note experience and prompting plan

## Status

**Approved product direction; implementation pending.** This plan supersedes
the previous lead-qualification framing. It does not change production
behaviour yet.

The contact page is a considered first contact with Manuel, not a sales form
and not a general-purpose chat bot. Its purpose is to make it easy for a
visitor to express a half-formed concern, improve the clarity of that message
only where useful, and let the visitor approve exactly what Manuel receives.

The current local runtime uses the Netlify AI Gateway and
`gemini-2.5-flash-lite`. This experience contract is model-neutral: the
intended new model must be evaluated through the same local Gateway path
before it becomes the production default.

## Success definition

The north-star outcome is a **meaningful, completed first contact**, not a
longer conversation or a greater number of fields collected.

The experience should improve:

- a visitor’s confidence to begin with rough language;
- contact completion, relative to a lean direct-message baseline;
- the context Manuel has for a thoughtful first reply;
- the visitor’s understanding and control of what will be sent.

It must not turn uncertainty into a qualification failure, make a visitor
earn access to Manuel, or use human-like performance as a substitute for
clear interaction design.

## Experience principles

1. **The visitor leads.** Free text is the primary interaction. Do not present
   broad, decontextualised categories that make the contact page resemble a
   support menu.
2. **One useful question beats a sequence.** Ask at most one optional
   clarification after the opening message. The visitor can always continue
   with their own words.
3. **AI edits the handoff, not the relationship.** It may organise a note but
   must not diagnose, sell, qualify, or pretend to be Manuel.
4. **Value precedes personal data.** Show an editable note before asking for a
   reply route. A name is never required.
5. **Consent is a visible state transition.** Nothing is sent until the
   visitor presses an explicit final send action.
6. **Graceful degradation is a feature.** A valid contact remains sendable if
   inference is slow, invalid, or unavailable.

## Visitor flow

```text
Arrival
  → write freely
  → [optional one clarification]
  → editable note preview
  → reply route
  → optional name (Continue | Skip)
  → review and explicit send
  → confirmation or delivery recovery
```

### 1. Arrival — make starting feel safe

Use one short, transparent introduction:

> Tell Manuel what’s on your mind. It can be rough. Relay can help shape the
> note before you send it.

The first screen contains one large free-text composer, with the placeholder
**Start anywhere**, and one quiet helper line:

> Start with what you’re noticing, considering, or trying to work through.

Do not show visible category chips such as “Something isn’t working.” They
are incomplete without an object, ask a visitor to self-classify too early,
and make the experience feel like technical support.

Below the helper line, offer a low-emphasis text action:

> Not sure where to begin?

It is progressive disclosure, not a separate step. On activation it expands
in place into four complete, editable sentence stems:

- I’m trying to make sense of
- I’m considering a change to
- Something is getting in the way of
- I’d value a perspective on

Selecting a stem puts it into the existing composer with exactly one trailing
space and places the cursor after that space. Do not render an ellipsis or
other punctuation: the visitor should be able to continue their sentence
naturally. Selection collapses the aid. It makes no AI request, changes no
conversation state, and may be ignored entirely. The visitor can close the
aid without choosing anything. Keep the direct email fallback available.

### Composer alignment requirement

The text insertion caret must be optically and mechanically vertically
centred within the composer pill. Its typed-text baseline, placeholder, and
caret must share the same line box; do not compensate with a transform or a
separate absolutely positioned text layer, as either can leave the caret
offset from the text when browser font metrics, zoom, or the configured text
size changes.

Implement the pill’s editable control as the height-owning element (or give
it an explicit matching `line-height` and symmetric vertical padding), then
verify the final rendered input/textarea rather than an enclosing wrapper.
Test at desktop and mobile, the minimum/default/maximum configured composer
text sizes, and at least one non-default browser zoom if available.

### 2. First message — decide whether help is useful

After the visitor writes, the system makes one narrow decision:

| Input state | Experience outcome |
| --- | --- |
| Clear, meaningful inquiry | Go directly to note preview. |
| Genuine inquiry with missing context that would materially improve Manuel’s first reply | Ask one optional clarification. |
| Fragmentary or low-signal input (for example, `hI I`, `hi`, or an accidental partial message) | Do not create a note or request contact details. Ask one gentle clarification that invites a real subject. |
| Greeting, meta question, or apparent test | Answer naturally and truthfully, then return to writing. Do not collect details, preview a note, or imply delivery. |
| AI unavailable or invalid | Preserve the visitor’s words and proceed through the raw-send/degraded route. |

#### Low-signal opening guard

The flow must not treat every non-empty string as a genuine inquiry. A
fragment such as `hI I` currently passes validation, is accepted by the
gap-check as “ready,” is faithfully echoed by recap, and then advances to the
email step. That is a sequencing failure, not a useful AI interpretation:
there is no actionable subject for Manuel and no value demonstrated before
personal-data collection.

Add a conservative, server-side low-signal check before recap. It should
identify accidental fragments, greetings, and messages too thin to form a
useful note without imposing a blunt character minimum that would reject
legitimate short messages such as “Need help with a redesign.” Keep this
check close to the Gateway boundary so the browser cannot bypass it and so
the same rule governs local and production flows.

The opening decision should become three-way:

- **Ready:** enough substance exists to create an editable note.
- **Needs follow-up:** a recognisable subject exists, but one detail would
  materially improve Manuel’s first reply.
- **Needs clarification:** the message is too fragmentary to create a useful
  note.

For `needs clarification`, use the existing one-question/token path with a
dedicated, low-pressure prompt such as:

> What are you trying to work through? Even a few words is enough.

This generic wording is allowed only for the deterministic low-signal case;
the normal AI prompt should continue to reject generic questions when a real
subject is present. After the visitor supplies a meaningful answer, the flow
may produce the note. The one-follow-up ceiling remains unchanged, and a
low-signal clarification must be covered by the same signed follow-up token
and replay protections as any other clarification.

Add regression coverage for accidental fragments, short but meaningful
messages, greetings/meta questions, and the transition guard that prevents
low-signal input from reaching recap or the email/name steps.

“Naturally” does not mean unconstrained. Provider facts, privacy claims,
delivery status, and consent boundaries are server-owned facts. The response
may be model-written only from supplied facts, or use concise approved copy.
The state transition is deterministic: a meta/test exchange can never reach
personal-data collection or send without a subsequent real contact message.

### 3. Optional clarification — one turn, no interrogation

The agent asks one short question only when it has a specific reason to
believe the answer will make Manuel’s reply more useful. Example:

> You mentioned the handoff keeps breaking. Where does it usually break down?

Always show these actions below the question:

- **Continue with what I’ve said**
- **Start over**

The visitor may answer, bypass, or restart. “I don’t know,” a vague answer,
or a bypass always moves forward. No second question is permitted in this
release. This replaces the present three-follow-up ceiling.

### 4. Editable note preview — demonstrate value and preserve authorship

Frame the result as a draft, not an agent statement:

> Here’s the note Manuel would receive.
>
> Change anything before you send it.

The note must contain only the visitor’s meaning and vocabulary, organised
for readability. Show clear actions:

- **Edit note**
- **Add context**
- **Use my original words**
- **Continue**

Retain the original message for Manuel alongside the approved note. The model
must not invent facts, turn the note into consultancy language, or give a fit
assessment.

Choosing **Use my original words** is reversible. Preserve the AI-formatted
note in state and switch the preview to the verbatim message; replace the
action with **Use formatted note** so the visitor can restore the exact
formatted draft without another AI call, lost edits, or a changed summary.
This is a view/selection change only: neither option sends the message or
alters the original transcript.

### 5. Reply route and optional name — minimal, respectful capture

After the visitor has seen a useful note, ask for the reply route in a
dedicated field:

> What’s the best email for Manuel to reply to?

Then ask separately:

> What should Manuel call you? *(optional)*

The name step provides both **Continue** and a visible **Skip** action. Skip
immediately advances to review/send with the name omitted. It must not show
validation, repeat the question, or make anonymity feel exceptional.

Do not use one combined “Where should Manuel reply, and what’s your name?”
field: it obscures two different requests, complicates validation, and makes
the name feel required.

### 6. Review and explicit send — an honest delivery boundary

Show the approved note, reply route, and optional name with edit links. The
primary action is:

> Send note to Manuel

Supporting copy:

> He’ll receive your original message and the note you approved.

Before this action, use “would receive,” never “I’ll pass on” or “That’s with
Manuel now.” After successful delivery, acknowledge the human handoff without
inventing a response-time promise. Keep the direct email fallback for a
delivery failure.

## AI contract and prompting

### Boundaries

AI has exactly two production jobs:

1. Decide whether a genuine inquiry would benefit from one clarification.
2. Produce an editable, faithful note from the visitor’s words.

It does not decide delivery, consent, required data, visitor eligibility,
provider identity, pricing, availability, or a response-time promise.

### Qualification contract

Call qualification only after a plausible inquiry. The task is:

```text
Given a genuine first-contact message, decide whether one short question
would materially help Manuel make a more specific first reply. If not,
return ready. Never collect contact data or evaluate whether the visitor is
worth contacting.
```

Use a closed structured response:

```ts
type Qualification =
  | { outcome: 'ready' }
  | {
      outcome: 'follow_up'
      question: string
      purpose: 'trigger' | 'concrete_example' | 'desired_state' | 'stakes' | 'constraint'
    }
```

Application validation rejects a question that is empty, multi-part,
generic, presumes unspoken facts, asks about budget/timeline, or lacks a
clear connection to the message. A rejected response becomes `ready`, never
another retrying question.

### Note contract

```ts
type Note = {
  note: string
}
```

The prompt must require: preserve the visitor’s vocabulary and intent; order
the information; add no diagnosis, recommendation, praise, or invented fact;
and remain shorter than the source message unless a clarification was added.
The original transcript is always sent with the note so Manuel can judge the
AI’s framing.

### Model settings and prompt design

- Use separate, short prompts for qualification and note creation.
- Use structured output, then application-level semantic validation. Valid
  JSON is not proof of a useful or truthful response.
- Start with low temperature. Test any change to reasoning budget or
  temperature at the production 3.5-second timeout rather than assuming that
  more reasoning produces a better visitor experience.
- Add few-shot examples only if an evaluation shows a repeated failure.
  Examples must cover a clear inquiry, thin inquiry, “I don’t know,” bypass,
  and faithful note creation.
- Version prompts and record the version in development fixture output only.
  Do not add visitor-content logging to production analytics.

## Technical plan

### Phase 1 — establish the new server contract

1. In `netlify/functions/intake.js`, replace the binary-only gap-check path
   with explicit qualification and note schemas.
2. Remove the mandatory no-context fallback question, “What made you look for
   help?”, and remove support for multiple follow-up rounds in this release.
3. Add server-owned meta/test/help handling. It must return visitors to the
   writing state and cannot create an identity, confirmation, or delivery
   transition.
4. Keep the existing raw/degraded send path independent of AI success.
5. Preserve transcript trust boundaries and rate limiting.

### Phase 2 — implement the page state machine

1. In `pages/contact.tsx`, replace the current `message → followup* →
   identity → confirm` progression with the approved flow above.
2. Replace visible category chips with the helper line and an initially
   collapsed “Not sure where to begin?” drafting aid. Its sentence stems seed
   the existing composer only; they must not invoke AI or create a branch.
3. Replace the recap presentation with an editable note-preview state and
   explicit “would receive” framing.
4. Split reply-route and name collection. Implement **Skip** on the optional
   name state as a direct, validation-free forward transition.
5. Add review/send as the only delivery-authorising state.
6. Retain direct email fallback and the current retry/recovery treatment.
7. Correct composer vertical alignment so the live caret is centred with the
   placeholder and typed text across the configured text-size range.

### Phase 3 — local evaluation and model selection

Use `npm run dev:contact-ai` for the local function and `npm run
verify:contact-ai` to prove the live Gateway before UX tests. Add a
delivery-free fixture runner that uses the live local Gateway and records:

- configured model and prompt version;
- response latency and validation result;
- qualification outcome and rendered UI state;
- generated note, reviewed only with synthetic fixture content.

Run the identical fixtures through the current and intended new model. Review
outputs blind to model name. Do not choose a model based on provider reputation
or JSON validity alone.

Required fixtures:

| Fixture | Expected outcome |
| --- | --- |
| Detailed first contact | Note preview, no clarification. |
| Thin but genuine inquiry | One relevant optional question. |
| Vague answer / “I don’t know” | Continue to note; no second question. |
| Clarification bypass | Continue to note using current wording. |
| “Are you Gemini?” | Direct, truthful response; return to writing. |
| “This is a test” | No-send explanation; return to writing. |
| Note with correction | Editable note reflects correction without invented detail. |
| Original-word toggle | Visitor can switch to original wording and restore the same formatted note without another AI request. |
| Invalid/slow Gateway response | Raw/degraded send remains usable. |
| Name skipped | Review/send is reachable with no name. |

### Phase 4 — measure real outcomes safely

Instrument aggregate funnel events without recording real message content:

```text
contact_view
→ composer_started
→ first_message_submitted
→ clarification_shown | clarification_bypassed | clarification_answered
→ note_previewed | note_edited | original_words_selected
→ reply_route_provided
→ name_skipped | name_provided
→ send_confirmed
→ delivery_succeeded | delivery_failed
```

Pair these with Manuel’s periodic, privacy-respecting review of message
usefulness and eventual response/conversation outcomes. Compare against a
lean direct-message baseline, not a historic many-field form. A release wins
only if meaningful completion and message usefulness improve without a rise in
failed sends, unwanted data collection, or visitor confusion.

## Verification and acceptance criteria

1. Unit-test all server schemas, validators, state transitions, and the
   validation-free name Skip route.
2. Exercise every fixture through real local Gateway inference with simulated
   delivery.
3. Run the actual page through the Contact dev-mode panel at desktop and
   mobile. Verify: first message, optional clarification, bypass, note edit,
   original-word toggle in both directions, reply route, name Skip,
   review/send, degraded mode, delivery recovery, and the caret/text/placeholder
   alignment at minimum/default/maximum composer text sizes.
4. Capture and inspect screenshots plus final rendered DOM/computed styles for
   each affected state. Record viewport, selected dev config, and evidence
   paths in the implementation handoff.
5. Keep the dev panel unable to control credentials, provider access, or
   production delivery policy.

## Files expected to change

- `pages/contact.tsx` — state machine, copy, controls, and review/send flow.
- `netlify/functions/intake.js` — prompt contracts, server-owned routing, and
  semantic validation.
- `netlify/functions/lib/intake-ai.js` — only if the selected model requires
  a tested change to reasoning/latency settings.
- Contact unit tests and a delivery-free prompt-fixture suite.
- `CONTACT-AI-GATEWAY.md` — model-selection and fixture-runner instructions.

## Non-goals

- Replacing a simple contact route with an open-ended chatbot.
- Provider/model selection in the browser config panel.
- Making a name compulsory or treating Skip as a failure state.
- Letting AI decide consent, delivery, or contact eligibility.
- Treating a model upgrade as a substitute for careful interaction design.
