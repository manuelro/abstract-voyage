import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MasonryWall } from './MasonryWall';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('reading-order masonry', () => {
  it('keeps column neighbours stable when an earlier item changes height', () => {
    const heights: Record<string, number> = { a: 100, b: 10, c: 90, d: 10 };
    let onResize: ResizeObserverCallback | undefined;
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: ResizeObserverCallback) { onResize = callback; }
      observe() {}
      disconnect() {}
    });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    let width = 640;
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return { height: heights[this.textContent ?? ''] ?? 0 } as DOMRect;
    });
    let columnCount = 2;
    const originalGetComputedStyle = window.getComputedStyle;
    vi.stubGlobal('getComputedStyle', (element: Element) => element.hasAttribute('data-masonry-wall')
      ? { gridTemplateColumns: columnCount === 2 ? '320px 320px' : '360px', columnGap: '0px', rowGap: '0px' }
      : originalGetComputedStyle(element));

    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(
      <MasonryWall placement="reading-order" columns={{ base: 2 }} columnGap={0} rowGap={0}>
        {Object.keys(heights).map(key => <span key={key}>{key}</span>)}
      </MasonryWall>,
    ));
    const items = Array.from(container.querySelectorAll<HTMLElement>('[data-masonry-item]'));
    expect(items.map(item => item.style.left)).toEqual(['0px', '320px', '320px', '0px']);

    heights.a = 10;
    act(() => onResize?.([{ target: items[0] } as unknown as ResizeObserverEntry], {} as ResizeObserver));
    expect(items.map(item => item.style.left)).toEqual(['0px', '320px', '320px', '0px']);
    expect(items[3].style.top).toBe('10px');

    width = 600;
    const wall = container.querySelector<HTMLElement>('[data-masonry-wall]')!;
    act(() => onResize?.([{ target: wall, contentRect: { width } } as unknown as ResizeObserverEntry], {} as ResizeObserver));
    expect(items.map(item => item.style.left)).toEqual(['0px', '300px', '0px', '300px']);

    width = 360;
    columnCount = 1;
    act(() => onResize?.([{ target: wall, contentRect: { width } } as unknown as ResizeObserverEntry], {} as ResizeObserver));
    expect(wall.dataset.layoutReady).toBe('false');
    expect(items.every(item => item.style.left === '' && item.style.top === '')).toBe(true);
    act(() => root.unmount());
  });
});
