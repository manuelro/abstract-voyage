import Head from 'next/head'
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createConfigScopeBinding } from '../components/Panel/config'
import { ContactConfigPanel } from '../experiences/contact/ContactConfigPanel'
import {
  DEFAULT_CONTACT_EXPERIENCE_CONFIG,
  type ContactExperienceConfig,
} from '../experiences/contact/ContactExperience.config'
import { CONTACT_EXPERIENCE_PANEL } from '../experiences/contact/ContactExperience.panel'
import { ConversationPendingFeedback } from '../experiences/contact/ConversationPendingFeedback'
import SynthLayout from '../experiences/synth/components/SynthLayout'

const workTypes = [
  'Technology consulting',
  'Product engineering',
  'Creative engineering',
  'Systems / architecture review',
  'Other',
]

const controlClassName = 'min-h-11 rounded-2xl border border-[color:var(--contact-border-subtle)] bg-transparent px-4 py-3 font-sans text-[length:var(--contact-base-size)] text-[color:var(--contact-primary)] caret-white outline-none transition-[border-color,background-color] duration-200 placeholder:text-[color:var(--contact-muted)] placeholder:opacity-45 hover:border-[color:var(--contact-border-hover)] focus:border-[color:var(--contact-border-focus)] focus:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-white/30 [color-scheme:dark]'

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

const waitForMinimumFeedback = async (startedAt: number, minimumVisibleMs: number) => {
  const remaining = Math.max(0, minimumVisibleMs - (Date.now() - startedAt))
  if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining))
}

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

function ProgressDots({ questionsAsked }: { questionsAsked: number }) {
  const filled = Math.min(questionsAsked, MAX_QUESTIONS)

  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: MAX_QUESTIONS }).map((_, index) => (
        <span
          key={index}
          className={`h-1 w-6 rounded-full transition-colors duration-300 ${index < filled ? 'bg-white/70' : 'bg-white/15'}`}
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
    <div className="border-t border-[color:var(--contact-border-subtle)] pt-6 font-sans text-[color:var(--contact-primary)]">
      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--contact-muted)] opacity-70">
        Behind the form — what {CONSULTANT_NAME} sees
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[color:var(--contact-muted)] opacity-70">
        No bot replies on {CONSULTANT_NAME}&apos;s behalf. This is a private triage note — every reply is written and sent by a human.
      </p>

      <div className="mt-4 flex flex-col gap-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex w-fit items-center rounded-full border border-[color:var(--contact-border-subtle)] bg-white/[0.07] px-3 py-1 text-xs uppercase tracking-[0.14em] text-[color:var(--contact-primary)]">
            {consultant.fit}
          </span>
          <p className="text-base font-medium text-[color:var(--contact-primary)]">
            {consultant.headline}
          </p>
        </div>

        <dl className="grid gap-2.5">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--contact-muted)] opacity-60">{label}</dt>
              <dd className="text-[color:var(--contact-primary)] opacity-85">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="border-l border-[color:var(--contact-border-hover)] pl-3 text-sm leading-relaxed text-[color:var(--contact-primary)] opacity-85">
          {consultant.notes}
        </p>

        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--contact-muted)] opacity-60">Draft reply</p>
          <p className="mt-1 text-sm leading-relaxed text-[color:var(--contact-primary)] opacity-85">{consultant.draftReply}</p>
        </div>
      </div>
    </div>
  )
}

function EmailFallback() {
  return (
    <p className="text-sm text-[color:var(--contact-muted)] opacity-[var(--contact-muted-opacity)]">
      Prefer email?{' '}
      <a
        href="mailto:reach@abstract.voyage"
        className="text-[color:var(--contact-primary)] underline decoration-white/35 underline-offset-4 transition-colors hover:decoration-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
      >
        reach@abstract.voyage
      </a>
    </p>
  )
}

function GuidedIntake({ config }: { config: ContactExperienceConfig }) {
  const opener = `Hi, I'm ${CONSULTANT_NAME} — ${CONSULTANT_ROLE}. What are you working on, and what brought you here today?`

  const [turns, setTurns] = useState<ChatTurn[]>(() => [{ role: 'consultant', text: opener }])
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const [placeholder, setPlaceholder] = useState('Tell me a bit about it')
  const [inputValue, setInputValue] = useState('')
  const [pendingMessage, setPendingMessage] = useState('')
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
    setPendingMessage('')
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
    const feedbackStartedAt = Date.now()
    setTurns(turnsSoFar)
    setInputValue('')
    setPendingMessage(text)
    setStatus('loading')

    try {
      const response = await fetch(intakeEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: buildTranscript(turnsSoFar), questionsAsked }),
      })

      if (!response.ok) throw new Error(`Intake endpoint responded with ${response.status}`)

      const step = (await response.json()) as IntakeStep
      await waitForMinimumFeedback(
        feedbackStartedAt,
        config.loadingEffectEnabled ? config.loadingMinimumVisibleMs : 0,
      )
      applyStep(step, turnsSoFar)
    } catch (error) {
      console.error('[intake] request failed, using local fallback', error)
      await waitForMinimumFeedback(
        feedbackStartedAt,
        config.loadingEffectEnabled ? config.loadingMinimumVisibleMs : 0,
      )
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
    <div className="flex w-full flex-col gap-[var(--contact-message-gap)] bg-transparent font-sans text-[color:var(--contact-primary)]">
      {config.showProgress && status !== 'confirmed' && <ProgressDots questionsAsked={questionsAsked} />}

      <div
        ref={scrollRef}
        aria-live="polite"
        className="contact-scrollbar flex max-h-[var(--contact-viewport-height)] flex-col gap-[var(--contact-message-gap)] overflow-y-auto pr-2"
      >
        {turns.map((turn, index) => (
          <div
            key={index}
            className={`contact-message-enter ${turn.role === 'visitor' ? 'flex justify-end' : ''}`}
          >
            {turn.role === 'consultant' ? (
              <p className="max-w-[var(--contact-message-measure)] text-[length:var(--contact-conversation-size)] leading-[var(--contact-line-height)] text-[color:var(--contact-primary)]">
                {turn.text}
              </p>
            ) : (
              <p className="max-w-[min(38ch,88%)] rounded-[22px] bg-white/[0.085] px-4 py-2.5 text-[length:var(--contact-base-size)] leading-[var(--contact-line-height)] text-[color:var(--contact-primary)]">
                {turn.text}
              </p>
            )}
          </div>
        ))}

        {status === 'loading' && (
          <ConversationPendingFeedback config={config} submittedMessage={pendingMessage} />
        )}

        {status === 'recap' && recap && (
          <p className="contact-message-enter max-w-[var(--contact-message-measure)] text-[length:var(--contact-conversation-size)] leading-[var(--contact-line-height)] text-[color:var(--contact-primary)]">
            {recap.visitorSummary}
          </p>
        )}

        {status === 'confirmed' && (
          <p className="contact-message-enter max-w-[var(--contact-message-measure)] text-[length:var(--contact-conversation-size)] leading-[var(--contact-line-height)] text-[color:var(--contact-primary)]">
            Thank you — that&apos;s saved. {CONSULTANT_NAME} reads every one of these personally and will reply from reach@abstract.voyage.
          </p>
        )}
      </div>

      {(status === 'asking' || status === 'loading') && (
        <div className="flex flex-col gap-[var(--contact-control-gap)]">
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
            className={`${controlClassName} min-h-[84px] resize-none disabled:cursor-wait disabled:opacity-55`}
          />
          <div className="flex flex-col items-start gap-[var(--contact-action-gap)]">
            <button
              type="button"
              onClick={() => submitTurn(inputValue)}
              disabled={status === 'loading' || !inputValue.trim()}
              className="inline-flex min-h-[var(--contact-chip-height)] items-center justify-center rounded-full border border-[color:var(--contact-border-subtle)] bg-white/[0.10] px-[var(--contact-chip-padding-x)] py-2 text-sm font-medium text-[color:var(--contact-primary)] transition-[background-color,border-color,opacity] duration-200 hover:border-[color:var(--contact-border-hover)] hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Send
            </button>
            <EmailFallback />
          </div>
        </div>
      )}

      {status === 'recap' && recap && (
        <div className="flex flex-wrap gap-[var(--contact-control-gap)]">
          <button
            type="button"
            onClick={confirmRecap}
            className="min-h-[var(--contact-chip-height)] rounded-full border border-[color:var(--contact-border-subtle)] bg-white/[0.12] px-[var(--contact-chip-padding-x)] py-2 text-sm font-medium text-[color:var(--contact-primary)] transition-colors hover:bg-white/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
          >
            Yes, that&apos;s right
          </button>
          <button
            type="button"
            onClick={reopenForAddendum}
            className="min-h-[var(--contact-chip-height)] rounded-full border border-[color:var(--contact-border-subtle)] bg-transparent px-[var(--contact-chip-padding-x)] py-2 text-sm font-medium text-[color:var(--contact-primary)] transition-colors hover:border-[color:var(--contact-border-hover)] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
          >
            Not quite, let me add something
          </button>
          <div className="w-full"><EmailFallback /></div>
        </div>
      )}

      {status === 'confirmed' && recap && (
        <div className="grid gap-[var(--contact-control-gap)]">
          <ConsultantDeskCard consultant={recap.consultant} />
          <EmailFallback />
        </div>
      )}
    </div>
  )
}

export default function ContactPage() {
  const [mode, setMode] = useState<'guided' | 'standard'>('guided')
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [submitError, setSubmitError] = useState('Something went wrong while sending. Please try again or email reach@abstract.voyage.')
  const [standardPendingMessage, setStandardPendingMessage] = useState('')
  const [contactConfig, setContactConfig] = useState<ContactExperienceConfig>(() => ({
    ...DEFAULT_CONTACT_EXPERIENCE_CONFIG,
  }))
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const showAuthoringTools = process.env.NODE_ENV !== 'production'
  const configBinding = useMemo(() => createConfigScopeBinding({
    definition: CONTACT_EXPERIENCE_PANEL,
    value: contactConfig,
    onChange: setContactConfig,
  }), [contactConfig])
  const contactStyle = {
    '--contact-section-max': `${contactConfig.contentMaxWidthPx}px`,
    '--contact-conversation-max': `${contactConfig.conversationMaxWidthPx}px`,
    '--contact-desktop-gap': `${contactConfig.desktopColumnGapPx}px`,
    '--contact-optical-y': `${contactConfig.opticalOffsetYVh}svh`,
    '--contact-mobile-inset': `${contactConfig.mobileInsetPx}px`,
    '--contact-message-measure': `${contactConfig.messageMeasureCh}ch`,
    '--contact-base-size': `${contactConfig.baseTextSizePx}px`,
    '--contact-conversation-size': `${contactConfig.conversationTextSizePx}px`,
    '--contact-line-height': contactConfig.lineHeight,
    '--contact-muted-opacity': contactConfig.mutedTextOpacity,
    '--contact-message-gap': `${contactConfig.messageGapPx}px`,
    '--contact-control-gap': `${contactConfig.controlGapPx}px`,
    '--contact-action-gap': `${contactConfig.actionGapPx}px`,
    '--contact-chip-height': `${contactConfig.chipHeightPx}px`,
    '--contact-chip-padding-x': `${contactConfig.chipPaddingXPx}px`,
    '--contact-viewport-height': `${contactConfig.conversationViewportHeightPx}px`,
    '--contact-message-duration': `${contactConfig.messageEntryDurationMs}ms`,
    '--contact-primary': contactConfig.primaryTextColor,
    '--contact-muted': contactConfig.mutedTextColor,
    '--contact-border': contactConfig.borderColor,
    '--contact-border-subtle': `color-mix(in srgb, ${contactConfig.borderColor} 16%, transparent)`,
    '--contact-border-hover': `color-mix(in srgb, ${contactConfig.borderColor} 28%, transparent)`,
    '--contact-border-focus': `color-mix(in srgb, ${contactConfig.borderColor} 44%, transparent)`,
    '--contact-active-chip': `color-mix(in srgb, ${contactConfig.primaryTextColor} ${contactConfig.activeChipOpacity * 100}%, transparent)`,
  } as CSSProperties

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

    const feedbackStartedAt = Date.now()
    setStandardPendingMessage(payload.message)
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

      await waitForMinimumFeedback(
        feedbackStartedAt,
        contactConfig.loadingEffectEnabled ? contactConfig.loadingMinimumVisibleMs : 0,
      )
      form.reset()
      setSubmitState('success')
    } catch (error) {
      await waitForMinimumFeedback(
        feedbackStartedAt,
        contactConfig.loadingEffectEnabled ? contactConfig.loadingMinimumVisibleMs : 0,
      )
      setSubmitError(error instanceof Error ? error.message : 'Unable to send message right now.')
      setSubmitState('error')
    }
  }

  return (
    <SynthLayout fullBleed hidePrimaryNavigation>
      <Head>
        <title>Start a conversation | Abstract Voyage</title>
        <meta
          name="description"
          content="Contact Abstract Voyage for technology consulting, creative engineering, systems thinking, product engineering, and architecture work."
        />
      </Head>
      <style jsx global>{`
        .contact-message-enter {
          animation: contact-message-in var(--contact-message-duration) cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes contact-message-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .contact-pending-feedback__text {
          color: var(--contact-loading-base);
        }

        .contact-pending-feedback[data-effect='shimmer'] .contact-pending-feedback__text {
          color: transparent;
          background-image: linear-gradient(
            100deg,
            var(--contact-loading-base) 18%,
            var(--contact-loading-highlight) 42%,
            var(--contact-loading-base) 66%
          );
          background-position: 180% 50%;
          background-size: 220% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          animation: contact-pending-shimmer var(--contact-loading-duration) linear infinite;
        }

        .contact-pending-feedback[data-effect='pulse'] .contact-pending-feedback__text {
          animation: contact-pending-pulse var(--contact-loading-duration) ease-in-out infinite;
        }

        @keyframes contact-pending-shimmer {
          from { background-position: 180% 50%; }
          to { background-position: -40% 50%; }
        }

        @keyframes contact-pending-pulse {
          0%, 100% { opacity: 0.42; }
          50% { opacity: 1; }
        }

        .contact-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: var(--contact-border-subtle) transparent;
        }

        .contact-scrollbar::-webkit-scrollbar {
          width: 5px;
        }

        .contact-scrollbar::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: var(--contact-border-subtle);
        }

        .contact-form-control:-webkit-autofill,
        .contact-form-control:-webkit-autofill:hover,
        .contact-form-control:-webkit-autofill:focus {
          -webkit-text-fill-color: var(--contact-primary);
          box-shadow: 0 0 0 1000px rgba(2, 6, 23, 0.22) inset;
          caret-color: var(--contact-primary);
        }

        @media (prefers-reduced-motion: reduce) {
          .contact-message-enter {
            animation: none;
          }

          .contact-pending-feedback__text {
            animation: none !important;
            color: var(--contact-loading-base) !important;
            background: none !important;
          }
        }
      `}</style>

      <section
        className="mx-auto grid w-full max-w-[var(--contact-section-max)] box-border grid-cols-[minmax(0,1fr)] items-start gap-12 overflow-x-clip px-[var(--contact-mobile-inset)] pb-20 pt-4 font-sans text-[color:var(--contact-primary)] md:px-24 lg:min-h-[calc(100vh-180px)] lg:translate-y-[var(--contact-optical-y)] lg:grid-cols-[minmax(0,1fr)_minmax(420px,var(--contact-conversation-max))] lg:gap-[var(--contact-desktop-gap)] lg:py-10"
        style={contactStyle}
      >
        <div className="min-w-0 max-w-[58ch] lg:pt-14">
          <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--contact-muted)] opacity-55">
            Abstract Voyage
          </p>
          <h1 className="mt-5 max-w-[12ch] text-4xl font-medium tracking-[-0.035em] text-[color:var(--contact-primary)] md:text-6xl">
            Start a conversation
          </h1>
          <p className="mt-6 max-w-[46ch] break-words text-[length:var(--contact-base-size)] leading-[var(--contact-line-height)] text-[color:var(--contact-muted)] opacity-[var(--contact-muted-opacity)] md:text-lg">
            Have a systems, product, or creative engineering problem worth exploring? Walk through a short guided conversation, or send a quick note directly.
          </p>
        </div>

        <div className="min-w-0 w-full max-w-[var(--contact-conversation-max)] lg:justify-self-end">
          <div
            className="mb-7 inline-grid w-full max-w-[410px] grid-cols-2 rounded-full border border-[color:var(--contact-border-subtle)] bg-transparent p-1"
            role="tablist"
            aria-label="Contact method"
          >
            <button
              id="guided-contact-tab"
              type="button"
              role="tab"
              aria-selected={mode === 'guided'}
              aria-controls="guided-contact-panel"
              onClick={() => setMode('guided')}
              className={`min-h-[var(--contact-chip-height)] rounded-full px-[var(--contact-chip-padding-x)] py-2 text-xs font-medium tracking-[0.04em] transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45 ${
                mode === 'guided' ? 'bg-[var(--contact-active-chip)] text-[color:var(--contact-primary)]' : 'text-[color:var(--contact-muted)] opacity-70 hover:bg-white/[0.05] hover:opacity-100'
              }`}
            >
              Guided conversation
            </button>
            <button
              id="standard-contact-tab"
              type="button"
              role="tab"
              aria-selected={mode === 'standard'}
              aria-controls="standard-contact-panel"
              onClick={() => setMode('standard')}
              className={`min-h-[var(--contact-chip-height)] rounded-full px-[var(--contact-chip-padding-x)] py-2 text-xs font-medium tracking-[0.04em] transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45 ${
                mode === 'standard' ? 'bg-[var(--contact-active-chip)] text-[color:var(--contact-primary)]' : 'text-[color:var(--contact-muted)] opacity-70 hover:bg-white/[0.05] hover:opacity-100'
              }`}
            >
              Quick message
            </button>
          </div>

          {mode === 'guided' ? (
            <div id="guided-contact-panel" role="tabpanel" aria-labelledby="guided-contact-tab">
              <GuidedIntake config={contactConfig} />
            </div>
          ) : (
            <form
              id="standard-contact-panel"
              role="tabpanel"
              aria-labelledby="standard-contact-tab"
              name="contact"
              method="POST"
              action={contactEndpoint}
              onSubmit={handleSubmit}
              className="w-full bg-transparent font-sans text-[color:var(--contact-primary)]"
            >
              <p className="hidden">
                <label>
                  Do not fill this out if you are human:
                  <input name="botField" autoComplete="off" tabIndex={-1} />
                </label>
              </p>

              <div className="grid gap-[var(--contact-message-gap)]">
                <label className="grid gap-2 text-sm text-[color:var(--contact-muted)] opacity-85" htmlFor="name">
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

                <label className="grid gap-2 text-sm text-[color:var(--contact-muted)] opacity-85" htmlFor="email">
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

                <label className="grid gap-2 text-sm text-[color:var(--contact-muted)] opacity-85" htmlFor="organization">
                  Project / organization
                  <input
                    id="organization"
                    name="organization"
                    type="text"
                    autoComplete="organization"
                    className={`contact-form-control ${controlClassName}`}
                  />
                </label>

                <label className="grid gap-2 text-sm text-[color:var(--contact-muted)] opacity-85" htmlFor="work-type">
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

                <label className="grid gap-2 text-sm text-[color:var(--contact-muted)] opacity-85" htmlFor="message">
                  Message
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    className={`contact-form-control ${controlClassName} min-h-[150px] resize-y`}
                  />
                </label>

                <div className="grid justify-items-start gap-[var(--contact-action-gap)]">
                  <button
                    type="submit"
                    disabled={submitState === 'sending'}
                    className="mt-1 min-h-[var(--contact-chip-height)] rounded-full border border-[color:var(--contact-border-subtle)] bg-white/[0.10] px-[var(--contact-chip-padding-x)] py-2 text-sm font-medium text-[color:var(--contact-primary)] transition-[background-color,border-color,opacity] duration-200 hover:border-[color:var(--contact-border-hover)] hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45 disabled:cursor-wait disabled:opacity-50"
                  >
                    Send note
                  </button>
                  <EmailFallback />
                </div>

                <div aria-live="polite" className="min-h-6 text-sm leading-relaxed">
                  {submitState === 'sending' && (
                    <ConversationPendingFeedback
                      config={contactConfig}
                      submittedMessage={standardPendingMessage}
                    />
                  )}
                  {submitState === 'success' && (
                    <p className="contact-message-enter text-[color:var(--contact-primary)]">
                      Message sent. I&apos;ll review it and respond from reach@abstract.voyage.
                    </p>
                  )}
                  {submitState === 'error' && (
                    <p className="contact-message-enter text-rose-100">
                      {submitError}
                    </p>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>
      </section>
      {showAuthoringTools ? (
        <ContactConfigPanel
          binding={configBinding}
          isOpen={isPanelOpen}
          onToggle={() => setIsPanelOpen(open => !open)}
        />
      ) : null}
    </SynthLayout>
  )
}
