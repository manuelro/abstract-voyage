import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { colord, extend } from 'colord'
import a11yPlugin from 'colord/plugins/a11y'
import { deriveOpaqueTint } from '../../helpers/surfaceColorDerivation'
import type { ChronologyTimelineConfig } from './ChronologyTimeline.config'
import { DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG, type GlobalTypographyConfig } from '../GlobalTypography.config'
import { resolveGradientColumnTypography } from '../../experiences/abstract/components/PolymorphicLayout.narrowColumnTypography'
import { useChronologyYearHoverFade } from './ChronologyTimeline.useYearHoverFade'
import styles from './ChronologyTimeline.module.css'

extend([a11yPlugin])

function resolveChronologyInk(
  backgroundColor: string,
  saturation: number,
  opacity: number,
  lightTolerance: number,
  minContrastRatio: number,
  globalTypographyConfig: GlobalTypographyConfig,
): string {
  const resolve = (tolerance: number) => resolveGradientColumnTypography(
    backgroundColor, backgroundColor, saturation, opacity, tolerance,
    globalTypographyConfig,
  ).ink
  const candidate = resolve(lightTolerance)
  // The shared tolerance knob can deliberately choose light ink on a light
  // surface. Chronology labels are small text, so keep their final pigment AA.
  const ink = colord(candidate).contrast(backgroundColor) >= minContrastRatio ? candidate : resolve(0)
  // The shared resolver calibrates its candidate for the requested opacity.
  // Compose that opacity into an opaque pigment so dots and text match, while
  // stopping at a 7:1 reference contrast to leave room for gradient drift.
  let low = opacity
  let high = 1
  const tintSurface = saturation === 0 ? colord(backgroundColor).grayscale().toHex() : backgroundColor
  if (colord(deriveOpaqueTint(ink, tintSurface, low)).contrast(backgroundColor) < 7) {
    for (let step = 0; step < 12; step++) {
      const middle = (low + high) / 2
      if (colord(deriveOpaqueTint(ink, tintSurface, middle)).contrast(backgroundColor) >= 7) high = middle
      else low = middle
    }
    return deriveOpaqueTint(ink, tintSurface, high)
  }
  return deriveOpaqueTint(ink, tintSurface, low)
}

type DatedItem = { date: string }
type MonthGroup<T> = { key: string; label: string; shortLabel: string; items: T[] }
type YearGroup<T> = { key: string; months: MonthGroup<T>[]; items: T[] }

// Bug fix (operator-reported): the stored token is a symmetric `px-N`
// Tailwind utility, but the label it drives is never actually centered — it
// sits flush against one edge of its own box and reads outward from there:
// right-aligned text ending at the rail (outward placement) or left-aligned
// text starting at the rail (inward placement, see the `.label[data-kind]`
// placement overrides in ChronologyTimeline.module.css). Applying `px-N`
// unconditionally pads the edge that produces the actual rail-ward gap
// *and* the opposite edge that does nothing visible for that placement.
// Converts the configured scale into the one real, meaningful side:
// padding-right when outward (keeps right-aligned text off the rail),
// padding-left when inward (keeps left-aligned text off the rail). Also
// explicitly zeroes the *other* side at the same breakpoint prefix — journal
// itself flips placement across breakpoints (e.g. year: inward on mobile,
// outward on md/lg), and padding-left/padding-right are two independent CSS
// properties, so an unprefixed mobile `pl-*` would otherwise keep applying
// at md/lg right alongside that breakpoint's own `pr-*` instead of being
// superseded by it the way a single shared `px-*` class used to supersede
// itself across breakpoints.
function toRailEdgePaddingX(token: string, placement: 'outward' | 'inward'): string {
  const match = token.match(/^((?:md:|lg:)?)px-(.+)$/)
  if (!match) return token
  const [, prefix, scale] = match
  const side = placement === 'inward' ? 'pl' : 'pr'
  const oppositeSide = placement === 'inward' ? 'pr' : 'pl'
  return `${prefix}${side}-${scale} ${prefix}${oppositeSide}-0`
}

function ChronologyMonth<T>({ month, year, config, renderItems }: {
  month: MonthGroup<T>
  year: string
  config: ChronologyTimelineConfig
  renderItems: (items: readonly T[]) => ReactNode
}) {
  const sectionRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const section = sectionRef.current
    const firstItem = section?.querySelector<HTMLElement>('[data-chronology-items] a, [data-chronology-items] button')
    if (!section || !firstItem) return
    let disposed = false
    const measure = () => {
      if (disposed) return
      const walker = document.createTreeWalker(firstItem, NodeFilter.SHOW_TEXT)
      let textNode = walker.nextNode()
      while (textNode && !textNode.textContent?.trim()) textNode = walker.nextNode()
      if (!textNode?.textContent) return
      const firstCharacter = textNode.textContent.search(/\S/)
      if (firstCharacter < 0) return
      const range = document.createRange()
      range.setStart(textNode, firstCharacter)
      range.setEnd(textNode, firstCharacter + 1)
      const line = range.getBoundingClientRect()
      const sectionBox = section.getBoundingClientRect()
      section.style.setProperty('--chronology-month-anchor-y', `${line.top + line.height / 2 - sectionBox.top}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(firstItem)
    document.fonts.ready.then(measure)
    return () => { disposed = true; observer.disconnect() }
  }, [month.items])

  const monthPaddingXDirectional = [
    toRailEdgePaddingX(config.monthPaddingX, config.monthPlacement),
    toRailEdgePaddingX(config.monthPaddingXMd, config.monthPlacementMd),
    toRailEdgePaddingX(config.monthPaddingXLg, config.monthPlacementLg),
  ].join(' ')

  return <section ref={sectionRef} className={styles.month} aria-label={`${month.label} ${year}`}>
    <div className={styles.markerRow}>
      <span className={styles.dot} data-kind="month" aria-hidden="true" />
      <h3 className={`${styles.label} ${config.monthFontSize} ${config.monthFontSizeMd} ${config.monthFontSizeLg} ${config.monthFontFamily} ${config.monthFontWeight} ${monthPaddingXDirectional} ${config.monthPaddingY} ${config.monthPaddingYMd} ${config.monthPaddingYLg}`} data-kind="month" aria-label={`${month.label} ${year}`}>
        <span className={styles.monthFull} aria-hidden="true">{month.label}</span>
        <span className={styles.monthShort} aria-hidden="true">{month.shortLabel}</span>
      </h3>
    </div>
    {/* Operator ask (2026-10-04): this padding is for the group of articles
        under each month — the label's own dot-to-text gap is restored above
        (monthPaddingX/-Y, same rail-edge mechanism as the year label). */}
    <div
      className={`${styles.items} ${config.monthPaddingTop} ${config.monthPaddingTopMd} ${config.monthPaddingTopLg} ${config.monthPaddingRight} ${config.monthPaddingRightMd} ${config.monthPaddingRightLg} ${config.monthPaddingBottom} ${config.monthPaddingBottomMd} ${config.monthPaddingBottomLg} ${config.monthPaddingLeft} ${config.monthPaddingLeftMd} ${config.monthPaddingLeftLg}`}
      data-chronology-items="true"
    >{renderItems(month.items)}</div>
  </section>
}

export function groupChronology<T extends DatedItem>(items: readonly T[]): { years: YearGroup<T>[]; undated: T[] } {
  const years = new Map<string, Map<string, T[]>>()
  const undated: T[] = []
  for (const item of items) {
    const match = /^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?/.exec(item.date)
    if (!match) { undated.push(item); continue }
    const [, year, month] = match
    if (!years.has(year)) years.set(year, new Map())
    const months = years.get(year)!
    if (!months.has(month)) months.set(month, [])
    months.get(month)!.push(item)
  }
  return {
    years: Array.from(years).sort(([a], [b]) => b.localeCompare(a)).map(([key, months]) => ({
      key,
      months: Array.from(months).sort(([a], [b]) => b.localeCompare(a)).map(([month, monthItems]) => ({
        key: month,
        label: new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, Number(month) - 1, 1))),
        shortLabel: new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, Number(month) - 1, 1))),
        items: monthItems,
      })),
      items: Array.from(months).sort(([a], [b]) => b.localeCompare(a)).flatMap(([, monthItems]) => monthItems),
    })),
    undated,
  }
}

export function ChronologyTimeline<T extends DatedItem>({
  items, config, backgroundColor, renderItems, prefersReducedMotion = false,
  globalTypographyConfig = DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG,
}: {
  items: readonly T[]
  config: ChronologyTimelineConfig
  backgroundColor: string
  renderItems: (items: readonly T[]) => ReactNode
  prefersReducedMotion?: boolean
  /** The same live, shared `GlobalTypographyConfig` /abstract's own narrow/
   * wide column text already resolves against (components/
   * SharedDesignConfigProvider.tsx) — a caller on that cross-page scope
   * should pass its live value here rather than letting this default to the
   * static one, the same "real column ink, not a frozen snapshot" fix
   * applied to Chip's own derivation (PLAN-CHIP-COLUMN-INK-DERIVATION.md). */
  globalTypographyConfig?: GlobalTypographyConfig
}) {
  const hoverFadeEnabled = config.enabled && config.yearHoverFadeEnabled
  const { activeYearKey, setHoveredYearKey, registerYearRef } = useChronologyYearHoverFade(hoverFadeEnabled, config.yearHoverFadeTouchEnabled)
  // Bug fix (operator-reported three times, screenshot evidence each time):
  // the rail used to be one pseudo-element (`.dated::before`) spanning every
  // year, so a dimmed year's own dot could repaint to a lighter solid color
  // but the line passing through it could not — one shared element can't
  // hold two different colors for two different years' dimmed states at
  // once. The rail is now drawn per year (`.yearRail`, one per `<section
  // className={styles.year}>`, first child so it paints behind that year's
  // own dot/content) and reads the exact same CSS variables that year's own
  // dot reads (`--chronology-ink` at rest, `--chronology-year-fade-dot-color`
  // when `data-dimmed`) — the dot and the line behind it are now
  // *structurally* the same color, in every state, not just coincidentally
  // equal at rest.
  const datedRef = useRef<HTMLDivElement>(null)
  // Bug fix (operator-reported, screenshot evidence, twice): a flat
  // `top: 0; height: 100%` per year undershot in two ways. (1) The dot sits
  // at the *vertical center* of its own markerRow, not at the section's y=0
  // top edge, so the first year's segment ran a stray tail above its own
  // dot. (2) Because consecutive sections tile top-to-bottom, a year's
  // segment ending at its own section's bottom edge actually ends *above*
  // the next year's dot (the next section's own markerRow inset is still
  // below that edge) — the color handoff landed early, inside what should
  // still read as empty rail leading into the next dot, matching the
  // screenshot showing the fade boundary short of the next dot. Each year's
  // segment is now measured dot-center to dot-center: its own `top` is this
  // year's own dot's actual vertical center (so the rail starts exactly at
  // the first dot, no excess), and its `height` reaches exactly the *next*
  // year's dot center (so the color only changes right where the next dot
  // begins) — same getBoundingClientRect-diffing approach ChronologyMonth's
  // own anchor effect above already uses for its own measurement. Only the
  // terminal (chronologically earliest, last in DOM) year has no "next" dot
  // to reach for, so its own segment is trimmed to stop at its own last dot
  // instead of running into trailing whitespace.
  useEffect(() => {
    const dated = datedRef.current
    if (!dated) return
    const sections = Array.from(dated.querySelectorAll<HTMLElement>('[data-chronology-year="true"]'))
    if (sections.length === 0) return
    let disposed = false
    const measure = () => {
      if (disposed) return
      const ownDotCenters = sections.map(section => {
        const dot = section.querySelector<HTMLElement>('span[data-kind="year"]')
        if (!dot) return null
        const dotBox = dot.getBoundingClientRect()
        return dotBox.top + dotBox.height / 2
      })
      sections.forEach((section, index) => {
        const rail = section.querySelector<HTMLElement>(`.${styles.yearRail}`)
        const ownDotY = ownDotCenters[index]
        if (!rail || ownDotY == null) return
        const sectionBox = section.getBoundingClientRect()
        rail.style.top = `${ownDotY - sectionBox.top}px`
        const isTerminalYear = index === sections.length - 1
        if (isTerminalYear) {
          const kind = config.showMonths ? 'month' : 'year'
          const dots = section.querySelectorAll<HTMLElement>(`span[data-kind="${kind}"]`)
          const terminalDot = dots[dots.length - 1]
          if (!terminalDot) return
          const terminalBox = terminalDot.getBoundingClientRect()
          const terminalY = terminalBox.top + terminalBox.height / 2
          rail.style.height = `${Math.max(0, terminalY - ownDotY)}px`
        } else {
          const nextDotY = ownDotCenters[index + 1]
          if (nextDotY != null) rail.style.height = `${Math.max(0, nextDotY - ownDotY)}px`
        }
      })
    }
    measure()
    const resizeObserver = new ResizeObserver(measure)
    sections.forEach(section => resizeObserver.observe(section))
    const anchorObserver = new MutationObserver(measure)
    if (config.showMonths) {
      dated.querySelectorAll('section').forEach(section => (
        anchorObserver.observe(section, { attributes: true, attributeFilter: ['style'] })
      ))
    }
    window.addEventListener('resize', measure)
    document.fonts.ready.then(measure)
    // Bug fix (operator-reported, screenshot evidence): once the FIRST
    // year's own dot is pinned via CSS `position: sticky` (yearStickyEnabled,
    // tablet/desktop), the measurement above — taken once on mount/resize —
    // goes stale the moment scrolling starts: `rail.style.top` still
    // reflects where the dot sat in NORMAL document flow, but the dot itself
    // no longer moves with that flow once stuck, so the rail's own (still
    // normally-scrolling) top edge keeps sliding further past the now-frozen
    // dot, exposing an ever-growing, dot-less stray segment above it (the
    // "orphan trace"). Operator-scoped to the first year only (2026-10-04):
    // every later year's own segment starts flush against its own dot
    // already — re-measuring them on scroll was an unrequested, unobserved-
    // bug behavior change, not a fix. Re-running the exact same per-section
    // write (rail.style.top/height) for `sections[0]` alone on every scroll
    // keeps it locked to that one dot's actual, current on-screen position —
    // stuck or not; rAF-throttled since this fires on every scroll tick, and
    // reads (getBoundingClientRect) stay batched ahead of the write, so this
    // can't introduce layout thrashing.
    let rafId: number | null = null
    const measureFirstYearRail = () => {
      if (disposed) return
      const firstSection = sections[0]
      const rail = firstSection?.querySelector<HTMLElement>(`.${styles.yearRail}`)
      const dot = firstSection?.querySelector<HTMLElement>('span[data-kind="year"]')
      if (!firstSection || !rail || !dot) return
      const dotBox = dot.getBoundingClientRect()
      const ownDotY = dotBox.top + dotBox.height / 2
      // Bug fix (operator-reported, screenshot evidence): the year's own dot
      // is frozen on screen while stuck, but its own MONTHS are not — they
      // keep scrolling normally, and since the first month sits only a
      // short natural distance below the year label, it can scroll far
      // enough to pass *above* the now-frozen year dot before it clears the
      // viewport (document order guarantees nothing about on-screen order
      // once one side of a pair is pinned and the other keeps moving). The
      // rail's own top used to be hardcoded to the year dot's position, so
      // in that window the line simply didn't reach up to cover whichever
      // month had overtaken it — a visible broken gap, not a trailing track.
      // Anchoring to whichever point is CURRENTLY highest on screen (the
      // smallest y: the year dot, or any of its own months that have
      // overtaken it) keeps the line continuous through that handoff.
      const monthDotYs = config.showMonths
        ? Array.from(firstSection.querySelectorAll<HTMLElement>('span[data-kind="month"]')).map(monthDot => {
          const box = monthDot.getBoundingClientRect()
          return box.top + box.height / 2
        })
        : []
      const topY = Math.min(ownDotY, ...monthDotYs)
      const sectionBox = firstSection.getBoundingClientRect()
      rail.style.top = `${topY - sectionBox.top}px`
      const isTerminalYear = sections.length === 1
      if (isTerminalYear) {
        const kind = config.showMonths ? 'month' : 'year'
        const dots = firstSection.querySelectorAll<HTMLElement>(`span[data-kind="${kind}"]`)
        const terminalDot = dots[dots.length - 1]
        if (!terminalDot) return
        const terminalBox = terminalDot.getBoundingClientRect()
        const terminalY = terminalBox.top + terminalBox.height / 2
        rail.style.height = `${Math.max(0, terminalY - topY)}px`
      } else {
        const nextDot = sections[1]?.querySelector<HTMLElement>('span[data-kind="year"]')
        if (!nextDot) return
        const nextDotBox = nextDot.getBoundingClientRect()
        const nextDotY = nextDotBox.top + nextDotBox.height / 2
        rail.style.height = `${Math.max(0, nextDotY - topY)}px`
      }
    }
    const onScroll = () => {
      if (rafId != null) return
      rafId = window.requestAnimationFrame(() => {
        rafId = null
        measureFirstYearRail()
      })
    }
    if (config.yearStickyEnabled) window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      disposed = true
      resizeObserver.disconnect()
      anchorObserver.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', onScroll)
      if (rafId != null) window.cancelAnimationFrame(rafId)
    }
  }, [config.enabled, config.showMonths, config.yearStickyEnabled, items])

  if (!config.enabled) return <>{renderItems(items)}</>
  const { years, undated } = groupChronology(items)
  const yearPaddingXDirectional = [
    toRailEdgePaddingX(config.yearPaddingX, config.yearPlacement),
    toRailEdgePaddingX(config.yearPaddingXMd, config.yearPlacementMd),
    toRailEdgePaddingX(config.yearPaddingXLg, config.yearPlacementLg),
  ].join(' ')
  const yearInk = config.yearColorMode === 'manual'
    ? config.yearManualColor
    : resolveChronologyInk(
      backgroundColor, config.yearDarkInkSaturation, config.yearDarkInkOpacityMultiplier,
      config.yearLightInkTolerance, config.yearMinContrastRatio, globalTypographyConfig,
    )
  const monthInk = config.monthColorMode === 'manual'
    ? config.monthManualColor
    : resolveChronologyInk(
      backgroundColor, config.monthDarkInkSaturation, config.monthDarkInkOpacityMultiplier,
      config.monthLightInkTolerance, config.monthMinContrastRatio, globalTypographyConfig,
    )
  // Bug fix (operator-reported): the rail line was hardcoded to yearInk
  // regardless of which dots actually sit on it. With months shown, month
  // dots dominate the rail (yearDarkInkSaturation/yearDarkInkOpacityMultiplier
  // and their month equivalents resolve to different pigments), so the line
  // visibly mismatched most of the dots it passes through. The line now
  // takes its color from whichever dot kind is actually rendered along it.
  const railInk = config.showMonths ? monthInk : yearInk
  // Bug fix (operator-reported, screenshot evidence): the year-marker dot
  // painted itself in yearInk — the year *label's* own ink, kept distinct
  // from monthInk so the label text can still read as a visual hierarchy
  // step above the months — while the rail line directly behind it now
  // paints in railInk. Those two inks are deliberately allowed to differ for
  // the label; the dot has no such reason to differ from the line it sits
  // on, so the dot's resting color is railInk too (see .dot's base rule in
  // ChronologyTimeline.module.css), not yearInk. --chronology-year-color
  // below still drives the label text alone.
  // Bug fix (operator-reported, screenshot evidence): dots used to dim via
  // the same CSS `opacity` as the label/items text. The rail line
  // (`.dated::before`) is a sibling of `.year`, so it's never actually
  // covered by the dimmed subtree's opacity — the browser flattens `.year`'s
  // whole subtree (dot included) into one layer and alpha-blends it as a
  // group, letting the always-opaque line underneath show straight through
  // the now-translucent dot. Dots stay opacity: 1 (fully opaque, so they
  // keep fully occluding the line) and instead blend toward a *solid*
  // lighter color via deriveOpaqueTint (the same "paint foreground over
  // background, keep the result opaque" primitive PolymorphicLayout's own
  // tint derivation uses) — same visual read as reduced opacity, no
  // compositing artifact. The year dot's faded blend now starts from railInk
  // (its own resting color, above) rather than yearInk, for the same reason.
  const yearDotFadedColor = deriveOpaqueTint(railInk, backgroundColor, config.yearHoverFadeDotOpacity)
  const monthDotFadedColor = deriveOpaqueTint(monthInk, backgroundColor, config.yearHoverFadeDotOpacity)
  const customProperties = {
    '--chronology-ink': railInk,
    '--chronology-year-color': yearInk,
    '--chronology-month-color': monthInk,
    '--chronology-year-dot': `${config.yearDotSize}px`,
    '--chronology-month-dot': `${config.monthDotSize}px`,
    '--chronology-content-gap-base': `${config.contentGap}rem`,
    '--chronology-content-gap-md': `${config.contentGapMd}rem`,
    '--chronology-content-gap-lg': `${config.contentGapLg}rem`,
    '--chronology-track-width-base': `${config.trackWidth}px`,
    '--chronology-track-width-md': `${config.trackWidthMd}px`,
    '--chronology-track-width-lg': `${config.trackWidthLg}px`,
    '--chronology-track-opacity-base': config.trackOpacity,
    '--chronology-track-opacity-md': config.trackOpacityMd,
    '--chronology-track-opacity-lg': config.trackOpacityLg,
    '--chronology-year-fade-opacity': config.yearHoverFadeOpacity,
    '--chronology-year-fade-dot-color': yearDotFadedColor,
    '--chronology-month-fade-dot-color': monthDotFadedColor,
    '--chronology-year-fade-duration': `${prefersReducedMotion ? 0 : config.yearHoverFadeDurationMs}ms`,
    '--chronology-year-fade-delay': `${prefersReducedMotion ? 0 : config.yearHoverFadeDelayMs}ms`,
    '--chronology-year-fade-easing': config.yearHoverFadeEasing,
  } as CSSProperties

  return <div className={styles.root} data-chronology="true" data-show-months={config.showMonths} data-year-sticky={config.yearStickyEnabled} data-year-placement={config.yearPlacement} data-year-placement-md={config.yearPlacementMd} data-year-placement-lg={config.yearPlacementLg} data-month-placement={config.monthPlacement} data-month-placement-md={config.monthPlacementMd} data-month-placement-lg={config.monthPlacementLg} data-month-format-base={config.monthNameFormat} data-month-format-md={config.monthNameFormatMd} data-month-format-lg={config.monthNameFormatLg} style={customProperties}>
    <div className={styles.dated} ref={datedRef}>
    {years.map(year => {
      const dimmed = hoverFadeEnabled && activeYearKey != null && activeYearKey !== year.key
      return <section
        className={styles.year}
        key={year.key}
        aria-label={year.key}
        data-chronology-year="true"
        ref={hoverFadeEnabled ? registerYearRef(year.key) : undefined}
        data-dimmed={dimmed ? 'true' : undefined}
        onMouseEnter={hoverFadeEnabled ? () => setHoveredYearKey(year.key) : undefined}
        onMouseLeave={hoverFadeEnabled ? () => setHoveredYearKey(current => current === year.key ? null : current) : undefined}
      >
        <div className={styles.yearRail} aria-hidden="true" />
        <div className={styles.markerRow}>
          <span className={styles.dot} data-kind="year" aria-hidden="true" />
          <h2 className={`${styles.label} ${config.yearFontSize} ${config.yearFontSizeMd} ${config.yearFontSizeLg} ${config.yearFontFamily} ${config.yearFontWeight} ${yearPaddingXDirectional} ${config.yearPaddingY} ${config.yearPaddingYMd} ${config.yearPaddingYLg}`} data-kind="year">{year.key}</h2>
        </div>
        {config.showMonths ? year.months.map(month => <ChronologyMonth
          key={month.key}
          month={month}
          year={year.key}
          config={config}
          renderItems={renderItems}
        />) : <div className={styles.items}>{renderItems(year.items)}</div>}
      </section>
    })}
    </div>
    {undated.length > 0 && <section className={styles.undated} aria-label="Undated articles">
      <h2 className={`${styles.label} ${config.yearFontSize} ${config.yearFontSizeMd} ${config.yearFontSizeLg} ${config.yearFontFamily} ${config.yearFontWeight}`}>More articles</h2>
      <div className={styles.items}>{renderItems(undated)}</div>
    </section>}
  </div>
}
