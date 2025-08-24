// @ts-nocheck
import { PHI, SQRT_PHI, clamp01, scaleAround1, interp } from './math';
import { hexToOklch, oklchToHex, solveOnPair } from './color';

export function makeLevelsSpec(N) {
  const Lneg = Math.floor((N - 1) / 2);
  const Lpos = N - 1 - Lneg;
  const steps = [];
  let idx = 0;
  for (let lev = -Lneg; lev <= Lpos; lev++, idx++) {
    const key = lev < 0 ? `n${-lev}` : `${lev}`;
    const label = lev < 0 ? `tint-${-lev}` : (lev === 0 ? 'base' : `shade-${lev}`);
    steps.push({ key, label, level: lev, posIndex: idx + 1 });
  }
  steps._neg = Lneg; steps._pos = Lpos;
  return steps;
}
export function xFromLevel(level, Lneg, Lpos) {
  if (level < 0) return Lneg ? -2 * (-level / Lneg) : 0;
  if (level > 0) return Lpos ? 2 * (level / Lpos) : 0;
  return 0;
}

export function ladderLight(baseHex, s, N) {
  const ok = hexToOklch(baseHex) || { L: 0.64, C: 0.2, H: 260 };
  const steps = makeLevelsSpec(N);
  const Lneg = steps._neg, Lpos = steps._pos;

  return steps.map(step => {
    const x = xFromLevel(step.level, Lneg, Lpos);   // [-2 … +2]
    const dL = (-0.05 * x) * s;
    const e  = interp(x, [[-2,-2],[-1,-1],[0,0],[1,0.5],[2,1]]);
    const mC = scaleAround1(Math.pow(PHI, e), s);

    const L = clamp01(ok.L + dL);
    const C = Math.max(0, ok.C * mC);
    const hex = oklchToHex(L, C, ok.H);
    const on  = solveOnPair(hex);
    return { ...step, hex, on };
  });
}

export function ladderDark(baseHex, s, N) {
  const ok = hexToOklch(baseHex) || { L: 0.64, C: 0.2, H: 260 };
  const steps = makeLevelsSpec(N);
  const Lneg = steps._neg, Lpos = steps._pos;

  return steps.map(step => {
    const x = xFromLevel(step.level, Lneg, Lpos);
    const dL   = interp(x, [[-2,0.16],[-1,0.10],[0,0.05],[1,0.00],[2,-0.04]]) * s;
    const mBase= interp(x, [[-2,1/PHI],[-1,1/SQRT_PHI],[0,1.10],[1,1.30],[2,1.50]]);
    const mC = scaleAround1(mBase, s);

    const L = clamp01(ok.L + dL);
    const C = Math.max(0, ok.C * mC);
    const hex = oklchToHex(L, C, ok.H);
    const on  = solveOnPair(hex);
    return { ...step, hex, on };
  });
}
