const easeInOutCubic = (t: number) => (
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
)

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Starts one focus-preserving scroll transaction and returns its cancel handle. */
export function scrollToElementTarget(
  targetId: string,
  offsetPx: number,
  onDone?: () => void,
) {
  const target = document.getElementById(targetId)
  if (!target) return undefined

  const reduceMotion = prefersReducedMotion()
  const startY = window.scrollY
  const targetTop = target.getBoundingClientRect().top + window.scrollY - Math.max(0, offsetPx)
  const distance = targetTop - startY
  const duration = reduceMotion ? 0 : Math.min(700, Math.max(450, Math.abs(distance) * 0.5))
  const start = performance.now()
  let animationFrame: number | undefined
  let cancelled = false

  const cancel = () => {
    cancelled = true
    if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame)
  }

  const step = (now: number) => {
    if (cancelled) return
    const elapsed = now - start
    const t = duration === 0 ? 1 : Math.min(1, elapsed / duration)
    const eased = reduceMotion ? 1 : easeInOutCubic(t)
    window.scrollTo(0, startY + distance * eased)
    if (t < 1) {
      animationFrame = window.requestAnimationFrame(step)
    } else {
      target.focus({ preventScroll: true })
      onDone?.()
    }
  }

  animationFrame = window.requestAnimationFrame(step)
  return cancel
}
