// @ts-nocheck
'use client';

import React from 'react';
import SectionHead from './SectionHead';
import CompareButton from './CompareButton';

export default function TinyUIPreview({
  globalTheme,
  styleVars,
  tabTokens
}) {
  const [peeking, setPeeking] = React.useState(false);
  const effTheme = peeking ? (globalTheme === 'light' ? 'dark' : 'light') : globalTheme;

  const isLight = effTheme === 'light';
  const scopeClass = isLight ? 'sim-light' : 'sim-dark';
  const scopeStyle = isLight ? styleVars.light : styleVars.dark;

  return (
    <section id="tinyUiSection">
      <SectionHead
        title="Tiny UI"
        subtitle={
          <CompareButton
            onHoldStart={() => setPeeking(true)}
            onHoldEnd={() => setPeeking(false)}
          />
        }
      />

      <div className="preview">
        <div className={`theme-scope ${scopeClass}`} style={scopeStyle}>
          <div className="card">
            <p>
              {isLight
                ? <>Light theme uses the <strong>light ladder</strong>. Defaults map to nearest levels.</>
                : <>Dark theme uses the <strong>dark ladder</strong> (brighter center, richer shades).</>}
            </p>
            <div className="row" style={{ margin: '8px 0' }}>
              <button className="cta">Primary action</button>
              <button className="cta" disabled>Disabled</button>
            </div>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              Want details? <a href="#" onClick={e => e.preventDefault()}>Read the guide</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
