# Editorial Hero — Heading Size Scale Gaps + Breakpoint-Tabs Plan

## 1. Root cause: missing 3XL/4XL

The three "Heading Size" rows (Narrow / Mid / Wide) are **not** generated
from a shared type scale. Each breakpoint's option list is an independently
hand-typed literal union + matching panel array, and the person who typed
them picked a different 6-value window per breakpoint instead of reusing one
canonical scale:

- `experiences/abstract/components/AbstractEditorialHero.config.ts:49-69`
  (the type unions actually constrain what values are legal):
  - `...FontSizeNarrow`: `sm, lg, 2xl, 3xl, 4xl, 5xl` — has 3XL/4XL
  - `...FontSizeMid`: `sm, 2xl, 4xl, 5xl, 6xl, 7xl` — **missing 3XL**
  - `...FontSizeWide`: `sm, 2xl, 5xl, 6xl, 7xl, 8xl` — **missing 3XL and 4XL**

- `experiences/abstract/components/AbstractEditorialHero.panel.ts:204-244`
  mirrors the same three arrays for the button rows shown in the panel.

This is why the screenshot shows Wide jumping SM → 2XL → 5XL: `lg:text-3xl`
and `lg:text-4xl` were never added to either the type union or the panel
options for that breakpoint. It is not a filter, a CSS/Tailwind class
problem, or a rendering bug in `ConfigScopeList`/`ConfigScopeRenderer` — the
values simply don't exist in the allowed set for Mid/Wide. There's no
comment in the file justifying the omission (contrast with the
`headlineMaxWidth`/`paragraphMaxWidth` split just below it, which *does*
have a comment explaining why those two intentionally use different scales)
— this reads as an authoring gap, not an intentional design choice.

**Fix scope:** add `'md:text-3xl'` to the Mid union/options, and
`'lg:text-3xl'` / `'lg:text-4xl'` to the Wide union/options, in both files
above. Both are already used elsewhere for other components
(`components/tailwindTypographyScale.ts` already has the full 2xl–8xl
ramp per breakpoint prefix), so no new Tailwind class needs to be generated
— it's purely adding literals to two files.

## 2. Feasibility of breakpoint tabs for Editorial Hero: high, and mostly already built

The tabs UI seen on `abstract.tsx`'s Polymorphic Layout panel is **not**
page-specific — it's a primitive already centralized in the Panel config
system:

- `components/Panel/config/types.ts:154-165` — `ConfigFieldTabs`, one
  generic `{ kind: 'tabs', tabs: [{ id, label, fields }] }` shape any scope
  can use.
- `components/Panel/config/controlResolver.tsx` — the one shared renderer
  for every `kind: 'tabs'` entry, regardless of which scope/page defined it.
- Used today by `PolymorphicLayout.panel.ts:472-518` (abstract.tsx's
  ALL SIZES / MOBILE (<768px) / TABLET (≥768px) / DESKTOP (≥1024px) tabs).

**The Editorial Hero Layout panel already uses this same primitive** —
just not for the heading-size fields. `AbstractEditorialHero.panel.ts:470-518`
already wraps its fields in the identical
`ALL SIZES / MOBILE / TABLET / DESKTOP` tab structure, but only the "Lead
gap" field is split across the Mobile/Tablet/Desktop tabs
(`leadGap` / `leadGapWide` / `leadGapLg`). Every other field — including all
three Heading Size rows, Heading width, and Body size rows — is dumped into
the `ALL_SIZES_FIELDS` array (line 18) and rendered flat under the "ALL
SIZES" tab, which is the actual UI difference from abstract.tsx's layout
panel.

**Plan:** move the breakpoint-specific fields out of `ALL_SIZES_FIELDS` and
into their matching tab's `fields` array, in
`experiences/abstract/components/AbstractEditorialHero.panel.ts`:

| Field | Current location | Target tab |
|---|---|---|
| `headlineFontSizeNarrow` | ALL_SIZES_FIELDS | `mobile` |
| `bodyFontSizeNarrow` | ALL_SIZES_FIELDS | `mobile` |
| `headlineFontSizeMid` | ALL_SIZES_FIELDS | `tablet` |
| `bodyFontSizeMid` | ALL_SIZES_FIELDS | `tablet` |
| `headlineFontSizeWide` | ALL_SIZES_FIELDS | `desktop` |
| `bodyFontSizeWide` | ALL_SIZES_FIELDS | `desktop` |

`headlineMaxWidth` and `paragraphMaxWidth` are not breakpoint-scoped (one
value applies at all sizes) and should stay in `ALL_SIZES_FIELDS`, same as
`headlineMatchesBodySize`/`headlineFontFamily`. No new primitive, no schema
change, no `types.ts`/`controlResolver.tsx` edit needed — this is purely
re-arranging existing field entries into the tab buckets that already
exist in this same file.

## 3. Blast radius: applies automatically to every page using this scope

`ABSTRACT_EDITORIAL_HERO_LAYOUT_SCOPE_ID` / `ABSTRACT_EDITORIAL_HERO_LAYOUT_PANEL`
is defined exactly once, in this one file, and registered exactly once in
`experiences/abstract/configPanels.ts:43-107`. Every page that mounts the
Editorial Hero picks up this single panel definition — currently:

- `pages/abstract.tsx`
- `pages/about.tsx`

Both the heading-scale fix (§1) and the breakpoint-tabs reorg (§2) are
single-file edits to `AbstractEditorialHero.panel.ts` (+ the config.ts type
unions for §1) and will apply to both pages, and any future page that mounts
`AbstractEditorialHero`, with no per-page changes required.

## Recommendation

Do both in one pass: fix the three option lists to a consistent scale
(§1), then move the six now-consistent heading/body size fields into the
mobile/tablet/desktop tabs (§2). Low risk — no shared primitive changes,
no new component, touches one panel file (plus one type file for the
option-list fix).
