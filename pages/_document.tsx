import { Html, Head, Main, NextScript } from 'next/document'
import Script from 'next/script'

/**
 * SSR background: match Sphere theme to avoid white flash before client JS.
 * Colors from CONFIG.theme:
 *  - top:    #0b0c0e
 *  - bottom: #191b1f
 * Vignette: center 58%, edge alpha 0.22
 */
const SSR_BG_CSS = `
  /* Ensure the very first paint is already dark and gradiented */
  :root {
    color-scheme: dark;
  }
  html, body {
    height: 100%;
    min-height: 100%;
    background-color: #0b0c0e; /* solid fallback */
    background-image:
      radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.22) 100%),
      linear-gradient(180deg, #0b0c0e 0%, #191b1f 100%);
    background-repeat: no-repeat;
    background-size: 100% 100%, 100% 100%;
    background-attachment: fixed, fixed; /* prevent brief scroll flashes on mobile */
  }
  /* Avoid blue tap flash on iOS */
  body { -webkit-tap-highlight-color: transparent; }
`;

export default function Document() {
  return (
    <Html lang="en" className='dark'>
      <Head>
        <link rel="shortcut icon" href="/favicon.ico" />

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-83H6JXQD4R"
          strategy="afterInteractive"
        />

        <Script
          src="https://cdn.jsdelivr.net/npm/p5@1.4.2/lib/p5.min.js"
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

        <meta name="theme-color" content="#0b0c0e" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#0b0c0e" />
        <style id="ssr-bg" dangerouslySetInnerHTML={{ __html: SSR_BG_CSS }} />
      </Head>
      <body className='dark:bg-gray-900'>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
