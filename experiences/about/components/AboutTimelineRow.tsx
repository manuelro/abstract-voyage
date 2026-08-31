import type { CSSProperties, KeyboardEvent } from 'react';
import type { AboutTimelineAlignment } from './AboutTimeline.config';
import styles from './AboutTimeline.module.css';

export interface AboutTimelineRowProps {
  id: string;
  panelId: string;
  caption: string;
  line: string;
  active: boolean;
  tabIndex: number;
  /** Resolved marker fill/outline color — either the active slide's own
   * accent, a fixed custom color, or the row title's own active color, see
   * `AboutTimeline.tsx`'s own `resolvedMarkerColor`. */
  markerColor: string;
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
  markerIdleOpacity: number;
  markerActiveOpacity: number;
  transitionDurationMs: number;
  transitionEasingCss: string;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
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
  titleColor,
  titleOpacity,
  titleClassName,
  descriptionColor,
  descriptionOpacity,
  descriptionClassName,
  ruleVisible,
  alignment,
  markerIdleOpacity,
  markerActiveOpacity,
  transitionDurationMs,
  transitionEasingCss,
  onSelect,
  onKeyDown,
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
            opacity: active ? markerActiveOpacity : markerIdleOpacity,
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
