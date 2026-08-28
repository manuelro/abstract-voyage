import { useMemo } from 'react';
import { normalizeSiteHeaderConfig, type SiteHeaderConfig } from '../config/registered';
import {
  applySiteHeaderColorOverride,
  normalizeSiteHeaderColorOverrideConfig,
  type SiteHeaderColorOverrideConfig,
} from '../config/colorOverride';

/**
 * The one real implementation of "normalize the shared siteHeaderConfig,
 * then layer this page's own color override on top" — identical across
 * every PolymorphicLayout-consuming page before this hook existed
 * (pages/about.tsx, pages/contact.tsx, pages/posts-lab/[slug].tsx,
 * pages/abstract.tsx — PLAN-DEDUPLICATE-PAGE-SHELL-LOGIC.md §2).
 */
export function useNormalizedSiteHeaderConfig(
  siteHeaderConfig: SiteHeaderConfig,
  colorOverride: SiteHeaderColorOverrideConfig,
): SiteHeaderConfig {
  return useMemo(() => applySiteHeaderColorOverride(
    normalizeSiteHeaderConfig(siteHeaderConfig),
    normalizeSiteHeaderColorOverrideConfig(colorOverride),
  ), [siteHeaderConfig, colorOverride]);
}
