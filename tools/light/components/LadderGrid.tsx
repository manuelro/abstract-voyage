// @ts-nocheck
import React, { memo, useMemo } from 'react';
import { contrastRatio } from '../utils/color';
import CompareButton from './CompareButton';

function Tile({ step, stepsCount, onCopy }) {
  const { hex, on, label, level, posIndex } = step;
  const cr = ((n) => n.toFixed(2))(contrastRatio(hex, on));
  const lvlStr = level >= 0 ? `+${level}` : `${level}`;

  return (
    <button
      className="tile"
      style={{ background: hex, color: on, '--cols': String(stepsCount) }}
      aria-label={`${label} ${hex} (copy HEX)`}
      onClick={() => onCopy?.(hex)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCopy?.(hex); } }}
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

export default memo(function LadderGrid(props) {
  const {
    title = 'Levels',

    // multi-accent (consumes global accent selection)
    stepsPrimary,
    styleVarsPrimary,
    stepsSecondary,
    styleVarsSecondary,
    hasSecondary,
    activeAccent = 'primary',

    // global theme + compare behavior
    globalTheme,

    onCopy
  } = props as any;

  const [peeking, setPeeking] = React.useState(false);
  const effTheme = peeking ? (globalTheme === 'light' ? 'dark' : 'light') : globalTheme;

  const stepsForAccent  = activeAccent === 'secondary' ? (stepsSecondary ?? stepsPrimary) : stepsPrimary;
  const varsForAccent   = activeAccent === 'secondary' ? (styleVarsSecondary  ?? styleVarsPrimary)  : styleVarsPrimary;

  // Defensive fallbacks
  const lightSteps = Array.isArray(stepsForAccent?.light) ? stepsForAccent.light : [];
  const darkSteps  = Array.isArray(stepsForAccent?.dark)  ? stepsForAccent.dark  : [];

  const current = useMemo(() => {
    return effTheme === 'light' ? lightSteps : darkSteps;
  }, [effTheme, lightSteps, darkSteps]);

  const N = current.length;
  const levelsMin = N > 0 ? -Math.floor((N - 1) / 2) : 0;
  const levelsMax = N > 0 ?  Math.ceil((N - 1) / 2) : 0;

  return (
    <section>
      <div className="row pb-4" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>
          {`Levels (${levelsMin}…+${levelsMax})`}
          <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
            • Palette: <strong>{activeAccent === 'secondary' ? 'Secondary' : 'Primary'}</strong>
          </span>
        </h1>

        {/* Right: press-and-hold compare */}
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <CompareButton
            onHoldStart={() => setPeeking(true)}
            onHoldEnd={() => setPeeking(false)}
          />
        </div>
      </div>

      {/* Light ladder */}
      <div
        className="sim-light"
        style={{
          display: effTheme === 'light' ? 'block' : 'none',
          minHeight: 0,
          flex: 1,
          ...(varsForAccent?.light || {})
        }}
      >
        <div className="ladder" style={{ '--cols': String(lightSteps.length), height: '100%' } as any}>
          {lightSteps.map(s => (
            <Tile key={s.key} step={s} stepsCount={lightSteps.length} onCopy={onCopy} />
          ))}
        </div>
      </div>

      {/* Dark ladder */}
      <div
        className="sim-dark"
        style={{
          display: effTheme === 'dark' ? 'block' : 'none',
          minHeight: 0,
          flex: 1,
          ...(varsForAccent?.dark || {})
        }}
      >
        <div className="ladder" style={{ '--cols': String(darkSteps.length), height: '100%' } as any}>
          {darkSteps.map(s => (
            <Tile key={s.key} step={s} stepsCount={darkSteps.length} onCopy={onCopy} />
          ))}
        </div>
      </div>
    </section>
  );
});
