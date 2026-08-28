import type { LabSummary } from '../../../helpers/labContent';
import type { SliderContentSlide } from '../../../helpers/postContent';
import type { PointerProximityEasing } from '../../../helpers/pointerProximity';
import { getSliderVisualParameters } from '../../../helpers/sliderVisualParameters';
import {
  getArticleCardFallbackPalette,
  hslToSrgb,
  type HslColor,
} from '../../../helpers/articleCardFallback';
import {
  mapSrgbToMetal,
  type GradientMetalLuminanceOutputTreatment,
} from './AbstractPostDock/config/outputTreatment';
import {
  DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG,
  type AbstractPostDockHologramConfig,
} from './AbstractPostDock/config/registered';

export type AbstractMetalLabCardConfig = {
  shadowColor: string;
  bodyColor: string;
  highlightColor: string;
  inputBlackPoint: number;
  inputWhitePoint: number;
  gamma: number;
  baseDarkness: number;
  baseContrast: number;
  bodyPoint: number;
  highlightKnee: number;
  highlightGain: number;
  hoverEnabled: boolean;
  hoverOffsetGain: number;
  hoverHueShiftAmount: number;
  hoverSaturationBoost: number;
  hoverBrightnessBoost: number;
  hoverContrastBoost: number;
  hoverResponseEasing: PointerProximityEasing;
  hoverDampingEnabled: boolean;
};

export const ABSTRACT_METAL_LAB_CARD_CONFIG_RANGES = {
  inputBlackPoint: { min: 0, max: 0.4, step: 0.005 },
  inputWhitePoint: { min: 0.4, max: 1, step: 0.005 },
  gamma: { min: 0.2, max: 2, step: 0.01 },
  baseDarkness: { min: 0, max: 1, step: 0.01 },
  baseContrast: { min: 0.5, max: 2.5, step: 0.01 },
  bodyPoint: { min: 0.05, max: 0.8, step: 0.01 },
  highlightKnee: { min: 0.2, max: 1, step: 0.01 },
  highlightGain: { min: 0, max: 1, step: 0.01 },
  hoverOffsetGain: { min: 0, max: 3, step: 0.05 },
  hoverHueShiftAmount: { min: 0, max: 0.4, step: 0.01 },
  hoverSaturationBoost: { min: 0, max: 1, step: 0.01 },
  hoverBrightnessBoost: { min: 0, max: 0.8, step: 0.01 },
  hoverContrastBoost: { min: -0.75, max: 2, step: 0.01 },
} as const;

/**
 * Panel-safe material controls. The colors stay serializable as hex strings;
 * renderer tuples are derived at the component boundary.
 */
export const DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG = {
  shadowColor: '#020508',
  bodyColor: '#0a121a',
  highlightColor: '#46545f',
  inputBlackPoint: 0.155,
  inputWhitePoint: 0.985,
  gamma: 0.76,
  baseDarkness: 0.7,
  baseContrast: 0.72,
  bodyPoint: 0.32,
  highlightKnee: 0.37,
  highlightGain: 0.57,
  hoverEnabled: true,
  hoverOffsetGain: 3,
  hoverHueShiftAmount: 0.23,
  hoverSaturationBoost: 0.3,
  hoverBrightnessBoost: 0.24,
  hoverContrastBoost: 0.54,
  hoverResponseEasing: 'smootherstep',
  hoverDampingEnabled: true,
} satisfies AbstractMetalLabCardConfig;

const POINTER_EASINGS = new Set<PointerProximityEasing>([
  'linear',
  'smoothstep',
  'smootherstep',
  'ease-out-cubic',
]);

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const normalizeNumber = (
  value: number | undefined,
  fallback: number,
  range: { readonly min: number; readonly max: number },
) => clamp(
  typeof value === 'number' && Number.isFinite(value) ? value : fallback,
  range.min,
  range.max,
);

const normalizeHexColor = (value: string | undefined, fallback: string) => {
  const candidate = typeof value === 'string' ? value.trim() : '';

  if (/^#[0-9a-f]{6}$/i.test(candidate)) return candidate.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(candidate)) {
    return `#${candidate.slice(1).split('').map(channel => (
      `${channel}${channel}`
    )).join('')}`.toLowerCase();
  }

  return fallback;
};

export function normalizeAbstractMetalLabCardConfig(
  config?: Partial<AbstractMetalLabCardConfig> | null,
): AbstractMetalLabCardConfig {
  const base = {
    ...DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG,
    ...(config ?? {}),
  };
  const blackPoint = normalizeNumber(
    base.inputBlackPoint,
    DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG.inputBlackPoint,
    ABSTRACT_METAL_LAB_CARD_CONFIG_RANGES.inputBlackPoint,
  );
  const whitePoint = Math.max(
    blackPoint + 0.0001,
    normalizeNumber(
      base.inputWhitePoint,
      DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG.inputWhitePoint,
      ABSTRACT_METAL_LAB_CARD_CONFIG_RANGES.inputWhitePoint,
    ),
  );

  return {
    shadowColor: normalizeHexColor(
      base.shadowColor,
      DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG.shadowColor,
    ),
    bodyColor: normalizeHexColor(
      base.bodyColor,
      DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG.bodyColor,
    ),
    highlightColor: normalizeHexColor(
      base.highlightColor,
      DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG.highlightColor,
    ),
    inputBlackPoint: blackPoint,
    inputWhitePoint: Math.min(1, whitePoint),
    gamma: normalizeNumber(
      base.gamma,
      DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG.gamma,
      ABSTRACT_METAL_LAB_CARD_CONFIG_RANGES.gamma,
    ),
    baseDarkness: normalizeNumber(
      base.baseDarkness,
      DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG.baseDarkness,
      ABSTRACT_METAL_LAB_CARD_CONFIG_RANGES.baseDarkness,
    ),
    baseContrast: normalizeNumber(
      base.baseContrast,
      DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG.baseContrast,
      ABSTRACT_METAL_LAB_CARD_CONFIG_RANGES.baseContrast,
    ),
    bodyPoint: normalizeNumber(
      base.bodyPoint,
      DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG.bodyPoint,
      ABSTRACT_METAL_LAB_CARD_CONFIG_RANGES.bodyPoint,
    ),
    highlightKnee: normalizeNumber(
      base.highlightKnee,
      DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG.highlightKnee,
      ABSTRACT_METAL_LAB_CARD_CONFIG_RANGES.highlightKnee,
    ),
    highlightGain: normalizeNumber(
      base.highlightGain,
      DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG.highlightGain,
      ABSTRACT_METAL_LAB_CARD_CONFIG_RANGES.highlightGain,
    ),
    hoverEnabled: Boolean(base.hoverEnabled),
    hoverOffsetGain: normalizeNumber(
      base.hoverOffsetGain,
      DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG.hoverOffsetGain,
      ABSTRACT_METAL_LAB_CARD_CONFIG_RANGES.hoverOffsetGain,
    ),
    hoverHueShiftAmount: normalizeNumber(
      base.hoverHueShiftAmount,
      DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG.hoverHueShiftAmount,
      ABSTRACT_METAL_LAB_CARD_CONFIG_RANGES.hoverHueShiftAmount,
    ),
    hoverSaturationBoost: normalizeNumber(
      base.hoverSaturationBoost,
      DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG.hoverSaturationBoost,
      ABSTRACT_METAL_LAB_CARD_CONFIG_RANGES.hoverSaturationBoost,
    ),
    hoverBrightnessBoost: normalizeNumber(
      base.hoverBrightnessBoost,
      DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG.hoverBrightnessBoost,
      ABSTRACT_METAL_LAB_CARD_CONFIG_RANGES.hoverBrightnessBoost,
    ),
    hoverContrastBoost: normalizeNumber(
      base.hoverContrastBoost,
      DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG.hoverContrastBoost,
      ABSTRACT_METAL_LAB_CARD_CONFIG_RANGES.hoverContrastBoost,
    ),
    hoverResponseEasing: POINTER_EASINGS.has(base.hoverResponseEasing)
      ? base.hoverResponseEasing
      : DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG.hoverResponseEasing,
    hoverDampingEnabled: Boolean(base.hoverDampingEnabled),
  };
}

const hexToSrgb = (color: string): readonly [number, number, number] => {
  const channels = color.slice(1);

  return [
    parseInt(channels.slice(0, 2), 16) / 255,
    parseInt(channels.slice(2, 4), 16) / 255,
    parseInt(channels.slice(4, 6), 16) / 255,
  ];
};

export function resolveAbstractMetalLabOutputTreatment(
  config?: Partial<AbstractMetalLabCardConfig> | null,
): GradientMetalLuminanceOutputTreatment {
  const normalized = normalizeAbstractMetalLabCardConfig(config);

  return {
    mode: 'metal-luminance',
    inputBlackPoint: normalized.inputBlackPoint,
    inputWhitePoint: normalized.inputWhitePoint,
    gamma: normalized.gamma,
    baseDarkness: normalized.baseDarkness,
    baseContrast: normalized.baseContrast,
    interactionContrastBoost: normalized.hoverContrastBoost,
    bodyPoint: normalized.bodyPoint,
    highlightKnee: normalized.highlightKnee,
    highlightGain: normalized.highlightGain,
    shadowColor: hexToSrgb(normalized.shadowColor),
    bodyColor: hexToSrgb(normalized.bodyColor),
    highlightColor: hexToSrgb(normalized.highlightColor),
  };
}

export function resolveAbstractMetalLabHologramConfig(
  config?: Partial<AbstractMetalLabCardConfig> | null,
): AbstractPostDockHologramConfig {
  const normalized = normalizeAbstractMetalLabCardConfig(config);

  return {
    ...DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG,
    enabled: normalized.hoverEnabled,
    offsetGain: normalized.hoverOffsetGain,
    hueShiftAmount: normalized.hoverHueShiftAmount,
    saturationBoost: normalized.hoverSaturationBoost,
    brightnessBoost: normalized.hoverBrightnessBoost,
    responseEasing: normalized.hoverResponseEasing,
    dampingEnabled: normalized.hoverDampingEnabled,
  };
}

/**
 * One material response shared by the collection. It receives each card's
 * already-complete journal-style RGB field and maps only its final perceived
 * luminance into this dark graphite/blue-steel register.
 */
export const DEFAULT_ABSTRACT_METAL_LAB_OUTPUT_TREATMENT =
  resolveAbstractMetalLabOutputTreatment(
    DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG,
  );

/**
 * GradientRenderer consumes the journal slide shape even when LabCard owns the
 * content. Visual parameters come from the same function as journal slides,
 * so labs receive the same seed/phase/offset distribution rather than a
 * separate metal-specific approximation.
 */
export function toAbstractMetalLabSlide(
  lab: LabSummary,
  index: number,
): SliderContentSlide {
  const slideNumber = index + 1;

  return {
    id: slideNumber,
    slug: lab.slug,
    label: `${slideNumber}`.padStart(2, '0'),
    title: lab.title,
    excerpt: lab.excerpt,
    topic: lab.tech[0] ?? '',
    date: lab.formattedDate ?? lab.date,
    readingTime: lab.tech.slice(1, 3).join(' · '),
    href: lab.canonicalPath,
    externalUrl: null,
    forceExternalNavigation: false,
    ...getSliderVisualParameters(index),
  };
}

const toCssChannels = (color: readonly [number, number, number]) =>
  color.map(channel => Math.round(channel * 255)) as [number, number, number];

const rgb = (color: readonly [number, number, number]) => {
  const [red, green, blue] = toCssChannels(color);
  return `rgb(${red} ${green} ${blue})`;
};

const rgba = (color: readonly [number, number, number], alpha: number) => {
  const [red, green, blue] = toCssChannels(color);
  return `rgb(${red} ${green} ${blue} / ${alpha})`;
};

const mapFallbackColor = (
  color: HslColor,
  treatment: GradientMetalLuminanceOutputTreatment,
) => mapSrgbToMetal(hslToSrgb(color), treatment);

/**
 * Per-card SSR/context-loss fallback. It starts from the same colorful
 * ArticleCard fallback palette, then maps each stop through the CPU companion
 * of the shader's luminance treatment. Cards therefore remain distinct before
 * WebGL mounts instead of sharing one generic dark background.
 */
export function getAbstractMetalLabFallbackBackground(
  seed: number,
  treatment: GradientMetalLuminanceOutputTreatment =
    DEFAULT_ABSTRACT_METAL_LAB_OUTPUT_TREATMENT,
) {
  const source = getArticleCardFallbackPalette(seed);
  const upper = mapFallbackColor(source.upper, treatment);
  const lowerRight = mapFallbackColor(source.lowerRight, treatment);
  const lowerLeft = mapFallbackColor(source.lowerLeft, treatment);
  const baseStart = mapFallbackColor(source.baseStart, treatment);
  const baseMiddleA = mapFallbackColor(source.baseMiddleA, treatment);
  const baseMiddleB = mapFallbackColor(source.baseMiddleB, treatment);
  const baseEnd = mapFallbackColor(source.baseEnd, treatment);

  return [
    `radial-gradient(circle at 18% 22%, ${rgba(upper, 0.76)}, transparent 46%)`,
    `radial-gradient(circle at 82% 76%, ${rgba(lowerRight, 0.68)}, transparent 54%)`,
    `radial-gradient(circle at 22% 82%, ${rgba(lowerLeft, 0.58)}, transparent 50%)`,
    `linear-gradient(135deg, ${rgb(baseStart)}, ${rgb(baseMiddleA)} 34%, ${rgb(baseMiddleB)} 68%, ${rgb(baseEnd)})`,
  ].join(', ');
}
