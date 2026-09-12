import type { CSSProperties, ReactNode, Ref } from 'react';
import styles from './AboutBulletMarker.module.css';

export interface AboutBulletMarkerProps {
  /** Hollow (transparent fill, currentColor ring) while false; solid-filled
   * (`background-color: currentColor`) while true — the FILL itself carries
   * the state signal, never color/opacity alone (A11Y-04). */
  active: boolean;
  /** Diameter in px — a resolved number, not a Tailwind class, so this
   * component stays agnostic of whichever size catalog a given caller draws
   * from (AboutTimeline's own `AboutTimelineMarkerSizeClass` today,
   * AboutMobileAccordion's own `openIndicatorSizeClassName` — same catalog,
   * reused, but resolved to px by the caller either way). */
  sizePx: number;
  /** Ring color (`border-color`) and, once `active`, fill color — both via
   * `currentColor`, so the two can never independently drift apart. */
  color: string;
  opacity: number;
  /** Duration/easing of the fill (`background-color`) and opacity
   * transitions — the caller's own resolved values (already reduced-motion-
   * aware upstream), not a hardcoded default. */
  transitionMs: number;
  transitionEasingCss: string;
  /** Extra class(es) — e.g. a caller's own positioning rule (margin/
   * alignment against a sibling), never used to override the circle itself. */
  className?: string;
  /** When true, this marker is absolutely positioned — set via INLINE style
   * (not a `className="absolute"` utility), because `.marker`'s own module
   * rule already declares `position: relative` (needed so
   * `AboutTimelineRow.tsx`'s own gradient-fill child, `position: absolute;
   * left/top: 50%`, has something to self-center against) — a same-
   * specificity class-vs-class fight between that rule and a bare `absolute`
   * utility is decided by source order, not intent, and was confirmed live
   * to silently lose (the marker stayed `position: relative`, so its
   * explicit size was ignored entirely — a `position: relative` element is
   * still just as unable to take an explicit width/height as a plain
   * `display: inline` one is). Inline style has no such ambiguity: it always
   * outranks any class, regardless of cascade order. Off (default)
   * preserves `AboutTimelineRow.tsx`'s own exact original behavior. */
  overlay?: boolean;
  markerRef?: Ref<HTMLSpanElement>;
  /** Optional gradient-fill canvas (e.g. `LiquidGradientAdapter`), rendered
   * inside the circle and clipped to it — see `.markerGradientBleed`'s own
   * doc comment (AboutBulletMarker.module.css) for why passing children at
   * all changes the clip margin. */
  children?: ReactNode;
}

/**
 * The hollow/filled circular "chronology" bullet — extracted from
 * AboutTimelineRow.tsx's own former inline marker (the desktop left-column
 * timeline's per-row dot) so AboutMobileAccordionItem.tsx's own "this item
 * is the open one" indicator can render the identical bullet, at its own
 * size/color/transition, instead of a second hand-rolled circle
 * (PLAN-ABOUT-MOBILE-ACCORDION-OPEN-INDICATOR.md).
 */
export function AboutBulletMarker({
  active, sizePx, color, opacity, transitionMs, transitionEasingCss, className, overlay, markerRef, children,
}: AboutBulletMarkerProps) {
  return (
    <span
      ref={markerRef}
      aria-hidden="true"
      className={
        `${styles.marker} ${active ? styles.markerActive : ''} `
        + `${children ? styles.markerGradientBleed : ''} ${className ?? ''}`
      }
      style={{
        color,
        opacity,
        '--about-bullet-marker-size': `${sizePx}px`,
        '--about-bullet-marker-transition-ms': `${transitionMs}ms`,
        '--about-bullet-marker-transition-easing': transitionEasingCss,
        ...(overlay ? { position: 'absolute', inset: 0, margin: 'auto' } : {}),
      } as CSSProperties}
    >
      {children}
    </span>
  );
}
