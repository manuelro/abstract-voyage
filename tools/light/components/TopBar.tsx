// @ts-nocheck
'use client';

import React from 'react';
import Tabs from './Tabs';

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

export default function TopBar({
  // Global theme
  globalTheme = 'dark',
  onGlobalThemeChange,

  // Palettes
  secondaryEnabled = false,
  onSecondaryToggle,                 // (boolean) => void
  accentView = 'primary',
  onAccentViewChange,

  // A11y metrics (selected palette + per-palette combined)
  targetPassRate = 0.95,
  isOptimizing = false,
  onOptimizeBase,                    // () => void

  // Combined rates for tabs (primary/secondary)
  primaryCombinedRate = null,        // 0..1
  secondaryCombinedRate = null,      // 0..1 or null when disabled

  // Selected palette breakdown
  activeCombinedRate = null,         // 0..1 (same as the in-section summary)
  activeLightRate = null,            // 0..1
  activeDarkRate = null,             // 0..1
}) {
  const activeStatusCls = statusClass(activeCombinedRate, targetPassRate);
  const canOptimize = activeCombinedRate != null && Number(activeCombinedRate) < targetPassRate;

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-left">
          <strong className="app-title">Palette Studio</strong>
        </div>

        <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* PALETTE GROUP */}
          <div className="topbar-group" aria-label="Palette">
            <span className="topbar-label">Palette</span>

            {/* Secondary enable switch */}
            <label className="switch" title="Enable secondary palette">
              <input
                type="checkbox"
                checked={!!secondaryEnabled}
                onChange={(e) => onSecondaryToggle?.(e.target.checked)}
                aria-label={secondaryEnabled ? 'Disable secondary palette' : 'Enable secondary palette'}
              />
              <span className="slider" aria-hidden="true" />
              <span className="switch-label">Secondary</span>
            </label>

            {/* Tabs: Primary | Secondary (hide Secondary when disabled) */}
            <Tabs
              aria-label="Accent palette"
              items={
                secondaryEnabled
                  ? [{ id: 'primary', label: 'Primary' }, { id: 'secondary', label: 'Secondary' }]
                  : [{ id: 'primary', label: 'Primary' }]
              }
              value={accentView === 'secondary' && !secondaryEnabled ? 'primary' : accentView}
              onChange={(id) => {
                if (id === 'secondary' && !secondaryEnabled) return;
                onAccentViewChange?.(id);
              }}
            />

            {/* Per-tab combined chips */}
            <div className="palette-chips">
              <span className={`chip ${statusClass(primaryCombinedRate, targetPassRate)}`} aria-label="Primary combined pass rate">
                Primary {pct(primaryCombinedRate)}
              </span>
              {secondaryEnabled && (
                <span
                  className={`chip ${statusClass(secondaryCombinedRate, targetPassRate)}`}
                  aria-label="Secondary combined pass rate"
                >
                  Secondary {pct(secondaryCombinedRate)}
                </span>
              )}
            </div>
          </div>

          {/* THEME GROUP */}
          <div className="topbar-group" aria-label="Theme">
            <span className="topbar-label">Theme</span>
            <Tabs
              aria-label="Global theme"
              items={[{ id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }]}
              value={globalTheme}
              onChange={onGlobalThemeChange}
            />
          </div>

          {/* A11Y GROUP */}
          <div className="topbar-group a11y-group" aria-label="Accessibility status">
            <span className={`chip ${activeStatusCls}`} title={`Combined (Light+Dark). Target ≥ ${Math.round(targetPassRate*100)}%.`}>
              {pct(activeCombinedRate)}
            </span>
            <span className="chip chip-quiet" title="Light theme pass rate">☀︎ {pct(activeLightRate)}</span>
            <span className="chip chip-quiet" title="Dark theme pass rate">🌙 {pct(activeDarkRate)}</span>

            <button
              className="cta"
              type="button"
              onClick={() => onOptimizeBase?.(targetPassRate)}
              disabled={isOptimizing || !canOptimize}
              aria-busy={isOptimizing ? 'true' : 'false'}
              title={canOptimize ? `Optimize to ≥ ${Math.round(targetPassRate*100)}%` : 'Meets target'}
              style={{ opacity: isOptimizing ? 0.7 : 1 }}
            >
              {isOptimizing ? 'Optimizing…' : (canOptimize ? `Optimize to ≥${Math.round(targetPassRate*100)}%` : 'Meets target')}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
