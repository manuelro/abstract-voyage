// @ts-nocheck
// Color Vision Deficiency simulation (linear sRGB + Brettel-ish matrices)

import { hexToRgb, rgbToHex } from './color';

type Mode = 'none'|'protanopia'|'deuteranopia'|'tritanopia'|'monochrome';

function toLinear(v:number){ v/=255; return v<=0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }
function toGamma(v:number){ return v<=0.0031308 ? 12.92*v : 1.055*Math.pow(v,1/2.4)-0.055; }

const MAT = {
  protanopia:   [[0.0,1.05118294,-0.05116099],[0.0,1.0,0.0],[0.0,0.0,1.0]],
  deuteranopia: [[1.0,0.0,0.0],[0.9513092,0.0,0.04866992],[0.0,0.0,1.0]],
  tritanopia:   [[1.0,0.0,0.0],[0.0,1.0,0.0],[-0.86744736,1.86727089,0.0]],
};

export function simulateHex(hex:string, mode:Mode){
  if (mode==='none') return hex;
  const rgb = hexToRgb(hex); if(!rgb) return hex;

  let r=toLinear(rgb.r), g=toLinear(rgb.g), b=toLinear(rgb.b);
  if (mode==='monochrome'){
    const y = 0.2126*r + 0.7152*g + 0.0722*b;
    r=g=b=y;
  } else {
    const m = (MAT as any)[mode];
    const R = m[0][0]*r + m[0][1]*g + m[0][2]*b;
    const G = m[1][0]*r + m[1][1]*g + m[1][2]*b;
    const B = m[2][0]*r + m[2][1]*g + m[2][2]*b;
    r = Math.max(0, Math.min(1, R));
    g = Math.max(0, Math.min(1, G));
    b = Math.max(0, Math.min(1, B));
  }
  const R = Math.round(Math.max(0,Math.min(255, toGamma(r)*255)));
  const G = Math.round(Math.max(0,Math.min(255, toGamma(g)*255)));
  const B = Math.round(Math.max(0,Math.min(255, toGamma(b)*255)));
  return rgbToHex(R,G,B);
}

// Apply simulation to a style-vars object (only hex values)
export function applyCvdToStyleVars(style:any, mode:Mode){
  if (mode==='none') return {};
  const out:any = {};
  for (const k in style){
    const v = style[k];
    if (typeof v === 'string' && /^#([0-9A-Fa-f]{6})$/.test(v.trim())){
      out[k] = simulateHex(v.trim(), mode);
    }
  }
  return out;
}
