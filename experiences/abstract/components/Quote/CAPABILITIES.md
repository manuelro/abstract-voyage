# Quote capability ownership

All three editorial variants render through `EditorialQuote → Quote`. A role may change defaults and furniture; it does not implement a second copy of a base capability. For a new or changed capability, trace its panel input to the final element and add an assertion there.

| Capability | Authoring and normalization | Resolution | Final consumer |
| --- | --- | --- | --- |
| Gradient ink and render mode | `Quote.panel.ts`, `config.ts`; editorial `backgroundMode` derives the enable flag in `editorialConfig.ts` | `renderState.ts` chooses plain, palette, CSS, pending mesh, or Unified; `cssInkFallback.ts` builds the provisional CSS ramp | `Quote.tsx` supplies one `GradientInkSurface`; `GradientInkSurface.module.css` applies blend mode on the content layer |
| Source card | `config.ts` normalizes the card selector | `renderState.ts:resolveQuoteSourceIndex` clamps it for the available deck | `CardGradientMesh` receives the selected slide; the CSS fallback uses the same index |
| Palette and text ink | `Quote.panel.ts`, `config.ts`; editorial surface selection is derived in `editorialConfig.ts` | `renderState.ts` selects palette; `config.ts` generates colors and derives legible ink | `Quote.tsx` applies root background and text color |
| Typography, padding, marks, geometry | Base fields in `Quote.panel.ts`, normalized in `config.ts` | `Quote.tsx` resolves Tailwind tokens and responsive classes | Figure, paragraph, marks, and attribution in `Quote.tsx` and `Quote.module.css` |
| Elevation and shadow | Base controls in `Quote.panel.ts`, normalized in `config.ts` | `Quote.tsx` gates the shared `useCardLiftPhysics` engine | Quote root transform and shadow |
| Source heading and link | Shared appearance scopes in `QuoteParts.panel.ts`; per-type content/placement in `EditorialQuote.panel.ts` | `EditorialQuote.tsx` resolves shared appearance and inherited ink | Heading and link within or beside the shared Quote |

Live editorial designs are stored as versioned differences from role defaults in `editorialLiveDesign.ts`; named themes in `themes.ts` remain versioned snapshots. This distinction lets a base default correction reach a variant with no user override while preserving an explicitly edited design.

**Review rule:** a base field must appear through the shared panel composition, normalize once, have one resolved meaning, and be checked at its final consumer. A root diagnostic such as `data-quote-blend` is not proof that the text layer blends; inspect `data-gradient-ink-layer` and computed `mix-blend-mode` on that layer. Check lab and wall hosts, including deferred mesh and absent deck states.
