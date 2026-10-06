# Plan — SiteHeader breakpoint segregation on shared Tailwind-token fields

## Status

Implemented on 2026-09-24. SiteHeader now consumes the shared generated Tailwind utility sets, exposes base/`Wide`/`Lg` fields in four device tabs, migrates legacy names and arbitrary values on read, and shares the promoted font-size and content-width tokens with page-owned layout controls. The legacy gradient designer's duplicate wrapper pickers were removed in favor of the authoritative SiteHeader scope. `npm run verify:tailwind-fields`, `npx tsc --noEmit`, and the focused Tailwind/SiteHeader tests pass. Rendered checks covered `/abstract`, `/about`, `/contact`, and `/posts/welcome` at 767, 768, 1023, 1024, and 1280px; panel-selected token extremes and 9/10/11px navigation sizes were inspected at their final DOM consumers. A 768px wordmark clipping defect found in screenshots was corrected by bounding its inline width to its segment, then rechecked at 768 and 1024px. The full test suite has four failures in untouched `PanelShell.test.tsx` and `MobilePinnedArticleSection.test.tsx`; baseline status was not established. Full-scale extreme tokens such as `px-96` can intentionally collapse content at narrow widths; no unapproved consumer-specific subset was introduced.

## Scope

Primary SiteHeader files:

- `experiences/abstract/components/SiteHeader/config/registered.ts`
- `experiences/abstract/components/SiteHeader/config/panel.ts`
- `experiences/abstract/components/SiteHeader/SiteHeader.tsx`
- `experiences/abstract/components/SiteHeader/config/buildEffectiveSiteHeaderConfig.ts`

Consumers requiring regression coverage:

- `/abstract`
- `/about`
- `/contact`
- `/posts/[slug]`

Shared prerequisite: the generated global-utility registry, `TailwindTokenValue`, the typed scope factory/`tailwindField()`, `normalizeTailwindToken()`, adoption rules, and architecture guards defined by `PLAN-TAILWIND-TOKEN-CONFIG-FIELDS.md`.

## 1. Reassessment of the original plan

The original plan correctly identified three user-facing problems:

1. SiteHeader uses inconsistent breakpoint names (`desktopX`, `XNarrow`/`XDesktop`, and `XWide` without a base sibling).
2. Several visual capabilities exist at only one or two of the intended Mobile / Tablet / Desktop tiers.
3. Long option sets such as wrapper height are incorrectly rendered as segmented enum rows.

Its implementation strategy was incomplete because it proposed adding more handwritten type unions, normalizer arrays, and panel option arrays before renaming the fields. That would deepen the duplication the Tailwind-token plan exists to remove. It also treated each existing curated array as the source for deciding `enum` versus `select`, although those arrays are repeated implementation details rather than a centralized interaction policy.

The revised plan separates two concerns:

- This plan owns SiteHeader's responsive information architecture, naming, component behavior, and consumer migration.
- `PLAN-TAILWIND-TOKEN-CONFIG-FIELDS.md` owns Tailwind theme resolution, global utility generation, optional reusable exposure policies, literal classes, derived types, normalization, graphical-control policy, and adoption enforcement.

SiteHeader must consume that infrastructure. It must not create a parallel SiteHeader token system.

## 2. Target responsive information architecture

The panel will use four stable tabs:

1. `ALL SIZES`
2. `MOBILE (< 768px)`
3. `TABLET (≥ 768px)`
4. `DESKTOP (≥ 1024px)`

Responsive names use the repository convention:

```text
base:    property
tablet:  propertyWide
desktop: propertyLg
```

The target field families are:

| Concept | Mobile | Tablet ≥768px | Desktop ≥1024px |
| --- | --- | --- | --- |
| Wrapper height | `height` | `heightWide` | `heightLg` |
| Wrapper padding X | `paddingX` | `paddingXWide` | `paddingXLg` |
| Wrapper padding Y | `paddingY` | `paddingYWide` | `paddingYLg` |
| Wrapper margin top | `marginTop` | `marginTopWide` | `marginTopLg` |
| Wrapper margin bottom | `marginBottom` | `marginBottomWide` | `marginBottomLg` |
| Logo width | `logoWidth` | `logoWidthWide` | `logoWidthLg` |
| Header gap | `gap` | `gapWide` | `gapLg` |
| Navigation font size | `navFontSize` | `navFontSizeWide` | `navFontSizeLg` |
| Navigation item gap | `navGap` | `navGapWide` | `navGapLg` |
| Left segment content width | `headerLeftContentWidth` | `headerLeftContentWidthWide` | `headerLeftContentWidthLg` |
| Right segment content width | `headerRightContentWidth` | `headerRightContentWidthWide` | `headerRightContentWidthLg` |
| Left content inner align | `headerLeftContentInnerAlign` | `headerLeftContentInnerAlignWide` | `headerLeftContentInnerAlignLg` |
| Right content inner align | `headerRightContentInnerAlign` | `headerRightContentInnerAlignWide` | `headerRightContentInnerAlignLg` |
| Left segment align | `headerLeftContentAlign` | `headerLeftContentAlignWide` | `headerLeftContentAlignLg` |
| Left segment vertical align | `headerLeftContentVerticalAlign` | `headerLeftContentVerticalAlignWide` | `headerLeftContentVerticalAlignLg` |
| Right segment align | `headerRightContentAlign` | `headerRightContentAlignWide` | `headerRightContentAlignLg` |
| Right segment vertical align | `headerRightContentVerticalAlign` | `headerRightContentVerticalAlignWide` | `headerRightContentVerticalAlignLg` |

Current renames include:

- `desktopHeight` → `heightWide`
- `desktopPaddingX` → `paddingXWide`
- `desktopPaddingY` → `paddingYWide`
- `desktopMarginTop` → `marginTopWide`
- `desktopMarginBottom` → `marginBottomWide`
- `desktopLogoWidth` → `logoWidthWide`
- `desktopGap` → `gapWide`
- `navFontSizeNarrow` → `navFontSize`
- `navFontSizeDesktop` → `navFontSizeWide`
- `mobileNavGap` → `navGap`
- current `navGap` → `navGapWide`

The last pair is a deliberate correction to the old plan: header `gap` and navigation-item `navGap` are different layout concepts and must not be folded together. Their labels and groups should make that distinction visible. `mobileNavItemGap`, which applies only to the opt-in mobile flex-row implementation, remains a separate conditional field.

The four content-width/inner-align families are currently listed in `HEADER_LAYOUT_KEYS_OWNED_ELSEWHERE` and edited from page-owned layout panels. Their names and tiers must be coordinated with those owners; SiteHeader must not silently claim storage ownership merely because it defines the shared schema.

## 3. ALL SIZES versus responsive fields

Fields remain in `ALL SIZES` when one value is intentionally shared across breakpoints: color derivation, motion timing, global typography family/weight, decorative-band behavior, feature toggles, accessibility ratios, and page-ownership flags.

Representative fields include `colorMode`, `fontFamily`, `navFontWeight`, `navUppercase`, `navLetterSpacingEm`, color and contrast fields, intro timing/easing fields, nav-band fields, split-band fields, contact styling, and layout-ownership flags.

Moving the navigation gap family out of `ALL SIZES` resolves the current split vocabulary in which `mobileNavGap` and `navGap` are two halves of one responsive concept. No other field should be tiered merely for symmetry; a new tier is justified only when the final consumer can apply it independently.

Continuous or measured values remain numeric controls rather than being forced into Tailwind token fields:

- `navLetterSpacingEm`
- `navSeparatorHeightMultiplier`
- `navContentGapPx`
- intro timing values
- gradient sampling, opacity, chroma, brightness, and pan values
- contrast ratios and color-surface offsets

These represent timing, ratios, measured geometry, or continuous art-direction controls. Discretizing them onto Tailwind's spacing scale would reduce fidelity without removing meaningful duplication.

## 4. Mapping SiteHeader onto global Tailwind utilities

SiteHeader does not define token membership. Each Tailwind-backed field references the same global utility vocabulary used by Abstract and future panels:

| SiteHeader concept | Global utility |
| --- | --- |
| Wrapper height and divider height | `height` |
| Wrapper/contact horizontal padding | `paddingX` |
| Wrapper/contact vertical padding | `paddingY` |
| Wrapper margin top | `marginTop` |
| Wrapper margin bottom | `marginBottom` |
| Logo/divider width | `width` |
| Header/navigation gaps | `gap` |
| Mobile horizontal item gap | `gapX` |
| Navigation font size | `fontSize` |
| Navigation font weight | `fontWeight` |
| Contact border width | `borderWidth` |
| Segment content max width | `maxWidth` plus documented semantic options |

The resolved Tailwind scale is the default vocabulary. SiteHeader supplies only the selected default, field metadata, and breakpoint. It must not declare `siteHeader.*.tokens`, local option arrays, local class unions, or normalization allowlists.

This intentionally expands some currently curated SiteHeader controls to the complete project scale. Native Select is the expected control for long technical scales. The migration must verify minimum and maximum values through the real panel and final consumer; it must not pre-emptively restore the old subsets under component-specific names.

If the complete scale creates a demonstrated usability or safety failure, SiteHeader may reference an existing reusable design-system exposure policy from the shared Tailwind infrastructure. A new policy requires evidence from rendered verification, a cross-component name and rationale, and central implementation. It cannot be defined inline or named after SiteHeader.

Zero-value coverage comes from the resolved global scale. The same utility automatically generates base, `md`, and `lg` variants, so `px-0`, `md:px-0`, and `lg:px-0` require no separate SiteHeader declarations. Responsive variants have capability parity by construction; their defaults may differ.

### Navigation font-size migration

The current navigation-size options include `text-[9px]`, `text-[10px]`, and `text-[11px]`. These are arbitrary-value utilities, not resolved theme tokens.

If those exact sizes remain required, promote them to globally named design-system font-size tokens under `theme.extend.fontSize`; names must describe the reusable scale rather than the SiteHeader consumer. Migrate existing defaults and consumers to the named classes in the same change and verify computed sizes remain exactly 9px/10px/11px. Do not create `siteHeader`/`nav`-owned token names or silently drop the sub-`xs` sizes.

### Content-width migration

The existing `max-w-[40%]` through `max-w-[100%]` choices are arbitrary-value utilities rather than resolved theme tokens. Before the externally owned width fields enter the referential system, promote those percentages to globally named `theme.extend.maxWidth` tokens and expose them through global `maxWidth`. Preserve `auto` as a documented semantic option whose behavior is to emit no max-width class. Coordinate the change with every consumer of `components/tailwindWidthScale.ts`; do not create `siteHeader.contentWidth` membership.

## 5. SiteHeader authoring model

Types derive from one global utility plus a breakpoint:

```ts
type SiteHeaderPaddingX =
  TailwindTokenValue<'paddingX', 'base'>;
type SiteHeaderPaddingXWide =
  TailwindTokenValue<'paddingX', 'md'>;
type SiteHeaderPaddingXLg =
  TailwindTokenValue<'paddingX', 'lg'>;
```

Bind the shared factory once for the config scope, then name the same global utility at each tier:

```ts
const tailwindHeaderField =
  createTailwindFieldFactory<SiteHeaderConfig>();

tailwindHeaderField('paddingX', {
  breakpoint: 'md',
  key: 'paddingXWide',
  label: 'Tablet horizontal padding',
})
```

Normalization uses that same identity:

```ts
paddingXWide: normalizeTailwindToken(
  'paddingX',
  'md',
  base.paddingXWide,
  D.paddingXWide,
)
```

The SiteHeader files no longer own parallel `PADDING_X`, `DESKTOP_PADDING_X`, `GAPS`, `NAV_FONT_WEIGHTS`, or equivalent Tailwind allowlists. They also no longer write `{ label, value }` arrays, Tailwind string unions, inline exposure policies, or breakpoint-specific token lists for migrated fields.

Alignment, distribution, content ownership, and other non-token choices remain ordinary enum fields. The Tailwind helper is not a replacement for every fixed choice in the panel.

## 6. Graphical-control ownership and policy

The shared Panel resolver remains the sole renderer:

- The shared factory returns `kind: 'select'` or `kind: 'enum'` according to the global utility or optional reusable exposure policy.
- `ConfigFieldControl` renders the existing native Select or SegmentedControl.

SiteHeader call sites cannot supply `kind`, `options`, token membership, or inline policies. This prevents pages and breakpoints from drifting into different vocabularies or controls.

The hard ceiling remains: more than eight options must use Select. Eight is a ceiling, not a recommendation; long technical labels can require Select below eight. Shared `defineConfigScope` validation rejects any enum above the ceiling, and the generated factory chooses the global policy automatically.

## 7. Implementation order

### Phase 1 — shared prerequisite

Implement and validate the first Abstract slice from `PLAN-TAILWIND-TOKEN-CONFIG-FIELDS.md`: resolved-theme global utilities, breakpoint variants, derived types, typed scope factory, normalization, `AGENTS.md` rule, architectural guards, and legacy deprecation path.

### Phase 2 — map SiteHeader fields to global utilities

1. Map each Tailwind-backed field to the global utility in §4; do not add SiteHeader token membership.
2. Add globally named Tailwind font-size/max-width tokens only where current arbitrary values must be preserved.
3. Generate literal base/`md`/`lg` classes from the global utilities.
4. Verify every existing default belongs to its global utility and breakpoint variant.
5. Treat any request for a reduced range as a separate, evidence-based shared exposure-policy decision.

### Phase 3 — migrate existing fields without changing responsive names

Bind `createTailwindFieldFactory<SiteHeaderConfig>()` once. Replace SiteHeader's handwritten unions, allowlists, normalizers, and panel options with global utility types/helpers while retaining current property names temporarily. Remove migrated files from the architecture guard's legacy allowlist and prevent imports of deprecated raw option arrays. This isolates token-infrastructure regressions from breakpoint-schema changes.

Verify all four pages before proceeding.

### Phase 4 — normalize breakpoint names one family at a time

For each responsive family:

1. Rename `desktopX`/`XNarrow`/`XDesktop` to base/`Wide`/`Lg` terminology.
2. Add the missing `Lg` field and default.
3. Update normalization and effective-config resolution.
4. Update `SiteHeader.tsx`, lookup tables, page-owned overrides, tests, and copy targets.
5. Type-check and visually verify all four consumers before moving to the next family.

Do not rename all families in one undifferentiated patch.

### Phase 5 — externally owned layout keys

Coordinate the width/inner-align fields listed in `HEADER_LAYOUT_KEYS_OWNED_ELSEWHERE` with every page-owned panel and default. Update key exclusions and owner field names in the same change. Confirm each page still writes only its own config symbol.

### Phase 6 — panel information architecture

Once names are stable, restructure the panel into the four tabs from §2. Keep semantic groups inside each breakpoint tab in a consistent order: wrapper, branding, navigation, segment alignment. Keep `ALL SIZES` for genuinely shared values.

## 8. Shared-consumer risks

SiteHeader is shared by four pages. Every schema change must update in one coherent family-sized change:

- Config types and defaults
- Normalization
- Effective responsive resolution
- `SiteHeader.tsx` class consumption
- Height/min-height/overlay lookup tables
- Panel fields
- Page-owned override objects
- `HEADER_LAYOUT_KEYS_OWNED_ELSEWHERE`
- Copy/update targets and regression tests

Backward compatibility must be explicit. If persisted runtime config can contain old property names or arbitrary navigation-size classes, add a bounded migration/normalization bridge and a removal condition. Do not support old and new keys indefinitely without a documented sunset.

The Tailwind plan's enforcement layer applies throughout this migration. Materially modified SiteHeader Tailwind fields must use the global utility API; `AGENTS.md` prohibits new local arrays/unions/allowlists; architecture guards must remove each migrated SiteHeader file from their legacy allowance; deprecated option exports remain only for unmigrated consumers.

## 9. Verification contract

### Automated

- Generated utility artifact is current with Tailwind configuration and the global utility manifest.
- Every migrated SiteHeader field references a global utility and declares no token membership or inline exposure policy.
- Base/`md`/`lg` utility variants have identical membership and differ only by responsive prefix.
- Every default belongs to its global utility/policy and breakpoint variant.
- Invalid values fall back correctly.
- No utility/policy combination above eight options resolves to enum, and shared scope validation rejects handwritten oversized enums.
- Migrated SiteHeader files cannot import deprecated raw option arrays and are no longer architecture-guard legacy exceptions.
- Representative guard tests reject SiteHeader-local Tailwind arrays, unions, allowlists, dynamic class construction, and component profiles.
- Config normalization and effective breakpoint resolution select base below 768px, Wide from 768px, and Lg from 1024px.
- All four consumers type-check with no stale property names.
- Panel copy/update metadata still targets the correct owning symbols.

### Rendered UI

Follow the repository's browser/server resource-safety requirements. Use one non-3000 Next server with a private build directory and one browser instance at most.

For `/abstract`, `/about`, `/contact`, and `/posts/[slug]`:

1. Verify viewports immediately below and at 768px and 1024px, plus one representative desktop viewport.
2. Verify the default state and relevant minimum/maximum global utility/policy values through the real panel controls.
3. Confirm generated Select fields render as native selects and any centrally approved enum policy remains readable at minimum panel width.
4. Inspect the final DOM class and computed style at the actual header element; verify the active breakpoint tier, not only panel state.
5. Confirm 9px/10px/11px named font tokens preserve their intended computed sizes.
6. Exercise split-band, page-owned content layout, mobile flex navigation, and other alternate render paths affected by the migrated fields.
7. Capture screenshots and record viewport, route, field, selected token, screenshot path, final class/computed value, and result.
8. Stop every agent-owned browser and server process and report whether any verification process remains.

## 10. Acceptance criteria

The plan is complete when:

- SiteHeader exposes Mobile, Tablet, and Desktop capabilities through consistent base/`Wide`/`Lg` names.
- The four-tab panel makes breakpoint ownership immediately legible.
- Every migrated Tailwind-backed field references a global utility; no SiteHeader token profiles, option arrays, Tailwind unions, validation allowlists, inline policies, or breakpoint-specific token lists remain.
- Zero spacing is available at every relevant tier through the resolved global scale.
- Base/`md`/`lg` variants derive from one global utility/policy and have capability parity.
- The shared Panel resolver builds every Select and SegmentedControl.
- Control choice is centralized per global utility/policy and enforces the eight-option ceiling.
- SiteHeader uses the typed scope factory, and its call sites cannot override generated options or kind.
- Migrated SiteHeader files are covered by the Tailwind architecture guard and cannot add new dependencies on deprecated option exports.
- Any reduced range is an independently reusable, evidence-based shared exposure policy rather than a SiteHeader-owned list.
- Continuous, measured, timing, color, and alignment controls remain represented by the interaction model appropriate to their data.
- Existing defaults and visual values are preserved unless an explicitly documented design change is approved.
- All four consuming routes pass the automated and rendered verification matrix.
