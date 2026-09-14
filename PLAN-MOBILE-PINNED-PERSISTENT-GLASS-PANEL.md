# Mobile Pinned Persistent Glass Panel

Status: Implemented; Chromium desktop hardening added on 2026-09-14.

## Objective

Restore the stable object continuity of `fd342e4` while retaining the current
configuration surface, row choreography, scroll locking, background darkening,
and optional card-flip presentation.

## Architecture

The `glassPanel` presentation owns one persistent, bottom-anchored panel and
one persistent rows viewport. The panel is split into an outer geometry wrapper
and a fixed-size inner glass layer. Only the wrapper height changes; the
`backdrop-filter` layer always retains the expanded dimensions and is revealed
through clipping. This avoids reallocating Chromium's filtered backing surface
on every animation frame.

Opening first enters a one-frame `preparing` state. That state mounts the hidden
full-list display list, resolves the opaque fallback paint, starts the short
carousel-dimming settle, and lets Chromium commit those changes before height
motion begins.

The `cardFlip` presentation remains independent: its short list keeps its own
compact surface and its full list remains on the reverse card face. Both
presentations consume one shared lifecycle (card flip skips `preparing`):

```text
closed -> preparing -> opening -> open -> closing -> closed
```

## Configuration Mapping

- `listHeightPercent`: persistent glass panel's closed height.
- `expandedPanelHeightPercent`: persistent glass panel's open height.
- `panelExpandDurationMs` / `panelExpandEasing`: opening wrapper height or flip motion.
- `panelCollapseDurationMs` / `panelCollapseEasing`: closing height or flip motion.
- Existing row fade, delay, padding, glass, carousel dimming, background
  darkening, list settling, and presentation fields retain their contracts.

## Interaction Contract

1. Opening keeps the panel and rows-viewport nodes mounted, prepares hidden
   full-list rows for one paint, and expands the same wrapper.
2. The real surface `transitionend` gates the configured row entrance delay.
3. Closing fades the full-list rows first, then contracts the same surface.
4. The short list returns only after the real close transition finishes.
5. Reduced motion performs the same state changes without transitions.
6. Focus enters the full list after open begins and returns to the short list
   after close completes.

## Acceptance Criteria

- Exactly one painted glass layer exists in `glassPanel` mode.
- The panel and rows viewport DOM identities survive a complete cycle.
- The glass panel never uses transform or element opacity for visibility.
- Backdrop blur remains on a constant-size, bottom-anchored inner surface.
- The changing carousel backdrop settles before the panel's motion boundary.
- An opaque resolved page color backs the translucent blur instead of allowing
  a dropped filtered frame to become a fully transparent panel.
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
