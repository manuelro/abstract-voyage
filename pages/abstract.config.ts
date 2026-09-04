import type { PolymorphicLayoutConfig } from '../experiences/abstract/components/PolymorphicLayout.config';
import {
  DEFAULT_ABOUT_TIMELINE_CONFIG,
  type AboutTimelineConfig,
} from '../experiences/about/components/AboutTimeline.config';

export type AbstractPagePresentationMode = 'splitColumn' | 'classic';
export type AbstractNarrowColumnStackHorizontalAlign = 'start' | 'center' | 'end' | 'stretch';
export type AbstractNarrowColumnStackVerticalAlign = 'start' | 'center' | 'end';

/**
 * Page-owned settings for abstract.tsx's own top-level presentation choice
 * — not any single component's concern, so it gets its own small scope,
 * same pattern as about.config.ts's AboutPageLayoutConfig.
 */
export type AbstractPageLayoutConfig = {
  /** 'splitColumn' (default): the new SplitColumnLayout composition — a
   * single-column stacked hero in one column, a single-card
   * Articles/Labs preview in the other (PLAN-HOMEPAGE-IA-LAYOUT.md
   * Section 8.3-8.8). 'classic': today's presentation — the splitRow hero
   * plus the full AbstractJournalLabCollection tabbed section — kept fully
   * working as a live fallback, not just prior art. */
  presentationMode: AbstractPagePresentationMode;
};

export const DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG = {
  presentationMode: 'splitColumn',
} satisfies AbstractPageLayoutConfig;

/** Page-owned structure for the two content regions passed through
 * PolymorphicLayout's narrow-column slot. The region weights are expressed
 * as relative percentages so the pair always consumes the full available
 * height, even while an operator is editing one value independently. */
export type AbstractNarrowColumnStackConfig = {
  topRegionPercent: number;
  bottomRegionPercent: number;
  /** Visually swaps the top and bottom content regions while preserving the
   * named region's own size and alignment settings. The DOM order remains
   * top-then-bottom for stable keyboard and screen-reader navigation. */
  invertOrder: boolean;
  topHorizontalAlign: AbstractNarrowColumnStackHorizontalAlign;
  topVerticalAlign: AbstractNarrowColumnStackVerticalAlign;
  bottomHorizontalAlign: AbstractNarrowColumnStackHorizontalAlign;
  bottomVerticalAlign: AbstractNarrowColumnStackVerticalAlign;
};

export type AbstractTimelineContentOrder = 'newest' | 'oldest' | 'titleAsc' | 'titleDesc';

/** Page-owned content selection shared by Abstract's timeline and CoverFlow. */
export type AbstractTimelineContentConfig = {
  visibleItemCount: number;
  order: AbstractTimelineContentOrder;
};

export const DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG = {
  visibleItemCount: 10,
  order: 'newest',
} satisfies AbstractTimelineContentConfig;

export const DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG = {
  topRegionPercent: 18,
  bottomRegionPercent: 62,
  invertOrder: false,
  topHorizontalAlign: 'stretch',
  topVerticalAlign: 'start',
  bottomHorizontalAlign: 'end',
  bottomVerticalAlign: 'end',
} satisfies AbstractNarrowColumnStackConfig;

const PRESENTATION_MODES: ReadonlyArray<AbstractPagePresentationMode> = ['splitColumn', 'classic'];
const STACK_HORIZONTAL_ALIGNMENTS: ReadonlyArray<AbstractNarrowColumnStackHorizontalAlign> = [
  'start', 'center', 'end', 'stretch',
];
const STACK_VERTICAL_ALIGNMENTS: ReadonlyArray<AbstractNarrowColumnStackVerticalAlign> = [
  'start', 'center', 'end',
];
const TIMELINE_CONTENT_ORDERS: ReadonlyArray<AbstractTimelineContentOrder> = [
  'newest', 'oldest', 'titleAsc', 'titleDesc',
];

const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);

export function normalizeAbstractPageLayoutConfig(
  config: Partial<AbstractPageLayoutConfig> | undefined,
): AbstractPageLayoutConfig {
  const base = { ...DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG, ...(config ?? {}) };
  return {
    presentationMode: token(
      base.presentationMode, PRESENTATION_MODES, DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG.presentationMode,
    ),
  };
}

const clampRegionPercent = (value: number, fallback: number): number => (
  Number.isFinite(value) ? Math.min(99, Math.max(1, value)) : fallback
);

export function normalizeAbstractNarrowColumnStackConfig(
  config: Partial<AbstractNarrowColumnStackConfig> | undefined,
): AbstractNarrowColumnStackConfig {
  const base = { ...DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG, ...(config ?? {}) };
  return {
    topRegionPercent: clampRegionPercent(
      base.topRegionPercent,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.topRegionPercent,
    ),
    bottomRegionPercent: clampRegionPercent(
      base.bottomRegionPercent,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.bottomRegionPercent,
    ),
    invertOrder: Boolean(base.invertOrder),
    topHorizontalAlign: token(
      base.topHorizontalAlign,
      STACK_HORIZONTAL_ALIGNMENTS,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.topHorizontalAlign,
    ),
    topVerticalAlign: token(
      base.topVerticalAlign,
      STACK_VERTICAL_ALIGNMENTS,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.topVerticalAlign,
    ),
    bottomHorizontalAlign: token(
      base.bottomHorizontalAlign,
      STACK_HORIZONTAL_ALIGNMENTS,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.bottomHorizontalAlign,
    ),
    bottomVerticalAlign: token(
      base.bottomVerticalAlign,
      STACK_VERTICAL_ALIGNMENTS,
      DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG.bottomVerticalAlign,
    ),
  };
}

export function normalizeAbstractTimelineContentConfig(
  config: Partial<AbstractTimelineContentConfig> | undefined,
): AbstractTimelineContentConfig {
  const base = { ...DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG, ...(config ?? {}) };
  return {
    visibleItemCount: Number.isFinite(base.visibleItemCount)
      ? Math.min(100, Math.max(1, Math.round(base.visibleItemCount)))
      : DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG.visibleItemCount,
    order: token(base.order, TIMELINE_CONTENT_ORDERS, DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG.order),
  };
}

// PLAN-POLYMORPHIC-LAYOUT-PAGE-CONFIG-PARITY.md: relocated to
// experiences/abstract/components/PolymorphicLayout.pageConfigs.ts, co-located
// with /about's and /posts-lab's own instances next to the shared type they're
// all instances of (PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md's own "Round 1"
// ruling — see that file's own doc comment for the full per-field reasoning).
// Re-exported here unchanged so no other consumer of this file's own
// ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG import needs to change.
export { ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG } from '../experiences/abstract/components/PolymorphicLayout.pageConfigs';

// /abstract's own default for the shared AboutTimeline component (see
// experiences/abstract/components/AbstractTimeline.panel.ts's own doc
// comment) — full parity with /about's own timeline
// (DEFAULT_ABOUT_PAGE_TIMELINE_CONFIG, pages/about.config.ts) for every
// field the shared "Timeline" panel exposes: same base
// (DEFAULT_ABOUT_TIMELINE_CONFIG) + the same overrides that page applies.
// `description` is the one deliberate exception: it's page content (a
// lead-in sentence), not styling, so /abstract keeps its own copy instead of
// about's bio-page sentence. Re-exported under its own symbol so the panel's
// "copy to source" tooling has a real, page-specific target to write into
// once an operator diverges this page's own values, without ever touching
// /about's.
export const DEFAULT_ABSTRACT_TIMELINE_CONFIG: AboutTimelineConfig = {
  ...DEFAULT_ABOUT_TIMELINE_CONFIG,
  rowGap: 'gap-5',
  markerSizeClassName: 'w-2.5 h-2.5',
  markerColorMode: 'text',
  markerCustomColor: '#6c6b94',
  hoverMarkerOpacity: 0.4,
  markerIdleOpacity: 0.31,
  markerActiveOpacity: 0.55,
  markerGradientEnabled: false,
  rowTitleFontSizeClassName: 'text-xs',
  rowTitleMinContrastActive: 7.6,
  rowDescriptionMinContrastActive: 5.7,
  rowDescriptionMinContrastInactive: 3,
  description: 'Essays',
  descriptionVisible: false,
  descriptionFontSizeClassName: 'text-sm',
  alignment: 'right',
  descriptionOpacity: 0.61,
  descriptionPaddingBottomLgClassName: 'lg:pb-7',
  rowAppendixEnabled: false,
  rowAppendixRevealDelayMs: 340,
  rowAppendixSeparator: '⋅',
  paddingTopLgClassName: 'lg:pt-7',
  marginTopLgClassName: 'lg:mt-0',
};

const VERTICAL_ALIGN_WIDE_BY_BASE: Record<
  PolymorphicLayoutConfig['wideColumnContentVerticalAlign'],
  PolymorphicLayoutConfig['wideColumnContentVerticalAlignWide']
> = {
  'justify-start': 'md:justify-start',
  'justify-center': 'md:justify-center',
  'justify-end': 'md:justify-end',
};

const VERTICAL_ALIGN_LG_BY_BASE: Record<
  PolymorphicLayoutConfig['wideColumnContentVerticalAlign'],
  PolymorphicLayoutConfig['wideColumnContentVerticalAlignLg']
> = {
  'justify-start': 'lg:justify-start',
  'justify-center': 'lg:justify-center',
  'justify-end': 'lg:justify-end',
};

/**
 * Keeps /abstract's two genuinely "All sizes" vertical-alignment controls
 * honest. PolymorphicLayout stores explicit md/lg values because those
 * tiers can be tuned independently. That also means a base edit cannot
 * cascade through CSS: the always-present breakpoint classes mask it
 * immediately. When the operator edits base vertical alignment, this page
 * deliberately updates its two breakpoint siblings in the same state
 * transaction. A later edit in the Tablet/Desktop tab can still diverge
 * either tier independently.
 *
 * Column background color used to get this same base-to-Wide/Lg cascade
 * treatment too, but that was the wrong fix for the wrong problem: color
 * source (colorSource) is now a genuinely tiered field in its own right
 * (colorSourceWide/-Lg — see PolymorphicLayout.config.ts), so a base-tier
 * color edit no longer needs to be silently mirrored into higher tiers to
 * "take effect everywhere" — each tier has its own real source and color
 * value, set independently through its own tab, the same segregated
 * per-breakpoint shape headerSplitBandEnabled's own mode/color fields
 * already had. Cascading the base color into Wide/Lg here would instead
 * silently clobber a deliberately-diverged Tablet/Desktop color the moment
 * an operator touched the Mobile tab's own color — removed, not ported.
 */
export function applyAbstractPolymorphicLayoutAllSizesUpdate(
  previous: PolymorphicLayoutConfig,
  next: PolymorphicLayoutConfig,
): PolymorphicLayoutConfig {
  let resolved = next;

  if (next.wideColumnContentVerticalAlign !== previous.wideColumnContentVerticalAlign) {
    resolved = {
      ...resolved,
      wideColumnContentVerticalAlignWide:
        VERTICAL_ALIGN_WIDE_BY_BASE[next.wideColumnContentVerticalAlign],
      wideColumnContentVerticalAlignLg:
        VERTICAL_ALIGN_LG_BY_BASE[next.wideColumnContentVerticalAlign],
    };
  }
  if (next.narrowColumnContentVerticalAlign !== previous.narrowColumnContentVerticalAlign) {
    resolved = {
      ...resolved,
      narrowColumnContentVerticalAlignWide:
        VERTICAL_ALIGN_WIDE_BY_BASE[next.narrowColumnContentVerticalAlign],
      narrowColumnContentVerticalAlignLg:
        VERTICAL_ALIGN_LG_BY_BASE[next.narrowColumnContentVerticalAlign],
    };
  }

  return resolved;
}
