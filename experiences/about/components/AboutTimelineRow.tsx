import type { CSSProperties, KeyboardEvent } from 'react';
import type { AboutTimelineAlignment } from './AboutTimeline.config';
import styles from './AboutTimeline.module.css';

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
}: AboutTimelineRowProps) {
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
          aria-hidden="true"
          className={`${styles.marker} ${active ? styles.markerActive : ''}`}
          style={{
            color: markerColor,
            opacity: markerOpacity,
          }}
        />
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
