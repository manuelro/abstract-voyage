import ArticleLink from './ArticleLink'

type PostType = {
  slug: string
  title: string
  tags: string[]
  canonicalPath: string
  externalUrl: string | null
  forceExternalNavigation: boolean
  formattedDate: string
  date: string
}

const ListLegacy = (props: { className: string; posts: PostType[] }) => (
  <ol className={`group ${props.className}`}>
    {props.posts.filter(Boolean).map((post: PostType) => {
      const {
        formattedDate,
        date,
        title,
        tags,
        canonicalPath,
        externalUrl,
        forceExternalNavigation,
      } = post

      return (
        <ArticleLink
          title={title}
          tags={tags ?? []}
          date={date}
          formattedDate={formattedDate}
          canonicalPath={canonicalPath}
          externalUrl={externalUrl ?? undefined}
          forceExternalNavigation={forceExternalNavigation}
          key={title}
        />
      )
    })}
  </ol>
)

export default ListLegacy
