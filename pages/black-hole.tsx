import Head from 'next/head'
import BlackHoleScene from '../components/black-hole/BlackHoleScene'

export default function BlackHolePage() {
  return (
    <>
      <Head>
        <title>Black Hole - Abstract Voyage</title>
        <meta name="description" content="A real-time study of light in curved spacetime. A ray-traced black hole lenses a terminal sky through the Schwarzschild metric." />
        <meta name="theme-color" content="#080a0c" />
      </Head>
      <BlackHoleScene />
    </>
  )
}
