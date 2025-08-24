// @ts-nocheck
// src/utils/optimizer.js
import { clamp01, wrapHue, deltaHue } from './math';
import { hexToOklch, oklchToHex, contrastRatio } from './color';
import { ladderLight, ladderDark } from './ladder';
import { computeRoleKeys } from './tokens';
import { EXEMPT_USES, MANDATORY_USES } from '../policy';

export const TARGET_TEXT_CR = 4.5;
export const TARGET_UI_CR   = 3.0;

export const DEFAULT_SURFACES = {
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

  // Policy-aware: exclude exempt from denominator; weight mandatory in penalty
  const considered = results.filter(r => !EXEMPT_USES.has(r.use));
  const total = considered.length || 1;
  const passCount = considered.filter(r => r.pass).length;
  const passRate = passCount / total;

  const mandatoryFails = results.filter(r => MANDATORY_USES.has(r.use) && !r.pass).length;

  const penalty = results.reduce((sum, r) => {
    const gap = Math.max(0, r.target - r.cr);
    const weight = MANDATORY_USES.has(r.use) ? 3 : 1;
    return sum + weight * gap;
  }, 0);

  return { results, passCount, total, passRate, penalty, mandatoryFails };
}

/**
 * Adaptive search for the closest base accent that reaches a target pass rate.
 * We preserve brand identity:
 *  - Compare by mandatory-fail count → lower penalty → shorter distance
 *  - Expand trust-region gradually and stop once target is met
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
    // final bounds (trust-region expands up to these)
    maxDL = 0.45,
    maxDC = 0.30,
    coarseStep = 0.02,
    refineStep = 0.01,
    // hue
    allowHueDrift = false,
    hueSpanDeg = 12,
    hueStepDeg = 2,
    // distance weights (tune if needed)
    kL = 1.0,
    kC = 1.0,
    kH = 0.6,
    // optional hard cap on hue deviation
    maxHueDriftDeg = null,
    // chroma guards
    minChromaRatio = 0.7,
    minChromaAbs = 0.06,
    // strategy
    strategy = 'L-first'
  } = opts;

  const ok0 = hexToOklch(baseHex) || { L: 0.64, C: 0.20, H: 260 };
  // Chroma floor cannot exceed the original chroma
  const minC = Math.min(ok0.C, Math.max(minChromaAbs, ok0.C * minChromaRatio));

  // If original already passes, return it unchanged (no drift).
  const baseStats = accentPassStats(baseHex, s, N, surfaces);
  if (baseStats.passRate >= targetPassRate && baseStats.mandatoryFails === 0) {
    return {
      hex: baseHex,
      L: ok0.L, C: ok0.C, H: wrapHue(ok0.H),
      dist: 0,
      ...baseStats,
      metTarget: true,
    };
  }

  // Distance metric with circular hue; normalize hue delta to [0,1] by dividing by 180°.
  const distanceFromBase = (L, C, Hdeg) => {
    const dL = L - ok0.L;
    const dC = C - ok0.C;
    const dHn = deltaHue(Hdeg, ok0.H) / 180; // 0..1
    return Math.hypot(kL * dL, kC * dC, kH * dHn);
  };

  function score(L, C, Hdeg) {
    // Enforce min chroma (but never above original)
    C = Math.max(minC, C);

    // Hard cap on hue drift (if provided)
    if (maxHueDriftDeg != null && deltaHue(Hdeg, ok0.H) > maxHueDriftDeg) return null;

    const hex = oklchToHex(L, C, Hdeg);
    const st = accentPassStats(hex, s, N, surfaces);
    const dist = distanceFromBase(L, C, Hdeg);
    return { hex, L, C, H: wrapHue(Hdeg), dist, ...st };
  }

  // Ordering: fewer mandatory fails → lower penalty → closer distance
  function better(a, b) {
    if (!a) return false;
    if (!b) return true;
    if (a.mandatoryFails !== b.mandatoryFails) return a.mandatoryFails < b.mandatoryFails;
    if (a.penalty !== b.penalty) return a.penalty < b.penalty;
    return a.dist < b.dist;
  }

  // When both meet the target, prefer the closer one. Otherwise use `better`.
  function betterIfMet(a, b) {
    if (!a) return b;
    if (!b) return a;
    const aMet = a.passRate >= targetPassRate && a.mandatoryFails === 0;
    const bMet = b.passRate >= targetPassRate && b.mandatoryFails === 0;
    if (aMet && bMet) return a.dist < b.dist ? a : b; // closest wins
    return better(a, b) ? a : b;
  }

  // Expanding trust-regions (same structure, preserves your L-first identity)
  const Lonly = (dL) => ({ dL, dC: 0, h: 0 });
  const LC     = (dL, dC, h) => ({ dL, dC, h });
  const rings = strategy === 'L-first'
    ? [
        Lonly(Math.min(maxDL, 0.06)),
        Lonly(Math.min(maxDL, 0.10)),
        LC(Math.min(maxDL, 0.14), Math.min(maxDC, 0.04), 0),
        LC(Math.min(maxDL, 0.20), Math.min(maxDC, 0.08), allowHueDrift ? Math.min(hueSpanDeg, 4)  : 0),
        LC(Math.min(maxDL, 0.28), Math.min(maxDC, 0.12), allowHueDrift ? Math.min(hueSpanDeg, 8)  : 0),
        LC(maxDL, maxDC, allowHueDrift ? hueSpanDeg : 0),
      ]
    : [
        LC(Math.min(maxDL, 0.08), Math.min(maxDC, 0.06), 0),
        LC(Math.min(maxDL, 0.12), Math.min(maxDC, 0.08), allowHueDrift ? Math.min(hueSpanDeg, 4)  : 0),
        LC(Math.min(maxDL, 0.18), Math.min(maxDC, 0.12), allowHueDrift ? Math.min(hueSpanDeg, 8)  : 0),
        LC(Math.min(maxDL, 0.30), Math.min(maxDC, 0.20), allowHueDrift ? Math.min(hueSpanDeg, 12) : 0),
        LC(maxDL, maxDC, allowHueDrift ? hueSpanDeg : 0),
      ];

  let globalBest = {
    hex: baseHex, L: ok0.L, C: ok0.C, H: wrapHue(ok0.H),
    passRate: baseStats.passRate,
    penalty: baseStats.penalty,
    total: baseStats.total,
    passCount: baseStats.passCount,
    mandatoryFails: baseStats.mandatoryFails,
    dist: 0
  };

  for (const ring of rings) {
    const Hs = ring.h > 0
      ? Array.from({ length: Math.floor((ring.h * 2) / hueStepDeg) + 1 },
          (_, i) => wrapHue(ok0.H - ring.h + i * hueStepDeg))
      : [wrapHue(ok0.H)];

    let ringBest = globalBest;

    for (const Hdeg of Hs) {
      // Coarse search for this hue
      let bestForHue = null;

      for (let dL = -ring.dL; dL <= ring.dL + 1e-9; dL += coarseStep) {
        for (let dC = -ring.dC; dC <= ring.dC + 1e-9; dC += (ring.dC === 0 ? ring.dC + 1 : coarseStep)) {
          const L = clamp01(ok0.L + dL);
          const C = Math.max(0, ok0.C + dC);
          const cand = score(L, C, Hdeg);
          if (!cand) continue;

          bestForHue = betterIfMet(cand, bestForHue);
          ringBest   = betterIfMet(bestForHue, ringBest);
          globalBest = betterIfMet(ringBest, globalBest);
        }
      }

      // Refine around the best for THIS hue (not the global best)
      const center = bestForHue || ringBest || globalBest;
      for (let dL = -coarseStep; dL <= coarseStep + 1e-9; dL += refineStep) {
        for (let dC = -coarseStep; dC <= coarseStep + 1e-9; dC += refineStep) {
          const L = clamp01(center.L + dL);
          const C = Math.max(0, center.C + dC);
          const cand = score(L, C, Hdeg);
          if (!cand) continue;

          bestForHue = betterIfMet(cand, bestForHue);
          ringBest   = betterIfMet(bestForHue, ringBest);
          globalBest = betterIfMet(ringBest, globalBest);
        }
      }
    }

    // If we’ve hit the target in this ring, stop expanding (prevents unnecessary drift).
    if (globalBest.passRate >= targetPassRate && globalBest.mandatoryFails === 0) break;
  }

  const metTarget = globalBest.passRate >= targetPassRate && globalBest.mandatoryFails === 0;
  return { ...globalBest, metTarget };
}
