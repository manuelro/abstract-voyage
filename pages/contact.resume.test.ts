import { describe, expect, it } from 'vitest'
import { validateConversationSnapshot } from './contact'

// See PLAN-CONTACT-CONVERSATION-PERSISTENCE.md §4.2 for the full "contract
// is still valid" load-gate design this exercises.
const NOW = 1_790_000_000_000
const TTL_MS = 24 * 60 * 60 * 1000

const validSnapshot = () => ({
  version: 2,
  savedAt: NOW - 60_000,
  turns: [{ role: 'visitor', text: 'hi' }],
  step: 'message',
  phase: 'writing',
  inputValue: '',
  visitorAnswers: ['hi'],
  modelTranscript: ['Visitor: hi'],
  followUpCount: 0,
  followUpToken: undefined,
  recap: '',
  replyRoute: '',
  name: '',
  recapIsRaw: false,
  degraded: false,
  degradedStage: 'recap',
  submissionId: undefined,
  deliveryError: '',
  deliveryRetriesExhausted: false,
})

describe('validateConversationSnapshot', () => {
  it('accepts a fresh, well-formed snapshot', () => {
    expect(validateConversationSnapshot(validSnapshot(), TTL_MS, NOW)).not.toBeNull()
  })

  it('rejects a snapshot older than the TTL', () => {
    const snapshot = { ...validSnapshot(), savedAt: NOW - 25 * 60 * 60 * 1000 }
    expect(validateConversationSnapshot(snapshot, TTL_MS, NOW)).toBeNull()
  })

  it('accepts a snapshot right at the TTL boundary', () => {
    const snapshot = { ...validSnapshot(), savedAt: NOW - TTL_MS }
    expect(validateConversationSnapshot(snapshot, TTL_MS, NOW)).not.toBeNull()
  })

  it('rejects a snapshot from a different schema version', () => {
    const snapshot = { ...validSnapshot(), version: 1 }
    expect(validateConversationSnapshot(snapshot, TTL_MS, NOW)).toBeNull()
  })

  it('rejects a snapshot with a malformed degradedStage', () => {
    const snapshot = { ...validSnapshot(), degradedStage: 'not-a-real-stage' }
    expect(validateConversationSnapshot(snapshot, TTL_MS, NOW)).toBeNull()
  })

  it('rejects a delivered ("done") conversation outright — must never resurrect', () => {
    const snapshot = { ...validSnapshot(), phase: 'done' }
    expect(validateConversationSnapshot(snapshot, TTL_MS, NOW)).toBeNull()
  })

  it('coerces an in-flight ("pending") phase back to "writing" — no request survives a reload', () => {
    const snapshot = { ...validSnapshot(), phase: 'pending' }
    const result = validateConversationSnapshot(snapshot, TTL_MS, NOW)
    expect(result?.phase).toBe('writing')
  })

  it('accepts a "failed" phase as resumable', () => {
    const snapshot = { ...validSnapshot(), phase: 'failed' }
    expect(validateConversationSnapshot(snapshot, TTL_MS, NOW)?.phase).toBe('failed')
  })

  it('rejects an unrecognized phase', () => {
    const snapshot = { ...validSnapshot(), phase: 'not-a-real-phase' }
    expect(validateConversationSnapshot(snapshot, TTL_MS, NOW)).toBeNull()
  })

  it('rejects an unrecognized step', () => {
    const snapshot = { ...validSnapshot(), step: 'not-a-real-step' }
    expect(validateConversationSnapshot(snapshot, TTL_MS, NOW)).toBeNull()
  })

  it('rejects a structurally malformed turn', () => {
    const snapshot = { ...validSnapshot(), turns: [{ role: 'narrator', text: 'hi' }] }
    expect(validateConversationSnapshot(snapshot, TTL_MS, NOW)).toBeNull()
  })

  it('rejects non-object input outright', () => {
    expect(validateConversationSnapshot(null, TTL_MS, NOW)).toBeNull()
    expect(validateConversationSnapshot('a string', TTL_MS, NOW)).toBeNull()
    expect(validateConversationSnapshot(undefined, TTL_MS, NOW)).toBeNull()
  })

  it('accepts an opaque followUpToken as a plain string, and its absence', () => {
    expect(validateConversationSnapshot(
      { ...validSnapshot(), followUpToken: 'opaque-token' }, TTL_MS, NOW,
    )).not.toBeNull()
    expect(validateConversationSnapshot(
      { ...validSnapshot(), followUpToken: undefined }, TTL_MS, NOW,
    )).not.toBeNull()
  })

  it('rejects a malformed followUpToken shape', () => {
    const snapshot = { ...validSnapshot(), followUpToken: 42 }
    expect(validateConversationSnapshot(snapshot, TTL_MS, NOW)).toBeNull()
  })
})
