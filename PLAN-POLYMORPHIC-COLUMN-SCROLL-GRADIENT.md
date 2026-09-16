# Polymorphic Column Scroll Gradient Plan

## Status

- Implemented for `/abstract` on 2026-09-15
- Base, Wide, and Lg breakpoint tiers explicitly opt in
- The shared renderer supports independent narrow-column and wide-column opt-ins while reusing the exact same resolved recipe
- `/about` and other page configurations retain their existing breakpoint policies

## Objective

Give each polymorphic-layout page an explicit, breakpoint-segregated opt-in for the scroll-gradient background. Narrow and wide columns can now opt in independently at each tier; every enabled column uses the exact resolved recipe and scroll-darkening behavior already used by the mobile implementation.

## Existing Mechanism

`PolymorphicLayout` resolves the legacy tier flags plus independent narrow/wide column flags through the live breakpoint tier. An enabled column paint becomes transparent and the fixed `PolymorphicScrollGradientBackground` is clipped to that column on split layouts. When both columns are enabled, one unclipped instance is shared. The active tier selects one exact palette, ink color, viewport range, darken ceiling, and legibility recipe for either column.

This plan is intentionally independent of the Decap/CMS editorial plan. The gradient is presentation configuration owned by TypeScript, not editorial content.

## Configuration Contract

For each page config:

```ts
scrollGradientNarrowColumnEnabled: boolean       // base/mobile tier
scrollGradientNarrowColumnEnabledWide: boolean  // md/tablet tier
scrollGradientNarrowColumnEnabledLg: boolean    // lg/desktop tier
scrollGradientWideColumnEnabled: boolean         // base/mobile tier
scrollGradientWideColumnEnabledWide: boolean    // md/tablet tier
scrollGradientWideColumnEnabledLg: boolean      // lg/desktop tier
```

The six column flags are independent. The existing `scrollGradientEnabled(-Wide/-Lg)` flags remain a backwards-compatible master gate for existing page configs. A page may enable only its wide column on desktop while keeping its narrow column flat, or use the same recipe on both.

The `/abstract` policy is now:

```ts
scrollGradientEnabled: true
scrollGradientEnabledWide: true
scrollGradientEnabledLg: true
```

The desktop gradient-generation recipe is identical to mobile: hue, hue scheme, lightness, chroma, mode, stops, variance, center stretch, and seed. The ink color remains a separate contrast/physical-column basis; it is intentionally allowed to differ so header segments do not become a flat generated-stop color.

## Behavioral Requirements

- Narrow and wide columns may switch independently at the active breakpoint tier.
- A disabled tier must restore the page config's normal column paint colors.
- Breakpoint transitions must not reset the scroll-darken smoothing state or flash the background.
- Text and header contrast consumers must continue reading the active tier's ink/physical colors.
- Header bands, gutters, and the main shell must not become opaque layers that hide the gradient.
- The gradient must remain fixed to the viewport while the columns scroll.
- Page-specific policies must remain independent; enabling `/abstract` desktop must not change `/about` or posts-lab.

## Verification

- Inspect `/abstract` at mobile, tablet, and desktop widths.
- Confirm both columns share one continuous gradient at each enabled tier.
- Confirm the desktop Wide/Lg recipe changes only at its breakpoint boundary.
- Scroll through the full page and verify smooth darkening with no reset at breakpoint changes.
- Toggle the three flags in the `/abstract` authoring panel and confirm each tier independently restores flat colors when disabled.
- Run the existing polymorphic layout and color-resolution tests.

## Future Extension

If a future design needs genuinely different gradient recipes per column, that is a separate architectural change: the current implementation intentionally shares one resolved recipe and scroll-darkening schedule, while clipping it to an independently enabled column. It should not be introduced without first defining contrast ownership and transition behavior.
