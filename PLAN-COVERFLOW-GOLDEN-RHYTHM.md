# Golden-ratio rhythm for the desktop CoverFlow

## Feasibility and intent

A literal Fibonacci size sequence (1, 1, 2, 3, 5...) or a full golden-ratio reduction at every card step makes the distant cards too small for this six-card composition. A fractional power of the golden ratio gives the same geometric rhythm with an adjustable rate. Card proportions must remain fixed; apparent size must still come from camera depth rather than CSS `scaleX` or independent width/height changes.

This is the first step toward the separate responsive collision-fit plan. Golden proportions can make the composition more coherent, but cannot guarantee that every card fits in every desktop runway. If projected card widths plus minimum gaps exceed the available width, a later visibility/fit policy is still necessary.

## Implementation sequence

1. Save this plan before changing rendering code.
2. Add a desktop full-arch config switch, a golden size step, and a golden spacing step to `CoverFlow.config.ts` and the real config panel. Keep the original path available when the switch is off. Normalize all values.
3. Keep the existing full-arch depth function as its shape source. Convert its depth in card-width units into a target apparent scale `phi ^ (-sizeStep * depthUnits)`; invert the camera projection to obtain the physical Z. This retains a face-on card and the B depth hump while making the apparent size progression follow golden powers. Focus remains scale 1 and the exit path keeps its current behavior.
4. For the waiting cards, compute projected widths and distribute any free screen-space width between their edges with golden weights. The near intervals get a larger share, the far intervals a smaller share, but the actual widths are included before gaps are allocated. Preserve the active/first and far-edge anchors as configured. If there is insufficient free width, use the existing endpoint distribution rather than producing a reversed or discontinuous path; record that the later collision-fit policy is needed.
5. Interpolate the resulting screen-space centers continuously for dragging; convert each center back to world X through the same camera projection. The Motion Path Preview already calls the same pose resolver, so it must show the exact changed path.
6. Inspect the real page at desktop widths, operate the new panel controls at off/min/max/default settings, capture screenshots, and inspect final card bounds and computed transforms. Check both desktop render branches and restore the original layout when the switch is off.

## Configuration and acceptance

- **Golden card rhythm:** on/off, desktop full arch only.
- **Golden size step:** fractional exponent per card-width of authored depth. Zero makes waiting cards the same apparent size; larger values increase recession.
- **Golden spacing step:** exponent for the near-to-far edge-gap ratio. Zero makes available edge gaps equal; larger values make near intervals more open and far intervals more compact.
- Default settings should show a restrained, legible arch; no horizontal stretch, card rotation, or aspect-ratio change. Changing a knob through the panel must visibly change card sizes or edge gaps and be reflected by the Motion Path Preview.
