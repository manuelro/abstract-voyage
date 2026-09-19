const DEFAULT_MODEL = 'gemini-2.5-flash-lite'
const DEFAULT_TIMEOUT_MS = 3500

class IntakeAiError extends Error {
  constructor(code, options = {}) {
    super(code)
    this.name = 'IntakeAiError'
    this.code = code
    this.retryable = options.retryable !== false
  }
}

const normalize = (value) => (typeof value === 'string' ? value.trim() : '')

const resolveModel = (value) => {
  const model = normalize(value) || DEFAULT_MODEL
  return /^[a-z0-9._-]+$/i.test(model) ? model : DEFAULT_MODEL
}

const resolveGatewayConfig = (env = process.env) => {
  // Standard (non-edge) Netlify Functions are not guaranteed the injected
  // provider env vars (GEMINI_API_KEY, NETLIFY_AI_GATEWAY_KEY/URL) — per
  // Netlify support (case 1110525), those are reliable for edge functions
  // only. The supported path for classic functions is calling the site's own
  // /.netlify/ai/ proxy and authenticating with the x-netlify-ai-gateway
  // header instead of a provider API key.
  const siteUrl = normalize(env.URL).replace(/\/+$/, '')

  if (!siteUrl) {
    throw new IntakeAiError('gateway_configuration_missing', { retryable: false })
  }

  if (!/^https?:\/\//i.test(siteUrl)) {
    throw new IntakeAiError('gateway_base_url_invalid', { retryable: false })
  }

  return { baseUrl: `${siteUrl}/.netlify/ai` }
}

const extractResponseText = (payload) => {
  const parts = payload?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts
    .filter((part) => typeof part?.text === 'string')
    .map((part) => part.text)
    .join('')
    .trim()
}

const parseStructuredResponse = (payload) => {
  const text = extractResponseText(payload)
  if (!text) throw new IntakeAiError('gateway_response_empty')

  try {
    return JSON.parse(text)
  } catch {
    throw new IntakeAiError('gateway_response_malformed')
  }
}

const requestGeminiJson = async ({
  system,
  userMessage,
  responseSchema,
  model = DEFAULT_MODEL,
  maxOutputTokens,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  env = process.env,
}) => {
  if (typeof fetchImpl !== 'function') {
    throw new IntakeAiError('fetch_unavailable', { retryable: false })
  }

  const { baseUrl } = resolveGatewayConfig(env)
  const resolvedModel = resolveModel(model)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(
      `${baseUrl}/v1beta/models/${encodeURIComponent(resolvedModel)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-netlify-ai-gateway': 'true',
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema,
            maxOutputTokens,
            temperature: 0,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: controller.signal,
      },
    )

    if (!response.ok) {
      const retryable = response.status === 408 || response.status === 409 ||
        response.status === 425 || response.status === 429 || response.status >= 500
      throw new IntakeAiError(`gateway_http_${response.status}`, { retryable })
    }

    let payload
    try {
      payload = await response.json()
    } catch {
      throw new IntakeAiError('gateway_body_malformed')
    }

    return {
      data: parseStructuredResponse(payload),
      usage: {
        inputTokens: Number(payload?.usageMetadata?.promptTokenCount) || 0,
        outputTokens: Number(payload?.usageMetadata?.candidatesTokenCount) || 0,
        totalTokens: Number(payload?.usageMetadata?.totalTokenCount) || 0,
      },
      model: resolvedModel,
    }
  } catch (error) {
    if (error instanceof IntakeAiError) throw error
    if (error?.name === 'AbortError') throw new IntakeAiError('gateway_timeout')
    throw new IntakeAiError('gateway_request_failed')
  } finally {
    clearTimeout(timeoutId)
  }
}

module.exports = {
  DEFAULT_MODEL,
  DEFAULT_TIMEOUT_MS,
  IntakeAiError,
  extractResponseText,
  parseStructuredResponse,
  requestGeminiJson,
  resolveGatewayConfig,
  resolveModel,
}
