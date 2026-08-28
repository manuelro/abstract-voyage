import { GAP_OPTIONS, type GapClass } from './tailwindSpacingScale';

/**
 * A text-heavy 2-column section: a narrow "lead" column (an eyebrow + title,
 * or a heading) beside a wider content column, collapsing to one column on
 * narrow viewports (see EditorialSection.module.css's single, fixed 760px
 * breakpoint — not exposed as a config knob; every other property here is a
 * genuinely continuous value, but a grid's column count is a discrete state
 * change that needs an actual media query, not something worth inventing a
 * per-instance breakpoint control for). Extracted from about.tsx's own
 * intro/experiments blocks (both used the identical grid recipe
 * independently) so any future page needing the same "label column beside
 * content column" shape reuses one component instead of hand-rolling the
 * grid again.
 *
 * gap holds a literal Tailwind class name (e.g. `'gap-24'`), not a px
 * number — the full option set lives in components/tailwindSpacingScale.ts
 * (Tailwind's complete default spacing scale). The panel's own control is
 * a `Select` (a native dropdown), not a slider.
 */
export type EditorialSectionConfig = {
  /** fr share of the lead (left) column above the narrow breakpoint. */
  leadColumnFr: number;
  /** fr share of the content (right) column above the narrow breakpoint. */
  contentColumnFr: number;
  /** Minimum width the lead column won't shrink below, in px. */
  leadColumnMinPx: number;
  gap: GapClass;
};

export const DEFAULT_EDITORIAL_SECTION_CONFIG = {
  leadColumnFr: 0.68,
  contentColumnFr: 1.32,
  leadColumnMinPx: 180,
  gap: 'gap-24', // 96px — same value the old gapPx default rendered.
} satisfies EditorialSectionConfig;

const GAP_VALUES = GAP_OPTIONS.map(option => option.value);

const clampRange = (value: number, min: number, max: number, fallback: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));
const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);

/** Single normalization path for every runtime and panel-provided value. */
export function normalizeEditorialSectionConfig(
  config: Partial<EditorialSectionConfig> | undefined,
): EditorialSectionConfig {
  const base = { ...DEFAULT_EDITORIAL_SECTION_CONFIG, ...(config ?? {}) };

  return {
    leadColumnFr: clampRange(
      base.leadColumnFr, 0.3, 1.5, DEFAULT_EDITORIAL_SECTION_CONFIG.leadColumnFr,
    ),
    contentColumnFr: clampRange(
      base.contentColumnFr, 0.5, 3, DEFAULT_EDITORIAL_SECTION_CONFIG.contentColumnFr,
    ),
    leadColumnMinPx: clampRange(
      base.leadColumnMinPx, 100, 400, DEFAULT_EDITORIAL_SECTION_CONFIG.leadColumnMinPx,
    ),
    gap: token(base.gap, GAP_VALUES, DEFAULT_EDITORIAL_SECTION_CONFIG.gap),
  };
}
