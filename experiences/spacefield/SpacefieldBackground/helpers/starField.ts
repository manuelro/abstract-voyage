import { applyColorSaturation, temperatureToRgb } from './starColor';
import type { SpacefieldConfig } from '../config/registered';

export type SpacefieldStar = {
  /** Radians, screen space (0 = +x/right, increasing clockwise since y
   * grows downward) — the fixed direction this star travels outward from
   * this field's own origin corner. Sampled from the caller-supplied
   * angleRangeStart/angleRangeSpan (see generateSpacefieldStars below) —
   * each mounted instance covers only the 90° quadrant its own box actually
   * occupies relative to its origin corner, since every instance is now a
   * single self-contained region (see SpacefieldBackground's originFraction
   * prop), not a shared field spanning multiple DOM regions. */
  angle: number;
  /** 0..1 starting offset into this star's radial travel cycle — staggers
   * stars around the loop so they don't all spawn at the origin at once. */
  phase: number;
  /** 0 (far) .. 1 (near the viewer) — drives size, drift speed, and
   * parallax response together in the shader (see helpers/shader.ts). */
  depth: number;
  sizePx: number;
  color: [number, number, number];
  twinkleSpeedHz: number;
  twinklePhase: number;
};

export type SpacefieldOriginCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** The corner's own position as a 0..1 fraction of the field's box —
 * SpacefieldBackground resolves this against its own current canvas size
 * every frame (see its render loop), so no external DOM measurement is
 * needed for origin placement at all. */
export function originFractionForCorner(corner: SpacefieldOriginCorner): { x: number; y: number } {
  switch (corner) {
    case 'top-left': return { x: 0, y: 0 };
    case 'top-right': return { x: 1, y: 0 };
    case 'bottom-left': return { x: 0, y: 1 };
    case 'bottom-right': return { x: 1, y: 1 };
    default: return { x: 0, y: 0 };
  }
}

/** A corner-anchored rectangle only ever extends into the one 90° quadrant
 * pointing away from that corner and back into the box — e.g. a field
 * anchored at its own top-right corner only needs angles from straight-down
 * (π/2) through straight-left (π) to reach every point in its own box.
 * Screen-space convention: 0 = +x/right, π/2 = +y/down. */
export function angleRangeForOriginCorner(corner: SpacefieldOriginCorner): { start: number; span: number } {
  const QUARTER_TURN = Math.PI / 2;
  switch (corner) {
    case 'top-left': return { start: 0, span: QUARTER_TURN };
    case 'top-right': return { start: QUARTER_TURN, span: QUARTER_TURN };
    case 'bottom-right': return { start: Math.PI, span: QUARTER_TURN };
    case 'bottom-left': return { start: 3 * QUARTER_TURN, span: QUARTER_TURN };
    default: return { start: 0, span: QUARTER_TURN };
  }
}

// Deterministic, dependency-free PRNG (mulberry32) — this module's only
// consumer of randomness, so a local implementation is simpler than a new
// shared helper for a single call site.
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type StarFieldConfig = Pick<SpacefieldConfig,
  | 'seed'
  | 'sizeMinPx'
  | 'sizeMaxPx'
  | 'temperatureMinK'
  | 'temperatureMaxK'
  | 'colorSaturation'
  | 'twinkleSpeedMinHz'
  | 'twinkleSpeedMaxHz'
>;

/** Same (seed, count, config, angle range) always produces the same field —
 * deliberate, so a live panel edit of an unrelated field (e.g. drift speed)
 * never reshuffles which star is where. angleRangeStart/angleRangeSpan
 * (radians, screen space) bound which directions stars can travel — the
 * caller passes the 90° quadrant its own box occupies relative to its own
 * origin corner (see SpacefieldBackground's originFraction prop). */
export function generateSpacefieldStars(
  config: StarFieldConfig,
  count: number,
  angleRangeStart: number,
  angleRangeSpan: number,
): SpacefieldStar[] {
  const random = createRandom(Math.floor(config.seed * 0xffffffff) >>> 0);
  const stars: SpacefieldStar[] = [];

  for (let index = 0; index < count; index += 1) {
    // Averaging two draws (the same triangular-distribution trick used for
    // temperature below) concentrates stars toward the middle of the
    // range — the 45° diagonal, for a 90° quadrant — without giving up
    // full coverage: the extremes are still reachable, just less crowded,
    // so the dominant visual read is a 45° current rather than an evenly
    // scattered quarter-circle.
    const angle = angleRangeStart + ((random() + random()) / 2) * angleRangeSpan;
    const phase = random();
    const depth = random();
    const sizePx = config.sizeMinPx + random() * (config.sizeMaxPx - config.sizeMinPx);
    // Averaging two draws biases temperature toward the middle of the
    // configured range (a triangular, not uniform, distribution) — most
    // stars land mid-tone (white/yellow-white), with hot blue and cool red
    // outliers rarer, matching how a real night sky mostly reads white with
    // occasional distinctly-colored stars.
    const temperatureT = (random() + random()) / 2;
    const temperatureK = config.temperatureMinK + temperatureT * (config.temperatureMaxK - config.temperatureMinK);
    const color = applyColorSaturation(temperatureToRgb(temperatureK), config.colorSaturation);
    const twinkleSpeedHz = config.twinkleSpeedMinHz
      + random() * (config.twinkleSpeedMaxHz - config.twinkleSpeedMinHz);
    const twinklePhase = random() * Math.PI * 2;

    stars.push({ angle, phase, depth, sizePx, color, twinkleSpeedHz, twinklePhase });
  }

  return stars;
}

export const SPACEFIELD_STAR_STRIDE = 9;

/** Packs into a flat Float32Array (stride 9: angle, phase, depth, size,
 * color.r/g/b, twinkleSpeed, twinklePhase) ready for a single WebGL vertex
 * buffer upload — one attribute set per star, no per-frame CPU work. */
export function packSpacefieldStars(stars: ReadonlyArray<SpacefieldStar>): Float32Array {
  const out = new Float32Array(stars.length * SPACEFIELD_STAR_STRIDE);
  stars.forEach((star, index) => {
    const base = index * SPACEFIELD_STAR_STRIDE;
    out[base + 0] = star.angle;
    out[base + 1] = star.phase;
    out[base + 2] = star.depth;
    out[base + 3] = star.sizePx;
    out[base + 4] = star.color[0];
    out[base + 5] = star.color[1];
    out[base + 6] = star.color[2];
    out[base + 7] = star.twinkleSpeedHz;
    out[base + 8] = star.twinklePhase;
  });
  return out;
}
