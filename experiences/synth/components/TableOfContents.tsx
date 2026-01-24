export type HeadingItem = {
  id: string
  text: string
  level: number
}

export type FigureItem = {
  id: string
  caption?: string | null
  alt: string
}

type TableOfContentsProps = {
  headings: HeadingItem[]
  figures: FigureItem[]
  tocEnabled?: boolean
  tocHeadingsEnabled?: boolean
  tocFiguresEnabled?: boolean
  tocMinHeadings?: number
  tocMinFigures?: number
  onNavigate?: () => void
}

// Guard: render only when at least one section has meaningful items; shared row styles live here.
const tocLinkClass = 'block w-full rounded-md px-2 py-1 text-sm leading-snug text-white/60 hover:text-white hover:bg-white/5'

type TocRowProps = {
  href: string
  children: string
  onNavigate?: () => void
  indent?: boolean
}

const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const easeInOutCubic = (t: number) => (
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
)

const scrollToTarget = (targetId: string, onDone?: () => void) => {
  const target = document.getElementById(targetId)
  if (!target) return

  const prefersReduce = prefersReducedMotion()
  const startY = window.scrollY
  const targetTop = target.getBoundingClientRect().top + window.scrollY - 12
  const distance = targetTop - startY

  const duration = prefersReduce ? 0 : Math.min(700, Math.max(450, Math.abs(distance) * 0.5))
  const start = performance.now()

  const step = (now: number) => {
    const elapsed = now - start
    const t = duration === 0 ? 1 : Math.min(1, elapsed / duration)
    const eased = prefersReduce ? 1 : easeInOutCubic(t)
    window.scrollTo(0, startY + distance * eased)
    if (t < 1) {
      window.requestAnimationFrame(step)
    } else {
      target.focus({ preventScroll: true })
      onDone?.()
    }
  }

  window.requestAnimationFrame(step)
}

const TocRow = ({ href, children, onNavigate, indent }: TocRowProps) => {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!href.startsWith('#')) return
    event.preventDefault()
    const targetId = href.slice(1)
    onNavigate?.()
    if (typeof history !== 'undefined') {
      history.replaceState(null, '', href)
    }
    window.requestAnimationFrame(() => scrollToTarget(targetId))
  }

  return (
    <li className={[indent ? 'ml-3' : ''].join(' ')}>
      <a href={href} className={tocLinkClass} onClick={handleClick}>
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
  onNavigate,
}: TableOfContentsProps) {
  const showHeadings = tocEnabled && tocHeadingsEnabled && headings.length >= tocMinHeadings
  const showFigures = tocEnabled && tocFiguresEnabled && figures.length >= tocMinFigures
  const showToc = tocEnabled && (showHeadings || showFigures)

  // Guard: render only when at least one section has meaningful items.
  if (!showToc) return null
  return (
    <nav className="text-sm text-white/60">
      {showHeadings ? (
        <>
          <div className="text-xs uppercase tracking-wide text-white/80 pl-2">On this page</div>
          <ul className="mt-3 space-y-1">
            {headings.map((item) => (
              <TocRow
                key={item.id}
                href={`#${item.id}`}
                // indent={true}
                onNavigate={onNavigate}
              >
                {item.text}
              </TocRow>
            ))}
          </ul>
        </>
      ) : null}
      {showFigures ? (
        <>
          <div className={`${showHeadings ? 'mt-4' : ''} text-xs uppercase tracking-wide text-white/80 pl-2`}>Figures</div>
          <ul className="mt-3 space-y-1">
            {figures.map((figure) => (
              <TocRow
                key={figure.id}
                href={`#${figure.id}`}
                // indent={true}
                onNavigate={onNavigate}
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
