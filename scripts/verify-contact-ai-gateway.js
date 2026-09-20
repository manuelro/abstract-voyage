#!/usr/bin/env node
// Live, local integration probe for the Contact AI path. This intentionally
// stops before delivery: it proves the local function can reach Netlify AI
// Gateway and receive Gemini's validated output without sending email or
// touching production content. Run it only while `netlify dev` is serving the
// site. See CONTACT-AI-GATEWAY.md.

const baseUrl = (process.env.CONTACT_GATEWAY_BASE_URL || 'http://127.0.0.1:8888')
  .replace(/\/+$/, '')
const endpoint = `${baseUrl}/.netlify/functions/intake`
const timeoutMs = Number(process.env.CONTACT_GATEWAY_SMOKE_TIMEOUT_MS) || 15000

const transcript = [
  'Visitor: Our checkout rebuild is blocked because its tax calculation and shipping rules disagree.',
  'Visitor: I need help choosing a safe migration path before the next release.',
].join('\n')

const fail = (message) => {
  console.error(`Contact AI Gateway smoke test failed: ${message}`)
  process.exitCode = 1
}

const post = async (stage) => {
  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, transcript }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    throw new Error(`${stage} request could not reach local Netlify Dev (${error.message})`)
  }

  let body
  try {
    body = await response.json()
  } catch {
    throw new Error(`${stage} returned HTTP ${response.status} without JSON`)
  }

  if (!response.ok) {
    throw new Error(`${stage} returned HTTP ${response.status}: ${body.message || 'no message'}`)
  }
  return body
}

const run = async () => {
  console.log(`Probing local Contact intake at ${endpoint}`)

  const gapCheck = await post('gap-check')
  if (gapCheck.ok !== true || typeof gapCheck.needsFollowUp !== 'boolean') {
    throw new Error('gap-check did not return a valid successful intake response')
  }
  if (gapCheck.needsFollowUp && typeof gapCheck.question !== 'string') {
    throw new Error('gap-check requested a follow-up without a question')
  }

  const recap = await post('recap')
  if (recap.ok !== true || typeof recap.recap !== 'string' || !recap.recap.trim()) {
    throw new Error('recap did not return a non-empty successful AI response')
  }

  console.log('PASS — local function reached AI Gateway and Gemini returned valid gap-check and recap responses.')
  console.log(`Gap-check: ${gapCheck.needsFollowUp ? 'follow-up requested' : 'enough context'}; recap length: ${recap.recap.length}.`)
}

run().catch((error) => fail(error.message))
