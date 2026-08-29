// Generic numeric utilities. Deliberately NOT under components/Panel/ —
// they're real, always-needed helpers (AbstractPostDock.tsx, CardSlider.tsx,
// and other production-shipped components import `clamp` directly), not
// panel-UI code. They used to live inside components/Panel/index.tsx purely
// for historical/organizational reasons; that placement is what made
// components/Panel/index.tsx a "mixed file" once a whole-directory
// production alias was introduced (see CONFIG-CHANGE-PROTOCOL.md's
// "Architecture path" decision) — moving them here is the fix, not a
// judgment call to re-derive each time components/Panel/index.tsx changes.
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function getStepPrecision(step: number) {
  if (!Number.isFinite(step) || step <= 0) return 0
  const text = step.toString()
  if (text.includes('e-')) return Number(text.split('e-')[1])
  if (!text.includes('.')) return 0
  return text.split('.')[1].length
}

export function formatKnobValue(value: number, step: number) {
  const precision = getStepPrecision(step)
  if (precision <= 0) return Math.round(value).toString()
  return value.toFixed(precision)
}
