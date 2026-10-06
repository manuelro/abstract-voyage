# Plan — "Sync gradient across breakpoints" button

**Date:** 2026-09-28
**Companion audit:** `AUDIT-POLYMORPHIC-GRADIENT-SYNC.md` (full knob inventory).
**Goal:** add a panel button that copies one tier's gradient-background config
into the other breakpoints, mirroring the existing "Sync colors across
breakpoints" pattern.

## Design decision

Reuse the established three-button pattern (one per tier), NOT a single button:
each tier's gradient group gets its own "Sync gradient across breakpoints"
action that treats that tier as the source. This matches
`PolymorphicLayout.panel.ts`'s existing `SYNC_COLORS_FROM_{MOBILE,TABLET,DESKTOP}`
actions and needs no new UI primitive — `ConfigFieldAction` already does the
work.

**Sync scope (operator-scoped, 2026-09-28): clusters A2, A3, A6 only — 24
knobs.** Deliberately excludes:
- **A1** (enable/column-scope) — whether the gradient is on, and behind which
  columns, is a per-tier layout decision an operator commonly wants to differ
  across breakpoints; syncing it would clobber that.
- **A4** (dither) and **A5** (scroll-darken) — left per-tier for now, not part of
  this capability.
- **Group B** (tablet/desktop-only glass opacity, backdrop blur), **Group C**
  (desktop-only narrow-column variant), **Group D** (non-tiered) — untouched.

The 24 in-scope knobs (all fully tiered: base + `Wide` + `Lg`):
- **A2 — palette generation** (9): `scrollGradientBaseHue`, `…HueScheme`,
  `…LightnessMin`, `…ChromaMin`, `…Mode`, `…Stops`, `…Variance`,
  `…CenterStretch`, `…Seed`.
- **A3 — compositor & light shaping** (10): `scrollGradientCompositor`,
  `…FocalHorizontal`, `…LightHiddenPercent`, `…LightRadiusPercent`,
  `…LightAspectRatio`, `…LightFalloff`, `…MixSamples`, `…Interpolation`,
  `…ExtentPercent`, `…Smoothness`.
- **A6 — ink & legibility** (5): `scrollGradientInkColor`,
  `…LegibilityTargetRatio`, `…DarkInkSaturation`, `…DarkInkOpacityMultiplier`,
  `…LightInkOnLightBackgroundContrastTolerance`.

**One button per tier syncs these 24 as one atomic set, not per-cluster.** The
A2/A3/A6 clusters are an organizing device for the key list and the audit, not
three separate buttons: an operator tuning a gradient's look thinks of palette +
light + ink as one appearance, and partial-sync buttons would be a worse UX
(more clicks, easy to leave a gradient half-synced). Keep the clusters as
commented sections inside the single key list so it stays legible and a future
knob lands in an obvious place.

## Implementation steps

All edits in `experiences/abstract/components/PolymorphicLayout.panel.ts`
(shared field array; no per-page change needed). No config-schema, normalizer,
or component change required — the keys and their normalization already exist.

### 1. Define the shared key list

Add a module-level constant listing the 24 in-scope base keys (no suffix),
organized by the A2/A3/A6 clusters so the list reads in pipeline order and a new
knob has an obvious home. All 24 are fully tiered, so there is a single key list
and no partial-tier special-casing:

```ts
const GRADIENT_SYNC_BASE_KEYS = [
  // A2 — palette generation (harmonic gradient)
  'scrollGradientBaseHue', 'scrollGradientHueScheme', 'scrollGradientLightnessMin',
  'scrollGradientChromaMin', 'scrollGradientMode', 'scrollGradientStops',
  'scrollGradientVariance', 'scrollGradientCenterStretch', 'scrollGradientSeed',
  // A3 — compositor & light shaping
  'scrollGradientCompositor', 'scrollGradientFocalHorizontal',
  'scrollGradientLightHiddenPercent', 'scrollGradientLightRadiusPercent',
  'scrollGradientLightAspectRatio', 'scrollGradientLightFalloff',
  'scrollGradientMixSamples', 'scrollGradientInterpolation',
  'scrollGradientExtentPercent', 'scrollGradientSmoothness',
  // A6 — ink & legibility
  'scrollGradientInkColor', 'scrollGradientLegibilityTargetRatio',
  'scrollGradientDarkInkSaturation', 'scrollGradientDarkInkOpacityMultiplier',
  'scrollGradientLightInkOnLightBackgroundContrastTolerance',
] as const satisfies ReadonlyArray<keyof PolymorphicLayoutConfig>;
```

Explicitly NOT in this list (per scope): A1 enable/column-scope, A4 dither, A5
scroll-darken, and all of Groups B/C/D. A reader adding a new gradient knob must
consciously decide whether it belongs to palette/light/ink before adding it
here.

### 2. Suffix helpers + patch builder

Simpler than the color-sync original because every in-scope key is fully tiered:
one loop, no per-endpoint tier guard.

```ts
const suffixKey = (base: string, tier: '' | 'Wide' | 'Lg') => `${base}${tier}`;

// Copies every in-scope key from the `from` tier onto each `to` tier.
function buildGradientSyncPatch(
  config: Readonly<PolymorphicLayoutConfig>,
  from: '' | 'Wide' | 'Lg',
  targets: ReadonlyArray<'' | 'Wide' | 'Lg'>,
): Partial<PolymorphicLayoutConfig> {
  const patch: Record<string, unknown> = {};
  for (const base of GRADIENT_SYNC_BASE_KEYS) {
    const value = config[suffixKey(base, from) as keyof PolymorphicLayoutConfig];
    for (const to of targets) patch[suffixKey(base, to)] = value;
  }
  return patch as Partial<PolymorphicLayoutConfig>;
}
```

### 3. `gradientTiersInSync` predicate

Pure function of live config — true when every in-scope key matches across all
three tiers. Drives each button's `visibleWhen` (button appears only while tiers
disagree, disappears on its own after the sync — same self-clearing behavior as
the color buttons).

```ts
const gradientTiersInSync = (config: PolymorphicLayoutConfig) =>
  GRADIENT_SYNC_BASE_KEYS.every(base =>
    config[suffixKey(base, '') as keyof PolymorphicLayoutConfig]
      === config[suffixKey(base, 'Wide') as keyof PolymorphicLayoutConfig]
    && config[suffixKey(base, '') as keyof PolymorphicLayoutConfig]
      === config[suffixKey(base, 'Lg') as keyof PolymorphicLayoutConfig]);
```

### 4. Three `ConfigFieldAction`s

```ts
const SYNC_GRADIENT_FROM_MOBILE_ACTION: ConfigFieldAction<PolymorphicLayoutConfig> = {
  kind: 'action', key: 'syncGradientTiersFromMobile',
  label: 'Sync gradient across breakpoints',
  description: "Applies this tier's gradient palette, light shaping, and ink/legibility settings to the Tablet and Desktop tiers. Does not change the enable toggles, dither, or scroll-darken.",
  visibleWhen: config => !gradientTiersInSync(config),
  onClick: config => buildGradientSyncPatch(config, '', ['Wide', 'Lg']),
};
// …FROM_TABLET: key 'syncGradientTiersFromTablet',
//   description "…to the Mobile and Desktop tiers. …",
//   onClick => buildGradientSyncPatch(config, 'Wide', ['', 'Lg'])
// …FROM_DESKTOP: key 'syncGradientTiersFromDesktop',
//   description "…to the Mobile and Tablet tiers. …",
//   onClick => buildGradientSyncPatch(config, 'Lg', ['', 'Wide'])
```

### 5. Placement

Insert each action as the first entry inside its matching gradient group's
`fields` array:
- `SYNC_GRADIENT_FROM_MOBILE_ACTION` → "Scroll gradient" group (~line 1938)
- `SYNC_GRADIENT_FROM_TABLET_ACTION` → "Scroll gradient (≥ tablet)" (~2253)
- `SYNC_GRADIENT_FROM_DESKTOP_ACTION` → "Scroll gradient (≥ desktop)" (~2573)

Note the existing `NonTabsEntry` typing excludes `kind: 'action'` from the
base-fields machinery (comment ~574): declare these inline in the group
`fields`, exactly like the color actions — do **not** route them through
`POLYMORPHIC_LAYOUT_BASE_FIELDS`/`fieldsWithKeys`.

## Type note

The key-discriminated union over `PolymorphicLayoutConfig` is already at TS's
representable-size ceiling (see the existing `@ts-expect-error` at
`gateByHeaderScrollBehavior`). The string-indexed `Record<string, unknown>`
patch builder above sidesteps that deliberately; the `as Partial<…>` cast at the
boundary is the same pragmatic escape hatch the file already uses. Keep the
`satisfies ReadonlyArray<keyof PolymorphicLayoutConfig>` on the key lists so a
renamed/removed knob is still caught at compile time.

## Verification

1. `npx tsc --noEmit -p .` clean.
2. Live: open the abstract page panel, change an A2/A3/A6 value on Mobile (e.g.
   base hue), confirm the "Sync gradient across breakpoints" button appears in
   the Mobile gradient group; click it; confirm Tablet/Desktop palette+light+ink
   now match and the button disappears from all three groups.
3. Repeat sourcing from Tablet and from Desktop.
4. Confirm EXCLUDED knobs are never touched: set the enable toggles (A1), a
   dither value (A4), and a scroll-darken value (A5) to differ across tiers,
   then sync — those must remain per-tier unchanged, and the button's
   visibility must ignore them (it stays hidden when only A1/A4/A5/B/C/D differ
   but A2/A3/A6 agree).
5. Confirm the button self-hides once the in-scope tiers agree and reappears
   after any single A2/A3/A6 tier edit.

## Out of scope

- **A1** (enable / column scope), **A4** (dither), **A5** (scroll-darken) — left
  per-tier by operator decision (2026-09-28).
- **Group B** tablet/desktop-only glass/blur, **Group C** desktop-only
  narrow-column variant, **Group D** non-tiered adaptive-ink/tau.
- Wordmark gradient clarity (separate text treatment).
- Any change to gradient rendering, normalization ranges, or defaults.
