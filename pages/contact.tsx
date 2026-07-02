import Head from 'next/head'
import Link from 'next/link'
import { FormEvent, useState } from 'react'
import SynthLayout from '../experiences/synth/components/SynthLayout'

const workTypes = [
  'Technology consulting',
  'Product engineering',
  'Creative engineering',
  'Systems / architecture review',
  'Other',
]

const controlClassName = 'min-h-11 rounded-none border border-white/12 bg-slate-950 px-3 py-2 text-base text-slate-50 caret-slate-50 outline-none transition-colors placeholder:text-slate-300/28 focus:border-white/42 [color-scheme:dark]'

const contactEndpoint = '/.netlify/functions/contact'

export default function ContactPage() {
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [submitError, setSubmitError] = useState('Something went wrong while sending. Please try again or email reach@abstract.voyage.')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const payload = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      organization: String(formData.get('organization') ?? ''),
      workType: String(formData.get('workType') ?? ''),
      message: String(formData.get('message') ?? ''),
      botField: String(formData.get('botField') ?? ''),
    }

    setSubmitState('sending')
    setSubmitError('Something went wrong while sending. Please try again or email reach@abstract.voyage.')

    try {
      const response = await fetch(form.action || contactEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok || result?.ok !== true) {
        throw new Error(result?.message || 'Unable to send message right now.')
      }

      form.reset()
      setSubmitState('success')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to send message right now.')
      setSubmitState('error')
    }
  }

  return (
    <SynthLayout
      controls={(
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.18em] text-slate-200/55 transition-colors hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          Home
        </Link>
      )}
    >
      <Head>
        <title>Start a conversation | Abstract Voyage</title>
        <meta
          name="description"
          content="Contact Abstract Voyage for technology consulting, creative engineering, systems thinking, product engineering, and architecture work."
        />
      </Head>
      <style jsx global>{`
        .contact-form-control:-webkit-autofill,
        .contact-form-control:-webkit-autofill:hover,
        .contact-form-control:-webkit-autofill:focus {
          -webkit-text-fill-color: rgb(248 250 252);
          box-shadow: 0 0 0 1000px rgb(2 6 23) inset;
          caret-color: rgb(248 250 252);
        }
      `}</style>

      <section className="grid min-h-[calc(100vh-180px)] w-full items-start gap-10 py-4 text-slate-50 lg:grid-cols-[minmax(0,0.85fr)_minmax(360px,520px)] lg:items-center lg:py-10">
        <div className="max-w-[62ch]">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-200/45">
            Abstract Voyage
          </p>
          <h1 className="mt-5 max-w-[12ch] text-4xl font-semibold tracking-tight text-slate-50 md:text-6xl">
            Start a conversation
          </h1>
          <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-slate-100/72 md:text-lg">
            Have a systems, product, or creative engineering problem worth exploring? Send a note and I&apos;ll get back to you.
          </p>
          <p className="mt-8 text-sm text-slate-200/62">
            Prefer email?{' '}
            <a
              href="mailto:reach@abstract.voyage"
              className="text-slate-50 underline decoration-slate-300/50 underline-offset-4 transition-colors hover:decoration-slate-50"
            >
              reach@abstract.voyage
            </a>
          </p>
        </div>

        <form
          name="contact"
          method="POST"
          action={contactEndpoint}
          onSubmit={handleSubmit}
          className="w-full border border-white/10 bg-slate-950/34 p-5 shadow-2xl shadow-black/20 backdrop-blur-md md:p-6"
        >
          <p className="hidden">
            <label>
              Do not fill this out if you are human:
              <input name="botField" autoComplete="off" tabIndex={-1} />
            </label>
          </p>

          <div className="grid gap-5">
            <label className="grid gap-2 text-sm text-slate-100/82" htmlFor="name">
              Name
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                className={`contact-form-control ${controlClassName}`}
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-100/82" htmlFor="email">
              Email
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className={`contact-form-control ${controlClassName}`}
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-100/82" htmlFor="organization">
              Project / organization
              <input
                id="organization"
                name="organization"
                type="text"
                autoComplete="organization"
                className={`contact-form-control ${controlClassName}`}
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-100/82" htmlFor="work-type">
              Type of work
              <select
                id="work-type"
                name="workType"
                defaultValue=""
                className={`contact-form-control ${controlClassName}`}
              >
                <option value="" className="bg-slate-950 text-slate-50">
                  Select if helpful
                </option>
                {workTypes.map((type) => (
                  <option key={type} value={type} className="bg-slate-950 text-slate-50">
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-slate-100/82" htmlFor="message">
              Message
              <textarea
                id="message"
                name="message"
                required
                rows={6}
                className={`contact-form-control ${controlClassName} min-h-[150px] resize-y`}
              />
            </label>

            <button
              type="submit"
              disabled={submitState === 'sending'}
              className="mt-1 min-h-11 border border-white/18 bg-slate-50 px-4 py-2 text-sm font-medium uppercase tracking-[0.16em] text-slate-950 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-wait disabled:opacity-70"
            >
              {submitState === 'sending' ? 'Sending...' : 'Send note'}
            </button>

            <div aria-live="polite" className="min-h-6 text-sm leading-relaxed">
              {submitState === 'success' && (
                <p className="text-emerald-200">
                  Message sent. I&apos;ll review it and respond from reach@abstract.voyage.
                </p>
              )}
              {submitState === 'error' && (
                <p className="text-rose-200">
                  {submitError}
                </p>
              )}
            </div>
          </div>
        </form>
      </section>
    </SynthLayout>
  )
}
