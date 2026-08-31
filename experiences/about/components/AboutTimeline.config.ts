import type { CtaButtonMotionEasing } from '../../../components/CtaButton/config/registered';
import {
  GAP_OPTIONS,
  PADDING_TOP_OPTIONS,
  PADDING_RIGHT_OPTIONS,
  PADDING_BOTTOM_OPTIONS,
  PADDING_LEFT_OPTIONS,
  MARGIN_TOP_OPTIONS,
  MARGIN_RIGHT_OPTIONS,
  MARGIN_BOTTOM_OPTIONS,
  MARGIN_LEFT_OPTIONS,
  type GapClass,
  type PaddingTopClass,
  type PaddingRightClass,
  type PaddingBottomClass,
  type PaddingLeftClass,
  type MarginTopClass,
  type MarginRightClass,
  type MarginBottomClass,
  type MarginLeftClass,
} from '../../../components/tailwindSpacingScale';
import { FONT_SIZE_OPTIONS, type FontSizeClass } from '../../../components/tailwindTypographyScale';

/** 'accent' (default): the marker's fill/outline color tracks the active
 * slide's own resolved palette accent (INT-04, unchanged). 'custom' pins it
 * to a fixed color instead, independent of whichever slide is active — same
 * "derive vs. pick a fixed color" pair AboutMobileAccordion's own
 * affordanceColorMode already establishes for this codebase. 'text' instead
 * matches whatever the row's own title is currently rendering at (its own
 * active-state color, `AboutTimeline.tsx`'s own `resolvedRowTitleColorActive`)
 * — one ink for both the marker and the caption text. */
export type AboutTimelineMarkerColorMode = 'accent' | 'custom' | 'text';

/** Which side the marker/rule column sits on, and which way row text (and
 * the description above it) aligns — a single, component-owned toggle, not
 * a per-breakpoint one: this timeline is desktop-only to begin with (see
 * AboutTimeline.tsx's own doc comment), so there is no narrower tier for a
 * second value to ever apply to. */
export type AboutTimelineAlignment = 'left' | 'right';

/** Square icon-style dimension catalog for the marker dot — same literal
 * "complete w-N h-N combo per option" shape
 * AFFORDANCE_DIMENSION_OPTIONS (tailwindSpacingScale.ts) already uses for
 * AboutMobileAccordion's own disclosure affordance, but kept as this
 * component's own local copy rather than widening that shared catalog: this
 * marker's own tuned default (24px) sits above that catalog's own 20px
 * ceiling — copy+rename locally instead of widening a helper shared with
 * other pages' own consumers of the same catalog. */
export const MARKER_SIZE_OPTIONS = [
  { label: '8px', value: 'w-2 h-2' },
  { label: '10px', value: 'w-2.5 h-2.5' },
  { label: '12px', value: 'w-3 h-3' },
  { label: '16px', value: 'w-4 h-4' },
  { label: '20px', value: 'w-5 h-5' },
  { label: '24px', value: 'w-6 h-6' },
  { label: '28px', value: 'w-7 h-7' },
  { label: '32px', value: 'w-8 h-8' },
] as const;
export type AboutTimelineMarkerSizeClass = typeof MARKER_SIZE_OPTIONS[number]['value'];

/** Thickness of the hairline vertical rule — Tailwind's own sub-4px width
 * steps (no shared "hairline width" catalog exists yet for this codebase to
 * reuse; local here rather than adding one to the shared file for a single
 * consumer). */
export const RULE_WEIGHT_OPTIONS = [
  { label: '1px', value: 'w-px' },
  { label: '2px', value: 'w-0.5' },
  { label: '4px', value: 'w-1' },
] as const;
export type AboutTimelineRuleWeightClass = typeof RULE_WEIGHT_OPTIONS[number]['value'];

/**
 * about-IA-timeline-copy-rework (CMP-03) — component-owned config for
 * `AboutTimeline`/`AboutTimelineRow`, mirroring `AboutMobileAccordion.config
 * .ts`'s own shape exactly (a single flat config type + `DEFAULT_*` +
 * `normalize*`, no tabs/breakpoint split — this component is desktop-only,
 * see `AboutTimeline.tsx`'s own doc comment).
 *
 * Every discrete/spacing/sizing field below stores a literal, JIT-visible
 * Tailwind class — never a raw px number assembled into an inline style —
 * per this repo's own Tailwind-only styling convention (see e.g.
 * AboutMobileAccordion.config.ts's affordancePadding/
 * -BorderThicknessClassName/-DimensionClassName for the same pattern
 * already established one file over). Genuine exceptions, matching the
 * sitewide convention for these specific categories: opacity (no Tailwind
 * `opacity-N` catalog exists anywhere in this codebase's config scopes),
 * duration (`transitionDurationMs`, never a Tailwind `duration-*` class in
 * any panel.ts here), and contrast ratio (`*MinContrast`, not a CSS/Tailwind
 * concept at all) — all three stay plain numbers, matching every sibling
 * field of the same kind elsewhere (e.g. AbstractEditorialHeroConfig's own
 * `*MinContrast`/`ctaHoverDurationMs`/every `*Opacity` field).
 *
 * Title (row caption) and description (row supporting line) opacity are now
 * both fully component-owned, each with its own active/inactive pair —
 * `rowTitleOpacityActive`/`-Inactive` supersede an earlier version that
 * instead reused `dockLayoutConfig.minimalModeTextDimOpacity`/
 * `-TextEmphasisOpacity` verbatim via props (INT-03), so this component no
 * longer depends on the dock's own dimming values to state its own active
 * row.
 *
 * The three text objects this component renders — the lead-in `description`
 * above the rows, a row's own title (caption), and a row's own supporting
 * line — each get an independent padding/margin box (four literal Tailwind
 * classes per side, this repo's shared per-side spacing catalogs) so any one
 * of the three can be nudged without affecting the other two or the
 * component's own outer box.
 *
 * Font weight is deliberately never a state signal on this component
 * (operator fix): the only thing that tells an end user which row is
 * active is color/opacity (marker fill switching on, row text brightening)
 * — every row renders at one fixed weight regardless of active state.
 *
 * `alignment` supersedes the page-driven text-align wiring an earlier pass
 * threaded in from `splitColumnLayoutConfig.narrowColumnTextAlign*`
 * (PolymorphicLayout.config.ts) — that only ever flipped text-align, never
 * the marker/rule column itself, so a "right" page alignment still left the
 * marker stranded on the left. This component now owns its own complete
 * left/right presentation (marker column side, rule side, row text-align,
 * and the description's own indent) as a single independent toggle, not a
 * value borrowed from the page's own column config.
 */
export type AboutTimelineConfig = {
  /** Vertical gap between rows — literal Tailwind class, this repo's shared
   * spacing scale. */
  rowGap: GapClass;
  /** Diameter of the marker dot — literal `w-N h-N` combo class. */
  markerSizeClassName: AboutTimelineMarkerSizeClass;
  /** On (default): renders the hairline vertical rule the markers sit on.
   * Off: rule omitted entirely (rows still show their own marker). */
  ruleVisible: boolean;
  /** Thickness of the hairline vertical rule the markers sit on — literal
   * `w-*` class. Only meaningful while `ruleVisible` is on. */
  ruleWeightClassName: AboutTimelineRuleWeightClass;
  /** See `AboutTimelineMarkerColorMode`'s own doc comment. */
  markerColorMode: AboutTimelineMarkerColorMode;
  /** Only read while `markerColorMode` is 'custom'. */
  markerCustomColor: string;
  /** Opacity of an inactive (hollow) marker's own outline. */
  markerIdleOpacity: number;
  /** Opacity of the active (filled) marker — paired with the fill itself
   * switching on, never color alone (A11Y-04). */
  markerActiveOpacity: number;
  /** See `AboutTimelineAlignment`'s own doc comment. */
  alignment: AboutTimelineAlignment;
  /** WCAG contrast ratio the row's own title (caption) text must clear
   * against the column's own resolved background color while its row is
   * active. Independently configurable from the inactive target below —
   * an active row's title is meant to read as the brightest text on the
   * page. */
  rowTitleMinContrastActive: number;
  /** Same as `rowTitleMinContrastActive` above, applied while the row is
   * inactive — deliberately a separate, typically lower target so an
   * inactive title can read as genuinely de-emphasized (a color closer to
   * the background), not just a dimmer opacity of the same color. */
  rowTitleMinContrastInactive: number;
  /** Same active/inactive contrast pair as `rowTitleMinContrastActive`/
   * `-Inactive` above, applied to the row's own supporting line instead of
   * its title. */
  rowDescriptionMinContrastActive: number;
  rowDescriptionMinContrastInactive: number;
  /** Opacity of a row's own title (caption) while its row is active —
   * independent of the supporting line's own opacity below. */
  rowTitleOpacityActive: number;
  /** Same as `rowTitleOpacityActive` above, applied while the row is
   * inactive. */
  rowTitleOpacityInactive: number;
  /** Opacity of the row's own supporting line while its row is active —
   * independent of the title's own opacity above. */
  rowDescriptionOpacityActive: number;
  /** Same as `rowDescriptionOpacityActive` above, applied while the row is
   * inactive. */
  rowDescriptionOpacityInactive: number;
  /** Padding/margin around a row's own title (caption) specifically — four
   * independent literal Tailwind classes per property, this repo's shared
   * per-side spacing catalogs. */
  rowTitlePaddingTopClassName: PaddingTopClass;
  rowTitlePaddingRightClassName: PaddingRightClass;
  rowTitlePaddingBottomClassName: PaddingBottomClass;
  rowTitlePaddingLeftClassName: PaddingLeftClass;
  rowTitleMarginTopClassName: MarginTopClass;
  rowTitleMarginRightClassName: MarginRightClass;
  rowTitleMarginBottomClassName: MarginBottomClass;
  rowTitleMarginLeftClassName: MarginLeftClass;
  /** Padding/margin around a row's own supporting line specifically —
   * independent of the title's own box above. */
  rowDescriptionPaddingTopClassName: PaddingTopClass;
  rowDescriptionPaddingRightClassName: PaddingRightClass;
  rowDescriptionPaddingBottomClassName: PaddingBottomClass;
  rowDescriptionPaddingLeftClassName: PaddingLeftClass;
  rowDescriptionMarginTopClassName: MarginTopClass;
  rowDescriptionMarginRightClassName: MarginRightClass;
  rowDescriptionMarginBottomClassName: MarginBottomClass;
  rowDescriptionMarginLeftClassName: MarginLeftClass;
  /** Outer spacing around the whole timeline block (description + rows
   * together) — four independent literal Tailwind classes, this repo's
   * shared per-side spacing catalogs (tailwindSpacingScale.ts). */
  paddingTopClassName: PaddingTopClass;
  paddingRightClassName: PaddingRightClass;
  paddingBottomClassName: PaddingBottomClass;
  paddingLeftClassName: PaddingLeftClass;
  marginTopClassName: MarginTopClass;
  marginRightClassName: MarginRightClass;
  marginBottomClassName: MarginBottomClass;
  marginLeftClassName: MarginLeftClass;
  /** Padding/margin around the lead-in description text above the rows —
   * independent of the outer block box above and of the per-row title/
   * description boxes above. */
  descriptionPaddingTopClassName: PaddingTopClass;
  descriptionPaddingRightClassName: PaddingRightClass;
  descriptionPaddingBottomClassName: PaddingBottomClass;
  descriptionPaddingLeftClassName: PaddingLeftClass;
  descriptionMarginTopClassName: MarginTopClass;
  descriptionMarginRightClassName: MarginRightClass;
  descriptionMarginBottomClassName: MarginBottomClass;
  descriptionMarginLeftClassName: MarginLeftClass;
  /** Font size of the description text — literal Tailwind `text-*` class,
   * independent of the rows' own caption/line sizes (fixed in
   * `AboutTimeline.module.css`), since the description is a different kind
   * of object (a lead-in sentence, not a row). */
  descriptionFontSizeClassName: FontSizeClass;
  /** Opacity of the lead-in description text — this element has no active/
   * inactive state of its own, so a single value (unlike the per-row title/
   * description opacity pairs above). */
  descriptionOpacity: number;
  /** WCAG contrast ratio the lead-in description text (above the rows) must
   * clear against the column's own resolved background color — its own
   * independently configurable target, distinct from `rowDescriptionMinContrast
   * Active`/`-Inactive` above (a per-row supporting line, not this one
   * lead-in sentence, and this element has no active/inactive state of its
   * own to begin with). Same 1-21 range/semantics as every other
   * *MinContrast field in this codebase. */
  descriptionMinContrast: number;
  /** Duration of the marker fill/opacity transition and the row text's own
   * opacity transition as the active row changes. */
  transitionDurationMs: number;
  transitionEasing: CtaButtonMotionEasing;
};

export const DEFAULT_ABOUT_TIMELINE_CONFIG = {
  rowGap: 'gap-10',
  markerSizeClassName: 'w-6 h-6',
  ruleVisible: false,
  ruleWeightClassName: 'w-px',
  markerColorMode: 'custom',
  markerCustomColor: '#6c5351',
  markerIdleOpacity: 0.11,
  markerActiveOpacity: 0.9,
  alignment: 'left',
  rowTitleMinContrastActive: 5.1,
  rowTitleMinContrastInactive: 4,
  rowDescriptionMinContrastActive: 5,
  rowDescriptionMinContrastInactive: 4,
  rowTitleOpacityActive: 1,
  rowTitleOpacityInactive: 0.7,
  rowDescriptionOpacityActive: 0.8,
  rowDescriptionOpacityInactive: 0.6,
  rowTitlePaddingTopClassName: 'pt-0',
  rowTitlePaddingRightClassName: 'pr-0',
  rowTitlePaddingBottomClassName: 'pb-0',
  rowTitlePaddingLeftClassName: 'pl-0',
  rowTitleMarginTopClassName: 'mt-0',
  rowTitleMarginRightClassName: 'mr-0',
  rowTitleMarginBottomClassName: 'mb-0',
  rowTitleMarginLeftClassName: 'ml-0',
  rowDescriptionPaddingTopClassName: 'pt-0',
  rowDescriptionPaddingRightClassName: 'pr-0',
  rowDescriptionPaddingBottomClassName: 'pb-0',
  rowDescriptionPaddingLeftClassName: 'pl-0',
  rowDescriptionMarginTopClassName: 'mt-0',
  rowDescriptionMarginRightClassName: 'mr-0',
  rowDescriptionMarginBottomClassName: 'mb-0',
  rowDescriptionMarginLeftClassName: 'ml-0',
  paddingTopClassName: 'pt-0',
  paddingRightClassName: 'pr-0',
  paddingBottomClassName: 'pb-0',
  paddingLeftClassName: 'pl-0',
  marginTopClassName: 'mt-5',
  marginRightClassName: 'mr-0',
  marginBottomClassName: 'mb-0',
  marginLeftClassName: 'ml-0',
  descriptionPaddingTopClassName: 'pt-3',
  descriptionPaddingRightClassName: 'pr-0',
  descriptionPaddingBottomClassName: 'pb-10',
  descriptionPaddingLeftClassName: 'pl-0',
  descriptionMarginTopClassName: 'mt-0',
  descriptionMarginRightClassName: 'mr-0',
  descriptionMarginBottomClassName: 'mb-0',
  descriptionMarginLeftClassName: 'ml-0',
  descriptionFontSizeClassName: 'text-base',
  descriptionOpacity: 1,
  descriptionMinContrast: 4.5,
  transitionDurationMs: 550,
  transitionEasing: 'gentle',
} satisfies AboutTimelineConfig;

const GAP_VALUES: ReadonlyArray<GapClass> = GAP_OPTIONS.map(option => option.value);
const MARKER_SIZE_VALUES: ReadonlyArray<AboutTimelineMarkerSizeClass> =
  MARKER_SIZE_OPTIONS.map(option => option.value);
const RULE_WEIGHT_VALUES: ReadonlyArray<AboutTimelineRuleWeightClass> =
  RULE_WEIGHT_OPTIONS.map(option => option.value);
const PADDING_TOP_VALUES: ReadonlyArray<PaddingTopClass> = PADDING_TOP_OPTIONS.map(option => option.value);
const PADDING_RIGHT_VALUES: ReadonlyArray<PaddingRightClass> = PADDING_RIGHT_OPTIONS.map(option => option.value);
const PADDING_BOTTOM_VALUES: ReadonlyArray<PaddingBottomClass> = PADDING_BOTTOM_OPTIONS.map(option => option.value);
const PADDING_LEFT_VALUES: ReadonlyArray<PaddingLeftClass> = PADDING_LEFT_OPTIONS.map(option => option.value);
const MARGIN_TOP_VALUES: ReadonlyArray<MarginTopClass> = MARGIN_TOP_OPTIONS.map(option => option.value);
const MARGIN_RIGHT_VALUES: ReadonlyArray<MarginRightClass> = MARGIN_RIGHT_OPTIONS.map(option => option.value);
const MARGIN_BOTTOM_VALUES: ReadonlyArray<MarginBottomClass> = MARGIN_BOTTOM_OPTIONS.map(option => option.value);
const MARGIN_LEFT_VALUES: ReadonlyArray<MarginLeftClass> = MARGIN_LEFT_OPTIONS.map(option => option.value);
const FONT_SIZE_VALUES: ReadonlyArray<FontSizeClass> = FONT_SIZE_OPTIONS.map(option => option.value);
const MOTION_EASINGS: ReadonlyArray<CtaButtonMotionEasing> = [
  'linear', 'standard', 'expressive', 'viscous', 'gentle',
];
const MARKER_COLOR_MODES: ReadonlyArray<AboutTimelineMarkerColorMode> = ['accent', 'custom', 'text'];
const ALIGNMENTS: ReadonlyArray<AboutTimelineAlignment> = ['left', 'right'];

const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);
const clampRange = (value: number, min: number, max: number, fallback: number) => (
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
);

export function normalizeAboutTimelineConfig(
  config: Partial<AboutTimelineConfig> | undefined,
): AboutTimelineConfig {
  const base = { ...DEFAULT_ABOUT_TIMELINE_CONFIG, ...(config ?? {}) };
  const D = DEFAULT_ABOUT_TIMELINE_CONFIG;
  return {
    rowGap: token(base.rowGap, GAP_VALUES, D.rowGap),
    markerSizeClassName: token(base.markerSizeClassName, MARKER_SIZE_VALUES, D.markerSizeClassName),
    ruleVisible: base.ruleVisible !== false,
    ruleWeightClassName: token(base.ruleWeightClassName, RULE_WEIGHT_VALUES, D.ruleWeightClassName),
    markerColorMode: token(base.markerColorMode, MARKER_COLOR_MODES, D.markerColorMode),
    markerCustomColor: typeof base.markerCustomColor === 'string' && base.markerCustomColor.length > 0
      ? base.markerCustomColor
      : D.markerCustomColor,
    markerIdleOpacity: clampRange(base.markerIdleOpacity, 0, 1, D.markerIdleOpacity),
    markerActiveOpacity: clampRange(base.markerActiveOpacity, 0, 1, D.markerActiveOpacity),
    alignment: token(base.alignment, ALIGNMENTS, D.alignment),
    rowTitleMinContrastActive: clampRange(
      base.rowTitleMinContrastActive, 1, 21, D.rowTitleMinContrastActive,
    ),
    rowTitleMinContrastInactive: clampRange(
      base.rowTitleMinContrastInactive, 1, 21, D.rowTitleMinContrastInactive,
    ),
    rowDescriptionMinContrastActive: clampRange(
      base.rowDescriptionMinContrastActive, 1, 21, D.rowDescriptionMinContrastActive,
    ),
    rowDescriptionMinContrastInactive: clampRange(
      base.rowDescriptionMinContrastInactive, 1, 21, D.rowDescriptionMinContrastInactive,
    ),
    rowTitleOpacityActive: clampRange(base.rowTitleOpacityActive, 0, 1, D.rowTitleOpacityActive),
    rowTitleOpacityInactive: clampRange(base.rowTitleOpacityInactive, 0, 1, D.rowTitleOpacityInactive),
    rowDescriptionOpacityActive: clampRange(
      base.rowDescriptionOpacityActive, 0, 1, D.rowDescriptionOpacityActive,
    ),
    rowDescriptionOpacityInactive: clampRange(
      base.rowDescriptionOpacityInactive, 0, 1, D.rowDescriptionOpacityInactive,
    ),
    rowTitlePaddingTopClassName: token(
      base.rowTitlePaddingTopClassName, PADDING_TOP_VALUES, D.rowTitlePaddingTopClassName,
    ),
    rowTitlePaddingRightClassName: token(
      base.rowTitlePaddingRightClassName, PADDING_RIGHT_VALUES, D.rowTitlePaddingRightClassName,
    ),
    rowTitlePaddingBottomClassName: token(
      base.rowTitlePaddingBottomClassName, PADDING_BOTTOM_VALUES, D.rowTitlePaddingBottomClassName,
    ),
    rowTitlePaddingLeftClassName: token(
      base.rowTitlePaddingLeftClassName, PADDING_LEFT_VALUES, D.rowTitlePaddingLeftClassName,
    ),
    rowTitleMarginTopClassName: token(
      base.rowTitleMarginTopClassName, MARGIN_TOP_VALUES, D.rowTitleMarginTopClassName,
    ),
    rowTitleMarginRightClassName: token(
      base.rowTitleMarginRightClassName, MARGIN_RIGHT_VALUES, D.rowTitleMarginRightClassName,
    ),
    rowTitleMarginBottomClassName: token(
      base.rowTitleMarginBottomClassName, MARGIN_BOTTOM_VALUES, D.rowTitleMarginBottomClassName,
    ),
    rowTitleMarginLeftClassName: token(
      base.rowTitleMarginLeftClassName, MARGIN_LEFT_VALUES, D.rowTitleMarginLeftClassName,
    ),
    rowDescriptionPaddingTopClassName: token(
      base.rowDescriptionPaddingTopClassName, PADDING_TOP_VALUES, D.rowDescriptionPaddingTopClassName,
    ),
    rowDescriptionPaddingRightClassName: token(
      base.rowDescriptionPaddingRightClassName, PADDING_RIGHT_VALUES, D.rowDescriptionPaddingRightClassName,
    ),
    rowDescriptionPaddingBottomClassName: token(
      base.rowDescriptionPaddingBottomClassName, PADDING_BOTTOM_VALUES, D.rowDescriptionPaddingBottomClassName,
    ),
    rowDescriptionPaddingLeftClassName: token(
      base.rowDescriptionPaddingLeftClassName, PADDING_LEFT_VALUES, D.rowDescriptionPaddingLeftClassName,
    ),
    rowDescriptionMarginTopClassName: token(
      base.rowDescriptionMarginTopClassName, MARGIN_TOP_VALUES, D.rowDescriptionMarginTopClassName,
    ),
    rowDescriptionMarginRightClassName: token(
      base.rowDescriptionMarginRightClassName, MARGIN_RIGHT_VALUES, D.rowDescriptionMarginRightClassName,
    ),
    rowDescriptionMarginBottomClassName: token(
      base.rowDescriptionMarginBottomClassName, MARGIN_BOTTOM_VALUES, D.rowDescriptionMarginBottomClassName,
    ),
    rowDescriptionMarginLeftClassName: token(
      base.rowDescriptionMarginLeftClassName, MARGIN_LEFT_VALUES, D.rowDescriptionMarginLeftClassName,
    ),
    paddingTopClassName: token(base.paddingTopClassName, PADDING_TOP_VALUES, D.paddingTopClassName),
    paddingRightClassName: token(base.paddingRightClassName, PADDING_RIGHT_VALUES, D.paddingRightClassName),
    paddingBottomClassName: token(base.paddingBottomClassName, PADDING_BOTTOM_VALUES, D.paddingBottomClassName),
    paddingLeftClassName: token(base.paddingLeftClassName, PADDING_LEFT_VALUES, D.paddingLeftClassName),
    marginTopClassName: token(base.marginTopClassName, MARGIN_TOP_VALUES, D.marginTopClassName),
    marginRightClassName: token(base.marginRightClassName, MARGIN_RIGHT_VALUES, D.marginRightClassName),
    marginBottomClassName: token(base.marginBottomClassName, MARGIN_BOTTOM_VALUES, D.marginBottomClassName),
    marginLeftClassName: token(base.marginLeftClassName, MARGIN_LEFT_VALUES, D.marginLeftClassName),
    descriptionPaddingTopClassName: token(
      base.descriptionPaddingTopClassName, PADDING_TOP_VALUES, D.descriptionPaddingTopClassName,
    ),
    descriptionPaddingRightClassName: token(
      base.descriptionPaddingRightClassName, PADDING_RIGHT_VALUES, D.descriptionPaddingRightClassName,
    ),
    descriptionPaddingBottomClassName: token(
      base.descriptionPaddingBottomClassName, PADDING_BOTTOM_VALUES, D.descriptionPaddingBottomClassName,
    ),
    descriptionPaddingLeftClassName: token(
      base.descriptionPaddingLeftClassName, PADDING_LEFT_VALUES, D.descriptionPaddingLeftClassName,
    ),
    descriptionMarginTopClassName: token(
      base.descriptionMarginTopClassName, MARGIN_TOP_VALUES, D.descriptionMarginTopClassName,
    ),
    descriptionMarginRightClassName: token(
      base.descriptionMarginRightClassName, MARGIN_RIGHT_VALUES, D.descriptionMarginRightClassName,
    ),
    descriptionMarginBottomClassName: token(
      base.descriptionMarginBottomClassName, MARGIN_BOTTOM_VALUES, D.descriptionMarginBottomClassName,
    ),
    descriptionMarginLeftClassName: token(
      base.descriptionMarginLeftClassName, MARGIN_LEFT_VALUES, D.descriptionMarginLeftClassName,
    ),
    descriptionFontSizeClassName: token(
      base.descriptionFontSizeClassName, FONT_SIZE_VALUES, D.descriptionFontSizeClassName,
    ),
    descriptionOpacity: clampRange(base.descriptionOpacity, 0, 1, D.descriptionOpacity),
    descriptionMinContrast: clampRange(base.descriptionMinContrast, 1, 21, D.descriptionMinContrast),
    transitionDurationMs: clampRange(base.transitionDurationMs, 0, 1000, D.transitionDurationMs),
    transitionEasing: token(base.transitionEasing, MOTION_EASINGS, D.transitionEasing),
  };
}
