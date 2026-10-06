import { useEffect, useMemo, useRef, useState } from 'react'
import SeoHead from '../components/SeoHead'
import { ConfigScopeList, createConfigScopeBinding, useConfigPanelBindings } from '../components/Panel/config'
import { PanelShell, PanelStandardHeaderActions } from '../components/Panel'
import { useAuthoringToolsVisibility } from '../components/Panel/useAuthoringToolsVisibility'
import { usePrefersReducedMotion } from '../helpers/usePrefersReducedMotion'
import { getPostSummaries, type PostSummary } from '../helpers/postContent'
import { getThoughts, type ThoughtSummary } from '../helpers/thoughtContent'
import { buildSiteTitle } from '../helpers/siteMetadata'
import { normalizePageSurfaceConfig } from '../components/PageSurface.config'
import { normalizeTailwindToken } from '../components/Panel/config/tailwindFields'
import { ChronologyTimeline } from '../components/ChronologyTimeline/ChronologyTimeline'
import { normalizeChronologyTimelineConfig, type ChronologyTimelineConfig } from '../components/ChronologyTimeline/ChronologyTimeline.config'
import { useSharedDesignConfig } from '../components/SharedDesignConfigProvider'
import { useAbstractDesignConfig } from '../experiences/abstract/components/AbstractDesignConfigProvider'
import { SiteHeader } from '../experiences/abstract/components/SiteHeader'
import { buildEffectiveSiteHeaderConfig } from '../experiences/abstract/components/SiteHeader/buildEffectiveSiteHeaderConfig'
import { buildSplitAlignedSiteHeaderConfig } from '../experiences/abstract/components/SiteHeader/hooks/buildSplitAlignedSiteHeaderConfig'
import { useNormalizedSiteHeaderConfig } from '../experiences/abstract/components/SiteHeader/hooks/useNormalizedSiteHeaderConfig'
import { JOURNAL_SITE_HEADER_COLOR_OVERRIDE_CONFIG } from '../experiences/abstract/components/SiteHeader/config/colorOverride'
import {
  PolymorphicLayout,
  usePolymorphicLayoutColors,
} from '../experiences/abstract/components/PolymorphicLayout'
import {
  resolvePolymorphicColumnBackgroundReference,
  resolvePolymorphicNarrowColumnTypography,
  resolvePolymorphicWideColumnTypography,
} from '../experiences/abstract/components/PolymorphicLayout.narrowColumnTypography'
import { usePolymorphicColumnAdaptiveInk } from '../experiences/abstract/components/usePolymorphicColumnAdaptiveInk'
import {
  useAbstractDesignConfigBindings,
  ABSTRACT_DESIGN_CONFIG_BINDING_KEYS_BY_PAGE,
} from '../experiences/abstract/hooks/useAbstractDesignConfigBindings'
import { DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG } from '../components/GlobalTypography.config'
import { AboutTimeline, type AboutTimelineRowData } from '../experiences/about/components/AboutTimeline'
import { AboutMobileAccordionItem } from '../experiences/about/components/AboutMobileAccordionItem'
import { resolveEditorialAccordionInk } from '../experiences/about/components/EditorialAccordionItem'
import { normalizeAboutMobileAccordionConfig, type AboutMobileAccordionConfig } from '../experiences/about/components/AboutMobileAccordion.config'
import { normalizePolymorphicLayoutConfig, type PolymorphicLayoutConfig } from '../experiences/abstract/components/PolymorphicLayout.config'
import { applyPolymorphicLayoutAllSizesUpdate } from '../experiences/abstract/components/PolymorphicLayout.allSizes'
import { normalizeCardAppearanceConfig, type CardAppearanceConfig } from '../experiences/abstract/components/Card/config/appearance'
import { ArticleFilter } from '../experiences/journal/components/ArticleFilter/ArticleFilter'
import Chip, { type ChipTintAppearance } from '../components/Chip'
import {
  DEFAULT_JOURNAL_CARD_APPEARANCE_CONFIG,
  DEFAULT_JOURNAL_ACCORDION_ITEM_CONFIG,
  DEFAULT_JOURNAL_INTRO_ACCORDION_ITEM_CONFIG,
  DEFAULT_JOURNAL_NARROW_COLUMN_CONTENT_CONFIG,
  DEFAULT_JOURNAL_TIMELINE_CONFIG,
  DEFAULT_JOURNAL_CHRONOLOGY_CONFIG,
  DEFAULT_JOURNAL_ARTICLE_FILTER_CONFIG,
  DEFAULT_JOURNAL_CHIP_APPEARANCE_CONFIG,
  JOURNAL_POLYMORPHIC_LAYOUT_CONFIG,
  JOURNAL_INTRO_INK_OPACITY_MULTIPLIER,
  normalizeJournalArticleAccordionItemConfig,
  normalizeJournalNarrowColumnContentConfig,
  normalizeJournalTimelineConfig,
  normalizeJournalArticleFilterConfig,
  normalizeJournalChipAppearanceConfig,
  type JournalArticleAccordionItemConfig,
  type JournalChipAppearanceConfig,
  type JournalNarrowColumnContentConfig,
  type JournalArticleFilterConfig,
  type JournalAccordionTextWrap,
  type JournalTimelineConfig,
} from './journal.config'
import {
  JOURNAL_ARTICLE_ACCORDION_ITEM_PANEL,
  JOURNAL_CARD_APPEARANCE_PANEL,
  JOURNAL_INTRO_ACCORDION_ITEM_PANEL,
  JOURNAL_NARROW_COLUMN_CONTENT_PANEL,
  JOURNAL_ARTICLE_FILTER_PANEL,
  JOURNAL_CHIP_APPEARANCE_PANEL,
  JOURNAL_POLYMORPHIC_LAYOUT_PANEL,
  JOURNAL_TIMELINE_PANEL,
  JOURNAL_CHRONOLOGY_PANEL,
} from './journal.panel'

type JournalProps = { posts: PostSummary[]; thoughts: ThoughtSummary[] }
const JOURNAL_TIMELINE_ID = 'journal-article-timeline'
const JOURNAL_INTRO = {
  excerpt: 'Notes on making digital products.',
  // title: 'Explore articles about interface design, software engineering, and leading teams. Expect practical ideas, clear explanations, and reflections on the decisions behind the work.',
  title: '',
}
// Literal per breakpoint prefix, never interpolated (this codebase's
// Tailwind-only styling rule — same discipline TableOfContents.tsx's own
// SUMMARY_HIDDEN_CLASS_BY_PREFIX follows) — `!` forces each of these to win
// over AboutMobileAccordionItem.tsx's own shared, non-important
// `[text-wrap:balance]` regardless of Tailwind's generated-CSS order.
const ACCORDION_TEXT_WRAP_CLASS_BASE: Record<JournalAccordionTextWrap, string> = {
  wrap: '![text-wrap:wrap]',
  nowrap: '![text-wrap:nowrap]',
  balance: '![text-wrap:balance]',
  pretty: '![text-wrap:pretty]',
  stable: '![text-wrap:stable]',
}
const ACCORDION_TEXT_WRAP_CLASS_WIDE: Record<JournalAccordionTextWrap, string> = {
  wrap: 'md:![text-wrap:wrap]',
  nowrap: 'md:![text-wrap:nowrap]',
  balance: 'md:![text-wrap:balance]',
  pretty: 'md:![text-wrap:pretty]',
  stable: 'md:![text-wrap:stable]',
}
const ACCORDION_TEXT_WRAP_CLASS_LG: Record<JournalAccordionTextWrap, string> = {
  wrap: 'lg:![text-wrap:wrap]',
  nowrap: 'lg:![text-wrap:nowrap]',
  balance: 'lg:![text-wrap:balance]',
  pretty: 'lg:![text-wrap:pretty]',
  stable: 'lg:![text-wrap:stable]',
}

export default function JournalPage({ posts }: JournalProps) {
  const {
    pageSurfaceConfig, panelShellConfig, globalTypographyConfig, setGlobalTypographyConfig,
  } = useSharedDesignConfig()
  const { siteHeaderConfig, wordmarkConfig } = useAbstractDesignConfig()
  const { showAuthoringTools, isPanelOpen, togglePanel } = useAuthoringToolsVisibility()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)
  const [layoutConfig, setLayoutConfig] = useState<PolymorphicLayoutConfig>(() => (
    normalizePolymorphicLayoutConfig(JOURNAL_POLYMORPHIC_LAYOUT_CONFIG)
  ))
  const [timelineConfig, setTimelineConfig] = useState<JournalTimelineConfig>(() => (
    normalizeJournalTimelineConfig(DEFAULT_JOURNAL_TIMELINE_CONFIG)
  ))
  const [chronologyConfig, setChronologyConfig] = useState<ChronologyTimelineConfig>(() => (
    normalizeChronologyTimelineConfig(DEFAULT_JOURNAL_CHRONOLOGY_CONFIG)
  ))
  const [cardAppearanceConfig, setCardAppearanceConfig] = useState<CardAppearanceConfig>(() => (
    normalizeCardAppearanceConfig(DEFAULT_JOURNAL_CARD_APPEARANCE_CONFIG)
  ))
  const [introAccordionItemConfig, setIntroAccordionItemConfig] = useState<AboutMobileAccordionConfig>(() => (
    normalizeAboutMobileAccordionConfig(DEFAULT_JOURNAL_INTRO_ACCORDION_ITEM_CONFIG)
  ))
  const [articleAccordionItemConfig, setArticleAccordionItemConfig] = useState<JournalArticleAccordionItemConfig>(() => (
    normalizeJournalArticleAccordionItemConfig(DEFAULT_JOURNAL_ACCORDION_ITEM_CONFIG)
  ))
  const [narrowColumnContentConfig, setNarrowColumnContentConfig] = useState<JournalNarrowColumnContentConfig>(() => (
    normalizeJournalNarrowColumnContentConfig(DEFAULT_JOURNAL_NARROW_COLUMN_CONTENT_CONFIG)
  ))
  const [articleFilterConfig, setArticleFilterConfig] = useState<JournalArticleFilterConfig>(() => (
    normalizeJournalArticleFilterConfig(DEFAULT_JOURNAL_ARTICLE_FILTER_CONFIG)
  ))
  const [chipAppearanceConfig, setChipAppearanceConfig] = useState<JournalChipAppearanceConfig>(() => (
    normalizeJournalChipAppearanceConfig(DEFAULT_JOURNAL_CHIP_APPEARANCE_CONFIG)
  ))
  // Category = each post's first tag. The cap limits available choices;
  // "All" still includes posts from categories beyond the cap.
  const articleFilterCategories = useMemo(() => {
    const unique: string[] = []
    posts.forEach(post => {
      const category = post.tags[0]
      if (category && !unique.includes(category)) unique.push(category)
    })
    return unique.slice(0, articleFilterConfig.maxCategories)
  }, [posts, articleFilterConfig.maxCategories])
  const [selectedArticleCategory, setSelectedArticleCategory] = useState<string | null>(null)
  const activeArticleCategory = selectedArticleCategory && articleFilterCategories.includes(selectedArticleCategory)
    ? selectedArticleCategory : null
  useEffect(() => {
    if (selectedArticleCategory && (!articleFilterConfig.enabled || !activeArticleCategory)) {
      setSelectedArticleCategory(null)
    }
  }, [selectedArticleCategory, activeArticleCategory, articleFilterConfig.enabled])
  const selectArticleCategory = (category: string | null) => {
    const nextCategory = category !== null && category === activeArticleCategory ? null : category
    if (nextCategory === activeArticleCategory) return
    setSelectedArticleCategory(nextCategory)
    setActiveIndex(0)
  }
  const filteredPosts = useMemo(() => {
    if (!articleFilterConfig.enabled || !activeArticleCategory) return posts
    return posts.filter(post => post.tags[0] === activeArticleCategory)
  }, [posts, articleFilterConfig.enabled, activeArticleCategory])
  const timelineRows = useMemo<AboutTimelineRowData[]>(() => filteredPosts.map((post, index) => ({
    caption: post.title,
    appendix: [
      chronologyConfig.enabled ? '' : post.formattedDate ?? post.date,
      post.readingTimeMinutes != null ? `${post.readingTimeMinutes} min read` : '',
    ].filter(Boolean).join(' · '),
    line: post.excerpt,
    slideIndex: index,
    href: post.canonicalPath,
  })), [filteredPosts, chronologyConfig.enabled])
  const surface = normalizePageSurfaceConfig(pageSurfaceConfig)
  const layoutColors = usePolymorphicLayoutColors(layoutConfig, surface.color)
  const tabletChronologyColors = usePolymorphicLayoutColors(layoutConfig, surface.color, undefined, 'md')
  const normalizedSiteHeaderConfig = useNormalizedSiteHeaderConfig(
    siteHeaderConfig,
    JOURNAL_SITE_HEADER_COLOR_OVERRIDE_CONFIG,
  )

  // Bug fix (operator-reported, screenshot evidence: wordmark/nav reading
  // near-invisible and timeline text washed out) — this page's own layout
  // config (JOURNAL_POLYMORPHIC_LAYOUT_CONFIG) is a field-for-field copy of
  // /posts/[slug]'s own scroll-gradient-backed config, so the wide column
  // (the timeline lives there, wideColumnSide: 'right' + narrow hidden)
  // resolves layoutColors.wideColumnColor to the literal string
  // 'transparent' while the gradient is active — feeding that straight into
  // AboutTimeline's own resolveContrastAwareTextColor(columnBackgroundColor,
  // ...) resolves contrast against colord('transparent')'s effective black,
  // producing the flat, washed-out gray reported. Same root cause and same
  // fix pages/posts/[slug].tsx already applies (its own articleColumnColor/
  // articleInkColor chain): resolvePolymorphicColumnBackgroundReference for
  // the real background reference, resolvePolymorphicWideColumnTypography +
  // usePolymorphicColumnAdaptiveInk for a live, scroll-reactive ink that
  // tracks the actual gradient-darkened background instead of a static
  // at-rest color. narrowColumnTypography below drives the header/wordmark
  // ink the same way (posts/[slug]'s own headerInkColor). The narrow-column
  // introduction below and SiteHeader's nav/logo both need that ink against
  // their real physical background at rest/mobile widths.
  const wideColumnBackgroundReference = resolvePolymorphicColumnBackgroundReference(layoutColors, 'wide')
  // The base gradient has a different origin hue from the md/lg gradient.
  // Keep the chronology's derived year/month/rail/dot palette aligned with
  // the tablet/desktop palette on mobile without changing the page surface.
  const chronologyBackgroundReference = layoutColors.breakpointTier === 'mobile'
    ? resolvePolymorphicColumnBackgroundReference(tabletChronologyColors, 'wide')
    : wideColumnBackgroundReference
  const wideColumnTypography = resolvePolymorphicWideColumnTypography(
    layoutColors, globalTypographyConfig,
  )
  const narrowColumnTypography = resolvePolymorphicNarrowColumnTypography(
    layoutColors, globalTypographyConfig,
  )
  // <html>-rooted, not a page-local element — useScrollAdaptiveInk's own
  // progress computation is purely window.scrollY-driven (never relative to
  // the ref element's own position), so writing the live CSS custom
  // property onto <html> reaches every consumer via ordinary inheritance.
  // Same pattern pages/posts/[slug].tsx's own pageInkRootRef uses, for the
  // identical reason (that page's own doc comment on pageInkRootRef has the
  // full mechanism/root-cause writeup).
  const pageInkRootRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    pageInkRootRef.current = document.documentElement
  }, [])
  const timelineInkColorResolved = usePolymorphicColumnAdaptiveInk({
    ref: pageInkRootRef,
    baseColor: wideColumnTypography.titleColor,
    config: layoutConfig,
    colors: layoutColors,
  })
  const timelineInkColor = timelineInkColorResolved ?? wideColumnTypography.titleColor
  const headerInkColorResolved = usePolymorphicColumnAdaptiveInk({
    ref: pageInkRootRef,
    baseColor: narrowColumnTypography.titleColor,
    config: layoutConfig,
    colors: layoutColors,
  })
  const headerInkColor = headerInkColorResolved ?? narrowColumnTypography.titleColor
  const narrowColumnBackgroundReference = resolvePolymorphicColumnBackgroundReference(layoutColors, 'narrow')
  const introInkColor = resolveEditorialAccordionInk(
    introAccordionItemConfig,
    narrowColumnBackgroundReference,
  )
  const chipTintAppearance = useMemo(() => ({
    tint: chipAppearanceConfig.tintColor,
    surfaceColor: narrowColumnBackgroundReference,
    backgroundOpacity: chipAppearanceConfig.backgroundOpacity,
    textOpacity: chipAppearanceConfig.textOpacity,
    contrastSensitivity: chipAppearanceConfig.contrastSensitivity,
    borderOpacity: chipAppearanceConfig.borderOpacity,
    hoverTint: chipAppearanceConfig.hoverTintColor,
    hoverBackgroundOpacity: chipAppearanceConfig.hoverBackgroundOpacity,
    hoverTextOpacity: chipAppearanceConfig.hoverTextOpacity,
    hoverContrastSensitivity: chipAppearanceConfig.hoverContrastSensitivity,
    hoverBorderOpacity: chipAppearanceConfig.hoverBorderOpacity,
    borderWidthClassName: chipAppearanceConfig.borderWidth,
    paddingXClassName: chipAppearanceConfig.paddingX,
    paddingYClassName: chipAppearanceConfig.paddingY,
    textTrackingClassName: chipAppearanceConfig.textTracking,
  }), [chipAppearanceConfig, narrowColumnBackgroundReference])
  const articleTagAppearance = useMemo<ChipTintAppearance>(() => ({
    tint: chipAppearanceConfig.articleTagTintColor,
    surfaceColor: wideColumnBackgroundReference,
    backgroundOpacity: chipAppearanceConfig.articleTagBackgroundOpacity,
    textOpacity: chipAppearanceConfig.articleTagTextOpacity,
    contrastSensitivity: chipAppearanceConfig.articleTagContrastSensitivity,
    borderOpacity: chipAppearanceConfig.articleTagBorderOpacity,
    // The category tag is static. Reuse its own colors for every pointer state.
    hoverTint: chipAppearanceConfig.articleTagTintColor,
    hoverBackgroundOpacity: chipAppearanceConfig.articleTagBackgroundOpacity,
    hoverTextOpacity: chipAppearanceConfig.articleTagTextOpacity,
    hoverContrastSensitivity: chipAppearanceConfig.articleTagContrastSensitivity,
    hoverBorderOpacity: chipAppearanceConfig.articleTagBorderOpacity,
    borderWidthClassName: chipAppearanceConfig.articleTagBorderWidth,
    paddingXClassName: chipAppearanceConfig.articleTagPaddingX,
    paddingYClassName: chipAppearanceConfig.articleTagPaddingY,
    textTrackingClassName: chipAppearanceConfig.articleTagTextTracking,
  }), [chipAppearanceConfig, wideColumnBackgroundReference])
  const articleItemsFollowIntro = timelineConfig.accordionTextStyleSource === 'intro'
  const introTitleOpacity = narrowColumnTypography.highlightOpacity * JOURNAL_INTRO_INK_OPACITY_MULTIPLIER
  const introDescriptionOpacity = narrowColumnTypography.bodyOpacity * JOURNAL_INTRO_INK_OPACITY_MULTIPLIER
  // Same zeroed-transition/no-affordance memo EditorialAccordionItem.tsx's
  // own effectiveConfig applies — bypassed here (AboutMobileAccordionItem
  // used directly) only because that wrapper has no headerFontSizeClassName/
  // contentFontSizeClassName/headerTextStyle/contentTextStyle props to carry
  // the narrow column content panel's independent title/description
  // typography through, the same reason the wide-column article links below
  // already call AboutMobileAccordionItem directly instead of that wrapper.
  const introItemEffectiveConfig = useMemo(() => ({
    ...introAccordionItemConfig,
    transitionMs: 0,
    contentSettleMs: 0,
    openIndicatorEnabled: false,
  }), [introAccordionItemConfig])
  // Bug fix (operator-reported, 2026-10-01, screenshot evidence): the
  // "Article item" panel's "Preview padding (horizontal)" field
  // (affordancePaddingX*) only ever moves the header/title row —
  // AboutMobileAccordion.config.ts's own doc comment on itemContentPaddingLeft/
  // -Right states this split is deliberate ("Expanded item body padding is
  // intentionally independent from its preview-tab padding"), and those two
  // content-padding fields are hidden from every EDITORIAL_ACCORDION_ITEM_FIELDS
  // consumer (EDITORIAL_ACCORDION_ITEM_HIDDEN_KEYS) — so an operator here has
  // no visible way to keep the description aligned with a title indent.
  // journal's article items are always-expanded, static rows (no real
  // collapse/expand interaction), so that preview/content split has no
  // functional purpose here — only the asymmetry it causes. Rather than
  // touch the shared component/panel (used by /about's own Introduction
  // item and Abstract's hero accordion item too), derive this page's own
  // itemContentPaddingLeft/-Right straight from affordancePaddingX* so the
  // one visible horizontal-padding knob moves both rows together, exactly
  // matching that field's own panel description ("Horizontal padding for
  // the heading row and description").
  // Return type widened to `string` (normalizeTailwindToken's own literal
  // union return can't be expressed generically here since `breakpoint` is
  // a runtime union, not a single literal) — callers below assign straight
  // into AboutMobileAccordionConfig's own narrower fields, so the whole
  // memo result is cast there; normalizeTailwindToken already guarantees
  // every value it returns is one of that field's real accepted tokens.
  const derivePaddingXSide = (
    paddingXToken: string,
    side: 'paddingLeft' | 'paddingRight',
    breakpoint: 'base' | 'md' | 'lg',
    fallback: string,
  ): string => {
    const match = paddingXToken.match(/^((?:md:|lg:)?)px-(.+)$/)
    if (!match) return fallback
    const [, prefix, scale] = match
    const sideClass = `${prefix}${side === 'paddingLeft' ? 'pl' : 'pr'}-${scale}`
    return normalizeTailwindToken({
      utility: side as 'paddingLeft', breakpoint: breakpoint as 'base', value: sideClass, fallback: fallback as never,
    })
  }
  const articleItemEffectiveConfig = useMemo(() => ({
    ...articleAccordionItemConfig,
    itemContentPaddingLeft: derivePaddingXSide(
      articleAccordionItemConfig.affordancePaddingX, 'paddingLeft', 'base',
      articleAccordionItemConfig.itemContentPaddingLeft,
    ),
    itemContentPaddingLeftWide: derivePaddingXSide(
      articleAccordionItemConfig.affordancePaddingXWide, 'paddingLeft', 'md',
      articleAccordionItemConfig.itemContentPaddingLeftWide,
    ),
    itemContentPaddingRight: derivePaddingXSide(
      articleAccordionItemConfig.affordancePaddingX, 'paddingRight', 'base',
      articleAccordionItemConfig.itemContentPaddingRight,
    ),
    itemContentPaddingRightWide: derivePaddingXSide(
      articleAccordionItemConfig.affordancePaddingXWide, 'paddingRight', 'md',
      articleAccordionItemConfig.itemContentPaddingRightWide,
    ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see derivePaddingXSide's own doc comment above
  }) as any as JournalArticleAccordionItemConfig, [articleAccordionItemConfig])
  // Same override /posts/[slug].tsx applies at its own SiteHeader call
  // (scrollGradientAdaptiveHeaderConfig) — nav text otherwise falls back to
  // SiteHeader's own default 'column'-mode derivation, which never reads
  // this page's own real, physically-painted narrow-column background.
  const journalHeaderConfig = useMemo(() => ({
    ...buildSplitAlignedSiteHeaderConfig(normalizedSiteHeaderConfig),
    colorMode: 'custom' as const,
    navTextColor: headerInkColor,
  }), [normalizedSiteHeaderConfig, headerInkColor])
  const sharedConfigBindings = useAbstractDesignConfigBindings(
    ABSTRACT_DESIGN_CONFIG_BINDING_KEYS_BY_PAGE.journal,
  )
  const localConfigBindings = useMemo(() => [
    createConfigScopeBinding({ definition: JOURNAL_TIMELINE_PANEL, value: timelineConfig, onChange: setTimelineConfig }),
    createConfigScopeBinding({ definition: JOURNAL_CHRONOLOGY_PANEL, value: chronologyConfig, onChange: setChronologyConfig }),
    createConfigScopeBinding({ definition: JOURNAL_CARD_APPEARANCE_PANEL, value: cardAppearanceConfig, onChange: setCardAppearanceConfig }),
    createConfigScopeBinding({ definition: JOURNAL_INTRO_ACCORDION_ITEM_PANEL, value: introAccordionItemConfig, onChange: setIntroAccordionItemConfig }),
    createConfigScopeBinding({ definition: JOURNAL_ARTICLE_ACCORDION_ITEM_PANEL, value: articleAccordionItemConfig, onChange: setArticleAccordionItemConfig }),
    createConfigScopeBinding({ definition: JOURNAL_NARROW_COLUMN_CONTENT_PANEL, value: narrowColumnContentConfig, onChange: setNarrowColumnContentConfig }),
    createConfigScopeBinding({ definition: JOURNAL_ARTICLE_FILTER_PANEL, value: articleFilterConfig, onChange: setArticleFilterConfig }),
    createConfigScopeBinding({ definition: JOURNAL_CHIP_APPEARANCE_PANEL, value: chipAppearanceConfig, onChange: setChipAppearanceConfig }),
    createConfigScopeBinding({
      definition: JOURNAL_POLYMORPHIC_LAYOUT_PANEL,
      value: layoutConfig,
      onChange: next => setLayoutConfig(previous => applyPolymorphicLayoutAllSizesUpdate(previous, next)),
    }),
  ], [timelineConfig, chronologyConfig, cardAppearanceConfig, introAccordionItemConfig, articleAccordionItemConfig, narrowColumnContentConfig, articleFilterConfig, chipAppearanceConfig, layoutConfig])
  const applicableConfigBindings = useMemo(
    () => [...sharedConfigBindings, ...localConfigBindings],
    [sharedConfigBindings, localConfigBindings],
  )
  const bindings = useConfigPanelBindings(applicableConfigBindings)

  return (
    <>
      <SeoHead
        title={buildSiteTitle('Journal')}
        description="Recent thoughts and articles from Abstract Voyage."
        canonicalPath="/journal"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: posts.map((post, index) => ({ '@type': 'ListItem', position: index + 1, name: post.title, url: post.canonicalPath })),
        }}
      />
      <PolymorphicLayout
        config={layoutConfig}
        pageSurfaceConfig={surface}
        wideColumn={<ChronologyTimeline
          items={filteredPosts}
          config={chronologyConfig}
          backgroundColor={chronologyBackgroundReference}
          prefersReducedMotion={prefersReducedMotion}
          globalTypographyConfig={globalTypographyConfig}
          renderItems={groupPosts => timelineConfig.accordionLinksEnabled ? (
          <ul
            className={`grid w-full grid-cols-1 list-none m-0 p-0 ${timelineConfig.maxWidthClassName} ${timelineConfig.maxWidthWideClassName} ${timelineConfig.maxWidthLgClassName} ${timelineConfig.accordionItemGap}`}
            data-journal-accordion-grid="true"
          >
            {groupPosts.map(post => (
              <li key={post.canonicalPath}>
                <AboutMobileAccordionItem
                  slide={{ excerpt: post.title, title: post.excerpt }}
                  config={articleItemsFollowIntro ? introAccordionItemConfig : articleItemEffectiveConfig}
                  textColor={articleItemsFollowIntro ? introInkColor : timelineInkColor}
                  expanded
                  affordanceVisible={false}
                  dimOpacity={articleItemsFollowIntro ? introDescriptionOpacity : timelineConfig.accordionDescriptionOpacity}
                  emphasisOpacity={articleItemsFollowIntro ? introTitleOpacity : timelineConfig.accordionTitleOpacity}
                  contentEmphasisOpacity={articleItemsFollowIntro ? undefined : timelineConfig.accordionDescriptionOpacity}
                  contentEmphasisColorOverride={timelineConfig.accordionEmphasisColorMode === 'custom' ? timelineConfig.accordionEmphasisCustomColor : undefined}
                  prefersReducedMotion={prefersReducedMotion}
                  headerHref={post.canonicalPath}
                  // headerFontSizeClassName/contentFontSizeClassName/
                  // contentPaddingTopClassName deliberately omitted — letting
                  // them fall through to `config`'s own contentFontSizeClassName*/
                  // itemContentPaddingTop* keeps the live "Article item" panel
                  // (articleAccordionItemConfig) authoritative instead of being
                  // shadowed by a second, dead font-size system here (bug fix,
                  // operator-reported 2026-10-01).
                  // Configurable text-wrap (operator ask, 2026-10-02):
                  // AboutMobileAccordionItem.tsx's own shared
                  // contentTextClassName() helper always appends
                  // `[text-wrap:balance]` to both the header span and the
                  // content paragraph. `!` forces this page's own choice to
                  // win regardless of Tailwind's generated-CSS order —
                  // scoped to these additive props only, not a change to
                  // the shared component itself. Driven by the live
                  // "Article item" panel's own titleTextWrap*/
                  // descriptionTextWrap* fields (articleAccordionItemConfig)
                  // — kept there, not on the Timeline panel's "Article
                  // links" group, since Article item is the one panel
                  // actually bound to these rows.
                  headerTextClassName={`${timelineConfig.accordionTitleFontWeight} ${timelineConfig.accordionTitleFontWeightWide} ${timelineConfig.accordionTitleFontWeightLg} ${ACCORDION_TEXT_WRAP_CLASS_BASE[articleAccordionItemConfig.titleTextWrap]} ${ACCORDION_TEXT_WRAP_CLASS_WIDE[articleAccordionItemConfig.titleTextWrapWide]} ${ACCORDION_TEXT_WRAP_CLASS_LG[articleAccordionItemConfig.titleTextWrapLg]}`}
                  headerSuffix={post.readingTimeMinutes != null && Number.isFinite(post.readingTimeMinutes)
                    ? <span data-article-reading-time="true" className="ml-2 inline-block whitespace-nowrap align-baseline text-xs font-normal tracking-normal opacity-70">
                      ·{'\u00a0\u00a0\u00a0'}{post.readingTimeMinutes} min read
                    </span>
                    : null}
                  headerTextStyle={articleItemsFollowIntro ? undefined : {
                    lineHeight: timelineConfig.accordionTitleLineHeight,
                  }}
                  contentTextStyle={articleItemsFollowIntro
                    ? { marginTop: 0 }
                    : { lineHeight: timelineConfig.accordionDescriptionLineHeight, marginTop: 0 }}
                  contentTextClassName={`${ACCORDION_TEXT_WRAP_CLASS_BASE[articleAccordionItemConfig.descriptionTextWrap]} ${ACCORDION_TEXT_WRAP_CLASS_WIDE[articleAccordionItemConfig.descriptionTextWrapWide]} ${ACCORDION_TEXT_WRAP_CLASS_LG[articleAccordionItemConfig.descriptionTextWrapLg]}`}
                />
                {post.tags[0]?.trim() && <div className="mt-2 mb-2" data-article-category-tag="true">
                  <Chip
                    label={post.tags[0].trim()}
                    active={false}
                    className={`inline-flex max-w-full break-all rounded-full border uppercase ${chipAppearanceConfig.articleTagFontSize}`}
                    tintAppearance={articleTagAppearance}
                  />
                </div>}
              </li>
            ))}
          </ul>
        ) : (
          <AboutTimeline
            rows={groupPosts.map(post => timelineRows[filteredPosts.indexOf(post)])}
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
            accentColor={timelineInkColor}
            columnBackgroundColor={wideColumnBackgroundReference}
            inkColorOverride={timelineInkColor}
            inkOpacityMultiplier={layoutColors.scrollGradientDarkInkOpacityMultiplier}
            config={timelineConfig}
            prefersReducedMotion={prefersReducedMotion}
            panelId={JOURNAL_TIMELINE_ID}
          />
        )}
        />}
        narrowColumn={(
          // Literal, breakpoint-matched Tailwind classes (not JS) per the
          // repo's Tailwind-only visibility convention — same technique
          // TableOfContents.tsx's own SUMMARY_HIDDEN_CLASS_BY_PREFIX uses.
          // Always mounted; each tier's own enabled/enabledWide/enabledLg
          // flag is a pure CSS show/hide, never an unmount, so toggling one
          // tier never causes a layout flash from a remount at another.
          <div
            className={`w-full ${narrowColumnContentConfig.enabled ? 'block' : 'hidden'} ${narrowColumnContentConfig.enabledWide ? 'md:block' : 'md:hidden'} ${narrowColumnContentConfig.enabledLg ? 'lg:block' : 'lg:hidden'}`}
            data-journal-intro="true"
          >
            {/* Do not mount the accordion's header and padded body when the
                introduction paragraph has been cleared. */}
            {Boolean(JOURNAL_INTRO.title.trim()) && <AboutMobileAccordionItem
              slide={{ excerpt: JOURNAL_INTRO.excerpt, title: JOURNAL_INTRO.title }}
              config={introItemEffectiveConfig}
              textColor={introInkColor}
              expanded
              staticHeader
              staticHeadingLevel={2}
              affordanceVisible={false}
              prefersReducedMotion={prefersReducedMotion}
              dimOpacity={introDescriptionOpacity * narrowColumnContentConfig.descriptionOpacity}
              emphasisOpacity={introTitleOpacity * narrowColumnContentConfig.titleOpacity}
              headerClassName={narrowColumnContentConfig.titleEnabled ? undefined : 'hidden'}
              // Bug fix (operator-reported, 2026-10-01): these five props
              // used to be passed unconditionally, which shadowed the
              // "Introduction accordion item" panel's own
              // contentFontSizeClassName* (introItemEffectiveConfig) at
              // every breakpoint — not just mobile — regardless of this
              // panel's own typographySource field. Gating on 'custom'
              // restores that panel's authority by default (the
              // 'introduction' default) and makes this panel's own
              // independent sizing a real, working opt-in instead of an
              // always-on shadow.
              headerFontSizeClassName={narrowColumnContentConfig.typographySource === 'custom'
                ? `${narrowColumnContentConfig.titleFontSize} ${narrowColumnContentConfig.titleFontSizeWide} ${narrowColumnContentConfig.titleFontSizeLg}`
                : undefined}
              contentFontSizeClassName={narrowColumnContentConfig.typographySource === 'custom'
                ? `${narrowColumnContentConfig.descriptionFontSize} ${narrowColumnContentConfig.descriptionFontSizeWide} ${narrowColumnContentConfig.descriptionFontSizeLg}`
                : undefined}
              headerTextClassName={narrowColumnContentConfig.typographySource === 'custom'
                ? `${narrowColumnContentConfig.titleFontWeight} ${narrowColumnContentConfig.titleFontWeightWide} ${narrowColumnContentConfig.titleFontWeightLg}`
                : undefined}
              contentPaddingTopClassName={narrowColumnContentConfig.typographySource === 'custom'
                ? `${narrowColumnContentConfig.descriptionPaddingTop} ${narrowColumnContentConfig.descriptionPaddingTopWide} ${narrowColumnContentConfig.descriptionPaddingTopLg}`
                : undefined}
              headerTextStyle={narrowColumnContentConfig.typographySource === 'custom'
                ? { lineHeight: narrowColumnContentConfig.titleLineHeight }
                : undefined}
              contentTextStyle={narrowColumnContentConfig.typographySource === 'custom'
                ? { lineHeight: narrowColumnContentConfig.descriptionLineHeight, marginTop: 0 }
                : { marginTop: 0 }}
            />}
            {/* Nested inside this same wrapper (not a sibling) so the
                filter shares the narrow column content's own enabled/
                enabledWide/enabledLg visibility exactly — no separate
                breakpoint-visibility knob of its own. */}
            <ArticleFilter
              categories={articleFilterCategories}
              selectedCategory={articleFilterConfig.enabled ? activeArticleCategory : null}
              onSelectCategory={selectArticleCategory}
              config={articleFilterConfig}
              textColor={introInkColor}
              chipTintAppearance={chipTintAppearance}
            />
          </div>
        )}
        header={(slotProps) => (
          <SiteHeader
            {...slotProps}
            config={buildEffectiveSiteHeaderConfig(journalHeaderConfig, layoutConfig)}
            // Same shared, cross-page Wordmark config /about, /abstract, and
            // /posts/[slug] all bind (AbstractDesignConfigProvider) — see
            // this page's own doc comment above (wideColumnBackgroundReference)
            // for the wordmark half of the same bug. colors.wordmarkGradientStops
            // (PolymorphicLayout.tsx's own usePolymorphicLayoutColors) is the
            // real, live gradient-derived stops for the wordmark while the
            // scroll gradient is active; colorMode is forced to 'adaptive'
            // only then (SiteHeader only reads logoStops in that mode) — the
            // exact pattern pages/posts/[slug].tsx and pages/about.tsx both
            // already use. Spread first: this page's own overrides below
            // (physicalLeftColumnColor in particular — slotProps carries its
            // own default) stay authoritative over the generic slot values.
            wordmarkConfig={layoutColors.wordmarkGradientStops
              ? { ...wordmarkConfig, colorMode: 'adaptive' }
              : wordmarkConfig}
            logoStops={layoutColors.wordmarkGradientStops}
            physicalLeftColumnColor={layoutColors.actualLeftSegmentColor}
            pageSurfaceConfig={surface}
          />
        )}
      >
        {showAuthoringTools ? (
          <PanelShell
            title="JOURNAL SETTINGS"
            isOpen={isPanelOpen}
            onToggle={togglePanel}
            config={panelShellConfig}
            headerActions={(
              <PanelStandardHeaderActions
                bindings={bindings}
                onReset={() => {
                  setTimelineConfig(normalizeJournalTimelineConfig(DEFAULT_JOURNAL_TIMELINE_CONFIG))
                  setChronologyConfig(normalizeChronologyTimelineConfig(DEFAULT_JOURNAL_CHRONOLOGY_CONFIG))
                  setCardAppearanceConfig(normalizeCardAppearanceConfig(DEFAULT_JOURNAL_CARD_APPEARANCE_CONFIG))
                  setIntroAccordionItemConfig(normalizeAboutMobileAccordionConfig(DEFAULT_JOURNAL_INTRO_ACCORDION_ITEM_CONFIG))
                  setArticleFilterConfig(normalizeJournalArticleFilterConfig(DEFAULT_JOURNAL_ARTICLE_FILTER_CONFIG))
                  setChipAppearanceConfig(normalizeJournalChipAppearanceConfig(DEFAULT_JOURNAL_CHIP_APPEARANCE_CONFIG))
                  setGlobalTypographyConfig({ ...DEFAULT_GLOBAL_TYPOGRAPHY_CONFIG })
                  setLayoutConfig(normalizePolymorphicLayoutConfig(JOURNAL_POLYMORPHIC_LAYOUT_CONFIG))
                }}
                panelShellConfig={panelShellConfig}
              />
            )}
          >
            <ConfigScopeList bindings={bindings} />
          </PanelShell>
        ) : null}
      </PolymorphicLayout>
    </>
  )
}

export function getStaticProps() {
  return {
    props: {
      posts: getPostSummaries().filter((post) => post.slug !== 'welcome'),
      thoughts: getThoughts().slice(0, 3),
    },
  }
}
