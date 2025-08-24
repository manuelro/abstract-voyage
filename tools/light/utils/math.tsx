// @ts-nocheck
// φ helpers, clamps, interpolation
export const PHI = (1 + Math.sqrt(5)) / 2;
export const SQRT_PHI = Math.sqrt(PHI);
export const clamp01 = v => Math.min(1, Math.max(0, v));

export function scaleAround1(mult, s) {
  const m = 1 + (mult - 1) * s;
  return Math.max(0.02, Math.min(1.80, m)); // guardrails
}

// piecewise linear interpolation over [ [x,y], ... ]
export const interp = (x, pairs) => {
  if (x <= pairs[0][0]) return pairs[0][1];
  if (x >= pairs[pairs.length - 1][0]) return pairs[pairs.length - 1][1];
  for (let i = 0; i < pairs.length - 1; i++) {
    const [x0, y0] = pairs[i], [x1, y1] = pairs[i + 1];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * t;
    }
  }
  return pairs[0][1];
};

// --- NEW: hue helpers ---
export const wrapHue = (h) => ((h % 360) + 360) % 360;
export const deltaHue = (h1, h2) => {
  const d = Math.abs(wrapHue(h1) - wrapHue(h2));
  return d > 180 ? 360 - d : d; // shortest circular arc in degrees
};
