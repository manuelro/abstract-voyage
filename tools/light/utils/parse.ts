// @ts-nocheck
import { oklchToHex } from './color';

// Parse #RGB, #RRGGBB, or oklch(L C H[deg])
export function parseHexOrOklch(input:string){
  if (!input) return null;
  let v = input.trim();

  // hex 3/6
  if (/^#?[0-9a-f]{3}$/i.test(v)){
    if (!v.startsWith('#')) v = '#'+v;
    const r=v[1], g=v[2], b=v[3];
    return ('#'+r+r+g+g+b+b).toUpperCase();
  }
  if (/^#?[0-9a-f]{6}$/i.test(v)){
    if (!v.startsWith('#')) v = '#'+v;
    return v.toUpperCase();
  }

  // oklch()
  const m = /^oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)(deg)?\s*(?:\/\s*([0-9.]+%?))?\s*\)$/i.exec(v);
  if (m){
    let Ls = m[1], C = parseFloat(m[2]), H = parseFloat(m[3]);
    let L = /%$/.test(Ls) ? parseFloat(Ls)/100 : parseFloat(Ls);
    if (isNaN(L) || isNaN(C) || isNaN(H)) return null;
    return oklchToHex(L, Math.max(0,C), H);
  }
  return null;
}

// Parse a brand palette list (CSV or lines)
// Accept: "Primary, #3366FF" or "Accent ok, oklch(0.62 0.16 255)"
export function parsePalette(text:string){
  const lines = String(text||'').split(/\r?\n/);
  const out: {name:string; hex:string}[] = [];
  for (const line of lines){
    const s = line.trim();
    if (!s) continue;
    const parts = s.split(/[,\t]+/);
    const name = parts[0].trim() || 'Color';
    const colorStr = (parts[1] || parts[0]).trim();
    const hex = parseHexOrOklch(colorStr);
    if (hex) out.push({ name, hex });
  }
  return out;
}
