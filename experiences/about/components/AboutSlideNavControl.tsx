import type { CSSProperties } from 'react';
import { CTA_BUTTON_MOTION_EASINGS, type CtaButtonMotionEasing } from '../../../components/CtaButton/config/registered';
import { IconAction } from '../../../components/IconAction';
import { useAboutSlides } from '../AboutSlidesContext';
import styles from '../../../pages/about.module.css';

// Fixed relationship, not a config knob: the gap between the two triangles
// is always 32% of the triangle's own height.
const NAV_CONTROL_GAP_RATIO = 0.32;
// Internal SVG coordinate space — arbitrary; the rendered footprint is set
// by the `width`/`height` attributes (from arrowSizePx), which scale
// everything drawn here, including strokeWidth's rounding amount.
const NAV_TRIANGLE_VIEW_BOX_WIDTH = 24;
const NAV_TRIANGLE_VIEW_BOX_HEIGHT = 20;
const NAV_TRIANGLE_STROKE_WIDTH = 3;
const NAV_TRIANGLE_POINTS: Record<'up' | 'down', string> = {
  up: '12,3 21,17 3,17',
  down: '3,3 21,3 12,17',
};

/**
 * The prev/next arrow itself — no button chrome, no background pill, no
 * shadow, just the triangle glyph (an SVG polygon; `stroke-linejoin="round"`
 * with a real stroke width is what rounds its corners — CSS `border-radius`
 * has no equivalent for a non-rectangular shape). Idle/hover/disabled read
 * purely from color + opacity: idle is the nav split-left color darkened,
 * hover blends back toward the undarkened color (a "lighting up" cue
 * standing in for the elevation shadow a CtaButton would cast), disabled
 * dims via opacity alone. Enter (hover-in) and exit (hover-out/disabled)
 * each get their own duration + easing — the classic CSS trick of declaring
 * the *entering* transition on the `:hover` rule and the *exiting* one on
 * the base rule (see about.module.css) — driven by config via CSS custom
 * properties rather than needing any pointer-event JS handlers at all.
 */
function NavTriangleButton({
  direction,
  ariaLabel,
  disabled,
  onClick,
  sizePx,
  idleColor,
  hoverColor,
  idleOpacity,
  hoverOpacity,
  disabledOpacity,
  hoverTransitionMs,
  hoverEasing,
  mouseOutTransitionMs,
  mouseOutEasing,
}: {
  direction: 'up' | 'down';
  ariaLabel: string;
  disabled: boolean;
  onClick: () => void;
  sizePx: number;
  idleColor: string;
  hoverColor: string;
  idleOpacity: number;
  hoverOpacity: number;
  disabledOpacity: number;
  hoverTransitionMs: number;
  hoverEasing: CtaButtonMotionEasing;
  mouseOutTransitionMs: number;
  mouseOutEasing: CtaButtonMotionEasing;
}) {
  const height = sizePx;
  const width = sizePx * (NAV_TRIANGLE_VIEW_BOX_WIDTH / NAV_TRIANGLE_VIEW_BOX_HEIGHT);

  return (
    <IconAction
      className={styles.navControlButton}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      style={{
        '--about-nav-control-idle-color': idleColor,
        '--about-nav-control-hover-color': hoverColor,
        '--about-nav-control-idle-opacity': idleOpacity,
        '--about-nav-control-hover-opacity': hoverOpacity,
        '--about-nav-control-disabled-opacity': disabledOpacity,
        '--about-nav-control-hover-ms': `${hoverTransitionMs}ms`,
        '--about-nav-control-hover-easing': CTA_BUTTON_MOTION_EASINGS[hoverEasing],
        '--about-nav-control-mouseout-ms': `${mouseOutTransitionMs}ms`,
        '--about-nav-control-mouseout-easing': CTA_BUTTON_MOTION_EASINGS[mouseOutEasing],
      } as CSSProperties}
    >
      <svg
        aria-hidden="true"
        width={width}
        height={height}
        viewBox={`0 0 ${NAV_TRIANGLE_VIEW_BOX_WIDTH} ${NAV_TRIANGLE_VIEW_BOX_HEIGHT}`}
        className={styles.navControlGlyph}
      >
        <polygon
          points={NAV_TRIANGLE_POINTS[direction]}
          strokeWidth={NAV_TRIANGLE_STROKE_WIDTH}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </IconAction>
  );
}

export interface AboutSlideNavControlProps {
  arrowSizePx: number;
  idleColor: string;
  hoverColor: string;
  idleOpacity: number;
  hoverOpacity: number;
  disabledOpacity: number;
  hoverTransitionMs: number;
  hoverEasing: CtaButtonMotionEasing;
  mouseOutTransitionMs: number;
  mouseOutEasing: CtaButtonMotionEasing;
}

/**
 * Renders /about's own prev/next slide triggers and reacts to whatever
 * navigation state `useAboutSlides()` (AboutSlidesContext.tsx, an
 * about-specific context — the correct direction of coupling for an
 * about-specific component) currently holds. Visual config (arrow size,
 * idle/hover/disabled color+opacity, transition timing) stays page-owned —
 * about.tsx reads it straight off `AboutPageLayoutConfig`'s own
 * `navControl*` panel fields and passes it through as props, same domain,
 * no new config surface invented here.
 */
export function AboutSlideNavControl({
  arrowSizePx,
  idleColor,
  hoverColor,
  idleOpacity,
  hoverOpacity,
  disabledOpacity,
  hoverTransitionMs,
  hoverEasing,
  mouseOutTransitionMs,
  mouseOutEasing,
}: AboutSlideNavControlProps) {
  const { canGoPrevious, canGoNext, goToPrevious, goToNext } = useAboutSlides();

  return (
    <div
      className={styles.navControl}
      style={{ gap: `${arrowSizePx * NAV_CONTROL_GAP_RATIO}px` }}
    >
      <NavTriangleButton
        direction="up"
        ariaLabel="Show the earlier slide"
        disabled={!canGoPrevious}
        onClick={goToPrevious}
        sizePx={arrowSizePx}
        idleColor={idleColor}
        hoverColor={hoverColor}
        idleOpacity={idleOpacity}
        hoverOpacity={hoverOpacity}
        disabledOpacity={disabledOpacity}
        hoverTransitionMs={hoverTransitionMs}
        hoverEasing={hoverEasing}
        mouseOutTransitionMs={mouseOutTransitionMs}
        mouseOutEasing={mouseOutEasing}
      />
      <NavTriangleButton
        direction="down"
        ariaLabel="Show the later slide"
        disabled={!canGoNext}
        onClick={goToNext}
        sizePx={arrowSizePx}
        idleColor={idleColor}
        hoverColor={hoverColor}
        idleOpacity={idleOpacity}
        hoverOpacity={hoverOpacity}
        disabledOpacity={disabledOpacity}
        hoverTransitionMs={hoverTransitionMs}
        hoverEasing={hoverEasing}
        mouseOutTransitionMs={mouseOutTransitionMs}
        mouseOutEasing={mouseOutEasing}
      />
    </div>
  );
}
