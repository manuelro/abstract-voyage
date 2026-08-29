import { colord } from 'colord';

export type ResolvePanelSurfaceOptions = {
  sourceColor: string;
  underlayColor?: string;
  originalHueRetention: number;
  hueShiftDegrees: number;
  pigmentIntensity: number;
  darkBackgroundDarkenRatio: number;
  lightBackgroundDarkenRatio: number;
  opacity: number;
};

export type ResolvedPanelSurface = {
  /** Opaque color after hue treatment and adaptive darkening. */
  transformedColor: string;
  /** The actual translucent color painted by the shell. */
  paintColor: string;
  /** Paint composited over the physical column/page surface. */
  effectiveColor: string;
  sourceIsDark: boolean;
};

const clamp = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

const wrapHue = (degrees: number) => ((degrees % 360) + 360) % 360;

function compositeOver(foregroundColor: string, backgroundColor: string): string {
  const foreground = colord(foregroundColor).toRgb();
  const background = colord(backgroundColor).toRgb();
  const foregroundAlpha = foreground.a ?? 1;
  const backgroundAlpha = background.a ?? 1;
  const outputAlpha = foregroundAlpha + backgroundAlpha * (1 - foregroundAlpha);

  if (outputAlpha <= 0) return 'rgba(0, 0, 0, 0)';

  const channel = (foregroundChannel: number, backgroundChannel: number) => Math.round(
    (
      foregroundChannel * foregroundAlpha
      + backgroundChannel * backgroundAlpha * (1 - foregroundAlpha)
    ) / outputAlpha,
  );

  return colord({
    r: channel(foreground.r, background.r),
    g: channel(foreground.g, background.g),
    b: channel(foreground.b, background.b),
    a: outputAlpha,
  }).toHex();
}

/**
 * Resolves the global PanelShell surface without conflating its paint color
 * with the color users actually perceive. Hue is rotated on the circular HSL
 * axis, adaptive darkening preserves the existing relative-lightness model,
 * and contrast consumers receive the result composited over the real page
 * surface. Achromatic sources deliberately stay neutral.
 */
export function resolvePanelSurface({
  sourceColor,
  underlayColor,
  originalHueRetention,
  hueShiftDegrees,
  pigmentIntensity,
  darkBackgroundDarkenRatio,
  lightBackgroundDarkenRatio,
  opacity,
}: ResolvePanelSurfaceOptions): ResolvedPanelSurface | undefined {
  const source = colord(sourceColor);
  if (!source.isValid()) return undefined;

  const sourceHsl = source.toHsl();
  const sourceIsDark = source.isDark();
  const retention = clamp(originalHueRetention, 0, 1);
  const shift = clamp(hueShiftDegrees, -180, 180);
  const pigment = clamp(pigmentIntensity, 0, 2);
  const adjustedHue = wrapHue(sourceHsl.h + shift * (1 - retention));
  const hueAdjusted = sourceHsl.s > 0.001
    ? colord({
      ...sourceHsl,
      h: adjustedHue,
      s: Math.min(100, sourceHsl.s * pigment),
      a: 1,
    })
    : source.alpha(1);
  const darkenRatio = sourceIsDark
    ? clamp(darkBackgroundDarkenRatio, 0, 0.5)
    : clamp(lightBackgroundDarkenRatio, 0, 0.5);
  const relativeLightnessAmount = (sourceHsl.l / 100) * darkenRatio;
  const transformed = hueAdjusted.darken(relativeLightnessAmount);
  const surfaceOpacity = clamp(opacity, 0, 1);
  const transformedColor = transformed.toHex();
  const paintColor = surfaceOpacity >= 1
    ? transformedColor
    : transformed.alpha(surfaceOpacity).toRgbString();
  const parsedUnderlay = underlayColor ? colord(underlayColor) : source;
  const effectiveUnderlay = parsedUnderlay.isValid() ? parsedUnderlay.alpha(1) : source.alpha(1);

  return {
    transformedColor,
    paintColor,
    effectiveColor: compositeOver(paintColor, effectiveUnderlay.toHex()),
    sourceIsDark,
  };
}
