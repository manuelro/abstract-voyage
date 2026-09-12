import { colord, extend } from 'colord';
import a11yPlugin from 'colord/plugins/a11y';
import { generateHarmonicGradient } from '../../../helpers/harmonicGradient';
import type { SvgStop } from '../../../helpers/gradientMath';
import type {
  PolymorphicLayoutScrollGradientHueScheme,
  PolymorphicLayoutScrollGradientMode,
  PolymorphicLayoutWordmarkGradientClarity,
} from './PolymorphicLayout.config';

extend([a11yPlugin]);

/** Full parity with the scroll-gradient background's own 9 exposed knobs
 * (see PolymorphicLayoutConfig's own wordmarkGradient* doc comment) — a
 * fully independent recipe, not coupled to the background's own resolved
 * values at runtime. lightnessMin/lightnessMax/hueSpread/zoom have no
 * scrollGradient* equivalent at all — wordmark-only extras layered on top.
 * lightnessMin/-Max are authored as a single range; clarity below decides
 * whether they're applied as-authored or mirrored. */
export type WordmarkGradientRecipe = {
  baseHue: number;
  hueScheme: PolymorphicLayoutScrollGradientHueScheme;
  hueSpread: number;
  lightnessMin: number;
  lightnessMax: number;
  chromaMin: number;
  mode: PolymorphicLayoutScrollGradientMode;
  stops: number;
  variance: number;
  centerStretch: number;
  zoom: number;
  seed: number;
  darken: number;
};

/**
 * Derives the wordmark's own SvgStop[] from its fully independent
 * wordmarkGradient* recipe (whichever tier is currently active) — reusing
 * `generateHarmonicGradient` (`helpers/harmonicGradient.ts`), the exact
 * function `Logo.tsx`'s own `DEFAULT_STOPS` already calls.
 *
 * `clarity: 'auto'` reads the light/dark direction from `inkColor`'s own
 * lightness — the same color the scroll-gradient feature already uses to
 * decide whether a light or dark ink reads against that tier's background
 * (the one remaining coupling to the background — everything else about
 * the recipe is the wordmark's own). 'light' applies
 * `recipe.lightnessMin/-Max` exactly as authored; 'dark' mirrors them
 * around 50 (`100-max`/`100-min`), turning a light-leaning authored range
 * into an equally-legible dark-leaning one without a second set of fields
 * to maintain.
 *
 * `recipe.darken` (0-1) is applied last, after generateHarmonicGradient has
 * already picked each stop's hue/saturation/lightness — a flat
 * `l * (1 - darken)` multiplier on the resolved color, not a second
 * lightness range to reason about alongside lightnessMin/-Max/clarity
 * above. This is the wordmark's own analog to scrollGradientMaxDarken,
 * which can't be reused directly: that field composites a black overlay
 * `<div>` on top of the CSS background layer, and the wordmark has no
 * such stacked layer — its stops feed an SVG `<linearGradient>`'s
 * stop-colors directly (see resolveSiteHeaderLogoStops, SiteHeader.tsx).
 *
 * See PLAN-WORDMARK-SCROLL-GRADIENT-INTEGRATION.md.
 */
export function deriveWordmarkScrollGradientStops(
  recipe: WordmarkGradientRecipe,
  inkColor: string,
  clarity: PolymorphicLayoutWordmarkGradientClarity,
): SvgStop[] {
  const useLight = clarity === 'auto' ? colord(inkColor).isLight() : clarity === 'light';
  const lightnessRange = useLight
    ? { min: recipe.lightnessMin, max: recipe.lightnessMax }
    : { min: 100 - recipe.lightnessMax, max: 100 - recipe.lightnessMin };

  const stops = generateHarmonicGradient({
    baseHue: recipe.baseHue,
    hueScheme: recipe.hueScheme,
    hueSpread: recipe.hueSpread,
    lightnessRange,
    chromaRange: { min: recipe.chromaMin },
    mode: recipe.mode,
    stops: recipe.stops,
    variance: recipe.variance,
    centerStretch: recipe.centerStretch,
    zoom: recipe.zoom,
    seed: recipe.seed,
  });

  // generateHarmonicGradient's own `at` is 0-1 (helpers/harmonicGradient.ts's
  // own GradientStop doc comment); SvgStop's own `at` is 0-100 — same
  // conversion Logo.tsx's own DEFAULT_STOPS already applies.
  return stops.map(stop => ({
    color: recipe.darken > 0 ? darkenHex(stop.color, recipe.darken) : stop.color,
    at: stop.at * 100,
  }));
}

function darkenHex(hex: string, darken: number): string {
  const { h, s, l, a } = colord(hex).toHsl();
  return colord({ h, s, l: l * (1 - darken), a }).toHex();
}
