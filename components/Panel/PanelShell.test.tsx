import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PANEL_SHELL_CONFIG } from './config/shell';
import { PanelShell } from './index';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe('PanelShell surface and elevation', () => {
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

  it('derives ink from the inherited surface and physically elevates only when expanded', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => root.render(
      <PanelShell
        title="Abstract"
        isOpen={false}
        onToggle={() => undefined}
        backgroundColor="#121321"
        config={{ ...DEFAULT_PANEL_SHELL_CONFIG, shadowEnabled: true }}
      />,
    ));

    const launcher = container.querySelector<HTMLButtonElement>('button');
    expect(launcher?.dataset.elevation).toBe('rest');
    expect(launcher?.style.getPropertyValue('--panel-bg')).toMatch(/^rgba\(/);
    expect(launcher?.style.getPropertyValue('--panel-bg-effective')).toMatch(/^#/);
    expect(launcher?.style.getPropertyValue('--panel-text')).not.toBe('');
    expect(launcher?.style.getPropertyValue('--panel-elevation-px')).toBe('0px');
    expect(launcher?.style.getPropertyValue('--panel-shadow-clearance-px')).toBe('0px');
    const panelText = launcher?.style.getPropertyValue('--panel-text') ?? '';
    const panelDivider = launcher?.style.getPropertyValue('--panel-divider') ?? '';
    const textColorChannels = panelText.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)?.slice(1);
    const dividerColorChannels = panelDivider
      .match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)?.slice(1);
    expect(dividerColorChannels).toEqual(textColorChannels);
    expect(panelDivider).toMatch(/, 0\.0(?:85|9)\)$/);
    expect(launcher?.querySelector('svg')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(launcher?.parentElement?.style.getPropertyValue('--panel-backdrop-blur-px'))
      .toBe(`${DEFAULT_PANEL_SHELL_CONFIG.backdropBlurPx}px`);
    expect(launcher?.parentElement?.style.getPropertyValue('--panel-blur-safe-area-px'))
      .toBe(`${DEFAULT_PANEL_SHELL_CONFIG.backdropBlurSafeAreaPx}px`);
    const restingShadow = launcher?.style.boxShadow;
    expect(restingShadow).toBe('');

    act(() => root.render(
      <PanelShell
        title="Abstract"
        isOpen
        onToggle={() => undefined}
        backgroundColor="#121321"
        config={{ ...DEFAULT_PANEL_SHELL_CONFIG, shadowEnabled: true }}
      >
        Controls
      </PanelShell>,
    ));

    const panel = container.querySelector<HTMLElement>('section');
    expect(panel?.dataset.elevation).toBe('expanded');
    expect(panel?.style.getPropertyValue('--panel-elevation-px'))
      .toBe(`${DEFAULT_PANEL_SHELL_CONFIG.expandedElevationPx}px`);
    expect(Number.parseFloat(
      panel?.style.getPropertyValue('--panel-shadow-clearance-px') ?? '0',
    )).toBeGreaterThan(0);
    expect(panel?.style.boxShadow).toContain('rgba(');
    expect(panel?.style.boxShadow).toContain('rgba(0, 0, 0,');
    expect(panel?.style.boxShadow).not.toBe(restingShadow);
    const internalBackdrop = panel?.querySelector<HTMLElement>('[data-blur]');
    expect(internalBackdrop?.dataset.blur).toBe('true');
    expect(panel?.style.getPropertyValue('--panel-background-blur-px'))
      .toBe(`${DEFAULT_PANEL_SHELL_CONFIG.backgroundBlurPx}px`);

    act(() => root.unmount());
    container.remove();
  });

  it('selects independent darkening ratios from the source color tone', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const adaptiveConfig = {
      ...DEFAULT_PANEL_SHELL_CONFIG,
      darkBackgroundDarkenRatio: 0.06,
      lightBackgroundDarkenRatio: 0.1,
      backgroundOpacity: 1,
    };

    act(() => root.render(
      <PanelShell
        title="Dark source"
        isOpen={false}
        onToggle={() => undefined}
        backgroundColor="#121321"
        config={adaptiveConfig}
      />,
    ));

    expect(container.querySelector<HTMLElement>('button')?.style.getPropertyValue('--panel-bg'))
      .toBe('#11121f');

    act(() => root.render(
      <PanelShell
        title="Light source"
        isOpen={false}
        onToggle={() => undefined}
        backgroundColor="#121321"
        config={{
          ...adaptiveConfig,
          backgroundColorMode: 'custom',
          backgroundColor: '#eeeeee',
        }}
      />,
    ));

    const lightLauncher = container.querySelector<HTMLElement>('button');
    expect(lightLauncher?.style.getPropertyValue('--panel-bg')).toBe('#d6d6d6');
    expect(lightLauncher?.dataset.appearance).toBe('light');

    act(() => root.unmount());
    container.remove();
  });

  it('applies hue retention and opacity to paint while deriving ink from the composite', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => root.render(
      <PanelShell
        title="Chromatic surface"
        isOpen={false}
        onToggle={() => undefined}
        backgroundColor="#0000ff"
        config={{
          ...DEFAULT_PANEL_SHELL_CONFIG,
          backgroundColorMode: 'custom',
          backgroundColor: '#ff0000',
          backgroundOriginalHueRetention: 0,
          backgroundHueShiftDegrees: 120,
          darkBackgroundDarkenRatio: 0,
          lightBackgroundDarkenRatio: 0,
          backgroundOpacity: 0.5,
          backdropBlurEnabled: false,
          backgroundBlurEnabled: false,
        }}
      />,
    ));

    const launcher = container.querySelector<HTMLButtonElement>('button');
    expect(launcher?.style.getPropertyValue('--panel-bg')).toBe('rgba(0, 255, 0, 0.5)');
    expect(launcher?.style.getPropertyValue('--panel-bg-effective')).toBe('#008080');
    expect(launcher?.style.getPropertyValue('--panel-text')).not.toBe('');
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();

    act(() => root.unmount());
    container.remove();
  });

  it('keeps internal blur independent from the perimeter halo', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => root.render(
      <PanelShell
        title="Independent blur"
        isOpen
        onToggle={() => undefined}
        config={{
          ...DEFAULT_PANEL_SHELL_CONFIG,
          backdropBlurEnabled: false,
          backgroundBlurEnabled: true,
          backgroundBlurPx: 18,
        }}
      />,
    ));

    const panel = container.querySelector<HTMLElement>('section');
    const frameHiddenLayers = Array.from(container.querySelectorAll<HTMLElement>('[aria-hidden="true"]'))
      .filter(layer => !panel?.contains(layer));
    expect(frameHiddenLayers).toHaveLength(0);
    expect(panel?.querySelector<HTMLElement>('[data-blur]')?.dataset.blur).toBe('true');
    expect(panel?.style.getPropertyValue('--panel-background-blur-px')).toBe('18px');

    act(() => root.unmount());
    container.remove();
  });
});
