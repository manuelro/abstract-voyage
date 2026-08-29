import { defineConfigScope } from '../../components/Panel/config';
import {
  DEFAULT_CONTACT_DEV_MODE_CONFIG,
  type ContactDevModeConfig,
} from './ContactDevMode.config';

export const CONTACT_DEV_MODE_SCOPE_ID = 'ContactDevMode/network-simulation' as const;

export const CONTACT_DEV_MODE_PANEL = defineConfigScope<ContactDevModeConfig>({
  id: CONTACT_DEV_MODE_SCOPE_ID,
  component: 'ContactDevMode',
  scope: 'network-simulation',
  title: 'Dev mode — network simulation',
  createdAt: '2026-07-23',
  summary: 'Force each gap-check/recap/deliver branch without a real API call',
  // Off (closed) by default, unlike the main layout scope — this is a
  // niche, occasionally-used debug tool, not something every editing
  // session needs open.
  defaultOpen: false,
  defaultValue: DEFAULT_CONTACT_DEV_MODE_CONFIG,
  fields: [
    {
      // 'select' over 'enum': 7 options with multi-word descriptive labels
      // are past SegmentedControl's comfortable ~6-8-option ceiling (see
      // AGENTS.md) — this page's own LEFT/CENTER enum is the contrast case
      // for when a short button row is still the right call.
      kind: 'select',
      key: 'scenario',
      label: 'Scenario',
      description: 'Resolves postIntake from a fabricated response instead of the real Netlify function. "Live" (default) leaves the real network path untouched. Degraded/delivery-fail scenarios still run through the real client-side retry ceiling (Auto-retry delay × Auto-retry ceiling, in the Retry group above) — turn those down for faster iteration.',
      options: [
        { label: 'Live (real network)', value: 'live' },
        { label: 'Happy — no follow-up', value: 'happy-no-followup' },
        { label: 'Happy — with follow-up', value: 'happy-with-followup' },
        { label: 'Insufficiency stop', value: 'insufficiency-stop' },
        { label: 'Degraded (AI unavailable)', value: 'degraded' },
        { label: 'Delivery fails then recovers', value: 'delivery-fail-recover' },
        { label: 'Delivery fails, exhausts retries', value: 'delivery-fail-exhausted' },
      ],
    },
    {
      kind: 'number',
      key: 'simulatedLatencyMs',
      label: 'Simulated latency',
      description: 'Stand-in round-trip delay before a simulated stage resolves.',
      min: 0,
      max: 5000,
      step: 50,
      integer: true,
      unit: 'ms',
      visibleWhen: config => config.scenario !== 'live',
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
