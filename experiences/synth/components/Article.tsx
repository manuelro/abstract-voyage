import { ReactNode } from 'react'

type ArticleProps = {
  title: string
  excerpt?: string
  heroImage?: string
  heroAlt?: string
  meta?: ReactNode
  afterLede?: ReactNode
  children?: ReactNode
}

const Article = ({
  title,
  excerpt,
  heroImage,
  heroAlt,
  meta,
  afterLede,
  children,
}: ArticleProps) => (
  <article className="pb-10 text-slate-100">
    <header className="max-w-[68ch]">
      <h1 className="mt-10 mb-5 text-3xl md:text-4xl font-semibold tracking-tight text-slate-50">
        {title}
      </h1>

      {meta}

      {excerpt ? (
        <p className="mt-5 text-base md:text-lg leading-relaxed text-slate-200/85">
          {excerpt}
        </p>
      ) : null}

      {heroImage ? (
        <div className="mt-6">
          <img
            src={heroImage}
            alt={heroAlt ?? title}
            className="w-full max-w-[68ch] rounded-md border border-white/10"
            loading="lazy"
          />
        </div>
      ) : null}

      {afterLede}
    </header>

    {children ? (
      <div className="mt-8 max-w-[68ch] text-base md:text-lg leading-relaxed text-slate-100/90">
        {children}
      </div>
    ) : null}
  </article>
)

export default Article
