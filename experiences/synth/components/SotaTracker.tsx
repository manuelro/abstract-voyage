import Image from 'next/image'
import { useEffect, useState } from 'react'

type SotaItem = {
  label: string
  link: string
}

const linkClassName =
  'inline-block rounded border border-transparent bg-slate-50 px-3 py-1 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-transparent dark:bg-slate-950 dark:text-slate-300 dark:hover:border-transparent dark:hover:bg-slate-800'

const itemClassName = 'py-1 pl-2'

const stacks = [
  {
    title: 'React',
    version: '18',
    items: [
      {
        label: 'Server Components',
        link: 'https://react.dev/blog/2020/12/21/data-fetching-with-react-server-components',
      },
      {
        label: 'Automatic Batching',
        link: 'https://react.dev/blog/2022/03/29/react-v18#new-feature-automatic-batching',
      },
      {
        label: 'New Suspense Feature',
        link: 'https://github.com/reactjs/rfcs/blob/main/text/0213-suspense-in-react-18.md',
      },
    ],
  },
  {
    title: 'Vue',
    version: '3',
    items: [
      {
        label: 'Composition API',
        link: 'https://vuejs.org/guide/extras/composition-api-faq.html#what-is-composition-api',
      },
      { label: 'Teleport', link: 'https://vuejs.org/guide/built-ins/teleport.html' },
      {
        label: 'Fragments',
        link: 'https://v3-migration.vuejs.org/new/fragments.html',
      },
    ],
  },
  {
    title: 'Angular',
    version: '16',
    items: [
      { label: 'Angular Signals', link: 'https://angular.io/guide/signals' },
      {
        label: 'Server Side Rendering',
        link: 'https://blog.angular.io/whats-next-for-server-side-rendering-in-angular-2a6f27662b67',
      },
      {
        label: 'Experimental Jest Support',
        link: 'https://blog.angular.io/moving-angular-cli-to-jest-and-web-test-runner-ef85ef69ceca',
      },
    ],
  },
] as const

function SotaTree({
  title,
  version,
  items,
  borderColor,
}: {
  title: string
  version: string
  items: readonly SotaItem[]
  borderColor: string
}) {
  return (
    <div className="tech text-white">
      <style jsx>{`
        .version {
          opacity: 0;
        }

        .tech:hover .version,
        .tech:focus-within .version {
          opacity: 1;
        }

        .list li {
          position: relative;
        }

        .list:before {
          position: absolute;
          top: 0;
          left: 0;
          content: '';
          display: block;
          height: calc(100% - 15px);
          width: 8px;
          border-style: solid;
          border-color: ${borderColor};
          border-width: 0 0 1px 1px;
          border-radius: 0 0 0 6px;
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
          border-width: 1px 0 0 0;
        }

        .list li:last-of-type:before {
          display: none;
        }
      `}</style>

      <div>
        <h2 className="inline text-sm text-slate-900 dark:text-slate-50">{title}</h2>
        <span className="version ml-2 rounded bg-slate-50 px-2 py-1 font-mono text-xs text-slate-500 transition-opacity dark:bg-slate-950 dark:text-slate-300">
          v{version}.0
        </span>
      </div>

      <div className="pl-3 pt-3 text-xs">
        <ul className="list relative pl-2">
          {items.map(({ label, link }) => (
            <li key={label} className={itemClassName}>
              <a
                className={linkClassName}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function SotaTracker() {
  const [borderColor, setBorderColor] = useState('#020617')

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const updateBorderColor = (matches: boolean) => {
      setBorderColor(matches ? '#020617' : '#CBD5E1')
    }
    const handleChange = (event: MediaQueryListEvent) => {
      updateBorderColor(event.matches)
    }

    updateBorderColor(mql.matches)
    mql.addEventListener?.('change', handleChange)

    return () => {
      mql.removeEventListener?.('change', handleChange)
    }
  }, [])

  return (
    <section className="flex flex-col border-y border-y-slate-300 pb-12 pt-8 dark:border-y-slate-950">
      <Image
        className="relative mb-12 hidden dark:block"
        src="/sota-dark.svg"
        alt="State of the Art"
        height={31}
        width={221}
        priority
        quality={100}
      />

      <Image
        className="relative mb-12 dark:hidden"
        src="/sota-light.svg"
        alt="State of the Art"
        height={31}
        width={221}
        priority
        quality={100}
      />

      <div className="flex flex-col justify-between gap-10 lg:flex-row">
        {stacks.map((stack) => (
          <SotaTree key={stack.title} {...stack} borderColor={borderColor} />
        ))}
      </div>
    </section>
  )
}
