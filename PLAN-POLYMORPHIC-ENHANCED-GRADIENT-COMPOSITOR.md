# Polymorphic Enhanced Gradient Compositor Plan

## Status

Implemented on 2026-09-15. All registered page configurations remain on the
legacy compositor by default; enhanced mode is available as an explicit,
breakpoint-specific operator opt-in.

## Scope

- `experiences/abstract/components/PolymorphicLayout.pageConfigs.ts`
- `experiences/abstract/components/PolymorphicLayout.config.ts`
- `experiences/abstract/components/PolymorphicLayout.panel.ts`
- `experiences/abstract/components/PolymorphicLayout.tsx`
- `experiences/abstract/components/PolymorphicScrollGradientBackground.tsx`
- Focus: preserve the current gradient exactly while adding an opt-in,
  breakpoint-aware enhanced compositor for desktop and future use.

## Objective

Add controls for gradient dithering, top-edge light placement, visible light
amount, shape, falloff, and high-density color mixing without changing the
current gradient for any existing configuration.

The enhanced compositor's defining quality requirement is a visually
continuous gradient: no perceptible hard stop boundaries, contour lines, or
large-area color banding at normal viewing distance. Dithering is one part of
that requirement, not the whole implementation strategy.

The enhanced compositor must support a light focused at left-top, center-top,
or right-top. It must also support a configured percentage of the light being
clipped above the gradient container, initially targeting 50% hidden.

## Why Two Compositors

The current renderer is a visual compatibility contract. It uses:

- `radial-gradient(circle at 0% 0%, ...)`
- `generateHarmonicGradient()` directly
- legacy stop placement using `stop.at * 1000%`
- a fixed fallback background
- a separate scroll-driven black overlay

The proposed features require different geometry and sampling. A movable
focal point, measurable clipping, perceptual interpolation, dense resampling,
and dithering cannot be added to the legacy formula without risking subtle
changes to its output.

Segregation applies only to base-gradient composition. Both modes continue to
share breakpoint resolution, column reveal/clipping, scroll progress,
darkening animation, contrast safeguards, and return-to-light behavior.

## Compatibility Contract

Add a tiered compositor selector:

- `scrollGradientCompositor: 'legacy' | 'enhanced'`
- `scrollGradientCompositorWide`
- `scrollGradientCompositorLg`

All defaults must be `legacy`.

Legacy mode must preserve:

- the exact harmonic-gradient inputs
- the exact `circle at 0% 0%` declaration
- the exact `stop.at * 1000%` calculation
- the existing fallback background color
- the existing layer order and scroll-darkening overlay
- existing column clipping and transparency behavior
- no dither layer
- no interpretation of enhanced-only fields

Adding the new default fields must cause no rendered or behavioral change.

## Enhanced Composition Pipeline

```text
harmonic palette anchors
  -> perceptual interpolation
  -> dense visible stop sequence
  -> configurable radial light geometry
  -> existing scroll-darkening overlay
  -> stationary blue-noise dithering
```

`scrollGradientStops` remains an artistic palette control. Increasing render
quality must not ask the seeded palette generator for more random stops and
thereby change the composition. Instead, the enhanced compositor resamples
between the generated anchor colors.

## Smoothness Contract

Enhanced mode must treat harmonic stops as palette anchors, never as directly
visible CSS boundaries. The output pipeline must combine four safeguards:

1. Interpolate between every adjacent anchor in OKLab by default so perceived
   lightness and color change progressively rather than stepping through sRGB.
2. Generate enough intermediate samples that adjacent rendered colors remain
   below a configured perceptual-difference threshold.
3. Use continuous falloff shaping with no duplicated stop positions or abrupt
   opacity transitions.
4. Apply low-amplitude, stationary blue noise to break up residual 8-bit
   display quantization without introducing visible grain.

The implementation should use adaptive subdivision rather than relying only
on a fixed sample count. Begin with `scrollGradientMixSamples` as a minimum
quality budget, then subdivide any adjacent pair whose OKLab delta exceeds
the internal smoothness threshold, up to a bounded maximum. This concentrates
samples where hue or lightness changes fastest without bloating already-smooth
regions.

No implementation can guarantee identical banding behavior on every physical
display, browser compositor, screenshot encoder, or color profile. The product
contract is therefore "no perceptible hard stops or contour lines across the
supported reference environments," backed by visual and pixel-analysis tests.

## Configuration Model

Every new visual control receives base, `Wide`, and `Lg` variants. This allows
desktop to opt into the enhanced compositor while mobile and tablet remain on
the exact legacy renderer.

### Compositor

- `scrollGradientCompositor`
- `scrollGradientCompositorWide`
- `scrollGradientCompositorLg`

Allowed values: `legacy`, `enhanced`.

### Light Position And Shape

- `scrollGradientFocalHorizontal`: `left | center | right`
- `scrollGradientLightHiddenPercent`: `0-100`
- `scrollGradientLightRadiusPercent`
- `scrollGradientLightAspectRatio`
- `scrollGradientLightFalloff`

Each field receives `Wide` and `Lg` siblings.

Horizontal positions map to 0%, 50%, and 100%. Hidden percentage must be
implemented through an oversized, translated gradient layer so that 50%
hidden has a stable geometric meaning. It must not be an arbitrary negative
CSS focal coordinate whose visible result changes unpredictably with radius.

### Mix Quality

- `scrollGradientMixSamples`: 16-128
- `scrollGradientInterpolation`: `srgb | oklab`
- `scrollGradientExtentPercent`
- `scrollGradientSmoothness`: controls the maximum tolerated perceptual delta
  between neighboring samples before adaptive subdivision

Each field receives `Wide` and `Lg` siblings. The compositor generates the
existing harmonic anchor colors, then resamples them into the configured
number of visible stops. OKLab is the enhanced default because it produces
more perceptually even transitions than direct sRGB interpolation. The final
sample sequence must be strictly ordered, deduplicated, and clamped so no two
differently colored stops occupy the same position.

### Dithering

- `scrollGradientDitherEnabled`
- `scrollGradientDitherAmount`
- `scrollGradientDitherScale`
- `scrollGradientDitherSeed`

Each field receives `Wide` and `Lg` siblings. Use a deterministic,
monochromatic blue-noise texture above the base gradient and below the black
darkening overlay. The noise must remain fixed during scrolling to avoid
shimmer and unnecessary repainting.

## Defaults

Compatibility defaults:

```ts
scrollGradientCompositor: 'legacy',
scrollGradientCompositorWide: 'legacy',
scrollGradientCompositorLg: 'legacy',
```

Enhanced-only values are normalized but inert in legacy mode:

```ts
scrollGradientFocalHorizontal: 'left',
scrollGradientLightHiddenPercent: 50,
scrollGradientLightRadiusPercent: 100,
scrollGradientLightAspectRatio: 1,
scrollGradientLightFalloff: 1,
scrollGradientMixSamples: 64,
scrollGradientInterpolation: 'oklab',
scrollGradientExtentPercent: 100,
scrollGradientSmoothness: 1,
scrollGradientDitherEnabled: true,
scrollGradientDitherAmount: 0.025,
scrollGradientDitherScale: 1,
scrollGradientDitherSeed: 50,
```

The base, `Wide`, and `Lg` defaults should initially match. `/abstract` may
opt into `enhanced` for `Lg` only after visual verification. The checked-in
page default must continue to use `legacy` until that verification is complete.

## Rendering Architecture

Keep the compatibility boundary explicit:

- `buildLegacyGradient()` retains the existing calculation verbatim.
- `buildEnhancedGradient()` owns dense interpolation and focal geometry.
- The existing persistent scroll-darkening effect remains shared.
- The dither layer mounts only in enhanced mode.
- `PolymorphicLayout` continues to own per-column reveal and clipping.

The enhanced layer order is:

```text
dither layer
scroll-darkening overlay
dense focal gradient
fallback background
```

The dither layer sits above the darkening overlay so its small quantization-
breaking signal remains effective throughout the full scroll range. It must be
zero-mean and sufficiently low-amplitude that it does not visibly change the
palette, average luminance, or contrast behavior.

The dither layer must be subtle, non-interactive, ignored by assistive
technology, and clipped by the same column geometry as the gradient.

## Panel Information Architecture

Within each Mobile, Tablet, and Desktop Scroll Gradient group, order fields as:

1. Enablement and column reveal
2. Compositor
3. Light position
4. Light shape
5. Palette
6. Mix quality
7. Dithering
8. Scroll darkening
9. Accessibility

Enhanced-only controls use `visibleWhen` and appear only when that tier's
compositor is `enhanced`. Existing legacy controls retain their current labels
and behavior. Fixed option sets remain segmented controls only while their
option count stays within the project's 6-8 option ceiling.

## Implementation Phases

### Phase 1: Compatibility Baseline

- Extract the current CSS-string construction into `buildLegacyGradient()`
  without modifying the formula.
- Add a focused test that asserts the exact legacy gradient string.
- Capture mobile, tablet, and desktop reference screenshots.

### Phase 2: Config And Panel

- Add types, defaults, normalization, and base/Wide/Lg fields.
- Add conditional panel groups for enhanced controls.
- Verify every panel field exists in every registered default config scope.
- Keep all compositor defaults on `legacy`.

### Phase 3: Enhanced Geometry

- Implement left, center, and right top focal placement.
- Implement explicit top clipping through layer sizing and translation.
- Add radius, aspect-ratio, falloff, and extent controls.
- Confirm 50% hidden remains consistent across supported viewport ratios.

### Phase 4: Dense Mixing

- Resample harmonic anchors independently of artistic stop count.
- Add sRGB and OKLab interpolation.
- Add bounded adaptive subdivision based on neighboring OKLab color distance.
- Enforce strictly increasing stop positions and remove duplicate boundaries.
- Shape radial falloff continuously; do not introduce transparent-to-opaque
  jumps or repeated color stops as a shortcut for positioning the light.
- Bound sample count to protect CSS size and paint cost.
- Confirm that changing mix samples improves smoothness without changing the
  anchor palette or seeded composition.

### Phase 5: Dithering

- Add deterministic blue-noise generation or a checked-in reusable tile.
- Apply amount and scale controls.
- Keep noise stationary during scrolling.
- Validate that the texture reduces banding without reading as visible grain.
- Verify dithering after the darkening overlay at multiple scroll positions;
  darkening must not collapse nearby tones back into visible contour bands.
- Prefer a zero-mean noise texture so dithering does not shift the gradient's
  average luminance, palette, or text-contrast calculations.

### Phase 6: Desktop Opt-In

- Keep base and `Wide` on `legacy`.
- Temporarily opt `Lg` into `enhanced` for evaluation.
- Tune the enhanced desktop settings through the config panel.
- Commit the desktop opt-in only after comparison against the approved legacy
  reference and explicit visual acceptance.

## Verification Gates

1. Legacy mode produces the exact pre-change CSS gradient string.
2. New defaults cause no screenshot difference in legacy mode.
3. Mobile, tablet, and desktop can select compositor modes independently.
4. Left-top, center-top, and right-top focal positions render correctly.
5. A 50% hidden setting remains geometrically consistent across viewports.
6. Narrow and wide column clipping remains independent in both modes.
7. Dense interpolation improves visible transitions without palette drift.
8. Dithering does not shimmer during scrolling or resizing.
9. Darkening, force-max-darken, contrast floors, and return-to-light retain
   their existing behavior.
10. Reduced-motion and assistive-technology behavior remain unaffected.
11. Desktop GPU, paint, and CSS-size costs stay within an acceptable budget.
12. Type checking, config-scope validation, focused unit tests, and Playwright
   screenshot checks pass before enabling enhanced mode by default anywhere.
13. Automated image analysis samples representative horizontal, vertical, and
   radial paths and rejects repeated plateaus or luminance jumps above the
   agreed tolerance.
14. Screenshot review covers the gradient at rest, intermediate darkening,
   maximum darkening, and return-to-light states at 1x and 2x pixel density.
15. Review on at least one wide-gamut display does not reveal hard contours
   hidden by the standard screenshot environment.

## Acceptance Criteria

- Existing pages render their current gradient without visual changes.
- The operator can opt into the enhanced compositor independently at each
  breakpoint.
- Enhanced mode supports left-top, center-top, and right-top light placement.
- The operator can configure 50% of the light to sit above the visible area.
- Dense interpolation and dithering provide a smooth progressive gradient and
  progressive scroll darkening with no perceptible hard stops, hard lines, or
  contour banding in the supported reference environments.
- Legacy and enhanced controls are clearly separated in the panel.
- The enhanced desktop configuration is not made the default until visually
  approved.
