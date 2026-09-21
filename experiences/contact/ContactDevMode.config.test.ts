import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONTACT_DEV_MODE_CONFIG,
  shouldSimulateIntakeStage,
} from './ContactDevMode.config'

describe('ContactDevMode stage routing', () => {
  it('uses real AI and simulated delivery in the safe live-Gateway default', () => {
    expect(shouldSimulateIntakeStage(DEFAULT_CONTACT_DEV_MODE_CONFIG, 'gap-check', false)).toBe(false)
    expect(shouldSimulateIntakeStage(DEFAULT_CONTACT_DEV_MODE_CONFIG, 'recap', false)).toBe(false)
    expect(shouldSimulateIntakeStage(DEFAULT_CONTACT_DEV_MODE_CONFIG, 'deliver', false)).toBe(true)
  })

  it('can retain live AI while exercising delivery recovery locally', () => {
    const config = { ...DEFAULT_CONTACT_DEV_MODE_CONFIG, deliveryTestMode: 'simulate-fail-recover' as const }
    expect(shouldSimulateIntakeStage(config, 'gap-check', false)).toBe(false)
    expect(shouldSimulateIntakeStage(config, 'deliver', false)).toBe(true)
  })

  it('can use the local function for delivery only when explicitly selected', () => {
    const config = { ...DEFAULT_CONTACT_DEV_MODE_CONFIG, deliveryTestMode: 'local-function' as const }
    expect(shouldSimulateIntakeStage(config, 'deliver', false)).toBe(false)
  })

  it('never simulates a stage in production even if client state is forged', () => {
    const config = {
      ...DEFAULT_CONTACT_DEV_MODE_CONFIG,
      aiSource: 'simulate-unavailable' as const,
      deliveryTestMode: 'simulate-fail-exhausted' as const,
    }
    expect(shouldSimulateIntakeStage(config, 'gap-check', true)).toBe(false)
    expect(shouldSimulateIntakeStage(config, 'recap', true)).toBe(false)
    expect(shouldSimulateIntakeStage(config, 'deliver', true)).toBe(false)
  })
})
