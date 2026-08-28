export type PageTitleFontSizeNarrow =
  | 'text-2xl'
  | 'text-3xl'
  | 'text-4xl'
  | 'text-5xl';
export type PageTitleFontSizeMid =
  | 'md:text-3xl'
  | 'md:text-4xl'
  | 'md:text-5xl'
  | 'md:text-6xl'
  | 'md:text-7xl';
export type PageTitleFontSizeWide =
  | 'lg:text-4xl'
  | 'lg:text-5xl'
  | 'lg:text-6xl'
  | 'lg:text-7xl'
  | 'lg:text-8xl';
/** 'inherit' (default) follows GlobalTypographyConfig.headingFontFamily —
 * see components/GlobalTypography.config.ts. 'sans'/'serif' pin this title
 * regardless of the site-wide default. */
export type PageTitleFontFamily = 'inherit' | 'sans' | 'serif';

/**
 * A plain page `<h1>` — no gradient/shadow canvas, no CTA-motion stage. Every
 * page besides abstract.tsx (whose hero headline is deliberately more
 * elaborate — see AbstractEditorialHero — and stays as its own component)
 * renders its top-level title through this one shared component instead of
 * a bespoke per-page heading.
 *
 * Default font sizes are a trimmed-down step below AbstractEditorialHero's
 * own hero-scale headline (text-3xl/md:text-5xl/lg:text-8xl) — copied by
 * value, not by reference (AbstractEditorialHeroConfig stays hero-specific
 * and untouched), and sized for a plain title sitting in a narrower content
 * column rather than a full-bleed hero row.
 */
export type PageTitleConfig = {
  fontSizeNarrow: PageTitleFontSizeNarrow;
  fontSizeMid: PageTitleFontSizeMid;
  fontSizeWide: PageTitleFontSizeWide;
  fontFamily: PageTitleFontFamily;
  color: string;
  letterSpacingEm: number;
  lineHeight: number;
  maxWidthCh: number;
};

export const DEFAULT_PAGE_TITLE_CONFIG = {
  fontSizeNarrow: 'text-4xl',
  fontSizeMid: 'md:text-6xl',
  fontSizeWide: 'lg:text-7xl',
  fontFamily: 'inherit',
  color: '#48484e',
  letterSpacingEm: -0.02,
  lineHeight: 0.98,
  maxWidthCh: 8,
} satisfies PageTitleConfig;

const clampRange = (value: number, min: number, max: number, fallback: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));

const normalizeColor = (value: string, fallback: string) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
};

const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);

const FONT_SIZE_NARROW: ReadonlyArray<PageTitleFontSizeNarrow> = [
  'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl',
];
const FONT_SIZE_MID: ReadonlyArray<PageTitleFontSizeMid> = [
  'md:text-3xl', 'md:text-4xl', 'md:text-5xl', 'md:text-6xl', 'md:text-7xl',
];
const FONT_SIZE_WIDE: ReadonlyArray<PageTitleFontSizeWide> = [
  'lg:text-4xl', 'lg:text-5xl', 'lg:text-6xl', 'lg:text-7xl', 'lg:text-8xl',
];
const FONT_FAMILIES: ReadonlyArray<PageTitleFontFamily> = ['inherit', 'sans', 'serif'];

/** Single normalization path for every runtime and panel-provided value. */
export function normalizePageTitleConfig(
  config: Partial<PageTitleConfig> | undefined,
): PageTitleConfig {
  const base = { ...DEFAULT_PAGE_TITLE_CONFIG, ...(config ?? {}) };

  return {
    fontSizeNarrow: token(
      base.fontSizeNarrow, FONT_SIZE_NARROW, DEFAULT_PAGE_TITLE_CONFIG.fontSizeNarrow,
    ),
    fontSizeMid: token(
      base.fontSizeMid, FONT_SIZE_MID, DEFAULT_PAGE_TITLE_CONFIG.fontSizeMid,
    ),
    fontSizeWide: token(
      base.fontSizeWide, FONT_SIZE_WIDE, DEFAULT_PAGE_TITLE_CONFIG.fontSizeWide,
    ),
    fontFamily: token(
      base.fontFamily, FONT_FAMILIES, DEFAULT_PAGE_TITLE_CONFIG.fontFamily,
    ),
    color: normalizeColor(base.color, DEFAULT_PAGE_TITLE_CONFIG.color),
    letterSpacingEm: clampRange(
      base.letterSpacingEm, -0.08, 0.02, DEFAULT_PAGE_TITLE_CONFIG.letterSpacingEm,
    ),
    lineHeight: clampRange(
      base.lineHeight, 0.85, 1.3, DEFAULT_PAGE_TITLE_CONFIG.lineHeight,
    ),
    maxWidthCh: clampRange(
      base.maxWidthCh, 4, 40, DEFAULT_PAGE_TITLE_CONFIG.maxWidthCh,
    ),
  };
}
