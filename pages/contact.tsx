import Head from 'next/head'
import Link from 'next/link'
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
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
const intakeEndpoint = '/.netlify/functions/intake'

const CONSULTANT_NAME = process.env.NEXT_PUBLIC_CONSULTANT_NAME || 'Maya Chen'
const CONSULTANT_ROLE = process.env.NEXT_PUBLIC_CONSULTANT_ROLE || 'an independent brand & growth consultant for early-stage founders'

const MAX_QUESTIONS = 5

// Mirrors netlify/functions/intake.js's own fallback chain. Only used here if the
// request to the function itself fails (e.g. running `next dev` without `netlify
// dev`, or a network hiccup) — model-level failures are already degraded server-side.
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

type ChatTurn = {
  role: 'consultant' | 'visitor'
  text: string
}

type ConsultantCard = {
  fit: string
  headline: string
  problem: string
  tried: string
  timeline: string
  budget: string
  notes: string
  draftReply: string
}

type IntakeStep =
  | { done: false; message: string; placeholder: string }
  | { done: true; visitorSummary: string; consultant: ConsultantCard }

type IntakeStatus = 'asking' | 'loading' | 'recap' | 'confirmed'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const buildTranscript = (turns: ChatTurn[]) =>
  turns.map((turn) => `${turn.role === 'consultant' ? 'Consultant' : 'Visitor'}: ${turn.text}`).join('\n')

const clientFallbackStep = (askedSoFar: number): IntakeStep => {
  if (askedSoFar < FALLBACK_QUESTIONS.length) {
    return { done: false, ...FALLBACK_QUESTIONS[askedSoFar] }
  }

  return {
    done: true,
    visitorSummary: "Thanks for sharing all that — I'll take a proper look and follow up personally soon.",
    consultant: {
      fit: 'Worth a call',
      headline: 'New inbound inquiry',
      problem: 'Not specified',
      tried: 'Not specified',
      timeline: 'Not specified',
      budget: 'Not specified',
      notes: 'Assembled client-side — the intake service was unreachable this session.',
      draftReply: "Thanks for reaching out — I'd like to learn more. Let's find time to talk this week.",
    },
  }
}

function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      <span className="h-1.5 w-1.5 rounded-full bg-[#2C6B58] motion-safe:animate-pulse" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#2C6B58] motion-safe:animate-pulse [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#2C6B58] motion-safe:animate-pulse [animation-delay:240ms]" />
    </span>
  )
}

function ProgressDots({ questionsAsked }: { questionsAsked: number }) {
  const filled = Math.min(questionsAsked, MAX_QUESTIONS)

  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: MAX_QUESTIONS }).map((_, index) => (
        <span
          key={index}
          className={`h-1 w-6 transition-colors ${index < filled ? 'bg-[#2C6B58]' : 'bg-[#DAD3C2]'}`}
        />
      ))}
    </div>
  )
}

function ConsultantDeskCard({ consultant }: { consultant: ConsultantCard }) {
  const rows: [string, string][] = [
    ['Problem', consultant.problem],
    ['Tried', consultant.tried],
    ['Timeline', consultant.timeline],
    ['Budget', consultant.budget],
  ]

  return (
    <div className="border border-[#2C6B58] bg-[#18211E] p-4 text-[#F5F6F3] md:p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-[#F5F6F3]/55">
        Behind the form — what {CONSULTANT_NAME} sees
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[#F5F6F3]/70">
        No bot replies on {CONSULTANT_NAME}&apos;s behalf. This is a private triage note — every reply is written and sent by a human.
      </p>

      <div className="mt-4 flex flex-col gap-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex w-fit items-center bg-[#2C6B58] px-2 py-1 text-xs uppercase tracking-[0.14em] text-[#F5F6F3]">
            {consultant.fit}
          </span>
          <p className="text-base font-medium text-[#F5F6F3]" style={{ fontFamily: 'Fraunces, serif' }}>
            {consultant.headline}
          </p>
        </div>

        <dl className="grid gap-2.5">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-[0.14em] text-[#F5F6F3]/50">{label}</dt>
              <dd className="text-[#F5F6F3]/85">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="border-l-2 border-[#9C7327] pl-3 text-sm leading-relaxed text-[#F5F6F3]/85">
          {consultant.notes}
        </p>

        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#F5F6F3]/50">Draft reply</p>
          <p className="mt-1 text-sm leading-relaxed text-[#F5F6F3]/85">{consultant.draftReply}</p>
        </div>
      </div>
    </div>
  )
}

function GuidedIntake({ onEscapeHatch }: { onEscapeHatch: () => void }) {
  const opener = `Hi, I'm ${CONSULTANT_NAME} — ${CONSULTANT_ROLE}. What are you working on, and what brought you here today?`

  const [turns, setTurns] = useState<ChatTurn[]>(() => [{ role: 'consultant', text: opener }])
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const [placeholder, setPlaceholder] = useState('Tell me a bit about it')
  const [inputValue, setInputValue] = useState('')
  const [status, setStatus] = useState<IntakeStatus>('asking')
  const [recap, setRecap] = useState<{ visitorSummary: string; consultant: ConsultantCard } | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (status === 'asking') textareaRef.current?.focus()
  }, [status, turns.length])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    node.scrollTo({ top: node.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [turns.length, status])

  const applyStep = (step: IntakeStep, turnsSoFar: ChatTurn[]) => {
    if (step.done) {
      setRecap({ visitorSummary: step.visitorSummary, consultant: step.consultant })
      setStatus('recap')
      return
    }

    setTurns([...turnsSoFar, { role: 'consultant', text: step.message }])
    setPlaceholder(step.placeholder || 'Type your answer')
    setQuestionsAsked((count) => count + 1)
    setStatus('asking')
  }

  const submitTurn = async (rawText: string) => {
    const text = rawText.trim()
    if (!text || status === 'loading') return

    const turnsSoFar: ChatTurn[] = [...turns, { role: 'visitor', text }]
    setTurns(turnsSoFar)
    setInputValue('')
    setStatus('loading')

    try {
      const response = await fetch(intakeEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: buildTranscript(turnsSoFar), questionsAsked }),
      })

      if (!response.ok) throw new Error(`Intake endpoint responded with ${response.status}`)

      const step = (await response.json()) as IntakeStep
      applyStep(step, turnsSoFar)
    } catch (error) {
      console.error('[intake] request failed, using local fallback', error)
      applyStep(clientFallbackStep(questionsAsked), turnsSoFar)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitTurn(inputValue)
    }
  }

  const confirmRecap = () => setStatus('confirmed')

  const reopenForAddendum = () => {
    if (!recap) return
    setTurns((prev) => [...prev, { role: 'consultant', text: recap.visitorSummary }])
    setRecap(null)
    setPlaceholder('Add anything I should know')
    setStatus('asking')
  }

  return (
    <div
      className="flex w-full flex-col gap-5 border border-[#DAD3C2] bg-[#F5F6F3] p-5 text-[#18211E] shadow-2xl shadow-black/20 md:p-6"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {status !== 'confirmed' && <ProgressDots questionsAsked={questionsAsked} />}

      <div ref={scrollRef} aria-live="polite" className="flex max-h-72 flex-col gap-4 overflow-y-auto pr-1">
        {turns.map((turn, index) => (
          <div
            key={index}
            className={`motion-safe:[animation:intake-message-in_260ms_ease-out] ${turn.role === 'visitor' ? 'flex justify-end' : ''}`}
          >
            {turn.role === 'consultant' ? (
              <p className="max-w-[46ch] text-lg leading-snug text-[#18211E] md:text-xl" style={{ fontFamily: 'Fraunces, serif' }}>
                {turn.text}
              </p>
            ) : (
              <p className="max-w-[36ch] border border-[#DAD3C2] bg-[#EDE9DE] px-3 py-2 text-sm leading-relaxed text-[#18211E]">
                {turn.text}
              </p>
            )}
          </div>
        ))}

        {status === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-[#4A544F]">
            <TypingIndicator />
            <span className="sr-only">{CONSULTANT_NAME} is typing…</span>
          </p>
        )}

        {status === 'recap' && recap && (
          <p
            className="max-w-[46ch] text-lg leading-snug text-[#18211E] md:text-xl motion-safe:[animation:intake-message-in_260ms_ease-out]"
            style={{ fontFamily: 'Fraunces, serif' }}
          >
            {recap.visitorSummary}
          </p>
        )}

        {status === 'confirmed' && (
          <p className="max-w-[46ch] text-lg leading-snug text-[#18211E] md:text-xl" style={{ fontFamily: 'Fraunces, serif' }}>
            Thank you — that&apos;s saved. {CONSULTANT_NAME} reads every one of these personally and will reply from reach@abstract.voyage.
          </p>
        )}
      </div>

      {(status === 'asking' || status === 'loading') && (
        <div className="flex flex-col gap-2">
          <label className="sr-only" htmlFor="intake-input">Your answer</label>
          <textarea
            id="intake-input"
            ref={textareaRef}
            rows={2}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={status === 'loading'}
            className="min-h-11 resize-none border border-[#DAD3C2] bg-white/60 px-3 py-2 text-base text-[#18211E] caret-[#18211E] outline-none transition-colors placeholder:text-[#4A544F]/60 focus:border-[#2C6B58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C6B58] disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => submitTurn(inputValue)}
              disabled={status === 'loading' || !inputValue.trim()}
              className="min-h-11 border border-[#1F4E41] bg-[#2C6B58] px-4 py-2 text-sm font-medium uppercase tracking-[0.16em] text-[#F5F6F3] transition-colors hover:bg-[#1F4E41] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C6B58] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F6F3] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'loading' ? 'Sending…' : 'Send'}
            </button>
            <button
              type="button"
              onClick={onEscapeHatch}
              className="text-xs uppercase tracking-[0.16em] text-[#4A544F] underline decoration-[#DAD3C2] underline-offset-4 transition-colors hover:text-[#18211E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C6B58]"
            >
              or just email me
            </button>
          </div>
        </div>
      )}

      {status === 'recap' && recap && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={confirmRecap}
            className="min-h-11 border border-[#1F4E41] bg-[#2C6B58] px-4 py-2 text-sm font-medium uppercase tracking-[0.16em] text-[#F5F6F3] transition-colors hover:bg-[#1F4E41] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C6B58] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F6F3]"
          >
            Yes, that&apos;s right
          </button>
          <button
            type="button"
            onClick={reopenForAddendum}
            className="min-h-11 border border-[#DAD3C2] bg-transparent px-4 py-2 text-sm font-medium uppercase tracking-[0.16em] text-[#18211E] transition-colors hover:border-[#18211E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C6B58]"
          >
            Not quite, let me add something
          </button>
        </div>
      )}

      {status === 'confirmed' && recap && <ConsultantDeskCard consultant={recap.consultant} />}
    </div>
  )
}

export default function ContactPage() {
  const [mode, setMode] = useState<'guided' | 'standard'>('guided')
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

      <section className="grid w-full items-start gap-10 py-4 text-slate-50 lg:min-h-[calc(100vh-180px)] lg:grid-cols-[minmax(0,0.85fr)_minmax(360px,520px)] lg:py-10">
        <div className="max-w-[62ch]">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-200/45">
            Abstract Voyage
          </p>
          <h1 className="mt-5 max-w-[12ch] text-4xl font-semibold tracking-tight text-slate-50 md:text-6xl">
            Start a conversation
          </h1>
          <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-slate-100/72 md:text-lg">
            Have a systems, product, or creative engineering problem worth exploring? Walk through a short guided conversation, or send a quick note directly.
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

        <div className="w-full">
          <div className="mb-5 inline-flex w-fit border border-white/12 bg-slate-950" role="tablist" aria-label="Contact method">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'guided'}
              onClick={() => setMode('guided')}
              className={`min-h-11 px-4 py-2 text-xs uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                mode === 'guided' ? 'bg-white text-slate-950' : 'text-slate-200/70 hover:text-slate-50'
              }`}
            >
              Guided conversation
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'standard'}
              onClick={() => setMode('standard')}
              className={`min-h-11 px-4 py-2 text-xs uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                mode === 'standard' ? 'bg-white text-slate-950' : 'text-slate-200/70 hover:text-slate-50'
              }`}
            >
              Quick message
            </button>
          </div>

          {mode === 'guided' ? (
            <GuidedIntake onEscapeHatch={() => setMode('standard')} />
          ) : (
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
          )}
        </div>
      </section>
    </SynthLayout>
  )
}
