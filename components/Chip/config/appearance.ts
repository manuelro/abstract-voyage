import { normalizeTailwindToken, type TailwindTokenValue } from '../../Panel/config/tailwindFields'

/**
 * 'manual' (default): `inkColor`/`backgroundColor` below are literal,
 * author-picked colors. 'deriveFromBackground': the same dark-ink-saturation/
 * opacity/light-tolerance modulation `AbstractTimelineLinkColorConfig`'s own
 * `colorMode: 'deriveFromGradient'` uses (pages/abstract.config.ts), resolved
 * against a caller-supplied background reference instead of a page's own
 * scroll gradient — see `resolveChipAppearance.ts`'s own doc comment for why
 * the lower-level shared primitives (`resolveContrastAwareTextColor`,
 * `deriveSurfaceColor`) are reused directly rather than
 * `resolveGradientColumnTypography` itself, which is shaped for column
 * title/body/highlight roles a chip doesn't have. Either mode's own filled
 * look auto-picks its own text color. 'custom' lets each visual role be
 * authored for the selected and unselected looks in all three states.
 */
export type ChipColorMode = 'manual' | 'deriveFromBackground' | 'custom'

export type ChipCustomColors = {
  idleUnselectedTextColor: string
  idleUnselectedBackgroundColor: string
  idleUnselectedBorderColor: string
  idleSelectedTextColor: string
  idleSelectedBackgroundColor: string
  idleSelectedBorderColor: string
  hoverUnselectedTextColor: string
  hoverUnselectedBackgroundColor: string
  hoverUnselectedBorderColor: string
  hoverSelectedTextColor: string
  hoverSelectedBackgroundColor: string
  hoverSelectedBorderColor: string
  pressUnselectedTextColor: string
  pressUnselectedBackgroundColor: string
  pressUnselectedBorderColor: string
  pressSelectedTextColor: string
  pressSelectedBackgroundColor: string
  pressSelectedBorderColor: string
}

export type ChipAppearanceConfig = ChipCustomColors & {
  colorMode: ChipColorMode
  /** Manual mode's single ink — drives the unselected/border look's own
   * border AND text color (explicitly the same color, not two). */
  inkColor: string
  /** Manual mode's selected/filled look background. In manual and derived
   * modes, text is resolved against the fill for contrast. */
  backgroundColor: string
  /** deriveFromBackground mode — same three modulation knobs as
   * `AbstractTimelineLinkColorConfig`'s own darkInkSaturation /
   * darkInkOpacityMultiplier / lightInkTolerance (pages/abstract.config.ts). */
  darkInkSaturation: number
  darkInkOpacityMultiplier: number
  /** Dual-purpose: (1) deriveFromBackground mode's own light-candidate
   * tolerance for the unselected ink (as above), and (2) both modes' shared
   * tolerance for the filled look's own auto-picked text color — one field,
   * two consumers of the same `resolveContrastAwareTextColor` primitive. */
  lightInkTolerance: number
  /** The WCAG ratio the filled look's own auto-picked text color is
   * resolved for, in both color modes — this component's own standalone
   * generic default; a page with its own shared typography config (e.g.
   * `/journal`'s `GlobalTypographyConfig`) should prefer that live value
   * over this field instead of duplicating it here. */
  minContrastRatio: number
  /** deriveFromBackground mode only — mirrors
   * `AbstractTimelineLinkColorConfig.activeSurfaceOffsetMd/-Lg`: shifts the
   * background reference lighter/darker for the selected/filled look before
   * re-deriving its own ink, the same "offset then re-resolve" relationship
   * that config already has to its own active state. */
  activeSurfaceOffset: number
  /** Both modes — lightens/darkens whichever color currently carries a
   * look's visual weight (the fill background when selected, the ink when
   * unselected) on hover. Same `-1..1` `deriveSurfaceColor` convention as
   * `activeSurfaceOffset`, applied as a sibling state rather than a
   * variant of it. */
  hoverSurfaceOffset: number
  /** Same as `hoverSurfaceOffset`, for the pressed (CSS `:active`) state. */
  pressSurfaceOffset: number
  borderWidth: TailwindTokenValue<'borderWidth'>
  /** Border alpha in both selected and unselected looks, independent of
   * the chip's text and overall unselected opacity. */
  borderOpacity: number
  /** Horizontal/vertical padding — both color modes, applied by Chip.tsx
   * itself (not the caller's own className) whenever `appearance` is
   * supplied, so a page never duplicates these alongside this config. */
  paddingX: TailwindTokenValue<'paddingX'>
  paddingY: TailwindTokenValue<'paddingY'>
  textTracking: TailwindTokenValue<'letterSpacing'>
  /** The unselected look's own opacity — the selected/filled look always
   * renders at full opacity (1), matching the "selected is the prominent
   * state" relationship the fill-vs-border look already carries. */
  inactiveOpacity: number
}

export const DEFAULT_CHIP_APPEARANCE_CONFIG: ChipAppearanceConfig = {
  colorMode: 'manual',
  inkColor: '#ffffff',
  backgroundColor: '#ffffff',
  idleUnselectedTextColor: '#334155',
  idleUnselectedBackgroundColor: '#ffffff',
  idleUnselectedBorderColor: '#334155',
  idleSelectedTextColor: '#ffffff',
  idleSelectedBackgroundColor: '#28406c',
  idleSelectedBorderColor: '#28406c',
  hoverUnselectedTextColor: '#1e293b',
  hoverUnselectedBackgroundColor: '#ffffff',
  hoverUnselectedBorderColor: '#1e293b',
  hoverSelectedTextColor: '#ffffff',
  hoverSelectedBackgroundColor: '#1d3359',
  hoverSelectedBorderColor: '#1d3359',
  pressUnselectedTextColor: '#0f172a',
  pressUnselectedBackgroundColor: '#ffffff',
  pressUnselectedBorderColor: '#0f172a',
  pressSelectedTextColor: '#ffffff',
  pressSelectedBackgroundColor: '#152745',
  pressSelectedBorderColor: '#152745',
  darkInkSaturation: 1,
  darkInkOpacityMultiplier: 1,
  lightInkTolerance: 0.4,
  minContrastRatio: 4.5,
  activeSurfaceOffset: 0.3,
  hoverSurfaceOffset: 0.08,
  pressSurfaceOffset: -0.08,
  borderWidth: 'border',
  borderOpacity: 1,
  paddingX: 'px-2',
  paddingY: 'py-0.5',
  textTracking: 'tracking-wide',
  inactiveOpacity: 0.7,
}

const CHIP_COLOR_MODES: ReadonlyArray<ChipColorMode> = ['manual', 'deriveFromBackground', 'custom']

const clampRange = (value: unknown, min: number, max: number, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
)

const nonEmptyText = (value: unknown, fallback: string): string => (
  typeof value === 'string' && value.trim() ? value : fallback
)

export function normalizeChipAppearanceConfig(
  config: Partial<ChipAppearanceConfig> | undefined,
): ChipAppearanceConfig {
  const D = DEFAULT_CHIP_APPEARANCE_CONFIG
  return {
    colorMode: CHIP_COLOR_MODES.includes(config?.colorMode as ChipColorMode) ? config!.colorMode! : D.colorMode,
    inkColor: nonEmptyText(config?.inkColor, D.inkColor),
    backgroundColor: nonEmptyText(config?.backgroundColor, D.backgroundColor),
    idleUnselectedTextColor: nonEmptyText(config?.idleUnselectedTextColor, D.idleUnselectedTextColor),
    idleUnselectedBackgroundColor: nonEmptyText(config?.idleUnselectedBackgroundColor, D.idleUnselectedBackgroundColor),
    idleUnselectedBorderColor: nonEmptyText(config?.idleUnselectedBorderColor, D.idleUnselectedBorderColor),
    idleSelectedTextColor: nonEmptyText(config?.idleSelectedTextColor, D.idleSelectedTextColor),
    idleSelectedBackgroundColor: nonEmptyText(config?.idleSelectedBackgroundColor, D.idleSelectedBackgroundColor),
    idleSelectedBorderColor: nonEmptyText(config?.idleSelectedBorderColor, D.idleSelectedBorderColor),
    hoverUnselectedTextColor: nonEmptyText(config?.hoverUnselectedTextColor, D.hoverUnselectedTextColor),
    hoverUnselectedBackgroundColor: nonEmptyText(config?.hoverUnselectedBackgroundColor, D.hoverUnselectedBackgroundColor),
    hoverUnselectedBorderColor: nonEmptyText(config?.hoverUnselectedBorderColor, D.hoverUnselectedBorderColor),
    hoverSelectedTextColor: nonEmptyText(config?.hoverSelectedTextColor, D.hoverSelectedTextColor),
    hoverSelectedBackgroundColor: nonEmptyText(config?.hoverSelectedBackgroundColor, D.hoverSelectedBackgroundColor),
    hoverSelectedBorderColor: nonEmptyText(config?.hoverSelectedBorderColor, D.hoverSelectedBorderColor),
    pressUnselectedTextColor: nonEmptyText(config?.pressUnselectedTextColor, D.pressUnselectedTextColor),
    pressUnselectedBackgroundColor: nonEmptyText(config?.pressUnselectedBackgroundColor, D.pressUnselectedBackgroundColor),
    pressUnselectedBorderColor: nonEmptyText(config?.pressUnselectedBorderColor, D.pressUnselectedBorderColor),
    pressSelectedTextColor: nonEmptyText(config?.pressSelectedTextColor, D.pressSelectedTextColor),
    pressSelectedBackgroundColor: nonEmptyText(config?.pressSelectedBackgroundColor, D.pressSelectedBackgroundColor),
    pressSelectedBorderColor: nonEmptyText(config?.pressSelectedBorderColor, D.pressSelectedBorderColor),
    darkInkSaturation: clampRange(config?.darkInkSaturation, 0, 2, D.darkInkSaturation),
    darkInkOpacityMultiplier: clampRange(config?.darkInkOpacityMultiplier, 0.2, 1, D.darkInkOpacityMultiplier),
    lightInkTolerance: clampRange(config?.lightInkTolerance, 0, 20, D.lightInkTolerance),
    minContrastRatio: clampRange(config?.minContrastRatio, 1, 21, D.minContrastRatio),
    activeSurfaceOffset: clampRange(config?.activeSurfaceOffset, -1, 1, D.activeSurfaceOffset),
    hoverSurfaceOffset: clampRange(config?.hoverSurfaceOffset, -1, 1, D.hoverSurfaceOffset),
    pressSurfaceOffset: clampRange(config?.pressSurfaceOffset, -1, 1, D.pressSurfaceOffset),
    borderWidth: normalizeTailwindToken({
      utility: 'borderWidth', breakpoint: 'base', value: config?.borderWidth, fallback: D.borderWidth,
    }),
    borderOpacity: clampRange(config?.borderOpacity, 0, 1, D.borderOpacity),
    paddingX: normalizeTailwindToken({
      utility: 'paddingX', breakpoint: 'base', value: config?.paddingX, fallback: D.paddingX,
    }),
    paddingY: normalizeTailwindToken({
      utility: 'paddingY', breakpoint: 'base', value: config?.paddingY, fallback: D.paddingY,
    }),
    textTracking: normalizeTailwindToken({
      utility: 'letterSpacing', breakpoint: 'base', value: config?.textTracking, fallback: D.textTracking,
    }),
    inactiveOpacity: clampRange(config?.inactiveOpacity, 0, 1, D.inactiveOpacity),
  }
}
