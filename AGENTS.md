# Project conventions for coding agents

## Config panel: enum vs. select

`components/Panel/config/types.ts` defines two field kinds for a fixed list
of `{ label, value }` options: `EnumConfigField` (`kind: 'enum'`, rendered as
a `SegmentedControl` button row) and `SelectConfigField` (`kind: 'select'`,
rendered as a native `<select>` dropdown).

**Rule: once a field's `options` array exceeds ~6-8 entries, it MUST use
`kind: 'select'`, never `kind: 'enum'`.** A `SegmentedControl` row past that
count becomes an unreadable wall of overlapping/truncated button labels
(confirmed live — a 15-option `enum` field rendered as illegible overlapping
text, `--panel-option-count: 15` squeezed into one row). This is not a
per-case judgment call; treat it as a hard ceiling when authoring any new
panel field, in this project or any other project using this same Panel
config system.

When in doubt, count the options first, then pick the kind — don't default
to `enum` because it's simpler to write and fix it later once it looks bad.

## Visual verification is mandatory for visual changes

For any UI, layout, typography, color, gradient, opacity, responsive, or
config-panel change, do not report the issue as fixed based only on source
inspection, TypeScript, unit tests, or a successful page load.

Before claiming completion, agents MUST:

1. Run the application on a non-3000 port (use 3001 or another explicitly
   selected free port).
2. Exercise the actual rendered page through the browser at every affected
   breakpoint, including the default state and the relevant minimum/maximum
   config values.
3. Capture screenshots of the affected states and visually inspect them.
   HEIC evidence must be converted to PNG when the local image viewer cannot
   decode it.
4. Inspect the final rendered DOM/computed styles or pixel samples for the
   affected elements. Verify the value at the final consumer (for example,
   the accordion item's actual `color` and `opacity`), not merely the value
   calculated upstream.
5. Check every alternate render path and responsive branch that can produce
   the affected UI; one verified component instance is not evidence for all
   call sites.
6. Record the viewport, config values, screenshot paths, and observed result
   in the handoff. If visual verification cannot be completed, say so plainly
   and do not use language such as "fixed" or "verified visually".

For config-driven visual changes, the browser test must change the value via
the real config-panel/control path or the same runtime state mechanism used by
the panel, then confirm that the rendered output changes in the expected
direction. A static screenshot at the default value is insufficient.
