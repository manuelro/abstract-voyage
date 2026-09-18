import { colord } from 'colord';
import {
  type GlobalTypographyConfig,
  resolveTypographyColors,
} from '../../../components/GlobalTypography.config';
import { resolveContrastAwareTextColor } from '../../../helpers/surfaceColorDerivation';
import type { PolymorphicLayoutResolvedColors } from './PolymorphicLayout';

type GradientColumnTypography = {
  ink: string;
  titleColor: string; titleOpacity: number;
  bodyColor: string; bodyOpacity: number;
  highlightColor: string; highlightOpacity: number;
};

/**
 * The real, physically-painted background reference for a column while the
 * scroll gradient is active — never the raw `colors.wideColumnColor`/
 * `narrowColumnColor`, which collapse to the literal CSS paint sentinel
 * `'transparent'` the instant `wideColumnTransparent`/`narrowColumnTransparent`
 * is true (required for the gradient to paint at all — see
 * `PolymorphicLayout.tsx`'s own `wideColumnColor`/`narrowColumnColor`
 * definitions). Feeding that literal string into any contrast-aware color
 * resolver produces a meaningless decision — `colord('transparent')`
 * evaluates as effectively black, so the resolver thinks it's placing text
 * on a dark background and pushes every derived ink toward near-white,
 * invisible against the real light gradient. Confirmed exactly this bug,
 * twice, in two independent color systems that each read
 * `colors.wideColumnColor`/`narrowColumnColor` directly instead of through
 * this function: `/about`'s own `AboutTimeline` (fixed by porting /abstract's
 * fallback chain by hand) and `pages/posts/[slug].tsx`'s own
 * `readingPresentation.ts`-based article/ToC ink (same fix, same hand-port,
 * before this function existed to prevent a third).
 *
 * Fallback order: the real sampled gradient reference for this column when
 * one exists (only the narrow column has a desktop "variant" concept with
 * its own sampled reference — see `narrowColumnGradientReferenceColor`'s own
 * doc comment on `PolymorphicLayoutResolvedColors`); else the shared
 * gradient's own origin (first) stop, a reasonable single-color stand-in for
 * either column when no column-specific sample exists; else the raw column
 * color as a last resort for when the gradient is genuinely inactive (at
 * which point it's a real, physically-painted color again, not
 * `'transparent'`).
 */
export function resolvePolymorphicColumnBackgroundReference(
  colors: PolymorphicLayoutResolvedColors,
  column: 'wide' | 'narrow',
): string {
  if (column === 'narrow') {
    return colors.narrowColumnGradientReferenceColor
      ?? colors.scrollGradientOriginColor
      ?? colors.narrowColumnColor;
  }
  return colors.scrollGradientOriginColor ?? colors.wideColumnColor;
}

/**
 * The shared column-unified text ink algorithm — background→contrast-side
 * resolution→dark-ink-saturation chromatic blend→light-ink-on-light-
 * background candidate. One shared color for title/body/highlight,
 * opacity-only role hierarchy. Extracted from `pages/abstract.tsx`'s own
 * `narrowColumnTypography` chain (`PLAN-ABSTRACT-TYPOGRAPHY-COLOR-
 * UNIFICATION.md` Part C).
 *
 * Deliberately NOT `resolveTypographyColors(backgroundColor, config)`
 * directly, which preserves the background's own full hue/saturation in the
 * ink (confirmed wrong twice: /about's own doc comment — "produced a
 * visibly different, more-saturated color than /abstract's own wordmark/
 * timeline ink" — and /posts's own article/ToC text via
 * `readingPresentation.ts`'s `deriveReadableInk`, reading in a vivid,
 * clashing green/teal on mobile, screenshot-reported, where the base-tier
 * gradient's own `scrollGradientChromaMin: 100` at `scrollGradientBaseHue:
 * 190` — a cyan-leaning hue — produces a background reference whose FULL
 * saturation, carried straight into a high-contrast/low-lightness ink,
 * reads as a saturated, unmistakably colored hue rather than the neutral
 * blue-gray `/abstract` actually uses). This function grayscales the
 * background reference FIRST, then reintroduces only a bounded fraction of
 * its original hue/saturation via `darkInkSaturation` — the ink stays
 * fundamentally neutral, with the gradient's own color only ever a
 * restrained tint on top, never the ink's own dominant hue.
 *
 * A plain pure function, not a React hook — nothing here holds live/
 * animated state (unlike `usePolymorphicColumnAdaptiveInk`, which layers
 * scroll-reactive smoothing on TOP of this function's own output via its
 * own `baseColor` param).
 *
 * `gradientReferenceColor === undefined` (gradient inactive for this
 * column) falls through to plain `resolveTypographyColors(fallbackColor,
 * globalTypographyConfig)` — byte-identical to every page's own
 * pre-gradient column typography.
 */
function resolveGradientColumnTypography(
  gradientReferenceColor: string | undefined,
  fallbackColor: string,
  darkInkSaturationInput: number,
  darkInkOpacityMultiplier: number,
  lightInkOnLightBackgroundContrastTolerance: number,
  globalTypographyConfig: GlobalTypographyConfig,
): GradientColumnTypography {
  const columnGradientReference = gradientReferenceColor ?? fallbackColor;
  // A saturated background is useful as a surface, but preserving its hue
  // in the ink produces chromatic text that is neither a neutral contrast
  // treatment nor a stable candidate across the gradient. Use the actual
  // sampled gradient only to choose the correct light/dark contrast side;
  // resolve the candidate against its achromatic equivalent. This keeps the
  // text neutral while still reacting to the sampled surface luminance.
  const contrastBackground = gradientReferenceColor
    ? colord(columnGradientReference).grayscale().toHex()
    : columnGradientReference;
  // One shared ink must survive the least-opaque role. A title-calibrated
  // candidate reused by the body/timeline at bodyOpacity alone washes
  // toward the gradient.
  const darkInkSaturation = gradientReferenceColor ? darkInkSaturationInput : 0;
  // Opacity is deliberately an independent control from chroma. The
  // resolver receives the resulting body opacity below, ensuring the
  // returned dark candidate is calibrated for its real render opacity
  // instead of becoming illegibly faint after compositing.
  const darkInkOpacityScale = gradientReferenceColor ? darkInkOpacityMultiplier : 1;
  const typographyConfig = gradientReferenceColor
    ? {
      ...globalTypographyConfig,
      titleOpacity: globalTypographyConfig.bodyOpacity * darkInkOpacityScale,
      bodyOpacity: globalTypographyConfig.bodyOpacity * darkInkOpacityScale,
      highlightOpacity: globalTypographyConfig.highlightOpacity * darkInkOpacityScale,
    }
    : globalTypographyConfig;
  const typographyResolved = resolveTypographyColors(contrastBackground, typographyConfig);
  const lightInkCandidate = gradientReferenceColor
    && lightInkOnLightBackgroundContrastTolerance > 0
    ? resolveContrastAwareTextColor(
      contrastBackground,
      globalTypographyConfig.minContrastRatio,
      0,
      {
        stable: true,
        toleranceRatio: lightInkOnLightBackgroundContrastTolerance,
        targetOpacity: typographyConfig.bodyOpacity,
        preferredSide: 'light',
      },
    )
    : undefined;
  const unifiedInkColor = gradientReferenceColor
    ? (() => {
      const neutralInk = colord(
        lightInkCandidate ?? typographyResolved.titleColor,
      ).grayscale();
      if (darkInkSaturation === 0) return neutralInk.toHex();
      // Contrast-side (and, when the light-ink candidate is active,
      // lightness) selection still comes from the achromatic surface above
      // — this only reintroduces a bounded amount of the sampled gradient's
      // chroma on top of it, so the tolerance-driven light-ink path doesn't
      // permanently discard darkInkSaturation the way an unconditional
      // grayscale return used to (BUGS-AUDIT-COVERFLOW-NEIGHBOR-COLOR.md-
      // adjacent regression class — see AUDIT-POLYMORPHIC-GRADIENT-
      // ABSTRACTION.md and PLAN-COVERFLOW-NARROW-GRADIENT-SYNC.md's own
      // status log for the exact incident this fixed once already).
      const neutralInkHsl = neutralInk.toHsl();
      const gradientHsl = colord(columnGradientReference).toHsl();
      // Do not resolve this second candidate through the contrast search:
      // at the dark endpoint HSL lightness approaches 0 and its saturation
      // collapses, making a supposedly chromatic candidate indistinguishable
      // from the neutral one. Retain the contrast-derived lightness, but
      // take hue/saturation directly from the sampled gradient so the
      // control has a visible and bounded effect.
      const chromaticInk = colord({
        h: gradientHsl.h,
        // The gradient sample can be a pastel whose raw HSL saturation is
        // numerically small. Treat the control as saturation intensity, not
        // a weak blend amount: progressively boost the source saturation so
        // the authored value produces a perceptible tint in the ink.
        s: Math.min(100, gradientHsl.s * (1 + darkInkSaturation * 4)),
        l: Math.max(6, neutralInkHsl.l),
      }).toHex();
      return neutralInk.mix(
        chromaticInk,
        Math.min(1, darkInkSaturation),
      ).toHex();
    })()
    : typographyResolved.titleColor;

  // In the gradient-backed column, visual hierarchy is carried by opacity,
  // not by independently hue-shifted role colors. This keeps every glyph on
  // the same derived ink.
  return {
    ...typographyResolved,
    ink: unifiedInkColor,
    titleColor: unifiedInkColor,
    bodyColor: unifiedInkColor,
    highlightColor: unifiedInkColor,
    // The shared ink is calibrated against the least-opaque body role
    // above, but each role must retain its own rendered opacity. Reusing
    // bodyOpacity for the title was the regression that washed out the
    // wordmark and made the hero appear to use a different color treatment.
    titleOpacity: globalTypographyConfig.titleOpacity * darkInkOpacityScale,
    bodyOpacity: globalTypographyConfig.bodyOpacity * darkInkOpacityScale,
    highlightOpacity: globalTypographyConfig.highlightOpacity * darkInkOpacityScale,
  };
}

/**
 * The narrow column's own unified text ink — see
 * `resolveGradientColumnTypography`'s own doc comment for the full
 * algorithm. Reads its dark-ink-saturation/opacity/light-ink-tolerance
 * knobs straight off `colors` (already tier-resolved by
 * `usePolymorphicLayoutColors`) — a page never needs to pass these itself.
 */
export function resolvePolymorphicNarrowColumnTypography(
  colors: PolymorphicLayoutResolvedColors,
  globalTypographyConfig: GlobalTypographyConfig,
): GradientColumnTypography {
  return resolveGradientColumnTypography(
    colors.narrowColumnGradientReferenceColor,
    colors.narrowColumnColor,
    colors.scrollGradientDarkInkSaturation,
    colors.scrollGradientDarkInkOpacityMultiplier,
    colors.scrollGradientLightInkOnLightBackgroundContrastTolerance,
    globalTypographyConfig,
  );
}

/**
 * The wide column's own counterpart to
 * `resolvePolymorphicNarrowColumnTypography` above — same algorithm, same
 * shared `resolveGradientColumnTypography`, only the column-specific
 * background reference differs (no wide-column "variant" sample exists, so
 * this falls to `resolvePolymorphicColumnBackgroundReference`'s own
 * `scrollGradientOriginColor` fallback — the same anchor
 * `pages/abstract.tsx`'s own `mobileArticleListBackgroundAtRest` already
 * uses for its wide column). Exists specifically so a page's own
 * wide-column reading content (e.g. `/posts`'s own markdown article body)
 * can get the exact same neutralized, non-clashing ink `/abstract` and
 * `/about` already use for their narrow columns, instead of an
 * independently-tuned color system that preserves the gradient's own raw
 * (and, at some tiers, quite saturated) hue.
 */
export function resolvePolymorphicWideColumnTypography(
  colors: PolymorphicLayoutResolvedColors,
  globalTypographyConfig: GlobalTypographyConfig,
): GradientColumnTypography {
  return resolveGradientColumnTypography(
    colors.scrollGradientWideColumnActive
      ? resolvePolymorphicColumnBackgroundReference(colors, 'wide')
      : undefined,
    colors.wideColumnColor,
    colors.scrollGradientDarkInkSaturation,
    colors.scrollGradientDarkInkOpacityMultiplier,
    colors.scrollGradientLightInkOnLightBackgroundContrastTolerance,
    globalTypographyConfig,
  );
}
