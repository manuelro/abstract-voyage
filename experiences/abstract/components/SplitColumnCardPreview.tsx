import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { CtaButtonConfig } from '../../../components/CtaButton/config/registered';
import { usePrefersReducedMotion } from '../../../helpers/usePrefersReducedMotion';
import type { LabSummary } from '../../../helpers/labContent';
import type { SliderContentSlide } from '../../../helpers/postContent';
import {
  AbstractJournalLabHueFadeCard,
  type CardReveal,
} from './AbstractJournalLabCollection';
import {
  normalizeAbstractJournalLabCollectionConfig,
} from './AbstractJournalLabCollection/config/presentation';
import type { AbstractJournalLabCollectionConfig } from './AbstractJournalLabCollection/config/presentation';
import type { AbstractJournalLabFlipSlot } from './AbstractJournalLabCollection/collectionLayout';
import { useAbstractJournalLabHueFadeViewTransition } from './AbstractJournalLabCollection/useHueFadeViewTransition';
import {
  normalizeAbstractPostDockPaletteConfig,
  normalizeAbstractPostDockHueInfluenceConfig,
} from './AbstractPostDock/config/registered';
import type {
  AbstractPostDockHologramConfig,
  AbstractPostDockHueInfluenceConfig,
  AbstractPostDockLayoutConfig,
  AbstractPostDockPaletteConfig,
  LiquidSliderConfig,
} from './AbstractPostDock';
import { useLiquidSliderMotion } from './AbstractPostDock/hooks/motion';
import { buildDeckPaletteStates } from '../helpers/deckPalette';
import type { DeckPaletteState } from '../helpers/deckPalette';
import { toAbstractMetalLabSlide } from './AbstractMetalLabList.config';
import type { AbstractPostDockItem } from '../helpers/abstractPostDockItems';
import {
  normalizeSplitColumnCardPreviewConfig,
  type SplitColumnCardPreviewConfig,
} from './SplitColumnCardPreview.config';
import {
  normalizeSplitColumnCardStackConfig,
  type SplitColumnCardStackConfig,
} from './SplitColumnCardPreview/config/stack';
import {
  CardStack,
  type CardStackVerticalAlign,
} from './SplitColumnCardPreview/components/CardStack';
import type { CardStackContentAdapter } from './SplitColumnCardPreview/components/CardStackSlot';
import { useStackSwipeTransition } from './SplitColumnCardPreview/hooks/useStackSwipeTransition';
import type { StackListKey } from './SplitColumnCardPreview/hooks/useStackSwipeTransition';
import styles from './SplitColumnCardPreview.module.css';

const DISABLED_REVEAL: CardReveal = {
  enabled: false,
  startMs: 0,
  durationMs: 0,
  easingCss: 'linear',
  offsetYPercent: 0,
};

/**
 * The one item shape Abstract's own Card Stack content adapter renders —
 * `cardstack-content-renderer-boundary` (bugs audit / feature-development
 * agentic flow): `CardStack`/`CardStackSlot` are generic over `TItem`, so
 * this is where Abstract's own journal/lab packaging (a slot, which of the
 * two lists it belongs to, the resolved visual slide, and its base/
 * influenced hue-fade palettes) lives now — unchanged in substance from
 * what `CardStack.tsx` itself used to build inline per slot, just moved up
 * to the one page-level adapter that actually owns Abstract's own content.
 */
export type AbstractCardStackItem = {
  slot: AbstractJournalLabFlipSlot;
  renderedList: StackListKey;
  visualSlide: SliderContentSlide;
  basePalette: DeckPaletteState | null;
  influencedPalette: DeckPaletteState | null;
};

export type SplitColumnCardPreviewProps = {
  articles: ReadonlyArray<AbstractPostDockItem>;
  labs: ReadonlyArray<LabSummary>;
  /** Same (unnormalized) config the classic branch's AbstractJournalLabCollection
   * reads — this composition normalizes it itself, matching that component's
   * own internal `useMemo(() => normalizeAbstractJournalLabCollectionConfig(...))`,
   * so `fadeDurationMs`/`contentFadeDurationMs` (the transition timing) are
   * the real, live-configurable values, not defaults. */
  collectionConfig: AbstractJournalLabCollectionConfig;
  /** Tabs-to-card separation (padding on the tabs row, margin on the card
   * container) — see SplitColumnCardPreview.config.ts's own doc comment. */
  config: SplitColumnCardPreviewConfig;
  /** Opt-in vertical card-stack presentation — its own scope, separate from
   * `config` above, since it covers a genuinely different concern (layout,
   * motion, arrow styling) — see SplitColumnCardPreview/config/stack.ts's
   * own doc comment. */
  stackConfig: SplitColumnCardStackConfig;
  /** Stack-mode only — passthrough for CardStack's own headerOffsetPx, see
   * that prop's doc comment. Inert in the flat/single-card branch below,
   * which has no fixed-position layer of its own to offset. */
  headerOffsetPx?: number;
  /** Stack-mode only — the composing page's resolved vertical position for
   * the active card. Generic on purpose: this component does not know which
   * page/layout system supplied the value. */
  stackVerticalAlign?: CardStackVerticalAlign;
  /** Stack-mode only — current responsive column padding tokens, forwarded
   * so CardStack aligns within the configured content box. */
  stackVerticalPaddingTopClass?: string;
  stackVerticalPaddingBottomClass?: string;
  /** The card's own tilt/lift/shadow physics at rest and on hover — same
   * live, panel-configurable CtaButtonConfig state a page's own "CTA
   * Button" appearance section already edits (e.g. pages/abstract.tsx's
   * ctaButtonConfig). Passed through to AbstractJournalLabHueFadeCard's own
   * optional ctaConfig prop, which defaults to a fixed snapshot
   * (DEFAULT_CTA_BUTTON_CONFIG) when omitted — this is what makes the
   * card's tilt reachable from that panel instead of permanently pinned. */
  physicsConfig: CtaButtonConfig;
  gradientConfig: LiquidSliderConfig;
  paletteConfig: AbstractPostDockPaletteConfig;
  hueInfluenceConfig: AbstractPostDockHueInfluenceConfig;
  hologramConfig: AbstractPostDockHologramConfig;
  layoutConfig: AbstractPostDockLayoutConfig;
  cardRadius: string;
  /** Page surface revealed inside inactive stack cards. Kept explicit so a
   * configured page color, rather than a duplicated default, remains the
   * single source of truth for the neutral card interior. */
  surfaceColor: string;
  /** Only meaningful when stackConfig.neighborBackgroundMode or
   * neighborTextColorMode is 'column' — passed straight through to
   * CardStack's own columnBackgroundColor (see that prop's own doc
   * comment). Falls back to surfaceColor when omitted. */
  columnBackgroundColor?: string;
  className?: string;
};

// Distance (px) a drag must cross before release counts as a view switch
// rather than a snap-back. Direction lock (below) uses the same order-of-
// magnitude threshold on the perpendicular axis, so an early mostly-vertical
// drag never gets claimed by this gesture.
const SWIPE_COMMIT_THRESHOLD_PX = 56;
const DIRECTION_LOCK_THRESHOLD_PX = 8;
const SNAP_TRANSITION = 'transform 220ms cubic-bezier(0.2, 0, 0, 1)';

/**
 * `/abstract`'s split-column narrow-column content — exactly one Articles
 * card and one Labs card, tab-switched or swiped (see
 * PLAN-HOMEPAGE-IA-LAYOUT.md 8.4/8.7). Renders through
 * `AbstractJournalLabCollection`'s own `AbstractJournalLabHueFadeCard` —
 * the actual, unmodified card renderer (tilt-on-hover physics, the real
 * elevation-shadow engine, rounded corners, the live `LiquidGradientAdapter`
 * background) — not a hand-rolled substitute. The view switch itself runs
 * through `useAbstractJournalLabHueFadeViewTransition`, an extraction of
 * that same collection's own sequential fade-out → color-retarget → fade-in
 * choreography (see that hook's own doc comment) — not an instant swap, and
 * not a re-derived approximation of the timing. Only the surrounding
 * scattered-grid layout (multiple slot positions, per-slot scatter/rotation)
 * is skipped, since a single always-in-view card needs none of it.
 */
export function SplitColumnCardPreview({
  articles,
  labs,
  collectionConfig,
  config,
  stackConfig,
  headerOffsetPx = 0,
  stackVerticalAlign,
  stackVerticalPaddingTopClass,
  stackVerticalPaddingBottomClass,
  physicsConfig,
  gradientConfig,
  paletteConfig,
  hueInfluenceConfig,
  hologramConfig,
  layoutConfig,
  cardRadius,
  surfaceColor,
  columnBackgroundColor,
  className,
}: SplitColumnCardPreviewProps) {
  const hasArticles = articles.length > 0;
  const hasLabs = labs.length > 0;
  const prefersReducedMotion = usePrefersReducedMotion();
  const normalized = useMemo(
    () => normalizeSplitColumnCardPreviewConfig(config),
    [config],
  );
  const normalizedStack = useMemo(
    () => normalizeSplitColumnCardStackConfig(stackConfig),
    [stackConfig],
  );
  const normalizedCollectionConfig = useMemo(
    () => normalizeAbstractJournalLabCollectionConfig(collectionConfig),
    [collectionConfig],
  );
  const {
    activeView,
    renderedView,
    colorView,
    fadePhase,
    transitioning,
    selectView,
  } = useAbstractJournalLabHueFadeViewTransition({
    hasArticles,
    hasLabs,
    config: normalizedCollectionConfig,
    prefersReducedMotion,
    initialView: hasArticles ? 'articles' : 'labs',
  });

  // Stack mode's own Articles/Labs switch (see SplitColumnCardPreview/
  // hooks/useStackSwipeTransition.ts's own doc comment for why it's a
  // separate, push/fade state machine rather than a wrapper around the
  // hue-fade hook above). Always called, like that hook, regardless of
  // which branch actually renders — only the tab row below and the branch
  // itself decide which one drives the UI.
  const stackSwipe = useStackSwipeTransition({
    hasArticles,
    hasLabs,
    config: normalizedStack,
    prefersReducedMotion,
    initialList: hasArticles ? 'articles' : 'labs',
  });

  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lockedAxis: 'horizontal' | 'vertical' | null;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const otherView = activeView === 'articles' ? 'labs' : 'articles';
  const otherViewHasContent = otherView === 'articles' ? hasArticles : hasLabs;

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!otherViewHasContent) return;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lockedAxis: null,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }, [otherViewHasContent]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (drag.lockedAxis === null) {
      if (Math.abs(deltaX) > DIRECTION_LOCK_THRESHOLD_PX || Math.abs(deltaY) > DIRECTION_LOCK_THRESHOLD_PX) {
        drag.lockedAxis = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
      }
    }
    if (drag.lockedAxis !== 'horizontal') return;

    event.preventDefault();
    setDragOffsetPx(deltaX);
  }, []);

  const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const committed = drag.lockedAxis === 'horizontal'
      && otherViewHasContent
      && Math.abs(dragOffsetPx) > SWIPE_COMMIT_THRESHOLD_PX;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
    setIsDragging(false);
    setDragOffsetPx(0);
    if (committed) {
      suppressClickRef.current = true;
      selectView(otherView);
    }
  }, [dragOffsetPx, otherView, otherViewHasContent, selectView]);

  const handleClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // Both faces stay populated regardless of activeView (matching the real
  // collection's own "keep the otherwise-empty side mounted" slot design,
  // see AbstractJournalLabHueFadeCard's own doc comment) — only which one
  // is *rendered* is driven by targetView/renderedView below.
  const slot: AbstractJournalLabFlipSlot = useMemo(() => ({
    index: 0,
    article: articles[0] ?? null,
    lab: labs[0] ?? null,
    position: { leftPx: 0, topPx: 0, rotationDeg: 0 },
  }), [articles, labs]);

  const labSlides: SliderContentSlide[] = useMemo(
    () => labs.map((lab, index) => toAbstractMetalLabSlide(lab, index)),
    [labs],
  );

  const normalizedPalette = useMemo(
    () => normalizeAbstractPostDockPaletteConfig(paletteConfig),
    [paletteConfig],
  );
  const normalizedHueInfluence = useMemo(
    () => normalizeAbstractPostDockHueInfluenceConfig(hueInfluenceConfig),
    [hueInfluenceConfig],
  );
  // Same two-config split (plain vs. hue-influence-graded) the real
  // collection derives for its own hue-fade-through cards — `colorView`
  // (from the transition hook) selects between them inside
  // AbstractJournalLabHueFadeCard itself, which is what makes the switch
  // read as one continuous field re-grading rather than two independent,
  // disconnected colors snapping in.
  const hueFadeInfluenceConfigs = useMemo(() => {
    const transition = {
      ...normalizedHueInfluence,
      transitionEnabled: true,
      transitionDurationMs: normalizedCollectionConfig.fadeDurationMs,
      transitionEasing: normalizedCollectionConfig.fadeEasing,
    };
    return {
      base: { ...transition, enabled: false },
      influenced: { ...transition, enabled: true },
    };
  }, [
    normalizedCollectionConfig.fadeDurationMs,
    normalizedCollectionConfig.fadeEasing,
    normalizedHueInfluence,
  ]);
  const hueFadeArticleBasePalettes = useMemo(() => buildDeckPaletteStates({
    slides: articles,
    paletteConfig: normalizedPalette,
    hueInfluenceConfig: hueFadeInfluenceConfigs.base,
    activeIndex: Math.min(7, Math.max(0, articles.length - 1)),
  }), [articles, hueFadeInfluenceConfigs.base, normalizedPalette]);
  const hueFadeArticleInfluencedPalettes = useMemo(() => buildDeckPaletteStates({
    slides: articles,
    paletteConfig: normalizedPalette,
    hueInfluenceConfig: hueFadeInfluenceConfigs.influenced,
    activeIndex: Math.min(7, Math.max(0, articles.length - 1)),
  }), [articles, hueFadeInfluenceConfigs.influenced, normalizedPalette]);
  const hueFadeLabBasePalettes = useMemo(() => buildDeckPaletteStates({
    slides: labSlides,
    paletteConfig: normalizedPalette,
    hueInfluenceConfig: hueFadeInfluenceConfigs.base,
    activeIndex: null,
  }), [hueFadeInfluenceConfigs.base, labSlides, normalizedPalette]);
  const hueFadeLabInfluencedPalettes = useMemo(() => buildDeckPaletteStates({
    slides: labSlides,
    paletteConfig: normalizedPalette,
    hueInfluenceConfig: hueFadeInfluenceConfigs.influenced,
    activeIndex: null,
  }), [hueFadeInfluenceConfigs.influenced, labSlides, normalizedPalette]);

  // Anchored to slot.article's own presence, exactly like the real
  // collection's renderCollectionCard — NOT to activeView. A slot with an
  // article keeps that article's own gradient identity for its whole
  // lifetime; colorView (below) only ever selects between that one seed's
  // base vs. influenced grading, never swaps to an unrelated lab seed.
  const visualSlide: SliderContentSlide | null = slot.article ?? labSlides[slot.index] ?? null;
  const basePalette = slot.article
    ? hueFadeArticleBasePalettes?.[slot.index] ?? null
    : hueFadeLabBasePalettes?.[slot.index] ?? null;
  const influencedPalette = slot.article
    ? hueFadeArticleInfluencedPalettes?.[slot.index] ?? null
    : hueFadeLabInfluencedPalettes?.[slot.index] ?? null;

  const motion = useLiquidSliderMotion(gradientConfig);

  // The stack-mode item collections CardStack's own generic `items`/
  // `secondaryItems` props take — same per-item packaging `CardStack.tsx`
  // used to build inline before `cardstack-content-renderer-boundary` made
  // it generic, just constructed here instead, where Abstract's own
  // articles/labs/palettes already live.
  const articleStackItems: AbstractCardStackItem[] = useMemo(() => articles.map((articleSlide, index) => ({
    slot: { index, article: articleSlide, lab: null, position: { leftPx: 0, topPx: 0, rotationDeg: 0 } },
    renderedList: 'articles' as const,
    visualSlide: articleSlide,
    basePalette: hueFadeArticleBasePalettes?.[index] ?? null,
    influencedPalette: hueFadeArticleInfluencedPalettes?.[index] ?? null,
  })), [articles, hueFadeArticleBasePalettes, hueFadeArticleInfluencedPalettes]);
  const labStackItems: AbstractCardStackItem[] = useMemo(() => {
    const resolved: AbstractCardStackItem[] = [];
    labs.forEach((labItem, index) => {
      const labVisualSlide = labSlides[index];
      if (!labVisualSlide) return;
      resolved.push({
        slot: { index, article: null, lab: labItem, position: { leftPx: 0, topPx: 0, rotationDeg: 0 } },
        renderedList: 'labs' as const,
        visualSlide: labVisualSlide,
        basePalette: hueFadeLabBasePalettes?.[index] ?? null,
        influencedPalette: hueFadeLabInfluencedPalettes?.[index] ?? null,
      });
    });
    return resolved;
  }, [labs, labSlides, hueFadeLabBasePalettes, hueFadeLabInfluencedPalettes]);

  // The Abstract-compatible content adapter (cardstack-content-renderer-
  // boundary): reproduces the exact `AbstractJournalLabHueFadeCard` call
  // `CardStack.tsx` used to hardcode, verbatim, so /abstract's own
  // rendering has zero behavioral/visual diff post-extraction.
  // `isIntroductoryFirstArticle` and the stacked-mode hologram suppression
  // both moved here from `CardStack.tsx` (its own former `stacked` local
  // and `activeHologramConfig`) since both are purely Abstract-journal
  // content concerns — `stacked` arrives as one of `renderContent`'s own
  // generic render props instead.
  const renderAbstractCardStackContent = useCallback<CardStackContentAdapter<AbstractCardStackItem>>(
    ({
      item, itemIndex, interactive, stackActiveSlide, stackNeighborSettled, stackSlotAnimating,
      stackPresentationTransitioning,
      hasHoverPointer: itemHasHoverPointer, prefersReducedMotion: itemPrefersReducedMotion, stacked,
      presentation, cardWidthPx: itemCardWidthPx, cardHeightPx: itemCardHeightPx, cardRadius: itemCardRadius,
    }) => {
      const isIntroductoryFirstArticle = normalizedStack.firstArticleTitleAndSummaryOnly
        && item.renderedList === 'articles'
        && itemIndex === 0;
      // cardstack-mobile-horizontal-swipe, second piece of operator
      // feedback: AbstractJournalLabHueFadeCard's own pointer-proximity
      // hologram/tilt and AbstractPostDockHologramConfig's touch-oriented
      // fields (touchDragEnabled, ambientSweepEnabled) are designed for
      // desktop cursor-proximity or idle ambient decoration, not a card
      // being actively swiped by the same touch input driving it —
      // `enabled` is that config's own top-level kill switch (checked as a
      // real gate in AbstractJournalLabCollection.tsx), so disabling it
      // here suppresses both without touching that shared file.
      const activeHologramConfig = stacked ? { ...hologramConfig, enabled: false } : hologramConfig;
      return (
        <AbstractJournalLabHueFadeCard
          slot={item.slot}
          targetView={item.renderedList}
          renderedView={item.renderedList}
          colorView={item.renderedList}
          phase="idle"
          transitioning={!interactive}
          stackActiveSlide={stackActiveSlide}
          stackNeighborSettled={stackNeighborSettled}
          stackSlotAnimating={stackSlotAnimating}
          stackPresentationTransitioning={stackPresentationTransitioning}
          hasHoverPointer={itemHasHoverPointer}
          titleAndSummaryOnly={isIntroductoryFirstArticle}
          stackPresentation={presentation}
          prefersReducedMotion={itemPrefersReducedMotion}
          config={normalizedCollectionConfig}
          motion={motion}
          gradientConfig={gradientConfig}
          basePalette={item.basePalette}
          influencedPalette={item.influencedPalette}
          visualSlide={item.visualSlide}
          journalHologramConfig={activeHologramConfig}
          cardWidthPx={itemCardWidthPx}
          cardHeightPx={itemCardHeightPx}
          cardRadius={itemCardRadius}
          layoutConfig={layoutConfig}
          ctaConfig={physicsConfig}
          reveal={DISABLED_REVEAL}
        />
      );
    },
    [
      normalizedStack.firstArticleTitleAndSummaryOnly,
      normalizedCollectionConfig,
      motion,
      gradientConfig,
      hologramConfig,
      layoutConfig,
      physicsConfig,
    ],
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  // Seeded from layoutConfig.cardWidthPx (3:4) rather than {0, 0} — same
  // fallback-before-measurement approach the real collection already uses
  // for its own container width (containerWidthPx's own `??` chain) — so
  // SSR/first paint already shows a correctly-sized card instead of a blank
  // gap until the ResizeObserver below reports back after hydration.
  const [cardSize, setCardSize] = useState(() => ({
    width: layoutConfig.cardWidthPx,
    height: layoutConfig.cardWidthPx * (4 / 3),
  }));
  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      setCardSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Stack mode no longer needs any height/flex overrides on this wrapper —
  // CardStack's own card layer is `position: fixed` (see its own doc
  // comment), sized from the real browser viewport height directly rather
  // than depending on this element's box, so it can't add to page height
  // and doesn't need a flex parent to distribute space into. It also
  // renders its own tab row (round 6) — the stack's fixed layer is
  // edge-to-edge with the real viewport and passes underneath the header,
  // so the tabs need to live inside that same fixed layer/stacking context
  // rather than as separate normal-flow content pushing it down; only the
  // flat branch below still owns the shared tab markup.
  return (
    <div className={className}>
      {normalizedStack.enabled ? null : (
        <div className={`${styles.tabs} ${normalized.tabsPaddingY}`} role="tablist" aria-label="Journal collection preview">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'articles'}
            className={styles.tab}
            disabled={!hasArticles}
            onClick={() => selectView('articles')}
          >
            Articles
          </button>
          <span aria-hidden="true" className={styles.separator}>|</span>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'labs'}
            className={styles.tab}
            disabled={!hasLabs}
            onClick={() => selectView('labs')}
          >
            Labs
          </button>
        </div>
      )}
      {normalizedStack.enabled ? (
        // cardsMarginTop deliberately NOT applied here (bugs audit,
        // 2026-08-21, "Polymorphic Layout owns column layout" review):
        // CardStack's own visual layer is fixed/absolute and independent of
        // this wrapper's own box (see the comment above), so this wrapper
        // renders no in-flow content of its own — any margin here becomes
        // the *entire* auto-height PolymorphicLayout's own column grid cell
        // reports upward, which PolymorphicLayout then paints its real
        // column background color behind. Confirmed live: with cardsMarginTop
        // at its 'mt-6' default, this produced a real, visible 24px colored
        // seam between the narrow column's text and the wide column's card
        // at the stacked (< 768px) breakpoint — camouflaged, not absent, at
        // Tablet/Desktop, where it merges into that tier's own already-
        // colored wideColumnContentPaddingTop region instead of standing
        // out. No design intent to preserve here — see the flat/non-stack
        // branch below (cardDragSurface) for cardsMarginTop's own real,
        // legitimate use, where a real in-flow card genuinely needs a real
        // margin above it.
        <div className="relative w-full">
          <CardStack<AbstractCardStackItem>
            items={articleStackItems}
            secondaryItems={labStackItems}
            hasItems={hasArticles}
            hasSecondaryItems={hasLabs}
            renderContent={renderAbstractCardStackContent}
            swipe={stackSwipe}
            headerOffsetPx={headerOffsetPx}
            verticalAlign={stackVerticalAlign}
            verticalPaddingTopClass={stackVerticalPaddingTopClass}
            verticalPaddingBottomClass={stackVerticalPaddingBottomClass}
            stackConfig={normalizedStack}
            physicsConfig={physicsConfig}
            cardRadius={cardRadius}
            surfaceColor={surfaceColor}
            columnBackgroundColor={columnBackgroundColor}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>
      ) : (
        <div
          ref={containerRef}
          className={`${styles.cardDragSurface} relative w-full ${normalized.cardsMarginTop}`}
          style={{
            aspectRatio: '3 / 4',
            '--card-tilt-perspective': `${physicsConfig.tiltPerspectivePx}px`,
            touchAction: otherViewHasContent ? 'pan-y' : 'auto',
            transform: dragOffsetPx ? `translateX(${dragOffsetPx}px)` : undefined,
            transition: isDragging ? 'none' : SNAP_TRANSITION,
          } as CSSProperties}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={handleClickCapture}
        >
          {visualSlide && cardSize.width > 0 ? (
            <AbstractJournalLabHueFadeCard
              slot={slot}
              targetView={activeView}
              renderedView={renderedView}
              colorView={colorView}
              phase={fadePhase}
              transitioning={transitioning}
              prefersReducedMotion={prefersReducedMotion}
              config={normalizedCollectionConfig}
              motion={motion}
              gradientConfig={gradientConfig}
              basePalette={basePalette}
              influencedPalette={influencedPalette}
              visualSlide={visualSlide}
              journalHologramConfig={hologramConfig}
              cardWidthPx={cardSize.width}
              cardHeightPx={cardSize.height}
              cardRadius={cardRadius}
              layoutConfig={layoutConfig}
              ctaConfig={physicsConfig}
              reveal={DISABLED_REVEAL}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
