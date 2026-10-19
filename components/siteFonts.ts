import { Instrument_Sans, Instrument_Serif } from 'next/font/google';

/** Shared font variables for the app and isolated component previews. */
export const siteSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--site-font-sans',
});

export const siteSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--site-font-serif',
});
