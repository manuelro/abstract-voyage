import { colord } from 'colord';
import { adjustLightnessForContrast } from '../../../helpers/harmonicGradient';
import type { TableOfContentsConfig } from '../components/TableOfContents/config/registered';
import type { TableOfContentsPresentation } from '../components/TableOfContents/types';
import type { MarkdownContentConfig } from '../components/MarkdownContent/config/registered';
import type { MarkdownContentPresentation } from '../components/MarkdownContent/types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const wrapHue = (value: number) => ((value % 360) + 360) % 360;

function validColor(value: string, fallback: string) {
  return colord(value).isValid() ? value : fallback;
}

/**
 * Keeps the source hue relationship while resolving only the lightness
 * needed for the selected contrast target. The result therefore never turns
 * into an unrelated generic black or white just to pass contrast.
 */
export function deriveReadableInk({
  sourceColor,
  backgroundColor,
  minContrast,
  originalHueRetention,
  hueShiftDegrees,
  pigmentIntensity,
}: {
  sourceColor: string;
  backgroundColor: string;
  minContrast: number;
  originalHueRetention: number;
  hueShiftDegrees: number;
  pigmentIntensity: number;
}) {
  const background = colord(validColor(backgroundColor, '#ffffff'));
  const source = colord(validColor(sourceColor, background.toHex()));
  const hsl = source.toHsl();
  const retention = clamp(originalHueRetention, 0, 1);
  const hue = wrapHue(hsl.h + clamp(hueShiftDegrees, -180, 180) * (1 - retention));
  const saturation = Math.min(100, hsl.s * clamp(pigmentIntensity, 0, 2));
  const range = background.isDark() ? { min: hsl.l, max: 98 } : { min: 2, max: hsl.l };
  const lightness = adjustLightnessForContrast(hue, saturation, hsl.l, range, {
    against: background.toHex(),
    minRatio: clamp(minContrast, 1, 21),
  });
  return colord({ h: hue, s: saturation, l: lightness }).toHex();
}

export function withAlpha(color: string, opacity: number) {
  return colord(color).alpha(clamp(opacity, 0, 1)).toRgbString();
}

function scaleAlpha(color: string, scale: number) {
  const resolved = colord(color);
  return resolved.alpha(clamp(resolved.alpha() * clamp(scale, 0, 1), 0, 1)).toRgbString();
}

/** Composites a translucent state fill onto the actual ToC column before
 * deriving its text. Contrast therefore describes what a visitor sees, not
 * an opaque intermediate color that is never painted. */
function compositeColor(foreground: string, background: string, opacity: number) {
  const front = colord(validColor(foreground, background)).toRgb();
  const back = colord(validColor(background, '#ffffff')).toRgb();
  const alpha = clamp(opacity, 0, 1);
  return colord({
    r: Math.round(front.r * alpha + back.r * (1 - alpha)),
    g: Math.round(front.g * alpha + back.g * (1 - alpha)),
    b: Math.round(front.b * alpha + back.b * (1 - alpha)),
  }).toHex();
}

function deriveTocStateBackground({
  mode,
  customColor,
  surfaceColor,
  darkSurfaceLightenAmount,
  lightSurfaceDarkenAmount,
  originalHueRetention,
  hueShiftDegrees,
  pigmentIntensity,
  opacity,
}: {
  mode: TableOfContentsConfig['hoverBackgroundMode'];
  customColor: string;
  surfaceColor: string;
  darkSurfaceLightenAmount: number;
  lightSurfaceDarkenAmount: number;
  originalHueRetention: number;
  hueShiftDegrees: number;
  pigmentIntensity: number;
  opacity: number;
}) {
  if (mode === 'transparent') {
    return { color: 'transparent', effectiveColor: surfaceColor };
  }
  if (mode === 'custom') {
    const color = validColor(customColor, surfaceColor);
    return { color: withAlpha(color, opacity), effectiveColor: compositeColor(color, surfaceColor, opacity) };
  }
  const surface = colord(surfaceColor);
  const hsl = surface.toHsl();
  const retention = clamp(originalHueRetention, 0, 1);
  const hue = wrapHue(hsl.h + clamp(hueShiftDegrees, -180, 180) * (1 - retention));
  const saturation = Math.min(100, hsl.s * clamp(pigmentIntensity, 0, 2));
  const lightness = surface.isDark()
    ? Math.min(100, hsl.l + clamp(darkSurfaceLightenAmount, 0, 1) * 100)
    : Math.max(0, hsl.l - clamp(lightSurfaceDarkenAmount, 0, 1) * 100);
  const color = colord({ h: hue, s: saturation, l: lightness }).toHex();
  return { color: withAlpha(color, opacity), effectiveColor: compositeColor(color, surfaceColor, opacity) };
}

function resolveTocStateSource({
  mode,
  customColor,
  restingInk,
  columnColor,
  surfaceColor,
}: {
  mode: TableOfContentsConfig['hoverTextColorMode'];
  customColor: string;
  restingInk: string;
  columnColor: string;
  surfaceColor: string;
}) {
  if (mode === 'resting') return restingInk;
  if (mode === 'custom') return customColor;
  return mode === 'surface' ? surfaceColor : columnColor;
}

export function resolvePostLabArticlePresentation({
  config,
  columnColor,
  surfaceColor,
}: {
  config: MarkdownContentConfig;
  columnColor: string;
  surfaceColor: string;
}): MarkdownContentPresentation {
  const articleSurface = validColor(columnColor, surfaceColor);
  const textSource = config.bodyTextColorMode === 'custom'
    ? config.bodyTextColor
    : config.bodyTextColorMode === 'surface'
      ? surfaceColor
      : articleSurface;
  const inkOptions = {
    sourceColor: textSource,
    backgroundColor: articleSurface,
    originalHueRetention: config.bodyTextOriginalHueRetention,
    hueShiftDegrees: config.bodyTextHueShiftDegrees,
    pigmentIntensity: config.bodyTextPigmentIntensity,
  };
  const bodyInk = deriveReadableInk({ ...inkOptions, minContrast: config.bodyTextMinContrast });
  const headingInk = deriveReadableInk({ ...inkOptions, minContrast: config.bodyTextMinContrast });
  const mutedInk = deriveReadableInk({ ...inkOptions, minContrast: config.mutedTextMinContrast });
  const linkInk = deriveReadableInk({
    ...inkOptions,
    minContrast: config.linkTextMinContrast,
    pigmentIntensity: config.linkPigmentIntensity,
  });
  const strongSource = config.strongColorMode === 'custom'
    ? validColor(config.strongCustomColor, bodyInk)
    : bodyInk;
  const strongInk = withAlpha(strongSource, config.strongOpacity);
  const articleSource = colord(articleSurface);
  const codeSurface = config.codeSurfaceMode === 'custom'
    ? validColor(config.codeSurfaceColor, '#0f172a')
    : config.codeSurfaceMode === 'derived-light'
      ? (articleSource.isDark() ? '#e7e7e9' : articleSource.lighten(0.08).toHex())
      : (articleSource.isDark() ? articleSource.darken(0.14).toHex() : '#11131c');
  const codeInk = deriveReadableInk({
    sourceColor: bodyInk,
    backgroundColor: codeSurface,
    minContrast: config.codeTextMinContrast,
    originalHueRetention: 1,
    hueShiftDegrees: 0,
    pigmentIntensity: 0.3,
  });

  return {
    surfaceColor: articleSurface,
    bodyInk,
    headingInk,
    mutedInk,
    metadataInk: withAlpha(mutedInk, config.metadataOpacity),
    linkInk,
    strongInk,
    dividerInk: withAlpha(bodyInk, config.tableDividerOpacity),
    figureBorderInk: withAlpha(bodyInk, config.figureBorderOpacity),
    codeSurface,
    codeInk,
  };
}

export function resolvePostLabTocPresentation({
  config,
  columnColor,
  surfaceColor,
}: {
  config: TableOfContentsConfig;
  columnColor: string;
  surfaceColor: string;
}): TableOfContentsPresentation {
  const tocSurface = validColor(columnColor, surfaceColor);
  const sourceColor = config.textColorMode === 'custom'
    ? config.textColor
    : config.textColorMode === 'surface'
      ? surfaceColor
      : tocSurface;
  const options = {
    sourceColor,
    backgroundColor: tocSurface,
    originalHueRetention: config.originalHueRetention,
    hueShiftDegrees: config.hueShiftDegrees,
    pigmentIntensity: config.pigmentIntensity,
  };
  const textInk = deriveReadableInk({ ...options, minContrast: config.textMinContrast });
  const labelSource = config.labelTextColorMode === 'custom'
    ? config.labelTextColor
    : config.labelTextColorMode === 'surface'
      ? surfaceColor
      : tocSurface;
  const labelInk = deriveReadableInk({
    sourceColor: labelSource,
    backgroundColor: tocSurface,
    minContrast: config.labelTextMinContrast,
    originalHueRetention: config.labelTextOriginalHueRetention,
    hueShiftDegrees: config.labelTextHueShiftDegrees,
    pigmentIntensity: config.labelTextPigmentIntensity,
  });
  const hoverBackground = deriveTocStateBackground({
    mode: config.hoverBackgroundMode,
    customColor: config.hoverBackgroundColor,
    surfaceColor: tocSurface,
    darkSurfaceLightenAmount: config.hoverBackgroundDarkSurfaceLightenAmount,
    lightSurfaceDarkenAmount: config.hoverBackgroundLightSurfaceDarkenAmount,
    originalHueRetention: config.hoverBackgroundOriginalHueRetention,
    hueShiftDegrees: config.hoverBackgroundHueShiftDegrees,
    pigmentIntensity: config.hoverBackgroundPigmentIntensity,
    opacity: config.hoverBackgroundOpacity,
  });
  const activeBackground = deriveTocStateBackground({
    mode: config.activeBackgroundMode,
    customColor: config.activeBackgroundColor,
    surfaceColor: tocSurface,
    darkSurfaceLightenAmount: config.activeBackgroundDarkSurfaceLightenAmount,
    lightSurfaceDarkenAmount: config.activeBackgroundLightSurfaceDarkenAmount,
    originalHueRetention: config.activeBackgroundOriginalHueRetention,
    hueShiftDegrees: config.activeBackgroundHueShiftDegrees,
    pigmentIntensity: config.activeBackgroundPigmentIntensity,
    opacity: config.activeBackgroundOpacity,
  });
  const hoverInk = deriveReadableInk({
    sourceColor: resolveTocStateSource({
      mode: config.hoverTextColorMode,
      customColor: config.hoverTextColor,
      restingInk: textInk,
      columnColor: tocSurface,
      surfaceColor,
    }),
    backgroundColor: hoverBackground.effectiveColor,
    minContrast: config.hoverTextMinContrast,
    originalHueRetention: config.hoverTextOriginalHueRetention,
    hueShiftDegrees: config.hoverTextHueShiftDegrees,
    pigmentIntensity: config.hoverTextPigmentIntensity,
  });
  const activeInk = deriveReadableInk({
    sourceColor: resolveTocStateSource({
      mode: config.activeTextColorMode,
      customColor: config.activeTextColor,
      restingInk: textInk,
      columnColor: tocSurface,
      surfaceColor,
    }),
    backgroundColor: activeBackground.effectiveColor,
    minContrast: config.activeTextMinContrast,
    originalHueRetention: config.activeTextOriginalHueRetention,
    hueShiftDegrees: config.activeTextHueShiftDegrees,
    pigmentIntensity: config.activeTextPigmentIntensity,
  });
  return {
    textInk,
    labelInk,
    hoverInk,
    hoverBackground: hoverBackground.color,
    hoverSettlingBackground: scaleAlpha(
      hoverBackground.color,
      config.hoverExitInitialOpacity * config.hoverExitDamping,
    ),
    activeInk,
    activeBackground: activeBackground.color,
    activeSettlingBackground: scaleAlpha(activeBackground.color, config.activeExitOpacity),
    mutedInk: deriveReadableInk({ ...options, minContrast: config.textMinContrast }),
  };
}
