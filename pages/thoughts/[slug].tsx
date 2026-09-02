import Link from 'next/link'
import SeoHead from '../../components/SeoHead'
import { useSharedDesignConfig } from '../../components/SharedDesignConfigProvider'
import { useAbstractDesignConfig } from '../../experiences/abstract/components/AbstractDesignConfigProvider'
import { SiteHeader } from '../../experiences/abstract/components/SiteHeader'
import { buildEffectiveSiteHeaderConfig } from '../../experiences/abstract/components/SiteHeader/buildEffectiveSiteHeaderConfig'
import { buildSplitAlignedSiteHeaderConfig } from '../../experiences/abstract/components/SiteHeader/hooks/buildSplitAlignedSiteHeaderConfig'
import { PolymorphicLayout } from '../../experiences/abstract/components/PolymorphicLayout'
import { DEFAULT_POLYMORPHIC_LAYOUT_CONFIG, normalizePolymorphicLayoutConfig } from '../../experiences/abstract/components/PolymorphicLayout.config'
import { normalizePageSurfaceConfig } from '../../components/PageSurface.config'
import { buildSiteTitle } from '../../helpers/siteMetadata'
import { getThoughtBySlug, getThoughts } from '../../helpers/thoughtContent'
import ThoughtCard from '../../experiences/abstract/components/ThoughtCard/ThoughtCard'
import type { ThoughtSummary } from '../../helpers/thoughtContent'

const centeredConfig = normalizePolymorphicLayoutConfig({
  ...DEFAULT_POLYMORPHIC_LAYOUT_CONFIG,
  layoutMode: 'centered',
  centeredContentMaxWidth: 'max-w-2xl',
  centeredContentPaddingX: 'px-6',
  narrowColumnContentContainer: 'full-bleed',
  narrowColumnContentHeight: 'auto',
})

function displayDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
}

export default function ThoughtPage({ thought }: { thought: ThoughtSummary }) {
  const { pageSurfaceConfig } = useSharedDesignConfig()
  const { siteHeaderConfig, wordmarkConfig } = useAbstractDesignConfig()
  const surface = normalizePageSurfaceConfig(pageSurfaceConfig)
  return (
    <>
      <SeoHead title={buildSiteTitle(thought.title)} description={thought.description} canonicalPath={`/thoughts/${thought.slug}`} />
      <PolymorphicLayout
        config={centeredConfig}
        pageSurfaceConfig={surface}
        wideColumn={null}
        narrowColumn={(
          <div className="flex flex-col items-center gap-5">
            <ThoughtCard {...thought} scale="amplified" link={false} />
            <time dateTime={thought.date} className="font-mono text-xs uppercase opacity-60">{displayDate(thought.date)}</time>
            <Link href="/thoughts" className="font-mono text-xs uppercase opacity-60 hover:opacity-100">Back to thoughts</Link>
          </div>
        )}
        header={(slotProps) => (
          <SiteHeader
            config={buildEffectiveSiteHeaderConfig(buildSplitAlignedSiteHeaderConfig(siteHeaderConfig), centeredConfig)}
            wordmarkConfig={wordmarkConfig}
            pageSurfaceConfig={surface}
            {...slotProps}
          />
        )}
      />
    </>
  )
}

export function getStaticPaths() {
  return { paths: getThoughts().map((thought) => ({ params: { slug: thought.slug } })), fallback: false }
}

export function getStaticProps({ params }: { params: { slug: string } }) {
  const thought = getThoughtBySlug(params.slug)
  if (!thought) return { notFound: true }
  return { props: { thought } }
}
