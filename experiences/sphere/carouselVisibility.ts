// Central knobs for how visible a slide is when it’s not centered.
// Adjust here—no need to touch the carousel logic.

export const CAROUSEL_VIS = {
  /**
   * No visibility until this much of the slide overlaps the sphere (0..1).
   * Raise this to hide side slides more aggressively.
   */
  cutoffFrac: 0.18,

  /**
   * Curve shaping for visibility (>=1). 1 = linear, 2+ = steeper falloff.
   * Higher => side slides fade faster as they leave center.
   */
  power: 2.2,

  /**
   * Opacity floor once above cutoff (0..1). Keep 0 to fully hide below curve.
   * Set to e.g. 0.05 if you want a tiny “ghost” on side slides.
   */
  minOpacity: 0.0,
}
