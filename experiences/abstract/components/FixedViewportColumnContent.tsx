import { useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  useFixedViewportColumnLayout,
  type FixedViewportColumnLayout,
} from './SplitColumnPageShell/hooks/useFixedViewportColumnLayout';

// Private copy, not imported from components/PolymorphicLayout.tsx — this
// component was relocated out of that file (PLAN-POLYMORPHIC-LAYOUT-
// DECOUPLING.md §7, "confirmed genuinely SiteHeader-agnostic
// already — no change to its own logic, purely a file move"); a trivial
// 3-line utility used by exactly one component isn't worth a shared-utility
// file or a cross-file import just to avoid this one duplicate.
function joinClasses(...classes: ReadonlyArray<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function resolveFixedViewportHorizontalGeometry({
  fixedLeftPx,
  fixedWidthPx,
  pageWidthPx,
}: {
  fixedLeftPx: number;
  fixedWidthPx: number;
  pageWidthPx: number;
}) {
  const safePageWidthPx = Math.max(0, pageWidthPx);
  const leftPx = Math.min(safePageWidthPx, Math.max(0, fixedLeftPx));
  return {
    leftPx,
    widthPx: Math.max(0, Math.min(fixedWidthPx, safePageWidthPx - leftPx)),
  };
}

/**
 * Ready-made wrapper for column content that needs to escape normal
 * document flow and pin itself to the true viewport instead of growing the
 * page — e.g. a full-height panel that would otherwise be capped by
 * whatever height its own column happens to resolve to. Built on
 * `useFixedViewportColumnLayout` (components/SplitColumnPageShell/
 * useFixedViewportColumnLayout.ts — see that hook's own doc comment for the
 * full mechanism: a zero-height anchor marker in normal flow, plus a
 * `position: fixed` layer sized from that anchor's own live-measured
 * position and the true viewport height). Column-agnostic — drop it inside
 * either `wideColumn` or `narrowColumn`.
 *
 * Renders the fixed box from the anchor's natural geometry, clamped only at
 * the visual viewport edge so imported/initial geometry cannot make its
 * content unreachable. It is deliberately not widened to the full page
 * width the way `/abstract`'s own card stack
 * widens its equivalent clip region (a 3D-rotation-overshoot workaround
 * specific to that content, not general behavior). A consumer with a
 * similar need can read `pageWidthPx` off `onGeometryChange` and build its
 * own wider inner wrapper the same way `/abstract`'s card stack does.
 *
 * `/abstract`'s own vertical card stack does **not** use this component —
 * its inner structure (the clip-vs-hit-test region split, the tab row, the
 * arrow group) is more specialized than this wrapper's defaults, and stays
 * on its own hand-built JSX, now composing the same underlying hook
 * internally (see `useCardStackLayout`'s own doc comment). This export is
 * for a future column that wants the plain "pinned to viewport, doesn't
 * grow the page" behavior with no card-specific complexity.
 */
export function FixedViewportColumnContent({
  headerOffsetPx = 0,
  anchorClassName,
  onGeometryChange,
  children,
}: {
  headerOffsetPx?: number;
  /** The anchor's own literal Tailwind width/centering classes — this IS
   * the fixed layer's own live-measured width/left (position: fixed has no
   * percentage-of-parent chain to inherit a width from otherwise). Must be
   * a literal class string per this repo's Tailwind-only styling rule, not
   * one assembled at runtime. */
  anchorClassName: string;
  onGeometryChange?: (geometry: FixedViewportColumnLayout) => void;
  children: ReactNode;
}) {
  const geometry = useFixedViewportColumnLayout(headerOffsetPx);
  const {
    anchorRef,
    fixedLeftPx,
    fixedTopPx,
    fixedWidthPx,
    fixedHeightPx,
    pageWidthPx,
  } = geometry;
  const { leftPx: usableLeftPx, widthPx: usableWidthPx } = resolveFixedViewportHorizontalGeometry({
    fixedLeftPx,
    fixedWidthPx,
    pageWidthPx,
  });

  // Same memoization requirement as onNavAlignmentChange's own promotion —
  // useFixedViewportColumnLayout already memoizes its return object (keyed
  // on its own primitive fields), so this only re-fires when the geometry
  // actually changed, not on every render.
  useEffect(() => {
    onGeometryChange?.(geometry);
  }, [onGeometryChange, geometry]);

  return (
    <div ref={anchorRef} className={joinClasses('relative', anchorClassName)}>
      {usableWidthPx > 0 ? (
        <div
          data-fixed-viewport-content="true"
          data-responsive-overflow-owner="true"
          style={{
            position: 'fixed',
            top: fixedTopPx,
            left: usableLeftPx,
            width: usableWidthPx,
            height: fixedHeightPx,
            boxSizing: 'border-box',
            paddingBottom: 'env(safe-area-inset-bottom)',
            overflowX: 'hidden',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            scrollPaddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
