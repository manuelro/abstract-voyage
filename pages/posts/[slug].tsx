import SeoHead from '../../components/SeoHead'
import { SITE_METADATA, buildSiteTitle } from '../../helpers/siteMetadata'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { getAllPostSlugPaths, getPostArticleProps, type PostType } from '../../helpers/postArticle'
import { useMeasuredElementRect } from '../../components/useMeasuredElementRect'
import PostMetaRow from '../../components/PostMetaRow'
import {
  narrowColumnContentBoxProps,
  NarrowColumnContent,
  PolymorphicLayout,
  usePolymorphicLayoutColors,
  wideColumnContentBoxProps,
  WideColumnContent,
} from '../../experiences/abstract/components/PolymorphicLayout'
import {
  DEFAULT_PAGE_SURFACE_CONFIG,
  normalizePageSurfaceConfig,
  type PageSurfaceConfig,
} from '../../components/PageSurface.config'
import { PAGE_SURFACE_APPEARANCE_PANEL } from '../../components/PageSurface.panel'
import { buildSplitAlignedSiteHeaderConfig } from '../../experiences/abstract/components/SiteHeader/hooks/buildSplitAlignedSiteHeaderConfig'
import { SiteHeader } from '../../experiences/abstract/components/SiteHeader'
import { buildEffectiveSiteHeaderConfig } from '../../experiences/abstract/components/SiteHeader/buildEffectiveSiteHeaderConfig'
import {
  normalizeSiteHeaderColorOverrideConfig,
  POSTS_LAB_SITE_HEADER_COLOR_OVERRIDE_CONFIG,
  type SiteHeaderColorOverrideConfig,
} from '../../experiences/abstract/components/SiteHeader/config/colorOverride'
import { POSTS_LAB_SITE_HEADER_COLOR_OVERRIDE_PANEL } from '../../experiences/abstract/components/SiteHeader/config/colorOverride.panel'
import { useNormalizedSiteHeaderConfig } from '../../experiences/abstract/components/SiteHeader/hooks/useNormalizedSiteHeaderConfig'
import {
  DEFAULT_POST_LAB_PAGE_LAYOUT_CONFIG,
  normalizePostLabPageLayoutConfig,
  type PostLabPageLayoutConfig,
} from './postLab.config'
import { POST_LAB_PAGE_LAYOUT_SCOPE_ID } from './postLab.panel'
import {
  DEFAULT_POST_LAB_ARTICLE_CONFIG,
  normalizePostLabArticleConfig,
  type MarkdownContentConfig,
} from '../../experiences/abstract/components/MarkdownContent/config/registered'
import { POST_LAB_ARTICLE_READING_SCOPE_ID } from '../../experiences/abstract/components/MarkdownContent/config/panel'
import {
  DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG,
  normalizePostLabArticleTocConfig,
  resolvePostLabTocActiveTrackingOffsetPx,
  resolvePostLabTocStickyGapPx,
  type TableOfContentsConfig,
} from '../../experiences/abstract/components/TableOfContents/config/registered'
import { POST_LAB_ARTICLE_TOC_SCOPE_ID } from '../../experiences/abstract/components/TableOfContents/config/panel'
import styles from './postLabArticle.module.css'
import {
  createConfigScopeBinding,
  resolveConfigPanelSurfaceColor,
} from '../../components/Panel/config'
import { useAuthoringToolsVisibility } from '../../components/Panel/useAuthoringToolsVisibility'
import { useAbstractDesignConfig } from '../../experiences/abstract/components/AbstractDesignConfigProvider'
import {
  ABSTRACT_DESIGN_CONFIG_BINDING_KEYS_BY_PAGE,
  useAbstractDesignConfigBindings,
} from '../../experiences/abstract/hooks/useAbstractDesignConfigBindings'
import { PostsLabConfigPanel } from '../../experiences/postsLab/PostsLabConfigPanel'
import { postsLabConfigPanelRegistry } from '../../experiences/postsLab/configPanels'
import {
  resolvePostLabArticlePresentation,
  resolvePostLabTocPresentation,
} from '../../experiences/abstract/helpers/readingPresentation'
import { TableOfContentsDisclosure } from '../../experiences/abstract/components/TableOfContents'
import MarkdownContent from '../../experiences/abstract/components/MarkdownContent'
import { firstSplitTierPrefix } from '../../experiences/abstract/components/SplitColumnLayout'

// Article reading view foundations (PLAN: article reading view) — a
// dev-only sandbox for redesigning the reading experience through the same
// SplitColumnLayout/SplitColumnPageShell shell /about, /contact, and
// /abstract already use, instead of the production route's SynthLayout/
// ArticleLayout. Reuses pages/posts/[slug].tsx's own data pipeline
// (helpers/postArticle.ts) verbatim — this route only differs in how it
// renders that same props shape, and touching it can never affect the
// production /posts/[slug] route.

export default function PostLab({
  slug,
  frontmatter,
  content,
  formattedDate,
  readingTimeMinutes,
  headings,
  figures,
  codeBlocks,
  tables,
}: PostType) {
  const { title, excerpt, primaryTopic, tags, source } = frontmatter
  const topic = primaryTopic ?? tags?.[0] ?? null
  const hasBody = content.trim().length > 0

  // pageSurfaceConfig: page-local state, deliberately not
  // useSharedDesignConfig() — this page's own decoupled background, and
  // (unlike siteHeaderConfig below) pageSurfaceConfig has no per-page
  // override escape hatch anywhere in this codebase, so there is no way to
  // both consume the shared value and keep this page's own color
  // independent — full page-local ownership is the only option that
  // preserves that independence.
  const [pageSurfaceConfig, setPageSurfaceConfig] =
    useState<PageSurfaceConfig>(() => normalizePageSurfaceConfig(DEFAULT_PAGE_SURFACE_CONFIG))
  // siteHeaderConfig: SiteHeaderConfig is Category 2 (schema shared,
  // value genuinely global — AGENTS.md's "Determining whether a scope's
  // value is genuinely global") — one live object in
  // SharedDesignConfigProvider, identical across /about, /contact, /abstract
  // by construction. This page previously re-declared the whole config as
  // page-local useState, which is how its logo width, nav gap, and every
  // other structural field silently diverged from /abstract's real live
  // values without anyone changing them on purpose. Consuming the real
  // shared value here — plus the existing per-page color-override escape
  // hatch below for the one dimension (color) that's supposed to diverge —
  // is what pages/abstract.tsx itself does (pages/abstract.tsx:1595-1611,
  // 1820-1826).
  const { siteHeaderConfig, wordmarkConfig } = useAbstractDesignConfig()
  // Page-owned per-page color override (per-page config ownership pattern —
  // SiteHeaderColorOverride.config.ts's own doc comment) — the one
  // part of the header that's genuinely meant to diverge per page.
  // enabled: true with colorMode: 'column' here (see
  // POSTS_LAB_SITE_HEADER_COLOR_OVERRIDE_CONFIG's own doc comment) mirrors
  // /abstract's own override exactly.
  const [siteHeaderColorOverride, setSiteHeaderColorOverride] =
    useState<SiteHeaderColorOverrideConfig>(() => (
      normalizeSiteHeaderColorOverrideConfig(POSTS_LAB_SITE_HEADER_COLOR_OVERRIDE_CONFIG)
    ))
  const [postLabLayoutConfig, setPostLabLayoutConfig] =
    useState<PostLabPageLayoutConfig>(() => (
      normalizePostLabPageLayoutConfig(DEFAULT_POST_LAB_PAGE_LAYOUT_CONFIG)
    ))
  const [articleConfig, setArticleConfig] =
    useState<MarkdownContentConfig>(() => normalizePostLabArticleConfig(DEFAULT_POST_LAB_ARTICLE_CONFIG))
  const [articleTocConfig, setArticleTocConfig] =
    useState<TableOfContentsConfig>(() => normalizePostLabArticleTocConfig(DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG))

  // Live-measured fixed header height — same pattern pages/abstract.tsx's
  // own splitColumnHeaderWrapperRef/splitColumnHeaderHeightPx uses (that
  // measurement is SplitColumnPageShell-internal, not exposed as a value,
  // only as an opt-in headerWrapperRef passthrough — every page that needs
  // the number takes its own copy). Needed so the narrow column's sticky
  // TOC wrapper (narrowColumn below) sticks *below* the fixed header rather
  // than at a guessed constant offset that could put it partially behind
  // the header — the header's real rendered height is the only correct
  // value here, and it isn't a Tailwind-expressible constant.
  // Sourced from useMeasuredElementRect (PLAN-DEDUPLICATE-PAGE-SHELL-LOGIC.md
  // §1) — was a page-local hand-rolled ResizeObserver+resize effect before
  // that hook existed.
  const { ref: splitColumnHeaderWrapperRef, rect: splitColumnHeaderWrapperRect } =
    useMeasuredElementRect<HTMLDivElement>()
  const splitColumnHeaderHeightPx = splitColumnHeaderWrapperRect?.height

  // colors: every breakpoint-tiered column/split-band color computation
  // this page used to hand-roll (resolveColorTier, physicalLeft/RightColumnColor,
  // resolvedSplitBandLeft/RightColor) now lives once inside
  // usePolymorphicLayoutColors (components/PolymorphicLayout.tsx) — see
  // PLAN-SPLIT-COLUMN-LAYOUT-ENRICHMENT-EXTRACTION.md's own correction.
  // colorSource is 'custom' here (postLabLayoutConfig's own default), so
  // paletteColorResolver is never needed on this page.
  const colors = usePolymorphicLayoutColors(postLabLayoutConfig, pageSurfaceConfig.color)

  // Merges the shared siteHeaderConfig with this page's own color override —
  // the exact same call pages/abstract.tsx makes at its own
  // normalizedSiteHeaderConfig computation (pages/abstract.tsx:1820-1826).
  // override.enabled ? shared-with-colors-replaced : shared verbatim.
  const normalizedSiteHeaderConfig = useNormalizedSiteHeaderConfig(siteHeaderConfig, siteHeaderColorOverride)

  // Same override abstract.tsx applies at its own PolymorphicLayout call
  // site, layered on here (not baked into siteHeaderConfig's own state) so
  // panel edits to that state are never clobbered by it. The header's own
  // segment/content-box alignment, width, and inner-alignment classes
  // (headerContentLayoutOwnedByPage + the four joined className fields) are
  // no longer built here — <PolymorphicLayout> builds them internally from
  // postLabLayoutConfig itself (see PLAN-SPLIT-COLUMN-LAYOUT-ENRICHMENT-
  // EXTRACTION.md's own correction). This page only keeps the handful of
  // SiteHeaderConfig fields that have no PolymorphicLayoutConfig
  // equivalent at all.
  // navContentGapPx (set inside buildSplitAlignedSiteHeaderConfig) is still
  // legitimately used for the *right* side's own separator-to-first-nav-item
  // gap, a different, unrelated spacing concern this page hasn't taken over.
  // The left side's own legacy inline padding-right (logoContentGapPaddingEnabled)
  // is now unconditionally disabled by <PolymorphicLayout> itself for every
  // consumer — see its own top-level doc comment — not something this page
  // needs to set anymore.
  const pageSiteHeaderConfig = buildSplitAlignedSiteHeaderConfig(
    normalizedSiteHeaderConfig, { navAlignedToPageContainer: false },
  )

  // Sticky offset for narrowColumn's TOC wrapper below. While the header is
  // fixed/sticky (headerScrollBehavior !== 'static'), this is the real
  // measured header height (0 until the first measurement lands, same
  // graceful degrade SplitColumnPageShell's own internal copy of this
  // pattern uses) plus the operator-selected Tailwind spacing token. Once
  // static, the header no longer reserves any persistent space once
  // scrolled past — reserving its live height here would leave a dead gap
  // above the sticky TOC — so this collapses to just the breathing gap.
  const headerReservePx = postLabLayoutConfig.headerScrollBehavior === 'static'
    ? 0
    : (splitColumnHeaderHeightPx ?? 0)
  const narrowColumnStickyTopPx = headerReservePx + resolvePostLabTocStickyGapPx(articleTocConfig)
  // Deliberately undefined (not a 0-defaulted number) while
  // splitColumnHeaderHeightPx is still unmeasured *and* the header actually
  // reserves space (fixed/sticky) — TableOfContents' own active-section
  // tracking treats undefined as "not ready, don't compute yet" rather than
  // silently running its one-shot initial computation against a too-small
  // placeholder and getting permanently stuck on the wrong heading
  // (confirmed root cause of the #testing-the-integration /
  // #implementation-plan mis-highlight bug — see that component's own doc
  // comment on currentSectionLinePx for the full mechanism). Unlike
  // narrowColumnStickyTopPx above, this has no equivalent reason to
  // gracefully degrade to 0 while fixed/sticky: a wrong sticky offset just
  // looks slightly off for a moment, but a wrong tracking offset picks the
  // wrong heading and never self-corrects. Once static, though, 0 isn't a
  // guess — there's genuinely nothing reserved, so the value is known
  // immediately without waiting on any measurement.
  const tocCurrentSectionLinePx = postLabLayoutConfig.headerScrollBehavior === 'static'
    ? resolvePostLabTocActiveTrackingOffsetPx(articleTocConfig)
    : splitColumnHeaderHeightPx === undefined
      ? undefined
      : splitColumnHeaderHeightPx + resolvePostLabTocActiveTrackingOffsetPx(articleTocConfig)
  // Which breakpoint prefix the body grid itself actually leaves its
  // stacked state at (components/SplitColumnLayout.tsx's own
  // firstSplitTierPrefix) — the ToC's own disclosure toggle (see
  // TableOfContentsDisclosure below) hides at exactly this width, so it
  // never disagrees with when the columns visually stop stacking.
  const tocSplitBreakpointPrefix = firstSplitTierPrefix(
    postLabLayoutConfig.narrowColumnWidthTierMd,
    postLabLayoutConfig.narrowColumnWidthTierLg,
  )
  // narrowColumnClassName below only needs a forced full-viewport minimum
  // height so the sticky ToC wrapper (narrowColumnStickyTopPx) has real
  // room to follow the viewport once the columns are genuinely side by
  // side — literal per prefix, never interpolated (this codebase's
  // Tailwind-only styling rule), and gated to tocSplitBreakpointPrefix so
  // it stops applying while the layout is stacked. Applied unconditionally
  // (as it was before narrowColumnWidthTierMd/Lg made a real stacked tier
  // possible), it forced the narrow column's own stacked-tier grid row to a
  // full 100dvh regardless of its now much shorter collapsed-disclosure
  // content — silently pushing the wide column's own <h1> a full viewport
  // height down the page, a real, confirmed regression this fixes.
  const narrowColumnMinHeightClassName = tocSplitBreakpointPrefix
    ? { md: 'md:min-h-[100dvh]', lg: 'lg:min-h-[100dvh]' }[tocSplitBreakpointPrefix]
    : ''
  // Same fix, for the inner sticky ToC wrapper below (narrowColumnStickyTopPx's
  // own doc comment) — that div's forced minHeight is a *measured pixel*
  // value (not a static token), so it can't be a plain literal Tailwind
  // class the way the outer grid cell's fix above is. Instead the measured
  // value is always written to a CSS custom property (harmless on its own —
  // nothing reads it below the split tier), and only a literal,
  // breakpoint-gated arbitrary-property utility class (never interpolated)
  // actually applies it as min-height, via the same tocSplitBreakpointPrefix
  // lookup as narrowColumnMinHeightClassName above.
  const narrowColumnStickyMinHeightClassName = tocSplitBreakpointPrefix
    ? {
      md: 'md:[min-height:var(--narrow-col-sticky-min-h)]',
      lg: 'lg:[min-height:var(--narrow-col-sticky-min-h)]',
    }[tocSplitBreakpointPrefix]
    : ''

  const articlePresentation = useMemo(() => resolvePostLabArticlePresentation({
    config: articleConfig,
    columnColor: colors.wideColumnColor,
    surfaceColor: pageSurfaceConfig.color,
  }), [articleConfig, pageSurfaceConfig.color, colors.wideColumnColor])
  const tocPresentation = useMemo(() => resolvePostLabTocPresentation({
    config: articleTocConfig,
    columnColor: colors.narrowColumnColor,
    surfaceColor: pageSurfaceConfig.color,
  }), [articleTocConfig, pageSurfaceConfig.color, colors.narrowColumnColor])
  const articleStyle = useMemo(() => ({
    '--article-metadata-tracking': `${articleConfig.metadataLetterSpacingEm}em`,
    '--article-body-ink': articlePresentation.bodyInk,
    '--article-heading-ink': articlePresentation.headingInk,
    '--article-muted-ink': articlePresentation.mutedInk,
    '--article-metadata-ink': articlePresentation.metadataInk,
    '--article-link-ink': articlePresentation.linkInk,
    '--article-divider': articlePresentation.dividerInk,
  }) as CSSProperties, [articleConfig, articlePresentation])

  const { showAuthoringTools, isPanelOpen, setIsPanelOpen, togglePanel } = useAuthoringToolsVisibility()

  // pageSurfaceConfig stays page-local (no `global` flag — see its own doc
  // comment above). siteHeaderConfig is now the real shared scope — `global:
  // true` renders the panel's light-blue "editing this affects every page"
  // indicator, exactly like pages/abstract.tsx's own binding
  // (pages/abstract.tsx:2139-2142) — editing it here now genuinely does
  // affect /about, /contact, and /abstract too, which is the correct,
  // intended behavior for a Category 2 scope. The color-only divergence
  // this page still wants goes through the new page-owned
  // POSTS_LAB_SITE_HEADER_COLOR_OVERRIDE_PANEL binding below instead (no
  // `global` flag — same shape as ABSTRACT_SITE_HEADER_COLOR_OVERRIDE_PANEL
  // on pages/abstract.tsx). postLabLayoutConfig's own panel binding below
  // now also covers what used to be a separate POSTS_LAB_SPLIT_COLUMN_
  // LAYOUT_PANEL binding — see PostLabPageLayoutConfig's own doc comment in
  // postLab.config.ts for the unification.
  const sharedConfigBindings = useAbstractDesignConfigBindings(
    ABSTRACT_DESIGN_CONFIG_BINDING_KEYS_BY_PAGE.postsLab,
  )
  const localConfigBindings = useMemo(() => [
    createConfigScopeBinding({
      definition: PAGE_SURFACE_APPEARANCE_PANEL,
      value: pageSurfaceConfig,
      onChange: setPageSurfaceConfig,
      title: 'Page surface (posts-lab)',
    }),
    createConfigScopeBinding({
      definition: POSTS_LAB_SITE_HEADER_COLOR_OVERRIDE_PANEL,
      value: siteHeaderColorOverride,
      onChange: setSiteHeaderColorOverride,
    }),
    createConfigScopeBinding({
      definition: postsLabConfigPanelRegistry.resolve(POST_LAB_PAGE_LAYOUT_SCOPE_ID),
      value: postLabLayoutConfig,
      onChange: setPostLabLayoutConfig,
    }),
    createConfigScopeBinding({
      definition: postsLabConfigPanelRegistry.resolve(POST_LAB_ARTICLE_READING_SCOPE_ID),
      value: articleConfig,
      onChange: setArticleConfig,
    }),
    createConfigScopeBinding({
      definition: postsLabConfigPanelRegistry.resolve(POST_LAB_ARTICLE_TOC_SCOPE_ID),
      value: articleTocConfig,
      onChange: setArticleTocConfig,
    }),
  ], [
    pageSurfaceConfig,
    siteHeaderColorOverride,
    postLabLayoutConfig,
    articleConfig,
    articleTocConfig,
  ])
  const configBindings = useMemo(
    () => [...sharedConfigBindings, ...localConfigBindings],
    [sharedConfigBindings, localConfigBindings],
  )

  return (
    // LayoutDebugHighlightProvider now mounts once in pages/_app.tsx
    // (PLAN-DEDUPLICATE-PAGE-SHELL-LOGIC.md §6) — was independently
    // mounted per-page before; see that stage's own doc comment in
    // _app.tsx for the full reasoning. Every LayoutDebugOverlay instance
    // below (via SplitColumnPageShell/SiteHeader) and
    // PostsLabConfigPanel itself still share the same context — now
    // app-wide, not just page-wide.
    <>
      <SeoHead
        title={buildSiteTitle(`${title} (reading view sandbox)`)}
        description={excerpt ?? SITE_METADATA.defaultDescription}
        robots="noindex,nofollow"
        canonicalPath={null}
        ogType="article"
      />
      <PolymorphicLayout
        config={postLabLayoutConfig}
        pageSurfaceConfig={pageSurfaceConfig}
        headerWrapperRef={splitColumnHeaderWrapperRef}
        // PLAN-POLYMORPHIC-LAYOUT-DECOUPLING.md §5 — this page constructs
        // its own <SiteHeader> instead of handing PolymorphicLayout
        // a siteHeaderConfig/logoStops/splitBand*/etc. bundle to render
        // automatically. Unlike /contact and /about, this page never
        // overrode splitBandActive/splitBandLeftColor/splitBandRightColor
        // at all — colorSource is 'custom' on this page's config, and
        // every one of those values came entirely from PolymorphicLayout's
        // own internal usePolymorphicLayoutColors()/normalizedConfig
        // resolution (the 'stacked' band-color collapse included). This
        // page already calls that same exported hook itself (`colors`
        // above, for wideColumnColor/narrowColumnColor/etc.) — reused here
        // rather than a second, independently-computed copy — plus
        // postLabLayoutConfig.headerSplitBandEnabled directly for the one
        // piece `colors` doesn't carry, replicating PolymorphicLayout's own
        // former `splitBandActive ?? normalizedConfig.headerSplitBandEnabled`
        // merge exactly. slotProps (HeaderSlotProps) carries the values
        // only PolymorphicLayout's own internal machinery can compute;
        // spread last so nothing here can silently shadow them.
        header={(slotProps) => (
          <SiteHeader
            config={buildEffectiveSiteHeaderConfig(pageSiteHeaderConfig, postLabLayoutConfig)}
            // The same shared, cross-page Wordmark config /about, /abstract,
            // and /contact already bind (AbstractDesignConfigProvider) —
            // this page previously rendered its logo via SiteHeader.tsx's
            // legacy shim, driven by POSTS_LAB_SITE_HEADER_COLOR_OVERRIDE_CONFIG
            // (its own independent colorMode: 'column'/columnTextMinContrast: 4.5
            // copy, no intro-animation config, no shared panel). Passing
            // this prop switches the logo to the single centralized
            // instance instead, for genuine parity — not just similar
            // resting values.
            wordmarkConfig={wordmarkConfig}
            physicalLeftColumnColor={colors.actualLeftSegmentColor}
            pageSurfaceConfig={pageSurfaceConfig}
            splitBandActive={postLabLayoutConfig.headerSplitBandEnabled}
            splitBandLeftColor={colors.resolvedSplitBandLeftColor}
            splitBandRightColor={colors.resolvedSplitBandRightColor}
            splitBandStacked={colors.splitBandStacked}
            {...slotProps}
          />
        )}
        // wideColumnStyle/narrowColumnStyle, bodyGutterClassName,
        // contentContainer, and headerPositionMode are all left to
        // <PolymorphicLayout>'s own internal defaults, unaffected by the
        // header render-prop above — every one of them resolves from
        // postLabLayoutConfig the exact same way this page used to compute
        // them by hand. No paletteColorResolver: this page never uses
        // colorSource: 'palette'.
        //
        // wideColumnContentContainer/narrowColumnContentContainer are both
        // 'full-bleed' in this page's own config (see
        // PolymorphicLayout.config.ts's own doc comment on those two
        // defaults) — <PolymorphicLayout> renders wideColumn/narrowColumn
        // below exactly as given, no extra wrapper div, so this page's own
        // inner content-container divs (articleConfig.contentMaxWidth +
        // CONTENT_ALIGN_MARGIN_CLASS_WIDE combined on the same div for the
        // wide column; the sticky TOC wrapper staying the outer box for the
        // narrow column) stay unchanged below — extracting them into the
        // shared wrapper would have put the alignment-margin math on the
        // wrong box relative to this page's own width/sticky mechanics.
        //
        // <PolymorphicLayout>'s own unconditional autoAlignNavSplit (see its
        // top-level doc comment) runs useSplitColumnNavAlignment internally
        // (inside SplitColumnPageShell, unchanged) and supplies
        // navSplitBoundaryPx/measuredWideColumnBoundaryPx/edgeBackdropSeamPx
        // itself — this page has no other downstream use of those raw
        // values, so it doesn't need to call the hook directly. This also
        // means the shell attaches its own ref straight to the narrow
        // column's outer cell (postLabLayoutConfig.wideColumnSide is
        // 'right' here, so narrow is the physically-first/left column) —
        // narrowColumnClassName below must never carry horizontal padding
        // as a result (see useSplitColumnNavAlignment's own doc comment on
        // why); visual inset for the ToC lives on an inner wrapper instead.
        edgeBackdropEnabled
        // Below-md TOC-to-nav alignment (PLAN-DEDUPLICATE-PAGE-SHELL-LOGIC.md
        // §7) — this page used to hand-roll this via its own primaryNavElRef/
        // stickyTocRef measurement effect; verified equivalent (Stage 7) and
        // replaced with the shared mechanism (components/PolymorphicLayout.tsx,
        // useSplitColumnNavAlignment.ts's own mobileNavAlignBasePx, which was
        // ported from this exact page's original implementation).
        mobileNavAlignEnabled
        // 'flex flex-col' here (page-owned, prepended before
        // <PolymorphicLayout>'s own config-driven padding/margin/
        // wideColumnContentVerticalAlign classes) is what lets that
        // vertical-align field's 'justify-*' value position the wide
        // column's own content container vertically — see
        // buildWideColumnClassName's own doc comment in
        // components/PolymorphicLayout.tsx. Deliberately never 'items-*'
        // here — see CONTENT_ALIGN_MARGIN_CLASS_WIDE's own doc comment for
        // the regression that mechanism caused elsewhere in this codebase.
        //
        // The narrow column does NOT get the same treatment — its own box
        // is CSS Grid row-stretched to match the wide column's real content
        // height (i.e. the whole article's height, easily 8000px+), not the
        // viewport, so justify-content at this level would center the
        // sticky ToC somewhere in the middle of the *document* rather than
        // the middle of the *screen* (confirmed by measuring: it landed
        // ~4000px down the page). narrowColumnContentVerticalAlign is
        // instead applied one level down, on the sticky wrapper itself (see
        // narrowColumn JSX below), scoped to the actual visible viewport
        // slice below the header — narrowColumnMinHeightClassName below is
        // this page's own remaining "own chrome" class for the outer grid
        // cell (a forced full-viewport minimum height so that sticky
        // wrapper has real room to follow the viewport).
        wideColumnClassName="min-h-[100dvh] flex flex-col"
        narrowColumnClassName={narrowColumnMinHeightClassName}
        wideColumn={(
          <article className={styles.article} style={articleStyle}>
            {/* WideColumnContent (components/PolymorphicLayout.tsx) is the
                real, shared content-container primitive. Spreads
                wideColumnContentBoxProps(postLabLayoutConfig) — the same
                complete, every-tier field mapping the coordinator's own
                'bounded' default path uses internally — rather than
                hand-picking individual fields, so no tier of this page's
                own already-live "Polymorphic Layout" panel controls can go
                silently dead the way narrowColumnContentAlignLg/
                narrowColumnContentWidthLg previously did below. Only width
                is overridden after the spread: articleConfig.contentMaxWidth
                (this page's own separately panel-owned prose-measure field)
                composes with, not replaces, the spread's own widthWide/
                widthLg (per that field's own doc comment in
                PolymorphicLayout.config.ts). minHeight (from the spread)
                gives wideColumnContentVerticalAlign (set on the column
                itself, see wideColumnClassName above) real slack to
                distribute when the article body is short. */}
            <WideColumnContent
              {...wideColumnContentBoxProps(postLabLayoutConfig)}
              width={articleConfig.contentMaxWidth}
              debugLabel="READING COLUMN"
            >
            <PostMetaRow
              topic={topic}
              date={formattedDate}
              readingTime={readingTimeMinutes ? `${readingTimeMinutes} min read` : null}
              className={[
                styles.metadata,
                articleConfig.metadataFontSize,
                articleConfig.metadataUppercase ? 'uppercase' : 'normal-case',
              ].join(' ')}
              topicClassName=""
              dotClassName=""
              topicDateSeparatorClassName=""
              readingTimeSeparatorClassName=""
              topicDateSeparatorStyle={{ marginInline: '0.25em' }}
              readingTimeSeparatorStyle={{ marginInline: '0.25em' }}
            />
            <h1
              className={[
                styles.title,
                articleConfig.metadataTitleMarginTop,
                articleConfig.titleMaxWidth,
                articleConfig.titleFontSize,
                articleConfig.titleFontSizeDesktop,
                articleConfig.titleFontWeight,
                articleConfig.titleLeading,
                articleConfig.titleFontFamily === 'inherit' ? '' : articleConfig.titleFontFamily,
                articleConfig.titleAllCaps ? 'uppercase tracking-wider' : 'normal-case tracking-normal',
              ].join(' ')}
            >{title}</h1>
            {excerpt && articleConfig.excerptVisible ? (
              <p
                className={[
                  styles.excerpt,
                  articleConfig.excerptMarginTop,
                  articleConfig.excerptFontSize,
                  articleConfig.excerptFontSizeDesktop,
                  articleConfig.excerptLeading,
                  articleConfig.excerptFontFamily === 'inherit' ? '' : articleConfig.excerptFontFamily,
                ].join(' ')}
              >{excerpt}</p>
            ) : null}
            {/* .article-content (styles/globals.css) is styled for the
                production /posts/[slug] route's dark SynthLayout background —
                a shared @layer base class, not something this page should
                edit (would also re-theme the production route). This page's
                wide column is a light custom color instead (see
                POSTS_LAB_SPLIT_COLUMN_LAYOUT_CONFIG's own doc comment), so
                its prose needs dark text — these are real, literal Tailwind
                utility classes (not runtime-interpolated), which the
                @tailwind utilities layer always outranks @layer base on
                regardless of selector order, so they safely override
                .article-content's own light-on-dark colors for this page
                only. */}
            <div
              className={[
                'article-content',
                styles.articleContent,
                articleConfig.mastheadToProseMarginTop,
                articleConfig.bodyFontSize,
                articleConfig.bodyFontSizeDesktop,
                articleConfig.bodyLeading,
                articleConfig.bodyTracking,
                articleConfig.bodyFontFamily === 'inherit' ? '' : articleConfig.bodyFontFamily,
              ].join(' ')}
            >
              {hasBody ? (
                <MarkdownContent
                  content={content}
                  figures={figures}
                  codeBlocks={codeBlocks}
                  tables={tables ?? {}}
                  articlePresentation={articlePresentation}
                  articleConfig={articleConfig}
                  scrollMarginTopPx={tocCurrentSectionLinePx}
                />
              ) : (
                <div className={styles.migrationNotice}>
                  This article is being migrated. Read the original on{' '}
                  {source?.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4 decoration-slate-500/60 hover:text-slate-950"
                    >
                      Medium
                    </a>
                  ) : (
                    'Medium'
                  )}
                  .
                </div>
              )}
            </div>
            </WideColumnContent>
          </article>
        )}
        narrowColumn={(
          // sticky, offset by the real measured fixed-header height (plus a
          // small 16px breathing gap) — not a guessed constant like
          // production ArticleLayout.tsx's own `sticky top-10`, which is
          // calibrated for that page's own (shorter) Header component and
          // would stick this TOC partially *behind* SiteHeader here
          // (confirmed while verifying: with a flat top-10, scrolling deep
          // into the article slid the TOC list under the fixed header).
          // splitColumnHeaderHeightPx is this page's own live measurement
          // (see its own doc comment above), same pattern pages/abstract.tsx
          // already uses for the identical problem.
          //
          // Below-md TOC-to-nav paddingLeft used to be computed by this
          // page's own measurement effect and set inline here; that duplicate
          // was removed (PLAN-DEDUPLICATE-PAGE-SHELL-LOGIC.md §7) in favor of
          // <PolymorphicLayout>'s own mobileNavAlignEnabled prop above, which
          // applies the equivalent padding one level up on the narrow
          // column's outer grid cell (verified identical, since this sticky
          // div is that cell's only content). narrowColumnContentPaddingRight
          // (right-only, mobile): breathing room decoupled from the left
          // side's now-computed inset — no mobile-left field exists (see
          // narrowColumnContentPaddingLeftWide's own doc comment in
          // postLab.config.ts for why mobile can't share this field).
          <div
            // flex flex-col + justify-* here (not on the outer narrow
            // column — see wideColumnClassName/narrowColumnClassName's own
            // doc comment above) is what lets
            // narrowColumnContentVerticalAlign position the TOC content
            // container within the actual visible viewport slice, not the
            // document-height column. minHeight below (100dvh minus the
            // same header offset 'top' already reserves) is what gives that
            // flex container real room to distribute — without it, the
            // flex container is exactly as tall as its own content and
            // justify-content has no slack to work with. Both are
            // inline-styled, not Tailwind classes, since narrowColumnStickyTopPx
            // is a live measurement (the fixed header's real height), the
            // same reason `top` below already is. Padding-top lives here
            // (not on the outer narrow column) so it never interacts with
            // that live measurement, matching where padding-left/right
            // already sit.
            className={[
              'sticky w-full flex flex-col',
              postLabLayoutConfig.narrowColumnContentPaddingTop,
              postLabLayoutConfig.narrowColumnContentPaddingTopWide,
              postLabLayoutConfig.narrowColumnContentPaddingTopLg,
              postLabLayoutConfig.narrowColumnContentPaddingRight,
              postLabLayoutConfig.narrowColumnContentPaddingRightWide,
              postLabLayoutConfig.narrowColumnContentPaddingRightLg,
              postLabLayoutConfig.narrowColumnContentPaddingLeftWide,
              postLabLayoutConfig.narrowColumnContentPaddingLeftLg,
              postLabLayoutConfig.narrowColumnContentVerticalAlign,
              narrowColumnStickyMinHeightClassName,
            ].join(' ')}
            style={{
              top: narrowColumnStickyTopPx,
              '--narrow-col-sticky-min-h': `calc(100dvh - ${narrowColumnStickyTopPx}px)`,
            } as CSSProperties}
          >
            {/* NarrowColumnContent (components/PolymorphicLayout.tsx) is the
                real, shared content-container primitive. Spreads
                narrowColumnContentBoxProps(postLabLayoutConfig) — the same
                complete, every-tier field mapping the coordinator's own
                'bounded' default path uses internally — rather than
                hand-picking individual fields; hand-picking only
                align/alignWide/widthWide here (dropping alignLg/width/
                widthLg entirely) is what silently stranded this page's own
                already-live "Narrow column content align (≥ desktop)"/
                "Narrow column content width (≥ desktop)" panel controls —
                editable, but with no wiring left to actually move the box.
                align/alignWide/alignLg position the TOC content container
                itself within the column (a margin class — not w-fit, since
                the TOC's own longest line is nearly as wide as the whole
                column, which left w-fit almost no slack to move within,
                confirmed via measurement). textAlign is independent of this
                — it aligns the text within this box, this positions the box
                itself. verticalAlign (also from the spread) is scoped to
                this box's own bounded wrapper — the sticky div above, not
                the document-height outer grid cell narrowColumnClassName
                targets — so it can't reintroduce the "TOC centered
                somewhere in the middle of the document" failure mode that
                field's own doc comment (postLab.config.ts) warns about one
                level further out; minHeight gives it real slack to
                distribute when the TOC itself is short. */}
            <NarrowColumnContent
              {...narrowColumnContentBoxProps(postLabLayoutConfig)}
              debugLabel="TABLE OF CONTENTS"
            >
              <TableOfContentsDisclosure
                headings={headings}
                figures={figures}
                presentation={tocPresentation}
                presentationConfig={articleTocConfig}
                currentSectionLinePx={tocCurrentSectionLinePx}
                splitBreakpointPrefix={tocSplitBreakpointPrefix}
                collapsedByDefaultWhenStacked={articleTocConfig.collapsedByDefaultWhenStacked}
                autoExpandOnActiveSection={articleTocConfig.autoExpandOnActiveSection}
              />
            </NarrowColumnContent>
          </div>
        )}
      />
      {showAuthoringTools ? (
        <PostsLabConfigPanel
          bindings={configBindings}
          isOpen={isPanelOpen}
          onToggle={togglePanel}
          backgroundColor={resolveConfigPanelSurfaceColor({
            rightmostColumnColor: colors.physicalRightColumnColor,
            pageSurfaceColor: pageSurfaceConfig.color,
          })}
        />
      ) : null}
    </>
  )
}
export async function getStaticPaths() {
  return {
    paths: getAllPostSlugPaths(),
    fallback: false,
  }
}

export async function getStaticProps({ params: { slug } }: { params: { slug: string } }) {
  const props = await getPostArticleProps(slug)
  return { props }
}
