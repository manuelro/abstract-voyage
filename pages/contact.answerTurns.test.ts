import { describe, expect, it } from 'vitest'
import { upsertAnswerTurnInList } from './contact'

// See PLAN-CONTACT-CHAT-HISTORY-REFINEMENT.md Stage 2 (F10a/F10b/F10c) — the
// transcript must record exactly one trace per decision: a new answer
// appends, an edit rewrites the existing record in place, and a same-value
// re-submission is a no-op (adds/changes nothing).
describe('upsertAnswerTurnInList', () => {
  it('appends a new answer turn when none exists for the field yet', () => {
    const { turns, outcome } = upsertAnswerTurnInList([], 'reply-route', 'a@b.com')
    expect(outcome).toBe('inserted')
    expect(turns).toEqual([{ role: 'visitor', field: 'reply-route', text: 'a@b.com' }])
  })

  it('rewrites the existing turn in place when the value changes', () => {
    const initial = [
      { role: 'agent' as const, text: 'What is your email?' },
      { role: 'visitor' as const, field: 'reply-route' as const, text: 'a@b.com' },
    ]
    const { turns, outcome } = upsertAnswerTurnInList(initial, 'reply-route', 'c@d.com')
    expect(outcome).toBe('updated')
    expect(turns).toHaveLength(2)
    expect(turns[1]).toEqual({ role: 'visitor', field: 'reply-route', text: 'c@d.com' })
  })

  it('is a no-op when re-submitting the same value', () => {
    const initial = [
      { role: 'visitor' as const, field: 'reply-route' as const, text: 'a@b.com' },
    ]
    const { turns, outcome } = upsertAnswerTurnInList(initial, 'reply-route', 'a@b.com')
    expect(outcome).toBe('unchanged')
    expect(turns).toBe(initial)
  })

  it('never produces more than one turn for the same field across insert + repeated edits', () => {
    let { turns } = upsertAnswerTurnInList([], 'reply-route', 'a@b.com')
    turns = upsertAnswerTurnInList(turns, 'reply-route', 'b@c.com').turns
    turns = upsertAnswerTurnInList(turns, 'reply-route', 'b@c.com').turns
    turns = upsertAnswerTurnInList(turns, 'reply-route', 'd@e.com').turns
    expect(turns.filter(turn => turn.field === 'reply-route')).toHaveLength(1)
    expect(turns).toHaveLength(1)
  })

  it('records a choice turn (e.g. skipping the name step) distinctly from typed text', () => {
    const { turns, outcome } = upsertAnswerTurnInList([], 'name', 'Staying anonymous', 'choice')
    expect(outcome).toBe('inserted')
    expect(turns).toEqual([
      { role: 'visitor', field: 'name', text: 'Staying anonymous', kind: 'choice' },
    ])
  })

  it('treats re-choosing the same choice as a no-op', () => {
    const initial = [
      { role: 'visitor' as const, field: 'name' as const, text: 'Staying anonymous', kind: 'choice' as const },
    ]
    const { turns, outcome } = upsertAnswerTurnInList(initial, 'name', 'Staying anonymous', 'choice')
    expect(outcome).toBe('unchanged')
    expect(turns).toBe(initial)
  })

  it('treats switching from a choice to a typed answer as an update, clearing kind', () => {
    const initial = [
      { role: 'visitor' as const, field: 'name' as const, text: 'Staying anonymous', kind: 'choice' as const },
    ]
    const { turns, outcome } = upsertAnswerTurnInList(initial, 'name', 'Ada')
    expect(outcome).toBe('updated')
    expect(turns[0]).toEqual({ role: 'visitor', field: 'name', text: 'Ada', kind: undefined })
  })
})
