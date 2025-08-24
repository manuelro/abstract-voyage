// @ts-nocheck
// src/components/TinyUIPreview.jsx
'use client';

import React from 'react';
import Tabs from './Tabs';
import SectionHead from './SectionHead';

export default function TinyUIPreview({
  activeTheme,
  onThemeChange,
  styleVars,
  tabTokens // optional; pass if you already use unified tab tokens
}) {
  const isLight = activeTheme === 'light';
  const scopeClass = isLight ? 'sim-light' : 'sim-dark';
  const scopeStyle = isLight ? styleVars.light : styleVars.dark;

  return (
    <section id="tinyUiSection">{/* NOTE: no sim-light/dark on this section */}
        <SectionHead
            title="Tiny UI"
            subtitle={
                <Tabs
                    aria-label="Tiny UI theme"
                    items={[{ id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }]}
                    value={activeTheme}
                    onChange={onThemeChange}
                    variant="theme"
                    tokens={tabTokens}
                />
            }
        />

      <div className="preview">
        {/* Only this wrapper switches theme */}
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

