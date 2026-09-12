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
5. Do not set owner-managed `GEMINI_API_KEY` or `GOOGLE_GEMINI_BASE_URL`
   values in production. Netlify AI Gateway injects both at function runtime.

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
