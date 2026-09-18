import { colord } from 'colord';
import {
  type GlobalTypographyConfig,
  resolveTypographyColors,
} from '../../../components/GlobalTypography.config';
import { resolveContrastAwareTextColor } from '../../../helpers/surfaceColorDerivation';
import type { PolymorphicLayoutResolvedColors } from './PolymorphicLayout';

/**
 * The narrow column's own unified text ink (title/body/highlight, one
 * shared color, opacity-only hierarchy) while the scroll gradient backs it
 * — background→contrast-side resolution→dark-ink-saturation chromatic
 * blend→light-ink-on-light-background candidate. Extracted from
 * `pages/abstract.tsx`'s own `narrowColumnTypography` chain
 * (`PLAN-ABSTRACT-TYPOGRAPHY-COLOR-UNIFICATION.md` Part C), which
 * `pages/about.tsx` had already ported verbatim (own doc comment there: "not
 * just a simpler `resolveTypographyColors(...)` call... preserving its hue
 * in the ink produces chromatic text that doesn't match /abstract's own
 * deliberately-neutralized treatment").
 *
 * This is exactly the "config-only" gap AUDIT-POLYMORPHIC-GRADIENT-
 * ABSTRACTION.md flagged: `scrollGradientDarkInkSaturation*`/
 * `-DarkInkOpacityMultiplier*`/`-LightInkOnLightBackgroundContrastTolerance*`
 * were tier-resolved centrally inside `usePolymorphicLayoutColors`, but the
 * algorithm that actually turns those numbers into a rendered ink color
 * lived only in `abstract.tsx`/`about.tsx`'s own hand-duplicated blocks —
 * confirmed to have drifted into a THIRD independent gap the moment
 * `pages/posts/[slug].tsx` adopted the scroll gradient background (nav/
 * wordmark text reading in whatever flat, non-gradient-aware color
 * `SiteHeaderConfig` happened to already have, operator-reported,
 * screenshot evidence) — the same failure mode the audit's own
 * recommendation exists to close. Not baked into `usePolymorphicLayoutColors`
 * itself (`PolymorphicLayout.tsx`) because it needs a page's own
 * `GlobalTypographyConfig` as an input, a concept that layout hook has no
 * reason to know about — same "resolved centrally, one page-level wiring
 * call" tier `usePolymorphicColumnAdaptiveInk.ts` (its own sibling file
 * here) already established for the adjacent adaptive-ink capability, not
 * baked into `PolymorphicLayout.tsx`'s fully-automatic tier either, for the
 * identical reason.
 *
 * A plain pure function of its two inputs, not a React hook — nothing here
 * holds live/animated state (unlike `usePolymorphicColumnAdaptiveInk`, which
 * layers scroll-reactive smoothing on TOP of this function's own output via
 * its own `baseColor` param) — so every call site gets an up-to-date value
 * on every render with no memoization concerns of its own, matching how
 * `resolveTypographyColors`/`resolveContrastAwareTextColor` (the primitives
 * this composes) already work.
 *
 * `colors.narrowColumnGradientReferenceColor === undefined` (gradient
 * inactive/not narrow-column-backed) falls through to plain
 * `resolveTypographyColors(colors.narrowColumnColor, globalTypographyConfig)`
 * — byte-identical to every page's own pre-gradient narrow-column
 * typography, the same fallback both original call sites already had.
 */
export function resolvePolymorphicNarrowColumnTypography(
  colors: PolymorphicLayoutResolvedColors,
  globalTypographyConfig: GlobalTypographyConfig,
): {
  ink: string;
  titleColor: string; titleOpacity: number;
  bodyColor: string; bodyOpacity: number;
  highlightColor: string; highlightOpacity: number;
} {
  const gradientReferenceColor = colors.narrowColumnGradientReferenceColor;
  const narrowColumnGradientReference = gradientReferenceColor ?? colors.narrowColumnColor;
  // A saturated background is useful as a surface, but preserving its hue
  // in the ink produces chromatic blue/teal text that is neither the
  // footer's neutral contrast treatment nor a stable candidate across the
  // gradient. Use the actual sampled gradient only to choose the correct
  // light/dark contrast side; resolve the candidate against its achromatic
  // equivalent. This keeps the text neutral while still reacting to
  // narrow-variant darkness and saturation through the sampled surface
  // luminance.
  const narrowColumnContrastBackground = gradientReferenceColor
    ? colord(narrowColumnGradientReference).grayscale().toHex()
    : narrowColumnGradientReference;
  // One shared ink must survive the least-opaque narrow-column role. A
  // title-calibrated candidate reused by the body/timeline at bodyOpacity
  // alone washes toward the gradient.
  const darkInkSaturation = gradientReferenceColor
    ? colors.scrollGradientDarkInkSaturation
    : 0;
  // Opacity is deliberately an independent control from chroma. The
  // resolver receives the resulting body opacity below, ensuring the
  // returned dark candidate is calibrated for its real render opacity
  // instead of becoming illegibly faint after compositing.
  const darkInkOpacityScale = gradientReferenceColor
    ? colors.scrollGradientDarkInkOpacityMultiplier
    : 1;
  const narrowColumnTypographyConfig = gradientReferenceColor
    ? {
      ...globalTypographyConfig,
      titleOpacity: globalTypographyConfig.bodyOpacity * darkInkOpacityScale,
      bodyOpacity: globalTypographyConfig.bodyOpacity * darkInkOpacityScale,
      highlightOpacity: globalTypographyConfig.highlightOpacity * darkInkOpacityScale,
    }
    : globalTypographyConfig;
  const narrowColumnTypographyResolved = resolveTypographyColors(
    narrowColumnContrastBackground,
    narrowColumnTypographyConfig,
  );
  const narrowColumnLightInkCandidate = gradientReferenceColor
    && colors.scrollGradientLightInkOnLightBackgroundContrastTolerance > 0
    ? resolveContrastAwareTextColor(
      narrowColumnContrastBackground,
      globalTypographyConfig.minContrastRatio,
      0,
      {
        stable: true,
        toleranceRatio: colors.scrollGradientLightInkOnLightBackgroundContrastTolerance,
        targetOpacity: narrowColumnTypographyConfig.bodyOpacity,
        preferredSide: 'light',
      },
    )
    : undefined;
  const narrowColumnUnifiedInkColor = gradientReferenceColor
    ? (() => {
      const neutralInk = colord(
        narrowColumnLightInkCandidate ?? narrowColumnTypographyResolved.titleColor,
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
      const gradientHsl = colord(narrowColumnGradientReference).toHsl();
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
    : narrowColumnTypographyResolved.titleColor;

  // In the gradient-backed narrow column, visual hierarchy is carried by
  // opacity, not by independently hue-shifted role colors. This keeps every
  // glyph (including timeline/body/emphasis text, and now nav/wordmark on
  // any page that feeds this same value into SiteHeader) on the same
  // derived ink.
  return {
    ...narrowColumnTypographyResolved,
    ink: narrowColumnUnifiedInkColor,
    titleColor: narrowColumnUnifiedInkColor,
    bodyColor: narrowColumnUnifiedInkColor,
    highlightColor: narrowColumnUnifiedInkColor,
    // The shared ink is calibrated against the least-opaque body role
    // above, but each role must retain its own rendered opacity. Reusing
    // bodyOpacity for the title was the regression that washed out the
    // wordmark and made the hero appear to use a different color treatment.
    titleOpacity: globalTypographyConfig.titleOpacity * darkInkOpacityScale,
    bodyOpacity: globalTypographyConfig.bodyOpacity * darkInkOpacityScale,
    highlightOpacity: globalTypographyConfig.highlightOpacity * darkInkOpacityScale,
  };
}
