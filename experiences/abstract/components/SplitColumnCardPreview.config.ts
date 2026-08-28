import {
  MARGIN_TOP_OPTIONS,
  PADDING_Y_OPTIONS,
  type MarginTopClass,
  type PaddingYClass,
} from '../../../components/tailwindSpacingScale';

/**
 * Separation between the Articles/Labs tab row and the card below it —
 * two independent knobs (padding on the tabs row itself, margin on the
 * card container), literal Tailwind classes from
 * components/tailwindSpacingScale.ts, not a single hardcoded gap.
 *
 * This scope stays narrowly about that spacing — the opt-in vertical
 * card-stack presentation (layout, motion, arrow styling) has its own
 * separate scope, `SplitColumnCardPreview/config/stack.ts`, rather than
 * being folded in here, matching how `AbstractJournalLabCollection` splits
 * `config/presentation.ts` from `config/slider.ts` instead of one
 * do-everything scope per component.
 */
export type SplitColumnCardPreviewConfig = {
  /** Padding around the tab row (top + bottom) — pushes the card down via
   * the tabs' own bottom edge. */
  tabsPaddingY: PaddingYClass;
  /** Additional margin above the card container, on top of whatever
   * tabsPaddingY already adds. Applies only to the flat (non-stack) card
   * view (SplitColumnCardPreview.tsx's own cardDragSurface branch) — the
   * stack-mode branch deliberately does not read this field (bugs audit,
   * 2026-08-21): that presentation's real visual layer is CardStack's own
   * position: fixed/absolute layer, independent of this wrapper's box, so
   * a margin here has no wrapper content to sit above — it would only ever
   * inflate the wrapper's own auto-height, which PolymorphicLayout then
   * paints its column background color behind (a real, visible bug this
   * field itself was never responsible for designing). */
  cardsMarginTop: MarginTopClass;
};

export const DEFAULT_SPLIT_COLUMN_CARD_PREVIEW_CONFIG = {
  tabsPaddingY: 'py-3',
  cardsMarginTop: 'mt-6',
} satisfies SplitColumnCardPreviewConfig;

const PADDING_Y_VALUES: ReadonlyArray<PaddingYClass> = PADDING_Y_OPTIONS.map(option => option.value);
const MARGIN_TOP_VALUES: ReadonlyArray<MarginTopClass> = MARGIN_TOP_OPTIONS.map(option => option.value);

const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);

export function normalizeSplitColumnCardPreviewConfig(
  config: Partial<SplitColumnCardPreviewConfig> | undefined,
): SplitColumnCardPreviewConfig {
  const base = { ...DEFAULT_SPLIT_COLUMN_CARD_PREVIEW_CONFIG, ...(config ?? {}) };
  return {
    tabsPaddingY: token(
      base.tabsPaddingY, PADDING_Y_VALUES, DEFAULT_SPLIT_COLUMN_CARD_PREVIEW_CONFIG.tabsPaddingY,
    ),
    cardsMarginTop: token(
      base.cardsMarginTop, MARGIN_TOP_VALUES, DEFAULT_SPLIT_COLUMN_CARD_PREVIEW_CONFIG.cardsMarginTop,
    ),
  };
}
