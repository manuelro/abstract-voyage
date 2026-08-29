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

// A group with two subgroups — the same shape "Wide column padding &
// margin" now has (PLAN-POSTS-LAB-PANEL-TABS.md §11), tested independent of
// any real page's config so these assertions hold for every future scope
// that adopts `kind: 'subgroup'`, not just posts-lab.
type SubgroupDemoConfig = {
  paddingTop: 'pt-0' | 'pt-4';
  paddingLeft: 'pl-0' | 'pl-4';
  marginTop: 'mt-0' | 'mt-4';
  alwaysOpenValue: boolean;
};

const DEFAULT_SUBGROUP_DEMO_CONFIG: SubgroupDemoConfig = {
  paddingTop: 'pt-0',
  paddingLeft: 'pl-0',
  marginTop: 'mt-0',
  alwaysOpenValue: true,
};

function createSubgroupDemoDefinition() {
  return defineConfigScope<SubgroupDemoConfig>({
    id: 'Demo/subgroup',
    component: 'Demo',
    scope: 'subgroup',
    title: 'Demo subgroup',
    createdAt: '2026-08-15',
    defaultValue: DEFAULT_SUBGROUP_DEMO_CONFIG,
    fields: [
      {
        kind: 'group',
        label: 'Spacing',
        fields: [
          {
            kind: 'subgroup',
            label: 'Padding',
            fields: [
              {
                kind: 'enum', key: 'paddingTop', label: 'Padding top',
                options: [{ label: 'PT-0', value: 'pt-0' }, { label: 'PT-4', value: 'pt-4' }],
              },
              {
                kind: 'enum', key: 'paddingLeft', label: 'Padding left',
                options: [{ label: 'PL-0', value: 'pl-0' }, { label: 'PL-4', value: 'pl-4' }],
              },
            ],
          },
          {
            kind: 'subgroup',
            label: 'Margin',
            defaultCollapsed: false,
            fields: [
              {
                kind: 'enum', key: 'marginTop', label: 'Margin top',
                options: [{ label: 'MT-0', value: 'mt-0' }, { label: 'MT-4', value: 'mt-4' }],
              },
            ],
          },
        ],
      },
      { kind: 'boolean', key: 'alwaysOpenValue', label: 'Always open value' },
    ],
    copy: {
      targetFile: 'demo.ts',
      targetSymbol: 'DEFAULT_SUBGROUP_DEMO_CONFIG',
      targetType: 'SubgroupDemoConfig',
    },
  });
}

describe('kind: "subgroup" control resolver', () => {
  it('starts collapsed by default — fields not visible until expanded', () => {
    const definition = createSubgroupDemoDefinition();
    const binding = createConfigScopeBinding({
      definition,
      value: DEFAULT_SUBGROUP_DEMO_CONFIG,
      onChange: () => undefined,
    });
    const html = renderToStaticMarkup(<ConfigScopeRenderer binding={binding} />);
    expect(html).toContain('Padding');
    expect(html).toContain('aria-expanded="false"');
    // aria-hidden on the disclosure wrapper — the field itself may still be
    // present in the static HTML (Sect keeps DOM, just hides/collapses it),
    // so assert the correct collapsed signal rather than absence.
    expect(html).toMatch(/aria-hidden="true"[^>]*>[\s\S]*Padding top/);
  });

  it('honors an explicit defaultCollapsed: false — starts expanded', () => {
    const definition = createSubgroupDemoDefinition();
    const binding = createConfigScopeBinding({
      definition,
      value: DEFAULT_SUBGROUP_DEMO_CONFIG,
      onChange: () => undefined,
    });
    const html = renderToStaticMarkup(<ConfigScopeRenderer binding={binding} />);
    // "Margin" subgroup opted into defaultCollapsed: false — its own
    // toggle button's aria-expanded attribute precedes the "Margin" text
    // node within that same <button>, so search backward from the label.
    const marginIndex = html.indexOf('>Margin<');
    const precedingAriaExpanded = html.lastIndexOf('aria-expanded=', marginIndex);
    expect(html.slice(precedingAriaExpanded, precedingAriaExpanded + 25)).toContain('aria-expanded="true"');
  });

  it('expanding one subgroup does not affect the other — independent, not accordion-exclusive', () => {
    const definition = createSubgroupDemoDefinition();
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(
      <ConfigScopeRenderer
        binding={createConfigScopeBinding({
          definition,
          value: DEFAULT_SUBGROUP_DEMO_CONFIG,
          onChange: () => undefined,
        })}
      />,
    ));

    const paddingToggle = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent === 'Padding');
    expect(paddingToggle).toBeTruthy();
    expect(paddingToggle?.getAttribute('aria-expanded')).toBe('false');

    act(() => paddingToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    const marginToggle = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent === 'Margin');
    // Padding is now open, Margin (defaultCollapsed: false) was already
    // open before Padding's own toggle — both independently true.
    expect(paddingToggle?.getAttribute('aria-expanded')).toBe('true');
    expect(marginToggle?.getAttribute('aria-expanded')).toBe('true');

    act(() => root.unmount());
  });

  it('expanding a subgroup and changing a value routes back through the typed binding, without resetting on re-collapse', () => {
    const definition = createSubgroupDemoDefinition();
    const container = document.createElement('div');
    const root = createRoot(container);
    let currentValue = DEFAULT_SUBGROUP_DEMO_CONFIG;

    function Harness() {
      const [value, setValue] = React.useState(DEFAULT_SUBGROUP_DEMO_CONFIG);
      currentValue = value;
      return (
        <ConfigScopeRenderer
          binding={createConfigScopeBinding({ definition, value, onChange: setValue })}
        />
      );
    }

    act(() => root.render(<Harness />));
    const paddingToggle = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent === 'Padding');
    act(() => paddingToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    const pt4Button = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent === 'PT-4');
    expect(pt4Button).toBeTruthy();
    act(() => pt4Button?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(currentValue.paddingTop).toBe('pt-4');

    // Collapse Padding again — the value set while it was open must survive.
    act(() => paddingToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(currentValue.paddingTop).toBe('pt-4');

    act(() => root.unmount());
  });
});
