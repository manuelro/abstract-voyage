// @ts-nocheck
import { useMemo, type ReactNode } from 'react'
import SeoHead from '../../components/SeoHead'
import {
    SITE_METADATA,
    getAbsoluteUrl,
} from '../../helpers/siteMetadata'
import PostCardDock from './dock/PostCardDock'
import Home from './components/Home'
import { buildSynthLogoStops } from './gradients/synthGradient'
import { PostType } from '../../pages/posts/[slug]'
import SynthLayout from './components/SynthLayout'

type PropsType = {
    posts: PostType[]
    children?: ReactNode
}

export default function SynthExperience({ posts, children }: PropsType) {
    const dockItems = useMemo(() => {
        const normalized = posts.filter(Boolean)
        const welcomeIndex = normalized.findIndex((post) => post.slug === 'welcome')
        const welcomePost = welcomeIndex >= 0 ? normalized[welcomeIndex] : null
        const rest = welcomeIndex >= 0
            ? normalized.filter((_, index) => index !== welcomeIndex)
            : normalized
        const ordered = welcomePost ? [welcomePost, ...rest] : rest

        return ordered.map((post) => ({
            title: post.title,
            excerpt: post.excerpt ?? '',
            topic: post.tags?.[0] ?? '',
            readingTime:
                post.readingTime ??
                (post.readingTimeMinutes != null
                    ? `${post.readingTimeMinutes} min read`
                    : ''),
            date: post.formattedDate ?? post.date,
            href: post.canonicalPath ?? '',
        }))
    }, [posts])

    const logoStops = useMemo(() => buildSynthLogoStops(), [])

    const homeTitle = dockItems[0]?.title ?? 'Home'
    const homeExcerpt = dockItems[0]?.excerpt
    const articleItems = useMemo(
        () => dockItems.filter((item) => Boolean(item.href)),
        [dockItems],
    )
    const homeJsonLd = useMemo(() => {
        const person = {
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: SITE_METADATA.authorName,
            url: SITE_METADATA.siteUrl,
            jobTitle: SITE_METADATA.authorJobTitle,
            sameAs: SITE_METADATA.socialProfiles,
            knowsAbout: [
                'AI engineering',
                'Product engineering',
                'Systems thinking',
                'Creative engineering',
                'Front-end development',
            ],
        }
        const website = {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE_METADATA.siteName,
            url: SITE_METADATA.siteUrl,
            description: SITE_METADATA.defaultDescription,
            publisher: {
                '@type': 'Person',
                name: SITE_METADATA.authorName,
            },
        }
        const itemList = {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement: articleItems.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: item.title,
                url: getAbsoluteUrl(item.href),
            })),
        }

        return [person, website, itemList]
    }, [articleItems])

    const USE_DOCK = true

    return (
        <SynthLayout hideHeader fullBleed>
            <SeoHead jsonLd={homeJsonLd} />

            <header className="sr-only">
                <h1>{SITE_METADATA.homeHeading}</h1>
                <nav aria-label="Primary">
                    <a href="/">Home</a>
                    <a href="/contact">Contact</a>
                    <a href="/lab/sota">State of the Art</a>
                </nav>
            </header>

            <nav className="sr-only" aria-label="Articles">
                <ul>
                    {articleItems.map((item) => (
                        <li key={item.href}>
                            <a href={item.href}>{item.title}</a>
                        </li>
                    ))}
                </ul>
            </nav>

            {USE_DOCK ? (
                <PostCardDock
                    items={dockItems}
                    minHeight="0px"
                    firstItemChildren={
                        <Home
                            logoStops={logoStops}
                            title={homeTitle}
                            excerpt={homeExcerpt}
                        />
                    }
                    baseHue={575}
                    gradientType='radial'
                    angleDeg={9}
                    lightnessRange={22}
                    chromaRange={40}
                    hueScheme='dual-complementary'
                    radialExtent='farthest-corner'
                    mode='center-bright'
                    stops={22}
                    centerStretch={1}
                    backgroundTransitionMs={700}
                    peakTravel={22}
                    arcLift={100}
                    variance={100}
                    seed={100}
                    scaleX={40}
                    scaleY={72}
                />
            ) : null}
        </SynthLayout>
    )
}
