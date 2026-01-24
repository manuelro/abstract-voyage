// helpers/SvgGradientDef.tsx

import React from 'react';
import {
  SvgStop,
  Pivot,
  normalizeColor,
} from './gradientMath';

export type SvgGradientKind = 'linear' | 'radial';

export type SvgGradientDefProps = {
  /** ID used by fill="url(#id)" / CSS url(#id) */
  id: string;

  /** 'linear' (default) or 'radial' */
  kind?: SvgGradientKind;

  /** ViewBox dimensions used for geometry calculations */
  width: number;
  height: number;

  /** Gradient stops (already morphed / brightened by the caller) */
  stops: SvgStop[];

  /**
   * Shared anchor for both gradient types, as % of the SVG box.
   *
   * For radial:
   *  - anchorXPercent → cx (% of width)
   *  - anchorYPercent → cy (% of height)
   *
   * For linear:
   *  - anchorXPercent / anchorYPercent define a point the gradient line passes through.
   *
   * Values:
   *  - 0   → left / top edge
   *  - 50  → center
   *  - 100 → right / bottom edge
   *  - >100 → off-canvas (to the right / below)
   */
  anchorXPercent?: number;
  anchorYPercent?: number;

  /** Linear gradient options */
  angleDeg?: number;

  /**
   * Fallback pivot used when anchorXPercent / anchorYPercent are not provided.
   * Works for both linear and radial gradients.
   */
  pivot?: Pivot;
};

/**
 * Compute radial gradient center + radius from the SVG viewBox,
 * using either explicit anchor percentages or the pivot semantics.
 *
 * - cx/cy are in user-space coordinates (viewBox units).
 * - r is based on half the viewBox diagonal.
 *
 * Notes:
 * - Percent values can exceed 100%, moving the center off-canvas (e.g. 150% below the logo).
 * - Percent values below 0 are clamped to 0 to avoid going above/left of the viewBox.
 */
function computeRadialGradientParams({
  width,
  height,
  pivot,
  anchorXPercent,
  anchorYPercent,
}: {
  width: number;
  height: number;
  pivot?: Pivot;
  anchorXPercent?: number;
  anchorYPercent?: number;
}) {
  const centerX = width / 2;
  const centerY = height / 2;

  let cx = centerX;
  let cy = centerY;

  // 1) Percent-based anchor overrides (can exceed 100% to move off-canvas).
  if (typeof anchorXPercent === 'number') {
    const t = Math.max(0, anchorXPercent / 100);
    cx = t * width;
  }

  if (typeof anchorYPercent === 'number') {
    const t = Math.max(0, anchorYPercent / 100);
    cy = t * height;
  }

  // 2) Pivot-based fallback for any axis not explicitly overridden
  if (typeof pivot === 'string') {
    const p = pivot;

    // Horizontal alignment (only if X-percent not set)
    if (typeof anchorXPercent !== 'number') {
      if (p.includes('left')) {
        cx = 0;
      } else if (p.includes('right')) {
        cx = width;
      } else if (p.includes('center')) {
        cx = centerX;
      }
    }

    // Vertical alignment (only if Y-percent not set)
    if (typeof anchorYPercent !== 'number') {
      if (p.includes('top')) {
        cy = 0;
      } else if (p.includes('bottom')) {
        cy = height;
      } else if (p.includes('center')) {
        cy = centerY;
      }
    }
  }

  // Base radius: half the viewBox diagonal
  const r = Math.sqrt(width * width + height * height) / 2;

  return { cx, cy, r };
}

/**
 * Compute linear gradient endpoints from:
 * - a shared anchor (percent-based) OR a pivot fallback, and
 * - an angle in degrees (0 = left→right across the viewBox).
 *
 * We construct a long line through the anchor at the given angle,
 * long enough to cover the entire box in all typical cases.
 */
function computeLinearGradientEndpoints({
  width,
  height,
  angleDeg = 0,
  pivot,
  anchorXPercent,
  anchorYPercent,
}: {
  width: number;
  height: number;
  angleDeg?: number;
  pivot?: Pivot;
  anchorXPercent?: number;
  anchorYPercent?: number;
}) {
  const centerX = width / 2;
  const centerY = height / 2;

  let x0 = centerX;
  let y0 = centerY;

  // 1) Percent-based anchor overrides
  if (typeof anchorXPercent === 'number') {
    const t = Math.max(0, anchorXPercent / 100);
    x0 = t * width;
  }

  if (typeof anchorYPercent === 'number') {
    const t = Math.max(0, anchorYPercent / 100);
    y0 = t * height;
  }

  // 2) Pivot-based fallback for any axis not explicitly overridden
  if (typeof pivot === 'string') {
    const p = pivot;

    if (typeof anchorXPercent !== 'number') {
      if (p.includes('left')) {
        x0 = 0;
      } else if (p.includes('right')) {
        x0 = width;
      } else if (p.includes('center')) {
        x0 = centerX;
      }
    }

    if (typeof anchorYPercent !== 'number') {
      if (p.includes('top')) {
        y0 = 0;
      } else if (p.includes('bottom')) {
        y0 = height;
      } else if (p.includes('center')) {
        y0 = centerY;
      }
    }
  }

  // Direction from angle (0° = left→right, in SVG space where Y grows downward)
  const rad = (angleDeg * Math.PI) / 180;
  let dx = Math.cos(rad);
  let dy = Math.sin(rad);

  // Normalize direction; fall back to horizontal if degenerate
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-6) {
    dx = 1;
    dy = 0;
  } else {
    dx /= len;
    dy /= len;
  }

  // Make the gradient line long enough to comfortably cover the box.
  // We use the viewBox diagonal as a half-length so the full segment is ~2× diagonal.
  const halfLength = Math.sqrt(width * width + height * height);

  const x1 = x0 - dx * halfLength;
  const y1 = y0 - dy * halfLength;
  const x2 = x0 + dx * halfLength;
  const y2 = y0 + dy * halfLength;

  return { x1, y1, x2, y2 };
}

/**
 * Pure SVG gradient definition component.
 *
 * Renders a <linearGradient> or <radialGradient> with the correct geometry & stops,
 * but does NOT handle <defs>, styles, or any side-effects.
 *
 * Intended usage:
 *
 *   <defs>
 *     <SvgGradientDef
 *       id={gradId}
 *       kind="radial"
 *       width={VIEWBOX_W}
 *       height={VIEWBOX_H}
 *       stops={brightenedStops}
 *       angleDeg={angleDeg}            // ignored for radial
 *       pivot={pivot}
 *       anchorXPercent={50}            // shared anchor for both types
 *       anchorYPercent={150}
 *     />
 *   </defs>
 */
export const SvgGradientDef: React.FC<SvgGradientDefProps> = ({
  id,
  kind = 'linear',
  width,
  height,
  stops,
  angleDeg = 0,
  pivot = 'left-center',
  anchorXPercent,
  anchorYPercent,
}) => {
  if (kind === 'radial') {
    const radialParams = computeRadialGradientParams({
      width,
      height,
      pivot,
      anchorXPercent,
      anchorYPercent,
    });

    return (
      <radialGradient
        id={id}
        cx={radialParams.cx}
        cy={radialParams.cy}
        r={radialParams.r}
        gradientUnits="userSpaceOnUse"
      >
        {stops.map((stop, i) => (
          <stop
            key={i}
            offset={`${stop.at}%`}
            stopColor={normalizeColor(stop.color)}
            stopOpacity={stop.opacity ?? 1}
          />
        ))}
      </radialGradient>
    );
  }

  const linearEndpoints = computeLinearGradientEndpoints({
    width,
    height,
    angleDeg,
    pivot,
    anchorXPercent,
    anchorYPercent,
  });

  return (
    <linearGradient
      id={id}
      x1={linearEndpoints.x1}
      y1={linearEndpoints.y1}
      x2={linearEndpoints.x2}
      y2={linearEndpoints.y2}
      gradientUnits="userSpaceOnUse"
    >
      {stops.map((stop, i) => (
        <stop
          key={i}
          offset={`${stop.at}%`}
          stopColor={normalizeColor(stop.color)}
          stopOpacity={stop.opacity ?? 1}
        />
      ))}
    </linearGradient>
  );
};
