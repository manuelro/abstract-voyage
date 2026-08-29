import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { Knob } from './index';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe('Knob', () => {
  it('drives the native range input by uniform min/max/step when steps is omitted (unchanged, existing behavior)', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(
      <Knob label="Opacity" value={0.5} min={0} max={1} step={0.1} onChange={() => {}} />,
    ));

    const range = container.querySelector<HTMLInputElement>('input[type="range"]');
    expect(range?.min).toBe('0');
    expect(range?.max).toBe('1');
    expect(range?.step).toBe('0.1');
    expect(range?.value).toBe('0.5');

    act(() => root.unmount());
  });

  it('drives the native range input by index into `steps`, not raw value, when steps is provided', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const steps = [0, 2, 4, 8, 16, 96];

    act(() => root.render(
      <Knob label="Gap" value={8} min={0} max={384} step={1} steps={steps} onChange={() => {}} />,
    ));

    const range = container.querySelector<HTMLInputElement>('input[type="range"]');
    // Index-driven: min=0, max=steps.length-1, value=index of 8 (which is 3).
    expect(range?.min).toBe('0');
    expect(range?.max).toBe(String(steps.length - 1));
    expect(range?.value).toBe('3');

    act(() => root.unmount());
  });

  it('snaps an off-scale value to the nearest entry in `steps` for display and aria attributes', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const steps = [0, 4, 8, 16, 64, 96];

    // 62 is closer to 64 than to 16 or 96.
    act(() => root.render(
      <Knob label="Gap" value={62} min={0} max={384} step={1} steps={steps} onChange={() => {}} />,
    ));

    const textInput = container.querySelector<HTMLInputElement>('[aria-label="Gap value"]');
    expect(textInput?.value).toBe('64');
    expect(textInput?.getAttribute('aria-valuenow')).toBe('64');
    expect(textInput?.getAttribute('aria-valuemin')).toBe('0');
    expect(textInput?.getAttribute('aria-valuemax')).toBe('96');

    act(() => root.unmount());
  });

  it('emits the snapped `steps` value (not the raw dragged index) when the range input changes', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const steps = [0, 4, 8, 16, 64, 96];
    const onChange = vi.fn();

    act(() => root.render(
      <Knob label="Gap" value={0} min={0} max={384} step={1} steps={steps} onChange={onChange} />,
    ));

    const range = container.querySelector<HTMLInputElement>('input[type="range"]');
    const setNativeValue = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;

    act(() => {
      if (!range || !setNativeValue) return;
      setNativeValue.call(range, '4'); // index 4 -> steps[4] === 64
      range.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith(64);

    act(() => root.unmount());
  });

  it('snaps a typed text value to the nearest `steps` entry on commit', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const steps = [0, 4, 8, 16, 64, 96];
    const onChange = vi.fn();

    act(() => root.render(
      <Knob label="Gap" value={0} min={0} max={384} step={1} steps={steps} onChange={onChange} />,
    ));

    const textInput = container.querySelector<HTMLInputElement>('[aria-label="Gap value"]');
    const setNativeValue = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;

    act(() => {
      if (!textInput || !setNativeValue) return;
      setNativeValue.call(textInput, '70'); // nearer to 64 than 96
      textInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => {
      textInput?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith(64);

    act(() => root.unmount());
  });
});
