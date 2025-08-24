// @ts-nocheck
'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
// import './styles.css';

import Controls from './components/Controls';
import LadderGrid from './components/LadderGrid';
import TinyUIPreview from './components/TinyUIPreview';
import A11yAudit from './components/A11yAudit';
import TokensOutput from './components/TokensOutput';
import Toast from './components/Toast';

import useToast from './hooks/useToast';
import { ladderLight, ladderDark } from './utils/ladder';
import { buildScopeVars } from './utils/tokens';
import { accentPassStats, findNearestPassingBase, adjustLightness } from './utils/optimizer';
import { tweenHexOKLCH, tweenNumber } from './utils/animate';

const DEFAULT_HEX    = '#6D94A2';
const DEFAULT_DELTA  = 1.6180339887; // √φ
const DEFAULT_LEVELS = 5;
const TARGET_PASS_RATE = 0.95;

const DELTA_SCALES = [0.3819660113, 0.6180339887, 1.0000000000, 1.2720196495, 1.6180339887];
const nextStrongerDelta = (v) => {
  const i = DELTA_SCALES.findIndex(x => Math.abs(x - v) < 1e-9);
  return i === -1 ? 1.2720196495 : DELTA_SCALES[Math.min(DELTA_SCALES.length - 1, i + 1)];
};

export default function App() {
  // Controls
  const [baseHex, setBaseHex]       = useState(DEFAULT_HEX);
  const [deltaScale, setDeltaScale] = useState(DEFAULT_DELTA);
  const [levels, setLevels]         = useState(DEFAULT_LEVELS);

  // Default all views to DARK
  const [ladderTab, setLadderTab]   = useState('dark');
  const [uiTheme, setUiTheme]       = useState('dark');
  const [a11yTheme, setA11yTheme]   = useState('dark');

  // Theme overrides (for animated nudges)
  const [overrides, setOverrides]   = useState({ light: {}, dark: {} });

  // Disable optimize button while animating
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Ensure document starts in dark mode for attribute-based consumers
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  // Derived ladders
  const steps = useMemo(() => ({
    light: ladderLight(baseHex, deltaScale, levels),
    dark:  ladderDark(baseHex,  deltaScale, levels),
  }), [baseHex, deltaScale, levels]);

  // Base vars and merge overrides
  const baseStyleVars = useMemo(() => ({
    light: buildScopeVars(steps.light, 'light'),
    dark:  buildScopeVars(steps.dark,  'dark'),
  }), [steps]);

  const styleVars = useMemo(() => ({
    light: { ...baseStyleVars.light, ...overrides.light },
    dark:  { ...baseStyleVars.dark,  ...overrides.dark  },
  }), [baseStyleVars, overrides]);

  // Unified tab active tokens (consistent across scopes)
  const tabTokens = useMemo(() => {
    const bg = styleVars.light['--accent-shade-1'] || styleVars.light['--accent-1'] || '#1974FF';
    const fg = styleVars.light['--on-accent-shade-1'] || styleVars.light['--on-accent-1'] || '#0A0B0D';
    return { activeBg: bg, activeFg: fg };
  }, [styleVars.light]);

  // Surfaces actually in use (for stats)
  const surfaces = useMemo(() => ({
    light: { bg: styleVars.light['--bg'],   surface: styleVars.light['--surface'] },
    dark:  { bg: styleVars.dark['--bg'],    surface: styleVars.dark['--surface']  },
  }), [styleVars]);

  const stats = useMemo(
    () => accentPassStats(baseHex, deltaScale, levels, surfaces),
    [baseHex, deltaScale, levels, surfaces]
  );

  // Toast + clipboard
  const { msg, show, toast, hide } = useToast();
  const copy = useCallback(async (text, okMsg = 'Copied') => {
    await navigator.clipboard.writeText(text);
    toast(okMsg);
  }, [toast]);

  const onCopyHex  = (hex)  => copy(hex,  'HEX copied');
  const onCopyCss  = (css)  => copy(css,  'CSS variables copied');
  const onCopyJson = (json) => copy(json, 'Design Tokens JSON copied');

  // Main optimizer with graceful transitions
  const optimizeBase = useCallback(async (target = TARGET_PASS_RATE) => {
    if (isOptimizing) return;
    setIsOptimizing(true);
    try {
      if (stats.passRate >= target) {
        toast(`Already at ${Math.round(stats.passRate*100)}% (target ${Math.round(target*100)}%)`);
        return;
      }

      // 1) Find nearest passing base (wide window + ±12° hue drift)
      const cand = findNearestPassingBase(baseHex, deltaScale, levels, surfaces, {
        targetPassRate: target, allowHueDrift: true, hueSpanDeg: 12, maxDL: 0.45, maxDC: 0.30
      });

      let nextBase = baseHex;
      if (cand && cand.hex && cand.hex !== baseHex) {
        await tweenHexOKLCH(baseHex, cand.hex, { duration: 700, onUpdate: setBaseHex });
        nextBase = cand.hex;
      }

      // Re-evaluate
      let after = accentPassStats(nextBase, deltaScale, levels, surfaces);
      if (after.passRate >= target) {
        toast(`Optimized base → ${nextBase} (${Math.round(after.passRate*100)}% ≥ ${Math.round(target*100)}%)`);
        return;
      }

      // 2) Nudge dark surface slightly darker (−0.03 L), animated
      const curDarkSurface = styleVars.dark['--surface'];
      const nudgedDarkSurface = adjustLightness(curDarkSurface, -0.03);
      await tweenHexOKLCH(curDarkSurface, nudgedDarkSurface, {
        duration: 500, onUpdate: hex => setOverrides(prev => ({ ...prev, dark: { ...prev.dark, '--surface': hex }}))
      });

      const surfaces2 = {
        light: { bg: styleVars.light['--bg'],   surface: styleVars.light['--surface'] },
        dark:  { bg: styleVars.dark['--bg'],    surface: nudgedDarkSurface }
      };
      after = accentPassStats(nextBase, deltaScale, levels, surfaces2);
      if (after.passRate >= target) {
        toast(`Nudged dark surface (~−3 L). Achieved ${Math.round(after.passRate*100)}% ≥ ${Math.round(target*100)}%.`);
        return;
      }

      // 3) Strengthen delta scale one notch, animated
      const stronger = nextStrongerDelta(deltaScale);
      if (stronger !== deltaScale) {
        await tweenNumber(deltaScale, stronger, { duration: 500, onUpdate: v => setDeltaScale(v) });
        const after3 = accentPassStats(nextBase, stronger, levels, surfaces2);
        if (after3.passRate >= target) {
          toast(`Increased delta → ${stronger.toFixed(3)}. Achieved ${Math.round(after3.passRate*100)}% ≥ ${Math.round(target*100)}%.`);
          return;
        }
        toast(`Tried stronger delta (${stronger.toFixed(3)}), best now ${Math.round(after3.passRate*100)}%.`);
      } else {
        toast(`Reached search limits. Best was ${Math.round(after.passRate*100)}%. Consider a larger hue drift or tweaking surfaces.`);
      }
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing, stats.passRate, baseHex, deltaScale, levels, surfaces, styleVars, toast]);

  const onReset = () => {
    setBaseHex(DEFAULT_HEX);
    setDeltaScale(DEFAULT_DELTA);
    setLevels(DEFAULT_LEVELS);
    setUiTheme('dark');
    setA11yTheme('dark');
    setLadderTab('dark');
    setOverrides({ light: {}, dark: {} });
    document.documentElement.setAttribute('data-theme', 'dark');
    toast('Reset to defaults (dark)');
  };

  return (
    <main id="shell">
      {/* LEFT: ladders + tokens */}
      <div id="leftPane">
        <div className="left-stack">
          <LadderGrid
            title="Levels"
            styleVars={styleVars}
            steps={steps}
            onCopy={onCopyHex}
            active={ladderTab}
            onTabChange={setLadderTab}
            tabTokens={tabTokens}
          />
          <TokensOutput
            deltaScale={deltaScale}
            steps={steps}
            styleVars={styleVars}
            onCopyCss={onCopyCss}
            onCopyJson={onCopyJson}
          />
        </div>
      </div>

      {/* RIGHT: controls + previews + audit */}
      <div id="rightPane">
        <div className="right-stack">
          <Controls
            baseHex={baseHex} setBaseHex={setBaseHex}
            deltaScale={deltaScale} setDeltaScale={setDeltaScale}
            levels={levels} setLevels={setLevels}
            onReset={onReset}
          />

          <TinyUIPreview
            activeTheme={uiTheme}
            onThemeChange={setUiTheme}
            styleVars={styleVars}
            tabTokens={tabTokens}
          />

          <A11yAudit
            activeTheme={a11yTheme}
            onThemeChange={setA11yTheme}
            styleVars={styleVars}
            steps={steps}
            passRate={stats.passRate}
            totalChecks={stats.total}
            onOptimizeBase={optimizeBase}
            targetPassRate={TARGET_PASS_RATE}
            isOptimizing={isOptimizing}
            tabTokens={tabTokens}
          />
        </div>
      </div>

      <Toast show={show} onDismiss={hide}>{msg || 'Copied'}</Toast>
    </main>
  );
}
