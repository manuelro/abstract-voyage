import { mixHex } from './color'

export function makeVerticalHQGradient(a: string | number, b: string | number, enableExtra: boolean) {
  if (!enableExtra) return `linear-gradient(to bottom, ${a} 0%, ${b} 100%)`
  const stops = [0, 0.12, 0.28, 0.56, 0.72, 0.88, 1]
  const parts = stops.map((p) => `${mixHex(a, b, p)} ${Math.round(p * 100)}%`)
  return `linear-gradient(to bottom, ${parts.join(', ')})`
}

// export default as well, so both `import { makeVerticalHQGradient }` and `import makeVerticalHQGradient` work
export default makeVerticalHQGradient
