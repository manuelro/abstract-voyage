import { defineConfigScope } from '../../components/Panel/config';
import {
  DEFAULT_CONTACT_EXPERIENCE_CONFIG,
  type ContactExperienceConfig,
} from './ContactExperience.config';

export const CONTACT_EXPERIENCE_SCOPE_ID = 'ContactExperience/layout-and-feedback' as const;

export const CONTACT_EXPERIENCE_PANEL = defineConfigScope<ContactExperienceConfig>({
  id: CONTACT_EXPERIENCE_SCOPE_ID,
  component: 'ContactExperience',
  scope: 'layout-and-feedback',
  title: 'Contact experience',
  summary: 'Composition · typography · rhythm · response feedback',
  defaultOpen: true,
  defaultValue: DEFAULT_CONTACT_EXPERIENCE_CONFIG,
  fields: [
    {
      kind: 'group',
      label: 'Composition',
      fields: [
        { kind: 'number', key: 'contentMaxWidthPx', label: 'Content width', min: 920, max: 1440, step: 8, unit: 'px', integer: true },
        { kind: 'number', key: 'conversationMaxWidthPx', label: 'Conversation width', min: 420, max: 720, step: 4, unit: 'px', integer: true },
        { kind: 'number', key: 'desktopColumnGapPx', label: 'Desktop column gap', min: 32, max: 176, step: 4, unit: 'px', integer: true },
        { kind: 'number', key: 'opticalOffsetYVh', label: 'Optical Y offset', min: -8, max: 8, step: 0.5, unit: 'svh' },
        { kind: 'number', key: 'mobileInsetPx', label: 'Mobile inset', min: 16, max: 40, step: 1, unit: 'px', integer: true },
        { kind: 'number', key: 'messageMeasureCh', label: 'Message measure', min: 32, max: 64, step: 1, unit: 'ch', integer: true },
        { kind: 'number', key: 'conversationViewportHeightPx', label: 'Conversation height', min: 220, max: 560, step: 8, unit: 'px', integer: true },
      ],
    },
    {
      kind: 'group',
      label: 'Typography',
      fields: [
        { kind: 'number', key: 'baseTextSizePx', label: 'Base size', min: 14, max: 20, step: 0.5, unit: 'px' },
        { kind: 'number', key: 'conversationTextSizePx', label: 'Message size', min: 16, max: 24, step: 0.5, unit: 'px' },
        { kind: 'number', key: 'lineHeight', label: 'Line height', min: 1.25, max: 1.75, step: 0.01, unit: 'x' },
        { kind: 'number', key: 'mutedTextOpacity', label: 'Muted opacity', min: 0.35, max: 0.85, step: 0.01 },
      ],
    },
    {
      kind: 'group',
      label: 'Rhythm and controls',
      fields: [
        { kind: 'number', key: 'messageGapPx', label: 'Message gap', min: 10, max: 36, step: 1, unit: 'px', integer: true },
        { kind: 'number', key: 'controlGapPx', label: 'Control gap', min: 6, max: 28, step: 1, unit: 'px', integer: true },
        { kind: 'number', key: 'actionGapPx', label: 'Action gap', min: 4, max: 24, step: 1, unit: 'px', integer: true },
        { kind: 'number', key: 'chipHeightPx', label: 'Chip height', min: 40, max: 56, step: 1, unit: 'px', integer: true },
        { kind: 'number', key: 'chipPaddingXPx', label: 'Chip padding', min: 12, max: 30, step: 1, unit: 'px', integer: true },
        { kind: 'number', key: 'activeChipOpacity', label: 'Active chip opacity', min: 0.04, max: 0.28, step: 0.01 },
        { kind: 'boolean', key: 'showProgress', label: 'Show progress' },
      ],
    },
    {
      kind: 'group',
      label: 'Response feedback',
      fields: [
        { kind: 'boolean', key: 'loadingEffectEnabled', label: 'Loading feedback' },
        {
          kind: 'enum',
          key: 'loadingLabelMode',
          label: 'Loading label',
          options: [
            { label: 'Thinking', value: 'thinking' },
            { label: 'Submitted message', value: 'submitted-message' },
          ],
          visibleWhen: config => config.loadingEffectEnabled,
        },
        {
          kind: 'enum',
          key: 'loadingEffectStyle',
          label: 'Loading effect',
          options: [
            { label: 'Shimmer', value: 'shimmer' },
            { label: 'Pulse', value: 'pulse' },
            { label: 'Static', value: 'static' },
          ],
          visibleWhen: config => config.loadingEffectEnabled,
        },
        { kind: 'number', key: 'loadingShimmerDurationMs', label: 'Effect duration', min: 700, max: 3200, step: 50, unit: 'ms', integer: true, visibleWhen: config => config.loadingEffectEnabled && config.loadingEffectStyle !== 'static' },
        { kind: 'number', key: 'loadingMinimumVisibleMs', label: 'Minimum feedback', min: 0, max: 1200, step: 20, unit: 'ms', integer: true, visibleWhen: config => config.loadingEffectEnabled },
        { kind: 'number', key: 'messageEntryDurationMs', label: 'Message entrance', min: 0, max: 700, step: 20, unit: 'ms', integer: true },
      ],
    },
    {
      kind: 'group',
      label: 'Palette',
      fields: [
        { kind: 'color', key: 'primaryTextColor', label: 'Primary text' },
        { kind: 'color', key: 'mutedTextColor', label: 'Muted text' },
        { kind: 'color', key: 'borderColor', label: 'Control border' },
        { kind: 'color', key: 'loadingBaseColor', label: 'Loading base' },
        { kind: 'color', key: 'loadingHighlightColor', label: 'Loading highlight' },
      ],
    },
  ],
  copy: {
    targetFile: 'experiences/contact/ContactExperience.config.ts',
    targetSymbol: 'DEFAULT_CONTACT_EXPERIENCE_CONFIG',
    targetType: 'ContactExperienceConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
