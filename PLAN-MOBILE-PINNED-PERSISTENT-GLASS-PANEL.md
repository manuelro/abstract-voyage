# Mobile Pinned Persistent Glass Panel

Status: Implemented and verified on 2026-09-14.

## Objective

Restore the stable object continuity of `fd342e4` while retaining the current
configuration surface, row choreography, scroll locking, background darkening,
and optional card-flip presentation.

## Architecture

The `glassPanel` presentation owns one persistent, bottom-anchored glass
surface. In its closed state that surface contains the short list and uses
`listHeightPercent`; while opening, open, or closing it contains the full list.
Its top edge moves by animating `height`, never by translating a blurred layer.

The `cardFlip` presentation remains independent: its short list keeps its own
compact surface and its full list remains on the reverse card face. Both
presentations consume one shared four-phase state:

```text
closed -> opening -> open -> closing -> closed
```

## Configuration Mapping

- `listHeightPercent`: persistent glass panel's closed height.
- `expandedPanelHeightPercent`: persistent glass panel's open height.
- `panelExpandDurationMs` / `panelExpandEasing`: opening height or flip motion.
- `panelCollapseDurationMs` / `panelCollapseEasing`: closing height or flip motion.
- Existing row fade, delay, padding, glass, carousel dimming, background
  darkening, list settling, and presentation fields retain their contracts.

## Interaction Contract

1. Opening keeps the panel node mounted, switches its content to the hidden
   full-list rows, and expands the same surface.
2. The real surface `transitionend` gates the configured row entrance delay.
3. Closing fades the full-list rows first, then contracts the same surface.
4. The short list returns only after the real close transition finishes.
5. Reduced motion performs the same state changes without transitions.
6. Focus enters the full list after open begins and returns to the short list
   after close completes.

## Acceptance Criteria

- Exactly one painted glass panel exists in `glassPanel` mode.
- Its DOM identity survives a complete open/close cycle.
- The glass panel never uses transform or element opacity for visibility.
- Backdrop blur remains on the stationary, bottom-anchored surface.
- Open and close use their independently configured duration/easing pairs.
- Escape, backdrop close, selection, rapid interruption, and reduced motion
  preserve the existing behavior.
- `cardFlip` retains its current geometry and controls.

## Verification Record

- Component lifecycle tests prove one glass node survives open and close.
- Static CSS coverage prevents transform or opacity from returning to the
  glass panel's motion rule.
- Mobile Chromium runtime traces confirmed one connected node, opacity `1`,
  transform `none`, and smooth height travel in both directions.
- Mid-motion and settled screenshots were inspected at a 390 x 844 viewport.
