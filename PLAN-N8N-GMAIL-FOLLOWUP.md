# n8n Gmail Follow-up Plan

## Goal

Build a free, local Gmail follow-up workflow that watches one specific Gmail
conversation, uses a local language model to reason about unanswered replies,
creates a draft response, explains the draft's intent, and never sends email
without manual approval.

## Requirements

- Use self-hosted n8n locally; do not require n8n Cloud.
- Use Ollama locally; do not require a paid LLM API.
- Process one Gmail thread only.
- Ignore unrelated messages, including other messages from the same sender or
  messages with the same subject in a different thread.
- React only to a new incoming message from the other participant.
- Do not react when the user has already answered the latest incoming message.
- Generate a Gmail draft attached to the original thread.
- Explain the intent behind the generated draft separately from the outgoing
  email.
- Require the user to review and click Gmail's normal Send button.
- Prevent duplicate drafts for the same incoming message.

## Architecture

Run the components natively on macOS. Virtualization is not required.

```text
Gmail --OAuth--> n8n --localhost:11434--> Ollama/Qwen3
                    |
                    +--> Gmail draft and review state
```

Current machine state:

- Ollama is installed at `/opt/homebrew/bin/ollama`.
- Ollama's server is not running yet.
- Docker is installed but is not needed for the initial setup.
- n8n is not currently available as a CLI command.
- The machine has an Apple M2 Pro and 16 GB RAM.

## Model

Start with `qwen3:8b`. It is the initial balance between local reasoning,
conversation quality, memory use, and response speed for this machine.

Compare it with `qwen3:4b` during testing if faster execution is more valuable
than response quality. The model must only analyze and draft; it must not have
unrestricted authority to send Gmail messages.

## Gmail setup

Create a dedicated Google Cloud project for the automation:

1. Enable the Gmail API.
2. Configure the OAuth consent screen.
3. Add the Gmail account as a test user.
4. Create OAuth credentials.
5. Connect the credential in n8n.

Request only the Gmail permissions needed to read the target thread, create
drafts, and manage labels.

## Target-thread binding

Select the original email manually and store its exact Gmail `threadId`.
Optionally apply the visible label `n8n-followup-target`.

The exact `threadId` comparison is the primary safety boundary. The workflow
must reject every message whose thread ID differs from the stored target. The
sender address and subject are secondary checks, never the sole identity of
the conversation.

## Workflow

```text
Gmail Trigger
  -> exact thread ID check
  -> incoming-message and unanswered check
  -> duplicate-draft check
  -> get the relevant Gmail thread
  -> Ollama structured analysis
  -> validate model result
  -> create Gmail draft on the target thread
  -> record intent and apply review label
```

The trigger must verify that:

- The message belongs to the configured thread.
- The newest message was sent by the other participant.
- There is no later message sent by the user.
- The incoming message has not already been processed.
- There is no unresolved draft for that incoming message.

## LLM contract

Ollama should return structured data in this shape:

```json
{
  "action": "reply",
  "should_reply": true,
  "intent": "Clarify the requested deadline and confirm the next step.",
  "draft": "Thanks for following up. I can provide the document tomorrow...",
  "confidence": 0.91,
  "reason": "The sender is asking for confirmation and has not received a response."
}
```

Allowed actions are `reply`, `wait`, `ignore`, and `escalate`. n8n must reject
malformed or ambiguous model output and route it to manual review.

The intent, reason, and confidence belong in n8n execution data or a private
review notification. They must not appear in the email sent to the other
participant.

## Draft and approval behavior

When the result is `reply`:

- Create a Gmail draft.
- Attach it to the configured `threadId`.
- Address it only to the intended participant.
- Preserve the existing conversation subject.
- Apply `n8n-draft-ready`.
- Store the incoming message ID and draft ID.
- Stop the workflow.

The user reviews the intent and draft, edits if needed, and clicks Gmail's
normal Send button. The initial implementation must never send automatically.

If another incoming reply arrives before the draft is sent, mark the previous
draft as stale and create a new draft based on the latest message.

## State and labels

Persist these values in n8n's local state and/or execution data:

- Target thread ID.
- Last processed incoming message ID.
- Draft ID.
- Draft status.
- Whether the user has replied.

Recommended Gmail labels:

```text
n8n-followup-target
n8n-draft-ready
n8n-processed
n8n-replied
n8n-ignore
```

## Installation sequence

1. Verify the Node.js version supported by the current n8n release.
2. Install n8n locally through npm.
3. Start Ollama and pull `qwen3:8b`.
4. Start n8n on a local non-default port if needed.
5. Create the local n8n owner account.
6. Configure the Gmail OAuth credential.
7. Configure the Ollama credential at `http://127.0.0.1:11434`.
8. Build the workflow disabled.
9. Set the target thread ID and labels.
10. Activate only after draft-only tests pass.

## Test plan

Test in this order:

1. Confirm unrelated Gmail threads are ignored.
2. Confirm another message from the same sender in a different thread is
   ignored.
3. Confirm a new incoming reply is detected.
4. Inspect the model's structured decision without creating a draft.
5. Create a draft and verify it is attached to the correct thread.
6. Verify the intent explanation is visible separately.
7. Send one draft manually and confirm it prevents a duplicate draft.
8. Receive a second reply in the same thread and verify the latest context is
   used.
9. Leave a draft unsent, receive another reply, and verify the old draft is
   treated as stale.
10. Test `wait`, `ignore`, `escalate`, malformed output, and low confidence.

## Acceptance criteria

- Only the configured Gmail thread is processed.
- Messages from all other threads are ignored.
- Messages sent by the user do not trigger a draft.
- Each unanswered incoming message produces at most one current draft.
- Each draft is attached to the correct Gmail conversation.
- The model explains why the draft was proposed.
- No email is sent without manual Gmail approval.
- No paid LLM API is required.
- The workflow continues to work while n8n and Ollama are running locally.
