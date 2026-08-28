import type { PolymorphicLayoutConfig } from '../experiences/abstract/components/PolymorphicLayout.config';

export type AbstractPagePresentationMode = 'splitColumn' | 'classic';

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

const PRESENTATION_MODES: ReadonlyArray<AbstractPagePresentationMode> = ['splitColumn', 'classic'];

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

// PLAN-POLYMORPHIC-LAYOUT-PAGE-CONFIG-PARITY.md: relocated to
// experiences/abstract/components/PolymorphicLayout.pageConfigs.ts, co-located
// with /about's and /posts-lab's own instances next to the shared type they're
// all instances of (PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md's own "Round 1"
// ruling — see that file's own doc comment for the full per-field reasoning).
// Re-exported here unchanged so no other consumer of this file's own
// ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG import needs to change.
export { ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG } from '../experiences/abstract/components/PolymorphicLayout.pageConfigs';

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
