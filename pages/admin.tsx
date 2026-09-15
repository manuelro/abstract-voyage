import Head from 'next/head';
import Script from 'next/script';
import { useState } from 'react';
import type { GetStaticProps } from 'next';

import { initializeDecap } from '../components/Editor/initializeDecap';

const DECAP_BROWSER_BUNDLE = 'https://cdn.jsdelivr.net/npm/decap-cms@3.16.2/dist/decap-cms.js';

export default function AdminPage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Head>
        <title>Editorial workspace | Abstract Voyage</title>
        <meta name="robots" content="noindex,nofollow" />
        <link href="/api/dev/editor-config" type="text/yaml" rel="cms-config-url" />
      </Head>
      <script dangerouslySetInnerHTML={{ __html: 'window.CMS_MANUAL_INIT = true;' }} />
      <main className="editor-shell">
        <div id="nc-root" />
        {error ? (
          <div className="editor-error" role="alert">
            <h1>Editor unavailable</h1>
            <p>{error}</p>
          </div>
        ) : null}
      </main>
      <Script
        src={DECAP_BROWSER_BUNDLE}
        strategy="afterInteractive"
        onLoad={() => {
          try {
            initializeDecap();
          } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Unable to initialize Decap CMS.');
          }
        }}
        onError={() => setError('Unable to load the pinned Decap CMS browser bundle.')}
      />
      <style jsx global>{`
        html,
        body,
        #__next,
        .editor-shell,
        #nc-root {
          min-height: 100%;
          margin: 0;
        }
        body {
          background: #f4f4f0;
        }
        .editor-error {
          width: min(100% - 40px, 560px);
          margin: 80px auto;
          padding: 24px;
          border: 1px solid #bf3b31;
          border-radius: 6px;
          background: #fff;
          color: #241817;
        }
        .editor-error h1 {
          margin: 0 0 8px;
          font-size: 20px;
        }
        .editor-error p {
          margin: 0;
        }
      `}</style>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  if (process.env.NODE_ENV === 'production') {
    return { notFound: true };
  }

  return { props: {} };
};
