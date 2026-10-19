import { useEffect, useRef, useState } from 'react';
import type { CtaButtonConfig } from '../../../../components/CtaButton/config/registered';
import { EditorialQuote } from './EditorialQuote';
import { FeaturedInjectedQuote } from './FeaturedInjectedQuote';
import { FeaturedCard } from './FeaturedCard';
import { DEFAULT_FEATURED_WALL_QUOTE_CONFIG, type FeaturedWallQuoteConfig } from './featuredWallQuoteConfig';
import type { PracticesSectionLayoutConfig } from '../PracticesSection.config';
import type { QuoteCoverFlowGradient } from './Quote';
import type { EditorialQuoteDesigns } from './editorialLiveDesign';
import { resolveEditorialInk, type EditorialVariant } from './editorialConfig';
import type { QuotePartsDesign } from './quotePartsLiveDesign';
import type { WallQuoteItem as WallQuoteItemData } from '../../../../pages/wallQuoteModel';

export type WallQuoteBreathingRoomConfig = {
  enabled: boolean;
  mediumMinLines: number;
  longMinLines: number;
  mediumGapPx: number;
  longGapPx: number;
};

const NO_BREATHING_ROOM: WallQuoteBreathingRoomConfig = {
  enabled: false, mediumMinLines: 4, longMinLines: 7, mediumGapPx: 0, longGapPx: 0,
};

const NEXT_CHANGE_TEXT_APPEARANCE = {
  dimOpacity: 0.72,
  emphasisOpacity: 1,
  highlightedWordFontWeight: 400,
} as const;

/** EditorialQuote.module.css's .item padding-block-start (0.5rem) -- the
 * fixed gap between a visible top rule and the quote's own content before
 * any receiverTopGapPx is added on top of it. Kept here (the wall-only
 * consumer that computes topRuleContentGapOverridePx), not in the shared
 * component, so EditorialQuote's own override prop stays a plain "replace
 * the gap with this many px" API with no wall-specific assumption baked in. */
const TOP_RULE_BASE_CONTENT_GAP_PX = 8;

type Props = {
  item: WallQuoteItemData;
  index: number;
  designs: EditorialQuoteDesigns;
  /** Shared heading/link appearance -- one for the whole wall, so editing it in
   * the lab updates every wall quote's heading and link together. */
  partsDesign: QuotePartsDesign;
  coverFlowGradient: QuoteCoverFlowGradient;
  cardHeightToWidthRatio?: number;
  liftPhysics: CtaButtonConfig;
  featuredQuoteConfig?: FeaturedWallQuoteConfig;
  practiceCardLayout?: PracticesSectionLayoutConfig;
  /** Wall-only, layout-derived visibility. The border width remains reserved
   * while hidden so CSS column balancing cannot change the neighbour. */
  showTopRule?: boolean;
  breathingRoomConfig?: WallQuoteBreathingRoomConfig;
  /** When this quote's own measured breathing room would otherwise be
   * added in full as space after itself, caps it to this amount instead --
   * set only when this quote's direct column-neighbour below owns a
   * visible top rule, so the other half of the gap can go to that
   * neighbour instead (receiverTopGapPx) and the rule ends up equidistant
   * from both quotes. Computed centrally in wall.tsx (wallQuoteTopRules.ts)
   * from the real masonry layout, not derivable locally. */
  senderHalvedGapPx?: number;
  /** The other half of the column-above neighbour's breathing room,
   * received when THIS quote owns the visible top rule. Added on top of
   * the rule's normal fixed content gap. 0/undefined when the neighbour
   * above added no extra breathing room. */
  receiverTopGapPx?: number;
  /** True when no item at all sits directly above this one in its rendered
   * column (the masonry's first row). Exempt from the paddingBlockStart/
   * paddingBlockEnd centering split below -- with nothing above to balance
   * against, keep the original behaviour: full measured breathing room as
   * space after the quote only. Computed centrally in wall.tsx from the
   * real masonry layout (wallQuoteTopRules.ts), not derivable locally. */
  isFirstInColumn?: boolean;
};

export function WallQuoteItem({ item, index, designs, partsDesign, coverFlowGradient, cardHeightToWidthRatio, liftPhysics, featuredQuoteConfig = DEFAULT_FEATURED_WALL_QUOTE_CONFIG, practiceCardLayout, showTopRule, breathingRoomConfig, senderHalvedGapPx, receiverTopGapPx, isFirstInColumn }: Props) {
  const spacing = breathingRoomConfig ?? NO_BREATHING_ROOM;
  const rootRef = useRef<HTMLDivElement>(null);
  const [breathingRoom, setBreathingRoom] = useState({ lines: 0, px: 0 });
  useEffect(() => {
    const paragraph = rootRef.current?.querySelector<HTMLElement>('blockquote p');
    if (!paragraph) return undefined;
    let frame = 0;
    let active = true;
    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(paragraph).lineHeight);
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;
      const lines = Math.max(1, Math.round(paragraph.offsetHeight / lineHeight));
      const px = !spacing.enabled ? 0
        : lines >= spacing.longMinLines ? spacing.longGapPx
          : lines >= spacing.mediumMinLines ? spacing.mediumGapPx : 0;
      setBreathingRoom(previous => previous.lines === lines && previous.px === px
        ? previous : { lines, px });
    };
    const schedule = () => {
      if (!active) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    schedule();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(paragraph);
    window.addEventListener('resize', schedule);
    if (document.fonts) void document.fonts.ready.then(schedule);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [item.displayText, spacing.enabled, spacing.mediumMinLines,
    spacing.longMinLines, spacing.mediumGapPx, spacing.longGapPx]);
  const variant: EditorialVariant = item.role === 'feature' ? 'featured' : item.role === 'excerpt' ? 'solid' : 'plain';
  const quoteConfig = item.featuredContent ? featuredQuoteConfig : designs[variant];
  const config = showTopRule === undefined || Boolean(item.featuredContent) ? quoteConfig : {
    ...quoteConfig,
    topRuleEnabled: item.role !== 'feature',
    topRuleOpacityPercent: showTopRule ? quoteConfig.topRuleOpacityPercent : 0,
  };
  const effectiveConfig = {
    ...config,
    linkEnabled: item.featuredContent ? config.linkEnabled : item.linkEnabled ?? config.linkEnabled,
    linkLabel: item.linkLabel ?? config.linkLabel,
    ...(item.featuredContent ? { sourceHeadingText: item.title } : {}),
  };
  // senderHalvedGapPx (set only when this quote's own below-neighbour owns
  // a visible rule) caps how much of this quote's own measured breathing
  // room still applies as space after itself -- the rest goes to that
  // neighbour as its receiverTopGapPx, so the rule between them sits at an
  // equal distance from both. Every other quote (senderHalvedGapPx
  // undefined) keeps applying its full measured value, unchanged.
  const appliedBottomGapPx = senderHalvedGapPx ?? breathingRoom.px;
  const receiverExtraTopGapPx = showTopRule && receiverTopGapPx ? receiverTopGapPx : 0;
  // A rule (this item owns one, or the item below it does -- the
  // senderHalvedGapPx case) needs its own box edge flush with the rule, so
  // its gap stays entirely paddingBlockEnd/paddingBlockStart exactly as
  // before. A PLAIN item with no rule on either side has no such
  // constraint: splitting its own measured breathing room evenly between
  // paddingBlockStart and paddingBlockEnd centers its text within the
  // enlarged cell instead of leaving it pinned to the top with all the
  // extra space stranded below (operator-reported, screenshot evidence).
  // isFirstInColumn is exempt for the same reason a rule-involved item is:
  // there is no neighbour above to balance against (operator ask), so it
  // keeps the original full-bottom-padding behaviour too.
  const isCenteringExempt = Boolean(showTopRule) || senderHalvedGapPx !== undefined || Boolean(isFirstInColumn);
  const plainGapStartPx = !isCenteringExempt && appliedBottomGapPx > 0 ? Math.round(appliedBottomGapPx / 2) : 0;
  const plainGapEndPx = !isCenteringExempt && appliedBottomGapPx > 0 ? appliedBottomGapPx - plainGapStartPx : appliedBottomGapPx;
  return (
    <div
      ref={rootRef}
      data-wall-quote-index={index}
      data-wall-quote-role={item.role}
      data-wall-quote-lines={breathingRoom.lines}
      data-wall-quote-extra-gap={breathingRoom.px}
      data-wall-quote-source={item.entryId}
      data-wall-quote-link={effectiveConfig.linkEnabled ? 'shown' : 'hidden'}
      data-wall-top-rule={showTopRule === undefined ? undefined : item.featuredContent ? config.topRuleEnabled ? 'shown' : 'hidden' : showTopRule && item.role !== 'feature' ? 'shown' : 'hidden'}
      style={{
        ...(plainGapStartPx > 0 ? { paddingBlockStart: plainGapStartPx } : {}),
        ...(plainGapEndPx > 0 ? { paddingBlockEnd: plainGapEndPx } : {}),
      }}
    >
      {item.role === 'feature' ? <FeaturedInjectedQuote
        config={effectiveConfig}
        constrainInlinePadding={Boolean(item.featuredContent)}
        textAppearance={item.entryId === 'the-next-change' ? NEXT_CHANGE_TEXT_APPEARANCE : undefined}
        headingAppearance={partsDesign.heading}
        linkAppearance={partsDesign.link}
        source={{ key: item.key, title: item.title, period: item.period, destination: item.destination, text: item.displayText, ariaLabel: item.ariaLabel }}
        sourceHeadingAs={item.featuredContent ? 'p' : undefined}
        coverFlowGradient={coverFlowGradient}
        cardHeightToWidthRatio={cardHeightToWidthRatio}
        liftPhysics={liftPhysics}
        deferGradientUntilVisible
        topRuleContentGapOverridePx={receiverExtraTopGapPx > 0
          ? TOP_RULE_BASE_CONTENT_GAP_PX + receiverExtraTopGapPx : undefined}
      >{item.featuredContent ? <FeaturedCard introTitle={item.featuredContent.introTitle} introText={item.featuredContent.introText} cta={item.featuredContent.cta} inkColor={resolveEditorialInk(effectiveConfig)} practiceLayout={practiceCardLayout} /> : null}</FeaturedInjectedQuote> : <EditorialQuote
        variant={variant}
        config={effectiveConfig}
        headingAppearance={partsDesign.heading}
        linkAppearance={partsDesign.link}
        source={{ key: item.key, title: item.title, period: item.period, destination: item.destination, text: item.displayText, ariaLabel: item.ariaLabel }}
        coverFlowGradient={coverFlowGradient}
        cardHeightToWidthRatio={cardHeightToWidthRatio}
        liftPhysics={liftPhysics}
        deferGradientUntilVisible
        topRuleContentGapOverridePx={receiverExtraTopGapPx > 0
          ? TOP_RULE_BASE_CONTENT_GAP_PX + receiverExtraTopGapPx : undefined}
      />}
    </div>
  );
}
