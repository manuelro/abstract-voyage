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
