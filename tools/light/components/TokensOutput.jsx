// @ts-nocheck
import React, { useMemo, useState } from 'react';
import {
  exportCssVarsMulti,
  buildDesignTokensMulti,
  buildFigmaTokens,
  buildTailwindConfig,
  buildBootstrapCss
} from '../utils/tokens';
import { downloadText } from '../utils/download';
import { copyText } from '../utils/clipboard';
import Tabs from './Tabs';
import SectionHead from './SectionHead';
import CodePreview from './CodePreview';

const FORMAT_TABS = [
  { id: 'css', label: 'CSS Variables' },
  { id: 'json', label: 'Design Tokens (JSON)' },
  { id: 'tailwind', label: 'Tailwind' },
  { id: 'figma', label: 'Figma / Tokens Studio' },
  { id: 'bootstrap', label: 'Bootstrap' },
];

export default function TokensOutput({
  deltaScale,
  // primary accent
  stepsPrimary,
  styleVarsPrimary,
  // optional secondary accent
  stepsSecondary = null,
  styleVarsSecondary = null,
  secondaryEnabled = false,
  // copy callbacks (optional; falls back to internal copy util)
  onCopyCss,
  onCopyJson,
  onCopyFigma,
  onCopyTailwind,
  onCopyBootstrap
}) {
  const hasSecondary = !!(secondaryEnabled && stepsSecondary && styleVarsSecondary);

  // ---- Export options (local UI state) ----
  const [format, setFormat] = useState('css');
  const [namespace, setNamespace] = useState('accent');   // --accent-*
  const [namespace2, setNamespace2] = useState('accent2'); // --accent2-*
  const [darkMode, setDarkMode] = useState('data'); // 'data' | 'class' | 'media'
  const [outputSpace, setOutputSpace] = useState('oklch'); // 'oklch' | 'hex'
  const [decimals, setDecimals] = useState(2); // for oklch()
  const [withFallbacks, setWithFallbacks] = useState(true); // @supports fallbacks for OKLCH
  const [wrap, setWrap] = useState(false); // soft wrap code
  const [fullscreen, setFullscreen] = useState(false); // fullscreen code view

  // ---- Build strings for each format (memoized) ----
  const cssText = useMemo(() => {
    const opts = {
      namespace,
      namespace2,
      darkMode,
      outFormat: outputSpace,
      decimals,
      includeFallbacks: withFallbacks && outputSpace === 'oklch',
    };
    return exportCssVarsMulti(
      // primary
      styleVarsPrimary.light, styleVarsPrimary.dark, deltaScale, stepsPrimary.light, stepsPrimary.dark,
      // secondary (optional)
      hasSecondary ? styleVarsSecondary.light : null,
      hasSecondary ? styleVarsSecondary.dark  : null,
      hasSecondary ? stepsSecondary.light     : null,
      hasSecondary ? stepsSecondary.dark      : null,
      // options
      opts
    );
  }, [
    styleVarsPrimary, styleVarsSecondary, stepsPrimary, stepsSecondary, deltaScale, hasSecondary,
    namespace, namespace2, darkMode, outputSpace, decimals, withFallbacks
  ]);

  const jsonText = useMemo(() => {
    const obj = buildDesignTokensMulti(
      // primary
      styleVarsPrimary.light, styleVarsPrimary.dark, deltaScale, stepsPrimary.light, stepsPrimary.dark,
      // secondary (optional)
      hasSecondary ? styleVarsSecondary.light : null,
      hasSecondary ? styleVarsSecondary.dark  : null,
      hasSecondary ? stepsSecondary.light     : null,
      hasSecondary ? stepsSecondary.dark      : null
    );
    return JSON.stringify(obj, null, 2);
  }, [styleVarsPrimary, styleVarsSecondary, stepsPrimary, stepsSecondary, deltaScale, hasSecondary]);

  const figmaText = useMemo(() => {
    return buildFigmaTokens(
      styleVarsPrimary.light, styleVarsPrimary.dark, deltaScale, stepsPrimary.light, stepsPrimary.dark,
      hasSecondary ? styleVarsSecondary.light : null,
      hasSecondary ? styleVarsSecondary.dark  : null,
      hasSecondary ? stepsSecondary.light     : null,
      hasSecondary ? stepsSecondary.dark      : null
    );
  }, [styleVarsPrimary, styleVarsSecondary, stepsPrimary, stepsSecondary, deltaScale, hasSecondary]);

  const tailwindText = useMemo(() => {
    const opts = { namespace, namespace2 };
    return buildTailwindConfig(
      styleVarsPrimary.light, styleVarsPrimary.dark, stepsPrimary.light, stepsPrimary.dark,
      hasSecondary ? styleVarsSecondary.light : null,
      hasSecondary ? styleVarsSecondary.dark  : null,
      hasSecondary ? stepsSecondary.light     : null,
      hasSecondary ? stepsSecondary.dark      : null,
      opts
    );
  }, [styleVarsPrimary, styleVarsSecondary, stepsPrimary, stepsSecondary, hasSecondary, namespace, namespace2]);

  const bootstrapCss = useMemo(() => {
    const opts = { namespace, namespace2 };
    return buildBootstrapCss(
      styleVarsPrimary.light, styleVarsPrimary.dark,
      hasSecondary ? styleVarsSecondary.light : null,
      hasSecondary ? styleVarsSecondary.dark  : null,
      opts
    );
  }, [styleVarsPrimary, styleVarsSecondary, hasSecondary, namespace, namespace2]);

  const activeText =
    format === 'css' ? cssText
    : format === 'json' ? jsonText
    : format === 'tailwind' ? tailwindText
    : format === 'figma' ? figmaText
    : bootstrapCss;

  const activeLanguage =
    format === 'css' ? 'css'
    : format === 'json' ? 'json'
    : format === 'tailwind' ? 'javascript'
    : format === 'figma' ? 'json'
    : 'css';

  // ---- Copy / Download handlers ----
  const handleCopy = async () => {
    const text = activeText;
    if (format === 'css') { onCopyCss?.(text) ?? await copyText(text); return; }
    if (format === 'json') { onCopyJson?.(text) ?? await copyText(text); return; }
    if (format === 'tailwind') { onCopyTailwind?.(text) ?? await copyText(text); return; }
    if (format === 'figma') { onCopyFigma?.(text) ?? await copyText(text); return; }
    if (format === 'bootstrap') { onCopyBootstrap?.(text) ?? await copyText(text); return; }
    await copyText(text);
  };

  const handleDownload = () => {
    const name =
      format === 'css' ? 'tokens.css'
      : format === 'json' ? 'tokens.json'
      : format === 'tailwind' ? 'tailwind.config.fragment.cjs'
      : format === 'figma' ? 'figma.tokens.json'
      : 'bootstrap.vars.css';
    downloadText(name, activeText);
  };

  const codeId = 'export-code';

  // Context sentence per tab
  const context = (
    <>
      {format === 'css' && <>Exports <code>:root</code> (light) and {darkMode === 'media' ? <code>@media (prefers-color-scheme: dark)</code> : darkMode === 'class' ? <code>.dark</code> : <code>[data-theme="dark"]</code>} (dark).</>}
      {format === 'json' && <>W3C design tokens JSON. Modes: <code>dark</code>.</>}
      {format === 'tailwind' && <>Paste into <code>theme.extend.colors</code>. Set <code>darkMode</code> in your app.</>}
      {format === 'figma' && <>Tokens Studio: Import JSON → Create Light/Dark → Sync to Figma Variables.</>}
      {format === 'bootstrap' && <>Overrides Bootstrap CSS variables using your tokens.</>}
    </>
  );

  return (
    <section>
      <SectionHead title="Export & Integrate" />

      {/* Format tabs */}
      <Tabs items={FORMAT_TABS} value={format} onChange={setFormat} aria-label="Export format" />

      {/* Config strip (contextual) */}
      <div className="export-config" role="group" aria-label="Export options">
        {/* Namespace(s) */}
        <div className="field">
          <label>Namespace</label>
          <input
            type="text"
            value={namespace}
            onChange={(e) => setNamespace(e.target.value.trim() || 'accent')}
            aria-label="CSS variable namespace for primary"
          />
          <p className="help">Variables will be <code>--{namespace}-0</code>, <code>--on-{namespace}-0</code>.</p>
        </div>

        {hasSecondary && (
          <div className="field">
            <label>Secondary namespace</label>
            <input
              type="text"
              value={namespace2}
              onChange={(e) => setNamespace2(e.target.value.trim() || 'accent2')}
              aria-label="CSS variable namespace for secondary"
            />
            <p className="help">Secondary: <code>--{namespace2}-0</code>, <code>--on-{namespace2}-0</code>.</p>
          </div>
        )}

        {/* Dark-mode strategy (CSS / Tailwind relevant) */}
        {format === 'css' && (
          <div className="field">
            <label>Dark-mode strategy</label>
            <select value={darkMode} onChange={(e) => setDarkMode(e.target.value)}>
              <option value="data">[data-theme="dark"]</option>
              <option value="class">.dark class</option>
              <option value="media">prefers-color-scheme</option>
            </select>
            <p className="help">Pick how your app toggles dark mode.</p>
          </div>
        )}

        {/* Output color space */}
        {format === 'css' && (
          <>
            <div className="field">
              <label>Output colors</label>
              <select value={outputSpace} onChange={(e) => setOutputSpace(e.target.value)}>
                <option value="oklch">oklch()</option>
                <option value="hex">hex (#RRGGBB)</option>
              </select>
              <p className="help">OKLCH keeps hue &amp; chroma consistent.</p>
            </div>
            {outputSpace === 'oklch' && (
              <>
                <div className="field">
                  <label>Decimals</label>
                  <select value={String(decimals)} onChange={(e) => setDecimals(parseInt(e.target.value, 10))}>
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                  <p className="help">Round OKLCH components to this precision.</p>
                </div>
                <div className="field">
                  <label className="row" style={{ alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={withFallbacks}
                      onChange={(e) => setWithFallbacks(e.target.checked)}
                      aria-label="Include fallbacks"
                    />
                    <span>Include hex fallbacks</span>
                  </label>
                  <p className="help">Adds a hex version + <code>@supports (color: oklch())</code> override.</p>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Code container (toolbar is sticky inside) */}
      <div className={`code-wrap ${fullscreen ? 'fullscreen' : ''}`} role="region" aria-labelledby="code-toolbar">
        <div id="code-toolbar" className="code-toolbar">
          <div className="muted">{context}</div>
          <div className="row">
            <button className="copy" onClick={() => setWrap(v => !v)} aria-pressed={wrap ? 'true' : 'false'}>
              {wrap ? 'Unwrap' : 'Wrap'}
            </button>
            <button className="copy" onClick={() => setFullscreen(true)}>
              Fullscreen
            </button>
            <button className="copy" onClick={handleCopy} aria-controls={codeId}>Copy</button>
            <button className="copy" onClick={handleDownload} aria-controls={codeId}>Download</button>
          </div>
        </div>

        <CodePreview id={codeId} code={activeText} language={activeLanguage} wrap={wrap} />
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div className="code-wrap fullscreen-overlay" role="dialog" aria-modal="true">
          <div className="code-toolbar">
            <div className="muted">{context}</div>
            <div className="row">
              <button className="copy" onClick={() => setWrap(v => !v)} aria-pressed={wrap ? 'true' : 'false'}>
                {wrap ? 'Unwrap' : 'Wrap'}
              </button>
              <button className="copy" onClick={handleCopy}>Copy</button>
              <button className="copy" onClick={handleDownload}>Download</button>
              <button className="copy" onClick={() => setFullscreen(false)} aria-label="Close fullscreen">Close</button>
            </div>
          </div>
          <CodePreview code={activeText} language={activeLanguage} wrap={wrap} />
        </div>
      )}
    </section>
  );
}
