const {
  DEFAULT_MODEL,
  IntakeAiError,
  requestGeminiJson,
} = require('../functions/lib/intake-ai')

const env = {
  GEMINI_API_KEY: 'netlify-managed-test-key',
  GOOGLE_GEMINI_BASE_URL: 'https://gateway.example.test/',
}

const gatewayResponse = (data, usageMetadata = {}) => ({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue({
    candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }],
    usageMetadata,
  }),
})

const request = (overrides = {}) => requestGeminiJson({
  system: 'System rules',
  userMessage: 'Untrusted visitor transcript',
  responseSchema: {
    type: 'object',
    properties: { accepted: { type: 'boolean' } },
    required: ['accepted'],
  },
  maxOutputTokens: 64,
  env,
  ...overrides,
})

describe('Gemini AI Gateway adapter', () => {
  it('selects Flash-Lite and returns structured JSON with usage metadata', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(gatewayResponse(
      { accepted: true },
      { promptTokenCount: 12, candidatesTokenCount: 4, totalTokenCount: 16 },
    ))

    const result = await request({ fetchImpl })

    expect(result).toEqual({
      data: { accepted: true },
      model: DEFAULT_MODEL,
      usage: { inputTokens: 12, outputTokens: 4, totalTokens: 16 },
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, options] = fetchImpl.mock.calls[0]
    expect(url).toBe(`https://gateway.example.test/v1beta/models/${DEFAULT_MODEL}:generateContent`)
    expect(options.headers['x-goog-api-key']).toBe(env.GEMINI_API_KEY)
    expect(JSON.parse(options.body)).toMatchObject({
      systemInstruction: { parts: [{ text: 'System rules' }] },
      contents: [{ role: 'user', parts: [{ text: 'Untrusted visitor transcript' }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 64,
        temperature: 0,
      },
    })
  })

  it('uses an explicitly configured safe model name', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(gatewayResponse({ accepted: true }))

    await request({ fetchImpl, model: 'gemini-2.5-flash-lite' })

    expect(fetchImpl.mock.calls[0][0]).toContain('/gemini-2.5-flash-lite:generateContent')
  })

  it('aborts a request at the configured timeout', async () => {
    const fetchImpl = vi.fn((_url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('aborted')
        error.name = 'AbortError'
        reject(error)
      })
    }))

    await expect(request({ fetchImpl, timeoutMs: 5 })).rejects.toMatchObject({
      code: 'gateway_timeout',
    })
  })

  it('normalizes provider failures without exposing the response body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 })

    await expect(request({ fetchImpl })).rejects.toMatchObject({
      code: 'gateway_http_503',
    })
  })

  it('does not mark deterministic client errors as retryable', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 400 })

    await expect(request({ fetchImpl })).rejects.toMatchObject({
      code: 'gateway_http_400',
      retryable: false,
    })
  })

  it('rejects malformed structured output', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: 'not json' }] } }],
      }),
    })

    await expect(request({ fetchImpl })).rejects.toMatchObject({
      code: 'gateway_response_malformed',
    })
  })

  it('fails without Netlify-managed Gateway configuration', async () => {
    await expect(request({ env: {}, fetchImpl: vi.fn() })).rejects.toEqual(
      expect.objectContaining({
        code: 'gateway_configuration_missing',
        retryable: false,
      }),
    )
  })

  it('uses typed adapter errors', () => {
    expect(new IntakeAiError('test')).toMatchObject({
      name: 'IntakeAiError',
      code: 'test',
      retryable: true,
    })
  })
})
