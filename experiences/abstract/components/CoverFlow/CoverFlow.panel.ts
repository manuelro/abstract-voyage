import { defineConfigScope } from '../../../../components/Panel/config';
import { DEFAULT_COVER_FLOW_CONFIG, type CoverFlowConfig } from './CoverFlow.config';

export const COVER_FLOW_SCOPE_ID = 'abstract/coverFlow' as const;

// Same min/max CoverFlow.config.ts's own normalizer clamps to — kept in
// sync by hand, same convention pages/carousel-lab.panel.ts (this scope's
// own promotion source) already uses.
const CARD_DISTANCE_FIELD_BASE = { kind: 'number' as const, min: 0.2, max: 1.5, step: 0.01 };
const CARD_WIDTH_FIELD_BASE = { kind: 'number' as const, min: 0.1, max: 1, step: 0.01 };

const whenStaggeredCardRevealEnabled = (config: Readonly<CoverFlowConfig>) => (
  config.staggeredCardRevealEnabled
);

// Local catalog, same "each panel.ts keeps its own copy" convention
// AboutTimeline.panel.ts's own MOTION_EASING_OPTIONS already follows — no
// shared CSS-easing-curve catalog exists yet for this codebase's config
// scopes to draw from.
const STAGGERED_REVEAL_EASING_OPTIONS = [
  { label: 'LUXURY (default)', value: 'cubic-bezier(0.19, 1, 0.22, 1)' },
  { label: 'LINEAR', value: 'linear' },
  { label: 'EASE OUT', value: 'ease-out' },
  { label: 'STANDARD', value: 'cubic-bezier(0.4, 0, 0.2, 1)' },
] as const;

export const COVER_FLOW_PANEL = defineConfigScope<CoverFlowConfig>({
  id: COVER_FLOW_SCOPE_ID,
  component: 'CoverFlow',
  scope: 'geometry',
  title: 'CoverFlow geometry',
  createdAt: '2026-09-01',
  summary: 'Card distance and card size (per breakpoint), perspective, rotation, depth, and gesture thresholds',
  defaultOpen: true,
  defaultValue: DEFAULT_COVER_FLOW_CONFIG,
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
              description: 'Fraction of the available container width the active card fills at this tier.',
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
    {
      kind: 'group',
      label: 'Perspective & rotation (all breakpoints)',
      fields: [
        {
          kind: 'number',
          key: 'perspectivePx',
          label: 'Perspective',
          description: 'CSS perspective, px. Lower = stronger 3D depth/foreshortening, higher = flatter.',
          min: 200,
          max: 4000,
          step: 10,
          unit: 'px',
        },
        {
          kind: 'number',
          key: 'perspectiveOriginXPercent',
          label: 'Perspective origin — X',
          description: 'CSS perspective-origin X, percent of the coverflow container\'s own box. 50 is dead center.',
          min: -50,
          max: 150,
          step: 1,
          unit: '%',
        },
        {
          kind: 'number',
          key: 'perspectiveOriginYPercent',
          label: 'Perspective origin — Y',
          description: 'CSS perspective-origin Y, percent of the coverflow container\'s own box. 50 is dead center.',
          min: -50,
          max: 150,
          step: 1,
          unit: '%',
        },
        {
          kind: 'number',
          key: 'rotationDeg',
          label: 'Neighbour rotation',
          description: 'Y-axis rotation applied to neighbour cards, degrees.',
          min: 0,
          max: 90,
          step: 1,
          unit: 'deg',
        },
        {
          kind: 'number',
          key: 'inactiveCardColumnDarkeningStep',
          label: 'Inactive card column darkening step',
          description: 'Opt-in: each inactive card position adds this blend step toward the resolved column color. Zero disables it; larger values make the change between cards stronger and cap the outer cards at the column color.',
          min: 0,
          max: 1,
          step: 0.01,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Depth & size floor',
      fields: [
        {
          kind: 'number',
          key: 'depthPxAtReferenceWidth',
          label: 'Neighbour depth',
          description: 'Closest neighbour\'s own translateZ magnitude at referenceWidthPx — scales with the resolved card width.',
          min: 0,
          max: 2000,
          step: 10,
          unit: 'px',
        },
        {
          kind: 'number',
          key: 'referenceWidthPx',
          label: 'Reference card width',
          description: 'The card width Neighbour depth is defined relative to.',
          min: 50,
          max: 1000,
          step: 1,
          unit: 'px',
        },
        {
          kind: 'number',
          key: 'minCardWidthPx',
          label: 'Minimum card width',
          description: 'Legibility floor — the resolved card width never goes below this.',
          min: 50,
          max: 500,
          step: 1,
          unit: 'px',
        },
        {
          kind: 'number',
          key: 'cardAspectRatio',
          label: 'Card aspect ratio',
          description: 'Height / width the resolved card height is derived from.',
          min: 0.2,
          max: 5,
          step: 0.01,
        },
        {
          kind: 'number',
          key: 'stackSpacingToCenterGapRatio',
          label: 'Further-neighbour spacing ratio',
          description: 'stackSpacing / centerGap — how tightly further-out neighbours pack relative to the first neighbour.',
          min: 0,
          max: 2,
          step: 0.01,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Gestures',
      fields: [
        { kind: 'boolean', key: 'enableClickToSnap', label: 'Click neighbour to snap' },
        { kind: 'boolean', key: 'enableScroll', label: 'Wheel navigation' },
        {
          kind: 'number',
          key: 'scrollThresholdPx',
          label: 'Wheel threshold',
          description: 'Accumulated wheel delta required before the active index advances.',
          min: 10,
          max: 1000,
          step: 10,
          unit: 'px',
        },
        {
          kind: 'number',
          key: 'clickVsDragThresholdPx',
          label: 'Click vs. drag threshold',
          description: 'Pointer travel beyond which a gesture is treated as a drag rather than a tap.',
          min: 1,
          max: 50,
          step: 1,
          unit: 'px',
        },
      ],
    },
    {
      kind: 'group',
      label: 'Active card reveal',
      fields: [
        {
          kind: 'number',
          key: 'activeSettleDelayMs',
          label: 'Settle delay',
          description: 'How long after a card becomes active before it\'s considered settled — the point the meta row (and, if staggered reveal is on below, every other element) starts fading in. Approximates the snap spring\'s own settle time.',
          min: 0,
          max: 3000,
          step: 10,
          unit: 'ms',
          integer: true,
        },
        {
          kind: 'boolean',
          key: 'staggeredCardRevealEnabled',
          label: 'Staggered element reveal',
          description: 'Controls entrance rhythm only. Off: all card information fades in together after settle. On: topic, meta, title, excerpt, and CTA fade in as a deliberate stagger. Exit always uses the shared Exit controls below.',
        },
        {
          kind: 'number',
          key: 'staggeredCardRevealStepMs',
          label: 'Stagger step',
          description: 'Spacing between each successive element\'s own start in the sequence: topic → date/reading time → title → excerpt → CTA.',
          min: 0,
          max: 1000,
          step: 10,
          unit: 'ms',
          integer: true,
          visibleWhen: whenStaggeredCardRevealEnabled,
        },
        {
          kind: 'number',
          key: 'staggeredCardRevealElementDurationMs',
          label: 'Stagger element duration',
          description: 'Each element\'s own fade-in duration — shared across every element in the sequence; only the delay is staggered per element.',
          min: 0,
          max: 3000,
          step: 10,
          unit: 'ms',
          integer: true,
          visibleWhen: whenStaggeredCardRevealEnabled,
        },
        {
          kind: 'select',
          key: 'staggeredCardRevealEasingCss',
          label: 'Stagger easing',
          description: 'Shared CSS easing for the staggered sequence.',
          options: STAGGERED_REVEAL_EASING_OPTIONS,
          visibleWhen: whenStaggeredCardRevealEnabled,
        },
        {
          kind: 'number',
          key: 'cardRevealExitDelayMs',
          label: 'Exit delay',
          description: 'Leaving never staggers, regardless of "Staggered element reveal" above — every element (meta row, title, excerpt, CTA alike) fades out together as one motion the instant a card stops being active/settled. This delay applies to that shared exit motion, not to any individual element.',
          min: 0,
          max: 2000,
          step: 10,
          unit: 'ms',
          integer: true,
        },
        {
          kind: 'number',
          key: 'cardRevealExitDurationMs',
          label: 'Exit duration',
          description: 'Duration of the shared, non-staggered exit fade above.',
          min: 0,
          max: 3000,
          step: 10,
          unit: 'ms',
          integer: true,
        },
        {
          kind: 'select',
          key: 'cardRevealExitEasingCss',
          label: 'Exit easing',
          description: 'CSS easing for the shared, non-staggered exit fade above.',
          options: STAGGERED_REVEAL_EASING_OPTIONS,
        },
      ],
    },
  ],
  copy: {
    targetFile: 'experiences/abstract/components/CoverFlow/CoverFlow.config.ts',
    targetSymbol: 'DEFAULT_COVER_FLOW_CONFIG',
    targetType: 'CoverFlowConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
