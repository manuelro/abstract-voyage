import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG_SCOPE_SORT_PREFERENCE,
  useConfigScopeSortPreference,
} from './useConfigScopeSortPreference';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const STORAGE_KEY = 'panel-config-sort-preference';

beforeEach(() => {
  window.localStorage.clear();
});

function Harness({ onReady }: { onReady: (api: ReturnType<typeof useConfigScopeSortPreference>) => void }) {
  const api = useConfigScopeSortPreference();
  onReady(api);
  return null;
}

describe('useConfigScopeSortPreference', () => {
  it('defaults to recency-descending when nothing is stored', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    let latest: ReturnType<typeof useConfigScopeSortPreference> | undefined;

    act(() => root.render(<Harness onReady={api => { latest = api; }} />));

    expect(latest?.[0]).toEqual(DEFAULT_CONFIG_SCOPE_SORT_PREFERENCE);
    act(() => root.unmount());
  });

  it('reads a previously stored preference on mount', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ field: 'name', direction: 'asc' }));
    const container = document.createElement('div');
    const root = createRoot(container);
    let latest: ReturnType<typeof useConfigScopeSortPreference> | undefined;

    act(() => root.render(<Harness onReady={api => { latest = api; }} />));

    expect(latest?.[0]).toEqual({ field: 'name', direction: 'asc' });
    act(() => root.unmount());
  });

  it('falls back to the default for malformed stored JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    const container = document.createElement('div');
    const root = createRoot(container);
    let latest: ReturnType<typeof useConfigScopeSortPreference> | undefined;

    act(() => root.render(<Harness onReady={api => { latest = api; }} />));

    expect(latest?.[0]).toEqual(DEFAULT_CONFIG_SCOPE_SORT_PREFERENCE);
    act(() => root.unmount());
  });

  it('writes updates to localStorage and reflects them immediately', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    let latest: ReturnType<typeof useConfigScopeSortPreference> | undefined;

    act(() => root.render(<Harness onReady={api => { latest = api; }} />));
    act(() => latest?.[1]({ field: 'name', direction: 'desc' }));

    expect(latest?.[0]).toEqual({ field: 'name', direction: 'desc' });
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({ field: 'name', direction: 'desc' });

    act(() => root.unmount());
  });
});
