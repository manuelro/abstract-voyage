// @ts-nocheck
// components/LadderGrid.jsx
import React, { memo, useMemo } from 'react';
import { contrastRatio } from '../utils/color';
import SectionHead from './SectionHead';

function Tile({ step, stepsCount, onCopy }) {
  const { hex, on, label, level, posIndex } = step;
  const cr = ((n) => n.toFixed(2))(contrastRatio(hex, on));
  const lvlStr = level >= 0 ? `+${level}` : `${level}`;

  return (
    <button
      className="tile"
      style={{ background: hex, color: on, '--cols': String(stepsCount) }}
      aria-label={`${label} ${hex} (copy HEX)`}
      onClick={() => onCopy(hex)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCopy(hex); } }}
    >
      <div className="top">
        <div>{label} (level {lvlStr})</div>
        <div>Aa</div>
      </div>

      <div className="meta">{hex} • on {on} • CR {cr}</div>

      <div className="meter" style={{ '--cols': String(stepsCount) }}>
        <div className="baseline" />
        {Array.from({ length: stepsCount }).map((_, i) => <div key={i} className="tick" />)}
        <div className="dot" style={{ gridColumn: String(posIndex) }} />
      </div>

      <div className="legend">
        {Array.from({ length: stepsCount }).map((_, i) => <span key={i} />)}
      </div>
    </button>
  );
}

export default memo(function LadderGrid({
  title, styleVars, steps, onCopy, active, onTabChange
}) {
  // pick the current steps array safely
  const current = useMemo(() => {
    const arr = steps?.[active];
    if (Array.isArray(arr)) return arr;
    // fallback to light, then empty
    return Array.isArray(steps?.light) ? steps.light : [];
  }, [steps, active]);

  const N = current.length;
  const levelsMin = N > 0 ? -Math.floor((N - 1) / 2) : 0;
  const levelsMax = N > 0 ?  Math.ceil((N - 1) / 2) : 0;

  return (
    <section>
        <SectionHead
            title={`Levels (${levelsMin}…+${levelsMax})`}
            subtitle={
                <div className="tabs" role="tablist">
                    <button className="tab" aria-pressed={active === 'light' ? 'true' : 'false'} onClick={() => onTabChange('light')}>Light</button>
                    <button className="tab" aria-pressed={active === 'dark' ? 'true' : 'false'} onClick={() => onTabChange('dark')}>Dark</button>
                </div>
            }
        />

      {/* Light ladder */}
      <div className="sim-light" style={{ display: active === 'light' ? 'block' : 'none', minHeight: 0, flex: 1, ...styleVars.light }}>
        <div className="ladder" style={{ '--cols': String(steps.light.length), height: '100%' }}>
          {steps.light.map(s => <Tile key={s.key} step={s} stepsCount={steps.light.length} onCopy={onCopy} />)}
        </div>
      </div>

      {/* Dark ladder */}
      <div className="sim-dark" style={{ display: active === 'dark' ? 'block' : 'none', minHeight: 0, flex: 1, ...styleVars.dark }}>
        <div className="ladder" style={{ '--cols': String(steps.dark.length), height: '100%' }}>
          {steps.dark.map(s => <Tile key={s.key} step={s} stepsCount={steps.dark.length} onCopy={onCopy} />)}
        </div>
      </div>
    </section>
  );
});
