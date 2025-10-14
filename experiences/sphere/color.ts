import * as THREE from 'three'

export const mixHex = (a: string | number, b: string | number, t: number) => {
  const ca = new THREE.Color(a as any)
  const cb = new THREE.Color(b as any)
  const out = ca.clone().lerp(cb, Math.max(0, Math.min(1, t)))
  return `#${out.getHexString()}`
}
