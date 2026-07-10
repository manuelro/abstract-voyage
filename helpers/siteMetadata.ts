export const SITE_METADATA = {
  siteName: 'Abstract Voyage',
  siteUrl: 'https://abstract.voyage',
  authorName: 'Manuel Cerdas',
  authorJobTitle: 'Creative engineer and AI consultant',
  defaultTitle: 'Manuel Cerdas - Creative Engineer & AI Consultant | Abstract Voyage',
  defaultDescription:
    'Manuel Cerdas is a creative engineer and consultant working across AI engineering, product strategy, systems thinking, and expressive web interfaces.',
  homeHeading:
    'Manuel Cerdas - creative engineer and AI consultant exploring systems, craft, and expressive interfaces.',
  locale: 'en_US',
  defaultOgImagePath: '/og/index.png',
  rssPath: '/feed.xml',
  socialProfiles: [
    'https://www.linkedin.com/in/manuelro/',
    'https://github.com/manuelro',
    'https://codepen.io/manuelro',
    'https://abstractvoyage.medium.com/',
  ],
} as const

const ABSOLUTE_URL_RE = /^https?:\/\//i

export const getAbsoluteUrl = (pathOrUrl = '/') => {
  if (ABSOLUTE_URL_RE.test(pathOrUrl)) return pathOrUrl

  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${SITE_METADATA.siteUrl}${path}`
}

export const getPostCanonicalPath = (slug: string) => `/posts/${slug}`

export const getPostCanonicalUrl = (slug: string) =>
  getAbsoluteUrl(getPostCanonicalPath(slug))

export const getPostOgImagePath = (slug: string) => `/og/posts/${slug}.png`

export const getDateFromPostSlug = (slug: string) => {
  const match = slug.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? null
}

export const normalizeIsoDate = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toISOString().slice(0, 10)
}

export const getPublishedDate = ({
  slug,
  frontmatterDate,
  sourceDate,
}: {
  slug: string
  frontmatterDate?: unknown
  sourceDate?: unknown
}) =>
  normalizeIsoDate(sourceDate) ??
  normalizeIsoDate(frontmatterDate) ??
  getDateFromPostSlug(slug)
