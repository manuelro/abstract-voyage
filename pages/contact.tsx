import SeoHead from '../components/SeoHead'
import { buildSiteTitle } from '../helpers/siteMetadata'
import {
  useEffect, useMemo, useRef, useState,
  type CSSProperties,
} from 'react'
import { flushSync } from 'react-dom'
import { createConfigScopeBinding } from '../components/Panel/config'
import { useAuthoringToolsVisibility } from '../components/Panel/useAuthoringToolsVisibility'
import { CtaButton } from '../components/CtaButton'
import {
  ComposerPill,
  computeSweepDurationMs,
  resolveAutoMessageTextColor,
  type ComposerStarterPoints,
} from '../components/ComposerPill'
import {
  CTA_BUTTON_MOTION_EASINGS,
  normalizeCtaButtonConfig,
  type CtaButtonConfig,
} from '../components/CtaButton/config/registered'
import { usePrefersReducedMotion } from '../helpers/usePrefersReducedMotion'
import { deriveSurfaceColor } from '../helpers/surfaceColorDerivation'
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
import { PolymorphicLayout, usePolymorphicLayoutColors } from '../experiences/abstract/components/PolymorphicLayout'
import {
  resolvePolymorphicColumnBackgroundReference,
  resolvePolymorphicNarrowColumnTypography,
} from '../experiences/abstract/components/PolymorphicLayout.narrowColumnTypography'
import { DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG } from '../components/GlobalTypography.config'
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
  shouldSimulateIntakeStage,
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

const ENTRY_MESSAGE = `Hello. I’m ${AGENT_NAME}, Manuel’s contact assistant.

Start with what you’re noticing, considering, or trying to work through, rough as it is, and I’ll help shape it into a note for Manuel before you send it.`

// Shown once after gap-check/recap fails and merged with the identity ask in
// the same turn,
// on purpose: a separate confident-toned "Here's what I'll pass on" turn
// right after this hedge used to read as contradictory. In degraded mode
// there's no AI-organized recap to show — the visitor's own messages are
// already visible above as their own bubbles, so nothing gets re-echoed
// here at all.
const DEGRADED_ENTRY_MESSAGE = 'Something on my side isn’t shaping the note properly right now. Your original words can still reach Manuel exactly as you wrote them. What’s the best email for him to reply to?'

const RECAP_INTRO = 'Here’s the note Manuel would receive.'
const RECAP_UPDATE_INTRO = 'Here’s the updated note Manuel would receive.'
const REPLY_ROUTE_QUESTION = 'What’s the best email for Manuel to reply to?'
const NAME_QUESTION = 'What should Manuel call you? This is optional.'

const CLOSE_MESSAGE = REPLY_WINDOW_TEXT
  ? `That’s with Manuel now. He usually replies within ${REPLY_WINDOW_TEXT}, and he’ll come back with what he’s already thinking. If a conversation follows, the first one costs nothing.`
  : `That’s with Manuel now. He’ll come back with what he’s already thinking. If a conversation follows, the first one costs nothing.`

const ENTRY_PLACEHOLDER = 'Start anywhere'
const REPLY_ROUTE_PLACEHOLDER = 'your@email.com'
const NAME_PLACEHOLDER = 'Your name (optional)'
// Shorter fallback for the name step specifically — the composer pill's
// placeholder and its emptyValueAction ("Stay anonymous") sit side by side
// in the same single-line row (see ComposerPill.tsx's own trailing-slot
// swap), and at 320px (iPhone SE-class, the narrowest common real device)
// the pairing above still overlaps even after shortening it once already
// (operator-reported, live-measured 2026-09-21: fits cleanly at 375px+,
// overlaps ~26px at 320px). Below 375px, both strings drop further —
// "Name (optional)" + "Skip" measured with wide clearance (89px+) at both
// 320px and 375px, the only pairing tested that holds at the true floor.
// "Skip" is deliberately the least warm of the tested options (Jakob's
// Law: the single most learned convention for bypassing a non-required
// step needs no further explanation) — the tradeoff made explicitly here
// only on the narrowest tier, where there is no room left to also be warm.
const NAME_PLACEHOLDER_NARROW = 'Name (optional)'
const SKIP_NAME_LABEL_NARROW = 'Skip'
const SKIP_NAME_LABEL = 'Stay anonymous'
// Below this width the standard name-step copy pair no longer fits the
// pill without overlapping (see NAME_PLACEHOLDER_NARROW's own doc comment
// for the measurements) — 374px, not a shared breakpoints.ts tier (sm/md/
// lg/xl start at 640px+), since this is a component-internal text-fit
// threshold, not a layout breakpoint any other part of the page reflows
// around.
const NAME_STEP_NARROW_MEDIA_QUERY = '(max-width: 374px)'
const NOTE_EDIT_PLACEHOLDER = 'Edit the note'
const DEGRADED_ADDENDUM_PLACEHOLDER = 'Add anything else'

const CONFIRM_CORRECT_LABEL = 'Edit note'
const CONFIRM_ACCEPT_LABEL = 'Send note to Manuel'

// Degraded mode's own confirm-screen vocabulary — "correct" doesn't make
// sense when there's no AI interpretation to have gotten wrong, just a
// verbatim echo of what the visitor already wrote (see DEGRADED_ENTRY_MESSAGE).
const DEGRADED_CONFIRM_CORRECT_LABEL = 'Add more'
const DEGRADED_CONFIRM_ACCEPT_LABEL = 'Send note to Manuel'

// A quiet way back to the identity step from confirm — identical in normal
// and degraded mode (unlike CONFIRM_CORRECT_LABEL/DEGRADED_CONFIRM_CORRECT_LABEL above,
// editing a typo'd reply-to address isn't an AI-recap concern either way).
const EDIT_IDENTITY_LINK_LABEL = 'Edit reply details'

// The persistent escape hatch's default label. During an active follow-up
// question it swaps to CONTINUE_AS_WRITTEN_LABEL below — same handler
// (handleSendAsIs), just a copy change so the option reads as answering the
// question in front of the visitor rather than a generic bail-out.
const SEND_AS_IS_LABEL = 'Use my original words'
const CONTINUE_AS_WRITTEN_LABEL = 'Continue with what I’ve said'

// Shown while automatic retries remain (see autoRetryMaxCount) — names the
// wait so it doesn't read as stuck, while "Try sending again" stays a live
// override the whole time.
const deliveryRetryMessage = (retryDelaySeconds: number) =>
  `That didn’t go through. I’ll try again in ${retryDelaySeconds} seconds — or you can try now.`

// Shown once automatic retries are exhausted — the one point where this
// flow actually gives up and hands off, rather than promising another try.
const DELIVERY_GIVE_UP_MESSAGE = 'That still isn’t going through. Please use the email below so this doesn’t get lost.'

const STARTER_STEMS = [
  'I’m trying to make sense of',
  'I’m considering a change to',
  'Something is getting in the way of',
  'I’d value a perspective on',
] as const
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
type Step = 'message' | 'followup' | 'reply-route' | 'name' | 'note-edit' | 'degraded-addendum'
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

export type StarterPointsMode = 'hidden' | 'hint' | 'browsing'

// Exported for its own unit test rather than only exercised indirectly via
// the component's idle-timer effect — the effect's only synchronous
// decision (the idle timer itself is the sole path back to 'hint', and is
// inherently time-based). A real keystroke always wins over any mode,
// including 'browsing' (the visitor typing directly is "I changed my
// mind," same outcome as clicking the close X).
export const resolveStarterModeOnInput = (
  mode: StarterPointsMode,
  hasInput: boolean,
): StarterPointsMode => (hasInput ? 'hidden' : mode)

// Exported for its own unit test — the wraparound arithmetic behind the
// starting-points carousel's prev/next controls (ComposerPill's
// starterPoints.onPrev/onNext in GuidedIntake below).
export const cycleStarterIndex = (current: number, direction: 1 | -1, length: number) => (
  length <= 0 ? 0 : (current + direction + length) % length
)

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
      className={`inline-flex min-h-11 items-center px-1 text-[color:var(--contact-primary)] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--contact-border-focus)] ${emphasized ? 'font-semibold' : ''}`}
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
  // The in-pill "Not sure where to begin?" affordance (see
  // ComposerPill.tsx's own ComposerStarterPoints doc comment for the full
  // mode contract). Never visible on arrival — only a deliberate signal of
  // hesitation (focusing the field and pausing, or hovering it and pausing,
  // both for starterAffordanceIdleReappearDelayMs — see the isComposerFocused/
  // isComposerHovered effect below) reveals it. The idle-reappear/hide-on-type
  // effect below is the only other place this changes.
  const [starterMode, setStarterMode] = useState<StarterPointsMode>('hidden')
  const [starterIndex, setStarterIndex] = useState(0)
  // Real focus/hover of the composer pill itself (via ComposerPill's own
  // onFocusChange/onHoverChange — see its doc comment), not inferred from
  // step/phase — the starter-points idle reveal below is keyed on genuine
  // engagement with the field, not just "this is the opening message."
  const [isComposerFocused, setIsComposerFocused] = useState(false)
  const [isComposerHovered, setIsComposerHovered] = useState(false)
  // Non-null only for the brief window between selecting a starting-point
  // stem and that same text becoming real, editable inputValue — see
  // selectStarterStem's own doc comment.
  const [starterRevealText, setStarterRevealText] = useState<string | null>(null)
  const [placeholder, setPlaceholder] = useState(ENTRY_PLACEHOLDER)
  // Live-tracked (not just read once) so rotating a narrow device, or
  // resizing a desktop window down past the threshold, while already on
  // the name step swaps to the fitting copy immediately — see
  // NAME_PLACEHOLDER_NARROW's own doc comment. SSR-safe default false: the
  // name step is several turns into the conversation, never the first
  // paint, so there's no hydration-mismatch window to guard against the
  // way useBreakpointTier's own mobile-first default has to.
  const [isNameStepNarrow, setIsNameStepNarrow] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const query = window.matchMedia(NAME_STEP_NARROW_MEDIA_QUERY)
    const resolve = () => setIsNameStepNarrow(query.matches)
    resolve()
    query.addEventListener('change', resolve)
    return () => query.removeEventListener('change', resolve)
  }, [])
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
  const replyRouteRef = useRef('')
  const nameRef = useRef('')
  const recapIsRawRef = useRef(false)
  const degradedRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  // Delivery is the only browser-controlled retry sequence. AI inference is
  // retried inside the function so one interaction cannot multiply calls
  // across the browser and server.
  const pendingRetryTimeoutRef = useRef<number | null>(null)
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
  // True once the visitor has opened the starters at least once this session.
  // Gates the idle re-nudge (see the idle-reveal effect and
  // config.starterAffordanceReappearAfterUse) so proactive help doesn't keep
  // returning after the visitor has already found it — a ref, not state,
  // because it only ever flips on a click that already re-runs that effect.
  const hasEngagedStarterRef = useRef(false)

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

  // Drives starterMode's transitions that aren't a direct click (browsing's
  // own open/select/close are wired straight into the ComposerPill
  // starterPoints prop below). A real keystroke always hides the affordance
  // immediately (including one that lands while browsing — the visitor typing
  // is "I changed my mind," so this exits browsing exactly like the close X).
  //
  // The reveal is a genuine hesitation/dwell nudge, not a bare timer since
  // focus: it arms only when the field is hidden, EMPTY, and genuinely engaged
  // (focused or hovered), and its countdown restarts on any real activity —
  // a keystroke OR pointer movement over the field — so an actively-engaged
  // visitor (typing, or moving the cursor while reading) is never nudged;
  // only a truly still, silent pause of starterAffordanceIdleReappearDelayMs
  // trips it. Deliberately never armed by step/phase alone (arriving at the
  // opening message untouched must not surface it), never while the field
  // holds real text, and — unless starterAffordanceReappearAfterUse — never
  // again once the visitor has already opened the starters this session (see
  // hasEngagedStarterRef; proactive help that keeps returning after use reads
  // as nagging).
  useEffect(() => {
    // Master switch (see ContactExperienceConfig's own doc comment):
    // skipped outright when off, rather than just leaving starterMode stuck
    // at 'hidden' — the composer's own starterPoints prop already goes
    // undefined in that case, so this effect updating starterMode would be
    // pure unobservable churn (no UI reads it), and skipping it also means
    // no keydown/pointermove listeners get attached for a feature that
    // isn't showing anything.
    if (!config.starterPointsEnabled) return
    if (step !== 'message' || phase !== 'writing') return
    const nextMode = resolveStarterModeOnInput(starterMode, Boolean(inputValue))
    if (nextMode !== starterMode) {
      setStarterMode(nextMode)
      return
    }
    if (starterMode !== 'hidden') return
    if (inputValue) return
    if (!isComposerFocused && !isComposerHovered) return
    if (hasEngagedStarterRef.current && !config.starterAffordanceReappearAfterUse) return

    const textarea = textareaRef.current
    let timeoutId = 0
    const arm = () => {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(
        () => setStarterMode('hint'),
        config.starterAffordanceIdleReappearDelayMs,
      )
    }
    arm()
    // Any deliberate engagement — a key, or purposeful pointer motion over
    // the field — restarts the wait from zero; the nudge is for stillness,
    // not merely for time-since-focus.
    textarea?.addEventListener('keydown', arm)
    textarea?.addEventListener('pointermove', arm)
    return () => {
      window.clearTimeout(timeoutId)
      textarea?.removeEventListener('keydown', arm)
      textarea?.removeEventListener('pointermove', arm)
    }
  }, [
    inputValue, step, phase, starterMode,
    isComposerFocused, isComposerHovered, config.starterPointsEnabled,
    config.starterAffordanceIdleReappearDelayMs, config.starterAffordanceReappearAfterUse,
  ])

  useEffect(() => {
    // scrollRef.current IS the scroll owner now — it used to be a plain,
    // overflow-visible node delegating to a distant position:fixed
    // ancestor (data-responsive-overflow-owner, formerly two levels up on
    // FixedViewportColumnContent's own div), which is why this used to
    // climb via .closest() to find it. See
    // PLAN-CONTACT-VIEWPORT-SIMPLIFICATION.md.
    const node = scrollRef.current
    if (!node) return
    node.scrollTo({
      top: node.scrollHeight,
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
    // Server-side low-signal opening guard (see intake.js's isLowSignalMessage):
    // a deterministic third outcome alongside ready/needsFollowUp, delivered
    // over the same needsFollowUp/question/followUpToken shape so it rides
    // the existing one-question ceiling without a new client branch.
    needsClarification?: boolean
    question?: string
    followUpToken?: string
    recap?: string
    message?: string
    mode?: 'meta' | 'test'
  }

  // Dev-mode intake simulation (see experiences/contact/ContactDevMode.config.ts) —
  // reuses followUpCountRef/deliveryRetryCountRef, the same refs the real
  // client logic already maintains for its own bookkeeping, rather than
  // parsing anything off the request body: the wire contract (followUpToken,
  // submissionId) is opaque to this mock exactly as it is to the real
  // server-verification logic in intake.js, and reading the local refs
  // directly stays correct regardless of what that wire shape looks like.
  const DEV_FOLLOW_UP_ROUNDS = 1 // mirrors the production one-question limit

  const simulateIntakeResponse = async (body: Record<string, unknown>, signal?: AbortSignal): Promise<IntakeResponse> => {
    await simulateNetworkDelay(devModeConfig.simulatedLatencyMs, signal)
    const stage = body.stage as 'gap-check' | 'recap' | 'deliver'

    if (stage !== 'deliver' && devModeConfig.aiSource === 'simulate-unavailable') {
      // Any AI stage fails the same way intake.js does on a missing Gateway
      // configuration. Gap-check always runs first in the real flow, so the
      // recap branch is defensive rather than load-bearing.
      return { ok: false, degraded: true }
    }

    if (stage === 'gap-check') {
      if (devModeConfig.aiSource === 'simulate-followup' && followUpCountRef.current < DEV_FOLLOW_UP_ROUNDS) {
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
    if (devModeConfig.deliveryTestMode === 'simulate-fail-recover') {
      return deliveryRetryCountRef.current < 1
        ? { ok: false, message: 'Simulated delivery failure.' }
        : { ok: true }
    }
    if (devModeConfig.deliveryTestMode === 'simulate-fail-exhausted') {
      return { ok: false, message: 'Simulated delivery failure.' }
    }
    return { ok: true }
  }

  const postIntake = async (body: Record<string, unknown>, signal?: AbortSignal): Promise<IntakeResponse> => {
    // A second, independent gate on top of the panel's own showAuthoringTools
    // (which only controls whether the panel renders) — applied at the
    // Actual network chokepoint: the production guard is independent of
    // whether this dev-only panel happens to render, so forged browser state
    // can never simulate AI or delivery in a production build.
    const stage = body.stage as 'gap-check' | 'recap' | 'deliver'
    if (shouldSimulateIntakeStage(
      devModeConfig,
      stage,
      process.env.NODE_ENV === 'production',
    )) {
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

  // Renders an editable note. The visitor sees the value before we ask for a
  // reply route, making the personal-data exchange earned and explicit.
  const showRecapReady = (text: string, isUpdate: boolean) => {
    recapRef.current = text
    const intro = isUpdate ? RECAP_UPDATE_INTRO : RECAP_INTRO
    setTurns(prev => [...prev, {
      role: 'agent',
      variant: 'recap',
      text: `${intro}\n\n${text}`,
      recapQuestion: undefined,
    }])
    if (isUpdate) {
      setPhase('confirm')
    } else {
      setTurns(prev => [...prev, { role: 'agent', text: REPLY_ROUTE_QUESTION }])
      setPlaceholder(REPLY_ROUTE_PLACEHOLDER)
      setStep('reply-route')
      setPhase('writing')
    }
  }

  // Used both by enterDegraded (below) and by handleSendAsIs's no-identity-
  // yet branch — neither has an AI-organized recap to show (raw passthrough
  // in one case, a deliberate skip-ahead in the other), so neither echoes
  // visitorAnswersRef back as a synthetic turn. The visitor's own messages
  // are already visible above as their own bubbles; asking for identity is
  // the only thing left to say.
  const askForReplyRoute = () => {
    setTurns(prev => [...prev, { role: 'agent', text: REPLY_ROUTE_QUESTION }])
    setPlaceholder(REPLY_ROUTE_PLACEHOLDER)
    setStep('reply-route')
    setPhase('writing')
  }

  const enterDegraded = () => {
    degradedRef.current = true
    recapIsRawRef.current = true
    setTurns(prev => [...prev, { role: 'agent', text: DEGRADED_ENTRY_MESSAGE }])
    setPlaceholder(REPLY_ROUTE_PLACEHOLDER)
    setStep('reply-route')
    setPhase('writing')
  }

  const runRecap = async (isCorrection: boolean) => {
    setPhase('pending')
    const startedAt = Date.now()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const result = await postIntake(
        // The note is a visitor-authored artifact. Do not give the note model
        // the agent's own clarification wording, or it can mistakenly echo
        // that wording back as if the visitor had supplied it.
        { stage: 'recap', transcript: visitorAnswersRef.current.map(text => `Visitor: ${text}`).join('\n') },
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

  // The one AI judgment call: after a genuine opening message, decide whether
  // one optional clarification would materially improve Manuel's first reply.
  const runGapCheck = async () => {
    setPhase('pending')
    const startedAt = Date.now()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const result = await postIntake({
        stage: 'gap-check',
        transcript: modelTranscriptRef.current.join('\n'),
        followUpToken: followUpTokenRef.current,
      }, controller.signal)
      await waitForFloor(startedAt)
      if (!result.ok) return enterDegraded()
      if (result.mode && result.message) {
        const message = result.message
        setTurns(prev => [...prev, { role: 'agent', text: message }])
        modelTranscriptRef.current = []
        visitorAnswersRef.current = []
        followUpCountRef.current = 0
        followUpTokenRef.current = undefined
        setPlaceholder(ENTRY_PLACEHOLDER)
        setStep('message')
        setPhase('writing')
        return
      }
      followUpTokenRef.current = result.followUpToken
      if (!result.needsFollowUp) {
        await runRecap(false)
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
    await runRecap(false)
  }

  const submitNoteEdit = (rawText: string) => {
    const text = rawText.trim()
    if (!text) return
    recapRef.current = text
    setTurns(prev => {
      const recapIndex = [...prev].map(turn => turn.variant).lastIndexOf('recap')
      return prev.map((turn, index) => index === recapIndex
        ? { ...turn, text: `${RECAP_UPDATE_INTRO}\n\n${text}` }
        : turn)
    })
    setInputValue('')
    setPhase('confirm')
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

  const submitReplyRoute = (rawText: string) => {
    const text = rawText.trim()
    if (!text) return
    if (!EMAIL_PATTERN.test(text)) {
      setTurns(prev => [...prev, { role: 'agent', text: 'Please enter an email address so Manuel can reply.' }])
      return
    }
    replyRouteRef.current = text
    setTurns(prev => [...prev, { role: 'visitor', text }])
    setInputValue('')
    setTurns(prev => [...prev, { role: 'agent', text: NAME_QUESTION }])
    setPlaceholder(NAME_PLACEHOLDER)
    setStep('name')
    setPhase('writing')
  }

  const submitName = (rawText: string) => {
    const text = rawText.trim()
    if (text) {
      nameRef.current = text
      setTurns(prev => [...prev, { role: 'visitor', text }])
    }
    setInputValue('')
    setPhase('confirm')
  }

  const handleSkipName = () => submitName('')

  // Selecting a stem hands off to ComposerPill's own introText overlay (see
  // its doc comment) rather than setting inputValue immediately — the exact
  // same per-character SplitTextReveal sweep, at the exact same
  // heroPlaceholderReveal*/config timing, that ENTRY_PLACEHOLDER itself
  // plays on a fresh load, so a selected starting point arrives the same
  // way the composer's own placeholder did rather than snapping in as
  // already-typed text. Only once that sweep finishes does the seeded text
  // become real, editable value with the caret placed at its end.
  const selectStarterStem = (stem: string) => {
    const seededValue = `${stem} `
    setStarterMode('hidden')
    setStarterRevealText(seededValue)
    // The extra heroPlaceholderRevealStepDelayMs on top of the sweep's own
    // computed length is deliberate headroom, not slack in the math above —
    // it absorbs whatever render/layout/paint jank the double-rAF below
    // doesn't fully cover on a loaded or slower device, at the cost of one
    // more step's worth of wait (already a small, intentionally-tuned
    // value) rather than an arbitrary magic-number buffer.
    const revealDurationMs = computeSweepDurationMs(
      Array.from(seededValue).length,
      config.heroPlaceholderRevealStepDelayMs,
      config.heroPlaceholderRevealUnitDurationMs,
    ) + config.heroPlaceholderRevealStepDelayMs
    const commitRevealedText = () => {
      // A visitor who typed their own text during the brief reveal window
      // wins — never clobber real input with the seeded stem underneath it.
      if (textareaRef.current?.value) {
        setStarterRevealText(null)
        return
      }
      // flushSync forces both state updates to commit (and the textarea's
      // value to actually update in the DOM) synchronously, before the
      // browser paints the next frame — so the caret can be placed at the
      // end below in that same frame, with no intermediate paint where the
      // full text is visible but the caret still sits at its old position
      // (0, since a controlled textarea's caret doesn't follow a
      // programmatic value change on its own). A rAF-deferred
      // focus/setSelectionRange here would let that wrong-position frame
      // actually paint first, visible as the caret flickering at the start
      // of the seeded text for one frame before jumping to the end.
      flushSync(() => {
        setStarterRevealText(null)
        setInputValue(seededValue)
      })
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.focus()
      textarea.setSelectionRange(seededValue.length, seededValue.length)
    }
    // Two nested rAFs, not a setTimeout started from this synchronous call:
    // the CSS reveal's own animation-delay clock only starts once the
    // browser has actually committed and PAINTED the newly mounted
    // character spans this setStarterRevealText triggers — which happens
    // strictly after this function returns. Starting revealDurationMs's
    // countdown from here instead races ahead of that paint by however long
    // React + layout + paint take, cutting the last character(s) short
    // before their fade visually finishes. The first rAF fires before that
    // paint; the second fires once it has actually happened, so the
    // countdown below is measured from a point that actually corresponds to
    // the animation's real start, letting every character — including the
    // last — finish exactly as it does on a fresh page load.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(commitRevealedText, revealDurationMs)
      })
    })
  }

  const handleSend = () => {
    if (step === 'message') void submitFirstMessage(inputValue)
    else if (step === 'followup') void submitFollowUpAnswer(inputValue)
    else if (step === 'reply-route') submitReplyRoute(inputValue)
    else if (step === 'name') submitName(inputValue)
    else if (step === 'degraded-addendum') submitDegradedAddendum(inputValue)
    else submitNoteEdit(inputValue)
  }

  const handleRequestCorrection = () => {
    setInputValue(recapRef.current)
    setPlaceholder(NOTE_EDIT_PLACEHOLDER)
    setStep('note-edit')
    setPhase('writing')
  }

  const handleRequestIdentityEdit = () => {
    setInputValue(replyRouteRef.current)
    setPlaceholder(REPLY_ROUTE_PLACEHOLDER)
    setStep('reply-route')
    setPhase('writing')
  }

  const handleRequestDegradedAddendum = () => {
    setPlaceholder(DEGRADED_ADDENDUM_PLACEHOLDER)
    setStep('degraded-addendum')
    setPhase('writing')
  }

  // Delivery failures get up to autoRetryMaxCount automatic retries. This is
  // always visible
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
        identity: [nameRef.current, replyRouteRef.current].filter(Boolean).join(' '),
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

  // Restoring the original words is an edit to the visible, unsent note —
  // never an implicit delivery shortcut. Keeping it inside the note/review
  // states preserves both authorship and the explicit send boundary.
  const handleSendAsIs = () => {
    const text = visitorAnswersRef.current.join('\n\n').trim()
    if (!text) return
    recapRef.current = text
    recapIsRawRef.current = false
    setTurns(prev => {
      const recapIndex = [...prev].map(turn => turn.variant).lastIndexOf('recap')
      return prev.map((turn, index) => index === recapIndex
        ? { ...turn, text: `${RECAP_UPDATE_INTRO}\n\n${text}` }
        : turn)
    })
  }

  const canUseOriginalWords = config.useOriginalWordsActionEnabled &&
    phase !== 'done' && !degradedRef.current &&
    (step === 'reply-route' || step === 'name' || phase === 'confirm')

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

  // The confirm screen's accept action ("Send note to Manuel") used to
  // inherit its fill/border straight from the shared, site-wide
  // ctaButtonConfig; it now owns its own explicit default/hover-active
  // colors here (see primaryButtonBackgroundColor's own doc comment,
  // ContactExperience.config.ts) so this page can tune them independently.
  // backgroundColorMode/borderColorMode both 'custom' so CtaButton never
  // falls back to deriving either from surfaceColor.
  const primaryCtaButtonConfig = useMemo(
    () => ({
      ...ctaButtonConfig,
      backgroundColorMode: 'custom' as const,
      backgroundColor: config.primaryButtonBackgroundColor,
      hoverColorsEnabled: true,
      hoverBackgroundColor: config.primaryButtonHoverActiveBackgroundColor,
      borderColorMode: 'custom' as const,
      borderColor: config.primaryButtonBorderColor,
      hoverBorderColor: config.primaryButtonHoverActiveBorderColor,
    }),
    [
      ctaButtonConfig,
      config.primaryButtonBackgroundColor,
      config.primaryButtonHoverActiveBackgroundColor,
      config.primaryButtonBorderColor,
      config.primaryButtonHoverActiveBorderColor,
    ],
  )
  // The correction action ("Edit note"/"Add more") never owns its own fill/
  // border hex values — it always derives from the primary button's own
  // colors above, each darkened by its own relative amount (see
  // secondaryButtonBackgroundDarkenAmount's own doc comment,
  // ContactExperience.config.ts). Used to render fully transparent
  // (backgroundMode: 'transparent'), reading as a disabled/inert control
  // next to the accept action's solid fill (operator-reported, 2026-09-21).
  const secondaryCtaButtonConfig = useMemo(
    () => ({
      ...primaryCtaButtonConfig,
      backgroundColor: deriveSurfaceColor(
        config.primaryButtonBackgroundColor, -config.secondaryButtonBackgroundDarkenAmount,
      ),
      hoverBackgroundColor: deriveSurfaceColor(
        config.primaryButtonHoverActiveBackgroundColor, -config.secondaryButtonHoverActiveBackgroundDarkenAmount,
      ),
      borderColor: deriveSurfaceColor(
        config.primaryButtonBorderColor, -config.secondaryButtonBorderDarkenAmount,
      ),
      hoverBorderColor: deriveSurfaceColor(
        config.primaryButtonHoverActiveBorderColor, -config.secondaryButtonHoverActiveBorderDarkenAmount,
      ),
    }),
    [
      primaryCtaButtonConfig,
      config.primaryButtonBackgroundColor,
      config.primaryButtonHoverActiveBackgroundColor,
      config.primaryButtonBorderColor,
      config.primaryButtonHoverActiveBorderColor,
      config.secondaryButtonBackgroundDarkenAmount,
      config.secondaryButtonHoverActiveBackgroundDarkenAmount,
      config.secondaryButtonBorderDarkenAmount,
      config.secondaryButtonHoverActiveBorderDarkenAmount,
    ],
  )
  // The composer pill's own fill/border — same "own explicit colors instead
  // of the shared, site-wide ctaButtonConfig's 'auto' surface-derived ones"
  // move as primaryCtaButtonConfig above, applied to ComposerPill's own
  // ctaButtonConfig prop (see composerPillBackgroundColor's own doc comment,
  // ContactExperience.config.ts). Derived from the raw shared ctaButtonConfig
  // (not primaryCtaButtonConfig) — the pill and the confirm buttons are
  // independently colored, just via the same technique.
  const composerCtaButtonConfig = useMemo(
    () => ({
      ...ctaButtonConfig,
      backgroundColorMode: 'custom' as const,
      backgroundColor: config.composerPillBackgroundColor,
      hoverColorsEnabled: true,
      hoverBackgroundColor: config.composerPillHoverActiveBackgroundColor,
      borderColorMode: 'custom' as const,
      borderColor: config.composerPillBorderColor,
      hoverBorderColor: config.composerPillHoverActiveBorderColor,
    }),
    [
      ctaButtonConfig,
      config.composerPillBackgroundColor,
      config.composerPillHoverActiveBackgroundColor,
      config.composerPillBorderColor,
      config.composerPillHoverActiveBorderColor,
    ],
  )
  // Active is deliberately rendered identical to hover on both confirm
  // actions — CtaButtonConfig has no distinct third color slot, and a real
  // click is simultaneously :hover AND :active anyway, so this just
  // repoints --cta-background/--cta-border to the same --cta-hover-
  // background/-border custom properties CtaButton.tsx already sets for
  // hover (the exact technique its own internal group-hover rule uses),
  // guaranteeing the two states can never visually diverge. `!` (Tailwind's
  // important marker): group-hover's own rule otherwise wins this tie
  // (confirmed live, 2026-09-21).
  const ctaButtonActiveClassName = 'active:![--cta-background:var(--cta-hover-background)] active:![--cta-border:var(--cta-hover-border)]'

  // Confirm-screen button label size/weight, segregated per breakpoint (see
  // buttonFontSize's own doc comment, ContactExperience.config.ts). Applied
  // to a <span> wrapping the label text itself — one DOM level deeper than
  // CtaButton's own inner surface span (which sets its own fontSize/
  // font-medium classes directly) — so these explicit classes win the
  // inheritance battle instead of losing to CtaButton's closer-to-the-text
  // declaration the way a plain className passed to CtaButton itself would
  // (that prop lands on CtaButton's outer wrapping element, further from
  // the text, not the surface span).
  const buttonFontClassName = [
    config.buttonFontSize, config.buttonFontSizeWide, config.buttonFontSizeLg,
    config.buttonFontWeight, config.buttonFontWeightWide, config.buttonFontWeightLg,
  ].join(' ')

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
        // The one designated scroller in this whole page now (see
        // PLAN-CONTACT-VIEWPORT-SIMPLIFICATION.md) — previously
        // overflow-visible, delegating actual scrolling to a distant
        // position:fixed ancestor (FixedViewportColumnContent, since
        // removed).
        //
        // min-h-0, not the old min-h-[var(--contact-viewport-height)]
        // (360px) floor: min-h-0 is the standard, required pairing with
        // flex-1 in a column that must be able to shrink below its own
        // content size (CSS flexbox's default min-height:auto on a flex
        // item otherwise refuses to shrink below its content height at
        // all). The 360px floor was a real, deliberate choice (see its own
        // former doc comment — a short-viewport aesthetic guarantee so the
        // feed never looked cramped), but a *fixed* floor and *guaranteed
        // composer visibility* are directly in tension on a short-enough
        // viewport: forcing this box to at least 360px when the keyboard
        // has left less room than that just reintroduces the exact "big
        // box the composer sinks into" bug this whole plan exists to
        // remove — the outer column's own overflow-hidden would then clip
        // the composer instead of merely scrolling it out of reach, worse.
        // Composer visibility wins when the two conflict. In practice this
        // costs nothing on ordinary tall/desktop viewports either: flex-1
        // already claims all remaining column space regardless of
        // min-height (that's flex-grow's job, not min-height's) — the
        // floor was only ever a *shrinking* constraint, never what made
        // the feed fill tall screens.
        className="flex w-full flex-1 min-h-0 flex-col items-center justify-end gap-[var(--contact-message-gap)] overflow-y-auto overscroll-contain pr-2"
        data-responsive-overflow-owner="true"
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
                  // Literal Tailwind size/leading tokens straight from
                  // config (components/tailwindTypographyScale.ts) — the
                  // Wide/Lg values already carry their own md:/lg: prefix
                  // (ContactExperienceConfig's own doc comment), so they
                  // compose directly into the class string, no CSS-custom-
                  // property indirection.
                  const baseClassName = `w-fit max-w-[var(--contact-message-measure)] whitespace-pre-line [overflow-wrap:anywhere] ${messageTextAlignClassName} ${config.lineHeight} ${config.lineHeightWide} ${config.lineHeightLg}`
                  const mutedClassName = `${config.heroGreetingTextSize} ${config.heroGreetingTextSizeWide} ${config.heroGreetingTextSizeLg} text-[color:var(--contact-muted)] opacity-[var(--contact-muted-opacity)]`
                  const primaryClassName = `${config.conversationTextSize} ${config.conversationTextSizeWide} ${config.conversationTextSizeLg} text-[color:var(--contact-primary)]`
                  // Recap-body-only tier, between mutedClassName's label
                  // opacity and primaryClassName's full contrast — the
                  // visitor's own words reflected back read as calm
                  // reference copy, so it recedes on its own rather than
                  // needing recapQuestion below (plain primaryClassName, no
                  // added weight) to shout over it.
                  const recapBodyClassName = `${config.conversationTextSize} ${config.conversationTextSizeWide} ${config.conversationTextSizeLg} text-[color:var(--contact-primary)] opacity-[var(--contact-recap-body-opacity)]`

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
                  <p className={`mx-auto w-fit max-w-[min(var(--contact-message-measure),88%)] whitespace-pre-line [overflow-wrap:anywhere] rounded-[22px] bg-black/[0.06] px-4 py-2.5 ${messageTextAlignClassName} ${config.baseTextSize} ${config.baseTextSizeWide} ${config.baseTextSizeLg} ${config.lineHeight} ${config.lineHeightWide} ${config.lineHeightLg} text-[color:var(--contact-primary)]`}>
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
      <div
        ref={dockRef}
        // gap here is the dedicated, config-driven space between the dock's
        // main content (greeting/composer/confirm/failed states, all still
        // sharing messageGapPx's own gap internally, one level in) and the
        // mandatory-actions row below — a real CSS gap between the two
        // groups, not the padding-top + negative-margin cancellation this
        // used to be (operator suggestion, simpler and more direct: gap is
        // the property actually meant for "space between two flex
        // siblings," padding is for space inside one box). dockRef's own
        // measured rect (useComposerHeroPhase's FLIP transform) is
        // unaffected — same two groups of content, same total box, just
        // reorganized which gap value applies where internally.
        className={`relative flex w-full flex-col items-center ${config.mandatoryActionsTopGap}`}
      >
        <div className="flex w-full flex-col items-center gap-[var(--contact-message-gap)]">
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
            buttonHoverActiveTextColor={config.composerButtonHoverActiveTextColor}
            buttonTextColor={config.composerButtonTextColor}
            composerElevationPx={config.composerElevationPx}
            motionConfig={config}
            ctaButtonConfig={composerCtaButtonConfig}
            disabled={phase === 'pending'}
            emptyValueActionHoverActiveTextColor={config.emptyValueActionHoverActiveTextColor}
            emptyValueActionTextColor={config.emptyValueActionTextColor}
            heroPhase={heroPhase}
            emptyValueAction={step === 'name' ? {
              label: isNameStepNarrow ? SKIP_NAME_LABEL_NARROW : SKIP_NAME_LABEL,
              onClick: handleSkipName,
            } : undefined}
            introText={starterRevealText ?? undefined}
            onChange={setInputValue}
            onFocusChange={setIsComposerFocused}
            onHoverChange={setIsComposerHovered}
            onSubmit={handleSend}
            pendingIndicator={<AgentPendingIndicator config={config} />}
            placeholder={step === 'name' && isNameStepNarrow ? NAME_PLACEHOLDER_NARROW : placeholder}
            placeholderMinContrast={config.composerPlaceholderMinContrast}
            // 0 once a selected stem is revealing — the cascaded delay
            // above exists to sequence the page's own load-time entrance
            // (container fade, then this, then the greeting); replaying
            // that same dead pause after a deliberate click would just read
            // as lag. Matches AbstractHeroCtaComposer's own precedent for
            // the same prop (0 for every reveal after its own first line).
            placeholderRevealInitialDelayMs={starterRevealText ? 0 : heroPlaceholderRevealInitialDelayMs}
            maxVisibleLines={config.composerMaxVisibleLines}
            singleLine
            starterPoints={step === 'message' && config.starterPointsEnabled ? {
              mode: starterMode,
              hintLabel: 'Not sure where to begin?',
              options: STARTER_STEMS,
              index: starterIndex,
              transitionDurationMs: config.starterAffordanceTransitionDurationMs,
              transitionEasing: CTA_BUTTON_MOTION_EASINGS[config.starterAffordanceTransitionEasing],
              fadeInDurationMs: config.starterAffordanceFadeInDurationMs,
              fadeInEasing: CTA_BUTTON_MOTION_EASINGS[config.starterAffordanceFadeInEasing],
              onHintClick: () => {
                // Opening the starters counts as engagement — the idle nudge
                // won't auto-return afterwards (unless reappearAfterUse).
                hasEngagedStarterRef.current = true
                setStarterIndex(0)
                setStarterMode('browsing')
              },
              onPrev: () => setStarterIndex(
                previous => cycleStarterIndex(previous, -1, STARTER_STEMS.length),
              ),
              onNext: () => setStarterIndex(
                previous => cycleStarterIndex(previous, 1, STARTER_STEMS.length),
              ),
              onSelect: selectStarterStem,
              // Also the mobile hint's own dismiss × (ComposerPill.tsx) —
              // a visitor who explicitly backs out (from either mode) has
              // made their "no" clear, same as one who opened browsing.
              onClose: () => {
                hasEngagedStarterRef.current = true
                setStarterMode('hidden')
              },
            } satisfies ComposerStarterPoints : undefined}
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
            The accept action (right) renders with primaryCtaButtonConfig
            while the correction action (left) gets the derived-darker
            secondaryCtaButtonConfig variant — a real visual primary/
            secondary hierarchy, not two visually-identical choices. Both
            get onFocus/onMouseEnter release handlers regardless of which
            one is forceHover-highlighted: a real hover or focus on *either*
            action retires the simulated nudge for the rest of this
            confirm-screen instance. */}
        {phase === 'confirm' && (
          <div className="flex flex-wrap items-center justify-center gap-[var(--contact-control-gap)]">
            {degradedRef.current ? (
              <>
                <CtaButton
                  className={ctaButtonActiveClassName}
                  config={secondaryCtaButtonConfig}
                  onClick={handleRequestDegradedAddendum}
                  onFocus={handleReleaseConfirmForceHover}
                  onMouseEnter={handleReleaseConfirmForceHover}
                  surfaceColor={surfaceColor}
                >
                  <span className={buttonFontClassName}>{DEGRADED_CONFIRM_CORRECT_LABEL}</span>
                </CtaButton>
                <CtaButton
                  className={ctaButtonActiveClassName}
                  config={primaryCtaButtonConfig}
                  forceHover={confirmForceHover}
                  onClick={() => void handleConfirmed()}
                  onFocus={handleReleaseConfirmForceHover}
                  onMouseEnter={handleReleaseConfirmForceHover}
                  surfaceColor={surfaceColor}
                >
                  <span className={buttonFontClassName}>{DEGRADED_CONFIRM_ACCEPT_LABEL}</span>
                </CtaButton>
              </>
            ) : (
              <>
                <CtaButton
                  className={ctaButtonActiveClassName}
                  config={secondaryCtaButtonConfig}
                  onClick={handleRequestCorrection}
                  onFocus={handleReleaseConfirmForceHover}
                  onMouseEnter={handleReleaseConfirmForceHover}
                  surfaceColor={surfaceColor}
                >
                  <span className={buttonFontClassName}>{CONFIRM_CORRECT_LABEL}</span>
                </CtaButton>
                <CtaButton
                  className={ctaButtonActiveClassName}
                  config={primaryCtaButtonConfig}
                  forceHover={confirmForceHover}
                  onClick={() => void handleConfirmed()}
                  onFocus={handleReleaseConfirmForceHover}
                  onMouseEnter={handleReleaseConfirmForceHover}
                  surfaceColor={surfaceColor}
                >
                  <span className={buttonFontClassName}>{CONFIRM_ACCEPT_LABEL}</span>
                </CtaButton>
              </>
            )}
          </div>
        )}

        {phase === 'failed' && (
          <div className="flex flex-wrap items-center justify-center gap-[var(--contact-control-gap)]">
            <CtaButton
              className={ctaButtonActiveClassName}
              config={primaryCtaButtonConfig}
              onClick={() => { clearPendingRetry(); void handleConfirmed(true) }}
              surfaceColor={surfaceColor}
            >
              <span className={buttonFontClassName}>Try sending again</span>
            </CtaButton>
          </div>
        )}

        {/* Muted while auto-retries remain — only the final give-up state
            (retries exhausted) is styled as an actual error; a retry-pending
            message shouldn't look as alarming as one that genuinely needs the
            visitor's attention. */}
        {phase === 'failed' && (
          <p
            className={`contact-message-enter max-w-[var(--contact-message-measure)] [overflow-wrap:anywhere] ${messageTextAlignClassName} ${config.conversationTextSize} ${config.conversationTextSizeWide} ${config.conversationTextSizeLg} ${config.lineHeight} ${config.lineHeightWide} ${config.lineHeightLg} ${
              deliveryRetriesExhausted
                ? 'text-rose-700'
                : 'text-[color:var(--contact-muted)] opacity-[var(--contact-muted-opacity)]'
            }`}
          >
            {deliveryError}
          </p>
        )}
        </div>

        <div
          className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[color:var(--contact-muted)] ${config.mandatoryActionsFontSize} ${config.mandatoryActionsPaddingRight} ${config.mandatoryActionsPaddingBottom} ${config.mandatoryActionsPaddingLeft}`}
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
          {/* Mutually exclusive with canUseOriginalWords below (followup vs.
              reply-route/name/confirm) — never both in this row at once. */}
          {phase === 'writing' && step === 'followup' && (
            <>
              <button
                type="button"
                onClick={() => void runRecap(false)}
                className="inline-flex min-h-11 items-center px-1 text-[color:var(--contact-primary)] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--contact-border-focus)]"
              >
                {CONTINUE_AS_WRITTEN_LABEL}
              </button>
              <span aria-hidden="true">·</span>
            </>
          )}
          {canUseOriginalWords && (
            <button
              type="button"
              onClick={handleSendAsIs}
              className="inline-flex min-h-11 items-center px-1 text-[color:var(--contact-primary)] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--contact-border-focus)]"
            >
              {SEND_AS_IS_LABEL}
            </button>
          )}
          {canUseOriginalWords && <span aria-hidden="true">·</span>}
          {/* Only meaningful once an identity has actually been given — this
              is the one field the rest of the confirm screen (correction /
              degraded "Add more") has no way to revise. */}
          {phase === 'confirm' && replyRouteRef.current && (
            <>
              <button
                type="button"
                onClick={handleRequestIdentityEdit}
                className="inline-flex min-h-11 items-center px-1 text-[color:var(--contact-primary)] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--contact-border-focus)]"
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
  // Standalone call (usePolymorphicLayoutColors's own doc comment blesses
  // this — the exact same values <PolymorphicLayout> below computes
  // internally, not a second independently-computed copy) purely to reach
  // colors.wordmarkGradientStops for the header render-prop below;
  // HeaderSlotProps doesn't carry it. See
  // PLAN-WORDMARK-SCROLL-GRADIENT-INTEGRATION.md.
  const colors = usePolymorphicLayoutColors(
    contactPolymorphicLayoutConfig, normalizedPageSurfaceConfig.color,
  )
  // The real, physically-painted background reference for /contact's own
  // content column (all of it lives in narrowColumn — see
  // CONTACT_POLYMORPHIC_LAYOUT_CONFIG's own doc comment) — NEVER the flat
  // normalizedPageSurfaceConfig.color once the scroll gradient is active,
  // the mistake resolvePolymorphicColumnBackgroundReference's own doc
  // comment documents as a confirmed, repeated bug elsewhere in this
  // codebase (/about's AboutTimeline, /posts's article/ToC ink, each fixed
  // by hand before this shared helper existed to prevent a third). Falls
  // back to colors.narrowColumnColor (which itself resolves to the flat
  // page surface whenever the gradient is inactive) the moment the
  // gradient isn't painting this column, so every resolvedXTextColor below
  // is byte-identical to its pre-gradient value on any tier/config where
  // the gradient stays off — this only changes behavior once the gradient
  // is genuinely visible underneath.
  const narrowColumnBackgroundReference = useMemo(
    () => resolvePolymorphicColumnBackgroundReference(colors, 'narrow'),
    [colors],
  )
  // Same shared call /about.tsx and /abstract.tsx already make
  // (PolymorphicLayout.narrowColumnTypography.ts) — the one place
  // colors.scrollGradientDarkInkSaturation/-OpacityMultiplier/
  // scrollGradientLightInkOnLightBackgroundContrastTolerance are actually
  // consumed. Fixing narrowColumnBackgroundReference above (previous
  // round) corrected WHAT color the text contrasts against, but
  // resolveAutoMessageTextColor itself never reads those three fields —
  // it's a plain hue-preserving contrast search, unrelated to the shared
  // grayscale-then-reintroduce-tint dark-ink algorithm those panel
  // controls drive. Operator-reported, 2026-09-21: raising "Dark ink
  // saturation/opacity" or "Light ink tolerance" in the panel had no
  // visible effect on /contact's text — confirmed root cause. Using
  // DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG (not a live/panel-editable config,
  // same as /about's own identical call) as the typography input —
  // messageAutoTextMinContrast/mutedAutoTextMinContrast/
  // borderAutoTextMinContrast stay in effect only for the gradient-
  // INACTIVE branch below (resolveAutoMessageTextColor, unchanged),
  // matching how /about/-abstract themselves only ever resolve one shared
  // ink per column, not an independently-searched contrast target per
  // text role.
  const narrowColumnTypography = useMemo(
    () => resolvePolymorphicNarrowColumnTypography(colors, DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG),
    [colors],
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
        ? colors.scrollGradientActive
          ? narrowColumnTypography.titleColor
          : resolveAutoMessageTextColor(
            narrowColumnBackgroundReference,
            contactConfig.messageAutoTextMinContrast,
          )
        : contactConfig.primaryTextColor
    ),
    [
      contactConfig.messageTextColorMode,
      contactConfig.messageAutoTextMinContrast,
      contactConfig.primaryTextColor,
      narrowColumnBackgroundReference,
      colors.scrollGradientActive,
      narrowColumnTypography,
    ],
  )
  // Same 'auto'/'custom' contract as resolvedMessageTextColor above, for the
  // muted-tier text (composer placeholder, "Send as is," turn labels) and
  // control borders — previously flat hardcoded grays regardless of the
  // page surface color (see ContactExperienceConfig.mutedTextColorMode's
  // own doc comment for the legibility gap this closes). Shares the exact
  // same narrowColumnTypography.titleColor as resolvedMessageTextColor
  // while the gradient is active (one shared ink per column, same as
  // /about and /abstract — mutedAutoTextMinContrast/borderAutoTextMinContrast
  // only still apply in the gradient-inactive branch below) — this page's
  // own pre-existing opacity/color-mix layering (--contact-muted-opacity,
  // the border color-mix chain) is what visually differentiates the three
  // roles from that one shared ink, not an independently-searched contrast
  // target per role.
  const resolvedMutedTextColor = useMemo(
    () => (
      contactConfig.mutedTextColorMode === 'auto'
        ? colors.scrollGradientActive
          ? narrowColumnTypography.titleColor
          : resolveAutoMessageTextColor(
            narrowColumnBackgroundReference,
            contactConfig.mutedAutoTextMinContrast,
          )
        : contactConfig.mutedTextColor
    ),
    [
      contactConfig.mutedTextColorMode,
      contactConfig.mutedAutoTextMinContrast,
      contactConfig.mutedTextColor,
      narrowColumnBackgroundReference,
      colors.scrollGradientActive,
      narrowColumnTypography,
    ],
  )
  const resolvedBorderColor = useMemo(
    () => (
      contactConfig.borderColorMode === 'auto'
        ? colors.scrollGradientActive
          ? narrowColumnTypography.titleColor
          : resolveAutoMessageTextColor(
            narrowColumnBackgroundReference,
            contactConfig.borderAutoTextMinContrast,
          )
        : contactConfig.borderColor
    ),
    [
      contactConfig.borderColorMode,
      contactConfig.borderAutoTextMinContrast,
      contactConfig.borderColor,
      narrowColumnBackgroundReference,
      colors.scrollGradientActive,
      narrowColumnTypography,
    ],
  )
  // Live-measured header height, feeding the narrowColumn content's own
  // height: calc(100dvh - headerHeightPx) below (see
  // PLAN-CONTACT-VIEWPORT-SIMPLIFICATION.md) — mirrors components/
  // SplitColumnPageShell.tsx's own internal measuredHeaderHeightPx/
  // internalHeaderWrapperRef idiom verbatim. Independent of that internal
  // measurement (which drives *ColumnHeaderBehavior's pushDown margin
  // reservation, inert here under headerScrollBehavior: 'static') — this
  // page needs its own instance for its own layout math, via
  // PolymorphicLayout's own headerWrapperRef passthrough. Sourced from
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
    '--contact-hero-greeting-measure': `${contactConfig.heroGreetingMeasureCh}ch`,
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
    '--contact-muted': resolvedMutedTextColor,
    '--contact-border': resolvedBorderColor,
    '--contact-border-subtle': `color-mix(in srgb, ${resolvedBorderColor} 16%, transparent)`,
    '--contact-border-hover': `color-mix(in srgb, ${resolvedBorderColor} 28%, transparent)`,
    '--contact-border-focus': `color-mix(in srgb, ${resolvedBorderColor} 44%, transparent)`,
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
            // colors.wordmarkGradientStops takes priority when present —
            // see PLAN-WORDMARK-SCROLL-GRADIENT-INTEGRATION.md.
            wordmarkConfig={colors.wordmarkGradientStops
              ? { ...wordmarkConfig, colorMode: 'adaptive' }
              : wordmarkConfig}
            logoStops={colors.wordmarkGradientStops}
            pageSurfaceConfig={normalizedPageSurfaceConfig}
            {...slotProps}
          />
        )}
        wideColumn={undefined}
        narrowColumn={(
          <section aria-label="Contact" style={contactStyle}>
            {/* height: calc(100dvh - headerHeightPx) — a plain CSS bound
                reactively fed by the SAME headerWrapperRect measurement this
                page already takes for its header (nothing new to measure),
                rather than the old FixedViewportColumnContent's
                position:fixed box, whose top/height were kept in sync with
                window.visualViewport via JS event listeners
                (useFixedViewportColumnLayout). That JS-measured approach is
                exactly what PLAN-CONTACT-VIEWPORT-SIMPLIFICATION.md's own
                real-device evidence (2026-09-21) traced this whole session's
                composer-hidden-by-the-keyboard bug to: visualViewport
                resize/scroll firing promptly, before the OS's own native
                "scroll input into view" behavior runs, is a cross-browser
                timing race, not a guarantee — Chrome-iOS in particular is a
                documented source of exactly this inconsistency. dvh is
                resolved natively by the browser's own layout engine against
                the CURRENT visual viewport (keyboard included), with zero
                JS and zero race — the standard, robust fix for this exact,
                extremely common problem. overflow-hidden here (not auto):
                this box is not itself meant to scroll — GuidedIntake's own
                message feed below is the one designated scroller now (see
                its own doc comment) — anything that doesn't fit here is a
                sizing bug to fix, not something to paper over with a second
                scroll container. */}
            <div
              className={`flex h-full min-h-0 w-full flex-col gap-6 overflow-hidden pb-20 pt-4 font-sans text-[color:var(--contact-primary)] lg:translate-y-[var(--contact-optical-y)] lg:py-10 ${PAGE_CONTENT_GUTTER_CLASSNAME}`}
              style={{ height: `calc(100dvh - ${headerWrapperRect?.height ?? 0}px)` }}
            >
              <div className="mx-auto flex h-full min-h-0 w-full max-w-[var(--contact-conversation-max)] flex-col pt-6">
                <GuidedIntake
                  // Changing AI source remounts GuidedIntake outright — its
                  // existing unmount cleanup effect already aborts any in-flight
                  // request and clears pending retries, so this is a clean reset
                  // across every ref/state value without hand-writing one.
                  // Delivery behavior and simulatedLatencyMs are deliberately
                  // excluded: neither should discard a conversation already
                  // ready for confirmation. In production this key is always
                  // live-gateway, since the panel cannot render.
                  key={contactDevModeConfig.aiSource}
                  config={contactConfig}
                  ctaButtonConfig={normalizedCtaButtonConfig}
                  devModeConfig={contactDevModeConfig}
                  surfaceColor={normalizedPageSurfaceConfig.color}
                />
              </div>
            </div>
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
