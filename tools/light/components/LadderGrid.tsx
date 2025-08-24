// @ts-nocheck
'use client';

import React, { memo, useMemo } from 'react';
import { contrastRatio } from '../utils/color';
import CompareButton from './CompareButton';

/* Lightweight, tile-scoped badge (not the popover StatusChip) */
function A11yBadge({ label }: { label: string }) {
  const cls =
    label.startsWith('Pass AA') ? 'chip-pass'
    : label === 'Fail' ? 'chip-fail'
    : 'chip-warn';
  return (
    <span
      className={`chip a11y-chip ${cls}`}
      aria-hidden="true"
      style={{
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
        fontSize: 11,
        padding: '2px 6px',
      }}
    >
      {label}
    </span>
  );
}

function Tile({ step, stepsCount, onCopy }) {
  const { hex, on, label, level, posIndex } = step;

  const crNum = contrastRatio(hex, on);
  const cr = ((n) => n.toFixed(2))(crNum);
  const lvlStr = level >= 0 ? `+${level}` : `${level}`;

  // concise status derived from CR
  const status =
    crNum >= 4.5 ? 'Pass AA text' :
    crNum >= 3.0 ? 'Pass AA large' :
    'Fail';

  // progressive details on hover/focus
  const [hover, setHover] = React.useState(false);
  const [focus, setFocus] = React.useState(false);
  const showDetails = hover || focus;

  const handleCopy = () => onCopy?.(hex);

  return (
    <button
      className="tile"
      style={{
        background: hex,
        color: on,
        '--cols': String(stepsCount),
        position: 'relative', // for overlay
      }}
      aria-label={`${label} (level ${lvlStr}), ${status}. ${hex} (click to copy HEX)`}
      onClick={handleCopy}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCopy(); }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
    >
      {/* Top row: identity + concise status */}
      <div
        className="top"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: 12,
          }}
        >
          {label} (level {lvlStr})
        </div>
        <A11yBadge label={status} />
      </div>

      {/* Center: large legibility sample */}
      <div
        aria-hidden="true"
        style={{
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: 0.2,
          height: '100%',
          minHeight: 56,
          margin: '8px 0',
        }}
      >
        Aa
      </div>

      {/* Bottom row: primary utility — hex + one metric (no nested button) */}
      <div
        className="meta"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span
          className="chip copy"
          aria-hidden="true"
          style={{ fontSize: 12, padding: '2px 6px', cursor: 'default' }}
        >
          {hex}
        </span>
        <span>CR {cr}</span>
      </div>

      {/* Progressive details: hover/focus overlay */}
      <div
        aria-hidden={!showDetails}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 10,
          display: showDetails ? 'flex' : 'none',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          gap: 8,
          padding: 10,
          background:
            'linear-gradient(to top, color-mix(in oklab, black 32%, transparent), color-mix(in oklab, black 0%, transparent))',
          color: on,
          transition: 'opacity 120ms ease',
        }}
      >
        {/* quick facts */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            fontSize: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            opacity: 0.95,
          }}
        >
          <span>on: {on}</span>
          <span>CR {cr}</span>
        </div>

        {/* ramp position meter (moved to details to reduce default noise) */}
        <div className="meter" style={{ '--cols': String(stepsCount) } as any}>
          <div className="baseline" />
          {Array.from({ length: stepsCount }).map((_, i) => <div key={i} className="tick" />)}
          <div className="dot" style={{ gridColumn: String(posIndex) }} />
        </div>

        {/* legend (also in details) */}
        <div className="legend">
          {Array.from({ length: stepsCount }).map((_, i) => <span key={i} />)}
        </div>

        {/* quick actions as spans (avoid nested buttons) */}
        <div style={{ display: 'flex', gap: 8 }}>
          <span
            className="chip copy"
            aria-hidden="true"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            style={{ fontSize: 12, padding: '2px 6px', cursor: 'pointer' }}
          >
            Copy hex
          </span>
          <span
            className="chip copy"
            aria-hidden="true"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              try { navigator.clipboard?.writeText(`var(${step.token || '--accent'})`); } catch {}
            }}
            style={{ fontSize: 12, padding: '2px 6px', cursor: 'pointer' }}
          >
            Copy var
          </span>
        </div>
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
