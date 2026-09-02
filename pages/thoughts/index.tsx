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
import { getThoughts } from '../../helpers/thoughtContent'
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

export default function ThoughtsIndex({ thoughts }: { thoughts: ThoughtSummary[] }) {
  const { pageSurfaceConfig } = useSharedDesignConfig()
  const { siteHeaderConfig, wordmarkConfig } = useAbstractDesignConfig()
  const surface = normalizePageSurfaceConfig(pageSurfaceConfig)
  return (
    <>
      <SeoHead title={buildSiteTitle('Thoughts')} description="Short thoughts from Abstract Voyage." canonicalPath="/thoughts" />
      <PolymorphicLayout
        config={centeredConfig}
        pageSurfaceConfig={surface}
        wideColumn={null}
        narrowColumn={(
          <ul className="m-0 list-none p-0">
            {thoughts.map((thought) => (
              <li key={thought.slug} className="border-b border-current/15 py-5 first:pt-0 last:border-0">
                <Link href={`/thoughts/${thought.slug}`} className="flex items-baseline justify-between gap-6 no-underline hover:opacity-70">
                  <span className="text-lg font-medium">{thought.title}</span>
                  <time dateTime={thought.date} className="shrink-0 font-mono text-xs uppercase opacity-60">{displayDate(thought.date)}</time>
                </Link>
              </li>
            ))}
          </ul>
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

export function getStaticProps() {
  return { props: { thoughts: getThoughts() } }
}
