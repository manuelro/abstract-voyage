import type { RefObject } from 'react';
import { buildScrollAdaptiveInkColor, useScrollAdaptiveInk } from './useScrollAdaptiveInk';
import type { PolymorphicLayoutConfig } from './PolymorphicLayout.config';
import type { PolymorphicLayoutResolvedColors } from './PolymorphicLayout';

/**
 * PLAN-POLYMORPHIC-ADAPTIVE-INK-EXTRACTION.md — the shared, config-driven
 * wrapper around `useScrollAdaptiveInk`/`buildScrollAdaptiveInkColor`
 * (both already page-agnostic) that any `PolymorphicLayout`-integrated page
 * component can call to get a LIVE, scroll-reactive ink color for text
 * sitting on top of the scroll gradient — the same mechanism `/abstract`
 * previously hand-wired per call site (`topHeaderInkOptions`,
 * `shortArticleListInkOptions`, `narrowColumnAdaptiveInkColor`), now reading
 * its tuning knobs from `PolymorphicLayoutConfig`
 * (`scrollGradientAdaptiveInk*`, `PolymorphicLayout.config.ts`) instead of a
 * page-owned type.
 *
 * One call per real DOM subtree — never share a single call's `ref` across
 * two independently-mounted subtrees (e.g. a mobile/desktop dual render of
 * the same content). `PolymorphicLayout` itself mounts both narrow- and
 * wide-column content simultaneously (CSS media queries pick which is
 * visible), so a shared ref silently starves whichever subtree loses the
 * ref-assignment race — this bit `/abstract`'s own short-article-list ink
 * before it was split into `shortArticleListMobileInkRef`/
 * `shortArticleListDesktopInkRef`. Call this hook once per ref, same as
 * that fix.
 *
 * Returns `undefined` while `baseColor` is itself undefined (nothing to
 * resolve yet); returns `baseColor` verbatim, unmodified, whenever adaptive
 * ink is disabled (`scrollGradientAdaptiveInkEnabled: false`, the default —
 * additive, not a behavior change for pages that don't opt in) or the
 * active tier's scroll gradient isn't running at all.
 */
export function usePolymorphicColumnAdaptiveInk({
  ref,
  baseColor,
  config,
  colors,
  forceProgress,
  originColorOverride,
}: {
  ref: RefObject<HTMLElement>;
  baseColor: string | undefined;
  config: PolymorphicLayoutConfig;
  colors: PolymorphicLayoutResolvedColors;
  /** Same contract as useScrollAdaptiveInk's own forceProgress — e.g. an
   * accordion-expanded state that should hold ink at full progress
   * regardless of real scroll position. Undefined (the default) follows
   * live scroll position/return-to-light exactly like every other
   * consumer. */
  forceProgress?: number;
  /** Defaults to `colors.scrollGradientOriginColor`. Override when the
   * caller's own real background reference differs from the page-level
   * origin — e.g. a header segment whose physical background comes from a
   * different tier-resolved value than the narrow column's own origin
   * stop. */
  originColorOverride?: string;
}): string | undefined {
  const enabled = colors.scrollGradientActive && config.scrollGradientAdaptiveInkEnabled === true;

  useScrollAdaptiveInk({
    ref,
    enabled,
    baseColor,
    maxAmount: config.scrollGradientAdaptiveInkMaxAmount,
    targetContrastRatio: config.scrollGradientAdaptiveInkTargetContrastRatio,
    scrollGradientDarkenViewportRangeVh: colors.scrollGradientResolved.viewportRangeVh,
    scrollGradientDarkenTauMs: colors.scrollGradientResolved.tauMs,
    scrollGradientOriginColor: originColorOverride ?? colors.scrollGradientOriginColor,
    scrollGradientMaxDarken: colors.scrollGradientResolved.maxDarken,
    returnToLightEnabled: config.scrollGradientAdaptiveInkReturnToLightEnabled,
    returnToLightRangeVh: config.scrollGradientAdaptiveInkReturnToLightRangeVh,
    returnToLightFinalDarken: config.scrollGradientAdaptiveInkReturnToLightFinalDarken,
    forceProgress,
  });

  if (baseColor === undefined) return undefined;
  return enabled ? buildScrollAdaptiveInkColor(baseColor, config.scrollGradientAdaptiveInkMaxAmount) : baseColor;
}
