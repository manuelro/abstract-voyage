# Contact local AI development experience

## Status and decision

**Implementation record, 2026-09-20.** Phases 1 and 2 below are implemented.
The remaining phases are future work.

The real local path has been verified on 2026-09-20: Netlify Dev injected the
site-scoped Gemini Gateway credentials, and the local `intake` function
successfully completed a synthetic `gap-check` and `recap` with
`gemini-2.5-flash-lite`. The repeatable, delivery-free proof is:

```sh
npm run verify:contact-ai-gateway
```

when Netlify Dev is running on port 8888. See `CONTACT-AI-GATEWAY.md` for the
complete invocation and required local signing secret.

**Do not add a panel switch named “Enable AI Gateway.”** Gateway availability,
credentials, model access, and delivery authority are server/runtime concerns.
A browser-configured switch cannot enable any of them and would falsely imply
that it can. It must remain impossible for a panel value to alter credentials,
provider selection, or server-side delivery policy in production.

The appropriate panel concept is **response source**, with a clearly labelled
`Live AI Gateway` choice. It is implemented as
`ContactDevModeConfig.aiSource = 'live-gateway'`; it calls the real local
function for AI stages.

## Current-state audit

| Need | Current behavior | Gap |
| --- | --- | --- |
| Real Gemini while developing | `aiSource: 'live-gateway'` bypasses `simulateIntakeResponse` for gap-check/recap and calls `/.netlify/functions/intake` | Implemented: the panel names the Netlify Dev requirement and credit use. |
| Deterministic conversation branches | Four AI simulations and three delivery simulations are independently selectable | Implemented: AI source and delivery outcome no longer share one overloaded field. |
| Real AI without email | `live-gateway` + `simulate-success` is the default | Implemented: real AI can drive the conversation while delivery stays simulated. |
| Verify gateway availability | `npm run verify:contact-ai-gateway` performs real synthetic gap-check + recap, no delivery | It is documented outside the panel rather than exposed as an obvious working-session affordance. |
| Production safety | Panel is excluded from production and `postIntake` independently permits simulation only outside production | Must remain a server-enforced invariant, not merely hidden UI. |

## Experience model

Separate three decisions which currently share `scenario`:

```text
AI source       → Live AI Gateway | deterministic simulation
Delivery policy → local safe simulation | local configured endpoint
Visual pacing   → simulated latency only (never applies to live inference)
```

For everyday interaction design work, the default useful state is:

```text
Live AI Gateway + simulated successful delivery
```

It exercises the actual prompt, Gateway, model response, recap, loading
states, and transitions, while never sending an email. Delivery UX can then
be selected separately as deterministic success, recovery, or exhaustion.

## Proposed implementation

### Phase 1 — clarify the existing control (implemented)

In `experiences/contact/ContactDevMode.panel.ts`:

- Rename the scope from `Dev mode — network simulation` to `Intake test mode`.
- Rename `Live (real network)` to `Live AI Gateway (Netlify Dev required)`.
- State that it sends real synthetic/visitor text through the configured
  Gateway and consumes credits; it is not available through `npm run dev`
  alone.
- Add concise help text pointing to `npm run verify:contact-ai-gateway` as the
  delivery-free connectivity proof.

Implemented with two `kind: 'select'` fields; descriptive labels are long and
the AI-source list has five choices, so native selects keep the panel compact.

### Phase 2 — decouple AI and delivery testing (implemented)

The overloaded `scenario` union has been replaced with two page-local
development-only controls in `ContactDevModeConfig`:

```ts
type ContactAiSource =
  | 'live-gateway'
  | 'simulate-no-followup'
  | 'simulate-followup'
  | 'simulate-insufficiency'
  | 'simulate-unavailable'

type ContactDeliveryTestMode =
  | 'simulate-success'
  | 'simulate-fail-recover'
  | 'simulate-fail-exhausted'
  | 'local-function'
```

Both fields must be `kind: 'select'`: each has multi-word labels and the AI
source field has five choices that describe materially different behavior.

Implemented defaults:

```ts
aiSource: 'live-gateway'
deliveryTestMode: 'simulate-success'
simulatedLatencyMs: 900
```

This makes the safe, realistic default explicit. `local-function` delivery is
an advanced, visibly warned option for deliberate SMTP/sink verification.

`pages/contact.tsx` retains one network chokepoint and resolves it by stage:

- `gap-check` and `recap`: simulate only when `aiSource !== 'live-gateway'`.
- `deliver`: simulate unless `deliveryTestMode === 'local-function'`.
- Preserve the existing `NODE_ENV !== 'production'` guard around *all*
  simulation. Production must always call the real endpoint and must not read
  panel state as a delivery authority.
- Keep the component remount key tied to AI-source changes, not latency or
  delivery test mode. Changing a source invalidates conversation state;
  changing a delivery outcome should not discard a conversation already ready
  for confirmation.

### Phase 3 — make live readiness observable without surprise calls

Do not call Gemini merely because the panel opens. That creates hidden credit
use and makes visual tuning unexpectedly network-dependent.

Instead, add a non-secret, development-only status component adjacent to the
two controls:

- **Gateway test command:** `npm run verify:contact-ai-gateway`.
- **State:** `Not checked`, `Verified in this session`, or `Unavailable`.
- **Meaning:** status is local browser-session information only, never copied
  into a production config payload.

An optional future “Run connection check” action may call a dedicated
development-only function probe, but only when `CONTACT_LOCAL_TEST_MODE=1` is
set server-side. It must use a fixed synthetic prompt, never a draft in the
composer, must omit delivery, and must return only readiness/model/latency —
never credentials or provider error bodies.

The CLI smoke test remains the canonical proof because it is easy to automate
and does not depend on panel visibility.

### Phase 4 — test coverage and acceptance criteria

Implemented unit coverage verifies the core stage-routing matrix; extend it
with UI-level coverage in the next pass:

| AI source | Delivery test mode | Gap/recap | Delivery |
| --- | --- | --- | --- |
| Live Gateway | Simulate success | real local function | simulated success |
| Live Gateway | Simulate failure/recovery | real local function | simulated failure/retry |
| Simulation | Any simulated mode | fabricated response | fabricated response |
| Any | Local function | source behavior above | real local function |
| Production | any forged client state | real local function | real local function |

Then add a single sequential Playwright flow, run only against Netlify Dev:

1. Set `Live AI Gateway` and `Simulate success` via the actual Contact panel.
2. Submit a synthetic complete inquiry.
3. Assert the rendered recap and identity/confirmation transition.
4. Confirm delivery and assert the completion message.
5. Repeat the delivery-failure/recovery branch with live AI unchanged.

For the one `local-function` delivery test, use a local SMTP sink or console
delivery configured exclusively through environment variables. Do not use a
panel setting to select real SMTP recipients.

## Guardrails

- The panel must never show, serialize, or copy `GEMINI_API_KEY`,
  `GOOGLE_GEMINI_BASE_URL`, SMTP credentials, signing secrets, or a provider
  selector.
- Gateway/model selection remains environment-owned (`INTAKE_PROVIDER=gemini`,
  with the Gateway-injected Gemini base URL/key); the client may choose only
  whether to use the already-configured local endpoint or a simulation.
- Simulation remains rejected in production independently of panel visibility.
- Live inference and local SMTP-sink tests consume credits or create test
  messages only after an explicit operator action.
- Run visual verification through the real panel at desktop and mobile after
  Phase 1/2, including the safe live-AI/simulated-delivery default and the
  failure/recovery state.

## Rollout order

1. Keep using the successful CLI Gateway smoke test before any Contact work.
2. Implement and visually verify Phase 1.
3. Implement Phase 2 with unit tests; use simulated delivery by default.
4. Add the Netlify-Dev-only Playwright path and local delivery sink.
5. Consider Phase 3 only if the CLI proof is too disruptive in daily work.
