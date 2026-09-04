'use client';

import SeoHead from '../components/SeoHead';
import { buildSiteTitle } from '../helpers/siteMetadata';
import { getLabSummaries, type LabSummary } from '../helpers/labContent';
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  WheelEvent as ReactWheelEvent,
} from 'react';
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  useConfigPanelBindings,
} from '../components/Panel/config';
import { PanelShell, PanelStandardHeaderActions } from '../components/Panel';
import { DEFAULT_PANEL_SHELL_CONFIG } from '../components/Panel/config/shell';
import { useAuthoringToolsVisibility } from '../components/Panel/useAuthoringToolsVisibility';
import {
  DEFAULT_CTA_BUTTON_CONFIG,
  normalizeCtaButtonConfig,
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
import { DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG } from '../components/GlobalTypography.config';
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
import articleCardStyles from '../components/ArticleCard.module.css';
import { useLiquidSliderMotion } from '../experiences/abstract/components/AbstractPostDock/hooks/motion';
import { buildDeckPaletteStates } from '../experiences/abstract/helpers/deckPalette';
import {
  type CardReveal,
} from '../experiences/abstract/components/AbstractJournalLabCollection';
import type { AbstractJournalLabFlipSlot } from '../experiences/abstract/components/AbstractJournalLabCollection/collectionLayout';
import { CTA_BUTTON_MOTION_EASINGS } from '../components/CtaButton/config/registered';
import { CoverFlow, type CoverFlowCardReveal } from '../experiences/abstract/components/CoverFlow/CoverFlow';
import {
  DEFAULT_COVER_FLOW_CONFIG,
  normalizeCoverFlowConfig,
} from '../experiences/abstract/components/CoverFlow/CoverFlow.config';
import { COVER_FLOW_SCOPE_ID } from '../experiences/abstract/components/CoverFlow/CoverFlow.panel';
import {
  MobilePinnedArticleSection,
  type MobilePinnedCarouselControls,
} from '../experiences/abstract/components/MobilePinnedArticleSection/MobilePinnedArticleSection';
import {
  DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG,
  MOBILE_PINNED_ARTICLE_SECTION_SCOPE_ID,
  normalizeMobilePinnedArticleSectionConfig,
} from '../experiences/abstract/components/MobilePinnedArticleSection/MobilePinnedArticleSection.config';
import {
  useArticleListCoverFlowSync,
  useArticleHashSync,
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
import { AbstractJournalLabCollection } from '../experiences/abstract/components/AbstractJournalLabCollection';
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
import { DEFAULT_WORDMARK_CONFIG } from '../experiences/abstract/components/SiteHeader/config/wordmark';
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
  ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG,
  DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG,
  DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG,
  DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG,
  DEFAULT_ABSTRACT_TIMELINE_CONFIG,
  applyAbstractPolymorphicLayoutAllSizesUpdate,
  normalizeAbstractNarrowColumnStackConfig,
  normalizeAbstractTimelineContentConfig,
  normalizeAbstractPageLayoutConfig,
  type AbstractNarrowColumnStackConfig,
  type AbstractNarrowColumnStackHorizontalAlign,
  type AbstractNarrowColumnStackVerticalAlign,
  type AbstractPageLayoutConfig,
  type AbstractTimelineContentConfig,
} from './abstract.config';
import { AboutTimeline, type AboutTimelineRowData } from '../experiences/about/components/AboutTimeline';
import { normalizeAboutTimelineConfig, type AboutTimelineConfig } from '../experiences/about/components/AboutTimeline.config';
import { ABSTRACT_TIMELINE_SCOPE_ID } from '../experiences/abstract/components/AbstractTimeline.panel';
import {
  DEFAULT_CARD_APPEARANCE_CONFIG,
  normalizeCardAppearanceConfig,
  type CardAppearanceConfig,
} from '../experiences/abstract/components/Card/config/appearance';
import { Card } from '../experiences/abstract/components/Card/Card';
import { CARD_APPEARANCE_SCOPE_ID } from '../experiences/abstract/components/Card/config/appearance.panel';
import {
  ABSTRACT_NARROW_COLUMN_STACK_SCOPE_ID,
  ABSTRACT_PAGE_LAYOUT_SCOPE_ID,
  ABSTRACT_POLYMORPHIC_LAYOUT_PANEL,
  ABSTRACT_TIMELINE_CONTENT_SCOPE_ID,
} from './abstract.panel';
import { PolymorphicLayout, usePolymorphicLayoutColors } from '../experiences/abstract/components/PolymorphicLayout';
import { useMeasuredElementRect } from '../components/useMeasuredElementRect';
import {
  normalizePolymorphicLayoutConfig,
  type PolymorphicLayoutConfig,
} from '../experiences/abstract/components/PolymorphicLayout.config';
import { resolveSplitColumnAccent } from '../experiences/abstract/components/SplitColumnLayout/colorResolution';
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
};

/** Page-endemic narrow-column composition. PolymorphicLayout owns the
 * available-height box; this component only partitions the slot it receives. */
function AbstractNarrowColumnStack({
  config,
  top,
  bottom,
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
const ABSTRACT_EDITORIAL_HEADLINE = 'Abstract Voyage is where I think out loud.';
// About page's own emphasis markup convention (pages/about.tsx), reused
// verbatim — `**word**` runs render brighter via renderEmphasisText
// (helpers/textEmphasis.tsx). The name now lives in the H1 above, so this
// paragraph opens on "It" instead of re-stating it. "light and sound" is
// the same linking phrase the About page uses for the same relationship —
// deliberate repetition, preserved exactly. The closing phrase "on my own
// terms" links to /about via the shared [text](href) inline-link syntax.
const ABSTRACT_EDITORIAL_PARAGRAPH_1 =
  'It started as a name to write under, loose enough to let me study ' +
  'whatever held my attention. It began with how **light and sound** relate. That habit ' +
  'took me to McKinsey, where I kept studying and experimenting. Then AI opened a ' +
  '**question** I wanted to chase [on my own terms](/about).';
const ABSTRACT_EDITORIAL_PARAGRAPHS = [ABSTRACT_EDITORIAL_PARAGRAPH_1];

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
const COVER_FLOW_DEFINITION =
  abstractConfigPanelRegistry.resolve(COVER_FLOW_SCOPE_ID);
const SPLIT_COLUMN_CARD_STACK_DEFINITION =
  abstractConfigPanelRegistry.resolve(SPLIT_COLUMN_CARD_STACK_SCOPE_ID);
const ABSTRACT_TIMELINE_DEFINITION =
  abstractConfigPanelRegistry.resolve(ABSTRACT_TIMELINE_SCOPE_ID);
const CARD_APPEARANCE_DEFINITION =
  abstractConfigPanelRegistry.resolve(CARD_APPEARANCE_SCOPE_ID);

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

type AbstractPageProps = {
  dockItems?: AbstractPostDockItem[];
  labs: LabSummary[];
};

export async function getStaticProps() {
  const { loadAbstractPostDockItems } = await import('../experiences/abstract/helpers/loadAbstractPostDockItems.server');
  const dockItems = loadAbstractPostDockItems();
  const labs = getLabSummaries();

  return {
    props: {
      dockItems,
      labs,
    },
  };
}

export default function AbstractPage({ dockItems, labs }: AbstractPageProps) {
  const [abstractTimelineContentConfig, setAbstractTimelineContentConfig] =
    useState<AbstractTimelineContentConfig>(() => (
      normalizeAbstractTimelineContentConfig(DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG)
    ));
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
    }));
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
      normalizePolymorphicLayoutConfig(ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG)
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
  // been retuned to a much lower opacity, so this page follows the shared
  // default directly rather than pinning its own 0/0 override.
  const [cardAppearanceConfig, setCardAppearanceConfig] =
    useState<CardAppearanceConfig>(() => normalizeCardAppearanceConfig(DEFAULT_CARD_APPEARANCE_CONFIG));
  // CoverFlow and the narrow column's AboutTimeline remain independently
  // tunable through their own live scopes. abstractTimelineConfig is its
  // own independent instance from /about's own aboutTimelineConfig. The
  // two pages now intentionally start from synchronized page-owned
  // defaults, while retaining room for per-page divergence such as marker
  // size. This page's panel edits never touch /about's state or vice
  // versa.
  const [coverFlowConfig, setCoverFlowConfig] =
    useState(() => normalizeCoverFlowConfig(DEFAULT_COVER_FLOW_CONFIG));
  const [mobilePinnedArticleSectionConfig, setMobilePinnedArticleSectionConfig] =
    useState(() => normalizeMobilePinnedArticleSectionConfig(
      DEFAULT_MOBILE_PINNED_ARTICLE_SECTION_CONFIG,
    ));
  const mobileHeroRowMinHeightCss =
    `calc(100svh - ${splitColumnHeaderHeightPx ?? 0}px - ${mobilePinnedArticleSectionConfig.peekHeightSvh}svh)`;
  const mobileCoverFlowConfig = useMemo(() => ({
    ...coverFlowConfig,
    enableScroll: false,
  }), [coverFlowConfig]);
  const [abstractTimelineConfig, setAbstractTimelineConfig] =
    useState<AboutTimelineConfig>(() => normalizeAboutTimelineConfig(DEFAULT_ABSTRACT_TIMELINE_CONFIG));
  // Shared across every page via SharedDesignConfigProvider (pages/_app.tsx)
  // — tuning these here reflects on contact.tsx/about.tsx/design-system.tsx
  // too, and vice versa, instead of each page holding its own disconnected
  // copy of the same default values.
  const {
    pageSurfaceConfig, setPageSurfaceConfig,
    ctaButtonConfig, setCtaButtonConfig,
    setGlobalTypographyConfig,
    panelShellConfig, setPanelShellConfig,
    setLayoutDebugConfig,
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
  const colors = usePolymorphicLayoutColors(
    splitColumnLayoutConfig, normalizedPageSurfaceConfig.color, paletteColorResolver,
  );
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
  const heroHeaderLogoStops = resolveSiteHeaderLogoStops(
    wordmarkConfig,
    normalizedPageSurfaceConfig.color,
    colors.actualLeftSegmentColor,
    backgroundAwarenessActive
      ? (headerTone === 'light' ? ABSTRACT_SYNTH_LOGO_STOPS : ABSTRACT_SYNTH_LOGO_DARK_STOPS)
      : (() => {
        const derivedLogoColor = resolveContrastAwareTextColor(
          colors.actualLeftSegmentColor,
          wordmarkConfig.columnTextMinContrast,
          wordmarkConfig.surfaceOffset,
        );
        return [{ color: derivedLogoColor, at: 0 }, { color: derivedLogoColor, at: 100 }];
      })(),
  );
  const heroHeaderHeight = {
    'h-12': '3rem',
    'h-14': '3.5rem',
    'h-16': '4rem',
    'h-20': '5rem',
    'h-24': '6rem',
    'h-28': '7rem',
    'h-32': '8rem',
    'h-36': '9rem',
    'h-40': '10rem',
  }[normalizedSiteHeaderConfig.height];
  const heroHeaderDesktopHeight = {
    'md:h-12': '3rem',
    'md:h-14': '3.5rem',
    'md:h-16': '4rem',
    'md:h-20': '5rem',
    'md:h-24': '6rem',
    'md:h-28': '7rem',
    'md:h-32': '8rem',
    'md:h-36': '9rem',
    'md:h-40': '10rem',
  }[normalizedSiteHeaderConfig.desktopHeight];
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
    '--hero-header-height': heroHeaderHeight,
    '--hero-header-height-desktop': heroHeaderDesktopHeight,
    '--hero-editorial-stack-height': `${editorialRow.rowCount * 100}%`,
    '--hero-editorial-stack-offset': `${-editorialRow.rowIndex * 100}%`,
  } as CSSProperties), [
    config.backgroundColor,
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
    normalizedPageSurfaceConfig.color,
    heroContentPresentationActive,
    twilightGradient.cssStops,
    twilightGradient.terminalColor,
  ]);
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
      definition: ABSTRACT_POLYMORPHIC_LAYOUT_PANEL,
      value: splitColumnLayoutConfig,
      onChange: next => setSplitColumnLayoutConfig(previous => (
        applyAbstractPolymorphicLayoutAllSizesUpdate(previous, next)
      )),
      onReset: () => setSplitColumnLayoutConfig(
        normalizePolymorphicLayoutConfig(ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG),
      ),
    }),
    createConfigScopeBinding({
      definition: COVER_FLOW_DEFINITION,
      value: coverFlowConfig,
      onChange: setCoverFlowConfig,
      defaultValue: normalizeCoverFlowConfig(DEFAULT_COVER_FLOW_CONFIG),
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
      defaultValue: normalizeCardAppearanceConfig(DEFAULT_CARD_APPEARANCE_CONFIG),
    }),
    createConfigScopeBinding({
      definition: ABSTRACT_TIMELINE_DEFINITION,
      value: abstractTimelineConfig,
      onChange: setAbstractTimelineConfig,
      defaultValue: normalizeAboutTimelineConfig(DEFAULT_ABSTRACT_TIMELINE_CONFIG),
    }),
    createConfigScopeBinding({
      definition: abstractConfigPanelRegistry.resolve(ABSTRACT_TIMELINE_CONTENT_SCOPE_ID),
      value: abstractTimelineContentConfig,
      onChange: setAbstractTimelineContentConfig,
      defaultValue: normalizeAbstractTimelineContentConfig(DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG),
    }),
  ], [
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
    abstractTimelineContentConfig,
    splitColumnLayoutConfig,
    splitColumnCardStackConfig,
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
      normalizeCardAppearanceConfig(DEFAULT_CARD_APPEARANCE_CONFIG),
    );
    setAbstractPageLayoutConfig(
      normalizeAbstractPageLayoutConfig(DEFAULT_ABSTRACT_PAGE_LAYOUT_CONFIG),
    );
    setAbstractNarrowColumnStackConfig(
      normalizeAbstractNarrowColumnStackConfig(DEFAULT_ABSTRACT_NARROW_COLUMN_STACK_CONFIG),
    );
    setAbstractTimelineContentConfig(
      normalizeAbstractTimelineContentConfig(DEFAULT_ABSTRACT_TIMELINE_CONTENT_CONFIG),
    );
    setSplitColumnLayoutConfig(
      normalizePolymorphicLayoutConfig(ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG),
    );
  }, [
    setCtaButtonConfig,
    setGlobalTypographyConfig,
    setLayoutDebugConfig,
    setPageSurfaceConfig,
    setPanelShellConfig,
    setSiteHeaderConfig,
    setWordmarkConfig,
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
  }, [config.skyRenderMode]);

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
  }, [config.glassPlayback, config.skyRenderMode]);

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
  const isCoverFlowDesktopTier = colors.breakpointTier !== 'mobile';
  const { ref: coverFlowSectionAnchorRef, rect: coverFlowSectionAnchorRect } =
    useMeasuredElementRect<HTMLDivElement>([isCoverFlowDesktopTier]);
  const coverFlowWideColumnStyle = useMemo<CSSProperties>(() => {
    const anchorLeftPx = coverFlowSectionAnchorRect?.left;
    const viewportWidthPx = colors.viewportWidthPx;
    if (anchorLeftPx === undefined || viewportWidthPx === undefined) {
      return { inset: 0 };
    }
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
    if (!isCoverFlowDesktopTier) {
      return {
        top: 0,
        bottom: 0,
        left: -anchorLeftPx,
        width: viewportWidthPx,
      };
    }
    const splitBoundaryPx = colors.splitBandBoundaryPx;
    if (splitBoundaryPx === undefined) {
      return { inset: 0 };
    }
    const wideColumnLeftPx = splitColumnLayoutConfig.wideColumnSide === 'right'
      ? splitBoundaryPx
      : 0;
    const wideColumnWidthPx = splitColumnLayoutConfig.wideColumnSide === 'right'
      ? viewportWidthPx - splitBoundaryPx
      : splitBoundaryPx;
    return {
      top: 0,
      bottom: 0,
      left: wideColumnLeftPx - anchorLeftPx,
      width: wideColumnWidthPx,
    };
  }, [
    colors.splitBandBoundaryPx,
    colors.viewportWidthPx,
    coverFlowSectionAnchorRect?.left,
    isCoverFlowDesktopTier,
    splitColumnLayoutConfig.wideColumnSide,
  ]);
  const {
    activeIndex: articleActiveIndex,
    setActiveIndex: setArticleActiveIndex,
  } = useArticleListCoverFlowSync(carouselAndListItems.length);
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
  const articleSlugs = useMemo(
    () => carouselAndListItems.map(item => item.slug),
    [carouselAndListItems],
  );
  useArticleHashSync(articleSlugs, articleActiveIndex, setArticleActiveIndex);

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
  const coverFlowPalettes = useMemo(
    () => buildDeckPaletteStates({
      slides: carouselAndListItems,
      paletteConfig: dockPaletteConfig,
      hueInfluenceConfig: { ...dockHueInfluenceConfig, transitionEnabled: false, enabled: false },
      activeIndex: null,
    }),
    [carouselAndListItems, dockPaletteConfig, dockHueInfluenceConfig],
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
    position: { distanceFromActive: number },
  ) => {
    const slot: AbstractJournalLabFlipSlot = {
      index,
      article,
      lab: null,
      position: { leftPx: 0, topPx: 0, rotationDeg: 0 },
    };
    const isMeshLive = coverFlowLiveMeshIndices.has(index);
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
          motion={coverFlowLiquidSliderMotion}
          gradientConfig={journalDockSliderConfig}
          basePalette={coverFlowPalettes?.[index] ?? null}
          influencedPalette={coverFlowPalettes?.[index] ?? null}
          visualSlide={article}
          journalHologramConfig={dockHologramConfig}
          cardWidthPx={geometry.width}
          cardHeightPx={geometry.height}
          cardRadius={resolvedCollectionDockLayoutConfig.cardRadius}
          layoutConfig={resolvedCollectionDockLayoutConfig}
          ctaConfig={normalizedCtaButtonConfig}
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
          stackPresentation={{
            ...coverFlowStackPresentationBase,
            surfaceColor: coverFlowCardSurfaceColor,
            state: isActive ? 'active' : 'inactive',
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
    cardAppearanceConfig,
  ]);

  return (
    <>
      <SeoHead
        title={buildSiteTitle('Manuel Cerdas — Independent Engineer & Advisor')}
        description="Independent engineering and advisory across AI products, technical systems, product strategy, and interface design."
        canonicalPath="/abstract"
      />
    {abstractPageLayoutConfig.presentationMode === 'classic' ? (
    <>
    <main
      className="relative min-h-[100dvh] overflow-x-clip"
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
                opacity: config.skyRenderMode === 'living' || config.skyRenderMode === 'glass' ? 1 : 0,
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
            logoStops={heroHeaderLogoStops}
            navBorderColor={normalizedSiteHeaderConfig.navBorderColor}
            navTextColor={normalizedSiteHeaderConfig.navTextColor}
            totalCellCount={overlayFaceCount}
          />
        ) : (
          <>
            {config.skyRenderMode === 'legacy' ? (
              <div
                aria-hidden="true"
                className={styles.gradientOutputViewport}
                data-content-surface={heroContentPresentationActive ? 'light' : 'field'}
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
            config={normalizedSiteHeaderConfig}
            dataInkTone={backgroundAwarenessActive ? headerTone : undefined}
            logoStops={heroHeaderLogoStops}
            wordmarkConfig={wordmarkConfig}
            navBandActive={heroNavBandActive}
            navBandCanvasRef={heroNavBandCanvasRef}
            navBandColorFilter={heroNavBandColorFilter}
            pageSurfaceConfig={normalizedPageSurfaceConfig}
          />
          </>
        )}

      {!gridLayoutActive && config.heroContentEnabled ? (
        <AbstractEditorialHero
          headline={ABSTRACT_EDITORIAL_HEADLINE}
          paragraphs={ABSTRACT_EDITORIAL_PARAGRAPHS}
          actionInkTone={actionsTone}
          config={normalizedEditorialHeroConfig}
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
          copyInkTone={contentTone}
          ctaConfig={normalizedCtaButtonConfig}
          heroCtaComposerConfig={normalizedHeroCtaComposerConfig}
          gradientHeadlineActive={heroContentPresentationActive}
          gradientDebugCanvasRef={heroHeadlineDebugCanvasRef}
          gradientDebugPanelOpen={isPanelOpen}
          headlineCanvasRef={heroHeadlineCanvasRef}
          headlineRef={heroHeadlineRef}
          layoutMode={heroLayoutMode}
          surfaceColor={normalizedPageSurfaceConfig.color}
        />
      ) : null}
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
      // already-configurable marginTop/desktopMarginTop, properly contained
      // by the shell's own overflow-hidden wrapper, not a page-specific
      // mt-0 override (which fixed one symptom — an exposed sliver of
      // globals.css's body{bg-slate-950} — by hiding it behind a different,
      // now-inconsistent margin instead of containing it).
      <PolymorphicLayout
        config={splitColumnLayoutConfig}
        className={styles.splitColumnViewport}
        pageSurfaceConfig={normalizedPageSurfaceConfig}
        paletteColorResolver={paletteColorResolver}
        headerWrapperRef={splitColumnHeaderWrapperRef}
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
                navAlignedToSplitEnabled: true,
                navAlignedToPageContainer: false,
                navContentGapPx: SPLIT_ALIGNED_NAV_CONTENT_GAP_PX,
              },
              splitColumnLayoutConfig,
            )}
            dataInkTone={backgroundAwarenessActive ? headerTone : undefined}
            logoStops={heroHeaderLogoStops}
            wordmarkConfig={wordmarkConfig}
            physicalLeftColumnColor={colors.actualLeftSegmentColor}
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
        wideColumnClassName={`flex flex-col gap-6 ${styles.abstractStackedRow} ${styles.mobilePinnedWideColumn}`}
        wideColumnStyle={{
          minHeight: wideColumnRowMinHeightCss,
          backgroundColor: colors.wideColumnColor,
        }}
        // 'viewport' is intentionally not another alias for the bounded
        // content box's parent-relative `h-full flex-1` behavior. These are
        // the same live, per-column effective viewport slots used for the
        // row itself: a floating header overlays 100dvh; a push-down header
        // reserves its measured height above a box that still ends flush
        // with the viewport bottom. PolymorphicLayout disables this mode
        // automatically while the columns stack on mobile.
        wideColumnContentViewportMinHeight={isCoverFlowDesktopTier ? wideColumnRowMinHeightCss : undefined}
        narrowColumnClassName={[
          // No 'items-center' here anymore — the narrow column's own real
          // vertical-centering slack (from narrowColumnStyle's own minHeight
          // below) now passes through to NarrowColumnContent's own outer
          // box via flexbox's default 'stretch' cross-axis instead, so that
          // primitive's own verticalAlign (narrowColumnContentVerticalAlign
          // — see ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG's own doc comment on
          // that field) is what actually centers AbstractEditorialHero now,
          // not a page-local class disconnected from that already-live
          // panel control.
          'flex',
          // ABSTRACT-01 fix (2026-08-20-139d957): CSS-module class (not a
          // Tailwind utility — abstract.module.css's own
          // @media (max-width: 767px) block targets .abstractStackedRow by
          // name) so that stylesheet can reset this row's inline minHeight
          // (below) back to auto once the two columns stack — see that CSS
          // rule's own doc comment for the full root-cause explanation.
          // Present on both wideColumnClassName and this
          // narrowColumnClassName since both columns share the identical
          // 100dvh-floor mechanism.
          styles.abstractStackedRow,
          styles.mobileHeroColumn,
        ].join(' ')}
        narrowColumnStyle={{
          minHeight: narrowColumnRowMinHeightCss,
          backgroundColor: colors.narrowColumnColor,
          '--mobile-hero-column-height':
            mobileHeroRowMinHeightCss,
        } as CSSProperties}
        narrowColumnContentViewportMinHeight={isCoverFlowDesktopTier
          ? narrowColumnRowMinHeightCss
          : mobileHeroRowMinHeightCss}
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
            aria-live={isCoverFlowDesktopTier ? 'polite' : undefined}
          >
            {isCoverFlowDesktopTier ? (
              <div className="absolute" style={coverFlowWideColumnStyle}>
                <CoverFlow
                  items={carouselAndListItems}
                  activeIndex={articleActiveIndex}
                  onActiveIndexChange={handleCoverFlowActiveIndexChange}
                  renderItem={renderCoverFlowItem}
                  config={coverFlowConfig}
                  cardWidthBasisPx={coverFlowSectionAnchorRect?.width}
                  prefersReducedMotion={coverFlowPrefersReducedMotion}
                  hoverMaxScale={normalizedCtaButtonConfig.proximityScale}
                  hoverMaxLiftPx={normalizedCtaButtonConfig.proximityLiftPx}
                  hoverMaxTiltDeg={
                    normalizedCtaButtonConfig.tiltEnabled ? normalizedCtaButtonConfig.tiltMaxDegrees : 0
                  }
                  hoverTiltPerspectivePx={normalizedCtaButtonConfig.tiltPerspectivePx}
                />
              </div>
            ) : (
              <div style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
                <MobilePinnedArticleSection
                  itemCount={carouselAndListItems.length}
                  rows={abstractTimelineRows}
                  activeIndex={articleActiveIndex}
                  onActiveIndexChange={handleMobileScrollActiveIndexChange}
                  onActiveIndexCommit={handleMobileArticleIndexCommit}
                  carouselColor={colors.wideColumnColor}
                  panelColor={colors.wideColumnColor}
                  config={mobilePinnedArticleSectionConfig}
                  renderCarousel={(controls: MobilePinnedCarouselControls) => (
                    <CoverFlow
                      items={carouselAndListItems}
                      activeIndex={controls.activeIndex}
                      onActiveIndexChange={controls.onIndexRequest}
                      renderItem={renderCoverFlowItem}
                      config={mobileCoverFlowConfig}
                      cardWidthBasisPx={coverFlowSectionAnchorRect?.width}
                      prefersReducedMotion={coverFlowPrefersReducedMotion}
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
                    />
                  )}
                  renderList={({ activeIndex, rows: listRows, onSelect }) => (
                    <AboutTimeline
                      rows={listRows}
                      activeIndex={activeIndex}
                      onSelect={onSelect}
                      accentColor={carouselAndListItems[activeIndex]?.accent ?? '#ffffff'}
                      columnBackgroundColor={colors.wideColumnColor}
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
            top={(
              <div data-abstract-editorial-section="true">
                <AbstractEditorialHero
                headline={ABSTRACT_EDITORIAL_HEADLINE}
                paragraphs={ABSTRACT_EDITORIAL_PARAGRAPHS}
                actionInkTone={actionsTone}
                config={normalizedSplitColumnHeroConfig}
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
                copyInkTone={contentTone}
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
                />
              </div>
            )}
            bottom={isCoverFlowDesktopTier ? (
              <div data-abstract-article-list-section="true">
                <AboutTimeline
                  rows={abstractTimelineRows}
                  activeIndex={articleActiveIndex}
                  onSelect={handleTimelineActiveIndexChange}
                  accentColor={carouselAndListItems[articleActiveIndex]?.accent ?? '#ffffff'}
                  columnBackgroundColor={colors.narrowColumnColor}
                  description={abstractTimelineConfig.description || undefined}
                  config={abstractTimelineConfig}
                  prefersReducedMotion={coverFlowPrefersReducedMotion}
                  panelId={ABSTRACT_TIMELINE_PANEL_ID}
                  // Same gradient-marker inputs renderCoverFlowItem already
                  // threads into CoverFlow's own cards (carouselAndListItems
                  // is exactly SliderContentSlide-shaped, coverFlowPalettes/
                  // coverFlowLiquidSliderMotion/journalDockSliderConfig are
                  // the same live instances) — the marker mesh matches
                  // whatever the active CoverFlow card is already showing,
                  // not a second, independently-configured gradient.
                  gradientSlides={carouselAndListItems}
                  gradientPaletteStates={coverFlowPalettes}
                  gradientMotion={coverFlowLiquidSliderMotion}
                  gradientConfig={journalDockSliderConfig}
                />
              </div>
            ) : null}
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
        {showAuthoringTools ? (
          <PanelShell
            title="ABSTRACT SETTINGS"
            isOpen={isPanelOpen}
            onToggle={togglePanel}
            backgroundColor={configPanelBackgroundColor}
            config={panelShellConfig}
            headerActions={(
              <PanelStandardHeaderActions bindings={componentConfigBindings} onReset={resetConfig} />
            )}
          >
            <ConfigScopeList bindings={componentConfigBindings} />
          </PanelShell>
        ) : null}
      </PolymorphicLayout>
    )}
    </>
  );
}
