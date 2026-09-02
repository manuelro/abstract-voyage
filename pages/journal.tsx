import { useMemo, useState } from 'react'
import SeoHead from '../components/SeoHead'
import { ConfigScopeList, createConfigScopeBinding, useConfigPanelBindings } from '../components/Panel/config'
import { PanelShell, PanelStandardHeaderActions } from '../components/Panel'
import { useAuthoringToolsVisibility } from '../components/Panel/useAuthoringToolsVisibility'
import { usePrefersReducedMotion } from '../helpers/usePrefersReducedMotion'
import { getPostSummaries, type PostSummary } from '../helpers/postContent'
import { getThoughts, type ThoughtSummary } from '../helpers/thoughtContent'
import { buildSiteTitle } from '../helpers/siteMetadata'
import { normalizePageSurfaceConfig } from '../components/PageSurface.config'
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
import { AboutTimeline, type AboutTimelineRowData } from '../experiences/about/components/AboutTimeline'
import { normalizeAboutTimelineConfig, type AboutTimelineConfig } from '../experiences/about/components/AboutTimeline.config'
import { normalizePolymorphicLayoutConfig, type PolymorphicLayoutConfig } from '../experiences/abstract/components/PolymorphicLayout.config'
import { DEFAULT_CARD_APPEARANCE_CONFIG, normalizeCardAppearanceConfig, type CardAppearanceConfig } from '../experiences/abstract/components/Card/config/appearance'
import {
  DEFAULT_JOURNAL_TIMELINE_CONFIG,
  JOURNAL_POLYMORPHIC_LAYOUT_CONFIG,
} from './journal.config'
import {
  JOURNAL_CARD_APPEARANCE_PANEL,
  JOURNAL_POLYMORPHIC_LAYOUT_PANEL,
  JOURNAL_TIMELINE_PANEL,
} from './journal.panel'

type JournalProps = { posts: PostSummary[]; thoughts: ThoughtSummary[] }
const JOURNAL_TIMELINE_ID = 'journal-article-timeline'

export default function JournalPage({ posts }: JournalProps) {
  const { pageSurfaceConfig, panelShellConfig } = useSharedDesignConfig()
  const { siteHeaderConfig, wordmarkConfig } = useAbstractDesignConfig()
  const { showAuthoringTools, isPanelOpen, togglePanel } = useAuthoringToolsVisibility()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)
  const [layoutConfig, setLayoutConfig] = useState<PolymorphicLayoutConfig>(() => (
    normalizePolymorphicLayoutConfig(JOURNAL_POLYMORPHIC_LAYOUT_CONFIG)
  ))
  const [timelineConfig, setTimelineConfig] = useState<AboutTimelineConfig>(() => (
    normalizeAboutTimelineConfig(DEFAULT_JOURNAL_TIMELINE_CONFIG)
  ))
  const [cardAppearanceConfig, setCardAppearanceConfig] = useState<CardAppearanceConfig>(() => (
    normalizeCardAppearanceConfig(DEFAULT_CARD_APPEARANCE_CONFIG)
  ))
  const timelineRows = useMemo<AboutTimelineRowData[]>(() => posts.map((post, index) => ({
    caption: post.title,
    appendix: [
      post.formattedDate ?? post.date,
      post.readingTimeMinutes != null ? `${post.readingTimeMinutes} min read` : '',
    ].filter(Boolean).join(' · '),
    line: post.excerpt,
    slideIndex: index,
    href: post.canonicalPath,
  })), [posts])
  const surface = normalizePageSurfaceConfig(pageSurfaceConfig)
  const layoutColors = usePolymorphicLayoutColors(layoutConfig, surface.color)
  const normalizedSiteHeaderConfig = useNormalizedSiteHeaderConfig(
    siteHeaderConfig,
    JOURNAL_SITE_HEADER_COLOR_OVERRIDE_CONFIG,
  )
  const bindings = useConfigPanelBindings(useMemo(() => [
    createConfigScopeBinding({ definition: JOURNAL_TIMELINE_PANEL, value: timelineConfig, onChange: setTimelineConfig }),
    createConfigScopeBinding({ definition: JOURNAL_CARD_APPEARANCE_PANEL, value: cardAppearanceConfig, onChange: setCardAppearanceConfig }),
    createConfigScopeBinding({ definition: JOURNAL_POLYMORPHIC_LAYOUT_PANEL, value: layoutConfig, onChange: setLayoutConfig }),
  ], [timelineConfig, cardAppearanceConfig, layoutConfig]))

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
        wideColumnClassName="px-6 py-8 md:px-12 md:py-16"
        narrowColumnClassName="px-6 py-8 md:px-12 md:py-16"
        wideColumn={(
          <AboutTimeline
            rows={timelineRows}
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
            accentColor="#14142f"
            columnBackgroundColor={layoutColors.wideColumnColor}
            config={timelineConfig}
            prefersReducedMotion={prefersReducedMotion}
            panelId={JOURNAL_TIMELINE_ID}
          />
        )}
        // Keep the narrow slot in the polymorphic layout while its thought
        // content is temporarily hidden.
        narrowColumn={<div className="w-full" aria-hidden="true" />}
        header={(slotProps) => (
          <SiteHeader
            config={buildEffectiveSiteHeaderConfig(
              buildSplitAlignedSiteHeaderConfig(normalizedSiteHeaderConfig),
              layoutConfig,
            )}
            wordmarkConfig={wordmarkConfig}
            pageSurfaceConfig={surface}
            {...slotProps}
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
                  setTimelineConfig(normalizeAboutTimelineConfig(DEFAULT_JOURNAL_TIMELINE_CONFIG))
                  setCardAppearanceConfig(normalizeCardAppearanceConfig(DEFAULT_CARD_APPEARANCE_CONFIG))
                  setLayoutConfig(normalizePolymorphicLayoutConfig(JOURNAL_POLYMORPHIC_LAYOUT_CONFIG))
                }}
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
