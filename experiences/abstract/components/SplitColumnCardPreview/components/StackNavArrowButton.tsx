import type { CSSProperties } from 'react';
import {
  CTA_BUTTON_MOTION_EASINGS,
  type CtaButtonMotionEasing,
} from '../../../../../components/CtaButton/config/registered';
import { IconAction } from '../../../../../components/IconAction';
import styles from './StackNavArrowButton.module.css';

// The glyph and interaction palette stay stack-owned. Only the semantic
// button shell and its 44px target floor are shared with About through
// IconAction; neither consumer inherits the other's artwork or placement.
const TRIANGLE_VIEW_BOX_WIDTH = 24;
const TRIANGLE_VIEW_BOX_HEIGHT = 20;
const TRIANGLE_STROKE_WIDTH = 3;
const TRIANGLE_POINTS: Record<'up' | 'down', string> = {
  up: '12,3 21,17 3,17',
  down: '3,3 21,3 12,17',
};

export type StackNavArrowButtonProps = {
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
  className?: string;
};

export function StackNavArrowButton({
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
  className,
}: StackNavArrowButtonProps) {
  const height = sizePx;
  const width = sizePx * (TRIANGLE_VIEW_BOX_WIDTH / TRIANGLE_VIEW_BOX_HEIGHT);

  return (
    <IconAction
      className={`${styles.navArrowButton} ${className ?? ''}`}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      style={{
        '--stack-nav-arrow-idle-color': idleColor,
        '--stack-nav-arrow-hover-color': hoverColor,
        '--stack-nav-arrow-idle-opacity': idleOpacity,
        '--stack-nav-arrow-hover-opacity': hoverOpacity,
        '--stack-nav-arrow-disabled-opacity': disabledOpacity,
        '--stack-nav-arrow-hover-ms': `${hoverTransitionMs}ms`,
        '--stack-nav-arrow-hover-easing': CTA_BUTTON_MOTION_EASINGS[hoverEasing],
        '--stack-nav-arrow-mouseout-ms': `${mouseOutTransitionMs}ms`,
        '--stack-nav-arrow-mouseout-easing': CTA_BUTTON_MOTION_EASINGS[mouseOutEasing],
      } as CSSProperties}
    >
      <svg
        aria-hidden="true"
        width={width}
        height={height}
        viewBox={`0 0 ${TRIANGLE_VIEW_BOX_WIDTH} ${TRIANGLE_VIEW_BOX_HEIGHT}`}
        className={styles.navArrowGlyph}
      >
        <polygon
          points={TRIANGLE_POINTS[direction]}
          strokeWidth={TRIANGLE_STROKE_WIDTH}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </IconAction>
  );
}
