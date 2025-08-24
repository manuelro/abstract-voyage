// @ts-nocheck
'use client';

import React from 'react';
import Tabs from './Tabs';
import StatusChip from './StatusChip';

function pct(n) {
  if (n == null || Number.isNaN(n)) return '—%';
  const v = Math.max(0, Math.min(1, Number(n)));
  return `${Math.round(v * 100)}%`;
}
function statusClass(rate, target) {
  if (rate == null) return 'chip-neutral';
  const v = Number(rate);
  if (v >= target) return 'chip-pass';
  if (v >= Math.max(0, target - 0.10)) return 'chip-warn';
  return 'chip-fail';
}

type TopBarProps = {
  globalTheme?: 'light' | 'dark';
  onGlobalThemeChange?: (t: 'light' | 'dark') => void;

  secondaryEnabled?: boolean;
  onSecondaryToggle?: (enabled: boolean) => void;
  accentView?: 'primary' | 'secondary';
  onAccentViewChange?: (id: 'primary' | 'secondary') => void;

  targetPassRate?: number;
  isOptimizing?: boolean;
  onOptimizeBase?: (target?: number) => void;

  primaryCombinedRate?: number | null;
  secondaryCombinedRate?: number | null;

  activeCombinedRate?: number | null;
  activeLightRate?: number | null;
  activeDarkRate?: number | null;

  isStatsStale?: boolean;

  // NEW: preview in app
  previewInApp?: boolean;
  onPreviewInAppChange?: (b: boolean) => void;
};

function TopBarComponent({
  globalTheme = 'dark',
  onGlobalThemeChange,

  secondaryEnabled = false,
  onSecondaryToggle,
  accentView = 'primary',
  onAccentViewChange,

  targetPassRate = 0.95,
  isOptimizing = false,
  onOptimizeBase,

  primaryCombinedRate = null,
  secondaryCombinedRate = null,

  activeCombinedRate = null,
  activeLightRate = null,
  activeDarkRate = null,

  isStatsStale = false,

  previewInApp = false,
  onPreviewInAppChange,
}: TopBarProps) {
  const canOptimize =
    activeCombinedRate != null && Number(activeCombinedRate) < targetPassRate;

  // Always show both tabs; clicking "Secondary" auto-enables it if off.
  const paletteItems = React.useMemo(
    () => [
      { id: 'primary', label: 'Primary' },
      { id: 'secondary', label: 'Secondary' },
    ],
    []
  );

  const handlePaletteChange = (id) => {
    if (id === 'secondary' && !secondaryEnabled) {
      onSecondaryToggle?.(true);
    }
    onAccentViewChange?.(id);
  };

  const targetPct = Math.round(targetPassRate * 100);
  const livePct = Math.round((activeCombinedRate ?? 0) * 100);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-left">
          <strong className="app-title">Palette Studio</strong>
        </div>

        <div className="topbar-right">
          {/* PALETTE */}
          <div className="topbar-group" aria-label="Palette">
            <span className="topbar-label">Palette</span>
            <Tabs
              aria-label="Accent palette"
              items={paletteItems}
              value={accentView === 'secondary' && !secondaryEnabled ? 'primary' : accentView}
              onChange={handlePaletteChange}
            />
            <div className="palette-chips">
              <span
                className={`chip ${statusClass(primaryCombinedRate, targetPassRate)}`}
                aria-label="Primary combined pass rate"
              >
                Primary {pct(primaryCombinedRate)}
              </span>
              <span
                className={`chip ${
                  secondaryEnabled
                    ? statusClass(secondaryCombinedRate, targetPassRate)
                    : 'chip-neutral'
                }`}
                aria-label="Secondary combined pass rate"
                title={secondaryEnabled ? undefined : 'Click Secondary to enable'}
              >
                Secondary {secondaryEnabled ? pct(secondaryCombinedRate) : '—%'}
              </span>
            </div>
          </div>

          {/* THEME */}
          <div className="topbar-group" aria-label="Theme">
            <span className="topbar-label">Theme</span>
            <Tabs
              aria-label="Global theme"
              items={[
                { id: 'light', label: 'Light' },
                { id: 'dark', label: 'Dark' },
              ]}
              value={globalTheme}
              onChange={onGlobalThemeChange}
            />
          </div>

          {/* PREVIEW-IN-APP (new) */}
          <div className="topbar-group" aria-label="Preview in app">
            <span className="topbar-label">Preview</span>
            <label className="switch" title="Preview this palette in the app UI">
              <input
                type="checkbox"
                checked={!!previewInApp}
                onChange={(e) => onPreviewInAppChange?.(e.target.checked)}
                aria-label={previewInApp ? 'Disable preview in app' : 'Enable preview in app'}
              />
              <span className="slider" aria-hidden="true" />
              <span className="switch-label">{previewInApp ? 'On' : 'Off'}</span>
            </label>
          </div>

          {/* STATUS + ACTION */}
          <div className="topbar-group a11y-group" aria-label="Accessibility status">
            <StatusChip
              combined={activeCombinedRate}
              light={activeLightRate}
              dark={activeDarkRate}
              target={targetPassRate}
              primaryRate={primaryCombinedRate}
              secondaryRate={secondaryCombinedRate}
              secondaryEnabled={secondaryEnabled}
              isStale={isStatsStale}
            />

            <button
              className="cta cta-opt"
              type="button"
              onClick={() => onOptimizeBase?.(targetPassRate)}
              disabled={isOptimizing || !canOptimize}
              aria-disabled={isOptimizing || !canOptimize ? 'true' : 'false'}
              aria-busy={isOptimizing ? 'true' : 'false'}
              title={
                isOptimizing
                  ? 'Optimizing…'
                  : canOptimize
                  ? `Optimize toward ≥ ${targetPct}%`
                  : `Meets target ≥ ${targetPct}%`
              }
            >
              <span className="cta-label">Optimize</span>
              <span className="cta-meta" aria-live="polite">
                {isOptimizing ? `${livePct}% → ${targetPct}%` : `≥ ${targetPct}%`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default React.memo(TopBarComponent);
