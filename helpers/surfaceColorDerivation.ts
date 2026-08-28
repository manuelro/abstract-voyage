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
export function resolveContrastAwareTextColor(
  backgroundColor: string,
  minContrastRatio: number,
  offset: number = 0,
): string {
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
