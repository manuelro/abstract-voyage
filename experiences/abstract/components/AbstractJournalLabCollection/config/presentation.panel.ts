import { defineConfigScope } from '../../../../../components/Panel/config';
import {
  DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG,
  type AbstractJournalLabCollectionConfig,
} from './presentation';

export const ABSTRACT_JOURNAL_LAB_COLLECTION_SCOPE_ID =
  'AbstractJournalLabCollection/presentation' as const;

const whenEnabled = (config: Readonly<AbstractJournalLabCollectionConfig>) =>
  config.enabled;
const whenFlipEnabled = (
  config: Readonly<AbstractJournalLabCollectionConfig>,
) => config.enabled && config.presentationMode === 'flip';
const whenFadeEnabled = (
  config: Readonly<AbstractJournalLabCollectionConfig>,
) => config.enabled && config.presentationMode === 'hue-fade-through';

export const ABSTRACT_JOURNAL_LAB_COLLECTION_PANEL =
  defineConfigScope<AbstractJournalLabCollectionConfig>({
    id: ABSTRACT_JOURNAL_LAB_COLLECTION_SCOPE_ID,
    component: 'AbstractJournalLabCollection',
    scope: 'presentation',
    title: 'Journal / labs transition',
    createdAt: '2026-07-28',
    summary: 'Opt-in tabs · 3D flip or persistent hue fade-through',
    defaultOpen: false,
    defaultValue: DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG,
    fields: [
      {
        kind: 'boolean',
        key: 'enabled',
        label: 'Combined journal/labs',
        description: 'Places lab cards behind journal cards and replaces the standalone Labs section.',
      },
      {
        kind: 'enum',
        key: 'initialView',
        label: 'Initial view',
        visibleWhen: whenEnabled,
        options: [
          { label: 'ARTICLES', value: 'articles' },
          { label: 'LABS', value: 'labs' },
        ],
      },
      {
        kind: 'enum',
        key: 'presentationMode',
        label: 'Presentation',
        description:
          'Choose the existing two-face 3D flip or keep one card surface mounted while its information and hue treatment fade through.',
        visibleWhen: whenEnabled,
        options: [
          { label: '3D FLIP', value: 'flip' },
          { label: 'HUE FADE-THROUGH', value: 'hue-fade-through' },
        ],
      },
      {
        kind: 'number',
        key: 'flipDurationMs',
        label: 'Flip duration',
        min: 200,
        max: 1400,
        step: 20,
        unit: 'ms',
        integer: true,
        visibleWhen: whenFlipEnabled,
      },
      {
        kind: 'number',
        key: 'flipOverlapMs',
        label: 'Wave overlap',
        description:
          'Horizontal-neighbor start interval is duration minus overlap; row timing follows a 45° spatial wave.',
        min: 0,
        max: 1400,
        step: 20,
        unit: 'ms',
        integer: true,
        visibleWhen: whenFlipEnabled,
      },
      {
        kind: 'enum',
        key: 'flipEasing',
        label: 'Flip easing',
        visibleWhen: whenFlipEnabled,
        options: [
          { label: 'STANDARD', value: 'standard' },
          { label: 'SMOOTH', value: 'smooth' },
          { label: 'CINEMATIC', value: 'cinematic' },
          { label: 'LUXURY', value: 'luxury' },
        ],
      },
      {
        kind: 'number',
        key: 'perspectivePx',
        label: 'Perspective',
        description:
          'Minimum depth for the parent-owned 3D scene. Responsive safety floors prevent edge-on card stretching.',
        min: 1600,
        max: 8000,
        step: 100,
        unit: 'px',
        integer: true,
        visibleWhen: whenFlipEnabled,
      },
      {
        kind: 'number',
        key: 'contentFadeDurationMs',
        label: 'Content fade duration',
        description:
          'Card information (title/excerpt/meta/CTA) fades out over this duration before the color change starts, then fades back in over the same duration once the color has settled — phases 1 and 3 of the transition.',
        min: 120,
        max: 900,
        step: 20,
        unit: 'ms',
        integer: true,
        visibleWhen: whenFadeEnabled,
      },
      {
        kind: 'number',
        key: 'fadeDurationMs',
        label: 'Color transition duration',
        description:
          'Duration of the perceptual hue transition alone (phase 2), once the card information has fully faded out. Runs after content fade-duration, before it fades back in — sequential, not shared with the content fade.',
        min: 240,
        max: 1800,
        step: 20,
        unit: 'ms',
        integer: true,
        visibleWhen: whenFadeEnabled,
      },
      {
        kind: 'enum',
        key: 'fadeEasing',
        label: 'Fade easing',
        description:
          'One easing preset drives all three phases: content fade-out, hue interpolation, and content fade-in.',
        visibleWhen: whenFadeEnabled,
        options: [
          { label: 'STANDARD', value: 'standard' },
          { label: 'SOFT EXPO', value: 'soft-expo' },
          { label: 'VISCOUS', value: 'viscous' },
          { label: 'SETTLE', value: 'settle' },
          { label: 'LUXURY', value: 'luxury' },
        ],
      },
    ],
    copy: {
      targetFile:
        'experiences/abstract/components/AbstractJournalLabCollection/config/presentation.ts',
      targetSymbol: 'DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG',
      targetType: 'AbstractJournalLabCollectionConfig',
      updateStrategy: 'replace_scope',
      completeScope: true,
    },
  });
