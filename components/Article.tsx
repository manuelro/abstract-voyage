import { ReactNode } from 'react'
import Chip from './Chip'

const Article = ({ title, tags, formattedDate, children } : { title: string, tags: string[], formattedDate: string, children?: ReactNode }) => (
    <article className='font-serif pb-5 mt-10 flex min-h-screen flex-col py-24'>
        <div className='text-4xl font-serif italic mb-5 max-w-3xl dark:text-gray-50'>{title}</div>

        {/* <div className='border-b border-b-slate-100 pb-5 mb-10 dark:border-b-slate-800 flex'>
            {tags.map((tag: any) => {
                return <Chip key={tag}>{tag}</Chip>
            })[0]}
        </div> */}

        <div className='text-xl italic max-w-3xl dark:text-gray-300'>
            {formattedDate} {children}
        </div>
    </article>
)

export default Article