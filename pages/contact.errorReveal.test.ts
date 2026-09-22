import { describe, expect, it } from 'vitest'
import { ensureErrorTurnInList, reverseCubicBezierEasing } from './contact'

// See "let's reintroduce the error message using the letter-by-letter intro
// motion... instead of adding another duplicated record" (2026-09-22) — a
// repeated invalid submission must never stack a second identical error
// turn; the transcript grows once, then every later failure only replays
// the existing turn's own reveal (handled by GuidedIntake's own
// replyRouteErrorReplayNonce, outside this pure function's concern).
describe('ensureErrorTurnInList', () => {
  it('appends the error turn when none exists yet', () => {
    const { turns, inserted } = ensureErrorTurnInList([], 'Please enter an email address so Manuel can reply.')
    expect(inserted).toBe(true)
    expect(turns).toEqual([
      { role: 'agent', variant: 'error', text: 'Please enter an email address so Manuel can reply.' },
    ])
  })

  it('does not append a second copy on a repeated failure', () => {
    const initial = [
      { role: 'agent' as const, text: 'What is your email?' },
      { role: 'agent' as const, variant: 'error' as const, text: 'Please enter an email address so Manuel can reply.' },
    ]
    const { turns, inserted } = ensureErrorTurnInList(initial, 'Please enter an email address so Manuel can reply.')
    expect(inserted).toBe(false)
    expect(turns).toBe(initial)
    expect(turns.filter(turn => turn.variant === 'error')).toHaveLength(1)
  })

  it('never grows past one error turn across many repeated failures', () => {
    let turns: ReturnType<typeof ensureErrorTurnInList>['turns'] = []
    for (let attempt = 0; attempt < 5; attempt += 1) {
      turns = ensureErrorTurnInList(turns, 'Please enter an email address so Manuel can reply.').turns
    }
    expect(turns).toHaveLength(1)
  })
})

// See "bring the history back with the same transition duration but the
// reversed easing" — the fade-in easing is always mathematically derived
// from the fade-out one, never a second independently-tuned value.
describe('reverseCubicBezierEasing', () => {
  it('mirrors a cubic-bezier curve through its own center', () => {
    // gentle: cubic-bezier(0.33, 1, 0.68, 1)
    expect(reverseCubicBezierEasing('cubic-bezier(0.33, 1, 0.68, 1)')).toBe(
      'cubic-bezier(0.31999999999999995, 0, 0.6699999999999999, 0)',
    )
  })

  it('is its own inverse (reversing twice returns the original curve)', () => {
    const original = 'cubic-bezier(0.2, 0, 0, 1)'
    const twiceReversed = reverseCubicBezierEasing(reverseCubicBezierEasing(original))
    // Floating point round-trip — compare numerically, not by string.
    const parse = (css: string) => css.match(/[\d.]+|-[\d.]+/g)!.map(Number)
    const [a1, a2, a3, a4] = parse(original)
    const [b1, b2, b3, b4] = parse(twiceReversed)
    expect(b1).toBeCloseTo(a1)
    expect(b2).toBeCloseTo(a2)
    expect(b3).toBeCloseTo(a3)
    expect(b4).toBeCloseTo(a4)
  })

  it('leaves a non-cubic-bezier token (e.g. linear) unchanged', () => {
    expect(reverseCubicBezierEasing('linear')).toBe('linear')
  })

  it('handles negative control-point coordinates', () => {
    // gaussian: cubic-bezier(0.37, 0, 0.63, 1) has no negatives, but the
    // pattern must still accept a leading '-' on the y components in
    // general (some easing curves do overshoot below 0 or past 1).
    expect(reverseCubicBezierEasing('cubic-bezier(0.1, -0.2, 0.9, 1.2)')).toBe(
      'cubic-bezier(0.09999999999999998, -0.19999999999999996, 0.9, 1.2)',
    )
  })
})
