// @ts-nocheck
import Head from 'next/head'
import Image from 'next/image'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import ListLegacy from './components/ListLegacy'
import PostCardDock from './dock/PostCardDock'
import Home from './components/Home'
import { BASE_SYNTH_GRADIENT_CONFIG, buildSynthLogoStops } from './gradients/synthGradient'
import { PostType } from '../../pages/posts/[slug]'
import SynthLayout from './components/SynthLayout'
import { easeInOutCubic } from 'components/tools/light/utils/animate'

type PropsType = {
    posts: PostType[]
    children?: ReactNode
}

type SOTAType = {
    label: string
    link: string
}

// const logoStops = generateHarmonicGradient({
//   baseHue: 20,

//   hueScheme: 'dual-complementary',
//   lightnessRange: { min: 45 }, // NOTE: for a closer match to DEFAULT_STOPS, use { min: 70 }
//   chromaRange: { min: 100 },
//   mode: 'center-bright',
//   stops: 9,
//   variance: 100,
//   centerStretch: 0,
//   seed: 1,

//   // perStopLightness: [100, 100, 100, 100, 100, 100, 100]
// }).map((stop) => ({
//   color: stop.color,
//   at: stop.at * 100, // normalize 0–1 → 0–100, same as Logo.DEFAULT_STOPS
// }))

export default function SynthExperience({ posts, children }: PropsType) {
    const aStyle = 'px-3 py-1 dark:border-transparent dark:hover:border-transparent dark:bg-slate-950 inline-block rounded text-slate-500 cursor-pointer dark:hover:bg-slate-800 transition-colors cursor-pointer bg-slate-50 hover:border-slate-300 hover:border border-solid border border-transparent hover:text-slate-800'
    const liStyle = 'pl-2 py-1'
    const [borderColor, setBorderColor] = useState('#020617')

    useEffect(() => {
        const mql = window.matchMedia('(prefers-color-scheme: dark)')

        const onMqlChange = (e: any) => {
            if (e.matches) {
                setBorderColor('#020617')
            } else {
                setBorderColor('#CBD5E1')
            }
        }

        mql.onchange = (e: any) => {
            onMqlChange(e)
        }

        onMqlChange(mql)
    }, [])

    const Tree = ({ title, version, items } : { title: string, version: string, items: SOTAType[] }) => (
        <div className='text-white tech'>
            <style jsx>{`
                .version {
                    opacity: 0;
                }
                .tech:hover .version {
                    opacity: 1;
                }

                .list li {
                    position: relative;
                }

                .list:before {
                    position: absolute;
                    top: 0px;
                    left: 0px;
                    content: '';
                    display: block;
                    height: calc(100% - 15px);
                    width: 8px;
                    border-style: solid;
                    border-color: ${borderColor};
                    border-width: 0px 0px 1px 1px;
                    border-radius: 0px 0px 0px 6px;
                }

                .list li:before {
                    position: absolute;
                    top: 50%;
                    left: -8px;
                    content: '';
                    display: block;
                    height: 1px;
                    width: 8px;
                    border-style: solid;
                    border-color: ${borderColor};
                    border-width: 1px 0px 0px 0px;
                }

                .list li:last-of-type:before {
                    display: none;
                }
            `}</style>

            <div>
                <label className='text-sm text-slate-900 dark:text-slate-50'>{title}</label>

                <span className='version transition-opacity font-mono text-xs bg-slate-50 rounded px-2 py-1 text-slate-500 ml-2 dark:text-slate-300 dark:bg-slate-950'>v{version}.0</span>
            </div>

            <div className='text-xs pl-3 pt-3'>
                <label className='pl-4 pt-4 pb-2 border-l dark:border-l-slate-950 border-l-slate-300 block text-slate-900 dark:text-slate-50 hidden'>Hooks</label>

                <ul className='list relative pl-2'>
                    {items.map(({ label, link }) => (
                        <li key={label} className={liStyle}>
                            <a className={aStyle} href={link} target='_blank'>{label}</a>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )

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

    const USE_DOCK = true

    return (
        <SynthLayout hideHeader fullBleed>
            <Head>
                <title>Manuel Cerdas — Systems & Craft | Abstract Voyage</title>
            </Head>

            <div className='hidden flex-col border-y dark:border-y-slate-950 mt-12 pb-12'>
                <Image
                    className="relative mt-8 mb-12 hidden dark:block"
                    src="/sota-dark.svg"
                    alt="Abstract Voyage Logo"
                    height={31}
                    width={221}
                    priority
                    quality={100}
                />

                <Image
                    className="relative mt-8 mb-12 dark:hidden"
                    src="/sota-light.svg"
                    alt="Abstract Voyage Logo"
                    height={31}
                    width={221}
                    priority
                    quality={100}
                />

                <div className='flex flex-col lg:flex-row justify-between'>
                    <Tree title='React' version='18'
                        items={[
                            { label: 'Server Components', link: 'https://react.dev/blog/2020/12/21/data-fetching-with-react-server-components' },
                            { label: 'Automatic Batching', link: 'https://react.dev/blog/2022/03/29/react-v18#new-feature-automatic-batching' },
                            { label: 'New Suspense Feature', link: 'https://github.com/reactjs/rfcs/blob/main/text/0213-suspense-in-react-18.md' }
                        ]}
                    />
                    <Tree title='Vue' version='3'
                        items={[
                            { label: 'Composition API', link: 'https://vuejs.org/guide/extras/composition-api-faq.html#what-is-composition-api' },
                            { label: 'Teleport', link: 'https://vuejs.org/guide/built-ins/teleport.html' },
                            { label: 'Fragments', link: 'https://v3-migration.vuejs.org/new/fragments.html' },
                        ]}
                    />
                    <Tree title='Angular' version='16'
                        items={[
                            { label: 'Angular Signals', link: 'https://angular.io/guide/signals' },
                            { label: 'Server Side Rendering', link: 'https://blog.angular.io/whats-next-for-server-side-rendering-in-angular-2a6f27662b67' },
                            { label: 'Experimental Jest Support', link: 'https://blog.angular.io/moving-angular-cli-to-jest-and-web-test-runner-ef85ef69ceca' },
                        ]}
                    />
                </div>
            </div>

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
