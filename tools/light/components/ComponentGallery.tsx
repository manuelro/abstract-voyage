// @ts-nocheck
'use client';

import React from 'react';
import SectionHead from './SectionHead';
import CompareButton from './CompareButton';
import { COPY } from '../utils/copy';

export default function ComponentGallery({
  globalTheme,
  styleVars,
}) {
  const [peeking, setPeeking] = React.useState(false);
  const effTheme = peeking ? (globalTheme === 'light' ? 'dark' : 'light') : globalTheme;

  const isLight = effTheme === 'light';
  const scopeClass = isLight ? 'sim-light' : 'sim-dark';
  const scopeStyle = isLight ? styleVars.light : styleVars.dark;

  // Distinct tile swatches from the active palette (with safe fallbacks)
  const a1Bg = scopeStyle?.['--accent-shade-1']    || scopeStyle?.['--accent-1']    || '#1974FF';
  const a1Fg = scopeStyle?.['--on-accent-shade-1'] || scopeStyle?.['--on-accent-1'] || '#0A0B0D';
  const a2Bg = scopeStyle?.['--accent-shade-2']    || scopeStyle?.['--accent-2']    || a1Bg;
  const a2Fg = scopeStyle?.['--on-accent-shade-2'] || scopeStyle?.['--on-accent-2'] || a1Fg;

  return (
    <section>
      <SectionHead
        title={COPY.gallery.title}
        subtitle={
          <CompareButton
            onHoldStart={() => setPeeking(true)}
            onHoldEnd={() => setPeeking(false)}
          />
        }
      />

      <div className="preview">
        {/* Scope wrapper provides the tokens. We also force color to var(--text). */}
        <div className={`theme-scope ${scopeClass}`} style={scopeStyle}>
          <div
            className="grid"
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: '1fr 1fr',
              color: 'var(--text)',
            }}
          >
            {/* Typography */}
            <div className="card">
              <h2 style={{ color: 'var(--text)' }}>Typography</h2>
              <p className="muted">Hierarchy &amp; sizes</p>
              <h1 style={{ marginTop: 16, color: 'var(--text)' }}>H1 Heading</h1>
              <h2 style={{ color: 'var(--text)' }}>H2 Heading</h2>
              <p style={{ color: 'var(--text)' }}>
                Body text — regular paragraph with{' '}
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  style={{ color: 'var(--accent-shade-1, var(--accent-1))' }}
                >
                  link
                </a>.
              </p>
              <p>
                <strong>Small</strong>{' '}
                <span className="muted">caption text.</span>
              </p>
            </div>

            {/* Buttons */}
            <div className="card">
              <h2 style={{ color: 'var(--text)' }}>Buttons</h2>
              <div className="row" style={{ marginTop: 12 }}>
                <button className="cta">Primary</button>
                <button className="cta" disabled>
                  Disabled
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="card">
              <h2 style={{ color: 'var(--text)' }}>Form</h2>
              <label htmlFor="email" style={{ marginTop: 8, display: 'block' }}>
                Email
              </label>
              <input id="email" type="text" placeholder="name@site.tld" style={{ width: '100%', marginTop: 6 }} />
              <div className="row" style={{ marginTop: 10 }}>
                <button className="copy">Search</button>
              </div>

              <p className="muted" style={{ marginTop: 12 }}>
                Focus ring uses
              </p>
              <div
                style={{
                  marginTop: 6,
                  height: 36,
                  borderRadius: 8,
                  background: 'color-mix(in oklab, var(--surface) 86%, transparent)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 10px',
                  outline: '2px solid var(--ring)',
                  outlineOffset: 2,
                }}
              >
                <code style={{ fontSize: 12, opacity: 0.9 }}>--ring</code>
              </div>
            </div>

            {/* Table */}
            <div className="card">
              <h2 style={{ color: 'var(--text)' }}>Table</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid var(--border)' }}>
                      Item
                    </th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid var(--border)' }}>
                      Status
                    </th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid var(--border)' }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Alpha', status: 'Active' },
                    { name: 'Beta', status: 'Review' },
                  ].map((row, i) => (
                    <tr key={i}>
                      <td style={{ padding: '10px 6px', borderBottom: '1px solid var(--border)' }}>{row.name}</td>
                      <td style={{ padding: '10px 6px', borderBottom: '1px solid var(--border)' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 999,
                            border: '1px solid var(--border)',
                            background: 'color-mix(in oklab, var(--accent-tint-2) 22%, transparent)',
                          }}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 6px', borderBottom: '1px solid var(--border)' }}>
                        <button className="copy">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tiles */}
            <div className="card">
              <h2 style={{ color: 'var(--text)' }}>Tiles</h2>
              <div className="row" style={{ marginTop: 10, gap: 16 }}>
                <div
                  style={{
                    width: 68,
                    height: 92,
                    borderRadius: 10,
                    background: a1Bg,
                    color: a1Fg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)',
                  }}
                >
                  A1
                </div>

                <div
                  style={{
                    width: 68,
                    height: 92,
                    borderRadius: 10,
                    background: a2Bg,
                    color: a2Fg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)',
                  }}
                >
                  A2
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
