import SeoHead from '../../components/SeoHead'
import {
  SITE_METADATA,
  buildSiteTitle,
  getAbsoluteUrl,
  getPostCanonicalPath,
  getPostOgImagePath,
  getPublishedDate,
} from '../../helpers/siteMetadata'
import { useMemo, useState } from 'react'
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
import { buildSplitAlignedSiteHeaderConfig } from '../../experiences/abstract/components/SiteHeader/hooks/buildSplitAlignedSiteHeaderConfig'
import { SiteHeader } from '../../experiences/abstract/components/SiteHeader'
import { buildEffectiveSiteHeaderConfig } from '../../experiences/abstract/components/SiteHeader/buildEffectiveSiteHeaderConfig'
import {
  normalizeSiteHeaderColorOverrideConfig,
  POSTS_LAB_SITE_HEADER_COLOR_OVERRIDE_CONFIG,
  type SiteHeaderColorOverrideConfig,
} from '../../experiences/abstract/components/SiteHeader/config/colorOverride'
import { useNormalizedSiteHeaderConfig } from '../../experiences/abstract/components/SiteHeader/hooks/useNormalizedSiteHeaderConfig'
import {
  DEFAULT_POST_LAB_PAGE_LAYOUT_CONFIG,
  normalizePostLabPageLayoutConfig,
  type PostLabPageLayoutConfig,
} from './postLab.config'
import {
  DEFAULT_POST_LAB_ARTICLE_CONFIG,
  normalizePostLabArticleConfig,
  type MarkdownContentConfig,
} from '../../experiences/abstract/components/MarkdownContent/config/registered'
import {
  DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG,
  normalizePostLabArticleTocConfig,
  resolvePostLabTocActiveTrackingOffsetPx,
  resolvePostLabTocStickyGapPx,
  type TableOfContentsConfig,
} from '../../experiences/abstract/components/TableOfContents/config/registered'
import styles from './postLabArticle.module.css'
import { useAbstractDesignConfig } from '../../experiences/abstract/components/AbstractDesignConfigProvider'
import {
  resolvePostLabArticlePresentation,
  resolvePostLabTocPresentation,
} from '../../experiences/abstract/helpers/readingPresentation'
import { TableOfContentsDisclosure } from '../../experiences/abstract/components/TableOfContents'
import MarkdownContent from '../../experiences/abstract/components/MarkdownContent'
import { firstSplitTierPrefix } from '../../experiences/abstract/components/SplitColumnLayout'

// Production article reading view. Promoted from the pages/posts-lab/[slug].tsx
// sandbox (2026-08-28) — same SplitColumnLayout/SplitColumnPageShell shell
// /about, /contact, and /abstract already use, replacing the retired
// SynthLayout/ArticleLayout reading view this route previously rendered
// through. Reuses helpers/postArticle.ts's data pipeline unchanged — this
// promotion only changed how that data renders, not what data is fetched or
// which slugs exist, so canonical URLs/slugs are identical to what this
// route served before.
//
// The dev-only config-panel editing UI (Panel, *.panel.ts scope recipes,
// PostsLabConfigPanel, useAuthoringToolsVisibility) is intentionally not
// present here, matching the same "runtime defaults preserved, editing UI
// stripped" treatment already applied to /about, /abstract, and /contact —
// see those pages and P1-404-INCIDENT-RCA-AND-RELEASE-PROTOCOL.md §C Phase 2
// for the rationale.
export type { PostType }

export default function Post({
  slug,
  publishedDate,
  canonicalPath,
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

  const resolvedCanonicalPath = canonicalPath ?? getPostCanonicalPath(slug)
  const resolvedPublishedDate =
    publishedDate ??
    getPublishedDate({
      slug,
      frontmatterDate: (frontmatter as any)?.date,
      sourceDate: source?.originallyPublished,
    })
  const ogImagePath = getPostOgImagePath(slug)
  const postUrl = getAbsoluteUrl(resolvedCanonicalPath)
  const postJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: excerpt ?? SITE_METADATA.defaultDescription,
    url: postUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    author: {
      '@type': 'Person',
      name: SITE_METADATA.authorName,
      url: SITE_METADATA.siteUrl,
    },
    publisher: {
      '@type': 'Person',
      name: SITE_METADATA.authorName,
    },
    image: getAbsoluteUrl(ogImagePath),
    datePublished: resolvedPublishedDate ?? undefined,
    dateModified: resolvedPublishedDate ?? undefined,
    keywords: tags?.length ? tags.join(', ') : undefined,
  }

  // Baked-in runtime defaults — these used to be editable through the
  // now-stripped config panel; the values below are exactly what the panel
  // last shipped (DEFAULT_*), preserved unchanged, same pattern /about,
  // /abstract, and /contact already use.
  const [pageSurfaceConfig] =
    useState<PageSurfaceConfig>(() => normalizePageSurfaceConfig(DEFAULT_PAGE_SURFACE_CONFIG))
  const { siteHeaderConfig } = useAbstractDesignConfig()
  const [siteHeaderColorOverride] =
    useState<SiteHeaderColorOverrideConfig>(() => (
      normalizeSiteHeaderColorOverrideConfig(POSTS_LAB_SITE_HEADER_COLOR_OVERRIDE_CONFIG)
    ))
  const [postLabLayoutConfig] =
    useState<PostLabPageLayoutConfig>(() => (
      normalizePostLabPageLayoutConfig(DEFAULT_POST_LAB_PAGE_LAYOUT_CONFIG)
    ))
  const [articleConfig] =
    useState<MarkdownContentConfig>(() => normalizePostLabArticleConfig(DEFAULT_POST_LAB_ARTICLE_CONFIG))
  const [articleTocConfig] =
    useState<TableOfContentsConfig>(() => normalizePostLabArticleTocConfig(DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG))

  const { ref: splitColumnHeaderWrapperRef, rect: splitColumnHeaderWrapperRect } =
    useMeasuredElementRect<HTMLDivElement>()
  const splitColumnHeaderHeightPx = splitColumnHeaderWrapperRect?.height

  const colors = usePolymorphicLayoutColors(postLabLayoutConfig, pageSurfaceConfig.color)

  const normalizedSiteHeaderConfig = useNormalizedSiteHeaderConfig(siteHeaderConfig, siteHeaderColorOverride)

  const pageSiteHeaderConfig = buildSplitAlignedSiteHeaderConfig(
    normalizedSiteHeaderConfig, { navAlignedToPageContainer: false },
  )

  const headerReservePx = postLabLayoutConfig.headerScrollBehavior === 'static'
    ? 0
    : (splitColumnHeaderHeightPx ?? 0)
  const narrowColumnStickyTopPx = headerReservePx + resolvePostLabTocStickyGapPx(articleTocConfig)
  const tocCurrentSectionLinePx = postLabLayoutConfig.headerScrollBehavior === 'static'
    ? resolvePostLabTocActiveTrackingOffsetPx(articleTocConfig)
    : splitColumnHeaderHeightPx === undefined
      ? undefined
      : splitColumnHeaderHeightPx + resolvePostLabTocActiveTrackingOffsetPx(articleTocConfig)
  const tocSplitBreakpointPrefix = firstSplitTierPrefix(
    postLabLayoutConfig.narrowColumnWidthTierMd,
    postLabLayoutConfig.narrowColumnWidthTierLg,
  )
  const narrowColumnMinHeightClassName = tocSplitBreakpointPrefix
    ? { md: 'md:min-h-[100dvh]', lg: 'lg:min-h-[100dvh]' }[tocSplitBreakpointPrefix]
    : ''
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

  return (
    <>
      <SeoHead
        title={buildSiteTitle(title)}
        description={excerpt ?? SITE_METADATA.defaultDescription}
        canonicalPath={resolvedCanonicalPath}
        ogType="article"
        ogImagePath={ogImagePath}
        publishedTime={resolvedPublishedDate}
        modifiedTime={resolvedPublishedDate}
        tags={tags ?? []}
        jsonLd={postJsonLd}
      />
      <PolymorphicLayout
        config={postLabLayoutConfig}
        pageSurfaceConfig={pageSurfaceConfig}
        headerWrapperRef={splitColumnHeaderWrapperRef}
        header={(slotProps) => (
          <SiteHeader
            config={buildEffectiveSiteHeaderConfig(pageSiteHeaderConfig, postLabLayoutConfig)}
            physicalLeftColumnColor={colors.actualLeftSegmentColor}
            pageSurfaceConfig={pageSurfaceConfig}
            splitBandActive={postLabLayoutConfig.headerSplitBandEnabled}
            splitBandLeftColor={colors.resolvedSplitBandLeftColor}
            splitBandRightColor={colors.resolvedSplitBandRightColor}
            splitBandStacked={colors.splitBandStacked}
            {...slotProps}
          />
        )}
        edgeBackdropEnabled
        mobileNavAlignEnabled
        wideColumnClassName="min-h-[100dvh] flex flex-col"
        narrowColumnClassName={narrowColumnMinHeightClassName}
        wideColumn={(
          <article className={styles.article} style={articleStyle}>
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
          <div
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
