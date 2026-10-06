import { colord, extend } from 'colord'
import mixPlugin from 'colord/plugins/mix'
import { resolveContrastAwareTextColor, deriveSurfaceColor } from '../../../helpers/surfaceColorDerivation'
import type { TailwindTokenValue } from '../../Panel/config/tailwindFields'
import type { ChipAppearanceConfig } from './appearance'

extend([mixPlugin])

export type ResolvedChipColors = {
  /** Unselected look. */
  backgroundColor: string
  borderColor: string
  textColor: string
  /** Selected look. Legacy modes auto-pick text and match border to fill. */
  fillBackgroundColor: string
  fillTextColor: string
  fillBorderColor: string
}

export type ResolvedChipAppearance = {
  idle: ResolvedChipColors
  hover: ResolvedChipColors
  press: ResolvedChipColors
  borderWidthClassName: TailwindTokenValue<'borderWidth'>
  borderOpacity: number
  paddingXClassName: TailwindTokenValue<'paddingX'>
  paddingYClassName: TailwindTokenValue<'paddingY'>
  textTrackingClassName: TailwindTokenValue<'letterSpacing'>
  /** The unselected look's own opacity (see `ChipAppearanceConfig.inactiveOpacity`'s
   * own doc comment — the selected/filled look is always full opacity). */
  inactiveOpacity: number
}

/**
 * Same grayscale → contrast-side pick → bounded-chroma-reintroduction
 * algorithm as `resolveGradientColumnTypography`
 * (experiences/abstract/components/PolymorphicLayout.narrowColumnTypography.ts),
 * which backs `AbstractTimelineLinkColorConfig`'s own `deriveFromGradient`
 * mode — reimplemented against the lower-level primitives it itself calls
 * (`resolveContrastAwareTextColor`, colord) rather than calling that
 * function directly, since its own return shape (title/body/highlight
 * opacity roles) and its `GlobalTypographyConfig` dependency are built for
 * a page's column typography, not a standalone chip. `darkInkOpacityMultiplier`
 * is applied as a direct alpha on the returned ink (a chip has no existing
 * "role opacity" baseline to multiply, unlike a column's bodyOpacity).
 */
function deriveChipInk(backgroundColor: string, config: ChipAppearanceConfig): string {
  const grayBackground = colord(backgroundColor).grayscale().toHex()
  const neutralInk = colord(
    resolveContrastAwareTextColor(grayBackground, config.minContrastRatio, 0, {
      stable: true,
      toleranceRatio: config.lightInkTolerance,
      targetOpacity: 1,
      preferredSide: 'light',
    }),
  ).grayscale()

  const saturation = Math.min(2, Math.max(0, config.darkInkSaturation))
  const ink = saturation === 0
    ? neutralInk
    : (() => {
      const neutralHsl = neutralInk.toHsl()
      const backgroundHsl = colord(backgroundColor).toHsl()
      const chromaticInk = colord({
        h: backgroundHsl.h,
        s: Math.min(100, backgroundHsl.s * (1 + saturation * 4)),
        l: Math.max(6, neutralHsl.l),
      })
      return neutralInk.mix(chromaticInk, Math.min(1, saturation))
    })()

  const opacity = Math.min(1, Math.max(0.2, config.darkInkOpacityMultiplier))
  return ink.alpha(opacity).toRgbString()
}

/** Auto-picked filled text for the legacy manual and derived modes. */
function deriveFillTextColor(fillBackgroundColor: string, config: ChipAppearanceConfig): string {
  return resolveContrastAwareTextColor(fillBackgroundColor, config.minContrastRatio, 0, {
    stable: true,
    toleranceRatio: config.lightInkTolerance,
    targetOpacity: 1,
    preferredSide: 'light',
  })
}

function resolveColorsForState(
  inkColor: string,
  fillBackgroundColor: string,
  config: ChipAppearanceConfig,
): ResolvedChipColors {
  return {
    backgroundColor: 'transparent',
    borderColor: inkColor,
    textColor: inkColor,
    fillBackgroundColor,
    fillTextColor: deriveFillTextColor(fillBackgroundColor, config),
    fillBorderColor: fillBackgroundColor,
  }
}

export function resolveChipAppearance(
  config: ChipAppearanceConfig,
  backgroundReferenceColor: string,
): ResolvedChipAppearance {
  if (config.colorMode === 'custom') {
    const state = (prefix: 'idle' | 'hover' | 'press'): ResolvedChipColors => ({
      backgroundColor: config[`${prefix}UnselectedBackgroundColor`],
      borderColor: config[`${prefix}UnselectedBorderColor`],
      textColor: config[`${prefix}UnselectedTextColor`],
      fillBackgroundColor: config[`${prefix}SelectedBackgroundColor`],
      fillTextColor: config[`${prefix}SelectedTextColor`],
      fillBorderColor: config[`${prefix}SelectedBorderColor`],
    })
    return {
      idle: state('idle'),
      hover: state('hover'),
      press: state('press'),
      borderWidthClassName: config.borderWidth,
      borderOpacity: config.borderOpacity,
      paddingXClassName: config.paddingX,
      paddingYClassName: config.paddingY,
      textTrackingClassName: config.textTracking,
      inactiveOpacity: config.inactiveOpacity,
    }
  }
  const ink = config.colorMode === 'manual' ? config.inkColor : deriveChipInk(backgroundReferenceColor, config)
  const fillBackground = config.colorMode === 'manual'
    ? config.backgroundColor
    : deriveSurfaceColor(backgroundReferenceColor, config.activeSurfaceOffset)

  const idle = resolveColorsForState(ink, fillBackground, config)
  const hover = resolveColorsForState(
    deriveSurfaceColor(ink, config.hoverSurfaceOffset),
    deriveSurfaceColor(fillBackground, config.hoverSurfaceOffset),
    config,
  )
  const press = resolveColorsForState(
    deriveSurfaceColor(ink, config.pressSurfaceOffset),
    deriveSurfaceColor(fillBackground, config.pressSurfaceOffset),
    config,
  )

  return {
    idle,
    hover,
    press,
    borderWidthClassName: config.borderWidth,
    borderOpacity: config.borderOpacity,
    paddingXClassName: config.paddingX,
    paddingYClassName: config.paddingY,
    textTrackingClassName: config.textTracking,
    inactiveOpacity: config.inactiveOpacity,
  }
}
