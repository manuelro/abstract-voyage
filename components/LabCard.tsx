import type { ReactNode } from 'react'
import {
  ArticleCard,
  type ArticleCardPhysicsMode,
} from './ArticleCard'
import {
  DEFAULT_CTA_BUTTON_CONFIG,
  type CtaButtonConfig,
} from './CtaButton/config/registered'

// ---------------------------------------------------------------------------
// Accent color — deterministic slug → hue
// ---------------------------------------------------------------------------

function slugToAccentColors(slug: string): { dim: string; glow: string } {
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0
  }
  const hue = hash % 360
  return {
    dim:  `hsl(${hue} 65% 45% / 0.19)`,
    glow: `hsl(${hue} 65% 45% / 0.33)`,
  }
}

// ---------------------------------------------------------------------------
// Physics config — same as ArticleCard's default but resting elevation = 0
// so the card blends flush with the section background at rest.
// ---------------------------------------------------------------------------

const LAB_CARD_PHYSICS = {
  ...DEFAULT_CTA_BUTTON_CONFIG,
  shadowElevationRestingPx: 0,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LabCardProps = {
  slug: string
  title: string
  excerpt: string
  tech: string[]
  date: string
  formattedDate: string | null
  /** CSS color matching the section's background. Card blends flush at rest
   *  (elevation 0, no shadow). Defaults to '#0a0d14'. */
  containerBg?: string
  /** Gradient style — elliptical glow from below (default) or vertical sweep. */
  gradientStyle?: 'elliptical' | 'vertical'
  /** Tailwind border-radius class forwarded to ArticleCard — keeps corners
   *  identical to the journal scatter cards (driven by dockLayoutConfig.cardRadius). */
  className?: string
  /** Optional visual-surface override. Abstract uses this to supply the same
   *  WebGL renderer as its journal cards; every other LabCard consumer keeps
   *  the existing deterministic CSS gradient. */
  background?: ReactNode
  /** Allows a composite card shell to own lift/tilt once for both faces.
   * Defaults to the existing standalone lifted behavior. */
  physics?: ArticleCardPhysicsMode
  physicsConfig?: CtaButtonConfig
}

// ---------------------------------------------------------------------------
// Component — thin wrapper over ArticleCard
// ---------------------------------------------------------------------------

export default function LabCard({
  slug,
  title,
  excerpt,
  tech,
  date,
  formattedDate,
  containerBg = '#0a0d14',
  gradientStyle = 'elliptical',
  className,
  background,
  physics = 'lift',
  physicsConfig = LAB_CARD_PHYSICS,
}: LabCardProps) {
  const accent = slugToAccentColors(slug)
  const gradient =
    gradientStyle === 'vertical'
      ? `linear-gradient(to bottom, ${containerBg} 0%, ${accent.dim} 50%, ${containerBg} 100%)`
      : `radial-gradient(ellipse 110% 60% at 50% 130%, ${accent.glow} 0%, ${containerBg} 65%)`

  return (
    <ArticleCard
      title={title}
      excerpt={excerpt}
      topic={tech[0]}
      readingTime={tech.slice(1, 3).join(' · ') || undefined}
      date={formattedDate ?? date}
      href={`/labs/${slug}`}
      background={background ?? (
        <div style={{ position: 'absolute', inset: 0, background: gradient }} />
      )}
      // Match ScatterCard's exact ArticleCard config so typography, padding,
      // and content placement are pixel-identical to the journal cards.
      physics={physics}
      interactive="whole-card"
      physicsConfig={physicsConfig}
      typographyScale="dock"
      contentInsetRem={2.5}
      contentInsetWideRem={3}
      contentBlockHeight="clamp(5rem, 26cqh, 8rem)"
      ctaHoverOnly
      ctaLabel="View lab"
      aspectRatio="3:4"
      className={className}
      style={{ backgroundColor: containerBg }}
    />
  )
}
