import { defineConfigScope } from '../../../../components/Panel/config';
import {
  DEFAULT_COVER_FLOW_CONFIG,
  MAX_CARD_HEIGHT_PX_MAX,
  MAX_CARD_HEIGHT_PX_MIN,
  type CoverFlowConfig,
} from './CoverFlow.config';

export const COVER_FLOW_SCOPE_ID = 'abstract/coverFlow' as const;

// Same min/max CoverFlow.config.ts's own normalizer clamps to — kept in
// sync by hand, same convention pages/carousel-lab.panel.ts (this scope's
// own promotion source) already uses.
const CARD_DISTANCE_FIELD_BASE = { kind: 'number' as const, min: 0.2, max: 2.5, step: 0.01 };
const CARD_WIDTH_FIELD_BASE = { kind: 'number' as const, min: 0.1, max: 1, step: 0.01 };
const MAX_CARD_HEIGHT_FIELD_BASE = {
  kind: 'number' as const,
  min: MAX_CARD_HEIGHT_PX_MIN,
  max: MAX_CARD_HEIGHT_PX_MAX,
  step: 10,
  unit: 'px',
};
// PLAN-COVERFLOW-ACTIVE-CARD-LANDING-POSITION.md
const ACTIVE_CARD_LANDING_MODE_OPTIONS = [
  { label: 'CENTER', value: 'center' },
  { label: 'ANCHOR SHIFT', value: 'anchorShift' },
  { label: 'ACTIVE ONLY', value: 'activeOnly' },
] as const;
const ACTIVE_CARD_LANDING_X_PERCENT_FIELD_BASE = {
  kind: 'number' as const,
  min: 0,
  max: 100,
  step: 1,
  unit: '%',
};
// Same min/max CoverFlow.config.ts's own normalizer clamps to — kept in
// sync by hand, same convention CARD_DISTANCE_FIELD_BASE above follows.
const ROTATION_MAX_DEG_FIELD_BASE = { kind: 'number' as const, min: 0, max: 90, step: 1, unit: 'deg' };
const ROTATION_GROWTH_FIELD_BASE = { kind: 'number' as const, min: 0, max: 200, step: 1, unit: '%' };
const STACK_SPACING_RATIO_FIELD_BASE = { kind: 'number' as const, min: 0, max: 2, step: 0.01 };
const STACK_SPACING_GROWTH_FIELD_BASE = { kind: 'number' as const, min: -90, max: 200, step: 1, unit: '%' };

const whenStaggeredCardRevealEnabled = (config: Readonly<CoverFlowConfig>) => (
  config.staggeredCardRevealEnabled
);

const whenGaussianSettleMotion = (config: Readonly<CoverFlowConfig>) => (
  config.settleMotionCurve === 'gaussian'
);

const whenNarrowColumnGradientOnNavigateEnabled = (config: Readonly<CoverFlowConfig>) => (
  config.narrowColumnGradientOnNavigateEnabledLg
);

const whenRotationSpread = (config: Readonly<CoverFlowConfig>) => (
  config.rotationDistributionMode === 'spread'
);

const whenRotationCompounding = (config: Readonly<CoverFlowConfig>) => (
  config.rotationDistributionMode === 'compounding'
);

const ROTATION_PROGRESSION_OPTIONS = [
  { label: 'RECEDE', value: 'recede' },
  { label: 'INVERT', value: 'invert' },
] as const;

// PLAN-COVERFLOW-ACTIVE-CARD-LANDING-POSITION.md — one predicate per tier
// since each tier's landing mode is independently configurable.
const whenActiveCardLandingModeSet = (config: Readonly<CoverFlowConfig>) => (
  config.activeCardLandingMode !== 'center'
);
const whenActiveCardLandingModeMdSet = (config: Readonly<CoverFlowConfig>) => (
  config.activeCardLandingModeMd !== 'center'
);
const whenActiveCardLandingModeLgSet = (config: Readonly<CoverFlowConfig>) => (
  config.activeCardLandingModeLg !== 'center'
);

const SETTLE_MOTION_CURVE_OPTIONS = [
  { label: 'Spring (default)', value: 'spring' },
  { label: 'Gaussian', value: 'gaussian' },
] as const;

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
            {
              ...MAX_CARD_HEIGHT_FIELD_BASE,
              key: 'maxCardHeightPx',
              label: 'Max card height',
              description: 'Maximum card height on mobile. Width scales with height to preserve the aspect ratio. 0 removes the cap.',
            },
            {
              kind: 'enum',
              key: 'activeCardLandingMode',
              label: 'Active card landing',
              description: 'CENTER (default): today\'s behavior, unchanged. ANCHOR SHIFT: every card shifts together so the active card lands at the X position below, preserving spacing and revealing more cards on the freed side. ACTIVE ONLY: just the active card moves to that X position; every other card stays exactly where it is today.',
              options: ACTIVE_CARD_LANDING_MODE_OPTIONS,
            },
            {
              ...ACTIVE_CARD_LANDING_X_PERCENT_FIELD_BASE,
              key: 'activeCardLandingXPercent',
              label: 'Active card landing X',
              description: 'Where the active card lands, as a percent of the mobile container width. 50 is today\'s exact center. Only applies when Active card landing above is not CENTER.',
              visibleWhen: whenActiveCardLandingModeSet,
            },
            {
              ...ROTATION_MAX_DEG_FIELD_BASE,
              key: 'rotationMaxDeg',
              label: 'Maximum rotation',
              description: 'Rotation ceiling at this tier. In Recede mode, far cards approach it; in Invert mode, the immediate neighbour starts at it. Keep it below 90deg so cards remain visibly present.',
            },
            {
              ...ROTATION_GROWTH_FIELD_BASE,
              key: 'rotationDistanceGrowthPercent',
              label: 'Rotation growth by distance',
              description: 'Percentage multiplier between distance steps at this tier. Recede mode grows rotation outward; Invert mode divides rotation outward, flattening farther cards. 0 keeps each mode at its own endpoint.',
              visibleWhen: whenRotationCompounding,
            },
            {
              ...STACK_SPACING_RATIO_FIELD_BASE,
              key: 'stackSpacingToCenterGapRatio',
              label: 'Further-neighbour spacing ratio',
              description: 'stackSpacing / centerGap at this tier — how tightly further-out neighbours pack relative to the first neighbour.',
            },
            {
              ...STACK_SPACING_GROWTH_FIELD_BASE,
              key: 'stackSpacingGrowthPercent',
              label: 'Spacing growth by distance',
              description: 'Rhythmic distribution at this tier: each card past the immediate neighbour sits this percent FARTHER from the card one step closer to active than that card sits from the one before it, compounding — e.g. 38 makes the 3rd card\'s own gap from the 2nd 38% wider than the 2nd\'s gap from the 1st, the 4th wider again by the same 38%, and so on: a fanned-out rhythm rather than an even row. 0 (default): every step past the first neighbour uses the same fixed spacing (Further-neighbour spacing ratio above), today\'s behavior unchanged. Negative values pack further cards tighter instead of fanning them out.',
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
            {
              ...MAX_CARD_HEIGHT_FIELD_BASE,
              key: 'maxCardHeightPxMd',
              label: 'Max card height',
              description: 'Maximum card height on tablet only. Width scales with height to preserve the aspect ratio. 0 removes the cap.',
            },
            {
              kind: 'enum',
              key: 'activeCardLandingModeMd',
              label: 'Active card landing (≥ tablet)',
              description: 'Same behavior as Mobile\'s Active card landing, independently tunable for this tier.',
              options: ACTIVE_CARD_LANDING_MODE_OPTIONS,
            },
            {
              ...ACTIVE_CARD_LANDING_X_PERCENT_FIELD_BASE,
              key: 'activeCardLandingXPercentMd',
              label: 'Active card landing X (≥ tablet)',
              description: 'Where the active card lands, as a percent of the tablet container width. 50 is today\'s exact center. Only applies when Active card landing (≥ tablet) above is not CENTER.',
              visibleWhen: whenActiveCardLandingModeMdSet,
            },
            {
              kind: 'boolean',
              key: 'alignActiveCardRightToMainNavMd',
              label: 'Align active card right to main nav',
              description: 'Opt-in: measures the rendered primary navigation and translates the entire CoverFlow stack until the active card’s right edge meets its right boundary. Card spacing and geometry remain unchanged; overrides Active card landing X for tablet.',
            },
            {
              kind: 'boolean',
              key: 'alignToVisibleViewportCenterMd',
              label: 'Vertically center carousel in visible viewport',
              description: 'Opt-in: vertically aligns the complete CoverFlow composition to the real visible browser viewport at tablet, including browser-chrome changes. Card geometry remains unchanged.',
            },
            {
              ...ROTATION_MAX_DEG_FIELD_BASE,
              key: 'rotationMaxDegMd',
              label: 'Maximum rotation (≥ tablet)',
              description: 'Same behavior as Mobile\'s Maximum rotation, independently tunable for this tier.',
            },
            {
              ...ROTATION_GROWTH_FIELD_BASE,
              key: 'rotationDistanceGrowthPercentMd',
              label: 'Rotation growth by distance (≥ tablet)',
              description: 'Same behavior as Mobile\'s Rotation growth by distance, independently tunable for this tier.',
              visibleWhen: whenRotationCompounding,
            },
            {
              ...STACK_SPACING_RATIO_FIELD_BASE,
              key: 'stackSpacingToCenterGapRatioMd',
              label: 'Further-neighbour spacing ratio (≥ tablet)',
              description: 'Same behavior as Mobile\'s Further-neighbour spacing ratio, independently tunable for this tier.',
            },
            {
              ...STACK_SPACING_GROWTH_FIELD_BASE,
              key: 'stackSpacingGrowthPercentMd',
              label: 'Spacing growth by distance (≥ tablet)',
              description: 'Same behavior as Mobile\'s Spacing growth by distance, independently tunable for this tier.',
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
            {
              ...MAX_CARD_HEIGHT_FIELD_BASE,
              key: 'maxCardHeightPxLg',
              label: 'Max card height',
              description: 'Maximum card height on desktop only. Width scales with height to preserve the aspect ratio. 0 removes the cap.',
            },
            {
              kind: 'enum',
              key: 'activeCardLandingModeLg',
              label: 'Active card landing (≥ desktop)',
              description: 'Same behavior as Mobile\'s Active card landing, independently tunable for this tier.',
              options: ACTIVE_CARD_LANDING_MODE_OPTIONS,
            },
            {
              ...ACTIVE_CARD_LANDING_X_PERCENT_FIELD_BASE,
              key: 'activeCardLandingXPercentLg',
              label: 'Active card landing X (≥ desktop)',
              description: 'Where the active card lands, as a percent of the desktop container width. 50 is today\'s exact center. Only applies when Active card landing (≥ desktop) above is not CENTER.',
              visibleWhen: whenActiveCardLandingModeLgSet,
            },
            {
              kind: 'boolean',
              key: 'alignActiveCardRightToMainNavLg',
              label: 'Align active card right to main nav',
              description: 'Opt-in: measures the rendered primary navigation and translates the entire CoverFlow stack until the active card’s right edge meets its right boundary. Card spacing and geometry remain unchanged; overrides Active card landing X for desktop.',
            },
            {
              kind: 'boolean',
              key: 'alignToVisibleViewportCenterLg',
              label: 'Vertically center carousel in visible viewport',
              description: 'Opt-in: same visible-viewport centering at desktop, independently authored from tablet. Card geometry remains unchanged.',
            },
            {
              ...ROTATION_MAX_DEG_FIELD_BASE,
              key: 'rotationMaxDegLg',
              label: 'Maximum rotation (≥ desktop)',
              description: 'Same behavior as Mobile\'s Maximum rotation, independently tunable for this tier.',
            },
            {
              ...ROTATION_GROWTH_FIELD_BASE,
              key: 'rotationDistanceGrowthPercentLg',
              label: 'Rotation growth by distance (≥ desktop)',
              description: 'Same behavior as Mobile\'s Rotation growth by distance, independently tunable for this tier.',
              visibleWhen: whenRotationCompounding,
            },
            {
              ...STACK_SPACING_RATIO_FIELD_BASE,
              key: 'stackSpacingToCenterGapRatioLg',
              label: 'Further-neighbour spacing ratio (≥ desktop)',
              description: 'Same behavior as Mobile\'s Further-neighbour spacing ratio, independently tunable for this tier.',
            },
            {
              ...STACK_SPACING_GROWTH_FIELD_BASE,
              key: 'stackSpacingGrowthPercentLg',
              label: 'Spacing growth by distance (≥ desktop)',
              description: 'Same behavior as Mobile\'s Spacing growth by distance, independently tunable for this tier.',
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
          description: 'Y-axis rotation applied to the immediate neighbour, degrees.',
          min: 0,
          max: 90,
          step: 1,
          unit: 'deg',
        },
        {
          kind: 'boolean',
          key: 'showCardBackface',
          label: 'Show card back face',
          description: 'Off by default: rotated cards hide their entire reverse side, including the shell, gradient, and content. Turn on only when a mirrored full-card reverse side is intentional.',
        },
        {
          kind: 'enum',
          key: 'rotationDistributionMode',
          label: 'Rotation distribution',
          description: 'Spread allocates a fixed rotation budget across the card maze so farther cards progressively narrow. Compounding preserves the legacy multiplicative curve.',
          options: [
            { label: 'SPREAD', value: 'spread' },
            { label: 'COMPOUNDING', value: 'compounding' },
          ],
        },
        {
          kind: 'enum',
          key: 'rotationProgressionMode',
          label: 'Rotation progression',
          description: 'Recede keeps near cards broad and narrows cards with distance. Invert makes the immediate neighbour narrowest and progressively flattens farther cards.',
          options: ROTATION_PROGRESSION_OPTIONS,
          visibleWhen: whenRotationCompounding,
        },
        {
          kind: 'number',
          key: 'rotationSpreadDepth',
          label: 'Rotation spread depth',
          description: 'How many neighbour positions receive the full rotation range in Spread mode. The final position reaches Maximum rotation.',
          min: 1,
          max: 20,
          step: 1,
          visibleWhen: whenRotationSpread,
        },
        {
          kind: 'number',
          key: 'rotationSpreadExponent',
          label: 'Rotation spread curve',
          description: '1 is linear. Values above 1 preserve the near cards and make the tail narrow more decisively.',
          min: 0.25,
          max: 4,
          step: 0.05,
          visibleWhen: whenRotationSpread,
        },
        {
          kind: 'boolean',
          key: 'rotationGrowthIncludesFirstNeighbor',
          label: 'Rotation growth includes first neighbour',
          description: 'Off (default): the immediate neighbour always rotates by the flat Neighbour rotation above, only the 2nd neighbour onward compounds — can leave the first neighbour looking flatter than the rhythm the rest of the stack is on. On: the immediate neighbour\'s own rotation becomes the growth series\' first term instead, so its silhouette already carries one step of the same rhythm as every card behind it. No effect while Rotation growth by distance is 0.',
          visibleWhen: whenRotationCompounding,
        },
        {
          kind: 'number',
          key: 'inactiveCardColumnDarkeningStep',
          label: 'Inactive card column darkening step',
          description: 'Opt-in: each inactive card position past the immediate neighbor adds this blend step toward the resolved column color. The immediate neighbor itself (idle, and the same card mid-transition on its way to becoming active) always renders the Card Appearance panel\'s own configured neighbor color exactly, unaffected by this step — this only recedes cards deeper in the stack. Zero disables the recede entirely; larger values make the change between deeper cards stronger and cap the outermost cards at the column color.',
          min: 0,
          max: 1,
          step: 0.01,
        },
        {
          kind: 'number',
          key: 'inactiveCardHoverAmplitudeStep',
          label: 'Inactive card hover amplitude step',
          description: 'Opt-in: each step of distance from the active card recedes both live-proximity engines\' own hover ceiling by this fraction, toward a flat (non-hoverable, non-brightening) card — the CTA Button engine\'s scale/lift/tilt AND the gradient/hologram engine\'s brightness/saturation/hue-shift/pan response, together, including the immediate neighbor, unlike the darkening step above, since a lingering hover ceiling (not a resting-color identity) is exactly what lets a card still gliding past the pointer after leaving the active slot visibly snap or brighten when its hover effect finally releases. Also controls how aggressively the active card\'s own LIFT ceiling recedes as its live drag/settle position approaches the neighbor slot — values above 1 (e.g. 3) zero it out well before the full distance, giving typical release gestures enough runway to already be fully damped. Zero disables the recede entirely.',
          min: 0,
          max: 4,
          step: 0.01,
        },
        {
          kind: 'boolean',
          key: 'narrowColumnGradientOnNavigateEnabledLg',
          label: 'Narrow gradient reacts to navigation',
          description: 'Desktop only, off by default. Turn this on to connect CoverFlow\'s own navigation to the narrow column\'s background: once you turn ON this toggle, the two "on navigate" fields below become visible — set those to the saturation/darkness you want the narrow column to ease toward the moment the first card (index 0) stops being active, easing back to today\'s flat narrow-column look the moment card 0 becomes active again. Leave this off and the narrow column never reacts to CoverFlow at all, regardless of what the two fields below are set to.',
        },
        {
          kind: 'number',
          key: 'narrowColumnGradientSaturationOnNavigateLg',
          label: 'Narrow gradient saturation — on navigate',
          description: 'Only takes effect while "Narrow gradient reacts to navigation" above is ON. Target for the narrow column\'s own scroll-gradient saturation (PolymorphicLayoutConfig\'s scrollGradientNarrowColumnSaturationLg) once the first card (index 0) stops being active — eases in as the page navigates away from card 0, and eases back to the page\'s own base value once card 0 is active again. 1 matches the page\'s own current base value (no visible change even with the toggle on) — raise this above 1 for a richer, more saturated tint once navigated.',
          min: 0,
          max: 2,
          step: 0.01,
          visibleWhen: whenNarrowColumnGradientOnNavigateEnabled,
        },
        {
          kind: 'number',
          key: 'narrowColumnGradientDarknessOnNavigateLg',
          label: 'Narrow gradient darkness — on navigate',
          description: 'Only takes effect while "Narrow gradient reacts to navigation" above is ON. Companion to the saturation target above — target for scrollGradientNarrowColumnDarknessLg. 0 matches the page\'s own current base value (no visible change even with the toggle on).',
          min: 0,
          max: 1,
          step: 0.01,
          visibleWhen: whenNarrowColumnGradientOnNavigateEnabled,
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
          kind: 'boolean',
          key: 'stackSpacingGrowthIncludesFirstNeighbor',
          label: 'Spacing growth includes first neighbour',
          description: 'Off (default): the immediate neighbour always sits a flat Card distance gap from the active card, unrelated to Further-neighbour spacing ratio\'s own value — only the 2nd neighbour onward fans out on that separate rhythm. This is what leaves the immediate neighbour looking tucked right up against the active card. On: Card distance stops governing where a settled card sits (it still shapes drag/wheel feel) — the active-to-first-neighbour gap instead uses the same spacing unit the first-to-second gap already does, growing from there by this same percent each step, so the whole stack reads as one continuous rhythm starting right at the active card. No effect while Spacing growth by distance is 0.',
        },
      ],
    },
    {
      kind: 'group',
      label: 'Gestures',
      fields: [
        {
          kind: 'boolean',
          key: 'startAtEndOfList',
          label: 'Start at end of list',
          description: 'Off by default: the list opens on its first item, today\'s exact behavior. On: the initial active card is the LAST item instead, as if the list had already been fully navigated once — every other navigation gesture (click, wheel, drag, list selection) still works exactly the same from there.',
        },
        {
          kind: 'boolean',
          key: 'reverseItemOrder',
          label: 'Reverse list order',
          description: 'Off by default: cards render/navigate in the order the caller\'s own list provides, today\'s exact behavior. On: flips that order end-to-end — a purely positional reverse, not a re-sort by date/title/etc. (the caller\'s own list still owns that). Independent of "Start at end of list" above: that toggle keeps resolving against the caller\'s original list length either way.',
        },
        {
          kind: 'boolean',
          key: 'infiniteLoopEnabled',
          label: 'Infinite loop',
          description: 'On by default. The carousel loops seamlessly — navigating past the last card continues onto the first (and vice versa), with the same cards acting as the runway on both sides so an edge is never left empty. There is no special end state to reach; the loop always looks full. Turn it off only for deliberately bounded navigation. A paired list/timeline follows the loop back to the first item through its normal active-item handling. Applies to drag, wheel, and click navigation; the mobile pinned scroll-synced instance is unaffected.',
        },
        { kind: 'boolean', key: 'enableClickToSnap', label: 'Click neighbour to snap' },
        { kind: 'boolean', key: 'enableScroll', label: 'Wheel navigation' },
        {
          kind: 'number',
          key: 'wheelReleaseGapMs',
          label: 'Wheel release gap',
          description: 'How long wheel/trackpad input must stop arriving before a scroll gesture is treated as released and settles to the nearest card — the wheel equivalent of a pointer\'s own release.',
          min: 50,
          max: 1000,
          step: 10,
          unit: 'ms',
          integer: true,
        },
        {
          kind: 'number',
          key: 'wheelOverscrollLimit',
          label: 'Wheel overscroll limit',
          description: 'Hard ceiling, in card-widths, on how far a wheel/trackpad gesture can push the first or last card past its resting position before springy resistance stops it — guarantees the edge card never fully leaves the viewport. 0 disables overscroll entirely (a hard stop at the first/last card). Wheel-only; dragging keeps its own existing feel.',
          min: 0,
          max: 1,
          step: 0.05,
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
      label: 'Card fade',
      fields: [
        {
          kind: 'boolean',
          key: 'leftFadeEnabled',
          label: 'Fade out cards to the left',
          description: 'Off by default. On: inactive cards to the LEFT of the active card progressively fade out as they recede, normalized over the number of cards actually visible to the left at the current width, so the leftmost visible card reaches the minimum opacity below right at the viewport edge. The active card and everything to its right stay fully opaque.',
        },
        {
          kind: 'number',
          key: 'leftFadeMinOpacity',
          label: 'Leftmost card opacity',
          description: 'The opacity the leftmost visible card fades to. 0 fades it fully to invisible by the viewport edge; a higher value keeps far cards partially visible. Only applies while "Fade out cards to the left" is on.',
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: config => config.leftFadeEnabled,
        },
      ],
    },
    {
      kind: 'group',
      label: 'Settle motion',
      fields: [
        {
          kind: 'select',
          key: 'settleMotionCurve',
          label: 'Jump-to-index curve',
          description: 'Governs every DISCRETE jump — click-to-snap, wheel, an externally-requested index change, and selecting a row in the expanded mobile list. Never the drag-release settle, which always keeps its own momentum-seeded spring. Gaussian: a real, named motion-design easing family — velocity itself traces a Gaussian bell curve, slow start, one smooth peak at the midpoint, slow finish, landing at zero velocity by construction, with no kink at any point through the peak.',
          options: SETTLE_MOTION_CURVE_OPTIONS,
        },
        {
          kind: 'number',
          key: 'gaussianSettleBaseDurationMs',
          label: 'Base duration',
          description: 'Duration for a 1-step jump (adjacent index).',
          min: 100,
          max: 3000,
          step: 10,
          unit: 'ms',
          integer: true,
          visibleWhen: whenGaussianSettleMotion,
        },
        {
          kind: 'number',
          key: 'gaussianSettlePerStepDurationMs',
          label: 'Duration per extra step',
          description: 'Added to the base duration for each additional index of travel distance beyond the first, capped at Max duration below.',
          min: 0,
          max: 1000,
          step: 10,
          unit: 'ms',
          integer: true,
          visibleWhen: whenGaussianSettleMotion,
        },
        {
          kind: 'number',
          key: 'gaussianSettleMaxDurationMs',
          label: 'Max duration',
          description: 'Ceiling on the distance-scaled duration — keeps a long jump (e.g. the last row of a long expanded list) prompt rather than sluggish.',
          min: 100,
          max: 3000,
          step: 10,
          unit: 'ms',
          integer: true,
          visibleWhen: whenGaussianSettleMotion,
        },
        {
          kind: 'number',
          key: 'gaussianSettleSteepness',
          label: 'Edge flattening (steepness)',
          description: 'How fast the curve flattens at BOTH edges of the bell — one knob, since the bell is symmetric. Higher: more near-stationary at the start and end, with a sharper burst through the center. Lower: less flattening, closer to a gentle, almost-constant-speed glide. Most of the visible range lives between 0.5 and ~3.5 — above that the edges are already fully flat, so pushing higher stops changing anything on screen.',
          min: 0.5,
          max: 10,
          step: 0.1,
          visibleWhen: whenGaussianSettleMotion,
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
          kind: 'number',
          key: 'activationRampRate',
          label: 'Activation ramp rate',
          description: 'Ramps this card\'s own scale/lift/tilt AND every proximity-driven hologram term (pan, hue shift, saturation boost, brightness boost) ceiling from 0 up to 1 as it starts transitioning to active, and symmetrically back to 0 as it lands inactive — the continuous, time-driven counterpart to "Inactive card hover amplitude step" above (which does the same job keyed on distance instead), built specifically for the active card itself, since distance is always 0 there. 0 disables the ramp (instant, today\'s behavior); 1 is maximally gradual.',
          min: 0,
          max: 1,
          step: 0.01,
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
