import Head from 'next/head'
import {
  SITE_METADATA,
  getAbsoluteUrl,
} from '../helpers/siteMetadata'

type SeoHeadProps = {
  title?: string
  description?: string
  canonicalPath?: string
  ogType?: 'website' | 'article'
  ogImagePath?: string
  publishedTime?: string | null
  modifiedTime?: string | null
  tags?: string[]
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

export default function SeoHead({
  title = SITE_METADATA.defaultTitle,
  description = SITE_METADATA.defaultDescription,
  canonicalPath = '/',
  ogType = 'website',
  ogImagePath = SITE_METADATA.defaultOgImagePath,
  publishedTime,
  modifiedTime,
  tags = [],
  jsonLd,
}: SeoHeadProps) {
  const canonicalUrl = getAbsoluteUrl(canonicalPath)
  const ogImageUrl = getAbsoluteUrl(ogImagePath)
  const jsonLdItems = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index,follow" />
      <link rel="canonical" href={canonicalUrl} />
      <link
        rel="alternate"
        type="application/rss+xml"
        title={`${SITE_METADATA.siteName} RSS`}
        href={getAbsoluteUrl(SITE_METADATA.rssPath)}
      />

      <meta property="og:site_name" content={SITE_METADATA.siteName} />
      <meta property="og:locale" content={SITE_METADATA.locale} />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />

      {publishedTime ? (
        <meta property="article:published_time" content={publishedTime} />
      ) : null}
      {modifiedTime ? (
        <meta property="article:modified_time" content={modifiedTime} />
      ) : null}
      {tags.map((tag) => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}

      {jsonLdItems.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </Head>
  )
}
