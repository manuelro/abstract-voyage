import { deriveSurfaceColor, resolveContrastAwareTextColor } from '../../../../../helpers/surfaceColorDerivation';
import type { SiteHeaderConfig } from '../config/registered';
import type { SvgStop } from '../../../../../helpers/gradientMath';

/**
 * The complete, 4-mode ('custom' | 'surface' | 'column' | unmatched)
 * resolution of SiteHeader's own logoStops prop from a normalized
 * config — the one real implementation, extracted from four page-owned
 * copies that had silently drifted into two different completeness levels
 * (about.tsx/contact.tsx's own 2-mode version had no 'column' branch at
 * all — PLAN-DEDUPLICATE-PAGE-SHELL-LOGIC.md §3, the one deliberate
 * behavior change in that plan, confirmed with the operator before
 * implementing). `surfaceColor` is only read for 'surface' mode (usually
 * pageSurfaceConfig.color). `resolvedColumnColor` is only read for
 * 'column' mode — pass the page's own usePolymorphicLayoutColors() output
 * (physicalLeftColumnColor) where available, or pageSurfaceConfig.color as
 * the nearest honest fallback for a page with no split-column colors of
 * its own (e.g. pages/contact.tsx, which never calls
 * usePolymorphicLayoutColors at all — its own narrowColumnWidthTierMd/Lg
 * are both 'stacked', so it has no real physical column color to offer).
 * `fallbackStops` is the unmatched-mode value every call site must supply
 * explicitly (never a hardcoded default here) — the two real
 * implementations that existed before this function disagreed on what
 * that fallback should even be (posts-lab's own buildSynthLogoStops() vs.
 * abstract.tsx's own headerTone-branched pair), proving there's no single
 * correct default to bake in.
 */
export function resolveSiteHeaderLogoStops(
  config: SiteHeaderConfig,
  surfaceColor: string,
  resolvedColumnColor: string,
  fallbackStops: SvgStop[],
): SvgStop[] {
  if (config.colorMode === 'custom') {
    return [{ color: config.logoColor, at: 0 }, { color: config.logoColor, at: 100 }];
  }
  if (config.colorMode === 'surface') {
    const color = deriveSurfaceColor(surfaceColor, config.logoSurfaceOffset);
    return [{ color, at: 0 }, { color, at: 100 }];
  }
  if (config.colorMode === 'column') {
    const color = resolveContrastAwareTextColor(
      resolvedColumnColor, config.columnTextMinContrast, config.logoSurfaceOffset,
    );
    return [{ color, at: 0 }, { color, at: 100 }];
  }
  return fallbackStops;
}
