import {
  DEFAULT_SITE_HEADER_CONFIG,
  type SiteHeaderColorMode,
  type SiteHeaderConfig,
} from './registered';

/**
 * SiteHeaderConfig is shared across every page via
 * SharedDesignConfigProvider (components/SharedDesignConfigProvider.tsx) —
 * one instance, one value, identical everywhere. That shared value is the
 * *foundation* every page inherits by default. This config is the opt-in,
 * page-local override of just its color-related fields: `enabled: false`
 * (the default) means "inherit the shared foundation entirely." Per
 * PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md's own per-page config ownership
 * pattern (see that plan's "Explicit non-goals" for why this scope
 * originally shipped without it, and the root-cause diagnosis for why that
 * turned out to matter): every consuming page owns a *complete*,
 * independent config literal below (ABOUT_/CONTACT_/ABSTRACT_
 * HERO_HEADER_COLOR_OVERRIDE_CONFIG) rather than seeding its own `useState`
 * from one shared DEFAULT_..._CONFIG object — a page's own live edits, and
 * a "COPY" from that page's own panel, can never leak into another page's
 * resting state this way, since there's no shared object left for either
 * to spread from or point their copy metadata at.
 *
 * Field-for-field identical to the color-related subset of
 * SiteHeaderConfig on purpose — see SITE_HEADER_COLOR_FIELDS in
 * SiteHeader.panel.ts, which this scope's own panel reuses
 * verbatim rather than re-describing the same fields a second time.
 */
export type SiteHeaderColorOverrideConfig = {
  enabled: boolean;
  colorMode: SiteHeaderColorMode;
  logoColor: string;
  navTextColor: string;
  navBorderColor: string;
  logoSurfaceOffset: number;
  navTextSurfaceOffset: number;
  navBorderSurfaceOffset: number;
  columnTextMinContrast: number;
};

// Neutral shared foundation — not consumed by any page at runtime (each
// owns a complete instance of its own, below), only a safe starting point
// for a hypothetical future page that renders SiteHeader without
// needing to diverge from it at all. `enabled: false` and colors that
// simply mirror the base DEFAULT_SITE_HEADER_CONFIG (rather than
// independent hardcoded hex values that could silently drift from it) —
// inert while enabled is false, but a sane, self-consistent starting point
// if an operator ever flips it on before customizing further.
export const DEFAULT_SITE_HEADER_COLOR_OVERRIDE_CONFIG = {
  enabled: false,
  colorMode: DEFAULT_SITE_HEADER_CONFIG.colorMode,
  logoColor: DEFAULT_SITE_HEADER_CONFIG.logoColor,
  navTextColor: DEFAULT_SITE_HEADER_CONFIG.navTextColor,
  navBorderColor: DEFAULT_SITE_HEADER_CONFIG.navBorderColor,
  logoSurfaceOffset: DEFAULT_SITE_HEADER_CONFIG.logoSurfaceOffset,
  navTextSurfaceOffset: DEFAULT_SITE_HEADER_CONFIG.navTextSurfaceOffset,
  navBorderSurfaceOffset: DEFAULT_SITE_HEADER_CONFIG.navBorderSurfaceOffset,
  columnTextMinContrast: 14.3,
} satisfies SiteHeaderColorOverrideConfig;

/**
 * Per-page config ownership (PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md): every
 * page that renders SiteHeader owns a complete instance here —
 * never a partial spread over DEFAULT_SITE_HEADER_COLOR_OVERRIDE_CONFIG
 * above or over each other. All three currently resolve to the exact same
 * values (`enabled: false`, inherit the shared foundation) — that's the
 * correct, restored resting state for every page today; none of them has a
 * genuinely intended active override. `satisfies
 * SiteHeaderColorOverrideConfig` on each makes a missing/renamed
 * field a compile error individually, and
 * SiteHeaderColorOverride.pageConfigs.test.ts asserts these stay in
 * sync with what's actually registered per page.
 */
export const ABOUT_SITE_HEADER_COLOR_OVERRIDE_CONFIG = {
  enabled: false,
  colorMode: 'column',
  logoColor: '#f5f5f5',
  navTextColor: '#787878',
  navBorderColor: '#787878',
  logoSurfaceOffset: 0.36,
  navTextSurfaceOffset: 0.35,
  navBorderSurfaceOffset: 0,
  columnTextMinContrast: 14.3,
} satisfies SiteHeaderColorOverrideConfig;

export const CONTACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG = {
  enabled: true,
  colorMode: 'custom',
  logoColor: '#67676f',
  navTextColor: '#787878',
  navBorderColor: '#787878',
  logoSurfaceOffset: 0,
  navTextSurfaceOffset: 0,
  navBorderSurfaceOffset: 0,
  columnTextMinContrast: DEFAULT_SITE_HEADER_CONFIG.columnTextMinContrast,
} satisfies SiteHeaderColorOverrideConfig;

// /abstract's own header color divergence: 'column' mode derives
// logoColor from physicalLeftColumnColor and navTextColor/navBorderColor
// from physicalRightColumnColor (see SiteHeaderProps and
// pages/abstract.tsx's own call site), resolved through
// resolveContrastAwareTextColor rather than the flat 'custom' hex values
// below (which remain here, untouched, as the resting colorMode: 'custom'
// value if this override is ever toggled back). Offsets start at 0 (pure
// contrast-driven search, no manual lighten/darken bias). The 4.5 target
// deliberately matches SplitColumnCardPreview's derived neighbor text on
// the physical right column: when the right header band is synced with the
// column below, both call the same resolver with the same background,
// target, and offset and therefore produce the exact same ink—not merely
// two independently legible colors. See
// SiteHeader.config.ts's own doc comment on why 'surface' mode
// specifically was unsafe here; 'column' mode doesn't share that problem
// since logo and nav resolve against their own distinct physical column
// colors despite sharing one colorMode switch.
export const ABSTRACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG = {
  enabled: true,
  colorMode: 'column',
  logoColor: '#f5f5f5',
  navTextColor: '#787878',
  navBorderColor: '#787878',
  logoSurfaceOffset: 0,
  navTextSurfaceOffset: 0,
  navBorderSurfaceOffset: 0,
  columnTextMinContrast: 4.5,
} satisfies SiteHeaderColorOverrideConfig;

// pages/posts-lab/[slug].tsx (PLAN: centralize the split-column header/nav
// mechanism) — this page's own colorMode: 'column' divergence, mirroring
// /abstract's own reasoning above: logo/nav resolve against the split
// column's real physical colors via resolveContrastAwareTextColor rather
// than a flat 'custom' hex. offsets start at 0 for the same "pure
// contrast-driven search" reason /abstract's own override does.
export const POSTS_LAB_SITE_HEADER_COLOR_OVERRIDE_CONFIG = {
  enabled: true,
  colorMode: 'column',
  logoColor: '#f5f5f5',
  navTextColor: '#787878',
  navBorderColor: '#787878',
  logoSurfaceOffset: 0,
  navTextSurfaceOffset: 0,
  navBorderSurfaceOffset: 0,
  columnTextMinContrast: 4.5,
} satisfies SiteHeaderColorOverrideConfig;

const COLOR_MODES: ReadonlyArray<SiteHeaderColorMode> = [
  'adaptive', 'custom', 'surface', 'column',
];

const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);
const normalizeColor = (value: string, fallback: string) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
};
const clampRange = (value: number, min: number, max: number, fallback: number) => (
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback))
);

export function normalizeSiteHeaderColorOverrideConfig(
  config: Partial<SiteHeaderColorOverrideConfig> | undefined,
): SiteHeaderColorOverrideConfig {
  const base = { ...DEFAULT_SITE_HEADER_COLOR_OVERRIDE_CONFIG, ...(config ?? {}) };
  return {
    enabled: base.enabled === true,
    colorMode: token(
      base.colorMode, COLOR_MODES, DEFAULT_SITE_HEADER_COLOR_OVERRIDE_CONFIG.colorMode,
    ),
    logoColor: normalizeColor(
      base.logoColor, DEFAULT_SITE_HEADER_COLOR_OVERRIDE_CONFIG.logoColor,
    ),
    navTextColor: normalizeColor(
      base.navTextColor, DEFAULT_SITE_HEADER_COLOR_OVERRIDE_CONFIG.navTextColor,
    ),
    navBorderColor: normalizeColor(
      base.navBorderColor, DEFAULT_SITE_HEADER_COLOR_OVERRIDE_CONFIG.navBorderColor,
    ),
    logoSurfaceOffset: clampRange(
      base.logoSurfaceOffset,
      -1,
      1,
      DEFAULT_SITE_HEADER_COLOR_OVERRIDE_CONFIG.logoSurfaceOffset,
    ),
    navTextSurfaceOffset: clampRange(
      base.navTextSurfaceOffset,
      -1,
      1,
      DEFAULT_SITE_HEADER_COLOR_OVERRIDE_CONFIG.navTextSurfaceOffset,
    ),
    navBorderSurfaceOffset: clampRange(
      base.navBorderSurfaceOffset,
      -1,
      1,
      DEFAULT_SITE_HEADER_COLOR_OVERRIDE_CONFIG.navBorderSurfaceOffset,
    ),
    columnTextMinContrast: clampRange(
      base.columnTextMinContrast,
      1,
      21,
      DEFAULT_SITE_HEADER_COLOR_OVERRIDE_CONFIG.columnTextMinContrast,
    ),
  };
}
/**
 * override.enabled ? merged-over-shared : shared verbatim — the one merge
 * point every page calls at its own existing normalizedSiteHeaderConfig
 * computation. `enabled` itself is never spread into the result (it isn't
 * a field of SiteHeaderConfig).
 */
export function applySiteHeaderColorOverride(
  shared: SiteHeaderConfig,
  override: SiteHeaderColorOverrideConfig,
): SiteHeaderConfig {
  if (!override.enabled) return shared;
  return {
    ...shared,
    colorMode: override.colorMode,
    logoColor: override.logoColor,
    navTextColor: override.navTextColor,
    navBorderColor: override.navBorderColor,
    logoSurfaceOffset: override.logoSurfaceOffset,
    navTextSurfaceOffset: override.navTextSurfaceOffset,
    navBorderSurfaceOffset: override.navBorderSurfaceOffset,
    columnTextMinContrast: override.columnTextMinContrast,
  };
}
