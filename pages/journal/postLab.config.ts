// Posts lab page layout — thin re-export onto the shared, promoted
// PolymorphicLayoutConfig
// (experiences/abstract/components/PolymorphicLayout.config.ts). See
// PLAN-SPLIT-COLUMN-LAYOUT-ENRICHMENT-EXTRACTION.md: the full type,
// defaults, and normalize logic that used to live in this file were
// relocated there so a future page can adopt the same shape without
// depending on a posts-lab-specific file.
//
// PLAN-POLYMORPHIC-LAYOUT-PAGE-CONFIG-PARITY.md: posts-lab's own
// default-value instance used to be DEFAULT_POLYMORPHIC_LAYOUT_CONFIG
// itself, re-exported verbatim under an alias — meaning posts-lab had no
// config of its own at all, and any future change to the shared library
// default would have silently changed posts-lab's own rendered layout too
// (the exact drift PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md's "never spread/
// reuse a shared DEFAULT_..._CONFIG as a page's own value" warns against,
// just via re-export instead of spread). Now points at
// POST_LAB_POLYMORPHIC_LAYOUT_CONFIG (PolymorphicLayout.pageConfigs.ts) —
// posts-lab's own genuine, independent, satisfies-checked instance,
// co-located there with /abstract's and /about's — under the same original
// export name, so this file's own consumers (pages/posts-lab/[slug].tsx,
// postLab.panel.ts, postLab.panel.test.tsx) need no import changes.
import { POST_LAB_POLYMORPHIC_LAYOUT_CONFIG } from '../../experiences/abstract/components/PolymorphicLayout.pageConfigs'
import type { PolymorphicLayoutConfig } from '../../experiences/abstract/components/PolymorphicLayout.config'

export {
  normalizePolymorphicLayoutConfig as normalizePostLabPageLayoutConfig,
  type PolymorphicLayoutConfig as PostLabPageLayoutConfig,
  type PolymorphicLayoutContentContainerAlign,
  CONTENT_ALIGN_MARGIN_CLASS_WIDE,
} from '../../experiences/abstract/components/PolymorphicLayout.config'

// Own instance, not the shared POST_LAB_POLYMORPHIC_LAYOUT_CONFIG re-export
// (PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md's own warning above still applies —
// a page-local override belongs here, not folded back into the shared
// pageConfigs.ts instance both this page and /journal spread from).
//
// Keep the post page's mobile recipe independent, but use /abstract's
// desktop background-gradient recipe for both tablet (Wide) and desktop
// (Lg). Wordmark gradients and column/layout fields remain page-owned.
export const DEFAULT_POST_LAB_PAGE_LAYOUT_CONFIG: PolymorphicLayoutConfig = {
  ...POST_LAB_POLYMORPHIC_LAYOUT_CONFIG,
  scrollGradientBaseHue: 200,
  scrollGradientBaseHueWide: 202,
  scrollGradientLightnessMin: 77,
  scrollGradientLightnessMinWide: 72,
  scrollGradientChromaMin: 70,
  scrollGradientChromaMinWide: 40,
  scrollGradientMode: 'center-bright',
  scrollGradientModeWide: 'center-bright',
  scrollGradientCenterStretch: 0.8,
  scrollGradientCenterStretchWide: 1,
  scrollGradientInterpolation: 'srgb',
  scrollGradientInterpolationWide: 'oklab',
  scrollGradientCompositor: 'enhanced',
  scrollGradientCompositorWide: 'enhanced',
  scrollGradientLightRadiusPercent: 60,
  scrollGradientLightRadiusPercentWide: 50,
  scrollGradientLightAspectRatio: 4,
  scrollGradientLightAspectRatioWide: 4,
  scrollGradientExtentPercent: 400,
  scrollGradientExtentPercentWide: 224,
  scrollGradientSmoothness: 4,
  scrollGradientSmoothnessWide: 4,
  scrollGradientDitherAmount: 0.051,
  scrollGradientDitherAmountWide: 0.069,
  scrollGradientDitherScale: 2.2,
  scrollGradientDitherScaleWide: 2.5,
  scrollGradientInkColor: '#c68080',
  scrollGradientInkColorWide: '#c68080',
  scrollGradientViewportRangeVh: 10,
  scrollGradientViewportRangeVhWide: 10,
  scrollGradientMaxDarken: 0,
  scrollGradientMaxDarkenWide: 0,
  scrollGradientLegibilityTargetRatio: 3,
  scrollGradientLegibilityTargetRatioWide: 5.5,
  scrollGradientDarkInkSaturation: 2,
  scrollGradientDarkInkSaturationWide: 2,
  scrollGradientDarkInkOpacityMultiplier: 0.9,
  scrollGradientDarkInkOpacityMultiplierWide: 0.73,
  scrollGradientFocalHorizontal: 'center',
  scrollGradientFocalHorizontalWide: 'right',
  scrollGradientLightHiddenPercent: 60,
  scrollGradientLightHiddenPercentWide: 70,
  scrollGradientLightFalloff: 1.1,
  scrollGradientLightFalloffWide: 0.8,

  scrollGradientStopsWide: 9,
  scrollGradientMixSamplesWide: 25,
  scrollGradientDitherSeedWide: 100000,
  scrollGradientDarkenOnScrollEnabledWide: false,
  scrollGradientLightInkOnLightBackgroundContrastToleranceWide: 1.2,

  scrollGradientBaseHueLg: 202,
  scrollGradientHueSchemeLg: 'dual-complementary',
  scrollGradientLightnessMinLg: 72,
  scrollGradientChromaMinLg: 40,
  scrollGradientModeLg: 'center-bright',
  scrollGradientStopsLg: 9,
  scrollGradientVarianceLg: 1,
  scrollGradientCenterStretchLg: 1,
  scrollGradientSeedLg: 59452,
  scrollGradientCompositorLg: 'enhanced',
  scrollGradientFocalHorizontalLg: 'right',
  scrollGradientLightHiddenPercentLg: 70,
  scrollGradientLightRadiusPercentLg: 50,
  scrollGradientLightAspectRatioLg: 4,
  scrollGradientLightFalloffLg: 0.8,
  scrollGradientMixSamplesLg: 25,
  scrollGradientInterpolationLg: 'oklab',
  scrollGradientExtentPercentLg: 224,
  scrollGradientSmoothnessLg: 4,
  scrollGradientDitherEnabledLg: true,
  scrollGradientDitherAmountLg: 0.069,
  scrollGradientDitherScaleLg: 2.5,
  scrollGradientDitherSeedLg: 100000,
  scrollGradientInkColorLg: '#c68080',
  scrollGradientViewportRangeVhLg: 10,
  scrollGradientMaxDarkenLg: 0,
  scrollGradientDarkenOnScrollEnabledLg: false,
  scrollGradientLegibilityTargetRatioLg: 5.5,
  scrollGradientDarkInkSaturationLg: 2,
  scrollGradientDarkInkOpacityMultiplierLg: 0.4,
  scrollGradientLightInkOnLightBackgroundContrastToleranceLg: 3.1,
  scrollGradientNarrowColumnVariantEnabledLg: true,
  scrollGradientNarrowColumnSaturationLg: 1,
  scrollGradientNarrowColumnDarknessLg: 0,


  wideColumnTransparentWide: true,

  headerScrollBehaviorWide: 'static',

  wideColumnContentPaddingTop: 'pt-10',
}
