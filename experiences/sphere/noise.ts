// CSS-ready data URI with an SVG turbulence noise; matches the original intent.
const NOISE_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
    <filter id="n">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#n)"/>
  </svg>`
)

export const NOISE_DATA_URI = `url("data:image/svg+xml;utf8,${NOISE_SVG}")`
