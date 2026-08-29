# Audit: Card gradient mesh — sequence physics, hover/holographic behavior, config-knob wiring

Scope: `experiences/abstract/components/SplitColumnCardPreview/components/CardStack.tsx` (as requested), traced out to its actual dependency chain, since CardStack.tsx itself only owns slot layout/tilt/positioning — it contains no gradient math. Read-only audit; no code changed.

## 0. Architecture — where the mesh actually lives

`CardStack.tsx` / `CardStackSlot.tsx` never reference gradient, hue, seed, or hologram config (grep-confirmed). They hand a `renderContent` adapter down to whatever page composes them. The one real caller wiring a mesh into a card is:

```
AbstractJournalLabCollection.tsx  (renders AbstractJournalLabHueFadeCard)
  → LiquidGradientAdapter
    → AbstractPostDock/components/GradientRenderer.tsx   (RAF render loop, hologram math)
      → AbstractPostDock/helpers/webgl.ts                (applySliderGradientUniforms — uniform assembly)
        → AbstractPostDock/helpers/shaderSource.ts +
          AbstractPostDock/helpers/proceduralColorShader.ts  (GLSL mesh field)
  ← per-card color/seed: experiences/abstract/helpers/deckPalette.ts
                          experiences/abstract/helpers/sliderVisualParameters.ts
```

Config: `AbstractPostDockPaletteConfig` and `AbstractPostDockHologramConfig` in `experiences/abstract/components/AbstractPostDock/config/registered.ts`. `SplitColumnCardStackConfig` (`config/stack.ts`) only owns the reveal/cover transition timing when a neighbor crosses the active boundary — not mesh generation.

## 1. The mesh itself (per-pixel field)

`proceduralColorShader.ts` — a 3-voice cosine palette (Inigo Quilez rainbow palette) sampled at horizontal, vertical, and slow-time phases, rotated/warped, then blended:

```glsl
vec3 rainbowColor(float t) {
  float r = 0.5 + 0.5 * cos(6.28318 * (t + 0.0));
  float g = 0.5 + 0.5 * cos(6.28318 * (t + 0.3333));
  float b = 0.5 + 0.5 * cos(6.28318 * (t + 0.6666));
  return vec3(r, g, b);
}
...
vec3 horizontalVoice = rainbowColor(st.x + uVariation*0.10 + hueDrift + ...);
vec3 verticalVoice   = rainbowColor(st.y + 0.3333 + uVariation*0.075 + hueDrift - ...);
vec3 temporalVoice   = rainbowColor(slowTime*0.5 + 0.5 + uVariation*0.12 + hueDrift + ...);
vec3 color = (horizontalVoice + verticalVoice + temporalVoice*temporalWeight) / (2.0 + temporalWeight);
```

`uSeed` phase-shifts every domain-warp `sin()` term; `uHueOffset` (and `uVariation`) shift all three voices together — this is the per-card knob surface. `applySaturation`/`uBrightness` do final grading. Blur is a CSS filter on the canvas (`blur(calc(var(--liquid-softness) * 2.4px))`, `AbstractJournalLabCollection.tsx:729`), driven by `masterSoftness`, not part of the shader.

## 2. Deck sequence physics — how card N relates to N−1 / N+1

Two independent mechanisms exist, selected by `AbstractPostDockPaletteConfig.mode`. **Default is `'window'`** (`registered.ts:640`) — this is what the screenshots reflect.

### 2a. Window mode (production default) — linear index functions, no randomness

```js
// deckPalette.ts — hue: each card's hue offset is linear in index, centered at the deck midpoint
export function deckWindowHueOffset(index, count, hueSpread) {
  const centered = index / (count - 1) - 0.5;
  const offset = centered * Math.min(0.72, Math.max(0, hueSpread));   // default hueSpread = 0.31
  return Math.min(0.36, Math.max(-0.36, offset));
}
// pan: same shape, in pixel-space window offset
export function deckWindowOffsetX(index, count, windowStep) {          // default windowStep = 0.27
  const centered = index - (count - 1) / 2;
  return centered * Math.max(0, windowStep);
}
```

Adjacent cards differ by a **constant step** — `hueSpread / (count − 1)` in hue, `windowStep` in pan — not a random draw. So consecutive cards *do* sit next to each other on a shared hue wheel, monotonically, by construction.

The mesh **shape/noise**, however, is governed separately by seed kinship:

```js
export function deckKinshipSeed(slideSeed, index, kinship) {   // default kinship = 0.03
  const family = 0.35 + index * 0.021;
  return slideSeed + (family - slideSeed) * kinship;
}
```

`slideSeed` per card comes from `sliderVisualParameters.ts`:

```js
export function getSliderVisualParameters(index) {
  return {
    seed: (index * 0.113 + 0.07) % 1,     // deterministic, NOT continuous/monotonic mod 1
    hueOffset: (index - 4) * 0.012,
    offsetX: Math.sin(index * 0.62) * 0.08,
    offsetY: Math.cos(index * 0.74) * 0.07,
    ...
  };
}
```

**This is the actual reason cohesion breaks down between adjacent cards despite the shared hue trend.** `fieldKinship` defaults to `0.03` — 3% blended toward the smooth per-index `family` value, 97% the raw `(index*0.113+0.07) % 1` seed. That seed has no continuity guarantee across index steps (`mod 1` wraps arbitrarily), so the *shape* of the mesh (where the blobs sit, how warped the field is) jumps around independently of the smooth hue progression. Net effect, matching what the screenshots show as "same card, different states, disconnected-feeling palette combos": the hue *wheel position* moves in a controlled, connected sequence, but the *field/shape* underneath it is close to independently randomized per card, so the overall impression doesn't read as one continuous spectrum even though hue technically is.

### 2b. Chord mode (alternate, `mode: 'chord'`, not currently active)

```js
export function computeDeckChord(index, count, config) {
  const dominantLab = sampleRampLab(rampPosition(index, count, config));
  // Relay rule: the support voice IS the next card's dominant, so adjacent
  // cards share a voice and traversal reads as color being handed over.
  const supportLab = config.relayEnabled
    ? sampleRampLab(rampPosition(Math.min(index + 1, count), count, config))
    : rotateHue(dominantLab, 32);
  const counterpointLab = scaleChroma(rotateHue(dominantLab, 165), config.counterpointChroma);
  ...
}
```

This is the mechanism that actually produces the "connected as a sequence of the spectrum" quality the objective asks for: card N's *support* voice is literally card N+1's *dominant* voice (both sampled off one continuous OKLab-interpolated ramp), so traversal reads as a literal hand-off. It's implemented, wired, and config-complete (`rampSpan`/`rampRotation`/`rampPath`, `relayEnabled`, `counterpointChroma`, `chordChroma`, `paletteLightness`, `lightnessContrast`, `inkUnity`, `voiceSpread`) — it's simply off by default.

## 3. Hover / holographic physics — resting vs. pointer-left vs. pointer-right

Pointer position is normalized to −1..1 per axis, centered on the card (`pointerProximity.ts`):
```js
x: clamp((pointerX - centerX) / halfWidth, -1, 1)   // pointer left of center → x < 0
```

**Resting** (`GradientRenderer.tsx:456-463`): when there's no live interaction, every hologram term is hard-zeroed — the card shows the plain index-driven procedural mesh from §1/§2, nothing else.

**Hover** (`GradientRenderer.tsx:456-509`):
```js
hologramOffsetX = -hologramX * hologramResponseStrength * HOLOGRAM_MAX_OFFSET_PX * hologramConfig.offsetGain;
hologramOffsetY = -hologramY * hologramResponseStrength * HOLOGRAM_MAX_OFFSET_PX * hologramConfig.offsetGain;
hologramHueShift = hologramX * hologramResponseStrength * hologramConfig.hueShiftAmount;
hologramSaturationBoost = hologramResponseStrength * hologramConfig.saturationBoost;
hologramBrightnessBoost = hologramResponseStrength * hologramConfig.brightnessBoost;
```
then folded into shader uniforms (`webgl.ts:335-352`) as additive terms on `uOffset`/`uHueOffset`/`uSaturation`/`uBrightness`.

- **Pointer left** (`x<0`): `offsetX` positive → field pans right (visually "the layer sits behind glass and shows through the other side" — pan opposite the pointer). `hueShift` negative → hue rotates one direction.
- **Pointer right** (`x>0`): mirrored — pan left, hue rotates the other direction.
- Vertical (`y`) only drives pan, never hue/saturation/brightness — by design (comment: "the classic colour-shifts-as-you-turn-it-side-to-side iridescent cue" is horizontal-axis-only).

This matches the three screenshots: left-hover and right-hover show mirrored hue rotation and opposite mesh-pan direction around the resting-state baseline, consistent with the sign flip on `hologramX`.

Two additional signal sources feed the *same* `interactionRef`/hue-shift pipeline, so config knobs on `AbstractPostDockHologramConfig` apply uniformly regardless of input device:
- **Touch** (`touchDragEnabled`): finger position substituted directly for pointer position (bypasses hover-media-query detection).
- **No hover capability, no touch in progress** (`ambientSweepEnabled`): a scripted sine/gaussian sweep (`hologramExciteSweep.ts`) writes a synthetic `{proximity,x,y}` so a coarse-pointer/no-hover device still gets a one-shot demonstration of the effect.

## 4. Config-knob wiring audit

### 4a. `SplitColumnCardStackConfig` (`config/stack.ts`) — reveal transition only, not mesh generation
All fields checked (`neighborGradientRevealDurationMs/-Easing/-BlurPx`, `neighborShadowFadeDurationMs/-Easing`) are consumed correctly through `CardStackSlot.tsx` into the content adapter. No issues.

### 4b. `AbstractPostDockHologramConfig` (`registered.ts:335-459`)
All 17 fields (`enabled`, `offsetGain`, `hueShiftAmount`, `saturationBoost`, `brightnessBoost`, `responseEasing`, `dampingEnabled`, `touchDragEnabled`, `ambientSweep*` × 6, `ambientTilt*` × 2) are read inside `GradientRenderer.tsx`'s render loop or the card's own ambient-sweep/touch-drag effects. No issues found.

### 4c. `AbstractPostDockPaletteConfig` (`registered.ts:486-681`)

**Confirmed dead knobs** — defined, defaulted, normalized, and panel-exposed, but never read by any runtime code:

| Field | Doc claims | Reality |
|---|---|---|
| `gradientScale` | "maps straight through to `LiquidSliderConfig`'s own `shaderColorScale`" | No such mapping exists anywhere in the codebase (grep-verified: zero references outside `registered.ts`/`panel.ts`) |
| `gradientNoise` | "maps straight through to `shaderColorRandomness`" | Same — unreferenced |
| `gradientScaleWide` / `gradientNoiseWide` | tablet-tier variants of the above | Same |
| `gradientScaleLg` / `gradientNoiseLg` | desktop-tier variants of the above | Same |

An operator adjusting any of these six fields in the panel today sees **no visual change whatsoever**. `deckPalette.ts` — the sole consumer of `paletteConfig` at runtime — never touches these field names.

**Confirmed wired**: `windowStep`, `hueSpread`, `windowPanCurve`, `gaussianPeakIndex/-Sigma/-Amplitude/-Floor`, `gaussianVisualTestModeEnabled`, `fieldKinship`, `inactiveChromaDuck`, `valueRigAmount`, `masterSaturation/-Brightness/-Contrast/-Softness`, `relayEnabled`, `counterpointChroma`, `rampSpan/-Rotation/-Path`, `chordChroma`, `paletteLightness`, `lightnessContrast`, `inkUnity`, `voiceSpread` — each traced to a real read site in `deckPalette.ts` or `webgl.ts`.

**Not fully traced this pass** (moderate confidence, worth one more read before relying on it): `gaussianProximityMorphEnabled/-ResponseMs/-StaggerMsPerBand/-Easing` route through `useGaussianProximityMorph.ts`; wiring into `LiquidGradientAdapter` looks plausible from call sites but wasn't opened line-by-line.

**Out of mesh scope by its own doc comment** (not chased): `distanceDimmingEnabled/-MaxOpacity/-BaselineOpacity/-Power/-Easing` — drives `MagnificationDock` row-dimming, unrelated to the card gradient.

### 4d. `AbstractPostDockHueInfluenceConfig` (`registered.ts:799-855`)
All fields consumed through `buildDeckPaletteStates` → shader uniforms → the shader's OKLab hue-grade block. No issues.

## 5. Why the current sequence doesn't read as "connected spectrum with rich per-card variation"

Root cause, precisely: in the active `'window'` mode, **hue is index-linear (connected) but field seed is not (disconnected)** — `fieldKinship` defaults to `0.03`, so 97% of each card's mesh shape comes from an uncorrelated-feeling `(index*0.113+0.07) % 1` term. The hue *wheel position* walking smoothly across the deck gets undercut visually by the field shape jumping around underneath it, which is what reads as "each card looks like an unrelated combination" rather than "a sequence."

## 6. Recommendations

Ranked by effort/impact, using existing knobs first per this repo's own convention (extend a knob before adding a parallel one):

1. **Raise `fieldKinship` toward 0.3–0.5** (currently `0.03`, `registered.ts:653`). This is the single highest-leverage existing knob: it directly controls how much of each card's field shape is a smooth per-index family value vs. an independent seed, without touching hue. Should measurably fix the "disconnected combination" impression while `hueSpread`/`windowStep` continue giving rich per-card difference in *where on the wheel* and *where the field pans*.
2. **Raise `hueSpread` from 0.31 toward its cap (0.72)** if the intent is for the deck to visibly traverse more of the spectrum end-to-end, since 0.31 currently uses well under half the available range (`registered.ts:642`, clamp at `deckPalette.ts` / `registered.ts:703`).
3. **Try `windowPanCurve: 'gaussian'`** (currently `'linear'`) with the existing `gaussianPeakIndex/-Sigma/-Amplitude/-Floor` knobs — gives the active/hovered region of the deck a visually distinct "peak" instead of uniform linear drift, adding richness without abandoning the connected sequence.
4. **Consider enabling `mode: 'chord'` with `relayEnabled: true`** for a genuinely stronger sequence guarantee: the relay rule makes card N's support hue *literally equal* to card N+1's dominant hue, which is the most direct implementation of "connected as a sequence" available in this codebase today, already fully wired. This is a bigger visual departure (LUT-based palette instead of the cosine wheel) — worth a side-by-side comparison before committing, since it changes the mesh's overall color character, not just its cross-card relationship.
5. **Fix or remove the six dead `gradientScale*`/`gradientNoise*` knobs** (§4c) — either wire them to the shader's `uScale`/`uRandomness` uniforms (their names strongly suggest that was the intent) or delete them from config + panel so operators stop tuning a knob with no effect. This is a correctness bug independent of the visual-quality goal and should be called out regardless of which other recommendations are taken.
6. **Holographic effect**: the pointer-left/right mapping (`hologramHueShift`, `hologramOffsetX`) is correctly wired and already mirrors as expected — no defect found. If more "richness" per-card is added via #1–#3 above, verify `hologramOffsetX`'s pan range (`HOLOGRAM_MAX_OFFSET_PX × offsetGain`) still reads clearly against a busier base field; a denser mesh can make small pan deltas less perceptible, which may argue for a modest `offsetGain` bump (currently `1.8`) alongside any `fieldKinship`/`hueSpread` change.

None of the above requires new config surface — every recommendation reuses an existing, already-wired knob except #5, which proposes fixing (or removing) knobs already present but currently inert.
