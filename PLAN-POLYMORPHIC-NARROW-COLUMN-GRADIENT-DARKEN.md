# Polymorphic Narrow-Column Gradient Variant Plan

## Status

Implemented on 2026-09-16. `/abstract` opts in at neutral values
(`saturation: 1`, `darkness: 0`), so its checked-in appearance remains the
single continuous page gradient until an operator changes either desktop panel
control.

The earlier black-overlay proposal was rejected. The implementation renders a
real gradient generated from the page gradient's own source data.

## Implementation Outcome

- `PolymorphicLayoutConfig` owns the three desktop fields, compatibility
  defaults, and normalization clamps.
- Every complete page/panel default carries inert values; only `/abstract`
  enables the variant.
- `PolymorphicScrollGradientBackground` generates the harmonic source stops
  once, derives non-neutral narrow colors in OKLab, and feeds both stop arrays
  through the same active compositor.
- Neutral values return the original stop-array reference and mount no
  redundant variant layer, guaranteeing exact visual identity.
- The optional derived layer is fixed to the viewport and clipped with
  `PolymorphicLayout`'s existing measured narrow-column boundary.
- Scroll darkening and dithering remain single shared layers.
- Focused tests cover neutral identity and real stop-color transformation.

## Objective

Refine the `/abstract` desktop composition with an opt-in narrow-column gradient
variant.

When enabled, the narrow column uses the same source palette, stop positions,
seed, compositor, focal geometry, extent, interpolation, dithering, viewport
coordinates, and scroll-darkening behavior as the page background. The only
narrow-column-specific adjustments are saturation and darkness.

At neutral settings, the narrow-column gradient must be visually and
mathematically identical to the portion of the page gradient behind it. The two
columns must therefore read as one continuous gradient with no seam, restart,
scaling difference, or color shift.

## Configuration Contract

Add three desktop fields:

```ts
scrollGradientNarrowColumnVariantEnabledLg: boolean
scrollGradientNarrowColumnSaturationLg: number // 0-2; neutral = 1
scrollGradientNarrowColumnDarknessLg: number   // 0-1; neutral = 0
```

Defaults:

```ts
scrollGradientNarrowColumnVariantEnabledLg: false,
scrollGradientNarrowColumnSaturationLg: 1,
scrollGradientNarrowColumnDarknessLg: 0,
```

The shared default and every non-Abstract page keep the opt-in `false`.
`ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG` enables it for desktop with neutral
saturation and darkness values, preserving the continuous baseline until visual
tuning.

This first version is intentionally desktop-only. Mobile and tablet fields are
not added until a real design requirement exists for those tiers.

## Meaning of “Same Gradient”

The implementation must not generate an independent random gradient and must
not position a narrow-column-sized gradient inside the narrow column.

Instead:

1. Generate the page's harmonic gradient stops once.
2. Use those unchanged stops for the normal full-viewport background.
3. Derive a second stop array by applying only the configured saturation and
   darkness transforms.
4. Render the derived gradient as another full-viewport, fixed-position layer
   using exactly the same gradient builder and geometry inputs.
5. Clip that full-viewport layer to the physical bounds of the narrow column.

Because both layers use viewport coordinates, the narrow column displays the
same spatial segment it would have displayed through the page background. It
does not restart the gradient at the column edge and does not stretch the whole
gradient into the column's smaller width.

“Mirror” therefore means a coordinate-aligned duplicate, not a horizontal flip.

## Neutral-Value Identity Contract

Neutral values are a strict compatibility requirement, not an approximate
visual target:

```text
saturation = 1
darkness = 0
derived stops = original stops
derived gradient CSS = page gradient CSS
```

The color-transform helper must return the original color unchanged when both
values are neutral. Prefer returning the original stop array or bypassing the
transform entirely in this case; parsing and serializing an unchanged color can
still alter its CSS representation or introduce rounding differences.

With neutral values, enabling the feature must produce no visible seam at the
column boundary and no color change anywhere in the narrow column.

## Color Transformation

Transform the generated stop colors before constructing the CSS gradient. Do
not use a black overlay, `filter`, `backdrop-filter`, blend mode, or opacity
tint.

For each non-neutral stop:

1. Convert its color to OKLab.
2. Treat OKLab `a` and `b` as the chroma vector.
3. Apply saturation as a chroma multiplier:

   ```text
   a' = a * saturation
   b' = b * saturation
   ```

4. Apply darkness to perceptual lightness:

   ```text
   L' = L * (1 - darkness)
   ```

5. Convert back to sRGB with deterministic gamut clamping.

This produces a genuine gradient whose individual colors change while its stop
positions and geometry remain intact. Saturation `0` is grayscale, `1` is the
source saturation, and values above `1` increase chroma. Darkness `0` preserves
source lightness; values toward `1` progressively darken all stops.

The order is conceptually one OKLab transform, not two CSS effects, so panel
changes are deterministic and testable.

## Rendering Architecture

The background component should own one shared composition and one optional
narrow variant:

```text
page content
shared dither layer
shared scroll-driven darkening layer
narrow derived-gradient layer, fixed and clipped (opt-in)
original full-viewport gradient
fallback surface
```

The derived layer must:

- receive the exact same legacy or enhanced compositor inputs;
- reuse the exact same generated source stops;
- use the same `lightHiddenPercent` translation and full-viewport dimensions;
- use the existing live split boundary used by `gradientClipStyle('narrow')`;
- respect `wideColumnSide`, so semantic “narrow column” works on either side;
- remain `fixed`, `aria-hidden`, and `pointer-events-none`;
- never create its own scroll listener, animation loop, darkening overlay, or
  dither texture.

The existing shared scroll-darkening layer remains above both gradient layers.
Consequently, both columns follow one scroll curve and one smoothing state. The
narrow variant changes only its base colors.

The shared dither layer also remains single and aligned across the viewport. It
must not restart at the seam.

## Activation Rules

The narrow variant is active only when all of the following are true:

```ts
breakpointTier === 'lg'
  && scrollGradientEnabledLg
  && scrollGradientNarrowColumnEnabledLg
  && scrollGradientNarrowColumnVariantEnabledLg
  && layout is split
  && split boundary is available
```

If any condition is false, retain the existing rendering path. In particular:

- Disabling the narrow-column gradient disables its variant.
- A stacked layout must not apply the narrow variant to the whole viewport.
- Turning the variant off restores the unmodified shared page gradient.
- Neutral values may use the existing shared gradient without mounting a
  redundant derived layer, provided the result remains identical.

## Configuration Work

The page-owned values live in
`experiences/abstract/components/PolymorphicLayout.pageConfigs.ts`, but the
shared contract requires coordinated implementation support:

1. Add the three fields to `PolymorphicLayoutConfig`.
2. Add inert defaults and normalization in `PolymorphicLayout.config.ts`:
   boolean via `=== true`, saturation clamped to `0-2`, darkness to `0-1`.
3. Add explicit values to every complete page-config object so `/about` and
   posts-lab panel scopes continue to validate.
4. Resolve the active desktop values once in `usePolymorphicLayoutColors`.
5. Pass the resolved narrow-variant configuration and clip geometry into
   `PolymorphicScrollGradientBackground`.
6. Add a pure stop-color transformation helper that both legacy and enhanced
   gradient builders can consume.
7. Opt in only in `ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG` after the neutral-state
   identity tests pass.

## Panel Information Architecture

Place these fields directly after “Narrow column gradient (≥ desktop)” in the
existing “Scroll gradient (≥ desktop)” group:

1. `Customize narrow gradient` — boolean.
2. `Narrow gradient saturation` — number, `0-2`, step `0.01`.
3. `Narrow gradient darkness` — number, `0-1`, step `0.01`.

Visibility:

```ts
// Opt-in
config.scrollGradientEnabledLg
  && config.scrollGradientNarrowColumnEnabledLg

// Saturation and darkness
config.scrollGradientEnabledLg
  && config.scrollGradientNarrowColumnEnabledLg
  && config.scrollGradientNarrowColumnVariantEnabledLg
```

The labels describe the visual result and avoid implementation language. A
short description under the opt-in should state: “Uses the same desktop page
gradient and changes only the narrow column's saturation and darkness.”

No enum/select field is introduced, so the project's fixed-option ceiling does
not apply.

## Implemented Sequence

1. Added the typed fields, inert defaults, and clamps.
2. Added inert values to all non-Abstract page configs and enabled `/abstract`
   at neutral values.
3. Reused one source-stop array for the base and narrow variant.
4. Implemented and unit-tested the pure OKLab stop transformation.
5. Extended the background renderer with one coordinate-aligned, clipped
   derived-gradient layer and no second animation system.
6. Added desktop panel controls and visibility conditions.
7. Verified neutral identity in both compositor builders and compiled the
   `/abstract`, `/about`, and `/contact` routes successfully.
8. Saturation and darkness remain neutral for operator-led visual tuning.

## Behavioral Requirements

- Opt-in off: markup behavior and appearance remain unchanged.
- Opt-in on with saturation `1` and darkness `0`: appearance is identical to
  the existing page gradient, including at the column seam.
- Non-neutral values modify real gradient stop colors in the narrow column;
  they do not place a translucent color over the source.
- Palette, seed, stop count, stop positions, compositor, geometry, extent,
  interpolation, smoothness, dithering, and scrolling remain shared.
- The derived gradient never restarts or rescales inside the narrow column.
- Wide-column and page-background colors remain unmodified.
- Breakpoint and panel changes do not reset the existing scroll-darkening
  smoothing state.
- Header bands and gutters retain their existing behavior.
- The existing desktop ink configuration remains authoritative; visual review
  must confirm sufficient contrast at the chosen non-neutral values.

Once saturation or darkness diverges from neutral, a deliberate tonal boundary
may become visible at the column seam. That boundary is the requested art
direction, not gradient misalignment: shapes and stop transitions must still
line up exactly on both sides.

## Verification

### Automated

- Normalization clamps saturation below `0` to `0` and above `2` to `2`.
- Normalization clamps darkness below `0` to `0` and above `1` to `1`.
- Neutral transformation returns the original stop values unchanged.
- Both legacy and enhanced builders produce the exact base gradient string when
  the narrow controls are neutral.
- Saturation changes stop chroma without changing stop count or positions.
- Darkness changes stop lightness without changing stop count or positions.
- Source stops, geometry, dither, and scroll state are not regenerated
  independently for the narrow layer.
- Narrow-left and narrow-right configurations produce the correct clipping.
- Every registered panel scope validates against its complete default value.

### Visual

- At `>=1024px`, enable the variant with saturation `1` and darkness `0`; use
  screenshots and a seam pixel comparison to confirm one continuous gradient.
- Toggle the opt-in at neutral values; no visual change should be detectable.
- Sweep saturation through `0`, `1`, and `2`; confirm the narrow side remains a
  detailed gradient rather than becoming a flat tint.
- Sweep darkness through `0`, a subtle value, and a strong value; confirm every
  gradient region changes proportionally and retains its internal transitions.
- Scroll from rest to maximum darkening; confirm both columns share the same
  motion curve and never drift or flash.
- Resize across `1024px`; confirm the variant disappears below desktop without
  stale clipping.
- Test both physical column orientations and the current `38/62` desktop split.

## Non-Goals

- A separate narrow-column hue, seed, stop count, focal point, geometry, or
  compositor.
- A black overlay, CSS filter, backdrop filter, blend mode, or flat color tint.
- Independent narrow-column scroll timing or maximum scroll darkening.
- Mobile and tablet variants.
- Seam feathering that would blur or distort the shared gradient geometry.
- Changes to header-band colors or the existing ink-color model.

These boundaries keep the model understandable: one page gradient, one
coordinate-aligned narrow copy, and exactly two color adjustments.
