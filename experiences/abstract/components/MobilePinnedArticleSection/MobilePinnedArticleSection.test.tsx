import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AboutTimelineRowData } from '../../../about/components/AboutTimeline';
import { DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG } from './MobilePinnedArticleSection.config';
import { MobilePinnedArticleSection } from './MobilePinnedArticleSection';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function transitionEnd(element: Element, propertyName: string) {
  const event = new Event('transitionend', { bubbles: true });
  Object.defineProperty(event, 'propertyName', { value: propertyName });
  element.dispatchEvent(event);
}

let animationFrameCallbacks: FrameRequestCallback[] = [];

function flushAnimationFrame() {
  const callbacks = animationFrameCallbacks;
  animationFrameCallbacks = [];
  callbacks.forEach(callback => callback(0));
}

describe('MobilePinnedArticleSection persistent glass panel', () => {
  beforeEach(() => {
    animationFrameCallbacks = [];
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(() => true),
      } as MediaQueryList)),
    });
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      animationFrameCallbacks.push(callback);
      return animationFrameCallbacks.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    document.body.removeAttribute('style');
    document.documentElement.removeAttribute('style');
  });

  it('keeps one panel and rows viewport through prepared open and close transitions', () => {
    const rows: AboutTimelineRowData[] = [
      { caption: 'First article', slideIndex: 0 },
      { caption: 'Second article', slideIndex: 1 },
    ];
    const onExpandedChange = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => root.render(
      <MobilePinnedArticleSection
        itemCount={rows.length}
        rows={rows}
        activeIndex={0}
        onActiveIndexChange={() => undefined}
        onActiveIndexCommit={() => undefined}
        renderCarousel={() => <div>Carousel</div>}
        renderList={({ activeIndex, rows: listRows, onSelect }) => (
          <div>
            {listRows.map(row => (
              <button
                key={row.slideIndex}
                type="button"
                role="tab"
                aria-selected={row.slideIndex === activeIndex}
                style={row.itemStyle}
                onClick={() => onSelect(row.slideIndex)}
              >
                {row.caption}
              </button>
            ))}
          </div>
        )}
        carouselColor="#d7d7e5"
        panelColor="#d7d7e5"
        config={{
          ...DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG,
          fullListPresentation: 'glassPanel',
          panelExpandDurationMs: 100,
          panelCollapseDurationMs: 100,
          rowFadeInDelayMs: 0,
          rowFadeInDurationMs: 0,
          rowFadeOutDurationMs: 0,
          panelCollapseDelayMs: 0,
          listSettleDurationMs: 0,
        }}
        onExpandedChange={onExpandedChange}
      />,
    ));

    const panel = container.querySelector<HTMLElement>('[data-mobile-pinned-glass-panel="true"]');
    expect(panel).not.toBeNull();
    expect(panel?.dataset.phase).toBe('closed');
    expect(container.querySelectorAll('[data-mobile-pinned-glass-panel="true"]')).toHaveLength(1);
    const rowsViewport = container.querySelector<HTMLElement>(
      '[data-mobile-pinned-glass-viewport="true"]',
    );
    expect(rowsViewport).not.toBeNull();

    const expandButton = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent === 'Expand list');
    expect(expandButton).toBeDefined();

    act(() => expandButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    expect(container.querySelector('[data-mobile-pinned-glass-panel="true"]')).toBe(panel);
    expect(container.querySelector('[data-mobile-pinned-glass-viewport="true"]')).toBe(rowsViewport);
    expect(panel?.dataset.phase).toBe('preparing');
    act(flushAnimationFrame);
    expect(panel?.dataset.phase).toBe('preparing');
    act(flushAnimationFrame);
    expect(panel?.dataset.phase).toBe('opening');
    expect(onExpandedChange).toHaveBeenLastCalledWith(true);

    act(() => transitionEnd(panel as HTMLElement, 'height'));
    expect(panel?.dataset.phase).toBe('open');

    act(() => panel?.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Escape',
    })));
    expect(panel?.dataset.phase).toBe('closing');

    act(() => transitionEnd(panel as HTMLElement, 'height'));

    expect(container.querySelector('[data-mobile-pinned-glass-panel="true"]')).toBe(panel);
    expect(container.querySelector('[data-mobile-pinned-glass-viewport="true"]')).toBe(rowsViewport);
    expect(panel?.dataset.phase).toBe('closed');
    expect(container.querySelectorAll('[data-mobile-pinned-glass-panel="true"]')).toHaveLength(1);
    expect(onExpandedChange).toHaveBeenLastCalledWith(false);
    expect(Array.from(container.querySelectorAll('button'))
      .some(button => button.textContent === 'Expand list')).toBe(true);

    act(() => root.unmount());
  });

  it('separates height motion from fixed-size glass paint and preserves card-flip rotation', () => {
    const css = readFileSync(resolve(
      process.cwd(),
      'experiences/abstract/components/MobilePinnedArticleSection/styles.module.css',
    ), 'utf8');
    const panelRule = css.match(/\.panel \{([\s\S]*?)\n\}/)?.[1] ?? '';
    const glassRule = css.match(/\.panelGlass \{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(panelRule).toContain('transition: height');
    expect(panelRule).not.toContain('backdrop-filter:');
    expect(panelRule).not.toContain('transform:');
    expect(panelRule).not.toContain('opacity:');
    expect(glassRule).toContain('height: calc(var(--mobile-pinned-expanded-percent) * 1svh)');
    expect(glassRule).toContain('backdrop-filter: blur(12px)');
    expect(glassRule).not.toContain('transition:');
    expect(css).toContain('.flipCard[data-flipped=\'true\']');
    expect(css).toContain('transform: rotateY(190deg)');
  });

  it('uses the configured overlap to offset each row entrance', () => {
    const rows: AboutTimelineRowData[] = [
      { caption: 'First article', slideIndex: 0 },
      { caption: 'Second article', slideIndex: 1 },
      { caption: 'Third article', slideIndex: 2 },
    ];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => root.render(
      <MobilePinnedArticleSection
        itemCount={rows.length}
        rows={rows}
        activeIndex={0}
        onActiveIndexChange={() => undefined}
        onActiveIndexCommit={() => undefined}
        renderCarousel={() => <div>Carousel</div>}
        renderList={({ activeIndex, rows: listRows, onSelect }) => (
          <div>
            {listRows.map(row => (
              <button
                key={row.slideIndex}
                type="button"
                role="tab"
                aria-selected={row.slideIndex === activeIndex}
                style={row.itemStyle}
                onClick={() => onSelect(row.slideIndex)}
              >
                {row.caption}
              </button>
            ))}
          </div>
        )}
        carouselColor="#d7d7e5"
        panelColor="#d7d7e5"
        config={{
          ...DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG,
          panelExpandDurationMs: 100,
          rowFadeInDelayMs: 0,
          rowFadeInDurationMs: 100,
          rowFadeInOverlapPercent: 50,
        }}
      />,
    ));

    const expandButton = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent === 'Expand list');
    act(() => expandButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    act(flushAnimationFrame);
    act(flushAnimationFrame);

    const panel = container.querySelector<HTMLElement>('[data-mobile-pinned-glass-panel="true"]');
    act(() => transitionEnd(panel as HTMLElement, 'height'));
    act(flushAnimationFrame);

    const transitions = Array.from(container.querySelectorAll<HTMLElement>('[role="tab"]'))
      .map(tab => tab.style.transition);
    expect(transitions).toEqual([
      'opacity 100ms ease-out 0ms',
      'opacity 100ms ease-out 50ms',
      'opacity 100ms ease-out 100ms',
    ]);

    act(() => root.unmount());
  });
});
