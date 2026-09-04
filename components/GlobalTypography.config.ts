import { resolveContrastAwareTextColor } from '../helpers/surfaceColorDerivation';

export type GlobalHeadingFontFamily = 'sans' | 'serif';

/**
 * Site-wide default for which font family headings render in — not owned by
 * any one page or component. Every heading-bearing component (PageTitle,
 * SectionHeading, FiberHeading, AbstractEditorialHero, SiteHeader)
 * reads this as its own *fallback* whenever its own fontFamily field is
 * 'inherit' (see each component's own .config.ts) — this scope itself never
 * carries a per-component override, and no component's own default value
 * references this object. See AGENTS.md's "Per-page config ownership"
 * section for why a shared default must never itself carry the override/
 * merge shape (SiteHeaderColorOverride/CtaButtonColorOverride) —
 * this scope and each component's 'inherit' sentinel stay permanently
 * decoupled data, joined only by read-time resolution logic.
 */
export type GlobalTypographyConfig = {
  headingFontFamily: GlobalHeadingFontFamily;
  /**
   * PLAN-ABSTRACT-TYPOGRAPHY-COLOR-UNIFICATION.md Part C — one resolved
   * "ink" color per background region (see resolveTypographyColors below),
   * three roles derived from it by opacity ratio rather than three
   * independently re-derived colors. Same "one 'column'-mode text-color
   * algorithm, several consumers" precedent resolveContrastAwareTextColor
   * already set (helpers/surfaceColorDerivation.ts) — this is that
   * algorithm's own opinionated, role-based consumption layer, still
   * optional per component (see each consuming component's own doc comment
   * for its own opt-in override).
   *
   * Flat values, not tiered per breakpoint like most fields in this
   * codebase — a deliberate scope-narrowing decision (operator-confirmed
   * 2026-09-04) to keep this first version's config surface small; revisit
   * only if a real screen shows a role needs to read differently at a
   * different size.
   */
  titleOpacity: number;
  bodyOpacity: number;
  highlightOpacity: number;
  /** Shared target every role's ink search aims for — see
   * resolveTypographyColors' own doc comment for why the *search* itself is
   * always calibrated against bodyOpacity (the least render-opacity
   * headroom of the three roles) regardless of which role is asking. */
  minContrastRatio: number;
  /** Bounded AA shortfall `title`/`highlight` may fall into before the
   * resolver gives up and returns the pure black/white endpoint — see
   * resolveStableContrastAwareTextColor's own doc comment
   * (helpers/surfaceColorDerivation.ts) for the mechanism itself. */
  toleranceRatio: number;
  /** `body`'s own wider tolerance — verified live (2026-09-04) against this
   * page's own real backgrounds: near-tie-point mid-tones (the same
   * background class that motivated the deterministic resolver in the
   * first place) have almost no contrast headroom to spare even before any
   * opacity dilution, so bodyOpacity's dilution alone can cost more than
   * `toleranceRatio` above tolerates. Worst case measured: 3.83:1 at
   * bodyOpacity 0.85 against a real /abstract background. Kept as its own
   * field rather than silently widening toleranceRatio for every role —
   * title/highlight, at much higher render opacity, don't have this
   * problem and shouldn't inherit a wider deviation they don't need. */
  bodyToleranceRatio: number;
};

export const DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG = {
  headingFontFamily: 'sans',
  titleOpacity: 1,
  bodyOpacity: 0.38,
  highlightOpacity: 1,
  minContrastRatio: 4.3,
  toleranceRatio: 0.3,
  bodyToleranceRatio: 0.7,
} satisfies GlobalTypographyConfig;

const HEADING_FONT_FAMILIES: ReadonlyArray<GlobalHeadingFontFamily> = ['sans', 'serif'];

const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);

const clampFraction = (value: number, fallback: number): number => (
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback
);

const clampRatio = (value: number, fallback: number): number => (
  Number.isFinite(value) ? Math.min(21, Math.max(1, value)) : fallback
);

const clampTolerance = (value: number, fallback: number): number => (
  Number.isFinite(value) ? Math.min(20, Math.max(0, value)) : fallback
);

/** Single normalization path for every runtime and panel-provided value. */
export function normalizeGlobalTypographyConfig(
  config: Partial<GlobalTypographyConfig> | undefined,
): GlobalTypographyConfig {
  const base = { ...DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG, ...(config ?? {}) };
  return {
    headingFontFamily: token(
      base.headingFontFamily, HEADING_FONT_FAMILIES, DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG.headingFontFamily,
    ),
    titleOpacity: clampFraction(base.titleOpacity, DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG.titleOpacity),
    bodyOpacity: clampFraction(base.bodyOpacity, DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG.bodyOpacity),
    highlightOpacity: clampFraction(base.highlightOpacity, DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG.highlightOpacity),
    minContrastRatio: clampRatio(base.minContrastRatio, DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG.minContrastRatio),
    toleranceRatio: clampTolerance(base.toleranceRatio, DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG.toleranceRatio),
    bodyToleranceRatio: clampTolerance(
      base.bodyToleranceRatio, DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG.bodyToleranceRatio,
    ),
  };
}

/**
 * The Part C resolver: one deterministic *decision mechanism* per background
 * region (helpers/surfaceColorDerivation.ts's own
 * resolveStableContrastAwareTextColor, via resolveContrastAwareTextColor's
 * `stable` option) — never the old two-sided coin-flip search, which is what
 * let the header wordmark and the hero headline resolve to opposite ends
 * against what was supposed to be the identical background (see this file's
 * own PLAN doc for the live-measured incident). `stable` mode picks its
 * side from `backgroundColor` alone (a fixed luminance threshold, no other
 * input feeds that decision), so every role below always lands on the same
 * side as every other — that guarantee doesn't require sharing one literal
 * hex, only sharing the same deterministic algorithm and background input.
 *
 * Each role is still resolved with its *own* targetOpacity/toleranceRatio
 * (title/highlight against `toleranceRatio`, body against
 * `bodyToleranceRatio`) rather than one shared ink calibrated to whichever
 * role dilutes most. An earlier version searched once against `bodyOpacity`
 * alone and reused that single ink for title/highlight too, reasoning "an
 * ink that survives body's own dilution automatically clears the target for
 * title/highlight" — true for contrast, but it also means turning
 * `bodyOpacity` down alone drags title/highlight's *color* toward the
 * black/white endpoint even though their own render opacity never changed
 * (live-confirmed: a headline/wordmark rendered at titleOpacity 1 visibly
 * flattened to near-black as bodyOpacity alone was lowered, losing the
 * background's hue it had no reason to lose). Resolving per-role keeps each
 * role's own opacity fully self-contained, the same way titleOpacity/
 * bodyOpacity/highlightOpacity are already three independent config fields.
 *
 * `titleColor`/`bodyColor`/`highlightColor` are flat ink hexes — deliberately
 * NOT rgba strings with each role's own opacity baked into the alpha channel
 * (an earlier version of this function did that, and it broke two different
 * ways in practice: (1) every consumer of an SvgStop `color` field in this
 * codebase — SiteHeader's own resolveSiteHeaderLogoStops, every other call
 * site — assumes a bare hex and prepends a literal '#', producing an invalid
 * `#rgba(...)` stop-color the SVG renderer silently drops to black; (2)
 * AbstractEditorialHero and AboutTimelineRow *already* apply their own role
 * opacity as a separate CSS `opacity` style alongside `color` — baking
 * opacity into the color string too would have alpha-composited twice,
 * ending up more diluted than either opacity value alone specifies).
 * Callers apply `titleOpacity`/`bodyOpacity`/`highlightOpacity` below via
 * each component's own existing opacity mechanism instead — returned here so
 * a caller has the complete "what to render" instruction set (color +
 * opacity per role) without a second read of GlobalTypographyConfig.
 */
export function resolveTypographyColors(
  backgroundColor: string,
  config: GlobalTypographyConfig,
): {
  ink: string;
  titleColor: string; titleOpacity: number;
  bodyColor: string; bodyOpacity: number;
  highlightColor: string; highlightOpacity: number;
} {
  const resolveRole = (targetOpacity: number, toleranceRatio: number) => (
    resolveContrastAwareTextColor(backgroundColor, config.minContrastRatio, 0, {
      stable: true,
      targetOpacity,
      toleranceRatio,
    })
  );
  const titleColor = resolveRole(config.titleOpacity, config.toleranceRatio);
  const bodyColor = resolveRole(config.bodyOpacity, config.bodyToleranceRatio);
  const highlightColor = resolveRole(config.highlightOpacity, config.toleranceRatio);
  return {
    ink: titleColor,
    titleColor,
    titleOpacity: config.titleOpacity,
    bodyColor,
    bodyOpacity: config.bodyOpacity,
    highlightColor,
    highlightOpacity: config.highlightOpacity,
  };
}
