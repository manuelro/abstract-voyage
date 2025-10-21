import Link from 'next/link'
import styles from './ArticleLink.module.css'

type PropsType = {
    title: string
    tags: string[]
    url: string
    slug: string
    date: string
    formattedDate: string
}

const ArticleLink = ({ title, tags, url, slug, formattedDate }: PropsType) => {
    const link = url ? <a href={url} className={`${styles.link} text-xl`} target='_blank'>{title}</a> : <Link href={slug} className={`${styles.link} text-xl`}>{title}</Link>

    return (
        <li className={`${styles.root} font-serif italic mt-5 dark:text-gray-300 whitespace-break-spaces`}>
            <div className='flex flex-col'>
                {link} <div className={`${styles.date} dark:text-yellow-100 transition-opacity transition-delay-1 date flex gap-2 text-sm inline-block`}>
                    {formattedDate}
                    {/* < >
                        {tags.map((tag) => {
                            return <span key={tag}>{tag}</span> 
                        })}
                    </> */}
                </div>
            </div>

            {/* <div className='pt-2 pb-4 flex'>
                {tags.map((tag) => {
                    return <Chip key={tag}>{tag}</Chip> 
                })}
            </div> */}

            {/* <style jsx>{`
                .date {
                    opacity: 0;
                }
                li:hover .date{
                    opacity: 1;
                }
            `}</style> */}
        </li>
    )
}

export default ArticleLink