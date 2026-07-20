import Head from 'next/head'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createConfigScopeBinding } from '../components/Panel/config'
import { ContactConfigPanel } from '../experiences/contact/ContactConfigPanel'
import {
  DEFAULT_CONTACT_EXPERIENCE_CONFIG,
  type ContactExperienceConfig,
} from '../experiences/contact/ContactExperience.config'
import { CONTACT_EXPERIENCE_PANEL } from '../experiences/contact/ContactExperience.panel'
import { AgentPendingIndicator } from '../experiences/contact/ConversationPendingFeedback'
import SynthLayout from '../experiences/synth/components/SynthLayout'

const intakeEndpoint = '/.netlify/functions/intake'

const AGENT_NAME = process.env.NEXT_PUBLIC_AGENT_NAME || 'Relay'
// Unset by default: a response-time promise is only shown if it is actually
// true. Set NEXT_PUBLIC_REPLY_WINDOW_TEXT (e.g. "a day or two") to reinstate
// the clause in CLOSE_MESSAGE below.
const REPLY_WINDOW_TEXT = process.env.NEXT_PUBLIC_REPLY_WINDOW_TEXT || ''

const ENTRY_MESSAGE = `Hello. I’m ${AGENT_NAME}, an agent Manuel engineered. Listening is the part of his work I handle.

Tell me what’s going on. It doesn’t need to be polished. Whatever you say reaches him as you said it, and he reads all of it himself.`

const DEGRADED_MESSAGE = 'Something on my side isn’t working. Write what you’d like Manuel to know and I’ll pass it straight to him.'

const RECAP_INTRO = 'Here’s what I’ll pass on.'
const RECAP_UPDATE_INTRO = 'Here’s the update.'
const IDENTITY_QUESTION = 'Where should Manuel reply, and what’s your name?'

const CLOSE_MESSAGE = REPLY_WINDOW_TEXT
  ? `That’s with Manuel now. He usually replies within ${REPLY_WINDOW_TEXT}, and he’ll come back with what he’s already thinking. If a conversation follows, the first one costs nothing.`
  : `That’s with Manuel now. He’ll come back with what he’s already thinking. If a conversation follows, the first one costs nothing.`

const ENTRY_PLACEHOLDER = 'Start anywhere'
const IDENTITY_PLACEHOLDER = 'Where to reply, and your name'
const CORRECTION_PLACEHOLDER = 'Add or correct anything'

const CONFIRM_PRIMARY = 'Something’s off, let me fix it'
const CONFIRM_SECONDARY = 'That’s right'

const DELIVERY_FAILED_MESSAGE = 'That didn’t go through. Try again, or use the email below.'

// Shown once the follow-up ceiling (3) is reached and the model still can't
// unlock a specific reply. Always leaves the choice with the visitor —
// never a dead end, never a forced recap of an effectively empty message.
const INSUFFICIENCY_STOP_MESSAGE = 'I don’t have enough here for Manuel to be useful yet. Even a rough sense of what you’re trying to sort out would be enough. Or send it as is, and he’ll reply asking.'
const INSUFFICIENCY_PLACEHOLDER = 'A rough sense is enough'

const MAX_FOLLOW_UPS = 3

type ChatTurn = {
  role: 'agent' | 'visitor'
  text: string
}

type Step = 'message' | 'followup' | 'identity' | 'correction' | 'insufficient'
type Phase = 'writing' | 'pending' | 'confirm' | 'done' | 'failed'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function EmailFallback() {
  return (
    <a
      href="mailto:reach@abstract.voyage"
      className="text-[color:var(--contact-primary)] underline decoration-white/35 underline-offset-4 transition-colors hover:decoration-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
    >
      reach@abstract.voyage
    </a>
  )
}

function GuidedIntake({ config }: { config: ContactExperienceConfig }) {
  const [turns, setTurns] = useState<ChatTurn[]>(() => [{ role: 'agent', text: ENTRY_MESSAGE }])
  const [step, setStep] = useState<Step>('message')
  const [phase, setPhase] = useState<Phase>('writing')
  const [inputValue, setInputValue] = useState('')
  const [placeholder, setPlaceholder] = useState(ENTRY_PLACEHOLDER)
  const [botField, setBotField] = useState('')
  const [deliveryError, setDeliveryError] = useState('')

  // Internal bookkeeping that never renders on its own — always mutated
  // alongside a state update above, so a render always follows shortly
  // after any change here.
  const visitorAnswersRef = useRef<string[]>([])
  const modelTranscriptRef = useRef<string[]>([])
  const followUpCountRef = useRef(0)
  const recapRef = useRef('')
  const identityRef = useRef('')
  const recapIsRawRef = useRef(false)
  const degradedRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (phase === 'writing') textareaRef.current?.focus()
  }, [phase, turns.length])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    node.scrollTo({ top: node.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [turns.length, phase])

  useEffect(() => () => abortRef.current?.abort(), [])

  const waitForFloor = async (startedAt: number) => {
    const floorMs = config.loadingEffectEnabled ? config.loadingMinimumVisibleMs : 0
    const remaining = Math.max(0, floorMs - (Date.now() - startedAt))
    if (remaining > 0) await new Promise(resolve => window.setTimeout(resolve, remaining))
  }

  const postIntake = async (body: Record<string, unknown>, signal?: AbortSignal) => {
    const response = await fetch(intakeEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, botField }),
      signal,
    })
    return response.json() as Promise<{
      ok: boolean
      degraded?: boolean
      needsFollowUp?: boolean
      question?: string
      recap?: string
      message?: string
    }>
  }

  // Renders the recap (model-ordered or raw passthrough) as the next agent
  // turn. `isUpdate` distinguishes a correction's revised recap (no repeated
  // identity question — never re-ask what was already answered) from the
  // first time the recap appears (which also asks where to reply).
  const showRecapReady = (text: string, isUpdate: boolean) => {
    recapRef.current = text
    const intro = isUpdate ? RECAP_UPDATE_INTRO : RECAP_INTRO
    const message = isUpdate
      ? `${intro}\n\n${text}`
      : `${intro}\n\n${text}\n\n${IDENTITY_QUESTION}`
    setTurns(prev => [...prev, { role: 'agent', text: message }])
    if (isUpdate) {
      setPhase('confirm')
    } else {
      setPlaceholder(IDENTITY_PLACEHOLDER)
      setStep('identity')
      setPhase('writing')
    }
  }

  const enterDegraded = () => {
    degradedRef.current = true
    recapIsRawRef.current = true
    setTurns(prev => [...prev, { role: 'agent', text: DEGRADED_MESSAGE }])
    showRecapReady(visitorAnswersRef.current.join('\n\n'), false)
  }

  // Hit the follow-up ceiling and the model still can't unlock a specific
  // reply. Never a dead end: the visitor can add a sentence (routed straight
  // to recap below, not another gap-check — the ceiling means no more
  // questions, not no more chances) or use the ever-present "Send as is".
  const showInsufficiencyStop = () => {
    setTurns(prev => [...prev, { role: 'agent', text: INSUFFICIENCY_STOP_MESSAGE }])
    setPlaceholder(INSUFFICIENCY_PLACEHOLDER)
    setStep('insufficient')
    setPhase('writing')
  }

  const runRecap = async (isCorrection: boolean) => {
    setPhase('pending')
    const startedAt = Date.now()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const result = await postIntake(
        { stage: 'recap', transcript: modelTranscriptRef.current.join('\n') },
        controller.signal,
      )
      await waitForFloor(startedAt)
      if (!result.ok || typeof result.recap !== 'string') return enterDegraded()
      recapIsRawRef.current = false
      showRecapReady(result.recap, isCorrection)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      await waitForFloor(startedAt)
      enterDegraded()
    }
  }

  // Shared by the first message and every follow-up answer: decide whether
  // Manuel could already reply specifically. Adaptive 0-3 rounds (see intake
  // spec, "Decision A") — each call re-evaluates the whole conversation so
  // far, not just the latest turn. The hard ceiling of 3 is enforced here,
  // client-side: if the model still wants more once we're already at the
  // ceiling, that becomes an insufficiency stop instead of a 4th question.
  const runGapCheck = async () => {
    setPhase('pending')
    const startedAt = Date.now()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const result = await postIntake({
        stage: 'gap-check',
        transcript: modelTranscriptRef.current.join('\n'),
        followUpCount: followUpCountRef.current,
      }, controller.signal)
      await waitForFloor(startedAt)
      if (!result.ok) return enterDegraded()
      if (!result.needsFollowUp) {
        await runRecap(false)
        return
      }
      if (followUpCountRef.current >= MAX_FOLLOW_UPS) {
        showInsufficiencyStop()
        return
      }
      followUpCountRef.current += 1
      const question = result.question || ''
      modelTranscriptRef.current.push(`Agent: ${question}`)
      setTurns(prev => [...prev, { role: 'agent', text: question }])
      setPlaceholder(ENTRY_PLACEHOLDER)
      setStep('followup')
      setPhase('writing')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      await waitForFloor(startedAt)
      enterDegraded()
    }
  }

  const submitFirstMessage = async (rawText: string) => {
    const text = rawText.trim()
    if (!text || phase === 'pending') return
    setTurns(prev => [...prev, { role: 'visitor', text }])
    visitorAnswersRef.current = [text]
    modelTranscriptRef.current = [`Visitor: ${text}`]
    followUpCountRef.current = 0
    setInputValue('')
    await runGapCheck()
  }

  const submitFollowUpAnswer = async (rawText: string) => {
    const text = rawText.trim()
    if (!text || phase === 'pending') return
    setTurns(prev => [...prev, { role: 'visitor', text }])
    visitorAnswersRef.current = [...visitorAnswersRef.current, text]
    modelTranscriptRef.current = [...modelTranscriptRef.current, `Visitor: ${text}`]
    setInputValue('')
    await runGapCheck()
  }

  // No further gap-check here by design: the ceiling already fired once to
  // reach this state, so whatever the visitor adds goes straight to the
  // recap, not another evaluation round — guarantees the hard cap and rules
  // out an insufficiency-stop loop.
  const submitInsufficiencyAddendum = async (rawText: string) => {
    const text = rawText.trim()
    if (!text || phase === 'pending') return
    setTurns(prev => [...prev, { role: 'visitor', text }])
    visitorAnswersRef.current = [...visitorAnswersRef.current, text]
    modelTranscriptRef.current = [...modelTranscriptRef.current, `Visitor: ${text}`]
    setInputValue('')
    await runRecap(false)
  }

  const submitCorrection = async (rawText: string) => {
    const text = rawText.trim()
    if (!text || phase === 'pending') return
    setTurns(prev => [...prev, { role: 'visitor', text }])
    visitorAnswersRef.current = [...visitorAnswersRef.current, text]
    setInputValue('')
    if (degradedRef.current) {
      setPhase('pending')
      const startedAt = Date.now()
      await waitForFloor(startedAt)
      showRecapReady(visitorAnswersRef.current.join('\n\n'), true)
      return
    }
    modelTranscriptRef.current = [...modelTranscriptRef.current, `Visitor (correction): ${text}`]
    await runRecap(true)
  }

  const submitIdentity = (rawText: string) => {
    const text = rawText.trim()
    if (!text) return
    identityRef.current = text
    setTurns(prev => [...prev, { role: 'visitor', text }])
    setInputValue('')
    setPhase('confirm')
  }

  const handleSend = () => {
    if (step === 'message') void submitFirstMessage(inputValue)
    else if (step === 'followup') void submitFollowUpAnswer(inputValue)
    else if (step === 'identity') submitIdentity(inputValue)
    else if (step === 'insufficient') void submitInsufficiencyAddendum(inputValue)
    else void submitCorrection(inputValue)
  }

  const handleRequestCorrection = () => {
    setPlaceholder(CORRECTION_PLACEHOLDER)
    setStep('correction')
    setPhase('writing')
  }

  const handleConfirmed = async () => {
    setDeliveryError('')
    setPhase('pending')
    const startedAt = Date.now()
    try {
      const result = await postIntake({
        stage: 'deliver',
        recap: recapRef.current,
        identity: identityRef.current,
        transcript: visitorAnswersRef.current.join('\n\n'),
        raw: recapIsRawRef.current,
      })
      await waitForFloor(startedAt)
      if (!result.ok) {
        setDeliveryError(result.message || DELIVERY_FAILED_MESSAGE)
        setPhase('failed')
        return
      }
      setTurns(prev => [...prev, { role: 'agent', text: CLOSE_MESSAGE }])
      setPhase('done')
    } catch {
      await waitForFloor(startedAt)
      setDeliveryError(DELIVERY_FAILED_MESSAGE)
      setPhase('failed')
    }
  }

  // Persistent escape hatch (every state): relay whatever has been written,
  // unprocessed, skipping any remaining agent turns. Meaning is consistent
  // regardless of where it's clicked from — see intake spec, "PERSISTENT".
  const handleSendAsIs = () => {
    if (phase === 'done') return
    if (phase === 'confirm' || phase === 'failed') {
      recapIsRawRef.current = true
      if (phase === 'confirm') recapRef.current = visitorAnswersRef.current.join('\n\n')
      void handleConfirmed()
      return
    }
    abortRef.current?.abort()
    const draft = inputValue.trim()
    if (draft) {
      setTurns(prev => [...prev, { role: 'visitor', text: draft }])
      visitorAnswersRef.current = [...visitorAnswersRef.current, draft]
      setInputValue('')
    }
    if (visitorAnswersRef.current.length === 0) return
    recapIsRawRef.current = true
    const combined = visitorAnswersRef.current.join('\n\n')
    if (identityRef.current) {
      recapRef.current = combined
      setPhase('confirm')
    } else {
      showRecapReady(combined, false)
    }
  }

  const sendAsIsDisabled = phase === 'done' ||
    (visitorAnswersRef.current.length === 0 && !inputValue.trim())

  return (
    <div className="flex w-full flex-col gap-[var(--contact-message-gap)] bg-transparent font-sans text-[color:var(--contact-primary)]">
      <input
        aria-hidden="true"
        autoComplete="off"
        className="hidden"
        name="botField"
        onChange={event => setBotField(event.target.value)}
        tabIndex={-1}
        type="text"
        value={botField}
      />

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
            {turn.role === 'agent' ? (
              <p className="max-w-[var(--contact-message-measure)] whitespace-pre-line text-[length:var(--contact-conversation-size)] leading-[var(--contact-line-height)] text-[color:var(--contact-primary)]">
                {turn.text}
              </p>
            ) : (
              <p className="max-w-[min(38ch,88%)] whitespace-pre-line rounded-[22px] bg-white/[0.085] px-4 py-2.5 text-[length:var(--contact-base-size)] leading-[var(--contact-line-height)] text-[color:var(--contact-primary)]">
                {turn.text}
              </p>
            )}
          </div>
        ))}

        {phase === 'pending' && (
          <div className="contact-message-enter">
            <AgentPendingIndicator config={config} />
          </div>
        )}

        {phase === 'failed' && (
          <p className="contact-message-enter max-w-[var(--contact-message-measure)] text-[length:var(--contact-conversation-size)] leading-[var(--contact-line-height)] text-rose-100">
            {deliveryError}
          </p>
        )}
      </div>

      {(phase === 'writing' || phase === 'pending') && (
        <div className="flex flex-col gap-[var(--contact-control-gap)]">
          <label className="sr-only" htmlFor="agent-input">Message to Manuel</label>
          <textarea
            id="agent-input"
            ref={textareaRef}
            rows={2}
            value={inputValue}
            onChange={event => setInputValue(event.target.value)}
            placeholder={placeholder}
            disabled={phase === 'pending'}
            className="min-h-[84px] resize-none rounded-2xl border border-[color:var(--contact-border-subtle)] bg-transparent px-4 py-3 font-sans text-[length:var(--contact-base-size)] text-[color:var(--contact-primary)] caret-white outline-none transition-[border-color,background-color] duration-200 placeholder:text-[color:var(--contact-muted)] placeholder:opacity-45 hover:border-[color:var(--contact-border-hover)] focus:border-[color:var(--contact-border-focus)] focus:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-wait disabled:opacity-55 [color-scheme:dark]"
          />
          <div className="flex flex-wrap items-center gap-[var(--contact-action-gap)]">
            <button
              type="button"
              onClick={handleSend}
              disabled={phase === 'pending' || !inputValue.trim()}
              className="inline-flex min-h-[var(--contact-chip-height)] items-center justify-center rounded-full border border-[color:var(--contact-border-subtle)] bg-white/[0.10] px-[var(--contact-chip-padding-x)] py-2 text-sm font-medium text-[color:var(--contact-primary)] transition-[background-color,border-color,opacity] duration-200 hover:border-[color:var(--contact-border-hover)] hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {phase === 'confirm' && (
        <div className="flex flex-wrap gap-[var(--contact-control-gap)]">
          <button
            type="button"
            onClick={handleRequestCorrection}
            className="min-h-[var(--contact-chip-height)] rounded-full border border-[color:var(--contact-border-subtle)] bg-white/[0.12] px-[var(--contact-chip-padding-x)] py-2 text-sm font-medium text-[color:var(--contact-primary)] transition-colors hover:bg-white/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
          >
            {CONFIRM_PRIMARY}
          </button>
          <button
            type="button"
            onClick={() => void handleConfirmed()}
            className="min-h-[var(--contact-chip-height)] rounded-full border border-[color:var(--contact-border-subtle)] bg-transparent px-[var(--contact-chip-padding-x)] py-2 text-sm font-medium text-[color:var(--contact-primary)] transition-colors hover:border-[color:var(--contact-border-hover)] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
          >
            {CONFIRM_SECONDARY}
          </button>
        </div>
      )}

      {phase === 'failed' && (
        <div className="flex flex-wrap gap-[var(--contact-control-gap)]">
          <button
            type="button"
            onClick={() => void handleConfirmed()}
            className="min-h-[var(--contact-chip-height)] rounded-full border border-[color:var(--contact-border-subtle)] bg-white/[0.12] px-[var(--contact-chip-padding-x)] py-2 text-sm font-medium text-[color:var(--contact-primary)] transition-colors hover:bg-white/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
          >
            Try sending again
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[color:var(--contact-muted)] opacity-[var(--contact-muted-opacity)]">
        {phase !== 'done' && (
          <button
            type="button"
            onClick={handleSendAsIs}
            disabled={sendAsIsDisabled}
            className="underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
          >
            Send as is
          </button>
        )}
        {phase !== 'done' && <span aria-hidden="true">·</span>}
        <EmailFallback />
      </div>
    </div>
  )
}

export default function ContactPage() {
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
  } as CSSProperties

  return (
    <SynthLayout fullBleed hidePrimaryNavigation>
      <Head>
        <title>Contact | Abstract Voyage</title>
        <meta
          name="description"
          content="Reach Manuel at Abstract Voyage. An agent listens first, then relays what you said to him directly."
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

        .contact-pending-dot {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: var(--contact-loading-base);
          opacity: 0.3;
          animation: contact-pending-blink 1.1s ease-in-out infinite;
        }

        .contact-pending-dot:nth-child(2) { animation-delay: 0.15s; }
        .contact-pending-dot:nth-child(3) { animation-delay: 0.3s; }

        @keyframes contact-pending-blink {
          0%, 80%, 100% { opacity: 0.22; }
          40% { opacity: 0.85; }
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

        @media (prefers-reduced-motion: reduce) {
          .contact-message-enter {
            animation: none;
          }

          .contact-pending-dot {
            animation: none;
            opacity: 0.6;
          }
        }
      `}</style>

      <section
        className="mx-auto grid w-full max-w-[var(--contact-section-max)] box-border grid-cols-[minmax(0,1fr)] items-start gap-6 overflow-x-clip px-[var(--contact-mobile-inset)] pb-20 pt-4 font-sans text-[color:var(--contact-primary)] md:px-24 lg:min-h-[calc(100vh-180px)] lg:translate-y-[var(--contact-optical-y)] lg:py-10"
        style={contactStyle}
      >
        <div className="mx-auto w-full max-w-[var(--contact-conversation-max)]">
          <p className="mb-6 text-xs uppercase tracking-[0.24em] text-[color:var(--contact-muted)] opacity-55">
            Abstract Voyage
          </p>
          <GuidedIntake config={contactConfig} />
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
