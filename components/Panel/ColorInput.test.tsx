import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ColorInput } from './index';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe('ColorInput', () => {
  it('keeps intermediate hex drafts local and emits only complete colors', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onChange = vi.fn();

    act(() => root.render(
      <ColorInput label="Highlight" value="#FCFEFF" onChange={onChange} />,
    ));

    const input = container.querySelector<HTMLInputElement>('[aria-label="Highlight hex value"]');
    expect(input).toBeTruthy();
    const setNativeValue = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;

    act(() => {
      if (!input || !setNativeValue) return;
      setNativeValue.call(input, '#D8E');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(input?.value).toBe('#D8E');

    act(() => {
      if (!input || !setNativeValue) return;
      setNativeValue.call(input, '#D8EBF4');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenLastCalledWith('#D8EBF4');

    act(() => root.unmount());
  });
});
