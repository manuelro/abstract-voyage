import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en" className='dark'>
      <Head>
        <link rel="shortcut icon" href="/favicon.ico" />
      </Head>
      <body className='dark:bg-gray-900'>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
