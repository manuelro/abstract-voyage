const { normalize, isProduction, parseBoolean, getDeliveryMode, sendMail } = require('./lib/mailer')

const WORK_TYPES = new Set([
  'Technology consulting',
  'Product engineering',
  'Creative engineering',
  'Systems / architecture review',
  'Other',
])

const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
})

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const getLocalDelayMs = () => {
  const value = Number(process.env.CONTACT_FORCE_DELAY_MS || 0)

  if (!Number.isFinite(value) || value <= 0) {
    return 0
  }

  return Math.min(value, 10000)
}

const parseBody = (event) => {
  const contentType = normalize(event.headers?.['content-type'] || event.headers?.['Content-Type']).toLowerCase()
  const body = event.body || ''

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(body))
  }

  return JSON.parse(body || '{}')
}

const validatePayload = (payload) => {
  const name = normalize(payload?.name)
  const email = normalize(payload?.email).toLowerCase()
  const organization = normalize(payload?.organization)
  const workType = normalize(payload?.workType)
  const message = normalize(payload?.message)
  const botField = normalize(payload?.botField)
  const errors = []

  if (botField) {
    return {
      isSpam: true,
      data: null,
      errors: [],
    }
  }

  if (!name) errors.push('Name is required.')
  if (name.length > 120) errors.push('Name is too long.')

  if (!email) {
    errors.push('Email is required.')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Email is invalid.')
  }
  if (email.length > 160) errors.push('Email is too long.')

  if (organization.length > 160) errors.push('Project / organization is too long.')

  if (workType && !WORK_TYPES.has(workType)) {
    errors.push('Type of work is invalid.')
  }

  if (!message) errors.push('Message is required.')
  if (message.length > 5000) errors.push('Message is too long.')

  return {
    isSpam: false,
    data: { name, email, organization, workType, message },
    errors,
  }
}

const formatSubmission = ({ name, email, organization, workType, message }) => [
  `Name: ${name}`,
  `Email: ${email}`,
  `Project / organization: ${organization || 'Not provided'}`,
  `Type of work: ${workType || 'Not provided'}`,
  '',
  'Message:',
  message,
].join('\n')

const sendWithSmtp = async (submission) => {
  await sendMail({
    subject: `Abstract Voyage inquiry from ${submission.name}`,
    text: formatSubmission(submission),
    replyTo: submission.email,
  })
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(204, {})
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' })
  }

  const localDelayMs = getLocalDelayMs()

  if (!isProduction() && localDelayMs > 0) {
    await delay(localDelayMs)
  }

  if (!isProduction() && parseBoolean(process.env.CONTACT_FORCE_ERROR)) {
    return json(500, { ok: false, message: 'Forced local contact form error.' })
  }

  let payload

  try {
    payload = parseBody(event)
  } catch {
    return json(400, { ok: false, message: 'Please check the required fields.' })
  }

  const validation = validatePayload(payload)

  if (validation.isSpam) {
    return json(200, { ok: true, mode: getDeliveryMode() })
  }

  if (validation.errors.length > 0) {
    return json(400, {
      ok: false,
      message: 'Please check the required fields.',
      errors: validation.errors,
    })
  }

  const mode = getDeliveryMode()

  try {
    if (mode === 'console') {
      console.info('\n[contact form submission]\n%s\n', formatSubmission(validation.data))
    } else {
      await sendWithSmtp(validation.data)
    }

    return json(200, { ok: true, mode })
  } catch (error) {
    console.error('[contact form error]', error)
    return json(500, { ok: false, message: 'Unable to send message right now.' })
  }
}
