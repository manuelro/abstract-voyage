// CSS timing functions evaluated in JS — used when an animation must be driven
// frame-by-frame (e.g. device-pixel-snapped transforms) while matching the feel
// of the equivalent CSS transition exactly. Same unit-bezier math the engines
// use (Newton–Raphson with bisection fallback, WebKit-style).

export type EasingFunction = (progress: number) => number

const KEYWORD_PARAMS: Record<string, [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
}

const parseCubicBezier = (
  css: string,
): [number, number, number, number] | null => {
  const match = /^cubic-bezier\(([^)]+)\)$/.exec(css)
  if (!match) return null
  const parts = match[1].split(',').map((part) => Number(part.trim()))
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
    return null
  }
  return parts as unknown as [number, number, number, number]
}

const createUnitBezier = (
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
): EasingFunction => {
  const cx = 3 * p1x
  const bx = 3 * (p2x - p1x) - cx
  const ax = 1 - cx - bx
  const cy = 3 * p1y
  const by = 3 * (p2y - p1y) - cy
  const ay = 1 - cy - by

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const sampleDerivativeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx

  const solveT = (x: number) => {
    // Newton–Raphson — converges in a few iterations for well-behaved curves.
    let t = x
    for (let i = 0; i < 8; i += 1) {
      const error = sampleX(t) - x
      if (Math.abs(error) < 1e-6) return t
      const derivative = sampleDerivativeX(t)
      if (Math.abs(derivative) < 1e-6) break
      t -= error / derivative
    }

    // Bisection fallback for flat-derivative regions.
    let lo = 0
    let hi = 1
    t = x
    for (let i = 0; i < 24 && lo < hi; i += 1) {
      const error = sampleX(t) - x
      if (Math.abs(error) < 1e-6) return t
      if (error > 0) hi = t
      else lo = t
      t = (lo + hi) / 2
    }
    return t
  }

  return (progress: number) => {
    if (progress <= 0) return 0
    if (progress >= 1) return 1
    return sampleY(solveT(progress))
  }
}

/**
 * Build a JS easing function from a CSS timing-function string.
 * Supports 'linear', the cubic-bezier keywords, and 'cubic-bezier(a, b, c, d)'.
 * Unknown inputs fall back to linear.
 */
export const createCssEasingFunction = (css: string): EasingFunction => {
  const normalized = (css || '').trim().toLowerCase()
  if (normalized === 'linear' || normalized === '') return (t) => t
  const params = KEYWORD_PARAMS[normalized] ?? parseCubicBezier(normalized)
  if (!params) return (t) => t
  return createUnitBezier(params[0], params[1], params[2], params[3])
}
