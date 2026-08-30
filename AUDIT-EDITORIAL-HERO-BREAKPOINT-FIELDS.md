# Audit — Editorial Hero Layout: full Tailwind scale + breakpoint segregation

Scope: `experiences/abstract/components/AbstractEditorialHero.config.ts` +
`AbstractEditorialHero.panel.ts` (the single shared "Editorial hero layout"
panel scope, mounted by `pages/abstract.tsx` and `pages/about.tsx`).

## 1. Full Tailwind scale confirmed available

`tailwind.config.js` does not override `theme.fontSize` (only `screens`,
`fontFamily`, and a `minHeight`/`minWidth` extend are customized), so the
project has Tailwind's complete default type scale compiled and available,
unconstrained by any local config:

```
text-xs   text-sm   text-base   text-lg   text-xl   text-2xl
text-3xl  text-4xl  text-5xl    text-6xl  text-7xl  text-8xl  text-9xl
```

The existing per-breakpoint option arrays in `AbstractEditorialHero.config.ts`
(`HEADLINE_FONT_SIZE_NARROW/MID/WIDE`, `BODY_FONT_SIZE_NARROW/MID/WIDE`,
lines 321-338) and their mirrored panel option lists (`.panel.ts:204-293`)
each use a hand-picked 4-6 value subset of this 13-value scale, and each
subset differs from the others (documented in the earlier bug report —
Mid drops `3xl`, Wide drops `3xl`+`4xl`, the body trio caps at `2xl` and never
reaches `3xl`+). None of this is a Tailwind limitation: `text-9xl` is
already used elsewhere unrelated to this component
(confirm via `grep -r "text-9xl"` if a reference is wanted), so extending
these six arrays to the shared, complete `xs`→`9xl` scale is a pure data
change — same enum/`select` control kind, no new control type, no
Tailwind config edit.

Reusable source: `components/tailwindTypographyScale.ts` exists as a shared
scale file but itself only goes up to `6xl` and only has `md:`-prefixed
variants (no `lg:`) — it is not currently a complete enough source to import
verbatim for this component's Mid/Wide fields. Options: extend that shared
file to `9xl` and add an `lg:`-prefixed export (benefits every other
consumer of that file too), or keep the six arrays component-local but
complete. Recommend the former per the "reuse existing knobs" convention,
but flagging as a decision point rather than assuming it in this audit.

## 2. Field-by-field breakpoint-segregation audit

`AbstractEditorialHeroConfig` has 37 fields. Classified below.

### Already segregated by breakpoint (9 fields, 3 trios)

| Trio | Fields | Panel location today |
|---|---|---|
| Heading size | `headlineFontSizeNarrow` / `Mid` / `Wide` | flat, inside `ALL_SIZES_FIELDS` (not yet in the mobile/tablet/desktop tabs) |
| Body size | `bodyFontSizeNarrow` / `Mid` / `Wide` | flat, inside `ALL_SIZES_FIELDS` (same) |
| Lead gap | `leadGap` / `leadGapWide` / `leadGapLg` | **already** placed in the `mobile` / `tablet` / `desktop` tabs |

Heading size and Body size are the two trios the tabs reorg (from the prior
report) should move into the same three tabs Lead gap already uses.

### Candidates worth a product decision, not yet breakpoint-specific

| Field | Why it's a candidate | Recommendation |
|---|---|---|
| `headlineShadowScale` | Scales blur/displacement relative to headline size, which *does* vary 3-8x across the Narrow→Wide trio (per its own doc comment: "drop below 1 if legibility at small headline sizes ever needs protecting") | Reasonable future 3-way split (`headlineShadowScaleNarrow/Mid/Wide`), but no current evidence anyone needs it — leave single-value unless requested. |
| `headlineMaxWidth` | Tailwind `max-w-*` utilities support responsive prefixes same as font-size; currently one value applies at every breakpoint | Same shape of change as the font-size fix, but out of scope here — flag only. |
| `paragraphMaxWidth` | Same reasoning as `headlineMaxWidth` | Flag only. |

None of these were mentioned in the screenshots/request — listed for
completeness, not proposed for this pass.

### Not applicable — should remain single-value

Everything else (28 fields) is either a mode/toggle that has no visual
reason to differ by viewport, or a value already viewport-independent by
design:

- **Color/contrast system** (12 fields): `copyColor`, `copyColorMode`,
  `copySurfaceOffset`, `copyMinContrast`, `paragraphTextColor`,
  `paragraphTextColorMode`, `paragraphSurfaceOffset`, `paragraphMinContrast`,
  `eyebrowColor`, `eyebrowColorMode`, `eyebrowSurfaceOffset`,
  `eyebrowMinContrast` — color and WCAG contrast targets don't vary by
  breakpoint in this design system.
- **Gradient asset controls** (7 fields): `headlineGradientRelationship`,
  `headlineGradientSourceMode`, `headlineGradientSourceRow`,
  `headlineGradientDebugEnabled`, `headlineGradientDebugSizePx`,
  `headlineGradientScale`, `headlineGradientPanXPercent`,
  `headlineGradientPanYPercent` — same underlying texture crop/debug view
  regardless of viewport.
- **Headline fill/shadow toggles** (3 fields): `headlineFillMode`,
  `headlineShadowEnabled`, `headlineShadowElevatedEnabled` — on/off states,
  not sized values.
- **Typography modes** (2 fields): `headlineFontFamily`,
  `headlineMatchesBodySize` — pin a family or a matching behavior, not a
  size.
- **Reading rhythm** (2 fields): `copyLineHeight`, `copyLetterSpacingEm` —
  single values by design; Tailwind's `leading-*`/`tracking-*` scale isn't
  breakpoint-prefixed here.
- **Emphasis** (3 fields): `emphasisDimOpacity`, `emphasisWordOpacity`,
  `emphasisFontWeight` — content-emphasis styling, viewport-independent.
- **Content policy** (1 field): `composerVisible` — visibility is a content
  decision per the field's own doc comment, not a layout one.

## Summary

- Extending the six font-size arrays to the full `xs`→`9xl` Tailwind scale
  is a pure data change to two files (`AbstractEditorialHero.config.ts`
  type unions/arrays + `.panel.ts` option lists) — no blockers found.
- Of 37 fields, **9** (heading size ×3, body size ×3, lead gap ×3) are
  legitimately breakpoint-scoped. Lead gap is already in the mobile/
  tablet/desktop tabs; heading size and body size are the only two trios
  still misplaced in the flat "ALL SIZES" tab and are the ones the tabs
  reorg should move.
- 2 fields (`headlineMaxWidth`, `paragraphMaxWidth`) and 1 field
  (`headlineShadowScale`) are plausible future breakpoint splits but are
  out of scope unless requested — flagged, not recommended.
- The remaining 25 fields have no legitimate breakpoint dimension and
  should stay exactly as they are.
