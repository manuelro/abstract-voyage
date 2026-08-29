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

// Minimal scope exercising kind: 'areas' directly — PLAN-POSTS-LAB-PANEL-
// TABS.md §12's own generic primitive, tested here independent of any real
// page's config. Each area wraps its own kind: 'tabs' entry, mirroring how
// postLab.panel.ts actually uses it (both areas keep the full device-tab
// structure — §12.4), so this also exercises areas-containing-tabs, not
// just areas-containing-plain-fields.
type AreasDemoConfig = {
  headerToggle: boolean;
  contentToggle: boolean;
  contentMobilePadding: 'px-2' | 'px-4';
};

const DEFAULT_AREAS_DEMO_CONFIG: AreasDemoConfig = {
  headerToggle: true,
  contentToggle: true,
  contentMobilePadding: 'px-2',
};

function createAreasDemoDefinition() {
  return defineConfigScope<AreasDemoConfig>({
    id: 'Demo/areas',
    component: 'Demo',
    scope: 'areas',
    title: 'Demo areas',
    createdAt: '2026-08-15',
    defaultValue: DEFAULT_AREAS_DEMO_CONFIG,
    fields: [
      {
        kind: 'areas',
        areas: [
          {
            id: 'header',
            label: 'HEADER',
            fields: [
              { kind: 'boolean', key: 'headerToggle', label: 'Header toggle' },
            ],
          },
          {
            id: 'content',
            label: 'CONTENT',
            fields: [
              {
                kind: 'tabs',
                tabs: [
                  {
                    id: 'all-sizes',
                    label: 'ALL SIZES',
                    fields: [
                      { kind: 'boolean', key: 'contentToggle', label: 'Content toggle' },
                    ],
                  },
                  {
                    id: 'mobile',
                    label: 'MOBILE (< 768px)',
                    fields: [
                      {
                        kind: 'enum',
                        key: 'contentMobilePadding',
                        label: 'Content mobile padding',
                        options: [{ label: 'PX-2', value: 'px-2' }, { label: 'PX-4', value: 'px-4' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    copy: {
      targetFile: 'demo.ts',
      targetSymbol: 'DEFAULT_AREAS_DEMO_CONFIG',
      targetType: 'AreasDemoConfig',
    },
  });
}

describe('kind: "areas" control resolver', () => {
  it('renders a boxed-pill area switch and shows only the first area\'s fields by default', () => {
    const definition = createAreasDemoDefinition();
    const binding = createConfigScopeBinding({
      definition,
      value: DEFAULT_AREAS_DEMO_CONFIG,
      onChange: () => undefined,
    });
    const html = renderToStaticMarkup(<ConfigScopeRenderer binding={binding} />);

    expect(html).toContain('role="group"');
    expect(html).toContain('HEADER');
    expect(html).toContain('CONTENT');
    // First area's own field renders...
    expect(html).toContain('Header toggle');
    // ...but the second area's fields (including its own nested tabs
    // switch) do not, since only the active area renders.
    expect(html).not.toContain('Content toggle');
    expect(html).not.toContain('role="tablist"');
  });

  it('switches which area\'s fields render on click, without resetting any field\'s value', () => {
    const definition = createAreasDemoDefinition();
    const container = document.createElement('div');
    const root = createRoot(container);
    let currentValue = DEFAULT_AREAS_DEMO_CONFIG;

    function Harness() {
      const [value, setValue] = React.useState<AreasDemoConfig>({
        ...DEFAULT_AREAS_DEMO_CONFIG,
        contentMobilePadding: 'px-4',
      });
      currentValue = value;
      return (
        <ConfigScopeRenderer
          binding={createConfigScopeBinding({ definition, value, onChange: setValue })}
        />
      );
    }

    act(() => root.render(<Harness />));
    expect(container.textContent).not.toContain('Content toggle');

    const contentArea = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent === 'CONTENT');
    expect(contentArea).toBeTruthy();
    act(() => contentArea?.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    expect(container.textContent).toContain('Content toggle');
    // The nested tabs switch inside CONTENT renders too, defaulting to its
    // own first tab.
    expect(container.textContent).toContain('ALL SIZES');
    expect(container.textContent).not.toContain('Content mobile padding');

    // Switching areas is purely a visibility change — a value set before
    // switching away from CONTENT (px-4, not the scope's own default px-2)
    // must survive even though CONTENT's own fields were unmounted while
    // HEADER was active.
    expect(currentValue.contentMobilePadding).toBe('px-4');

    act(() => root.unmount());
  });

  it('marks the active area with a persistent selected state (data-selected/aria-pressed), not a transient one', () => {
    const definition = createAreasDemoDefinition();
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => root.render(
      <ConfigScopeRenderer
        binding={createConfigScopeBinding({
          definition,
          value: DEFAULT_AREAS_DEMO_CONFIG,
          onChange: () => undefined,
        })}
      />,
    ));

    const getAreaButton = (label: string) => Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent === label) as HTMLButtonElement;

    const headerButton = getAreaButton('HEADER');
    const contentButton = getAreaButton('CONTENT');
    expect(headerButton.getAttribute('data-selected')).toBe('true');
    expect(headerButton.getAttribute('aria-pressed')).toBe('true');
    expect(contentButton.getAttribute('data-selected')).toBe('false');
    expect(contentButton.getAttribute('aria-pressed')).toBe('false');

    act(() => contentButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    expect(getAreaButton('HEADER').getAttribute('data-selected')).toBe('false');
    expect(getAreaButton('CONTENT').getAttribute('data-selected')).toBe('true');

    act(() => root.unmount());
  });
});
