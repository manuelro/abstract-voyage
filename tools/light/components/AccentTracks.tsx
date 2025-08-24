// @ts-nocheck
'use client';
import React from 'react';
import SectionHead from './SectionHead';

export default function AccentTracks({
  accent2Hex, setAccent2Hex, enableAccent2, setEnableAccent2
}){
  return (
    <section>
      <SectionHead title="Secondary accent (optional)" collapsible={false} />
      <div className="row">
        <div className="flex items-center gap-2">
          <input id="enableAccent2" type="checkbox" checked={!!enableAccent2}
            onChange={e=>setEnableAccent2(e.target.checked)} />
          <label htmlFor="enableAccent2" className="text-sm">Enable secondary accent</label>
        </div>
        <div className="flex items-center gap-2" style={{opacity: enableAccent2?1:.5}}>
          <input type="color" aria-label="Secondary accent color"
            value={accent2Hex}
            onChange={e=>setAccent2Hex(String(e.target.value||'').toUpperCase())}
            className="h-10 w-10 p-0 rounded-md border border-[var(--muted)] bg-transparent cursor-pointer" />
          <input type="text" value={accent2Hex} onChange={e=>setAccent2Hex(String(e.target.value||'').toUpperCase())}/>
        </div>
      </div>
      <p className="muted text-xs">Secondary tokens export as <code>--accent2-*</code> / <code>--on-accent2-*</code> and a <code>cta-secondary</code> role. Shares delta/levels with primary.</p>
    </section>
  );
}
