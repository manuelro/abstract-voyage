# Feasibility: fold the CoverFlow-track Timeline slot into the carousel's own drag/pan area

## Problem

`AbstractCoverFlowTimelineSlot` renders as a **sibling** of `<CoverFlow>`, outside its
draggable root (`pages/abstract.tsx`, both the desktop `coverFlowWideColumnStyle` branch
and the tablet full-bleed branch). Framer Motion's `drag="x"` is attached only to
CoverFlow's own root `motion.div` (`experiences/abstract/components/CoverFlow/CoverFlow.tsx`,
`data-cover-flow-geometry`). A pointer-down that starts on the timeline slot's DOM subtree
never bubbles into that root (it isn't an ancestor), so that entire screen region is a dead
zone for swipe/pan navigation — confirmed by inspection, not just visually.

## Verdict: feasible, with one identified (but de-risked) concern

**Recommended approach: make the slot a child of CoverFlow's own drag root**, not a sibling.

### Opt-in scope — this only ever activates when the Timeline slot itself needs it

This is not a standing change to how CoverFlow's drag root behaves — it is only ever active
when an operator has the Timeline-in-CoverFlow-track feature switched on for the tier
currently rendering. Concretely:

- The new `overlayContent` prop on `CoverFlowProps` is optional and `undefined` by default.
  When no caller supplies it, CoverFlow's DOM, its drag root's hit-area, and its
  click/tap/scroll behavior are **byte-identical to today** — nothing about the carousel's
  own default behavior changes for this feature to exist as a capability.
- `pages/abstract.tsx` is the only caller that will ever pass it, and only conditionally:
  the same `coverFlowTimelineSlotActive` boolean that already gates whether
  `AbstractCoverFlowTimelineSlot` renders at all (`config.enabled` AND the current
  breakpoint tier — md/lg — has the slot switched on) also gates whether `overlayContent` is
  supplied. If the operator has the slot **disabled**, or has it enabled for only one tier
  (e.g. desktop but not tablet), the *other* tier's `<CoverFlow>` instance never receives the
  prop at all and keeps rendering exactly as it does today, sibling-based drag area and all.
- Every `positionMode` (`free` / `snapLeft` / `snapRight` / `betweenActiveAndLeftNeighbor`)
  occupies visual space inside the track equally, so all four need the same drag-area fix
  once the slot is on — this is not narrowed further by position mode, only by the
  feature's own top-level `enabled` + per-tier gate.
- Net effect: the only configurations that ever exercise this new code path are ones where
  an operator has explicitly turned the Timeline-in-track feature on for that tier. Every
  other page, every other tier, and this same page with the feature off are unaffected.

### Why this is the right shape, not a workaround

CoverFlow's `CoverFlowProps` already has exactly one precedent for "content that isn't a
card but needs to live inside the draggable root": none today, but the mechanism it needs
(an optional, additive prop) is the same shape the codebase already uses everywhere else in
this component (`renderItem`, `externalDriver`, etc.). Concretely:

1. Add an optional `overlayContent?: ReactNode` (or `renderOverlay?: () => ReactNode` if it
   ever needs live geometry) to `CoverFlowProps` — `undefined` unless the Timeline slot
   feature is on for that tier (see "Opt-in scope" above).
2. Render it, only when supplied, as a plain sibling to the existing cards wrapper, *inside*
   the root `motion.div` (`data-cover-flow-geometry`) but *outside* the
   `transform-style: preserve-3d` cards container — so it sits in the root's own flat 2D
   plane, unaffected by any single card's 3D transform, positioned via its own
   `position: absolute; inset: 0` wrapper (matching how the slot already positions itself
   today). When not supplied, this render branch doesn't execute at all.
3. `pages/abstract.tsx` passes `<AbstractCoverFlowTimelineSlot .../>` through this prop for
   the desktop and tablet instances (replacing today's external-sibling placement) precisely
   when `coverFlowTimelineSlotActive` is true for that instance's own tier — never
   unconditionally.
4. `AbstractCoverFlowTimelineSlot`'s own `betweenActiveAndLeftNeighbor` measurement effect
   changes `track` from "the wideColumn/100vw wrapper div" to "CoverFlow's own root" —
   `querySelector('[data-cover-flow-active="true"]')` still finds the same card either way;
   only the coordinate frame's exact width needs empirical confirmation (CoverFlow already
   renders `w-full h-full`, so the two should be pixel-identical in practice).

This is additive and backward-compatible: every existing `<CoverFlow>` caller that doesn't
pass the new prop — which is every caller today, and this page's own instances whenever the
Timeline slot feature is off — is byte-identical to today.

### The one real risk, and why it's already de-risked in this exact codebase

Nesting interactive elements (links, buttons) inside a Framer Motion `drag` ancestor is a
known general pitfall — Framer's drag gesture can, in some setups, swallow native `onClick`
on descendants because of how it disambiguates a tap from a drag.

This is **not theoretical here** — it's already a solved, shipped case in this same
component: the active card's own `<a href>` (the "Read article" link, `Card.tsx` →
`AbstractJournalLabHueFadeCard`) and the per-card `onClick={() => onCardClick(item, index)}`
(`CoverFlow.tsx` line ~1114, native `onClick`, not Framer's `onTap`) are *already* nested
directly inside this exact `drag="x"` root today, and both already work reliably in
production. The Timeline's own row buttons (`AboutTimelineRow.tsx`, plain
`<button type="button">`) are the same shape of interactive element — no reason to expect
different behavior once nested one level over.

### Scroll capability

CoverFlow sets `touchAction: externallyControlled ? 'pan-y' : undefined` on its root; for
the desktop/tablet instance (`externallyControlled` is false — it uses native `drag="x"`,
not the `externalDriver` path mobile uses), Framer Motion's own default behavior for
`drag="x"` already permits vertical (`pan-y`) touch scrolling to pass through untouched —
this is exactly what already lets a user vertically scroll the page while their finger is
over a card today. Nesting the timeline slot inside the same root inherits the same
touch-action handling automatically, for both page-level scroll and any future internal
`overflow-y` region the Timeline content might need.

## What does NOT need to change

- `AbstractCoverFlowTimelineSlot`'s own positioning logic (free / snap / gap-tracking),
  tilt/lift gating, and border-radius handling are unaffected — only *where in the DOM tree*
  it mounts changes.
- `AboutTimeline`/`AboutTimelineRow` need no changes — their plain native `<button>`/`<a>`
  elements are exactly the shape already proven to coexist with this drag root.
- Mobile is unaffected — this only applies to the `isCoverFlowSplitTier` (desktop) and
  tablet CoverFlow instances that already host the opt-in slot.
- Every other `<CoverFlow>` caller, and this page's own instances whenever the Timeline slot
  feature is off (or off for one tier), is unaffected — see "Opt-in scope" above.

## Suggested verification once implemented

- With the Timeline slot feature **off**: both CoverFlow instances behave exactly as before
  (no `overlayContent`, sibling-based layout, unchanged drag hit-area) — a direct regression
  check that the opt-in gating actually works.
- With it **on for only one tier** (e.g. desktop only): confirm the other tier's instance is
  still unaffected.
- With it **on**: real drag from the timeline slot's own background (not a link) moves the
  carousel.
- Clicking a Timeline row still activates that slide (existing `onSelect` unaffected).
- Clicking "Read article" on the active card still navigates (regression check on the
  existing, already-working precedent this plan leans on).
- Vertical page scroll still works with a touch/trackpad gesture starting over the slot.
- `betweenActiveAndLeftNeighbor` mode's measured gap position is unchanged now that `track`
  resolves to CoverFlow's own root instead of the external wrapper div.
- Each `positionMode` (free / snapLeft / snapRight / betweenActiveAndLeftNeighbor) still
  drags correctly from the slot's own area, confirming the fix isn't narrower than the full
  feature.

## Status

Assessment only — no code changed. Ready to implement on confirmation.
