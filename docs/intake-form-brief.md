# Build brief — AI-powered conversational intake form (Netlify Function)

> Paste this whole file into a repo-aware coding agent. Before you run it, fill the
> **[RUNTIME]** blanks near the bottom (which model, and where completed leads should go).
> Everything else is specified. Ask me only if something here genuinely conflicts with the repo.
>
> Adapted from the original App-Router draft: this project ships as a **statically exported**
> Next.js **Pages Router** site (`next build && next export`, published to Netlify as static
> `out/`). There is no Next.js server runtime in production, so the model call cannot live in an
> `app/api/**/route.ts` handler — it lives in a **Netlify Function**, following the exact pattern
> already established by `netlify/functions/contact.js` / `pages/contact.tsx`. Read that pair
> before starting; it answers most "how does this repo do X" questions below.

---

## 1. Objective

Add a first-contact intake form to this Next.js app. Instead of a static field wall, it runs a short, **adaptive conversation**: it asks **one question at a time** in the consultant's voice, follows the visitor's thread, and after ≤5 questions produces (a) a warm recap the visitor confirms and (b) a structured, triaged lead that gets forwarded to a backend. The model decides each turn whether to keep asking or wrap up — this is not a hardcoded question tree.

## 2. Stack & architecture (non-negotiable)

- Next.js **Pages Router** + TypeScript, matching this repo's existing conventions (Tailwind, `pages/`, static export). Do **not** introduce an `app/` directory for this feature.
- The Anthropic API key **must never reach the browser**. Put the model call in a **Netlify Function**: `netlify/functions/intake.js` (CommonJS, same shape as `netlify/functions/contact.js` — `exports.handler = async (event) => { ... }`, JSON in/out via a small `json(statusCode, payload)` helper). The client component talks only to `/.netlify/functions/intake`.
- Use the official SDK: `@anthropic-ai/sdk` (not currently a dependency — add it). It reads `ANTHROPIC_API_KEY` from the environment automatically. Netlify's function bundler (esbuild-based) auto-bundles the SDK from `node_modules`; no special `netlify.toml` config is needed for this.
- The function runs on Netlify's Node runtime (Lambda-backed) — this satisfies the original brief's "Node runtime, not edge" requirement natively.
- The function is **stateless per turn**: the client resends the full transcript each turn; the function does not store session state.
- Default Netlify Function timeout is ~10s. `max_tokens: 1024` on a Haiku-tier model comfortably fits; re-check if `INTAKE_MODEL` is ever swapped to a slower/larger tier.

## 3. The intake model system prompt (use verbatim, keep the placeholders)

```
You are conducting a warm first-contact intake on the website of {CONSULTANT_NAME}, {CONSULTANT_ROLE}. You speak in their own voice: friendly, sharp, curious, human, never corporate.

Goal: through a short conversation, learn enough to (a) make the visitor feel heard and (b) hand {CONSULTANT_NAME} a clean, triaged lead. Try to surface: what the visitor's company does and its stage, the core problem, what they've already tried, the timeline, and any budget/engagement signal. Adapt to what they say — follow the interesting thread, don't interrogate.

Rules:
- Ask ONE question at a time. Keep it to 1–3 sentences, specific, and in {CONSULTANT_NAME}'s voice.
- Ask at most 5 questions total across the whole conversation. Once you have a reasonable picture (or you've asked 5), finish.
- Never invent facts the visitor did not give.
- Output ONLY raw JSON. No markdown, no backticks, no commentary.

While still gathering, output exactly:
{"done": false, "message": "<your next question>", "placeholder": "<a short input hint, under 8 words>"}

When finished, output exactly:
{"done": true,
 "visitorSummary": "<2–3 warm sentences, first person as the consultant, recapping what you heard so the visitor feels understood>",
 "consultant": {
   "fit": "<one of: Strong fit | Worth a call | Likely mismatch>",
   "headline": "<a 4–8 word label for this project>",
   "problem": "<one line: the core problem>",
   "tried": "<one line: what they've tried, or 'Nothing yet mentioned'>",
   "timeline": "<one line, or 'Not specified'>",
   "budget": "<one line signal, or 'Not specified'>",
   "notes": "<one blunt triage line for the consultant's eyes only>",
   "draftReply": "<a 3–4 sentence personalized reply the consultant can review, edit, and send>"
 }}
```

Load `{CONSULTANT_NAME}` and `{CONSULTANT_ROLE}` from config/env (see §8), not hardcoded. Example values for local dev: `Maya Chen` / `an independent brand & growth consultant for early-stage founders`.

## 4. Turn protocol (Netlify Function)

- `netlify/functions/intake.js` accepts `POST { transcript: string, questionsAsked: number }` as `event.body` (JSON — no `application/x-www-form-urlencoded` case needed here, unlike `contact.js`).
- `transcript` is the running dialogue as plain text, e.g. lines of `Consultant: …` / `Visitor: …`.
- Builds a single user message: the transcript + a nudge line like `(You have asked N question(s). Finish by the 5th.)` + `Return the next step as JSON.`
- Calls the model with the §3 system prompt, `max_tokens: 1024`.
- Parses the reply: strip any ``` / ```json fences, `JSON.parse`, validate it matches one of the two shapes. On parse failure, retry once; if it still fails, return the fallback step (see §7).
- Server-side guard: if `questionsAsked >= 5` and the model didn't set `done:true`, force completion by re-prompting for the finished shape (or synthesize a minimal finished payload from the transcript).
- When `done:true`, forward the lead to the backend hook (see §9) **before** responding, but don't block the response on its success — fire it and continue; log failures with `console.error`, same as `contact.js`'s error path.
- Return via the same `json(statusCode, payload)` helper style as `contact.js`, and handle `OPTIONS`/non-`POST` methods the same way (204 / 405).

## 5. Client component behavior

- A plain Pages Router page/component (e.g. `pages/intake.tsx`, or a component mounted from an existing page) — no `'use client'` directive; that's an App Router / RSC concept that doesn't apply here, since everything under `pages/` is already client-hydrated. Renders the conversation and calls only `/.netlify/functions/intake` (mirror `contactEndpoint` constant pattern from `pages/contact.tsx`).
- **Instant opener, no API call on load**: seed the first consultant message client-side (scripted), so the form paints immediately. From the first visitor answer onward, every turn goes through the function.
- One question at a time. Show a typing indicator while awaiting the function (also covers Netlify's cold-start latency on infrequently-hit functions).
- Keyboard: Enter sends, Shift+Enter = newline. Autofocus the input after each consultant turn.
- On `done:true`: render the `visitorSummary` as a recap with two actions — **"Yes, that's right"** (→ done/thank-you state) and **"Not quite, let me add something"** (→ reopen the input for one more turn).
- After the visitor confirms, reveal a **"behind the form"** panel showing the `consultant` card (fit badge, problem/tried/timeline/budget rows, triage note, draft reply). Label it clearly as what the consultant receives — the visitor-facing copy must state no bot impersonates the consultant and the actual reply is human-sent.
- A progress indicator (5 segments) that fills as questions are asked. Include an escape hatch link ("or just email me" → `/contact`, this repo's existing contact page) — some good leads won't want a conversation.

## 6. Design direction (reproduce this feel, don't ship a generic chat widget)

The concept: the form reads like a short, warm letter written *by the consultant* (serif = their voice), that quietly assembles a clean lead. Two surfaces: the visitor's "letter" (light) and the consultant's "desk" card (dark) revealed at the end.

**Tokens** (use as CSS variables or Tailwind theme extensions; do not substitute the AI-default cream+terracotta palette):
- paper `#F5F6F3`, ink `#18211E`, ink-soft `#4A544F`
- pine `#2C6B58` (primary accent), pine-deep `#1F4E41`
- sand `#EDE9DE` / sand-line `#DAD3C2` (visitor answer bubbles), line `#DCE0DA`
- amber `#9C7327` (used sparingly, e.g. the triage highlight)

**Type**: display/voice = **Fraunces** (the consultant's questions and recap render in this serif). UI/body = **Inter** (labels, buttons, visitor answers). Neither is currently loaded in this repo (current Tailwind config only defines an Open Sans / Times New Roman fallback stack) — load both via `next/font/google`. This works fine under static export: fonts are self-hosted into `out/` at build time, no runtime dependency.

**Signature**: the dual reveal — one-at-a-time serif questions → confirmable recap → the dark "desk" card the visitor never normally sees. That contrast is the memorable element; keep everything else quiet.

**Quality floor**: responsive to mobile, visible keyboard focus, `prefers-reduced-motion` respected (kill the message-rise/fade animations), semantic buttons (no `<form>` submit hacks, no browser storage).

## 7. Graceful degradation (required)

If the function call or JSON parse fails at any turn, the form must **not break**. Fall back to a short scripted question chain (core problem → what they've tried → timeline → budget), then assemble a minimal `consultant` card from the collected answers and proceed to the recap. The visitor should never see an error state for a transient API hiccup.

## 8. Config / env

Split between **function-only secrets** and **build-time public values** — this matters more here than in the original App Router draft, because a statically exported site has no per-request server to read env vars for the client at runtime; anything the browser needs must be baked in at build time.

- `ANTHROPIC_API_KEY` — required. **Function-only.** Set in the Netlify site dashboard (production) and in a gitignored local `.env` (for `netlify dev`). Never prefix with `NEXT_PUBLIC_`.
- `INTAKE_MODEL` — model string, default **`claude-haiku-4-5`** (fast + cheap, ideal for real-time intake; swap to `claude-sonnet-5` if you want richer questioning). Verify the current string against Anthropic's models docs before pinning. **Function-only.**
- `LEAD_WEBHOOK_URL` — optional *additional* forward for completed leads (see §9); email delivery (below) doesn't depend on this. **Function-only.**
- `CONTACT_SMTP_HOST/PORT/SECURE/USER/PASS`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `CONTACT_DELIVERY_MODE` — reused as-is from the contact form's config (see `netlify/functions/lib/mailer.js`); no separate intake-specific email config exists. **Function-only.**
- `NEXT_PUBLIC_CONSULTANT_NAME`, `NEXT_PUBLIC_CONSULTANT_ROLE` — persona strings for the **UI header** (client-side, baked in at `next build` time via Next's built-in `NEXT_PUBLIC_` handling).
- `CONSULTANT_NAME`, `CONSULTANT_ROLE` — the same two values, **without** the `NEXT_PUBLIC_` prefix, read by the function and injected into the §3 system prompt. Keep both pairs in sync manually (or derive the function-side pair from the public one at build/deploy time) — don't let the persona text drift between what the visitor reads in the header and what the model is told to embody.
- Add these to `.env.local.example` alongside the existing `CONTACT_*` entries, following that file's style. Never commit real keys.

## 9. Backend / lead forwarding

On completion, `netlify/functions/intake.js` delivers the lead through two independent, non-blocking channels (`Promise.all`, each with its own error handling — one failing never suppresses the other):

1. **Email — the primary channel.** Sent through the exact same mechanism `netlify/functions/contact.js` already uses for the standard form: `netlify/functions/lib/mailer.js`'s shared `sendMail`, which reads the `CONTACT_SMTP_*` / `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` config and honors `CONTACT_DELIVERY_MODE`'s console-vs-smtp split (console locally, SMTP in production). Same inbox as contact-form submissions; subject line is `Abstract Voyage guided intake — {headline}` so it's distinguishable from quick-message mail. Unlike the contact form, **no `replyTo` is set** — the AI intake conversation doesn't collect a visitor email address (see §3's prompt scope), so there's nothing to reply to directly unless the visitor volunteered contact info in free text within the transcript.
2. **Webhook — optional, additional.** If `LEAD_WEBHOOK_URL` is set, the same lead is also POSTed there as JSON:
   ```
   {
     "receivedAt": "<ISO timestamp>",
     "fit": "…", "headline": "…", "problem": "…", "tried": "…",
     "timeline": "…", "budget": "…", "notes": "…", "draftReply": "…",
     "transcript": "<full plain-text dialogue>"
   }
   ```
   Leave `LEAD_WEBHOOK_URL` unset to only send the email.

Both channels fail silently to the visitor per §4/§7 — a delivery failure is logged server-side (`console.error`) and never surfaces as an error state in the UI.

## 10. Local development process

This repo already has `netlify dev` configured (`netlify.toml`'s `[dev]` block proxies `next dev` on port 3000 behind Netlify CLI on port 8888, and serves `netlify/functions/*` at `/.netlify/functions/*` from the same local Lambda emulator used in production).

1. Netlify CLI is expected on the machine (confirmed available here as a global install, v26.1.0+). Consider adding `netlify-cli` to `devDependencies` so it's reproducible via `npm install` rather than relying on a global install.
2. Run `netlify dev` — **not** `npm run dev` directly — so `/.netlify/functions/intake` actually resolves.
3. Create a gitignored `.env` at the repo root (this repo already ignores `.env*.local` and `.netlify`) with a real `ANTHROPIC_API_KEY` plus the other function-only vars from §8.
4. Iterate on the function in isolation before wiring the UI:
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/intake \
     -H 'Content-Type: application/json' \
     -d '{"transcript":"","questionsAsked":0}'
   ```
5. Netlify CLI hot-reloads function file edits; no restart needed for `intake.js` changes.
6. Remember production env vars (§8) are set separately in the Netlify site dashboard — the local `.env` file has no effect on deployed builds.

## 11. Acceptance criteria (self-check before you finish)

1. No path exposes `ANTHROPIC_API_KEY` to client bundles, network responses, or any `NEXT_PUBLIC_`-prefixed variable.
2. Opener paints with zero API latency; subsequent turns are model-driven and adapt to answers.
3. Questions never exceed 5; the finished payload always matches the §3 shape.
4. Function call/parse failure degrades to the scripted fallback — no visible error, no dead form.
5. Recap → confirm → desk-card reveal all work; visitor copy states the reply is human.
6. Responsive, keyboard-navigable, reduced-motion respected; no `<form>` submit or browser storage.
7. Lead forwarding fires on completion and fails safely (logged, non-blocking).
8. Persona and model are config-driven, not hardcoded; the public-facing persona strings (header) and the function-side persona strings (prompt) agree.
9. The feature works end-to-end against `netlify dev` locally and against `netlify build`'s static + functions output, not just `next dev` alone.

## 12. Out of scope / do not

- No third-party chat-widget SDKs; build it in-repo with the existing stack.
- Don't stream tokens (request/response per turn is fine and simpler here).
- Don't add analytics, auth, or a database unless the repo already has them — keep the surface minimal.
- Don't introduce an `app/` directory or a Next.js route handler for this feature — this repo's production build has no Next.js server to run one.
- Don't route `CONSULTANT_NAME`/`INTAKE_MODEL`/persona config through this repo's `AGENTS.md` config-panel system (`defineConfigScope`, `.panel.ts`, etc.) — that system is for editable visual/experience component properties (gradients, particle params), not server-side env config. Keep this feature's config as plain env vars.
- Don't "improve" the persona into something salesy; the whole point is that first contact feels like a person.

---

### [RUNTIME] Fill these before running

- **Model**: default is `claude-haiku-4-5`. Change here if you want a different tier → `__________`
- **Where completed leads go** (`LEAD_WEBHOOK_URL` target — CRM/email/Slack/Sheet): `__________`
- **Consultant identity** (name + one-line role): `__________`
