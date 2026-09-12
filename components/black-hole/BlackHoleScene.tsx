import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { createRenderer } from './renderer'
import styles from './BlackHoleScene.module.css'

export default function BlackHoleScene() {
  const host = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const background = useRef<HTMLCanvasElement>(null)
  const debug = useRef<HTMLOutputElement>(null)

  useEffect(() => {
    if (!host.current || !canvas.current || !background.current) return
    return createRenderer({ host: host.current, canvas: canvas.current, background: background.current, debug: debug.current })
  }, [])

  return (
    <main className={styles.scene} ref={host} aria-labelledby="black-hole-title">
      <canvas ref={background} className={styles.terminal} aria-hidden="true" />
      <div className={styles.fallback} aria-hidden="true"><i /><b /></div>
      <canvas ref={canvas} className={styles.render} aria-hidden="true" />
      <header className={styles.header}>
        <Link href="/" prefetch={false} aria-label="Abstract Voyage home">AV<span> / </span>FIELD STUDIES</Link>
        <span className={styles.index}>NO. 004 <span>—</span> SPACETIME</span>
      </header>
      <footer className={styles.footer}>
        <div>
          <h1 id="black-hole-title">BLACK HOLE</h1>
          <p>Light follows the curvature.</p>
        </div>
        <div className={styles.readout} aria-label="Schwarzschild metric, photon sphere at 1.5 Schwarzschild radii">
          <span className={styles.status} />
          <span>SCHWARZSCHILD<span className={styles.readoutDetail}>r<sub>ph</sub> = 1.5 r<sub>s</sub> &nbsp; / &nbsp; c = 1</span></span>
        </div>
      </footer>
      <p className={styles.accessible}>A black hole suspended over source code. Gravity bends and mirrors the text around a dark shadow, while a luminous accretion disk wraps above and below it. Pointer movement subtly shifts the observer. Reduced-motion preferences produce a still scene.</p>
      <output ref={debug} className={styles.debug} hidden aria-live="off" />
    </main>
  )
}
