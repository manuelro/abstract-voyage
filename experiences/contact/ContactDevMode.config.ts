/**
 * Forces GuidedIntake's postIntake (pages/contact.tsx) to resolve from a
 * fabricated response instead of the real Netlify function, so every
 * terminal/branch path audited for this flow can be exercised on demand
 * during development. 'live' leaves the real network path untouched and is
 * the only value that should ever ship as the default — the whole panel is
 * already gated to non-production builds (see pages/contact.tsx's
 * showAuthoringTools), and postIntake's own simulate branch re-checks
 * NODE_ENV independently as a second gate.
 */
export type ContactIntakeScenario =
  | 'live'
  | 'happy-no-followup'
  | 'happy-with-followup'
  | 'insufficiency-stop'
  | 'degraded'
  | 'delivery-fail-recover'
  | 'delivery-fail-exhausted';

export type ContactDevModeConfig = {
  scenario: ContactIntakeScenario;
  /** Stand-in round-trip delay before a simulated stage resolves. Only used
   * while scenario is not 'live'. */
  simulatedLatencyMs: number;
};

export const DEFAULT_CONTACT_DEV_MODE_CONFIG: ContactDevModeConfig = {
  scenario: 'live',
  simulatedLatencyMs: 900,
};
