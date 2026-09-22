import Document, {
  Html,
  Head,
  Main,
  NextScript,
  type DocumentContext,
  type DocumentInitialProps,
} from 'next/document'
import type { CSSProperties } from 'react'

type AbstractDocumentProps = DocumentInitialProps & {
  isAbstractRoute: boolean;
};

const ABSTRACT_BOOTSTRAP_STYLE: CSSProperties = {
  minHeight: '100%',
  // The actual bootstrap image is authored in the CSS below so the
  // large-device media query can select its own surface before React has
  // resolved the client breakpoint. Keep only the route-safe floor here.
  backgroundColor: '#c0c2cd',
};

export default function AbstractDocument({ isAbstractRoute }: AbstractDocumentProps) {
  return (
    <Html
      lang="en"
      className='dark'
      data-abstract-boot={isAbstractRoute ? 'true' : undefined}
      data-abstract-gap={isAbstractRoute ? 'true' : undefined}
      style={isAbstractRoute ? ABSTRACT_BOOTSTRAP_STYLE : undefined}
    >
      <Head>
        {/* Deliberately NOT a <meta name="viewport"> here — see
            pages/_app.tsx's own Head for why the fix lives there instead
            (this Head, from next/document, doesn't participate in
            next/head's per-request viewport dedup, so declaring it here
            too would just produce a second, redundant tag). */}
        <link rel="shortcut icon" href="/favicon.ico" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* ABS-02: the document backdrop can remain visible while the
                 client resolves its responsive layout tier. The base rule
                 preserves the existing narrow-device treatment; the large
                 rule below is the desktop settled-field reconstruction. */
              html[data-abstract-gap],
              html[data-abstract-gap] body,
              html[data-abstract-gap] #__next {
                background-color: #c0c2cd !important;
                background-image: radial-gradient(
                  ellipse 110% 92% at 8% 4%,
                  #bbc6d3 0%,
                  #b2c2d1 52%,
                  #c0c2cd 100%
                ) !important;
                background-repeat: no-repeat !important;
              }

              /* The split composition begins at this project's shared md
                 breakpoint (768px), not only at the lg breakpoint. This is
                 important on Retina/zoomed desktop captures where a large
                 physical window can still report a sub-1024 CSS viewport. */
              @media (min-width: 768px) {
                html[data-abstract-gap],
                html[data-abstract-gap] body,
                html[data-abstract-gap] #__next {
                  background-color: #eef1f9 !important;
                  background-image: radial-gradient(
                    ellipse 92% 118% at 3% 48%,
                    #c6e1f2 0%,
                    #dce9f5 34%,
                    #edf1f9 72%,
                    #f1f3fa 100%
                  ) !important;
                  background-repeat: no-repeat !important;
                }
              }

              /* Explicit tier selected before <body> exists. This covers
                 zoomed/retina captures where the visual desktop window and
                 the browser's CSS media viewport do not agree during the
                 first paint. */
              html[data-abstract-gap][data-abstract-gap-tier="desktop"],
              html[data-abstract-gap][data-abstract-gap-tier="desktop"] body,
              html[data-abstract-gap][data-abstract-gap-tier="desktop"] #__next {
                background-color: #eef1f9 !important;
                background-image: radial-gradient(
                  ellipse 92% 118% at 3% 48%,
                  #c6e1f2 0%,
                  #dce9f5 34%,
                  #edf1f9 72%,
                  #f1f3fa 100%
                ) !important;
                background-repeat: no-repeat !important;
              }

              /* Temporary diagnostic filler: deliberately unmistakable so
                 the gap state can be distinguished from the live gradient. */
              html[data-abstract-gap],
              html[data-abstract-gap] body,
              html[data-abstract-gap] #__next {
                background-color: #ff0000 !important;
                background-image: none !important;
                background-repeat: no-repeat !important;
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var large = window.matchMedia && window.matchMedia('(min-width: 768px)').matches;
                document.documentElement.setAttribute(
                  'data-abstract-gap-tier',
                  large ? 'desktop' : 'mobile'
                );
              }());
            `,
          }}
        />
      </Head>
      <body
        className='dark:bg-gray-900'
        style={isAbstractRoute ? ABSTRACT_BOOTSTRAP_STYLE : undefined}
      >
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

AbstractDocument.getInitialProps = async (
  context: DocumentContext,
): Promise<AbstractDocumentProps> => {
  const initialProps = await Document.getInitialProps(context);
  return {
    ...initialProps,
    isAbstractRoute: context.pathname === '/abstract',
  };
};
