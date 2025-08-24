// @ts-nocheck
import React from 'react';

export default function Tabs({ items, value, onChange, 'aria-label': ariaLabel }) {
  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {items.map(({ id, label, disabled, title }) => (
        <button
          key={id}
          className="tab"
          aria-pressed={value === id ? 'true' : 'false'}
          aria-disabled={disabled ? 'true' : 'false'}
          disabled={!!disabled}
          title={title}
          onClick={() => { if (!disabled) onChange(id); }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
