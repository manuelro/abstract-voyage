const clampPercent = (v: number) => Math.max(0, Math.min(100, v))

type DockArcConfig = {
  peakX: number
  arcLift: number
  hueAmplitude: number
  angleAmplitude: number
  anchorBaseY: number
}

export const computeArcRow = (
  index: number,
  center: number,
  last: number,
  baseHue: number,
  angleDeg: number,
  config: DockArcConfig,
) => {
  const tShift = 0.5 + (index - center) / last
  const t = Math.max(0, Math.min(1, tShift))
  const u = Math.sin(Math.PI * t)

  const anchorXPercent = clampPercent(u * config.peakX)
  const anchorYPercent = clampPercent(config.anchorBaseY - u * config.arcLift)
  const rowHue = baseHue + u * config.hueAmplitude
  const rowAngle = angleDeg + u * config.angleAmplitude

  return { anchorXPercent, anchorYPercent, rowHue, rowAngle, u }
}

export type { DockArcConfig }
