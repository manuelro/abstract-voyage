import '../styles/globals.css'
import 'swiper/css'
import type { AppProps } from 'next/app'
import dynamic from 'next/dynamic'
import Script from 'next/script'
import { Instrument_Sans, Instrument_Serif } from 'next/font/google'
import { SharedDesignConfigProvider } from '../components/SharedDesignConfigProvider'
import { LayoutDebugHighlightProvider } from '../components/LayoutDebugHighlight'
import { AbstractDesignConfigProvider } from '../experiences/abstract/components/AbstractDesignConfigProvider'
// import 'tools/light/styles.css';

const CopyTool = dynamic(() => import('../components/CopyTool'), { ssr: false })

// Keep the next/font declarations at the Pages Router's app root. The
// variable classes and font-sans class are deliberately applied together:
// Tailwind resolves the custom property on this exact element before every
// page's typography inherits from it.
const siteSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: false,
  variable: '--site-font-sans',
})
const siteSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  adjustFontFallback: false,
  variable: '--site-font-serif',
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SharedDesignConfigProvider>
      <AbstractDesignConfigProvider>
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
          <Component {...pageProps} />
        </LayoutDebugHighlightProvider>
        {process.env.NODE_ENV === 'development' && <CopyTool />}
      </div>
      </AbstractDesignConfigProvider>
    </SharedDesignConfigProvider>
  )
}
