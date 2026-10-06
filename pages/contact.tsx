import SeoHead from '../components/SeoHead'
import { siteSans } from './_app'
import { buildSiteTitle } from '../helpers/siteMetadata'
import { SiteContentProvider } from '../helpers/content/SiteContentProvider'
import { formatContentTemplate, type ContactPageContent, type SiteContent } from '../helpers/content/pageContent.schema'
import {
  useEffect, useMemo, useRef, useState,
  type CSSProperties,
} from 'react'
import { createPortal, flushSync } from 'react-dom'
import { createConfigScopeBinding } from '../components/Panel/config'
import { useAuthoringToolsVisibility } from '../components/Panel/useAuthoringToolsVisibility'
import { CtaButton } from '../components/CtaButton'
import { useCardLiftPhysics } from '../components/proximity/useCardLiftPhysics'
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
import { SplitTextReveal } from '../components/SplitTextReveal'
import { useBreakpointTier } from '../components/useBreakpointTier'
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
const REPLY_ROUTE_ERROR_MESSAGE = 'Please enter an email address so Manuel can reply.'
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
// The recorded turn text for the skip-name choice (kind: 'choice') — past
// tense/statement, not the button's own imperative label (SKIP_NAME_LABEL
// above), since this renders as a transcript entry describing what the
// visitor decided, not as an action to take. See PLAN-CONTACT-CHAT-HISTORY-
// REFINEMENT.md Stage 2 (F10a) — without this, "Stay anonymous" recorded
// nothing, so NAME_QUESTION was left looking unanswered.
const NAME_SKIPPED_LABEL = 'Staying anonymous'
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
  // size/primary color. 'error' is a step-validation failure (e.g. an
  // invalid email at the reply-route step) — appended at most ONCE per
  // failing step (see ensureReplyRouteErrorTurn): a repeated wrong
  // submission never stacks a second copy, it instead replays the existing
  // turn's own letter-by-letter SplitTextReveal via replyRouteErrorReplayNonce
  // (GuidedIntake's own state) to catch the visitor's attention again
  // without polluting the transcript (PLAN-CONTACT-CHAT-HISTORY-
  // REFINEMENT.md's own F10c principle: one accurate trace per event, not
  // one per attempt). Absent for every ordinary turn.
  variant?: 'status' | 'recap' | 'error'
  // 'recap' turns only — the identity question, rendered as its own
  // paragraph below the recap body at the same size/color as the body.
  // Kept structurally separate from `text` rather than concatenated, so
  // rendering never needs to parse it back out of the recap's own
  // (AI-generated, arbitrarily-shaped) content. Absent for a correction's
  // updated recap (isUpdate) — matches today's conditional.
  recapQuestion?: string
  // Visitor-answer turns only. A stable slot id an edit can locate and
  // rewrite in place (upsertAnswerTurn) — the same role `variant: 'recap'` +
  // lastIndexOf already plays for the note (showRecapReady/submitNoteEdit).
  // Without this, nothing distinguishes "the email answer" from any other
  // visitor turn, so a re-submitted identity step can only ever append a
  // second copy instead of amending the first (PLAN-CONTACT-CHAT-HISTORY-
  // REFINEMENT.md Stage 1/2). Absent for every non-editable-answer turn.
  field?: 'reply-route' | 'name'
  // Agent prompts carry the same stable slot, so edits never identify an
  // exchange by mutable display copy.
  questionField?: 'reply-route' | 'name'
  // Marks a turn that records a visitor *decision* (e.g. "Staying
  // anonymous" from skipping the name step) rather than typed prose — lets
  // rendering style a choice distinctly from an answer the visitor actually
  // wrote, and lets a screen reader announce it as a choice. Absent for
  // every ordinary typed turn.
  kind?: 'choice'
}
type Step = 'message' | 'followup' | 'reply-route' | 'name' | 'note-edit' | 'degraded-addendum'
type Phase = 'writing' | 'pending' | 'confirm' | 'done' | 'failed'

// ── Conversation persistence and resume (see
// PLAN-CONTACT-CONVERSATION-PERSISTENCE.md for the full design rationale —
// user-research/privacy literature, the "contract validity" load gates, and
// why this is a visible/reversible resume, not a silent one) ──────────────
const CONVERSATION_STORAGE_KEY = 'contact:conversation-resume'
// Bumped whenever the snapshot's own shape changes — validateConversationSnapshot
// rejects (and readConversationSnapshot discards) anything from a different
// version outright, never attempting a partial/best-effort migration. At 2
// for degradedStage below (added to let the resume-time retry — see the
// mount-restore effect further down — retake whichever AI stage originally
// failed, not just recap).
const CONVERSATION_SNAPSHOT_VERSION = 2
const RESTORABLE_STEPS: readonly Step[] = [
  'message', 'followup', 'reply-route', 'name', 'note-edit', 'degraded-addendum',
]

type PersistedConversationSnapshot = {
  version: number
  savedAt: number
  turns: ChatTurn[]
  step: Step
  phase: Phase
  inputValue: string
  visitorAnswers: string[]
  modelTranscript: string[]
  followUpCount: number
  followUpToken: string | undefined
  recap: string
  replyRoute: string
  name: string
  recapIsRaw: boolean
  degraded: boolean
  degradedStage: 'gap-check' | 'recap'
  submissionId: string | undefined
  deliveryError: string
  deliveryRetriesExhausted: boolean
}

// 'pending' never survives a reload — no in-flight gap-check/recap/delivery
// request does — so it coerces back to 'writing' rather than being
// discarded outright. 'done' must never resurrect (already delivered);
// anything else unrecognized is treated the same way. See
// PLAN-CONTACT-CONVERSATION-PERSISTENCE.md §4.2, gate 3.
const coercePersistedPhase = (phase: unknown): Phase | null => {
  if (phase === 'writing' || phase === 'confirm' || phase === 'failed') return phase
  if (phase === 'pending') return 'writing'
  return null
}

const isStringArray = (value: unknown): value is string[] => (
  Array.isArray(value) && value.every(item => typeof item === 'string')
)

const isValidChatTurn = (value: unknown): value is ChatTurn => {
  if (typeof value !== 'object' || value === null) return false
  const turn = value as Record<string, unknown>
  if (turn.role !== 'agent' && turn.role !== 'visitor') return false
  if (typeof turn.text !== 'string') return false
  if (
    turn.variant !== undefined
    && turn.variant !== 'status' && turn.variant !== 'recap' && turn.variant !== 'error'
  ) return false
  if (turn.recapQuestion !== undefined && typeof turn.recapQuestion !== 'string') return false
  if (turn.field !== undefined && turn.field !== 'reply-route' && turn.field !== 'name') return false
  if (turn.questionField !== undefined && turn.questionField !== 'reply-route' && turn.questionField !== 'name') return false
  if (turn.kind !== undefined && turn.kind !== 'choice') return false
  return true
}

/** The "contract is still valid" load-time gate — every check must pass or
 * the whole snapshot is discarded outright, never half-restored (Postel's
 * robustness principle, applied to a malformed/stale/version-mismatched
 * snapshot the same way any other untrusted input would be). Exported for
 * its own unit test, matching this file's existing precedent for pure logic
 * (computeMessageFadeOpacity, resolveStarterModeOnInput, cycleStarterIndex).
 * followUpToken itself is opaque and server-issued — there is no client-side
 * way to verify it against the current server contract; a genuinely stale
 * token is instead caught for free by the existing gap-check failure path
 * (postIntake's `if (!result.ok) return enterDegraded()`), so this only
 * checks its *shape* (string | undefined), not its validity. */
export function validateConversationSnapshot(
  raw: unknown,
  ttlMs: number,
  now: number,
): PersistedConversationSnapshot | null {
  if (typeof raw !== 'object' || raw === null) return null
  const candidate = raw as Record<string, unknown>
  if (candidate.version !== CONVERSATION_SNAPSHOT_VERSION) return null
  if (typeof candidate.savedAt !== 'number' || now - candidate.savedAt > ttlMs) return null
  const phase = coercePersistedPhase(candidate.phase)
  if (!phase) return null
  if (typeof candidate.step !== 'string' || !RESTORABLE_STEPS.includes(candidate.step as Step)) return null
  if (!Array.isArray(candidate.turns) || !candidate.turns.every(isValidChatTurn)) return null
  if (typeof candidate.inputValue !== 'string') return null
  if (!isStringArray(candidate.visitorAnswers) || !isStringArray(candidate.modelTranscript)) return null
  if (typeof candidate.followUpCount !== 'number') return null
  if (candidate.followUpToken !== undefined && typeof candidate.followUpToken !== 'string') return null
  if (typeof candidate.recap !== 'string') return null
  if (typeof candidate.replyRoute !== 'string') return null
  if (typeof candidate.name !== 'string') return null
  if (typeof candidate.recapIsRaw !== 'boolean' || typeof candidate.degraded !== 'boolean') return null
  if (candidate.degradedStage !== 'gap-check' && candidate.degradedStage !== 'recap') return null
  if (candidate.submissionId !== undefined && typeof candidate.submissionId !== 'string') return null
  if (typeof candidate.deliveryError !== 'string') return null
  if (typeof candidate.deliveryRetriesExhausted !== 'boolean') return null
  return {
    version: CONVERSATION_SNAPSHOT_VERSION,
    savedAt: candidate.savedAt,
    turns: candidate.turns as ChatTurn[],
    step: candidate.step as Step,
    phase,
    inputValue: candidate.inputValue,
    visitorAnswers: candidate.visitorAnswers as string[],
    modelTranscript: candidate.modelTranscript as string[],
    followUpCount: candidate.followUpCount,
    followUpToken: candidate.followUpToken as string | undefined,
    recap: candidate.recap,
    replyRoute: candidate.replyRoute,
    name: candidate.name,
    recapIsRaw: candidate.recapIsRaw,
    degraded: candidate.degraded,
    degradedStage: candidate.degradedStage,
    submissionId: candidate.submissionId as string | undefined,
    deliveryError: candidate.deliveryError,
    deliveryRetriesExhausted: candidate.deliveryRetriesExhausted,
  }
}

/** SSR-safe (returns null server-side, same as an empty/absent snapshot) and
 * defensive against storage throwing (Safari private browsing, quota, or
 * storage disabled outright) — persistence is a nicety layered on top of the
 * real conversation, never allowed to break the page if it's unavailable. */
function readConversationSnapshot(ttlMs: number): PersistedConversationSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CONVERSATION_STORAGE_KEY)
    if (!raw) return null
    return validateConversationSnapshot(JSON.parse(raw), ttlMs, Date.now())
  } catch {
    return null
  }
}

function writeConversationSnapshot(
  snapshot: Omit<PersistedConversationSnapshot, 'version' | 'savedAt'>,
): void {
  if (typeof window === 'undefined') return
  try {
    const payload: PersistedConversationSnapshot = {
      ...snapshot,
      version: CONVERSATION_SNAPSHOT_VERSION,
      savedAt: Date.now(),
    }
    window.localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Same non-fatal handling as readConversationSnapshot.
  }
}

function clearConversationSnapshot(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CONVERSATION_STORAGE_KEY)
  } catch {
    // Same non-fatal handling as readConversationSnapshot.
  }
}

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

/** Message-spacing grouping rule (operator ask, 2026-09-22 — Gestalt law of
 * proximity + Sweller's cognitive load/chunking: a flat, uniform gap between
 * every turn regardless of relationship forces the visitor to individually
 * track N separate items instead of chunking the conversation into a
 * handful of resolved question→answer exchanges). True only for the one
 * relationship tight enough to read as a single chunk — an agent question
 * immediately followed by the visitor's own answer to it. Every other
 * adjacent pair (a completed exchange giving way to a new agent question,
 * two consecutive agent turns, etc.) keeps the page's normal, looser
 * between-exchange gap (messageGapPx) — only this one case switches to the
 * tighter messageExchangeGapClass. Exported for its own unit test, matching
 * this file's existing precedent for pure logic. */
export const isTightExchangeGap = (
  previousRole: ChatTurn['role'] | undefined,
  currentRole: ChatTurn['role'],
): boolean => previousRole === 'agent' && currentRole === 'visitor'

export type UpsertAnswerTurnOutcome = 'inserted' | 'updated' | 'unchanged'

/** Pure core of GuidedIntake's own upsertAnswerTurn — extracted for its own
 * unit test, matching this file's existing precedent for pure logic
 * (computeMessageFadeOpacity, resolveStarterModeOnInput, cycleStarterIndex,
 * validateConversationSnapshot). See PLAN-CONTACT-CHAT-HISTORY-REFINEMENT.md
 * Stage 2 (F10b/F10c): locates the visitor answer turn for this field (via
 * the stable `field` slot id — see ChatTurn's own doc comment) and either
 * appends a new one, rewrites it in place, or leaves the list untouched —
 * never a second append for the same field. An edit is a mutation of one
 * prior record, not a new one; a same-value re-submission is a history
 * no-op. */
export const upsertAnswerTurnInList = (
  turns: ChatTurn[],
  field: NonNullable<ChatTurn['field']>,
  text: string,
  kind?: ChatTurn['kind'],
): { turns: ChatTurn[]; outcome: UpsertAnswerTurnOutcome } => {
  const existingIndex = turns.map(turn => turn.field).lastIndexOf(field)
  if (existingIndex === -1) {
    return {
      turns: [...turns, { role: 'visitor', field, text, ...(kind ? { kind } : {}) }],
      outcome: 'inserted',
    }
  }
  const existing = turns[existingIndex]
  if (existing.text === text && existing.kind === kind) return { turns, outcome: 'unchanged' }
  // Moves the whole exchange — its question turn through its answer,
  // inclusive, carrying along any interleaved error turn from a prior
  // failed attempt — to the end, rather than rewriting the answer at its
  // original index. A same-index rewrite left a re-edited field anchored at
  // its ORIGINAL position: correct the first time the flow runs start to
  // finish, but wrong the moment an edit happens out of that original order
  // (operator-reported 2026-09-22: editing the note, then the reply info,
  // rendered the reply info's *update* above the note's — the note's own
  // edit rewrote in place, still anchored before it, while this already
  // moved reply-route/name to the end; upsertRecapTurnInList below now
  // applies this exact same move-to-end contract to the note too, so
  // every editable field resolves "where does an edit land" the same way).
  const questionIndex = turns.findIndex(turn => turn.role === 'agent' && turn.questionField === field)
  const blockStart = questionIndex !== -1 && questionIndex < existingIndex ? questionIndex : existingIndex
  const updatedBlock = turns
    .slice(blockStart, existingIndex + 1)
    .map(turn => (turn === existing ? { ...existing, text, kind } : turn))
  return {
    turns: [...turns.slice(0, blockStart), ...turns.slice(existingIndex + 1), ...updatedBlock],
    outcome: 'updated',
  }
}

/** Pure core of GuidedIntake's own upsertRecapTurn — same extraction
 * precedent as upsertAnswerTurnInList above. Rewrites the existing recap
 * turn (variant 'recap') rather than appending a second "Here's the
 * [updated] note..." block underneath the first — the note is still the
 * *same* task (presenting the note for confirmation) across an edit, just
 * with a changed value (operator-reported 2026-09-22: back-to-back note
 * edits stacked duplicate blocks). Moves it to the end rather than
 * rewriting at its own existing index — same "reflect real edit
 * chronology" contract upsertAnswerTurnInList already applies to
 * reply-route/name (operator-reported 2026-09-22: a note edited, then
 * followed by a reply-info edit, stayed anchored above the reply-info's
 * own moved-to-end update — an in-place rewrite kept the note looking
 * older than an edit made after it). Unlike upsertAnswerTurnInList, there
 * is only ever the one recap turn to find (never duplicated, never
 * interleaved with another turn's own question/answer pair), so the move
 * is just "take it out, put the updated copy at the end" — no paired
 * question to carry along. */
export const upsertRecapTurnInList = (
  turns: ChatTurn[],
  text: string,
  isUpdate: boolean,
  introOverride?: string,
): { turns: ChatTurn[]; outcome: UpsertAnswerTurnOutcome } => {
  const introText = introOverride ?? (isUpdate ? RECAP_UPDATE_INTRO : RECAP_INTRO)
  const nextText = `${introText}\n\n${text}`
  const recapIndex = turns.map(turn => turn.variant).lastIndexOf('recap')
  if (recapIndex === -1) {
    return {
      turns: [...turns, { role: 'agent', variant: 'recap', text: nextText, recapQuestion: undefined }],
      outcome: 'inserted',
    }
  }
  const existing = turns[recapIndex]
  if (existing.text === nextText) return { turns, outcome: 'unchanged' }
  return {
    turns: [
      ...turns.slice(0, recapIndex),
      ...turns.slice(recapIndex + 1),
      { ...existing, text: nextText },
    ],
    outcome: 'updated',
  }
}

/** Same "one accurate trace, never a stacked duplicate" contract as
 * upsertAnswerTurnInList above, applied to a step-validation error (e.g. an
 * invalid email at the reply-route step) rather than a visitor answer. A
 * repeated wrong submission must never append a second identical error
 * turn (confirmed live, 2026-09-22, operator-reported: submitting an
 * invalid email 4 times stacked 4 copies of the same message) — this
 * appends the error turn once, then leaves the list untouched on every
 * later failure. Re-catching the visitor's attention on a *repeat* failure
 * is instead the caller's job (GuidedIntake bumps replyRouteErrorReplayNonce
 * to replay the existing turn's own SplitTextReveal — see ChatTurn's own
 * `variant: 'error'` doc comment), which is exactly why this returns
 * whether it actually inserted rather than mutating unconditionally: the
 * caller still needs to know to trigger that replay either way. */
export const ensureErrorTurnInList = (
  turns: ChatTurn[],
  text: string,
): { turns: ChatTurn[]; inserted: boolean } => {
  if (turns.some(turn => turn.variant === 'error' && turn.text === text)) {
    return { turns, inserted: false }
  }
  return { turns: [...turns, { role: 'agent', variant: 'error', text }], inserted: true }
}

/** Reverses a CSS cubic-bezier easing string for a "play the return trip
 * backwards" pair (PLAN-CONTACT-CHAT-HISTORY-REFINEMENT.md's own mobile
 * history-fade-on-edit: fade out with one easing, fade back in with its
 * exact mirror, both at the same duration — see GuidedIntake's own
 * isMessageEditActive). Standard bezier-reversal identity: given control
 * points (x1,y1),(x2,y2) — endpoints are implicitly (0,0) and (1,1), never
 * part of the string — the time-reversed curve's control points are
 * (1-x2,1-y2),(1-x1,1-y1) (mirror the curve 180° through its own center).
 * 'linear' (and anything that isn't a 4-argument cubic-bezier(...) string,
 * e.g. a bare CSS keyword) passes through unchanged — linear is its own
 * reverse, and every other CTA_BUTTON_MOTION_EASINGS token IS always a
 * cubic-bezier string, so this never silently no-ops a real easing by
 * accident. Exported for its own unit test, matching this file's existing
 * precedent for pure logic. */
export const reverseCubicBezierEasing = (easingCss: string): string => {
  const match = easingCss.match(
    /^cubic-bezier\(\s*([\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*([\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/,
  )
  if (!match) return easingCss
  const [x1, y1, x2, y2] = [match[1], match[2], match[3], match[4]].map(Number)
  return `cubic-bezier(${1 - x2}, ${1 - y2}, ${1 - x1}, ${1 - y1})`
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

/**
 * How many px of the layout viewport's bottom edge are currently hidden by
 * the on-screen keyboard (0 when it's closed / on desktop). Computed from
 * `window.visualViewport`, the only browser API that reflects the software
 * keyboard: overlap = innerHeight − (visualViewport.height +
 * visualViewport.offsetTop). Starts at 0 (SSR-safe — matches the server
 * HTML's keyboard-less layout on first paint, then patches on the client).
 *
 * Why this exists / the regression it fixes: the contact column fills the
 * space below the header so the composer sits at its bottom edge. `100dvh`
 * (the JS-free approach from PLAN-CONTACT-VIEWPORT-SIMPLIFICATION.md) tracks
 * only the browser's OWN expanding/collapsing chrome, NOT the keyboard — on
 * iOS Safari/Chrome `dvh`/`vh` resolve against the *layout* viewport, which
 * does not shrink when the keyboard opens, so a `100dvh` column keeps full
 * height and its bottom-anchored composer is pushed behind the keyboard
 * (real-device evidence: composer invisible while typing).
 *
 * The column height itself stays `calc(100dvh - header)`: it must remain
 * FULL height so it fills — and therefore top-anchors within — the shared
 * PolymorphicLayout narrow-column slot, which vertically CENTERS its content
 * (`items-center`). Sizing the column *down* to the visual viewport instead
 * would leave a shorter box floating in the middle of that still-tall slot,
 * dropping the composer partly back behind the keyboard. So keyboard
 * avoidance is done with bottom padding equal to this inset, lifting the
 * composer above the keyboard while the column stays full-height and the
 * centering never floats it. This deliberately does NOT reintroduce the old
 * `position: fixed` + `visualViewport.offsetTop` sync the simplification
 * removed (whose fragility was a scroll-into-view timing race): padding a
 * normal-flow column never fights the OS, because the content already fits.
 */
function useKeyboardInsetPx(): number {
  const [insetPx, setInsetPx] = useState(0)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const vv = window.visualViewport
    const measure = () => {
      if (!vv) { setInsetPx(0); return }
      setInsetPx(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    }
    measure()
    // visualViewport resize/scroll cover the keyboard open/close and any
    // pinch-zoom pan; the plain window resize covers rotation.
    vv?.addEventListener('resize', measure)
    vv?.addEventListener('scroll', measure)
    window.addEventListener('resize', measure)
    return () => {
      vv?.removeEventListener('resize', measure)
      vv?.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [])
  return insetPx
}

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

/** The visible, reversible resume affordance — see
 * PLAN-CONTACT-CONVERSATION-PERSISTENCE.md §4.3. Rendered via a portal to
 * `document.body` (not inline in GuidedIntake's own DOM position): the
 * page's own hero-optical-offset ancestor applies a CSS transform at the
 * `lg:` breakpoint (pages/contact.tsx's own `lg:translate-y-[var(--contact-
 * optical-y)]`), which would otherwise become this element's containing
 * block for `position: fixed` and constrain it to that ancestor's box
 * instead of the true viewport — the same technique LayoutDebug.tsx already
 * uses for its own always-viewport-relative overlay. Never dismissed by
 * unmounting: `visible` only toggles opacity/pointer-events, so the fade
 * transition below is a real transition, not an instant pop. */
function ConversationResumeNotice({
  config, ctaButtonConfig, visible, onStartFresh,
}: {
  config: ContactExperienceConfig
  ctaButtonConfig: CtaButtonConfig
  visible: boolean
  onStartFresh: () => void
}) {
  // Same shared shadow engine every other elevated surface on this page uses
  // (useCardLiftPhysics), never a hand-rolled box-shadow — follows
  // composerElevationPx's own established pattern (ComposerPill.tsx's own
  // pillPhysicsConfig) exactly: pinned, not reacting to hover/press, since
  // this notice isn't itself the primary interactive surface.
  const physicsConfig = useMemo(
    () => ({
      ...ctaButtonConfig,
      elevationReactionEnabled: false,
      shadowElevationRestingPx: config.resumeNoticeElevationPx,
    }),
    [ctaButtonConfig, config.resumeNoticeElevationPx],
  )
  const { ref: liftPhysicsRef } = useCardLiftPhysics<HTMLDivElement>({
    config: physicsConfig,
    shadowEnabled: config.resumeNoticeShadowEnabled,
  })

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={liftPhysicsRef}
      role="status"
      className={`fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit items-center gap-2 whitespace-nowrap rounded-full font-sans transition-opacity ${config.resumeNoticeFontSize} ${config.resumeNoticePaddingX} ${config.resumeNoticePaddingY} ${visible ? '' : 'pointer-events-none'}`}
      style={{
        // Re-supplies --site-font-sans locally so the `font-sans` class
        // above (Tailwind's real token, resolving `font-family: var(--site-
        // font-sans)`) actually works here: this node is portaled straight
        // to document.body, outside _app.tsx's own wrapper div that's the
        // only place that custom property is normally defined — see
        // siteSans's own doc comment.
        '--site-font-sans': siteSans.style.fontFamily,
        backgroundColor: config.resumeNoticeFillMode === 'transparent' ? 'transparent' : config.resumeNoticeBackgroundColor,
        borderWidth: `${config.resumeNoticeBorderWidthPx}px`,
        borderStyle: 'solid',
        borderColor: config.resumeNoticeBorderWidthPx > 0 ? config.resumeNoticeBorderColor : 'transparent',
        opacity: visible ? 1 : 0,
        transitionDuration: `${config.resumeNoticeDismissDurationMs}ms`,
        transitionTimingFunction: CTA_BUTTON_MOTION_EASINGS[config.resumeNoticeDismissEasing],
      } as CSSProperties}
    >
      <span
        className="text-[color:var(--contact-primary)]"
        style={{ opacity: config.resumeNoticeTextOpacity }}
      >
        Picked up where you left off.
      </span>
      <button
        type="button"
        onClick={onStartFresh}
        tabIndex={visible ? 0 : -1}
        // inline-flex items-center self-stretch: without an explicit
        // display, a bare <button> full of nothing but text has a hit box
        // exactly the size of its own line-height — noticeably smaller than
        // the pill's own (padding-driven) height it visually sits inside,
        // so a pointer moving within the perceived click target kept
        // leaving the real one and landing on the plain sibling <span>/
        // container instead, flickering between pointer and text-select
        // cursors (operator-reported, 2026-09-22). self-stretch fills the
        // row's already-computed height (driven by resumeNoticePaddingY)
        // without growing the pill itself; px-1 -mx-1 adds real horizontal
        // slack the same way, visually cancelled by the matching negative
        // margin so the text doesn't shift.
        className={`inline-flex -mx-1 items-center self-stretch bg-transparent px-1 text-[color:var(--resume-link-text)] no-underline transition-colors hover:text-[color:var(--resume-link-hover-text)] active:text-[color:var(--resume-link-hover-text)] focus-visible:rounded-sm focus-visible:text-[color:var(--resume-link-hover-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--contact-border-focus)] ${config.resumeNoticeLinkFontWeight}`}
        style={{
          opacity: config.resumeNoticeLinkOpacity,
          '--resume-link-text': config.resumeNoticeLinkColor,
          '--resume-link-hover-text': config.resumeNoticeLinkHoverActiveColor,
        } as CSSProperties}
      >
        Start fresh?
      </button>
    </div>,
    document.body,
  )
}

function GuidedIntake({
  config, ctaButtonConfig, surfaceColor, devModeConfig, content,
}: {
  config: ContactExperienceConfig
  ctaButtonConfig: CtaButtonConfig
  surfaceColor: string
  devModeConfig: ContactDevModeConfig
  content: ContactPageContent['conversation']
}) {
  // Page copy arrives as static build data, rather than as module-owned UI
  // strings. Environment settings may only refine the optional reply window.
  const agentName = process.env.NEXT_PUBLIC_AGENT_NAME || content.agentName
  const ENTRY_MESSAGE = formatContentTemplate(content.entryMessage, { agentName })
  const DEGRADED_ENTRY_MESSAGE = content.degradedEntryMessage
  const RECAP_INTRO = content.recapIntro
  const RECAP_UPDATE_INTRO = content.recapUpdateIntro
  const REPLY_ROUTE_QUESTION = content.replyRouteQuestion
  const REPLY_ROUTE_ERROR_MESSAGE = content.replyRouteErrorMessage
  const NAME_QUESTION = content.nameQuestion
  const CLOSE_MESSAGE = REPLY_WINDOW_TEXT
    ? formatContentTemplate(content.closeMessageWithReplyWindow, { replyWindow: REPLY_WINDOW_TEXT })
    : content.closeMessage
  const ENTRY_PLACEHOLDER = content.entryPlaceholder
  const REPLY_ROUTE_PLACEHOLDER = content.replyRoutePlaceholder
  const NAME_PLACEHOLDER = content.namePlaceholder
  const NAME_PLACEHOLDER_NARROW = content.namePlaceholderNarrow
  const SKIP_NAME_LABEL_NARROW = content.skipNameLabelNarrow
  const SKIP_NAME_LABEL = content.skipNameLabel
  const NAME_SKIPPED_LABEL = content.nameSkippedLabel
  const NOTE_EDIT_PLACEHOLDER = content.noteEditPlaceholder
  const DEGRADED_ADDENDUM_PLACEHOLDER = content.degradedAddendumPlaceholder
  const CONFIRM_CORRECT_LABEL = content.confirmCorrectLabel
  const CONFIRM_ACCEPT_LABEL = content.confirmAcceptLabel
  const DEGRADED_CONFIRM_CORRECT_LABEL = content.degradedConfirmCorrectLabel
  const DEGRADED_CONFIRM_ACCEPT_LABEL = content.degradedConfirmAcceptLabel
  const EDIT_IDENTITY_LINK_LABEL = content.editIdentityLinkLabel
  const SEND_AS_IS_LABEL = content.sendAsIsLabel
  const CONTINUE_AS_WRITTEN_LABEL = content.continueAsWrittenLabel
  const DELIVERY_GIVE_UP_MESSAGE = content.deliveryGiveUpMessage
  const STARTER_STEMS = content.starterStems
  const deliveryRetryMessage = (retryDelaySeconds: number) => formatContentTemplate(
    content.deliveryRetryMessage,
    { retryDelaySeconds },
  )
  // The "contract is still valid" load-time gates (schema version, TTL,
  // phase coercion, structural shape) all live inside
  // validateConversationSnapshot — see its own doc comment and
  // PLAN-CONTACT-CONVERSATION-PERSISTENCE.md §4.2. Deliberately NOT read
  // inside a lazy useState initializer the way initialCarriedDraft below
  // is — that precedent is hydration-safe only because the module-scope
  // singleton it reads is inherently null on every fresh page load
  // (server and client alike), so the two can never disagree. localStorage
  // has no such guarantee: on a genuine reload the server always renders
  // the empty/default state (no window there), while a synchronous client
  // read here would see real stored content on that very first client
  // render — a real, reproducible hydration mismatch (confirmed live,
  // 2026-09-22: React's hydration failed and fell back to a full
  // client-render, the same fallback that made the very first reload
  // attempt during this feature's own implementation silently NOT show the
  // restored conversation). Every piece of state/ref below instead starts
  // at its ordinary pre-persistence default (byte-for-byte what SSR
  // renders) and is only ever restored inside the mount-only effect further
  // down, strictly after hydration has already completed.
  //
  // The greeting is not turns[0] — it's ContactHeroGreeting, driven by
  // heroPhase below, not the scrolling conversation feed (see
  // useComposerHeroPhase's own doc comment for why: it has its own reveal
  // technique, its own one-time exit, and a fixed position above the
  // composer, none of which fit a ChatTurn). turns starts empty; the first
  // real entry is the visitor's own first message.
  const [turns, setTurns] = useState<ChatTurn[]>(() => [])
  const [step, setStep] = useState<Step>('message')
  const [phase, setPhase] = useState<Phase>('writing')
  // Bumped on every failed reply-route (email) submission — never on the
  // first. ensureErrorTurnInList only ever appends the shared error turn
  // ONCE (a repeated wrong value must not stack duplicate copies, operator-
  // reported 2026-09-22); this counter is what re-triggers that turn's own
  // letter-by-letter SplitTextReveal on every subsequent failure, via its
  // `key` below, so a visitor who keeps entering something invalid keeps
  // getting the attention-catching replay without the transcript growing.
  const [replyRouteErrorReplayNonce, setReplyRouteErrorReplayNonce] = useState(0)
  // True only while an in-place edit (note or reply-route, entered from the
  // confirm screen's "Edit note"/"Edit reply details") is actively being
  // typed — set by handleRequestCorrection/handleRequestIdentityEdit below,
  // cleared the moment that edit's own submit handler succeeds. Drives the
  // mobile-only history fade-out/back-in (see the turns-feed's own style
  // below) — desktop never hides the history during an edit, only narrow
  // viewports where the on-screen keyboard and the edit field already
  // dominate the available space.
  const [isMessageEditActive, setIsMessageEditActive] = useState(false)
  const { tier: breakpointTier } = useBreakpointTier()
  const isMobileTier = breakpointTier === 'mobile'
  // Non-destructive peek (see helpers/pendingComposerDraft.ts's own doc
  // comment on why this must stay non-destructive inside a lazy useState
  // initializer, which React/StrictMode can invoke more than once without
  // committing) — a carried draft from abstract.tsx's own composer, if one
  // exists, seeds the composer already populated rather than empty. Actually
  // clearing the store happens in a mount effect below, exactly once. Safe
  // inside a lazy initializer (unlike the resumed-conversation read above)
  // per this block's own opening comment.
  const [initialCarriedDraft] = useState(() => peekPendingComposerDraft())
  const hadCarriedDraft = initialCarriedDraft !== null
  // Flips true (permanently, for this mounted instance — see the mount
  // effect below) only once a resumed snapshot has actually been restored.
  // Starts false so the very first client render matches SSR exactly (no
  // notice, no restored content) — the restore, if any, always happens one
  // effect-tick after hydration, a deliberate one-frame-or-so "upgrade"
  // rather than risking a second hydration mismatch.
  const [hasResumedConversation, setHasResumedConversation] = useState(false)
  const [resumeNoticeVisible, setResumeNoticeVisible] = useState(false)
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
  // after any change here. Each starts at its ordinary pre-persistence
  // default; a resumed conversation's own values (if any) are only ever
  // applied inside the mount-only restore effect further down (see the
  // hydration-safety comment above turns/step/phase for why these can't be
  // seeded synchronously here the way refs safely could be in isolation —
  // kept consistent with the state above rather than half-hydration-safe).
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
  // Which AI stage was actually in flight when enterDegraded fired — the
  // resume-time retry (mount-restore effect further down) needs this to
  // retake the *same* stage that originally failed, not always jump
  // straight to recap: a gap-check failure means the visitor never got the
  // chance at a clarifying follow-up question at all, which retrying
  // recap alone could never restore. Meaningless while degradedRef is
  // false; default value here is never read in that case.
  const degradedStageRef = useRef<'gap-check' | 'recap'>('recap')
  const abortRef = useRef<AbortController | null>(null)

  // Delivery is the only browser-controlled retry sequence. AI inference is
  // retried inside the function so one interaction cannot multiply calls
  // across the browser and server.
  const pendingRetryTimeoutRef = useRef<number | null>(null)
  // Never restored from a snapshot: an in-flight auto-retry sequence and its
  // scheduled timer don't survive a reload either way (pendingRetryTimeoutRef
  // above starts fresh too), so a restored 'failed' phase always presents as
  // a clean failure the visitor can retry manually via "Try sending again",
  // never as if a retry were already silently in flight.
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

  const { heroPhase, triggerExit, settleImmediately } = useComposerHeroPhase(config, dockRef)
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

  // Restores a previously paused conversation, strictly after hydration —
  // see the hydration-safety comment above turns/step/phase's own
  // declarations for why this can't happen synchronously at render time the
  // way initialCarriedDraft's own lazy-state peek does. Runs once, on
  // mount. A carried draft (a deliberate, more recent cross-page handoff)
  // takes full precedence over an old resumed conversation outright — not
  // just for the composer's own text — since mixing "brand-new text meant
  // for a fresh message" with "an old conversation's own step/phase" would
  // produce an incoherent hybrid state (e.g. a freshly carried draft
  // sitting in a composer whose step/turns still belong to an old,
  // already-progressed conversation). Gated on there actually being
  // something worth resuming (a snapshot with no turns and no typed draft
  // would show "picked up where you left off" for literally nothing).
  useEffect(() => {
    if (hadCarriedDraft) return
    if (!config.conversationPersistenceEnabled) return
    const snapshot = readConversationSnapshot(config.conversationPersistenceTtlMs)
    if (!snapshot) return
    const hasContent = snapshot.turns.length > 0 || snapshot.inputValue.trim() !== ''
    if (!hasContent) return
    setTurns(snapshot.turns)
    setStep(snapshot.step)
    setPhase(snapshot.phase)
    setInputValue(snapshot.inputValue)
    setDeliveryError(snapshot.deliveryError)
    setDeliveryRetriesExhausted(snapshot.deliveryRetriesExhausted)
    visitorAnswersRef.current = snapshot.visitorAnswers
    modelTranscriptRef.current = snapshot.modelTranscript
    followUpCountRef.current = snapshot.followUpCount
    followUpTokenRef.current = snapshot.followUpToken
    recapRef.current = snapshot.recap
    replyRouteRef.current = snapshot.replyRoute
    nameRef.current = snapshot.name
    recapIsRawRef.current = snapshot.recapIsRaw
    degradedRef.current = snapshot.degraded
    degradedStageRef.current = snapshot.degradedStage
    submissionIdRef.current = snapshot.submissionId
    // A resumed conversation that fell back to raw/degraded mode
    // (enterDegraded) used to stay that way for the rest of its life,
    // even across a refresh — degraded was persisted and restored above
    // exactly as the API left it, with no path back except "Start fresh"
    // (a full, destructive reset of everything typed so far). A refresh is
    // itself a plausible reason to give the API a genuine second chance
    // (operator-reported: "the end user refreshes and tries again" but the
    // fallback message just stays put even once the API is stable again),
    // matching this file's own precedent elsewhere of retrying a failure
    // rather than treating one bad response as permanent (delivery's own
    // auto-retry).
    //
    // Retakes whichever stage actually failed (degradedStage), not always
    // recap — a gap-check failure never even reached recap, so retrying
    // recap alone would silently, permanently forfeit the chance at a
    // clarifying follow-up question the AI would otherwise have asked
    // (operator-reported: "so the overall experience remains agentic as
    // much as possible"). But a retaken gap-check is only ever applied
    // silently when its outcome is safe to fold in without disturbing
    // anything the visitor already resumed into: needsFollowUp / a meta-
    // message redirect would mean moving them backward to an earlier step
    // (or resetting the whole flow) out from under whatever they're
    // already doing at 'reply-route' — that's a real regression, not a
    // recovery, so both cases fall through to staying degraded exactly as
    // before, silently. Only a clean "no follow-up needed" gap-check
    // outcome chains into the same recap retry recap-stage failures already
    // used, and only that combined outcome — a real, complete recap — ever
    // gets applied. If anything in the chain fails, nothing changes: no
    // repeated error turn, no partial application, no visible difference
    // from today. Applying the final recap swap is guarded on the degraded
    // message still being present at apply time (not just at retry time)
    // so a visitor who already moved on via "Add more"/delivery in the
    // meantime can't have their transcript rewritten out from under them.
    if (snapshot.degraded) {
      const applyRecoveredRecap = (recap: string) => {
        let applied = false
        setTurns((prev) => {
          const hasDegradedMessage = prev.some(turn => (
            turn.role === 'agent' && turn.variant === undefined && turn.text === DEGRADED_ENTRY_MESSAGE
          ))
          if (!hasDegradedMessage) return prev
          applied = true
          const withoutDegradedMessage = prev.filter(turn => !(
            turn.role === 'agent' && turn.variant === undefined && turn.text === DEGRADED_ENTRY_MESSAGE
          ))
          return upsertRecapTurnInList(withoutDegradedMessage, recap, false, RECAP_INTRO).turns
        })
        if (applied) {
          recapRef.current = recap
          recapIsRawRef.current = false
          degradedRef.current = false
        }
      }
      const retryRecap = async () => {
        const result = await postIntake({
          stage: 'recap',
          transcript: snapshot.visitorAnswers.map(text => `Visitor: ${text}`).join('\n'),
        })
        if (!result.ok || typeof result.recap !== 'string') return
        applyRecoveredRecap(result.recap)
      }
      void (async () => {
        try {
          if (snapshot.degradedStage === 'recap') {
            await retryRecap()
            return
          }
          const gapCheckResult = await postIntake({
            stage: 'gap-check',
            transcript: snapshot.modelTranscript.join('\n'),
            followUpToken: snapshot.followUpToken,
          })
          if (!gapCheckResult.ok) return
          if (gapCheckResult.mode && gapCheckResult.message) return
          if (gapCheckResult.needsFollowUp) return
          await retryRecap()
        } catch {
          // Still down — stay in degraded mode exactly as already resumed.
        }
      })()
    }
    // A restored conversation with real turns was never actually 'centered'
    // in this browser session — jump the hero phase straight to 'settled'
    // (see settleImmediately's own doc comment, useComposerHeroPhase.ts) so
    // the greeting doesn't render on top of the just-restored turns/recap
    // for even one frame. A snapshot with only a typed-but-unsent draft and
    // no turns yet (still genuinely step 'message') stays centered as
    // normal — nothing to settle past yet.
    if (snapshot.turns.length > 0) settleImmediately()
    // Restores the step-appropriate placeholder the same way every existing
    // step-transition handler already does (handleRequestCorrection et al.)
    // rather than leaving whatever ENTRY_PLACEHOLDER the state above
    // started at.
    setPlaceholder(
      snapshot.step === 'note-edit' ? NOTE_EDIT_PLACEHOLDER
        : snapshot.step === 'reply-route' ? REPLY_ROUTE_PLACEHOLDER
          : snapshot.step === 'name' ? NAME_PLACEHOLDER
            : snapshot.step === 'degraded-addendum' ? DEGRADED_ADDENDUM_PLACEHOLDER
              : ENTRY_PLACEHOLDER,
    )
    setHasResumedConversation(true)
    setResumeNoticeVisible(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persists the in-progress conversation on every meaningful change, so a
  // later visit's own load-time gates (validateConversationSnapshot) have
  // something current to restore — see PLAN-CONTACT-CONVERSATION-
  // PERSISTENCE.md §4.1. Debounced (400ms of inactivity) rather than firing
  // on every keystroke, but also flushed unconditionally on
  // visibilitychange/pagehide so an abrupt close still captures the latest
  // state even if the debounce timer never got to fire — refs (visitorAnswersRef
  // etc.) aren't dependencies here (mutating a ref alone doesn't re-render),
  // but every real mutation of one of them in this component happens
  // alongside a turns/step/phase/inputValue update in the same handler, so
  // this effect's own dependency list already re-runs whenever any of them
  // meaningfully changes. Never persists a delivered ('done') conversation,
  // and never persists a genuinely empty one (no turns, no typed draft) —
  // the latter would otherwise show the resume notice for nothing on a
  // later visit.
  useEffect(() => {
    if (!config.conversationPersistenceEnabled) return undefined
    if (phase === 'done') return undefined
    const hasContent = turns.length > 0 || inputValue.trim() !== ''
    if (!hasContent) return undefined
    const buildSnapshot = () => ({
      turns,
      step,
      phase,
      inputValue,
      visitorAnswers: visitorAnswersRef.current,
      modelTranscript: modelTranscriptRef.current,
      followUpCount: followUpCountRef.current,
      followUpToken: followUpTokenRef.current,
      recap: recapRef.current,
      replyRoute: replyRouteRef.current,
      name: nameRef.current,
      recapIsRaw: recapIsRawRef.current,
      degraded: degradedRef.current,
      degradedStage: degradedStageRef.current,
      submissionId: submissionIdRef.current,
      deliveryError,
      deliveryRetriesExhausted,
    })
    const timeoutId = window.setTimeout(() => writeConversationSnapshot(buildSnapshot()), 400)
    const flush = () => writeConversationSnapshot(buildSnapshot())
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      window.clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [
    config.conversationPersistenceEnabled, turns, step, phase, inputValue,
    deliveryError, deliveryRetriesExhausted,
  ])

  // A delivered conversation must never resurrect (PLAN-CONTACT-
  // CONVERSATION-PERSISTENCE.md §4.2, gate 3) — purged the moment it's
  // actually delivered, independent of the write effect above (which itself
  // already refuses to write while phase is 'done', but an earlier write
  // from just before delivery could otherwise still be sitting in storage).
  useEffect(() => {
    if (phase === 'done') clearConversationSnapshot()
  }, [phase])

  // Optional idle fallback — see conversationResumeNoticeAutoDismissMs's own
  // doc comment (ContactExperience.config.ts). The primary, deliberate
  // dismissal trigger is dismissResumeNotice below, called from every
  // guided-intake action handler.
  useEffect(() => {
    if (!resumeNoticeVisible) return undefined
    if (config.conversationResumeNoticeAutoDismissMs <= 0) return undefined
    const timeoutId = window.setTimeout(
      () => setResumeNoticeVisible(false),
      config.conversationResumeNoticeAutoDismissMs,
    )
    return () => window.clearTimeout(timeoutId)
  }, [resumeNoticeVisible, config.conversationResumeNoticeAutoDismissMs])

  // The resume notice fades the moment the visitor takes any real action
  // with the restored conversation — read as implicit acknowledgment that
  // the resumed thread is valid and theirs to continue (see
  // PLAN-CONTACT-CONVERSATION-PERSISTENCE.md §4.3). Called from the top of
  // every guided-intake action handler (handleSend covers every composer
  // submit across every step in one place; the rest are one call each).
  // Hovering, focusing, or scrolling are deliberately NOT triggers.
  const dismissResumeNotice = () => setResumeNoticeVisible(false)

  // "Start fresh" is a separate, explicit path from dismissResumeNotice
  // above — it REJECTS the resumed conversation (full reset), not acks it.
  // Mirrors exactly what a fresh mount with no restored snapshot would have
  // initialized every piece of state/ref to.
  const handleStartFresh = () => {
    clearConversationSnapshot()
    setResumeNoticeVisible(false)
    setTurns([])
    setStep('message')
    setPhase('writing')
    setInputValue('')
    setDeliveryError('')
    setDeliveryRetriesExhausted(false)
    setPlaceholder(ENTRY_PLACEHOLDER)
    visitorAnswersRef.current = []
    modelTranscriptRef.current = []
    followUpCountRef.current = 0
    followUpTokenRef.current = undefined
    recapRef.current = ''
    replyRouteRef.current = ''
    nameRef.current = ''
    recapIsRawRef.current = false
    degradedRef.current = false
    submissionIdRef.current = undefined
    deliveryRetryCountRef.current = 0
  }

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

  // Same "next task, same as the previous one → reuse it, don't duplicate"
  // principle upsertAnswerTurnInList already applies to reply-route/name,
  // and handleSendAsIs already applied to this exact recap turn: a re-edit
  // of the note is still the *same* task (presenting the note for
  // confirmation), just with a changed value, so it rewrites the existing
  // recap turn (moving it to the end, same as upsertAnswerTurnInList
  // already does — see upsertRecapTurnInList's own doc comment) rather
  // than appending a second "Here's the [updated] note..." block
  // underneath the first (operator-reported 2026-09-22: back-to-back note
  // edits stacked duplicate blocks, only the last of which was ever
  // accurate). This gives up the earlier design (also 2026-09-22) of a
  // full revision trail via one fresh turn per edit — no letter-by-letter
  // replay stands in for that here either (deliberately dropped,
  // operator-reported 2026-09-22: too much motion for a single-line
  // value swap); the turn's own move to the end of the transcript is
  // itself the visible signal that an edit just happened.
  // Thin state wrapper around upsertRecapTurnInList above — same shape as
  // upsertAnswerTurn's own wrapper around upsertAnswerTurnInList (see that
  // function's own doc comment for why `turns` is read directly here rather
  // than via setTurns's functional updater).
  const upsertRecapTurn = (text: string, isUpdate: boolean) => {
    recapRef.current = text
    const result = upsertRecapTurnInList(turns, text, isUpdate, isUpdate ? RECAP_UPDATE_INTRO : RECAP_INTRO)
    if (result.outcome === 'unchanged') return
    setTurns(result.turns)
  }

  // Renders an editable note. The visitor sees the value before we ask for a
  // reply route, making the personal-data exchange earned and explicit.
  const showRecapReady = (text: string, isUpdate: boolean) => {
    upsertRecapTurn(text, isUpdate)
    if (isUpdate) {
      setPhase('confirm')
    } else {
      setTurns(prev => [...prev, { role: 'agent', text: REPLY_ROUTE_QUESTION, questionField: 'reply-route' }])
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
    setTurns(prev => [...prev, { role: 'agent', text: REPLY_ROUTE_QUESTION, questionField: 'reply-route' }])
    setPlaceholder(REPLY_ROUTE_PLACEHOLDER)
    setStep('reply-route')
    setPhase('writing')
  }

  const enterDegraded = (stage: 'gap-check' | 'recap') => {
    degradedRef.current = true
    degradedStageRef.current = stage
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
      if (!result.ok || typeof result.recap !== 'string') return enterDegraded('recap')
      recapIsRawRef.current = false
      showRecapReady(result.recap, isCorrection)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      await waitForFloor(startedAt)
      enterDegraded('recap')
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
      if (!result.ok) return enterDegraded('gap-check')
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
      enterDegraded('gap-check')
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
    // Same-value no-op: re-confirming an unchanged note advances the flow
    // but must not touch the transcript at all — nothing actually happened.
    // A genuinely changed note reuses the existing recap turn (see
    // upsertRecapTurn's own doc comment) — same "same task, reuse it"
    // contract upsertAnswerTurnInList already applies to reply-route/name.
    if (text !== recapRef.current) upsertRecapTurn(text, true)
    setInputValue('')
    setPhase('confirm')
    setIsMessageEditActive(false)
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

  // Thin state wrapper around the pure upsertAnswerTurnInList above — see
  // that function's own doc comment for the actual logic/rationale. Reads
  // `turns` directly (not via setTurns's functional updater) since every
  // caller here runs synchronously and this file's handlers already close
  // over the latest render's state the same way (e.g. visibleTurns further
  // down); setTurns itself still uses the returned list, never a stale one.
  const upsertAnswerTurn = (
    field: NonNullable<ChatTurn['field']>,
    text: string,
    kind?: ChatTurn['kind'],
  ): UpsertAnswerTurnOutcome => {
    const result = upsertAnswerTurnInList(turns, field, text, kind)
    if (result.outcome !== 'unchanged') setTurns(result.turns)
    return result.outcome
  }

  const submitReplyRoute = (rawText: string) => {
    const text = rawText.trim()
    if (!text) return
    if (!EMAIL_PATTERN.test(text)) {
      // Never stacks a duplicate — ensureErrorTurnInList appends the shared
      // error turn at most once, then every later failure just replays its
      // existing SplitTextReveal (see replyRouteErrorReplayNonce's own doc
      // comment) instead of adding another copy to the transcript.
      const result = ensureErrorTurnInList(turns, REPLY_ROUTE_ERROR_MESSAGE)
      if (result.inserted) setTurns(result.turns)
      setReplyRouteErrorReplayNonce(nonce => nonce + 1)
      return
    }
    replyRouteRef.current = text
    // Always routes back through the name step after a confirmed email —
    // first answer or edit alike ("Edit reply details" must still let the
    // visitor revisit/change their name, operator-reported 2026-09-22: an
    // earlier fix here made an *edit* skip straight to confirm, to stop a
    // repeated re-submission from stacking a duplicate NAME_QUESTION/answer
    // pair — but that same guard also silently skipped the step outright on
    // every edit, which is the actual regression). NAME_QUESTION itself
    // still only ever appears once: appended only if this exact turn isn't
    // already in the transcript, so an edit's return trip re-uses the
    // question already visible above instead of duplicating it — the F10b/
    // F10c "one accurate trace" guarantee stays intact, it just now governs
    // the QUESTION turn's own idempotency instead of skipping the whole step.
    const { turns: afterAnswer } = upsertAnswerTurnInList(turns, 'reply-route', text)
    const nameAlreadyAsked = afterAnswer.some(turn => turn.role === 'agent' && turn.questionField === 'name')
    setTurns(nameAlreadyAsked ? afterAnswer : [...afterAnswer, { role: 'agent', text: NAME_QUESTION, questionField: 'name' }])
    // Pre-fills with whatever name was already given (empty if the visitor
    // chose to stay anonymous) — same "show the existing answer, don't make
    // them start over" precedent as handleRequestIdentityEdit's own
    // replyRouteRef.current pre-fill.
    setInputValue(nameRef.current)
    setIsMessageEditActive(false)
    setPlaceholder(NAME_PLACEHOLDER)
    setStep('name')
    setPhase('writing')
  }

  const submitName = (rawText: string) => {
    const text = rawText.trim()
    if (text) {
      nameRef.current = text
      upsertAnswerTurn('name', text)
    }
    setInputValue('')
    setPhase('confirm')
  }

  const handleSkipName = () => {
    dismissResumeNotice()
    // "Stay anonymous" is itself the decision — it must leave a visible
    // trace (F10a) instead of silently advancing with no answer turn, which
    // used to leave NAME_QUESTION looking unanswered. nameRef.current always
    // clears to '' here (never left at a stale prior value), matching this
    // choice always meaning "no name," edit or not.
    nameRef.current = ''
    upsertAnswerTurn('name', NAME_SKIPPED_LABEL, 'choice')
    setInputValue('')
    setPhase('confirm')
  }

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
    // Covers every composer submit across every step (Enter-to-send and the
    // arrow click alike both route through here) in one place — see
    // dismissResumeNotice's own doc comment.
    dismissResumeNotice()
    if (step === 'message') void submitFirstMessage(inputValue)
    else if (step === 'followup') void submitFollowUpAnswer(inputValue)
    else if (step === 'reply-route') submitReplyRoute(inputValue)
    else if (step === 'name') submitName(inputValue)
    else if (step === 'degraded-addendum') submitDegradedAddendum(inputValue)
    else submitNoteEdit(inputValue)
  }

  const handleRequestCorrection = () => {
    dismissResumeNotice()
    setInputValue(recapRef.current)
    setPlaceholder(NOTE_EDIT_PLACEHOLDER)
    setStep('note-edit')
    setPhase('writing')
    setIsMessageEditActive(true)
  }

  const handleRequestIdentityEdit = () => {
    dismissResumeNotice()
    setInputValue(replyRouteRef.current)
    setPlaceholder(REPLY_ROUTE_PLACEHOLDER)
    setStep('reply-route')
    setPhase('writing')
    setIsMessageEditActive(true)
  }

  const handleRequestDegradedAddendum = () => {
    dismissResumeNotice()
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
    dismissResumeNotice()
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
    recapIsRawRef.current = false
    upsertRecapTurn(text, true)
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
  // confirmActionsJoinedStripEnabled's own motion half (see
  // ContactExperienceConfig's own doc comment) — two halves of one visually
  // joined strip independently lifting/tilting/scaling would read as two
  // separate physical objects, not one, so both drop every motion channel
  // CtaButtonConfig already exposes for this rather than a new bundled
  // flag: tiltEnabled (3D rotate), proximityScale (grow-on-approach),
  // proximityLiftPx (belt-and-suspenders alongside elevationReactionEnabled
  // below, which already pins elevation flat on its own), and
  // elevationReactionEnabled (hover/press/focus shadow lift). shadowEngineEnabled:
  // false goes one step further than elevationReactionEnabled alone
  // (operator-reported: with the engine still running, the two halves'
  // independently-computed shadows still visibly differed even at the same
  // pinned elevation, since each instance's own contact/projected shadow
  // layers factor in that element's own DOM rect — see
  // helpers/elevationShadowEngine.ts) — disabling the engine entirely falls
  // back to outerClasses' own flat, static Tailwind shadow (CtaButton.tsx),
  // byte-identical between both halves since neither is computing anything
  // instance-specific anymore. The accept action's own attention-guiding
  // nudge (forceHover) still works — it also drives the color/arrow-
  // translate cues CtaButton.tsx's own group-hover/group-[.force-hover]
  // rules apply independently of all of these.
  const joinedStripMotionOverride = {
    tiltEnabled: false,
    proximityScale: 1,
    proximityLiftPx: 0,
    elevationReactionEnabled: false,
    shadowEngineEnabled: false,
  } as const
  // The corner-radius half — squares off only the shared inner edge
  // (radiusCorners: 'left'/'right'), leaving the far outer corner exactly
  // as each config's own `radius` already specifies. radiusCornersDesktop
  // is deliberately left at its own default ('all', from ctaButtonConfig)
  // rather than set here — desktop always reverts to two ordinary
  // independent pills, unaffected either way.
  const primaryCtaButtonJoinedConfig = useMemo(
    () => ({ ...primaryCtaButtonConfig, ...joinedStripMotionOverride, radiusCorners: 'right' as const }),
    [primaryCtaButtonConfig],
  )
  const secondaryCtaButtonJoinedConfig = useMemo(
    () => ({ ...secondaryCtaButtonConfig, ...joinedStripMotionOverride, radiusCorners: 'left' as const }),
    [secondaryCtaButtonConfig],
  )
  // The composer pill's own fill/border — same "own explicit colors instead
  // of the shared, site-wide ctaButtonConfig's 'auto' surface-derived ones"
  // move as primaryCtaButtonConfig above, applied to ComposerPill's own
  // ctaButtonConfig prop (see composerPillBackgroundColor's own doc comment,
  // ContactExperience.config.ts). Derived from the raw shared ctaButtonConfig
  // (not primaryCtaButtonConfig) — the pill and the confirm buttons are
  // independently colored, just via the same technique. Sizing (font/
  // padding/min-height) no longer needs a local override here at all —
  // ComposerPill.tsx now reads its own independent composerFontSize/
  // composerPaddingX/composerMinHeightPx/etc bundle (registered.ts's own
  // composerSize doc comment), which already floors mobile font-size at
  // 16px to prevent iOS/Android's auto-zoom-on-focus. That floor now lives
  // in the shared config itself rather than as a page-local patch, so it
  // protects every ComposerPill consumer (e.g. the Abstract hero composer
  // too), not just this page.
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

  // confirmActionsJoinedStripEnabled's own layout half (see
  // ContactExperienceConfig's own doc comment; joinedStripMotionOverride/
  // primaryCtaButtonJoinedConfig/secondaryCtaButtonJoinedConfig above cover
  // the motion+corner half). Mobile: one non-wrapping row, no gap, each
  // action flex-1 so the two share the row's width evenly edge-to-edge —
  // the visible seam between them is the divider rendered between the two
  // CtaButtons below, not a gap. Desktop (md:): reverts to exactly today's
  // wrap+gap+content-width layout, unaffected either way.
  const joinedStripEnabled = config.confirmActionsJoinedStripEnabled
  const confirmActionsRowClassName = joinedStripEnabled
    ? 'flex items-stretch justify-center gap-0 md:flex-wrap md:items-center md:gap-[var(--contact-control-gap)]'
    : 'flex flex-wrap items-center justify-center gap-[var(--contact-control-gap)]'
  const confirmActionButtonClassName = joinedStripEnabled
    ? `${ctaButtonActiveClassName} flex-1 md:flex-none`
    : ctaButtonActiveClassName
  // Guaranteed visible regardless of either action's own border config
  // (often 'none' on the accept action) — deliberately page-level chrome,
  // not a new CtaButton config field, since CtaButtonConfig's own
  // --cta-border custom property is scoped to each button's own DOM
  // subtree and isn't reachable from a sibling divider element anyway.
  // md:hidden: only ever relevant while the strip above it is actually
  // joined, i.e. the mobile tier.
  const confirmActionsJoinSeam = joinedStripEnabled ? (
    <div aria-hidden="true" className="w-px self-stretch bg-black/10 md:hidden" />
  ) : null

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

  // Mobile-only history fade during an in-place edit (isMessageEditActive —
  // see its own doc comment above) — operator ask, 2026-09-22. Fading OUT
  // (isMessageEditActive true, target opacity 0) plays with the configured
  // easing verbatim; fading back IN (target opacity 1) plays with that same
  // easing's exact mathematical reverse (reverseCubicBezierEasing) — same
  // duration either direction, so the return trip always mirrors the exit
  // rather than needing its own separately-tuned value. pointer-events:none
  // while hidden so a faded-out history can't intercept a touch meant for
  // the edit field sitting in front of it. Reduced-motion: instant, no
  // transition at all (same convention as every other motion in this file).
  const isHistoryFadedForEdit = isMobileTier && isMessageEditActive
  const historyFadeEasing = CTA_BUTTON_MOTION_EASINGS[config.mobileHistoryFadeOnEditEasing]
  const historyFadeStyle: CSSProperties = {
    opacity: isHistoryFadedForEdit ? 0 : 1,
    pointerEvents: isHistoryFadedForEdit ? 'none' : 'auto',
    transitionProperty: 'opacity',
    transitionDuration: prefersReducedMotion ? '0ms' : `${config.mobileHistoryFadeOnEditDurationMs}ms`,
    transitionTimingFunction: isHistoryFadedForEdit
      ? historyFadeEasing
      : reverseCubicBezierEasing(historyFadeEasing),
  }

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
        // No container-level gap-* here on purpose (was gap-[var(--contact-
        // message-gap)], a single flat value applied uniformly between
        // every turn regardless of relationship): the two-tier spacing
        // below — a tighter gap grouping a question with its own answer,
        // the page's normal looser gap everywhere else — varies per
        // adjacent pair, which a shared flex `gap` can't express. Each
        // turn's own top spacing is computed individually instead (see
        // isTightExchangeGap below).
        className="flex w-full flex-1 min-h-0 flex-col items-center justify-end overflow-y-auto overscroll-contain pr-2"
        data-responsive-overflow-owner="true"
        style={historyFadeStyle}
      >
        {visibleTurns.map((turn, index) => {
          const distanceFromBottom = visibleCount - 1 - index
          const opacity = computeMessageFadeOpacity(distanceFromBottom, config.messageVisibleCount, config.messageFadeFloorOpacity)
          // See isTightExchangeGap's own doc comment (Gestalt proximity +
          // cognitive-load chunking, operator ask 2026-09-22) — only an
          // agent question immediately followed by the visitor's own
          // answer gets the tighter messageExchangeGapClass; every other
          // adjacent pair (including the very first turn, index 0, which
          // has no previous turn at all) keeps the page's normal gap via
          // the existing --contact-message-gap CSS var.
          const isTightGap = index > 0 && isTightExchangeGap(visibleTurns[index - 1]?.role, turn.role)
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
            <div
              key={firstVisibleIndex + index}
              className={`flex w-full justify-center ${isTightGap ? config.messageExchangeGapClass : ''}`}
              style={{ opacity, marginTop: isTightGap ? undefined : (index > 0 ? 'var(--contact-message-gap)' : undefined) }}
            >
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
                    // Per-child margin-top (config.messageExchangeGapClass),
                    // not a flex gap: intro/body/[question] are three parts
                    // of ONE agent utterance — the tightest possible
                    // relationship of all — so they use the same tight tier
                    // as a question→answer pair above, not the page's
                    // looser default gap.
                    return (
                      <div className="flex flex-col">
                        <p className={`${baseClassName} ${mutedClassName}`}>{introText}</p>
                        <p className={`${baseClassName} ${recapBodyClassName} ${config.messageExchangeGapClass}`}>{bodyText}</p>
                        {turn.recapQuestion ? (
                          <p className={`${baseClassName} ${primaryClassName} ${config.messageExchangeGapClass}`}>{turn.recapQuestion}</p>
                        ) : null}
                      </div>
                    )
                  }

                  if (turn.variant === 'error') {
                    // key={replyRouteErrorReplayNonce}: this turn is never
                    // re-appended on a repeated wrong submission
                    // (ensureErrorTurnInList), so without a changing key
                    // React would just leave the already-mounted
                    // SplitTextReveal alone — the key change is what forces
                    // a fresh mount, replaying the letter-by-letter reveal
                    // to catch the visitor's attention again. See ChatTurn's
                    // own 'error' variant doc comment.
                    return (
                      <p className={`${baseClassName} ${primaryClassName}`}>
                        <SplitTextReveal
                          key={replyRouteErrorReplayNonce}
                          easing={CTA_BUTTON_MOTION_EASINGS[config.replyRouteErrorRevealEasing]}
                          initialDelayMs={0}
                          stepDelayMs={config.replyRouteErrorRevealStepDelayMs}
                          text={turn.text}
                          unit="char"
                          unitDurationMs={config.replyRouteErrorRevealUnitDurationMs}
                        />
                      </p>
                    )
                  }

                  return (
                    <p className={`${baseClassName} ${turn.variant === 'status' ? mutedClassName : primaryClassName}`}>
                      {turn.text}
                    </p>
                  )
                })() : (
                  // Role differentiation (PLAN-CONTACT-CHAT-HISTORY-
                  // REFINEMENT.md Stage 3 / P1) — a deliberately non-chat
                  // treatment: still centered, no opposite-aligned sender
                  // side. A visitor answer reads as a captured-value object
                  // via a stronger, colored fill (--contact-answer-fill,
                  // config.visitorAnswerFillOpacityPercent) and a heavier
                  // weight. NO edge-following accent rule (border-left or
                  // an inset box-shadow, both tried and reverted,
                  // 2026-09-22, operator-reported both times): rounded-
                  // [22px] on a ~40px-tall pill means 2×radius exceeds the
                  // element's own height, so the shape is a full capsule
                  // with NO straight segment anywhere on the left edge —
                  // any edge-following treatment (border or shadow alike)
                  // fundamentally can't render flush against a curve with
                  // no straight run; offsetting a rounded shape sideways
                  // and clipping it to itself produces a crescent at the
                  // corner regardless of which CSS property draws it. Fill
                  // + weight are geometry-independent and carry the role
                  // cue with zero risk of this artifact. A recorded choice
                  // (kind: 'choice', e.g. "Staying anonymous" from skipping
                  // the name step) renders italic and dimmed relative to
                  // typed prose, independent of the position-based fade
                  // already applied by the outer wrapper.
                  <p
                    className={`mx-auto w-fit max-w-[min(var(--contact-message-measure),88%)] whitespace-pre-line [overflow-wrap:anywhere] rounded-[22px] bg-[color:var(--contact-answer-fill)] px-4 py-2.5 ${messageTextAlignClassName} ${config.baseTextSize} ${config.baseTextSizeWide} ${config.baseTextSizeLg} ${config.lineHeight} ${config.lineHeightWide} ${config.lineHeightLg} ${config.visitorAnswerFontWeight} text-[color:var(--contact-primary)] ${turn.kind === 'choice' ? 'italic opacity-[var(--contact-choice-opacity)]' : ''}`}
                  >
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
            confirm-screen instance. confirmActionsJoinedStripEnabled swaps
            in the *Joined variants of each config (radiusCorners + motion
            flattened, see joinedStripMotionOverride's own comment above)
            and a shared seam between them — same pair of actions, same
            handlers, just a different mobile-only presentation. */}
        {phase === 'confirm' && (
          <div className={confirmActionsRowClassName}>
            {degradedRef.current ? (
              <>
                <CtaButton
                  className={confirmActionButtonClassName}
                  config={joinedStripEnabled ? secondaryCtaButtonJoinedConfig : secondaryCtaButtonConfig}
                  fillWidth={joinedStripEnabled}
                  icon="✎"
                  onClick={handleRequestDegradedAddendum}
                  onFocus={handleReleaseConfirmForceHover}
                  onMouseEnter={handleReleaseConfirmForceHover}
                  surfaceColor={surfaceColor}
                >
                  <span className={buttonFontClassName}>{DEGRADED_CONFIRM_CORRECT_LABEL}</span>
                </CtaButton>
                {confirmActionsJoinSeam}
                <CtaButton
                  className={confirmActionButtonClassName}
                  config={joinedStripEnabled ? primaryCtaButtonJoinedConfig : primaryCtaButtonConfig}
                  fillWidth={joinedStripEnabled}
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
                  className={confirmActionButtonClassName}
                  config={joinedStripEnabled ? secondaryCtaButtonJoinedConfig : secondaryCtaButtonConfig}
                  fillWidth={joinedStripEnabled}
                  icon="✎"
                  onClick={handleRequestCorrection}
                  onFocus={handleReleaseConfirmForceHover}
                  onMouseEnter={handleReleaseConfirmForceHover}
                  surfaceColor={surfaceColor}
                >
                  <span className={buttonFontClassName}>{CONFIRM_CORRECT_LABEL}</span>
                </CtaButton>
                {confirmActionsJoinSeam}
                <CtaButton
                  className={confirmActionButtonClassName}
                  config={joinedStripEnabled ? primaryCtaButtonJoinedConfig : primaryCtaButtonConfig}
                  fillWidth={joinedStripEnabled}
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
      {/* Mounted once, for good, the instant this component first has
          something worth resuming — see hasResumedConversation's own doc
          comment above for why this never re-arms later in the same mounted
          instance. `visible` (not mount/unmount) drives the actual fade. */}
      {hasResumedConversation && (
        <ConversationResumeNotice
          config={config}
          ctaButtonConfig={ctaButtonConfig}
          onStartFresh={handleStartFresh}
          visible={resumeNoticeVisible}
        />
      )}
    </div>
  )
}

type ContactPageProps = { pageContent: ContactPageContent; siteContent: SiteContent }

export async function getStaticProps() {
  const { loadContactPageContent, loadSiteContent } = await import('../helpers/content/pageContent.build')
  return { props: { pageContent: loadContactPageContent(), siteContent: loadSiteContent() } }
}

export default function ContactPage({ pageContent, siteContent }: ContactPageProps) {
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
  // Contact's stacked tablet header track is slightly narrower than
  // Abstract's. Give its wordmark container the complete track at md so the
  // shared md:w-80 mark retains Abstract's 243px rendered width.
  const contactHeaderLayoutConfig = useMemo(() => ({
    ...contactPolymorphicLayoutConfig,
    headerLeftContentWidthWide: 'md:max-w-percent-100' as PolymorphicLayoutConfig['headerLeftContentWidthWide'],
  }), [contactPolymorphicLayoutConfig])
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
  // Keyboard overlap (px hidden by the iOS software keyboard, 0 otherwise) —
  // see useKeyboardInsetPx's own doc comment for why it's applied as bottom
  // padding rather than by shrinking the column height.
  const keyboardInsetPx = useKeyboardInsetPx()

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
    // Visitor-turn role differentiation (PLAN-CONTACT-CHAT-HISTORY-
    // REFINEMENT.md Stage 3) — reuses resolvedBorderColor, same source as
    // every --contact-border-* variant above, rather than a parallel color.
    '--contact-answer-fill': `color-mix(in srgb, ${resolvedBorderColor} ${contactConfig.visitorAnswerFillOpacityPercent}%, transparent)`,
    '--contact-choice-opacity': contactConfig.visitorChoiceOpacity,
  } as CSSProperties

  return (
    // LayoutDebugHighlightProvider now mounts once in pages/_app.tsx
    // (PLAN-DEDUPLICATE-PAGE-SHELL-LOGIC.md §6) — was independently
    // mounted per-page before; see that stage's own doc comment in
    // _app.tsx for the full reasoning. Every LayoutDebugOverlay instance
    // below (via PolymorphicLayout/SplitColumnPageShell/SplitColumnLayout/
    // SiteHeader) and the settings panel itself still share the
    // same context — now app-wide, not just page-wide.
    <SiteContentProvider site={siteContent} page={pageContent}>
    <>
      <SeoHead
        title={buildSiteTitle(pageContent.meta.title)}
        description={pageContent.meta.description}
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
              contactHeaderLayoutConfig,
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
            {/* Column height = calc(100dvh - headerHeight): full height so it
                fills — and thus top-anchors within — the shared
                PolymorphicLayout narrow-column slot, which vertically centers
                its content (a shorter box would float to the middle). The
                composer sits at this column's bottom edge. Keyboard avoidance
                is the bottom padding, NOT a shorter height: `100dvh`/`dvh`
                does not shrink for the iOS software keyboard (it tracks only
                the browser's own chrome), so without extra padding the
                bottom-anchored composer is pushed behind the keyboard — the
                real-device regression this fixes. See useKeyboardInsetPx's
                own doc comment and PLAN-CONTACT-VIEWPORT-SIMPLIFICATION.md
                for the full history (including why this is padding, not the
                removed position:fixed + offsetTop sync).
                max(5rem, keyboardInset), NOT 5rem + keyboardInset: the 5rem
                base (mirrors the former `pb-20` class, now inline so the
                keyboard inset can override it) is breathing room for the
                keyboard-LESS bottom of the screen — once the keyboard is
                open it IS that space, so the padding should just clear the
                keyboard (composer flush against it, matching this
                composer's own pre-regression docked look), not stack an
                extra 5rem of gap on top of the keyboard as a naive sum does
                (operator-reported: composer floating detached above the
                keyboard instead of docked to it). max() also keeps the
                keyboard-closed case byte-identical to the original pb-20 —
                keyboardInset is 0 there, so max(5rem, 0) = 5rem.
                overflow-hidden here (not auto): this box is not itself meant
                to scroll — GuidedIntake's own message feed below is the one
                designated scroller now (see its own doc comment) — anything
                that doesn't fit here is a sizing bug to fix, not something to
                paper over with a second scroll container. */}
            <div
              className={`flex h-full min-h-0 w-full flex-col gap-6 overflow-hidden pb-[max(5rem,var(--contact-kbd-inset))] pt-4 font-sans text-[color:var(--contact-primary)] lg:translate-y-[var(--contact-optical-y)] lg:py-10 ${PAGE_CONTENT_GUTTER_CLASSNAME}`}
              style={{
                height: `calc(100dvh - ${headerWrapperRect?.height ?? 0}px)`,
                '--contact-kbd-inset': `${keyboardInsetPx}px`,
              } as CSSProperties}
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
                  content={pageContent.conversation}
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
    </SiteContentProvider>
  )
}
