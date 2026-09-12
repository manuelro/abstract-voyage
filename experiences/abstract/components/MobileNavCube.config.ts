import type { CtaButtonMotionEasing } from '../../../components/CtaButton/config/registered';
import {
  DEFAULT_CUBE_LAB_CONFIG,
  normalizeCubeLabConfig,
  type CubeLabConfig,
} from '../../../pages/cube-lab.config';

/** Mobile navigation presentation layered onto the shared CubeNavigator
 * geometry. CubeLabConfig supplies the exact perspective, push-back, turn,
 * and landing-settle values proven by /cube-lab; the remaining fields belong
 * only to the fixed burger/X trigger and Face E's navigation content. */
export type MobileNavCubeConfig = CubeLabConfig & {
  enabled: boolean;
  /** When true (default), the trigger's horizontal position, its three bars'
   * individual vertical positions, and their thickness are all computed —
   * every render, from the live rendered wordmark SVG — to exactly match the
   * wordmark's own "E" letterform (its three horizontal strokes), so the
   * bars read as a continuation of the E rather than an unrelated icon.
   * Still a one-directional read: the trigger tracks the wordmark, the
   * wordmark is never affected by the trigger. triggerAlign/triggerTopPx/
   * triggerOffsetXPx/triggerBarThicknessPx/triggerBarGapPx below become
   * fallback-only values, used before the wordmark is first measured or
   * whenever this is turned off. */
  triggerAlignToWordmarkE: boolean;
  /** Gap between the wordmark's "E" and the trigger's bars when
   * triggerAlignToWordmarkE is on — keeps them read as a related but
   * distinct extension rather than visually fusing into the letterform. */
  triggerWordmarkGapPx: number;
  /** Which edge triggerOffsetXPx is measured from. Horizontal position is
   * fixed purely from this config — never derived from any other element's
   * layout — so it renders at the same horizontal position on every page.
   * Fallback only while triggerAlignToWordmarkE is on (see its own doc
   * comment above). */
  triggerAlign: 'left' | 'right';
  /** Fallback/initial top offset only, used until MobileNavCube.tsx's own
   * wordmark-vertical-center effect measures the live wordmark anchor (a
   * one-directional read — the trigger tracks the wordmark, the wordmark
   * is never affected by the trigger). Since the wordmark itself renders at
   * the same vertical position on every page, the effective result stays
   * consistent site-wide even though it's computed, not a static constant. */
  triggerTopPx: number;
  triggerOffsetXPx: number;
  /** The button's own rendered box width — independent of triggerSizePx
   * (which continues to drive height and the icon bars' own scale), so the
   * tap target can be wider or narrower than it is tall. */
  triggerWidthPx: number;
  triggerSizePx: number;
  /** Inset between the button's own edges and its icon bars. Pure CSS
   * padding on the button — the bars' own geometry (triggerSizePx-driven)
   * is unaffected; a large value simply leaves less room for them. */
  triggerPaddingPx: number;
  triggerBarThicknessPx: number;
  triggerBarGapPx: number;
  triggerIconColor: string;
  triggerBackgroundColor: string;
  /** Alpha applied to triggerBackgroundColor (0 = fully transparent button
   * face, 1 = fully opaque) — independent of triggerOpacity below, which
   * fades the whole button (icon included), not just its background fill. */
  triggerBackgroundOpacity: number;
  /** Overall button opacity (background + icon bars together) at rest.
   * Hover/tap states nudge away from this value — see
   * triggerInteractionTransitionMs. */
  triggerOpacity: number;
  /** Transition duration for the button's own hover/tap opacity feedback
   * (CSS :hover/:active on MobileNavCube.module.css's own .trigger class) —
   * independent of iconMorphDurationMs below, which only times the
   * burger-to-X bar morph on open/close. */
  triggerInteractionTransitionMs: number;
  triggerBorderRadiusPx: number;
  faceHeightVh: number;
  facePanelBackgroundColor: string;
  facePanelTextColor: string;
  iconMorphDurationMs: number;
  iconMorphEasing: CtaButtonMotionEasing;
  zIndex: number;
};

export const DEFAULT_MOBILE_NAV_CUBE_CONFIG = {
  ...DEFAULT_CUBE_LAB_CONFIG,
  faceTheCameraSelection: 'A',
  rotateXDeg: 0,
  rotateYDeg: 0,
  rotationDurationMs: 350,
  settleDurationMs: 700,
  fillViewportEnabled: true,
  enabled: false,
  triggerAlignToWordmarkE: false,
  triggerWordmarkGapPx: 16,
  triggerAlign: 'right',
  triggerTopPx: 20,
  triggerOffsetXPx: 0,
  triggerWidthPx: 32,
  triggerSizePx: 32,
  triggerPaddingPx: 0,
  triggerBarThicknessPx: 1,
  triggerBarGapPx: 4,
  triggerIconColor: '#469dd2',
  triggerBackgroundColor: '#000000',
  triggerBackgroundOpacity: 0,
  triggerOpacity: 1,
  triggerInteractionTransitionMs: 200,
  triggerBorderRadiusPx: 12,
  faceHeightVh: 100,
  facePanelBackgroundColor: '#2b2b36',
  facePanelTextColor: '#f7f9ff',
  iconMorphDurationMs: 310,
  iconMorphEasing: 'standard',
  zIndex: 2000,
} satisfies MobileNavCubeConfig;

const MOTION_EASINGS: ReadonlyArray<CtaButtonMotionEasing> = [
  'linear', 'standard', 'expressive', 'viscous', 'gentle', 'gaussian',
];
const TRIGGER_ALIGNMENTS: ReadonlyArray<MobileNavCubeConfig['triggerAlign']> = ['left', 'right'];

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function token<T extends string>(value: unknown, allowed: ReadonlyArray<T>, fallback: T): T {
  return typeof value === 'string' && (allowed as ReadonlyArray<string>).includes(value)
    ? (value as T)
    : fallback;
}

export function normalizeMobileNavCubeConfig(
  config: Partial<MobileNavCubeConfig> | undefined,
): MobileNavCubeConfig {
  const base = { ...DEFAULT_MOBILE_NAV_CUBE_CONFIG, ...(config ?? {}) };
  const cube = normalizeCubeLabConfig(base);
  return {
    ...cube,
    enabled: base.enabled === true,
    triggerAlignToWordmarkE: base.triggerAlignToWordmarkE === true,
    triggerWordmarkGapPx: clampNumber(
      base.triggerWordmarkGapPx, 0, 64, DEFAULT_MOBILE_NAV_CUBE_CONFIG.triggerWordmarkGapPx,
    ),
    triggerAlign: token(base.triggerAlign, TRIGGER_ALIGNMENTS, DEFAULT_MOBILE_NAV_CUBE_CONFIG.triggerAlign),
    triggerTopPx: clampNumber(base.triggerTopPx, 0, 200, DEFAULT_MOBILE_NAV_CUBE_CONFIG.triggerTopPx),
    triggerOffsetXPx: clampNumber(
      base.triggerOffsetXPx, 0, 200, DEFAULT_MOBILE_NAV_CUBE_CONFIG.triggerOffsetXPx,
    ),
    triggerWidthPx: clampNumber(base.triggerWidthPx, 32, 200, DEFAULT_MOBILE_NAV_CUBE_CONFIG.triggerWidthPx),
    triggerSizePx: clampNumber(base.triggerSizePx, 32, 72, DEFAULT_MOBILE_NAV_CUBE_CONFIG.triggerSizePx),
    triggerPaddingPx: clampNumber(base.triggerPaddingPx, 0, 32, DEFAULT_MOBILE_NAV_CUBE_CONFIG.triggerPaddingPx),
    triggerBarThicknessPx: clampNumber(
      base.triggerBarThicknessPx, 1, 6, DEFAULT_MOBILE_NAV_CUBE_CONFIG.triggerBarThicknessPx,
    ),
    triggerBarGapPx: clampNumber(base.triggerBarGapPx, 2, 14, DEFAULT_MOBILE_NAV_CUBE_CONFIG.triggerBarGapPx),
    triggerIconColor: typeof base.triggerIconColor === 'string'
      ? base.triggerIconColor
      : DEFAULT_MOBILE_NAV_CUBE_CONFIG.triggerIconColor,
    triggerBackgroundColor: typeof base.triggerBackgroundColor === 'string'
      ? base.triggerBackgroundColor
      : DEFAULT_MOBILE_NAV_CUBE_CONFIG.triggerBackgroundColor,
    triggerBackgroundOpacity: clampNumber(
      base.triggerBackgroundOpacity, 0, 1, DEFAULT_MOBILE_NAV_CUBE_CONFIG.triggerBackgroundOpacity,
    ),
    triggerOpacity: clampNumber(base.triggerOpacity, 0, 1, DEFAULT_MOBILE_NAV_CUBE_CONFIG.triggerOpacity),
    triggerInteractionTransitionMs: clampNumber(
      base.triggerInteractionTransitionMs, 0, 1000,
      DEFAULT_MOBILE_NAV_CUBE_CONFIG.triggerInteractionTransitionMs,
    ),
    triggerBorderRadiusPx: clampNumber(
      base.triggerBorderRadiusPx, 0, 44, DEFAULT_MOBILE_NAV_CUBE_CONFIG.triggerBorderRadiusPx,
    ),
    faceHeightVh: clampNumber(base.faceHeightVh, 50, 100, DEFAULT_MOBILE_NAV_CUBE_CONFIG.faceHeightVh),
    facePanelBackgroundColor: typeof base.facePanelBackgroundColor === 'string'
      ? base.facePanelBackgroundColor
      : DEFAULT_MOBILE_NAV_CUBE_CONFIG.facePanelBackgroundColor,
    facePanelTextColor: typeof base.facePanelTextColor === 'string'
      ? base.facePanelTextColor
      : DEFAULT_MOBILE_NAV_CUBE_CONFIG.facePanelTextColor,
    iconMorphDurationMs: clampNumber(
      base.iconMorphDurationMs, 100, 1000, DEFAULT_MOBILE_NAV_CUBE_CONFIG.iconMorphDurationMs,
    ),
    iconMorphEasing: token(base.iconMorphEasing, MOTION_EASINGS, DEFAULT_MOBILE_NAV_CUBE_CONFIG.iconMorphEasing),
    zIndex: clampNumber(base.zIndex, 1, 9999, DEFAULT_MOBILE_NAV_CUBE_CONFIG.zIndex),
  };
}
