import { ReactNode, useEffect, useMemo, useRef } from 'react'
import Header from './Header'
import { buildSynthBackgroundGradient } from './synthGradient'

type SynthLayoutProps = {
  controls?: ReactNode
  children: ReactNode
}

export default function SynthLayout({ controls, children }: SynthLayoutProps) {
  const SCROLL_BG_CONFIG = {
    enabled: true,
    viewportRangeVh: 1.25,
    maxDarken: 0.65,
    tauMs: 550,
    useSecondStage: false,
    tau2Ms: 900,
    deadband: 0,
    clampMin: 0,
    clampMax: 1,
    debug: false,
  }

  const backgroundGradient = useMemo(() => buildSynthBackgroundGradient(), [])
  const overlayRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
    const alphaFromTau = (dtMs: number, tauMs: number) => 1 - Math.exp(-dtMs / Math.max(1, tauMs))

    const targetRef = { current: 0 }
    const smoothRef = { current: 0 }
    const smooth2Ref = { current: 0 }
    const rafRef = { current: null as number | null }
    const lastTsRef = { current: 0 }

    const writeDarken = (value: number) => {
      const clamped = clamp(value, SCROLL_BG_CONFIG.clampMin, SCROLL_BG_CONFIG.clampMax)
      overlay.style.setProperty('--synth-bg-darken', clamped.toFixed(3))
      if (SCROLL_BG_CONFIG.debug) {
        console.debug('[synth-bg]', { target: targetRef.current, value: clamped })
      }
    }

    const computeTarget = () => {
      if (!SCROLL_BG_CONFIG.enabled) {
        targetRef.current = 0
        return
      }
      const viewport = window.innerHeight || 1
      const rawProgress = window.scrollY / (viewport * SCROLL_BG_CONFIG.viewportRangeVh)
      const progress = clamp(rawProgress, 0, 1)
      targetRef.current = progress * SCROLL_BG_CONFIG.maxDarken
    }

    const tick = (ts: number) => {
      const lastTs = lastTsRef.current || ts
      lastTsRef.current = ts
      rafRef.current = null

      const dt = Math.max(0, ts - lastTs)
      const alpha = alphaFromTau(dt, SCROLL_BG_CONFIG.tauMs)
      const target = targetRef.current
      const current = smoothRef.current + (target - smoothRef.current) * alpha
      smoothRef.current = current

      let value = current
      if (SCROLL_BG_CONFIG.useSecondStage) {
        const alpha2 = alphaFromTau(dt, SCROLL_BG_CONFIG.tau2Ms)
        const current2 = smooth2Ref.current + (current - smooth2Ref.current) * alpha2
        smooth2Ref.current = current2
        value = current2
      }

      if (Math.abs(target - value) <= SCROLL_BG_CONFIG.deadband) {
        value = target
      }

      writeDarken(value)

      if (Math.abs(target - value) >= 0.001) {
        rafRef.current = window.requestAnimationFrame(tick)
      }
    }

    const schedule = () => {
      if (rafRef.current !== null) return
      rafRef.current = window.requestAnimationFrame(tick)
    }

    const onScroll = () => {
      computeTarget()
      schedule()
    }

    const onResize = () => {
      computeTarget()
      schedule()
    }

    writeDarken(0)
    computeTarget()
    schedule()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div className="relative min-h-screen w-full">
      <div
        className="fixed -inset-4 z-0 pointer-events-none"
        style={{
          backgroundImage: backgroundGradient,
          backgroundColor: '#020617',
          minHeight: '100dvh',
        }}
      />
      <div
        ref={overlayRef}
        className="fixed -inset-4 z-0 pointer-events-none"
        style={{
          backgroundColor: '#000000',
          minHeight: '100dvh',
          opacity: 'var(--synth-bg-darken, 0)',
        }}
      />
      <main className="relative z-10 min-h-screen w-full">

        <Header />

        <div className="flex w-full max-w-screen-xl flex-col px-5 pb-7 md:px-24 md:pb-24">
          {controls ? (
            <div>
              {controls}
            </div>
          ) : null}
          <div className={[controls ? 'mt-0' : 'mt-0'].join(' ')}>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
