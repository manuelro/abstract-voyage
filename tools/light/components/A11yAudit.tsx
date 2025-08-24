// @ts-nocheck
'use client';

import React, { useMemo } from 'react';
import Tabs from './Tabs';
import { contrastRatio } from '../utils/color';
import { badgeForTextCR, badgeForUiCR } from '../utils/tokens';
import SectionHead from './SectionHead';
import { EXEMPT_USES, MANDATORY_USES } from '../policy';

const fmt2 = n => (Math.round(n * 100) / 100).toFixed(2);
const HEX_RE = /^#([0-9A-Fa-f]{6})$/;
const isHex = x => typeof x === 'string' && HEX_RE.test(x.trim());

function resolveCssVar(name, vars, seen = new Set(), depth = 0) {
  if (!name) return '#000000';
  const raw = vars[name];
  if (isHex(raw)) return raw.trim();
  if (typeof raw !== 'string') return '#000000';
  const m = /^var\(\s*(--[-\w]+)\s*(?:,\s*([^)]+))?\s*\)$/.exec(raw.trim());
  if (!m) return isHex(raw.trim()) ? raw.trim() : '#000000';
  const ref = m[1], fallback = (m[2] || '').trim();
  if (seen.has(name) || depth > 10) return isHex(fallback) ? fallback : '#000000';
  seen.add(name);
  const resolved = resolveCssVar(ref, vars, seen, depth + 1);
  return isHex(resolved) ? resolved : (isHex(fallback) ? fallback : '#000000');
}

const Swatch = ({ hex }) => (
  <span>
    <span className="swatch" style={{ background: hex }} />
    <span className="a11y-chip">{hex}</span>
  </span>
);

function Table({ scopeClass, scopeVars, steps }) {
  const rv = (name) => resolveCssVar(name, scopeVars);

  const checks = useMemo(() => {
    const rows = [];
    const push = (use, fgv, bgv, kind) => {
      const fg = rv(fgv), bg = rv(bgv);
      const cr = contrastRatio(fg, bg);
      const badge = kind === 'ui' ? badgeForUiCR(cr) : badgeForTextCR(cr);
      rows.push({ use, fg, bg, cr, badge });
    };

    // Core text on surfaces
    [
      ['Body on bg','--text','--bg'],
      ['Body on surface','--text','--surface'],
      ['Body on elevated','--text','--elevated'],
      ['Muted on bg','--muted','--bg'],
      ['Muted on surface','--muted','--surface'],
    ].forEach(([u,f,b]) => push(u,f,b,'text'));

    // Links (accent as text)
    [
      ['Link on bg','--accent-shade-1','--bg'],
      ['Link on surface','--accent-shade-1','--surface'],
      ['Link (strong) on bg','--accent-shade-2','--bg'],
      ['Link (strong) on surface','--accent-shade-2','--surface'],
    ].forEach(([u,f,b]) => push(u,f,b,'text'));

    // CTA states (text)
    [
      ['CTA default','--cta-fg','--cta-bg'],
      ['CTA hover','--cta-fg-hover','--cta-bg-hover'],
      ['CTA disabled','--cta-fg-disabled','--cta-bg-disabled'],
    ].forEach(([u,f,b]) => push(u,f,b,'text'));

    // Non-text UI (3:1)
    [
      ['Border vs bg','--border','--bg'],
      ['Focus ring vs bg','--ring','--bg'],
    ].forEach(([u,f,b]) => push(u,f,b,'ui'));

    // Tiles (on-accent labels)
    steps.forEach(s => {
      const u = `Tile label on ${s.label}`;
      const fg = rv(`--on-accent-${s.key}`);
      const bg = rv(`--accent-${s.key}`);
      const cr = contrastRatio(fg, bg);
      rows.push({ use: u, fg, bg, cr, badge: badgeForTextCR(cr) });
    });

    return rows.sort((a, b) => {
      const score = c => (c.badge.cls === 'fail' ? 0 : c.badge.cls === 'large' ? 1 : c.badge.cls === 'aa' ? 2 : 3);
      const d = score(a) - score(b);
      return d !== 0 ? d : b.cr - a.cr;
    });
  }, [scopeVars, steps]);

  return (
    <div className={scopeClass} style={scopeVars}>
      <div className="a11y-wrap">
        <table className="a11y" aria-label={`WCAG contrast audit (${scopeClass.includes('light') ? 'light' : 'dark'})`}>
          <thead>
            <tr><th>Use</th><th>Foreground</th><th>Background</th><th>CR</th><th>Meets</th></tr>
          </thead>
          <tbody>
            {checks.map((c, i) => {
              const isMandatory = MANDATORY_USES.has(c.use);
              const isExempt = EXEMPT_USES.has(c.use);
              return (
                <tr key={i} className={`${isMandatory ? 'policy-mandatory' : ''} ${isExempt ? 'policy-exempt' : ''}`}>
                  <td className="a11y-use">
                    {c.use}
                    {isMandatory && <span className="badge policy">Mandatory</span>}
                    {isExempt && <span className="badge policy">Exempt</span>}
                  </td>
                  <td><Swatch hex={c.fg} /></td>
                  <td><Swatch hex={c.bg} /></td>
                  <td>{fmt2(c.cr)}:1</td>
                  <td><span className={`badge ${c.badge.cls}`}>{c.badge.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="a11y-note">Text: AA ≥ 4.5, AAA ≥ 7. Large text AA ≥ 3. Non-text UI (borders, focus rings) ≥ 3. Mandatory rows must pass.</p>
    </div>
  );
}

export default function A11yAudit({
  // switched to global theme (tabs moved to top bar previously)
  globalTheme = 'dark',
  styleVars, steps,
  passRate, totalChecks,
  onOptimizeBase, targetPassRate = 0.95,
  isOptimizing = false,
  results = [],
  brandDistance,

  // NEW: hide the optimize button here (moved to top bar)
  showOptimizeButton = false,
}) {
  const pct = Math.round((passRate ?? 0) * 100);
  const showOptimize = showOptimizeButton && passRate < targetPassRate;

  return (
    <section>
      <SectionHead
        title="Accessibility audit"
        subtitle={null}
        collapsible={false}
        collapsed={false}
        onToggle={() => {}}
      />

      <div className="row" style={{ justifyContent: 'space-between', margin: '8px 0' }}>
        <div className="muted">
          Accent link/focus pass rate: <strong>{pct}%</strong> of {totalChecks} checks (target ≥ {Math.round(targetPassRate*100)}%)
        </div>

        {showOptimize && (
          <button
            className="copy cta"
            onClick={() => onOptimizeBase?.(targetPassRate)}
            disabled={isOptimizing}
            style={{ opacity: isOptimizing ? 0.6 : 1, cursor: isOptimizing ? 'progress' : 'pointer' }}
          >
            {isOptimizing ? 'Optimizing…' : `Optimize to ≥${Math.round(targetPassRate*100)}%`}
          </button>
        )}
      </div>

      {globalTheme === 'light'
        ? <Table scopeClass="sim-light" scopeVars={styleVars.light} steps={steps.light} />
        : <Table scopeClass="sim-dark"  scopeVars={styleVars.dark}  steps={steps.dark} />
      }
    </section>
  );
}
