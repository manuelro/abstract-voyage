// Physically-motivated, layered "elevation shadow" engine.
//
// Model: a flat receiving plane (the page/hero background) is lit by a single,
// stable, invisible area light positioned above it. An occluding object (e.g.
// a button) floats at a configurable virtual elevation above the plane. The
// engine derives a layered box-shadow — a tight contact/ambient-occlusion
// term, a soft near-field bridge, and a directional projected "key" term —
// purely from the geometric relationship between the light, the object, and
// its elevation. Nothing here is hand-authored per interaction state; every
// visual property is a function of one authoritative `elevationPx` value.
//
// Coordinate system: all positions (`lightX/Y`, `objectCenterX/Y`) are
// expected in DOCUMENT space (i.e. already offset by scroll), not viewport
// space. Document space is scroll-invariant, so callers do not need to
// recompute geometry on scroll — only on resize/layout changes. See
// components/proximity/useElevationShadow.ts for the measurement side.
//
// Two independent falloff models are used deliberately:
// - The projected/key term uses the classic similar-triangles area-light
//   ratio r = e / (H - e) (H = light height above the plane): as the object
//   rises, its shadow displaces and softens following real perspective
//   projection from a light at finite height.
// - The contact/ambient-occlusion term instead decays with raw elevation
//   against a short "contact decay" distance. Real contact shadows are a
//   near-field phenomenon (how close is the object to the surface right
//   here), not a function of a distant light's perspective — using the same
//   r-ratio for both would make contact darkening fall off far too slowly.

export type ElevationShadowLayer = {
  offsetXPx: number;
  offsetYPx: number;
  blurPx: number;
  spreadPx: number;
  /** 0..1 opacity for this layer, already folded into the returned alpha. */
  alpha: number;
};

export type ElevationShadowInput = {
  /** Document-space virtual light position. */
  lightX: number;
  lightY: number;
  /** Virtual altitude of the light above the receiving plane. */
  lightHeightPx: number;
  /** Apparent radius of the area light — the primary softness control. */
  lightRadiusPx: number;
  /** Direct vs. ambient illumination — controls contrast, not blur. */
  lightDirectIntensity: number;
  lightAmbientIntensity: number;
  /** Document-space center of the occluding object. */
  objectCenterX: number;
  objectCenterY: number;
  /** Used to normalize horizontal light-relative offset across breakpoints. */
  viewportWidthPx: number;
  /** The one authoritative physical state. */
  elevationPx: number;
  elevationMinPx: number;
  elevationMaxPx: number;
  /** Projected (key) shadow response. */
  projectedStrength: number;
  projectedFalloff: number;
  /** Contact / ambient-occlusion shadow response. */
  contactStrength: number;
  contactFalloff: number;
  contactDecayElevationPx: number;
  /** 0..1 — how strongly the near-field bridge layer between contact and
   * projected shadows contributes. */
  nearFieldStrength: number;
  /** Hard ceilings so misconfigured intensities can't runaway. */
  maxBlurPx: number;
  maxDisplacementPx: number;
  maxProjectedScale: number;
  /** true (default): the physically-motivated model this whole engine is
   * built around — the shadow always leans downward (see module docs, the
   * hardcoded `direction.y = 1`) and horizontally toward whichever side of
   * the virtual light the object sits on. false: every layer's offset is
   * forced to (0, 0) instead — a symmetric, center-anchored blur directly
   * under the object. Blur/spread/alpha (all still elevation-reactive) are
   * untouched either way; only the directional lean this model exists to
   * produce is suppressed. For a context where "lit from one side" doesn't
   * read as intended (e.g. a tilted card in a stack, rather than a flat
   * button) rather than for the engine as a whole. */
  directional?: boolean;
};

export type ElevationShadowResult = {
  /** Ordered contact → near-field → projected (CSS box-shadow paints the
   * first entry nearest/on top, so this ordering reads as "closest to
   * furthest," matching the physical stack). */
  layers: ElevationShadowLayer[];
  /** Unit-ish horizontal lean (-1..1) and vertical (always 1, "downward"). */
  direction: { x: number; y: number };
  horizontalOffsetPx: number;
  verticalOffsetPx: number;
  penumbraPx: number;
  projectedScale: number;
  /** Projected layer's resolved peak alpha (debug/inspection). */
  peakDensity: number;
  /** Contact layer's resolved peak alpha (debug/inspection). */
  contactStrength: number;
  contactFalloffPx: number;
  /** e / (H - e), the raw similar-triangles ratio. */
  elevationRatio: number;
  /** elevationRatio normalized so it reaches ~1 at elevationMaxPx. */
  elevationNormalized: number;
};

const clamp = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** How much a horizontal light-relative lean can steal from the vertical
 * displacement budget — keeps the shadow "predominantly downward" even for
 * a CTA sitting far from the light's horizontal center. */
const LATERAL_LEAN_FACTOR = 0.35;
const CONTACT_BLUR_MIN_PX = 2;
const NEAR_FIELD_ALPHA_SCALE = 0.55;
const PROJECTED_SPREAD_FRACTION = 0.18;
const MIN_VISIBLE_ALPHA = 0.002;

function resolveElevationRatio(
  elevationPx: number,
  elevationMinPx: number,
  elevationMaxPx: number,
  lightHeightPx: number,
) {
  const safeMax = Math.max(elevationMaxPx, elevationMinPx + 1);
  const e = clamp(elevationPx, elevationMinPx, Math.min(safeMax, lightHeightPx - 1));
  const r = e / Math.max(lightHeightPx - e, 1);
  const eAtMax = clamp(safeMax, elevationMinPx, lightHeightPx - 1);
  const rAtMax = eAtMax / Math.max(lightHeightPx - eAtMax, 1);
  return { e, r, rNorm: rAtMax > 0 ? r / rAtMax : 0 };
}

export function computeElevationShadow(input: ElevationShadowInput): ElevationShadowResult {
  const {
    lightX, lightY, lightHeightPx, lightRadiusPx,
    lightDirectIntensity, lightAmbientIntensity,
    objectCenterX, objectCenterY, viewportWidthPx,
    elevationPx, elevationMinPx, elevationMaxPx,
    projectedStrength, projectedFalloff,
    contactStrength, contactFalloff, contactDecayElevationPx,
    nearFieldStrength,
    maxBlurPx, maxDisplacementPx, maxProjectedScale,
    directional = true,
  } = input;
  void lightY; // light Y establishes the (always-downward) structural direction; its
  // magnitude isn't re-used to further scale the offset — see module docs.

  const { e, r, rNorm } = resolveElevationRatio(
    elevationPx, elevationMinPx, elevationMaxPx, lightHeightPx,
  );

  const dx = objectCenterX - lightX;
  const dxNormalized = directional
    ? clamp(dx / Math.max(viewportWidthPx / 2, 1), -1, 1)
    : 0;

  const boundedRNorm = clamp(rNorm, 0, 1.4);
  // directional: false forces both offsets to 0 (center/center) — every
  // other elevation-driven property (blur, spread, alpha) below still
  // reacts normally; only the directional lean is suppressed.
  const verticalOffsetPx = directional ? maxDisplacementPx * boundedRNorm : 0;
  const horizontalOffsetPx = directional
    ? verticalOffsetPx * LATERAL_LEAN_FACTOR * dxNormalized
    : 0;

  const penumbraPx = clamp(lightRadiusPx * boundedRNorm, 0, maxBlurPx);
  const projectedScale = 1 + (Math.max(maxProjectedScale, 1) - 1) * clamp(rNorm, 0, 1);

  const contrastRatio = lightDirectIntensity
    / Math.max(lightDirectIntensity + lightAmbientIntensity, 0.0001);

  // Projected (key) layer — peak concentration falls as the shadow spreads
  // across a wider penumbra, per "do not use light power as the primary blur
  // control": blur comes from lightRadiusPx above, this only shapes density.
  const peakDensity = clamp(
    (projectedStrength * contrastRatio) / (1 + boundedRNorm * Math.max(projectedFalloff, 0)),
    0,
    1,
  );
  const projectedSpreadPx = maxDisplacementPx * PROJECTED_SPREAD_FRACTION * clamp(rNorm, 0, 1);

  // Contact / ambient-occlusion layer — near-field, decays with raw
  // elevation against its own short decay distance (see module docs).
  const contactT = clamp(1 - e / Math.max(contactDecayElevationPx, 1), 0, 1);
  const resolvedContactStrength = clamp(
    contactStrength * contrastRatio * (contactT ** Math.max(contactFalloff, 0.01)),
    0,
    1,
  );
  const contactBlurMaxPx = Math.max(CONTACT_BLUR_MIN_PX + 1, penumbraPx * 0.6);
  const contactBlurPx = lerp(contactBlurMaxPx, CONTACT_BLUR_MIN_PX, contactT);
  // Slight negative spread at full contact keeps the darkening hugging the
  // silhouette instead of reading as a uniform halo around it.
  const contactSpreadPx = lerp(-2, 1, contactT);
  // lerp(1, 3, ...) is a small independent downward nudge — unrelated to
  // horizontalOffsetPx/verticalOffsetPx above, so directional alone doesn't
  // zero it; gated the same way here.
  const contactOffsetYPx = directional ? lerp(1, 3, contactT) : 0;

  // Near-field transition — bridges contact and projected; present mainly
  // where both have something to bridge, fades at either extreme.
  const nearFieldPresence = Math.sqrt(
    Math.max(0, contactT) * clamp(rNorm + 0.15, 0, 1),
  );
  const nearFieldAlpha = clamp(
    nearFieldStrength * contrastRatio * nearFieldPresence * NEAR_FIELD_ALPHA_SCALE,
    0,
    1,
  );
  const nearFieldOffsetXPx = horizontalOffsetPx * 0.4;
  // + CONTACT_BLUR_MIN_PX is its own small fixed downward nudge, independent
  // of verticalOffsetPx (already 0 when !directional) — gated the same way.
  const nearFieldOffsetYPx = directional
    ? verticalOffsetPx * 0.4 + CONTACT_BLUR_MIN_PX
    : 0;
  const nearFieldBlurPx = lerp(contactBlurPx, penumbraPx, 0.5);

  const layers: ElevationShadowLayer[] = [
    {
      offsetXPx: 0,
      offsetYPx: contactOffsetYPx,
      blurPx: contactBlurPx,
      spreadPx: contactSpreadPx,
      alpha: resolvedContactStrength,
    },
    {
      offsetXPx: nearFieldOffsetXPx,
      offsetYPx: nearFieldOffsetYPx,
      blurPx: nearFieldBlurPx,
      spreadPx: 0,
      alpha: nearFieldAlpha,
    },
    {
      offsetXPx: horizontalOffsetPx,
      offsetYPx: verticalOffsetPx,
      blurPx: penumbraPx,
      spreadPx: projectedSpreadPx,
      alpha: peakDensity,
    },
  ].filter(layer => layer.alpha > MIN_VISIBLE_ALPHA);

  return {
    layers,
    direction: { x: dxNormalized, y: directional ? 1 : 0 },
    horizontalOffsetPx,
    verticalOffsetPx,
    penumbraPx,
    projectedScale,
    peakDensity,
    contactStrength: resolvedContactStrength,
    contactFalloffPx: contactBlurPx,
    elevationRatio: r,
    elevationNormalized: rNorm,
  };
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.trim().replace('#', '');
  const expanded = normalized.length === 3
    ? normalized.split('').map(char => char + char).join('')
    : normalized;
  const value = Number.parseInt(expanded, 16);
  if (expanded.length !== 6 || Number.isNaN(value)) return { r: 0, g: 0, b: 0 };
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

/** Serializes layers (nearest-first) into a single multi-layer box-shadow
 * value. box-shadow automatically follows the target element's own
 * border-radius, so the pill silhouette is preserved for free — no mask or
 * SVG clip is needed regardless of the configured corner radius. */
export function serializeElevationShadowLayers(
  layers: ReadonlyArray<ElevationShadowLayer>,
  colorHex: string,
): string {
  if (layers.length === 0) return 'none';
  const { r, g, b } = parseHexColor(colorHex);
  return layers
    .map(layer => (
      `${layer.offsetXPx.toFixed(2)}px ${layer.offsetYPx.toFixed(2)}px `
      + `${Math.max(0, layer.blurPx).toFixed(2)}px ${layer.spreadPx.toFixed(2)}px `
      + `rgba(${r}, ${g}, ${b}, ${clamp(layer.alpha, 0, 1).toFixed(4)})`
    ))
    .join(', ');
}

/** Serializes layers into a `filter: drop-shadow(...) drop-shadow(...) ...`
 * chain instead of box-shadow — for text (or any non-rectangular content)
 * where the shadow must hug the actual rendered glyph/shape outlines rather
 * than the element's bounding box. CSS drop-shadow() has no spread-radius
 * parameter (unlike box-shadow), so spreadPx is folded additively into blur
 * as the closest visual equivalent: a positive spread reads as a touch more
 * blur/reach, a negative spread (the contact layer's tightening) pulls blur
 * in, hugging the silhouette more closely — never literal, but the same
 * qualitative direction spread was already pushing box-shadow in. */
export function serializeElevationShadowLayersAsDropShadowFilter(
  layers: ReadonlyArray<ElevationShadowLayer>,
  colorHex: string,
): string {
  if (layers.length === 0) return 'none';
  const { r, g, b } = parseHexColor(colorHex);
  return layers
    .map(layer => {
      const blurPx = Math.max(0, layer.blurPx + layer.spreadPx);
      return `drop-shadow(${layer.offsetXPx.toFixed(2)}px ${layer.offsetYPx.toFixed(2)}px `
        + `${blurPx.toFixed(2)}px rgba(${r}, ${g}, ${b}, ${clamp(layer.alpha, 0, 1).toFixed(4)}))`;
    })
    .join(' ');
}

export { clamp as clampElevationShadowValue, lerp as lerpElevationShadowValue };
