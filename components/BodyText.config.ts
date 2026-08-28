export type BodyTextFontSizeNarrow = 'text-sm' | 'text-base' | 'text-lg' | 'text-xl' | 'text-2xl';
export type BodyTextFontSizeMid =
  | 'md:text-sm'
  | 'md:text-base'
  | 'md:text-lg'
  | 'md:text-xl'
  | 'md:text-2xl'
  | 'md:text-3xl';
export type BodyTextFontSizeWide =
  | 'lg:text-base'
  | 'lg:text-lg'
  | 'lg:text-xl'
  | 'lg:text-2xl'
  | 'lg:text-3xl'
  | 'lg:text-4xl';

/**
 * Shared paragraph text — a 'lead' variant (a page's larger intro paragraph)
 * and a 'body' variant (regular copy), both driven by one config so any page
 * reads with the same measured type scale AbstractEditorialHero's own copy
 * already established (bodyFontSizeNarrow/Mid/Wide, copyColor,
 * paragraphTextColor — copied by value below, not by reference; see
 * PageTitleConfig's doc comment for why AbstractEditorialHeroConfig itself
 * stays untouched).
 */
export type BodyTextConfig = {
  leadFontSizeNarrow: BodyTextFontSizeNarrow;
  leadFontSizeMid: BodyTextFontSizeMid;
  leadFontSizeWide: BodyTextFontSizeWide;
  leadColor: string;
  bodyFontSizeNarrow: BodyTextFontSizeNarrow;
  bodyFontSizeMid: BodyTextFontSizeMid;
  bodyFontSizeWide: BodyTextFontSizeWide;
  bodyColor: string;
  lineHeight: number;
  letterSpacingEm: number;
};

export const DEFAULT_BODY_TEXT_CONFIG = {
  leadFontSizeNarrow: 'text-xl',
  leadFontSizeMid: 'md:text-2xl',
  leadFontSizeWide: 'lg:text-3xl',
  leadColor: '#48484e',
  bodyFontSizeNarrow: 'text-base',
  bodyFontSizeMid: 'md:text-lg',
  bodyFontSizeWide: 'lg:text-lg',
  bodyColor: '#7c7c83',
  lineHeight: 1.52,
  letterSpacingEm: -0.002,
} satisfies BodyTextConfig;

const clampRange = (value: number, min: number, max: number, fallback: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));

const normalizeColor = (value: string, fallback: string) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
};

const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);

const FONT_SIZE_NARROW: ReadonlyArray<BodyTextFontSizeNarrow> = [
  'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl',
];
const FONT_SIZE_MID: ReadonlyArray<BodyTextFontSizeMid> = [
  'md:text-sm', 'md:text-base', 'md:text-lg', 'md:text-xl', 'md:text-2xl', 'md:text-3xl',
];
const FONT_SIZE_WIDE: ReadonlyArray<BodyTextFontSizeWide> = [
  'lg:text-base', 'lg:text-lg', 'lg:text-xl', 'lg:text-2xl', 'lg:text-3xl', 'lg:text-4xl',
];

/** Single normalization path for every runtime and panel-provided value. */
export function normalizeBodyTextConfig(
  config: Partial<BodyTextConfig> | undefined,
): BodyTextConfig {
  const base = { ...DEFAULT_BODY_TEXT_CONFIG, ...(config ?? {}) };

  return {
    leadFontSizeNarrow: token(
      base.leadFontSizeNarrow, FONT_SIZE_NARROW, DEFAULT_BODY_TEXT_CONFIG.leadFontSizeNarrow,
    ),
    leadFontSizeMid: token(
      base.leadFontSizeMid, FONT_SIZE_MID, DEFAULT_BODY_TEXT_CONFIG.leadFontSizeMid,
    ),
    leadFontSizeWide: token(
      base.leadFontSizeWide, FONT_SIZE_WIDE, DEFAULT_BODY_TEXT_CONFIG.leadFontSizeWide,
    ),
    leadColor: normalizeColor(base.leadColor, DEFAULT_BODY_TEXT_CONFIG.leadColor),
    bodyFontSizeNarrow: token(
      base.bodyFontSizeNarrow, FONT_SIZE_NARROW, DEFAULT_BODY_TEXT_CONFIG.bodyFontSizeNarrow,
    ),
    bodyFontSizeMid: token(
      base.bodyFontSizeMid, FONT_SIZE_MID, DEFAULT_BODY_TEXT_CONFIG.bodyFontSizeMid,
    ),
    bodyFontSizeWide: token(
      base.bodyFontSizeWide, FONT_SIZE_WIDE, DEFAULT_BODY_TEXT_CONFIG.bodyFontSizeWide,
    ),
    bodyColor: normalizeColor(base.bodyColor, DEFAULT_BODY_TEXT_CONFIG.bodyColor),
    lineHeight: clampRange(
      base.lineHeight, 1.25, 1.7, DEFAULT_BODY_TEXT_CONFIG.lineHeight,
    ),
    letterSpacingEm: clampRange(
      base.letterSpacingEm, -0.03, 0.02, DEFAULT_BODY_TEXT_CONFIG.letterSpacingEm,
    ),
  };
}
