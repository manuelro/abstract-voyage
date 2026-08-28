import {
  ABSTRACT_POST_DOCK_EASING_PRESET_CSS,
  type AbstractPostDockEasingPreset,
} from '../../AbstractPostDock/config/registered';

export type AbstractJournalLabCollectionView = 'articles' | 'labs';
export type AbstractJournalLabCollectionPresentationMode =
  | 'flip'
  | 'hue-fade-through';

export type AbstractJournalLabFlipEasing =
  | 'standard'
  | 'smooth'
  | 'cinematic'
  | 'luxury';

export type AbstractJournalLabCollectionConfig = {
  enabled: boolean;
  initialView: AbstractJournalLabCollectionView;
  presentationMode: AbstractJournalLabCollectionPresentationMode;
  flipDurationMs: number;
  flipOverlapMs: number;
  flipEasing: AbstractJournalLabFlipEasing;
  perspectivePx: number;
  /** Hue fade-through only. Duration of the perceptual hue transition
   * alone (phase 2 of 3) — no longer shared with the content fade; see
   * contentFadeDurationMs below for phases 1/3. The three phases run
   * strictly sequentially (content fades out fully, then the color
   * changes, then content fades back in), not concurrently. */
  fadeDurationMs: number;
  /** Hue fade-through only. Duration of the content opacity fade — used
   * for both phase 1 (fade-out, before the color change starts) and
   * phase 3 (fade-in, after the color change settles). Symmetric: neither
   * direction is specified differently. */
  contentFadeDurationMs: number;
  fadeEasing: AbstractPostDockEasingPreset;
};

export const ABSTRACT_JOURNAL_LAB_FLIP_EASING_CSS:
Record<AbstractJournalLabFlipEasing, string> = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  smooth: 'cubic-bezier(0.37, 0, 0.63, 1)',
  cinematic: 'cubic-bezier(0.4, 0, 0.2, 1)',
  luxury: 'cubic-bezier(0.19, 1, 0.22, 1)',
};

export const DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG = {
  enabled: true,
  initialView: 'articles',
  presentationMode: 'hue-fade-through',
  flipDurationMs: 680,
  flipOverlapMs: 600,
  flipEasing: 'cinematic',
  perspectivePx: 4200,
  fadeDurationMs: 760,
  contentFadeDurationMs: 320,
  fadeEasing: 'viscous',
} satisfies AbstractJournalLabCollectionConfig;

const VIEW_VALUES = new Set<AbstractJournalLabCollectionView>([
  'articles',
  'labs',
]);

const PRESENTATION_MODE_VALUES =
  new Set<AbstractJournalLabCollectionPresentationMode>([
    'flip',
    'hue-fade-through',
  ]);

const EASING_VALUES = new Set<AbstractJournalLabFlipEasing>([
  'standard',
  'smooth',
  'cinematic',
  'luxury',
]);

const FADE_EASING_VALUES = new Set<AbstractPostDockEasingPreset>(
  Object.keys(ABSTRACT_POST_DOCK_EASING_PRESET_CSS) as
    AbstractPostDockEasingPreset[],
);

const finiteOr = (value: number | undefined, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function normalizeAbstractJournalLabCollectionConfig(
  config?: Partial<AbstractJournalLabCollectionConfig> | null,
): AbstractJournalLabCollectionConfig {
  const base = {
    ...DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG,
    ...(config ?? {}),
  };
  const flipDurationMs = Math.round(clamp(
    finiteOr(
      base.flipDurationMs,
      DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG.flipDurationMs,
    ),
    200,
    1400,
  ));

  return {
    enabled: Boolean(base.enabled),
    initialView: VIEW_VALUES.has(base.initialView)
      ? base.initialView
      : DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG.initialView,
    presentationMode: PRESENTATION_MODE_VALUES.has(base.presentationMode)
      ? base.presentationMode
      : DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG.presentationMode,
    flipDurationMs,
    flipOverlapMs: Math.round(clamp(
      finiteOr(
        base.flipOverlapMs,
        DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG.flipOverlapMs,
      ),
      0,
      flipDurationMs,
    )),
    flipEasing: EASING_VALUES.has(base.flipEasing)
      ? base.flipEasing
      : DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG.flipEasing,
    perspectivePx: Math.round(clamp(
      finiteOr(
        base.perspectivePx,
        DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG.perspectivePx,
      ),
      1600,
      8000,
    )),
    fadeDurationMs: Math.round(clamp(
      finiteOr(
        base.fadeDurationMs,
        DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG.fadeDurationMs,
      ),
      240,
      1800,
    )),
    contentFadeDurationMs: Math.round(clamp(
      finiteOr(
        base.contentFadeDurationMs,
        DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG.contentFadeDurationMs,
      ),
      120,
      900,
    )),
    fadeEasing: FADE_EASING_VALUES.has(base.fadeEasing)
      ? base.fadeEasing
      : DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG.fadeEasing,
  };
}

export function resolveAbstractJournalLabFlipEasing(
  easing: AbstractJournalLabFlipEasing,
) {
  return ABSTRACT_JOURNAL_LAB_FLIP_EASING_CSS[easing] ??
    ABSTRACT_JOURNAL_LAB_FLIP_EASING_CSS.cinematic;
}
