const Anthropic = require('@anthropic-ai/sdk')
const OpenAI = require('openai')
const { normalize, getDeliveryMode, sendMail } = require('./lib/mailer')

const DEFAULT_CONSULTANT_NAME = 'Maya Chen'
const DEFAULT_CONSULTANT_ROLE = 'an independent brand & growth consultant for early-stage founders'

const DEFAULT_MODELS = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
}

const MAX_QUESTIONS = 5

const SYSTEM_PROMPT_TEMPLATE = `You are conducting a warm first-contact intake on the website of {CONSULTANT_NAME}, {CONSULTANT_ROLE}. You speak in their own voice: friendly, sharp, curious, human, never corporate.

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
 }}`

const FALLBACK_QUESTIONS = [
  {
    message: "What does your company do, and what's the core problem you're hoping to solve?",
    placeholder: 'Company & core problem',
  },
  {
    message: 'What have you already tried to fix this?',
    placeholder: "What you've tried",
  },
  {
    message: "What's your timeline looking like?",
    placeholder: 'Rough timeline',
  },
  {
    message: 'Any budget or engagement range in mind, roughly?',
    placeholder: 'Budget signal (optional)',
  },
]

const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
})

const getProvider = () => {
  const configured = normalize(process.env.INTAKE_PROVIDER).toLowerCase()
  return configured === 'openai' ? 'openai' : 'anthropic'
}

const getApiKey = (provider) =>
  normalize(provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY)

const buildSystemPrompt = () => {
  const name = normalize(process.env.CONSULTANT_NAME) || DEFAULT_CONSULTANT_NAME
  const role = normalize(process.env.CONSULTANT_ROLE) || DEFAULT_CONSULTANT_ROLE

  return SYSTEM_PROMPT_TEMPLATE.split('{CONSULTANT_NAME}').join(name).split('{CONSULTANT_ROLE}').join(role)
}

const buildUserMessage = (transcript, questionsAsked) =>
  `${transcript}\n\n(You have asked ${questionsAsked} question(s). Finish by the 5th.)\nReturn the next step as JSON.`

const stripFences = (text) =>
  text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()

const isConsultantCard = (card) =>
  card &&
  typeof card === 'object' &&
  ['fit', 'headline', 'problem', 'tried', 'timeline', 'budget', 'notes', 'draftReply'].every(
    (key) => typeof card[key] === 'string'
  )

const isValidStep = (data) => {
  if (!data || typeof data !== 'object') return false

  if (data.done === false) {
    return typeof data.message === 'string' && typeof data.placeholder === 'string'
  }

  if (data.done === true) {
    return typeof data.visitorSummary === 'string' && isConsultantCard(data.consultant)
  }

  return false
}

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

const requestStep = async (params) => {
  const caller = params.provider === 'openai' ? callOpenAI : callAnthropic
  const raw = await caller(params)
  return JSON.parse(stripFences(raw))
}

const getModelStep = async (params) => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const data = await requestStep(params)
      if (isValidStep(data)) return data
    } catch (error) {
      console.error(`[intake] model call/parse failed (attempt ${attempt + 1})`, error)
    }
  }

  return null
}

const scriptedStep = (questionsAsked, transcript) => {
  if (questionsAsked < FALLBACK_QUESTIONS.length) {
    return { done: false, ...FALLBACK_QUESTIONS[questionsAsked] }
  }

  return synthesizeFinished(transcript)
}

const synthesizeFinished = (transcript) => {
  const visitorLines = transcript
    .split('\n')
    .filter((line) => line.startsWith('Visitor:'))
    .map((line) => line.replace('Visitor:', '').trim())

  const [problem = 'Not specified', tried = 'Nothing yet mentioned', timeline = 'Not specified', budget = 'Not specified'] =
    visitorLines

  return {
    done: true,
    visitorSummary:
      "Thanks for walking me through this — I've got a good starting picture and will follow up personally soon.",
    consultant: {
      fit: 'Worth a call',
      headline: 'New inbound inquiry',
      problem,
      tried,
      timeline,
      budget,
      notes: 'Assembled via scripted fallback — the model was unavailable for this session.',
      draftReply: `Thanks for reaching out and sharing the details — I'd like to learn more about this. Let's find time to talk this week.`,
    },
  }
}

const formatLeadEmail = (lead) => [
  `Fit: ${lead.fit}`,
  `Headline: ${lead.headline}`,
  `Problem: ${lead.problem}`,
  `Tried: ${lead.tried}`,
  `Timeline: ${lead.timeline}`,
  `Budget: ${lead.budget}`,
  '',
  'Notes:',
  lead.notes,
  '',
  'Draft reply:',
  lead.draftReply,
  '',
  'Transcript:',
  lead.transcript,
].join('\n')

// Same delivery mechanism as netlify/functions/contact.js: console locally,
// SMTP (via the shared CONTACT_SMTP_* config) in production.
const emailLead = async (lead) => {
  const text = formatLeadEmail(lead)

  if (getDeliveryMode() === 'console') {
    console.info('\n[intake lead]\n%s\n', text)
    return
  }

  await sendMail({
    subject: `Abstract Voyage guided intake — ${lead.headline}`,
    text,
  })
}

// Optional additional forward (CRM/Slack/Sheet/etc). Independent of email
// delivery — a failure here never blocks or suppresses the email above.
const forwardToWebhook = async (lead) => {
  const webhookUrl = normalize(process.env.LEAD_WEBHOOK_URL)
  if (!webhookUrl) return

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead),
  })

  if (!response.ok) {
    throw new Error(`Webhook responded with ${response.status}`)
  }
}

const forwardLead = async (step, transcript) => {
  const lead = {
    receivedAt: new Date().toISOString(),
    ...step.consultant,
    transcript,
  }

  await Promise.all([
    emailLead(lead).catch((error) => console.error('[intake] email delivery failed', error)),
    forwardToWebhook(lead).catch((error) => console.error('[intake] webhook delivery failed', error)),
  ])
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(204, {})
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { done: false, message: 'Method not allowed.', placeholder: '' })
  }

  let payload

  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    payload = {}
  }

  const transcript = normalize(payload.transcript)
  const questionsAskedRaw = Number(payload.questionsAsked)
  const questionsAsked = Number.isFinite(questionsAskedRaw) ? Math.max(0, Math.trunc(questionsAskedRaw)) : 0

  const provider = getProvider()
  const apiKey = getApiKey(provider)
  const model = normalize(process.env.INTAKE_MODEL) || DEFAULT_MODELS[provider]

  let step = null

  if (apiKey) {
    const system = buildSystemPrompt()
    const userMessage = buildUserMessage(transcript, questionsAsked)
    step = await getModelStep({ provider, apiKey, model, system, userMessage })
  } else {
    console.error(`[intake] Missing API key for provider "${provider}" — using scripted fallback.`)
  }

  if (!step) {
    step = scriptedStep(questionsAsked, transcript)
  } else if (step.done === false && questionsAsked >= MAX_QUESTIONS) {
    step = synthesizeFinished(transcript)
  }

  if (step.done === true) {
    // Awaited (not truly fire-and-forget) so the Lambda doesn't freeze the
    // process before delivery completes; failures are swallowed inside
    // forwardLead so they never affect the visitor-facing response.
    await forwardLead(step, transcript).catch((error) => {
      console.error('[intake] lead forwarding failed', error)
    })
  }

  return json(200, step)
}
