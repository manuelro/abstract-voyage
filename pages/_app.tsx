import 'components/styles/globals.css'
import type { AppProps } from 'next/app'
// import 'tools/light/styles.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
