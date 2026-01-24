import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Script from 'next/script'
// import 'tools/light/styles.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
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
      <Component {...pageProps} />
    </>
  )
}
