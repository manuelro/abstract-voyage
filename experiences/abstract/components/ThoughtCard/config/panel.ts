import { defineConfigScope } from '../../../../../components/Panel/config'
import {
  DEFAULT_THOUGHT_CARD_CONFIG,
  type ThoughtCardConfig,
} from './registered'

export const THOUGHT_CARD_SCOPE_ID = 'ThoughtCard/appearance' as const
export const THOUGHT_CARD_PANEL = defineConfigScope<ThoughtCardConfig>({
  id: THOUGHT_CARD_SCOPE_ID,
  component: 'ThoughtCard',
  scope: 'appearance',
  title: 'Thought Card appearance',
  createdAt: '2026-09-02',
  defaultOpen: false,
  summary: 'One proportional card at compact and amplified scales',
  defaultValue: DEFAULT_THOUGHT_CARD_CONFIG,
  copy: {
    targetFile: 'experiences/abstract/components/ThoughtCard/config/registered.ts',
    targetSymbol: 'DEFAULT_THOUGHT_CARD_CONFIG',
    targetType: 'ThoughtCardConfig',
    updateStrategy: 'merge',
    completeScope: false,
  },
  fields: [
    { kind: 'number', key: 'compactRootSizePx', label: 'Compact root size', min: 160, max: 640, step: 8, unit: 'px' },
    { kind: 'number', key: 'amplifiedRootSizePx', label: 'Amplified root size', min: 320, max: 900, step: 8, unit: 'px' },
    { kind: 'number', key: 'paddingRatioCqw', label: 'Padding ratio', min: 2, max: 20, step: 0.1, unit: 'cqw' },
    { kind: 'number', key: 'titleRatioCqw', label: 'Title ratio', min: 2, max: 10, step: 0.1, unit: 'cqw' },
    { kind: 'number', key: 'descriptionRatioCqw', label: 'Description ratio', min: 2, max: 8, step: 0.1, unit: 'cqw' },
  ],
})
