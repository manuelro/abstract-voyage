import {
  DEFAULT_CTA_BUTTON_CONFIG,
  type CtaButtonColorMode,
  type CtaButtonConfig,
} from './registered';

/**
 * CtaButtonConfig is shared across every page via SharedDesignConfigProvider
 * (components/SharedDesignConfigProvider.tsx) — one instance, one value,
 * identical everywhere. That shared value is the *foundation* every page
 * inherits by default. This config is the opt-in, page-local override of
 * just its color-related fields: `enabled: false` (the default) means
 * "inherit the shared foundation entirely." Per
 * PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md's own per-page config ownership
 * pattern (applied here after diagnosing a real regression it exists to
 * prevent — see SiteHeaderColorOverride.config.ts's own doc comment
 * for the fuller account, which hit exactly this same shape first), every
 * consuming page owns a *complete*, independent config literal below
 * (ABSTRACT_/CONTACT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG) rather than seeding
 * its own `useState` from one shared DEFAULT_..._CONFIG object.
 *
 * Scoped to the fields CtaButtonConfig's own "Surface"/"Auto surface
 * colors"/"Border" panel groups already cover for color specifically
 * (backgroundColorMode/borderColorMode/textColorMode, their resting custom
 * colors, and the four auto*LightenAmount fields plus autoTextMinContrast)
 * — deliberately not the hover-specific custom colors
 * (hoverBackgroundColor/hoverBorderColor/hoverTextColor,
 * autoBackgroundHoverLightenAmount/autoBorderHoverLightenAmount ARE
 * included since those are resting-state-independent lighten amounts, not
 * hover-only custom hex values) or hoverColorsEnabled, which stay governed
 * by the shared foundation only.
 */
export type CtaButtonColorOverrideConfig = {
  enabled: boolean;
  backgroundColorMode: CtaButtonColorMode;
  borderColorMode: CtaButtonColorMode;
  textColorMode: CtaButtonColorMode;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  autoBackgroundLightenAmount: number;
  autoBorderLightenAmount: number;
  autoBackgroundHoverLightenAmount: number;
  autoBorderHoverLightenAmount: number;
  autoTextMinContrast: number;
};

// Neutral shared foundation — not consumed by any page at runtime (each
// owns a complete instance of its own, below), only a safe starting point
// for a hypothetical future page that renders CtaButton without needing to
// diverge from it at all.
export const DEFAULT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG = {
  enabled: false,
  backgroundColorMode: DEFAULT_CTA_BUTTON_CONFIG.backgroundColorMode,
  borderColorMode: DEFAULT_CTA_BUTTON_CONFIG.borderColorMode,
  textColorMode: DEFAULT_CTA_BUTTON_CONFIG.textColorMode,
  backgroundColor: DEFAULT_CTA_BUTTON_CONFIG.backgroundColor,
  borderColor: DEFAULT_CTA_BUTTON_CONFIG.borderColor,
  textColor: DEFAULT_CTA_BUTTON_CONFIG.textColor,
  autoBackgroundLightenAmount: DEFAULT_CTA_BUTTON_CONFIG.autoBackgroundLightenAmount,
  autoBorderLightenAmount: DEFAULT_CTA_BUTTON_CONFIG.autoBorderLightenAmount,
  autoBackgroundHoverLightenAmount: DEFAULT_CTA_BUTTON_CONFIG.autoBackgroundHoverLightenAmount,
  autoBorderHoverLightenAmount: DEFAULT_CTA_BUTTON_CONFIG.autoBorderHoverLightenAmount,
  autoTextMinContrast: DEFAULT_CTA_BUTTON_CONFIG.autoTextMinContrast,
} satisfies CtaButtonColorOverrideConfig;

/**
 * Per-page config ownership (PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md): every
 * page that renders CtaButton with its own color-override capability owns a
 * complete instance here — never a partial spread over
 * DEFAULT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG above or over each other. Only
 * /abstract and /contact currently register this scope (/about doesn't use
 * CtaButtonColorOverride at all). Both resolve to the exact same values
 * (`enabled: false`, inherit the shared foundation) — neither page has a
 * genuinely intended active override today.
 * CtaButtonColorOverride.pageConfigs.test.ts asserts these stay in sync
 * with what's actually registered per page.
 */
export const ABSTRACT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG = {
  enabled: false,
  backgroundColorMode: 'auto',
  borderColorMode: 'auto',
  textColorMode: 'auto',
  backgroundColor: '#1a1a23',
  borderColor: '#d6d6d6',
  textColor: '#74747b',
  autoBackgroundLightenAmount: 0.03,
  autoBorderLightenAmount: 0.065,
  autoBackgroundHoverLightenAmount: 0.035,
  autoBorderHoverLightenAmount: 0.05,
  autoTextMinContrast: 3,
} satisfies CtaButtonColorOverrideConfig;

export const CONTACT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG = {
  enabled: false,
  backgroundColorMode: 'auto',
  borderColorMode: 'auto',
  textColorMode: 'auto',
  backgroundColor: '#1a1a23',
  borderColor: '#d6d6d6',
  textColor: '#74747b',
  autoBackgroundLightenAmount: 0.03,
  autoBorderLightenAmount: 0.065,
  autoBackgroundHoverLightenAmount: 0.035,
  autoBorderHoverLightenAmount: 0.05,
  autoTextMinContrast: 3,
} satisfies CtaButtonColorOverrideConfig;

const COLOR_MODES: ReadonlyArray<CtaButtonColorMode> = ['auto', 'custom'];

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

export function normalizeCtaButtonColorOverrideConfig(
  config: Partial<CtaButtonColorOverrideConfig> | undefined,
): CtaButtonColorOverrideConfig {
  const base = { ...DEFAULT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG, ...(config ?? {}) };
  return {
    enabled: base.enabled === true,
    backgroundColorMode: token(
      base.backgroundColorMode, COLOR_MODES, DEFAULT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG.backgroundColorMode,
    ),
    borderColorMode: token(
      base.borderColorMode, COLOR_MODES, DEFAULT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG.borderColorMode,
    ),
    textColorMode: token(
      base.textColorMode, COLOR_MODES, DEFAULT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG.textColorMode,
    ),
    backgroundColor: normalizeColor(
      base.backgroundColor, DEFAULT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG.backgroundColor,
    ),
    borderColor: normalizeColor(
      base.borderColor, DEFAULT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG.borderColor,
    ),
    textColor: normalizeColor(
      base.textColor, DEFAULT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG.textColor,
    ),
    autoBackgroundLightenAmount: clampRange(
      base.autoBackgroundLightenAmount,
      -1,
      1,
      DEFAULT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG.autoBackgroundLightenAmount,
    ),
    autoBorderLightenAmount: clampRange(
      base.autoBorderLightenAmount,
      -1,
      1,
      DEFAULT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG.autoBorderLightenAmount,
    ),
    autoBackgroundHoverLightenAmount: clampRange(
      base.autoBackgroundHoverLightenAmount,
      -1,
      1,
      DEFAULT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG.autoBackgroundHoverLightenAmount,
    ),
    autoBorderHoverLightenAmount: clampRange(
      base.autoBorderHoverLightenAmount,
      -1,
      1,
      DEFAULT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG.autoBorderHoverLightenAmount,
    ),
    autoTextMinContrast: clampRange(
      base.autoTextMinContrast, 1, 21, DEFAULT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG.autoTextMinContrast,
    ),
  };
}

/**
 * override.enabled ? merged-over-shared : shared verbatim — the one merge
 * point every page calls at its own existing normalizedCtaButtonConfig
 * computation. `enabled` itself is never spread into the result (it isn't
 * a field of CtaButtonConfig).
 */
export function applyCtaButtonColorOverride(
  shared: CtaButtonConfig,
  override: CtaButtonColorOverrideConfig,
): CtaButtonConfig {
  if (!override.enabled) return shared;
  return {
    ...shared,
    backgroundColorMode: override.backgroundColorMode,
    borderColorMode: override.borderColorMode,
    textColorMode: override.textColorMode,
    backgroundColor: override.backgroundColor,
    borderColor: override.borderColor,
    textColor: override.textColor,
    autoBackgroundLightenAmount: override.autoBackgroundLightenAmount,
    autoBorderLightenAmount: override.autoBorderLightenAmount,
    autoBackgroundHoverLightenAmount: override.autoBackgroundHoverLightenAmount,
    autoBorderHoverLightenAmount: override.autoBorderHoverLightenAmount,
    autoTextMinContrast: override.autoTextMinContrast,
  };
}
