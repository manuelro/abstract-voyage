export type HslColor = {
  hue: number;
  saturation: number;
  lightness: number;
};

export type ArticleCardFallbackPalette = {
  upper: HslColor;
  lowerRight: HslColor;
  lowerLeft: HslColor;
  baseStart: HslColor;
  baseMiddleA: HslColor;
  baseMiddleB: HslColor;
  baseEnd: HslColor;
};

/**
 * The deterministic color recipe ArticleCard has always used for its
 * no-canvas fallback, exposed as data so the Abstract metal surface can map
 * the same per-card colors through its luminance treatment.
 */
export function getArticleCardFallbackPalette(
  seed: number,
): ArticleCardFallbackPalette {
  const hueA = 202 + Math.sin(seed * 3.1) * 120;
  const hueB = 268 + seed * 41 + Math.sin(seed * 5.4) * 16;
  const hueC = 138 + Math.cos(seed * 6.7) * 30;
  const hueD = 318 + Math.sin(seed * 2.2) * 240;

  return {
    upper: { hue: hueC, saturation: 44, lightness: 48 },
    lowerRight: { hue: hueD, saturation: 48, lightness: 44 },
    lowerLeft: { hue: hueA + 34, saturation: 62, lightness: 42 },
    baseStart: { hue: hueC, saturation: 32, lightness: 48 },
    baseMiddleA: { hue: hueA, saturation: 42, lightness: 38 },
    baseMiddleB: { hue: hueB, saturation: 44, lightness: 35 },
    baseEnd: { hue: hueD, saturation: 36, lightness: 38 },
  };
}

const hsl = ({ hue, saturation, lightness }: HslColor) =>
  `hsl(${hue} ${saturation}% ${lightness}%)`;

/**
 * Same layered-gradient string previously defined inside ArticleCard.
 * Keeping the formatting and formulas unchanged preserves every existing
 * non-metal card while making the palette reusable.
 */
export function getArticleCardFallbackBackground(seed: number) {
  const palette = getArticleCardFallbackPalette(seed);

  return [
    `radial-gradient(circle at 18% 22%, hsl(${palette.upper.hue} ${palette.upper.saturation}% ${palette.upper.lightness}% / 0.76), transparent 46%)`,
    `radial-gradient(circle at 82% 76%, hsl(${palette.lowerRight.hue} ${palette.lowerRight.saturation}% ${palette.lowerRight.lightness}% / 0.68), transparent 54%)`,
    `radial-gradient(circle at 22% 82%, hsl(${palette.lowerLeft.hue} ${palette.lowerLeft.saturation}% ${palette.lowerLeft.lightness}% / 0.58), transparent 50%)`,
    `linear-gradient(135deg, ${hsl(palette.baseStart)}, ${hsl(palette.baseMiddleA)} 34%, ${hsl(palette.baseMiddleB)} 68%, ${hsl(palette.baseEnd)})`,
  ].join(', ');
}

/** Convert an HSL color to normalized sRGB for the CPU material mapper. */
export function hslToSrgb({
  hue,
  saturation,
  lightness,
}: HslColor): [number, number, number] {
  const h = ((hue % 360) + 360) % 360 / 360;
  const s = Math.min(1, Math.max(0, saturation / 100));
  const l = Math.min(1, Math.max(0, lightness / 100));

  if (s === 0) return [l, l, l];

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hueToRgb = (offset: number) => {
    let t = offset;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  return [
    hueToRgb(h + 1 / 3),
    hueToRgb(h),
    hueToRgb(h - 1 / 3),
  ];
}
