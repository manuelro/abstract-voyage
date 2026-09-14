# Abstract Footer Plan

## Objective

Add a centralized, configurable footer to `pages/abstract.tsx` after the existing page content.

## Structure

- Section 1: page links for the currently available routes, each with configurable title and strategic description.
- Section 2: configurable empty space, then a centered configurable contact line.
- Section 3: configurable empty space, then a footer-specific wordmark.

## Responsive Behavior

- Narrow/mobile viewports stack page entries vertically.
- Wider viewports distribute entries across the available width using a responsive grid and configurable gap.
- Page item title and description padding/gap are configurable.

## Config Surface

- Footer visibility.
- Section padding and max width.
- Page item title/description copy.
- Page item gap, padding, and title/description spacing.
- Contact line text and spacing.
- Wordmark size and footer-specific color treatment.
- Opt-in scroll-gradient return-to-light behavior.

## Implementation Notes

- Reuse the project config-panel system and obey the `enum` versus `select` option-count rule from `AGENTS.md`.
- Keep footer defaults page-owned for `/abstract`, matching the existing per-page config ownership pattern.
- Keep the footer wordmark independent from the header wordmark.
- Extend the existing scroll-gradient background with an optional return-to-light phase keyed to the footer anchor.

## File Ownership

- `pages/abstract.config.ts`
  - Owns `AbstractFooterConfig`, defaults, and normalization.
  - Reuses the header's effective `WordmarkConfig` and resolved stops; footer-only presentation is limited to spacing and opacity.
- `pages/abstract.panel.ts`
  - Owns the page-level footer panel and footer wordmark panel.
  - Uses grouped fields for clarity and keeps short option lists as `enum`; any future long fixed lists must use `select`.
- `experiences/abstract/configPanels.ts`
  - Registers the footer scopes in the abstract authoring registry.
- `experiences/abstract/components/SiteFooter/SiteFooter.tsx`
  - Renders the footer sections and consumes normalized config only.
  - Keeps page entry rendering in one reusable accordion-like item shape.
- `experiences/abstract/components/PolymorphicScrollGradientBackground.tsx`
  - Owns the scroll-gradient return-to-light behavior through optional props.
- `experiences/abstract/components/PolymorphicLayout.tsx` and `pages/abstract.tsx`
  - Thread the normalized footer config into background behavior and render `<SiteFooter />` after all existing content.

## Implementation Checkpoints

1. Confirm the previous partial implementation and preserve existing dirty work.
2. Persist this plan before additional edits.
3. Normalize all footer and footer-wordmark values before rendering and before binding to the panel.
4. Render the footer immediately after existing page content, not inside the coverflow/content sections.
5. Ensure mobile stacks page entries and wider screens distribute entries across available width with configurable gap/padding.
6. Ensure the centered contact line and wordmark have independent configurable vertical spacing.
7. Ensure the background return-to-light behavior is opt-in and inert when disabled.
8. Run type/lint/test checks that are available and targeted enough to avoid excessive memory use.

## Memory / Responsiveness Guardrails

- Prefer targeted `rg`/`sed` reads over dumping large files.
- Use existing component/config patterns instead of broad refactors.
- Keep commands scoped; avoid starting heavy dev/build processes until the code is reconciled.
- Verify with TypeScript or targeted tests first, then only broaden if failures point to shared behavior.
