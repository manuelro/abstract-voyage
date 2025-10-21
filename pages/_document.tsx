import { Html, Head, Main, NextScript } from 'next/document'
import Script from 'next/script'
import { experienceMotion as exp, bodyBgCSS } from '../config/experienceMotion'

/** Pre-paint layer pinning to avoid classical flash when immersive is persisted */
const PREPAINT_CSS = `
html.exp-imm #classic-root { opacity: 0 !important; z-index: 0 !important; }
html.exp-imm #immersive-root { opacity: 1 !important; z-index: 1 !important; }
html.exp-cla #classic-root  { opacity: 1 !important; z-index: 1 !important; }
html.exp-cla #immersive-root{ opacity: 0 !important; z-index: 0 !important; }
/* Disable any transitions only for the first paint */
html.exp-imm #classic-root, html.exp-imm #immersive-root,
html.exp-cla #classic-root, html.exp-cla #immersive-root { transition: none !important; }
`;

/** SSR background derived from centralized config */
// const SSR_BG_CSS = bodyBgCSS();

const SSR_BG_CSS = `${bodyBgCSS()}`.trim()

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* Pre-paint mode marker: add a class to <html> before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  try {
    var m = localStorage.getItem('experienceMode');
    var cls = (m === 'immersive') ? 'exp-imm' : 'exp-cla';
    document.documentElement.classList.add(cls);
  } catch (e) {}
})();`,
          }}
        />
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

        {/* Theme color matches bg top */}
        <style id="prepaint-css" dangerouslySetInnerHTML={{ __html: PREPAINT_CSS }} />
        <style id="ssr-body-bg" dangerouslySetInnerHTML={{ __html: SSR_BG_CSS }} />

        <style
  id="bg-intensity-vars"
  dangerouslySetInnerHTML={{
    __html: `
:root {
  --bg-sat: 0;    /* 0.90–1.20 is sensible */
  --bg-light: 0;  /* 0.95–1.05 is sensible */
}
`}}
/>

<style
  id="sphere-grad-vars"
  dangerouslySetInnerHTML={{
    __html: `
:root {
  --sphere-grad-sat: 0;
  --sphere-grad-light: 0;
}
.sphereGrad--dim  { --sphere-grad-sat: 0;  --sphere-grad-light: 0; }
.sphereGrad--pop  { --sphere-grad-sat: 0; --sphere-grad-light: 0; }
.sphereGrad--mono { --sphere-grad-sat: 0;    --sphere-grad-light: 0; }
`}}
/>



        <style
            id="ssr-layer-bg-reset"
            // Enforce single source of truth: body background only — hvle
            dangerouslySetInnerHTML={{
              __html: `
          #classic-root, #immersive-root { background: none !important; }
          `}}
          />
        <meta name="theme-color" />
        <meta name="theme-color" content="#1C2234" />
        <meta name="color-scheme" content="dark" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
