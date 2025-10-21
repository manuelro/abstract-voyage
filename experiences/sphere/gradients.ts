import { hexToOklch, oklchToHex } from '../../tools/light/utils/color'
import { ladderLight, ladderDark } from '../../tools/light/utils/ladder'

// Perceptual OKLCH mix, compatible with existing signature — hvle
const mixHex = (a: any, b: any, t: number) => {
  const A = hexToOklch(a) || { L: 0.5, C: 0.1, H: 0 };
  const B = hexToOklch(b) || A;
  const dH = ((B.H - A.H + 540) % 360) - 180;
  const L = A.L + (B.L - A.L) * t;
  const C = Math.max(0, A.C + (B.C - A.C) * t);
  const H = (A.H + dH * t + 360) % 360;
  return oklchToHex(L, C, H);
};

// New: palette builder reusing the light tool (+ optional intensity scaling) — hvle
export function buildPalette(
  baseHex: string,
  opts?: { theme?: 'light' | 'dark'; steps?: number; delta?: number; sat?: number; light?: number }
): string[] {
  const theme = opts?.theme ?? 'dark';
  const steps = Math.max(2, Math.floor(opts?.steps ?? 9));
  const delta = opts?.delta ?? 1.2720196495; // √φ
  const satMul = opts?.sat ?? 1;
  const lightMul = opts?.light ?? 1;

  const ladder = theme === 'light' ? ladderLight : ladderDark;
  const rows = ladder(baseHex, delta, steps); // [{ hex, ... }, ...]
  return rows.map(r => {
    const ok = hexToOklch(r.hex) || { L: 0.64, C: 0.2, H: 260 };
    const L = Math.max(0, Math.min(1, ok.L * lightMul));
    const C = Math.max(0, ok.C * satMul);
    return oklchToHex(L, C, ok.H);
  });
}

// New: export CSS variables from a palette for index-based use — hvle
export function paletteVars(palette: string[], prefix = '--pal-'): Record<string, string> {
  const vars: Record<string, string> = {};
  for (let i = 0; i < palette.length; i++) vars[`${prefix}${i}`] = palette[i];
  vars[`${prefix}size`] = String(palette.length);
  return vars;
}


export function makeVerticalHQGradient(a: string | number, b: string | number, enableExtra: boolean) {
  const tone = (c: string | number) => `color(from ${c} oklch calc(l * var(--sphere-grad-light, 1)) calc(c * var(--sphere-grad-sat, 1)) h)`; // scale lightness & chroma
  if (!enableExtra) return `linear-gradient(in oklch to bottom, ${tone(a)} 0%, ${tone(b)} 100%)` // hvle
  const stops = [0, 0.12, 0.28, 0.56, 0.72, 0.88, 1]
  const parts = stops.map((p) => `${tone(mixHex(a, b, p))} ${Math.round(p * 100)}%`) // hvle
  return `linear-gradient(in oklch to bottom, ${parts.join(', ')})` // hvle
}

// export default as well, so both `import { makeVerticalHQGradient }` and `import makeVerticalHQGradient` work
export default makeVerticalHQGradient
