// @ts-nocheck
'use client';

import React from 'react';

export default function CompareButton({ onHoldStart, onHoldEnd }) {
  const start = (e) => {
    e.preventDefault();
    onHoldStart?.();
  };
  const end = () => onHoldEnd?.();

  return (
    <button
      type="button"
      className="compare-btn"
      title="Press and hold to compare with the opposite theme"
      onMouseDown={start}
      onMouseUp={end}
      onMouseLeave={end}
      onTouchStart={start}
      onTouchEnd={end}
      onTouchCancel={end}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); start(e); } }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); end(); } }}
    >
      Compare
    </button>
  );
}
