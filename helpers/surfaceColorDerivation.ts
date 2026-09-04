import { colord, extend } from 'colord';
import a11yPlugin from 'colord/plugins/a11y';

extend([a11yPlugin]);

/**
 * One base color, everything else derived from it — the same primitive
 * CtaButton.tsx already used for its own auto background/border colors
 * (colord(surfaceColor).lighten(amount)), generalized to also go darker.
 * offset is signed and clamped to -1..1: positive lightens (colord's own
 * .lighten), negative darkens (.darken) by the absolute value. Additive on
 * HSL lightness (not multiplicative) so it behaves consistently regardless
 * of how light or dark surfaceColor already is — a multiplicative "×2
 * brighter" factor degenerates to a no-op on a near-black surface (2×0=0),
 * which an additive percentage-point shift doesn't.
 */
export function deriveSurfaceColor(surfaceColor: string, offset: number): string {
  const clamped = Math.min(1, Math.max(-1, Number.isFinite(offset) ? offset : 0));
  return clamped >= 0
    ? colord(surfaceColor).lighten(clamped).toHex()
    : colord(surfaceColor).darken(-clamped).toHex();
}

/**
 * The exact same color, at reduced opacity — unlike deriveSurfaceColor
 * above (which shifts HSL lightness, producing a genuinely different tint),
 * this keeps hue/saturation/lightness untouched and only lowers alpha, for
 * callers whose intent is "this color, faded," not "a lighter/darker
 * relative." opacityFraction (0..1, unsigned — there's no "more opaque than
 * the source" direction) is used as the resulting alpha directly: 0.38
 * returns the source color at 38% alpha ("62% transparent"). Round 2
 * (operator correction, live screenshot evidence): an earlier version of
 * this function computed alpha as `1 - opacityFraction`, which inverted the
 * requested reading — 0.38 came out 62% *opaque* (38% transparent) instead
 * of the 62% *transparent* the operator specified. Kept as a direct,
 * uninverted mapping now so the config value always equals the rendered
 * alpha with no sign flip to misread.
 */
export function deriveTransparentTint(color: string, opacityFraction: number): string {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(opacityFraction) ? opacityFraction : 0));
  return colord(color).alpha(clamped).toRgbString();
}

/**
 * Paints `foregroundColor` over `backgroundColor` at `opacityFraction`, but
 * returns the resulting *opaque* color instead of an rgba value. This gives
 * an operator the familiar opacity control while keeping a flat card face
 * stable when cards overlap: every card receives the same final pigment,
 * rather than repeatedly alpha-compositing into the cards behind it.
 *
 * The direction is inherent in the two colors. A darker foreground darkens
 * the underlay and a lighter foreground lightens it, so callers can derive
 * the foreground with resolveContrastAwareTextColor and retain its
 * light/dark decision without a second, disconnected color knob.
 */
export function deriveOpaqueTint(
  foregroundColor: string,
  backgroundColor: string,
  opacityFraction: number,
): string {
  const opacity = Math.min(1, Math.max(0, Number.isFinite(opacityFraction) ? opacityFraction : 0));
  const foreground = colord(foregroundColor).toRgb();
  const background = colord(backgroundColor).toRgb();
  const blend = (foregroundChannel: number, backgroundChannel: number) => (
    Math.round(foregroundChannel * opacity + backgroundChannel * (1 - opacity))
  );

  return colord({
    r: blend(foreground.r, background.r),
    g: blend(foreground.g, background.g),
    b: blend(foreground.b, background.b),
  }).toHex();
}

/** Returns one opaque RGB interpolation between two valid colors. Keeping
 * this opaque is important for overlapping coverflow cards: alpha would
 * compound with every card behind it instead of describing one stable face. */
export function blendOpaqueColors(fromColor: string, toColor: string, amount: number): string {
  const ratio = Math.min(1, Math.max(0, Number.isFinite(amount) ? amount : 0));
  const from = colord(fromColor).toRgb();
  const to = colord(toColor).toRgb();
  return colord({
    r: Math.round(from.r + (to.r - from.r) * ratio),
    g: Math.round(from.g + (to.g - from.g) * ratio),
    b: Math.round(from.b + (to.b - from.b) * ratio),
  }).toHex();
}

/**
 * Picks a legible tint of backgroundColor's own hue for text over it. Both
 * darker and lighter candidates are considered: a binary search finds the
 * closest passing lightness on each side, then the candidate nearest the
 * offset-biased preference wins. This matters for saturated mid-tone colors
 * such as red/green: `isDark()` alone can choose the lighter direction even
 * when only the darker direction can reach 4.5:1.
 *
 * Hue/saturation are retained while a passing tint exists. The search is
 * allowed to reach lightness 0/100 (true black/white, where hue naturally
 * disappears) because stopping at the former 4/96 bounds could miss WCAG
 * contrast that was physically available. If the requested ratio exceeds
 * the maximum possible contrast against the background, the higher-contrast
 * black/white endpoint is returned instead of claiming the minimum was met.
 * Originally CtaButton.tsx's own private
 * resolveAutoTextColor, extracted here so every 'column'-mode text-color
 * field across the split-column components can share the same algorithm.
 *
 * offset (-1..1, same signed convention as deriveSurfaceColor's own offset)
 * biases *which* passing lightness the search prefers, not whether one is
 * required: it nudges the preferred lightness before the safe candidates
 * are compared. An already-safe preferred color is returned directly;
 * otherwise the nearest safe boundary wins. offset: 0 prefers the smallest
 * contrast-producing change from the background color itself.
 */
/**
 * Luminance cutoff for resolveStableContrastAwareTextColor's own light/dark
 * decision — sits inside the empirically-measured crossover (~0.178-0.22,
 * PLAN-ABSTRACT-TYPOGRAPHY-COLOR-UNIFICATION.md's own live measurements at
 * two viewports) where black-text and white-text contrast against a
 * background become roughly equal. WCAG relative luminance (colord's own
 * .luminance(), 0=black..1=white), not HSL lightness — the same unit
 * .contrast() already uses, so the decision and the measurement never
 * disagree about what "background brightness" means.
 */
const STABLE_DECISION_THRESHOLD_LUMINANCE = 0.2;
/**
 * Floating-point jitter guard only — NOT a perceptual deadband/hysteresis
 * zone. resolveStableContrastAwareTextColor is a pure function of
 * backgroundColor alone (no prior-call state to stay "sticky" against), so
 * a single fixed threshold is already fully deterministic on its own: the
 * same input hex always produces the same side. This epsilon exists purely
 * to keep a background luminance landing at e.g. 0.19999999997 (a rounding
 * artifact of an upstream color computation, not a genuine near-boundary
 * color) from reading as "below" the threshold by accident.
 */
const STABLE_DECISION_EPSILON = 0.005;

/**
 * Deterministic sibling of resolveContrastAwareTextColor below — same
 * legibility guarantee, different decision mechanism. The two-sided
 * function's tie-break (try both darker and lighter, keep whichever passing
 * candidate is numerically closer to the background's own lightness) is a
 * near-50/50 coin flip for mid-tone backgrounds: two call sites given the
 * literal same background color can land on opposite sides from a fraction-
 * of-a-percent difference in how each computed its input (confirmed live,
 * PLAN-ABSTRACT-TYPOGRAPHY-COLOR-UNIFICATION.md's Context section — a header
 * wordmark and a hero headline resolved to rgb(2,2,3) vs rgb(253,252,253)
 * against what was supposed to be the identical background).
 *
 * This function removes the coin flip by deciding the side *first*, from a
 * single fixed luminance threshold — nothing else feeds that decision, so
 * the same background always resolves to the same side, full stop — then
 * searches only that one direction for the nearest passing lightness.
 *
 * targetOpacity (0..1, default 1) closes a second, independent gap: a color
 * that clears minContrastRatio at full opacity does not clear it once
 * alpha-blended toward the background at a lower render opacity (this is
 * exactly what Part C's title/body/highlight roles do — the same resolved
 * ink rendered at different opacities over one background). Supplying the
 * *lowest* opacity a caller plans to render at here makes the search find an
 * ink that survives its own eventual dilution, rather than being correct
 * only in the hypothetical case it's rendered fully opaque.
 *
 * toleranceRatio (>=0, default 0) is the one deliberate, bounded departure
 * from strict AA this function makes: if the decided side genuinely cannot
 * reach minContrastRatio (even at full opacity, at the L=0/100 endpoint), a
 * shortfall of up to toleranceRatio is accepted before falling back to that
 * endpoint outright — e.g. toleranceRatio: 0.3 against a 4.5 target accepts
 * as low as 4.2:1. This never crosses to the other side to chase a better
 * number; doing so would reintroduce the exact instability this function
 * exists to remove. Every config that actually lands in this shortfall band
 * is worth surfacing explicitly at the call site (not silently accepted) so
 * the deviation stays auditable.
 */
function resolveStableContrastAwareTextColor(
  backgroundColor: string,
  minContrastRatio: number,
  toleranceRatio: number = 0,
  targetOpacity: number = 1,
): string {
  const surface = colord(backgroundColor);
  const { h, s, l } = surface.toHsl();
  const targetRatio = Number.isFinite(minContrastRatio)
    ? Math.min(21, Math.max(1, minContrastRatio))
    : 1;
  const clampedTolerance = Math.min(
    targetRatio - 1,
    Math.max(0, Number.isFinite(toleranceRatio) ? toleranceRatio : 0),
  );
  const clampedOpacity = Math.min(1, Math.max(0, Number.isFinite(targetOpacity) ? targetOpacity : 1));
  // Saturation boost: `s` alone (the background's own saturation) is what
  // every candidate below used to render at, at every lightness — fine at
  // clampedOpacity 1, where the candidate *is* the rendered pixel. Once
  // alpha-blended toward the background at a lower render opacity, the
  // search's own lightness climbs toward the background's own (typically
  // light, low-chroma) lightness to keep clearing minContrastRatio — and a
  // pastel background's already-modest saturation, carried unboosted into
  // that much lighter blended result, reads as visually flat/gray despite
  // numerically still being "s% saturated" (HSL saturation alone doesn't
  // track perceived colorfulness at high lightness — the same percentage
  // needs far more numeric saturation to look tinted near-white than it does
  // near-black). Scaling saturation up toward 100 as clampedOpacity falls
  // toward 0 counteracts exactly that: full boost only kicks in once
  // rendering is heavily diluted, none at clampedOpacity 1 (boostedS === s,
  // byte-identical output to before this existed). Baked into colorAt
  // itself (not applied after the fact) so the contrast search below always
  // measures the actual boosted-chroma candidate it will return, never a
  // plain-`s` swatch it never renders.
  const boostedS = Math.min(100, s + (100 - s) * (1 - clampedOpacity));
  const colorAt = (lightness: number) => colord({ h, s: boostedS, l: lightness }).toHex();
  // The opacity-aware measurement: paint the candidate over the background
  // at clampedOpacity (blendOpaqueColors above — same alpha-compositing
  // primitive every other opacity-driven color in this codebase already
  // uses) before measuring contrast, so the search target is "survives its
  // own render opacity," not "passes in isolation at 100%."
  const blendedAt = (lightness: number) => (
    clampedOpacity >= 1 ? colorAt(lightness) : blendOpaqueColors(backgroundColor, colorAt(lightness), clampedOpacity)
  );
  const contrastAt = (lightness: number) => colord(blendedAt(lightness)).contrast(backgroundColor);

  const preferLight = surface.luminance() < STABLE_DECISION_THRESHOLD_LUMINANCE - STABLE_DECISION_EPSILON;
  const searchOnSide = (target: number): number | null => {
    const endpoint = preferLight ? 100 : 0;
    if (contrastAt(endpoint) < target) return null;
    let passing = endpoint;
    let failing = l;
    for (let index = 0; index < 20; index += 1) {
      const candidate = (passing + failing) / 2;
      if (contrastAt(candidate) >= target) passing = candidate;
      else failing = candidate;
    }
    return passing;
  };

  const resolvedL = searchOnSide(targetRatio)
    ?? (clampedTolerance > 0 ? searchOnSide(targetRatio - clampedTolerance) : null)
    ?? (preferLight ? 100 : 0);
  return colorAt(resolvedL);
}

export function resolveContrastAwareTextColor(
  backgroundColor: string,
  minContrastRatio: number,
  offset: number = 0,
  options?: { stable?: boolean; toleranceRatio?: number; targetOpacity?: number },
): string {
  if (options?.stable) {
    return resolveStableContrastAwareTextColor(
      backgroundColor,
      minContrastRatio,
      options.toleranceRatio,
      options.targetOpacity,
    );
  }
  const surface = colord(backgroundColor);
  const { h, s, l } = surface.toHsl();
  const clampedOffset = Math.min(1, Math.max(-1, Number.isFinite(offset) ? offset : 0));
  const preferredL = Math.min(100, Math.max(0, l + clampedOffset * 100));
  const targetRatio = Number.isFinite(minContrastRatio)
    ? Math.min(21, Math.max(1, minContrastRatio))
    : 1;
  const colorAt = (lightness: number) => colord({ h, s, l: lightness }).toHex();
  // Measure the quantized hex this function actually returns. Otherwise a
  // boundary can pass in memory, then slip below the target after CSS gets
  // the rounded 8-bit color.
  const contrastAt = (lightness: number) => colord(colorAt(lightness)).contrast(backgroundColor);

  if (contrastAt(preferredL) >= targetRatio) return colorAt(preferredL);

  const passingCandidates: number[] = [];
  if (contrastAt(0) >= targetRatio) {
    let passing = 0;
    let failing = l;
    for (let index = 0; index < 20; index += 1) {
      const candidate = (passing + failing) / 2;
      if (contrastAt(candidate) >= targetRatio) passing = candidate;
      else failing = candidate;
    }
    passingCandidates.push(passing);
  }
  if (contrastAt(100) >= targetRatio) {
    let failing = l;
    let passing = 100;
    for (let index = 0; index < 20; index += 1) {
      const candidate = (failing + passing) / 2;
      if (contrastAt(candidate) >= targetRatio) passing = candidate;
      else failing = candidate;
    }
    passingCandidates.push(passing);
  }

  if (passingCandidates.length > 0) {
    const resolvedL = passingCandidates.sort((a, b) => {
      const preferredDistance = Math.abs(a - preferredL) - Math.abs(b - preferredL);
      if (preferredDistance !== 0) return preferredDistance;
      return Math.abs(a - l) - Math.abs(b - l);
    })[0];
    return colorAt(resolvedL);
  }

  // The requested ratio is physically impossible for this background.
  // Return its maximum-contrast endpoint; at L=0/100 hue and saturation
  // collapse naturally, eliminating a misleading residual tint.
  return colorAt(contrastAt(100) > contrastAt(0) ? 100 : 0);
}
