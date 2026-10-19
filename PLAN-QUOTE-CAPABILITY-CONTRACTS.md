# Quote capability contracts and specialization plan

**Status:** Implementation in progress. The shared render contract, Featured defaults, and versioned live overrides are implemented; browser verification remains outstanding.
**Scope:** The base `Quote`, its featured/plain/solid `EditorialQuote` specializations, Quote Lab, wall consumers, panel definitions, live designs, and named themes. This plan addresses behavioral parity; it does not replace the existing field inventory in `AUDIT-QUOTE-CONFIG-FIELDS.md`.

## Problem and evidence

The variants already share the `Quote → GradientInkSurface → CardGradientMesh` rendering path. Sharing a component is insufficient when a specialization can select values that silently change the meaning of a shared feature.

The immediate example is Unified ink:

- `DEFAULT_QUOTE_CONFIG` sets `gradientInkBlendMode: 'screen'` and `gradientInkOverlayOpacityPercent: 43`.
- `FEATURE_QUOTE_CONFIG` overrides overlay opacity to `0` and ink to white. `FEATURED_EDITORIAL_QUOTE_CONFIG` inherits those values.
- `GradientInkSurface` chooses `data-gradient-ink-layer="plain"` when the overlay opacity is zero and `blendWhenTransparent` is false. Its CSS applies `mix-blend-mode` only to `screen` and `multiply` layers. `Quote` passes `blendWhenTransparent: false`.
- The Quote root can still report `data-quote-blend="screen"` and `data-quote-gradient-state="active"`, although the actual text layer does not blend. Current tests largely assert those upstream values.
- The wall also passes `deferGradientUntilVisible`; the lab preview does not. Until visibility resolves, the shared renderer can have an active Unified state with no mounted mesh.

Thus the failure is a **contract gap between authoring values, resolved feature state, and the final rendered layer**, plus full persisted snapshots that can retain old preset values. The CSS fallback sharing work does not address this Unified ink failure.

## Target architecture

### 1. One semantic contract per base capability

For each base capability, document and encode four things in one owned module: valid inputs, normalized state, rendered output, and fallback state. Start with gradient ink, palette surface, typography, geometry, and lift/shadow; use the field audit to cover the remaining capabilities incrementally. Keep the existing `Quote` as the single renderer. Avoid a generic capability framework unless several capabilities demonstrate the same extraction need.

For Unified ink, the contract must say precisely which element blends, which backdrop it blends against, and what `unified`, `screen`, `multiply`, and zero opacity mean. The requested invariant is: selecting Unified ink with an available mesh produces the same compositing structure and effective blend behavior for base, featured, plain, and solid quotes. A preset cannot quietly turn Unified into plain ink. If a transparent, unblended card treatment remains useful, expose it as an explicitly named separate treatment rather than making it an undocumented edge case of Unified ink. Do not add that treatment without a product requirement.

Represent resolved rendering state as a discriminated result (for example `plain`, `palette`, `cssInk`, `unifiedInk`, `pendingMesh`) from one resolver. `Quote` renders from that result. Diagnostics must describe the resolved state of the final layer, not only the requested config value. This removes contradictory states such as root `screen` while the layer is `plain`.

### 2. Three layers of configuration, with clear ownership

Resolve configuration in this order: **base defaults → small role preset → user overrides**. A role preset should contain only values that intentionally distinguish the role, such as typography, quotation mark use, furniture placement, and default surface choice. It must not redefine the semantics of a base feature. Allow a core field in a role preset only when its changed value still satisfies that feature's contract; make exceptions visible in a reviewed list.

Keep `backgroundMode` as the editorial surface selection, with gradient/palette enable flags derived in one place. The selected gradient render mode remains a shared Quote input. `EditorialQuote` supplies source text and furniture; it does not build its own gradient layers, calculate a second blend rule, or mask Quote's mesh availability. Host-specific choices such as mesh deferral are explicit environment inputs to the shared resolver/render path.

Separate **live design overrides** from **named theme snapshots**. A live variant should persist only user changes relative to a versioned preset, so future base fixes reach variants unless the user explicitly overrode that value. A named theme may intentionally freeze a full design, but it must carry a schema version and still normalize into a valid feature state.

### 3. One authoring path for each capability

The base field definition, normalization, and visibility rules are authored once and composed into all three variant panels. Variant panels add only editorial fields. A control must update the same raw field that the shared resolver consumes. Keep the project convention for generated Tailwind token fields and use `select` for option lists above the enum ceiling.

For every feature, maintain a small ownership table: panel field → persisted value → normalization → resolved state → final DOM element/style. This is an engineering checklist, not a second registry of token options or a copied render implementation. Reject a feature addition when it requires variant-specific copies of any link in that path.

## Implementation sequence (future work)

1. **Capture the current contract failure.** Add a focused test using one deck and the same requested Unified values across base and all variants. Assert the final `data-gradient-ink-layer`, surface opacity, glyph ink, and effective blend expectation. Add a wall-deferral case that distinguishes `pendingMesh` from genuinely active blending. Record the current failing result before changing behavior.
2. **Define and centralize gradient state.** Move mode/availability/blend gating into a pure Quote-owned resolver. Make `GradientInkSurface` receive one resolved treatment, and make root diagnostics derive from that same result. Keep mesh sampling and CSS fallback in the existing shared Quote path; do not create a Featured renderer.
3. **Align presets with the contract.** Remove the Featured preset's implicit plain-ink treatment so its default Unified state uses the same blend behavior as the base quote. Retain role-specific typography and editorial furniture. Compare actual layer and backdrop inputs, not just `gradientInkRenderMode`.
4. **Version and migrate persisted designs.** Introduce a versioned live override format. Convert old full `quote-editorial-designs-v1` records by diffing against the *old* versioned defaults, then apply those user differences to the new defaults. The old format cannot prove whether a value equal to its default was explicitly chosen; document that ambiguity, preserve a backup during migration, and use a deterministic rule. Version named themes separately and preserve their snapshot intent. Verify reload and cross-page propagation.
5. **Apply the pattern to other capabilities.** Use the field audit to identify each feature's source of truth and final consumer. Prioritize capabilities with conditional rendering or multiple interacting fields: palette/solid surfaces, author and marks, responsive typography/padding, geometry/overflow, adaptive sizing, elevation/shadow, heading/link ink. Extract a shared resolver only where a real duplicate calculation or contradictory state exists.
6. **Remove obsolete paths.** After the parity tests pass, remove misleading diagnostics, redundant normalization, dead preset overrides, and duplicated preview derivations. Keep the panel's presentation code separate from the renderer's behavior code.

## Acceptance gates

- **Structural:** one Quote renderer and one final ink layer implementation; all variants inherit the same base capability definitions. A new base field appears in all variant panels without a copied field declaration or variant render branch.
- **Behavioral:** for identical normalized Quote inputs and the same deck/environment, base and all variants produce the same resolved feature state and final layer styles. Differences must come from explicit role or user values, never a second implementation.
- **Unified ink:** with a mesh, both `screen` and `multiply` reach the actual content layer as computed `mix-blend-mode`; the surface and glyph colors/opacity respond to their controls. Test zero and maximum overlay opacity against the chosen explicit semantics. Missing and deferred meshes have honest fallback/pending states.
- **Persistence:** fresh defaults, old stored designs, edited live designs, saved themes, reset, reload, and lab-to-wall navigation all preserve the intended value precedence. A base behavior fix reaches variants with no user override.
- **Visual:** before claiming completion, run one isolated non-3000 Next server and one bounded browser after checking existing processes. At base, md, and lg breakpoints, use the real panel or its runtime state path for Unified `screen`/`multiply`, overlay minimum/maximum, and mesh pending/ready; capture and inspect screenshots and final computed styles or pixels for the quote body and layer. Check `/quote-lab` and every wall render branch. Record viewport, values, screenshot paths, and observations; stop agent-owned processes.

## Scope control

Implement in small vertical slices, beginning with Unified ink. Keep existing user work intact. Do not claim the broader quote architecture complete from passing one feature's tests. Implementation was authorized by the user's subsequent request.

## Implementation record

- `renderState.ts` now owns gradient mode, source index, mesh readiness, fallback state, and the Unified ink treatment. `Quote.tsx` derives its root diagnostics and final `GradientInkSurface` props from that result.
- Role defaults are explicit override records. Featured no longer overrides the base ink compositing values; a zero-opacity Unified surface still blends its painted glyphs.
- Live editorial designs use versioned override storage (`quote-editorial-designs-v2`). Legacy full snapshots are compared with the old defaults and backed up before migration. Named themes remain full snapshots with a schema version.
- `CAPABILITIES.md` records ownership and the final consumer for the main shared capabilities. Focused renderer, variant, wall, persistence, and shared-surface tests plus TypeScript pass.
- Browser inspection of computed blend mode and pixels at the required breakpoints remains open. Existing Next processes on ports 3771 and 3999 were running throughout this implementation; none were started or stopped here.
