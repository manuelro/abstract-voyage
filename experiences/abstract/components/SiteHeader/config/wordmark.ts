import type { SiteHeaderColorMode } from './registered';

/**
 * Every configurable aspect of the "ABSTRACT · VOYAGE" wordmark
 * (Logo.tsx/LogoWithGradientBg) — color/adaptive derivation AND the SVG
 * glyph-stagger intro animation — centralized in one shared config both
 * `pages/about.tsx` and `pages/abstract.tsx` bind the SAME default from
 * (mirrors LayoutDebugConfig's own single-shared-instance pattern,
 * components/LayoutDebug.panel.ts). Previously the wordmark's color rode
 * on SiteHeaderConfig's own colorMode/logoColor/logoSurfaceOffset/
 * columnTextMinContrast fields — the exact same switch nav text/border
 * color also used — so a page whose SiteHeaderColorOverride happened to be
 * `enabled: false` (about.tsx) silently inherited whatever
 * columnTextMinContrast the shared nav-facing default (14.3) resolved to,
 * while /abstract's own `enabled: true` override (columnTextMinContrast
 * 4.5) never touched about's wordmark at all — two visually different
 * logos from what looked like "the same component," confirmed live via
 * screenshot comparison. The intro/motion fields below had no config
 * surface at all before this — they were hardcoded directly at Logo.tsx's
 * own `<SvgStaggerGroup>` call site.
 *
 * `colorMode`/`columnTextMinContrast` remain on SiteHeaderConfig too, but
 * now nav-text/nav-border-only — see that type's own doc comments. Logo
 * color is fully independent of those from here on.
 */
export type WordmarkColorMode = SiteHeaderColorMode;

/** Mirrors SvgStaggerGroup's own ScalePivot union (components/
 * SvgStaggerGroup.tsx) — re-declared here rather than imported so this
 * config file (and its normalize/default exports, read by every page) has
 * no dependency on a component module. */
export type WordmarkScalePivot =
  | 'center'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'left-center'
  | 'right-center'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type WordmarkIntroDirection = 'forward' | 'reverse';

export type WordmarkConfig = {
  // --- Color / adaptive derivation ---
  /** 'adaptive': fallback stops the page supplies (e.g. a live-sampled
   * WebGL gradient) — see SiteHeaderProps.logoStops's own doc comment.
   * 'custom': flat `color` below. 'surface': `color` derived from the page
   * surface color, offset by `surfaceOffset`. 'column' (default, both
   * about/abstract): derived from the split column's own physically-
   * painted color underneath the logo, via a WCAG-contrast-aware search
   * targeting `columnTextMinContrast`, biased by `surfaceOffset`. */
  colorMode: WordmarkColorMode;
  /** Only meaningful in 'custom' mode. */
  color: string;
  /** Meaningful in 'surface'/'column' mode — how much lighter (positive) or
   * darker (negative) than the base/contrast-search result the resolved
   * color is offset. */
  surfaceOffset: number;
  /** Only meaningful in 'column' mode. Target WCAG contrast ratio the
   * resolved color must clear against the split column's own physical
   * color. 4.5 (WCAG AA, normal text) — the value that makes the wordmark
   * render like /abstract's own effective (pre-consolidation) look, not
   * the much higher, near-white-forcing 14.3 the shared SiteHeaderConfig
   * default (nav-facing now) still uses. */
  columnTextMinContrast: number;

  // --- Intro animation (SvgStaggerGroup, per-glyph fade/scale/bloom) ---
  /** Off: glyphs render in their resting state immediately, no stagger. */
  introEnabled: boolean;
  /** Delay (s) before the first glyph's own fade/scale starts. */
  introInitialDelayS: number;
  /** Extra delay (s) added per glyph index. */
  introStepDelayS: number;
  /** Duration (s) of each glyph's own fade/scale animation. */
  introDurationS: number;
  /** CSS easing for the fade/scale — a curated set of named curves
   * (WORDMARK_INTRO_EASING_OPTIONS, wordmark.panel.ts), not a free-text
   * field (this config layer has no raw-string panel primitive — see
   * ColorConfigField/EnumConfigField/SelectConfigField in
   * components/Panel/config/types.ts). Default 'ease-in-out' matches
   * SvgStaggerGroup's own built-in default exactly (Logo.tsx never
   * overrode it before this config existed). */
  introEasing: string;
  /** 'forward': first glyph fades first. 'reverse' (default, matches
   * today's wordmark): last glyph fades first. */
  introDirection: WordmarkIntroDirection;
  /** Transform-origin pivot for each glyph's own scale term. */
  introScalePivot: WordmarkScalePivot;
  /** Off: brightness stays flat at introBloomBase (no bloom pulse), while
   * fade/scale still run for timing consistency. */
  introBloomEnabled: boolean;
  /** Resting brightness multiplier (1 = unmodified gradient). */
  introBloomBase: number;
  /** Peak brightness multiplier during the bloom moment. */
  introBloomPeak: number;
  /** Delay (s) before the first glyph's own bloom starts. */
  introBloomInitialDelayS: number;
  /** Extra delay (s) added per glyph index for the bloom. */
  introBloomStepDelayS: number;

  // --- Runtime color-change motion ---
  /** Duration (ms) the gradient stops cross-fade over when they change at
   * runtime (e.g. a live palette edit) — SvgGradientDef's own
   * stopTransitionMs, previously hardcoded 280 at SiteHeader.tsx's own
   * `<Logo>` call site. */
  colorTransitionMs: number;
};

export const DEFAULT_WORDMARK_CONFIG: WordmarkConfig = {
  colorMode: 'column',
  color: '#f5f5f5',
  surfaceOffset: 0,
  columnTextMinContrast: 4.5,
  introEnabled: true,
  introInitialDelayS: 0.01,
  introStepDelayS: 0.02,
  introDurationS: 1.4,
  introEasing: 'ease-in-out',
  introDirection: 'reverse',
  introScalePivot: 'left-center',
  introBloomEnabled: true,
  introBloomBase: 1,
  introBloomPeak: 1.4,
  introBloomInitialDelayS: 0.1,
  introBloomStepDelayS: 0.08,
  colorTransitionMs: 280,
};

const COLOR_MODES: ReadonlyArray<WordmarkColorMode> = [
  'adaptive', 'custom', 'surface', 'column',
];
const SCALE_PIVOTS: ReadonlyArray<WordmarkScalePivot> = [
  'center', 'top-left', 'top-center', 'top-right', 'left-center',
  'right-center', 'bottom-left', 'bottom-center', 'bottom-right',
];
const INTRO_DIRECTIONS: ReadonlyArray<WordmarkIntroDirection> = ['forward', 'reverse'];

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

export function normalizeWordmarkConfig(
  config: Partial<WordmarkConfig> | undefined,
): WordmarkConfig {
  const base = { ...DEFAULT_WORDMARK_CONFIG, ...(config ?? {}) };
  return {
    colorMode: token(base.colorMode, COLOR_MODES, DEFAULT_WORDMARK_CONFIG.colorMode),
    color: normalizeColor(base.color, DEFAULT_WORDMARK_CONFIG.color),
    surfaceOffset: clampRange(base.surfaceOffset, -1, 1, DEFAULT_WORDMARK_CONFIG.surfaceOffset),
    columnTextMinContrast: clampRange(
      base.columnTextMinContrast, 1, 21, DEFAULT_WORDMARK_CONFIG.columnTextMinContrast,
    ),
    introEnabled: base.introEnabled !== false,
    introInitialDelayS: clampRange(
      base.introInitialDelayS, 0, 3, DEFAULT_WORDMARK_CONFIG.introInitialDelayS,
    ),
    introStepDelayS: clampRange(
      base.introStepDelayS, 0, 1, DEFAULT_WORDMARK_CONFIG.introStepDelayS,
    ),
    introDurationS: clampRange(
      base.introDurationS, 0, 4, DEFAULT_WORDMARK_CONFIG.introDurationS,
    ),
    introEasing: typeof base.introEasing === 'string' && base.introEasing.trim()
      ? base.introEasing
      : DEFAULT_WORDMARK_CONFIG.introEasing,
    introDirection: token(
      base.introDirection, INTRO_DIRECTIONS, DEFAULT_WORDMARK_CONFIG.introDirection,
    ),
    introScalePivot: token(
      base.introScalePivot, SCALE_PIVOTS, DEFAULT_WORDMARK_CONFIG.introScalePivot,
    ),
    introBloomEnabled: base.introBloomEnabled !== false,
    introBloomBase: clampRange(
      base.introBloomBase, 0, 3, DEFAULT_WORDMARK_CONFIG.introBloomBase,
    ),
    introBloomPeak: clampRange(
      base.introBloomPeak, 0, 3, DEFAULT_WORDMARK_CONFIG.introBloomPeak,
    ),
    introBloomInitialDelayS: clampRange(
      base.introBloomInitialDelayS, 0, 3, DEFAULT_WORDMARK_CONFIG.introBloomInitialDelayS,
    ),
    introBloomStepDelayS: clampRange(
      base.introBloomStepDelayS, 0, 1, DEFAULT_WORDMARK_CONFIG.introBloomStepDelayS,
    ),
    colorTransitionMs: clampRange(
      base.colorTransitionMs, 0, 2000, DEFAULT_WORDMARK_CONFIG.colorTransitionMs,
    ),
  };
}
