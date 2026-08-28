import { useEffect, useRef, useState } from 'react';

export type MeasuredElementRect = {
  width: number; height: number; left: number; top: number;
};

/**
 * Attach `ref` to any element; re-measures its real, live
 * getBoundingClientRect() on mount, on ResizeObserver, and on window
 * resize — the one shared implementation of a pattern that existed as
 * four separately hand-written, near-identical effects across pages/
 * about.tsx, pages/contact.tsx, pages/posts-lab/[slug].tsx, and
 * pages/abstract.tsx before this hook existed (PLAN-DEDUPLICATE-PAGE-
 * SHELL-LOGIC.md §1) — each measuring a header wrapper's own height (or,
 * in about.tsx's case, a logo link's own left edge) to react to layout
 * this repo's own config-driven padding/margin/font-size panel controls
 * can change at any time. `extraDeps` lets a caller force a remeasure on
 * a value ResizeObserver/resize can't see by itself — e.g. abstract.tsx's
 * own presentationMode, which swaps which DOM subtree the ref points at
 * entirely rather than resizing anything already-mounted.
 */
export function useMeasuredElementRect<T extends HTMLElement>(
  extraDeps: ReadonlyArray<unknown> = [],
): { ref: (element: T | null) => void; rect: MeasuredElementRect | undefined } {
  const elementRef = useRef<T | null>(null);
  const [rect, setRect] = useState<MeasuredElementRect | undefined>(undefined);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const element = elementRef.current;
    if (!element) return undefined;
    const measure = () => {
      const box = element.getBoundingClientRect();
      setRect({ width: box.width, height: box.height, left: box.left, top: box.top });
    };
    measure();
    window.addEventListener('resize', measure);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, extraDeps);

  const ref = (element: T | null) => { elementRef.current = element; };
  return { ref, rect };
}
