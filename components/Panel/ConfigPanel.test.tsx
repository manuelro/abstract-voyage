import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedDesignConfigProvider, useSharedDesignConfig } from '../SharedDesignConfigProvider';
import { DEFAULT_PANEL_SHELL_CONFIG } from './config/shell';
import { ConfigPanel } from './ConfigPanel';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function RadiusProbe({ name }: { name: string }) {
  const { panelShellConfig, setPanelShellConfig } = useSharedDesignConfig();
  return (
    <div>
      <output data-radius-probe={name}>{panelShellConfig.radiusPx}</output>
      <button
        type="button"
        data-radius-setter={name}
        onClick={() => setPanelShellConfig(previous => ({ ...previous, radiusPx: 18 }))}
      >
        Set radius
      </button>
    </div>
  );
}

describe('ConfigPanel universal appearance scope', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders, synchronizes, and resets PanelShell appearance without a local binding', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => root.render(
      <SharedDesignConfigProvider>
        <ConfigPanel
          title="Article"
          localBindings={[]}
          isOpen
          onToggle={() => undefined}
          backgroundColor="#121321"
        />
        <RadiusProbe name="first" />
        <RadiusProbe name="second" />
      </SharedDesignConfigProvider>,
    ));

    expect(container.textContent).toContain('Config panel');
    const sectionTitle = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Config panel'));
    expect(sectionTitle?.getAttribute('aria-label')).toContain('shared globally across every page');

    const setter = container.querySelector<HTMLButtonElement>('[data-radius-setter="first"]');
    act(() => setter?.click());
    expect(Array.from(container.querySelectorAll('[data-radius-probe]')).map(node => node.textContent))
      .toEqual(['18', '18']);

    const reset = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent === 'RESET');
    act(() => reset?.click());
    expect(Array.from(container.querySelectorAll('[data-radius-probe]')).map(node => node.textContent))
      .toEqual([
        String(DEFAULT_PANEL_SHELL_CONFIG.radiusPx),
        String(DEFAULT_PANEL_SHELL_CONFIG.radiusPx),
      ]);

    act(() => root.unmount());
    container.remove();
  });
});
