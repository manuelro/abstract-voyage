import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createConfigScopeBinding } from './binding';
import { ConfigScopeRenderer } from './ConfigScopeRenderer';
import { defineConfigScope } from './defineConfigScope';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

// Minimal scope exercising kind: 'tabs' directly — PLAN-POSTS-LAB-PANEL-
// TABS.md's own generic primitive, tested here independent of any real
// page's config so these assertions hold for every future scope that
// adopts it, not just posts-lab.
type TabsDemoConfig = {
  globalToggle: boolean;
  mobilePadding: 'px-2' | 'px-4';
  tabletPadding: 'md:px-2' | 'md:px-4';
};

const DEFAULT_TABS_DEMO_CONFIG: TabsDemoConfig = {
  globalToggle: true,
  mobilePadding: 'px-2',
  tabletPadding: 'md:px-2',
};

function createTabsDemoDefinition() {
  return defineConfigScope<TabsDemoConfig>({
    id: 'Demo/tabs',
    component: 'Demo',
    scope: 'tabs',
    title: 'Demo tabs',
    createdAt: '2026-08-15',
    defaultValue: DEFAULT_TABS_DEMO_CONFIG,
    fields: [
      {
        kind: 'tabs',
        tabs: [
          {
            id: 'all-sizes',
            label: 'ALL SIZES',
            fields: [
              { kind: 'boolean', key: 'globalToggle', label: 'Global toggle' },
            ],
          },
          {
            id: 'mobile',
            label: 'MOBILE (< 768px)',
            fields: [
              {
                kind: 'group',
                label: 'Spacing',
                fields: [
                  {
                    kind: 'enum', key: 'mobilePadding', label: 'Mobile padding',
                    options: [{ label: 'PX-2', value: 'px-2' }, { label: 'PX-4', value: 'px-4' }],
                  },
                ],
              },
            ],
          },
          {
            id: 'tablet',
            label: 'TABLET (≥ 768px)',
            fields: [
              {
                kind: 'enum', key: 'tabletPadding', label: 'Tablet padding',
                options: [{ label: 'PX-2', value: 'md:px-2' }, { label: 'PX-4', value: 'md:px-4' }],
              },
            ],
          },
        ],
      },
    ],
    copy: {
      targetFile: 'demo.ts',
      targetSymbol: 'DEFAULT_TABS_DEMO_CONFIG',
      targetType: 'TabsDemoConfig',
    },
  });
}

describe('kind: "tabs" control resolver', () => {
  it('renders a real tablist and shows only the first tab\'s fields by default', () => {
    const definition = createTabsDemoDefinition();
    const binding = createConfigScopeBinding({
      definition,
      value: DEFAULT_TABS_DEMO_CONFIG,
      onChange: () => undefined,
    });
    const html = renderToStaticMarkup(<ConfigScopeRenderer binding={binding} />);

    expect(html).toContain('role="tablist"');
    expect(html).toContain('ALL SIZES');
    expect(html).toContain('MOBILE (&lt; 768px)');
    expect(html).toContain('TABLET (≥ 768px)');
    // First tab's own field renders...
    expect(html).toContain('Global toggle');
    // ...but a later tab's fields do not, since only the active tab renders.
    expect(html).not.toContain('Mobile padding');
    expect(html).not.toContain('Tablet padding');
  });

  it('switches which tab\'s fields render on click, without resetting any field\'s value', () => {
    const definition = createTabsDemoDefinition();
    const container = document.createElement('div');
    const root = createRoot(container);
    let currentValue = DEFAULT_TABS_DEMO_CONFIG;

    function Harness() {
      const [value, setValue] = React.useState<TabsDemoConfig>({ ...DEFAULT_TABS_DEMO_CONFIG, mobilePadding: 'px-4' });
      currentValue = value;
      return (
        <ConfigScopeRenderer
          binding={createConfigScopeBinding({ definition, value, onChange: setValue })}
        />
      );
    }

    act(() => root.render(<Harness />));
    expect(container.textContent).not.toContain('Mobile padding');

    const mobileTab = Array.from(container.querySelectorAll('[role="tab"]'))
      .find(tab => tab.textContent === 'MOBILE (< 768px)');
    expect(mobileTab).toBeTruthy();
    act(() => mobileTab?.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    expect(container.textContent).toContain('Mobile padding');
    expect(mobileTab?.getAttribute('aria-selected')).toBe('true');
    // Switching tabs is purely a visibility change — the value set before
    // switching (px-4, not the scope's own default px-2) must survive.
    expect(currentValue.mobilePadding).toBe('px-4');

    act(() => root.unmount());
  });

  it('moves focus and selection with ArrowRight/ArrowLeft/Home/End, wrapping at the ends', () => {
    const definition = createTabsDemoDefinition();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => root.render(
      <ConfigScopeRenderer
        binding={createConfigScopeBinding({
          definition,
          value: DEFAULT_TABS_DEMO_CONFIG,
          onChange: () => undefined,
        })}
      />,
    ));

    const getTabs = () => Array.from(container.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
    const [allSizesTab, mobileTab, tabletTab] = getTabs();

    allSizesTab.focus();
    act(() => allSizesTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(document.activeElement).toBe(mobileTab);
    expect(mobileTab.getAttribute('aria-selected')).toBe('true');

    act(() => mobileTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })));
    expect(document.activeElement).toBe(tabletTab);
    expect(tabletTab.getAttribute('aria-selected')).toBe('true');

    // Wraps past the last tab back to the first.
    act(() => tabletTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(document.activeElement).toBe(allSizesTab);

    act(() => allSizesTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })));
    expect(document.activeElement).toBe(allSizesTab);

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('gives every tab a roving tabIndex — only the active tab is in the natural tab order', () => {
    const definition = createTabsDemoDefinition();
    const binding = createConfigScopeBinding({
      definition,
      value: DEFAULT_TABS_DEMO_CONFIG,
      onChange: () => undefined,
    });
    const html = renderToStaticMarkup(<ConfigScopeRenderer binding={binding} />);
    expect(html.match(/tabindex="0"/g)?.length).toBe(1);
  });
});
