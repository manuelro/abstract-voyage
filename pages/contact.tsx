import SeoHead from '../components/SeoHead'
import { buildSiteTitle } from '../helpers/siteMetadata'
import {
  useCallback, useEffect, useMemo, useRef, useState,
  type CSSProperties, type MutableRefObject,
} from 'react'
import { createConfigScopeBinding } from '../components/Panel/config'
import { useAuthoringToolsVisibility } from '../components/Panel/useAuthoringToolsVisibility'
import { CtaButton } from '../components/CtaButton'
import {
  ComposerPill,
  computeSweepDurationMs,
  resolveAutoMessageTextColor,
} from '../components/ComposerPill'
import {
  normalizeCtaButtonConfig,
  type CtaButtonConfig,
} from '../components/CtaButton/config/registered'
import { usePrefersReducedMotion } from '../helpers/usePrefersReducedMotion'
import { useMeasuredElementRect } from '../components/useMeasuredElementRect'
import { SiteHeader } from '../experiences/abstract/components/SiteHeader'
import { buildEffectiveSiteHeaderConfig } from '../experiences/abstract/components/SiteHeader/buildEffectiveSiteHeaderConfig'
import { PAGE_CONTENT_GUTTER_CLASSNAME } from '../components/PageContainer'
import { normalizePageSurfaceConfig } from '../components/PageSurface.config'
import { useSharedDesignConfig } from '../components/SharedDesignConfigProvider'
import { useAbstractDesignConfig } from '../experiences/abstract/components/AbstractDesignConfigProvider'
import {
  ABSTRACT_DESIGN_CONFIG_BINDING_KEYS_BY_PAGE,
  useAbstractDesignConfigBindings,
} from '../experiences/abstract/hooks/useAbstractDesignConfigBindings'
import { PolymorphicLayout } from '../experiences/abstract/components/PolymorphicLayout'
import { FixedViewportColumnContent } from '../experiences/abstract/components/FixedViewportColumnContent'
import {
  normalizePolymorphicLayoutConfig,
  type PolymorphicLayoutConfig,
} from '../experiences/abstract/components/PolymorphicLayout.config'
import { buildSplitAlignedSiteHeaderConfig } from '../experiences/abstract/components/SiteHeader/hooks/buildSplitAlignedSiteHeaderConfig'
import {
  CONTACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG,
  normalizeSiteHeaderColorOverrideConfig,
  type SiteHeaderColorOverrideConfig,
} from '../experiences/abstract/components/SiteHeader/config/colorOverride'
import { useNormalizedSiteHeaderConfig } from '../experiences/abstract/components/SiteHeader/hooks/useNormalizedSiteHeaderConfig'
import { CONTACT_SITE_HEADER_COLOR_OVERRIDE_PANEL } from '../experiences/abstract/components/SiteHeader/config/colorOverride.panel'
import {
  applyCtaButtonColorOverride,
  CONTACT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG,
  normalizeCtaButtonColorOverrideConfig,
  type CtaButtonColorOverrideConfig,
} from '../components/CtaButton/config/colorOverride'
import { CONTACT_CTA_BUTTON_COLOR_OVERRIDE_PANEL } from '../components/CtaButton/config/colorOverride.panel'
import { contactConfigPanelRegistry } from '../experiences/contact/configPanels'
import { ContactConfigPanel } from '../experiences/contact/ContactConfigPanel'
import { CONTACT_POLYMORPHIC_LAYOUT_CONFIG } from './contact.config'
import { CONTACT_POLYMORPHIC_LAYOUT_PANEL } from './contact.panel'
import {
  DEFAULT_CONTACT_EXPERIENCE_CONFIG,
  type ContactExperienceConfig,
} from '../experiences/contact/ContactExperience.config'
import { CONTACT_EXPERIENCE_SCOPE_ID } from '../experiences/contact/ContactExperience.panel'
import {
  DEFAULT_CONTACT_DEV_MODE_CONFIG,
  type ContactDevModeConfig,
} from '../experiences/contact/ContactDevMode.config'
import { CONTACT_DEV_MODE_SCOPE_ID } from '../experiences/contact/ContactDevMode.panel'
import { AgentPendingIndicator } from '../experiences/contact/ConversationPendingFeedback'
import { useComposerHeroPhase, type HeroPhase } from '../experiences/contact/useComposerHeroPhase'
import { ContactHeroGreeting } from '../experiences/contact/ContactHeroGreeting'
import {
  clearPendingComposerDraft,
  peekPendingComposerDraft,
} from '../helpers/pendingComposerDraft'

const intakeEndpoint = '/.netlify/functions/intake'

const AGENT_NAME = process.env.NEXT_PUBLIC_AGENT_NAME || 'Relay'
// Unset by default: a response-time promise is only shown if it is actually
// true. Set NEXT_PUBLIC_REPLY_WINDOW_TEXT (e.g. "a day or two") to reinstate
// the clause in CLOSE_MESSAGE below.
const REPLY_WINDOW_TEXT = process.env.NEXT_PUBLIC_REPLY_WINDOW_TEXT || ''

const ENTRY_MESSAGE = `Hello. I’m ${AGENT_NAME}, an agent Manuel engineered. Listening is the part of his work I handle.

Tell me what’s going on. It doesn’t need to be polished. Whatever you say reaches him as you said it, and he reads all of it himself.`

// Shown once (after gap-check/recap has failed multiple times in a row —
// see autoRetryMaxCount) and merged with the identity ask in the same turn,
// on purpose: a separate confident-toned "Here's what I'll pass on" turn
// right after this hedge used to read as contradictory. In degraded mode
// there's no AI-organized recap to show — the visitor's own messages are
// already visible above as their own bubbles, so nothing gets re-echoed
// here at all.
const DEGRADED_ENTRY_MESSAGE = 'Something on my side isn’t evaluating messages properly right now — but everything you write above still reaches Manuel exactly as you wrote it. Where should he reply, and what’s your name?'

// Shown while a gap-check/recap auto-retry is in flight (first retry only —
// see scheduleRetryOrDegrade) so a longer-than-usual wait doesn't read as a
// hang. Styled muted (see ChatTurn's variant: 'status'), not as agent
// dialogue or an error.
const STILL_TRYING_MESSAGE = 'That’s taking longer than expected. Still trying.'

const RECAP_INTRO = 'Here’s what I’ll pass on.'
const RECAP_UPDATE_INTRO = 'Here’s the update.'
const IDENTITY_QUESTION = 'Where should Manuel reply, and what’s your name?'

const CLOSE_MESSAGE = REPLY_WINDOW_TEXT
  ? `That’s with Manuel now. He usually replies within ${REPLY_WINDOW_TEXT}, and he’ll come back with what he’s already thinking. If a conversation follows, the first one costs nothing.`
  : `That’s with Manuel now. He’ll come back with what he’s already thinking. If a conversation follows, the first one costs nothing.`

const ENTRY_PLACEHOLDER = 'Start anywhere'
const IDENTITY_PLACEHOLDER = 'Where to reply, and your name'
const CORRECTION_PLACEHOLDER = 'Add or correct anything'
const DEGRADED_ADDENDUM_PLACEHOLDER = 'Add anything else'

const CONFIRM_CORRECT_LABEL = 'Something’s off, let me fix it'
const CONFIRM_ACCEPT_LABEL = 'That’s right'

// Degraded mode's own confirm-screen vocabulary — "correct" doesn't make
// sense when there's no AI interpretation to have gotten wrong, just a
// verbatim echo of what the visitor already wrote (see DEGRADED_ENTRY_MESSAGE).
const DEGRADED_CONFIRM_CORRECT_LABEL = 'Add more'
const DEGRADED_CONFIRM_ACCEPT_LABEL = 'Send it'

// A quiet way back to the identity step from confirm — identical in normal
// and degraded mode (unlike CONFIRM_CORRECT_LABEL/DEGRADED_CONFIRM_CORRECT_LABEL above,
// editing a typo'd reply-to address isn't an AI-recap concern either way).
const EDIT_IDENTITY_LINK_LABEL = 'Fix where to reply'

// The persistent escape hatch's default label. During an active follow-up
// question it swaps to CONTINUE_AS_WRITTEN_LABEL below — same handler
// (handleSendAsIs), just a copy change so the option reads as answering the
// question in front of the visitor rather than a generic bail-out.
const SEND_AS_IS_LABEL = 'Send as is'
const CONTINUE_AS_WRITTEN_LABEL = 'Continue with what I’ve said'

// Shown while automatic retries remain (see autoRetryMaxCount) — names the
// wait so it doesn't read as stuck, while "Try sending again" stays a live
// override the whole time.
const deliveryRetryMessage = (retryDelaySeconds: number) =>
  `That didn’t go through. I’ll try again in ${retryDelaySeconds} seconds — or you can try now.`

// Shown once automatic retries are exhausted — the one point where this
// flow actually gives up and hands off, rather than promising another try.
const DELIVERY_GIVE_UP_MESSAGE = 'That still isn’t going through. Please use the email below so this doesn’t get lost.'

// Shown once the follow-up ceiling (3) is reached and the model still can't
// unlock a specific reply. Always leaves the choice with the visitor —
// never a dead end, never a forced recap of an effectively empty message.
const INSUFFICIENCY_STOP_MESSAGE = 'I don’t have enough here for Manuel to be useful yet. Even a rough sense of what you’re trying to sort out would be enough. Or send it as is, and he’ll reply asking.'
const INSUFFICIENCY_PLACEHOLDER = 'A rough sense is enough'

const MAX_FOLLOW_UPS = 3

type ChatTurn = {
  role: 'agent' | 'visitor'
  text: string
  // A status note (e.g. "still trying" during an auto-retry), not agent
  // dialogue — rendered in the muted color instead of primary. 'recap' is
  // showRecapReady's own turn (intro + AI-organized recap, `text` holding
  // `${intro}\n\n${body}`) — rendered as an intro (small/muted, same
  // treatment as 'status') stacked above the recap body at full
  // size/primary color. Absent for every ordinary turn.
  variant?: 'status' | 'recap'
  // 'recap' turns only — the identity question, rendered as its own
  // paragraph below the recap body at the same size/color as the body.
  // Kept structurally separate from `text` rather than concatenated, so
  // rendering never needs to parse it back out of the recap's own
  // (AI-generated, arbitrarily-shaped) content. Absent for a correction's
  // updated recap (isUpdate) — matches today's conditional.
  recapQuestion?: string
}
type Step = 'message' | 'followup' | 'identity' | 'correction' | 'insufficient' | 'degraded-addendum'
type Phase = 'writing' | 'pending' | 'confirm' | 'done' | 'failed'

// Exported for its own unit test (pages/contact.fade.test.ts) — divides by
// the *configured* window size, not the current turn count. A short first
// exchange (e.g. one message plus its recap, distanceFromBottom 1 out of a
// visibleCount of 2) must not fade the same amount as the oldest turn of an
// actually-full 6-turn window; using visibleCount - 1 as the denominator
// (the original, buggy version) made every conversation shorter than the
// full window hit messageFadeFloorOpacity after just one exchange,
// regardless of how large messageVisibleCount was configured.
export const computeMessageFadeOpacity = (
  distanceFromBottom: number,
  messageVisibleCount: number,
  floorOpacity: number,
) => {
  const fadeRatio = messageVisibleCount > 1 ? distanceFromBottom / (messageVisibleCount - 1) : 0
  return 1 - fadeRatio * (1 - floorOpacity)
}

// Stands in for a real fetch's round-trip time in dev-mode simulation (see
// GuidedIntake's simulateIntakeResponse) — rejects the same way a real
// fetch does on abort, so the existing `error.name === 'AbortError'` no-ops
// in runGapCheck/runRecap keep working unchanged under simulation.
const simulateNetworkDelay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timeoutId = window.setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timeoutId)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })

function EmailFallback({ emphasized = false }: { emphasized?: boolean }) {
  return (
    <a
      href="mailto:reach@abstract.voyage"
      className={`inline-flex min-h-11 items-center px-1 text-[color:var(--contact-primary)] underline decoration-[color:var(--contact-muted)] underline-offset-4 transition-colors hover:decoration-[color:var(--contact-primary)] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--contact-border-focus)] ${emphasized ? 'font-semibold' : ''}`}
    >
      reach@abstract.voyage
    </a>
  )
}

function GuidedIntake({
  config, ctaButtonConfig, surfaceColor, devModeConfig,
}: {
  config: ContactExperienceConfig
  ctaButtonConfig: CtaButtonConfig
  surfaceColor: string
  devModeConfig: ContactDevModeConfig
}) {
  // The greeting is not turns[0] — it's ContactHeroGreeting, driven by
  // heroPhase below, not the scrolling conversation feed (see
  // useComposerHeroPhase's own doc comment for why: it has its own reveal
  // technique, its own one-time exit, and a fixed position above the
  // composer, none of which fit a ChatTurn). turns starts empty; the first
  // real entry is the visitor's own first message.
  const [turns, setTurns] = useState<ChatTurn[]>(() => [])
  const [step, setStep] = useState<Step>('message')
  const [phase, setPhase] = useState<Phase>('writing')
  // Non-destructive peek (see helpers/pendingComposerDraft.ts's own doc
  // comment on why this must stay non-destructive inside a lazy useState
  // initializer, which React/StrictMode can invoke more than once without
  // committing) — a carried draft from abstract.tsx's own composer, if one
  // exists, seeds the composer already populated rather than empty. Actually
  // clearing the store happens in a mount effect below, exactly once.
  const [initialCarriedDraft] = useState(() => peekPendingComposerDraft())
  const hadCarriedDraft = initialCarriedDraft !== null
  const [inputValue, setInputValue] = useState(() => initialCarriedDraft ?? '')
  const [placeholder, setPlaceholder] = useState(ENTRY_PLACEHOLDER)
  const [botField, setBotField] = useState('')
  const [deliveryError, setDeliveryError] = useState('')

  // Internal bookkeeping that never renders on its own — always mutated
  // alongside a state update above, so a render always follows shortly
  // after any change here.
  const visitorAnswersRef = useRef<string[]>([])
  const modelTranscriptRef = useRef<string[]>([])
  const followUpCountRef = useRef(0)
  // Opaque, server-issued proof of the real follow-up count so far — the
  // server no longer trusts a client-sent integer for the ceiling decision
  // (see netlify/functions/intake.js's resolveFollowUpCount). followUpCountRef
  // above stays purely for local UI purposes (this ceiling check, progress
  // display); it is not the security boundary anymore.
  const followUpTokenRef = useRef<string | undefined>(undefined)
  const recapRef = useRef('')
  const identityRef = useRef('')
  const recapIsRawRef = useRef(false)
  const degradedRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  // Retry bookkeeping — one shared timeout ref since only one retry
  // sequence (gap-check, recap, or delivery) is ever in flight at a time in
  // this linear flow. Each stage gets its own attempt counter so a retry of
  // one doesn't consume another's ceiling.
  const pendingRetryTimeoutRef = useRef<number | null>(null)
  const gapCheckRetryCountRef = useRef(0)
  const recapRetryCountRef = useRef(0)
  const deliveryRetryCountRef = useRef(0)
  // Identifies one logical delivery attempt so a retry (automatic or
  // manual) of the same submission can never double-send — see
  // handleConfirmed, which mints a fresh id exactly when isRetry is false
  // (i.e. every time this is a new send, not a retry of the last one) and
  // netlify/functions/intake.js's recentSubmissions, which the server checks
  // before actually sending mail.
  const submissionIdRef = useRef<string | undefined>(undefined)
  const [deliveryRetriesExhausted, setDeliveryRetriesExhausted] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const dockRef = useRef<HTMLDivElement | null>(null)

  const { heroPhase, triggerExit } = useComposerHeroPhase(config, dockRef)
  const prefersReducedMotion = usePrefersReducedMotion()

  // Each hero-entrance field is configured as the *gap* after the previous
  // phase finishes (see ContactExperienceConfig's own doc comment), so the
  // actual, absolute-from-mount delays are cascaded here — the one place
  // that knows about the container fade, the placeholder's own sweep
  // (which depends on its character count), and the greeting's requested
  // gap on top of that.
  const heroPlaceholderRevealInitialDelayMs = config.heroContainerFadeInDurationMs
    + config.heroPlaceholderRevealInitialDelayMs
  const heroGreetingRevealInitialDelayMs = useMemo(() => {
    const placeholderSweepMs = computeSweepDurationMs(
      Array.from(ENTRY_PLACEHOLDER).length,
      config.heroPlaceholderRevealStepDelayMs,
      config.heroPlaceholderRevealUnitDurationMs,
    )
    return heroPlaceholderRevealInitialDelayMs + placeholderSweepMs + config.heroGreetingRevealInitialDelayMs
  }, [
    heroPlaceholderRevealInitialDelayMs,
    config.heroPlaceholderRevealStepDelayMs,
    config.heroPlaceholderRevealUnitDurationMs,
    config.heroGreetingRevealInitialDelayMs,
  ])

  // Carried-draft handoff (see helpers/pendingComposerDraft.ts) — clears the
  // one-shot store exactly once, in a mount effect rather than inside the
  // lazy useState initializer above, so React/StrictMode's dev-mode double
  // invoke of that initializer can never silently drop the draft.
  useEffect(() => {
    clearPendingComposerDraft()
  }, [])

  // Debounced auto-submit for a carried draft: fires submitFirstMessage
  // (the exact same function a manual Enter press already calls, defined
  // further down this component) once the visitor stops editing for
  // carriedDraftAutoSubmitDelayMs — "immediately, or with a prudent pause,"
  // collapsed to effectively immediate under reduced motion, since there's
  // no hero-exit glide to use as visual confirmation of the handoff landing
  // anyway. Restarts on every keystroke (inputValue is a dependency) so an
  // in-progress edit is never yanked out from under the visitor. Guarded on
  // step/phase, not just the one-shot ref below: a manual submit flips
  // `phase` to 'pending' synchronously, which reruns this effect (phase is
  // a dependency) and cancels any still-pending timer before it can fire
  // against an already-superseded closure — see submitFirstMessage's own
  // early return on phase === 'pending' for the other half of that guard.
  const carriedDraftAutoSubmittedRef = useRef(false)
  useEffect(() => {
    if (!hadCarriedDraft) return
    if (carriedDraftAutoSubmittedRef.current) return
    if (step !== 'message' || phase !== 'writing') return
    const text = inputValue.trim()
    if (!text) return
    const delayMs = prefersReducedMotion ? 0 : config.carriedDraftAutoSubmitDelayMs
    const timeoutId = window.setTimeout(() => {
      carriedDraftAutoSubmittedRef.current = true
      void submitFirstMessage(inputValue)
    }, delayMs)
    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hadCarriedDraft, inputValue, step, phase, prefersReducedMotion, config.carriedDraftAutoSubmitDelayMs])

  useEffect(() => {
    if (phase === 'writing') textareaRef.current?.focus()
  }, [phase, turns.length])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const overflowOwner = node.closest<HTMLElement>('[data-responsive-overflow-owner="true"]')
    const scrollOwner = overflowOwner ?? node
    scrollOwner.scrollTo({
      top: scrollOwner.scrollHeight,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    })
  }, [turns.length, phase, prefersReducedMotion])

  // Nudges attention toward the confirm screen's accept action ("That's
  // right"/"Send it") after a short idle delay, by displaying its real
  // hover appearance without a real pointer over it (see CtaButton's own
  // forceHover prop). Deliberately not on appearance immediately — that
  // would fight a pointer already moving toward a choice. Released for
  // good, for this confirm-screen instance, by handleReleaseConfirmForceHover
  // below the moment either action gets a real hover/focus; re-arms if the
  // visitor leaves confirm and comes back to it later (e.g. via a
  // correction round-trip). Skipped entirely under reduced motion, the same
  // as this page's other attention-directing effects.
  const [confirmForceHover, setConfirmForceHover] = useState(false)
  const hasReleasedConfirmForceHoverRef = useRef(false)
  const confirmForceHoverTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (phase !== 'confirm' || prefersReducedMotion) {
      setConfirmForceHover(false)
      return
    }
    hasReleasedConfirmForceHoverRef.current = false
    confirmForceHoverTimeoutRef.current = window.setTimeout(() => {
      confirmForceHoverTimeoutRef.current = null
      if (!hasReleasedConfirmForceHoverRef.current) setConfirmForceHover(true)
    }, config.confirmForcedHoverDelayMs)
    return () => {
      if (confirmForceHoverTimeoutRef.current !== null) {
        window.clearTimeout(confirmForceHoverTimeoutRef.current)
        confirmForceHoverTimeoutRef.current = null
      }
    }
  }, [phase, prefersReducedMotion, config.confirmForcedHoverDelayMs])

  const handleReleaseConfirmForceHover = () => {
    hasReleasedConfirmForceHoverRef.current = true
    setConfirmForceHover(false)
    if (confirmForceHoverTimeoutRef.current !== null) {
      window.clearTimeout(confirmForceHoverTimeoutRef.current)
      confirmForceHoverTimeoutRef.current = null
    }
  }

  useEffect(() => () => {
    abortRef.current?.abort()
    clearPendingRetry()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clearPendingRetry = () => {
    if (pendingRetryTimeoutRef.current !== null) {
      window.clearTimeout(pendingRetryTimeoutRef.current)
      pendingRetryTimeoutRef.current = null
    }
  }

  const scheduleAutoRetry = (retry: () => void) => {
    pendingRetryTimeoutRef.current = window.setTimeout(() => {
      pendingRetryTimeoutRef.current = null
      retry()
    }, config.autoRetryDelayMs)
  }

  const waitForFloor = async (startedAt: number) => {
    const floorMs = config.loadingEffectEnabled ? config.loadingMinimumVisibleMs : 0
    const remaining = Math.max(0, floorMs - (Date.now() - startedAt))
    if (remaining > 0) await new Promise(resolve => window.setTimeout(resolve, remaining))
  }

  // Shared by postIntake's real fetch path and its dev-mode simulation path
  // (see IntakeResponse's two consumers below) so both branches return the
  // exact same declared shape and never need a cast to unify them.
  type IntakeResponse = {
    ok: boolean
    degraded?: boolean
    needsFollowUp?: boolean
    question?: string
    followUpToken?: string
    recap?: string
    message?: string
  }

  // Dev-mode network simulation (see experiences/contact/ContactDevMode.config.ts) —
  // reuses followUpCountRef/deliveryRetryCountRef, the same refs the real
  // client logic already maintains for its own bookkeeping, rather than
  // parsing anything off the request body: the wire contract (followUpToken,
  // submissionId) is opaque to this mock exactly as it is to the real
  // server-verification logic in intake.js, and reading the local refs
  // directly stays correct regardless of what that wire shape looks like.
  const DEV_FOLLOW_UP_ROUNDS = 2 // 'happy-with-followup' resolves after this many rounds

  const simulateIntakeResponse = async (body: Record<string, unknown>, signal?: AbortSignal): Promise<IntakeResponse> => {
    await simulateNetworkDelay(devModeConfig.simulatedLatencyMs, signal)
    const stage = body.stage as 'gap-check' | 'recap' | 'deliver'
    const scenario = devModeConfig.scenario

    if (scenario === 'degraded') {
      // Uniform: any non-deliver stage fails the same way intake.js does on
      // a missing API key. Gap-check always runs first in the real flow, so
      // recap's branch here is defensive rather than load-bearing.
      return stage === 'deliver' ? { ok: true } : { ok: false, degraded: true }
    }

    if (stage === 'gap-check') {
      if (scenario === 'insufficiency-stop') {
        // Always asks for more — the client's own MAX_FOLLOW_UPS ceiling
        // (below) is what actually stops this, not the mock.
        return { ok: true, needsFollowUp: true, question: 'Simulated follow-up question.', followUpToken: 'simulated' }
      }
      if (scenario === 'happy-with-followup' && followUpCountRef.current < DEV_FOLLOW_UP_ROUNDS) {
        return {
          ok: true,
          needsFollowUp: true,
          question: `Simulated follow-up question ${followUpCountRef.current + 1}.`,
          followUpToken: 'simulated',
        }
      }
      return { ok: true, needsFollowUp: false }
    }

    if (stage === 'recap') {
      // Echoes what was actually typed rather than fully-canned text, so
      // the confirm screen stays coherent while testing.
      const echoed = visitorAnswersRef.current.join(' ').trim()
      return { ok: true, recap: echoed || 'Simulated recap.' }
    }

    // stage === 'deliver'
    if (scenario === 'delivery-fail-recover') {
      return deliveryRetryCountRef.current < 1
        ? { ok: false, message: 'Simulated delivery failure.' }
        : { ok: true }
    }
    if (scenario === 'delivery-fail-exhausted') {
      return { ok: false, message: 'Simulated delivery failure.' }
    }
    return { ok: true }
  }

  const postIntake = async (body: Record<string, unknown>, signal?: AbortSignal): Promise<IntakeResponse> => {
    // A second, independent gate on top of the panel's own showAuthoringTools
    // (which only controls whether the panel renders) — applied at the
    // actual network chokepoint so a simulated scenario can never leak into
    // a production build regardless of how devModeConfig got populated.
    if (process.env.NODE_ENV !== 'production' && devModeConfig.scenario !== 'live') {
      return simulateIntakeResponse(body, signal)
    }
    const response = await fetch(intakeEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, botField }),
      signal,
    })
    return response.json() as Promise<IntakeResponse>
  }

  // Renders the recap (model-ordered or raw passthrough) as the next agent
  // turn. `isUpdate` distinguishes a correction's revised recap (no repeated
  // identity question — never re-ask what was already answered) from the
  // first time the recap appears (which also asks where to reply).
  const showRecapReady = (text: string, isUpdate: boolean) => {
    recapRef.current = text
    const intro = isUpdate ? RECAP_UPDATE_INTRO : RECAP_INTRO
    setTurns(prev => [...prev, {
      role: 'agent',
      variant: 'recap',
      text: `${intro}\n\n${text}`,
      recapQuestion: isUpdate ? undefined : IDENTITY_QUESTION,
    }])
    if (isUpdate) {
      setPhase('confirm')
    } else {
      setPlaceholder(IDENTITY_PLACEHOLDER)
      setStep('identity')
      setPhase('writing')
    }
  }

  // Used both by enterDegraded (below) and by handleSendAsIs's no-identity-
  // yet branch — neither has an AI-organized recap to show (raw passthrough
  // in one case, a deliberate skip-ahead in the other), so neither echoes
  // visitorAnswersRef back as a synthetic turn. The visitor's own messages
  // are already visible above as their own bubbles; asking for identity is
  // the only thing left to say.
  const askForIdentity = () => {
    setTurns(prev => [...prev, { role: 'agent', text: IDENTITY_QUESTION }])
    setPlaceholder(IDENTITY_PLACEHOLDER)
    setStep('identity')
    setPhase('writing')
  }

  const enterDegraded = () => {
    degradedRef.current = true
    recapIsRawRef.current = true
    setTurns(prev => [...prev, { role: 'agent', text: DEGRADED_ENTRY_MESSAGE }])
    setPlaceholder(IDENTITY_PLACEHOLDER)
    setStep('identity')
    setPhase('writing')
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

  // Shared by runGapCheck/runRecap's own failure branches: up to
  // autoRetryMaxCount automatic retries, 30s apart, before falling through to
  // enterDegraded (whose own copy only speaks once we've actually seen
  // repeated evidence something's wrong — not on a first blip). The first
  // retry (and only the first) also surfaces a quiet, muted status turn so a
  // longer-than-usual wait doesn't read as a hang — see STILL_TRYING_MESSAGE.
  const scheduleRetryOrDegrade = (retryCountRef: MutableRefObject<number>, retry: () => void) => {
    if (retryCountRef.current < config.autoRetryMaxCount) {
      if (retryCountRef.current === 0) {
        setTurns(prev => [...prev, { role: 'agent', variant: 'status', text: STILL_TRYING_MESSAGE }])
      }
      retryCountRef.current += 1
      scheduleAutoRetry(retry)
      return
    }
    enterDegraded()
  }

  const runRecap = async (isCorrection: boolean, isRetry = false) => {
    if (!isRetry) recapRetryCountRef.current = 0
    setPhase('pending')
    const startedAt = Date.now()
    const controller = new AbortController()
    abortRef.current = controller
    const handleFailure = (): void => {
      scheduleRetryOrDegrade(recapRetryCountRef, () => void runRecap(isCorrection, true))
    }
    try {
      const result = await postIntake(
        { stage: 'recap', transcript: modelTranscriptRef.current.join('\n') },
        controller.signal,
      )
      await waitForFloor(startedAt)
      if (!result.ok || typeof result.recap !== 'string') return handleFailure()
      recapIsRawRef.current = false
      showRecapReady(result.recap, isCorrection)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      await waitForFloor(startedAt)
      handleFailure()
    }
  }

  // Shared by the first message and every follow-up answer: decide whether
  // Manuel could already reply specifically. Adaptive 0-3 rounds (see intake
  // spec, "Decision A") — each call re-evaluates the whole conversation so
  // far, not just the latest turn. The hard ceiling of 3 is enforced here,
  // client-side: if the model still wants more once we're already at the
  // ceiling, that becomes an insufficiency stop instead of a 4th question.
  const runGapCheck = async (isRetry = false) => {
    if (!isRetry) gapCheckRetryCountRef.current = 0
    setPhase('pending')
    const startedAt = Date.now()
    const controller = new AbortController()
    abortRef.current = controller
    const handleFailure = (): void => {
      scheduleRetryOrDegrade(gapCheckRetryCountRef, () => void runGapCheck(true))
    }
    try {
      const result = await postIntake({
        stage: 'gap-check',
        transcript: modelTranscriptRef.current.join('\n'),
        followUpToken: followUpTokenRef.current,
      }, controller.signal)
      await waitForFloor(startedAt)
      if (!result.ok) return handleFailure()
      followUpTokenRef.current = result.followUpToken
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
      handleFailure()
    }
  }

  const submitFirstMessage = async (rawText: string) => {
    const text = rawText.trim()
    if (!text || phase === 'pending') return
    // The one and only trigger — submitFollowUpAnswer/submitCorrection/etc.
    // never call this, so the hero exit fires exactly once, on the true
    // first submission.
    triggerExit()
    setTurns(prev => [...prev, { role: 'visitor', text }])
    visitorAnswersRef.current = [text]
    modelTranscriptRef.current = [`Visitor: ${text}`]
    followUpCountRef.current = 0
    followUpTokenRef.current = undefined
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

  // AI-recap correction only — degraded mode has its own addendum flow (see
  // submitDegradedAddendum) since there's no AI interpretation to correct,
  // just raw text to add to.
  const submitCorrection = async (rawText: string) => {
    const text = rawText.trim()
    if (!text || phase === 'pending') return
    setTurns(prev => [...prev, { role: 'visitor', text }])
    visitorAnswersRef.current = [...visitorAnswersRef.current, text]
    modelTranscriptRef.current = [...modelTranscriptRef.current, `Visitor (correction): ${text}`]
    setInputValue('')
    await runRecap(true)
  }

  // Degraded mode's "Add more": no network call, no synthetic agent turn —
  // the new text is simply its own visitor bubble (the transcript already
  // shows everything that'll be sent, nothing gets rejoined and re-displayed
  // under a misleading "update" label). Straight back to the confirm screen,
  // mirroring submitIdentity's own synchronous shape.
  const submitDegradedAddendum = (rawText: string) => {
    const text = rawText.trim()
    if (!text) return
    setTurns(prev => [...prev, { role: 'visitor', text }])
    visitorAnswersRef.current = [...visitorAnswersRef.current, text]
    setInputValue('')
    setPhase('confirm')
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
    else if (step === 'degraded-addendum') submitDegradedAddendum(inputValue)
    else void submitCorrection(inputValue)
  }

  const handleRequestCorrection = () => {
    setPlaceholder(CORRECTION_PLACEHOLDER)
    setStep('correction')
    setPhase('writing')
  }

  // Reuses submitIdentity unchanged — calling it again simply overwrites
  // identityRef.current and returns to confirm, which is exactly what an
  // edit needs. Prefilling with the current value (rather than leaving the
  // composer blank) makes this an edit, not a re-ask from scratch.
  const handleRequestIdentityEdit = () => {
    setInputValue(identityRef.current)
    setPlaceholder(IDENTITY_PLACEHOLDER)
    setStep('identity')
    setPhase('writing')
  }

  const handleRequestDegradedAddendum = () => {
    setPlaceholder(DEGRADED_ADDENDUM_PLACEHOLDER)
    setStep('degraded-addendum')
    setPhase('writing')
  }

  // Delivery failures get up to autoRetryMaxCount automatic retries — unlike
  // the silent gap-check/recap retries above, this one is always visible
  // (deliveryError + "Try sending again" stay on screen the whole time)
  // since the visitor already committed to sending and deserves to see what
  // "still working on it" looks like, not just a spinner. "Try sending
  // again" remains a live override throughout; it never gets disabled while
  // an auto-retry is pending, it just races it (see handleFailure — the
  // scheduled timer is always cleared before either path re-attempts).
  const handleConfirmed = async (isRetry = false) => {
    if (!isRetry) {
      deliveryRetryCountRef.current = 0
      submissionIdRef.current = crypto.randomUUID()
    }
    clearPendingRetry()
    setDeliveryError('')
    setDeliveryRetriesExhausted(false)
    setPhase('pending')
    const startedAt = Date.now()
    const handleFailure = (message?: string) => {
      setPhase('failed')
      if (deliveryRetryCountRef.current < config.autoRetryMaxCount) {
        deliveryRetryCountRef.current += 1
        setDeliveryError(deliveryRetryMessage(Math.round(config.autoRetryDelayMs / 1000)))
        scheduleAutoRetry(() => void handleConfirmed(true))
        return
      }
      setDeliveryError(message || DELIVERY_GIVE_UP_MESSAGE)
      setDeliveryRetriesExhausted(true)
    }
    try {
      // Computed fresh here rather than kept in sync incrementally by every
      // raw-mode code path re-joining and re-assigning recapRef.current —
      // that repeated re-join-and-redisplay was the actual structural root
      // cause of a raw/degraded turn ever going stale or duplicating itself.
      const recap = recapIsRawRef.current
        ? visitorAnswersRef.current.join('\n\n')
        : recapRef.current
      const result = await postIntake({
        stage: 'deliver',
        recap,
        identity: identityRef.current,
        transcript: visitorAnswersRef.current.join('\n\n'),
        raw: recapIsRawRef.current,
        submissionId: submissionIdRef.current,
      })
      await waitForFloor(startedAt)
      if (!result.ok) return handleFailure(result.message)
      setTurns(prev => [...prev, { role: 'agent', text: CLOSE_MESSAGE }])
      setPhase('done')
    } catch {
      await waitForFloor(startedAt)
      handleFailure()
    }
  }

  // Persistent escape hatch (every state): relay whatever has been written,
  // unprocessed, skipping any remaining agent turns. Meaning is consistent
  // regardless of where it's clicked from — see intake spec, "PERSISTENT".
  const handleSendAsIs = () => {
    if (phase === 'done') return
    clearPendingRetry()
    // triggerExit is idempotent (see useComposerHeroPhase) and normally
    // fires from submitFirstMessage — but Send As Is is a persistent escape
    // hatch that can *also* be the visitor's first-ever submission (a draft
    // typed at step 'message', sent here instead of through the composer's
    // own send button). Without this, that path skips the hero exit
    // entirely and the greeting stays on screen, overlapping the identity
    // question appended right under it.
    triggerExit()
    if (phase === 'confirm' || phase === 'failed') {
      recapIsRawRef.current = true
      void handleConfirmed(phase === 'failed')
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
    if (identityRef.current) {
      setPhase('confirm')
    } else {
      askForIdentity()
    }
  }

  const sendAsIsDisabled = phase === 'done' ||
    (visitorAnswersRef.current.length === 0 && !inputValue.trim())

  // Deterministic top-fade: only the last messageVisibleCount turns ever
  // render (older ones are dropped from the DOM, not just faded out), and
  // the oldest of those lands at messageFadeFloorOpacity once the window is
  // genuinely full — see ContactExperienceConfig's own doc comment for the
  // fade-window/visible-count relationship. The fade ratio below divides by
  // the *configured* window size, not the current turn count — a short
  // first exchange (e.g. one message plus its recap) shouldn't already hit
  // the floor the same way a conversation that's actually filled a 6-turn
  // window does; that was a real bug (the ratio's denominator used to be
  // whatever the current turn count happened to be, so the oldest of even
  // just 2 turns landed at the exact same floor opacity as the oldest of a
  // fully-populated 6-turn window — the recap screen made the raw
  // conversation read as already gone).
  const visibleTurns = turns.slice(-config.messageVisibleCount)
  const visibleCount = visibleTurns.length
  const firstVisibleIndex = turns.length - visibleCount
  const messageTextAlignClassName = config.messageTextAlign === 'center' ? 'text-center' : 'text-left'

  // The confirm screen's correction action ("Something's off"/"Add more")
  // gets a transparent/outline variant of the shared ctaButtonConfig, so
  // the accept action ("That's right"/"Send it") — rendered with
  // ctaButtonConfig as-is, solid per its own configured backgroundMode —
  // visually stands out as the primary choice. No new component needed:
  // CtaButtonConfig already fully supports this distinction.
  const secondaryCtaButtonConfig = useMemo(
    () => ({ ...ctaButtonConfig, backgroundMode: 'transparent' as const }),
    [ctaButtonConfig],
  )

  // Centering-while-empty and settling-to-the-bottom both come from plain
  // flexbox, not position/percentage math: a spacer below the dock grows
  // (flex-grow: 1) exactly as much as the turns-feed above it while
  // heroPhase is 'centered', splitting the stage's empty space evenly and
  // leaving the dock in the middle; once exiting, the spacer's flex-grow
  // drops to 0 *instantly* (no transition here — see useComposerHeroPhase's
  // own doc comment for why), so the turns-feed's own flex-1 claims all of
  // it immediately and the dock lands wherever normal flow already puts it
  // — the same bottom-docked position this page always used before the
  // hero redesign, room for delivery-error text and all. The visible
  // "glide to the bottom" motion comes entirely from useComposerHeroPhase's
  // own FLIP transform on the dock element, not from animating this value
  // — animating it too would mean the turns-feed keeps resizing under an
  // already-rendered first message for the whole transition. No absolute
  // positioning, no percentage-of-stage-height coordination between
  // elements that don't actually know about each other's real size.
  const heroSpacerStyle = {
    flexGrow: heroPhase === 'centered' ? 1 : 0,
  } as CSSProperties

  return (
    <div className="flex h-full w-full min-h-0 flex-col items-center gap-[var(--contact-message-gap)] bg-transparent font-sans text-[color:var(--contact-primary)]">
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
        data-contact-turns="true"
        className="flex w-full flex-1 min-h-[var(--contact-viewport-height)] flex-col items-center justify-end gap-[var(--contact-message-gap)] overflow-visible pr-2"
      >
        {visibleTurns.map((turn, index) => {
          const distanceFromBottom = visibleCount - 1 - index
          const opacity = computeMessageFadeOpacity(distanceFromBottom, config.messageVisibleCount, config.messageFadeFloorOpacity)
          return (
            // Two elements on purpose: the outer's `opacity` is a plain,
            // un-animated inline style, recomputed and reapplied fresh on
            // every render — so it can never go stale regardless of
            // animation-fill-mode/custom-property re-resolution quirks. The
            // inner's contact-message-enter is a self-contained 0→1 entrance
            // fade with no target to track — opacity is multiplicative, so
            // it composes with the outer's value automatically (new row:
            // fades in toward whatever the outer already dialed in; an
            // existing row whose outer opacity changes on a later render
            // reflects that instantly, no animation involved).
            <div key={firstVisibleIndex + index} className="flex w-full justify-center" style={{ opacity }}>
              {/* w-full only for a visitor turn — the visitor bubble's own
                  max-w uses min(measure,88%) (see its className below), and
                  that percentage needs a definite containing-block width to
                  resolve against; left auto (shrink-to-fit, matching this
                  wrapper's own content) it's circular — the bubble wants 88%
                  of a parent whose own width depends on the bubble — which
                  different engines resolve inconsistently (confirmed on
                  real-device Safari: a 20-character sentence wrapped after
                  15 characters with plenty of screen space unused). Agent
                  turns don't need this: their own max-w-[var(...)] is a flat
                  ch value, never a percentage, so shrink-to-fit alone is
                  unambiguous for them — this stays scoped to visitor turns
                  only rather than changing every turn's wrapper. */}
              <div className={`contact-message-enter ${turn.role === 'agent' ? '' : 'w-full'}`}>
                {turn.role === 'agent' ? (() => {
                  const baseClassName = `w-fit max-w-[var(--contact-message-measure)] whitespace-pre-line [overflow-wrap:anywhere] ${messageTextAlignClassName} leading-[var(--contact-line-height)]`
                  const mutedClassName = 'text-[length:var(--contact-hero-greeting-size)] text-[color:var(--contact-muted)] opacity-[var(--contact-muted-opacity)]'
                  const primaryClassName = 'text-[length:var(--contact-conversation-size)] text-[color:var(--contact-primary)]'
                  // Recap-body-only tier, between mutedClassName's label
                  // opacity and primaryClassName's full contrast — the
                  // visitor's own words reflected back read as calm
                  // reference copy, so it recedes on its own rather than
                  // needing recapQuestion below (plain primaryClassName, no
                  // added weight) to shout over it.
                  const recapBodyClassName = 'text-[length:var(--contact-conversation-size)] text-[color:var(--contact-primary)] opacity-[var(--contact-recap-body-opacity)]'

                  if (turn.variant === 'recap') {
                    // intro is always one of the two fixed, single-line
                    // RECAP_INTRO/RECAP_UPDATE_INTRO constants (never
                    // AI-generated), so splitting on the first \n\n to
                    // recover it back out of `text` is unambiguous.
                    const separatorIndex = turn.text.indexOf('\n\n')
                    const introText = separatorIndex === -1 ? turn.text : turn.text.slice(0, separatorIndex)
                    const bodyText = separatorIndex === -1 ? '' : turn.text.slice(separatorIndex + 2)
                    return (
                      <div className="flex flex-col gap-[var(--contact-message-gap)]">
                        <p className={`${baseClassName} ${mutedClassName}`}>{introText}</p>
                        <p className={`${baseClassName} ${recapBodyClassName}`}>{bodyText}</p>
                        {turn.recapQuestion ? (
                          <p className={`${baseClassName} ${primaryClassName}`}>{turn.recapQuestion}</p>
                        ) : null}
                      </div>
                    )
                  }

                  return (
                    <p className={`${baseClassName} ${turn.variant === 'status' ? mutedClassName : primaryClassName}`}>
                      {turn.text}
                    </p>
                  )
                })() : (
                  <p className={`mx-auto w-fit max-w-[min(var(--contact-message-measure),88%)] whitespace-pre-line [overflow-wrap:anywhere] rounded-[22px] bg-black/[0.06] px-4 py-2.5 ${messageTextAlignClassName} text-[length:var(--contact-base-size)] leading-[var(--contact-line-height)] text-[color:var(--contact-primary)]`}>
                    {turn.text}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* A plain, normal-flow flex-col child — never absolutely positioned
          itself (relative only so ContactHeroGreeting, below, has
          something to anchor bottom-full against). Its vertical position
          comes entirely from the turns-feed above (flex-1) and the spacer
          below (flex-1 while centered, 0 once settled — see
          heroSpacerStyle): with both empty siblings sharing equal
          flex-grow, this sits exactly in the middle; once the spacer
          collapses, the turns-feed's own flex-1 claims that space and this
          lands at the bottom, precisely where it always sat before the
          hero redesign. The visible glide between those two positions is
          a FLIP transform useComposerHeroPhase applies imperatively via
          dockRef, not a transition on the flex values above. */}
      <div ref={dockRef} className="relative flex w-full flex-col items-center gap-[var(--contact-message-gap)]">
        {/* A normal flex-col child, stacking above the composer via the
            same gap every other row in this column already uses — not
            positioned at all. Unmounts for good once heroPhase reaches
            'settled' (see ContactHeroGreeting), at which point the composer
            simply flows up to take its place. */}
        <ContactHeroGreeting
          config={config}
          ctaButtonConfig={ctaButtonConfig}
          instant={hadCarriedDraft}
          phase={heroPhase}
          revealInitialDelayMs={heroGreetingRevealInitialDelayMs}
          text={ENTRY_MESSAGE}
          textAlignClassName={messageTextAlignClassName}
        />

        {(phase === 'writing' || phase === 'pending') && (
          <ComposerPill
            autoFocus
            bounceElevationPx={config.submitBounceElevationPx}
            bounceOnSubmitEnabled={config.submitBounceEnabled}
            composerElevationPx={config.composerElevationPx}
            motionConfig={config}
            ctaButtonConfig={ctaButtonConfig}
            disabled={phase === 'pending'}
            heroPhase={heroPhase}
            onChange={setInputValue}
            onSubmit={handleSend}
            pendingIndicator={<AgentPendingIndicator config={config} />}
            placeholder={placeholder}
            placeholderMinContrast={config.composerPlaceholderMinContrast}
            placeholderRevealInitialDelayMs={heroPlaceholderRevealInitialDelayMs}
            singleLine
            surfaceColor={surfaceColor}
            textareaRef={textareaRef}
            value={inputValue}
          />
        )}

        {/* Degraded mode gets its own vocabulary here — "Something's off, let
            me fix it" implies an AI interpretation that might be wrong, but
            degraded mode has no AI interpretation, just a verbatim echo of
            what's already visible above. "Add more" / "Send it" match what's
            actually happening instead.
            The accept action (right) renders with ctaButtonConfig as-is
            (solid, per its own configured backgroundMode) while the
            correction action (left) gets the transparent secondaryCtaButtonConfig
            variant — a real visual primary/secondary hierarchy, not two
            visually-identical choices. Both get onFocus/onMouseEnter release
            handlers regardless of which one is forceHover-highlighted: a real
            hover or focus on *either* action retires the simulated nudge for
            the rest of this confirm-screen instance. */}
        {phase === 'confirm' && (
          <div className="flex flex-wrap items-center justify-center gap-[var(--contact-control-gap)]">
            {degradedRef.current ? (
              <>
                <CtaButton
                  config={secondaryCtaButtonConfig}
                  onClick={handleRequestDegradedAddendum}
                  onFocus={handleReleaseConfirmForceHover}
                  onMouseEnter={handleReleaseConfirmForceHover}
                  surfaceColor={surfaceColor}
                >
                  {DEGRADED_CONFIRM_CORRECT_LABEL}
                </CtaButton>
                <CtaButton
                  config={ctaButtonConfig}
                  forceHover={confirmForceHover}
                  onClick={() => void handleConfirmed()}
                  onFocus={handleReleaseConfirmForceHover}
                  onMouseEnter={handleReleaseConfirmForceHover}
                  surfaceColor={surfaceColor}
                >
                  {DEGRADED_CONFIRM_ACCEPT_LABEL}
                </CtaButton>
              </>
            ) : (
              <>
                <CtaButton
                  config={secondaryCtaButtonConfig}
                  onClick={handleRequestCorrection}
                  onFocus={handleReleaseConfirmForceHover}
                  onMouseEnter={handleReleaseConfirmForceHover}
                  surfaceColor={surfaceColor}
                >
                  {CONFIRM_CORRECT_LABEL}
                </CtaButton>
                <CtaButton
                  config={ctaButtonConfig}
                  forceHover={confirmForceHover}
                  onClick={() => void handleConfirmed()}
                  onFocus={handleReleaseConfirmForceHover}
                  onMouseEnter={handleReleaseConfirmForceHover}
                  surfaceColor={surfaceColor}
                >
                  {CONFIRM_ACCEPT_LABEL}
                </CtaButton>
              </>
            )}
          </div>
        )}

        {phase === 'failed' && (
          <div className="flex flex-wrap items-center justify-center gap-[var(--contact-control-gap)]">
            <CtaButton
              config={ctaButtonConfig}
              onClick={() => { clearPendingRetry(); void handleConfirmed(true) }}
              surfaceColor={surfaceColor}
            >
              Try sending again
            </CtaButton>
          </div>
        )}

        {/* Muted while auto-retries remain — only the final give-up state
            (retries exhausted) is styled as an actual error; a retry-pending
            message shouldn't look as alarming as one that genuinely needs the
            visitor's attention. */}
        {phase === 'failed' && (
          <p
            className={`contact-message-enter max-w-[var(--contact-message-measure)] [overflow-wrap:anywhere] ${messageTextAlignClassName} text-[length:var(--contact-conversation-size)] leading-[var(--contact-line-height)] ${
              deliveryRetriesExhausted
                ? 'text-rose-700'
                : 'text-[color:var(--contact-muted)] opacity-[var(--contact-muted-opacity)]'
            }`}
          >
            {deliveryError}
          </p>
        )}

        <div
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-[color:var(--contact-muted)]"
          data-contact-mandatory-actions="true"
        >
          {/* Same text/decoration split EmailFallback below already uses:
              full-strength --contact-primary for the actual link text (kept
              legible), --contact-muted reserved for the underline alone —
              not the previous text-[color:var(--contact-muted)] +
              opacity-[var(--contact-muted-opacity)] combination this div
              used to apply to every child indiscriminately, which stacked
              two separate dimming steps (an already-low-contrast gray,
              further faded by a parent opacity that dims the whole
              subtree's compositing, not just the color value) and left
              these two actionable buttons reading as barely-there against
              the page surface (operator-reported, 2026-08-26). The "·"
              separators below keep the div's own inherited muted color at
              full opacity — appropriate for decorative punctuation, not
              interactive text a visitor needs to read. */}
          {phase !== 'done' && (
            <button
              type="button"
              onClick={handleSendAsIs}
              disabled={sendAsIsDisabled}
              className="inline-flex min-h-11 items-center px-1 text-[color:var(--contact-primary)] underline decoration-[color:var(--contact-muted)] underline-offset-4 transition-colors hover:decoration-[color:var(--contact-primary)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--contact-border-focus)]"
            >
              {step === 'followup' || step === 'insufficient' ? CONTINUE_AS_WRITTEN_LABEL : SEND_AS_IS_LABEL}
            </button>
          )}
          {phase !== 'done' && <span aria-hidden="true">·</span>}
          {/* Only meaningful once an identity has actually been given — this
              is the one field the rest of the confirm screen (correction /
              degraded "Add more") has no way to revise. */}
          {phase === 'confirm' && identityRef.current && (
            <>
              <button
                type="button"
                onClick={handleRequestIdentityEdit}
                className="inline-flex min-h-11 items-center px-1 text-[color:var(--contact-primary)] underline decoration-[color:var(--contact-muted)] underline-offset-4 transition-colors hover:decoration-[color:var(--contact-primary)] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--contact-border-focus)]"
              >
                {EDIT_IDENTITY_LINK_LABEL}
              </button>
              <span aria-hidden="true">·</span>
            </>
          )}
          {/* Once auto-retries are exhausted, this is genuinely the one
              reliable path left — weighted accordingly rather than sitting at
              the same visual weight as every other state's fallback mention. */}
          <EmailFallback emphasized={phase === 'failed' && deliveryRetriesExhausted} />
        </div>
      </div>

      {/* Grows in lockstep with the turns-feed above while centered (both
          empty, both flex-1 — splits the stage evenly, landing the dock in
          the middle); collapses to 0 on exit so the turns-feed alone claims
          the freed space. Never rendered as visible content, purely a
          layout device. */}
      <div aria-hidden="true" className="contact-hero-spacer w-full" style={heroSpacerStyle} />
    </div>
  )
}

export default function ContactPage() {
  const [contactConfig, setContactConfig] = useState<ContactExperienceConfig>(() => ({
    ...DEFAULT_CONTACT_EXPERIENCE_CONFIG,
  }))
  const [contactDevModeConfig, setContactDevModeConfig] = useState<ContactDevModeConfig>(() => ({
    ...DEFAULT_CONTACT_DEV_MODE_CONFIG,
  }))
  const [contactPolymorphicLayoutConfig, setContactPolymorphicLayoutConfig] =
    useState<PolymorphicLayoutConfig>(
      () => normalizePolymorphicLayoutConfig(CONTACT_POLYMORPHIC_LAYOUT_CONFIG),
    )
  // Shared across every page via SharedDesignConfigProvider (pages/_app.tsx).
  const {
    pageSurfaceConfig,
    ctaButtonConfig,
  } = useSharedDesignConfig()
  const { siteHeaderConfig, wordmarkConfig } = useAbstractDesignConfig()
  // Page-local override of the shared siteHeaderConfig/ctaButtonConfig
  // color fields above — enabled: false (default) inherits the shared
  // foundation exactly like every other page. Seeded from this page's own
  // complete config (CONTACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG /
  // CONTACT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG), not a shared DEFAULT_..._CONFIG
  // object — see SiteHeaderColorOverride.config.ts's own doc
  // comment for the full per-page config ownership model
  // (PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md) and why this page previously
  // spreading the same shared object every other page also spread from is
  // what let a "COPY" from this page's own panel silently become every
  // other page's resting state too.
  const [siteHeaderColorOverride, setSiteHeaderColorOverride] =
    useState<SiteHeaderColorOverrideConfig>(() => (
      normalizeSiteHeaderColorOverrideConfig(CONTACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG)
    ))
  const [ctaButtonColorOverride, setCtaButtonColorOverride] =
    useState<CtaButtonColorOverrideConfig>(() => (
      normalizeCtaButtonColorOverrideConfig(CONTACT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG)
    ))
  const { showAuthoringTools, isPanelOpen, setIsPanelOpen, togglePanel } = useAuthoringToolsVisibility()
  const normalizedPageSurfaceConfig = useMemo(
    () => normalizePageSurfaceConfig(pageSurfaceConfig),
    [pageSurfaceConfig],
  )
  const normalizedCtaButtonConfig = useMemo(
    () => applyCtaButtonColorOverride(
      normalizeCtaButtonConfig(ctaButtonConfig),
      normalizeCtaButtonColorOverrideConfig(ctaButtonColorOverride),
    ),
    [ctaButtonConfig, ctaButtonColorOverride],
  )
  const normalizedSiteHeaderConfig = useNormalizedSiteHeaderConfig(siteHeaderConfig, siteHeaderColorOverride)
  const resolvedMessageTextColor = useMemo(
    () => (
      contactConfig.messageTextColorMode === 'auto'
        ? resolveAutoMessageTextColor(
          normalizedPageSurfaceConfig.color,
          contactConfig.messageAutoTextMinContrast,
        )
        : contactConfig.primaryTextColor
    ),
    [
      contactConfig.messageTextColorMode,
      contactConfig.messageAutoTextMinContrast,
      contactConfig.primaryTextColor,
      normalizedPageSurfaceConfig.color,
    ],
  )
  // Live-measured header height, feeding FixedViewportColumnContent's
  // headerOffsetPx below — mirrors components/SplitColumnPageShell.tsx's own
  // internal measuredHeaderHeightPx/internalHeaderWrapperRef idiom verbatim.
  // Independent of that internal measurement (which drives *ColumnHeaderBehavior's
  // pushDown margin reservation, inert here under headerScrollBehavior: 'static')
  // — this page needs its own instance for the composer's fixed-position math,
  // via PolymorphicLayout's own headerWrapperRef passthrough. Sourced from
  // useMeasuredElementRect (PLAN-DEDUPLICATE-PAGE-SHELL-LOGIC.md §1) — was a
  // page-local hand-rolled ResizeObserver+resize effect before that hook
  // existed.
  const { ref: headerWrapperRef, rect: headerWrapperRect } = useMeasuredElementRect<HTMLDivElement>()

  const sharedConfigBindings = useAbstractDesignConfigBindings(
    ABSTRACT_DESIGN_CONFIG_BINDING_KEYS_BY_PAGE.contact,
  )
  const localConfigBindings = useMemo(() => [
    createConfigScopeBinding({
      definition: contactConfigPanelRegistry.resolve(CONTACT_EXPERIENCE_SCOPE_ID),
      value: contactConfig,
      onChange: setContactConfig,
    }),
    createConfigScopeBinding({
      definition: contactConfigPanelRegistry.resolve(CONTACT_DEV_MODE_SCOPE_ID),
      value: contactDevModeConfig,
      onChange: setContactDevModeConfig,
    }),
    createConfigScopeBinding({
      definition: CONTACT_SITE_HEADER_COLOR_OVERRIDE_PANEL,
      value: siteHeaderColorOverride,
      onChange: setSiteHeaderColorOverride,
    }),
    createConfigScopeBinding({
      definition: CONTACT_CTA_BUTTON_COLOR_OVERRIDE_PANEL,
      value: ctaButtonColorOverride,
      onChange: setCtaButtonColorOverride,
    }),
    createConfigScopeBinding({
      definition: CONTACT_POLYMORPHIC_LAYOUT_PANEL,
      value: contactPolymorphicLayoutConfig,
      onChange: setContactPolymorphicLayoutConfig,
    }),
  ], [
    contactConfig, contactDevModeConfig,
    siteHeaderColorOverride, ctaButtonColorOverride, contactPolymorphicLayoutConfig,
  ])
  const configBindings = useMemo(
    () => [...sharedConfigBindings, ...localConfigBindings],
    [sharedConfigBindings, localConfigBindings],
  )
  const contactStyle = {
    '--contact-conversation-max': `${contactConfig.conversationMaxWidthPx}px`,
    '--contact-optical-y': `${contactConfig.opticalOffsetYVh}svh`,
    '--contact-message-measure': `${contactConfig.messageMeasureCh}ch`,
    '--contact-hero-greeting-gap': `${contactConfig.heroGreetingGapPx}px`,
    '--contact-hero-greeting-size': `${contactConfig.heroGreetingTextSizePx}px`,
    '--contact-hero-greeting-measure': `${contactConfig.heroGreetingMeasureCh}ch`,
    '--contact-base-size': `${contactConfig.baseTextSizePx}px`,
    '--contact-conversation-size': `${contactConfig.conversationTextSizePx}px`,
    '--contact-line-height': contactConfig.lineHeight,
    '--contact-muted-opacity': contactConfig.mutedTextOpacity,
    '--contact-recap-body-opacity': contactConfig.recapBodyTextOpacity,
    '--contact-message-gap': `${contactConfig.messageGapPx}px`,
    '--contact-control-gap': `${contactConfig.controlGapPx}px`,
    '--contact-action-gap': `${contactConfig.actionGapPx}px`,
    '--contact-chip-height': `${contactConfig.chipHeightPx}px`,
    '--contact-chip-padding-x': `${contactConfig.chipPaddingXPx}px`,
    '--contact-viewport-height': `${contactConfig.conversationViewportHeightPx}px`,
    '--contact-message-duration': `${contactConfig.messageEntryDurationMs}ms`,
    '--contact-primary': resolvedMessageTextColor,
    '--contact-muted': contactConfig.mutedTextColor,
    '--contact-border': contactConfig.borderColor,
    '--contact-border-subtle': `color-mix(in srgb, ${contactConfig.borderColor} 16%, transparent)`,
    '--contact-border-hover': `color-mix(in srgb, ${contactConfig.borderColor} 28%, transparent)`,
    '--contact-border-focus': `color-mix(in srgb, ${contactConfig.borderColor} 44%, transparent)`,
  } as CSSProperties

  return (
    // LayoutDebugHighlightProvider now mounts once in pages/_app.tsx
    // (PLAN-DEDUPLICATE-PAGE-SHELL-LOGIC.md §6) — was independently
    // mounted per-page before; see that stage's own doc comment in
    // _app.tsx for the full reasoning. Every LayoutDebugOverlay instance
    // below (via PolymorphicLayout/SplitColumnPageShell/SplitColumnLayout/
    // SiteHeader) and the settings panel itself still share the
    // same context — now app-wide, not just page-wide.
    <>
      <SeoHead
        title={buildSiteTitle('Contact')}
        description="Reach Manuel at Abstract Voyage. An agent listens first, then relays what you said to him directly."
        canonicalPath="/contact"
      />
      <PolymorphicLayout
        config={contactPolymorphicLayoutConfig}
        pageSurfaceConfig={normalizedPageSurfaceConfig}
        headerWrapperRef={headerWrapperRef}
        mobileNavAlignEnabled
        // PLAN-POLYMORPHIC-LAYOUT-DECOUPLING.md §3 — this page constructs
        // its own <SiteHeader> instead of handing PolymorphicLayout
        // a siteHeaderConfig/logoStops pair to render automatically.
        // slotProps (HeaderSlotProps, components/SplitColumnPageShell.tsx)
        // carries the values only PolymorphicLayout's own internal
        // machinery can compute — primaryNavRef (merged with this page's
        // own, if it had one — it doesn't), navSplitBoundaryPx,
        // splitBandBoundaryPx, legibilityScrimLeftEnabled/-RightEnabled,
        // physicalRightColumnColor — spread last so nothing here can
        // silently shadow them.
        header={(slotProps) => (
          <SiteHeader
            // navAlignedToSplitEnabled override, layered on here rather
            // than mutating the shared normalizedSiteHeaderConfig (same
            // technique pages/abstract.tsx's own splitColumn branch uses)
            // — without it, the shared config's logoAlignedToSplitEnabled:
            // true default hides the logo behind md:hidden at desktop
            // widths expecting this same flag's own overlay to show a
            // replacement copy, which never mounted here, so the logo
            // simply vanished above the md breakpoint.
            // navAlignedToPageContainer:false (no navSplitBoundaryPx)
            // keeps this in pure percentage-mode against the header's own
            // width. PolymorphicLayout's own autoAlignNavSplit is
            // unconditional but resolves to a no-op here:
            // desktopNavAlignmentActive is always false once both ratio
            // tiers (contactPolymorphicLayoutConfig) are 'stacked', so
            // this percentage-mode config is never fought by a forced live
            // measurement (see PLAN-CONTACT-POLYMORPHIC-LAYOUT.md).
            config={buildEffectiveSiteHeaderConfig(
              buildSplitAlignedSiteHeaderConfig(
                normalizedSiteHeaderConfig, { navAlignedToPageContainer: false },
              ),
              contactPolymorphicLayoutConfig,
            )}
            // The same shared, cross-page Wordmark config /about and
            // /abstract already bind (AbstractDesignConfigProvider) —
            // this page previously rendered a flat, non-adaptive
            // colorMode: 'custom' logo (CONTACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG's
            // own logoColor, '#67676f') via SiteHeader.tsx's legacy shim.
            // Passing this prop switches the logo to the same
            // colorMode: 'column' contrast-aware derivation the other two
            // pages use, so it stays legible against whatever background
            // actually sits behind it (dark or light) instead of one fixed
            // gray. Nav text/border are unaffected — `config` above still
            // drives those independently via CONTACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG.
            wordmarkConfig={wordmarkConfig}
            pageSurfaceConfig={normalizedPageSurfaceConfig}
            {...slotProps}
          />
        )}
        wideColumn={undefined}
        narrowColumn={(
          <section aria-label="Contact" style={contactStyle}>
            {/* anchorClassName is deliberately just "w-full" — the anchor's
                own padding/max-width would be a geometry no-op for
                FixedViewportColumnContent's fixed layer (it copies only the
                anchor's measured width/left, both computed pre-padding under
                border-box sizing, never the padding itself). The gutter and
                conversation-column width cap below reproduce contact's
                original two-level nesting (outer: full-bleed + gutter
                padding; inner: mx-auto + max-w) as real, rendered children
                inside the fixed layer instead. */}
            <FixedViewportColumnContent
              headerOffsetPx={headerWrapperRect?.height ?? 0}
              anchorClassName="w-full"
            >
              <div
                className={`flex h-full min-h-0 w-full flex-col gap-6 overflow-x-clip pb-20 pt-4 font-sans text-[color:var(--contact-primary)] lg:translate-y-[var(--contact-optical-y)] lg:py-10 ${PAGE_CONTENT_GUTTER_CLASSNAME}`}
              >
                <div className="mx-auto flex h-full min-h-0 w-full max-w-[var(--contact-conversation-max)] flex-col pt-6">
                  <GuidedIntake
                    // Changing scenario remounts GuidedIntake outright — its
                    // existing unmount cleanup effect already aborts any in-flight
                    // request and clears pending retries, so this is a clean reset
                    // across every ref/state value without hand-writing one.
                    // simulatedLatencyMs is deliberately excluded: a pacing-only
                    // change should never discard an in-progress conversation. In
                    // production this key is permanently 'live', since the panel
                    // that could change it never renders.
                    key={contactDevModeConfig.scenario}
                    config={contactConfig}
                    ctaButtonConfig={normalizedCtaButtonConfig}
                    devModeConfig={contactDevModeConfig}
                    surfaceColor={normalizedPageSurfaceConfig.color}
                  />
                </div>
              </div>
            </FixedViewportColumnContent>
          </section>
        )}
      >
      <style jsx global>{`
        .contact-message-enter {
          animation: contact-message-in var(--contact-message-duration) cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        /* Opacity-only on purpose — a translateY(5px→0) slide used to run
           alongside the fade. A CSS transform still participates in an
           ancestor's *scrollable* overflow while it's mid-animation, even
           though the moving pixels stay visually clipped by the ancestor's
           overflow-y-auto — so every new row's entrance transiently grew
           .contact-scrollbar's scrollHeight a few px past its clientHeight
           and flashed a scrollbar on every submit. Confirmed by removing
           just the transform: scrollHeight === clientHeight in every case,
           at any row count. Opacity alone never affects layout/scrollable
           overflow, so it can't trigger this. */
        /* A plain 0→1 fade with no target to track — the per-row fade-by-
           position opacity lives on a separate, un-animated outer wrapper
           (see the turns.map render below) instead of being read in here via
           a custom property. An animation held by fill-mode "both" isn't
           guaranteed to keep re-resolving a var() on every subsequent
           render/style recalc the same way across browsers, so a value that
           needs to keep changing after the entrance animation has already
           finished has no business being computed inside a keyframe. */
        @keyframes contact-message-in {
          from { opacity: 0; }
          to { opacity: 1; }
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

        /* The one piece of hero-layout CSS this page needs: a spacer whose
           flex-grow is toggled between 1 (centered) and 0 (exiting/settled)
           in the JSX (see GuidedIntake's heroSpacerStyle) — deliberately
           *not* transitioned (no already-rendered message should ever have
           to reflow alongside a resizing container; see
           useComposerHeroPhase's own FLIP transform for where the visible
           "glide to the bottom" motion actually lives instead). Plain
           flexbox does the rest — no position:absolute, no
           percentage-of-stage-height math, nothing that has to
           independently agree with another element's own size or
           position. */
        .contact-hero-spacer {
          flex-shrink: 0;
          flex-basis: 0%;
          min-height: 0;
        }

        .contact-hero-container-fade-in {
          animation: contact-hero-container-fade-in var(--contact-hero-fade-duration) var(--contact-hero-fade-easing) both;
        }

        @keyframes contact-hero-container-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .contact-message-enter {
            animation: none;
          }

          .contact-pending-dot {
            animation: none;
            opacity: 0.6;
          }

          .contact-hero-container-fade-in {
            animation: none;
            opacity: 1;
          }

          /* No .contact-hero-spacer override needed here — it never
             carries a transition at all (see its own rule above), and
             useComposerHeroPhase's FLIP transform on the dock is entirely
             skipped at the JS level under reduced motion (triggerExit
             jumps straight to 'settled' with no transform ever applied),
             not just CSS-suppressed. */
        }
      `}</style>

      {showAuthoringTools ? (
        <ContactConfigPanel
          bindings={configBindings}
          isOpen={isPanelOpen}
          onToggle={togglePanel}
          backgroundColor={normalizedPageSurfaceConfig.color}
        />
      ) : null}
      </PolymorphicLayout>
    </>
  )
}
