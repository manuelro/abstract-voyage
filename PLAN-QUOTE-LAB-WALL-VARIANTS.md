# Quote Lab: configurable wall quote variants

**Status:** Implemented and live-verified on 2026-10-13. Source complete, TypeScript clean, focused tests green, and browser verification passed at mobile/tablet/desktop for all three variants plus wall consumption of persisted configs. The acceptance checks below are met; see the verification note at the end.
**Requested scope:** `pages/quote-lab.tsx` and `experiences/abstract/components/Quote/*`. A small integration change in `pages/wall.tsx` and retirement or reduction of `pages/WallQuoteItem.*` will be necessary for the saved designs to control the real wall. This is included in the implementation plan, not performed now.

## Current state and correction

- `pages/WallQuoteItem.tsx` adds an `ABOUT · title · period` cue and an `Explore this chapter` / `Read the full passage` link outside `<Quote>`. Their type, colors, spacing, and placement are hardcoded in `pages/WallQuoteItem.module.css`.
- The ordinary wall quote's top border is hardcoded at `1px solid rgba(69, 98, 125, 0.24)`.
- A single `feature` role forces unified gradient ink, white text, zero overlay opacity, a rounded box, and preset padding; all roles override several live Quote settings. Thus changing the existing Quote Lab config cannot reliably change these wall appearances.
- Quote Lab currently shows device-tier and text-length copies of one base `<Quote>`, controlled by one `QUOTE_PANEL`. It does not show the wall cue, link, rule, or three independently editable wall treatments.
- `themes.ts` stores named `QuoteConfig` snapshots and `liveDesign.ts` stores one live `QuoteConfig`. The new variant data needs explicit migration and persistence; a saved config must drive the same rendering in the lab and on the wall.

## Intended authoring model

Show **three real wall-quote previews** in Quote Lab, each with its own clearly named config panel and independently editable, persisted config:

| Preview | Initial example | Initial treatment |
| --- | --- | --- |
| Featured / descriptive | Short About statement | Top descriptive section visible; emphasized quote; gradient background enabled |
| Plain / no heading | Ordinary statement | Top descriptive section hidden; quiet surface; optional top rule |
| Solid surface | About passage | Solid background color; readable foreground; top descriptive section initially visible |

These are starting presets, not locked component types. Heading visibility, link visibility, top rule, emphasis, and background mode must remain independent opt-in controls on **each** variant. The solid example uses a genuine configurable solid color, not a palette-only surrogate. Preserve the existing device-tier and content-length previews as secondary checks, or adapt them to the selected variant without replacing the three primary previews.

## Config contract and panel sections

1. **Variant identity and persistence.** Define stable keys for `featured`, `plain`, and `solid`; store a complete appearance config per key. Give each preview its own panel binding, selected panel context, reset, and named save/apply workflow. Saving and reloading must preserve both the variant and all its fields. Migrate existing single-config `quote-live-design` and `quote-themes` data without silently discarding earlier designs. Keep editorial source data (`title`, `period`, destination, full text) separate from appearance defaults; preview fixtures should use real About timeline examples.
2. **Descriptive section.** Add a show/hide toggle and controls for its content template or label, placement relative to the quote, font size, family, weight, text color, and top/right/bottom/left padding. Include spacing between cue and quote. Use generated Tailwind fields for token-backed size, family, weight, and padding if the manifest supports them; otherwise extend the global utility manifest and regenerate. Keep placement constrained to understandable positions (for example, above or below the quote and start/center/end alignment) rather than free coordinates by default. Its accessible label should retain meaningful source/context even when the visual cue is hidden.
3. **Action link.** Add show/hide; editable visible label; placement relative to the quote; font size, family, weight, color, and four independent padding sides; icon choice including `none`; icon position, size, and gap. The destination comes from the About source record and stays a real link. The icon must not be the only accessible name. Keep hover and focus-visible treatment readable and configurable where it affects appearance. Avoid calling it a button if it navigates; panel copy can say “Source link.”
4. **Top rule.** Add independent enable, thickness, color, and opacity controls. Apply to the intended quote outer shell, with an explicit decision about whether it spans the full shell or the padded content width. Do not conflate it with `gradientInkBorder*`, which styles the overlay inside `<Quote>`.
5. **Quote body and surfaces.** Make the emphasized/bold quote opt-in through a body font-weight control or an explicit emphasis switch with a defined effect. Expose background mode (`none`, `solid`, `palette`, `gradient mesh`), solid color, foreground color, and gradient settings using existing Quote capabilities where suitable. The gradient mesh must be opt-in on any variant, with safe text contrast and a non-mesh fallback. Do not force background, text size, family, padding, or gradient settings by role after panel values have been applied.
6. **Layout ownership.** Move cue, top rule, and source link into a shared Quote composition or a dedicated shared wrapper colocated with Quote, so the lab and wall render the same markup and styles. Keep one base `<Quote>` renderer for the actual quotation; avoid three copied implementations. Clearly separate outer shell padding from the existing figure padding so each control has a predictable effect, including the gradient figure's clipping and stacking behavior.
7. **Responsive controls and normalization.** Extend base/md/lg controls for size and spacing wherever the existing Quote panel offers them and where these additions need them. Normalize partial, stale, and out-of-range saved values. Use `TailwindTokenValue`, `createTailwindFieldFactory`, and `normalizeTailwindToken` for new or materially changed Tailwind-backed fields. Any fixed option list over roughly 6–8 entries uses `select`, not `enum`.

## Implementation sequence (future turn)

1. Capture the current wall and Quote Lab appearance as a baseline, and list the exact current hardcoded values and override precedence in `WallQuoteItem`.
2. Define the per-variant config schema, defaults, normalization, and migration of existing live drafts and named themes. Decide and document which appearance values are shared across variants and which are independent; initial plan is independent saved snapshots for predictable editing.
3. Build the shared quote composition and corresponding config-driven panel sections. Remove role-based visual overrides from the wall integration while retaining its source-aware excerpt model and deep links.
4. Show the three variant previews in Quote Lab, each with its own bound controls. Make Save, Apply, Update, and Reset target the selected variant explicitly, with the target named in the UI; preserve the older single-quote preview use case.
5. Connect the wall to the persisted variant configs. Check that changing a value in Quote Lab changes the matching wall quote after navigation or reload, without another wall-only style overriding it.
6. Add focused schema/persistence/rendering tests for old saved data, all three variants, heading/link toggles, icon `none`, rule extremes, solid color, and gradient off/on. Then perform live visual verification below.

## Acceptance and verification

- Each of the three visible Quote Lab previews has an identifiable matching panel. Changing a control through that panel visibly changes only its intended preview and, after persistence, the corresponding wall treatment.
- Heading and source link can each be hidden or shown on every variant. When shown, placement, font size/family/weight/color, and four padding sides visibly respond to their controls. Link icon choice and placement respond, including `none`; the link still reaches the correct About anchor by keyboard and pointer.
- Top rule enable, thickness, color, and opacity produce visibly distinct results at minimum and maximum values. There is no leftover hardcoded `border-top` overriding them.
- Emphasis and gradient background are independently opt-in. A solid background color is selectable and appears in the solid preview and wall. Text remains legible over chosen surfaces; assess contrast on the final rendered pixels, particularly over a mesh.
- Saved, updated, and reloaded configs preserve all variant-specific values, including after page navigation and browser reload. Older single-config data loads safely. The exact wall consumer uses the selected values rather than a role preset that silently wins.
- Run on a free non-3000 port with a private Next build directory after checking existing browser/server processes. At mobile, tablet, and desktop breakpoints capture screenshots of default and relevant min/max config states for all three variants. Inspect screenshots and final DOM/computed styles for cue, link, rule, quote body, and background; also test keyboard focus, long text, and 200% zoom. Stop all agent-owned verification processes afterward. Report any untested path explicitly.

## Open design decision for implementation

The user describes three examples (“with the top descriptive section,” “without it,” and “with a solid background”), which are overlapping visual attributes rather than exclusive types. This plan treats them as three editable starting presets with independent controls, so a solid quote can also have a heading or gradient if chosen. The default solid preview will show the heading; this can be changed during implementation without changing the config architecture.

## Implementation record

- The lab now renders three wall previews from About timeline data, with separately bound Featured, Plain, and Solid appearance scopes. Existing base Quote device/content checks remain available in a collapsed section.
- `EditorialQuote` renders the source heading, source link, optional icon, top rule, and background choice for both lab and wall. The heading and link can sit outside or inside the Quote figure. The wall no longer applies visual role overrides after config resolution.
- Each variant has its own live persisted config in `editorialLiveDesign.ts`. Named themes now carry the variant and retain editorial fields; older base themes remain loadable.
- Quote body font weight is a generated Tailwind token field, normalized and applied at the rendered paragraph.
- Length-based size fitting is retained as an opt-in per variant with a minimum font-size token and maximum-line target; manual text size remains authoritative when fitting is off.
- Focused renderer, wall, and theme persistence tests pass. TypeScript passes. The four failing assertions in the broad `Quote.test.tsx` (mesh brightness/saturation/scale, solid palette `--quote-base-color`, and elevation/shadow lift) were audited: they fail identically at HEAD before any of this work (32 passed / 4 failed on the untouched baseline), so they are pre-existing Quote-internal issues, not regressions from the editorial variants. Left unfixed to stay in scope (they touch shared Quote mesh/lift internals).

## Verification note (2026-10-13)

Live browser verification ran against `next dev` on an isolated port (3761) and private dist dir (`CLAUDE_NEXT_DIST_DIR=.next-quote-verify`), after confirming other sessions' servers on 3000/3999 and leaving them untouched; both were stopped and cleaned afterward. Playwright (Chromium) checks, all passing:

- `/quote-lab` at mobile (390), tablet (834), desktop (1440): all three `data-quote-lab-variant` previews present with distinct treatments — featured = gradient mesh + heading + bold body + link, no rule; plain = no background + 1px top rule + heading hidden + link; solid = solid surface (`rgb(229,237,242)` on the Quote surface element) + heading + "Read the full passage" link. No page errors at any breakpoint (only the pre-existing `useLayoutEffect` SSR warning).
- Source link is keyboard-focusable and carries a full accessible name (`aria-label="Explore this chapter — Where it starts on About"`) reaching the correct `/about#about-<id>` anchor.
- Top rule extremes apply: `border-8` + 100% opacity green resolves to computed `border-top-width:8px; border-top-color:rgb(0,255,0)`.
- Persistence → wall: writing a distinctive solid background to `quote-editorial-designs-v1` on `/quote-lab` and loading `/wall` shows the excerpt quote surfaces picking up the exact persisted color (`rgb(255,0,204)`), confirming the wall consumes the saved variant config with no role preset overriding it. The wall renders all three roles (statement/excerpt/feature) interleaved with the real article mesh cards.

Minor observation (not a defect): on `/quote-lab` only, the featured variant's heading sits above the quote over the lab page's own full-bleed scroll gradient, so heading contrast there depends on the page background rather than the quote surface. On the wall the heading sits over the page's lighter surface. Heading color, placement (including inside-top/bottom over the mesh), and all other controls remain fully configurable per variant.
