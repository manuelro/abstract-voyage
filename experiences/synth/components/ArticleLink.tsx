import Link from 'next/link'

type PropsType = {
    title: string
    tags: string[]
    canonicalPath: string
    externalUrl?: string
    forceExternalNavigation?: boolean
    date: string
    formattedDate: string
}

const ArticleLink = ({ title, canonicalPath, externalUrl, forceExternalNavigation, formattedDate }: PropsType) => {
    const linkClass = 'pb-7 font-medium w-full md:font-medium'
    const date = (
        <span className='font-serif text-xs dark:text-yellow-100 opacity-50 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100'>
            {formattedDate ? <><span className='p-1'>·</span>{formattedDate}</> : null}
        </span>
    )

    const isExternal = Boolean(forceExternalNavigation && externalUrl)
    const linkLabel = (
        <>
            {title}
            {isExternal ? (
                <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-400/80 dark:text-slate-300/70">
                    ↗ External
                </span>
            ) : null}
            {date}
        </>
    )

    const link = isExternal
        ? <a href={externalUrl} className={linkClass} target="_blank" rel="noopener noreferrer">{linkLabel}</a>
        : <Link href={canonicalPath} className={linkClass}>{linkLabel}</Link>

    return (
        <li className='group text-sm md:text-base md:group-hover:opacity-50 md:group-focus-within:opacity-50 md:hover:opacity-100 md:focus-within:opacity-100 md:group-hover:hover:opacity-100 md:group-hover:focus-within:opacity-100 transition-opacity duration-300 ease-out dark:text-gray-300 whitespace-break-spaces'>
            <div className='flex flex-wrap items-baseline gap-x-3 gap-y-1'>
                {link}
            </div>
        </li>
    )
}

export default ArticleLink
