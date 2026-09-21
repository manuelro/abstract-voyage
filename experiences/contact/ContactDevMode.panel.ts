import { defineConfigScope } from '../../components/Panel/config';
import {
  DEFAULT_CONTACT_DEV_MODE_CONFIG,
  type ContactDevModeConfig,
} from './ContactDevMode.config';

export const CONTACT_DEV_MODE_SCOPE_ID = 'ContactDevMode/intake-testing' as const;

export const CONTACT_DEV_MODE_PANEL = defineConfigScope<ContactDevModeConfig>({
  id: CONTACT_DEV_MODE_SCOPE_ID,
  component: 'ContactDevMode',
  scope: 'intake-testing',
  title: 'Intake test mode',
  createdAt: '2026-07-23',
  summary: 'Choose live AI or deterministic responses, separately from delivery testing',
  // Off (closed) by default, unlike the main layout scope — this is a
  // niche, occasionally-used debug tool, not something every editing
  // session needs open.
  defaultOpen: false,
  defaultValue: DEFAULT_CONTACT_DEV_MODE_CONFIG,
  fields: [
    {
      kind: 'select',
      key: 'aiSource',
      label: 'AI response source',
      description: 'Live AI Gateway sends gap-check and recap through Netlify Dev to the configured Gemini Gateway and consumes credits. It requires Netlify Dev, not npm run dev. Every simulated choice stays in the browser and never calls the intake function.',
      options: [
        { label: 'Live AI Gateway (Netlify Dev required)', value: 'live-gateway' },
        { label: 'Simulate — enough context', value: 'simulate-no-followup' },
        { label: 'Simulate — follow-up questions', value: 'simulate-followup' },
        { label: 'Simulate — AI unavailable', value: 'simulate-unavailable' },
      ],
    },
    {
      kind: 'select',
      key: 'deliveryTestMode',
      label: 'Delivery behavior',
      description: 'Independent of the AI choice above. Simulated success is the safe default for testing the full agent flow with real AI but no email. Local function reaches the configured local delivery transport; use it only with a local SMTP sink or intentional test recipient.',
      options: [
        { label: 'Simulate — success (safe default)', value: 'simulate-success' },
        { label: 'Simulate — fails then recovers', value: 'simulate-fail-recover' },
        { label: 'Simulate — fails, exhausts retries', value: 'simulate-fail-exhausted' },
        { label: 'Local function (SMTP/sink)', value: 'local-function' },
      ],
    },
    {
      kind: 'number',
      key: 'simulatedLatencyMs',
      label: 'Simulated latency',
      description: 'Stand-in round-trip delay before a simulated AI or delivery stage resolves.',
      min: 0,
      max: 5000,
      step: 50,
      integer: true,
      unit: 'ms',
      visibleWhen: config => config.aiSource !== 'live-gateway' || config.deliveryTestMode !== 'local-function',
    },
  ],
  copy: {
    targetFile: 'experiences/contact/ContactDevMode.config.ts',
    targetSymbol: 'DEFAULT_CONTACT_DEV_MODE_CONFIG',
    targetType: 'ContactDevModeConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
