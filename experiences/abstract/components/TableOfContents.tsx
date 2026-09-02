import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { CTA_BUTTON_MOTION_EASINGS } from '../../../components/CtaButton/config/registered'
import { MD_BREAKPOINT_PX, LG_BREAKPOINT_PX } from '../../../components/breakpoints'
import {
  resolveArticleOutlineVisible,
  selectCurrentOutlineTarget,
  type FigureItem,
  type HeadingItem,
} from '../../../helpers/articleOutline'
import {
  prefersReducedMotion,
  scrollToElementTarget,
} from '../../../helpers/cancellableScroll'
import type { TableOfContentsConfig } from './TableOfContents/config/registered'
import type { TableOfContentsPresentation } from './TableOfContents/types'

type TableOfContentsProps = {
  headings: HeadingItem[]
  figures: FigureItem[]
  tocEnabled?: boolean
  tocHeadingsEnabled?: boolean
  tocFiguresEnabled?: boolean
  tocMinHeadings?: number
  tocMinFigures?: number
  showTitle?: boolean
  onNavigate?: () => void
  presentation?: TableOfContentsPresentation
  presentationConfig?: TableOfContentsConfig
  currentSectionLinePx?: number
}

/** Mirrors TableOfContents' own internal render guard (see its `showToc`
 * below) so a caller wrapping this component (e.g. TableOfContentsDisclosure)
 * can decide whether to render its own chrome around it without duplicating
 * — and risking drifting from — that gating logic. */
export const resolveTableOfContentsVisible = resolveArticleOutlineVisible

// State colors and timing are resolved from the ToC config rather than fixed
// white utilities, retaining contrast against whichever column it occupies.
const tocLinkClass = 'flex w-full items-center rounded-md transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--toc-active-ink)]'

type TocRowProps = {
  href: string
  children: string
  onNavigate?: (targetId: string) => void
  indent?: boolean
  presentation?: TableOfContentsPresentation
  presentationConfig?: TableOfContentsConfig
  visualState: TocVisualState
  motionAllowed: boolean
  onPointerEnter?: () => void
  onPointerLeave?: () => void
  onFocus?: () => void
  onBlur?: () => void
}

type TocVisualState =
  | 'resting'
  | 'hovered'
  | 'hover-hold'
  | 'hover-settling'
  | 'hover-release'
  | 'active'
  | 'active-exiting'
  | 'active-release'

const transitionStyleFor = (
  visualState: TocVisualState,
  config: TableOfContentsConfig,
  motionAllowed: boolean,
): Pick<CSSProperties, 'transitionProperty' | 'transitionDuration' | 'transitionTimingFunction' | 'transitionDelay'> => {
  const isActiveState = visualState === 'active' || visualState === 'active-exiting' || visualState === 'active-release'
  const isExitHandoff = visualState === 'hover-settling' || visualState === 'active-exiting'
  const fillDuration = !motionAllowed
    ? 0
    : visualState === 'hovered'
      ? config.hoverEnterDurationMs
      : visualState === 'active'
        ? config.activeEnterDurationMs
        : visualState === 'hover-settling'
          ? config.hoverStateOverlapMs
          : visualState === 'active-exiting'
            ? config.activeTransitionOverlapMs
            : isActiveState
              ? config.activeExitDurationMs
              : config.hoverExitDurationMs
  const easing = visualState === 'hovered' || visualState === 'active'
    ? CTA_BUTTON_MOTION_EASINGS[visualState === 'active' ? config.activeEnterEasing : config.hoverEnterEasing]
    : CTA_BUTTON_MOTION_EASINGS[isActiveState ? config.activeExitEasing : config.hoverExitEasing]
  const delay = !motionAllowed
    ? 0
    : visualState === 'hover-settling'
      ? config.hoverExitDelayMs
      : visualState === 'active-exiting'
        ? config.activeExitDelayMs
        : 0
  const colorDuration = Math.round(fillDuration * config.colorTransitionRatio)
  return {
    transitionProperty: 'color, background-color, border-color',
    transitionDuration: `${colorDuration}ms, ${fillDuration}ms, ${colorDuration}ms`,
    transitionTimingFunction: `${easing}, ${easing}, ${easing}`,
    transitionDelay: isExitHandoff ? `${delay}ms, ${delay}ms, ${delay}ms` : '0ms, 0ms, 0ms',
  }
}

export const selectCurrentTocTarget = selectCurrentOutlineTarget

const TocRow = ({
  href,
  children,
  onNavigate,
  indent,
  presentation,
  presentationConfig,
  visualState,
  motionAllowed,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
}: TocRowProps) => {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!href.startsWith('#')) return
    event.preventDefault()
    const targetId = href.slice(1)
    if (typeof history !== 'undefined') {
      history.replaceState(null, '', href)
    }
    onNavigate?.(targetId)
  }

  const isActiveVisual = visualState === 'active' || visualState === 'active-exiting'
  const isHoverVisual = visualState === 'hovered' || visualState === 'hover-hold'
  const isHoverSettling = visualState === 'hover-settling'
  const isActiveExit = visualState === 'active-exiting'
  const ink = isActiveVisual
    ? presentation?.activeInk
    : isHoverVisual
      ? presentation?.hoverInk
      : presentation?.textInk
  const background = isActiveVisual
    ? (isActiveExit ? presentation?.activeSettlingBackground : presentation?.activeBackground)
    : isHoverVisual
      ? presentation?.hoverBackground
      : isHoverSettling
        ? presentation?.hoverSettlingBackground
        : 'transparent'

  return (
    <li
      className={[
        indent ? 'ml-3' : '',
        presentationConfig?.itemIndent,
      ].filter(Boolean).join(' ')}
    >
      <a
        href={href}
        className={[
          tocLinkClass,
          presentationConfig?.itemFontSize,
          presentationConfig?.itemLeading,
          presentationConfig?.itemPaddingX,
          presentationConfig?.itemPaddingY,
          presentationConfig?.coarsePointerMinHeight,
          presentationConfig?.itemFontFamily === 'inherit' ? '' : presentationConfig?.itemFontFamily,
          isActiveVisual && presentationConfig?.activeFontWeightEnabled
            ? presentationConfig.activeFontWeight
            : '',
          presentationConfig?.activeIndicatorEnabled && isActiveVisual
            ? presentationConfig.activeIndicatorWidth
            : '',
          // `border-current` inherits the active link ink below, so marker
          // contrast remains coupled to the current-section text recipe.
          presentationConfig?.activeIndicatorEnabled && isActiveVisual ? 'border-current' : '',
        ].filter(Boolean).join(' ')}
        onClick={handleClick}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        style={presentation && presentationConfig ? {
          color: ink,
          backgroundColor: background,
          '--toc-active-ink': presentation.activeInk,
          ...transitionStyleFor(visualState, presentationConfig, motionAllowed),
        } as CSSProperties : undefined}
      >
        {children}
      </a>
    </li>
  )
}

export default function TableOfContents({
  headings,
  figures,
  tocEnabled = true,
  tocHeadingsEnabled = true,
  tocFiguresEnabled = true,
  tocMinHeadings = 2,
  tocMinFigures = 1,
  showTitle = true,
  onNavigate,
  presentation,
  presentationConfig,
  // No default here, deliberately: undefined must mean "the caller's own
  // offset isn't measured yet" (e.g. pages/posts-lab/[slug].tsx's
  // splitColumnHeaderHeightPx before its ResizeObserver's first callback),
  // not "use some guessed constant." The active-section tracking effect
  // below never computes against this until the reader's first scroll (see
  // hasInteractedRef there), so a guessed value here could still lock in a
  // wrong heading the moment scrolling starts, rather than only once the
  // real, live-measured offset is in place.
  currentSectionLinePx,
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pointerHoveredId, setPointerHoveredId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [hoverHoldId, setHoverHoldId] = useState<string | null>(null)
  const [hoverSettlingId, setHoverSettlingId] = useState<string | null>(null)
  const [hoverReleaseId, setHoverReleaseId] = useState<string | null>(null)
  const [delayedHoverId, setDelayedHoverId] = useState<string | null>(null)
  const [activeExitingId, setActiveExitingId] = useState<string | null>(null)
  const [activeReleaseId, setActiveReleaseId] = useState<string | null>(null)
  const [pendingNavigationId, setPendingNavigationId] = useState<string | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const hoverPreviousIdRef = useRef<string | null>(null)
  const activePreviousIdRef = useRef<string | null>(null)
  const hoverTimersRef = useRef<number[]>([])
  const hoverEnterTimerRef = useRef<number | undefined>(undefined)
  const activeTimersRef = useRef<number[]>([])
  const navigationCancelRef = useRef<(() => void) | undefined>(undefined)
  const navigationSequenceRef = useRef(0)
  const pendingNavigationRef = useRef<string | null>(null)
  // Tracks whether the reader has scrolled at least once. A fresh page load
  // must show no active ToC item — the reading line only starts governing
  // the highlight after real reader interaction, not from the untouched
  // initial scroll position.
  const hasInteractedRef = useRef(false)
  const showHeadings = tocEnabled && tocHeadingsEnabled && headings.length >= tocMinHeadings
  const showFigures = tocEnabled && tocFiguresEnabled && figures.length >= tocMinFigures
  const showToc = resolveTableOfContentsVisible({ headings, figures, tocEnabled, tocHeadingsEnabled, tocFiguresEnabled, tocMinHeadings, tocMinFigures })
  const trackingItemIds = useMemo(() => (
    Array.from(new Set([
      ...(showHeadings ? headings.map(({ id }) => id) : []),
      ...(showFigures ? figures.map(({ id }) => id) : []),
    ]))
  ), [figures, headings, showFigures, showHeadings])
  const hoverCandidateId = presentationConfig?.hoverStateEnabled
    ? focusedId ?? pointerHoveredId
    : null
  const requestedHoverId = delayedHoverId
  const motionAllowed = Boolean(presentationConfig?.motionEnabled) && !reducedMotion

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => () => {
    hoverTimersRef.current.forEach(window.clearTimeout)
    activeTimersRef.current.forEach(window.clearTimeout)
    if (hoverEnterTimerRef.current !== undefined) window.clearTimeout(hoverEnterTimerRef.current)
    navigationSequenceRef.current += 1
    navigationCancelRef.current?.()
  }, [])

  // The timeline's hover contract intentionally delays only arrival: a
  // pointer/focus that leaves before the delay expires never produces a
  // hover state, while leaving an already-hovered row begins its existing
  // release choreography immediately.
  useEffect(() => {
    if (hoverEnterTimerRef.current !== undefined) {
      window.clearTimeout(hoverEnterTimerRef.current)
      hoverEnterTimerRef.current = undefined
    }
    if (!motionAllowed || !hoverCandidateId) {
      setDelayedHoverId(null)
      return undefined
    }
    if (hoverCandidateId === delayedHoverId) return undefined
    setDelayedHoverId(null)
    const delay = presentationConfig?.hoverEnterDelayMs ?? 0
    if (delay <= 0) {
      setDelayedHoverId(hoverCandidateId)
      return undefined
    }
    hoverEnterTimerRef.current = window.setTimeout(() => {
      hoverEnterTimerRef.current = undefined
      setDelayedHoverId(hoverCandidateId)
    }, delay)
    return undefined
  }, [delayedHoverId, hoverCandidateId, motionAllowed, presentationConfig?.hoverEnterDelayMs])

  useEffect(() => {
    const clearHoverTimers = () => {
      hoverTimersRef.current.forEach(window.clearTimeout)
      hoverTimersRef.current = []
    }
    const previousId = hoverPreviousIdRef.current
    if (!motionAllowed) {
      clearHoverTimers()
      setHoverHoldId(null)
      setHoverSettlingId(null)
      setHoverReleaseId(null)
      hoverPreviousIdRef.current = requestedHoverId
      return undefined
    }
    if (previousId === requestedHoverId) return undefined

    if (requestedHoverId && (
      requestedHoverId === hoverHoldId
      || requestedHoverId === hoverSettlingId
      || requestedHoverId === hoverReleaseId
    )) {
      clearHoverTimers()
      setHoverHoldId(null)
      setHoverSettlingId(null)
      setHoverReleaseId(null)
    }

    if (previousId) {
      clearHoverTimers()
      setHoverHoldId(previousId)
      setHoverSettlingId(null)
      setHoverReleaseId(null)
      const beginSettling = window.setTimeout(() => {
        setHoverHoldId(current => current === previousId ? null : current)
        setHoverSettlingId(previousId)
        const beginRelease = window.setTimeout(() => {
          setHoverSettlingId(current => current === previousId ? null : current)
          setHoverReleaseId(previousId)
          const finishRelease = window.setTimeout(() => {
            setHoverReleaseId(current => current === previousId ? null : current)
          }, presentationConfig?.hoverExitDurationMs ?? 0)
          hoverTimersRef.current.push(finishRelease)
        }, (presentationConfig?.hoverExitDelayMs ?? 0) + (presentationConfig?.hoverStateOverlapMs ?? 0))
        hoverTimersRef.current.push(beginRelease)
      }, presentationConfig?.hoverExitHoldMs ?? 0)
      hoverTimersRef.current.push(beginSettling)
    }
    hoverPreviousIdRef.current = requestedHoverId
    return undefined
  }, [hoverHoldId, hoverReleaseId, hoverSettlingId, motionAllowed, presentationConfig?.hoverExitDelayMs, presentationConfig?.hoverExitDurationMs, presentationConfig?.hoverExitHoldMs, presentationConfig?.hoverStateOverlapMs, requestedHoverId])

  useEffect(() => {
    const clearActiveTimers = () => {
      activeTimersRef.current.forEach(window.clearTimeout)
      activeTimersRef.current = []
    }
    const previousId = activePreviousIdRef.current
    if (!motionAllowed) {
      clearActiveTimers()
      setActiveExitingId(null)
      setActiveReleaseId(null)
      activePreviousIdRef.current = activeId
      return undefined
    }
    if (previousId === activeId) return undefined
    if (previousId) {
      clearActiveTimers()
      setActiveExitingId(previousId)
      setActiveReleaseId(null)
      const beginRelease = window.setTimeout(() => {
        setActiveExitingId(current => current === previousId ? null : current)
        setActiveReleaseId(previousId)
        const finishRelease = window.setTimeout(() => {
          setActiveReleaseId(current => current === previousId ? null : current)
        }, presentationConfig?.activeExitDurationMs ?? 0)
        activeTimersRef.current.push(finishRelease)
      }, (presentationConfig?.activeExitDelayMs ?? 0) + (presentationConfig?.activeTransitionOverlapMs ?? 0))
      activeTimersRef.current.push(beginRelease)
    }
    activePreviousIdRef.current = activeId
    return undefined
  }, [activeId, motionAllowed, presentationConfig?.activeExitDelayMs, presentationConfig?.activeExitDurationMs, presentationConfig?.activeTransitionOverlapMs])

  useEffect(() => {
    if (!presentationConfig?.activeSectionTrackingEnabled || !trackingItemIds.length || typeof window === 'undefined') {
      setActiveId(null)
      return undefined
    }
    // Explicit ToC navigation owns current-section state until its requested
    // destination has reached the shared reading line and layout has settled.
    // Scroll events emitted by the in-flight animation must not select the
    // intermediate section beneath that line.
    if (pendingNavigationId) return undefined
    // currentSectionLinePx's own caller-side offset (e.g. a live-measured
    // fixed-header height) isn't ready yet — deliberately not falling back
    // to a guessed number here, and not registering scroll/resize listeners
    // below until it's real, so the reader's first scroll is always judged
    // against the true offset rather than a placeholder.
    if (typeof currentSectionLinePx !== 'number' || !Number.isFinite(currentSectionLinePx)) return undefined
    const targets = trackingItemIds
      .map(id => document.getElementById(id))
      .filter((target): target is HTMLElement => target !== null)
    if (!targets.length) {
      setActiveId(null)
      return undefined
    }

    let animationFrame: number | undefined
    let settleTimer: number | undefined
    const updateActiveTarget = () => {
      animationFrame = undefined
      if (pendingNavigationRef.current) return
      // A heading near the very end of the article (little/no content below
      // it) can be geometrically unreachable at the reading line — bringing
      // its top up to currentSectionLinePx would require scrolling past the
      // document's own max scrollY, which window.scrollTo silently clamps.
      // Confirmed via measurement on this page's "Closing Thoughts" heading
      // (needed scrollY 8521.5 vs. a document max of 8166): without this,
      // the reading line permanently sits above that heading and the
      // previous one stays reported active even after navigating straight
      // to it. Once the viewport is scrolled to the document's own bottom,
      // there's nothing further to read past whatever's currently last on
      // screen — the reading-line threshold no longer means anything.
      const atDocumentBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1
      const targetRects = targets.map(target => ({ id: target.id, top: target.getBoundingClientRect().top }))
      setActiveId(current => {
        if (atDocumentBottom) {
          // At the clamp, several headings can be simultaneously "reached"
          // (nothing distinguishes them anymore), so picking one is a guess.
          // Rather than force a specific pick every time a passive scroll/
          // resize event re-runs this (e.g. a font finishing load after an
          // explicit ToC navigation already landed here), keep whatever is
          // already active as long as it's still visible on screen. Only
          // fall back to admitting every target and letting the bottom-most
          // one win once the active heading has actually scrolled out of
          // view — e.g. the reader kept scrolling past it to the true end.
          const currentStillVisible = current !== null && targetRects.some(
            target => target.id === current && target.top >= 0 && target.top <= window.innerHeight,
          )
          if (currentStillVisible) return current
          const targetId = selectCurrentTocTarget(targetRects, Number.POSITIVE_INFINITY)
          return current === targetId ? current : targetId
        }
        const targetId = selectCurrentTocTarget(targetRects, Math.max(0, currentSectionLinePx))
        return current === targetId ? current : targetId
      })
    }
    const scheduleActiveTargetUpdate = () => {
      if (pendingNavigationRef.current) return
      if (animationFrame === undefined) animationFrame = window.requestAnimationFrame(updateActiveTarget)
      if (settleTimer !== undefined) {
        window.clearTimeout(settleTimer)
        settleTimer = undefined
      }
      window.cancelAnimationFrame(animationFrame)
      animationFrame = undefined
      settleTimer = window.setTimeout(() => {
        settleTimer = undefined
        if (pendingNavigationRef.current || animationFrame !== undefined) return
        animationFrame = window.requestAnimationFrame(updateActiveTarget)
      }, presentationConfig.activeSectionTrackingSettleMs)
    }

    // A single reading line is more predictable than an observer band:
    // it chooses the last rendered ToC target the reader has crossed, or
    // the next target before the first crossing. It also shares the exact
    // measured header offset used by ToC navigation.
    //
    // Deliberately no immediate compute-on-mount here: a fresh page load
    // shows no active ToC item until the reader actually scrolls. Resize/
    // layout-shift events (font loads, images, the ResizeObserver below)
    // don't count as reader interaction on their own — only a real scroll
    // does — so they're ignored until scrolling has happened at least once.
    const scheduleAfterScroll = () => {
      hasInteractedRef.current = true
      scheduleActiveTargetUpdate()
    }
    const scheduleAfterResize = () => {
      if (!hasInteractedRef.current) return
      scheduleActiveTargetUpdate()
    }
    window.addEventListener('scroll', scheduleAfterScroll, { passive: true })
    window.addEventListener('resize', scheduleAfterResize)
    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(scheduleAfterResize)
      : null
    resizeObserver?.observe(document.documentElement)
    return () => {
      window.removeEventListener('scroll', scheduleAfterScroll)
      window.removeEventListener('resize', scheduleAfterResize)
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame)
      if (settleTimer !== undefined) window.clearTimeout(settleTimer)
      resizeObserver?.disconnect()
    }
  }, [currentSectionLinePx, pendingNavigationId, presentationConfig?.activeSectionTrackingEnabled, presentationConfig?.activeSectionTrackingSettleMs, trackingItemIds])

  const navigateTo = (targetId: string) => {
    if (typeof window === 'undefined') return
    const sequence = navigationSequenceRef.current + 1
    navigationSequenceRef.current = sequence
    navigationCancelRef.current?.()
    pendingNavigationRef.current = targetId
    setPendingNavigationId(targetId)
    onNavigate?.()

    const completeNavigation = () => {
      // Two layout frames ensure scrolling, focus, sticky containment, and
      // browser scroll events have all settled before committing the selected
      // link. Commit the requested ID rather than re-inferring it from an
      // ambiguous reading line when adjacent targets share the viewport.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (navigationSequenceRef.current !== sequence) return
          setActiveId(targetId)
          pendingNavigationRef.current = null
          navigationCancelRef.current = undefined
          setPendingNavigationId(null)
        })
      })
    }

    // A real click is a different situation from the passive mount-race
    // this file's other currentSectionLinePx guard exists for: a 0 fallback
    // here only affects the scroll distance of one explicit, user-initiated
    // jump (still lands on the right heading, just without the header
    // clearance), and completeNavigation always sets activeId to the
    // clicked target explicitly afterward regardless — there's no risk of
    // a silently-wrong, permanently-stuck highlight the way the passive
    // path had.
    navigationCancelRef.current = scrollToElementTarget(targetId, currentSectionLinePx ?? 0, completeNavigation)
    if (!navigationCancelRef.current) {
      pendingNavigationRef.current = null
      setPendingNavigationId(null)
    }
  }

  // Corrects a fresh page load's own scroll position when the URL already
  // names a heading/figure (e.g. .../feature-toggles-react#testing-the-
  // integration). The browser's own native scroll-to-fragment runs at
  // whatever moment it runs — often before hydration, web fonts, or (on
  // this page) the live-measured fixed-header height have settled the
  // page's real, final layout — and nothing browser-native re-corrects it
  // afterward if content above the target still grows. Confirmed root
  // cause of the ToC mis-highlight bug this effect fixes: under real-world
  // conditions (throttled CPU, slow font load), the native jump can land
  // 200px+ off from the target's true position, with scrollY never
  // changing again on its own — the active-tracking effect above then
  // (correctly, per its own reading-line logic) reports whatever heading
  // that wrong-but-final scroll position actually corresponds to, which is
  // the *previous* heading, not the requested one.
  // Reuses navigateTo/scrollToTarget verbatim — the exact same corrective
  // scroll a real ToC click already performs, run once automatically
  // instead of waiting for the reader to click a link to fix it themselves.
  // Gated on currentSectionLinePx being a real, measured number (not the
  // placeholder-avoidance guard above's own concern re-appearing here) so
  // this corrects to the *final* layout's offset, not an early guess.
  const initialHashCorrectedRef = useRef(false)
  useEffect(() => {
    if (initialHashCorrectedRef.current) return
    if (typeof window === 'undefined' || typeof currentSectionLinePx !== 'number' || !Number.isFinite(currentSectionLinePx)) return
    if (!trackingItemIds.length) return
    const hashId = window.location.hash.slice(1)
    if (!hashId || !trackingItemIds.includes(hashId)) return
    initialHashCorrectedRef.current = true
    navigateTo(hashId)
    // navigateTo intentionally omitted from deps — it's a plain function
    // recreated every render, and this effect must run exactly once
    // (guarded by the ref above) as soon as currentSectionLinePx first
    // becomes a real number, not on every render navigateTo's identity
    // changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionLinePx, trackingItemIds])

  const visualStateFor = (id: string): TocVisualState => {
    if (activeId === id) return 'active'
    if (activeExitingId === id) return 'active-exiting'
    if (activeReleaseId === id) return 'active-release'
    if (requestedHoverId === id) return 'hovered'
    if (hoverHoldId === id) return 'hover-hold'
    if (hoverSettlingId === id) return 'hover-settling'
    if (hoverReleaseId === id) return 'hover-release'
    return 'resting'
  }
  const hoverHandlersFor = (id: string) => ({
    onPointerEnter: () => setPointerHoveredId(id),
    onPointerLeave: () => setPointerHoveredId(current => current === id ? null : current),
    onFocus: () => setFocusedId(id),
    onBlur: () => setFocusedId(current => current === id ? null : current),
  })

  // Guard: render only when at least one section has meaningful items.
  if (!showToc) return null
  return (
    <nav
      className={[
        'text-sm',
        presentationConfig?.maxWidth,
      ].filter(Boolean).join(' ')}
      style={presentation && presentationConfig ? {
        color: presentation.textInk,
      } : undefined}
    >
      {showHeadings ? (
        <>
          {showTitle ? (
            <div
              className={[
                presentationConfig
                  ? [
                    presentationConfig.labelFontSize,
                    presentationConfig.labelTracking,
                    presentationConfig.labelIndent,
                    presentationConfig.labelUppercase ? 'uppercase' : 'normal-case',
                    presentationConfig.labelFontFamily === 'inherit' ? '' : presentationConfig.labelFontFamily,
                  ].join(' ')
                  : 'text-xs uppercase tracking-wide pl-2',
              ].join(' ')}
              style={presentation && presentationConfig ? {
                color: presentation.labelInk,
              } : undefined}
            >On this page</div>
          ) : null}
          <ul
            className={presentationConfig ? ['mt-3 flex flex-col', presentationConfig.itemGap].join(' ') : 'mt-3 space-y-1'}
          >
            {headings.map((item) => (
              <TocRow
                key={item.id}
                href={`#${item.id}`}
                // indent={true}
              onNavigate={navigateTo}
              presentation={presentation}
              presentationConfig={presentationConfig}
              visualState={visualStateFor(item.id)}
              motionAllowed={motionAllowed}
              {...hoverHandlersFor(item.id)}
              >
                {item.text}
              </TocRow>
            ))}
          </ul>
        </>
      ) : null}
      {showFigures ? (
        <>
          <div
            className={[
              showHeadings && presentationConfig ? presentationConfig.groupMarginTop : showHeadings ? 'mt-4' : '',
              presentationConfig
                ? [
                  presentationConfig.labelFontSize,
                  presentationConfig.labelTracking,
                  presentationConfig.labelIndent,
                  presentationConfig.labelUppercase ? 'uppercase' : 'normal-case',
                  presentationConfig.labelFontFamily === 'inherit' ? '' : presentationConfig.labelFontFamily,
                ].join(' ')
                : 'text-xs uppercase tracking-wide pl-2',
            ].filter(Boolean).join(' ')}
              style={presentation && presentationConfig ? {
                color: presentation.labelInk,
              } : undefined}
          >Figures</div>
          <ul
            className={presentationConfig ? ['mt-3 flex flex-col', presentationConfig.itemGap].join(' ') : 'mt-3 space-y-1'}
          >
            {figures.map((figure) => (
              <TocRow
                key={figure.id}
                href={`#${figure.id}`}
                // indent={true}
                onNavigate={navigateTo}
                presentation={presentation}
                presentationConfig={presentationConfig}
                visualState={visualStateFor(figure.id)}
                motionAllowed={motionAllowed}
                {...hoverHandlersFor(figure.id)}
              >
                {figure.caption ?? figure.alt}
              </TocRow>
            ))}
          </ul>
        </>
      ) : null}
    </nav>
  )
}

// Literal per prefix, never interpolated (this codebase's Tailwind-only
// styling rule) — hides the disclosure's own <summary> toggle once the
// page's split-column layout actually leaves its stacked state, matching
// components/SplitColumnLayout.tsx's own firstSplitTierPrefix resolution so
// the toggle disappears at exactly the width the columns stop stacking, not
// a separately-guessed breakpoint.
const SUMMARY_HIDDEN_CLASS_BY_PREFIX: Record<'md' | 'lg', string> = {
  md: 'md:hidden',
  lg: 'lg:hidden',
}
// MD_BREAKPOINT_PX/LG_BREAKPOINT_PX (components/breakpoints.ts) — the one
// shared source, not a separately-hardcoded copy of the same pair (see
// PLAN-CENTRALIZED-BREAKPOINTS-RESPONSIVE-CARD-STACK.md).
const SPLIT_BREAKPOINT_PX: Record<'md' | 'lg', number> = {
  md: MD_BREAKPOINT_PX,
  lg: LG_BREAKPOINT_PX,
}

export type TableOfContentsDisclosureProps = TableOfContentsProps & {
  /** components/SplitColumnLayout.tsx's own firstSplitTierPrefix(narrowColumnWidthTierMd,
   * narrowColumnWidthTierLg) — 'md' | 'lg' | null. Below this width the ToC
   * renders as a real, user-toggleable native disclosure; at and above it,
   * the toggle is hidden and the content is always shown, matching this
   * page's pre-disclosure behavior exactly. null (layout never leaves
   * stacked) keeps the disclosure active at every width. */
  splitBreakpointPrefix: 'md' | 'lg' | null
  /** Whether the disclosure starts collapsed below splitBreakpointPrefix.
   * Ignored at/above it (always expanded there regardless). */
  collapsedByDefaultWhenStacked?: boolean
  /** Starts the disclosure open, instead of collapsed, when the page loads
   * with a URL hash pointing at one of this ToC's own tracked
   * headings/figures — the same deep-link scenario TableOfContents' own
   * initialHashCorrectedRef effect already corrects scroll position for. */
  autoExpandOnActiveSection?: boolean
  summaryLabel?: string
}

/**
 * Progressive-enhancement-shaped wrapper: the underlying <details> ships
 * open in server-rendered markup (a reader with JS disabled always sees the
 * full ToC — functional, just not collapsible), so no JS is required for
 * either the stacked or split-tier state to work at all. JS only enhances
 * this once mounted, collapsing it by default below splitBreakpointPrefix
 * when collapsedByDefaultWhenStacked is set. The <summary> toggle itself is
 * hidden via a literal, breakpoint-matched Tailwind class (not JS) at and
 * above splitBreakpointPrefix, so there's nothing to neutralize there —
 * content is simply always visible, same as before this wrapper existed.
 */
export function TableOfContentsDisclosure({
  splitBreakpointPrefix,
  collapsedByDefaultWhenStacked = true,
  autoExpandOnActiveSection = true,
  summaryLabel = 'Table of contents',
  ...tocProps
}: TableOfContentsDisclosureProps) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    if (!splitBreakpointPrefix || !collapsedByDefaultWhenStacked) {
      setOpen(true)
      return undefined
    }
    const query = window.matchMedia(`(min-width: ${SPLIT_BREAKPOINT_PX[splitBreakpointPrefix]}px)`)
    const trackedIds = new Set([
      ...tocProps.headings.map(({ id }) => id),
      ...tocProps.figures.map(({ id }) => id),
    ])
    const update = () => {
      if (query.matches) {
        setOpen(true)
        return
      }
      const hashId = window.location.hash.slice(1)
      setOpen(autoExpandOnActiveSection && hashId.length > 0 && trackedIds.has(hashId))
    }
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [autoExpandOnActiveSection, collapsedByDefaultWhenStacked, splitBreakpointPrefix, tocProps.figures, tocProps.headings])

  if (!resolveTableOfContentsVisible(tocProps)) return null

  const summaryHiddenClassName = splitBreakpointPrefix ? SUMMARY_HIDDEN_CLASS_BY_PREFIX[splitBreakpointPrefix] : ''

  return (
    <details
      open={open}
      onToggle={event => setOpen(event.currentTarget.open)}
      className="group"
    >
      <summary
        data-toc-summary="true"
        className={[
          'flex cursor-pointer select-none items-center gap-1.5',
          tocProps.presentationConfig
            ? [
              tocProps.presentationConfig.coarsePointerMinHeight,
              tocProps.presentationConfig.labelFontSize,
              tocProps.presentationConfig.labelTracking,
              tocProps.presentationConfig.labelIndent,
              tocProps.presentationConfig.labelUppercase ? 'uppercase' : 'normal-case',
              tocProps.presentationConfig.labelFontFamily === 'inherit' ? '' : tocProps.presentationConfig.labelFontFamily,
            ].join(' ')
            : 'text-xs uppercase tracking-wide pl-2',
          summaryHiddenClassName,
        ].filter(Boolean).join(' ')}
        style={tocProps.presentation ? { color: tocProps.presentation.labelInk } : undefined}
      >
        {summaryLabel}
        <span aria-hidden className="inline-block transition-transform group-open:rotate-90">›</span>
      </summary>
      <TableOfContents {...tocProps} />
    </details>
  )
}
