# Plan — Abstract tablet Hero / Timeline / CoverFlow ordering

## Status

Implemented on 2026-09-24. The tablet-only controls and composition are in
place; see the verification notes in the implementation handoff.

## Objective

At the tablet breakpoint only (`>=768px` and `<1024px`), let the Abstract
page compose its Hero and timeline as a horizontal, bottom-aligned pair, and
let an operator place that pair either before or after the full-width
CoverFlow carousel.

The configuration must also allow either member of the horizontal pair to
appear first:

```text
Hero     | Timeline
Timeline | Hero
```

The two independent order decisions create all intended tablet compositions:

```text
Narrow first                         Wide first

[ Hero     | Timeline ]              [ CoverFlow ]
[ CoverFlow ]                        [ Hero     | Timeline ]

[ Timeline | Hero     ]              [ CoverFlow ]
[ CoverFlow ]                        [ Timeline | Hero     ]
```

## Strict scope boundary

This is a **tablet-only** enhancement.

- Mobile (`<768px`) remains the existing Hero followed by
  `MobilePinnedArticleSection`, including its short and expanded timeline
  list.
- Desktop (`>=1024px`) remains the existing split-column CoverFlow alongside
  the narrow-column Hero/timeline composition.
- No mobile or desktop panel control, default, markup order, or rendering
  branch changes as part of this work, except for compatibility defaults
  required by shared config normalization.

## Current-state assessment

`pages/abstract.config.ts` intentionally sets
`narrowColumnWidthTierMd: 'stacked'`. At tablet widths, `pages/abstract.tsx`
therefore takes the same broad rendering branch as mobile:

```text
Narrow column: Hero
Wide column:   MobilePinnedArticleSection(CoverFlow + timeline list)
```

The timeline is owned by the mobile-pinned section at this tier, so it cannot
be placed beside the Hero with a CSS order change alone. In the desktop split
branch, the timeline is instead supplied as `AbstractNarrowColumnStack`'s
logical bottom region. This plan gives tablet that same logical ownership
without adopting the desktop split grid.

Existing capabilities to extend rather than duplicate:

- `PolymorphicLayoutConfig.stackedColumnOrder` and
  `SplitColumnLayout.tsx` already order the outer narrow/wide columns while
  stacked.
- `AbstractNarrowColumnStack` already composes logical Hero (`top`) and
  timeline (`bottom`) regions with independently configurable alignment.
- `MobilePinnedArticleSection` already owns the full-width carousel and its
  active-index interaction. Tablet needs a carousel-only presentation, not a
  second carousel implementation.

## Design decisions

### 1. Two independent ordering levels

Outer order answers “does CoverFlow precede the Hero/timeline pair?”

```text
narrowFirst -> Hero/timeline pair, then CoverFlow
wideFirst   -> CoverFlow, then Hero/timeline pair
```

Inner order answers “which member is first in the horizontal pair?”

```text
heroFirst     -> Hero left, Timeline right
timelineFirst -> Timeline left, Hero right
```

These controls must not be conflated. One changes page-region sequence; the
other changes the pair’s local reading order.

### 2. Tablet horizontal pair is bottom-aligned

At tablet, `AbstractNarrowColumnStack` will use a two-column grid with a
single intrinsic-height row. Both region wrappers align to block end. This
aligns the lower edge of a short Hero with the lower edge of the timeline,
without imposing a viewport-height floor on either.

### 3. Preserve semantic DOM order

The selected visual order must have a matching DOM order at tablet. Do not
use CSS `order` to reverse Hero and timeline while leaving keyboard and
screen-reader order unchanged. This differs from the existing outer stacked
column order, whose accessibility caveat is already documented and must not
be extended to the new pair.

### 4. Tablet owns the timeline outside MobilePinnedArticleSection

At tablet only, render `AboutTimeline` once as the narrow stack’s logical
timeline region. `MobilePinnedArticleSection` renders the carousel plane
only. This preserves one active-index source of truth and prevents duplicate
timeline landmarks, tab controls, and selectable rows.

## Data-model changes

### `PolymorphicLayoutConfig`

Add tablet-only outer order support:

```ts
stackedColumnOrderWide: 'narrowFirst' | 'wideFirst';
```

Do not add an Lg field for this plan. Desktop is split in Abstract and out of
scope. The existing base `stackedColumnOrder` remains the mobile value.

Normalization rule: missing persisted `stackedColumnOrderWide` falls back to
the base `stackedColumnOrder`, preserving prior behavior for every existing
page.

`SplitColumnLayout.tsx` must resolve base and `md` order classes so that:

- Base applies `order-first` only for base `wideFirst`.
- At `md`, `wideFirst` applies `md:order-first`; `narrowFirst` explicitly
  restores `md:order-none`.
- If the grid genuinely splits at `md`, it always applies `md:order-none`,
  leaving physical placement exclusively to `wideColumnSide`.
- The existing `lg` split behavior remains unchanged.

### `AbstractNarrowColumnStackConfig`

Add tablet-specific, page-owned controls:

```ts
tabletFlow: 'vertical' | 'horizontal';
tabletRegionOrder: 'heroFirst' | 'timelineFirst';
tabletHeroWeight: number;
tabletTimelineWeight: number;
tabletHeroVerticalAlign: 'start' | 'center' | 'end';
tabletTimelineVerticalAlign: 'start' | 'center' | 'end';
```

The existing base `top`/`bottom` values remain the mobile and desktop
contracts. Avoid adding generic Lg controls: desktop is explicitly out of
scope. Use logical Hero/timeline names for the new fields because this
component is page-owned and those are its actual fixed slots.

Default tablet values:

```ts
tabletFlow: 'horizontal',
tabletRegionOrder: 'heroFirst',
tabletHeroWeight: 1,
tabletTimelineWeight: 1,
tabletHeroVerticalAlign: 'end',
tabletTimelineVerticalAlign: 'end',
```

## Rendering changes

### `AbstractNarrowColumnStack` in `pages/abstract.tsx`

Use the existing breakpoint hook or the page’s already-resolved breakpoint
tier to select the tablet branch.

- Mobile and desktop retain the current two-row grid exactly.
- Tablet `horizontal` flow uses one grid row and two weighted columns.
- Region ordering changes JSX/DOM placement, not CSS visual order.
- Each region remains `min-w-0`; the timeline gets a bounded width so long
  labels wrap rather than cause horizontal overflow.
- Bottom alignment is applied at the region wrapper, not by adding a
  hard-coded height to the Hero or timeline.

### Tablet placement in `pages/abstract.tsx`

Introduce an explicit three-way placement predicate:

```text
mobile:  timeline remains inside MobilePinnedArticleSection
tablet:  timeline is the AbstractNarrowColumnStack second logical region
desktop: existing AbstractNarrowColumnStack bottom region
```

At tablet, continue rendering the full-width CoverFlow through
`MobilePinnedArticleSection`, but provide a small component capability such
as `listPresentation: 'visible' | 'none'`. With `'none'`, it must omit both
the short list and expanded-list affordance/overlay while retaining carousel
navigation, active-index callbacks, and its existing full-bleed measurement
plane.

Do not fork `MobilePinnedArticleSection` or reimplement CoverFlow.

## Panel design

### Polymorphic Layout → Tablet tab

Add one small enum:

```text
Tablet stacked order
Narrow first — Hero/timeline pair before CoverFlow
Wide first   — CoverFlow before Hero/timeline pair
```

### Narrow column stack → Tablet tab

Add a dedicated Tablet tab with:

- Flow: Vertical / Horizontal
- Horizontal pair order: Hero first / Timeline first
- Hero relative width
- Timeline relative width
- Hero vertical alignment
- Timeline vertical alignment

These are small mutually exclusive choice sets and may use segmented controls
where they remain within the repository’s eight-option ceiling. Weight fields
remain numeric controls.

Do not surface tablet controls in the Mobile or Desktop tabs. The panel must
make the scope boundary obvious in labels and descriptions.

## Implementation sequence

1. Add and normalize `stackedColumnOrderWide`; update shared layout types,
   panel registration, and `SplitColumnLayout` class resolution with focused
   tests for base/md split and stacked combinations.
2. Add and normalize the tablet-only narrow-stack fields in
   `pages/abstract.config.ts`; expose them in a Tablet-only Narrow column
   stack panel tab.
3. Refactor `AbstractNarrowColumnStack` to render the tablet horizontal row
   while leaving its mobile/desktop markup and layout results unchanged.
4. Add the minimal carousel-only capability to `MobilePinnedArticleSection`.
5. Move the tablet timeline render into the narrow stack and retain the
   existing shared active-index callbacks.
6. Set Abstract’s tablet defaults to Hero-first, horizontal, bottom-aligned,
   narrow-first outer ordering.
7. Add targeted unit tests and browser checks before declaring completion.

## Verification matrix

Use the real Abstract settings panel and capture screenshots at 768px, a
portrait tablet width (900px), 1023px, 767px, and 1024px.

At tablet, verify all four order combinations:

| Outer order | Pair order | Expected sequence |
|---|---|---|
| Narrow first | Hero first | Hero → Timeline, then CoverFlow |
| Narrow first | Timeline first | Timeline → Hero, then CoverFlow |
| Wide first | Hero first | CoverFlow, then Hero → Timeline |
| Wide first | Timeline first | CoverFlow, then Timeline → Hero |

For each tablet state verify:

- Hero and timeline lower edges align in horizontal flow.
- Timeline selection changes the active CoverFlow card and carousel
  navigation updates the timeline state.
- Only one timeline/tablist exists in the DOM.
- No horizontal overflow, clipped text, or viewport-height dead space.
- The static tablet header and gradient remain visible.

At 767px verify the unchanged mobile pinned list and expand behavior. At
1024px verify the unchanged desktop split layout, including its existing
Hero/timeline stack and CoverFlow geometry.
