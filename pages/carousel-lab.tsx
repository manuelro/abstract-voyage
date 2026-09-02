import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { usePrefersReducedMotion } from '../helpers/usePrefersReducedMotion';
import { useMeasuredElementRect } from '../components/useMeasuredElementRect';
import { useBreakpointTier } from '../components/useBreakpointTier';
import articleCardStyles from '../components/ArticleCard.module.css';
import {
  ConfigScopeList,
  createConfigScopeBinding,
  useConfigPanelBindings,
} from '../components/Panel/config';
import { PanelShell, PanelStandardHeaderActions } from '../components/Panel';
import { useAuthoringToolsVisibility } from '../components/Panel/useAuthoringToolsVisibility';
import {
  DEFAULT_CAROUSEL_LAB_CONFIG,
  normalizeCarouselLabConfig,
} from './carousel-lab.config';
import { CAROUSEL_LAB_PANEL } from './carousel-lab.panel';
import type { AbstractPostDockItem } from '../experiences/abstract/helpers/abstractPostDockItems';
import type { AbstractJournalLabFlipSlot } from '../experiences/abstract/components/AbstractJournalLabCollection/collectionLayout';
import {
  AbstractJournalLabHueFadeCard,
  type CardReveal,
} from '../experiences/abstract/components/AbstractJournalLabCollection';
import {
  normalizeAbstractJournalLabCollectionConfig,
  DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG,
} from '../experiences/abstract/components/AbstractJournalLabCollection/config/presentation';
import {
  normalizeAbstractPostDockPaletteConfig,
  normalizeAbstractPostDockHueInfluenceConfig,
  DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG,
  DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG,
  DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG,
  DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG,
} from '../experiences/abstract/components/AbstractPostDock/config/registered';
import { DEFAULT_LIQUID_SLIDER_CONFIG } from '../experiences/abstract/components/AbstractPostDock/config/legacy';
import { DEFAULT_CTA_BUTTON_CONFIG, CTA_BUTTON_MOTION_EASINGS } from '../components/CtaButton/config/registered';
import { useLiquidSliderMotion } from '../experiences/abstract/components/AbstractPostDock/hooks/motion';
import { buildDeckPaletteStates } from '../experiences/abstract/helpers/deckPalette';
import { DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG } from '../experiences/abstract/components/SplitColumnCardPreview/config/stack';
import { deriveTransparentTint } from '../helpers/surfaceColorDerivation';
import { CoverFlowLab } from '../experiences/abstract/components/CoverFlowLab/CoverFlowLab';

// SPIKE — throwaway lab page, not linked from navigation or the sitemap.
// See "Spike — Cover Flow carousel with the existing article card" for the
// full brief. Do not build on top of this without re-reading that doc.

const DISABLED_REVEAL: CardReveal = {
  enabled: false,
  startMs: 0,
  durationMs: 0,
  easingCss: 'linear',
  offsetYPercent: 0,
};

// Matches DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG.cardWidthPx (344, 3:4) —
// the same size /abstract's own flat-branch card renders at by default, so
// the centered card here is a true visual match (S-02).
const CARD_WIDTH_PX = DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG.cardWidthPx;

// Mobile overlap fix: CoverFlowLab's own itemWidth/centerGap/stackSpacing
// are plain pixel props (see that component's own prop surface) — this
// page previously passed the fixed 344px desktop card width with no
// regard for how much horizontal room the viewport actually has. On a
// real phone (~375-430 CSS px wide), 344px leaves almost no room for a
// neighbour to recede beside it, so the neighbour's own x/rotateY math
// (unchanged, tuned for a wide desktop viewport) reads as the two cards
// overlapping outright rather than a receding stack. Desktop already
// looks correct today, so the fix scales the *whole* geometry down
// together rather than retuning any one of these numbers independently:
// carouselLabConfig.cardWidthRatio (Card size in the panel) caps the
// active card at a fraction of the real measured container width, and
// centerGap/stackSpacing keep the same ratio to card width CoverFlowLab's
// own desktop defaults already use (250/344 and 100/344 by default) so the
// receding-neighbour "feel" is identical at any size, just correctly
// scaled to fit.
//
// stackSpacing's own fixed ratio to centerGap in the original fork
// (100/250) — kept constant as the "Card distance" panel knob (see
// carousel-lab.config.ts/carousel-lab.panel.ts) moves centerGap, so
// further-out neighbours keep the same relative spacing to the first
// neighbour rather than needing their own separate knob.
const STACK_SPACING_TO_CENTER_GAP_RATIO = 100 / 250;
// CoverFlowLab's own `depthPx` (closest neighbour's own translateZ
// magnitude) still auto-scales with the active card's real measured width
// — same "similar triangles" reasoning as before (see git history/prior
// doc comment here for the full WebKit paint-order incident this fixed).
// `perspective` itself no longer auto-scales: it's now a flat, panel-tuned
// value (carouselLabConfig.perspectivePx) per instruction, not derived.
const DEPTH_PX = 200;
// Matches AbstractPostDock's own cardWidthPx clamp floor (config/registered.ts's
// resolveDockLayoutConfig: clamp(layoutConfig.cardWidthPx, 160, 480)) — reused
// so this page doesn't invent a second, independently-tuned minimum.
const MIN_CARD_WIDTH_PX = 160;

// Drag-vs-tap disambiguation: each card is the real article <Link> (see
// AbstractJournalLabCollection.tsx's own outer `styles.slot`/`fadeSlot`
// anchor), and the coverflow's own pan gesture is a plain pointer/mouse
// drag on an ancestor of that anchor — a mousedown+move originating on an
// <a> triggers the browser's own native HTML5 link-drag instead of
// reaching CoverFlowLab's pointer-based gesture recognizer at all (its own
// onDragStart callback never fires, confirmed live: cursor stays 'grab'
// instead of 'grabbing'). onDragStart={preventDefault} below on this
// page's own per-card wrapper is what stops that native drag from ever
// starting, letting the pointer sequence continue into the coverflow's own
// recognizer regardless of whether it began on the active card, a
// neighbour, or empty space. Once that's fixed, every card is real enough
// for the browser to actually still fire a `click` after a real drag
// release (there's no built-in movement-distance click suppression for
// mouse), so this page also tracks its own pointerdown->click distance and
// suppresses navigation itself when it exceeds this threshold.
const CLICK_VS_DRAG_THRESHOLD_PX = 6;

// Neighbour-card "look and feel" match for /abstract's own Card Stack —
// reused from DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG's own 'custom'-mode
// literals (neighborBackgroundCustomColor/neighborTextColor/
// neighborTopicBorderColor) rather than that config's default 'column' mode
// (resolveContrastAwareTextColor against the page's own wide-column
// background), which this standalone spike page has no equivalent of. Those
// 'custom' literals are themselves already a flat near-black surface and a
// gray ink (#9b9fb0) — the same fallback CardStack.tsx itself falls back to
// whenever neighborTextColorMode is 'custom', not an invented substitute.
const NEIGHBOR_SURFACE_COLOR = DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG.neighborBackgroundCustomColor;
const NEIGHBOR_TEXT_COLOR = DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG.neighborTextColor;
const NEIGHBOR_TOPIC_BORDER_COLOR = DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG.neighborTopicBorderColor;
// Same derivation CardStack.tsx uses for its own resolvedNeighborCardBorderColor
// — the neighbour text color, faded to the config's own default 28% opacity.
const NEIGHBOR_CARD_BORDER_COLOR = deriveTransparentTint(
  NEIGHBOR_TEXT_COLOR,
  DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG.neighborBorderColorOffset,
);

export async function getStaticProps() {
  const { loadAbstractPostDockItems } = await import('../experiences/abstract/helpers/loadAbstractPostDockItems.server');
  // The full real list, unpadded — whatever /posts (DEFAULT_POSTS_DIR in
  // helpers/postContent.ts) actually has, currently 11 real articles.
  const articles: AbstractPostDockItem[] = loadAbstractPostDockItems();

  return { props: { articles } };
}

type CarouselLabProps = {
  articles: AbstractPostDockItem[];
};

export default function CarouselLabPage({ articles }: CarouselLabProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const { ref: containerRef, rect: containerRect } = useMeasuredElementRect<HTMLDivElement>();
  const pointerDownAtRef = useRef<{ x: number; y: number } | null>(null);
  const { tier } = useBreakpointTier();
  const [carouselLabConfig, setCarouselLabConfig] = useState(
    () => normalizeCarouselLabConfig(DEFAULT_CAROUSEL_LAB_CONFIG),
  );
  const { showAuthoringTools, isPanelOpen, togglePanel } = useAuthoringToolsVisibility();
  const carouselLabBinding = useMemo(() => createConfigScopeBinding({
    definition: CAROUSEL_LAB_PANEL,
    value: carouselLabConfig,
    onChange: setCarouselLabConfig,
  }), [carouselLabConfig]);
  const carouselLabLocalBindings = useMemo(() => [carouselLabBinding], [carouselLabBinding]);
  const configPanelBindings = useConfigPanelBindings(carouselLabLocalBindings);

  // Mesh performance state machine. AbstractJournalLabHueFadeCard's own
  // neutral-surface cover already fades in/out over gradientRevealDurationMs
  // (stackPresentation.state flips instantly; the *visual* cross-fade is
  // what takes that long) — this tracks which cards' meshes should still be
  // live (continuous) vs frozen, kept one gradientRevealDurationMs step
  // *behind* that visual state so the ordering the mesh's own performance
  // cost depends on is never visible:
  //   deactivating: stays live (continuous, hover/tilt still responsive)
  //     for the same duration its cover takes to fade back in, then freezes
  //     — never a "pop" to a static frame while the mesh is still uncovered.
  //   activating: goes live immediately (no delay) so it's already animating
  //     with full gesture support before its cover starts fading away.
  // A card index is "live" iff it's in this set; every other rendered card
  // is frozen with hover/tilt physics disabled (stackNeighborSettled).
  const [liveMeshIndices, setLiveMeshIndices] = useState<ReadonlySet<number>>(() => new Set([0]));
  const deactivationTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const prevActiveIndexRef = useRef(activeIndex);

  const handleCardPointerDownCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerDownAtRef.current = { x: event.clientX, y: event.clientY };
  };

  // Fires in the capture phase — before both the anchor's own default
  // navigation and CoverFlowLab's own bubble-phase onClick (its
  // click-to-snap promotion) — so it gets the first say over whether this
  // click means "navigate," "promote this neighbour," or "nothing, that
  // was actually a drag."
  const handleCardClickCapture = (
    event: ReactMouseEvent<HTMLDivElement>,
    isActive: boolean,
  ) => {
    const origin = pointerDownAtRef.current;
    const distancePx = origin
      ? Math.hypot(event.clientX - origin.x, event.clientY - origin.y)
      : 0;
    pointerDownAtRef.current = null;
    if (distancePx > CLICK_VS_DRAG_THRESHOLD_PX) {
      // A real drag released over this card. CoverFlowLab's own onDragEnd
      // already resolved the intended active index from the gesture's own
      // velocity/position — don't also navigate, and don't let the
      // click-to-snap bubble handler jump to whichever card happened to be
      // sitting under the release point.
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!isActive) {
      // A genuine tap on a neighbour: let CoverFlowLab's own bubble-phase
      // onClick promote it (enableClickToSnap) without also navigating to
      // that neighbour's own article underneath the tap.
      event.preventDefault();
    }
    // A genuine tap on the active card falls through untouched — its own
    // <Link> navigates exactly like every other article card in the app.
  };

  // Both ratios below are per-breakpoint (see carousel-lab.config.ts's own
  // doc comments) — the value that reads correctly on desktop doesn't
  // necessarily read correctly on a real phone, confirmed live more than
  // once in this page's own history.
  const cardWidthRatio = tier === 'lg'
    ? carouselLabConfig.cardWidthRatioLg
    : tier === 'md'
      ? carouselLabConfig.cardWidthRatioMd
      : carouselLabConfig.cardWidthRatio;
  const cardDistanceRatio = tier === 'lg'
    ? carouselLabConfig.cardDistanceRatioLg
    : tier === 'md'
      ? carouselLabConfig.cardDistanceRatioMd
      : carouselLabConfig.cardDistanceRatio;
  // Falls back to the fixed desktop size before the first real measurement
  // lands (same seed-before-ResizeObserver tradeoff SplitColumnCardPreview's
  // own cardSize state already makes). Deliberately no upper pixel ceiling
  // here (an earlier version clamped to CARD_WIDTH_PX/344 — the bug this
  // replaces: that made the Card size ratio a no-op above ~0.245 on any
  // desktop-width container, since containerWidth * ratio blew past 344
  // almost immediately and the clamp silently won every time). "Behaves
  // the same relative to the device size" means the ratio has to be the
  // real ceiling at every size, not just below some hardcoded desktop
  // width — CARD_WIDTH_PX now only seeds the pre-measurement fallback and
  // depthScale's own reference point below, never clamps the live value.
  const cardWidthPx = containerRect && containerRect.width > 0
    ? Math.max(MIN_CARD_WIDTH_PX, containerRect.width * cardWidthRatio)
    : CARD_WIDTH_PX;
  const cardHeightPx = cardWidthPx * (4 / 3);
  const centerGap = cardWidthPx * cardDistanceRatio;
  const stackSpacing = centerGap * STACK_SPACING_TO_CENTER_GAP_RATIO;
  // depthPx still tracks the active card's own real measured width (same
  // scale factor cardWidthPx itself was derived with — 1 at the
  // desktop-capped 344px, shrinking below that) so the neighbour-overlap
  // fix stays intact; perspective itself is now the panel's flat
  // perspectivePx directly, not derived from this scale — see
  // CarouselLabConfig.perspectivePx's own doc comment.
  const depthScale = cardWidthPx / CARD_WIDTH_PX;
  const perspective = carouselLabConfig.perspectivePx;
  const depthPx = DEPTH_PX * depthScale;
  const perspectiveOrigin = `${carouselLabConfig.perspectiveOriginXPercent}% ${carouselLabConfig.perspectiveOriginYPercent}%`;

  const collectionConfig = useMemo(
    () => normalizeAbstractJournalLabCollectionConfig(DEFAULT_ABSTRACT_JOURNAL_LAB_COLLECTION_CONFIG),
    [],
  );
  const paletteConfig = useMemo(
    () => normalizeAbstractPostDockPaletteConfig(DEFAULT_ABSTRACT_POST_DOCK_PALETTE_CONFIG),
    [],
  );
  const hueInfluenceConfig = useMemo(
    () => normalizeAbstractPostDockHueInfluenceConfig(DEFAULT_ABSTRACT_POST_DOCK_HUE_INFLUENCE_CONFIG),
    [],
  );
  const motion = useLiquidSliderMotion(DEFAULT_LIQUID_SLIDER_CONFIG);

  // Same "base" (uninfluenced) palette branch SplitColumnCardPreview's own
  // flat mode feeds both basePalette and influencedPalette with when there's
  // no active-row hue-influence concept to drive — see that component's own
  // hueFadeArticleBasePalettes/-InfluencedPalettes split.
  const palettes = useMemo(
    () => buildDeckPaletteStates({
      slides: articles,
      paletteConfig,
      hueInfluenceConfig: { ...hueInfluenceConfig, transitionEnabled: false, enabled: false },
      activeIndex: null,
    }),
    [articles, paletteConfig, hueInfluenceConfig],
  );

  // The rest of AbstractJournalLabHueFadeCard's own neighbour treatment
  // (the neutral surface covering the mesh, the border, the gray text) is
  // driven entirely by this one object — see CardStackSlot.tsx's own
  // `presentation` field for the production equivalent. Built once and
  // reused for every card; only `state` (active/inactive) varies per slot,
  // matching how CardStack.tsx itself resolves these colors/timings a
  // single time rather than per slot.
  const stackPresentationBase = useMemo(() => ({
    surfaceColor: NEIGHBOR_SURFACE_COLOR,
    // This standalone lab deliberately retains the shared default treatment.
    // /abstract alone exposes the live Card stack panel configuration.
    frameMode: 'border' as const,
    textColor: NEIGHBOR_TEXT_COLOR,
    topicBorderColor: NEIGHBOR_TOPIC_BORDER_COLOR,
    cardBorderColor: NEIGHBOR_CARD_BORDER_COLOR,
    headerOpacity: DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG.activeHeaderOpacity,
    textOpacity: DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG.activeTextOpacity,
    transitionDurationMs: prefersReducedMotion ? 0 : DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG.stepTiltDurationMs,
    transitionEasingCss: CTA_BUTTON_MOTION_EASINGS[DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG.stepTiltEasing],
    transitionDelayMs: 0,
    gradientRevealDurationMs: prefersReducedMotion
      ? 0
      : DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG.neighborGradientRevealDurationMs,
    gradientRevealEasingCss:
      CTA_BUTTON_MOTION_EASINGS[DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG.neighborGradientRevealEasing],
    gradientRevealBlurPx: prefersReducedMotion
      ? 0
      : DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG.neighborGradientRevealBlurPx,
    shadowFadeDurationMs: prefersReducedMotion
      ? 0
      : DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG.neighborShadowFadeDurationMs,
    shadowFadeEasingCss:
      CTA_BUTTON_MOTION_EASINGS[DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG.neighborShadowFadeEasing],
    ctaHoverDurationMs: prefersReducedMotion ? 0 : DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG.ctaHoverDurationMs,
    ctaHoverEasingCss: CTA_BUTTON_MOTION_EASINGS[DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG.ctaHoverEasing],
    ctaHoverDelayMs: prefersReducedMotion ? 0 : DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG.ctaHoverDelayMs,
  }), [prefersReducedMotion]);

  const gradientRevealDurationMs = stackPresentationBase.gradientRevealDurationMs;
  useEffect(() => {
    const prevActive = prevActiveIndexRef.current;
    if (prevActive === activeIndex) return;
    prevActiveIndexRef.current = activeIndex;

    // The newly active card goes live immediately — cancel any deactivation
    // timer still pending for it (it may have been mid-fade-out from an
    // even earlier switch, promoted back before that timer fired).
    const pendingForNewActive = deactivationTimersRef.current.get(activeIndex);
    if (pendingForNewActive !== undefined) {
      clearTimeout(pendingForNewActive);
      deactivationTimersRef.current.delete(activeIndex);
    }
    setLiveMeshIndices((current) => {
      if (current.has(activeIndex)) return current;
      const next = new Set(current);
      next.add(activeIndex);
      return next;
    });

    // The outgoing card stays live for exactly as long as its own cover
    // takes to fade back in, then freezes.
    const timer = setTimeout(() => {
      deactivationTimersRef.current.delete(prevActive);
      setLiveMeshIndices((current) => {
        if (!current.has(prevActive)) return current;
        const next = new Set(current);
        next.delete(prevActive);
        return next;
      });
    }, gradientRevealDurationMs);
    deactivationTimersRef.current.set(prevActive, timer);
  }, [activeIndex, gradientRevealDurationMs]);

  useEffect(() => {
    const timers = deactivationTimersRef.current;
    return () => { timers.forEach(clearTimeout); };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100vh', background: '#111' }}>
      <CoverFlowLab
        items={articles}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        itemWidth={cardWidthPx}
        itemHeight={cardHeightPx}
        centerGap={centerGap}
        stackSpacing={stackSpacing}
        perspective={perspective}
        depthPx={depthPx}
        perspectiveOrigin={perspectiveOrigin}
        reduceMotion={prefersReducedMotion}
        renderItem={(article, index, isActive) => {
          const slot: AbstractJournalLabFlipSlot = {
            index,
            article,
            lab: null,
            position: { leftPx: 0, topPx: 0, rotationDeg: 0 },
          };
          const isMeshLive = liveMeshIndices.has(index);
          return (
            <div
              className="carousel-lab-card"
              data-card-state={isActive ? 'active' : 'inactive'}
              style={{ width: '100%', height: '100%' }}
              onDragStart={(event) => event.preventDefault()}
              onPointerDownCapture={handleCardPointerDownCapture}
              onClickCapture={(event) => handleCardClickCapture(event, isActive)}
            >
              <AbstractJournalLabHueFadeCard
                slot={slot}
                targetView="articles"
                renderedView="articles"
                colorView="articles"
                phase="idle"
                transitioning={false}
                prefersReducedMotion={prefersReducedMotion}
                config={collectionConfig}
                motion={motion}
                gradientConfig={DEFAULT_LIQUID_SLIDER_CONFIG}
                basePalette={palettes?.[index] ?? null}
                influencedPalette={palettes?.[index] ?? null}
                visualSlide={article}
                journalHologramConfig={DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG}
                cardWidthPx={cardWidthPx}
                cardHeightPx={cardHeightPx}
                cardRadius={DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG.cardRadius}
                layoutConfig={DEFAULT_ABSTRACT_POST_DOCK_LAYOUT_CONFIG}
                ctaConfig={DEFAULT_CTA_BUTTON_CONFIG}
                reveal={DISABLED_REVEAL}
                meshActivity={isMeshLive ? 'continuous' : 'frozen'}
                stackNeighborSettled={!isActive && !isMeshLive}
                // Forces the excerpt permanently visible on the active card
                // (excerptHoverOnly=false under the hood — see this prop's
                // own doc comment) instead of requiring a hover to reveal
                // it, matching "active card shows metadata/title/excerpt
                // unconditionally, only the CTA is hover-gated." Inactive
                // cards keep the default hover-gated excerpt, which the
                // styled-jsx rule below then forces shut regardless of
                // hover (inactive shows metadata only, full stop).
                stackActiveSlide={isActive}
                stackPresentation={{
                  ...stackPresentationBase,
                  state: isActive ? 'active' : 'inactive',
                }}
              />
            </div>
          );
        }}
      />
      {/* Title-specific fade between inactive/active, layered on top of
          AbstractJournalLabCollection.tsx's own color-based neighbour
          treatment rather than replacing it: stackPresentation.textColor
          (above) already drives every neutral-state text color uniformly
          (label/meta/topic/title/excerpt/cta all read the same value), so
          there's no way to single out just the title's color through that
          prop. opacity is a property that component never touches, so it
          composes cleanly instead of fighting its own inline styles. The
          transition reuses --article-card-appearance-duration/-easing/
          -delay verbatim (inherited from the same .card element that
          already sets them) rather than a second, independently-tuned
          timing, so the title fades in step with the rest of the card's
          own inactive/active cross-fade.

          Second rule: ArticleCard's own .hoverReveal class (its group-hover/
          focus-within reveal — shared by the excerpt, when excerptHoverOnly
          is true, and the CTA, when ctaHoverOnly is true) still fires on
          hover regardless of active/inactive state. stackActiveSlide above
          already forces the excerpt permanently visible on the active card
          (no .hoverReveal there at all), but an *inactive* neighbour keeps
          the default hover-gated excerpt, so hovering one before it becomes
          active revealed its excerpt early — the inactive card is meant to
          show metadata only, unconditionally. !important because this is a
          deliberate override of another component's own :hover rule from
          outside it, not a fight with an inline style. */}
      <style jsx global>{`
        .carousel-lab-card .${articleCardStyles.titleInk} {
          transition: opacity var(--article-card-appearance-duration, 300ms)
            var(--article-card-appearance-easing, ease) var(--article-card-appearance-delay, 0ms);
        }
        .carousel-lab-card[data-card-state='inactive'] .${articleCardStyles.titleInk} {
          opacity: 0;
        }
        .carousel-lab-card[data-card-state='inactive'] .${articleCardStyles.hoverReveal} {
          opacity: 0 !important;
        }
      `}</style>
      {showAuthoringTools ? (
        <PanelShell
          title="CAROUSEL LAB SETTINGS"
          isOpen={isPanelOpen}
          onToggle={togglePanel}
          headerActions={(
            <PanelStandardHeaderActions
              bindings={configPanelBindings}
              onReset={() => setCarouselLabConfig(normalizeCarouselLabConfig(DEFAULT_CAROUSEL_LAB_CONFIG))}
            />
          )}
        >
          <ConfigScopeList bindings={configPanelBindings} />
        </PanelShell>
      ) : null}
    </div>
  );
}
