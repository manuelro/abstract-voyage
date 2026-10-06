# Plan — CoverFlow configurable active-card landing position

## Status

Implemented (2026-09-25). `CoverFlow.config.ts`, `CoverFlow.tsx`, and
`CoverFlow.panel.ts` updated per this plan exactly — one shared
`activeCardLandingXPercent*` knob plus `activeCardLandingMode*`, both tiered
mobile/`Md`/`Lg`. `CoverFlow.config.test.ts` covers per-tier normalization
and the three-way `x` formula (center/anchorShift/activeOnly) in isolation.
Rendered verification (Playwright, 900×1400/tablet tier): default state is
pixel-identical to before (`center`, active card at exactly 50% viewport
center); `anchorShift` at 75% moves the active card right as expected;
`activeOnly` at any percent leaves the immediate neighbor's left edge at the
exact same pixel position as the untouched default
(`871.908...px` in both cases) — the "only the active card moves" guarantee
holds live, not just in the formula. `pages/carousel-lab.tsx` and
`CoverFlowLab.tsx` untouched, defaults inert as planned.

## Objective

Today `CoverFlow` always lands the active card at the exact horizontal
center of its container (`x = 0` in transform space, which the component's
own `flex items-center justify-center` wrapper renders at the container's
literal midpoint). Make that landing point configurable via **one knob**,
independently tunable per breakpoint tier:

```ts
/** 0-100, percent of the container's own measured width. Where the active
 * card lands, expressed the same way an operator would describe it in
 * plain language — "50% across" is today's exact center. Both landing
 * modes below read this SAME value; the mode only decides HOW the other
 * cards react to it, not where the active card itself ends up. */
activeCardLandingXPercent: number;
```

`activeCardLandingMode` decides what happens to every OTHER card while the
active card moves to that X percent:

- **`'anchorShift'`** — re-anchor the whole cascade. Every card shifts by
  the same constant amount the active card needed to reach
  `activeCardLandingXPercent`, so today's spacing rhythm
  (`centerGap`/`stackSpacing`) is preserved exactly, just recentered on the
  new anchor. Freed space on the side the anchor moved away from
  automatically reveals more neighbor cards there, since `CoverFlow` already
  renders every item unconditionally and relies on the container's
  `overflow-hidden` edge to clip whatever doesn't fit — no new rendering
  logic required, purely a side effect of the shared constant shifting.
- **`'activeOnly'`** — offset only the active card. Every other card's
  position stays byte-identical to today. Only the active card — and the
  smooth transition into/out of that slot — lands at
  `activeCardLandingXPercent` instead of center. The immediate neighbors
  (`|pos| === 1`) are unaffected; the visual result is an intentionally
  asymmetric gap on one side of the active card.
- **`'center'`** (default, every tier) — `activeCardLandingXPercent` is
  ignored/inert; byte-identical to today regardless of its value. This is
  the safety net that makes the whole feature opt-in.

Both the mode AND the percent are independently configurable per breakpoint
tier — e.g. mobile could stay `'center'` (today's behavior untouched), while
tablet uses `'anchorShift'` at 65% to reveal more of the stack in a narrow
strip, and desktop uses `'activeOnly'` at 40% for a subtler offset. No tier
inherits from another; each is normalized against its own default
independently, the same rule this config already applies to every other
per-tier field (a missing/invalid tablet value falls back to that tier's own
default, never to the mobile value).

One field, one mental model ("where does the active card land, as % of
width"); the mode is purely "how much of the rest of the stack follows it
there." Both modes are additive, confined to `CoverFlow`'s own
geometry/transform layer — no change is needed to drag, wheel, click-to-snap,
the external-driver contract, hover-safety sizing, or any other consumer.

## Current mechanism (why this is feasible)

- `CoverFlow.tsx`'s root `motion.div` is `flex items-center justify-center`;
  every card is absolutely positioned (`top-1/2 left-1/2` plus negative
  half-size margins) and then translated by its own `x`/`z`/`rotateY` motion
  values. `x = 0` therefore always renders at the container's literal
  horizontal center — there is no existing anchor concept to work around,
  only an implicit one baked into the CSS centering.
- Every card's `x` comes from one pure function of `pos = index - scrollX`
  (`CoverFlowItemInner`'s own `useTransform`):
  ```ts
  const pos = index - value;
  const absPos = Math.abs(pos);
  if (absPos < 1) return pos * centerGap;
  return pos < 0
    ? -centerGap - (absPos - 1) * stackSpacing
    : centerGap + (absPos - 1) * stackSpacing;
  ```
  Both modes derive from the SAME resolved `anchorOffsetPx` (see Geometry
  below) and only differ in where that constant gets applied: uniformly
  (`'anchorShift'`) or tapered onto just the active transition
  (`'activeOnly'`).
- `useCoverFlowGeometry` already resolves `tier` via `useBreakpointTier()`
  and switches several fields on it today (`cardWidthRatio`/
  `cardDistanceRatio`/`maxCardHeightPx`, each with an unsuffixed/`Md`/`Lg`
  trio) — the new fields follow that exact same per-render tier switch, not
  a new mechanism.
- `z` (depth) and `rotateY` are computed independently of `x` and need no
  change for either mode.
- Drag (`onDrag`/`onDragEnd`), wheel handling, click-to-snap (`jumpToIndex`),
  the rubber-band overscroll curve, and the external-driver contract
  (`CoverFlowExternalDriver`, `onGeometryChange` publishing
  `activeCardWidthPx`/`horizontalStepPx`) all operate purely on the abstract
  `pos`/`positionX` value — none of them read or assume a literal screen
  x-coordinate, so none require changes.
- `items.map(...)` already renders every item unconditionally; visibility is
  purely a function of the container's `overflow-hidden` clip versus each
  card's computed `x`. `'anchorShift'`'s "show more cards where space was
  freed" is therefore a side effect of the anchor moving, not new logic.
- `perspectiveOriginXPercent`/`perspectiveOriginYPercent` already exist as
  independent config (CSS `perspective-origin`, purely a 3D vanishing-point
  effect, one flat value across every tier) and are NOT coupled to
  translateX today. Neither mode strictly requires touching them — see Open
  Questions.
- Only three files construct a real `<CoverFlow>`: `pages/abstract.tsx`
  (the only production consumer), `CoverFlowLab.tsx`, and
  `pages/carousel-lab.tsx` (both explicitly frozen spike/reference code per
  `CoverFlow.tsx`'s own header comment). Neither frozen file passes the new
  fields, so both stay byte-identical regardless of default value.

## Data model (`CoverFlow.config.ts`)

```ts
/** Opt-in, default 'center' at every tier (byte-identical to today —
 * the matching activeCardLandingXPercent* is inert while its own tier is
 * 'center'). Decides what the REST of the stack does while the active card
 * moves to this tier's activeCardLandingXPercent*: 'anchorShift' carries
 * every card along by the same constant (today's spacing rhythm preserved,
 * more neighbors revealed on the freed side); 'activeOnly' moves just the
 * active card, tapering to zero by the immediate-neighbor slot so every
 * other card's rest position is untouched. */
activeCardLandingMode: 'center' | 'anchorShift' | 'activeOnly';
/** Tablet — >= 768px. Independent of the base value above; a missing/
 * invalid persisted value falls back to THIS tier's own default, never to
 * the mobile value — same rule every other tiered field in this config
 * already follows. */
activeCardLandingModeMd: 'center' | 'anchorShift' | 'activeOnly';
/** Desktop — >= 1024px. Same independence as activeCardLandingModeMd. */
activeCardLandingModeLg: 'center' | 'anchorShift' | 'activeOnly';

/** 0-100, percent of the container's own measured width — where the active
 * card lands, mobile tier. 50 (default) is today's exact center. Only has
 * an effect while activeCardLandingMode (this tier) is not 'center'. */
activeCardLandingXPercent: number;
/** Tablet — >= 768px. Same 0-100/50-default shape, independently tunable,
 * gated by activeCardLandingModeMd instead of the base mode. */
activeCardLandingXPercentMd: number;
/** Desktop — >= 1024px. Same shape, gated by activeCardLandingModeLg. */
activeCardLandingXPercentLg: number;
```

This mirrors the exact unsuffixed/`Md`/`Lg` trio shape
`cardWidthRatio`/`cardDistanceRatio`/`maxCardHeightPx` already use in this
same file — no new tiering convention introduced.

## Geometry (`CoverFlow.tsx`)

In `useCoverFlowGeometry`, alongside the existing `tier`-switched
`cardWidthRatio`/`cardDistanceRatio`/`maxCardHeightPx` resolution, add the
same switch for the two new fields:

```ts
const landingMode = tier === 'lg'
  ? config.activeCardLandingModeLg
  : tier === 'md'
    ? config.activeCardLandingModeMd
    : config.activeCardLandingMode;
const landingXPercent = tier === 'lg'
  ? config.activeCardLandingXPercentLg
  : tier === 'md'
    ? config.activeCardLandingXPercentMd
    : config.activeCardLandingXPercent;

const anchorOffsetPx = landingMode !== 'center' && containerWidthPx
  ? (containerWidthPx * (landingXPercent - 50)) / 100
  : 0;
```

Return `anchorOffsetPx` and `landingMode` from the hook alongside the
existing geometry tuple, thread both down to `CoverFlowItemInner`, and
branch the `x` `useTransform` on the mode:

```ts
const x = useTransform(scrollX, (value) => {
  const pos = index - value;
  const absPos = Math.abs(pos);
  const base = absPos < 1
    ? pos * centerGap
    : pos < 0 ? -centerGap - (absPos - 1) * stackSpacing : centerGap + (absPos - 1) * stackSpacing;

  if (landingMode === 'anchorShift') return base + anchorOffsetPx;
  if (landingMode === 'activeOnly' && absPos < 1) {
    const taper = 1 - absPos; // 1 exactly at pos === 0, 0 at |pos| === 1
    return base + anchorOffsetPx * taper;
  }
  return base; // 'center', or 'activeOnly' outside the transition zone
});
```

The `'activeOnly'` branch only ever touches cards inside the existing
`absPos < 1` window (the active card and its live transition), so every
card at `|pos| >= 1` is provably byte-identical to today regardless of
`activeCardLandingXPercent*` — this is what makes "the only card that lands
in a different spot is the active card" true, not just visually
approximate.

Because `landingMode`/`anchorOffsetPx` are already resolved per-tier before
reaching this formula, a tablet-vs-desktop difference falls out for free —
`CoverFlowItemInner` itself doesn't need to know which tier is active, only
the two already-resolved values.

No other transform, drag math, or external-driver value needs to change —
`anchorOffsetPx` is a pure rendering-time constant, not part of the
`pos`/`positionX` model those systems share.

## Consequence an operator should expect from `'activeOnly'`

Because only the active card's own landing point moves while neighbor rest
positions stay fixed, the gap between the active card and whichever neighbor
it moved toward shrinks (or overlaps, at extreme percentages) while the gap
on the opposite side grows by the same amount. This asymmetry is the
intended, literal reading of "the only card that lands in a different spot
is the active card" — not a bug to fix, but worth stating explicitly since
it's the one visible tradeoff against `'anchorShift'`'s evenly-preserved
spacing.

## Panel (`CoverFlow.panel.ts`)

Each of the existing MOBILE / TABLET (≥768px) / DESKTOP (≥1024px) tier tabs
gets two new fields, alongside that tier's existing
`cardDistanceRatio*`/`cardWidthRatio*`/`maxCardHeightPx*` fields:

- `enum` field for that tier's `activeCardLandingMode[Md|Lg]` — options
  CENTER / ANCHOR SHIFT / ACTIVE ONLY (3 options, well under the 8-option
  enum ceiling). Same `visibleWhen`-gated-sibling pattern this file already
  uses for `settleMotionCurve`'s own `'spring' | 'gaussian'` branch.
- `number` field for that tier's `activeCardLandingXPercent[Md|Lg]` (min 0,
  max 100, step 1, unit `%`), `visibleWhen: config => config.activeCardLandingMode[Md|Lg] !== 'center'`.

## Implementation sequence

1. Add `activeCardLandingMode`/`Md`/`Lg` and
   `activeCardLandingXPercent`/`Md`/`Lg` to `CoverFlowConfig`, defaults
   (`'center'` / `50` at every tier), and `normalizeCoverFlowConfig`
   clamps/token validation (each tier validated independently against its
   own default, matching every other tiered field's normalization).
2. Resolve `landingMode`/`anchorOffsetPx` inside `useCoverFlowGeometry`
   using the existing `tier`-switch pattern, and return them from that hook
   alongside the existing geometry tuple.
3. Thread both down to `CoverFlowItemInner` as new props and update the `x`
   `useTransform` per the three-way branch above.
4. Add the panel fields to `CoverFlow.panel.ts` under each tier's own tab
   (not a shared "all sizes" group), gated with `visibleWhen` on that same
   tier's mode field.
5. No changes required to: drag/wheel/click-to-snap handlers, rubber-band
   overscroll, `CoverFlowExternalDriver`/`onGeometryChange`,
   `resolveMaxHoverSafeItemHeightPx`, `CoverFlowLab.tsx`, or
   `pages/carousel-lab.tsx`.
6. Targeted unit tests: `normalizeCoverFlowConfig` clamps for all six new
   fields, independently per tier (an invalid tablet value falls back to
   the tablet default, not the mobile value); a geometry-level test
   asserting the `x` formula collapses to today's exact formula when a
   tier's mode is `'center'` (any percent value) and when that tier's
   percent is `50` (any mode) — both should be no-ops per tier — plus a
   test that `'activeOnly'` leaves `|pos| >= 1` byte-identical to the base
   formula for any percent value, independently checked at each tier.
7. Rendered verification (per this repo's own resource-safety rules for
   config-panel changes): confirm visually, at each breakpoint tier
   independently, that `'center'` is pixel-identical to today, that
   `'anchorShift'` reveals additional left-side cards as that tier's
   percent moves above 50 (and vice versa below 50), and that
   `'activeOnly'` leaves the first-neighbor cards' resting position
   unchanged while the active card's own landing point moves — and that
   changing one tier's mode/percent has zero effect on the other two tiers.

## Open questions (need a decision before implementation)

1. **Should `perspectiveOriginXPercent` auto-follow
   `activeCardLandingXPercent*` in `'anchorShift'` mode?** Left decoupled in
   this plan (an operator can already set `perspectiveOriginXPercent`
   independently, and it remains one flat value across every tier, unlike
   the new fields) — but the 3D vanishing point staying at literal center
   while the cards visually anchor elsewhere may look subtly "wrong"
   (foreshortening still keyed to the old center). Worth a live visual
   check before deciding whether `'anchorShift'` should nudge that field's
   default alongside it (which would also raise whether
   `perspectiveOriginXPercent` itself needs to become tiered), or just
   document the relationship for an operator to dial in by hand.
   `'activeOnly'` has no equivalent concern since the overall cascade never
   moves.
