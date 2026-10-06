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
  /** Delay before the fill/opacity/scale transition starts, in ms — lets a
   * caller stagger this marker's own reveal behind a sibling's disappearance
   * (e.g. AboutMobileAccordionItem.tsx's own chevron) instead of both
   * crossfading at once. Defaults to 0 (today's exact behavior — no
   * stagger) when omitted. */
  transitionDelayMs?: number;
  /** Uniform `transform: scale(...)` — e.g. a 0 -> 1 grow-in reveal
   * (AboutMobileAccordionItem.tsx's own open indicator). Omitted (default)
   * leaves `transform` at its own initial `none`, matching
   * AboutTimelineRow.tsx's own marker, which never scales. */
  scale?: number;
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
  /** 'dot' (default): the existing hollow/filled circle. 'page': a small
   * plain-document glyph instead (bordered rectangle + corner tab, outline
   * while inactive and filled while active — see `DocumentMarkerGlyph`'s
   * own doc comment) — same currentColor + opacity state signal as the dot,
   * no icon library dependency. */
  shape?: 'dot' | 'page';
  /** Optional gradient-fill canvas (e.g. `LiquidGradientAdapter`), rendered
   * inside the circle and clipped to it — see `.markerGradientBleed`'s own
   * doc comment (AboutBulletMarker.module.css) for why passing children at
   * all changes the clip margin. Ignored while `shape` is 'page' (no circle
   * to clip a canvas into). */
  children?: ReactNode;
}

/** The 'page' shape's own glyph — a plain document: a vertical (4:5)
 * rectangle with a 1px outline and no fill, plus a small solid tab in its
 * top-right corner (a minimal stand-in for a folded/dog-eared corner).
 * Pure CSS/HTML (two `<span>`s — border + an absolutely-positioned corner
 * block), not SVG: no icon library is installed in this repo, and this
 * shape's geometry (a bordered box plus one small solid rectangle) needs
 * nothing an SVG path would do more simply. Inactive: outline + corner tab
 * only, mirroring the dot's hollow ring. Active: the whole rectangle fills
 * solid (`background-color: currentColor`, `.documentGlyphActive`) — the
 * corner tab is still present underneath but reads as invisible once it's
 * the exact same solid color as the rectangle around it, so no separate
 * "hide the corner" logic is needed. Same "fill alone carries the state"
 * signal the dot marker already uses (A11Y-04), not a second color. */
function DocumentMarkerGlyph({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`${styles.documentGlyph} ${active ? styles.documentGlyphActive : ''}`}
    >
      <span className={styles.documentGlyphCorner} />
    </span>
  );
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
  active, sizePx, color, opacity, transitionMs, transitionEasingCss, transitionDelayMs, scale,
  className, overlay, markerRef, shape = 'dot', children,
}: AboutBulletMarkerProps) {
  const isPage = shape === 'page';
  return (
    <span
      ref={markerRef}
      aria-hidden="true"
      className={
        `${isPage ? styles.markerPage : styles.marker} ${active ? styles.markerActive : ''} `
        + `${!isPage && children ? styles.markerGradientBleed : ''} ${className ?? ''}`
      }
      style={{
        color,
        opacity,
        '--about-bullet-marker-size': `${sizePx}px`,
        '--about-bullet-marker-transition-ms': `${transitionMs}ms`,
        '--about-bullet-marker-transition-easing': transitionEasingCss,
        '--about-bullet-marker-transition-delay': `${transitionDelayMs ?? 0}ms`,
        ...(typeof scale === 'number' ? { transform: `scale(${scale})` } : {}),
        ...(overlay ? { position: 'absolute', inset: 0, margin: 'auto' } : {}),
      } as CSSProperties}
    >
      {isPage ? <DocumentMarkerGlyph active={active} /> : children}
    </span>
  );
}
