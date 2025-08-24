// @ts-nocheck
import React, { useMemo } from 'react';
import { exportCssVars, buildDesignTokens } from '../utils/tokens';
import SectionHead from './SectionHead';

export default function TokensOutput({ deltaScale, steps, styleVars, onCopyCss, onCopyJson }) {
  const cssText = useMemo(() => {
    return exportCssVars(styleVars.light, styleVars.dark, deltaScale, steps.light, steps.dark);
  }, [styleVars, steps, deltaScale]);

  const jsonText = useMemo(() => {
    const obj = buildDesignTokens(styleVars.light, styleVars.dark, deltaScale, steps.light, steps.dark);
    return JSON.stringify(obj, null, 2);
  }, [styleVars, steps, deltaScale]);

  return (
    <section>
      <SectionHead title="Export CSS variables & Design Tokens" />
      <p className="muted" style={{ marginTop: -4 }}>
        CSS includes <code>:root</code> (light) and <code>[data-theme="dark"]</code> (dark) with your chosen number of accent levels.
        Delta strength is φ-based.
      </p>

      <div className="row" style={{ marginBottom: 8 }}>
        <button className="copy cta" onClick={() => onCopyCss(cssText)}>Copy CSS variables</button>
        <button className="copy cta" onClick={() => onCopyJson(jsonText)}>Copy JSON (Design Tokens)</button>
      </div>

      <div className="tokens" aria-label="CSS variables output" style={{ flex: 1, minHeight: 0, whiteSpace: 'pre' }}>
        {cssText}
      </div>
    </section>
  );
}
