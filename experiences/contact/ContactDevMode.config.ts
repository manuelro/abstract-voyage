/** Source for the AI-only stages (gap-check and recap). `live-gateway` calls
 * the locally proxied Netlify Function; every other value is deterministic
 * client simulation for interaction work. This is never an authority to
 * configure Gateway credentials or the provider — those remain environment
 * owned by the function. */
export type ContactAiSource =
  | 'live-gateway'
  | 'simulate-no-followup'
  | 'simulate-followup'
  | 'simulate-unavailable';

/** Delivery is deliberately independent from AI source. This lets a designer
 * experience real Gemini questioning/recaps while avoiding email delivery.
 * `local-function` is an explicit advanced choice for local SMTP-sink work. */
export type ContactDeliveryTestMode =
  | 'simulate-success'
  | 'simulate-fail-recover'
  | 'simulate-fail-exhausted'
  | 'local-function';

export type ContactIntakeStage = 'gap-check' | 'recap' | 'deliver';

export type ContactDevModeConfig = {
  aiSource: ContactAiSource;
  deliveryTestMode: ContactDeliveryTestMode;
  /** Stand-in round-trip delay before a simulated stage resolves. Only used
   * while the current stage is simulated. */
  simulatedLatencyMs: number;
};

export const DEFAULT_CONTACT_DEV_MODE_CONFIG: ContactDevModeConfig = {
  aiSource: 'live-gateway',
  deliveryTestMode: 'simulate-success',
  simulatedLatencyMs: 900,
};

/** The production guard lives alongside the development config so its stage
 * matrix can be tested without mounting the full contact page. A forged
 * browser value cannot simulate any stage in a production bundle. */
export const shouldSimulateIntakeStage = (
  config: ContactDevModeConfig,
  stage: ContactIntakeStage,
  isProduction: boolean,
) => {
  if (isProduction) return false;
  return stage === 'deliver'
    ? config.deliveryTestMode !== 'local-function'
    : config.aiSource !== 'live-gateway';
};
