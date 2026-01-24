import { ReactNode } from 'react'

type ArticleLayoutProps = {
  header: ReactNode
  toc: ReactNode
  children: ReactNode
}

export default function ArticleLayout({ header, toc, children }: ArticleLayoutProps) {
  return (
    <div className="w-full lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-10">
      <div className="min-w-0">
        {header}
        {children}
      </div>
      <aside className="mt-10 hidden lg:block">
        <div className="sticky top-10">
          {toc}
        </div>
      </aside>
    </div>
  )
}
