'use client';

import React from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  PROCEDURAL_COLOR_MAX_TEXTURE_RESOLUTION,
  PROCEDURAL_COLOR_MIN_TEXTURE_RESOLUTION,
} from '../../../helpers/proceduralColorResolution';
import { resolveProceduralColorStackRow } from '../../../helpers/proceduralColorSnapshot';
import type {
  AbstractPaletteCadenceDistribution,
  AbstractPaletteCadenceEasing,
} from '../../../helpers/abstractPaletteCadence';
import { ABSTRACT_EDITORIAL_HERO_LAYOUT_SCOPE_ID } from './AbstractEditorialHero.panel';
import { SITE_HEADER_COLORS_SCOPE_ID } from './SiteHeader/config/panel';
import { formatComponentConfigPayload } from '../../../components/Panel/componentConfigPayload';
import {
  ConfigScopeList,
  serializeConfigScopeBindings,
  serializeConfigScopeBindingsDiff,
  type ConfigScopeBinding,
} from '../../../components/Panel/config';
import {
  ColorInput,
  ConfigCopyButton,
  Knob,
  PanelActionGroup,
  PanelButton,
  PanelControlGroup,
  PanelDescription,
  PanelShell,
  PanelSummary,
  Sect,
  SegmentedControl,
  SubLabel,
  SummaryRow,
  Toggle,
} from '../../../components/Panel';

export type AbstractSkyRenderMode = 'static' | 'living' | 'glass' | 'refractor' | 'legacy';
export type AbstractHeroLayoutMode = 'full' | 'editorial' | 'grid';
export type AbstractSkyInkMode = 'auto' | 'light' | 'dark';
export type AbstractGlassPlayback = 'static' | 'dynamic';
export type AbstractGlassBandOrientation = 'columns' | 'rows';
export type AbstractRefractorOrientation = 'columns' | 'rows';
export type GradientDesignerTarget = 'background' | 'heading';

export type GradientDesignerConfig = {
  skyRenderMode: AbstractSkyRenderMode;
  heroContentEnabled: boolean;
  heroLayoutMode: AbstractHeroLayoutMode;
  editorialSourceRow: number;
  firstRowColorOverrideEnabled: boolean;
  firstRowColorVariation: number;
  firstRowColorSaturation: number;
  firstRowColorBrightness: number;
  firstRowColorHueOffset: number;
  firstRowColorMorph: number;
  firstRowColorShimmer: number;
  firstRowColorPulse: number;
  skySunElevationDeg: number;
  skyStopCount: number;
  skyTurbidity: number;
  skyExposure: number;
  skySaturation: number;
  skyChromaDuck: number;
  skyInkUnity: number;
  skyNightDepth: number;
  skyAfterglow: number;
  skyOzone: number;
  skyFalloff: number;
  skyOriginXPercent: number;
  skyOriginYPercent: number;
  skyRadiusXPercent: number;
  skyRadiusYPercent: number;
  skyMotionSpeed: number;
  skyDriftAmount: number;
  skyBreathAmount: number;
  skyTurbulence: number;
  glassPlayback: AbstractGlassPlayback;
  glassBandOrientation: AbstractGlassBandOrientation;
  glassBandSizePx: number;
  glassDisplacementDeltaPercent: number;
  glassDisplacementDirectionDeg: number;
  glassGradientAngleDeg: number;
  glassGradientColorA: string;
  glassGradientColorB: string;
  glassGradientColorC: string;
  glassGradientColorD: string;
  glassPhase: number;
  glassSpeed: number;
  glassResolution: number;
  glassPauseWhenOffscreen: boolean;
  refractorOrientation: AbstractRefractorOrientation;
  refractorSliceCount: number;
  refractorRowDisplacementStepPercent: number;
  refractorRowScaleStepPercent: number;
  refractorColumnDisplacementStepPercent: number;
  refractorColumnScaleStepPercent: number;
  skyDitherStrength: number;
  skyResolution: number;
  skyPauseWhenOffscreen: boolean;
  skyInkMode: AbstractSkyInkMode;
  heroBackgroundAwarenessEnabled: boolean;
  heroBackgroundAwarenessBrightThreshold: number;
  heroBackgroundAwarenessDarkThreshold: number;
  legacyScrimEnabled: boolean;
  legacyPaletteGuardEnabled: boolean;
  legacyPaletteMaximumYellowCoverage: number;
  legacyPaletteMinimumCounterpointCoverage: number;
  legacyPaletteMinimumHueDiversity: number;
  legacyPaletteMinimumChroma: number;
  legacyPaletteMaximumIntervention: number;
  legacyPaletteLookAheadMs: number;
  legacyPaletteAttackMs: number;
  legacyPaletteReleaseMs: number;
  legacyPaletteCadenceEnabled: boolean;
  legacyPaletteCadenceDistribution: AbstractPaletteCadenceDistribution;
  legacyPaletteCadenceEasing: AbstractPaletteCadenceEasing;
  legacyPaletteCadenceInitialDelayMs: number;
  legacyPaletteCadenceDwellMinMs: number;
  legacyPaletteCadenceDwellMaxMs: number;
  legacyPaletteCadenceTransitionDurationMs: number;
  legacyPaletteCadenceTravel: number;
  legacyPaletteCadenceIdleSpeed: number;
  legacyPaletteCadenceDistributionWidth: number;
  legacyPaletteCadenceInvertedCenterVelocity: number;
  legacyPaletteCadenceInteractionQuietMs: number;
  backgroundColor: string;
  shaderColorSpeed: number;
  shaderColorVariation: number;
  shaderColorSaturation: number;
  shaderColorBrightness: number;
  shaderColorScale: number;
  shaderColorResolution: number;
  shaderColorRandomness: number;
  shaderColorHueOffset: number;
  shaderColorMorph: number;
  shaderColorShimmer: number;
  shaderColorPulse: number;
  gradientFaceCount: number;
  viewZoom: number;
  viewOffsetX: number;
  viewOffsetY: number;
  seed: number;
};

export type AbstractPageGradientConfig = Pick<GradientDesignerConfig,
  | 'skyRenderMode'
  | 'heroContentEnabled'
  | 'heroLayoutMode'
  | 'editorialSourceRow'
  | 'firstRowColorOverrideEnabled'
  | 'firstRowColorVariation'
  | 'firstRowColorSaturation'
  | 'firstRowColorBrightness'
  | 'firstRowColorHueOffset'
  | 'firstRowColorMorph'
  | 'firstRowColorShimmer'
  | 'firstRowColorPulse'
  | 'skySunElevationDeg'
  | 'skyStopCount'
  | 'skyTurbidity'
  | 'skyExposure'
  | 'skySaturation'
  | 'skyChromaDuck'
  | 'skyInkUnity'
  | 'skyNightDepth'
  | 'skyAfterglow'
  | 'skyOzone'
  | 'skyFalloff'
  | 'skyOriginXPercent'
  | 'skyOriginYPercent'
  | 'skyRadiusXPercent'
  | 'skyRadiusYPercent'
  | 'skyMotionSpeed'
  | 'skyDriftAmount'
  | 'skyBreathAmount'
  | 'skyTurbulence'
  | 'glassPlayback'
  | 'glassBandOrientation'
  | 'glassBandSizePx'
  | 'glassDisplacementDeltaPercent'
  | 'glassDisplacementDirectionDeg'
  | 'glassGradientAngleDeg'
  | 'glassGradientColorA'
  | 'glassGradientColorB'
  | 'glassGradientColorC'
  | 'glassGradientColorD'
  | 'glassPhase'
  | 'glassSpeed'
  | 'glassResolution'
  | 'glassPauseWhenOffscreen'
  | 'refractorOrientation'
  | 'refractorSliceCount'
  | 'refractorRowDisplacementStepPercent'
  | 'refractorRowScaleStepPercent'
  | 'refractorColumnDisplacementStepPercent'
  | 'refractorColumnScaleStepPercent'
  | 'skyDitherStrength'
  | 'skyResolution'
  | 'skyPauseWhenOffscreen'
  | 'skyInkMode'
  | 'heroBackgroundAwarenessEnabled'
  | 'heroBackgroundAwarenessBrightThreshold'
  | 'heroBackgroundAwarenessDarkThreshold'
  | 'legacyScrimEnabled'
  | 'legacyPaletteGuardEnabled'
  | 'legacyPaletteMaximumYellowCoverage'
  | 'legacyPaletteMinimumCounterpointCoverage'
  | 'legacyPaletteMinimumHueDiversity'
  | 'legacyPaletteMinimumChroma'
  | 'legacyPaletteMaximumIntervention'
  | 'legacyPaletteLookAheadMs'
  | 'legacyPaletteAttackMs'
  | 'legacyPaletteReleaseMs'
  | 'legacyPaletteCadenceEnabled'
  | 'legacyPaletteCadenceDistribution'
  | 'legacyPaletteCadenceEasing'
  | 'legacyPaletteCadenceInitialDelayMs'
  | 'legacyPaletteCadenceDwellMinMs'
  | 'legacyPaletteCadenceDwellMaxMs'
  | 'legacyPaletteCadenceTransitionDurationMs'
  | 'legacyPaletteCadenceTravel'
  | 'legacyPaletteCadenceIdleSpeed'
  | 'legacyPaletteCadenceDistributionWidth'
  | 'legacyPaletteCadenceInvertedCenterVelocity'
  | 'legacyPaletteCadenceInteractionQuietMs'
  | 'backgroundColor'
  | 'shaderColorSpeed'
  | 'shaderColorVariation'
  | 'shaderColorSaturation'
  | 'shaderColorBrightness'
  | 'shaderColorScale'
  | 'shaderColorResolution'
  | 'shaderColorRandomness'
  | 'shaderColorHueOffset'
  | 'shaderColorMorph'
  | 'shaderColorShimmer'
  | 'shaderColorPulse'
  | 'gradientFaceCount'
  | 'viewZoom'
  | 'viewOffsetX'
  | 'viewOffsetY'
  | 'seed'
>;

type GradientDesignerSectionKey =
  | 'stage'
  | 'sky'
  | 'palette'
  | 'shape'
  | 'skyMotion'
  | 'glass'
  | 'refractor'
  | 'color'
  | 'motion'
  | 'view'
  | 'output';

type GradientDesignerPanelProps = {
  config: GradientDesignerConfig;
  componentConfigBindings?: ReadonlyArray<ConfigScopeBinding>;
  designerTarget?: GradientDesignerTarget;
  headingGradientRelationship?: 'linked' | 'custom';
  isOpen: boolean;
  panelBackgroundColor?: string;
  onDesignerTargetChange?: (target: GradientDesignerTarget) => void;
  onHeadingGradientRelationshipChange?: (relationship: 'linked' | 'custom') => void;
  onSyncHeadingGradient?: () => void;
  onToggle: () => void;
  onReset: () => void;
  onResetView: () => void;
  onRandomizeSeed: () => void;
  previewMode?: 'live' | 'snapshot';
  onPreviewModeChange?: (mode: 'live' | 'snapshot') => void;
  updateConfig: <K extends keyof GradientDesignerConfig>(key: K, value: GradientDesignerConfig[K]) => void;
};

export const DEFAULT_ABSTRACT_PAGE_GRADIENT_CONFIG: AbstractPageGradientConfig = {
  skyRenderMode: 'legacy',
  heroContentEnabled: true,
  heroLayoutMode: 'full',
  editorialSourceRow: 3,
  firstRowColorOverrideEnabled: false,
  firstRowColorVariation: 0.185,
  firstRowColorSaturation: 0.64,
  firstRowColorBrightness: 1.09,
  firstRowColorHueOffset: -0.233,
  firstRowColorMorph: 1.45,
  firstRowColorShimmer: 1.17,
  firstRowColorPulse: 1.5,
  skySunElevationDeg: 90,
  skyStopCount: 16,
  skyTurbidity: 10,
  skyExposure: 1.34,
  skySaturation: 1.6,
  skyChromaDuck: 0,
  skyInkUnity: 0.26,
  skyNightDepth: 1,
  skyAfterglow: 0,
  skyOzone: 0,
  skyFalloff: 0.45,
  skyOriginXPercent: 25,
  skyOriginYPercent: -20,
  skyRadiusXPercent: 60,
  skyRadiusYPercent: 180,
  skyMotionSpeed: 0,
  skyDriftAmount: 0,
  skyBreathAmount: 0,
  skyTurbulence: 0,
  glassPlayback: 'static',
  glassBandOrientation: 'columns',
  glassBandSizePx: 18,
  glassDisplacementDeltaPercent: 8,
  glassDisplacementDirectionDeg: 62,
  glassGradientAngleDeg: -24,
  glassGradientColorA: '#4bc7ff',
  glassGradientColorB: '#f22f72',
  glassGradientColorC: '#ff8a4c',
  glassGradientColorD: '#071a3d',
  glassPhase: 0,
  glassSpeed: 0.17,
  glassResolution: 1024,
  glassPauseWhenOffscreen: true,
  refractorOrientation: 'columns',
  refractorSliceCount: 11,
  refractorRowDisplacementStepPercent: 10,
  refractorRowScaleStepPercent: 10,
  refractorColumnDisplacementStepPercent: 10,
  refractorColumnScaleStepPercent: 10,
  skyDitherStrength: 2,
  skyResolution: 768,
  skyPauseWhenOffscreen: true,
  skyInkMode: 'auto',
  heroBackgroundAwarenessEnabled: false,
  heroBackgroundAwarenessBrightThreshold: 0.62,
  heroBackgroundAwarenessDarkThreshold: 0.42,
  legacyScrimEnabled: false,
  legacyPaletteGuardEnabled: true,
  legacyPaletteMaximumYellowCoverage: 0.58,
  legacyPaletteMinimumCounterpointCoverage: 0.12,
  legacyPaletteMinimumHueDiversity: 0.16,
  legacyPaletteMinimumChroma: 0.055,
  legacyPaletteMaximumIntervention: 1,
  legacyPaletteLookAheadMs: 900,
  legacyPaletteAttackMs: 420,
  legacyPaletteReleaseMs: 1400,
  legacyPaletteCadenceEnabled: true,
  legacyPaletteCadenceDistribution: 'gaussian',
  legacyPaletteCadenceEasing: 'sine',
  legacyPaletteCadenceInitialDelayMs: 0,
  legacyPaletteCadenceDwellMinMs: 6000,
  legacyPaletteCadenceDwellMaxMs: 11000,
  legacyPaletteCadenceTransitionDurationMs: 3500,
  legacyPaletteCadenceTravel: 0.42,
  legacyPaletteCadenceIdleSpeed: 0.025,
  legacyPaletteCadenceDistributionWidth: 0.2,
  legacyPaletteCadenceInvertedCenterVelocity: 0.18,
  legacyPaletteCadenceInteractionQuietMs: 2500,
  backgroundColor: '#000000',
  shaderColorSpeed: 2.1,
  shaderColorVariation: 0.185,
  shaderColorSaturation: 0.64,
  shaderColorBrightness: 1.09,
  shaderColorScale: 1.09,
  shaderColorResolution: 768,
  shaderColorRandomness: 0.49,
  shaderColorHueOffset: -0.233,
  shaderColorMorph: 1.45,
  shaderColorShimmer: 1.17,
  shaderColorPulse: 1.5,
  gradientFaceCount: 8,
  viewZoom: 0.8181,
  viewOffsetX: 0.004,
  viewOffsetY: 0.1121,
  seed: 0.556,
};

export const DEFAULT_GRADIENT_DESIGNER_CONFIG: GradientDesignerConfig = {
  ...DEFAULT_ABSTRACT_PAGE_GRADIENT_CONFIG,
};

const INITIAL_SECTIONS: Record<GradientDesignerSectionKey, boolean> = {
  stage: true,
  sky: false,
  palette: true,
  shape: false,
  skyMotion: false,
  glass: true,
  refractor: true,
  color: false,
  motion: false,
  view: false,
  output: false,
};

function formatNumber(value: number, precision = 3) {
  if (!Number.isFinite(value)) return '0';
  return Number(value.toFixed(precision)).toString();
}
export function selectAbstractPageGradientConfig(
  config: GradientDesignerConfig,
): AbstractPageGradientConfig {
  const editorialRow = resolveProceduralColorStackRow(
    config.editorialSourceRow,
    config.gradientFaceCount,
  );

  return {
    skyRenderMode: config.skyRenderMode,
    heroContentEnabled: config.heroContentEnabled,
    heroLayoutMode: config.heroLayoutMode,
    editorialSourceRow: editorialRow.rowNumber,
    firstRowColorOverrideEnabled: config.firstRowColorOverrideEnabled,
    firstRowColorVariation: config.firstRowColorVariation,
    firstRowColorSaturation: config.firstRowColorSaturation,
    firstRowColorBrightness: config.firstRowColorBrightness,
    firstRowColorHueOffset: config.firstRowColorHueOffset,
    firstRowColorMorph: config.firstRowColorMorph,
    firstRowColorShimmer: config.firstRowColorShimmer,
    firstRowColorPulse: config.firstRowColorPulse,
    skySunElevationDeg: config.skySunElevationDeg,
    skyStopCount: config.skyStopCount,
    skyTurbidity: config.skyTurbidity,
    skyExposure: config.skyExposure,
    skySaturation: config.skySaturation,
    skyChromaDuck: config.skyChromaDuck,
    skyInkUnity: config.skyInkUnity,
    skyNightDepth: config.skyNightDepth,
    skyAfterglow: config.skyAfterglow,
    skyOzone: config.skyOzone,
    skyFalloff: config.skyFalloff,
    skyOriginXPercent: config.skyOriginXPercent,
    skyOriginYPercent: config.skyOriginYPercent,
    skyRadiusXPercent: config.skyRadiusXPercent,
    skyRadiusYPercent: config.skyRadiusYPercent,
    skyMotionSpeed: config.skyMotionSpeed,
    skyDriftAmount: config.skyDriftAmount,
    skyBreathAmount: config.skyBreathAmount,
    skyTurbulence: config.skyTurbulence,
    glassPlayback: config.glassPlayback,
    glassBandOrientation: config.glassBandOrientation,
    glassBandSizePx: config.glassBandSizePx,
    glassDisplacementDeltaPercent: config.glassDisplacementDeltaPercent,
    glassDisplacementDirectionDeg: config.glassDisplacementDirectionDeg,
    glassGradientAngleDeg: config.glassGradientAngleDeg,
    glassGradientColorA: config.glassGradientColorA,
    glassGradientColorB: config.glassGradientColorB,
    glassGradientColorC: config.glassGradientColorC,
    glassGradientColorD: config.glassGradientColorD,
    glassPhase: config.glassPhase,
    glassSpeed: config.glassSpeed,
    glassResolution: config.glassResolution,
    glassPauseWhenOffscreen: config.glassPauseWhenOffscreen,
    refractorOrientation: config.refractorOrientation,
    refractorSliceCount: config.refractorSliceCount,
    refractorRowDisplacementStepPercent: config.refractorRowDisplacementStepPercent,
    refractorRowScaleStepPercent: config.refractorRowScaleStepPercent,
    refractorColumnDisplacementStepPercent: config.refractorColumnDisplacementStepPercent,
    refractorColumnScaleStepPercent: config.refractorColumnScaleStepPercent,
    skyDitherStrength: config.skyDitherStrength,
    skyResolution: config.skyResolution,
    skyPauseWhenOffscreen: config.skyPauseWhenOffscreen,
    skyInkMode: config.skyInkMode,
    heroBackgroundAwarenessEnabled: config.heroBackgroundAwarenessEnabled,
    heroBackgroundAwarenessBrightThreshold: config.heroBackgroundAwarenessBrightThreshold,
    heroBackgroundAwarenessDarkThreshold: config.heroBackgroundAwarenessDarkThreshold,
    legacyScrimEnabled: config.legacyScrimEnabled,
    legacyPaletteGuardEnabled: config.legacyPaletteGuardEnabled,
    legacyPaletteMaximumYellowCoverage: config.legacyPaletteMaximumYellowCoverage,
    legacyPaletteMinimumCounterpointCoverage: config.legacyPaletteMinimumCounterpointCoverage,
    legacyPaletteMinimumHueDiversity: config.legacyPaletteMinimumHueDiversity,
    legacyPaletteMinimumChroma: config.legacyPaletteMinimumChroma,
    legacyPaletteMaximumIntervention: config.legacyPaletteMaximumIntervention,
    legacyPaletteLookAheadMs: config.legacyPaletteLookAheadMs,
    legacyPaletteAttackMs: config.legacyPaletteAttackMs,
    legacyPaletteReleaseMs: config.legacyPaletteReleaseMs,
    legacyPaletteCadenceEnabled: config.legacyPaletteCadenceEnabled,
    legacyPaletteCadenceDistribution: config.legacyPaletteCadenceDistribution,
    legacyPaletteCadenceEasing: config.legacyPaletteCadenceEasing,
    legacyPaletteCadenceInitialDelayMs: config.legacyPaletteCadenceInitialDelayMs,
    legacyPaletteCadenceDwellMinMs: config.legacyPaletteCadenceDwellMinMs,
    legacyPaletteCadenceDwellMaxMs: config.legacyPaletteCadenceDwellMaxMs,
    legacyPaletteCadenceTransitionDurationMs: config.legacyPaletteCadenceTransitionDurationMs,
    legacyPaletteCadenceTravel: config.legacyPaletteCadenceTravel,
    legacyPaletteCadenceIdleSpeed: config.legacyPaletteCadenceIdleSpeed,
    legacyPaletteCadenceDistributionWidth: config.legacyPaletteCadenceDistributionWidth,
    legacyPaletteCadenceInvertedCenterVelocity: config.legacyPaletteCadenceInvertedCenterVelocity,
    legacyPaletteCadenceInteractionQuietMs: config.legacyPaletteCadenceInteractionQuietMs,
    backgroundColor: config.backgroundColor,
    shaderColorSpeed: config.shaderColorSpeed,
    shaderColorVariation: config.shaderColorVariation,
    shaderColorSaturation: config.shaderColorSaturation,
    shaderColorBrightness: config.shaderColorBrightness,
    shaderColorScale: config.shaderColorScale,
    shaderColorResolution: config.shaderColorResolution,
    shaderColorRandomness: config.shaderColorRandomness,
    shaderColorHueOffset: config.shaderColorHueOffset,
    shaderColorMorph: config.shaderColorMorph,
    shaderColorShimmer: config.shaderColorShimmer,
    shaderColorPulse: config.shaderColorPulse,
    gradientFaceCount: config.gradientFaceCount,
    viewZoom: config.viewZoom,
    viewOffsetX: config.viewOffsetX,
    viewOffsetY: config.viewOffsetY,
    seed: config.seed,
  };
}

export function GradientDesignerPanel({
  config,
  componentConfigBindings = [],
  designerTarget = 'background',
  headingGradientRelationship = 'linked',
  isOpen,
  panelBackgroundColor,
  onDesignerTargetChange,
  onHeadingGradientRelationshipChange,
  onSyncHeadingGradient,
  onToggle,
  onReset,
  onResetView,
  onRandomizeSeed,
  previewMode,
  onPreviewModeChange,
  updateConfig,
}: GradientDesignerPanelProps) {
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const editorialRow = resolveProceduralColorStackRow(
    config.editorialSourceRow,
    config.gradientFaceCount,
  );
  const editorialHeroBinding = useMemo(
    () => componentConfigBindings.find(
      binding => binding.definition.id === ABSTRACT_EDITORIAL_HERO_LAYOUT_SCOPE_ID,
    ),
    [componentConfigBindings],
  );
  const siteHeaderBinding = useMemo(
    () => componentConfigBindings.find(
      binding => binding.definition.id === SITE_HEADER_COLORS_SCOPE_ID,
    ),
    [componentConfigBindings],
  );
  const headingSettings = editorialHeroBinding?.value;
  const headingDebugEnabled = headingSettings?.headlineGradientDebugEnabled === true;
  const headingDebugSize = typeof headingSettings?.headlineGradientDebugSizePx === 'number'
    ? headingSettings.headlineGradientDebugSizePx
    : 320;
  const headingSourceMode = headingSettings?.headlineGradientSourceMode === 'band'
    ? 'band'
    : 'full';
  const headingSourceRow = typeof headingSettings?.headlineGradientSourceRow === 'number'
    ? headingSettings.headlineGradientSourceRow
    : 3;
  const headingScale = typeof headingSettings?.headlineGradientScale === 'number'
    ? headingSettings.headlineGradientScale
    : 3;
  const headingPanX = typeof headingSettings?.headlineGradientPanXPercent === 'number'
    ? headingSettings.headlineGradientPanXPercent
    : 73;
  const headingPanY = typeof headingSettings?.headlineGradientPanYPercent === 'number'
    ? headingSettings.headlineGradientPanYPercent
    : 29;
  const updateHeadingSetting = useCallback((key: string, value: boolean | number | string) => {
    editorialHeroBinding?.updateField(key, value);
  }, [editorialHeroBinding]);
  const paragraphTextColor = typeof headingSettings?.paragraphTextColor === 'string'
    ? headingSettings.paragraphTextColor
    : '#c0bec6';
  const headerSettings = siteHeaderBinding?.value;
  const headerColorMode = headerSettings?.colorMode === 'custom' ? 'custom' : 'adaptive';
  const headerLogoColor = typeof headerSettings?.logoColor === 'string'
    ? headerSettings.logoColor
    : '#ffffff';
  const headerNavTextColor = typeof headerSettings?.navTextColor === 'string'
    ? headerSettings.navTextColor
    : '#ffffff';
  const headerNavBorderColor = typeof headerSettings?.navBorderColor === 'string'
    ? headerSettings.navBorderColor
    : '#ffffff';
  const headerHeight = typeof headerSettings?.height === 'string'
    ? headerSettings.height
    : 'h-28';
  const headerDesktopHeight = typeof headerSettings?.desktopHeight === 'string'
    ? headerSettings.desktopHeight
    : 'md:h-28';
  const headerPaddingX = typeof headerSettings?.paddingX === 'string'
    ? headerSettings.paddingX
    : 'px-5';
  const headerPaddingY = typeof headerSettings?.paddingY === 'string'
    ? headerSettings.paddingY
    : 'py-1';
  const headerDesktopPaddingX = typeof headerSettings?.desktopPaddingX === 'string'
    ? headerSettings.desktopPaddingX
    : 'md:px-12';
  const headerDesktopPaddingY = typeof headerSettings?.desktopPaddingY === 'string'
    ? headerSettings.desktopPaddingY
    : 'md:py-2';
  const headerMarginTop = typeof headerSettings?.marginTop === 'string'
    ? headerSettings.marginTop
    : 'mt-0';
  const headerMarginBottom = typeof headerSettings?.marginBottom === 'string'
    ? headerSettings.marginBottom
    : 'mb-0';
  const headerDesktopMarginTop = typeof headerSettings?.desktopMarginTop === 'string'
    ? headerSettings.desktopMarginTop
    : 'md:mt-8';
  const headerDesktopMarginBottom = typeof headerSettings?.desktopMarginBottom === 'string'
    ? headerSettings.desktopMarginBottom
    : 'md:mb-0';
  const headerNavBandEnabled = headerSettings?.navBandEnabled === true;
  const headerNavBandSourceRow = typeof headerSettings?.navBandSourceRow === 'number'
    ? headerSettings.navBandSourceRow
    : 1;
  const headerNavBandScale = typeof headerSettings?.navBandScale === 'number'
    ? headerSettings.navBandScale
    : 1;
  const headerNavBandPanX = typeof headerSettings?.navBandPanXPercent === 'number'
    ? headerSettings.navBandPanXPercent
    : 50;
  const headerNavBandPanY = typeof headerSettings?.navBandPanYPercent === 'number'
    ? headerSettings.navBandPanYPercent
    : 50;
  const headerNavBandOpacity = typeof headerSettings?.navBandOpacity === 'number'
    ? headerSettings.navBandOpacity
    : 1;
  const headerNavBandChromaDuck = typeof headerSettings?.navBandChromaDuck === 'number'
    ? headerSettings.navBandChromaDuck
    : 0.16;
  const headerNavBandSaturation = typeof headerSettings?.navBandSaturation === 'number'
    ? headerSettings.navBandSaturation
    : 1.36;
  const headerNavBandBrightness = typeof headerSettings?.navBandBrightness === 'number'
    ? headerSettings.navBandBrightness
    : 0.76;
  const updateHeaderSetting = useCallback((
    key: string,
    value: boolean | number | string,
  ) => {
    siteHeaderBinding?.updateField(key, value);
  }, [siteHeaderBinding]);
  const summary = useMemo(() => {
    if (config.skyRenderMode === 'static' || config.skyRenderMode === 'living') {
      return [
        { label: 'HERO', value: config.skyRenderMode.toUpperCase() },
        { label: 'TWILIGHT', value: `${formatNumber(config.skySunElevationDeg, 1)}°` },
        { label: 'LIGHT', value: `${formatNumber(config.skyOriginXPercent, 0)}%, ${formatNumber(config.skyOriginYPercent, 0)}%` },
        { label: 'FIELD', value: `${formatNumber(config.skyRadiusXPercent, 0)}% × ${formatNumber(config.skyRadiusYPercent, 0)}%` },
        { label: 'RESTRAINT', value: `${formatNumber(config.skyChromaDuck * 100, 0)}%` },
        { label: 'STOPS', value: `${Math.round(config.skyStopCount)}` },
      ];
    }

    if (config.skyRenderMode === 'glass') {
      return [
        { label: 'HERO', value: 'GLASS' },
        { label: 'PLAYBACK', value: config.glassPlayback.toUpperCase() },
        { label: 'BANDS', value: config.glassBandOrientation.toUpperCase() },
        { label: 'SIZE', value: `${formatNumber(config.glassBandSizePx, 0)}px` },
        { label: 'DELTA', value: `${formatNumber(config.glassDisplacementDeltaPercent, 2)}%` },
        { label: 'TEXTURE', value: `${Math.round(config.glassResolution)}px` },
      ];
    }

    if (config.skyRenderMode === 'refractor') {
      return [
        { label: 'HERO', value: 'REFRACTOR' },
        { label: 'SLICES', value: config.refractorOrientation.toUpperCase() },
        { label: 'COUNT', value: `${Math.round(config.refractorSliceCount)}` },
        { label: 'FIELD', value: 'BLUE / WHITE' },
      ];
    }

    return [
      { label: 'HERO', value: 'SHADER' },
      { label: 'LAYOUT', value: config.heroLayoutMode.toUpperCase() },
      ...(config.heroLayoutMode === 'editorial'
        ? [{ label: 'SOURCE', value: `ROW ${editorialRow.rowNumber}/${editorialRow.rowCount}` }]
        : []),
      { label: 'SCALE', value: `${formatNumber(config.shaderColorScale * config.viewZoom, 2)}x` },
      { label: 'PAN', value: `${formatNumber(config.viewOffsetX, 2)}, ${formatNumber(config.viewOffsetY, 2)}` },
      { label: 'FACES', value: `${Math.round(config.gradientFaceCount)} + 0` },
      { label: 'TEXTURE', value: `${Math.round(config.shaderColorResolution)}px` },
      { label: 'SEED', value: formatNumber(config.seed, 2) },
    ];
  }, [
    config.glassBandOrientation,
    config.glassBandSizePx,
    config.glassDisplacementDeltaPercent,
    config.glassPlayback,
    config.glassResolution,
    config.refractorOrientation,
    config.refractorSliceCount,
    config.gradientFaceCount,
    config.heroLayoutMode,
    editorialRow.rowCount,
    editorialRow.rowNumber,
    config.seed,
    config.shaderColorResolution,
    config.shaderColorScale,
    config.skyOriginXPercent,
    config.skyOriginYPercent,
    config.skyChromaDuck,
    config.skyRadiusXPercent,
    config.skyRadiusYPercent,
    config.skyRenderMode,
    config.skyStopCount,
    config.skySunElevationDeg,
    config.viewOffsetX,
    config.viewOffsetY,
    config.viewZoom,
  ]);
  const abstractPageConfigText = useMemo(() => formatComponentConfigPayload({
    component: 'AbstractPage',
    scope: 'gradient',
    targetFile: 'experiences/abstract/components/GradientDesignerPanel.tsx',
    targetSymbol: 'DEFAULT_ABSTRACT_PAGE_GRADIENT_CONFIG',
    targetType: 'AbstractPageGradientConfig',
    config: selectAbstractPageGradientConfig(config),
  }), [config]);
  const dynamicComponentConfigText = useMemo(
    () => serializeConfigScopeBindings(componentConfigBindings),
    [componentConfigBindings],
  );
  const allConfigText = useMemo(
    () => [
      abstractPageConfigText,
      dynamicComponentConfigText,
    ].filter(Boolean).join('\n\n'),
    [abstractPageConfigText, dynamicComponentConfigText],
  );
  // "COPY DIFF" — diffs componentConfigBindings the same way COPY ALL's own
  // dynamicComponentConfigText does; abstractPageConfigText above is a
  // hand-built payload for a legacy scope that never went through the
  // ConfigScopeBinding/defaultValue system this diff depends on, so it's
  // included as-is (always complete), not diffed. COPY ALL itself is
  // untouched.
  const dynamicComponentConfigDiffText = useMemo(
    () => serializeConfigScopeBindingsDiff(componentConfigBindings),
    [componentConfigBindings],
  );
  const allConfigDiffText = useMemo(
    () => [
      abstractPageConfigText,
      dynamicComponentConfigDiffText,
    ].filter(Boolean).join('\n\n'),
    [abstractPageConfigText, dynamicComponentConfigDiffText],
  );

  const toggleSection = useCallback((key: GradientDesignerSectionKey) => {
    setSections(previous => ({ ...previous, [key]: !previous[key] }));
  }, []);

  return (
    <PanelShell
      title="ABSTRACT"
      isOpen={isOpen}
      onToggle={onToggle}
      backgroundColor={panelBackgroundColor}
      headerActions={
        <PanelActionGroup ariaLabel="Abstract panel actions">
          <ConfigCopyButton text={allConfigText} label="COPY ALL" />
          <ConfigCopyButton
            text={allConfigDiffText}
            label="COPY DIFF"
            disabled={allConfigDiffText.length === 0}
          />
          <PanelButton onClick={onReset}>RESET</PanelButton>
        </PanelActionGroup>
      }
    >
      {onDesignerTargetChange ? (
        <PanelControlGroup>
          <SubLabel>Editing target</SubLabel>
          <SegmentedControl
            value={designerTarget}
            options={[
              { label: 'BACKGROUND', value: 'background' },
              { label: 'HEADING', value: 'heading' },
            ]}
            onChange={onDesignerTargetChange}
            ariaLabel="Gradient editing target"
          />
          <PanelDescription>
            {designerTarget === 'heading'
              ? headingGradientRelationship === 'custom'
                ? 'The legacy control surface edits the independent heading recipe.'
                : 'The legacy control surface edits the source shared by the background and heading.'
              : 'The legacy control surface edits the background recipe.'}
          </PanelDescription>
        </PanelControlGroup>
      ) : null}
      {previewMode && onPreviewModeChange && config.skyRenderMode === 'legacy' ? (
        <PanelControlGroup>
          <SubLabel>Preview</SubLabel>
          <SegmentedControl
            value={previewMode}
            options={[
              { label: 'LIVE', value: 'live' },
              { label: 'SNAP', value: 'snapshot' },
            ]}
            onChange={onPreviewModeChange}
            ariaLabel="Gradient preview mode"
          />
          <PanelDescription>
            Live animates the field. Snap freezes the exact current composition.
          </PanelDescription>
        </PanelControlGroup>
      ) : null}
      <PanelSummary>
        {summary.map(row => <SummaryRow key={row.label} label={row.label} value={row.value} />)}
      </PanelSummary>

      <Sect title="Stage" open={sections.stage} onToggle={() => toggleSection('stage')}>
        <PanelControlGroup>
          <SubLabel>Hero background</SubLabel>
          <SegmentedControl
            value={config.skyRenderMode}
            options={[
              { label: 'LEGACY', value: 'legacy' },
            ]}
            onChange={value => updateConfig('skyRenderMode', value)}
            ariaLabel="Hero background mode"
          />
          <PanelDescription>
            The legacy procedural hero is the only background mode exposed in this panel.
          </PanelDescription>
        </PanelControlGroup>
        {config.skyRenderMode === 'legacy' && designerTarget === 'background' ? (
          <PanelControlGroup>
            <SubLabel>Layout</SubLabel>
            <Toggle
              label="Show hero content"
              checked={config.heroContentEnabled}
              onChange={value => updateConfig('heroContentEnabled', value)}
            />
            <SegmentedControl
              value={config.heroLayoutMode}
              options={[
                { label: 'FULL', value: 'full' },
                { label: 'EDITORIAL', value: 'editorial' },
                { label: 'GRID', value: 'grid' },
              ]}
              onChange={value => updateConfig('heroLayoutMode', value)}
              ariaLabel="Hero layout mode"
            />
            {config.heroContentEnabled || config.heroLayoutMode === 'editorial' ? (
              <>
                <Knob
                  label={config.heroContentEnabled ? 'Headline source band' : 'Source row'}
                  value={editorialRow.rowNumber}
                  min={1}
                  max={editorialRow.rowCount}
                  step={1}
                  onChange={value => updateConfig('editorialSourceRow', Math.round(value))}
                  description={config.heroContentEnabled
                    ? 'Selects the live legacy band clipped through the headline. In Editorial mode it also selects the promoted source row.'
                    : 'Selects a top-to-bottom row from the full gradient composite and places it in the first hero row without stretching it.'}
                />
                {config.heroLayoutMode === 'editorial' ? (
                  <PanelDescription>
                    {editorialRow.rowCount > 1
                      ? `Rows two through ${editorialRow.rowCount} retain their layout height for editorial UI and visual elements.`
                      : 'Increase the face count to reserve additional rows for editorial UI and visual elements.'}
                  </PanelDescription>
                ) : null}
              </>
            ) : null}
            {config.heroLayoutMode === 'grid' ? (
              <PanelDescription>
                Tiles the same faces as a square-ish grid instead of stacked rows. Adjust Face count in the View section below to change grid density.
              </PanelDescription>
            ) : null}
            <Toggle
              label="Override first-row color"
              checked={config.firstRowColorOverrideEnabled}
              onChange={value => updateConfig('firstRowColorOverrideEnabled', value)}
            />
            {config.firstRowColorOverrideEnabled ? (
              <>
                <Knob label="Row variation" value={config.firstRowColorVariation} min={0} max={0.4} step={0.005} unit="x" onChange={value => updateConfig('firstRowColorVariation', value)} />
                <Knob label="Row saturation" value={config.firstRowColorSaturation} min={0} max={2.5} step={0.01} unit="x" onChange={value => updateConfig('firstRowColorSaturation', value)} />
                <Knob label="Row brightness" value={config.firstRowColorBrightness} min={0.4} max={1.6} step={0.01} unit="x" onChange={value => updateConfig('firstRowColorBrightness', value)} />
                <Knob label="Row hue offset" value={config.firstRowColorHueOffset} min={-0.36} max={0.36} step={0.001} unit="x" onChange={value => updateConfig('firstRowColorHueOffset', value)} />
                <Knob label="Row morph" value={config.firstRowColorMorph} min={0} max={1.45} step={0.01} unit="x" onChange={value => updateConfig('firstRowColorMorph', value)} />
                <Knob label="Row shimmer" value={config.firstRowColorShimmer} min={0} max={1.5} step={0.01} unit="x" onChange={value => updateConfig('firstRowColorShimmer', value)} />
                <Knob label="Row pulse" value={config.firstRowColorPulse} min={0} max={1.5} step={0.01} unit="x" onChange={value => updateConfig('firstRowColorPulse', value)} />
                <PanelDescription>
                  Overrides physical row one in Full mode and the promoted source band in Editorial mode.
                </PanelDescription>
              </>
            ) : null}
          </PanelControlGroup>
        ) : null}
        {config.skyRenderMode === 'legacy' && designerTarget === 'heading' && editorialHeroBinding ? (
          <PanelControlGroup>
            <SubLabel>Heading gradient</SubLabel>
            <SegmentedControl
              value={headingGradientRelationship}
              options={[
                { label: 'LINKED', value: 'linked' },
                { label: 'CUSTOM', value: 'custom' },
              ]}
              onChange={value => onHeadingGradientRelationshipChange?.(value)}
              ariaLabel="Heading gradient relationship"
            />
            <Toggle
              label="Show heading gradient debug"
              checked={headingDebugEnabled}
              onChange={value => updateHeadingSetting('headlineGradientDebugEnabled', value)}
            />
            {headingDebugEnabled ? (
              <Knob
                label="Debug preview size"
                value={headingDebugSize}
                min={240}
                max={480}
                step={8}
                unit="px"
                onChange={value => updateHeadingSetting('headlineGradientDebugSizePx', Math.round(value))}
              />
            ) : null}
            <SegmentedControl
              value={headingSourceMode}
              options={[
                { label: 'FULL FIELD', value: 'full' },
                { label: 'BAND', value: 'band' },
              ]}
              onChange={value => updateHeadingSetting('headlineGradientSourceMode', value)}
              ariaLabel="Heading gradient source"
            />
            {headingSourceMode === 'band' ? (
              <Knob
                label="Heading source band"
                value={headingSourceRow}
                min={1}
                max={Math.max(1, Math.round(config.gradientFaceCount))}
                step={1}
                onChange={value => updateHeadingSetting('headlineGradientSourceRow', Math.round(value))}
              />
            ) : null}
            <Knob label="Heading crop scale" value={headingScale} min={1} max={3} step={0.05} unit="x" onChange={value => updateHeadingSetting('headlineGradientScale', value)} />
            <Knob label="Heading crop X" value={headingPanX} min={0} max={100} step={1} unit="%" onChange={value => updateHeadingSetting('headlineGradientPanXPercent', value)} />
            <Knob label="Heading crop Y" value={headingPanY} min={0} max={100} step={1} unit="%" onChange={value => updateHeadingSetting('headlineGradientPanYPercent', value)} />
            {headingGradientRelationship === 'custom' && onSyncHeadingGradient ? (
              <PanelButton onClick={onSyncHeadingGradient}>SYNC FROM LEGACY</PanelButton>
            ) : null}
            <PanelDescription>
              {headingGradientRelationship === 'linked'
                ? 'Linked samples the exact canonical legacy composite. All shader controls below edit that shared source.'
                : 'Custom uses the same legacy renderer with heading-specific shader controls below.'}
            </PanelDescription>
          </PanelControlGroup>
        ) : null}
        {config.skyRenderMode === 'legacy' && designerTarget === 'background' && editorialHeroBinding ? (
          <PanelControlGroup>
            <SubLabel>Hero copy</SubLabel>
            <ColorInput label="Paragraph text" value={paragraphTextColor} onChange={value => updateHeadingSetting('paragraphTextColor', value)} />
          </PanelControlGroup>
        ) : null}
        {config.skyRenderMode === 'legacy' && designerTarget === 'background' && siteHeaderBinding ? (
          <>
            <PanelControlGroup>
              <SubLabel>Top bar wrapper</SubLabel>
              <Toggle
                label="Show gradient band"
                checked={headerNavBandEnabled}
                onChange={value => updateHeaderSetting('navBandEnabled', value)}
              />
              <SubLabel>Wrapper height · narrow</SubLabel>
              <SegmentedControl
                value={headerHeight}
                options={[
                  { label: 'H-12', value: 'h-12' },
                  { label: 'H-14', value: 'h-14' },
                  { label: 'H-16', value: 'h-16' },
                  { label: 'H-20', value: 'h-20' },
                  { label: 'H-24', value: 'h-24' },
                  { label: 'H-28', value: 'h-28' },
                  { label: 'H-32', value: 'h-32' },
                  { label: 'H-36', value: 'h-36' },
                  { label: 'H-40', value: 'h-40' },
                ]}
                onChange={value => updateHeaderSetting('height', value)}
                ariaLabel="Top bar narrow height"
              />
              <SubLabel>Wrapper height · desktop</SubLabel>
              <SegmentedControl
                value={headerDesktopHeight}
                options={[
                  { label: 'H-12', value: 'md:h-12' },
                  { label: 'H-14', value: 'md:h-14' },
                  { label: 'H-16', value: 'md:h-16' },
                  { label: 'H-20', value: 'md:h-20' },
                  { label: 'H-24', value: 'md:h-24' },
                  { label: 'H-28', value: 'md:h-28' },
                  { label: 'H-32', value: 'md:h-32' },
                  { label: 'H-36', value: 'md:h-36' },
                  { label: 'H-40', value: 'md:h-40' },
                ]}
                onChange={value => updateHeaderSetting('desktopHeight', value)}
                ariaLabel="Top bar desktop height"
              />
              <SubLabel>Narrow padding</SubLabel>
              <SegmentedControl
                value={headerPaddingX}
                options={[
                  { label: 'PX-4', value: 'px-4' },
                  { label: 'PX-5', value: 'px-5' },
                  { label: 'PX-6', value: 'px-6' },
                  { label: 'PX-8', value: 'px-8' },
                ]}
                onChange={value => updateHeaderSetting('paddingX', value)}
                ariaLabel="Top bar narrow horizontal padding"
              />
              <SegmentedControl
                value={headerPaddingY}
                options={[
                  { label: 'PY-0', value: 'py-0' },
                  { label: 'PY-1', value: 'py-1' },
                  { label: 'PY-2', value: 'py-2' },
                  { label: 'PY-3', value: 'py-3' },
                  { label: 'PY-4', value: 'py-4' },
                  { label: 'PY-6', value: 'py-6' },
                ]}
                onChange={value => updateHeaderSetting('paddingY', value)}
                ariaLabel="Top bar narrow vertical padding"
              />
              <SubLabel>Desktop padding</SubLabel>
              <SegmentedControl
                value={headerDesktopPaddingX}
                options={[
                  { label: 'PX-6', value: 'md:px-6' },
                  { label: 'PX-8', value: 'md:px-8' },
                  { label: 'PX-10', value: 'md:px-10' },
                  { label: 'PX-12', value: 'md:px-12' },
                  { label: 'PX-16', value: 'md:px-16' },
                ]}
                onChange={value => updateHeaderSetting('desktopPaddingX', value)}
                ariaLabel="Top bar desktop horizontal padding"
              />
              <SegmentedControl
                value={headerDesktopPaddingY}
                options={[
                  { label: 'PY-0', value: 'md:py-0' },
                  { label: 'PY-1', value: 'md:py-1' },
                  { label: 'PY-2', value: 'md:py-2' },
                  { label: 'PY-3', value: 'md:py-3' },
                  { label: 'PY-4', value: 'md:py-4' },
                  { label: 'PY-6', value: 'md:py-6' },
                ]}
                onChange={value => updateHeaderSetting('desktopPaddingY', value)}
                ariaLabel="Top bar desktop vertical padding"
              />
              <SubLabel>Narrow margins</SubLabel>
              <SegmentedControl
                value={headerMarginTop}
                options={[
                  { label: 'MT-0', value: 'mt-0' },
                  { label: 'MT-2', value: 'mt-2' },
                  { label: 'MT-4', value: 'mt-4' },
                  { label: 'MT-6', value: 'mt-6' },
                  { label: 'MT-8', value: 'mt-8' },
                ]}
                onChange={value => updateHeaderSetting('marginTop', value)}
                ariaLabel="Top bar narrow top margin"
              />
              <SegmentedControl
                value={headerMarginBottom}
                options={[
                  { label: 'MB-0', value: 'mb-0' },
                  { label: 'MB-2', value: 'mb-2' },
                  { label: 'MB-4', value: 'mb-4' },
                  { label: 'MB-6', value: 'mb-6' },
                  { label: 'MB-8', value: 'mb-8' },
                ]}
                onChange={value => updateHeaderSetting('marginBottom', value)}
                ariaLabel="Top bar narrow bottom margin"
              />
              <SubLabel>Desktop margins</SubLabel>
              <SegmentedControl
                value={headerDesktopMarginTop}
                options={[
                  { label: 'MT-0', value: 'md:mt-0' },
                  { label: 'MT-2', value: 'md:mt-2' },
                  { label: 'MT-4', value: 'md:mt-4' },
                  { label: 'MT-6', value: 'md:mt-6' },
                  { label: 'MT-8', value: 'md:mt-8' },
                ]}
                onChange={value => updateHeaderSetting('desktopMarginTop', value)}
                ariaLabel="Top bar desktop top margin"
              />
              <SegmentedControl
                value={headerDesktopMarginBottom}
                options={[
                  { label: 'MB-0', value: 'md:mb-0' },
                  { label: 'MB-2', value: 'md:mb-2' },
                  { label: 'MB-4', value: 'md:mb-4' },
                  { label: 'MB-6', value: 'md:mb-6' },
                  { label: 'MB-8', value: 'md:mb-8' },
                ]}
                onChange={value => updateHeaderSetting('desktopMarginBottom', value)}
                ariaLabel="Top bar desktop bottom margin"
              />
              <PanelDescription>
                Wrapper geometry uses supported Tailwind spacing and height tokens. It remains stable when the gradient band is toggled.
              </PanelDescription>
            </PanelControlGroup>
            <PanelControlGroup>
              <SubLabel>Site header colors</SubLabel>
              <SegmentedControl
                value={headerColorMode}
                options={[
                  { label: 'ADAPTIVE', value: 'adaptive' },
                  { label: 'CUSTOM', value: 'custom' },
                ]}
                onChange={value => updateHeaderSetting('colorMode', value)}
                ariaLabel="Site header color mode"
              />
              {headerColorMode === 'custom' ? (
                <>
                  <ColorInput label="Logo" value={headerLogoColor} onChange={value => updateHeaderSetting('logoColor', value)} />
                  <ColorInput label="Navigation text" value={headerNavTextColor} onChange={value => updateHeaderSetting('navTextColor', value)} />
                  <ColorInput label="Navigation border" value={headerNavBorderColor} onChange={value => updateHeaderSetting('navBorderColor', value)} />
                </>
              ) : null}
            </PanelControlGroup>
            {headerNavBandEnabled ? (
              <PanelControlGroup>
                <SubLabel>Band texture</SubLabel>
                <Knob
                  label="Source row"
                  value={headerNavBandSourceRow}
                  min={1}
                  max={Math.max(1, Math.round(config.gradientFaceCount))}
                  step={1}
                  onChange={value => updateHeaderSetting('navBandSourceRow', Math.round(value))}
                />
                <Knob label="Band scale" value={headerNavBandScale} min={1} max={3} step={0.01} unit="x" onChange={value => updateHeaderSetting('navBandScale', value)} />
                <Knob label="Position X" value={headerNavBandPanX} min={0} max={100} step={1} unit="%" onChange={value => updateHeaderSetting('navBandPanXPercent', value)} />
                <Knob label="Position Y" value={headerNavBandPanY} min={0} max={100} step={1} unit="%" onChange={value => updateHeaderSetting('navBandPanYPercent', value)} />
                <Knob label="Opacity" value={headerNavBandOpacity} min={0} max={1} step={0.01} onChange={value => updateHeaderSetting('navBandOpacity', value)} />
                <Knob label="Inactive duck" value={headerNavBandChromaDuck} min={0} max={1} step={0.01} onChange={value => updateHeaderSetting('navBandChromaDuck', value)} />
                <Knob label="Saturation" value={headerNavBandSaturation} min={0} max={2} step={0.01} unit="x" onChange={value => updateHeaderSetting('navBandSaturation', value)} />
                <Knob label="Brightness" value={headerNavBandBrightness} min={0.5} max={1.6} step={0.01} unit="x" onChange={value => updateHeaderSetting('navBandBrightness', value)} />
                <PanelDescription>
                  The band samples the canonical legacy field, then applies its own independent duck, saturation, and brightness grade.
                </PanelDescription>
              </PanelControlGroup>
            ) : null}
          </>
        ) : null}
        <PanelControlGroup>
          <SubLabel>Ink</SubLabel>
          <SegmentedControl
            value={config.skyInkMode}
            options={[
              { label: 'AUTO', value: 'auto' },
              { label: 'LIGHT', value: 'light' },
              { label: 'DARK', value: 'dark' },
            ]}
            onChange={value => updateConfig('skyInkMode', value)}
            ariaLabel="Hero ink mode"
          />
        </PanelControlGroup>
        {config.skyRenderMode === 'legacy' || config.skyRenderMode === 'glass' ? (
          <ColorInput label="Shader background" value={config.backgroundColor} onChange={value => updateConfig('backgroundColor', value)} />
        ) : null}
      </Sect>

      {config.skyRenderMode === 'static' || config.skyRenderMode === 'living' ? (
        <Sect title="Atmosphere" open={sections.sky} onToggle={() => toggleSection('sky')}>
          <SubLabel>Twilight physics</SubLabel>
          <Knob label="Sun elevation" value={config.skySunElevationDeg} min={-90} max={90} step={0.5} unit="°" onChange={value => updateConfig('skySunElevationDeg', value)} description="Full solar elevation: daylight above 0°, civil to astronomical twilight from 0° to −18°, and progressively deeper night down to −90°." />
          <Knob label="Stop count" value={config.skyStopCount} min={4} max={16} step={1} onChange={value => updateConfig('skyStopCount', Math.round(value))} description="Perceptually spaced authoring stops. The living field samples the same curve through a 256-point LUT." />
          <Knob label="Turbidity" value={config.skyTurbidity} min={1} max={10} step={0.1} onChange={value => updateConfig('skyTurbidity', value)} description="Aerosol haze: higher values broaden the luminous field and restrain chroma." />
          <Knob label="Afterglow" value={config.skyAfterglow} min={0} max={1} step={0.01} onChange={value => updateConfig('skyAfterglow', value)} />
          <Knob label="Ozone" value={config.skyOzone} min={0} max={1} step={0.01} onChange={value => updateConfig('skyOzone', value)} description="Controls the restrained blue-violet contribution associated with twilight ozone absorption." />
          <Knob label="Falloff" value={config.skyFalloff} min={0.45} max={2.4} step={0.01} unit="x" onChange={value => updateConfig('skyFalloff', value)} />
        </Sect>
      ) : null}

      {config.skyRenderMode === 'static' || config.skyRenderMode === 'living' ? (
        <Sect title="Palette" open={sections.palette} onToggle={() => toggleSection('palette')}>
          <SubLabel>Ambient master bus</SubLabel>
          <Knob label="Color restraint" value={config.skyChromaDuck} min={0} max={1} step={0.01} onChange={value => updateConfig('skyChromaDuck', value)} description="Ducks final sky chroma like an ambient voice, leaving the dock's active card as the color focus." />
          <Knob label="Saturation" value={config.skySaturation} min={0.45} max={1.6} step={0.01} unit="x" onChange={value => updateConfig('skySaturation', value)} description="Physical chroma generated before the final restraint stage." />
          <Knob label="Exposure" value={config.skyExposure} min={0.45} max={1.35} step={0.01} unit="x" onChange={value => updateConfig('skyExposure', value)} />
          <Knob label="Night depth" value={config.skyNightDepth} min={0} max={1} step={0.01} onChange={value => updateConfig('skyNightDepth', value)} />
          <Knob label="Ink unity" value={config.skyInkUnity} min={0} max={0.4} step={0.01} onChange={value => updateConfig('skyInkUnity', value)} description="Glazes the field toward the same deep-indigo ink anchor used by the dock palette." />
        </Sect>
      ) : null}

      {config.skyRenderMode === 'static' || config.skyRenderMode === 'living' ? (
        <Sect title="Shape" open={sections.shape} onToggle={() => toggleSection('shape')}>
          <SubLabel>Elliptical light field</SubLabel>
          <Knob label="Position X" value={config.skyOriginXPercent} min={-20} max={40} step={1} unit="%" onChange={value => updateConfig('skyOriginXPercent', value)} />
          <Knob label="Position Y" value={config.skyOriginYPercent} min={-20} max={40} step={1} unit="%" onChange={value => updateConfig('skyOriginYPercent', value)} />
          <Knob label="Radius X" value={config.skyRadiusXPercent} min={40} max={180} step={1} unit="%" onChange={value => updateConfig('skyRadiusXPercent', value)} />
          <Knob label="Radius Y" value={config.skyRadiusYPercent} min={40} max={180} step={1} unit="%" onChange={value => updateConfig('skyRadiusYPercent', value)} />
        </Sect>
      ) : null}

      {config.skyRenderMode === 'living' ? (
        <Sect title="Field motion" open={sections.skyMotion} onToggle={() => toggleSection('skyMotion')}>
          <SubLabel>Geometry only · palette locked</SubLabel>
          <Knob label="Speed" value={config.skyMotionSpeed} min={0} max={0.4} step={0.005} unit="x" onChange={value => updateConfig('skyMotionSpeed', value)} />
          <Knob label="Drift" value={config.skyDriftAmount} min={0} max={0.06} step={0.001} onChange={value => updateConfig('skyDriftAmount', value)} />
          <Knob label="Breathing" value={config.skyBreathAmount} min={0} max={0.06} step={0.001} onChange={value => updateConfig('skyBreathAmount', value)} />
          <Knob label="Edge turbulence" value={config.skyTurbulence} min={0} max={0.08} step={0.001} onChange={value => updateConfig('skyTurbulence', value)} />
          <Knob label="Seed" value={config.seed} min={0} max={1} step={0.001} onChange={value => updateConfig('seed', value)} />
          <PanelButton onClick={onRandomizeSeed}>RANDOM SEED</PanelButton>
        </Sect>
      ) : null}

      {config.skyRenderMode === 'glass' ? (
        <Sect title="Fluted glass" open={sections.glass} onToggle={() => toggleSection('glass')}>
          <SubLabel>Indexed background displacement</SubLabel>
          <SegmentedControl
            value={config.glassPlayback}
            options={[
              { label: 'STATIC', value: 'static' },
              { label: 'DYNAMIC', value: 'dynamic' },
            ]}
            onChange={value => updateConfig('glassPlayback', value)}
            ariaLabel="Glass playback mode"
          />
          <SegmentedControl
            value={config.glassBandOrientation}
            options={[
              { label: 'COLUMNS', value: 'columns' },
              { label: 'ROWS', value: 'rows' },
            ]}
            onChange={value => updateConfig('glassBandOrientation', value)}
            ariaLabel="Glass band orientation"
          />
          <Knob label={config.glassBandOrientation === 'columns' ? 'Column width' : 'Row height'} value={config.glassBandSizePx} min={4} max={160} step={1} unit="px" onChange={value => updateConfig('glassBandSizePx', value)} />
          <Knob label="Displacement delta" value={config.glassDisplacementDeltaPercent} min={-40} max={40} step={0.1} unit="%" onChange={value => updateConfig('glassDisplacementDeltaPercent', value)} description="Moves the gradient by this additional amount for every consecutive band." />
          <Knob label="Displacement direction" value={config.glassDisplacementDirectionDeg} min={-180} max={180} step={1} unit="°" onChange={value => updateConfig('glassDisplacementDirectionDeg', value)} />
          <SubLabel>Gradient</SubLabel>
          <Knob label="Gradient angle" value={config.glassGradientAngleDeg} min={-180} max={180} step={1} unit="°" onChange={value => updateConfig('glassGradientAngleDeg', value)} />
          <ColorInput label="Color A" value={config.glassGradientColorA} onChange={value => updateConfig('glassGradientColorA', value)} />
          <ColorInput label="Color B" value={config.glassGradientColorB} onChange={value => updateConfig('glassGradientColorB', value)} />
          <ColorInput label="Color C" value={config.glassGradientColorC} onChange={value => updateConfig('glassGradientColorC', value)} />
          <ColorInput label="Color D" value={config.glassGradientColorD} onChange={value => updateConfig('glassGradientColorD', value)} />
          <Knob label="Phase" value={config.glassPhase} min={0} max={20} step={0.01} onChange={value => updateConfig('glassPhase', value)} />
          {config.glassPlayback === 'dynamic' ? (
            <Knob label="Speed" value={config.glassSpeed} min={0} max={3} step={0.01} unit="x" onChange={value => updateConfig('glassSpeed', value)} />
          ) : null}
          <Knob label="Texture cap" value={config.glassResolution} min={PROCEDURAL_COLOR_MIN_TEXTURE_RESOLUTION} max={PROCEDURAL_COLOR_MAX_TEXTURE_RESOLUTION} step={16} unit="px" onChange={value => updateConfig('glassResolution', Math.round(value))} />
          {config.glassPlayback === 'dynamic' ? (
            <Toggle label="Pause offscreen" checked={config.glassPauseWhenOffscreen} onChange={value => updateConfig('glassPauseWhenOffscreen', value)} />
          ) : null}
          <PanelDescription>
            Every band renders the same legacy procedural field with a cumulative coordinate delta. Static redraws only after tuning or resize; dynamic advances the source phase.
          </PanelDescription>
        </Sect>
      ) : null}

      {config.skyRenderMode === 'refractor' ? (
        <Sect title="Refractor" open={sections.refractor} onToggle={() => toggleSection('refractor')}>
          <SubLabel>Equal CSS slices</SubLabel>
          <SegmentedControl
            value={config.refractorOrientation}
            options={[
              { label: 'COLUMNS', value: 'columns' },
              { label: 'ROWS', value: 'rows' },
            ]}
            onChange={value => updateConfig('refractorOrientation', value)}
            ariaLabel="Refractor slice orientation"
          />
          <Knob label="Slice count" value={config.refractorSliceCount} min={1} max={64} step={1} onChange={value => updateConfig('refractorSliceCount', Math.round(value))} />
          {config.refractorOrientation === 'rows' ? (
            <>
              <Knob
                label="Mirrored row Y step"
                value={config.refractorRowDisplacementStepPercent}
                min={0}
                max={30}
                step={1}
                unit="%"
                onChange={value => updateConfig('refractorRowDisplacementStepPercent', value)}
                description="Offsets each row's Y origin toward the center, mirrored above and below the fixed center row."
              />
              <Knob
                label="Mirrored row scale step"
                value={config.refractorRowScaleStepPercent}
                min={0}
                max={20}
                step={1}
                unit="%"
                onChange={value => updateConfig('refractorRowScaleStepPercent', value)}
                description="Reduces vertical gradient size per row of distance from center while retaining full width."
              />
            </>
          ) : null}
          {config.refractorOrientation === 'columns' ? (
            <>
              <Knob
                label="Mirrored column X step"
                value={config.refractorColumnDisplacementStepPercent}
                min={0}
                max={30}
                step={1}
                unit="%"
                onChange={value => updateConfig('refractorColumnDisplacementStepPercent', value)}
                description="Offsets each column's X origin toward the center, mirrored around the fixed center column."
              />
              <Knob
                label="Mirrored column scale step"
                value={config.refractorColumnScaleStepPercent}
                min={0}
                max={20}
                step={1}
                unit="%"
                onChange={value => updateConfig('refractorColumnScaleStepPercent', value)}
                description="Reduces horizontal gradient size per column of distance from center while retaining its vertical size."
              />
            </>
          ) : null}
          <PanelDescription>
            Every slice fills an equal share of the hero and repeats the same pure-blue-and-white field at center center.
          </PanelDescription>
        </Sect>
      ) : null}

      {config.skyRenderMode === 'living' ? (
        <Sect title="Output" open={sections.output} onToggle={() => toggleSection('output')}>
          <SubLabel>Atmospheric rendering</SubLabel>
          <Knob label="Texture cap" value={config.skyResolution} min={PROCEDURAL_COLOR_MIN_TEXTURE_RESOLUTION} max={PROCEDURAL_COLOR_MAX_TEXTURE_RESOLUTION} step={16} unit="px" onChange={value => updateConfig('skyResolution', Math.round(value))} />
          <Knob label="Dither" value={config.skyDitherStrength} min={0} max={2} step={0.05} unit="px" onChange={value => updateConfig('skyDitherStrength', value)} description="Sub-pixel luminance noise reduces visible banding in dark blue fields." />
          {config.skyRenderMode === 'living' ? (
            <Toggle label="Pause offscreen" checked={config.skyPauseWhenOffscreen} onChange={value => updateConfig('skyPauseWhenOffscreen', value)} />
          ) : null}
        </Sect>
      ) : null}

      {config.skyRenderMode === 'legacy' || config.skyRenderMode === 'glass' ? (
        <>
          <Sect title="Color" open={sections.color} onToggle={() => toggleSection('color')}>
            <SubLabel>{config.skyRenderMode === 'glass' ? 'Procedural source field' : 'Particle shader controls'}</SubLabel>
            {config.skyRenderMode === 'legacy' ? (
              <>
                <PanelControlGroup>
                  <SubLabel>Adaptive ink</SubLabel>
                  <Toggle
                    label="Background awareness"
                    checked={config.heroBackgroundAwarenessEnabled}
                    onChange={value => updateConfig('heroBackgroundAwarenessEnabled', value)}
                    description="Opt in to control-rate contrast detection for the logo, navigation, copy, and actions. Off preserves the authored light ink."
                  />
                  {config.heroBackgroundAwarenessEnabled ? (
                    <>
                      <Knob
                        label="Bright threshold"
                        value={config.heroBackgroundAwarenessBrightThreshold}
                        min={0.45}
                        max={0.85}
                        step={0.01}
                        unit="x"
                        onChange={value => updateConfig('heroBackgroundAwarenessBrightThreshold', value)}
                        description="Switches to dark ink only after the sampled background enters this bright range."
                      />
                      <Knob
                        label="Dark threshold"
                        value={config.heroBackgroundAwarenessDarkThreshold}
                        min={0.15}
                        max={0.6}
                        step={0.01}
                        unit="x"
                        onChange={value => updateConfig('heroBackgroundAwarenessDarkThreshold', value)}
                        description="Returns to light ink below this value. Separation from the bright threshold prevents flicker."
                      />
                    </>
                  ) : null}
                </PanelControlGroup>
                <Toggle
                  label="Left contrast scrim"
                  checked={config.legacyScrimEnabled}
                  onChange={value => updateConfig('legacyScrimEnabled', value)}
                />
                <PanelControlGroup>
                  <SubLabel>Palette guardrails</SubLabel>
                  <Toggle
                    label="Palette guard"
                    checked={config.legacyPaletteGuardEnabled}
                    onChange={value => updateConfig('legacyPaletteGuardEnabled', value)}
                  />
                  {config.legacyPaletteGuardEnabled ? (
                    <>
                      <Knob
                        label="Maximum yellow coverage"
                        value={config.legacyPaletteMaximumYellowCoverage}
                        min={0.25}
                        max={0.85}
                        step={0.01}
                        unit="x"
                        onChange={value => updateConfig('legacyPaletteMaximumYellowCoverage', value)}
                        description="Sets the maximum share of the composed hero that may resolve into the yellow family before phase correction begins."
                      />
                      <Knob
                        label="Counterpoint floor"
                        value={config.legacyPaletteMinimumCounterpointCoverage}
                        min={0.04}
                        max={0.4}
                        step={0.01}
                        unit="x"
                        onChange={value => updateConfig('legacyPaletteMinimumCounterpointCoverage', value)}
                        description="Requires a restrained cool or magenta counterweight as a yellow field approaches its coverage limit."
                      />
                      <Knob
                        label="Hue diversity floor"
                        value={config.legacyPaletteMinimumHueDiversity}
                        min={0.04}
                        max={0.5}
                        step={0.01}
                        unit="x"
                        onChange={value => updateConfig('legacyPaletteMinimumHueDiversity', value)}
                        description="Defines the minimum circular hue spread required near a yellow-dominant state."
                      />
                      <Knob
                        label="Chroma floor"
                        value={config.legacyPaletteMinimumChroma}
                        min={0.02}
                        max={0.18}
                        step={0.005}
                        unit="x"
                        onChange={value => updateConfig('legacyPaletteMinimumChroma', value)}
                        description="Catches severe neutral or cream collapse without grading healthy pastel compositions."
                      />
                      <Knob
                        label="Maximum intervention"
                        value={config.legacyPaletteMaximumIntervention}
                        min={0.2}
                        max={1}
                        step={0.01}
                        unit="x"
                        onChange={value => updateConfig('legacyPaletteMaximumIntervention', value)}
                        description="Caps phase separation and temporal-voice reduction. The controller always chooses the smallest passing correction."
                      />
                      <Knob
                        label="Look-ahead"
                        value={config.legacyPaletteLookAheadMs}
                        min={0}
                        max={2000}
                        step={50}
                        unit="ms"
                        onChange={value => updateConfig('legacyPaletteLookAheadMs', value)}
                        description="Predicts an approaching collapse so correction can arrive without a visible color jump."
                      />
                      <Knob
                        label="Attack"
                        value={config.legacyPaletteAttackMs}
                        min={100}
                        max={1500}
                        step={20}
                        unit="ms"
                        onChange={value => updateConfig('legacyPaletteAttackMs', value)}
                      />
                      <Knob
                        label="Release"
                        value={config.legacyPaletteReleaseMs}
                        min={300}
                        max={3000}
                        step={20}
                        unit="ms"
                        onChange={value => updateConfig('legacyPaletteReleaseMs', value)}
                      />
                    </>
                  ) : null}
                  <PanelDescription>
                    A low-frequency evaluator samples the final layered composition. It preserves expressive yellow and healthy pastels, then gently separates shader phases only when a monochromatic collapse is present or imminent.
                  </PanelDescription>
                </PanelControlGroup>
              </>
            ) : null}
            <Knob label={config.skyRenderMode === 'glass' ? 'Source variation' : 'Face color delta'} value={config.shaderColorVariation} min={0} max={0.4} step={0.005} unit="x" onChange={value => updateConfig('shaderColorVariation', value)} />
            <Knob label="Saturation" value={config.shaderColorSaturation} min={0} max={2.5} step={0.01} unit="x" onChange={value => updateConfig('shaderColorSaturation', value)} />
            <Knob label="Brightness" value={config.shaderColorBrightness} min={0.4} max={1.6} step={0.01} unit="x" onChange={value => updateConfig('shaderColorBrightness', value)} />
            <Knob label="Hue offset" value={config.shaderColorHueOffset} min={-0.36} max={0.36} step={0.001} unit="x" onChange={value => updateConfig('shaderColorHueOffset', value)} />
            <Knob label="Morph" value={config.shaderColorMorph} min={0} max={1.45} step={0.01} unit="x" onChange={value => updateConfig('shaderColorMorph', value)} />
            <Knob label="Shimmer" value={config.shaderColorShimmer} min={0} max={1.5} step={0.01} unit="x" onChange={value => updateConfig('shaderColorShimmer', value)} />
            <Knob label="Pulse" value={config.shaderColorPulse} min={0} max={1.5} step={0.01} unit="x" onChange={value => updateConfig('shaderColorPulse', value)} />
          </Sect>
          <Sect title="Motion" open={sections.motion} onToggle={() => toggleSection('motion')}>
            <SubLabel>{config.skyRenderMode === 'glass' ? 'Source character' : 'Generative drift'}</SubLabel>
            {config.skyRenderMode === 'legacy' ? (
              <>
                <Knob label="Shader speed" value={config.shaderColorSpeed} min={0} max={3} step={0.01} unit="x" onChange={value => updateConfig('shaderColorSpeed', value)} />
                <PanelControlGroup>
                  <SubLabel>Palette cadence</SubLabel>
                  <Toggle
                    label="Living palette cadence"
                    checked={config.legacyPaletteCadenceEnabled}
                    onChange={value => updateConfig('legacyPaletteCadenceEnabled', value)}
                  />
                  {config.legacyPaletteCadenceEnabled ? (
                    <>
                      <SubLabel>Velocity distribution</SubLabel>
                      <SegmentedControl
                        value={config.legacyPaletteCadenceDistribution}
                        options={[
                          { label: 'GAUSS', value: 'gaussian' },
                          { label: 'INV', value: 'inverted-gaussian' },
                        ]}
                        onChange={value => updateConfig('legacyPaletteCadenceDistribution', value)}
                        ariaLabel="Palette cadence velocity distribution"
                      />
                      <SubLabel>Transition easing</SubLabel>
                      <SegmentedControl
                        value={config.legacyPaletteCadenceEasing}
                        options={[
                          { label: 'JERK', value: 'minimum-jerk' },
                          { label: 'SINE', value: 'sine' },
                          { label: 'EXPO', value: 'soft-expo' },
                          { label: 'LIN', value: 'linear' },
                        ]}
                        onChange={value => updateConfig('legacyPaletteCadenceEasing', value)}
                        ariaLabel="Palette cadence transition easing"
                      />
                      <Knob label="Initial rest" value={config.legacyPaletteCadenceInitialDelayMs} min={0} max={60000} step={250} unit="ms" onChange={value => updateConfig('legacyPaletteCadenceInitialDelayMs', value)} />
                      <Knob label="Minimum dwell" value={config.legacyPaletteCadenceDwellMinMs} min={1000} max={60000} step={500} unit="ms" onChange={value => updateConfig('legacyPaletteCadenceDwellMinMs', value)} />
                      <Knob label="Maximum dwell" value={config.legacyPaletteCadenceDwellMaxMs} min={1000} max={120000} step={500} unit="ms" onChange={value => updateConfig('legacyPaletteCadenceDwellMaxMs', value)} />
                      <Knob label="Transition duration" value={config.legacyPaletteCadenceTransitionDurationMs} min={400} max={6000} step={100} unit="ms" onChange={value => updateConfig('legacyPaletteCadenceTransitionDurationMs', value)} />
                      <Knob label="Palette travel" value={config.legacyPaletteCadenceTravel} min={0.04} max={1} step={0.01} unit="x" onChange={value => updateConfig('legacyPaletteCadenceTravel', value)} />
                      <Knob label="Idle geometry speed" value={config.legacyPaletteCadenceIdleSpeed} min={0} max={0.4} step={0.005} unit="x" onChange={value => updateConfig('legacyPaletteCadenceIdleSpeed', value)} />
                      <Knob label="Distribution width" value={config.legacyPaletteCadenceDistributionWidth} min={0.06} max={0.4} step={0.01} unit="x" onChange={value => updateConfig('legacyPaletteCadenceDistributionWidth', value)} />
                      {config.legacyPaletteCadenceDistribution === 'inverted-gaussian' ? (
                        <Knob label="Center velocity" value={config.legacyPaletteCadenceInvertedCenterVelocity} min={0.02} max={0.9} step={0.01} unit="x" onChange={value => updateConfig('legacyPaletteCadenceInvertedCenterVelocity', value)} />
                      ) : null}
                      <Knob label="Interaction rest" value={config.legacyPaletteCadenceInteractionQuietMs} min={0} max={10000} step={250} unit="ms" onChange={value => updateConfig('legacyPaletteCadenceInteractionQuietMs', value)} />
                      <PanelDescription>
                        Holds a palette almost still, then advances color through a brief shaped transition. Geometry remains quiet, and a new transition waits until interaction has settled.
                      </PanelDescription>
                    </>
                  ) : null}
                </PanelControlGroup>
              </>
            ) : null}
            <Knob label="Generative drift" value={config.shaderColorRandomness} min={0} max={1} step={0.01} unit="x" onChange={value => updateConfig('shaderColorRandomness', value)} />
            <Knob label="Seed" value={config.seed} min={0} max={1} step={0.001} onChange={value => updateConfig('seed', value)} />
            <PanelButton onClick={onRandomizeSeed}>RANDOM SEED</PanelButton>
          </Sect>

          <Sect title="View" open={sections.view} onToggle={() => toggleSection('view')}>
            <SubLabel>{config.skyRenderMode === 'glass' ? 'Source composition' : 'Designer viewport'}</SubLabel>
            {config.skyRenderMode === 'legacy' ? (
              <Knob
                label="Face count"
                value={config.gradientFaceCount}
                min={1}
                max={16}
                step={1}
                onChange={value => {
                  const faceCount = Math.round(value);
                  updateConfig('gradientFaceCount', faceCount);
                  if (config.editorialSourceRow > faceCount) {
                    updateConfig('editorialSourceRow', faceCount);
                  }
                }}
                description="Overlay faces above retained layer zero. Heights are computed as face index divided by face count, so the stack fills the viewport."
              />
            ) : null}
            <Knob label="Shader scale" value={config.shaderColorScale} min={0.5} max={4} step={0.01} unit="x" onChange={value => updateConfig('shaderColorScale', value)} />
            <Knob label="View zoom" value={config.viewZoom} min={0.25} max={8} step={0.01} unit="x" onChange={value => updateConfig('viewZoom', value)} />
            <Knob label="Position X" value={config.viewOffsetX} min={-2} max={2} step={0.001} onChange={value => updateConfig('viewOffsetX', value)} />
            <Knob label="Position Y" value={config.viewOffsetY} min={-2} max={2} step={0.001} onChange={value => updateConfig('viewOffsetY', value)} />
            <PanelButton onClick={onResetView}>CENTER</PanelButton>
          </Sect>

          {config.skyRenderMode === 'legacy' ? (
            <Sect title="Output" open={sections.output} onToggle={() => toggleSection('output')}>
              <SubLabel>Rendering</SubLabel>
              <Knob label="Texture cap" value={config.shaderColorResolution} min={PROCEDURAL_COLOR_MIN_TEXTURE_RESOLUTION} max={PROCEDURAL_COLOR_MAX_TEXTURE_RESOLUTION} step={16} unit="px" onChange={value => updateConfig('shaderColorResolution', Math.round(value))} />
            </Sect>
          ) : null}
        </>
      ) : null}

      <ConfigScopeList bindings={componentConfigBindings} />
    </PanelShell>
  );
}
