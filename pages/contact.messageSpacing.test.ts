import { describe, expect, it } from 'vitest'
import { isTightExchangeGap } from './contact'

// See the operator's 2026-09-22 spacing revisit — Gestalt law of proximity +
// Sweller's cognitive-load chunking: a question immediately followed by its
// own answer should read as one visually grouped exchange (tight gap);
// every other adjacent pair keeps the page's normal, looser gap.
describe('isTightExchangeGap', () => {
  it('is tight when an agent turn is immediately followed by a visitor turn', () => {
    expect(isTightExchangeGap('agent', 'visitor')).toBe(true)
  })

  it('is loose when a visitor turn is followed by a new agent turn (exchange complete, new one starting)', () => {
    expect(isTightExchangeGap('visitor', 'agent')).toBe(false)
  })

  it('is loose between two consecutive agent turns', () => {
    expect(isTightExchangeGap('agent', 'agent')).toBe(false)
  })

  it('is loose between two consecutive visitor turns', () => {
    expect(isTightExchangeGap('visitor', 'visitor')).toBe(false)
  })

  it('is loose for the very first turn (no previous turn to relate to)', () => {
    expect(isTightExchangeGap(undefined, 'visitor')).toBe(false)
    expect(isTightExchangeGap(undefined, 'agent')).toBe(false)
  })
})
