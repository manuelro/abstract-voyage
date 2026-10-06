import type { CSSProperties, MouseEventHandler, ReactNode } from 'react'
import { colord, extend } from 'colord'
import mixPlugin from 'colord/plugins/mix'
import { tailwindTokenCssValue } from '../Panel/config/tailwindFields'
import type { TailwindTokenValue } from '../Panel/config/tailwindFields'
import type { ResolvedChipAppearance, ResolvedChipColors } from './config/resolveChipAppearance'
import styles from './Chip.module.css'

extend([mixPlugin])

export type ChipTintAppearance = {
  tint: string
  surfaceColor: string
  backgroundOpacity: number
  textOpacity: number
  contrastSensitivity: number
  borderOpacity: number
  hoverTint: string
  hoverBackgroundOpacity: number
  hoverTextOpacity: number
  hoverContrastSensitivity: number
  hoverBorderOpacity: number
  borderWidthClassName: TailwindTokenValue<'borderWidth'>
  paddingXClassName: TailwindTokenValue<'paddingX'>
  paddingYClassName: TailwindTokenValue<'paddingY'>
  textTrackingClassName: TailwindTokenValue<'letterSpacing'>
}

export type ChipProps = {
  label: ReactNode
  /** Selected/on state. With `appearance` supplied, this is also the fill
   * switch — selected renders the filled look, unselected renders the
   * border look (border and text sharing one color). Defaults to true
   * (matches the original always-on topic tag this component was
   * extracted from, PostMetaRow.tsx). */
  active?: boolean
  activeOpacity?: number
  inactiveOpacity?: number
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLSpanElement>
  className?: string
  style?: CSSProperties
  /** 'span' (default): static label, matches the original topic tag.
   * 'button': interactive, toggleable chip (journal's article filter). */
  as?: 'span' | 'button'
  /** Opt-in: a pre-resolved `components/Chip/config/resolveChipAppearance.ts`
   * result. Omitted (default): legacy behavior, byte-identical to before
   * this capability existed — `className`/`style` carry every color
   * themselves, same as PostMetaRow.tsx's own topic tag today. Supplied:
   * `active` picks the filled (selected) or border (unselected) look at
   * every interactive state (idle/hover/press, real CSS `:hover`/`:active`
   * pseudo-classes — zero re-renders), and `className`/`style` are still
   * applied first for shape/spacing (rounded corners, padding, font size)
   * — never for color, which this prop owns exclusively once present. */
  appearance?: ResolvedChipAppearance
  /** Independent default and hover tints. Selected chips use the hover tint
   * at rest; each state's text shifts its tint for contrast. */
  tintAppearance?: ChipTintAppearance
}

/** Original topic-tag markup, byte-for-byte (PostMetaRow.tsx's own
 * pre-extraction fallback className). */
export const CHIP_DEFAULT_CLASS_NAME = 'rounded-full border border-white/30 px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/80'

/** Selected renders the filled look; unselected renders the border look
 * (border and text sharing one color, transparent background). */
function pickLook(colors: ResolvedChipColors, active: boolean) {
  return active
    ? { bg: colors.fillBackgroundColor, text: colors.fillTextColor, border: colors.fillBorderColor }
    : { bg: colors.backgroundColor, text: colors.textColor, border: colors.borderColor }
}

function withColorOpacity(color: string, opacity: number): string {
  if (opacity === 1) return color
  // Keep CSS expressions such as the journal's scroll-adaptive color-mix()
  // live; parsing them as a static color loses their hue and scroll response.
  // Mixing with transparent also multiplies any alpha already in the color.
  return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`
}

export default function Chip({
  label,
  active = true,
  activeOpacity = 1,
  inactiveOpacity = 0.7,
  onClick,
  className,
  style,
  as = 'span',
  appearance,
  tintAppearance,
}: ChipProps) {
  const colorAppearance = tintAppearance ?? appearance
  const resolvedClassName = colorAppearance
    ? `${className ?? CHIP_DEFAULT_CLASS_NAME} ${styles.chip} ${colorAppearance.paddingXClassName} ${colorAppearance.paddingYClassName} ${colorAppearance.textTrackingClassName}`
    : className ?? CHIP_DEFAULT_CLASS_NAME

  const appearanceStyle: CSSProperties = tintAppearance
    ? (() => {
      const surface = colord(tintAppearance.surfaceColor)
      const background = surface.isValid() ? surface : colord('#ffffff')
      const colorsFor = (tint: string, backgroundOpacity: number, textOpacity: number, borderOpacity: number, contrastSensitivity: number) => {
        const blendedFill = background.mix(tint, backgroundOpacity)
        const darkSide = blendedFill.contrast('#000000') >= blendedFill.contrast('#ffffff')
        const { h, s, l } = colord(tint).toHsl()
        const amount = Math.max(0, Math.min(1, contrastSensitivity))
        const text = colord({ h, s, l: l + ((darkSide ? 0 : 100) - l) * amount }).toHex()
        return {
          fill: `color-mix(in srgb, ${tint} ${backgroundOpacity * 100}%, transparent)`,
          text: withColorOpacity(text, textOpacity),
          border: withColorOpacity(tint, borderOpacity),
        }
      }
      const idle = colorsFor(tintAppearance.tint, tintAppearance.backgroundOpacity, tintAppearance.textOpacity, tintAppearance.borderOpacity, tintAppearance.contrastSensitivity)
      const hover = colorsFor(tintAppearance.hoverTint, tintAppearance.hoverBackgroundOpacity, tintAppearance.hoverTextOpacity, tintAppearance.hoverBorderOpacity, tintAppearance.hoverContrastSensitivity)
      const current = active ? hover : idle
      return {
        borderWidth: tailwindTokenCssValue('borderWidth', 'base', tintAppearance.borderWidthClassName),
        borderStyle: 'solid',
        '--chip-bg': current.fill,
        '--chip-text': current.text,
        '--chip-border': current.border,
        '--chip-bg-hover': hover.fill,
        '--chip-text-hover': hover.text,
        '--chip-border-hover': hover.border,
        '--chip-bg-press': hover.fill,
        '--chip-text-press': hover.text,
        '--chip-border-press': hover.border,
      } as CSSProperties
    })()
    : appearance
    ? (() => {
      const idle = pickLook(appearance.idle, active)
      const hover = pickLook(appearance.hover, active)
      const press = pickLook(appearance.press, active)
      return {
        borderWidth: tailwindTokenCssValue('borderWidth', 'base', appearance.borderWidthClassName),
        borderStyle: 'solid',
        '--chip-bg': idle.bg,
        '--chip-text': idle.text,
        '--chip-border': withColorOpacity(idle.border, appearance.borderOpacity),
        '--chip-bg-hover': hover.bg,
        '--chip-text-hover': hover.text,
        '--chip-border-hover': withColorOpacity(hover.border, appearance.borderOpacity),
        '--chip-bg-press': press.bg,
        '--chip-text-press': press.text,
        '--chip-border-press': withColorOpacity(press.border, appearance.borderOpacity),
      } as CSSProperties
    })()
    : {}

  const resolvedOpacity = tintAppearance ? 1 : appearance
    ? (active ? 1 : appearance.inactiveOpacity)
    : (active ? activeOpacity : inactiveOpacity)

  const resolvedStyle: CSSProperties = {
    opacity: resolvedOpacity,
    ...style,
    ...appearanceStyle,
  }

  if (as === 'button') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={resolvedClassName}
        style={resolvedStyle}
        aria-pressed={active}
      >
        {label}
      </button>
    )
  }

  return (
    <span className={resolvedClassName} style={resolvedStyle}>
      {label}
    </span>
  )
}
