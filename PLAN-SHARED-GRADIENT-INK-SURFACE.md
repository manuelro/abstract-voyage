# Plan — Shared gradient ink surface

## Assessment

**Feasible.** The card already renders a live `CardGradientMesh` beneath an
`ArticleCard` content layer. In ink mode, `ArticleCard.module.css` paints that
layer with a configurable surface color, gives it a blend mode, and paints its
text and borders with one foreground color. The wall's `Quote` independently
renders the same `CardGradientMesh` but owns a separate overlay, blend, and
foreground implementation. The duplicated part is the *composition*, not the
article's layout, navigation, content model, or card physics.

Extract the composition as a reusable presentational surface that accepts
semantic content (`ReactNode`) and optional decorative graphics as slots.
Keep `Card` as the article adapter and `Quote` as the editorial adapter. Do not
turn arbitrary content into an `ArticleCard` or insert it into the card's
whole-card link: that would bring article grid sizing, clipping, CTA behavior,
and possibly nested interactive content to quotes and future graphics.

This is a source-level assessment. No rendering or config behavior is changed
by this plan, so visual verification belongs to implementation.

## Current boundaries and constraints

| Concern | Current owner | Extraction decision |
| --- | --- | --- |
| Shader, palette, hologram, activity | `CardGradientMesh.tsx` | Reuse unchanged as the backdrop. It is currently an untracked workspace file; preserve the ongoing work. |
| Layering, surface, blend mode, ink color | `ArticleCard.tsx` / `.module.css`; independently `Quote.tsx` / `.module.css` | Move the common composition contract into one surface and CSS module. |
| Article metadata, title, CTA, whole-card link, container sizing | `ArticleCard` | Remain article-specific. |
| Quote typography, quotation marks, attribution, overflow policy | `Quote` | Remain quote-specific. |
| Source slide/palette selection | `wall.tsx`, `abstract.tsx`, `Quote` | Keep data selection outside the generic renderer; offer a small shared selector only if it removes the current duplicated one-based-index logic. |
| Card appearance controls | `Card/config/appearance.ts` and `.panel.ts` | Split reusable ink settings from card-only active/inactive controls without changing existing key names or saved values. |
| Shared config propagation | `Card/appearance` registration, `PageCapabilityRuntime`, panel payload `knownKeys` | Verify every registered page instance receives the runtime value and can save a newly introduced field. |

The compositing mode is a visual treatment, not a new page lifecycle feature;
it does not need an intro timestamp. Commit
`b7827315dad19a517df83edd9b7016db5daf8452` supplies a common page runtime
for lifecycle needs and passes schema `knownKeys` through config updates. Its
companion plan describes descriptors and registration invariants more broadly
than that commit actually implements. This extraction should use the existing
registration and payload path, then add targeted invariants where the current
path still relies on page wiring. Do not assume the full descriptor system
already exists.

## Proposed API and ownership

1. Introduce an opt-in `GradientInkSurface` in `components/`
   with `backdrop` (the existing `CardGradientMesh` or a supplied layer),
   `children` for semantic text/content, and an optional `decoration` layer.
   It owns only stacking, isolation, blend, surface opacity, foreground color,
   rounded clipping, and the disabled/plain state. The caller owns the root
   element, link, padding, dimensions, typography, and interaction handlers.
   Use explicit slots or a typed render prop if needed for layer ordering;
   avoid DOM cloning and global descendant selectors that overwrite authored
   graphic colors or nested controls.
2. Define one normalized ink-treatment type/default for enabled state,
   background color/opacity, foreground color, and `screen`/`multiply` mode.
   Keep card-only active border, breakpoint enable flags, and unified source
   card selection in `CardAppearanceConfig`; map its existing
   `invertedGradientInk*` keys into the shared type. Keep Quote's existing
   `gradientInk*` keys as its adapter mapping. Preserve persisted shapes and
   allow Quote's zero-overlay vivid-mesh presentation.
3. Migrate `ArticleCard` to render its existing article markup through the
   shared surface while preserving the exact outer link and grid behavior.
   Migrate `Quote` to use the same surface for the feature treatment. Remove
   duplicated blend CSS only after both consumers match in the browser.
4. Let any later consumer supply its own semantic content and graphics layer.
   It should gain the same compositing capability without importing article
   metadata, CoverFlow state, or page-specific config. Decorative graphics
   are `aria-hidden`; meaningful graphics retain their own accessible label.

## Shared component propagation and persistence

1. Inventory `Card` on `/wall` masonry and CoverFlow and on `/abstract`
   CoverFlow, plus other direct `AbstractJournalLabHueFadeCard` and
   `ArticleCard` render paths. Mark which paths use the appearance scope and
   which should stay visually unchanged.
2. Keep one canonical schema/default/normalizer for the shared treatment.
   Both page registrations should resolve the same `Card/appearance` fields;
   page-local defaults may override values without copying a new field to
   make it work. Quote's typography remains in its own scope; decide whether
   its treatment fields compose from the canonical ink schema or are mapped
   through a typed adapter, and test that mapping.
3. For a newly added treatment field, verify the panel exposes it on each
   registered page, changes the rendered consumer, and emits `knownKeys` in
   `UPDATE DIFF`. Verify insert/update/reload/reset against the correct page
   override target even when the key is absent from that page's object literal.
   Check the actual target file/symbol resolution before edits; the current
   card scope's default `copy` target points at the shared default file.
4. Add focused tests for field/schema alignment, normalization, page bindings,
   and config-update insertion/rejection. Do not create parallel page-local
   field arrays or default copies.

## UX and visual criteria

- Ink mode must remain readable as the mesh moves. Test high and low overlay
  opacity and both blend modes; provide a deliberate plain or solid fallback
  when a live slide is unavailable or forced colors are active.
- Text and graphic layers must follow an explicit paint order. Decorative
  elements can opt into ink masking; controls and meaning-bearing graphics
  must not inherit a broad forced `color`/`border-color` rule.
- Preserve the quote's content-driven height and optional overflow, and the
  article card's fixed box, radius, scrim, reveal timing, and whole-card link.
- Keep the wall's typographic hierarchy: article cards are navigational,
  passage quotes are quiet, and feature quotes alone use the chromatic accent.

## Implementation and verification sequence

1. Record baseline screenshots and computed styles for `/wall` and
   `/abstract` at mobile, tablet, and desktop widths, including default and
   ink-enabled card states. Capture Quote's feature and plain paths.
2. Extract the surface and typed config adapter with unchanged defaults.
   Port one consumer, compare; then port the other. Keep any shared mesh work
   already in the workspace intact.
3. Exercise the actual panel/runtime state path for minimum and maximum
   overlay opacity, both blend modes, and breakpoint enable flags. Inspect
   final text, border, surface, and canvas computed styles or pixels and
   capture screenshots for each affected branch. Verify no-slide, reduced
   motion, forced-colors, and interactive-content cases.
4. Run focused tests and TypeScript checks. For browser checks, follow
   `AGENTS.md`: inspect processes first; use one browser and one Next server
   on a non-3000 port with a private build directory; stop both afterward.
   Record viewport, values, screenshot paths, and observed result in the
   implementation handoff.

## Completion test

The extraction succeeds when one supplied content/graphics layer can use the
same surface treatment as an article card, while Card and Quote keep their
semantics and layouts; the visible treatment matches existing default states;
and a new shared treatment field reaches every registered card instance and
persists through `UPDATE DIFF` without page-specific key seeding.

## Implementation record — 2026-10-12

The reusable primitive now lives in `components/GradientInkSurface.tsx` and
its CSS module. `ArticleCard` and `Quote` both use it; `Card/config/appearance.ts`
maps existing appearance fields into its normalized treatment. The card's 0%
surface-opacity state now returns to its light-on-gradient presentation,
because a transparent screen layer made black text disappear. The panel
description states this behavior. No new persisted config keys were added.

Rendered checks used the already-running application at `localhost:4140`
(no verification server was started). Values were changed through the actual
Card Appearance and Editorial quote controls. Screenshot paths below are
local evidence from this run, under `/tmp/abstract-gradient-ink-evidence/`.

| Route / viewport | Values | Screenshot | Observed final consumer |
| --- | --- | --- | --- |
| `/wall` 390×844 | default, `screen`, opacity 1 | `final-wall-mobile-default.png` | white surface, gradient-colored text; computed `screen` |
| `/wall` 390×844 | opacity 0 | `wall-mobile-zero-readable.png` | unblended mesh, light readable text |
| `/wall` 390×844 | opacity 1, `multiply` | `wall-mobile-max-multiply.png` | visible mesh and dark text; computed `multiply` |
| `/wall` 820×900 | default / opacity 0 / opacity 1 `multiply` | `wall-tablet-default.png`, `wall-tablet-zero-readable.png`, `wall-tablet-max-multiply.png` | default `screen`; zero restores light text; maximum computes `multiply` |
| `/wall` 1280×900 | default / opacity 0 / desktop enabled + opacity 1 `multiply` | `wall-desktop-default.png`, `wall-desktop-zero-readable.png`, `wall-desktop-max-multiply.png` | default off; zero restores light text; enabled maximum computes `multiply` |
| `/abstract` 390×844 | default / opacity 0 / opacity 1 `multiply` | `abstract-mobile-default.png`, `abstract-mobile-zero-readable.png`, `abstract-mobile-max-multiply.png` | default `screen`; zero restores light text; maximum computes `multiply` |
| `/abstract` 820×900 | default / opacity 0 / opacity 1 `multiply` | `abstract-tablet-default.png`, `abstract-tablet-zero-readable.png`, `abstract-tablet-max-multiply.png` | same tier behavior on CoverFlow's active card |
| `/abstract` 1280×900 | default / opacity 0 / desktop enabled + opacity 1 `multiply` | `abstract-desktop-default.png`, `abstract-desktop-zero-readable.png`, `abstract-desktop-max-multiply.png` | default off; zero restores light text; maximum computes `multiply` |
| `/wall` 1280×900, standalone Quote | default 80% `screen` / 0% / 100% `multiply` | `wall-quote-default.png`, `wall-quote-zero.png`, `wall-quote-max-multiply.png` | computed surface alpha .8 / transparent / 1; blend `screen` / normal / `multiply`; canvas remains live |
| `/wall` 390×844 | active content border on | `wall-mobile-active-border.png` | content `::after` border is visible at 2px |
| `/wall` 390×844 | forced colors | `wall-mobile-forced-colors.png` | content surface resolves to Canvas and blend mode to normal |
| `/carousel-lab` 820×900 | default | `carousel-lab-tablet-default.png` | 11 plain `ArticleCard` layers retain their links and report ink off |

All listed screenshots were opened and visually inspected. Focused tests:
25 passed across the surface, Card appearance mapping, Quote, and config
updater files. A pure Card Appearance test serialized a real ink-field diff,
parsed its `known_keys` payload, and applied it to the configured shared
source target without writing to disk. No new persisted key was added, so a
new-field insertion across page overrides was not part of this change.
`npx tsc --noEmit --pretty false` and `git diff --check` passed.
All agent-owned browser instances were closed. The pre-existing development
servers on ports 3001 and 4140 were left running; neither was started by
this implementation run.
