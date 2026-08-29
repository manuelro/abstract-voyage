import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { useConfigScopeGlobalFilter } from './useConfigScopeGlobalFilter';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const STORAGE_KEY = 'panel-config-global-filter';

beforeEach(() => {
  window.localStorage.clear();
});

function Harness({ onReady }: { onReady: (api: ReturnType<typeof useConfigScopeGlobalFilter>) => void }) {
  const api = useConfigScopeGlobalFilter();
  onReady(api);
  return null;
}

describe('useConfigScopeGlobalFilter', () => {
  it('defaults to off when nothing is stored', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    let latest: ReturnType<typeof useConfigScopeGlobalFilter> | undefined;

    act(() => root.render(<Harness onReady={api => { latest = api; }} />));

    expect(latest?.[0]).toBe(false);
    act(() => root.unmount());
  });

  it('reads a previously stored preference on mount', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    const container = document.createElement('div');
    const root = createRoot(container);
    let latest: ReturnType<typeof useConfigScopeGlobalFilter> | undefined;

    act(() => root.render(<Harness onReady={api => { latest = api; }} />));

    expect(latest?.[0]).toBe(true);
    act(() => root.unmount());
  });

  it('falls back to the default for a malformed stored value', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not-a-boolean');
    const container = document.createElement('div');
    const root = createRoot(container);
    let latest: ReturnType<typeof useConfigScopeGlobalFilter> | undefined;

    act(() => root.render(<Harness onReady={api => { latest = api; }} />));

    expect(latest?.[0]).toBe(false);
    act(() => root.unmount());
  });

  it('writes updates to localStorage and reflects them immediately', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    let latest: ReturnType<typeof useConfigScopeGlobalFilter> | undefined;

    act(() => root.render(<Harness onReady={api => { latest = api; }} />));
    act(() => latest?.[1](true));

    expect(latest?.[0]).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');

    act(() => root.unmount());
  });
});
