# n8n Gmail Follow-up — As-Built Workflow Reference

This documents what was actually built for `PLAN-N8N-GMAIL-FOLLOWUP.md`, so you can
open n8n and modify/extend/remove pieces yourself later. It's a reference, not a
task list — the original plan's requirements/acceptance criteria still apply.

## Environment

- n8n installed globally via `npm install -g n8n`, running under **Node 24**
  (installed via `nvm install 24`; system default node was 20.18, too old for
  n8n which requires `>=24.0.0`).
- Start n8n with:
  ```bash
  export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; nvm use 24
  export N8N_SECURE_COOKIE=false   # needed for plain http://localhost OAuth callbacks
  n8n start
  ```
- Editor: `http://localhost:5678/`
- n8n data/DB lives at `~/.n8n/database.sqlite` (SQLite). The workflow below is
  stored there as an editor draft (never published/activated).
- Ollama already running locally (`ollama serve`, PID managed by your own
  install, not by n8n) with `qwen3:8b` pulled. n8n reaches it via
  **`http://127.0.0.1:11434`** — not `localhost`, because Node resolves
  `localhost` to `::1` first and Ollama only listens on IPv4, which produces a
  misleading `ECONNREFUSED`.

## Google Cloud / OAuth setup

- Project: `n8n-gmail-followup`.
- Gmail API enabled on that project.
- OAuth consent screen: External, app in "Testing" status, target Gmail
  address added as a **test user** (required since the app is unverified).
- OAuth client ("n8n local", Web application) with redirect URI:
  `http://localhost:5678/rest/oauth2-credential/callback`
- Gmail scopes granted (minimal, per the plan's least-privilege requirement):
  - `gmail.labels` (view/edit labels)
  - `gmail.compose` (manage drafts — does **not** imply auto-send; the
    workflow simply never calls a send action)
  - `gmail.modify` (read messages/threads)
  - Explicitly **not** granted: `https://mail.google.com/` (full access incl.
    permanent delete) and the two Gmail *add-on* scopes, which are irrelevant
    here.

## n8n credentials

| Name | Type | Notes |
|---|---|---|
| Gmail account 2 | Gmail OAuth2 API | Connected as the target inbox (`mc.ro18@gmail.com`) |
| Ollama account | Ollama | Base URL `http://127.0.0.1:11434`, no API key |

(There's also an unused leftover credential called "Gmail account" — safe to delete.)

## Target thread binding

- Target Gmail label: `n8n-followup-target` (label ID `Label_7929074069031949020`),
  applied manually to the one conversation this workflow watches.
- Target `threadId`: `1a09e284d705f56c` — hardcoded as the safety boundary
  inside the "Check thread + sender" Code node. **This is the actual security
  gate**, not the label; the label is just a cheap pre-filter on the trigger so
  n8n doesn't have to evaluate every inbox message.
- To find a thread's real API `threadId` from Gmail's UI: open "Show original"
  on a message, take the `permmsgid=msg-f:<decimal>` number from the URL, and
  convert it to hex — `python3 -c "print(hex(<decimal>))"`. Then use n8n's
  Gmail node ("Get a message", that hex ID) to confirm the `threadId` field
  (it can differ from the message ID if it's not the first message in the
  thread).

## Workflow: "Gmail Follow-up"

Workflow ID: `GZSQVcW2iL7BH7lS` (find it in n8n's workflow list, or the URL
when the workflow is open). **Not activated** — build/test in the editor
first, per the original plan.

```
Gmail Trigger
  -> Check thread + sender            (Code)
  -> Get thread                       (Gmail: thread.get)
  -> Verify unanswered + build transcript   (Code)
  -> Ollama analysis                  (HTTP Request -> Ollama /api/chat)
  -> Validate result                  (Code)
  -> Is action reply?                 (If)
       true  -> Has stale draft?      (If)
                  true  -> Delete stale draft (Gmail: draft.delete) -> Create draft
                  false -> Create draft
                -> Create draft       (Gmail: draft.create)
                -> Record state (draft created)  (Code)
       false -> Record state (no reply)          (Code)
```

### Node-by-node

**1. Gmail Trigger**
- Event: Message Received, poll every minute, Simplify ON.
- Filter: Label = `n8n-followup-target` (cheap pre-filter only).

**2. Check thread + sender** (Code)
- Hard-rejects anything whose `threadId` isn't the exact target — this is the
  real safety boundary the plan requires.
- Drops messages where the sender is you (`mc.ro18@gmail.com`) — i.e. ignores
  your own outgoing mail so it only reacts to the other participant.
- Gotcha: this n8n version's simplified Gmail output puts headers as
  **capitalized top-level fields** (`msg.From`, `msg.Subject`, `msg.To`), not
  `msg.headers.from`. Easy to get wrong — check actual node output before
  assuming a header shape.

**3. Get thread** (Gmail node, resource `thread`, operation `get`)
- `threadId` = `{{ $json.threadId }}`, Simplify OFF (need full message
  payloads/headers to extract body text).

**4. Verify unanswered + build transcript** (Code)
- Sorts all messages in the thread by `internalDate` and confirms the
  **newest message in the thread is still the one that triggered us** — if
  you already replied (even from your phone, out-of-band), the newest message
  would be yours and this stops the pipeline. This is how "don't react if
  already answered" is enforced.
- Duplicate-draft check: reads workflow **static data**
  (`$getWorkflowStaticData('global')`) for `lastProcessedMessageId` +
  `draftStatus`; if a pending draft already exists for this exact message, it
  stops (no duplicate draft).
- Stale-draft detection: if a pending draft exists for an **older** message
  and a newer one just arrived, it captures `previousDraftId` so the workflow
  can clean up the old draft further down.
- Extracts plain-text body from the MIME tree recursively, and joins the
  whole thread into one `transcript` string for the model.

**5. Ollama analysis** (HTTP Request)
- POSTs to `http://127.0.0.1:11434/api/chat` with `model: qwen3:8b`,
  `stream: false`, and a `format` field containing a strict JSON Schema
  (Ollama's structured-output feature) requiring `action`, `should_reply`,
  `intent`, `draft`, `confidence`, `reason` — this is the primary defense
  against malformed model output, on top of the schema check in the next node.

**6. Validate result** (Code)
- Parses `message.content`, checks all required fields/types, and enforces a
  **confidence threshold of 0.6** — anything invalid or under-confident is
  coerced to `action: 'escalate'` rather than silently proceeding.

**7. Is action reply?** (If)
- Routes `reply` down the draft-creation branch; everything else
  (`wait`/`ignore`/`escalate`/invalid) down to "Record state (no reply)",
  which just updates `lastProcessedMessageId` in static data so we don't
  re-evaluate the same message forever, without creating anything.

**8. Has stale draft? / Delete stale draft** (If / Gmail draft.delete)
- Only runs when step 4 flagged a `previousDraftId`. Deletes the old draft
  before a new one is created for the latest message (`onError:
  continueRegularOutput` so a missing/already-deleted draft doesn't break the
  run).

**9. Create draft** (Gmail node, resource `draft`, operation `create`)
- `subject`: preserves the existing subject, prefixing `Re:` only if not
  already present.
- `message`: the model's proposed draft text — **verbatim, as-is**. The
  model's `intent`/`reason`/`confidence` never go into this field.
- `options.threadId`: attaches the draft to the target conversation.
- `options.sendTo`: the participant's email, extracted dynamically from the
  incoming message (not hardcoded), so it's correct even if you reuse this
  pattern for a thread with a different participant later.
- **There is no send node anywhere in this workflow.** Sending is a manual
  action you take in Gmail's own UI.

**10. Record state (draft created)** (Code)
- Updates static data: `lastProcessedMessageId`, `draftId`, `draftStatus:
  'pending'`.
- Output item carries `intent`, `reason`, `confidence` — visible in the n8n
  execution log for that run, never in the email itself. This satisfies the
  plan's "explain intent separately from the outgoing email" requirement.

## What's intentionally NOT automated (v1)

- Gmail labels `n8n-draft-ready` / `n8n-processed` / `n8n-review-needed` don't
  exist yet and aren't auto-applied. The plan calls them "recommended," not
  required for the acceptance criteria. If you want them: create the labels
  in Gmail first (so they have real IDs), then add a Gmail
  "Add label to thread" node on each branch referencing the new label IDs.
- No dead-man's-switch / alerting if Ollama is down or n8n crashes — this is
  a personal local tool, not a monitored service.

## How to extend this yourself

- **Change the model**: edit the `model` field in the "Ollama analysis" node's
  JSON body (e.g. swap `qwen3:8b` for `qwen3:4b` to compare speed/quality —
  see the original plan's Model section).
- **Change the confidence bar**: `CONFIDENCE_THRESHOLD` in "Validate result".
- **Watch a different thread**: update `TARGET_THREAD_ID` in "Check thread +
  sender" (and re-apply the `n8n-followup-target` label to the new thread, or
  drop the trigger's label filter entirely if you don't want that pre-filter).
- **Add labeling**: see "What's intentionally NOT automated" above.
- **Activate for real**: only flip the workflow to Active after running
  through the plan's full test list (`PLAN-N8N-GMAIL-FOLLOWUP.md`, "Test
  plan" section) with drafts-only, no auto-send.

## TODO

- **Header extraction bug (cosmetic)**: in "Verify unanswered + build transcript",
  the oldest message in the thread showed up in the built `transcript` as
  `From: undefined\nDate: undefined` instead of the real sender/date. The
  `extractText`/header-mapping logic reads `m.payload.headers[].{name,value}`
  per the Gmail node's documented output schema, which should be correct — but
  something about that particular message's actual shape didn't match.
  Doesn't affect safety/dedup/draft-attachment (all verified working), just
  means the model saw slightly less context for that one message. To debug:
  open the "Get thread" node's execution output in n8n and expand
  `messages[0].payload.headers` to see the real field names/casing, then fix
  the mapping in the Code node accordingly.
- Gmail labels `n8n-draft-ready` / `n8n-processed` / `n8n-review-needed`
  aren't created or auto-applied yet (see "What's intentionally NOT automated"
  above) — nice-to-have, not required for acceptance criteria.
- Full test-plan pass (`PLAN-N8N-GMAIL-FOLLOWUP.md` → Test plan, steps 1-10)
  isn't complete. Verified so far: new-reply detection, draft creation +
  correct thread attachment, intent visible in execution log, duplicate-draft
  prevention (re-running on the same message correctly produced zero
  downstream items), unrelated-thread rejection, same-sender-different-thread
  rejection, and own-message-in-correct-thread rejection (all three verified
  via CLI with mock data — see "Testing with mock data" below). Still to
  test: stale-draft replacement on a second real reply, and the
  `wait`/`ignore`/`escalate`/malformed-output/low-confidence paths.
- Workflow is still unpublished/inactive by design — don't activate until the
  full test list above passes.

## Test plan status

The original plan (`PLAN-N8N-GMAIL-FOLLOWUP.md` → "Test plan") lists 10 items
to verify before activating the workflow. Status of each, and how it was
verified:

| # | Test | Status | Method |
|---|---|---|---|
| 1 | Unrelated Gmail threads are ignored | ✅ Verified | **Mock tested** |
| 2 | Another message from the same sender in a different thread is ignored | ✅ Verified | **Mock tested** |
| 3 | A new incoming reply is detected | ✅ Verified | **Live tested** (real Netlify Support message, real thread) |
| 4 | Inspect the model's structured decision without creating a draft | ⚠️ Partially verified | **Live tested** — the decision (`action`, `intent`, `confidence`) was inspected in "Validate result," but as part of the same run that went on to create the draft, not a deliberately isolated dry run. If you want a clean version of this test, temporarily disconnect "Create draft" and re-run. |
| 5 | Create a draft and verify it's attached to the correct thread | ✅ Verified | **Live tested** — draft confirmed in actual Gmail UI, correct thread, correct recipient |
| 6 | Verify the intent explanation is visible separately from the draft | ✅ Verified | **Live tested** — intent/reason/confidence appear in "Validate result" / "Record state" node output (n8n execution log), never in the draft body itself |
| 7 | Send one draft manually and confirm it prevents a duplicate draft | ⚠️ Not yet tested | — Duplicate-prevention *before* sending was live tested (re-running on the same message produced zero downstream items). Sending the draft and then confirming a re-poll still doesn't duplicate has not been tested yet. |
| 8 | Receive a second reply in the same thread, verify latest context is used | ❌ Not yet tested | Needs a real second reply from the other participant |
| 9 | Leave a draft unsent, receive another reply, verify the old draft is treated as stale | ❌ Not yet tested | Needs a real second reply while the first draft is still sitting unsent; the "Has stale draft?" / "Delete stale draft" branch exists but hasn't been exercised |
| 10 | Test `wait`, `ignore`, `escalate`, malformed output, and low confidence | ✅ Verified | **Mock tested** — see results below |

Item 10 detail (all 5 sub-cases mock tested by injecting a fake Ollama HTTP
response directly into "Validate result", bypassing the trigger and the
actual model call):

| Injected `action` / condition | Expected | Actual | Result |
|---|---|---|---|
| `wait`, confidence 0.9 | routed to "Record state (no reply)", no draft | `action: wait`, `valid: true`, false-branch (no draft) | ✅ |
| `ignore`, confidence 0.85 | routed to "Record state (no reply)", no draft | `action: ignore`, `valid: true`, false-branch | ✅ |
| `escalate`, confidence 0.8 | routed to "Record state (no reply)", no draft | `action: escalate`, `valid: true`, false-branch | ✅ |
| Malformed (non-JSON) model output | coerced to `escalate`, `valid: false`, no draft | `action: escalate`, `valid: false`, false-branch | ✅ |
| `reply` but confidence 0.35 (below the 0.6 threshold) | coerced to `escalate` despite `reply` action, no draft | `action: escalate`, `valid: true` (well-formed, just under-confident), false-branch | ✅ |

**Do not activate the workflow until items 7-9 are resolved** — this matches
the original plan's requirement to "activate only after draft-only tests
pass."

## Testing with mock data (no real Gmail traffic needed)

To test the rejection logic without waiting on real emails, you can bypass
the Gmail Trigger with a throwaway harness:

1. Temporarily add a **Manual Trigger** node and a **Code** node after it that
   `return`s a hardcoded mock item (same shape as a Gmail Trigger output:
   `id`, `threadId`, `From`, `Subject`, `To`, etc.).
2. Wire the Code node's output into **Check thread + sender** (same input the
   real Gmail Trigger feeds).
3. Disable the real Gmail Trigger node (right-click → Disable) so it doesn't
   also fire.
4. Run via CLI: `n8n execute --id=GZSQVcW2iL7BH7lS --rawOutput` (n8n must not
   already be running when using the CLI against the same SQLite file — stop
   it first) — or just click **Execute workflow** in the UI with the Manual
   Trigger selected as start.
5. Check `resultData.lastNodeExecuted` and each node's `data.main[0].length`
   in the CLI JSON output (or the canvas in the UI) to confirm how far the
   mock item propagated.
6. Afterward, delete the temporary nodes and re-enable the real Gmail Trigger.

This is how the unrelated-thread / same-sender-different-thread / own-message
rejection tests were verified — all three correctly stopped at "Check thread
+ sender" with zero output items.

The same technique works further downstream too: to test how "Validate
result" handles different model outputs (item 10 above) without waiting on
Ollama or risking a real draft, temporarily:

1. Add a Manual Trigger + Code node that returns a hardcoded fake HTTP-response
   shape: `{ message: { content: '<json string or garbage>' }, __ctx: {...} }`
   where `__ctx` mimics what "Verify unanswered + build transcript" normally
   outputs (`threadId`, `latestMessageId`, `participantEmail`, `subject`,
   `transcript`, `previousDraftId`).
2. Wire it directly into "Validate result", bypassing the trigger, thread
   fetch, and the real Ollama call entirely.
3. "Validate result" normally reads its context via
   `$('Verify unanswered + build transcript').first().json` — that lookup
   fails when that node didn't run in the current execution. Temporarily wrap
   it in a try/catch that falls back to `httpResult.__ctx` when the real node
   has no data (see git history / this doc's revision history for the exact
   patch — keep a copy of the original code, apply the fallback, test, then
   restore the original code verbatim before resuming normal use).
4. Disable the real Gmail Trigger during testing so the CLI (`n8n execute
   --id=<id>`) picks your Manual Trigger as the start node instead.
5. Run each case, inspect `Validate result` and `Is action reply?` node
   outputs in the CLI's JSON result.
6. Clean up: delete the temporary nodes, restore "Validate result"'s original
   code, re-enable the Gmail Trigger, restart n8n.

## Known gotchas hit during setup (so you don't re-debug them)

- Google Cloud "Express Mode" (the AI Studio onboarding flow) locks the
  console down to just the Agent Platform product and blocks project
  creation/full console access until you either add billing or use an
  account that never went through that onboarding path. Cheapest fix: use a
  different Google account to own the Cloud project — it doesn't need to be
  the same account as the Gmail inbox being automated.
- n8n's "OAuth callback state is invalid" error on connecting the Gmail
  credential was fixed by explicitly saving the credential before clicking
  Connect, and retrying end-to-end without leaving stale popups open.
- n8n's `{{ }}` expression fields do a naive scan for the first literal `}}`
  to find the end of the expression — they don't balance nested braces. A
  JSON Schema object embedded directly inside an expression (e.g.
  `{{ JSON.stringify({ format: {"type":"object", ...} }) }}`) will get cut
  off wherever `}}` first appears inside that schema, producing an "invalid
  syntax" error on the node. Fix: build the whole request body as a plain JS
  object in a Code node upstream, then reference it in the HTTP node with a
  single simple expression like `={{ $json.ollamaRequestBody }}` — no nested
  braces, no truncation risk.
- If you ever get logged out of n8n's owner account with no way back in
  (e.g. it shows "Sign in" instead of "Set up owner account" and you don't
  have the password), reset it from the CLI:
  `n8n user-management:reset` (n8n must be stopped first), then restart n8n
  and it'll show the first-run setup screen again.
