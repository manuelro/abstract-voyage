// @ts-nocheck
'use client'

import Head from 'next/head'
import Image from 'next/image'
import List from '../../components/List'
import motion from 'framer-motion'

type PostType = any

type SOTAType = { label: string; link: string }

const aStyle =
  'px-3 py-1 dark:border-transparent dark:hover:border-transparent dark:bg-slate-950 inline-block rounded text-slate-500 cursor-pointer dark:hover:bg-slate-800 transition-colors cursor-pointer bg-slate-50 hover:border-slate-300 hover:border border-solid border border-transparent hover:text-slate-800'
const liStyle = 'pl-2 py-1'

const Tree = ({ title, version, items }: { title: string; version: string; items: SOTAType[] }) => (
  <ul className="text-white tech">
    <style jsx>{`
      .version { opacity: 0; }
      .tech:hover .version { opacity: 1; }
      .list li { position: relative; }
      .list:before {
        position: absolute; top: 0px; left: 0px; content: ''; display: block;
        height: calc(100% - 15px); width: 8px; border-style: solid;
        border-color: rgba(203,213,225,0.5); border-width: 0px 0px 1px 1px; border-radius: 0px 0px 0px 6px;
      }
      .list li:before {
        position: absolute; top: 50%; left: -8px; content: ''; display: block;
        height: 1px; width: 8px; border-style: solid; border-color: rgba(203,213,225,0.5); border-width: 1px 0px 0px 0px;
      }
      .list li:last-of-type:before { display: none; }
    `}</style>

    <div>
      <label className="text-sm text-slate-900 dark:text-slate-50">{title}</label>
      <span className="version transition-opacity font-mono text-xs bg-slate-50 rounded px-2 py-1 text-slate-500 ml-2 dark:text-slate-300 dark:bg-slate-950">
        v{version}.0
      </span>
    </div>

    <li className="text-xs pl-3 pt-3">
      <label className="pl-4 pt-4 pb-2 border-l dark:border-l-slate-950 border-l-slate-300 block text-slate-900 dark:text-slate-50 hidden">
        Hooks
      </label>

      <ul className="list relative pl-2">
        {(() => {
          return items.map(({ label, link }, i) => (
            <motion.li
              key={label}
              className={liStyle}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 1000, duration: 0.42, ease: 'easeOut' }} // 0.1s = 100ms between items
            >
              <motion.a
                className={aStyle}
                href={link}
                target="_blank"
                rel="noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              >
                {label}
              </motion.a>
            </motion.li>
          ))
        })()}
      </ul>
    </li>
  </ul>
)

export default function ClassicExperience({ posts }: { posts: PostType[] }) {
  return (
    <main className="flex min-h-screen flex-col p-5 md:p-24 max-w-screen-xl" data-classic>
      <Head>
        <title>Abstract Voyage | Manuel Cerdas&apos; Journal on Web Technologies, Cloud Computing and Artificial Intelligence</title>
      </Head>

      <div className="hidden lg:flex flex-col border-y dark:border-y-slate-950 mt-12 pb-12">
        <Image className="relative mt-8 mb-12 hidden dark:block" src="/sota-dark.svg" alt="Abstract Voyage Logo" height={31} width={221} priority quality={100} />
        <Image className="relative mt-8 mb-12 dark:hidden" src="/sota-light.svg" alt="Abstract Voyage Logo" height={31} width={221} priority quality={100} />

        <div className="flex flex-col lg:flex-row justify-between">
          <Tree
            title="React"
            version="18"
            items={[
              { label: 'Server Components', link: 'https://react.dev/blog/2020/12/21/data-fetching-with-react-server-components' },
              { label: 'Automatic Batching', link: 'https://react.dev/blog/2022/03/29/react-v18#new-feature-automatic-batching' },
              { label: 'New Suspense Feature', link: 'https://github.com/reactjs/rfcs/blob/main/text/0213-suspense-in-react-18.md' }
            ]}
          />
          <Tree
            title="Vue"
            version="3"
            items={[
              { label: 'Composition API', link: 'https://vuejs.org/guide/extras/composition-api-faq.html#what-is-composition-api' },
              { label: 'Teleport', link: 'https://vuejs.org/guide/built-ins/teleport.html' },
              { label: 'Fragments', link: 'https://v3-migration.vuejs.org/new/fragments.html' }
            ]}
          />
          <Tree
            title="Angular"
            version="16"
            items={[
              { label: 'Angular Signals', link: 'https://angular.io/guide/signals' },
              { label: 'Server Side Rendering', link: 'https://blog.angular.io/whats-next-for-server-side-rendering-in-angular-2a6f27662b67' },
              { label: 'Experimental Jest Support', link: 'https://blog.angular.io/moving-angular-cli-to-jest-and-web-test-runner-ef85ef69ceca' }
            ]}
          />
        </div>
      </div>

      <List className="mt-5" posts={posts} />
    </main>
  )
}
