// @ts-nocheck
import React from 'react';

export default function Toast({ show, children, onDismiss }) {
  return (
    <div
      id="toast"
      className={`toast ${show ? 'show' : ''}`}
      role="status"
      aria-live="polite"
      onKeyDown={e => { if (e.key === 'Escape') onDismiss?.(); }}
    >
      {children}
    </div>
  );
}
