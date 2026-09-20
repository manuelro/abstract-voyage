# Contact AI Gateway

The contact intake function uses Netlify AI Gateway to call
`gemini-2.5-flash-lite`. The function makes the existing gap-check and recap
requests; delivery remains SMTP-first and does not depend on AI success.

## Netlify setup

1. Enable AI Gateway for the site in Netlify.
2. Set `INTAKE_FOLLOWUP_TOKEN_SECRET` to a long, cryptographically random
   value. This is required for gap-check requests in production and local
   development.
3. Configure the existing `CONTACT_SMTP_*`, `CONTACT_TO_EMAIL`, and
   `CONTACT_FROM_EMAIL` variables.
4. Optionally set `LEAD_WEBHOOK_URL`, the rate-limit variables, and the model
   variables shown in `.env.example`.

The `intake` function is a classic (non-edge) Netlify Function. Netlify AI
Gateway injects `GEMINI_API_KEY` and `GOOGLE_GEMINI_BASE_URL` into supported
Functions and into Netlify Dev for credit-based sites. The function uses those
values with Gemini's REST contract (`x-goog-api-key` and
`<base-url>/v1beta/models/<model>:generateContent`). No provider API key or
Gateway base URL should be configured manually: Netlify supplies short-lived,
site-scoped values.

The default contact path does not use `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
`GOOGLE_API_KEY`, or Google Vertex credentials. Legacy OpenAI and Anthropic
SDK dependencies have been removed.

## Local development

Run `netlify dev`, not only `npm run dev`, so the browser's
`/.netlify/functions/intake` requests are proxied to the local function. For a
linked site with AI Gateway enabled, Netlify Dev can provide the Gateway
runtime environment. Keep `INTAKE_FOLLOWUP_TOKEN_SECRET` and SMTP test values
in an untracked `.env.local` or the Netlify environment.

If Gateway configuration is unavailable locally, gap-check and recap return
the existing degraded response and the UI proceeds with raw delivery. Tests
mock Gateway, SMTP, and webhook calls and never require live credentials.

### Live local Gateway smoke test

The project includes a deliberately delivery-free smoke test for proving the
real local-function → Netlify AI Gateway → Gemini path. It sends only a fixed,
synthetic transcript to the local `gap-check` and `recap` stages; it never calls
the `deliver` stage and cannot send email.

Start one isolated Netlify Dev instance (Netlify's public proxy is on 8888;
Next itself stays off 3000):

```sh
CLAUDE_NEXT_DIST_DIR=.next-contact-gateway netlify dev --port 8888 --target-port 3001 --command 'npm run dev -- -p 3001'
```

In another terminal, once Netlify Dev is ready, run:

```sh
npm run verify:contact-ai-gateway
```

Pass means both live Gemini stages returned the exact JSON shape the intake
function accepts. A failure is intentionally non-zero and reports whether the
local server could not be reached, a response was non-JSON/non-2xx, or the
Gateway result failed the function's validation. This verifies a real remote
inference call from local development, so it needs a linked Netlify site with
AI Gateway enabled and consumes a small amount of the site's AI credits.

## Runtime behavior

- Invalid, empty, honeypot, oversized, and exhausted-follow-up requests are
  rejected before inference.
- Each AI call has a 3.5-second timeout and at most one server-side retry.
- Model output is constrained to JSON and validated again in application code.
- AI failure never turns a valid contact into a delivery failure; the visitor
  can continue through the raw/degraded flow.
- Production delivery always uses SMTP. Console delivery is local-only to
  avoid writing contact content to production function logs.
- The optional webhook is awaited for at most 1.5 seconds after SMTP succeeds;
  webhook failure does not change the visitor's successful delivery result.

Netlify AI Gateway usage and function execution consume the site's Netlify
credit allowance. The short prompts, Flash-Lite model, request limits, output
caps, and bounded retries are intended to keep this path small, but site owners
should still monitor credit usage and abuse in Netlify.
