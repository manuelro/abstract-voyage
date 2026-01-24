import React from 'react';
import styles from './SvgStaggerGroup.module.css';

type ScalePivot =
  | 'center'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'left-center'
  | 'right-center'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

type SvgStaggerGroupProps = React.SVGProps<SVGGElement> & {
  /** Enable/disable the animation entirely. Default: true. */
  animate?: boolean;

  /** Delay before the first child's fade/scale starts (seconds). Default: 0.1 */
  initialDelay?: number;

  /** Extra delay added per item index for fade/scale (seconds). Default: 0.05 */
  stepDelay?: number;

  /** Duration of each item's fade/scale animation (seconds). Default: 0.45 */
  duration?: number;

  /** CSS easing string. Default: 'ease-in-out'. */
  easing?: string;

  /**
   * Direction of the stagger.
   * - 'forward' (default): first child fades first, then next, etc.
   * - 'reverse': last child fades first, moving backwards.
   */
  direction?: 'forward' | 'reverse';

  /**
   * Pivot for the scale transform-origin on each glyph.
   * Supports the standard pivots:
   * - 'center'
   * - 'left-center' | 'right-center'
   * - 'top-left' | 'top-center' | 'top-right'
   * - 'bottom-left' | 'bottom-center' | 'bottom-right'
   *
   * Default: 'center'
   */
  scalePivot?: ScalePivot;

  /**
   * Enable/disable the brightness bloom effect.
   * When false, brightness stays at 1 (no bloom), but fade/scale still apply.
   * Default: true.
   */
  bloom?: boolean;

  /**
   * Resting brightness multiplier for each glyph.
   * 1 = original gradient brightness.
   * Default: 1.
   */
  bloomBase?: number;

  /**
   * Peak brightness multiplier during the bloom moment.
   * Example: 1.08 = +8% brightness at peak.
   * Default: 1.08.
   */
  bloomPeak?: number;

  /**
   * Base delay (seconds) before the first bloom animation starts.
   *
   * If omitted, it defaults to:
   *    initialDelay + duration * 0.4
   * so the bloom happens slightly after the fade/scale begin,
   * giving a "right after fade-in" feel.
   */
  bloomInitialDelay?: number;

  /**
   * Extra delay per item index for the bloom animation (seconds).
   * Defaults to the same value as stepDelay, but can be adjusted so that
   * the bloom staggers more or less than the fade/scale.
   */
  bloomStepDelay?: number;
};

const pivotToOrigin = (
  pivot: ScalePivot | undefined
): { x: string; y: string } => {
  switch (pivot) {
    case 'top-left':
      return { x: '0%', y: '0%' };
    case 'top-center':
      return { x: '50%', y: '0%' };
    case 'top-right':
      return { x: '100%', y: '0%' };
    case 'left-center':
      return { x: '0%', y: '50%' };
    case 'right-center':
      return { x: '100%', y: '50%' };
    case 'bottom-left':
      return { x: '0%', y: '100%' };
    case 'bottom-center':
      return { x: '50%', y: '100%' };
    case 'bottom-right':
      return { x: '100%', y: '100%' };
    case 'center':
    default:
      return { x: '50%', y: '50%' };
  }
};

const SvgStaggerGroup: React.FC<SvgStaggerGroupProps> = ({
  children,
  animate = true,
  initialDelay = 0.1,
  stepDelay = 0.05,
  duration = 0.45,
  easing = 'ease-in-out',
  direction = 'forward',
  scalePivot = 'center',
  bloom = true,
  bloomBase = 1,
  bloomPeak = 1.08,
  bloomInitialDelay,
  bloomStepDelay,
  className,
  style,
  ...rest
}) => {
  const groupClassName = [styles.group, className].filter(Boolean).join(' ');

  // If animation is disabled, just render a plain <g> with merged className.
  if (!animate) {
    return (
      <g className={groupClassName} style={style} {...rest}>
        {children}
      </g>
    );
  }

  const childArray = React.Children.toArray(children);
  const count = childArray.length;
  const { x: originX, y: originY } = pivotToOrigin(scalePivot);

  // If bloom is disabled, keep brightness at 1 (no visible bloom),
  // while still running fade/scale for timing consistency.
  const effectiveBloomBase = bloom ? bloomBase : 1;
  const effectiveBloomPeak = bloom ? bloomPeak : bloomBase;

  // Default bloom timing:
  // - Start a bit after fade/scale begins, so bloom feels like a "post-fade" highlight.
  // - Per-letter stagger defaults to the same step as fade/scale unless overridden.
  const defaultBloomInitialDelay = initialDelay + duration * 0.4;
  const effectiveBloomInitialDelay =
    bloomInitialDelay != null ? bloomInitialDelay : defaultBloomInitialDelay;
  const effectiveBloomStepDelay =
    bloomStepDelay != null ? bloomStepDelay : stepDelay;

  return (
    <g
      className={groupClassName}
      {...rest}
      style={{
        ...(style || {}),
        // Fade/scale timing + easing
        '--svg-stagger-initial-delay': initialDelay,
        '--svg-stagger-step-delay': stepDelay,
        '--svg-stagger-duration': duration,
        '--svg-stagger-easing': easing,
        // Scale pivot
        '--svg-stagger-origin-x': originX,
        '--svg-stagger-origin-y': originY,
        // Brightness bloom behavior
        '--svg-stagger-bloom-base': effectiveBloomBase,
        '--svg-stagger-bloom-peak': effectiveBloomPeak,
        '--svg-stagger-bloom-initial-delay': effectiveBloomInitialDelay,
        '--svg-stagger-bloom-step-delay': effectiveBloomStepDelay,
      } as React.CSSProperties}
    >
      {childArray.map((child, index) => {
        if (!React.isValidElement(child)) {
          return child;
        }

        const effectiveIndex =
          direction === 'reverse' ? count - 1 - index : index;

        const existingClassName = (child.props as any).className as
          | string
          | undefined;
        const existingStyle = (child.props as any).style as
          | React.CSSProperties
          | undefined;

        const mergedClassName = [existingClassName, styles.item]
          .filter(Boolean)
          .join(' ');

        const mergedStyle: React.CSSProperties = {
          ...(existingStyle || {}),
          '--svg-stagger-index': effectiveIndex,
        } as React.CSSProperties;

        return React.cloneElement(child, {
          className: mergedClassName,
          style: mergedStyle,
        });
      })}
    </g>
  );
};

export default SvgStaggerGroup;
