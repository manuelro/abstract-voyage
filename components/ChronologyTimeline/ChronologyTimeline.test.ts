import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { ChronologyTimeline, groupChronology } from './ChronologyTimeline'
import { normalizeChronologyTimelineConfig } from './ChronologyTimeline.config'

describe('ChronologyTimeline', () => {
  it('groups dated items newest first and preserves undated articles', () => {
    const items = [
      { date: '2020-11-05', id: 'november' },
      { date: '2023-01-27', id: 'january' },
      { date: '2020-12-08', id: 'december' },
      { date: 'welcome', id: 'welcome' },
    ]
    const groups = groupChronology(items)
    expect(groups.years.map(year => year.key)).toEqual(['2023', '2020'])
    expect(groups.years[1].months.map(month => month.label)).toEqual(['December', 'November'])
    expect(groups.years[1].months.map(month => month.shortLabel)).toEqual(['Dec', 'Nov'])
    expect(groups.years[1].months[0].items[0].id).toBe('december')
    expect(groups.undated.map(item => item.id)).toEqual(['welcome'])
  })

  it('normalizes opt-in state and visual bounds', () => {
    const config = normalizeChronologyTimelineConfig({ enabled: true, showMonths: true, monthNameFormat: 'short', monthNameFormatMd: 'invalid' as never, yearPlacement: 'inward', yearPlacementMd: 'invalid' as never, yearPlacementLg: 'inward', monthPlacementMd: 'inward', monthDarkInkSaturation: 3, monthDarkInkOpacityMultiplier: 0, monthLightInkTolerance: 30, yearPaddingX: 'invalid' as never, yearFontSize: 'invalid' as never, monthFontFamily: 'font-mono' as never, monthFontSizeMd: 'lg:text-xl' as never })
    expect(config.enabled).toBe(true)
    expect(config.showMonths).toBe(true)
    expect(config.monthNameFormat).toBe('short')
    expect(config.monthNameFormatMd).toBe('full')
    expect([config.yearPlacement, config.yearPlacementMd, config.yearPlacementLg]).toEqual(['inward', 'outward', 'inward'])
    expect([config.monthPlacement, config.monthPlacementMd, config.monthPlacementLg]).toEqual(['outward', 'inward', 'outward'])
    expect(config.monthDarkInkSaturation).toBe(2)
    expect(config.monthDarkInkOpacityMultiplier).toBe(0.2)
    expect(config.monthLightInkTolerance).toBe(20)
    expect(config.yearPaddingX).toBe('px-0')
    expect(config.yearFontSize).toBe('text-lg')
    expect(config.monthFontFamily).toBe('font-serif')
    expect(config.monthFontSizeMd).toBe('md:text-xs')
  })

  it('keeps the legacy rendering when off and exposes year and month markers when enabled', () => {
    const items = [{ date: '2023-05-03', id: 'one' }]
    const renderItems = (group: readonly typeof items[number][]) => createElement('p', null, group.map(item => item.id).join(','))
    const off = renderToStaticMarkup(createElement(ChronologyTimeline<(typeof items)[number]>, {
      items, config: normalizeChronologyTimelineConfig(undefined), backgroundColor: '#dae1e2', renderItems,
    }))
    expect(off).toBe('<p>one</p>')
    const on = renderToStaticMarkup(createElement(ChronologyTimeline<(typeof items)[number]>, {
      items, config: normalizeChronologyTimelineConfig({ enabled: true, showMonths: true, yearPlacement: 'inward', yearPlacementMd: 'outward', yearPlacementLg: 'inward', monthPlacement: 'outward', monthPlacementMd: 'inward', monthPlacementLg: 'outward', yearFontFamily: 'font-sans', monthFontFamily: 'font-serif', yearPaddingX: 'px-4', monthPaddingTop: 'pt-2', monthPaddingBottom: 'pb-2', yearFontSizeMd: 'md:text-xl', monthPaddingRightLg: 'lg:pr-4' }), backgroundColor: '#dae1e2', renderItems,
    }))
    expect(on).toContain('data-chronology="true"')
    expect(on).toContain('data-year-placement="inward"')
    expect(on).toContain('data-year-placement-md="outward"')
    expect(on).toContain('data-year-placement-lg="inward"')
    expect(on).toContain('data-month-placement-md="inward"')
    expect(on).toContain('data-month-placement-lg="outward"')
    expect(on).toContain('data-kind="year"')
    expect(on).toContain('data-kind="month"')
    expect(on).toContain('aria-label="May 2023"')
    expect(on).toContain('data-month-format-base="full"')
    expect(on).toContain('text-lg md:text-xl lg:text-lg font-sans font-semibold')
    expect(on).toContain('text-xs md:text-xs lg:text-xs font-serif font-medium')
    // yearPaddingX 'px-4' + yearPlacement 'inward' -> padding-left (keeps the
    // left-aligned, rail-adjacent label off the rail) — year still auto-flips
    // by placement via toRailEdgePaddingX (ChronologyTimeline.tsx's own doc
    // comment). Month padding is plain, independent sides now (no auto-flip),
    // so monthPaddingRightLg is asserted directly instead of being derived
    // from monthPlacementLg.
    expect(on).toContain('pl-4')
    expect(on).toContain('lg:pr-4')
    expect(on).toContain('--chronology-ink:#')
    expect(on).toContain('--chronology-year-color:#')
    expect(on).toContain('pt-2')
    expect(on).toContain('pb-2')
    expect(on).toContain('May')
  })
})
