import '../styles/globals.css'
import 'swiper/css'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import Script from 'next/script'
import { Instrument_Sans, Instrument_Serif } from 'next/font/google'
import type { ReactNode } from 'react'
import { SharedDesignConfigProvider, useSharedDesignConfig } from '../components/SharedDesignConfigProvider'
import { LayoutDebugHighlightProvider } from '../components/LayoutDebugHighlight'
import { AbstractDesignConfigProvider } from '../experiences/abstract/components/AbstractDesignConfigProvider'
import { MobileNavCube } from '../experiences/abstract/components/MobileNavCube'
import { PageCapabilityRuntimeProvider } from '../experiences/shared/PageCapabilityRuntime'
// import 'tools/light/styles.css';

const CopyTool = dynamic(() => import('../components/CopyTool'), { ssr: false })

// Keep the next/font declarations at the Pages Router's app root. The
// variable classes and font-sans class are deliberately applied together:
// Tailwind resolves the custom property on this exact element before every
// page's typography inherits from it.
// adjustFontFallback (default true, previously disabled here with no
// recorded reason) makes next/font generate a size-adjusted fallback
// font-face (ascent/descent/line-gap/size-adjust matched to the real
// font's metrics) so the display:'swap' transition doesn't reflow
// surrounding layout — this is what makes the swap itself invisible
// instead of the visible font-jump + reflow seen on /abstract's cold
// load (PLAN-ABSTRACT-PAGE-INTRO-SEQUENCE.md Phase 2).
// Exported (not just module-local) so content portaled straight to
// document.body — outside this file's own font-variable wrapper div below,
// e.g. pages/contact.tsx's own ConversationResumeNotice — can still set the
// real Instrument Sans family directly via siteSans.style.fontFamily: a
// var(--site-font-sans) reference alone resolves to nothing there, since
// that custom property is scoped to the wrapper div, not document.body,
// and a portaled node is body's sibling, not its descendant.
export const siteSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--site-font-sans',
})
const siteSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--site-font-serif',
})

/**
 * Next.js stopped auto-injecting a viewport meta tag in v9+ — without one,
 * iOS Safari renders every page at a virtual ~980px layout viewport and
 * scales down to fit, regardless of the real device width. Two
 * consequences, both confirmed live on a real iPhone (operator-reported
 * 2026-09-21, on /contact): (1) focusing any text input triggers Safari's
 * built-in zoom-to-legibility behavior against that phantom 980px canvas,
 * which can pan a fixed/docked field (like the contact composer) off-screen
 * entirely; (2) every md:/lg: Tailwind breakpoint in this codebase
 * evaluates against that same phantom width, so "mobile" (below-md) styling
 * can never actually apply on a real phone. viewport-fit=cover is included
 * because components/Panel and components/black-hole already read
 * env(safe-area-inset-*) — those resolve to 0 without it, so this also
 * fixes safe-area handling being silently inert.
 *
 * Declared via next/head (not pages/_document.tsx's own Head, a different
 * component from next/document) specifically so Next's own per-request head
 * de-duplication recognizes a user-provided viewport tag and skips
 * inserting its own bare "width=device-width" default — declaring it in
 * both places produces two competing tags instead of one. Rendered from
 * _app.tsx (both branches below) rather than per-page (e.g. SeoHead.tsx)
 * because a few routes — /, /admin, /black-hole, /carousel-lab, /cube-lab —
 * don't render SeoHead at all; _app.tsx is the one place every route shares.
 */
function ViewportMeta() {
  return (
    <Head>
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    </Head>
  )
}

function CuboidNavigationRoot({ children }: { children: ReactNode }) {
  const { mobileNavCubeConfig, faceETimelineConfig } = useSharedDesignConfig()

  return (
    <MobileNavCube
      config={mobileNavCubeConfig}
      faceETimelineConfig={faceETimelineConfig}
    >
      {children}
    </MobileNavCube>
  )
}

export default function App({ Component, pageProps }: AppProps) {
  const pathname = useRouter().pathname
  const immersive = pathname === '/black-hole'
  const editorialWorkspace = pathname === '/admin'

  if (editorialWorkspace) {
    return (
      <>
        <ViewportMeta />
        <div className={`${siteSans.variable} ${siteSerif.variable} font-sans`}>
          <Component {...pageProps} />
        </div>
      </>
    )
  }

  return (
    <SharedDesignConfigProvider>
      <AbstractDesignConfigProvider>
      <ViewportMeta />
      {process.env.NODE_ENV === 'production' && (
        <>
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-83H6JXQD4R"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-83H6JXQD4R');
            `}
          </Script>
        </>
      )}
      <Script
        src="https://cdn.jsdelivr.net/npm/p5@1.4.2/lib/p5.min.js"
        strategy="afterInteractive"
      />
      <div className={`${siteSans.variable} ${siteSerif.variable} font-sans`}>
        {/* Hoisted here (PLAN-DEDUPLICATE-PAGE-SHELL-LOGIC.md §6) — was
            independently mounted per-page on about.tsx/contact.tsx/
            posts-lab/[slug].tsx, and silently missing entirely on
            abstract.tsx (a real, previously-shipping inconsistency: that
            page's own LayoutDebugOverlay instances could never dim on
            hover, since useLayoutDebugHighlight() degrades to "no
            provider" gracefully instead of erroring — no crash, just a
            permanently inert feature on that one page). One instance here
            covers every page uniformly; LayoutDebugHighlightProvider
            itself takes no props, so this is a pure relocation. */}
        <LayoutDebugHighlightProvider>
          <PageCapabilityRuntimeProvider key={pathname}>
            {immersive ? <Component {...pageProps} /> : (
              <CuboidNavigationRoot>
                <Component {...pageProps} />
              </CuboidNavigationRoot>
            )}
          </PageCapabilityRuntimeProvider>
        </LayoutDebugHighlightProvider>
        {process.env.NODE_ENV === 'development' && !immersive && <CopyTool />}
      </div>
      </AbstractDesignConfigProvider>
    </SharedDesignConfigProvider>
  )
}
