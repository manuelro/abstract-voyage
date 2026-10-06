import { normalizeTailwindToken, type TailwindTokenValue } from '../Panel/config/tailwindFields'

// Same 'manual' | 'deriveFromBackground' split components/Chip/config/
// appearance.ts's own ChipColorMode established — 'deriveFromBackground'
// (default, unchanged behavior) resolves the track/dot color from the real
// background via resolveGradientColumnTypography, the same shared primitive
// /abstract's own narrow/wide column text uses; 'manual' is the literal-
// color escape hatch Chip has and this component previously didn't.
export type ChronologyColorMode = 'manual' | 'deriveFromBackground'

export type ChronologyTimelineConfig = {
  enabled: boolean
  showMonths: boolean
  monthNameFormat: 'full' | 'short'
  monthNameFormatMd: 'full' | 'short'
  monthNameFormatLg: 'full' | 'short'
  yearPlacement: 'outward' | 'inward'
  yearPlacementMd: 'outward' | 'inward'
  yearPlacementLg: 'outward' | 'inward'
  monthPlacement: 'outward' | 'inward'
  monthPlacementMd: 'outward' | 'inward'
  monthPlacementLg: 'outward' | 'inward'
  yearColorMode: ChronologyColorMode
  monthColorMode: ChronologyColorMode
  /** Manual mode's literal track/dot color — year and month paint
   * independently (same split every other year/month ink field already
   * has), the rail itself always takes whichever kind is actually
   * rendered along it (see ChronologyTimeline.tsx's own railInk). */
  yearManualColor: string
  monthManualColor: string
  yearDarkInkSaturation: number
  monthDarkInkSaturation: number
  yearDarkInkOpacityMultiplier: number
  monthDarkInkOpacityMultiplier: number
  yearLightInkTolerance: number
  monthLightInkTolerance: number
  /** deriveFromBackground mode only — the WCAG ratio the derived track/dot
   * color is resolved for. Same role `ChipAppearanceConfig.minContrastRatio`
   * has; previously hardcoded to 4.5 inside resolveChronologyInk. */
  yearMinContrastRatio: number
  monthMinContrastRatio: number
  yearPaddingX: TailwindTokenValue<'paddingX'>
  yearPaddingXMd: TailwindTokenValue<'paddingX', 'md'>
  yearPaddingXLg: TailwindTokenValue<'paddingX', 'lg'>
  yearPaddingY: TailwindTokenValue<'paddingY'>
  yearPaddingYMd: TailwindTokenValue<'paddingY', 'md'>
  yearPaddingYLg: TailwindTokenValue<'paddingY', 'lg'>
  // Bug fix (operator-reported, 2026-10-04): the month label's own rail-edge
  // gap (the space between the dot and the label text when inward) lived on
  // this pair — removing it in favor of monthPaddingTop/Right/Bottom/Left
  // below (the article-group fields) silently dropped that gap. Restored,
  // same shape and same toRailEdgePaddingX auto-flip-by-placement mechanism
  // as yearPaddingX/yearPaddingY (ChronologyTimeline.tsx), applied to the
  // month label itself.
  monthPaddingX: TailwindTokenValue<'paddingX'>
  monthPaddingXMd: TailwindTokenValue<'paddingX', 'md'>
  monthPaddingXLg: TailwindTokenValue<'paddingX', 'lg'>
  monthPaddingY: TailwindTokenValue<'paddingY'>
  monthPaddingYMd: TailwindTokenValue<'paddingY', 'md'>
  monthPaddingYLg: TailwindTokenValue<'paddingY', 'lg'>
  // Operator ask (2026-10-04): full, independent box-model control for the
  // padding around the group of articles rendered under each month (the
  // `data-chronology-items` container in ChronologyTimeline.tsx), additive
  // to monthPaddingX/-Y above (the label's own padding) — not a replacement
  // for it.
  monthPaddingTop: TailwindTokenValue<'paddingTop'>
  monthPaddingTopMd: TailwindTokenValue<'paddingTop', 'md'>
  monthPaddingTopLg: TailwindTokenValue<'paddingTop', 'lg'>
  monthPaddingRight: TailwindTokenValue<'paddingRight'>
  monthPaddingRightMd: TailwindTokenValue<'paddingRight', 'md'>
  monthPaddingRightLg: TailwindTokenValue<'paddingRight', 'lg'>
  monthPaddingBottom: TailwindTokenValue<'paddingBottom'>
  monthPaddingBottomMd: TailwindTokenValue<'paddingBottom', 'md'>
  monthPaddingBottomLg: TailwindTokenValue<'paddingBottom', 'lg'>
  monthPaddingLeft: TailwindTokenValue<'paddingLeft'>
  monthPaddingLeftMd: TailwindTokenValue<'paddingLeft', 'md'>
  monthPaddingLeftLg: TailwindTokenValue<'paddingLeft', 'lg'>
  yearFontSize: TailwindTokenValue<'fontSize'>
  yearFontSizeMd: TailwindTokenValue<'fontSize', 'md'>
  yearFontSizeLg: TailwindTokenValue<'fontSize', 'lg'>
  monthFontSize: TailwindTokenValue<'fontSize'>
  monthFontSizeMd: TailwindTokenValue<'fontSize', 'md'>
  monthFontSizeLg: TailwindTokenValue<'fontSize', 'lg'>
  yearFontFamily: TailwindTokenValue<'fontFamily'>
  monthFontFamily: TailwindTokenValue<'fontFamily'>
  yearFontWeight: TailwindTokenValue<'fontWeight'>
  monthFontWeight: TailwindTokenValue<'fontWeight'>
  yearDotSize: number
  monthDotSize: number
  contentGap: number
  contentGapMd: number
  contentGapLg: number
  trackWidth: number
  trackWidthMd: number
  trackWidthLg: number
  trackOpacity: number
  trackOpacityMd: number
  trackOpacityLg: number
  yearHoverFadeEnabled: boolean
  yearHoverFadeTouchEnabled: boolean
  yearHoverFadeOpacity: number
  yearHoverFadeDotOpacity: number
  yearHoverFadeDurationMs: number
  yearHoverFadeDelayMs: number
  yearHoverFadeEasing: ChronologyYearHoverFadeEasing
  /** Operator ask (2026-10-04): pin the year's own dot+label at a fixed
   * vertical position while its months scroll past beneath it, releasing the
   * instant its own section ends so the next year takes its place — CSS
   * `position: sticky`, scoped to the tablet/desktop media queries in
   * ChronologyTimeline.module.css only (mobile keeps the year in normal
   * flow; narrower screens don't have the vertical room to spare). */
  yearStickyEnabled: boolean
}

export type ChronologyYearHoverFadeEasing = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'

export const DEFAULT_CHRONOLOGY_TIMELINE_CONFIG: ChronologyTimelineConfig = {
  enabled: false,
  showMonths: false,
  monthNameFormat: 'full',
  monthNameFormatMd: 'full',
  monthNameFormatLg: 'full',
  yearPlacement: 'outward',
  yearPlacementMd: 'outward',
  yearPlacementLg: 'outward',
  monthPlacement: 'outward',
  monthPlacementMd: 'outward',
  monthPlacementLg: 'outward',
  yearColorMode: 'deriveFromBackground',
  monthColorMode: 'deriveFromBackground',
  yearManualColor: '#111827',
  monthManualColor: '#111827',
  yearDarkInkSaturation: 0,
  monthDarkInkSaturation: 0.55,
  yearDarkInkOpacityMultiplier: 1,
  monthDarkInkOpacityMultiplier: 1,
  yearLightInkTolerance: 0,
  monthLightInkTolerance: 0,
  yearMinContrastRatio: 4.5,
  monthMinContrastRatio: 4.5,
  yearPaddingX: 'px-0',
  yearPaddingXMd: 'md:px-0',
  yearPaddingXLg: 'lg:px-0',
  yearPaddingY: 'py-0',
  yearPaddingYMd: 'md:py-0',
  yearPaddingYLg: 'lg:py-0',
  monthPaddingX: 'px-0',
  monthPaddingXMd: 'md:px-0',
  monthPaddingXLg: 'lg:px-0',
  monthPaddingY: 'py-0',
  monthPaddingYMd: 'md:py-0',
  monthPaddingYLg: 'lg:py-0',
  monthPaddingTop: 'pt-0',
  monthPaddingTopMd: 'md:pt-0',
  monthPaddingTopLg: 'lg:pt-0',
  monthPaddingRight: 'pr-0',
  monthPaddingRightMd: 'md:pr-0',
  monthPaddingRightLg: 'lg:pr-0',
  monthPaddingBottom: 'pb-0',
  monthPaddingBottomMd: 'md:pb-0',
  monthPaddingBottomLg: 'lg:pb-0',
  monthPaddingLeft: 'pl-0',
  monthPaddingLeftMd: 'md:pl-0',
  monthPaddingLeftLg: 'lg:pl-0',
  yearFontSize: 'text-lg',
  yearFontSizeMd: 'md:text-lg',
  yearFontSizeLg: 'lg:text-lg',
  monthFontSize: 'text-xs',
  monthFontSizeMd: 'md:text-xs',
  monthFontSizeLg: 'lg:text-xs',
  yearFontFamily: 'font-serif',
  monthFontFamily: 'font-serif',
  yearFontWeight: 'font-semibold',
  monthFontWeight: 'font-medium',
  yearDotSize: 10,
  monthDotSize: 6,
  contentGap: 6.5,
  contentGapMd: 9,
  contentGapLg: 9,
  trackWidth: 1,
  trackWidthMd: 1,
  trackWidthLg: 1,
  trackOpacity: 1,
  trackOpacityMd: 1,
  trackOpacityLg: 1,
  yearHoverFadeEnabled: true,
  // Opt-in, not on: the scroll-driven approximation of hover on touch
  // devices (operator-reported) didn't work well. Hover on fine-pointer
  // devices is unaffected either way — see useChronologyYearHoverFade's own
  // doc comment.
  yearHoverFadeTouchEnabled: false,
  yearHoverFadeOpacity: 0.35,
  yearHoverFadeDotOpacity: 0.35,
  yearHoverFadeDurationMs: 320,
  yearHoverFadeDelayMs: 120,
  yearHoverFadeEasing: 'ease-out',
  yearStickyEnabled: true,
}

const CHRONOLOGY_YEAR_HOVER_FADE_EASINGS: readonly ChronologyYearHoverFadeEasing[] = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']

export function normalizeChronologyTimelineConfig(config: Partial<ChronologyTimelineConfig> | undefined): ChronologyTimelineConfig {
  const defaults = DEFAULT_CHRONOLOGY_TIMELINE_CONFIG
  return {
    enabled: config?.enabled === true,
    showMonths: config?.showMonths === true,
    monthNameFormat: config?.monthNameFormat === 'short' ? 'short' : 'full',
    monthNameFormatMd: config?.monthNameFormatMd === 'short' ? 'short' : 'full',
    monthNameFormatLg: config?.monthNameFormatLg === 'short' ? 'short' : 'full',
    yearPlacement: config?.yearPlacement === 'inward' ? 'inward' : 'outward',
    yearPlacementMd: config?.yearPlacementMd === 'inward' ? 'inward' : 'outward',
    yearPlacementLg: config?.yearPlacementLg === 'inward' ? 'inward' : 'outward',
    monthPlacement: config?.monthPlacement === 'inward' ? 'inward' : 'outward',
    monthPlacementMd: config?.monthPlacementMd === 'inward' ? 'inward' : 'outward',
    monthPlacementLg: config?.monthPlacementLg === 'inward' ? 'inward' : 'outward',
    yearColorMode: config?.yearColorMode === 'manual' ? 'manual' : 'deriveFromBackground',
    monthColorMode: config?.monthColorMode === 'manual' ? 'manual' : 'deriveFromBackground',
    yearManualColor: typeof config?.yearManualColor === 'string' && config.yearManualColor.trim()
      ? config.yearManualColor : defaults.yearManualColor,
    monthManualColor: typeof config?.monthManualColor === 'string' && config.monthManualColor.trim()
      ? config.monthManualColor : defaults.monthManualColor,
    yearDarkInkSaturation: clamp(config?.yearDarkInkSaturation, 0, 2, defaults.yearDarkInkSaturation),
    monthDarkInkSaturation: clamp(config?.monthDarkInkSaturation, 0, 2, defaults.monthDarkInkSaturation),
    yearDarkInkOpacityMultiplier: clamp(config?.yearDarkInkOpacityMultiplier, 0.2, 1, defaults.yearDarkInkOpacityMultiplier),
    monthDarkInkOpacityMultiplier: clamp(config?.monthDarkInkOpacityMultiplier, 0.2, 1, defaults.monthDarkInkOpacityMultiplier),
    yearLightInkTolerance: clamp(config?.yearLightInkTolerance, 0, 20, defaults.yearLightInkTolerance),
    monthLightInkTolerance: clamp(config?.monthLightInkTolerance, 0, 20, defaults.monthLightInkTolerance),
    yearMinContrastRatio: clamp(config?.yearMinContrastRatio, 1, 21, defaults.yearMinContrastRatio),
    monthMinContrastRatio: clamp(config?.monthMinContrastRatio, 1, 21, defaults.monthMinContrastRatio),
    yearPaddingX: normalizeTailwindToken({ utility: 'paddingX', breakpoint: 'base', value: config?.yearPaddingX, fallback: defaults.yearPaddingX }),
    yearPaddingXMd: normalizeTailwindToken({ utility: 'paddingX', breakpoint: 'md', value: config?.yearPaddingXMd, fallback: defaults.yearPaddingXMd }),
    yearPaddingXLg: normalizeTailwindToken({ utility: 'paddingX', breakpoint: 'lg', value: config?.yearPaddingXLg, fallback: defaults.yearPaddingXLg }),
    yearPaddingY: normalizeTailwindToken({ utility: 'paddingY', breakpoint: 'base', value: config?.yearPaddingY, fallback: defaults.yearPaddingY }),
    yearPaddingYMd: normalizeTailwindToken({ utility: 'paddingY', breakpoint: 'md', value: config?.yearPaddingYMd, fallback: defaults.yearPaddingYMd }),
    yearPaddingYLg: normalizeTailwindToken({ utility: 'paddingY', breakpoint: 'lg', value: config?.yearPaddingYLg, fallback: defaults.yearPaddingYLg }),
    monthPaddingX: normalizeTailwindToken({ utility: 'paddingX', breakpoint: 'base', value: config?.monthPaddingX, fallback: defaults.monthPaddingX }),
    monthPaddingXMd: normalizeTailwindToken({ utility: 'paddingX', breakpoint: 'md', value: config?.monthPaddingXMd, fallback: defaults.monthPaddingXMd }),
    monthPaddingXLg: normalizeTailwindToken({ utility: 'paddingX', breakpoint: 'lg', value: config?.monthPaddingXLg, fallback: defaults.monthPaddingXLg }),
    monthPaddingY: normalizeTailwindToken({ utility: 'paddingY', breakpoint: 'base', value: config?.monthPaddingY, fallback: defaults.monthPaddingY }),
    monthPaddingYMd: normalizeTailwindToken({ utility: 'paddingY', breakpoint: 'md', value: config?.monthPaddingYMd, fallback: defaults.monthPaddingYMd }),
    monthPaddingYLg: normalizeTailwindToken({ utility: 'paddingY', breakpoint: 'lg', value: config?.monthPaddingYLg, fallback: defaults.monthPaddingYLg }),
    monthPaddingTop: normalizeTailwindToken({ utility: 'paddingTop', breakpoint: 'base', value: config?.monthPaddingTop, fallback: defaults.monthPaddingTop }),
    monthPaddingTopMd: normalizeTailwindToken({ utility: 'paddingTop', breakpoint: 'md', value: config?.monthPaddingTopMd, fallback: defaults.monthPaddingTopMd }),
    monthPaddingTopLg: normalizeTailwindToken({ utility: 'paddingTop', breakpoint: 'lg', value: config?.monthPaddingTopLg, fallback: defaults.monthPaddingTopLg }),
    monthPaddingRight: normalizeTailwindToken({ utility: 'paddingRight', breakpoint: 'base', value: config?.monthPaddingRight, fallback: defaults.monthPaddingRight }),
    monthPaddingRightMd: normalizeTailwindToken({ utility: 'paddingRight', breakpoint: 'md', value: config?.monthPaddingRightMd, fallback: defaults.monthPaddingRightMd }),
    monthPaddingRightLg: normalizeTailwindToken({ utility: 'paddingRight', breakpoint: 'lg', value: config?.monthPaddingRightLg, fallback: defaults.monthPaddingRightLg }),
    monthPaddingBottom: normalizeTailwindToken({ utility: 'paddingBottom', breakpoint: 'base', value: config?.monthPaddingBottom, fallback: defaults.monthPaddingBottom }),
    monthPaddingBottomMd: normalizeTailwindToken({ utility: 'paddingBottom', breakpoint: 'md', value: config?.monthPaddingBottomMd, fallback: defaults.monthPaddingBottomMd }),
    monthPaddingBottomLg: normalizeTailwindToken({ utility: 'paddingBottom', breakpoint: 'lg', value: config?.monthPaddingBottomLg, fallback: defaults.monthPaddingBottomLg }),
    monthPaddingLeft: normalizeTailwindToken({ utility: 'paddingLeft', breakpoint: 'base', value: config?.monthPaddingLeft, fallback: defaults.monthPaddingLeft }),
    monthPaddingLeftMd: normalizeTailwindToken({ utility: 'paddingLeft', breakpoint: 'md', value: config?.monthPaddingLeftMd, fallback: defaults.monthPaddingLeftMd }),
    monthPaddingLeftLg: normalizeTailwindToken({ utility: 'paddingLeft', breakpoint: 'lg', value: config?.monthPaddingLeftLg, fallback: defaults.monthPaddingLeftLg }),
    yearFontSize: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'base', value: config?.yearFontSize, fallback: defaults.yearFontSize }),
    yearFontSizeMd: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'md', value: config?.yearFontSizeMd, fallback: defaults.yearFontSizeMd }),
    yearFontSizeLg: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'lg', value: config?.yearFontSizeLg, fallback: defaults.yearFontSizeLg }),
    monthFontSize: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'base', value: config?.monthFontSize, fallback: defaults.monthFontSize }),
    monthFontSizeMd: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'md', value: config?.monthFontSizeMd, fallback: defaults.monthFontSizeMd }),
    monthFontSizeLg: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'lg', value: config?.monthFontSizeLg, fallback: defaults.monthFontSizeLg }),
    yearFontFamily: normalizeTailwindToken({ utility: 'fontFamily', breakpoint: 'base', value: config?.yearFontFamily, fallback: defaults.yearFontFamily }),
    monthFontFamily: normalizeTailwindToken({ utility: 'fontFamily', breakpoint: 'base', value: config?.monthFontFamily, fallback: defaults.monthFontFamily }),
    yearFontWeight: normalizeTailwindToken({ utility: 'fontWeight', breakpoint: 'base', value: config?.yearFontWeight, fallback: defaults.yearFontWeight }),
    monthFontWeight: normalizeTailwindToken({ utility: 'fontWeight', breakpoint: 'base', value: config?.monthFontWeight, fallback: defaults.monthFontWeight }),
    yearDotSize: typeof config?.yearDotSize === 'number' && Number.isFinite(config.yearDotSize)
      ? Math.max(4, Math.min(24, config.yearDotSize)) : defaults.yearDotSize,
    monthDotSize: typeof config?.monthDotSize === 'number' && Number.isFinite(config.monthDotSize)
      ? Math.max(3, Math.min(18, config.monthDotSize)) : defaults.monthDotSize,
    contentGap: clamp(config?.contentGap, 2, 20, defaults.contentGap),
    contentGapMd: clamp(config?.contentGapMd, 2, 24, defaults.contentGapMd),
    contentGapLg: clamp(config?.contentGapLg, 2, 24, defaults.contentGapLg),
    trackWidth: clamp(config?.trackWidth, 0.25, 8, defaults.trackWidth),
    trackWidthMd: clamp(config?.trackWidthMd, 0.25, 8, defaults.trackWidthMd),
    trackWidthLg: clamp(config?.trackWidthLg, 0.25, 8, defaults.trackWidthLg),
    trackOpacity: clamp(config?.trackOpacity, 0, 1, defaults.trackOpacity),
    trackOpacityMd: clamp(config?.trackOpacityMd, 0, 1, defaults.trackOpacityMd),
    trackOpacityLg: clamp(config?.trackOpacityLg, 0, 1, defaults.trackOpacityLg),
    yearHoverFadeEnabled: config?.yearHoverFadeEnabled !== false,
    yearHoverFadeTouchEnabled: config?.yearHoverFadeTouchEnabled === true,
    yearHoverFadeOpacity: clamp(config?.yearHoverFadeOpacity, 0.1, 1, defaults.yearHoverFadeOpacity),
    yearHoverFadeDotOpacity: clamp(config?.yearHoverFadeDotOpacity, 0.1, 1, defaults.yearHoverFadeDotOpacity),
    yearHoverFadeDurationMs: clamp(config?.yearHoverFadeDurationMs, 0, 2000, defaults.yearHoverFadeDurationMs),
    yearHoverFadeDelayMs: clamp(config?.yearHoverFadeDelayMs, 0, 1000, defaults.yearHoverFadeDelayMs),
    yearHoverFadeEasing: CHRONOLOGY_YEAR_HOVER_FADE_EASINGS.includes(config?.yearHoverFadeEasing as ChronologyYearHoverFadeEasing)
      ? (config!.yearHoverFadeEasing as ChronologyYearHoverFadeEasing) : defaults.yearHoverFadeEasing,
    yearStickyEnabled: config?.yearStickyEnabled !== false,
  }
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback
}
