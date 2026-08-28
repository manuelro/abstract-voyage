export type SpacefieldNarrowBehavior = 'static' | 'reduced' | 'hidden';

/**
 * Config for the starfield that replaces about.tsx's header and hero-panel
 * backgrounds outright (see SpacefieldBackground.tsx) — not a decorative
 * accent layered on top of them. Off by default (`enabled: false`) — this
 * is a deliberate, opt-in flourish, not something every deployment should
 * get for free, matching this codebase's existing pattern for experimental
 * generative backgrounds (see BorealisConfig).
 */
export type SpacefieldConfig = {
  enabled: boolean;
  respectReducedMotion: boolean;
  /** Painted behind the stars, filling this instance's entire mounted box —
   * the "night sky" the stars actually read against, replacing whatever
   * solid background color that region used before (see about.tsx). */
  backgroundColor: string;
  /** Seeds the deterministic star layout (position angle, size, temperature,
   * twinkle phase) — same seed always produces the same field. */
  seed: number;
  starCount: number;
  sizeMinPx: number;
  sizeMaxPx: number;
  /** Blackbody temperature range (Kelvin) stars are sampled from — drives
   * color the same way real starlight does: cooler stars read red/orange,
   * hotter stars read white/blue-white. See helpers/starColor.ts. */
  temperatureMinK: number;
  temperatureMaxK: number;
  /** 1 = the blackbody color as computed; below 1 pulls toward white
   * (washed out, more uniform); above 1 pushes further from white (more
   * saturated, more distinctly tinted stars). */
  colorSaturation: number;
  twinkleSpeedMinHz: number;
  twinkleSpeedMaxHz: number;
  /** How much a star's brightness dips at the low point of its twinkle
   * cycle — 0 disables twinkle (constant brightness), 1 dips to fully dark. */
  twinkleAmount: number;
  /** Outward drift speed, in px/sec, shared by every star — how the radius
   * itself accelerates as a star approaches is governed by
   * perspectiveStrength below, not a per-star speed variance. */
  driftSpeedPxPerSec: number;
  /** How strongly a star's depth (an intrinsic, fixed-per-star 0 far..1
   * near roll — real stars really do vary in physical size) affects its
   * size — 0 makes every star the same size regardless, 1 is the full
   * spread. Independent of, and layered underneath, the approach-based
   * growth below (approachSizeMin/Max) — this is "some stars are just
   * bigger," that is "every star grows as it nears you." */
  depthStrength: number;
  /** 0 = a star's radius grows linearly with time (constant apparent
   * speed) — the star field's own version of a dolly-zoom: real forward
   * motion through a 3D star field projects onto 2D as radius ∝ 1/depth,
   * so stars crawl near the origin and rocket past near the edge. Toward
   * its max (0.95), that acceleration gets sharper; 0 is the old, pre-
   * perspective linear behavior. See helpers/shader.ts's own radius curve. */
  perspectiveStrength: number;
  /** Size multiplier at the very start of a star's journey (near the
   * origin) — kept below 1 so freshly-spawned stars read as distant.
   * Multiplies on top of the intrinsic depthStrength/aDepth size, not a
   * replacement for it. */
  approachSizeMin: number;
  /** Size multiplier at the far end of a star's journey (near the edge of
   * its travel, i.e. "near the viewer") — kept above 1 so stars visibly
   * grow as they approach, the same forward-motion cue perspectiveStrength
   * drives positionally. */
  approachSizeMax: number;
  /** Parallax offset, in px, applied to the nearest-depth stars per unit of
   * normalized pointer distance from viewport center — nearer stars move
   * more, matching real depth parallax. */
  parallaxStrengthPx: number;
  /** Damping time constant (ms) the pointer-driven parallax offset eases
   * toward its target with — higher reads as heavier/calmer, lower as more
   * immediately responsive. */
  parallaxResponseMs: number;
  /** Multiplies this instance's own box diagonal (self-computed from its
   * current canvas size every frame — see SpacefieldBackground's render
   * loop) to get the radius stars travel out to before looping back to the
   * origin. 1.0 exactly reaches the box's farthest corner; kept slightly
   * above 1 by default so stars visibly reach every edge rather than
   * thinning out just short of it. */
  fieldRadiusScale: number;
  /** Renders a soft CSS radial-gradient bloom centered exactly at this
   * instance's own origin point (see SpacefieldBackground's originFraction)
   * — anchors the vanishing point visually instead of leaving it an
   * inferred, invisible spot the eye has to reconstruct from where stars
   * happen to start. Plain CSS, not WebGL — origin is already a static
   * (corner-derived) fraction, so there's nothing here that needs a shader. */
  focalGlowEnabled: boolean;
  /** How far the glow extends before fading to transparent, as a
   * percentage of this instance's own box (self-sized, like everything
   * else here — no DOM measurement). */
  focalGlowRadiusPercent: number;
  /** Alpha of the glow's own inner (brightest) stop. */
  focalGlowIntensity: number;
  focalGlowColor: string;
  /** Overall layer opacity ceiling. */
  opacity: number;
  /** Device pixel ratio is capped at this value for the canvas backing
   * buffer — real DPR is still used for on-screen CSS size, only the
   * render target resolution is capped, matching pages/wave.tsx and
   * BorealisBackground's own DPR handling. */
  maxDevicePixelRatio: number;
  /** Below this opacity the render loop stops scheduling frames entirely
   * (matches BorealisConfig's pauseBelowStrength) — avoids burning a raf
   * loop on a layer nobody can see. */
  pauseBelowOpacity: number;
  /** How the field behaves on a narrow viewport (see helpers/viewport.ts's
   * narrow < 768 convention, already used elsewhere on this page): 'static'
   * renders one frame with no ongoing raf loop or parallax (touch devices
   * have no hover to lose anyway); 'reduced' keeps the raf loop but at
   * narrowStarCountScale of the configured star count; 'hidden' unmounts
   * the field entirely. */
  narrowBehavior: SpacefieldNarrowBehavior;
  /** Only used while narrowBehavior is 'reduced'. */
  narrowStarCountScale: number;
};

export const DEFAULT_SPACEFIELD_CONFIG: SpacefieldConfig = {
  enabled: false,
  respectReducedMotion: true,
  backgroundColor: '#05050f',
  seed: 0.647,
  starCount: 90,
  sizeMinPx: 8,
  sizeMaxPx: 16,
  temperatureMinK: 2000,
  temperatureMaxK: 10500,
  colorSaturation: 1.5,
  twinkleSpeedMinHz: 0.14,
  twinkleSpeedMaxHz: 0.52,
  twinkleAmount: 0.4,
  driftSpeedPxPerSec: 12,
  depthStrength: 1,
  perspectiveStrength: 0.79,
  approachSizeMin: 0.4,
  approachSizeMax: 2,
  parallaxStrengthPx: 50,
  parallaxResponseMs: 0,
  fieldRadiusScale: 3,
  focalGlowEnabled: true,
  focalGlowRadiusPercent: 150,
  focalGlowIntensity: 1.65,
  focalGlowColor: '#05050f',
  opacity: 0.92,
  maxDevicePixelRatio: 1.7,
  pauseBelowOpacity: 0.05,
  narrowBehavior: 'static',
  narrowStarCountScale: 0.4,
};

const NARROW_BEHAVIORS: ReadonlyArray<SpacefieldNarrowBehavior> = ['static', 'reduced', 'hidden'];

const token = <T extends string>(value: unknown, values: ReadonlyArray<T>, fallback: T): T => (
  typeof value === 'string' && (values as ReadonlyArray<string>).includes(value) ? value as T : fallback
);
const clampRange = (value: unknown, min: number, max: number, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
);
const bool = (value: unknown, fallback: boolean): boolean => (
  typeof value === 'boolean' ? value : fallback
);
const color = (value: unknown, fallback: string): string => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
};

export function normalizeSpacefieldConfig(
  config: Partial<SpacefieldConfig> | undefined,
): SpacefieldConfig {
  const base = { ...DEFAULT_SPACEFIELD_CONFIG, ...(config ?? {}) };
  return {
    enabled: bool(base.enabled, DEFAULT_SPACEFIELD_CONFIG.enabled),
    respectReducedMotion: bool(base.respectReducedMotion, DEFAULT_SPACEFIELD_CONFIG.respectReducedMotion),
    backgroundColor: color(base.backgroundColor, DEFAULT_SPACEFIELD_CONFIG.backgroundColor),
    seed: clampRange(base.seed, 0, 1, DEFAULT_SPACEFIELD_CONFIG.seed),
    starCount: Math.round(clampRange(base.starCount, 20, 800, DEFAULT_SPACEFIELD_CONFIG.starCount)),
    sizeMinPx: clampRange(base.sizeMinPx, 0.2, 8, DEFAULT_SPACEFIELD_CONFIG.sizeMinPx),
    sizeMaxPx: clampRange(base.sizeMaxPx, 0.5, 16, DEFAULT_SPACEFIELD_CONFIG.sizeMaxPx),
    temperatureMinK: clampRange(base.temperatureMinK, 1500, 8000, DEFAULT_SPACEFIELD_CONFIG.temperatureMinK),
    temperatureMaxK: clampRange(base.temperatureMaxK, 4000, 25000, DEFAULT_SPACEFIELD_CONFIG.temperatureMaxK),
    colorSaturation: clampRange(base.colorSaturation, 0, 1.5, DEFAULT_SPACEFIELD_CONFIG.colorSaturation),
    twinkleSpeedMinHz: clampRange(base.twinkleSpeedMinHz, 0.02, 3, DEFAULT_SPACEFIELD_CONFIG.twinkleSpeedMinHz),
    twinkleSpeedMaxHz: clampRange(base.twinkleSpeedMaxHz, 0.05, 4, DEFAULT_SPACEFIELD_CONFIG.twinkleSpeedMaxHz),
    twinkleAmount: clampRange(base.twinkleAmount, 0, 1, DEFAULT_SPACEFIELD_CONFIG.twinkleAmount),
    driftSpeedPxPerSec: clampRange(base.driftSpeedPxPerSec, 0, 80, DEFAULT_SPACEFIELD_CONFIG.driftSpeedPxPerSec),
    depthStrength: clampRange(base.depthStrength, 0, 1, DEFAULT_SPACEFIELD_CONFIG.depthStrength),
    perspectiveStrength: clampRange(
      base.perspectiveStrength, 0, 0.95, DEFAULT_SPACEFIELD_CONFIG.perspectiveStrength,
    ),
    approachSizeMin: clampRange(base.approachSizeMin, 0.05, 2, DEFAULT_SPACEFIELD_CONFIG.approachSizeMin),
    approachSizeMax: clampRange(base.approachSizeMax, 0.5, 5, DEFAULT_SPACEFIELD_CONFIG.approachSizeMax),
    parallaxStrengthPx: clampRange(base.parallaxStrengthPx, 0, 100, DEFAULT_SPACEFIELD_CONFIG.parallaxStrengthPx),
    parallaxResponseMs: clampRange(base.parallaxResponseMs, 0, 1200, DEFAULT_SPACEFIELD_CONFIG.parallaxResponseMs),
    fieldRadiusScale: clampRange(base.fieldRadiusScale, 0.5, 3, DEFAULT_SPACEFIELD_CONFIG.fieldRadiusScale),
    focalGlowEnabled: bool(base.focalGlowEnabled, DEFAULT_SPACEFIELD_CONFIG.focalGlowEnabled),
    focalGlowRadiusPercent: clampRange(
      base.focalGlowRadiusPercent, 5, 150, DEFAULT_SPACEFIELD_CONFIG.focalGlowRadiusPercent,
    ),
    focalGlowIntensity: clampRange(base.focalGlowIntensity, 0, 2, DEFAULT_SPACEFIELD_CONFIG.focalGlowIntensity),
    focalGlowColor: color(base.focalGlowColor, DEFAULT_SPACEFIELD_CONFIG.focalGlowColor),
    opacity: clampRange(base.opacity, 0, 1, DEFAULT_SPACEFIELD_CONFIG.opacity),
    maxDevicePixelRatio: clampRange(base.maxDevicePixelRatio, 1, 3, DEFAULT_SPACEFIELD_CONFIG.maxDevicePixelRatio),
    pauseBelowOpacity: clampRange(base.pauseBelowOpacity, 0, 0.2, DEFAULT_SPACEFIELD_CONFIG.pauseBelowOpacity),
    narrowBehavior: token(base.narrowBehavior, NARROW_BEHAVIORS, DEFAULT_SPACEFIELD_CONFIG.narrowBehavior),
    narrowStarCountScale: clampRange(
      base.narrowStarCountScale, 0.05, 1, DEFAULT_SPACEFIELD_CONFIG.narrowStarCountScale,
    ),
  };
}
