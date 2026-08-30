# Bug: dragging the open config panel then reloading leaves the collapsed launcher permanently off-screen

## Status
Confirmed live, reproducible, not fixed. This is why the draggable-panel feature (`PLAN-DRAGGABLE-CONFIG-PANEL.md`) was held back from `main` rather than merged.

## Severity
High — the settings launcher becomes completely unreachable (renders outside the viewport) with no in-app way to recover it. Only fix from the user's side is manually clearing the `panel-shell-position` key from `localStorage` via devtools.

## Repro steps
1. Load any page with the panel (e.g. `/about`).
2. Click "SETTINGS" to open the panel.
3. Drag the panel by its header (`.panelHeader`) a meaningful distance — e.g. up and to the left by ~300px.
4. Release. The open panel settles at the new position correctly.
5. Reload the page.
6. The collapsed "SETTINGS" launcher is rendered, but its bounding box is far outside the viewport (observed: `y ≈ 1146` in a 900px-tall viewport). It cannot be clicked, scrolled to, or otherwise reached.

## Confirmed via direct measurement
```
storedPosition (localStorage['panel-shell-position']): {"x":-300,"y":298}
settingsVisible (element count): 1   // present in DOM
launcher rect after reload: { x: 976, y: 1146, w: 112, h: 40 }   // fully below the fold
```

## Root cause

`components/Panel/usePanelDrag.ts`'s `clampOffset(offset, frame, strict)` computes a clamp for a persisted `{x, y}` delta using `frame.getBoundingClientRect()` of *whichever DOM node is currently mounted as `.panelFrame`* — i.e., the actual box present at the moment the drag ends.

- While the panel is **open**, that box is the full expanded panel (~336×852px in the repro above).
- While the panel is **collapsed**, `.panelFrame` is instead the small launcher pill (~112×40px), anchored at a *different* default `right`/`bottom` position than the open panel's own default anchor.

The same persisted `{x, y}` offset is applied unconditionally to both states (see `usePanelDrag.ts`'s own doc comment: "the frame keeps its existing CSS `right`/`bottom` anchor... dragging applies a `transform: translate3d()` delta on top of that anchor"). But the clamp that decided whether `{x, y}` was "safe" was computed against the *open panel's* geometry and anchor point, not the collapsed launcher's. A delta that keeps an 852px-tall box on-screen can trivially push a 40px-tall box, anchored at a different point, completely off-screen once the same delta is reapplied against it.

This is the same *class* of bug already partially fixed in `PLAN-DRAGGABLE-CONFIG-PANEL.md`'s "Round 2" (`usePanelVerticalAnchor.ts`'s `topPx`/live-offset double-counting) and "Round 3"/"Round 4" (`maxHeightPx` budget not accounting for drag position / window resize) — a value computed/clamped for one render state silently being reused, unadjusted, in a different state with different geometry. Those rounds fixed the *vertical-anchor budget* mismatch between open/collapsed states; this is the same mismatch, but in `usePanelDrag.ts`'s own **position clamp**, which those rounds didn't touch.

## Where to look

- `components/Panel/usePanelDrag.ts`:
  - `clampOffset()` (~line 72) — the function that needs state-awareness.
  - Its two call sites (~line 252, ~line 282) — both call `clampOffset(persisted/offset, frameRef.current, isOpenRef.current)`. `isOpenRef.current` is already threaded through for the *strict* (open-panel-only) top/bottom behavior — the missing piece is using it (or an equivalent) to select which box's default anchor/size the clamp should reason about, not just whether the clamp is strict.
  - The mount-time restore path (reads persisted position, applies it as initial `transform`) is likely the actual site that needs a **second**, launcher-specific clamp pass whenever the shell mounts collapsed — since that's precisely when a delta computed while open gets reapplied against a completely different box.

## Suggested direction (not implemented, your call)

Two independent boxes (`.panelFrame` open vs. `.panelFrame` collapsed) share one persisted offset today. Options, roughly in order of how much they preserve the existing "one shared delta" model:

1. **Clamp on read, per current state** — every time the offset is *applied* (not just when it's captured on release), re-clamp it against whichever box is actually mounted right now (`strict` when open, non-strict when collapsed) before using it as the `transform`. This keeps one stored value but stops trusting that a clamp computed for one state stays valid for the other.
2. **Store two offsets** — one for collapsed, one for open — since they're genuinely different boxes with different anchors. More storage/API surface, but sidesteps the "one delta, two meanings" mismatch entirely.
3. Whatever `usePanelVerticalAnchor.ts`'s own Round 3/4 fixes did for the *height budget* problem (recompute live, off the box that's actually mounted, not a frozen snapshot) is the same shape of fix needed here for *position*.

## Also worth double-checking once fixed
- The reverse direction: drag the *collapsed launcher* somewhere, then open the panel — does the open panel's own position (inheriting the launcher's delta) ever clip off-screen the same way? `usePanelVerticalAnchor.ts` already handles the vertical/height side of this case; worth confirming the horizontal position and the non-strict→strict clamp transition are both safe too.
- Whatever fix is chosen, re-run the exact repro above (drag open panel → reload → confirm launcher is clickable) as the actual regression test — this is an interaction bug, not something a screenshot at rest will catch.
