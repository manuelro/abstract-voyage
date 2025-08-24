// @ts-nocheck
import React from 'react';

export default function Tabs({ items, value, onChange, 'aria-label': ariaLabel }) {
  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {items.map(({ id, label }) => (
        <button
          key={id}
          className="tab"
          aria-pressed={value === id ? 'true' : 'false'}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
