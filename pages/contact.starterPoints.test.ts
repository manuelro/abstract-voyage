import { describe, expect, it } from 'vitest'
import { cycleStarterIndex, resolveStarterModeOnInput } from './contact'

describe('resolveStarterModeOnInput', () => {
  it('hides the affordance the moment there is any input', () => {
    expect(resolveStarterModeOnInput('hint', true)).toBe('hidden')
  })

  it('exits browsing the moment there is any input, same as the close X', () => {
    expect(resolveStarterModeOnInput('browsing', true)).toBe('hidden')
  })

  it('leaves the mode untouched while the field stays empty', () => {
    expect(resolveStarterModeOnInput('hint', false)).toBe('hint')
    expect(resolveStarterModeOnInput('hidden', false)).toBe('hidden')
    expect(resolveStarterModeOnInput('browsing', false)).toBe('browsing')
  })
})

describe('cycleStarterIndex', () => {
  const length = 4

  it('advances forward', () => {
    expect(cycleStarterIndex(0, 1, length)).toBe(1)
    expect(cycleStarterIndex(2, 1, length)).toBe(3)
  })

  it('wraps forward past the last stem', () => {
    expect(cycleStarterIndex(3, 1, length)).toBe(0)
  })

  it('steps backward', () => {
    expect(cycleStarterIndex(2, -1, length)).toBe(1)
  })

  it('wraps backward past the first stem', () => {
    expect(cycleStarterIndex(0, -1, length)).toBe(3)
  })
})
