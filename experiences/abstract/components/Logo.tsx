import React, { useId } from 'react';

import { SvgStop, Pivot } from '../../../helpers/gradientMath';
import { SvgGradientDef } from '../../../helpers/SvgGradientDef';
import { generateHarmonicGradient } from '../../../helpers/harmonicGradient';
import SvgStaggerGroup from '../../../components/SvgStaggerGroup';
import {
  BRAND_WORDMARK_GLYPH_PATHS,
  BRAND_WORDMARK_VIEWBOX_HEIGHT,
  BRAND_WORDMARK_VIEWBOX_WIDTH,
} from '../../../components/BrandWordmark';

type LogoWithGradientBgProps = {
  /** Gradient stops; defaults to a generated premium gradient. */
  stops?: SvgStop[];

  /**
   * Gradient type for the SVG text fill.
   * - 'linear' (default): <linearGradient>.
   * - 'radial': pivot/anchor-based <radialGradient>.
   */
  gradientType?: 'linear' | 'radial';

  /** Base angle in degrees for linear gradients (0 = left→right across viewBox). */
  angleDeg?: number;

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

  /**
   * Pivot for gradient alignment when anchorXPercent / anchorYPercent are not provided.
   * - For linear: used to place the gradient line anchor.
   * - For radial: used to place the gradient center.
   */
  pivot?: Pivot;

  /** Render width (SVG keeps aspect ratio). Pass number (px) or CSS length. */
  width?: number | string;

  /** Extra className to merge with the root SVG class. */
  className?: string;

  /** Accessible label for the logo. */
  ariaLabel?: string;

  /** Optional duration for smoothly interpolating runtime stop-color changes. */
  stopTransitionMs?: number;

  /** Intro stagger/motion — forwarded straight through to the wrapping
   * SvgStaggerGroup. Every default below reproduces this component's own
   * previous hardcoded values exactly, so a caller that omits all of them
   * (e.g. AbstractHeroGrid.tsx's own bare `<Logo>` usage) is unaffected. A
   * caller that wants this configurable (SiteHeader.tsx, driven by
   * WordmarkConfig) passes every field explicitly instead. */
  introAnimate?: boolean;
  introInitialDelay?: number;
  introStepDelay?: number;
  introDuration?: number;
  introEasing?: string;
  introDirection?: 'forward' | 'reverse';
  introScalePivot?: 'center' | 'top-left' | 'top-center' | 'top-right' | 'left-center'
    | 'right-center' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  introBloomEnabled?: boolean;
  introBloomBase?: number;
  introBloomPeak?: number;
  introBloomInitialDelay?: number;
  introBloomStepDelay?: number;
};

// Default: a premium, darker, center-bright gradient generated around a base hue.
// We use a fixed seed so the gradient is deterministic (avoids SSR/CSR mismatch).
const DEFAULT_STOPS: SvgStop[] = generateHarmonicGradient({
  baseHue: 232,

  hueScheme: 'mono',
  lightnessRange: { min: 65 }, // NOTE: for a closer match to DEFAULT_STOPS, use { min: 70 }
  chromaRange: { min: 80 },
  mode: 'center-bright',
  stops: 22,
  variance: 100,
  centerStretch: 0.9,
  seed: 50,

  // perStopLightness: [100, 100, 100, 100, 100, 100, 100]
  }).map((stop) => ({
  color: stop.color,
  at: stop.at * 100, // convert 0–1 → 0–100 for SvgStop
}));

const LogoWithGradientBg: React.FC<LogoWithGradientBgProps> = ({
  stops = DEFAULT_STOPS,
  gradientType = 'linear',
  angleDeg = 0,
  pivot = 'left-center',
  anchorXPercent,
  anchorYPercent,
  width = BRAND_WORDMARK_VIEWBOX_WIDTH,
  className = '',
  ariaLabel = 'Abstract Voyage Logo',
  stopTransitionMs = 0,
  introAnimate = true,
  introInitialDelay = 0.01,
  introStepDelay = 0.02,
  introDuration = 1.4,
  introEasing,
  introDirection = 'reverse',
  introScalePivot = 'left-center',
  introBloomEnabled = true,
  introBloomBase = 1,
  introBloomPeak = 1.4,
  introBloomInitialDelay = 0.1,
  introBloomStepDelay = 0.08,
}) => {
  // Namespaced id to avoid collisions, kept internal.
  const gradId = `gradient-logo-grad-${useId()}`;
  // CSS class selectors can't contain unescaped ':' — useId() output does
  // (e.g. ':r1i:') — so this strips it down to a selector-safe token for the
  // scoped <style> rule below, instead of reusing gradId as a class name
  // directly. Only used as a selector; url(#${gradId}) below still uses the
  // real, unmodified id (a fragment reference, not a CSS selector, so no
  // escaping is needed there).
  const fillScopeClassName = `avText-${gradId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${BRAND_WORDMARK_VIEWBOX_WIDTH} ${BRAND_WORDMARK_VIEWBOX_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      width={width}
      style={{ display: 'block', height: 'auto' }}
      className={[className].join(' ')}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{ariaLabel}</title>

      <defs>
        <SvgGradientDef
          id={gradId}
          kind={gradientType}
          width={BRAND_WORDMARK_VIEWBOX_WIDTH}
          height={BRAND_WORDMARK_VIEWBOX_HEIGHT}
          stops={stops}
          angleDeg={angleDeg}
          pivot={pivot}
          anchorXPercent={anchorXPercent}
          anchorYPercent={anchorYPercent}
          stopTransitionMs={stopTransitionMs}
        />
        {/* Force all logo paths to use this gradient. Scoped to
            fillScopeClassName (unique per Logo instance, derived from this
            instance's own gradId) rather than a shared '.avText' class —
            <style> tags are never scoped to their containing SVG, so a
            shared class name here previously let two simultaneously-mounted
            Logo instances' rules collide: both instances inject
            '.avText * { fill: ... !important; }' into the same global
            stylesheet, the CSS cascade lets only one rule win sitewide, and
            whichever instance's own gradient <defs> happened to sit inside a
            display:none ancestor (e.g. the header's own responsive
            mobile/desktop logo slots) still "won," leaving the actually
            visible instance's paths with no matching fill at all — see
            PLAN-POSTS-LAB-MOBILE-LAYOUT.md finding 1.1 for the live-verified
            diagnosis. A per-instance selector can never collide with another
            instance's, regardless of how many Logo instances are mounted
            (visible or hidden) at once. */}
        <style>{`.${fillScopeClassName} * { fill: url(#${gradId}) !important; }`}</style>
      </defs>

      {/* New logo paths; gradient applied via the scoped class above. */}
      <SvgStaggerGroup
        className={fillScopeClassName}
        animate={introAnimate}
        initialDelay={introInitialDelay}
        stepDelay={introStepDelay}
        duration={introDuration}
        easing={introEasing}
        direction={introDirection}
        scalePivot={introScalePivot}
        bloom={introBloomEnabled}
        bloomBase={introBloomBase}
        bloomPeak={introBloomPeak}
        bloomInitialDelay={introBloomInitialDelay}
        bloomStepDelay={introBloomStepDelay}
      >
        {BRAND_WORDMARK_GLYPH_PATHS.map((d, index) => (
          <path key={index} d={d} fill="white" />
        ))}
      </SvgStaggerGroup>
    </svg>
  );
};

export default LogoWithGradientBg;
