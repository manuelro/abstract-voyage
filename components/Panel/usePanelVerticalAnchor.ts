import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { VISIBLE_MARGIN_PX } from './usePanelDrag';

// Same SSR-safe swap usePanelDrag.ts's own useIsomorphicLayoutEffect uses —
// duplicated locally rather than exported from that file since it's a
// generic one-liner, not something worth coupling these two files' own
// module boundaries over.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export type PanelVerticalAnchor = {
  /** 'up' (default): `.panelFrame` keeps its existing CSS `bottom` anchor
   * and grows upward. 'down': the collapsed launcher sat closer to the
   * viewport's top edge than its bottom — pin `.panelFrame`'s `top`
   * instead and grow downward. */
  mode: 'up' | 'down';
  /** Only meaningful in 'down' mode — the pixel `top` to pin the frame to. */
  topPx: number;
  /** The live-measured room actually available in whichever direction the
   * panel is about to grow, minus the safe margin at the far edge — `null`
   * only when nothing has been measured yet (falls back to
   * Panel.module.css's own static calc() for that one edge case). Always
   * used in preference to a formula assuming the frame sits at its
   * default, undragged bottom-right position: that assumption silently
   * breaks the moment the frame has been dragged anywhere else on screen
   * (confirmed live — dragging the collapsed launcher to the vertical
   * middle of the viewport still chose 'up' mode there, correctly, since
   * more room existed above than below, but the old static max-height
   * formula still budgeted almost a full viewport of height regardless,
   * letting the expanded panel's own content grow tall enough to clip
   * above y=0 anyway). */
  maxHeightPx: number | null;
};

const DEFAULT_ANCHOR: PanelVerticalAnchor = { mode: 'up', topPx: 0, maxHeightPx: null };

/**
 * Decides, once per open transition, whether PanelShell's expanded panel
 * should grow upward from its collapsed launcher's own bottom edge (the
 * default) or downward from its top edge instead, AND how tall it's
 * actually allowed to grow in that direction — both computed from the
 * launcher's own live, on-screen position (post-drag), never from a
 * formula that assumes it still sits at its default corner.
 *
 * Standard "flip if not enough room" popover/tooltip positioning: compares
 * the collapsed launcher's own space above vs. below at the moment it's
 * opened, and picks whichever side has more room, then caps growth to
 * whatever room that side actually has (minus `VISIBLE_MARGIN_PX` at the
 * far edge) — not a page-static viewport formula, which has no way to know
 * the frame was dragged away from its default position.
 */
export function usePanelVerticalAnchor({
  frameRef,
  isOpen,
  offsetX,
  offsetY,
}: {
  frameRef: MutableRefObject<HTMLDivElement | null>;
  isOpen: boolean;
  /** usePanelDrag's own live offset — included as a dependency purely so
   * the collapsed-rect tracker below re-measures whenever the collapsed
   * launcher is dragged to a new position, not because this hook reads the
   * values directly. */
  offsetX: number;
  offsetY: number;
}): PanelVerticalAnchor {
  const collapsedRectRef = useRef<{ top: number; bottom: number; offsetYAtCapture: number } | null>(null);
  const [anchor, setAnchor] = useState<PanelVerticalAnchor>(DEFAULT_ANCHOR);

  // Tracks the collapsed launcher's own real position continuously while
  // collapsed (including through drag), so the freshest measurement is
  // already available the instant it's clicked open. It can't be measured
  // reactively at that point instead: React swaps the launcher button for
  // the full panel section in the very same commit `isOpen` flips true, so
  // by the time this component re-renders open, the collapsed node is
  // already gone.
  //
  // `offsetYAtCapture` is stored alongside the rect — `rect.top`/
  // `rect.bottom` from getBoundingClientRect() already include whatever
  // drag offset is currently applied via .panelFrame's own `transform`.
  // The 'down'-mode decision below still needs to *keep* applying that
  // same transform once open (so a further drag while open still works,
  // and so closing back to collapsed doesn't reset the position) —
  // deriving `topPx` from the raw, offset-inclusive `rect.top` directly and
  // then *also* letting the existing transform apply on top of it would
  // double-count the offset (a confirmed-live regression from an earlier
  // round of this fix).
  useIsomorphicLayoutEffect(() => {
    if (isOpen || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    collapsedRectRef.current = { top: rect.top, bottom: rect.bottom, offsetYAtCapture: offsetY };
  }, [isOpen, offsetX, offsetY, frameRef]);

  // Decided once per open transition (dependency on `isOpen` alone,
  // deliberately) — the expanded panel's own real height is a moving
  // target as its content mounts/animates in, and re-deciding mid-open
  // would visibly flip the anchor out from under the user.
  useIsomorphicLayoutEffect(() => {
    if (!isOpen) {
      setAnchor(DEFAULT_ANCHOR);
      return;
    }
    if (typeof window === 'undefined') return;
    const rect = collapsedRectRef.current;
    if (!rect) return;
    // Live (offset-inclusive) space above/below the launcher's own actual
    // on-screen position — this doesn't need any offset correction itself,
    // unlike `topPx` below, since a plain height/distance is direction-
    // agnostic (only an absolute CSS `top` position needs the offset split
    // out, because a transform will still apply on top of it).
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow > spaceAbove) {
      const clampedLiveTop = Math.max(VISIBLE_MARGIN_PX, rect.top);
      setAnchor({
        mode: 'down',
        topPx: clampedLiveTop - rect.offsetYAtCapture,
        maxHeightPx: Math.max(0, window.innerHeight - clampedLiveTop - VISIBLE_MARGIN_PX),
      });
      return;
    }
    const clampedLiveBottom = Math.min(window.innerHeight - VISIBLE_MARGIN_PX, rect.bottom);
    setAnchor({
      mode: 'up',
      topPx: 0,
      maxHeightPx: Math.max(0, clampedLiveBottom - VISIBLE_MARGIN_PX),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Operator-reported (with a screenshot): opening the panel on a taller
  // window, then shrinking the browser window's own height WHILE the panel
  // stayed open, still clipped its top edge above y=0 — the decision effect
  // above only recomputes on an `isOpen` *transition*, so `maxHeightPx`
  // stayed frozen at whatever budget the ORIGINAL, taller viewport allowed,
  // even once the real viewport no longer had that much room. Neither
  // `.panelFrame`'s own CSS `top`/`bottom` anchor position moves on a
  // height-only resize (a `bottom: Npx` or `top: Npx` fixed element stays
  // exactly N px from its own anchored edge regardless of viewport height),
  // so `topPx` doesn't need to change here — only the *budget* does, and
  // only in the direction away from the pinned edge (a live remeasurement
  // via getBoundingClientRect() picks up the real current position either
  // way, so this reuses the exact same math as the initial decision above,
  // just re-triggered by `resize` instead of an `isOpen` transition, and
  // sourced from the now-already-open frame's own live rect instead of a
  // collapsed-launcher snapshot). Deliberately keeps whichever `mode` is
  // already active rather than re-deciding direction — flipping which way
  // an already-visible, already-open panel grows out from under the
  // operator mid-resize would be jarring; shrinking its budget in place is
  // not.
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return undefined;
    const handleResize = () => {
      if (!frameRef.current) return;
      const rect = frameRef.current.getBoundingClientRect();
      setAnchor(current => (
        current.mode === 'down'
          ? {
            mode: 'down',
            topPx: current.topPx,
            maxHeightPx: Math.max(
              0,
              window.innerHeight - Math.max(VISIBLE_MARGIN_PX, rect.top) - VISIBLE_MARGIN_PX,
            ),
          }
          : {
            mode: 'up',
            topPx: 0,
            maxHeightPx: Math.max(
              0,
              Math.min(window.innerHeight - VISIBLE_MARGIN_PX, rect.bottom) - VISIBLE_MARGIN_PX,
            ),
          }
      ));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, frameRef]);

  return anchor;
}
