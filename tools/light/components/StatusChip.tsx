// @ts-nocheck
'use client';

import React from 'react';

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

export default function StatusChip({
  combined, light, dark, target,
  primaryRate, secondaryRate, secondaryEnabled,
  isStale = false
}) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);

  const icon =
    combined == null
      ? '•'
      : combined >= target
      ? '✓'
      : combined >= Math.max(0, target - 0.10)
      ? '!'
      : '✕';

  React.useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  // Close popover while stats are stale to avoid showing outdated numbers
  React.useEffect(() => {
    if (isStale && open) setOpen(false);
  }, [isStale, open]);

  return (
    <div className="status-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`chip status-chip ${statusClass(combined, target)} ${isStale ? 'chip-quiet' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open ? 'true' : 'false'}
        aria-busy={isStale ? 'true' : 'false'}
        onClick={() => { if (!isStale) setOpen(v => !v); }}
        title={isStale ? 'Calculating…' : 'Contrast status — click for details'}
      >
        {/* Two layers crossfade to keep width fixed */}
        <span className={`layer ${isStale ? 'hide' : ''}`}>
          <span className="icon" aria-hidden="true">{icon}</span>
          <span>{pct(combined)}</span>
        </span>
        <span className={`layer ${isStale ? '' : 'hide'}`}>
          Calculating…
          <span className="visually-hidden" aria-live="polite">Calculating contrast…</span>
        </span>
      </button>

      {!isStale && open && (
        <div role="dialog" aria-label="Contrast breakdown" className="status-popover">
          <div className="row just">
            <div><strong>Pass rate</strong></div>
            <div className={`a11y-chip ${statusClass(combined, target)}`}>Target ≥ {Math.round(target*100)}%</div>
          </div>

          <div className="pop-line">
            <span>Combined (Light+Dark)</span>
            <span className="a11y-chip">{pct(combined)}</span>
          </div>
          <div className="pop-line">
            <span>☀︎ Light only</span>
            <span className="a11y-chip">{pct(light)}</span>
          </div>
          <div className="pop-line">
            <span>🌙 Dark only</span>
            <span className="a11y-chip">{pct(dark)}</span>
          </div>

          <hr className="pop-sep" />

          <div className="pop-col">
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Palettes</div>
            <div className="pop-line"><span>P</span><span className="a11y-chip">{pct(primaryRate)}</span></div>
            {secondaryEnabled && (
              <div className="pop-line"><span>S</span><span className="a11y-chip">{pct(secondaryRate)}</span></div>
            )}
          </div>

          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Per-theme rates use that theme’s ladder against that theme’s surfaces.
          </p>
        </div>
      )}
    </div>
  );
}
