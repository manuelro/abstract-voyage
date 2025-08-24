// @ts-nocheck
// src/utils/optimizer.js
// Accent pass-rate stats + nearest-base optimization with small hue drift and wider window.
import { hexToOklch, oklchToHex, contrastRatio } from './color';
import { ladderLight, ladderDark } from './ladder';
import { computeRoleKeys } from './tokens';

export const TARGET_TEXT_CR = 4.5;
export const TARGET_UI_CR   = 3.0;

const clamp01 = v => Math.min(1, Math.max(0, v));

const DEFAULT_SURFACES = {
  light: { bg: '#F7F9FC', surface: '#FFFFFF' },
  dark:  { bg: '#0C1116', surface: '#0F141A' }
};

export function adjustLightness(hex, dL) {
  const ok = hexToOklch(hex) || { L: 0.64, C: 0.20, H: 260 };
  const L = clamp01(ok.L + dL);
  return oklchToHex(L, ok.C, ok.H);
}

// Build accent-driven checks we can influence by changing the base accent.
function accentChecks(baseHex, s, N, surfaces = DEFAULT_SURFACES) {
  const stepsL = ladderLight(baseHex, s, N);
  const stepsD = ladderDark(baseHex,  s, N);

  const rolesL = computeRoleKeys(stepsL);
  const rolesD = computeRoleKeys(stepsD);

  const getHexByKey = (steps, key) => (steps.find(st => st.key === key) || steps[0]).hex;

  const L_s1 = getHexByKey(stepsL, rolesL.kShade1);
  const L_s2 = getHexByKey(stepsL, rolesL.kShade2);
  const D_s1 = getHexByKey(stepsD, rolesD.kShade1);
  const D_s2 = getHexByKey(stepsD, rolesD.kShade2);

  const L_ring = getHexByKey(stepsL, rolesL.kDef);
  const D_ring = getHexByKey(stepsD, rolesD.kDef);

  return [
    // Light links (text 4.5:1)
    { use:'Link on bg',               fg:L_s1, bg:surfaces.light.bg,      target:TARGET_TEXT_CR },
    { use:'Link on surface',          fg:L_s1, bg:surfaces.light.surface, target:TARGET_TEXT_CR },
    { use:'Link (strong) on bg',      fg:L_s2, bg:surfaces.light.bg,      target:TARGET_TEXT_CR },
    { use:'Link (strong) on surface', fg:L_s2, bg:surfaces.light.surface, target:TARGET_TEXT_CR },
    // Dark links
    { use:'Link on bg',               fg:D_s1, bg:surfaces.dark.bg,       target:TARGET_TEXT_CR },
    { use:'Link on surface',          fg:D_s1, bg:surfaces.dark.surface,  target:TARGET_TEXT_CR },
    { use:'Link (strong) on bg',      fg:D_s2, bg:surfaces.dark.bg,       target:TARGET_TEXT_CR },
    { use:'Link (strong) on surface', fg:D_s2, bg:surfaces.dark.surface,  target:TARGET_TEXT_CR },
    // Focus rings (UI 3:1)
    { use:'Focus ring vs bg (light)', fg:L_ring, bg:surfaces.light.bg,    target:TARGET_UI_CR   },
    { use:'Focus ring vs bg (dark)',  fg:D_ring, bg:surfaces.dark.bg,     target:TARGET_UI_CR   },
  ];
}

export function accentPassStats(baseHex, s, N, surfaces = DEFAULT_SURFACES) {
  const checks = accentChecks(baseHex, s, N, surfaces);
  const results = checks.map(c => {
    const cr = contrastRatio(c.fg, c.bg);
    return { ...c, cr, pass: cr >= c.target };
  });
  const total = results.length || 1;
  const passCount = results.filter(r => r.pass).length;
  const passRate = passCount / total;
  const penalty = results.reduce((sum, r) => sum + Math.max(0, r.target - r.cr), 0);
  return { results, passCount, total, passRate, penalty };
}

/**
 * Adaptive search for the closest base accent that reaches a target pass rate.
 * - Wider L/C window (±0.45 L, ±0.30 C)
 * - Small hue drift (±12°)
 * - Returns candidate, passRate, metTarget.
 */
export function findNearestPassingBase(
  baseHex,
  s,
  N,
  surfaces = DEFAULT_SURFACES,
  opts = {}
) {
  const {
    targetPassRate = 0.95,
    // initial window (already wide)
    maxDL = 0.45,
    maxDC = 0.30,
    coarseStep = 0.02,
    refineStep = 0.01,
    // hue drift (±12°)
    allowHueDrift = true,
    hueSpanDeg = 12,
    hueStepDeg = 2
  } = opts;

  const ok = hexToOklch(baseHex) || { L:0.64, C:0.20, H:260 };

  function score(L, C, Hdeg) {
    const hex = oklchToHex(L, C, Hdeg);
    const st = accentPassStats(hex, s, N, surfaces);
    const huePenalty = allowHueDrift ? Math.abs(Hdeg - ok.H) / 360 * 0.2 : 0; // small cost
    const dist = Math.hypot(L - ok.L, 0.5 * (C - ok.C)) + huePenalty;
    return { hex, L, C, H: Hdeg, dist, ...st };
  }

  let best = {
    hex: baseHex, L: ok.L, C: ok.C, H: ok.H,
    passRate: -1, penalty: Infinity, dist: Infinity
  };

  const Hs = allowHueDrift
    ? Array.from({length: Math.floor((hueSpanDeg*2)/hueStepDeg)+1}, (_,i)=> ok.H - hueSpanDeg + i*hueStepDeg)
    : [ok.H];

  for (const Hdeg of Hs) {
    for (let dL = -maxDL; dL <= maxDL; dL += coarseStep) {
      for (let dC = -maxDC; dC <= maxDC; dC += coarseStep) {
        const L = clamp01(ok.L + dL);
        const C = Math.max(0, ok.C + dC);
        const cand = score(L, C, Hdeg);

        const meets = cand.passRate >= targetPassRate;
        const bestMeets = best.passRate >= targetPassRate;

        if (meets && !bestMeets) best = cand;
        else if (meets && bestMeets && cand.dist < best.dist) best = cand;
        else if (!bestMeets) {
          const better =
            cand.passRate > best.passRate ||
            (cand.passRate === best.passRate && (cand.penalty < best.penalty ||
             (cand.penalty === best.penalty && cand.dist < best.dist)));
          if (better) best = cand;
        }
      }
    }

    // refine around best for this hue
    const center = { L: best.L, C: best.C };
    for (let dL = -coarseStep; dL <= coarseStep; dL += refineStep) {
      for (let dC = -coarseStep; dC <= coarseStep; dC += refineStep) {
        const L = clamp01(center.L + dL);
        const C = Math.max(0, center.C + dC);
        const cand = score(L, C, Hdeg);

        const meets = cand.passRate >= targetPassRate;
        const bestMeets = best.passRate >= targetPassRate;

        if (meets && !bestMeets) best = cand;
        else if (meets && bestMeets && cand.dist < best.dist) best = cand;
        else if (!bestMeets) {
          const better =
            cand.passRate > best.passRate ||
            (cand.passRate === best.passRate && (cand.penalty < best.penalty ||
             (cand.penalty === best.penalty && cand.dist < best.dist)));
          if (better) best = cand;
        }
      }
    }
  }

  const metTarget = best.passRate >= targetPassRate;
  return { ...best, metTarget };
}
