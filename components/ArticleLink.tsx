import Link from 'next/link'
import Chip from './Chip'

type PropsType = {
    title: string
    tags: string[]
    url: string
    slug: string
    date: string
    formattedDate: string
}

const ArticleLink = ({ title, tags, url, slug, formattedDate }: PropsType) => {
    const link = url ? <a href={url} className='text-xl' target='_blank'>{title}</a> : <Link href={slug} className='text-xl'>{title}</Link>

    return (
        <li className='font-serif italic mt-5 dark:text-gray-300 whitespace-break-spaces'>
            <div>
                {link} <span className='dark:text-yellow-100 pl-2 transition-opacity date'>{formattedDate}</span>
            </div>

            <div className='pt-2 pb-4 flex'>
                {tags.map((tag) => {
                    return <Chip key={tag}>{tag}</Chip> 
                })}
            </div>

            <style jsx>{`
                .date {
                    opacity: 0;
                }
                li:hover .date{
                    opacity: 1;
                }
            `}</style>
        </li>
    )
}

export default ArticleLink