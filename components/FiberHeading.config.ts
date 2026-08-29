export type FiberHeadingFillMode = 'solid' | 'gradient';
export type FiberHeadingTextFillMode = 'inherit' | 'solid';
export type FiberHeadingBellyWidthMode = 'auto' | 'fixed';
/**
 * Where the belly (and the text riding on it) sits along the hairline, which
 * itself always spans the full container width regardless of this setting —
 * 'left'/'right' shift the plateau toward that edge (still with its own
 * taper margin on both sides), 'center' (default) is the original behavior.
 */
export type FiberHeadingAlign = 'left' | 'center' | 'right';
export type FiberHeadingHeight =
  | 'h-6'
  | 'h-8'
  | 'h-10'
  | 'h-12'
  | 'h-14'
  | 'h-16'
  | 'h-20'
  | 'h-24'
  | 'h-28'
  | 'h-32';
export type FiberHeadingDesktopHeight =
  | 'md:h-6'
  | 'md:h-8'
  | 'md:h-10'
  | 'md:h-12'
  | 'md:h-14'
  | 'md:h-16'
  | 'md:h-20'
  | 'md:h-24'
  | 'md:h-28'
  | 'md:h-32';
export type FiberHeadingFontSize =
  | 'text-xs'
  | 'text-sm'
  | 'text-base'
  | 'text-lg'
  | 'text-xl'
  | 'text-2xl'
  | 'text-3xl'
  | 'text-4xl'
  | 'text-5xl'
  | 'text-6xl';
export type FiberHeadingDesktopFontSize =
  | 'md:text-xs'
  | 'md:text-sm'
  | 'md:text-base'
  | 'md:text-lg'
  | 'md:text-xl'
  | 'md:text-2xl'
  | 'md:text-3xl'
  | 'md:text-4xl'
  | 'md:text-5xl'
  | 'md:text-6xl';

/**
 * The hairline's own thickness, named the way a border is named elsewhere in
 * this codebase (CtaButtonBorderWidth) rather than a bare pixel number.
 * 'hairline' is the thinnest option (0.75px) for an especially delicate rule.
 */
export type FiberHeadingBorderThickness = 'hairline' | 'thin' | 'regular' | 'bold';

/** 'inherit' (default) follows GlobalTypographyConfig.headingFontFamily —
 * see components/GlobalTypography.config.ts. 'sans'/'serif' pin this
 * heading regardless of the site-wide default. */
export type FiberHeadingFontFamily = 'inherit' | 'sans' | 'serif';

export type FiberHeadingConfig = {
  // Layout — a Tailwind token drives the component's box height (composes
  // with the rest of the page's spacing scale). containerHeight applies at
  // every width unless containerHeightDesktop overrides it from md (768px)
  // up — same mobile-first base/override pairing as SiteHeaderConfig's
  // height/desktopHeight, so a full-bleed heading tuned for a wide viewport
  // doesn't dwarf a narrow one.
  containerHeight: FiberHeadingHeight;
  containerHeightDesktop: FiberHeadingDesktopHeight;
  // Where the belly/text sits along the hairline — see FiberHeadingAlign.
  align: FiberHeadingAlign;
  // Shape — the belly's taper "physics". See bellyHalfThicknessAt in
  // helpers/fiberHeadingSurface.ts: the taper is cos(t·π/2)^taperFlatness,
  // t∈[0,1] across the padding margin. bellyFullness (0–1) is how much of
  // containerHeight the belly's peak thickness fills. Raising taperFlatness
  // shifts the curve's transition midpoint earlier (closer to the plateau)
  // — most of the narrowing happens quickly right after the shoulder,
  // leaving a long, nearly-flat glide into the hairline tip, rather than an
  // evenly-tapering wedge to a sharper point. n>1 guarantees a zero-slope
  // (fully tangent) tip; ~3 is a gentle swell, ~4+ reads noticeably softer.
  //
  // Because the curve's shape is proportional (t∈[0,1] regardless of the
  // margin's physical width) but gets *rendered* at a fixed pixel scale, the
  // same taperFlatness reads completely differently depending on how wide
  // the taper margin (textPaddingXPx) actually is: a high n that reads as a
  // long, soft glide across a wide 200px desktop margin collapses to a
  // near-vertical drop within the first few pixels of a narrow 40px mobile
  // margin — the "kink" is optical, from compressing the same proportional
  // curve into far fewer physical pixels, not a change in the math. So this
  // (like textPaddingXPx/YPx) also needs its own mobile/desktop pair rather
  // than one shared value — see FiberHeading.tsx for the breakpoint switch.
  bellyFullness: number;
  taperFlatness: number;
  taperFlatnessDesktop: number;
  // The full-width hairline's thickness.
  borderThickness: FiberHeadingBorderThickness;
  bellyWidthMode: FiberHeadingBellyWidthMode;
  bellyWidthPx: number;
  // Text placement — 'auto' belly width is measured text width + this padding.
  // Padding also doubles as the taper's own margin, so more of it reads as a
  // gentler swell even at the same taperFlatness. These two feed the canvas
  // geometry directly (not CSS classes), so — unlike containerHeight/fontSize,
  // which get their responsiveness for free from Tailwind's own breakpoint
  // cascade — the *Desktop variants are applied in JS, switching once the
  // measured container width crosses md (768px); see FiberHeading.tsx.
  textPaddingXPx: number;
  textPaddingXPxDesktop: number;
  textPaddingYPx: number;
  textPaddingYPxDesktop: number;
  letterSpacingEm: number;
  fontSize: FiberHeadingFontSize;
  fontSizeDesktop: FiberHeadingDesktopFontSize;
  fontFamily: FiberHeadingFontFamily;
  // Fill — mirrors CtaButtonBackgroundMode's solid/gradient split. Gradient
  // mode samples a shared GradientTextureSource (e.g. the same field driving
  // abstract.tsx's hero) via helpers/fiberHeadingSurface.ts.
  fillMode: FiberHeadingFillMode;
  solidColor: string;
  gradientScale: number;
  gradientPanXPercent: number;
  gradientPanYPercent: number;
  // Text fill — 'inherit' samples the same painted belly field so the text's
  // color is spatially continuous with the belly beneath it; 'solid' opts out.
  textFillMode: FiberHeadingTextFillMode;
  textColor: string;
};

export const DEFAULT_FIBER_HEADING_CONFIG = {
  containerHeight: 'h-6',
  containerHeightDesktop: 'md:h-8',
  align: 'center',
  bellyFullness: 1,
  taperFlatness: 1.35,
  taperFlatnessDesktop: 8,
  borderThickness: 'hairline',
  bellyWidthMode: 'auto',
  bellyWidthPx: 320,
  textPaddingXPx: 40,
  textPaddingXPxDesktop: 200,
  textPaddingYPx: 16,
  textPaddingYPxDesktop: 120,
  letterSpacingEm: 0.33,
  fontSize: 'text-sm',
  fontSizeDesktop: 'md:text-lg',
  fontFamily: 'inherit',
  fillMode: 'solid',
  solidColor: '#90909d',
  gradientScale: 1,
  gradientPanXPercent: 50,
  gradientPanYPercent: 50,
  textFillMode: 'inherit',
  textColor: '#d1d1d1',
} satisfies FiberHeadingConfig;

export const FIBER_HEADING_BORDER_THICKNESS_PX: Record<FiberHeadingBorderThickness, number> = {
  hairline: 0.75,
  thin: 1.5,
  regular: 3,
  bold: 5,
};

const HEIGHTS: ReadonlyArray<FiberHeadingHeight> = [
  'h-6', 'h-8', 'h-10', 'h-12', 'h-14', 'h-16', 'h-20', 'h-24', 'h-28', 'h-32',
];
const DESKTOP_HEIGHTS: ReadonlyArray<FiberHeadingDesktopHeight> = [
  'md:h-6', 'md:h-8', 'md:h-10', 'md:h-12', 'md:h-14',
  'md:h-16', 'md:h-20', 'md:h-24', 'md:h-28', 'md:h-32',
];
const FONT_SIZES: ReadonlyArray<FiberHeadingFontSize> = [
  'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl',
  'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl',
];
const DESKTOP_FONT_SIZES: ReadonlyArray<FiberHeadingDesktopFontSize> = [
  'md:text-xs', 'md:text-sm', 'md:text-base', 'md:text-lg', 'md:text-xl',
  'md:text-2xl', 'md:text-3xl', 'md:text-4xl', 'md:text-5xl', 'md:text-6xl',
];
const BORDER_THICKNESSES: ReadonlyArray<FiberHeadingBorderThickness> = [
  'hairline', 'thin', 'regular', 'bold',
];
const ALIGNS: ReadonlyArray<FiberHeadingAlign> = ['left', 'center', 'right'];
const FONT_FAMILIES: ReadonlyArray<FiberHeadingFontFamily> = ['inherit', 'sans', 'serif'];

const clampRange = (value: number, min: number, max: number, fallback: number) => (
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback))
);
const normalizeColor = (value: string, fallback: string) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
};
const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);

export function normalizeFiberHeadingConfig(
  config: Partial<FiberHeadingConfig> | undefined,
): FiberHeadingConfig {
  const base = { ...DEFAULT_FIBER_HEADING_CONFIG, ...(config ?? {}) };
  return {
    containerHeight: token(
      base.containerHeight, HEIGHTS, DEFAULT_FIBER_HEADING_CONFIG.containerHeight,
    ),
    containerHeightDesktop: token(
      base.containerHeightDesktop,
      DESKTOP_HEIGHTS,
      DEFAULT_FIBER_HEADING_CONFIG.containerHeightDesktop,
    ),
    align: token(base.align, ALIGNS, DEFAULT_FIBER_HEADING_CONFIG.align),
    bellyFullness: clampRange(
      base.bellyFullness, 0.05, 1, DEFAULT_FIBER_HEADING_CONFIG.bellyFullness,
    ),
    taperFlatness: clampRange(
      base.taperFlatness, 1, 8, DEFAULT_FIBER_HEADING_CONFIG.taperFlatness,
    ),
    taperFlatnessDesktop: clampRange(
      base.taperFlatnessDesktop, 1, 8, DEFAULT_FIBER_HEADING_CONFIG.taperFlatnessDesktop,
    ),
    borderThickness: token(
      base.borderThickness, BORDER_THICKNESSES, DEFAULT_FIBER_HEADING_CONFIG.borderThickness,
    ),
    bellyWidthMode: base.bellyWidthMode === 'fixed' ? 'fixed' : 'auto',
    bellyWidthPx: clampRange(
      base.bellyWidthPx, 40, 4000, DEFAULT_FIBER_HEADING_CONFIG.bellyWidthPx,
    ),
    textPaddingXPx: clampRange(
      base.textPaddingXPx, 0, 200, DEFAULT_FIBER_HEADING_CONFIG.textPaddingXPx,
    ),
    textPaddingXPxDesktop: clampRange(
      base.textPaddingXPxDesktop, 0, 400, DEFAULT_FIBER_HEADING_CONFIG.textPaddingXPxDesktop,
    ),
    textPaddingYPx: clampRange(
      base.textPaddingYPx, 0, 120, DEFAULT_FIBER_HEADING_CONFIG.textPaddingYPx,
    ),
    textPaddingYPxDesktop: clampRange(
      base.textPaddingYPxDesktop, 0, 240, DEFAULT_FIBER_HEADING_CONFIG.textPaddingYPxDesktop,
    ),
    letterSpacingEm: clampRange(
      base.letterSpacingEm, 0, 1, DEFAULT_FIBER_HEADING_CONFIG.letterSpacingEm,
    ),
    fontSize: token(base.fontSize, FONT_SIZES, DEFAULT_FIBER_HEADING_CONFIG.fontSize),
    fontSizeDesktop: token(
      base.fontSizeDesktop, DESKTOP_FONT_SIZES, DEFAULT_FIBER_HEADING_CONFIG.fontSizeDesktop,
    ),
    fontFamily: token(
      base.fontFamily, FONT_FAMILIES, DEFAULT_FIBER_HEADING_CONFIG.fontFamily,
    ),
    fillMode: base.fillMode === 'gradient' ? 'gradient' : 'solid',
    solidColor: normalizeColor(base.solidColor, DEFAULT_FIBER_HEADING_CONFIG.solidColor),
    gradientScale: clampRange(
      base.gradientScale, 1, 3, DEFAULT_FIBER_HEADING_CONFIG.gradientScale,
    ),
    gradientPanXPercent: clampRange(
      base.gradientPanXPercent, 0, 100, DEFAULT_FIBER_HEADING_CONFIG.gradientPanXPercent,
    ),
    gradientPanYPercent: clampRange(
      base.gradientPanYPercent, 0, 100, DEFAULT_FIBER_HEADING_CONFIG.gradientPanYPercent,
    ),
    textFillMode: base.textFillMode === 'solid' ? 'solid' : 'inherit',
    textColor: normalizeColor(base.textColor, DEFAULT_FIBER_HEADING_CONFIG.textColor),
  };
}
