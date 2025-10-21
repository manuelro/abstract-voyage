import * as THREE from 'three'
import type { EasingName } from './Sphere.types'

export function ease(t: number, name: EasingName) {
  t = Math.min(Math.max(t, 0), 1)
  switch (name) {
    case 'linear': return t
    case 'quadOut': return 1 - (1 - t) * (1 - t)
    case 'cubicOut': return 1 - Math.pow(1 - t, 3)
    case 'quartOut': return 1 - Math.pow(1 - t, 4)
    case 'quintOut': return 1 - Math.pow(1 - t, 5)
    case 'expoOut': return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
    case 'circOut': return Math.sqrt(1 - Math.pow(t - 1, 2))
    default: return t
  }
}

export function slerpUnit(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1)
  const omega = Math.acos(dot)
  if (omega < 1e-6) return b.clone()
  const sinOm = Math.sin(omega)
  const s0 = Math.sin((1 - t) * omega) / sinOm
  const s1 = Math.sin(t * omega) / sinOm
  return a.clone().multiplyScalar(s0).add(b.clone().multiplyScalar(s1)).normalize()
}
