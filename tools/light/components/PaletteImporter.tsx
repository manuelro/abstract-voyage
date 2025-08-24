// @ts-nocheck
'use client';
import React from 'react';
import SectionHead from './SectionHead';
import { parsePalette } from '../utils/parse';

export default function PaletteImporter({
  onPickPrimary, onPickSecondary
}){
  const [raw, setRaw] = React.useState('');
  const parsed = React.useMemo(()=>parsePalette(raw),[raw]);

  return (
    <section>
      <SectionHead title="Palette import (HEX or oklch())" />
      <textarea
        aria-label="Paste palette"
        className="tokens"
        placeholder={"Primary, #6D94A2\nSecondary, oklch(0.66 0.10 300)\nAccent Alt, #FF6A3D"}
        style={{height:120, whiteSpace:'pre-wrap'}}
        value={raw}
        onChange={e=>setRaw(e.target.value)}
      />
      <div className="row" style={{marginTop:8, flexWrap:'wrap', gap:8}}>
        {parsed.map((p,i)=>(
          <div key={i} className="swatch-card" style={{padding:8, border:'1px solid var(--border)', borderRadius:8}}>
            <div className="swatch" style={{background:p.hex, width:28, height:28, display:'inline-block', verticalAlign:'middle'}} />
            <div style={{display:'inline-block', marginLeft:8}}>
              <div style={{fontSize:12}}>{p.name}</div>
              <div className="a11y-chip">{p.hex}</div>
            </div>
            <div className="row" style={{marginTop:6}}>
              <button className="copy" onClick={()=>onPickPrimary?.(p.hex)}>Set as Primary</button>
              <button className="copy" onClick={()=>onPickSecondary?.(p.hex)}>Set as Secondary</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
