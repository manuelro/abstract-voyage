// @ts-nocheck
// Minimal APCA Lc approximation (SAPC v0.98-like). For design-time audit.
// Optimizer still uses WCAG contrast ratio.

const srgbToLinear = (c:number) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

function relLuminance(hex:string){
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  return 0.2126729*R + 0.7151522*G + 0.0721750*B;
}

// tuned constants
const blkThrs=0.022, blkClmp=1.414;
const normBG=0.56, normTXT=0.57;
const revBG=0.65,  revTXT=0.62;
const scaleN=1.14, scaleR=1.14;
const clip=0.01;

export function apcaLc(fore:string, back:string){
  let Ytxt = relLuminance(fore);
  let Ybg  = relLuminance(back);

  const normal = Ybg >= Ytxt;

  const adj = (Y:number) => (Y <= blkThrs ? Y + Math.pow(blkThrs - Y, blkClmp) : Y);
  Ytxt = adj(Ytxt); Ybg = adj(Ybg);

  const Lc = normal
    ? (Math.pow(Ybg, normBG) - Math.pow(Ytxt, normTXT)) * scaleN * 100
    : (Math.pow(Ybg, revBG)  - Math.pow(Ytxt, revTXT))  * scaleR * 100;

  if (Math.abs(Lc) < clip*100) return 0;
  return Math.abs(Lc);
}
