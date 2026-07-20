const Anthropic = require('@anthropic-ai/sdk')
const OpenAI = require('openai')
const { normalize, getDeliveryMode, sendMail } = require('./lib/mailer')

// ── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_AGENT_NAME = 'Relay'

// Gap-check runs on the fast/cheap tier — it is a single yes/no decision plus,
// at most, one short question. The recap is the one artefact Manuel actually
// reads before replying, so it runs on the strongest available tier even
// though that costs more per conversation (see intake spec, "Model behavior").
const DEFAULT_GAP_CHECK_MODELS = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
}
const DEFAULT_RECAP_MODELS = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-4o',
}

const MAX_TRANSCRIPT_LENGTH = 8000
const MAX_IDENTITY_LENGTH = 300
const MAX_RECAP_LENGTH = 4000

// Best-effort, in-memory per-warm-container rate limit. This does not survive
// a cold start and is not shared across concurrent Lambda instances — it
// mitigates a single actor hammering one warm function, nothing stronger. For
// durable, cross-instance protection, move this to Netlify Blobs or a real
// rate-limiting layer if abuse becomes a real problem.
const RATE_LIMIT_WINDOW_MS = Number(process.env.INTAKE_RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000
const RATE_LIMIT_MAX = Number(process.env.INTAKE_RATE_LIMIT_MAX) || 12
const rateLimitHits = new Map()

// ── System prompts ──────────────────────────────────────────────────────────
//
// Both prompts are direct translations of the voice/composition rules in the
// intake spec (section 5). Keep them in sync with that document if the rules
// change — this is the only place they are enforced.

const GAP_CHECK_SYSTEM_PROMPT = `You are the reasoning step behind a first-contact relay for Manuel. A visitor has written one or more messages and may have already answered some follow-up questions. Your only job: decide whether Manuel could already write a specific, non-generic reply from everything you have, and if not, produce exactly one follow-up question.

Decide "needsFollowUp": false once there is enough for Manuel to reply with something specific — the situation, and either what they want or enough to infer it. Decide true only if a specific reply is still not possible.

You will be told how many follow-up questions have already been asked in this conversation. There is a hard ceiling of 3 total, enforced outside this decision, but treat every question as expensive: each one must be cheaper for the visitor to answer than the last was, and as the count rises you should strongly prefer resolving over continuing. Never ask because a field exists.

If the visitor's most recent answer was a declared not-knowing — "unsure", "I don't know", "not sure yet", "hard to say", or similar — treat that as different from a low-resolution description: it is a statement that they cannot answer at that level, not an invitation to clarify further. Do not escalate. Either decide false and let the recap work with what already exists, or ask something strictly easier than the question that produced that answer. Never follow "I don't know" with a question of equal or greater difficulty, and never imply that not knowing is a deficiency.

If true, generate ONE follow-up question. Choose what to ask from this repertoire, in priority order — pick the first one still open given what they have told you:
1. The trigger — what made this the moment, or what made them look for help.
2. A concrete instance — the last time it went wrong.
3. The desired state — what better looks like.
4. The stakes — what happens if nothing changes.
5. The constraint — what cannot move.

Items 2 through 5 each require something concrete already on the table — an instance, a system, a recurrence, a team, a deadline — that the visitor themselves stated. If nothing concrete has been established yet, only item 1 is available: their arrival is the one event guaranteed to have happened, so ask what made them look for help, or open with the specific noun they used and ask what it is.

Rules for the question, all mandatory:
- Exactly one question. Never two clauses joined by "and". No double-barrelled questions.
- Open by reusing the visitor's own words, then ask. Do not summarize or restate their message as a statement — the reference exists only to open the question. After a thin or uncertain answer, keep this opener minimal ("That's fine." is enough) rather than trying to extract more from an answer that has already been given.
- Ask about the specific noun they used, not their situation in general.
- Never use "this", "it", or "that" without an antecedent the visitor themselves supplied in an earlier turn. Name the noun they used, or name nothing.
- Never presuppose facts they have not stated. Do not assume recurrence, a prior incident, an existing attempt, a team, a deadline, or a system exists unless they said so — a question that assumes something unstated makes the visitor search earlier turns for what they think they missed.
- The vaguer their input, the more concrete your question must be. Never broaden in response to vagueness, and never hand their own abstraction back to them. If they say "I have a project", ask "What's the project?" — not "What would you want to achieve with it?".
- When their input is abstract, ask about an event rather than an intention: what happened, not what they want. This requires an event to exist — if nothing concrete has been established, there is no episode to recall, and their arrival is the only event always available ("What made you look for help?").
- Ask only what unlocks a specific reply from Manuel.
- Never ask about budget. Never ask about timeline, deadline, "when do you need this", or what they have already tried — none of these belong at first contact, and all are recoverable later at no cost.
- Do not presume organisation type, size, stage, team, or role. Never say "your team", "your startup", or "your company" unless they used that word first.
- Keep it short. When their input is thin, make the question shorter and more concrete, not longer — question length signals expected answer length.
- A brief example is allowed, but only when the previous answer added nothing, e.g. "What's the project? Even a line is enough, something like a rebuild, an integration, a migration." A list of options to choose from is never allowed: the visitor should be able to borrow the example, not be made to select from a menu.
- If the question is at all sensitive, attach an out: "if you know" or "or leave it for Manuel".
- First person, plain declaratives. No em dashes. No exclamation marks.
- No brightness: never "great", "perfect", "amazing", "I'd love to".
- Never claim a trait or a feeling for yourself ("careful", "excited", "I care about this").

Never invent facts the visitor did not give you.

Output ONLY raw JSON. No markdown, no backticks, no commentary.
If no follow-up is needed, output exactly: {"needsFollowUp": false}
If a follow-up is needed, output exactly: {"needsFollowUp": true, "question": "<the single question, following every rule above>"}`

const RECAP_SYSTEM_PROMPT = `You are the reasoning step behind a first-contact relay for Manuel. A visitor has written one or two messages. Your only job: produce one ordered account of what they said, for Manuel to read before replying.

Rules, all mandatory:
- Use their vocabulary. Do not re-categorise it into business or consulting language.
- Order their account. Do not interpret, diagnose, or reframe what they told you.
- Never longer than what they wrote combined. Usually shorter.
- No adjectives that praise, evaluate, or add warmth. Any warmth in this text comes only from being accurate, not from word choice.
- No fit assessment, no internal notes, no recommendation. Nothing beyond what they told you, ordered.
- Second person voice ("You said...", "You want..."), reusing their phrases directly wherever possible.
- Do not add anything they did not say. Do not soften, qualify, or add caveats they did not raise.
- No em dashes, no exclamation marks, no claimed feelings.

Output ONLY raw JSON. No markdown, no backticks, no commentary.
Output exactly: {"recap": "<the ordered account, 1 to 4 short sentences>"}`

// ── Small helpers ────────────────────────────────────────────────────────────

const json = (statusCode, payload) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})

const getProvider = () => {
  const configured = normalize(process.env.INTAKE_PROVIDER).toLowerCase()
  return configured === 'openai' ? 'openai' : 'anthropic'
}

const getApiKey = (provider) =>
  normalize(provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY)

const getAgentName = () => normalize(process.env.AGENT_NAME) || DEFAULT_AGENT_NAME

const getGapCheckModel = (provider) =>
  normalize(process.env.INTAKE_MODEL) || DEFAULT_GAP_CHECK_MODELS[provider]

const getRecapModel = (provider) =>
  normalize(process.env.INTAKE_RECAP_MODEL) || DEFAULT_RECAP_MODELS[provider]

const stripFences = (text) =>
  text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()

const callAnthropic = async ({ apiKey, model, system, userMessage }) => {
  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: userMessage }],
  })
  const textBlock = response.content?.find((block) => block.type === 'text')
  return textBlock?.text || ''
}

const callOpenAI = async ({ apiKey, model, system, userMessage }) => {
  const client = new OpenAI({ apiKey })
  const response = await client.chat.completions.create({
    model,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userMessage },
    ],
  })
  return response.choices?.[0]?.message?.content || ''
}

const requestJson = async (params) => {
  const caller = params.provider === 'openai' ? callOpenAI : callAnthropic
  const raw = await caller(params)
  return JSON.parse(stripFences(raw))
}

const isValidGapCheckStep = (data) => {
  if (!data || typeof data !== 'object') return false
  if (data.needsFollowUp === false) return true
  if (data.needsFollowUp === true) return typeof data.question === 'string' && data.question.trim().length > 0
  return false
}

const isValidRecapStep = (data) =>
  Boolean(data && typeof data === 'object' && typeof data.recap === 'string' && data.recap.trim().length > 0)

// A lightweight, deliberately narrow safety net: the model is instructed
// never to ask about budget, timeline, or what the visitor has already
// tried, but instructions can be missed. If a generated follow-up question
// slips through with any of these, drop the question rather than risk
// sending it — a message that already unlocks a reply (needsFollowUp: false)
// is always a safe fallback here.
const FORBIDDEN_QUESTION_PATTERN = /\bbudget\b|\btimeline\b|\bdeadline\b|\bwhen do you need\b|\btried\b/i

const runWithRetry = async (params, validator, attempts = 2) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const data = await requestJson(params)
      if (validator(data)) return data
    } catch (error) {
      console.error(`[intake] model call/parse failed (attempt ${attempt + 1})`, error)
    }
  }
  return null
}

// ── Rate limiting + honeypot ────────────────────────────────────────────────

const getClientIp = (event) => {
  const forwarded = normalize(event.headers?.['x-nf-client-connection-ip']) ||
    normalize(event.headers?.['x-forwarded-for']).split(',')[0].trim()
  return forwarded || 'unknown'
}

const isRateLimited = (ip) => {
  const now = Date.now()
  const hits = (rateLimitHits.get(ip) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)
  hits.push(now)
  rateLimitHits.set(ip, hits)
  // Guard against unbounded growth on a long-lived warm container.
  if (rateLimitHits.size > 5000) rateLimitHits.clear()
  return hits.length > RATE_LIMIT_MAX
}

// ── Delivery ─────────────────────────────────────────────────────────────────

const EMAIL_PATTERN = /[^\s<>()]+@[^\s<>()]+\.[^\s<>()]+/

const extractReplyToEmail = (identity) => {
  const match = EMAIL_PATTERN.exec(identity)
  return match ? match[0] : undefined
}

const formatDeliveryEmail = ({ recap, identity, transcript, raw }) => [
  `Reply to: ${identity}`,
  '',
  raw ? 'Sent as-is (unprocessed by the agent):' : 'Recap:',
  recap,
  '',
  'Full transcript:',
  transcript,
].join('\n')

// Optional additional forward (CRM/Slack/Sheet/etc). Independent of email
// delivery — never blocks or determines what the visitor sees; failures here
// are logged, not surfaced.
const forwardToWebhook = async (payload) => {
  const webhookUrl = normalize(process.env.LEAD_WEBHOOK_URL)
  if (!webhookUrl) return
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`Webhook responded with ${response.status}`)
}

// ── Stage handlers ───────────────────────────────────────────────────────────

const clampFollowUpCount = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(3, Math.max(0, Math.trunc(parsed))) : 0
}

// Adaptive 0-3 follow-ups: the client re-calls this stage after each answer,
// passing the running transcript plus how many follow-ups have already
// fired. The hard ceiling of 3 is enforced client-side (see pages/contact.tsx
// runGapCheck) — this handler just answers the same sufficiency question
// every time, with the count folded into the prompt so the model itself
// leans toward resolving as it rises.
const handleGapCheck = async (payload) => {
  const transcript = normalize(payload.transcript).slice(0, MAX_TRANSCRIPT_LENGTH)
  if (!transcript) return json(400, { ok: false, message: 'A transcript is required.' })
  const followUpCount = clampFollowUpCount(payload.followUpCount)

  const provider = getProvider()
  const apiKey = getApiKey(provider)
  if (!apiKey) {
    console.error(`[intake] missing API key for provider "${provider}" — degraded mode`)
    return json(200, { ok: false, degraded: true })
  }

  const data = await runWithRetry({
    provider,
    apiKey,
    model: getGapCheckModel(provider),
    system: GAP_CHECK_SYSTEM_PROMPT,
    userMessage: `${transcript}\n\n(${followUpCount} follow-up question(s) already asked, out of a maximum of 3.)\nReturn the decision as JSON.`,
  }, isValidGapCheckStep)

  if (!data) return json(200, { ok: false, degraded: true })

  if (data.needsFollowUp && FORBIDDEN_QUESTION_PATTERN.test(data.question)) {
    console.error('[intake] gap-check question tripped the forbidden-topic guard, dropping it', data.question)
    return json(200, { ok: true, needsFollowUp: false })
  }

  return json(200, data.needsFollowUp
    ? { ok: true, needsFollowUp: true, question: data.question.trim() }
    : { ok: true, needsFollowUp: false })
}

const handleRecap = async (payload) => {
  const transcript = normalize(payload.transcript).slice(0, MAX_TRANSCRIPT_LENGTH)
  if (!transcript) return json(400, { ok: false, message: 'A transcript is required.' })

  const provider = getProvider()
  const apiKey = getApiKey(provider)
  if (!apiKey) {
    console.error(`[intake] missing API key for provider "${provider}" — degraded mode`)
    return json(200, { ok: false, degraded: true })
  }

  const data = await runWithRetry({
    provider,
    apiKey,
    model: getRecapModel(provider),
    system: RECAP_SYSTEM_PROMPT,
    userMessage: `${transcript}\n\nReturn the recap as JSON.`,
  }, isValidRecapStep)

  if (!data) return json(200, { ok: false, degraded: true })
  return json(200, { ok: true, recap: data.recap.trim().slice(0, MAX_RECAP_LENGTH) })
}

const handleDeliver = async (payload) => {
  const recap = normalize(payload.recap).slice(0, MAX_RECAP_LENGTH)
  const identity = normalize(payload.identity).slice(0, MAX_IDENTITY_LENGTH)
  const transcript = normalize(payload.transcript).slice(0, MAX_TRANSCRIPT_LENGTH)
  const raw = payload.raw === true

  if (!recap) return json(400, { ok: false, message: 'Nothing to send yet.' })
  if (!identity) return json(400, { ok: false, message: 'Somewhere to reply is required.' })

  const mode = getDeliveryMode()
  const replyTo = extractReplyToEmail(identity)
  const emailPayload = { recap, identity, transcript: transcript || recap, raw }
  const subject = `Abstract Voyage — new message via ${getAgentName()}${raw ? ' (sent as-is)' : ''}`

  try {
    if (mode === 'console') {
      console.info('\n[intake delivery] %s\n%s\n', subject, formatDeliveryEmail(emailPayload))
    } else {
      // Awaited, not fire-and-forget: the visitor only sees the close copy
      // (which asserts Manuel has the message) once this has actually
      // succeeded. A 5xx below surfaces in Netlify's function error metrics.
      await sendMail({
        subject,
        text: formatDeliveryEmail(emailPayload),
        ...(replyTo ? { replyTo } : {}),
      })
    }
  } catch (error) {
    console.error('[intake:deliver:FAILED]', error)
    return json(502, { ok: false, message: 'Unable to send that right now.' })
  }

  forwardToWebhook({
    receivedAt: new Date().toISOString(),
    recap,
    identity,
    transcript,
    raw,
  }).catch((error) => console.error('[intake] webhook forward failed', error))

  return json(200, { ok: true })
}

// Honeypot responses are shaped to look identical to a real success for each
// stage, so an automated filler never learns detection occurred.
const honeypotResponse = (stage) => {
  if (stage === 'recap') return json(200, { ok: true, recap: '' })
  if (stage === 'deliver') return json(200, { ok: true })
  return json(200, { ok: true, needsFollowUp: false })
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {})
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' })

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { ok: false, message: 'Please check the request body.' })
  }

  const stage = normalize(payload.stage)
  if (!['gap-check', 'recap', 'deliver'].includes(stage)) {
    return json(400, { ok: false, message: 'Unknown stage.' })
  }

  // Checked before the honeypot short-circuit so a script hammering the
  // endpoint via the honeypot path is still throttled, not just a real
  // visitor triggering real model/SMTP costs.
  if (isRateLimited(getClientIp(event))) {
    return json(429, { ok: false, message: 'Too many requests. Try again shortly.' })
  }

  if (normalize(payload.botField)) return honeypotResponse(stage)

  if (stage === 'gap-check') return handleGapCheck(payload)
  if (stage === 'recap') return handleRecap(payload)
  return handleDeliver(payload)
}
