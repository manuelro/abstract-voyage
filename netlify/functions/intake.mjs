// Contact intake entry point — a Netlify Functions v2 (ESM) function.
//
// Why v2: Netlify AI Gateway injects the provider credentials
// (GEMINI_API_KEY, GOOGLE_GEMINI_BASE_URL) into the runtime of v2 functions
// only. A v1 (lambda-compat) function receives none of the Gateway variables,
// so the previous `exports.handler` form failed every call with
// `gateway_configuration_missing` before making any request. See
// CONTACT-AI-GATEWAY.md.
//
// All request handling, validation, prompts, token signing, and delivery live
// in ./lib/intake-handler.js (classic CommonJS, still invoked directly by the
// test suite). This file is only the v2 adapter: it converts the incoming Web
// `Request` into the `{ httpMethod, headers, body }` event the core expects and
// converts the core's `{ statusCode, headers, body }` result into a `Response`.
//
// The core (and its mailer) reach zod and nodemailer through CommonJS
// `require`. esbuild bundles ESM `import`s but rewrites inlined `require`s into
// runtime shims that the file tracer never ships, so importing these packages
// here as ESM is what pulls them into the bundle; the core's `require` calls
// then resolve to these same bundled copies. Without these two lines the
// deployed function dies at cold start with `Cannot find module 'zod'`.
import 'zod'
import 'nodemailer'
import * as core from './lib/intake-handler.js'

const handle = core.handler ?? core.default?.handler

// Statuses that must not carry a response body.
const BODILESS_STATUSES = new Set([204, 205, 304])

export default async (req) => {
  const headers = {}
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value
  })

  const method = req.method
  const body = method === 'GET' || method === 'HEAD' ? '' : await req.text()

  const result = await handle({ httpMethod: method, headers, body })

  const status = result?.statusCode ?? 200
  const payload = BODILESS_STATUSES.has(status) ? null : (result?.body ?? '')
  return new Response(payload, {
    status,
    headers: result?.headers ?? { 'Content-Type': 'application/json' },
  })
}
