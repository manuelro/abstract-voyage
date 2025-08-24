// @ts-nocheck
'use client';

import React from 'react';
import SectionHead from './SectionHead';

const SCALES = [
  { id: 'gentle',   value: 0.3819660113, label: 'Gentle ×1/φ² (0.382)' },
  { id: 'soft',     value: 0.6180339887, label: 'Soft ×1/φ (0.618)' },
  { id: 'standard', value: 1.0,          label: 'Standard ×1.000' },
  { id: 'bold',     value: 1.2720196495, label: 'Bold ×√φ (1.272)' },
  { id: 'extra',    value: 1.6180339887, label: 'Extra ×φ (1.618)' },
];

function scaleIdFromValue(v) {
  let best = SCALES[0].id, bestDiff = Infinity;
  for (const s of SCALES) {
    const diff = Math.abs(s.value - v);
    if (diff < bestDiff) { bestDiff = diff; best = s.id; }
  }
  return best;
}

const DEFAULT_OPTS = {
  allowHueDrift: false,
  maxHueDriftDeg: 4,
  minChromaRatio: 0.7,
  minChromaAbs: 0.06,
  strategy: 'L-first', // or 'LC'
};

export default function Controls({
  // Global palette context (read-only switch lives in TopBar)
  accentView = 'primary',
  onAccentViewChange, // used only when disabling secondary to snap back

  // PRIMARY accent (back-compat names)
  baseHex,
  setBaseHex,

  // SECONDARY accent controls (optional)
  secondaryEnabled = false,
  setSecondaryEnabled,
  secondaryHex,
  setSecondaryHex,

  // spacing / levels
  deltaScale, setDeltaScale,
  levels, setLevels,

  // optimizer knobs (optional; preserved for future)
  optOptions,
  onOptionsChange,

  onReset,
}) {
  const selectedScaleId = scaleIdFromValue(deltaScale);

  const [opts, setOpts] = React.useState(optOptions || DEFAULT_OPTS);
  React.useEffect(() => {
    if (optOptions) setOpts(optOptions);
  }, [optOptions]);
  const updateOpts = (next) => {
    setOpts(next);
    onOptionsChange?.(next);
  };

  // Which accent are we editing (comes from global)
  const usingSecondary = accentView === 'secondary' && !!secondaryEnabled;

  const hexShown = usingSecondary ? (secondaryHex ?? baseHex) : baseHex;
  const setHexShown =
    usingSecondary
      ? (typeof setSecondaryHex === 'function' ? setSecondaryHex : () => {})
      : (typeof setBaseHex      === 'function' ? setBaseHex      : () => {});

  const onColorInput = (e) => setHexShown(String(e.target.value || '').toUpperCase());

  const onScaleChange = (e) => {
    const picked = SCALES.find(s => s.id === e.target.value);
    if (picked) setDeltaScale?.(picked.value);
  };

  const onLevelsChange = (e) => {
    const n = Math.max(3, Math.min(10, parseInt(e.target.value, 10) || 5));
    setLevels?.(n);
  };

  const toggleSecondary = (checked: boolean) => {
    setSecondaryEnabled?.(checked);
    if (!checked && accentView === 'secondary') {
      onAccentViewChange?.('primary'); // snap back to primary if user disables secondary
    }
  };

  return (
    <section className="rounded-xl text-[var(--on-surface)] p-4 md:p-6 controls">
      <SectionHead
        title="Pick your accent & steps"
        subtitle={<span className="muted" aria-live="polite">Editing: <strong>{usingSecondary ? 'Secondary' : 'Primary'}</strong></span>}
      />

      {/* Row 0: Secondary status (control moved to Top Bar to avoid duplication) */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
          <span className="text-sm muted">
            Secondary accent: <strong>{secondaryEnabled ? 'On' : 'Off'}</strong> — toggle in the Top Bar.
          </span>
        </div>
      </div>

      {/* Row 1: base, delta, levels */}
      <div className="d-flex flex flex-row md:flex-nowrap flex-wrap justify-between items-end gap-3 md:gap-4">
        {/* Base color picker + hex display */}
        <div className="flex flex-col gap-1 basis-auto shrink-0">
          <label htmlFor="baseColor" className="text-sm">
            Accent color{usingSecondary ? ' (secondary)' : ''}
          </label>
          <input
            type="color"
            id="baseColor"
            value={hexShown}
            onChange={onColorInput}
            aria-label="Accent color"
            className="h-10 w-10 p-0 rounded-md border border-[var(--border)] bg-transparent cursor-pointer"
            title="Pick base accent color (click tiles to copy HEX)"
          />
          <p className="mt-1 text-xs font-mono opacity-70 select-all" aria-live="polite">
            {hexShown}
          </p>
        </div>

        {/* Delta scale */}
        <div className="flex flex-col gap-1 min-w-[260px] flex-1">
          <label htmlFor="deltaScale" className="text-sm">Step spacing (Δ)</label>
          <select
            id="deltaScale"
            aria-label="Golden-ratio step spacing"
            value={selectedScaleId}
            onChange={onScaleChange}
            className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--elevated)] px-3 outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--ring)]"
            title="How far tints/shades move from the base"
          >
            {SCALES.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <p className="text-xs opacity-70">Golden-ratio spacing between steps.</p>
        </div>

        {/* Levels */}
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label htmlFor="numLevels" className="text-sm">Levels (3–10)</label>
          <select
            id="numLevels"
            aria-label="Number of levels"
            value={String(levels)}
            onChange={onLevelsChange}
            className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--elevated)] px-3 outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--ring)]"
            title="How many tints/shades around the base"
          >
            {Array.from({ length: 8 }, (_, i) => 3 + i).map(n => (
              <option key={n} value={String(n)}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Identity-preserving optimizer knobs */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <fieldset className="rounded-md border border-[var(--border)] p-3">
          <legend className="text-sm px-1">Preserve identity</legend>

          <div className="flex items-center gap-2 mb-2">
            <input
              id="allowHueDrift"
              type="checkbox"
              checked={!!opts.allowHueDrift}
              onChange={(e) => updateOpts({ ...opts, allowHueDrift: e.target.checked })}
            />
            <label htmlFor="allowHueDrift" className="text-sm">Allow hue drift</label>
          </div>

          {opts.allowHueDrift && (
            <div className="flex items-center gap-2 mb-2">
              <label htmlFor="maxHueDriftDeg" className="text-sm w-36">Hue cap (±°)</label>
              <input
                id="maxHueDriftDeg"
                type="range"
                min={0}
                max={12}
                step={1}
                value={opts.maxHueDriftDeg ?? 4}
                onChange={(e) => updateOpts({ ...opts, maxHueDriftDeg: parseInt(e.target.value,10) })}
                className="flex-1"
              />
              <span className="text-xs w-10 text-right">{opts.maxHueDriftDeg ?? 4}°</span>
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <label htmlFor="minChromaRatio" className="text-sm w-36">Min chroma (×C₀)</label>
            <input
              id="minChromaRatio"
              type="range"
              min={0.6}
              max={0.9}
              step={0.01}
              value={opts.minChromaRatio}
              onChange={(e) => updateOpts({ ...opts, minChromaRatio: parseFloat(e.target.value) })}
              className="flex-1"
            />
            <span className="text-xs w-12 text-right">{Math.round(opts.minChromaRatio*100)}%</span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="minChromaAbs" className="text-sm w-36">Min chroma (abs)</label>
            <input
              id="minChromaAbs"
              type="number"
              step="0.01"
              min="0"
              max="0.40"
              value={opts.minChromaAbs}
              onChange={(e) => updateOpts({ ...opts, minChromaAbs: Math.max(0, parseFloat(e.target.value)||0) })}
              className="h-9 w-24 rounded-md border border-[var(--border)] bg-[var(--elevated)] px-2"
            />
          </div>
        </fieldset>

        <fieldset className="rounded-md border border-[var(--border)] p-3">
          <legend className="text-sm px-1">Optimization strategy</legend>
          <div className="flex items-center gap-2">
            <label htmlFor="strategy" className="text-sm w-36">Strategy</label>
            <select
              id="strategy"
              value={opts.strategy}
              onChange={(e) => updateOpts({ ...opts, strategy: e.target.value })}
              className="h-9 rounded-md border border-[var(--border)] bg-[var(--elevated)] px-2"
            >
              <option value="L-first">Lightness first (recommended)</option>
              <option value="LC">Lightness + Chroma</option>
            </select>
          </div>
          <p className="text-xs opacity-70 mt-2">
            L-first keeps hue &amp; saturation stable; it tries ΔL first, then small ΔC, then tiny ΔH (if allowed).
          </p>
        </fieldset>
      </div>

      {/* Row 3: Reset button */}
      <div className="mt-4 pt-4">
        <button type="button" onClick={onReset} className="copy" title="Reset all controls to defaults">
          Reset
        </button>
      </div>
    </section>
  );
}
