const nodemailer = require('nodemailer')

const normalize = (value) => (typeof value === 'string' ? value.trim() : '')

const isProduction = () => process.env.CONTEXT === 'production' || process.env.NODE_ENV === 'production'

const parseBoolean = (value, defaultValue = false) => {
  const normalized = normalize(value).toLowerCase()

  if (!normalized) return defaultValue
  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

const getDeliveryMode = () => {
  const configuredMode = normalize(process.env.CONTACT_DELIVERY_MODE).toLowerCase()

  if (configuredMode === 'console' || configuredMode === 'smtp') {
    return configuredMode
  }

  return isProduction() ? 'smtp' : 'console'
}

const getSmtpConfig = () => {
  const required = [
    'CONTACT_SMTP_HOST',
    'CONTACT_SMTP_PORT',
    'CONTACT_SMTP_USER',
    'CONTACT_SMTP_PASS',
    'CONTACT_TO_EMAIL',
    'CONTACT_FROM_EMAIL',
  ]
  const missing = required.filter((key) => !normalize(process.env[key]))

  if (missing.length > 0) {
    throw new Error(`Missing SMTP environment variables: ${missing.join(', ')}`)
  }

  const port = Number(process.env.CONTACT_SMTP_PORT)

  if (!Number.isFinite(port)) {
    throw new Error('CONTACT_SMTP_PORT must be a number')
  }

  return {
    host: normalize(process.env.CONTACT_SMTP_HOST),
    port,
    secure: parseBoolean(process.env.CONTACT_SMTP_SECURE, port === 465),
    auth: {
      user: normalize(process.env.CONTACT_SMTP_USER),
      pass: normalize(process.env.CONTACT_SMTP_PASS),
    },
    to: normalize(process.env.CONTACT_TO_EMAIL),
    from: normalize(process.env.CONTACT_FROM_EMAIL),
  }
}

const sendMail = async ({ subject, text, replyTo }) => {
  const config = getSmtpConfig()
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  })

  await transporter.sendMail({
    to: config.to,
    from: config.from,
    ...(replyTo ? { replyTo } : {}),
    subject,
    text,
  })
}

module.exports = {
  normalize,
  isProduction,
  parseBoolean,
  getDeliveryMode,
  getSmtpConfig,
  sendMail,
}
