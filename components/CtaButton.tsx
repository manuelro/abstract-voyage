'use client';

import Link from 'next/link';
import React from 'react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
  type Ref,
} from 'react';
import { useCardLiftPhysics } from './proximity/useCardLiftPhysics';
import {
  CTA_BUTTON_MOTION_EASINGS,
  normalizeCtaButtonConfig,
  type CtaButtonConfig,
} from './CtaButton/config/registered';
import { DEFAULT_PAGE_SURFACE_CONFIG } from './PageSurface.config';
import {
  paintGradientTextureSurface,
  type GradientTextureSource,
} from '../helpers/gradientTextureSurface';
import { deriveSurfaceColor, resolveContrastAwareTextColor } from '../helpers/surfaceColorDerivation';
import type { ElevationShadowDebugSnapshot } from './proximity/useElevationShadow';

type SharedCtaButtonProps = {
  children: ReactNode;
  className?: string;
  config?: Partial<CtaButtonConfig>;
  gradientSource?: GradientTextureSource;
  /** The color of whatever surface this button sits on — drives
   * backgroundColorMode/borderColorMode/textColorMode's 'auto' computation
   * (see resolveSurfaceAwareCtaColors below). Irrelevant to any property
   * whose mode is 'custom'. Defaults to the shared page-surface default so
   * an unwired consumer still renders a sensible, visible button rather than
   * silently falling back to some unrelated hardcoded color. */
  surfaceColor?: string;
  /** Displays this button's real hover appearance without a real pointer
   * over it — e.g. to nudge attention toward a recommended action until
   * the visitor actually engages with it. Implemented as a `force-hover`
   * marker class on this button's own `.group` wrapper, paired with a
   * `group-[.force-hover]:` variant alongside every existing
   * `group-hover:` utility in this file — the exact same color/shape
   * resolution hover already drives, just triggered by a class instead of
   * a real `:hover`. Does not affect group-focus-visible's own styling.
   * Off by default. */
  forceHover?: boolean;
};

/**
 * Resolves the 6 background/border/text × static/hover color slots from
 * either the surface color (mode 'auto') or the config's own explicit hex
 * fields (mode 'custom'), independently per property. Exported for direct
 * unit testing — not part of the component's public API.
 */
export function resolveSurfaceAwareCtaColors(
  config: CtaButtonConfig,
  surfaceColor: string,
) {
  const background = config.backgroundColorMode === 'auto'
    ? deriveSurfaceColor(surfaceColor, config.autoBackgroundLightenAmount)
    : config.backgroundColor;
  const hoverBackground = config.backgroundColorMode === 'auto'
    ? deriveSurfaceColor(background, config.autoBackgroundHoverLightenAmount)
    : config.hoverBackgroundColor;

  const border = config.borderColorMode === 'auto'
    ? deriveSurfaceColor(surfaceColor, config.autoBorderLightenAmount)
    : config.borderColor;
  const hoverBorder = config.borderColorMode === 'auto'
    ? deriveSurfaceColor(border, config.autoBorderHoverLightenAmount)
    : config.hoverBorderColor;

  const text = config.textColorMode === 'auto'
    ? resolveContrastAwareTextColor(surfaceColor, config.autoTextMinContrast)
    : config.textColor;
  const hoverText = config.textColorMode === 'auto' ? text : config.hoverTextColor;

  return { background, hoverBackground, border, hoverBorder, text, hoverText };
}

type CtaButtonAsButtonProps = SharedCtaButtonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & {
    href?: never;
  };

type CtaButtonAsLinkProps = SharedCtaButtonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'className' | 'href'> & {
    href: string;
  };

export type CtaButtonProps = CtaButtonAsButtonProps | CtaButtonAsLinkProps;

type CtaButtonStyle = CSSProperties & Record<`--cta-${string}`, string | number>;
type CtaButtonElement = HTMLButtonElement | HTMLAnchorElement;

const outerClasses = [
  'group relative inline-flex appearance-none border-0 bg-transparent p-0 align-middle',
  'text-left no-underline outline-none',
  // Static, single-layer shadow: the pre-hydration/no-JS paint, AND the
  // permanent look when the elevation shadow engine is disabled (inline
  // styles from the engine simply take precedence once it's enabled and
  // mounted — see useElevationShadow).
  'shadow-[0_4px_10px_rgba(0,0,0,0.12)]',
  '[--pointer-proximity:0]',
  'focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-4',
  'focus-visible:ring-offset-slate-950',
  'disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed',
  'aria-disabled:opacity-45',
].join(' ');

const surfaceClasses = [
  // min-height/min-width come from the resolved size preset (see style,
  // below) rather than a fixed literal here — 'md' resolves to the same
  // 44px/174px this used to hardcode, so nothing shifts at the default size.
  'relative isolate inline-flex items-center justify-center',
  'gap-5 overflow-visible [font-family:inherit] font-medium leading-none',
  'border-solid [background-color:var(--cta-background)] [border-color:var(--cta-border)]',
  '[color:var(--cta-text)]',
  '[--cta-background:var(--cta-background-fallback)]',
  '[--cta-border:var(--cta-border-fallback)]',
  '[--cta-text:var(--cta-text-fallback)]',
  // Two independent transition groups sharing one arbitrary `transition`
  // declaration: shape (transform/box-shadow/filter/opacity) runs on the
  // state duration/easing; color (background/border/text) runs on its own
  // shorter, derived duration — see --cta-color-*-duration below. Flipping
  // between resting and hover/focus just repoints these custom properties,
  // same pattern as --cta-background/--cta-border/--cta-text above.
  '[--cta-shape-duration:var(--cta-state-exit-duration)]',
  '[--cta-shape-easing:var(--cta-state-exit-easing)]',
  '[--cta-color-transition-duration:var(--cta-color-exit-duration)]',
  '[--cta-color-transition-easing:var(--cta-color-exit-easing)]',
  'group-hover:[--cta-shape-duration:var(--cta-state-duration)]',
  'group-hover:[--cta-shape-easing:var(--cta-state-easing)]',
  'group-hover:[--cta-color-transition-duration:var(--cta-color-enter-duration)]',
  'group-hover:[--cta-color-transition-easing:var(--cta-color-enter-easing)]',
  // Mirrors the four group-hover: rules directly above, one for one — see
  // the forceHover prop's own doc comment on SharedCtaButtonProps.
  'group-[.force-hover]:[--cta-shape-duration:var(--cta-state-duration)]',
  'group-[.force-hover]:[--cta-shape-easing:var(--cta-state-easing)]',
  'group-[.force-hover]:[--cta-color-transition-duration:var(--cta-color-enter-duration)]',
  'group-[.force-hover]:[--cta-color-transition-easing:var(--cta-color-enter-easing)]',
  'group-focus-visible:[--cta-shape-duration:var(--cta-state-duration)]',
  'group-focus-visible:[--cta-shape-easing:var(--cta-state-easing)]',
  'group-focus-visible:[--cta-color-transition-duration:var(--cta-color-enter-duration)]',
  'group-focus-visible:[--cta-color-transition-easing:var(--cta-color-enter-easing)]',
  '[transition:transform_var(--cta-shape-duration)_var(--cta-shape-easing),box-shadow_var(--cta-shape-duration)_var(--cta-shape-easing),filter_var(--cta-shape-duration)_var(--cta-shape-easing),opacity_var(--cta-shape-duration)_var(--cta-shape-easing),background-color_var(--cta-color-transition-duration)_var(--cta-color-transition-easing),border-color_var(--cta-color-transition-duration)_var(--cta-color-transition-easing),color_var(--cta-color-transition-duration)_var(--cta-color-transition-easing)]',
  'group-active:scale-[0.985]',
  'group-active:[--cta-shape-duration:var(--cta-press-duration)]',
  'group-active:[--cta-shape-easing:var(--cta-press-easing)]',
  'group-disabled:scale-100 group-aria-disabled:scale-100',
  '[transform-style:preserve-3d] motion-reduce:transition-none',
].join(' ');

const arrowClasses = [
  'relative z-10 opacity-60 transition-transform',
  '[transition-duration:var(--cta-state-exit-duration)]',
  '[transition-timing-function:var(--cta-state-exit-easing)]',
  'group-hover:[transition-duration:var(--cta-state-duration)]',
  'group-hover:[transition-timing-function:var(--cta-state-easing)]',
  'group-[.force-hover]:[transition-duration:var(--cta-state-duration)]',
  'group-[.force-hover]:[transition-timing-function:var(--cta-state-easing)]',
  'group-focus-visible:[transition-duration:var(--cta-state-duration)]',
  'group-focus-visible:[transition-timing-function:var(--cta-state-easing)]',
  'group-hover:translate-x-1 group-focus-visible:translate-x-1 group-[.force-hover]:translate-x-1',
  'group-active:translate-x-0',
  'group-active:[transition-duration:var(--cta-press-duration)]',
  'group-active:[transition-timing-function:var(--cta-press-easing)]',
  'motion-reduce:transition-none motion-reduce:transform-none',
].join(' ');

const debugOverlayClasses = [
  'pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-max max-w-[280px]',
  '-translate-x-1/2 rounded-md border border-white/15 bg-black/85 px-2.5 py-2',
  'font-mono text-[10px] leading-[1.45] text-lime-300 shadow-lg backdrop-blur-sm',
  'whitespace-pre',
].join(' ');

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as MutableRefObject<T | null>).current = value;
}

/** Dev-only readout for the elevation shadow engine — polls the hook's debug
 * snapshot on a self-terminating rAF loop that only exists while mounted
 * (i.e. only while `shadowDebugMode` is on). Purely informational: aria
 * hidden, no pointer events, never part of the accessibility tree. */
function ElevationShadowDebugOverlay({
  getSnapshot,
}: {
  getSnapshot: () => ElevationShadowDebugSnapshot | null;
}) {
  const [snapshot, setSnapshot] = useState<ElevationShadowDebugSnapshot | null>(null);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setSnapshot(getSnapshot());
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [getSnapshot]);

  if (!snapshot) return null;
  const [contactLayer, , projectedLayer] = snapshot.layers.length === 3
    ? snapshot.layers
    : [snapshot.layers[0], undefined, snapshot.layers[snapshot.layers.length - 1]];

  const lines = [
    `coord system   ${snapshot.coordinateSystem}`,
    `light          ${snapshot.lightX.toFixed(0)}, ${snapshot.lightY.toFixed(0)}`,
    `cta center     ${snapshot.objectCenterX.toFixed(0)}, ${snapshot.objectCenterY.toFixed(0)}`,
    `elevation      ${snapshot.elevationPx.toFixed(2)} px (${snapshot.elevationMinPx}–${snapshot.elevationMaxPx})`,
    `direction      x ${snapshot.direction.x.toFixed(2)}  y ${snapshot.direction.y.toFixed(2)}`,
    `offset         x ${snapshot.horizontalOffsetPx.toFixed(2)}px  y ${snapshot.verticalOffsetPx.toFixed(2)}px`,
    `penumbra       ${snapshot.penumbraPx.toFixed(2)} px`,
    `projected scale ${snapshot.projectedScale.toFixed(3)}x`,
    `peak density   ${snapshot.peakDensity.toFixed(3)}`,
    `contact        strength ${snapshot.contactStrength.toFixed(3)}  falloff ${snapshot.contactFalloffPx.toFixed(2)}px`,
    contactLayer ? `contact alpha  ${contactLayer.alpha.toFixed(3)}` : null,
    projectedLayer ? `projected alpha ${projectedLayer.alpha.toFixed(3)}` : null,
  ].filter((line): line is string => Boolean(line));

  return (
    <span aria-hidden="true" className={debugOverlayClasses} data-elevation-shadow-debug="true">
      {lines.join('\n')}
    </span>
  );
}

export const CtaButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, CtaButtonProps>(
  function CtaButton({
    children,
    className = '',
    config,
    gradientSource,
    surfaceColor = DEFAULT_PAGE_SURFACE_CONFIG.color,
    forceHover = false,
    ...props
  }, forwardedRef) {
    const normalized = useMemo(() => normalizeCtaButtonConfig(config), [config]);
    const surfaceAwareColors = useMemo(
      () => resolveSurfaceAwareCtaColors(normalized, surfaceColor),
      [normalized, surfaceColor],
    );
    const surfaceRef = useRef<HTMLSpanElement | null>(null);
    const gradientCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const paintFrameRef = useRef(0);
    const disabled = 'disabled' in props
      ? props.disabled === true
      : props['aria-disabled'] === true || props['aria-disabled'] === 'true';

    // Proximity → lift/tilt/scale + layered-shadow composition, shared with
    // any other interactive card via useCardLiftPhysics (extracted from this
    // component's own former implementation — see that hook for the
    // physics/easing details). forceHover passes straight through as
    // forceElevated: real hover already drives both color (CSS group-hover:)
    // and elevation (this hook) together, so the simulated version should
    // resolve both the same way, not just the color half.
    const {
      ref: liftPhysicsRef,
      handleFocus,
      handleBlur,
      handlePointerDown,
      handleRelease,
      getDebugSnapshot,
      pressedRef,
    } = useCardLiftPhysics<CtaButtonElement>({ config: normalized, disabled, forceElevated: forceHover });

    const setElementRef = useCallback((element: CtaButtonElement | null) => {
      liftPhysicsRef(element);
      assignRef(forwardedRef, element);
    }, [liftPhysicsRef, forwardedRef]);

    const gradientFill = normalized.backgroundMode === 'gradient';
    const gradientBorder = normalized.borderMode === 'gradient';
    const schedulePaint = useCallback(() => {
      if (paintFrameRef.current || typeof window === 'undefined') return;
      paintFrameRef.current = window.requestAnimationFrame(() => {
        paintFrameRef.current = 0;
        paintGradientTextureSurface({
          border: gradientBorder,
          fill: gradientFill,
          panXPercent: normalized.gradientPanXPercent,
          panYPercent: normalized.gradientPanYPercent,
          pixelRatio: window.devicePixelRatio || 1,
          scale: normalized.gradientScale,
          sourceCanvas: gradientSource?.getCanvas() ?? null,
          targetCanvas: gradientCanvasRef.current,
          targetElement: surfaceRef.current,
        });
      });
    }, [
      gradientBorder,
      gradientFill,
      gradientSource,
      normalized.gradientPanXPercent,
      normalized.gradientPanYPercent,
      normalized.gradientScale,
    ]);

    useEffect(() => {
      const unsubscribe = gradientSource?.subscribe(schedulePaint);
      const surface = surfaceRef.current;
      const observer = surface && typeof ResizeObserver === 'function'
        ? new ResizeObserver(schedulePaint)
        : null;
      if (surface) observer?.observe(surface);
      schedulePaint();
      return () => {
        unsubscribe?.();
        observer?.disconnect();
        if (paintFrameRef.current) window.cancelAnimationFrame(paintFrameRef.current);
        paintFrameRef.current = 0;
      };
    }, [gradientSource, schedulePaint]);

    // Color transitions (background/border/text) are derived from the shape
    // (scale + shadow) durations by a single ratio, rather than tuned by
    // hand — a color swap that shares a shape ease's long duration reads as
    // sluggish/rushed rather than crisp. Rounded to the nearest ms.
    const colorEnterDurationMs = Math.round(
      normalized.stateTransitionMs * normalized.colorTransitionRatio,
    );
    const colorExitDurationMs = Math.round(
      normalized.stateExitTransitionMs * normalized.colorTransitionRatio,
    );

    const style = {
      '--cta-background-fallback': normalized.backgroundMode === 'transparent'
        ? 'transparent'
        : surfaceAwareColors.background,
      '--cta-border-fallback': normalized.borderMode === 'none'
        ? 'transparent'
        : surfaceAwareColors.border,
      '--cta-text-fallback': surfaceAwareColors.text,
      '--cta-hover-background': surfaceAwareColors.hoverBackground,
      '--cta-hover-border': surfaceAwareColors.hoverBorder,
      '--cta-hover-text': surfaceAwareColors.hoverText,
      '--cta-state-duration': `${normalized.stateTransitionMs}ms`,
      '--cta-state-easing': CTA_BUTTON_MOTION_EASINGS[normalized.stateEasing],
      '--cta-state-exit-duration': `${normalized.stateExitTransitionMs}ms`,
      '--cta-state-exit-easing': CTA_BUTTON_MOTION_EASINGS[normalized.stateExitEasing],
      '--cta-color-enter-duration': `${colorEnterDurationMs}ms`,
      '--cta-color-exit-duration': `${colorExitDurationMs}ms`,
      '--cta-color-enter-easing': CTA_BUTTON_MOTION_EASINGS[normalized.colorEasing],
      '--cta-color-exit-easing': CTA_BUTTON_MOTION_EASINGS[normalized.colorEasing],
      '--cta-press-duration': `${normalized.pressTransitionMs}ms`,
      '--cta-press-easing': CTA_BUTTON_MOTION_EASINGS[normalized.pressEasing],
      transformOrigin: 'center center',
      transformStyle: 'preserve-3d',
      backfaceVisibility: 'hidden',
      willChange: 'transform, box-shadow',
    } as CtaButtonStyle;
    const surfaceClassName = [
      surfaceClasses,
      normalized.borderMode === 'none' ? 'border-0' : normalized.borderWidth,
      normalized.radius,
      normalized.fontSize,
      normalized.paddingX,
      normalized.paddingXDesktop,
      normalized.paddingY,
      normalized.paddingYDesktop,
      gradientFill ? 'data-[gradient-surface-ready=true]:[--cta-background:transparent]' : '',
      gradientBorder ? 'data-[gradient-surface-ready=true]:[--cta-border:transparent]' : '',
      normalized.hoverColorsEnabled
        ? 'group-hover:[--cta-background:var(--cta-hover-background)] group-hover:[--cta-border:var(--cta-hover-border)] group-hover:[--cta-text:var(--cta-hover-text)] group-[.force-hover]:[--cta-background:var(--cta-hover-background)] group-[.force-hover]:[--cta-border:var(--cta-hover-border)] group-[.force-hover]:[--cta-text:var(--cta-hover-text)]'
        : '',
    ].filter(Boolean).join(' ');
    const surfaceStyle: CSSProperties = {
      minHeight: `${normalized.minHeightPx}px`,
      minWidth: `${normalized.minWidthPx}px`,
    };
    const content = (
      <span ref={surfaceRef} className={surfaceClassName} style={surfaceStyle}>
        {(gradientFill || gradientBorder) ? (
          <canvas
            ref={gradientCanvasRef}
            aria-hidden="true"
            className={[
              'pointer-events-none absolute inset-0 z-0 block h-full w-full',
              'will-change-[opacity] transition-opacity',
              '[transition-duration:var(--cta-state-exit-duration)]',
              '[transition-timing-function:var(--cta-state-exit-easing)]',
              'group-hover:[transition-duration:var(--cta-state-duration)]',
              'group-hover:[transition-timing-function:var(--cta-state-easing)]',
              'group-[.force-hover]:[transition-duration:var(--cta-state-duration)]',
              'group-[.force-hover]:[transition-timing-function:var(--cta-state-easing)]',
              'motion-reduce:transition-none',
              normalized.hoverColorsEnabled ? 'group-hover:opacity-0 group-[.force-hover]:opacity-0' : '',
            ].filter(Boolean).join(' ')}
            data-cta-gradient-canvas="true"
          />
        ) : null}
        <span className="relative z-10 [transform:translateZ(14px)]">{children}</span>
        <span className="relative z-10 [transform:translateZ(18px)]">
          <span aria-hidden="true" className={arrowClasses}>→</span>
        </span>
      </span>
    );
    const combinedClassName = `${outerClasses} ${className}`.trim();
    const interactiveClassName = `${combinedClassName} ${normalized.radius} ${forceHover ? 'force-hover' : ''}`.trim();
    const debugOverlay = normalized.shadowDebugMode ? (
      <ElevationShadowDebugOverlay getSnapshot={getDebugSnapshot} />
    ) : null;

    if ('href' in props && typeof props.href === 'string') {
      const {
        href,
        onClick,
        onPointerDown,
        onPointerUp,
        onPointerCancel,
        onPointerLeave,
        onFocus,
        onBlur,
        style: consumerStyle,
        ...anchorProps
      } = props;
      return (
        <Link
          {...anchorProps}
          ref={setElementRef as Ref<HTMLAnchorElement>}
          aria-disabled={disabled || undefined}
          className={interactiveClassName}
          data-pointer-tilt={normalized.tiltEnabled ? 'true' : undefined}
          href={href}
          onBlur={event => { onBlur?.(event); handleBlur(); }}
          onClick={event => {
            if (disabled) {
              event.preventDefault();
              return;
            }
            onClick?.(event);
          }}
          onFocus={event => { onFocus?.(event); handleFocus(event); }}
          onPointerCancel={event => { onPointerCancel?.(event); handleRelease(); }}
          onPointerDown={event => { onPointerDown?.(event); handlePointerDown(event); }}
          onPointerLeave={event => {
            onPointerLeave?.(event);
            if (pressedRef.current) handleRelease();
          }}
          onPointerUp={event => { onPointerUp?.(event); handleRelease(); }}
          style={{ ...consumerStyle, ...style }}
        >
          {content}
          {debugOverlay}
        </Link>
      );
    }

    const {
      type = 'button',
      style: consumerStyle,
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      onPointerLeave,
      onFocus,
      onBlur,
      ...buttonProps
    } = props as CtaButtonAsButtonProps;
    return (
      <button
        {...buttonProps}
        ref={setElementRef as Ref<HTMLButtonElement>}
        className={interactiveClassName}
        data-pointer-tilt={normalized.tiltEnabled ? 'true' : undefined}
        onBlur={event => { onBlur?.(event); handleBlur(); }}
        onFocus={event => { onFocus?.(event); handleFocus(event); }}
        onPointerCancel={event => { onPointerCancel?.(event); handleRelease(); }}
        onPointerDown={event => { onPointerDown?.(event); handlePointerDown(event); }}
        onPointerLeave={event => {
          onPointerLeave?.(event);
          if (pressedRef.current) handleRelease();
        }}
        onPointerUp={event => { onPointerUp?.(event); handleRelease(); }}
        style={{ ...consumerStyle, ...style }}
        type={type}
      >
        {content}
        {debugOverlay}
      </button>
    );
  },
);

export default CtaButton;
