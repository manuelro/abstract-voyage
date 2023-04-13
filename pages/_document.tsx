import { Html, Head, Main, NextScript } from 'next/document'
import Script from 'next/script'

export default function Document() {
  return (
    <Html lang="en" className='dark'>
      <Head>
        <link rel="shortcut icon" href="/favicon.ico" />

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
      </Head>
      <body className='dark:bg-gray-900'>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
