import { useRef } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import type { AboutTimelineAlignment } from './AboutTimeline.config';
import styles from './AboutTimeline.module.css';
import {
  LiquidGradientAdapter,
  type DeckPaletteState,
} from '../../abstract/components/AbstractPostDock/components/GradientRenderer';
import type { SliderContentSlide } from '../../../helpers/postContent';
import type { LiquidSliderConfig } from '../../abstract/components/AbstractPostDock/config/legacy';
import type { useLiquidSliderMotion } from '../../abstract/components/AbstractPostDock/hooks/motion';
import { useDockGradientAvailability } from '../../abstract/components/AbstractPostDock/hooks/browserState';
import { resolveAbstractPostDockGradientActivity } from '../../abstract/components/AbstractPostDock/helpers/gradientActivity';

// Same single-render-per-change policy AboutMobileAccordionItem.tsx's own
// STATIC_GRADIENT_PERFORMANCE_CONFIG already uses one file over — the
// marker's own gradient must never run a continuous idle-drift/noise loop
// either; 'static' resolves to 'frozen' in resolveAbstractPostDockGradient-
// Activity before that helper even looks at which row is "active" — a
// single render per relevant prop change (row selection, palette edit),
// never a per-frame recalculation.
const STATIC_MARKER_GRADIENT_PERFORMANCE_CONFIG = {
  activityPolicy: 'static' as const,
  pauseWhenOffscreen: true,
};

export interface AboutTimelineRowProps {
  id: string;
  panelId: string;
  caption: string;
  line: string;
  /** Real selection state (`row.slideIndex === activeIndex`) — drives ARIA
   * (`aria-selected`) and the marker's own fill class. Hover never touches
   * this — only a row's own marker/title opacity change on hover (see
   * `markerOpacity`/`titleOpacity` below); every other row, and every other
   * property of the hovered row itself, stays exactly as its real selection
   * state already made it. */
  active: boolean;
  tabIndex: number;
  /** Resolved marker fill/outline color — either the active slide's own
   * accent, a fixed custom color, or the row title's own active color, see
   * `AboutTimeline.tsx`'s own `resolvedMarkerColor`. */
  markerColor: string;
  /** Opacity of the marker — already resolved by `AboutTimeline.tsx`:
   * `config.hoverMarkerOpacity` while this row is the hovered one, else
   * `markerActiveOpacity`/`-IdleOpacity` per `active` — hovering a row never
   * changes any other row's own opacity. */
  markerOpacity: number;
  /** Resolved, contrast-aware color for this row's own title (caption) —
   * already picked for this row's current active/inactive state by
   * `AboutTimeline.tsx` (`config.rowTitleMinContrastActive`/`-Inactive`). */
  titleColor: string;
  /** Opacity of the title text — reused verbatim from
   * `dockLayoutConfig.minimalModeTextDimOpacity`/`-TextEmphasisOpacity`
   * (INT-03), already picked for this row's current state. */
  titleOpacity: number;
  /** Joined padding/margin Tailwind classes for the title (caption) span —
   * `config.rowTitlePadding*`/`-Margin*`. */
  titleClassName: string;
  /** Resolved, contrast-aware color for this row's own supporting line —
   * independent of `titleColor` (`config.rowDescriptionMinContrastActive`/
   * `-Inactive`). */
  descriptionColor: string;
  /** Opacity of the supporting line — independent of `titleOpacity`
   * (`config.rowDescriptionOpacityActive`/`-Inactive`), no longer a single
   * hardcoded CSS value applied unconditionally. */
  descriptionOpacity: number;
  /** Joined padding/margin Tailwind classes for the supporting line span —
   * `config.rowDescriptionPadding*`/`-Margin*`. */
  descriptionClassName: string;
  ruleVisible: boolean;
  alignment: AboutTimelineAlignment;
  transitionDurationMs: number;
  transitionEasingCss: string;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  /** Pointer-hover start — `AboutTimeline.tsx`'s own delay timer decides
   * whether/when this actually flips `visuallyActive` for this row. */
  onPointerEnter: () => void;
  /** Pointer-hover end — always immediate, no delay on the way out. */
  onPointerLeave: () => void;
  rowRef: (element: HTMLButtonElement | null) => void;
  /** `config.markerGradientEnabled` — see that field's own doc comment
   * (`AboutTimeline.config.ts`). Only ever actually mounts the WebGL
   * gradient while this AND `active` are both true — the marker's flat
   * fill (`.markerActive`, `background-color: currentColor`) already only
   * ever applies to the one active row, so there is never more than one
   * gradient instance mounted across all rows at once; every inactive row
   * stays exactly as hollow as it does today, gradient mode or not. */
  gradientEnabled: boolean;
  /** This row's own slide — `undefined` whenever the page hasn't wired
   * gradient data through (e.g. `gradientEnabled` off), matching every
   * other optional prop here. */
  gradientSlide?: SliderContentSlide;
  gradientPalette?: DeckPaletteState | null;
  gradientMotion?: ReturnType<typeof useLiquidSliderMotion>;
  gradientConfig?: LiquidSliderConfig;
}

/**
 * ART-01/ART-02 (about-IA-timeline-copy-rework) — standard sentence case, no
 * small caps/letterspacing/uppercase, no serif (the serif stays exclusive to
 * the H1). ART-05: one hairline-rule marker per row, hollow while inactive,
 * filled with the resolved marker color while active — the fill itself
 * switching on is the state signal, opacity is only ever a secondary
 * pairing (A11Y-04), never the sole carrier.
 *
 * Operator fix: font weight never changes between active/inactive — color
 * and marker fill are the only signals a row is active. A prior version
 * also bumped font-weight on the active row; removed entirely, not just
 * toned down, per explicit instruction.
 *
 * Title and description (caption/line) each carry their own independently
 * resolved color and opacity now, applied directly to their own `<span>`
 * rather than to their shared wrapper — necessary so the description's own
 * opacity (`descriptionOpacity`) never compounds multiplicatively with the
 * title's own (`titleOpacity`), which a single shared wrapper opacity would
 * otherwise produce.
 */
export function AboutTimelineRow({
  id,
  panelId,
  caption,
  line,
  active,
  tabIndex,
  markerColor,
  markerOpacity,
  titleColor,
  titleOpacity,
  titleClassName,
  descriptionColor,
  descriptionOpacity,
  descriptionClassName,
  ruleVisible,
  alignment,
  transitionDurationMs,
  transitionEasingCss,
  onSelect,
  onKeyDown,
  onPointerEnter,
  onPointerLeave,
  rowRef,
  gradientEnabled,
  gradientSlide,
  gradientPalette,
  gradientMotion,
  gradientConfig,
}: AboutTimelineRowProps) {
  const markerRef = useRef<HTMLSpanElement | null>(null);
  // Always called (rules of hooks), same as AboutMobileAccordionItem.tsx's
  // own identical call — cheap (a visibilitychange listener + an
  // IntersectionObserver) and inert whenever gradientEnabled is off, since
  // `showMarkerGradient` below gates the actual WebGL mount, not this hook.
  const { isDockVisible, isDocumentVisible } = useDockGradientAvailability(markerRef, true);
  // Only the active row's marker is ever filled at all (.markerActive below,
  // unchanged) — mounting the gradient for any other row would render a
  // canvas nobody can see (fill is 0 while inactive), so this is never more
  // than one concurrent WebGL instance across all five rows, not one per
  // row.
  const showMarkerGradient = gradientEnabled && active && Boolean(gradientSlide) && Boolean(gradientMotion) && Boolean(gradientConfig);
  const markerGradientActivity = resolveAbstractPostDockGradientActivity({
    config: STATIC_MARKER_GRADIENT_PERFORMANCE_CONFIG,
    isActive: false,
    isDockVisible,
    isDocumentVisible,
  });
  return (
    <li className={styles.item}>
      <button
        ref={rowRef}
        type="button"
        id={id}
        role="tab"
        aria-selected={active}
        aria-controls={panelId}
        tabIndex={tabIndex}
        onClick={onSelect}
        onKeyDown={onKeyDown}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        data-alignment={alignment}
        className={styles.row}
        style={{
          '--about-timeline-transition-ms': `${transitionDurationMs}ms`,
          '--about-timeline-transition-easing': transitionEasingCss,
        } as CSSProperties}
      >
        {ruleVisible ? <span aria-hidden="true" className={styles.rule} /> : null}
        <span
          ref={markerRef}
          aria-hidden="true"
          className={`${styles.marker} ${active ? styles.markerActive : ''}`}
          style={{
            color: markerColor,
            opacity: markerOpacity,
          }}
        >
          {showMarkerGradient && gradientSlide && gradientMotion && gradientConfig ? (
            <LiquidGradientAdapter
              slide={gradientSlide}
              motion={gradientMotion}
              config={gradientConfig}
              palette={gradientPalette ?? null}
              activity={markerGradientActivity}
            />
          ) : null}
        </span>
        <span className={styles.content}>
          <span
            className={`${styles.caption} ${titleClassName}`}
            style={{ color: titleColor, opacity: titleOpacity }}
          >
            {caption}
          </span>
          <span
            className={`${styles.line} ${descriptionClassName}`}
            style={{ color: descriptionColor, opacity: descriptionOpacity }}
          >
            {line}
          </span>
        </span>
      </button>
    </li>
  );
}
