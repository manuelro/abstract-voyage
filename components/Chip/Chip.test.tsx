import React from 'react'
import { act } from 'react-dom/test-utils'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import Chip from './Chip'
import { DEFAULT_CHIP_APPEARANCE_CONFIG, normalizeChipAppearanceConfig } from './config/appearance'
import { resolveChipAppearance } from './config/resolveChipAppearance'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

describe('Chip', () => {
  it('keeps default and hover tint controls independent and picks readable text for each', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    const tintAppearance = {
      tint: '#000066',
      surfaceColor: '#ffffff',
      backgroundOpacity: 1,
      textOpacity: 1,
      contrastSensitivity: 1,
      borderOpacity: 0.4,
      hoverTint: '#ffffff',
      hoverBackgroundOpacity: 1,
      hoverTextOpacity: 0.5,
      hoverContrastSensitivity: 1,
      hoverBorderOpacity: 0.7,
      borderWidthClassName: 'border' as const,
      paddingXClassName: 'px-2' as const,
      paddingYClassName: 'py-0.5' as const,
      textTrackingClassName: 'tracking-wide' as const,
    }

    act(() => root.render(<Chip as="button" label="All" active tintAppearance={tintAppearance} />))
    const chip = container.querySelector('button')!
    expect(chip.style.getPropertyValue('--chip-text')).toBe(chip.style.getPropertyValue('--chip-text-hover'))
    expect(chip.style.getPropertyValue('--chip-bg')).toBe(chip.style.getPropertyValue('--chip-bg-hover'))
    expect(chip.style.getPropertyValue('--chip-border')).toBe(chip.style.getPropertyValue('--chip-border-hover'))
    expect(chip.style.getPropertyValue('--chip-text-hover')).toContain('#000000 50%')
    expect(chip.style.getPropertyValue('--chip-bg-hover')).toContain('#ffffff 100%')
    expect(chip.style.getPropertyValue('--chip-border-hover')).toContain('#ffffff 70%')
    expect(chip.style.getPropertyValue('--chip-text-press')).toBe(chip.style.getPropertyValue('--chip-text-hover'))
    expect(chip.style.getPropertyValue('--chip-border')).toContain('#ffffff 70%')

    act(() => root.render(<Chip as="button" label="All" active tintAppearance={{
      ...tintAppearance, hoverContrastSensitivity: 0,
    }} />))
    expect(chip.style.getPropertyValue('--chip-text-hover')).toContain('#ffffff 50%')
    expect(chip.style.getPropertyValue('--chip-text')).toContain('#ffffff 50%')

    act(() => root.render(<Chip as="button" label="All" active tintAppearance={{
      ...tintAppearance, contrastSensitivity: 0,
    }} />))
    expect(chip.style.getPropertyValue('--chip-text')).toContain('#000000 50%')
    expect(chip.style.getPropertyValue('--chip-text-hover')).toContain('#000000 50%')

    act(() => root.render(<Chip as="button" label="All" active tintAppearance={{
      ...tintAppearance, tint: '#edf6fd', contrastSensitivity: 1,
    }} />))
    expect(chip.style.getPropertyValue('--chip-text')).toContain('#000000 50%')

    act(() => root.render(<Chip as="button" label="All" active={false} tintAppearance={tintAppearance} />))
    expect(chip.style.getPropertyValue('--chip-bg')).toContain('#000066 100%')
    expect(chip.style.getPropertyValue('--chip-bg-hover')).not.toBe(chip.style.getPropertyValue('--chip-bg'))
    expect(chip.style.getPropertyValue('--chip-border')).toContain('#000066 40%')
    expect(chip.style.opacity).toBe('1')

    act(() => root.render(<Chip as="button" label="All" active={false} tintAppearance={{
      ...tintAppearance, backgroundOpacity: 0,
    }} />))
    expect(chip.style.getPropertyValue('--chip-text')).toBe('#000000')

    act(() => root.render(<Chip as="button" label="All" active={false} tintAppearance={{
      ...tintAppearance, backgroundOpacity: 1, textOpacity: 0.4,
    }} />))
    expect(chip.style.getPropertyValue('--chip-text')).toContain('#ffffff 40%')
    expect(chip.style.getPropertyValue('--chip-bg')).toContain('#000066 100%')
    expect(chip.style.getPropertyValue('--chip-border')).toContain('#000066 40%')
    act(() => root.unmount())
  })

  it('uses independent custom text, background, and border colors for each state and selection', () => {
    const config = normalizeChipAppearanceConfig({
      ...DEFAULT_CHIP_APPEARANCE_CONFIG,
      colorMode: 'custom',
      idleUnselectedTextColor: '#111111',
      idleUnselectedBackgroundColor: '#222222',
      idleUnselectedBorderColor: '#333333',
      idleSelectedTextColor: '#444444',
      idleSelectedBackgroundColor: '#555555',
      idleSelectedBorderColor: '#666666',
      hoverUnselectedTextColor: '#777777',
      hoverUnselectedBackgroundColor: '#888888',
      hoverUnselectedBorderColor: '#999999',
      hoverSelectedTextColor: '#aaaaaa',
      hoverSelectedBackgroundColor: '#bbbbbb',
      hoverSelectedBorderColor: '#cccccc',
      pressUnselectedTextColor: '#dddddd',
      pressUnselectedBackgroundColor: '#eeeeee',
      pressUnselectedBorderColor: '#abcdef',
      pressSelectedTextColor: '#fedcba',
      pressSelectedBackgroundColor: '#123456',
      pressSelectedBorderColor: '#654321',
    })
    const appearance = resolveChipAppearance(config, '#ffffff')
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => root.render(<Chip as="button" label="Off" active={false} appearance={appearance} />))
    const chip = container.querySelector('button')!
    expect(chip.style.getPropertyValue('--chip-text')).toBe('#111111')
    expect(chip.style.getPropertyValue('--chip-bg')).toBe('#222222')
    expect(chip.style.getPropertyValue('--chip-border')).toBe('#333333')
    expect(chip.style.getPropertyValue('--chip-text-hover')).toBe('#777777')
    expect(chip.style.getPropertyValue('--chip-bg-hover')).toBe('#888888')
    expect(chip.style.getPropertyValue('--chip-border-hover')).toBe('#999999')
    expect(chip.style.getPropertyValue('--chip-text-press')).toBe('#dddddd')
    expect(chip.style.getPropertyValue('--chip-bg-press')).toBe('#eeeeee')
    expect(chip.style.getPropertyValue('--chip-border-press')).toBe('#abcdef')

    act(() => root.render(<Chip as="button" label="On" active appearance={appearance} />))
    expect(chip.style.getPropertyValue('--chip-text')).toBe('#444444')
    expect(chip.style.getPropertyValue('--chip-bg')).toBe('#555555')
    expect(chip.style.getPropertyValue('--chip-border')).toBe('#666666')
    expect(chip.style.getPropertyValue('--chip-text-hover')).toBe('#aaaaaa')
    expect(chip.style.getPropertyValue('--chip-bg-hover')).toBe('#bbbbbb')
    expect(chip.style.getPropertyValue('--chip-border-hover')).toBe('#cccccc')
    expect(chip.style.getPropertyValue('--chip-text-press')).toBe('#fedcba')
    expect(chip.style.getPropertyValue('--chip-bg-press')).toBe('#123456')
    expect(chip.style.getPropertyValue('--chip-border-press')).toBe('#654321')
    act(() => root.unmount())
  })

  it('renders the legacy, unstyled-color look when no appearance is supplied (byte-identical to before this capability existed)', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<Chip label="Topic" />))

    const span = container.querySelector('span')
    expect(span?.style.backgroundColor).toBe('')
    expect(span?.style.borderColor).toBe('')
    expect(span?.style.getPropertyValue('--chip-bg')).toBe('')

    act(() => root.unmount())
  })

  it('manual mode: idle look resolves a filled (selected) and border (unselected) look sharing one ink for border+text', () => {
    const config = normalizeChipAppearanceConfig({
      ...DEFAULT_CHIP_APPEARANCE_CONFIG,
      colorMode: 'manual',
      inkColor: '#334455',
      backgroundColor: '#aabbcc',
    })
    const appearance = resolveChipAppearance(config, '#ffffff')
    expect(appearance.idle.borderColor).toBe(appearance.idle.textColor)
    expect(appearance.idle.borderColor).toBe('#334455')
    expect(appearance.idle.fillBackgroundColor).toBe('#aabbcc')
    // Fill text is never authored — always auto-picked against the real fill.
    expect(appearance.idle.fillTextColor).not.toBe('#aabbcc')

    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<Chip as="button" label="On" active appearance={appearance} />))
    const selected = container.querySelector('button')
    expect(selected?.style.getPropertyValue('--chip-bg')).toBe('#aabbcc')
    expect(selected?.style.getPropertyValue('--chip-text')).toBe(appearance.idle.fillTextColor)
    expect(selected?.style.getPropertyValue('--chip-border')).toBe('#aabbcc')

    act(() => root.render(<Chip as="button" label="Off" active={false} appearance={appearance} />))
    const unselected = container.querySelector('button')
    expect(unselected?.style.getPropertyValue('--chip-bg')).toBe('transparent')
    expect(unselected?.style.getPropertyValue('--chip-text')).toBe('#334455')
    expect(unselected?.style.getPropertyValue('--chip-border')).toBe('#334455')

    act(() => root.unmount())
  })

  it('deriveFromBackground mode resolves a real border/text ink and a distinct filled background for the selected state', () => {
    const config = normalizeChipAppearanceConfig({
      ...DEFAULT_CHIP_APPEARANCE_CONFIG,
      colorMode: 'deriveFromBackground',
    })
    const appearance = resolveChipAppearance(config, '#1f2937')

    expect(appearance.idle.borderColor).toBe(appearance.idle.textColor)
    expect(appearance.idle.fillBackgroundColor).not.toBe('#1f2937')
    expect(appearance.idle.fillBackgroundColor).toMatch(/^#/)
    expect(appearance.idle.borderColor).toMatch(/^rgba?\(/)
  })

  it('hover/press shift whichever color carries the current look\'s visual weight, and re-derive the filled text so it stays readable', () => {
    const config = normalizeChipAppearanceConfig({
      ...DEFAULT_CHIP_APPEARANCE_CONFIG,
      colorMode: 'manual',
      inkColor: '#334455',
      backgroundColor: '#aabbcc',
      hoverSurfaceOffset: 0.2,
      pressSurfaceOffset: -0.2,
    })
    const appearance = resolveChipAppearance(config, '#ffffff')

    expect(appearance.hover.fillBackgroundColor).not.toBe(appearance.idle.fillBackgroundColor)
    expect(appearance.press.fillBackgroundColor).not.toBe(appearance.idle.fillBackgroundColor)
    expect(appearance.hover.fillBackgroundColor).not.toBe(appearance.press.fillBackgroundColor)
    expect(appearance.hover.borderColor).not.toBe(appearance.idle.borderColor)
    expect(appearance.press.borderColor).not.toBe(appearance.idle.borderColor)
    // The fill text is re-derived per state, not frozen at the idle value.
    expect(appearance.hover.fillTextColor).not.toBe(appearance.idle.fillBackgroundColor)
  })

  it('applies the hover/press CSS custom properties alongside the idle ones', () => {
    const config = normalizeChipAppearanceConfig({
      ...DEFAULT_CHIP_APPEARANCE_CONFIG,
      colorMode: 'manual',
      inkColor: '#334455',
      backgroundColor: '#aabbcc',
    })
    const appearance = resolveChipAppearance(config, '#ffffff')

    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<Chip as="button" label="On" active appearance={appearance} />))
    const selected = container.querySelector('button')
    expect(selected?.style.getPropertyValue('--chip-bg-hover')).toBe(appearance.hover.fillBackgroundColor)
    expect(selected?.style.getPropertyValue('--chip-bg-press')).toBe(appearance.press.fillBackgroundColor)

    act(() => root.unmount())
  })

  it('scales existing border alpha without fading text or fill', () => {
    const config = normalizeChipAppearanceConfig({
      ...DEFAULT_CHIP_APPEARANCE_CONFIG,
      inkColor: 'rgba(51, 68, 85, 0.8)',
      borderOpacity: 0.5,
    })
    const appearance = resolveChipAppearance(config, '#ffffff')
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => root.render(<Chip label="Off" active={false} appearance={appearance} />))
    const chip = container.querySelector('span')
    expect(chip?.style.getPropertyValue('--chip-border')).toBe('color-mix(in srgb, rgba(51, 68, 85, 0.8) 50%, transparent)')
    expect(chip?.style.getPropertyValue('--chip-text')).toBe('rgba(51, 68, 85, 0.8)')
    expect(chip?.style.getPropertyValue('--chip-bg')).toBe('transparent')

    act(() => root.unmount())
  })

  it('preserves a live CSS border color expression when applying opacity', () => {
    const appearance = resolveChipAppearance(normalizeChipAppearanceConfig({
      ...DEFAULT_CHIP_APPEARANCE_CONFIG,
      inkColor: 'color-mix(in srgb, #00141f 75%, white)',
      borderOpacity: 0.5,
    }), '#ffffff')
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => root.render(<Chip label="Topic" active={false} appearance={appearance} />))
    expect(container.querySelector('span')?.style.getPropertyValue('--chip-border')).toBe(
      'color-mix(in srgb, color-mix(in srgb, #00141f 75%, white) 50%, transparent)',
    )

    act(() => root.unmount())
  })
})
