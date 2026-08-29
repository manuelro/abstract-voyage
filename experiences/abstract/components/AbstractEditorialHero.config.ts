import {
  MARGIN_TOP_LG_OPTIONS,
  MARGIN_TOP_OPTIONS,
  MARGIN_TOP_WIDE_OPTIONS,
  type MarginTopClass,
  type MarginTopLgClass,
  type MarginTopWideClass,
} from '../../../components/tailwindSpacingScale';
import type { PolymorphicLayoutContentContainerAlign } from './PolymorphicLayout.config';

export type AbstractEditorialHeroHorizontalPlacement =
  | 'justify-start'
  | 'justify-center'
  | 'justify-end';
export type AbstractEditorialHeroHorizontalPlacementWide =
  `md:${AbstractEditorialHeroHorizontalPlacement}`;
export type AbstractEditorialHeroHorizontalPlacementLg =
  `lg:${AbstractEditorialHeroHorizontalPlacement}`;

// Relocated from pages/abstract.tsx (PLAN-EDITORIAL-HERO-UNIFICATION-AND-
// CARDSTACK-RESIZE-FIX.md Part 2) — a trivial 1:1 lookup between
// PolymorphicLayoutConfig's own narrowColumnContentAlign* vocabulary
// (items-*) and this component's own horizontalPlacement* vocabulary
// (justify-*), both meaning the same three semantic positions. Co-located
// with the component's own placement types (not page-local) so every page
// mounting AbstractEditorialHero resolves horizontalPlacement the same way
// instead of each hand-rolling an identical table.
export const NARROW_COLUMN_ALIGN_TO_HERO_HORIZONTAL_PLACEMENT: Record<
  PolymorphicLayoutContentContainerAlign, AbstractEditorialHeroHorizontalPlacement
> = {
  'items-start': 'justify-start',
  'items-center': 'justify-center',
  'items-end': 'justify-end',
};
export const NARROW_COLUMN_ALIGN_TO_HERO_HORIZONTAL_PLACEMENT_WIDE: Record<
  PolymorphicLayoutContentContainerAlign, AbstractEditorialHeroHorizontalPlacementWide
> = {
  'items-start': 'md:justify-start',
  'items-center': 'md:justify-center',
  'items-end': 'md:justify-end',
};
export const NARROW_COLUMN_ALIGN_TO_HERO_HORIZONTAL_PLACEMENT_LG: Record<
  PolymorphicLayoutContentContainerAlign, AbstractEditorialHeroHorizontalPlacementLg
> = {
  'items-start': 'lg:justify-start',
  'items-center': 'lg:justify-center',
  'items-end': 'lg:justify-end',
};
export type AbstractEditorialHeroHeadlineFontSizeNarrow =
  | 'text-sm'
  | 'text-lg'
  | 'text-2xl'
  | 'text-3xl'
  | 'text-4xl'
  | 'text-5xl';
export type AbstractEditorialHeroHeadlineFontSizeMid =
  | 'md:text-sm'
  | 'md:text-2xl'
  | 'md:text-4xl'
  | 'md:text-5xl'
  | 'md:text-6xl'
  | 'md:text-7xl';
export type AbstractEditorialHeroHeadlineFontSizeWide =
  | 'lg:text-sm'
  | 'lg:text-2xl'
  | 'lg:text-5xl'
  | 'lg:text-6xl'
  | 'lg:text-7xl'
  | 'lg:text-8xl';
export type AbstractEditorialHeroBodyFontSizeNarrow =
  | 'text-sm'
  | 'text-base'
  | 'text-lg'
  | 'text-xl';
export type AbstractEditorialHeroBodyFontSizeMid =
  | 'md:text-sm'
  | 'md:text-base'
  | 'md:text-lg'
  | 'md:text-xl'
  | 'md:text-2xl';
export type AbstractEditorialHeroBodyFontSizeWide =
  | 'lg:text-sm'
  | 'lg:text-base'
  | 'lg:text-lg'
  | 'lg:text-xl'
  | 'lg:text-2xl';
/**
 * Independent Tailwind max-width tokens for the headline and the paragraph
 * copy — previously both were bound to one shared contentMaxWidthPx cap on
 * the whole copy column, which is what made the headline wrap far short of
 * the actual available row width (see the max-w-full default below: the
 * headline defaults to using 100% of its column, same as the user's ask).
 * Kept as separate types (rather than one shared union) since a sane
 * headline width and a sane paragraph reading width are different scales —
 * 'max-w-[18ch]' makes sense for a big display headline, not for body copy.
 */
export type AbstractEditorialHeroHeadlineMaxWidth =
  | 'max-w-full'
  | 'max-w-7xl'
  | 'max-w-6xl'
  | 'max-w-5xl'
  | 'max-w-4xl'
  | 'max-w-[18ch]';
export type AbstractEditorialHeroParagraphMaxWidth =
  | 'max-w-full'
  | 'max-w-3xl'
  | 'max-w-2xl'
  | 'max-w-xl'
  | 'max-w-lg'
  | 'max-w-[54ch]';
/**
 * 'surface' (default) renders the headline in the hero's own surfaceColor —
 * text visible only through its shadow, an embossed/color-matched look.
 * 'solid' overrides that with copyColor as a conventional, readable-by-contrast
 * flat color instead — and always wins over the gradient-headline canvas
 * (see AbstractEditorialHero.module.css), so picking it reliably shows a flat
 * color regardless of whatever gradient/legacy hero mode is active.
 */
export type AbstractEditorialHeroHeadlineFillMode = 'surface' | 'solid';

export type AbstractEditorialHeroEmphasisFontWeight =
  | 'font-normal'
  | 'font-medium'
  | 'font-semibold'
  | 'font-bold';

/** 'inherit' (default) follows GlobalTypographyConfig.headingFontFamily —
 * see components/GlobalTypography.config.ts. 'sans'/'serif' pin the
 * headline regardless of the site-wide default. */
export type AbstractEditorialHeroFontFamily = 'inherit' | 'sans' | 'serif';

// 'custom': the hex field below, verbatim (today's only behavior). 'surface':
// derived from the surfaceColor prop via deriveSurfaceColor (see
// helpers/surfaceColorDerivation.ts — the same primitive CtaButtonConfig's
// own auto colors use), offset by this field's own *SurfaceOffset sibling.
// 'column': derived from the columnBackgroundColor prop (falls back to
// surfaceColor when omitted) via resolveContrastAwareTextColor — a
// WCAG-contrast-aware, hue-preserving search rather than a fixed offset,
// still biased by the same *SurfaceOffset sibling and gated by this field's
// own *MinContrast sibling. Independent per color field, not one shared
// mode, since a page may want e.g. the eyebrow tied to the surface while
// the body copy stays a fixed custom hex.
export type AbstractEditorialHeroTextColorMode = 'custom' | 'surface' | 'column';

export type AbstractEditorialHeroConfig = {
  copyColor: string;
  copyColorMode: AbstractEditorialHeroTextColorMode;
  copySurfaceOffset: number;
  // Only meaningful while copyColorMode is 'column'. Same 1-21 range/
  // semantics as CtaButtonConfig.autoTextMinContrast.
  copyMinContrast: number;
  paragraphTextColor: string;
  paragraphTextColorMode: AbstractEditorialHeroTextColorMode;
  paragraphSurfaceOffset: number;
  paragraphMinContrast: number;
  eyebrowColor: string;
  eyebrowColorMode: AbstractEditorialHeroTextColorMode;
  eyebrowSurfaceOffset: number;
  eyebrowMinContrast: number;
  headlineGradientRelationship: 'linked' | 'custom';
  headlineGradientSourceMode: 'full' | 'band';
  headlineGradientSourceRow: number;
  headlineGradientDebugEnabled: boolean;
  headlineGradientDebugSizePx: number;
  headlineGradientScale: number;
  headlineGradientPanXPercent: number;
  headlineGradientPanYPercent: number;
  // See AbstractEditorialHeroHeadlineFillMode. Shadow (headlineShadow* below)
  // only ever applies in 'surface' mode — it's what makes the color-matched
  // text visible at all, not a general-purpose text-shadow for any fill.
  headlineFillMode: AbstractEditorialHeroHeadlineFillMode;
  // Reuses the CTA button's own elevation-shadow engine and tuning verbatim
  // (see ctaConfig's shadow* fields, consumed via useElevationShadow in
  // AbstractEditorialHero.tsx) rather than duplicating a parallel shadow
  // config — "the same shadow as the CTA" means literally the same physics
  // and the same tuned numbers, just applied to a static element instead of
  // a pointer-reactive one.
  headlineShadowEnabled: boolean;
  // A static heading has no pointer-driven hover state to lift it — this
  // pins the shadow to the CTA's shadowElevationHoverPx (the "lifted" look)
  // instead of its shadowElevationRestingPx (the default, closer-to-surface
  // shadow) whenever headlineShadowEnabled is on.
  headlineShadowElevatedEnabled: boolean;
  // The CTA's light-radius (its blur's real driver — see
  // shadowLightRadiusPx) and displacement values are tuned for its own
  // ~44px solid pill; reused at face value on text, the same absolute blur
  // can be wide enough to bridge the gaps between adjacent letters and
  // dissolve the headline into a soft haze instead of a crisp, legible
  // shadow — the physical-scale mismatch between a solid shape and thin
  // glyph strokes, not a bug in the shared engine. This scales the light's
  // apparent radius (blur), its blur ceiling, and displacement down for the
  // headline (only — light position/direction, color, and elevation stay
  // exactly the CTA's). Default is 1 — literally identical scale to the
  // CTA's own shadow, by request; drop below 1 if legibility at small
  // headline sizes ever needs protecting.
  headlineShadowScale: number;
  headlineFontSizeNarrow: AbstractEditorialHeroHeadlineFontSizeNarrow;
  headlineFontSizeMid: AbstractEditorialHeroHeadlineFontSizeMid;
  headlineFontSizeWide: AbstractEditorialHeroHeadlineFontSizeWide;
  headlineFontFamily: AbstractEditorialHeroFontFamily;
  /** Opt-in: makes the headline render at the same font size as the
   * paragraph copy below (bodyFontSize-prefixed — same trio the paragraphs
   * use, at every breakpoint) instead of its own headlineFontSize-prefixed
   * trio, and forces font-bold so it still
   * reads as the heading by weight alone. Also relaxes the headline's own
   * tight display line-height/letter-spacing to the paragraph's
   * copyLineHeight/copyLetterSpacingEm — those are tuned for a big display
   * size and read as broken (colliding lines, over-tightened tracking) once
   * the headline wraps at body size. Overrides the headline-size fields
   * while on; those fields' own panel controls hide accordingly. */
  headlineMatchesBodySize: boolean;
  headlineMaxWidth: AbstractEditorialHeroHeadlineMaxWidth;
  bodyFontSizeNarrow: AbstractEditorialHeroBodyFontSizeNarrow;
  bodyFontSizeMid: AbstractEditorialHeroBodyFontSizeMid;
  bodyFontSizeWide: AbstractEditorialHeroBodyFontSizeWide;
  paragraphMaxWidth: AbstractEditorialHeroParagraphMaxWidth;
  /** Responsive separation between the headline and its supporting-copy
   * block. These are component-internal rhythm values, not outer column
   * layout, so they remain owned by Editorial Hero rather than Polymorphic
   * Layout. Literal Tailwind tokens keep all three breakpoint variants
   * discoverable by the compiler and editable through the shared spacing
   * selects. */
  leadGap: MarginTopClass;
  leadGapWide: MarginTopWideClass;
  leadGapLg: MarginTopLgClass;
  copyLineHeight: number;
  copyLetterSpacingEm: number;
  /** About page's own emphasis mechanism (renderEmphasisText,
   * helpers/textEmphasis.tsx), reused verbatim here — but NOT
   * About's own literal 0.45/0.95 values, which were tuned against About's
   * own (darker) background. Floor is 0.5 (not 0.88) — below 0.88 this
   * hero's own paragraphTextColor (#48484e default) over its page surface
   * (#d1d1d1 default) drops under a 4.5:1 contrast ratio, so operators
   * pushing past that point are trading body-text contrast for a stronger
   * fade deliberately, not by accident. emphasisFontWeight below is the
   * primary, contrast-safe highlight cue; this opacity pair is a secondary
   * fine-tune on top of it. */
  emphasisDimOpacity: number;
  emphasisWordOpacity: number;
  /** Literal Tailwind font-weight class applied to the emphasis run only
   * (on top of emphasisWordOpacity above) — see emphasisDimOpacity's own
   * doc comment for why opacity alone can't carry a visible highlight here.
   * Heavier text at the same color is never less contrasty, so this is
   * safe to push independently of the accessibility-locked opacity floor.
   * Default 'font-semibold' (600) against the paragraph's own base weight
   * (420, AbstractEditorialHero.module.css's .copyBlock) is a clear but not
   * shouty jump. */
  emphasisFontWeight: AbstractEditorialHeroEmphasisFontWeight;
  /** Renders the hero CTA composer pill below the paragraph copy. False
   * skips its whole wrapping element, leaving no empty gap. Visibility is
   * content policy; the composer's position is intentionally fixed by the
   * component rather than exposed as page layout configuration. */
  composerVisible: boolean;
};

export const DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG = {
  copyColor: '#d1d1d1',
  copyColorMode: 'column',
  copySurfaceOffset: 0.5,
  copyMinContrast: 4.5,
  paragraphTextColor: '#ffffff',
  paragraphTextColorMode: 'column',
  paragraphSurfaceOffset: 0,
  paragraphMinContrast: 5.2,
  eyebrowColor: '#85858b',
  eyebrowColorMode: 'surface',
  eyebrowSurfaceOffset: 0,
  eyebrowMinContrast: 4.5,
  headlineGradientRelationship: 'linked',
  headlineGradientSourceMode: 'full',
  headlineGradientSourceRow: 3,
  headlineGradientDebugEnabled: false,
  headlineGradientDebugSizePx: 320,
  headlineGradientScale: 1.95,
  headlineGradientPanXPercent: 42,
  headlineGradientPanYPercent: 42,
  headlineFillMode: 'solid',
  headlineShadowEnabled: true,
  headlineShadowElevatedEnabled: true,
  headlineShadowScale: 1,
  headlineFontSizeNarrow: 'text-3xl',
  headlineFontSizeMid: 'md:text-4xl',
  headlineFontSizeWide: 'lg:text-5xl',
  headlineFontFamily: 'inherit',
  headlineMatchesBodySize: false,
  headlineMaxWidth: 'max-w-full',
  bodyFontSizeNarrow: 'text-lg',
  bodyFontSizeMid: 'md:text-lg',
  bodyFontSizeWide: 'lg:text-lg',
  paragraphMaxWidth: 'max-w-xl',
  leadGap: 'mt-7',
  leadGapWide: 'md:mt-10',
  leadGapLg: 'lg:mt-10',
  copyLineHeight: 1.7,
  copyLetterSpacingEm: -0.03,
  emphasisDimOpacity: 0.5,
  emphasisWordOpacity: 0.88,
  emphasisFontWeight: 'font-medium',
  composerVisible: false,
} satisfies AbstractEditorialHeroConfig;

const clampRange = (value: number, min: number, max: number, fallback: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));

const normalizeColor = (value: string, fallback: string) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
};

const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);

const TEXT_COLOR_MODES: ReadonlyArray<AbstractEditorialHeroTextColorMode> = [
  'custom', 'surface', 'column',
];
const EMPHASIS_FONT_WEIGHTS: ReadonlyArray<AbstractEditorialHeroEmphasisFontWeight> = [
  'font-normal', 'font-medium', 'font-semibold', 'font-bold',
];
const FONT_FAMILIES: ReadonlyArray<AbstractEditorialHeroFontFamily> = ['inherit', 'sans', 'serif'];
const HEADLINE_FONT_SIZE_NARROW: ReadonlyArray<AbstractEditorialHeroHeadlineFontSizeNarrow> = [
  'text-sm', 'text-lg', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl',
];
const HEADLINE_FONT_SIZE_MID: ReadonlyArray<AbstractEditorialHeroHeadlineFontSizeMid> = [
  'md:text-sm', 'md:text-2xl', 'md:text-4xl', 'md:text-5xl', 'md:text-6xl', 'md:text-7xl',
];
const HEADLINE_FONT_SIZE_WIDE: ReadonlyArray<AbstractEditorialHeroHeadlineFontSizeWide> = [
  'lg:text-sm', 'lg:text-2xl', 'lg:text-5xl', 'lg:text-6xl', 'lg:text-7xl', 'lg:text-8xl',
];
const BODY_FONT_SIZE_NARROW: ReadonlyArray<AbstractEditorialHeroBodyFontSizeNarrow> = [
  'text-sm', 'text-base', 'text-lg', 'text-xl',
];
const BODY_FONT_SIZE_MID: ReadonlyArray<AbstractEditorialHeroBodyFontSizeMid> = [
  'md:text-sm', 'md:text-base', 'md:text-lg', 'md:text-xl', 'md:text-2xl',
];
const BODY_FONT_SIZE_WIDE: ReadonlyArray<AbstractEditorialHeroBodyFontSizeWide> = [
  'lg:text-sm', 'lg:text-base', 'lg:text-lg', 'lg:text-xl', 'lg:text-2xl',
];
const HEADLINE_MAX_WIDTHS: ReadonlyArray<AbstractEditorialHeroHeadlineMaxWidth> = [
  'max-w-full', 'max-w-7xl', 'max-w-6xl', 'max-w-5xl', 'max-w-4xl', 'max-w-[18ch]',
];
const PARAGRAPH_MAX_WIDTHS: ReadonlyArray<AbstractEditorialHeroParagraphMaxWidth> = [
  'max-w-full', 'max-w-3xl', 'max-w-2xl', 'max-w-xl', 'max-w-lg', 'max-w-[54ch]',
];
const LEAD_GAP_VALUES: ReadonlyArray<MarginTopClass> =
  MARGIN_TOP_OPTIONS.map(option => option.value);
const LEAD_GAP_WIDE_VALUES: ReadonlyArray<MarginTopWideClass> =
  MARGIN_TOP_WIDE_OPTIONS.map(option => option.value);
const LEAD_GAP_LG_VALUES: ReadonlyArray<MarginTopLgClass> =
  MARGIN_TOP_LG_OPTIONS.map(option => option.value);

/** Single normalization path for every runtime and panel-provided value. */
export function normalizeAbstractEditorialHeroConfig(
  config: Partial<AbstractEditorialHeroConfig> | undefined,
): AbstractEditorialHeroConfig {
  const base = { ...DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG, ...(config ?? {}) };

  return {
    copyColor: normalizeColor(
      base.copyColor,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.copyColor,
    ),
    copyColorMode: token(
      base.copyColorMode, TEXT_COLOR_MODES, DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.copyColorMode,
    ),
    copySurfaceOffset: clampRange(
      base.copySurfaceOffset, -1, 1, DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.copySurfaceOffset,
    ),
    copyMinContrast: clampRange(
      base.copyMinContrast, 1, 21, DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.copyMinContrast,
    ),
    paragraphTextColor: normalizeColor(
      base.paragraphTextColor,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.paragraphTextColor,
    ),
    paragraphTextColorMode: token(
      base.paragraphTextColorMode,
      TEXT_COLOR_MODES,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.paragraphTextColorMode,
    ),
    paragraphSurfaceOffset: clampRange(
      base.paragraphSurfaceOffset,
      -1,
      1,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.paragraphSurfaceOffset,
    ),
    paragraphMinContrast: clampRange(
      base.paragraphMinContrast, 1, 21, DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.paragraphMinContrast,
    ),
    eyebrowColor: normalizeColor(
      base.eyebrowColor,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.eyebrowColor,
    ),
    eyebrowColorMode: token(
      base.eyebrowColorMode,
      TEXT_COLOR_MODES,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.eyebrowColorMode,
    ),
    eyebrowSurfaceOffset: clampRange(
      base.eyebrowSurfaceOffset, -1, 1, DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.eyebrowSurfaceOffset,
    ),
    eyebrowMinContrast: clampRange(
      base.eyebrowMinContrast, 1, 21, DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.eyebrowMinContrast,
    ),
    headlineGradientRelationship: base.headlineGradientRelationship === 'custom'
      ? 'custom'
      : 'linked',
    headlineGradientSourceMode: base.headlineGradientSourceMode === 'band'
      ? 'band'
      : 'full',
    headlineGradientSourceRow: clampRange(
      base.headlineGradientSourceRow,
      1,
      16,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.headlineGradientSourceRow,
    ),
    headlineGradientDebugEnabled: base.headlineGradientDebugEnabled === true,
    headlineGradientDebugSizePx: clampRange(
      base.headlineGradientDebugSizePx,
      240,
      480,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.headlineGradientDebugSizePx,
    ),
    headlineGradientScale: clampRange(
      base.headlineGradientScale,
      1,
      3,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.headlineGradientScale,
    ),
    headlineGradientPanXPercent: clampRange(
      base.headlineGradientPanXPercent,
      0,
      100,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.headlineGradientPanXPercent,
    ),
    headlineGradientPanYPercent: clampRange(
      base.headlineGradientPanYPercent,
      0,
      100,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.headlineGradientPanYPercent,
    ),
    headlineFillMode: base.headlineFillMode === 'solid' ? 'solid' : 'surface',
    headlineShadowEnabled: base.headlineShadowEnabled === true,
    headlineShadowElevatedEnabled: base.headlineShadowElevatedEnabled === true,
    headlineShadowScale: clampRange(
      base.headlineShadowScale, 0.1, 1.5, DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.headlineShadowScale,
    ),
    headlineFontSizeNarrow: token(
      base.headlineFontSizeNarrow,
      HEADLINE_FONT_SIZE_NARROW,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.headlineFontSizeNarrow,
    ),
    headlineFontSizeMid: token(
      base.headlineFontSizeMid,
      HEADLINE_FONT_SIZE_MID,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.headlineFontSizeMid,
    ),
    headlineFontSizeWide: token(
      base.headlineFontSizeWide,
      HEADLINE_FONT_SIZE_WIDE,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.headlineFontSizeWide,
    ),
    headlineFontFamily: token(
      base.headlineFontFamily,
      FONT_FAMILIES,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.headlineFontFamily,
    ),
    headlineMatchesBodySize: base.headlineMatchesBodySize === true,
    headlineMaxWidth: token(
      base.headlineMaxWidth,
      HEADLINE_MAX_WIDTHS,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.headlineMaxWidth,
    ),
    bodyFontSizeNarrow: token(
      base.bodyFontSizeNarrow,
      BODY_FONT_SIZE_NARROW,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.bodyFontSizeNarrow,
    ),
    bodyFontSizeMid: token(
      base.bodyFontSizeMid,
      BODY_FONT_SIZE_MID,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.bodyFontSizeMid,
    ),
    bodyFontSizeWide: token(
      base.bodyFontSizeWide,
      BODY_FONT_SIZE_WIDE,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.bodyFontSizeWide,
    ),
    paragraphMaxWidth: token(
      base.paragraphMaxWidth,
      PARAGRAPH_MAX_WIDTHS,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.paragraphMaxWidth,
    ),
    leadGap: token(
      base.leadGap,
      LEAD_GAP_VALUES,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.leadGap,
    ),
    leadGapWide: token(
      base.leadGapWide,
      LEAD_GAP_WIDE_VALUES,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.leadGapWide,
    ),
    leadGapLg: token(
      base.leadGapLg,
      LEAD_GAP_LG_VALUES,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.leadGapLg,
    ),
    copyLineHeight: clampRange(
      base.copyLineHeight,
      1.25,
      1.7,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.copyLineHeight,
    ),
    copyLetterSpacingEm: clampRange(
      base.copyLetterSpacingEm,
      -0.03,
      0.02,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.copyLetterSpacingEm,
    ),
    // Floor of 0.5 is an explicit operator override of the previous 0.88
    // (the lowest value that held the locked 4.5:1 body-contrast floor
    // against this hero's own copyColor/surface pairing) — see the type's
    // own doc comment. Below 0.88, contrast drops under 4.5:1 deliberately.
    emphasisDimOpacity: clampRange(
      base.emphasisDimOpacity,
      0.5,
      1,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.emphasisDimOpacity,
    ),
    emphasisWordOpacity: clampRange(
      base.emphasisWordOpacity,
      0.88,
      1,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.emphasisWordOpacity,
    ),
    emphasisFontWeight: token(
      base.emphasisFontWeight,
      EMPHASIS_FONT_WEIGHTS,
      DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG.emphasisFontWeight,
    ),
    composerVisible: base.composerVisible !== false,
  };
}
