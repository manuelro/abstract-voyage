// @ts-nocheck
import React from 'react';
import * as PRR from 'prism-react-renderer';

/**
 * Handle both v1 and v2 import shapes of prism-react-renderer.
 * - v1: default export is the <Highlight> component (+ defaultProps)
 * - v2: named export { Highlight } (+ themes)
 */
const HighlightComp = (PRR as any).default ?? (PRR as any).Highlight;
// defaultProps is optional; we don't rely on it to avoid undefined errors.

/**
 * Minimal custom theme that defers colors to your CSS variables where possible,
 * so it blends with light/dark and your accent tokens.
 */
const okTheme = {
  plain: {
    color: 'var(--text)',
    backgroundColor: 'transparent',
  },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: 'var(--muted)', fontStyle: 'italic' } },
    { types: ['punctuation'], style: { opacity: 0.75 } },
    { types: ['property', 'tag', 'boolean', 'number', 'constant', 'symbol', 'deleted'],
      style: { color: '#8AB4F8' } },
    { types: ['selector', 'attr-name', 'string', 'char', 'builtin', 'inserted'],
      style: { color: 'var(--accent-tint-1, #86E3E5)' } },
    { types: ['operator', 'entity', 'url'], style: { color: '#80CBC4' } },
    { types: ['keyword'], style: { color: '#C792EA' } },
    { types: ['function', 'class-name'], style: { color: '#FFD580' } },
    { types: ['regex', 'important', 'variable'], style: { color: '#E7EBF0' } },
  ],
};

type Props = {
  code: string;
  language?: 'css' | 'json' | 'javascript' | 'ts' | 'markup' | string;
  wrap?: boolean;
  id?: string;
  className?: string;
};

/**
 * If prism-react-renderer fails to resolve (bad import shape, SSR, etc.),
 * we fall back to a plain <pre> so the app never crashes.
 */
export default function CodePreview({ code = '', language = 'css', wrap = false, id, className = '' }: Props) {
  const trimmed = typeof code === 'string' ? code.replace(/\s+$/g, '') : '';

  if (!HighlightComp) {
    // Safe fallback
    return (
      <pre
        id={id}
        className={`tokens ${className}`}
        style={{ whiteSpace: wrap ? 'pre-wrap' : 'pre', margin: 0 }}
        tabIndex={0}
      >
        {trimmed}
      </pre>
    );
  }

  const Highlight = HighlightComp as any;

  return (
    <Highlight
      code={trimmed}
      language={language as any}
      theme={okTheme as any}
    >
      {({ className: prismCls, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          id={id}
          className={`tokens ${prismCls ?? ''} ${className}`}
          style={{ ...style, whiteSpace: wrap ? 'pre-wrap' : 'pre', margin: 0 }}
          tabIndex={0}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line, key: i })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token, key })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}
