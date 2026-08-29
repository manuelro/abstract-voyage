import React, { useContext } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { colord } from 'colord';
import { deriveSurfaceColor } from '../../helpers/surfaceColorDerivation';
import { DEFAULT_PANEL_SHELL_CONFIG } from './config/shell';
import { ComponentConfigSection, PanelNestingContext, PanelShell, Sect } from './index';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

// Mirrors exactly how ConfigFieldSubgroupControl (components/Panel/config/
// controlResolver.tsx) consumes PanelNestingContext to shade a Sect —
// duplicated here rather than reaching into controlResolver's own
// unexported internals, so this test exercises the public contract
// (PanelNestingContext + Sect's own optional backgroundColor prop).
function NestedSubgroup({ label }: { label: string }) {
  const nesting = useContext(PanelNestingContext);
  const shaded = nesting && nesting.step > 0
    ? deriveSurfaceColor(nesting.color, -nesting.step)
    : undefined;
  return (
    <Sect title={label} open onToggle={() => undefined} backgroundColor={shaded}>
      <span>{label} content</span>
    </Sect>
  );
}

function renderNestedFixture(container: HTMLElement, backgroundColor: string, step: number) {
  const root = createRoot(container);
  act(() => root.render(
    <PanelShell
      title="Depth shading"
      isOpen
      onToggle={() => undefined}
      backgroundColor={backgroundColor}
      config={{
        ...DEFAULT_PANEL_SHELL_CONFIG,
        backgroundColorMode: 'custom',
        backgroundColor,
        nestedSurfaceLightnessStep: step,
      }}
    >
      <ComponentConfigSection
        component="Demo"
        title="Demo scope"
        configText="{}"
        open
        onToggle={() => undefined}
      >
        <NestedSubgroup label="Padding" />
      </ComponentConfigSection>
    </PanelShell>,
  ));
  return root;
}

describe('progressive depth shading (PLAN-POSTS-LAB-PANEL-TABS.md §13, revised)', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('never shades the scope level — ComponentConfigSection carries no data-shaded attribute or inline background at all', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = renderNestedFixture(container, '#121321', 0.05);

    const scopeSection = container.querySelector('[class*="componentSection"]');
    expect(scopeSection).toBeTruthy();
    expect(scopeSection?.hasAttribute('data-shaded')).toBe(false);
    expect((scopeSection as HTMLElement | null)?.style.backgroundColor).toBe('');

    // Exactly one shaded element on the page — the subgroup, not the scope.
    expect(container.querySelectorAll('[data-shaded="true"]')).toHaveLength(1);

    act(() => root.unmount());
    container.remove();
  });

  it('darkens the subgroup relative to the panel\'s own root color on a dark source', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = renderNestedFixture(container, '#121321', 0.05);

    const rootSection = container.querySelector<HTMLElement>('section');
    const rootColor = rootSection?.style.getPropertyValue('--panel-bg-effective') ?? '';
    expect(rootColor).toMatch(/^#/);
    expect(colord(rootColor).isDark()).toBe(true);

    const subgroupEl = container.querySelector<HTMLElement>('[data-shaded="true"]');
    expect(subgroupEl).toBeTruthy();
    const expectedColor = deriveSurfaceColor(rootColor, -0.05);
    const shade = subgroupEl!.style.getPropertyValue('--panel-section-shade');
    expect(colord(shade).toHex()).toBe(colord(expectedColor).toHex());
    expect(colord(shade).toHsl().l).toBeLessThan(colord(rootColor).toHsl().l);

    act(() => root.unmount());
    container.remove();
  });

  it('also darkens the subgroup on a light source — always darker, never lighter, regardless of the root\'s own tone', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = renderNestedFixture(container, '#eeeeee', 0.05);

    const rootSection = container.querySelector<HTMLElement>('section');
    const rootColor = rootSection?.style.getPropertyValue('--panel-bg-effective') ?? '';
    expect(colord(rootColor).isDark()).toBe(false);

    const subgroupEl = container.querySelector<HTMLElement>('[data-shaded="true"]');
    expect(subgroupEl).toBeTruthy();
    const expectedColor = deriveSurfaceColor(rootColor, -0.05);
    const shade = subgroupEl!.style.getPropertyValue('--panel-section-shade');
    expect(colord(shade).toHex()).toBe(colord(expectedColor).toHex());
    expect(colord(shade).toHsl().l).toBeLessThan(colord(rootColor).toHsl().l);

    act(() => root.unmount());
    container.remove();
  });

  it('shades with a custom-property fill only — no inline border-radius, padding, width, or margin override', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = renderNestedFixture(container, '#121321', 0.05);

    const subgroupEl = container.querySelector<HTMLElement>('[data-shaded="true"]');
    expect(subgroupEl).toBeTruthy();
    // Only the --panel-section-shade custom property is ever inline-set —
    // the actual background-color/box-shadow bleed live in Panel.module.css
    // (jsdom in this test harness doesn't load the real stylesheet, so a
    // computed-style assertion would just re-test jsdom's own defaults);
    // the meaningful guarantee is that nothing beyond that one value is
    // touched inline, same as every other unshaded .section.
    expect(subgroupEl!.style.getPropertyValue('--panel-section-shade')).not.toBe('');
    expect(subgroupEl!.style.backgroundColor).toBe('');
    expect(subgroupEl!.style.boxShadow).toBe('');
    expect(subgroupEl!.style.borderRadius).toBe('');
    expect(subgroupEl!.style.padding).toBe('');
    expect(subgroupEl!.style.margin).toBe('');
    expect(subgroupEl!.style.width).toBe('');

    act(() => root.unmount());
    container.remove();
  });

  it('step: 0 renders the subgroup in the same flat fill as its scope — today\'s pre-feature behavior, not just a zero-magnitude shift', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = renderNestedFixture(container, '#121321', 0);

    expect(container.querySelectorAll('[data-shaded="true"]')).toHaveLength(0);
    const flatSubgroup = container.querySelector<HTMLElement>('[data-shaded="false"]');
    expect(flatSubgroup).toBeTruthy();
    expect(flatSubgroup?.style.backgroundColor).toBe('');

    act(() => root.unmount());
    container.remove();
  });
});
