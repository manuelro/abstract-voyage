import type { PointerProximityEasing } from '../../../helpers/pointerProximity';

export type CtaButtonBackgroundMode = 'transparent' | 'solid' | 'gradient';
export type CtaButtonBorderMode = 'none' | 'solid' | 'gradient';
export type CtaButtonBorderWidth = 'border-0' | 'border' | 'border-2' | 'border-4';
export type CtaButtonRadius =
  | 'rounded-none'
  | 'rounded-md'
  | 'rounded-lg'
  | 'rounded-xl'
  | 'rounded-2xl'
  | 'rounded-full';
export type CtaButtonMotionEasing =
  | 'linear' | 'standard' | 'expressive' | 'viscous' | 'gentle' | 'gaussian';
/**
 * 'auto': derive from `surfaceColor` (background = surface lightened by
 * autoBackgroundLightenAmount — 0 by default, i.e. verbatim — border =
 * surface lightened by autoBorderLightenAmount, text = a darker-or-brighter
 * tint of the surface picked for contrast) — see resolveSurfaceAwareCtaColors
 * in CtaButton.tsx. 'custom': ignore surfaceColor entirely and use this
 * property's own existing color field(s), exactly as before this mode
 * existed.
 */
export type CtaButtonColorMode = 'auto' | 'custom';
/**
 * Resolves a coherent font/padding/min-size bundle via CTA_BUTTON_SIZE_PRESETS
 * below — the single control most callers should reach for instead of tuning
 * fontSize/paddingX/paddingY (and the two properties that had no config at
 * all before this: minHeightPx/minWidthPx, previously hardcoded literals in
 * CtaButton.tsx's own surfaceClasses). 'md' reproduces those old literals
 * exactly, so picking no size at all changes nothing for any existing
 * consumer. The granular fields below still exist and still work as
 * explicit per-instance overrides on top of whatever size is chosen — see
 * normalizeCtaButtonConfig's merge order.
 */
export type CtaButtonSize = 'sm' | 'md' | 'lg';
export type CtaButtonFontSize = 'text-sm' | 'text-base' | 'text-lg' | 'text-xl' | 'text-2xl';
export type CtaButtonPaddingX = 'px-4' | 'px-5' | 'px-6' | 'px-8' | 'px-10' | 'px-12';
export type CtaButtonPaddingY = 'py-2' | 'py-2.5' | 'py-3' | 'py-4' | 'py-5' | 'py-6';
export type CtaButtonDesktopPaddingX =
  | 'md:px-4' | 'md:px-5' | 'md:px-6' | 'md:px-8' | 'md:px-10' | 'md:px-12' | 'md:px-14' | 'md:px-16';
export type CtaButtonDesktopPaddingY =
  | 'md:py-2' | 'md:py-2.5' | 'md:py-3' | 'md:py-4' | 'md:py-5' | 'md:py-6';

export type CtaButtonConfig = {
  backgroundMode: CtaButtonBackgroundMode;
  backgroundColor: string;
  backgroundColorMode: CtaButtonColorMode;
  borderMode: CtaButtonBorderMode;
  borderColor: string;
  borderColorMode: CtaButtonColorMode;
  borderWidth: CtaButtonBorderWidth;
  radius: CtaButtonRadius;
  textColor: string;
  textColorMode: CtaButtonColorMode;
  // Tuning for backgroundColorMode/borderColorMode/textColorMode === 'auto' —
  // irrelevant, and hidden in the panel, while a property's mode is 'custom'.
  autoBackgroundLightenAmount: number;
  autoBorderLightenAmount: number;
  // Independent per property — background-hover and border-hover stack on
  // top of whatever their own resting value resolved to, but at their own
  // pace (a border already lightened once by autoBorderLightenAmount may
  // want a gentler further push on hover than the background does).
  autoBackgroundHoverLightenAmount: number;
  autoBorderHoverLightenAmount: number;
  autoTextMinContrast: number;
  size: CtaButtonSize;
  fontSize: CtaButtonFontSize;
  // Mobile-first base; *Desktop overrides from md (768px) up. Pure Tailwind
  // classes applied together (unlike FiberHeading's textPaddingXPx, these
  // aren't consumed by any JS layout math), so responsiveness is free —
  // no viewport check needed, the browser's own CSS cascade handles it. A
  // fixed, generously large paddingX/paddingY tuned for a wide desktop
  // button will force multi-line text wrap on a narrow phone otherwise.
  // All four (plus minHeightPx/minWidthPx below) are normally resolved
  // together from `size` — set one explicitly only to override that single
  // property away from the chosen size's own bundle.
  paddingX: CtaButtonPaddingX;
  paddingXDesktop: CtaButtonDesktopPaddingX;
  paddingY: CtaButtonPaddingY;
  paddingYDesktop: CtaButtonDesktopPaddingY;
  minHeightPx: number;
  minWidthPx: number;
  hoverColorsEnabled: boolean;
  hoverBackgroundColor: string;
  hoverBorderColor: string;
  hoverTextColor: string;
  // Background/border/text-color transitions are derived from the state
  // (scale + shadow) duration via colorTransitionRatio, rather than set
  // independently — at the default ratio (1, its own clamp ceiling) color
  // takes the full shape/shadow duration, the longest this mechanism allows;
  // a lower ratio shortens color to a fraction of that duration instead. See
  // colorTransitionRatio below and its use in CtaButton.tsx.
  colorTransitionRatio: number;
  colorEasing: CtaButtonMotionEasing;
  gradientScale: number;
  gradientPanXPercent: number;
  gradientPanYPercent: number;
  proximityRadiusPx: number;
  proximityEasing: PointerProximityEasing;
  proximityAttackMs: number;
  proximityReleaseMs: number;
  proximityLiftPx: number;
  proximityScale: number;
  tiltEnabled: boolean;
  // Vertical pointer position tilts the button toward/away from the pointer
  // (rotateX) same as horizontal position already tilts it left/right
  // (rotateY) — this just lets the vertical component be switched off
  // independently, e.g. for a button too short for a convincing X-axis lean.
  tiltYEnabled: boolean;
  tiltMaxDegrees: number;
  tiltPerspectivePx: number;
  tiltResponseMs: number;
  stateTransitionMs: number;
  stateEasing: CtaButtonMotionEasing;
  stateExitTransitionMs: number;
  stateExitEasing: CtaButtonMotionEasing;
  pressTransitionMs: number;
  pressEasing: CtaButtonMotionEasing;
  // Pond-surface bounce: the click response while elevationReactionEnabled
  // is false. That flag already means "don't react to interaction" for
  // hover/focus/press alike, which otherwise leaves a click producing no
  // visible feedback at all (resolveTargetElevation collapses straight to
  // shadowElevationRestingPx). Rather than a separate opt-in, this is what
  // "reaction off" means for a click instead: press dips pressCompressPx
  // *below* resting (still via the existing pressTransitionMs/pressEasing
  // tween — see handlePress in useCardLiftPhysics.ts), and release settles
  // back via a damped spring (pressBounceStiffness/pressBounceDamping)
  // that's free to overshoot past resting and decay through a few bounces,
  // rather than a single directional ease. Irrelevant, and hidden in the
  // panel, while elevationReactionEnabled is true — that path still uses
  // shadowElevationPressedPx/stateExitEasing exactly as before this existed.
  pressCompressPx: number;
  pressBounceStiffness: number;
  pressBounceDamping: number;
  // Physically-based elevation shadow engine (helpers/elevationShadowEngine.ts).
  // Opt-in per instance, enabled by default for this component. Every visual
  // property below is derived from one authoritative elevation value — see
  // components/proximity/useElevationShadow.ts for how it's applied.
  shadowEngineEnabled: boolean;
  shadowElevationMinPx: number;
  shadowElevationRestingPx: number;
  // First-class "don't react to interaction" toggle — false pins the
  // engine's resolved elevation to shadowElevationRestingPx regardless of
  // pointer proximity, press, or focus (see resolveTargetElevation in
  // useCardLiftPhysics.ts), instead of relying on some coincidence of
  // matching numeric values. shadowDevElevationOverrideEnabled still wins
  // over this (a deliberate dev-only inspection tool); the focus-visible
  // ring (a separate, always-present CSS class) remains the actual
  // accessibility indicator regardless of this flag, so disabling elevation
  // reaction doesn't remove focus visibility, just its elevation response.
  elevationReactionEnabled: boolean;
  shadowElevationHoverPx: number;
  shadowElevationFocusPx: number;
  shadowElevationPressedPx: number;
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
  shadowColor: string;
  shadowDebugMode: boolean;
  shadowDevElevationOverrideEnabled: boolean;
  shadowDevElevationOverridePx: number;
};

export const DEFAULT_CTA_BUTTON_CONFIG = {
  backgroundMode: 'solid',
  backgroundColor: '#1a1a23',
  backgroundColorMode: 'auto',
  borderMode: 'solid',
  borderColor: '#d6d6d6',
  borderColorMode: 'auto',
  borderWidth: 'border-2',
  radius: 'rounded-full',
  textColor: '#74747b',
  textColorMode: 'auto',
  autoBackgroundLightenAmount: 0.05,
  autoBorderLightenAmount: 0.07,
  autoBackgroundHoverLightenAmount: 0.035,
  autoBorderHoverLightenAmount: 0.05,
  autoTextMinContrast: 3,
  size: 'md',
  fontSize: 'text-base',
  paddingX: 'px-6',
  paddingXDesktop: 'md:px-12',
  paddingY: 'py-3',
  paddingYDesktop: 'md:py-5',
  minHeightPx: 44,
  minWidthPx: 174,
  hoverColorsEnabled: true,
  hoverBackgroundColor: '#d6d6d6',
  hoverBorderColor: '#d9d9d9',
  hoverTextColor: '#5b5b62',
  colorTransitionRatio: 1,
  colorEasing: 'gaussian',
  gradientScale: 1,
  gradientPanXPercent: 50,
  gradientPanYPercent: 50,
  proximityRadiusPx: 320,
  proximityEasing: 'smootherstep',
  proximityAttackMs: 85,
  proximityReleaseMs: 210,
  proximityLiftPx: 12,
  proximityScale: 1.018,
  tiltEnabled: true,
  tiltYEnabled: true,
  tiltMaxDegrees: 2.75,
  tiltPerspectivePx: 1020,
  tiltResponseMs: 110,
  stateTransitionMs: 360,
  stateEasing: 'expressive',
  stateExitTransitionMs: 520,
  stateExitEasing: 'expressive',
  pressTransitionMs: 110,
  pressEasing: 'standard',
  pressCompressPx: 8,
  pressBounceStiffness: 180,
  pressBounceDamping: 12,
  shadowEngineEnabled: true,
  elevationReactionEnabled: true,
  shadowElevationMinPx: 0,
  shadowElevationRestingPx: 1,
  shadowElevationHoverPx: 11,
  shadowElevationFocusPx: 11,
  shadowElevationPressedPx: 10,
  shadowElevationMaxPx: 20,
  shadowLightXPercent: 50,
  shadowLightYPx: 200,
  shadowLightHeightPx: 40,
  shadowLightRadiusPx: 30,
  shadowLightDirectIntensity: 1.4,
  shadowLightAmbientIntensity: 2.2,
  shadowProjectedStrength: 0.5,
  shadowProjectedFalloff: 2.9,
  shadowContactStrength: 0.12,
  shadowContactFalloff: 0.4,
  shadowContactDecayElevationPx: 50,
  shadowNearFieldStrength: 0.43,
  shadowMaxBlurPx: 30,
  shadowMaxDisplacementPx: 50,
  shadowMaxProjectedScale: 1.11,
  shadowColor: '#0d0d10',
  shadowDebugMode: false,
  shadowDevElevationOverrideEnabled: false,
  shadowDevElevationOverridePx: 14,
} satisfies CtaButtonConfig;

export const CTA_BUTTON_MOTION_EASINGS: Record<CtaButtonMotionEasing, string> = {
  linear: 'linear',
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  expressive: 'cubic-bezier(0.22, 1, 0.36, 1)',
  viscous: 'cubic-bezier(0.16, 1, 0.3, 1)',
  // Ease-out cubic with no overshoot (unlike expressive/viscous, whose
  // control points push past 1 — fine for scale/position, but a color
  // channel "overshooting" its target then settling back reads as a flicker,
  // not a bounce). Smooth, fast-then-settle curve built for color/opacity.
  gentle: 'cubic-bezier(0.33, 1, 0.68, 1)',
  // Ease-in-out-sine — its velocity profile is literally derived from
  // sin(x) over [0, π], a genuine symmetric bell/Gaussian curve (slow start,
  // peak speed at the midpoint, slow finish), unlike every other token above
  // which is ease-out shaped (front-loaded, decelerating only at the end).
  gaussian: 'cubic-bezier(0.37, 0, 0.63, 1)',
};

export type CtaButtonSizePreset = {
  fontSize: CtaButtonFontSize;
  paddingX: CtaButtonPaddingX;
  paddingXDesktop: CtaButtonDesktopPaddingX;
  paddingY: CtaButtonPaddingY;
  paddingYDesktop: CtaButtonDesktopPaddingY;
  minHeightPx: number;
  minWidthPx: number;
};

/**
 * 'sm': tighter footprint for secondary/inline actions (a confirm/retry chip
 * next to a primary action). 'md': today's original, only size — every
 * literal value here matches what was previously hardcoded across
 * DEFAULT_CTA_BUTTON_CONFIG's own fields and CtaButton.tsx's surfaceClasses
 * (min-h-11 min-w-[10.875rem]), so it stays the zero-opinion default. 'lg':
 * a page's single hero-level primary CTA.
 */
export const CTA_BUTTON_SIZE_PRESETS: Record<CtaButtonSize, CtaButtonSizePreset> = {
  sm: {
    fontSize: 'text-sm',
    paddingX: 'px-4',
    paddingXDesktop: 'md:px-6',
    paddingY: 'py-2',
    paddingYDesktop: 'md:py-2.5',
    minHeightPx: 36,
    minWidthPx: 128,
  },
  md: {
    fontSize: 'text-base',
    paddingX: 'px-6',
    paddingXDesktop: 'md:px-12',
    paddingY: 'py-3',
    paddingYDesktop: 'md:py-5',
    minHeightPx: 44,
    minWidthPx: 174,
  },
  lg: {
    fontSize: 'text-lg',
    paddingX: 'px-8',
    paddingXDesktop: 'md:px-16',
    paddingY: 'py-4',
    paddingYDesktop: 'md:py-6',
    minHeightPx: 52,
    minWidthPx: 208,
  },
};

const SIZES: ReadonlyArray<CtaButtonSize> = ['sm', 'md', 'lg'];

const BORDER_WIDTHS: ReadonlyArray<CtaButtonBorderWidth> = [
  'border-0', 'border', 'border-2', 'border-4',
];
const RADII: ReadonlyArray<CtaButtonRadius> = [
  'rounded-none', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full',
];
const PROXIMITY_EASINGS: ReadonlyArray<PointerProximityEasing> = [
  'linear', 'smoothstep', 'smootherstep', 'ease-out-cubic',
];
const MOTION_EASINGS: ReadonlyArray<CtaButtonMotionEasing> = [
  'linear', 'standard', 'expressive', 'viscous', 'gentle', 'gaussian',
];
const COLOR_MODES: ReadonlyArray<CtaButtonColorMode> = ['auto', 'custom'];
const FONT_SIZES: ReadonlyArray<CtaButtonFontSize> = [
  'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl',
];
const PADDING_X: ReadonlyArray<CtaButtonPaddingX> = [
  'px-4', 'px-5', 'px-6', 'px-8', 'px-10', 'px-12',
];
const DESKTOP_PADDING_X: ReadonlyArray<CtaButtonDesktopPaddingX> = [
  'md:px-4', 'md:px-5', 'md:px-6', 'md:px-8', 'md:px-10', 'md:px-12', 'md:px-14', 'md:px-16',
];
const PADDING_Y: ReadonlyArray<CtaButtonPaddingY> = [
  'py-2', 'py-2.5', 'py-3', 'py-4', 'py-5', 'py-6',
];
const DESKTOP_PADDING_Y: ReadonlyArray<CtaButtonDesktopPaddingY> = [
  'md:py-2', 'md:py-2.5', 'md:py-3', 'md:py-4', 'md:py-5', 'md:py-6',
];

const clamp = (value: number, min: number, max: number, fallback: number) => (
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback))
);
const color = (value: string, fallback: string) => value?.trim() || fallback;
const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);

export function normalizeCtaButtonConfig(
  config: Partial<CtaButtonConfig> | undefined,
): CtaButtonConfig {
  const base = { ...DEFAULT_CTA_BUTTON_CONFIG, ...(config ?? {}) };
  // Raw-key presence (not "differs from DEFAULT_CTA_BUTTON_CONFIG") is what
  // distinguishes "caller explicitly set this field" from "caller didn't
  // specify it" — the latter falls through to the resolved size preset
  // instead of always landing on the flat, size-agnostic top-level default.
  const raw = config ?? {};
  const size = token(base.size, SIZES, DEFAULT_CTA_BUTTON_CONFIG.size);
  const preset = CTA_BUTTON_SIZE_PRESETS[size];
  return {
    backgroundMode: base.backgroundMode === 'transparent' || base.backgroundMode === 'gradient'
      ? base.backgroundMode
      : 'solid',
    backgroundColor: color(base.backgroundColor, DEFAULT_CTA_BUTTON_CONFIG.backgroundColor),
    backgroundColorMode: token(
      base.backgroundColorMode, COLOR_MODES, DEFAULT_CTA_BUTTON_CONFIG.backgroundColorMode,
    ),
    borderMode: base.borderMode === 'none' || base.borderMode === 'solid'
      ? base.borderMode
      : 'gradient',
    borderColor: color(base.borderColor, DEFAULT_CTA_BUTTON_CONFIG.borderColor),
    borderColorMode: token(
      base.borderColorMode, COLOR_MODES, DEFAULT_CTA_BUTTON_CONFIG.borderColorMode,
    ),
    borderWidth: token(base.borderWidth, BORDER_WIDTHS, DEFAULT_CTA_BUTTON_CONFIG.borderWidth),
    radius: token(base.radius, RADII, DEFAULT_CTA_BUTTON_CONFIG.radius),
    textColor: color(base.textColor, DEFAULT_CTA_BUTTON_CONFIG.textColor),
    textColorMode: token(
      base.textColorMode, COLOR_MODES, DEFAULT_CTA_BUTTON_CONFIG.textColorMode,
    ),
    // -1..1, not 0..1: negative now darkens (colord's .darken, via
    // deriveSurfaceColor in CtaButton.tsx) instead of only ever lightening.
    // Existing saved values (0.03, 0.065, 0.035, 0.05) all still fall inside
    // the new range, so no default/behavior change for anyone already using
    // these fields.
    autoBackgroundLightenAmount: clamp(
      base.autoBackgroundLightenAmount,
      -1,
      1,
      DEFAULT_CTA_BUTTON_CONFIG.autoBackgroundLightenAmount,
    ),
    autoBorderLightenAmount: clamp(
      base.autoBorderLightenAmount, -1, 1, DEFAULT_CTA_BUTTON_CONFIG.autoBorderLightenAmount,
    ),
    autoBackgroundHoverLightenAmount: clamp(
      base.autoBackgroundHoverLightenAmount,
      -1,
      1,
      DEFAULT_CTA_BUTTON_CONFIG.autoBackgroundHoverLightenAmount,
    ),
    autoBorderHoverLightenAmount: clamp(
      base.autoBorderHoverLightenAmount,
      -1,
      1,
      DEFAULT_CTA_BUTTON_CONFIG.autoBorderHoverLightenAmount,
    ),
    autoTextMinContrast: clamp(
      base.autoTextMinContrast, 1, 21, DEFAULT_CTA_BUTTON_CONFIG.autoTextMinContrast,
    ),
    size,
    fontSize: 'fontSize' in raw ? token(base.fontSize, FONT_SIZES, preset.fontSize) : preset.fontSize,
    paddingX: 'paddingX' in raw ? token(base.paddingX, PADDING_X, preset.paddingX) : preset.paddingX,
    paddingXDesktop: 'paddingXDesktop' in raw
      ? token(base.paddingXDesktop, DESKTOP_PADDING_X, preset.paddingXDesktop)
      : preset.paddingXDesktop,
    paddingY: 'paddingY' in raw ? token(base.paddingY, PADDING_Y, preset.paddingY) : preset.paddingY,
    paddingYDesktop: 'paddingYDesktop' in raw
      ? token(base.paddingYDesktop, DESKTOP_PADDING_Y, preset.paddingYDesktop)
      : preset.paddingYDesktop,
    minHeightPx: 'minHeightPx' in raw
      ? clamp(base.minHeightPx, 24, 96, preset.minHeightPx)
      : preset.minHeightPx,
    minWidthPx: 'minWidthPx' in raw
      ? clamp(base.minWidthPx, 64, 320, preset.minWidthPx)
      : preset.minWidthPx,
    hoverColorsEnabled: base.hoverColorsEnabled === true,
    hoverBackgroundColor: color(
      base.hoverBackgroundColor,
      DEFAULT_CTA_BUTTON_CONFIG.hoverBackgroundColor,
    ),
    hoverBorderColor: color(
      base.hoverBorderColor,
      DEFAULT_CTA_BUTTON_CONFIG.hoverBorderColor,
    ),
    hoverTextColor: color(
      base.hoverTextColor,
      DEFAULT_CTA_BUTTON_CONFIG.hoverTextColor,
    ),
    colorTransitionRatio: clamp(
      base.colorTransitionRatio, 0.05, 1, DEFAULT_CTA_BUTTON_CONFIG.colorTransitionRatio,
    ),
    colorEasing: token(
      base.colorEasing, MOTION_EASINGS, DEFAULT_CTA_BUTTON_CONFIG.colorEasing,
    ),
    gradientScale: clamp(base.gradientScale, 1, 3, DEFAULT_CTA_BUTTON_CONFIG.gradientScale),
    gradientPanXPercent: clamp(
      base.gradientPanXPercent, 0, 100, DEFAULT_CTA_BUTTON_CONFIG.gradientPanXPercent,
    ),
    gradientPanYPercent: clamp(
      base.gradientPanYPercent, 0, 100, DEFAULT_CTA_BUTTON_CONFIG.gradientPanYPercent,
    ),
    proximityRadiusPx: clamp(
      base.proximityRadiusPx, 80, 640, DEFAULT_CTA_BUTTON_CONFIG.proximityRadiusPx,
    ),
    proximityEasing: token(
      base.proximityEasing, PROXIMITY_EASINGS, DEFAULT_CTA_BUTTON_CONFIG.proximityEasing,
    ),
    proximityAttackMs: clamp(
      base.proximityAttackMs, 16, 600, DEFAULT_CTA_BUTTON_CONFIG.proximityAttackMs,
    ),
    proximityReleaseMs: clamp(
      base.proximityReleaseMs, 16, 1000, DEFAULT_CTA_BUTTON_CONFIG.proximityReleaseMs,
    ),
    proximityLiftPx: clamp(
      base.proximityLiftPx, 0, 24, DEFAULT_CTA_BUTTON_CONFIG.proximityLiftPx,
    ),
    proximityScale: clamp(
      base.proximityScale, 1, 1.08, DEFAULT_CTA_BUTTON_CONFIG.proximityScale,
    ),
    tiltEnabled: base.tiltEnabled === true,
    tiltYEnabled: base.tiltYEnabled === true,
    tiltMaxDegrees: clamp(
      base.tiltMaxDegrees, 0, 10, DEFAULT_CTA_BUTTON_CONFIG.tiltMaxDegrees,
    ),
    tiltPerspectivePx: clamp(
      base.tiltPerspectivePx, 320, 1600, DEFAULT_CTA_BUTTON_CONFIG.tiltPerspectivePx,
    ),
    tiltResponseMs: clamp(
      base.tiltResponseMs, 16, 500, DEFAULT_CTA_BUTTON_CONFIG.tiltResponseMs,
    ),
    stateTransitionMs: clamp(
      base.stateTransitionMs, 0, 600, DEFAULT_CTA_BUTTON_CONFIG.stateTransitionMs,
    ),
    stateEasing: token(base.stateEasing, MOTION_EASINGS, DEFAULT_CTA_BUTTON_CONFIG.stateEasing),
    stateExitTransitionMs: clamp(
      base.stateExitTransitionMs,
      0,
      900,
      DEFAULT_CTA_BUTTON_CONFIG.stateExitTransitionMs,
    ),
    stateExitEasing: token(
      base.stateExitEasing,
      MOTION_EASINGS,
      DEFAULT_CTA_BUTTON_CONFIG.stateExitEasing,
    ),
    pressTransitionMs: clamp(
      base.pressTransitionMs, 0, 300, DEFAULT_CTA_BUTTON_CONFIG.pressTransitionMs,
    ),
    pressEasing: token(base.pressEasing, MOTION_EASINGS, DEFAULT_CTA_BUTTON_CONFIG.pressEasing),
    pressCompressPx: clamp(
      base.pressCompressPx, 0, 40, DEFAULT_CTA_BUTTON_CONFIG.pressCompressPx,
    ),
    pressBounceStiffness: clamp(
      base.pressBounceStiffness, 40, 600, DEFAULT_CTA_BUTTON_CONFIG.pressBounceStiffness,
    ),
    pressBounceDamping: clamp(
      base.pressBounceDamping, 2, 60, DEFAULT_CTA_BUTTON_CONFIG.pressBounceDamping,
    ),
    shadowEngineEnabled: base.shadowEngineEnabled !== false,
    elevationReactionEnabled: base.elevationReactionEnabled !== false,
    shadowElevationMinPx: clamp(
      base.shadowElevationMinPx, 0, 8, DEFAULT_CTA_BUTTON_CONFIG.shadowElevationMinPx,
    ),
    shadowElevationRestingPx: clamp(
      base.shadowElevationRestingPx, 0, 20, DEFAULT_CTA_BUTTON_CONFIG.shadowElevationRestingPx,
    ),
    // Floor matches shadowElevationRestingPx's own floor (0), not an
    // arbitrary higher one — a consumer that wants hover to exactly match
    // resting (freezing the elevation reaction while keeping the engine's
    // own rest-state shadow untouched) needs this reachable down to
    // whatever resting itself can be, not clamped above it.
    shadowElevationHoverPx: clamp(
      base.shadowElevationHoverPx, 0, 48, DEFAULT_CTA_BUTTON_CONFIG.shadowElevationHoverPx,
    ),
    shadowElevationFocusPx: clamp(
      base.shadowElevationFocusPx, 2, 48, DEFAULT_CTA_BUTTON_CONFIG.shadowElevationFocusPx,
    ),
    shadowElevationPressedPx: clamp(
      base.shadowElevationPressedPx, 0, 16, DEFAULT_CTA_BUTTON_CONFIG.shadowElevationPressedPx,
    ),
    shadowElevationMaxPx: clamp(
      base.shadowElevationMaxPx, 12, 80, DEFAULT_CTA_BUTTON_CONFIG.shadowElevationMaxPx,
    ),
    shadowLightXPercent: clamp(
      base.shadowLightXPercent, 0, 100, DEFAULT_CTA_BUTTON_CONFIG.shadowLightXPercent,
    ),
    shadowLightYPx: clamp(
      base.shadowLightYPx, -600, 200, DEFAULT_CTA_BUTTON_CONFIG.shadowLightYPx,
    ),
    shadowLightHeightPx: clamp(
      base.shadowLightHeightPx, 24, 320, DEFAULT_CTA_BUTTON_CONFIG.shadowLightHeightPx,
    ),
    shadowLightRadiusPx: clamp(
      base.shadowLightRadiusPx, 8, 320, DEFAULT_CTA_BUTTON_CONFIG.shadowLightRadiusPx,
    ),
    shadowLightDirectIntensity: clamp(
      base.shadowLightDirectIntensity, 0, 4, DEFAULT_CTA_BUTTON_CONFIG.shadowLightDirectIntensity,
    ),
    shadowLightAmbientIntensity: clamp(
      base.shadowLightAmbientIntensity,
      0,
      4,
      DEFAULT_CTA_BUTTON_CONFIG.shadowLightAmbientIntensity,
    ),
    shadowProjectedStrength: clamp(
      base.shadowProjectedStrength, 0, 1, DEFAULT_CTA_BUTTON_CONFIG.shadowProjectedStrength,
    ),
    shadowProjectedFalloff: clamp(
      base.shadowProjectedFalloff, 0.2, 4, DEFAULT_CTA_BUTTON_CONFIG.shadowProjectedFalloff,
    ),
    shadowContactStrength: clamp(
      base.shadowContactStrength, 0, 1, DEFAULT_CTA_BUTTON_CONFIG.shadowContactStrength,
    ),
    shadowContactFalloff: clamp(
      base.shadowContactFalloff, 0.2, 4, DEFAULT_CTA_BUTTON_CONFIG.shadowContactFalloff,
    ),
    shadowContactDecayElevationPx: clamp(
      base.shadowContactDecayElevationPx,
      4,
      80,
      DEFAULT_CTA_BUTTON_CONFIG.shadowContactDecayElevationPx,
    ),
    shadowNearFieldStrength: clamp(
      base.shadowNearFieldStrength, 0, 1, DEFAULT_CTA_BUTTON_CONFIG.shadowNearFieldStrength,
    ),
    shadowMaxBlurPx: clamp(
      base.shadowMaxBlurPx, 8, 160, DEFAULT_CTA_BUTTON_CONFIG.shadowMaxBlurPx,
    ),
    shadowMaxDisplacementPx: clamp(
      base.shadowMaxDisplacementPx, 4, 100, DEFAULT_CTA_BUTTON_CONFIG.shadowMaxDisplacementPx,
    ),
    shadowMaxProjectedScale: clamp(
      base.shadowMaxProjectedScale, 1, 1.8, DEFAULT_CTA_BUTTON_CONFIG.shadowMaxProjectedScale,
    ),
    shadowColor: color(base.shadowColor, DEFAULT_CTA_BUTTON_CONFIG.shadowColor),
    shadowDebugMode: base.shadowDebugMode === true,
    shadowDevElevationOverrideEnabled: base.shadowDevElevationOverrideEnabled === true,
    shadowDevElevationOverridePx: clamp(
      base.shadowDevElevationOverridePx,
      0,
      80,
      DEFAULT_CTA_BUTTON_CONFIG.shadowDevElevationOverridePx,
    ),
  };
}

const SIZE_BOUND_KEYS = [
  'size', 'fontSize', 'paddingX', 'paddingXDesktop', 'paddingY', 'paddingYDesktop',
  'minHeightPx', 'minWidthPx',
] as const satisfies ReadonlyArray<keyof CtaButtonConfig>;

/**
 * Renders an already-resolved CtaButtonConfig (e.g. shared Context state
 * everyone else is already using) at a *different* size, without carrying
 * over the stale font/padding/min-size values that config was previously
 * resolved at. Plain object-spread (`{ ...sharedConfig, size: 'lg' }`) can't
 * do this correctly: a fully-materialized config always has every key
 * present, so normalizeCtaButtonConfig's "did the caller explicitly set
 * fontSize?" check (which exists so real per-instance overrides in tests/
 * stories keep working) sees the old size's leftover fontSize/paddingX as if
 * they were a deliberate override and never recomputes them for the new
 * size. This strips exactly the size-bound keys first, so the new size's
 * own preset resolves cleanly while every other property (colors, motion,
 * shadow tuning) still comes from the shared config unchanged.
 */
export function withCtaButtonSize(
  config: CtaButtonConfig,
  size: CtaButtonSize,
): Partial<CtaButtonConfig> {
  const rest: Partial<CtaButtonConfig> = { ...config };
  for (const key of SIZE_BOUND_KEYS) delete rest[key];
  return { ...rest, size };
}
