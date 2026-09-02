import { defineConfigScope } from '../components/Panel/config';
import {
  DEFAULT_CAROUSEL_LAB_CONFIG,
  type CarouselLabConfig,
} from './carousel-lab.config';

export const CAROUSEL_LAB_SCOPE_ID = 'carousel-lab/coverflow' as const;

// Same min/max carousel-lab.config.ts's own normalizer clamps to — kept in
// sync by hand (this file already imports that module for DEFAULT_*, not
// worth a third export just for two numbers two files ever read).
const CARD_DISTANCE_RATIO_MIN = 0.2;
const CARD_DISTANCE_RATIO_MAX = 1.5;
const CARD_DISTANCE_FIELD_BASE = {
  kind: 'number' as const,
  min: CARD_DISTANCE_RATIO_MIN,
  max: CARD_DISTANCE_RATIO_MAX,
  step: 0.01,
};
const CARD_WIDTH_RATIO_MIN = 0.1;
const CARD_WIDTH_RATIO_MAX = 1;
const CARD_WIDTH_FIELD_BASE = {
  kind: 'number' as const,
  min: CARD_WIDTH_RATIO_MIN,
  max: CARD_WIDTH_RATIO_MAX,
  step: 0.01,
};

export const CAROUSEL_LAB_PANEL = defineConfigScope<CarouselLabConfig>({
  id: CAROUSEL_LAB_SCOPE_ID,
  component: 'carousel-lab',
  scope: 'coverflow',
  title: 'Coverflow geometry',
  createdAt: '2026-09-01',
  summary: 'Card distance and card size (per breakpoint), perspective and its origin',
  defaultOpen: true,
  defaultValue: DEFAULT_CAROUSEL_LAB_CONFIG,
  fields: [
    {
      kind: 'tabs',
      tabs: [
        {
          id: 'mobile',
          label: 'MOBILE (< 768px)',
          fields: [
            {
              ...CARD_DISTANCE_FIELD_BASE,
              key: 'cardDistanceRatio',
              label: 'Card distance',
              description: 'centerGap / cardWidth ratio at this tier — how far the active card\'s first neighbour sits from it. Lower = closer/more overlap, higher = farther apart.',
            },
            {
              ...CARD_WIDTH_FIELD_BASE,
              key: 'cardWidthRatio',
              label: 'Card size',
              description: 'Fraction of the available container width the active card fills at this tier — no fixed pixel ceiling, so the ratio itself is the real size, not silently overridden above some hardcoded width.',
            },
          ],
        },
        {
          id: 'tablet',
          label: 'TABLET (≥ 768px)',
          fields: [
            {
              ...CARD_DISTANCE_FIELD_BASE,
              key: 'cardDistanceRatioMd',
              label: 'Card distance (≥ tablet)',
              description: 'Same ratio as Mobile\'s Card distance, independently tunable for this tier.',
            },
            {
              ...CARD_WIDTH_FIELD_BASE,
              key: 'cardWidthRatioMd',
              label: 'Card size (≥ tablet)',
              description: 'Same ratio as Mobile\'s Card size, independently tunable for this tier.',
            },
          ],
        },
        {
          id: 'desktop',
          label: 'DESKTOP (≥ 1024px)',
          fields: [
            {
              ...CARD_DISTANCE_FIELD_BASE,
              key: 'cardDistanceRatioLg',
              label: 'Card distance (≥ desktop)',
              description: 'Same ratio as Mobile\'s Card distance, independently tunable for this tier.',
            },
            {
              ...CARD_WIDTH_FIELD_BASE,
              key: 'cardWidthRatioLg',
              label: 'Card size (≥ desktop)',
              description: 'Same ratio as Mobile\'s Card size, independently tunable for this tier.',
            },
          ],
        },
      ],
    },
    // Deliberately outside the tabs above — these two are one shared value
    // across every breakpoint (see each field's own description), not a
    // per-tier split like Card distance/Card size.
    {
      kind: 'group',
      label: 'Perspective (all breakpoints)',
      fields: [
        {
          kind: 'number',
          key: 'perspectivePx',
          label: 'Perspective',
          description: 'CSS perspective, px. Lower = stronger 3D depth/foreshortening (closer virtual camera), higher = flatter. One shared value, not scaled per breakpoint — an operator tuning this owns the depth/size tradeoff directly.',
          min: 200,
          max: 4000,
          step: 10,
          unit: 'px',
        },
        {
          kind: 'number',
          key: 'perspectiveOriginXPercent',
          label: 'Perspective origin — X',
          description: 'CSS perspective-origin X, percent of the coverflow container\'s own box. 50 is dead center (CSS\'s own default).',
          min: -50,
          max: 150,
          step: 1,
          unit: '%',
        },
        {
          kind: 'number',
          key: 'perspectiveOriginYPercent',
          label: 'Perspective origin — Y',
          description: 'CSS perspective-origin Y, percent of the coverflow container\'s own box. 50 is dead center (CSS\'s own default).',
          min: -50,
          max: 150,
          step: 1,
          unit: '%',
        },
      ],
    },
  ],
  copy: {
    targetFile: 'pages/carousel-lab.config.ts',
    targetSymbol: 'DEFAULT_CAROUSEL_LAB_CONFIG',
    targetType: 'CarouselLabConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
