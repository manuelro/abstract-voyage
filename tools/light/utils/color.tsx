// @ts-nocheck
// utils/color.ts
import { clamp01 } from './math';

// sRGB gamma helpers
const toSRGB = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
const fromSRGB = (x: number) => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));

export function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

export function rgbToHex(r: number, g: number, b: number) {
  return (
    '#' +
    [r, g, b]
      .map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function hexToOklch(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const rl = fromSRGB(rgb.r / 255), gl = fromSRGB(rgb.g / 255), bl = fromSRGB(rgb.b / 255);

  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H };
}

export function oklchToHex(L: number, C: number, Hdeg: number) {
  const h = ((Hdeg % 360) * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  let l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;

  let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let b2 = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  if (r < 0 || r > 1 || g < 0 || g > 1 || b2 < 0 || b2 > 1) {
    // bisection on chroma to gamut-map
    let lo = 0, hi = C, mid = 0;
    for (let i = 0; i < 22; i++) {
      mid = (lo + hi) / 2;
      const aa = mid * Math.cos(h), bb = mid * Math.sin(h);
      const l1 = (L + 0.3963377774 * aa + 0.2158037573 * bb) ** 3;
      const m1 = (L - 0.1055613458 * aa - 0.0638541728 * bb) ** 3;
      const s1 = (L - 0.0894841775 * aa - 1.291485548 * bb) ** 3;
      const rr = 4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1;
      const gg = -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1;
      const bb2 = -0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1;
      if (rr >= 0 && rr <= 1 && gg >= 0 && gg <= 1 && bb2 >= 0 && bb2 <= 1) {
        lo = mid; r = rr; g = gg; b2 = bb2;
      } else {
        hi = mid;
      }
    }
  }

  const R = Math.round(clamp01(toSRGB(r)) * 255);
  const G = Math.round(clamp01(toSRGB(g)) * 255);
  const B = Math.round(clamp01(toSRGB(b2)) * 255);
  return rgbToHex(R, G, B);
}

export function contrastRatio(hex1: string, hex2: string) {
  const comp = (h: string) => ({ r: parseInt(h.slice(1,3),16), g: parseInt(h.slice(3,5),16), b: parseInt(h.slice(5,7),16) });
  const s = (v: number) => { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const Lf = ({ r, g, b }: any) => 0.2126 * s(r) + 0.7152 * s(g) + 0.0722 * s(b);
  const L1 = Lf(comp(hex1)), L2 = Lf(comp(hex2));
  const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

export function bestOn(bgHex: string) {
  return contrastRatio(bgHex, '#FFFFFF') >= contrastRatio(bgHex, '#0A0B0D') ? '#FFFFFF' : '#0A0B0D';
}

export function solveOnPair(bgHex: string) {
  let on = bestOn(bgHex);
  if (contrastRatio(bgHex, on) >= 4.5) return on;
  const towardBlack = contrastRatio(bgHex, '#0A0B0D') > contrastRatio(bgHex, '#FFFFFF');
  const ok = hexToOklch(on) || { L: 0.64, C: 0.2, H: 260 };
  let { L, C, H } = ok;
  for (let i = 0; i < 32; i++) {
    L = clamp01(L + (towardBlack ? -0.01 : +0.01));
    const trial = oklchToHex(L, C, H);
    if (contrastRatio(bgHex, trial) >= 4.5) return trial;
  }
  return on;
}

export const isValidHex = (v: string) => {
  v = v.trim(); if (!v.startsWith('#')) v = '#' + v;
  return /^#([0-9A-Fa-f]{6})$/.test(v);
};
export const normHex = (v: string) => {
  v = v.trim().toUpperCase(); if (!v.startsWith('#')) v = '#' + v; return v;
};

// NEW: nearestAccessibleFG — keep here (no imports from './color'!)
export function nearestAccessibleFG(bgHex: string, fgHex: string, target = 4.5) {
  if (contrastRatio(bgHex, fgHex) >= target) return fgHex;

  const fg = hexToOklch(fgHex) || { L: 0.64, C: 0.2, H: 260 };

  function search(dir: 1 | -1) {
    let lo = dir > 0 ? fg.L : 0;
    let hi = dir > 0 ? 1 : fg.L;
    let best: { hex: string; dL: number } | null = null;

    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      const trial = oklchToHex(mid, fg.C, fg.H);
      const cr = contrastRatio(bgHex, trial);
      if (cr >= target) {
        best = { hex: trial, dL: Math.abs(mid - fg.L) };
        if (dir > 0) hi = mid; else lo = mid;
      } else {
        if (dir > 0) lo = mid; else hi = mid;
      }
    }
    return best;
  }

  const a = fg.L < 1 ? search(1) : null;
  const b = fg.L > 0 ? search(-1) : null;
  const pick = [a, b].filter(Boolean).sort((x, y) => (x!.dL - (y as any).dL))[0] as any;
  if (pick) return pick.hex;

  return contrastRatio(bgHex, '#000000') >= contrastRatio(bgHex, '#FFFFFF') ? '#000000' : '#FFFFFF';
}
