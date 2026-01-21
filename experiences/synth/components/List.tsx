import ArticleLink from './ArticleLink'

type FrontmatterType = {
    title: string
    tags: string[]
    url: string
}

type PostType = {
    slug: string
    frontmatter: FrontmatterType
    formattedDate: string
    date: string
}

const List = (props: { className: string, posts: PostType[] }) => (
    <ol className={props.className}>
        {props.posts.map((post: any) => {
            const { slug, frontmatter, formattedDate, date } = post
            const { title, tags, url } = frontmatter

            return (
                <ArticleLink
                    title={title}
                    tags={tags}
                    url={url}
                    date={date}
                    formattedDate={formattedDate}
                    slug={`/posts/${slug}`}
                    key={title}
                />
            )
        })}
    </ol>
)

export default List
