'use client';

import SeoHead from '../components/SeoHead';
import { buildSiteTitle } from '../helpers/siteMetadata';
import { getLabSummaries, type LabSummary } from '../helpers/labContent';
import type { FooterConfigOverrides } from '../helpers/footerContent';
import { SiteContentProvider } from '../helpers/content/SiteContentProvider';
import type { AbstractPageContent, SiteContent } from '../helpers/content/pageContent.schema';
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  WheelEvent as ReactWheelEvent,
} from 'react';
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { colord } from 'colord';
// DEFAULT_GRADIENT_DESIGNER_CONFIG/GradientDesignerConfig/GradientDesignerTarget
// come from AbstractGradientBackground.config.ts, not GradientDesignerPanel
// itself, deliberately: this page reads DEFAULT_GRADIENT_DESIGNER_CONFIG
// unconditionally (useState's own initial value, never gated behind
// showAuthoringTools — it's what drives the page's real, always-rendered
// gradient background), while GradientDesignerPanel.tsx is wholesale
// aliased to a production stub (a Proxy whose target is a function, so it
// stays safely callable/traversable everywhere it's actually used — see
// that stub's own doc comment). React's useState specifically special-cases
// a function-typed initial value as a lazy initializer and calls it — which
// silently produced `config: undefined` in production and crashed every
// prerendered read of `config.gradientFaceCount` (confirmed live,
// 2026-08-28, during this PoC's own production-build verification).
// AbstractGradientBackground.config.ts already exists as the real,
// panel-independent home for these exact same three exports — sourcing
// from there instead avoids the whole class of bug rather than patching
// this one symptom.
import {
  DEFAULT_GRADIENT_DESIGNER_CONFIG,
  type GradientDesignerConfig,
  type GradientDesignerTarget,
} from '../experiences/abstract/components/AbstractGradientBackground.config';
import { GradientDesignerPanel } from '../experiences/abstract/components/GradientDesignerPanel';
import {
  ConfigScopeList,
  createConfigScopeBinding,
  defineConfigScope,
  useConfigPanelBindings,
} from '../components/Panel/config';
import { PanelShell, PanelStandardHeaderActions } from '../components/Panel';
import {
  createTailwindFieldFactory,
  normalizeTailwindToken,
  tailwindTokenCssValue,
  type TailwindTokenValue,
} from '../components/Panel/config/tailwindFields';
import { DEFAULT_PANEL_SHELL_CONFIG } from '../components/Panel/config/shell';
import { useAuthoringToolsVisibility } from '../components/Panel/useAuthoringToolsVisibility';
import {
  DEFAULT_CTA_BUTTON_CONFIG,
  normalizeCtaButtonConfig,
  type CtaButtonMotionEasing,
} from '../components/CtaButton/config/registered';
import {
  applyCtaButtonColorOverride,
  ABSTRACT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG,
  normalizeCtaButtonColorOverrideConfig,
  type CtaButtonColorOverrideConfig,
} from '../components/CtaButton/config/colorOverride';
import { ABSTRACT_CTA_BUTTON_COLOR_OVERRIDE_PANEL } from '../components/CtaButton/config/colorOverride.panel';
import {
  DEFAULT_SECTION_HEADING_CONFIG,
  normalizeSectionHeadingConfig,
  type SectionHeadingConfig,
} from '../components/SectionHeading.config';
import { SectionHeading } from '../components/SectionHeading';
import { SECTION_HEADING_APPEARANCE_SCOPE_ID } from '../components/SectionHeading.panel';
import { PageContainer } from '../components/PageContainer';
import {
  DEFAULT_PAGE_SURFACE_CONFIG,
  normalizePageSurfaceConfig,
} from '../components/PageSurface.config';
import {
  DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG,
  resolveTypographyColors,
} from '../components/GlobalTypography.config';
import { DEFAULT_LAYOUT_DEBUG_CONFIG } from '../components/LayoutDebug.config';
import { useSharedDesignConfig } from '../components/SharedDesignConfigProvider';
import { useAbstractDesignConfig } from '../experiences/abstract/components/AbstractDesignConfigProvider';
import { buildSynthLogoStops } from '../experiences/synth/gradients/synthGradient';
import { clamp } from '../components/Panel';
import { resolveSiteHeaderLogoStops } from '../experiences/abstract/components/SiteHeader/hooks/resolveSiteHeaderLogoStops';
import {
  deriveOpaqueTint,
  blendOpaqueColors,
  resolveContrastAwareTextColor,
  deriveSurfaceColor,
  deriveTransparentTint,
} from '../helpers/surfaceColorDerivation';
import { usePrefersReducedMotion } from '../helpers/usePrefersReducedMotion';
import type { MotionValue } from 'motion/react';
import articleCardStyles from '../components/ArticleCard.module.css';
import { useLiquidSliderMotion } from '../experiences/abstract/components/AbstractPostDock/hooks/motion';
import { buildDeckPaletteStates } from '../experiences/abstract/helpers/deckPalette';
import { WallQuoteItem, type WallQuoteBreathingRoomConfig } from '../experiences/abstract/components/Quote/WallQuoteItem';
import { orderWallEntriesForColorRhythm } from './wallColorRhythm';
import { EditorialQuote } from '../experiences/abstract/components/Quote/EditorialQuote';
import { FeaturedInjectedQuote } from '../experiences/abstract/components/Quote/FeaturedInjectedQuote';
import { DEFAULT_FEATURED_WALL_QUOTE_CONFIG, normalizeFeaturedWallQuoteConfig, type FeaturedWallQuoteConfig } from '../experiences/abstract/components/Quote/featuredWallQuoteConfig';
import { FEATURED_WALL_QUOTE_PANEL } from '../experiences/abstract/components/Quote/FeaturedWallQuote.panel';
import { PracticesSection } from '../experiences/abstract/components/PracticesSection';
import type { WallBannerContent } from '../helpers/practicesContent.server';
import {
  DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG,
  normalizePracticesSectionLayoutConfig,
  type PracticesSectionLayoutConfig,
} from '../experiences/abstract/components/PracticesSection.config';
import { PRACTICES_SECTION_LAYOUT_PANEL } from '../experiences/abstract/components/PracticesSection.panel';
import { resolveEditorialInk } from '../experiences/abstract/components/Quote/editorialConfig';
import { createEditorialQuotePanel } from '../experiences/abstract/components/Quote/EditorialQuote.panel';
import { BOTTOM_BANNER_QUOTE_PANEL } from '../experiences/abstract/components/Quote/BottomBannerQuote.panel';
import { DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG } from '../experiences/abstract/components/Quote/bottomBannerConfig';
import { setBottomBannerQuoteDesign, useBottomBannerQuoteDesign } from '../experiences/abstract/components/Quote/bottomBannerLiveDesign';
import { wallTopRuleLayout, type WallMasonryItemPosition } from './wallQuoteTopRules';
import { setEditorialQuoteDesign, useEditorialQuoteDesigns } from '../experiences/abstract/components/Quote/editorialLiveDesign';
import { useQuotePartsDesign } from '../experiences/abstract/components/Quote/quotePartsLiveDesign';
import type { WallFeedItem } from '../helpers/wallFeedModel';
import { MasonryWall } from '../components/MasonryWall/MasonryWall';
import {
  type CardReveal,
} from '../experiences/abstract/components/AbstractJournalLabCollection';
import type { AbstractJournalLabFlipSlot } from '../experiences/abstract/components/AbstractJournalLabCollection/collectionLayout';
import { CTA_BUTTON_MOTION_EASINGS } from '../components/CtaButton/config/registered';
import { CoverFlow, type CoverFlowCardReveal } from '../experiences/abstract/components/CoverFlow/CoverFlow';
import {
  ACTIVATION_RAMP_REFERENCE_DURATION_MS,
  DEFAULT_COVER_FLOW_CONFIG,
  normalizeCoverFlowConfig,
  resolveCoverFlowStartIndex,
} from '../experiences/abstract/components/CoverFlow/CoverFlow.config';
import { COVER_FLOW_SCOPE_ID } from '../experiences/abstract/components/CoverFlow/CoverFlow.panel';
import {
  MobilePinnedArticleSection,
  type MobilePinnedCarouselControls,
} from '../experiences/abstract/components/MobilePinnedArticleSection/MobilePinnedArticleSection';
import {
  DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG,
  MOBILE_PINNED_ARTICLE_SECTION_EASINGS,
  MOBILE_PINNED_ARTICLE_SECTION_SCOPE_ID,
  normalizeMobilePinnedArticleSectionConfig,
} from '../experiences/abstract/components/MobilePinnedArticleSection/MobilePinnedArticleSection.config';
import {
  useArticleListCoverFlowSync,
  useCoverFlowEntranceGate,
} from '../experiences/abstract/components/ArticleListCoverFlowSync/useArticleListCoverFlowSync';
import {
  ABSTRACT_LEGACY_PALETTE_GUARD_FRAGMENT_SOURCE,
  PROCEDURAL_COLOR_FRAGMENT_SOURCE,
  PROCEDURAL_COLOR_VERTEX_SOURCE,
} from '../helpers/proceduralColorShader';
import { GLASS_BAND_GRADIENT_FRAGMENT_SOURCE } from '../helpers/glassBandGradientShader';
import {
  ATMOSPHERIC_ELLIPSE_FRAGMENT_SOURCE,
  ATMOSPHERIC_ELLIPSE_VERTEX_SOURCE,
} from '../helpers/atmosphericEllipseShader';
import { resolveProceduralColorResolution } from '../helpers/proceduralColorResolution';
import {
  getProceduralColorAtlasCellRect,
  getProceduralColorLayerVariations,
  type ProceduralColorAtlasLayout,
} from '../helpers/proceduralColorAtlas';
import {
  paintGradientGridFrame,
  resolveGradientGridAtlasPlan,
  type GradientGridFrame,
} from '../helpers/abstractHeroGridAtlas';
import {
  getProceduralColorStackLayerRowPixelBand,
  getProceduralColorStackLayerHeightRatio,
  remapProceduralColorTopRowY,
  resolveProceduralColorStackRow,
} from '../helpers/proceduralColorSnapshot';
import {
  AbstractLegacyPaletteEvaluator,
  smoothPaletteIntervention,
  type AbstractLegacyPaletteField,
  type AbstractLegacyPaletteLimits,
} from '../helpers/abstractLegacyPaletteController';
import {
  AbstractPaletteCadenceController,
  type AbstractPaletteCadenceSettings,
} from '../helpers/abstractPaletteCadence';
import {
  paintLegacyGradientHeadline,
  resolveLegacyHeadlineSourceRegion,
} from '../helpers/abstractLegacyHeadlineCompositor';
import { paintGradientTextureSurface } from '../helpers/gradientTextureSurface';
import { AbstractPostDock, DEFAULT_LIQUID_SLIDER_CONFIG } from '../experiences/abstract/components/AbstractPostDock';
import { AbstractMetalLabList } from '../experiences/abstract/components/AbstractMetalLabList';
import { AbstractJournalLabCollection, type ArticleMeshInput } from '../experiences/abstract/components/AbstractJournalLabCollection';
import {
  DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG,
  type AbstractJournalLabCollectionConfig,
} from '../experiences/abstract/components/AbstractJournalLabCollection/config/presentation';
import {
  ABSTRACT_JOURNAL_LAB_COLLECTION_SCOPE_ID,
} from '../experiences/abstract/components/AbstractJournalLabCollection/config/presentation.panel';
import {
  DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG,
  type AbstractJournalLabCollectionSliderConfig,
} from '../experiences/abstract/components/AbstractJournalLabCollection/config/slider';
import {
  ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_SCOPE_ID,
} from '../experiences/abstract/components/AbstractJournalLabCollection/config/slider.panel';
import {
  DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG,
  type AbstractMetalLabCardConfig,
} from '../experiences/abstract/components/AbstractMetalLabList.config';
import {
  ABSTRACT_METAL_LAB_CARD_SCOPE_ID,
} from '../experiences/abstract/components/AbstractMetalLabList.panel';
import { AbstractEditorialHero } from '../experiences/abstract/components/AbstractEditorialHero';
import { SiteHeader } from '../experiences/abstract/components/SiteHeader';
import { buildEffectiveSiteHeaderConfig } from '../experiences/abstract/components/SiteHeader/buildEffectiveSiteHeaderConfig';
import {
  DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG,
  normalizeAbstractEditorialHeroConfig,
  NARROW_COLUMN_ALIGN_TO_HERO_HORIZONTAL_PLACEMENT,
  NARROW_COLUMN_ALIGN_TO_HERO_HORIZONTAL_PLACEMENT_WIDE,
  NARROW_COLUMN_ALIGN_TO_HERO_HORIZONTAL_PLACEMENT_LG,
  type AbstractEditorialHeroConfig,
} from '../experiences/abstract/components/AbstractEditorialHero.config';
import { ABSTRACT_EDITORIAL_HERO_LAYOUT_SCOPE_ID } from '../experiences/abstract/components/AbstractEditorialHero.panel';
import {
  DEFAULT_SITE_HEADER_CONFIG,
  resolveSiteHeaderNavBandColorFilter,
  SPLIT_ALIGNED_NAV_CONTENT_GAP_PX,
  type SiteHeaderConfig,
} from '../experiences/abstract/components/SiteHeader/config/registered';
import {
  ABSTRACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG,
  normalizeSiteHeaderColorOverrideConfig,
  type SiteHeaderColorOverrideConfig,
} from '../experiences/abstract/components/SiteHeader/config/colorOverride';
import {
  DEFAULT_WORDMARK_CONFIG,
  normalizeWordmarkConfig,
  type WordmarkConfig,
} from '../experiences/abstract/components/SiteHeader/config/wordmark';
import { useNormalizedSiteHeaderConfig } from '../experiences/abstract/components/SiteHeader/hooks/useNormalizedSiteHeaderConfig';
import { ABSTRACT_SITE_HEADER_COLOR_OVERRIDE_PANEL } from '../experiences/abstract/components/SiteHeader/config/colorOverride.panel';
import { AbstractHeroGrid } from '../experiences/abstract/components/AbstractHeroGrid';
import {
  computeAbstractPostDockTopPeekPx,
  DEFAULT_ABSTRACT_POST_DOCK_GRADIENT_PERFORMANCE_CONFIG,
  DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG,
  DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG,
  DEFAULT_ABSTRACT_POST_DOCK_MESH_GEOMETRY_CONFIG,
  DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG,
  DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG,
  DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG,
  normalizeAbstractPostDockMeshGeometryConfig,
  type AbstractPostDockGradientPerformanceConfig,
  type AbstractPostDockHueInfluenceConfig,
  type AbstractPostDockIntroductionConfig,
  type AbstractPostDockMeshGeometryConfig,
  type AbstractPostDockPaletteConfig,
  type AbstractPostDockLayoutConfig,
  type AbstractPostDockHologramConfig,
} from '../experiences/abstract/components/AbstractPostDock/config/registered';
import {
  ABSTRACT_POST_DOCK_GRADIENT_PERFORMANCE_SCOPE_ID,
  ABSTRACT_POST_DOCK_HUE_INFLUENCE_SCOPE_ID,
  ABSTRACT_POST_DOCK_INTRODUCTION_SCOPE_ID,
  ABSTRACT_POST_DOCK_MESH_GEOMETRY_SCOPE_ID,
  ABSTRACT_POST_DOCK_PALETTE_SCOPE_ID,
  ABSTRACT_POST_DOCK_LAYOUT_SCOPE_ID,
  ABSTRACT_POST_DOCK_HOLOGRAM_SCOPE_ID,
} from '../experiences/abstract/components/AbstractPostDock/config/panel';
import {
  DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG,
  normalizeAbstractHeroCtaComposerConfig,
  type AbstractHeroCtaComposerConfig,
} from '../experiences/abstract/components/AbstractHeroCtaComposer/config/registered';
import { ABSTRACT_HERO_CTA_COMPOSER_ENTRANCE_SCOPE_ID } from '../experiences/abstract/components/AbstractHeroCtaComposer/config/panel';
import { abstractConfigPanelRegistry } from '../experiences/abstract/configPanels';
import {
  ABSTRACT_DESIGN_CONFIG_BINDING_KEYS_BY_PAGE,
  useAbstractDesignConfigBindings,
} from '../experiences/abstract/hooks/useAbstractDesignConfigBindings';
import {
  DEFAULT_ABSTRACT_LAB_SECTION_CONFIG,
  type AbstractLabSectionConfig,
} from '../experiences/abstract/LabSection.config';
import { ABSTRACT_LAB_SECTION_APPEARANCE_SCOPE_ID } from '../experiences/abstract/LabSection.panel';
import {
  DEFAULT_ABSTRACT_FOOTER_CONFIG,
  DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG,
  DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG,
  DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG,
  DEFAULT_ABSTRACT_TIMELINE_CONFIG,
  DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG,
  DEFAULT_ABSTRACT_MOBILE_ARTICLE_LIST_INK_CONFIG,
  DEFAULT_ABSTRACT_CARD_APPEARANCE_CONFIG,
  DEFAULT_ABSTRACT_COVER_FLOW_TIMELINE_SLOT_CONFIG,
  DEFAULT_ABSTRACT_TIMELINE_LINK_COLOR_CONFIG,
  applyAbstractPolymorphicLayoutAllSizesUpdate,
  normalizeAbstractNarrowColumnStackConfig,
  normalizeAbstractTimelineContentConfig,
  normalizeAbstractPageLayoutConfig,
  normalizeAbstractFooterConfig,
  normalizeAbstractMobileArticleListInkConfig,
  normalizeAbstractCoverFlowTimelineSlotConfig,
  normalizeAbstractTimelineLinkColorConfig,
  normalizeAbstractTimelineConfig,
  resolveAbstractPolymorphicLayoutConfigForDesktopMode,
  resolveAbstractTimelineConfigForDesktopMode,
  type AbstractNarrowColumnStackConfig,
  type AbstractNarrowColumnStackHorizontalAlign,
  type AbstractNarrowColumnStackVerticalAlign,
  type AbstractPageLayoutConfig,
  type AbstractTimelineContentConfig,
  type AbstractFooterConfig,
  type AbstractMobileArticleListInkConfig,
  type AbstractCoverFlowTimelineSlotConfig,
  type AbstractTimelineLinkColorConfig,
  type AbstractTimelineConfig,
} from './abstract.config';
import AbstractCoverFlowTimelineSlot from '../experiences/abstract/components/AbstractCoverFlowTimelineSlot';
import {
  normalizeAboutMobileAccordionConfig,
  type AboutMobileAccordionConfig,
} from '../experiences/about/components/AboutMobileAccordion.config';
import { AboutTimeline, type AboutTimelineRowData } from '../experiences/about/components/AboutTimeline';
import { ABSTRACT_TIMELINE_SCOPE_ID } from '../experiences/abstract/components/AbstractTimeline.panel';
import {
  normalizeCardAppearanceConfig,
  resolveUnifiedGradientInkEnabled,
  type CardAppearanceConfig,
} from '../experiences/abstract/components/Card/config/appearance';
import { Card } from '../experiences/abstract/components/Card/Card';
import { CARD_APPEARANCE_SCOPE_ID } from '../experiences/abstract/components/Card/config/appearance.panel';
import {
  ABSTRACT_NARROW_COLUMN_STACK_SCOPE_ID,
  ABSTRACT_FOOTER_SCOPE_ID,
  ABSTRACT_PAGE_LAYOUT_SCOPE_ID,
  ABSTRACT_POLYMORPHIC_LAYOUT_PANEL,
  ABSTRACT_TIMELINE_CONTENT_SCOPE_ID,
  ABSTRACT_HERO_ACCORDION_ITEM_SCOPE_ID,
  ABSTRACT_MOBILE_ARTICLE_LIST_INK_SCOPE_ID,
  ABSTRACT_COVER_FLOW_TIMELINE_SLOT_SCOPE_ID,
  ABSTRACT_TIMELINE_LINK_COLOR_SCOPE_ID,
} from './abstract.panel';
import { PolymorphicLayout, usePolymorphicLayoutColors } from '../experiences/abstract/components/PolymorphicLayout';
import {
  buildEnhancedScrollGradient,
  buildLegacyScrollGradient,
} from '../experiences/abstract/components/PolymorphicScrollGradientBackground';
import { generateHarmonicGradient } from '../helpers/harmonicGradient';
import {
  resolvePolymorphicNarrowColumnTypography,
  resolvePolymorphicColumnBackgroundReference,
  resolveGradientColumnTypography,
} from '../experiences/abstract/components/PolymorphicLayout.narrowColumnTypography';
import { SiteFooter } from '../experiences/abstract/components/SiteFooter/SiteFooter';
import {
  buildScrollAdaptiveInkColor,
} from '../experiences/abstract/components/useScrollAdaptiveInk';
import { usePolymorphicColumnAdaptiveInk } from '../experiences/abstract/components/usePolymorphicColumnAdaptiveInk';
import { useMeasuredElementRect } from '../components/useMeasuredElementRect';
import { useBreakpointTier } from '../components/useBreakpointTier';
import { tailwindSpacingTokenToPx } from '../components/tailwindSpacingScale';
import type { PolymorphicLayoutConfig } from '../experiences/abstract/components/PolymorphicLayout.config';
import { WALL_POLYMORPHIC_LAYOUT_CONFIG } from './wall.layoutConfig';
import { resolveSplitColumnAccent } from '../experiences/abstract/components/SplitColumnLayout/colorResolution';
import { narrowColumnFractionForTier } from '../experiences/abstract/components/SplitColumnLayout';
import { computeNavSplitBoundaryPx } from '../experiences/abstract/components/SplitColumnPageShell/hooks/useSplitColumnNavAlignment';
import {
  DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG,
  normalizeSplitColumnCardStackConfig,
} from '../experiences/abstract/components/SplitColumnCardPreview/config/stack';
import { SPLIT_COLUMN_CARD_STACK_SCOPE_ID } from '../experiences/abstract/components/SplitColumnCardPreview/config/stack.panel';
import type { AbstractPostDockItem } from '../experiences/abstract/helpers/abstractPostDockItems';
import {
  generateTwilightSkyGradient,
  recommendTwilightSkyInk,
  TWILIGHT_SKY_LUT_SIZE,
  type TwilightSkyGradient,
} from '../experiences/abstract/helpers/twilightSkyGradient';
import styles from './abstract.module.css';

const PRACTICE_QUOTE_PANEL = createEditorialQuotePanel('practice');

type GradientProgram = {
  program: WebGLProgram;
  vertexBuffer: WebGLBuffer;
  vertexPositionAttribute: number;
  uTime: WebGLUniformLocation | null;
  uResolution: WebGLUniformLocation | null;
  uVariation: WebGLUniformLocation | null;
  uSaturation: WebGLUniformLocation | null;
  uBrightness: WebGLUniformLocation | null;
  uScale: WebGLUniformLocation | null;
  uSeed: WebGLUniformLocation | null;
  uRandomness: WebGLUniformLocation | null;
  uOffset: WebGLUniformLocation | null;
  uHueOffset: WebGLUniformLocation | null;
  uMorph: WebGLUniformLocation | null;
  uShimmer: WebGLUniformLocation | null;
  uPulse: WebGLUniformLocation | null;
};

type GlassGradientProgram = GradientProgram & {
  uGlassColorA: WebGLUniformLocation | null;
  uGlassColorB: WebGLUniformLocation | null;
  uGlassColorC: WebGLUniformLocation | null;
  uGlassColorD: WebGLUniformLocation | null;
  uGlassGradientAngle: WebGLUniformLocation | null;
};

type AbstractLegacyGradientProgram = GradientProgram & {
  uPaletteGuardAmount: WebGLUniformLocation | null;
  uPaletteGuardLayerPhase: WebGLUniformLocation | null;
  uPalettePhase: WebGLUniformLocation | null;
};

type FirstRowColorOverrides = {
  variation: number;
  saturation: number;
  brightness: number;
  hueOffset: number;
  morph: number;
  shimmer: number;
  pulse: number;
};

type AtmosphericGradientProgram = {
  program: WebGLProgram;
  vertexBuffer: WebGLBuffer;
  vertexPositionAttribute: number;
  uTime: WebGLUniformLocation | null;
  uResolution: WebGLUniformLocation | null;
  uPalette: WebGLUniformLocation | null;
  uCenter: WebGLUniformLocation | null;
  uRadius: WebGLUniformLocation | null;
  uDriftAmount: WebGLUniformLocation | null;
  uBreathAmount: WebGLUniformLocation | null;
  uTurbulence: WebGLUniformLocation | null;
  uSeed: WebGLUniformLocation | null;
  uDitherStrength: WebGLUniformLocation | null;
};

type DragState = {
  active: boolean;
  pointerId: number | null;
  x: number;
  y: number;
};

type GradientSnapshotFrame = {
  layerFaceIndices: number[];
  sourceWidth: number;
  sourceHeight: number;
  atlasCellCount: number;
  overlayFaceCount: number;
  capturedAt: number;
};

type GradientViewportPixelSize = {
  width: number;
  height: number;
};

type HeroInkTone = 'light' | 'dark';

type AdaptiveHeroInkTones = {
  header: HeroInkTone;
  content: HeroInkTone;
  actions: HeroInkTone;
};

// A11Y — same role="tabpanel"/aria-controls pairing pages/about.tsx's own
// ABOUT_TIMELINE_PANEL_ID establishes for AboutTimeline's tablist: the id of
// the single region (here, CoverFlow's own wideColumn) this page's timeline
// rows control.
const ABSTRACT_TIMELINE_PANEL_ID = 'abstract-timeline-panel';

const NARROW_STACK_HORIZONTAL_CLASS: Record<AbstractNarrowColumnStackHorizontalAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};
const NARROW_STACK_VERTICAL_CLASS: Record<AbstractNarrowColumnStackVerticalAlign, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
};

type AbstractNarrowColumnStackProps = {
  config: AbstractNarrowColumnStackConfig;
  top: ReactNode;
  bottom: ReactNode;
  isTablet: boolean;
};

/** Page-endemic narrow-column composition. PolymorphicLayout owns the
 * available-height box; this component only partitions the slot it receives. */
function AbstractNarrowColumnStack({
  config,
  top,
  bottom,
  isTablet,
}: AbstractNarrowColumnStackProps) {
  if (!bottom) {
    return <div className="w-full min-w-0">{top}</div>;
  }
  const region = (
    position: 'top' | 'bottom',
    content: ReactNode,
    horizontalAlign: AbstractNarrowColumnStackHorizontalAlign,
    verticalAlign: AbstractNarrowColumnStackVerticalAlign,
  ) => (
    <div
      className={`flex min-h-0 min-w-0 flex-col ${NARROW_STACK_HORIZONTAL_CLASS[horizontalAlign]} ${NARROW_STACK_VERTICAL_CLASS[verticalAlign]}`}
      data-abstract-narrow-stack-region={position}
      style={{
        gridRow: config.invertOrder
          ? (position === 'top' ? 2 : 1)
          : (position === 'top' ? 1 : 2),
      }}
    >
      <div className={horizontalAlign === 'stretch' ? 'w-full min-w-0' : 'min-w-0 max-w-full'}>
        {content}
      </div>
    </div>
  );

  if (isTablet && config.tabletFlow === 'horizontal') {
    const tabletRegion = (
      position: 'top' | 'bottom',
      content: ReactNode,
      verticalAlign: AbstractNarrowColumnStackVerticalAlign,
    ) => (
      <div
        className={`flex min-w-0 flex-col ${NARROW_STACK_VERTICAL_CLASS[verticalAlign]}`}
        data-abstract-narrow-stack-region={position}
      >
        <div className="min-w-0 max-w-full">{content}</div>
      </div>
    );
    const hero = tabletRegion('top', top, config.tabletHeroVerticalAlign);
    const timeline = tabletRegion('bottom', bottom, config.tabletTimelineVerticalAlign);
    return (
      <div
        className={`grid min-h-0 w-full min-w-0 ${NARROW_STACK_HORIZONTAL_CLASS[config.tabletPairVerticalAlign]} gap-7`}
        data-abstract-narrow-stack="tablet-horizontal"
        style={{
          gridTemplateColumns: `minmax(0, ${config.tabletHeroWeight}fr) minmax(0, ${config.tabletTimelineWeight}fr)`,
        }}
      >
        {config.tabletRegionOrder === 'heroFirst' ? <>{hero}{timeline}</> : <>{timeline}{hero}</>}
      </div>
    );
  }

  return (
    <div
      // The enclosing NarrowColumnContent publishes its resolved viewport
      // slot (after live header clearance and column padding) as a custom
      // property. This grid must use that definite height: `fr` tracks only
      // partition a definite grid size, which is what gives each region its
      // own real vertical alignment space.
      className="grid h-full min-h-0 w-full min-w-0"
      data-abstract-narrow-stack="true"
      style={{
        height: 'var(--polymorphic-content-viewport-height, 100%)',
        gridTemplateRows: `minmax(min-content, ${config.topRegionPercent}fr) minmax(min-content, ${config.bottomRegionPercent}fr)`,
      }}
    >
      {region('top', top, config.topHorizontalAlign, config.topVerticalAlign)}
      {region('bottom', bottom, config.bottomHorizontalAlign, config.bottomVerticalAlign)}
    </div>
  );
}

// splitColumnLayoutConfig.colorSource === 'palette' — the same
// resolveSplitColumnAccent(index, count, paletteConfig) call /about's own
// leftPanelColor uses, against two distinct fixed indices instead of one so
// the wide/narrow columns land on two different, evenly-spaced points of
// the same ramp rather than an identical flat color on both.
const ABSTRACT_SPLIT_COLUMN_PALETTE_STOP_COUNT = 2;
const ABSTRACT_WIDE_COLUMN_PALETTE_INDEX = 0;
const ABSTRACT_NARROW_COLUMN_PALETTE_INDEX = 1;

// AbstractEditorialHero's own horizontalPlacement prop (a required,
// top-level prop as of PLAN-POLYMORPHIC-LAYOUT-CONTENT-CONTAINER-
// UNIFICATION.md — see that component's own doc comment) takes a
// NARROW_COLUMN_ALIGN_TO_HERO_HORIZONTAL_PLACEMENT/-WIDE/-LG: relocated to
// AbstractEditorialHero.config.ts (PLAN-EDITORIAL-HERO-UNIFICATION-AND-
// CARDSTACK-RESIZE-FIX.md Part 2) — see that file's own doc comment. This
// page's own `narrowColumnContentAlign*` mapping continues to resolve
// through the same imported tables below, unchanged behavior.

// AbstractEditorialHero's own headline/paragraph content — was hardcoded
// inside that component until it became a shared primitive across pages
// (Part 2 above); this page's own copy, byte-identical to what the
// component used to hardcode, so both existing instances below render
// exactly as before.
// About page's own emphasis markup convention (pages/about.tsx), reused
// verbatim — `**word**` runs render brighter via renderEmphasisText
// (helpers/textEmphasis.tsx). The name lives in the H1 above, so this
// paragraph opens on "A name" rather than re-stating "Abstract Voyage".
// "light and sound" is the same linking phrase the About page uses for the
// same relationship — deliberate repetition, preserved exactly. The closing
// phrase "The longer arc" links to /about via the shared [text](href)
// inline-link syntax. McKinsey and the AI/independence turn intentionally
// live only on /about now, not here.

const COVER_FLOW_DISABLED_REVEAL: CardReveal = {
  enabled: false,
  startMs: 0,
  durationMs: 0,
  easingCss: 'linear',
  offsetYPercent: 0,
};
// The normal card in the approved composition is 375px wide. Converting
// its established rem inset and 128px content band into cqw ratios makes
// those relationships invariant when CoverFlow's card-size control changes.
const COVER_FLOW_COMPOSITION_REFERENCE_WIDTH_PX = 375;
const COVER_FLOW_ROOT_REM_PX = 16;
const COVER_FLOW_CONTENT_BLOCK_HEIGHT = '34.1333cqw';
const COVER_FLOW_UNSTAGGERED_REVEAL_DELAYS_MS = {
  topic: 0,
  date: 0,
  readingTime: 0,
  title: 0,
  excerpt: 0,
  cta: 0,
};

const ABSTRACT_GRADIENT_SNAPSHOT_BLEND_MODE = 'overlay';
const ABSTRACT_GRADIENT_SNAPSHOT_OPACITY = 1;
const ABSTRACT_HERO_INK_SAMPLE_POINTS = [
  [0.08, 0.06],
  [0.92, 0.06],
  [0.08, 0.38],
  [0.18, 0.52],
  [0.18, 0.7],
] as const;
const ABSTRACT_HERO_HEADER_SAMPLE_POINTS = [
  { x: 0.08, y: 0.94 },
  { x: 0.5, y: 0.94 },
  { x: 0.92, y: 0.94 },
] as const;
const ABSTRACT_HERO_CONTENT_SAMPLE_POINTS = [
  { x: 0.06, y: 0.72 },
  { x: 0.18, y: 0.58 },
  { x: 0.34, y: 0.44 },
] as const;
const ABSTRACT_HERO_ACTION_SAMPLE_POINTS = [
  { x: 0.08, y: 0.26 },
  { x: 0.2, y: 0.26 },
  { x: 0.34, y: 0.26 },
] as const;
const ABSTRACT_SYNTH_LOGO_STOPS = buildSynthLogoStops();
const ABSTRACT_SYNTH_LOGO_DARK_STOPS = buildSynthLogoStops({
  lightnessRange: { min: 10, max: 24 },
  chromaRange: { min: 0, max: 12 },
});
// The outer collection container follows the same max-width and responsive
// inset contract as the above-the-fold editorial content. Card rows consume
// this content box; they never replace or shrink the page-level boundary.
const COLLECTION_CONTAINER_CLASSNAME = [
  'relative z-10',
  '[padding-left:calc(35px_+_env(safe-area-inset-left))]',
  '[padding-right:calc(24px_+_env(safe-area-inset-right))]',
  'sm:[padding-left:calc(24px_+_env(safe-area-inset-left))]',
  'sm:[padding-right:calc(24px_+_env(safe-area-inset-right))]',
  'md:[padding-left:calc(32px_+_env(safe-area-inset-left))]',
  'md:[padding-right:calc(32px_+_env(safe-area-inset-right))]',
  'lg:[padding-left:calc(48px_+_env(safe-area-inset-left))]',
  'lg:[padding-right:calc(48px_+_env(safe-area-inset-right))]',
].join(' ');
const ABSTRACT_POST_DOCK_NARROW_BREAKPOINT_PX = 1180;
const ABSTRACT_EDITORIAL_HERO_LAYOUT_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_EDITORIAL_HERO_LAYOUT_SCOPE_ID);
const SECTION_HEADING_APPEARANCE_DEFINITION =
  abstractConfigPanelRegistry.resolve(SECTION_HEADING_APPEARANCE_SCOPE_ID);
const ABSTRACT_HERO_CTA_COMPOSER_ENTRANCE_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_HERO_CTA_COMPOSER_ENTRANCE_SCOPE_ID);
const ABSTRACT_POST_DOCK_INTRODUCTION_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_POST_DOCK_INTRODUCTION_SCOPE_ID);
const ABSTRACT_POST_DOCK_GRADIENT_PERFORMANCE_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_POST_DOCK_GRADIENT_PERFORMANCE_SCOPE_ID);
const ABSTRACT_POST_DOCK_PALETTE_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_POST_DOCK_PALETTE_SCOPE_ID);
const ABSTRACT_POST_DOCK_MESH_GEOMETRY_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_POST_DOCK_MESH_GEOMETRY_SCOPE_ID);
const ABSTRACT_POST_DOCK_HUE_INFLUENCE_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_POST_DOCK_HUE_INFLUENCE_SCOPE_ID);
const ABSTRACT_POST_DOCK_LAYOUT_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_POST_DOCK_LAYOUT_SCOPE_ID);
const ABSTRACT_POST_DOCK_HOLOGRAM_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_POST_DOCK_HOLOGRAM_SCOPE_ID);
const ABSTRACT_JOURNAL_LAB_COLLECTION_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_JOURNAL_LAB_COLLECTION_SCOPE_ID);
const ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_SCOPE_ID);
const ABSTRACT_METAL_LAB_CARD_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_METAL_LAB_CARD_SCOPE_ID);
const ABSTRACT_LAB_SECTION_APPEARANCE_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_LAB_SECTION_APPEARANCE_SCOPE_ID);
const ABSTRACT_PAGE_LAYOUT_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_PAGE_LAYOUT_SCOPE_ID);
const ABSTRACT_NARROW_COLUMN_STACK_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_NARROW_COLUMN_STACK_SCOPE_ID);
const ABSTRACT_COVER_FLOW_TIMELINE_SLOT_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_COVER_FLOW_TIMELINE_SLOT_SCOPE_ID);
const ABSTRACT_TIMELINE_LINK_COLOR_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_TIMELINE_LINK_COLOR_SCOPE_ID);
const COVER_FLOW_DEFINITION =
  abstractConfigPanelRegistry.resolve(COVER_FLOW_SCOPE_ID);
const SPLIT_COLUMN_CARD_STACK_DEFINITION =
  abstractConfigPanelRegistry.resolve(SPLIT_COLUMN_CARD_STACK_SCOPE_ID);
const ABSTRACT_TIMELINE_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_TIMELINE_SCOPE_ID);
const CARD_APPEARANCE_DEFINITION =
  abstractConfigPanelRegistry.resolve(CARD_APPEARANCE_SCOPE_ID);
const ABSTRACT_HERO_ACCORDION_ITEM_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_HERO_ACCORDION_ITEM_SCOPE_ID);

// This page's own baseline for LiquidSliderConfig — not the component's
// shared DEFAULT_LIQUID_SLIDER_CONFIG (pages/slider.tsx and pages/about.tsx
// also consume that default and must stay untouched). Narrow/touch
// viewports in the JOURNAL dock below should never cast the active-card
// drop shadow.
const JOURNAL_DOCK_SLIDER_CONFIG = {
  ...DEFAULT_LIQUID_SLIDER_CONFIG,
  dockShadowDisableOnNarrow: true,
};

// CoverFlow keeps the established card-treatment baseline without mounting
// or exposing the retired CardStack itself.

/**
 * Black-over-color compositing (what PolymorphicScrollGradientBackground's
 * own darken overlay visually does) is just per-channel scaling — black
 * contributes nothing. Page-local rather than importing
 * AbstractEditorialHero.tsx's own private, unexported equivalent — same
 * one-line math, no cross-component dependency. See
 * PLAN-MOBILE-ARTICLE-LIST-SCROLL-CONTRAST.md.
 */
function scaleColorTowardBlack(hex: string, darken: number): string {
  const { r, g, b } = colord(hex).toRgb();
  const scale = 1 - Math.min(1, Math.max(0, darken));
  return colord({ r: r * scale, g: g * scale, b: b * scale }).toHex();
}

// Same "decide light vs dark by background luminance, binary-search
// lightness for the passing candidate closest to that side's own boundary"
// structure as helpers/surfaceColorDerivation.ts's own (unexported)
// resolveStableContrastAwareTextColor — but seeded from a FIXED, config-
// supplied hue/saturation (the mobile article list's own single shared
// ink, AbstractMobileArticleListInkConfig) rather than deriving h/s from
// the background itself, and bounded to [minLightness, 100 - minDarkness]
// instead of the full [0, 100] range — see that config type's own doc
// comment (pages/abstract.config.ts) for why. Page-local rather than
// widening the shared helper for a single caller's own bespoke bounds.
function resolveMobileArticleListInkColor(
  backgroundColor: string,
  ink: AbstractMobileArticleListInkConfig,
): string {
  const floor = Math.min(ink.minLightness, 100 - ink.minDarkness);
  const ceiling = Math.max(ink.minLightness, 100 - ink.minDarkness);
  const colorAt = (lightness: number) => colord({ h: ink.hue, s: ink.saturation, l: lightness }).toHex();
  const contrastAt = (lightness: number) => colord(colorAt(lightness)).contrast(backgroundColor);
  const preferLight = colord(backgroundColor).luminance() < 0.2;
  const endpoint = preferLight ? ceiling : floor;
  const otherEndpoint = preferLight ? floor : ceiling;
  if (contrastAt(endpoint) < ink.minContrastRatio) {
    // Even the most extreme allowed lightness can't clear the target —
    // best-effort fallback, matching every other contrast resolver in this
    // codebase: return whichever of the two bounds contrasts better rather
    // than silently returning an under-contrast color.
    return contrastAt(endpoint) >= contrastAt(otherEndpoint) ? colorAt(endpoint) : colorAt(otherEndpoint);
  }
  let passing = endpoint;
  let failing = otherEndpoint;
  for (let index = 0; index < 20; index += 1) {
    const candidate = (passing + failing) / 2;
    if (contrastAt(candidate) >= ink.minContrastRatio) passing = candidate; else failing = candidate;
  }
  return colorAt(passing);
}

/**
 * Keeps the configured card width as the column-count target, then lets the
 * cards flex just enough for every complete row to occupy the page content
 * width exactly. This prevents a second, narrower centered layout from
 * forming inside the above-the-fold container.
 */
function resolveCollectionCardWidthPx(
  contentWidthPx: number,
  containerWidthPx: number,
  enforceScatteredCardBounds: boolean,
  layoutConfig: Pick<
    AbstractPostDockLayoutConfig,
    'cardWidthPx' | 'columnGapPx'
  >,
) {
  const preferredCardWidthPx = clamp(layoutConfig.cardWidthPx, 160, 480);
  const columnGapPx = Math.max(0, layoutConfig.columnGapPx);
  let columnCount = Math.max(
    1,
    Math.floor(
      (containerWidthPx + columnGapPx) /
      (preferredCardWidthPx + columnGapPx),
    ),
  );

  // Column count follows the unpadded page container, preserving the original
  // responsive breakpoints. Card width then flexes inside the editorial
  // content edges. Only the wide scattered renderer enforces its 480px cap;
  // narrow dock cards intentionally consume the complete content width.
  while (columnCount > 0) {
    const resolvedCardWidthPx =
      (contentWidthPx - (columnCount - 1) * columnGapPx) / columnCount;
    const nextColumnWidthPx =
      (contentWidthPx - columnCount * columnGapPx) / (columnCount + 1);

    if (
      !enforceScatteredCardBounds ||
      resolvedCardWidthPx <= 480 ||
      nextColumnWidthPx < 160
    ) {
      return Math.max(1, resolvedCardWidthPx);
    }

    columnCount += 1;
  }

  return contentWidthPx;
}
function getGradientFaceCount(config: GradientDesignerConfig) {
  return Math.round(clamp(config.gradientFaceCount, 1, 16));
}

function getGradientLayerCount(overlayFaceCount: number) {
  return overlayFaceCount + 1;
}

function resolveAdaptiveHeroInkTone(
  current: HeroInkTone,
  lightness: number,
  brightThreshold: number,
  darkThreshold: number,
): HeroInkTone {
  if (current === 'light' && lightness >= brightThreshold) return 'dark';
  if (current === 'dark' && lightness <= darkThreshold) return 'light';
  return current;
}

function createWebGlShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);

  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createGradientProgram(
  gl: WebGLRenderingContext,
  fragmentSource = PROCEDURAL_COLOR_FRAGMENT_SOURCE,
): GradientProgram | null {
  const vertexShader = createWebGlShader(gl, gl.VERTEX_SHADER, PROCEDURAL_COLOR_VERTEX_SOURCE);
  const fragmentShader = createWebGlShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  const vertexBuffer = gl.createBuffer();

  if (!program || !vertexBuffer) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1,
    ]),
    gl.STATIC_DRAW,
  );

  return {
    program,
    vertexBuffer,
    vertexPositionAttribute: gl.getAttribLocation(program, 'aVertexPosition'),
    uTime: gl.getUniformLocation(program, 'uTime'),
    uResolution: gl.getUniformLocation(program, 'uResolution'),
    uVariation: gl.getUniformLocation(program, 'uVariation'),
    uSaturation: gl.getUniformLocation(program, 'uSaturation'),
    uBrightness: gl.getUniformLocation(program, 'uBrightness'),
    uScale: gl.getUniformLocation(program, 'uScale'),
    uSeed: gl.getUniformLocation(program, 'uSeed'),
    uRandomness: gl.getUniformLocation(program, 'uRandomness'),
    uOffset: gl.getUniformLocation(program, 'uOffset'),
    uHueOffset: gl.getUniformLocation(program, 'uHueOffset'),
    uMorph: gl.getUniformLocation(program, 'uMorph'),
    uShimmer: gl.getUniformLocation(program, 'uShimmer'),
    uPulse: gl.getUniformLocation(program, 'uPulse'),
  };
}

function createGlassGradientProgram(gl: WebGLRenderingContext): GlassGradientProgram | null {
  const gradientProgram = createGradientProgram(gl, GLASS_BAND_GRADIENT_FRAGMENT_SOURCE);
  if (!gradientProgram) return null;

  return {
    ...gradientProgram,
    uGlassColorA: gl.getUniformLocation(gradientProgram.program, 'uGlassColorA'),
    uGlassColorB: gl.getUniformLocation(gradientProgram.program, 'uGlassColorB'),
    uGlassColorC: gl.getUniformLocation(gradientProgram.program, 'uGlassColorC'),
    uGlassColorD: gl.getUniformLocation(gradientProgram.program, 'uGlassColorD'),
    uGlassGradientAngle: gl.getUniformLocation(gradientProgram.program, 'uGlassGradientAngle'),
  };
}

function createAbstractLegacyGradientProgram(
  gl: WebGLRenderingContext,
): AbstractLegacyGradientProgram | null {
  const gradientProgram = createGradientProgram(
    gl,
    ABSTRACT_LEGACY_PALETTE_GUARD_FRAGMENT_SOURCE,
  );
  if (!gradientProgram) return null;

  return {
    ...gradientProgram,
    uPaletteGuardAmount: gl.getUniformLocation(
      gradientProgram.program,
      'uPaletteGuardAmount',
    ),
    uPaletteGuardLayerPhase: gl.getUniformLocation(
      gradientProgram.program,
      'uPaletteGuardLayerPhase',
    ),
    uPalettePhase: gl.getUniformLocation(
      gradientProgram.program,
      'uPalettePhase',
    ),
  };
}

function createAtmosphericGradientProgram(gl: WebGLRenderingContext): AtmosphericGradientProgram | null {
  const vertexShader = createWebGlShader(gl, gl.VERTEX_SHADER, ATMOSPHERIC_ELLIPSE_VERTEX_SOURCE);
  const fragmentShader = createWebGlShader(gl, gl.FRAGMENT_SHADER, ATMOSPHERIC_ELLIPSE_FRAGMENT_SOURCE);

  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  const vertexBuffer = gl.createBuffer();

  if (!program || !vertexBuffer) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );

  return {
    program,
    vertexBuffer,
    vertexPositionAttribute: gl.getAttribLocation(program, 'aVertexPosition'),
    uTime: gl.getUniformLocation(program, 'uTime'),
    uResolution: gl.getUniformLocation(program, 'uResolution'),
    uPalette: gl.getUniformLocation(program, 'uPalette'),
    uCenter: gl.getUniformLocation(program, 'uCenter'),
    uRadius: gl.getUniformLocation(program, 'uRadius'),
    uDriftAmount: gl.getUniformLocation(program, 'uDriftAmount'),
    uBreathAmount: gl.getUniformLocation(program, 'uBreathAmount'),
    uTurbulence: gl.getUniformLocation(program, 'uTurbulence'),
    uSeed: gl.getUniformLocation(program, 'uSeed'),
    uDitherStrength: gl.getUniformLocation(program, 'uDitherStrength'),
  };
}

function uploadTwilightPalette(
  gl: WebGLRenderingContext,
  texture: WebGLTexture,
  gradient: TwilightSkyGradient,
) {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    TWILIGHT_SKY_LUT_SIZE,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    gradient.lut,
  );
}

function applyGradientUniforms({
  gl,
  gradientProgram,
  config,
  width,
  height,
  shaderTime,
  variation,
  offset,
  colorOverrides,
}: {
  gl: WebGLRenderingContext;
  gradientProgram: GradientProgram;
  config: GradientDesignerConfig;
  width: number;
  height: number;
  shaderTime: number;
  variation: number;
  offset?: { x: number; y: number };
  colorOverrides?: FirstRowColorOverrides;
}) {
  gl.uniform1f(gradientProgram.uTime, shaderTime);
  gl.uniform2f(gradientProgram.uResolution, width, height);
  gl.uniform1f(gradientProgram.uVariation, variation);
  gl.uniform1f(
    gradientProgram.uSaturation,
    colorOverrides?.saturation ?? clamp(config.shaderColorSaturation, 0, 2.5),
  );
  gl.uniform1f(
    gradientProgram.uBrightness,
    colorOverrides?.brightness ?? clamp(config.shaderColorBrightness, 0.4, 1.6),
  );
  gl.uniform1f(gradientProgram.uScale, clamp(config.shaderColorScale, 0.5, 4) * clamp(config.viewZoom, 0.25, 8));
  gl.uniform1f(gradientProgram.uSeed, config.seed * 1000);
  gl.uniform1f(gradientProgram.uRandomness, clamp(config.shaderColorRandomness, 0, 1));
  gl.uniform2f(
    gradientProgram.uOffset,
    offset?.x ?? config.viewOffsetX,
    offset?.y ?? config.viewOffsetY,
  );
  gl.uniform1f(
    gradientProgram.uHueOffset,
    colorOverrides?.hueOffset ?? clamp(config.shaderColorHueOffset, -0.36, 0.36),
  );
  gl.uniform1f(
    gradientProgram.uMorph,
    colorOverrides?.morph ?? clamp(config.shaderColorMorph, 0, 1.45),
  );
  gl.uniform1f(
    gradientProgram.uShimmer,
    colorOverrides?.shimmer ?? clamp(config.shaderColorShimmer, 0, 1.5),
  );
  gl.uniform1f(
    gradientProgram.uPulse,
    colorOverrides?.pulse ?? clamp(config.shaderColorPulse, 0, 1.5),
  );
}

function getFirstRowColorOverrides(
  config: GradientDesignerConfig,
): FirstRowColorOverrides | undefined {
  if (!config.firstRowColorOverrideEnabled) return undefined;

  return {
    variation: clamp(config.firstRowColorVariation, 0, 0.4),
    saturation: clamp(config.firstRowColorSaturation, 0, 2.5),
    brightness: clamp(config.firstRowColorBrightness, 0.4, 1.6),
    hueOffset: clamp(config.firstRowColorHueOffset, -0.36, 0.36),
    morph: clamp(config.firstRowColorMorph, 0, 1.45),
    shimmer: clamp(config.firstRowColorShimmer, 0, 1.5),
    pulse: clamp(config.firstRowColorPulse, 0, 1.5),
  };
}

function applyAbstractLegacyPaletteGuardUniforms(
  gl: WebGLRenderingContext,
  gradientProgram: AbstractLegacyGradientProgram,
  amount: number,
  normalizedLayer: number,
  palettePhase: number,
) {
  gl.uniform1f(
    gradientProgram.uPaletteGuardAmount,
    clamp(amount, 0, 1),
  );
  gl.uniform1f(
    gradientProgram.uPaletteGuardLayerPhase,
    clamp(normalizedLayer, -0.5, 0.5) * clamp(amount, 0, 1) * 0.18,
  );
  gl.uniform1f(gradientProgram.uPalettePhase, palettePhase);
}

function getAbstractLegacyPaletteField(
  config: GradientDesignerConfig,
  palettePhase: number,
  overlayFaceCount: number,
  colorOverrides?: FirstRowColorOverrides,
): AbstractLegacyPaletteField {
  return {
    variation: colorOverrides?.variation ?? clamp(config.shaderColorVariation, 0, 0.4),
    saturation: colorOverrides?.saturation ?? clamp(config.shaderColorSaturation, 0, 2.5),
    brightness: colorOverrides?.brightness ?? clamp(config.shaderColorBrightness, 0.4, 1.6),
    scale: clamp(config.shaderColorScale, 0.5, 4) * clamp(config.viewZoom, 0.25, 8),
    seed: config.seed * 1000,
    randomness: clamp(config.shaderColorRandomness, 0, 1),
    offsetX: config.viewOffsetX,
    offsetY: config.viewOffsetY,
    hueOffset: colorOverrides?.hueOffset ?? clamp(config.shaderColorHueOffset, -0.36, 0.36),
    palettePhase,
    morph: colorOverrides?.morph ?? clamp(config.shaderColorMorph, 0, 1.45),
    shimmer: colorOverrides?.shimmer ?? clamp(config.shaderColorShimmer, 0, 1.5),
    pulse: colorOverrides?.pulse ?? clamp(config.shaderColorPulse, 0, 1.5),
    overlayFaceCount,
  };
}

function getAbstractPaletteCadenceSettings(
  config: GradientDesignerConfig,
  motionAllowed: boolean,
): AbstractPaletteCadenceSettings {
  return {
    enabled: config.legacyPaletteCadenceEnabled && motionAllowed,
    distribution: config.legacyPaletteCadenceDistribution,
    easing: config.legacyPaletteCadenceEasing,
    initialDelayMs: config.legacyPaletteCadenceInitialDelayMs,
    dwellMinMs: config.legacyPaletteCadenceDwellMinMs,
    dwellMaxMs: config.legacyPaletteCadenceDwellMaxMs,
    transitionDurationMs: config.legacyPaletteCadenceTransitionDurationMs,
    paletteTravel: config.legacyPaletteCadenceTravel,
    distributionWidth: config.legacyPaletteCadenceDistributionWidth,
    invertedCenterVelocity: config.legacyPaletteCadenceInvertedCenterVelocity,
    seed: config.seed,
  };
}

function getAbstractLegacyPaletteLimits(
  config: GradientDesignerConfig,
): AbstractLegacyPaletteLimits {
  return {
    maximumYellowCoverage: clamp(config.legacyPaletteMaximumYellowCoverage, 0.25, 0.85),
    minimumCounterpointCoverage: clamp(
      config.legacyPaletteMinimumCounterpointCoverage,
      0.04,
      0.4,
    ),
    minimumHueDiversity: clamp(config.legacyPaletteMinimumHueDiversity, 0.04, 0.5),
    minimumChroma: clamp(config.legacyPaletteMinimumChroma, 0.02, 0.18),
    maximumIntervention: clamp(config.legacyPaletteMaximumIntervention, 0.2, 1),
  };
}

function renderLegacyGradientAtlasFrame({
  atlasCanvas,
  capturedAt,
  config,
  gl,
  overlayFaceCount,
  paletteIntervention,
  palettePhase,
  program,
  shaderTime,
  sourceHeight,
  sourceWidth,
}: {
  atlasCanvas: HTMLCanvasElement;
  capturedAt: number;
  config: GradientDesignerConfig;
  gl: WebGLRenderingContext;
  overlayFaceCount: number;
  paletteIntervention: number;
  palettePhase: number;
  program: AbstractLegacyGradientProgram;
  shaderTime: number;
  sourceHeight: number;
  sourceWidth: number;
}): GradientSnapshotFrame {
  const layerCount = getGradientLayerCount(overlayFaceCount);
  const atlasWidth = sourceWidth;
  const atlasHeight = sourceHeight * layerCount;

  if (atlasCanvas.width !== atlasWidth) atlasCanvas.width = atlasWidth;
  if (atlasCanvas.height !== atlasHeight) atlasCanvas.height = atlasHeight;

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program.program);
  gl.bindBuffer(gl.ARRAY_BUFFER, program.vertexBuffer);
  gl.enableVertexAttribArray(program.vertexPositionAttribute);
  gl.vertexAttribPointer(program.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

  const layerVariations = getProceduralColorLayerVariations({
    faceCount: layerCount,
    shaderColorVariation: clamp(config.shaderColorVariation, 0, 0.4),
    audioVariation: 0,
    shaderParameterPhase: shaderTime,
    compositionInfluence: 1,
  });
  const firstRowColorOverrides = getFirstRowColorOverrides(config);
  const firstRowLayerVariations = firstRowColorOverrides
    ? getProceduralColorLayerVariations({
      faceCount: layerCount,
      shaderColorVariation: firstRowColorOverrides.variation,
      audioVariation: 0,
      shaderParameterPhase: shaderTime,
      compositionInfluence: 1,
    })
    : null;
  const firstRowSourceRow = config.heroLayoutMode === 'editorial'
    ? config.editorialSourceRow
    : 1;

  for (let faceIndex = 0; faceIndex < layerCount; faceIndex += 1) {
    const faceViewportY = atlasHeight - (faceIndex + 1) * sourceHeight;
    const firstRowPixelBand = firstRowColorOverrides
      ? getProceduralColorStackLayerRowPixelBand({
        sourceRow: firstRowSourceRow,
        overlayFaceCount,
        layerIndex: faceIndex,
        pixelHeight: sourceHeight,
      })
      : null;
    gl.viewport(0, faceViewportY, sourceWidth, sourceHeight);
    applyGradientUniforms({
      gl,
      gradientProgram: program,
      config,
      width: sourceWidth,
      height: sourceHeight,
      shaderTime,
      variation: layerVariations[faceIndex] ?? 0,
    });
    const normalizedLayer = layerCount > 1
      ? faceIndex / (layerCount - 1) - 0.5
      : 0;
    applyAbstractLegacyPaletteGuardUniforms(
      gl,
      program,
      paletteIntervention,
      normalizedLayer,
      palettePhase,
    );
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (firstRowColorOverrides && firstRowLayerVariations && firstRowPixelBand) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(
        0,
        faceViewportY + firstRowPixelBand.sourceY,
        sourceWidth,
        firstRowPixelBand.sourceHeight,
      );
      applyGradientUniforms({
        gl,
        gradientProgram: program,
        config,
        width: sourceWidth,
        height: sourceHeight,
        shaderTime,
        variation: firstRowLayerVariations[faceIndex] ?? 0,
        colorOverrides: firstRowColorOverrides,
      });
      applyAbstractLegacyPaletteGuardUniforms(
        gl,
        program,
        paletteIntervention,
        normalizedLayer,
        palettePhase,
      );
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disable(gl.SCISSOR_TEST);
    }
  }
  gl.flush();

  return {
    layerFaceIndices: Array.from({ length: layerCount }, (_, faceIndex) => faceIndex),
    sourceWidth,
    sourceHeight,
    atlasCellCount: layerCount,
    overlayFaceCount,
    capturedAt,
  };
}

type LegacyGradientRuntime = {
  cadence: AbstractPaletteCadenceController;
  evaluator: AbstractLegacyPaletteEvaluator;
  intervention: number;
  lastConfig: GradientDesignerConfig | null;
  nextEvaluationAt: number;
  paletteTarget: number;
  settings: AbstractPaletteCadenceSettings;
  shaderTime: number;
};

function createLegacyGradientRuntime(
  config: GradientDesignerConfig,
  motionAllowed: boolean,
): LegacyGradientRuntime {
  return {
    cadence: new AbstractPaletteCadenceController(),
    evaluator: new AbstractLegacyPaletteEvaluator(),
    intervention: 0,
    lastConfig: null,
    nextEvaluationAt: 0,
    paletteTarget: 0,
    settings: getAbstractPaletteCadenceSettings(config, motionAllowed),
    shaderTime: 0,
  };
}

function advanceLegacyGradientRuntime({
  canAdvance,
  canStartTransition,
  config,
  dt,
  motionAllowed,
  now,
  overlayFaceCount,
  runtime,
}: {
  canAdvance: boolean;
  canStartTransition: boolean;
  config: GradientDesignerConfig;
  dt: number;
  motionAllowed: boolean;
  now: number;
  overlayFaceCount: number;
  runtime: LegacyGradientRuntime;
}) {
  if (runtime.lastConfig !== config) {
    runtime.lastConfig = config;
    runtime.settings = getAbstractPaletteCadenceSettings(config, motionAllowed);
    runtime.nextEvaluationAt = 0;
  }

  const structuralSpeed = runtime.settings.enabled
    ? clamp(config.legacyPaletteCadenceIdleSpeed, 0, 0.4)
    : clamp(config.shaderColorSpeed, 0, 3);
  runtime.shaderTime += dt * structuralSpeed;
  const palettePhase = runtime.cadence.advance(
    canAdvance ? dt * 1000 : 0,
    runtime.settings,
    canStartTransition,
  );

  let emergencyCorrection = false;
  if (!config.legacyPaletteGuardEnabled) {
    runtime.paletteTarget = 0;
  } else if (canAdvance && now >= runtime.nextEvaluationAt) {
    const lookAheadSeconds = clamp(config.legacyPaletteLookAheadMs, 0, 2000) / 1000;
    const paletteLimits = getAbstractLegacyPaletteLimits(config);
    const paletteResolution = runtime.evaluator.resolve(
      getAbstractLegacyPaletteField(config, palettePhase, overlayFaceCount),
      runtime.shaderTime,
      runtime.shaderTime + lookAheadSeconds * structuralSpeed,
      paletteLimits,
      getAbstractLegacyPaletteField(
        config,
        runtime.cadence.project(
          lookAheadSeconds * 1000,
          runtime.settings,
          canStartTransition,
        ),
        overlayFaceCount,
      ),
    );
    runtime.paletteTarget = paletteResolution.amount;
    emergencyCorrection = paletteResolution.current.yellowCoverage >
      paletteLimits.maximumYellowCoverage;
    if (emergencyCorrection) runtime.intervention = runtime.paletteTarget;
    runtime.nextEvaluationAt = now + (runtime.paletteTarget > 0 ? 120 : 360);
  }

  if (!emergencyCorrection) {
    runtime.intervention = smoothPaletteIntervention(
      runtime.intervention,
      runtime.paletteTarget,
      dt,
      clamp(config.legacyPaletteAttackMs, 100, 1500),
      clamp(config.legacyPaletteReleaseMs, 300, 3000),
    );
  }

  return palettePhase;
}

function parseGlassColor(value: string): [number, number, number] {
  const normalized = value.trim().replace(/^#/, '');
  const expanded = normalized.length === 3
    ? normalized.split('').map(channel => `${channel}${channel}`).join('')
    : normalized;
  const numeric = /^[0-9a-f]{6}$/i.test(expanded) ? Number.parseInt(expanded, 16) : 0;

  return [
    ((numeric >> 16) & 255) / 255,
    ((numeric >> 8) & 255) / 255,
    (numeric & 255) / 255,
  ];
}

function applyGlassPaletteUniforms(
  gl: WebGLRenderingContext,
  gradientProgram: GlassGradientProgram,
  config: GradientDesignerConfig,
) {
  const colorA = parseGlassColor(config.glassGradientColorA);
  const colorB = parseGlassColor(config.glassGradientColorB);
  const colorC = parseGlassColor(config.glassGradientColorC);
  const colorD = parseGlassColor(config.glassGradientColorD);
  gl.uniform3f(gradientProgram.uGlassColorA, ...colorA);
  gl.uniform3f(gradientProgram.uGlassColorB, ...colorB);
  gl.uniform3f(gradientProgram.uGlassColorC, ...colorC);
  gl.uniform3f(gradientProgram.uGlassColorD, ...colorD);
  gl.uniform1f(
    gradientProgram.uGlassGradientAngle,
    clamp(config.glassGradientAngleDeg, -180, 180) * Math.PI / 180,
  );
}

function applyAtmosphericGradientUniforms({
  gl,
  gradientProgram,
  config,
  width,
  height,
  shaderTime,
}: {
  gl: WebGLRenderingContext;
  gradientProgram: AtmosphericGradientProgram;
  config: GradientDesignerConfig;
  width: number;
  height: number;
  shaderTime: number;
}) {
  gl.uniform1f(gradientProgram.uTime, shaderTime);
  gl.uniform2f(gradientProgram.uResolution, width, height);
  gl.uniform1i(gradientProgram.uPalette, 0);
  gl.uniform2f(
    gradientProgram.uCenter,
    clamp(config.skyOriginXPercent, -20, 40) / 100,
    clamp(config.skyOriginYPercent, -20, 40) / 100,
  );
  gl.uniform2f(
    gradientProgram.uRadius,
    clamp(config.skyRadiusXPercent, 40, 180) / 100,
    clamp(config.skyRadiusYPercent, 40, 180) / 100,
  );
  gl.uniform1f(gradientProgram.uDriftAmount, clamp(config.skyDriftAmount, 0, 0.06));
  gl.uniform1f(gradientProgram.uBreathAmount, clamp(config.skyBreathAmount, 0, 0.06));
  gl.uniform1f(gradientProgram.uTurbulence, clamp(config.skyTurbulence, 0, 0.08));
  gl.uniform1f(gradientProgram.uSeed, config.seed * 1000);
  gl.uniform1f(gradientProgram.uDitherStrength, clamp(config.skyDitherStrength, 0, 2));
}

function resolveCanvasBufferSize(canvas: HTMLCanvasElement, configuredResolution: number) {
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, Math.round(rect.width || window.innerWidth || 1));
  const cssHeight = Math.max(1, Math.round(rect.height || window.innerHeight || 1));
  const resolved = resolveProceduralColorResolution({
    configuredResolution,
    viewportWidth: cssWidth,
    viewportHeight: cssHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    visualSizeVmin: 100,
    faceReach: 1,
  });
  const bufferScale = resolved.resolution / Math.max(1, Math.min(cssWidth, cssHeight));

  return {
    width: Math.max(1, Math.round(cssWidth * bufferScale)),
    height: Math.max(1, Math.round(cssHeight * bufferScale)),
  };
}

function clearGradientSnapshotLayers(layerCanvases: Array<HTMLCanvasElement | null>) {
  layerCanvases.forEach(layerCanvas => {
    const layerContext = layerCanvas?.getContext('2d');
    if (!layerCanvas || !layerContext) return;
    layerContext.clearRect(0, 0, layerCanvas.width, layerCanvas.height);
  });
}

function paintGradientSnapshotFrame({
  layerCanvases,
  frame,
  atlasCanvas,
  frozenLayerSources = null,
  pixelSize,
}: {
  layerCanvases: Array<HTMLCanvasElement | null>;
  frame: GradientSnapshotFrame | null;
  atlasCanvas: HTMLCanvasElement | null;
  frozenLayerSources?: HTMLCanvasElement[] | null;
  pixelSize: GradientViewportPixelSize;
}) {
  const safePixelWidth = Math.max(1, Math.round(pixelSize.width));
  const safePixelHeight = Math.max(1, Math.round(pixelSize.height));

  if (!frame || (!atlasCanvas && !frozenLayerSources)) {
    clearGradientSnapshotLayers(layerCanvases);
    return;
  }

  frame.layerFaceIndices.forEach((faceIndex, layerIndex) => {
    const layerCanvas = layerCanvases[layerIndex];
    const layerContext = layerCanvas?.getContext('2d');
    const layerHeightRatio = getProceduralColorStackLayerHeightRatio(layerIndex, frame.overlayFaceCount);
    const layerWidth = safePixelWidth;
    const layerHeight = Math.max(1, Math.round(safePixelHeight * layerHeightRatio));
    const frozenSource = frozenLayerSources?.[layerIndex] ?? null;

    if (!layerCanvas || !layerContext) return;

    if (layerCanvas.width !== layerWidth) layerCanvas.width = layerWidth;
    if (layerCanvas.height !== layerHeight) layerCanvas.height = layerHeight;

    layerContext.clearRect(0, 0, layerWidth, layerHeight);
    layerContext.imageSmoothingEnabled = true;
    layerContext.imageSmoothingQuality = 'high';

    if (frozenSource) {
      layerContext.drawImage(
        frozenSource,
        0,
        0,
        frozenSource.width,
        frozenSource.height,
        0,
        0,
        layerWidth,
        layerHeight,
      );
      return;
    }

    if (!atlasCanvas) return;

    const sourceIndex = ((faceIndex % frame.atlasCellCount) + frame.atlasCellCount) % frame.atlasCellCount;
    const sourceY = sourceIndex * frame.sourceHeight;

    layerContext.drawImage(
      atlasCanvas,
      0,
      sourceY,
      frame.sourceWidth,
      frame.sourceHeight,
      0,
      0,
      layerWidth,
      layerHeight,
    );
  });

  for (let layerIndex = frame.layerFaceIndices.length; layerIndex < layerCanvases.length; layerIndex += 1) {
    const layerCanvas = layerCanvases[layerIndex];
    const layerContext = layerCanvas?.getContext('2d');
    if (!layerCanvas || !layerContext) continue;
    layerContext.clearRect(0, 0, layerCanvas.width, layerCanvas.height);
  }
}

function paintLegacyCompositeFrame({
  layerCanvases,
  pixelSize,
  targetCanvas,
}: {
  layerCanvases: Array<HTMLCanvasElement | null>;
  pixelSize: GradientViewportPixelSize;
  targetCanvas: HTMLCanvasElement | null;
}) {
  if (!targetCanvas) return false;
  const width = Math.max(1, Math.round(pixelSize.width));
  const height = Math.max(1, Math.round(pixelSize.height));
  if (targetCanvas.width !== width) targetCanvas.width = width;
  if (targetCanvas.height !== height) targetCanvas.height = height;

  const context = targetCanvas.getContext('2d');
  if (!context) return false;
  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  let paintedLayers = 0;
  layerCanvases.forEach(layerCanvas => {
    if (!layerCanvas || layerCanvas.width <= 0 || layerCanvas.height <= 0) return;
    context.globalCompositeOperation = paintedLayers === 0 ? 'source-over' : 'overlay';
    context.drawImage(
      layerCanvas,
      0,
      Math.max(0, height - layerCanvas.height),
      width,
      layerCanvas.height,
    );
    paintedLayers += 1;
  });
  context.globalCompositeOperation = 'source-over';
  return paintedLayers > 0;
}

/**
 * True on devices with a precise, hover-capable pointer (mouse/trackpad) —
 * false for touch/coarse-pointer devices. Local copy of
 * SplitColumnCardPreview/hooks/useHasHoverPointer.ts's own matchMedia-
 * listener shape (this repo's convention — see that hook's own doc comment —
 * is to copy this small pattern into the feature that needs it, not a
 * cross-feature import). Threaded into <Card>'s own hasHoverPointer prop
 * (renderCoverFlowItem below) so CoverFlow's card gets the same touch
 * device-capability gate on its useCardLiftPhysics hover/press physics that
 * ABSTRACT-08 already gave AbstractJournalLabCollection's stack branch (via
 * CardStack.tsx) — CoverFlow renders through the OTHER ("flat") branch,
 * which that fix's own doc comment (AbstractJournalLabCollection.tsx)
 * explicitly notes was left with no hasHoverPointer source at all, so a tap
 * or drag on a touch device still drove the same live pointermove-fed
 * scale-up a real mouse hover would (operator-reported: the card visibly
 * scales up briefly on tap/drag on touch devices).
 */
function useHasHoverPointer(): boolean {
  const [hasHoverPointer, setHasHoverPointer] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const handleChange = () => setHasHoverPointer(mediaQuery.matches);
    handleChange();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);
  // The document owns the first-frame CSS gap filler. Release that marker as
  // soon as the client breakpoint measurement exists so the live, configured
  // gradient is never covered by the bootstrap twin after layout readiness.
  const { viewportWidthPx: abstractViewportWidthPx } = useBreakpointTier();
  useEffect(() => {
    if (abstractViewportWidthPx === undefined) return;
    document.documentElement.removeAttribute('data-abstract-gap');
    document.documentElement.removeAttribute('data-abstract-gap-tier');
  }, [abstractViewportWidthPx]);

  return hasHoverPointer;
}

type AbstractPageProps = {
  dockItems?: AbstractPostDockItem[];
  wallFeed: WallFeedItem[];
  wallMaxColumnWidthPx: number;
  practicesContent: WallBannerContent;
  labs: LabSummary[];
  footerConfigOverrides: FooterConfigOverrides;
  pageContent: AbstractPageContent;
  siteContent: SiteContent;
};

function WallCardSize({
  aspectRatio,
  children,
}: {
  aspectRatio: number;
  children: (width: number, height: number) => ReactNode;
}) {
  const { ref, rect } = useMeasuredElementRect<HTMLDivElement>();
  return (
    <div ref={ref} className="relative w-full" style={{ aspectRatio: `1 / ${aspectRatio}` }}>
      {rect?.width ? children(rect.width, rect.width * aspectRatio) : null}
    </div>
  );
}

const WALL_MIN_ITEM_WIDTH_PX = 345;
// A 768px tablet has 608px inside the wall gutters. With its 40px gap,
// two 284px tracks fit; keep that layout instead of falling to one column.
const WALL_MIN_TABLET_ITEM_WIDTH_PX = 280;
const WALL_SINGLE_COLUMN_MAX_WIDTH_PX = 520;

function wallColumnCount(availableWidthPx: number | undefined, gapPx: number, maximum: number, minimumItemWidthPx = WALL_MIN_ITEM_WIDTH_PX): number {
  if (availableWidthPx === undefined) return 1;
  const fit = Math.floor((availableWidthPx + gapPx) / (minimumItemWidthPx + gapPx));
  return Math.max(1, Math.min(maximum, fit));
}

function shallowNumberRecordsEqual(a: Record<number, number>, b: Record<number, number>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(key => a[Number(key)] === b[Number(key)]);
}

function wallCssLengthPx(value: string): number {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return 0;
  if (!value.endsWith('rem')) return amount;
  const rootSize = typeof document === 'undefined'
    ? 16 : Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return amount * rootSize;
}

type WallConfig = {
  gapBase: TailwindTokenValue<'gap'>;
  gapMd: TailwindTokenValue<'gap', 'md'>;
  gapLg: TailwindTokenValue<'gap', 'lg'>;
  colorRhythmEnabled: boolean;
  quoteGapEnabled: boolean;
  quoteGapMediumMinLines: number;
  quoteGapLongMinLines: number;
  quoteGapMediumBasePx: number;
  quoteGapLongBasePx: number;
  quoteGapMediumMdPx: number;
  quoteGapLongMdPx: number;
  quoteGapMediumLgPx: number;
  quoteGapLongLgPx: number;
  /** Cap each masonry track, including quotes and article cards. */
  maxColumnWidthPx: number;
  /** Article cap selected from the actual rendered masonry column count. */
  cardMaxWidthColumns1Px: number;
  cardMaxWidthColumns2Px: number;
  cardMaxWidthColumns3Px: number;
  cardMaxWidthColumns4Px: number;
  tiltEnabled: boolean;
  tiltXEnabled: boolean;
  tiltYEnabled: boolean;
  tiltMaxDegrees: number;
  tiltPerspectivePx: number;
  tiltResponseMs: number;
  /** Duration/easing for the one-shot return-to-rest tween fired once the
   * pointer actually leaves (or motion is otherwise interrupted — scroll,
   * blur, reduced-motion). Distinct from tiltResponseMs above, which only
   * smooths live pointer tracking while the pointer is still present — this
   * pair is tuned independently so the release can read as a slower, heavier
   * "expensive" settle rather than reusing the snappier tracking response. */
  tiltReleaseDurationMs: number;
  tiltReleaseEasing: CtaButtonMotionEasing;
  /** A rectangle the size of the fixed header (see
   * headerOverlayPaddingYPx below for how its height extends past that),
   * sitting behind it with backdrop-filter: blur() -- genuinely blurring
   * whatever is actually composited there (the real page background, or
   * the wall cards once scrolled past the hero), not a re-rendered copy of
   * it. It has nothing meaningful to sit "under" once the
   * header leaves fixed positioning (headerIsStatic tiers). */
  headerOverlayEnabled: boolean;
  /** Extra block space added to the header overlay beyond the <header>
   * element's own measured height -- padding-top + padding-bottom around
   * that measured rectangle, not a fixed/replacement height. The overlay
   * still starts at the true viewport top (nothing to extend "up" into),
   * so in practice this reads as extra breathing room below the header's
   * own content, same as how a content box's own bottom padding reads once
   * its top is already pinned against its container's edge. */
  headerOverlayPaddingYPx: number;
  headerOverlayPaddingYPxMd: number;
  headerOverlayPaddingYPxLg: number;
  /** backdrop-filter: blur() radius for the header overlay above. Also
   * sizes the mask-image fade at the overlay's own bottom edge (see the
   * overlay's own render comment, pages/wall.tsx) -- 0 blur means 0
   * feather, an intentionally crisp edge. */
  headerOverlayBlurPx: number;
  headerOverlayBlurPxMd: number;
  headerOverlayBlurPxLg: number;
  /** Maximum masonry columns per breakpoint. The wall uses fewer when its
   * measured content width cannot fit the tier's minimum item width. */
  columnsBase: number;
  columnsMd: number;
  columnsLg: number;
  /** Top clearance for the wall, per breakpoint. This clears the fixed
   * header without adding the same large blank space after the final row. */
  paddingTopBase: TailwindTokenValue<'paddingTop'>;
  paddingTopMd: TailwindTokenValue<'paddingTop', 'md'>;
  paddingTopLg: TailwindTokenValue<'paddingTop', 'lg'>;
};

const DEFAULT_WALL_CONFIG: WallConfig = {
  gapBase: 'gap-10',
  gapMd: 'md:gap-10',
  gapLg: 'lg:gap-16',
  colorRhythmEnabled: true,
  quoteGapEnabled: true,
  quoteGapMediumMinLines: 4,
  quoteGapLongMinLines: 7,
  quoteGapMediumBasePx: 8,
  quoteGapLongBasePx: 16,
  quoteGapMediumMdPx: 16,
  quoteGapLongMdPx: 32,
  quoteGapMediumLgPx: 24,
  quoteGapLongLgPx: 48,
  maxColumnWidthPx: 370,
  cardMaxWidthColumns1Px: 310,
  cardMaxWidthColumns2Px: 350,
  cardMaxWidthColumns3Px: 520,
  cardMaxWidthColumns4Px: 520,
  tiltEnabled: false,
  tiltXEnabled: true,
  tiltYEnabled: true,
  tiltMaxDegrees: 1.25,
  tiltPerspectivePx: 4000,
  tiltResponseMs: 348,
  tiltReleaseDurationMs: 1200,
  tiltReleaseEasing: 'gaussian',
  headerOverlayEnabled: true,
  headerOverlayPaddingYPx: 70,
  headerOverlayPaddingYPxMd: 60,
  headerOverlayPaddingYPxLg: 88,
  headerOverlayBlurPx: 10,
  headerOverlayBlurPxMd: 22,
  headerOverlayBlurPxLg: 25,
  columnsBase: 1,
  columnsMd: 2,
  columnsLg: 4,
  paddingTopBase: 'pt-7',
  // The tablet header becomes fixed at 768px and ends around 144px from
  // the viewport top; 11rem leaves the same 32px clearance as desktop. This
  // is top-only so the wall can end flush with the closing banner below.
  paddingTopMd: 'md:pt-44',
  paddingTopLg: 'lg:pt-44',
};

// WIP UI/UX refinement: temporarily hide the CoverFlow carousel and the
// article Timeline (the "TOC") while the surrounding layout is reworked.
// Nothing is removed — every render path, hook, and config below stays
// intact; these two flags just gate whether the elements paint. Flip back
// to false to restore. HIDE_WALL_COVER_FLOW uses opacity:0 (plus
// pointer-events:none) on the wide column rather than visibility:hidden:
// the carousel paints its card gradients through <canvas> layers that set
// inline visibility:visible, which would override an inherited
// visibility:hidden and keep leaking through (verified live). opacity still
// leaves the box geometry measurable so coverFlowGeometryStable releases the
// page's layout gate (it reads that same anchor's rect). The Timeline is
// simply not mounted in its placements.
const HIDE_WALL_COVER_FLOW: boolean = true;
const HIDE_WALL_TABLE_OF_CONTENTS: boolean = true;
// When both visual children are hidden, the split layout would otherwise
// keep its full-viewport floor and leave an empty screen before the closing
// banner. Keep the header and wall in normal flow, but let this empty shell
// collapse until either child is restored.
const WALL_SPLIT_CONTENT_HIDDEN = HIDE_WALL_COVER_FLOW && HIDE_WALL_TABLE_OF_CONTENTS;

// The article wall is the first visual on this page. Keep the CoverFlow's
// optional motion-path diagnostic available in settings, but closed initially
// so its fixed overlay does not cover the wall.
const DEFAULT_WALL_COVER_FLOW_CONFIG = normalizeCoverFlowConfig({
  ...DEFAULT_COVER_FLOW_CONFIG,
  ovalGeometryPreviewEnabledLg: false,
});

// WALL_POLYMORPHIC_LAYOUT_CONFIG (static on mobile, fixed above it) lives in
// ./wall.layoutConfig -- extracted so pages/quote-lab.tsx can import that
// same literal config object (and therefore the same gradient recipe)
// without pulling this whole page module into its bundle.

const wallTailwindField = createTailwindFieldFactory<WallConfig>();

const WALL_TILT_RELEASE_EASINGS: ReadonlyArray<CtaButtonMotionEasing> = [
  'linear', 'standard', 'expressive', 'viscous', 'gentle', 'gaussian',
];

function normalizeWallConfig(value: Partial<WallConfig>): WallConfig {
  const quoteGapMediumMinLines = Math.round(clamp(value.quoteGapMediumMinLines ?? DEFAULT_WALL_CONFIG.quoteGapMediumMinLines, 2, 18));
  const quoteGapMediumBasePx = Math.round(clamp(value.quoteGapMediumBasePx ?? DEFAULT_WALL_CONFIG.quoteGapMediumBasePx, 0, 120));
  const quoteGapMediumMdPx = Math.round(clamp(value.quoteGapMediumMdPx ?? DEFAULT_WALL_CONFIG.quoteGapMediumMdPx, 0, 120));
  const quoteGapMediumLgPx = Math.round(clamp(value.quoteGapMediumLgPx ?? DEFAULT_WALL_CONFIG.quoteGapMediumLgPx, 0, 120));
  return {
    ...DEFAULT_WALL_CONFIG,
    ...value,
    gapBase: normalizeTailwindToken({ utility: 'gap', breakpoint: 'base', value: value.gapBase, fallback: DEFAULT_WALL_CONFIG.gapBase }),
    gapMd: normalizeTailwindToken({ utility: 'gap', breakpoint: 'md', value: value.gapMd, fallback: DEFAULT_WALL_CONFIG.gapMd }),
    gapLg: normalizeTailwindToken({ utility: 'gap', breakpoint: 'lg', value: value.gapLg, fallback: DEFAULT_WALL_CONFIG.gapLg }),
    colorRhythmEnabled: typeof value.colorRhythmEnabled === 'boolean'
      ? value.colorRhythmEnabled : DEFAULT_WALL_CONFIG.colorRhythmEnabled,
    quoteGapEnabled: typeof value.quoteGapEnabled === 'boolean' ? value.quoteGapEnabled : DEFAULT_WALL_CONFIG.quoteGapEnabled,
    quoteGapMediumMinLines,
    quoteGapLongMinLines: Math.max(quoteGapMediumMinLines + 1, Math.round(clamp(value.quoteGapLongMinLines ?? DEFAULT_WALL_CONFIG.quoteGapLongMinLines, 3, 24))),
    quoteGapMediumBasePx,
    quoteGapLongBasePx: Math.max(quoteGapMediumBasePx, Math.round(clamp(value.quoteGapLongBasePx ?? DEFAULT_WALL_CONFIG.quoteGapLongBasePx, 0, 120))),
    quoteGapMediumMdPx,
    quoteGapLongMdPx: Math.max(quoteGapMediumMdPx, Math.round(clamp(value.quoteGapLongMdPx ?? DEFAULT_WALL_CONFIG.quoteGapLongMdPx, 0, 120))),
    quoteGapMediumLgPx,
    quoteGapLongLgPx: Math.max(quoteGapMediumLgPx, Math.round(clamp(value.quoteGapLongLgPx ?? DEFAULT_WALL_CONFIG.quoteGapLongLgPx, 0, 120))),
    maxColumnWidthPx: Math.round(clamp(value.maxColumnWidthPx ?? DEFAULT_WALL_CONFIG.maxColumnWidthPx, 280, 800)),
    cardMaxWidthColumns1Px: clamp(value.cardMaxWidthColumns1Px ?? DEFAULT_WALL_CONFIG.cardMaxWidthColumns1Px, 240, WALL_SINGLE_COLUMN_MAX_WIDTH_PX),
    cardMaxWidthColumns2Px: clamp(value.cardMaxWidthColumns2Px ?? DEFAULT_WALL_CONFIG.cardMaxWidthColumns2Px, 240, WALL_SINGLE_COLUMN_MAX_WIDTH_PX),
    cardMaxWidthColumns3Px: clamp(value.cardMaxWidthColumns3Px ?? DEFAULT_WALL_CONFIG.cardMaxWidthColumns3Px, 240, WALL_SINGLE_COLUMN_MAX_WIDTH_PX),
    cardMaxWidthColumns4Px: clamp(value.cardMaxWidthColumns4Px ?? DEFAULT_WALL_CONFIG.cardMaxWidthColumns4Px, 240, WALL_SINGLE_COLUMN_MAX_WIDTH_PX),
    tiltMaxDegrees: clamp(value.tiltMaxDegrees ?? DEFAULT_WALL_CONFIG.tiltMaxDegrees, 0, 2),
    tiltPerspectivePx: clamp(value.tiltPerspectivePx ?? DEFAULT_WALL_CONFIG.tiltPerspectivePx, 1600, 4000),
    tiltResponseMs: clamp(value.tiltResponseMs ?? DEFAULT_WALL_CONFIG.tiltResponseMs, 16, 500),
    tiltReleaseDurationMs: clamp(value.tiltReleaseDurationMs ?? DEFAULT_WALL_CONFIG.tiltReleaseDurationMs, 0, 3000),
    tiltReleaseEasing: WALL_TILT_RELEASE_EASINGS.includes(value.tiltReleaseEasing as CtaButtonMotionEasing)
      ? (value.tiltReleaseEasing as CtaButtonMotionEasing)
      : DEFAULT_WALL_CONFIG.tiltReleaseEasing,
    headerOverlayEnabled: typeof value.headerOverlayEnabled === 'boolean'
      ? value.headerOverlayEnabled : DEFAULT_WALL_CONFIG.headerOverlayEnabled,
    headerOverlayPaddingYPx: clamp(value.headerOverlayPaddingYPx ?? DEFAULT_WALL_CONFIG.headerOverlayPaddingYPx, 0, 200),
    headerOverlayPaddingYPxMd: clamp(value.headerOverlayPaddingYPxMd ?? DEFAULT_WALL_CONFIG.headerOverlayPaddingYPxMd, 0, 200),
    headerOverlayPaddingYPxLg: clamp(value.headerOverlayPaddingYPxLg ?? DEFAULT_WALL_CONFIG.headerOverlayPaddingYPxLg, 0, 200),
    headerOverlayBlurPx: clamp(value.headerOverlayBlurPx ?? DEFAULT_WALL_CONFIG.headerOverlayBlurPx, 0, 64),
    headerOverlayBlurPxMd: clamp(value.headerOverlayBlurPxMd ?? DEFAULT_WALL_CONFIG.headerOverlayBlurPxMd, 0, 64),
    headerOverlayBlurPxLg: clamp(value.headerOverlayBlurPxLg ?? DEFAULT_WALL_CONFIG.headerOverlayBlurPxLg, 0, 64),
    columnsBase: Math.round(clamp(value.columnsBase ?? DEFAULT_WALL_CONFIG.columnsBase, 1, 6)),
    columnsMd: Math.round(clamp(value.columnsMd ?? DEFAULT_WALL_CONFIG.columnsMd, 1, 6)),
    columnsLg: Math.round(clamp(value.columnsLg ?? DEFAULT_WALL_CONFIG.columnsLg, 1, 6)),
    paddingTopBase: normalizeTailwindToken({ utility: 'paddingTop', breakpoint: 'base', value: value.paddingTopBase, fallback: DEFAULT_WALL_CONFIG.paddingTopBase }),
    paddingTopMd: normalizeTailwindToken({ utility: 'paddingTop', breakpoint: 'md', value: value.paddingTopMd, fallback: DEFAULT_WALL_CONFIG.paddingTopMd }),
    paddingTopLg: normalizeTailwindToken({ utility: 'paddingTop', breakpoint: 'lg', value: value.paddingTopLg, fallback: DEFAULT_WALL_CONFIG.paddingTopLg }),
  };
}

const WALL_PANEL = defineConfigScope<WallConfig>({
  id: 'Wall/masonry',
  component: 'MasonryWall',
  scope: 'appearance',
  title: 'Masonry wall',
  createdAt: '2026-10-10',
  summary: 'Responsive spacing, optional color rhythm, column and card width caps, and whole-wall pointer tilt',
  defaultOpen: false,
  defaultValue: DEFAULT_WALL_CONFIG,
  fields: [
    wallTailwindField('gap', { key: 'gapBase', label: 'Mobile item gap', description: 'Space between items at mobile widths.' }),
    wallTailwindField('gap', { key: 'gapMd', label: 'Tablet item gap', breakpoint: 'md', description: 'Space between items at tablet widths.' }),
    wallTailwindField('gap', { key: 'gapLg', label: 'Desktop item gap', breakpoint: 'lg', description: 'Space between items at desktop widths.' }),
    { kind: 'boolean', key: 'colorRhythmEnabled', label: 'Separate colorful cards', description: 'Reorders nearby undated quotes to reduce colorful cards directly above or beside one another. Keeps published articles in order.' },
    {
      kind: 'group', label: 'Quote breathing room', fields: [
        { kind: 'boolean', key: 'quoteGapEnabled', label: 'Add space after dense quotes', description: 'Adds space beyond the shared item gap, based on the quote’s rendered line count.' },
        { kind: 'number', key: 'quoteGapMediumMinLines', label: 'Medium starts at', description: 'Minimum rendered lines for the first spacing step.', min: 2, max: 18, step: 1, unit: 'lines', integer: true, visibleWhen: config => config.quoteGapEnabled },
        { kind: 'number', key: 'quoteGapLongMinLines', label: 'Long starts at', description: 'Minimum rendered lines for the larger spacing step; always above the medium threshold.', min: 3, max: 24, step: 1, unit: 'lines', integer: true, visibleWhen: config => config.quoteGapEnabled },
        { kind: 'number', key: 'quoteGapMediumBasePx', label: 'Mobile · medium extra', min: 0, max: 120, step: 4, unit: 'px', integer: true, visibleWhen: config => config.quoteGapEnabled },
        { kind: 'number', key: 'quoteGapLongBasePx', label: 'Mobile · long extra', min: 0, max: 120, step: 4, unit: 'px', integer: true, visibleWhen: config => config.quoteGapEnabled },
        { kind: 'number', key: 'quoteGapMediumMdPx', label: 'Tablet · medium extra', min: 0, max: 120, step: 4, unit: 'px', integer: true, visibleWhen: config => config.quoteGapEnabled },
        { kind: 'number', key: 'quoteGapLongMdPx', label: 'Tablet · long extra', min: 0, max: 120, step: 4, unit: 'px', integer: true, visibleWhen: config => config.quoteGapEnabled },
        { kind: 'number', key: 'quoteGapMediumLgPx', label: 'Desktop · medium extra', min: 0, max: 120, step: 4, unit: 'px', integer: true, visibleWhen: config => config.quoteGapEnabled },
        { kind: 'number', key: 'quoteGapLongLgPx', label: 'Desktop · long extra', min: 0, max: 120, step: 4, unit: 'px', integer: true, visibleWhen: config => config.quoteGapEnabled },
      ],
    },
    { kind: 'number', key: 'maxColumnWidthPx', label: 'Max column width', description: 'Caps each masonry column. The closing banner matches a featured quote column on mobile and the full grid width on tablet and desktop.', min: 280, max: 800, step: 5, unit: 'px', integer: true },
    { kind: 'number', key: 'cardMaxWidthColumns1Px', label: 'Max card width · 1 column', description: 'Article cards use this cap whenever the wall displays one column.', min: 240, max: WALL_SINGLE_COLUMN_MAX_WIDTH_PX, step: 5, unit: 'px', integer: true },
    { kind: 'number', key: 'cardMaxWidthColumns2Px', label: 'Max card width · 2 columns', description: 'Article cards use this cap whenever the wall displays two columns.', min: 240, max: WALL_SINGLE_COLUMN_MAX_WIDTH_PX, step: 5, unit: 'px', integer: true },
    { kind: 'number', key: 'cardMaxWidthColumns3Px', label: 'Max card width · 3 columns', description: 'Article cards use this cap whenever the wall displays three columns.', min: 240, max: WALL_SINGLE_COLUMN_MAX_WIDTH_PX, step: 5, unit: 'px', integer: true },
    { kind: 'number', key: 'cardMaxWidthColumns4Px', label: 'Max card width · 4 columns', description: 'Article cards use this cap whenever the wall displays four columns.', min: 240, max: WALL_SINGLE_COLUMN_MAX_WIDTH_PX, step: 5, unit: 'px', integer: true },
    { kind: 'boolean', key: 'tiltEnabled', label: 'Enable wall tilt', description: 'Available only to hover-capable fine pointers outside the mobile layout and reduced-motion mode.' },
    { kind: 'boolean', key: 'tiltXEnabled', label: 'Tilt on horizontal axis', visibleWhen: config => config.tiltEnabled },
    { kind: 'boolean', key: 'tiltYEnabled', label: 'Tilt on vertical axis', visibleWhen: config => config.tiltEnabled },
    { kind: 'number', key: 'tiltMaxDegrees', label: 'Maximum tilt', min: 0, max: 2, step: 0.25, unit: 'deg', visibleWhen: config => config.tiltEnabled },
    { kind: 'number', key: 'tiltPerspectivePx', label: 'Perspective depth', min: 1600, max: 4000, step: 100, unit: 'px', integer: true, visibleWhen: config => config.tiltEnabled },
    { kind: 'number', key: 'tiltResponseMs', label: 'Tilt response', min: 16, max: 500, step: 1, unit: 'ms', integer: true, visibleWhen: config => config.tiltEnabled },
    { kind: 'number', key: 'tiltReleaseDurationMs', label: 'Release duration', description: 'How long the wall takes to settle back to flat once the pointer leaves.', min: 0, max: 3000, step: 50, unit: 'ms', integer: true, visibleWhen: config => config.tiltEnabled },
    {
      kind: 'enum',
      key: 'tiltReleaseEasing',
      label: 'Release easing',
      visibleWhen: config => config.tiltEnabled,
      options: [
        { label: 'LINEAR', value: 'linear' },
        { label: 'STANDARD', value: 'standard' },
        { label: 'EXPRESSIVE', value: 'expressive' },
        { label: 'VISCOUS', value: 'viscous' },
        { label: 'GENTLE', value: 'gentle' },
        { label: 'GAUSSIAN', value: 'gaussian' },
      ],
    },
    { kind: 'boolean', key: 'headerOverlayEnabled', label: 'Header background crop', description: 'A rectangle the size of the fixed header, cropped from the real page background so the wordmark/nav read against the exact segment behind them.' },
    { kind: 'number', key: 'headerOverlayPaddingYPx', label: 'Mobile header backdrop padding', description: 'Extra space beyond the measured header height on mobile.', min: 0, max: 200, step: 2, unit: 'px', integer: true, visibleWhen: config => config.headerOverlayEnabled },
    { kind: 'number', key: 'headerOverlayBlurPx', label: 'Mobile header backdrop blur', min: 0, max: 64, step: 1, unit: 'px', integer: true, visibleWhen: config => config.headerOverlayEnabled },
    { kind: 'number', key: 'headerOverlayPaddingYPxMd', label: 'Tablet header backdrop padding', description: 'Extra space beyond the measured header height on tablet.', min: 0, max: 200, step: 2, unit: 'px', integer: true, visibleWhen: config => config.headerOverlayEnabled },
    { kind: 'number', key: 'headerOverlayBlurPxMd', label: 'Tablet header backdrop blur', min: 0, max: 64, step: 1, unit: 'px', integer: true, visibleWhen: config => config.headerOverlayEnabled },
    { kind: 'number', key: 'headerOverlayPaddingYPxLg', label: 'Desktop header backdrop padding', description: 'Extra space beyond the measured header height on desktop.', min: 0, max: 200, step: 2, unit: 'px', integer: true, visibleWhen: config => config.headerOverlayEnabled },
    { kind: 'number', key: 'headerOverlayBlurPxLg', label: 'Desktop header backdrop blur', min: 0, max: 64, step: 1, unit: 'px', integer: true, visibleWhen: config => config.headerOverlayEnabled },
    {
      kind: 'group', label: 'Columns', fields: [
        { kind: 'number', key: 'columnsBase', label: 'Max columns (mobile)', min: 1, max: 6, step: 1, integer: true },
        { kind: 'number', key: 'columnsMd', label: 'Max columns (tablet)', min: 1, max: 6, step: 1, integer: true },
        { kind: 'number', key: 'columnsLg', label: 'Max columns (desktop)', min: 1, max: 6, step: 1, integer: true },
      ],
    },
    {
      kind: 'group', label: 'Wall top spacing', fields: [
        wallTailwindField('paddingTop', { key: 'paddingTopBase', label: 'Top padding (mobile)' }),
        wallTailwindField('paddingTop', { key: 'paddingTopMd', label: 'Top padding (tablet)', breakpoint: 'md' }),
        wallTailwindField('paddingTop', { key: 'paddingTopLg', label: 'Top padding (desktop)', breakpoint: 'lg' }),
      ],
    },
  ],
  copy: {
    targetFile: 'pages/wall.tsx',
    targetSymbol: 'DEFAULT_WALL_CONFIG',
    targetType: 'WallConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});

export async function getStaticProps() {
  const { loadAbstractPostDockItems } = await import('../experiences/abstract/helpers/loadAbstractPostDockItems.server');
  const { loadFooterConfigOverrides } = await import('../helpers/footerContent');
  const { loadAbstractPageContent, loadAboutPageContent, loadSiteContent } = await import('../helpers/content/pageContent.build');
  const { loadWallContent } = await import('../helpers/wallFeed.server');
  const dockItems = loadAbstractPostDockItems();
  const aboutPageContent = loadAboutPageContent();
  const labs = getLabSummaries();
  const footerConfigOverrides = loadFooterConfigOverrides();
  const wallContent = loadWallContent(dockItems, aboutPageContent);

  return {
    props: {
      dockItems,
      wallFeed: wallContent.wallFeed,
      wallMaxColumnWidthPx: wallContent.maxColumnWidthPx,
      practicesContent: wallContent.practices,
      labs,
      footerConfigOverrides,
      pageContent: loadAbstractPageContent(),
      siteContent: loadSiteContent(),
    },
  };
}

export default function AbstractPage({ dockItems, wallFeed, wallMaxColumnWidthPx, practicesContent, labs, footerConfigOverrides, pageContent, siteContent }: AbstractPageProps) {
  useEffect(() => {
    // Keep the document-level ABS-01 backdrop active for this route's whole
    // lifetime. Chrome can briefly expose the outgoing document's body while
    // a hard refresh waits for the next HTML response; removing this marker
    // immediately after mount restored the global near-black body underneath
    // the page and reproduced the exact black frame ABS-01 is meant to remove.
    // Cleanup on unmount prevents the route treatment leaking through SPA
    // navigation to another page.
    document.documentElement.setAttribute('data-abstract-boot', 'true');
    return () => {
      document.documentElement.removeAttribute('data-abstract-boot');
    };
  }, []);
  const [abstractTimelineContentConfig, setAbstractTimelineContentConfig] =
    useState<AbstractTimelineContentConfig>(() => (
      normalizeAbstractTimelineContentConfig(DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG)
    ));
  const [mobileArticleListInkConfig, setMobileArticleListInkConfig] =
    useState<AbstractMobileArticleListInkConfig>(() => (
      normalizeAbstractMobileArticleListInkConfig(DEFAULT_ABSTRACT_MOBILE_ARTICLE_LIST_INK_CONFIG)
    ));
  // Driven by MobilePinnedArticleSection's own onExpandedChange callback —
  // see scrollGradientForceMaxDarken's own doc comment at the
  // <PolymorphicLayout> call site below.
  const [isMobileArticleListExpanded, setIsMobileArticleListExpanded] = useState(false);
  // The masthead/welcome item is site introduction, not part of the
  // article index. CoverFlow and the narrow column's AboutTimeline share
  // this filtered sequence. `featured` is an opt-in editorial flag
  // (PostFrontmatter.featured, helpers/postContent.ts) — a post with no
  // `featured: true` in its own frontmatter never appears in this hero
  // rail, regardless of recency. The full "Journal & Labs" archive further
  // down this page renders `dockItems` directly and is deliberately
  // unaffected: `featured` only curates this hero spotlight, it doesn't
  // hide a post from the rest of the site.
  const carouselAndListItems = useMemo(() => {
    const sourceItems = (dockItems ?? []).filter(
      (item) => item.slug !== 'welcome' && item.featured === true,
    );
    const indexedItems = sourceItems.map((item, index) => ({ item, index }));
    const compare = (a: typeof indexedItems[number], b: typeof indexedItems[number]) => {
      if (abstractTimelineContentConfig.order === 'titleAsc') {
        return a.item.title.localeCompare(b.item.title) || a.index - b.index;
      }
      if (abstractTimelineContentConfig.order === 'titleDesc') {
        return b.item.title.localeCompare(a.item.title) || a.index - b.index;
      }
      const dateComparison = (a.item.publishedDate ?? '').localeCompare(b.item.publishedDate ?? '');
      if (dateComparison !== 0) {
        return abstractTimelineContentConfig.order === 'oldest' ? dateComparison : -dateComparison;
      }
      // The loader already supplies publication-descending items. This
      // fallback keeps hand-authored slides stable when no raw date exists.
      return abstractTimelineContentConfig.order === 'oldest'
        ? b.index - a.index
        : a.index - b.index;
    };
    return indexedItems
      .sort(compare)
      .slice(0, abstractTimelineContentConfig.visibleItemCount)
      .map(({ item }) => item);
  }, [abstractTimelineContentConfig, dockItems]);
  // AboutTimelineRowData mapping — carouselAndListItems is already exactly
  // SliderContentSlide-shaped (AbstractPostDockItem is a straight type
  // alias, helpers/abstractPostDockItems.ts), the same shape /about's own
  // aboutSlides is. For /abstract, the article topic is metadata rather
  // than a permanent supporting line: it only appears through
  // AboutTimeline's opt-in hover category reveal.
  // Also the mobile pinned section's own rows prop — same array, not a
  // mobile-specific copy, so the mobile list is the exact same timeline data
  // (including the category/appendix field) as the desktop instance below.
  const abstractTimelineRows = useMemo<ReadonlyArray<AboutTimelineRowData>>(
    () => carouselAndListItems.map((item, index) => ({
      caption: item.title,
      category: item.topic,
      slideIndex: index,
    })),
    [carouselAndListItems],
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshotAtlasRef = useRef<HTMLCanvasElement | null>(null);
  const gradientSnapshotLayerRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const legacyCompositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const headingGradientCompositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveHeadingGradientFrameRef = useRef<GradientSnapshotFrame | null>(null);
  const heroHeadlineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroHeadlineDebugCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroNavBandCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroHeadlineRef = useRef<HTMLHeadingElement | null>(null);
  const legacyGradientRenderScheduleRef = useRef<(() => void) | null>(null);
  const gradientGridCellCanvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const liveGradientGridFrameRef = useRef<GradientGridFrame | null>(null);
  const gradientViewportPixelSizeRef = useRef<GradientViewportPixelSize>({ width: 1, height: 1 });
  const liveGradientFrameRef = useRef<GradientSnapshotFrame | null>(null);
  const frozenGradientFrameRef = useRef<GradientSnapshotFrame | null>(null);
  const frozenGradientLayerSourcesRef = useRef<HTMLCanvasElement[] | null>(null);
  const gradientSnapshotFrozenRef = useRef(false);
  const configRef = useRef(DEFAULT_GRADIENT_DESIGNER_CONFIG);
  const headingGradientConfigRef = useRef(DEFAULT_GRADIENT_DESIGNER_CONFIG);
  const editorialHeroConfigRef = useRef<AbstractEditorialHeroConfig>({
    ...DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG,
  });
  const siteHeaderConfigRef = useRef<SiteHeaderConfig>({
    ...DEFAULT_SITE_HEADER_CONFIG,
  });
  const twilightGradientRef = useRef<TwilightSkyGradient | null>(null);
  const glassRenderScheduleRef = useRef<(() => void) | null>(null);
  const dragRef = useRef<DragState>({ active: false, pointerId: null, x: 0, y: 0 });
  // ABS-01: a mounted canvas is not necessarily a painted canvas. Keep the
  // deterministic CSS backdrop visible until the active GPU renderer has
  // completed its first draw, then progressively enhance it with the live
  // result. This is deliberately page-local client state: the Netlify
  // deployment currently relies on client rendering for this route.
  const [heroRendererReady, setHeroRendererReady] = useState(false);
  const markHeroRendererReady = useCallback(() => {
    setHeroRendererReady(true);
  }, []);
  const [config, setConfig] = useState<GradientDesignerConfig>(DEFAULT_GRADIENT_DESIGNER_CONFIG);
  const [headingGradientConfig, setHeadingGradientConfig] =
    useState<GradientDesignerConfig>(() => ({ ...DEFAULT_GRADIENT_DESIGNER_CONFIG }));
  const [gradientDesignerTarget, setGradientDesignerTarget] =
    useState<GradientDesignerTarget>('background');
  const [editorialHeroConfig, setEditorialHeroConfig] =
    useState<AbstractEditorialHeroConfig>(() => ({
      ...DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG,
    }));
  // The split-column branch keeps independent color/type state from the
  // classic branch because only one branch renders at a time and each can
  // be tuned without mutating the other. Structural layout is deliberately
  // not part of either hero state; PolymorphicLayout owns that concern.
  const [splitColumnHeroConfig, setSplitColumnHeroConfig] =
    useState<AbstractEditorialHeroConfig>(() => ({
      ...DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG,
      // /abstract's own divergence from the shared default: the paragraph
      // copy derives from the narrow column's own resolved background
      // (columnBackgroundColor, passed at this hero's own render call site
      // below) via resolveContrastAwareTextColor, instead of the shared
      // default's flat 'surface'-mode derivation — the WCAG-contrast-aware,
      // hue-preserving search this page's own screenshots asked for. Offset
      // 0 keeps the result purely contrast-driven; minContrast deliberately
      // remains owned by the authoritative component default so config
      // updates and reset stay in sync with the registered scope.
      paragraphTextColorMode: 'column',
      paragraphSurfaceOffset: 0,
      // This branch is the one PolymorphicLayout actually mounts inside the
      // scroll-gradient background (narrowColumn's own top slot below) — the
      // screenshot-reported illegible mid-scroll band lives here, not in the
      // classic/grid branch above. 3 is WCAG's "large text" floor. See
      // PLAN-HERO-SCROLL-CONTRAST-GUARANTEE.md.
      paragraphGradientScrollLightenTargetContrastRatio: 3,
    }));
  // Backs BOTH hero branches' own accordionItemPresentationEnabled opt-in
  // (AbstractEditorialHeroConfig) — one shared instance, not per-branch,
  // since the reused AboutMobileAccordionItem's own font-size/spacing/
  // open-indicator tuning is a single visual concern, independent of which
  // hero layout is currently active. Seeded from this page's OWN
  // page-owned default (DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG,
  // abstract.config.ts) — never /about's own DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG
  // directly — so a panel edit here never retunes /about's real mobile
  // accordion, and vice versa.
  const [heroAccordionItemConfig, setHeroAccordionItemConfig] =
    useState<AboutMobileAccordionConfig>(() => (
      normalizeAboutMobileAccordionConfig(DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG)
    ));
  // PLAN-HOMEPAGE-IA-LAYOUT.md 8.8 — presentationMode picks which of the
  // two fully-maintained render branches below actually mounts. Default
  // 'splitColumn' is what a real visitor sees; 'classic' is today's
  // shipped presentation, kept working as a live fallback, not deleted.
  const [abstractPageLayoutConfig, setAbstractPageLayoutConfig] =
    useState<AbstractPageLayoutConfig>(() => (
      normalizeAbstractPageLayoutConfig(DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG)
    ));
  const [abstractNarrowColumnStackConfig, setAbstractNarrowColumnStackConfig] =
    useState<AbstractNarrowColumnStackConfig>(() => (
      normalizeAbstractNarrowColumnStackConfig(DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG)
    ));
  const [abstractCoverFlowTimelineSlotConfig, setAbstractCoverFlowTimelineSlotConfig] =
    useState<AbstractCoverFlowTimelineSlotConfig>(() => (
      normalizeAbstractCoverFlowTimelineSlotConfig(DEFAULT_ABSTRACT_COVER_FLOW_TIMELINE_SLOT_CONFIG)
    ));
  const [abstractTimelineLinkColorConfig, setAbstractTimelineLinkColorConfig] =
    useState<AbstractTimelineLinkColorConfig>(() => (
      normalizeAbstractTimelineLinkColorConfig(DEFAULT_ABSTRACT_TIMELINE_LINK_COLOR_CONFIG)
    ));
  const [abstractFooterConfig, setAbstractFooterConfig] =
    useState<AbstractFooterConfig>(() => (
      normalizeAbstractFooterConfig({
        ...DEFAULT_ABSTRACT_FOOTER_CONFIG,
        ...footerConfigOverrides,
      })
    ));
  // The split-column branch consumes this complete config; the classic
  // fallback deliberately reads its narrow-column alignment triplet too,
  // so no second page or hero panel can become an alternate layout owner.
  // This page's own independently-authoritative config
  // (PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md) — ABSTRACT_POLYMORPHIC_
  // LAYOUT_CONFIG in pages/abstract.config.ts (PolymorphicLayoutConfig —
  // components/PolymorphicLayout.config.ts's own fully independent type,
  // same shared system /about and /posts-lab already run on). Supersedes
  // the former components/SplitColumnLayout.config.ts-based
  // ABSTRACT_SPLIT_COLUMN_LAYOUT_CONFIG (that scope's own panel is now
  // dead — this page edits these fields from ABSTRACT_POLYMORPHIC_LAYOUT_PANEL,
  // "Polymorphic Layout," instead; ABSTRACT_SPLIT_COLUMN_LAYOUT_CONFIG
  // itself stays as the one-time value source this config was copied from,
  // not a live import). Never a partial spread over some shared default —
  // that was exactly the fragility this replaced: 'right'/'float'/'custom'
  // etc. below used to be hand-applied overrides on top of a shared
  // constant that had already drifted once (to 'left') outside this page's
  // own edits, silently breaking /about too, since /about had no override
  // of its own to shield it. Each page now owns its own values outright, so
  // there's nothing left for either page to silently inherit from the
  // other.
  const [splitColumnLayoutConfig, setSplitColumnLayoutConfig] =
    useState<PolymorphicLayoutConfig>(() => (
      WALL_POLYMORPHIC_LAYOUT_CONFIG
    ));
  // A live measurement of the header's own real rendered height — not a
  // formula re-derived from its own height/paddingY/marginTop/marginBottom
  // config fields by hand, which would just be another instance of the
  // "two things that can silently drift" problem splitBandSide/
  // wideColumnSide already had (see SplitColumnPageShell's own doc
  // comment). Feeds both the header's own legibility scrim (which needs to
  // know its real height regardless) and, below, whichever column(s)
  // currently opt into splitColumnLayoutConfig's *ColumnHeaderBehavior:
  // 'pushDown' — SplitColumnPageShell already measures this same box
  // internally for its own per-column marginTop, but this page needs its
  // own copy too, for the card stack's headerOffsetPx (a fixed-position
  // layer SplitColumnPageShell's own margin mechanism can't reach — see
  // useCardStackLayout's own doc comment) and for
  // wideColumnRowMinHeightCss/narrowColumnRowMinHeightCss below.
  // Sourced from useMeasuredElementRect (PLAN-DEDUPLICATE-PAGE-SHELL-LOGIC.md
  // §1) — was a page-local hand-rolled ResizeObserver+resize effect before
  // that hook existed. extraDeps: [presentationMode] — this page's own real
  // variance among the four former copies, re-running the measurement when
  // presentationMode flips (that swaps which DOM subtree the ref points at
  // entirely, not just resizing something already mounted).
  const { ref: splitColumnHeaderWrapperRef, rect: splitColumnHeaderWrapperRect } =
    useMeasuredElementRect<HTMLDivElement>([abstractPageLayoutConfig.presentationMode]);
  const splitColumnHeaderHeightPx = splitColumnHeaderWrapperRect?.height;
  // Per-column: 'float' (this page's shipped default for both columns) is a
  // flat 100dvh, since the fixed header floats over the row rather than
  // sitting above it in flow — no header height to subtract. 'pushDown'
  // subtracts the header's own live-measured height instead, since
  // SplitColumnPageShell already shifted that column down by the same
  // amount via marginTop (see that file's own effectiveWideColumnStyle/
  // effectiveNarrowColumnStyle) — without the matching reduction here the
  // column's own box would extend that far past the viewport's bottom edge
  // instead of ending flush with it, the same "about.tsx's own
  // calc(100dvh - var(--about-nav-h))" pairing that page's CSS already does
  // for itself. Undefined splitColumnHeaderHeightPx (before first
  // measurement) falls back to the flat value rather than guessing.
  const wideColumnRowMinHeightCss = splitColumnLayoutConfig.wideColumnHeaderBehavior === 'pushDown'
    && splitColumnHeaderHeightPx !== undefined
    ? `calc(100dvh - ${splitColumnHeaderHeightPx}px)`
    : '100dvh';
  const narrowColumnRowMinHeightCss = splitColumnLayoutConfig.narrowColumnHeaderBehavior === 'pushDown'
    && splitColumnHeaderHeightPx !== undefined
    ? `calc(100dvh - ${splitColumnHeaderHeightPx}px)`
    : '100dvh';
  // CoverFlow reuses the established card treatment tokens, while the same
  // live Card stack scope also feeds its inactive-card presentation here.
  const [splitColumnCardStackConfig, setSplitColumnCardStackConfig] =
    useState(() => normalizeSplitColumnCardStackConfig(DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG));
  // BUGS-AUDIT-COVERFLOW-NEIGHBOR-COLOR.md (2026-09-03): the old shared
  // defaults (neighborFlatFillOpacity: 1, neighborFlatFillToneOffset: -0.45)
  // compounded to a flat fill that was reliably near-black regardless of the
  // configured neighbor background. DEFAULT_CARD_APPEARANCE_CONFIG has since
  // been retuned to a much lower opacity, so this page followed the shared
  // default directly for a long time — DEFAULT_ABSTRACT_CARD_APPEARANCE_CONFIG
  // (abstract.config.ts) is this page's first real divergence from it: see
  // that constant's own doc comment (PLAN-COVERFLOW-NEIGHBOR-COLOR-
  // TRANSITION-SYNC.md) for why its three appearance-duration fields need to
  // exceed CoverFlow's own gaussian settle ceiling.
  const [cardAppearanceConfig, setCardAppearanceConfig] =
    useState<CardAppearanceConfig>(() => normalizeCardAppearanceConfig(DEFAULT_ABSTRACT_CARD_APPEARANCE_CONFIG));
  const editorialQuoteDesigns = useEditorialQuoteDesigns();
  const bottomBannerQuoteDesign = useBottomBannerQuoteDesign();
  const quotePartsDesign = useQuotePartsDesign();
  // CoverFlow and the narrow column's AboutTimeline remain independently
  // tunable through their own live scopes. abstractTimelineConfig is its
  // own independent instance from /about's own aboutTimelineConfig. The
  // two pages now intentionally start from synchronized page-owned
  // defaults, while retaining room for per-page divergence such as marker
  // size. This page's panel edits never touch /about's state or vice
  // versa.
  const [coverFlowConfig, setCoverFlowConfig] =
    useState(() => DEFAULT_WALL_COVER_FLOW_CONFIG);
  const [mobilePinnedArticleSectionConfig, setMobilePinnedArticleSectionConfig] =
    useState(() => normalizeMobilePinnedArticleSectionConfig({
      ...DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG,
      // expandedForcesMaxBackgroundDarken assumes the background darkens on
      // expand, so the list ink is forced fully toward white to stay legible
      // over it (usePolymorphicColumnAdaptiveInk's forceProgress: 1, plus the
      // matching --mobile-article-list-darken force below). This page keeps
      // scroll darkening OFF at every tier (scrollGradientDarkenOnScrollEnabled
      // false, so scrollGradientResolved.maxDarken resolves to 0) — the
      // background stays light when expanded, so forcing the ink white leaves
      // near-white text on a light surface (operator-reported, screenshot: the
      // expanded mobile list rows). The adaptive-ink contrast guarantee can't
      // recover it either, since lightening never improves contrast against a
      // light background. Off here so the expanded list keeps its normal,
      // scroll-position-driven ink (dark on the light surface) — a page-local
      // override, not a change to the shared default other consumers read.
      expandedForcesMaxBackgroundDarken: false,
    }));
  const mobileHeroRowMinHeightCss =
    `calc(100svh - ${splitColumnHeaderHeightPx ?? 0}px - ${mobilePinnedArticleSectionConfig.peekHeightSvh}svh)`;
  const mobileCoverFlowConfig = useMemo(() => ({
    ...coverFlowConfig,
    enableScroll: false,
  }), [coverFlowConfig]);
  const [abstractTimelineConfig, setAbstractTimelineConfig] =
    useState<AbstractTimelineConfig>(() => normalizeAbstractTimelineConfig(DEFAULT_ABSTRACT_TIMELINE_CONFIG));
  // abstractTimelineConfig's own Lg fields are tuned for the CoverFlow-track
  // placement (abstractCoverFlowTimelineSlotConfig.enabledLg on) — the SAME
  // config also renders the classic narrow-column bottom placement when
  // that toggle is off, a different box with a different budget. Resolved
  // here (not by writing into abstractTimelineConfig itself), same
  // non-mutation reasoning as splitColumnLayoutConfigForDesktopMode further
  // down this file: abstractTimelineConfig is the panel's real, persisted,
  // operator-authored configuration.
  const abstractTimelineConfigForDesktopMode = resolveAbstractTimelineConfigForDesktopMode(
    abstractTimelineConfig, abstractCoverFlowTimelineSlotConfig.enabledLg,
  );
  // Shared across every page via SharedDesignConfigProvider (pages/_app.tsx)
  // — tuning these here reflects on contact.tsx/about.tsx/design-system.tsx
  // too, and vice versa, instead of each page holding its own disconnected
  // copy of the same default values.
  const {
    pageSurfaceConfig, setPageSurfaceConfig,
    ctaButtonConfig, setCtaButtonConfig,
    globalTypographyConfig, setGlobalTypographyConfig,
    panelShellConfig, setPanelShellConfig,
    setLayoutDebugConfig,
    mobileNavCubeConfig,
  } = useSharedDesignConfig();
  const {
    siteHeaderConfig, setSiteHeaderConfig, wordmarkConfig, setWordmarkConfig,
  } = useAbstractDesignConfig();
  // Page-local override of the shared siteHeaderConfig/ctaButtonConfig
  // color fields above — enabled: false (default) inherits the shared
  // foundation exactly like every other page; on, only this page's own
  // colors change. Seeded from this page's own complete config
  // (ABSTRACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG /
  // ABSTRACT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG), not a shared
  // DEFAULT_..._CONFIG object — see SiteHeaderColorOverride.config.ts's
  // own doc comment for the full per-page config ownership model
  // (PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md).
  const [siteHeaderColorOverride, setSiteHeaderColorOverride] =
    useState<SiteHeaderColorOverrideConfig>(() => (
      normalizeSiteHeaderColorOverrideConfig(ABSTRACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG)
    ));
  const [ctaButtonColorOverride, setCtaButtonColorOverride] =
    useState<CtaButtonColorOverrideConfig>(() => (
      normalizeCtaButtonColorOverrideConfig(ABSTRACT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG)
    ));
  const [collectionHeadingConfig, setCollectionHeadingConfig] =
    useState<SectionHeadingConfig>(() => ({
      ...DEFAULT_SECTION_HEADING_CONFIG,
    }));
  const [practicesLayoutConfig, setPracticesLayoutConfig] =
    useState<PracticesSectionLayoutConfig>(() => ({
      ...DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG,
    }));
  const [dockIntroductionConfig, setDockIntroductionConfig] =
    useState<AbstractPostDockIntroductionConfig>(() => ({
      ...DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG,
    }));
  const [dockGradientPerformanceConfig, setDockGradientPerformanceConfig] =
    useState<AbstractPostDockGradientPerformanceConfig>(() => ({
      ...DEFAULT_ABSTRACT_POST_DOCK_GRADIENT_PERFORMANCE_CONFIG,
    }));
  const [dockPaletteConfig, setDockPaletteConfig] =
    useState<AbstractPostDockPaletteConfig>(() => ({
      ...DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG,
    }));
  const [dockMeshGeometryConfig, setDockMeshGeometryConfig] =
    useState<AbstractPostDockMeshGeometryConfig>(() => ({
      ...DEFAULT_ABSTRACT_POST_DOCK_MESH_GEOMETRY_CONFIG,
    }));
  const [dockHueInfluenceConfig, setDockHueInfluenceConfig] =
    useState<AbstractPostDockHueInfluenceConfig>(() => ({
      ...DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG,
    }));
  const [dockLayoutConfig, setDockLayoutConfig] =
    useState<AbstractPostDockLayoutConfig>(() => ({
      ...DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG,
    }));
  const [dockHologramConfig, setDockHologramConfig] =
    useState<AbstractPostDockHologramConfig>(() => ({
      ...DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG,
    }));
  const [journalLabCollectionConfig, setJournalLabCollectionConfig] =
    useState<AbstractJournalLabCollectionConfig>(() => ({
      ...DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG,
    }));
  const [journalLabCollectionSliderConfig, setJournalLabCollectionSliderConfig] =
    useState<AbstractJournalLabCollectionSliderConfig>(() => ({
      ...DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG,
    }));
  const [labCardConfig, setLabCardConfig] =
    useState<AbstractMetalLabCardConfig>(() => ({
      ...DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG,
    }));
  const [labSectionConfig, setLabSectionConfig] =
    useState<AbstractLabSectionConfig>(() => ({
      ...DEFAULT_ABSTRACT_LAB_SECTION_CONFIG,
    }));
  const [heroCtaComposerConfig, setHeroCtaComposerConfig] =
    useState<AbstractHeroCtaComposerConfig>(() => ({
      ...DEFAULT_ABSTRACT_HERO_CTA_COMPOSER_CONFIG,
    }));
  const { showAuthoringTools, isPanelOpen, setIsPanelOpen, togglePanel } = useAuthoringToolsVisibility();
  const [wallConfig, setWallConfig] = useState<WallConfig>(() => ({
    ...DEFAULT_WALL_CONFIG,
    maxColumnWidthPx: wallMaxColumnWidthPx,
  }));
  const [featuredQuoteConfig, setFeaturedQuoteConfig] = useState<FeaturedWallQuoteConfig>(DEFAULT_FEATURED_WALL_QUOTE_CONFIG);
  const [isDragging, setIsDragging] = useState(false);
  const [gradientSnapshotFrozen, setGradientSnapshotFrozen] = useState(false);
  const collectionContainerProbeRef = useRef<HTMLDivElement | null>(null);
  const [collectionAvailableWidthPx, setCollectionAvailableWidthPx] =
    useState<number | null>(null);
  const [collectionContainerWidthPx, setCollectionContainerWidthPx] =
    useState<number | null>(null);
  const [collectionViewportWidthPx, setCollectionViewportWidthPx] =
    useState<number | null>(null);
  const [adaptiveHeroInkTones, setAdaptiveHeroInkTones] =
    useState<AdaptiveHeroInkTones>({ header: 'light', content: 'light', actions: 'light' });
  const adaptiveHeroInkTonesRef = useRef(adaptiveHeroInkTones);
  const overlayFaceCount = getGradientFaceCount(config);
  const gradientLayerCount = getGradientLayerCount(overlayFaceCount);
  const editorialRow = resolveProceduralColorStackRow(
    config.editorialSourceRow,
    overlayFaceCount,
  );
  const heroLayoutMode = config.skyRenderMode === 'legacy'
    ? config.heroLayoutMode
    : 'full';
  const editorialLayoutActive = heroLayoutMode === 'editorial';
  const gridLayoutActive = heroLayoutMode === 'grid';
  const heroContentPresentationActive = config.skyRenderMode === 'legacy' &&
    config.heroContentEnabled &&
    !gridLayoutActive;
  const legacyGradientDragEnabled = config.skyRenderMode === 'legacy' &&
    !heroContentPresentationActive;
  const normalizedEditorialHeroConfig = useMemo(
    () => normalizeAbstractEditorialHeroConfig(editorialHeroConfig),
    [editorialHeroConfig],
  );
  const normalizedSplitColumnHeroConfig = useMemo(
    () => normalizeAbstractEditorialHeroConfig(splitColumnHeroConfig),
    [splitColumnHeroConfig],
  );
  // Shared by the header nav (via SiteHeader's own PageContainer),
  // the hero's own copy column, and the cards/heading wrapper (further down
  // this render) so all cap to the exact same width — see PageSurfaceConfig's
  // docs for why this must be one shared value rather than independently-
  // configured ones that could drift apart.
  const normalizedPageSurfaceConfig = useMemo(
    () => normalizePageSurfaceConfig(pageSurfaceConfig),
    [pageSurfaceConfig],
  );
  const normalizedDockMeshGeometryConfig = useMemo(
    () => normalizeAbstractPostDockMeshGeometryConfig(dockMeshGeometryConfig),
    [dockMeshGeometryConfig],
  );
  const journalDockSliderConfig = useMemo(
    () => ({
      ...JOURNAL_DOCK_SLIDER_CONFIG,
      shaderMeshGeometryEnabled: normalizedDockMeshGeometryConfig.enabled,
      shaderDomainCurveBoost:
        normalizedDockMeshGeometryConfig.domainCurveBoost,
      shaderBandCurveBoost:
        normalizedDockMeshGeometryConfig.bandCurveBoost,
      // Dock palette direction's own "Gradient scale"/"Gradient noise"
      // fields — shared with /about (same panel scope), applied here so
      // every Card Stack slot (active + neighbors, Articles + Labs) reads
      // the same live zoom/noise instead of the static baseline's own
      // shaderColorScale/shaderColorRandomness.
      shaderColorScale: dockPaletteConfig.gradientScale,
      shaderColorRandomness: dockPaletteConfig.gradientNoise,
    }),
    [
      normalizedDockMeshGeometryConfig,
      dockPaletteConfig.gradientScale,
      dockPaletteConfig.gradientNoise,
    ],
  );
  useEffect(() => {
    const probe = collectionContainerProbeRef.current;
    if (!probe) return;

    const syncCollectionAvailableWidth = () => {
      const nextWidth = Math.max(1, probe.getBoundingClientRect().width);
      setCollectionAvailableWidthPx(previousWidth => (
        previousWidth === nextWidth ? previousWidth : nextWidth
      ));
      const nextContainerWidth = Math.max(
        1,
        probe.parentElement?.getBoundingClientRect().width ?? nextWidth,
      );
      setCollectionContainerWidthPx(previousWidth => (
        previousWidth === nextContainerWidth ? previousWidth : nextContainerWidth
      ));
      const nextViewportWidth = Math.max(1, document.documentElement.clientWidth);
      setCollectionViewportWidthPx(previousWidth => (
        previousWidth === nextViewportWidth ? previousWidth : nextViewportWidth
      ));
    };

    syncCollectionAvailableWidth();
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(syncCollectionAvailableWidth);
    resizeObserver?.observe(probe);
    if (probe.parentElement) resizeObserver?.observe(probe.parentElement);
    window.addEventListener('resize', syncCollectionAvailableWidth, { passive: true });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', syncCollectionAvailableWidth);
    };
  }, []);
  const journalUsesNarrowDock = collectionViewportWidthPx !== null &&
    collectionViewportWidthPx < ABSTRACT_POST_DOCK_NARROW_BREAKPOINT_PX;
  const collectionCardWidthPx =
    collectionAvailableWidthPx === null || collectionContainerWidthPx === null
    ? null
    : resolveCollectionCardWidthPx(
        collectionAvailableWidthPx,
        collectionContainerWidthPx,
        !journalUsesNarrowDock,
        dockLayoutConfig,
      );
  const resolvedCollectionDockLayoutConfig = useMemo(
    () => ({
      ...dockLayoutConfig,
      cardWidthPx: collectionCardWidthPx ?? dockLayoutConfig.cardWidthPx,
    }),
    [collectionCardWidthPx, dockLayoutConfig],
  );
  const journalDockNarrowPeekRem = clamp(
    JOURNAL_DOCK_SLIDER_CONFIG.dockMobilePeekRem,
    0.5,
    3,
  );
  // Reserved above the JOURNAL heading's own bottom edge so the scattered
  // deck's negative-margin peek (see AbstractPostDockScatter's own
  // useScatterLayout) has clearance to ride up into instead of overlapping
  // the heading itself — same formula the deck uses, so this can never fall
  // out of sync with however far the deck actually rides up.
  const journalTopPeekPx = computeAbstractPostDockTopPeekPx(
    resolvedCollectionDockLayoutConfig,
  );
  const normalizedCtaButtonConfig = useMemo(
    () => applyCtaButtonColorOverride(
      normalizeCtaButtonConfig(ctaButtonConfig),
      normalizeCtaButtonColorOverrideConfig(ctaButtonColorOverride),
    ),
    [ctaButtonConfig, ctaButtonColorOverride],
  );
  const normalizedHeroCtaComposerConfig = useMemo(
    () => normalizeAbstractHeroCtaComposerConfig(heroCtaComposerConfig),
    [heroCtaComposerConfig],
  );
  const normalizedCollectionHeadingConfig = useMemo(
    () => normalizeSectionHeadingConfig(collectionHeadingConfig),
    [collectionHeadingConfig],
  );
  const normalizedSiteHeaderConfig = useNormalizedSiteHeaderConfig(siteHeaderConfig, siteHeaderColorOverride);
  editorialHeroConfigRef.current = normalizedEditorialHeroConfig;
  siteHeaderConfigRef.current = normalizedSiteHeaderConfig;
  const heroNavBandActive = config.skyRenderMode === 'legacy' &&
    !gridLayoutActive &&
    normalizedSiteHeaderConfig.navBandEnabled;
  const heroNavBandColorFilter = resolveSiteHeaderNavBandColorFilter(
    normalizedSiteHeaderConfig,
  );
  const designerEditsCustomHeading = gradientDesignerTarget === 'heading' &&
    normalizedEditorialHeroConfig.headlineGradientRelationship === 'custom';
  const activeDesignerConfig = designerEditsCustomHeading
    ? headingGradientConfig
    : config;
  const twilightGradient = useMemo(() => generateTwilightSkyGradient({
    sunElevationDeg: config.skySunElevationDeg,
    stopCount: config.skyStopCount,
    turbidity: config.skyTurbidity,
    exposure: config.skyExposure,
    saturation: config.skySaturation,
    chromaDuck: config.skyChromaDuck,
    inkUnity: config.skyInkUnity,
    nightDepth: config.skyNightDepth,
    afterglow: config.skyAfterglow,
    ozone: config.skyOzone,
    falloff: config.skyFalloff,
  }), [
    config.skyAfterglow,
    config.skyChromaDuck,
    config.skyExposure,
    config.skyFalloff,
    config.skyNightDepth,
    config.skyInkUnity,
    config.skyOzone,
    config.skySaturation,
    config.skyStopCount,
    config.skySunElevationDeg,
    config.skyTurbidity,
  ]);
  const fieldHeroTone = config.skyRenderMode === 'legacy'
    ? 'light'
    : config.skyRenderMode === 'refractor'
      ? config.skyInkMode === 'auto' ? 'light' : config.skyInkMode
    : config.skyRenderMode === 'glass'
      ? config.skyInkMode === 'auto' ? 'light' : config.skyInkMode
    : config.skyInkMode === 'auto'
      ? recommendTwilightSkyInk({
        gradient: twilightGradient,
        originX: clamp(config.skyOriginXPercent, -20, 40) / 100,
        originY: clamp(config.skyOriginYPercent, -20, 40) / 100,
        radiusX: clamp(config.skyRadiusXPercent, 40, 180) / 100,
        radiusY: clamp(config.skyRadiusYPercent, 40, 180) / 100,
        samplePoints: ABSTRACT_HERO_INK_SAMPLE_POINTS,
      })
      : config.skyInkMode;
  const heroTone = heroContentPresentationActive ? 'dark' : fieldHeroTone;
  const backgroundAwarenessActive = config.skyRenderMode === 'legacy' &&
    !heroContentPresentationActive &&
    config.heroBackgroundAwarenessEnabled;
  const headerTone = backgroundAwarenessActive ? adaptiveHeroInkTones.header : heroTone;
  const contentTone = backgroundAwarenessActive && !editorialLayoutActive
    ? adaptiveHeroInkTones.content
    : heroTone;
  const actionsTone = backgroundAwarenessActive && !editorialLayoutActive
    ? adaptiveHeroInkTones.actions
    : heroTone;
  // Every breakpoint-tiered column/split-band color computation this page
  // used to hand-roll (the four-way colorSource switch, physical-side
  // mapping, split-band left/right resolution) now lives once inside
  // usePolymorphicLayoutColors (components/PolymorphicLayout.tsx) — the
  // same hook /about already calls, per PLAN-SPLIT-COLUMN-LAYOUT-
  // ENRICHMENT-EXTRACTION.md's own correction ("we're not reusing, we're
  // duplicating"). <PolymorphicLayout> itself resolves and applies
  // splitBandLeftColor/splitBandRightColor internally from
  // splitColumnLayoutConfig's own splitBandLeftMode/splitBandRightMode —
  // this page has no conditional need to override that (unlike /about's own
  // Spacefield-visible case), so it isn't passed as a prop below. `'wide'`/
  // `'narrow'` only matter when colorSource is 'palette' (this page's
  // default is 'custom', so paletteColorResolver is exercised only if an
  // operator switches sources via the panel).
  const paletteColorResolver = useCallback(
    (column: 'wide' | 'narrow') => resolveSplitColumnAccent(
      column === 'wide' ? ABSTRACT_WIDE_COLUMN_PALETTE_INDEX : ABSTRACT_NARROW_COLUMN_PALETTE_INDEX,
      ABSTRACT_SPLIT_COLUMN_PALETTE_STOP_COUNT,
      dockPaletteConfig,
    ),
    [dockPaletteConfig],
  );
  // Live, ephemeral override for the narrow column's own
  // scrollGradientNarrowColumnSaturationLg/-DarknessLg — written every rAF
  // tick by the CoverFlow-navigation-synced effect further down this file
  // (PLAN-COVERFLOW-NARROW-GRADIENT-SYNC.md), null whenever that easing is
  // fully at rest at the base values. Deliberately NOT applied by writing
  // into splitColumnLayoutConfig itself (an earlier version of this
  // feature did exactly that, and it was wrong two different ways:
  // (1) a self-reference bug — the effect's own "ease back toward base"
  // math read its base endpoint from the same field it was writing,
  // corrupting it once the value moved; (2) operator-reported: /abstract's
  // PolymorphicLayout config panel treats splitColumnLayoutConfig as the
  // real, persisted, operator-authored configuration — every animation
  // frame writing into it looked, to that panel (and to whatever persists
  // its values across reloads), like the operator had manually retuned
  // Narrow gradient saturation/darkness to the "on navigate" values, so a
  // completely fresh page load — card 0 active, nothing navigated —
  // rendered as if already navigated). Kept as a separate value merged in
  // only for rendering below: splitColumnLayoutConfig itself is never
  // written to by this feature, so the panel and any persistence layer
  // built on top of it only ever reflect the operator's own real edits.
  const [narrowGradientLiveOverride, setNarrowGradientLiveOverride] =
    useState<{ saturation: number; darkness: number } | null>(null);
  // Desktop's Lg-tier fields (narrowColumnWidthTierLg, splitBandWidthTierLg,
  // every Lg alignment/padding/header field ABSTRACT_POLYMORPHIC_LAYOUT_
  // CONFIG overrides for the stacked/full-width composition) must revert to
  // the classic 38/62 split whenever abstractCoverFlowTimelineSlotConfig.
  // enabledLg is off — that toggle is the only reason those fields exist in
  // their stacked form at all, and there is nowhere for the Timeline to
  // render inside CoverFlow's own track once it's switched off. Resolved
  // here (not by writing into splitColumnLayoutConfig itself) for the exact
  // same reason narrowGradientLiveOverride above is layered on separately —
  // see that state's own doc comment: splitColumnLayoutConfig is the panel's
  // real, persisted, operator-authored configuration and must never be
  // written to by a derived, automatic behavior.
  const splitColumnLayoutConfigForDesktopMode = resolveAbstractPolymorphicLayoutConfigForDesktopMode(
    splitColumnLayoutConfig, abstractCoverFlowTimelineSlotConfig.enabledLg,
  );
  const splitColumnLayoutConfigForColors = narrowGradientLiveOverride
    ? {
      ...splitColumnLayoutConfigForDesktopMode,
      scrollGradientNarrowColumnSaturationLg: narrowGradientLiveOverride.saturation,
      scrollGradientNarrowColumnDarknessLg: narrowGradientLiveOverride.darkness,
    }
    : splitColumnLayoutConfigForDesktopMode;
  const colors = usePolymorphicLayoutColors(
    splitColumnLayoutConfigForColors, normalizedPageSurfaceConfig.color, paletteColorResolver,
  );
  // PLAN-ABSTRACT-TYPOGRAPHY-COLOR-UNIFICATION.md Part C — one resolved
  // "ink" + title/body/highlight role set per real background region,
  // computed once here and threaded into the header/hero/timeline via each
  // component's own additive *ColorOverride prop (SiteHeader.tsx,
  // AbstractEditorialHero.tsx, AboutTimeline.tsx — all optional, all
  // undefined for every other page/caller). Resolved separately per region
  // (not once and reused everywhere) even though the header and the narrow
  // column now agree by construction (PolymorphicLayout.pageConfigs.ts's
  // own splitBandLeftModeWide fix, Part B.2) — each region still derives
  // from its own real, physically-painted background, so a future
  // divergence (an operator setting the header band to a genuinely custom
  // color again) degrades to "two correctly-resolved regions that happen to
  // differ," never "one region resolved against the wrong background."
  const headerTypography = resolveTypographyColors(colors.actualLeftSegmentColor, globalTypographyConfig);
  // `narrowColumnColor` is intentionally allowed to be the CSS paint
  // sentinel `transparent`. For desktop gradient-backed layouts, resolve
  // typography against the real shared/variant gradient sample instead —
  // shared with about.tsx (and any future PolymorphicLayout page) via
  // resolvePolymorphicNarrowColumnTypography, not hand-duplicated per page
  // anymore. See that function's own doc comment
  // (PolymorphicLayout.narrowColumnTypography.ts) for the full chain this
  // used to be inline here, and AUDIT-POLYMORPHIC-GRADIENT-ABSTRACTION.md
  // for the drift this extraction closes.
  const narrowColumnTypography = resolvePolymorphicNarrowColumnTypography(
    colors, globalTypographyConfig,
  );
  const wideColumnTypography = resolveTypographyColors(colors.wideColumnColor, globalTypographyConfig);
  const gradientBackedNarrowColumn = colors.narrowColumnGradientReferenceColor !== undefined;
  // Light-surface anchor for the mobile short list's own scroll-adaptive
  // ink (below) — resolveTypographyColors' own resolveRole bakes each
  // role's real render opacity (bodyOpacity/highlightOpacity, both < 1 for
  // AboutTimelineRow's inactive rows) INTO the contrast search itself, via
  // resolveContrastAwareTextColor's targetOpacity param — exactly what
  // narrowColumnTypography/wideColumnTypography above already get for
  // free. A plain deriveSurfaceColor (SiteFooter's own formula — footer
  // text always renders at opacity 1, so it never needed this) looked
  // "correct" in isolation but came out visibly washed once actually
  // painted at AboutTimelineRow's real opacity (confirmed live via
  // Playwright pixel sampling: opacity 0.42 diluted an undercompensated
  // dark base into a low-contrast gray). Resolved once against the page's
  // light surface (the background the short list settles to once
  // useScrollAdaptiveInk's returnToLight has fully reduced progress).
  const shortArticleListLightSurfaceTypography = resolveTypographyColors(
    normalizedPageSurfaceConfig.color, globalTypographyConfig,
  );
  // Mobile article-list scroll-contrast guarantee (PLAN-MOBILE-ARTICLE-LIST-
  // SCROLL-CONTRAST.md): while the mobile tier's scroll-gradient background
  // is active, colors.wideColumnColor above is already overridden to a
  // fixed brand ink color (scrollGradientInkColor, usePolymorphicLayoutColors)
  // — never the real, physically-painted gradient, and never updated as the
  // background darkens on scroll. wideColumnTypography above is therefore
  // both resolved against the wrong color AND static for the entire scroll
  // range.
  //
  // These two anchors resolve the mobile article list's own SINGLE shared
  // ink (AbstractMobileArticleListInkConfig, operator ask — replaces the
  // two independently-tinted bodyColor/highlightColor values every other
  // resolveTypographyColors caller still uses) against the REAL background
  // at its two extremes — at rest (scrollGradientOriginColor) and fully
  // darkened (that color scaled toward black by the same maxDarken the
  // background's own overlay uses). Only meaningful while
  // colors.scrollGradientActive is true; every other tier/page keeps
  // today's single wideColumnTypography value untouched. See the mobile
  // article-list's own <AboutTimeline> call site (renderList prop) below
  // for where these two anchors get live-mixed via CSS color-mix(), not
  // applied directly.
  const mobileArticleListBackgroundAtRest = colors.breakpointTier === 'mobile'
    ? (colors.scrollGradientOriginColor ?? colors.wideColumnColor)
    : (colors.narrowColumnGradientReferenceColor
      ?? colors.scrollGradientOriginColor
      ?? colors.narrowColumnColor);
  const mobileArticleListBackgroundDarkened = scaleColorTowardBlack(
    mobileArticleListBackgroundAtRest, colors.scrollGradientResolved.maxDarken,
  );
  const mobileArticleListInkAtRest = colors.scrollGradientActive
    ? resolveMobileArticleListInkColor(mobileArticleListBackgroundAtRest, mobileArticleListInkConfig)
    : wideColumnTypography.bodyColor;
  const mobileArticleListInkDarkened = colors.scrollGradientActive
    ? resolveMobileArticleListInkColor(mobileArticleListBackgroundDarkened, mobileArticleListInkConfig)
    : wideColumnTypography.bodyColor;
  // Live scroll-progress CSS var for the mobile article list's own
  // color-mix() text (PLAN-MOBILE-ARTICLE-LIST-SCROLL-CONTRAST.md) —
  // attached to the wrapping div around <MobilePinnedArticleSection> below
  // (that div is a real ancestor of the rendered rows, unlike
  // PolymorphicScrollGradientBackground's own darken var, which lives on a
  // FIXED SIBLING overlay and therefore never inherits down to this
  // subtree). Ported verbatim from AbstractEditorialHero.tsx's own
  // identical rAF-smoothed scroll effect — same tau-based exponential
  // easing (`alpha = 1 - exp(-dt/tau)`), same viewportRangeVh/tauMs INPUTS
  // (colors.scrollGradientResolved, the same values the background/hero
  // already use) — so this list's own color transition rides the identical
  // curve and pace as both of those, per explicit operator ask. Unlike the
  // hero, only ONE smoothing stage is needed here: the color itself is a
  // plain, continuous color-mix() between two FIXED precomputed endpoints
  // (mobileArticleListInkAtRest/-Darkened above), not a per-frame
  // discontinuous correction search — one smoothed progress value driving
  // a linear interpolation is already exactly as gradual as the hero's own
  // first-stage smoothing; a second stage would add lag with nothing to
  // correct for.
  const mobileArticleListScrollRef = useRef<HTMLDivElement | null>(null);
  // The desktop timeline and the mobile short list are both compact
  // companions to CoverFlow, and BOTH branches are always mounted in the DOM
  // simultaneously (PolymorphicLayout renders narrowColumn and wideColumn
  // side by side; only CSS media queries decide which is visually shown per
  // breakpoint) — so a single shared ref here would have its `.current`
  // overwritten by whichever of the two elements commits last, silently
  // starving the OTHER (possibly the one actually visible) of any further
  // useScrollAdaptiveInk writes: it freezes at whatever
  // --scroll-adaptive-ink-progress value happened to be set the last time it
  // briefly held the ref, never receiving the return-to-light correction as
  // the page scrolls into the footer (operator-reported, confirmed live via
  // Playwright: the visible mobile row stayed washed out while the actual
  // ref-holder — the hidden desktop instance — correctly darkened). Two
  // independent refs/hook instances, one per DOM subtree, is what SiteFooter
  // implicitly gets for free by only ever mounting once.
  const shortArticleListMobileInkRef = useRef<HTMLDivElement | null>(null);
  const shortArticleListDesktopInkRef = useRef<HTMLDivElement | null>(null);
  // The hero's adaptive ink reads this root-level progress variable. Keep
  // it for the hero while the fixed header uses static colors below.
  const pageAdaptiveInkRootRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    pageAdaptiveInkRootRef.current = document.documentElement;
  }, []);
  // Bug fix (operator-reported, screenshot evidence): the mobile branch used
  // to seed its base color from mobileArticleListInkAtRest — a color tuned
  // by AbstractMobileArticleListInkConfig to read LIGHT against the dark
  // at-rest gradient, then only ever pushed lighter still by
  // useScrollAdaptiveInk's white color-mix. Once the physical background
  // scrolled past that dark assumption into a lighter tone, the ink had no
  // way back to dark and went illegible. Now anchored to the LIGHT page
  // surface instead (shortArticleListLightSurfaceTypography above) —
  // dark-on-light by construction, matching SiteFooter's own baseTextColor
  // — so the SAME useScrollAdaptiveInk hook only ever lightens it while the
  // gradient is actively darkened, tracking the footer's own light/dark
  // curve. Uses resolveTypographyColors (not SiteFooter's own plain
  // deriveSurfaceColor) specifically because AboutTimelineRow renders
  // inactive rows at reduced opacity (bodyOpacity/highlightOpacity, both
  // <1) — resolveTypographyColors' role resolution bakes that real render
  // opacity into its contrast search, so the result still reads legibly
  // once diluted. SiteFooter never needed this since its own text always
  // renders at opacity 1, and a first pass here that borrowed its plain
  // formula verbatim came out visibly washed once actually painted at 0.42
  // opacity (confirmed live via Playwright pixel sampling).
  // Operator ask: pass AboutTimeline exactly ONE resolved ink (below, used
  // for both bodyColorOverride and highlightColorOverride) instead of two
  // independently-offset hues — matches AbstractMobileArticleListInkConfig's
  // own original documented intent ("one fixed hue+saturation ink...
  // active/inactive distinction is carried by OPACITY alone") and lets
  // AboutTimelineRow's own font-weight/opacity role logic do the active-vs-
  // inactive differentiation, rather than us supplying a second, separately-
  // derived color it would otherwise have overridden anyway.
  const shortArticleListBaseColor = gradientBackedNarrowColumn
    ? narrowColumnTypography.titleColor
    : colors.breakpointTier !== 'mobile'
    ? narrowColumnTypography.bodyColor
    : shortArticleListLightSurfaceTypography.bodyColor;
  // Bug fix (2nd pass, live-verified via Playwright): the previous fix only
  // corrected the BASE color but left the ink progress computed from raw,
  // monotonically-increasing window.scrollY — so it kept ratcheting toward
  // white for the rest of the page's scroll range and never came back down
  // once the real background behind the (sticky/pinned) short list turned
  // light near the footer. SiteFooter.tsx never hits this because it ALSO
  // forwards these same three returnToLight* fields
  // (config.backgroundReturnToLightEnabled/-RangeVh/-FinalDarken) to its own
  // identical useScrollAdaptiveInk call, which resets the ink progress back
  // toward 0 as the shared data-scroll-gradient-return-anchor element
  // approaches the viewport. Forwarding the exact same abstractFooterConfig
  // fields here is what actually makes the short list track the footer's
  // own color, not just share its formula. Called twice (mobile/desktop
  // refs above) since each DOM subtree needs its own live-updated instance.
  // PLAN-POLYMORPHIC-ADAPTIVE-INK-EXTRACTION.md — usePolymorphicColumnAdaptiveInk
  // reads its schedule (maxAmount/targetContrastRatio/returnToLight*) from
  // splitColumnLayoutConfig's own scrollGradientAdaptiveInk* fields now
  // (global, panel-editable via the same live config), not a page-local
  // abstractFooterConfig copy. Two calls, one per real DOM subtree (mobile
  // + desktop refs) — never a shared instance, see the hook's own doc
  // comment for why (a shared ref previously starved whichever subtree lost
  // the ref-assignment race, operator-reported regression).
  //
  // Bug fix (operator-reported: the short list's text visibly snapped to a
  // different color the instant the panel expanded) — 'short' and 'expanded'
  // used to read from two INDEPENDENT ink pipelines (this one vs.
  // mobileArticleListColor's own separate --mobile-article-list-darken
  // color-mix further below), each landing on its own resting value at the
  // moment of the switch. forceProgress (useScrollAdaptiveInk.ts) lets this
  // SAME pipeline also hold at full progress while the panel is expanded and
  // configured to force-darken — mirroring forceMaxRef's own
  // isMobileArticleListExpanded && expandedForcesMaxBackgroundDarken gate
  // below, just applied to ink instead of background. The 'expanded'
  // presentation's own renderList call (below) now reads this SAME
  // shortArticleListBodyColor/-HighlightColor instead of a second color, so
  // there is only ever one live value — nothing to snap between. Desktop
  // never expands this way, so its own ink call is untouched.
  const shortArticleListBodyColorMobile = usePolymorphicColumnAdaptiveInk({
    ref: shortArticleListMobileInkRef,
    baseColor: shortArticleListBaseColor,
    config: splitColumnLayoutConfig,
    colors,
    forceProgress: isMobileArticleListExpanded && mobilePinnedArticleSectionConfig.expandedForcesMaxBackgroundDarken
      ? 1
      : undefined,
  });
  usePolymorphicColumnAdaptiveInk({
    ref: shortArticleListDesktopInkRef,
    baseColor: shortArticleListBaseColor,
    config: splitColumnLayoutConfig,
    colors,
  });
  // Both calls resolve the identical color-mix() STRING (same formula, same
  // config) — only the live CSS custom property each writes differs per DOM
  // subtree at paint time. Either return value is equally correct to render.
  const shortArticleListBodyColor = shortArticleListBodyColorMobile ?? shortArticleListBaseColor;
  // The header needs one stable ink color at every scroll position. Resolve
  // it from the same base used by the hero, without the hero's live white mix.
  const narrowColumnGradientTextOrigin = colors.breakpointTier === 'mobile'
    ? colors.scrollGradientOriginColor
    : (colors.narrowColumnGradientReferenceColor ?? colors.scrollGradientOriginColor);
  const heroAccordionBaseTextColor = gradientBackedNarrowColumn
    ? narrowColumnTypography.titleColor
    : heroAccordionItemConfig.textColorMode === 'custom'
    ? heroAccordionItemConfig.textCustomColor
    : deriveSurfaceColor(colors.narrowColumnColor, heroAccordionItemConfig.textSurfaceOffset);
  usePolymorphicColumnAdaptiveInk({
    ref: pageAdaptiveInkRootRef,
    baseColor: heroAccordionBaseTextColor,
    config: splitColumnLayoutConfig,
    colors,
    originColorOverride: narrowColumnGradientTextOrigin,
  });
  const topHeaderTitleColor = heroAccordionBaseTextColor;
  // All narrow-column consumers use this same live color expression. The
  // shared root-level adaptive-ink hook above supplies the progress for the
  // hero, while the timeline's own hook uses the identical schedule
  // in its subtree. This prevents dark text from remaining static when the
  // fixed gradient darkens underneath it.
  const narrowColumnAdaptiveInkColor = gradientBackedNarrowColumn
    ? buildScrollAdaptiveInkColor(
      narrowColumnTypography.titleColor,
      splitColumnLayoutConfig.scrollGradientAdaptiveInkMaxAmount,
    )
    : narrowColumnTypography.titleColor;
  // Live-value refs, same pattern PolymorphicScrollGradientBackground.tsx
  // now uses (PLAN-DARKEN-FLASH-FIX.md) — updated directly in the render
  // body so the PERSISTENT rAF loop below always reads today's latest
  // value without ever tearing itself down. Regression fix (operator-
  // reported: expanding/collapsing the article list flashed light→dark→
  // light on the LIST'S OWN text tint too, same root cause as the shared
  // background's own identical bug — this effect used to list
  // isMobileArticleListExpanded/expandedForcesMaxBackgroundDarken/
  // scrollGradientResolved in its own dependency array, so toggling expand
  // state tore the whole effect down and reset its smoothing state to 0
  // every time, immediately before re-seeking the new target).
  const viewportRangeVhRef = useRef(colors.scrollGradientResolved.viewportRangeVh);
  viewportRangeVhRef.current = colors.scrollGradientResolved.viewportRangeVh;
  const tauMsRef = useRef(colors.scrollGradientResolved.tauMs);
  tauMsRef.current = colors.scrollGradientResolved.tauMs;
  const forceMaxRef = useRef(false);
  forceMaxRef.current = isMobileArticleListExpanded
    && mobilePinnedArticleSectionConfig.expandedForcesMaxBackgroundDarken;
  const recomputeListDarkenNowRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = mobileArticleListScrollRef.current;
    if (!el) return undefined;

    const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
    const alphaFromTau = (dtMs: number, tau: number) => 1 - Math.exp(-dtMs / Math.max(1, tau));

    const targetRef = { current: 0 };
    const smoothRef = { current: 0 };
    const rafRef = { current: null as number | null };
    const lastTsRef = { current: 0 };

    const writeProgress = (value: number) => {
      el.style.setProperty('--mobile-article-list-darken', clamp01(value).toFixed(3));
    };

    // Forces this list's own tint fully toward its darkened anchor while
    // expanded (same forceMaxDarken semantics, same config toggle,
    // expandedForcesMaxBackgroundDarken, as the shared scroll-gradient
    // background — PolymorphicScrollGradientBackground.tsx — so the two
    // track together). Falls back to the plain scroll-driven value
    // whenever not expanded, or the operator has disabled the toggle. The
    // CSS var this writes is only ever consumed while
    // colors.scrollGradientActive is true (mobileArticleListColor's own
    // ternary further down) — harmless to keep computing/writing it
    // unconditionally otherwise, so this effect no longer needs its own
    // early-return gate on that value either.
    const computeTarget = () => {
      if (forceMaxRef.current) {
        targetRef.current = 1;
        return;
      }
      const viewport = window.innerHeight || 1;
      const rawProgress = window.scrollY / (viewport * viewportRangeVhRef.current);
      targetRef.current = clamp01(rawProgress);
    };

    const tick = (ts: number) => {
      const lastTs = lastTsRef.current || ts;
      lastTsRef.current = ts;
      rafRef.current = null;

      const dt = Math.max(0, ts - lastTs);
      const alpha = alphaFromTau(dt, tauMsRef.current);
      const target = targetRef.current;
      const current = smoothRef.current + (target - smoothRef.current) * alpha;
      smoothRef.current = current;

      writeProgress(current);

      if (Math.abs(target - current) >= 0.001) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    const schedule = () => {
      if (rafRef.current !== null) return;
      // Regression fix (already required twice this session on the other
      // two rAF loops in this codebase, PolymorphicScrollGradientBackground.tsx
      // and AbstractEditorialHero.tsx): lastTsRef is NOT reset when the
      // loop converges and stops — only rAF cancellation happens then. If
      // scrolling resumes after any pause, the next tick's
      // `lastTs = lastTsRef.current || ts` would otherwise inherit that
      // stale timestamp instead of falling back to `ts`, producing an
      // artificially huge dt, alpha≈1, and a one-frame snap on exactly the
      // pause-then-resume case a user dwelling mid-scroll on this list
      // would actually hit.
      lastTsRef.current = 0;
      rafRef.current = window.requestAnimationFrame(tick);
    };

    const onScroll = () => {
      computeTarget();
      schedule();
    };
    const onResize = () => {
      computeTarget();
      schedule();
    };

    // writeProgress(0) here only ever runs ONCE, on true component mount —
    // never again on a later expand/collapse toggle (that repeated reset
    // is exactly the flash this refactor eliminates).
    writeProgress(0);
    computeTarget();
    schedule();
    recomputeListDarkenNowRef.current = () => {
      computeTarget();
      schedule();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      recomputeListDarkenNowRef.current = null;
    };
  }, []);

  // Triggers an immediate recompute (never a teardown/reset) whenever
  // expand state or the shared timing config changes — see the persistent
  // effect above for why a dependency-array-driven teardown was the bug.
  useEffect(() => {
    recomputeListDarkenNowRef.current?.();
  }, [
    colors.scrollGradientResolved, isMobileArticleListExpanded,
    mobilePinnedArticleSectionConfig.expandedForcesMaxBackgroundDarken,
  ]);
  // Live-mixed CSS string for the mobile article list's own text —
  // color-mix() between the two precomputed single-ink anchors above,
  // driven by --mobile-article-list-darken (the smoothed progress var the
  // effect above writes). Both bodyColorOverride and highlightColorOverride
  // below get this SAME string (operator ask: one shared color for the
  // whole list) — active vs. inactive rows are told apart by opacity alone
  // (bodyOpacityOverride/highlightOpacityOverride, still sourced from
  // globalTypographyConfig below, unchanged). Every other page/tier (not
  // colors.scrollGradientActive) falls back to a flat, static color — byte-
  // identical in spirit to today's wideColumnTypography.bodyColor, just
  // resolved through the new single-ink config instead.
  const mobileArticleListColor = colors.scrollGradientActive
    ? `color-mix(in srgb, ${mobileArticleListInkAtRest} calc(100% - var(--mobile-article-list-darken, 0) * 100%), ${mobileArticleListInkDarkened} calc(var(--mobile-article-list-darken, 0) * 100%))`
    : mobileArticleListInkAtRest;
  // The authoring shell belongs visually to the surface at the viewport's
  // right edge. In split-column mode it inherits that physical column's
  // resolved color; the classic layout falls back to the page surface
  // rather than introducing a separate panel color token.
  // usePolymorphicLayoutColors always returns a real color string (never
  // undefined — 'transparent' stands in for colorSource: 'none'), so no ??
  // fallback is needed for the split-column branch the way the former
  // hand-rolled physicalRightColumnColor (possibly undefined) required.
  const configPanelBackgroundColor = abstractPageLayoutConfig.presentationMode === 'splitColumn'
    ? colors.physicalRightColumnColor
    : normalizedPageSurfaceConfig.color;
  // Still needed here, unlike the <SiteHeader> call sites below (which now
  // resolve their own 'custom'/'surface'/'column'-mode logo stops
  // internally from physicalLeftColumnColor — see SiteHeaderProps.logoStops's
  // own doc comment): AbstractHeroGrid (the legacy skyRenderMode branch,
  // below) is a genuinely different component with no equivalent internal
  // computation of its own, so it still needs a pre-resolved value handed
  // in. Also still the right value to pass to <SiteHeader>'s own logoStops
  // prop — SiteHeader only actually reads it in 'adaptive' colorMode now,
  // which this page (uniquely among current callers) genuinely uses.
  // The fallback passed as the 4th arg only matters in 'adaptive' colorMode
  // (resolveSiteHeaderLogoStops's own unmatched-mode branch). While
  // backgroundAwarenessActive is genuinely sampling a moving, non-flat
  // background in real time, there's no single flat color to run
  // resolveContrastAwareTextColor against, so the curated light/dark synth
  // stops remain the right fallback. Otherwise headerTone is just a static
  // config choice and colors.actualLeftSegmentColor is a real, derivable
  // column color — the same one every other on-page text (e.g. the hero
  // paragraph's paragraphTextColorMode: 'column') already derives its own
  // color from, so the logo should match it instead of a generic brand
  // gradient unrelated to the page's actual colors.
  // colors.wordmarkGradientStops (PolymorphicLayout.tsx's own
  // usePolymorphicLayoutColors) takes priority when present — the operator
  // opted into PolymorphicLayoutConfig's own wordmarkUsesScrollGradient, and
  // the active tier's own scrollGradientEnabled is on. colorMode is forced
  // to 'adaptive' only in that case — resolveSiteHeaderLogoStops only reads
  // the 4th arg (fallbackStops) in that mode, and this page's own
  // wordmarkConfig.colorMode isn't 'adaptive' by default. See
  // PLAN-WORDMARK-SCROLL-GRADIENT-INTEGRATION.md.
  // Page-local override of the shared wordmarkConfig's own intro-timing
  // fields (DEFAULT_WORDMARK_CONFIG: introDurationS 1.4, introStepDelayS
  // 0.02) — same layered-override technique as about.tsx's
  // spacefieldHeaderConfig, not a change to the shared default every page
  // reads. Live-measured: the per-glyph fade/scale/bloom reveal at the
  // shared defaults takes ~1.4-1.8s end to end after the wordmark first
  // mounts, well after the header/nav/hero text/card have already settled
  // (PLAN-ABSTRACT-PAGE-INTRO-SEQUENCE.md) — the wordmark visibly still
  // drawing itself in nearly two seconds after everything around it is
  // done is exactly the "wordmark missing/appears out of nowhere"
  // complaint. Tightened here so the whole reveal completes in ~0.5s,
  // in line with the rest of the settled shell, while keeping the same
  // letter-by-letter direction/bloom character (only the pacing changes).
  const ABSTRACT_WORDMARK_INTRO_OVERRIDE = {
    introDurationS: 0.4,
    introStepDelayS: 0.006,
    introInitialDelayS: 0,
    introBloomInitialDelayS: 0.02,
    introBloomStepDelayS: 0.006,
  } as const;
  const effectiveWordmarkConfig = colors.wordmarkGradientStops
    ? { ...wordmarkConfig, ...ABSTRACT_WORDMARK_INTRO_OVERRIDE, colorMode: 'adaptive' as const }
    : { ...wordmarkConfig, ...ABSTRACT_WORDMARK_INTRO_OVERRIDE };
  const heroHeaderLogoStops = gradientBackedNarrowColumn
    ? [{ color: heroAccordionBaseTextColor, at: 0 }, { color: heroAccordionBaseTextColor, at: 100 }]
    : resolveSiteHeaderLogoStops(
      effectiveWordmarkConfig,
      normalizedPageSurfaceConfig.color,
      colors.actualLeftSegmentColor,
      colors.wordmarkGradientStops ?? (
      backgroundAwarenessActive
        ? (headerTone === 'light' ? ABSTRACT_SYNTH_LOGO_STOPS : ABSTRACT_SYNTH_LOGO_DARK_STOPS)
        : (() => {
          const derivedLogoColor = resolveContrastAwareTextColor(
            colors.actualLeftSegmentColor,
            wordmarkConfig.columnTextMinContrast,
            wordmarkConfig.surfaceOffset,
          );
          return [{ color: derivedLogoColor, at: 0 }, { color: derivedLogoColor, at: 100 }];
        })()
      ),
    );
  // Keep the fixed wordmark on its original stops while the page scrolls.
  const topHeaderLogoStops = heroHeaderLogoStops;
  const narrowColumnWordmarkGradientStops = gradientBackedNarrowColumn
    ? undefined
    : colors.wordmarkGradientStops;
  const headerBaseHeight = tailwindTokenCssValue('height', 'base', normalizedSiteHeaderConfig.height);
  const headerWideHeight = tailwindTokenCssValue('height', 'md', normalizedSiteHeaderConfig.heightWide);
  const headerLgHeight = tailwindTokenCssValue('height', 'lg', normalizedSiteHeaderConfig.heightLg);
  const heroHeaderHeight = headerBaseHeight === 'auto' ? '7rem' : headerBaseHeight;
  const heroHeaderDesktopHeight = headerWideHeight === 'auto' ? '7rem' : headerWideHeight;
  const heroHeaderLgHeight = headerLgHeight === 'auto' ? '7rem' : headerLgHeight;
  const heroStyle = useMemo(() => ({
    backgroundColor: heroContentPresentationActive
      ? normalizedPageSurfaceConfig.color
      : config.skyRenderMode === 'refractor'
      ? '#ffffff'
      : editorialLayoutActive
      ? normalizedPageSurfaceConfig.color
      : config.skyRenderMode === 'legacy' || config.skyRenderMode === 'glass'
      ? config.backgroundColor
      : twilightGradient.terminalColor,
    '--hero-sky-stops': twilightGradient.cssStops,
    '--hero-sky-origin-x': `${clamp(config.skyOriginXPercent, -20, 40)}%`,
    '--hero-sky-origin-y': `${clamp(config.skyOriginYPercent, -20, 40)}%`,
    '--hero-sky-radius-x': `${clamp(config.skyRadiusXPercent, 40, 180)}%`,
    '--hero-sky-radius-y': `${clamp(config.skyRadiusYPercent, 40, 180)}%`,
    // Legacy's authored shell keeps the same generated twilight hue path,
    // mixed into the real page surface so the dark first-frame ink remains
    // legible before background-aware canvas sampling has run.
    '--hero-initial-color-a': blendOpaqueColors(
      normalizedPageSurfaceConfig.color,
      twilightGradient.stops[0]?.color ?? twilightGradient.terminalColor,
      0.45,
    ),
    '--hero-initial-color-b': blendOpaqueColors(
      normalizedPageSurfaceConfig.color,
      twilightGradient.stops[Math.floor(twilightGradient.stops.length / 3)]?.color
        ?? twilightGradient.terminalColor,
      0.25,
    ),
    '--hero-initial-color-c': blendOpaqueColors(
      normalizedPageSurfaceConfig.color,
      twilightGradient.terminalColor,
      0.12,
    ),
    '--hero-glass-angle': `${config.glassGradientAngleDeg}deg`,
    '--hero-glass-color-a': config.glassGradientColorA,
    '--hero-glass-color-b': config.glassGradientColorB,
    '--hero-glass-color-c': config.glassGradientColorC,
    '--hero-glass-color-d': config.glassGradientColorD,
    '--hero-header-height': heroHeaderHeight,
    '--hero-header-height-desktop': heroHeaderDesktopHeight,
    '--hero-header-height-lg': heroHeaderLgHeight,
    '--hero-editorial-stack-height': `${editorialRow.rowCount * 100}%`,
    '--hero-editorial-stack-offset': `${-editorialRow.rowIndex * 100}%`,
  } as CSSProperties), [
    config.backgroundColor,
    config.glassGradientAngleDeg,
    config.glassGradientColorA,
    config.glassGradientColorB,
    config.glassGradientColorC,
    config.glassGradientColorD,
    config.skyOriginXPercent,
    config.skyOriginYPercent,
    config.skyRadiusXPercent,
    config.skyRadiusYPercent,
    config.skyRenderMode,
    editorialLayoutActive,
    editorialRow.rowCount,
    editorialRow.rowIndex,
    heroHeaderHeight,
    heroHeaderDesktopHeight,
    heroHeaderLgHeight,
    normalizedPageSurfaceConfig.color,
    heroContentPresentationActive,
    twilightGradient.stops,
    twilightGradient.cssStops,
    twilightGradient.terminalColor,
  ]);
  useEffect(() => {
    // Changing modes exposes the authored fallback until the newly selected
    // renderer produces a real frame. Static/refractor modes need no GPU
    // readiness gate.
    setHeroRendererReady(
      config.skyRenderMode === 'static' || config.skyRenderMode === 'refractor',
    );
  }, [config.skyRenderMode]);
  const refractorSliceCount = Math.round(clamp(config.refractorSliceCount, 1, 64));
  const refractorCenterSliceIndex = Math.floor(refractorSliceCount / 2);
  const refractorRowDisplacementStepPercent = clamp(
    config.refractorRowDisplacementStepPercent,
    0,
    30,
  );
  const refractorRowScaleStepPercent = clamp(
    config.refractorRowScaleStepPercent,
    0,
    20,
  );
  const refractorColumnDisplacementStepPercent = clamp(
    config.refractorColumnDisplacementStepPercent,
    0,
    30,
  );
  const refractorColumnScaleStepPercent = clamp(
    config.refractorColumnScaleStepPercent,
    0,
    20,
  );
  const sharedConfigBindings = useAbstractDesignConfigBindings(
    ABSTRACT_DESIGN_CONFIG_BINDING_KEYS_BY_PAGE.abstract,
  );
  const localComponentConfigBindings = useMemo(() => [
    createConfigScopeBinding({
      definition: WALL_PANEL,
      value: wallConfig,
      onChange: next => setWallConfig(normalizeWallConfig(next)),
      defaultValue: { ...DEFAULT_WALL_CONFIG, maxColumnWidthPx: wallMaxColumnWidthPx },
    }),
    createConfigScopeBinding({
      definition: FEATURED_WALL_QUOTE_PANEL,
      value: featuredQuoteConfig,
      onChange: next => setFeaturedQuoteConfig(normalizeFeaturedWallQuoteConfig(next)),
    }),
    createConfigScopeBinding({
      definition: BOTTOM_BANNER_QUOTE_PANEL,
      value: bottomBannerQuoteDesign,
      onChange: setBottomBannerQuoteDesign,
    }),
    createConfigScopeBinding({
      definition: PRACTICE_QUOTE_PANEL,
      value: editorialQuoteDesigns.practice,
      onChange: next => setEditorialQuoteDesign('practice', next),
    }),
    createConfigScopeBinding({
      definition: PRACTICES_SECTION_LAYOUT_PANEL,
      value: practicesLayoutConfig,
      onChange: next => setPracticesLayoutConfig(normalizePracticesSectionLayoutConfig(next)),
    }),
    createConfigScopeBinding({
      definition: SECTION_HEADING_APPEARANCE_DEFINITION,
      value: collectionHeadingConfig,
      onChange: setCollectionHeadingConfig,
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_EDITORIAL_HERO_LAYOUT_DEFINITION,
      // Same scope/definition, bound to whichever state is actually live —
      // PLAN-SPLIT-COLUMN-UX-REFINEMENTS.md 2.2. One panel section, not two
      // simultaneously-visible "Editorial hero" entries, since only one
      // branch's hero ever renders at a time.
      value: abstractPageLayoutConfig.presentationMode === 'splitColumn'
        ? splitColumnHeroConfig
        : editorialHeroConfig,
      onChange: abstractPageLayoutConfig.presentationMode === 'splitColumn'
        ? setSplitColumnHeroConfig
        : setEditorialHeroConfig,
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_SITE_HEADER_COLOR_OVERRIDE_PANEL,
      value: siteHeaderColorOverride,
      onChange: setSiteHeaderColorOverride,
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_CTA_BUTTON_COLOR_OVERRIDE_PANEL,
      value: ctaButtonColorOverride,
      onChange: setCtaButtonColorOverride,
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_HERO_CTA_COMPOSER_ENTRANCE_DEFINITION,
      value: heroCtaComposerConfig,
      onChange: setHeroCtaComposerConfig,
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_POST_DOCK_INTRODUCTION_DEFINITION,
      value: dockIntroductionConfig,
      onChange: setDockIntroductionConfig,
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_POST_DOCK_GRADIENT_PERFORMANCE_DEFINITION,
      value: dockGradientPerformanceConfig,
      onChange: setDockGradientPerformanceConfig,
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_POST_DOCK_PALETTE_DEFINITION,
      value: dockPaletteConfig,
      onChange: setDockPaletteConfig,
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_POST_DOCK_MESH_GEOMETRY_DEFINITION,
      value: dockMeshGeometryConfig,
      onChange: setDockMeshGeometryConfig,
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_POST_DOCK_HUE_INFLUENCE_DEFINITION,
      value: dockHueInfluenceConfig,
      onChange: setDockHueInfluenceConfig,
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_POST_DOCK_LAYOUT_DEFINITION,
      value: dockLayoutConfig,
      onChange: setDockLayoutConfig,
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_POST_DOCK_HOLOGRAM_DEFINITION,
      value: dockHologramConfig,
      onChange: setDockHologramConfig,
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_JOURNAL_LAB_COLLECTION_DEFINITION,
      value: journalLabCollectionConfig,
      onChange: setJournalLabCollectionConfig,
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_DEFINITION,
      value: journalLabCollectionSliderConfig,
      onChange: setJournalLabCollectionSliderConfig,
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_METAL_LAB_CARD_DEFINITION,
      value: labCardConfig,
      onChange: setLabCardConfig,
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_LAB_SECTION_APPEARANCE_DEFINITION,
      value: labSectionConfig,
      onChange: setLabSectionConfig,
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_PAGE_LAYOUT_DEFINITION,
      value: abstractPageLayoutConfig,
      onChange: setAbstractPageLayoutConfig,
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_NARROW_COLUMN_STACK_DEFINITION,
      value: abstractNarrowColumnStackConfig,
      onChange: setAbstractNarrowColumnStackConfig,
      defaultValue: normalizeAbstractNarrowColumnStackConfig(
        DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG,
      ),
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_COVER_FLOW_TIMELINE_SLOT_DEFINITION,
      value: abstractCoverFlowTimelineSlotConfig,
      onChange: setAbstractCoverFlowTimelineSlotConfig,
      defaultValue: normalizeAbstractCoverFlowTimelineSlotConfig(
        DEFAULT_ABSTRACT_COVER_FLOW_TIMELINE_SLOT_CONFIG,
      ),
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_TIMELINE_LINK_COLOR_DEFINITION,
      value: abstractTimelineLinkColorConfig,
      onChange: setAbstractTimelineLinkColorConfig,
      defaultValue: normalizeAbstractTimelineLinkColorConfig(
        DEFAULT_ABSTRACT_TIMELINE_LINK_COLOR_CONFIG,
      ),
    }),
    createConfigScopeBinding({
      definition: abstractConfigPanelRegistry.resolve(ABSTRACT_FOOTER_SCOPE_ID),
      value: abstractFooterConfig,
      onChange: setAbstractFooterConfig,
      defaultValue: normalizeAbstractFooterConfig({
        ...DEFAULT_ABSTRACT_FOOTER_CONFIG,
        ...footerConfigOverrides,
      }),
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_POLYMORPHIC_LAYOUT_PANEL,
      value: splitColumnLayoutConfig,
      onChange: next => setSplitColumnLayoutConfig(previous => (
        applyAbstractPolymorphicLayoutAllSizesUpdate(previous, next)
      )),
      onReset: () => setSplitColumnLayoutConfig(WALL_POLYMORPHIC_LAYOUT_CONFIG),
    }),
    createConfigScopeBinding({
      definition: COVER_FLOW_DEFINITION,
      value: coverFlowConfig,
      onChange: setCoverFlowConfig,
      defaultValue: DEFAULT_WALL_COVER_FLOW_CONFIG,
    }),
    createConfigScopeBinding({
      definition: abstractConfigPanelRegistry.resolve(MOBILE_PINNED_ARTICLE_SECTION_SCOPE_ID),
      value: mobilePinnedArticleSectionConfig,
      onChange: setMobilePinnedArticleSectionConfig,
      defaultValue: normalizeMobilePinnedArticleSectionConfig(
        DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG,
      ),
    }),
    createConfigScopeBinding({
      definition: SPLIT_COLUMN_CARD_STACK_DEFINITION,
      value: splitColumnCardStackConfig,
      onChange: setSplitColumnCardStackConfig,
      defaultValue: normalizeSplitColumnCardStackConfig(DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG),
    }),
    createConfigScopeBinding({
      definition: CARD_APPEARANCE_DEFINITION,
      value: cardAppearanceConfig,
      onChange: setCardAppearanceConfig,
      defaultValue: normalizeCardAppearanceConfig(DEFAULT_ABSTRACT_CARD_APPEARANCE_CONFIG),
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_HERO_ACCORDION_ITEM_DEFINITION,
      value: heroAccordionItemConfig,
      onChange: setHeroAccordionItemConfig,
      defaultValue: normalizeAboutMobileAccordionConfig(DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG),
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_TIMELINE_DEFINITION,
      value: abstractTimelineConfig,
      onChange: setAbstractTimelineConfig,
      defaultValue: normalizeAbstractTimelineConfig(DEFAULT_ABSTRACT_TIMELINE_CONFIG),
    }),
    createConfigScopeBinding({
      definition: abstractConfigPanelRegistry.resolve(ABSTRACT_TIMELINE_CONTENT_SCOPE_ID),
      value: abstractTimelineContentConfig,
      onChange: setAbstractTimelineContentConfig,
      defaultValue: normalizeAbstractTimelineContentConfig(DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG),
    }),
    createConfigScopeBinding({
      definition: abstractConfigPanelRegistry.resolve(ABSTRACT_MOBILE_ARTICLE_LIST_INK_SCOPE_ID),
      value: mobileArticleListInkConfig,
      onChange: setMobileArticleListInkConfig,
      defaultValue: normalizeAbstractMobileArticleListInkConfig(DEFAULT_ABSTRACT_MOBILE_ARTICLE_LIST_INK_CONFIG),
    }),
  ], [
    wallConfig,
    featuredQuoteConfig,
    wallMaxColumnWidthPx,
    bottomBannerQuoteDesign,
    editorialQuoteDesigns.practice,
    practicesLayoutConfig,
    dockGradientPerformanceConfig,
    dockIntroductionConfig,
    dockMeshGeometryConfig,
    dockPaletteConfig,
    dockHueInfluenceConfig,
    dockLayoutConfig,
    dockHologramConfig,
    journalLabCollectionConfig,
    journalLabCollectionSliderConfig,
    labCardConfig,
    labSectionConfig,
    collectionHeadingConfig,
    editorialHeroConfig,
    splitColumnHeroConfig,
    coverFlowConfig,
    mobilePinnedArticleSectionConfig,
    cardAppearanceConfig,
    abstractTimelineConfig,
    siteHeaderColorOverride,
    ctaButtonColorOverride,
    heroCtaComposerConfig,
    abstractPageLayoutConfig,
    abstractNarrowColumnStackConfig,
    abstractCoverFlowTimelineSlotConfig,
    abstractTimelineLinkColorConfig,
    abstractFooterConfig,
    footerConfigOverrides,
    abstractTimelineContentConfig,
    mobileArticleListInkConfig,
    splitColumnLayoutConfig,
    splitColumnCardStackConfig,
    heroAccordionItemConfig,
  ]);
  const applicableConfigBindings = useMemo(
    () => [...sharedConfigBindings, ...localComponentConfigBindings],
    [sharedConfigBindings, localComponentConfigBindings],
  );
  const componentConfigBindings = useConfigPanelBindings(applicableConfigBindings);

  configRef.current = config;
  headingGradientConfigRef.current = headingGradientConfig;
  twilightGradientRef.current = twilightGradient;

  useEffect(() => {
    gradientSnapshotFrozenRef.current = gradientSnapshotFrozen;
  }, [gradientSnapshotFrozen]);

  useEffect(() => {
    adaptiveHeroInkTonesRef.current = adaptiveHeroInkTones;
  }, [adaptiveHeroInkTones]);

  useEffect(() => {
    if (backgroundAwarenessActive) return;
    const next = { header: heroTone, content: heroTone, actions: heroTone };
    adaptiveHeroInkTonesRef.current = next;
    setAdaptiveHeroInkTones(next);
  }, [backgroundAwarenessActive, heroTone]);

  useEffect(() => {
    if (config.skyRenderMode === 'legacy') return;

    gradientSnapshotFrozenRef.current = false;
    frozenGradientFrameRef.current = null;
    frozenGradientLayerSourcesRef.current = null;
    setGradientSnapshotFrozen(false);
  }, [config.skyRenderMode]);

  const updateConfig = useCallback(<K extends keyof GradientDesignerConfig,>(key: K, value: GradientDesignerConfig[K]) => {
    setConfig(previous => ({ ...previous, [key]: value }));
  }, []);

  const updateActiveDesignerConfig = useCallback(<K extends keyof GradientDesignerConfig,>(
    key: K,
    value: GradientDesignerConfig[K],
  ) => {
    if (designerEditsCustomHeading) {
      setHeadingGradientConfig(previous => ({ ...previous, [key]: value }));
      return;
    }
    updateConfig(key, value);
  }, [designerEditsCustomHeading, updateConfig]);

  const resetActiveDesignerView = useCallback(() => {
    const update = designerEditsCustomHeading ? setHeadingGradientConfig : setConfig;
    update(previous => ({
      ...previous,
      viewZoom: DEFAULT_GRADIENT_DESIGNER_CONFIG.viewZoom,
      viewOffsetX: DEFAULT_GRADIENT_DESIGNER_CONFIG.viewOffsetX,
      viewOffsetY: DEFAULT_GRADIENT_DESIGNER_CONFIG.viewOffsetY,
    }));
  }, [designerEditsCustomHeading]);

  const resetConfig = useCallback(() => {
    setConfig({ ...DEFAULT_GRADIENT_DESIGNER_CONFIG });
    setHeadingGradientConfig({ ...DEFAULT_GRADIENT_DESIGNER_CONFIG });
    setGradientDesignerTarget('background');
    setPanelShellConfig({ ...DEFAULT_PANEL_SHELL_CONFIG });
    setPageSurfaceConfig({ ...DEFAULT_PAGE_SURFACE_CONFIG });
    setGlobalTypographyConfig({ ...DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG });
    setLayoutDebugConfig({ ...DEFAULT_LAYOUT_DEBUG_CONFIG });
    setEditorialHeroConfig({
      ...DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG,
    });
    setSplitColumnHeroConfig({
      ...DEFAULT_ABSTRACT_EDITORIAL_HERO_CONFIG,
    });
    setCtaButtonConfig({ ...DEFAULT_CTA_BUTTON_CONFIG });
    setCollectionHeadingConfig({
      ...DEFAULT_SECTION_HEADING_CONFIG,
    });
    setSiteHeaderConfig({
      ...DEFAULT_SITE_HEADER_CONFIG,
    });
    setWordmarkConfig({
      ...DEFAULT_WORDMARK_CONFIG,
    });
    setSiteHeaderColorOverride({
      ...ABSTRACT_SITE_HEADER_COLOR_OVERRIDE_CONFIG,
    });
    setCtaButtonColorOverride({
      ...ABSTRACT_CTA_BUTTON_COLOR_OVERRIDE_CONFIG,
    });
    setDockIntroductionConfig({
      ...DEFAULT_ABSTRACT_POST_DOCK_INTRODUCTION_CONFIG,
    });
    setDockGradientPerformanceConfig({
      ...DEFAULT_ABSTRACT_POST_DOCK_GRADIENT_PERFORMANCE_CONFIG,
    });
    setDockPaletteConfig({
      ...DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG,
    });
    setDockMeshGeometryConfig({
      ...DEFAULT_ABSTRACT_POST_DOCK_MESH_GEOMETRY_CONFIG,
    });
    setDockHueInfluenceConfig({
      ...DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG,
    });
    setJournalLabCollectionConfig({
      ...DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG,
    });
    setJournalLabCollectionSliderConfig({
      ...DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_SLIDER_CONFIG,
    });
    setLabCardConfig({
      ...DEFAULT_ABSTRACT_METAL_LAB_CARD_CONFIG,
    });
    setCardAppearanceConfig(
      normalizeCardAppearanceConfig(DEFAULT_ABSTRACT_CARD_APPEARANCE_CONFIG),
    );
    setBottomBannerQuoteDesign(DEFAULT_BOTTOM_BANNER_QUOTE_CONFIG);
    setFeaturedQuoteConfig(DEFAULT_FEATURED_WALL_QUOTE_CONFIG);
    setAbstractPageLayoutConfig(
      normalizeAbstractPageLayoutConfig(DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG),
    );
    setAbstractNarrowColumnStackConfig(
      normalizeAbstractNarrowColumnStackConfig(DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG),
    );
    setAbstractFooterConfig(
      normalizeAbstractFooterConfig({
        ...DEFAULT_ABSTRACT_FOOTER_CONFIG,
        ...footerConfigOverrides,
      }),
    );
    setAbstractTimelineContentConfig(
      normalizeAbstractTimelineContentConfig(DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG),
    );
    setSplitColumnLayoutConfig(WALL_POLYMORPHIC_LAYOUT_CONFIG);
  }, [
    setCtaButtonConfig,
    setGlobalTypographyConfig,
    setLayoutDebugConfig,
    setPageSurfaceConfig,
    setPanelShellConfig,
    setSiteHeaderConfig,
    setWordmarkConfig,
    footerConfigOverrides,
  ]);

  const randomizeActiveDesignerSeed = useCallback(() => {
    const update = designerEditsCustomHeading ? setHeadingGradientConfig : setConfig;
    update(previous => ({ ...previous, seed: Number(Math.random().toFixed(3)) }));
  }, [designerEditsCustomHeading]);

  const handleHeadingGradientRelationshipChange = useCallback((
    relationship: 'linked' | 'custom',
  ) => {
    setEditorialHeroConfig(previous => ({
      ...previous,
      headlineGradientRelationship: relationship,
    }));
  }, []);

  const syncHeadingGradientFromLegacy = useCallback(() => {
    setHeadingGradientConfig({ ...configRef.current });
  }, []);

  const handleSnapshotGradient = useCallback(() => {
    const frame = liveGradientFrameRef.current;
    const atlasCanvas = snapshotAtlasRef.current;
    if (!frame || !atlasCanvas) return;

    const frozenLayerSources = frame.layerFaceIndices.map(faceIndex => {
      const sourceIndex = ((faceIndex % frame.atlasCellCount) + frame.atlasCellCount) % frame.atlasCellCount;
      const sourceY = sourceIndex * frame.sourceHeight;
      const sourceCanvas = document.createElement('canvas');
      const sourceContext = sourceCanvas.getContext('2d');

      sourceCanvas.width = frame.sourceWidth;
      sourceCanvas.height = frame.sourceHeight;
      sourceContext?.drawImage(
        atlasCanvas,
        0,
        sourceY,
        frame.sourceWidth,
        frame.sourceHeight,
        0,
        0,
        frame.sourceWidth,
        frame.sourceHeight,
      );

      return sourceCanvas;
    });

    frozenGradientLayerSourcesRef.current = frozenLayerSources;
    frozenGradientFrameRef.current = { ...frame, capturedAt: performance.now() };
    gradientSnapshotFrozenRef.current = true;
    setGradientSnapshotFrozen(true);
    paintGradientSnapshotFrame({
      layerCanvases: gradientSnapshotLayerRefs.current,
      frame: frozenGradientFrameRef.current,
      atlasCanvas: null,
      frozenLayerSources,
      pixelSize: gradientViewportPixelSizeRef.current,
    });
    paintLegacyCompositeFrame({
      layerCanvases: gradientSnapshotLayerRefs.current,
      pixelSize: gradientViewportPixelSizeRef.current,
      targetCanvas: legacyCompositeCanvasRef.current,
    });
  }, []);

  const handleResumeLiveGradient = useCallback(() => {
    frozenGradientFrameRef.current = null;
    frozenGradientLayerSourcesRef.current = null;
    gradientSnapshotFrozenRef.current = false;
    setGradientSnapshotFrozen(false);
    paintGradientSnapshotFrame({
      layerCanvases: gradientSnapshotLayerRefs.current,
      frame: liveGradientFrameRef.current,
      atlasCanvas: snapshotAtlasRef.current,
      pixelSize: gradientViewportPixelSizeRef.current,
    });
    paintLegacyCompositeFrame({
      layerCanvases: gradientSnapshotLayerRefs.current,
      pixelSize: gradientViewportPixelSizeRef.current,
      targetCanvas: legacyCompositeCanvasRef.current,
    });
  }, []);

  const handlePreviewModeChange = useCallback((mode: 'live' | 'snapshot') => {
    if (mode === 'snapshot') {
      handleSnapshotGradient();
      return;
    }
    handleResumeLiveGradient();
  }, [handleResumeLiveGradient, handleSnapshotGradient]);

  useEffect(() => {
    if (config.skyRenderMode !== 'legacy') return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      stencil: false,
    });

    if (!gl) return undefined;

    const gradientProgram = createAbstractLegacyGradientProgram(gl);
    if (!gradientProgram || gradientProgram.vertexPositionAttribute < 0) return undefined;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const snapshotAtlasCanvas = document.createElement('canvas');
    const snapshotGl = snapshotAtlasCanvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      stencil: false,
    });
    const snapshotProgram = snapshotGl
      ? createAbstractLegacyGradientProgram(snapshotGl)
      : null;
    snapshotAtlasRef.current = snapshotProgram ? snapshotAtlasCanvas : null;
    const headingCompositeCanvas = document.createElement('canvas');
    const headingLayerCanvases: HTMLCanvasElement[] = [];
    const headingRuntime = createLegacyGradientRuntime(
      headingGradientConfigRef.current,
      !prefersReducedMotion,
    );
    headingGradientCompositeCanvasRef.current = headingCompositeCanvas;

    let animationFrame = 0;
    let lastFrame = performance.now();
    let shaderTime = 0;
    let paletteIntervention = 0;
    let paletteTarget = 0;
    let nextPaletteEvaluationAt = 0;
    let cachedGridAtlasPlan: ProceduralColorAtlasLayout | null = null;
    let cachedGridAtlasPlanKey = '';
    let nextHeroInkEvaluationAt = 0;
    let isVisible = true;
    let isDocumentVisible = !document.hidden;
    let lastPaletteConfig: GradientDesignerConfig | null = null;
    let lastPaletteInteractionAt = Number.NEGATIVE_INFINITY;
    const paletteEvaluator = new AbstractLegacyPaletteEvaluator();
    const paletteCadence = new AbstractPaletteCadenceController();
    let paletteCadenceSettings = getAbstractPaletteCadenceSettings(
      configRef.current,
      !prefersReducedMotion,
    );
    const intersectionObserver = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(entries => {
        isVisible = entries[0]?.isIntersecting ?? true;
        if (isVisible) nextPaletteEvaluationAt = 0;
      }, { rootMargin: '160px' });
    const handleVisibilityChange = () => {
      isDocumentVisible = !document.hidden;
      if (isDocumentVisible) nextPaletteEvaluationAt = 0;
    };
    const markPaletteInteraction = () => {
      lastPaletteInteractionAt = performance.now();
    };

    intersectionObserver?.observe(canvas);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pointerdown', markPaletteInteraction, { passive: true });
    window.addEventListener('wheel', markPaletteInteraction, { passive: true });
    window.addEventListener('scroll', markPaletteInteraction, { passive: true });
    window.addEventListener('keydown', markPaletteInteraction);

    const render = (now: number) => {
      animationFrame = 0;
      const currentConfig = configRef.current;
      const currentOverlayFaceCount = getGradientFaceCount(currentConfig);
      const dt = Math.min(Math.max((now - lastFrame) / 1000, 0), 0.1);
      lastFrame = now;
      if (currentConfig !== lastPaletteConfig) {
        lastPaletteConfig = currentConfig;
        paletteCadenceSettings = getAbstractPaletteCadenceSettings(
          currentConfig,
          !prefersReducedMotion,
        );
        nextPaletteEvaluationAt = 0;
      }

      const bufferSize = resolveCanvasBufferSize(canvas, currentConfig.shaderColorResolution);
      if (canvas.width !== bufferSize.width) canvas.width = bufferSize.width;
      if (canvas.height !== bufferSize.height) canvas.height = bufferSize.height;
      gradientViewportPixelSizeRef.current = bufferSize;

      const cadenceEnabled = paletteCadenceSettings.enabled;
      const structuralSpeed = cadenceEnabled
        ? clamp(currentConfig.legacyPaletteCadenceIdleSpeed, 0, 0.4)
        : clamp(currentConfig.shaderColorSpeed, 0, 3);
      const cadenceCanAdvance = isVisible && isDocumentVisible &&
        !gradientSnapshotFrozenRef.current;
      const cadenceCanStartTransition = now - lastPaletteInteractionAt >= clamp(
        currentConfig.legacyPaletteCadenceInteractionQuietMs,
        0,
        10000,
      );
      shaderTime += dt * structuralSpeed;
      const palettePhase = paletteCadence.advance(
        cadenceCanAdvance ? dt * 1000 : 0,
        paletteCadenceSettings,
        cadenceCanStartTransition,
      );

      let emergencyPaletteCorrection = false;
      if (!currentConfig.legacyPaletteGuardEnabled) {
        paletteTarget = 0;
      } else if (
        isVisible &&
        isDocumentVisible &&
        !gradientSnapshotFrozenRef.current &&
        now >= nextPaletteEvaluationAt
      ) {
        const lookAheadSeconds = clamp(currentConfig.legacyPaletteLookAheadMs, 0, 2000) / 1000;
        const lookAheadShaderTime = shaderTime +
          lookAheadSeconds * structuralSpeed;
        const lookAheadPalettePhase = paletteCadence.project(
          lookAheadSeconds * 1000,
          paletteCadenceSettings,
          cadenceCanStartTransition,
        );
        const paletteLimits = getAbstractLegacyPaletteLimits(currentConfig);
        const paletteResolution = paletteEvaluator.resolve(
          getAbstractLegacyPaletteField(
            currentConfig,
            palettePhase,
            currentOverlayFaceCount,
          ),
          shaderTime,
          lookAheadShaderTime,
          paletteLimits,
          getAbstractLegacyPaletteField(
            currentConfig,
            lookAheadPalettePhase,
            currentOverlayFaceCount,
          ),
        );
        paletteTarget = paletteResolution.amount;
        emergencyPaletteCorrection = paletteResolution.current.yellowCoverage >
          paletteLimits.maximumYellowCoverage;
        if (emergencyPaletteCorrection) paletteIntervention = paletteTarget;
        nextPaletteEvaluationAt = now + (paletteTarget > 0 ? 120 : 360);
      }
      if (!emergencyPaletteCorrection) {
        paletteIntervention = smoothPaletteIntervention(
          paletteIntervention,
          paletteTarget,
          dt,
          clamp(currentConfig.legacyPaletteAttackMs, 100, 1500),
          clamp(currentConfig.legacyPaletteReleaseMs, 300, 3000),
        );
      }


      if (
        currentConfig.heroBackgroundAwarenessEnabled &&
        isVisible &&
        isDocumentVisible &&
        !gradientSnapshotFrozenRef.current &&
        now >= nextHeroInkEvaluationAt
      ) {
        const field = getAbstractLegacyPaletteField(
          currentConfig,
          palettePhase,
          currentOverlayFaceCount,
        );
        const firstRowField = getAbstractLegacyPaletteField(
          currentConfig,
          palettePhase,
          currentOverlayFaceCount,
          getFirstRowColorOverrides(currentConfig),
        );
        const brightThreshold = clamp(
          Math.max(
            currentConfig.heroBackgroundAwarenessBrightThreshold,
            currentConfig.heroBackgroundAwarenessDarkThreshold + 0.05,
          ),
          0.2,
          0.9,
        );
        const darkThreshold = clamp(
          Math.min(
            currentConfig.heroBackgroundAwarenessDarkThreshold,
            brightThreshold - 0.05,
          ),
          0.1,
          0.8,
        );
        const currentTones = adaptiveHeroInkTonesRef.current;
        const headerSamplePoints = currentConfig.heroLayoutMode === 'editorial'
          ? ABSTRACT_HERO_HEADER_SAMPLE_POINTS.map(point => ({
            x: point.x,
            y: remapProceduralColorTopRowY(
              point.y,
              currentConfig.editorialSourceRow,
              currentOverlayFaceCount,
            ),
          }))
          : ABSTRACT_HERO_HEADER_SAMPLE_POINTS;
        const headerLightness = paletteEvaluator.evaluateLightness(
          firstRowField,
          shaderTime,
          paletteIntervention,
          headerSamplePoints,
        );
        const nextTones: AdaptiveHeroInkTones = {
          header: resolveAdaptiveHeroInkTone(
            currentTones.header,
            headerLightness,
            brightThreshold,
            darkThreshold,
          ),
          content: resolveAdaptiveHeroInkTone(
            currentTones.content,
            currentConfig.heroLayoutMode === 'editorial'
              ? 0
              : paletteEvaluator.evaluateLightness(
                field,
                shaderTime,
                paletteIntervention,
                ABSTRACT_HERO_CONTENT_SAMPLE_POINTS,
              ),
            brightThreshold,
            darkThreshold,
          ),
          actions: resolveAdaptiveHeroInkTone(
            currentTones.actions,
            currentConfig.heroLayoutMode === 'editorial'
              ? 0
              : paletteEvaluator.evaluateLightness(
                field,
                shaderTime,
                paletteIntervention,
                ABSTRACT_HERO_ACTION_SAMPLE_POINTS,
              ),
            brightThreshold,
            darkThreshold,
          ),
        };
        if (
          nextTones.header !== currentTones.header ||
          nextTones.content !== currentTones.content ||
          nextTones.actions !== currentTones.actions
        ) {
          adaptiveHeroInkTonesRef.current = nextTones;
          setAdaptiveHeroInkTones(nextTones);
        }
        nextHeroInkEvaluationAt = now + 250;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(gradientProgram.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, gradientProgram.vertexBuffer);
      gl.enableVertexAttribArray(gradientProgram.vertexPositionAttribute);
      gl.vertexAttribPointer(gradientProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

      applyGradientUniforms({
        gl,
        gradientProgram,
        config: currentConfig,
        width: canvas.width,
        height: canvas.height,
        shaderTime,
        variation: clamp(currentConfig.shaderColorVariation, 0, 0.4),
      });
      applyAbstractLegacyPaletteGuardUniforms(
        gl,
        gradientProgram,
        paletteIntervention,
        -0.5,
        palettePhase,
      );
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.flush();
      markHeroRendererReady();

      const currentEditorialHeroConfig = editorialHeroConfigRef.current;
      if (
        snapshotGl &&
        snapshotProgram &&
        currentConfig.heroContentEnabled &&
        currentConfig.heroLayoutMode !== 'grid' &&
        currentEditorialHeroConfig.headlineGradientRelationship === 'custom' &&
        !gradientSnapshotFrozenRef.current
      ) {
        const customConfig = headingGradientConfigRef.current;
        const customOverlayFaceCount = getGradientFaceCount(customConfig);
        const customBufferSize = resolveCanvasBufferSize(
          canvas,
          customConfig.shaderColorResolution,
        );
        const customCanAdvance = isVisible && isDocumentVisible;
        const customPalettePhase = advanceLegacyGradientRuntime({
          canAdvance: customCanAdvance,
          canStartTransition: now - lastPaletteInteractionAt >= clamp(
            customConfig.legacyPaletteCadenceInteractionQuietMs,
            0,
            10000,
          ),
          config: customConfig,
          dt,
          motionAllowed: !prefersReducedMotion,
          now,
          overlayFaceCount: customOverlayFaceCount,
          runtime: headingRuntime,
        });
        const customFrame = renderLegacyGradientAtlasFrame({
          atlasCanvas: snapshotAtlasCanvas,
          capturedAt: now,
          config: customConfig,
          gl: snapshotGl,
          overlayFaceCount: customOverlayFaceCount,
          paletteIntervention: headingRuntime.intervention,
          palettePhase: customPalettePhase,
          program: snapshotProgram,
          shaderTime: headingRuntime.shaderTime,
          sourceHeight: customBufferSize.height,
          sourceWidth: customBufferSize.width,
        });
        while (headingLayerCanvases.length < customFrame.layerFaceIndices.length) {
          headingLayerCanvases.push(document.createElement('canvas'));
        }
        paintGradientSnapshotFrame({
          layerCanvases: headingLayerCanvases,
          frame: customFrame,
          atlasCanvas: snapshotAtlasCanvas,
          pixelSize: customBufferSize,
        });
        paintLegacyCompositeFrame({
          layerCanvases: headingLayerCanvases,
          pixelSize: customBufferSize,
          targetCanvas: headingCompositeCanvas,
        });
        liveHeadingGradientFrameRef.current = customFrame;
      }

      if (snapshotGl && snapshotProgram && currentConfig.heroLayoutMode === 'grid') {
        const totalCells = Math.max(4, currentOverlayFaceCount);
        const cellResolutionPx = currentConfig.shaderColorResolution;
        const atlasPlanKey = `${totalCells}:${cellResolutionPx}`;

        if (!cachedGridAtlasPlan || cachedGridAtlasPlanKey !== atlasPlanKey) {
          cachedGridAtlasPlan = resolveGradientGridAtlasPlan({
            gl: snapshotGl,
            cellCount: totalCells,
            cellResolutionPx,
          });
          cachedGridAtlasPlanKey = atlasPlanKey;
        }

        const atlasPlan = cachedGridAtlasPlan;

        if (snapshotAtlasCanvas.width !== atlasPlan.width) snapshotAtlasCanvas.width = atlasPlan.width;
        if (snapshotAtlasCanvas.height !== atlasPlan.height) snapshotAtlasCanvas.height = atlasPlan.height;

        snapshotGl.clearColor(0, 0, 0, 0);
        snapshotGl.clear(snapshotGl.COLOR_BUFFER_BIT);
        snapshotGl.useProgram(snapshotProgram.program);
        snapshotGl.bindBuffer(snapshotGl.ARRAY_BUFFER, snapshotProgram.vertexBuffer);
        snapshotGl.enableVertexAttribArray(snapshotProgram.vertexPositionAttribute);
        snapshotGl.vertexAttribPointer(snapshotProgram.vertexPositionAttribute, 2, snapshotGl.FLOAT, false, 0, 0);

        const cellVariations = getProceduralColorLayerVariations({
          faceCount: totalCells,
          shaderColorVariation: clamp(currentConfig.shaderColorVariation, 0, 0.4),
          audioVariation: 0,
          shaderParameterPhase: shaderTime,
          compositionInfluence: 1,
        });

        for (let faceIndex = 0; faceIndex < totalCells; faceIndex += 1) {
          const cellRect = getProceduralColorAtlasCellRect(atlasPlan, faceIndex);
          snapshotGl.viewport(cellRect.viewportX, cellRect.viewportY, cellRect.size, cellRect.size);
          applyGradientUniforms({
            gl: snapshotGl,
            gradientProgram: snapshotProgram,
            config: currentConfig,
            width: cellRect.size,
            height: cellRect.size,
            shaderTime,
            variation: cellVariations[faceIndex] ?? 0,
          });
          const normalizedCell = totalCells > 1
            ? faceIndex / (totalCells - 1) - 0.5
            : 0;
          applyAbstractLegacyPaletteGuardUniforms(
            snapshotGl,
            snapshotProgram,
            paletteIntervention,
            normalizedCell,
            palettePhase,
          );
          snapshotGl.drawArrays(snapshotGl.TRIANGLE_STRIP, 0, 4);
        }
        snapshotGl.flush();

        const nextGridFrame: GradientGridFrame = {
          layerFaceIndices: Array.from({ length: totalCells }, (_, faceIndex) => faceIndex),
          atlasCellCount: totalCells,
          cellResolutionPx: atlasPlan.cellSize,
          capturedAt: now,
        };

        liveGradientGridFrameRef.current = nextGridFrame;

        if (!gradientSnapshotFrozenRef.current) {
          paintGradientGridFrame({
            cellCanvases: gradientGridCellCanvasRefs.current,
            frame: nextGridFrame,
            atlasCanvas: snapshotAtlasCanvas,
            atlasLayout: atlasPlan,
          });
        }
      } else if (snapshotGl && snapshotProgram) {
        const overlayCount = currentOverlayFaceCount;
        const sourceWidth = bufferSize.width;
        const sourceHeight = bufferSize.height;
        const nextGradientFrame = renderLegacyGradientAtlasFrame({
          atlasCanvas: snapshotAtlasCanvas,
          capturedAt: now,
          config: currentConfig,
          gl: snapshotGl,
          overlayFaceCount: overlayCount,
          paletteIntervention,
          palettePhase,
          program: snapshotProgram,
          shaderTime,
          sourceHeight,
          sourceWidth,
        });

        liveGradientFrameRef.current = nextGradientFrame;

        if (!gradientSnapshotFrozenRef.current) {
          paintGradientSnapshotFrame({
            layerCanvases: gradientSnapshotLayerRefs.current,
            frame: nextGradientFrame,
            atlasCanvas: snapshotAtlasCanvas,
            pixelSize: bufferSize,
          });
          paintLegacyCompositeFrame({
            layerCanvases: gradientSnapshotLayerRefs.current,
            pixelSize: bufferSize,
            targetCanvas: legacyCompositeCanvasRef.current,
          });
        }
      }

      if (currentConfig.heroContentEnabled && currentConfig.heroLayoutMode !== 'grid') {
        const customHeadline = currentEditorialHeroConfig.headlineGradientRelationship === 'custom';
        const headlineFrame = customHeadline
          ? liveHeadingGradientFrameRef.current
          : gradientSnapshotFrozenRef.current
            ? frozenGradientFrameRef.current
            : liveGradientFrameRef.current;
        const headlineSourceCanvas = customHeadline
          ? headingGradientCompositeCanvasRef.current
          : legacyCompositeCanvasRef.current;
        paintLegacyGradientHeadline({
          atlasCanvas: null,
          debugCanvas: currentEditorialHeroConfig.headlineGradientDebugEnabled
            ? heroHeadlineDebugCanvasRef.current
            : null,
          debugSizeCssPixels: currentEditorialHeroConfig.headlineGradientDebugSizePx,
          frame: headlineFrame,
          frozenLayerSources: null,
          headlineElement: heroHeadlineRef.current,
          panXPercent: currentEditorialHeroConfig.headlineGradientPanXPercent,
          panYPercent: currentEditorialHeroConfig.headlineGradientPanYPercent,
          pixelRatio: window.devicePixelRatio || 1,
          scale: currentEditorialHeroConfig.headlineGradientScale,
          sourceCanvas: headlineSourceCanvas,
          sourceMode: currentEditorialHeroConfig.headlineGradientSourceMode,
          sourceRow: currentEditorialHeroConfig.headlineGradientSourceRow,
          targetCanvas: heroHeadlineCanvasRef.current,
        });
      }

      const currentHeaderConfig = siteHeaderConfigRef.current;
      const navBandCanvas = heroNavBandCanvasRef.current;
      const navBandSourceCanvas = legacyCompositeCanvasRef.current;
      if (
        currentHeaderConfig.navBandEnabled &&
        currentConfig.heroLayoutMode !== 'grid' &&
        navBandCanvas &&
        navBandSourceCanvas &&
        navBandSourceCanvas.width > 0 &&
        navBandSourceCanvas.height > 0
      ) {
        paintGradientTextureSurface({
          border: false,
          fill: true,
          panXPercent: currentHeaderConfig.navBandPanXPercent,
          panYPercent: currentHeaderConfig.navBandPanYPercent,
          pixelRatio: window.devicePixelRatio || 1,
          scale: currentHeaderConfig.navBandScale,
          sourceCanvas: navBandSourceCanvas,
          sourceRegion: resolveLegacyHeadlineSourceRegion({
            overlayFaceCount: currentOverlayFaceCount,
            sourceHeight: navBandSourceCanvas.height,
            sourceMode: 'band',
            sourceRow: currentHeaderConfig.navBandSourceRow,
            sourceWidth: navBandSourceCanvas.width,
          }),
          targetCanvas: navBandCanvas,
          targetElement: navBandCanvas,
        });
      }

      if (!prefersReducedMotion) {
        scheduleRender();
      }
    };

    const scheduleRender = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(render);
    };

    legacyGradientRenderScheduleRef.current = scheduleRender;
    let resizeFollowUpFrame = 0;
    const scheduleViewportRepaint = () => {
      scheduleRender();
      if (resizeFollowUpFrame) window.cancelAnimationFrame(resizeFollowUpFrame);
      resizeFollowUpFrame = window.requestAnimationFrame(() => {
        resizeFollowUpFrame = 0;
        scheduleRender();
      });
    };
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleViewportRepaint);
    resizeObserver?.observe(canvas);
    if (heroHeadlineRef.current) resizeObserver?.observe(heroHeadlineRef.current);
    if (heroNavBandCanvasRef.current) resizeObserver?.observe(heroNavBandCanvasRef.current);
    window.addEventListener('resize', scheduleViewportRepaint, { passive: true });
    window.visualViewport?.addEventListener('resize', scheduleViewportRepaint, { passive: true });
    scheduleRender();

    return () => {
      if (legacyGradientRenderScheduleRef.current === scheduleRender) {
        legacyGradientRenderScheduleRef.current = null;
      }
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (resizeFollowUpFrame) window.cancelAnimationFrame(resizeFollowUpFrame);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointerdown', markPaletteInteraction);
      window.removeEventListener('wheel', markPaletteInteraction);
      window.removeEventListener('scroll', markPaletteInteraction);
      window.removeEventListener('keydown', markPaletteInteraction);
      window.removeEventListener('resize', scheduleViewportRepaint);
      window.visualViewport?.removeEventListener('resize', scheduleViewportRepaint);
      gl.deleteBuffer(gradientProgram.vertexBuffer);
      gl.deleteProgram(gradientProgram.program);
      if (snapshotProgram && snapshotGl) {
        snapshotGl.deleteBuffer(snapshotProgram.vertexBuffer);
        snapshotGl.deleteProgram(snapshotProgram.program);
      }
      snapshotAtlasRef.current = null;
      headingGradientCompositeCanvasRef.current = null;
      liveGradientFrameRef.current = null;
      liveHeadingGradientFrameRef.current = null;
      frozenGradientFrameRef.current = null;
      frozenGradientLayerSourcesRef.current = null;
    };
  }, [
    abstractPageLayoutConfig.presentationMode,
    config.skyRenderMode,
    markHeroRendererReady,
  ]);

  useEffect(() => {
    legacyGradientRenderScheduleRef.current?.();
  }, [config]);

  useEffect(() => {
    legacyGradientRenderScheduleRef.current?.();
  }, [headingGradientConfig]);

  useEffect(() => {
    legacyGradientRenderScheduleRef.current?.();
  }, [editorialHeroConfig]);

  useEffect(() => {
    legacyGradientRenderScheduleRef.current?.();
  }, [siteHeaderConfig]);

  useEffect(() => {
    if (!heroContentPresentationActive) return undefined;
    const headline = heroHeadlineRef.current;
    if (!headline) return undefined;

    let active = true;
    const scheduleRender = () => {
      if (active) legacyGradientRenderScheduleRef.current?.();
    };
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleRender);

    resizeObserver?.observe(headline);
    document.fonts?.ready.then(scheduleRender);

    return () => {
      active = false;
      resizeObserver?.disconnect();
    };
  }, [heroContentPresentationActive]);

  useEffect(() => {
    if (!heroNavBandActive) return undefined;
    const navBandCanvas = heroNavBandCanvasRef.current;
    if (!navBandCanvas) return undefined;

    const scheduleRender = () => legacyGradientRenderScheduleRef.current?.();
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleRender);
    resizeObserver?.observe(navBandCanvas);
    scheduleRender();

    return () => resizeObserver?.disconnect();
  }, [heroNavBandActive]);

  useEffect(() => {
    if (config.skyRenderMode !== 'living') return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const gl = canvas.getContext('webgl', {
      // Keep the CSS version of the exact same palette visible until the
      // first GPU frame, avoiding a black initialization flash.
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      stencil: false,
    });
    if (!gl) return undefined;

    const gradientProgram = createAtmosphericGradientProgram(gl);
    const paletteTexture = gl.createTexture();
    if (!gradientProgram || gradientProgram.vertexPositionAttribute < 0 || !paletteTexture) {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationFrame = 0;
    let lastFrame = performance.now();
    let shaderTime = 0;
    let isVisible = true;
    let lastGradient: TwilightSkyGradient | null = null;

    const render = (now: number) => {
      animationFrame = 0;
      const currentConfig = configRef.current;
      if (currentConfig.skyPauseWhenOffscreen && !isVisible) {
        lastFrame = now;
        return;
      }

      const currentGradient = twilightGradientRef.current;
      if (!currentGradient) return;
      if (currentGradient !== lastGradient) {
        uploadTwilightPalette(gl, paletteTexture, currentGradient);
        lastGradient = currentGradient;
      }

      const dt = Math.min(Math.max((now - lastFrame) / 1000, 0), 0.1);
      lastFrame = now;
      if (!prefersReducedMotion) {
        shaderTime += dt * clamp(currentConfig.skyMotionSpeed, 0, 0.4);
      }

      const bufferSize = resolveCanvasBufferSize(canvas, currentConfig.skyResolution);
      if (canvas.width !== bufferSize.width) canvas.width = bufferSize.width;
      if (canvas.height !== bufferSize.height) canvas.height = bufferSize.height;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(gradientProgram.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, gradientProgram.vertexBuffer);
      gl.enableVertexAttribArray(gradientProgram.vertexPositionAttribute);
      gl.vertexAttribPointer(
        gradientProgram.vertexPositionAttribute,
        2,
        gl.FLOAT,
        false,
        0,
        0,
      );
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
      applyAtmosphericGradientUniforms({
        gl,
        gradientProgram,
        config: currentConfig,
        width: canvas.width,
        height: canvas.height,
        shaderTime,
      });
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.flush();
      markHeroRendererReady();

      if (!prefersReducedMotion) animationFrame = window.requestAnimationFrame(render);
    };

    const scheduleRender = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(render);
    };
    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(entries => {
        isVisible = entries[0]?.isIntersecting ?? true;
        if (isVisible || !configRef.current.skyPauseWhenOffscreen) scheduleRender();
      }, { threshold: 0.01 });

    observer?.observe(canvas);
    scheduleRender();

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      observer?.disconnect();
      gl.deleteTexture(paletteTexture);
      gl.deleteBuffer(gradientProgram.vertexBuffer);
      gl.deleteProgram(gradientProgram.program);
    };
  }, [
    abstractPageLayoutConfig.presentationMode,
    config.seed,
    config.skyBreathAmount,
    config.skyDitherStrength,
    config.skyDriftAmount,
    config.skyMotionSpeed,
    config.skyOriginXPercent,
    config.skyOriginYPercent,
    config.skyPauseWhenOffscreen,
    config.skyRadiusXPercent,
    config.skyRadiusYPercent,
    config.skyRenderMode,
    config.skyResolution,
    config.skyTurbulence,
    twilightGradient,
    markHeroRendererReady,
  ]);

  useEffect(() => {
    if (config.skyRenderMode !== 'glass') return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      // Static playback has no continuous frame loop, so retain its completed
      // frame. Dynamic playback uses the same context and shader path.
      preserveDrawingBuffer: true,
      stencil: false,
    });
    if (!gl) return undefined;

    const gradientProgram = createGlassGradientProgram(gl);
    if (!gradientProgram || gradientProgram.vertexPositionAttribute < 0) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationFrame = 0;
    let elapsedTime = 0;
    let lastFrame = performance.now();
    let isVisible = true;

    const render = (now: number) => {
      animationFrame = 0;
      const currentConfig = configRef.current;
      if (currentConfig.skyRenderMode !== 'glass') return;
      const isDynamic = currentConfig.glassPlayback === 'dynamic' && !prefersReducedMotion;
      if (isDynamic && currentConfig.glassPauseWhenOffscreen && !isVisible) {
        lastFrame = now;
        return;
      }

      const dt = Math.min(Math.max((now - lastFrame) / 1000, 0), 0.1);
      lastFrame = now;
      if (isDynamic) elapsedTime += dt * clamp(currentConfig.glassSpeed, 0, 3);

      const bufferSize = resolveCanvasBufferSize(canvas, currentConfig.glassResolution);
      if (canvas.width !== bufferSize.width) canvas.width = bufferSize.width;
      if (canvas.height !== bufferSize.height) canvas.height = bufferSize.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(gradientProgram.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, gradientProgram.vertexBuffer);
      gl.enableVertexAttribArray(gradientProgram.vertexPositionAttribute);
      gl.vertexAttribPointer(
        gradientProgram.vertexPositionAttribute,
        2,
        gl.FLOAT,
        false,
        0,
        0,
      );
      applyGlassPaletteUniforms(gl, gradientProgram, currentConfig);

      const usesColumns = currentConfig.glassBandOrientation === 'columns';
      const bandSize = Math.round(clamp(currentConfig.glassBandSizePx, 4, 160));
      const bandSpan = usesColumns ? canvas.width : canvas.height;
      const bandCount = Math.ceil(bandSpan / bandSize);
      const displacement = clamp(currentConfig.glassDisplacementDeltaPercent, -40, 40) / 100;
      const direction = clamp(currentConfig.glassDisplacementDirectionDeg, -180, 180) * Math.PI / 180;
      const deltaX = Math.cos(direction) * displacement;
      const deltaY = Math.sin(direction) * displacement;

      gl.enable(gl.SCISSOR_TEST);
      for (let bandIndex = 0; bandIndex < bandCount; bandIndex += 1) {
        const bandOffset = bandIndex * bandSize;
        gl.scissor(
          usesColumns ? bandOffset : 0,
          usesColumns ? 0 : bandOffset,
          usesColumns ? Math.min(bandSize, canvas.width - bandOffset) : canvas.width,
          usesColumns ? canvas.height : Math.min(bandSize, canvas.height - bandOffset),
        );
        applyGradientUniforms({
          gl,
          gradientProgram,
          config: currentConfig,
          width: canvas.width,
          height: canvas.height,
          shaderTime: clamp(currentConfig.glassPhase, 0, 20) + elapsedTime,
          variation: clamp(currentConfig.shaderColorVariation, 0, 0.4),
          offset: {
            x: currentConfig.viewOffsetX + bandIndex * deltaX,
            y: currentConfig.viewOffsetY + bandIndex * deltaY,
          },
        });
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      gl.disable(gl.SCISSOR_TEST);
      gl.flush();
      markHeroRendererReady();

      if (isDynamic) animationFrame = window.requestAnimationFrame(render);
    };

    const scheduleRender = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(render);
    };
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleRender);
    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(entries => {
        isVisible = entries[0]?.isIntersecting ?? true;
        if (isVisible || !configRef.current.glassPauseWhenOffscreen) scheduleRender();
      }, { threshold: 0.01 });

    glassRenderScheduleRef.current = scheduleRender;
    resizeObserver?.observe(canvas);
    observer?.observe(canvas);
    window.addEventListener('resize', scheduleRender, { passive: true });
    scheduleRender();

    return () => {
      glassRenderScheduleRef.current = null;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      observer?.disconnect();
      window.removeEventListener('resize', scheduleRender);
      gl.deleteBuffer(gradientProgram.vertexBuffer);
      gl.deleteProgram(gradientProgram.program);
    };
  }, [
    abstractPageLayoutConfig.presentationMode,
    config.glassPlayback,
    config.skyRenderMode,
    markHeroRendererReady,
  ]);

  useEffect(() => {
    if (config.skyRenderMode === 'glass') glassRenderScheduleRef.current?.();
  }, [config]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    setIsDragging(true);
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };

    const canvas = canvasRef.current;
    const width = Math.max(1, canvas?.clientWidth || window.innerWidth || 1);
    const height = Math.max(1, canvas?.clientHeight || window.innerHeight || 1);

    setConfig(previous => {
      const zoom = Math.max(0.25, previous.viewZoom);
      return {
        ...previous,
        viewOffsetX: clamp(previous.viewOffsetX - dx / width / zoom, -2, 2),
        viewOffsetY: clamp(previous.viewOffsetY + dy / height / zoom, -2, 2),
      };
    });
  }, []);

  const handlePointerEnd = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = { active: false, pointerId: null, x: 0, y: 0 };
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((event: ReactWheelEvent<HTMLCanvasElement>) => {
    if (!event.metaKey && !event.ctrlKey) return;

    event.preventDefault();
    setConfig(previous => ({
      ...previous,
      viewZoom: clamp(previous.viewZoom * Math.exp(-event.deltaY * 0.0012), 0.25, 8),
    }));
  }, []);

  // CoverFlow + the narrow column's AboutTimeline are the split
  // presentation's single carousel and synchronized index. The legacy
  // fixed CardStack no longer mounts.
  const coverFlowPrefersReducedMotion = usePrefersReducedMotion();
  const coverFlowHasHoverPointer = useHasHoverPointer();
  const wallTiltSectionRef = useRef<HTMLElement | null>(null);
  const wallTiltSurfaceRef = useRef<HTMLDivElement | null>(null);
  // The wall moves under the in-flow header only in mobile static mode.
  // Reattach width and masonry observers when this changes its DOM node.
  const mobileStaticHeaderBeforeWall = abstractPageLayoutConfig.presentationMode === 'splitColumn'
    && colors.breakpointTier === 'mobile'
    && splitColumnLayoutConfigForColors.headerScrollBehavior === 'static';
  // Measure outside the optional one-column width cap. Measuring the capped
  // grid would keep it below the two-column threshold forever.
  const { ref: wallWidthRef, rect: wallWidthRect } = useMeasuredElementRect<HTMLDivElement>(
    [mobileStaticHeaderBeforeWall],
  );
  // splitColumnHeaderHeightPx (above) measures PolymorphicLayout's own
  // header WRAPPER -- padded taller than the <header> element it contains
  // (SiteHeader's own marginTop/marginBottom/paddingY classes add real
  // space inside that wrapper around the wordmark/nav). The header overlay
  // needs the <header>'s own real rendered height -- "the height its
  // elements use" -- not the wrapper's larger one, so it's measured
  // directly here instead of reusing that existing ref.
  const [measuredHeaderHeightPx, setMeasuredHeaderHeightPx] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (typeof document === 'undefined' || typeof ResizeObserver === 'undefined') return undefined;
    const header = document.querySelector('header');
    if (!header) return undefined;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setMeasuredHeaderHeightPx(entry.contentRect.height);
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  const wallTiltAvailable = wallConfig.tiltEnabled
    && wallConfig.tiltMaxDegrees > 0
    && coverFlowHasHoverPointer
    && !coverFlowPrefersReducedMotion
    && colors.breakpointTier !== 'mobile'
    && !isPanelOpen;
  useEffect(() => {
    const section = wallTiltSectionRef.current;
    const surface = wallTiltSurfaceRef.current;
    if (!section || !surface) return undefined;

    // Tracking (pointer present, live-following the cursor) and release
    // (pointer gone — settling back to flat) are deliberately two different
    // transitions, not one shared duration/easing: tracking stays snappy
    // (tiltResponseMs) so the tilt reads as attached to the cursor, while the
    // release is tuned independently (tiltReleaseDurationMs/-Easing) to read
    // as a slower, heavier "expensive" settle once the pointer actually
    // leaves. Owned imperatively here (not the static JSX style) so each one
    // only ever applies to the specific transform write it belongs to.
    const trackingTransitionCss =
      `transform ${clamp(wallConfig.tiltResponseMs, 16, 500)}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    const releaseTransitionCss = coverFlowPrefersReducedMotion
      ? 'none'
      : `transform ${clamp(wallConfig.tiltReleaseDurationMs, 0, 3000)}ms ${CTA_BUTTON_MOTION_EASINGS[wallConfig.tiltReleaseEasing]}`;

    let frame = 0;
    const reset = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      surface.style.transition = releaseTransitionCss;
      surface.style.transform = '';
      surface.dataset.wallTiltActive = 'false';
    };
    if (!wallTiltAvailable) {
      reset();
      return undefined;
    }

    const maximum = clamp(wallConfig.tiltMaxDegrees, 0, 2);
    const perspective = clamp(wallConfig.tiltPerspectivePx, 1600, 4000);
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
        reset();
        return;
      }
      const bounds = section.getBoundingClientRect();
      const x = clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1);
      const y = clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1);
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        surface.style.transition = trackingTransitionCss;
        surface.style.transform = `perspective(${perspective}px) rotateX(${wallConfig.tiltYEnabled ? (-y * maximum).toFixed(3) : 0}deg) rotateY(${wallConfig.tiltXEnabled ? (x * maximum).toFixed(3) : 0}deg)`;
        surface.dataset.wallTiltActive = 'true';
        frame = 0;
      });
    };
    section.addEventListener('pointermove', onPointerMove, { passive: true });
    section.addEventListener('pointerleave', reset);
    section.addEventListener('pointercancel', reset);
    window.addEventListener('scroll', reset, { passive: true });
    window.addEventListener('blur', reset);
    return () => {
      reset();
      section.removeEventListener('pointermove', onPointerMove);
      section.removeEventListener('pointerleave', reset);
      section.removeEventListener('pointercancel', reset);
      window.removeEventListener('scroll', reset);
      window.removeEventListener('blur', reset);
    };
  }, [wallTiltAvailable, wallConfig, coverFlowPrefersReducedMotion]);
  // PolymorphicLayout intentionally defaults to the mobile tier during SSR.
  // That is safe for hydration, but it is not a valid visible composition on
  // a desktop cold load: the mobile branch can paint before the first client
  // breakpoint measurement and then be replaced by the split layout. Keep
  // the authored document backdrop visible while that one measurement lands.
  const abstractLayoutPending = colors.viewportWidthPx === undefined;
  // Release opacity-only component reveals after the client breakpoint has
  // committed its final geometry. This gate never changes layout values.
  const [pageIntroStartedAt, setPageIntroStartedAt] = useState<number | null>(null);
  useEffect(() => {
    if (abstractLayoutPending) return;
    if (coverFlowPrefersReducedMotion) {
      setPageIntroStartedAt(Date.now());
      return;
    }
    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setPageIntroStartedAt(Date.now()));
    });
    return () => window.cancelAnimationFrame(firstFrame);
  }, [abstractLayoutPending, coverFlowPrefersReducedMotion]);
  // The split header initially has only its percentage fallback. In a split tier
  // that fallback places the nav a few pixels to the right, then the live
  // pixel boundary moves it left on the next measurement. Keep the header
  // out of the first paint until the same boundary used by the body grid is
  // available; mobile/stacked layouts do not require this gate.
  const columnsAreSideBySide = colors.breakpointTier === 'lg'
    ? splitColumnLayoutConfigForColors.narrowColumnWidthTierLg !== 'stacked'
    : colors.breakpointTier === 'md'
      ? splitColumnLayoutConfigForColors.narrowColumnWidthTierMd !== 'stacked'
      : false;
  const headerIsStatic = colors.breakpointTier === 'lg'
    ? splitColumnLayoutConfigForColors.headerScrollBehaviorLg === 'static'
    : colors.breakpointTier === 'md'
      ? splitColumnLayoutConfigForColors.headerScrollBehaviorWide === 'static'
      : splitColumnLayoutConfigForColors.headerScrollBehavior === 'static';
  // When a tier remains stacked, its two rows can share the visible space
  // beneath the in-flow header. One config value owns the wide/CoverFlow
  // share; the narrow Hero–Timeline row is always the exact complement.
  // Segregated per tier (tablet's own Wide-suffixed pair, desktop's own
  // Lg-suffixed pair) — a page may want a partition on one tier only, or
  // different shares on each, since the two tiers can have entirely
  // different amounts of hero copy/CoverFlow card real estate to balance.
  const tabletStackViewportPartitionActive = colors.breakpointTier === 'md'
    && splitColumnLayoutConfigForColors.narrowColumnWidthTierMd === 'stacked'
    && splitColumnLayoutConfigForColors.stackedViewportPartitionEnabledWide === true;
  const desktopStackViewportPartitionActive = colors.breakpointTier === 'lg'
    && splitColumnLayoutConfigForColors.narrowColumnWidthTierLg === 'stacked'
    && splitColumnLayoutConfigForColors.stackedViewportPartitionEnabledLg === true;
  const stackViewportPartitionActive = tabletStackViewportPartitionActive
    || desktopStackViewportPartitionActive;
  const stackedWideColumnViewportPercent = desktopStackViewportPartitionActive
    ? (splitColumnLayoutConfigForColors.stackedWideColumnViewportPercentLg ?? 60)
    : (splitColumnLayoutConfigForColors.stackedWideColumnViewportPercentWide ?? 60);
  const tabletAvailableViewportHeightCss = `calc(100dvh - ${splitColumnHeaderHeightPx ?? 0}px)`;
  const tabletWideViewportHeightCss = `calc((${tabletAvailableViewportHeightCss}) * ${stackedWideColumnViewportPercent} / 100)`;
  const tabletNarrowViewportHeightCss = `calc((${tabletAvailableViewportHeightCss}) * ${100 - stackedWideColumnViewportPercent} / 100)`;
  // Tablet can use the mobile stacked composition. In that state there is
  // no split seam to measure, so gating the header or CoverFlow on one
  // would leave both permanently invisible.
  const navGeometryPending = columnsAreSideBySide && !colors.splitBandStacked
    && colors.viewportWidthPx !== undefined
    && colors.splitBandBoundaryPx === undefined;
  const isCoverFlowSplitTier = columnsAreSideBySide;
  const bodyNarrowFraction = narrowColumnFractionForTier(
    colors.breakpointTier === 'lg'
      ? splitColumnLayoutConfigForColors.narrowColumnWidthTierLg
      : splitColumnLayoutConfigForColors.narrowColumnWidthTierMd,
  );
  const coverFlowSplitBoundaryPx = colors.splitBandBoundaryPx
    ?? (columnsAreSideBySide && colors.viewportWidthPx !== undefined && bodyNarrowFraction !== undefined
      ? computeNavSplitBoundaryPx(colors.viewportWidthPx, splitColumnLayoutConfigForColors.wideColumnSide, bodyNarrowFraction)
      : undefined);
  const { ref: coverFlowSectionAnchorRef, rect: coverFlowSectionAnchorRect } =
    useMeasuredElementRect<HTMLDivElement>([isCoverFlowSplitTier]);
  const coverFlowVisibleViewportCenteringEnabled = colors.breakpointTier === 'lg'
      ? coverFlowConfig.alignToVisibleViewportCenterLg
      : colors.breakpointTier === 'md' && coverFlowConfig.alignToVisibleViewportCenterMd;
  const [coverFlowVisibleViewport, setCoverFlowVisibleViewport] = useState<{
    top: number;
    height: number;
  } | null>(null);
  // The viewport-centered presentation owns its entire clipping plane at the
  // page-composition boundary. Unlike the former inner translate, this gives
  // CoverFlow's own overflow-hidden drag root the full visible viewport to
  // clip within, so cards cannot be cut off by the wide column's shorter
  // usable-content box.
  useEffect(() => {
    if (!coverFlowVisibleViewportCenteringEnabled) {
      setCoverFlowVisibleViewport(null);
      return undefined;
    }
    const sync = () => {
      const viewport = window.visualViewport;
      setCoverFlowVisibleViewport({
        top: viewport?.offsetTop ?? 0,
        height: viewport?.height ?? window.innerHeight,
      });
    };
    sync();
    window.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('scroll', sync);
    return () => {
      window.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('scroll', sync);
    };
  }, [coverFlowVisibleViewportCenteringEnabled]);
  // The mobile carousel's own full-bleed (100vw) plane, measured directly —
  // NOT the padded wideColumn anchor above, which desktop's own
  // cardWidthBasisPx intentionally uses. Lets carouselGutterX (Mobile
  // Pinned Articles config) shrink only the resolved ACTIVE card's width
  // (via CoverFlow's cardWidthBasisPx override) while the plane CoverFlow
  // itself measures/clips for its overflow-hidden root and off-screen
  // neighbour positions stays the true, full viewport width — so a
  // swipe/transition still slides genuinely edge-to-edge instead of being
  // clipped at a padding-shrunk boundary (operator-reported regression: an
  // earlier version applied the gutter as literal padding on this same
  // measured/clipped element, which cut every in-transit card off before it
  // reached the true screen edge).
  const { ref: mobileCoverFlowPlaneRef, rect: mobileCoverFlowPlaneRect } =
    useMeasuredElementRect<HTMLDivElement>();
  const coverFlowWideColumnStyle = useMemo<CSSProperties>(() => {
    const anchorLeftPx = coverFlowSectionAnchorRect?.left;
    const anchorTopPx = coverFlowSectionAnchorRect?.top;
    const viewportWidthPx = colors.viewportWidthPx;
    if (anchorLeftPx === undefined || viewportWidthPx === undefined) {
      return { inset: 0 };
    }
    const viewportPlaneStyle = coverFlowVisibleViewportCenteringEnabled
      && coverFlowVisibleViewport
      && anchorTopPx !== undefined
      ? {
          top: coverFlowVisibleViewport.top - anchorTopPx,
          height: coverFlowVisibleViewport.height,
          bottom: undefined,
        }
      : { top: 0, bottom: 0 };
    // Below the split (columns stacked, no splitBandBoundaryPx): the wide
    // column already spans the full viewport width, so the same breakout
    // math desktop uses collapses to wideColumnLeftPx=0/wideColumnWidthPx=
    // viewportWidthPx — same edge-to-edge escape from the bounded column's
    // own pl-7/pr-7 content padding (ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG),
    // just without a split boundary to branch on. Previously this tier fell
    // through to `{ inset: 0 }`, which only fills the padded anchor box
    // itself rather than reaching the true viewport edges — the one
    // mobile-only regression from this page's 'full-bleed' -> 'bounded'
    // wideColumnContentContainer migration (see PolymorphicLayout.tsx's own
    // wideColumn doc comment).
    if (!isCoverFlowSplitTier) {
      return {
        ...viewportPlaneStyle,
        left: -anchorLeftPx,
        width: viewportWidthPx,
      };
    }
    const splitBoundaryPx = coverFlowSplitBoundaryPx;
    if (splitBoundaryPx === undefined) {
      return { inset: 0 };
    }
    const wideColumnLeftPx = splitColumnLayoutConfigForColors.wideColumnSide === 'right'
      ? splitBoundaryPx
      : 0;
    const wideColumnWidthPx = splitColumnLayoutConfigForColors.wideColumnSide === 'right'
      ? viewportWidthPx - splitBoundaryPx
      : splitBoundaryPx;
    return {
      ...viewportPlaneStyle,
      left: wideColumnLeftPx - anchorLeftPx,
      width: wideColumnWidthPx,
    };
  }, [
    coverFlowSplitBoundaryPx,
    colors.viewportWidthPx,
    coverFlowSectionAnchorRect?.left,
    coverFlowSectionAnchorRect?.top,
    coverFlowVisibleViewport,
    coverFlowVisibleViewportCenteringEnabled,
    isCoverFlowSplitTier,
    splitColumnLayoutConfigForColors.wideColumnSide,
  ]);
  const coverFlowItemSlugs = useMemo(
    () => carouselAndListItems.map(item => item.slug),
    [carouselAndListItems],
  );
  const {
    activeIndex: articleActiveIndex,
    setActiveIndex: setArticleActiveIndex,
  } = useArticleListCoverFlowSync(
    carouselAndListItems.length,
    resolveCoverFlowStartIndex(coverFlowConfig, carouselAndListItems.length),
    coverFlowItemSlugs,
  );
  // CoverFlow has already moved its MotionValue before it notifies this
  // controlled state. Keep that compositor-friendly movement ahead of the
  // page-level selection work: changing the index also refreshes the
  // synchronized timeline, URL hash, and a large surrounding page tree.
  // Scheduling that coordination as a transition prevents a 20–30ms
  // synchronous React commit from occupying the activation frame.
  const handleCoverFlowActiveIndexChange = useCallback((index: number) => {
    startTransition(() => {
      setArticleActiveIndex(index, 'coverflow');
    });
  }, [setArticleActiveIndex]);
  const handleTimelineActiveIndexChange = useCallback((index: number) => {
    startTransition(() => {
      setArticleActiveIndex(index, 'list');
    });
  }, [setArticleActiveIndex]);
  const handleMobileScrollActiveIndexChange = useCallback((index: number) => {
    startTransition(() => {
      setArticleActiveIndex(index, 'external');
    });
  }, [setArticleActiveIndex]);
  // Deliberately NOT wrapped in startTransition, unlike the scroll-driven
  // handler above. This fires for exactly one discrete, user-initiated
  // moment: tapping a row in the expanded mobile list. MobilePinnedArticle
  // Section's own closePanel() reveals the (until-now covered) CoverFlow by
  // flipping `expanded` via a normal, non-transitioned setState — if this
  // index commit were still deferred as a transition, that urgent re-render
  // could land first and briefly (or, once caught in the wrong render,
  // persistently) show CoverFlow's isActive/distanceFromActive styling
  // (driven by the raw activeIndex prop, not the already-correct local
  // `position` MotionValue driving its transforms) pointed at the
  // previously active row instead of the one just tapped. Committing
  // synchronously guarantees `articleActiveIndex` already matches the
  // tapped row by the time that reveal render happens.
  const handleMobileArticleIndexCommit = useCallback((index: number) => {
    setArticleActiveIndex(index, 'external');
  }, [setArticleActiveIndex]);
  // `restored` (false until one full passive-effect cycle after mount)
  // drives both <CoverFlow> instances' own suppressEntranceAnimation prop
  // below — see that prop's own doc comment (CoverFlow.tsx) for the bug
  // this closes. No longer hash-related — see useCoverFlowEntranceGate's
  // own doc comment.
  const { restored: coverFlowEntranceRestored } = useCoverFlowEntranceGate();

  const coverFlowLiquidSliderMotion = useLiquidSliderMotion(journalDockSliderConfig);
  const coverFlowContentInsetCqw = (
    journalDockSliderConfig.dockContentInsetRem
    * COVER_FLOW_ROOT_REM_PX
    / COVER_FLOW_COMPOSITION_REFERENCE_WIDTH_PX
    * 100
  );
  // Same "base" (uninfluenced) palette branch SplitColumnCardPreview's own
  // flat mode feeds both basePalette/influencedPalette with when there's no
  // active-row hue-influence concept to drive (see that component's own
  // hueFadeArticleBasePalettes/-InfluencedPalettes split) — CoverFlow has no
  // equivalent either, so it reads the same uninfluenced palette.
  // The collection emits the exact (slide, palette) inputs it feeds its OWN
  // article cards' mesh; the quote references these so its mesh is provably the
  // same one a card renders (same slide seed + same resolved palette + same
  // shader), not a parallel palette. Empty until the collection mounts/emits;
  // the quote falls back to coverFlowPalettes until then.
  const [collectionArticleMeshInputs, setCollectionArticleMeshInputs] =
    useState<ReadonlyArray<ArticleMeshInput>>([]);
  const coverFlowPalettes = useMemo(
    () => buildDeckPaletteStates({
      slides: carouselAndListItems,
      paletteConfig: dockPaletteConfig,
      hueInfluenceConfig: { ...dockHueInfluenceConfig, transitionEnabled: false, enabled: false },
      activeIndex: null,
      // Live breakpoint — without this, gradientScale/gradientNoise's own
      // Wide/Lg tiers silently do nothing for CoverFlow (always resolved the
      // mobile-tier value regardless of viewport). Same fix View.tsx's own
      // deckPaletteStates call already applied for the journal/lab grid and
      // /about's narrative dock — this call site was missed.
      tier: colors.breakpointTier,
    }),
    [carouselAndListItems, dockPaletteConfig, dockHueInfluenceConfig, colors.breakpointTier],
  );
  const [coverFlowGeometryStable, setCoverFlowGeometryStable] = useState(false);
  const coverFlowGeometryReleasedRef = useRef(false);
  useEffect(() => {
    // This is an initial-load reveal latch. Once the coordinated layout has
    // been published, later observer updates must not hide the page again —
    // doing so creates the exact paint/disappear/repaint flicker seen during
    // the intro sequence. A full unmount/remount resets the ref naturally.
    if (coverFlowGeometryReleasedRef.current) return;
    if (
      colors.viewportWidthPx === undefined
      || colors.breakpointTier === undefined
      || !coverFlowSectionAnchorRect?.width
      || coverFlowSectionAnchorRect.width <= 0
      || (isCoverFlowSplitTier && coverFlowSplitBoundaryPx === undefined)
    ) return;

    let firstFrame: number | null = null;
    let secondFrame: number | null = null;
    const settle = () => {
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          coverFlowGeometryReleasedRef.current = true;
          setCoverFlowGeometryStable(true);
        });
      });
    };
    settle();
    return () => {
      if (firstFrame !== null) window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame);
    };
  }, [
    colors.viewportWidthPx,
    colors.breakpointTier,
    coverFlowSplitBoundaryPx,
    coverFlowSectionAnchorRect?.left,
    coverFlowSectionAnchorRect?.top,
    coverFlowSectionAnchorRect?.width,
    coverFlowSectionAnchorRect?.height,
    isCoverFlowSplitTier,
  ]);
  // Do not expose the desktop carousel while its breakout geometry or
  // breakpoint-specific card palettes are still resolving. The temporary
  // anchor-box fallback is narrower and left-shifted, while a null palette
  // makes every card use the same visual fallback; revealing only after all
  // inputs are ready makes the first painted frame the settled one.
  const coverFlowVisualReady = Boolean(
    colors.viewportWidthPx !== undefined
    && colors.breakpointTier !== undefined
    && coverFlowSectionAnchorRect?.width
    && coverFlowSectionAnchorRect.width > 0
    && coverFlowPalettes
    && coverFlowPalettes.length >= carouselAndListItems.length
    && (!isCoverFlowSplitTier || coverFlowSplitBoundaryPx !== undefined)
    && coverFlowGeometryStable,
  );

  // Neighbour "look and feel" — the exact same formula
  // SplitColumnCardPreview/components/CardStack.tsx resolves internally for
  // its own neighborTextColorMode==='column' case (that file's own
  // resolvedNeighborBackgroundColor/-TextColor/-TopicBorderColor/
  // -CardBorderColor, ~lines 302-345), duplicated here rather than exported
  // from CardStack.tsx. Reads the normalized shared baseline so CoverFlow's
  // neighbour cards retain the proven treatment without exposing the
  // retired component's controls.
  const coverFlowColumnBackgroundColor = colors.wideColumnColor ?? normalizedPageSurfaceConfig.color;
  const coverFlowNeighborBackgroundColor = cardAppearanceConfig.neighborBackgroundMode === 'transparent'
    ? 'transparent'
    : cardAppearanceConfig.neighborBackgroundMode === 'custom'
      ? cardAppearanceConfig.neighborBackgroundCustomColor
      : cardAppearanceConfig.neighborBackgroundMode === 'column'
        ? deriveSurfaceColor(coverFlowColumnBackgroundColor, cardAppearanceConfig.neighborBackgroundOffset)
        : normalizedPageSurfaceConfig.color;
  const coverFlowNeighborTextContrastTarget = coverFlowNeighborBackgroundColor === 'transparent'
    ? coverFlowColumnBackgroundColor
    : coverFlowNeighborBackgroundColor;
  const coverFlowNeighborTextColor = cardAppearanceConfig.neighborTextColorMode === 'column'
    ? resolveContrastAwareTextColor(
      coverFlowNeighborTextContrastTarget,
      cardAppearanceConfig.neighborTextMinContrast,
      cardAppearanceConfig.neighborTextOffset,
    )
    : cardAppearanceConfig.neighborTextColor;
  const coverFlowNeighborTopicBorderColor = cardAppearanceConfig.neighborTextColorMode === 'column'
    ? coverFlowNeighborTextColor
    : cardAppearanceConfig.neighborTopicBorderColor;
  const coverFlowNeighborCardBorderColor = deriveTransparentTint(
    coverFlowNeighborTextColor, cardAppearanceConfig.neighborBorderColorOffset,
  );
  const coverFlowNeighborFillUnderlay = coverFlowNeighborBackgroundColor === 'transparent'
    ? coverFlowColumnBackgroundColor
    : coverFlowNeighborBackgroundColor;
  const coverFlowNeighborFlatFillColor = deriveOpaqueTint(
    coverFlowNeighborTextColor,
    coverFlowNeighborFillUnderlay,
    cardAppearanceConfig.neighborFlatFillOpacity,
  );
  const coverFlowNeighborFlatFillToneColor = deriveSurfaceColor(
    coverFlowNeighborFlatFillColor,
    cardAppearanceConfig.neighborFlatFillToneOffset,
  );
  const coverFlowNeighborCardSurfaceColor = cardAppearanceConfig.neighborFrameMode === 'flat-fill'
    ? coverFlowNeighborFlatFillToneColor
    : coverFlowNeighborBackgroundColor;

  const coverFlowStackPresentationBase = useMemo(() => ({
    surfaceColor: coverFlowNeighborCardSurfaceColor,
    frameMode: cardAppearanceConfig.neighborFrameMode,
    textColor: coverFlowNeighborTextColor,
    topicBorderColor: coverFlowNeighborTopicBorderColor,
    cardBorderColor: coverFlowNeighborCardBorderColor,
    headerOpacity: cardAppearanceConfig.activeHeaderOpacity,
    textOpacity: cardAppearanceConfig.activeTextOpacity,
    transitionDurationMs: coverFlowPrefersReducedMotion ? 0 : cardAppearanceConfig.stepTiltDurationMs,
    transitionEasingCss: CTA_BUTTON_MOTION_EASINGS[cardAppearanceConfig.stepTiltEasing],
    transitionDelayMs: 0,
    gradientRevealDurationMs: coverFlowPrefersReducedMotion
      ? 0
      : cardAppearanceConfig.neighborGradientRevealDurationMs,
    gradientRevealEasingCss:
      CTA_BUTTON_MOTION_EASINGS[cardAppearanceConfig.neighborGradientRevealEasing],
    gradientRevealBlurPx: coverFlowPrefersReducedMotion
      ? 0
      : cardAppearanceConfig.neighborGradientRevealBlurPx,
    shadowFadeDurationMs: coverFlowPrefersReducedMotion
      ? 0
      : cardAppearanceConfig.neighborShadowFadeDurationMs,
    shadowFadeEasingCss:
      CTA_BUTTON_MOTION_EASINGS[cardAppearanceConfig.neighborShadowFadeEasing],
    ctaHoverDurationMs: coverFlowPrefersReducedMotion ? 0 : cardAppearanceConfig.ctaHoverDurationMs,
    ctaHoverEasingCss: CTA_BUTTON_MOTION_EASINGS[cardAppearanceConfig.ctaHoverEasing],
    ctaHoverDelayMs: coverFlowPrefersReducedMotion ? 0 : cardAppearanceConfig.ctaHoverDelayMs,
  }), [
    coverFlowNeighborCardSurfaceColor, coverFlowNeighborTextColor, coverFlowNeighborTopicBorderColor,
    coverFlowNeighborCardBorderColor, coverFlowPrefersReducedMotion, cardAppearanceConfig,
  ]);

  // Mesh performance state machine — identical to the carousel-lab spike's
  // own liveMeshIndices (experiences/abstract/components/CoverFlowLab's
  // proving ground): a card index is "live" (continuous mesh, hover/tilt
  // responsive) iff it's in this set. The newly active card goes live
  // immediately; the outgoing one stays live only until its own neutral
  // cover finishes fading back in (gradientRevealDurationMs), never a "pop"
  // to a static frame while still visible.
  const [coverFlowLiveMeshIndices, setCoverFlowLiveMeshIndices] =
    useState<ReadonlySet<number>>(() => new Set([0]));
  const coverFlowDeactivationTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const coverFlowPrevActiveIndexRef = useRef(articleActiveIndex);
  const coverFlowGradientRevealDurationMs = coverFlowStackPresentationBase.gradientRevealDurationMs;

  useEffect(() => {
    const prevActive = coverFlowPrevActiveIndexRef.current;
    if (prevActive === articleActiveIndex) return;
    coverFlowPrevActiveIndexRef.current = articleActiveIndex;

    const pendingForNewActive = coverFlowDeactivationTimersRef.current.get(articleActiveIndex);
    if (pendingForNewActive !== undefined) {
      clearTimeout(pendingForNewActive);
      coverFlowDeactivationTimersRef.current.delete(articleActiveIndex);
    }
    setCoverFlowLiveMeshIndices((current) => {
      if (current.has(articleActiveIndex)) return current;
      const next = new Set(current);
      next.add(articleActiveIndex);
      return next;
    });

    const timer = setTimeout(() => {
      coverFlowDeactivationTimersRef.current.delete(prevActive);
      setCoverFlowLiveMeshIndices((current) => {
        if (!current.has(prevActive)) return current;
        const next = new Set(current);
        next.delete(prevActive);
        return next;
      });
    }, coverFlowGradientRevealDurationMs);
    coverFlowDeactivationTimersRef.current.set(prevActive, timer);
  }, [articleActiveIndex, coverFlowGradientRevealDurationMs]);

  useEffect(() => {
    const timers = coverFlowDeactivationTimersRef.current;
    return () => { timers.forEach(clearTimeout); };
  }, []);

  // Narrow column scroll-gradient enrichment, synced to CoverFlow's own
  // navigation — PLAN-COVERFLOW-NARROW-GRADIENT-SYNC.md. Opt-in via
  // coverFlowConfig.narrowColumnGradientOnNavigateEnabledLg (off by
  // default, panel-editable — CoverFlow.panel.ts's own doc comment on that
  // field): while off, the target below is pinned to 0 regardless of
  // articleActiveIndex, so the narrow column never leaves its base values
  // and this whole effect is a no-op once converged, byte-identical to
  // before this feature existed. While on, the narrow column (AboutTimeline's
  // own background, colors.narrowColumnGradientReferenceColor) starts at
  // the page's own base scrollGradientNarrowColumnSaturationLg/-DarknessLg
  // (splitColumnLayoutConfig's own current values) while card 0 is active,
  // eases toward coverFlowConfig's own
  // narrowColumnGradientSaturationOnNavigateLg/-DarknessOnNavigateLg once
  // articleActiveIndex leaves 0, and eases back to the base values once
  // articleActiveIndex returns to 0 — symmetric, not a one-way latch.
  // Toggling the flag itself live also re-targets immediately (it's in
  // this effect's own dependency array below), the same as a real
  // navigation would.
  //
  // Same rAF + exponential-tau smoothing shape as the list-darken effect
  // further up this file (and PolymorphicScrollGradientBackground.tsx's own
  // identical loop) — targetRef/smoothRef/rafRef/lastTsRef, alphaFromTau,
  // a schedule() that only starts a frame if one isn't already pending, and
  // the same "reset lastTsRef on schedule, not on convergence" fix that
  // loop's own doc comment documents (this codebase's own rAF loops have
  // hit that exact bug twice already). Kept as its own independent inlined
  // copy rather than a shared helper, matching how the other three loops
  // in this codebase are already independent copies of the same shape, not
  // a shared abstraction.
  //
  // Unlike that CSS-var loop, this one's output has to travel through
  // React state: scrollGradientNarrowColumnSaturationLg/-DarknessLg are
  // plain numbers consumed deep inside usePolymorphicLayoutColors
  // (PolymorphicLayout.tsx), not a single CSS custom property a style rule
  // could read directly — there is no CSS-var shortcut available for a
  // value that feeds gradient-STOP generation. Rather than writing into
  // splitColumnLayoutConfig itself, the tick below writes into the
  // separate narrowGradientLiveOverride state declared next to the colors
  // hook call above — see that state's own doc comment for why: writing
  // into splitColumnLayoutConfig directly was both a self-reference bug
  // (this loop's own "ease back to base" math read its base endpoint from
  // the same field it was writing) and a config leak (the PolymorphicLayout
  // panel treats that state as the real, persisted operator configuration
  // — every animation frame writing into it made a fresh, un-navigated
  // page load look already-navigated). Because splitColumnLayoutConfig is
  // now never written to by this effect, narrowGradientBaseRef below is
  // safe to live-sync from it every render again (also correctly picks up
  // an operator's own live panel edits to the base values while at rest).
  const narrowGradientEnrichTargetRef = useRef(
    coverFlowConfig.narrowColumnGradientOnNavigateEnabledLg && articleActiveIndex !== 0 ? 1 : 0,
  );
  const narrowGradientEnrichSmoothRef = useRef(narrowGradientEnrichTargetRef.current);
  const narrowGradientRafRef = useRef<number | null>(null);
  const narrowGradientLastTsRef = useRef(0);
  const narrowGradientTauMsRef = useRef(colors.scrollGradientResolved.tauMs);
  narrowGradientTauMsRef.current = colors.scrollGradientResolved.tauMs;
  const narrowGradientBaseRef = useRef({
    saturation: splitColumnLayoutConfig.scrollGradientNarrowColumnSaturationLg,
    darkness: splitColumnLayoutConfig.scrollGradientNarrowColumnDarknessLg,
  });
  narrowGradientBaseRef.current = {
    saturation: splitColumnLayoutConfig.scrollGradientNarrowColumnSaturationLg,
    darkness: splitColumnLayoutConfig.scrollGradientNarrowColumnDarknessLg,
  };
  const narrowGradientNavigateTargetRef = useRef({
    saturation: coverFlowConfig.narrowColumnGradientSaturationOnNavigateLg,
    darkness: coverFlowConfig.narrowColumnGradientDarknessOnNavigateLg,
  });
  narrowGradientNavigateTargetRef.current = {
    saturation: coverFlowConfig.narrowColumnGradientSaturationOnNavigateLg,
    darkness: coverFlowConfig.narrowColumnGradientDarknessOnNavigateLg,
  };

  useEffect(() => {
    const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
    const alphaFromTau = (dtMs: number, tau: number) => 1 - Math.exp(-dtMs / Math.max(1, tau));

    const tick = (ts: number) => {
      const lastTs = narrowGradientLastTsRef.current || ts;
      narrowGradientLastTsRef.current = ts;
      narrowGradientRafRef.current = null;

      const dt = Math.max(0, ts - lastTs);
      const alpha = alphaFromTau(dt, narrowGradientTauMsRef.current);
      const target = narrowGradientEnrichTargetRef.current;
      const current = narrowGradientEnrichSmoothRef.current
        + (target - narrowGradientEnrichSmoothRef.current) * alpha;
      narrowGradientEnrichSmoothRef.current = current;

      const enrichment = clamp01(current);
      const converged = Math.abs(target - current) < 0.001;

      // Fully at rest at the base values: clear the override entirely
      // (null) rather than leave it set to a copy of the base numbers —
      // keeps splitColumnLayoutConfigForColors byte-identical to
      // splitColumnLayoutConfig itself whenever this feature isn't
      // actively easing, not just numerically equal.
      if (converged && target === 0) {
        setNarrowGradientLiveOverride((prev) => (prev === null ? prev : null));
      } else {
        const base = narrowGradientBaseRef.current;
        const navigateTarget = narrowGradientNavigateTargetRef.current;
        const saturation = base.saturation + (navigateTarget.saturation - base.saturation) * enrichment;
        const darkness = base.darkness + (navigateTarget.darkness - base.darkness) * enrichment;

        setNarrowGradientLiveOverride((prev) => (
          prev !== null && prev.saturation === saturation && prev.darkness === darkness
            ? prev
            : { saturation, darkness }
        ));
      }

      if (!converged) {
        narrowGradientRafRef.current = window.requestAnimationFrame(tick);
      }
    };

    const schedule = () => {
      if (narrowGradientRafRef.current !== null) return;
      // Same fix as the list-darken loop's own schedule(): reset
      // lastTsRef here, not on convergence, or a resumed transition after
      // any pause would otherwise inherit a stale timestamp and produce an
      // artificially huge dt/alpha≈1 one-frame snap.
      narrowGradientLastTsRef.current = 0;
      narrowGradientRafRef.current = window.requestAnimationFrame(tick);
    };

    narrowGradientEnrichTargetRef.current =
      coverFlowConfig.narrowColumnGradientOnNavigateEnabledLg && articleActiveIndex !== 0 ? 1 : 0;
    schedule();

    return () => {
      if (narrowGradientRafRef.current !== null) {
        window.cancelAnimationFrame(narrowGradientRafRef.current);
        narrowGradientRafRef.current = null;
      }
    };
  }, [articleActiveIndex, coverFlowConfig.narrowColumnGradientOnNavigateEnabledLg]);

  // Drag-vs-tap disambiguation — identical technique to the carousel-lab
  // spike (each card is the real article <Link>; a mousedown+move
  // originating on it would otherwise trigger the browser's own native
  // link-drag instead of reaching CoverFlow's own pointer gesture
  // recognizer). Capture-phase so it runs before both the anchor's default
  // navigation and CoverFlow's own bubble-phase click-to-snap handler.
  const coverFlowPointerDownAtRef = useRef<{ x: number; y: number } | null>(null);
  const handleCoverFlowCardPointerDownCapture = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    coverFlowPointerDownAtRef.current = { x: event.clientX, y: event.clientY };
  }, []);
  const handleCoverFlowCardClickCapture = useCallback((
    event: ReactMouseEvent<HTMLDivElement>,
    isActive: boolean,
  ) => {
    const origin = coverFlowPointerDownAtRef.current;
    const distancePx = origin
      ? Math.hypot(event.clientX - origin.x, event.clientY - origin.y)
      : 0;
    coverFlowPointerDownAtRef.current = null;
    if (distancePx > coverFlowConfig.clickVsDragThresholdPx) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!isActive) {
      event.preventDefault();
    }
  }, [coverFlowConfig.clickVsDragThresholdPx]);

  const renderCoverFlowItem = useCallback((
    article: AbstractPostDockItem,
    index: number,
    isActive: boolean,
    geometry: { width: number; height: number },
    reveal: CoverFlowCardReveal,
    position: {
      distanceFromActive: number;
      distanceFromActiveLive: MotionValue<number>;
      depthPassForegroundVisible?: boolean;
    },
    // Opt-in, only ever supplied by the mobile branch's own renderItem
    // wrapper below (MobilePinnedCarouselControls.focusProgress) — CoverFlow
    // itself calls renderItem with exactly the six params above, so the
    // desktop instance's call site (a bare `renderItem={renderCoverFlowItem}`)
    // never passes a 7th argument and this defaults to 1 (fully focused,
    // today's exact behavior) there.
    focusProgress: number = 1,
  ) => {
    const slot: AbstractJournalLabFlipSlot = {
      index,
      article,
      lab: null,
      position: { leftPx: 0, topPx: 0, rotationDeg: 0 },
    };
    const depthPassEnabled = colors.breakpointTier === 'lg'
      && coverFlowConfig.navigationPathLg !== 'classic';
    const isMeshLive = depthPassEnabled
      ? isActive || position.depthPassForegroundVisible === true
      : coverFlowLiveMeshIndices.has(index);
    // reveal.hasSettled describes "the currently-active card has settled,"
    // not "this card is active" (see CoverFlow.tsx's own CoverFlowCardReveal
    // doc comment) — combined with isActive here so only the real active
    // card's own information layer actually reveals; every inactive card stays hidden
    // regardless of the shared hasSettled value.
    const cardDetailsRevealSettled = isActive && reveal.hasSettled;
    // CoverFlow's exit timing is always all-content, even when the entrance
    // is not staggered. Supplying a zero-delay map keeps title/excerpt/CTA on
    // ArticleCard's shared detailsVisible gate, so the configured exit
    // delay/duration/easing apply to the entire card information layer.
    const revealDelaysMs = reveal.stagger?.elementDelaysMs ?? COVER_FLOW_UNSTAGGERED_REVEAL_DELAYS_MS;
    // BUGS-AUDIT-COVERFLOW-NEIGHBOR-COLOR.md (2026-09-03): distanceFromActive
    // starts at 1 for the *closest* inactive neighbor — the exact same card
    // that's the steady-state "idle neighbor" at rest AND the incoming card
    // mid-transition (its own isActive flag flips the instant the click
    // lands; only its position animates smoothly afterward, per
    // CoverFlow.tsx's own distanceFromActive: Math.abs(index - activeIndex)).
    // The un-offset `distanceFromActive * step` below used to apply a full
    // step of darkening to that same distance-1 card in both states — a
    // config with any real darkening step (the shipped default is 0.96, near
    // the darkeningAmount=1 ceiling) meant the "idle neighbor" reference look
    // was never actually distance-1's own true color: operators tuning this
    // knob against the resting idle cards were unknowingly also tuning how
    // dark the incoming card flashes, with no way to decouple the two.
    // `- 1` makes distance-1 the true zero-darkening baseline — it always
    // renders coverFlowStackPresentationBase.surfaceColor exactly (the same,
    // single, already fully-configured Card Appearance neighbor color:
    // neighborBackgroundMode/neighborFlatFillOpacity/neighborFlatFillToneOffset
    // — see coverFlowNeighborCardSurfaceColor above), identically whether
    // idle or transitioning. inactiveCardColumnDarkeningStep now only
    // recedes cards genuinely deeper in the stack (distance 2+) toward the
    // column background — its own documented "each inactive position"
    // framing, now actually starting from the first position that isn't
    // already the neighbor baseline.
    const columnDarkeningAmount = Math.min(
      1,
      Math.max(0, position.distanceFromActive - 1) * coverFlowConfig.inactiveCardColumnDarkeningStep,
    );
    const coverFlowCardSurfaceColor = !isActive
      && cardAppearanceConfig.neighborFrameMode === 'flat-fill'
      ? blendOpaqueColors(
        coverFlowStackPresentationBase.surfaceColor,
        coverFlowColumnBackgroundColor,
        columnDarkeningAmount,
      )
      : coverFlowStackPresentationBase.surfaceColor;
    // AUDIT-COVERFLOW-PROXIMITY-JUMP.md recommendation #3: taper the hover
    // engine's own scale/lift/tilt ceiling (and the hologram's own hue/
    // saturation/brightness ceiling below) the further a card sits from the
    // active slot. Distance-1 (the immediate neighbor) is now exempt — same
    // `Math.max(0, distanceFromActive - 1)` offset columnDarkeningAmount
    // above already uses, for a related but distinct reason this time:
    // PLAN-COVERFLOW-NEIGHBOR-HOLOGRAM-RAMP-DOUBLE-TAPER-FIX.md. This field
    // used to deliberately include distance-1 (screenshot-reported reason:
    // the immediate neighbor is the slot most likely to still be under the
    // cursor right after a list click, and a full-amplitude ceiling there
    // could let a lingering cursor visibly snap a departing card's hover
    // response once CoverFlow's own position spring carried it away). That
    // concern is already fully covered by a SEPARATE, correctly time-based
    // mechanism this discrete multiplier was silently colliding with:
    // useCardLiftPhysics's own activationRampActive/activationRampDurationMs
    // ceiling and GradientRenderer's own isActive/activationRampDurationMs
    // ceiling (both cursor-position-independent — they recede to 0 over
    // activationRampDurationMs purely from elapsed time since the card
    // stopped being active, regardless of whether the pointer is still
    // resting on it). Since distanceFromActive flips 0->1 in the same
    // render isActive flips, this multiplier used to collapse the ceiling
    // BEFORE either ramp got a chance to ease it — a real, un-ramped snap
    // (screenshot-reported, drag-release navigation) landing on top of an
    // otherwise-smooth ramp. Exempting distance-1 here leaves that ramp as
    // the sole mechanism for the immediate neighbor, on the same curve the
    // incoming card already ramps up on; distance >= 2 (which neither ramp
    // governs) keeps today's exact discrete tapering, unchanged.
    //
    // This exemption alone previously caused a SECOND regression (shadow/
    // elevation snap, screenshot-reported) because useCardLiftPhysics's own
    // shadow output read raw elevationPx directly, orthogonal to its own
    // activationRampCeiling — restoring this ceiling for distance-1 let its
    // shadow react to live cursor proximity again with nothing damping it.
    // That is now fixed at the source (useCardLiftPhysics.ts's own
    // composeAndApply blends the shadow's elevation input through the same
    // activationRampCeiling the transform already uses), so this exemption
    // and that fix ship together, not independently — see
    // PLAN-COVERFLOW-NEIGHBOR-HOLOGRAM-RAMP-DOUBLE-TAPER-FIX.md's revised
    // implementation note.
    const hoverAmplitudeMultiplier = 1 - Math.min(
      1,
      Math.max(0, position.distanceFromActive - 1) * coverFlowConfig.inactiveCardHoverAmplitudeStep,
    );
    const cardCtaConfig = hoverAmplitudeMultiplier >= 1 ? normalizedCtaButtonConfig : {
      ...normalizedCtaButtonConfig,
      proximityScale: 1 + (normalizedCtaButtonConfig.proximityScale - 1) * hoverAmplitudeMultiplier,
      proximityLiftPx: normalizedCtaButtonConfig.proximityLiftPx * hoverAmplitudeMultiplier,
      tiltMaxDegrees: normalizedCtaButtonConfig.tiltMaxDegrees * hoverAmplitudeMultiplier,
    };
    // Same taper, second live-proximity engine: the gradient/hologram mesh's
    // own brightness/saturation/hue-shift/pan response is a completely
    // separate usePointerProximity subscription from useCardLiftPhysics
    // above (AbstractJournalLabCollection.tsx's own second usePointerProximity
    // call, feeding LiquidGradientAdapter's hologramInteraction) — tapering
    // ctaConfig alone leaves this one at full amplitude, so a departing card
    // can still visibly brighten/saturate on settle even after its scale/
    // tilt ceiling is already zeroed. See CoverFlow.config.ts's own
    // inactiveCardHoverAmplitudeStep doc comment.
    const hoverAmplitudeTaperedHologramConfig = hoverAmplitudeMultiplier >= 1 ? dockHologramConfig : {
      ...dockHologramConfig,
      offsetGain: dockHologramConfig.offsetGain * hoverAmplitudeMultiplier,
      hueShiftAmount: dockHologramConfig.hueShiftAmount * hoverAmplitudeMultiplier,
      saturationBoost: dockHologramConfig.saturationBoost * hoverAmplitudeMultiplier,
      brightnessBoost: dockHologramConfig.brightnessBoost * hoverAmplitudeMultiplier,
    };
    // AbstractPostDockHologramConfig's touchDragEnabled/ambientSweepEnabled
    // (AbstractPostDock/config/registered.ts) are a deliberate, separate
    // feature — a finger SWEEPING PAST several stationary cards gets its own
    // {proximity, x, y} signal, the touch equivalent of desktop cursor-
    // proximity (see that config's own touchDragEnabled doc comment). That's
    // not what CoverFlow's own drag gesture is: the user is dragging the
    // ACTIVE card itself to navigate, the same "card being actively swiped
    // by the same touch input driving it" case SplitColumnCardPreview.tsx
    // already identified and suppressed for its own card stack (see that
    // file's own "cardstack-mobile-horizontal-swipe" comment) via this exact
    // `enabled: false` override — CoverFlow's own render call never received
    // the equivalent. Reuses coverFlowHasHoverPointer (the same device-
    // capability signal useCardLiftPhysics's own hasHoverPointer prop below
    // already gates on) rather than a new drag-tracking signal: on a touch/
    // coarse-pointer device this entire hologram proximity system — not just
    // its touch-specific fields — should never drive brightness/saturation/
    // pan, on a tap or a drag alike.
    const cardHologramConfig = coverFlowHasHoverPointer
      ? hoverAmplitudeTaperedHologramConfig
      : { ...hoverAmplitudeTaperedHologramConfig, enabled: false };
    // The active card is the authored shader-scale baseline. The selected
    // mode decides whether this step follows live distance or applies once
    // to every inactive card.
    const inactiveScaleStepPercent = colors.breakpointTier === 'lg'
      ? dockPaletteConfig.inactiveGradientScaleDistancePercentLg
      : colors.breakpointTier === 'md'
        ? dockPaletteConfig.inactiveGradientScaleDistancePercentWide
        : dockPaletteConfig.inactiveGradientScaleDistancePercent;
    // PLAN-COVERFLOW-ACTIVE-CARD-SETTLE-RAMP.md: the still-unaddressed half
    // of AUDIT-COVERFLOW-PROXIMITY-JUMP.md's diagnosis — hoverAmplitudeMultiplier
    // above is keyed on distanceFromActive, always 0 for the active card
    // itself, so it structurally cannot recede the *incoming* card's own
    // proximity ceiling while its position spring is still sliding into
    // place. This is the time-driven counterpart: resolved once here from
    // the operator-facing 0-1 ratio into a real duration (see
    // CoverFlowConfig.activationRampRate's own doc comment), then threaded
    // down to both proximity engines identically.
    const activationRampDurationMs =
      coverFlowConfig.activationRampRate * ACTIVATION_RAMP_REFERENCE_DURATION_MS;
    // Opt-in (mobilePinnedArticleSectionConfig.peekOutlineModeEnabled) — only
    // ever true for the mobile branch's own active card (desktop's call site
    // never supplies focusProgress, so it defaults to 1 and this is always
    // false there). Border/text ink reuses shortArticleListBodyColor
    // verbatim — the SAME scroll-gradient-derived, contrast-aware ink the
    // hero and footer already use, not a new derivation.
    //
    // Threshold, not a scroll-linked progression (operator ask — a prior
    // version tied neutralSurfaceOpacityOverride continuously to
    // `1 - focusProgress`, so the outline visibly scrubbed in and out as the
    // user scrolled instead of just being "on" or "off"): this flag is the
    // ENTIRE signal. Once true, the override below is a flat `1` (fully
    // outlined, zero gradient) regardless of how far below 1 focusProgress
    // actually is; the moment focusProgress reaches 1 (section fully
    // pinned/focused) this flips false and the override is omitted entirely
    // (fully revealed gradient, zero outline). The only thing scroll
    // position controls is WHEN that flip happens — the actual cross-fade
    // between the two states still animates smoothly, but via
    // AbstractJournalLabCollection's own gradientRevealDurationMs/-EasingCss
    // CSS transition firing once at the threshold, not via a value that
    // tracks scroll position throughout the whole peek range.
    const peekOutlineActive = isActive
      && mobilePinnedArticleSectionConfig.peekOutlineModeEnabled
      && focusProgress < 1;
    // Unified ink can also unify the live mesh beneath every card. The
    // source is one-based in the panel; clamp against the currently-rendered
    // CoverFlow data so a selection beyond a short collection degrades to
    // its final available card rather than producing a blank canvas.
    const useInactiveSharedGradient = !isActive && cardAppearanceConfig.inactiveUnifiedGradientEnabled;
    const unifiedGradientInkEnabled = resolveUnifiedGradientInkEnabled(
      cardAppearanceConfig, colors.breakpointTier,
    );
    const unifiedGradientSourceIndex = useInactiveSharedGradient
      ? Math.min(
        carouselAndListItems.length - 1,
        Math.max(0, Number(cardAppearanceConfig.inactiveUnifiedGradientSourceCard) - 1),
      )
      : unifiedGradientInkEnabled
      && cardAppearanceConfig.invertedGradientInkUnifiedBackgroundEnabled
      ? Math.min(
        carouselAndListItems.length - 1,
        Math.max(0, Number(cardAppearanceConfig.invertedGradientInkUnifiedBackgroundSourceCard) - 1),
      )
      : index;
    const unifiedGradientSlide = carouselAndListItems[unifiedGradientSourceIndex] ?? article;
    const unifiedGradientPalette = coverFlowPalettes?.[unifiedGradientSourceIndex] ?? null;
    return (
      <div
        className={`cover-flow-card ${isActive ? 'cover-flow-card--active' : 'cover-flow-card--inactive'}`}
        data-card-state={isActive ? 'active' : 'inactive'}
        style={{ width: '100%', height: '100%' }}
        onDragStart={(event) => event.preventDefault()}
        onPointerDownCapture={handleCoverFlowCardPointerDownCapture}
        onClickCapture={(event) => handleCoverFlowCardClickCapture(event, isActive)}
      >
        <Card
          slot={slot}
          targetView="articles"
          renderedView="articles"
          colorView="articles"
          phase="idle"
          transitioning={false}
          prefersReducedMotion={coverFlowPrefersReducedMotion}
          config={journalLabCollectionConfig}
          appearanceConfig={cardAppearanceConfig}
          appearanceBreakpointTier={colors.breakpointTier}
          motion={coverFlowLiquidSliderMotion}
          gradientConfig={journalDockSliderConfig}
          basePalette={unifiedGradientPalette}
          influencedPalette={unifiedGradientPalette}
          visualSlide={unifiedGradientSlide}
          journalHologramConfig={cardHologramConfig}
          cardWidthPx={geometry.width}
          cardHeightPx={geometry.height}
          cardRadius={resolvedCollectionDockLayoutConfig.cardRadius}
          layoutConfig={resolvedCollectionDockLayoutConfig}
          ctaConfig={cardCtaConfig}
          hasHoverPointer={coverFlowHasHoverPointer}
          reveal={COVER_FLOW_DISABLED_REVEAL}
          detailsRevealSettled={cardDetailsRevealSettled}
          staggerRevealDelaysMs={revealDelaysMs}
          staggerRevealDurationMs={reveal.stagger?.durationMs}
          staggerRevealEasingCss={reveal.stagger?.easingCss}
          staggerRevealExitDelayMs={reveal.exit.delayMs}
          staggerRevealExitDurationMs={reveal.exit.durationMs}
          staggerRevealExitEasingCss={reveal.exit.easingCss}
          cardTypographyScale="proportional"
          cardProportionalContentInsetCqw={coverFlowContentInsetCqw}
          cardContentBlockHeight={COVER_FLOW_CONTENT_BLOCK_HEIGHT}
          meshActivity={isMeshLive ? 'continuous' : 'frozen'}
          stackNeighborSettled={!isActive && !isMeshLive}
          stackActiveSlide={isActive}
          activationRampDurationMs={activationRampDurationMs}
          distanceFromActiveLive={position.distanceFromActiveLive}
          inactiveCardHoverAmplitudeStep={coverFlowConfig.inactiveCardHoverAmplitudeStep}
          inactiveGradientScaleMode={dockPaletteConfig.inactiveGradientScaleMode}
          inactiveGradientScaleDistancePercent={inactiveScaleStepPercent}
          stackPresentation={{
            ...coverFlowStackPresentationBase,
            surfaceColor: coverFlowCardSurfaceColor,
            state: isActive ? 'active' : 'inactive',
            ...(depthPassEnabled ? { depthPassSurfaceEnabled: true } : null),
            ...(peekOutlineActive ? {
              textColor: shortArticleListBodyColor,
              topicBorderColor: shortArticleListBodyColor,
              cardBorderColor: shortArticleListBodyColor,
              // Flat 1, not `1 - focusProgress` — see peekOutlineActive's own
              // doc comment above for why this is a threshold, not a
              // scroll-scrubbed value.
              neutralSurfaceOpacityOverride: 1,
            } : null),
          }}
        />
      </div>
    );
  }, [
    coverFlowLiveMeshIndices, handleCoverFlowCardPointerDownCapture, handleCoverFlowCardClickCapture,
    coverFlowPrefersReducedMotion, journalLabCollectionConfig, coverFlowLiquidSliderMotion,
    journalDockSliderConfig, coverFlowPalettes, dockHologramConfig, resolvedCollectionDockLayoutConfig,
    normalizedCtaButtonConfig, coverFlowStackPresentationBase, coverFlowContentInsetCqw,
    coverFlowColumnBackgroundColor, coverFlowConfig.inactiveCardColumnDarkeningStep,
    coverFlowConfig.inactiveCardHoverAmplitudeStep, coverFlowConfig.activationRampRate,
    coverFlowConfig.navigationPathLg,
    cardAppearanceConfig, carouselAndListItems, mobilePinnedArticleSectionConfig.peekOutlineModeEnabled, shortArticleListBodyColor,
    coverFlowHasHoverPointer, colors.breakpointTier, dockPaletteConfig,
  ]);

  // Tablet/desktop only — mirrors the `bottom` slot's own gating
  // (colors.breakpointTier !== 'mobile'). When active, the Timeline moves
  // into the CoverFlow's own track via AbstractCoverFlowTimelineSlot
  // instead of AbstractNarrowColumnStack's `bottom` region, so exactly one
  // of the two ever renders — never both, avoiding a duplicate timeline/
  // tablist landmark in the DOM.
  //
  // Keyed on the real breakpoint tier, not isCoverFlowSplitTier — the two
  // used to be interchangeable (Lg was always split, Md was this page's
  // only stacked tier), but narrowColumnWidthTierLg can now be 'stacked'
  // too (desktop reusing the same full-width composition tablet already
  // has), and isCoverFlowSplitTier is false in that state. What actually
  // decides which config fields apply is the breakpoint itself, never
  // whether that breakpoint happens to be split or stacked this time.
  const coverFlowTimelineSlotActive = colors.breakpointTier === 'lg'
    ? abstractCoverFlowTimelineSlotConfig.enabledLg
    : colors.breakpointTier === 'md' && abstractCoverFlowTimelineSlotConfig.enabledMd;

  // Only meaningful in the CoverFlow-track placement (AboutTimeline's own
  // scrollWindowVisibleCount prop) — the classic narrow-column bottom
  // placement isn't height-constrained the same way, so it stays unlimited
  // (0) regardless of this config, exactly as before this field existed.
  const timelineScrollWindowVisibleCount = coverFlowTimelineSlotActive
    ? (colors.breakpointTier === 'lg'
      ? abstractTimelineConfigForDesktopMode.scrollWindowVisibleCountLg
      : abstractTimelineConfig.scrollWindowVisibleCountWide)
    : 0;
  const timelineScrollWindowActiveScrollDurationMs = colors.breakpointTier === 'lg'
    ? abstractCoverFlowTimelineSlotConfig.scrollWindowActiveScrollDurationMsLg
    : abstractCoverFlowTimelineSlotConfig.scrollWindowActiveScrollDurationMsMd;
  const timelineScrollWindowActiveScrollEasing = colors.breakpointTier === 'lg'
    ? abstractCoverFlowTimelineSlotConfig.scrollWindowActiveScrollEasingLg
    : abstractCoverFlowTimelineSlotConfig.scrollWindowActiveScrollEasingMd;
  const timelineScrollWindowActiveScrollDelayMs = colors.breakpointTier === 'lg'
    ? abstractCoverFlowTimelineSlotConfig.scrollWindowActiveScrollDelayMsLg
    : abstractCoverFlowTimelineSlotConfig.scrollWindowActiveScrollDelayMsMd;

  // The CoverFlow-track Timeline is painted on its figure's own translucent
  // face, not on the polymorphic narrow column beneath it. When opted in,
  // derive the Timeline's ink from that figure color using the same
  // restrained saturation/opacity/tolerance model as polymorphic-gradient
  // copy. The background start color is the stable, authored reference for
  // both flat and two-stop figure faces; it avoids pretending a single text
  // color can perfectly sample every pixel of a CSS gradient.
  const coverFlowTimelineAdaptiveInk = useMemo(() => {
    if (!coverFlowTimelineSlotActive) return null;
    const isDesktop = colors.breakpointTier === 'lg';
    const enabled = isDesktop
      ? abstractCoverFlowTimelineSlotConfig.adaptiveTextInkEnabledLg
      : abstractCoverFlowTimelineSlotConfig.adaptiveTextInkEnabledMd;
    if (!enabled) return null;
    const background = isDesktop
      ? abstractCoverFlowTimelineSlotConfig.backgroundColorLg
      : abstractCoverFlowTimelineSlotConfig.backgroundColorMd;
    const darkInkSaturation = isDesktop
      ? abstractCoverFlowTimelineSlotConfig.adaptiveTextInkDarkInkSaturationLg
      : abstractCoverFlowTimelineSlotConfig.adaptiveTextInkDarkInkSaturationMd;
    const opacityMultiplier = isDesktop
      ? abstractCoverFlowTimelineSlotConfig.adaptiveTextInkDarkInkOpacityMultiplierLg
      : abstractCoverFlowTimelineSlotConfig.adaptiveTextInkDarkInkOpacityMultiplierMd;
    const lightInkTolerance = isDesktop
      ? abstractCoverFlowTimelineSlotConfig.adaptiveTextInkLightInkToleranceLg
      : abstractCoverFlowTimelineSlotConfig.adaptiveTextInkLightInkToleranceMd;
    return {
      ink: resolveGradientColumnTypography(
        background, background, darkInkSaturation, opacityMultiplier,
        lightInkTolerance, globalTypographyConfig,
      ).ink,
      opacityMultiplier,
    };
  }, [
    abstractCoverFlowTimelineSlotConfig, colors.breakpointTier,
    coverFlowTimelineSlotActive, globalTypographyConfig,
  ]);

  // Opt-in row "chip" background + text color (AbstractTimelineLinkColorConfig
  // — pages/abstract.config.ts's own doc comment). null while off, so the
  // JSX below falls back to today's exact inkColorOverride-only treatment.
  // 'deriveFromGradient' reuses resolveGradientColumnTypography verbatim —
  // the same background→contrast-side→dark-ink-saturation-chroma algorithm
  // the narrow/wide column's own unified text ink already runs — rather
  // than a second, independently-tuned color system.
  const timelineLinkColors = useMemo(() => {
    if (!abstractTimelineLinkColorConfig.enabled) return null;
    const tier: 'Md' | 'Lg' = colors.breakpointTier === 'lg' ? 'Lg' : 'Md';
    const colorMode = tier === 'Lg'
      ? abstractTimelineLinkColorConfig.colorModeLg
      : abstractTimelineLinkColorConfig.colorModeMd;
    if (colorMode === 'manual') {
      return tier === 'Lg' ? {
        background: abstractTimelineLinkColorConfig.backgroundColorLg,
        text: abstractTimelineLinkColorConfig.textColorLg,
        backgroundActive: abstractTimelineLinkColorConfig.backgroundColorActiveLg,
        textActive: abstractTimelineLinkColorConfig.textColorActiveLg,
      } : {
        background: abstractTimelineLinkColorConfig.backgroundColorMd,
        text: abstractTimelineLinkColorConfig.textColorMd,
        backgroundActive: abstractTimelineLinkColorConfig.backgroundColorActiveMd,
        textActive: abstractTimelineLinkColorConfig.textColorActiveMd,
      };
    }
    const darkInkSaturation = tier === 'Lg'
      ? abstractTimelineLinkColorConfig.darkInkSaturationLg
      : abstractTimelineLinkColorConfig.darkInkSaturationMd;
    const darkInkOpacityMultiplier = tier === 'Lg'
      ? abstractTimelineLinkColorConfig.darkInkOpacityMultiplierLg
      : abstractTimelineLinkColorConfig.darkInkOpacityMultiplierMd;
    const lightInkTolerance = tier === 'Lg'
      ? abstractTimelineLinkColorConfig.lightInkToleranceLg
      : abstractTimelineLinkColorConfig.lightInkToleranceMd;
    const activeSurfaceOffset = tier === 'Lg'
      ? abstractTimelineLinkColorConfig.activeSurfaceOffsetLg
      : abstractTimelineLinkColorConfig.activeSurfaceOffsetMd;
    const gradientReference = resolvePolymorphicColumnBackgroundReference(colors, 'narrow');
    const background = gradientReference;
    const backgroundActive = deriveSurfaceColor(gradientReference, activeSurfaceOffset);
    const text = resolveGradientColumnTypography(
      background, background, darkInkSaturation, darkInkOpacityMultiplier,
      lightInkTolerance, globalTypographyConfig,
    ).ink;
    const textActive = resolveGradientColumnTypography(
      backgroundActive, backgroundActive, darkInkSaturation, darkInkOpacityMultiplier,
      lightInkTolerance, globalTypographyConfig,
    ).ink;
    return { background, text, backgroundActive, textActive };
  }, [abstractTimelineLinkColorConfig, colors, globalTypographyConfig]);

  // Resolve only ink against the expanded panel's surface. The row itself
  // remains transparent, including its hover/active state.
  const expandedMobileTimelineInkColors = useMemo(() => {
    const config = abstractTimelineLinkColorConfig;
    if (!config.enabledMobile || colors.breakpointTier !== 'mobile') return null;
    if (config.colorModeMobile === 'manual') return {
      text: config.textColorMobile,
      textActive: config.textColorActiveMobile,
    };
    const background = mobilePinnedArticleSectionConfig.expandedForcesMaxBackgroundDarken
      ? mobileArticleListBackgroundDarkened
      : mobileArticleListBackgroundAtRest;
    const text = resolveGradientColumnTypography(
      background, background, config.darkInkSaturationMobile,
      config.darkInkOpacityMultiplierMobile, config.lightInkToleranceMobile,
      globalTypographyConfig,
    ).ink;
    return { text, textActive: text };
  }, [
    abstractTimelineLinkColorConfig, colors.breakpointTier, globalTypographyConfig,
    mobileArticleListBackgroundAtRest, mobileArticleListBackgroundDarkened,
    mobilePinnedArticleSectionConfig.expandedForcesMaxBackgroundDarken,
  ]);

  // Single shared instance (consumed by whichever of the two placements
  // above is active) — not two independently-configured copies. Includes
  // its own shortArticleListDesktopInkRef wrapper so the live scroll-
  // adaptive ink CSS var it writes keeps working regardless of which
  // placement mounts it.
  const abstractTimelineForTabletDesktop = (
    <div
      ref={shortArticleListDesktopInkRef}
      data-abstract-article-list-section="true"
      // Only the coverflow-track figure needs (or has) a definite height to
      // fill — AboutTimeline's own fillContainerHeight="100%" chain (see its
      // own doc comment) needs a sized ancestor at every level between it
      // and the figure's own fixed-aspect-ratio box, and this wrapper is the
      // one level AbstractCoverFlowTimelineSlot.tsx's own generic `children`
      // slot doesn't know to stretch on this component's behalf. The classic
      // bottom-of-column placement (same shared JSX, coverFlowTimelineSlotActive
      // false) has no such ancestor and must stay auto-height, unaffected.
      style={coverFlowTimelineSlotActive ? { height: '100%' } : undefined}
    >
      <AboutTimeline
        rows={abstractTimelineRows}
        activeIndex={articleActiveIndex}
        onSelect={handleTimelineActiveIndexChange}
        accentColor={carouselAndListItems[articleActiveIndex]?.accent ?? '#ffffff'}
        columnBackgroundColor={colors.narrowColumnColor}
        inkColorOverride={timelineLinkColors
          ? undefined
          : (coverFlowTimelineAdaptiveInk?.ink ?? shortArticleListBodyColor)}
        bodyColorOverride={timelineLinkColors?.text ?? coverFlowTimelineAdaptiveInk?.ink}
        highlightColorOverride={timelineLinkColors?.textActive ?? coverFlowTimelineAdaptiveInk?.ink}
        rowBackgroundColorOverride={timelineLinkColors?.background}
        rowBackgroundColorActiveOverride={timelineLinkColors?.backgroundActive}
        scrollWindowVisibleCount={timelineScrollWindowVisibleCount}
        scrollWindowActiveScrollDurationMs={timelineScrollWindowActiveScrollDurationMs}
        scrollWindowActiveScrollEasing={timelineScrollWindowActiveScrollEasing}
        scrollWindowActiveScrollDelayMs={timelineScrollWindowActiveScrollDelayMs}
        // This same shared instance also serves the classic bottom-of-column
        // placement below (the `bottom` prop a bit further down this file)
        // whenever the coverflow-track slot itself is off — that placement
        // has no fixed-height ancestor for `fillContainerHeight` to fill, so
        // this is gated on the same boolean that already decides which of
        // the two placements is actually mounted.
        fillContainerHeight={coverFlowTimelineSlotActive}
        inkOpacityMultiplier={coverFlowTimelineAdaptiveInk?.opacityMultiplier
          ?? colors.scrollGradientDarkInkOpacityMultiplier}
        description={abstractTimelineConfigForDesktopMode.description || undefined}
        config={abstractTimelineConfigForDesktopMode}
        prefersReducedMotion={coverFlowPrefersReducedMotion}
        panelId={ABSTRACT_TIMELINE_PANEL_ID}
        // Same gradient-marker inputs renderCoverFlowItem already threads
        // into CoverFlow's own cards (carouselAndListItems is exactly
        // SliderContentSlide-shaped, coverFlowPalettes/
        // coverFlowLiquidSliderMotion/journalDockSliderConfig are the same
        // live instances) — the marker mesh matches whatever the active
        // CoverFlow card is already showing, not a second, independently-
        // configured gradient.
        gradientSlides={carouselAndListItems}
        gradientPaletteStates={coverFlowPalettes}
        gradientMotion={coverFlowLiquidSliderMotion}
        gradientConfig={journalDockSliderConfig}
      />
    </div>
  );

  // Content and order come from the curated manifest. The hero's article
  // count/order controls its own rail and does not silently edit this feed.
  const wallQuoteCoverFlowGradient = {
    slides: collectionArticleMeshInputs.length
      ? collectionArticleMeshInputs.map(meshInput => meshInput.slide)
      : carouselAndListItems,
    palettes: collectionArticleMeshInputs.length
      ? collectionArticleMeshInputs.map(meshInput => meshInput.palette)
      : coverFlowPalettes,
    motion: coverFlowLiquidSliderMotion,
    config: journalDockSliderConfig,
    hologramConfig: dockHologramConfig,
    // Needed so the CSS fallback render mode has a deck-chord gradient to paint
    // with on the wall (not only the live-mesh sample path). Without it, a quote
    // type set to CSS render mode would have no gradient on the wall.
    paletteConfig: dockPaletteConfig,
    activity: 'frozen' as const,
  };
  // The shared card's ambient hologram sweep starts when a touch card enters
  // view and changes both its tilt and mesh brightness. Keep wall articles
  // still on mobile and hover-incapable devices; desktop hover stays live.
  const wallCardHoverEnabled = coverFlowHasHoverPointer && colors.breakpointTier !== 'mobile';
  const wallCardHologramConfig = wallCardHoverEnabled
    ? dockHologramConfig
    : { ...dockHologramConfig, enabled: false };
  const wallItemGap = colors.breakpointTier === 'lg'
    ? tailwindTokenCssValue('gap', 'lg', wallConfig.gapLg)
    : colors.breakpointTier === 'md'
      ? tailwindTokenCssValue('gap', 'md', wallConfig.gapMd)
      : tailwindTokenCssValue('gap', 'base', wallConfig.gapBase);
  const wallMaximumColumns = colors.breakpointTier === 'lg'
    ? wallConfig.columnsLg : colors.breakpointTier === 'md'
      ? wallConfig.columnsMd : wallConfig.columnsBase;
  const resolvedWallColumns = wallColumnCount(
    wallWidthRect?.width,
    wallCssLengthPx(wallItemGap),
    wallMaximumColumns,
    colors.breakpointTier === 'md' ? WALL_MIN_TABLET_ITEM_WIDTH_PX : WALL_MIN_ITEM_WIDTH_PX,
  );
  const wallGridMaxWidthPx = resolvedWallColumns === 1
    ? Math.min(wallConfig.maxColumnWidthPx, WALL_SINGLE_COLUMN_MAX_WIDTH_PX)
    : resolvedWallColumns * wallConfig.maxColumnWidthPx
      + (resolvedWallColumns - 1) * wallCssLengthPx(wallItemGap);
  // The closing banner follows the first quote's actual masonry track on
  // mobile, including narrow viewports and author-adjusted wall columns.
  const wallRenderedGridWidthPx = Math.min(wallWidthRect?.width ?? wallGridMaxWidthPx, wallGridMaxWidthPx);
  const wallFeaturedColumnWidthPx = (wallRenderedGridWidthPx
    - (resolvedWallColumns - 1) * wallCssLengthPx(wallItemGap)) / resolvedWallColumns;
  // Choose the cap from the rendered count, so a narrow tablet with one
  // column receives the same treatment as a one-column mobile wall.
  const wallCardMaxWidthPx = resolvedWallColumns === 1
    ? wallConfig.cardMaxWidthColumns1Px
    : resolvedWallColumns === 2
      ? wallConfig.cardMaxWidthColumns2Px
      : resolvedWallColumns === 3
        ? wallConfig.cardMaxWidthColumns3Px
        : resolvedWallColumns === 4
          ? wallConfig.cardMaxWidthColumns4Px : undefined;
  const wallQuoteBreathingRoom: WallQuoteBreathingRoomConfig = {
    enabled: wallConfig.quoteGapEnabled,
    mediumMinLines: wallConfig.quoteGapMediumMinLines,
    longMinLines: wallConfig.quoteGapLongMinLines,
    mediumGapPx: colors.breakpointTier === 'lg' ? wallConfig.quoteGapMediumLgPx
      : colors.breakpointTier === 'md' ? wallConfig.quoteGapMediumMdPx : wallConfig.quoteGapMediumBasePx,
    longGapPx: colors.breakpointTier === 'lg' ? wallConfig.quoteGapLongLgPx
      : colors.breakpointTier === 'md' ? wallConfig.quoteGapLongMdPx : wallConfig.quoteGapLongBasePx,
  };
  const visibleWallFeed = wallFeed.filter(entry => {
    if (entry.kind === 'thought') return editorialQuoteDesigns.solid.enabled;
    if (entry.kind === 'article') return true;
    const variant = entry.quotation.role === 'feature' ? 'featured'
      : entry.quotation.role === 'excerpt' ? 'solid' : 'plain';
    return editorialQuoteDesigns[variant].enabled;
  });
  // Filled quote surfaces join article cards in the color rhythm check.
  const wallEntryIsColorful = (entry: WallFeedItem) => {
    if (entry.kind === 'article') return true;
    const variant = entry.kind === 'thought' ? 'solid'
      : entry.quotation.role === 'feature' ? 'featured'
        : entry.quotation.role === 'excerpt' ? 'solid' : 'plain';
    return editorialQuoteDesigns[variant].backgroundMode !== 'none';
  };
  const wallCanonicalSignature = visibleWallFeed.map(entry =>
    `${entry.id}:${wallEntryIsColorful(entry) ? 'color' : 'neutral'}`).join('|');
  const [wallOrder, setWallOrder] = useState<{
    source: string; columns: number; width: number; rowGap: number; ids: readonly string[];
  } | null>(null);
  const wallFeedById = new Map(visibleWallFeed.map(entry => [entry.id, entry]));
  const orderedWallFeed = wallConfig.colorRhythmEnabled && wallOrder?.source === wallCanonicalSignature
    && wallOrder.columns === resolvedWallColumns
    && wallOrder.ids.length === visibleWallFeed.length
    && wallOrder.ids.every(id => wallFeedById.has(id))
    ? wallOrder.ids.map(id => wallFeedById.get(id)!)
    : visibleWallFeed;
  const [wallTopRuleIndices, setWallTopRuleIndices] = useState<readonly number[]>([]);
  const visibleWallTopRules = new Set(wallTopRuleIndices);
  // Keeps the divider inserted by showTopRule at an equal distance from the
  // quote above it and the quote below it, even when quoteGapEnabled has
  // added extra density-based breathing room to the quote above -- see
  // wallQuoteTopRules.ts's own WallTopRuleLayout field docs. Computed in
  // the same DOM pass as wallTopRuleIndices below (not a separate effect),
  // since both come from the one real layout measurement.
  const [wallTopRuleGapSplit, setWallTopRuleGapSplit] = useState<{
    senderHalvedGapPxByQuoteIndex: Record<number, number>;
    receiverTopGapPxByQuoteIndex: Record<number, number>;
  }>({ senderHalvedGapPxByQuoteIndex: {}, receiverTopGapPxByQuoteIndex: {} });
  // Quotes with no item at all directly above them in their rendered
  // column (the masonry's first row, at whatever column count the current
  // breakpoint uses) -- exempt from WallQuoteItem's own breathing-room
  // centering, which assumes a neighbour on at least one side exists to
  // balance against. Same DOM pass as the state above.
  const [wallFirstInColumnIndices, setWallFirstInColumnIndices] = useState<readonly number[]>([]);
  const wallIsFirstInColumn = new Set(wallFirstInColumnIndices);
  let quoteIndex = 0;
  let articleIndex = 0;
  const wallItems = orderedWallFeed.flatMap(entry => {
    if (entry.kind === 'quotation' || entry.kind === 'statement') {
      const item = entry.quotation;
      const index = quoteIndex++;
      return [<WallQuoteItem key={entry.id} item={item} index={index}
        designs={editorialQuoteDesigns} partsDesign={quotePartsDesign}
        breathingRoomConfig={wallQuoteBreathingRoom}
        coverFlowGradient={wallQuoteCoverFlowGradient} liftPhysics={normalizedCtaButtonConfig}
        cardHeightToWidthRatio={coverFlowConfig.cardAspectRatio}
        featuredQuoteConfig={featuredQuoteConfig}
        practiceCardLayout={practicesLayoutConfig}
        showTopRule={visibleWallTopRules.has(index)}
        senderHalvedGapPx={wallTopRuleGapSplit.senderHalvedGapPxByQuoteIndex[index]}
        receiverTopGapPx={wallTopRuleGapSplit.receiverTopGapPxByQuoteIndex[index]}
        isFirstInColumn={wallIsFirstInColumn.has(index)} />];
    }
    if (entry.kind === 'thought') {
      const month = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(`${entry.publishedAt}T00:00:00Z`));
      return [<div key={entry.id} data-wall-thought="">
        <EditorialQuote
          variant="solid"
          config={{ ...editorialQuoteDesigns.solid, linkEnabled: true, linkLabel: 'Read thought', topRuleOpacityPercent: 0 }}
          headingAppearance={quotePartsDesign.heading}
          linkAppearance={quotePartsDesign.link}
          source={{
            key: entry.id,
            title: 'Thought',
            period: month,
            destination: entry.href,
            text: entry.description,
            ariaLabel: `Thought: ${entry.title} (${month})`,
            linkAriaLabel: `Read thought — ${entry.title}`,
          }}
          coverFlowGradient={wallQuoteCoverFlowGradient}
          cardHeightToWidthRatio={coverFlowConfig.cardAspectRatio}
          liftPhysics={normalizedCtaButtonConfig}
          deferGradientUntilVisible
        />
      </div>];
    }
    const article = entry.article;
    const index = articleIndex++;
    const gradientIndex = carouselAndListItems.findIndex(item => item.slug === article.slug);
      const unifiedGradientIndex = resolveUnifiedGradientInkEnabled(cardAppearanceConfig, colors.breakpointTier)
        && cardAppearanceConfig.invertedGradientInkUnifiedBackgroundEnabled
        ? Math.min(carouselAndListItems.length - 1, Number(cardAppearanceConfig.invertedGradientInkUnifiedBackgroundSourceCard) - 1)
        : gradientIndex;
      const visualSlide = carouselAndListItems[unifiedGradientIndex] ?? article;
      const palette = coverFlowPalettes?.[unifiedGradientIndex] ?? null;
      return [
        <div key={entry.id} data-wall-article-index={index}
          style={wallCardMaxWidthPx !== undefined
            ? { maxWidth: wallCardMaxWidthPx, marginInline: 'auto' }
            : undefined}
        >
          <WallCardSize aspectRatio={coverFlowConfig.cardAspectRatio}>
            {(width, height) => (
              <Card
                slot={{ index, article, lab: null, position: { leftPx: 0, topPx: 0, rotationDeg: 0 } }}
                targetView="articles"
                renderedView="articles"
                colorView="articles"
                phase="idle"
                transitioning={false}
                prefersReducedMotion={coverFlowPrefersReducedMotion}
                config={journalLabCollectionConfig}
                appearanceConfig={cardAppearanceConfig}
                appearanceBreakpointTier={colors.breakpointTier}
                motion={coverFlowLiquidSliderMotion}
                gradientConfig={journalDockSliderConfig}
                basePalette={palette}
                influencedPalette={palette}
                visualSlide={visualSlide}
                journalHologramConfig={wallCardHologramConfig}
                cardWidthPx={width}
                cardHeightPx={height}
                cardRadius={resolvedCollectionDockLayoutConfig.cardRadius}
                layoutConfig={resolvedCollectionDockLayoutConfig}
                ctaConfig={normalizedCtaButtonConfig}
                hasHoverPointer={wallCardHoverEnabled}
                reveal={COVER_FLOW_DISABLED_REVEAL}
                detailsRevealSettled
                cardTypographyScale="proportional"
                cardProportionalContentInsetCqw={coverFlowContentInsetCqw}
                cardContentBlockHeight={COVER_FLOW_CONTENT_BLOCK_HEIGHT}
                // Each wall card is a standalone surface. Desktop hover
                // needs continuous mesh updates; the device gate above
                // disables its hologram on mobile and touch devices.
                meshActivity="continuous"
                stackActiveSlide
                stackPresentation={{ ...coverFlowStackPresentationBase, state: 'active' }}
              />
            )}
          </WallCardSize>
        </div>,
      ];
  });
  const wallItemSignature = wallItems.map(item => item.key).join('|');
  useEffect(() => {
    if (!wallConfig.colorRhythmEnabled) return undefined;
    const wall = wallTiltSurfaceRef.current?.querySelector<HTMLElement>('[data-masonry-wall]');
    if (!wall) return undefined;
    const nodes = Array.from(wall.querySelectorAll<HTMLElement>(':scope > [data-masonry-item]'));
    if (nodes.length !== orderedWallFeed.length) return undefined;
    let frame = 0;
    let active = true;
    let lastWidth = wall.clientWidth;
    let lastSolvedLayout = wallOrder?.source === wallCanonicalSignature
      ? `${wallOrder.columns}|${wallOrder.width}|${wallOrder.rowGap}` : '';
    const measure = () => {
      if (!active) return;
      // Do not move focused cards under someone using the wall by keyboard.
      if (wall.contains(document.activeElement)) return;
      const computed = getComputedStyle(wall);
      const columns = Math.max(1, computed.gridTemplateColumns.split(' ').length);
      const rowGap = Number.parseFloat(computed.rowGap) || 0;
      const width = wall.clientWidth;
      const layoutKey = `${columns}|${width}|${rowGap}`;
      // Quote heights can change while fonts, gradients, and injected content
      // settle. Those changes must not turn the color-rhythm search into a
      // feedback loop that repeatedly permutes the masonry items.
      if (width <= 0 || layoutKey === lastSolvedLayout) return;
      lastSolvedLayout = layoutKey;
      const dimensions = new Map(orderedWallFeed.map((entry, index) => {
        const node = nodes[index];
        const height = node.getBoundingClientRect().height;
        const quoteExtraGap = Number(node.firstElementChild?.getAttribute('data-wall-quote-extra-gap') ?? 0) || 0;
        return [entry.id, { height, visualHeight: Math.max(0, height - quoteExtraGap) }] as const;
      }));
      const ids = orderWallEntriesForColorRhythm(visibleWallFeed.map(entry => ({
        id: entry.id,
        height: dimensions.get(entry.id)?.height ?? 0,
        visualHeight: dimensions.get(entry.id)?.visualHeight ?? 0,
        colorful: wallEntryIsColorful(entry),
        dated: entry.publishedAt !== null,
      })), columns, rowGap);
      setWallOrder(previous => previous?.source === wallCanonicalSignature
        && previous.columns === columns
        && previous.width === width
        && previous.rowGap === rowGap
        && previous.ids.length === ids.length
        && previous.ids.every((id, index) => id === ids[index])
        ? previous : { source: wallCanonicalSignature, columns, width, rowGap, ids });
    };
    const schedule = () => {
      if (!active) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    if (document.fonts?.status === 'loading') void document.fonts.ready.then(schedule);
    else schedule();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(entries => {
      if (entries.some(entry => Math.round(entry.contentRect.width) !== lastWidth)) {
        lastWidth = wall.clientWidth;
        schedule();
      }
    });
    observer?.observe(wall);
    window.addEventListener('resize', schedule);
    wall.addEventListener('focusout', schedule);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      wall.removeEventListener('focusout', schedule);
    };
  }, [wallConfig.colorRhythmEnabled, wallItemSignature, wallCanonicalSignature, resolvedWallColumns, wallItemGap]);
  useEffect(() => {
    const wall = wallTiltSurfaceRef.current?.querySelector<HTMLElement>('[data-masonry-wall]');
    if (!wall) return undefined;
    let frame = 0;
    const items = Array.from(wall.querySelectorAll<HTMLElement>(':scope > [data-masonry-item]'));
    const measure = () => {
      const positions: WallMasonryItemPosition[] = items.flatMap((node, order) => {
        const content = node.firstElementChild as HTMLElement | null;
        if (!content) return [];
        const role = content.hasAttribute('data-wall-article-index')
          ? 'article' : content.hasAttribute('data-wall-thought') ? 'thought' : content.dataset.wallQuoteRole;
        if (role !== 'article' && role !== 'thought' && role !== 'feature' && role !== 'statement' && role !== 'excerpt') return [];
        return [{
          order,
          quoteIndex: role === 'article' || role === 'thought' ? undefined : Number(content.dataset.wallQuoteIndex),
          columnX: node.offsetLeft,
          topY: node.offsetTop,
          role,
          extraGapPx: role === 'article' || role === 'thought'
            ? undefined : Number(content.dataset.wallQuoteExtraGap) || 0,
        }];
      });
      const layout = wallTopRuleLayout(positions);
      const next = layout.ruleQuoteIndices;
      setWallTopRuleIndices(previous => previous.length === next.length && previous.every((index, i) => index === next[i])
        ? previous : next);
      setWallTopRuleGapSplit(previous => {
        const same = shallowNumberRecordsEqual(previous.senderHalvedGapPxByQuoteIndex, layout.senderHalvedGapPxByQuoteIndex)
          && shallowNumberRecordsEqual(previous.receiverTopGapPxByQuoteIndex, layout.receiverTopGapPxByQuoteIndex);
        return same ? previous : {
          senderHalvedGapPxByQuoteIndex: layout.senderHalvedGapPxByQuoteIndex,
          receiverTopGapPxByQuoteIndex: layout.receiverTopGapPxByQuoteIndex,
        };
      });
      const nextFirstInColumn = layout.firstInColumnQuoteIndices;
      setWallFirstInColumnIndices(previous => previous.length === nextFirstInColumn.length
        && previous.every((index, i) => index === nextFirstInColumn[i])
        ? previous : nextFirstInColumn);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(wall);
    items.forEach(item => observer?.observe(item));
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [wallItemSignature, wallConfig.columnsBase, wallConfig.columnsMd, wallConfig.columnsLg, mobileStaticHeaderBeforeWall]);
  // headerIsStatic mirrors the active tier's header position. Mobile starts
  // static; tablet and desktop start fixed.
  const headerOverlayActive = wallConfig.headerOverlayEnabled
    && !headerIsStatic
    && colors.scrollGradientActive
    && Boolean(measuredHeaderHeightPx);
  // Resolve both overlay controls from the same active tier as the wall and
  // header, so changing one breakpoint cannot alter another's backdrop.
  const headerOverlayPaddingYPx = colors.breakpointTier === 'lg'
    ? wallConfig.headerOverlayPaddingYPxLg
    : colors.breakpointTier === 'md'
      ? wallConfig.headerOverlayPaddingYPxMd
      : wallConfig.headerOverlayPaddingYPx;
  const headerOverlayBlurPx = colors.breakpointTier === 'lg'
    ? wallConfig.headerOverlayBlurPxLg
    : colors.breakpointTier === 'md'
      ? wallConfig.headerOverlayBlurPxMd
      : wallConfig.headerOverlayBlurPx;
  const headerOverlayTotalHeightPx =
    (measuredHeaderHeightPx ?? 0) + headerOverlayPaddingYPx * 2;
  // backdrop-filter's softening isn't confined to the element's own edge --
  // a Gaussian blur's visible falloff reaches roughly 3x its radius past
  // whatever boundary produced it (a generous, standard safety multiple:
  // ~3 standard deviations covers >99% of a Gaussian's spread, and blur()'s
  // own stdDeviation is about half the specified radius, so 3x radius is
  // already a comfortable margin over the ~1.5x that formula implies).
  // Right now that falloff is happening on all four sides at once -- top
  // and left/right happen to land off-screen (nothing above y=0 or past
  // the viewport edges to show it), but bottom lands squarely in the wall,
  // which is the one edge meant to read as soft. Overshooting the element
  // itself upward and sideways by this same margin, then trimming its
  // height back down so the bottom edge stays exactly where it already
  // was, pushes the top/left/right falloff *further* off-screen (now
  // starting from a boundary that's already off-screen, not from y=0) --
  // what's left inside the viewport, away from that pushed-back boundary,
  // reads as uniform full-strength blur, with the softening visible only
  // at the one edge that was never moved: the bottom.
  const headerOverlayBlurOvershootPx = headerOverlayBlurPx * 3;
  // backdrop-filter's own edge fade is narrow -- right at an element's true
  // boundary a Gaussian blur is only ~50% mixed with "nothing," not fully
  // transparent; full fade-out only completes a couple of blur-radii away.
  // Relying on that alone left scrolled wall content still legible right
  // up against the overlay's bottom edge (operator-reported from a
  // screenshot: readable card copy, not just a color wash, passing through
  // that boundary while scrolling). mask-image adds an explicit, WIDER
  // fade on top of it -- same 3x-blur-radius span used for the overshoot
  // above, for the same reason (a generous multiple of the blur's own
  // reach) -- so content is already substantially faded well before the
  // true edge, not just at the final pixel of it.
  const headerOverlayBottomFeatherPx = headerOverlayBlurPx * 3;
  // Vertical overshoot, simplified: double the real height and translate
  // the box up by its own full height (translateY(-100%)) instead of
  // computing an explicit negative top offset -- `top` stays the real
  // bottom anchor (headerOverlayTotalHeightPx), and -100% flips the
  // anchor from the box's top edge to its bottom edge, so the bottom
  // still lands exactly on that same anchor regardless of how tall the
  // box grows above it.
  const headerOverlayBoxHeightPx = headerOverlayTotalHeightPx * 2;
  const headerOverlayMaskGradient = `linear-gradient(to bottom, black 0, black ${
    Math.max(0, headerOverlayBoxHeightPx - headerOverlayBottomFeatherPx)
  }px, transparent ${headerOverlayBoxHeightPx}px)`;
  // The real gradient recipe, computed with the exact same pure functions
  // PolymorphicScrollGradientBackground.tsx uses internally (same inputs:
  // colors.scrollGradientResolved) -- not a re-rendered live instance of
  // that component. Reused as a plain CSS background-image instead of a
  // nested `position: fixed` component specifically so `filter: blur()`
  // can be applied directly, on this one leaf element, with zero
  // containing-block side effects (filter makes its element the containing
  // block for `position: fixed` descendants -- fine here, since this
  // element now has none).
  const headerOverlayScrollGradient = colors.scrollGradientResolved;
  const headerOverlayGradientStops = generateHarmonicGradient({
    baseHue: headerOverlayScrollGradient.baseHue,
    hueScheme: headerOverlayScrollGradient.hueScheme,
    lightnessRange: { min: headerOverlayScrollGradient.lightnessMin },
    chromaRange: { min: headerOverlayScrollGradient.chromaMin },
    mode: headerOverlayScrollGradient.mode,
    stops: headerOverlayScrollGradient.stops,
    variance: headerOverlayScrollGradient.variance,
    centerStretch: headerOverlayScrollGradient.centerStretch,
    seed: headerOverlayScrollGradient.seed,
  });
  const headerOverlayBackgroundImage = headerOverlayScrollGradient.compositor === 'legacy'
    ? buildLegacyScrollGradient(headerOverlayGradientStops)
    : buildEnhancedScrollGradient(
      headerOverlayGradientStops,
      clamp(Math.round(
        headerOverlayScrollGradient.mixSamples * Math.max(0.25, headerOverlayScrollGradient.smoothness),
      ), 16, 128),
      headerOverlayScrollGradient.interpolation,
      headerOverlayScrollGradient.focalHorizontal,
      headerOverlayScrollGradient.lightRadiusPercent,
      headerOverlayScrollGradient.lightAspectRatio,
      headerOverlayScrollGradient.lightFalloff,
      headerOverlayScrollGradient.extentPercent,
    );
  // Same "hidden percent" compositing PolymorphicScrollGradientBackground's
  // own enhancedLayerStyle applies (its lightHiddenPercent doc comment) --
  // legacy compositor skips it (hiddenFraction 0 collapses cleanly to a
  // plain 100vh/0 background). background-attachment: fixed pins this
  // background to the true viewport regardless of this element's own
  // position, so wherever the element actually sits on screen, it shows
  // the segment of the real gradient that corresponds to that exact
  // viewport position -- not a recentered or rescaled copy.
  const headerOverlayHiddenFraction = headerOverlayScrollGradient.compositor === 'legacy'
    ? 0 : clamp(headerOverlayScrollGradient.lightHiddenPercent, 0, 95) / 100;
  const headerOverlayVisibleFraction = 1 - headerOverlayHiddenFraction;
  const headerOverlayBackgroundSizeVh = 100 / headerOverlayVisibleFraction;
  const headerOverlayBackgroundPositionVh =
    -(headerOverlayHiddenFraction / headerOverlayVisibleFraction) * 100;

  // A static mobile header must precede the wall in document flow.
  // Fixed tiers keep the wall in its existing top-level position.
  const wallSection = (
      <section
        ref={wallTiltSectionRef}
        aria-label="Articles and thoughts"
        className={`${styles.wallQuotes} relative z-10 w-full ${wallConfig.paddingTopBase} ${wallConfig.paddingTopMd} ${wallConfig.paddingTopLg}`}
        data-wall-quotes=""
        data-wall-tilt-available={wallTiltAvailable ? 'true' : 'false'}
      >
        <h2 className="sr-only">Articles and thoughts</h2>
        {/* Share the header's PageContainer cap and responsive gutters. Only
            below 409px does this wall use a smaller gutter to preserve its
            345px item width where the viewport can physically hold it. */}
        <PageContainer
          config={normalizedPageSurfaceConfig}
          className={[
            'wall-minimum-width-container',
            normalizedSiteHeaderConfig.paddingX,
            normalizedSiteHeaderConfig.paddingXWide,
            normalizedSiteHeaderConfig.paddingXLg,
          ].join(' ')}
        >
          <div ref={wallWidthRef}>
            <div
              ref={wallTiltSurfaceRef}
              data-wall-tilt-active="false"
              data-wall-resolved-columns={resolvedWallColumns}
              style={{
                // Tracking and release use different transitions, set by the
                // pointer-tilt effect rather than a static JSX style.
                transformOrigin: 'center center',
              }}
            >
              <div data-wall-column-cap="" style={{ maxWidth: wallGridMaxWidthPx, marginInline: 'auto' }}>
                <MasonryWall
                  placement="reading-order"
                  columns={{ base: resolvedWallColumns, md: resolvedWallColumns, lg: resolvedWallColumns }}
                  columnGap={wallItemGap}
                  rowGap={wallItemGap}
                >
                  {wallItems}
                </MasonryWall>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>
  );

  const bannerInkColor = resolveEditorialInk(bottomBannerQuoteDesign);
  // Practice quotes without their own background are part of the banner's
  // text layer. Give their nested Quote the banner ink so its local plain-ink
  // style does not replace the inherited gray with the practice preset's white.
  const bannerPracticeQuoteDesign = editorialQuoteDesigns.practice.backgroundMode === 'none'
    ? { ...editorialQuoteDesigns.practice, solidTextColor: bannerInkColor }
    : editorialQuoteDesigns.practice;
  const bannerEditorialHero = config.heroContentEnabled ? (
    abstractPageLayoutConfig.presentationMode === 'classic' && !gridLayoutActive
      ? (
        <AbstractEditorialHero
          headline={pageContent.hero.heading}
          paragraphs={pageContent.hero.body}
          actionInkTone="dark"
          config={normalizedEditorialHeroConfig}
          introStartAt={pageIntroStartedAt}
          accordionItemConfig={heroAccordionItemConfig}
          horizontalPlacement={
            NARROW_COLUMN_ALIGN_TO_HERO_HORIZONTAL_PLACEMENT[
              splitColumnLayoutConfig.narrowColumnContentAlign
            ]
          }
          horizontalPlacementWide={
            NARROW_COLUMN_ALIGN_TO_HERO_HORIZONTAL_PLACEMENT_WIDE[
              splitColumnLayoutConfig.narrowColumnContentAlignWide
            ]
          }
          horizontalPlacementLg={
            NARROW_COLUMN_ALIGN_TO_HERO_HORIZONTAL_PLACEMENT_LG[
              splitColumnLayoutConfig.narrowColumnContentAlignLg
            ]
          }
          copyInkTone="dark"
          ctaConfig={normalizedCtaButtonConfig}
          heroCtaComposerConfig={normalizedHeroCtaComposerConfig}
          gradientHeadlineActive={heroContentPresentationActive}
          gradientDebugCanvasRef={heroHeadlineDebugCanvasRef}
          gradientDebugPanelOpen={isPanelOpen}
          headlineCanvasRef={heroHeadlineCanvasRef}
          headlineRef={heroHeadlineRef}
          layoutMode={heroLayoutMode}
          surfaceColor={normalizedPageSurfaceConfig.color}
          wordmarkGradientStops={narrowColumnWordmarkGradientStops}
          scrollGradientDarkenViewportRangeVh={colors.scrollGradientResolved.viewportRangeVh}
          scrollGradientDarkenTauMs={colors.scrollGradientResolved.tauMs}
          scrollGradientOriginColor={narrowColumnGradientTextOrigin}
          scrollGradientMaxDarken={colors.scrollGradientResolved.maxDarken}
          titleColorOverride={bannerInkColor}
          eyebrowColorOverride={bannerInkColor}
          accordionItemTextColorOverride={bannerInkColor}
          bodyColorOverride={bannerInkColor}
          highlightColorOverride={bannerInkColor}
          titleOpacityOverride={1}
          bodyOpacityOverride={1}
          highlightOpacityOverride={1}
        />
      ) : (
              <div data-abstract-editorial-section="true">
                <AbstractEditorialHero
                headline={pageContent.hero.heading}
                paragraphs={pageContent.hero.body}
                actionInkTone="dark"
                config={normalizedSplitColumnHeroConfig}
                introStartAt={pageIntroStartedAt}
                accordionItemConfig={heroAccordionItemConfig}
                horizontalPlacement={
                  NARROW_COLUMN_ALIGN_TO_HERO_HORIZONTAL_PLACEMENT[
                    splitColumnLayoutConfigForColors.narrowColumnContentAlign
                  ]
                }
                horizontalPlacementWide={
                  NARROW_COLUMN_ALIGN_TO_HERO_HORIZONTAL_PLACEMENT_WIDE[
                    splitColumnLayoutConfigForColors.narrowColumnContentAlignWide
                  ]
                }
                horizontalPlacementLg={
                  NARROW_COLUMN_ALIGN_TO_HERO_HORIZONTAL_PLACEMENT_LG[
                    splitColumnLayoutConfigForColors.narrowColumnContentAlignLg
                  ]
                }
                copyInkTone="dark"
                ctaConfig={normalizedCtaButtonConfig}
                heroCtaComposerConfig={normalizedHeroCtaComposerConfig}
                gradientHeadlineActive={heroContentPresentationActive}
                gradientDebugCanvasRef={heroHeadlineDebugCanvasRef}
                gradientDebugPanelOpen={isPanelOpen}
                headlineCanvasRef={heroHeadlineCanvasRef}
                headlineRef={heroHeadlineRef}
                layoutMode={gridLayoutActive ? 'editorial' : heroLayoutMode}
                surfaceColor={normalizedPageSurfaceConfig.color}
                columnBackgroundColor={colors.narrowColumnColor}
                wordmarkGradientStops={narrowColumnWordmarkGradientStops}
                scrollGradientDarkenViewportRangeVh={colors.scrollGradientResolved.viewportRangeVh}
                scrollGradientDarkenTauMs={colors.scrollGradientResolved.tauMs}
                scrollGradientOriginColor={narrowColumnGradientTextOrigin}
                scrollGradientMaxDarken={colors.scrollGradientResolved.maxDarken}
                titleColorOverride={bannerInkColor}
                eyebrowColorOverride={bannerInkColor}
                accordionItemTextColorOverride={bannerInkColor}
                bodyColorOverride={bannerInkColor}
                highlightColorOverride={bannerInkColor}
                titleOpacityOverride={1}
                bodyOpacityOverride={1}
                highlightOpacityOverride={1}
                />
              </div>
      )
  ) : null;

  return (
    <SiteContentProvider site={siteContent} page={pageContent}>
    <>
      <SeoHead
        title={buildSiteTitle(pageContent.meta.title)}
        description={pageContent.meta.description}
        canonicalPath="/"
      />
      {headerOverlayActive ? (
        // DIAGNOSTIC PLACEMENT (operator ask): top: 0 (the very top of the
        // viewport) with height = headerOverlayTotalHeightPx x2 (the real
        // header+padding height, doubled), translateY(-100%) shifting the
        // box up by its own full (doubled) height so its BOTTOM edge lands
        // exactly at top: 0 -- the box itself extends upward, off-screen,
        // above the viewport. translateX(-50%) + left: 50% + width: 200%
        // (unchanged from the prior step) keep it horizontally centered.
        // Not the final placement.
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[501]"
          data-wall-header-overlay=""
          style={{
            top: headerOverlayTotalHeightPx / 1.95,
            left: '50%',
            width: '200%',
            height: headerOverlayTotalHeightPx * 2,
            transform: 'translate(-50%, -100%)',
            backgroundImage: headerOverlayBackgroundImage,
            backgroundAttachment: 'fixed',
            backgroundSize: `100% ${headerOverlayBackgroundSizeVh}vh`,
            backgroundPosition: `0 ${headerOverlayBackgroundPositionVh}vh`,
            backgroundRepeat: 'no-repeat',
            filter: headerOverlayBlurPx > 0
              ? `blur(${headerOverlayBlurPx}px)` : undefined,
          }}
        />
      ) : null}
      {!mobileStaticHeaderBeforeWall ? wallSection : null}
      <style>{`
        @media (max-width: 408px) {
          :is([data-wall-quotes], [data-wall-feature-banner]) .wall-minimum-width-container {
            padding-inline: max(0px, calc(50% - ${WALL_MIN_ITEM_WIDTH_PX / 2}px));
          }
        }
        /* The hero reuses an always-open accordion header as a static title.
           Its button has no action, so do not advertise it as a link. */
        [data-editorial-hero-root] button[aria-expanded=true] {
          cursor: default;
        }
      `}</style>
    {abstractPageLayoutConfig.presentationMode === 'classic' ? (
    <>
    <main
      className={`relative min-h-[100dvh] overflow-x-clip ${abstractLayoutPending ? styles.layoutGatePending : ''}`}
      style={{
        color: 'white',
        background: heroContentPresentationActive
          ? normalizedPageSurfaceConfig.color
          : config.skyRenderMode === 'refractor'
          ? '#ffffff'
          : config.skyRenderMode === 'legacy' || config.skyRenderMode === 'glass'
          ? config.backgroundColor
          : twilightGradient.terminalColor,
      }}
    >
      <section
        id="about"
        aria-labelledby="abstract-hero-title"
        className={[
          styles.heroZone,
          'relative isolate flex h-auto min-h-0 flex-col overflow-visible [touch-action:pan-y] md:h-[calc(100svh_-_var(--hero-dock-peek))]',
          '[--hero-gutter:20px] [--hero-dock-peek:64px]',
          'max-[359px]:[--hero-gutter:18px] min-[600px]:[--hero-gutter:24px] md:[--hero-gutter:32px] md:[--hero-dock-peek:294px] lg:[--hero-gutter:48px] lg:[--hero-dock-peek:clamp(128px,calc(101svh_-_811.52px),640px)] [@media(min-width:1024px)_and_(max-height:800px)]:[--hero-dock-peek:136px]',
        ].filter(Boolean).join(' ')}
        data-hero-tone={heroTone}
        data-hero-content-surface={heroContentPresentationActive ? 'light' : 'field'}
        data-layout-mode={heroLayoutMode}
        data-sky-mode={config.skyRenderMode}
        data-hero-renderer-ready={heroRendererReady ? 'true' : 'false'}
        style={heroStyle}
      >
        {config.skyRenderMode === 'living' || config.skyRenderMode === 'glass' || config.skyRenderMode === 'legacy' ? (
          <div className={styles.gradientSourceViewport}>
            <canvas
              key={config.skyRenderMode}
              ref={canvasRef}
              className={styles.gradientSourceCanvas}
              onPointerDown={legacyGradientDragEnabled ? handlePointerDown : undefined}
              onPointerMove={legacyGradientDragEnabled ? handlePointerMove : undefined}
              onPointerUp={legacyGradientDragEnabled ? handlePointerEnd : undefined}
              onPointerCancel={legacyGradientDragEnabled ? handlePointerEnd : undefined}
              onWheel={legacyGradientDragEnabled ? handleWheel : undefined}
              aria-hidden={!legacyGradientDragEnabled || undefined}
              aria-label={legacyGradientDragEnabled ? 'Gradient designer canvas' : undefined}
              style={{
                cursor: legacyGradientDragEnabled
                  ? isDragging ? 'grabbing' : 'grab'
                  : 'default',
                opacity: config.skyRenderMode === 'living' || config.skyRenderMode === 'glass'
                  ? heroRendererReady ? 1 : 0
                  : 0,
                pointerEvents: legacyGradientDragEnabled ? 'auto' : 'none',
                touchAction: legacyGradientDragEnabled ? 'pan-y' : 'auto',
                userSelect: 'none',
              }}
            />
          </div>
        ) : null}
        {config.skyRenderMode === 'refractor' ? (
          <div
            aria-hidden="true"
            className={styles.refractorLayer}
            data-orientation={config.refractorOrientation}
            style={{
              '--refractor-slice-count': refractorSliceCount,
            } as CSSProperties}
          >
            {Array.from({ length: refractorSliceCount }, (_, sliceIndex) => {
              const sliceDistanceFromCenter = Math.abs(refractorCenterSliceIndex - sliceIndex);
              const rowDisplacementPercent = config.refractorOrientation === 'rows'
                ? (refractorCenterSliceIndex - sliceIndex) * refractorRowDisplacementStepPercent
                : 0;
              const rowScalePercent = config.refractorOrientation === 'rows'
                ? Math.max(10, 100 - sliceDistanceFromCenter * refractorRowScaleStepPercent)
                : 100;
              const columnDisplacementPercent = config.refractorOrientation === 'columns'
                ? (refractorCenterSliceIndex - sliceIndex) * refractorColumnDisplacementStepPercent
                : 0;
              const columnScalePercent = config.refractorOrientation === 'columns'
                ? Math.max(10, 100 - sliceDistanceFromCenter * refractorColumnScaleStepPercent)
                : 100;

              return (
                <span
                  className={styles.refractorSlice}
                  key={sliceIndex}
                  style={{
                    '--refractor-row-displacement-y': `${rowDisplacementPercent}%`,
                    '--refractor-row-scale-y': `${rowScalePercent}%`,
                    '--refractor-column-displacement-x': `${columnDisplacementPercent}%`,
                    '--refractor-column-scale-x': `${62 * columnScalePercent / 100}vmin`,
                  } as CSSProperties}
                />
              );
            })}
          </div>
        ) : null}
        {config.skyRenderMode === 'legacy' && gridLayoutActive ? (
          <AbstractHeroGrid
            cellCanvasRefs={gradientGridCellCanvasRefs}
            colorMode={normalizedSiteHeaderConfig.colorMode}
            headerTone={backgroundAwarenessActive ? headerTone : heroTone}
            logoStops={topHeaderLogoStops}
            navBorderColor={normalizedSiteHeaderConfig.navBorderColor}
                navTextColor={colors.scrollGradientActive
                  ? topHeaderTitleColor
                  : normalizedSiteHeaderConfig.navTextColor}
            totalCellCount={overlayFaceCount}
            hideNavigationOnMobile={mobileNavCubeConfig.enabled}
          />
        ) : (
          <>
            {config.skyRenderMode === 'legacy' ? (
              <div
                aria-hidden="true"
                className={styles.gradientOutputViewport}
                data-content-surface={heroContentPresentationActive ? 'light' : 'field'}
                data-renderer-ready={heroRendererReady ? 'true' : 'false'}
              >
                <div className={styles.gradientOutputStack}>
                  {Array.from({ length: gradientLayerCount }).map((_, layerIndex) => (
                    <canvas
                      key={layerIndex}
                      ref={node => {
                        gradientSnapshotLayerRefs.current[layerIndex] = node;
                      }}
                      className={styles.gradientSnapshotLayer}
                      style={{
                        height: `${getProceduralColorStackLayerHeightRatio(layerIndex, overlayFaceCount) * 100}%`,
                        mixBlendMode: layerIndex === 0 ? 'normal' : ABSTRACT_GRADIENT_SNAPSHOT_BLEND_MODE,
                        opacity: ABSTRACT_GRADIENT_SNAPSHOT_OPACITY,
                      }}
                    />
                  ))}
                  <canvas
                    ref={legacyCompositeCanvasRef}
                    className={styles.gradientCompositeCanvas}
                    data-legacy-canonical-composite="true"
                  />
                </div>
                {config.legacyScrimEnabled ? (
                  <div aria-hidden="true" className={styles.heroScrim} />
                ) : null}
              </div>
            ) : null}
          <SiteHeader
            config={{
              ...normalizedSiteHeaderConfig,
              // The wordmark gradient is valid for the logo, but the
              // desktop nav's clipped text background renders as solid
              // rectangles in this header path. Keep nav labels on their
              // resolved contrast color until that rendering path is fixed.
              navTextUsesWordmarkGradient: false,
              colorMode: colors.scrollGradientActive ? 'custom' : normalizedSiteHeaderConfig.colorMode,
            }}
            dataInkTone={backgroundAwarenessActive ? headerTone : undefined}
            logoStops={topHeaderLogoStops}
            wordmarkConfig={effectiveWordmarkConfig}
            wordmarkGradientStops={narrowColumnWordmarkGradientStops}
            navBandActive={heroNavBandActive}
            navBandCanvasRef={heroNavBandCanvasRef}
            navBandColorFilter={heroNavBandColorFilter}
            pageSurfaceConfig={normalizedPageSurfaceConfig}
          />
          </>
        )}

      </section>
      {/* The collection owns its label/control spacing while the scattered deck
          still reserves exactly journalTopPeekPx before its positioned field.
          The deck's own container
          (AbstractPostDockScatter) rides up into that reserved space via a
          negative margin-top of the same amount (see
          computeAbstractPostDockTopPeekPx), so the deck's peek is fully
          absorbed before it reaches the collection header.
          Padding, specifically, because a *margin* here would collapse with
          the collection header's own bottom spacing. Padding never collapses
          with that margin, so the mechanical clearance remains fully absorbed
          by the deck's cancelling negative margin. marginTop is still
          dockLayoutConfig's own headingOffsetPx (default 0); the hero section
          above already reserves the above-the-fold card sliver. */}
      <div
        id="journal"
        aria-label="Journal"
        className={styles.journalSection}
        role="region"
        style={{
          // The slider layout mode deliberately bleeds its draggable row to
          // the true viewport edges (CardSlider's own `left: 50%; width:
          // 100vw; margin-left: -50vw` wrapper) — 'clip' here would cut that
          // off at this section's own padded box. Grid mode never bleeds, so
          // it keeps the original clip that contains its scattered cards'
          // rotation overflow.
          overflowX: journalLabCollectionSliderConfig.layoutMode === 'slider'
            ? 'visible'
            : 'clip',
        }}
        tabIndex={-1}
      >
        <PageContainer
          className={COLLECTION_CONTAINER_CLASSNAME}
          config={normalizedPageSurfaceConfig}
          style={{
            marginTop: `${dockLayoutConfig.headingOffsetPx}px`,
          }}
        >
          <div
            className="w-full"
            ref={collectionContainerProbeRef}
          >
            {journalLabCollectionConfig.enabled ? (
              <AbstractJournalLabCollection
                articles={dockItems ?? []}
                labs={labs ?? []}
                onArticleMeshInputsChange={setCollectionArticleMeshInputs}
                config={journalLabCollectionConfig}
                sliderConfig={journalLabCollectionSliderConfig}
                introductionConfig={dockIntroductionConfig}
                gradientConfig={journalDockSliderConfig}
                paletteConfig={dockPaletteConfig}
                hueInfluenceConfig={dockHueInfluenceConfig}
                layoutConfig={resolvedCollectionDockLayoutConfig}
                journalHologramConfig={dockHologramConfig}
                labCardConfig={labCardConfig}
                headingConfig={normalizedCollectionHeadingConfig}
                containerBg={normalizedPageSurfaceConfig.color}
                containerWidthPx={
                  collectionAvailableWidthPx ??
                  collectionContainerWidthPx ??
                  resolvedCollectionDockLayoutConfig.cardWidthPx
                }
                enforceCardWidthBounds={!journalUsesNarrowDock}
              />
            ) : (
              <>
                {/* paddingBottom (not marginBottom) reserves the peek space —
                    see the long comment that used to sit above this block for
                    why padding is required here instead of margin. */}
                <div style={{ paddingBottom: `${journalTopPeekPx}px` }}>
                  <SectionHeading config={normalizedCollectionHeadingConfig}>
                    JOURNAL & LABS
                  </SectionHeading>
                </div>
                <div
                  style={journalUsesNarrowDock
                    ? {
                        marginInline: `-${journalDockNarrowPeekRem}rem`,
                        width: `calc(100% + ${journalDockNarrowPeekRem * 2}rem)`,
                      }
                    : undefined}
                >
                  <AbstractPostDock
                    items={dockItems ?? []}
                    config={journalDockSliderConfig}
                    introductionConfig={dockIntroductionConfig}
                    gradientPerformanceConfig={dockGradientPerformanceConfig}
                    paletteConfig={dockPaletteConfig}
                    hueInfluenceConfig={dockHueInfluenceConfig}
                    layoutConfig={resolvedCollectionDockLayoutConfig}
                    hologramConfig={dockHologramConfig}
                    editorialSurfaceColor={normalizedPageSurfaceConfig.color}
                    narrowDetectionSource="viewport"
                    variant="embedded"
                  />
                </div>
              </>
            )}
          </div>
        </PageContainer>
      </div>
      {showAuthoringTools ? (
        <div className={styles.panelSlot}>
          <GradientDesignerPanel
            config={activeDesignerConfig}
            componentConfigBindings={componentConfigBindings}
            designerTarget={gradientDesignerTarget}
            headingGradientRelationship={normalizedEditorialHeroConfig.headlineGradientRelationship}
            isOpen={isPanelOpen}
            panelBackgroundColor={configPanelBackgroundColor}
            onDesignerTargetChange={setGradientDesignerTarget}
            onHeadingGradientRelationshipChange={handleHeadingGradientRelationshipChange}
            onSyncHeadingGradient={syncHeadingGradientFromLegacy}
            onToggle={togglePanel}
            onReset={resetConfig}
            onResetView={resetActiveDesignerView}
            onRandomizeSeed={randomizeActiveDesignerSeed}
            previewMode={gradientSnapshotFrozen ? 'snapshot' : 'live'}
            onPreviewModeChange={handlePreviewModeChange}
            updateConfig={updateActiveDesignerConfig}
          />
        </div>
      ) : null}
    </main>
    {!journalLabCollectionConfig.enabled && labs && labs.length > 0 && (
      <section
        className="relative z-10 py-16"
        style={labSectionConfig.backgroundMode !== 'transparent'
          ? { backgroundColor: labSectionConfig.backgroundMode === 'custom'
              ? labSectionConfig.customBackgroundColor
              : normalizedPageSurfaceConfig.color }
          : undefined}
      >
        {/* This is the same page-level content box used above the fold.
            LabList itself adds no horizontal inset; its responsive card width
            consumes this box exactly while preserving the configured gap. */}
        <PageContainer
          className={COLLECTION_CONTAINER_CLASSNAME}
          config={normalizedPageSurfaceConfig}
        >
          <AbstractMetalLabList
            labs={labs}
            showViewAll
            gradientConfig={journalDockSliderConfig}
            paletteConfig={dockPaletteConfig}
            hueInfluenceConfig={dockHueInfluenceConfig}
            cardConfig={labCardConfig}
            headingConfig={normalizedCollectionHeadingConfig}
            containerBg={
              labSectionConfig.backgroundMode === 'custom'
                ? labSectionConfig.customBackgroundColor
                : normalizedPageSurfaceConfig.color
            }
            cardWidthPx={collectionCardWidthPx ?? dockLayoutConfig.cardWidthPx}
            columnGapPx={dockLayoutConfig.columnGapPx}
            rowGapPx={dockLayoutConfig.rowGapPx}
            cardRadius={dockLayoutConfig.cardRadius}
          />
        </PageContainer>
      </section>
    )}
    </>
    ) : (
      // PLAN-HOMEPAGE-IA-LAYOUT.md 8.3-8.8 — the 'splitColumn' branch.
      // Per explicit correction: this branch must render with the page's
      // own real surface/ink colors and real composer — the same
      // heroContentPresentationActive/contentTone/actionsTone/
      // normalizedPageSurfaceConfig the 'classic' branch already computes
      // and uses above, not invented fixed colors. No background color is
      // applied to the header or to either SplitColumnLayout column —
      // the whole page reads as one flat surface, exactly as it already
      // does today, just reflowed into two columns. Renders through the
      // same <PolymorphicLayout> /about and /posts-lab already use (see
      // PLAN-SPLIT-COLUMN-LAYOUT-ENRICHMENT-EXTRACTION.md) — the shared,
      // already-configurable marginTop/marginTopWide, properly contained
      // by the shell's own overflow-hidden wrapper, not a page-specific
      // mt-0 override (which fixed one symptom — an exposed sliver of
      // globals.css's body{bg-slate-950} — by hiding it behind a different,
      // now-inconsistent margin instead of containing it).
      <PolymorphicLayout
        leadingContent={mobileStaticHeaderBeforeWall ? wallSection : undefined}
        config={splitColumnLayoutConfigForColors}
        contentSized={WALL_SPLIT_CONTENT_HIDDEN}
        // A hidden CoverFlow has no measurable anchor, so its geometry cannot
        // release the page-wide visibility gate. The wall is ready once the
        // breakpoint resolves when both split-column children are hidden.
        className={`${styles.splitColumnViewport} ${!columnsAreSideBySide || headerIsStatic || WALL_SPLIT_CONTENT_HIDDEN ? styles.flowingHeaderViewport : ''} ${abstractLayoutPending || (!WALL_SPLIT_CONTENT_HIDDEN && !coverFlowGeometryStable) ? styles.layoutGatePending : ''}`}
        style={WALL_SPLIT_CONTENT_HIDDEN ? { minHeight: 'auto' } : undefined}
        backgroundColor={normalizedPageSurfaceConfig.color}
        pageSurfaceConfig={normalizedPageSurfaceConfig}
        paletteColorResolver={paletteColorResolver}
        scrollGradientReturnToLight={{
          returnToLightEnabled: abstractFooterConfig.backgroundReturnToLightEnabled,
          returnToLightRangeVh: abstractFooterConfig.backgroundReturnToLightRangeVh,
          returnToLightFinalDarken: abstractFooterConfig.backgroundReturnToLightFinalDarken,
        }}
        headerWrapperRef={splitColumnHeaderWrapperRef}
        headerWrapperClassName={navGeometryPending ? styles.navGeometryPending : undefined}
        // Forces the shared scroll-gradient background to its own max
        // darken while the mobile article list's expanded panel is open —
        // operator ask (PLAN-MOBILE-ARTICLE-LIST-EXPAND-DARKEN.md). Gated
        // by the section's own config toggle so it's fully opt-out-able;
        // isMobileArticleListExpanded is driven by MobilePinnedArticleSection's
        // own onExpandedChange callback below.
        scrollGradientForceMaxDarken={
          isMobileArticleListExpanded && mobilePinnedArticleSectionConfig.expandedForcesMaxBackgroundDarken
        }
        // Both columns default 'float' on this page (see
        // splitColumnLayoutConfig's own useState initializer) — no reserved
        // space, the card-stack/hero row starts at the true viewport top and
        // the fixed header floats over it (see wideColumnRowMinHeightCss/
        // narrowColumnRowMinHeightCss above). This is what lets a
        // transparent/scrim'd header segment actually reveal the slider
        // through it. Either column can opt into 'pushDown' instead via the
        // "Polymorphic Layout" panel, independently.
        //
        // No legibilityScrimEnabled prop here — the shell resolves that
        // itself from splitColumnLayoutConfig.legibilityScrimEnabled (an
        // explicit, panel-exposed opt-in, default off on both /about and
        // /abstract) together with each column's own *ColumnHeaderBehavior,
        // rather than this page auto-computing "blur whenever a column
        // floats." The blur is a deliberate visual choice per config, not an
        // automatic consequence of choosing 'float'.
        //
        // /about's own columns are full-bleed; /abstract keeps a bounded
        // content anchor. CoverFlow uses that anchor for card sizing, then
        // expands its interaction plane to the physical wide-column edges.
        // edgeBackdropEnabled extends whatever colors wideColumnStyle/
        // narrowColumnStyle below actually resolve to out to the true
        // viewport edges — inert when colorSource is 'none' — seamed at the
        // same live-measured column boundary <PolymorphicLayout> already
        // tracks internally via autoAlignNavSplit, without touching the
        // bounded content's own real width at all.
        edgeBackdropEnabled
        // PLAN-POLYMORPHIC-LAYOUT-DECOUPLING.md §6 — this page constructs
        // its own <SiteHeader> instead of handing PolymorphicLayout
        // a siteHeaderConfig/logoStops/dataInkTone/splitBand*/etc. bundle to
        // render automatically. This is the largest, highest-risk migration
        // of the four (the plan's own §6 flags this stage as the most
        // likely to drop a value) — every prop below was cross-checked
        // against the old call site's own full prop list, not reconstructed
        // from memory. Note: navBandActive/navBandCanvasRef/
        // navBandColorFilter, which an earlier audit flagged as this page's
        // own wrinkle to preserve, are NOT part of this splitColumn branch
        // at all — grepped the whole file and confirmed all three live
        // exclusively on the 'classic'-presentation-mode branch's own
        // direct <SiteHeader> call (out of scope per §0.7), so
        // there is nothing to carry over here. slotProps (HeaderSlotProps)
        // carries the values only PolymorphicLayout's own internal
        // machinery can compute. Spread first so this page's adaptive-
        // gradient overrides below remain authoritative.
        header={(slotProps) => (
          <SiteHeader
            {...slotProps}
            // Local override, same technique /about uses for its own
            // navAlignedToSplitEnabled override — layered on at the render
            // call site, not mutating the shared normalizedSiteHeaderConfig,
            // so any other consumer of that same config stays on the
            // original nav layout by default. navAlignedToPageContainer:
            // false is the percentage-mode fallback for the one frame
            // before onNavAlignmentChange's own first measurement lands —
            // false is /about's own arrangement (unpadded), so even that
            // brief fallback frame matches /about.
            config={buildEffectiveSiteHeaderConfig(
              {
                ...normalizedSiteHeaderConfig,
                // Keep the desktop nav as real glyphs. The inherited
                // wordmark-gradient text treatment paints opaque-looking
                // rectangles in this split-aligned header path.
                navTextUsesWordmarkGradient: false,
                colorMode: colors.scrollGradientActive ? 'custom' : normalizedSiteHeaderConfig.colorMode,
                // The fixed nav uses the same stable ink as the wordmark.
                navTextColor: colors.scrollGradientActive
                  ? topHeaderTitleColor
                  : normalizedSiteHeaderConfig.navTextColor,
                navAlignedToSplitEnabled: true,
                navAlignedToPageContainer: false,
                navContentGapPx: SPLIT_ALIGNED_NAV_CONTENT_GAP_PX,
              },
              splitColumnLayoutConfig,
            )}
            dataInkTone={backgroundAwarenessActive ? headerTone : undefined}
            logoStops={topHeaderLogoStops}
            wordmarkConfig={effectiveWordmarkConfig}
            wordmarkGradientStops={narrowColumnWordmarkGradientStops}
            physicalLeftColumnColor={colors.actualLeftSegmentColor}
            // titleColorOverride bypasses resolveSiteHeaderLogoStops
            // entirely (every colorMode, PLAN-ABSTRACT-TYPOGRAPHY-COLOR-
            // UNIFICATION.md Part C) — suppressed when
            // colors.wordmarkGradientStops is active, or the override would
            // silently mask the gradient with a flat color. See
            // PLAN-WORDMARK-SCROLL-GRADIENT-INTEGRATION.md. Uses
            // topHeaderTitleColor matches the nav's fixed color.
            titleColorOverride={narrowColumnWordmarkGradientStops ? undefined : topHeaderTitleColor}
            titleOpacityOverride={narrowColumnTypography.titleOpacity}
            pageSurfaceConfig={normalizedPageSurfaceConfig}
            // Unlike /about's own conditional Spacefield-visible override,
            // this page has no runtime need to force the band regardless of
            // config — colors.resolvedSplitBandLeft/RightColor (this page's
            // own pre-existing usePolymorphicLayoutColors() call, already
            // used above for wideColumnColor/narrowColumnColor/etc.) plus
            // splitColumnLayoutConfig.headerSplitBandEnabled
            // directly replicate the same headerSplitBandEnabled/
            // splitBandLeftMode/splitBandRightMode resolution
            // PolymorphicLayout used to apply internally (same fix pattern
            // as /posts-lab's own Stage D migration).
            splitBandActive={splitColumnLayoutConfig.headerSplitBandEnabled}
            splitBandLeftColor={colors.resolvedSplitBandLeftColor}
            splitBandRightColor={colors.resolvedSplitBandRightColor}
            splitBandStacked={colors.splitBandStacked}
          />
        )}
        // wideColumn/narrowColumn below are the CARD PREVIEW and HERO TEXT
        // respectively — the card stack is the physically-wide (62%) slot,
        // the hero text is the narrow (38%) one, matching /about's own
        // arrangement (its wide slot holds AbstractPostDock, its narrow
        // slot holds the short hero headline). This used to be reversed
        // (hero wide, cards narrow), which is what produced the header
        // band/body grid mismatch fixed in SplitColumnPageShell — see that
        // file's own doc comment. className/style pairs below are grouped
        // with the content they actually style, not with the "wide"/
        // "narrow" prop names, since which slot is physically wide is an
        // orthogonal choice (splitColumnLayoutConfig.wideColumnSide).
        //
        // No justify-*/padding classes here anymore — both now come from
        // config (wideColumnContentVerticalAlign, wideColumnContentPadding*)
        // via <PolymorphicLayout>'s own buildWideColumnClassName. No
        // page-level justify-* override lives here: Polymorphic Layout's
        // base/tablet/desktop values are the sole vertical-position source.
        wideColumnClassName={`flex flex-col gap-6 ${!columnsAreSideBySide ? styles.abstractStackedRow : ''}`}
        wideColumnStyle={{
          display: WALL_SPLIT_CONTENT_HIDDEN ? 'none' : undefined,
          // columnsAreSideBySide-gated the same way narrowColumnStyle's own
          // minHeight below already was — without this, a stacked tier with
          // its own partition switched off still forced this column to a
          // full wideColumnRowMinHeightCss (~100dvh), which fought a
          // genuinely content-sized narrow column above it into leaving
          // its own dead space rather than actually ending where its
          // content does (found auditing the "give CoverFlow more of the
          // stacked viewport" report).
          minHeight: WALL_SPLIT_CONTENT_HIDDEN ? undefined : stackViewportPartitionActive
            ? tabletWideViewportHeightCss
            : columnsAreSideBySide ? wideColumnRowMinHeightCss : undefined,
          height: !WALL_SPLIT_CONTENT_HIDDEN && stackViewportPartitionActive ? tabletWideViewportHeightCss : undefined,
          backgroundColor: colors.wideColumnColor,
        }}
        // 'viewport' is intentionally not another alias for the bounded
        // content box's parent-relative `h-full flex-1` behavior. These are
        // the same live, per-column effective viewport slots used for the
        // row itself: a floating header overlays 100dvh; a push-down header
        // reserves its measured height above a box that still ends flush
        // with the viewport bottom. PolymorphicLayout disables this mode
        // automatically while the columns stack on mobile.
        wideColumnContentViewportMinHeight={isCoverFlowSplitTier && !WALL_SPLIT_CONTENT_HIDDEN
          ? wideColumnRowMinHeightCss : undefined}
        narrowColumnClassName={[
          // No 'items-center' here anymore — the narrow column's own real
          // vertical-centering slack (from narrowColumnStyle's minHeight in
          // split mode) now passes through to NarrowColumnContent's own outer
          // box via flexbox's default 'stretch' cross-axis instead, so that
          // primitive's own verticalAlign (narrowColumnContentVerticalAlign
          // — see ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG's own doc comment on
          // that field) is what actually centers AbstractEditorialHero now,
          // not a page-local class disconnected from that already-live
          // panel control.
          // The stacked CoverFlow keeps a transparent, sticky viewport over
          // the whole screen. Place the following hero column above that
          // viewport so its visible links receive pointer events, while the
          // carousel remains interactive in its own section.
          'relative z-[2] flex',
          // ABSTRACT-01 fix (2026-08-20-139d957): CSS-module class (not a
          // Tailwind utility — abstract.module.css's own
          // @media (max-width: 1023px) block targets .abstractStackedRow by
          // name) so that stylesheet can guard against a viewport-height
          // row floor when columns stack. Present on both columns.
          !columnsAreSideBySide ? styles.abstractStackedRow : '',
          // The mobile viewport-height floor reserves a carousel peek. Tablet
          // is also stacked now, but its hero should end with its content.
          colors.breakpointTier === 'mobile' && !WALL_SPLIT_CONTENT_HIDDEN ? styles.mobileHeroColumn : '',
        ].join(' ')}
        narrowColumnStyle={{
          display: WALL_SPLIT_CONTENT_HIDDEN ? 'none' : undefined,
          // A stacked tablet hero is content-sized. The mobile-only peek
          // floor above remains separate from the split viewport floor.
          minHeight: WALL_SPLIT_CONTENT_HIDDEN ? undefined : stackViewportPartitionActive
            ? tabletNarrowViewportHeightCss
            : columnsAreSideBySide ? narrowColumnRowMinHeightCss : undefined,
          height: !WALL_SPLIT_CONTENT_HIDDEN && stackViewportPartitionActive ? tabletNarrowViewportHeightCss : undefined,
          backgroundColor: colors.narrowColumnColor,
          '--mobile-hero-column-height':
            mobileHeroRowMinHeightCss,
        } as CSSProperties}
        narrowColumnContentViewportMinHeight={isCoverFlowSplitTier && !WALL_SPLIT_CONTENT_HIDDEN
          ? narrowColumnRowMinHeightCss
          : undefined}
        // wideColumn/narrowColumn below are raw content — no page-level
        // WideColumnContent/NarrowColumnContent composition. PolymorphicLayout
        // itself wraps both automatically now that wideColumnContentContainer/
        // narrowColumnContentContainer are 'bounded' (ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG),
        // the exact same unconditional coordinator path every other
        // PolymorphicLayout page already gets — this page previously opted
        // out ('full-bleed') and hand-composed the identical primitive
        // itself in this JSX, which is what let three separate call sites
        // (this page, posts-lab, about) each type out their own subset of
        // ColumnContentBoxProps fields and silently drop different tiers.
        wideColumn={(
          <div
            ref={coverFlowSectionAnchorRef}
            data-abstract-cover-flow-section="true"
            className="relative h-full w-full"
            role="tabpanel"
            id={ABSTRACT_TIMELINE_PANEL_ID}
            aria-live={isCoverFlowSplitTier ? 'polite' : undefined}
            // WIP: hide the CoverFlow (and, on mobile, the pinned
            // carousel/list it hosts) without unmounting it. opacity:0 — NOT
            // visibility:hidden — because the carousel paints its card
            // gradients through <canvas> layers that set inline
            // visibility:visible, which override an inherited visibility:hidden
            // and keep leaking through (verified live). opacity applies to the
            // whole subtree and cannot be re-asserted by a descendant, and it
            // leaves the box geometry intact so coverFlowGeometryStable still
            // releases the page's layout gate. pointer-events:none keeps the
            // now-invisible carousel from catching drags. See HIDE_WALL_COVER_FLOW.
            style={HIDE_WALL_COVER_FLOW
              ? { opacity: 0, visibility: 'hidden', pointerEvents: 'none' }
              : undefined}
          >
            {isCoverFlowSplitTier ? (
              <div
                className={`absolute ${coverFlowVisualReady ? '' : styles.coverFlowVisualPending}`}
                style={coverFlowWideColumnStyle}
                data-cover-flow-visual-ready={coverFlowVisualReady ? 'true' : 'false'}
              >
                <CoverFlow
                  items={carouselAndListItems}
                  activeIndex={articleActiveIndex}
                  onActiveIndexChange={handleCoverFlowActiveIndexChange}
                  renderItem={renderCoverFlowItem}
                  config={coverFlowConfig}
                  inactiveDepthIncrementPercent={dockPaletteConfig.inactiveCardDepthProgressionEnabled
                    ? dockPaletteConfig.inactiveCardDepthIncrementPercent : 0}
                  cardWidthBasisPx={coverFlowSectionAnchorRect?.width}
                  requireCardWidthBasis
                  prefersReducedMotion={coverFlowPrefersReducedMotion}
                  suppressEntranceAnimation={!coverFlowEntranceRestored}
                  hoverMaxScale={normalizedCtaButtonConfig.proximityScale}
                  hoverMaxLiftPx={normalizedCtaButtonConfig.proximityLiftPx}
                  hoverMaxTiltDeg={
                    normalizedCtaButtonConfig.tiltEnabled ? normalizedCtaButtonConfig.tiltMaxDegrees : 0
                  }
                  hoverTiltPerspectivePx={normalizedCtaButtonConfig.tiltPerspectivePx}
                  // PLAN-COVERFLOW-TIMELINE-SLOT-DRAG-AREA.md — rendered
                  // inside CoverFlow's own draggable root (rather than as an
                  // external sibling, the previous placement) so the figure's
                  // own screen area is also part of the carousel's swipe/pan
                  // area, not a dead zone for it. `undefined` whenever the
                  // slot itself is off, so CoverFlow's own drag hit-area is
                  // unaffected unless this feature is genuinely on.
                  overlayContent={coverFlowTimelineSlotActive && !HIDE_WALL_TABLE_OF_CONTENTS ? (
                    <AbstractCoverFlowTimelineSlot
                      config={abstractCoverFlowTimelineSlotConfig}
                      tier="lg"
                      ctaConfig={normalizedCtaButtonConfig}
                      hasHoverPointer={coverFlowHasHoverPointer}
                    >
                      {abstractTimelineForTabletDesktop}
                    </AbstractCoverFlowTimelineSlot>
                  ) : undefined}
                />
              </div>
            ) : (
              <div
                ref={element => {
                  mobileArticleListScrollRef.current = element;
                  shortArticleListMobileInkRef.current = element;
                  mobileCoverFlowPlaneRef(element);
                }}
                style={{
                  width: '100vw',
                  marginLeft: 'calc(50% - 50vw)',
                }}
              >
                <MobilePinnedArticleSection
                  itemCount={carouselAndListItems.length}
                  rows={abstractTimelineRows}
                  activeIndex={articleActiveIndex}
                  onActiveIndexChange={handleMobileScrollActiveIndexChange}
                  onActiveIndexCommit={handleMobileArticleIndexCommit}
                  carouselColor={colors.wideColumnPaintColor}
                  panelColor={colors.wideColumnPaintColor}
                  expandedPanelFallbackColor={
                    mobilePinnedArticleSectionConfig.expandedForcesMaxBackgroundDarken
                      ? mobileArticleListBackgroundDarkened
                      : mobileArticleListBackgroundAtRest
                  }
                  config={mobilePinnedArticleSectionConfig}
                  dragDownToCloseEnabled={colors.breakpointTier === 'mobile'
                    && abstractTimelineConfig.mobileExpandedDragDownEnabled}
                  dragDownToCloseThresholdPx={abstractTimelineConfig.mobileExpandedDragDownThresholdPx}
                  reverseNavigationDirection={coverFlowConfig.reverseItemOrder}
                  // 'none' whenever this branch is serving a stacked
                  // tablet OR stacked desktop composition (both hand their
                  // own list rendering to the external renderList prop
                  // below instead) — 'visible' only for genuine mobile,
                  // which has no such external list and needs this
                  // component's own internal one.
                  listPresentation={colors.breakpointTier === 'mobile' ? 'visible' : 'none'}
                  viewportHeight={stackViewportPartitionActive
                    ? tabletWideViewportHeightCss
                    : undefined}
                  carouselViewportPlane={
                    !isCoverFlowSplitTier
                    && coverFlowVisibleViewportCenteringEnabled
                    && coverFlowVisibleViewport
                      ? {
                          top: `${coverFlowVisibleViewport.top}px`,
                          height: `${coverFlowVisibleViewport.height}px`,
                        }
                      : undefined
                  }
                  onExpandedChange={setIsMobileArticleListExpanded}
                  renderCarousel={(controls: MobilePinnedCarouselControls) => (
                    // Keep the carousel's own measured/clipped plane
                    // full-bleed (no padding here) so CoverFlow's
                    // overflow-hidden root — and every off-screen neighbour
                    // card's position — spans the TRUE viewport width: a
                    // swipe/transition slides genuinely edge-to-edge.
                    // carouselGutterX only narrows the settled ACTIVE card
                    // via cardWidthBasisPx below (computed from
                    // mobileCoverFlowPlaneRect, the true full-bleed plane's
                    // own live width, minus the gutter on each side) —
                    // exactly the same "size the card from a basis
                    // independent of the clipped container" mechanism
                    // desktop's own cardWidthBasisPx already uses.
                    <CoverFlow
                      items={carouselAndListItems}
                      activeIndex={controls.activeIndex}
                      onActiveIndexChange={controls.onIndexRequest}
                      cardWidthBasisPx={mobileCoverFlowPlaneRect ? Math.max(
                        0,
                        mobileCoverFlowPlaneRect.width
                          - 2 * tailwindSpacingTokenToPx(mobilePinnedArticleSectionConfig.carouselGutterX, 0),
                      ) : undefined}
                      requireCardWidthBasis
                      // Wrapped (rather than passing renderCoverFlowItem
                      // directly, as the desktop instance below does) only
                      // to supply the 7th, mobile-only focusProgress
                      // argument from this render's own controls closure —
                      // CoverFlow itself always calls this with exactly the
                      // six params it receives here.
                      renderItem={(item, index, isActive, geometry, reveal, position) => (
                        renderCoverFlowItem(item, index, isActive, geometry, reveal, position, controls.focusProgress)
                      )}
                      config={mobileCoverFlowConfig}
                      inactiveDepthIncrementPercent={dockPaletteConfig.inactiveCardDepthProgressionEnabled
                        ? dockPaletteConfig.inactiveCardDepthIncrementPercent : 0}
                      prefersReducedMotion={coverFlowPrefersReducedMotion}
                      suppressEntranceAnimation={!coverFlowEntranceRestored}
                      hoverMaxScale={normalizedCtaButtonConfig.proximityScale}
                      hoverMaxLiftPx={normalizedCtaButtonConfig.proximityLiftPx}
                      hoverMaxTiltDeg={
                        normalizedCtaButtonConfig.tiltEnabled
                          ? normalizedCtaButtonConfig.tiltMaxDegrees
                          : 0
                      }
                      hoverTiltPerspectivePx={normalizedCtaButtonConfig.tiltPerspectivePx}
                      externalDriver={{
                        position: controls.position,
                        animatePosition: controls.animatePosition,
                        onPositionRequest: controls.onIndexRequest,
                        onGeometryChange: controls.onGeometryChange,
                        onDragStart: controls.onDragScrollStart,
                        onDrag: controls.onDragScroll,
                        onDragEnd: controls.onDragScrollEnd,
                      }}
                      accessibilityHidden
                      // PLAN-COVERFLOW-TIMELINE-SLOT-DRAG-AREA.md — same
                      // opt-in overlay placement as the desktop instance
                      // above; coverFlowTimelineSlotActive is false on true
                      // mobile (base tier), so this only ever activates for
                      // the stacked tablet or stacked desktop case this same
                      // CoverFlow instance also serves — tier picks whichever
                      // of those two is actually live, the same real-
                      // breakpoint check coverFlowTimelineSlotActive itself
                      // now uses.
                      overlayContent={coverFlowTimelineSlotActive && !HIDE_WALL_TABLE_OF_CONTENTS ? (
                        <AbstractCoverFlowTimelineSlot
                          config={abstractCoverFlowTimelineSlotConfig}
                          tier={colors.breakpointTier === 'lg' ? 'lg' : 'md'}
                          ctaConfig={normalizedCtaButtonConfig}
                          hasHoverPointer={coverFlowHasHoverPointer}
                        >
                          {abstractTimelineForTabletDesktop}
                        </AbstractCoverFlowTimelineSlot>
                      ) : undefined}
                    />
                  )}
                  renderList={({ activeIndex, onExpand, presentation, rows: listRows, onSelect }) => (
                    <AboutTimeline
                      // Entire-list arrow navigation deliberately supplies
                      // every article to the same windowed Timeline. Its
                      // visible-row cap still limits the painted list, but
                      // each next/previous target exists in the DOM first,
                      // allowing AboutTimeline to reveal it before the
                      // paired CoverFlow selection commits.
                      rows={onExpand && abstractTimelineConfig.scrollWindowArrowsNavigateEntireList
                        ? abstractTimelineRows
                        : (onExpand
                          ? listRows.filter(row => row.slideIndex !== carouselAndListItems.length)
                          : listRows)}
                      activeIndex={activeIndex}
                      onSelect={onSelect}
                      accentColor={carouselAndListItems[activeIndex]?.accent ?? '#ffffff'}
                      columnBackgroundColor={colors.wideColumnColor}
                      inkColorOverride={presentation === 'expanded' && expandedMobileTimelineInkColors
                        ? undefined : shortArticleListBodyColor}
                      bodyColorOverride={presentation === 'expanded' ? expandedMobileTimelineInkColors?.text : undefined}
                      highlightColorOverride={presentation === 'expanded' ? expandedMobileTimelineInkColors?.textActive : undefined}
                      inkOpacityMultiplier={colors.scrollGradientDarkInkOpacityMultiplier}
                      toolbarLeadingAction={onExpand ? (
                        <button type="button" onClick={onExpand}>Expand list</button>
                      ) : undefined}
                      // The collapsed mobile list intentionally caps at
                      // three rows, making the explicitly enabled top
                      // counter/arrows a real one-row-at-a-time navigation
                      // affordance. Expanded content stays fully visible and
                      // does not need this constrained window.
                      scrollWindowVisibleCount={presentation === 'short'
                        ? Math.min(
                          abstractTimelineConfig.scrollWindowVisibleCount,
                          onExpand && abstractTimelineConfig.scrollWindowArrowsNavigateEntireList
                            ? abstractTimelineRows.length
                            : listRows.length - 1,
                        )
                        : 0}
                      // Operator ask: the short and expanded presentations must
                      // read the SAME AboutTimeline config — wideColumnTypography's
                      // opacity roles (the ones the expanded presentation already
                      // used), not a presentation-dependent override. This is also
                      // the numerically CORRECT pairing, not just consistent:
                      // shortArticleListLightSurfaceTypography.bodyColor (this ink's
                      // own base, above) was itself resolved via resolveTypographyColors
                      // with targetOpacity: globalTypographyConfig.bodyOpacity — the
                      // exact value wideColumnTypography.bodyOpacity also is (same
                      // shared config, same field) — so rendering at any OTHER
                      // opacity (an earlier fix here forced 1) uses a color that was
                      // never actually searched for that opacity.
                      description={abstractTimelineConfig.description || undefined}
                      config={abstractTimelineConfig}
                      prefersReducedMotion={coverFlowPrefersReducedMotion}
                      panelId={ABSTRACT_TIMELINE_PANEL_ID}
                      // Same exact marker-gradient inputs as the desktop
                      // instance below, not a mobile-specific subset — see
                      // that instance's own doc comment.
                      gradientSlides={carouselAndListItems}
                      gradientPaletteStates={coverFlowPalettes}
                      gradientMotion={coverFlowLiquidSliderMotion}
                      gradientConfig={journalDockSliderConfig}
                    />
                  )}
                />
              </div>
            )}
          </div>
        )}
        narrowColumn={(
          <AbstractNarrowColumnStack
            config={abstractNarrowColumnStackConfig}
            isTablet={colors.breakpointTier === 'md'}
            top={null}
            // Tablet or desktop, split or stacked — anything but true
            // mobile, which never renders the classic bottom Timeline
            // placement at all (its own pinned-carousel rows serve that
            // role instead). Was `isCoverFlowSplitTier || breakpointTier
            // === 'md'`, which quietly assumed Lg only ever meant split;
            // now that Lg can be stacked too, that combination went false
            // there and this region never rendered anything, in a state
            // where — thanks to coverFlowTimelineSlotActive not yet
            // recognizing stacked-Lg either — the CoverFlow-track placement
            // wasn't rendering it either, dropping the Timeline entirely
            // (visually filled in by MobilePinnedArticleSection's own,
            // separately-suppressed list to confusing effect).
            bottom={colors.breakpointTier !== 'mobile'
              && !coverFlowTimelineSlotActive
              && !HIDE_WALL_TABLE_OF_CONTENTS
              ? abstractTimelineForTabletDesktop
              : null}
          />
        )}
      >
        {/* Neighbour title/excerpt hiding for CoverFlow's cards — same
            mechanism the carousel-lab spike proved (see that file's own
            doc comment for the full reasoning): layered on top of
            AbstractJournalLabCollection's own color-based neighbour
            treatment (stackPresentation above the wideColumn prop) rather
            than replacing it, since opacity is a property that component
            never touches itself. A plain class modifier
            (cover-flow-card--inactive), not an attribute selector — a
            quoted attribute-selector value inside this interpolated CSS
            string hit a real Next.js dev-mode SSR/CSR text-content
            hydration mismatch (confirmed live) on the quote character,
            which a plain class selector has none of to hit. Placed as a
            direct PolymorphicLayout child (not nested inside the
            wideColumn prop's own JSX, where it previously sat) because
            that nesting also produced a spurious "non-boolean attribute
            jsx/global" console warning — carousel-lab.tsx's own identical
            style tag, a flat top-level child there too, never shows it. */}
        <style jsx global>{`
          .cover-flow-card .${articleCardStyles.titleInk} {
            transition: opacity var(--article-card-appearance-duration, 300ms)
              var(--article-card-appearance-easing, ease) var(--article-card-appearance-delay, 0ms);
          }
          .cover-flow-card--inactive .${articleCardStyles.titleInk} {
            opacity: 0;
          }
          .cover-flow-card--inactive .${articleCardStyles.hoverReveal} {
            opacity: 0 !important;
          }
        `}</style>
      </PolymorphicLayout>
    )}
      <section aria-label="Abstract Voyage introduction" data-wall-feature-banner="" className="w-full">
        <PageContainer
          config={normalizedPageSurfaceConfig}
          className={[
            // Match the wall's gutter schedule so the mobile banner can use
            // the same resolved track width as the first featured quote.
            'wall-minimum-width-container',
            normalizedSiteHeaderConfig.paddingX,
            normalizedSiteHeaderConfig.paddingXWide,
            normalizedSiteHeaderConfig.paddingXLg,
          ].join(' ')}
        >
          <div data-wall-banner-cap="" style={{ maxWidth: colors.breakpointTier === 'mobile' ? wallFeaturedColumnWidthPx : wallGridMaxWidthPx, marginInline: 'auto' }}>
            <FeaturedInjectedQuote
              config={{ ...bottomBannerQuoteDesign, sourceHeadingText: practicesContent.quote.sourceHeading }}
              headingAppearance={quotePartsDesign.heading}
              linkAppearance={quotePartsDesign.link}
              source={{
                key: 'wall-feature-banner',
                // The banner's quote text/heading/destination/aria-label are
                // content/practices.md's own `quote` block, not config --
                // see that file's own doc comment.
                title: practicesContent.quote.title,
                period: '',
                destination: practicesContent.quote.destination,
                text: practicesContent.quote.text,
                ariaLabel: practicesContent.quote.ariaLabel,
              }}
              coverFlowGradient={wallQuoteCoverFlowGradient}
              deferGradientUntilVisible
            >
              <PracticesSection content={practicesContent} quoteConfig={bannerPracticeQuoteDesign} headingAppearance={quotePartsDesign.heading} inkColor={bannerInkColor} layout={practicesLayoutConfig} />
            </FeaturedInjectedQuote>
          </div>
        </PageContainer>
      </section>

      {/* Fades the footer out using the SAME duration/easing as the mobile
          article list's own panel-expand motion (and back in with the
          collapse motion) — operator ask: the footer sitting behind the
          expanded, modal-like list panel should visually step aside with
          it, not just sit there statically while covered. pointerEvents/
          aria-hidden while expanded keep its now-invisible links out of the
          tab order and hit-testing, consistent with the panel's own
          "modal-like, scroll-locked overlay" treatment
          (MobilePinnedArticleSectionConfig's own expandedForcesMaxBackgroundDarken
          doc comment). isMobileArticleListExpanded stays permanently false
          on every non-mobile tier (only MobilePinnedArticleSection's own
          onExpandedChange ever sets it), so this is a no-op there. */}
      <div
        aria-hidden={isMobileArticleListExpanded}
        style={{
          opacity: isMobileArticleListExpanded ? 0 : 1,
          transitionProperty: 'opacity',
          transitionDuration: `${isMobileArticleListExpanded
            ? mobilePinnedArticleSectionConfig.panelExpandDurationMs
            : mobilePinnedArticleSectionConfig.panelCollapseDurationMs}ms`,
          transitionTimingFunction: MOBILE_PINNED_ARTICLE_SECTION_EASINGS[
            isMobileArticleListExpanded
              ? mobilePinnedArticleSectionConfig.panelExpandEasing
              : mobilePinnedArticleSectionConfig.panelCollapseEasing
          ],
          pointerEvents: isMobileArticleListExpanded ? 'none' : 'auto',
        }}
      >
        {(colors.breakpointTier === 'lg'
          ? abstractFooterConfig.enabledLg
          : colors.breakpointTier === 'md'
            ? abstractFooterConfig.enabledWide
            : abstractFooterConfig.enabled) ? <SiteFooter
          config={abstractFooterConfig}
          editorHref={showAuthoringTools ? '/admin/' : undefined}
          accordionItemConfig={heroAccordionItemConfig}
          pageSurfaceConfig={normalizedPageSurfaceConfig}
          wordmarkConfig={effectiveWordmarkConfig}
          wordmarkStops={heroHeaderLogoStops}
          wordmarkWidthClassName={normalizedSiteHeaderConfig.logoWidth}
          wordmarkDesktopWidthClassName={normalizedSiteHeaderConfig.logoWidthWide}
          scrollGradientDarkenViewportRangeVh={colors.scrollGradientResolved.viewportRangeVh}
          scrollGradientDarkenTauMs={colors.scrollGradientResolved.tauMs}
          scrollGradientOriginColor={narrowColumnGradientTextOrigin}
          scrollGradientMaxDarken={colors.scrollGradientResolved.maxDarken}
          // Same darkest-endpoint value the mobile article list's own ink
          // already resolves against (mobileArticleListBackgroundDarkened
          // above) — reused verbatim rather than a second computation, so
          // the footer's 'gradientDarkest' background/border options track
          // the identical color every other gradient-anchored surface on
          // this page settles to.
          scrollGradientDarkestColor={colors.scrollGradientActive ? mobileArticleListBackgroundDarkened : undefined}
        /> : null}
      </div>

      {/* The app-level CuboidNavigationRoot deliberately leaves authoring
          tools inside Face A with their page. Condition unchanged —
          split-column only, matching this panel's existing behavior. */}
      {showAuthoringTools && abstractPageLayoutConfig.presentationMode !== 'classic' ? (
        <PanelShell
          title="ABSTRACT SETTINGS"
          isOpen={isPanelOpen}
          onToggle={togglePanel}
          backgroundColor={configPanelBackgroundColor}
          config={panelShellConfig}
          headerActions={(
            <PanelStandardHeaderActions
              bindings={componentConfigBindings}
              onReset={resetConfig}
              panelShellConfig={panelShellConfig}
            />
          )}
        >
          <ConfigScopeList bindings={componentConfigBindings} />
        </PanelShell>
      ) : null}
    </>
    </SiteContentProvider>
  );
}
