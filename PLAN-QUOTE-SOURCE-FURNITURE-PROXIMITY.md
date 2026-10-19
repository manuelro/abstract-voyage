# Quote source heading and proximity fade

Status: heading format implemented by subsequent user instruction. Proximity fade remains plan only and is not implemented.

## Outcome

- Replace the mechanical `ABOUT · From builder to lead · 2018 to 2023` default with `From builder to lead (2018 to 2023)` using one formatter for every editorial quote.
- Let the shared source heading and source link fade progressively as a mouse or trackpad approaches a quote. Each part can opt in independently in its existing shared appearance panel. An off setting preserves today's fully visible rendering.
- Use the card's existing `usePointerProximity` detector and its continuous distance signal. Pointer proximity begins outside the quote bounds; CSS `:hover` must not drive the reveal.

## Current structure and constraints

- `EditorialQuote.tsx` builds the heading inline from `headingLabel`, `headingShowTitle`, `headingShowPeriod`, and `source.title`/`source.period`. The three variants share this component. `quotePartsConfig.ts`, `QuoteParts.panel.ts`, and `quotePartsLiveDesign.ts` own the shared heading/link appearance and its persisted state.
- Heading/link placement can be before, after, or inside the Quote surface. The `EditorialQuote` article encloses every placement; it is the stable proximity boundary and CSS variable ancestor for both parts.
- `Quote.tsx` already uses `useCardLiftPhysics` for lift and `usePointerProximity` for the gradient hologram. The new furniture effect should have **one** additional proximity subscriber per editorial quote when either part is opted in, shared by heading and link. Do not add one listener per part, copy distance math, or piggyback on a hover event. The existing detector uses one shared global frame loop and observes visibility.
- The article subscriber is separate from lift/hologram because their target is the Quote surface and their enabled states differ. Reusing their current DOM custom property directly would fail for heading/link placements outside that surface, and the two existing subscribers can already write to the same Quote root. If profiling warrants further consolidation, give the proximity hook an explicit multi-consumer signal rather than making one consumer read another's DOM variable.

## 1. Shared heading formatter

Create a pure `formatQuoteSourceHeading` helper in the Quote directory and call it once from `EditorialQuote` for all variants and placements.

- Default format: `{title} ({period})`. Trim the inputs; omit empty parts without dangling punctuation. Preserve the source title's existing case and wording.
- The implemented formatter preserves `period` exactly as supplied, per the later request for `{title} ({period})` and nothing else. No year-range rewriting is planned for this phase.
- The implemented formatter keeps `headingShowTitle` and `headingShowPeriod` functional. The obsolete `headingLabel` field and panel control were removed as part of the requested single format; old stored labels are ignored by normalization.
- Update the shared heading panel's summary/descriptions so they describe the chapter heading rather than the old ABOUT line. Keep the accessible article label and link destination intact.

## 2. Shared, opt-in proximity treatment

Add `proximityFadeEnabled` and `proximityFadeMinOpacityPercent` to each shared part appearance (`QuoteHeadingAppearanceConfig` and `QuoteSourceLinkAppearanceConfig`), normalized and persisted through the existing shared store. Default `enabled: false`; choose readable default floors separately for heading and link (proposed 70% and 80%). The minimum is a continuous percentage control, not a Tailwind token. Keep timing and radius shared with the same `CtaButtonConfig` passed to the quote's lift physics; use its proximity radius, easing, attack, and release values, falling back to `DEFAULT_CTA_BUTTON_CONFIG` when no lift config is supplied. This avoids a second motion vocabulary in the panels.

- In `EditorialQuote`, attach one `usePointerProximity<HTMLElement>` ref to the article only when at least one visible part has the fade enabled. Keep the hook call unconditional; omit its DOM ref when off so the feature has no listener. The detector's `onChange` maps its clamped 0–1 proximity to `min + (1 - min) × proximity` for each enabled part and writes two CSS custom properties on the article. No React state update per pointer frame.
- The heading and link read only their respective opacity property. Their existing color, blend layer, font, placement, and link interaction stay in their current render path. The effect is continuous both approaching and leaving, and begins before pointer entry. When a part is disabled or absent, it remains fully opaque and receives no fade class.
- Initial server/client markup must agree. Render a deterministic initial opacity for an opted-in part and let the detector update it after mount; avoid a raw `<style>` string in the page (a previous wall change caused a hydration mismatch). Put visual rules in `EditorialQuote.module.css`.
- Keep the link keyboard accessible and discoverable: never gate pointer events; force both parts fully visible while the article contains keyboard focus. On touch/coarse pointer and reduced motion, render both fully visible. Do not use `:hover` as the reveal trigger. Validate contrast at the configured minimum over featured gradient, solid, and plain surfaces; raise the default floor if needed.

## 3. Config and compatibility

- Put the heading fade toggle/minimum in `QUOTE_HEADING_PANEL` and the link fade toggle/minimum in `QUOTE_SOURCE_LINK_PANEL`; expose the minimum only when its toggle is on. Both settings are shared across featured, plain, and solid quotes, including `/wall` and Quote Lab.
- Keep per-variant heading/link visibility, placement, label, and alignment in the editorial panels. Heading format belongs there because it controls content structure, not the shared part's visual treatment.
- Extend normalization and persisted-store tests to cover old records with missing fade/format keys, custom labels, independent heading/link toggles, and reset/UPDATE DIFF output. Do not create local Tailwind option lists or alter generated registries.

## 4. Verification and acceptance

1. Pure formatter tests: literal year ranges, `circa`, `since`, empty/partial fields, title punctuation, and all display-flag combinations.
2. Component tests: each variant; heading/link before, inside, and after; independent fade toggles; unchanged ink/blend render paths; panel updates reaching the final elements. Check that opt-out attaches no extra proximity subscriber.
3. Run the app on a non-3000 port with a private Next build directory after inspecting existing Next/Chrome/Playwright processes. Use one browser instance and close it afterward. Do not interfere with other agents' servers.
4. Through the actual Quote Lab controls or their runtime state path, inspect computed heading/link opacity at pointer far away, within the configured radius, and over the article; verify a monotonic progressive change and return fade. Repeat at the configured minimum/maximum floors, desktop/tablet/mobile breakpoints, and on `/wall` for featured/plain/solid with inside and outside placements. Test keyboard focus, touch emulation, reduced motion, and CSS/unified gradient modes. Capture and inspect screenshots and record viewport/config/path/result. Stop every agent-owned verification process before handoff.

## Implementation order

1. Formatter and removal of the obsolete source-label control. **Implemented.**
2. Shared part appearance fields, defaults, normalization, and persisted-store coverage.
3. One article-level proximity subscriber and CSS opacity consumers, with accessibility fallbacks.
4. Focused tests, then bounded visual verification at every affected render path and breakpoint.
