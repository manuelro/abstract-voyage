import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createConfigScopeBinding } from './binding';
import { ConfigScopeList } from './ConfigScopeList';
import { defineConfigScope } from './defineConfigScope';
import { recordConfigScopeOpen } from './useConfigScopeUsage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

// The global-only filter toggle persists to localStorage (see
// useConfigScopeGlobalFilter.ts) — cleared before every test so a write in
// one test can never leak its "on" state into the next.
beforeEach(() => {
  window.localStorage.clear();
});

// React tracks a controlled input's previous value via a hidden setter on
// the native prototype, so a plain `input.value = x` assignment is invisible
// to its onChange — this native-setter dispatch is the standard workaround.
function typeIntoInput(input: HTMLInputElement, text: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  nativeSetter.call(input, text);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

type DemoConfig = { amount: number };

function makeBinding(options: {
  id: string;
  component: string;
  title: string;
  summary: string;
  createdAt: string;
  global?: boolean;
}) {
  const definition = defineConfigScope<DemoConfig>({
    id: options.id,
    component: options.component,
    scope: 'performance',
    title: options.title,
    summary: options.summary,
    createdAt: options.createdAt,
    defaultValue: { amount: 0.5 },
    fields: [
      { kind: 'number', key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.1 },
    ],
    copy: {
      targetFile: 'demo.config.ts',
      targetSymbol: 'DEFAULT_DEMO_CONFIG',
      targetType: 'DemoConfig',
    },
  });
  return createConfigScopeBinding({
    definition, value: { amount: 0.5 }, onChange: vi.fn(), global: options.global,
  });
}

describe('ConfigScopeList', () => {
  const bindings = [
    makeBinding({ id: 'A/perf', component: 'A', title: 'Alpha section', summary: 'Older scope', createdAt: '2026-01-01' }),
    makeBinding({ id: 'B/perf', component: 'B', title: 'Bravo section', summary: 'Newer scope', createdAt: '2026-06-01' }),
  ];

  it('renders every binding by default, newest first (recency descending default)', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<ConfigScopeList bindings={bindings} />));

    const titles = Array.from(container.querySelectorAll('[class*="componentSectionTitle"]:not([class*="Wrap"])'))
      .map(node => node.textContent);
    expect(titles).toEqual(['Bravo section', 'Alpha section']);

    act(() => root.unmount());
  });

  it('filters sections by title, summary, or component on search', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<ConfigScopeList bindings={bindings} />));

    const input = container.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input).toBeTruthy();
    act(() => typeIntoInput(input!, 'older'));

    const titles = Array.from(container.querySelectorAll('[class*="componentSectionTitle"]:not([class*="Wrap"])'))
      .map(node => node.textContent);
    expect(titles).toEqual(['Alpha section']);

    act(() => root.unmount());
  });

  it('shows an empty state when the search query matches nothing', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<ConfigScopeList bindings={bindings} />));

    const input = container.querySelector<HTMLInputElement>('input[type="text"]');
    act(() => typeIntoInput(input!, 'nonexistent-query'));

    expect(container.textContent).toContain('No sections match');
    expect(container.querySelectorAll('[class*="componentSectionTitle"]:not([class*="Wrap"])').length).toBe(0);

    act(() => root.unmount());
  });

  it('re-sorts by name ascending when that sort option is selected', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<ConfigScopeList bindings={bindings} />));

    const nameAscButton = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent === 'NAME A→Z');
    expect(nameAscButton).toBeTruthy();
    act(() => nameAscButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    const titles = Array.from(container.querySelectorAll('[class*="componentSectionTitle"]:not([class*="Wrap"])'))
      .map(node => node.textContent);
    expect(titles).toEqual(['Alpha section', 'Bravo section']);

    act(() => root.unmount());
  });

  it('shows only global-bound sections when "Global only" is toggled on', () => {
    const mixedBindings = [
      makeBinding({ id: 'A/perf', component: 'A', title: 'Alpha section', summary: 'Older scope', createdAt: '2026-01-01' }),
      makeBinding({
        id: 'B/perf', component: 'B', title: 'Bravo section', summary: 'Newer scope', createdAt: '2026-06-01', global: true,
      }),
    ];
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<ConfigScopeList bindings={mixedBindings} />));

    // "Global only" is now a toggle-style button (aria-pressed), sharing
    // the sort segments' own control group — not a checkbox input, see
    // ConfigScopeList.tsx's own doc comment on the merged toolbar.
    const toggleButton = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent === 'Global only');
    expect(toggleButton).toBeTruthy();
    act(() => toggleButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    const titles = Array.from(container.querySelectorAll('[class*="componentSectionTitle"]:not([class*="Wrap"])'))
      .map(node => node.textContent);
    expect(titles).toEqual(['Bravo section']);

    act(() => root.unmount());
  });

  it('shows a global-only empty state when nothing bound is global', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<ConfigScopeList bindings={bindings} />));

    const toggleButton = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent === 'Global only');
    act(() => toggleButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    expect(container.textContent).toContain('No global sections on this page');
    expect(container.querySelectorAll('[class*="componentSectionTitle"]:not([class*="Wrap"])').length).toBe(0);

    act(() => root.unmount());
  });

  // Below: usage-seeded tests. recordConfigScopeOpen writes through to a
  // module-level in-memory cache that beforeEach's localStorage.clear()
  // doesn't reset — safe here only because these are the last tests in the
  // file (nothing after them depends on a pristine cache) and because each
  // assertion is about relative membership (is B ranked in/out), not exact
  // recorded counts, so residual counts from an earlier test in this group
  // can never flip an assertion.

  it('excludes a frequently-used scope from the main list below (no duplicates)', () => {
    recordConfigScopeOpen('B/perf');

    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<ConfigScopeList bindings={bindings} />));

    const titles = Array.from(container.querySelectorAll('[class*="componentSectionTitle"]:not([class*="Wrap"])'))
      .map(node => node.textContent);
    expect(titles).toEqual(['Bravo section', 'Alpha section']);
    expect(titles.filter(title => title === 'Bravo section')).toHaveLength(1);

    act(() => root.unmount());
  });

  it('uses a distinct standard-list group after frequently used scopes', () => {
    const groupedBindings = [
      makeBinding({ id: 'Boundary/frequent', component: 'Boundary', title: 'Frequent scope', summary: 'Pinned', createdAt: '2026-01-01' }),
      makeBinding({ id: 'Boundary/standard', component: 'Boundary', title: 'Standard scope', summary: 'Regular', createdAt: '2026-01-02' }),
    ];
    recordConfigScopeOpen('Boundary/frequent');

    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<ConfigScopeList bindings={groupedBindings} />));

    const frequentlyUsed = container.querySelector<HTMLElement>('[class*="scopeListFrequentlyUsed"]');
    const standard = container.querySelector<HTMLElement>('[class*="scopeListStandard"]');
    expect(frequentlyUsed).toBeTruthy();
    expect(standard).toBeTruthy();
    expect(frequentlyUsed?.nextElementSibling).toBe(standard);
    expect(standard?.children).toHaveLength(1);

    act(() => root.unmount());
  });

  it('narrows the frequently-used strip on search instead of hiding it outright', () => {
    recordConfigScopeOpen('B/perf');

    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<ConfigScopeList bindings={bindings} />));

    // Not the generic input[type="text"] selector used elsewhere in this
    // file: with a Frequently Used item rendered above the search field,
    // that item's own "Amount value" number field (also type="text") comes
    // first in DOM order and silently wins the query instead.
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Search config sections"]');
    act(() => typeIntoInput(input!, 'newer'));

    expect(container.textContent).toContain('Frequently used');
    const titles = Array.from(container.querySelectorAll('[class*="componentSectionTitle"]:not([class*="Wrap"])'))
      .map(node => node.textContent);
    expect(titles).toEqual(['Bravo section']);

    act(() => root.unmount());
  });

  it('hides the frequently-used strip when the search query matches none of its candidates', () => {
    recordConfigScopeOpen('B/perf');

    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<ConfigScopeList bindings={bindings} />));

    const input = container.querySelector<HTMLInputElement>('input[aria-label="Search config sections"]');
    act(() => typeIntoInput(input!, 'older'));

    expect(container.textContent).not.toContain('Frequently used');
    const titles = Array.from(container.querySelectorAll('[class*="componentSectionTitle"]:not([class*="Wrap"])'))
      .map(node => node.textContent);
    expect(titles).toEqual(['Alpha section']);

    act(() => root.unmount());
  });
});
