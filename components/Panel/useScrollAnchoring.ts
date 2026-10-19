import { useEffect, type RefObject } from 'react';

/**
 * Keeps a scrollable config-panel list visually still while an operator
 * picks an option inside it. Every field edit flows through
 * createConfigScopeBinding's own onChange (components/Panel/config/
 * binding.ts), which re-renders the whole field tree; many fields are
 * conditionally shown via `visibleWhen` (controlResolver.tsx), so the very
 * edit the operator just made can instantly add/remove other fields above
 * or below it in this same shared scroll area. The browser's own scroll
 * anchoring doesn't reliably survive that: a change/input event can fire
 * while the field that's about to disappear or move is itself the anchor
 * candidate, and the list then settles at the same raw scrollTop pixel
 * offset against entirely different content underneath it, reading as a
 * jump.
 *
 * Fix: record where the currently-focused control sits (relative to the
 * scroll area) the moment an interaction starts, then once the resulting
 * DOM mutation has committed, shift scrollTop so that same control is back
 * at the same on-screen position. Keyed off whichever element has focus,
 * not off a specific field kind, so it covers every control type (native
 * `<select>`/`<input>`, and the app's own button-based Toggle/
 * SegmentedControl/ColorInput, all of which still move focus to themselves
 * on interaction) with one implementation.
 */
export function useScrollAnchoring(scrollAreaRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = scrollAreaRef.current;
    if (!root) return undefined;

    let anchor: { element: HTMLElement; offsetFromRootTop: number } | null = null;

    const captureAnchor = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target || !root.contains(target)) { anchor = null; return; }
      anchor = {
        element: target,
        offsetFromRootTop: target.getBoundingClientRect().top - root.getBoundingClientRect().top,
      };
    };

    const restoreAnchor = () => {
      if (!anchor || !root.contains(anchor.element)) { anchor = null; return; }
      const newOffset = anchor.element.getBoundingClientRect().top - root.getBoundingClientRect().top;
      const delta = newOffset - anchor.offsetFromRootTop;
      if (delta !== 0) root.scrollTop += delta;
    };

    // Capture phase: runs before the control's own onChange updates state,
    // so the "before" position is read pre-mutation.
    root.addEventListener('pointerdown', captureAnchor, true);
    root.addEventListener('input', captureAnchor, true);
    root.addEventListener('change', captureAnchor, true);
    root.addEventListener('keydown', captureAnchor, true);

    // MutationObserver callbacks run as a microtask right after the
    // triggering synchronous work (including React's commit) finishes —
    // late enough that the shifted layout already exists, early enough that
    // it lands before the next paint.
    const observer = new MutationObserver(restoreAnchor);
    observer.observe(root, { childList: true, subtree: true, attributes: true });

    return () => {
      root.removeEventListener('pointerdown', captureAnchor, true);
      root.removeEventListener('input', captureAnchor, true);
      root.removeEventListener('change', captureAnchor, true);
      root.removeEventListener('keydown', captureAnchor, true);
      observer.disconnect();
    };
  }, [scrollAreaRef]);
}
