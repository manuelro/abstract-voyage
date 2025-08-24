// @ts-nocheck
'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';

import TopBar from './components/TopBar';
import Controls from './components/Controls';
import LadderGrid from './components/LadderGrid';
import ComponentGallery from './components/ComponentGallery';
import A11yAudit from './components/A11yAudit';
import TokensOutput from './components/TokensOutput';
import Toast from './components/Toast';

import useToast from './hooks/useToast';
import { ladderLight, ladderDark } from './utils/ladder';
import { buildScopeVars } from './utils/tokens';
import { accentPassStats, findNearestPassingBase, adjustLightness } from './utils/optimizer';
import { tweenHexOKLCH, tweenNumber } from './utils/animate';

// ---------- Defaults ----------
const DEFAULT_PRIMARY_HEX   = '#6D94A2';
const DEFAULT_SECONDARY_HEX = '#A98B46';
const DEFAULT_DELTA  = 1.6180339887;     // √φ
const DEFAULT_LEVELS = 5;
const TARGET_PASS_RATE = 0.95;

const DELTA_SCALES = [0.3819660113, 0.6180339887, 1.0000000000, 1.2720196495, 1.6180339887];
const nextStrongerDelta = (v: number) => {
  const i = DELTA_SCALES.findIndex(x => Math.abs(x - v) < 1e-9);
  return i === -1 ? 1.2720196495 : DELTA_SCALES[Math.min(DELTA_SCALES.length - 1, i + 1)];
};

type AccentView = 'primary' | 'secondary';
type Theme = 'light' | 'dark';

// Neutral fallbacks to guarantee legible UI when previewing
const NEUTRAL_FALLBACKS: Record<Theme, Record<string,string>> = {
  light: {
    '--bg':'#F7F9FC',
    '--surface':'#FFFFFF',
    '--elevated':'#F3F6FA',
    '--border':'#D6DEE6',
    '--text':'#0A0B0D',
    '--on-surface':'#0A0B0D',
    '--muted':'#5B6672',
  },
  dark: {
    '--bg':'#0C1116',
    '--surface':'#0F141A',
    '--elevated':'#121920',
    '--border':'#22303C',
    '--text':'#E7EBF0',
    '--on-surface':'#E7EBF0',
    '--muted':'#9AA7B0',
  }
};

// Helper: build one style string (atomic write)
function cssVarsText(vars: Record<string, string>) {
  let s = '';
  for (const k in vars) {
    const v = vars[k];
    if (v != null) s += `${k}:${v};`;
  }
  return s;
}

export default function App() {
  // ---------- Core state ----------
  const [primaryHex,   setPrimaryHex]   = useState(DEFAULT_PRIMARY_HEX);
  const [secondaryHex, setSecondaryHex] = useState(DEFAULT_SECONDARY_HEX);
  const [secondaryEnabled, setSecondaryEnabled] = useState(false);

  const [deltaScale, setDeltaScale] = useState(DEFAULT_DELTA);
  const [levels,     setLevels]     = useState(DEFAULT_LEVELS);

  // Global palette & theme
  const [accentView, setAccentView] = useState<AccentView>('primary');
  const [globalTheme, setGlobalTheme] = useState<Theme>('dark');

  // Animated surface overrides (shared)
  const [overrides, setOverrides] = useState({ light: {}, dark: {} });
  const [isOptimizing, setIsOptimizing] = useState(false);

  // In-app preview state + anchor
  const [previewInApp, setPreviewInApp] = useState(false);
  const appSkinRef = useRef<HTMLDivElement | null>(null);

  // Keep document attribute in sync with global theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', globalTheme);
  }, [globalTheme]);

  // If the user turns secondary off while viewing it, snap back to primary
  useEffect(() => {
    if (!secondaryEnabled && accentView === 'secondary') {
      setAccentView('primary');
    }
  }, [secondaryEnabled, accentView]);

  // ---------- Derived ladders ----------
  const stepsPrimary = useMemo(() => ({
    light: ladderLight(primaryHex,   deltaScale, levels),
    dark:  ladderDark(primaryHex,    deltaScale, levels),
  }), [primaryHex, deltaScale, levels]);

  const stepsSecondary = useMemo(() => ({
    light: ladderLight(secondaryHex, deltaScale, levels),
    dark:  ladderDark(secondaryHex,  deltaScale, levels),
  }), [secondaryHex, deltaScale, levels]);

  // Build CSS variables (scoped) from ladders
  const varsPrimary = useMemo(() => ({
    light: buildScopeVars(stepsPrimary.light, 'light'),
    dark:  buildScopeVars(stepsPrimary.dark,  'dark'),
  }), [stepsPrimary]);

  const varsSecondary = useMemo(() => ({
    light: buildScopeVars(stepsSecondary.light, 'light'),
    dark:  buildScopeVars(stepsSecondary.dark,  'dark'),
  }), [stepsSecondary]);

  // Merge with animated overrides
  const styleVarsPrimary = useMemo(() => ({
    light: { ...varsPrimary.light, ...overrides.light },
    dark:  { ...varsPrimary.dark,  ...overrides.dark  },
  }), [varsPrimary, overrides]);

  const styleVarsSecondary = useMemo(() => ({
    light: { ...varsSecondary.light, ...overrides.light },
    dark:  { ...varsSecondary.dark,  ...overrides.dark  },
  }), [varsSecondary, overrides]);

  // Active accent vars
  const activeIsSecondary = secondaryEnabled && accentView === 'secondary';
  const stepsActive   = activeIsSecondary ? stepsSecondary   : stepsPrimary;
  const styleVars     = activeIsSecondary ? styleVarsSecondary : styleVarsPrimary;

  // Surfaces actually in use (for stats)
  const surfaces = useMemo(() => ({
    light: { bg: styleVars.light['--bg'],   surface: styleVars.light['--surface'] },
    dark:  { bg: styleVars.dark['--bg'],    surface: styleVars.dark['--surface']  },
  }), [styleVars]);

  // ---------- Stats for top bar chips ----------
  const primaryCombinedRate = useMemo(() => {
    const s = accentPassStats(primaryHex, deltaScale, levels, surfaces);
    return s.passRate ?? 0;
  }, [primaryHex, deltaScale, levels, surfaces]);

  const secondaryCombinedRate = useMemo(() => {
    if (!secondaryEnabled) return null;
    const s = accentPassStats(secondaryHex, deltaScale, levels, surfaces);
    return s.passRate ?? 0;
  }, [secondaryEnabled, secondaryHex, deltaScale, levels, surfaces]);

  const activeCombinedRate = activeIsSecondary ? secondaryCombinedRate : primaryCombinedRate;

  const themeRate = useCallback((hex, which) => {
    const dup = which === 'light'
      ? { light: surfaces.light, dark: surfaces.light }
      : { light: surfaces.dark,  dark: surfaces.dark  };
    const s = accentPassStats(hex, deltaScale, levels, dup);
    return s.passRate ?? 0;
  }, [deltaScale, levels, surfaces]);

  const activeLightRate = useMemo(() => {
    const hex = activeIsSecondary ? secondaryHex : primaryHex;
    return themeRate(hex, 'light');
  }, [activeIsSecondary, secondaryHex, primaryHex, themeRate]);

  const activeDarkRate = useMemo(() => {
    const hex = activeIsSecondary ? secondaryHex : primaryHex;
    return themeRate(hex, 'dark');
  }, [activeIsSecondary, secondaryHex, primaryHex, themeRate]);

  const stats = useMemo(() => {
    const hex = activeIsSecondary ? secondaryHex : primaryHex;
    return accentPassStats(hex, deltaScale, levels, surfaces);
  }, [activeIsSecondary, primaryHex, secondaryHex, deltaScale, levels, surfaces]);

  // ---------- Toast / copy ----------
  const { msg, show, toast, hide } = useToast();
  const copy = useCallback(async (text: string, okMsg = 'Copied') => {
    await navigator.clipboard.writeText(text);
    toast(okMsg);
  }, [toast]);
  const onCopyHex      = (hex: string) => copy(hex, 'HEX copied');
  const onCopyCss      = (s: string)   => copy(s, 'CSS copied');
  const onCopyJson     = (s: string)   => copy(s, 'JSON copied');
  const onCopyFigma    = (s: string)   => copy(s, 'Figma tokens copied');
  const onCopyTailwind = (s: string)   => copy(s, 'Tailwind config copied');
  const onCopyBootstrap= (s: string)   => copy(s, 'Bootstrap mapping copied');

  // ---------- Optimizer ----------
  const optimizeBase = useCallback(async (target = TARGET_PASS_RATE) => {
    if (isOptimizing) return;
    setIsOptimizing(true);
    try {
      const workingHex   = activeIsSecondary ? secondaryHex : primaryHex;
      const setWorkingHex= activeIsSecondary ? setSecondaryHex : setPrimaryHex;

      if (stats.passRate >= target) {
        toast(`Already at ${Math.round(stats.passRate*100)}% (target ${Math.round(target*100)}%)`);
        return;
      }

      const cand = findNearestPassingBase(workingHex, deltaScale, levels, surfaces, {
        targetPassRate: target, allowHueDrift: true, hueSpanDeg: 12, maxDL: 0.45, maxDC: 0.30
      });

      let nextBase = workingHex;
      if (cand && cand.hex && cand.hex !== workingHex) {
        await tweenHexOKLCH(workingHex, cand.hex, { duration: 700, onUpdate: setWorkingHex });
        nextBase = cand.hex;
      }

      let after = accentPassStats(nextBase, deltaScale, levels, surfaces);
      if (after.passRate >= target) {
        toast(`Optimized base → ${nextBase} (${Math.round(after.passRate*100)}% ≥ ${Math.round(target*100)}%)`);
        return;
      }

      const curDarkSurface = styleVars.dark['--surface'];
      const nudgedDarkSurface = adjustLightness(curDarkSurface, -0.03);
      await tweenHexOKLCH(curDarkSurface, nudgedDarkSurface, {
        duration: 500,
        onUpdate: hex => setOverrides(prev => ({ ...prev, dark: { ...prev.dark, '--surface': hex }}))
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
  }, [isOptimizing, stats.passRate, activeIsSecondary, primaryHex, secondaryHex, deltaScale, levels, surfaces, styleVars, toast]);

  // ---------- Reset ----------
  const onReset = () => {
    setPrimaryHex(DEFAULT_PRIMARY_HEX);
    setSecondaryHex(DEFAULT_SECONDARY_HEX);
    setSecondaryEnabled(false);
    setDeltaScale(DEFAULT_DELTA);
    setLevels(DEFAULT_LEVELS);
    setAccentView('primary');
    setOverrides({ light: {}, dark: {} });
    setPreviewInApp(false);

    setGlobalTheme('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    toast('Reset to defaults (dark)');
  };

  // ---------- Preview-in-app (scoped theming) ----------
  // Apply variables atomically and orchestrate surfaces -> text/accents with a tiny delay.
  const prevThemeRef = useRef(globalTheme);
  const prevActiveKeyRef = useRef(activeIsSecondary ? 'secondary' : 'primary');

  useEffect(() => {
    const node = appSkinRef.current;
    if (!node) return;

    // clear
    if (!previewInApp) {
      node.removeAttribute('style');
      node.classList.remove('theme-xfade');
      return;
    }

    const theme = globalTheme;
    const accentVars = styleVars[theme] || {};
    const merged = { ...NEUTRAL_FALLBACKS[theme], ...accentVars };

    const surfaceKeys = ['--bg','--surface','--elevated','--border'];
    const step1: Record<string,string> = {};
    const step2: Record<string,string> = {};
    for (const k in merged) {
      (surfaceKeys.includes(k) ? step1 : step2)[k] = merged[k];
    }

    const enableStagger = () => node.classList.add('theme-xfade');
    const disableStagger = () => node.classList.remove('theme-xfade');

    const writeStep1 = () => {
      node.style.cssText = cssVarsText(step1);   // atomic write 1
      enableStagger();
    };
    const writeStep2 = () => {
      node.style.cssText = cssVarsText(merged);  // atomic write 2 (final)
      window.setTimeout(disableStagger, 260);
    };

    const run = () => {
      writeStep1();
      window.setTimeout(writeStep2, 60);
    };

    const themeChanged = prevThemeRef.current !== theme;
    prevThemeRef.current = theme;

    // Detect palette switch (primary <-> secondary). We only treat this like a "big transition"
    // to avoid firing ViewTransitions for every tiny color drag.
    const activeKey = activeIsSecondary ? 'secondary' : 'primary';
    const accentSwitched = prevActiveKeyRef.current !== activeKey;
    prevActiveKeyRef.current = activeKey;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Use View Transitions when theme flips OR active palette switches
    // @ts-ignore (experimental API)
    if (!prefersReduced && (themeChanged || accentSwitched) && typeof document.startViewTransition === 'function') {
      // @ts-ignore
      document.startViewTransition(run);
    } else {
      run();
    }
  }, [previewInApp, styleVars, globalTheme, activeIsSecondary]);

  return (
    <div id="appSkin" ref={appSkinRef}>
      <TopBar
        // Theme
        globalTheme={globalTheme}
        onGlobalThemeChange={setGlobalTheme}

        // Palettes (with secondary switch)
        secondaryEnabled={secondaryEnabled}
        onSecondaryToggle={(checked) => {
          setSecondaryEnabled(checked);
          if (!checked && accentView === 'secondary') setAccentView('primary');
        }}
        accentView={accentView}
        onAccentViewChange={setAccentView}

        // A11y metrics + actions
        targetPassRate={TARGET_PASS_RATE}
        isOptimizing={isOptimizing}
        onOptimizeBase={optimizeBase}

        primaryCombinedRate={primaryCombinedRate}
        secondaryCombinedRate={secondaryEnabled ? secondaryCombinedRate : null}

        activeCombinedRate={activeCombinedRate}
        activeLightRate={activeLightRate}
        activeDarkRate={activeDarkRate}

        // Preview toggle
        previewInApp={previewInApp}
        onPreviewInAppChange={setPreviewInApp}
      />

      <main id="shell">
        {/* LEFT: ladders + tokens */}
        <div id="leftPane">
          <div className="left-stack">
            <LadderGrid
              title="Levels"
              activeAccent={accentView}
              stepsPrimary={stepsPrimary}
              styleVarsPrimary={styleVarsPrimary}
              stepsSecondary={secondaryEnabled ? stepsSecondary : undefined}
              styleVarsSecondary={secondaryEnabled ? styleVarsSecondary : undefined}
              hasSecondary={secondaryEnabled}
              onCopy={onCopyHex}
              globalTheme={globalTheme}
            />

            <TokensOutput
              deltaScale={deltaScale}
              stepsPrimary={stepsPrimary}
              styleVarsPrimary={styleVarsPrimary}
              stepsSecondary={secondaryEnabled ? stepsSecondary : undefined}
              styleVarsSecondary={secondaryEnabled ? styleVarsSecondary : undefined}
              hasSecondary={secondaryEnabled}
              onCopyCss={onCopyCss}
              onCopyJson={onCopyJson}
              onCopyFigma={onCopyFigma}
              onCopyTailwind={onCopyTailwind}
              onCopyBootstrap={onCopyBootstrap}
            />
          </div>
        </div>

        {/* RIGHT: controls + previews + audit */}
        <div id="rightPane">
          <div className="right-stack">
            <Controls
              accentView={accentView}
              onAccentViewChange={setAccentView}
              baseHex={primaryHex} setBaseHex={setPrimaryHex}
              deltaScale={deltaScale} setDeltaScale={setDeltaScale}
              levels={levels} setLevels={setLevels}
              secondaryEnabled={secondaryEnabled}
              setSecondaryEnabled={setSecondaryEnabled}
              secondaryHex={secondaryHex}
              setSecondaryHex={setSecondaryHex}
              onReset={onReset}
            />

            <ComponentGallery
              globalTheme={globalTheme}
              styleVars={styleVars}
            />

            <A11yAudit
              globalTheme={globalTheme}
              styleVars={styleVars}
              steps={stepsActive}
              passRate={stats.passRate}
              totalChecks={stats.total}
              onOptimizeBase={optimizeBase}
              targetPassRate={TARGET_PASS_RATE}
              isOptimizing={isOptimizing}
              showOptimizeButton={false}
            />
          </div>
        </div>

        <Toast show={show} onDismiss={hide}>{msg || 'Copied'}</Toast>
      </main>
    </div>
  );
}
