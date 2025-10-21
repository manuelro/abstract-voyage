import 'components/styles/globals.css'
// import 'components/tools/light/styles.css'
import type { AppProps } from 'next/app'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    const onStart = () => {
      if (prefersReducedMotion) return
      setTransitioning(true)
      document?.body?.classList?.add('route-transitioning')
    }
    const onEnd = () => {
      if (prefersReducedMotion) return
      // Let the new page paint, then fade the overlay out
      // (CSS handles the fade-out; we just drop the class a tick later)
      requestAnimationFrame(() => {
        document?.body?.classList?.remove('route-transitioning')
        setTransitioning(false)
      })
    }

    router.events.on('routeChangeStart', onStart)
    router.events.on('routeChangeComplete', onEnd)
    router.events.on('routeChangeError', onEnd)
    return () => {
      router.events.off('routeChangeStart', onStart)
      router.events.off('routeChangeComplete', onEnd)
      router.events.off('routeChangeError', onEnd)
    }
  }, [router.events])

  return (
    <>
      {/* Global fade overlay (visual-only) */}
      <div id="route-fader" aria-hidden="true" />
      <Component {...pageProps} />
    </>
  )
}
