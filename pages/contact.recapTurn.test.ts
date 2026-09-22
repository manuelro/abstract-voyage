import { describe, expect, it } from 'vitest'
import { upsertRecapTurnInList } from './contact'

const RECAP_INTRO = 'Here’s the note Manuel would receive.'
const RECAP_UPDATE_INTRO = 'Here’s the updated note Manuel would receive.'

// A note edit is the *same* task (presenting the note for confirmation)
// recurring with a changed value, not a new task — it must reuse the
// existing recap turn rather than stacking a duplicate "Here's the
// [updated] note..." block underneath the first (operator-reported
// 2026-09-22).
describe('upsertRecapTurnInList', () => {
  it('inserts the first recap turn when none exists yet', () => {
    const { turns, outcome } = upsertRecapTurnInList([], 'hello', false)
    expect(outcome).toBe('inserted')
    expect(turns).toEqual([
      { role: 'agent', variant: 'recap', text: `${RECAP_INTRO}\n\nhello`, recapQuestion: undefined },
    ])
  })

  it('rewrites the existing recap turn in place on a genuinely changed value', () => {
    const initial = [
      { role: 'agent' as const, text: 'What message would you like to send?' },
      { role: 'visitor' as const, text: 'hello' },
      { role: 'agent' as const, variant: 'recap' as const, text: `${RECAP_INTRO}\n\nhello`, recapQuestion: undefined },
    ]
    const { turns, outcome } = upsertRecapTurnInList(initial, 'hello there', true)
    expect(outcome).toBe('updated')
    expect(turns).toHaveLength(3)
    expect(turns[2]).toEqual({
      role: 'agent', variant: 'recap', text: `${RECAP_UPDATE_INTRO}\n\nhello there`, recapQuestion: undefined,
    })
  })

  it('never produces more than one recap turn across repeated edits', () => {
    let turns: ReturnType<typeof upsertRecapTurnInList>['turns'] = []
    turns = upsertRecapTurnInList(turns, 'first draft', false).turns
    turns = upsertRecapTurnInList(turns, 'second draft', true).turns
    turns = upsertRecapTurnInList(turns, 'third draft', true).turns
    expect(turns.filter(turn => turn.variant === 'recap')).toHaveLength(1)
    expect(turns[0].text).toBe(`${RECAP_UPDATE_INTRO}\n\nthird draft`)
  })

  it('is a no-op when re-confirming the same value', () => {
    const initial = [
      { role: 'agent' as const, variant: 'recap' as const, text: `${RECAP_UPDATE_INTRO}\n\nsame`, recapQuestion: undefined },
    ]
    const { turns, outcome } = upsertRecapTurnInList(initial, 'same', true)
    expect(outcome).toBe('unchanged')
    expect(turns).toBe(initial)
  })

  it('moves the recap turn to the end on edit, preserving every other turn', () => {
    const initial = [
      { role: 'agent' as const, text: 'What message would you like to send?' },
      { role: 'visitor' as const, text: 'hello' },
      { role: 'agent' as const, variant: 'recap' as const, text: `${RECAP_INTRO}\n\nhello`, recapQuestion: undefined },
      { role: 'agent' as const, text: 'What’s the best email for Manuel to reply to?' },
    ]
    const { turns } = upsertRecapTurnInList(initial, 'hello again', true)
    expect(turns).toHaveLength(4)
    expect(turns[0]).toBe(initial[0])
    expect(turns[1]).toBe(initial[1])
    expect(turns[2]).toBe(initial[3])
    expect(turns[3].text).toBe(`${RECAP_UPDATE_INTRO}\n\nhello again`)
  })

  it('moving the recap turn to the end reflects real edit chronology relative to a later reply-info edit', () => {
    // Mirrors upsertAnswerTurnInList's own move-to-end contract — see that
    // function's own doc comment for the paired scenario.
    const initial = [
      { role: 'agent' as const, text: 'What message would you like to send?' },
      { role: 'visitor' as const, text: 'hello' },
      { role: 'agent' as const, variant: 'recap' as const, text: `${RECAP_INTRO}\n\nhello`, recapQuestion: undefined },
      { role: 'agent' as const, text: 'What’s the best email for Manuel to reply to?' },
      { role: 'visitor' as const, field: 'reply-route' as const, text: 'a@b.com' },
    ]
    const { turns } = upsertRecapTurnInList(initial, 'hello again', true)
    const recapIndex = turns.findIndex(turn => turn.variant === 'recap')
    const replyRouteIndex = turns.findIndex(turn => turn.field === 'reply-route')
    // The note was edited AFTER the reply-route answer already existed, so
    // it must now render below it.
    expect(replyRouteIndex).toBeLessThan(recapIndex)
  })
})
