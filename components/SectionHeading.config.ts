import {
  INDENT_OPTIONS,
  MARGIN_BOTTOM_OPTIONS,
  MARGIN_TOP_OPTIONS,
  PADDING_X_OPTIONS,
  PADDING_Y_OPTIONS,
  type IndentClass,
  type MarginBottomClass,
  type MarginTopClass,
  type PaddingXClass,
  type PaddingYClass,
} from './tailwindSpacingScale';

export type SectionHeadingAlign = 'left' | 'center' | 'right';
export type SectionHeadingFontSize =
  | 'text-xs'
  | 'text-sm'
  | 'text-base'
  | 'text-lg'
  | 'text-xl'
  | 'text-2xl';
export type SectionHeadingDesktopFontSize =
  | 'md:text-xs'
  | 'md:text-sm'
  | 'md:text-base'
  | 'md:text-lg'
  | 'md:text-xl'
  | 'md:text-2xl';
/** 'inherit' (default) follows GlobalTypographyConfig.headingFontFamily —
 * see components/GlobalTypography.config.ts. 'sans'/'serif' pin this label
 * regardless of the site-wide default. */
export type SectionHeadingFontFamily = 'inherit' | 'sans' | 'serif';

/**
 * A plain-text section label — no belly/canvas treatment (see FiberHeading
 * for that). Deliberately generic/reusable: every section on the site that
 * needs a small uppercase label above its content (cards, and whatever comes
 * next) renders through this one component/config rather than each section
 * growing its own bespoke heading markup.
 *
 * textIndent/paddingX/paddingY/marginTop/marginBottom hold a literal
 * Tailwind class name (e.g. `'mb-6'`), not a px number — the full set of
 * options per field lives in components/tailwindSpacingScale.ts (Tailwind's
 * complete default spacing scale, ~34 steps per prefix). The panel's own
 * control for each is a `Select` (a native dropdown), not a slider — the
 * whole point being that a value can only ever be one of Tailwind's real
 * classes, chosen from an actual list, never an arbitrary px number.
 */
export type SectionHeadingConfig = {
  align: SectionHeadingAlign;
  fontSize: SectionHeadingFontSize;
  fontSizeDesktop: SectionHeadingDesktopFontSize;
  fontFamily: SectionHeadingFontFamily;
  color: string;
  letterSpacingEm: number;
  textIndent: IndentClass;
  paddingX: PaddingXClass;
  paddingY: PaddingYClass;
  marginTop: MarginTopClass;
  marginBottom: MarginBottomClass;
};

export const DEFAULT_SECTION_HEADING_CONFIG = {
  align: 'left',
  fontSize: 'text-xs',
  fontSizeDesktop: 'md:text-sm',
  fontFamily: 'inherit',
  color: '#85858b',
  letterSpacingEm: 0.33,
  textIndent: 'indent-0',
  paddingX: 'px-0',
  paddingY: 'py-0',
  marginTop: 'mt-0',
  marginBottom: 'mb-4',
} satisfies SectionHeadingConfig;

const ALIGNS: ReadonlyArray<SectionHeadingAlign> = ['left', 'center', 'right'];
const FONT_SIZES: ReadonlyArray<SectionHeadingFontSize> = [
  'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl',
];
const DESKTOP_FONT_SIZES: ReadonlyArray<SectionHeadingDesktopFontSize> = [
  'md:text-xs', 'md:text-sm', 'md:text-base', 'md:text-lg', 'md:text-xl', 'md:text-2xl',
];
const FONT_FAMILIES: ReadonlyArray<SectionHeadingFontFamily> = ['inherit', 'sans', 'serif'];

const normalizeColor = (value: string, fallback: string) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
};
const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);
const clampRange = (value: number, min: number, max: number, fallback: number) => (
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback))
);

// Deriving the validation lists from tailwindSpacingScale.ts's own option
// arrays (rather than retyping ~34 literals a second time) — same source
// the panel's Select control reads its options from, so the two can never
// drift out of sync.
const INDENT_VALUES = INDENT_OPTIONS.map(option => option.value);
const PADDING_X_VALUES = PADDING_X_OPTIONS.map(option => option.value);
const PADDING_Y_VALUES = PADDING_Y_OPTIONS.map(option => option.value);
const MARGIN_TOP_VALUES = MARGIN_TOP_OPTIONS.map(option => option.value);
const MARGIN_BOTTOM_VALUES = MARGIN_BOTTOM_OPTIONS.map(option => option.value);

export function normalizeSectionHeadingConfig(
  config: Partial<SectionHeadingConfig> | undefined,
): SectionHeadingConfig {
  const base = { ...DEFAULT_SECTION_HEADING_CONFIG, ...(config ?? {}) };
  return {
    align: token(base.align, ALIGNS, DEFAULT_SECTION_HEADING_CONFIG.align),
    fontSize: token(base.fontSize, FONT_SIZES, DEFAULT_SECTION_HEADING_CONFIG.fontSize),
    fontSizeDesktop: token(
      base.fontSizeDesktop, DESKTOP_FONT_SIZES, DEFAULT_SECTION_HEADING_CONFIG.fontSizeDesktop,
    ),
    fontFamily: token(
      base.fontFamily, FONT_FAMILIES, DEFAULT_SECTION_HEADING_CONFIG.fontFamily,
    ),
    color: normalizeColor(base.color, DEFAULT_SECTION_HEADING_CONFIG.color),
    letterSpacingEm: clampRange(
      base.letterSpacingEm, 0, 1, DEFAULT_SECTION_HEADING_CONFIG.letterSpacingEm,
    ),
    textIndent: token(base.textIndent, INDENT_VALUES, DEFAULT_SECTION_HEADING_CONFIG.textIndent),
    paddingX: token(base.paddingX, PADDING_X_VALUES, DEFAULT_SECTION_HEADING_CONFIG.paddingX),
    paddingY: token(base.paddingY, PADDING_Y_VALUES, DEFAULT_SECTION_HEADING_CONFIG.paddingY),
    marginTop: token(base.marginTop, MARGIN_TOP_VALUES, DEFAULT_SECTION_HEADING_CONFIG.marginTop),
    marginBottom: token(
      base.marginBottom, MARGIN_BOTTOM_VALUES, DEFAULT_SECTION_HEADING_CONFIG.marginBottom,
    ),
  };
}
