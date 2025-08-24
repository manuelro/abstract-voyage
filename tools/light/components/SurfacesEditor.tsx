// @ts-nocheck
'use client';

import React from 'react';
import SectionHead from './SectionHead';
import CompareButton from './CompareButton';

const FIELD_META = [
  { key: 'bg',       label: 'Background' },
  { key: 'surface',  label: 'Surface' },
  { key: 'elevated', label: 'Elevated' },
  { key: 'border',   label: 'Border' },
  { key: 'text',     label: 'Text' },
  { key: 'muted',    label: 'Muted' },
];

export default function SurfacesEditor({
  surfaces,
  onChange,
  globalTheme,
  onResetToDefaults,
  collapsed = false,
  onToggleCollapse,
}) {
  const [peeking, setPeeking] = React.useState(false);
  const effTheme = peeking ? (globalTheme === 'light' ? 'dark' : 'light') : globalTheme;

  const scope = effTheme === 'light' ? 'light' : 'dark';
  const vals = surfaces[scope] || {};

  const update = (key, value) => {
    const next = {
      ...surfaces,
      [scope]: { ...(surfaces[scope] || {}), [key]: String(value).toUpperCase() }
    };
    onChange(next);
  };

  return (
    <section>
      <SectionHead
        title="Surfaces & neutrals"
        subtitle={
          <CompareButton
            onHoldStart={() => setPeeking(true)}
            onHoldEnd={() => setPeeking(false)}
          />
        }
        collapsible
        collapsed={collapsed}
        onToggle={onToggleCollapse}
      />

      {!collapsed && (
        <>
          <p className="muted" style={{ marginTop: -6 }}>
            Tune backgrounds/neutrals per theme. The audit & optimizer use these exact values.
          </p>

          <div className="row" style={{ marginTop: 10, alignItems: 'stretch' }}>
            {FIELD_META.map(f => (
              <div key={f.key} style={{ minWidth: 180 }}>
                <label htmlFor={`surf-${f.key}`} className="text-sm">{f.label}</label>
                <div className="row" style={{ alignItems: 'center' }}>
                  <input
                    id={`surf-${f.key}`}
                    type="color"
                    value={vals[f.key]}
                    onChange={(e) => update(f.key, e.target.value)}
                    aria-label={`${f.label} color`}
                    className="h-10 w-10 p-0 rounded-md border border-[var(--muted)] bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={vals[f.key]}
                    onChange={(e) => update(f.key, e.target.value)}
                    className="flex-1"
                    aria-label={`${f.label} hex`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <button type="button" className="copy" onClick={onResetToDefaults}>
              Reset surfaces to defaults
            </button>
          </div>
        </>
      )}
    </section>
  );
}
