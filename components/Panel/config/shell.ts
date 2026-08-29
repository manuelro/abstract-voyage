export type PanelShellSurfaceMode = 'inherited' | 'custom';
export type PanelShellTextMode = 'auto' | 'custom';
export type PanelShellDerivedColorMode = 'text' | 'custom';
export type PanelShellShadowColorMode = 'surface' | 'custom';

/**
 * Authoritative appearance and elevation contract for PanelShell. The
 * inherited surface itself remains a runtime prop because only the owning
 * page knows which physical column sits behind the panel; this config owns
 * how the shell transforms and renders that source.
 */
export type PanelShellConfig = {
  backgroundColorMode: PanelShellSurfaceMode;
  backgroundColor: string;
  /** Relative lightness reduction used when the resolved source is dark. */
  darkBackgroundDarkenRatio: number;
  /** Relative lightness reduction used when the resolved source is light. */
  lightBackgroundDarkenRatio: number;
  /**
   * Absolute HSL-lightness step applied to a subgroup's own fill — the one
   * disclosure level below a scope that actually shades (PLAN-POSTS-LAB-
   * PANEL-TABS.md §13; the scope level itself never shades) — via
   * deriveSurfaceColor. Always darkens, regardless of whether the panel's
   * own root color is itself light or dark; operator preference, not a
   * Material-elevation direction rule. 0 disables the effect entirely,
   * rendering the subgroup in the same flat fill as its scope (this
   * feature's own pre-existing behavior).
   */
  nestedSurfaceLightnessStep: number;
  /** Proportion of the source hue retained after applying the signed shift. */
  backgroundOriginalHueRetention: number;
  /** Signed rotation around the hue wheel before adaptive darkening. */
  backgroundHueShiftDegrees: number;
  /** Saturation multiplier applied after hue treatment and before darkening. */
  backgroundPigmentIntensity: number;
  /** Alpha applied only to the shell surface paint, never its contents. */
  backgroundOpacity: number;
  /** Blurs visual content beneath the expanded panel surface. */
  backgroundBlurEnabled: boolean;
  backgroundBlurPx: number;
  /** Enables the softly feathered blur halo beyond the panel edge. */
  backdropBlurEnabled: boolean;
  backdropBlurPx: number;
  /** Feathered blur perimeter outside the shell's clipped visual boundary. */
  backdropBlurSafeAreaPx: number;
  textColorMode: PanelShellTextMode;
  textColor: string;
  textMinContrast: number;
  separatorColorMode: PanelShellDerivedColorMode;
  separatorColor: string;
  separatorOpacity: number;
  internalSeparatorOpacity: number;
  borderWidthPx: number;
  borderColorMode: PanelShellDerivedColorMode;
  borderColor: string;
  borderOpacity: number;
  radiusPx: number;
  launcherIconVisible: boolean;
  shadowEnabled: boolean;
  restingElevationPx: number;
  expandedElevationPx: number;
  shadowElevationMaxPx: number;
  shadowLightXPercent: number;
  shadowLightYPx: number;
  shadowLightHeightPx: number;
  shadowLightRadiusPx: number;
  shadowLightDirectIntensity: number;
  shadowLightAmbientIntensity: number;
  shadowProjectedStrength: number;
  shadowProjectedFalloff: number;
  shadowContactStrength: number;
  shadowContactFalloff: number;
  shadowContactDecayElevationPx: number;
  shadowNearFieldStrength: number;
  shadowMaxBlurPx: number;
  shadowMaxDisplacementPx: number;
  shadowMaxProjectedScale: number;
  shadowColorMode: PanelShellShadowColorMode;
  shadowColor: string;
  shadowSurfaceDarkenAmount: number;
};

export const DEFAULT_PANEL_SHELL_CONFIG = {
  backgroundColorMode: 'inherited',
  backgroundColor: '#121321',
  darkBackgroundDarkenRatio: 0.34,
  lightBackgroundDarkenRatio: 0.43,
  nestedSurfaceLightnessStep: 0.08,
  backgroundOriginalHueRetention: 0.5,
  backgroundHueShiftDegrees: 6,
  backgroundPigmentIntensity: 0.55,
  backgroundOpacity: 1,
  backgroundBlurEnabled: false,
  backgroundBlurPx: 22,
  backdropBlurEnabled: false,
  backdropBlurPx: 22,
  backdropBlurSafeAreaPx: 16,
  textColorMode: 'auto',
  textColor: '#f5f5f5',
  textMinContrast: 15.4,
  separatorColorMode: 'text',
  separatorColor: '#f5f5f5',
  separatorOpacity: 0.085,
  internalSeparatorOpacity: 0.06,
  borderWidthPx: 0,
  borderColorMode: 'text',
  borderColor: '#f5f5f5',
  borderOpacity: 0.11,
  radiusPx: 12,
  launcherIconVisible: false,
  shadowEnabled: false,
  restingElevationPx: 0,
  expandedElevationPx: 11,
  shadowElevationMaxPx: 20,
  shadowLightXPercent: 100,
  shadowLightYPx: 200,
  shadowLightHeightPx: 40,
  shadowLightRadiusPx: 30,
  shadowLightDirectIntensity: 1.4,
  shadowLightAmbientIntensity: 0.55,
  shadowProjectedStrength: 0.5,
  shadowProjectedFalloff: 2.9,
  shadowContactStrength: 0.12,
  shadowContactFalloff: 0.4,
  shadowContactDecayElevationPx: 50,
  shadowNearFieldStrength: 0.43,
  shadowMaxBlurPx: 30,
  shadowMaxDisplacementPx: 50,
  shadowMaxProjectedScale: 1.11,
  shadowColorMode: 'surface',
  shadowColor: '#0d0d10',
  shadowSurfaceDarkenAmount: 0.24,
} satisfies PanelShellConfig;

const clamp = (value: number, min: number, max: number, fallback: number) => (
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback))
);

const color = (value: string, fallback: string) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
};

export function normalizePanelShellConfig(
  config: Partial<PanelShellConfig> | undefined,
): PanelShellConfig {
  const base = { ...DEFAULT_PANEL_SHELL_CONFIG, ...(config ?? {}) };

  return {
    backgroundColorMode: base.backgroundColorMode === 'custom' ? 'custom' : 'inherited',
    backgroundColor: color(base.backgroundColor, DEFAULT_PANEL_SHELL_CONFIG.backgroundColor),
    darkBackgroundDarkenRatio: clamp(
      base.darkBackgroundDarkenRatio,
      0,
      0.5,
      DEFAULT_PANEL_SHELL_CONFIG.darkBackgroundDarkenRatio,
    ),
    lightBackgroundDarkenRatio: clamp(
      base.lightBackgroundDarkenRatio,
      0,
      0.5,
      DEFAULT_PANEL_SHELL_CONFIG.lightBackgroundDarkenRatio,
    ),
    nestedSurfaceLightnessStep: clamp(
      base.nestedSurfaceLightnessStep,
      0,
      0.16,
      DEFAULT_PANEL_SHELL_CONFIG.nestedSurfaceLightnessStep,
    ),
    backgroundOriginalHueRetention: clamp(
      base.backgroundOriginalHueRetention,
      0,
      1,
      DEFAULT_PANEL_SHELL_CONFIG.backgroundOriginalHueRetention,
    ),
    backgroundHueShiftDegrees: clamp(
      base.backgroundHueShiftDegrees,
      -180,
      180,
      DEFAULT_PANEL_SHELL_CONFIG.backgroundHueShiftDegrees,
    ),
    backgroundPigmentIntensity: clamp(
      base.backgroundPigmentIntensity,
      0,
      2,
      DEFAULT_PANEL_SHELL_CONFIG.backgroundPigmentIntensity,
    ),
    backgroundOpacity: clamp(
      base.backgroundOpacity,
      0,
      1,
      DEFAULT_PANEL_SHELL_CONFIG.backgroundOpacity,
    ),
    backgroundBlurEnabled: base.backgroundBlurEnabled !== false,
    backgroundBlurPx: clamp(
      base.backgroundBlurPx,
      0,
      48,
      DEFAULT_PANEL_SHELL_CONFIG.backgroundBlurPx,
    ),
    backdropBlurEnabled: base.backdropBlurEnabled !== false,
    backdropBlurPx: clamp(
      base.backdropBlurPx,
      0,
      48,
      DEFAULT_PANEL_SHELL_CONFIG.backdropBlurPx,
    ),
    backdropBlurSafeAreaPx: clamp(
      base.backdropBlurSafeAreaPx,
      0,
      48,
      DEFAULT_PANEL_SHELL_CONFIG.backdropBlurSafeAreaPx,
    ),
    textColorMode: base.textColorMode === 'custom' ? 'custom' : 'auto',
    textColor: color(base.textColor, DEFAULT_PANEL_SHELL_CONFIG.textColor),
    textMinContrast: clamp(
      base.textMinContrast, 1, 21, DEFAULT_PANEL_SHELL_CONFIG.textMinContrast,
    ),
    separatorColorMode: base.separatorColorMode === 'custom' ? 'custom' : 'text',
    separatorColor: color(base.separatorColor, DEFAULT_PANEL_SHELL_CONFIG.separatorColor),
    separatorOpacity: clamp(
      base.separatorOpacity, 0, 1, DEFAULT_PANEL_SHELL_CONFIG.separatorOpacity,
    ),
    internalSeparatorOpacity: clamp(
      base.internalSeparatorOpacity,
      0,
      1,
      DEFAULT_PANEL_SHELL_CONFIG.internalSeparatorOpacity,
    ),
    borderWidthPx: clamp(base.borderWidthPx, 0, 4, DEFAULT_PANEL_SHELL_CONFIG.borderWidthPx),
    borderColorMode: base.borderColorMode === 'custom' ? 'custom' : 'text',
    borderColor: color(base.borderColor, DEFAULT_PANEL_SHELL_CONFIG.borderColor),
    borderOpacity: clamp(base.borderOpacity, 0, 1, DEFAULT_PANEL_SHELL_CONFIG.borderOpacity),
    radiusPx: clamp(base.radiusPx, 0, 32, DEFAULT_PANEL_SHELL_CONFIG.radiusPx),
    launcherIconVisible: base.launcherIconVisible === true,
    shadowEnabled: base.shadowEnabled !== false,
    restingElevationPx: clamp(
      base.restingElevationPx, 0, 20, DEFAULT_PANEL_SHELL_CONFIG.restingElevationPx,
    ),
    expandedElevationPx: clamp(
      base.expandedElevationPx, 0, 48, DEFAULT_PANEL_SHELL_CONFIG.expandedElevationPx,
    ),
    shadowElevationMaxPx: clamp(
      base.shadowElevationMaxPx, 12, 80, DEFAULT_PANEL_SHELL_CONFIG.shadowElevationMaxPx,
    ),
    shadowLightXPercent: clamp(
      base.shadowLightXPercent, 0, 100, DEFAULT_PANEL_SHELL_CONFIG.shadowLightXPercent,
    ),
    shadowLightYPx: clamp(
      base.shadowLightYPx, -600, 200, DEFAULT_PANEL_SHELL_CONFIG.shadowLightYPx,
    ),
    shadowLightHeightPx: clamp(
      base.shadowLightHeightPx, 24, 320, DEFAULT_PANEL_SHELL_CONFIG.shadowLightHeightPx,
    ),
    shadowLightRadiusPx: clamp(
      base.shadowLightRadiusPx, 8, 320, DEFAULT_PANEL_SHELL_CONFIG.shadowLightRadiusPx,
    ),
    shadowLightDirectIntensity: clamp(
      base.shadowLightDirectIntensity,
      0,
      4,
      DEFAULT_PANEL_SHELL_CONFIG.shadowLightDirectIntensity,
    ),
    shadowLightAmbientIntensity: clamp(
      base.shadowLightAmbientIntensity,
      0,
      4,
      DEFAULT_PANEL_SHELL_CONFIG.shadowLightAmbientIntensity,
    ),
    shadowProjectedStrength: clamp(
      base.shadowProjectedStrength, 0, 1, DEFAULT_PANEL_SHELL_CONFIG.shadowProjectedStrength,
    ),
    shadowProjectedFalloff: clamp(
      base.shadowProjectedFalloff, 0.2, 4, DEFAULT_PANEL_SHELL_CONFIG.shadowProjectedFalloff,
    ),
    shadowContactStrength: clamp(
      base.shadowContactStrength, 0, 1, DEFAULT_PANEL_SHELL_CONFIG.shadowContactStrength,
    ),
    shadowContactFalloff: clamp(
      base.shadowContactFalloff, 0.2, 4, DEFAULT_PANEL_SHELL_CONFIG.shadowContactFalloff,
    ),
    shadowContactDecayElevationPx: clamp(
      base.shadowContactDecayElevationPx,
      4,
      80,
      DEFAULT_PANEL_SHELL_CONFIG.shadowContactDecayElevationPx,
    ),
    shadowNearFieldStrength: clamp(
      base.shadowNearFieldStrength, 0, 1, DEFAULT_PANEL_SHELL_CONFIG.shadowNearFieldStrength,
    ),
    shadowMaxBlurPx: clamp(
      base.shadowMaxBlurPx, 8, 160, DEFAULT_PANEL_SHELL_CONFIG.shadowMaxBlurPx,
    ),
    shadowMaxDisplacementPx: clamp(
      base.shadowMaxDisplacementPx,
      4,
      100,
      DEFAULT_PANEL_SHELL_CONFIG.shadowMaxDisplacementPx,
    ),
    shadowMaxProjectedScale: clamp(
      base.shadowMaxProjectedScale,
      1,
      1.8,
      DEFAULT_PANEL_SHELL_CONFIG.shadowMaxProjectedScale,
    ),
    shadowColorMode: base.shadowColorMode === 'custom' ? 'custom' : 'surface',
    shadowColor: color(base.shadowColor, DEFAULT_PANEL_SHELL_CONFIG.shadowColor),
    shadowSurfaceDarkenAmount: clamp(
      base.shadowSurfaceDarkenAmount,
      0,
      1,
      DEFAULT_PANEL_SHELL_CONFIG.shadowSurfaceDarkenAmount,
    ),
  };
}
