// @ts-nocheck
'use client';
import React from 'react';
import SectionHead from './SectionHead';
import Tabs from './Tabs';

const MODES = [
  { id:'none',        label:'None' },
  { id:'protanopia',  label:'Protan' },
  { id:'deuteranopia',label:'Deutan' },
  { id:'tritanopia',  label:'Tritan' },
  { id:'monochrome',  label:'Mono' },
];

export default function CvdPicker({ mode, onChange }:{
  mode: 'none'|'protanopia'|'deuteranopia'|'tritanopia'|'monochrome',
  onChange: (m:any)=>void
}){
  return (
    <section>
      <SectionHead title="Color-blind simulation" />
      <Tabs
        aria-label="CVD mode"
        items={MODES}
        value={mode}
        onChange={onChange}
      />
      <p className="muted" style={{marginTop:8}}>
        Simulation applies to previews (not exports).
      </p>
    </section>
  );
}
