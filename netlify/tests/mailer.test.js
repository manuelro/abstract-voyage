const nodemailer = require('nodemailer')
const mailer = require('../functions/lib/mailer')

const originalEnv = { ...process.env }
let createTransport

describe('contact mailer', () => {
  beforeEach(() => {
    process.env.CONTEXT = 'production'
    process.env.CONTACT_DELIVERY_MODE = 'smtp'
    process.env.CONTACT_SMTP_HOST = 'smtp.example.test'
    process.env.CONTACT_SMTP_PORT = '465'
    process.env.CONTACT_SMTP_SECURE = 'true'
    process.env.CONTACT_SMTP_USER = 'smtp-user'
    process.env.CONTACT_SMTP_PASS = 'smtp-password'
    process.env.CONTACT_TO_EMAIL = 'owner@example.test'
    process.env.CONTACT_FROM_EMAIL = 'site@example.test'
    createTransport = vi.spyOn(nodemailer, 'createTransport')
  })

  afterEach(() => vi.restoreAllMocks())

  afterAll(() => {
    process.env = originalEnv
  })

  it('cannot be switched to PII-logging console delivery in production', () => {
    process.env.CONTACT_DELIVERY_MODE = 'console'

    expect(mailer.getDeliveryMode()).toBe('smtp')
  })

  it('allows console delivery only outside production', () => {
    process.env.CONTEXT = 'dev'
    process.env.NODE_ENV = 'development'
    process.env.CONTACT_DELIVERY_MODE = 'console'

    expect(mailer.getDeliveryMode()).toBe('console')
  })

  it('adds bounded connection and send timeouts to SMTP', async () => {
    const sendMail = vi.fn().mockResolvedValue()
    createTransport.mockReturnValue({ sendMail })

    await mailer.sendMail({
      subject: 'Contact',
      text: 'Message',
      replyTo: 'visitor@example.test',
    })

    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    }))
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'owner@example.test',
      from: 'site@example.test',
      replyTo: 'visitor@example.test',
    }))
  })
})
