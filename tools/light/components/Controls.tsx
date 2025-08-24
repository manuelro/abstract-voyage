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

export default function Controls({
  baseHex, setBaseHex,
  deltaScale, setDeltaScale,
  levels, setLevels,
  onReset
}) {
  const selectedScaleId = scaleIdFromValue(deltaScale);

  const onColorInput = (e) => {
    // sync state, normalize to uppercase #RRGGBB
    setBaseHex(String(e.target.value || '').toUpperCase());
  };

  const onScaleChange = (e) => {
    const picked = SCALES.find(s => s.id === e.target.value);
    if (picked) setDeltaScale(picked.value);
  };

  const onLevelsChange = (e) => {
    const n = Math.max(3, Math.min(10, parseInt(e.target.value, 10) || 5));
    setLevels(n);
  };

  return (
    <section className="rounded-xl text-[var(--on-surface)] p-4 md:p-6">
      <SectionHead title="Choose accent, delta &amp; levels" />

      {/* Row 1: single flex row with space-between; wraps on small screens */}
      <div className="d-flex flex flex-row md:flex-nowrap flex-wrap justify-between items-end gap-3 md:gap-4">
        {/* Base color picker + hex display */}
        <div className="flex flex-col gap-1 basis-auto shrink-0">
          <label htmlFor="baseColor" className="text-sm">Base color</label>
          <input
            type="color"
            id="baseColor"
            value={baseHex}
            onChange={onColorInput}
            aria-label="Base color"
            className="h-10 w-10 p-0 rounded-md border border-[var(--muted)] bg-transparent cursor-pointer"
          />
          {/* plain hex text under the picker */}
          <p className="mt-1 text-xs font-mono opacity-70 select-all" aria-live="polite">
            {baseHex}
          </p>
        </div>

        {/* Delta scale */}
        <div className="flex flex-col gap-1 min-w-[260px] flex-1">
          <label htmlFor="deltaScale" className="text-sm">Delta (φ-based)</label>
          <select
            id="deltaScale"
            aria-label="Golden-ratio delta scale"
            value={selectedScaleId}
            onChange={onScaleChange}
            className="h-10 w-full rounded-md border border-[var(--muted)] bg-[var(--elevated)] px-3 outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--ring)]"
          >
            {SCALES.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <p className="text-xs opacity-70">φ-based spacing between ladder levels.</p>
        </div>

        {/* Levels */}
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label htmlFor="numLevels" className="text-sm">Levels (3–10)</label>
          <select
            id="numLevels"
            aria-label="Number of levels"
            value={String(levels)}
            onChange={onLevelsChange}
            className="h-10 w-full rounded-md border border-[var(--muted)] bg-[var(--elevated)] px-3 outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--ring)]"
          >
            {Array.from({ length: 8 }, (_, i) => 3 + i).map(n => (
              <option key={n} value={String(n)}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Reset button (original styling preserved) */}
      <div className="mt-4 pt-4">
        <button type="button" onClick={onReset} className="copy">
            Reset
        </button>
      </div>
    </section>
  );
}
